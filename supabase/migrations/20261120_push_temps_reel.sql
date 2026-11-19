-- =====================================================================
-- 🔔 NOTIFICATIONS PUSH EN TEMPS RÉEL — CleanZone (2026-11-20)
-- ---------------------------------------------------------------------
-- PRÉREQUIS : 20261119_stabilisation_profils.sql déjà exécutée.
-- Idempotente : peut être relancée sans risque.
--
-- Principe : TOUTE notification insérée dans public.notifications
-- (par une RPC, un trigger ou l'application) déclenche automatiquement :
--   • un push mobile via EXPO PUSH NOTIFICATIONS (https://exp.host),
--     envoyé directement par la base avec pg_net (aucun serveur à ajouter)
--   • l'affichage instantané in-app (web + mobile) via Supabase Realtime
-- Les messages de chat sont poussés directement (sans ligne de notification).
--
-- Optionnel, uniquement si la « sécurité renforcée des push » est activée
-- dans le compte Expo (expo.dev > Access tokens) :
--   UPDATE public.platform_settings SET value = '<EXPO_ACCESS_TOKEN>' WHERE key = 'expo_access_token';
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =====================================================================
-- 1. ABONNEMENTS PUSH (plusieurs appareils par utilisateur)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    kind         TEXT NOT NULL DEFAULT 'expo' CHECK (kind = 'expo'),
    token        TEXT NOT NULL UNIQUE,   -- ExponentPushToken[...]
    keys         JSONB,                  -- réservé (non utilisé)
    user_agent   TEXT,                   -- plateforme de l'appareil
    created_at   TIMESTAMPTZ DEFAULT now(),
    last_seen_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions (user_id, kind);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS push_subscriptions_own_select ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_own_delete ON public.push_subscriptions;
CREATE POLICY push_subscriptions_own_select ON public.push_subscriptions FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));
CREATE POLICY push_subscriptions_own_delete ON public.push_subscriptions FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));
-- (insertion / mise à jour : uniquement via fn_register_push_token)

-- Reprise des anciens jetons stockés dans profiles.push_token
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
INSERT INTO public.push_subscriptions (user_id, kind, token)
SELECT id, 'expo', push_token FROM public.profiles
WHERE push_token LIKE 'ExponentPushToken%' OR push_token LIKE 'ExpoPushToken%'
ON CONFLICT (token) DO NOTHING;

-- Données de navigation (deep link) attachées à chaque notification
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

-- Paramètres d'envoi
INSERT INTO public.platform_settings (key, value) VALUES
    ('push_enabled', 'true'),
    ('expo_access_token', '')
ON CONFLICT (key) DO NOTHING;

-- Les secrets d'envoi ne doivent jamais être lisibles par les utilisateurs.
-- (La policy FOR ALL de la Mairie donnait aussi la LECTURE de toutes les clés :
--  elle est remplacée par des droits d'écriture limités aux taux fiscaux.)
DROP POLICY IF EXISTS platform_settings_select ON public.platform_settings;
DROP POLICY IF EXISTS platform_settings_write ON public.platform_settings;
DROP POLICY IF EXISTS platform_settings_admin_all ON public.platform_settings;
DROP POLICY IF EXISTS platform_settings_mairie_insert ON public.platform_settings;
DROP POLICY IF EXISTS platform_settings_mairie_update ON public.platform_settings;

CREATE POLICY platform_settings_select ON public.platform_settings FOR SELECT TO authenticated
    USING (key <> 'expo_access_token'
           OR (SELECT public.fn_current_role()) = 'super_admin');
CREATE POLICY platform_settings_admin_all ON public.platform_settings FOR ALL TO authenticated
    USING ((SELECT public.fn_current_role()) = 'super_admin')
    WITH CHECK ((SELECT public.fn_current_role()) = 'super_admin');
CREATE POLICY platform_settings_mairie_insert ON public.platform_settings FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.fn_current_role()) = 'mairie' AND key IN ('commission_rate', 'eco_tax_rate'));
CREATE POLICY platform_settings_mairie_update ON public.platform_settings FOR UPDATE TO authenticated
    USING ((SELECT public.fn_current_role()) = 'mairie' AND key IN ('commission_rate', 'eco_tax_rate'))
    WITH CHECK ((SELECT public.fn_current_role()) = 'mairie' AND key IN ('commission_rate', 'eco_tax_rate'));

-- =====================================================================
-- 2. ENREGISTREMENT / RETRAIT D'UN APPAREIL
-- =====================================================================
-- Un appareil (jeton) appartient au DERNIER utilisateur connecté dessus :
-- après un changement de compte, l'ancien utilisateur ne reçoit plus rien.
CREATE OR REPLACE FUNCTION public.fn_register_push_token(
    p_token TEXT,
    p_kind TEXT,
    p_keys JSONB DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
    IF COALESCE(p_kind, 'expo') <> 'expo' OR p_token IS NULL
       OR (p_token NOT LIKE 'ExponentPushToken[%' AND p_token NOT LIKE 'ExpoPushToken[%') THEN
        RAISE EXCEPTION 'Jeton Expo invalide';
    END IF;

    INSERT INTO public.push_subscriptions (user_id, kind, token, keys, user_agent, last_seen_at)
    VALUES (auth.uid(), 'expo', p_token, p_keys, left(p_user_agent, 300), now())
    ON CONFLICT (token) DO UPDATE
        SET user_id = EXCLUDED.user_id,
            kind = EXCLUDED.kind,
            keys = COALESCE(EXCLUDED.keys, push_subscriptions.keys),
            user_agent = COALESCE(EXCLUDED.user_agent, push_subscriptions.user_agent),
            last_seen_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_unregister_push_token(p_token TEXT)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM public.push_subscriptions WHERE token = p_token AND user_id = auth.uid();
$$;

-- =====================================================================
-- 3. ENVOI (asynchrone : pg_net part APRÈS le commit, sans ralentir l'action)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.fn_push_dispatch(
    p_user_id UUID,
    p_title TEXT,
    p_body TEXT,
    p_data JSONB DEFAULT '{}'::jsonb
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_messages JSONB;
    v_headers JSONB := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json');
    v_expo_token TEXT := public.fn_setting('expo_access_token', '');
    v_badge INT;
BEGIN
    IF p_user_id IS NULL OR public.fn_setting('push_enabled', 'true') <> 'true' THEN
        RETURN;
    END IF;

    -- Utilisateur suspendu : pas de push
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND status = 'Suspendu') THEN
        RETURN;
    END IF;

    SELECT count(*) INTO v_badge FROM public.notifications WHERE profile_id = p_user_id AND is_read = false;

    -- Expo Push : un seul appel pour tous les appareils de l'utilisateur
    SELECT jsonb_agg(jsonb_build_object(
               'to', token,
               'title', left(COALESCE(p_title, 'CleanZone'), 120),
               'body', left(COALESCE(p_body, ''), 300),
               'sound', 'default',
               'priority', 'high',
               'channelId', 'default',
               'badge', v_badge,
               'data', COALESCE(p_data, '{}'::jsonb)))
    INTO v_messages
    FROM public.push_subscriptions
    WHERE user_id = p_user_id AND kind = 'expo';

    IF v_messages IS NOT NULL THEN
        IF v_expo_token <> '' THEN
            v_headers := v_headers || jsonb_build_object('Authorization', 'Bearer ' || v_expo_token);
        END IF;
        PERFORM net.http_post(
            url := 'https://exp.host/--/api/v2/push/send',
            body := v_messages,
            headers := v_headers,
            timeout_milliseconds := 5000
        );
    END IF;

EXCEPTION WHEN others THEN
    -- Un échec d'envoi ne doit JAMAIS bloquer l'action métier
    RAISE WARNING 'fn_push_dispatch: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_push_dispatch(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_register_push_token(text, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_register_push_token(text, text, jsonb, text) TO authenticated;
REVOKE ALL ON FUNCTION public.fn_unregister_push_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_unregister_push_token(text) TO authenticated;

-- =====================================================================
-- 4. TOUTE NOTIFICATION => PUSH
-- =====================================================================
CREATE OR REPLACE FUNCTION public.fn_notification_push()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.fn_push_dispatch(
        NEW.profile_id,
        NEW.title,
        NEW.content,
        COALESCE(NEW.data, '{}'::jsonb) || jsonb_build_object('type', NEW.type, 'notification_id', NEW.id)
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_notification_push ON public.notifications;
CREATE TRIGGER tr_notification_push
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.fn_notification_push();

-- Helper : créer une notification (et donc un push) depuis un trigger
CREATE OR REPLACE FUNCTION public.fn_notify(
    p_user_id UUID, p_title TEXT, p_content TEXT, p_type TEXT, p_data JSONB DEFAULT '{}'::jsonb
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_user_id IS NULL THEN RETURN; END IF;
    INSERT INTO public.notifications (profile_id, title, content, type, data)
    VALUES (p_user_id, p_title, p_content, p_type, COALESCE(p_data, '{}'::jsonb));
EXCEPTION WHEN others THEN
    RAISE WARNING 'fn_notify: %', SQLERRM;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_notify(uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

-- =====================================================================
-- 5. ÉVÉNEMENTS MÉTIER => NOTIFICATIONS (couverture de tous les profils)
-- ---------------------------------------------------------------------
-- Les anciens triggers de 20260414 faisaient DOUBLON avec les RPC
-- (reserve_waste, fn_assign_agent_to_waste, fn_finalize_collection) :
-- ils sont remplacés par un trigger unique sans doublon.
-- =====================================================================
DROP TRIGGER IF EXISTS tr_notify_mission_assignment ON public.wastes;
DROP TRIGGER IF EXISTS tr_notify_waste_status_change ON public.wastes;

-- 5.1 Chat : push direct au destinataire (pas de ligne de notification) --
CREATE OR REPLACE FUNCTION public.fn_message_push()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_sender TEXT;
BEGIN
    IF NEW.receiver_id IS NULL OR NEW.receiver_id = NEW.sender_id THEN RETURN NEW; END IF;
    SELECT COALESCE(full_name, 'Nouveau message') INTO v_sender FROM public.profiles WHERE id = NEW.sender_id;
    PERFORM public.fn_push_dispatch(
        NEW.receiver_id,
        '💬 ' || COALESCE(v_sender, 'Nouveau message'),
        left(COALESCE(NEW.content, ''), 200),
        jsonb_build_object('type', 'message', 'sender_id', NEW.sender_id, 'sender_name', v_sender, 'waste_id', NEW.waste_id)
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_message_push ON public.messages;
CREATE TRIGGER tr_message_push
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.fn_message_push();

-- 5.2 Lots / missions ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_waste_events()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_seller_city TEXT;
    v_type_name TEXT;
    v_data JSONB := jsonb_build_object('waste_id', NEW.id);
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Nouveau lot sur la marketplace : collecteurs de la même ville (200 max)
        IF NEW.status = 'published' AND COALESCE(NEW.mission_type, 'marketplace') = 'marketplace' THEN
            SELECT city INTO v_seller_city FROM public.profiles WHERE id = NEW.seller_id;
            SELECT name INTO v_type_name FROM public.waste_types WHERE id = NEW.type_id;
            IF v_seller_city IS NOT NULL THEN
                INSERT INTO public.notifications (profile_id, title, content, type, data)
                SELECT p.id, '♻️ Nouveau lot disponible',
                       COALESCE(v_type_name, 'Lot') || ' — ' || NEW.estimated_weight || ' kg à ' || COALESCE(NEW.location, v_seller_city),
                       'offer', v_data
                FROM public.profiles p
                WHERE p.role = 'collecteur' AND COALESCE(p.status, 'Actif') = 'Actif'
                  AND p.city IS NOT NULL AND p.city ILIKE '%' || v_seller_city || '%'
                LIMIT 200;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    -- UPDATE : agent démarre la mission -> l'organisation et le vendeur sont prévenus
    IF NEW.status = 'in_progress' AND OLD.status IS DISTINCT FROM 'in_progress' THEN
        PERFORM public.fn_notify(NEW.collector_id, '🚚 Mission démarrée',
            'Votre agent est en route : ' || COALESCE(NEW.location, 'lieu de collecte') || '.', 'mission', v_data);
        IF NEW.seller_id IS DISTINCT FROM NEW.collector_id THEN
            PERFORM public.fn_notify(NEW.seller_id, '🚚 Collecte en cours',
                'L''équipe de collecte est en route vers votre lot.', 'collection', v_data);
        END IF;
    END IF;

    -- Lot annulé par le vendeur alors qu'il était réservé
    IF NEW.status = 'cancelled' AND OLD.status = 'reserved' AND NEW.collector_id IS NOT NULL THEN
        PERFORM public.fn_notify(NEW.collector_id, '❌ Lot annulé',
            'Un lot que vous aviez réservé a été annulé par le vendeur.', 'offer', v_data);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_waste_events ON public.wastes;
CREATE TRIGGER tr_waste_events
AFTER INSERT OR UPDATE OF status ON public.wastes
FOR EACH ROW EXECUTE FUNCTION public.fn_waste_events();

-- 5.3 Police Verte / infractions -------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_infraction_events()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_data JSONB := jsonb_build_object('infraction_id', NEW.id);
    v_label TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- L'organisation responsable de la zone doit intervenir
        PERFORM public.fn_notify(NEW.responsible_org_id, '⚠️ Dépôt sauvage dans votre zone',
            COALESCE(NEW.type, 'Infraction') || ' (' || COALESCE(NEW.severity, 'medium') || ') — ' ||
            COALESCE(NEW.address, NEW.manual_address, 'voir la carte') || '. Délai : 24 h.', 'alert', v_data);
        -- Les agents Police Verte de la zone (si le signalement vient d'un citoyen)
        INSERT INTO public.notifications (profile_id, title, content, type, data)
        SELECT p.id, '🚨 Nouveau signalement', COALESCE(NEW.type, 'Infraction') || ' signalé dans votre juridiction.', 'alert', v_data
        FROM public.profiles p
        WHERE p.role = 'agent_police_verte' AND p.zone_id IS NOT NULL AND p.zone_id = NEW.zone_id
          AND p.id IS DISTINCT FROM NEW.reported_by
        LIMIT 50;
        RETURN NEW;
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        v_label := CASE NEW.status
            WHEN 'investigating' THEN 'est en cours de traitement 🔎'
            WHEN 'resolved'      THEN 'a été résolu ✅'
            WHEN 'sanctioned'    THEN 'a donné lieu à une sanction ⚖️'
            WHEN 'dismissed'     THEN 'a été classé sans suite'
            ELSE 'a changé de statut' END;
        -- Le citoyen / agent auteur du signalement suit son dossier
        PERFORM public.fn_notify(NEW.reported_by, 'Suivi de votre signalement',
            'Votre signalement « ' || COALESCE(NEW.type, 'infraction') || ' » ' || v_label || '.', 'info', v_data);
        IF NEW.status = 'sanctioned' THEN
            NULL; -- l'organisation est déjà notifiée par fn_issue_sanction
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF to_regclass('public.environmental_infractions') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS tr_infraction_events ON public.environmental_infractions;
        CREATE TRIGGER tr_infraction_events
        AFTER INSERT OR UPDATE OF status ON public.environmental_infractions
        FOR EACH ROW EXECUTE FUNCTION public.fn_infraction_events();
    END IF;
END $$;

-- 5.4 Concessions (Mairie -> Organisation) -----------------------------------
CREATE OR REPLACE FUNCTION public.fn_concession_events()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_zone TEXT; v_data JSONB := jsonb_build_object('concession_id', NEW.id, 'zone_id', NEW.zone_id);
BEGIN
    SELECT name INTO v_zone FROM public.zones WHERE id = NEW.zone_id;
    IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
        PERFORM public.fn_notify(NEW.organization_id, '🏛️ Concession attribuée',
            'La zone « ' || COALESCE(v_zone, 'attribuée') || ' » vous est confiée. Vous pouvez y opérer dès maintenant.', 'success', v_data);
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'expired' AND OLD.status = 'active' THEN
        PERFORM public.fn_notify(NEW.organization_id, 'Concession terminée',
            'Votre concession sur la zone « ' || COALESCE(v_zone, '') || ' » a pris fin.', 'alert', v_data);
    ELSIF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
        -- Demande d'une organisation : la Mairie propriétaire de la zone est prévenue
        PERFORM public.fn_notify(
            (SELECT COALESCE(z.organization_id, z.created_by) FROM public.zones z WHERE z.id = NEW.zone_id),
            'Nouvelle demande de concession',
            'Une organisation demande la zone « ' || COALESCE(v_zone, '') || ' ».', 'info', v_data);
    END IF;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF to_regclass('public.concessions') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS tr_concession_events ON public.concessions;
        CREATE TRIGGER tr_concession_events
        AFTER INSERT OR UPDATE OF status ON public.concessions
        FOR EACH ROW EXECUTE FUNCTION public.fn_concession_events();
    END IF;
END $$;

-- 5.5 Appels d'offres ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_tender_events()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'open' THEN
        INSERT INTO public.notifications (profile_id, title, content, type, data)
        SELECT p.id, '📣 Nouvel appel d''offres', COALESCE(NEW.title, 'Marché public') || ' — soumissionnez avant la date limite.',
               'offer', jsonb_build_object('tender_id', NEW.id)
        FROM public.profiles p
        WHERE p.role IN ('organisation_admin', 'collecteur') AND COALESCE(p.status, 'Actif') = 'Actif'
        LIMIT 500;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_bid_events()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_tender RECORD; v_org TEXT; v_data JSONB := jsonb_build_object('tender_id', NEW.tender_id, 'bid_id', NEW.id);
BEGIN
    SELECT mairie_id, title INTO v_tender FROM public.tenders WHERE id = NEW.tender_id;
    IF TG_OP = 'INSERT' THEN
        SELECT full_name INTO v_org FROM public.profiles WHERE id = NEW.organisation_id;
        PERFORM public.fn_notify(v_tender.mairie_id, '📥 Nouvelle offre reçue',
            COALESCE(v_org, 'Une organisation') || ' a soumissionné à « ' || COALESCE(v_tender.title, 'votre marché') || ' ».', 'info', v_data);
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NEW.status = 'accepted' THEN
            PERFORM public.fn_notify(NEW.organisation_id, '🏆 Marché attribué !',
                'Votre offre pour « ' || COALESCE(v_tender.title, 'le marché') || ' » a été retenue.', 'success', v_data);
        ELSIF NEW.status = 'rejected' THEN
            PERFORM public.fn_notify(NEW.organisation_id, 'Offre non retenue',
                'Votre offre pour « ' || COALESCE(v_tender.title, 'le marché') || ' » n''a pas été retenue.', 'info', v_data);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF to_regclass('public.tenders') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS tr_tender_events ON public.tenders;
        CREATE TRIGGER tr_tender_events AFTER INSERT ON public.tenders
        FOR EACH ROW EXECUTE FUNCTION public.fn_tender_events();
    END IF;
    IF to_regclass('public.tender_bids') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS tr_bid_events ON public.tender_bids;
        CREATE TRIGGER tr_bid_events AFTER INSERT OR UPDATE OF status ON public.tender_bids
        FOR EACH ROW EXECUTE FUNCTION public.fn_bid_events();
    END IF;
END $$;

-- 5.6 Argent : retraits, abonnements, crédits -------------------------------
CREATE OR REPLACE FUNCTION public.fn_transaction_events()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid UUID := COALESCE(NEW.user_id, NEW.profile_id); v_amount TEXT := to_char(abs(NEW.amount), 'FM999G999G999') || ' FCFA';
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.type = 'withdrawal' AND OLD.status = 'Pending' AND NEW.status IS DISTINCT FROM OLD.status THEN
            IF NEW.status = 'Succeeded' THEN
                PERFORM public.fn_notify(v_uid, '💸 Retrait effectué', v_amount || ' ont été envoyés sur votre Mobile Money.', 'payment',
                    jsonb_build_object('transaction_id', NEW.id));
            ELSIF NEW.status = 'Failed' THEN
                PERFORM public.fn_notify(v_uid, 'Retrait refusé',
                    v_amount || ' ont été recrédités sur votre portefeuille.' ||
                    COALESCE(' Motif : ' || (NEW.metadata->>'rejection_reason'), ''), 'alert',
                    jsonb_build_object('transaction_id', NEW.id));
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    -- INSERT
    IF NEW.type = 'withdrawal' AND NEW.status = 'Pending' THEN
        PERFORM public.fn_notify(v_uid, 'Demande de retrait enregistrée',
            v_amount || ' — validation sous 48 h ouvrées.', 'payment', jsonb_build_object('transaction_id', NEW.id));
        -- Les super admins doivent valider
        INSERT INTO public.notifications (profile_id, title, content, type, data)
        SELECT p.id, '🏦 Retrait à valider', v_amount || ' en attente de validation.', 'alert',
               jsonb_build_object('transaction_id', NEW.id)
        FROM public.profiles p WHERE p.role = 'super_admin';
    ELSIF NEW.type = 'credit' AND NEW.description LIKE 'Revenu Abonnement%' THEN
        PERFORM public.fn_notify(v_uid, '👥 Nouvel abonné', '+' || v_amount || ' — ' || NEW.description, 'payment',
            jsonb_build_object('transaction_id', NEW.id));
    ELSIF NEW.type = 'adjustment' THEN
        PERFORM public.fn_notify(v_uid, 'Ajustement de votre solde',
            CASE WHEN NEW.amount >= 0 THEN '+' ELSE '-' END || v_amount || ' par l''administration.', 'payment',
            jsonb_build_object('transaction_id', NEW.id));
    ELSIF NEW.type = 'subscription' THEN
        PERFORM public.fn_notify(v_uid, '✅ Abonnement activé', NEW.description || ' (' || v_amount || ').', 'success',
            jsonb_build_object('transaction_id', NEW.id));
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_transaction_events ON public.transactions;
CREATE TRIGGER tr_transaction_events
AFTER INSERT OR UPDATE OF status ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_transaction_events();

-- 5.7 Compte : suspension, réactivation, changement de profil ----------------
CREATE OR REPLACE FUNCTION public.fn_profile_events()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NEW.status = 'Actif' AND OLD.status = 'Suspendu' THEN
            PERFORM public.fn_notify(NEW.id, '✅ Compte réactivé', 'Votre compte CleanZone est de nouveau actif.', 'success');
        END IF;
        -- (pas de push à un compte suspendu : il est déconnecté)
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        PERFORM public.fn_notify(NEW.id, 'Profil mis à jour',
            'Votre profil a été modifié par l''administration. Reconnectez-vous pour accéder à vos nouveaux espaces.', 'info');
    END IF;
    IF NEW.zone_id IS DISTINCT FROM OLD.zone_id AND NEW.role = 'agent_police_verte' THEN
        PERFORM public.fn_notify(NEW.id, 'Nouvelle juridiction', 'La Mairie vous a affecté à une nouvelle zone.', 'info');
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_profile_events ON public.profiles;
CREATE TRIGGER tr_profile_events
AFTER UPDATE OF status, role, zone_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.fn_profile_events();

-- =====================================================================
-- 6. REALTIME : tables diffusées aux applications
-- =====================================================================
DO $$
DECLARE t TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    FOREACH t IN ARRAY ARRAY['notifications', 'messages', 'wastes'] LOOP
        IF to_regclass('public.' || t) IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;

-- Nettoyage périodique conseillé (jetons Expo invalides) : voir net._http_response
-- et supprimer les jetons pour lesquels Expo renvoie "DeviceNotRegistered".

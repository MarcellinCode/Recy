-- =====================================================================
-- 🛠️ STABILISATION COMPLÈTE DES PROFILS — CleanZone (2026-11-19)
-- ---------------------------------------------------------------------
-- Idempotente : peut être relancée sans risque.
-- À exécuter APRÈS lecture du diagnostic (supabase/diagnostic_qualite_bdd.sql)
-- puis relancer le diagnostic pour vérifier.
--
-- Contenu :
--   0. Fonctions utilitaires (rôle courant, mis en cache, sans récursion RLS)
--   1. Colonnes manquantes
--   2. Normalisation des données (rôles, transactions, PIN en clair)
--   3. Contraintes alignées sur les valeurs réellement utilisées par le code
--   4. Synchronisation transactions.user_id <-> profile_id
--   5. Table platform_settings (configuration fiscale Mairie)
--   6. Protection des colonnes sensibles de profiles
--   7. Trigger d'inscription sécurisé (fin de l'escalade de privilèges)
--   8. RPC métier sécurisées (une par action sensible, par profil)
--   9. Policies RLS cohérentes et performantes
--  10. Index de performance
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- 0. UTILITAIRES
-- =====================================================================

-- Rôle de l'utilisateur courant. SECURITY DEFINER => contourne la RLS de
-- profiles (pas de récursion) ; STABLE => évalué une fois par requête
-- lorsqu'il est appelé sous la forme (SELECT public.fn_current_role()).
CREATE OR REPLACE FUNCTION public.fn_current_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.fn_has_role(p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(p_roles), false);
$$;

-- Paramètre plateforme (texte) avec valeur par défaut
CREATE OR REPLACE FUNCTION public.fn_setting(p_key TEXT, p_default TEXT)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v TEXT;
BEGIN
    IF to_regclass('public.platform_settings') IS NULL THEN
        RETURN p_default;
    END IF;
    EXECUTE 'SELECT value FROM public.platform_settings WHERE key = $1' INTO v USING p_key;
    RETURN COALESCE(v, p_default);
END;
$$;

-- =====================================================================
-- 1. COLONNES MANQUANTES (sans effet si elles existent déjà)
-- =====================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zone_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rccm TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS agent_count TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS official_department TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'starter';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Actif';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS performance_score NUMERIC DEFAULT 5;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Succeeded';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS commission_amount NUMERIC DEFAULT 0;

ALTER TABLE public.wastes ADD COLUMN IF NOT EXISTS assigned_agent_id UUID;
ALTER TABLE public.wastes ADD COLUMN IF NOT EXISTS mission_type TEXT;
ALTER TABLE public.wastes ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ;
ALTER TABLE public.wastes ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ;
ALTER TABLE public.wastes ADD COLUMN IF NOT EXISTS infraction_id UUID;

DO $$
BEGIN
    IF to_regclass('public.environmental_infractions') IS NOT NULL THEN
        ALTER TABLE public.environmental_infractions ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
    END IF;
END $$;

-- Sanctions administratives (utilisée par fn_issue_sanction) : créée si absente
CREATE TABLE IF NOT EXISTS public.sanctions (
    id              BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    description     TEXT,
    severity        TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
    penalty_amount  NUMERIC(12,2) DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sanctions ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 2. NORMALISATION DES DONNÉES
-- =====================================================================
-- Les anciennes contraintes sont retirées AVANT la normalisation
-- (elles sont recréées en section 3).
ALTER TABLE public.profiles      DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.transactions  DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE public.transactions  DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.wastes        DROP CONSTRAINT IF EXISTS wastes_status_check;

ALTER TABLE public.profiles DISABLE TRIGGER USER;

-- Anciens rôles renommés
UPDATE public.profiles SET role = 'producteur' WHERE role IN ('vendeur', 'entreprise', 'citoyen', 'citizen') OR role IS NULL;
UPDATE public.profiles SET role = 'collecteur' WHERE role IN ('recycleur', 'acheteur', 'collector');

-- Paliers : une Mairie est toujours 'mairie' (le code des appels d'offres teste cette valeur)
UPDATE public.profiles SET subscription_tier = 'mairie' WHERE role = 'mairie' AND subscription_tier IS DISTINCT FROM 'mairie';
UPDATE public.profiles SET subscription_tier = 'starter' WHERE subscription_tier IS NULL;
UPDATE public.profiles SET status = 'Actif' WHERE status IS NULL;

-- PIN des agents : ne JAMAIS les stocker en clair (lisibles par tout utilisateur connecté)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='profiles' AND column_name='app_pin') THEN
        EXECUTE 'UPDATE public.profiles SET app_pin = NULL WHERE app_pin IS NOT NULL';
    END IF;
END $$;

ALTER TABLE public.profiles ENABLE TRIGGER USER;

-- Transactions : remplir les deux colonnes d'appartenance
UPDATE public.transactions SET user_id = profile_id WHERE user_id IS NULL AND profile_id IS NOT NULL;
UPDATE public.transactions SET profile_id = user_id WHERE profile_id IS NULL AND user_id IS NOT NULL;

-- Statuts : harmonisation sur le vocabulaire de l'admin (Pending/Succeeded/Failed/Cancelled)
UPDATE public.transactions SET status = 'Succeeded' WHERE status IS NULL OR lower(status) IN ('completed', 'succeeded', 'success');
UPDATE public.transactions SET status = 'Pending'   WHERE lower(status) = 'pending' AND status <> 'Pending';
UPDATE public.transactions SET status = 'Failed'    WHERE lower(status) = 'failed' AND status <> 'Failed';

-- =====================================================================
-- 3. CONTRAINTES (NOT VALID : n'échouent pas sur d'anciennes lignes)
-- =====================================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('producteur','collecteur','organisation_admin','agent_collecteur','agent_police_verte','mairie','super_admin')) NOT VALID;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_status_check
    CHECK (status IN ('Pending','Succeeded','Failed','Cancelled','completed')) NOT VALID;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
    CHECK (type IN ('income','outcome','deposit','credit','debit','expense','withdrawal','refund','penalty','subscription','payment','adjustment')) NOT VALID;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('offer','payment','collection','system','alert','info','success','message','mission','sanction')) NOT VALID;

ALTER TABLE public.wastes DROP CONSTRAINT IF EXISTS wastes_status_check;
ALTER TABLE public.wastes ADD CONSTRAINT wastes_status_check
    CHECK (status IN ('published','reserved','in_progress','collected','cancelled')) NOT VALID;

-- =====================================================================
-- 4. SYNCHRONISATION transactions.user_id <-> profile_id
-- =====================================================================
CREATE OR REPLACE FUNCTION public.fn_sync_transaction_owner()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.user_id    := COALESCE(NEW.user_id, NEW.profile_id);
    NEW.profile_id := COALESCE(NEW.profile_id, NEW.user_id);
    IF NEW.status IS NULL OR NEW.status = 'completed' THEN
        NEW.status := 'Succeeded';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_transaction_owner ON public.transactions;
CREATE TRIGGER tr_sync_transaction_owner
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_transaction_owner();

-- =====================================================================
-- 5. platform_settings (taux fiscaux, mode simulation des paiements)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.platform_settings (key, value) VALUES
    ('commission_rate', '0.10'),
    ('eco_tax_rate', '0.02'),
    ('payment_simulation', 'true'),          -- recharge libre tant qu'aucune API Mobile Money n'est branchée
    ('simulation_max_topup', '1000000')       -- plafond d'une recharge simulée (FCFA)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 6. PROTECTION DES COLONNES SENSIBLES DE profiles
-- =====================================================================
CREATE OR REPLACE FUNCTION public.fn_protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- RPC sécurisées (flag transactionnel)
    IF current_setting('app.bypass_profile_protection', true) = 'true' THEN
        RETURN NEW;
    END IF;
    -- Rôles système (SQL editor, clé service, fonctions SECURITY DEFINER)
    IF current_user IN ('postgres', 'service_role', 'supabase_admin', 'supabase_auth_admin') THEN
        RETURN NEW;
    END IF;
    -- Super admin connecté
    IF public.fn_current_role() = 'super_admin' THEN
        RETURN NEW;
    END IF;

    IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
        RAISE EXCEPTION 'Interdit : modification directe du solde. Utilisez l''API officielle.';
    END IF;
    IF NEW.eco_points IS DISTINCT FROM OLD.eco_points THEN
        RAISE EXCEPTION 'Interdit : modification directe des points éco.';
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Interdit : modification directe du rôle.';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Interdit : modification directe du statut.';
    END IF;
    IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
        RAISE EXCEPTION 'Interdit : passez par la souscription officielle.';
    END IF;
    IF NEW.performance_score IS DISTINCT FROM OLD.performance_score THEN
        RAISE EXCEPTION 'Interdit : le score de performance est géré par la Mairie.';
    END IF;
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
        RAISE EXCEPTION 'Interdit : rattachement à une organisation non modifiable.';
    END IF;
    IF OLD.role = 'agent_police_verte' AND NEW.zone_id IS DISTINCT FROM OLD.zone_id THEN
        RAISE EXCEPTION 'Interdit : la juridiction d''un agent est attribuée par la Mairie.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profile_columns ON public.profiles;
CREATE TRIGGER tr_protect_profile_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.fn_protect_profile_columns();

-- =====================================================================
-- 7. INSCRIPTION SÉCURISÉE
-- ---------------------------------------------------------------------
-- * Inscription publique (signUp) : seuls producteur / collecteur /
--   organisation_admin sont acceptés ; 'mairie' exige un code
--   d'invitation valide (consommé ici, côté serveur).
-- * Comptes créés par le serveur (clé service) : le rôle est lu dans
--   app_metadata, que le client ne peut PAS modifier.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.fn_safe_signup_role(p_user auth.users)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_role TEXT := p_user.raw_app_meta_data->>'role';
    v_requested  TEXT := lower(COALESCE(p_user.raw_user_meta_data->>'role', 'producteur'));
    v_code       TEXT := p_user.raw_user_meta_data->>'invitation_code';
    v_invite_id  UUID;
BEGIN
    -- 1. Rôle fixé par le serveur (auth.admin.createUser avec app_metadata)
    IF v_admin_role IN ('producteur','collecteur','organisation_admin','agent_collecteur','agent_police_verte','mairie','super_admin') THEN
        RETURN v_admin_role;
    END IF;

    -- 2. Alias historiques
    IF v_requested IN ('vendeur','entreprise','citoyen','citizen') THEN v_requested := 'producteur'; END IF;
    IF v_requested IN ('collector','recycleur','acheteur') THEN v_requested := 'collecteur'; END IF;

    -- 3. Mairie : uniquement avec invitation valide
    IF v_requested = 'mairie' THEN
        IF v_code IS NOT NULL AND to_regclass('public.system_invitations') IS NOT NULL THEN
            SELECT id INTO v_invite_id
            FROM public.system_invitations
            WHERE code = v_code
              AND is_used = false
              AND expires_at > now()
              AND (target_email IS NULL OR lower(target_email) = lower(p_user.email))
            FOR UPDATE;

            IF v_invite_id IS NOT NULL THEN
                UPDATE public.system_invitations SET is_used = true, used_by = p_user.id WHERE id = v_invite_id;
                RETURN 'mairie';
            END IF;
        END IF;
        RAISE EXCEPTION 'Invitation Mairie invalide ou expirée.';
    END IF;

    -- 4. Rôles publics
    IF v_requested IN ('producteur','collecteur','organisation_admin') THEN
        RETURN v_requested;
    END IF;

    -- Toute autre demande (super_admin, agent_*) est ramenée au rôle de base
    RETURN 'producteur';
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    m JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    v_role TEXT := public.fn_safe_signup_role(NEW);
BEGIN
    INSERT INTO public.profiles (id, full_name, role, phone, city, subscription_tier, status)
    VALUES (
        NEW.id,
        COALESCE(NULLIF(m->>'full_name',''), split_part(NEW.email, '@', 1), 'Utilisateur CleanZone'),
        v_role,
        NULLIF(m->>'phone',''),
        NULLIF(m->>'city',''),
        CASE WHEN v_role = 'mairie' THEN 'mairie' ELSE 'starter' END,
        'Actif'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Champs optionnels : une erreur de format ne doit jamais bloquer l'inscription
    BEGIN
        UPDATE public.profiles SET
            district            = COALESCE(NULLIF(m->>'district',''), district),
            vehicle_type        = COALESCE(NULLIF(m->>'vehicle_type',''), vehicle_type),
            id_number           = COALESCE(NULLIF(m->>'id_number',''), id_number),
            rccm                = COALESCE(NULLIF(m->>'rccm',''), rccm),
            contact_person      = COALESCE(NULLIF(m->>'contact_person',''), contact_person),
            agent_count         = COALESCE(NULLIF(m->>'agent_count',''), agent_count),
            official_department = COALESCE(NULLIF(m->>'official_department',''), official_department),
            zone_id             = COALESCE(NULLIF(m->>'zone_id','')::uuid, zone_id)
        WHERE id = NEW.id;
    EXCEPTION WHEN others THEN
        RAISE WARNING 'handle_new_user: champs optionnels ignorés (%)', SQLERRM;
    END;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Table des invitations Mairie (absente de certaines bases : créée si besoin)
CREATE TABLE IF NOT EXISTS public.system_invitations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code         TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    role         TEXT NOT NULL DEFAULT 'mairie' CHECK (role = 'mairie'),
    target_email TEXT,
    is_used      BOOLEAN DEFAULT false,
    created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    used_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ DEFAULT now(),
    expires_at   TIMESTAMPTZ DEFAULT now() + interval '7 days'
);
ALTER TABLE public.system_invitations ENABLE ROW LEVEL SECURITY;

-- Validation publique d'un code d'invitation (page d'inscription Mairie)
CREATE OR REPLACE FUNCTION public.fn_check_invitation(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.system_invitations
        WHERE code = p_code AND is_used = false AND expires_at > now()
    );
$$;

-- =====================================================================
-- 8. RPC MÉTIER SÉCURISÉES
-- =====================================================================

-- 8.1 Portefeuille : recharge / débit (utilisé par web ET mobile) -------
CREATE OR REPLACE FUNCTION public.fn_adjust_wallet_balance(
    p_user_id UUID,
    p_amount NUMERIC,
    p_operation_type TEXT
) RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID := auth.uid();
    v_is_admin BOOLEAN := public.fn_current_role() = 'super_admin';
    v_new NUMERIC;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
    IF p_amount IS NULL OR p_amount = 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;

    IF NOT v_is_admin THEN
        IF v_caller <> p_user_id THEN RAISE EXCEPTION 'Non autorisé'; END IF;
        IF p_amount > 0 THEN
            -- Crédit libre uniquement en mode simulation, et plafonné
            IF public.fn_setting('payment_simulation','true') <> 'true' THEN
                RAISE EXCEPTION 'Recharge directe désactivée : utilisez le paiement Mobile Money.';
            END IF;
            IF p_amount > public.fn_setting('simulation_max_topup','1000000')::NUMERIC THEN
                RAISE EXCEPTION 'Montant de recharge trop élevé.';
            END IF;
        END IF;
    END IF;

    PERFORM set_config('app.bypass_profile_protection', 'true', true);

    UPDATE public.profiles
    SET wallet_balance = COALESCE(wallet_balance,0) + p_amount
    WHERE id = p_user_id
    RETURNING wallet_balance INTO v_new;

    IF v_new IS NULL THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
    IF v_new < 0 THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;

    INSERT INTO public.transactions (user_id, amount, type, description, status, metadata)
    VALUES (p_user_id, p_amount,
            CASE WHEN p_amount > 0 THEN 'credit' ELSE 'debit' END,
            CASE WHEN p_amount > 0 THEN 'Recharge Portefeuille (Simulation)' ELSE 'Paiement Service' END,
            'Succeeded',
            jsonb_build_object('operation', p_operation_type, 'by', v_caller));

    RETURN v_new;
END;
$$;

-- 8.2 Abonnement citoyen -> organisation (mobile) ------------------------
CREATE OR REPLACE FUNCTION public.fn_pay_subscription(
    p_citizen_id UUID,
    p_org_id UUID,
    p_amount NUMERIC,
    p_org_name TEXT,
    p_user_name TEXT
) RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_new NUMERIC;
BEGIN
    IF auth.uid() IS NULL OR (auth.uid() <> p_citizen_id AND public.fn_current_role() <> 'super_admin') THEN
        RAISE EXCEPTION 'Non autorisé';
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Montant invalide';
    END IF;
    IF p_citizen_id = p_org_id THEN
        RAISE EXCEPTION 'Opération invalide';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_org_id AND role = 'organisation_admin') THEN
        RAISE EXCEPTION 'Organisation introuvable';
    END IF;

    PERFORM set_config('app.bypass_profile_protection', 'true', true);

    UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance,0) - p_amount
    WHERE id = p_citizen_id RETURNING wallet_balance INTO v_new;
    IF v_new < 0 THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;

    UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance,0) + p_amount WHERE id = p_org_id;

    INSERT INTO public.transactions (user_id, amount, type, description, status) VALUES
        (p_citizen_id, -p_amount, 'debit',  'Abonnement Service - ' || COALESCE(p_org_name,''), 'Succeeded'),
        (p_org_id,      p_amount, 'credit', 'Revenu Abonnement - ' || COALESCE(p_user_name,''), 'Succeeded');

    RETURN v_new;
END;
$$;

-- 8.3 Abonnement plateforme (SaaS) : prix côté serveur --------------------
CREATE OR REPLACE FUNCTION public.fn_subscribe_platform(p_tier TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_role TEXT := public.fn_current_role();
    v_price NUMERIC;
    v_base TEXT;
    v_new NUMERIC;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;

    -- Grille tarifaire + rôle autorisé pour chaque palier
    SELECT price, base INTO v_price, v_base FROM (VALUES
        ('household',             2000::NUMERIC,  'citizen',      ARRAY['producteur']),
        ('business_local',        6000::NUMERIC,  'pro',          ARRAY['producteur']),
        ('industry',             15000::NUMERIC,  'business',     ARRAY['producteur']),
        ('collector_premium',     5000::NUMERIC,  'collector',    ARRAY['collecteur']),
        ('organisation_standard',20000::NUMERIC,  'organisation', ARRAY['organisation_admin']),
        ('mairie_elite',        200000::NUMERIC,  'mairie',       ARRAY['mairie'])
    ) AS t(tier, price, base, roles)
    WHERE t.tier = p_tier AND (v_role = ANY(t.roles) OR v_role = 'super_admin');

    IF v_price IS NULL THEN
        RAISE EXCEPTION 'Plan invalide pour votre profil.';
    END IF;

    PERFORM set_config('app.bypass_profile_protection', 'true', true);

    UPDATE public.profiles
    SET wallet_balance = COALESCE(wallet_balance,0) - v_price,
        subscription_tier = v_base
    WHERE id = v_uid
    RETURNING wallet_balance INTO v_new;

    IF v_new < 0 THEN
        RAISE EXCEPTION 'Solde insuffisant : ce plan coûte % FCFA. Rechargez votre portefeuille.', v_price;
    END IF;

    IF to_regclass('public.platform_subscriptions') IS NOT NULL THEN
        EXECUTE 'INSERT INTO public.platform_subscriptions (profile_id, tier, price_paid, status, end_date)
                 VALUES ($1, $2, $3, ''active'', now() + interval ''30 days'')'
        USING v_uid, p_tier, v_price;
    END IF;

    INSERT INTO public.transactions (user_id, amount, type, description, status)
    VALUES (v_uid, -v_price, 'subscription', 'Souscription Plan : ' || upper(p_tier), 'Succeeded');

    RETURN jsonb_build_object('success', true, 'balance', v_new, 'tier', v_base);
END;
$$;

-- 8.4 Retraits Mobile Money : demande puis validation admin ----------------
CREATE OR REPLACE FUNCTION public.fn_request_withdrawal(p_amount NUMERIC, p_phone TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid UUID := auth.uid(); v_new NUMERIC;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
    IF p_amount IS NULL OR p_amount < 500 THEN RAISE EXCEPTION 'Le montant minimum de retrait est de 500 FCFA.'; END IF;
    IF p_phone IS NULL OR length(regexp_replace(p_phone, '\D', '', 'g')) < 8 THEN
        RAISE EXCEPTION 'Numéro Mobile Money invalide.';
    END IF;

    PERFORM set_config('app.bypass_profile_protection', 'true', true);
    UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance,0) - p_amount
    WHERE id = v_uid RETURNING wallet_balance INTO v_new;
    IF v_new < 0 THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;

    INSERT INTO public.transactions (user_id, amount, type, description, status, payment_method, metadata)
    VALUES (v_uid, -p_amount, 'withdrawal', 'Retrait Mobile Money', 'Pending', 'mobile_money',
            jsonb_build_object('phone', p_phone));
    RETURN v_new;
END;
$$;

-- p_transaction_id en TEXT : fonctionne que transactions.id soit BIGINT ou UUID
CREATE OR REPLACE FUNCTION public.fn_process_withdrawal(p_transaction_id TEXT, p_approve BOOLEAN, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_tx RECORD;
BEGIN
    IF public.fn_current_role() IS DISTINCT FROM 'super_admin' THEN
        RAISE EXCEPTION 'Accès refusé';
    END IF;

    SELECT * INTO v_tx FROM public.transactions WHERE id::TEXT = p_transaction_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Transaction introuvable'; END IF;
    IF v_tx.status <> 'Pending' THEN RAISE EXCEPTION 'La transaction n''est pas en attente'; END IF;

    IF p_approve THEN
        UPDATE public.transactions SET status = 'Succeeded' WHERE id::TEXT = p_transaction_id;
    ELSE
        PERFORM set_config('app.bypass_profile_protection', 'true', true);
        UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance,0) + abs(v_tx.amount)
        WHERE id = COALESCE(v_tx.user_id, v_tx.profile_id);
        UPDATE public.transactions
        SET status = 'Failed',
            metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('rejection_reason', p_reason)
        WHERE id::TEXT = p_transaction_id;
    END IF;
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 8.5 Super Admin : rôle, statut, ajustement de solde ----------------------
CREATE OR REPLACE FUNCTION public.fn_admin_set_role(p_user_id UUID, p_role TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF public.fn_current_role() IS DISTINCT FROM 'super_admin' THEN RAISE EXCEPTION 'Accès refusé'; END IF;
    IF p_role NOT IN ('producteur','collecteur','organisation_admin','agent_collecteur','agent_police_verte','mairie','super_admin') THEN
        RAISE EXCEPTION 'Rôle invalide';
    END IF;
    IF p_user_id = auth.uid() AND p_role <> 'super_admin' THEN
        RAISE EXCEPTION 'Vous ne pouvez pas retirer votre propre rôle super_admin.';
    END IF;
    UPDATE public.profiles SET role = p_role, updated_at = now() WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_admin_set_status(p_user_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF public.fn_current_role() IS DISTINCT FROM 'super_admin' THEN RAISE EXCEPTION 'Accès refusé'; END IF;
    IF p_status NOT IN ('Actif','Suspendu','En attente') THEN RAISE EXCEPTION 'Statut invalide'; END IF;
    IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'Vous ne pouvez pas modifier votre propre statut.'; END IF;
    UPDATE public.profiles SET status = p_status, updated_at = now() WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_admin_adjust_wallet(p_user_id UUID, p_amount NUMERIC, p_reason TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_new NUMERIC;
BEGIN
    IF public.fn_current_role() IS DISTINCT FROM 'super_admin' THEN RAISE EXCEPTION 'Accès refusé'; END IF;
    IF p_amount IS NULL OR p_amount = 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;

    PERFORM set_config('app.bypass_profile_protection', 'true', true);
    UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance,0) + p_amount
    WHERE id = p_user_id RETURNING wallet_balance INTO v_new;
    IF v_new IS NULL THEN RAISE EXCEPTION 'Profil introuvable'; END IF;

    INSERT INTO public.transactions (user_id, amount, type, description, status, payment_method, metadata)
    VALUES (p_user_id, p_amount, 'adjustment',
            'Ajustement Super Admin : ' || COALESCE(p_reason,''), 'Succeeded', 'system_adjustment',
            jsonb_build_object('adjusted_by', auth.uid(), 'reason', p_reason));
    RETURN v_new;
END;
$$;

-- 8.6 Marketplace : réservation (collecteur, agent, organisation) ----------
CREATE OR REPLACE FUNCTION public.reserve_waste(p_waste_id UUID, p_collecteur_id UUID)
RETURNS public.wastes
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_waste public.wastes;
    v_tier TEXT;
    v_role TEXT;
    v_month_count INT;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_collecteur_id THEN
        RAISE EXCEPTION 'Non autorisé' USING ERRCODE = '42501';
    END IF;
    SELECT role, subscription_tier INTO v_role, v_tier FROM public.profiles WHERE id = p_collecteur_id;
    IF v_role IS NULL OR v_role NOT IN ('collecteur','agent_collecteur','organisation_admin') THEN
        RAISE EXCEPTION 'ROLE_NOT_ALLOWED' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_collecteur_id AND status = 'Suspendu') THEN
        RAISE EXCEPTION 'Compte suspendu : réservation impossible.' USING ERRCODE = '42501';
    END IF;

    -- Offre gratuite d'un collecteur indépendant : 3 réservations par mois
    IF v_role = 'collecteur' AND COALESCE(v_tier, 'free') IN ('free', 'starter', 'citizen') THEN
        SELECT count(*) INTO v_month_count FROM public.wastes
        WHERE collector_id = p_collecteur_id AND reserved_at >= date_trunc('month', now());
        IF v_month_count >= 3 THEN
            RAISE EXCEPTION 'QUOTA_REACHED: le plan gratuit limite à 3 réservations par mois.' USING ERRCODE = 'P0001';
        END IF;
    END IF;

    SELECT * INTO v_waste FROM public.wastes WHERE id = p_waste_id FOR UPDATE SKIP LOCKED;
    IF v_waste.id IS NULL THEN RAISE EXCEPTION 'WASTE_UNAVAILABLE' USING ERRCODE = 'P0002'; END IF;
    IF v_waste.status <> 'published' THEN RAISE EXCEPTION 'WASTE_ALREADY_RESERVED' USING ERRCODE = 'P0001'; END IF;
    IF v_waste.seller_id = p_collecteur_id THEN RAISE EXCEPTION 'Vous ne pouvez pas réserver votre propre lot.'; END IF;

    UPDATE public.wastes
    SET status = 'reserved', collector_id = p_collecteur_id, reserved_at = now()
    WHERE id = p_waste_id
    RETURNING * INTO v_waste;

    IF to_regclass('public.marketplace_reservations') IS NOT NULL THEN
        BEGIN
            EXECUTE 'INSERT INTO public.marketplace_reservations (waste_id, collecteur_id, status) VALUES ($1, $2, ''active'')'
            USING p_waste_id, p_collecteur_id;
        EXCEPTION WHEN unique_violation THEN NULL;
        END;
    END IF;

    INSERT INTO public.notifications (profile_id, title, content, type)
    VALUES (v_waste.seller_id, 'Lot réservé', 'Un acheteur a réservé votre lot.', 'offer');

    RETURN v_waste;
END;
$$;

-- 8.7 Affectation d'un agent à une mission (organisation) -----------------
CREATE OR REPLACE FUNCTION public.fn_assign_agent_to_waste(p_waste_id UUID, p_agent_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid UUID := auth.uid(); v_waste RECORD;
BEGIN
    SELECT * INTO v_waste FROM public.wastes WHERE id = p_waste_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Lot introuvable'; END IF;
    IF v_waste.collector_id IS DISTINCT FROM v_uid AND public.fn_current_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Ce lot n''est pas réservé par votre organisation.';
    END IF;
    IF v_waste.status NOT IN ('reserved','in_progress') THEN
        RAISE EXCEPTION 'Le lot doit être réservé avant affectation.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_agent_id AND role = 'agent_collecteur'
                   AND (organization_id = v_uid OR public.fn_current_role() = 'super_admin')) THEN
        RAISE EXCEPTION 'Cet agent n''appartient pas à votre organisation.';
    END IF;

    UPDATE public.wastes SET assigned_agent_id = p_agent_id WHERE id = p_waste_id;
    INSERT INTO public.notifications (profile_id, title, content, type)
    VALUES (p_agent_id, 'Nouvelle mission', 'Une collecte vous a été affectée : ' || COALESCE(v_waste.location,''), 'mission');
END;
$$;

-- 8.8 Finalisation d'une collecte (paiement + éco-taxe) -------------------
CREATE OR REPLACE FUNCTION public.fn_finalize_collection(p_waste_id UUID, p_final_weight DECIMAL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_waste RECORD;
    v_price NUMERIC;
    v_total NUMERIC := 0;
    v_commission NUMERIC := 0;
    v_seller_amount NUMERIC := 0;
    v_eco_tax NUMERIC := 0;
    v_mairie_id UUID;
    v_balance NUMERIC;
BEGIN
    SELECT w.*, wt.price_per_kg AS wt_price, wt.name AS waste_name
    INTO v_waste
    FROM public.wastes w
    LEFT JOIN public.waste_types wt ON wt.id = w.type_id
    WHERE w.id = p_waste_id
    FOR UPDATE OF w;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lot introuvable');
    END IF;
    IF v_uid IS NULL OR (v_uid IS DISTINCT FROM v_waste.assigned_agent_id AND v_uid IS DISTINCT FROM v_waste.collector_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Action non autorisée. Vous n''êtes pas assigné à cette mission.');
    END IF;
    IF v_waste.status NOT IN ('reserved','in_progress') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ce lot ne peut pas être finalisé (statut : ' || v_waste.status || ').');
    END IF;
    IF p_final_weight IS NULL OR p_final_weight <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Le poids final doit être strictement positif.');
    END IF;
    IF p_final_weight > 5000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Le poids déclaré est suspect (anormalement élevé).');
    END IF;

    PERFORM set_config('app.bypass_profile_protection', 'true', true);

    -- Missions de service (dépôts sauvages, urgences, collecte d'abonnés) : aucun paiement au poids
    IF COALESCE(v_waste.mission_type, 'marketplace') NOT IN ('infraction_cleanup','emergency','subscription_pickup')
       AND v_waste.seller_id IS NOT NULL AND v_waste.collector_id IS NOT NULL
       AND v_waste.seller_id <> v_waste.collector_id THEN

        v_price         := COALESCE(v_waste.wt_price, 0);
        v_total         := round(p_final_weight * v_price, 2);
        v_commission    := round(v_total * public.fn_setting('commission_rate','0.10')::NUMERIC, 2);
        v_eco_tax       := round(v_total * public.fn_setting('eco_tax_rate','0.02')::NUMERIC, 2);
        v_seller_amount := v_total - v_commission;

        IF v_total > 0 THEN
            SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = v_waste.collector_id FOR UPDATE;
            IF COALESCE(v_balance,0) < v_total THEN
                RETURN jsonb_build_object('success', false, 'error',
                    'Fonds insuffisants sur le compte acheteur (' || v_total || ' FCFA requis).');
            END IF;

            UPDATE public.profiles SET wallet_balance = wallet_balance - v_total WHERE id = v_waste.collector_id;
            UPDATE public.profiles
            SET wallet_balance = COALESCE(wallet_balance,0) + v_seller_amount,
                eco_points = COALESCE(eco_points,0) + floor(p_final_weight)::INT
            WHERE id = v_waste.seller_id;

            -- Mairie de la ville du vendeur (sinon : première mairie)
            SELECT m.id INTO v_mairie_id
            FROM public.profiles m
            LEFT JOIN public.profiles s ON s.id = v_waste.seller_id
            WHERE m.role = 'mairie'
            ORDER BY (m.city IS NOT NULL AND s.city IS NOT NULL AND m.city ILIKE '%' || s.city || '%') DESC, m.created_at
            LIMIT 1;

            IF v_mairie_id IS NOT NULL AND v_eco_tax > 0 THEN
                UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance,0) + v_eco_tax WHERE id = v_mairie_id;
                INSERT INTO public.transactions (user_id, amount, type, description, status)
                VALUES (v_mairie_id, v_eco_tax, 'income', 'Éco-taxe sur lot #' || split_part(p_waste_id::TEXT,'-',1), 'Succeeded');
            END IF;

            INSERT INTO public.transactions (user_id, amount, type, description, status, commission_amount) VALUES
                (v_waste.seller_id,    v_seller_amount, 'income',  'Vente de ' || p_final_weight || 'kg de ' || COALESCE(v_waste.waste_name,'déchets'), 'Succeeded', v_commission),
                (v_waste.collector_id, -v_total,        'outcome', 'Achat de ' || p_final_weight || 'kg de ' || COALESCE(v_waste.waste_name,'déchets'), 'Succeeded', 0);

            INSERT INTO public.notifications (profile_id, title, content, type)
            VALUES (v_waste.seller_id, 'Paiement reçu !', 'Votre vente est validée : +' || v_seller_amount || ' FCFA.', 'payment');
        END IF;
    END IF;

    UPDATE public.wastes
    SET status = 'collected', final_weight = p_final_weight, collected_at = now()
    WHERE id = p_waste_id;

    -- Mission issue d'une infraction : on la clôt
    IF v_waste.infraction_id IS NOT NULL AND to_regclass('public.environmental_infractions') IS NOT NULL THEN
        UPDATE public.environmental_infractions SET status = 'resolved', resolved_at = now()
        WHERE id = v_waste.infraction_id AND status <> 'sanctioned';
    END IF;

    INSERT INTO public.notifications (profile_id, title, content, type)
    VALUES (v_waste.collector_id, 'Collecte terminée', 'Collecte finalisée : ' || p_final_weight || ' kg.', 'collection');

    RETURN jsonb_build_object('success', true, 'total_amount', v_total, 'seller_amount', v_seller_amount);
END;
$$;

-- 8.9 Police Verte / Mairie / Organisation : statut d'une infraction --------
CREATE OR REPLACE FUNCTION public.fn_update_infraction_status(p_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_role TEXT := public.fn_current_role(); v_inf RECORD; v_zone UUID;
BEGIN
    IF p_status NOT IN ('open','investigating','resolved','sanctioned','dismissed') THEN
        RAISE EXCEPTION 'Statut invalide';
    END IF;
    SELECT * INTO v_inf FROM public.environmental_infractions WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Infraction introuvable'; END IF;

    IF v_role IN ('mairie','super_admin') THEN
        NULL; -- tous statuts
    ELSIF v_role = 'agent_police_verte' THEN
        SELECT zone_id INTO v_zone FROM public.profiles WHERE id = auth.uid();
        IF v_zone IS DISTINCT FROM v_inf.zone_id THEN RAISE EXCEPTION 'Hors de votre juridiction'; END IF;
        IF p_status = 'sanctioned' THEN RAISE EXCEPTION 'Seule la Mairie peut sanctionner'; END IF;
    ELSIF v_role = 'organisation_admin' AND v_inf.responsible_org_id = auth.uid() THEN
        IF p_status NOT IN ('investigating','resolved') THEN RAISE EXCEPTION 'Action non autorisée'; END IF;
    ELSE
        RAISE EXCEPTION 'Accès refusé';
    END IF;

    UPDATE public.environmental_infractions
    SET status = p_status,
        resolved_at = CASE WHEN p_status IN ('resolved','sanctioned') THEN now() ELSE NULL END
    WHERE id = p_id;
END;
$$;

-- 8.10 Organisation : envoyer un agent nettoyer un dépôt sauvage ----------
CREATE OR REPLACE FUNCTION public.fn_dispatch_agent_to_infraction(p_infraction_id UUID, p_agent_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_role TEXT := public.fn_current_role();
    v_inf RECORD;
    v_type_id BIGINT;
    v_waste_id UUID;
BEGIN
    SELECT * INTO v_inf FROM public.environmental_infractions WHERE id = p_infraction_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Infraction introuvable'; END IF;

    IF v_role NOT IN ('mairie','super_admin') THEN
        IF v_role <> 'organisation_admin' OR NOT (
            v_inf.responsible_org_id = v_uid OR EXISTS (
                SELECT 1 FROM public.concessions c
                WHERE c.zone_id = v_inf.zone_id AND c.organization_id = v_uid AND c.status = 'active')) THEN
            RAISE EXCEPTION 'Cette infraction n''est pas dans votre concession.';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_agent_id AND role = 'agent_collecteur' AND organization_id = v_uid) THEN
            RAISE EXCEPTION 'Cet agent n''appartient pas à votre organisation.';
        END IF;
    END IF;

    SELECT id INTO v_type_id FROM public.waste_types ORDER BY id LIMIT 1;

    INSERT INTO public.wastes (seller_id, collector_id, type_id, estimated_weight, status, location,
                               latitude, longitude, images, assigned_agent_id, mission_type, infraction_id, reserved_at)
    VALUES (v_uid, v_uid, v_type_id, 10, 'reserved',
            COALESCE(v_inf.address, v_inf.manual_address, 'Dépôt sauvage signalé'),
            v_inf.latitude, v_inf.longitude, COALESCE(v_inf.images, '{}'),
            p_agent_id, 'infraction_cleanup', p_infraction_id, now())
    RETURNING id INTO v_waste_id;

    UPDATE public.environmental_infractions SET status = 'investigating' WHERE id = p_infraction_id;

    INSERT INTO public.notifications (profile_id, title, content, type)
    VALUES (p_agent_id, '🚨 Nettoyage de dépôt sauvage',
            'Vous êtes affecté au nettoyage : ' || COALESCE(v_inf.address, v_inf.manual_address, 'votre zone') || '.', 'mission');

    RETURN v_waste_id;
END;
$$;

-- 8.11 Mairie : réquisition d'urgence d'un agent --------------------------
CREATE OR REPLACE FUNCTION public.fn_dispatch_emergency_agent(p_waste_id UUID, p_agent_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.fn_has_role(ARRAY['mairie','super_admin']) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_agent_id AND role IN ('agent_collecteur','collecteur')) THEN
        RAISE EXCEPTION 'Agent invalide';
    END IF;

    UPDATE public.wastes
    SET status = 'reserved',
        assigned_agent_id = p_agent_id,
        collector_id = COALESCE(collector_id, (SELECT COALESCE(organization_id, id) FROM public.profiles WHERE id = p_agent_id)),
        mission_type = 'emergency',
        reserved_at = now()
    WHERE id = p_waste_id AND status IN ('published','reserved');
    IF NOT FOUND THEN RAISE EXCEPTION 'Lot introuvable ou déjà collecté'; END IF;

    INSERT INTO public.notifications (profile_id, title, content, type)
    VALUES (p_agent_id, '🚨 DÉPLOIEMENT D''URGENCE',
            'La Mairie a réquisitionné votre véhicule pour un ramassage sanitaire prioritaire immédiat.', 'mission');
END;
$$;

-- 8.12 Mairie : sanction (amende réelle + score + suspension auto) --------
CREATE OR REPLACE FUNCTION public.fn_issue_sanction(
    p_organization_id UUID,
    p_type TEXT,
    p_description TEXT,
    p_severity TEXT DEFAULT 'medium',
    p_penalty NUMERIC DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_role TEXT;
    v_drop NUMERIC;
    v_score NUMERIC;
BEGIN
    IF NOT public.fn_has_role(ARRAY['mairie','super_admin']) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
    IF p_severity NOT IN ('low','medium','high','critical') THEN p_severity := 'medium'; END IF;
    IF p_penalty IS NULL OR p_penalty < 0 THEN p_penalty := 0; END IF;

    SELECT role INTO v_target_role FROM public.profiles WHERE id = p_organization_id;
    IF v_target_role IS NULL THEN RAISE EXCEPTION 'Organisation introuvable'; END IF;
    IF v_target_role NOT IN ('organisation_admin','collecteur') THEN
        RAISE EXCEPTION 'Seules les organisations et collecteurs peuvent être sanctionnés.';
    END IF;

    INSERT INTO public.sanctions (organization_id, type, description, severity, penalty_amount)
    VALUES (p_organization_id, p_type, p_description, p_severity, p_penalty);

    v_drop := CASE p_severity WHEN 'low' THEN 0.1 WHEN 'medium' THEN 0.25 WHEN 'high' THEN 0.5 ELSE 1 END;

    PERFORM set_config('app.bypass_profile_protection', 'true', true);

    -- L'amende est prélevée réellement ; le solde peut devenir négatif (dette envers la Mairie)
    UPDATE public.profiles
    SET wallet_balance = COALESCE(wallet_balance,0) - p_penalty,
        performance_score = GREATEST(0, COALESCE(performance_score,5) - v_drop),
        status = CASE WHEN GREATEST(0, COALESCE(performance_score,5) - v_drop) < 2.5 THEN 'Suspendu' ELSE status END
    WHERE id = p_organization_id
    RETURNING performance_score INTO v_score;

    IF p_penalty > 0 THEN
        INSERT INTO public.transactions (user_id, amount, type, description, status)
        VALUES (p_organization_id, -p_penalty, 'penalty', 'AMENDE : ' || p_type || ' (' || p_severity || ')', 'Succeeded');
    END IF;

    INSERT INTO public.notifications (profile_id, title, content, type)
    VALUES (p_organization_id, '⚖️ SANCTION ADMINISTRATIVE',
            'Amende de ' || p_penalty || ' CFA : ' || COALESCE(p_description,'') || '. Score actuel : ' || round(v_score,1) || '/5' ||
            CASE WHEN v_score < 2.5 THEN ' — compte SUSPENDU.' ELSE '' END,
            'sanction');

    RETURN jsonb_build_object('success', true, 'score', v_score, 'suspended', v_score < 2.5);
END;
$$;

-- Ancienne fonction : n'est plus appelable par les clients
DO $$
BEGIN
    IF to_regprocedure('public.fn_apply_sanction_penalty(uuid, numeric, text)') IS NOT NULL THEN
        REVOKE ALL ON FUNCTION public.fn_apply_sanction_penalty(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
    END IF;
END $$;

-- 8.13 Droits d'exécution ---------------------------------------------------
DO $$
DECLARE f TEXT;
BEGIN
    FOREACH f IN ARRAY ARRAY[
        'public.fn_current_role()', 'public.fn_has_role(text[])', 'public.fn_setting(text, text)',
        'public.fn_adjust_wallet_balance(uuid, numeric, text)',
        'public.fn_pay_subscription(uuid, uuid, numeric, text, text)',
        'public.fn_subscribe_platform(text)',
        'public.fn_request_withdrawal(numeric, text)',
        'public.fn_process_withdrawal(text, boolean, text)',
        'public.fn_admin_set_role(uuid, text)', 'public.fn_admin_set_status(uuid, text)',
        'public.fn_admin_adjust_wallet(uuid, numeric, text)',
        'public.reserve_waste(uuid, uuid)', 'public.fn_assign_agent_to_waste(uuid, uuid)',
        'public.fn_finalize_collection(uuid, numeric)',
        'public.fn_update_infraction_status(uuid, text)',
        'public.fn_dispatch_agent_to_infraction(uuid, uuid)',
        'public.fn_dispatch_emergency_agent(uuid, uuid)',
        'public.fn_issue_sanction(uuid, text, text, text, numeric)'
    ] LOOP
        IF to_regprocedure(f) IS NOT NULL THEN
            EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
            EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
        END IF;
    END LOOP;

    REVOKE ALL ON FUNCTION public.fn_safe_signup_role(auth.users) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.fn_check_invitation(text) TO anon, authenticated;
END $$;

-- =====================================================================
-- 9. POLICIES RLS COHÉRENTES ET PERFORMANTES
-- ---------------------------------------------------------------------
-- On supprime TOUTES les anciennes policies des tables ci-dessous
-- (accumulées sur plusieurs scripts contradictoires) puis on recrée un
-- jeu unique. (SELECT auth.uid()) et (SELECT fn_current_role()) sont
-- évalués une seule fois par requête au lieu d'une fois par ligne.
-- =====================================================================
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT tablename, policyname FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('profiles','wastes','transactions','notifications','messages',
                            'environmental_infractions','sanctions','system_invitations',
                            'platform_settings','tracking_logs')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- profiles ---------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select_authenticated ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_select_public_institutions ON public.profiles FOR SELECT TO anon
    USING (role IN ('mairie','organisation_admin'));
CREATE POLICY profiles_insert_self ON public.profiles FOR INSERT TO authenticated
    WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY profiles_update_self_org_admin ON public.profiles FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid())
           OR organization_id = (SELECT auth.uid())
           OR (SELECT public.fn_current_role()) = 'super_admin')
    WITH CHECK (id = (SELECT auth.uid())
           OR organization_id = (SELECT auth.uid())
           OR (SELECT public.fn_current_role()) = 'super_admin');
CREATE POLICY profiles_delete_admin ON public.profiles FOR DELETE TO authenticated
    USING ((SELECT public.fn_current_role()) = 'super_admin');

-- wastes -----------------------------------------------------------------
ALTER TABLE public.wastes ENABLE ROW LEVEL SECURITY;
CREATE POLICY wastes_select_all ON public.wastes FOR SELECT USING (true);
CREATE POLICY wastes_insert_organisations ON public.wastes FOR INSERT TO authenticated
    WITH CHECK (seller_id = (SELECT auth.uid())
                AND (SELECT public.fn_current_role()) IN ('organisation_admin','super_admin'));
-- Le vendeur modifie / annule son lot tant qu'il n'est pas réservé
CREATE POLICY wastes_update_seller ON public.wastes FOR UPDATE TO authenticated
    USING (seller_id = (SELECT auth.uid()) AND status = 'published')
    WITH CHECK (seller_id = (SELECT auth.uid()) AND status IN ('published','cancelled'));
-- L'agent affecté démarre sa mission (la finalisation passe par fn_finalize_collection)
CREATE POLICY wastes_update_assigned_agent ON public.wastes FOR UPDATE TO authenticated
    USING (assigned_agent_id = (SELECT auth.uid()) AND status IN ('reserved','in_progress'))
    WITH CHECK (assigned_agent_id = (SELECT auth.uid()) AND status IN ('reserved','in_progress'));
CREATE POLICY wastes_update_admin ON public.wastes FOR UPDATE TO authenticated
    USING ((SELECT public.fn_current_role()) = 'super_admin')
    WITH CHECK ((SELECT public.fn_current_role()) = 'super_admin');
CREATE POLICY wastes_delete_seller_or_admin ON public.wastes FOR DELETE TO authenticated
    USING ((seller_id = (SELECT auth.uid()) AND status IN ('published','cancelled'))
           OR (SELECT public.fn_current_role()) = 'super_admin');

-- transactions : lecture seule pour les clients, écriture via RPC ---------
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY transactions_select_own ON public.transactions FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()) OR profile_id = (SELECT auth.uid())
           OR (SELECT public.fn_current_role()) = 'super_admin');
CREATE POLICY transactions_admin_write ON public.transactions FOR ALL TO authenticated
    USING ((SELECT public.fn_current_role()) = 'super_admin')
    WITH CHECK ((SELECT public.fn_current_role()) = 'super_admin');

-- notifications ----------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_select_own ON public.notifications FOR SELECT TO authenticated
    USING (profile_id = (SELECT auth.uid()));
CREATE POLICY notifications_insert_authenticated ON public.notifications FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated
    USING (profile_id = (SELECT auth.uid())) WITH CHECK (profile_id = (SELECT auth.uid()));
CREATE POLICY notifications_delete_own ON public.notifications FOR DELETE TO authenticated
    USING (profile_id = (SELECT auth.uid()));

-- messages ---------------------------------------------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_select_participants ON public.messages FOR SELECT TO authenticated
    USING (sender_id = (SELECT auth.uid()) OR receiver_id = (SELECT auth.uid()));
CREATE POLICY messages_insert_sender ON public.messages FOR INSERT TO authenticated
    WITH CHECK (sender_id = (SELECT auth.uid()));
CREATE POLICY messages_update_receiver ON public.messages FOR UPDATE TO authenticated
    USING (receiver_id = (SELECT auth.uid())) WITH CHECK (receiver_id = (SELECT auth.uid()));

-- environmental_infractions ----------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.environmental_infractions') IS NULL THEN RETURN; END IF;

    ALTER TABLE public.environmental_infractions ENABLE ROW LEVEL SECURITY;

    IF to_regclass('public.concessions') IS NOT NULL THEN
        CREATE POLICY infractions_select ON public.environmental_infractions FOR SELECT TO authenticated
            USING (
                reported_by = (SELECT auth.uid())
                OR responsible_org_id = (SELECT auth.uid())
                OR (SELECT public.fn_current_role()) IN ('mairie','super_admin','agent_police_verte')
                OR EXISTS (SELECT 1 FROM public.concessions c
                           WHERE c.zone_id = environmental_infractions.zone_id
                             AND c.organization_id = (SELECT auth.uid()) AND c.status = 'active')
            );
    ELSE
        CREATE POLICY infractions_select ON public.environmental_infractions FOR SELECT TO authenticated
            USING (
                reported_by = (SELECT auth.uid())
                OR responsible_org_id = (SELECT auth.uid())
                OR (SELECT public.fn_current_role()) IN ('mairie','super_admin','agent_police_verte')
            );
    END IF;
    CREATE POLICY infractions_insert_self ON public.environmental_infractions FOR INSERT TO authenticated
        WITH CHECK (reported_by = (SELECT auth.uid()));
    CREATE POLICY infractions_update_authorities ON public.environmental_infractions FOR UPDATE TO authenticated
        USING ((SELECT public.fn_current_role()) IN ('mairie','super_admin')
               OR responsible_org_id = (SELECT auth.uid()))
        WITH CHECK ((SELECT public.fn_current_role()) IN ('mairie','super_admin')
               OR responsible_org_id = (SELECT auth.uid()));
END $$;

-- sanctions --------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.sanctions') IS NULL THEN RETURN; END IF;
    ALTER TABLE public.sanctions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY sanctions_select ON public.sanctions FOR SELECT TO authenticated
        USING (organization_id = (SELECT auth.uid())
               OR (SELECT public.fn_current_role()) IN ('mairie','super_admin'));
END $$;

-- system_invitations : super admin uniquement (validation via fn_check_invitation)
DO $$
BEGIN
    IF to_regclass('public.system_invitations') IS NULL THEN RETURN; END IF;
    ALTER TABLE public.system_invitations ENABLE ROW LEVEL SECURITY;
    CREATE POLICY invitations_admin_all ON public.system_invitations FOR ALL TO authenticated
        USING ((SELECT public.fn_current_role()) = 'super_admin')
        WITH CHECK ((SELECT public.fn_current_role()) = 'super_admin');
END $$;

-- platform_settings ------------------------------------------------------
CREATE POLICY platform_settings_select ON public.platform_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY platform_settings_write ON public.platform_settings FOR ALL TO authenticated
    USING ((SELECT public.fn_current_role()) IN ('mairie','super_admin'))
    WITH CHECK ((SELECT public.fn_current_role()) IN ('mairie','super_admin'));

-- tracking_logs ----------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.tracking_logs') IS NULL THEN RETURN; END IF;
    ALTER TABLE public.tracking_logs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tracking_insert_self ON public.tracking_logs FOR INSERT TO authenticated
        WITH CHECK (agent_id = (SELECT auth.uid()));
    CREATE POLICY tracking_select ON public.tracking_logs FOR SELECT TO authenticated
        USING (agent_id = (SELECT auth.uid())
               OR (SELECT public.fn_current_role()) IN ('mairie','super_admin')
               OR EXISTS (SELECT 1 FROM public.profiles a
                          WHERE a.id = tracking_logs.agent_id AND a.organization_id = (SELECT auth.uid())));
END $$;

-- zones & concessions : la Mairie propriétaire attribue ses zones -------
DO $$
DECLARE r RECORD;
BEGIN
    IF to_regclass('public.zones') IS NULL OR to_regclass('public.concessions') IS NULL THEN RETURN; END IF;

    ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS organization_id UUID;
    ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS created_by UUID;
    ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';

    -- Propriétaire unique = organization_id (la Mairie)
    UPDATE public.zones SET organization_id = created_by WHERE organization_id IS NULL AND created_by IS NOT NULL;

    ALTER TABLE public.zones DROP CONSTRAINT IF EXISTS zones_status_check;
    ALTER TABLE public.zones ADD CONSTRAINT zones_status_check
        CHECK (status IN ('available','rented','occupied','maintenance')) NOT VALID;

    FOR r IN SELECT tablename, policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename IN ('zones','concessions') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;

    ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
    CREATE POLICY zones_select_all ON public.zones FOR SELECT USING (true);
    CREATE POLICY zones_insert_mairie ON public.zones FOR INSERT TO authenticated
        WITH CHECK ((SELECT public.fn_current_role()) IN ('mairie','super_admin'));
    CREATE POLICY zones_manage_owner ON public.zones FOR UPDATE TO authenticated
        USING (organization_id = (SELECT auth.uid()) OR created_by = (SELECT auth.uid())
               OR (SELECT public.fn_current_role()) = 'super_admin')
        WITH CHECK (organization_id = (SELECT auth.uid()) OR created_by = (SELECT auth.uid())
               OR (SELECT public.fn_current_role()) = 'super_admin');
    CREATE POLICY zones_delete_owner ON public.zones FOR DELETE TO authenticated
        USING (organization_id = (SELECT auth.uid()) OR created_by = (SELECT auth.uid())
               OR (SELECT public.fn_current_role()) = 'super_admin');

    ALTER TABLE public.concessions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY concessions_select_all ON public.concessions FOR SELECT USING (true);
    -- La Mairie propriétaire de la zone attribue / révoque
    CREATE POLICY concessions_write_zone_owner ON public.concessions FOR ALL TO authenticated
        USING ((SELECT public.fn_current_role()) = 'super_admin'
               OR EXISTS (SELECT 1 FROM public.zones z WHERE z.id = concessions.zone_id
                          AND (z.organization_id = (SELECT auth.uid()) OR z.created_by = (SELECT auth.uid()))))
        WITH CHECK ((SELECT public.fn_current_role()) = 'super_admin'
               OR EXISTS (SELECT 1 FROM public.zones z WHERE z.id = concessions.zone_id
                          AND (z.organization_id = (SELECT auth.uid()) OR z.created_by = (SELECT auth.uid()))));
    -- Une organisation peut DEMANDER une concession (statut pending uniquement)
    CREATE POLICY concessions_request_org ON public.concessions FOR INSERT TO authenticated
        WITH CHECK (organization_id = (SELECT auth.uid()) AND status = 'pending'
                    AND (SELECT public.fn_current_role()) = 'organisation_admin');
END $$;

-- tenders & tender_bids : la Mairie traite les offres de SES marchés ----
DO $$
DECLARE r RECORD;
BEGIN
    IF to_regclass('public.tenders') IS NULL OR to_regclass('public.tender_bids') IS NULL THEN RETURN; END IF;

    FOR r IN SELECT tablename, policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename IN ('tenders','tender_bids') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;

    ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenders_select_all ON public.tenders FOR SELECT USING (true);
    CREATE POLICY tenders_manage_mairie ON public.tenders FOR ALL TO authenticated
        USING (mairie_id = (SELECT auth.uid()) OR (SELECT public.fn_current_role()) = 'super_admin')
        WITH CHECK ((mairie_id = (SELECT auth.uid()) AND (SELECT public.fn_current_role()) = 'mairie')
                    OR (SELECT public.fn_current_role()) = 'super_admin');

    ALTER TABLE public.tender_bids ENABLE ROW LEVEL SECURITY;
    -- Une organisation voit ses offres ; la Mairie voit les offres de ses marchés
    CREATE POLICY bids_select ON public.tender_bids FOR SELECT TO authenticated
        USING (organisation_id = (SELECT auth.uid())
               OR (SELECT public.fn_current_role()) = 'super_admin'
               OR EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_bids.tender_id AND t.mairie_id = (SELECT auth.uid())));
    CREATE POLICY bids_insert_org ON public.tender_bids FOR INSERT TO authenticated
        WITH CHECK (organisation_id = (SELECT auth.uid())
                    AND (SELECT public.fn_current_role()) IN ('organisation_admin','collecteur'));
    -- L'organisation modifie son offre tant qu'elle est en attente
    CREATE POLICY bids_update_org_pending ON public.tender_bids FOR UPDATE TO authenticated
        USING (organisation_id = (SELECT auth.uid()) AND status = 'pending')
        WITH CHECK (organisation_id = (SELECT auth.uid()) AND status = 'pending');
    -- La Mairie accepte / rejette les offres de ses marchés
    CREATE POLICY bids_update_mairie ON public.tender_bids FOR UPDATE TO authenticated
        USING ((SELECT public.fn_current_role()) = 'super_admin'
               OR EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_bids.tender_id AND t.mairie_id = (SELECT auth.uid())))
        WITH CHECK ((SELECT public.fn_current_role()) = 'super_admin'
               OR EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_bids.tender_id AND t.mairie_id = (SELECT auth.uid())));
    CREATE POLICY bids_delete_org_pending ON public.tender_bids FOR DELETE TO authenticated
        USING (organisation_id = (SELECT auth.uid()) AND status = 'pending');
END $$;

-- =====================================================================
-- 10. INDEX DE PERFORMANCE
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role            ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_organization    ON public.profiles (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_zone            ON public.profiles (zone_id) WHERE zone_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wastes_seller            ON public.wastes (seller_id);
CREATE INDEX IF NOT EXISTS idx_wastes_collector         ON public.wastes (collector_id);
CREATE INDEX IF NOT EXISTS idx_wastes_agent             ON public.wastes (assigned_agent_id) WHERE assigned_agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wastes_status_created    ON public.wastes (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user_created    ON public.transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_profile_created ON public.transactions (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status_pending  ON public.transactions (status) WHERE status = 'Pending';

CREATE INDEX IF NOT EXISTS idx_notifications_unread     ON public.notifications (profile_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON public.messages (receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_sender          ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_waste           ON public.messages (waste_id);

DO $$
BEGIN
    IF to_regclass('public.environmental_infractions') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_infractions_zone_status ON public.environmental_infractions (zone_id, status);
        CREATE INDEX IF NOT EXISTS idx_infractions_org         ON public.environmental_infractions (responsible_org_id);
        CREATE INDEX IF NOT EXISTS idx_infractions_reporter    ON public.environmental_infractions (reported_by);
    END IF;
    IF to_regclass('public.concessions') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_concessions_zone_status ON public.concessions (zone_id, status);
        CREATE INDEX IF NOT EXISTS idx_concessions_org         ON public.concessions (organization_id);
    END IF;
    IF to_regclass('public.tracking_logs') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_tracking_agent ON public.tracking_logs (agent_id);
    END IF;
    IF to_regclass('public.sanctions') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_sanctions_org ON public.sanctions (organization_id);
    END IF;
END $$;

ANALYZE public.profiles;
ANALYZE public.wastes;
ANALYZE public.transactions;
ANALYZE public.notifications;
ANALYZE public.messages;

-- =====================================================================
-- 🔍 DIAGNOSTIC QUALITÉ BASE DE DONNÉES — CleanZone
-- ---------------------------------------------------------------------
-- LECTURE SEULE : ce script ne modifie AUCUNE donnée ni structure.
-- Il crée uniquement des objets temporaires (pg_temp) qui disparaissent
-- à la fin de la session.
--
-- Utilisation : Supabase > SQL Editor > coller > Run.
-- Résultat : un seul tableau trié par gravité
--   1-CRITIQUE > 2-ERREUR > 3-AVERTISSEMENT > 4-OK > 5-INFO
-- =====================================================================

DROP TABLE IF EXISTS pg_temp._diag;
CREATE TEMP TABLE _diag (
    niveau    TEXT,
    categorie TEXT,
    controle  TEXT,
    valeur    TEXT,
    detail    TEXT
);

CREATE OR REPLACE FUNCTION pg_temp.add(p_niveau TEXT, p_cat TEXT, p_ctrl TEXT, p_val TEXT, p_detail TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE sql AS $$
    INSERT INTO _diag VALUES (p_niveau, p_cat, p_ctrl, p_val, p_detail);
$$;

CREATE OR REPLACE FUNCTION pg_temp.has_table(p_table TEXT) RETURNS BOOLEAN LANGUAGE sql AS $$
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = p_table);
$$;

CREATE OR REPLACE FUNCTION pg_temp.has_col(p_table TEXT, p_col TEXT) RETURNS BOOLEAN LANGUAGE sql AS $$
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = p_table AND column_name = p_col);
$$;

CREATE OR REPLACE FUNCTION pg_temp.cnt(p_sql TEXT) RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE v BIGINT;
BEGIN
    EXECUTE p_sql INTO v;
    RETURN COALESCE(v, 0);
EXCEPTION WHEN others THEN
    RETURN -1; -- -1 = requête impossible (colonne/table absente)
END;
$$;

DO $diag$
DECLARE
    r RECORD;
    v BIGINT;
    v2 BIGINT;
    v_txt TEXT;
    v_valid_roles TEXT[] := ARRAY['producteur','collecteur','organisation_admin','agent_collecteur','agent_police_verte','mairie','super_admin'];
    v_required_tables TEXT[] := ARRAY[
        'profiles','wastes','waste_types','messages','transactions','notifications','zones','concessions',
        'subscription_plans','platform_subscriptions','environmental_infractions','sanctions','system_invitations',
        'system_settings','platform_settings','tracking_logs','agent_live_positions','vehicles','tenders','tender_bids',
        'marketplace_reservations','reviews','push_subscriptions'];
    v_required_functions TEXT[] := ARRAY[
        'handle_new_user','reserve_waste','fn_finalize_collection','fn_adjust_wallet_balance','fn_pay_subscription',
        'fn_apply_sanction_penalty','fn_protect_profile_columns','fn_enforce_agent_territory',
        -- fonctions ajoutées par la migration de stabilisation :
        'fn_current_role','fn_issue_sanction','fn_subscribe_platform','fn_request_withdrawal','fn_process_withdrawal',
        'fn_admin_set_role','fn_admin_set_status','fn_admin_adjust_wallet','fn_dispatch_agent_to_infraction',
        'fn_dispatch_emergency_agent','fn_update_infraction_status',
        'fn_push_dispatch','fn_register_push_token','fn_notification_push','fn_message_push'];
BEGIN
    -- =================================================================
    -- A. STRUCTURE
    -- =================================================================
    FOREACH v_txt IN ARRAY v_required_tables LOOP
        IF NOT pg_temp.has_table(v_txt) THEN
            PERFORM pg_temp.add('2-ERREUR', 'Structure', 'Table manquante', v_txt, 'Le code web/mobile utilise cette table.');
        END IF;
    END LOOP;

    FOREACH v_txt IN ARRAY v_required_functions LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                       WHERE n.nspname = 'public' AND p.proname = v_txt) THEN
            PERFORM pg_temp.add(
                CASE WHEN v_txt IN ('fn_current_role','fn_issue_sanction','fn_subscribe_platform','fn_request_withdrawal',
                                    'fn_process_withdrawal','fn_admin_set_role','fn_admin_set_status','fn_admin_adjust_wallet',
                                    'fn_dispatch_agent_to_infraction','fn_dispatch_emergency_agent','fn_update_infraction_status')
                     THEN '3-AVERTISSEMENT' ELSE '2-ERREUR' END,
                'Structure', 'Fonction RPC manquante', v_txt,
                'Exécuter supabase/migrations/20261119_stabilisation_profils.sql si elle n''a pas été appliquée.');
        END IF;
    END LOOP;

    -- Colonnes de transactions (incohérence user_id / profile_id dans le code)
    IF pg_temp.has_table('transactions') THEN
        PERFORM pg_temp.add(
            CASE WHEN pg_temp.has_col('transactions','user_id') AND pg_temp.has_col('transactions','profile_id') THEN '4-OK' ELSE '2-ERREUR' END,
            'Structure', 'transactions : colonnes user_id ET profile_id',
            'user_id=' || pg_temp.has_col('transactions','user_id') || ' / profile_id=' || pg_temp.has_col('transactions','profile_id'),
            'Le code utilise les deux noms ; il faut les deux colonnes synchronisées.');

        IF pg_temp.has_col('transactions','user_id') AND pg_temp.has_col('transactions','profile_id') THEN
            v := pg_temp.cnt('SELECT count(*) FROM public.transactions WHERE user_id IS NULL OR profile_id IS NULL OR user_id <> profile_id');
            PERFORM pg_temp.add(CASE WHEN v = 0 THEN '4-OK' ELSE '2-ERREUR' END, 'Intégrité',
                'transactions : user_id et profile_id désynchronisés', v::TEXT,
                'Ces lignes n''apparaissent pas dans certains historiques (web ou mobile).');
        END IF;

        FOR r IN SELECT COALESCE(status::TEXT,'NULL') AS s, count(*) AS c FROM public.transactions GROUP BY 1 ORDER BY 2 DESC LOOP
            PERFORM pg_temp.add('5-INFO', 'Données', 'transactions.status : valeur utilisée', r.s, r.c || ' ligne(s)');
        END LOOP;
        FOR r IN SELECT COALESCE(type::TEXT,'NULL') AS s, count(*) AS c FROM public.transactions GROUP BY 1 ORDER BY 2 DESC LOOP
            PERFORM pg_temp.add('5-INFO', 'Données', 'transactions.type : valeur utilisée', r.s, r.c || ' ligne(s)');
        END LOOP;
    END IF;

    -- Contraintes CHECK sur les tables critiques (pour vérifier qu'elles acceptent les valeurs du code)
    FOR r IN
        SELECT c.conrelid::regclass::TEXT AS tbl, c.conname, pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c
        WHERE c.contype = 'c'
          AND c.conrelid::regclass::TEXT IN ('profiles','public.profiles','transactions','public.transactions',
                                              'notifications','public.notifications','wastes','public.wastes',
                                              'environmental_infractions','public.environmental_infractions')
    LOOP
        PERFORM pg_temp.add('5-INFO', 'Structure', 'Contrainte CHECK ' || r.tbl, r.conname, r.def);
    END LOOP;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check'
               AND pg_get_constraintdef(oid) NOT LIKE '%alert%') THEN
        PERFORM pg_temp.add('2-ERREUR', 'Structure', 'notifications_type_check trop restrictive', 'alert/info/success refusés',
            'Les sanctions et notifications web (type alert/info) échouent.');
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_status_check'
               AND pg_get_constraintdef(oid) NOT LIKE '%completed%') THEN
        PERFORM pg_temp.add('1-CRITIQUE', 'Structure', 'transactions_status_check refuse ''completed''', 'bloquant',
            'fn_adjust_wallet_balance insère status=completed : toute recharge/débit mobile échoue.');
    END IF;

    -- =================================================================
    -- B. PROFILS / RÔLES
    -- =================================================================
    FOR r IN SELECT COALESCE(role,'NULL') AS role, count(*) AS c FROM public.profiles GROUP BY 1 ORDER BY 2 DESC LOOP
        PERFORM pg_temp.add(CASE WHEN r.role = ANY(v_valid_roles) THEN '5-INFO' ELSE '2-ERREUR' END,
            'Profils', 'Répartition des rôles', r.role, r.c || ' profil(s)' ||
            CASE WHEN r.role = ANY(v_valid_roles) THEN '' ELSE ' — rôle inconnu du code (vendeur/entreprise/NULL ?)' END);
    END LOOP;

    v := pg_temp.cnt('SELECT count(*) FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE p.id IS NULL');
    PERFORM pg_temp.add(CASE WHEN v = 0 THEN '4-OK' ELSE '2-ERREUR' END, 'Profils',
        'Comptes auth sans profil', v::TEXT, 'Ces utilisateurs restent bloqués sur un écran de chargement.');

    v := pg_temp.cnt('SELECT count(*) FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id WHERE u.id IS NULL');
    PERFORM pg_temp.add(CASE WHEN v = 0 THEN '4-OK' ELSE '3-AVERTISSEMENT' END, 'Profils',
        'Profils orphelins (sans compte auth)', v::TEXT, 'Créés par l''ancien bouton admin « Ajouter » : impossibles à connecter.');

    FOR r IN
        SELECT p.id, p.full_name, u.email, u.created_at
        FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id
        WHERE p.role = 'super_admin' ORDER BY u.created_at
    LOOP
        PERFORM pg_temp.add('3-AVERTISSEMENT', 'Sécurité', 'Compte super_admin à vérifier',
            COALESCE(r.email, r.id::TEXT), COALESCE(r.full_name,'') || ' — créé le ' || COALESCE(r.created_at::DATE::TEXT,'?') ||
            '. Avant correctif, n''importe qui pouvait s''inscrire super_admin.');
    END LOOP;

    IF pg_temp.has_table('system_invitations') THEN
        v := pg_temp.cnt($q$SELECT count(*) FROM public.profiles p
                         WHERE p.role = 'mairie'
                           AND NOT EXISTS (SELECT 1 FROM public.system_invitations i WHERE i.used_by = p.id)$q$);
        PERFORM pg_temp.add(CASE WHEN v = 0 THEN '4-OK' ELSE '3-AVERTISSEMENT' END, 'Sécurité',
            'Comptes mairie sans invitation consommée', v::TEXT,
            'Normal s''ils ont été créés par le Super Admin ; sinon compte suspect.');
        v := pg_temp.cnt('SELECT count(*) FROM public.system_invitations WHERE is_used = false AND expires_at < now()');
        PERFORM pg_temp.add('5-INFO', 'Données', 'Invitations expirées non utilisées', v::TEXT);
    END IF;

    v := pg_temp.cnt($q$SELECT count(*) FROM public.profiles WHERE role = 'agent_collecteur' AND organization_id IS NULL$q$);
    IF v >= 0 THEN
        PERFORM pg_temp.add(CASE WHEN v = 0 THEN '4-OK' ELSE '2-ERREUR' END, 'Profils',
            'Agents collecteurs sans organisation', v::TEXT, 'Invisibles dans « Mes agents » et non assignables.');
    END IF;

    v := pg_temp.cnt($q$SELECT count(*) FROM public.profiles WHERE role = 'agent_police_verte' AND zone_id IS NULL$q$);
    IF v >= 0 THEN
        PERFORM pg_temp.add(CASE WHEN v = 0 THEN '4-OK' ELSE '2-ERREUR' END, 'Profils',
            'Agents Police Verte sans zone', v::TEXT, 'Le trigger territorial bloque TOUS leurs PV.');
    END IF;

    IF pg_temp.has_col('profiles','app_pin') THEN
        v := pg_temp.cnt('SELECT count(*) FROM public.profiles WHERE app_pin IS NOT NULL');
        PERFORM pg_temp.add(CASE WHEN v = 0 THEN '4-OK' ELSE '1-CRITIQUE' END, 'Sécurité',
            'PIN agents stockés en clair dans profiles', v::TEXT,
            'Lisibles publiquement + mot de passe = Agent{PIN}! → connexion à la place de l''agent.');
    END IF;

    v := pg_temp.cnt('SELECT count(*) FROM public.profiles WHERE wallet_balance < 0');
    PERFORM pg_temp.add(CASE WHEN v = 0 THEN '4-OK' ELSE '2-ERREUR' END, 'Intégrité',
        'Portefeuilles en solde négatif', v::TEXT);

    FOR r IN SELECT role, COALESCE(subscription_tier,'NULL') AS t, count(*) AS c
             FROM public.profiles WHERE role IN ('organisation_admin','collecteur','producteur','mairie')
             GROUP BY 1,2 ORDER BY 1,3 DESC LOOP
        PERFORM pg_temp.add('5-INFO', 'Profils', 'Palier d''abonnement par rôle', r.role || ' / ' || r.t, r.c || ' profil(s)');
    END LOOP;

    -- =================================================================
    -- C. SÉCURITÉ (RLS, fonctions, trigger d'inscription)
    -- =================================================================
    FOR r IN
        SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
    LOOP
        PERFORM pg_temp.add('1-CRITIQUE', 'Sécurité', 'Table SANS RLS (lisible/modifiable via la clé anon)', r.relname);
    END LOOP;

    FOR r IN
        SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
          AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname)
    LOOP
        PERFORM pg_temp.add('3-AVERTISSEMENT', 'Sécurité', 'RLS active mais AUCUNE policy (table inaccessible)', r.relname);
    END LOOP;

    FOR r IN
        SELECT tablename, policyname, cmd, roles::TEXT AS roles FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('profiles','transactions','wastes','messages','environmental_infractions','sanctions','platform_subscriptions')
          AND (qual = 'true' OR with_check = 'true')
    LOOP
        PERFORM pg_temp.add(CASE WHEN r.cmd = 'SELECT' THEN '3-AVERTISSEMENT' ELSE '1-CRITIQUE' END, 'Sécurité',
            'Policy totalement ouverte (true)', r.tablename || '.' || r.policyname,
            'cmd=' || r.cmd || ' roles=' || r.roles);
    END LOOP;

    -- Opérations UPDATE sans policy (les mises à jour échouent SILENCIEUSEMENT : 0 ligne, pas d'erreur)
    FOREACH v_txt IN ARRAY ARRAY['environmental_infractions','wastes','concessions','zones','tenders','tender_bids','notifications','messages'] LOOP
        IF pg_temp.has_table(v_txt) AND NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename = v_txt AND cmd IN ('UPDATE','ALL')) THEN
            PERFORM pg_temp.add('2-ERREUR', 'Fonctionnel', 'Aucune policy UPDATE', v_txt,
                'Toute mise à jour depuis l''app est ignorée sans message d''erreur.');
        END IF;
    END LOOP;

    -- Trigger d'inscription : rôle pris tel quel dans les métadonnées ?
    SELECT pg_get_functiondef(p.oid) INTO v_txt
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user' LIMIT 1;
    IF v_txt IS NULL THEN
        PERFORM pg_temp.add('1-CRITIQUE', 'Sécurité', 'handle_new_user absente', '-', 'Les inscriptions ne créent pas de profil.');
    ELSIF v_txt NOT LIKE '%fn_safe_signup_role%' AND v_txt LIKE '%raw_user_meta_data->>''role''%' THEN
        PERFORM pg_temp.add('1-CRITIQUE', 'Sécurité', 'handle_new_user fait confiance au rôle envoyé par le client', 'escalade',
            'Un signUp avec role=super_admin crée un super administrateur.');
    ELSE
        PERFORM pg_temp.add('4-OK', 'Sécurité', 'handle_new_user filtre le rôle', 'ok');
    END IF;

    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_protect_profile_columns' AND NOT tgisinternal) THEN
        PERFORM pg_temp.add('4-OK', 'Sécurité', 'Trigger de protection des colonnes sensibles', 'présent');
    ELSE
        PERFORM pg_temp.add('1-CRITIQUE', 'Sécurité', 'Trigger de protection des colonnes sensibles', 'absent',
            'Chaque utilisateur peut modifier son propre solde / rôle.');
    END IF;

    FOR r IN
        SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.prosecdef
          AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) cfg WHERE cfg LIKE 'search_path=%')
    LOOP
        PERFORM pg_temp.add('3-AVERTISSEMENT', 'Sécurité', 'SECURITY DEFINER sans search_path fixé', r.proname,
            'Risque de détournement par objet homonyme ; ajouter SET search_path = public.');
    END LOOP;

    -- Fonctions SECURITY DEFINER exposées sans aucun contrôle d'appelant
    FOR r IN
        SELECT p.proname, pg_get_functiondef(p.oid) AS def
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.prosecdef AND p.prorettype <> 'trigger'::regtype
    LOOP
        IF r.def NOT ILIKE '%auth.uid()%' AND r.def NOT ILIKE '%fn_current_role%' THEN
            PERFORM pg_temp.add('2-ERREUR', 'Sécurité', 'RPC SECURITY DEFINER sans vérification de l''appelant', r.proname,
                'Appelable par tout utilisateur connecté via /rest/v1/rpc.');
        END IF;
    END LOOP;

    -- =================================================================
    -- D. INTÉGRITÉ MÉTIER
    -- =================================================================
    v := pg_temp.cnt($q$SELECT count(*) FROM public.wastes WHERE status = 'reserved' AND collector_id IS NULL$q$);
    PERFORM pg_temp.add(CASE WHEN v = 0 THEN '4-OK' ELSE '2-ERREUR' END, 'Intégrité', 'Lots réservés sans collecteur', v::TEXT);

    v := pg_temp.cnt($q$SELECT count(*) FROM public.wastes WHERE status = 'collected' AND final_weight IS NULL$q$);
    PERFORM pg_temp.add(CASE WHEN v = 0 THEN '4-OK' ELSE '3-AVERTISSEMENT' END, 'Intégrité', 'Lots collectés sans poids final', v::TEXT);

    v := pg_temp.cnt($q$SELECT count(*) FROM public.wastes w WHERE w.status = 'collected'
                       AND NOT EXISTS (SELECT 1 FROM public.transactions t
                                       WHERE t.description ILIKE '%' || split_part(w.id::text,'-',1) || '%'
                                          OR t.description ILIKE 'Vente de%')$q$);
    IF v > 0 THEN
        PERFORM pg_temp.add('3-AVERTISSEMENT', 'Intégrité', 'Lots collectés sans aucune transaction de paiement', v::TEXT,
            'Symptôme de l''ancien confirmCollection web (statut changé, paiement bloqué).');
    END IF;

    v := pg_temp.cnt($q$SELECT count(*) FROM public.wastes WHERE status = 'reserved' AND created_at < now() - interval '48 hours'$q$);
    PERFORM pg_temp.add(CASE WHEN v = 0 THEN '4-OK' ELSE '3-AVERTISSEMENT' END, 'Métier', 'Lots réservés depuis > 48h (SLA dépassé)', v::TEXT);

    IF pg_temp.has_table('environmental_infractions') THEN
        v := pg_temp.cnt($q$SELECT count(*) FROM public.environmental_infractions WHERE zone_id IS NULL$q$);
        PERFORM pg_temp.add(CASE WHEN v = 0 THEN '4-OK' ELSE '3-AVERTISSEMENT' END, 'Métier', 'Infractions sans zone', v::TEXT,
            'Non routées vers une organisation.');
        v := pg_temp.cnt($q$SELECT count(*) FROM public.environmental_infractions WHERE status = 'open' AND responsible_org_id IS NULL$q$);
        PERFORM pg_temp.add(CASE WHEN v = 0 THEN '4-OK' ELSE '3-AVERTISSEMENT' END, 'Métier', 'Infractions ouvertes sans organisation responsable', v::TEXT);
    END IF;

    IF pg_temp.has_table('concessions') THEN
        v := pg_temp.cnt($q$SELECT count(*) FROM public.concessions WHERE status = 'active' AND rent_end < now()$q$);
        PERFORM pg_temp.add(CASE WHEN v = 0 THEN '4-OK' ELSE '3-AVERTISSEMENT' END, 'Métier', 'Concessions actives mais expirées', v::TEXT);
        v := pg_temp.cnt($q$SELECT count(*) FROM (SELECT zone_id FROM public.concessions WHERE status='active' GROUP BY zone_id HAVING count(*) > 1) x$q$);
        PERFORM pg_temp.add(CASE WHEN v = 0 THEN '4-OK' ELSE '2-ERREUR' END, 'Métier', 'Zones avec plusieurs concessions actives', v::TEXT);
    END IF;

    IF pg_temp.has_col('transactions','user_id') THEN
        v := pg_temp.cnt($q$SELECT count(*) FROM (
                SELECT p.id FROM public.profiles p
                LEFT JOIN public.transactions t ON t.user_id = p.id
                GROUP BY p.id, p.wallet_balance
                HAVING abs(COALESCE(p.wallet_balance,0) - COALESCE(sum(t.amount) FILTER (WHERE COALESCE(t.status,'') NOT IN ('Failed','Cancelled','failed')),0)) > 1
             ) x$q$);
        PERFORM pg_temp.add(CASE WHEN v = 0 THEN '4-OK' ELSE '5-INFO' END, 'Intégrité',
            'Soldes différents de la somme des transactions', v::TEXT,
            'Informatif : d''anciens flux ne journalisaient pas toutes les opérations.');
    END IF;

    -- =================================================================
    -- D bis. NOTIFICATIONS PUSH
    -- =================================================================
    IF pg_temp.has_table('push_subscriptions') THEN
        FOR r IN SELECT kind, count(*) AS c, count(DISTINCT user_id) AS u FROM public.push_subscriptions GROUP BY kind LOOP
            PERFORM pg_temp.add('5-INFO', 'Push', 'Appareils abonnés', r.kind, r.c || ' appareil(s) / ' || r.u || ' utilisateur(s)');
        END LOOP;
        PERFORM pg_temp.add(
            CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN '4-OK' ELSE '2-ERREUR' END,
            'Push', 'Extension pg_net (envoi HTTP depuis la base)',
            CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN 'installée' ELSE 'absente' END);
        PERFORM pg_temp.add(
            CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_notification_push' AND NOT tgisinternal) THEN '4-OK' ELSE '2-ERREUR' END,
            'Push', 'Trigger notification -> push', 'tr_notification_push');
        v := pg_temp.cnt('SELECT count(*) FROM public.push_subscriptions');
        PERFORM pg_temp.add(CASE WHEN v > 0 THEN '4-OK' ELSE '3-AVERTISSEMENT' END, 'Push',
            'Appareils Expo enregistrés', v::TEXT,
            'À 0 : aucun utilisateur ne s''est encore connecté avec la nouvelle version de l''app mobile.');
        IF to_regclass('net._http_response') IS NOT NULL THEN
            v := pg_temp.cnt($q$SELECT count(*) FROM net._http_response WHERE created > now() - interval '24 hours' AND (status_code IS NULL OR status_code >= 400)$q$);
            PERFORM pg_temp.add(CASE WHEN v <= 0 THEN '4-OK' ELSE '3-AVERTISSEMENT' END, 'Push',
                'Appels Expo en échec (24 h)', GREATEST(v,0)::TEXT, 'Détail : SELECT * FROM net._http_response ORDER BY created DESC;');
        END IF;
    END IF;

    -- =================================================================
    -- E. PERFORMANCE
    -- =================================================================
    -- Clés étrangères non indexées (jointures et RLS lentes)
    FOR r IN
        SELECT c.conrelid::regclass::TEXT AS tbl, a.attname AS col
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
        JOIN pg_namespace n ON n.oid = (SELECT relnamespace FROM pg_class WHERE oid = c.conrelid)
        WHERE c.contype = 'f' AND n.nspname = 'public' AND array_length(c.conkey,1) = 1
          AND NOT EXISTS (
              SELECT 1 FROM pg_index i
              WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1])
    LOOP
        PERFORM pg_temp.add('3-AVERTISSEMENT', 'Performance', 'Clé étrangère sans index', r.tbl || '.' || r.col);
    END LOOP;

    -- Tables parcourues séquentiellement (index manquants)
    FOR r IN
        SELECT relname, seq_scan, COALESCE(idx_scan,0) AS idx_scan, n_live_tup
        FROM pg_stat_user_tables
        WHERE schemaname = 'public' AND seq_scan > 100 AND n_live_tup > 500
          AND seq_scan > 5 * COALESCE(idx_scan,0)
        ORDER BY seq_scan DESC
    LOOP
        PERFORM pg_temp.add('3-AVERTISSEMENT', 'Performance', 'Scans séquentiels dominants', r.relname,
            'seq=' || r.seq_scan || ' idx=' || r.idx_scan || ' lignes=' || r.n_live_tup);
    END LOOP;

    -- Policies RLS qui réévaluent auth.uid() / sous-requête profiles à CHAQUE ligne
    SELECT count(*) INTO v FROM pg_policies
    WHERE schemaname = 'public'
      AND (COALESCE(qual,'') || COALESCE(with_check,'')) ~ 'auth\.uid\(\)'
      AND (COALESCE(qual,'') || COALESCE(with_check,'')) !~ '\(\s*SELECT\s+auth\.uid\(\)';
    PERFORM pg_temp.add(CASE WHEN v = 0 THEN '4-OK' ELSE '3-AVERTISSEMENT' END, 'Performance',
        'Policies avec auth.uid() non mis en cache', v::TEXT,
        'Remplacer auth.uid() par (select auth.uid()) — recommandé par Supabase.');

    SELECT count(*) INTO v FROM pg_policies
    WHERE schemaname = 'public'
      AND (COALESCE(qual,'') || COALESCE(with_check,'')) ILIKE '%FROM profiles%';
    PERFORM pg_temp.add(CASE WHEN v = 0 THEN '4-OK' ELSE '3-AVERTISSEMENT' END, 'Performance',
        'Policies avec sous-requête sur profiles', v::TEXT,
        'Chaque ligne lue déclenche une lecture de profiles ; utiliser fn_current_role().');

    -- Index en double
    FOR r IN
        SELECT indrelid::regclass::TEXT AS tbl, array_agg(indexrelid::regclass::TEXT) AS idx
        FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        GROUP BY indrelid, indkey::TEXT HAVING count(*) > 1
    LOOP
        PERFORM pg_temp.add('5-INFO', 'Performance', 'Index en double', r.tbl, array_to_string(r.idx, ', '));
    END LOOP;

    -- Tables publiées en Realtime (chaque table publiée coûte en charge)
    FOR r IN SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' LOOP
        PERFORM pg_temp.add('5-INFO', 'Performance', 'Table diffusée en Realtime', r.tablename);
    END LOOP;

    -- Volumétrie
    FOR r IN
        SELECT relname, n_live_tup, pg_size_pretty(pg_total_relation_size(relid)) AS sz
        FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY n_live_tup DESC LIMIT 15
    LOOP
        PERFORM pg_temp.add('5-INFO', 'Volumétrie', 'Taille table', r.relname, r.n_live_tup || ' lignes — ' || r.sz);
    END LOOP;
END
$diag$;

SELECT niveau, categorie, controle, valeur, detail
FROM _diag
ORDER BY niveau, categorie, controle, valeur;

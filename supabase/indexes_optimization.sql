-- =========================================================================
-- CLEANZONE : INDEXES OPTIMIZATION SCRIPT
-- =========================================================================
-- Ce script crée les index nécessaires pour accélérer les requêtes de 
-- filtrage (WHERE) et de tri (ORDER BY) fréquemment utilisées dans les 
-- dashboards web et sur l'application mobile.
-- À exécuter directement dans le SQL Editor de votre console Supabase.
-- =========================================================================

-- 1. Index pour la table 'wastes' (Lots de déchets)
CREATE INDEX IF NOT EXISTS idx_wastes_seller_id ON public.wastes(seller_id);
CREATE INDEX IF NOT EXISTS idx_wastes_collector_id ON public.wastes(collector_id);
CREATE INDEX IF NOT EXISTS idx_wastes_status ON public.wastes(status);
CREATE INDEX IF NOT EXISTS idx_wastes_created_at ON public.wastes(created_at DESC);

-- 2. Index pour la table 'profiles' (Profils utilisateurs)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city);

-- 3. Index pour la table 'messages' (Chat)
CREATE INDEX IF NOT EXISTS idx_messages_waste_id ON public.messages(waste_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at ASC);

-- 4. Index pour la table 'transactions' (Historique du portefeuille)
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- 5. Index pour la table 'environmental_infractions' (Signalements d'infractions / Police Verte)
-- Note : Utilisation d'un bloc anonyme pour éviter toute erreur si la table n'existe pas encore.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'environmental_infractions') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_env_infractions_status ON public.environmental_infractions(status)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_env_infractions_responsible_org_id ON public.environmental_infractions(responsible_org_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_env_infractions_zone_id ON public.environmental_infractions(zone_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_env_infractions_created_at ON public.environmental_infractions(created_at DESC)';
    END IF;
END $$;

-- 6. Index pour la table 'household_subscriptions' et 'subscriptions' (Abonnements)
CREATE INDEX IF NOT EXISTS idx_household_subs_profile_id ON public.household_subscriptions(profile_id);
CREATE INDEX IF NOT EXISTS idx_household_subs_plan_id ON public.household_subscriptions(plan_id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_subs_user_id ON public.subscriptions(user_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_subs_plan_id ON public.subscriptions(plan_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_subs_status ON public.subscriptions(status)';
    END IF;
END $$;

-- 7. Index pour la table 'concessions' (Zones concédées aux organisations)
CREATE INDEX IF NOT EXISTS idx_concessions_organization_id ON public.concessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_concessions_status ON public.concessions(status);

-- 8. Index pour la table 'zones' (Périmètres / Communes)
CREATE INDEX IF NOT EXISTS idx_zones_organization_id ON public.zones(organization_id);

-- 9. Correctif de relation de clé étrangère pour la table 'tenders' (Appels d'Offres)
-- Rétablit le lien manquant avec la table 'zones' pour permettre les jointures PostgREST
ALTER TABLE public.tenders DROP CONSTRAINT IF EXISTS fk_tenders_zones;
ALTER TABLE public.tenders DROP CONSTRAINT IF EXISTS tenders_zone_id_fkey;

ALTER TABLE public.tenders 
ADD CONSTRAINT fk_tenders_zones 
FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE CASCADE;

-- =========================================================================
-- FIN DU SCRIPT D'OPTIMISATION
-- =========================================================================

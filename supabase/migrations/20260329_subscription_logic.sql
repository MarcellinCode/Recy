-- 🎫 Migration pour la logique des Abonnements RecyCla
-- Date: 2026-03-29

-- 1. Ajout des quotas pour les collecteurs sur la table profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reservation_count INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_reservation_reset TIMESTAMPTZ DEFAULT now();

-- 2. Création de la table des abonnements plateforme
CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier IN ('organisation_standard', 'mairie_elite', 'collector_premium')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'canceled')),
    price_paid NUMERIC NOT NULL,
    start_date TIMESTAMPTZ DEFAULT now(),
    end_date TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.platform_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own platform subscriptions" ON public.platform_subscriptions
FOR SELECT USING (auth.uid() = profile_id);

-- 3. Harmonisation de la table concessions (organisation_id vs organization_id)
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'concessions' AND column_name = 'organisation_id'
    ) THEN
        ALTER TABLE public.concessions RENAME COLUMN organisation_id TO organization_id;
    END IF;
END $$;

-- 4. Initialisation des plans d'abonnements par défaut pour les zones (2k, 6k, 15k)
-- Cette partie sera gérée via l'interface mais on s'assure que la table supporte ces prix.
ALTER TABLE public.subscription_plans ALTER COLUMN price_cfa TYPE NUMERIC;

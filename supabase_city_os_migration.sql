-- 🏙️ WaveClean City OS: Schema Migration
-- Ce script implémente la couche municipale, les concessions et les abonnements.

-- 1. Mise à jour des rôles et colonnes de métadonnées dans les profils
-- On part du principe que la colonne 'role' est un TEXT ou un ENUM.
-- On ajoute les nouveaux rôles : 'mairie', 'organisation_admin', 'agent_collecteur'.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rccm TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS agent_count TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS official_department TEXT;

DO $$ 
BEGIN 
    -- Si c'est un check constraint sur du texte
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('vendeur', 'collecteur', 'entreprise', 'mairie', 'organisation_admin', 'agent_collecteur'));
EXCEPTION 
    WHEN others THEN NULL;
END $$;

-- 2. Table des Zones (Définies par la Mairie)
CREATE TABLE IF NOT EXISTS public.zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    boundaries JSONB, -- GeoJSON ou liste de coordonnées
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'rented', 'maintenance')),
    city TEXT DEFAULT 'Abidjan',
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) -- L'admin mairie qui a créé la zone
);

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- 10. Recréation du trigger pour s'assurer qu'il utilise la nouvelle fonction
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Table des Concessions (Locations de zones par les Organisations)
CREATE TABLE IF NOT EXISTS public.concessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES public.zones(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    rent_start TIMESTAMPTZ DEFAULT now(),
    rent_end TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.concessions ENABLE ROW LEVEL SECURITY;

-- 4. Table des Plans d'Abonnement (Définis par les Organisations pour leurs zones)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    role, 
    phone, 
    district, 
    vehicle_type, 
    id_number, 
    rccm, 
    contact_person,
    agent_count,
    official_department
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'role',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'district',
    new.raw_user_meta_data->>'vehicle_type',
    new.raw_user_meta_data->>'id_number',
    new.raw_user_meta_data->>'rccm',
    new.raw_user_meta_data->>'contact_person',
    new.raw_user_meta_data->>'agent_count',
    new.raw_user_meta_data->>'official_department'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concession_id UUID REFERENCES public.concessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- ex: "Standard Hebdomadaire"
    description TEXT,
    price_cfa NUMERIC NOT NULL,
    frequency_per_week INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- 5. Table des Abonnements des Foyers
CREATE TABLE IF NOT EXISTS public.household_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'pending_payment')),
    start_date TIMESTAMPTZ DEFAULT now(),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(profile_id) -- Un foyer n'a qu'un abonnement actif à la fois
);

ALTER TABLE public.household_subscriptions ENABLE ROW LEVEL SECURITY;

-- 6. Ajout de la Zone au profil Citoyen
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.zones(id);

-- 7. POLITIQUES RLS (Row Level Security)

-- Zones
DROP POLICY IF EXISTS "Zones are viewable by everyone" ON public.zones;
CREATE POLICY "Zones are viewable by everyone" ON public.zones FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only Mairies can create zones" ON public.zones;
CREATE POLICY "Only Mairies can create zones" ON public.zones FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'mairie')
);

-- Concessions
DROP POLICY IF EXISTS "Concessions are viewable by everyone" ON public.concessions;
CREATE POLICY "Concessions are viewable by everyone" ON public.concessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Organizations can request concessions" ON public.concessions;
CREATE POLICY "Organizations can request concessions" ON public.concessions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'organisation_admin')
);

DROP POLICY IF EXISTS "Only Mairies can update concessions" ON public.concessions;
CREATE POLICY "Only Mairies can update concessions" ON public.concessions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'mairie')
);

-- Subscription Plans
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.subscription_plans;
CREATE POLICY "Plans are viewable by everyone" ON public.subscription_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Organizations can manage their plans" ON public.subscription_plans;
CREATE POLICY "Organizations can manage their plans" ON public.subscription_plans 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.concessions c 
        WHERE c.id = concession_id AND c.organization_id = auth.uid()
    )
);

-- Household Subscriptions
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.household_subscriptions;
CREATE POLICY "Users can view their own subscription" ON public.household_subscriptions 
FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can subscribe" ON public.household_subscriptions;
CREATE POLICY "Users can subscribe" ON public.household_subscriptions 
FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Organizations can view subscriptions in their plans" ON public.household_subscriptions;
CREATE POLICY "Organizations can view subscriptions in their plans" ON public.household_subscriptions 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.subscription_plans sp
        JOIN public.concessions c ON sp.concession_id = c.id
        WHERE sp.id = plan_id AND c.organization_id = auth.uid()
    )
);

-- 8. Mise à jour de la table Wastes pour le support des missions
ALTER TABLE public.wastes ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT false;
ALTER TABLE public.wastes ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.wastes ADD COLUMN IF NOT EXISTS mission_type TEXT CHECK (mission_type IN ('marketplace', 'subscription_pickup'));

-- =============================================
-- MIGRATION CITICLINE — Ajout des rôles manquants
-- et tables pour subscriptions et concessions
-- =============================================

-- 1. Mettre à jour le CHECK sur profiles.role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (
  role IN ('vendeur', 'collecteur', 'entreprise', 'mairie', 'organisation_admin', 'agent_collecteur')
);

-- 2. Table CONCESSIONS (Zones gérées par Organisation)
CREATE TABLE IF NOT EXISTS concessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL,
  city TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired')),
  contract_start DATE,
  contract_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table SUBSCRIPTION_PLANS (Plans proposés par une Organisation)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  concession_id UUID REFERENCES concessions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  pickup_days TEXT[] DEFAULT '{}',
  pickup_time TEXT DEFAULT '08h00 - 10h00',
  max_capacity_kg DECIMAL(10,2) DEFAULT 50.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table SUBSCRIPTIONS (Abonnements des citoyens)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  zone_name TEXT,                              -- Copie dénormalisée pour accès rapide
  company_name TEXT,                           -- Nom de l'organisation gestionnaire
  pickup_days TEXT[] DEFAULT '{}',
  pickup_time TEXT DEFAULT '08h00 - 10h00',
  tier TEXT DEFAULT 'standard' CHECK (tier IN ('standard', 'pro', 'business')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  price DECIMAL(12,2),
  next_billing_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table HOUSEHOLD_SUBSCRIPTIONS (alias pour rétro-compatibilité)
CREATE TABLE IF NOT EXISTS household_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable RLS
ALTER TABLE concessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_subscriptions ENABLE ROW LEVEL SECURITY;

-- 7. Policies
CREATE POLICY "Concessions are viewable by everyone" ON concessions FOR SELECT USING (true);
CREATE POLICY "Organisations can manage concessions" ON concessions FOR ALL USING (auth.uid() = organisation_id);

CREATE POLICY "Plans are viewable by everyone" ON subscription_plans FOR SELECT USING (true);
CREATE POLICY "Organisations can manage plans" ON subscription_plans FOR ALL USING (
  auth.uid() = organisation_id
);

CREATE POLICY "Users can view their own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscriptions" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own household subscriptions" ON household_subscriptions FOR SELECT USING (auth.uid() = user_id);

-- 8. Trigger auto-profile : accepter tous les rôles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE(new.raw_user_meta_data->>'role', 'vendeur')
  )
  ON CONFLICT (id) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

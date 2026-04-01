-- =============================================
-- STABILIZATION FINAL V7 — ADMIN & WEB SYNC
-- =============================================

-- 1. MISE À JOUR DE LA TABLE PROFILES (Colonnes Manquantes)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS official_department TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Actif',
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS email TEXT; -- Optionnel mais utile pour l'admin

-- 2. RELAXATION DES CONTRAINTES (Souveraineté Institutionnelle)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (
  role IN (
    'vendeur', 
    'collecteur', 
    'entreprise', 
    'mairie', 
    'organisation_admin', 
    'agent_collecteur', 
    'super_admin'
  )
);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_tier_check CHECK (
  subscription_tier IN (
    'starter', 'pro', 'business', 
    'mairie', 'mairie_elite', 
    'organisation', 'collector_premium',
    'citizen'
  )
);

-- 3. MISE À JOUR DU TRIGGER AUTO-PROFILE (Indifférent à la structure)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    role, 
    city, 
    subscription_tier, 
    phone, 
    official_department
  )
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Utilisateur RecyCla'), 
    COALESCE(new.raw_user_meta_data->>'role', 'vendeur'),
    new.raw_user_meta_data->>'city',
    COALESCE(new.raw_user_meta_data->>'subscription_tier', 'starter'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'official_department'
  )
  ON CONFLICT (id) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    subscription_tier = EXCLUDED.subscription_tier,
    phone = EXCLUDED.phone,
    official_department = EXCLUDED.official_department;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FIX SPELLING (Consolidation Finale)
IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='concessions' AND column_name='organisation_id') THEN
    ALTER TABLE public.concessions RENAME COLUMN organisation_id TO organization_id;
END IF;

IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_plans' AND column_name='organisation_id') THEN
    ALTER TABLE public.subscription_plans RENAME COLUMN organisation_id TO organization_id;
END IF;

-- =============================================
-- FIN DU SCRIPT — EXÉCUTER DANS LE SQL EDITOR
-- =============================================

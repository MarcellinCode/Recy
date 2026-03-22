-- 🚐 1. GESTION DE LA FLOTTE (VEHICULES)
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- ex: "Tricycle Zone Sud 01"
    type TEXT CHECK (type IN ('tricycle', 'truck', 'van')),
    registration_number TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_maintenance', 'out_of_service')),
    last_maintenance_date TIMESTAMPTZ,
    next_maintenance_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Seuls les admins d'organisation, la mairie (en mode supervision) ou les super_admins peuvent voir/modifier
DROP POLICY IF EXISTS "Organisations can view their vehicles" ON public.vehicles;
CREATE POLICY "Organisations can view their vehicles" ON public.vehicles 
FOR SELECT USING (
    organization_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('mairie', 'super_admin'))
);

DROP POLICY IF EXISTS "Organisations can manage their vehicles" ON public.vehicles;
CREATE POLICY "Organisations can manage their vehicles" ON public.vehicles 
FOR ALL USING (organization_id = auth.uid());


-- 🛠️ 2. CARNET D'ENTRETIEN (MAINTENANCE LOGS)
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    maintenance_type TEXT CHECK (maintenance_type IN ('oil_change', 'repair', 'fuel', 'inspection')),
    description TEXT,
    cost_cfa NUMERIC DEFAULT 0,
    performed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organisations can view their maintenance" ON public.maintenance_logs;
CREATE POLICY "Organisations can view their maintenance" ON public.maintenance_logs 
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.vehicles WHERE id = vehicle_id AND organization_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('mairie', 'super_admin'))
);

DROP POLICY IF EXISTS "Organisations can manage their maintenance" ON public.maintenance_logs;
CREATE POLICY "Organisations can manage their maintenance" ON public.maintenance_logs 
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.vehicles WHERE id = vehicle_id AND organization_id = auth.uid())
);


-- 📍 3. TRACKING GPS (POSITIONS)
CREATE TABLE IF NOT EXISTS public.tracking_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tracking_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents can insert their own tracking" ON public.tracking_logs;
CREATE POLICY "Agents can insert their own tracking" ON public.tracking_logs 
FOR INSERT WITH CHECK (auth.uid() = agent_id);

DROP POLICY IF EXISTS "Supervisors can view tracking" ON public.tracking_logs;
CREATE POLICY "Supervisors can view tracking" ON public.tracking_logs 
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organisation_admin', 'mairie', 'super_admin'))
);


-- 💌 4. INVITATIONS SYSTEME (SUPER ADMIN -> MAIRIE)
CREATE TABLE IF NOT EXISTS public.system_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    role TEXT NOT NULL CHECK (role = 'mairie'),
    target_email TEXT, -- Optionnel, pour qui est l'invitation
    is_used BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.profiles(id),
    used_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT now() + interval '7 days'
);

ALTER TABLE public.system_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admins can manage invitations" ON public.system_invitations;
CREATE POLICY "Super Admins can manage invitations" ON public.system_invitations 
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 💳 5. AJOUT DE REFERENCE A LA TABLE TRANSACTIONS
-- (Le wallet existe déjà dans `profiles.wallet_balance`)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reference_id UUID;

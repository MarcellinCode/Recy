-- CleanZone B2B Infrastructure Upgrade
-- Target: Extend profiles to support organization hierarchy and agent siloing

-- 1. Update roles constraint to include organization_admin and agent_collecteur
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('vendeur', 'collecteur', 'entreprise', 'mairie', 'admin', 'organisation_admin', 'agent_collecteur'));

-- 2. Add organization_id to link agents/staff to their respective company
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Create index for performance on filtering by organization
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON public.profiles(organization_id);

-- Note: In a production environment, you might want more granular RLS for staff management

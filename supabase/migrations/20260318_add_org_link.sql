-- 🏢 Liaison des Agents aux Entreprises
-- Ce script ajoute la colonne organization_id pour permettre aux entreprises de gérer leurs agents.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.profiles(id);

-- Mise à jour du rôle check pour inclure explicitement 'entreprise' s'il manque
DO $$ 
BEGIN 
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('vendeur', 'collecteur', 'entreprise', 'mairie', 'organisation_admin', 'agent_collecteur'));
EXCEPTION 
    WHEN others THEN NULL;
END $$;

COMMENT ON COLUMN public.profiles.organization_id IS 'ID de l''entreprise ou organisation à laquelle appartient cet agent.';

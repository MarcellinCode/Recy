-- 🔄 SYNCHRONISATION FINALE DES RÔLES
-- Ce script unifie la contrainte de rôles pour inclure TOUS les rôles utilisés dans l'application.
-- Il résout le conflit entre stabilization_final_v7 (super_admin) et 20260421 (agent_police_verte).

DO $$ 
BEGIN 
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN (
        'vendeur', 
        'collecteur', 
        'entreprise', 
        'mairie', 
        'organisation_admin', 
        'agent_collecteur', 
        'agent_police_verte',
        'super_admin'
    ));
EXCEPTION 
    WHEN others THEN NULL;
END $$;

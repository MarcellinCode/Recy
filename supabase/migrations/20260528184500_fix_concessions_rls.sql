-- =========================================================================
-- MIGRATION SÉCURITÉ & SCHÉMA — CORRECTIF RLS CONCESSIONS & RELATION AGENTS
-- =========================================================================

-- 1. Résolution du blocage RLS sur la table 'concessions' pour la Mairie
-- Permet aux utilisateurs ayant les rôles 'mairie' et 'super_admin' de gérer pleinement les concessions (Attribution/Révocation)
DROP POLICY IF EXISTS "Mairie and Super Admin can manage all concessions" ON public.concessions;
CREATE POLICY "Mairie and Super Admin can manage all concessions" 
ON public.concessions FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('mairie', 'super_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('mairie', 'super_admin')
    )
);

-- 2. Restauration de l'intégrité du rôle 'agent_police_verte' dans la contrainte des profils
-- La migration finale v7 avait accidentellement écrasé cette contrainte en oubliant ce rôle, empêchant le recrutement d'agents.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (
  role IN (
    'vendeur', 
    'collecteur', 
    'entreprise', 
    'mairie', 
    'organisation_admin', 
    'agent_collecteur', 
    'agent_police_verte',
    'super_admin'
  )
);

-- 3. Ajout de la contrainte physique de clé étrangère manquante sur 'profiles.zone_id'
-- Assure l'intégrité référentielle des données des agents sur leur zone de patrouille assignée.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS fk_profiles_zones;
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_zones 
FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE SET NULL;

-- =========================================================================
-- FIN DU SCRIPT — EXÉCUTER DANS LE SQL EDITOR DE SUPABASE
-- =========================================================================

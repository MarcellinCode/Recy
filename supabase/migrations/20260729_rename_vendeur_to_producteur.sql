-- 1. Supprimer l'ancienne contrainte CHECK en premier pour autoriser temporairement le nouveau rôle 'producteur'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Migration des utilisateurs existants ('vendeur' et 'entreprise') vers 'producteur'
UPDATE public.profiles 
SET role = 'producteur' 
WHERE role IN ('vendeur', 'entreprise');

-- 3. Recréer la nouvelle contrainte CHECK avec les rôles mis à jour
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('producteur', 'collecteur', 'mairie', 'organisation_admin', 'agent_collecteur', 'agent_police_verte', 'super_admin'));

-- 3. Mise à jour de la politique d'insertion RLS sur la table 'wastes'
DROP POLICY IF EXISTS "Sellers can insert wastes" ON public.wastes;
DROP POLICY IF EXISTS "Only organizations can insert wastes" ON public.wastes;

CREATE POLICY "Only organizations can insert wastes" ON public.wastes
  FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id 
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) IN ('organisation_admin', 'super_admin')
  );

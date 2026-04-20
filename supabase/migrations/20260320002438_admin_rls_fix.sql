-- 🛡️ CORRECTIF RLS : ACCÈS SUPER ADMIN
-- Ce script autorise le Super Admin à gérer les utilisateurs et organisations.

-- 1. Activer RLS sur la table profiles (au cas où)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Politique de LECTURE globale pour les Super Admins
DROP POLICY IF EXISTS "Super Admins can view all profiles" ON public.profiles;
CREATE POLICY "Super Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  auth.jwt() ->> 'role' = 'super_admin' 
  OR 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- 3. Politique de MISE À JOUR pour les Super Admins (Ban, Roles, etc.)
DROP POLICY IF EXISTS "Super Admins can update all profiles" ON public.profiles;
CREATE POLICY "Super Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (
  auth.jwt() ->> 'role' = 'super_admin' 
  OR 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- 4. Politique de SUPPRESSION pour les Super Admins
DROP POLICY IF EXISTS "Super Admins can delete profiles" ON public.profiles;
CREATE POLICY "Super Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (
  auth.jwt() ->> 'role' = 'super_admin' 
  OR 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- NOTE : Si vous utilisez les "Custom Claims" de Supabase pour les rôles, 
-- la partie auth.jwt() ->> 'role' est la plus efficace.
-- Sinon, la sous-requête sur public.profiles servira de fallback.

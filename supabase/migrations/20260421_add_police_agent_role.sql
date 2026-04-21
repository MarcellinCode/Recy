-- 👮‍♂️ EXTENSION ROLE : AGENT DE POLICE VERTE
-- Permet à la Mairie de recruter des agents officiels pour la surveillance territoriale.

DO $$ 
BEGIN 
    -- Mise à jour de la contrainte des rôles pour inclure l'agent de police verte
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('vendeur', 'collecteur', 'entreprise', 'mairie', 'organisation_admin', 'agent_collecteur', 'agent_police_verte'));
EXCEPTION 
    WHEN others THEN NULL;
END $$;

-- Politique RLS pour permettre aux agents de voir les infractions
DROP POLICY IF EXISTS "Agents can view all infractions" ON public.environmental_infractions;
CREATE POLICY "Agents can view all infractions" 
ON public.environmental_infractions FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'agent_police_verte' OR role = 'mairie')
    )
);

-- Permettre aux agents d'insérer des rapports
DROP POLICY IF EXISTS "Agents can insert infractions" ON public.environmental_infractions;
CREATE POLICY "Agents can insert infractions" 
ON public.environmental_infractions FOR INSERT 
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'agent_police_verte')
);

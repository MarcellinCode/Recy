-- Mission Control Agents & Flotte Active Migration
-- Ce script ajoute les attributs manquants aux agents et crée la fonctionnalité de positions en temps réels.

-- 1. Ajout des colonnes essentielles au profil de base (si absentes)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS app_pin TEXT,  -- Utilisé pour simuler la connexion depuis l'App Agent Terrain
ADD COLUMN IF NOT EXISTS assigned_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;

-- 2. Création ou Mise à jour de la table agent_live_positions
-- Ceci résout également l'Erreur 400 (Bad Request) sur le MapComponent causée par les relations brisées
CREATE TABLE IF NOT EXISTS public.agent_live_positions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'en_mouvement'
);

-- Création des index pour accélérer le chargement du MapComponent
CREATE INDEX IF NOT EXISTS idx_live_pos_agent ON public.agent_live_positions(agent_id);
CREATE INDEX IF NOT EXISTS idx_live_pos_org ON public.agent_live_positions(organization_id);

-- 3. Sécurité (RLS) pour le suivi de Flotte
ALTER TABLE public.agent_live_positions ENABLE ROW LEVEL SECURITY;

-- Autorise une organisation à lire les positions uniquement de ses propres effectifs
DROP POLICY IF EXISTS "Les Org peuvent voir leurs propres positions" ON public.agent_live_positions;
CREATE POLICY "Les Org peuvent voir leurs propres positions" 
    ON public.agent_live_positions FOR SELECT USING (
        organization_id = auth.uid()
    );

-- Autorise les agents à envoyer leurs positions à l'application web
DROP POLICY IF EXISTS "Les agents peuvent mettre à jour leur position" ON public.agent_live_positions;
CREATE POLICY "Les agents peuvent mettre à jour leur position" 
    ON public.agent_live_positions FOR INSERT WITH CHECK (
        agent_id = auth.uid() OR auth.role() = 'service_role' OR auth.role() = 'anon'
    );

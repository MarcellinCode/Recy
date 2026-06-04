-- =============================================
-- STABILIZATION FINAL V3 — CleanZone SYNC
-- =============================================

-- 1. Table SIGNALEMENTS URGENTS (Police Verte)
CREATE TABLE IF NOT EXISTS public.emergency_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    photo_url TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'resolved', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table ZONES (Unités territoriales pour les concessions)
CREATE TABLE IF NOT EXISTS public.zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sécurité (RLS)
ALTER TABLE public.emergency_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- Politiques Emergency Reports
CREATE POLICY "Les citoyens peuvent envoyer des signalements" 
ON public.emergency_reports FOR INSERT 
WITH CHECK (auth.uid() = reporter_id OR auth.role() = 'anon');

CREATE POLICY "Les signalements sont visibles par la mairie et l'auteur" 
ON public.emergency_reports FOR SELECT 
USING (auth.uid() = reporter_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organisation_admin', 'super_admin')
));

-- Politiques Zones
CREATE POLICY "Zones consultables par tous" ON public.zones FOR SELECT USING (true);
CREATE POLICY "Les org peuvent gérer leurs zones" ON public.zones FOR ALL USING (auth.uid() = organization_id);

-- 4. FIX FINAL : POLITIQUES TRANSACTIONS (Wallet)
-- Autorise l'insertion pour le top-up
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
CREATE POLICY "Users can insert their own transactions" 
ON public.transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.uid() = profile_id);

-- Autorise la lecture
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" 
ON public.transactions FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = profile_id);

-- 5. FIX FINAL : POLITIQUES PROFILS (Balance Update)
DROP POLICY IF EXISTS "Users can update own balance" ON public.profiles;
CREATE POLICY "Users can update own balance" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- =============================================
-- SCRIPT TERMINÉ — EXÉCUTER DANS LE SQL EDITOR
-- =============================================

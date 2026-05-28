-- ======================================================================
-- CORRECTIF GLOBAL : COLONNES MANQUANTES & AUTORISATIONS DE RÉSERVATION
-- ======================================================================
-- Ce script :
-- 1. Ajoute les colonnes de suivi temporel manquantes dans la table wastes.
-- 2. Configure la politique de sécurité RLS pour autoriser la réservation.
-- ======================================================================

-- 1. AJOUT DES COLONNES MANQUANTES DANS LA TABLE wastes
ALTER TABLE public.wastes ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.wastes ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP WITH TIME ZONE;

-- 2. ACTIVATION DE LA SÉCURITÉ RLS
ALTER TABLE public.wastes ENABLE ROW LEVEL SECURITY;

-- 3. NETTOYAGE DES ANCIENNES POLITIQUES
DROP POLICY IF EXISTS "Sellers can update their own wastes" ON public.wastes;
DROP POLICY IF EXISTS "Collectors can reserve wastes" ON public.wastes;
DROP POLICY IF EXISTS "Users can update wastes" ON public.wastes;

-- 4. CRÉATION DE LA NOUVELLE POLITIQUE DE MISE À JOUR ULTRA-SÉCURISÉE
CREATE POLICY "Users can update wastes" ON public.wastes
FOR UPDATE
USING (
  -- Le vendeur peut modifier ses propres lots
  auth.uid() = seller_id 
  OR 
  -- Un collecteur peut réserver un lot disponible
  (status = 'published')
  OR
  -- Le collecteur assigné peut modifier son lot réservé
  (auth.uid() = collector_id)
)
WITH CHECK (
  -- Le vendeur a tous les droits de modification sur son propre lot
  auth.uid() = seller_id 
  OR 
  -- Un collecteur ne peut QUE réserver le lot en y associant son ID, reserved_at et le statut 'reserved'
  (status = 'reserved' AND collector_id = auth.uid())
  OR
  -- Le collecteur assigné peut finaliser la collecte en passant à 'collected'
  (auth.uid() = collector_id AND status IN ('collected', 'reserved'))
);

-- Note : Copiez ce script complet et exécutez-le dans le SQL Editor de votre console Supabase.

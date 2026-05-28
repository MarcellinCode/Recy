-- ======================================================================
-- CORRECTIF RLS : AUTORISER LA RÉSERVATION ET LA MISE À JOUR DES DÉCHETS
-- ======================================================================
-- Ce script ajoute les politiques RLS "FOR UPDATE" nécessaires sur la table 
-- "wastes" pour permettre aux collecteurs de réserver un lot, et aux 
-- vendeurs/collecteurs de modifier leurs lots respectifs.
-- ======================================================================

-- 1. S'assurer que RLS est bien activé sur la table wastes
ALTER TABLE public.wastes ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques d'update pour repartir sur une base propre
DROP POLICY IF EXISTS "Sellers can update their own wastes" ON public.wastes;
DROP POLICY IF EXISTS "Collectors can reserve wastes" ON public.wastes;
DROP POLICY IF EXISTS "Users can update wastes" ON public.wastes;

-- 3. Créer la politique globale de mise à jour sécurisée
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
  -- Un collecteur ne peut QUE réserver le lot en y associant son ID et le statut 'reserved'
  (status = 'reserved' AND collector_id = auth.uid())
  OR
  -- Le collecteur assigné peut finaliser la collecte en passant à 'collected'
  (auth.uid() = collector_id AND status IN ('collected', 'reserved'))
);

-- Note : Ce script doit être exécuté dans l'éditeur SQL de votre console Supabase.

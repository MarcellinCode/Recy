-- 1. Table des réservations de marketplace
CREATE TABLE IF NOT EXISTS public.marketplace_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waste_id UUID REFERENCES public.wastes(id) ON DELETE CASCADE,
  collecteur_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(waste_id, status)
);
ALTER TABLE public.marketplace_reservations ENABLE ROW LEVEL SECURITY;

-- 2. Fonction RPC de réservation avec verrouillage transactionnel FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION public.reserve_waste(
  p_waste_id UUID,
  p_collecteur_id UUID
) RETURNS public.wastes
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_waste public.wastes;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_collecteur_id THEN
    RAISE EXCEPTION 'Non autorisé' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_collecteur_id AND role IN ('collecteur', 'agent_collecteur')
  ) THEN
    RAISE EXCEPTION 'ROLE_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;

  -- Verrouillage de la ligne pour éviter la concurrence
  SELECT * INTO v_waste
  FROM public.wastes
  WHERE id = p_waste_id
  FOR UPDATE SKIP LOCKED;

  IF v_waste.id IS NULL THEN
    RAISE EXCEPTION 'WASTE_UNAVAILABLE' USING ERRCODE = 'P0002';
  END IF;

  IF v_waste.status <> 'published' THEN
    RAISE EXCEPTION 'WASTE_ALREADY_RESERVED' USING ERRCODE = 'P0001';
  END IF;

  -- Mise à jour du statut du lot
  UPDATE public.wastes
  SET status = 'reserved', collector_id = p_collecteur_id
  WHERE id = p_waste_id
  RETURNING * INTO v_waste;

  -- Création de l'enregistrement de réservation
  INSERT INTO public.marketplace_reservations (waste_id, collecteur_id, status)
  VALUES (p_waste_id, p_collecteur_id, 'active');

  RETURN v_waste;
END;
$$;

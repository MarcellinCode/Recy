-- MIGRATION : AJOUT CHAMP LOCALITÉ MANUELLE POUR LES SIGNALEMENTS
ALTER TABLE public.environmental_infractions 
ADD COLUMN IF NOT EXISTS manual_address TEXT;

COMMENT ON COLUMN public.environmental_infractions.manual_address IS 'Précision manuelle du lieu fournie par l''utilisateur (ex: Point de repère)';

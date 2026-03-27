-- Migration: Add detailed maintenance and insurance fields to vehicles
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS current_mileage NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_oil_change_mileage NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS oil_change_interval NUMERIC DEFAULT 5000,
ADD COLUMN IF NOT EXISTS insurance_expiry_date TIMESTAMPTZ;

-- Update RLS if necessary (existing policies should cover these new columns)
COMMENT ON COLUMN public.vehicles.current_mileage IS 'Kilométrage actuel du véhicule';
COMMENT ON COLUMN public.vehicles.insurance_expiry_date IS 'Date d''expiration de l''assurance';

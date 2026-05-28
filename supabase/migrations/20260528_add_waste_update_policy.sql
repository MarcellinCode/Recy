-- Migration: Add missing temporal columns and update RLS policies for wastes
-- Created on 2026-05-28

-- 1. Add missing temporal columns
ALTER TABLE public.wastes ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.wastes ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP WITH TIME ZONE;

-- 2. Configure RLS update policy
ALTER TABLE public.wastes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update wastes" ON public.wastes;

CREATE POLICY "Users can update wastes" ON public.wastes
FOR UPDATE
USING (
  auth.uid() = seller_id 
  OR 
  (status = 'published')
  OR
  (auth.uid() = collector_id)
)
WITH CHECK (
  auth.uid() = seller_id 
  OR 
  (status = 'reserved' AND collector_id = auth.uid())
  OR
  (auth.uid() = collector_id AND status IN ('collected', 'reserved'))
);

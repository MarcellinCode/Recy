-- 💳 Amélioration du suivi des transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Succeeded' CHECK (status IN ('Pending', 'Succeeded', 'Failed', 'Cancelled'));

-- Ajout d'une colonne pour le montant de la commission plateforme (optionnel mais utile)
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(12,2) DEFAULT 0.00;

-- Mise à jour des politiques RLS pour permettre à l'admin de tout voir
DROP POLICY IF EXISTS "Admins can see all transactions" ON public.transactions;
CREATE POLICY "Admins can see all transactions" ON public.transactions 
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

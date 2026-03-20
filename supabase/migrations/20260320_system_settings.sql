-- ⚙️ WaveClean System Settings
-- Cette table stocke les paramètres globaux de la plateforme.

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertion des réglages par défaut
INSERT INTO public.system_settings (key, value, description) VALUES
('min_withdrawal_threshold', '5000', 'Seuil minimum pour une demande de retrait en FCFA'),
('platform_commission', '5', 'Pourcentage de commission prélevé sur les transactions (%)'),
('maintenance_mode', 'false', 'Désactive l''accès utilisateur en cas de maintenance')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System settings viewable by everyone" ON public.system_settings;
CREATE POLICY "System settings viewable by everyone" ON public.system_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only Super Admins can update settings" ON public.system_settings;
CREATE POLICY "Only Super Admins can update settings" ON public.system_settings 
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- ⚖️ TABLE SANCTIONS (Gouvernance City OS)
-- Permet de garder un historique des pénalités infligées aux organisations.

CREATE TABLE IF NOT EXISTS public.sanctions (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID REFERENCES public.profiles(id) NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    penalty_amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activation de la RLS
ALTER TABLE public.sanctions ENABLE ROW LEVEL SECURITY;

-- Les membres de la Mairie et Super Admin peuvent tout voir
CREATE POLICY "Mairie can view all sanctions" 
ON public.sanctions FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'mairie' OR role = 'super_admin')
    )
);

-- Les organisations peuvent voir leurs propres sanctions
CREATE POLICY "Orgs can view their own sanctions" 
ON public.sanctions FOR SELECT 
USING (organization_id = auth.uid());

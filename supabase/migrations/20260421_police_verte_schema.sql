-- 👮‍♂️ MODULE POLICE VERTE (Gouvernance Environnementale)
-- Ce script gère les infractions de terrain et le radar des points noirs.

CREATE TABLE IF NOT EXISTS public.environmental_infractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES public.profiles(id) NOT NULL,
    zone_id UUID REFERENCES public.zones(id),
    responsible_org_id UUID REFERENCES public.profiles(id), -- L'entreprise responsable de la zone
    type TEXT NOT NULL, -- Dépôt sauvage, Débordement Bac, Brûlage, Liquide toxique
    description TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status TEXT CHECK (status IN ('open', 'investigating', 'resolved', 'sanctioned')) DEFAULT 'open',
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    images TEXT[] DEFAULT '{}',
    is_aida_analyzed BOOLEAN DEFAULT false,
    aida_evaluation JSONB, -- Stocke l'analyse IA (composition du déchet, risque sanitaire)
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- Activation de la RLS
ALTER TABLE public.environmental_infractions ENABLE ROW LEVEL SECURITY;

-- Les membres de la Mairie et Super Admin peuvent tout voir
CREATE POLICY "Mairie can view all infractions" 
ON public.environmental_infractions FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'mairie' OR role = 'super_admin')
    )
);

-- Les organisations peuvent voir les infractions dans leurs zones respectives
CREATE POLICY "Organizations can view infractions in their zones" 
ON public.environmental_infractions FOR SELECT 
USING (
    responsible_org_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.concessions c 
        WHERE c.zone_id = environmental_infractions.zone_id AND c.organization_id = auth.uid()
    )
);

-- Tout utilisateur authentifié peut signaler une infraction
CREATE POLICY "Authenticated users can report infractions" 
ON public.environmental_infractions FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Fonction pour notifier la mairie lors d'une nouvelle infraction
CREATE OR REPLACE FUNCTION public.fn_notify_mairie_on_infraction()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (profile_id, title, content, type)
    SELECT 
        id, 
        '🚨 NOUVEL INCIDENT ENVIRONNEMENTAL', 
        'Une infraction de type ' || NEW.type || ' a été signalée.',
        'system'
    FROM public.profiles 
    WHERE role = 'mairie';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_notify_mairie_infraction
AFTER INSERT ON public.environmental_infractions
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_mairie_on_infraction();

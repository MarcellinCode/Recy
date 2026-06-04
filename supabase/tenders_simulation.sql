-- Tenders & Sovereignty Simulation Schema for CleanZone

-- 1. Appels d'Offres (Tenders)
CREATE TABLE IF NOT EXISTS public.tenders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mairie_id UUID REFERENCES public.profiles(id),
    zone_id UUID REFERENCES public.zones(id),
    title TEXT NOT NULL,
    description TEXT,
    budget_estimate NUMERIC,
    end_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'open', -- 'open', 'awarded', 'closed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Soumissions (Bids)
CREATE TABLE IF NOT EXISTS public.tender_bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID REFERENCES public.tenders(id) ON DELETE CASCADE,
    organisation_id UUID REFERENCES public.profiles(id),
    bid_amount NUMERIC NOT NULL,
    proposal_text TEXT,
    trucks_count INTEGER,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Amendes & Sanctions (Sovereignty - Police Verte)
CREATE TABLE IF NOT EXISTS public.fines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issuer_id UUID REFERENCES public.profiles(id), -- Agent de la mairie
    target_profile_id UUID REFERENCES public.profiles(id), -- Pollueur ou Org
    amount NUMERIC NOT NULL,
    reason TEXT NOT NULL,
    location_text TEXT,
    evidence_url TEXT,
    status TEXT DEFAULT 'unpaid', -- 'unpaid', 'paid'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_tenders_status ON public.tenders(status);
CREATE INDEX IF NOT EXISTS idx_bids_tender ON public.tender_bids(tender_id);
CREATE INDEX IF NOT EXISTS idx_fines_target ON public.fines(target_profile_id);

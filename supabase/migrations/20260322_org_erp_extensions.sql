-- Migration for Organization ERP features: CRM and B2B Marketplace

-- 1. Complaints (CRM Citoyen) Table
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    citizen_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. B2B Marketplace (Wholesale Listings) Table
CREATE TABLE IF NOT EXISTS public.b2b_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    material_type TEXT NOT NULL,
    weight_kg NUMERIC NOT NULL,
    price_per_kg NUMERIC,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for Complaints
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Citizens can view their own complaints" 
ON public.complaints FOR SELECT 
USING (auth.uid() = citizen_id);

CREATE POLICY "Citizens can insert complaints" 
ON public.complaints FOR INSERT 
WITH CHECK (auth.uid() = citizen_id);

CREATE POLICY "Organizations can view complaints assigned to them" 
ON public.complaints FOR SELECT 
USING (auth.uid() = organization_id);

CREATE POLICY "Organizations can update their complaints" 
ON public.complaints FOR UPDATE 
USING (auth.uid() = organization_id);

-- RLS Policies for B2B Listings
ALTER TABLE public.b2b_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can manage their B2B listings" 
ON public.b2b_listings FOR ALL 
USING (auth.uid() = organization_id);

CREATE POLICY "Anyone can view available B2B listings" 
ON public.b2b_listings FOR SELECT 
USING (true);

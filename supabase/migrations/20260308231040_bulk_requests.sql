CREATE TABLE IF NOT EXISTS bulk_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES profiles(id) NOT NULL,
  waste_type_id BIGINT REFERENCES waste_types(id) NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  target_price DECIMAL(12,2),
  deadline DATE NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'fulfilled', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE bulk_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view open bulk requests" ON bulk_requests FOR SELECT USING (status = 'open' OR auth.uid() = company_id);
CREATE POLICY "Companies can insert bulk requests" ON bulk_requests FOR INSERT WITH CHECK (auth.uid() = company_id);
CREATE POLICY "Companies can update their own bulk requests" ON bulk_requests FOR UPDATE USING (auth.uid() = company_id);

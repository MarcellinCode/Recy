-- 1. TABLE PROFILS (Liaison avec Auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT CHECK (role IN ('vendeur', 'collecteur', 'entreprise')),
  city TEXT,
  wallet_balance DECIMAL(12,2) DEFAULT 0.00,
  eco_points INT DEFAULT 0,
  subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'pro', 'business')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLE TYPES DE DECHETS (Prix au kg)
CREATE TABLE waste_types (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price_per_kg DECIMAL(10,2) NOT NULL,
  emoji TEXT
);

INSERT INTO waste_types (name, price_per_kg, emoji) VALUES
('Plastique HDPE', 150.00, '🥤'),
('Aluminium', 400.00, '🥫'),
('Papier / Carton', 50.00, '📦'),
('Verre', 30.00, '🍾'),
('Métal / Feraille', 250.00, '⛓️');

-- 3. TABLE DECHETS (Main Business Logic)
CREATE TABLE wastes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES profiles(id) NOT NULL,
  collector_id UUID REFERENCES profiles(id),
  type_id BIGINT REFERENCES waste_types(id) NOT NULL,
  estimated_weight DECIMAL(10,2) NOT NULL,
  final_weight DECIMAL(10,2),
  status TEXT DEFAULT 'published' CHECK (status IN ('published', 'reserved', 'collected', 'cancelled')),
  location TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLE MESSAGES (Chat)
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  waste_id UUID REFERENCES wastes(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  receiver_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABLE TRANSACTIONS (Wallet History)
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  amount DECIMAL(12,2) NOT NULL,
  type TEXT CHECK (type IN ('income', 'outcome', 'deposit')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABLE NOTIFICATIONS
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('offer', 'payment', 'collection', 'system')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SECURITY: ENABLE RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE wastes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- POLICIES (Profiles)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- POLICIES (Notifications)
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = profile_id);

-- POLICIES (Waste Types & Wastes)
CREATE POLICY "Waste types are viewable by everyone" ON waste_types FOR SELECT USING (true);
CREATE POLICY "Wastes are viewable by everyone" ON wastes FOR SELECT USING (true);
CREATE POLICY "Sellers can insert wastes" ON wastes FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- POLICIES (Messages)
CREATE POLICY "Users can view their own messages" ON messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

CREATE POLICY "Users can insert their own messages" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);

-- TRIGGER POUR CREATION DE PROFIL AUTO (RECOMMANDÉ)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'role');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

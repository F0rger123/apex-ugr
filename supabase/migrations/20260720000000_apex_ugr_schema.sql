-- Enable Required Postgres Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  home_city TEXT DEFAULT 'Los Angeles, CA',
  reputation_level TEXT DEFAULT 'Rookie',
  reputation_points INTEGER DEFAULT 100,
  credits_balance NUMERIC DEFAULT 5000.00,
  favorite_car_type TEXT DEFAULT 'Supercar / Tuner',
  racing_specialties TEXT[] DEFAULT ARRAY['Drag Race', 'Roll Race'],
  stats JSONB DEFAULT '{"races_entered": 0, "races_won": 0, "top_speed_recorded": 0, "meets_hosted": 0}'::jsonb,
  achievements JSONB DEFAULT '[]'::jsonb,
  is_verified BOOLEAN DEFAULT FALSE,
  privacy_mode TEXT DEFAULT 'all',
  visibility_radius_km INTEGER DEFAULT 50,
  avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. VEHICLES TABLE
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  trim TEXT,
  color TEXT NOT NULL,
  nickname TEXT,
  vin TEXT,
  engine TEXT NOT NULL,
  transmission TEXT NOT NULL,
  horsepower INTEGER NOT NULL,
  torque INTEGER NOT NULL,
  weight_lbs INTEGER NOT NULL,
  top_speed_mph INTEGER NOT NULL,
  quarter_mile_sec NUMERIC(4,2),
  zero_to_sixty_sec NUMERIC(4,2),
  drivetrain TEXT NOT NULL CHECK (drivetrain IN ('AWD', 'RWD', 'FWD')),
  fuel_type TEXT NOT NULL DEFAULT 'E85',
  photos TEXT[] DEFAULT ARRAY[]::text[],
  video_url TEXT,
  sound_clip_url TEXT,
  dyno_chart_url TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Vehicles
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vehicles are viewable by everyone" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Users can insert own vehicle" ON public.vehicles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vehicle" ON public.vehicles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own vehicle" ON public.vehicles FOR DELETE USING (auth.uid() = user_id);

-- 3. VEHICLE MODIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.vehicle_modifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  part_name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  installation_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  hp_gain INTEGER DEFAULT 0,
  torque_gain INTEGER DEFAULT 0,
  purchase_source TEXT DEFAULT 'Summit Racing',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Modifications
ALTER TABLE public.vehicle_modifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mods viewable by everyone" ON public.vehicle_modifications FOR SELECT USING (true);
CREATE POLICY "Users manage own vehicle mods" ON public.vehicle_modifications 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.vehicles WHERE id = vehicle_id AND user_id = auth.uid())
  );

-- 4. MARKETPLACE PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.marketplace_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  vendor_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT NOT NULL,
  compatible_makes TEXT[] DEFAULT ARRAY[]::text[],
  compatible_models TEXT[] DEFAULT ARRAY[]::text[],
  rating NUMERIC(3,2) DEFAULT 4.9,
  reviews_count INTEGER DEFAULT 100,
  purchase_url TEXT NOT NULL,
  in_stock BOOLEAN DEFAULT TRUE,
  hp_gain INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Marketplace
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products viewable by everyone" ON public.marketplace_products FOR SELECT USING (true);

-- 5. MARKETPLACE ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.marketplace_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  shipping_status TEXT DEFAULT 'processing' CHECK (shipping_status IN ('processing', 'shipped', 'in_transit', 'delivered')),
  tracking_number TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own orders" ON public.marketplace_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own orders" ON public.marketplace_orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. RACE CHALLENGES TABLE
CREATE TABLE IF NOT EXISTS public.race_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  race_type TEXT NOT NULL CHECK (race_type IN ('Drag Race', 'Roll Race', 'Circuit Race', 'Time Attack', 'Highway Pull', 'Custom')),
  wager_credits NUMERIC(10,2) DEFAULT 0.00,
  start_time TIMESTAMPTZ NOT NULL,
  rules TEXT NOT NULL,
  route_name TEXT NOT NULL,
  distance_miles NUMERIC(5,2) NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'in_progress', 'finished', 'disputed', 'cancelled')),
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.race_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Race challenges viewable by everyone" ON public.race_challenges FOR SELECT USING (true);
CREATE POLICY "Users insert own race challenges" ON public.race_challenges FOR INSERT WITH CHECK (auth.uid() = challenger_id);
CREATE POLICY "Participants update race challenge" ON public.race_challenges FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- 7. RACE DISPUTES TABLE
CREATE TABLE IF NOT EXISTS public.race_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  race_id UUID NOT NULL REFERENCES public.race_challenges(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  video_proof_url TEXT,
  gps_log_data JSONB NOT NULL,
  referee_votes JSONB DEFAULT '{"valid_votes": 0, "invalid_votes": 0}'::jsonb,
  status TEXT DEFAULT 'under_review' CHECK (status IN ('under_review', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.race_disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Disputes viewable by everyone" ON public.race_disputes FOR SELECT USING (true);

-- 8. CAR MEETS TABLE
CREATE TABLE IF NOT EXISTS public.car_meets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  meet_type TEXT NOT NULL CHECK (meet_type IN ('Meet', 'Cruise', 'Show', 'Track Day')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  location_name TEXT NOT NULL,
  max_attendance INTEGER DEFAULT 100,
  vehicle_requirements TEXT DEFAULT 'All Performance Vehicles Welcome',
  rules TEXT NOT NULL,
  cover_image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.car_meets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Car meets viewable by everyone" ON public.car_meets FOR SELECT USING (true);
CREATE POLICY "Hosts insert own car meets" ON public.car_meets FOR INSERT WITH CHECK (auth.uid() = host_id);

-- 9. REELS POSTS TABLE
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL CHECK (post_type IN ('video', 'photo', 'build_update', 'meet_recap')),
  media_url TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  caption TEXT NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::text[],
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  reposts_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users insert own posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 10. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users insert own comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 11. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages viewable by sender" ON public.messages FOR SELECT USING (auth.uid() = sender_id);
CREATE POLICY "Users insert own messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 12. AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'pilot_' || SUBSTRING(new.id::text FROM 1 FOR 6)),
    COALESCE(new.raw_user_meta_data->>'display_name', 'Apex Pilot'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

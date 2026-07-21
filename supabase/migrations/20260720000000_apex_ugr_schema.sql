-- Apex UGR (Apex Underground Racing) Supabase Database Schema Migration
-- Migration Timestamp: 20260720000000

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  home_city TEXT DEFAULT 'Los Angeles, CA',
  reputation_level TEXT DEFAULT 'Rookie' CHECK (reputation_level IN ('Rookie', 'Veteran', 'Drag Specialist', 'Street Specialist', 'Community Favorite', 'Meet Organizer')),
  reputation_points INT DEFAULT 100,
  credits_balance NUMERIC(12,2) DEFAULT 5000.00,
  favorite_car_type TEXT DEFAULT 'JDM / Tuner',
  racing_specialties TEXT[] DEFAULT ARRAY['Drag', 'Roll Racing', 'Time Attack'],
  stats JSONB DEFAULT '{"races_entered": 12, "races_won": 9, "top_speed_recorded": 194, "meets_hosted": 3}'::jsonb,
  achievements JSONB DEFAULT '[{"id": "first_win", "name": "First Victory", "unlocked": true}, {"id": "speed_demon", "name": "180+ MPH Club", "unlocked": true}]'::jsonb,
  is_verified BOOLEAN DEFAULT true,
  privacy_mode TEXT DEFAULT 'all' CHECK (privacy_mode IN ('all', 'friends', 'meet_only', 'invisible')),
  visibility_radius_km INT DEFAULT 50,
  avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Vehicles Table
CREATE TABLE IF NOT EXISTS public.user_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  year INT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  trim TEXT,
  color TEXT NOT NULL,
  nickname TEXT,
  vin TEXT,
  engine TEXT NOT NULL,
  transmission TEXT NOT NULL,
  horsepower INT NOT NULL,
  torque INT NOT NULL,
  weight_lbs INT NOT NULL,
  top_speed_mph INT NOT NULL,
  quarter_mile_sec NUMERIC(4,2),
  zero_to_sixty_sec NUMERIC(3,2),
  drivetrain TEXT NOT NULL CHECK (drivetrain IN ('AWD', 'RWD', 'FWD')),
  fuel_type TEXT DEFAULT 'E85 Flex Fuel',
  photos TEXT[] DEFAULT ARRAY['https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=800&auto=format&fit=crop'],
  video_url TEXT,
  sound_clip_url TEXT,
  dyno_chart_url TEXT,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Vehicle Modifications Table
CREATE TABLE IF NOT EXISTS public.vehicle_modifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID REFERENCES public.user_vehicles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Intake', 'Exhaust', 'Headers', 'Turbo', 'Supercharger', 'Tune', 'Nitrous', 'Suspension', 'Wheels & Tires', 'Brakes', 'Lighting', 'Interior', 'Exterior', 'Electronics')),
  brand TEXT NOT NULL,
  part_name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  installation_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  hp_gain INT DEFAULT 0,
  torque_gain INT DEFAULT 0,
  purchase_source TEXT DEFAULT 'Summit Racing',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Races Table
CREATE TABLE IF NOT EXISTS public.races (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenger_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  opponent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  race_type TEXT NOT NULL CHECK (race_type IN ('Drag Race', 'Roll Race', 'Circuit Race', 'Time Attack', 'Highway Pull', 'Custom')),
  wager_credits NUMERIC(10,2) DEFAULT 500.00,
  start_time TIMESTAMPTZ NOT NULL,
  rules TEXT DEFAULT 'Clean launch, GPS verified telemetry logs required.',
  route_name TEXT DEFAULT 'Pacific Coast Strip #4',
  distance_miles NUMERIC(4,2) DEFAULT 0.25,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'in_progress', 'finished', 'disputed', 'cancelled')),
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Race Disputes Table
CREATE TABLE IF NOT EXISTS public.race_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  race_id UUID REFERENCES public.races(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  video_proof_url TEXT,
  gps_log_data JSONB DEFAULT '{"finish_time_ms": 10420, "max_gps_speed": 142.5}'::jsonb,
  referee_votes JSONB DEFAULT '{"valid_votes": 4, "invalid_votes": 0}'::jsonb,
  status TEXT DEFAULT 'under_review' CHECK (status IN ('under_review', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Marketplace Products Table
CREATE TABLE IF NOT EXISTS public.marketplace_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  vendor_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT NOT NULL,
  compatible_makes TEXT[] DEFAULT ARRAY['Nissan', 'Toyota', 'Ford', 'Chevrolet', 'BMW', 'Porsche'],
  compatible_models TEXT[] DEFAULT ARRAY['GT-R', 'Supra', 'Mustang GT', 'Corvette Z06', 'M4', '911 GT3'],
  rating NUMERIC(2,1) DEFAULT 4.9,
  reviews_count INT DEFAULT 128,
  purchase_url TEXT DEFAULT 'https://www.summitracing.com',
  in_stock BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Marketplace Orders Table
CREATE TABLE IF NOT EXISTS public.marketplace_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  items JSONB NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  shipping_status TEXT DEFAULT 'processing' CHECK (shipping_status IN ('processing', 'shipped', 'in_transit', 'delivered')),
  tracking_number TEXT DEFAULT 'APX-982341902-US',
  shipping_address TEXT DEFAULT '1042 Apex Speedway Blvd, Los Angeles, CA 90015',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Car Meets Table
CREATE TABLE IF NOT EXISTS public.car_meets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  meet_type TEXT DEFAULT 'Meet' CHECK (meet_type IN ('Meet', 'Cruise', 'Show', 'Track Day')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  location_name TEXT NOT NULL,
  max_attendance INT DEFAULT 100,
  vehicle_requirements TEXT DEFAULT 'All Performance & Tuner Builds Welcome',
  rules TEXT DEFAULT 'No revving in residential zones. Respect local authorities.',
  cover_image_url TEXT DEFAULT 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Meet RSVPs Table
CREATE TABLE IF NOT EXISTS public.meet_rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meet_id UUID REFERENCES public.car_meets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'going' CHECK (status IN ('going', 'maybe')),
  vehicle_id UUID REFERENCES public.user_vehicles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meet_id, user_id)
);

-- 10. Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_type TEXT DEFAULT 'photo' CHECK (post_type IN ('video', 'photo', 'build_update', 'meet_recap')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT NOT NULL,
  tags TEXT[] DEFAULT ARRAY['#ApexUGR', '#TrackDemon'],
  vehicle_id UUID REFERENCES public.user_vehicles(id) ON DELETE SET NULL,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  reposts_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Post Comments
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Post Likes
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 13. Conversations & Messages
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participants UUID[] NOT NULL,
  is_group BOOLEAN DEFAULT false,
  group_name TEXT,
  last_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  target_id TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_meets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Allow Read for all authenticated users; restrict write to owners)
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Vehicles viewable by everyone" ON public.user_vehicles FOR SELECT USING (true);
CREATE POLICY "Users insert own vehicles" ON public.user_vehicles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own vehicles" ON public.user_vehicles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Modifications viewable by everyone" ON public.vehicle_modifications FOR SELECT USING (true);
CREATE POLICY "Users insert modifications" ON public.vehicle_modifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Marketplace viewable by everyone" ON public.marketplace_products FOR SELECT USING (true);
CREATE POLICY "Car meets viewable by everyone" ON public.car_meets FOR SELECT USING (true);
CREATE POLICY "Posts viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Comments viewable by everyone" ON public.post_comments FOR SELECT USING (true);

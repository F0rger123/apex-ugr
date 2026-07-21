-- Apex UGR Seed Data

-- Insert Sample Profiles
INSERT INTO public.profiles (id, username, display_name, bio, home_city, reputation_level, reputation_points, credits_balance, favorite_car_type, racing_specialties, is_verified, avatar_url)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'phantom_gtr', 'Ryder Vance', '1,100WHP R35 GT-R | Apex Champion 2025 | Drag & Highway Pulls', 'Los Angeles, CA', 'Community Favorite', 4850, 18500.00, 'JDM / All-Wheel Drive', ARRAY['Drag Race', 'Roll Race', 'Highway Pull'], true, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop'),
  ('00000000-0000-0000-0000-000000000002', 'apex_gt3', 'Elena Rostova', 'Track addict. 911 GT3 RS Weissach Package. Time Attack Champion.', 'Miami, FL', 'Street Specialist', 3920, 14200.00, 'European Precision', ARRAY['Circuit Race', 'Time Attack'], true, 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop'),
  ('00000000-0000-0000-0000-000000000003', 'boosted_2jz', 'Kenji Sato', 'MK4 Supra Turbo | Single T88 | E85 Drinker', 'Tokyo / LA', 'Veteran', 2800, 9500.00, 'JDM Classic', ARRAY['Roll Race', 'Drag Race'], true, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop')
ON CONFLICT (id) DO NOTHING;

-- Insert Vehicles
INSERT INTO public.user_vehicles (id, user_id, year, make, model, trim, color, nickname, engine, transmission, horsepower, torque, weight_lbs, top_speed_mph, quarter_mile_sec, zero_to_sixty_sec, drivetrain, fuel_type, photos, is_primary)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 2024, 'Nissan', 'GT-R', 'Nismo Alpha 12', 'Midnight Purple IV', 'GODZILLA', '3.8L VR38DETT Twin-Turbo', '6-Speed Dual Clutch ATTESA E-TS', 1150, 980, 3860, 224, 8.85, 2.05, 'AWD', 'E85 Flex Fuel', ARRAY['https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=800&auto=format&fit=crop'], true),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', 2023, 'Porsche', '911 GT3 RS', 'Weissach Package', 'Lizard Green / Carbon', 'VIREN', '4.0L High-Rev Flat-6 NA', '7-Speed PDK Dual-Clutch', 518, 343, 3197, 184, 10.90, 2.90, 'RWD', '93 Octane / E30', ARRAY['https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=800&auto=format&fit=crop'], true),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000003', 1998, 'Toyota', 'Supra', 'RZ Twin Turbo', 'Super White II', 'GHOST', '3.0L 2JZ-GTE Single Precision 6870', '6-Speed Getrag V160', 920, 840, 3450, 210, 9.40, 2.60, 'RWD', 'E85 Ethanol', ARRAY['https://images.unsplash.com/photo-1627454819213-f77108b406f6?q=80&w=800&auto=format&fit=crop'], true)
ON CONFLICT (id) DO NOTHING;

-- Insert Modifications
INSERT INTO public.vehicle_modifications (vehicle_id, category, brand, part_name, price, hp_gain, torque_gain, purchase_source)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Turbo', 'AMS Performance', 'Alpha 12 Turbocharger Kit', 18500.00, 350, 280, 'AMS Performance'),
  ('11111111-1111-1111-1111-111111111111', 'Exhaust', 'Akrapovič', 'Titanium Evolution Line Exhaust', 8400.00, 28, 32, 'Summit Racing'),
  ('11111111-1111-1111-1111-111111111111', 'Tune', 'Cobb Tuning', 'Accessport V3 custom E85 FlexTune', 1750.00, 120, 110, 'Cobb Tuning'),
  ('22222222-2222-2222-2222-222222222222', 'Suspension', 'Mantle Motorsport', '3-Way Adjustable Coilover Suspension', 6200.00, 0, 0, 'Motorsport Parts Co');

-- Insert Marketplace Products
INSERT INTO public.marketplace_products (title, brand, category, price, vendor_name, image_url, description, compatible_makes, compatible_models, rating, reviews_count)
VALUES
  ('Akrapovič Titanium Evolution Line Exhaust', 'Akrapovič', 'Exhaust', 8490.00, 'Summit Racing', 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?q=80&w=600&auto=format&fit=crop', 'Lightweight race-grade titanium exhaust system designed for maximum flow velocity, aggressive pops, and high heat reduction.', ARRAY['Nissan', 'Porsche', 'BMW'], ARRAY['GT-R', '911 GT3', 'M4'], 4.9, 142),
  ('Garrett GTX3582R Gen II Turbocharger', 'Garrett', 'Turbo', 2850.00, 'eBay Motors', 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=600&auto=format&fit=crop', 'Aerodynamically optimized forged billet compressor wheel supporting up to 850 HP per turbo.', ARRAY['Toyota', 'Nissan', 'Ford', 'Chevrolet'], ARRAY['Supra', 'GT-R', 'Mustang GT'], 5.0, 98),
  ('Cobb Accessport V3 ECU Flasher & Logger', 'Cobb Tuning', 'Tune', 795.00, 'AmericanMuscle', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=600&auto=format&fit=crop', 'In-cabin full-color digital telemetry monitor with instant map switching and real-time sensor readout.', ARRAY['Nissan', 'Ford', 'Subaru'], ARRAY['GT-R', 'Mustang GT', 'WRX STI'], 4.8, 310),
  ('Brembo GT-R Monobloc 6-Piston Big Brake Kit', 'Brembo', 'Brakes', 5995.00, 'Tire Rack', 'https://images.unsplash.com/photo-1600706432523-991475712e02?q=80&w=600&auto=format&fit=crop', 'Nickel-plated monobloc calipers with slotted two-piece carbon-ceramic discs engineered for endurance circuit racing.', ARRAY['Porsche', 'BMW', 'Chevrolet', 'Nissan'], ARRAY['911 GT3', 'M4', 'Corvette Z06', 'GT-R'], 4.9, 87),
  ('BBS FI-R Forged Monobloc Centerlock Wheels (Set of 4)', 'BBS Wheels', 'Wheels & Tires', 9800.00, 'Tire Rack', 'https://images.unsplash.com/photo-1588636142475-a62d56692870?q=80&w=600&auto=format&fit=crop', 'Ultra-lightweight motorsport forged aluminum wheels with relief holes in the spokes.', ARRAY['Porsche', 'BMW', 'Audi'], ARRAY['911 GT3', 'M4', 'R8'], 4.9, 64);

-- Insert Car Meets
INSERT INTO public.car_meets (title, description, meet_type, start_time, latitude, longitude, location_name, max_attendance, vehicle_requirements, rules, cover_image_url)
VALUES
  ('Midnight Apex Underground Meet & Roll Sprint', 'Late night high-horsepower gathering followed by organized highway roll runs on closed industrial corridors.', 'Meet', NOW() + INTERVAL '2 days', 34.0522, -118.2437, 'Los Angeles Port Warehouse District', 150, 'Minimum 500+ WHP or Verified Sports Cars', 'No burnout in populated lots. Follow lead pace cars.', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop'),
  ('Canyons & Coffee Sunrise Cruise', 'Scenic high-altitude canyon run through Angeles Crest with photo stops and telemetry logging.', 'Cruise', NOW() + INTERVAL '5 days', 34.2345, -118.1234, 'Angeles Crest Highway Overlook', 60, 'All Clean Tuners & Supercars', 'Strict single lane discipline.', 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?q=80&w=800&auto=format&fit=crop');

-- Insert Sample Races
INSERT INTO public.races (challenger_id, opponent_id, race_type, wager_credits, start_time, rules, route_name, distance_miles, status)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Roll Race', 1000.00, NOW() + INTERVAL '1 day', '60 MPH Roll Start. Finish at 1/2 Mile mark.', 'Industrial Strip Sector 7', 0.50, 'open'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Time Attack', 1500.00, NOW() + INTERVAL '3 days', 'Apex Canyon Circuit. Best out of 3 timed laps.', 'Angeles Canyon Loop', 4.20, 'accepted');

-- Insert Posts
INSERT INTO public.posts (user_id, post_type, media_url, caption, tags, likes_count, comments_count)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'photo', 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=800&auto=format&fit=crop', 'Dyno tune complete at AMS! Made 1,150WHP on E85. Ready for Friday night wagers! ⚡🏎️', ARRAY['#GTR', '#Alpha12', '#ApexUGR'], 412, 58),
  ('00000000-0000-0000-0000-000000000002', 'photo', 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=800&auto=format&fit=crop', 'Morning heat cycles at Homestead Speedway. 911 GT3 RS aerodynamics are unmatchable.', ARRAY['#GT3RS', '#TrackDemon', '#TimeAttack'], 389, 42);

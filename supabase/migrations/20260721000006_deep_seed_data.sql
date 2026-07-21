-- Seed Profiles
INSERT INTO public.profiles (id, username, display_name, avatar_url, role, reputation_points, reputation_level, credits_balance)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'ghost_rider', 'The Ghost', 'https://images.unsplash.com/photo-1542362567-b07e54358753?q=80&w=400&auto=format&fit=crop', 'user', 15400, 'STREET KING', 45000),
  ('00000000-0000-0000-0000-000000000003', 'night_fury', 'Night Fury', 'https://images.unsplash.com/photo-1503371062146-2affdbfc192e?q=80&w=400&auto=format&fit=crop', 'user', 12200, 'PRO RACER', 12000),
  ('00000000-0000-0000-0000-000000000004', 'apex_predator', 'Apex Predator', 'https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=400&auto=format&fit=crop', 'user', 9800, 'VETERAN', 5400),
  ('00000000-0000-0000-0000-000000000005', 'midnight_club', 'MC Driver', 'https://images.unsplash.com/photo-1610880846497-7257b228f415?q=80&w=400&auto=format&fit=crop', 'user', 8400, 'VETERAN', 8900)
ON CONFLICT (id) DO NOTHING;

-- Seed Marketplace Products
INSERT INTO public.marketplace_products (title, brand, category, price, vendor_name, image_url, description, compatible_makes, compatible_models, rating, reviews_count, purchase_url, in_stock, hp_gain)
VALUES
  ('Garrett GTX3582R Gen II Turbocharger', 'Garrett', 'Turbo', 2349.99, 'AmericanMuscle', 'https://images.unsplash.com/photo-1632249767222-38e747b0a720?q=80&w=800&auto=format&fit=crop', 'Premium dual ball bearing turbo for massive high-end power.', ARRAY['Universal'], ARRAY['Universal'], 4.9, 120, 'https://americanmuscle.com', true, 350),
  ('Borla ATAK Cat-Back Exhaust', 'Borla', 'Exhaust', 1450.00, 'CJ Pony Parts', 'https://images.unsplash.com/photo-1600706432502-78964af76eb5?q=80&w=800&auto=format&fit=crop', 'Aggressive exhaust note with zero drone. Stainless steel.', ARRAY['Ford', 'Chevrolet'], ARRAY['Mustang', 'Camaro'], 4.8, 340, 'https://cjponyparts.com', true, 15),
  ('Cobb Accessport V3', 'Cobb Tuning', 'Tune', 675.00, 'Amazon', 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?q=80&w=800&auto=format&fit=crop', 'The world''s best selling, most flexible ECU upgrade solution.', ARRAY['Subaru', 'Ford'], ARRAY['WRX', 'Mustang'], 4.7, 890, 'https://amazon.com', true, 45),
  ('Brembo GT Big Brake Kit', 'Brembo', 'Brakes', 3895.00, 'eBay Motors', 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=800&auto=format&fit=crop', 'High performance braking system for track days.', ARRAY['Nissan', 'Porsche'], ARRAY['GT-R', '911'], 5.0, 42, 'https://ebay.com/motors', true, 0),
  ('Michelin Pilot Sport 4S (Set of 4)', 'Michelin', 'Wheels & Tires', 1200.00, 'Tire Rack', 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=800&auto=format&fit=crop', 'Ultra high performance summer tires.', ARRAY['Universal'], ARRAY['Universal'], 4.9, 2100, 'https://tirerack.com', true, 0),
  ('KW Variant 3 Coilovers', 'KW Suspensions', 'Suspension', 2850.00, 'Summit Racing', 'https://images.unsplash.com/photo-1552845108-5f774a2b4b4e?q=80&w=800&auto=format&fit=crop', 'Adjustable rebound and compression damping.', ARRAY['BMW', 'Audi'], ARRAY['M3', 'S4'], 4.8, 115, 'https://summitracing.com', true, 0),
  ('NOS Pro Race Fogger System', 'NOS', 'Nitrous', 1150.00, 'Summit Racing', 'https://images.unsplash.com/photo-1611080854492-4f36c56b6b7a?q=80&w=800&auto=format&fit=crop', 'Direct port nitrous system for V8s.', ARRAY['Chevrolet', 'Dodge'], ARRAY['Corvette', 'Challenger'], 4.6, 88, 'https://summitracing.com', true, 150),
  ('Whipple 3.0L Supercharger Kit', 'Whipple', 'Supercharger', 8500.00, 'AmericanMuscle', 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=800&auto=format&fit=crop', 'Massive twin-screw power adder.', ARRAY['Ford', 'Dodge'], ARRAY['Mustang', 'Charger'], 4.9, 56, 'https://americanmuscle.com', true, 300)
ON CONFLICT DO NOTHING;

-- Seed Telemetry Runs (For Leaderboards)
INSERT INTO public.telemetry_runs (driver_id, vehicle_id, start_time, end_time, top_speed_mph, avg_speed_mph, max_g_lateral, max_g_longitudinal, zero_to_sixty_sec, quarter_mile_sec, distance_miles, is_verified)
VALUES
  ('00000000-0000-0000-0000-000000000002', NULL, NOW() - interval '2 days', NOW() - interval '2 days' + interval '10 seconds', 165.4, 110.2, 1.2, 1.5, 2.8, 9.8, 0.25, true),
  ('00000000-0000-0000-0000-000000000003', NULL, NOW() - interval '5 days', NOW() - interval '5 days' + interval '11 seconds', 158.2, 105.1, 1.1, 1.3, 3.1, 10.2, 0.25, true),
  ('00000000-0000-0000-0000-000000000004', NULL, NOW() - interval '1 week', NOW() - interval '1 week' + interval '12 seconds', 145.0, 95.0, 1.0, 1.1, 3.5, 11.5, 0.25, true),
  ('00000000-0000-0000-0000-000000000005', NULL, NOW() - interval '10 days', NOW() - interval '10 days' + interval '13 seconds', 138.5, 88.4, 0.9, 1.0, 4.0, 12.1, 0.25, true),
  ('00000000-0000-0000-0000-000000000002', NULL, NOW() - interval '1 month', NOW() - interval '1 month' + interval '9 seconds', 172.0, 120.0, 1.3, 1.6, 2.5, 9.2, 0.25, true)
ON CONFLICT DO NOTHING;

-- Force update leaderboard stats to match the mock data so it shows immediately
UPDATE public.profiles SET races_won = 142, top_speed_recorded = 172.0 WHERE id = '00000000-0000-0000-0000-000000000002';
UPDATE public.profiles SET races_won = 85, top_speed_recorded = 158.2 WHERE id = '00000000-0000-0000-0000-000000000003';
UPDATE public.profiles SET races_won = 42, top_speed_recorded = 145.0 WHERE id = '00000000-0000-0000-0000-000000000004';
UPDATE public.profiles SET races_won = 29, top_speed_recorded = 138.5 WHERE id = '00000000-0000-0000-0000-000000000005';

-- Seed Feed Posts
INSERT INTO public.feed_posts (author_id, content, media_url, thumbnail_url, post_type, location_name, likes_count, comments_count)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'Midnight pull. Testing the new Garrett Gen II setup. Turbo spools incredibly fast.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'https://images.unsplash.com/photo-1542362567-b07e54358753?q=80&w=600&auto=format&fit=crop', 'video', 'Industrial Sector 7', 1420, 85),
  ('00000000-0000-0000-0000-000000000003', 'Car meet was insane last night. The turnout was huge.', 'https://images.unsplash.com/photo-1503371062146-2affdbfc192e?q=80&w=600&auto=format&fit=crop', NULL, 'image', 'Downtown Plaza', 840, 32),
  ('00000000-0000-0000-0000-000000000004', 'Just installed the new Brembos. Stopping power is unreal.', 'https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=600&auto=format&fit=crop', NULL, 'image', 'Apex Garage', 512, 12),
  ('00000000-0000-0000-0000-000000000005', 'Listen to that Borla exhaust note. No drone at all.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', 'https://images.unsplash.com/photo-1610880846497-7257b228f415?q=80&w=600&auto=format&fit=crop', 'video', 'Highway 101', 945, 66)
ON CONFLICT DO NOTHING;

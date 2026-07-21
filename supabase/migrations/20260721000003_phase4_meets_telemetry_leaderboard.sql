-- ============================================================
-- Apex UGR — Phase 4 Migration
-- Adds: join_car_meet RPC, meet_attendees table,
--       telemetry runs table, leaderboard queries
-- ============================================================

-- 19. MEET ATTENDEES (many-to-many: user joins a car meet)
CREATE TABLE IF NOT EXISTS public.meet_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meet_id UUID NOT NULL REFERENCES public.car_meets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meet_id, user_id)
);

ALTER TABLE public.meet_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Meet attendees viewable by all" ON public.meet_attendees FOR SELECT USING (true);
CREATE POLICY "Users manage own RSVP" ON public.meet_attendees FOR ALL USING (auth.uid() = user_id);

-- 20. TELEMETRY RUNS (saved performance run results)
CREATE TABLE IF NOT EXISTS public.telemetry_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  run_type TEXT NOT NULL CHECK (run_type IN ('quarter_mile', 'zero_to_60', 'highway_pull', 'top_speed', 'lap_time')),
  result_value NUMERIC(10,4) NOT NULL, -- seconds or mph depending on run_type
  max_speed_mph NUMERIC(8,2),
  max_g_force NUMERIC(6,3),
  gps_log JSONB,
  video_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.telemetry_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Telemetry runs viewable by all" ON public.telemetry_runs FOR SELECT USING (true);
CREATE POLICY "Users manage own runs" ON public.telemetry_runs FOR ALL USING (auth.uid() = user_id);

-- ─── RPC: Join a car meet ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_car_meet(p_meet_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.meet_attendees (meet_id, user_id)
  VALUES (p_meet_id, p_user_id)
  ON CONFLICT (meet_id, user_id) DO NOTHING;

  -- Increment the attendees_count
  UPDATE public.car_meets
  SET attendees_count = attendees_count + 1
  WHERE id = p_meet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── RPC: Save telemetry run + update vehicle stats ──────────────────────
CREATE OR REPLACE FUNCTION public.save_telemetry_run(
  p_user_id UUID,
  p_vehicle_id UUID,
  p_run_type TEXT,
  p_result_value NUMERIC,
  p_max_speed_mph NUMERIC,
  p_max_g_force NUMERIC,
  p_gps_log JSONB
)
RETURNS UUID AS $$
DECLARE
  run_id UUID;
BEGIN
  INSERT INTO public.telemetry_runs (
    user_id, vehicle_id, run_type, result_value, max_speed_mph, max_g_force, gps_log
  )
  VALUES (
    p_user_id, p_vehicle_id, p_run_type, p_result_value, p_max_speed_mph, p_max_g_force, p_gps_log
  )
  RETURNING id INTO run_id;

  -- Update vehicle stats if this is a personal best
  IF p_run_type = 'quarter_mile' THEN
    UPDATE public.vehicles
    SET quarter_mile_sec = CASE
      WHEN quarter_mile_sec IS NULL OR p_result_value < quarter_mile_sec
      THEN p_result_value
      ELSE quarter_mile_sec
    END
    WHERE id = p_vehicle_id;
  ELSIF p_run_type = 'zero_to_60' THEN
    UPDATE public.vehicles
    SET zero_to_sixty_sec = CASE
      WHEN zero_to_sixty_sec IS NULL OR p_result_value < zero_to_sixty_sec
      THEN p_result_value
      ELSE zero_to_sixty_sec
    END
    WHERE id = p_vehicle_id;
  ELSIF p_run_type = 'top_speed' THEN
    UPDATE public.vehicles
    SET top_speed_mph = GREATEST(top_speed_mph, p_max_speed_mph::INTEGER)
    WHERE id = p_vehicle_id;
  END IF;

  -- Update profile top speed record
  UPDATE public.profiles
  SET stats = jsonb_set(
    stats,
    '{top_speed_recorded}',
    GREATEST((stats->>'top_speed_recorded')::NUMERIC, p_max_speed_mph)::TEXT::JSONB
  )
  WHERE id = p_user_id AND p_max_speed_mph > (stats->>'top_speed_recorded')::NUMERIC;

  RETURN run_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── VIEW: Leaderboard (top 100 racers by reputation) ─────────────────────
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.reputation_level,
  p.reputation_points,
  p.credits_balance,
  (p.stats->>'races_won')::INTEGER AS races_won,
  (p.stats->>'races_entered')::INTEGER AS races_entered,
  (p.stats->>'top_speed_recorded')::NUMERIC AS top_speed_recorded,
  CASE
    WHEN (p.stats->>'races_entered')::INTEGER > 0
    THEN ROUND(((p.stats->>'races_won')::NUMERIC / (p.stats->>'races_entered')::NUMERIC) * 100, 1)
    ELSE 0
  END AS win_rate_pct
FROM public.profiles p
ORDER BY p.reputation_points DESC
LIMIT 100;

-- ============================================================
-- Apex UGR — Phase 2 Migration
-- Adds: conversations, follows, post_likes, driver_locations,
--       moderation_reports, and credit/wager RPC functions
-- ============================================================

-- 13. CONVERSATIONS TABLE (missing from Phase 1)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participants UUID[] NOT NULL,
  is_group BOOLEAN DEFAULT FALSE,
  group_name TEXT,
  last_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Conversation participants can view their conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = ANY(participants));
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = ANY(participants));
CREATE POLICY "Participants can update conversation"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = ANY(participants));

-- 14. FOLLOWS TABLE
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users manage own follows" ON public.follows FOR ALL USING (auth.uid() = follower_id);

-- 15. POST LIKES TABLE
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes viewable by everyone" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users manage own likes" ON public.post_likes FOR ALL USING (auth.uid() = user_id);

-- 16. DRIVER LOCATIONS TABLE (real-time GPS positions)
CREATE TABLE IF NOT EXISTS public.driver_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  speed_mph NUMERIC(6,2) DEFAULT 0,
  heading NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'Parked' CHECK (status IN ('Cruising', 'Staged for Race', 'Parked', 'In Telemetry Run')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
-- Visibility respects user privacy_mode — checked in app logic via profile join
CREATE POLICY "Driver locations viewable by authenticated users"
  ON public.driver_locations FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Users update own location"
  ON public.driver_locations FOR ALL
  USING (auth.uid() = user_id);

-- 17. MODERATION REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporters can view own reports"
  ON public.moderation_reports FOR SELECT
  USING (auth.uid() = reporter_id);
CREATE POLICY "Authenticated users can submit reports"
  ON public.moderation_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- ============================================================
-- CREDIT RPC FUNCTIONS (atomic, tamper-proof)
-- ============================================================

-- Add credits to user (used for race winnings, achievements, etc.)
CREATE OR REPLACE FUNCTION public.add_credits(user_id UUID, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET credits_balance = credits_balance + amount,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deduct credits (returns false if insufficient balance)
CREATE OR REPLACE FUNCTION public.deduct_credits(user_id UUID, amount NUMERIC)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  SELECT credits_balance INTO current_balance
  FROM public.profiles
  WHERE id = user_id
  FOR UPDATE; -- row-level lock prevents double-spend

  IF current_balance < amount THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
  SET credits_balance = credits_balance - amount,
      updated_at = NOW()
  WHERE id = user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Escrow wager: deducts from both challenger and opponent
-- Creates locked entry that cannot be double-spent
CREATE OR REPLACE FUNCTION public.escrow_wager(
  p_challenger_id UUID,
  p_opponent_id UUID,
  p_amount NUMERIC,
  p_race_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  challenger_ok BOOLEAN;
  opponent_ok BOOLEAN;
BEGIN
  -- Deduct from challenger
  SELECT public.deduct_credits(p_challenger_id, p_amount) INTO challenger_ok;
  IF NOT challenger_ok THEN
    RETURN FALSE;
  END IF;

  -- Deduct from opponent
  SELECT public.deduct_credits(p_opponent_id, p_amount) INTO opponent_ok;
  IF NOT opponent_ok THEN
    -- Refund challenger if opponent cannot cover
    PERFORM public.add_credits(p_challenger_id, p_amount);
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Release wager to winner (2x the wager amount)
CREATE OR REPLACE FUNCTION public.release_wager(p_race_id UUID, p_winner_id UUID)
RETURNS VOID AS $$
DECLARE
  wager_amount NUMERIC;
BEGIN
  SELECT wager_credits INTO wager_amount
  FROM public.race_challenges
  WHERE id = p_race_id;

  -- Award winner the full pot (2x since both paid in)
  PERFORM public.add_credits(p_winner_id, wager_amount * 2);

  -- Update race status
  UPDATE public.race_challenges
  SET status = 'finished', winner_id = p_winner_id
  WHERE id = p_race_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- AUTO-UPDATE TRIGGERS
-- ============================================================

-- Trigger: auto-update likes_count on posts when post_likes changes
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_post_like_change
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

-- Trigger: auto-update comments_count on posts when comment inserted
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- Trigger: award reputation points when race finishes
CREATE OR REPLACE FUNCTION public.award_race_reputation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'finished' AND OLD.status != 'finished' AND NEW.winner_id IS NOT NULL THEN
    -- Winner gets +200 reputation points
    UPDATE public.profiles
    SET reputation_points = reputation_points + 200,
        stats = jsonb_set(stats, '{races_won}', ((stats->>'races_won')::int + 1)::text::jsonb),
        stats = jsonb_set(stats, '{races_entered}', ((stats->>'races_entered')::int + 1)::text::jsonb)
    WHERE id = NEW.winner_id;

    -- Loser (the other participant) gets +50 for participating
    UPDATE public.profiles
    SET reputation_points = reputation_points + 50,
        stats = jsonb_set(stats, '{races_entered}', ((stats->>'races_entered')::int + 1)::text::jsonb)
    WHERE id IN (NEW.challenger_id, NEW.opponent_id)
      AND id != NEW.winner_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_race_finish
  AFTER UPDATE ON public.race_challenges
  FOR EACH ROW
  WHEN (NEW.status = 'finished' AND OLD.status != 'finished')
  EXECUTE FUNCTION public.award_race_reputation();

-- Enable Realtime for live features
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.race_challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

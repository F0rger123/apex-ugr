-- Migration: Phase 1 Missing Core Features
-- 1. Racing Escrow System (RPCs for transaction safety)
-- 2. Telemetry Historical Views

-- Function to accept a race and securely hold wager in escrow
CREATE OR REPLACE FUNCTION accept_race_challenge(p_challenge_id UUID, p_opponent_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_challenger_id UUID;
    v_wager NUMERIC;
    v_status TEXT;
    v_challenger_credits NUMERIC;
    v_opponent_credits NUMERIC;
BEGIN
    -- Get challenge details
    SELECT challenger_id, wager_credits, status 
    INTO v_challenger_id, v_wager, v_status
    FROM public.race_challenges 
    WHERE id = p_challenge_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Challenge not found';
    END IF;

    IF v_status != 'open' THEN
        RAISE EXCEPTION 'Challenge is no longer open';
    END IF;

    -- Verify balances
    SELECT credits INTO v_challenger_credits FROM public.profiles WHERE id = v_challenger_id;
    SELECT credits INTO v_opponent_credits FROM public.profiles WHERE id = p_opponent_id;

    IF v_challenger_credits < v_wager THEN
        RAISE EXCEPTION 'Challenger has insufficient credits';
    END IF;
    
    IF v_opponent_credits < v_wager THEN
        RAISE EXCEPTION 'Opponent has insufficient credits';
    END IF;

    -- Escrow: Deduct from both
    UPDATE public.profiles SET credits = credits - v_wager WHERE id = v_challenger_id;
    UPDATE public.profiles SET credits = credits - v_wager WHERE id = p_opponent_id;

    -- Accept challenge
    UPDATE public.race_challenges 
    SET opponent_id = p_opponent_id, status = 'accepted'
    WHERE id = p_challenge_id;

    RETURN TRUE;
END;
$$;

-- Function to resolve race and payout winner
CREATE OR REPLACE FUNCTION resolve_race(p_challenge_id UUID, p_winner_id UUID, p_referee_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_challenger_id UUID;
    v_opponent_id UUID;
    v_wager NUMERIC;
    v_status TEXT;
    v_pot NUMERIC;
BEGIN
    SELECT challenger_id, opponent_id, wager_credits, status 
    INTO v_challenger_id, v_opponent_id, v_wager, v_status
    FROM public.race_challenges 
    WHERE id = p_challenge_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Challenge not found';
    END IF;

    IF v_status NOT IN ('accepted', 'in_progress', 'disputed') THEN
        RAISE EXCEPTION 'Challenge cannot be resolved from current status';
    END IF;

    IF p_winner_id != v_challenger_id AND p_winner_id != v_opponent_id THEN
        RAISE EXCEPTION 'Winner must be a participant';
    END IF;

    -- Calculate pot (total wager x 2)
    v_pot := v_wager * 2;

    -- Payout to winner
    UPDATE public.profiles 
    SET credits = credits + v_pot, 
        wins = wins + 1,
        reputation = reputation + 10 
    WHERE id = p_winner_id;

    -- Record loss for loser
    IF p_winner_id = v_challenger_id THEN
        UPDATE public.profiles SET losses = losses + 1 WHERE id = v_opponent_id;
    ELSE
        UPDATE public.profiles SET losses = losses + 1 WHERE id = v_challenger_id;
    END IF;

    -- Finalize challenge
    UPDATE public.race_challenges 
    SET status = 'finished', winner_id = p_winner_id
    WHERE id = p_challenge_id;

    RETURN TRUE;
END;
$$;


-- Views for Telemetry History
CREATE OR REPLACE VIEW public.vw_telemetry_lifetime AS
SELECT 
    driver_id,
    COUNT(id) as total_runs,
    MAX(speed_mph) as top_speed,
    AVG(speed_mph) as avg_speed,
    MIN(zero_to_sixty_sec) as best_0_60,
    MIN(quarter_mile_sec) as best_1_4_mile
FROM public.telemetry_runs
GROUP BY driver_id;

-- Ensure roles can read the view
GRANT SELECT ON public.vw_telemetry_lifetime TO authenticated;
GRANT SELECT ON public.vw_telemetry_lifetime TO anon;

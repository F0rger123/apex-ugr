-- This managed PostGIS build cannot be moved with ALTER EXTENSION SET SCHEMA.
-- The application does not query its reference table, so keep it out of the API roles.
revoke all on table public.spatial_ref_sys from public, anon, authenticated;

alter function public.update_post_likes_count() set search_path = public, pg_temp;
alter function public.update_post_comments_count() set search_path = public, pg_temp;
alter function public.award_race_reputation() set search_path = public, pg_temp;
alter function public.release_wager(uuid, uuid) set search_path = public, pg_temp;
alter function public.accept_race_challenge(uuid, uuid) set search_path = public, pg_temp;
alter function public.resolve_race(uuid, uuid, uuid) set search_path = public, pg_temp;
alter function public.add_credits(uuid, numeric) set search_path = public, pg_temp;
alter function public.deduct_credits(uuid, numeric) set search_path = public, pg_temp;
alter function public.escrow_wager(uuid, uuid, numeric, uuid) set search_path = public, pg_temp;
alter function public.join_car_meet(uuid, uuid) set search_path = public, pg_temp;
alter function public.save_telemetry_run(uuid, uuid, text, numeric, numeric, numeric, jsonb) set search_path = public, pg_temp;

-- Trigger functions are invoked by their triggers, never directly over the API.
revoke all on function public.update_post_likes_count() from public, anon, authenticated;
revoke all on function public.update_post_comments_count() from public, anon, authenticated;
revoke all on function public.award_race_reputation() from public, anon, authenticated;

-- Legacy money-moving and referee RPCs trust caller-supplied user IDs. Keep them
-- unavailable until the evidence adjudication service owns these transitions.
revoke all on function public.accept_race_challenge(uuid, uuid) from public, anon, authenticated;
revoke all on function public.resolve_race(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.release_wager(uuid, uuid) from public, anon, authenticated;
revoke all on function public.add_credits(uuid, numeric) from public, anon, authenticated;
revoke all on function public.deduct_credits(uuid, numeric) from public, anon, authenticated;
revoke all on function public.escrow_wager(uuid, uuid, numeric, uuid) from public, anon, authenticated;
revoke all on function public.join_car_meet(uuid, uuid) from public, anon, authenticated;
revoke all on function public.save_telemetry_run(uuid, uuid, text, numeric, numeric, numeric, jsonb) from public, anon, authenticated;

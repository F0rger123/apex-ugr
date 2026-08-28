-- Phase 4 query hardening for leaderboard, profile, and social fan-out paths.
CREATE INDEX IF NOT EXISTS idx_perf_user_verified_run
  ON personal_performance_records(user_id, verification_status, run_type, result_seconds);
CREATE INDEX IF NOT EXISTS idx_perf_user_verified_speed
  ON personal_performance_records(user_id, verification_status, top_speed_kph DESC);
CREATE INDEX IF NOT EXISTS idx_cruise_members_user
  ON cruise_members(user_id, status, cruise_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user
  ON post_likes(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_post_saves_user
  ON post_saves(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user
  ON comments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_season_progress_user
  ON season_user_progress(user_id, season_id, xp DESC);

-- System-awarded badges must exist before any reward finalizer references them.
INSERT OR IGNORE INTO badges(id,name,description,icon,reward_credits,category) VALUES
  ('cotw-champion','CAR OF THE WEEK','Win a verified weekly community category.','trophy',0,'community');

-- World Bounties run on a fixed two-hour production cadence.
UPDATE network_config
SET value_json=json_set(value_json,'$.cadenceHours',2),updated_at=CURRENT_TIMESTAMP
WHERE key='bounty_world';

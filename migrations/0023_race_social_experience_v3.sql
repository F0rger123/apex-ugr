-- Apex UGR Phase 3: racing, profiles, meets, convoys, and verified progression.
-- Forward-only. Existing records remain valid through conservative defaults.

ALTER TABLE personal_performance_records ADD COLUMN top_speed_kph REAL NOT NULL DEFAULT 0;
ALTER TABLE personal_performance_records ADD COLUMN gps_accuracy_m REAL;
ALTER TABLE personal_performance_records ADD COLUMN gps_sample_age_ms INTEGER;
ALTER TABLE personal_performance_records ADD COLUMN route_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE personal_performance_records ADD COLUMN confidence_label TEXT NOT NULL DEFAULT 'UNRATED';
ALTER TABLE posts ADD COLUMN feed_category TEXT NOT NULL DEFAULT 'FOR_YOU';
CREATE INDEX IF NOT EXISTS idx_perf_verified_board
  ON personal_performance_records(run_type,verification_status,result_seconds);

DELETE FROM daily_ghost_claims
WHERE rowid NOT IN (SELECT MIN(rowid) FROM daily_ghost_claims GROUP BY user_id,claim_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_claim_user_date
  ON daily_ghost_claims(user_id,claim_date);

ALTER TABLE badges ADD COLUMN rarity TEXT NOT NULL DEFAULT 'COMMON';
ALTER TABLE driver_milestones ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE ghost_keys ADD COLUMN lifetime_spent INTEGER NOT NULL DEFAULT 0;

UPDATE users SET apex_id='AK-' || UPPER(SUBSTR(REPLACE(id,'-',''),1,8)) WHERE apex_id IS NULL;

ALTER TABLE events ADD COLUMN image_url TEXT;
ALTER TABLE events ADD COLUMN capacity INTEGER NOT NULL DEFAULT 100;
ALTER TABLE events ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';
ALTER TABLE events ADD COLUMN categories_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE events ADD COLUMN announcements_json TEXT NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS meet_showcase_votes (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  voter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nominee_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(event_id,category,voter_user_id)
);
CREATE INDEX IF NOT EXISTS idx_meet_votes_results
  ON meet_showcase_votes(event_id,category,nominee_user_id);

ALTER TABLE cruise_members ADD COLUMN role TEXT NOT NULL DEFAULT 'MID';
ALTER TABLE cruises ADD COLUMN regroup_json TEXT;
ALTER TABLE cruises ADD COLUMN ended_at TEXT;

CREATE TABLE IF NOT EXISTS convoy_recaps (
  id TEXT PRIMARY KEY,
  cruise_id TEXT NOT NULL UNIQUE REFERENCES cruises(id) ON DELETE CASCADE,
  host_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  distance_km REAL NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  member_count INTEGER NOT NULL DEFAULT 0,
  route_json TEXT NOT NULL DEFAULT '{}',
  discoveries INTEGER NOT NULL DEFAULT 0,
  safe_houses INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS relay_leg_results (
  race_id TEXT NOT NULL REFERENCES race_contracts(id) ON DELETE CASCADE,
  leg_order INTEGER NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TEXT,
  completed_at TEXT,
  elapsed_ms INTEGER,
  handoff_verified INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(race_id,leg_order)
);

CREATE TABLE IF NOT EXISTS profile_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  public_stats_json TEXT NOT NULL DEFAULT '["wins","losses","topSpeed","zeroToSixty","bounties","meets"]',
  title TEXT NOT NULL DEFAULT 'UNDERGROUND DRIVER',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS badge_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  current_value INTEGER NOT NULL DEFAULT 0,
  target_value INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id,badge_id)
);

CREATE TABLE IF NOT EXISTS rank_trial_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_rank TEXT NOT NULL,
  requirements_json TEXT NOT NULL DEFAULT '{}',
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id,target_rank)
);

CREATE TABLE IF NOT EXISTS ghost_key_unlocks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unlock_type TEXT NOT NULL,
  unlock_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL UNIQUE REFERENCES ghost_key_transactions(id),
  unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id,unlock_type,unlock_id)
);

CREATE TABLE IF NOT EXISTS cotw_dismissals (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_identifier TEXT NOT NULL,
  dismissed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id,week_identifier)
);

CREATE TABLE IF NOT EXISTS qr_scan_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payload_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  scanned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO badges(id,name,description,icon,reward_credits,category) VALUES
  ('meet-regular','MEET REGULAR','Check in at five verified meets.','calendar',0,'meets'),
  ('convoy-lead','CONVOY LEAD','Complete a convoy as route leader.','route',0,'convoy'),
  ('cotw-voter','UNDERGROUND JURY','Cast a verified Car of the Week vote.','trophy',0,'community');

INSERT OR REPLACE INTO network_config(key,value_json,updated_at) VALUES
  ('phase3_limits','{"performanceMaxAccuracyM":35,"performanceMaxSampleAgeMs":3000,"meetCheckinMaxAccuracyM":65,"meetCheckinRewardRep":100,"ghostKeyBlackMarketCost":1}',CURRENT_TIMESTAMP);

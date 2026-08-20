-- Migration 0016: Major Social, Seasons, Meets, Performance & Driver ID Expansion

-- 1. Users Table Extensions
ALTER TABLE users ADD COLUMN apex_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_apex_id ON users(apex_id) WHERE apex_id IS NOT NULL;

-- 2. User Settings
CREATE TABLE IF NOT EXISTS apex_user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  unit_preference TEXT NOT NULL DEFAULT 'MPH', -- 'MPH' or 'KMH'
  meet_notif_radius_miles INTEGER NOT NULL DEFAULT 25,
  meet_notifs_enabled INTEGER NOT NULL DEFAULT 1,
  convoy_radio_enabled INTEGER NOT NULL DEFAULT 1,
  voice_permissions TEXT NOT NULL DEFAULT 'granted',
  season_notifs_enabled INTEGER NOT NULL DEFAULT 1,
  public_performance_visibility INTEGER NOT NULL DEFAULT 1,
  public_race_records INTEGER NOT NULL DEFAULT 1,
  apex_id_visibility INTEGER NOT NULL DEFAULT 1,
  cotw_notifs_enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Car of the Week
CREATE TABLE IF NOT EXISTS car_of_the_week_submissions (
  id TEXT PRIMARY KEY,
  week_identifier TEXT NOT NULL, -- e.g. '2026-W33'
  category TEXT NOT NULL, -- 'appearance', 'build', 'sound'
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  year_make_model TEXT NOT NULL,
  media_urls_json TEXT NOT NULL DEFAULT '[]', -- photos, video, or audio clip
  description TEXT NOT NULL DEFAULT '',
  build_info TEXT NOT NULL DEFAULT '',
  votes_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (week_identifier, category, user_id)
);
CREATE INDEX IF NOT EXISTS idx_cotw_week_cat ON car_of_the_week_submissions(week_identifier, category);

CREATE TABLE IF NOT EXISTS car_of_the_week_votes (
  submission_id TEXT NOT NULL REFERENCES car_of_the_week_submissions(id) ON DELETE CASCADE,
  week_identifier TEXT NOT NULL,
  category TEXT NOT NULL,
  voter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (week_identifier, category, voter_user_id)
);

CREATE TABLE IF NOT EXISTS car_of_the_week_winners (
  id TEXT PRIMARY KEY,
  week_identifier TEXT NOT NULL,
  category TEXT NOT NULL,
  submission_id TEXT NOT NULL REFERENCES car_of_the_week_submissions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  gc_awarded INTEGER NOT NULL DEFAULT 500,
  rep_awarded INTEGER NOT NULL DEFAULT 250,
  xp_awarded INTEGER NOT NULL DEFAULT 1000,
  badge_id TEXT NOT NULL DEFAULT 'cotw-champion',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (week_identifier, category)
);

-- 4. Apex Seasons & Challenges
CREATE TABLE IF NOT EXISTS apex_seasons (
  id TEXT PRIMARY KEY,
  season_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  theme TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  rewards_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS season_user_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_id TEXT NOT NULL REFERENCES apex_seasons(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  claimed_levels_json TEXT NOT NULL DEFAULT '[]',
  has_premium_track INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, season_id)
);

CREATE TABLE IF NOT EXISTS season_challenges (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES apex_seasons(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL, -- 'daily', 'weekly', 'season'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL DEFAULT 100,
  gc_reward INTEGER NOT NULL DEFAULT 50,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS season_challenge_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL REFERENCES season_challenges(id) ON DELETE CASCADE,
  current_count INTEGER NOT NULL DEFAULT 0,
  is_completed INTEGER NOT NULL DEFAULT 0,
  claimed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, challenge_id)
);

-- 5. Daily Ghost Chest
CREATE TABLE IF NOT EXISTS daily_ghost_chests (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_claimed_date TEXT NOT NULL, -- 'YYYY-MM-DD'
  streak_count INTEGER NOT NULL DEFAULT 0,
  grace_available INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_ghost_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claim_date TEXT NOT NULL,
  streak_day INTEGER NOT NULL,
  rarity TEXT NOT NULL, -- 'COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'CLASSIFIED'
  reward_type TEXT NOT NULL, -- 'gc', 'xp', 'cosmetic', 'item'
  reward_value INTEGER NOT NULL DEFAULT 0,
  reward_item_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Mod Wishlist & Build Planner
CREATE TABLE IF NOT EXISTS mod_wishlist (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  part TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Other',
  price REAL NOT NULL DEFAULT 0,
  url TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH'
  notes TEXT NOT NULL DEFAULT '',
  purchased INTEGER NOT NULL DEFAULT 0,
  installed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS build_plans (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT 'CUSTOM', -- 'DAILY BUILD', 'TRACK BUILD', 'SHOW BUILD', 'DREAM BUILD', 'CUSTOM'
  is_public INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS build_plan_parts (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES build_plans(id) ON DELETE CASCADE,
  part_name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Other',
  cost REAL NOT NULL DEFAULT 0,
  purchased INTEGER NOT NULL DEFAULT 0,
  installed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Personal Performance Records
CREATE TABLE IF NOT EXISTS personal_performance_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL, -- '0-30', '0-60', '0-100', '30-60', '40-100', '60-130', 'CUSTOM'
  result_seconds REAL NOT NULL,
  gps_confidence_pct INTEGER NOT NULL DEFAULT 100,
  evidence_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'private', -- 'private', 'pending', 'verified'
  event_context TEXT,
  unit TEXT NOT NULL DEFAULT 'MPH',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_perf_user_run ON personal_performance_records(user_id, run_type);

-- 8. Head-to-Head & Rivals
CREATE TABLE IF NOT EXISTS head_to_head_races (
  id TEXT PRIMARY KEY,
  driver_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  driver_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_a_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  vehicle_b_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  event_context TEXT NOT NULL DEFAULT 'Track Session',
  distance_format TEXT NOT NULL DEFAULT '1/4 Mile',
  winner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  loser_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  time_a_seconds REAL,
  time_b_seconds REAL,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'disputed'
  driver_a_confirmed INTEGER NOT NULL DEFAULT 1,
  driver_b_confirmed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS driver_rivalries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rival_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  last_race_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, rival_user_id)
);

-- 9. Meet Check-Ins
CREATE TABLE IF NOT EXISTS meet_checkins (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  checked_in_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  PRIMARY KEY (event_id, user_id)
);

-- Seed initial default Season 01
INSERT OR IGNORE INTO apex_seasons (id, season_number, name, theme, starts_at, ends_at, is_active, rewards_json)
VALUES (
  'season-01',
  1,
  'SEASON 01',
  'UNDERGROUND AWAKENING',
  '2026-01-01T00:00:00Z',
  '2026-12-31T23:59:59Z',
  1,
  '[{"level":1,"type":"gc","amount":250,"label":"250 Ghost Credits"},{"level":2,"type":"xp","amount":500,"label":"500 Season XP"},{"level":3,"type":"badge","amount":1,"label":"Underground Awakening Badge"},{"level":4,"type":"banner","id":"banner-midnight","label":"Midnight Highway Banner"},{"level":5,"type":"gc","amount":1000,"label":"1,000 Ghost Credits"}]'
);

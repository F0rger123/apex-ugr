CREATE TABLE IF NOT EXISTS bounty_user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bounty_mode_enabled INTEGER NOT NULL DEFAULT 0,
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  show_public_photo INTEGER NOT NULL DEFAULT 1,
  allow_most_wanted INTEGER NOT NULL DEFAULT 1,
  agreement_version TEXT NOT NULL DEFAULT 'v1.0',
  agreed_at TEXT,
  cooldown_until TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bounty_config (
  id TEXT PRIMARY KEY,
  bounty_enabled INTEGER NOT NULL DEFAULT 1,
  roaming_enabled INTEGER NOT NULL DEFAULT 0,
  venue_enabled INTEGER NOT NULL DEFAULT 1,
  stage_duration_seconds TEXT NOT NULL DEFAULT '{"1":600,"2":600,"3":600,"4":600,"5":900}',
  stage_reward_gc TEXT NOT NULL DEFAULT '{"1":300,"2":500,"3":850,"4":1200,"5":2500}',
  stage_reward_rep TEXT NOT NULL DEFAULT '{"1":150,"2":250,"3":450,"4":650,"5":1000}',
  claim_radius_miles REAL NOT NULL DEFAULT 0.5,
  lock_duration_seconds INTEGER NOT NULL DEFAULT 20,
  cooldown_minutes INTEGER NOT NULL DEFAULT 30,
  broadcast_radius_miles TEXT NOT NULL DEFAULT '{"1":5,"2":8,"3":12,"4":20,"5":50}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO bounty_config(id) VALUES('default');

CREATE TABLE IF NOT EXISTS bounty_sessions (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'venue' CHECK(mode IN ('venue','event')),
  venue_id TEXT,
  venue_name TEXT,
  target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  star_level INTEGER NOT NULL DEFAULT 1 CHECK(star_level BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('pending','active','escalating','claimed','escaped','cancelled','expired','invalidated')),
  starts_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  stage_started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  stage_ends_at TEXT NOT NULL,
  reward_gc INTEGER NOT NULL DEFAULT 300,
  reward_rep INTEGER NOT NULL DEFAULT 150,
  claimed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  claimed_at TEXT,
  escaped_at TEXT,
  completed_at TEXT,
  escalation_history TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bounty_sessions_active ON bounty_sessions(status,stage_ends_at);
CREATE INDEX IF NOT EXISTS idx_bounty_sessions_target ON bounty_sessions(target_user_id,status);

CREATE TABLE IF NOT EXISTS bounty_participants (
  session_id TEXT NOT NULL REFERENCES bounty_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  active_vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  left_at TEXT,
  status TEXT NOT NULL DEFAULT 'hunting' CHECK(status IN ('hunting','left','claimed','failed')),
  last_signal_pct INTEGER NOT NULL DEFAULT 0,
  proximity_lock_seconds INTEGER NOT NULL DEFAULT 0,
  lock_started_at TEXT,
  PRIMARY KEY(session_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_bounty_participants_user ON bounty_participants(user_id,status);

CREATE TABLE IF NOT EXISTS bounty_user_stats (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  hunts_joined INTEGER NOT NULL DEFAULT 0,
  successful_claims INTEGER NOT NULL DEFAULT 0,
  highest_star_claimed INTEGER NOT NULL DEFAULT 0,
  current_hunter_streak INTEGER NOT NULL DEFAULT 0,
  best_hunter_streak INTEGER NOT NULL DEFAULT 0,
  five_star_claims INTEGER NOT NULL DEFAULT 0,
  hunter_gc_earned INTEGER NOT NULL DEFAULT 0,
  hunter_rep_earned INTEGER NOT NULL DEFAULT 0,
  times_selected INTEGER NOT NULL DEFAULT 0,
  escapes INTEGER NOT NULL DEFAULT 0,
  highest_star_survived INTEGER NOT NULL DEFAULT 0,
  five_star_survivals INTEGER NOT NULL DEFAULT 0,
  current_survival_streak INTEGER NOT NULL DEFAULT 0,
  best_survival_streak INTEGER NOT NULL DEFAULT 0,
  survivor_gc_earned INTEGER NOT NULL DEFAULT 0,
  survivor_rep_earned INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bounty_safe_zones (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  radius_m INTEGER NOT NULL DEFAULT 300,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE badges ADD COLUMN category TEXT NOT NULL DEFAULT 'achievement';
INSERT OR IGNORE INTO badges(id,name,description,icon,reward_credits,category) VALUES
  ('bounty-hunter-2','BOUNTY HUNTER II','Claim five authorized Bounty sessions.','badge',0,'bounty'),
  ('bounty-hunter-3','BOUNTY HUNTER III','Claim fifteen authorized Bounty sessions.','badge',0,'bounty'),
  ('elite-bounty-hunter','ELITE BOUNTY HUNTER','Claim fifty authorized Bounty sessions.','crown',0,'bounty'),
  ('five-star-hunter','FIVE-STAR HUNTER','Claim an authorized five-star Bounty.','crown',0,'bounty'),
  ('survivor-2','SURVIVOR II','Escape five authorized Bounty sessions.','shield',0,'bounty'),
  ('survivor-3','SURVIVOR III','Escape fifteen authorized Bounty sessions.','shield',0,'bounty');
UPDATE badges SET category='bounty' WHERE id IN ('survivor','five-star-survivor','bounty-hunter','bounty-hunter-2','bounty-hunter-3','elite-bounty-hunter','five-star-hunter','survivor-2','survivor-3');

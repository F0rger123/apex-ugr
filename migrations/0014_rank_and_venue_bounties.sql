CREATE TABLE IF NOT EXISTS rank_thresholds (
  rank TEXT PRIMARY KEY,
  minimum_rep INTEGER NOT NULL,
  reward_gc INTEGER NOT NULL DEFAULT 0,
  shop_access INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO rank_thresholds(rank,minimum_rep,reward_gc,shop_access) VALUES
  ('ROOKIE',0,0,0),('BRONZE',500,50,1),('SILVER',2000,100,2),('GOLD',6000,200,3),('PLATINUM',14000,350,4),('DIAMOND',30000,600,5),('MASTER',60000,1000,6),('APEX',110000,2000,7);

CREATE TABLE IF NOT EXISTS rank_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rank TEXT NOT NULL,
  rep INTEGER NOT NULL,
  awarded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rank_history_user ON rank_history(user_id,awarded_at DESC);

CREATE TABLE IF NOT EXISTS featured_badges (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 3),
  PRIMARY KEY(user_id,slot),
  UNIQUE(user_id,badge_id)
);

CREATE TABLE IF NOT EXISTS venue_bounty_sessions (
  id TEXT PRIMARY KEY,
  host_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  venue_name TEXT NOT NULL,
  consented_at TEXT NOT NULL,
  stars INTEGER NOT NULL DEFAULT 1 CHECK(stars BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'active',
  phase_started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  phase_ends_at TEXT NOT NULL,
  total_reward_gc INTEGER NOT NULL DEFAULT 0,
  ended_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_venue_bounty_active ON venue_bounty_sessions(status,phase_ends_at);

CREATE TABLE IF NOT EXISTS venue_bounty_participants (
  session_id TEXT NOT NULL REFERENCES venue_bounty_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('survivor','observer')),
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(session_id,user_id)
);

INSERT OR IGNORE INTO badges(id,name,description,icon,reward_credits) VALUES
  ('survivor','SURVIVOR','Complete your first consented venue bounty.','shield',0),
  ('five-star-survivor','FIVE-STAR SURVIVOR','Complete a five-star consented venue bounty.','crown',0),
  ('ghost-hunter','GHOST HUNTER','Reach Ghost Streak x5.','radar',0),
  ('cartographer','CARTOGRAPHER','Discover one hundred world cells.','map',0),
  ('bounty-hunter','BOUNTY HUNTER','Community venue bounty achievement.','badge',0);

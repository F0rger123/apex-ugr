ALTER TABLE race_contracts ADD COLUMN race_mode TEXT NOT NULL DEFAULT 'challenge';
ALTER TABLE race_contracts ADD COLUMN route_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE race_contracts ADD COLUMN max_participants INTEGER NOT NULL DEFAULT 8;
ALTER TABLE race_contracts ADD COLUMN prize_pool INTEGER NOT NULL DEFAULT 0;
ALTER TABLE race_contracts ADD COLUMN course_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE race_contracts ADD COLUMN started_at TEXT;

CREATE TABLE IF NOT EXISTS race_entries (
  race_id TEXT NOT NULL REFERENCES race_contracts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'joined',
  current_checkpoint INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  finished_at TEXT,
  elapsed_ms INTEGER,
  place INTEGER,
  payout_credits INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(race_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_race_entries_finish ON race_entries(race_id,place);

CREATE TABLE IF NOT EXISTS race_checkpoints (
  id TEXT PRIMARY KEY,
  race_id TEXT NOT NULL REFERENCES race_contracts(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL,
  label TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_race_checkpoint_order ON race_checkpoints(race_id,stop_order);

ALTER TABLE cruises ADD COLUMN destination_name TEXT NOT NULL DEFAULT '';
ALTER TABLE cruises ADD COLUMN route_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE cruises ADD COLUMN max_members INTEGER NOT NULL DEFAULT 12;

CREATE TABLE IF NOT EXISTS cruise_members (
  cruise_id TEXT NOT NULL REFERENCES cruises(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'joined',
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(cruise_id,user_id)
);

CREATE TABLE IF NOT EXISTS season_journeys (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  route_json TEXT NOT NULL DEFAULT '[]',
  distance_km REAL NOT NULL DEFAULT 0,
  reward_credits INTEGER NOT NULL DEFAULT 500,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS journey_progress (
  journey_id TEXT NOT NULL REFERENCES season_journeys(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_checkpoint INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  completed_at TEXT,
  PRIMARY KEY(journey_id,user_id)
);

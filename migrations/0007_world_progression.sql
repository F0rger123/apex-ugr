ALTER TABLE vehicles ADD COLUMN digital_twin_url TEXT;
ALTER TABLE vehicles ADD COLUMN digital_twin_status TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE invite_codes ADD COLUMN burn_after_use INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS vehicle_angles (
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  angle TEXT NOT NULL,
  media_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(vehicle_id, angle)
);

CREATE TABLE IF NOT EXISTS crews (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tag TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crew_members (
  crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(crew_id,user_id)
);

CREATE TABLE IF NOT EXISTS territories (
  id TEXT PRIMARY KEY,
  crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  radius_m REAL NOT NULL DEFAULT 1000,
  required_cells INTEGER NOT NULL DEFAULT 12,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS map_discoveries (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cell_lat INTEGER NOT NULL,
  cell_lng INTEGER NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  discovered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id,cell_lat,cell_lng)
);
CREATE INDEX IF NOT EXISTS idx_discoveries_user ON map_discoveries(user_id,discovered_at DESC);

CREATE TABLE IF NOT EXISTS territory_unlocks (
  territory_id TEXT NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(territory_id,user_id)
);

CREATE TABLE IF NOT EXISTS dead_drops (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  radius_m REAL NOT NULL DEFAULT 60,
  credits INTEGER NOT NULL DEFAULT 100,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dead_drop_claims (
  drop_id TEXT NOT NULL REFERENCES dead_drops(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(drop_id,user_id)
);

CREATE TABLE IF NOT EXISTS road_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('fixed_camera','hazard','closure','dangerous_road')),
  note TEXT NOT NULL DEFAULT '',
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_road_reports_active ON road_reports(is_active,created_at DESC);

CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  reward_credits INTEGER NOT NULL DEFAULT 5000,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS season_entries (
  season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(season_id,user_id)
);

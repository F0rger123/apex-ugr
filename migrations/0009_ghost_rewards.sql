CREATE TABLE IF NOT EXISTS drive_trace_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  speed_kph REAL NOT NULL DEFAULT 0,
  heading REAL NOT NULL DEFAULT 0,
  captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_drive_trace_session ON drive_trace_points(user_id,session_id,captured_at);

CREATE TABLE IF NOT EXISTS map_rewards (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  radius_m REAL NOT NULL DEFAULT 65,
  credits INTEGER NOT NULL DEFAULT 100,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_map_rewards_active ON map_rewards(owner_id,expires_at);

CREATE TABLE IF NOT EXISTS map_reward_claims (
  reward_id TEXT NOT NULL REFERENCES map_rewards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(reward_id,user_id)
);

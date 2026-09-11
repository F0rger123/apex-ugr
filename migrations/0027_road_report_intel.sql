-- Extend road reports with directional cameras, speed traps, police
-- sightings, expiry, and per-user "still there" confirmations. SQLite
-- can't alter an existing CHECK constraint in place, so the table is
-- rebuilt.
CREATE TABLE road_reports_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('fixed_camera','hazard','closure','dangerous_road','speed_trap','police_sighting')),
  note TEXT NOT NULL DEFAULT '',
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  heading_degrees REAL,
  is_active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO road_reports_new(id,user_id,type,note,latitude,longitude,is_active,created_at)
  SELECT id,user_id,type,note,latitude,longitude,is_active,created_at FROM road_reports;
DROP TABLE road_reports;
ALTER TABLE road_reports_new RENAME TO road_reports;
CREATE INDEX IF NOT EXISTS idx_road_reports_active ON road_reports(is_active,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_road_reports_expiry ON road_reports(expires_at);

CREATE TABLE IF NOT EXISTS road_report_confirmations (
  report_id TEXT NOT NULL REFERENCES road_reports(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(report_id,user_id)
);

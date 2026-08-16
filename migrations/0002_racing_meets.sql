ALTER TABLE users ADD COLUMN reputation INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE users ADD COLUMN decline_streak INTEGER NOT NULL DEFAULT 0;

ALTER TABLE race_contracts ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE race_contracts ADD COLUMN reschedule_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE events ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN rules TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN allow_show_cars INTEGER NOT NULL DEFAULT 1;
ALTER TABLE events ADD COLUMN allow_sponsors INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS event_locations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  location_name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  stop_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_event_locations_event ON event_locations(event_id, stop_order);

CREATE TABLE IF NOT EXISTS event_registrations (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'attendee',
  sponsor_name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations(event_id, role);

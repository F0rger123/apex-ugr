ALTER TABLE users ADD COLUMN heat INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN heat_updated_at TEXT;

CREATE TABLE IF NOT EXISTS safe_houses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_safe_houses_owner ON safe_houses(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  reward_credits INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id,badge_id)
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  metric TEXT NOT NULL,
  target INTEGER NOT NULL,
  reward_credits INTEGER NOT NULL DEFAULT 0,
  badge_id TEXT REFERENCES badges(id),
  status TEXT NOT NULL DEFAULT 'live'
);

CREATE TABLE IF NOT EXISTS contract_progress (
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  PRIMARY KEY(contract_id,user_id)
);

INSERT OR IGNORE INTO badges(id,name,description,icon,reward_credits) VALUES
  ('first-trace','FIRST TRACE','Reveal your first sector of the underground grid.','crosshair',100),
  ('ghost-runner','GHOST RUNNER','Reveal ten distinct sectors by driving.','route',500),
  ('cache-breaker','CACHE BREAKER','Recover three encrypted dead drops.','gift',750),
  ('territory-key','TERRITORY KEY','Unlock a crew territory.','shield',1000),
  ('safehouse-keeper','SAFEHOUSE KEEPER','Register your first private safe house.','garage',250);

INSERT OR IGNORE INTO contracts(id,title,description,metric,target,reward_credits,badge_id) VALUES
  ('contract-grid','GRID // TEN','Reveal ten sectors without breaking your route.','discoveries',10,500,'ghost-runner'),
  ('contract-cache','CACHE // THREE','Recover three encrypted drops from the world grid.','drops',3,1000,'cache-breaker'),
  ('contract-territory','CLAIM // ONE','Unlock one territory with your approved crew.','territories',1,1500,'territory-key'),
  ('contract-safehouse','VAULT // ONE','Register a private safe-house garage.','safe_houses',1,400,'safehouse-keeper');

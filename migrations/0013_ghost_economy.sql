CREATE TABLE IF NOT EXISTS ghost_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  activities_completed INTEGER NOT NULL DEFAULT 0,
  drops_claimed INTEGER NOT NULL DEFAULT 0,
  trails_completed INTEGER NOT NULL DEFAULT 0,
  bounty_escapes INTEGER NOT NULL DEFAULT 0,
  bounty_claims INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ghost_credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  activity_id TEXT,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ghost_transactions_user ON ghost_credit_transactions(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS ghost_shop_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'COMMON',
  price_gc INTEGER NOT NULL,
  requirement_type TEXT,
  requirement_value INTEGER NOT NULL DEFAULT 0,
  available_from TEXT,
  available_until TEXT,
  quantity_limit INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS ghost_inventory (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES ghost_shop_items(id) ON DELETE CASCADE,
  acquired_source TEXT NOT NULL,
  acquired_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  purchase_price_gc INTEGER,
  PRIMARY KEY(user_id,item_id)
);

CREATE TABLE IF NOT EXISTS ghost_equipped_items (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES ghost_shop_items(id) ON DELETE CASCADE,
  equipped_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id,category)
);

INSERT OR IGNORE INTO ghost_shop_items(id,name,description,category,rarity,price_gc,requirement_type,requirement_value,metadata_json) VALUES
  ('frame-ghost-signal','GHOST SIGNAL FRAME','A quiet cyan signal frame for your pilot card.','frame','RARE',500,NULL,0,'{"accent":"#2CFF83"}'),
  ('frame-classified','CLASSIFIED FRAME','Encrypted profile frame. Requires a Ghost Streak of five.','frame','ELITE',1250,'streak',5,'{"accent":"#E7FFE1"}'),
  ('card-blackout','BLACKOUT DRIVER CARD','Minimal black-on-black driver card skin.','card','UNCOMMON',350,NULL,0,'{}'),
  ('banner-city-grid','CITY GRID BANNER','A classified city-grid banner for your profile.','banner','RARE',700,NULL,0,'{}'),
  ('marker-ghost','GHOST MAP MARKER','Cosmetic green ghost marker. No navigation advantage.','map_marker','UNCOMMON',250,NULL,0,'{}');

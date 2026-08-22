-- Phase 2: scheduled Bounty world events, serialized cosmetics, trading,
-- referrals, Ghost progression, milestones, and vehicle legacy.

ALTER TABLE ghost_shop_items ADD COLUMN tradeable INTEGER NOT NULL DEFAULT 1;
ALTER TABLE ghost_shop_items ADD COLUMN supply_limit INTEGER;
ALTER TABLE ghost_shop_items ADD COLUMN quantity_minted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ghost_shop_items ADD COLUMN drop_source TEXT;
ALTER TABLE ghost_shop_items ADD COLUMN preview_json TEXT NOT NULL DEFAULT '{}';
UPDATE ghost_shop_items SET rarity='EPIC' WHERE rarity='ELITE';
UPDATE ghost_shop_items SET rarity='LEGENDARY' WHERE rarity IN ('MASTER','APEX');

CREATE TABLE IF NOT EXISTS network_config (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO network_config(key,value_json) VALUES
  ('bounty_world','{"cadenceHours":2,"eventDurationSeconds":2700,"starIntervalSeconds":480,"captureRadiusMeters":30,"captureDurationSeconds":30,"signalRefreshSeconds":7,"blackoutDurationSeconds":20,"rewards":[0,350,560,850,1350,2500],"hunterWaves":[0,1,3,5,7,10],"minimumHumans":2}'),
  ('referrals','{"inviterGc":350,"welcomeGc":200,"qualification":"onboarding","milestones":{"1":"350 GC","3":"SIGNAL BANNER","5":"RARE FRAME","10":"FOUNDING RECRUITER"}}'),
  ('rank_curve','[["ROOKIE",0],["BRONZE",250],["SILVER",1200],["GOLD",4200],["PLATINUM",12000],["DIAMOND",30000],["MASTER",70000],["APEX",150000]]');

UPDATE rank_thresholds SET minimum_rep=0,reward_gc=0,shop_access=0 WHERE rank='ROOKIE';
UPDATE rank_thresholds SET minimum_rep=250,reward_gc=75,shop_access=1 WHERE rank='BRONZE';
UPDATE rank_thresholds SET minimum_rep=1200,reward_gc=150,shop_access=2 WHERE rank='SILVER';
UPDATE rank_thresholds SET minimum_rep=4200,reward_gc=300,shop_access=3 WHERE rank='GOLD';
UPDATE rank_thresholds SET minimum_rep=12000,reward_gc=500,shop_access=4 WHERE rank='PLATINUM';
UPDATE rank_thresholds SET minimum_rep=30000,reward_gc=850,shop_access=5 WHERE rank='DIAMOND';
UPDATE rank_thresholds SET minimum_rep=70000,reward_gc=1400,shop_access=6 WHERE rank='MASTER';
UPDATE rank_thresholds SET minimum_rep=150000,reward_gc=2500,shop_access=7 WHERE rank='APEX';

CREATE TABLE IF NOT EXISTS bounty_world_events (
  id TEXT PRIMARY KEY,
  scheduled_at TEXT NOT NULL UNIQUE,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('scheduled','open','claimed','escaped','cancelled')),
  target_actor_id TEXT,
  star_level INTEGER NOT NULL DEFAULT 1 CHECK(star_level BETWEEN 1 AND 5),
  reward_gc INTEGER NOT NULL DEFAULT 350,
  reward_rep INTEGER NOT NULL DEFAULT 150,
  claimed_by_actor_id TEXT,
  completed_at TEXT,
  reward_ledger_key TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bounty_world_events_window ON bounty_world_events(status,starts_at,ends_at);

CREATE TABLE IF NOT EXISTS bounty_actors (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES bounty_world_events(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL CHECK(actor_type IN ('human','npc')),
  role TEXT NOT NULL CHECK(role IN ('target','hunter')),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  vehicle_label TEXT NOT NULL DEFAULT 'VEHICLE UNKNOWN',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('offered','active','declined','captured','escaped','left')),
  route_json TEXT NOT NULL DEFAULT '[]',
  route_started_at TEXT,
  speed_kph REAL NOT NULL DEFAULT 45,
  latitude REAL,
  longitude REAL,
  heading REAL NOT NULL DEFAULT 0,
  route_progress REAL NOT NULL DEFAULT 0,
  location_accuracy_m REAL,
  location_updated_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id,user_id,role)
);
CREATE INDEX IF NOT EXISTS idx_bounty_actors_event ON bounty_actors(event_id,role,status);

CREATE TABLE IF NOT EXISTS bounty_event_offers (
  event_id TEXT NOT NULL REFERENCES bounty_world_events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'hunter',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','expired')),
  offered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TEXT,
  PRIMARY KEY(event_id,user_id)
);

CREATE TABLE IF NOT EXISTS bounty_capture_locks (
  event_id TEXT NOT NULL REFERENCES bounty_world_events(id) ON DELETE CASCADE,
  hunter_actor_id TEXT NOT NULL REFERENCES bounty_actors(id) ON DELETE CASCADE,
  target_actor_id TEXT NOT NULL REFERENCES bounty_actors(id) ON DELETE CASCADE,
  locked_seconds INTEGER NOT NULL DEFAULT 0,
  lock_started_at TEXT,
  last_valid_at TEXT,
  verified_at TEXT,
  PRIMARY KEY(event_id,hunter_actor_id)
);

CREATE TABLE IF NOT EXISTS cosmetic_instances (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES ghost_shop_items(id) ON DELETE RESTRICT,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  serial_number INTEGER,
  acquired_source TEXT NOT NULL,
  acquired_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  trade_locked_until TEXT,
  UNIQUE(item_id,serial_number)
);
CREATE INDEX IF NOT EXISTS idx_cosmetic_instances_owner ON cosmetic_instances(owner_user_id,acquired_at DESC);
INSERT OR IGNORE INTO cosmetic_instances(id,item_id,owner_user_id,acquired_source,acquired_at)
  SELECT user_id||':'||item_id,item_id,user_id,acquired_source,acquired_at FROM ghost_inventory;

CREATE TABLE IF NOT EXISTS cosmetic_drops (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES ghost_shop_items(id) ON DELETE RESTRICT,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'revealed' CHECK(status IN ('pending','revealed','claimed')),
  instance_id TEXT REFERENCES cosmetic_instances(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  claimed_at TEXT,
  UNIQUE(user_id,source_type,source_id,item_id)
);

CREATE TABLE IF NOT EXISTS cosmetic_trades (
  id TEXT PRIMARY KEY,
  sender_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','cancelled','expired')),
  message TEXT NOT NULL DEFAULT '',
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TEXT,
  CHECK(sender_user_id<>recipient_user_id)
);
CREATE INDEX IF NOT EXISTS idx_cosmetic_trades_users ON cosmetic_trades(recipient_user_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS cosmetic_trade_items (
  trade_id TEXT NOT NULL REFERENCES cosmetic_trades(id) ON DELETE CASCADE,
  instance_id TEXT NOT NULL REFERENCES cosmetic_instances(id) ON DELETE RESTRICT,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY(trade_id,instance_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cosmetic_trade_pending_instance ON cosmetic_trade_items(instance_id);

CREATE TABLE IF NOT EXISTS ghost_keys (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS ghost_key_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id,source,source_id)
);

CREATE TABLE IF NOT EXISTS ghost_frequency_progress (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  unlocked_level INTEGER NOT NULL DEFAULT 1 CHECK(unlocked_level IN (1,7,13)),
  active_level INTEGER NOT NULL DEFAULT 1 CHECK(active_level IN (1,7,13)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ghost_trails (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  stages_json TEXT NOT NULL,
  reward_gc INTEGER NOT NULL DEFAULT 0,
  reward_item_id TEXT REFERENCES ghost_shop_items(id) ON DELETE SET NULL,
  required_frequency INTEGER NOT NULL DEFAULT 1,
  active_from TEXT,
  active_until TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS ghost_trail_progress (
  trail_id TEXT NOT NULL REFERENCES ghost_trails(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_stage INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed')),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  PRIMARY KEY(trail_id,user_id)
);

CREATE TABLE IF NOT EXISTS districts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region_code TEXT NOT NULL,
  total_road_cells INTEGER NOT NULL DEFAULT 1,
  mastery_reward_gc INTEGER NOT NULL DEFAULT 500
);
CREATE TABLE IF NOT EXISTS district_user_progress (
  district_id TEXT NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  roads_explored INTEGER NOT NULL DEFAULT 0,
  caches_claimed INTEGER NOT NULL DEFAULT 0,
  safe_houses_found INTEGER NOT NULL DEFAULT 0,
  contracts_completed INTEGER NOT NULL DEFAULT 0,
  meets_attended INTEGER NOT NULL DEFAULT 0,
  trails_completed INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(state IN ('UNKNOWN','DETECTED','EXPLORED','MASTERED')),
  mastery_rewarded_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(district_id,user_id)
);

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referral_code TEXT NOT NULL,
  referrer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  qualified_at TEXT,
  rewarded_at TEXT,
  reward_ledger_key TEXT UNIQUE,
  CHECK(referrer_user_id<>referred_user_id)
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id,qualified_at);

CREATE TABLE IF NOT EXISTS referral_codes (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rank_trials (
  rank TEXT PRIMARY KEY,
  requirements_json TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1
);
INSERT OR IGNORE INTO rank_trials(rank,requirements_json) VALUES
  ('DIAMOND','{"rep":30000,"meets":3,"bounty":1,"districts":1}'),
  ('MASTER','{"rep":70000,"meets":10,"bounty":3,"districts":3,"performance":1}'),
  ('APEX','{"rep":150000,"meets":25,"bounty":10,"districts":8,"performance":5}');

CREATE TABLE IF NOT EXISTS driver_milestones (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL,
  value_number REAL,
  vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  earned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id,milestone_key)
);

CREATE TABLE IF NOT EXISTS vehicle_legacy_stats (
  vehicle_id TEXT PRIMARY KEY REFERENCES vehicles(id) ON DELETE CASCADE,
  apex_miles REAL NOT NULL DEFAULT 0,
  meets INTEGER NOT NULL DEFAULT 0,
  bounty_escapes INTEGER NOT NULL DEFAULT 0,
  cotw_placements INTEGER NOT NULL DEFAULT 0,
  best_zero_sixty REAL,
  title TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS underground_broadcasts (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  data_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  source_key TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS economy_reward_claims (
  reward_key TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_gc INTEGER NOT NULL DEFAULT 0,
  amount_rep INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  source_id TEXT,
  awarded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO ghost_shop_items(id,name,description,category,rarity,price_gc,requirement_type,requirement_value,metadata_json,tradeable,supply_limit,drop_source,preview_json) VALUES
  ('coin-circuit','CIRCUIT GHOST COIN','Dark alloy token with a moving encrypted circuit edge.','coin_skin','RARE',650,NULL,0,'{"accent":"#2CFF83","effect":"circuit"}',1,2500,'shop','{"surface":"dark-metal","motion":"circuit"}'),
  ('route-white-signal','WHITE SIGNAL ROUTE','High-contrast white route line with a restrained Ghost edge.','route_line','UNCOMMON',400,NULL,0,'{"stroke":"#F4FFF5","edge":"#2CFF83"}',1,NULL,'shop','{"map":"route"}'),
  ('trail-blackout','BLACKOUT BOUNTY TRAIL','A classified wake for verified Bounty survivors.','bounty_trail','GHOST',0,'streak',7,'{"effect":"blackout"}',0,500,'bounty','{"motion":"blackout"}'),
  ('nameplate-signal','SIGNAL NAMEPLATE','Encrypted driver nameplate with a subtle data sweep.','nameplate','EPIC',1100,'rank',3,'{"effect":"scan"}',1,1500,'black_market','{"profile":"nameplate"}'),
  ('safehouse-terminal','CLASSIFIED SAFE HOUSE TERMINAL','Unlocks a classified cosmetic terminal in Safe House presentation.','safe_house','CLASSIFIED',0,'streak',10,'{"effect":"terminal"}',0,250,'contract','{"garage":"terminal"}'),
  ('emblem-season-one','UNDERGROUND AWAKENING','Season 01 driver emblem.','season_emblem','LEGENDARY',0,'rank',2,'{"season":"season-01"}',0,1000,'season','{"profile":"emblem"}'),
  ('crew-emblem-grid','GRID CREW EMBLEM','A serialized crew identity emblem.','crew_emblem','EPIC',900,'rank',2,'{"effect":"grid"}',1,2000,'shop','{"crew":"emblem"}');

INSERT OR IGNORE INTO badges(id,name,description,icon,reward_credits,category) VALUES
  ('district-scout','DISTRICT SCOUT','Explore your first district.','map',0,'exploration'),
  ('meet-regular','MEET REGULAR','Attend five verified Meets.','users',0,'meets'),
  ('meet-host','MEET HOST','Host your first Meet.','flag',0,'meets'),
  ('first-pb','FIRST PB','Record a personal performance best.','timer',0,'performance'),
  ('cache-hunter','CACHE HUNTER','Claim ten Ghost Caches.','gift',0,'ghost'),
  ('signal-breaker','SIGNAL BREAKER','Complete a Ghost Trail.','radio',0,'ghost'),
  ('founding-driver','FOUNDING DRIVER','Early Apex network driver.','crown',0,'legacy'),
  ('founding-recruiter','FOUNDING RECRUITER','Qualify ten legitimate referrals.','users',0,'social');

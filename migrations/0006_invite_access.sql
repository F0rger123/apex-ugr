CREATE TABLE IF NOT EXISTS invite_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT 'PRIVATE ACCESS',
  max_uses INTEGER NOT NULL CHECK(max_uses > 0),
  use_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_active ON invite_codes(is_active, expires_at);

CREATE TABLE IF NOT EXISTS invite_redemptions (
  code_id TEXT NOT NULL REFERENCES invite_codes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  redeemed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (code_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_invite_redemptions_code ON invite_redemptions(code_id, redeemed_at DESC);

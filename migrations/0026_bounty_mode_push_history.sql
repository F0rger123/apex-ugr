-- Bounty World/Venue mode preference, push token storage for Bounty alerts.
ALTER TABLE bounty_user_settings ADD COLUMN preferred_mode TEXT NOT NULL DEFAULT 'world';

CREATE TABLE IF NOT EXISTS push_tokens (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'unknown',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, token)
);

-- PR #23: typed garage records, durable safety acknowledgement, and richer build planner state.
-- This migration is forward-only. It is intentionally not applied by this branch.
ALTER TABLE vehicles ADD COLUMN vehicle_type TEXT NOT NULL DEFAULT 'CAR' CHECK(vehicle_type IN ('CAR','MOTORCYCLE'));
ALTER TABLE vehicles ADD COLUMN displacement_cc INTEGER;

CREATE TABLE IF NOT EXISTS user_disclaimer_acceptances (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  disclaimer_version TEXT NOT NULL,
  accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, disclaimer_version)
);
CREATE INDEX IF NOT EXISTS idx_disclaimer_acceptances_user ON user_disclaimer_acceptances(user_id, accepted_at DESC);

ALTER TABLE mod_wishlist ADD COLUMN installed_at TEXT;
ALTER TABLE mod_wishlist ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_mod_wishlist_vehicle_status_order
  ON mod_wishlist(vehicle_id, user_id, installed, sort_order, created_at DESC);

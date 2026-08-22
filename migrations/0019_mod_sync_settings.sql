ALTER TABLE apex_user_settings ADD COLUMN mod_sync_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE apex_user_settings ADD COLUMN mod_price_alerts_enabled INTEGER NOT NULL DEFAULT 1;

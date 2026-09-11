-- Recurring meets: a host can mark a meet weekly/biweekly. Occurrences
-- are generated lazily (server-side, on next read) rather than via a
-- background job, matching the existing Bounty World event pattern.
ALTER TABLE events ADD COLUMN recurrence TEXT NOT NULL DEFAULT 'none';
ALTER TABLE events ADD COLUMN recurrence_root_id TEXT REFERENCES events(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_events_recurrence ON events(recurrence,starts_at);

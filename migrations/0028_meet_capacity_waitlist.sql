-- Optional meet capacity with an automatic waitlist.
ALTER TABLE events ADD COLUMN max_attendees INTEGER;
ALTER TABLE event_rsvps ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed';
CREATE INDEX IF NOT EXISTS idx_event_rsvps_status ON event_rsvps(event_id,status);

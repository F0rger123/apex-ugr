-- Waze-style crowd moderation: pilots can dispute a report as gone/wrong,
-- same idempotent-per-user pattern as road_report_confirmations.
CREATE TABLE IF NOT EXISTS road_report_disputes (
  report_id TEXT NOT NULL REFERENCES road_reports(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(report_id,user_id)
);

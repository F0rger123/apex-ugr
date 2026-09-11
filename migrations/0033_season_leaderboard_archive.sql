-- Hall of Fame: archived top standings for seasons that have ended.
-- Purely additive -- never touches live users.points/reputation, only
-- snapshots season_entries.points (already season-scoped) once a season
-- closes.
CREATE TABLE IF NOT EXISTS season_leaderboard_archive (
  season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  points INTEGER NOT NULL,
  archived_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(season_id,rank)
);

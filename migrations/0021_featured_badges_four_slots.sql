CREATE TABLE featured_badges_v2 (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 4),
  PRIMARY KEY(user_id,slot),
  UNIQUE(user_id,badge_id)
);

INSERT INTO featured_badges_v2(user_id,badge_id,slot)
SELECT user_id,badge_id,slot FROM featured_badges WHERE slot BETWEEN 1 AND 4;

DROP TABLE featured_badges;
ALTER TABLE featured_badges_v2 RENAME TO featured_badges;

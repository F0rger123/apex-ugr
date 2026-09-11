-- Per-post unique-viewer counts, visible only to the post's own author.
CREATE TABLE IF NOT EXISTS post_views (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(post_id,user_id)
);

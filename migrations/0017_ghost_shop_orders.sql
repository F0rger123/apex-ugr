CREATE TABLE IF NOT EXISTS ghost_shop_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES ghost_shop_items(id) ON DELETE RESTRICT,
  cost_gc INTEGER NOT NULL CHECK(cost_gc >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, item_id)
);

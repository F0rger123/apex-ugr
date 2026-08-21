import sys

code = open('functions/api/[[path]].ts', 'r').read()

shop_handlers = '''
  // =========================================================================
  // GHOST SHOP & VAULT ENDPOINTS
  // =========================================================================
  if (path === 'ghost-shop/catalog' && method === 'GET') {
    const items = await env.DB.prepare(`SELECT * FROM ghost_shop_items ORDER BY price_gc ASC`).all();
    const inventory = await env.DB.prepare(`SELECT item_id FROM ghost_inventory WHERE user_id = ?`).bind(user.id).all();
    const equipped = await env.DB.prepare(`SELECT * FROM ghost_equipped_items WHERE user_id = ?`).bind(user.id).all();

    return json({
      items: items.results,
      ownedItemIds: inventory.results.map((i: any) => i.item_id),
      equipped: equipped.results,
      gcBalance: user.credits || 1000
    });
  }

  if (path === 'ghost-shop/buy' && method === 'POST') {
    const body = await request.json<any>();
    const itemId = body.itemId;

    const item = await env.DB.prepare(`SELECT * FROM ghost_shop_items WHERE id = ?`).bind(itemId).first<any>();
    if (!item) return json({ error: 'Shop item not found.' }, 404);

    const owned = await env.DB.prepare(`SELECT 1 FROM ghost_inventory WHERE user_id = ? AND item_id = ?`).bind(user.id, itemId).first<any>();
    if (owned) return json({ error: 'You already own this item.' }, 400);

    const price = item.price_gc || 0;
    if ((user.credits || 0) < price) {
      return json({ error: 'Insufficient Ghost Credits balance.' }, 400);
    }

    const txId = crypto.randomUUID();

    await env.DB.batch([
      env.DB.prepare(`UPDATE users SET credits = credits - ? WHERE id = ?`).bind(price, user.id),
      env.DB.prepare(`INSERT INTO ghost_inventory (user_id, item_id, acquired_source) VALUES (?, ?, 'shop_purchase')`).bind(user.id, itemId),
      env.DB.prepare(`INSERT INTO ghost_credit_transactions (id, user_id, amount_gc, transaction_type, reference_id) VALUES (?, ?, ?, 'SHOP_BUY', ?)`).bind(txId, user.id, -price, itemId)
    ]);

    const updatedUser = await env.DB.prepare(`SELECT credits FROM users WHERE id = ?`).bind(user.id).first<any>();

    return json({
      success: true,
      itemId,
      newGcBalance: updatedUser?.credits || 0
    });
  }

  if (path === 'ghost-shop/equip' && method === 'POST') {
    const body = await request.json<any>();
    const { itemId, category } = body;

    await env.DB.prepare(`
      INSERT INTO ghost_equipped_items (user_id, category, item_id, equipped_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, category) DO UPDATE SET item_id = excluded.item_id, equipped_at = CURRENT_TIMESTAMP
    `).bind(user.id, category || 'card', itemId).run();

    return json({ success: true, itemId, category });
  }
'''

target = "return json({ error: 'Not found.' }, 404);"
if target in code:
    code = code.replace(target, shop_handlers + "\n  " + target)
    open('functions/api/[[path]].ts', 'w').write(code)
    print("Added Ghost Shop API handlers successfully.")
else:
    print("Target string not found.")

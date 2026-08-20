import sys

code = open('functions/api/[[path]].ts', 'r').read()

handlers = '''
  // =========================================================================
  // MEETS EXPANSION ENDPOINTS
  // =========================================================================
  if (path === 'meets' && method === 'GET') {
    const rows = await env.DB.prepare(`
      SELECT e.*, u.username host_name,
        (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.id) going_count
      FROM events e
      JOIN users u ON u.id = e.host_id
      ORDER BY e.starts_at ASC
      LIMIT 100
    `).all();

    return json({ meets: rows.results });
  }

  const meetAttendeesMatch = path.match(/^meets\\/([^/]+)\\/attendees$/);
  if (meetAttendeesMatch && method === 'GET') {
    const meetId = meetAttendeesMatch[1];
    const attendees = await env.DB.prepare(`
      SELECT r.user_id, r.role, r.created_at, u.username, u.avatar_url, u.tier,
        v.id vehicle_id, v.year, v.make, v.model, v.trim, v.color, v.photo_url
      FROM event_registrations r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN vehicles v ON v.user_id = u.id AND v.is_active = 1
      WHERE r.event_id = ?
    `).bind(meetId).all();

    return json({ attendees: attendees.results });
  }

  const meetCheckinMatch = path.match(/^meets\\/([^/]+)\\/checkin$/);
  if (meetCheckinMatch && method === 'POST') {
    const meetId = meetCheckinMatch[1];
    const body = await request.json<any>();
    const lat = Number(body.latitude);
    const lng = Number(body.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return json({ error: 'Valid GPS latitude and longitude required for check-in.' }, 400);
    }

    const event = await env.DB.prepare(`SELECT * FROM events WHERE id = ?`).bind(meetId).first<any>();
    if (!event) return json({ error: 'Meet not found.' }, 404);

    const activeVehicle = await env.DB.prepare(`SELECT id FROM vehicles WHERE user_id = ? AND is_active = 1 LIMIT 1`).bind(user.id).first<any>();

    await env.DB.prepare(`
      INSERT INTO meet_checkins (event_id, user_id, vehicle_id, checked_in_at, latitude, longitude)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
      ON CONFLICT(event_id, user_id) DO UPDATE SET checked_in_at = CURRENT_TIMESTAMP, latitude = excluded.latitude, longitude = excluded.longitude
    `).bind(meetId, user.id, activeVehicle?.id || null, lat, lng).run();

    // Award +100 REP for checking in
    await env.DB.prepare(`UPDATE users SET points = points + 100 WHERE id = ?`).bind(user.id).run();

    return json({ success: true, repAwarded: 100, xpAwarded: 200 });
  }

  // =========================================================================
  // VEHICLE WISHLIST & BUILD PLANNER ENDPOINTS
  // =========================================================================
  const vehicleWishlistMatch = path.match(/^vehicles\\/([^/]+)\\/wishlist$/);
  if (vehicleWishlistMatch) {
    const vehicleId = vehicleWishlistMatch[1];

    if (method === 'GET') {
      const rows = await env.DB.prepare(`SELECT * FROM mod_wishlist WHERE vehicle_id = ? ORDER BY created_at DESC`).bind(vehicleId).all();
      return json({ wishlist: rows.results });
    }

    if (method === 'POST') {
      const body = await request.json<any>();
      if (!body.part) return json({ error: 'Part name is required.' }, 400);

      const id = body.id || crypto.randomUUID();
      await env.DB.prepare(`
        INSERT INTO mod_wishlist (id, vehicle_id, user_id, part, brand, category, price, url, priority, notes, purchased, installed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          part = excluded.part, brand = excluded.brand, category = excluded.category,
          price = excluded.price, url = excluded.url, priority = excluded.priority,
          notes = excluded.notes, purchased = excluded.purchased, installed = excluded.installed
      `).bind(
        id, vehicleId, user.id, body.part, body.brand || '', body.category || 'Other',
        Number(body.price) || 0, body.url || '', body.priority || 'MEDIUM',
        body.notes || '', body.purchased ? 1 : 0, body.installed ? 1 : 0
      ).run();

      return json({ success: true, id });
    }
  }

  const vehicleWishlistDeleteMatch = path.match(/^vehicles\\/([^/]+)\\/wishlist\\/([^/]+)$/);
  if (vehicleWishlistDeleteMatch && method === 'DELETE') {
    const [, vehicleId, itemId] = vehicleWishlistDeleteMatch;
    await env.DB.prepare(`DELETE FROM mod_wishlist WHERE id = ? AND user_id = ?`).bind(itemId, user.id).run();
    return json({ success: true });
  }

  const vehicleBuildPlansMatch = path.match(/^vehicles\\/([^/]+)\\/build-plans$/);
  if (vehicleBuildPlansMatch) {
    const vehicleId = vehicleBuildPlansMatch[1];

    if (method === 'GET') {
      const plans = await env.DB.prepare(`SELECT * FROM build_plans WHERE vehicle_id = ? ORDER BY created_at DESC`).bind(vehicleId).all();
      const planList = [];
      for (const plan of plans.results as any[]) {
        const parts = await env.DB.prepare(`SELECT * FROM build_plan_parts WHERE plan_id = ?`).bind(plan.id).all();
        planList.push({ ...plan, parts: parts.results });
      }
      return json({ plans: planList });
    }

    if (method === 'POST') {
      const body = await request.json<any>();
      const planId = body.id || crypto.randomUUID();

      await env.DB.prepare(`
        INSERT INTO build_plans (id, vehicle_id, user_id, plan_name, is_public, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET plan_name = excluded.plan_name, is_public = excluded.is_public, notes = excluded.notes
      `).bind(planId, vehicleId, user.id, body.planName || 'CUSTOM', body.isPublic === false ? 0 : 1, body.notes || '').run();

      if (Array.isArray(body.parts)) {
        await env.DB.prepare(`DELETE FROM build_plan_parts WHERE plan_id = ?`).bind(planId).run();
        for (const p of body.parts) {
          const partId = crypto.randomUUID();
          await env.DB.prepare(`
            INSERT INTO build_plan_parts (id, plan_id, part_name, brand, category, cost, purchased, installed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(partId, planId, p.partName, p.brand || '', p.category || 'Other', Number(p.cost) || 0, p.purchased ? 1 : 0, p.installed ? 1 : 0).run();
        }
      }

      return json({ success: true, id: planId });
    }
  }

  // =========================================================================
  // PERFORMANCE & TIMING ENDPOINTS
  // =========================================================================
  if (path === 'performance/records' && method === 'GET') {
    const rows = await env.DB.prepare(`
      SELECT p.*, v.year, v.make, v.model, v.color
      FROM personal_performance_records p
      JOIN vehicles v ON v.id = p.vehicle_id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).bind(user.id).all();

    return json({ records: rows.results });
  }

  if (path === 'performance/records' && method === 'POST') {
    const body = await request.json<any>();
    if (!body.vehicleId || !body.runType || !body.resultSeconds) {
      return json({ error: 'Vehicle, run type, and result seconds required.' }, 400);
    }

    const id = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO personal_performance_records
        (id, user_id, vehicle_id, run_type, result_seconds, gps_confidence_pct, evidence_url, verification_status, event_context, unit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, user.id, body.vehicleId, body.runType, Number(body.resultSeconds),
      Number(body.gpsConfidencePct) || 100, body.evidenceUrl || null,
      body.verificationStatus || 'private', body.eventContext || null, body.unit || 'MPH'
    ).run();

    return json({ success: true, id });
  }

  if (path === 'performance/leaderboards' && method === 'GET') {
    const rows = await env.DB.prepare(`
      SELECT p.*, u.username, u.avatar_url, v.year, v.make, v.model
      FROM personal_performance_records p
      JOIN users u ON u.id = p.user_id
      JOIN vehicles v ON v.id = p.vehicle_id
      WHERE p.verification_status = 'verified'
      ORDER BY p.result_seconds ASC
      LIMIT 100
    `).all();

    return json({ leaderboard: rows.results });
  }
'''

target = "return json({ error: 'Not found.' }, 404);"
if target in code:
    code = code.replace(target, handlers + "\n  " + target)
    open('functions/api/[[path]].ts', 'w').write(code)
    print("Added Meets, Wishlist, Build Planner & Performance handlers successfully.")
else:
    print("Target string not found.")

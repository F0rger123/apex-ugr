import sys

code = open('functions/api/[[path]].ts', 'r').read()

handlers = '''
  // =========================================================================
  // CAR OF THE WEEK ENDPOINTS
  // =========================================================================
  if (path === 'cotw/active' && method === 'GET') {
    const now = new Date();
    const year = now.getUTCFullYear();
    const oneJan = new Date(Date.UTC(year, 0, 1));
    const weekNum = Math.ceil((((now.getTime() - oneJan.getTime()) / 86400000) + oneJan.getUTCDay() + 1) / 7);
    const weekIdentifier = `${year}-W${String(weekNum).padStart(2, '0')}`;

    const [submissions, myVotes, mySubmissions] = await Promise.all([
      env.DB.prepare(`SELECT s.*, u.username, u.avatar_url, v.photo_url vehicle_photo
        FROM car_of_the_week_submissions s
        JOIN users u ON u.id = s.user_id
        JOIN vehicles v ON v.id = s.vehicle_id
        WHERE s.week_identifier = ?
        ORDER BY s.votes_count DESC`).bind(weekIdentifier).all(),
      env.DB.prepare(`SELECT category, submission_id FROM car_of_the_week_votes WHERE week_identifier = ? AND voter_user_id = ?`).bind(weekIdentifier, user.id).all(),
      env.DB.prepare(`SELECT * FROM car_of_the_week_submissions WHERE week_identifier = ? AND user_id = ?`).bind(weekIdentifier, user.id).all(),
    ]);

    return json({
      weekIdentifier,
      submissions: submissions.results.map((s: any) => ({
        ...s,
        media_urls: JSON.parse(s.media_urls_json || '[]')
      })),
      myVotes: myVotes.results,
      mySubmissions: mySubmissions.results
    });
  }

  if (path === 'cotw/submit' && method === 'POST') {
    const body = await request.json<any>();
    if (!body.category || !body.vehicleId || !body.yearMakeModel) {
      return json({ error: 'Category, vehicle, and details required.' }, 400);
    }
    const now = new Date();
    const year = now.getUTCFullYear();
    const oneJan = new Date(Date.UTC(year, 0, 1));
    const weekNum = Math.ceil((((now.getTime() - oneJan.getTime()) / 86400000) + oneJan.getUTCDay() + 1) / 7);
    const weekIdentifier = `${year}-W${String(weekNum).padStart(2, '0')}`;

    const id = crypto.randomUUID();
    const mediaUrlsJson = JSON.stringify(body.mediaUrls || []);

    await env.DB.prepare(`
      INSERT INTO car_of_the_week_submissions (id, week_identifier, category, user_id, vehicle_id, year_make_model, media_urls_json, description, build_info)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(week_identifier, category, user_id) DO UPDATE SET
        vehicle_id = excluded.vehicle_id,
        year_make_model = excluded.year_make_model,
        media_urls_json = excluded.media_urls_json,
        description = excluded.description,
        build_info = excluded.build_info
    `).bind(id, weekIdentifier, body.category, user.id, body.vehicleId, body.yearMakeModel, mediaUrlsJson, body.description || '', body.buildInfo || '').run();

    return json({ success: true, id });
  }

  if (path === 'cotw/vote' && method === 'POST') {
    const body = await request.json<any>();
    if (!body.submissionId || !body.category || !body.weekIdentifier) {
      return json({ error: 'Submission ID, category, and week identifier required.' }, 400);
    }

    try {
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO car_of_the_week_votes (submission_id, week_identifier, category, voter_user_id) VALUES (?, ?, ?, ?)`)\
          .bind(body.submissionId, body.weekIdentifier, body.category, user.id),
        env.DB.prepare(`UPDATE car_of_the_week_submissions SET votes_count = votes_count + 1 WHERE id = ?`)\
          .bind(body.submissionId)
      ]);
      return json({ success: true });
    } catch (e) {
      return json({ error: 'You have already voted in this category for this week.' }, 400);
    }
  }

  if (path === 'cotw/archive' && method === 'GET') {
    const rows = await env.DB.prepare(`
      SELECT w.*, u.username, v.year, v.make, v.model, s.media_urls_json
      FROM car_of_the_week_winners w
      JOIN users u ON u.id = w.user_id
      JOIN vehicles v ON v.id = w.vehicle_id
      LEFT JOIN car_of_the_week_submissions s ON s.id = w.submission_id
      ORDER BY w.created_at DESC
      LIMIT 50
    `).all();
    return json({ winners: rows.results.map((r: any) => ({ ...r, media_urls: JSON.parse(r.media_urls_json || '[]') })) });
  }

  // =========================================================================
  // APEX SEASONS ENDPOINTS
  // =========================================================================
  if (path === 'seasons/active' && method === 'GET') {
    const season = await env.DB.prepare(`SELECT * FROM apex_seasons WHERE is_active = 1 ORDER BY season_number DESC LIMIT 1`).first<any>();
    if (!season) return json({ error: 'No active season.' }, 404);

    let progress = await env.DB.prepare(`SELECT * FROM season_user_progress WHERE user_id = ? AND season_id = ?`).bind(user.id, season.id).first<any>();
    if (!progress) {
      await env.DB.prepare(`INSERT INTO season_user_progress (user_id, season_id, xp, level) VALUES (?, ?, 0, 1)`).bind(user.id, season.id).run();
      progress = { user_id: user.id, season_id: season.id, xp: 0, level: 1, claimed_levels_json: '[]', has_premium_track: 0 };
    }

    const challenges = await env.DB.prepare(`
      SELECT c.*, COALESCE(p.current_count, 0) current_count, COALESCE(p.is_completed, 0) is_completed
      FROM season_challenges c
      LEFT JOIN season_challenge_progress p ON p.challenge_id = c.id AND p.user_id = ?
      WHERE c.season_id = ?
    `).bind(user.id, season.id).all();

    return json({
      season: { ...season, rewards: JSON.parse(season.rewards_json || '[]') },
      progress: { ...progress, claimed_levels: JSON.parse(progress.claimed_levels_json || '[]') },
      challenges: challenges.results
    });
  }

  if (path === 'seasons/add-xp' && method === 'POST') {
    const body = await request.json<any>();
    const amount = Math.max(1, Math.min(5000, Number(body.amount) || 50));
    const season = await env.DB.prepare(`SELECT id FROM apex_seasons WHERE is_active = 1 LIMIT 1`).first<any>();
    if (!season) return json({ error: 'No active season.' }, 404);

    const prog = await env.DB.prepare(`SELECT * FROM season_user_progress WHERE user_id = ? AND season_id = ?`).bind(user.id, season.id).first<any>() || { xp: 0, level: 1 };
    const newXp = (prog.xp || 0) + amount;
    const newLevel = Math.floor(newXp / 1000) + 1;

    await env.DB.prepare(`
      INSERT INTO season_user_progress (user_id, season_id, xp, level, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, season_id) DO UPDATE SET xp = excluded.xp, level = excluded.level, updated_at = CURRENT_TIMESTAMP
    `).bind(user.id, season.id, newXp, newLevel).run();

    return json({ success: true, xp: newXp, level: newLevel, xpAdded: amount });
  }

  if (path === 'seasons/claim' && method === 'POST') {
    const body = await request.json<any>();
    const levelToClaim = Number(body.level);
    const season = await env.DB.prepare(`SELECT * FROM apex_seasons WHERE is_active = 1 LIMIT 1`).first<any>();
    if (!season) return json({ error: 'No active season.' }, 404);

    const prog = await env.DB.prepare(`SELECT * FROM season_user_progress WHERE user_id = ? AND season_id = ?`).bind(user.id, season.id).first<any>();
    if (!prog || prog.level < levelToClaim) return json({ error: 'Level not unlocked.' }, 400);

    const claimed: number[] = JSON.parse(prog.claimed_levels_json || '[]');
    if (claimed.includes(levelToClaim)) return json({ error: 'Level reward already claimed.' }, 400);

    claimed.push(levelToClaim);
    await env.DB.prepare(`UPDATE season_user_progress SET claimed_levels_json = ? WHERE user_id = ? AND season_id = ?`).bind(JSON.stringify(claimed), user.id, season.id).run();

    return json({ success: true, claimedLevels: claimed });
  }

  // =========================================================================
  // DAILY GHOST CHEST ENDPOINTS
  // =========================================================================
  if (path === 'daily-chest/status' && method === 'GET') {
    const today = new Date().toISOString().split('T')[0];
    const chest = await env.DB.prepare(`SELECT * FROM daily_ghost_chests WHERE user_id = ?`).bind(user.id).first<any>();

    const available = !chest || chest.last_claimed_date !== today;
    const streak = chest ? chest.streak_count : 0;

    return json({
      available,
      today,
      lastClaimedDate: chest?.last_claimed_date || null,
      streakCount: streak
    });
  }

  if (path === 'daily-chest/claim' && method === 'POST') {
    const today = new Date().toISOString().split('T')[0];
    const chest = await env.DB.prepare(`SELECT * FROM daily_ghost_chests WHERE user_id = ?`).bind(user.id).first<any>();

    if (chest && chest.last_claimed_date === today) {
      return json({ error: 'Daily Ghost Chest already claimed today.' }, 400);
    }

    let streak = 1;
    if (chest) {
      const last = new Date(chest.last_claimed_date);
      const curr = new Date(today);
      const diffDays = Math.round((curr.getTime() - last.getTime()) / (1000 * 3600 * 24));

      if (diffDays === 1) {
        streak = chest.streak_count + 1;
      } else if (diffDays === 2 && chest.grace_available) {
        // Grace period preserved streak!
        streak = chest.streak_count + 1;
      } else {
        // Forgiving streak decay (decay by 1 instead of resetting to 0)
        streak = Math.max(1, chest.streak_count - 1);
      }
    }

    // Roll rarity
    const rand = Math.random();
    let rarity = 'COMMON';
    let gcReward = 100;
    let xpReward = 150;

    if (streak % 7 === 0 || rand > 0.99) {
      rarity = 'CLASSIFIED';
      gcReward = 2000;
      xpReward = 2500;
    } else if (rand > 0.93) {
      rarity = 'LEGENDARY';
      gcReward = 1000;
      xpReward = 1200;
    } else if (rand > 0.80) {
      rarity = 'EPIC';
      gcReward = 500;
      xpReward = 600;
    } else if (rand > 0.50) {
      rarity = 'RARE';
      gcReward = 250;
      xpReward = 300;
    }

    const claimId = crypto.randomUUID();

    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO daily_ghost_chests (user_id, last_claimed_date, streak_count, grace_available, updated_at)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET last_claimed_date = excluded.last_claimed_date, streak_count = excluded.streak_count, updated_at = CURRENT_TIMESTAMP
      `).bind(user.id, today, streak),
      env.DB.prepare(`
        INSERT INTO daily_ghost_claims (id, user_id, claim_date, streak_day, rarity, reward_type, reward_value)
        VALUES (?, ?, ?, ?, ?, 'gc', ?)
      `).bind(claimId, user.id, today, streak, rarity, gcReward)
    ]);

    await grantGhostCredits(user.id, gcReward, `DAILY GHOST CHEST (${rarity})`, claimId, env);

    return json({
      success: true,
      claim: {
        id: claimId,
        rarity,
        streakDay: streak,
        gcReward,
        xpReward,
        itemReward: rarity === 'CLASSIFIED' || rarity === 'LEGENDARY' ? `card-${rarity.toLowerCase()}` : null
      }
    });
  }
'''

target = "return json({ error: 'Not found.' }, 404);"
if target in code:
    code = code.replace(target, handlers + "\n  " + target)
    open('functions/api/[[path]].ts', 'w').write(code)
    print("Added COTW, Seasons, and Daily Chest handlers successfully.")
else:
    print("Target string not found.")

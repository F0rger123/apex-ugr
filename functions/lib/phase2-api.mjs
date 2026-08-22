import {
  BOUNTY_DEFAULTS, bountyWindow, captureProgress, deterministicIndex, directionBetween,
  frequencyForProgress, hunterWaveForStar, npcPosition, rewardForStar, signalForDistance,
  starForElapsed,
} from './phase2-core.mjs';

const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });

function parseJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function parseTime(value) {
  if (!value) return NaN;
  const normalized = typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(' ', 'T')}Z`
    : value;
  return Date.parse(normalized);
}

async function config(env, key, fallback) {
  const row = await env.DB.prepare('SELECT value_json FROM network_config WHERE key=?').bind(key).first();
  return { ...fallback, ...parseJson(row?.value_json, {}) };
}

async function award(env, userId, gc, rep, source, sourceId, rewardKey) {
  const claim = await env.DB.prepare(`INSERT OR IGNORE INTO economy_reward_claims(reward_key,user_id,amount_gc,amount_rep,source,source_id) VALUES(?,?,?,?,?,?)`)
    .bind(rewardKey, userId, gc, rep, source, sourceId).run();
  if (!claim.meta.changes) return { awarded: false };
  await env.DB.prepare('INSERT OR IGNORE INTO ghost_profiles(user_id) VALUES(?)').bind(userId).run();
  const balance = await env.DB.prepare('SELECT credits FROM ghost_profiles WHERE user_id=?').bind(userId).first();
  const before = Number(balance?.credits || 0);
  await env.DB.batch([
    env.DB.prepare('UPDATE ghost_profiles SET credits=credits+?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?').bind(gc, userId),
    env.DB.prepare('UPDATE users SET points=points+? WHERE id=?').bind(rep, userId),
    env.DB.prepare('INSERT INTO ghost_credit_transactions(id,user_id,amount,source,activity_id,balance_before,balance_after) VALUES(?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), userId, gc, source, sourceId, before, before + gc),
  ]);
  return { awarded: true, balance: before + gc };
}

function destinationPoint(latitude, longitude, distanceMeters, bearingDegrees) {
  const radius = 6371000;
  const delta = distanceMeters / radius;
  const theta = bearingDegrees * Math.PI / 180;
  const lat1 = latitude * Math.PI / 180;
  const lng1 = longitude * Math.PI / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(delta) + Math.cos(lat1) * Math.sin(delta) * Math.cos(theta));
  const lng2 = lng1 + Math.atan2(Math.sin(theta) * Math.sin(delta) * Math.cos(lat1), Math.cos(delta) - Math.sin(lat1) * Math.sin(lat2));
  return { latitude: lat2 * 180 / Math.PI, longitude: lng2 * 180 / Math.PI };
}

async function roadRoute(anchor, seed) {
  const bearing = deterministicIndex(seed, 360);
  const a = destinationPoint(anchor.latitude, anchor.longitude, 4500, bearing);
  const b = destinationPoint(anchor.latitude, anchor.longitude, 6500, (bearing + 95) % 360);
  const c = destinationPoint(anchor.latitude, anchor.longitude, 4000, (bearing + 205) % 360);
  const path = [anchor, a, b, c, anchor].map(point => `${point.longitude},${point.latitude}`).join(';');
  for (const provider of ['https://router.project-osrm.org', 'https://routing.openstreetmap.de/routed-car']) {
    try {
      const request = await fetch(`${provider}/route/v1/driving/${path}?overview=full&geometries=geojson`, { headers: { 'User-Agent': 'ApexUGR/2.0' } });
      const payload = await request.json();
      const coordinates = payload.routes?.[0]?.geometry?.coordinates;
      if (request.ok && Array.isArray(coordinates) && coordinates.length > 4) return coordinates.map(([longitude, latitude]) => ({ latitude, longitude }));
    } catch { /* Try the next road router. */ }
  }
  throw new Error('Road routing is unavailable for the Bounty NPC network.');
}

async function ensureEvent(env, requestingUserId) {
  const now = Date.now();
  const cfg = await config(env, 'bounty_world', BOUNTY_DEFAULTS);
  const window = bountyWindow(now, cfg.cadenceHours);
  let event = await env.DB.prepare('SELECT * FROM bounty_world_events WHERE id=?').bind(window.key).first();
  if (!event) {
    const startsAt = new Date(window.startMs).toISOString();
    const endsAt = new Date(window.startMs + Number(cfg.eventDurationSeconds) * 1000).toISOString();
    await env.DB.prepare(`INSERT OR IGNORE INTO bounty_world_events(id,scheduled_at,starts_at,ends_at,status,reward_gc,reward_rep) VALUES(?,?,?,?,?,?,?)`)
      .bind(window.key, startsAt, startsAt, endsAt, now < parseTime(endsAt) ? 'open' : 'escaped', rewardForStar(1, cfg.rewards), 150).run();
    event = await env.DB.prepare('SELECT * FROM bounty_world_events WHERE id=?').bind(window.key).first();
  }
  if (!event.target_actor_id && event.status === 'open') {
    const eligible = await env.DB.prepare(`SELECT u.id,u.username,u.tier,l.latitude,l.longitude,v.year,v.make,v.model
      FROM bounty_user_settings s JOIN users u ON u.id=s.user_id
      JOIN driver_locations l ON l.user_id=u.id
      LEFT JOIN vehicles v ON v.user_id=u.id AND v.is_active=1
      WHERE s.bounty_mode_enabled=1 AND s.agreed_at IS NOT NULL AND l.drive_mode=1 AND l.expires_at>?
      ORDER BY u.id`).bind(new Date(now).toISOString()).all();
    const humans = eligible.results || [];
    const callerLocation = await env.DB.prepare('SELECT latitude,longitude FROM driver_locations WHERE user_id=?').bind(requestingUserId).first();
    const anchor = humans[0] || callerLocation || { latitude: 39.9526, longitude: -75.1652 };
    const useHuman = humans.length >= Number(cfg.minimumHumans || 2);
    const selected = useHuman ? humans[deterministicIndex(window.key, humans.length)] : null;
    const actorId = `${window.key}-target`;
    const route = selected ? [] : await roadRoute(anchor, `${window.key}-target`);
    await env.DB.batch([
      env.DB.prepare(`INSERT OR IGNORE INTO bounty_actors(id,event_id,actor_type,role,user_id,display_name,vehicle_label,status,route_json,route_started_at,speed_kph,latitude,longitude,location_updated_at)
        VALUES(?,?,?,'target',?,?,?,?,?,?,52,?,?,?)`).bind(actorId, window.key, selected ? 'human' : 'npc', selected?.id || null, selected?.username || 'GHOST ZERO', selected ? [selected.year, selected.make, selected.model].filter(Boolean).join(' ') || 'VEHICLE UNKNOWN' : 'NPC // BLACK COUPE', 'active', JSON.stringify(route), startsAtFor(event), Number(anchor.latitude), Number(anchor.longitude), new Date(now).toISOString()),
      env.DB.prepare('UPDATE bounty_world_events SET target_actor_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND target_actor_id IS NULL').bind(actorId, window.key),
    ]);
    await ensureNpcHunters(env, event, route, anchor, hunterWaveForStar(1, cfg.hunterWaves), now);
    event = await env.DB.prepare('SELECT * FROM bounty_world_events WHERE id=?').bind(window.key).first();
  }
  if (event?.status === 'open') {
    await env.DB.prepare(`INSERT OR IGNORE INTO bounty_event_offers(event_id,user_id,role)
      SELECT ?,s.user_id,'hunter' FROM bounty_user_settings s
      WHERE s.bounty_mode_enabled=1 AND s.agreed_at IS NOT NULL
        AND s.user_id<>COALESCE((SELECT user_id FROM bounty_actors WHERE id=?),'')`).bind(window.key, event.target_actor_id || '').run();
  }
  return { event, cfg, window };
}

function startsAtFor(event) { return event?.starts_at || new Date().toISOString(); }

async function ensureNpcHunters(env, event, targetRoute, anchor, desired, now) {
  const current = await env.DB.prepare(`SELECT COUNT(*) count FROM bounty_actors WHERE event_id=? AND role='hunter' AND actor_type='npc'`).bind(event.id).first();
  const missing = Math.max(0, desired - Number(current?.count || 0));
  for (let index = 0; index < missing; index++) {
    const ordinal = Number(current?.count || 0) + index + 1;
    const id = `${event.id}-npc-h${ordinal}`;
    let route = targetRoute;
    if (!route?.length) route = await roadRoute(anchor, id);
    await env.DB.prepare(`INSERT OR IGNORE INTO bounty_actors(id,event_id,actor_type,role,display_name,vehicle_label,status,route_json,route_started_at,speed_kph,latitude,longitude,location_updated_at)
      VALUES(?,?,'npc','hunter',?,?,'active',?,?,?,?,?,?)`).bind(id, event.id, `SPECTER ${String(ordinal).padStart(2, '0')}`, 'NPC // INTERCEPTOR', JSON.stringify(route), new Date(parseTime(event.starts_at) + ordinal * 45000).toISOString(), 48 + ordinal * 1.5, Number(anchor.latitude), Number(anchor.longitude), new Date(now).toISOString()).run();
  }
}

async function advanceEvent(env, event, cfg) {
  const now = Date.now();
  if (!event || !['open'].includes(event.status)) return event;
  if (now >= parseTime(event.ends_at)) {
    const closed = await env.DB.prepare(`UPDATE bounty_world_events SET status='escaped',completed_at=CURRENT_TIMESTAMP,reward_ledger_key=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='open'`).bind(`bounty:${event.id}:escape`, event.id).run();
    if (closed.meta.changes) {
      const target = await env.DB.prepare('SELECT * FROM bounty_actors WHERE id=?').bind(event.target_actor_id).first();
      if (target?.user_id) await award(env, target.user_id, Number(event.reward_gc), Number(event.reward_rep), 'BOUNTY WORLD ESCAPE', event.id, `bounty:${event.id}:escape:${target.user_id}`);
      await env.DB.prepare(`UPDATE bounty_actors SET status='escaped' WHERE id=?`).bind(event.target_actor_id).run();
      await broadcast(env, 'bounty_escape', target?.user_id, `${target?.display_name || 'GHOST ZERO'} SURVIVED ${'★'.repeat(Number(event.star_level))}`, event.id);
    }
    return env.DB.prepare('SELECT * FROM bounty_world_events WHERE id=?').bind(event.id).first();
  }
  const star = starForElapsed((now - parseTime(event.starts_at)) / 1000, Number(cfg.starIntervalSeconds));
  if (star > Number(event.star_level)) {
    const reward = rewardForStar(star, cfg.rewards);
    await env.DB.prepare('UPDATE bounty_world_events SET star_level=?,reward_gc=?,reward_rep=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND star_level<?').bind(star, reward, 150 * star, event.id, star).run();
    const target = await env.DB.prepare('SELECT latitude,longitude,route_json FROM bounty_actors WHERE id=?').bind(event.target_actor_id).first();
    await ensureNpcHunters(env, event, parseJson(target?.route_json, []), target || { latitude: 39.9526, longitude: -75.1652 }, hunterWaveForStar(star, cfg.hunterWaves), now);
    await broadcast(env, 'bounty_escalation', null, `BOUNTY ESCALATED // ${'★'.repeat(star)} // ${reward} GC`, `${event.id}:${star}`);
  }
  await updateActorPositions(env, event.id, now);
  return env.DB.prepare('SELECT * FROM bounty_world_events WHERE id=?').bind(event.id).first();
}

async function updateActorPositions(env, eventId, now) {
  await env.DB.prepare(`UPDATE bounty_actors SET
      latitude=(SELECT latitude FROM driver_locations WHERE user_id=bounty_actors.user_id),
      longitude=(SELECT longitude FROM driver_locations WHERE user_id=bounty_actors.user_id),
      location_accuracy_m=(SELECT accuracy_m FROM driver_locations WHERE user_id=bounty_actors.user_id),
      location_updated_at=(SELECT updated_at FROM driver_locations WHERE user_id=bounty_actors.user_id)
    WHERE event_id=? AND actor_type='human' AND status='active'
      AND EXISTS(SELECT 1 FROM driver_locations WHERE user_id=bounty_actors.user_id)`).bind(eventId).run();
  const actors = await env.DB.prepare(`SELECT * FROM bounty_actors WHERE event_id=? AND actor_type='npc' AND status='active'`).bind(eventId).all();
  for (const actor of actors.results || []) {
    const point = npcPosition(parseJson(actor.route_json, []), parseTime(actor.route_started_at || actor.created_at), now, Number(actor.speed_kph));
    if (point) await env.DB.prepare(`UPDATE bounty_actors SET latitude=?,longitude=?,heading=?,route_progress=?,location_updated_at=? WHERE id=?`).bind(point.latitude, point.longitude, point.heading, point.progress, new Date(now).toISOString(), actor.id).run();
  }
}

async function broadcast(env, type, actorUserId, text, sourceKey) {
  await env.DB.prepare(`INSERT OR IGNORE INTO underground_broadcasts(id,event_type,actor_user_id,text,source_key,expires_at) VALUES(?,?,?,?,?,datetime('now','+24 hours'))`).bind(crypto.randomUUID(), type, actorUserId || null, text, sourceKey).run();
}

async function eventPayload(env, user, event, cfg, window) {
  if (!event) return { serverNow: new Date().toISOString(), nextAt: new Date(window.nextMs).toISOString(), event: null };
  const actors = await env.DB.prepare(`SELECT id,actor_type,role,user_id,display_name,vehicle_label,status,latitude,longitude,heading,speed_kph,route_progress,location_updated_at FROM bounty_actors WHERE event_id=? ORDER BY role DESC,id`).bind(event.id).all();
  const offer = await env.DB.prepare('SELECT * FROM bounty_event_offers WHERE event_id=? AND user_id=?').bind(event.id, user.id).first();
  const selfActor = (actors.results || []).find(actor => actor.user_id === user.id);
  const target = (actors.results || []).find(actor => actor.role === 'target');
  let hunterSignal = null;
  if (selfActor?.role === 'hunter' && target?.latitude != null && selfActor?.latitude != null) {
    const distance = meters(selfActor, target);
    hunterSignal = { ...signalForDistance(distance), direction: directionBetween(selfActor, target), searchZoneRadiusMeters: Math.max(250, Math.round(distance * .22)) };
  }
  const hunters = (actors.results || []).filter(actor => actor.role === 'hunter');
  const targetPressure = target ? hunters.map(hunter => ({ hunter, distance: hunter.latitude == null ? Infinity : meters(hunter, target) })).sort((a, b) => a.distance - b.distance) : [];
  const nearest = targetPressure[0];
  const heat = nearest ? signalForDistance(nearest.distance).heat : 0;
  const blackout = Number(event.star_level) >= 4 && (Math.floor((Date.now() - parseTime(event.starts_at)) / 1000) % Math.max(60, Number(cfg.starIntervalSeconds))) < Number(cfg.blackoutDurationSeconds);
  return {
    serverNow: new Date().toISOString(),
    nextAt: new Date(window.nextMs).toISOString(),
    event: {
      id: event.id, status: event.status, startsAt: event.starts_at, endsAt: event.ends_at,
      starLevel: Number(event.star_level), rewardGc: Number(event.reward_gc), rewardRep: Number(event.reward_rep),
      remainingSeconds: Math.max(0, Math.ceil((parseTime(event.ends_at) - Date.now()) / 1000)),
      role: selfActor?.role || null, offer: offer?.status || null, target: publicActor(target, target?.actor_type === 'npc' || selfActor?.role === 'target'),
      hunters: hunters.map(actor => publicActor(actor, actor.actor_type === 'npc' && selfActor?.role === 'target')),
      hunterSignal, heat, blackout,
      nearestHunter: selfActor?.role === 'target' && nearest ? { direction: directionBetween(target, nearest.hunter), ...signalForDistance(nearest.distance) } : null,
    },
  };
}

function publicActor(actor, precise) {
  if (!actor) return null;
  return { id: actor.id, actorType: actor.actor_type, displayName: actor.display_name, vehicleLabel: actor.vehicle_label, status: actor.status, heading: actor.heading, speedKph: actor.speed_kph, routeProgress: actor.route_progress, ...(precise ? { latitude: actor.latitude, longitude: actor.longitude } : {}) };
}

function meters(a, b) {
  const rad = Math.PI / 180;
  const dLat = (Number(b.latitude) - Number(a.latitude)) * rad;
  const dLng = (Number(b.longitude) - Number(a.longitude)) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(Number(a.latitude) * rad) * Math.cos(Number(b.latitude) * rad) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function progression(env, userId) {
  const [user, ghost, contracts, keys, frequency, milestones, vehicleLegacy, broadcasts] = await Promise.all([
    env.DB.prepare('SELECT points,tier FROM users WHERE id=?').bind(userId).first(),
    env.DB.prepare('SELECT * FROM ghost_profiles WHERE user_id=?').bind(userId).first(),
    env.DB.prepare(`SELECT COUNT(*) count FROM contract_progress WHERE user_id=? AND status='completed'`).bind(userId).first(),
    env.DB.prepare('SELECT * FROM ghost_keys WHERE user_id=?').bind(userId).first(),
    env.DB.prepare('SELECT * FROM ghost_frequency_progress WHERE user_id=?').bind(userId).first(),
    env.DB.prepare('SELECT * FROM driver_milestones WHERE user_id=? ORDER BY earned_at DESC').bind(userId).all(),
    env.DB.prepare(`SELECT l.*,v.nickname,v.year,v.make,v.model FROM vehicle_legacy_stats l JOIN vehicles v ON v.id=l.vehicle_id WHERE v.user_id=? ORDER BY l.apex_miles DESC`).bind(userId).all(),
    env.DB.prepare(`SELECT * FROM underground_broadcasts WHERE expires_at IS NULL OR expires_at>? ORDER BY occurred_at DESC LIMIT 20`).bind(new Date().toISOString()).all(),
  ]);
  const unlocked = frequencyForProgress({ rank: String(user?.tier || 'ROOKIE').toUpperCase(), ghostStreak: Number(ghost?.current_streak || 0), contracts: Number(contracts?.count || 0) });
  await env.DB.prepare(`INSERT INTO ghost_frequency_progress(user_id,unlocked_level,active_level) VALUES(?,?,1) ON CONFLICT(user_id) DO UPDATE SET unlocked_level=MAX(unlocked_level,excluded.unlocked_level),updated_at=CURRENT_TIMESTAMP`).bind(userId, unlocked).run();
  return { keys: Number(keys?.balance || 0), frequency: { unlockedLevel: Math.max(unlocked, Number(frequency?.unlocked_level || 1)), activeLevel: Number(frequency?.active_level || 1) }, milestones: milestones.results, vehicleLegacy: vehicleLegacy.results, broadcasts: broadcasts.results };
}

async function referralState(env, user) {
  let row = await env.DB.prepare('SELECT * FROM referral_codes WHERE user_id=?').bind(user.id).first();
  if (!row) {
    let code = '';
    for (let attempt = 0; attempt < 20 && !code; attempt++) {
      const candidate = String(100000 + deterministicIndex(`${user.id}:${attempt}`, 900000));
      const used = await env.DB.prepare('SELECT 1 found FROM referral_codes WHERE code=?').bind(candidate).first();
      if (!used) code = candidate;
    }
    if (!code) throw new Error('A unique referral channel could not be allocated.');
    await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO referral_codes(user_id,code) VALUES(?,?)').bind(user.id, code),
      env.DB.prepare(`INSERT OR IGNORE INTO invite_codes(id,code,label,max_uses,created_by) VALUES(?,?,?,100,?)`).bind(`referral-${user.id}`, code, 'PILOT REFERRAL', user.id),
    ]);
    row = { user_id: user.id, code };
  }
  const referrals = await env.DB.prepare(`SELECT r.*,u.username FROM referrals r JOIN users u ON u.id=r.referred_user_id WHERE r.referrer_user_id=? ORDER BY r.created_at DESC`).bind(user.id).all();
  return { code: row.code, link: `/invite/${row.code}`, qualified: (referrals.results || []).filter(item => item.qualified_at).length, referrals: referrals.results };
}

async function tradeState(env, userId) {
  const [instances, trades] = await Promise.all([
    env.DB.prepare(`SELECT ci.*,s.name,s.category,s.rarity,s.tradeable,s.supply_limit FROM cosmetic_instances ci JOIN ghost_shop_items s ON s.id=ci.item_id WHERE ci.owner_user_id=? ORDER BY ci.acquired_at DESC`).bind(userId).all(),
    env.DB.prepare(`SELECT t.*,su.username sender_username,ru.username recipient_username,GROUP_CONCAT(s.name,', ') item_names
      FROM cosmetic_trades t JOIN users su ON su.id=t.sender_user_id JOIN users ru ON ru.id=t.recipient_user_id
      LEFT JOIN cosmetic_trade_items ti ON ti.trade_id=t.id LEFT JOIN cosmetic_instances ci ON ci.id=ti.instance_id LEFT JOIN ghost_shop_items s ON s.id=ci.item_id
      WHERE t.sender_user_id=? OR t.recipient_user_id=? GROUP BY t.id ORDER BY t.created_at DESC LIMIT 50`).bind(userId, userId).all(),
  ]);
  return { instances: instances.results, trades: trades.results };
}

export async function handlePhase2({ request, env, user, path, method }) {
  if (path === 'phase2/state' && method === 'GET') {
    let { event, cfg, window } = await ensureEvent(env, user.id);
    event = await advanceEvent(env, event, cfg);
    const [bounty, progress, referrals, trading] = await Promise.all([eventPayload(env, user, event, cfg, window), progression(env, user.id), referralState(env, user), tradeState(env, user.id)]);
    return response({ bounty, progress, referrals, trading });
  }

  if (path === 'bounty/world/schedule' && method === 'GET') {
    let { event, cfg, window } = await ensureEvent(env, user.id);
    event = await advanceEvent(env, event, cfg);
    return response(await eventPayload(env, user, event, cfg, window));
  }

  const bountyAction = path.match(/^bounty\/world\/([^/]+)\/(accept|decline|pulse|capture)$/);
  if (bountyAction && method === 'POST') {
    const [, eventId, action] = bountyAction;
    const event = await env.DB.prepare(`SELECT * FROM bounty_world_events WHERE id=? AND status='open'`).bind(eventId).first();
    if (!event) return response({ error: 'This Bounty signal is closed.' }, 409);
    if (action === 'accept' || action === 'decline') {
      const eligibility = await env.DB.prepare('SELECT bounty_mode_enabled,agreed_at FROM bounty_user_settings WHERE user_id=?').bind(user.id).first();
      if (action === 'accept' && (!eligibility?.bounty_mode_enabled || !eligibility?.agreed_at)) return response({ error: 'Opt in and accept the safety agreement first.' }, 403);
      const offer = await env.DB.prepare(`UPDATE bounty_event_offers SET status=?,responded_at=CURRENT_TIMESTAMP WHERE event_id=? AND user_id=? AND status='pending'`).bind(action === 'accept' ? 'accepted' : 'declined', eventId, user.id).run();
      if (!offer.meta.changes) return response({ error: 'No pending contract is available.' }, 409);
      if (action === 'accept') {
        const location = await env.DB.prepare('SELECT latitude,longitude,accuracy_m,updated_at FROM driver_locations WHERE user_id=?').bind(user.id).first();
        await env.DB.prepare(`INSERT OR IGNORE INTO bounty_actors(id,event_id,actor_type,role,user_id,display_name,vehicle_label,status,latitude,longitude,location_accuracy_m,location_updated_at)
          VALUES(?,?,'human','hunter',?,?,?,'active',?,?,?,?)`).bind(`${eventId}-human-${user.id}`, eventId, user.id, user.username, 'VEHICLE UNKNOWN', location?.latitude || null, location?.longitude || null, location?.accuracy_m || null, location?.updated_at || null).run();
      }
      return response({ status: action === 'accept' ? 'accepted' : 'declined' });
    }

    const actor = await env.DB.prepare(`SELECT * FROM bounty_actors WHERE event_id=? AND user_id=? AND role='hunter' AND status='active'`).bind(eventId, user.id).first();
    if (!actor) return response({ error: 'Accept this Bounty contract before tracking.' }, 403);
    const body = await request.json().catch(() => ({}));
    const location = validLocation(body) ? { latitude: Number(body.latitude), longitude: Number(body.longitude), accuracy_m: Number(body.accuracyMeters || 0), updated_at: new Date().toISOString() } : await env.DB.prepare('SELECT latitude,longitude,accuracy_m,updated_at FROM driver_locations WHERE user_id=?').bind(user.id).first();
    if (!location) return response({ error: 'A fresh Driver Mode location is required.' }, 409);
    await env.DB.prepare('UPDATE bounty_actors SET latitude=?,longitude=?,location_accuracy_m=?,location_updated_at=? WHERE id=?').bind(location.latitude, location.longitude, location.accuracy_m || 0, location.updated_at || new Date().toISOString(), actor.id).run();
    const target = await env.DB.prepare('SELECT * FROM bounty_actors WHERE id=?').bind(event.target_actor_id).first();
    if (!target?.latitude) return response({ error: 'Target signal is temporarily unavailable.' }, 409);
    const distance = meters(location, target);
    const signal = { ...signalForDistance(distance), direction: directionBetween(location, target) };
    if (action === 'pulse') return response({ signal, blackout: Number(event.star_level) >= 4 && Math.floor(Date.now() / 1000) % 120 < 20 });

    const cfg = await config(env, 'bounty_world', BOUNTY_DEFAULTS);
    const lock = await env.DB.prepare('SELECT * FROM bounty_capture_locks WHERE event_id=? AND hunter_actor_id=?').bind(eventId, actor.id).first();
    const now = Date.now();
    const elapsed = lock?.last_valid_at ? Math.max(0, Math.min(10, Math.floor((now - parseTime(lock.last_valid_at)) / 1000))) : 1;
    const progress = captureProgress({ previousSeconds: Number(lock?.locked_seconds || 0), elapsedSeconds: elapsed, distanceMeters: distance, accuracyMeters: Number(location.accuracy_m || 0), sampleAgeSeconds: Math.max(0, (now - parseTime(location.updated_at || new Date(now).toISOString())) / 1000) }, cfg);
    await env.DB.prepare(`INSERT INTO bounty_capture_locks(event_id,hunter_actor_id,target_actor_id,locked_seconds,lock_started_at,last_valid_at,verified_at) VALUES(?,?,?,?,?,?,?)
      ON CONFLICT(event_id,hunter_actor_id) DO UPDATE SET locked_seconds=excluded.locked_seconds,lock_started_at=excluded.lock_started_at,last_valid_at=excluded.last_valid_at,verified_at=excluded.verified_at`)
      .bind(eventId, actor.id, target.id, progress.seconds, progress.valid ? lock?.lock_started_at || new Date(now).toISOString() : null, progress.valid ? new Date(now).toISOString() : null, progress.seconds >= cfg.captureDurationSeconds ? new Date(now).toISOString() : null).run();
    if (progress.seconds < cfg.captureDurationSeconds) return response({ signal, capture: { locking: progress.valid, seconds: progress.seconds, requiredSeconds: cfg.captureDurationSeconds } });

    const claimed = await env.DB.prepare(`UPDATE bounty_world_events SET status='claimed',claimed_by_actor_id=?,completed_at=CURRENT_TIMESTAMP,reward_ledger_key=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='open'`).bind(actor.id, `bounty:${eventId}:claim`, eventId).run();
    if (!claimed.meta.changes) return response({ error: 'Another hunter secured this Bounty first.' }, 409);
    const reward = await award(env, user.id, Number(event.reward_gc), Number(event.reward_rep), 'BOUNTY WORLD CLAIM', eventId, `bounty:${eventId}:claim:${user.id}`);
    await env.DB.batch([
      env.DB.prepare(`UPDATE bounty_actors SET status='captured' WHERE id=?`).bind(target.id),
      env.DB.prepare(`UPDATE bounty_actors SET status=CASE WHEN id=? THEN 'active' ELSE 'left' END WHERE event_id=? AND role='hunter'`).bind(actor.id, eventId),
      env.DB.prepare(`INSERT OR IGNORE INTO user_badges(user_id,badge_id) VALUES(?,'bounty-hunter')`).bind(user.id),
    ]);
    await broadcast(env, 'bounty_capture', user.id, `${user.username} CAPTURED ${target.display_name} // ${'★'.repeat(Number(event.star_level))}`, eventId);
    return response({ captured: true, rewardGc: event.reward_gc, rewardRep: event.reward_rep, reward });
  }

  if (path === 'ghost/frequency' && method === 'PUT') {
    const body = await request.json();
    const requested = [1, 7, 13].includes(Number(body.level)) ? Number(body.level) : 1;
    const state = await progression(env, user.id);
    if (requested > state.frequency.unlockedLevel) return response({ error: `FREQ ${String(requested).padStart(2, '0')} is still classified.` }, 403);
    await env.DB.prepare('UPDATE ghost_frequency_progress SET active_level=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?').bind(requested, user.id).run();
    return response({ activeLevel: requested, unlockedLevel: state.frequency.unlockedLevel });
  }

  if (path === 'referrals' && method === 'GET') return response(await referralState(env, user));

  if (path === 'trades' && method === 'GET') return response(await tradeState(env, user.id));
  if (path === 'trades' && method === 'POST') {
    const body = await request.json();
    const recipient = await env.DB.prepare('SELECT id,username FROM users WHERE LOWER(username)=LOWER(?) OR LOWER(email)=LOWER(?)').bind(String(body.recipient || '').trim(), String(body.recipient || '').trim()).first();
    if (!recipient || recipient.id === user.id) return response({ error: 'Choose another verified Apex pilot.' }, 400);
    const ids = [...new Set((body.instanceIds || []).map(String))].slice(0, 8);
    if (!ids.length) return response({ error: 'Select at least one tradeable cosmetic.' }, 400);
    const placeholders = ids.map(() => '?').join(',');
    const owned = await env.DB.prepare(`SELECT ci.id FROM cosmetic_instances ci JOIN ghost_shop_items s ON s.id=ci.item_id WHERE ci.owner_user_id=? AND s.tradeable=1 AND ci.id IN (${placeholders})`).bind(user.id, ...ids).all();
    if (owned.results.length !== ids.length) return response({ error: 'One or more items are unavailable or not tradeable.' }, 409);
    const tradeId = crypto.randomUUID();
    const statements = [env.DB.prepare(`INSERT INTO cosmetic_trades(id,sender_user_id,recipient_user_id,message,expires_at) VALUES(?,?,?,?,datetime('now','+48 hours'))`).bind(tradeId, user.id, recipient.id, String(body.message || '').slice(0, 200))];
    for (const id of ids) statements.push(env.DB.prepare('INSERT INTO cosmetic_trade_items(trade_id,instance_id,from_user_id) VALUES(?,?,?)').bind(tradeId, id, user.id));
    try { await env.DB.batch(statements); } catch { return response({ error: 'An item is already reserved in another trade.' }, 409); }
    return response({ id: tradeId, status: 'pending', recipient: recipient.username }, 201);
  }

  const tradeAction = path.match(/^trades\/([^/]+)\/(accept|decline|cancel)$/);
  if (tradeAction && method === 'POST') {
    const [, tradeId, action] = tradeAction;
    const trade = await env.DB.prepare('SELECT * FROM cosmetic_trades WHERE id=?').bind(tradeId).first();
    if (!trade || trade.status !== 'pending' || parseTime(trade.expires_at) <= Date.now()) return response({ error: 'This trade is no longer available.' }, 409);
    if (action === 'cancel' && trade.sender_user_id !== user.id) return response({ error: 'Only the sender can cancel this trade.' }, 403);
    if (action !== 'cancel' && trade.recipient_user_id !== user.id) return response({ error: 'Only the recipient can answer this trade.' }, 403);
    if (action !== 'accept') {
      await env.DB.batch([
        env.DB.prepare('UPDATE cosmetic_trades SET status=?,responded_at=CURRENT_TIMESTAMP WHERE id=? AND status=\'pending\'').bind(action === 'cancel' ? 'cancelled' : 'declined', tradeId),
        env.DB.prepare('DELETE FROM cosmetic_trade_items WHERE trade_id=?').bind(tradeId),
      ]);
      return response({ status: action === 'cancel' ? 'cancelled' : 'declined' });
    }
    const items = await env.DB.prepare(`SELECT ti.instance_id,ti.from_user_id,ci.item_id FROM cosmetic_trade_items ti
      JOIN cosmetic_instances ci ON ci.id=ti.instance_id WHERE ti.trade_id=?`).bind(tradeId).all();
    if (!items.results.length) return response({ error: 'Trade escrow is empty.' }, 409);
    const statements = [env.DB.prepare(`UPDATE cosmetic_trades SET status='accepted',responded_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'`).bind(tradeId)];
    const ownershipUpdates = [];
    for (const item of items.results) {
      ownershipUpdates.push(statements.length);
      statements.push(env.DB.prepare('UPDATE cosmetic_instances SET owner_user_id=? WHERE id=? AND owner_user_id=?').bind(user.id, item.instance_id, item.from_user_id));
      statements.push(env.DB.prepare(`INSERT OR IGNORE INTO ghost_inventory(user_id,item_id,acquired_source,purchase_price_gc) VALUES(?,?,'trade',0)`).bind(user.id, item.item_id));
      statements.push(env.DB.prepare('DELETE FROM ghost_equipped_items WHERE user_id=? AND item_id=?').bind(item.from_user_id, item.item_id));
      statements.push(env.DB.prepare('DELETE FROM ghost_inventory WHERE user_id=? AND item_id=?').bind(item.from_user_id, item.item_id));
    }
    statements.push(env.DB.prepare('DELETE FROM cosmetic_trade_items WHERE trade_id=?').bind(tradeId));
    const results = await env.DB.batch(statements);
    if (!results[0].meta.changes || ownershipUpdates.some(index => !results[index].meta.changes)) return response({ error: 'Trade ownership changed before acceptance.' }, 409);
    return response({ status: 'accepted', transferred: items.results.length });
  }

  return null;
}

function validLocation(value) {
  return Number.isFinite(Number(value?.latitude)) && Number.isFinite(Number(value?.longitude)) && Math.abs(Number(value.latitude)) <= 90 && Math.abs(Number(value.longitude)) <= 180;
}

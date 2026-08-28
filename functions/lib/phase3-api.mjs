import {
  PERFORMANCE_TYPES,
  parseApexQr,
  performanceConfidence,
  personalBest,
  utcDay,
  validatePerformanceTelemetry,
} from "./phase3-core.mjs";

const response = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
const parseJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

function distanceMeters(aLat, aLng, bLat, bLng) {
  const rad = Math.PI / 180,
    dLat = (bLat - aLat) * rad,
    dLng = (bLng - aLng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const BOARD_SQL = {
  rep: { metric: "u.points", order: "DESC" },
  rank: { metric: "u.points", order: "DESC" },
  season: {
    metric:
      "COALESCE((SELECT MAX(sup.xp) FROM season_user_progress sup WHERE sup.user_id=u.id),0)",
    order: "DESC",
  },
  most_wanted: {
    metric:
      "COALESCE((SELECT MAX(bus.highest_star_survived) FROM bounty_user_stats bus WHERE bus.user_id=u.id),0)",
    order: "DESC",
  },
  bounty_hunters: {
    metric:
      "COALESCE((SELECT MAX(bus.successful_claims) FROM bounty_user_stats bus WHERE bus.user_id=u.id),0)",
    order: "DESC",
  },
  bounty_survivors: {
    metric:
      "COALESCE((SELECT MAX(bus.escapes) FROM bounty_user_stats bus WHERE bus.user_id=u.id),0)",
    order: "DESC",
  },
  exploration: {
    metric: "(SELECT COUNT(*) FROM map_discoveries md WHERE md.user_id=u.id)",
    order: "DESC",
  },
  miles: {
    metric:
      "COALESCE((SELECT SUM(vls.apex_miles) FROM vehicle_legacy_stats vls JOIN vehicles vx ON vx.id=vls.vehicle_id WHERE vx.user_id=u.id),0)",
    order: "DESC",
  },
  ghost: {
    metric:
      "COALESCE((SELECT gp.activities_completed FROM ghost_profiles gp WHERE gp.user_id=u.id),0)",
    order: "DESC",
  },
  safe_houses: {
    metric: "(SELECT COUNT(*) FROM safe_houses sh WHERE sh.user_id=u.id)",
    order: "DESC",
  },
  meets: {
    metric: "(SELECT COUNT(*) FROM meet_checkins mc WHERE mc.user_id=u.id)",
    order: "DESC",
  },
  cotw: {
    metric:
      "(SELECT COUNT(*) FROM car_of_the_week_winners cw WHERE cw.user_id=u.id)",
    order: "DESC",
  },
  zero_sixty: {
    metric:
      "(SELECT MIN(p.result_seconds) FROM personal_performance_records p WHERE p.user_id=u.id AND p.run_type='0-60' AND p.verification_status='verified')",
    order: "ASC",
    visibility: "performance",
  },
  sixty_130: {
    metric:
      "(SELECT MIN(p.result_seconds) FROM personal_performance_records p WHERE p.user_id=u.id AND p.run_type='60-130' AND p.verification_status='verified')",
    order: "ASC",
    visibility: "performance",
  },
  top_speed: {
    metric:
      "(SELECT MAX(p.top_speed_kph) FROM personal_performance_records p WHERE p.user_id=u.id AND p.verification_status='verified')",
    order: "DESC",
    visibility: "performance",
  },
  h2h: { metric: "u.wins", order: "DESC", visibility: "races" },
  convoy: {
    metric: "(SELECT COUNT(*) FROM cruise_members cm WHERE cm.user_id=u.id)",
    order: "DESC",
  },
  weekly_streak: {
    metric:
      "COALESCE((SELECT gp.current_streak FROM ghost_profiles gp WHERE gp.user_id=u.id),0)",
    order: "DESC",
  },
};

async function leaderboard(env, user, request) {
  const url = new URL(request.url),
    boardKey = url.searchParams.get("board") || "rep",
    scope = url.searchParams.get("scope") || "global";
  const board = BOARD_SQL[boardKey] || BOARD_SQL.rep,
    safeScope = ["global", "local", "friends", "crew"].includes(scope)
      ? scope
      : "global";
  let scopeSql = "",
    bindings = [];
  if (safeScope === "friends") {
    scopeSql =
      "AND (u.id=? OR EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=? AND f.following_id=u.id))";
    bindings = [user.id, user.id];
  } else if (safeScope === "crew") {
    scopeSql = `AND EXISTS(SELECT 1 FROM crew_members mine JOIN crew_members theirs ON theirs.crew_id=mine.crew_id WHERE mine.user_id=? AND mine.status='approved' AND theirs.user_id=u.id AND theirs.status='approved')`;
    bindings = [user.id];
  } else if (safeScope === "local") {
    scopeSql = `AND COALESCE(settings.location_visibility,1)=1 AND EXISTS(SELECT 1 FROM driver_locations me JOIN driver_locations them ON them.user_id=u.id LEFT JOIN apex_user_settings mine_settings ON mine_settings.user_id=me.user_id WHERE me.user_id=? AND COALESCE(mine_settings.location_visibility,1)=1 AND me.expires_at>CURRENT_TIMESTAMP AND them.expires_at>CURRENT_TIMESTAMP AND ABS(me.latitude-them.latitude)<.55 AND ABS(me.longitude-them.longitude)<.55)`;
    bindings = [user.id];
  }
  let visibilitySql = "";
  if (board.visibility === "performance")
    visibilitySql = "AND COALESCE(settings.public_performance_visibility,1)=1";
  else if (board.visibility === "races")
    visibilitySql = "AND COALESCE(settings.public_race_records,1)=1";
  else if (boardKey === "meets")
    visibilitySql = "AND COALESCE(settings.meet_attendance_visibility,1)=1";
  else if (boardKey === "safe_houses")
    visibilitySql = "AND COALESCE(prefs.public_stats_json,'[]') LIKE '%safeHouses%'";
  else if (["most_wanted", "bounty_hunters", "bounty_survivors"].includes(boardKey))
    visibilitySql = "AND COALESCE(prefs.public_stats_json,'[]') LIKE '%bounties%'";
  const rows = await env.DB.prepare(
    `SELECT u.id,u.username,u.display_name,u.avatar_url,CASE WHEN COALESCE(settings.apex_id_visibility,1)=1 THEN u.apex_id ELSE NULL END apex_id,u.tier,u.points,u.wins,u.losses,
      ${board.metric} metric,
      (SELECT c.name FROM crew_members cm JOIN crews c ON c.id=cm.crew_id WHERE cm.user_id=u.id AND cm.status='approved' LIMIT 1) crew_name,
      (SELECT i.name FROM ghost_equipped_items ge JOIN ghost_shop_items i ON i.id=ge.item_id WHERE ge.user_id=u.id AND ge.category='frame') frame_name,
      (SELECT i.name FROM ghost_equipped_items ge JOIN ghost_shop_items i ON i.id=ge.item_id WHERE ge.user_id=u.id AND ge.category='banner') banner_name
    FROM users u
    LEFT JOIN apex_user_settings settings ON settings.user_id=u.id
    LEFT JOIN profile_preferences prefs ON prefs.user_id=u.id
    WHERE u.privacy_mode<>'private' AND COALESCE(settings.profile_visibility,1)=1
      ${visibilitySql} ${scopeSql}
    ORDER BY metric ${board.order},u.points DESC,u.id LIMIT 100`,
  )
    .bind(...bindings)
    .all();
  const filtered = (rows.results || []).filter(
    (row) => row.metric !== null && row.metric !== undefined,
  );
  return response({
    board: boardKey,
    scope: safeScope,
    generatedAt: new Date().toISOString(),
    entries: filtered.map((row, index) => ({
      ...row,
      position: index + 1,
      metric: Number(row.metric || 0),
    })),
  });
}

async function driverProfile(env, user, targetId) {
  const id = targetId || user.id;
  const profile = await env.DB.prepare(
    `SELECT id,username,display_name,avatar_url,apex_id,tier,points,wins,losses,privacy_mode,created_at FROM users WHERE id=?`,
  )
    .bind(id)
    .first();
  if (!profile) return response({ error: "Driver profile not found." }, 404);
  const isSelf = id === user.id,
    settings =
      (await env.DB.prepare("SELECT * FROM apex_user_settings WHERE user_id=?")
        .bind(id)
        .first()) || {};
  if (
    !isSelf &&
    (profile.privacy_mode === "private" || Number(settings.profile_visibility ?? 1) !== 1)
  )
    return response({ error: "This driver profile is private." }, 403);
  const [
    vehicles,
    records,
    badges,
    milestones,
    ghost,
    bounty,
    equipped,
    crew,
    legacy,
    preference,
    meetCount,
    safeHouseCount,
    cotwWins,
    seasons,
    socialStats,
    recentPosts,
    rankThresholds,
    rankHistory,
  ] = await Promise.all([
    env.DB.prepare(
      "SELECT id,nickname,year,make,model,trim,color,horsepower,photo_url,digital_twin_url,is_active FROM vehicles WHERE user_id=? ORDER BY is_active DESC,created_at DESC",
    )
      .bind(id)
      .all(),
    env.DB.prepare(
      "SELECT * FROM personal_performance_records WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
    )
      .bind(id)
      .all(),
    env.DB.prepare(
      `SELECT b.id,b.name,b.description,b.category,COALESCE(b.rarity,'COMMON') rarity,ub.earned_at,bp.current_value,bp.target_value,
      CASE WHEN ub.user_id IS NULL THEN 0 ELSE 1 END earned,fb.slot FROM badges b LEFT JOIN user_badges ub ON ub.badge_id=b.id AND ub.user_id=? LEFT JOIN badge_progress bp ON bp.badge_id=b.id AND bp.user_id=? LEFT JOIN featured_badges fb ON fb.badge_id=b.id AND fb.user_id=? ORDER BY earned DESC,ub.earned_at DESC,b.name`,
    )
      .bind(id, id, id)
      .all(),
    env.DB.prepare(
      "SELECT * FROM driver_milestones WHERE user_id=? ORDER BY earned_at DESC",
    )
      .bind(id)
      .all(),
    env.DB.prepare("SELECT * FROM ghost_profiles WHERE user_id=?")
      .bind(id)
      .first(),
    env.DB.prepare("SELECT * FROM bounty_user_stats WHERE user_id=?")
      .bind(id)
      .first(),
    env.DB.prepare(
      `SELECT ge.category,i.id,i.name,i.rarity,i.preview_json FROM ghost_equipped_items ge JOIN ghost_shop_items i ON i.id=ge.item_id WHERE ge.user_id=?`,
    )
      .bind(id)
      .all(),
    env.DB.prepare(
      `SELECT c.id,c.name,c.tag FROM crew_members cm JOIN crews c ON c.id=cm.crew_id WHERE cm.user_id=? AND cm.status='approved' LIMIT 1`,
    )
      .bind(id)
      .first(),
    env.DB.prepare(
      `SELECT vls.*,v.nickname,v.year,v.make,v.model,v.photo_url FROM vehicle_legacy_stats vls JOIN vehicles v ON v.id=vls.vehicle_id WHERE v.user_id=? ORDER BY v.is_active DESC`,
    )
      .bind(id)
      .all(),
    env.DB.prepare("SELECT * FROM profile_preferences WHERE user_id=?")
      .bind(id)
      .first(),
    env.DB.prepare("SELECT COUNT(*) count FROM meet_checkins WHERE user_id=?")
      .bind(id)
      .first(),
    env.DB.prepare("SELECT COUNT(*) count FROM safe_houses WHERE user_id=?")
      .bind(id)
      .first(),
    env.DB.prepare(
      "SELECT COUNT(*) count FROM car_of_the_week_winners WHERE user_id=?",
    )
      .bind(id)
      .first(),
    env.DB.prepare(
      `SELECT s.id,s.season_number,s.name,s.theme,s.starts_at,s.ends_at,s.is_active,COALESCE(sp.xp,0) xp,COALESCE(sp.level,1) level
      FROM apex_seasons s LEFT JOIN season_user_progress sp ON sp.season_id=s.id AND sp.user_id=?
      WHERE s.is_active=1 OR sp.user_id IS NOT NULL ORDER BY s.season_number DESC`,
    )
      .bind(id)
      .all(),
    env.DB.prepare(
      `SELECT
      (SELECT COUNT(*) FROM posts WHERE user_id=?) posts,
      (SELECT COUNT(*) FROM follows WHERE following_id=?) followers,
      (SELECT COUNT(*) FROM follows WHERE follower_id=?) following,
      (SELECT COUNT(*) FROM post_likes pl JOIN posts p ON p.id=pl.post_id WHERE p.user_id=?) likes_received,
      (SELECT COUNT(*) FROM comments c JOIN posts p ON p.id=c.post_id WHERE p.user_id=?) comments_received`,
    )
      .bind(id, id, id, id, id)
      .first(),
    env.DB.prepare(
      `SELECT p.id,p.media_url,p.media_type,p.caption,p.feed_category,p.created_at,
      (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id=p.id) likes,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) comments
      FROM posts p WHERE p.user_id=? ORDER BY p.created_at DESC LIMIT 12`,
    )
      .bind(id)
      .all(),
    env.DB.prepare(
      "SELECT rank,minimum_rep,reward_gc,shop_access FROM rank_thresholds ORDER BY minimum_rep",
    ).all(),
    env.DB.prepare(
      "SELECT rank,rep,awarded_at FROM rank_history WHERE user_id=? ORDER BY awarded_at DESC LIMIT 20",
    )
      .bind(id)
      .all(),
  ]);
  const parsedPublicStats = parseJson(preference?.public_stats_json, []),
    publicStats = Array.isArray(parsedPublicStats) ? parsedPublicStats : [],
    canShow = (name) => isSelf || publicStats.includes(name),
    recordRows = isSelf
      ? records.results || []
      : Number(settings.public_performance_visibility ?? 1) === 1
        ? (records.results || []).filter(
            (row) => row.verification_status === "verified",
          )
        : [];
  const best = (type) => {
    const values = recordRows
      .filter((row) => row.run_type === type)
      .map((row) => Number(row.result_seconds))
      .filter((value) => value > 0);
    return values.length ? Math.min(...values) : null;
  };
  const topSpeed = recordRows.reduce(
    (value, row) => Math.max(value, Number(row.top_speed_kph || 0)),
    0,
  );
  const thresholds = rankThresholds.results || [],
    currentRep = Number(profile.points || 0),
    nextRank =
      thresholds.find((row) => Number(row.minimum_rep) > currentRep) || null,
    currentThreshold =
      [...thresholds]
        .reverse()
        .find((row) => Number(row.minimum_rep) <= currentRep) ||
      thresholds[0] ||
      null;
  const rankSpan = nextRank
    ? Math.max(
        1,
        Number(nextRank.minimum_rep) -
          Number(currentThreshold?.minimum_rep || 0),
      )
    : 1;
  const rankProgress = nextRank
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((currentRep - Number(currentThreshold?.minimum_rep || 0)) /
              rankSpan) *
              100,
          ),
        ),
      )
    : 100;
  const stats = {
    wins: canShow("wins") ? Number(profile.wins || 0) : undefined,
    losses: canShow("losses") ? Number(profile.losses || 0) : undefined,
    winRate:
      canShow("wins") || canShow("losses")
        ? Number(profile.wins || 0) + Number(profile.losses || 0)
          ? Math.round(
              (Number(profile.wins || 0) /
                (Number(profile.wins || 0) + Number(profile.losses || 0))) *
                100,
            )
          : 0
        : undefined,
    topSpeedKph: canShow("topSpeed") ? topSpeed : undefined,
    bestZeroSixty: canShow("zeroToSixty") ? best("0-60") : undefined,
    bestSixty130: canShow("sixtyTo130") ? best("60-130") : undefined,
    bountiesClaimed: canShow("bounties")
      ? Number(bounty?.successful_claims || 0)
      : undefined,
    fiveStarEscapes: canShow("bounties")
      ? Number(bounty?.five_star_survivals || 0)
      : undefined,
    meets: canShow("meets") ? Number(meetCount?.count || 0) : undefined,
    safeHouses: canShow("safeHouses")
      ? Number(safeHouseCount?.count || 0)
      : undefined,
    ghostCaches: canShow("ghost")
      ? Number(ghost?.drops_claimed || 0)
      : undefined,
    currentStreak: canShow("ghost")
      ? Number(ghost?.current_streak || 0)
      : undefined,
    cotwWins: canShow("cotw") ? Number(cotwWins?.count || 0) : undefined,
  };
  return response({
    profile: {
      ...profile,
      apex_id:
        isSelf || Number(settings.apex_id_visibility ?? 1) === 1
          ? profile.apex_id
          : null,
      crew: canShow("crew") ? crew : null,
      title: preference?.title || "UNDERGROUND DRIVER",
      publicStats,
    },
    stats,
    rank: {
      current: currentThreshold?.rank || profile.tier,
      rep: currentRep,
      next: nextRank?.rank || null,
      nextMinimumRep: nextRank ? Number(nextRank.minimum_rep) : null,
      repToNext: nextRank
        ? Math.max(0, Number(nextRank.minimum_rep) - currentRep)
        : 0,
      progress: rankProgress,
      history: rankHistory.results || [],
    },
    seasons: canShow("seasons") ? seasons.results || [] : [],
    social: canShow("posts") ? {
      posts: Number(socialStats?.posts || 0),
      followers: Number(socialStats?.followers || 0),
      following: Number(socialStats?.following || 0),
      likesReceived: Number(socialStats?.likes_received || 0),
      commentsReceived: Number(socialStats?.comments_received || 0),
      recentPosts: recentPosts.results || [],
    } : { posts: 0, followers: 0, following: 0, likesReceived: 0, commentsReceived: 0, recentPosts: [] },
    vehicles:
      isSelf || Number(settings.vehicle_visibility ?? 1) === 1
        ? vehicles.results
        : [],
    records: recordRows,
    badges: badges.results,
    milestones: canShow("milestones") ? milestones.results : [],
    ghost: canShow("ghost") ? ghost || {} : {},
    bounty: canShow("bounties") ? bounty || {} : {},
    equipped: equipped.results,
    legacy:
      isSelf || Number(settings.vehicle_visibility ?? 1) === 1
        ? legacy.results
        : [],
    isSelf,
    privacy: isSelf ? settings : undefined,
  });
}

async function savePerformance(env, user, request) {
  const body = await request.json();
  if (!PERFORMANCE_TYPES.includes(body.runType))
    return response({ error: "Unsupported performance test." }, 400);
  const vehicle = await env.DB.prepare(
    "SELECT id FROM vehicles WHERE id=? AND user_id=?",
  )
    .bind(body.vehicleId, user.id)
    .first();
  if (!vehicle)
    return response({ error: "Choose a vehicle from your garage." }, 404);
  const telemetry = validatePerformanceTelemetry({
    runType: body.runType,
    route: body.route,
    resultSeconds: body.resultSeconds,
    topSpeedKph: body.topSpeedKph,
  });
  if (!telemetry.valid)
    return response({ error: telemetry.reason, telemetry }, 422);
  const confidence = performanceConfidence({
    accuracyM: body.gpsAccuracyM,
    sampleAgeMs: body.gpsSampleAgeMs,
    resultSeconds: telemetry.derivedSeconds,
    topSpeedKph: telemetry.derivedTopSpeedKph,
  });
  if (!confidence.valid)
    return response(
      {
        error: "Sensor quality was not sufficient to save this run.",
        confidence,
      },
      422,
    );
  const existing = await env.DB.prepare(
    "SELECT * FROM personal_performance_records WHERE user_id=? AND vehicle_id=? AND run_type=? ORDER BY result_seconds",
  )
    .bind(user.id, body.vehicleId, body.runType)
    .all();
  const id = crypto.randomUUID(),
    verification = body.evidenceUrl && confidence.score >= 80 ? "pending" : "private";
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO personal_performance_records(id,user_id,vehicle_id,run_type,result_seconds,gps_confidence_pct,evidence_url,verification_status,event_context,unit,top_speed_kph,gps_accuracy_m,gps_sample_age_ms,route_json,confidence_label) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(
      id,
      user.id,
      body.vehicleId,
      body.runType,
      telemetry.derivedSeconds,
      confidence.score,
      body.evidenceUrl || null,
      verification,
      body.eventContext || "PRIVATE / CLOSED COURSE",
      body.unit === "KMH" ? "KMH" : "MPH",
      telemetry.derivedTopSpeedKph,
      Number(body.gpsAccuracyM),
      Number(body.gpsSampleAgeMs),
      JSON.stringify(telemetry.samples),
      confidence.label,
    ),
    env.DB.prepare(
      "INSERT OR IGNORE INTO user_badges(user_id,badge_id) VALUES(?,'first-pb')",
    ).bind(user.id),
    env.DB.prepare(
      "INSERT OR IGNORE INTO driver_milestones(user_id,milestone_key,value_number,metadata_json) VALUES(?,'first_pb',1,?)",
    ).bind(user.id, JSON.stringify({ recordId: id, runType: body.runType })),
  ]);
  const result = personalBest(
    [
      ...(existing.results || []),
      {
        vehicle_id: body.vehicleId,
        run_type: body.runType,
        result_seconds: telemetry.derivedSeconds,
      },
    ],
    body.runType,
    body.vehicleId,
  );
  return response({ saved: true, id, confidence, telemetry, personalBest: result }, 201);
}

async function listMeets(env, user) {
  const rows = await env.DB.prepare(
    `SELECT e.*,u.username host_name,
    (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id=e.id) going_count,
    EXISTS(SELECT 1 FROM event_registrations er WHERE er.event_id=e.id AND er.user_id=?) joined,
    EXISTS(SELECT 1 FROM meet_checkins mc WHERE mc.event_id=e.id AND mc.user_id=?) checked_in
    FROM events e JOIN users u ON u.id=e.host_id WHERE e.visibility='public' OR e.host_id=? OR EXISTS(SELECT 1 FROM event_registrations x WHERE x.event_id=e.id AND x.user_id=?) ORDER BY e.starts_at LIMIT 100`,
  )
    .bind(user.id, user.id, user.id, user.id)
    .all();
  const meets = [];
  for (const row of rows.results || []) {
    const showCars = await env.DB.prepare(
      `SELECT er.user_id,u.username,u.display_name,v.id vehicle_id,v.nickname,v.year,v.make,v.model,v.photo_url
      FROM event_registrations er JOIN users u ON u.id=er.user_id LEFT JOIN vehicles v ON v.id=er.vehicle_id
      WHERE er.event_id=? AND er.role='show_car' ORDER BY er.created_at`,
    )
      .bind(row.id)
      .all();
    meets.push({
      ...row,
      categories: parseJson(row.categories_json, []),
      announcements: parseJson(row.announcements_json, []),
      showCars: showCars.results,
    });
  }
  return response({ meets });
}

async function createMeet(env, user, request) {
  const body = await request.json(),
    lat = Number(body.latitude),
    lng = Number(body.longitude);
  if (
    !body.name?.trim() ||
    !body.startsAt ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  )
    return response(
      { error: "Name, time, and a resolved location are required." },
      400,
    );
  const id = crypto.randomUUID(),
    capacity = Math.min(1000, Math.max(2, Number(body.capacity) || 100)),
    radius = Math.min(500, Math.max(40, Number(body.radiusM) || 150));
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO events(id,host_id,title,location_name,latitude,longitude,radius_m,starts_at,ends_at,description,rules,allow_show_cars,allow_sponsors,image_url,capacity,visibility,categories_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(
      id,
      user.id,
      body.name.trim().slice(0, 90),
      String(body.locationName || body.name).slice(0, 240),
      lat,
      lng,
      radius,
      body.startsAt,
      body.endsAt || null,
      String(body.description || "").slice(0, 2000),
      String(body.rules || "").slice(0, 2000),
      1,
      1,
      body.imageUrl || null,
      capacity,
      body.visibility === "private" ? "private" : "public",
      JSON.stringify((body.categories || []).slice(0, 8)),
    ),
    env.DB.prepare(
      "INSERT INTO event_registrations(event_id,user_id,role) VALUES(?,?,'show_car')",
    ).bind(id, user.id),
  ]);
  return response({ created: true, id }, 201);
}

async function checkInMeet(env, user, eventId, request) {
  const body = await request.json(),
    lat = Number(body.latitude),
    lng = Number(body.longitude),
    accuracy = Number(body.accuracyM),
    sampleAgeMs = Number(body.sampleAgeMs);
  if (
    ![lat, lng, accuracy, sampleAgeMs].every(Number.isFinite) ||
    accuracy <= 0 ||
    accuracy > 65 ||
    sampleAgeMs < 0 ||
    sampleAgeMs > 10_000
  )
    return response(
      { error: "A fresh GPS fix with 65 m accuracy or better is required." },
      422,
    );
  const event = await env.DB.prepare(
    "SELECT id,latitude,longitude,radius_m,starts_at,ends_at FROM events WHERE id=?",
  )
    .bind(eventId)
    .first();
  if (!event) return response({ error: "Meet not found." }, 404);
  const startsAt = Date.parse(event.starts_at),
    endsAt = event.ends_at
      ? Date.parse(event.ends_at)
      : startsAt + 6 * 60 * 60 * 1000,
    now = Date.now();
  if (!Number.isFinite(startsAt) || now < startsAt || now > endsAt)
    return response({ error: "Meet check-in is outside the active event window." }, 409);
  const distance = distanceMeters(
    lat,
    lng,
    Number(event.latitude),
    Number(event.longitude),
  );
  if (distance > Number(event.radius_m) + accuracy)
    return response(
      {
        error: `Move inside the ${Math.round(Number(event.radius_m))} m meet zone.`,
        distanceMeters: Math.round(distance),
      },
      409,
    );
  const vehicle = await env.DB.prepare(
    "SELECT id FROM vehicles WHERE user_id=? AND is_active=1",
  )
    .bind(user.id)
    .first();
  const inserted = await env.DB.prepare(
    "INSERT OR IGNORE INTO meet_checkins(event_id,user_id,vehicle_id,latitude,longitude) VALUES(?,?,?,?,?)",
  )
    .bind(eventId, user.id, vehicle?.id || null, lat, lng)
    .run();
  if (inserted.meta.changes) {
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET points=points+100 WHERE id=?").bind(
        user.id,
      ),
      env.DB.prepare(
        "INSERT OR IGNORE INTO driver_milestones(user_id,milestone_key,value_number,metadata_json) VALUES(?,'first_meet',1,?)",
      ).bind(user.id, JSON.stringify({ eventId })),
    ]);
  }
  return response({
    checkedIn: true,
    firstCheckIn: Boolean(inserted.meta.changes),
    repAwarded: inserted.meta.changes ? 100 : 0,
    distanceMeters: Math.round(distance),
  });
}

async function voteMeet(env, user, eventId, request) {
  const body = await request.json(),
    allowed = [
      "BEST_BUILD",
      "BEST_SOUND",
      "BEST_WHEELS",
      "BEST_INTERIOR",
      "CROWD_FAVORITE",
    ];
  if (!allowed.includes(body.category) || !body.nomineeUserId)
    return response(
      { error: "Choose a valid category and registered nominee." },
      400,
    );
  const voter = await env.DB.prepare(
    "SELECT 1 ok FROM event_registrations WHERE event_id=? AND user_id=?",
  )
    .bind(eventId, user.id)
    .first();
  if (!voter)
    return response({ error: "Register for this meet before voting." }, 403);
  const nominee = await env.DB.prepare(
    "SELECT 1 ok FROM event_registrations WHERE event_id=? AND user_id=?",
  )
    .bind(eventId, body.nomineeUserId)
    .first();
  if (!nominee)
    return response({ error: "Nominee is not registered for this meet." }, 404);
  const inserted = await env.DB.prepare(
    "INSERT OR IGNORE INTO meet_showcase_votes(event_id,category,voter_user_id,nominee_user_id) VALUES(?,?,?,?)",
  )
    .bind(eventId, body.category, user.id, body.nomineeUserId)
    .run();
  if (!inserted.meta.changes)
    return response({ error: "You already voted in this category." }, 409);
  return response({ voted: true });
}

async function convoys(env, user) {
  const rows = await env.DB.prepare(
    `SELECT c.*,u.username leader_name,cm.role my_role,cm.status my_status,
    EXISTS(SELECT 1 FROM cruise_members x WHERE x.cruise_id=c.id AND x.user_id=?) joined
    FROM cruises c JOIN users u ON u.id=c.host_id LEFT JOIN cruise_members cm ON cm.cruise_id=c.id AND cm.user_id=? WHERE c.status IN ('scheduled','live') OR c.host_id=? ORDER BY c.starts_at`,
  )
    .bind(user.id, user.id, user.id)
    .all();
  const output = [];
  for (const row of rows.results || []) {
    const members = await env.DB.prepare(
      "SELECT cm.user_id,cm.role,cm.status,u.username FROM cruise_members cm JOIN users u ON u.id=cm.user_id WHERE cm.cruise_id=?",
    )
      .bind(row.id)
      .all();
    output.push({
      ...row,
      route: parseJson(row.route_json, {}),
      regroup: parseJson(row.regroup_json, null),
      members: members.results,
    });
  }
  return response({ convoys: output });
}

async function convoyAction(env, user, id, action, request) {
  const convoy = await env.DB.prepare("SELECT * FROM cruises WHERE id=?")
    .bind(id)
    .first();
  if (!convoy) return response({ error: "Convoy not found." }, 404);
  if (action === "role") {
    const body = await request.json(),
      role = ["LEAD", "MID", "SWEEP"].includes(body.role) ? body.role : "MID";
    if (convoy.host_id !== user.id)
      return response({ error: "Only the convoy leader assigns roles." }, 403);
    await env.DB.prepare(
      "UPDATE cruise_members SET role=? WHERE cruise_id=? AND user_id=?",
    )
      .bind(role, id, body.userId)
      .run();
    return response({ updated: true, role });
  }
  if (action === "regroup") {
    if (convoy.host_id !== user.id)
      return response(
        { error: "Only the convoy leader can place a regroup signal." },
        403,
      );
    const body = await request.json();
    if (
      !Number.isFinite(Number(body.latitude)) ||
      !Number.isFinite(Number(body.longitude))
    )
      return response({ error: "Regroup coordinates required." }, 400);
    const pin = {
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      label: String(body.label || "REGROUP"),
      createdAt: new Date().toISOString(),
    };
    await env.DB.prepare("UPDATE cruises SET regroup_json=? WHERE id=?")
      .bind(JSON.stringify(pin), id)
      .run();
    return response({ regroup: pin });
  }
  if (action === "leave") {
    const removed = await env.DB.prepare(
      "DELETE FROM cruise_members WHERE cruise_id=? AND user_id=? AND user_id<>?",
    )
      .bind(id, user.id, convoy.host_id)
      .run();
    if (removed.meta.changes)
      await env.DB.prepare(
        "UPDATE cruises SET member_count=MAX(1,member_count-1) WHERE id=?",
      )
        .bind(id)
        .run();
    return response({ left: Boolean(removed.meta.changes) });
  }
  if (action === "end") {
    if (convoy.host_id !== user.id)
      return response(
        { error: "Only the convoy leader can end this convoy." },
        403,
      );
    const route = parseJson(convoy.route_json, {}),
      members = await env.DB.prepare(
        "SELECT COUNT(*) count FROM cruise_members WHERE cruise_id=?",
      )
        .bind(id)
        .first();
    const recapId = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE cruises SET status='finished',ended_at=CURRENT_TIMESTAMP WHERE id=? AND status<>'finished'",
      ).bind(id),
      env.DB.prepare(
        "INSERT OR IGNORE INTO convoy_recaps(id,cruise_id,host_user_id,distance_km,duration_seconds,member_count,route_json) VALUES(?,?,?,?,?,?,?)",
      ).bind(
        recapId,
        id,
        user.id,
        Number(route.distanceKm || 0),
        Math.max(
          0,
          Math.floor((Date.now() - Date.parse(convoy.starts_at)) / 1000),
        ),
        Number(members?.count || 0),
        JSON.stringify(route),
      ),
      env.DB.prepare(
        "INSERT OR IGNORE INTO user_badges(user_id,badge_id) VALUES(?,'convoy-lead')",
      ).bind(user.id),
    ]);
    return response({ ended: true, recapId });
  }
  return response({ error: "Unknown convoy action." }, 400);
}

async function consumeGhostKey(env, user, request) {
  const body = await request.json(),
    unlockType = String(body.unlockType || "").toLowerCase(),
    unlockId = String(body.unlockId || "").trim();
  if (
    !["black_market", "classified_drop", "contract", "safe_house"].includes(
      unlockType,
    ) ||
    !unlockId
  )
    return response({ error: "Choose a supported classified unlock." }, 400);
  const existing = await env.DB.prepare(
    "SELECT unlocked_at FROM ghost_key_unlocks WHERE user_id=? AND unlock_type=? AND unlock_id=?",
  )
    .bind(user.id, unlockType, unlockId)
    .first();
  if (existing)
    return response({
      unlocked: true,
      replayed: true,
      unlockedAt: existing.unlocked_at,
    });
  const transactionId = crypto.randomUUID(),
    source = `UNLOCK ${unlockType.toUpperCase()}`;
  try {
    const results = await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO ghost_key_transactions(id,user_id,amount,source,source_id)
        SELECT ?,?,-1,?,? WHERE EXISTS(SELECT 1 FROM ghost_keys WHERE user_id=? AND balance>=1)`,
      ).bind(transactionId, user.id, source, unlockId, user.id),
      env.DB.prepare(
        `UPDATE ghost_keys SET balance=balance-1,lifetime_spent=lifetime_spent+1,updated_at=CURRENT_TIMESTAMP
        WHERE user_id=? AND balance>=1 AND EXISTS(SELECT 1 FROM ghost_key_transactions WHERE id=?)`,
      ).bind(user.id, transactionId),
      env.DB.prepare(
        `INSERT INTO ghost_key_unlocks(user_id,unlock_type,unlock_id,transaction_id)
        SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM ghost_key_transactions WHERE id=?)`,
      ).bind(user.id, unlockType, unlockId, transactionId, transactionId),
    ]);
    if (
      !results[0].meta.changes ||
      !results[1].meta.changes ||
      !results[2].meta.changes
    )
      return response({ error: "A Ghost Key is required." }, 409);
    return response({ unlocked: true, replayed: false, transactionId });
  } catch {
    const replay = await env.DB.prepare(
      "SELECT unlocked_at FROM ghost_key_unlocks WHERE user_id=? AND unlock_type=? AND unlock_id=?",
    )
      .bind(user.id, unlockType, unlockId)
      .first();
    if (replay)
      return response({
        unlocked: true,
        replayed: true,
        unlockedAt: replay.unlocked_at,
      });
    throw new Error("Ghost Key unlock transaction failed.");
  }
}

async function qrValidate(env, user, request) {
  const body = await request.json(),
    parsed = parseApexQr(body.payload);
  if (!parsed)
    return response({ error: "This is not a valid Apex QR payload." }, 400);
  const table = {
    DRIVER: "users",
    PROFILE: "users",
    VEHICLE: "vehicles",
    CREW: "crews",
    MEET: "events",
    BUILD: "build_plans",
    INVITE: "invite_codes",
  }[parsed.type];
  const target = await env.DB.prepare(`SELECT id FROM ${table} WHERE id=?`)
    .bind(parsed.targetId)
    .first();
  if (!target) return response({ error: "Apex target no longer exists." }, 404);
  await env.DB.prepare(
    "INSERT INTO qr_scan_history(id,user_id,payload_type,target_id) VALUES(?,?,?,?)",
  )
    .bind(crypto.randomUUID(), user.id, parsed.type, parsed.targetId)
    .run();
  return response({
    valid: true,
    ...parsed,
    path: {
      DRIVER: "/app/profile",
      PROFILE: "/app/profile",
      VEHICLE: "/app/garage",
      CREW: "/app/social/crews",
      MEET: "/app/events/meets",
      BUILD: "/app/garage",
      INVITE: "/app/settings/access",
    }[parsed.type],
  });
}

export async function handlePhase3({ request, env, user, path, method }) {
  if (path === "v3/leaderboards" && method === "GET")
    return leaderboard(env, user, request);
  if (path === "v3/profile" && method === "GET")
    return driverProfile(env, user, null);
  const profile = path.match(/^v3\/profile\/([^/]+)$/);
  if (profile && method === "GET") return driverProfile(env, user, profile[1]);
  if (path === "v3/performance" && method === "POST")
    return savePerformance(env, user, request);
  if (path === "v3/meets" && method === "GET") return listMeets(env, user);
  if (path === "v3/meets" && method === "POST")
    return createMeet(env, user, request);
  const checkin = path.match(/^v3\/meets\/([^/]+)\/checkin$/);
  if (checkin && method === "POST")
    return checkInMeet(env, user, checkin[1], request);
  const meetVote = path.match(/^v3\/meets\/([^/]+)\/vote$/);
  if (meetVote && method === "POST")
    return voteMeet(env, user, meetVote[1], request);
  if (path === "v3/convoys" && method === "GET") return convoys(env, user);
  const convoy = path.match(/^v3\/convoys\/([^/]+)\/(role|regroup|leave|end)$/);
  if (convoy && method === "POST")
    return convoyAction(env, user, convoy[1], convoy[2], request);
  if (path === "v3/ghost-keys" && method === "GET") {
    const [wallet, unlocks] = await Promise.all([
      env.DB.prepare(
        "SELECT balance,lifetime_earned,lifetime_spent FROM ghost_keys WHERE user_id=?",
      )
        .bind(user.id)
        .first(),
      env.DB.prepare(
        "SELECT unlock_type,unlock_id,unlocked_at FROM ghost_key_unlocks WHERE user_id=? ORDER BY unlocked_at DESC",
      )
        .bind(user.id)
        .all(),
    ]);
    return response({
      wallet: wallet || { balance: 0, lifetime_earned: 0, lifetime_spent: 0 },
      unlocks: unlocks.results,
    });
  }
  if (path === "v3/ghost-keys/unlock" && method === "POST")
    return consumeGhostKey(env, user, request);
  if (path === "v3/qr/validate" && method === "POST")
    return qrValidate(env, user, request);
  if (path === "v3/chest/audit" && method === "GET") {
    const today = utcDay(),
      chest = await env.DB.prepare(
        "SELECT * FROM daily_ghost_chests WHERE user_id=?",
      )
        .bind(user.id)
        .first(),
      claim = await env.DB.prepare(
        "SELECT * FROM daily_ghost_claims WHERE user_id=? AND claim_date=?",
      )
        .bind(user.id, today)
        .first();
    return response({
      today,
      available: !claim,
      lastClaimedDate: chest?.last_claimed_date || null,
      claim: claim || null,
      consistent:
        Boolean(claim) === Boolean(chest?.last_claimed_date === today),
    });
  }
  return null;
}

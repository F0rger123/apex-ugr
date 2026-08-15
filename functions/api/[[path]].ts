/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  EBAY_CLIENT_ID?: string;
  EBAY_CLIENT_SECRET?: string;
}

type UserRow = {
  id: string; email: string; username: string; display_name: string; avatar_url: string | null;
  credits: number; points: number; tier: string; wins: number; losses: number;
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,content-type',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: cors });
}

function bytesToBase64(bytes: Uint8Array) {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(digest));
}

async function passwordHash(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 210_000 }, key, 256);
  return bytesToBase64(new Uint8Array(bits));
}

function publicUser(user: UserRow) {
  return {
    id: user.id, email: user.email, username: user.username, displayName: user.display_name,
    avatarUrl: user.avatar_url, credits: user.credits, points: user.points, tier: user.tier,
    wins: user.wins, losses: user.losses,
  };
}

async function authenticatedUser(request: Request, env: Env) {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return null;
  const tokenHash = await sha256(bearer);
  return env.DB.prepare(`SELECT u.id,u.email,u.username,u.display_name,u.avatar_url,u.credits,u.points,u.tier,u.wins,u.losses
    FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`)
    .bind(tokenHash, new Date().toISOString()).first<UserRow>();
}

async function createSession(user: UserRow, env: Env) {
  const token = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll('-', '')}`;
  const tokenHash = await sha256(token);
  const expires = new Date(Date.now() + 30 * 86400_000).toISOString();
  await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(tokenHash, user.id, expires).run();
  return { token, user: publicUser(user) };
}

function providerSearches(vehicle: Record<string, string | number>, query: string) {
  const terms = encodeURIComponent(`${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''} ${query}`.replace(/\s+/g, ' ').trim());
  const make = String(vehicle.make).toLowerCase();
  const providers = [
    { name: 'AutoZone', mode: 'direct_search', url: `https://www.autozone.com/searchresult?searchText=${terms}` },
    { name: 'Summit Racing', mode: 'direct_search', url: `https://www.summitracing.com/search?keyword=${terms}` },
    { name: 'Vivid Racing', mode: 'direct_search', url: `https://www.vividracing.com/catalogsearch/result/?q=${terms}` },
  ];
  const jdm = new Set(['acura','honda','infiniti','lexus','mazda','mitsubishi','nissan','scion','subaru','suzuki','toyota']);
  const american = new Set(['buick','cadillac','chevrolet','chrysler','dodge','ford','gmc','jeep','lincoln','pontiac','ram']);
  const european = new Set(['alfa romeo','audi','bentley','bmw','fiat','jaguar','land rover','mercedes-benz','mini','porsche','saab','volkswagen','volvo']);
  if (jdm.has(make)) providers.push(
    { name: 'Enjuku Racing', mode: 'direct_search', url: `https://www.enjukuracing.com/search.php?search_query=${terms}` },
    { name: 'MAPerformance', mode: 'direct_search', url: `https://www.maperformance.com/search?type=product&q=${terms}` },
    { name: 'Nengun Performance', mode: 'direct_search', url: `https://www.nengun.com/search?q=${terms}` },
  );
  if (american.has(make)) providers.push(
    { name: 'AmericanMuscle', mode: 'direct_search', url: `https://www.americanmuscle.com/search?keywords=${terms}` },
    { name: 'JEGS', mode: 'direct_search', url: `https://www.jegs.com/webapp/wcs/stores/servlet/SearchResultsPageCmd?Ntt=${terms}` },
  );
  if (european.has(make)) providers.push(
    { name: 'ECS Tuning', mode: 'direct_search', url: `https://www.ecstuning.com/Search/SiteSearch/${terms}/` },
    { name: 'FCP Euro', mode: 'direct_search', url: `https://www.fcpeuro.com/page/search?query=${terms}` },
  );
  return providers;
}

async function handle(request: Request, env: Env, path: string) {
  const method = request.method;
  if (method === 'OPTIONS') return new Response(null, { headers: cors });
  if (path === 'health') return json({ status: 'live', backend: 'cloudflare', storage: 'd1+r2' });
  if (path.startsWith('media/') && method === 'GET') {
    const key=decodeURIComponent(path.slice(6));
    const object=await env.MEDIA.get(key);
    if(!object) return json({error:'Media not found.'},404);
    const headers=new Headers(cors); object.writeHttpMetadata(headers); headers.set('etag',object.httpEtag); headers.set('Cache-Control','public,max-age=31536000,immutable');
    return new Response(object.body,{headers});
  }

  if (path === 'auth/signup' && method === 'POST') {
    const body = await request.json<{ email?: string; password?: string }>();
    const email = body.email?.trim().toLowerCase() || '';
    if (!/^\S+@\S+\.\S+$/.test(email) || (body.password?.length || 0) < 8) return json({ error: 'Use a valid email and at least 8 password characters.' }, 400);
    const usernameBase = email.split('@')[0].replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'pilot';
    const username = `${usernameBase}_${crypto.randomUUID().slice(0, 5)}`;
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const id = crypto.randomUUID();
    try {
      await env.DB.prepare(`INSERT INTO users(id,email,username,display_name,password_hash,password_salt) VALUES(?,?,?,?,?,?)`)
        .bind(id, email, username, usernameBase.toUpperCase(), await passwordHash(body.password!, salt), bytesToBase64(salt)).run();
    } catch { return json({ error: 'An account already exists for that email.' }, 409); }
    const user = await env.DB.prepare('SELECT id,email,username,display_name,avatar_url,credits,points,tier,wins,losses FROM users WHERE id=?').bind(id).first<UserRow>();
    return json(await createSession(user!, env), 201);
  }

  if (path === 'auth/signin' && method === 'POST') {
    const body = await request.json<{ email?: string; password?: string }>();
    const row = await env.DB.prepare(`SELECT id,email,username,display_name,avatar_url,credits,points,tier,wins,losses,password_hash,password_salt FROM users WHERE email=?`)
      .bind(body.email?.trim().toLowerCase() || '').first<UserRow & { password_hash: string; password_salt: string }>();
    if (!row || await passwordHash(body.password || '', base64ToBytes(row.password_salt)) !== row.password_hash) return json({ error: 'Invalid email or password.' }, 401);
    return json(await createSession(row, env));
  }

  const user = await authenticatedUser(request, env);
  if (!user) return json({ error: 'Authentication required.' }, 401);

  if (path === 'session' && method === 'GET') return json({ user: publicUser(user) });
  if (path === 'auth/signout' && method === 'POST') {
    const bearer = request.headers.get('authorization')!.replace(/^Bearer\s+/i, '');
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha256(bearer)).run();
    return json({ success: true });
  }

  if (path === 'vehicles' && method === 'GET') {
    const result = await env.DB.prepare('SELECT * FROM vehicles WHERE user_id=? ORDER BY is_active DESC,created_at DESC').bind(user.id).all();
    return json({ vehicles: result.results });
  }
  if (path === 'vehicles' && method === 'POST') {
    const body = await request.json<Record<string, string | number>>();
    if (!Number.isInteger(Number(body.year)) || !body.make || !body.model) return json({ error: 'Year, make, and model are required.' }, 400);
    const id = crypto.randomUUID();
    const existing = await env.DB.prepare('SELECT COUNT(*) count FROM vehicles WHERE user_id=?').bind(user.id).first<{ count: number }>();
    await env.DB.prepare(`INSERT INTO vehicles(id,user_id,nickname,year,make,model,trim,engine,drivetrain,horsepower,color,photo_url,is_active)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,user.id,body.nickname||`${body.make} ${body.model}`,Number(body.year),body.make,body.model,body.trim||null,body.engine||null,body.drivetrain||null,Number(body.horsepower)||0,body.color||null,body.photoUrl||null,existing?.count?0:1).run();
    return json({ id }, 201);
  }
  const activateVehicle=path.match(/^vehicles\/([^/]+)\/active$/);
  if(activateVehicle&&method==='POST'){
    const vehicle=await env.DB.prepare('SELECT id FROM vehicles WHERE id=? AND user_id=?').bind(activateVehicle[1],user.id).first();
    if(!vehicle)return json({error:'Vehicle not found.'},404);
    await env.DB.batch([
      env.DB.prepare('UPDATE vehicles SET is_active=0 WHERE user_id=?').bind(user.id),
      env.DB.prepare('UPDATE vehicles SET is_active=1 WHERE id=? AND user_id=?').bind(activateVehicle[1],user.id),
    ]);
    return json({success:true});
  }

  if (path === 'network' && method === 'GET') {
    const now = new Date().toISOString();
    const [drivers, events, cruises] = await Promise.all([
      env.DB.prepare(`SELECT l.*,u.username,u.avatar_url,u.privacy_mode,u.tier,u.wins,u.losses,v.year,v.make,v.model FROM driver_locations l JOIN users u ON u.id=l.user_id LEFT JOIN vehicles v ON v.id=l.vehicle_id WHERE l.expires_at>? AND l.user_id<>?`).bind(now,user.id).all(),
      env.DB.prepare('SELECT * FROM events WHERE ends_at IS NULL OR ends_at>? ORDER BY starts_at').bind(now).all(),
      env.DB.prepare("SELECT * FROM cruises WHERE status IN ('scheduled','live') ORDER BY starts_at").all(),
    ]);
    return json({ drivers: drivers.results, events: events.results, cruises: cruises.results });
  }
  if (path === 'location' && method === 'POST') {
    const body = await request.json<Record<string, number | string | boolean | null>>();
    const expires = new Date(Date.now()+90_000).toISOString();
    await env.DB.prepare(`INSERT INTO driver_locations(user_id,vehicle_id,latitude,longitude,accuracy_m,altitude_m,speed_kph,heading,drive_mode,cruise_id,expires_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET vehicle_id=excluded.vehicle_id,latitude=excluded.latitude,longitude=excluded.longitude,accuracy_m=excluded.accuracy_m,altitude_m=excluded.altitude_m,speed_kph=excluded.speed_kph,heading=excluded.heading,drive_mode=excluded.drive_mode,cruise_id=excluded.cruise_id,expires_at=excluded.expires_at,updated_at=CURRENT_TIMESTAMP`)
      .bind(user.id,body.vehicleId||null,body.latitude,body.longitude,body.accuracy,body.altitude,body.speedKph||0,body.heading||0,body.driveMode?1:0,body.cruiseId||null,expires).run();
    return json({ success: true });
  }

  if (path === 'feed' && method === 'GET') {
    const posts = await env.DB.prepare(`SELECT p.id,p.user_id,p.media_url,p.media_type,p.caption,p.created_at,u.username,u.avatar_url,
      (SELECT COUNT(*) FROM post_likes l WHERE l.post_id=p.id) likes,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) comments,
      EXISTS(SELECT 1 FROM post_likes l WHERE l.post_id=p.id AND l.user_id=?) liked,
      EXISTS(SELECT 1 FROM post_saves s WHERE s.post_id=p.id AND s.user_id=?) saved
      FROM posts p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT 50`).bind(user.id,user.id).all();
    return json({ posts: posts.results });
  }
  if (path === 'posts' && method === 'POST') {
    const body = await request.json<{ mediaUrl?: string; mediaType?: string; caption?: string }>();
    if (!body.mediaUrl || !['photo','video'].includes(body.mediaType || '')) return json({ error: 'Uploaded photo or video required.' }, 400);
    const id=crypto.randomUUID();
    await env.DB.prepare('INSERT INTO posts(id,user_id,media_url,media_type,caption) VALUES(?,?,?,?,?)').bind(id,user.id,body.mediaUrl,body.mediaType,body.caption?.slice(0,1000)||'').run();
    return json({ id },201);
  }
  const postAction = path.match(/^posts\/([^/]+)\/(like|save|comment)$/);
  if (postAction && method === 'POST') {
    const [,postId,action]=postAction;
    if (action==='comment') {
      const body=await request.json<{ body?: string }>();
      if (!body.body?.trim()) return json({error:'Comment required.'},400);
      await env.DB.prepare('INSERT INTO comments(id,post_id,user_id,body) VALUES(?,?,?,?)').bind(crypto.randomUUID(),postId,user.id,body.body.trim().slice(0,500)).run();
      return json({active:true});
    }
    const table=action==='like'?'post_likes':'post_saves';
    const current=await env.DB.prepare(`SELECT 1 found FROM ${table} WHERE post_id=? AND user_id=?`).bind(postId,user.id).first();
    if(current) await env.DB.prepare(`DELETE FROM ${table} WHERE post_id=? AND user_id=?`).bind(postId,user.id).run();
    else await env.DB.prepare(`INSERT INTO ${table}(post_id,user_id) VALUES(?,?)`).bind(postId,user.id).run();
    return json({active:!current});
  }

  if (path === 'leaderboard' && method === 'GET') {
    const rows=await env.DB.prepare(`SELECT id,username,avatar_url,tier,points,wins,(wins+losses) entered FROM users ORDER BY points DESC,wins DESC,created_at ASC LIMIT 100`).all();
    return json({ rankings: rows.results });
  }

  if (path === 'races' && method === 'POST') {
    const body=await request.json<{opponentIds?:string[];raceType?:string;routeName?:string;distanceMiles?:number;rules?:string;startsAt?:string;wagerCredits?:number}>();
    const opponents=[...new Set((body.opponentIds||[]).filter(id=>id&&id!==user.id))].slice(0,12);
    const wager=Math.max(0,Math.floor(Number(body.wagerCredits)||0));
    if(!opponents.length||!body.raceType||!body.startsAt) return json({error:'Opponent, race type, and start time are required.'},400);
    if(wager>user.credits) return json({error:'Wager exceeds available Apex Credits.'},400);
    const id=crypto.randomUUID();
    const statements=[env.DB.prepare(`INSERT INTO race_contracts(id,challenger_id,race_type,route_name,distance_miles,rules,starts_at,wager_credits) VALUES(?,?,?,?,?,?,?,?)`).bind(id,user.id,body.raceType,body.routeName||body.raceType,Number(body.distanceMiles)||0,body.rules||'',body.startsAt,wager)];
    for(const opponentId of opponents){
      statements.push(env.DB.prepare('INSERT OR IGNORE INTO race_opponents(race_id,user_id) VALUES(?,?)').bind(id,opponentId));
      statements.push(env.DB.prepare(`INSERT INTO notifications(id,user_id,type,title,body,data_json) VALUES(?,?,?,?,?,?)`).bind(crypto.randomUUID(),opponentId,'race_challenge','RACE CHALLENGE',`${user.username} staged a ${body.raceType} run`,JSON.stringify({raceId:id})));
    }
    await env.DB.batch(statements);
    return json({id,status:'pending'},201);
  }

  if (path === 'notifications' && method === 'GET') {
    const rows=await env.DB.prepare('SELECT id,user_id,type,title,body,data_json,is_read,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(user.id).all();
    return json({notifications:rows.results.map(row=>({...row,data:JSON.parse(String(row.data_json||'{}')),read:Boolean(row.is_read)}))});
  }
  if (path === 'notifications/read-all' && method === 'POST') {
    await env.DB.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').bind(user.id).run();
    return json({success:true});
  }
  const readNotification=path.match(/^notifications\/([^/]+)\/read$/);
  if(readNotification&&method==='POST'){
    await env.DB.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').bind(readNotification[1],user.id).run();
    return json({success:true});
  }

  if(path==='conversations'&&method==='GET'){
    const rows=await env.DB.prepare(`SELECT c.* FROM conversations c JOIN conversation_members m ON m.conversation_id=c.id WHERE m.user_id=? ORDER BY c.updated_at DESC`).bind(user.id).all<Record<string,unknown>>();
    const conversations=await Promise.all(rows.results.map(async conversation=>{
      const other=await env.DB.prepare(`SELECT u.id,u.username,u.display_name,u.avatar_url FROM conversation_members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=? AND m.user_id<>? LIMIT 1`).bind(conversation.id,user.id).first();
      return {...conversation,other_profile:other||null};
    }));
    return json({conversations});
  }
  if(path==='conversations'&&method==='POST'){
    const body=await request.json<{participantId?:string;groupName?:string}>();
    if(!body.participantId||body.participantId===user.id)return json({error:'Choose another pilot.'},400);
    const existing=await env.DB.prepare(`SELECT c.id FROM conversations c JOIN conversation_members a ON a.conversation_id=c.id AND a.user_id=? JOIN conversation_members b ON b.conversation_id=c.id AND b.user_id=? WHERE c.is_group=0 LIMIT 1`).bind(user.id,body.participantId).first<{id:string}>();
    if(existing)return json({id:existing.id});
    const id=crypto.randomUUID();
    await env.DB.batch([env.DB.prepare('INSERT INTO conversations(id,group_name,is_group) VALUES(?,?,0)').bind(id,body.groupName||null),env.DB.prepare('INSERT INTO conversation_members(conversation_id,user_id) VALUES(?,?)').bind(id,user.id),env.DB.prepare('INSERT INTO conversation_members(conversation_id,user_id) VALUES(?,?)').bind(id,body.participantId)]);
    return json({id},201);
  }
  const conversationMessages=path.match(/^conversations\/([^/]+)\/messages$/);
  if(conversationMessages){
    const conversationId=conversationMessages[1];
    const member=await env.DB.prepare('SELECT 1 found FROM conversation_members WHERE conversation_id=? AND user_id=?').bind(conversationId,user.id).first();
    if(!member)return json({error:'Conversation not found.'},404);
    if(method==='GET'){
      const rows=await env.DB.prepare(`SELECT m.*,u.username,u.avatar_url FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.conversation_id=? ORDER BY m.created_at ASC LIMIT 100`).bind(conversationId).all();
      return json({messages:rows.results});
    }
    if(method==='POST'){
      const body=await request.json<{content?:string;mediaUrl?:string;mediaType?:string}>();
      if(!body.content?.trim()&&!body.mediaUrl)return json({error:'Message cannot be empty.'},400);
      const id=crypto.randomUUID(); const content=body.content?.trim().slice(0,2000)||'';
      await env.DB.batch([env.DB.prepare('INSERT INTO messages(id,conversation_id,sender_id,content,media_url,media_type) VALUES(?,?,?,?,?,?)').bind(id,conversationId,user.id,content,body.mediaUrl||null,body.mediaType||'text'),env.DB.prepare('UPDATE conversations SET last_message=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(content||'Media',conversationId)]);
      return json({message:{id,conversation_id:conversationId,sender_id:user.id,content,media_url:body.mediaUrl||null,media_type:body.mediaType||'text',created_at:new Date().toISOString()}},201);
    }
  }

  const eventRsvp=path.match(/^events\/([^/]+)\/rsvp$/);
  if(eventRsvp&&method==='POST'){
    const current=await env.DB.prepare('SELECT 1 found FROM event_rsvps WHERE event_id=? AND user_id=?').bind(eventRsvp[1],user.id).first();
    if(current)await env.DB.prepare('DELETE FROM event_rsvps WHERE event_id=? AND user_id=?').bind(eventRsvp[1],user.id).run();
    else await env.DB.prepare('INSERT INTO event_rsvps(event_id,user_id) VALUES(?,?)').bind(eventRsvp[1],user.id).run();
    const count=await env.DB.prepare('SELECT COUNT(*) count FROM event_rsvps WHERE event_id=?').bind(eventRsvp[1]).first<{count:number}>();
    await env.DB.prepare('UPDATE events SET attendees=? WHERE id=?').bind(count?.count||0,eventRsvp[1]).run();
    return json({active:!current,attendees:count?.count||0});
  }

  if (path === 'upload' && method === 'POST') {
    const form=await request.formData();
    const file=form.get('file');
    if(!(file instanceof File) || file.size>30*1024*1024) return json({error:'Upload must be a file under 30 MB.'},400);
    const extension=(file.name.split('.').pop()||'bin').replace(/[^a-z0-9]/gi,'').slice(0,6);
    const key=`${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type||'application/octet-stream'}});
    return json({url:`/api/media/${encodeURIComponent(key)}`},201);
  }
  if (path === 'parts-search' && method === 'POST') {
    const body=await request.json<{vehicle?:Record<string,string|number>;query?:string}>();
    if(!body.vehicle?.year||!body.vehicle.make||!body.vehicle.model) return json({error:'Select a complete vehicle first.'},400);
    const query=(body.query||'performance parts').slice(0,80);
    return json({products:[],providers:[{name:'eBay Motors',mode:env.EBAY_CLIENT_ID&&env.EBAY_CLIENT_SECRET?'live':'pending_approval'},...providerSearches(body.vehicle,query)]});
  }

  if (path === 'routes' && method === 'POST') {
    const body=await request.json<{origin?:{latitude:number;longitude:number};destination?:string}>();
    if(!body.origin||!body.destination?.trim()) return json({error:'Current location and destination are required.'},400);
    const geoUrl=new URL('https://nominatim.openstreetmap.org/search');
    geoUrl.searchParams.set('q',body.destination.trim()); geoUrl.searchParams.set('format','jsonv2'); geoUrl.searchParams.set('limit','1');
    const geo=await fetch(geoUrl,{headers:{'User-Agent':'ApexUGR/1.0 (apex-ugr.pages.dev)'}});
    const places=await geo.json<Array<{lat:string;lon:string;display_name:string}>>();
    if(!places[0]) return json({error:'Destination not found.'},404);
    const target={latitude:Number(places[0].lat),longitude:Number(places[0].lon),name:places[0].display_name};
    const routeUrl=`https://router.project-osrm.org/route/v1/driving/${body.origin.longitude},${body.origin.latitude};${target.longitude},${target.latitude}?overview=full&geometries=geojson`;
    const routed=await fetch(routeUrl); const route=await routed.json<{routes?:Array<{distance:number;duration:number;geometry:{coordinates:number[][]}}>}>();
    if(!route.routes?.[0]) return json({error:'No drivable route found.'},404);
    return json({destination:target,distanceKm:route.routes[0].distance/1000,durationMinutes:route.routes[0].duration/60,coordinates:route.routes[0].geometry.coordinates.map(([longitude,latitude])=>({latitude,longitude}))});
  }

  return json({ error: 'Not found.' }, 404);
}

export const onRequest: PagesFunction<Env> = async context => {
  const raw=context.params.path;
  const path=Array.isArray(raw)?raw.join('/'):String(raw||'');
  try { return await handle(context.request,context.env,path); }
  catch(error) { console.error(JSON.stringify({event:'api_error',path,message:error instanceof Error?error.message:'unknown'})); return json({error:'Request failed.'},500); }
};

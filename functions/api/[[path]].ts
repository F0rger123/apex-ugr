/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  EBAY_CLIENT_ID?: string;
  EBAY_CLIENT_SECRET?: string;
}

type UserRow = {
  id: string; email: string; username: string; display_name: string; avatar_url: string | null;
  credits: number; points: number; tier: string; wins: number; losses: number; reputation: number; decline_streak: number;
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,content-type',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

const DEVELOPER_EMAIL = 'drummerforger@gmail.com';
const ROOT_ACCESS_CODE = 'APEXORIGIN26';

function normalizeInviteCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function createInviteCode() {
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes=crypto.getRandomValues(new Uint8Array(8));
  const value=Array.from(bytes,byte=>alphabet[byte%alphabet.length]).join('');
  return `APEX-${value.slice(0,4)}-${value.slice(4)}`;
}

function distanceMeters(aLat:number,aLng:number,bLat:number,bLng:number){const rad=Math.PI/180;const dLat=(bLat-aLat)*rad,dLng=(bLng-aLng)*rad;const h=Math.sin(dLat/2)**2+Math.cos(aLat*rad)*Math.cos(bLat*rad)*Math.sin(dLng/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}

function generatedImageBlock(value:unknown):{data:string;mimeType:string}|null{
  if(!value||typeof value!=='object')return null;const row=value as Record<string,unknown>;
  if(row.type==='image'&&typeof row.data==='string')return{data:row.data,mimeType:typeof row.mime_type==='string'?row.mime_type:'image/png'};
  for(const child of Object.values(row)){if(Array.isArray(child)){for(const item of child){const found=generatedImageBlock(item);if(found)return found;}}else{const found=generatedImageBlock(child);if(found)return found;}}
  return null;
}

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
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 }, key, 256);
  return bytesToBase64(new Uint8Array(bits));
}

function publicUser(user: UserRow) {
  return {
    id: user.id, email: user.email, username: user.username, displayName: user.display_name,
    avatarUrl: user.avatar_url, credits: user.credits, points: user.points, tier: user.tier,
    wins: user.wins, losses: user.losses, reputation: user.reputation, declineStreak: user.decline_streak,
    isDeveloper: user.email.toLowerCase() === DEVELOPER_EMAIL,
  };
}

async function authenticatedUser(request: Request, env: Env) {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return null;
  const tokenHash = await sha256(bearer);
  return env.DB.prepare(`SELECT u.id,u.email,u.username,u.display_name,u.avatar_url,u.credits,u.points,u.tier,u.wins,u.losses,u.reputation,u.decline_streak
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

async function geocode(destination: string) {
  const geoUrl=new URL('https://nominatim.openstreetmap.org/search');
  geoUrl.searchParams.set('q',destination.trim()); geoUrl.searchParams.set('format','jsonv2'); geoUrl.searchParams.set('limit','1');
  const geo=await fetch(geoUrl,{headers:{'User-Agent':'ApexUGR/1.0 (https://apex-ugr.pages.dev)'}});
  const places=await geo.json<Array<{lat:string;lon:string;display_name:string}>>();
  if(!places[0]) return null;
  return {latitude:Number(places[0].lat),longitude:Number(places[0].lon),name:places[0].display_name};
}

async function addressSuggestions(query: string) {
  const geoUrl=new URL('https://nominatim.openstreetmap.org/search');
  geoUrl.searchParams.set('q',query.trim()); geoUrl.searchParams.set('format','jsonv2'); geoUrl.searchParams.set('limit','6'); geoUrl.searchParams.set('addressdetails','1');
  const response=await fetch(geoUrl,{headers:{'User-Agent':'ApexUGR/1.0 (https://apex-ugr.pages.dev)','Accept-Language':'en'}});
  const places=await response.json<Array<{place_id:number;lat:string;lon:string;display_name:string;type?:string}>>();
  const unique=new Map<string,{id:string;name:string;latitude:number;longitude:number;type:string}>();
  for(const place of places){if(!unique.has(place.display_name))unique.set(place.display_name,{id:String(place.place_id),name:place.display_name,latitude:Number(place.lat),longitude:Number(place.lon),type:place.type||'place'});}
  return [...unique.values()];
}

async function vehicleCatalog(year: string | null, make: string | null) {
  if(make){
    const url=`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${encodeURIComponent(year||String(new Date().getFullYear()))}?format=json`;
    const response=await fetch(url); const data=await response.json<{Results?:Array<{Model_Name:string}>}>();
    let models=[...new Set((data.Results||[]).map(row=>row.Model_Name).filter(Boolean))].sort();
    if(!models.length){const fallback=await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodeURIComponent(make)}?format=json`);const fallbackData=await fallback.json<{Results?:Array<{Model_Name:string}>}>();models=[...new Set((fallbackData.Results||[]).map(row=>row.Model_Name).filter(Boolean))].sort();}
    return {models};
  }
  const response=await fetch('https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json');
  const data=await response.json<{Results?:Array<{Make_Name:string}>}>();
  return {makes:[...new Set((data.Results||[]).map(row=>row.Make_Name).filter(Boolean))].sort()};
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

  if(path==='invite/verify'&&method==='POST'){
    const body=await request.json<{code?:string}>();const code=normalizeInviteCode(body.code||'');
    if(code===ROOT_ACCESS_CODE)return json({valid:true,label:'ORIGIN ACCESS',remaining:9999,expiresAt:null});
    const invite=await env.DB.prepare(`SELECT label,max_uses,use_count,expires_at FROM invite_codes WHERE REPLACE(code,'-','')=? AND is_active=1 AND use_count<max_uses AND (expires_at IS NULL OR expires_at>?)`).bind(code,new Date().toISOString()).first<{label:string;max_uses:number;use_count:number;expires_at:string|null}>();
    if(!invite)return json({error:'Access code is invalid, expired, or fully redeemed.'},404);
    return json({valid:true,label:invite.label,remaining:invite.max_uses-invite.use_count,expiresAt:invite.expires_at});
  }

  if (path === 'auth/signup' && method === 'POST') {
    const body = await request.json<{ email?: string; password?: string; inviteCode?:string }>();
    const email = body.email?.trim().toLowerCase() || '';
    if (!/^\S+@\S+\.\S+$/.test(email) || (body.password?.length || 0) < 8) return json({ error: 'Use a valid email and at least 8 password characters.' }, 400);
    const usernameBase = email.split('@')[0].replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'pilot';
    const username = `${usernameBase}_${crypto.randomUUID().slice(0, 5)}`;
    const existing=await env.DB.prepare('SELECT 1 found FROM users WHERE email=?').bind(email).first();
    if(existing)return json({error:'An account already exists for that email. Sign in instead or use another email.'},409);
    let invite:{id:string;burn_after_use:number}|null=null;
    if(email!==DEVELOPER_EMAIL&&normalizeInviteCode(body.inviteCode||'')!==ROOT_ACCESS_CODE){
      const code=normalizeInviteCode(body.inviteCode||'');
      invite=await env.DB.prepare(`SELECT id,burn_after_use FROM invite_codes WHERE REPLACE(code,'-','')=? AND is_active=1 AND use_count<max_uses AND (expires_at IS NULL OR expires_at>?)`).bind(code,new Date().toISOString()).first<{id:string;burn_after_use:number}>();
      if(!invite)return json({error:'A valid private access code is required.'},403);
      const reserved=await env.DB.prepare(`UPDATE invite_codes SET use_count=use_count+1 WHERE id=? AND is_active=1 AND use_count<max_uses AND (expires_at IS NULL OR expires_at>?)`).bind(invite.id,new Date().toISOString()).run();
      if(!reserved.meta.changes)return json({error:'This access code has reached its limit.'},409);
    }
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const id = crypto.randomUUID();
    const hash=await passwordHash(body.password!,salt);
    try {
      const statements=[env.DB.prepare(`INSERT INTO users(id,email,username,display_name,password_hash,password_salt) VALUES(?,?,?,?,?,?)`).bind(id,email,username,usernameBase.toUpperCase(),hash,bytesToBase64(salt))];
      if(invite)statements.push(env.DB.prepare('INSERT INTO invite_redemptions(code_id,user_id,email) VALUES(?,?,?)').bind(invite.id,id,email));
      if(invite?.burn_after_use)statements.push(env.DB.prepare('UPDATE invite_codes SET is_active=0 WHERE id=?').bind(invite.id));
      await env.DB.batch(statements);
    } catch(error) { if(invite)await env.DB.prepare('UPDATE invite_codes SET use_count=MAX(0,use_count-1) WHERE id=?').bind(invite.id).run();console.error('signup_insert_failed',error); return json({ error: 'Account creation failed. Please try again.' }, 500); }
    const user = await env.DB.prepare('SELECT id,email,username,display_name,avatar_url,credits,points,tier,wins,losses,reputation,decline_streak FROM users WHERE id=?').bind(id).first<UserRow>();
    return json(await createSession(user!, env), 201);
  }

  if (path === 'auth/signin' && method === 'POST') {
    const body = await request.json<{ email?: string; password?: string }>();
    const row = await env.DB.prepare(`SELECT id,email,username,display_name,avatar_url,credits,points,tier,wins,losses,reputation,decline_streak,password_hash,password_salt FROM users WHERE email=?`)
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

  if(path==='invites'&&method==='GET'){
    const codes=await env.DB.prepare('SELECT * FROM invite_codes WHERE created_by=? ORDER BY created_at DESC').bind(user.id).all();
    return json({codes:codes.results,redemptions:[]});
  }
  if(path==='invites'&&method==='POST'){
    const body=await request.json<{label?:string;maxUses?:number;expiresAt?:string|null;burnAfterUse?:boolean}>();const requestedUses=Math.min(25,Math.max(1,Math.floor(Number(body.maxUses)||1)));const burnAfterUse=Boolean(body.burnAfterUse)||requestedUses===1;const maxUses=burnAfterUse?1:requestedUses;const requestedExpiry=body.expiresAt?Date.parse(body.expiresAt):NaN;const expiresAt=Number.isFinite(requestedExpiry)?new Date(Math.min(requestedExpiry,Date.now()+30*86400000)).toISOString():new Date(Date.now()+7*86400000).toISOString();
    let code=createInviteCode();while(await env.DB.prepare('SELECT 1 found FROM invite_codes WHERE code=?').bind(code).first())code=createInviteCode();const id=crypto.randomUUID();
    await env.DB.prepare('INSERT INTO invite_codes(id,code,label,max_uses,expires_at,created_by,burn_after_use) VALUES(?,?,?,?,?,?,?)').bind(id,code,body.label?.trim().slice(0,60)||'PILOT INVITE',maxUses,expiresAt,user.id,burnAfterUse?1:0).run();return json({id,code,maxUses,expiresAt,burnAfterUse},201);
  }
  const memberInviteToggle=path.match(/^invites\/([^/]+)\/toggle$/);if(memberInviteToggle&&method==='POST'){
    await env.DB.prepare('UPDATE invite_codes SET is_active=CASE is_active WHEN 1 THEN 0 ELSE 1 END WHERE id=? AND created_by=?').bind(memberInviteToggle[1],user.id).run();return json({updated:true});
  }

  if(path==='admin/invites'&&method==='GET'){
    if(user.email.toLowerCase()!==DEVELOPER_EMAIL)return json({error:'Developer access required.'},403);
    const [codes,redemptions]=await Promise.all([env.DB.prepare('SELECT * FROM invite_codes ORDER BY created_at DESC').all(),env.DB.prepare(`SELECT r.code_id,r.email,r.redeemed_at,u.id user_id,u.username,u.display_name,u.avatar_url FROM invite_redemptions r JOIN users u ON u.id=r.user_id ORDER BY r.redeemed_at DESC LIMIT 250`).all()]);
    return json({codes:codes.results,redemptions:redemptions.results});
  }
  if(path==='admin/invites'&&method==='POST'){
    if(user.email.toLowerCase()!==DEVELOPER_EMAIL)return json({error:'Developer access required.'},403);
    const body=await request.json<{label?:string;maxUses?:number;expiresAt?:string|null;burnAfterUse?:boolean}>();const requestedUses=Math.min(500,Math.max(1,Math.floor(Number(body.maxUses)||1)));const burnAfterUse=Boolean(body.burnAfterUse)||requestedUses===1;const maxUses=burnAfterUse?1:requestedUses;const expiresAt=body.expiresAt&&Number.isFinite(Date.parse(body.expiresAt))?new Date(body.expiresAt).toISOString():null;
    let code=createInviteCode();while(await env.DB.prepare('SELECT 1 found FROM invite_codes WHERE code=?').bind(code).first())code=createInviteCode();
    const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO invite_codes(id,code,label,max_uses,expires_at,created_by,burn_after_use) VALUES(?,?,?,?,?,?,?)').bind(id,code,body.label?.trim().slice(0,60)||'PRIVATE ACCESS',maxUses,expiresAt,user.id,burnAfterUse?1:0).run();
    return json({id,code,label:body.label?.trim()||'PRIVATE ACCESS',maxUses,expiresAt,burnAfterUse},201);
  }
  const inviteToggle=path.match(/^admin\/invites\/([^/]+)\/toggle$/);
  if(inviteToggle&&method==='POST'){
    if(user.email.toLowerCase()!==DEVELOPER_EMAIL)return json({error:'Developer access required.'},403);
    await env.DB.prepare('UPDATE invite_codes SET is_active=CASE is_active WHEN 1 THEN 0 ELSE 1 END WHERE id=?').bind(inviteToggle[1]).run();
    return json({updated:true});
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
      env.DB.prepare(`SELECT l.*,u.username,u.avatar_url,u.privacy_mode,u.tier,u.wins,u.losses,v.year,v.make,v.model,1 is_live FROM driver_locations l JOIN users u ON u.id=l.user_id LEFT JOIN vehicles v ON v.id=l.vehicle_id WHERE l.expires_at>? AND l.user_id<>? ORDER BY l.updated_at DESC LIMIT 500`).bind(now,user.id).all(),
      env.DB.prepare('SELECT * FROM events WHERE ends_at IS NULL OR ends_at>? ORDER BY starts_at').bind(now).all(),
      env.DB.prepare("SELECT * FROM cruises WHERE status IN ('scheduled','live') ORDER BY starts_at").all(),
    ]);
    return json({ drivers: drivers.results, events: events.results, cruises: cruises.results });
  }
  if(path==='pilots'&&method==='GET'){
    const rows=await env.DB.prepare(`SELECT u.id,u.username,u.avatar_url,u.tier,u.points,u.wins,u.losses,u.reputation,v.year,v.make,v.model,v.photo_url,
      l.latitude,l.longitude,l.speed_kph,l.drive_mode FROM users u LEFT JOIN vehicles v ON v.user_id=u.id AND v.is_active=1 LEFT JOIN driver_locations l ON l.user_id=u.id WHERE u.id<>? ORDER BY u.reputation DESC,u.points DESC LIMIT 100`).bind(user.id).all();
    return json({pilots:rows.results});
  }
  if (path === 'location' && method === 'POST') {
    const body = await request.json<Record<string, number | string | boolean | null>>();
    if(!Number.isFinite(Number(body.latitude))||!Number.isFinite(Number(body.longitude)))return json({error:'Valid latitude and longitude are required.'},400);
    const shareMinutes=Math.min(120,Math.max(5,Math.floor(Number(body.shareMinutes)||15)));
    const requestedExpiry=typeof body.expiresAt==='string'?Date.parse(body.expiresAt):NaN;
    const expiryMs=Number.isFinite(requestedExpiry)?Math.min(Date.now()+120*60_000,Math.max(Date.now()+60_000,requestedExpiry)):Date.now()+shareMinutes*60_000;
    const expires = new Date(expiryMs).toISOString();
    await env.DB.prepare(`INSERT INTO driver_locations(user_id,vehicle_id,latitude,longitude,accuracy_m,altitude_m,speed_kph,heading,drive_mode,cruise_id,expires_at,updated_at)
      VALUES(?,COALESCE(?,(SELECT id FROM vehicles WHERE user_id=? AND is_active=1 LIMIT 1)),?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET vehicle_id=excluded.vehicle_id,latitude=excluded.latitude,longitude=excluded.longitude,accuracy_m=excluded.accuracy_m,altitude_m=excluded.altitude_m,speed_kph=excluded.speed_kph,heading=excluded.heading,drive_mode=excluded.drive_mode,cruise_id=excluded.cruise_id,expires_at=excluded.expires_at,updated_at=CURRENT_TIMESTAMP`)
      .bind(user.id,body.vehicleId||null,user.id,Number(body.latitude),Number(body.longitude),body.accuracy??null,body.altitude??null,body.speedKph||0,body.heading||0,body.driveMode?1:0,body.cruiseId||null,expires).run();
    await env.DB.prepare('UPDATE users SET top_speed_kph=MAX(top_speed_kph,?) WHERE id=?').bind(Math.max(0,Number(body.speedKph)||0),user.id).run();
    const latitude=Number(body.latitude),longitude=Number(body.longitude),cellLat=Math.round(latitude*500),cellLng=Math.round(longitude*500);
    await env.DB.prepare('INSERT OR IGNORE INTO map_discoveries(user_id,cell_lat,cell_lng,latitude,longitude) VALUES(?,?,?,?,?)').bind(user.id,cellLat,cellLng,latitude,longitude).run();
    const nearbyDrops=await env.DB.prepare(`SELECT d.* FROM dead_drops d LEFT JOIN dead_drop_claims c ON c.drop_id=d.id AND c.user_id=? WHERE d.is_active=1 AND c.drop_id IS NULL`).bind(user.id).all<Record<string,unknown>>();
    const reachedDrops=nearbyDrops.results.filter(drop=>distanceMeters(latitude,longitude,Number(drop.latitude),Number(drop.longitude))<=Number(drop.radius_m));const claimed:Record<string,unknown>[]=[];
    for(const drop of reachedDrops){const result=await env.DB.prepare('INSERT OR IGNORE INTO dead_drop_claims(drop_id,user_id) VALUES(?,?)').bind(drop.id,user.id).run();if(result.meta.changes){await env.DB.prepare('UPDATE users SET credits=credits+? WHERE id=?').bind(Number(drop.credits),user.id).run();claimed.push(drop);}}
    const discoveryCount=await env.DB.prepare('SELECT COUNT(*) count FROM map_discoveries WHERE user_id=?').bind(user.id).first<{count:number}>();
    const availableTerritories=await env.DB.prepare(`SELECT t.* FROM territories t JOIN crew_members m ON m.crew_id=t.crew_id AND m.user_id=? AND m.status='approved' LEFT JOIN territory_unlocks u ON u.territory_id=t.id AND u.user_id=? WHERE u.territory_id IS NULL`).bind(user.id,user.id).all<Record<string,unknown>>();
    const unlocked=availableTerritories.results.filter(territory=>(discoveryCount?.count||0)>=Number(territory.required_cells)&&distanceMeters(latitude,longitude,Number(territory.latitude),Number(territory.longitude))<=Number(territory.radius_m));
    if(unlocked.length)await env.DB.batch(unlocked.map(territory=>env.DB.prepare('INSERT OR IGNORE INTO territory_unlocks(territory_id,user_id) VALUES(?,?)').bind(territory.id,user.id)));
    return json({ success: true,expiresAt:expires,shareMinutes,discoveredCells:discoveryCount?.count||1,claimedDrops:claimed.map(drop=>({id:drop.id,title:drop.title,credits:Number(drop.credits)})),unlockedTerritories:unlocked.map(territory=>({id:territory.id,name:territory.name})) });
  }
  if(path==='location'&&method==='DELETE'){await env.DB.prepare('DELETE FROM driver_locations WHERE user_id=?').bind(user.id).run();return json({hidden:true});}

  if(path==='world'&&method==='GET'){
    const [discoveries,territories,drops,reports,crews,seasons,requests]=await Promise.all([
      env.DB.prepare('SELECT latitude,longitude,discovered_at FROM map_discoveries WHERE user_id=? ORDER BY discovered_at DESC LIMIT 1200').bind(user.id).all(),
      env.DB.prepare(`SELECT t.*,c.name crew_name,c.tag,EXISTS(SELECT 1 FROM territory_unlocks u WHERE u.territory_id=t.id AND u.user_id=?) unlocked FROM territories t JOIN crews c ON c.id=t.crew_id`).bind(user.id).all(),
      env.DB.prepare(`SELECT d.*,EXISTS(SELECT 1 FROM dead_drop_claims c WHERE c.drop_id=d.id AND c.user_id=?) claimed FROM dead_drops d WHERE d.is_active=1`).bind(user.id).all(),
      env.DB.prepare(`SELECT r.*,u.username FROM road_reports r JOIN users u ON u.id=r.user_id WHERE r.is_active=1 ORDER BY r.created_at DESC LIMIT 500`).all(),
      env.DB.prepare(`SELECT c.*,m.status member_status,m.role member_role,(SELECT COUNT(*) FROM crew_members x WHERE x.crew_id=c.id AND x.status='approved') member_count FROM crews c LEFT JOIN crew_members m ON m.crew_id=c.id AND m.user_id=? ORDER BY member_count DESC`).bind(user.id).all(),
      env.DB.prepare(`SELECT s.*,e.points,CASE WHEN e.user_id IS NULL THEN 0 ELSE 1 END joined FROM seasons s LEFT JOIN season_entries e ON e.season_id=s.id AND e.user_id=? WHERE s.ends_at>? ORDER BY s.starts_at`).bind(user.id,new Date().toISOString()).all(),
      env.DB.prepare(`SELECT m.crew_id,m.user_id,m.created_at,u.username,u.avatar_url FROM crew_members m JOIN crews c ON c.id=m.crew_id AND c.owner_id=? JOIN users u ON u.id=m.user_id WHERE m.status='pending' ORDER BY m.created_at`).bind(user.id).all(),
    ]);
    return json({discoveries:discoveries.results,territories:territories.results,drops:drops.results,reports:reports.results,crews:crews.results,seasons:seasons.results,crewRequests:requests.results});
  }
  if(path==='road-reports'&&method==='POST'){
    const body=await request.json<{type?:string;note?:string;latitude?:number;longitude?:number}>();if(!['fixed_camera','hazard','closure','dangerous_road'].includes(body.type||'')||!Number.isFinite(body.latitude)||!Number.isFinite(body.longitude))return json({error:'Choose a supported safety report and valid map point.'},400);
    const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO road_reports(id,user_id,type,note,latitude,longitude) VALUES(?,?,?,?,?,?)').bind(id,user.id,body.type,body.note?.trim().slice(0,240)||'',body.latitude,body.longitude).run();return json({id},201);
  }
  if(path==='crews'&&method==='POST'){
    const body=await request.json<{name?:string;tag?:string}>();const name=body.name?.trim().slice(0,50)||'',tag=body.tag?.trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5)||'';if(name.length<3||tag.length<2)return json({error:'Crew name and 2-5 character tag are required.'},400);
    const id=crypto.randomUUID();try{await env.DB.batch([env.DB.prepare('INSERT INTO crews(id,owner_id,name,tag) VALUES(?,?,?,?)').bind(id,user.id,name,tag),env.DB.prepare("INSERT INTO crew_members(crew_id,user_id,status,role) VALUES(?,?,'approved','owner')").bind(id,user.id)]);}catch{return json({error:'That crew tag is already claimed.'},409);}return json({id,name,tag},201);
  }
  const crewJoin=path.match(/^crews\/([^/]+)\/join$/);if(crewJoin&&method==='POST'){await env.DB.prepare(`INSERT INTO crew_members(crew_id,user_id,status) VALUES(?,?,'pending') ON CONFLICT(crew_id,user_id) DO UPDATE SET status='pending'`).bind(crewJoin[1],user.id).run();return json({status:'pending'});}
  const crewApprove=path.match(/^crews\/([^/]+)\/members\/([^/]+)\/approve$/);if(crewApprove&&method==='POST'){const crew=await env.DB.prepare('SELECT 1 found FROM crews WHERE id=? AND owner_id=?').bind(crewApprove[1],user.id).first();if(!crew)return json({error:'Crew owner access required.'},403);await env.DB.prepare("UPDATE crew_members SET status='approved' WHERE crew_id=? AND user_id=?").bind(crewApprove[1],crewApprove[2]).run();return json({status:'approved'});}
  const territoryCreate=path.match(/^crews\/([^/]+)\/territories$/);if(territoryCreate&&method==='POST'){const crew=await env.DB.prepare('SELECT 1 found FROM crews WHERE id=? AND owner_id=?').bind(territoryCreate[1],user.id).first();if(!crew)return json({error:'Crew owner access required.'},403);const body=await request.json<{name?:string;latitude?:number;longitude?:number;radiusM?:number;requiredCells?:number}>();if(!body.name?.trim()||!Number.isFinite(body.latitude)||!Number.isFinite(body.longitude))return json({error:'Territory name and center point are required.'},400);const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO territories(id,crew_id,name,latitude,longitude,radius_m,required_cells) VALUES(?,?,?,?,?,?,?)').bind(id,territoryCreate[1],body.name.trim().slice(0,60),body.latitude,body.longitude,Math.min(10000,Math.max(200,Number(body.radiusM)||1000)),Math.min(100,Math.max(3,Number(body.requiredCells)||12))).run();return json({id},201);}
  if(path==='admin/dead-drops'&&method==='POST'){if(user.email.toLowerCase()!==DEVELOPER_EMAIL)return json({error:'Developer access required.'},403);const body=await request.json<{title?:string;latitude?:number;longitude?:number;credits?:number;radiusM?:number}>();if(!body.title?.trim()||!Number.isFinite(body.latitude)||!Number.isFinite(body.longitude))return json({error:'Drop title and location required.'},400);const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO dead_drops(id,title,latitude,longitude,radius_m,credits) VALUES(?,?,?,?,?,?)').bind(id,body.title.trim().slice(0,60),body.latitude,body.longitude,Math.min(500,Math.max(20,Number(body.radiusM)||60)),Math.min(10000,Math.max(10,Number(body.credits)||100))).run();return json({id},201);}
  if(path==='admin/seasons'&&method==='POST'){if(user.email.toLowerCase()!==DEVELOPER_EMAIL)return json({error:'Developer access required.'},403);const body=await request.json<{name?:string;startsAt?:string;endsAt?:string;rewardCredits?:number}>();if(!body.name?.trim()||!body.startsAt||!body.endsAt)return json({error:'Season name and dates required.'},400);const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO seasons(id,name,starts_at,ends_at,status,reward_credits) VALUES(?,?,?,?,?,?)').bind(id,body.name.trim().slice(0,70),body.startsAt,body.endsAt,'live',Math.max(100,Number(body.rewardCredits)||5000)).run();return json({id},201);}
  const seasonJoin=path.match(/^seasons\/([^/]+)\/join$/);if(seasonJoin&&method==='POST'){await env.DB.prepare('INSERT OR IGNORE INTO season_entries(season_id,user_id) VALUES(?,?)').bind(seasonJoin[1],user.id).run();return json({joined:true});}

  if (path === 'feed' && method === 'GET') {
    const posts = await env.DB.prepare(`SELECT p.id,p.user_id,p.media_url,p.media_type,p.caption,p.created_at,u.username,u.avatar_url,
      (SELECT COUNT(*) FROM post_likes l WHERE l.post_id=p.id) likes,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) comments,
      EXISTS(SELECT 1 FROM post_likes l WHERE l.post_id=p.id AND l.user_id=?) liked,
      EXISTS(SELECT 1 FROM post_saves s WHERE s.post_id=p.id AND s.user_id=?) saved,
      EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=? AND f.following_id=p.user_id) following
      FROM posts p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT 50`).bind(user.id,user.id,user.id).all();
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

  const followAction=path.match(/^users\/([^/]+)\/follow$/);
  if(followAction&&method==='POST'){
    const targetId=followAction[1]; if(targetId===user.id)return json({error:'You already follow your own build.'},400);
    const target=await env.DB.prepare('SELECT username FROM users WHERE id=?').bind(targetId).first<{username:string}>();if(!target)return json({error:'Pilot not found.'},404);
    const current=await env.DB.prepare('SELECT 1 found FROM follows WHERE follower_id=? AND following_id=?').bind(user.id,targetId).first();
    if(current)await env.DB.prepare('DELETE FROM follows WHERE follower_id=? AND following_id=?').bind(user.id,targetId).run();
    else await env.DB.batch([env.DB.prepare('INSERT INTO follows(follower_id,following_id) VALUES(?,?)').bind(user.id,targetId),env.DB.prepare(`INSERT INTO notifications(id,user_id,type,title,body,data_json) VALUES(?,?,?,?,?,?)`).bind(crypto.randomUUID(),targetId,'new_follower','NEW FOLLOWER',`${user.username} followed your build`,JSON.stringify({userId:user.id}))]);
    return json({following:!current});
  }

  if (path === 'leaderboard' && method === 'GET') {
    const rows=await env.DB.prepare(`SELECT id,username,avatar_url,tier,points,wins,losses,reputation,credits,top_speed_kph,(wins+losses) entered FROM users ORDER BY points DESC,wins DESC,reputation DESC,created_at ASC LIMIT 250`).all();
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
  if(path==='races'&&method==='GET'){
    const rows=await env.DB.prepare(`SELECT DISTINCT r.*,u.username challenger_name FROM race_contracts r JOIN users u ON u.id=r.challenger_id LEFT JOIN race_opponents o ON o.race_id=r.id WHERE r.challenger_id=? OR o.user_id=? ORDER BY r.starts_at DESC LIMIT 60`).bind(user.id,user.id).all<Record<string,unknown>>();
    const races=await Promise.all(rows.results.map(async race=>{
      const participants=await env.DB.prepare(`SELECT o.user_id,o.status,u.username,u.tier,u.reputation FROM race_opponents o JOIN users u ON u.id=o.user_id WHERE o.race_id=?`).bind(race.id).all();
      return {...race,participants:participants.results,is_challenger:race.challenger_id===user.id};
    }));
    return json({races});
  }
  const raceAction=path.match(/^races\/([^/]+)\/(accept|decline|reschedule)$/);
  if(raceAction&&method==='POST'){
    const raceId=raceAction[1],action=raceAction[2];
    const race=await env.DB.prepare('SELECT * FROM race_contracts WHERE id=?').bind(raceId).first<Record<string,unknown>>();
    if(!race)return json({error:'Race challenge not found.'},404);
    const opponent=await env.DB.prepare('SELECT status FROM race_opponents WHERE race_id=? AND user_id=?').bind(raceId,user.id).first<{status:string}>();
    const isChallenger=race.challenger_id===user.id;
    if(!opponent&&!isChallenger)return json({error:'Race challenge not found.'},404);
    if(action==='decline'){
      if(!opponent)return json({error:'The challenger cannot decline their own contract.'},400);
      const next=user.decline_streak+1,penalty=next>=3?25:0;
      await env.DB.batch([env.DB.prepare("UPDATE race_opponents SET status='declined' WHERE race_id=? AND user_id=?").bind(raceId,user.id),env.DB.prepare("UPDATE race_contracts SET status='declined',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(raceId),env.DB.prepare('UPDATE users SET decline_streak=?,reputation=MAX(0,reputation-?) WHERE id=?').bind(next>=3?0:next,penalty,user.id)]);
      return json({status:'declined',reputationPenalty:penalty});
    }
    if(action==='reschedule'){
      const body=await request.json<{startsAt?:string}>();
      if(!body.startsAt||Number.isNaN(Date.parse(body.startsAt)))return json({error:'A valid new start time is required.'},400);
      await env.DB.batch([env.DB.prepare("UPDATE race_contracts SET starts_at=?,status='rescheduled',reschedule_count=reschedule_count+1,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(body.startsAt,raceId),env.DB.prepare("UPDATE race_opponents SET status='invited' WHERE race_id=?").bind(raceId)]);
      return json({status:'rescheduled',startsAt:body.startsAt});
    }
    if(!opponent)return json({error:'Challenge is already accepted by the host.'},400);
    if(Number(race.wager_credits||0)>user.credits)return json({error:'You do not have enough credits to accept this wager.'},409);
    await env.DB.batch([env.DB.prepare("UPDATE race_opponents SET status='accepted' WHERE race_id=? AND user_id=?").bind(raceId,user.id),env.DB.prepare('UPDATE users SET decline_streak=0 WHERE id=?').bind(user.id)]);
    const pending=await env.DB.prepare("SELECT COUNT(*) count FROM race_opponents WHERE race_id=? AND status<>'accepted'").bind(raceId).first<{count:number}>();
    if((pending?.count||0)===0){
      const wager=Number(race.wager_credits||0); const opponentRows=await env.DB.prepare('SELECT user_id FROM race_opponents WHERE race_id=?').bind(raceId).all<{user_id:string}>(); const ids=[String(race.challenger_id),...opponentRows.results.map(row=>row.user_id)];
      const placeholders=ids.map(()=>'?').join(','); const poor=await env.DB.prepare(`SELECT id FROM users WHERE id IN (${placeholders}) AND credits<? LIMIT 1`).bind(...ids,wager).first();
      if(poor){await env.DB.prepare("UPDATE race_contracts SET status='credit_failed',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(raceId).run();return json({error:'A pilot no longer has enough credits for this wager.'},409);}
      const statements=ids.map(id=>env.DB.prepare('UPDATE users SET credits=credits-? WHERE id=?').bind(wager,id)); statements.push(env.DB.prepare("UPDATE race_contracts SET status='scheduled',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(raceId)); await env.DB.batch(statements);
      return json({status:'scheduled'});
    }
    return json({status:'accepted'});
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
  if(path==='events'&&method==='POST'){
    const body=await request.json<{title?:string;description?:string;rules?:string;startsAt?:string;endsAt?:string;radiusM?:number;locations?:Array<{label?:string;address?:string}>;allowShowCars?:boolean;allowSponsors?:boolean}>();
    if(!body.title?.trim()||!body.startsAt||!body.locations?.[0]?.address?.trim())return json({error:'Title, start time, and at least one location are required.'},400);
    const requested=body.locations.slice(0,5); const located:Array<{label:string;name:string;latitude:number;longitude:number}>=[];
    for(const item of requested){const point=await geocode(item.address||'');if(!point)return json({error:`Location not found: ${item.address}`},404);located.push({label:item.label?.trim()||`STOP ${located.length+1}`,name:point.name,latitude:point.latitude,longitude:point.longitude});}
    const first=located[0],id=crypto.randomUUID();
    const statements=[env.DB.prepare(`INSERT INTO events(id,host_id,title,location_name,latitude,longitude,radius_m,starts_at,ends_at,description,rules,allow_show_cars,allow_sponsors) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,user.id,body.title.trim().slice(0,100),first.name,first.latitude,first.longitude,Math.max(50,Math.min(2000,Number(body.radiusM)||250)),body.startsAt,body.endsAt||null,body.description?.trim().slice(0,2000)||'',body.rules?.trim().slice(0,1500)||'',body.allowShowCars===false?0:1,body.allowSponsors===false?0:1),env.DB.prepare("INSERT INTO event_registrations(event_id,user_id,role) VALUES(?,?,'host')").bind(id,user.id)];
    located.forEach((point,index)=>statements.push(env.DB.prepare('INSERT INTO event_locations(id,event_id,label,location_name,latitude,longitude,stop_order) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,point.label,point.name,point.latitude,point.longitude,index)));
    await env.DB.batch(statements); return json({id,locations:located},201);
  }
  const eventDetails=path.match(/^events\/([^/]+)$/);
  if(eventDetails&&method==='GET'){
    const event=await env.DB.prepare('SELECT e.*,u.username host_name FROM events e JOIN users u ON u.id=e.host_id WHERE e.id=?').bind(eventDetails[1]).first();
    if(!event)return json({error:'Meet not found.'},404);
    const [locations,registrations]=await Promise.all([env.DB.prepare('SELECT * FROM event_locations WHERE event_id=? ORDER BY stop_order').bind(eventDetails[1]).all(),env.DB.prepare(`SELECT r.role,r.sponsor_name,r.vehicle_id,u.id user_id,u.username,u.avatar_url,v.year,v.make,v.model,v.trim,v.photo_url FROM event_registrations r JOIN users u ON u.id=r.user_id LEFT JOIN vehicles v ON v.id=r.vehicle_id WHERE r.event_id=? ORDER BY r.created_at`).bind(eventDetails[1]).all()]);
    return json({event,locations:locations.results,registrations:registrations.results});
  }
  const eventInvite=path.match(/^events\/([^/]+)\/invite$/);
  if(eventInvite&&method==='POST'){
    const body=await request.json<{userId?:string}>(); if(!body.userId||body.userId===user.id)return json({error:'Choose another pilot to invite.'},400);
    const event=await env.DB.prepare('SELECT title FROM events WHERE id=? AND host_id=?').bind(eventInvite[1],user.id).first<{title:string}>();if(!event)return json({error:'Only the meet host can invite pilots.'},403);
    const invited=await env.DB.prepare('SELECT username FROM users WHERE id=?').bind(body.userId).first<{username:string}>();if(!invited)return json({error:'Pilot not found.'},404);
    await env.DB.batch([env.DB.prepare(`INSERT INTO event_invites(event_id,user_id,invited_by,status) VALUES(?,?,?,'invited') ON CONFLICT(event_id,user_id) DO UPDATE SET invited_by=excluded.invited_by,status='invited',created_at=CURRENT_TIMESTAMP`).bind(eventInvite[1],body.userId,user.id),env.DB.prepare(`INSERT INTO notifications(id,user_id,type,title,body,data_json) VALUES(?,?,?,?,?,?)`).bind(crypto.randomUUID(),body.userId,'meet_rsvp','MEET INVITATION',`${user.username} invited you to ${event.title}`,JSON.stringify({eventId:eventInvite[1]}))]);
    return json({invited:true,pilot:invited.username,event:event.title});
  }
  const eventJoin=path.match(/^events\/([^/]+)\/join$/);
  if(eventJoin&&method==='POST'){
    const body=await request.json<{role?:string;vehicleId?:string;sponsorName?:string}>(); const role=body.role||'attendee';
    if(!['attendee','show_car','sponsor'].includes(role))return json({error:'Choose attendee, show car, or sponsor.'},400);
    const event=await env.DB.prepare('SELECT allow_show_cars,allow_sponsors FROM events WHERE id=?').bind(eventJoin[1]).first<{allow_show_cars:number;allow_sponsors:number}>();
    if(!event)return json({error:'Meet not found.'},404); if(role==='show_car'&&!event.allow_show_cars)return json({error:'Show car registration is closed.'},400); if(role==='sponsor'&&!event.allow_sponsors)return json({error:'Sponsor registration is closed.'},400);
    if(role==='show_car'){const vehicle=await env.DB.prepare('SELECT id FROM vehicles WHERE id=? AND user_id=?').bind(body.vehicleId||'',user.id).first();if(!vehicle)return json({error:'Select one of your garage vehicles.'},400);}
    if(role==='sponsor'&&!body.sponsorName?.trim())return json({error:'Sponsor name is required.'},400);
    await env.DB.prepare(`INSERT INTO event_registrations(event_id,user_id,vehicle_id,role,sponsor_name) VALUES(?,?,?,?,?) ON CONFLICT(event_id,user_id) DO UPDATE SET vehicle_id=excluded.vehicle_id,role=excluded.role,sponsor_name=excluded.sponsor_name`).bind(eventJoin[1],user.id,role==='show_car'?body.vehicleId:null,role,role==='sponsor'?body.sponsorName?.trim().slice(0,100):null).run();
    const count=await env.DB.prepare('SELECT COUNT(*) count FROM event_registrations WHERE event_id=?').bind(eventJoin[1]).first<{count:number}>(); await env.DB.prepare('UPDATE events SET attendees=? WHERE id=?').bind(count?.count||0,eventJoin[1]).run(); return json({role,attendees:count?.count||0});
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
  if(path==='vehicle-digital-twin'&&method==='POST'){
    const body=await request.json<{vehicleId?:string;angles?:Array<{angle:string;url:string}>;geminiApiKey?:string}>();const angles=(body.angles||[]).filter(item=>['front','rear','driver','passenger'].includes(item.angle)&&item.url.startsWith('/api/media/'));
    const vehicle=await env.DB.prepare('SELECT id,year,make,model,trim,color FROM vehicles WHERE id=? AND user_id=?').bind(body.vehicleId||'',user.id).first<Record<string,unknown>>();
    if(!vehicle||angles.length!==4)return json({error:'Four verified vehicle angles are required.'},400);if(!body.geminiApiKey?.trim())return json({error:'Connect a Gemini API key for this one-time generation request.'},400);
    const input:Array<Record<string,unknown>>=[{type:'text',text:`Create one accurate photorealistic digital garage render of this exact ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim||''} in ${vehicle.color||'its photographed color'}. Reconcile the four reference angles into the same vehicle. Preserve its actual body kit, wheels, paint, lights, stance, badges, and visible modifications. Three-quarter front view in a dark neutral studio garage, full car visible, no text, no people, no invented parts.`}];let total=0;
    for(const angle of angles){const key=decodeURIComponent(angle.url.slice('/api/media/'.length));const object=await env.MEDIA.get(key);if(!object)return json({error:`The ${angle.angle} image is unavailable.`},400);total+=object.size;if(total>22*1024*1024)return json({error:'Angle images must total less than 22 MB.'},400);const bytes=new Uint8Array(await object.arrayBuffer());input.push({type:'image',mime_type:object.httpMetadata?.contentType||'image/jpeg',data:bytesToBase64(bytes)});}
    await env.DB.prepare("UPDATE vehicles SET digital_twin_status='generating' WHERE id=?").bind(vehicle.id).run();
    const provider=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':body.geminiApiKey.trim()},body:JSON.stringify({model:'gemini-3.1-flash-image',input,response_format:{type:'image',mime_type:'image/png',aspect_ratio:'16:9',image_size:'1K'}})});
    const generated=await provider.json<unknown>();const image=generatedImageBlock(generated);if(!provider.ok||!image){await env.DB.prepare("UPDATE vehicles SET digital_twin_status='failed' WHERE id=?").bind(vehicle.id).run();return json({error:'Gemini could not generate the digital vehicle. Check API access and try again.'},502);}
    const bytes=base64ToBytes(image.data),key=`digital-twins/${user.id}/${vehicle.id}-${Date.now()}.png`;await env.MEDIA.put(key,bytes,{httpMetadata:{contentType:image.mimeType}});const url=`/api/media/${encodeURIComponent(key)}`;
    const statements=angles.map(angle=>env.DB.prepare(`INSERT INTO vehicle_angles(vehicle_id,angle,media_url) VALUES(?,?,?) ON CONFLICT(vehicle_id,angle) DO UPDATE SET media_url=excluded.media_url,created_at=CURRENT_TIMESTAMP`).bind(vehicle.id,angle.angle,angle.url));statements.push(env.DB.prepare("UPDATE vehicles SET digital_twin_url=?,digital_twin_status='ready' WHERE id=?").bind(url,vehicle.id));await env.DB.batch(statements);return json({url,status:'ready'});
  }
  if (path === 'parts-search' && method === 'POST') {
    const body=await request.json<{vehicle?:Record<string,string|number>;query?:string}>();
    if(!body.vehicle?.year||!body.vehicle.make||!body.vehicle.model) return json({error:'Select a complete vehicle first.'},400);
    const query=(body.query||'performance parts').slice(0,80);
    return json({products:[],providers:[{name:'eBay Motors',mode:env.EBAY_CLIENT_ID&&env.EBAY_CLIENT_SECRET?'live':'pending_approval'},...providerSearches(body.vehicle,query)]});
  }

  if(path==='address-suggestions'&&method==='GET'){
    const query=new URL(request.url).searchParams.get('q')?.trim()||'';
    if(query.length<3)return json({suggestions:[]});
    return json({suggestions:await addressSuggestions(query.slice(0,120))});
  }

  if(path==='vehicle-catalog'&&method==='GET'){
    const params=new URL(request.url).searchParams;
    return json(await vehicleCatalog(params.get('year'),params.get('make')));
  }

  if(path==='navigation'&&method==='GET'){
    const [places,routes]=await Promise.all([
      env.DB.prepare('SELECT * FROM saved_places WHERE user_id=? ORDER BY is_favorite DESC,created_at DESC').bind(user.id).all(),
      env.DB.prepare('SELECT id,name,destination_name,destination_latitude,destination_longitude,distance_km,duration_minutes,coordinates_json,created_at FROM saved_routes WHERE user_id=? ORDER BY created_at DESC').bind(user.id).all(),
    ]);
    return json({places:places.results,routes:routes.results.map((row:any)=>({...row,coordinates:JSON.parse(row.coordinates_json||'[]')}))});
  }

  if(path==='places'&&method==='POST'){
    const body=await request.json<{label?:string;locationName?:string;latitude?:number;longitude?:number;isFavorite?:boolean}>();
    if(!body.label?.trim()||!body.locationName?.trim()||!Number.isFinite(body.latitude)||!Number.isFinite(body.longitude))return json({error:'A label and valid location are required.'},400);
    const id=crypto.randomUUID();
    await env.DB.prepare('INSERT INTO saved_places(id,user_id,label,location_name,latitude,longitude,is_favorite) VALUES(?,?,?,?,?,?,?)').bind(id,user.id,body.label.trim().slice(0,60),body.locationName.trim().slice(0,300),body.latitude,body.longitude,body.isFavorite===false?0:1).run();
    return json({id},201);
  }
  const deletePlace=path.match(/^places\/([^/]+)$/);
  if(deletePlace&&method==='DELETE'){await env.DB.prepare('DELETE FROM saved_places WHERE id=? AND user_id=?').bind(deletePlace[1],user.id).run();return json({deleted:true});}

  if(path==='routes/save'&&method==='POST'){
    const body=await request.json<{name?:string;route?:{destination:string;destinationLatitude:number;destinationLongitude:number;distanceKm:number;durationMinutes:number;coordinates:Array<{latitude:number;longitude:number}>}}>();
    const route=body.route;
    if(!route?.destination||!Number.isFinite(route.destinationLatitude)||!Number.isFinite(route.destinationLongitude)||!Array.isArray(route.coordinates)||route.coordinates.length<2)return json({error:'Create a route before saving it.'},400);
    const id=crypto.randomUUID();
    await env.DB.prepare('INSERT INTO saved_routes(id,user_id,name,destination_name,destination_latitude,destination_longitude,distance_km,duration_minutes,coordinates_json) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,user.id,(body.name||route.destination).trim().slice(0,80),route.destination.slice(0,300),route.destinationLatitude,route.destinationLongitude,route.distanceKm,route.durationMinutes,JSON.stringify(route.coordinates)).run();
    return json({id},201);
  }
  const deleteRoute=path.match(/^routes\/([^/]+)$/);
  if(deleteRoute&&method==='DELETE'){await env.DB.prepare('DELETE FROM saved_routes WHERE id=? AND user_id=?').bind(deleteRoute[1],user.id).run();return json({deleted:true});}

  if (path === 'routes' && method === 'POST') {
    const body=await request.json<{origin?:{latitude:number;longitude:number};destination?:string;target?:{latitude:number;longitude:number}}>();// Exact coordinates are used for pilot pins; text destinations are geocoded.
    if(!body.origin||!body.destination?.trim()) return json({error:'Current location and destination are required.'},400);
    const target=Number.isFinite(body.target?.latitude)&&Number.isFinite(body.target?.longitude)?{latitude:Number(body.target!.latitude),longitude:Number(body.target!.longitude),name:body.destination.trim()}:await geocode(body.destination);
    if(!target) return json({error:'Destination not found.'},404);
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

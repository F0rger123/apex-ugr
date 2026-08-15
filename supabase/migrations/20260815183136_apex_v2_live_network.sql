-- Apex UGR V2 live network. This migration intentionally contains no seed users,
-- locations, posts, events, leaderboard rows, or marketplace inventory.

alter table public.driver_locations
  add column if not exists accuracy_m numeric(8,2),
  add column if not exists altitude_m numeric(9,2),
  add column if not exists speed_kph numeric(7,2) default 0,
  add column if not exists drive_mode boolean not null default false,
  add column if not exists is_visible boolean not null default true,
  add column if not exists vehicle_id uuid references public.vehicles(id) on delete set null,
  add column if not exists cruise_id uuid,
  add column if not exists expires_at timestamptz default (now() + interval '2 minutes');

alter table public.driver_locations drop constraint if exists driver_locations_status_check;
alter table public.driver_locations add constraint driver_locations_status_check
  check (status in ('Cruising', 'Staged for Race', 'Parked', 'In Telemetry Run', 'Driving', 'In Cruise'));

create index if not exists driver_locations_fresh_idx
  on public.driver_locations (updated_at desc) where is_visible = true;

drop policy if exists "Driver locations viewable by authenticated users" on public.driver_locations;
drop policy if exists "Users update own location" on public.driver_locations;
create policy "Authenticated pilots read visible fresh locations"
  on public.driver_locations for select to authenticated
  using (
    is_visible = true
    and expires_at > now()
    and exists (
      select 1 from public.profiles p
      where p.id = driver_locations.user_id
        and p.privacy_mode <> 'invisible'
    )
  );
create policy "Pilots insert own location"
  on public.driver_locations for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Pilots update own location"
  on public.driver_locations for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Pilots delete own location"
  on public.driver_locations for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.cruises (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'ended', 'cancelled')),
  visibility text not null default 'public' check (visibility in ('public', 'followers', 'invite_only')),
  destination_name text,
  destination_latitude numeric(10,7),
  destination_longitude numeric(10,7),
  starts_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.cruise_members (
  cruise_id uuid not null references public.cruises(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'driver' check (role in ('host', 'driver', 'spectator')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (cruise_id, user_id)
);

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'driver_locations_cruise_id_fkey'
  ) then
    alter table public.driver_locations
      add constraint driver_locations_cruise_id_fkey
      foreign key (cruise_id) references public.cruises(id) on delete set null;
  end if;
end $$;

create table if not exists public.event_geofences (
  meet_id uuid primary key references public.car_meets(id) on delete cascade,
  radius_m integer not null default 250 check (radius_m between 25 and 5000),
  pulse_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.post_saves (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.race_participants (
  race_id uuid not null references public.race_challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'driver' check (role in ('driver', 'spectator')),
  invite_status text not null default 'invited' check (invite_status in ('invited', 'accepted', 'declined')),
  result_value numeric(10,3),
  proof_url text,
  joined_at timestamptz not null default now(),
  primary key (race_id, user_id)
);

create table if not exists public.race_bets (
  id uuid primary key default uuid_generate_v4(),
  race_id uuid not null references public.race_challenges(id) on delete cascade,
  bettor_id uuid not null references public.profiles(id) on delete cascade,
  predicted_winner_id uuid not null references public.profiles(id) on delete cascade,
  credits numeric(10,2) not null check (credits > 0),
  status text not null default 'locked' check (status in ('locked', 'won', 'lost', 'refunded')),
  created_at timestamptz not null default now(),
  unique (race_id, bettor_id)
);

alter table public.cruises enable row level security;
alter table public.cruise_members enable row level security;
alter table public.event_geofences enable row level security;
alter table public.post_saves enable row level security;
alter table public.race_participants enable row level security;
alter table public.race_bets enable row level security;

create policy "Authenticated pilots read discoverable cruises"
  on public.cruises for select to authenticated
  using (
    visibility = 'public'
    or host_id = (select auth.uid())
    or exists (select 1 from public.cruise_members cm where cm.cruise_id = cruises.id and cm.user_id = (select auth.uid()))
  );
create policy "Pilots create cruises"
  on public.cruises for insert to authenticated
  with check (host_id = (select auth.uid()));
create policy "Hosts update cruises"
  on public.cruises for update to authenticated
  using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));
create policy "Pilots read cruise rosters"
  on public.cruise_members for select to authenticated using (true);
create policy "Pilots join or leave cruises"
  on public.cruise_members for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Authenticated pilots read event geofences"
  on public.event_geofences for select to authenticated using (true);
create policy "Meet hosts manage event geofences"
  on public.event_geofences for all to authenticated
  using (exists (select 1 from public.car_meets m where m.id = meet_id and m.host_id = (select auth.uid())))
  with check (exists (select 1 from public.car_meets m where m.id = meet_id and m.host_id = (select auth.uid())));
create policy "Pilots manage own saves"
  on public.post_saves for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Authenticated pilots read race rosters"
  on public.race_participants for select to authenticated using (true);
create policy "Race participants manage own invitation"
  on public.race_participants for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Race challengers invite participants"
  on public.race_participants for insert to authenticated
  with check (exists (select 1 from public.race_challenges r where r.id = race_id and r.challenger_id = (select auth.uid())));
create policy "Pilots read own bets"
  on public.race_bets for select to authenticated using (bettor_id = (select auth.uid()));
create policy "Pilots place own bets"
  on public.race_bets for insert to authenticated with check (bettor_id = (select auth.uid()));

-- Function arguments are location data only. Identity always comes from auth.uid().
create or replace function public.publish_driver_location(
  p_latitude numeric,
  p_longitude numeric,
  p_accuracy_m numeric,
  p_altitude_m numeric,
  p_speed_kph numeric,
  p_heading numeric,
  p_drive_mode boolean,
  p_vehicle_id uuid default null,
  p_cruise_id uuid default null
) returns public.driver_locations
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result public.driver_locations;
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'invalid coordinates';
  end if;
  insert into public.driver_locations (
    user_id, latitude, longitude, accuracy_m, altitude_m, speed_mph, speed_kph,
    heading, status, drive_mode, is_visible, vehicle_id, cruise_id, updated_at, expires_at
  ) values (
    uid, p_latitude, p_longitude, p_accuracy_m, p_altitude_m,
    greatest(coalesce(p_speed_kph, 0), 0) * 0.621371,
    greatest(coalesce(p_speed_kph, 0), 0), coalesce(p_heading, 0),
    case when p_cruise_id is not null then 'In Cruise' when p_drive_mode then 'Driving' else 'Parked' end,
    p_drive_mode, true, p_vehicle_id, p_cruise_id, now(), now() + interval '2 minutes'
  )
  on conflict (user_id) do update set
    latitude = excluded.latitude, longitude = excluded.longitude,
    accuracy_m = excluded.accuracy_m, altitude_m = excluded.altitude_m,
    speed_mph = excluded.speed_mph, speed_kph = excluded.speed_kph,
    heading = excluded.heading, status = excluded.status,
    drive_mode = excluded.drive_mode, is_visible = excluded.is_visible,
    vehicle_id = excluded.vehicle_id, cruise_id = excluded.cruise_id,
    updated_at = excluded.updated_at, expires_at = excluded.expires_at
  returning * into result;
  return result;
end;
$$;

revoke all on function public.publish_driver_location(numeric,numeric,numeric,numeric,numeric,numeric,boolean,uuid,uuid) from public, anon;
grant execute on function public.publish_driver_location(numeric,numeric,numeric,numeric,numeric,numeric,boolean,uuid,uuid) to authenticated;

create or replace function public.create_race_contract(
  p_opponent_ids uuid[],
  p_race_type text,
  p_route_name text,
  p_distance_miles numeric,
  p_rules text,
  p_starts_at timestamptz,
  p_wager_credits numeric default 0
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  race_id uuid;
  opponent uuid;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if coalesce(array_length(p_opponent_ids, 1), 0) = 0 then raise exception 'select at least one opponent'; end if;
  if p_wager_credits < 0 then raise exception 'invalid wager'; end if;
  insert into public.race_challenges (
    challenger_id, opponent_id, race_type, wager_credits, start_time, rules,
    route_name, distance_miles, status
  ) values (
    uid, p_opponent_ids[1], p_race_type, p_wager_credits, p_starts_at, p_rules,
    p_route_name, p_distance_miles, 'open'
  ) returning id into race_id;
  insert into public.race_participants (race_id, user_id, role, invite_status)
  values (race_id, uid, 'driver', 'accepted');
  foreach opponent in array p_opponent_ids loop
    if opponent <> uid then
      insert into public.race_participants (race_id, user_id, role, invite_status)
      values (race_id, opponent, 'driver', 'invited') on conflict do nothing;
    end if;
  end loop;
  return race_id;
end;
$$;
revoke all on function public.create_race_contract(uuid[],text,text,numeric,text,timestamptz,numeric) from public, anon;
grant execute on function public.create_race_contract(uuid[],text,text,numeric,text,timestamptz,numeric) to authenticated;

-- Remove legacy demonstration inventory. Live products come from provider APIs.
delete from public.marketplace_products
where created_at <= timestamp with time zone '2026-08-15 23:59:59+00';

grant select, insert, update, delete on public.cruises, public.cruise_members, public.event_geofences, public.post_saves, public.race_participants, public.race_bets to authenticated;
grant select, insert, update, delete on public.driver_locations to authenticated;

-- Harden legacy privileged functions before exposing the V2 API. Credit movement
-- remains server-only until the audited wager settlement function is deployed.
revoke all on function public.add_credits(uuid, numeric) from public, anon, authenticated;
revoke all on function public.deduct_credits(uuid, numeric) from public, anon, authenticated;
revoke all on function public.escrow_wager(uuid, uuid, numeric, uuid) from public, anon, authenticated;
revoke all on function public.release_wager(uuid, uuid) from public, anon, authenticated;
revoke all on function public.join_car_meet(uuid, uuid) from public, anon, authenticated;
revoke all on function public.save_telemetry_run(uuid, uuid, text, numeric, numeric, numeric, jsonb) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.notify_race_challenge() from public, anon, authenticated;

alter function public.handle_new_user() set search_path = '';
alter function public.notify_race_challenge() set search_path = '';
alter view public.leaderboard set (security_invoker = true);

create or replace function public.join_car_meet_v2(p_meet_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'authentication required'; end if;
  insert into public.meet_attendees (meet_id, user_id)
  values (p_meet_id, uid) on conflict do nothing;
end;
$$;
revoke all on function public.join_car_meet_v2(uuid) from public, anon;
grant execute on function public.join_car_meet_v2(uuid) to authenticated;

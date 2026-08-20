-- Apex UGR Complete Production Bounty System Migration
-- Supports Roaming & Venue Modes, Proximity Claims, Escalation (1-5 Stars), Anti-Farming & Ghost Ledger Integration

-- 1. Bounty User Settings & Opt-in State
create table if not exists public.bounty_user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bounty_mode_enabled boolean not null default false,
  notifications_enabled boolean not null default true,
  show_public_photo boolean not null default true,
  allow_most_wanted boolean not null default true,
  agreement_version text not null default 'v1.0',
  agreed_at timestamptz,
  cooldown_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Configurable Bounty Settings (Admin tuning)
create table if not exists public.bounty_config (
  id text primary key default 'default',
  bounty_enabled boolean not null default true,
  roaming_enabled boolean not null default true,
  venue_enabled boolean not null default true,
  stage_duration_seconds jsonb not null default '{"1": 600, "2": 600, "3": 600, "4": 600, "5": 900}'::jsonb,
  stage_reward_gc jsonb not null default '{"1": 300, "2": 500, "3": 850, "4": 1200, "5": 2500}'::jsonb,
  stage_reward_rep jsonb not null default '{"1": 150, "2": 250, "3": 450, "4": 650, "5": 1000}'::jsonb,
  claim_radius_miles numeric(6,3) not null default 0.500,
  lock_duration_seconds integer not null default 20,
  cooldown_minutes integer not null default 30,
  broadcast_radius_miles jsonb not null default '{"1": 5.0, "2": 8.0, "3": 12.0, "4": 20.0, "5": 50.0}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.bounty_config (id) values ('default') on conflict (id) do nothing;

-- 3. Active & Historical Bounty Sessions
create table if not exists public.bounty_sessions (
  id uuid primary key default uuid_generate_v4(),
  mode text not null default 'roaming' check (mode in ('roaming', 'venue', 'event')),
  venue_id uuid references public.car_meets(id) on delete set null,
  venue_name text,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  target_vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  star_level integer not null default 1 check (star_level between 1 and 5),
  status text not null default 'active' check (status in ('pending', 'active', 'escalating', 'claimed', 'escaped', 'cancelled', 'expired', 'invalidated')),
  starts_at timestamptz not null default now(),
  stage_started_at timestamptz not null default now(),
  stage_ends_at timestamptz not null,
  reward_gc numeric(10,2) default 300,
  reward_rep integer default 150,
  claimed_by_user_id uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  escaped_at timestamptz,
  completed_at timestamptz,
  escalation_history jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Hunter Participants per Session
create table if not exists public.bounty_participants (
  session_id uuid not null references public.bounty_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  active_vehicle_id uuid references public.vehicles(id) on delete set null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  status text not null default 'hunting' check (status in ('hunting', 'left', 'claimed', 'failed')),
  last_signal_pct integer default 0,
  proximity_lock_seconds integer default 0,
  lock_started_at timestamptz,
  primary key (session_id, user_id)
);

-- 5. User Bounty Statistics (Hunter & Survivor)
create table if not exists public.bounty_user_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  -- Hunter Stats
  hunts_joined integer not null default 0,
  successful_claims integer not null default 0,
  highest_star_claimed integer not null default 0,
  current_hunter_streak integer not null default 0,
  best_hunter_streak integer not null default 0,
  five_star_claims integer not null default 0,
  hunter_gc_earned numeric(12,2) not null default 0,
  hunter_rep_earned integer not null default 0,
  -- Survivor Stats
  times_selected integer not null default 0,
  escapes integer not null default 0,
  highest_star_survived integer not null default 0,
  five_star_survivals integer not null default 0,
  current_survival_streak integer not null default 0,
  best_survival_streak integer not null default 0,
  survivor_gc_earned numeric(12,2) not null default 0,
  survivor_rep_earned integer not null default 0,
  updated_at timestamptz not null default now()
);

-- 6. Bounty Safe / Privacy Zones
create table if not exists public.bounty_safe_zones (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade, -- null = global system safe zone
  name text not null,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  radius_m integer not null default 300,
  created_at timestamptz not null default now()
);

-- RLS & Security
alter table public.bounty_user_settings enable row level security;
alter table public.bounty_config enable row level security;
alter table public.bounty_sessions enable row level security;
alter table public.bounty_participants enable row level security;
alter table public.bounty_user_stats enable row level security;
alter table public.bounty_safe_zones enable row level security;

create policy "Users manage own bounty settings" on public.bounty_user_settings
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Authenticated users read bounty config" on public.bounty_config
  for select to authenticated using (true);

create policy "Authenticated users read active/completed bounty sessions" on public.bounty_sessions
  for select to authenticated using (true);

create policy "Authenticated users read participants" on public.bounty_participants
  for select to authenticated using (true);

create policy "Users join or leave hunts" on public.bounty_participants
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Users read bounty stats" on public.bounty_user_stats
  for select to authenticated using (true);

create policy "Users manage own safe zones" on public.bounty_safe_zones
  for all to authenticated using (user_id is null or user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.bounty_user_settings, public.bounty_config, public.bounty_sessions, public.bounty_participants, public.bounty_user_stats, public.bounty_safe_zones to authenticated;

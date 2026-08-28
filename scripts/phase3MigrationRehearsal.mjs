import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, ".."),
  sourceMigrations = resolve(root, "migrations"),
  wrangler = resolve(
    root,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "wrangler.cmd" : "wrangler",
  );

function run(cwd, args, expectSuccess = true) {
  const result = spawnSync(wrangler, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    shell: process.platform === "win32",
  });
  if (expectSuccess && result.status !== 0)
    throw new Error(`${result.error || ""}\n${result.stdout || ""}\n${result.stderr || ""}`);
  return result;
}

function prepare(name, duplicate = false) {
  const dir = mkdtempSync(join(tmpdir(), `apex-${name}-`)),
    migrations = join(dir, "migrations"),
    state = join(dir, "state"),
    config = join(dir, "wrangler.jsonc");
  mkdirSync(migrations, { recursive: true });
  writeFileSync(
    config,
    JSON.stringify({
      name,
      compatibility_date: "2026-08-15",
      d1_databases: [
        {
          binding: "DB",
          database_name: name,
          database_id: "00000000-0000-0000-0000-000000000001",
          migrations_dir: migrations,
        },
      ],
    }),
  );
  for (let index = 1; index <= 22; index += 1) {
    const prefix = String(index).padStart(4, "0"),
      source = readFileSync(
        join(
          sourceMigrations,
          [
            "0001_apex_core.sql",
            "0002_racing_meets.sql",
            "0003_saved_navigation.sql",
            "0004_competition_metrics.sql",
            "0005_social_location.sql",
            "0006_invite_access.sql",
            "0007_world_progression.sql",
            "0008_game_systems.sql",
            "0009_ghost_rewards.sql",
            "0010_multistop_routes.sql",
            "0011_route_competition.sql",
            "0012_world_expansion.sql",
            "0013_ghost_economy.sql",
            "0014_rank_and_venue_bounties.sql",
            "0015_ghost_catalog.sql",
            "0016_expansion_systems.sql",
            "0017_ghost_shop_orders.sql",
            "0018_bounty_system.sql",
            "0019_mod_sync_settings.sql",
            "0020_settings_completion.sql",
            "0021_featured_badges_four_slots.sql",
            "0022_underground_network_v2.sql",
          ][index - 1],
        ),
      );
    writeFileSync(join(migrations, `${prefix}_rehearsal.sql`), source);
  }
  run(dir, ["d1", "migrations", "apply", name, "--local", "--persist-to", state, "--config", config]);
  const seed = join(dir, "seed.sql"),
    duplicateSql = duplicate
      ? "INSERT INTO daily_ghost_claims(id,user_id,claim_date,streak_day,rarity,reward_type,reward_value) VALUES('claim-2','user-1','2026-08-26',1,'COMMON','gc',100);"
      : "";
  writeFileSync(
    seed,
    `PRAGMA foreign_keys=ON;
INSERT INTO users(id,email,username,display_name,password_hash,password_salt,credits,points) VALUES('user-1','snapshot@example.test','snapshot','Snapshot Driver','hash','salt',1234,4321);
INSERT INTO vehicles(id,user_id,nickname,year,make,model,horsepower,is_active) VALUES('vehicle-1','user-1','Snapshot Car',2020,'Nissan','GT-R',565,1);
INSERT INTO ghost_profiles(user_id,credits,current_streak,best_streak) VALUES('user-1',777,3,5);
INSERT INTO ghost_inventory(user_id,item_id,acquired_source,purchase_price_gc) VALUES('user-1','frame-ghost-signal','snapshot',500);
INSERT INTO personal_performance_records(id,user_id,vehicle_id,run_type,result_seconds,gps_confidence_pct,verification_status) VALUES('perf-1','user-1','vehicle-1','0-60',5.4,90,'verified');
INSERT INTO daily_ghost_claims(id,user_id,claim_date,streak_day,rarity,reward_type,reward_value) VALUES('claim-1','user-1','2026-08-26',1,'COMMON','gc',100);
${duplicateSql}
INSERT INTO events(id,host_id,title,location_name,latitude,longitude,starts_at) VALUES('event-1','user-1','Snapshot Meet','Private Venue',38.9,-77.0,'2026-08-26T12:00:00Z');
INSERT INTO bounty_user_stats(user_id,successful_claims,escapes) VALUES('user-1',2,1);`,
  );
  run(dir, ["d1", "execute", name, "--local", "--persist-to", state, "--config", config, "--file", seed]);
  return { dir, migrations, state, config, name };
}

function query(context) {
  const sql = `SELECT
    (SELECT COUNT(*) FROM users) users,
    (SELECT COUNT(*) FROM vehicles) vehicles,
    (SELECT credits FROM ghost_profiles WHERE user_id='user-1') ghost_balance,
    (SELECT COUNT(*) FROM ghost_inventory) inventory,
    (SELECT COUNT(*) FROM personal_performance_records) performance_records,
    (SELECT COUNT(*) FROM daily_ghost_claims) daily_claims,
    (SELECT COUNT(*) FROM events) meets,
    (SELECT successful_claims+escapes FROM bounty_user_stats WHERE user_id='user-1') bounty_events;`,
    queryFile = join(context.dir, "preservation-query.sql");
  writeFileSync(queryFile, sql);
  const result = run(context.dir, [
    "d1",
    "execute",
    context.name,
    "--local",
    "--persist-to",
    context.state,
    "--config",
    context.config,
    "--file",
    queryFile,
    "--json",
  ]);
  return JSON.parse(result.stdout)[0].results[0];
}

const clean = prepare("phase3-clean"),
  before = query(clean);
cpSync(join(sourceMigrations, "0023_race_social_experience_v3.sql"), join(clean.migrations, "0023_rehearsal.sql"));
run(clean.dir, ["d1", "migrations", "apply", clean.name, "--local", "--persist-to", clean.state, "--config", clean.config]);
const after = query(clean);
assert.deepEqual(after, before);

const duplicate = prepare("phase3-duplicate", true);
cpSync(join(sourceMigrations, "0023_race_social_experience_v3.sql"), join(duplicate.migrations, "0023_rehearsal.sql"));
const rejected = run(
  duplicate.dir,
  ["d1", "migrations", "apply", duplicate.name, "--local", "--persist-to", duplicate.state, "--config", duplicate.config],
  false,
);
assert.notEqual(rejected.status, 0, "Migration 0023 must fail closed when daily claims are duplicated.");

console.log(
  JSON.stringify({
    status: "pass",
    preserved: after,
    duplicateClaims: "migration-rejected-without-deletion",
  }),
);
rmSync(clean.dir, { recursive: true, force: true });
rmSync(duplicate.dir, { recursive: true, force: true });

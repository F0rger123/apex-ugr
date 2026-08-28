import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, ".."),
  temp = mkdtempSync(join(tmpdir(), "apex-phase4-")),
  migrations = join(temp, "migrations"),
  state = join(temp, "state"),
  config = join(temp, "wrangler.jsonc"),
  database = "apex-phase4-rehearsal",
  wrangler = resolve(root, "node_modules", ".bin", process.platform === "win32" ? "wrangler.cmd" : "wrangler");

function run(args) {
  const result = spawnSync(wrangler, args, { cwd: temp, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" }, shell: process.platform === "win32" });
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  return `${result.stdout}\n${result.stderr}`;
}
try {
  mkdirSync(migrations, { recursive: true });
  writeFileSync(config, JSON.stringify({ name: database, compatibility_date: "2026-08-15", d1_databases: [{ binding: "DB", database_name: database, database_id: "00000000-0000-0000-0000-000000000024", migrations_dir: migrations }] }));
  for (const file of readdirSync(resolve(root, "migrations")).filter((name) => /^\d{4}_.+\.sql$/.test(name)).sort()) cpSync(resolve(root, "migrations", file), resolve(migrations, file));
  run(["d1", "migrations", "apply", database, "--local", "--persist-to", state, "--config", config]);
  const sql = join(temp, "indexes.sql");
  writeFileSync(sql, "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name;");
  const output = run(["d1", "execute", database, "--local", "--persist-to", state, "--config", config, "--file", sql]);
  for (const index of ["idx_perf_user_verified_run", "idx_perf_user_verified_speed", "idx_cruise_members_user", "idx_post_likes_user", "idx_post_saves_user", "idx_comments_user", "idx_season_progress_user"]) assert.ok(output.includes(index), `Missing Phase 4 index ${index}`);
  console.log("Phase 4 migration rehearsal passed.");
} finally {
  rmSync(temp, { recursive: true, force: true });
}

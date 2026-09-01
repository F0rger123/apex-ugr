import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { resolve, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

const root = resolve(import.meta.dirname, "..");
const state = resolve(root, process.env.APEX_QA_STATE || "tmp/pr23-http-qa");
const rel = relative(root, state);
if (rel.startsWith("..") || rel === "" || /^[A-Za-z]:/.test(rel)) {
  throw new Error(`Refusing to reset a QA state outside the repository: ${state}`);
}
if (!rel.startsWith(`tmp${process.platform === "win32" ? "\\" : "/"}`) && !rel.startsWith(".phase")) {
  throw new Error(`Refusing to reset a non-QA state path: ${state}`);
}

if (existsSync(state)) rmSync(state, { recursive: true, force: true });
mkdirSync(state, { recursive: true });

const wrangler = resolve(root, "node_modules", "wrangler", "bin", "wrangler.js");
const result = spawnSync(process.execPath, [wrangler, "d1", "migrations", "apply", "DB", "--local", "--persist-to", state], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, NO_COLOR: "1" },
});
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);

const d1Dir = resolve(state, "v3", "d1", "miniflare-D1DatabaseObject");
const d1File = readdirSync(d1Dir).find((file) => file.endsWith(".sqlite") && file !== "metadata.sqlite");
if (!d1File) throw new Error(`Could not locate local D1 SQLite file in ${d1Dir}`);
const db = new DatabaseSync(resolve(d1Dir, d1File));
try {
  db.exec("UPDATE bounty_config SET stage_duration_seconds='{\"1\":1,\"2\":600,\"3\":600,\"4\":600,\"5\":900}' WHERE id='default';");
} finally {
  db.close();
}

console.log(JSON.stringify({ status: "pass", state, note: "Start Pages dev without --d1/--r2 overrides so it uses wrangler.jsonc bindings." }));

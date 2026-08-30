import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, ".."),
  state = resolve(root, process.env.APEX_QA_STATE || ".phase3qa"),
  wrangler = resolve(root, "node_modules", ".bin", process.platform === "win32" ? "wrangler.cmd" : "wrangler"),
  scratch = mkdtempSync(join(tmpdir(), "apex-cotw-")),
  base = process.env.APEX_QA_URL || "http://127.0.0.1:8791/api";

function sql(source) {
  const file = join(scratch, `${crypto.randomUUID()}.sql`);
  writeFileSync(file, source);
  const result = spawnSync(wrangler, ["d1", "execute", "DB", "--local", "--persist-to", state, "--file", file, "--json"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    shell: process.platform === "win32",
  });
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  return JSON.parse(result.stdout)[0]?.results || [];
}

async function api(path, token, options = {}) {
  const response = await fetchRetry(`${base}/${path}`, {
    ...options,
    headers: { authorization: `Bearer ${token}`, ...(options.body ? { "content-type": "application/json" } : {}) },
  });
  return { status: response.status, payload: await response.json() };
}

async function fetchRetry(url, options) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

try {
  const fixtureId = `phase3-cotw-${Date.now()}`;
  const fixtureCategory = `BEST_BUILD_${Date.now()}`;
  const signIn = await fetchRetry(`${base}/auth/signin`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "drummerforger@gmail.com", password: "Phase3-QA-Password!" }) });
  assert.equal(signIn.status, 200);
  const { token } = await signIn.json();
  sql(`INSERT OR IGNORE INTO car_of_the_week_submissions(id,week_identifier,category,user_id,vehicle_id,year_make_model,media_urls_json,description,votes_count)
    SELECT '${fixtureId}','2020-W01','${fixtureCategory}',u.id,v.id,'2024 Nissan GT-R','["/api/media/phase3-fixture.png"]','QA fixture',12
    FROM users u JOIN vehicles v ON v.user_id=u.id WHERE u.email='drummerforger@gmail.com' ORDER BY v.created_at LIMIT 1;`);
  const before = sql(`SELECT u.points,(SELECT credits FROM ghost_profiles WHERE user_id=u.id) gc FROM users u WHERE u.email='drummerforger@gmail.com';`)[0];
  assert.equal((await api("cotw/active", token)).status, 200);
  const afterFirst = sql(`SELECT u.points,(SELECT credits FROM ghost_profiles WHERE user_id=u.id) gc,
    (SELECT COUNT(*) FROM car_of_the_week_winners WHERE submission_id='${fixtureId}') winners,
    (SELECT COUNT(*) FROM ghost_credit_transactions WHERE activity_id IN (SELECT id FROM car_of_the_week_winners WHERE submission_id='${fixtureId}')) ledgers,
    (SELECT COUNT(*) FROM notifications WHERE type='cotw_winner' AND json_extract(data_json,'$.winnerId') IN (SELECT id FROM car_of_the_week_winners WHERE submission_id='${fixtureId}')) notices
    FROM users u WHERE u.email='drummerforger@gmail.com';`)[0];
  assert.equal((await api("cotw/active", token)).status, 200);
  const afterSecond = sql(`SELECT u.points,(SELECT credits FROM ghost_profiles WHERE user_id=u.id) gc,
    (SELECT COUNT(*) FROM car_of_the_week_winners WHERE submission_id='${fixtureId}') winners,
    (SELECT COUNT(*) FROM ghost_credit_transactions WHERE activity_id IN (SELECT id FROM car_of_the_week_winners WHERE submission_id='${fixtureId}')) ledgers,
    (SELECT COUNT(*) FROM notifications WHERE type='cotw_winner' AND json_extract(data_json,'$.winnerId') IN (SELECT id FROM car_of_the_week_winners WHERE submission_id='${fixtureId}')) notices
    FROM users u WHERE u.email='drummerforger@gmail.com';`)[0];
  assert.equal(afterFirst.points - before.points, 250);
  assert.equal(afterFirst.gc - before.gc, 500);
  assert.deepEqual(afterSecond, afterFirst);
  assert.equal(afterSecond.winners, 1);
  assert.equal(afterSecond.ledgers, 1);
  assert.equal(afterSecond.notices, 1);
  console.log(JSON.stringify({ status: "pass", winner: "deterministic", rewards: "single-application", notification: "single-delivery" }));
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

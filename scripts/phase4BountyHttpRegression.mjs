import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, ".."),
  state = resolve(root, process.env.APEX_QA_STATE || ".phase3qa"),
  wrangler = resolve(root, "node_modules", ".bin", process.platform === "win32" ? "wrangler.cmd" : "wrangler"),
  scratch = mkdtempSync(join(tmpdir(), "apex-bounty4-")),
  base = process.env.APEX_QA_URL || "http://127.0.0.1:8791/api";

function sql(source) {
  const file = join(scratch, `${crypto.randomUUID()}.sql`);
  writeFileSync(file, source);
  const result = spawnSync(wrangler, ["d1", "execute", "DB", "--local", "--persist-to", state, "--file", file, "--json"], {
    cwd: root, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" }, shell: process.platform === "win32",
  });
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  return JSON.parse(result.stdout)[0]?.results || [];
}

async function api(path, token, options = {}) {
  const response = await fetch(`${base}/${path}`, {
    ...options,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(options.body ? { "content-type": "application/json" } : {}) },
  });
  return { status: response.status, payload: await response.json() };
}

try {
  const signIn = await api("auth/signin", null, { method: "POST", body: JSON.stringify({ email: "drummerforger@gmail.com", password: "Phase3-QA-Password!" }) });
  assert.equal(signIn.status, 200);
  const token = signIn.payload.token;
  await api("bounty/settings", token, { method: "PUT", body: JSON.stringify({ bountyModeEnabled: true, agreed: true }) });
  await api("location", token, { method: "POST", body: JSON.stringify({ latitude: 40, longitude: -75, accuracy: 5, sampleAgeMs: 100, driveMode: true, shareMinutes: 15 }) });
  sql(`UPDATE bounty_sessions SET status='cancelled',completed_at=CURRENT_TIMESTAMP WHERE target_user_id=(SELECT id FROM users WHERE email='drummerforger@gmail.com') AND status IN ('active','escalating');
    UPDATE bounty_user_settings SET cooldown_until=NULL WHERE user_id=(SELECT id FROM users WHERE email='drummerforger@gmail.com');
    UPDATE bounty_config SET stage_duration_seconds='{"1":1,"2":600,"3":600,"4":600,"5":900}' WHERE id='default';`);
  const created = await api("bounty/trigger", token, { method: "POST", body: JSON.stringify({ mode: "venue", venueName: "PHASE 4 TIMER QA", starLevel: 1 }) });
  assert.equal(created.status, 201);
  await new Promise((resolve) => setTimeout(resolve, 1_500));

  const firstPoll = await api("bounty/active", token);
  assert.equal(firstPoll.status, 200);
  assert.equal(firstPoll.payload.session.starLevel, 2);
  const afterFirst = sql(`SELECT star_level,(SELECT COUNT(*) FROM notifications WHERE type='bounty_escalated' AND json_extract(data_json,'$.sessionId')='${created.payload.id}') notices FROM bounty_sessions WHERE id='${created.payload.id}';`)[0];
  const secondPoll = await api("bounty/active", token);
  const afterSecond = sql(`SELECT star_level,(SELECT COUNT(*) FROM notifications WHERE type='bounty_escalated' AND json_extract(data_json,'$.sessionId')='${created.payload.id}') notices FROM bounty_sessions WHERE id='${created.payload.id}';`)[0];
  assert.equal(secondPoll.payload.session.starLevel, 2);
  assert.deepEqual(afterSecond, afterFirst);
  assert.equal(afterSecond.notices, 1);
  console.log(JSON.stringify({ status: "pass", timer: "server-automatic", escalation: "single-application", polling: "no-manual-sync" }));
} finally {
  try { sql(`UPDATE bounty_config SET stage_duration_seconds='{"1":600,"2":600,"3":600,"4":600,"5":900}' WHERE id='default';
    UPDATE bounty_sessions SET status='cancelled',completed_at=CURRENT_TIMESTAMP WHERE venue_name='PHASE 4 TIMER QA' AND status IN ('active','escalating');`); } catch { /* Preserve the original assertion. */ }
  rmSync(scratch, { recursive: true, force: true });
}

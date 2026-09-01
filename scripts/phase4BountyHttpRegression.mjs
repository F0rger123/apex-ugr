import assert from "node:assert/strict";

const base = process.env.APEX_QA_URL || "http://127.0.0.1:8791/api";
const qaPasswords = ["Phase3-QA-Password!", "Invite-QA-Password!"];

async function api(path, token, options = {}) {
  const response = await fetch(`${base}/${path}`, {
    ...options,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(options.body ? { "content-type": "application/json" } : {}) },
  });
  return { status: response.status, payload: await response.json() };
}

let signIn;
for (const password of qaPasswords) {
  signIn = await api("auth/signin", null, { method: "POST", body: JSON.stringify({ email: "drummerforger@gmail.com", password }) });
  if (signIn.status === 200) break;
}
if (signIn?.status !== 200) {
  const signup = await api("auth/signup", null, { method: "POST", body: JSON.stringify({ email: "drummerforger@gmail.com", password: qaPasswords[0] }) });
  assert.equal(signup.status, 201);
  signIn = signup;
}
assert.ok(signIn?.payload?.token);
const token = signIn.payload.token;
await api("bounty/settings", token, { method: "PUT", body: JSON.stringify({ bountyModeEnabled: true, agreed: true }) });
await api("location", token, { method: "POST", body: JSON.stringify({ latitude: 40, longitude: -75, accuracy: 5, sampleAgeMs: 100, driveMode: true, shareMinutes: 15 }) });
const created = await api("bounty/trigger", token, { method: "POST", body: JSON.stringify({ mode: "venue", venueName: "PHASE 4 TIMER QA", starLevel: 1 }) });
assert.equal(created.status, 201);
await new Promise((resolve) => setTimeout(resolve, 1_500));

const firstPoll = await api("bounty/active", token);
assert.equal(firstPoll.status, 200);
assert.equal(firstPoll.payload.session.starLevel, 2);
const firstNotifications = await api("notifications", token);
assert.equal(firstNotifications.status, 200);
const firstNotices = firstNotifications.payload.notifications.filter((notice) => notice.type === "bounty_escalated" && notice.data?.sessionId === created.payload.id);
const secondPoll = await api("bounty/active", token);
const secondNotifications = await api("notifications", token);
const secondNotices = secondNotifications.payload.notifications.filter((notice) => notice.type === "bounty_escalated" && notice.data?.sessionId === created.payload.id);
assert.equal(secondPoll.payload.session.starLevel, 2);
assert.equal(firstNotices.length, 1);
assert.equal(secondNotices.length, 1);
console.log(JSON.stringify({ status: "pass", timer: "server-automatic", escalation: "single-application", polling: "no-manual-sync" }));

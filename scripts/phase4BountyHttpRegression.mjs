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

async function ownerSession() {
  let signIn;
  for (const password of qaPasswords) {
    signIn = await api("auth/signin", null, { method: "POST", body: JSON.stringify({ email: "drummerforger@gmail.com", password }) });
    if (signIn.status === 200) return signIn;
  }
  const signup = await api("auth/signup", null, { method: "POST", body: JSON.stringify({ email: "drummerforger@gmail.com", password: qaPasswords[0] }) });
  assert.equal(signup.status, 201);
  return signup;
}

const owner = await ownerSession();
const invite = await api("invites", owner.payload.token, { method: "POST", body: JSON.stringify({ label: "PHASE 4 BOUNTY TIMER QA", maxUses: 1 }) });
assert.equal(invite.status, 201);

const qaEmail = `phase4-bounty-${Date.now()}@example.test`;
const signup = await api("auth/signup", null, {
  method: "POST",
  body: JSON.stringify({ email: qaEmail, password: qaPasswords[0], inviteCode: invite.payload.code }),
});
assert.equal(signup.status, 201);
assert.ok(signup.payload.token);
const token = signup.payload.token;
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

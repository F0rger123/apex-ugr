import assert from "node:assert/strict";

const base = process.env.APEX_QA_URL || "http://127.0.0.1:8791/api";
const password = "Invite-QA-Password!";

async function call(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${base}/${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, payload: await response.json().catch(() => ({})) };
}

async function createUser(email, inviteCode) {
  return call("auth/signup", {
    method: "POST",
    body: { email, password, inviteCode },
  });
}

async function main() {
  const suffix = Date.now();
  const developer = await createUser("drummerforger@gmail.com");
  let session = developer;
  if (developer.status === 409) {
    for (const candidate of [password, "Phase3-QA-Password!"]) {
      session = await call("auth/signin", { method: "POST", body: { email: "drummerforger@gmail.com", password: candidate } });
      if (session.status === 200) break;
    }
  }
  assert.ok([200, 201].includes(session.status));
  const ownerToken = session.payload.token;

  const invite = await call("invites", {
    token: ownerToken,
    method: "POST",
    body: { label: "MULTI USER QA", maxUses: 2 },
  });
  assert.equal(invite.status, 201);
  assert.match(invite.payload.code, /^\d{6}$/);

  const initialVerification = await call("invite/verify", { method: "POST", body: { code: invite.payload.code } });
  assert.equal(initialVerification.status, 200);
  assert.equal(initialVerification.payload.remaining, 2);

  const first = await createUser(`invite-first-${suffix}@example.test`, invite.payload.code);
  const second = await createUser(`invite-second-${suffix}@example.test`, invite.payload.code);
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);

  const exhaustedVerification = await call("invite/verify", { method: "POST", body: { code: invite.payload.code } });
  const blockedThird = await createUser(`invite-third-${suffix}@example.test`, invite.payload.code);
  assert.equal(exhaustedVerification.status, 404);
  assert.equal(blockedThird.status, 403);

  const ownerCodes = await call("invites", { token: ownerToken });
  const savedInvite = ownerCodes.payload.codes.find((entry) => entry.id === invite.payload.id);
  assert.equal(savedInvite.use_count, 2);
  assert.equal(ownerCodes.payload.redemptions.filter((entry) => entry.code_id === invite.payload.id).length, 2);

  const childInvite = await call("invites", {
    token: first.payload.token,
    method: "POST",
    body: { label: "SHARED BY MEMBER", maxUses: 2 },
  });
  assert.equal(childInvite.status, 201);
  assert.match(childInvite.payload.code, /^\d{6}$/);
  const childUser = await createUser(`invite-child-${suffix}@example.test`, childInvite.payload.code);
  assert.equal(childUser.status, 201);

  const disabled = await call(`invites/${childInvite.payload.id}/toggle`, { token: first.payload.token, method: "POST" });
  assert.equal(disabled.status, 200);
  const disabledVerification = await call("invite/verify", { method: "POST", body: { code: childInvite.payload.code } });
  assert.equal(disabledVerification.status, 404);

  console.log(JSON.stringify({
    status: "pass",
    format: "six-digit-numeric",
    multiUse: "limit-enforced",
    memberSharing: "verified",
    redemptionVisibility: "verified",
    disabledCode: "rejected",
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

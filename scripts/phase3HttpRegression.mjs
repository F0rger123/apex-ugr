import assert from "node:assert/strict";

const base = process.env.APEX_QA_URL || "http://127.0.0.1:8791/api";

async function call(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${base}/${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

async function main() {
  const suffix = Date.now();
  const developer = await call("auth/signup", {
    method: "POST",
    body: { email: "drummerforger@gmail.com", password: "Phase3-QA-Password!" },
  });
  const devSession = developer.status === 409
    ? await call("auth/signin", { method: "POST", body: { email: "drummerforger@gmail.com", password: "Phase3-QA-Password!" } })
    : developer;
  assert.equal(devSession.status, 201 === developer.status ? 201 : 200);
  const devToken = devSession.payload.token;
  const devId = devSession.payload.user.id;

  const invite = await call("invites", { token: devToken, method: "POST", body: { label: "PHASE 3 QA", maxUses: 1 } });
  assert.equal(invite.status, 201);
  const rivalEmail = `phase3-rival-${suffix}@example.test`;
  const rival = await call("auth/signup", {
    method: "POST",
    body: { email: rivalEmail, password: "Phase3-QA-Password!", inviteCode: invite.payload.code },
  });
  assert.equal(rival.status, 201);
  const rivalToken = rival.payload.token;
  const rivalId = rival.payload.user.id;

  const devVehicle = await call("vehicles", { token: devToken, method: "POST", body: { year: 2024, make: "Nissan", model: "GT-R", horsepower: 565 } });
  const rivalVehicle = await call("vehicles", { token: rivalToken, method: "POST", body: { year: 2023, make: "Toyota", model: "GR Supra", horsepower: 382 } });
  assert.equal(devVehicle.status, 201);
  assert.equal(rivalVehicle.status, 201);

  const forged = await call("performance/records", {
    token: devToken,
    method: "POST",
    body: {
      vehicleId: devVehicle.payload.id,
      runType: "0-60",
      resultSeconds: 5,
      topSpeedKph: 96.6,
      gpsAccuracyM: 3,
      gpsSampleAgeMs: 100,
      route: [
        { latitude: 40, longitude: -75, speedKph: 0, timestamp: 0 },
        { latitude: 40.0001, longitude: -75, speedKph: 40, timestamp: 300 },
        { latitude: 40.0002, longitude: -75, speedKph: 80, timestamp: 600 },
        { latitude: 40.0003, longitude: -75, speedKph: 97, timestamp: 1200 },
      ],
    },
  });
  assert.equal(forged.status, 422);

  const settings = await call("settings", { token: rivalToken });
  assert.equal(settings.status, 200);
  const privateSettings = await call("settings", {
    token: rivalToken,
    method: "PUT",
    body: { ...settings.payload.settings, profile_visibility: 0, location_visibility: 0 },
  });
  assert.equal(privateSettings.status, 200);
  const privateProfile = await call(`v3/profile/${rivalId}`, { token: devToken });
  assert.equal(privateProfile.status, 403);
  const leaderboard = await call("v3/leaderboards", { token: devToken });
  assert.equal(leaderboard.status, 200);
  assert.equal(JSON.stringify(leaderboard.payload).includes(rivalId), false);

  const beforeDev = await call("session", { token: devToken });
  const beforeRival = await call("session", { token: rivalToken });
  const route = [
    { name: "START", latitude: 40.0, longitude: -75.0 },
    { name: "FINISH", latitude: 40.0005, longitude: -75.0005 },
  ];
  const race = await call("races", {
    token: devToken,
    method: "POST",
    body: { opponentIds: [rivalId], raceType: "ROUTE", raceMode: "route", startsAt: new Date(Date.now() + 60_000).toISOString(), wagerCredits: 100, courseVerified: true, route },
  });
  assert.equal(race.status, 201);
  const accepted = await call(`races/${race.payload.id}/accept`, { token: rivalToken, method: "POST", body: {} });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.payload.status, "scheduled");
  const repeatedAccept = await call(`races/${race.payload.id}/accept`, { token: rivalToken, method: "POST", body: {} });
  assert.equal(repeatedAccept.status, 409);
  const afterDev = await call("session", { token: devToken });
  const afterRival = await call("session", { token: rivalToken });
  assert.equal(beforeDev.payload.user.credits - afterDev.payload.user.credits, 100);
  assert.equal(beforeRival.payload.user.credits - afterRival.payload.user.credits, 100);

  const started = await call(`races/${race.payload.id}/start`, { token: devToken, method: "POST", body: {} });
  assert.equal(started.status, 200);
  const staleCheckpoint = await call(`races/${race.payload.id}/checkpoint`, { token: devToken, method: "POST", body: { latitude: 40, longitude: -75, accuracy: 5, sampleAgeMs: 11_000 } });
  assert.equal(staleCheckpoint.status, 400);
  const firstCheckpoint = await call(`races/${race.payload.id}/checkpoint`, { token: devToken, method: "POST", body: { latitude: 40, longitude: -75, accuracy: 5, sampleAgeMs: 100 } });
  assert.equal(firstCheckpoint.status, 200);
  const finish = await call(`races/${race.payload.id}/checkpoint`, { token: devToken, method: "POST", body: { latitude: 40.0005, longitude: -75.0005, accuracy: 5, sampleAgeMs: 100 } });
  assert.equal(finish.status, 200);
  assert.equal(finish.payload.place, 1);
  const repeatedFinish = await call(`races/${race.payload.id}/checkpoint`, { token: devToken, method: "POST", body: { latitude: 40.0005, longitude: -75.0005, accuracy: 5, sampleAgeMs: 100 } });
  assert.equal(repeatedFinish.status, 409);

  const now = Date.now();
  const meet = await call("v3/meets", {
    token: devToken,
    method: "POST",
    body: { name: "PHASE 3 QA MEET", locationName: "Closed course", latitude: 40, longitude: -75, startsAt: new Date(now - 60_000).toISOString(), endsAt: new Date(now + 60_000).toISOString(), radiusM: 150 },
  });
  assert.equal(meet.status, 201);
  const staleMeet = await call(`v3/meets/${meet.payload.id}/checkin`, { token: devToken, method: "POST", body: { latitude: 40, longitude: -75, accuracyM: 5, sampleAgeMs: 20_000 } });
  assert.equal(staleMeet.status, 422);
  const firstMeet = await call(`v3/meets/${meet.payload.id}/checkin`, { token: devToken, method: "POST", body: { latitude: 40, longitude: -75, accuracyM: 5, sampleAgeMs: 100 } });
  const secondMeet = await call(`v3/meets/${meet.payload.id}/checkin`, { token: devToken, method: "POST", body: { latitude: 40, longitude: -75, accuracyM: 5, sampleAgeMs: 100 } });
  assert.equal(firstMeet.payload.repAwarded, 100);
  assert.equal(secondMeet.payload.repAwarded, 0);

  for (const [token, latitude] of [[devToken, 40], [rivalToken, 40.0001]]) {
    const bountySettings = await call("bounty/settings", { token, method: "PUT", body: { bountyModeEnabled: true, agreed: true } });
    assert.equal(bountySettings.status, 200);
    const location = await call("location", { token, method: "POST", body: { latitude, longitude: -75, accuracy: 5, sampleAgeMs: 100, driveMode: true, shareMinutes: 15 } });
    assert.equal(location.status, 200);
  }
  const staleDriverLocation = await call("location", { token: rivalToken, method: "POST", body: { latitude: 40.0001, longitude: -75, accuracy: 5, sampleAgeMs: 11_000, driveMode: true } });
  assert.equal(staleDriverLocation.status, 422);
  const bounty = await call("bounty/trigger", { token: devToken, method: "POST", body: { mode: "venue", venueName: "PHASE 3 CLOSED COURSE", starLevel: 1 } });
  assert.equal(bounty.status, 201);
  const firstJoin = await call(`bounty/sessions/${bounty.payload.id}/join`, { token: rivalToken, method: "POST", body: {} });
  const secondJoin = await call(`bounty/sessions/${bounty.payload.id}/join`, { token: rivalToken, method: "POST", body: {} });
  assert.equal(firstJoin.status, 200);
  assert.equal(secondJoin.status, 200);
  const bountyStats = await call("bounty/stats", { token: rivalToken });
  assert.equal(bountyStats.payload.stats.huntsJoined, 1);
  const rapidSignals = await Promise.all(Array.from({ length: 25 }, () => call(`bounty/sessions/${bounty.payload.id}/signal`, { token: rivalToken, method: "POST", body: {} })));
  assert.equal(rapidSignals.some((result) => result.payload.targetVerified), false);
  await new Promise((resolve) => setTimeout(resolve, 20_500));
  const verifiedSignal = await call(`bounty/sessions/${bounty.payload.id}/signal`, { token: rivalToken, method: "POST", body: {} });
  assert.equal(verifiedSignal.payload.targetVerified, true);
  const claim = await call(`bounty/sessions/${bounty.payload.id}/claim`, { token: rivalToken, method: "POST", body: {} });
  const repeatedClaim = await call(`bounty/sessions/${bounty.payload.id}/claim`, { token: rivalToken, method: "POST", body: {} });
  assert.equal(claim.status, 200);
  assert.equal(repeatedClaim.status, 409);

  console.log(JSON.stringify({ status: "pass", privacy: "server-enforced", telemetry: "forged-rejected", escrow: "single-debit", payout: "single-settlement", meet: "fresh-and-idempotent", bounty: "fresh-location-time-locked-single-claim", users: [devId, rivalId] }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

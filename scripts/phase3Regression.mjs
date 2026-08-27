import assert from "node:assert/strict";
import {
  chestAvailable,
  parseApexQr,
  performanceConfidence,
  personalBest,
  racePayoutShare,
  relayHandoffEligible,
  routeRaceTransition,
  utcDay,
} from "../functions/lib/phase3-core.mjs";

assert.equal(utcDay(Date.UTC(2026, 7, 26, 23, 59, 59)), "2026-08-26");
assert.equal(
  chestAvailable("2026-08-25", Date.UTC(2026, 7, 26, 0, 0, 1)),
  true,
);
assert.equal(
  chestAvailable("2026-08-26", Date.UTC(2026, 7, 26, 23, 59, 59)),
  false,
);

assert.deepEqual(parseApexQr("apex://profile/user_123"), {
  type: "PROFILE",
  targetId: "user_123",
});
assert.equal(parseApexQr("https://malicious.example/profile/user_123"), null);
assert.equal(parseApexQr("apex://unknown/user_123"), null);

const confidence = performanceConfidence({
  accuracyM: 8,
  sampleAgeMs: 200,
  resultSeconds: 5.42,
  topSpeedKph: 140,
});
assert.equal(confidence.valid, true);
assert.equal(confidence.label, "HIGH");
assert.equal(
  performanceConfidence({
    accuracyM: 120,
    sampleAgeMs: 200,
    resultSeconds: 5,
    topSpeedKph: 140,
  }).valid,
  false,
);
assert.equal(
  performanceConfidence({
    accuracyM: 5,
    sampleAgeMs: 200,
    resultSeconds: 0.1,
    topSpeedKph: 900,
  }).valid,
  false,
);

const pb = personalBest(
  [
    { vehicle_id: "v1", run_type: "0-60", result_seconds: 5.6 },
    { vehicle_id: "v1", run_type: "0-60", result_seconds: 5.42 },
    { vehicle_id: "v2", run_type: "0-60", result_seconds: 4.2 },
  ],
  "0-60",
  "v1",
);
assert.deepEqual(pb, { best: 5.42, previous: 5.6, improvement: 0.18 });

assert.equal(routeRaceTransition("DRAFT", "open"), "OPEN");
assert.equal(routeRaceTransition("OPEN", "start"), null);
assert.equal(routeRaceTransition("READY", "start"), "ACTIVE");
assert.equal(routeRaceTransition("ACTIVE", "finish"), "FINISHED");
assert.equal(routeRaceTransition("FINISHED", "start"), null);

assert.equal(
  relayHandoffEligible({
    legOrder: 2,
    completedLegs: 1,
    assignedUserId: "u2",
    callerUserId: "u2",
    distanceM: 22,
    accuracyM: 8,
  }),
  true,
);
assert.equal(
  relayHandoffEligible({
    legOrder: 2,
    completedLegs: 1,
    assignedUserId: "u2",
    callerUserId: "u1",
    distanceM: 22,
    accuracyM: 8,
  }),
  false,
);
assert.equal(
  relayHandoffEligible({
    legOrder: 2,
    completedLegs: 1,
    assignedUserId: "u2",
    callerUserId: "u2",
    distanceM: 70,
    accuracyM: 8,
  }),
  false,
);
assert.deepEqual([racePayoutShare(2, 1), racePayoutShare(2, 2)], [0.65, 0.35]);
assert.deepEqual(
  [racePayoutShare(3, 1), racePayoutShare(3, 2), racePayoutShare(3, 3)],
  [0.6, 0.25, 0.15],
);

console.log(
  JSON.stringify({
    status: "pass",
    dailyChest: "utc-user-day",
    qr: "validated",
    performance: confidence.label,
    personalBest: pb,
    routeLifecycle: "DRAFT>OPEN>READY>ACTIVE>FINISHED",
    relay: "handoff-verified",
  }),
);

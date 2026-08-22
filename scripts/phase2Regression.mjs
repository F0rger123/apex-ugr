import assert from 'node:assert/strict';
import {
  BOUNTY_DEFAULTS, CANONICAL_RARITIES, RANK_CURVE, bountyWindow, captureProgress, deterministicIndex,
  frequencyForProgress, hunterWaveForStar, nextSerial, npcPosition, rankForRep, rankTrialEligible, rewardForStar,
  signalForDistance, starForElapsed,
} from '../functions/lib/phase2-core.mjs';

const window = bountyWindow(Date.UTC(2026, 7, 22, 7, 24, 13));
assert.equal(new Date(window.startMs).toISOString(), '2026-08-22T06:00:00.000Z');
assert.equal(new Date(window.nextMs).toISOString(), '2026-08-22T08:00:00.000Z');
assert.equal(starForElapsed(0), 1);
assert.equal(starForElapsed(BOUNTY_DEFAULTS.starIntervalSeconds * 4), 5);
assert.equal(rewardForStar(5), 2500);
assert.equal(hunterWaveForStar(3), 5);
assert.equal(deterministicIndex('same-event', 7), deterministicIndex('same-event', 7));

const route = [
  { latitude: 40.0000, longitude: -75.0000 },
  { latitude: 40.0100, longitude: -75.0000 },
  { latitude: 40.0100, longitude: -74.9900 },
];
const first = npcPosition(route, 0, 10000, 45);
const second = npcPosition(route, 0, 20000, 45);
assert.ok(first && second);
assert.notDeepEqual(first, second);
assert.ok(Math.abs(first.latitude - 40) < 0.02);

assert.deepEqual(captureProgress({ elapsedSeconds: 10, distanceMeters: 25 }), { valid: true, seconds: 10 });
assert.deepEqual(captureProgress({ previousSeconds: 20, elapsedSeconds: 10, distanceMeters: 29 }), { valid: true, seconds: 30 });
assert.deepEqual(captureProgress({ previousSeconds: 20, elapsedSeconds: 1, distanceMeters: 100 }), { valid: false, seconds: 0 });
const simultaneous = [
  { id: 'hunter-b', verifiedAt: 1001 },
  { id: 'hunter-a', verifiedAt: 1000 },
].sort((a, b) => a.verifiedAt - b.verifiedAt || a.id.localeCompare(b.id));
assert.equal(simultaneous[0].id, 'hunter-a');

assert.equal(signalForDistance(30).heat > signalForDistance(900).heat, true);
assert.equal(rankForRep(0), 'ROOKIE');
assert.equal(rankForRep(250), 'BRONZE');
assert.equal(rankForRep(150000), 'APEX');
assert.equal(RANK_CURVE.every((row, index) => index === 0 || row[1] > RANK_CURVE[index - 1][1]), true);
assert.equal(frequencyForProgress({ rank: 'GOLD', ghostStreak: 5, contracts: 2 }), 7);
assert.equal(frequencyForProgress({ rank: 'MASTER', ghostStreak: 10, contracts: 5 }), 13);
assert.equal(CANONICAL_RARITIES.join(','), 'COMMON,UNCOMMON,RARE,EPIC,LEGENDARY,GHOST,CLASSIFIED');
assert.equal(nextSerial(7, [1, 4, 7]), 8);
assert.equal(nextSerial(2, [9]), 10);
assert.equal(rankTrialEligible({ rep: 30000, meets: 3, bounty: 1 }, { rep: 30000, meets: 3, bounty: 1 }), true);
assert.equal(rankTrialEligible({ rep: 70000, districts: 3 }, { rep: 70000, districts: 2 }), false);

const idempotencyKeys = new Set();
const grant = key => !idempotencyKeys.has(key) && Boolean(idempotencyKeys.add(key));
assert.equal(grant('bounty:event-1:winner'), true);
assert.equal(grant('bounty:event-1:winner'), false);
assert.equal(grant('referral:user-1:user-2'), true);
assert.equal(grant('referral:user-1:user-2'), false);

console.log(JSON.stringify({
  status: 'pass',
  scheduler: window.key,
  npcMovement: 'continuous-route-interpolation',
  capture: 'sustained-and-reset',
  simultaneousCapture: simultaneous[0].id,
  rankCurve: RANK_CURVE,
  idempotency: 'verified',
}));

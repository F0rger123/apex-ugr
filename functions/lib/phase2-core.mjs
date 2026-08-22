export const BOUNTY_DEFAULTS = Object.freeze({
  cadenceHours: 2,
  eventDurationSeconds: 45 * 60,
  starIntervalSeconds: 8 * 60,
  captureRadiusMeters: 30,
  captureDurationSeconds: 30,
  signalRefreshSeconds: 7,
  blackoutDurationSeconds: 20,
  rewards: [0, 350, 560, 850, 1350, 2500],
  hunterWaves: [0, 1, 3, 5, 7, 10],
});

export const RANK_CURVE = Object.freeze([
  ['ROOKIE', 0], ['BRONZE', 250], ['SILVER', 1200], ['GOLD', 4200],
  ['PLATINUM', 12000], ['DIAMOND', 30000], ['MASTER', 70000], ['APEX', 150000],
]);

export const CANONICAL_RARITIES = Object.freeze(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'GHOST', 'CLASSIFIED']);

export function bountyWindow(nowMs, cadenceHours = BOUNTY_DEFAULTS.cadenceHours) {
  const cadenceMs = Math.max(1, cadenceHours) * 3600000;
  const startMs = Math.floor(nowMs / cadenceMs) * cadenceMs;
  return { startMs, nextMs: startMs + cadenceMs, key: `bounty-${Math.floor(startMs / 1000)}` };
}

export function starForElapsed(elapsedSeconds, intervalSeconds = BOUNTY_DEFAULTS.starIntervalSeconds) {
  return Math.min(5, Math.max(1, 1 + Math.floor(Math.max(0, elapsedSeconds) / Math.max(1, intervalSeconds))));
}

export function rewardForStar(star, rewards = BOUNTY_DEFAULTS.rewards) {
  return Number(rewards[Math.min(5, Math.max(1, star))] || rewards[1]);
}

export function hunterWaveForStar(star, waves = BOUNTY_DEFAULTS.hunterWaves) {
  return Number(waves[Math.min(5, Math.max(1, star))] || 1);
}

export function deterministicIndex(seed, length) {
  if (length <= 0) return -1;
  let hash = 2166136261;
  for (const char of String(seed)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) % length;
}

export function haversineMeters(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function directionBetween(a, b) {
  const angle = Math.atan2(b.longitude - a.longitude, b.latitude - a.latitude) * 180 / Math.PI;
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(((angle + 382.5) % 360) / 45)];
}

export function signalForDistance(distanceMeters) {
  const distanceMiles = distanceMeters / 1609.344;
  return {
    approxDistanceMiles: Math.max(0.1, Math.round(distanceMiles * 10) / 10),
    strength: Math.max(5, Math.min(100, Math.round(100 - Math.min(1, distanceMiles / 8) * 92))),
    heat: Math.max(0, Math.min(100, Math.round(100 - Math.min(1, distanceMeters / 1200) * 100))),
  };
}

export function captureProgress({ previousSeconds = 0, elapsedSeconds, distanceMeters, accuracyMeters = 0, sampleAgeSeconds = 0 }, config = BOUNTY_DEFAULTS) {
  const qualityAllowance = Math.min(25, Math.max(0, accuracyMeters) * 0.35);
  const valid = sampleAgeSeconds <= config.signalRefreshSeconds * 2 && distanceMeters <= config.captureRadiusMeters + qualityAllowance;
  return {
    valid,
    seconds: valid ? Math.min(config.captureDurationSeconds, Math.max(0, previousSeconds) + Math.max(0, elapsedSeconds)) : 0,
  };
}

export function pointAlongRoute(route, distanceMeters) {
  if (!Array.isArray(route) || route.length === 0) return null;
  if (route.length === 1) return { ...route[0], heading: 0, progress: 1 };
  const segments = [];
  let total = 0;
  for (let index = 1; index < route.length; index++) {
    const length = haversineMeters(route[index - 1], route[index]);
    segments.push({ from: route[index - 1], to: route[index], length });
    total += length;
  }
  let remaining = ((Math.max(0, distanceMeters) % Math.max(1, total)) + Math.max(1, total)) % Math.max(1, total);
  for (const segment of segments) {
    if (remaining <= segment.length) {
      const ratio = segment.length ? remaining / segment.length : 0;
      return {
        latitude: segment.from.latitude + (segment.to.latitude - segment.from.latitude) * ratio,
        longitude: segment.from.longitude + (segment.to.longitude - segment.from.longitude) * ratio,
        heading: bearingDegrees(segment.from, segment.to),
        progress: total ? (distanceMeters % total) / total : 0,
      };
    }
    remaining -= segment.length;
  }
  return { ...route[route.length - 1], heading: 0, progress: 1 };
}

export function npcPosition(route, startedAtMs, nowMs, speedKph) {
  const elapsedSeconds = Math.max(0, (nowMs - startedAtMs) / 1000);
  return pointAlongRoute(route, elapsedSeconds * Math.max(1, speedKph) / 3.6);
}

export function rankForRep(rep, curve = RANK_CURVE) {
  return [...curve].reverse().find(([, minimum]) => rep >= minimum)?.[0] || 'ROOKIE';
}

export function rankTrialEligible(requirements, metrics) {
  return Object.entries(requirements || {}).every(([key, required]) => Number(metrics?.[key] || 0) >= Number(required));
}

export function nextSerial(quantityMinted, existingSerials = []) {
  return Math.max(Number(quantityMinted || 0), ...existingSerials.map(Number).filter(Number.isFinite), 0) + 1;
}

export function frequencyForProgress({ rank, ghostStreak = 0, contracts = 0 }) {
  const rankIndex = RANK_CURVE.findIndex(([name]) => name === rank);
  if (rankIndex >= 6 && ghostStreak >= 10 && contracts >= 5) return 13;
  if (rankIndex >= 3 && ghostStreak >= 5 && contracts >= 2) return 7;
  return 1;
}

function bearingDegrees(a, b) {
  const rad = Math.PI / 180;
  const lat1 = a.latitude * rad;
  const lat2 = b.latitude * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) / rad + 360) % 360;
}

export const PERFORMANCE_TYPES = [
  "0-30",
  "0-60",
  "0-100",
  "30-60",
  "40-100",
  "60-130",
  "CUSTOM",
];
export const QR_TYPES = [
  "DRIVER",
  "VEHICLE",
  "CREW",
  "MEET",
  "BUILD",
  "PROFILE",
  "INVITE",
];

export function utcDay(value = Date.now()) {
  return new Date(value).toISOString().slice(0, 10);
}

export function performanceConfidence({
  accuracyM,
  sampleAgeMs,
  resultSeconds,
  topSpeedKph,
}) {
  const accuracy = Number(accuracyM),
    age = Number(sampleAgeMs),
    seconds = Number(resultSeconds),
    speed = Number(topSpeedKph);
  if (
    ![accuracy, age, seconds, speed].every(Number.isFinite) ||
    seconds <= 0 ||
    speed < 0
  )
    return { valid: false, label: "INVALID", score: 0 };
  if (accuracy > 65 || age > 5000 || seconds < 0.5 || speed > 500)
    return { valid: false, label: "REJECTED", score: 0 };
  const score = Math.max(
    0,
    Math.min(100, Math.round(100 - accuracy * 0.75 - age / 120)),
  );
  return {
    valid: true,
    label: score >= 80 ? "HIGH" : score >= 60 ? "MEDIUM" : "LOW",
    score,
  };
}

const PERFORMANCE_TARGET_KPH = {
  "0-30": [0, 48.2803],
  "0-60": [0, 96.5606],
  "0-100": [0, 160.9344],
  "30-60": [48.2803, 96.5606],
  "40-100": [64.3738, 160.9344],
  "60-130": [96.5606, 209.2147],
  CUSTOM: [0, 96.5606],
};

export function validatePerformanceTelemetry({
  runType,
  route,
  resultSeconds,
  topSpeedKph,
}) {
  const target = PERFORMANCE_TARGET_KPH[runType],
    samples = Array.isArray(route) ? route.slice(0, 5000) : [];
  if (!target || samples.length < 4)
    return { valid: false, reason: "At least four GPS samples are required." };

  const normalized = samples.map((sample) => ({
    latitude: Number(sample.latitude),
    longitude: Number(sample.longitude),
    speedKph: Number(sample.speedKph),
    timestamp: Number(sample.timestamp),
  }));
  if (
    normalized.some(
      (sample) =>
        ![
          sample.latitude,
          sample.longitude,
          sample.speedKph,
          sample.timestamp,
        ].every(Number.isFinite) ||
        Math.abs(sample.latitude) > 90 ||
        Math.abs(sample.longitude) > 180 ||
        sample.speedKph < 0 ||
        sample.speedKph > 500,
    )
  )
    return { valid: false, reason: "Telemetry contains invalid sensor values." };

  for (let index = 1; index < normalized.length; index += 1) {
    const previous = normalized[index - 1],
      current = normalized[index],
      deltaMs = current.timestamp - previous.timestamp;
    if (deltaMs <= 0 || deltaMs > 10_000)
      return { valid: false, reason: "Telemetry timestamps are not continuous." };
    const accelerationKphPerSecond =
      Math.abs(current.speedKph - previous.speedKph) / (deltaMs / 1000);
    if (accelerationKphPerSecond > 180)
      return { valid: false, reason: "Telemetry acceleration is not plausible." };
  }

  const [startKph, endKph] = target,
    startThreshold = startKph === 0 ? 4 : startKph,
    startIndex = normalized.findIndex(
      (sample) => sample.speedKph >= startThreshold,
    ),
    endIndex = normalized.findIndex(
      (sample, index) => index > startIndex && sample.speedKph >= endKph,
    );
  if (startIndex < 0 || endIndex < 0)
    return { valid: false, reason: "Telemetry does not cross the run thresholds." };
  if (startKph === 0 && normalized[0].speedKph > 12)
    return { valid: false, reason: "Standing-start telemetry began while moving." };

  const derivedSeconds =
      (normalized[endIndex].timestamp - normalized[startIndex].timestamp) / 1000,
    derivedTopSpeedKph = Math.max(
      ...normalized.slice(startIndex, endIndex + 1).map((sample) => sample.speedKph),
    ),
    claimedSeconds = Number(resultSeconds),
    claimedTopSpeed = Number(topSpeedKph);
  if (
    !Number.isFinite(claimedSeconds) ||
    Math.abs(claimedSeconds - derivedSeconds) > Math.max(0.75, derivedSeconds * 0.12)
  )
    return { valid: false, reason: "Claimed elapsed time does not match telemetry." };
  if (
    !Number.isFinite(claimedTopSpeed) ||
    Math.abs(claimedTopSpeed - derivedTopSpeedKph) > 8
  )
    return { valid: false, reason: "Claimed top speed does not match telemetry." };

  return {
    valid: true,
    samples: normalized,
    startIndex,
    endIndex,
    derivedSeconds: Number(derivedSeconds.toFixed(3)),
    derivedTopSpeedKph: Number(derivedTopSpeedKph.toFixed(3)),
  };
}

export function ghostSampleAtElapsed(route, elapsedMs) {
  const samples = Array.isArray(route) ? route : [];
  if (samples.length < 2) return null;
  const first = Number(samples[0].timestamp),
    target = first + Math.max(0, Number(elapsedMs) || 0);
  if (!Number.isFinite(first)) return null;
  let right = samples.findIndex((sample) => Number(sample.timestamp) >= target);
  if (right < 0) right = samples.length - 1;
  if (right === 0) return { ...samples[0], progress: 0 };
  const left = right - 1,
    a = samples[left],
    b = samples[right],
    span = Math.max(1, Number(b.timestamp) - Number(a.timestamp)),
    ratio = Math.max(0, Math.min(1, (target - Number(a.timestamp)) / span));
  return {
    latitude: Number(a.latitude) + (Number(b.latitude) - Number(a.latitude)) * ratio,
    longitude:
      Number(a.longitude) + (Number(b.longitude) - Number(a.longitude)) * ratio,
    speedKph: Number(a.speedKph) + (Number(b.speedKph) - Number(a.speedKph)) * ratio,
    timestamp: target,
    progress: Math.max(0, Math.min(1, right / (samples.length - 1))),
  };
}

export function personalBest(records, runType, vehicleId) {
  const matching = records
    .filter(
      (row) =>
        row.run_type === runType &&
        row.vehicle_id === vehicleId &&
        Number(row.result_seconds) > 0,
    )
    .sort((a, b) => Number(a.result_seconds) - Number(b.result_seconds));
  if (!matching.length)
    return { best: null, previous: null, improvement: null };
  const best = Number(matching[0].result_seconds),
    previous = matching[1] ? Number(matching[1].result_seconds) : null;
  return {
    best,
    previous,
    improvement:
      previous === null ? null : Number((previous - best).toFixed(3)),
  };
}

export function parseApexQr(payload) {
  const value = String(payload || "").trim();
  if (!value || value.length > 256) return null;
  const match = value.match(
    /^apex:\/\/(driver|vehicle|crew|meet|build|profile|invite)\/([A-Za-z0-9_-]{2,80})$/i,
  );
  if (!match) return null;
  const type = match[1].toUpperCase();
  return QR_TYPES.includes(type) ? { type, targetId: match[2] } : null;
}

export function routeRaceTransition(current, action) {
  const transitions = {
    DRAFT: { open: "OPEN", cancel: "CANCELLED" },
    OPEN: { ready: "READY", cancel: "CANCELLED" },
    READY: { start: "ACTIVE", cancel: "CANCELLED" },
    ACTIVE: { finish: "FINISHED" },
    FINISHED: {},
    CANCELLED: {},
  };
  return transitions[current]?.[action] || null;
}

export function relayHandoffEligible({
  legOrder,
  completedLegs,
  assignedUserId,
  callerUserId,
  distanceM,
  accuracyM,
}) {
  return (
    Number(legOrder) === Number(completedLegs) + 1 &&
    assignedUserId === callerUserId &&
    Number(distanceM) <= 45 &&
    Number(accuracyM) <= 50
  );
}

export function chestAvailable(lastClaimedDate, now = Date.now()) {
  return !lastClaimedDate || String(lastClaimedDate) !== utcDay(now);
}

export function racePayoutShare(totalEntrants, place) {
  const total = Math.max(1, Math.floor(Number(totalEntrants) || 1)),
    position = Math.max(1, Math.floor(Number(place) || 1));
  if (total === 1) return position === 1 ? 1 : 0;
  if (total === 2) return position === 1 ? 0.65 : position === 2 ? 0.35 : 0;
  return position === 1
    ? 0.6
    : position === 2
      ? 0.25
      : position === 3
        ? 0.15
        : 0;
}

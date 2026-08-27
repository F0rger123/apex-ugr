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

const CATEGORY_PREFIXES = [
  ["auth", "auth"], ["session", "auth"], ["profile", "profile"], ["v3/profile", "profile"],
  ["vehicles", "profile"], ["garage", "profile"], ["settings", "profile"],
  ["leaderboard", "leaderboard"], ["v3/leaderboards", "leaderboard"], ["map", "map"],
  ["world", "map"], ["location", "map"], ["routes", "route"], ["geocode", "route"], ["navigation", "route"], ["bounty", "bounty"],
  ["ghost-shop", "shop"], ["shop", "shop"], ["feed", "social"], ["posts", "social"],
  ["parts", "shop"], ["users", "social"], ["messages", "social"], ["notifications", "social"],
  ["meets", "meets"], ["v3/meets", "meets"], ["events", "meets"], ["cotw", "meets"],
  ["race", "race"], ["races", "race"], ["v3/race", "race"], ["performance", "race"],
];

export function apiCategory(path) {
  return CATEGORY_PREFIXES.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))?.[1] || "other";
}

export function safeEndpoint(path) {
  return `/${String(path || "")
    .split("/")
    .filter(Boolean)
    .map((segment) => /^[0-9a-f-]{20,}$/i.test(segment) || segment.length > 48 ? ":id" : segment)
    .join("/")}`;
}

export function safeErrorMessage(value) {
  return String(value || "unknown")
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [REDACTED]")
    .replace(/[A-Fa-f0-9]{64,}/g, "[REDACTED]")
    .slice(0, 240);
}

export function requestLog({ requestId, path, method, status, durationMs, errorCode = null, errorMessage = null, timestamp = new Date().toISOString() }) {
  return {
    event: "api_request",
    requestId,
    endpoint: safeEndpoint(path),
    category: apiCategory(path),
    method,
    status,
    durationMs: Math.max(0, Math.round(durationMs)),
    errorCode,
    ...(errorMessage ? { errorMessage: safeErrorMessage(errorMessage) } : {}),
    timestamp,
  };
}

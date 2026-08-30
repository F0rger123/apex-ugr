import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { apiCategory, requestLog, safeEndpoint, safeErrorMessage } from "../functions/lib/request-observability.mjs";

assert.equal(apiCategory("auth/signin"), "auth");
assert.equal(apiCategory("v3/leaderboards"), "leaderboard");
assert.equal(apiCategory("routes/navigate"), "route");
assert.equal(apiCategory("bounty/sessions/abc"), "bounty");
assert.equal(apiCategory("unknown"), "other");
assert.equal(safeEndpoint("bounty/sessions/12cf829d-7564-43ee-9857-f4cedeca120d/claim"), "/bounty/sessions/:id/claim");
const log = requestLog({ requestId: "req-1", path: "profile/private-user-identifier-that-is-longer-than-forty-eight-characters", method: "GET", status: 403, durationMs: 12.7, errorCode: "FORBIDDEN" });
assert.equal(log.durationMs, 13);
assert.equal(log.endpoint, "/profile/:id");
assert.equal(JSON.stringify(log).includes("password"), false);
assert.equal(safeErrorMessage(`Bearer ${"a".repeat(80)} failed`), "Bearer [REDACTED] failed");

const root = resolve(import.meta.dirname, ".."),
  app = readFileSync(resolve(root, "App.tsx"), "utf8"),
  v2 = readFileSync(resolve(root, "src/v2/ApexDesignPreview.tsx"), "utf8"),
  workflow = readFileSync(resolve(root, ".github/workflows/android-apk.yml"), "utf8");
assert.match(app, /<AppErrorBoundary><ApexDesignPreview \/><\/AppErrorBoundary>/);
for (const alias of ["/app/race", "/app/leaders", "/app/leaderboard", "/app/leaderboards", "/app/meets", "/app/social", "/app/parts"]) {
  assert.ok(v2.includes(`pathTabs['${alias}']`), `Missing legacy route alias ${alias}`);
}
assert.match(v2, /<FlatList data=\{posts\}/);
assert.match(workflow, /aws s3 cp apex-ugr\.apk/);
assert.match(workflow, /android-release\/promote/);
assert.doesNotMatch(workflow, /--data-binary @apex-ugr\.apk/);

console.log("Phase 4 observability regression passed.");

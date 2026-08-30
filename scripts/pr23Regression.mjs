import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");
const api = read("functions/api/[[path]].ts");
const garage = read("src/v2/ApexDesignPreview.tsx");
const store = read("src/v2/live/contentStore.ts");
const migration = read("migrations/0025_mobile_garage_disclaimer.sql");

assert.match(migration, /vehicle_type TEXT NOT NULL DEFAULT 'CAR'/);
assert.match(migration, /user_disclaimer_acceptances/);
assert.match(migration, /installed_at TEXT/);
assert.match(api, /CURRENT_SAFETY_DISCLAIMER_VERSION/);
assert.match(api, /path === "disclaimer" && method === "GET"/);
assert.match(api, /path === "disclaimer\/accept" && method === "POST"/);
assert.match(api, /vehicleType === "MOTORCYCLE"/);
assert.match(api, /displacement_cc/);
assert.match(api, /Accept-Ranges", "bytes"/);
assert.match(api, /Content-Range/);
assert.match(api, /digital_twin_status='ready'/);
assert.match(api, /FROM vehicles WHERE id=\? AND user_id=\?/);
assert.match(store, /vehicleType:'CAR'\|'MOTORCYCLE'/);
assert.match(garage, /MOTORCYCLE/);
assert.match(garage, /BUILD PLANNER/);
console.log("PR #23 mobile, vehicle, disclaimer, digital-twin, and range regressions passed.");

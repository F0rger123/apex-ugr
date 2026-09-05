import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

const app = read("src/v2/ApexDesignPreview.tsx");
const liveStore = read("src/v2/live/liveNetworkStore.ts");
const units = read("src/v2/utils/units.ts");
const packageJson = JSON.parse(read("package.json"));
const appJson = JSON.parse(read("app.json"));

assert.equal(packageJson.version, "1.5.4");
assert.equal(appJson.expo.version, "1.5.4");
assert.equal(appJson.expo.android.versionCode, 19);
assert.match(app, /const APP_VERSION='1\.5\.4'/);
assert.match(app, /const ANDROID_VERSION_CODE=19/);

assert.doesNotMatch(app, /function VaporStory/);
assert.doesNotMatch(app, /WELCOME RACER/);
assert.doesNotMatch(app, /YOUR CITY IS STILL SLEEPING/);
assert.doesNotMatch(app, /THE GRID REMEMBERS EVERY ROAD/);
assert.match(app, /function PlayTransition\(\{onComplete\}:\{onComplete:\(\)=>void\}\)/);
assert.match(app, /resizeMode=\{ResizeMode\.COVER\}/);
assert.doesNotMatch(app, /<PlayTransition carName=/);
assert.doesNotMatch(app, /styles\.playTransitionCar\}>\{carName/);

assert.match(units, /export function normalizeSpeedUnit/);
assert.match(units, /export function formatSpeed/);
assert.match(units, /export function formatDistance/);
assert.match(app, /setUnitPreference\(normalizeSpeedUnit\(settings\.unit_preference\)\)/);
assert.match(app, /formatSpeed\(driver\.speedKph,unit\)/);
assert.match(app, /formatDistance\(kilometers,unit\)/);
assert.match(liveStore, /const UNIT_KEY='apex\.speed-unit'/);
assert.match(liveStore, /setUnitPreference:\(unit:SpeedUnit\)=>void/);
assert.match(liveStore, /AsyncStorage\.setItem\(UNIT_KEY,next\)/);

assert.match(liveStore, /const LOCATION_MAX_AGE_MS=15\*60_000/);
assert.match(liveStore, /const REVEAL_ORIGIN_MAX_AGE_MS=24\*60\*60_000/);
assert.match(liveStore, /isFreshCoordinate\(parsed,LOCATION_MAX_AGE_MS\)/);
assert.match(liveStore, /isFreshCoordinate\(parsed,REVEAL_ORIGIN_MAX_AGE_MS\)/);
assert.match(liveStore, /AsyncStorage\.removeItem\(LOCATION_KEY\)/);
assert.match(liveStore, /AsyncStorage\.removeItem\(REVEAL_ORIGIN_KEY\)/);

assert.match(app, /lastFollowRevisionRef/);
assert.match(app, /const firstLock=lastFollowRevisionRef\.current!==followRevision/);
assert.match(app, /firstLock\?\{center:\{latitude:location\.latitude,longitude:location\.longitude\},pitch:42,heading:location\.heading\|\|0,zoom:16\}:\{center:\{latitude:location\.latitude,longitude:location\.longitude\},heading:location\.heading\|\|0\}/);
assert.doesNotMatch(app, /animateCamera\(\{center:\{latitude:location\.latitude,longitude:location\.longitude\},zoom:17/);

console.log("Physical Android QA source regressions passed.");

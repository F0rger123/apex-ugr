import assert from "node:assert/strict";
import {
  ANDROID_LATEST_POINTER_KEY,
  immutableAndroidReleaseKey,
  validateAndroidReleaseMetadata,
} from "../functions/lib/android-release-core.mjs";

const release = {
  version: "1.5.4",
  versionCode: 19,
  commit: "96d98a85c4ac81b74b7560231484c796228d6a0f",
  sha256: "a".repeat(64),
  size: 105_916_330,
  signingFingerprint: "AA:BB:CC:DD",
  uploadedAt: "2026-08-28T12:00:00.000Z",
};
release.objectKey = immutableAndroidReleaseKey(release);

assert.equal(release.objectKey, `android/releases/1.5.4/19/${"a".repeat(64)}/apex-ugr.apk`);
assert.equal(validateAndroidReleaseMetadata(release).objectKey, release.objectKey);
assert.equal(ANDROID_LATEST_POINTER_KEY, "android/releases/latest.json");
assert.throws(() => validateAndroidReleaseMetadata({ ...release, objectKey: "releases/apex-ugr-latest.apk" }), /not immutable/);
assert.throws(() => validateAndroidReleaseMetadata({ ...release, sha256: "bad" }), /SHA-256/);
assert.throws(() => validateAndroidReleaseMetadata({ ...release, size: 0 }), /size/);
assert.throws(() => validateAndroidReleaseMetadata({ ...release, commit: "main" }), /commit/);

console.log("Android release metadata regression passed.");

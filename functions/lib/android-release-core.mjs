export const ANDROID_LEGACY_RELEASE_KEY = "releases/apex-ugr-latest.apk";
export const ANDROID_LATEST_POINTER_KEY = "android/releases/latest.json";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/;

export function immutableAndroidReleaseKey(metadata) {
  return `android/releases/${metadata.version}/${metadata.versionCode}/${metadata.sha256}/apex-ugr.apk`;
}
export function validateAndroidReleaseMetadata(value) {
  if (!value || typeof value !== "object") throw new Error("Release metadata is required.");
  const metadata = {
    version: String(value.version || "").trim(),
    versionCode: Number(value.versionCode),
    commit: String(value.commit || "").trim().toLowerCase(),
    sha256: String(value.sha256 || "").trim().toLowerCase(),
    size: Number(value.size),
    signingFingerprint: String(value.signingFingerprint || "").trim(),
    uploadedAt: String(value.uploadedAt || "").trim(),
    objectKey: String(value.objectKey || "").trim(),
  };
  if (!VERSION_PATTERN.test(metadata.version)) throw new Error("Invalid Android version.");
  if (!Number.isSafeInteger(metadata.versionCode) || metadata.versionCode < 1) throw new Error("Invalid Android version code.");
  if (!COMMIT_PATTERN.test(metadata.commit)) throw new Error("Invalid release commit.");
  if (!SHA256_PATTERN.test(metadata.sha256)) throw new Error("Invalid APK SHA-256.");
  if (!Number.isSafeInteger(metadata.size) || metadata.size < 1024) throw new Error("Invalid APK size.");
  if (!metadata.signingFingerprint) throw new Error("Signing fingerprint is required.");
  if (!Number.isFinite(Date.parse(metadata.uploadedAt))) throw new Error("Invalid upload timestamp.");
  if (metadata.objectKey !== immutableAndroidReleaseKey(metadata)) throw new Error("APK object key is not immutable or does not match its metadata.");
  return metadata;
}

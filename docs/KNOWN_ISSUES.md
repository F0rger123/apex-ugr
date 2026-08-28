# Apex UGR Known Issues

## Device Verification

- No Android SDK, emulator, ADB target, or physical Android device is available in the current Phase 4 environment.
- Physical GPS, heading, speed jitter, rerouting, arrival, camera, QR, and native haptics are not physical-device verified.

## Toolchain

- Expo SDK 51 / React Native 0.74 remains intentionally unchanged in this PR. `expo-doctor` passes 17/17 checks, while `npm audit --omit=dev` reports 35 transitive findings that require a coordinated major Expo upgrade. Track in Issue #16.
- `expo-av` video migration must be evaluated during the SDK upgrade rather than mixed into production hardening.

## Production Integrations

- eBay Browse behavior remains credential-dependent and was not revalidated with live provider credentials in this pass.
- Convoy live voice is not implemented. It must not be represented as live until signaling, SFU, permissions, moderation, and mobile background behavior are shipped.
- The direct-R2 Android pipeline requires configured scoped R2 credentials and must complete a validation workflow before Issue #17 can close.

## Load Evidence

- Production currently has too little social content to prove 20/50/100-post device performance. The feed is virtualized and off-screen players unload, but native memory behavior still needs emulator/device fixtures.
- Current V2 remains concentrated in two large mounted files. Phase 4 avoided a risky broad extraction; future extractions should follow feature boundaries with regression coverage.

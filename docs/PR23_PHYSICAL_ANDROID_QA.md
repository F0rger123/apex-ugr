# PR #23 Physical Android QA

This checklist is for the isolated PR #23 Android QA APK. Do not use it to validate production promotion.

## Environment

- APK version: 1.5.3
- Android versionCode: 18
- Expected API: `https://apex-ugr-pr23-qa.pages.dev`
- Expected backend: QA D1, not Production D1
- Public production APK must remain unchanged during this QA pass.

## Install / Update

- Install the QA APK on a physical Android phone.
- Launch the app from a cold start.
- Update over any previous QA APK if present.
- Confirm the app opens without a white screen or immediate crash.

## Access

- Enter the runtime access code provided for QA.
- Confirm valid code unlocks the access screen.
- Confirm invalid code shows a red error/glitch state and does not unlock.
- Create or sign in to a disposable QA account only.

## Intro

- Confirm the unlock transition completes.
- Confirm the intro/play screen appears.
- Press Play and confirm the app enters the main experience.
- Confirm video or animated transition does not cut off early.

## HUD / Daily Chest

- Open HUD / Command.
- Confirm the daily chest appears when eligible.
- Open or claim the daily chest if eligible.
- Confirm the reward and notification state updates.

## Garage

- Open Garage.
- Add or edit a vehicle.
- Confirm make/model/trim/horsepower fields work.
- Confirm horsepower slider works.
- Confirm saved vehicle persists after app restart.

## Build Planner

- Open Parts / Build Planner.
- Confirm active vehicle is shown.
- Search parts.
- Confirm results are tied to the selected vehicle and do not show generic mock catalog items.
- Save/sync a part to the garage.

## Disclaimer

- Open Bounty or Driver Mode where the safety disclaimer is required.
- Confirm the user must accept responsibility before opt-in participation.
- Confirm acceptance persists for the QA account.

## Map Startup

- Open Map / World.
- Grant location permission.
- Confirm the current user marker appears as a green YOU marker.
- Confirm ghost cache and player tags use the green Apex marker treatment.

## Map Flicker / Free / Follow / Heading

- Press Center Me.
- Confirm the control changes to Locked On.
- Move or simulate motion if available and confirm the map follows while locked.
- Press it again.
- Confirm it changes to Unlocked and the map no longer snaps back while zooming or panning.
- Zoom in and out repeatedly and note any flicker, reloads, or delayed fog redraw.
- Switch Street and Satellite modes and confirm markers remain green in both.

## GPS / Speed

- Start Driver Mode.
- Confirm GPS permission, accuracy, speed, heading, and sample age appear in QA Diagnostics.
- Confirm speed is not simulated.
- Complete or stop the drive and confirm route/drive summary is recorded where available.

## Ghost Cache

- Tap a green ghost cache.
- Confirm the detail popup opens.
- Confirm the popup asks whether to drive to it.
- Confirm GO creates a route to the cache.
- Claim only if physically eligible and safe.

## Navigation

- Search for a nearby real address, business, city, or landmark.
- Select a result.
- Press GO.
- Confirm the map draws a route line.
- Confirm ETA and distance appear.
- Start route navigation / Driver Mode.
- Confirm turn-by-turn instruction text appears and updates while driving.
- Add route stops.
- Reorder route stops.
- Remove route stops.
- Save a destination with a custom nickname.
- Restart the app and confirm saved route/place state persists.

## Leaders

- Open Leaderboards.
- Confirm real leaderboard rows load from the backend.
- Confirm rank/REP/driver card surfaces display correctly.

## Shop / Profile

- Open Ghost Shop.
- Confirm categories load.
- Preview, purchase, and equip a low-cost QA item if the disposable account has enough Ghost Credits.
- Confirm Ghost Credits decrease and ledger entry appears.
- Open Profile.
- Confirm equipped frame/card/banner/badges appear.
- Edit profile fields and confirm persistence.

## Social

- Open Social feed.
- Upload a photo.
- Upload a video if available.
- Add a caption.
- Like and comment on a post.
- Confirm state persists after reload.

## Camera / QR

- Open camera or QR scanner entry points.
- Grant camera permission.
- Confirm the scanner opens and can be closed without freezing.

## Haptics

- Confirm keypad taps, unlock success/error, primary controls, and shop/profile actions provide haptic feedback on device when enabled.
- Disable haptics in Settings and confirm the app stops vibrating.

## QA Diagnostics

- Sign in as a developer QA account.
- Open More -> QA Diagnostics.
- Confirm build, API base, QA D1, QA R2, GPS, map counters, network health, and media diagnostics are visible.
- Press Copy Diagnostics.
- Confirm copied diagnostics redact latitude and longitude.

## Bug Report Format

Use this format for every physical-device issue:

```text
Title:
Device:
Android version:
APK version/versionCode:
QA account:
Screen/path:
Steps:
Expected:
Actual:
Frequency:
Screenshot/video:
Copied diagnostics:
Network state:
GPS permission/accuracy:
Notes:
```

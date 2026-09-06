# Apex UGR Android Device QA

**Release under test:** 1.5.2 (versionCode 17)
**Production:** https://apex-ugr.pages.dev
**Status:** NOT DEVICE VERIFIED until a tester records a result on a physical Android phone.

## Before You Start

1. Install the APK from `Settings > About > Download Android APK`, or use the production download link.
2. Connect to a stable network and enable precise location before testing GPS, navigation, driving, races, or Bounty.
3. Do not test moving-driving workflows on public roads. Use a safe, legal location and a passenger to operate the phone.
4. In `Settings > Device QA`, turn on **GPS Debug Overlay** and use **Copy Diagnostics** whenever a GPS, speed, routing, or network test fails. It copies no exact coordinates or credentials.

## Install / Update

| Action | Expected result | What to record if it fails |
| --- | --- | --- |
| Install the current APK. | Installation completes and Apex UGR launches. | Android version, install error, screenshot. |
| Install over the previous Apex build. | It updates in place and preserves the session/data. | Previous app version, whether Android asked to uninstall, session state. |
| Open the APK download button. | It downloads the current 1.5.2 / code 17 APK. | Browser, displayed file name/size, screenshot. |

## Access

| Action | Expected result | What to record if it fails |
| --- | --- | --- |
| Open the secret access screen and enter a valid numeric invite code. | The credential transition completes and account access opens. | Code status only, animation/result, screenshot. |
| Enter an invalid code. | A red error/glitch response appears and access remains locked. | Exact message, screenshot. |
| Sign in, close the app, and reopen it. | The session remains active. | Account state before/after reopen. |
| Use **Lock Yourself Out**. | The account signs out and returns to access. | Exact result and screenshot. |

## HUD

| Action | Expected result | What to record if it fails |
| --- | --- | --- |
| Scroll and press each HUD control. | Controls remain reachable, do not overlap, and respond once. | Screen, control label, screenshot/video. |
| Check rank, Ghost Credits, Daily Chest, Bounty countdown, and Car of the Week. | Current server-backed values render without a stuck loader. | Missing/incorrect panel and diagnostics. |

## Map / GPS

| Action | Expected result | What to record if it fails |
| --- | --- | --- |
| Grant precise location on Map. | Your green marker appears at the current position. | Permission state, marker behavior, copied diagnostics. |
| Walk a short safe distance. | Marker updates smoothly; heading/speed update when GPS supplies them. | GPS accuracy, sample age, video. |
| Toggle map follow mode. | Locked mode follows you; unlocked mode lets you explore. | Button result and map behavior. |
| Switch Street and Satellite. | Markers, caches, and routes remain visible. | Map style and missing layer. |
| Open Ghost Frequency, Safe Houses, Ghost Caches, and Bounty markers. | Each opens the related detail/action surface. | Marker type, action, screenshot. |

## Navigation

| Action | Expected result | What to record if it fails |
| --- | --- | --- |
| Search a nearby destination and select a result. | A resolved destination is shown. | Query, result list, error. |
| Press GO / build route. | Route line, ETA, distance, and destination appear. | Destination, message, copied diagnostics. |
| Add, reorder, and remove stops. | Route recalculates after each change. | Stop order and before/after screenshot. |
| Start navigation in a safe legal setting. | Next-turn instruction, remaining distance, ETA, and route progress show. | Instruction, route step, GPS accuracy. |
| Safely deviate from the route. | The route recalculates rather than becoming stuck. | What changed and timing. |
| Reach the destination. | Arrival is shown and route can be ended. | Final route state. |

## Speed / Driver Mode

| Action | Expected result | What to record if it fails |
| --- | --- | --- |
| Start Driver Mode while stationary. | Display speed stays near zero without large jitter. | Raw/display speed and accuracy. |
| Test a safe low-speed and passenger-observed 20–40 mph segment. | Speed updates responsively and plausibly. | Vehicle reference speed, raw/display speed, sample age. |
| Temporarily lose and recover GPS in a safe setting. | App signals GPS state and recovers without crashing. | Permission/state and copied diagnostics. |
| End the drive. | Summary includes distance, top speed, trace, and session stats. | Missing fields and screenshot. |

## Race

| Action | Expected result | What to record if it fails |
| --- | --- | --- |
| Open Solo Performance and configure a legal private-course run. | Consent and run setup are clear. | Screen and unavailable control. |
| Complete a permitted 0–60/route/relay test. | Timer/checkpoints save a result once and update PB where applicable. | Run type, result, GPS diagnostics. |

## Bounty

| Action | Expected result | What to record if it fails |
| --- | --- | --- |
| Opt in, accept the safety agreement, and enter Driver Mode at an authorized venue. | Bounty state, countdown, and eligibility are clear. | Timer state and screenshot. |
| Observe an event with insufficient players. | Labeled NPC target/hunter fallback may appear; spectators can watch. | Event ID/time and visible actors. |
| Join as eligible hunter/target in a controlled test. | Countdown progresses automatically; no manual sync is needed. | Role, timer, network/GPS diagnostics. |
| Test a controlled sustained proximity or escape. | Only one outcome is granted; rewards and stats update once. | Roles, time, outcome, screenshots. |

## Garage / Shop / Social / Profile

| Area | Action | Expected result | What to record if it fails |
| --- | --- | --- | --- |
| Garage | Add/edit vehicle, select active car, add photo/mod. | Saved data reappears after refresh. | Vehicle/model, action, screenshot. |
| Shop | Preview an affordable item, purchase, equip, reload. | Balance, ledger, ownership, and visible cosmetic update. | Item, price, balance before/after. |
| Social | Scroll feed, upload permitted photo/video, play/pause/seek, like/comment/save/follow. | Media and actions respond; keyboard does not hide composer. | Post/action, media type, screenshot. |
| Profile | Open stats, Apex ID, cars, records, badges, seasons, social, milestones. | Data and equipped cosmetics render consistently. | Missing card/incorrect value. |

## Leaders / Meets / Convoy

| Action | Expected result | What to record if it fails |
| --- | --- | --- |
| Change leaderboard scope and open a driver profile. | Board changes and profile opens. | Selected scope and result. |
| Open/create a meet, view map/detail/check-in/voting. | Available actions work and clear server feedback is shown. | Meet ID/title and action. |
| Create/join a convoy. | Roles, route, regroup, and recap render as available. | Convoy status. |
| Inspect convoy radio. | It never claims live voice transport if the feature is unavailable. | Exact misleading wording. |

## QR / Camera / Notifications

| Action | Expected result | What to record if it fails |
| --- | --- | --- |
| Grant camera permission and scan a valid/invalid/malformed Apex QR. | Valid code routes correctly; invalid inputs show a useful error. | QR type and result. |
| Capture a vehicle photo with Apex Camera. | Camera overlay works and photo can save/share where enabled. | Permission state and screenshot. |
| Test haptics, sound, notification prompt, and reduced motion. | Preferences are respected. | Device settings and behavior. |

## Bug Report Template

```text
DEVICE:
ANDROID VERSION:
APP VERSION / VERSION CODE:
SCREEN:
ACTION:
EXPECTED:
ACTUAL:
REPRODUCIBLE: Always / Sometimes / Once
SCREENSHOT OR VIDEO:
GPS ACCURACY:
NETWORK:
COPIED DIAGNOSTICS:
NOTES:
```

Do not include passwords, invite codes, access tokens, or exact private coordinates in a report.

# Apex UGR QA Acceptance

## Release Gate

1. Run type-check, web export, Pages Functions build, Phase 2/3/4 regressions, invite regression, migration rehearsals, and the live-OSRM navigation regression.
2. Exercise all eight primary destinations at 390x844 and at least one narrow 320px pass.
3. Confirm no horizontal document overflow, bottom-navigation obstruction, blank screen, or unbounded loader.
4. Build and verify the signed Android package before immutable R2 upload.
5. Promote the latest pointer only after R2 HEAD and downloaded SHA-256 verification.

## Critical Workflows

- Access: valid, invalid, expired, disabled, exhausted, and concurrent final redemption.
- Daily Chest: visible, multi-tap, one grant per UTC day, reload-safe.
- Shop: catalog, requirement, buy, ledger, inventory, equip, visible change, reload.
- Map: GPS marker, search, route, steps, stops, Driver Mode, reroute, arrival, and persistence.
- Bounty: two-hour schedule, all-user notification, opt-in, human-first role assignment, labeled NPC fallback, spectator visibility, offer, join, live one-second countdown, automatic server escalation without manual sync, claim/escape exclusivity, rewards, and reload.
- Race: consent, telemetry validation, PB, route checkpoints, relay handoff, and one-time payout.
- Social: 1, 20, 50, and 100-post fixtures; one active video; pause/unmount off-screen media.
- Profile: privacy, rank, vehicles, records, badges, milestones, Bounty, seasons, and social.

## Evidence Labels

`WEB VERIFIED`, `EMULATOR VERIFIED`, and `PHYSICAL DEVICE VERIFIED` are separate claims. Simulated location or browser geolocation never qualifies as physical GPS verification.

# Apex UGR Production Feature Audit

Canonical runtime: `App.tsx` mounts `src/v2/ApexDesignPreview.tsx`. Production services are Cloudflare Pages Functions, D1, and R2. Files under `src/navigation`, `src/screens`, and most `src/stores` belong to the unmounted legacy Supabase application and are not evidence of production functionality.

Status vocabulary is intentionally restricted to the requested values. `WORKING` requires an exercised user workflow. Build success alone is not runtime evidence.

| FEATURE | UI EXISTS | VISIBLE TO USER | CORRECT LOCATION | BACKEND | DATABASE | REAL DATA | PERSISTENT | CLICKABLE | ERROR HANDLING | WEB TESTED | ANDROID TESTED | STATUS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Secret access gate | Yes | Yes | Yes | Pages Function | invite_codes | Yes | D1 | Yes | Yes | Yes | No device | WORKING |
| Access-code validation without consumption | Yes | Yes | Yes | Pages Function | invite_codes | Yes | D1 | Yes | Yes | Yes | No device | WORKING |
| Signup invite redemption | Yes | Yes | Yes | Pages Function | invite_codes, invite_redemptions | Yes | D1 | Yes | Yes | Yes | No device | WORKING |
| Existing account sign-in | Yes | After gate | Yes | Pages Function | users, sessions | Yes | D1 | Yes | Yes | Yes | No device | WORKING |
| Sign out / Lock Yourself Out | Yes | Profile and Settings | Yes | Pages Function | sessions | Yes | D1 | Yes | Yes | Yes | No device | WORKING |
| Child invite creation/sharing | Yes | Yes | Profile/Access | Pages Function | invite_codes | Yes | D1 | Yes | Yes | Yes | No device | WORKING |
| HUD identity/rank/credits | Yes | Yes | Yes | Pages Function | users, ghost_profiles | Yes | D1 | Yes | Partial | Yes | No device | PARTIAL |
| Daily Ghost Chest | Yes | Yes | HUD | Pages Function | daily_ghost_chests, claims, ledger | Yes | D1 | Yes | Yes | Yes | No device | WORKING |
| Notifications center | Yes | Yes | Global header | Pages Function | notifications | Yes | D1 | Yes | Partial | Yes | No device | PARTIAL |
| Garage vehicles | Yes | Yes | Garage | Pages Function | vehicles | Yes | D1/R2 | Yes | Yes | Yes | No device | WORKING |
| Vehicle photo upload | Yes | Yes | Garage | Pages Function/R2 | vehicles | Yes | D1/R2 | Yes | Yes | Partial | No device | PARTIAL |
| Multi-angle digital capture | Yes | Yes | Garage | Pages Function/R2 | vehicle_angles | Yes | D1/R2 | Yes | Yes | Partial | No device | PARTIAL |
| Vehicle Mod Sync planner | Yes | Yes | Garage | Pages Function | mod_wishlist | Yes | D1 | Yes | Yes | Yes | No device | WORKING |
| Vehicle-specific parts search | Yes | Yes | Garage/Parts | Pages Function | vehicle profile | Provider results | Vehicle D1 | Yes | Yes | Partial | No device | PARTIAL |
| eBay Browse inventory | Yes | Conditional | Garage/Parts | Pages Function | None | Provider data | No catalog cache | Yes | Yes | Not credential tested | No device | NOT TESTABLE |
| Digital Ghost Shop | Yes | Yes | Shop | Pages Function | shop, inventory, ledger | Yes | D1 | Yes | Yes | Yes | No device | WORKING |
| Ghost Shop purchase | Yes | Yes | Shop | Pages Function | orders, inventory, ledger | Yes | D1 | Yes | Yes | Yes | No device | WORKING |
| Cosmetic equip/unequip | Yes | Yes | Shop/Profile preview | Pages Function | equipped items | Yes | D1 | Yes | Yes | Yes | No device | WORKING |
| Server shop rotation timer | Yes | Yes | Shop | Pages Function | shop availability | Yes | D1 | Yes | Yes | Yes | No device | PARTIAL |
| Inventory administration | No | No | Admin only | Partial API | shop tables | Yes | D1 | No | N/A | No | No | NOT IMPLEMENTED |
| Map base layer | Yes | Yes | Map | Leaflet/native maps | None | Live tiles | Session | Yes | Yes | Yes | No device | WORKING |
| Street/satellite switching | Yes | Yes | Map | Client | Settings D1 | Live tiles | D1 after migration 0020 | Yes | Yes | Yes | No device | PARTIAL |
| Current-user green marker | Yes | Yes | Map | GPS/client overlay | driver_locations | GPS | D1/session | Yes | Yes | Yes | No device | PARTIAL |
| Other eligible green markers | Yes | When active | Map | Pages Function | driver_locations | Yes | D1 | Yes | Yes | Local fixture | No device | PARTIAL |
| Driver marker profile/follow | Yes | When drivers active | Map | Pages Function | users, vehicles, locations | Yes | D1 | Yes | Yes | Local fixture | No device | PARTIAL |
| Location search | Yes | Yes | Map | Pages Function | None | Nominatim | No | Yes | Yes | Yes | No device | WORKING |
| Single-stop routing | Yes | Yes | Map | Pages Function | saved routes | OSRM | AsyncStorage/D1 | Yes | Yes | Yes | No device | WORKING |
| Multi-stop routing | Yes | Yes | Map | Pages Function | saved routes | OSRM | AsyncStorage/D1 | Yes | Yes | Yes | No device | WORKING |
| Turn-by-turn steps | Yes | Yes | Map/Driver Mode | Pages Function | route session | OSRM steps | AsyncStorage | Yes | Yes | Simulation | No device | NOT TESTABLE |
| Saved places and nicknames | Yes | Yes | Map | Pages Function | saved_places | Yes | D1 | Yes | Yes | Yes | No device | WORKING |
| Saved routes lifecycle | Yes | Yes | Map | Pages Function | saved_routes | Yes | D1 | Yes | Yes | Partial | No device | PARTIAL |
| Driver Mode GPS tracking | Yes | Yes | Map | Pages Function | drive sessions/traces | GPS | D1/local | Yes | Yes | Simulation | No device | NOT TESTABLE |
| End-of-drive summary | Yes | After drive | Map/HUD | Pages Function | drive sessions | GPS | D1/local | Yes | Yes | Simulation | No device | NOT TESTABLE |
| Ghost Cache markers/details | Yes | When active | Map | Pages Function | map_rewards | Yes | D1 | Yes | Yes | Local fixture | No device | PARTIAL |
| Ghost Cache route/claim | Yes | When eligible | Map | Pages Function | reward claims, ledger | Yes | D1 | Yes | Yes | Local fixture | No device | PARTIAL |
| Safe Houses | Yes | Yes | Map/World | Pages Function | safe_houses | Yes | D1 | Yes | Yes | Partial | No device | PARTIAL |
| Fog/exploration | Yes | Yes | Map | Pages Function/client | map_discoveries | GPS-derived | D1 | Passive | Partial | Simulation | No device | NOT TESTABLE |
| Ghost trails/replays | Yes | When drives exist | Map | Pages Function | drive traces | GPS-derived | D1 | Yes | Partial | Simulation | No device | NOT TESTABLE |
| Dead Drops | Yes | When active | Map/World | Pages Function | drops, claims | Yes | D1 | Yes | Yes | Partial | No device | PARTIAL |
| Road safety reports | Yes | Yes | Map/World | Pages Function | road_reports | User data | D1 | Yes | Yes | Partial | No device | PARTIAL |
| Bounty opt-in/consent | Yes | Yes | Map/Bounty | Pages Function | bounty settings | Yes | D1 | Yes | Yes | Yes | No device | WORKING |
| Bounty activation | Yes | Eligible Driver Mode | Map/Bounty | Pages Function | bounty sessions | Yes | D1 | Yes | Yes | Two-user local | No device | WORKING |
| Bounty search signal | Yes | Eligible hunters | Map/Bounty | Pages Function | participants | Approximate | D1 | Yes | Yes | Two-user local | No device | WORKING |
| Bounty claim/escape | Yes | Active session | Map/Bounty | Pages Function | sessions, stats, ledger | Yes | D1 | Yes | Yes | Two-user local | No device | WORKING |
| Five-star escalation | Yes | Active target | Map/Bounty | Pages Function | sessions | Yes | D1 | Yes | Yes | Local lifecycle | No device | WORKING |
| Most Wanted | Yes | Yes | Map/Bounty | Pages Function | bounty sessions | Privacy-safe | D1 | Yes | Yes | Local lifecycle | No device | WORKING |
| Race challenge inbox | Yes | Yes | Race | Pages Function | race tables | Yes | D1 | Yes | Yes | Partial | No device | PARTIAL |
| Race accept/decline/reschedule | Yes | Yes | Race | Pages Function | race tables | Yes | D1 | Yes | Yes | Partial | No device | PARTIAL |
| Route and relay races | Yes | Yes | Race | Pages Function | race entries/checkpoints | GPS-derived | D1 | Yes | Yes | Simulation only | No device | NOT TESTABLE |
| Solo performance timers | Yes | Yes | Race | Client/Pages Function | performance records | GPS-derived | D1 | Yes | Partial | Simulation only | No device | NOT TESTABLE |
| Leaderboards | Yes | Yes | Primary Leaderboards | Pages Function | users/results | Yes | D1 | Yes | Yes | Yes | No device | WORKING |
| Specialized leaderboard boards | Five boards | Yes | Leaderboards | Pages Function | users/results | Yes | D1 | Yes | Yes | Yes | No device | PARTIAL |
| Meets list/details | Yes | Yes | Primary Meets | Pages Function | events/locations | Yes | D1 | Yes | Yes | Yes | No device | WORKING |
| Meet creation/setup | Yes | Yes | Meets | Pages Function | events/locations | Yes | D1 | Yes | Yes | Partial | No device | PARTIAL |
| Meet attendee/show-car/sponsor roles | Yes | Yes | Meets | Pages Function | registrations | Yes | D1 | Yes | Yes | Partial | No device | PARTIAL |
| Social vertical feed | Yes | Yes | Primary Social | Pages Function | posts | User data | D1/R2 | Yes | Yes | Yes | No device | PARTIAL |
| Feed photo playback | Yes | When posted | Social | R2 media | posts | User media | R2/D1 | Yes | Partial | Partial | No device | PARTIAL |
| Feed video play/pause/seek/replay | Yes | When posted | Social | R2 media with Range/HEAD | posts | User media | R2/D1 | Yes | Yes | 390px playback fixture | No device | PARTIAL |
| Feed upload | Yes | Yes | Social | Pages Function/R2 | posts | User media | R2/D1 | Yes | Yes | Partial | No device | PARTIAL |
| Likes/saves/comments/follows | Yes | Yes | Social | Pages Function | social tables | Yes | D1 | Yes | Yes | Yes | No device | WORKING |
| Crews | Yes | Yes | Social/Crews | Pages Function | crews/members | Yes | D1 | Yes | Yes | 390px route/data | No device | PARTIAL |
| Direct/group messages | Yes | Yes | Social/Comms | Pages Function | conversations/messages | Yes | D1 | Yes | Yes | Partial | No device | PARTIAL |
| Season Hub | Yes | Yes | Dedicated Season Hub | Pages Function | seasons/journeys | Yes | D1 | Yes | Yes | 390px route/data | No device | PARTIAL |
| Badges/featured badges | Yes | Yes | Profile/Achievements | Pages Function | user_badges, featured_badges | Earned only | D1 | Yes | Yes | Add/reload at 390px | No device | WORKING |
| Encrypted Contracts | Yes | Yes | World | Pages Function | contracts/progress | Seeded admin content | D1 | Yes | Yes | Partial | No device | PARTIAL |
| World admin tools | Yes, gated | Developer only | Admin-gated World | Pages Function | world tables | Yes | D1 | Yes | Yes | No | No | NOT TESTABLE |
| Settings persistence | Yes | Yes | Profile/Settings | Pages Function | apex_user_settings | Yes | D1/local | Yes | Yes | 320-412px save/reload | No device | WORKING |
| APK download | Yes | Signed-in profile/settings | GitHub Release | EAS/GitHub | Release asset | Signed APK | Stable URL | Yes | Yes | Yes | No install device | PARTIAL |
| Android release automation | Workflow | No UI | CI | GitHub/EAS | Release metadata | Real build | GitHub | N/A | Failure-safe latest release | Workflow token absent | N/A | PARTIAL |

## Hidden Features Found

- The legacy Supabase `RootNavigator`, screens, and Zustand stores are unmounted but contain demo authentication, seeded drivers, seeded feed posts, seeded races, seeded leaderboards, fallback meet creation, and a public demo admin link.
- `WorldScreen` contains production APIs for seasons, badges, crews, Safe Houses, contracts, dead drops, and owner tools, but is reached through secondary navigation rather than a coherent destination model.
- Featured-badge storage exists, but no complete mounted reorder/control workflow exists.

## Misplaced Features Found

- The audit found Crews, Seasons, and Badges mixed into World; this branch separates them into `/app/social/crews`, `/app/season`, and `/app/profile/achievements`.
- Safe House management is split between World and Map markers.

## Mock Features Found

- Mounted V2 does not use the legacy seed arrays. The legacy tree still contains fake users, posts, vehicles, races, meets, leaderboards, demo auth, and offline-success mutations.
- Contract definitions are seeded in D1 migrations. They are persistent system content, but completion coverage is still partial and must not be described as live player activity.
- `Math.random` in mounted V2 is limited to noncompetitive animation/audio IDs and does not award currency, rank, race results, or Bounty outcomes.

## Broken Actions Found

- Before this audit, only six destinations were first-class; Leaderboards and Meets were buried.
- User-facing `RADAR` terminology conflicted with the requested `MAP` architecture and canonical URL design.
- Settings omitted navigation audio, map preference, Driver Mode preference, Ghost Frequency, multiple notification categories, and multiple privacy controls.
- GitHub Android automation is configured but currently skips because the repository `EXPO_TOKEN` secret is absent; manual authenticated EAS publication remains required until that secret is restored.

## Runtime Evidence

- Access gate: valid `200`; expired, disabled, and exhausted codes `404`; verification left `use_count` unchanged.
- Concurrency: two simultaneous signups against one remaining redemption created one account; the other request was rejected; D1 remained at `1 / 1` uses.
- Navigation: all eight primary destinations were opened at 390px and resolved to canonical section URLs.
- Reorganized routes: `/app/map/world`, `/app/season`, `/app/social/crews`, and `/app/profile/achievements` rendered mounted V2 data.
- Settings: saved Driver Mode Auto-Start through the UI and verified it remained enabled after reload; layouts were checked at 320, 360, 390, and 412px.
- Social video: an R2 MP4 rendered in the vertical feed with play/pause, seek, replay, mute, elapsed time, and duration controls.
- Featured badges: selected an earned badge, persisted the ordered loadout through D1, and verified it remained featured after reload.
- Ghost Shop: purchased the Blackout Frame for 300 GC, verified balance changed from 2,150 to 1,850 GC, equipped it, and confirmed ownership/equipment survived reload.
- HUD: Daily Ghost Chest was visible and displayed its server-backed claimed state and streak.
- Media transport: byte request `0-99` returned `206`, `Content-Range: bytes 0-99/2514704`, `Content-Length: 100`, and `Accept-Ranges: bytes`; `HEAD` returned metadata without a body.

# Apex UGR V2 Product Forensic Matrix

Canonical runtime: `App.tsx` mounts `src/v2/ApexDesignPreview.tsx` backed by Cloudflare Pages Functions, D1, and R2. The legacy Supabase `RootNavigator` is not production.

Status reflects mounted reachability and evidence as of PR #10. `WORKING` requires a tested user flow; source presence alone is `PARTIAL` or `NOT TESTABLE`.

| Feature | UI | Visible | Section | Backend | Database | Real data | Persistence | Errors | Mobile | Web | Android | Tested | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Access code gate | Yes | Yes | Entry | Yes | invite_codes | Yes | Signup redemption | Yes | Yes | Yes | Not device tested | API/UI pending | PARTIAL |
| Authentication | Yes | After code | Entry/Profile | Yes | users/sessions | Yes | Token session | Yes | Yes | Yes | Not device tested | Source/build | PARTIAL |
| HUD | Yes | Yes | HUD | Mixed | Multiple | Yes | Mixed | Partial | Yes | Yes | Not device tested | Build only | PARTIAL |
| Settings | Yes | Profile | Profile/Settings | Yes | apex_user_settings | Yes | D1 + local device | Yes | Yes | Yes | Not device tested | Build pending | PARTIAL |
| Garage vehicles | Yes | Yes | Garage | Yes | vehicles | Yes | D1/R2 | Yes | Yes | Yes | Not device tested | Source/build | PARTIAL |
| Parts discovery | Yes | Garage | Garage | Yes | Vehicle profile | Provider data | Vehicle persisted | Yes | Yes | Yes | Not device tested | eBay runtime unverified | PARTIAL |
| Radar markers | Yes | Yes | Radar | Yes | driver_locations/world | Yes | D1 | Partial | Yes | Yes | Not device tested | Source/simulation | PARTIAL |
| Route search | Yes | Yes | Radar | Yes | saved navigation | Nominatim/OSRM | D1/local route | Yes | Yes | Yes | Not device tested | OSRM simulation | PARTIAL |
| Turn-by-turn | Yes | Yes | Radar | Yes | active route local | OSRM | AsyncStorage | Yes | Yes | Yes | Not device tested | Simulation only | NOT TESTABLE |
| Ghost Cache drive | Yes | Yes | Radar | Yes | map_rewards | Yes | D1 | Yes | Yes | Yes | Not device tested | Source/build | PARTIAL |
| Safe Houses | Marker/list | Yes | Radar/World | Yes | safe_houses | Yes | D1 | Partial | Yes | Yes | Not device tested | Source/build | PARTIAL |
| Driver Mode | Yes | Yes | Radar | Yes | drive sessions/traces | GPS | D1/local | Partial | Yes | Yes | Not device tested | Simulation only | NOT TESTABLE |
| Race challenges | Yes | Yes | Race | Yes | race tables | Yes | D1 | Yes | Yes | Yes | Not device tested | Source/build | PARTIAL |
| Performance runs | Yes | Yes | Race | Yes | performance tables | GPS | D1 | Partial | Yes | Yes | Not device tested | No physical run | NOT TESTABLE |
| Ghost Shop catalog | Yes | Yes | Shop | Yes | ghost_shop_items | Yes | D1 | Yes | Yes | Yes | Not device tested | Build only | PARTIAL |
| Ghost Shop purchase | Yes | Yes | Shop | Yes | orders/inventory/ledger | Yes | D1 | Yes | Yes | Yes | Not device tested | Auth lifecycle pending | PARTIAL |
| Daily Ghost Chest | Yes | Yes | HUD | Yes | daily chest/claims | Yes | D1 | Yes | Yes | Yes | Not device tested | Build only | PARTIAL |
| Feed | Yes | Yes | Social | Yes | posts/R2 | Yes | D1/R2 | Partial | Yes | Yes | Not device tested | Media pending | PARTIAL |
| Crews | Yes | Wrong nested screen | World | Yes | crew tables | Yes | D1 | Partial | Yes | Yes | Not device tested | Not UI tested | PARTIAL |
| Meets | Yes | Secondary | Radar/community | Yes | event tables | Yes | D1 | Yes | Yes | Yes | Not device tested | Not UI tested | PARTIAL |
| Seasons | Yes | Scattered | World/HUD | Yes | season tables | Yes | D1 | Partial | Yes | Yes | Not device tested | Not UI tested | PARTIAL |
| Contracts | Yes | World | World | Yes | contracts/progress | Seeded server records | D1 | Partial | Yes | Yes | Not device tested | Completion not E2E | PARTIAL |
| General Bounty | No mounted UI | No | Radar expected | API exists | bounty tables | Server data | D1 | API errors | Unknown | Unknown | Not device tested | Not tested | NOT WIRED |
| Venue Bounty | Yes | World | World | Yes | venue_bounty_sessions | Yes | D1 | Yes | Yes | Yes | Not device tested | Source/build | PARTIAL |
| Notifications | Yes | Header | Global | Yes | notifications | Yes | D1 | Partial | Yes | Yes | Not device tested | Not E2E | PARTIAL |
| APK download | Yes | HUD/Profile | Account/About | CI/release | GitHub Release | Build artifact | Stable latest URL | Browser handling | Yes | Yes | Not install tested | Workflow static check | PARTIAL |

## Confirmed forensic findings

- PR #9 only exposed the six canonical V2 destinations. It did not validate the systems behind them.
- PR #10 hardened Ghost Shop ordering, removed a fabricated route fallback, throttled location publishing, corrected the bottom Shop destination, connected Cache routing, exposed Safe House markers, and surfaced the daily chest.
- General Bounty API code exists, but no mounted V2 general-Bounty interface currently reaches it.
- Crews, Seasons, contracts, Safe House management, venue Bounty, and admin world tools are mixed together in `WorldScreen`; this information architecture remains partial.
- Map rewards are generated with random offsets during location updates, then persisted. They are not client-only mock pins, but their distribution is user-centric and unsuitable as a final regional content model.
- The old Android workflow embedded an expiring Expo artifact URL in source and pushed a bot commit. PR #10 replaces this with a stable GitHub Releases latest-asset URL.
- Physical Android GPS, media playback, authenticated Shop lifecycle, and multi-user Bounty behavior remain not runtime verified.

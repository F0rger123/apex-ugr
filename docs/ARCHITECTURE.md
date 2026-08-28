# Apex UGR Architecture

## Canonical Runtime

`App.tsx` mounts `src/v2/ApexDesignPreview.tsx`. The production application is an Expo/React Native app exported for web and deployed to Cloudflare Pages. Its server runtime is `functions/api/[[path]].ts`, with Cloudflare D1 for relational state and R2 for user media and Android releases.

The code under `src/navigation`, `src/screens`, and most of `src/stores` is the unmounted legacy Supabase application. It is not production evidence and must not be wired back into `App.tsx`.

## Mounted Modules

- V2 shell, authentication, HUD, Garage, Map, Shop, and Social: `src/v2/ApexDesignPreview.tsx`
- Phase 3 Race, Leaderboards, Meets, Profile, Season, and Crew surfaces: `src/v2/phase3/Phase3Screens.tsx`
- Persistent client state: `src/v2/live/*Store.ts`
- Cloudflare client: `src/config/cloudflareApi.ts`
- Pages API router: `functions/api/[[path]].ts`
- Server feature modules: `functions/lib/phase2-api.mjs` and `functions/lib/phase3-api.mjs`
- Schema: forward-only SQL in `migrations/`

## Release Architecture

Android releases use a failure-safe sequence: signed build, package/version/signer verification, SHA-256 calculation, immutable direct R2 upload, R2 download verification, and a small authenticated pointer promotion. `/api/download/android` reads `android/releases/latest.json` and serves the referenced immutable object. The previous pointer remains current if any preceding step fails.

Required GitHub configuration is `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `RELEASE_UPLOAD_TOKEN`, Android signing secrets, and repository variable `CLOUDFLARE_ACCOUNT_ID`. Secrets must never enter source control.

## Boundaries

- Competitive rewards and balances are server-authoritative.
- Speed and race telemetry originate from fresh device GPS samples and are validated server-side. NPC movement is confined to clearly labeled Bounty fallback actors.
- Exact private GPS must not appear in logs or public Bounty responses.
- Client errors must terminate in an explicit recoverable state, never an infinite spinner or blank screen.
- Map and video surfaces must minimize mounted expensive resources.

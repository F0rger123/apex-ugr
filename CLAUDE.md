# CLAUDE.md

Guidance for Claude Code working in this repo.

## Stack

- Expo / React Native app (`expo ~51`, `react-native 0.74.5`), exported for web and deployed to Cloudflare Pages.
- Server runtime: Cloudflare Pages Functions (`functions/api/[[path]].ts`), backed by Cloudflare D1 (relational) and R2 (media, Android release binaries). Config in `wrangler.jsonc`.
- State: `zustand` stores.
- Legacy/parallel backend: Supabase (`src/config/supabase.ts`, `supabase/migrations/`, `supabase/functions/`) — see Architecture below, mostly unmounted.
- Language: TypeScript (`tsconfig.json`), plus `.mjs` server/test scripts and a couple of one-off `.py` scripts at repo root.
- CI: `.github/workflows/android-apk.yml`.

## Project structure — read `docs/ARCHITECTURE.md` first

This repo has a live/production path and a larger legacy/unmounted path. Get this wrong and you'll edit dead code.

- **Production entry**: `App.tsx` → `src/v2/ApexDesignPreview.tsx`. Live surfaces live under `src/v2/` (`src/v2/phase3/Phase3Screens.tsx`, `src/v2/live/*Store.ts`).
- **Server**: `functions/api/[[path]].ts` (router) + `functions/lib/*.mjs` (feature modules). Schema: forward-only SQL in `migrations/` (Cloudflare D1).
- **Legacy/unmounted**: `src/navigation/`, `src/screens/`, most of `src/stores/`, and the Supabase stack under `supabase/`. Per `docs/ARCHITECTURE.md` this is explicitly **not** production and must not be wired back into `App.tsx`.
- Other docs worth checking before large changes: `docs/KNOWN_ISSUES.md`, `docs/PRODUCT_SPEC.md`, `docs/MASTER_PRODUCTION_AUDIT.md`, `docs/QA_ACCEPTANCE.md`.

If a task touches something under `src/navigation`, `src/screens`, or a store not referenced from `src/v2`, stop and confirm with the user whether it's actually in scope — it may be dead code.

## Core rules

- **Minimal, targeted changes.** Don't restructure, rename, or "clean up" code beyond what the task requires. No unrelated refactors, no drive-by formatting changes, no new abstractions unless the task needs them.
- **Preserve existing working behavior.** This is a live production app with real users, races, rewards, and payments. Don't change behavior of code you weren't asked to touch.
- **Never touch production databases or infrastructure without explicit ask.** This includes: applying migrations to prod D1/Supabase, running `wrangler` deploy/publish commands, modifying Cloudflare Pages/R2/D1 config, changing GitHub Actions secrets/deploy workflow, or any destructive SQL. Local/dev-only actions are fine; anything hitting a live project or remote resource needs the user's explicit go-ahead first.
- **Never expose secrets.** Never print, log, commit, or echo values from `.env`, `.env.example` filled-in copies, R2/Cloudflare credentials, Stripe keys, signing secrets, or GitHub Actions secrets. Treat anything matching `R2_*`, `RELEASE_UPLOAD_TOKEN`, Android signing keys, `STRIPE_*` (non-publishable), and Supabase service-role keys as secret. Only `EXPO_PUBLIC_*` values are meant to be client-visible.
- **Inspect before building.** Before adding a new store, service, API route, or helper, search `src/v2/live/`, `src/services/`, `src/stores/`, and `functions/lib/` for something that already does it. This codebase already has many overlapping systems (ghost economy, bounty, telemetry, feed, marketplace, etc.) — duplicating one is a likely mistake.
- **Verify before declaring done.** Run the relevant check before saying a task is complete:
  - `npm run type-check` for TypeScript changes.
  - The matching regression script for the phase/system touched (see `package.json` scripts: `test:phase2`, `test:phase3`, `test:phase4`, `test:bounty4`, `test:migration3`, `test:migration4`, `test:http3`, `test:cotw3`, `test:invites`, `test:android-release`).
  - If no test covers the change, say so explicitly rather than claiming it's verified.
- **Mobile UX and navigation are load-bearing.** Preserve existing tab/stack navigation behavior (`src/navigation/BottomTabNavigator.tsx`, `RootNavigator.tsx`, and the v2 navigation inside `src/v2/`), gesture handling, and safe-area behavior. Don't change screen flow, back-button behavior, or layout without being asked.
- **Git history is preserved.** No force-push, no `git reset --hard`/rebase of shared history, no rewriting commits, unless explicitly told to. Prefer new commits over amending.
- **Follow Karpathy engineering guidelines** (installed skill: `andrej-karpathy-skills:karpathy-guidelines`) where applicable — avoid overcomplication, make surgical changes, surface assumptions instead of guessing, and define verifiable success criteria before calling work done.

## Practical notes

- `EXPO_PUBLIC_*` env vars are the only ones safe for the client; everything else is a Cloudflare Pages server secret.
- Android release flow is a strict fail-safe pipeline (signed build → verify → checksum → immutable R2 upload → verify → pointer promotion). Don't shortcut steps in `functions/lib/android-release-core.mjs` or the release workflow.
- Competitive rewards/balances and race telemetry are meant to be server-authoritative — don't move that logic client-side.
- Root-level `fix_types.py`, `fix_types_2.py`, and `type-check-errors.txt` look like one-off migration/cleanup artifacts, not part of the app — confirm with the user before relying on or extending them.

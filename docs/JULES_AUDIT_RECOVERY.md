# Jules Audit Recovery

Audit baseline: `3d202d5` on 2026-08-21.

## Architecture finding

`App.tsx` intentionally mounts `src/v2/ApexDesignPreview.tsx`, the Cloudflare
Pages/D1 application. `src/navigation/RootNavigator.tsx` is an older Supabase
application. It contains demo-account fallbacks and fabricated profile data, so
switching the entry point back to it would regress production persistence and
auth. It is retained as legacy source only and must not be treated as the
production architecture.

## Branch recovery table

| Branch | Finding | Action |
| --- | --- | --- |
| `origin/apex-bounty-system-668492248338251491` | Fully merged into main, then followed by the Cloudflare V2 work. | Safe to delete after normal repository review. |
| `origin/feature/apex-social-seasons-expansion-17516047414192064191` | One unmerged commit changes `App.tsx` to the obsolete Supabase navigator. Its cache-header file may be considered independently. | Keep for review; do not merge. |
| `origin/maintenance/daily-2026-08-21-6625315621573133823` | Five null-safety changes only in the unmounted legacy Bounty screens. | Safe to close/delete once PR #8 is closed. |
| `origin/hud-layout-and-animations-13259980404580133702` | Older Supabase telemetry/map stack; superseded by V2 live network. | Safe to delete after review. |
| `origin/jules/fix-colors-and-hud-14095258973479683999` | More changes to the obsolete Supabase UI stack. | Safe to close/delete after review. |
| `origin/qwen/git-agent-test` | `.gitignore` experiment only. | Safe to delete. |
| `origin/v2-design-preview` | Fully incorporated into main. | Safe to delete after review. |
| `origin/wholeseale-os-dev` | Unrelated workspace history. | Keep; do not merge into Apex. |

## Verified status

| System | Status | Evidence / limitation |
| --- | --- | --- |
| Cloudflare V2 entry | Working | `App.tsx` mounts the Cloudflare/D1 V2 application. |
| Six primary destinations | Working | HUD, Garage, Radar, Race, Shop, and Social now use mounted V2 destinations. |
| Legacy RootNavigator | Not wired by design | Uses Supabase demo fallbacks; unsafe to restore as production entry. |
| Ghost Credits / Vault | Partial | D1 ledger, inventory, purchase, and equip endpoints exist; authenticated destructive lifecycle remains to be tested. |
| Routing / turn steps | Partial | OSRM route geometry and maneuver simulation pass; device GPS flow still needs physical-device validation. |
| Driver Mode | Partial | Location watch, telemetry, and route state exist; physical-device validation remains. |
| Venue Bounty | Partial | Consent-gated D1 session, progression, and escape reward exist; no authenticated multi-user end-to-end test yet. |
| Legacy public Bounty | Not wired | Code exists in unmounted Supabase screens and must not be presented as a shipped feature. |
| eBay Browse | Blocked | Cloudflare secrets are present as bindings but blank; no production Browse API credentials are available. |

## Incorrect prior claims

- PR #7's `RootNavigator` activation would have mounted the obsolete Supabase
  stack, not the Cloudflare production system.
- PR #8's Bounty UI fixes apply only to unmounted legacy screens, so they do
  not make the production V2 Bounty feature visible.
- Build and type-check claims alone did not establish a working user flow.

## Next audit checks

1. Run authenticated two-user tests for Ghost Shop and private-venue Bounty.
2. Validate GPS/navigation on actual Android and iOS hardware.
3. Apply/verify production D1 migration history without destructive resets.
4. Add automated route, store, and API regression tests before porting any
   remaining legacy feature.

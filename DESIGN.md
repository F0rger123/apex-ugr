# Apex UGR Design System

Reference: adapted from `awesome-design-md/design-md/lamborghini/DESIGN.md`'s black-canvas/motorsport principles. No Lamborghini branding, typeface, logos, or gold — reworked around Apex's own identity, existing green accent, and existing component set in `src/`.

## 1. Visual Theme & Atmosphere

Apex UGR is an underground street-racing app: the surface should feel like a car HUD at night — near-black cockpit glass, telemetry glowing green, everything else silent. The app already leans this way (`colors.background: #060806`, `colors.deepSpace: #030403`, `colors.primary: #B7FF4A`); this document formalizes it rather than replacing it.

The mood is nocturnal and technical, not luxury-theatrical: dashboards, gauges, GPS, live telemetry, race HUDs. Green (`#B7FF4A`) is the single signal color — speed readouts, active states, live indicators, primary CTAs. Everything else stays near-black, white, or muted gray-green. The UI should read like instrumentation, not like a marketing site: sharp numerals, tight labels, glanceable at a moment's notice while a car is a factor.

**Key characteristics:**
- Near-black backgrounds (`#030403`–`#0C0F0C`) dominate; no pure `#000000` flat panels — the existing palette already layers deep space → background → surface for depth, keep that.
- One accent color: Apex green `#B7FF4A`. No new chromatic accents. Danger red (`#FF6B6B`) and warning (`#D8FF8B`) stay reserved for status only, never decoration.
- Heavy weight type (`900`/`800`) with uppercase labels and tight positive letter-spacing (0.5–2) for HUD/telemetry text — this is already the pattern across `ApexDesignPreview.tsx`, `ApexHeader.tsx`, `SpeedometerGauge.tsx`.
- Small-to-moderate border radii (6–20px), not zero-radius Lamborghini-style rectangles — Apex's existing components (buttons, cards, pills) are already softly rounded; preserve that, don't flatten it.
- Glass/blur cards (`GlassCard.tsx`) with subtle green-tinted borders — keep this as the elevation language instead of introducing shadows or gradients.
- Data-dense but not cluttered: telemetry, speed, credits, rank are always visible in HUD chrome, but each screen has one clear focal action.

## 2. Color Palette & Roles

Use the existing tokens in `src/config/colors.ts` — do not introduce parallel color constants.

### Primary
- **Apex Green** (`colors.primary`, `#B7FF4A`): the only accent — primary buttons, active/live states, speed arcs, focus borders, success.
- **Primary Glow** (`colors.primaryGlow`, `rgba(183,255,74,0.22)`) / **Primary Bg** (`colors.primaryBg`, `rgba(183,255,74,0.10)`): tint washes behind active elements, never a full fill.
- **Primary Dark** (`colors.primaryDark`, `#72B82F`): pressed/hover state for green elements.

### Surface & Background
- **Deep Space** (`colors.deepSpace`, `#030403`): the darkest layer — splash, intro, modals' backdrop.
- **Background** (`colors.background`, `#060806`): default screen background.
- **Surface** (`colors.surface`, `#0C0F0C`) → **Surface Container Low** (`#111511`) → **Surface Container High** (`#192019`): elevation ladder, lightest = most elevated. Use this instead of drop shadows on dark screens.
- **Card / Glass Surface** (`colors.card`, `colors.surfaceVariant`, `rgba(16,21,17,0.76)`): translucent panel background, always paired with `blur` on web (`GlassCard.tsx`) and a subtle border.
- **Card Border** (`colors.cardBorder`, `rgba(232,255,235,0.12)`) / **Active Card Border** (`colors.primary`): default vs. selected/active card outline.
- **Glass Header** (`colors.glassHeader`, `rgba(3,5,3,0.88)`): top nav / header bar background.
- **Overlay** (`colors.overlay`, `rgba(0,0,0,0.86)`): modal backdrops, full-screen dimming.

### Text
- **Text** (`colors.text`, `#F4FFF5`): primary text on dark surfaces (near-white, faint green tint — not pure white).
- **Text Secondary** (`colors.textSecondary`, `#B8C7BA`): body/meta text.
- **Text Muted** (`colors.textMuted`, `#718073`): timestamps, disabled labels, tertiary info.
- **Text Matrix** (`colors.textMatrix`, `= colors.primary`): green readouts (speed numbers, live values).

### Semantic
- **Danger** (`#FF6B6B`): errors, destructive actions, red telemetry zone (high RPM/speed danger arc).
- **Warning** (`#D8FF8B`): caution states, currency/credits icon accent.
- **Success / Info**: both currently mapped to green family (`success = primary`, `info = #D6E8D7`) — keep success tied to the single accent rather than adding a second green.

Do not add blue, gold, purple, or teal accents. `astralPurple`/`astralIndigo` in the token file already resolve to the green/light-green family — treat them as aliases, not license to introduce new hues.

## 3. Typography Rules

No custom font is loaded in this project (system font stack via React Native defaults) — do not introduce a new font family or web font. Hierarchy comes from **weight, size, letter-spacing, and case**, matching the existing screens.

| Role | Size | Weight | Letter Spacing | Case | Notes |
|------|------|--------|-----------------|------|-------|
| Hero / readout number | 60–64px | 900 | -2 to 0 | as-is | Speedometer, big stat numbers — tight negative tracking at huge size, numerals only |
| Screen title | 28–35px | 900 | 0.4–1.2 | Title or UPPER | Section/hero headings |
| Card title | 16–24px | 900 | 0–1 | as-is | Vehicle names, race titles |
| Body | 12–15px | 700–800 | 0 | as-is | Descriptions, secondary content |
| Label / eyebrow | 7–10px | 900 | 0.8–2.2 | UPPER | Status pills, HUD micro-labels ("LIVE TELEMETRY", section eyebrows) |
| Button text | 12–16px | 800 | 0.8 | UPPER | `ApexButton` — uppercase, bold, tracked |

Principles:
- **Weight carries hierarchy, not a type family switch.** `900` for anything that must be scanned instantly (numbers, titles, status); `700`/`800` for supporting text.
- **Uppercase is reserved for labels, buttons, and eyebrows** — not full paragraphs. Unlike the Lamborghini reference, body copy stays mixed-case for mobile readability.
- **Positive letter-spacing scales inversely with size**: tiny HUD labels (6–8px) get the most tracking (1–2.2), large numerals get slight negative tracking for density.
- Numerals in telemetry/speed contexts should be monospaced-feeling via tight tracking and consistent weight, even without a monospace font, so digits don't jitter as values update.

## 4. Component Stylings

Extend the existing components (`src/components/common/*`) rather than creating parallel ones.

### Buttons (`ApexButton.tsx`)
- **Primary**: bg `colors.primary`, text `#000000`, `borderRadius: 8`, `borderWidth: 1.5` in the same green, uppercase bold text with `0.8` tracking. This is the only filled-green surface in the app — reserve it for the one primary action per screen.
- **Secondary**: bg `colors.surface`, border `colors.cardBorder`, text `colors.text` — for parallel/lesser actions.
- **Outline**: transparent bg, border + text in `colors.primary` — for tertiary actions on dark surfaces.
- **Danger**: `rgba(255,51,102,0.2)` bg, `colors.danger` border/text — destructive actions only.
- Minimum touch target: 44×44 (sm size already at 8/12 padding — verify sm-size buttons hit 44px hit-area via hitSlop if visually smaller).

### Cards (`GlassCard.tsx`)
- Translucent surface (`colors.surfaceVariant`) + backdrop blur on web, native shadow fallback on mobile.
- `borderRadius: 10`, 1px `cardBorder` by default; `activeGlowBorder` variant (1.5px `colors.primary` + green shadow/glow) for selected or "live" cards — this is the correct pattern for highlighting an active race, live driver, or selected vehicle, not a background color change.
- Padding: 14px interior — keep consistent across card types so grids/lists align.

### Header (`ApexHeader.tsx`)
- Fixed 56px height, `colors.glassHeader` background, 1px bottom border in low-opacity green (`rgba(183,255,74,0.12)`).
- Brand mark: small green badge + wordmark, left-aligned; credits pill (green-tinted, rounded-full) and notification/avatar icons right-aligned.
- Back navigation replaces the brand block, never stacks alongside it — one left-side element only, to keep the 44px+ tap target uncluttered on small screens.

### Telemetry & Gauges (`SpeedometerGauge.tsx`, `GForceMeter.tsx`, `AccelerationGraph.tsx`)
- Circular gauges: 270° sweep, green arc that shifts green → warning → danger as value approaches redline/limit — color communicates state, not just position.
- Center digital readout: huge bold number + small uppercase unit label + a "LIVE" status pill — this triad (number / unit / live-pill) is the standard pattern for any real-time metric, reuse it rather than inventing new gauge layouts.
- Track/background arcs use low-opacity white (`rgba(255,255,255,0.08–0.3)`), never a second color, so the green readout stays the only "hot" element.

### Badges & Pills (`MatrixBadge.tsx`, credits pill, status pills)
- `borderRadius: 8` (status) to full/pill (`9999`, credits/rank) depending on content — pills for counts/currency, small-radius rects for status/labels.
- Always paired: colored border + low-opacity same-color fill + colored text. Never a solid color fill with white text (reserved for the primary button only).

## 5. Layout Principles

### Spacing
Use `theme.spacing` scale: `xs 4, sm 8, md 16, lg 24, xl 32`. Don't invent one-off pixel values outside this scale except where telemetry/HUD components need sub-4px fine alignment (already the pattern in `ApexDesignPreview.tsx` micro-labels).

### Border Radius
Use `theme.borderRadius`: `sm 6, md 8, lg 12, full 9999`. This is deliberately **not** zero-radius — Apex's aggression comes from typography, color contrast, and motion, not sharp corners. Don't flatten existing rounded components to chase a "sharper" look without being asked.

### Mobile-first & touch
- This is a phone app first (Expo/React Native), not a responsive website — design and test at phone width before anything else; web export is secondary.
- All interactive targets ≥ 44×44px (buttons, icons, list rows, map pins). Icon-only buttons (`iconBtn`, avatar, back arrow) need adequate padding, not just the icon's visual bounds.
- Bottom tab bar and any thumb-reachable primary actions belong in the lower two-thirds of the screen; don't put critical race/navigation controls at the very top edge on a large device.
- Respect safe-area insets (`react-native-safe-area-context` is already a dependency) on all screens with a header or bottom sheet.

### Map & navigation clarity
- Map screens (`src/stores/mapStore.ts`, world/map surfaces in `src/v2/live`) must keep the map itself uncluttered: HUD chrome (speed, credits, notifications) stays in fixed overlay bars, never floating cards that drift over map content.
- Route/POI markers use green for player/active state and muted white/gray for inactive/other players — consistent with the single-accent rule.
- Live telemetry overlays on the map (speed, live drivers) must not block route-critical UI (destination pin, ETA, turn instructions) — telemetry is secondary to navigation, position it in a corner, not center.
- Never rely on color alone for map state that matters while driving (e.g., bounty active vs. inactive) — pair color with an icon or label, since a driver's screen glance is short.

### Density
- One primary action per screen/card. Supporting stats and metadata are secondary-weight (muted color, smaller size) so the eye finds the action first.
- Avoid stacking more than 2–3 translucent glass cards deep visually (nested glass-on-glass reduces contrast and looks muddy on OLED). Prefer flat surface color steps (`surface` → `surfaceContainerLow` → `surfaceContainerHigh`) for nested elevation instead of nested blur.

## 6. Depth & Elevation

| Level | Token | Use |
|-------|-------|-----|
| 0 | `colors.deepSpace` (`#030403`) | Splash, intro, deepest backdrop |
| 1 | `colors.background` (`#060806`) | Default screen background |
| 2 | `colors.surface` / `surfaceContainerLow` | Base panels, list rows |
| 3 | `surfaceContainerHigh` / `colors.card` (glass) | Cards, modals content, elevated HUD chrome |
| 4 | `colors.overlay` (`rgba(0,0,0,0.86)`) | Modal backdrops, full-screen dimming |
| Active | `colors.primary` glow (`primaryGlow`/`activeGlowBorder`) | Selected/live state, replaces "higher elevation" with "lit up" |

Depth comes from stepping through the surface ladder above and from the green glow on active elements — not from heavy drop shadows or gradients. Native shadow props (`shadowOpacity`, `elevation`) already used in `GlassCard.tsx` should stay subtle (current values: opacity 0.4, radius 10 native / soft box-shadow on web) — don't push them heavier, it reads muddy on OLED black.

## 7. Do's and Don'ts

### Do
- Reuse `colors` and `theme` from `src/config/colors.ts` for every new style — never hardcode a new hex that duplicates an existing token.
- Keep Apex green (`#B7FF4A`) as the only chromatic accent; danger/warning stay functional, not decorative.
- Use weight + uppercase + tracking for hierarchy, matching existing screens.
- Use the surface elevation ladder (`deepSpace → background → surface → surfaceContainerHigh`) for depth.
- Keep existing border-radius scale (6/8/10/12/20/9999) — rounded, not sharp.
- Preserve `GlassCard` blur/border pattern for elevated content.
- Design mobile-first; verify 44px+ touch targets and safe-area handling.
- Keep map screens uncluttered — HUD in fixed overlays, not floating over map content.

### Don't
- Don't introduce a new accent color (no gold, blue, purple, teal) — this is explicitly the one thing carried over from the Lamborghini reference: single accent discipline.
- Don't flatten components to zero border-radius chasing a "sharper" aesthetic — that contradicts Apex's existing, already-approved component language.
- Don't add a custom/imported display font — the app has none today; adding one is a scope change, not a style tweak.
- Don't stack multiple translucent glass cards on top of each other — pick a solid surface step instead.
- Don't use color alone to convey a driving-relevant state on the map/HUD — pair with icon or text.
- Don't touch `src/navigation`, `src/screens`, or other legacy/unmounted surfaces as part of "applying" this design system — per `docs/ARCHITECTURE.md` those are not production; only `src/v2/**` and shared `src/components/**` matter.
- Don't rework existing screens wholesale to match this document in one pass — apply it incrementally, screen by screen, preserving current functionality (see `CLAUDE.md`: minimal targeted changes, preserve working behavior).

## 8. Agent Prompt Guide

### Quick reference
- Accent: `colors.primary` (`#B7FF4A`)
- Background: `colors.background` (`#060806`) / deepest: `colors.deepSpace` (`#030403`)
- Elevated surface: `colors.surfaceContainerHigh` (`#192019`) or `colors.card` (glass, `rgba(16,21,17,0.76)`)
- Primary text: `colors.text` (`#F4FFF5`)
- Muted text: `colors.textMuted` (`#718073`)
- Border (default): `colors.cardBorder` / (active): `colors.primary`
- Danger: `colors.danger` (`#FF6B6B`) — Warning: `colors.warning` (`#D8FF8B`)

### Example component prompts
- "Add a stat tile using `GlassCard`, `borderRadius: 10`, `colors.surfaceVariant` background, a huge `900`-weight number in `colors.text`, and a `7px` uppercase muted label below it with `1px` letter-spacing."
- "Build a live-status pill: `colors.primaryBg` background, 1px `colors.primary` border, `borderRadius: 9999`, uppercase `900`-weight green text at 8px with 1.5 tracking."
- "Style a map overlay HUD bar fixed to the top with `colors.glassHeader` background, 56px height, safe-area padding, speed readout on the left in green, credits pill on the right."
- "Create a destructive confirm button: `rgba(255,51,102,0.2)` background, `colors.danger` border and text, same `ApexButton` shape/padding as primary."

### Iteration guide
1. Check `src/config/colors.ts` and the target component's existing `StyleSheet` before adding any new style value.
2. Reuse `theme.spacing` / `theme.borderRadius` tokens — don't invent new numbers.
3. Keep one accent color per screen (green) — if a new state needs distinguishing, use opacity/weight/icon, not a new hue.
4. For anything shown while driving (map, telemetry, navigation), prioritize legibility and glance-speed over visual richness.
5. Verify against `CLAUDE.md`: minimal diff, no unrelated refactor, run `npm run type-check` after any styling change to shared components.

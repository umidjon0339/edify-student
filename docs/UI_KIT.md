# UI_KIT — Teacher design system (design.teacher.config.ts + components/ui)

> **Agent workflow:** read this BEFORE touching `components/ui/*`,
> `design.teacher.config.ts`, `tailwind.config.ts` token mappings, or restyling
> any `app/teacher/*` page; update it in the same change whenever you alter
> behavior described here. Index: [README.md](README.md).

**Last verified:** 2026-10-31 (`sky` palette made default, decorative surface recipes + exam accent added; switchboard since 2026-07-23).

## The one thing to know

**`/design.teacher.config.ts` (repo root) is the switchboard.** Change one word
there and the entire teacher panel re-skins — palette, light/dark, typeface,
shell navigation, shape, density, card/button/input/table/tab/list/tile/dialog
styles, page background, loading style, motion, page transitions. Nothing else
needs editing.

```ts
Color_palette: 'sky',           // 11 professional M3 palettes
App_shell_navigation: 'sidebar',// 10 shells: 6 side recipes + rail/floating/topbar/toolbar
Mobile_navigation: 'dock',      // dock | floating | iconic | topline | drawer
Card_style: 'elevated',
Button_style: 'pill',
Motion_level: 'expressive',
```

It is typed against `TeacherDesignConfig`, so a typo is a **build error** with
a "did you mean" hint, and editors autocomplete the legal values.
⚠️ Deliberately **not** `as const` (same reason as the student switchboard —
`as const` narrows every value to its own literal and TS flags all untaken kit
branches as dead code).

**Premium default (2026-10-31: palette indigo → sky, shell sidebar → pillbar; rest since 2026-07-23):** sky · system mode + in-app toggle ·
Manrope · pillbar/floating · soft shapes · comfortable density · elevated cards ·
pill buttons · outlined fields · aurora canvas · expressive motion.

## Scope

`app/teacher/**` only. Student (`design.config.ts` + `components/student-ui`,
see [STUDENT_UI.md](STUDENT_UI.md)), manager and admin trees are unaffected.
⚠️ **Two kits exist. Never mix them.**
`@/components/ui` = teacher · `@/components/student-ui` = student.

## Key files

| File | Responsibility |
|---|---|
| `design.teacher.config.ts` | **The switchboard.** 20 one-word choices + the `TeacherDesignConfig` type. |
| `components/ui/theme.css` | All tokens. Palettes auto-generated between the `T-PALETTES:START/END` markers; derived/shape/density/font/motion/canvas blocks below are hand-written. Imported once by `app/teacher/layout.tsx`. |
| `scripts/genTeacherPalettes.mjs` | Regenerates the palette blocks (`npx tsx`, needs `@material/material-color-utilities` installed `--no-save`). |
| `components/ui/config.ts` | Bridges the config to the kit (`teacherThemeAttributes()`, `MOTION_ON`, `springTransition`, `popIn`, `pageTransition`, stagger helpers). |
| `components/ui/TeacherThemeProvider.tsx` | Stamps `data-t-*` on `<html>`, resolves light/dark (config default → per-device localStorage override `edify-t-mode` → OS), pins `/teacher/print*` to light, exposes `useTeacherTheme()`. |
| `components/ui/shellStyles.ts` | The 6 sidebar recipes (`SIDE_STYLES`) as pure data — shared by the shell (`app/teacher/layout.tsx`) and the gallery previews. |
| `components/ui/*.tsx` | The kit. Barrel: `index.ts` (also re-exports the provider + motion helpers + `SIDE_STYLES`/`resolveSideStyle`). |
| `tailwind.config.ts` | Maps tokens to utilities — **additive only** (`t-*` names; student `s-*` and default scales untouched). |
| `app/theme-check-teacher/page.tsx` | Dev-only unguarded gallery: `/theme-check-teacher?palette=wine&mode=dark&…` for eyeballing/screenshotting combos without auth. Safe to delete. |

## How the switches actually work

1. **CSS-driven switches** (`Color_palette`, `Color_mode`, `Shape_style`,
   `Density`, `Font_style`, `Motion_level`, `Page_background`, and the pill
   half of `Button_style`) become `data-t-*` attributes on `<html>` via
   `TeacherThemeProvider`; `theme.css` keys every token off them.
   **Why `<html>`, not a scoped wrapper (student does the opposite):** toasts
   and dialogs portal to `<body>` and must resolve the ACTIVE palette. The
   attributes are removed on unmount so nothing leaks into other role trees;
   the student tree is additionally immune because it re-declares every
   `--m3-*` var inside its own scoped wrapper. A plain `:root` fallback block
   (default palette, light) keeps first paint and non-teacher consumers
   resolving exactly like the pre-switchboard status quo.
2. **Component-driven switches** (`Card_style`, `Button_style`, `Input_style`,
   `Table_style`, `Tab_style`, `List_style`, `StatTile_style`, `Dialog_style`,
   `Loading_style`) are read by the components as their **default variant**;
   any single usage can override with a prop (`<Card variant="glass">`).
3. **Shell switches** are rendered by `app/teacher/layout.tsx`.
   `App_shell_navigation` has **11 desktop personalities**: 6 *side recipes*
   (`sidebar` ⭐ — gliding soft-tinted rounded row (`bg-t-primary-soft`, primary text) · `classic` — grouped links, sliding left
   accent bar, tinted active row, user-card+logout footer · `tonal` —
   container-colored panel · `inverse` — always-contrast chrome · `gradient`
   — primary→tertiary panel · `minimal` — chromeless dot) plus 4 *containers*
   (`rail` pinned-collapsed, `floating` glass card, `topbar` 5+"More" single
   row, `toolbar` two-deck full nav row) plus **`pillbar` ⭐ (default since
   2026-10-31)**: floating frosted pills — no header band — the brand pill (just the Edify logo image `public/brand/edify-logo.webp` — cropped from the "Edify Math" artwork without "Math"; brightened in dark mode via `.t-brand-logo`), a frosted
   `.t-glass-pill` capsule — Boshqaruv link + hover dropdowns (`.t-mega`) for
   Asosiy · Imtihonlar (violet exam accent) · Resurslar, then a "Yangi Test"
   link — and a right cluster of language pill, the light/dark **wave switch**
   (`ThemeWaveToggle`, replaced the bell — notifications live under Asosiy) and the profile pill
   (first name + avatar; dropdown = user card, AI meter, theme switch,
   profile/settings/subscription, logout).
   Only the pills are fixed: the header is `absolute` over `<main>`
   (transparent, `pointer-events-none` except its pills) and `<main>` gets
   `md:pt-[76px]`, so the page and its canvas scroll *behind* the pills; once
   scrolled the pills turn more opaque (`.t-bar-scrolled`). ⚠️ `<main>` also
   gets `.t-under-bar`. Page-level sticky toolbars must carry the
   **`t-page-bar`** marker (19 pages today, incl. `CreateHeader`; the create
   hub dropped its bar on md+): under the bar they're re-pinned to `top: 8px`
   and restyled as a floating glass bar (md+). ⚠️ Sticky offsets are measured
   inside `<main>`'s padding box, so its 76 px top padding already clears the
   pills — `top: 84px` (first attempt) parked bars ~160 px down. Never offset *unmarked* `sticky top-0` — inner headers in modals,
   side panels and lists stick inside their own scrollers (the first blanket
   rule shoved them 76 px down). A page bar that sticks in the page's own
   full-height scroller (maktab, ixtisos, database) adds `t-page-bar-flush`
   (documentary — same `top: 8px`), and `h-[100dvh]` page roots shrink to `100dvh - 76px`. A page
   root with `overflow-hidden` kills its sticky bar — use `overflow-clip`.
   ⚠️ The root is `h-[100dvh]` and the main column `h-[100dvh] min-h-0` for
   **every** shell, so `<main>` is the only scroller and the header never
   moves. In top shells the root is a flex *column*: without `min-h-0` the
   column's `min-height:auto` grows it to the page's full length, the window
   scrolls and the bar scrolls away. Don't drop `min-h-0` or reintroduce
   `min-h-[100dvh]`, and listen for scroll on `<main>`, not `window`.
   **Phones (all shells):** the mobile header is Edify style too — floating
   glass pills (logo · AI chip · `ThemeWaveToggle` instead of the bell ·
   avatar), `absolute` over `<main>` (`pt-[60px]`; class `.t-under-bar-m`
   gives page bars the same glass treatment and `h-[100dvh]` page roots
   `100dvh - 60px`). Bottom nav default is `floating` (`.t-dock` glass pill,
   active tab = accent pill). Notifications stay in the Menu drawer.
   Dropdowns open on hover (160 ms close delay; the panel's `pt-3` wrapper
   bridges the gap) and on click for touch/keyboard; Escape/outside click/route
   change close them. ⚠️ The dashboard tour's `tour-sidebar-*` targets live in
   closed dropdowns here — the shell's `tour-step-change` handler opens the
   matching group; map any new sidebar tour id there too.. The side recipes are pure data in
   `components/ui/shellStyles.ts` — consumed by BOTH the real shell and the
   gallery's static previews, so they can't drift. Every side shell (except
   rail) collapses with the `[` key (state in localStorage `edify-sb-rail`).
   `Mobile_navigation` has 5: `dock` ⭐ / `floating` / `iconic` (icon-only) /
   `topline` (sliding top accent line) / `drawer`; the bars show 4 key
   destinations (dashboard, create, classes, library) + "Menyu" opening the
   full drawer, which is styled by the same side recipe as the desktop
   sidebar, and every bar variant auto-hides on the `HIDE_BOTTOM_BAR` deep
   routes. The layout also owns the teacher language context: the chosen
   `uz|en|ru` persists per-device in localStorage `edify-teacher-lang`
   (restored post-hydration so the SSR 'uz' shell never mismatches).
   Pages never know which shell is active.

**Dark mode resolution order:** `/teacher/print*` pin to light (html-to-image
snapshots the screen) → per-device override from the in-app toggle (profile
popover; persists in localStorage `edify-t-mode`; "system" clears it) →
`Color_mode` in the config ('system' follows the OS live). Browser printing is
separately covered by a generated `@media print` block that re-pins every dark
selector to light values.

## Palettes

11 palettes × light + dark = 22 complete M3 dynamic-color schemes, generated
from one source color each by `@material/material-color-utilities` (HCT):

`sky` (default) · `indigo` · `ocean` · `midnight` · `emerald` · `teal` · `plum` ·
`wine` · `bronze` · `steel` · `graphite` (mono)

To change or add one: edit `SOURCES` in `scripts/genTeacherPalettes.mjs`, then

```bash
npm install --no-save @material/material-color-utilities
npx tsx scripts/genTeacherPalettes.mjs     # tsx, not node — ESM resolution
```

- A SOURCES row may carry a 4th element `{ shift, chroma }` — replaces the
  scheme's tertiary palette with one at source hue + shift. `sky` uses it
  (`-28°`, chroma 30 → aqua) so the panel stays in one calm blue family.
  `sky` is seeded from Material/Google blue `#1a73e8` (since 2026-10-31;
  light primary `#005bbf`, dark primary `#adc7ff`).
- **One button color in both modes.** Every palette also emits a
  mode-INDEPENDENT accent: `--t-accent` (tone 45, ≥4.5:1 with white),
  `--t-accent-strong` (tone 35), `--t-on-accent` (#fff) — identical in light
  and dark — plus `--t-accent-text` (tone 40 light / 80 dark, ink for tinted
  accent surfaces). Kit `Button` filled = `bg-t-accent`, tonal =
  `bg-t-accent-soft text-t-accent-text`; `.t-icon-chip` / `.t-on-chip` /
  `.t-accent-strip` paint with it. ⚠️ Tailwind maps `bg-primary` (+ all
  variants) to `var(--t-fill-primary, var(--m3-primary))` and `text-on-primary`
  to `var(--t-on-fill-primary, …)` (`extend.backgroundColor/textColor`); only
  the teacher tree sets those vars (= the accent), so the ~290 hand-rolled
  primary fills in teacher pages match too, while student/manager fall back
  unchanged. Text/border/ring `primary` stay mode-aware on purpose.
- Every palette also emits `--t-exam` / `--t-exam-container` /
  `--t-on-exam-container` (source hue + 70°, light + dark; a palette may pin it
  with `exam: '#hex'` (a named Material seed) or `exam: 'tertiary'` (the palette's
  own tertiary tonal palette) in its 4th SOURCES element — `sky` uses
  `'tertiary'` (its aqua) → M3 tones 40/90/10 light, 80/30/90 dark) — the **exam
  accent** for the sidebar's Imtihonlar group (`EXAM_HREFS` in
  `app/teacher/layout.tsx`; light-panel recipes only). Tailwind: `text-t-exam`,
  `bg-t-exam-container`, `bg-t-exam-soft` (derived), `text-t-on-exam-container`.
- ⚠️ Only hue-preserving scheme variants (`SchemeTonalSpot`, `SchemeFidelity`,
  `SchemeNeutral` for mono). The script asserts hue drift ≤ 45° — keep the guard.
- `success`/`warning` are derived at fixed hues with clamped chroma (32–48);
  regenerate rather than hand-editing.
- ⚠️ The generator emits `--m3-scrim` **with baked-in alpha** (rgba, 0.45
  light / 0.6 dark), NOT the solid M3 scrim role — ~25 teacher call sites use
  `bg-scrim` directly as an overlay and rely on the translucency.

## Decorative surface recipes

Hand-written in `theme.css` (after `.t-gradient`), all token-built, so they work
in every palette and both modes. First used by the dashboard
(`app/teacher/dashboard/page.tsx`) and the side-nav brand/CTA; reuse them
instead of re-inventing gradients per page.

| Class | Look |
|---|---|
| `.t-hero` | Hero card: two radial sky washes + masked dot grid (`::before`), lit top edge, hairline border. Sets `position: relative; isolation: isolate`. |
| `.t-accent-strip` | Bold gradient banner (center strip, trial prompt). Sets its own text color (on-primary / dark: on-primary-container) — children should inherit (`currentColor`), not set `text-on-*`. |
| `.t-panel` | Everyday card: `surface-container-low` + hairline + lit edge (`--t-sheen`) + elev-1. |
| `.t-icon-chip` / `.t-icon-chip-soft` | Gradient icon chip with glow / tinted same-hue chip. Use these two weights instead of rotating primary/secondary/tertiary containers. |
| `.t-ring-hover` | Primary hairline + soft halo on hover. |
| `.t-watermark` | Big faded corner icon (`absolute`, 7%/10% opacity); parent needs `relative overflow-hidden`. Currently unused — removed from the dashboard on request (2026-10-31). |
| `.t-wave` | One-shot greeting wave (reduced-motion safe). |
| `.t-workspace` / `.t-float-panel` | Full-height 3-panel create tools (database, maktab, ixtisoslashtirilgan_maktab), **desktop ≥1024px only**: the panel row gets a 12px gap + inset and each side panel becomes a floating glass card (rounded-xl, white hairline, blur); its direct `bg-surface*` children go transparent. Raised specificity (`:root[data-t-palette] …`) so it beats the panels' own `lg:` border/height/bg utilities; phone drawers/sheets untouched. |
| `PillGroup` | One-of-N choice in the nav-capsule look: a `.t-glass-pill` capsule of rounded-full options, the selected one in a gliding `.t-icon-chip` gradient pill (`role=radiogroup`). Wraps onto more lines. Used by the subject picker on `/teacher/create/import`, the library tabs (`/teacher/library/tests`) and EditTestModal's tabs + time presets; use it for other chip rows instead of hand-rolled `bg-primary` chips. |
| `ThemeWaveToggle` + `.t-theme-toggle` / `.t-theme-wave` | Round light/dark switch (sun in dark, moon in light, tilts 20° on hover). Click = circular reveal of the new theme from the button: View Transitions API + `clip-path: circle()` on `::view-transition-new(root)`, 650 ms; `.t-theme-wave` on `<html>` suspends other transitions meanwhile. Instant switch without the API / under reduced motion / Motion_level none. Goes through `setPreference` (per-device override); `flushSync` makes the provider's layout effect stamp `data-t-mode` inside the transition. |
| `.t-glass-pill` / `.t-mega` / `.t-on-chip` / `.t-bar-scrolled` / `.t-under-bar` | Pillbar shell: frosted pill (brand, nav capsule, language, bell, profile) / hover dropdown panel / text color for content on a `.t-icon-chip` fill / more-opaque pills once scrolled / re-pins `sticky top-0` below the bar. |

New tokens: `--t-primary-tint` (`bg-t-primary-tint`), `--t-sheen`, `--t-exam-soft`.

**Sky light canvas (2026-10-31):** with `sky` + `aurora` in light mode the
`.t-canvas` is a periwinkle-blue mesh (palette-specific hex stops in
theme.css). ⚠️ ~40 teacher pages paint `bg-surface` on their root wrapper; a
rule clears it **only on the page root** (`.t-canvas > div > .bg-surface`) so
the mesh shows — new pages should simply not paint a page-level background.
`/teacher/print*` gets `.t-canvas-plain` and keeps the plain surface.

## Invariants & traps

- ⚠️ **Chart colours are `--t-viz-1…4`** (2026-10-31, appended at the end of
  `components/ui/theme.css`): the same validated fixed slots as the student kit's
  `--s-viz-N`, NOT palette-themed (colour follows the SAT domain via
  `satDomainSlot`). Light slots 3–4 and dark slot 4 can sit below 3:1 → always
  ship visible labels. First user: `app/teacher/create/import/_components/ModuleMixChart.tsx`.
- ⚠️ **Never hard-code a color, radius or shadow in a teacher page.** Only
  token utilities (`bg-primary`, `rounded-m3-lg`, `shadow-elev-2`, …) or
  `var(--m3-…)`/`var(--t-…)` in unavoidable inline styles.
- ⚠️ **Tailwind opacity modifiers do NOT work on token colors** (plain hex in
  `var()`; `bg-primary/50` renders opaque). Use the prebuilt translucent
  tokens: `bg-t-glass`, `border-t-glass-border`, `bg-t-bar-blur`,
  `bg-surface-blur`, `bg-background-blur`, `bg-scrim`, `bg-t-primary-soft`,
  `bg-state-hover`, `disabled-bg/fg` — or add a `color-mix()` var to theme.css.
- ⚠️ Tailwind mapping stays **additive**: never override default `rounded-*`
  scales or gray palettes; never touch `s-*` (student) or `brand.*` (finance)
  entries.
- ⚠️ `font-sans` in a teacher page defeats `Font_style` — use `font-t-body`
  (the 2026-07-23 sweep replaced all of them; don't reintroduce).
- Density flows through the kit only: `--t-control-h*`, `--t-card-pad`,
  `--t-row-h`, `--t-gap*`, `--t-page-x/y` (utilities `h-t-control`, `p-t-card`,
  `gap-t-gap`, `px-t-page-x`, …). Page-level hardcoded spacing is unaffected —
  prefer the `t-*` utilities in new/reworked pages.
- Motion: `Motion_level='none'` hard-kills CSS transitions/animations under the
  stamped attribute (spinner exempt) and `MOTION_ON` gates all framer-motion
  choreography; OS reduced-motion is honored independently. Gate any new JS
  animation on `MOTION_ON`.
- ⚠️ One `filled` Button per screen (main action); status colors are for state,
  never decoration. Sweep conventions (status-chip semantics, difficulty tones,
  inverse-surface for deliberately-dark elements, band-score thresholds) are
  unchanged from the 2026-07-13 migration.
- TextField/TextArea/Select keep an **opaque** `surface-container-lowest`
  background in outlined/filled variants — the floating-label patch depends on
  it; never make fields transparent.
- `IconButton` requires `aria-label` (typed as mandatory).
- `m3-switch`/`m3-checkbox`/`m3-radio`/`m3-spinner`/`m3-skeleton`/`t-dot`/
  `m3-interactive` classes live in theme.css — kit components break if that
  file isn't loaded (the teacher layout imports it).
- ⚠️ `.m3-interactive` sets `position: relative` as unlayered CSS, so it beats
  Tailwind's `absolute`/`fixed` on the same element. To pin an interactive
  button to a corner, position a wrapper `div` and keep the class on the button.
- `.custom-scrollbar` is now really styled (slim, token-colored) but ONLY under
  the stamped `data-t-palette` attribute — it stays a no-op in other role trees.
- The layout's active-nav pills use framer `layoutId` — centering is done with
  `inset-x-0 mx-auto` on purpose (framer owns `transform`; translate-based
  centering breaks the pill).

## Fonts

Five options (`Font_style`): `manrope` (default) · `inter` · `jakarta` ·
`plex` · `grotesk` (Space Grotesk display over Inter body). All are declared in
**`app/layout.tsx`** via `next/font` as `--font-*` variables; `theme.css` maps
the chosen one to `--t-font-body` / `--t-font-display` (`font-t-body` /
`font-t-display` utilities). Unused families are never downloaded — @font-face
alone doesn't fetch. Space Grotesk is latin-only; Cyrillic headings fall back
per glyph (intended).

## How to verify changes

`npm run dev` → open `/theme-check-teacher` (no login needed) or any
`/teacher/*` page → in DevTools confirm `<html>` carries
`data-t-palette="indigo" data-t-mode="light|dark"` and `--m3-primary` resolves.
Then:

1. **Re-skin smoke test** — set `Color_palette: 'wine'`: every page shifts hue.
   `App_shell_navigation: 'topbar'`: side nav becomes a top bar.
   `Card_style: 'outlined'`: cards lose their shadow. Revert.
2. **Typo test** — set a bogus value; `npx tsc --noEmit` must fail with a
   "did you mean" hint.
3. **Dark mode** — toggle in the profile popover (light/system/dark); reload —
   the choice must persist; "system" must follow the OS live.
4. **Raw-color sweep** —
   `grep -rnE '(bg|text|border)-(zinc|slate|gray|violet|rose|green|amber|blue)-[0-9]' app/teacher`
   must return nothing beyond the documented leftovers below.
5. Check hover/press state layers, keyboard focus rings, a ConfirmDialog flow
   (bottom-sheet on mobile under `Dialog_style: 'sheet'`), and 360px width: no
   horizontal scroll, bottom nav reachable.
6. **Print** — `/teacher/print` renders light even in dark mode; browser print
   of any page uses light ink (generated `@media print` block).

## Known issues / dead code

- **Known non-token leftovers (deliberate, from the 2026-07-13 migration):**
  gold/silver/bronze medal inline hex in AssignmentsTab submissions;
  print-output inline styles (`PRINT_CSS`, html-to-image white bg) — printed
  ink, not theme; Recharts hexes in students/[id] pinned with a comment (SVG
  attrs can't resolve vars); dead `AiLimitCard.tsx`; hardcoded Uzbek
  IconButton aria-labels.
- `/theme-check-teacher` is an unguarded dev gallery (no data) — delete freely
  if it bothers production.
- The M3 Theme Lab artifact (old single-palette workflow) is superseded by the
  generator + switchboard; re-theming via copy-pasting artifact tokens is dead.

# STUDENT_UI — Student design system (design.config.ts + components/student-ui)

> **Agent workflow:** read this BEFORE touching `components/student-ui/*`,
> `design.config.ts`, or restyling any `app/(student)/*` page. Update it in the
> same change whenever you alter behavior described here.
> Index: [README.md](README.md). Student *logic* lives in [STUDENT.md](STUDENT.md).

**Last verified:** 2026-07-30 (`StatTile` skips a flat sparkline); 2026-07-23 (shell variants extended: 9 desktop + 5 mobile, recipe-driven via shellStyles.ts).

## The one thing to know

**`/design.config.ts` (repo root) is the switchboard.** Change one word there and
the entire student app re-skins — palette, shell, card style, button feel,
gamification widgets, motion, density. Nothing else needs editing.

```ts
Color_palette: 'nebula',        // 10 M3 palettes
App_shell_navigation: 'sidebar',// 9 desktop shells (6 recipes + floating/rail/topbar)
Card_style: 'filled',           // filled | elevated | outlined | gradient | glass
Button_style: 'game',           // game | pill | squircle | elevated
Layout_density: 'platform',     // edge-to-edge software vs floating cards
```

It is typed against `DesignConfig`, so a typo is a **build error** with a
"did you mean" hint, and editors autocomplete the legal values.

⚠️ It is deliberately **not** `as const`. With `as const` every value narrows to
its own literal and TypeScript flags all the branches the kit does not currently
take as dead code (`TS2367` on every comparison). The explicit
`export const DESIGN: DesignConfig` annotation keeps authoring safe while
letting consumers see the full union.

## Scope

`app/(student)/**` only. The teacher/manager/admin trees are untouched and keep
their own styling — see [UI_KIT.md](UI_KIT.md) for the separate teacher kit.

⚠️ **Two kits exist. Never mix them.**
`@/components/ui` = teacher · `@/components/student-ui` = student.

## Key files

| File | Responsibility |
|---|---|
| `design.config.ts` | **The switchboard.** 18 one-word choices + the `DesignConfig` type. |
| `components/student-ui/theme.css` | All tokens. Palettes are auto-generated between the `PALETTES:START/END` markers; shape/density/motion/state blocks below are hand-written. Imported **once**, by the student layout. |
| `scripts/genStudentPalettes.mjs` | Regenerates the palette blocks. |
| `components/student-ui/config.ts` | Bridges the config to the kit (`themeAttributes()`, `MOTION_ON`, `springTransition`). |
| `components/student-ui/StudentThemeProvider.tsx` | Stamps `data-palette/-shape/-density/-layout/-motion/-mode` on the shell root. |
| `components/student-ui/*.tsx` | The kit. Barrel: `index.ts`. |
| `components/student-ui/shellStyles.ts` | Pure-data sidebar recipes (`SIDE_STYLES`) shared by `Shell.tsx` and the gallery. |
| `app/theme-check-student/page.tsx` | Dev-only, unguarded shell gallery (`/theme-check-student?palette=X&mode=dark`). Safe to delete. |
| `tailwind.config.ts` | Maps tokens to utilities (**additive only** — teacher mappings untouched). |

## How the switches actually work

1. **CSS-driven switches** (`Color_palette`, `Color_mode`, `Shape_style`,
   `Density`, `Layout_density`, `Motion_level`) become `data-*` attributes on the
   shell root via `StudentThemeProvider`; `theme.css` keys every token off them.
   Scoping to that wrapper (not `<html>`) is what stops the tokens leaking into
   the other role trees.
2. **Component-driven switches** (`Card_style`, `Button_style`, `List_style`,
   `Input_style`, `Xp_display`, `Streak_display`, `Badge_style`, `Loading_style`,
   `Celebration`) are read by the components as their **default variant**. Any
   single usage can still override it with a prop:
   `<Card variant="gradient">` on one hero card leaves the rest alone.
3. **Shell switches** (`App_shell_navigation`, `Mobile_navigation`) pick which
   nav `Shell.tsx` renders. Pages never know which is active.

## Shell variants

**Desktop (`App_shell_navigation`, 9 values).** Six are *recipes* — pure data
in `components/student-ui/shellStyles.ts` (`SIDE_STYLES`), all rendered by the
same `RecipeDrawer` in `Shell.tsx`:

> Renamed 2026-07-23: the opaque `shell_a` / `shell_b` / `shell_c` values became
> `rail` / `sidebar` / `topbar` (same looks; `sidebar` stays the default).

- `sidebar` ⭐ (default) — neutral drawer, gliding `primary-container` pill
  behind the active row
- `classic` — sliding left accent **bar** + `color-mix()` tinted active row
- `tonal` — panel washed in `secondary-container`, raised `bg-surface` pill
- `inverse` — `inverse-surface` panel, `inverse-on-surface` idle text
- `gradient` — `--s-grad-a/b` gradient panel; idle text is `on-primary`, which
  is correct in both modes (the gradient is saturated in light, pastel in dark)
- `minimal` — transparent chromeless panel, sliding **dot** indicator

The other three are *containers*, not recipes: `floating` = the `sidebar`
recipe inside a detached glass card (`bg-surface-glass`, `shadow-elev-2`,
`rounded-m3-lg`, 12px margin); `rail` = icon-only strip with tooltips;
`topbar` = top tabs, no side panel. `resolveSideStyle()` maps any value to its
recipe (non-recipes → `sidebar`).

Recipe fields: `panel`, `headerBorder`, `brandWrap` (chips the wordmark on a
surface so it stays legible on colored panels), `itemShape`, `idle`, `active`,
`activeRowBg`, `iconActive`, `indicator` (`pill | bar | dot`), `indicatorCls`.
The active indicator is a framer-motion `layoutId` element gliding between
rows — positions use **fixed offsets, never translate-based centering**
(framer's layout animation owns `transform`), and its transition is gated on
`MOTION_ON`.

**Mobile (`Mobile_navigation`, 5 values).** `dock` ⭐ (edge-to-edge bar),
`floating` (detached pill), `iconic` (icon-only compact bar — every item
carries `aria-label`), `topline` (sliding `h-[3px]` accent line along the TOP
edge of the bar), `drawer` (hamburger slide-in). All bar variants share the M3
5-destination cap (`hideOnMobile`), and `<main>` reserves per-variant bottom
padding off `--s-dock-h` so content never hides under the bar.

The recipes are previewed at **`/theme-check-student`** — an unguarded,
data-free gallery whose `MiniSidebar`/`MiniBar` consume the real `SIDE_STYLES`,
so the gallery cannot drift from the shell. It lives outside `app/(student)`,
so it imports `theme.css` itself (the documented "only the layout imports it"
rule applies to pages *under* the student layout) and re-scopes
`?palette=X&mode=dark` overrides by nesting `data-palette`/`data-mode` on an
inner wrapper.

`Color_mode: 'system'` is resolved at runtime and keeps following the OS if the
student flips their theme mid-session.

**Local density — `.s-dense`.** One subtree can run tighter than the app's
`Density` without touching design.config.ts: the class re-declares
`--s-card-pad` / `--s-gap` / `--s-gap-lg` / `--s-section-gap` / `--s-page-y` on a
wrapper, and every `p-s-card` / `gap-s-*` inside inherits the smaller value —
no per-card overrides to drift. Used by
`app/(student)/raschmodel/layout.tsx`, whose pages stack a dozen analytic cards.
⚠️ It deliberately leaves `--s-page-x` alone: changing it would misalign those
pages with the rest of the app and break `-mx-s-page-x` full-bleed rows. ⚠️ The
wrapper must stay a plain `<div>` — an `overflow` or `transform` on it would
break the suite's `sticky` navbar and timer bar.

## Palettes

10 palettes × light + dark = 20 complete M3 dynamic-color schemes, generated
from one source color each by the official
`@material/material-color-utilities` HCT algorithm:

`nebula` (violet, default) · `ocean` · `meadow` · `sunset` · `cherry` ·
`mint` · `royal` · `amber` · `grape` · `graphite` (mono)

To change or add one: edit `SOURCES` in `scripts/genStudentPalettes.mjs`, then

```bash
npm install --no-save @material/material-color-utilities   # generation-time only
npx tsx scripts/genStudentPalettes.mjs                     # plain node fails — see below
```

- Run it through **`tsx`, not `node`**: the package publishes extensionless ESM
  imports that only a bundler-style resolver handles.
- ⚠️ **Only hue-preserving scheme variants may be used.** `SchemeExpressive`
  rotates the primary hue by +240° by design, so a violet source returns green.
  The script asserts hue drift ≤ 45° and throws otherwise — do not remove that
  guard. Safe: `SchemeVibrant` (punchy, best here), `SchemeTonalSpot` (calmer),
  `SchemeFidelity` (exact), `SchemeNeutral` (mono only).
- `success` / `warning` / `gold` are not part of the M3 scheme; the script
  derives them at fixed hues using the source's own chroma so they stay
  harmonious. Regenerate rather than hand-editing them.

## Invariants & traps

- ⚠️ **Chart colours are `--s-viz-1…4`, NOT palette tokens** (2026-10-31, hand-written
  block after `PALETTES:END` in `theme.css`). Fixed categorical slots, validated
  (dataviz validator) on all 20 palette surfaces; colour follows the entity via
  `satDomainSlot` (`lib/SatMathQuiz.ts`), so they must not change with
  `Color_palette`. Light slots 3–4 are below 3:1 on the surface — a chart using
  them must show visible labels (legend with counts). Used through
  `style={{ background: 'var(--s-viz-N)' }}` (no Tailwind mapping). First users:
  `app/(student)/sat/_components/SatViz.tsx`.
- ⚠️ **Never hard-code a color, radius or shadow in a student page.** Only token
  utilities (`bg-primary`, `text-on-surface-variant`, `rounded-m3-lg`,
  `shadow-elev-2`). Raw hex belongs in `theme.css`.
- ⚠️ **Tailwind opacity modifiers do NOT work on these tokens.** They are plain
  hex inside `var()`, so `bg-surface/85` silently renders **fully opaque** —
  this broke every blurred bar and dialog backdrop during the migration. Use the
  prebuilt translucent tokens instead: `bg-surface-blur`, `bg-surface-glass`,
  `bg-background-blur`, `bg-scrim-bg`, `bg-state-hover`, `bg-state-press`,
  `bg-disabled-bg`, `text-disabled-fg`. Need another? Add a `color-mix()` var to
  `theme.css` — don't reach for `/50`.
- ⚠️ `theme.css` is imported **once**, in `app/(student)/layout.tsx`. Never
  import it from a page (the old `library/page.tsx` imported the *teacher*
  `theme.css` — that is fixed; don't reintroduce it).
- ⚠️ **`<Page>` padding cannot be overridden with `p-0`** — `twMerge` doesn't
  recognise the custom `px-s-page-x` utilities. Use the `flush` prop.
- ⚠️ A `<ListGroup>` bleeds to the page edges under `Layout_density="platform"`.
  Nested inside a bounded surface it must not — `Card` and `Dialog` carry
  `.s-contain`, and the CSS rule is `.s-list-group:not(.s-contain *)`. **Any new
  bounded surface that can contain a list needs `s-contain`.**
- ⚠️ `IconButton` requires `aria-label` (typed as mandatory).
- ⚠️ **`StatTile` draws no sparkline for a flat `trend`** (2026-07-30). `Sparkline`
  falls back to `span = 1` when `max === min`, which puts every point on the
  baseline — a full-width rule with a dot on the end, which reads as a divider or a
  rendering glitch and makes the tile taller than its neighbours for zero
  information. The dashboard's XP tile hit this for every student with a quiet week
  (seven 0-XP days). The guard is in `StatTile`, so pass `trend` freely; a new
  direct `Sparkline` caller has to make the same check itself.
- Motion: `Motion_level="none"` **and** the OS `prefers-reduced-motion` setting
  both collapse animation. Guard JS animations with `MOTION_ON` plus a
  `matchMedia` check (`useRipple` and `Celebration` do).
- Digits that sit in columns (XP, scores, ranks, timers, money) get `s-num`
  (`tabular-nums`) so they don't jitter as they change.
- Status colors are for state only, never decoration, and always ship with a
  text label — never color alone.
- `sToast` reads tokens off the shell root because react-hot-toast portals to
  `<body>`, outside the themed wrapper. It exposes no duration argument.

## Fonts

`Fredoka` (display: headings, XP/level numbers) + `Plus Jakarta Sans` (body) are
loaded in **`app/layout.tsx`** as `--font-display` / `--font-jakarta` and
consumed via `--s-font-display` / `--s-font-body`. Fredoka is latin-only, so
Cyrillic headings fall back to Jakarta per glyph — intended.
Loading them in the root (server) layout avoids calling `next/font` from the
`'use client'` student layout.

## How to verify changes

`npm run dev` → open any student page → in DevTools confirm the shell root has
`data-palette="nebula" data-mode="light|dark"` and that
`--m3-primary` resolves. Then:

1. **Re-skin smoke test** — change `Color_palette` to `sunset`, save: every page
   shifts hue. Change `App_shell_navigation` to `rail`: the drawer becomes an
   icon rail (try `gradient` or `floating` too). Change `Card_style` to
   `outlined`: every card loses its fill. Revert.
2. **Typo test** — set a bogus value; `npx tsc --noEmit` must fail with a
   "did you mean" hint.
3. **Dark mode** — toggle the OS theme; `Color_mode: 'system'` must follow live.
4. **Raw-color sweep** —
   `grep -rnE '(bg|text|border)-(zinc|slate|gray|violet|rose|green|amber|blue)-[0-9]' "app/(student)"`
   must return nothing but the documented exceptions below.
5. Check hover/press state layers, keyboard focus rings, and a `ConfirmDialog`
   flow. Verify at 360px width: no horizontal page scroll.

## Known non-token leftovers (deliberate)

- **Checkers board ink** (`games/checkers/page.tsx`) — a checkerboard needs its
  own two-tone palette; the squares/pieces are pinned values, commented as board
  ink rather than theme colors.
- **Medal gold/silver/bronze** are fixed across all palettes by design
  (`--s-medal-*`), as is the streak flame (`--s-flame`) — a flame is orange in
  every theme. Text/icons on a medal fill use `--s-medal-ink` (also fixed);
  the role token `on-gold` flips with the mode and would go white-on-gold in
  light mode.
- **Trap: `bg-gold` is not "bright gold".** Like every M3 role color it is a
  dark tone in light mode (`#795900`) and a light one in dark mode (`#fcbc03`).
  Paired with `text-on-gold` it is a correct filled surface — but for something
  that should read as *earned metal* in both modes (streak coins, medals) use
  `bg-medal-gold text-medal-ink` instead. Same applies to `success`/`error`.
- Recharts SVG presentation attributes take `var(--m3-*)` values directly where
  charts were migrated; a chart that still carries literal hex is marked with a
  comment saying the values are pinned theme colors.

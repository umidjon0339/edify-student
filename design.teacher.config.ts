/* ============================================================================
 *
 *   ███  E D I F Y   ·   T E A C H E R   D E S I G N   S W I T C H B O A R D
 *
 * ============================================================================
 *
 *   THIS IS THE ONLY FILE YOU EDIT TO CHANGE HOW THE TEACHER PANEL LOOKS.
 *
 *   Change one word on any line below, save, and the whole teacher panel
 *   re-skins itself — every page, every card, every button. No other file
 *   needs to be touched.
 *
 *   The comment after each line lists every legal value. TypeScript will
 *   refuse to build if you type one that does not exist, so you cannot break
 *   the app from here — the worst case is a red squiggle telling you the
 *   allowed options.
 *
 *   The ⭐ marks the current premium default for this product.
 *
 *   Applies to app/teacher/** only. The student panel has its own switchboard
 *   (/design.config.ts); the manager and admin panels are unaffected.
 *
 *   Full guide: docs/UI_KIT.md
 *
 * ========================================================================= */

/**
 * The annotation below is what makes this file safe to edit: TypeScript checks
 * every value against TeacherDesignConfig, so a typo is a build error and your
 * editor autocompletes the legal options. It is deliberately NOT `as const` —
 * the kit must see these as "one of the allowed values", not "exactly this
 * one", or every branch it does not currently take would be flagged as dead
 * code.
 */
export const TEACHER_DESIGN: TeacherDesignConfig = {
  /* ─────────────────────────────────────────────────────────────────────────
   *  1. COLOR
   * ────────────────────────────────────────────────────────────────────── */

  /** The panel's color identity. 11 professional Material 3 palettes — each a
   *  full light + dark scheme generated from one source color, so every shade
   *  stays in harmony whichever you pick. */
  Color_palette: 'sky',
  // ⭐ sky      — calm sky blue with an aqua accent (nearly monochrome)
  //    indigo   — deep indigo, modern premium SaaS
  //    ocean    — calm blue, heir to the original teacher look
  //    midnight — muted navy, near-monochrome executive feel
  //    emerald  — deep green, fresh and grounded
  //    teal     — blue-green, clinical and clean
  //    plum     — muted purple, distinctive but restrained
  //    wine     — burgundy, warm and serious
  //    bronze   — warm bronze, earthy premium
  //    steel    — desaturated blue-grey, the quietest tinted option
  //    graphite — true monochrome, no accent hue at all

  /** Default light/dark behavior. 'system' follows the teacher's OS setting
   *  live. Teachers can still override this per-device with the in-app toggle
   *  (see Mode_toggle) — their choice is remembered on that device. */
  Color_mode: 'system',
  // ⭐ system | light | dark

  /** The in-app light/dark toggle (lives in the profile menu). 'hidden'
   *  removes it, making Color_mode above the only authority. */
  Mode_toggle: 'shown',
  // ⭐ shown | hidden

  /* ─────────────────────────────────────────────────────────────────────────
   *  2. TYPOGRAPHY
   * ────────────────────────────────────────────────────────────────────── */

  /** The panel's typeface. Each option is a complete professional pairing;
   *  only the chosen fonts are actually downloaded by the browser. */
  Font_style: 'manrope',
  // ⭐ manrope — rounded-yet-serious grotesque, warm premium (recommended)
  //    inter   — the neutral UI standard, maximum legibility
  //    jakarta — Plus Jakarta Sans, the original Edify face
  //    plex    — IBM Plex Sans, technical and precise
  //    grotesk — Space Grotesk headings over Inter body, the boldest pairing

  /* ─────────────────────────────────────────────────────────────────────────
   *  3. SHELL & NAVIGATION — the frame every page sits inside
   * ────────────────────────────────────────────────────────────────────── */

  /** Desktop / tablet navigation. Ten complete personalities — every one is
   *  collapsible to an icon rail with the [ key (except rail, which is born
   *  collapsed, and the two top bars, which have no side chrome). */
  App_shell_navigation: 'pillbar',
  // ⭐ pillbar  — sky-washed top bar: a glass pill of grouped hover dropdowns
  //               (Asosiy · Imtihonlar · Resurslar · Profil va sozlamalar),
  //               language pill, bell and a "Yangi Test" pill
  //    sidebar  — full sidebar that collapses to an icon rail ([ key toggles)
  //    classic  — grouped links, sliding left accent bar, softly tinted
  //               active row, user card + logout button in the footer
  //    tonal    — the whole panel washed in the palette's container color,
  //               crisp white active pill (colorful, branded)
  //    inverse  — always-contrast panel (dark chrome in light mode, light in
  //               dark) — the executive look
  //    gradient — primary→tertiary gradient panel, white active pill (boldest)
  //    minimal  — chromeless: transparent panel, no borders, just a sliding
  //               dot and bold primary text (airiest)
  //    rail     — always-slim pinned icon rail with labels under icons
  //    floating — detached glass sidebar card hovering over the canvas
  //    topbar   — horizontal top navigation: 5 inline + "More" overflow menu
  //    toolbar  — two-deck top bar: brand row above a full scrollable nav row
  //               showing every destination (no overflow menu)

  /** Phone navigation. Ignored on desktop. */
  Mobile_navigation: 'floating',
  // ⭐ floating — Edify style: detached glass pill hovering above the content
  //    dock     — edge-to-edge bottom bar with labels, like a native app
  //    iconic   — icon-only compact bottom bar (quietest)
  //    topline  — labeled bar with a sliding accent line along its top edge
  //    drawer   — hamburger menu only, slides in from the left

  /* ─────────────────────────────────────────────────────────────────────────
   *  4. SHAPE & DENSITY — the physical feel
   * ────────────────────────────────────────────────────────────────────── */

  /** Corner rounding across every surface, button and field. */
  Shape_style: 'soft',
  // ⭐ soft    — generous modern corners (premium SaaS)
  //    sharp   — tight corners (dense, technical, desktop-software)
  //    compact — the original moderate M3 scale
  //    round   — the roundest option short of a pill

  /** How much air everything breathes — control heights, card padding, table
   *  rows, page gutters. */
  Density: 'comfortable',
  // ⭐ comfortable | compact | airy

  /* ─────────────────────────────────────────────────────────────────────────
   *  5. COMPONENTS — the default look of each building block.
   *     Any single usage can still override with a prop, e.g.
   *     <Card variant="glass"> on one hero card leaves the rest alone.
   * ────────────────────────────────────────────────────────────────────── */

  /** Default card treatment. */
  Card_style: 'elevated',
  // ⭐ elevated — soft-shadow surface (classic premium)
  //    filled   — tinted surface, no shadow (flattest, most modern)
  //    outlined — hairline border, no shadow (crispest, most desktop)
  //    glass    — blurred translucency (best over the 'aurora' background)
  //    flat     — no border, no shadow, surface tint only (ultra minimal)

  /** Primary button personality. */
  Button_style: 'pill',
  // ⭐ pill     — fully rounded (modern M3)
  //    shaped   — rounded-rectangle (classic)
  //    gradient — primary→tertiary gradient fill (the boldest)
  //    glow     — shaped + a soft colored glow shadow (premium accent)

  /** Text field style used by every form in the panel. */
  Input_style: 'outlined',
  // ⭐ outlined — hairline border, floating label (most professional)
  //    filled   — tinted fill, floating label (the original look)
  //    soft     — borderless tinted fill (quietest)

  /** Data table treatment — teachers live in tables. */
  Table_style: 'lined',
  // ⭐ lined   — hairline row dividers (cleanest)
  //    striped — zebra rows (easiest to scan wide tables)
  //    cards   — each row a floating card (most mobile-friendly)

  /** Tab bar treatment. */
  Tab_style: 'underline',
  // ⭐ underline — animated ink underline (classic professional)
  //    segmented — connected segmented control (desktop-software feel)
  //    pills     — detached pill per tab (softest)

  /** Repeating list rows — students, classes, notifications. */
  List_style: 'divided',
  // ⭐ divided — one container, hairline dividers (platform look)
  //    cards   — each row its own floating card

  /** Dashboard/analytics stat tiles. */
  StatTile_style: 'accent',
  // ⭐ accent  — left accent bar in the tile's tone (executive dashboard)
  //    tonal   — filled with the tone's container color (original)
  //    outline — hairline border, tone only on the icon
  //    glass   — translucent over the page background

  /** Dialog behavior on phones. */
  Dialog_style: 'sheet',
  // ⭐ sheet  — slides up as a bottom sheet on mobile, centered on desktop
  //    center — always a centered dialog, every screen size

  /* ─────────────────────────────────────────────────────────────────────────
   *  6. CANVAS, FEEDBACK & MOTION
   * ────────────────────────────────────────────────────────────────────── */

  /** The page background behind everything. */
  Page_background: 'aurora',
  // ⭐ aurora — two faint radial washes of the palette's own gradient (premium)
  //    tinted — barely-there primary tint over the surface
  //    flat   — plain surface color (quietest)

  /** What teachers see while something loads. */
  Loading_style: 'skeleton',
  // ⭐ skeleton — content-shaped shimmer placeholders (pages feel instant)
  //    spinner  — centred circular spinner
  //    dots     — three pulsing dots (calmest)

  /** Global animation budget. Anyone with "reduce motion" set on their device
   *  automatically gets 'none', whatever is chosen here. */
  Motion_level: 'expressive',
  // ⭐ expressive — springy presses, staggered entrances, animated indicators
  //    productive — quick fades and simple easing only
  //    none       — no animation at all

  /** How pages enter when navigating between sections. */
  Page_transitions: 'fade',
  // ⭐ fade  — soft cross-fade with a slight rise
  //    slide — horizontal glide (app-like)
  //    none  — instant switch
};

/* ============================================================================
 *  TYPES — the allowed values. Editing below this line changes what is legal;
 *  to just re-skin the panel, only touch the block above.
 * ========================================================================= */

export type TeacherPaletteName =
  | 'sky' | 'indigo' | 'ocean' | 'midnight' | 'emerald' | 'teal'
  | 'plum' | 'wine' | 'bronze' | 'steel' | 'graphite';

export interface TeacherDesignConfig {
  Color_palette: TeacherPaletteName;
  Color_mode: 'system' | 'light' | 'dark';
  Mode_toggle: 'shown' | 'hidden';
  Font_style: 'manrope' | 'inter' | 'jakarta' | 'plex' | 'grotesk';
  App_shell_navigation:
    | 'sidebar' | 'classic' | 'tonal' | 'inverse' | 'gradient' | 'minimal'
    | 'rail' | 'floating' | 'topbar' | 'toolbar' | 'pillbar';
  Mobile_navigation: 'dock' | 'floating' | 'iconic' | 'topline' | 'drawer';
  Shape_style: 'soft' | 'sharp' | 'compact' | 'round';
  Density: 'comfortable' | 'compact' | 'airy';
  Card_style: 'elevated' | 'filled' | 'outlined' | 'glass' | 'flat';
  Button_style: 'pill' | 'shaped' | 'gradient' | 'glow';
  Input_style: 'outlined' | 'filled' | 'soft';
  Table_style: 'lined' | 'striped' | 'cards';
  Tab_style: 'underline' | 'segmented' | 'pills';
  List_style: 'divided' | 'cards';
  StatTile_style: 'accent' | 'tonal' | 'outline' | 'glass';
  Dialog_style: 'sheet' | 'center';
  Page_background: 'aurora' | 'tinted' | 'flat';
  Loading_style: 'skeleton' | 'spinner' | 'dots';
  Motion_level: 'expressive' | 'productive' | 'none';
  Page_transitions: 'fade' | 'slide' | 'none';
}

/** Every palette name, for building pickers/previews without retyping. */
export const ALL_TEACHER_PALETTES: readonly TeacherPaletteName[] = [
  'sky', 'indigo', 'ocean', 'midnight', 'emerald', 'teal',
  'plum', 'wine', 'bronze', 'steel', 'graphite',
] as const;

export default TEACHER_DESIGN;

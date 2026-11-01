/* ============================================================================
 *
 *   ███  E D I F Y   ·   S T U D E N T   D E S I G N   S W I T C H B O A R D
 *
 * ============================================================================
 *
 *   THIS IS THE ONLY FILE YOU EDIT TO CHANGE HOW THE STUDENT APP LOOKS.
 *
 *   Change one word on any line below, save, and the whole student platform
 *   re-skins itself — every page, every card, every button. No other file
 *   needs to be touched.
 *
 *   The comment after each line lists every legal value. TypeScript will
 *   refuse to build if you type one that does not exist, so you cannot break
 *   the app from here — the worst case is a red squiggle telling you the
 *   allowed options.
 *
 *   The ⭐ marks the recommended value for this product.
 *
 *   Applies to app/(student)/** only. The teacher, manager and admin panels
 *   have their own styling and are completely unaffected by this file.
 *
 *   Full guide: docs/STUDENT_UI.md
 *
 * ========================================================================= */

/**
 * The annotation below is what makes this file safe to edit: TypeScript checks
 * every value against DesignConfig, so a typo is a build error and your editor
 * autocompletes the legal options. It is deliberately NOT `as const` — the kit
 * must see these as "one of the allowed values", not "exactly this one", or
 * every branch it does not currently take would be flagged as dead code.
 */
export const DESIGN: DesignConfig = {
  /* ─────────────────────────────────────────────────────────────────────────
   *  1. COLOR
   * ────────────────────────────────────────────────────────────────────── */

  /** The entire app's color identity. 10 real Material 3 palettes — each one
   *  is a full light + dark scheme generated from a single source color, so
   *  every shade stays in harmony no matter which you pick. */
  Color_palette: 'sky',
  // ⭐ sky      — Edify style: Material blue + aqua, ONE button color in both
  //               modes, periwinkle mesh canvas (same as the teacher panel)
  //    nebula   — vivid violet, the most "game" feeling
  //    ocean    — blue, closest to the teacher panel (one brand family)
  //    meadow   — green, classic learning-app energy
  //    sunset   — warm orange
  //    cherry   — bold pink-red
  //    mint     — calm teal
  //    royal    — deep indigo
  //    amber    — gold / honey
  //    grape    — bright purple
  //    graphite — neutral grey, no accent hue (serious / minimal)

  /** Light or dark. 'system' follows the student's own phone/OS setting and
   *  updates live when they change it. */
  Color_mode: 'system',
  // ⭐ system | light | dark  (students can still flip it per device with the
  //    light/dark wave switch in the top bar — localStorage `edify-s-mode`)

  /* ─────────────────────────────────────────────────────────────────────────
   *  2. SHELL & NAVIGATION — the frame every page sits inside
   * ────────────────────────────────────────────────────────────────────── */

  /** Desktop / tablet navigation. */
  App_shell_navigation: 'pillbar',
  // ⭐ pillbar  — Edify style: floating glass pills on top (brand · a capsule of
  //               every destination with a gliding accent pill · streak/lang/
  //               light-dark/profile), no band, stays pinned while scrolling
  //    sidebar  — labelled drawer, gliding pill behind the active row (easiest wayfinding)
  //    classic  — sliding left accent bar + tinted active row (quiet desktop-software look)
  //    tonal    — whole panel washed in the palette's container tint, white active pill
  //    inverse  — high-contrast panel in the inverse surface color (bold, focused)
  //    gradient — panel painted with the brand gradient (loudest, most "game")
  //    minimal  — chromeless transparent panel, tiny sliding dot marks the page
  //    floating — the sidebar detached as a rounded glass card with margin all around
  //    rail     — slim icon-only rail with hover tooltips (most content space)
  //    topbar   — top tabs only, no side nav (widest content, fewest destinations)

  /** Phone navigation. Ignored on desktop. */
  Mobile_navigation: 'floating',
  // ⭐ floating — Edify style: detached glass pill hovering above the content
  //    dock     — bottom bar edge-to-edge, like a native Android/iOS app
  //    iconic   — icon-only compact bar, gliding pill behind the active icon
  //    topline  — labelled bar with a sliding accent line along its top edge
  //    drawer   — hamburger menu that slides in from the left

  /* ─────────────────────────────────────────────────────────────────────────
   *  3. SHAPE & DENSITY — the physical feel
   * ────────────────────────────────────────────────────────────────────── */

  /** Corner rounding across every surface, button and field. */
  Shape_style: 'soft',
  // ⭐ rounded — generous pill/squircle corners (friendly, playful)
  //    soft    — moderate corners (neutral, professional)
  //    sharp   — tight corners (dense, technical, desktop-software)

  /** How much air everything breathes. Compact fits noticeably more on screen. */
  Density: 'compact',
  // ⭐ comfortable | compact

  /** THE "platform vs webpage" DECISION.
   *  platform = lists run edge-to-edge and meet the shell with a hairline, the
   *  way macOS/Android software looks. floating = every card is its own island
   *  with margin around it, the way a website looks. */
  Layout_density: 'floating',
  // ⭐ platform | floating

  /* ─────────────────────────────────────────────────────────────────────────
   *  4. COMPONENTS — the default look of each building block
   * ────────────────────────────────────────────────────────────────────── */

  /** Default card treatment. (Hero cards can still opt into gradient/glass
   *  individually — this sets what a plain <Card> looks like.) */
  Card_style: 'glass',
  // ⭐ filled   — tinted surface, no shadow (flattest, most modern)
  //    elevated — white surface + soft shadow (classic Material)
  //    outlined — hairline border, no shadow (crispest, most desktop)
  //    gradient — two-tone accent wash (loud — best reserved for hero cards)
  //    glass    — blurred translucency (premium; needs a colorful backdrop)

  /** How repeating lists render — classes, history, notifications, grades. */
  List_style: 'grouped',
  // ⭐ grouped — one container, hairline dividers, no gaps (the platform look)
  //    cards   — each row a separate floating card

  /** Primary button personality. */
  Button_style: 'pill',
  // (Edify style 2026-10-31: pill — was 'game')
  // ⭐ game     — 3D hard bottom edge that physically depresses (Duolingo feel)
  //    pill     — full-round Material button with an ink ripple
  //    squircle — rounded-square that morphs rounder as you press (M3 Expressive)
  //    elevated — raised surface button with a shadow

  /** Text field style used by every form in the app. */
  Input_style: 'filled',
  // ⭐ filled | outlined

  /* ─────────────────────────────────────────────────────────────────────────
   *  5. GAMIFICATION — XP, streaks, ranks, badges
   * ────────────────────────────────────────────────────────────────────── */

  /** How XP progress toward the next level is drawn. */
  Xp_display: 'gradient_bar',
  // ⭐ gradient_bar — animated gradient fill with a moving shine
  //    segmented    — notched milestone bar (reads as steps, not a percentage)
  //    ring         — compact circular gauge (fits beside an avatar)

  /** How the daily streak is visualised. */
  Streak_display: 'week_dots',
  // ⭐ week_dots — flame + this week's 7 days, today ringed until earned
  //    heat_grid — GitHub-style month grid, darker = more XP that day

  /** Leaderboard treatment. */
  Leaderboard_style: 'podium',
  // ⭐ podium — ceremonial top-3 podium, then ranked rows below
  //    rows   — plain ranked rows only (denser, less celebratory)

  /** Achievement badge treatment. */
  Badge_style: 'medallion',
  // ⭐ medallion — gold disc with locked silhouettes teasing the next unlock
  //    flat      — flat tonal chip (quieter, more grown-up)

  /* ─────────────────────────────────────────────────────────────────────────
   *  6. FEEDBACK & MOTION
   * ────────────────────────────────────────────────────────────────────── */

  /** What students see while a page is loading. */
  Loading_style: 'skeleton',
  // ⭐ skeleton — content-shaped placeholders (pages feel instant)
  //    spinner  — centred circular spinner
  //    wavy     — the animated wavy M3 Expressive progress bar

  /** Global animation budget. Students who set "reduce motion" on their device
   *  always get 'none' automatically, whatever is chosen here. */
  Motion_level: 'playful',
  // ⭐ playful — staggered entrances, spring presses, celebrations
  //    calm    — quick fades and simple easing only
  //    none    — no animation at all

  /** What happens on a level-up. */
  Celebration: 'confetti',
  // ⭐ confetti — confetti burst in the palette's own colors + number pop
  //    pulse    — a single tasteful scale pulse
  //    none     — no celebration animation
};

/* ============================================================================
 *  TYPES — the allowed values. Editing below this line changes what is legal;
 *  to just re-skin the app, only touch the block above.
 * ========================================================================= */

export type PaletteName =
  | 'sky' | 'nebula' | 'ocean' | 'meadow' | 'sunset' | 'cherry'
  | 'mint' | 'royal' | 'amber' | 'grape' | 'graphite';

export interface DesignConfig {
  Color_palette: PaletteName;
  Color_mode: 'system' | 'light' | 'dark';
  App_shell_navigation:
    | 'sidebar' | 'classic' | 'tonal' | 'inverse' | 'gradient' | 'minimal'
    | 'floating' | 'rail' | 'topbar' | 'pillbar';
  Mobile_navigation: 'dock' | 'floating' | 'iconic' | 'topline' | 'drawer';
  Shape_style: 'rounded' | 'soft' | 'sharp';
  Density: 'comfortable' | 'compact';
  Layout_density: 'platform' | 'floating';
  Card_style: 'filled' | 'elevated' | 'outlined' | 'gradient' | 'glass';
  List_style: 'grouped' | 'cards';
  Button_style: 'game' | 'pill' | 'squircle' | 'elevated';
  Input_style: 'filled' | 'outlined';
  Xp_display: 'gradient_bar' | 'segmented' | 'ring';
  Streak_display: 'week_dots' | 'heat_grid';
  Leaderboard_style: 'podium' | 'rows';
  Badge_style: 'medallion' | 'flat';
  Loading_style: 'skeleton' | 'spinner' | 'wavy';
  Motion_level: 'playful' | 'calm' | 'none';
  Celebration: 'confetti' | 'pulse' | 'none';
}

/** Every palette name, for building pickers/previews without retyping the list. */
export const ALL_PALETTES: readonly PaletteName[] = [
  'sky', 'nebula', 'ocean', 'meadow', 'sunset', 'cherry',
  'mint', 'royal', 'amber', 'grape', 'graphite',
] as const;

export default DESIGN;

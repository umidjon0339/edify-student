/**
 * Generates the Material Design 3 palette blocks in
 * `components/ui/theme.css` (the TEACHER kit) from the source colors below.
 *
 *   npx tsx scripts/genTeacherPalettes.mjs
 *
 * Requires `@material/material-color-utilities` (install with --no-save; it is
 * a generation-time-only dependency, never shipped):
 *   npm install --no-save @material/material-color-utilities
 * Run through tsx, not node — the package publishes extensionless ESM imports
 * that only a bundler-style resolver handles.
 *
 * Output is written between the T-PALETTES markers in components/ui/theme.css,
 * so the hand-written blocks in that file are preserved. To add a palette, add
 * a row to SOURCES, re-run, then add its name to `Color_palette` in
 * design.teacher.config.ts.
 *
 * Selector scheme (differs from the student generator on purpose):
 *   - `:root { … }`                                    default palette, light —
 *     the fallback that keeps toasts (portaled to <body>) and non-teacher
 *     pages resolving exactly like the pre-switchboard status quo.
 *   - `:root[data-t-palette="x"] { … }`                light values
 *   - `:root[data-t-palette="x"][data-t-mode="dark"]`  dark values
 *   - one `@media print` block re-pinning every palette's dark selector back
 *     to LIGHT values — printed A4 pages must always use light ink.
 * The `data-t-*` attributes are stamped on <html> by TeacherThemeProvider only
 * while the teacher layout is mounted, so nothing leaks into other role trees
 * (the student tree additionally re-declares every --m3-* var inside its own
 * scoped wrapper).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  Hct,
  SchemeTonalSpot,
  SchemeFidelity,
  SchemeNeutral,
  TonalPalette,
  MaterialDynamicColors,
  hexFromArgb,
  argbFromHex,
} from '@material/material-color-utilities';

/**
 * name → [source color, M3 scheme variant, optional tertiary override]
 *
 * The tertiary override `{ shift, chroma }` replaces the scheme's tertiary
 * palette with one at (source hue + shift). Used by 'sky' so its accent stays
 * in the blue/aqua family instead of the scheme's distant tertiary — a calm,
 * nearly monochrome look.
 *
 * ⚠️ Only HUE-PRESERVING variants belong here (SchemeExpressive rotates the
 * primary hue by +240° by design). The teacher panel is a professional tool,
 * so the roster leans muted:
 *   SchemeTonalSpot — source hue, disciplined chroma (the calm M3 classic)
 *   SchemeFidelity  — primary stays essentially the source color (for the
 *                     low-chroma sources TonalSpot would over-saturate)
 *   SchemeNeutral   — chroma ~0 (only right for the mono palette)
 * The script asserts the result stayed in the source hue family.
 */
const SOURCES = [
  ['sky',      '#1a73e8', SchemeFidelity, { shift: -28, chroma: 30, exam: 'tertiary' }], // Material (Google) blue → aqua tertiary; exams use that tertiary — current default
  ['indigo',   '#4f5bd5', SchemeFidelity],  // deep indigo — premium default
  ['ocean',    '#0a6dd1', SchemeTonalSpot], // heritage blue (calmer than before)
  ['midnight', '#33415c', SchemeFidelity],  // muted navy, near-mono
  ['emerald',  '#0b7a55', SchemeTonalSpot], // deep green
  ['teal',     '#0e7490', SchemeTonalSpot], // blue-green
  ['plum',     '#7c4d8f', SchemeTonalSpot], // muted purple
  ['wine',     '#8e2f4e', SchemeTonalSpot], // burgundy
  ['bronze',   '#8a6534', SchemeTonalSpot], // warm bronze
  ['steel',    '#5a6b85', SchemeFidelity],  // desaturated blue-grey
  ['graphite', '#4a5058', SchemeNeutral],   // true mono
];

/** The palette `:root` falls back to (must exist in SOURCES). */
const DEFAULT_PALETTE = 'sky';

/** M3 dynamic-color roles emitted for every palette, as `--m3-<kebab-name>`. */
const ROLES = [
  'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer',
  'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
  'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
  'error', 'onError', 'errorContainer', 'onErrorContainer',
  'background', 'onBackground',
  'surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant',
  'surfaceDim', 'surfaceBright',
  'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer',
  'surfaceContainerHigh', 'surfaceContainerHighest',
  'outline', 'outlineVariant',
  'inverseSurface', 'inverseOnSurface', 'inversePrimary',
  'shadow',
];

const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

function roleHex(scheme, role) {
  const dc = MaterialDynamicColors[role];
  if (!dc) throw new Error(`Unknown M3 role: ${role}`);
  return hexFromArgb(dc.getArgb(scheme)).toLowerCase();
}

/**
 * success / warning are not part of the M3 dynamic scheme, so they are derived
 * the way M3 derives error: fixed hues held to the scheme's own chroma
 * discipline. Chroma is clamped tighter than the student version — status
 * colors in a professional tool should read as state, not decoration.
 */
function statusTokens(sourceHct, isDark) {
  const build = (hue, chroma) => {
    const tone = (t) => hexFromArgb(Hct.from(hue, chroma, t).toInt()).toLowerCase();
    return isDark
      ? { main: tone(80), on: tone(20), container: tone(30), onContainer: tone(90) }
      : { main: tone(40), on: tone(100), container: tone(90), onContainer: tone(10) };
  };
  const chroma = Math.max(32, Math.min(sourceHct.chroma, 48));
  return {
    success: build(145, chroma),
    warning: build(75, chroma),
  };
}

/** Builds the scheme, applying the optional tertiary override. */
function buildScheme(src, SchemeCtor, isDark, tertiary) {
  const scheme = new SchemeCtor(src, isDark, 0);
  if (tertiary) {
    scheme.tertiaryPalette = TonalPalette.fromHueAndChroma(
      (src.hue + tertiary.shift + 360) % 360,
      tertiary.chroma,
    );
  }
  return scheme;
}

/**
 * Exam accent — marks the Imtihonlar nav group (SAT / Milliy sertifikat /
 * IELTS). A fixed +70° hue step from the source, so it is distinct from the
 * panel's own accent yet generated in the same chroma discipline.
 */
function examTokens(src, isDark, examHex, scheme) {
  // 'tertiary' = the exam accent IS the palette's own tertiary roles (sky:
  // the aqua) — in-system, distinct from the blue accent, both modes.
  // Standard M3 tones of the tertiary PALETTE (not the scheme's roles —
  // SchemeFidelity puts tertiaryContainer at a mid tone with near-black ink).
  if (examHex === 'tertiary') {
    const tone = (t) => hexFromArgb(scheme.tertiaryPalette.tone(t)).toLowerCase();
    return isDark
      ? [`  --t-exam: ${tone(80)};`, `  --t-exam-container: ${tone(30)};`, `  --t-on-exam-container: ${tone(90)};`]
      : [`  --t-exam: ${tone(40)};`, `  --t-exam-container: ${tone(90)};`, `  --t-on-exam-container: ${tone(10)};`];
  }
  // Or pin it to a named Material color: standard M3 roles from its tonal
  // palette (40/90/10 light, 80/30/90 dark).
  if (examHex) {
    const pal = TonalPalette.fromInt(argbFromHex(examHex));
    const tone = (t) => hexFromArgb(pal.tone(t)).toLowerCase();
    return isDark
      ? [`  --t-exam: ${tone(80)};`, `  --t-exam-container: ${tone(30)};`, `  --t-on-exam-container: ${tone(90)};`]
      : [`  --t-exam: ${tone(40)};`, `  --t-exam-container: ${tone(90)};`, `  --t-on-exam-container: ${tone(10)};`];
  }
  const hue = (src.hue + 70) % 360;
  const chroma = Math.max(28, Math.min(src.chroma, 44));
  const tone = (t) => hexFromArgb(Hct.from(hue, chroma, t).toInt()).toLowerCase();
  return isDark
    ? [`  --t-exam: ${tone(80)};`, `  --t-exam-container: ${tone(30)};`, `  --t-on-exam-container: ${tone(90)};`]
    : [`  --t-exam: ${tone(45)};`, `  --t-exam-container: ${tone(92)};`, `  --t-on-exam-container: ${tone(20)};`];
}

/**
 * Mode-INDEPENDENT accent — the one button color. M3 flips `primary` to a
 * pale tone in dark mode (correct for text on dark surfaces), but the product
 * wants buttons/chips identical in both modes, so filled buttons, gradient
 * chips and the active nav pill paint with --t-accent (tone 45 → ≥4.5:1 with
 * white) and --t-accent-strong (tone 35, gradient end), white ink. Only
 * --t-accent-text (ink for tinted, non-filled accent surfaces) follows the
 * mode: tone 40 light, tone 80 dark.
 */
function accentTokens(src, isDark) {
  const chroma = Math.max(48, src.chroma);
  const tone = (t) => hexFromArgb(Hct.from(src.hue, chroma, t).toInt()).toLowerCase();
  return [
    `  --t-accent: ${tone(45)};`,
    `  --t-accent-strong: ${tone(35)};`,
    `  --t-on-accent: #ffffff;`,
    `  --t-accent-text: ${isDark ? tone(80) : tone(40)};`,
  ];
}

/** One scheme (light or dark) → the token lines for it. */
function tokenLines(src, SchemeCtor, isDark, tertiary) {
  const scheme = buildScheme(src, SchemeCtor, isDark, tertiary);
  const lines = ROLES.map((r) => `  --m3-${kebab(r)}: ${roleHex(scheme, r)};`);

  // NOT the raw M3 scrim role (solid #000): the teacher kit has always baked
  // the overlay alpha into this var, and ~25 call sites use bg-scrim directly
  // as a dialog/drawer backdrop. Keep that contract.
  lines.push(`  --m3-scrim: rgba(0, 0, 0, ${isDark ? '0.6' : '0.45'});`);

  const st = statusTokens(src, isDark);
  for (const [key, v] of Object.entries(st)) {
    lines.push(`  --m3-${key}: ${v.main};`);
    lines.push(`  --m3-on-${key}: ${v.on};`);
    lines.push(`  --m3-${key}-container: ${v.container};`);
    lines.push(`  --m3-on-${key}-container: ${v.onContainer};`);
  }

  // Accent gradient (primary → tertiary of this same scheme) for gradient
  // buttons, hero headers and the 'aurora' page background — same-scheme stops
  // can never clash with the palette they decorate.
  lines.push(`  --t-grad-a: ${roleHex(scheme, 'primary')};`);
  lines.push(`  --t-grad-b: ${roleHex(scheme, 'tertiary')};`);
  lines.push(...examTokens(src, isDark, tertiary?.exam, scheme));
  lines.push(...accentTokens(src, isDark));
  return lines;
}

function paletteCss(name, sourceHex, SchemeCtor, tertiary) {
  const src = Hct.fromInt(argbFromHex(sourceHex));
  const light = tokenLines(src, SchemeCtor, false, tertiary);
  const dark = tokenLines(src, SchemeCtor, true, tertiary);
  const out = [];
  if (name === DEFAULT_PALETTE) {
    out.push(
      `/* Fallback: default palette, light — keeps toasts (portaled to <body>),\n` +
      `   first paint and non-teacher consumers resolving with no attributes set. */\n` +
      `:root {\n${light.join('\n')}\n}`,
    );
  }
  out.push(`:root[data-t-palette="${name}"] {\n${light.join('\n')}\n}`);
  out.push(`:root[data-t-palette="${name}"][data-t-mode="dark"] {\n${dark.join('\n')}\n}`);
  return { css: out.join('\n\n'), printOverride: `  :root[data-t-palette="${name}"][data-t-mode="dark"] {\n  ${light.join('\n  ')}\n  }` };
}

const banner = `/* ============================================================================
 * AUTO-GENERATED by scripts/genTeacherPalettes.mjs — DO NOT EDIT BY HAND.
 * ${SOURCES.length} Material Design 3 palettes, each a full dynamic-color scheme
 * (light + dark) generated from one source color via the official
 * @material/material-color-utilities HCT algorithm.
 *
 * Sources: ${SOURCES.map(([n, h]) => `${n} ${h}`).join(' · ')}
 *
 * To change palettes: edit SOURCES in the script and re-run it.
 * To SWITCH the active palette: set Color_palette in design.teacher.config.ts.
 * ========================================================================== */`;

/** Guard against hue-rotating scheme variants (greyscale exempt — hue is
 *  meaningless below ~5 chroma). */
function assertHuePreserved(name, sourceHex, SchemeCtor) {
  const src = Hct.fromInt(argbFromHex(sourceHex));
  const scheme = new SchemeCtor(src, false, 0);
  const got = Hct.fromInt(MaterialDynamicColors.primary.getArgb(scheme));
  if (got.chroma < 5) return { name, drift: 0, note: 'greyscale' };
  const drift = Math.min(
    Math.abs(got.hue - src.hue),
    360 - Math.abs(got.hue - src.hue),
  );
  if (drift > 45) {
    throw new Error(
      `${name}: ${SchemeCtor.name} rotated the primary hue ${drift.toFixed(0)}° ` +
        `(${sourceHex} → ${hexFromArgb(got.toInt())}). Use a hue-preserving variant.`,
    );
  }
  return { name, drift: +drift.toFixed(1), primary: hexFromArgb(got.toInt()) };
}

console.table(SOURCES.map(([n, h, S]) => assertHuePreserved(n, h, S)));

const generated = SOURCES.map(([n, h, S, tert]) => paletteCss(n, h, S, tert));
const printBlock =
  `/* Printed pages always use light ink, whatever mode the screen is in.\n` +
  `   (On-screen capture routes — /teacher/print — are additionally pinned to\n` +
  `   light by TeacherThemeProvider, since html-to-image snapshots the screen.) */\n` +
  `@media print {\n${generated.map((g) => g.printOverride).join('\n')}\n}`;

const css = [banner, ...generated.map((g) => g.css), printBlock].join('\n\n');

const FILE = new URL('../components/ui/theme.css', import.meta.url);
const START = '/* <<< T-PALETTES:START >>> */';
const END = '/* <<< T-PALETTES:END >>> */';

const existing = readFileSync(FILE, 'utf8');
const a = existing.indexOf(START);
const b = existing.indexOf(END);
if (a === -1 || b === -1) {
  throw new Error(`Markers ${START} / ${END} not found in components/ui/theme.css`);
}
const next = existing.slice(0, a + START.length) + '\n' + css + '\n' + existing.slice(b);
writeFileSync(FILE, next);

console.log(`✓ Wrote ${SOURCES.length} palettes (${SOURCES.length * 2} schemes) to components/ui/theme.css`);

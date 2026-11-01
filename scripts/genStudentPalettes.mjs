/**
 * Generates the Material Design 3 palette blocks in
 * `components/student-ui/theme.css` from the source colors below.
 *
 *   node scripts/genStudentPalettes.mjs
 *
 * Requires `@material/material-color-utilities` (install with --no-save; it is a
 * generation-time-only dependency, never shipped):
 *   npm install --no-save @material/material-color-utilities
 *
 * Output is written between the AUTO-GENERATED markers in theme.css, so hand
 * written token blocks in that file are preserved. To add a palette, add a row
 * to SOURCES, re-run, then add its name to `Color_palette` in design.config.ts.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  Hct,
  SchemeTonalSpot,
  SchemeVibrant,
  SchemeFidelity,
  SchemeNeutral,
  TonalPalette,
  MaterialDynamicColors,
  hexFromArgb,
  argbFromHex,
} from '@material/material-color-utilities';

/**
 * name → [source color, M3 scheme variant]
 *
 * ⚠️ Only HUE-PRESERVING variants belong here. SchemeExpressive rotates the
 * primary hue by +240° on purpose, so a violet source comes back green — it is
 * the wrong tool for a brand palette. Safe choices:
 *   SchemeVibrant   — source hue, high chroma (punchy; best for a gamified UI)
 *   SchemeTonalSpot — source hue, muted chroma (the classic, calmer M3 look)
 *   SchemeFidelity  — primary is essentially the source color itself
 *   SchemeNeutral   — chroma ~0 (greyscale; only right for a mono palette)
 * The script asserts the result stayed in the source hue family.
 */
const SOURCES = [
  // Edify style (2026-10-31): Material/Google blue, aqua tertiary, and a
  // mode-independent button accent (`edify: true`) — matches the teacher panel.
  ['sky',      '#1a73e8', SchemeFidelity, { shift: -28, chroma: 30, edify: true }], // default
  ['nebula',   '#6A4DE0', SchemeVibrant],   // violet
  ['ocean',    '#0A6DD1', SchemeVibrant],   // blue, kin to the teacher panel
  ['meadow',   '#3E8B10', SchemeVibrant],   // green
  ['sunset',   '#DE4D0A', SchemeVibrant],   // orange
  ['cherry',   '#C42A70', SchemeVibrant],   // pink-red
  ['mint',     '#0E8F80', SchemeVibrant],   // teal
  ['royal',    '#3B4CCA', SchemeFidelity],  // indigo
  ['amber',    '#C98600', SchemeVibrant],   // gold-yellow
  ['grape',    '#8B3FBF', SchemeVibrant],   // purple
  ['graphite', '#4A5568', SchemeNeutral],   // mono
];

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
  'shadow', 'scrim',
];

const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

function roleHex(scheme, role) {
  const dc = MaterialDynamicColors[role];
  if (!dc) throw new Error(`Unknown M3 role: ${role}`);
  return hexFromArgb(dc.getArgb(scheme)).toLowerCase();
}

/**
 * Semantic status colors (success / warning) are not part of the M3 dynamic
 * scheme, so they are derived the same way M3 derives error: a fixed hue held
 * at the scheme's own chroma/tone discipline, keeping them harmonious with the
 * palette instead of pasted-on.
 */
function statusTokens(sourceHct, isDark) {
  const build = (hue, chroma) => {
    const tone = (t) => hexFromArgb(Hct.from(hue, chroma, t).toInt()).toLowerCase();
    return isDark
      ? { main: tone(80), on: tone(20), container: tone(30), onContainer: tone(90) }
      : { main: tone(40), on: tone(100), container: tone(90), onContainer: tone(10) };
  };
  const chroma = Math.max(36, Math.min(sourceHct.chroma, 60));
  return {
    success: build(142, chroma),
    warning: build(75, chroma),
    // Gamification accent: the "gold" used by XP, streaks, medals and badges.
    gold: build(85, Math.max(48, chroma)),
  };
}

/**
 * Edify accent — ONE button color in both modes (mirrors the teacher
 * generator): tone 45 → tone 35 gradient, white ink; only the ink for tinted
 * accent surfaces follows the mode. `--t-fill-primary` re-points Tailwind's
 * `bg-primary` / `text-on-primary` (tailwind.config.ts) at the accent inside
 * this palette's wrapper only.
 */
function accentLines(src, isDark) {
  const chroma = Math.max(48, src.chroma);
  const tone = (t) => hexFromArgb(Hct.from(src.hue, chroma, t).toInt()).toLowerCase();
  return [
    `  --s-accent: ${tone(45)};`,
    `  --s-accent-strong: ${tone(35)};`,
    `  --s-on-accent: #ffffff;`,
    `  --s-accent-text: ${isDark ? tone(80) : tone(40)};`,
    `  --t-fill-primary: var(--s-accent);`,
    `  --t-on-fill-primary: var(--s-on-accent);`,
  ];
}

function paletteCss(name, sourceHex, SchemeCtor, opts) {
  const src = Hct.fromInt(argbFromHex(sourceHex));
  const out = [];

  for (const [mode, isDark] of [['light', false], ['dark', true]]) {
    const scheme = new SchemeCtor(src, isDark, 0);
    if (opts?.shift !== undefined) {
      scheme.tertiaryPalette = TonalPalette.fromHueAndChroma((src.hue + opts.shift + 360) % 360, opts.chroma);
    }
    const lines = ROLES.map((r) => `  --m3-${kebab(r)}: ${roleHex(scheme, r)};`);

    const st = statusTokens(src, isDark);
    for (const [key, v] of Object.entries(st)) {
      lines.push(`  --m3-${key}: ${v.main};`);
      lines.push(`  --m3-on-${key}: ${v.on};`);
      lines.push(`  --m3-${key}-container: ${v.container};`);
      lines.push(`  --m3-on-${key}-container: ${v.onContainer};`);
    }

    // Hero gradient: primary → tertiary of this same scheme, so it can never
    // clash with the palette it decorates.
    lines.push(`  --s-grad-a: ${roleHex(scheme, 'primary')};`);
    lines.push(`  --s-grad-b: ${roleHex(scheme, 'tertiary')};`);
    if (opts?.edify) lines.push(...accentLines(src, isDark));

    const sel =
      mode === 'light'
        ? `[data-palette="${name}"]`
        : `[data-palette="${name}"][data-mode="dark"], [data-mode="dark"] [data-palette="${name}"]`;
    out.push(`${sel} {\n${lines.join('\n')}\n}`);
  }
  return out.join('\n\n');
}

const banner = `/* ============================================================================
 * AUTO-GENERATED by scripts/genStudentPalettes.mjs — DO NOT EDIT BY HAND.
 * ${SOURCES.length} Material Design 3 palettes, each a full dynamic-color scheme
 * (light + dark) generated from one source color via the official
 * @material/material-color-utilities HCT algorithm.
 *
 * Sources: ${SOURCES.map(([n, h]) => `${n} ${h}`).join(' · ')}
 *
 * To change palettes: edit SOURCES in the script and re-run it.
 * To SWITCH the active palette: set Color_palette in design.config.ts.
 * ========================================================================== */`;

/**
 * Guard against picking a hue-rotating scheme variant by mistake: the light
 * primary must stay in the source's hue family. Greyscale schemes are exempt
 * because hue is meaningless below ~5 chroma.
 */
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

const css = [banner, ...SOURCES.map(([n, h, S, o]) => paletteCss(n, h, S, o))].join('\n\n');

const FILE = new URL('../components/student-ui/theme.css', import.meta.url);
const START = '/* <<< PALETTES:START >>> */';
const END = '/* <<< PALETTES:END >>> */';

const existing = readFileSync(FILE, 'utf8');
const a = existing.indexOf(START);
const b = existing.indexOf(END);
if (a === -1 || b === -1) {
  throw new Error(`Markers ${START} / ${END} not found in theme.css`);
}
const next = existing.slice(0, a + START.length) + '\n' + css + '\n' + existing.slice(b);
writeFileSync(FILE, next);

console.log(`✓ Wrote ${SOURCES.length} palettes (${SOURCES.length * 2} schemes) to components/student-ui/theme.css`);

// app/(student)/raschmodel/_components/LevelBadge.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/lib/AuthContext';
import { getRASCHLevels, mathLevel } from '@/services/RASCHProgressService';
import { MASTER_LEVEL, chanceAt, formatLevel, levelBand, type LevelBand } from '@/lib/RASCHscale';
import { BAND_LABEL, BAND_VARS } from '@/lib/RASCHband';
import { Card, Chip, cn, type ChipProps, type ProgressBarProps, type TileProps } from '@/components/student-ui';
import type { BandVars } from '@/lib/RASCHband';
import type { RASCHLevels } from '@/types/RASCH';
import type { Lang } from '@/types/Math';

/**
 * THE mathematics level, everywhere it appears.
 *
 * Three surfaces show it — the Rasch navbar (on every page of the suite), the
 * "My level" page, and the hub/dashboard summary — and they used to carry three
 * separate band→colour tables that had already drifted apart. One table lives
 * here now, with the two renderings that use it.
 */

// ─── band → colour ───────────────────────────────────────────────────────────

/**
 * The student kit's view of a band: the shared CSS vars from `lib/RASCHband.ts`
 * (which the TEACHER tree also reads — see that file for why the table lives
 * outside both kits) plus the student-ui tokens only this tree has.
 */
export const BAND_TONE: Record<LevelBand, BandVars & {
  chip: NonNullable<ChipProps['status']>;
  tile: NonNullable<TileProps['tone']>;
  bar: NonNullable<ProgressBarProps['tone']>;
  /** Token class, for the number when it sits on a plain surface. */
  text: string;
}> = {
  beginner: { ...BAND_VARS.beginner, chip: 'error', tile: 'error', bar: 'primary', text: 'text-error' },
  simple: { ...BAND_VARS.simple, chip: 'warning', tile: 'tertiary', bar: 'primary', text: 'text-tertiary' },
  easy: { ...BAND_VARS.easy, chip: 'info', tile: 'secondary', bar: 'primary', text: 'text-secondary' },
  medium: { ...BAND_VARS.medium, chip: 'primary', tile: 'primary', bar: 'primary', text: 'text-primary' },
  hard: { ...BAND_VARS.hard, chip: 'success', tile: 'success', bar: 'success', text: 'text-success' },
  olympiad: { ...BAND_VARS.olympiad, chip: 'gold', tile: 'gold', bar: 'gold', text: 'text-gold' },
};

export const bandTone = (level: number) => BAND_TONE[levelBand(level)];

const UI: Record<Lang, Record<string, string>> = {
  uz: {
    title: 'Matematika darajangiz',
    short: 'Daraja',
    ofEasy: 'oson', ofMedium: "o'rta", ofOlympic: 'olimpiada',
    dims: "o'lcham",
    hint: "5 balldan: 80% ishonch bilan yechadigan masala qiyinligi.",
    empty: 'Test topshiring',
  },
  ru: {
    title: 'Ваш уровень по математике',
    short: 'Уровень',
    ofEasy: 'лёгкие', ofMedium: 'средние', ofOlympic: 'олимпиадные',
    dims: 'измерений',
    hint: 'Из 5: сложность задачи, которую вы решаете уверенно (80%).',
    empty: 'Пройдите тест',
  },
  en: {
    title: 'Your mathematics level',
    short: 'Level',
    ofEasy: 'easy', ofMedium: 'medium', ofOlympic: 'olympiad',
    dims: 'dimensions',
    hint: 'Out of 5: the difficulty you solve reliably (80%).',
    empty: 'Sit a test',
  },
};

// ─── the gauge ───────────────────────────────────────────────────────────────

const R = 8;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * A ring, not a bar. At the sizes this renders (16px in the navbar) a bar is a
 * few grey pixels; a ring reads as a proportion at a glance and costs nothing —
 * it is two SVG circles, no library.
 */
function Ring({ level, color, className }: { level: number; color: string; className?: string }) {
  const filled = Math.max(0, Math.min(1, level / MASTER_LEVEL));
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={cn('-rotate-90', className)}>
      <circle cx="10" cy="10" r={R} fill="none" stroke={color} strokeWidth="3.5" opacity={0.22} />
      <circle
        cx="10" cy="10" r={R} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round"
        strokeDasharray={`${filled * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
      />
    </svg>
  );
}

// ─── the navbar chip ─────────────────────────────────────────────────────────

/**
 * The level, parked in the Rasch navbar on every page of the suite.
 *
 * It reads the levels document through `getRASCHLevels`, which is
 * localStorage-cached for 12h AND single-flighted per uid — so mounting it in a
 * bar that appears on six pages costs **zero** reads on a warm cache, and one
 * shared read cold even when the page underneath is reading the same document.
 *
 * ⚠️ It renders `null` until the read resolves and whenever nothing has been
 * measured. A placeholder would put a permanently empty pill in the navbar of
 * every student who has not sat a paper yet, which reads as broken; the level
 * simply appears once there is one.
 */
export function LevelChip({ lang, className }: { lang: Lang; className?: string }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [levels, setLevels] = useState<RASCHLevels | null>(null);
  const t = UI[lang];

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    getRASCHLevels(user.uid)
      .then((next) => { if (!cancelled) setLevels(next); })
      // A level is decoration on a navbar — never let it break navigation.
      .catch((err: unknown) => console.error('[RASCH] navbar level failed', err));
    return () => { cancelled = true; };
  }, [user, loading]);

  if (!levels) return null;
  const math = mathLevel(levels);
  if (math.measuredDimensions === 0) return null;

  const band = levelBand(math.level);
  const tone = BAND_TONE[band];
  // Already on the level page — the chip stays (it is the persistent readout the
  // whole point of this is), but it must not link to the page you are on.
  const onLevelPage = pathname === '/raschmodel/progress';

  const body = (
    <>
      <Ring level={math.level} color="currentColor" className="h-[18px] w-[18px] shrink-0" />
      <span className="s-num text-[14px] font-black leading-none tracking-tight">{formatLevel(math.level)}</span>
      <span className="s-num text-[10px] font-black leading-none opacity-60">/{MASTER_LEVEL}</span>
      {/* The band name is what keeps the colour from being the only signal.
          Dropped below `sm` so six navbar items still fit a 360px phone. */}
      <span className="hidden text-[11.5px] font-extrabold leading-none sm:inline">
        {BAND_LABEL[lang][band]}
      </span>
    </>
  );

  const shell = cn(
    // Matches the navbar chips it sits beside: 32px on a phone, 36px from `sm`.
    'inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 sm:h-9 sm:gap-1.5 sm:px-3',
    'transition-colors duration-m3-fast ease-m3-std',
    className,
  );

  const style = { backgroundColor: tone.container, color: tone.onContainer };

  return onLevelPage ? (
    <span className={shell} style={style} title={t.title}>{body}</span>
  ) : (
    <Link href="/raschmodel/progress" className={cn(shell, 's-press')} style={style} title={t.title}>
      {body}
    </Link>
  );
}

// ─── the compact card ────────────────────────────────────────────────────────

/**
 * The headline level on the "My level" page.
 *
 * Deliberately about half the height of the card it replaced: that one gave a
 * 60px number, a full-width track and a paragraph of scale theory the top third
 * of the page, pushing the seven dimensions — the thing the page is actually for
 * — below the fold on a phone.
 *
 * The colour now comes from the band rather than from `primary`, so the card
 * itself tells you where you stand before you read the number.
 */
export function LevelCard({
  level, theta, dimensionsMeasured, lang, className,
}: {
  level: number;
  theta: number;
  dimensionsMeasured: number;
  lang: Lang;
  className?: string;
}) {
  const band = levelBand(level);
  const tone = BAND_TONE[band];
  const t = UI[lang];
  const pct = (level / MASTER_LEVEL) * 100;

  return (
    <Card className={cn('overflow-hidden p-0', className)}>
      {/* Tinted header — a color-mix() gradient, NOT an opacity modifier: M3
          tokens are plain hex inside var(), so `bg-x-container/60` would render
          fully opaque (see CLAUDE.md). */}
      <div
        className="flex items-center gap-3 px-3.5 py-3"
        style={{
          color: tone.onContainer,
          backgroundImage: `linear-gradient(135deg, ${tone.container} 0%, color-mix(in oklab, ${tone.container} 55%, var(--m3-surface)) 100%)`,
        }}
      >
        <Ring level={level} color={tone.color} className="h-9 w-9 shrink-0" />

        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-black uppercase tracking-[0.08em] opacity-70">{t.title}</p>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="s-display s-num text-[30px] font-bold leading-none tracking-tight">
              {formatLevel(level)}
            </span>
            <span className="s-num text-[14px] font-black leading-none opacity-60">/ {MASTER_LEVEL}</span>
            <Chip status={tone.chip} className="ml-0.5">{BAND_LABEL[lang][band]}</Chip>
          </div>
        </div>

        <div className="s-num shrink-0 text-right text-[10.5px] font-black leading-tight opacity-70">
          <p>θ {theta.toFixed(2)}</p>
          <p>{dimensionsMeasured}/7 {t.dims}</p>
        </div>
      </div>

      <div className="px-3.5 pb-3.5 pt-3">
        {/* The 0–5 track, ticked where the whole numbers are. */}
        <div className="relative h-2 overflow-hidden rounded-full bg-surface-container-highest">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: tone.color }} />
        </div>
        <div className="relative mt-1 h-3.5">
          {Array.from({ length: MASTER_LEVEL + 1 }, (_, i) => i).map((tick) => (
            <span
              key={tick}
              className="s-num absolute -translate-x-1/2 text-[9.5px] font-black text-on-surface-variant"
              style={{ left: `${(tick / MASTER_LEVEL) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>

        {/* What the number MEANS, in problems rather than logits.
            ⚠️ THREE cells, not five: the bank has three difficulty grades and the
            blueprint only ever draws 2 and 3, so a "simple" or "olympiad" column
            would report a chance on questions the student is never asked. */}
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          {([1, 2, 3] as const).map((d) => (
            <div key={d} className="rounded-m3-sm bg-surface-container-high px-2 py-1 text-center">
              <p className="s-num text-[15px] font-black leading-none" style={{ color: tone.color }}>
                {chanceAt(level, d)}%
              </p>
              <p className="mt-0.5 text-[9.5px] font-black uppercase tracking-wider text-on-surface-variant">
                {d === 1 ? t.ofEasy : d === 2 ? t.ofMedium : t.ofOlympic}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-2 text-[10.5px] font-medium text-on-surface-variant">{t.hint}</p>
      </div>
    </Card>
  );
}

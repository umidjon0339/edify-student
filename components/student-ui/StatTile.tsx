'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from './cn';
import { MOTION_ON } from './config';

/** Counts up to `value` once the element scrolls into view. */
function useCountUp(value: number, enabled: boolean) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(enabled ? 0 : value);

  useEffect(() => {
    if (!enabled) {
      setShown(value);
      return;
    }
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / 900);
          const eased = 1 - Math.pow(1 - p, 3);
          setShown(Math.round(value * eased));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, enabled]);

  return { ref, shown };
}

export interface StatTileProps {
  label: string;
  value: number | string;
  /** Change indicator, e.g. "+320 this week". */
  delta?: { value: string; direction: 'up' | 'down' | 'flat' };
  icon?: React.ReactNode;
  tone?: 'surface' | 'primary' | 'secondary' | 'gold';
  /** Sparkline data — a small trend line drawn under the number. */
  trend?: number[];
  className?: string;
}

const TILE_TONES = {
  surface: 's-panel text-on-surface',
  primary: 'bg-primary-container text-on-primary-container',
  secondary: 'bg-secondary-container text-on-secondary-container',
  gold: 'bg-gold-container text-on-gold-container',
} as const;

/** A single headline number with optional change indicator and sparkline. */
export function StatTile({ label, value, delta, icon, tone = 'surface', trend, className }: StatTileProps) {
  const numeric = typeof value === 'number';
  const { ref, shown } = useCountUp(numeric ? value : 0, numeric && MOTION_ON);

  return (
    <div className={cn('rounded-m3-lg p-s-card', TILE_TONES[tone], className)}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11.5px] font-black uppercase tracking-[0.09em] opacity-75">{label}</span>
      </div>
      <div className="s-display s-num mt-1 text-[clamp(26px,3.4vw,34px)] font-bold leading-tight">
        {numeric ? <span ref={ref}>{shown.toLocaleString()}</span> : value}
      </div>
      {delta && (
        <span
          className={cn(
            'mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-black',
            delta.direction === 'up' && 'bg-success-container text-on-success-container',
            delta.direction === 'down' && 'bg-error-container text-on-error-container',
            delta.direction === 'flat' && 'bg-surface-container-high text-on-surface-variant',
          )}
        >
          {delta.direction === 'up' ? '▲' : delta.direction === 'down' ? '▼' : '—'} {delta.value}
        </span>
      )}
      {/* ⚠️ A flat series is NOT drawn. With every point equal (the common case:
          a student whose last 7 days are all 0 XP) the line lands on the baseline
          and renders as a hard rule across the tile with a dot on the end — it
          reads as a divider or a glitch, not as data, and it makes this tile
          taller than its neighbours for no information. No variation ⇒ no chart. */}
      {trend && trend.length > 1 && Math.min(...trend) !== Math.max(...trend) && (
        <Sparkline data={trend} className="mt-3" />
      )}
    </div>
  );
}

/**
 * Small trend line with an emphasised endpoint.
 *
 * ⚠️ Callers must skip it for a **flat** series (see `StatTile`): with
 * `max === min` the fallback `span = 1` puts every point on the baseline, which
 * draws a full-width rule instead of a trend.
 */
export function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const w = 160;
  const h = 40;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (w - 8) + 4;
    const y = h - 6 - ((d - min) / span) * (h - 14);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z`;
  const [lastX, lastY] = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn('h-10 w-full', className)} aria-hidden preserveAspectRatio="none">
      <path d={area} fill="currentColor" opacity="0.14" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3.5" fill="currentColor" />
    </svg>
  );
}

export interface StatBandProps {
  stats: readonly { label: string; value: number | string }[];
  className?: string;
}

/** The "player card" — a row of headline numbers. Edify style (2026-11-01):
 *  a glass panel with accent numbers, not a dark inverse slab. */
export function StatBand({ stats, className }: StatBandProps) {
  return (
    <div
      className={cn(
        's-panel flex flex-wrap justify-around gap-x-6 gap-y-5 rounded-m3-lg px-6 py-6 text-on-surface',
        className,
      )}
    >
      {stats.map((s) => (
        <StatBandCell key={s.label} {...s} />
      ))}
    </div>
  );
}

function StatBandCell({ label, value }: { label: string; value: number | string }) {
  const numeric = typeof value === 'number';
  const { ref, shown } = useCountUp(numeric ? value : 0, numeric && MOTION_ON);
  return (
    <div className="text-center">
      <div className="s-display s-num text-[clamp(24px,3.6vw,34px)] font-bold leading-tight text-primary">
        {numeric ? <span ref={ref}>{shown.toLocaleString()}</span> : value}
      </div>
      <div className="mt-0.5 text-[11.5px] font-bold opacity-70">{label}</div>
    </div>
  );
}

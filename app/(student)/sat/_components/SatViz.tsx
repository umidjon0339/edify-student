"use client";

import { useState } from "react";

import { SAT_MATH_DOMAINS, SAT_RW_DOMAINS, satDomainSlot } from "@/lib/SatMathQuiz";
import { cn } from "@/components/student-ui";
import type { SatQuizItem } from "@/types/SatQuiz";

/**
 * The SAT pages' small visuals — the subject illustration, the domain-mix bar
 * and the practice-score chart. Plain SVG/HTML on student tokens; the domain
 * colours are the fixed, validated `--s-viz-N` slots (student theme.css), keyed
 * by `satDomainSlot` so a domain keeps its colour in every chart.
 *
 * English-only chrome, like the rest of `/sat`.
 */

export type SatVizSubject = "math" | "english";

const vizColor = (slot: number) => (slot ? `var(--s-viz-${slot})` : "var(--m3-outline)");

// ─── the illustration ────────────────────────────────────────────────────────

/** Original decorative art per subject (aria-hidden — the title says it). Math:
 *  a coordinate grid, a line and a parabola. English: an open book. */
export function SatArt({ subject, className }: { subject: SatVizSubject; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("block", className)}>
      <rect width="64" height="64" rx="16" fill="var(--m3-primary-container)" />
      {subject === "math" ? (
        <g fill="none" strokeLinecap="round">
          {[16, 24, 32, 40, 48].map((v) => (
            <g key={v} stroke="var(--m3-outline-variant)" strokeWidth="1">
              <path d={`M${v} 12V52`} />
              <path d={`M12 ${v}H52`} />
            </g>
          ))}
          <path d="M12 40H52M24 12V52" stroke="var(--m3-on-primary-container)" strokeWidth="1.5" />
          <path d="M14 50L50 16" stroke="var(--s-viz-1)" strokeWidth="2.5" />
          <path d="M14 18Q32 66 50 18" stroke="var(--s-viz-2)" strokeWidth="2.5" />
          <circle cx="23" cy="41" r="3" fill="var(--s-viz-4)" stroke="var(--m3-primary-container)" strokeWidth="2" />
          <circle cx="41" cy="25" r="3" fill="var(--s-viz-3)" stroke="var(--m3-primary-container)" strokeWidth="2" />
        </g>
      ) : (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M32 20C26 16 18 16 12 18V48C18 46 26 46 32 50Z" fill="var(--m3-surface)" stroke="var(--m3-on-primary-container)" strokeWidth="1.5" />
          <path d="M32 20C38 16 46 16 52 18V48C46 46 38 46 32 50Z" fill="var(--m3-surface)" stroke="var(--m3-on-primary-container)" strokeWidth="1.5" />
          <g fill="none" strokeWidth="2">
            <path d="M17 25H27" stroke="var(--s-viz-1)" />
            <path d="M17 31H27" stroke="var(--s-viz-2)" />
            <path d="M17 37H24" stroke="var(--s-viz-3)" />
            <path d="M37 25H47" stroke="var(--s-viz-4)" />
            <path d="M37 31H47" stroke="var(--m3-outline)" />
            <path d="M37 37H44" stroke="var(--m3-outline)" />
          </g>
          <path d="M44 8L52 14L40 30L35 31L36 26Z" fill="var(--s-viz-2)" stroke="var(--m3-primary-container)" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}

// ─── the domain-mix bar ──────────────────────────────────────────────────────

/** Questions per domain over the items a student actually answers. */
export function domainMix(items: SatQuizItem[], subject: SatVizSubject) {
  const registry = subject === "math" ? SAT_MATH_DOMAINS : SAT_RW_DOMAINS;
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it.domain, (counts.get(it.domain) ?? 0) + 1);
  return registry
    .map((d) => ({ id: d.id, name: d.name.en || d.name.uz, count: counts.get(d.id) ?? 0, slot: satDomainSlot(d.id) }))
    .filter((d) => d.count > 0);
}

/**
 * One thin stacked bar (2px surface gaps, rounded ends) + a legend that
 * carries the counts as visible labels — required, since two light-mode slots
 * sit below 3:1 on the surface. Hover/focus a segment for its share.
 */
export function DomainMixBar({ items, subject }: { items: SatQuizItem[]; subject: SatVizSubject }) {
  const mix = domainMix(items, subject);
  const total = mix.reduce((s, d) => s + d.count, 0);
  const [hover, setHover] = useState<string | null>(null);
  if (total === 0) return null;

  const active = mix.find((d) => d.id === hover);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <div
          role="img"
          aria-label={`Questions by domain: ${mix.map((d) => `${d.name} ${d.count}`).join(", ")}`}
          className="flex h-2.5 w-full gap-[2px]"
        >
          {mix.map((d) => (
            <span
              key={d.id}
              tabIndex={0}
              onMouseEnter={() => setHover(d.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(d.id)}
              onBlur={() => setHover(null)}
              className="h-full rounded-[4px] outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-primary"
              style={{
                flexGrow: d.count,
                flexBasis: 0,
                background: vizColor(d.slot),
                opacity: hover && hover !== d.id ? 0.35 : 1,
              }}
            />
          ))}
        </div>
        {active && (
          <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-m3-sm bg-inverse-surface px-2.5 py-1 text-[11px] font-bold text-inverse-on-surface shadow-elev-2">
            {active.name} · <span className="s-num">{active.count}</span> questions · <span className="s-num">{Math.round((active.count / total) * 100)}%</span>
          </div>
        )}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {mix.map((d) => (
          <li key={d.id} className="flex items-center gap-1.5 text-[11px] font-medium text-on-surface-variant">
            <span className="h-2 w-2 flex-none rounded-full" style={{ background: vizColor(d.slot) }} />
            {d.name} <span className="s-num font-bold text-on-surface">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── the practice-score chart ────────────────────────────────────────────────

export interface ScorePoint {
  key: string;
  label: string;
  lower: number;
  upper: number;
  score: number;
}

const W = 320;
const H = 150;
const PAD = { l: 34, r: 10, t: 12, b: 24 };
const MIN = 200;
const MAX = 800;
const y = (v: number) => PAD.t + ((MAX - v) / (MAX - MIN)) * (H - PAD.t - PAD.b);

/**
 * The student's approximate score per practice test, in test order: a range
 * bar for the band + a dot at the persisted score. One series → no legend (the
 * heading names it). Recessive grid; hover/focus a test for its numbers; a
 * screen-reader table carries the same data.
 */
export function ScoreHistoryChart({ points }: { points: ScorePoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length === 0) return null;

  const step = (W - PAD.l - PAD.r) / points.length;
  const x = (i: number) => PAD.l + step * (i + 0.5);
  const active = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Your practice test scores">
        {[200, 400, 600, 800].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--m3-outline-variant)" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="var(--m3-on-surface-variant)" className="s-num">{v}</text>
          </g>
        ))}
        {points.map((p, i) => {
          const dim = hover !== null && hover !== i;
          const top = y(Math.max(p.upper, p.lower));
          const height = Math.max(4, y(Math.min(p.upper, p.lower)) - top);
          return (
            <g
              key={p.key}
              tabIndex={0}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="cursor-default outline-none"
              opacity={dim ? 0.35 : 1}
            >
              {/* generous hit target */}
              <rect x={x(i) - step / 2} y={PAD.t} width={step} height={H - PAD.t - PAD.b} fill="transparent" />
              <rect x={x(i) - 4} y={top} width={8} height={height} rx={4} fill="var(--m3-primary-container)" />
              <circle cx={x(i)} cy={y(p.score)} r={4.5} fill="var(--m3-primary)" stroke="var(--m3-surface)" strokeWidth={2} />
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fontWeight={700} fill="var(--m3-on-surface-variant)">
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      {active && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-m3-sm bg-inverse-surface px-2.5 py-1 text-[11px] font-bold text-inverse-on-surface shadow-elev-2"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          {active.label} · <span className="s-num">{active.lower === active.upper ? active.score : `${active.lower}–${active.upper}`}</span>
        </div>
      )}
      <table className="sr-only">
        <caption>Your practice test scores</caption>
        <thead><tr><th>Test</th><th>Score</th><th>Band</th></tr></thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.key}><td>{p.label}</td><td>{p.score}</td><td>{p.lower}–{p.upper}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useState } from "react";

import { SAT_MATH_DOMAINS, SAT_MATH_TAXONOMY_SLUG, SAT_RW_DOMAINS, satDomainSlot } from "@/lib/SatMathQuiz";
import type { SatImportOk } from "@/lib/SatQuestionImport";
import { cn } from "@/components/ui";
import type { DifficultyName } from "@/types/question";

/**
 * A domain-composition chart: one thin stacked bar per row group (questions by
 * SAT domain). The practice-bank tab passes one group per DIFFICULTY (Easy /
 * Medium / Hard). With `target`, the groups are modules: each row also shows
 * its difficulty split, and a tick marks the real SAT module length. Domain colours are the fixed, validated `--t-viz-N`
 * slots (components/ui/theme.css), keyed by `satDomainSlot` — the same colour
 * a domain has on the student's SAT page. One legend for all bars (≥ 2
 * series), carrying the totals as visible labels; hover/focus a segment for
 * that module's count.
 */

export interface ModuleRows {
  key: string;
  label: string;
  rows: SatImportOk[];
}

const vizColor = (slot: number) => (slot ? `var(--t-viz-${slot})` : "var(--m3-outline)");
const domainOf = (r: SatImportOk) => ((r.source.topic as { id?: string } | undefined)?.id ?? "");

export default function ModuleMixChart({
  subject, modules, target, labels,
}: {
  subject: string;
  modules: ModuleRows[];
  /** Module mode: real SAT module length (22 Math / 27 R&W), drawn as a tick. */
  target?: number;
  labels: { questions: string; target?: string; easy: string; medium: string; hard: string; byDomain: string };
}) {
  const [hover, setHover] = useState<string | null>(null);
  const registry = subject === SAT_MATH_TAXONOMY_SLUG ? SAT_MATH_DOMAINS : SAT_RW_DOMAINS;
  const domains = registry.map((d) => ({ id: d.id, name: d.name.en || d.name.uz, slot: satDomainSlot(d.id) }));
  const scale = Math.max(target ?? 0, ...modules.map((m) => m.rows.length), 1);
  const total = (id: string) => modules.reduce((s, m) => s + m.rows.filter((r) => domainOf(r) === id).length, 0);

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{labels.byDomain}</span>

      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {domains.map((d) => (
          <li key={d.id} className="flex items-center gap-1.5 text-[11.5px] font-medium text-on-surface-variant">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: vizColor(d.slot) }} />
            {d.name} <b className="tabular-nums text-on-surface">{total(d.id)}</b>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3">
        {modules.map((m) => {
          const counts = domains.map((d) => ({ ...d, n: m.rows.filter((r) => domainOf(r) === d.id).length })).filter((d) => d.n > 0);
          const diff = (name: DifficultyName) => m.rows.filter((r) => r.difficulty === name).length;
          const hovered = counts.find((d) => `${m.key}:${d.id}` === hover);
          return (
            <div key={m.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] font-bold text-on-surface">{m.label}</span>
                <span className="text-[11px] font-medium text-on-surface-variant">
                  <b className="tabular-nums text-on-surface">{m.rows.length}</b> {labels.questions}
                  {target !== undefined && (
                    <>
                      {" · "}{labels.easy} <span className="tabular-nums">{diff("easy")}</span>
                      {" · "}{labels.medium} <span className="tabular-nums">{diff("medium")}</span>
                      {" · "}{labels.hard} <span className="tabular-nums">{diff("hard")}</span>
                    </>
                  )}
                </span>
              </div>

              <div className="relative">
                <div className="relative h-3 w-full rounded-[4px] bg-surface-container-highest">
                  <div
                    role="img"
                    aria-label={`${m.label}: ${counts.map((d) => `${d.name} ${d.n}`).join(", ")}`}
                    className="absolute inset-y-0 left-0 flex gap-[2px]"
                    style={{ width: `${(m.rows.length / scale) * 100}%` }}
                  >
                    {counts.map((d) => {
                      const id = `${m.key}:${d.id}`;
                      return (
                        <span
                          key={d.id}
                          tabIndex={0}
                          onMouseEnter={() => setHover(id)}
                          onMouseLeave={() => setHover(null)}
                          onFocus={() => setHover(id)}
                          onBlur={() => setHover(null)}
                          className={cn("h-full rounded-[4px] outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-primary")}
                          style={{ flexGrow: d.n, flexBasis: 0, background: vizColor(d.slot), opacity: hover && hover !== id ? 0.35 : 1 }}
                        />
                      );
                    })}
                  </div>
                  {/* the real SAT module length */}
                  {target !== undefined && <span
                    aria-hidden
                    title={labels.target}
                    className="absolute -inset-y-1 w-[2px] rounded-full bg-on-surface"
                    style={{ left: `calc(${(target / scale) * 100}% - 1px)` }}
                  />}
                </div>
                {hovered && (
                  <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-m3-sm bg-inverse-surface px-2.5 py-1 text-[11px] font-bold text-inverse-on-surface shadow-elev-2">
                    {hovered.name} · <span className="tabular-nums">{hovered.n}</span> {labels.questions}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {target !== undefined && labels.target && (
        <p className="text-[11px] font-medium text-on-surface-variant">▏ {labels.target}</p>
      )}
    </div>
  );
}

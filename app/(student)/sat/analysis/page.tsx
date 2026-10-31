"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Gauge, Route, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { formatScoreBand } from "@/lib/SATscore";
import { Chip, EmptyState, Page, Skeleton, cn } from "@/components/student-ui";
import type { SatMathResult } from "@/types/SatQuiz";
import { ScoreHistoryChart, type ScorePoint } from "../_components/SatViz";
import {
  domainStats, filterBySource, isMockResult, loadMySatResults, summarise,
  type SatSource, type SatSubjectKey,
} from "../_components/satAnalysis";

/**
 * SAT analysis — the student's own sittings, the SAT twin of
 * /raschmodel/diagnosis (docs/SAT_QUIZ.md §Analysis). Reads only the
 * student's results (`studentId ==`), cached 60s with the hub's summary.
 * English-only chrome, like every SAT page.
 */

const t = {
  back: "SAT",
  title: "SAT analysis",
  subjects: { math: "Math", english: "Reading and Writing" } as Record<SatSubjectKey, string>,
  sources: { all: "All", mock: "Mocks", teacher: "Teacher tests" } as Record<SatSource, string>,
  latest: "Latest",
  best: "Best",
  average: "Average",
  sittings: "Sittings",
  sinceFirst: "since first",
  trend: "Score history",
  trendHint: "Bar = score band, dot = your score, oldest first.",
  domains: "By domain",
  domainsHint: "All sittings added up — weakest first.",
  focus: "Focus next",
  answers: "How you answered",
  correct: "Correct",
  wrong: "Wrong",
  blank: "Blank",
  blankTip: "You leave questions blank. A wrong answer costs nothing on the SAT — always answer.",
  wrongTip: "Most misses are wrong answers, not blanks — work the weakest domain above.",
  adaptive: "Module 2 routing",
  harderOf: (h: number, n: number) => `Harder Module 2 in ${h} of ${n}`,
  module1: "Module 1",
  module2: "Module 2",
  pacing: "Time used",
  pacingOf: (m: number, all: number) => `${m} of ${all} min on average`,
  recent: "Recent sittings",
  mock: "Mock",
  teacherTest: "Teacher",
  empty: "No sittings yet",
  emptyHint: "Take a mock and your analysis shows up here.",
  start: "Create a mock",
  failed: "Could not load your results.",
};

const SUBJECT_HREF: Record<SatSubjectKey, string> = { math: "/sat/math", english: "/sat/english" };

export default function SatAnalysisPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  const [data, setData] = useState<Record<SatSubjectKey, SatMathResult[]> | null>(null);
  const [failed, setFailed] = useState(false);
  const [subject, setSubject] = useState<SatSubjectKey>("math");
  const [source, setSource] = useState<SatSource>("all");

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    loadMySatResults(uid)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        // Open on the subject the student actually sat.
        if (d.math.length === 0 && d.english.length > 0) setSubject("english");
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setFailed(true);
      });
    return () => { cancelled = true; };
  }, [uid]);

  const rows = useMemo(() => filterBySource(data?.[subject] ?? [], source), [data, subject, source]);
  const sum = useMemo(() => summarise(rows, subject), [rows, subject]);
  const domains = useMemo(() => domainStats(rows, subject), [rows, subject]);

  const points: ScorePoint[] = useMemo(
    () => [...rows]
      .sort((a, b) => a.submittedAt - b.submittedAt)
      .map((r) => ({
        key: r.testId,
        label: r.testTitle,
        lower: r.scoreBand?.lower ?? r.scaledScore,
        upper: r.scoreBand?.upper ?? r.scaledScore,
        score: r.scaledScore,
      })),
    [rows],
  );

  const ans = sum.answers;
  const answered = ans.correct + ans.wrong + ans.blank;

  return (
    <Page>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 py-2">
        {/* ── header ── */}
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/sat" aria-label={t.back} className="s-panel grid h-10 w-10 place-items-center rounded-full text-on-surface s-press">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="s-display text-[22px] font-bold text-on-surface">{t.title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="s-panel inline-flex gap-0.5 rounded-full p-1" role="group">
            {(["math", "english"] as SatSubjectKey[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={subject === s}
                onClick={() => setSubject(s)}
                className={cn(
                  "h-9 rounded-full px-4 text-[13px] font-bold transition-colors",
                  subject === s ? "s-chip" : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                {t.subjects[s]}
                {data && <span className="s-num ml-1.5 opacity-70">{data[s].length}</span>}
              </button>
            ))}
          </div>
          <div className="s-panel inline-flex gap-0.5 rounded-full p-1" role="group">
            {(["all", "mock", "teacher"] as SatSource[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={source === s}
                onClick={() => setSource(s)}
                className={cn(
                  "h-9 rounded-full px-3.5 text-[12.5px] font-bold transition-colors",
                  source === s ? "s-chip" : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                {t.sources[s]}
              </button>
            ))}
          </div>
        </div>

        {failed ? (
          <div className="s-panel rounded-m3-lg p-5 text-[13px] font-bold text-error">{t.failed}</div>
        ) : !data ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} height={96} className="w-full rounded-m3-lg" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="s-panel rounded-m3-lg">
            <EmptyState
              icon={<Target size={28} />}
              title={t.empty}
              description={t.emptyHint}
              action={
                <Link href={SUBJECT_HREF[subject]} className="s-chip s-press inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-extrabold">
                  <Sparkles size={16} /> {t.start}
                </Link>
              }
            />
          </div>
        ) : (
          <>
            {/* ── headline numbers ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label={t.latest} value={sum.latest?.scoreBand ? formatScoreBand(sum.latest.scoreBand) : String(sum.latest?.scaledScore ?? "—")}>
                {sum.change !== null && sum.change !== 0 && (
                  <span className={cn("flex items-center gap-1 text-[11px] font-bold", sum.change > 0 ? "text-success" : "text-error")}>
                    {sum.change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    <span className="s-num">{sum.change > 0 ? "+" : ""}{sum.change}</span> {t.sinceFirst}
                  </span>
                )}
              </Tile>
              <Tile label={t.best} value={String(sum.best ?? "—")} />
              <Tile label={t.average} value={String(sum.average ?? "—")} />
              <Tile label={t.sittings} value={String(sum.sittings)} />
            </div>

            {/* ── score history ── */}
            {points.length > 0 && (
              <Panel title={t.trend} icon={<TrendingUp size={15} />} hint={t.trendHint}>
                <ScoreHistoryChart points={points} />
              </Panel>
            )}

            {/* ── domains, weakest first ── */}
            {domains.length > 0 && (
              <Panel title={t.domains} icon={<Target size={15} />} hint={t.domainsHint}>
                <ul className="flex flex-col gap-3">
                  {domains.map((d, i) => (
                    <li key={d.id} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[12.5px] font-bold text-on-surface">
                        <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: `var(--s-viz-${d.slot})` }} />
                        <span className="min-w-0 flex-1 truncate">{d.name}</span>
                        {i === 0 && domains.length > 1 && <Chip status="warning">{t.focus}</Chip>}
                        <span className="s-num text-on-surface-variant">{d.correct}/{d.total}</span>
                        <span className="s-num w-10 text-right font-black">{d.pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-container-highest">
                        <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: `var(--s-viz-${d.slot})` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {/* ── right / wrong / blank ── */}
              {answered > 0 && (
                <Panel title={t.answers} icon={<Gauge size={15} />}>
                  <div className="flex h-3 overflow-hidden rounded-full bg-surface-container-highest" role="img"
                    aria-label={`${t.correct} ${ans.correct}, ${t.wrong} ${ans.wrong}, ${t.blank} ${ans.blank}`}>
                    <div style={{ width: `${(ans.correct / answered) * 100}%`, background: "var(--m3-success)" }} />
                    <div style={{ width: `${(ans.wrong / answered) * 100}%`, background: "var(--m3-error)" }} />
                    <div style={{ width: `${(ans.blank / answered) * 100}%`, background: "var(--m3-outline)" }} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-bold text-on-surface-variant">
                    <Legend color="var(--m3-success)" label={t.correct} n={ans.correct} />
                    <Legend color="var(--m3-error)" label={t.wrong} n={ans.wrong} />
                    <Legend color="var(--m3-outline)" label={t.blank} n={ans.blank} />
                  </div>
                  {(ans.blank > 0 || ans.wrong > 0) && (
                    <p className="mt-2 text-[12px] font-medium text-on-surface-variant">
                      {ans.blank >= ans.wrong / 3 && ans.blank > 0 ? t.blankTip : t.wrongTip}
                    </p>
                  )}
                </Panel>
              )}

              {/* ── adaptive routing + pacing ── */}
              <Panel title={t.adaptive} icon={<Route size={15} />}>
                <p className="text-[13px] font-bold text-on-surface">{t.harderOf(sum.harder, sum.sittings)}</p>
                <div className="mt-2 flex flex-col gap-2">
                  <Bar label={t.module1} pct={sum.module1Pct} />
                  <Bar label={t.module2} pct={sum.module2Pct} />
                </div>
                {sum.avgMinutes !== null && (
                  <p className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-on-surface-variant">
                    <Clock size={13} /> {t.pacing}: <span className="s-num">{t.pacingOf(sum.avgMinutes, sum.allowedMinutes)}</span>
                  </p>
                )}
              </Panel>
            </div>

            {/* ── recent sittings ── */}
            <Panel title={t.recent} icon={<Clock size={15} />}>
              <ul className="flex flex-col gap-1.5">
                {[...rows].sort((a, b) => b.submittedAt - a.submittedAt).slice(0, 10).map((r) => (
                  <li key={r.testId} className="flex items-center gap-3 rounded-m3-md bg-state-hover px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-bold text-on-surface">{r.testTitle}</p>
                      <p className="s-num text-[11px] font-medium text-on-surface-variant">
                        {r.correct}/{r.total} · {new Date(r.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Chip status={isMockResult(r) ? "primary" : "neutral"}>{isMockResult(r) ? t.mock : t.teacherTest}</Chip>
                    <span className="s-num w-[76px] text-right text-[14px] font-black text-primary">
                      {r.scoreBand ? formatScoreBand(r.scoreBand) : r.scaledScore}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Link href={SUBJECT_HREF[subject]} className="s-chip s-press inline-flex h-11 items-center justify-center gap-2 self-center rounded-full px-6 text-[14px] font-extrabold">
              <Sparkles size={16} /> {t.start}
            </Link>
          </>
        )}
      </div>
    </Page>
  );
}

function Panel({ title, icon, hint, children }: { title: string; icon: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <section className="s-panel rounded-m3-lg p-4">
      <h2 className="flex items-center gap-2 text-[14px] font-bold text-on-surface">{icon} {title}</h2>
      {hint && <p className="mb-3 text-[11px] font-medium text-on-surface-variant">{hint}</p>}
      <div className={cn(!hint && "mt-3")}>{children}</div>
    </section>
  );
}

function Tile({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="s-panel flex flex-col gap-1 rounded-m3-lg p-3.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</span>
      <span className="s-num text-[22px] font-black leading-none text-on-surface">{value}</span>
      {children}
    </div>
  );
}

function Legend({ color, label, n }: { color: string; label: string; n: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label} <span className="s-num text-on-surface">{n}</span>
    </span>
  );
}

function Bar({ label, pct }: { label: string; pct: number | null }) {
  return (
    <div className="flex items-center gap-2 text-[12px] font-bold text-on-surface-variant">
      <span className="w-[68px] flex-none">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-highest">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct ?? 0}%` }} />
      </div>
      <span className="s-num w-10 text-right text-on-surface">{pct === null ? "—" : `${pct}%`}</span>
    </div>
  );
}

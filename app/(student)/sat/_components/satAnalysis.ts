// app/(student)/sat/_components/satAnalysis.ts
//
// The student's own SAT sittings, summarised — read by the /sat hub's summary
// card and by /sat/analysis (docs/SAT_QUIZ.md §Analysis). Two equality-only
// queries (`studentId ==`, the rule-provable clause), cached 60s module-level
// like every student page. Everything below `loadMySatResults` is pure.

import { SAT_MATH_DOMAINS, SAT_RW_DOMAINS, satDomainSlot } from "@/lib/SatMathQuiz";
import { SAT_MODULE_PLAN } from "@/lib/SatPractice";
import { listMySatMathResults } from "@/services/satMathQuizService";
import { listMySatEnglishResults } from "@/services/satEnglishQuizService";
import type { SatMathResult } from "@/types/SatQuiz";

export type SatSubjectKey = "math" | "english";
/** Where a sitting came from: a generated mock (own or shared) or a teacher's coded test. */
export type SatSource = "all" | "mock" | "teacher";

let cache: { uid: string; at: number; data: Record<SatSubjectKey, SatMathResult[]> } | null = null;
const TTL = 60_000;

export async function loadMySatResults(uid: string): Promise<Record<SatSubjectKey, SatMathResult[]>> {
  if (cache && cache.uid === uid && Date.now() - cache.at < TTL) return cache.data;
  const [math, english] = await Promise.all([
    listMySatMathResults(uid, 60),
    listMySatEnglishResults(uid, 60),
  ]);
  const data = { math, english };
  cache = { uid, at: Date.now(), data };
  return data;
}

/** Drop the cache — a subject page calls this after a submit. */
export const clearMySatResults = () => { cache = null; };

/** Generated mocks carry the `satp_` (Math) / `satep_` (R&W) id prefix. */
export const isMockResult = (r: SatMathResult) => r.testId.startsWith("satp_") || r.testId.startsWith("satep_");

export function filterBySource(rows: SatMathResult[], source: SatSource): SatMathResult[] {
  if (source === "all") return rows;
  return rows.filter((r) => (source === "mock" ? isMockResult(r) : !isMockResult(r)));
}

export interface DomainStat {
  id: string;
  name: string;
  slot: number;
  correct: number;
  total: number;
  pct: number;
}

/** Raw counts per domain summed over every sitting, weakest first. */
export function domainStats(rows: SatMathResult[], subject: SatSubjectKey): DomainStat[] {
  const registry = subject === "math" ? SAT_MATH_DOMAINS : SAT_RW_DOMAINS;
  const sum = new Map<string, { correct: number; total: number }>();
  for (const r of rows) {
    for (const [id, v] of Object.entries(r.domains ?? {})) {
      if (!v) continue;
      const cur = sum.get(id) ?? { correct: 0, total: 0 };
      cur.correct += v.correct;
      cur.total += v.total;
      sum.set(id, cur);
    }
  }
  return registry
    .map((d) => {
      const v = sum.get(d.id) ?? { correct: 0, total: 0 };
      return {
        id: d.id,
        name: d.name.en || d.name.uz,
        slot: satDomainSlot(d.id),
        ...v,
        pct: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
      };
    })
    .filter((d) => d.total > 0)
    .sort((a, b) => a.pct - b.pct);
}

export interface SatSummary {
  sittings: number;
  latest: SatMathResult | null;
  best: number | null;
  average: number | null;
  /** Latest minus first score; null with fewer than two sittings. */
  change: number | null;
  /** Right / wrong / blank over sittings that recorded blanks (`omitted`). */
  answers: { correct: number; wrong: number; blank: number; sittings: number };
  /** Sittings routed to the harder Module 2. */
  harder: number;
  /** Module 1 and Module 2 accuracy, 0–100 (null if nothing to divide). */
  module1Pct: number | null;
  module2Pct: number | null;
  /** Average minutes used vs the real test's total time. */
  avgMinutes: number | null;
  allowedMinutes: number;
}

export function summarise(rows: SatMathResult[], subject: SatSubjectKey): SatSummary {
  const oldestFirst = [...rows].sort((a, b) => a.submittedAt - b.submittedAt);
  const scores = oldestFirst.map((r) => r.scaledScore);
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);

  const answers = { correct: 0, wrong: 0, blank: 0, sittings: 0 };
  let m1c = 0, m1t = 0, m2c = 0, m2t = 0, secs = 0;
  for (const r of rows) {
    m1c += r.module1Correct; m1t += r.module1Total;
    m2c += r.module2Correct; m2t += r.module2Total;
    secs += r.durationSec || 0;
    // ⚠️ Pre-2026-09-16 sittings have no `omitted` — they cannot tell wrong from
    // blank, so they are left out of this split rather than counted as "0 blank".
    if (r.omitted) {
      const blank = r.omitted.length;
      answers.correct += r.correct;
      answers.blank += blank;
      answers.wrong += Math.max(0, r.total - r.correct - blank);
      answers.sittings += 1;
    }
  }

  const plan = SAT_MODULE_PLAN[subject === "math" ? "sat-matematika" : "sat-ingliz-tili"];
  return {
    sittings: rows.length,
    latest: oldestFirst[oldestFirst.length - 1] ?? null,
    best: scores.length ? Math.max(...scores) : null,
    average: scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length / 10) * 10 : null,
    change: scores.length >= 2 ? scores[scores.length - 1] - scores[0] : null,
    answers,
    harder: rows.filter((r) => r.route === "harder").length,
    module1Pct: pct(m1c, m1t),
    module2Pct: pct(m2c, m2t),
    avgMinutes: rows.length ? Math.round(secs / rows.length / 60) : null,
    allowedMinutes: plan.minutes * 2,
  };
}

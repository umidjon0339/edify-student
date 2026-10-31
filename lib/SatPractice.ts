// lib/SatPractice.ts
//
// PURE layer of the SAT PRACTICE BANK (2026-10-31, docs/SAT_QUIZ.md §Practice
// bank). Teachers bulk-import SAT questions into one shared pool (`sat_pool`,
// stored as chunks of `SatQuizItem`s); each student's SAT page then GENERATES a
// fresh, real-SAT-shaped test from that pool — the real per-module length and
// domain mix, a difficulty mix per module, picks spread across subtopics,
// questions the student has not seen preferred. The generated test is saved as
// the student's own `sat_*_tests` doc, so the runner, scoring and review need no
// change.

import type { SatImportOk } from '@/lib/SatQuestionImport';
import { normalizeQuestion, toQuestionV1 } from '@/lib/questionSchema';
import {
  SAT_MATH_DOMAINS, SAT_MATH_TAXONOMY_SLUG, SAT_RW_DOMAINS, SAT_RW_TAXONOMY_SLUG,
  defaultSatRoutingThreshold, satQuizItem,
} from '@/lib/SatMathQuiz';
import type { SatQuizItem } from '@/types/SatQuiz';

export type SatPracticeSubject = typeof SAT_MATH_TAXONOMY_SLUG | typeof SAT_RW_TAXONOMY_SLUG;

/** Real digital SAT module: questions per module, minutes, and the per-module
 *  domain mix (half of each published whole-test range), in presentation order. */
export const SAT_MODULE_PLAN: Record<SatPracticeSubject, { perModule: number; minutes: number; domains: [string, number][] }> = {
  [SAT_MATH_TAXONOMY_SLUG]: {
    perModule: 22,
    minutes: 35,
    domains: [['algebra', 7], ['advanced-math', 7], ['problem-solving-and-data-analysis', 4], ['geometry-and-trigonometry', 4]],
  },
  [SAT_RW_TAXONOMY_SLUG]: {
    perModule: 27,
    minutes: 32,
    domains: [['craft-and-structure', 7], ['information-and-ideas', 7], ['standard-english-conventions', 7], ['expression-of-ideas', 6]],
  },
};

// ─── teacher side: validated rows → pool items ──────────────────────────────

/**
 * Validated import rows → pool items, through the same `toQuestionV1` →
 * `normalizeQuestion` → `satQuizItem` path a bank pick takes into a test, plus
 * the subtopic (the generator spreads picks across it). Ids are batch-scoped
 * (`<batchId>-0001`) and STABLE — a student's past results key outcomes by item
 * id, which is how "not seen yet" works.
 */
export function buildSatPoolItems(
  ok: SatImportOk[],
  meta: { batchId: string; creatorId: string; creatorName: string },
): SatQuizItem[] {
  return ok.flatMap((r, i) => {
    const id = `${meta.batchId}-${String(i + 1).padStart(4, '0')}`;
    const v1 = toQuestionV1(r.source, {
      id, creatorId: meta.creatorId, creatorName: meta.creatorName,
      creationMethod: 'exam_import', timestamp: null,
    });
    const item = satQuizItem(normalizeQuestion(v1 as unknown as Record<string, unknown>, 'en'));
    if (!item) return [];
    const subtopic = (r.source.subtopic as { id?: string } | undefined)?.id;
    return [{ ...item, id, ...(subtopic ? { subtopic } : {}) }];
  });
}

/** Split items into chunks that each stay well under Firestore's 1 MiB doc cap. */
export function chunkSatPool(items: SatQuizItem[], maxBytes = 700_000): SatQuizItem[][] {
  const chunks: SatQuizItem[][] = [];
  let current: SatQuizItem[] = [];
  let size = 0;
  for (const item of items) {
    const bytes = new Blob([JSON.stringify(item)]).size;
    if (current.length && size + bytes > maxBytes) { chunks.push(current); current = []; size = 0; }
    current.push(item);
    size += bytes;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

// ─── student side: the generator ─────────────────────────────────────────────

type Bucket = 'easy' | 'medium' | 'hard';
const bucketOf = (q: SatQuizItem): Bucket => (q.difficultyId <= 1 ? 'easy' : q.difficultyId === 2 ? 'medium' : 'hard');

/** Difficulty mix per pool — Module 1 is a genuine mix; Module 2 leans by route. */
const MIX: Record<'module1' | 'module2Easier' | 'module2Harder', Record<Bucket, number>> = {
  module1: { easy: 1 / 3, medium: 1 / 3, hard: 1 / 3 },
  module2Easier: { easy: 0.5, medium: 0.4, hard: 0.1 },
  module2Harder: { easy: 0.1, medium: 0.4, hard: 0.5 },
};
/** Where a short bucket borrows from, nearest first. */
const FALLBACK: Record<Bucket, Bucket[]> = { easy: ['medium', 'hard'], medium: ['easy', 'hard'], hard: ['medium', 'easy'] };

/** n split by weights with largest-remainder rounding (sums to exactly n).
 *  Equal remainders are broken by a rotating `offset` (the domain's index), so
 *  the extra question does not land on the same difficulty in every domain. */
function apportion(n: number, mix: Record<Bucket, number>, offset = 0): Record<Bucket, number> {
  const keys: Bucket[] = ['easy', 'medium', 'hard'];
  const raw = keys.map((k) => n * mix[k]);
  const out = raw.map(Math.floor);
  const order = raw
    .map((v, i) => [v - Math.floor(v), i] as const)
    .sort((a, b) => b[0] - a[0] || ((a[1] - offset + 3) % 3) - ((b[1] - offset + 3) % 3));
  for (let i = 0; out.reduce((s, v) => s + v, 0) < n; i++) out[order[i % 3][1]] += 1;
  return { easy: out[0], medium: out[1], hard: out[2] };
}

export interface SatPracticeShortage { pool: string; domain: string; need: number; got: number }

export interface SatPracticePaper {
  module1: SatQuizItem[];
  module2Easier: SatQuizItem[];
  module2Harder: SatQuizItem[];
  routingThreshold: number;
  minutes: number;
  /** Domain slots the bank could not fill from that domain (filled from others). */
  shortages: SatPracticeShortage[];
}

/**
 * Build one practice test from the pool. Rules, per module and domain:
 *  - the domain's quota from `SAT_MODULE_PLAN`, split by the module's
 *    difficulty mix; a short difficulty borrows from the nearest one;
 *  - inside a bucket, the subtopic picked least so far in this module goes
 *    first ("one from each topic", then round again), ties random;
 *  - unseen questions before seen ones (`seen` = item ids from past results);
 *  - Module 1 is never repeated in Module 2. The two Module 2 pools MAY share
 *    questions — a student is only ever served one of them;
 *  - a domain the bank cannot fill is topped up from the other domains and
 *    reported in `shortages`.
 * Order: Math easiest → hardest; R&W grouped by domain in plan order, then by
 * difficulty — how the real modules present them.
 */
export function generateSatPractice(
  pool: SatQuizItem[],
  subject: SatPracticeSubject,
  { seen = new Set<string>(), random = Math.random }: { seen?: Set<string>; random?: () => number } = {},
): SatPracticePaper {
  const plan = SAT_MODULE_PLAN[subject];
  const registry = subject === SAT_MATH_TAXONOMY_SLUG ? SAT_MATH_DOMAINS : SAT_RW_DOMAINS;
  const shortages: SatPracticeShortage[] = [];
  // A random key per item, fixed for this generation — stable tie-breaks.
  const key = new Map(pool.map((q) => [q.id, random()]));
  const rank = (q: SatQuizItem) => (seen.has(q.id) ? 1 : 0) + (key.get(q.id) ?? 0) / 2;

  const build = (which: keyof typeof MIX, exclude: Set<string>): SatQuizItem[] => {
    const picked: SatQuizItem[] = [];
    const taken = new Set(exclude);
    const subtopicUse = new Map<string, number>();

    const take = (candidates: SatQuizItem[], count: number) => {
      let got = 0;
      while (got < count) {
        const free = candidates.filter((q) => !taken.has(q.id));
        if (!free.length) break;
        free.sort((a, b) => {
          const ua = subtopicUse.get(a.subtopic ?? '') ?? 0;
          const ub = subtopicUse.get(b.subtopic ?? '') ?? 0;
          return ua - ub || rank(a) - rank(b);
        });
        const q = free[0];
        taken.add(q.id);
        subtopicUse.set(q.subtopic ?? '', (subtopicUse.get(q.subtopic ?? '') ?? 0) + 1);
        picked.push(q);
        got += 1;
      }
      return got;
    };

    for (const [d, [domain, quota]] of plan.domains.entries()) {
      const inDomain = pool.filter((q) => q.domain === domain);
      const target = apportion(quota, MIX[which], d);
      let filled = 0;
      for (const b of ['easy', 'medium', 'hard'] as Bucket[]) {
        let need = target[b];
        need -= take(inDomain.filter((q) => bucketOf(q) === b), need);
        for (const alt of FALLBACK[b]) {
          if (need <= 0) break;
          need -= take(inDomain.filter((q) => bucketOf(q) === alt), need);
        }
        filled += target[b] - Math.max(0, need);
      }
      if (filled < quota) shortages.push({ pool: which, domain, need: quota, got: filled });
    }

    // Top up a short module from any domain, closest to this module's mix first.
    const missing = plan.perModule - picked.length;
    if (missing > 0) {
      const lean: Bucket[] = which === 'module2Harder' ? ['hard', 'medium', 'easy'] : which === 'module2Easier' ? ['easy', 'medium', 'hard'] : ['medium', 'easy', 'hard'];
      let left = missing;
      for (const b of lean) { if (left > 0) left -= take(pool.filter((q) => bucketOf(q) === b), left); }
    }

    const domainOrder = (q: SatQuizItem) => {
      const i = registry.findIndex((d) => d.id === q.domain);
      const p = plan.domains.findIndex(([d]) => d === q.domain);
      return p >= 0 ? p : i >= 0 ? 10 + i : 99;
    };
    return picked.sort((a, b) =>
      subject === SAT_MATH_TAXONOMY_SLUG
        ? a.difficultyId - b.difficultyId || (key.get(a.id) ?? 0) - (key.get(b.id) ?? 0)
        : domainOrder(a) - domainOrder(b) || a.difficultyId - b.difficultyId,
    );
  };

  const module1 = build('module1', new Set());
  const m1Ids = new Set(module1.map((q) => q.id));
  const module2Easier = build('module2Easier', m1Ids);
  const module2Harder = build('module2Harder', m1Ids);

  return {
    module1, module2Easier, module2Harder,
    routingThreshold: defaultSatRoutingThreshold(module1.length),
    minutes: plan.minutes,
    shortages,
  };
}

/** Questions a test needs from the bank to be generated at all (both modules). */
export const satPracticeMinimum = (subject: SatPracticeSubject) => SAT_MODULE_PLAN[subject].perModule * 2;

// services/satMockSourceService.ts
//
// Where a student's "Create a full SAT mock" draws its questions from
// (2026-10-31, docs/SAT_QUIZ.md §Student mocks). Three sources, merged and
// content-deduped, practice bank first:
//
//   1. PRACTICE BANK  — `sat_pool` (teachers' JSON imports, incl. whole mock files)
//   2. QUESTION BANK  — `teacher_questions` for the SAT subject that is meant
//                       to be shared: `sharedBank == true` uploads + the
//                       anonymous platform pool (`creatorId == ''`)
//   3. FULL MOCKS     — PLATFORM mock tests only: `sat_*_tests` with
//                       `teacherId == ''` + the bundled "Namunaviy" sample paper
//                       (Math). ⚠️ Teachers' own code-gated tests are NOT
//                       mined: that would show their exam questions to students
//                       before they sit it.
//
// Each source loads on its own (`allSettled`) — one failing (e.g. rules not yet
// deployed for `sat_pool`) never hides the others. Bank queries are capped
// (`BANK_CAP` newest per query) to bound reads per student session.

import { collection, getDocs, limit, query, where } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { SAT_MATH_TAXONOMY_SLUG, SAT_PLATFORM_CREATOR_ID, satQuizItem } from '@/lib/SatMathQuiz';
import type { SatPracticeSubject } from '@/lib/SatPractice';
import { fetchMyQuestionsPage, fetchSharedQuestionsPage } from '@/services/questionBankService';
import { loadSatPool } from '@/services/satPoolService';
import type { SatMathTest, SatQuizItem } from '@/types/SatQuiz';

/** Newest N per bank query — a student session must not read thousands of docs. */
const BANK_CAP = 300;
/** Platform mock tests read per subject. */
const PLATFORM_TEST_CAP = 10;

export interface SatMockSources {
  items: SatQuizItem[];
  /** Distinct questions each source contributed (after dedupe, in priority order). */
  counts: { bank: number; questions: number; mocks: number };
  /** Sources that could not be read — shown as a hint, never fatal. */
  failed: ('bank' | 'questions' | 'mocks')[];
}

const contentKey = (q: SatQuizItem) =>
  JSON.stringify([(q.question?.en || q.question?.uz || q.question?.ru || '').replace(/\s+/g, ' ').trim(), q.answer]);

export async function loadSatMockSources(slug: SatPracticeSubject): Promise<SatMockSources> {
  const isMath = slug === SAT_MATH_TAXONOMY_SLUG;
  const testsCollection = isMath ? 'sat_math_tests' : 'sat_english_tests';

  const [pool, shared, platform, platformTests, sample] = await Promise.allSettled([
    loadSatPool(slug),
    fetchSharedQuestionsPage(slug, BANK_CAP),
    fetchMyQuestionsPage(SAT_PLATFORM_CREATOR_ID, BANK_CAP, null, undefined, slug),
    getDocs(query(collection(db, testsCollection), where('teacherId', '==', SAT_PLATFORM_CREATOR_ID), limit(PLATFORM_TEST_CAP))),
    isMath ? import('@/lib/SatDefaultPaper').then((m) => m.loadSatSamplePaper()) : Promise.resolve(null),
  ]);

  const failed: SatMockSources['failed'] = [];
  const warn = (source: SatMockSources['failed'][number], r: PromiseSettledResult<unknown>) => {
    if (r.status === 'rejected') {
      failed.push(source);
      console.warn(`SAT mock source "${source}" unavailable:`, r.reason);
    }
  };
  warn('bank', pool);
  warn('questions', shared);
  warn('questions', platform);
  warn('mocks', platformTests);
  warn('mocks', sample);

  const fromBank = pool.status === 'fulfilled' ? pool.value : [];
  const fromQuestions = [shared, platform].flatMap((r) =>
    r.status === 'fulfilled'
      ? r.value.questions.flatMap((n) => {
        const item = satQuizItem(n);
        return item ? [{ ...item, ...(n.subtopicId ? { subtopic: n.subtopicId } : {}) }] : [];
      })
      : [],
  );
  const fromMocks: SatQuizItem[] = [
    ...(platformTests.status === 'fulfilled'
      ? platformTests.value.docs.flatMap((d) => {
        const t = d.data() as Partial<SatMathTest>;
        return [...(t.module1 ?? []), ...(t.module2Easier ?? []), ...(t.module2Harder ?? [])];
      })
      : []),
    ...(sample.status === 'fulfilled' && sample.value && !sample.value.problems.length
      ? [...sample.value.module1, ...sample.value.module2Easier, ...sample.value.module2Harder]
      : []),
  ];

  const seen = new Set<string>();
  const items: SatQuizItem[] = [];
  const add = (list: SatQuizItem[]) => {
    let n = 0;
    for (const q of list) {
      const key = contentKey(q);
      if (seen.has(key) || seen.has(`id:${q.id}`)) continue;
      seen.add(key);
      seen.add(`id:${q.id}`);
      items.push(q);
      n += 1;
    }
    return n;
  };
  const counts = { bank: add(fromBank), questions: add(fromQuestions), mocks: add(fromMocks) };
  return { items, counts, failed: [...new Set(failed)] };
}

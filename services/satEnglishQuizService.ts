// services/satEnglishQuizService.ts
//
// Every Firestore read and write for the teacher-built, adaptive SAT English
// (Reading & Writing) test (docs/SAT_QUIZ.md). A SIBLING of
// services/satMathQuizService.ts — own collections, own code namespace — not
// a parameterized shared module, matching the "own everything" pattern the
// rest of the SAT feature already established. The rules/arithmetic it
// shares with Math live in lib/SatMathQuiz.ts / lib/SATscore.ts; this file
// only talks to the database.

import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { newAccessCode } from '@/lib/RASCHquiz';
import { SAT_MAX_BYTES, satByteSize } from '@/lib/SatMathQuiz';
import type { SatMathTest, SatMathTestDraft, SatMathResult } from '@/types/SatQuiz';

const TESTS = 'sat_english_tests';
const RESULTS = 'sat_english_results';

/** How many times a colliding code is regenerated before we accept the risk. */
const CODE_ATTEMPTS = 5;

const fromDoc = (id: string, data: Record<string, unknown>): SatMathTest => ({
  id,
  title: '',
  description: '',
  teacherId: '',
  teacherName: '',
  accessCode: '',
  module1: [],
  module2Easier: [],
  module2Harder: [],
  module1Minutes: 32,
  module2Minutes: 32,
  routingThreshold: 0,
  shuffle: false,
  showAnswers: true,
  status: 'draft',
  createdAt: null,
  updatedAt: null,
  ...(data as Partial<SatMathTest>),
});

// ─── the access code ─────────────────────────────────────────────────────────

/**
 * A six-digit code no OTHER SAT English test is using.
 *
 * ⚠️ OWN NAMESPACE — checked only against `sat_english_tests`, never against
 * `sat_math_tests`/`milliy_quizzes`/`teacher_rasch_quizzes`. Same accepted
 * limitation as every other paper subsystem: a check, not a constraint.
 */
export async function reserveSatEnglishCode(): Promise<string> {
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
    const code = newAccessCode();
    const snap = await getDocs(query(collection(db, TESTS), where('accessCode', '==', code), limit(1)));
    if (snap.empty) return code;
  }
  return newAccessCode();
}

// ─── teacher: create / read / update / delete ────────────────────────────────

/** Reserves a client-side id so the builder can route before the first write. */
export const newSatEnglishTestId = (): string => `sate_${doc(collection(db, TESTS)).id}`;

/**
 * Writes the whole test document. One write, whatever its length.
 *
 * Refuses a payload that would not fit: a Firestore document is capped at
 * 1 MiB. Failing at the moment of saving a hand-built test is the worst thing
 * this feature could do to a teacher, so the ceiling is checked before the
 * write, not discovered from it.
 */
export async function saveSatEnglishTest(id: string, draft: SatMathTestDraft): Promise<void> {
  const bytes = satByteSize(draft.module1, draft.module2Easier, draft.module2Harder);
  if (bytes > SAT_MAX_BYTES) {
    throw new Error(`TEST_TOO_LARGE:${bytes}`);
  }

  const existing = await getDoc(doc(db, TESTS, id));

  await setDoc(
    doc(db, TESTS, id),
    {
      ...draft,
      id,
      // ⚠️ serverTimestamp() is never overwritten on an edit — `orderBy createdAt`
      // on the teacher's list depends on it.
      createdAt: existing.exists() ? existing.data().createdAt ?? serverTimestamp() : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: false },
  );
}

/** Flip a test between draft / published / closed without rewriting the body. */
export async function setSatEnglishTestStatus(id: string, status: SatMathTest['status']): Promise<void> {
  await updateDoc(doc(db, TESTS, id), { status, updatedAt: serverTimestamp() });
}

export async function deleteSatEnglishTest(id: string): Promise<void> {
  await deleteDoc(doc(db, TESTS, id));
}

/** One test by id. Used by the builder's `?id=` deep link. */
export async function getSatEnglishTest(id: string): Promise<SatMathTest | null> {
  const snap = await getDoc(doc(db, TESTS, id));
  return snap.exists() ? fromDoc(snap.id, snap.data()) : null;
}

/**
 * The teacher's own SAT English tests, newest first.
 *
 * ⚠️ Reads FULL documents (three embedded question arrays each), so it is
 * capped at 20 for the same reason `listMySatMathTests` is.
 *
 * Needs the composite index `sat_english_tests (teacherId ASC, createdAt DESC)`.
 */
export async function listMySatEnglishTests(teacherId: string, max = 20): Promise<SatMathTest[]> {
  const snap = await getDocs(
    query(
      collection(db, TESTS),
      where('teacherId', '==', teacherId),
      orderBy('createdAt', 'desc'),
      limit(max),
    ),
  );
  return snap.docs.map((d) => fromDoc(d.id, d.data()));
}

// ─── student: open by code ───────────────────────────────────────────────────

export type SatTestLookupError = 'not_found' | 'closed';

export type SatEnglishTestLookup = { test: SatMathTest } | { error: SatTestLookupError };

/**
 * The published SAT English test carrying this code.
 *
 * The status filter is applied CLIENT-side after the equality query, so a
 * closed test is reported as *closed* rather than as a wrong code — a student
 * told "wrong code" retypes it forever.
 */
export async function findSatEnglishTestByCode(code: string): Promise<SatEnglishTestLookup> {
  const snap = await getDocs(query(collection(db, TESTS), where('accessCode', '==', code), limit(2)));
  const matches = snap.docs.map((d) => fromDoc(d.id, d.data()));

  const published = matches.find((t) => t.status === 'published');
  if (published) return { test: published };

  if (matches.some((t) => t.status === 'closed')) return { error: 'closed' };
  return { error: 'not_found' };
}

// ─── student: generated practice tests (lib/SatPractice.ts) ─────────────────

/** Id for a student's generated practice test — the `satep_` prefix is how
 *  results/review tell a practice sitting from a teacher's test. */
export const newSatEnglishPracticeTestId = (): string => `satep_${doc(collection(db, TESTS)).id}`;

/**
 * How many tests this student owns — only generated practice tests (a student
 * never builds a teacher test) — numbers the next "Practice Test N".
 * Single-field equality: no composite index.
 */
export async function countMySatEnglishPracticeTests(uid: string): Promise<number> {
  const snap = await getCountFromServer(query(collection(db, TESTS), where('teacherId', '==', uid)));
  return snap.data().count;
}

// ─── results ─────────────────────────────────────────────────────────────────

/**
 * One document per student per test, at a DETERMINISTIC id — a retake
 * OVERWRITES rather than accumulating, the same rule every exam-shaped
 * collection in this repo follows.
 */
export const satEnglishResultId = (testId: string, uid: string) => `${testId}_${uid}`;

export async function saveSatEnglishResult(result: SatMathResult): Promise<void> {
  await setDoc(doc(db, RESULTS, satEnglishResultId(result.testId, result.studentId)), result);
}

/** Has this student already sat this test? One read; drives the "resit" notice. */
export async function getMySatEnglishResult(testId: string, uid: string): Promise<SatMathResult | null> {
  const snap = await getDoc(doc(db, RESULTS, satEnglishResultId(testId, uid)));
  return snap.exists() ? (snap.data() as SatMathResult) : null;
}

/**
 * Every sitting of one test, for its own teacher.
 *
 * Equality filters only — Firestore serves those from single-field indexes,
 * so the sort is done in memory. ⚠️ `teacherId` is in the query because the
 * read RULE proves ownership off that field: without it the query is not
 * provable and comes back permission-denied rather than empty.
 */
export async function listSatEnglishResults(testId: string, teacherId: string): Promise<SatMathResult[]> {
  const snap = await getDocs(
    query(
      collection(db, RESULTS),
      where('testId', '==', testId),
      where('teacherId', '==', teacherId),
    ),
  );
  return snap.docs
    .map((d) => d.data() as SatMathResult)
    .sort((a, b) => b.scaledScore - a.scaledScore || a.submittedAt - b.submittedAt);
}

/**
 * Every SAT English test THIS student has sat — newest first, for the list
 * under the code box.
 *
 * ⚠️ The `studentId ==` clause is what makes the query PROVABLE against the
 * read rule. Equality-only, so no composite index is needed and the sort is
 * done in memory.
 */
export async function listMySatEnglishResults(uid: string, max = 30): Promise<SatMathResult[]> {
  const snap = await getDocs(query(collection(db, RESULTS), where('studentId', '==', uid)));
  return snap.docs
    .map((d) => d.data() as SatMathResult)
    .sort((a, b) => b.submittedAt - a.submittedAt)
    .slice(0, max);
}

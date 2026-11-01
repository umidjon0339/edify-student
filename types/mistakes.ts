// types/mistakes.ts
//
// "MY MISTAKES" — the student's own bucket of questions they got WRONG or LEFT
// BLANK, kept so they can come back and practise. Contract: docs/MISTAKES.md.
//
// ⚠️ A blank is NOT the same as a wrong answer and is stored as its own
// `outcome`. Both score zero, but "you skipped 6" and "you misunderstood 6" are
// different problems, and the bucket is a LEARNING surface — collapsing them
// would throw away the more actionable half.
//
// ⚠️ The question is SNAPSHOTTED here, not referenced. The same trade every
// exam-shaped collection in this repo makes: the paper a mistake came from can
// be edited, closed or deleted, and a mistake the student can no longer read is
// worthless. It also means the bucket renders from ONE query — no fan-out read
// per row.

import type { Lang, LocalizedText } from './Math';

/** Which runner the mistake came out of. */
export type MistakeSource =
  | 'sat-math' | 'sat-english' | 'milliy' | 'rasch'
  // 2026-11-01: class assignments (the v1-normalized test runner) and the
  // Rasch hub's own practice drills (legacy `questions1` docs). Additive —
  // older clients just render the raw key until they learn the label.
  | 'class' | 'practice';

/** Wrong answer vs never answered. Both scored 0. */
export type MistakeOutcome = 'wrong' | 'blank';

/**
 * `student_mistakes/{studentId}_{slotKey}` — ONE document per student per
 * question slot.
 *
 * ⚠️ The deterministic id is what makes a repeat idempotent: missing the same
 * question again UPDATES the row (incrementing `timesWrong`) instead of piling
 * up duplicates, and re-opens it if the student had resolved it. Same rule
 * `attempts`, `teacher_rasch_results` and the SAT results already follow.
 */
export interface MistakeDoc {
  /** `${studentId}_${slotKey}`, and the doc id. */
  id: string;
  studentId: string;

  /**
   * The SLOT key, not always a bare question id: a `shared_options` block's
   * sub-question is `${questionId}#${partId}` (`examSlotKeys` in
   * lib/ExamTeacher.ts — the one place that vocabulary is defined). Sub-question
   * granularity is deliberate; "you failed part b" is the useful fact.
   */
  slotKey: string;
  /** The parent question's own id — `slotKey.split('#')[0]`. */
  questionId: string;

  source: MistakeSource;
  outcome: MistakeOutcome;

  /** Where it happened, for the row's subtitle. Snapshots, never re-read. */
  testId: string;
  testTitle: string;

  // ── the question snapshot (see the header note) ──────────────────────────
  question: LocalizedText;
  /** A block's shared stem, when the slot is part of one. */
  stem?: LocalizedText | null;
  imageUrl?: string | null;
  /** `['A','B','C','D']`; empty for a typed/numeric question. */
  optionKeys: string[];
  options: Record<string, LocalizedText>;
  /** Correct option letter, or the literal expected text for a typed question. */
  answer: string;
  explanation?: LocalizedText;
  /** The language the student sat it in — what the bucket renders by default. */
  examLang: Lang;

  // ── taxonomy, for the "practise 5 similar" lookup ────────────────────────
  //
  // ⚠️ `subtopicId` is '' for a SAT mistake: `SatQuizItem` only carries a
  // `domain` (topic level). The similar-question query is therefore written at
  // TOPIC level for every source, with subtopic used only to RANK the pool —
  // see services/mistakeService.ts.
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  subtopicId: string;
  subtopicName: string;
  difficultyId: number;

  /** How many separate sittings this slot has been missed in. */
  timesWrong: number;
  /** Epoch ms — matches every other exam-side timestamp (docs/DATA_MODEL.md). */
  lastMissedAt: number;

  /**
   * The student ticked it off. Kept (not deleted) so the bucket can show a
   * "sorted" pile and so `timesWrong` history survives; missing the question
   * again flips this back to false.
   */
  resolved: boolean;
  resolvedAt?: number;
}

/** What a runner hands `recordMistakes()` — the doc minus everything the
 *  service derives (id, studentId, counters, timestamps, resolved). */
export type MistakeEntry = Omit<
  MistakeDoc,
  'id' | 'studentId' | 'timesWrong' | 'lastMissedAt' | 'resolved' | 'resolvedAt'
>;

export const mistakeDocId = (studentId: string, slotKey: string) => `${studentId}_${slotKey}`;

export const MISTAKE_SOURCE_LABELS: Record<MistakeSource, { uz: string; ru: string; en: string }> = {
  'sat-math': { uz: 'SAT Matematika', ru: 'SAT Математика', en: 'SAT Math' },
  'sat-english': { uz: 'SAT Ingliz tili', ru: 'SAT Английский', en: 'SAT English' },
  milliy: { uz: 'Milliy sertifikat', ru: 'Национальный сертификат', en: 'Milliy sertifikat' },
  rasch: { uz: 'Sinov testi', ru: 'Пробный тест', en: 'Mock test' },
  class: { uz: 'Sinf topshirig‘i', ru: 'Задание класса', en: 'Class assignment' },
  practice: { uz: 'Mashq', ru: 'Тренировка', en: 'Practice' },
};

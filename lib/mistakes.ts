// lib/mistakes.ts
//
// The extraction layer of "My Mistakes" (docs/MISTAKES.md): turn one finished
// sitting into the list of slots the student got wrong or left blank. These are
// pure functions — they read nothing and write nothing;
// `services/mistakeService.ts` owns every Firestore call, and the three runners
// just call the extractor that matches their shape.
//
// (It is not import-free, though: `examSlotKeys`/`partKey` come from
// lib/ExamTeacher.ts, which does pull in the Firestore client. Re-deriving the
// slot vocabulary here to dodge that would be far worse — that module is
// explicitly "the one place the slot vocabulary is defined", and two spellings
// of a slot key is exactly the bug it warns about.)
//
// ⚠️ ONE extractor per result family because the three do NOT agree on what a
// key means:
//   • SAT    — `items` is keyed by plain question id, and `omitted` names blanks.
//   • Milliy / Rasch — `items` is keyed by `examSlotKeys` (`id` or `id#partId`),
//     and NOTHING records blanks, so "was it answered" has to be recomputed
//     from the answers map the runner still has in hand.
// Trying to serve all three from one signature is what would make this wrong.

import { examSlotKeys, partKey } from './ExamTeacher';
import { findSubject, findTopic } from './questionTopics';
import { hasAnswer, isAnswerCorrect, isBlockAnswer, isPartCorrect } from './questionSchema';
import type { ExamQuestion } from '@/types/Exam';
import type { Lang, LocalizedText, QuestionDoc } from '@/types/Math';
import type { NormalizedOption, NormalizedQuestion, QuestionCorrectAnswer } from '@/types/question';
import type { MistakeEntry, MistakeSource } from '@/types/mistakes';
import type { SatQuizItem } from '@/types/SatQuiz';

/** `"q123#partB"` → `"q123"`. A slot key without a `#` is already the id. */
export const questionIdOf = (slotKey: string) => slotKey.split('#')[0];

/**
 * Can this mistake draw a "practise 5 similar" set?
 *
 * Only if its subject/topic are real `data/question_topics.json` ids, because
 * the practice pool is `teacher_questions` and that is the vocabulary it is
 * filed under. ⚠️ A `questions1` (legacy bank) item does NOT qualify: that bank
 * uses its own numeric, zero-padded taxonomy (`lib/Mathstructure.ts`), bridged
 * to slugs only by POSITION inside the exam pipeline — its `topicId` would match
 * nothing here. Such a mistake is still saved and still fully reviewable; it
 * simply shows no practice set rather than an empty or wrong one.
 */
export const canPractise = (m: { subjectId: string; topicId: string }): boolean =>
  !!m.subjectId && !!m.topicId && !!findSubject(m.subjectId) && !!findTopic(m.subjectId, m.topicId);

// ─── SAT ─────────────────────────────────────────────────────────────────────

/**
 * SAT Math / English → mistakes.
 *
 * `omitted` (2026-09-16) is what separates blank from wrong; a sitting from
 * before that field existed passes `undefined` and every miss is recorded as
 * `wrong` — the honest reading, since we genuinely cannot tell.
 *
 * ⚠️ A SAT item carries a `domain` (topic) but no subtopic, so `subtopicId` is
 * deliberately `''` here rather than faked from the domain.
 */
export function satMistakes(params: {
  source: Extract<MistakeSource, 'sat-math' | 'sat-english'>;
  testId: string;
  testTitle: string;
  examLang: Lang;
  /** Every item the student was actually served (both modules). */
  items: SatQuizItem[];
  /** Question id → 1 right / 0 wrong. */
  outcomes: Record<string, number>;
  /** Ids left blank; `undefined` on a pre-2026-09-16 sitting. */
  omitted?: string[];
  subjectId: string;
  subjectName: string;
}): MistakeEntry[] {
  const blanks = new Set(params.omitted ?? []);
  const out: MistakeEntry[] = [];

  for (const item of params.items) {
    if (params.outcomes[item.id] === 1) continue; // got it right — nothing to learn
    out.push({
      slotKey: item.id,
      questionId: item.id,
      source: params.source,
      outcome: blanks.has(item.id) ? 'blank' : 'wrong',
      testId: params.testId,
      testTitle: params.testTitle,
      question: item.question,
      stem: null,
      imageUrl: item.imageUrl ?? null,
      optionKeys: item.optionKeys ?? [],
      options: item.options ?? {},
      answer: item.answer,
      explanation: item.explanation,
      examLang: params.examLang,
      subjectId: params.subjectId,
      subjectName: params.subjectName,
      topicId: item.domain,
      topicName: item.domainLabel?.en || item.domainLabel?.uz || item.domain,
      subtopicId: '',
      subtopicName: '',
      difficultyId: item.difficultyId ?? 2,
    });
  }
  return out;
}

// ─── Milliy sertifikat / Rasch (the ExamQuestion family) ─────────────────────

/**
 * Was this slot answered at all?
 *
 * ⚠️ The ANSWERS map and the OUTCOME map use different key spaces — `partKey`
 * (`id::partId`) vs `examSlotKeys` (`id#partId`), a distinction lib/ExamTeacher.ts
 * calls out explicitly. Reading the answers map with a slot key silently finds
 * nothing and would report every block part as blank.
 */
function slotAnswered(q: ExamQuestion, partId: string | null, answers: Record<string, string>): boolean {
  if (partId) return !!(answers[partKey(q.id, partId)] ?? '').trim();
  // A multi_part block counts as answered if ANY part was attempted — it is
  // graded all-or-nothing, so a half-done block is a wrong answer, not a blank.
  if (q.parts && q.parts.length > 0) {
    return q.parts.some((p) => !!(answers[partKey(q.id, p.id)] ?? '').trim());
  }
  return !!(answers[q.id] ?? '').trim();
}

/**
 * Milliy sertifikat or a teacher Rasch paper → mistakes, one per failed SLOT.
 *
 * Takes the questions and the raw answers the runner still holds, plus the
 * outcome map it just built, so grading is never recomputed here — the bucket
 * can never disagree with the score that was saved.
 */
export function examMistakes(params: {
  source: Extract<MistakeSource, 'milliy' | 'rasch'>;
  testId: string;
  testTitle: string;
  examLang: Lang;
  questions: ExamQuestion[];
  /** Slot key → 1 right / 0 wrong, exactly as written to the result doc. */
  outcomes: Record<string, number>;
  answers: Record<string, string>;
}): MistakeEntry[] {
  const out: MistakeEntry[] = [];

  for (const q of params.questions) {
    const keys = examSlotKeys(q);
    const isSharedBlock = q.qType === 'shared_options' && !!q.parts?.length;

    keys.forEach((slotKey, i) => {
      if (params.outcomes[slotKey] === 1) return;
      const part = isSharedBlock ? q.parts![i] : null;

      out.push({
        slotKey,
        questionId: q.id,
        source: params.source,
        outcome: slotAnswered(q, part?.id ?? null, params.answers) ? 'wrong' : 'blank',
        testId: params.testId,
        testTitle: params.testTitle,
        // For a shared_options sub-question the CARD is the part's prompt and
        // the block statement is the stem — rendering only `q.question` would
        // show the student the shared preamble and none of what was asked.
        question: part ? part.prompt : q.question,
        stem: part ? (q.stem ?? q.question) : (q.stem ?? null),
        imageUrl: q.imageUrl ?? null,
        optionKeys: part ? part.optionKeys : (q.optionKeys ?? Object.keys(q.options ?? {})),
        options: part ? part.options : (q.options ?? {}),
        answer: part ? part.answer : q.answer,
        explanation: part ? part.explanation : q.explanation,
        examLang: params.examLang,
        subjectId: q.subjectId ?? '',
        subjectName: q.subject ?? '',
        topicId: q.topicId ?? '',
        topicName: q.topic ?? '',
        subtopicId: q.subtopicId ?? '',
        subtopicName: q.subtopic ?? '',
        difficultyId: typeof q.difficultyId === 'number' ? q.difficultyId : 2,
      });
    });
  }
  return out;
}

// ─── Class assignments (v1-normalized questions) ─────────────────────────────

const optionMap = (list: NormalizedOption[]): Record<string, LocalizedText> =>
  Object.fromEntries(list.map((o) => [o.id, o.text]));

/** A letter, a set of letters (multiple_select) or the expected text. */
const answerText = (c: QuestionCorrectAnswer): string =>
  Array.isArray(c.value) ? c.value.join(', ') : c.value;

/**
 * A class assignment → mistakes (2026-11-01). The runner
 * (`app/(student)/classes/[classId]/test/[assignmentId]`) grades with
 * lib/questionSchema.ts, so this asks the SAME functions (`isAnswerCorrect`,
 * `isPartCorrect`) — never a re-implementation — and the bucket cannot
 * disagree with the score shown.
 *
 * A block is filed per PART (`${id}#${partId}`, the same slot vocabulary the
 * exam family uses) with the block statement as the stem. Its answer in
 * `answers[q.id]` is a `{ [partId]: value }` map.
 */
export function classMistakes(params: {
  testId: string;
  testTitle: string;
  examLang: Lang;
  questions: NormalizedQuestion[];
  /** Exactly what the runner wrote to `attempts.answers`. */
  answers: Record<string, unknown>;
}): MistakeEntry[] {
  const out: MistakeEntry[] = [];
  for (const q of params.questions) {
    const given = params.answers[q.id];
    const base = {
      questionId: q.id,
      source: 'class' as const,
      testId: params.testId,
      testTitle: params.testTitle,
      imageUrl: q.imageUrl ?? null,
      examLang: params.examLang,
      subjectId: q.subjectId ?? '',
      subjectName: q.subject ?? '',
      topicId: q.topicId ?? '',
      topicName: q.topic ?? '',
      subtopicId: q.subtopicId ?? '',
      subtopicName: q.subtopic ?? '',
      difficultyId: typeof q.difficultyId === 'number' ? q.difficultyId : 2,
    };

    if (q.isBlock && q.parts.length > 0) {
      const map = isBlockAnswer(given) ? given : {};
      for (const part of q.parts) {
        const value = map[part.id] as string | string[] | undefined;
        if (isPartCorrect(part, value)) continue;
        out.push({
          ...base,
          slotKey: `${q.id}#${part.id}`,
          outcome: hasAnswer(value) ? 'wrong' : 'blank',
          question: part.prompt,
          stem: q.question,
          optionKeys: part.optionList.map((o) => o.id),
          options: optionMap(part.optionList),
          answer: answerText(part.correctAnswer),
          explanation: part.explanation,
        });
      }
      continue;
    }

    const value = given as string | string[] | undefined;
    if (isAnswerCorrect(q, value)) continue;
    out.push({
      ...base,
      slotKey: q.id,
      outcome: hasAnswer(value) ? 'wrong' : 'blank',
      question: q.question,
      stem: null,
      optionKeys: q.optionList.map((o) => o.id),
      options: optionMap(q.optionList),
      answer: answerText(q.correctAnswer),
      explanation: q.explanation,
    });
  }
  return out;
}

// ─── Rasch practice drills (legacy `questions1` docs) ────────────────────────

/**
 * A Rasch hub practice drill → mistakes (2026-11-01). Single-choice
 * `QuestionDoc`s graded `answers[id] === answer`, exactly as the practice page
 * scores them. ⚠️ Legacy taxonomy: `canPractise()` will say no for these, so
 * the rows are reviewable but draw no "5 similar" set (see canPractise).
 */
export function practiceMistakes(params: {
  testId: string;
  testTitle: string;
  examLang: Lang;
  questions: QuestionDoc[];
  answers: Record<string, string>;
}): MistakeEntry[] {
  const out: MistakeEntry[] = [];
  for (const q of params.questions) {
    const given = params.answers[q.id] ?? '';
    if (given === q.answer) continue;
    out.push({
      slotKey: q.id,
      questionId: q.id,
      source: 'practice',
      outcome: given ? 'wrong' : 'blank',
      testId: params.testId,
      testTitle: params.testTitle,
      question: q.question,
      stem: null,
      imageUrl: null,
      optionKeys: Object.keys(q.options ?? {}),
      options: q.options ?? {},
      answer: q.answer,
      explanation: q.explanation,
      examLang: params.examLang,
      subjectId: q.subjectId ?? '',
      subjectName: q.subject ?? '',
      topicId: q.topicId ?? '',
      topicName: q.topic ?? '',
      subtopicId: q.subtopicId ?? '',
      subtopicName: q.subtopic ?? '',
      difficultyId: typeof q.difficultyId === 'number' ? q.difficultyId : 2,
    });
  }
  return out;
}

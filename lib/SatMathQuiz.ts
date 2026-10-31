// lib/SatMathQuiz.ts
//
// The pure layer of the teacher-built, ADAPTIVE SAT Math test
// (docs/SAT_QUIZ.md): the domain registry, turning a picked bank question into
// a stored `SatQuizItem`, the Module-1 → Module-2 routing rule, grading, and
// the arithmetic the builder/runner need. No Firestore here —
// services/satMathQuizService.ts owns every read and write.
//
// ⚠️ This does NOT go through lib/ExamTeacher.ts (`toExamItem`/`ExamQuestion`).
// That pipeline exists for the Milliy sertifikat DTM protocol — blueprint
// `sectionId`, `testType` Y-1/Y-2/O, block expansion — none of which applies
// to a SAT Math item, which is always a single `mcq` or `numeric` question. A
// dedicated converter avoids importing meaning that isn't there.

import { toLocalized } from './questionSchema';
import { normalizeAnswer } from './Examanswers';
import type { NormalizedQuestion } from '@/types/question';
import type { Lang, LocalizedText } from '@/types/Math';
import type { SatMathDomain, SatModuleRoute, SatQuizItem, SatRwDomain } from '@/types/SatQuiz';

// ─── the domain registry ─────────────────────────────────────────────────────

export interface SatMathDomainInfo {
  id: SatMathDomain;
  name: LocalizedText;
}

/**
 * The 4 official digital SAT Math domains, in College Board's own published
 * order. Mirrors the topics under the `sat-matematika` subject in
 * `data/question_topics.json` (`scripts/addSATMathTopics.mjs`) — the results
 * page and the builder's domain filter both read this list, so a domain
 * renamed in one place cannot drift from the other.
 */
export const SAT_MATH_DOMAINS: SatMathDomainInfo[] = [
  { id: 'algebra', name: toLocalized('Algebra') },
  { id: 'advanced-math', name: toLocalized('Advanced Math') },
  { id: 'problem-solving-and-data-analysis', name: toLocalized('Problem-Solving and Data Analysis') },
  { id: 'geometry-and-trigonometry', name: toLocalized('Geometry and Trigonometry') },
];

export const findSatMathDomain = (id: string): SatMathDomainInfo | undefined =>
  SAT_MATH_DOMAINS.find((d) => d.id === id);

export const SAT_MATH_TAXONOMY_SLUG = 'sat-matematika';

/**
 * The "no owner" sentinel used across the SAT feature for platform-owned
 * content — `sat_math_tests`' own bundled sample test uses `teacherId: ''`
 * (`scripts/createSatSampleTest.ts`); the donated 1,443-question SAT English
 * bank uses the SAME empty string as `teacher_questions.creatorId`
 * (`scripts/importSATEnglishQuestions.mjs`). `fetchMyQuestionsPage('')` reads
 * exactly this pool — `teacher_questions` rules are `allow read: if isAuth()`
 * for every signed-in user, so no rules change was needed to make one
 * teacher's picker see another "teacher"'s (here, nobody's) questions.
 */
export const SAT_PLATFORM_CREATOR_ID = '';

export interface SatRwDomainInfo {
  id: SatRwDomain;
  name: LocalizedText;
}

/**
 * The 4 official digital SAT Reading & Writing domains, in College Board's
 * own published order. Mirrors the topics under the `sat-ingliz-tili` subject
 * in `data/question_topics.json` (`scripts/addSATEnglishTopics.mjs`).
 */
export const SAT_RW_DOMAINS: SatRwDomainInfo[] = [
  { id: 'information-and-ideas', name: toLocalized('Information and Ideas') },
  { id: 'craft-and-structure', name: toLocalized('Craft and Structure') },
  { id: 'expression-of-ideas', name: toLocalized('Expression of Ideas') },
  { id: 'standard-english-conventions', name: toLocalized('Standard English Conventions') },
];

export const findSatRwDomain = (id: string): SatRwDomainInfo | undefined =>
  SAT_RW_DOMAINS.find((d) => d.id === id);

export const SAT_RW_TAXONOMY_SLUG = 'sat-ingliz-tili';

/**
 * A domain's FIXED chart colour slot, 1–4: its position in its own subject's
 * registry above (Algebra = 1 … Geometry = 4; Information and Ideas = 1 …).
 * Colour follows the domain, never its rank or count, so a test missing a
 * domain does not repaint the rest. Each UI kit maps the slot onto its own
 * validated token — `--s-viz-N` (student theme.css) / `--t-viz-N` (teacher).
 * 0 = not a SAT domain (draw it neutral).
 */
export function satDomainSlot(domain: string): number {
  const math = SAT_MATH_DOMAINS.findIndex((d) => d.id === domain);
  if (math >= 0) return math + 1;
  const rw = SAT_RW_DOMAINS.findIndex((d) => d.id === domain);
  return rw >= 0 ? rw + 1 : 0;
}

// ─── the section registry — which SAT sections exist ─────────────────────────

export type SatSectionKind = 'live' | 'soon';

export interface SatSection {
  /** Route segment under `/teacher/sat/` and `/sat/`. */
  id: 'math' | 'reading-writing';
  kind: SatSectionKind;
  name: LocalizedText;
  /** Teacher's builder route. `null` ⇒ the hub card is inert. */
  teacherHref: string | null;
  /** Student's code-entry route. `null` ⇒ the hub card is inert. */
  studentHref: string | null;
}

/**
 * ⚠️ **The single source of truth for "which SAT sections exist".** Both hubs
 * (`app/teacher/sat/page.tsx`, `app/(student)/sat/page.tsx`) read this list, so
 * a section can never be live in one place and missing from the other.
 *
 * Reading & Writing went live the same way every Milliy sertifikat subject
 * went from `soon` to `generic`: a taxonomy (`sat-ingliz-tili`, 4 domains,
 * `scripts/addSATEnglishTopics.mjs`), an import script
 * (`scripts/importSATEnglishQuestions.mjs` — the donated 1,443-question bank,
 * `questions.json` at the repo root, imported as PLATFORM-owned
 * `teacher_questions`, `creatorId: SAT_PLATFORM_CREATOR_ID`), and this
 * registry flip. It reuses the whole Math builder/runner/result SHAPE (own
 * collections `sat_english_tests`/`sat_english_results`, own code namespace,
 * own localStorage session key) — see docs/SAT_QUIZ.md.
 */
export const SAT_SECTIONS: SatSection[] = [
  {
    id: 'math',
    kind: 'live',
    name: { uz: 'Matematika', ru: 'Математика', en: 'Math' },
    teacherHref: '/teacher/sat/math',
    studentHref: '/sat/math',
  },
  {
    id: 'reading-writing',
    kind: 'live',
    name: { uz: 'Reading & Writing', ru: 'Reading & Writing', en: 'Reading & Writing' },
    teacherHref: '/teacher/sat/english',
    studentHref: '/sat/english',
  },
];

export const findSatSection = (id: string): SatSection | undefined =>
  SAT_SECTIONS.find((s) => s.id === id);

// ─── picking a question → a stored item ──────────────────────────────────────

/**
 * A `teacher_questions` document → a stored SAT test item, or `null` when the
 * question isn't one of the two shapes SAT Math authors (a stray
 * `true_false`/`open`/block picked up by a loose bank filter, say).
 *
 * ⚠️ `numeric` is SAT's "student-produced response" (grid-in) — already a
 * fully implemented type (docs/QUESTIONS.md), so no new question type exists
 * for it.
 */
export function satQuizItem(n: NormalizedQuestion): SatQuizItem | null {
  if (n.isBlock) return null;
  if (n.type !== 'mcq' && n.type !== 'numeric') return null;

  // Tries the Math registry first, then Reading & Writing's — a bank question
  // only ever belongs to one taxonomy subject, so at most one of these matches.
  const domain = findSatMathDomain(n.topicId) ?? findSatRwDomain(n.topicId);

  const item: SatQuizItem = {
    id: n.id,
    qType: n.type,
    domain: (domain?.id ?? (n.topicId as SatMathDomain)),
    domainLabel: domain?.name ?? toLocalized(n.topic || ''),
    difficultyId: n.difficultyId,
    question: n.question,
    imageUrl: n.imageUrl,
    optionKeys: n.optionList.map((o) => o.id),
    options: Object.fromEntries(n.optionList.map((o) => [o.id, o.text])),
    answer: Array.isArray(n.correctAnswer.value) ? (n.correctAnswer.value[0] ?? '') : n.correctAnswer.value,
  };

  const optionImages = Object.fromEntries(
    n.optionList.filter((o) => o.imageUrl).map((o) => [o.id, o.imageUrl]),
  );
  if (Object.keys(optionImages).length) item.optionImages = optionImages;

  if (n.correctAnswer.acceptedAnswers?.length) item.acceptedAnswers = n.correctAnswer.acceptedAnswers;
  if (n.explanation && (n.explanation.uz || n.explanation.ru || n.explanation.en)) item.explanation = n.explanation;
  if (n.creatorId) item.creatorId = n.creatorId;
  if (n.creatorName) item.creatorName = n.creatorName;
  if (n.correctedBy) item.correctedBy = n.correctedBy;

  return item;
}

/** Firestore's hard document limit is 1 MiB; leave room for the rest of the doc. */
export const SAT_MAX_BYTES = 900_000;

/** Rough serialized size of all three module pools together, in bytes. */
export function satByteSize(module1: SatQuizItem[], module2Easier: SatQuizItem[], module2Harder: SatQuizItem[]): number {
  return new Blob([JSON.stringify({ module1, module2Easier, module2Harder })]).size;
}

// ─── the add check ────────────────────────────────────────────────────────────

export type SatAddCheck =
  | { ok: true }
  | { ok: false; reason: 'duplicate' }
  | { ok: false; reason: 'unsupported' };

/**
 * May this item join the given module list? Unlike the Milliy sertifikat
 * pickers there is no slot/quota ceiling here — a teacher can make a module as
 * long or short as they like; publishing only requires each module to be
 * non-empty (checked by the builder, not here).
 */
export function checkSatAdd(items: SatQuizItem[], item: SatQuizItem | null): SatAddCheck {
  if (!item) return { ok: false, reason: 'unsupported' };
  if (items.some((q) => q.id === item.id)) return { ok: false, reason: 'duplicate' };
  return { ok: true };
}

/** Ids already on a module — the picker greys those rows out. */
export const satPickedIds = (items: SatQuizItem[]): Set<string> => new Set(items.map((q) => q.id));

// ─── routing: Module 1 score → which Module 2 pool ───────────────────────────

/** Default threshold: at least half of Module 1 correct routes to the harder pool. */
export const defaultSatRoutingThreshold = (module1Length: number): number => Math.ceil(module1Length / 2);

/**
 * Which Module 2 pool a student's Module 1 performance earns them — the real
 * digital SAT's own per-module (not per-question) adaptivity. `>=` the
 * threshold routes harder; below routes easier.
 */
export function routeForModule1(correct: number, threshold: number): SatModuleRoute {
  return correct >= threshold ? 'harder' : 'easier';
}

// ─── grading ──────────────────────────────────────────────────────────────────

/**
 * Is this student's answer to one `SatQuizItem` correct?
 *
 * `mcq` is an exact letter match. `numeric` reuses the SAME answer normalizer
 * the rest of the app's typed grading uses (`lib/Examanswers.ts::normalizeAnswer`)
 * — LaTeX/unicode folded, brackets and spaces stripped — plus a numeric-value
 * fallback so `"16.25"` and `"16,25"` agree, and checks every accepted
 * spelling, not just the primary one.
 */
export function isSatItemCorrect(item: SatQuizItem, given: string | undefined | null): boolean {
  const value = (given ?? '').trim();
  if (!value) return false;

  if (item.qType === 'mcq') return value === item.answer;

  const forms = [item.answer, ...(item.acceptedAnswers ?? [])].map(normalizeAnswer).filter(Boolean);
  const normGiven = normalizeAnswer(value);
  if (!normGiven) return false;
  if (forms.includes(normGiven)) return true;

  const num = (s: string): number | null => (/^[+-]?\d+(\.\d+)?$/.test(s) ? Number(s) : null);
  const givenNum = num(normGiven);
  if (givenNum === null) return false;
  return forms.some((f) => {
    const n = num(f);
    return n !== null && Math.abs(n - givenNum) < 1e-9;
  });
}

// ─── misc ──────────────────────────────────────────────────────────────────────

/** Fisher–Yates. Every SAT item is a standalone card, so nothing else to preserve. */
export function shuffleSatItems(items: SatQuizItem[]): SatQuizItem[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Preview text for a builder row — the item is trilingual, the list is not. */
export function satItemPreview(q: SatQuizItem, lang: Lang, max = 110): string {
  const raw = q.question?.[lang] || q.question?.uz || q.question?.ru || q.question?.en || '';
  const flat = raw.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/** True for the two question types SAT Math authors — used to filter a bank picker. */
export const isSatAuthorableType = (n: NormalizedQuestion): boolean =>
  !n.isBlock && (n.type === 'mcq' || n.type === 'numeric');

/** SAT English authors ONLY `mcq` — the real digital SAT Reading & Writing
 *  section has no grid-in/"student-produced response" questions, unlike Math. */
export const isSatEnglishAuthorableType = (n: NormalizedQuestion): boolean =>
  !n.isBlock && n.type === 'mcq';

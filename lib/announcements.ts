// lib/announcements.ts
//
// **THE ONE FILE TO EDIT TO ANNOUNCE SOMETHING TO STUDENTS.**
//
// The student dashboard carries a single rotating announcement card
// (`app/(student)/dashboard/_components/AnnouncementCarousel.tsx`). This file is
// its content — a plain array, bundled at build time, so an announcement costs
// **zero Firestore reads** and ships in a reviewable diff.
//
// ## To announce the next thing
//
// Add an entry **at the top** of `ANNOUNCEMENTS` (first = shown first) with a new
// `id`, and delete or expire the one it replaces. Nothing else moves: the card,
// the rotation, the dots, the swipe and the three languages are generic.
//
// - **Retiring one without deleting it**: give it `until: '2026-09-01'` and it
//   stops rendering on its own. `from` does the same in reverse for something
//   that should appear later. ⚠️ Both are compared against the **device clock**
//   (this is a banner, not an exam deadline — see docs/STUDENT.md for where that
//   distinction matters).
// - **A one-liner is fine**: every text field takes a bare string, which fills
//   all three languages with the same text. Use a `{uz, ru, en}` object as soon
//   as a translation exists — a student who picked Russian should not get an
//   empty card.
// - ⚠️ **Never hardcode a number that the code owns.** The maths paper's shape
//   (`45 / 150 / 100`) is read from `lib/Examblueprint.ts` + `lib/RASCHmarks.ts`
//   below, so an announcement cannot advertise a paper this app does not serve.
// - ⚠️ **Keep `id` stable.** It is the React key and it is what a future
//   "seen"/dismissed marker would be stored under; renaming one re-announces it.
//
// No Firestore, no fetch, no `Date.now()` at module scope — the window filter
// runs per render so a card left open overnight still ages correctly.

import {
  Atom, BadgeCheck, BookText, Dna, FlaskConical, Sigma, Sparkles, Target,
  type LucideIcon,
} from 'lucide-react';

import { EXAM_DURATION_MINUTES, EXAM_TOTAL_QUESTIONS } from './Examblueprint';
import { MILLIY_SUBJECTS } from './MilliyQuiz';
import { PAPER_TOTAL } from './RASCHmarks';
import type { Lang, LocalizedText } from '@/types/Math';

/** A bare string means "the same text in all three languages" (see `say`). */
export type Sayable = string | LocalizedText;

/** A card colour on the dashboard deck — the deep, mode-independent pairs live in components/student-ui/theme.css (`[data-tone]`, `.s-deck-card`). */
export type AnnouncementTone = 'sky' | 'violet' | 'green' | 'teal' | 'amber' | 'rose' | 'indigo';

export interface AnnouncementCta {
  label: Sayable;
  href: string;
  /** `filled` is the primary action. At most one per announcement; the rest are outlined. */
  variant?: 'filled' | 'outlined';
}

export interface Announcement {
  /** Stable slug — the React key. Renaming it re-announces the item. */
  id: string;
  icon: LucideIcon;
  /** The card's colour on the dashboard deck (a `data-tone` in the student
   *  theme.css). Omit for the plain accent blue. */
  tone?: AnnouncementTone;
  /** Short name for the hero's feature rail ("Biologiya"). Falls back to `title`. */
  short?: Sayable;
  /** Tiny all-caps pill: `MMS`, `YANGI`, `BETA`… Omit for no pill. */
  badge?: Sayable;
  title: Sayable;
  body: Sayable;
  /** Short facts rendered as a `·`-joined line: "45 savol · 150 daqiqa". */
  meta?: Sayable[];
  /** 1–2 buttons. Omit for a card that only informs. */
  ctas?: AnnouncementCta[];
  /** Inclusive `YYYY-MM-DD` window. Omit either side for "always". */
  from?: string;
  until?: string;
}

/** Resolve a `Sayable` for a language, falling back to Uzbek (the default UI language). */
export const say = (text: Sayable, lang: Lang): string =>
  typeof text === 'string' ? text : text[lang] || text.uz;

/** Subjects a student can sit today — derived, so the hub's fact can't drift. */
const LIVE_SUBJECTS = MILLIY_SUBJECTS.filter((s) => s.kind !== 'soon').length;

// ─── the announcements ───────────────────────────────────────────────────────
//
// ⚠️ Order IS the display order. Newest first.

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'sat-math-2026',
    tone: 'amber',
    short: 'SAT Math',
    icon: Target,
    badge: { uz: 'Yangi', ru: 'Новое', en: 'New' },
    title: {
      uz: 'SAT Matematika',
      ru: 'SAT Математика',
      en: 'SAT Math',
    },
    // ⚠️ No question count here — a SAT test's length is the teacher's own
    // (each module built by hand), same reasoning MILLIY_SUBJECTS follows for
    // every non-maths subject.
    body: {
      uz: "Haqiqiy raqamli SAT'ga o'xshash 2 modulli adaptiv test: Modul 1 natijangizga qarab Modul 2 qiyinroq yoki osonroq bo'ladi. O'qituvchi kodi bilan kiring.",
      ru: 'Двухмодульный адаптивный тест, как настоящий цифровой SAT: по результату Модуля 1 Модуль 2 будет труднее или легче. Войдите по коду учителя.',
      en: "A two-module adaptive test, just like the real digital SAT: your Module 1 result decides whether Module 2 is harder or easier. Enter your teacher's code.",
    },
    meta: [
      { uz: '2 modul', ru: '2 модуля', en: '2 modules' },
      { uz: 'Adaptiv', ru: 'Адаптивный', en: 'Adaptive' },
      { uz: '200–800 ball', ru: '200–800 баллов', en: '200–800 score' },
    ],
    ctas: [
      {
        label: { uz: 'Kod bilan kirish', ru: 'Войти по коду', en: 'Enter a code' },
        href: '/sat/math',
        variant: 'filled',
      },
    ],
  },
  {
    id: 'mms-math-2026',
    tone: 'violet',
    short: { uz: 'Matematika', ru: 'Математика', en: 'Maths' },
    icon: Sigma,
    badge: 'MMS',
    title: {
      uz: 'Matematika Milliy Sertifikat',
      ru: 'Национальный сертификат по математике',
      en: 'Mathematics National Certificate',
    },
    body: {
      uz: "DTM formatidagi to'liq variant. Natijangiz darajangizni o'lchaydi va zaif mavzularingizni ko'rsatadi.",
      ru: 'Полный вариант формата ДТМ. Результат измеряет ваш уровень и показывает слабые темы.',
      en: 'A full DTM-format paper. Your result measures your level and names your weak topics.',
    },
    // ⚠️ Derived, never typed in: maths is the ONE subject whose paper shape is
    // fixed in this repo (a blueprint + the 100-point protocol).
    meta: [
      { uz: `${EXAM_TOTAL_QUESTIONS} ta savol`, ru: `${EXAM_TOTAL_QUESTIONS} вопросов`, en: `${EXAM_TOTAL_QUESTIONS} questions` },
      { uz: `${EXAM_DURATION_MINUTES} daqiqa`, ru: `${EXAM_DURATION_MINUTES} минут`, en: `${EXAM_DURATION_MINUTES} minutes` },
      { uz: `${PAPER_TOTAL} ball`, ru: `${PAPER_TOTAL} баллов`, en: `${PAPER_TOTAL} points` },
    ],
    ctas: [
      {
        label: { uz: 'Variantni boshlash', ru: 'Начать вариант', en: 'Start a paper' },
        href: '/raschmodel/exam',
        variant: 'filled',
      },
      {
        label: { uz: "O'qituvchi kodi", ru: 'Код учителя', en: "Teacher's code" },
        href: '/raschmodel/quiz',
      },
    ],
  },
  {
    id: 'mms-biologiya-2026',
    tone: 'green',
    short: { uz: 'Biologiya', ru: 'Биология', en: 'Biology' },
    icon: Dna,
    badge: { uz: 'Yangi', ru: 'Новое', en: 'New' },
    title: {
      uz: 'Biologiya Milliy Sertifikat',
      ru: 'Национальный сертификат по биологии',
      en: 'Biology National Certificate',
    },
    // ⚠️ No question count here on purpose: for every subject except maths the
    // LENGTH IS THE TEACHER'S (docs/MILLIY_QUIZ.md — `questionTarget` is not a
    // national spec), so advertising one would be wrong for most papers.
    body: {
      uz: "O'qituvchingiz bergan 6 xonali kod bilan variantni ochib, imtihon sharoitida yechib ko'ring.",
      ru: 'Откройте вариант 6-значным кодом от учителя и пройдите его в условиях экзамена.',
      en: "Open your teacher's paper with its 6-digit code and sit it under exam conditions.",
    },
    meta: [
      { uz: '6 xonali kod', ru: '6-значный код', en: '6-digit code' },
      { uz: 'Imtihon sharoiti', ru: 'Условия экзамена', en: 'Exam conditions' },
      { uz: `${PAPER_TOTAL} ball`, ru: `${PAPER_TOTAL} баллов`, en: `${PAPER_TOTAL} points` },
    ],
    ctas: [
      {
        label: { uz: 'Kod bilan kirish', ru: 'Войти по коду', en: 'Enter a code' },
        href: '/milliy-sertifikat/biologiya',
        variant: 'filled',
      },
    ],
  },
  {
    id: 'mms-kimyo-2026',
    tone: 'teal',
    short: { uz: 'Kimyo', ru: 'Химия', en: 'Chemistry' },
    icon: FlaskConical,
    badge: { uz: 'Yangi', ru: 'Новое', en: 'New' },
    title: {
      uz: 'Kimyo Milliy Sertifikat',
      ru: 'Национальный сертификат по химии',
      en: 'Chemistry National Certificate',
    },
    body: {
      uz: "Kimyo variantlari ham tayyor — o'qituvchi kodi bilan oching. Hisob-kitob javoblari raqam sifatida tekshiriladi.",
      ru: 'Варианты по химии готовы — откройте по коду учителя. Расчётные ответы проверяются как числа.',
      en: 'Chemistry papers are live — open one by your teacher’s code. Calculated answers are graded as numbers.',
    },
    meta: [
      { uz: '6 xonali kod', ru: '6-значный код', en: '6-digit code' },
      { uz: 'Raqamli javoblar', ru: 'Числовые ответы', en: 'Numeric answers' },
      { uz: `${PAPER_TOTAL} ball`, ru: `${PAPER_TOTAL} баллов`, en: `${PAPER_TOTAL} points` },
    ],
    ctas: [
      {
        label: { uz: 'Kod bilan kirish', ru: 'Войти по коду', en: 'Enter a code' },
        href: '/milliy-sertifikat/kimyo',
        variant: 'filled',
      },
    ],
  },
  {
    id: 'mms-fizika-2026',
    tone: 'sky',
    short: { uz: 'Fizika', ru: 'Физика', en: 'Physics' },
    icon: Atom,
    badge: { uz: 'Yangi', ru: 'Новое', en: 'New' },
    title: {
      uz: 'Fizika Milliy Sertifikat',
      ru: 'Национальный сертификат по физике',
      en: 'Physics National Certificate',
    },
    body: {
      uz: "Fizika variantlari ochildi — o'qituvchi kodi bilan kiring. Hisob-kitob javoblari raqam sifatida tekshiriladi.",
      ru: 'Варианты по физике открыты — войдите по коду учителя. Расчётные ответы проверяются как числа.',
      en: 'Physics papers are live — open one by your teacher’s code. Calculated answers are graded as numbers.',
    },
    meta: [
      { uz: '6 xonali kod', ru: '6-значный код', en: '6-digit code' },
      { uz: 'Raqamli javoblar', ru: 'Числовые ответы', en: 'Numeric answers' },
      { uz: `${PAPER_TOTAL} ball`, ru: `${PAPER_TOTAL} баллов`, en: `${PAPER_TOTAL} points` },
    ],
    ctas: [
      {
        label: { uz: 'Kod bilan kirish', ru: 'Войти по коду', en: 'Enter a code' },
        href: '/milliy-sertifikat/fizika',
        variant: 'filled',
      },
    ],
  },
  {
    id: 'mms-ona-tili-2026',
    tone: 'rose',
    short: { uz: 'Ona tili', ru: 'Родной язык', en: 'Uzbek' },
    icon: BookText,
    badge: { uz: 'Yangi', ru: 'Новое', en: 'New' },
    title: {
      uz: 'Ona tili Milliy Sertifikat',
      ru: 'Национальный сертификат по родному языку',
      en: 'Uzbek Language National Certificate',
    },
    body: {
      uz: "Fonetika, leksikologiya, morfologiya, sintaksis va imlo — o'qituvchi kodi bilan variantni oching.",
      ru: 'Фонетика, лексикология, морфология, синтаксис и орфография — откройте вариант по коду учителя.',
      en: 'Phonetics, lexicology, morphology, syntax and spelling — open a paper with your teacher’s code.',
    },
    meta: [
      { uz: '6 xonali kod', ru: '6-значный код', en: '6-digit code' },
      { uz: 'Imtihon sharoiti', ru: 'Условия экзамена', en: 'Exam conditions' },
      { uz: `${PAPER_TOTAL} ball`, ru: `${PAPER_TOTAL} баллов`, en: `${PAPER_TOTAL} points` },
    ],
    ctas: [
      {
        label: { uz: 'Kod bilan kirish', ru: 'Войти по коду', en: 'Enter a code' },
        href: '/milliy-sertifikat/ona-tili',
        variant: 'filled',
      },
    ],
  },
  {
    id: 'milliy-hub-2026',
    tone: 'indigo',
    short: { uz: 'Barcha fanlar', ru: 'Все предметы', en: 'All subjects' },
    icon: BadgeCheck,
    title: {
      uz: 'Barcha fanlar bir joyda',
      ru: 'Все предметы в одном месте',
      en: 'Every subject in one place',
    },
    body: {
      uz: 'Milliy sertifikat bo‘limida fanni tanlaysiz, variant topshirasiz va natijalaringizni ko‘rasiz. Ingliz tili tez kunda.',
      ru: 'В разделе Milliy sertifikat выберите предмет, пройдите вариант и смотрите результаты. Английский — скоро.',
      en: 'In the Milliy sertifikat section you pick a subject, sit a paper and see your results. English is coming.',
    },
    meta: [
      { uz: `${LIVE_SUBJECTS} ta fan`, ru: `${LIVE_SUBJECTS} предметов`, en: `${LIVE_SUBJECTS} subjects` },
      { uz: 'Natijalar tarixi', ru: 'История результатов', en: 'Results history' },
    ],
    ctas: [
      {
        label: { uz: 'Bo‘limni ochish', ru: 'Открыть раздел', en: 'Open the section' },
        href: '/milliy-sertifikat',
        variant: 'filled',
      },
    ],
  },
];

/** The icon a card falls back to — an announcement with no identity of its own. */
export const ANNOUNCEMENT_FALLBACK_ICON: LucideIcon = Sparkles;

/**
 * The announcements to show right now, in order.
 *
 * ⚠️ Called during render (not memoized at module scope) so `from`/`until`
 * windows are evaluated against the current clock, not against build time. Date
 * keys are plain `YYYY-MM-DD` strings compared lexicographically — no timezone
 * maths, because a banner does not need any.
 */
export function activeAnnouncements(
  now: Date = new Date(),
  list: Announcement[] = ANNOUNCEMENTS,
): Announcement[] {
  const today = now.toISOString().slice(0, 10);
  return list.filter((a) => (!a.from || a.from <= today) && (!a.until || a.until >= today));
}

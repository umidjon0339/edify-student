// app/(student)/raschmodel/exam/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  Clock, AlertTriangle, Play, RotateCcw, Languages, TrendingUp, Home,
} from 'lucide-react';

import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import RaschNav from '../_components/RaschNav';
import NavLink from '../_components/NavLink';
import ExamRunner, { QUESTION_LANGS } from '../_components/ExamRunner';
import { requestExamFullscreen } from '@/hooks/useExamLockdown';
import ExamReview from '../_components/ExamReview';
import { useStudentLanguage } from '../../layout';
import { getRASCHLevels, saveExamResult, toItemResponses } from '@/services/RASCHProgressService';
import { examMistakes } from '@/lib/mistakes';
import { recordMistakes } from '@/services/mistakeService';
import {
  EXAMS_PER_DAY, examQuota, formatCooldown, formatUnlockTime, lastExamAt,
} from '@/lib/RASCHquota';
import { RASCH_TOPICS } from '@/lib/RASCHtopics';
import { skillCoverage, skill as skillMeta, SKILL_KEYS, type SkillKey } from '@/lib/RASCHskills';
import { archiveExam, setSolvedUser } from '@/lib/RASCHsolved';
import type { RASCHLevels } from '@/types/RASCH';
import { buildExam } from '@/lib/Examquestions';
import {
  examMode, examExpectedText, examScore, examSlotCount,
  hasExamAnswer, isExamItemCorrect,
} from '@/lib/ExamTeacher';
import {
  clearExamSnapshot,
  getExamSnapshot,
  getServerExamSnapshot,
  saveExamSnapshot,
  subscribeExamSnapshot,
} from '@/lib/Examsession';
import { EXAM_BLUEPRINT, EXAM_DURATION_MINUTES, EXAM_TOTAL_QUESTIONS } from '@/lib/Examblueprint';
import {
  Banner, Button, Card, FilterChip, Page, cn,
} from '@/components/student-ui';
import type { ExamQuestion, Shortfall } from '@/types/Exam';
import type { Lang } from '@/types/Math';

// ─── i18n ────────────────────────────────────────────────────────────────
// Only the strings THIS page owns. The paper itself (navigator, options, block
// pool, submit dialog) and the per-question review carry their own dictionaries
// inside `_components/ExamRunner.tsx` / `ExamReview.tsx`, so the teacher-quiz
// page cannot end up with a differently-worded runner.
const UI: Record<Lang, Record<string, string>> = {
  uz: {
    examTitle: 'Milliy sertifikat — Matematika',
    duration: 'daqiqa', totalQ: 'ta savol', start: 'Testni boshlash',
    timeUp: 'Vaqt tugadi — test avtomatik yakunlandi.',
    results: 'Natija', byTopic: "Bo'limlar bo'yicha", retake: 'Yangi test',
    skillsTitle: "Aniqlangan ko'nikmalar",
    skillsHint: "Bu variant ko'nikmalarning bir qismini o'lchadi — to'liq manzara Darajam sahifasida.",
    loadingExam: 'Test tayyorlanmoqda…', shortfallWarning: "Ba'zi bo'limlar uchun yetarli savol topilmadi:",
    loadFailed: "Testni yuklab bo'lmadi. Qayta urinib ko'ring.",
    discarded: "Oldingi test javobsiz tugagan — natija sifatida saqlanmadi.",
    emptyBank: "Savollar bazasidan savol topilmadi. Administrator `npm run backfill:rand` ni ishga tushirishi kerak.",
    langTitle: 'Savollar tili',
    langHint: "Boshlangandan so'ng o'zgarmaydi.",
    resumed: 'Boshlangan test tiklandi — savollar qayta yuklanmadi.',
    reads: 'ta savol bazadan o‘qildi',
    levelTitle: 'Darajangiz o‘zgarishi',
    savingResult: 'Natija saqlanmoqda…',
    saveFailed: 'Natijani saqlab bo‘lmadi.',
    signInToSave: 'Natijani saqlash uchun tizimga kiring.',
    viewProgress: 'Darajam va grafik',
    setBaseline: 'Boshlang‘ich darajani belgilang — shundan keyin o‘sish ko‘rinadi.',
    home: 'Bosh sahifa',
    // The 2-a-day cap (lib/RASCHquota.ts). `{n}`/`{time}`/`{left}` are filled in.
    quotaTitle: 'Kuniga {n} marta',
    quotaLocked: 'Keyingi variant {time} da ochiladi',
    quotaLeft: '{left} qoldi',
    quotaWhy: 'Daraja o‘lchov bo‘lgani uchun variantlar orasida 12 soat tanaffus bor.',
    quotaWait: 'Kutish kerak',
  },
  ru: {
    examTitle: 'Национальный сертификат — Математика',
    duration: 'минут', totalQ: 'вопросов', start: 'Начать тест',
    timeUp: 'Время вышло — тест завершён автоматически.',
    results: 'Результат', byTopic: 'По разделам', retake: 'Новый тест',
    skillsTitle: 'Определённые навыки',
    skillsHint: 'Этот вариант измерил часть навыков — полная картина на «Мой уровень».',
    loadingExam: 'Подготовка теста…', shortfallWarning: 'Недостаточно вопросов для некоторых разделов:',
    loadFailed: 'Не удалось загрузить тест. Попробуйте ещё раз.',
    discarded: 'Прошлый тест истёк без ответов — не сохранён как результат.',
    emptyBank: 'В банке вопросов ничего не найдено. Администратору нужно выполнить `npm run backfill:rand`.',
    langTitle: 'Язык вопросов',
    langHint: 'После начала теста не меняется.',
    resumed: 'Начатый тест восстановлен — вопросы не загружались заново.',
    reads: 'вопросов прочитано из базы',
    levelTitle: 'Изменение вашего уровня',
    savingResult: 'Сохранение результата…',
    saveFailed: 'Не удалось сохранить результат.',
    signInToSave: 'Войдите, чтобы сохранить результат.',
    viewProgress: 'Мой уровень и график',
    setBaseline: 'Задайте начальный уровень — тогда будет виден рост.',
    home: 'Главная',
    quotaTitle: '{n} раза в день',
    quotaLocked: 'Следующий вариант откроется в {time}',
    quotaLeft: 'осталось {left}',
    quotaWhy: 'Уровень — это измерение, поэтому между вариантами перерыв 12 часов.',
    quotaWait: 'Нужно подождать',
  },
  en: {
    examTitle: 'National Certificate — Mathematics',
    duration: 'minutes', totalQ: 'questions', start: 'Start test',
    timeUp: 'Time is up — the test was submitted automatically.',
    results: 'Results', byTopic: 'By section', retake: 'New test',
    skillsTitle: 'Skills detected',
    skillsHint: 'This paper measured a slice of the skills — the full picture is on My level.',
    loadingExam: 'Preparing the test…', shortfallWarning: 'Not enough questions found for some sections:',
    loadFailed: 'Could not load the test. Please try again.',
    discarded: 'Your last paper timed out with nothing answered — it was not recorded.',
    emptyBank: 'No questions found in the bank. An admin needs to run `npm run backfill:rand`.',
    langTitle: 'Question language',
    langHint: "Fixed once the test starts.",
    resumed: 'Resumed your test — no questions were re-fetched.',
    reads: 'questions read from the database',
    levelTitle: 'How your level moved',
    savingResult: 'Saving your result…',
    saveFailed: 'Could not save your result.',
    signInToSave: 'Sign in to save your result.',
    viewProgress: 'My level & chart',
    setBaseline: 'Set your starting level to see growth.',
    home: 'Home',
    quotaTitle: '{n} papers a day',
    quotaLocked: 'Your next paper unlocks at {time}',
    quotaLeft: '{left} left',
    quotaWhy: 'Your level is a measurement, so there is a 12-hour gap between papers.',
    quotaWait: 'Please wait',
  },
};

type Stage = 'intro' | 'loading' | 'in-progress' | 'submitted';

/** Everything about one exam in flight. Mirrors the persisted snapshot. */
interface Session {
  examLang: Lang;
  questions: ExamQuestion[];
  shortfalls: Shortfall[];
  /** Closed questions (Y-1 / Y-2) hold an option key; open ones (O) hold the
   *  text the student typed. isCorrect() branches on the question's testType. */
  answers: Record<string, string>;
  flagged: string[];
  current: number;
  /** Epoch ms. A deadline, not a countdown — a reload can't hand back minutes. */
  endsAt: number;
  submitted: boolean;
  docsRead: number;
  /** True when the paper came out of localStorage rather than Firestore. */
  resumed: boolean;
  /** Set once the result has been written to the student's account, so a
   *  reload of a finished exam never writes it a second time. */
  saved: boolean;
  /** Seconds spent per question id. Feeds the guess/gap/fragile diagnosis —
   *  without it, a wrong answer is just wrong, with no idea whether the student
   *  rushed it or laboured over it. Persisted, so a reload keeps the record. */
  seconds: Record<string, number>;
}

export default function ExamPage() {
  // Two independent languages:
  //   appLang  — the navbar switcher; drives buttons, labels, chrome.
  //   examLang — chosen on this screen before the test starts; drives the
  //              question text. Fixed for the life of the paper, so flipping
  //              the navbar mid-exam never re-languages the questions.
  const { lang: appLang } = useStudentLanguage();
  const [pendingLang, setPendingLang] = useState<Lang>('uz');

  // Saving the result to the student's account. `user` is already settled here —
  // AuthProvider renders children only after auth resolves — so it can gate the
  // restore below without a loading race.
  const { user } = useAuth();
  const uid = user?.uid ?? '';

  // The stored exam, read through an external store: the server gets null, the
  // browser gets the real snapshot after hydration. No restore effect, so no
  // setState-in-effect and no hydration mismatch.
  const stored = useSyncExternalStore(subscribeExamSnapshot, getExamSnapshot, getServerExamSnapshot);
  const restored = useMemo<Session | null>(
    () =>
      // localStorage is shared by every account on one browser — only resume a
      // paper that belongs to the student currently signed in, so student B never
      // sees student A's exam or results.
      stored && (stored.uid ?? '') === uid
        ? {
          examLang: stored.examLang,
          questions: stored.questions,
          shortfalls: stored.shortfalls,
          answers: stored.answers,
          flagged: stored.flagged,
          current: stored.current,
          endsAt: stored.endsAt,
          submitted: stored.submitted,
          docsRead: stored.docsRead,
          resumed: true,
          saved: stored.saved ?? false,
          seconds: stored.seconds ?? {},
        }
        : null,
    [stored, uid],
  );

  // `null` means "untouched — fall back to whatever is stored"; { session: null }
  // means the student explicitly cleared it and wants the intro screen.
  const [local, setLocal] = useState<{ session: Session | null } | null>(null);
  const session = local ? local.session : restored;

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [levels, setLevels] = useState<RASCHLevels | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── The 2-a-day cap ──────────────────────────────────────────────────
  // `null` = unknown ⇒ ALLOWED. See lib/RASCHquota.ts: a failed read must never
  // lock a student out of an exam, so every unknown fails open.
  const [lastSittingAt, setLastSittingAt] = useState<number | null>(null);

  const t = UI[appLang];
  // The mistake rows' subtitle — a plain string so the save effect depends on it alone.
  const examTitle = t.examTitle;

  // ── Timer ────────────────────────────────────────────────────────────
  // Nothing is pushed on expiry: `submitted` below is derived from the
  // deadline, so a paper whose time ran out while the tab was shut comes back
  // already submitted.
  //
  // …unless the student never answered anything on it. Drawing a paper and
  // walking away used to produce a *result*: the deadline passed, the next mount
  // saw `expired`, and a 0% exam went onto the account and the progress chart
  // for an exam nobody sat. An untouched expired paper is abandoned, not
  // submitted — it is discarded below and never reaches the account.
  const expired = !!session && now >= session.endsAt;
  const answeredCount = session
    ? session.questions.filter((q) => hasExamAnswer(q, session.answers)).length
    : 0;
  const abandoned = !!session && !session.submitted && expired && answeredCount === 0;

  const submitted = !!session && !abandoned && (session.submitted || expired);
  const autoSubmitted = !!session && !session.submitted && expired && !abandoned;

  const stage: Stage = loading
    ? 'loading'
    : !session || abandoned
      ? 'intro'
      : submitted
        ? 'submitted'
        : 'in-progress';

  // Throw the abandoned paper away, so the intro screen isn't shadowed by a dead
  // snapshot that re-evaluates as "expired" on every mount.
  const [discarded, setDiscarded] = useState(false);
  useEffect(() => {
    if (!abandoned) return;
    clearExamSnapshot();
    setLocal({ session: null });
    setDiscarded(true);
  }, [abandoned]);

  // ⚠️ Ticks on the INTRO too, not only during a paper: the cooldown countdown
  // below is on that screen, and a countdown that only moves on navigation reads
  // as frozen.
  useEffect(() => {
    if (stage !== 'in-progress' && stage !== 'intro') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [stage]);

  // When the student last sat a 45-question paper, from the levels document.
  // ⚠️ **Zero extra reads**: `getRASCHLevels` is 12h-cached and single-flighted,
  // and `RaschNav`'s level chip on this very page already asks for it. It is also
  // why the cap survives clearing localStorage — the timestamps are in Firestore
  // (`exams[].at`, written by `saveExamResult`), not on the device.
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getRASCHLevels(uid)
      .then((l) => { if (!cancelled) setLastSittingAt(lastExamAt(l.exams)); })
      // Fail OPEN — a network blip must not become a lockout.
      .catch((err: unknown) => console.error('[RASCH] quota read failed', err));
    return () => { cancelled = true; };
  }, [uid]);

  // Recomputed every tick, so the button unlocks itself without a reload.
  const quota = useMemo(() => examQuota(lastSittingAt, now), [lastSittingAt, now]);

  const secondsLeft = session
    ? Math.max(0, Math.ceil((session.endsAt - now) / 1000))
    : EXAM_DURATION_MINUTES * 60;

  // ── Persist ──────────────────────────────────────────────────────────
  // Debounced, so typing an open answer doesn't serialise the paper per keypress.
  useEffect(() => {
    if (!session) return;
    const id = setTimeout(() => {
      saveExamSnapshot({
        uid,
        examLang: session.examLang,
        questions: session.questions,
        shortfalls: session.shortfalls,
        answers: session.answers,
        flagged: session.flagged,
        current: session.current,
        endsAt: session.endsAt,
        submitted,
        autoSubmitted,
        docsRead: session.docsRead,
        saved: session.saved,
        seconds: session.seconds,
      });
    }, 400);
    return () => clearTimeout(id);
  }, [session, submitted, autoSubmitted, uid]);

  // ── Per-question stopwatch ───────────────────────────────────────────
  // A ref, not state: it ticks on every render otherwise. `flushTime` banks the
  // seconds spent on the question being left, and is called from the navigation
  // handlers and at submit — every route out of a question goes through one of
  // them, so no time is lost.
  const timerRef = useRef<{ id: string; since: number } | null>(null);

  const bankSeconds = (s: Session): Record<string, number> => {
    const mark = timerRef.current;
    if (!mark) return s.seconds;
    const elapsed = Math.max(0, Math.round((Date.now() - mark.since) / 1000));
    if (elapsed === 0) return s.seconds;
    return { ...s.seconds, [mark.id]: (s.seconds[mark.id] ?? 0) + elapsed };
  };

  /** Applies a change to the live session (no-op before an exam exists). */
  const update = (patch: (s: Session) => Session) => {
    if (!session) return;
    setLocal({ session: patch(session) });
  };

  async function startExam() {
    // ⚠️ Defence in depth: the button below is disabled, but a stale render or a
    // devtools click must not draw a paper the cap has closed.
    if (!quota.allowed) return;
    // ⚠️ Must be called synchronously inside the CLICK, not from an effect after
    // the paper loads — the Fullscreen API only honours a live user gesture, and
    // Safari/Firefox reject it anywhere else. See hooks/useExamLockdown.ts.
    requestExamFullscreen();
    setLoading(true);
    setLoadError(null);
    try {
      const { questions, shortfalls, docsRead } = await buildExam();
      if (questions.length === 0) {
        // Every section came back empty — the sampler filters on `rand`, so
        // this is what an un-backfilled bank looks like (npm run backfill:rand).
        setLoadError(t.emptyBank);
        return;
      }
      const fresh: Session = {
        examLang: pendingLang,
        questions,
        shortfalls,
        answers: {},
        flagged: [],
        current: 0,
        endsAt: Date.now() + EXAM_DURATION_MINUTES * 60 * 1000,
        submitted: false,
        docsRead,
        resumed: false,
        saved: false,
        seconds: {},
      };
      setNow(Date.now());
      setLocal({ session: fresh });
    } catch (err) {
      console.error(err);
      setLoadError(err instanceof Error ? err.message : t.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  function newExam() {
    clearExamSnapshot();
    setLocal({ session: null });
    setLoadError(null);
  }

  function setAnswer(questionId: string, value: string) {
    update((s) => ({ ...s, answers: { ...s.answers, [questionId]: value } }));
  }

  function toggleFlag(questionId: string) {
    update((s) => ({
      ...s,
      flagged: s.flagged.includes(questionId)
        ? s.flagged.filter((id) => id !== questionId)
        : [...s.flagged, questionId],
    }));
  }

  const goTo = (index: number) =>
    update((s) => {
      const seconds = bankSeconds(s);
      timerRef.current = { id: s.questions[index]?.id ?? '', since: Date.now() };
      return { ...s, current: index, seconds };
    });

  const finish = () =>
    update((s) => {
      const seconds = bankSeconds(s);
      timerRef.current = null;
      return { ...s, submitted: true, seconds };
    });

  const questions = useMemo(() => session?.questions ?? [], [session]);
  const shortfalls = session?.shortfalls ?? [];
  const answers = useMemo(() => session?.answers ?? {}, [session]);
  const flaggedIds = useMemo(() => new Set(session?.flagged ?? []), [session]);
  const examLang = session?.examLang ?? pendingLang;
  const current = session?.current ?? 0;

  // The one grading entry point: closed / typed / block, bank or teacher.
  const isCorrect = useCallback(
    (q: ExamQuestion) => isExamItemCorrect(q, answers),
    [answers],
  );

  // A shared_options card is several questions, so both the score and the
  // denominator count SLOTS (examSlotCount / examScore), not cards.
  const score = useMemo(
    () => questions.reduce((total, q) => total + examScore(q, answers), 0),
    [questions, answers],
  );
  const totalQuestions = useMemo(
    () => questions.reduce((total, q) => total + examSlotCount(q), 0),
    [questions],
  );

  const bySection = useMemo(() => {
    const map = new Map<string, { label: string; testType: string; correct: number; total: number }>();
    for (const q of questions) {
      const entry = map.get(q.sectionId) ?? {
        label: q.sectionLabel[appLang],
        testType: q.testType,
        correct: 0,
        total: 0,
      };
      entry.total += examSlotCount(q);
      entry.correct += examScore(q, answers);
      map.set(q.sectionId, entry);
    }
    return Array.from(map.entries());
  }, [questions, answers, appLang]);

  /**
   * Which SKILLS this paper actually measured.
   *
   * The 45 questions are drawn by chapter, so the skills they exercise fall out
   * of the syllabus position each item already carries — no extra tagging, and
   * it works retroactively on every paper ever sat. A single paper reaches
   * roughly a dozen of the 34 skills, which is why this is reported as coverage
   * rather than as a verdict.
   *
   * Built from the same `toItemResponses` the save path uses, so a `multi_part`
   * block contributes one measurement per sub-question here too — counting the
   * block once would undercount the skill it exercises.
   */
  const detected = useMemo(() => {
    if (!submitted || questions.length === 0) return null;
    const items = toItemResponses({
      questions,
      answers,
      isCorrect,
      seconds: session?.seconds ?? {},
      kind: 'exam',
    });
    const { counts } = skillCoverage(items);
    return Object.entries(counts)
      .map(([key, cell]) => ({ key: key as SkillKey, ...cell! }))
      .sort((a, b) => b.seen - a.seen || a.key.localeCompare(b.key));
  }, [submitted, questions, answers, isCorrect, session?.seconds]);

  // Arm the stopwatch for whichever question is on screen. Only touches a ref,
  // so this is not a setState-in-effect.
  const currentId = session && !submitted ? session.questions[session.current]?.id : undefined;
  useEffect(() => {
    if (!currentId) {
      timerRef.current = null;
      return;
    }
    if (timerRef.current?.id !== currentId) {
      timerRef.current = { id: currentId, since: Date.now() };
    }
  }, [currentId]);

  // Point the local solved-questions archive at the signed-in student, so the
  // review it feeds is never mixed with another account on the same browser.
  useEffect(() => { setSolvedUser(uid); }, [uid]);

  // ── Archive the solved questions locally ─────────────────────────────
  // Feeds the per-topic review page. Purely localStorage — no reads, no writes,
  // and it works for a signed-out student too, unlike the account save below.
  const archivedRef = useRef<number | null>(null);
  useEffect(() => {
    if (!submitted || !session || archivedRef.current === session.endsAt) return;
    archivedRef.current = session.endsAt;

    archiveExam({
      questions: session.questions,
      answers: session.answers,
      isCorrect,
      expectedFor: (q) =>
        examMode(q) === 'open' ? examExpectedText(q, session.examLang) : undefined,
      lang: session.examLang,
      at: Date.now(),
    });
  }, [submitted, session, isCorrect]);

  // ── Save the result to the student's account ─────────────────────────
  // Exactly once per exam: one transaction (1 read + 2 writes), guarded by the
  // persisted `saved` flag, so reloading the results screen never writes again.
  // Every setState here happens after an await — never synchronously in the
  // effect body, which the React Compiler rejects.
  //
  // `saved` is set only AFTER the write returns, so anything that re-fires this
  // effect while the transaction is still open (a language switch — `t.saveFailed`
  // is a dependency — or any re-render that hands us a new `session` object) used
  // to start a SECOND save of the same paper. `cancelled` does not help: it stops
  // the setState, not the transaction, which commits regardless and puts the exam
  // on the chart twice. `savingRef` closes that window on the client;
  // `saveExamResult`'s id check closes it on the server, for the tabs and reloads
  // no ref can see.
  const savingRef = useRef<number | null>(null);
  useEffect(() => {
    if (!submitted || !session || session.saved || !user) return;
    if (savingRef.current === session.endsAt) return;
    savingRef.current = session.endsAt;

    let cancelled = false;

    (async () => {
      try {
        const startedAt = session.endsAt - EXAM_DURATION_MINUTES * 60 * 1000;
        const endedAt = Math.min(Date.now(), session.endsAt);
        // Item-level detail — the raw material for ability, subtopic diagnosis
        // and item analysis. Aggregates can never be un-aggregated, so this is
        // recorded once, at the only moment it exists.
        const items = toItemResponses({
          questions: session.questions,
          answers: session.answers,
          isCorrect,
          seconds: session.seconds,
          kind: 'exam',
        });
        const next = await saveExamResult({
          uid: user.uid,
          examLang: session.examLang,
          durationSec: Math.max(0, Math.round((endedAt - startedAt) / 1000)),
          items,
          // The paper's deadline is fixed when it is drawn, so it identifies this
          // paper and no other — the account can refuse a duplicate on sight.
          examId: session.endsAt,
        });

        // My Mistakes (docs/MISTAKES.md) — after the result write, never
        // awaited. `savingRef` already guarantees one save per paper, so this
        // can't double-count `timesWrong`. Outcomes are the items just saved.
        const outcomes: Record<string, number> = {};
        for (const i of items) outcomes[i.id] = i.correct ? 1 : 0;
        recordMistakes(
          user.uid,
          examMistakes({
            source: 'rasch',
            testId: `exam_${session.endsAt}`,
            testTitle: examTitle,
            examLang: session.examLang,
            questions: session.questions,
            outcomes,
            answers: session.answers,
          }),
        ).catch((e) => console.error('recordMistakes failed:', e));

        if (cancelled) return;
        setLevels(next);
        setLocal({ session: { ...session, submitted: true, saved: true } });
      } catch (err) {
        console.error(err);
        // Let a genuine failure be retried.
        savingRef.current = null;
        if (!cancelled) setSaveError(err instanceof Error ? err.message : t.saveFailed);
      }
    })();

    return () => { cancelled = true; };
  }, [submitted, session, user, isCorrect, t.saveFailed, examTitle]);

  // ── INTRO ────────────────────────────────────────────────────────────
  if (stage === 'intro' || stage === 'loading') {
    return (
      <Page>
        {/* The nav appears before and after a paper, never DURING one: a running
            exam has its own sticky timer bar, and offering "Home / Practice"
            mid-paper is an invitation to abandon a sitting that is already being
            graded against the clock. */}
        <RaschNav lang={appLang} />
        <div className="mx-auto w-full max-w-2xl">
          <Card className="p-s-card sm:p-6 md:p-8">
            <h1 className="s-display mb-2 text-2xl font-bold tracking-tight md:text-3xl">{t.examTitle}</h1>
            <div className="mb-6 flex items-center gap-4 text-[13px] font-bold text-on-surface-variant">
              <span className="flex items-center gap-1.5"><Clock size={14} strokeWidth={3} /><span className="s-num">{EXAM_DURATION_MINUTES}</span> {t.duration}</span>
              <span>·</span>
              <span><span className="s-num">{EXAM_TOTAL_QUESTIONS}</span> {t.totalQ}</span>
              <span>·</span>
              {/* The cap is stated up front, not only when it bites — a student
                  who finds out after their second paper reads it as a fault. */}
              <span>{t.quotaTitle.replace('{n}', String(EXAMS_PER_DAY))}</span>
            </div>

            {/* Question language — asked BEFORE the exam, and fixed once it starts. */}
            <div className="mb-6">
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wider text-on-surface-variant">
                <Languages size={14} strokeWidth={3} /> {t.langTitle}
              </p>
              {/* Wraps instead of a 3-column grid: a FilterChip is `shrink-0`, so
                  on a 360px phone "🇷🇺 Русский" (plus the tick when it is the
                  selected one) is wider than a third of the card and pushed the
                  page into horizontal scroll. */}
              <div className="flex flex-wrap gap-2">
                {QUESTION_LANGS.map((l) => (
                  <FilterChip
                    key={l.code}
                    selected={pendingLang === l.code}
                    onClick={() => setPendingLang(l.code)}
                    className="flex-1 justify-center"
                  >
                    <span className="text-[16px] leading-none">{l.flag}</span>
                    {l.label}
                  </FilterChip>
                ))}
              </div>
              <p className="mt-2 text-[12px] font-bold text-on-surface-variant">{t.langHint}</p>
            </div>

            <div className="mb-6 flex flex-col gap-2">
              {EXAM_BLUEPRINT.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 rounded-m3-sm bg-surface-container-high px-4 py-2.5">
                  <span className="text-[13px] font-bold">{b.label[appLang]}</span>
                  <span className="s-num shrink-0 text-[12px] font-black text-on-surface-variant">{b.testType} · {b.count}</span>
                </div>
              ))}
            </div>

            {/* A paper was drawn, its time ran out, and not one question was
                answered. It is thrown away rather than recorded as a 0% exam —
                say so, so the student isn't left wondering where it went. */}
            {discarded && (
              <Banner
                status="warning"
                className="mb-4"
                icon={<AlertTriangle size={16} strokeWidth={3} />}
                title={t.discarded}
              />
            )}

            {loadError && (
              <Banner
                status="error"
                className="mb-4"
                icon={<AlertTriangle size={16} strokeWidth={3} />}
                title={loadError}
              />
            )}

            {/* ── The 2-a-day cap ────────────────────────────────────────
                ⚠️ Shown only when it BITES; the fact itself is in the header row
                above. `quota.allowed` is true whenever the last-sitting time is
                unknown, so a failed read shows nothing and blocks nothing. */}
            {!quota.allowed && quota.nextAt !== null && (
              <Banner
                status="info"
                className="mb-4"
                icon={<Clock size={16} strokeWidth={3} />}
                title={t.quotaLocked.replace('{time}', formatUnlockTime(quota.nextAt, appLang))}
                description={
                  <>
                    <span className="s-num font-black">
                      {t.quotaLeft.replace('{left}', formatCooldown(quota.msLeft, appLang))}
                    </span>
                    {' · '}
                    {t.quotaWhy}
                  </>
                }
              />
            )}

            <Button
              fullWidth
              onClick={startExam}
              disabled={stage === 'loading' || !quota.allowed}
              loading={stage === 'loading'}
              icon={quota.allowed ? <Play size={18} strokeWidth={3} /> : <Clock size={18} strokeWidth={3} />}
              className="uppercase tracking-wider"
            >
              {stage === 'loading'
                ? t.loadingExam
                : quota.allowed
                  ? t.start
                  : `${t.quotaWait} · ${formatCooldown(quota.msLeft, appLang)}`}
            </Button>
          </Card>
        </div>
      </Page>
    );
  }

  // ── RESULTS ──────────────────────────────────────────────────────────
  if (stage === 'submitted') {
    return (
      <Page>
        <RaschNav lang={appLang} />
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-s-section">
          {autoSubmitted && (
            <Banner
              status="warning"
              icon={<AlertTriangle size={16} strokeWidth={3} />}
              title={t.timeUp}
            />
          )}

          <Card className="p-s-card text-center sm:p-6 md:p-8">
            <p className="mb-1 text-[13px] font-black uppercase tracking-wider text-on-surface-variant">{t.results}</p>
            <p className="s-display s-num text-5xl font-bold tracking-tight text-primary">
              {score}<span className="text-3xl text-on-surface-variant">/{totalQuestions}</span>
            </p>
          </Card>

          {shortfalls.length > 0 && (
            <Banner
              status="warning"
              title={t.shortfallWarning}
              description={
                <ul className="list-inside list-disc">
                  {shortfalls.map((s) => (
                    <li key={s.sectionId}>{s.label[appLang]} ({s.testType}): {s.received}/{s.requested}</li>
                  ))}
                </ul>
              }
            />
          )}

          {/* How this exam moved each topic level. The levels document comes
              back from the same transaction that saved the result, so drawing
              this costs no extra read. */}
          <Card>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="s-display text-[14px] font-bold">{t.levelTitle}</p>
              <Link
                href="/raschmodel/progress"
                className="shrink-0 rounded-m3-btn border-[1.5px] border-outline px-3 py-1.5 text-[11px] font-black text-on-surface-variant s-press hover:bg-state-hover hover:text-primary"
              >
                {t.viewProgress}
              </Link>
            </div>

            {!user ? (
              <p className="text-[12px] font-bold text-on-surface-variant">{t.signInToSave}</p>
            ) : saveError ? (
              <p className="text-[12px] font-bold text-error">{saveError}</p>
            ) : !levels ? (
              <p className="text-[12px] font-bold text-on-surface-variant">{t.savingResult}</p>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  {RASCH_TOPICS.map((topic) => {
                    const stat = levels.topics[topic.key];
                    if (!stat) return null;
                    const up = stat.delta > 0;
                    const flat = stat.delta === 0;
                    return (
                      <div key={topic.key} className="flex items-center justify-between gap-3 text-[13px] font-bold">
                        <span className="flex min-w-0 items-center gap-2">
                          {/* Topic hue — a categorical series color shared with the progress chart. */}
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: topic.hex }} />
                          <span className="min-w-0 truncate text-on-surface-variant">{topic.label[appLang]}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className={cn('s-num text-[11px] font-black', flat ? 'text-on-surface-variant' : up ? 'text-success' : 'text-error')}>
                            {flat ? '±0' : `${up ? '▲ +' : '▼ '}${stat.delta}`}
                          </span>
                          <span className="s-num w-11 text-right text-[15px] font-black">{stat.level}%</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
                {!levels.baseline && (
                  <p className="mt-3 border-t border-outline-variant pt-3 text-[12px] font-bold text-warning">
                    {t.setBaseline}
                  </p>
                )}
              </>
            )}
          </Card>

          <Card>
            <p className="s-display mb-3 text-[14px] font-bold">{t.byTopic}</p>
            <div className="flex flex-col gap-2">
              {bySection.map(([sectionId, s]) => (
                <div key={sectionId} className="flex items-center justify-between gap-3 text-[13px] font-bold">
                  <span className="min-w-0 flex-1 truncate text-on-surface-variant">{s.label}</span>
                  <span className="s-num shrink-0 text-on-surface-variant">{s.testType} · {s.correct}/{s.total}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* What the paper DETECTED — the skill axis, not the content axis.
              "Bo'limlar bo'yicha" above says which subjects were asked about;
              this says which operations the student actually had to perform. */}
          {detected && detected.length > 0 && (
            <Card>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="s-display text-[14px] font-bold">{t.skillsTitle}</p>
                <span className="s-num shrink-0 text-[11px] font-black text-on-surface-variant">
                  {detected.length}/{SKILL_KEYS.length}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                {detected.map((s) => {
                  const meta = skillMeta(s.key);
                  const all = s.correct === s.seen;
                  const none = s.correct === 0;
                  return (
                    <div key={s.key} className="flex items-center justify-between gap-3 text-[13px] font-bold">
                      <span className="min-w-0 truncate text-on-surface-variant">
                        {meta?.label[appLang] ?? s.key}
                      </span>
                      <span
                        className={cn(
                          's-num shrink-0 text-[12px] font-black',
                          all ? 'text-success' : none ? 'text-error' : 'text-on-surface-variant',
                        )}
                      >
                        {s.correct}/{s.seen}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 border-t border-outline-variant pt-3 text-[11px] font-medium leading-relaxed text-on-surface-variant">
                {t.skillsHint}
              </p>
            </Card>
          )}

          <ExamReview
            questions={questions}
            answers={answers}
            examLang={examLang}
            appLang={appLang}
          />

          {/* Where to next: another paper, the level chart, or out. ONE row on a
              phone, like the navbar above — the primary action keeps its label,
              the two destinations shrink to icon buttons (their label survives
              as `aria-label`/`title`). */}
          <div className="flex items-stretch gap-2">
            <Button
              onClick={newExam}
              icon={<RotateCcw size={16} strokeWidth={3} />}
              className="min-w-0 flex-1 px-3 text-[12px] uppercase tracking-wider sm:px-5 sm:text-[14.5px]"
            >
              {t.retake}
            </Button>
            <NavLink
              href="/raschmodel/progress"
              tone="tonal"
              label={t.viewProgress}
              className="shrink-0 px-3 uppercase tracking-wider sm:px-5"
            >
              <TrendingUp size={16} strokeWidth={3} />
              <span className="hidden sm:inline">{t.viewProgress}</span>
            </NavLink>
            <NavLink
              href="/raschmodel"
              label={t.home}
              className="shrink-0 px-3 uppercase tracking-wider sm:px-5"
            >
              <Home size={16} strokeWidth={3} />
              <span className="hidden sm:inline">{t.home}</span>
            </NavLink>
          </div>
        </div>
      </Page>
    );
  }

  // ── IN PROGRESS ──────────────────────────────────────────────────────
  // The paper itself is `_components/ExamRunner` — the same component the
  // teacher-quiz runner mounts, so a block, a shared pool or a typed answer can
  // never behave differently on the two papers. This page keeps ownership of
  // everything that is persisted (answers, flags, position, clock).
  if (!session || !questions[current]) return null;

  return (
    <ExamRunner
      questions={questions}
      answers={answers}
      flagged={flaggedIds}
      current={current}
      totalQuestions={totalQuestions}
      secondsLeft={secondsLeft}
      examLang={examLang}
      appLang={appLang}
      // Where the paper came from: a fresh build reports its exact read count;
      // a resumed one cost nothing at all.
      provenance={session.resumed ? t.resumed : `${session.docsRead} ${t.reads}`}
      onAnswer={setAnswer}
      onToggleFlag={toggleFlag}
      onGoTo={goTo}
      onSubmit={finish}
    />
  );
}

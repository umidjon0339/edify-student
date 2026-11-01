'use client';

import {
  increment, updateDoc, arrayUnion, runTransaction, doc, getDoc, serverTimestamp
} from 'firebase/firestore';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { classMistakes } from '@/lib/mistakes';
import { recordMistakes } from '@/services/mistakeService';
import {
  Clock, CheckCircle, ChevronRight, AlertCircle, Flag, Eye, Lock,
  ChevronLeft, Zap, ShieldAlert, X
} from 'lucide-react';
import LatexRenderer from '@/components/LatexRenderer';
import QuestionCreator from '@/components/QuestionCreator';
import { useStudentLanguage } from '@/app/(student)/layout';
import { motion } from 'framer-motion';
import {
  Banner, Button, Card, Chip, ErrorState, IconButton, Page, Spinner, TextField, Tile,
  cn, sToast,
} from '@/components/student-ui';
import { normalizeQuestions, isAnswerCorrect, hasAnswer, gradeQuestion, isBlockAnswer, type BlockAnswer } from '@/lib/questionSchema';
import type { NormalizedPart, NormalizedQuestion } from '@/types/question';
import { applyUserXp, mirrorLeaderboards, notifyLevelUp } from '@/lib/xp';

// XP per correct answer, by the 6 canonical difficulty levels (types/question.ts).
// Anything unknown keeps the historical default of 2.
const XP_BY_DIFFICULTY: Record<string, number> = {
  beginner: 1, easy: 2, medium: 3, hard: 4, expert: 5, olympiad: 6,
};
const DEFAULT_XP = 2;

// --- HELPERS ---
// XP/streak/leaderboard writing lives in lib/xp.ts — do not inline it here again.

// The assignment deadline in epoch ms, or null when the assignment has none.
const dueAtMs = (dueAt: any): number | null =>
  dueAt?.seconds ? dueAt.seconds * 1000 : null;

// Questions are normalized (lib/questionSchema.ts), so every text field is a
// {uz,ru,en} object — never dump the object itself into the UI: an image-only
// option legitimately has empty text and must render as nothing, not as JSON.
const getContentText = (content: any) => {
  if (!content) return "";
  if (typeof content === 'string') return content;
  return content.uz || content.en || content.ru || content.text || "";
};

const isPastDeadline = (dueAt: any) => {
  if (!dueAt) return true;
  return new Date() > new Date(dueAt.seconds * 1000);
};

// "Has this question been answered?" — a BLOCK (multi_part / shared_options) stores
// ONE entry in answers[q.id]: a `{ [partId]: value }` map. It counts as answered as
// soon as ANY part is. Normal questions keep the exact `hasAnswer` check they had.
const isQuestionAnswered = (q: NormalizedQuestion, given: unknown): boolean => {
  if (q.isBlock) {
    if (!isBlockAnswer(given)) return false;
    return q.parts.some((p) => hasAnswer(given[p.id]));
  }
  return hasAnswer(given as string | string[] | undefined);
};

// A block whose parts all read the block's own option list is a `shared_options`
// block: `normalizeQuestion()` hands every part the SAME array instance, so the pool
// must be printed ONCE beside the block, not once per sub-question.
const usesSharedPool = (q: NormalizedQuestion): boolean =>
  q.isBlock && q.optionList.length > 0 && q.parts.every((p) => p.optionList === q.optionList);

// --- TRANSLATIONS ---
const TEST_TRANSLATIONS: any = {
  uz: {
    loading: "Test yuklanmoqda...", error: "Testni yuklashda xatolik", back: "Ortga qaytish", grading: "Javoblar tekshirilmoqda...", pleaseWait: "Iltimos, kuting",
    lobby: { questions: "Savollar", minutes: "Daqiqa", instructions: "Ko'rsatmalar:", rule1: "Chiqib ketsangiz ham vaqt davom etadi.", rule2: "Sahifani keraksiz yangilamang.", rule3: "Tab almashtirish yozib boriladi va ballni pasaytiradi.", startBtn: "Testni Boshlash", cancel: "Bekor qilish" },
    header: { question: "Savol", focus: "Diqqat", locked: "Qulflangan" },
    actions: { flagged: "Belgilangan", flag: "Belgilash", prev: "Oldingi", next: "Keyingi", finish: "Yakunlash", submit: "Topshirish", viewResults: "Natijani Ko'rish", returnClass: "Sinfga Qaytish" },
    input: { typeAnswer: "Javobingizni yozing...", selectAll: "Barcha to'g'ri javoblarni tanlang" },
    block: { pool: "Umumiy variantlar", parts: "Savol qismlari", hint: "Har bir qismga alohida javob bering." },
    modal: { title: "Testni Yakunlaysizmi?", answered: "Javob berildi", unanswered: "Javobsiz Savollar", back: "Qaytish" },
    focusModal: { title: "Diqqat yo'qotildi!", desc: "Siz test oynasidan chiqdingiz yoki boshqa oynaga o'tdingiz. Bu holat yozib olindi va natijangizga ta'sir qilishi mumkin.", btn: "Tushundim, davom etish" },
    result: { submitted: "Topshirildi!", saved: "Javoblaringiz saqlandi.", score: "Ball", accuracy: "Aniqlik", hidden: "Natijalar hozircha yashirin.", xpEarned: "XP Qo'lga kiritildi!", breakdown: "Ballar taqsimoti" },
    toasts: { deadline: "Muddat tugagan.", maxAttempts: "Urinishlar limiti tugagan.", expired: "Sessiya muddati tugagan.", restored: "Sessiya tiklandi!", focusWarn: "Diqqat yo'qotildi!", timeUp: "Vaqt tugadi! Topshirilmoqda...", missedQ: "Savolni o'tkazib yubordingiz!", success: "Topshirildi!", fail: "Xatolik." }
  },
  en: {
    loading: "Loading Test...", error: "Error loading test", back: "Go Back", grading: "Grading your answers...", pleaseWait: "Please wait",
    lobby: { questions: "Questions", minutes: "Minutes", instructions: "Instructions:", rule1: "Timer continues if you leave.", rule2: "Do not refresh unnecessarily.", rule3: "Tab switching is recorded and may penalize your score.", startBtn: "Start Test Now", cancel: "Cancel" },
    header: { question: "Q", focus: "Focus", locked: "Locked" },
    actions: { flagged: "Flagged", flag: "Flag", prev: "Previous", next: "Next", finish: "Finish Test", submit: "Submit", viewResults: "View Results", returnClass: "Return to Class" },
    input: { typeAnswer: "Type your answer...", selectAll: "Select all correct answers" },
    block: { pool: "Shared Options", parts: "Sub-questions", hint: "Answer every part separately." },
    modal: { title: "Finish Test?", answered: "Answered", unanswered: "Unanswered Questions", back: "Back" },
    focusModal: { title: "Focus Lost!", desc: "You left the test window or switched tabs. This action has been recorded and may affect your final score.", btn: "I Understand, Resume" },
    result: { submitted: "Submitted!", saved: "Your answers are recorded.", score: "Score", accuracy: "Accuracy", hidden: "Results are currently hidden.", xpEarned: "XP Earned!", breakdown: "Point Breakdown" },
    toasts: { deadline: "Deadline passed.", maxAttempts: "Max attempts reached.", expired: "Session expired.", restored: "Session restored!", focusWarn: "Warning: Focus lost!", timeUp: "Time is up! Submitting...", missedQ: "You missed a question!", success: "Submitted!", fail: "Submission failed." }
  },
  ru: {
    loading: "Загрузка теста...", error: "Ошибка загрузки", back: "Назад", grading: "Проверка ответов...", pleaseWait: "Пожалуйста, подождите",
    lobby: { questions: "Вопросов", minutes: "Минут", instructions: "Инструкции:", rule1: "Таймер продолжается при выходе.", rule2: "Не обновляйте без нужды.", rule3: "Переключение вкладок фиксируется и снижает балл.", startBtn: "Начать Тест", cancel: "Отмена" },
    header: { question: "Вопрос", focus: "Фокус", locked: "Заблокировано" },
    actions: { flagged: "Отмечено", flag: "Отметить", prev: "Назад", next: "Далее", finish: "Завершить", submit: "Сдать", viewResults: "Результаты", returnClass: "Вернуться в класс" },
    input: { typeAnswer: "Введите ваш ответ...", selectAll: "Выберите все правильные ответы" },
    block: { pool: "Общие варианты", parts: "Подвопросы", hint: "Ответьте на каждую часть отдельно." },
    modal: { title: "Завершить тест?", answered: "Отвечено", unanswered: "Есть пропущенные вопросы", back: "Назад" },
    focusModal: { title: "Фокус потерян!", desc: "Вы покинули окно теста или переключили вкладку. Это действие записано и может повлиять на ваш балл.", btn: "Понятно, продолжить" },
    result: { submitted: "Сдано!", saved: "Ваши ответы сохранены.", score: "Балл", accuracy: "Точность", hidden: "Результаты скрыты.", xpEarned: "Получено XP!", breakdown: "Детализация" },
    toasts: { deadline: "Срок истек.", maxAttempts: "Лимит попыток исчерпан.", expired: "Сессия истекла.", restored: "Сессия восстановлена!", focusWarn: "Потеря фокуса!", timeUp: "Время вышло!", missedQ: "Вы пропустили вопрос!", success: "Сдано!", fail: "Ошибка отправки." }
  }
};

interface TestState {
  status: 'loading' | 'lobby' | 'taking' | 'submitted' | 'error';
  assignment: any; test: any; questions: NormalizedQuestion[];
  // A stored answer is: an option letter (mcq/true_false), an array of letters
  // (multiple_select), the raw typed string (open/numeric), or — for a BLOCK —
  // a `BlockAnswer` = `{ [partId]: letter | letter[] | typed }` holding the WHOLE
  // block in ONE entry. This is exactly what is written to attempts.answers —
  // never a normalized/graded value, and never a per-part top-level key.
  currentQuestionIndex: number; answers: Record<string, string | string[] | BlockAnswer>; flagged: string[];
  tabSwitchCount: number; score?: number; maxScore?: number; endTime?: number; startTime?: number;
  earnedXP?: number; xpBreakdown?: string[];
}

export default function TestRunnerPage() {
  const { classId, assignmentId } = useParams() as { classId: string; assignmentId: string };
  const { user } = useAuth();
  const router = useRouter();
  const { lang } = useStudentLanguage();
  const t = TEST_TRANSLATIONS[lang] || TEST_TRANSLATIONS['en'];

  const [state, setState] = useState<TestState>({
    status: 'loading', assignment: null, test: null, questions: [],
    currentQuestionIndex: 0, answers: {}, flagged: [], tabSwitchCount: 0
  });

  const [displayTime, setDisplayTime] = useState(0);
  
  // UX STATES
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showFocusWarning, setShowFocusWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollNavRef = useRef<HTMLDivElement>(null);
  const isAwayRef = useRef(false); 
  const STORAGE_KEY = `test_session_${user?.uid}_${assignmentId}`;

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    if (!user) return;
    async function loadData() {
      try {
        const assignSnap = await getDoc(doc(db, 'classes', classId, 'assignments', assignmentId));
        if (!assignSnap.exists()) throw new Error("Assignment not found");
        const assignData = assignSnap.data();

        if (assignData.dueAt && isPastDeadline(assignData.dueAt)) {
          sToast.error(t.toasts.deadline);
          localStorage.removeItem(STORAGE_KEY);
          router.push(`/classes/${classId}`); return;
        }

        // Attempts are ONE deterministic doc (${uid}_${assignmentId}, merge-upsert)
        // with an `attemptsTaken` counter — counting documents here would always
        // see ≤1 and never block a limit of 2+.
        const limit = assignData.allowedAttempts ?? 1;
        if (limit !== 0) {
          const priorSnap = await getDoc(doc(db, 'attempts', `${user!.uid}_${assignmentId}`));
          const taken = priorSnap.exists() ? (priorSnap.data().attemptsTaken || 1) : 0;
          if (taken >= limit) {
            sToast.error(t.toasts.maxAttempts);
            localStorage.removeItem(STORAGE_KEY);
            router.push(`/classes/${classId}/test/${assignmentId}/results`); return;
          }
        }

        const testSnap = await getDoc(doc(db, 'custom_tests', assignData.testId));
        if (!testSnap.exists()) throw new Error("Test missing");
        const testData = testSnap.data();

        // 🟢 THE ONLY PLACE questions enter this page. custom_tests.questions[] holds
        // frozen snapshots in BOTH shapes (legacy letter-map + canonical v1 array), so
        // normalize once here — every render/grade line below then reads the legacy
        // shape it always did (`options.A.uz`, `answer` letter, `difficulty` string).
        const questions = normalizeQuestions(testData.questions, lang);

        const savedSession = localStorage.getItem(STORAGE_KEY);
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          // The countdown must never outlive the assignment deadline: the rules
          // reject any attempt written after dueAt (server time), so working past
          // it would only lose the submission.
          const due = dueAtMs(assignData.dueAt);
          if (due && parsed.endTime > due) parsed.endTime = due;
          const realTimeRemaining = Math.floor((parsed.endTime - Date.now()) / 1000);

          if (realTimeRemaining <= 0) {
            sToast.error(t.toasts.expired);
            localStorage.removeItem(STORAGE_KEY);
          } else {
            setState({
              status: 'taking', assignment: assignData, test: testData, questions,
              currentQuestionIndex: parsed.currentQuestionIndex || 0, answers: parsed.answers || {},
              flagged: parsed.flagged || [], tabSwitchCount: parsed.tabSwitchCount || 0,
              endTime: parsed.endTime, startTime: parsed.startTime || Date.now()
            });
            setDisplayTime(realTimeRemaining);
            sToast.success(t.toasts.restored); return;
          }
        }

        setState(prev => ({
          ...prev, status: 'lobby', assignment: assignData, test: testData, questions
        }));
        setDisplayTime((testData.duration || 60) * 60);

      } catch (e) { setState(prev => ({ ...prev, status: 'error' })); }
    }
    loadData();
  }, [classId, assignmentId, user, router, STORAGE_KEY, t, lang]);

  // --- 2. AUTO-SAVE ---
  useEffect(() => {
    if (state.status === 'taking' && state.endTime) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentQuestionIndex: state.currentQuestionIndex, answers: state.answers,
        flagged: state.flagged, tabSwitchCount: state.tabSwitchCount,
        endTime: state.endTime, startTime: state.startTime
      }));
    }
  }, [state.answers, state.flagged, state.currentQuestionIndex, state.tabSwitchCount, state.status, state.endTime, state.startTime, STORAGE_KEY]);

  // --- 3. SCROLL ACTIVE QUESTION ---
  useEffect(() => {
    if (state.status === 'taking' && scrollNavRef.current) {
      const activeButton = scrollNavRef.current.children[state.currentQuestionIndex] as HTMLElement;
      if (activeButton) activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [state.currentQuestionIndex, state.status]);

  // --- 4. TIMER ---
  useEffect(() => {
    if (state.status === 'taking' && state.endTime && !isSubmitting) {
      timerRef.current = setInterval(() => {
        const remaining = Math.floor((state.endTime! - Date.now()) / 1000);
        if (remaining <= 1) {
          clearInterval(timerRef.current!);
          setDisplayTime(0);
          sToast.reward(t.toasts.timeUp, '⏰');
          handleSubmit();
        } else {
          setDisplayTime(remaining);
        }
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state.status, state.endTime, isSubmitting]);

  // --- 5. ANTI-CHEAT FOCUS TRACKING ---
  useEffect(() => {
    if (state.status !== 'taking' || isSubmitting) return;

    const triggerFocusLoss = () => {
      if (isAwayRef.current || showSubmitModal || showFocusWarning) return;
      isAwayRef.current = true;
      setState(prev => ({ ...prev, tabSwitchCount: prev.tabSwitchCount + 1 }));
      setShowFocusWarning(true); 
    };

    const handleVisibilityChange = () => {
      if (document.hidden) triggerFocusLoss();
      else isAwayRef.current = false; 
    };

    const handleBlur = () => triggerFocusLoss();
    const handleFocus = () => { isAwayRef.current = false; };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [state.status, showSubmitModal, showFocusWarning, isSubmitting]);

  // --- 6. KEYBOARD SHORTCUTS ---
  useEffect(() => {
    if (state.status !== 'taking' || showSubmitModal || showFocusWarning || isSubmitting) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentQ = state.questions[state.currentQuestionIndex];
      const optionsKeys = Object.keys(currentQ?.options || {});
      const num = parseInt(e.key);

      // On a block the digit shortcut is ambiguous (which sub-question?), and
      // `currentQ.options` is the SHARED pool — firing selectAnswer would overwrite
      // the whole block map with a bare letter. Blocks are answered by clicking.
      if (!currentQ?.isBlock && !isNaN(num) && num > 0 && num <= optionsKeys.length) {
        selectAnswer(optionsKeys[num - 1]);
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        handleNextOrFinish();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.status, showSubmitModal, showFocusWarning, isSubmitting, state.currentQuestionIndex, state.questions]);


  // --- ACTIONS ---
  const startTest = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    }
    const durationSec = (state.test.duration || 60) * 60;
    const now = Date.now();
    // Clamp the session to the deadline — the rules deny writes after dueAt.
    const due = dueAtMs(state.assignment?.dueAt);
    const endTime = due ? Math.min(now + durationSec * 1000, due) : now + durationSec * 1000;
    setState(prev => ({
      ...prev, status: 'taking', endTime, startTime: now
    }));
    setDisplayTime(Math.floor((endTime - now) / 1000));
  };

  // mcq/true_false → replace the letter. multiple_select → toggle it in a letter array.
  const selectAnswer = (optionKey: string) => {
    const currentQ = state.questions[state.currentQuestionIndex];
    if (!currentQ || currentQ.isBlock) return; // blocks answer through their parts

    setState(prev => {
      if (currentQ.type === 'multiple_select') {
        const prevSel = prev.answers[currentQ.id] as string | string[] | undefined;
        const selected = Array.isArray(prevSel) ? prevSel : prevSel ? [prevSel] : [];
        const next = selected.includes(optionKey)
          ? selected.filter(k => k !== optionKey)
          : [...selected, optionKey];
        return { ...prev, answers: { ...prev.answers, [currentQ.id]: next } };
      }
      return { ...prev, answers: { ...prev.answers, [currentQ.id]: optionKey } };
    });
  };

  // open/numeric — the typed string is stored verbatim; grading normalizes, not the store.
  const setTypedAnswer = (text: string) => {
    const currentQ = state.questions[state.currentQuestionIndex];
    if (!currentQ || currentQ.isBlock) return;
    setState(prev => ({ ...prev, answers: { ...prev.answers, [currentQ.id]: text } }));
  };

  // ── BLOCKS ────────────────────────────────────────────────────────────────
  // The whole block lives in ONE entry — `answers[q.id] = { [partId]: value }`.
  // Every writer below MERGES into that map: changing part b) must never drop a).
  const patchBlockAnswer = (questionId: string, partId: string, value: string | string[]) => {
    setState(prev => {
      const existing = prev.answers[questionId];
      const block: BlockAnswer = isBlockAnswer(existing) ? { ...existing } : {};
      block[partId] = value;
      return { ...prev, answers: { ...prev.answers, [questionId]: block } };
    });
  };

  // A part is a question in miniature: single-pick replaces, multiple_select toggles.
  const selectPartOption = (part: NormalizedPart, optionKey: string) => {
    const currentQ = state.questions[state.currentQuestionIndex];
    if (!currentQ) return;

    const existing = state.answers[currentQ.id];
    const prevSel = isBlockAnswer(existing) ? existing[part.id] : undefined;

    if (part.type === 'multiple_select') {
      const selected = Array.isArray(prevSel) ? prevSel : prevSel ? [prevSel] : [];
      patchBlockAnswer(
        currentQ.id,
        part.id,
        selected.includes(optionKey) ? selected.filter(k => k !== optionKey) : [...selected, optionKey],
      );
      return;
    }
    patchBlockAnswer(currentQ.id, part.id, optionKey);
  };

  const setPartTypedAnswer = (part: NormalizedPart, text: string) => {
    const currentQ = state.questions[state.currentQuestionIndex];
    if (!currentQ) return;
    patchBlockAnswer(currentQ.id, part.id, text);
  };

  const toggleFlag = () => {
    const currentQ = state.questions[state.currentQuestionIndex];
    setState(prev => {
      const isFlagged = prev.flagged.includes(currentQ.id);
      return { ...prev, flagged: isFlagged ? prev.flagged.filter(id => id !== currentQ.id) : [...prev.flagged, currentQ.id] };
    });
  };

  const handleNextOrFinish = () => {
    if (state.currentQuestionIndex < state.questions.length - 1) {
      setState(p => ({ ...p, currentQuestionIndex: p.currentQuestionIndex + 1 }));
    } else {
      const firstSkipped = state.questions.findIndex(q => !isQuestionAnswered(q, state.answers[q.id]));
      if (firstSkipped !== -1) {
        sToast.reward(t.toasts.missedQ, '📝');
        setState(p => ({ ...p, currentQuestionIndex: firstSkipped }));
      } else {
        setShowSubmitModal(true);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    setShowSubmitModal(false);
    setIsSubmitting(true); 
    
    if (!user) { setIsSubmitting(false); return; }

    const userId = user.uid;
    // ⚠️ The local session is cleared ONLY after the transaction commits — a
    // failed submit (network, rules) must keep the answers recoverable.

    let correctCount = 0;   // POINTS earned  (blocks: partial credit, per-part points)
    let totalPoints = 0;    // POINTS available
    let earnedBaseXP = 0;

    // Grading goes through the shared scorer (lib/questionSchema.ts) so mcq letters,
    // multiple_select sets, typed open/numeric answers AND blocks are all judged the
    // same way here and on the results page.
    //   • normal question → 0 or q.points (which normalizes to 1 when the doc has none,
    //     so the historical "1 point per correct question" is unchanged)
    //   • block           → the sum of the parts the student got right (partial credit)
    state.questions.forEach(q => {
      const { earned, total } = gradeQuestion(q, state.answers[q.id]);
      correctCount += earned;
      totalPoints += total;

      // XP ladder is PER QUESTION and unchanged: a block pays the same XP as a normal
      // question of the same difficulty (and only when fully correct — `isAnswerCorrect`
      // already requires every part). Never multiplied by the number of parts.
      if (isAnswerCorrect(q, state.answers[q.id])) {
        const diff = String(q.difficulty || 'easy').toLowerCase();
        earnedBaseXP += XP_BY_DIFFICULTY[diff] ?? DEFAULT_XP;
      }
    });

    const scorePercentage = totalPoints > 0 ? (correctCount / totalPoints) * 100 : 0;
    const durationSeconds = state.startTime ? (Date.now() - state.startTime) / 1000 : 0;
    const timeLimitSeconds = (state.test.duration || 60) * 60;
    const attemptDocId = `${userId}_${assignmentId}`; 

    try {
      const result = await runTransaction(db, async (transaction) => {
        const attemptRef = doc(db, 'attempts', attemptDocId);
        const userRef = doc(db, 'users', userId);
        const attemptDoc = await transaction.get(attemptRef);
        const userDoc = await transaction.get(userRef);

        const isRetake = attemptDoc.exists();
        const previousAttempts = isRetake ? attemptDoc.data()?.attemptsTaken || 0 : 0;

        let baseXp = 0;
        const breakdown: string[] = [];

        if (previousAttempts >= 10) {
          breakdown.push("Max retakes reached: +0");
        } else if (!isRetake) {
          baseXp = earnedBaseXP; breakdown.push(`Base Score: +${earnedBaseXP}`);
          if (state.tabSwitchCount === 0) {
            if (scorePercentage > 80) { baseXp += 5; breakdown.push("Perfectionist: +5"); }
            if (timeLimitSeconds > 0 && scorePercentage > 80 && durationSeconds < (timeLimitSeconds * 0.5)) { baseXp += 5; breakdown.push("Speed Demon: +5"); }
          } else { breakdown.push(`No Bonus (Focus Lost ${state.tabSwitchCount}x)`); }
        } else {
          if (scorePercentage > 60 && state.questions.length > 5 && state.tabSwitchCount < 2) {
            baseXp = 5; breakdown.push("Practice Reward: +5");
          } else {
            breakdown.push("Retake / Penalty: +0");
          }
        }

        // Streak advance/bonuses, daily-goal + level-up bonuses, dailyHistory
        // trim and the user-doc write all live in lib/xp.ts.
        const applied = applyUserXp(transaction, userRef, userDoc, {
          xp: baseXp,
          breakdown,
          activityEntry: { id: attemptDocId, testTitle: state.test.title, score: correctCount, totalQuestions: totalPoints, submittedAt: Date.now() },
          activityLimit: 5,
          extraUserFields: { displayName: user.displayName },
        });

        // `score` / `totalQuestions` are POINTS. For a test without blocks every
        // question is worth 1, so these are byte-for-byte the old "correct / count"
        // numbers; a block contributes its parts' points and can land in between.
        transaction.set(attemptRef, {
          userId, userName: user.displayName, classId, assignmentId, type: 'assignment', testId: state.assignment.testId,
          testTitle: state.test.title, score: correctCount, totalQuestions: totalPoints,
          answers: state.answers, tabSwitches: state.tabSwitchCount, submittedAt: serverTimestamp(),
          attemptsTaken: isRetake ? increment(1) : 1, xpEarned: applied.finalXp
        }, { merge: true });

        // Leaderboard mirrors commit atomically with the user doc — the old
        // separate batch could fail after the transaction and desync the counters.
        const userData = userDoc.exists() ? userDoc.data() : {};
        mirrorLeaderboards(transaction, userId, applied.finalXp, {
          displayName: userData?.displayName || user.displayName,
          avatar: userData?.photoURL || user.photoURL || null,
          classId,
        }, [classId]);

        return applied;
      });

      // Only now is the local session safe to discard.
      localStorage.removeItem(STORAGE_KEY);

      // My Mistakes (docs/MISTAKES.md) — fire-and-forget, AFTER the attempt is
      // committed: banking a study aid must never cost the student the score.
      recordMistakes(
        userId,
        classMistakes({
          testId: state.assignment.testId || assignmentId,
          testTitle: state.test.title || '',
          examLang: lang,
          questions: state.questions,
          answers: state.answers,
        }),
      ).catch((e) => console.error('recordMistakes failed:', e));
      if (result.leveledUp) notifyLevelUp(userId, result.newLevel);

      await updateDoc(doc(db, 'classes', classId, 'assignments', assignmentId), { completedBy: arrayUnion(userId) }).catch(() => {});

      setState(prev => ({ ...prev, status: 'submitted', score: correctCount, maxScore: totalPoints, earnedXP: result.finalXp, xpBreakdown: result.breakdown }));
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      if (result.finalXp > 0 && result.currentStreak > 1) sToast.reward(`${result.currentStreak} Day Streak! 🔥`, '🔥');
      else sToast.success(t.toasts.success);

    } catch (e: any) {
      // The answers are still in localStorage (cleared only on success), so the
      // student can retry. A permission-denied here almost always means the
      // deadline passed server-side mid-session.
      if (e?.code === 'permission-denied') sToast.error(t.toasts.deadline);
      else sToast.error(t.toasts.fail);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDERERS ---
  if (state.status === 'loading') return (
    <Page width="full" className="grid min-h-[70vh] place-items-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner size={34} label={t.loading} />
        <p className="text-[14px] font-bold text-on-surface-variant">{t.loading}</p>
      </div>
    </Page>
  );

  if (state.status === 'error') return (
    <Page width="full" className="grid min-h-[70vh] place-items-center">
      <ErrorState title={t.error} onRetry={() => router.back()} retryLabel={t.back} />
    </Page>
  );

  if (state.status === 'lobby') return (
    <Page width="full" className="flex min-h-[80vh] items-center justify-center">
      <Card variant="outlined" className="w-full max-w-lg space-y-6 text-center">
        <Tile tone="primary" size="lg" className="mx-auto h-20 w-20 rotate-6 rounded-m3-lg">
          <Clock size={40} strokeWidth={2.5} />
        </Tile>
        <div>
          <h1 className="s-display text-[28px] font-bold leading-tight text-on-surface">{state.test.title}</h1>
          <p className="mt-1.5 text-[12px] font-black uppercase tracking-[0.12em] text-on-surface-variant">
            {state.questions.length} {t.lobby.questions} • {state.test.duration || 60} {t.lobby.minutes}
          </p>
        </div>
        <Banner
          status="warning"
          className="text-left"
          icon={<AlertCircle size={22} strokeWidth={2.5} />}
          title={t.lobby.instructions}
          description={
            <ul className="list-inside list-disc space-y-1">
              <li>{t.lobby.rule1}</li>
              <li>{t.lobby.rule2}</li>
              <li>{t.lobby.rule3}</li>
            </ul>
          }
        />
        <div className="space-y-2">
          <Button fullWidth size="lg" onClick={startTest}>{t.lobby.startBtn}</Button>
          <Button fullWidth variant="text" onClick={() => router.back()}>{t.lobby.cancel}</Button>
        </div>
      </Card>
    </Page>
  );

  if (state.status === 'submitted') {
    const visibility = state.test.resultsVisibility || (state.test.showResults ? 'always' : 'never');
    // 'after_due' with NO due date means "hold results" — isPastDeadline(null)
    // returns true, which used to reveal them immediately.
    const canShow = visibility === 'always' ||
      (visibility === 'after_due' && !!state.assignment.dueAt && isPastDeadline(state.assignment.dueAt));
    // Points, not questions — identical to the old count when nothing is worth >1 point.
    const maxScore = state.maxScore ?? state.questions.length;
    const accuracy = maxScore > 0 ? Math.round((state.score! / maxScore) * 100) : 0;

    // 🟢 HELPER: Animated Counter for XP and Scores
    const AnimatedNumber = ({ value, suffix = "" }: { value: number, suffix?: string }) => {
      const [count, setCount] = useState(0);
      useEffect(() => {
        let startTime: number;
        const duration = 1500; // 1.5 seconds animation
        const step = (timestamp: number) => {
          if (!startTime) startTime = timestamp;
          const progress = Math.min((timestamp - startTime) / duration, 1);
          // easeOutExpo for a snappy start and slow finish
          const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
          setCount(Math.floor(easeProgress * value));
          if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
      }, [value]);
      return <>{count}{suffix}</>;
    };

    // 🟢 FRAMER MOTION VARIANTS
    const container = {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } }
    };
    const item = {
      hidden: { opacity: 0, y: 30, scale: 0.9 },
      show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, bounce: 0.5, duration: 0.6 } }
    };
    return (
      <Page width="full" className="relative flex min-h-[80vh] items-center justify-center overflow-hidden">

        {/* 🟢 FLOATING BACKGROUND EMOJIS (Confetti Effect) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
           <motion.div initial={{ y: "100vh", x: "10vw", opacity: 0 }} animate={{ y: "-20vh", opacity: [0, 1, 0], rotate: 360 }} transition={{ duration: 4, ease: "easeOut", delay: 0.1 }} className="absolute text-5xl">✨</motion.div>
           <motion.div initial={{ y: "100vh", x: "80vw", opacity: 0 }} animate={{ y: "-10vh", opacity: [0, 1, 0], rotate: -180 }} transition={{ duration: 3.5, ease: "easeOut", delay: 0.3 }} className="absolute text-6xl">🎉</motion.div>
           <motion.div initial={{ y: "100vh", x: "50vw", opacity: 0 }} animate={{ y: "-30vh", opacity: [0, 1, 0], rotate: 90 }} transition={{ duration: 4.5, ease: "easeOut", delay: 0.5 }} className="absolute text-5xl">🔥</motion.div>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-10 w-full max-w-md"
        >
          <Card variant="outlined" className="space-y-6 text-center">
            {/* HEADER & TROPHY */}
            <motion.div variants={item} className="relative">
               <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", bounce: 0.6, delay: 0.2, duration: 0.8 }}
                  className="mx-auto mb-6 grid h-32 w-32 rotate-6 place-items-center rounded-m3-lg bg-gold-container text-on-gold-container"
                >
                  <div className="text-7xl">🏆</div>
               </motion.div>
               <h1 className="s-display text-[28px] font-bold leading-tight text-on-surface">{t.result.submitted}</h1>
               <p className="mt-1.5 text-[12px] font-black uppercase tracking-[0.12em] text-on-surface-variant">{t.result.saved}</p>
            </motion.div>

            <div className="grid grid-cols-2 gap-4">
               {/* 🟢 XP CARD (Spans full width) */}
               {state.earnedXP !== undefined && state.earnedXP >= 0 && (
                 <motion.div variants={item} className="col-span-2 flex flex-col items-center overflow-hidden rounded-m3-lg bg-gold p-6 text-on-gold">
                    <div className="mb-1 flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.12em] opacity-80">
                      <Zap size={18} fill="currentColor" /> {t.result.xpEarned}
                    </div>
                    <span className="s-display s-num text-[54px] font-bold leading-none tracking-tight">
                      +<AnimatedNumber value={state.earnedXP} />
                    </span>

                    {/* 🟢 XP BREAKDOWN PILLS */}
                    {state.xpBreakdown && state.xpBreakdown.length > 0 && (
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {state.xpBreakdown.map((item, idx) => (
                          <motion.span
                            key={idx}
                            initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 + (idx * 0.2) }}
                            className="rounded-full bg-gold-container px-3 py-1 text-[11px] font-black uppercase tracking-wider text-on-gold-container"
                          >
                            {item.split(':')[0]} <span className="s-num opacity-75">{item.split(':')[1]}</span>
                          </motion.span>
                        ))}
                      </div>
                    )}
                 </motion.div>
               )}

               {/* 🟢 SCORE CARD */}
               <motion.div variants={item} className="flex flex-col items-center justify-center rounded-m3-lg border border-outline-variant bg-surface p-5">
                  <span className="mb-1 text-[11px] font-black uppercase tracking-[0.12em] text-on-surface-variant">{t.result.score}</span>
                  <span className="s-display s-num text-[30px] font-bold text-primary">
                    <AnimatedNumber value={state.score!} /> <span className="text-[18px] text-on-surface-variant">/ {maxScore}</span>
                  </span>
               </motion.div>

               {/* 🟢 ACCURACY CARD */}
               <motion.div variants={item} className="flex flex-col items-center justify-center rounded-m3-lg border border-outline-variant bg-surface p-5">
                  <span className="mb-1 text-[11px] font-black uppercase tracking-[0.12em] text-on-surface-variant">{t.result.accuracy}</span>
                  <span className={cn('s-display s-num text-[30px] font-bold', accuracy >= 80 ? 'text-success' : accuracy >= 60 ? 'text-gold' : 'text-error')}>
                    <AnimatedNumber value={accuracy} suffix="%" />
                  </span>
               </motion.div>
            </div>

            {/* 🟢 ACTION BUTTONS */}
            <motion.div variants={item} className="space-y-3 pt-2">
              {canShow ? (
                <Button
                  fullWidth
                  size="lg"
                  icon={<Eye size={20} strokeWidth={3} />}
                  onClick={() => router.push(`/classes/${classId}/test/${assignmentId}/results`)}
                >
                  {t.actions.viewResults}
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-m3-md border border-dashed border-outline-variant bg-surface-container p-4 text-[12px] font-black uppercase tracking-[0.12em] text-on-surface-variant">
                  <Lock size={16} strokeWidth={3}/> {t.result.hidden}
                </div>
              )}
              <Button fullWidth variant="outlined" onClick={() => router.push(`/classes/${classId}`)}>
                {t.actions.returnClass}
              </Button>
            </motion.div>
          </Card>
        </motion.div>
      </Page>
    );
  }

  const currentQ = state.questions[state.currentQuestionIndex];
  const isFlagged = state.flagged.includes(currentQ.id);
  const answeredCount = state.questions.filter(q => isQuestionAnswered(q, state.answers[q.id])).length;

  const currentAnswer = state.answers[currentQ.id];

  // A BLOCK is answered part by part — its whole response is one `{ [partId]: value }` map.
  const isBlock = currentQ.isBlock;
  const blockAnswer: BlockAnswer = isBlockAnswer(currentAnswer) ? currentAnswer : {};
  const sharedPool = isBlock && usesSharedPool(currentQ) ? currentQ.optionList : [];

  // No options at all ⇒ a text-answer type (open / numeric / fill_blank …).
  const isTyped = !isBlock && currentQ.optionList.length === 0;
  const isMultiSelect = currentQ.type === 'multiple_select';
  const scalarAnswer = isBlockAnswer(currentAnswer) ? undefined : currentAnswer;
  const selectedKeys = Array.isArray(scalarAnswer) ? scalarAnswer : scalarAnswer ? [scalarAnswer] : [];

  return (
    // "Immersive Mode": a fixed, full-bleed overlay above the global shell, so the
    // header/nav/footer meet the screen edges. `!p-0` is required — tailwind-merge
    // cannot dedupe Page's own `px-s-page-x`/`py-s-page-y` (not a known scale).
    <Page width="full" className="fixed inset-0 z-[100] flex select-none flex-col overflow-hidden bg-background !p-0">

      {isSubmitting && (
        <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-[color-mix(in_srgb,var(--m3-surface)_92%,transparent)] backdrop-blur-md">
           <Spinner size={56} label={t.grading} />
           <div className="text-center">
             <h2 className="s-display text-[22px] font-bold text-on-surface">{t.grading || "Grading your answers..."}</h2>
             <p className="mt-2 text-[13px] font-black uppercase tracking-[0.12em] text-on-surface-variant">{t.pleaseWait}</p>
           </div>
        </div>
      )}

      {/* ⚠️ ANTI-CHEAT BLOCKER — deliberately NOT a <Dialog>: it must not be
          dismissable by backdrop click or Escape, only by the acknowledge button. */}
      {showFocusWarning && !isSubmitting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[color-mix(in_srgb,var(--m3-scrim)_60%,transparent)] p-4 backdrop-blur-md">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-sm rounded-m3-xl bg-surface-container-high p-8 text-center shadow-elev-3">
            <div className="mx-auto mb-6 grid h-20 w-20 rotate-12 place-items-center rounded-m3-lg bg-error-container text-on-error-container">
              <ShieldAlert size={40} strokeWidth={2.5} />
            </div>
            <h2 className="s-display mb-3 text-[22px] font-bold text-on-surface">{t.focusModal.title}</h2>
            <p className="mb-8 text-[14px] font-bold leading-relaxed text-on-surface-variant">{t.focusModal.desc}</p>
            <Button fullWidth size="lg" tone="error" onClick={() => setShowFocusWarning(false)}>
              {t.focusModal.btn}
            </Button>
          </div>
        </div>
      )}

      {/* Also kept as a plain overlay so the runner cannot be closed accidentally
          mid-submit — the only exits are the two buttons below. */}
      {showSubmitModal && !isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--m3-scrim)_60%,transparent)] p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-m3-xl bg-surface-container-high p-8 shadow-elev-3">
            <div className="mb-8 text-center">
              <Tile tone="primary" size="lg" className="mx-auto mb-4 h-16 w-16"><Flag size={32} strokeWidth={2.5}/></Tile>
              <h2 className="s-display text-[20px] font-bold text-on-surface">{t.modal.title}</h2>
              <p className="mt-2 text-[12px] font-black uppercase tracking-[0.12em] text-on-surface-variant">
                {t.modal.answered} <strong className="s-num text-primary">{answeredCount}</strong> / <strong className="s-num text-on-surface">{state.questions.length}</strong>
              </p>
              {answeredCount < state.questions.length && (
                <Chip status="warning" className="mt-4">⚠️ {t.modal.unanswered}</Chip>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outlined" onClick={() => setShowSubmitModal(false)}>{t.modal.back}</Button>
              <Button onClick={handleSubmit}>{t.actions.submit}</Button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-outline-variant bg-surface px-4 md:h-20 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="s-display text-[15px] font-bold text-on-surface md:text-[18px]">
            {t.header.question} <span className="s-num">{state.currentQuestionIndex + 1}</span>{' '}
            <span className="s-num text-on-surface-variant">/ {state.questions.length}</span>
          </span>
          {state.tabSwitchCount > 0 && (
            <Chip status="error" icon={<AlertCircle size={14} strokeWidth={3} />} className="uppercase tracking-[0.1em]">
              {t.header.focus}: {state.tabSwitchCount}
            </Chip>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
           <div className={cn(
             'flex items-center gap-2 rounded-m3-sm border px-3 py-2 text-[14px] font-black md:text-[16px]',
             displayTime < 60
               ? 'animate-pulse border-error bg-error-container text-on-error-container'
               : 'border-outline-variant bg-surface-container text-on-surface',
           )}>
             <Clock size={18} strokeWidth={2.5}/><span className="s-num">{formatTime(displayTime)}</span>
           </div>
           <IconButton
             aria-label={t.back}
             onClick={() => { if(confirm("Are you sure you want to exit? Timer will continue running.")) { router.back(); } }}
             className="bg-surface-container lg:hidden"
           >
             <X size={20} strokeWidth={3} />
           </IconButton>
        </div>
      </header>

      {/* NUMBER NAVIGATOR */}
      <div className="z-10 shrink-0 border-b border-outline-variant bg-surface-container-low px-4 py-3">
         <div ref={scrollNavRef} className="s-scroll flex items-center gap-2 overflow-x-auto px-1 pb-2">
            {state.questions.map((q, idx) => {
                const isActive = idx === state.currentQuestionIndex;
                const isAnswered = isQuestionAnswered(q, state.answers[q.id]);
                const isQFlagged = state.flagged.includes(q.id);
                return (
                    <button
                        key={idx} onClick={() => setState(p => ({...p, currentQuestionIndex: idx}))}
                        aria-label={`${t.header.question} ${idx + 1}`}
                        aria-current={isActive ? 'true' : undefined}
                        className={cn(
                          's-press grid h-11 w-11 shrink-0 place-items-center rounded-m3-sm border text-[15px] font-black md:h-12 md:w-12',
                          isActive
                            ? 'scale-105 border-primary bg-primary text-on-primary shadow-elev-1'
                            : isQFlagged
                              ? 'border-transparent bg-gold-container text-on-gold-container'
                              : isAnswered
                                ? 'border-transparent bg-inverse-surface text-inverse-on-surface'
                                : 'border-outline-variant bg-surface text-on-surface-variant hover:bg-state-hover',
                        )}
                    >
                        {isQFlagged && !isActive ? <Flag size={16} strokeWidth={3} fill="currentColor"/> : <span className="s-num">{idx + 1}</span>}
                    </button>
                )
            })}
         </div>
      </div>

      {/* QUESTION BODY */}
      <main className="flex flex-1 overflow-hidden bg-surface">
        <div className="s-scroll mx-auto w-full max-w-4xl flex-1 overflow-y-auto p-4 pb-24 md:p-8">
          <div className="mb-8">
             <div className="text-[18px] font-bold leading-relaxed text-on-surface md:text-[22px]"><LatexRenderer latex={getContentText(currentQ.question)} /></div>
             {currentQ.imageUrl && (
               <img src={currentQ.imageUrl} alt="" className="mt-5 max-h-60 w-auto rounded-m3-md border border-outline-variant bg-surface object-contain" />
             )}
             {isMultiSelect && (
               <p className="mt-4 text-[11px] font-black uppercase tracking-[0.12em] text-primary">{t.input.selectAll}</p>
             )}
             {isBlock && (
               <p className="mt-4 text-[11px] font-black uppercase tracking-[0.12em] text-primary">{t.block.hint}</p>
             )}
             <QuestionCreator creatorName={currentQ.creatorName} correctedBy={currentQ.correctedBy} className="mt-3 text-on-surface-variant" />
          </div>

          {isBlock ? (
            // ── BLOCK (multi_part / shared_options) ───────────────────────────
            // Stem + image are already above. `shared_options` prints its A–F pool
            // ONCE here (every part points at the same array), then each sub-question
            // is a compact row of letter buttons. A `multi_part` part carries its own
            // options (or a typed answer), so it renders them itself.
            <div className="space-y-4">
              {sharedPool.length > 0 && (
                <div className="rounded-m3-md border border-outline-variant bg-surface-container p-4 md:p-5">
                  <p className="mb-3 text-[11px] font-black uppercase tracking-[0.12em] text-on-surface-variant">{t.block.pool}</p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {sharedPool.map((o) => (
                      <div key={o.id} className="flex items-start gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-m3-xs border border-outline-variant bg-surface text-[13px] font-black text-on-surface-variant">{o.id}</span>
                        <div className="min-w-0 break-words pt-1 text-[14px] font-bold leading-relaxed text-on-surface md:text-[15px]">
                          <LatexRenderer latex={getContentText(o.text)} />
                          {o.imageUrl && (
                            <img src={o.imageUrl} alt={o.id} className="mt-2 max-h-28 w-auto rounded-m3-sm border border-outline-variant bg-surface object-contain" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentQ.parts.map((part) => {
                const given = blockAnswer[part.id];
                const partKeys = Array.isArray(given) ? given : given ? [given] : [];
                const partIsMulti = part.type === 'multiple_select';
                const partIsTyped = part.optionList.length === 0;
                const compact = sharedPool.length > 0; // pool already printed above

                return (
                  <div key={part.id} className="rounded-m3-md border border-outline-variant bg-surface p-4 md:p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-m3-xs bg-primary-container text-[13px] font-black text-on-primary-container">{part.id}</span>
                      <div className="min-w-0 flex-1">
                        <div className="break-words text-[15px] font-bold leading-relaxed text-on-surface md:text-[17px]">
                          <LatexRenderer latex={getContentText(part.prompt)} />
                        </div>
                        {partIsMulti && (
                          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-primary">{t.input.selectAll}</p>
                        )}

                        {partIsTyped ? (
                          <TextField
                            label={t.input.typeAnswer}
                            containerClassName="mt-3"
                            inputMode={part.type === 'numeric' ? 'decimal' : 'text'}
                            autoComplete="off"
                            value={typeof given === 'string' ? given : ''}
                            onChange={(e) => setPartTypedAnswer(part, e.target.value)}
                          />
                        ) : compact ? (
                          // shared pool → a compact row of letter buttons.
                          <div className="mt-3 flex flex-wrap gap-2">
                            {part.optionList.map((o) => {
                              const sel = partKeys.includes(o.id);
                              return (
                                <button
                                  key={o.id}
                                  onClick={() => selectPartOption(part, o.id)}
                                  aria-pressed={sel}
                                  className={cn(
                                    's-press grid h-12 w-12 place-items-center rounded-m3-sm border text-[15px] font-black',
                                    sel
                                      ? 'border-primary bg-primary text-on-primary'
                                      : 'border-outline-variant bg-surface text-on-surface-variant hover:bg-state-hover',
                                  )}
                                >
                                  {o.id}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          // the part owns its options → letter + text, like a normal question.
                          <div className="mt-3 grid gap-2">
                            {part.optionList.map((o) => {
                              const sel = partKeys.includes(o.id);
                              return (
                                <button
                                  key={o.id}
                                  onClick={() => selectPartOption(part, o.id)}
                                  aria-pressed={sel}
                                  className={cn(
                                    's-press flex w-full items-center gap-3 rounded-m3-md border p-3 text-left md:p-4',
                                    sel
                                      ? 'border-primary bg-primary-container text-on-primary-container'
                                      : 'border-outline-variant bg-surface text-on-surface hover:bg-state-hover',
                                  )}
                                >
                                  <span className={cn(
                                    'grid h-9 w-9 shrink-0 place-items-center border text-[14px] font-black',
                                    partIsMulti ? 'rounded-m3-xs' : 'rounded-m3-sm',
                                    sel
                                      ? 'border-primary bg-primary text-on-primary'
                                      : 'border-outline-variant bg-surface-container-high text-on-surface-variant',
                                  )}>
                                    {partIsMulti && sel ? <CheckCircle size={18} strokeWidth={3} /> : o.id}
                                  </span>
                                  <div className="w-full min-w-0">
                                    <div className="break-words text-[14px] font-bold leading-relaxed md:text-[16px]">
                                      <LatexRenderer latex={getContentText(o.text)} />
                                    </div>
                                    {o.imageUrl && (
                                      <img src={o.imageUrl} alt={o.id} className="mt-2 max-h-28 w-auto rounded-m3-sm border border-outline-variant bg-surface object-contain" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : isTyped ? (
            // open / numeric / fill_blank — nothing to pick, the student types the answer.
            <TextField
              label={t.input.typeAnswer}
              inputMode={currentQ.type === 'numeric' ? 'decimal' : 'text'}
              autoComplete="off"
              value={typeof currentAnswer === 'string' ? currentAnswer : ''}
              onChange={(e) => setTypedAnswer(e.target.value)}
            />
          ) : (
          <div className="grid gap-3">
             {Object.entries(currentQ.options || {}).map(([key, val]: any) => {
               const isSelected = selectedKeys.includes(key);
               return (
                 <button
                   key={key}
                   onClick={() => selectAnswer(key)}
                   aria-pressed={isSelected}
                   className={cn(
                     's-press flex w-full items-center gap-4 rounded-m3-md border p-4 text-left md:p-5',
                     isSelected
                       ? 'border-primary bg-primary-container text-on-primary-container'
                       : 'border-outline-variant bg-surface text-on-surface hover:bg-state-hover',
                   )}
                 >
                   <span className={cn(
                     'grid h-10 w-10 shrink-0 place-items-center border text-[15px] font-black',
                     isMultiSelect ? 'rounded-m3-xs' : 'rounded-m3-sm',
                     isSelected
                       ? 'border-primary bg-primary text-on-primary'
                       : 'border-outline-variant bg-surface-container-high text-on-surface-variant',
                   )}>
                     {isMultiSelect && isSelected ? <CheckCircle size={20} strokeWidth={3} /> : key}
                   </span>
                   <div className="w-full min-w-0">
                     <div className="break-words text-[15px] font-bold leading-relaxed md:text-[17px]"><LatexRenderer latex={getContentText(val)} /></div>
                     {val?.imageUrl && (
                       <img src={val.imageUrl} alt={`${key}`} className="mt-2 max-h-32 w-auto rounded-m3-sm border border-outline-variant bg-surface object-contain md:max-h-40" />
                     )}
                   </div>
                 </button>
               )
             })}
          </div>
          )}
        </div>
      </main>

      {/* 🟢 REDESIGNED MOBILE-FIRST FOOTER */}
      <footer className="z-20 flex min-h-[90px] shrink-0 items-center gap-3 border-t border-outline-variant bg-surface-container-low px-4 py-4 pb-[max(env(safe-area-inset-bottom,16px),16px)] md:px-6">

         <Button
           onClick={toggleFlag}
           variant={isFlagged ? 'tonal' : 'outlined'}
           tone={isFlagged ? 'gold' : 'primary'}
           size="lg"
           aria-label={isFlagged ? t.actions.flagged : t.actions.flag}
           className="h-14 w-14 shrink-0 px-0 text-[12px] uppercase tracking-[0.1em] md:w-auto md:flex-1 md:px-5"
         >
           <Flag size={20} strokeWidth={3} fill={isFlagged ? "currentColor" : "none"} /><span className="hidden md:inline">{isFlagged ? t.actions.flagged : t.actions.flag}</span>
         </Button>

         <Button
           onClick={() => setState(p => ({...p, currentQuestionIndex: Math.max(0, p.currentQuestionIndex - 1)}))}
           disabled={state.currentQuestionIndex === 0}
           variant="outlined"
           size="lg"
           aria-label={t.actions.prev}
           className="h-14 w-14 shrink-0 px-0 text-[12px] uppercase tracking-[0.1em] md:w-auto md:flex-1 md:px-6"
         >
           <ChevronLeft size={24} strokeWidth={3} /> <span className="hidden md:inline">{t.actions.prev}</span>
         </Button>

         <Button
           onClick={handleNextOrFinish}
           size="lg"
           tone={state.currentQuestionIndex < state.questions.length - 1 ? 'primary' : 'success'}
           trailingIcon={state.currentQuestionIndex < state.questions.length - 1 ? <ChevronRight size={20} strokeWidth={3} className="hidden md:block"/> : undefined}
           className="h-14 flex-1 text-[14px] uppercase tracking-[0.1em] md:text-[15px]"
         >
           {state.currentQuestionIndex < state.questions.length - 1 ? t.actions.next : t.actions.finish}
         </Button>
      </footer>
    </Page>
  );
}
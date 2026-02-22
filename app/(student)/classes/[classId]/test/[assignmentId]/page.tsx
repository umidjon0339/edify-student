'use client';

import { sendNotification } from '@/services/notificationService';
import { 
  setDoc, increment, updateDoc, arrayUnion, 
  writeBatch, runTransaction, doc, getDoc, 
  serverTimestamp, collection, query, where, getDocs 
} from 'firebase/firestore';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { 
  Loader2, Clock, AlertTriangle, CheckCircle, 
  ChevronRight, AlertCircle, Flag, Eye, Lock, ChevronLeft, Zap, Star,Maximize2, Minimize2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import LatexRenderer from '@/components/LatexRenderer'; 
import { useStudentLanguage } from '@/app/(student)/layout';

// --- 1. HELPERS: DATE & IDs ---
const getPeriodIds = () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');

  const oneJan = new Date(Date.UTC(year, 0, 1));
  const days = Math.floor((now.getTime() - oneJan.getTime()) / 86400000);
  const weekNum = Math.ceil((days + oneJan.getUTCDay() + 1) / 7);

  return {
    dayId: `day_${year}_${month}_${day}`,
    weekId: `week_${year}_${String(weekNum).padStart(2, '0')}`,
    monthId: `month_${year}_${month}`,
    globalId: `all_time`
  };
};

// 🟢 NEW: Date Helpers for Streak Logic (UTC)
const getUTCDateString = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

const getYesterdayString = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
};

// --- TRANSLATIONS (Unchanged) ---
const TEST_TRANSLATIONS = {
  uz: {
    loading: "Test yuklanmoqda...",
    error: "Testni yuklashda xatolik",
    back: "Ortga qaytish",
    lobby: {
      questions: "Savollar",
      minutes: "Daqiqa",
      instructions: "Ko'rsatmalar:",
      rule1: "Chiqib ketsangiz ham vaqt davom etadi.",
      rule2: "Sahifani keraksiz yangilamang.",
      rule3: "Tab almashtirish yozib boriladi.",
      startBtn: "Testni Boshlash",
      cancel: "Bekor qilish"
    },
    header: {
      question: "Savol",
      focus: "Diqqat",
      locked: "Qulflangan"
    },
    actions: {
      flagged: "Belgilangan",
      flag: "Belgilash",
      prev: "Oldingi",
      next: "Keyingi",
      finish: "Yakunlash",
      submit: "Topshirish",
      viewResults: "Natijani Ko'rish",
      returnClass: "Sinfga Qaytish"
    },
    modal: {
      title: "Testni Yakunlaysizmi?",
      answered: "Javob berildi",
      unanswered: "Javobsiz Savollar",
      back: "Qaytish"
    },
    result: {
      submitted: "Topshirildi!",
      saved: "Javoblaringiz saqlandi.",
      score: "Ball",
      hidden: "Natijalar hozircha yashirin.",
      xpEarned: "XP Qo'lga kiritildi!",
      breakdown: "Ballar taqsimoti"
    },
    toasts: {
      deadline: "Muddat tugagan.",
      maxAttempts: "Urinishlar limiti tugagan.",
      expired: "Sessiya muddati tugagan.",
      restored: "Sessiya tiklandi!",
      focusWarn: "Ogohlantirish: Diqqat yo'qotildi!",
      timeUp: "Vaqt tugadi! Topshirilmoqda...",
      missedQ: "Siz savolni o'tkazib yubordingiz!",
      success: "Topshirildi!",
      fail: "Xatolik. Internetni tekshiring."
    }
  },
  en: {
    loading: "Loading Test...",
    error: "Error loading test",
    back: "Go Back",
    lobby: {
      questions: "Questions",
      minutes: "Minutes",
      instructions: "Instructions:",
      rule1: "Timer continues if you leave.",
      rule2: "Do not refresh unnecessarily.",
      rule3: "Tab switching is recorded.",
      startBtn: "Start Test Now",
      cancel: "Cancel"
    },
    header: {
      question: "Q",
      focus: "Focus",
      locked: "Locked"
    },
    actions: {
      flagged: "Flagged",
      flag: "Flag",
      prev: "Previous",
      next: "Next",
      finish: "Finish Test",
      submit: "Submit",
      viewResults: "View Results",
      returnClass: "Return to Class"
    },
    modal: {
      title: "Finish Test?",
      answered: "Answered",
      unanswered: "Unanswered Questions",
      back: "Back"
    },
    result: {
      submitted: "Submitted!",
      saved: "Your answers are recorded.",
      score: "Score",
      hidden: "Results are currently hidden.",
      xpEarned: "XP Earned!",
      breakdown: "Point Breakdown"
    },
    toasts: {
      deadline: "Deadline passed.",
      maxAttempts: "Max attempts reached.",
      expired: "Session expired.",
      restored: "Session restored!",
      focusWarn: "Warning: Focus lost!",
      timeUp: "Time is up! Submitting...",
      missedQ: "You missed a question!",
      success: "Submitted!",
      fail: "Submission failed. Check internet."
    }
  },
  ru: {
    loading: "Загрузка теста...",
    error: "Ошибка загрузки",
    back: "Назад",
    lobby: {
      questions: "Вопросов",
      minutes: "Минут",
      instructions: "Инструкции:",
      rule1: "Таймер продолжается при выходе.",
      rule2: "Не обновляйте страницу без нужды.",
      rule3: "Переключение вкладок фиксируется.",
      startBtn: "Начать Тест",
      cancel: "Отмена"
    },
    header: {
      question: "Вопрос",
      focus: "Фокус",
      locked: "Заблокировано"
    },
    actions: {
      flagged: "Отмечено",
      flag: "Отметить",
      prev: "Назад",
      next: "Далее",
      finish: "Завершить",
      submit: "Сдать",
      viewResults: "Результаты",
      returnClass: "Вернуться в класс"
    },
    modal: {
      title: "Завершить тест?",
      answered: "Отвечено",
      unanswered: "Есть пропущенные вопросы",
      back: "Назад"
    },
    result: {
      submitted: "Сдано!",
      saved: "Ваши ответы сохранены.",
      score: "Балл",
      hidden: "Результаты скрыты.",
      xpEarned: "Получено XP!",
      breakdown: "Детализация"
    },
    toasts: {
      deadline: "Срок истек.",
      maxAttempts: "Лимит попыток исчерпан.",
      expired: "Сессия истекла.",
      restored: "Сессия восстановлена!",
      focusWarn: "Внимание: Потеря фокуса!",
      timeUp: "Время вышло! Отправка...",
      missedQ: "Вы пропустили вопрос!",
      success: "Сдано!",
      fail: "Ошибка отправки. Проверьте интернет."
    }
  }
};

const getContentText = (content: any) => {
  if (!content) return "";
  if (typeof content === 'string') return content;
  return content.uz || content.en || content.ru || content.text || JSON.stringify(content);
};

const isPastDeadline = (dueAt: any) => {
  if (!dueAt) return true; 
  const now = new Date(); 
  const due = new Date(dueAt.seconds * 1000);
  return now > due;
};

interface TestState {
  status: 'loading' | 'lobby' | 'taking' | 'submitted' | 'error';
  assignment: any;
  test: any;
  questions: any[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  flagged: string[];
  timeRemaining: number;
  tabSwitchCount: number;
  score?: number; 
  endTime?: number; 
  startTime?: number;
  earnedXP?: number;
  xpBreakdown?: string[];
}

export default function TestRunnerPage() {
  const { classId, assignmentId } = useParams() as { classId: string; assignmentId: string };
  const { user } = useAuth();
  const router = useRouter();
  const { lang } = useStudentLanguage();
  const t = TEST_TRANSLATIONS[lang];

  const [state, setState] = useState<TestState>({
    status: 'loading',
    assignment: null,
    test: null,
    questions: [],
    currentQuestionIndex: 0,
    answers: {},
    flagged: [],
    timeRemaining: 0,
    tabSwitchCount: 0
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollNavRef = useRef<HTMLDivElement>(null);
  const STORAGE_KEY = `test_session_${user?.uid}_${assignmentId}`;

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    if (!user) return;
    const userId = user.uid;

    async function loadData() {
      try {
        const assignRef = doc(db, 'classes', classId, 'assignments', assignmentId);
        const assignSnap = await getDoc(assignRef);
        if (!assignSnap.exists()) throw new Error("Assignment not found");
        const assignData = assignSnap.data();

        if (assignData.dueAt && isPastDeadline(assignData.dueAt)) {
          toast.error(t.toasts.deadline);
          localStorage.removeItem(STORAGE_KEY);
          router.push(`/classes/${classId}`);
          return;
        }

        const limit = assignData.allowedAttempts ?? 1;
        if (limit !== 0) { 
          const attemptsQ = query(collection(db, 'attempts'), where('assignmentId', '==', assignmentId), where('userId', '==', userId));
          const attemptsSnap = await getDocs(attemptsQ);
          if (attemptsSnap.size >= limit) {
            toast.error(t.toasts.maxAttempts);
            localStorage.removeItem(STORAGE_KEY);
            router.push(`/classes/${classId}/test/${assignmentId}/results`);
            return;
          }
        }

        const testRef = doc(db, 'custom_tests', assignData.testId);
        const testSnap = await getDoc(testRef);
        if (!testSnap.exists()) throw new Error("Test data missing");
        const testData = testSnap.data();

        const savedSession = localStorage.getItem(STORAGE_KEY);
        
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          const now = Date.now();
          const realTimeRemaining = Math.floor((parsed.endTime - now) / 1000);

          if (realTimeRemaining <= 0) {
            toast.error(t.toasts.expired);
            localStorage.removeItem(STORAGE_KEY);
          } else {
            setState({
              status: 'taking',
              assignment: assignData,
              test: testData,
              questions: testData.questions || [],
              currentQuestionIndex: parsed.currentQuestionIndex || 0,
              answers: parsed.answers || {},
              flagged: parsed.flagged || [],
              tabSwitchCount: parsed.tabSwitchCount || 0,
              timeRemaining: realTimeRemaining,
              endTime: parsed.endTime,
              startTime: parsed.startTime || Date.now()
            });
            toast.success(t.toasts.restored);
            return;
          }
        }

        setState(prev => ({
          ...prev,
          status: 'lobby',
          assignment: assignData,
          test: testData,
          questions: testData.questions || [],
          timeRemaining: (testData.duration || 60) * 60 
        }));

      } catch (e) {
        console.error(e);
        setState(prev => ({ ...prev, status: 'error' }));
      }
    }
    loadData();
  }, [classId, assignmentId, user, router, STORAGE_KEY, t]);

  // --- 2. AUTO-SAVE ---
  useEffect(() => {
    if (state.status === 'taking' && state.endTime) {
      const sessionData = {
        currentQuestionIndex: state.currentQuestionIndex,
        answers: state.answers,
        flagged: state.flagged,
        tabSwitchCount: state.tabSwitchCount,
        endTime: state.endTime,
        startTime: state.startTime
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    }
  }, [state.answers, state.flagged, state.currentQuestionIndex, state.tabSwitchCount, state.status, state.endTime, state.startTime, STORAGE_KEY]);

  // --- 3, 4, 5. EFFECTS ---
  useEffect(() => {
    if (state.status === 'taking' && scrollNavRef.current) {
      const activeButton = scrollNavRef.current.children[state.currentQuestionIndex] as HTMLElement;
      if (activeButton) activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [state.currentQuestionIndex, state.status]);

  useEffect(() => {
    if (state.status === 'taking' && state.timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setState(prev => {
          if (prev.timeRemaining <= 1) {
            clearInterval(timerRef.current!);
            handleAutoSubmit();
            return { ...prev, timeRemaining: 0 };
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state.status]);

  useEffect(() => {
    if (state.status !== 'taking') return;
    if (showSubmitModal) return; 
    const handleFocusLoss = () => {
      if (showSubmitModal) return;
      setState(prev => ({ ...prev, tabSwitchCount: prev.tabSwitchCount + 1 }));
      toast(t.toasts.focusWarn, { icon: '⚠️' });
    };
    document.addEventListener("visibilitychange", () => document.hidden && handleFocusLoss());
    window.addEventListener("blur", handleFocusLoss);
    document.addEventListener("contextmenu", (e) => e.preventDefault());
    return () => {
      document.removeEventListener("visibilitychange", () => {});
      window.removeEventListener("blur", handleFocusLoss);
      document.removeEventListener("contextmenu", () => {});
    };
  }, [state.status, showSubmitModal, t]);

  useEffect(() => {
    if (state.status !== 'taking' && state.status !== 'lobby') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (state.status === 'lobby') { startTest(); return; }
        if (showSubmitModal) { handleSubmit(); } else { handleNextOrFinish(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.status, showSubmitModal, state.currentQuestionIndex, state.answers]);

  // --- ACTIONS ---
  const startTest = () => {
    toggleFullscreen();
    const durationSec = (state.test.duration || 60) * 60;
    const now = Date.now();
    setState(prev => ({ 
      ...prev, 
      status: 'taking', 
      timeRemaining: durationSec, 
      endTime: now + (durationSec * 1000),
      startTime: now
    }));
  };

  const selectAnswer = (optionKey: string) => {
    const currentQ = state.questions[state.currentQuestionIndex];
    setState(prev => ({ ...prev, answers: { ...prev.answers, [currentQ.id]: optionKey } }));
  };

  const toggleFlag = () => {
    const currentQ = state.questions[state.currentQuestionIndex];
    setState(prev => {
      const isFlagged = prev.flagged.includes(currentQ.id);
      return { ...prev, flagged: isFlagged ? prev.flagged.filter(id => id !== currentQ.id) : [...prev.flagged, currentQ.id] };
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleAutoSubmit = () => { toast(t.toasts.timeUp, { icon: '⏰' }); handleSubmit(); };

  const handleNextOrFinish = () => {
    if (state.currentQuestionIndex < state.questions.length - 1) {
      setState(p => ({ ...p, currentQuestionIndex: p.currentQuestionIndex + 1 }));
    } else {
      const firstSkipped = state.questions.findIndex(q => !state.answers[q.id]);
      if (firstSkipped !== -1) {
        toast(t.toasts.missedQ, { icon: '📝' });
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

  // --- DATE HELPERS (UTC Standard) ---
const getTodayAndYesterday = () => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const yesterday = new Date(now);
  yesterday.setUTCDate(now.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  return { todayStr, yesterdayStr };
};

  // --- CORE: SUBMISSION ENGINE (Bug-Free & Robust) ---
  const handleSubmit = async () => {
    setShowSubmitModal(false);
    if (!user) return;
    
    const userId = user.uid;
    localStorage.removeItem(STORAGE_KEY); 

    // 1. Client-Side Grading
    let correctCount = 0;
    let earnedBaseXP = 0;

    state.questions.forEach(q => {
      const userAns = state.answers[q.id];
      if (userAns === q.answer) {
        correctCount++;
        const diff = (q.difficulty || 'easy').toLowerCase();
        if (diff === 'hard') earnedBaseXP += 4;
        else if (diff === 'medium') earnedBaseXP += 3;
        else earnedBaseXP += 2; 
      }
    });

    const scorePercentage = state.questions.length > 0 ? (correctCount / state.questions.length) * 100 : 0;
    const durationSeconds = state.startTime ? (Date.now() - state.startTime) / 1000 : 0;
    const timeLimitSeconds = (state.test.duration || 60) * 60;
    const attemptDocId = `${userId}_${assignmentId}`; 

    try {
      const attemptRef = doc(db, 'attempts', attemptDocId);
      const userRef = doc(db, 'users', userId);
      
      // 🟢 TRANSACTION START
      const result = await runTransaction(db, async (transaction) => {
        // A. READ DATA
        const attemptDoc = await transaction.get(attemptRef);
        const userDoc = await transaction.get(userRef);
        
        const isRetake = attemptDoc.exists();
        const userData = userDoc.exists() ? userDoc.data() : {};

        // --- ROBUST STREAK CALCULATION ---
        const { todayStr, yesterdayStr } = getTodayAndYesterday();
        
        // Sanitize DB Data (Handle missing fields)
        const lastActive = userData.lastActiveDate || "";
        let currentStreak = userData.currentStreak || 0;
        
        let streakBonus = 0;
        let streakMessage = "";

        // 🟢 LOGIC MAP:
        if (lastActive === todayStr) {
           // Case A: User already played today.
           // FIX: Ensure streak is at least 1 (Self-Healing)
           if (currentStreak === 0) currentStreak = 1;
        } else if (lastActive === yesterdayStr) {
           // Case B: User played yesterday -> Increment
           currentStreak += 1;
           // Milestones
           if (currentStreak === 7) { streakBonus = 30; streakMessage = "7 Day Streak!"; }
           if (currentStreak === 30) { streakBonus = 200; streakMessage = "30 Day Streak!"; }
        } else {
           // Case C: Missed a day OR First time ever -> Reset
           currentStreak = 1;
        }

        // --- XP CALCULATION ---
        let xpToAward = 0;
        let breakdown: string[] = [];

        if (!isRetake) {
          xpToAward = earnedBaseXP;
          breakdown.push(`Base Score: +${earnedBaseXP}`);
          if (scorePercentage > 80) { xpToAward += 5; breakdown.push("Perfectionist: +5"); }
          if (timeLimitSeconds > 0 && scorePercentage > 80 && durationSeconds < (timeLimitSeconds * 0.5)) {
            xpToAward += 5; breakdown.push("Speed Demon: +5");
          }
        } else {
          if (scorePercentage > 60) { xpToAward = 5; breakdown.push("Practice Reward: +5"); }
          else { xpToAward = 0; breakdown.push("Retake ≤ 60%: +0"); }
        }

        if (streakBonus > 0) {
          xpToAward += streakBonus;
          breakdown.push(`${streakMessage}: +${streakBonus}`);
        }

        // --- DAILY HISTORY LOGIC (30 Days) ---
        let dailyHistory = userData.dailyHistory || {};
        
        // 1. Add XP to Today
        const currentDailyXP = dailyHistory[todayStr] || 0;
        dailyHistory[todayStr] = currentDailyXP + xpToAward;

        // 2. Prune Old Dates
        const sortedDates = Object.keys(dailyHistory).sort(); 
        if (sortedDates.length > 30) {
          const newHistory: Record<string, number> = {};
          const recentDates = sortedDates.slice(sortedDates.length - 30);
          recentDates.forEach(date => newHistory[date] = dailyHistory[date]);
          dailyHistory = newHistory;
        }

        // B. WRITE DATA

        // 1. Update User Profile
        transaction.set(userRef, {
          totalXP: increment(xpToAward), 
          currentStreak: currentStreak, // Saved Correctly
          dailyHistory: dailyHistory,
          lastActiveDate: todayStr,
          displayName: user.displayName, 
          email: user.email,
          lastActiveTimestamp: serverTimestamp()
        }, { merge: true });

        // 2. Update Attempt
        const attemptData = {
          userId,
          userName: user.displayName,
          classId,
          assignmentId,
          testId: state.assignment.testId,
          testTitle: state.test.title,
          score: correctCount,
          totalQuestions: state.questions.length,
          answers: state.answers, 
          tabSwitches: state.tabSwitchCount, 
          submittedAt: serverTimestamp(),
          attemptsTaken: isRetake ? increment(1) : 1,
          xpEarned: xpToAward 
        };
        transaction.set(attemptRef, attemptData, { merge: true });

        return { xpToAward, breakdown, currentStreak };
      });

      // 3. WRITE FAN-OUT (Leaderboards)
      if (result.xpToAward > 0) {
        const batch = writeBatch(db);
        const { dayId, weekId, monthId, globalId } = getPeriodIds();
        
        const leaderboardData = {
          uid: userId,
          displayName: user.displayName || 'Student',
          avatar: user.photoURL || null,
          classId: classId,
          xp: increment(result.xpToAward), 
          lastActive: serverTimestamp()
        };

        [dayId, weekId, monthId, globalId].forEach(periodId => {
          const ref = doc(db, 'leaderboards', periodId, 'users', userId);
          batch.set(ref, leaderboardData, { merge: true });
        });

        const classRef = doc(db, 'classes', classId, 'leaderboard', userId);
        batch.set(classRef, leaderboardData, { merge: true });

        await batch.commit();
      }

      // Update Completion Array
      const assignmentRef = doc(db, 'classes', classId, 'assignments', assignmentId);
      await updateDoc(assignmentRef, { completedBy: arrayUnion(userId) }).catch(() => {});

      // Notify Teacher
      if (state.assignment.teacherId) {
        sendNotification(state.assignment.teacherId, 'submission', 'New Submission', `${user.displayName} finished: ${state.test.title}`, `/teacher/classes/${classId}`);
      }

      // Finalize State
      setState(prev => ({ 
        ...prev, 
        status: 'submitted', 
        score: correctCount,
        earnedXP: result.xpToAward, 
        xpBreakdown: result.breakdown 
      }));
      
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      
      // Toast with Streak Info
      if (result.currentStreak > 1) {
         toast.success(`${result.currentStreak} Day Streak! 🔥`, { icon: '🔥', duration: 3000 });
      } else {
         toast.success(t.toasts.success);
      }

    } catch (e) {
        console.error("Submission Error", e);
        toast.error(t.toasts.fail);
    }
  };

  // --- RENDERERS ---

  if (state.status === 'loading') return <div className="flex h-screen items-center justify-center bg-slate-50 text-indigo-600 gap-3"><Loader2 className="animate-spin" size={32} /><span className="font-bold">{t.loading}</span></div>;
  if (state.status === 'error') return <div className="flex h-screen items-center justify-center flex-col gap-4"><AlertTriangle size={48} className="text-red-500" /><h1 className="text-xl font-bold">{t.error}</h1><button onClick={() => router.back()} className="text-indigo-600 hover:underline">{t.back}</button></div>;

  if (state.status === 'lobby') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce"><Clock size={40} /></div>
        <div><h1 className="text-3xl font-black text-slate-900 mb-2">{state.test.title}</h1><p className="text-slate-500 font-medium">{state.questions.length} {t.lobby.questions} • {state.test.duration || 60} {t.lobby.minutes}</p></div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-left flex gap-3"><AlertCircle className="text-yellow-600 shrink-0" size={24} /><div className="text-sm text-yellow-800"><p className="font-bold mb-1">{t.lobby.instructions}</p><ul className="list-disc list-inside space-y-1 opacity-90"><li>{t.lobby.rule1}</li><li>{t.lobby.rule2}</li><li>{t.lobby.rule3}</li></ul></div></div>
        <button onClick={startTest} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-2xl shadow-lg shadow-indigo-200 hover:scale-[1.02] transition-all">{t.lobby.startBtn}</button>
        <button onClick={() => router.back()} className="text-slate-400 font-bold text-sm hover:text-slate-600">{t.lobby.cancel}</button>
      </div>
    </div>
  );

  // 🟢 GAMIFIED SUBMITTED VIEW
  if (state.status === 'submitted') {
    const visibility = state.test.resultsVisibility || (state.test.showResults ? 'always' : 'never');
    const canShow = visibility === 'always' || (visibility === 'after_due' && isPastDeadline(state.assignment.dueAt));
    const accuracy = Math.round((state.score! / state.questions.length) * 100);
    
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
           <div className="absolute top-10 left-10 text-9xl">🎉</div>
           <div className="absolute bottom-10 right-10 text-9xl">✨</div>
        </div>

        <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl border-b-8 border-slate-200 p-8 text-center space-y-6 relative z-10 animate-in zoom-in duration-300">
          <div className="relative">
             <div className="w-28 h-28 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce border-4 border-yellow-300 shadow-inner">
                <div className="text-6xl">🏆</div>
             </div>
             <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-1">{t.result.submitted}</h1>
             <p className="text-slate-400 font-bold text-sm uppercase tracking-wide">{t.result.saved}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
             {state.earnedXP !== undefined && state.earnedXP >= 0 && (
               <div className="col-span-2 bg-gradient-to-b from-amber-400 to-amber-500 rounded-2xl p-1 shadow-[0_6px_0_#b45309] active:translate-y-1 active:shadow-none transition-all relative overflow-hidden group">
                  <div className="bg-white/10 absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  <div className="bg-white/20 h-1/2 w-full absolute top-0 left-0 rounded-t-xl"></div>
                  <div className="relative p-5 flex flex-col items-center">
                    <div className="flex items-center gap-2 text-amber-900/60 font-black text-xs uppercase tracking-widest mb-1">
                      <Zap size={16} fill="currentColor" /> {t.result.xpEarned}
                    </div>
                    <span className="text-5xl font-black text-white drop-shadow-md tracking-tighter">+{state.earnedXP}</span>
                    {state.xpBreakdown && state.xpBreakdown.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                        {state.xpBreakdown.map((item, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-amber-600/30 rounded-lg text-[10px] font-bold text-white border border-white/20">
                            {item.split(':')[0]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
               </div>
             )}

             <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-[0_4px_0_#e2e8f0] flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t.result.score}</span>
                <span className="text-2xl font-black text-indigo-600">
                  {state.score} <span className="text-sm text-slate-300">/ {state.questions.length}</span>
                </span>
             </div>

             <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-[0_4px_0_#e2e8f0] flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Accuracy</span>
                <span className={`text-2xl font-black ${accuracy >= 80 ? 'text-green-500' : accuracy >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                  {accuracy}%
                </span>
             </div>
          </div>

          <div className="space-y-3 pt-2">
            {canShow ? (
              <button onClick={() => router.push(`/classes/${classId}/test/${assignmentId}/results`)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-[0_4px_0_#3730a3] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-3 text-lg">
                <Eye size={22} /> {t.actions.viewResults}
              </button>
            ) : (
              <div className="bg-slate-50 p-4 rounded-xl text-slate-500 text-sm font-bold flex items-center justify-center gap-2 border-2 border-slate-100 border-dashed">
                <Lock size={16} /> {t.result.hidden}
              </div>
            )}
            <button onClick={() => router.push(`/classes/${classId}`)} className="w-full py-4 bg-white border-2 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-black rounded-xl transition-all active:scale-[0.98]">
              {t.actions.returnClass}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = state.questions[state.currentQuestionIndex];
  const isFlagged = state.flagged.includes(currentQ.id);
  const answeredCount = Object.keys(state.answers).length;

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden select-none relative">
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4"><Flag size={32} /></div>
              <h2 className="text-xl font-black text-slate-900">{t.modal.title}</h2>
              <p className="text-slate-500 mt-2 text-sm">{t.modal.answered} <strong className="text-slate-900">{answeredCount}</strong> / <strong className="text-slate-900">{state.questions.length}</strong></p>
              {answeredCount < state.questions.length && <p className="text-orange-600 font-bold text-xs mt-3 bg-orange-50 py-1 px-3 rounded-full inline-block">⚠️ {t.modal.unanswered}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowSubmitModal(false)} className="py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl">{t.modal.back}</button>
              <button onClick={handleSubmit} className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg">{t.actions.submit}</button>
            </div>
          </div>
        </div>
      )}

      <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 bg-slate-50 shrink-0">
        <div className="font-black text-slate-700 flex items-center gap-3">
          <span className="text-sm md:text-base">{t.header.question} {state.currentQuestionIndex + 1} <span className="text-slate-400 font-medium">/ {state.questions.length}</span></span>
          {state.tabSwitchCount > 0 && <div className="flex items-center gap-1.5 bg-red-100 border border-red-200 text-red-700 px-2 py-0.5 rounded-full animate-pulse"><AlertCircle size={12} /><span className="text-[10px] md:text-xs font-bold">{t.header.focus}: {state.tabSwitchCount}</span></div>}
        </div>
        <div className={`flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full font-mono font-bold border transition-colors text-sm md:text-base ${state.timeRemaining < 60 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-white text-slate-700 border-slate-200'}`}>
          <Clock size={16} />{formatTime(state.timeRemaining)}
        </div>
        <div className="hidden md:flex gap-2"><button onClick={toggleFullscreen} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg">{isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button></div>
      </header>

      <div className="bg-white border-b border-slate-200 py-3 px-4 shadow-sm z-10 shrink-0">
         <div ref={scrollNavRef} className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 px-1">
            {state.questions.map((q, idx) => {
                const isActive = idx === state.currentQuestionIndex;
                const isAnswered = !!state.answers[q.id];
                const isQFlagged = state.flagged.includes(q.id);
                return (
                    <button 
                        key={idx} 
                        onClick={() => setState(p => ({...p, currentQuestionIndex: idx}))} 
                        className={`shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center font-bold text-sm transition-all border-2 ${isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105' : isQFlagged ? 'bg-orange-50 text-orange-600 border-orange-300' : isAnswered ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                    >
                        {isQFlagged ? <Flag size={14} fill="currentColor"/> : idx + 1}
                    </button>
                )
            })}
         </div>
      </div>

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full">
          <div className="mb-6 md:mb-8">
             <div className="text-lg md:text-2xl font-medium text-slate-800 leading-relaxed bg-white"><LatexRenderer latex={getContentText(currentQ.question)} /></div>
          </div>
          <div className="grid gap-3">
             {Object.entries(currentQ.options || {}).map(([key, val]: any) => {
               const isSelected = state.answers[currentQ.id] === key;
               return (
                 <button key={key} onClick={() => selectAnswer(key)} className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 group active:scale-[0.99] ${isSelected ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
                   <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{key}</span>
                   <div className="text-slate-700 font-medium text-sm md:text-base leading-relaxed break-words w-full"><LatexRenderer latex={getContentText(val)} /></div>
                 </button>
               )
             })}
          </div>
        </div>
      </main>

      <footer className="h-auto min-h-[80px] border-t border-slate-200 bg-white px-4 md:px-6 py-4 flex items-center justify-between shrink-0">
         <div className="flex w-full md:w-auto gap-3">
           <button onClick={toggleFlag} className={`flex-1 md:flex-none py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm transition-colors ${isFlagged ? 'bg-orange-50 border-orange-200 text-orange-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}><Flag size={18} fill={isFlagged ? "currentColor" : "none"} /><span className="hidden md:inline">{isFlagged ? t.actions.flagged : t.actions.flag}</span></button>
           <button onClick={() => setState(p => ({...p, currentQuestionIndex: Math.max(0, p.currentQuestionIndex - 1)}))} disabled={state.currentQuestionIndex === 0} className="flex-1 md:flex-none py-3 px-6 rounded-xl font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"><ChevronLeft size={20} className="md:hidden"/> <span className="hidden md:inline">{t.actions.prev}</span></button>
           <button onClick={handleNextOrFinish} className={`flex-[2] md:flex-none px-8 py-3 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg ${state.currentQuestionIndex < state.questions.length - 1 ? 'bg-slate-900 hover:bg-black' : 'bg-green-600 hover:bg-green-700 shadow-green-200'}`}>{state.currentQuestionIndex < state.questions.length - 1 ? <>{t.actions.next} <ChevronRight size={18} /></> : t.actions.finish}</button>
         </div>
      </footer>
    </div>
  );
}
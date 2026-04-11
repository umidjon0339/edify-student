'use client';

import { sendNotification } from '@/services/notificationService';
import { 
  increment, updateDoc, arrayUnion, writeBatch, runTransaction, doc, getDoc, 
  serverTimestamp, collection, query, where, getDocs 
} from 'firebase/firestore';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { 
  Loader2, Clock, AlertTriangle, CheckCircle, 
  ChevronRight, AlertCircle, Flag, Eye, Lock, ChevronLeft, Zap, Maximize2, Minimize2, ShieldAlert, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import LatexRenderer from '@/components/LatexRenderer'; 
import { useStudentLanguage } from '@/app/(student)/layout';
import { motion } from 'framer-motion';

// --- HELPERS ---
const getPeriodIds = () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const oneJan = new Date(Date.UTC(year, 0, 1));
  const days = Math.floor((now.getTime() - oneJan.getTime()) / 86400000);
  const weekNum = Math.ceil((days + oneJan.getUTCDay() + 1) / 7);
  return {
    dayId: `day_${year}_${month}_${day}`, weekId: `week_${year}_${String(weekNum).padStart(2, '0')}`,
    monthId: `month_${year}_${month}`, globalId: `all_time`
  };
};

const getTodayAndYesterday = () => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterday = new Date(now);
  yesterday.setUTCDate(now.getUTCDate() - 1);
  return { todayStr, yesterdayStr: yesterday.toISOString().split('T')[0] };
};

const getContentText = (content: any) => {
  if (!content) return "";
  if (typeof content === 'string') return content;
  return content.uz || content.en || content.ru || content.text || JSON.stringify(content);
};

const isPastDeadline = (dueAt: any) => {
  if (!dueAt) return true; 
  return new Date() > new Date(dueAt.seconds * 1000);
};

// --- TRANSLATIONS ---
const TEST_TRANSLATIONS: any = {
  uz: {
    loading: "Test yuklanmoqda...", error: "Testni yuklashda xatolik", back: "Ortga qaytish", grading: "Javoblar tekshirilmoqda...",
    lobby: { questions: "Savollar", minutes: "Daqiqa", instructions: "Ko'rsatmalar:", rule1: "Chiqib ketsangiz ham vaqt davom etadi.", rule2: "Sahifani keraksiz yangilamang.", rule3: "Tab almashtirish yozib boriladi va ballni pasaytiradi.", startBtn: "Testni Boshlash", cancel: "Bekor qilish" },
    header: { question: "Savol", focus: "Diqqat", locked: "Qulflangan" },
    actions: { flagged: "Belgilangan", flag: "Belgilash", prev: "Oldingi", next: "Keyingi", finish: "Yakunlash", submit: "Topshirish", viewResults: "Natijani Ko'rish", returnClass: "Sinfga Qaytish" },
    modal: { title: "Testni Yakunlaysizmi?", answered: "Javob berildi", unanswered: "Javobsiz Savollar", back: "Qaytish" },
    focusModal: { title: "Diqqat yo'qotildi!", desc: "Siz test oynasidan chiqdingiz yoki boshqa oynaga o'tdingiz. Bu holat yozib olindi va natijangizga ta'sir qilishi mumkin.", btn: "Tushundim, davom etish" },
    result: { submitted: "Topshirildi!", saved: "Javoblaringiz saqlandi.", score: "Ball", hidden: "Natijalar hozircha yashirin.", xpEarned: "XP Qo'lga kiritildi!", breakdown: "Ballar taqsimoti" },
    toasts: { deadline: "Muddat tugagan.", maxAttempts: "Urinishlar limiti tugagan.", expired: "Sessiya muddati tugagan.", restored: "Sessiya tiklandi!", focusWarn: "Diqqat yo'qotildi!", timeUp: "Vaqt tugadi! Topshirilmoqda...", missedQ: "Savolni o'tkazib yubordingiz!", success: "Topshirildi!", fail: "Xatolik." }
  },
  en: {
    loading: "Loading Test...", error: "Error loading test", back: "Go Back", grading: "Grading your answers...",
    lobby: { questions: "Questions", minutes: "Minutes", instructions: "Instructions:", rule1: "Timer continues if you leave.", rule2: "Do not refresh unnecessarily.", rule3: "Tab switching is recorded and may penalize your score.", startBtn: "Start Test Now", cancel: "Cancel" },
    header: { question: "Q", focus: "Focus", locked: "Locked" },
    actions: { flagged: "Flagged", flag: "Flag", prev: "Previous", next: "Next", finish: "Finish Test", submit: "Submit", viewResults: "View Results", returnClass: "Return to Class" },
    modal: { title: "Finish Test?", answered: "Answered", unanswered: "Unanswered Questions", back: "Back" },
    focusModal: { title: "Focus Lost!", desc: "You left the test window or switched tabs. This action has been recorded and may affect your final score.", btn: "I Understand, Resume" },
    result: { submitted: "Submitted!", saved: "Your answers are recorded.", score: "Score", hidden: "Results are currently hidden.", xpEarned: "XP Earned!", breakdown: "Point Breakdown" },
    toasts: { deadline: "Deadline passed.", maxAttempts: "Max attempts reached.", expired: "Session expired.", restored: "Session restored!", focusWarn: "Warning: Focus lost!", timeUp: "Time is up! Submitting...", missedQ: "You missed a question!", success: "Submitted!", fail: "Submission failed." }
  },
  ru: {
    loading: "Загрузка теста...", error: "Ошибка загрузки", back: "Назад", grading: "Проверка ответов...",
    lobby: { questions: "Вопросов", minutes: "Минут", instructions: "Инструкции:", rule1: "Таймер продолжается при выходе.", rule2: "Не обновляйте без нужды.", rule3: "Переключение вкладок фиксируется и снижает балл.", startBtn: "Начать Тест", cancel: "Отмена" },
    header: { question: "Вопрос", focus: "Фокус", locked: "Заблокировано" },
    actions: { flagged: "Отмечено", flag: "Отметить", prev: "Назад", next: "Далее", finish: "Завершить", submit: "Сдать", viewResults: "Результаты", returnClass: "Вернуться в класс" },
    modal: { title: "Завершить тест?", answered: "Отвечено", unanswered: "Есть пропущенные вопросы", back: "Назад" },
    focusModal: { title: "Фокус потерян!", desc: "Вы покинули окно теста или переключили вкладку. Это действие записано и может повлиять на ваш балл.", btn: "Понятно, продолжить" },
    result: { submitted: "Сдано!", saved: "Ваши ответы сохранены.", score: "Балл", hidden: "Результаты скрыты.", xpEarned: "Получено XP!", breakdown: "Детализация" },
    toasts: { deadline: "Срок истек.", maxAttempts: "Лимит попыток исчерпан.", expired: "Сессия истекла.", restored: "Сессия восстановлена!", focusWarn: "Потеря фокуса!", timeUp: "Время вышло!", missedQ: "Вы пропустили вопрос!", success: "Сдано!", fail: "Ошибка отправки." }
  }
};

interface TestState {
  status: 'loading' | 'lobby' | 'taking' | 'submitted' | 'error';
  assignment: any; test: any; questions: any[];
  currentQuestionIndex: number; answers: Record<string, string>; flagged: string[];
  tabSwitchCount: number; score?: number; endTime?: number; startTime?: number;
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
          toast.error(t.toasts.deadline);
          localStorage.removeItem(STORAGE_KEY);
          router.push(`/classes/${classId}`); return;
        }

        const limit = assignData.allowedAttempts ?? 1;
        if (limit !== 0) { 
          const attemptsSnap = await getDocs(query(collection(db, 'attempts'), where('assignmentId', '==', assignmentId), where('userId', '==', user!.uid)));
          if (attemptsSnap.size >= limit) {
            toast.error(t.toasts.maxAttempts);
            localStorage.removeItem(STORAGE_KEY);
            router.push(`/classes/${classId}/test/${assignmentId}/results`); return;
          }
        }

        const testSnap = await getDoc(doc(db, 'custom_tests', assignData.testId));
        if (!testSnap.exists()) throw new Error("Test missing");
        const testData = testSnap.data();

        const savedSession = localStorage.getItem(STORAGE_KEY);
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          const realTimeRemaining = Math.floor((parsed.endTime - Date.now()) / 1000);

          if (realTimeRemaining <= 0) {
            toast.error(t.toasts.expired);
            localStorage.removeItem(STORAGE_KEY);
          } else {
            setState({
              status: 'taking', assignment: assignData, test: testData, questions: testData.questions || [],
              currentQuestionIndex: parsed.currentQuestionIndex || 0, answers: parsed.answers || {},
              flagged: parsed.flagged || [], tabSwitchCount: parsed.tabSwitchCount || 0,
              endTime: parsed.endTime, startTime: parsed.startTime || Date.now()
            });
            setDisplayTime(realTimeRemaining);
            toast.success(t.toasts.restored); return;
          }
        }

        setState(prev => ({
          ...prev, status: 'lobby', assignment: assignData, test: testData, questions: testData.questions || []
        }));
        setDisplayTime((testData.duration || 60) * 60);

      } catch (e) { setState(prev => ({ ...prev, status: 'error' })); }
    }
    loadData();
  }, [classId, assignmentId, user, router, STORAGE_KEY, t]);

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
          toast(t.toasts.timeUp, { icon: '⏰' });
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

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("contextmenu", (e) => e.preventDefault()); 

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("contextmenu", () => {});
    };
  }, [state.status, showSubmitModal, showFocusWarning, isSubmitting]);

  // --- 6. KEYBOARD SHORTCUTS ---
  useEffect(() => {
    if (state.status !== 'taking' || showSubmitModal || showFocusWarning || isSubmitting) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentQ = state.questions[state.currentQuestionIndex];
      const optionsKeys = Object.keys(currentQ?.options || {});
      const num = parseInt(e.key);
      
      if (!isNaN(num) && num > 0 && num <= optionsKeys.length) {
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
    setState(prev => ({ 
      ...prev, status: 'taking', endTime: now + (durationSec * 1000), startTime: now
    }));
    setDisplayTime(durationSec);
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

  const handleSubmit = async () => {
    setShowSubmitModal(false);
    setIsSubmitting(true); 
    
    if (!user) { setIsSubmitting(false); return; }
    
    const userId = user.uid;
    localStorage.removeItem(STORAGE_KEY); 

    let correctCount = 0;
    let earnedBaseXP = 0;

    state.questions.forEach(q => {
      if (state.answers[q.id] === q.answer) {
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
      const result = await runTransaction(db, async (transaction) => {
        const attemptDoc = await transaction.get(doc(db, 'attempts', attemptDocId));
        const userDoc = await transaction.get(doc(db, 'users', userId));
        
        const isRetake = attemptDoc.exists();
        const previousAttempts = isRetake ? attemptDoc.data()?.attemptsTaken || 0 : 0;
        const userData = userDoc.exists() ? userDoc.data() : {};
        const existingHistory = Array.isArray(userData?.recentActivity) ? userData.recentActivity : [];

        const { todayStr, yesterdayStr } = getTodayAndYesterday();
        const lastActive = userData?.lastActiveDate || "";
        let currentStreak = userData?.currentStreak || 0;
        let streakBonus = 0;
        let streakMessage = "";

        if (lastActive === todayStr) {
           if (currentStreak === 0) currentStreak = 1;
        } else if (lastActive === yesterdayStr) {
           currentStreak += 1;
           if (currentStreak === 7) { streakBonus = 30; streakMessage = "7 Day Streak!"; }
           if (currentStreak === 30) { streakBonus = 200; streakMessage = "30 Day Streak!"; }
        } else { currentStreak = 1; }

        let xpToAward = 0;
        let breakdown: string[] = [];

        if (previousAttempts >= 10) {
          xpToAward = 0; breakdown.push("Max retakes reached: +0");
        } else if (!isRetake) {
          xpToAward = earnedBaseXP; breakdown.push(`Base Score: +${earnedBaseXP}`);
          if (state.tabSwitchCount === 0) {
            if (scorePercentage > 80) { xpToAward += 5; breakdown.push("Perfectionist: +5"); }
            if (timeLimitSeconds > 0 && scorePercentage > 80 && durationSeconds < (timeLimitSeconds * 0.5)) { xpToAward += 5; breakdown.push("Speed Demon: +5"); }
          } else { breakdown.push(`No Bonus (Focus Lost ${state.tabSwitchCount}x)`); }
        } else {
          if (scorePercentage > 60 && state.questions.length > 5 && state.tabSwitchCount < 2) { 
            xpToAward = 5; breakdown.push("Practice Reward: +5"); 
          } else { 
            xpToAward = 0; breakdown.push("Retake / Penalty: +0"); 
          }
        }

        if (streakBonus > 0) { xpToAward += streakBonus; breakdown.push(`${streakMessage}: +${streakBonus}`); }

        let dailyHistory = userData?.dailyHistory || {};
        dailyHistory[todayStr] = (dailyHistory[todayStr] || 0) + xpToAward;
        const sortedDates = Object.keys(dailyHistory).sort(); 
        if (sortedDates.length > 30) {
          const newHistory: Record<string, number> = {};
          sortedDates.slice(sortedDates.length - 30).forEach(date => newHistory[date] = dailyHistory[date]);
          dailyHistory = newHistory;
        }

        const updatedHistory = [{ id: attemptDocId, testTitle: state.test.title, score: correctCount, totalQuestions: state.questions.length, submittedAt: Date.now() }, ...existingHistory].slice(0, 5);

        transaction.set(doc(db, 'users', userId), {
          totalXP: increment(xpToAward), currentStreak, dailyHistory, lastActiveDate: todayStr,
          displayName: user.displayName, email: user.email, lastActiveTimestamp: serverTimestamp(), recentActivity: updatedHistory
        }, { merge: true });

        transaction.set(doc(db, 'attempts', attemptDocId), {
          userId, userName: user.displayName, classId, assignmentId,type: 'assignment', testId: state.assignment.testId,
          testTitle: state.test.title, score: correctCount, totalQuestions: state.questions.length,
          answers: state.answers, tabSwitches: state.tabSwitchCount, submittedAt: serverTimestamp(),
          attemptsTaken: isRetake ? increment(1) : 1, xpEarned: xpToAward 
        }, { merge: true });

        return { xpToAward, breakdown, currentStreak, latestName: userData?.displayName || user.displayName || 'Student', latestAvatar: userData?.photoURL || user.photoURL || null };
      });

      if (result.xpToAward > 0) {
        const batch = writeBatch(db);
        const { dayId, weekId, monthId, globalId } = getPeriodIds();
        const lbData = { uid: userId, displayName: result.latestName, avatar: result.latestAvatar, classId, xp: increment(result.xpToAward), lastActive: serverTimestamp() };
        [dayId, weekId, monthId, globalId].forEach(pid => batch.set(doc(db, 'leaderboards', pid, 'users', userId), lbData, { merge: true }));
        batch.set(doc(db, 'classes', classId, 'leaderboard', userId), lbData, { merge: true });
        await batch.commit();
      }

      await updateDoc(doc(db, 'classes', classId, 'assignments', assignmentId), { completedBy: arrayUnion(userId) }).catch(() => {});

      setState(prev => ({ ...prev, status: 'submitted', score: correctCount, earnedXP: result.xpToAward, xpBreakdown: result.breakdown }));
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      if (result.currentStreak > 1) toast.success(`${result.currentStreak} Day Streak! 🔥`, { icon: '🔥', duration: 3000 });
      else toast.success(t.toasts.success);

    } catch (e) { 
      toast.error(t.toasts.fail); 
    } finally {
      setIsSubmitting(false); 
    }
  };

  // --- RENDERERS ---
  if (state.status === 'loading') return <div className="flex h-screen items-center justify-center bg-zinc-50 text-indigo-600 gap-3"><Loader2 className="animate-spin" size={32} /><span className="font-bold">{t.loading}</span></div>;
  if (state.status === 'error') return <div className="flex h-screen items-center justify-center flex-col gap-4"><AlertTriangle size={48} className="text-red-500" /><h1 className="text-xl font-bold">{t.error}</h1><button onClick={() => router.back()} className="text-indigo-600 hover:underline">{t.back}</button></div>;

  if (state.status === 'lobby') return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-lg w-full bg-white rounded-[2rem] shadow-xl border-2 border-b-8 border-zinc-200 p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-2 border-2 border-indigo-100 rotate-6"><Clock size={40} strokeWidth={2.5}/></div>
        <div><h1 className="text-3xl font-black text-zinc-900 mb-2 tracking-tight">{state.test.title}</h1><p className="text-zinc-500 font-bold uppercase tracking-widest text-[12px]">{state.questions.length} {t.lobby.questions} • {state.test.duration || 60} {t.lobby.minutes}</p></div>
        <div className="bg-amber-50 border-2 border-amber-200 rounded-[1.5rem] p-4 text-left flex gap-3"><AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={24} strokeWidth={2.5} /><div className="text-[13px] text-amber-900"><p className="font-black mb-1 uppercase tracking-widest">{t.lobby.instructions}</p><ul className="list-disc list-inside space-y-1 font-bold opacity-80"><li>{t.lobby.rule1}</li><li>{t.lobby.rule2}</li><li>{t.lobby.rule3}</li></ul></div></div>
        <button onClick={startTest} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[16px] uppercase tracking-widest rounded-2xl active:translate-y-[2px] transition-all">{t.lobby.startBtn}</button>
        <button onClick={() => router.back()} className="text-zinc-400 font-black text-[12px] uppercase tracking-widest hover:text-zinc-600">{t.lobby.cancel}</button>
      </div>
    </div>
  );

  if (state.status === 'submitted') {
    const visibility = state.test.resultsVisibility || (state.test.showResults ? 'always' : 'never');
    const canShow = visibility === 'always' || (visibility === 'after_due' && isPastDeadline(state.assignment.dueAt));
    const accuracy = Math.round((state.score! / state.questions.length) * 100);

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
      <div className="min-h-screen bg-indigo-50/50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        
        {/* 🟢 FLOATING BACKGROUND EMOJIS (Confetti Effect) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
           <motion.div initial={{ y: "100vh", x: "10vw", opacity: 0 }} animate={{ y: "-20vh", opacity: [0, 1, 0], rotate: 360 }} transition={{ duration: 4, ease: "easeOut", delay: 0.1 }} className="absolute text-5xl">✨</motion.div>
           <motion.div initial={{ y: "100vh", x: "80vw", opacity: 0 }} animate={{ y: "-10vh", opacity: [0, 1, 0], rotate: -180 }} transition={{ duration: 3.5, ease: "easeOut", delay: 0.3 }} className="absolute text-6xl">🎉</motion.div>
           <motion.div initial={{ y: "100vh", x: "50vw", opacity: 0 }} animate={{ y: "-30vh", opacity: [0, 1, 0], rotate: 90 }} transition={{ duration: 4.5, ease: "easeOut", delay: 0.5 }} className="absolute text-5xl">🔥</motion.div>
        </div>

        <motion.div 
          variants={container} 
          initial="hidden" 
          animate="show" 
          className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl border-2 border-b-[8px] border-zinc-200 p-8 text-center space-y-6 relative z-10"
        >
          {/* HEADER & TROPHY */}
          <motion.div variants={item} className="relative mt-2">
             <motion.div 
                initial={{ scale: 0, rotate: -45 }} 
                animate={{ scale: 1, rotate: 0 }} 
                transition={{ type: "spring", bounce: 0.6, delay: 0.2, duration: 0.8 }}
                className="w-32 h-32 bg-amber-100 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border-4 border-amber-300 shadow-inner rotate-6"
              >
                <div className="text-7xl drop-shadow-md">🏆</div>
             </motion.div>
             <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">{t.result.submitted}</h1>
             <p className="text-zinc-400 font-black text-[12px] uppercase tracking-widest">{t.result.saved}</p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
             {/* 🟢 XP CARD (Spans full width) */}
             {state.earnedXP !== undefined && state.earnedXP >= 0 && (
               <motion.div variants={item} className="col-span-2 relative overflow-hidden group">
                 {/* Shimmer Effect */}
                 <div className="absolute top-0 -inset-full h-full w-1/2 z-10 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shimmer" />
                 
                 <div className="bg-amber-500 rounded-3xl p-1 border-b-[6px] border-amber-600 shadow-sm transition-all">
                    <div className="relative p-6 flex flex-col items-center">
                      <div className="flex items-center gap-2 text-amber-900/60 font-black text-[12px] uppercase tracking-widest mb-1">
                        <Zap size={18} fill="currentColor" /> {t.result.xpEarned}
                      </div>
                      <span className="text-6xl font-black text-white drop-shadow-sm tracking-tighter">
                        +<AnimatedNumber value={state.earnedXP} />
                      </span>

                      {/* 🟢 XP BREAKDOWN PILLS */}
                      {state.xpBreakdown && state.xpBreakdown.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 mt-4">
                          {state.xpBreakdown.map((item, idx) => (
                            <motion.span 
                              key={idx} 
                              initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 + (idx * 0.2) }}
                              className="px-3 py-1 bg-amber-700/30 rounded-xl text-[11px] font-black text-white border-2 border-white/20 uppercase tracking-wider"
                            >
                              {item.split(':')[0]} <span className="text-amber-200">{item.split(':')[1]}</span>
                            </motion.span>
                          ))}
                        </div>
                      )}
                    </div>
                 </div>
               </motion.div>
             )}

             {/* 🟢 SCORE CARD */}
             <motion.div variants={item} className="bg-white border-2 border-zinc-200 border-b-[6px] rounded-[1.5rem] p-5 flex flex-col items-center justify-center">
                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t.result.score}</span>
                <span className="text-3xl font-black text-indigo-600">
                  <AnimatedNumber value={state.score!} /> <span className="text-lg text-zinc-300">/ {state.questions.length}</span>
                </span>
             </motion.div>

             {/* 🟢 ACCURACY CARD */}
             <motion.div variants={item} className="bg-white border-2 border-zinc-200 border-b-[6px] rounded-[1.5rem] p-5 flex flex-col items-center justify-center">
                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-1">Accuracy</span>
                <span className={`text-3xl font-black ${accuracy >= 80 ? 'text-emerald-500' : accuracy >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                  <AnimatedNumber value={accuracy} suffix="%" />
                </span>
             </motion.div>
          </div>

          {/* 🟢 ACTION BUTTONS */}
          <motion.div variants={item} className="space-y-3 pt-4">
            {canShow ? (
              <button 
                onClick={() => router.push(`/classes/${classId}/test/${assignmentId}/results`)} 
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-[1.2rem] border-b-4 border-indigo-800 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-3 text-[15px] uppercase tracking-widest"
              >
                <Eye size={20} strokeWidth={3}/> {t.actions.viewResults}
              </button>
            ) : (
              <div className="bg-zinc-50 p-4 rounded-[1.2rem] text-zinc-500 text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border-2 border-zinc-200 border-dashed">
                <Lock size={16} strokeWidth={3}/> {t.result.hidden}
              </div>
            )}
            <button 
              onClick={() => router.push(`/classes/${classId}`)} 
              className="w-full py-4 bg-white border-2 border-zinc-200 border-b-4 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 font-black text-[13px] uppercase tracking-widest rounded-[1.2rem] transition-all active:translate-y-[2px] active:border-b-2"
            >
              {t.actions.returnClass}
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  const currentQ = state.questions[state.currentQuestionIndex];
  const isFlagged = state.flagged.includes(currentQ.id);
  const answeredCount = Object.keys(state.answers).length;

  return (
    // 🟢 OPTION 1 IMPLEMETED: "Immersive Mode" (Fixed, inset-0, z-high) 
    // This perfectly overlays the global layout and ensures no scroll issues.
    <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-50 overflow-hidden select-none font-sans">
      
      {isSubmitting && (
        <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-white/90 backdrop-blur-md">
           <div className="w-24 h-24 bg-indigo-50 border-4 border-indigo-100 text-indigo-600 rounded-[2rem] flex items-center justify-center mb-6 animate-spin shadow-xl">
             <Loader2 size={48} strokeWidth={3} />
           </div>
           <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{t.grading || "Grading your answers..."}</h2>
           <p className="text-zinc-500 font-bold text-[13px] uppercase tracking-widest mt-2">Please wait</p>
        </div>
      )}

      {showFocusWarning && !isSubmitting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in-95 border-2 border-red-100">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border-2 border-red-200 rotate-12">
              <ShieldAlert size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight mb-3">{t.focusModal.title}</h2>
            <p className="text-zinc-500 font-bold text-[14px] leading-relaxed mb-8">{t.focusModal.desc}</p>
            <button 
              onClick={() => setShowFocusWarning(false)} 
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black text-[15px] uppercase tracking-widest rounded-2xl shadow-lg border-b-4 border-red-800 active:border-b-0 active:translate-y-[4px] transition-all"
            >
              {t.focusModal.btn}
            </button>
          </div>
        </div>
      )}

      {showSubmitModal && !isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border-2 border-zinc-200 animate-in zoom-in-95">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-[1.2rem] border-2 border-indigo-100 flex items-center justify-center mx-auto mb-4"><Flag size={32} strokeWidth={2.5}/></div>
              <h2 className="text-[20px] font-black text-zinc-900 tracking-tight">{t.modal.title}</h2>
              <p className="text-zinc-500 font-bold mt-2 text-[14px] uppercase tracking-widest">{t.modal.answered} <strong className="text-indigo-600">{answeredCount}</strong> / <strong className="text-zinc-900">{state.questions.length}</strong></p>
              {answeredCount < state.questions.length && <p className="text-amber-600 font-black text-[11px] uppercase tracking-widest mt-4 bg-amber-50 border-2 border-amber-200 py-1.5 px-3 rounded-lg inline-block">⚠️ {t.modal.unanswered}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowSubmitModal(false)} className="py-4 font-black text-[12px] uppercase tracking-widest text-zinc-500 bg-white border-2 border-zinc-200 border-b-4 hover:bg-zinc-50 rounded-xl active:translate-y-[2px] active:border-b-2 transition-all">{t.modal.back}</button>
              <button onClick={handleSubmit} className="py-4 bg-indigo-600 hover:bg-indigo-500 border-b-4 border-indigo-800 text-white font-black text-[12px] uppercase tracking-widest rounded-xl active:translate-y-[4px] active:border-b-0 transition-all">{t.actions.submit}</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="h-16 md:h-20 border-b-2 border-zinc-200 flex items-center justify-between px-4 md:px-6 bg-white shrink-0 shadow-sm z-20 relative">
        <div className="font-black text-zinc-800 flex items-center gap-3">
          <span className="text-[15px] md:text-[18px] tracking-tight">{t.header.question} {state.currentQuestionIndex + 1} <span className="text-zinc-300">/ {state.questions.length}</span></span>
          {state.tabSwitchCount > 0 && <div className="flex items-center gap-1.5 bg-red-50 border-2 border-red-200 text-red-600 px-3 py-1 rounded-xl"><AlertCircle size={14} strokeWidth={3}/><span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest">{t.header.focus}: {state.tabSwitchCount}</span></div>}
        </div>
        
        <div className="flex items-center gap-3">
           <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-black border-2 border-b-4 transition-colors text-[14px] md:text-[16px] ${displayTime < 60 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-white text-zinc-700 border-zinc-200'}`}>
             <Clock size={18} strokeWidth={2.5}/>{formatTime(displayTime)}
           </div>
           <button onClick={() => { if(confirm("Are you sure you want to exit? Timer will continue running.")) { router.back(); } }} className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors border-2 border-zinc-200 lg:hidden">
             <X size={20} strokeWidth={3} />
           </button>
        </div>
      </header>

      {/* NUMBER NAVIGATOR */}
      <div className="bg-zinc-50 border-b-2 border-zinc-200 py-3 px-4 shadow-inner z-10 shrink-0">
         <div ref={scrollNavRef} className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 px-1">
            {state.questions.map((q, idx) => {
                const isActive = idx === state.currentQuestionIndex;
                const isAnswered = !!state.answers[q.id];
                const isQFlagged = state.flagged.includes(q.id);
                return (
                    <button 
                        key={idx} onClick={() => setState(p => ({...p, currentQuestionIndex: idx}))} 
                        className={`shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-[1rem] flex items-center justify-center font-black text-[15px] transition-all border-2 border-b-4 active:border-b-2 active:translate-y-[2px] ${isActive ? 'bg-indigo-600 text-white border-indigo-800 shadow-md scale-105' : isQFlagged ? 'bg-amber-50 text-amber-500 border-amber-300' : isAnswered ? 'bg-zinc-800 text-white border-zinc-900' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'}`}
                    >
                        {isQFlagged && !isActive ? <Flag size={16} strokeWidth={3} fill="currentColor"/> : idx + 1}
                    </button>
                )
            })}
         </div>
      </div>

      {/* QUESTION BODY */}
      <main className="flex-1 flex overflow-hidden bg-white">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full pb-24">
          <div className="mb-8">
             <div className="text-[18px] md:text-[22px] font-bold text-zinc-900 leading-relaxed"><LatexRenderer latex={getContentText(currentQ.question)} /></div>
          </div>
          <div className="grid gap-3">
             {Object.entries(currentQ.options || {}).map(([key, val]: any) => {
               const isSelected = state.answers[currentQ.id] === key;
               return (
                 <button key={key} onClick={() => selectAnswer(key)} className={`w-full text-left p-4 md:p-5 rounded-[1.5rem] border-2 border-b-[6px] transition-all flex items-center gap-4 group active:translate-y-[4px] active:border-b-2 ${isSelected ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-zinc-200 hover:border-indigo-300 hover:bg-zinc-50 bg-white'}`}>
                   <span className={`w-10 h-10 rounded-[1rem] flex items-center justify-center text-[15px] font-black transition-colors shrink-0 border-2 ${isSelected ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>
                     {key} 
                   </span>
                   <div className="text-zinc-800 font-bold text-[15px] md:text-[17px] leading-relaxed break-words w-full"><LatexRenderer latex={getContentText(val)} /></div>
                 </button>
               )
             })}
          </div>
        </div>
      </main>

      {/* 🟢 REDESIGNED MOBILE-FIRST FOOTER */}
      <footer className="h-auto min-h-[90px] border-t-2 border-zinc-200 bg-zinc-50 px-4 md:px-6 py-4 pb-[max(env(safe-area-inset-bottom,16px),16px)] flex items-center gap-3 shrink-0 z-20">
         
         <button onClick={toggleFlag} className={`w-14 h-14 md:w-auto md:flex-1 md:px-5 rounded-[1.2rem] border-2 border-b-4 flex items-center justify-center gap-2 font-black text-[12px] uppercase tracking-widest transition-all active:translate-y-[2px] active:border-b-2 ${isFlagged ? 'bg-amber-50 border-amber-300 text-amber-600' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-100'}`}>
           <Flag size={20} strokeWidth={3} fill={isFlagged ? "currentColor" : "none"} /><span className="hidden md:inline">{isFlagged ? t.actions.flagged : t.actions.flag}</span>
         </button>
         
         <button onClick={() => setState(p => ({...p, currentQuestionIndex: Math.max(0, p.currentQuestionIndex - 1)}))} disabled={state.currentQuestionIndex === 0} className="w-14 h-14 md:w-auto md:flex-1 md:px-6 rounded-[1.2rem] font-black text-[12px] uppercase tracking-widest text-zinc-600 bg-white border-2 border-zinc-200 border-b-4 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center active:translate-y-[2px] active:border-b-2">
           <ChevronLeft size={24} strokeWidth={3} /> <span className="hidden md:inline">{t.actions.prev}</span>
         </button>
         
         <button onClick={handleNextOrFinish} className={`flex-1 px-4 py-3 md:py-4 h-14 text-white font-black text-[14px] md:text-[15px] uppercase tracking-widest rounded-[1.2rem] border-b-4 transition-all flex items-center justify-center gap-2 shadow-sm active:translate-y-[4px] active:border-b-0 ${state.currentQuestionIndex < state.questions.length - 1 ? 'bg-zinc-800 border-black hover:bg-black' : 'bg-emerald-500 border-emerald-700 hover:bg-emerald-400'}`}>
           {state.currentQuestionIndex < state.questions.length - 1 ? <>{t.actions.next} <ChevronRight size={20} strokeWidth={3} className="hidden md:block"/></> : t.actions.finish}
         </button>
      </footer>
    </div>
  );
}
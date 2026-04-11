'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp, collection } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { 
  Loader2, Clock, AlertTriangle, CheckCircle2, ShieldAlert, 
  ChevronRight, Play, Lock, FileBadge, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStudentLanguage } from '@/app/(student)/layout';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// --- TRANSLATIONS ---
const EXAM_TRANSLATIONS: any = {
  uz: {
    loading: "Imtihon yuklanmoqda...",
    closed: { title: "Imtihon yopilgan", desc: "Bu imtihon vaqti tugagan yoki hali boshlanmagan.", back: "Ortga qaytish" },
    submitted: { title: "Qabul qilindi!", desc: "Javoblaringiz muvaffaqiyatli saqlandi. Natijalarni o'qituvchi e'lon qilganda ko'rishingiz mumkin.", back: "Asosiy sahifaga qaytish" },
    waiting: { rules: "Qat'iy Qoidalar", rule1: "Testni boshlaganingizdan so'ng vaqt to'xtamaydi.", rule2: "Oynani (tab) almashtirish yoki yopish taqiqlanadi. Tizim buni avtomatik hisoblaydi.", rule3: "Vaqt tugaganda javoblar avtomatik yuboriladi.", start: "Tushundim, Boshlash", early: "Imtihon hali boshlanmagan." },
    active: { warning: "Ogohlantirish! Oynani tark etdingiz. Bu ustozga xabar qilinadi.", focusLost: "Diqqat yo'qotildi", submitConfirm: "Barcha javoblarni yubormoqchimisiz? Buning ortiga qaytib bo'lmaydi.", submitAuto: "Vaqt tugadi! Javoblar avtomatik yuborilmoqda...", finish: "Yakunlash va Yuborish", saving: "Saqlanmoqda...", cancel: "Bekor qilish", confirm: "Topshirish" }
  },
  en: {
    loading: "Loading Exam...",
    closed: { title: "Exam Closed", desc: "The exam time has ended or hasn't started yet.", back: "Go Back" },
    submitted: { title: "Submitted!", desc: "Your answers have been saved. You can view results when the teacher releases them.", back: "Return to Dashboard" },
    waiting: { rules: "Strict Rules", rule1: "Timer does not stop once started.", rule2: "Switching tabs is prohibited and tracked.", rule3: "Answers auto-submit when time is up.", start: "I Understand, Start", early: "Exam hasn't started yet." },
    active: { warning: "Warning! You left the tab. This will be reported.", focusLost: "Focus Lost", submitConfirm: "Submit all answers? This cannot be undone.", submitAuto: "Time's up! Auto-submitting answers...", finish: "Finish and Submit", saving: "Saving...", cancel: "Cancel", confirm: "Submit" }
  },
  ru: {
    loading: "Загрузка экзамена...",
    closed: { title: "Экзамен закрыт", desc: "Время экзамена истекло или еще не началось.", back: "Вернуться" },
    submitted: { title: "Принято!", desc: "Ваши ответы сохранены. Результаты будут доступны после публикации учителем.", back: "На главную" },
    waiting: { rules: "Строгие правила", rule1: "Таймер не останавливается после старта.", rule2: "Переключение вкладок запрещено и отслеживается.", rule3: "Ответы отправляются автоматически по истечении времени.", start: "Понятно, Начать", early: "Экзамен еще не начался." },
    active: { warning: "Внимание! Вы покинули вкладку. Это будет зафиксировано.", focusLost: "Потеря фокуса", submitConfirm: "Отправить все ответы? Это действие необратимо.", submitAuto: "Время вышло! Автоматическая отправка...", finish: "Завершить и Отправить", saving: "Сохранение...", cancel: "Отмена", confirm: "Сдать" }
  }
};

// 🟢 BULLETPROOF LATEX RENDERER
const FormattedText = ({ text }: { text: any }) => {
  if (!text) return null;
  let content = typeof text === 'string' ? text : JSON.stringify(text);
  const hasMathCommands = /\\frac|\\pi|\\sin|\\cos|\\tan|\\ge|\\le|\\cup|\\cap|\\in|\\begin|\\sqrt|\\empty/.test(content);
  if (!content.includes('$') && hasMathCommands) content = `$${content}$`;
  content = content.replace(/\\\((.*?)\\\)/g, '$$$1$$').replace(/\\\[(.*?)\\\]/g, '$$$$$1$$$$').replace(/&nbsp;/g, ' ').replace(/\\\\/g, '\\');
  
  const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
  
  return (
    <span className="break-words leading-relaxed text-zinc-800 inline-block">
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(math, { displayMode: true, throwOnError: false, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="block my-2 overflow-x-auto custom-scrollbar" />;
          } catch (e) { return <span key={index} className="text-red-500 font-mono text-[13px] bg-red-50 px-1 rounded">{part}</span>; }
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(math, { displayMode: false, throwOnError: false, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="px-1 inline-block" />;
          } catch (e) { return <span key={index} className="text-red-500 font-mono text-[13px] bg-red-50 px-1 rounded">{part}</span>; }
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
function ExamPlayerContent() {
  const { examId } = useParams() as { examId: string };
  const searchParams = useSearchParams();
  const classId = searchParams.get('classId');
  const { user } = useAuth();
  const router = useRouter();
  const { lang } = useStudentLanguage();
  const t = EXAM_TRANSLATIONS[lang] || EXAM_TRANSLATIONS['en'];

  const [loading, setLoading] = useState(true);
  const [examState, setExamState] = useState<'loading' | 'waiting' | 'active' | 'submitted' | 'closed'>('loading');
  
  const [examData, setExamData] = useState<any>(null);
  const [testTemplate, setTestTemplate] = useState<any>(null);
  
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false); // 🟢 NEW MODAL STATE

  useEffect(() => {
    if (!user || !examId || !classId) return;

    const fetchExam = async () => {
      try {
        const examSnap = await getDoc(doc(db, 'classes', classId, 'exams', examId));
        if (!examSnap.exists()) { setExamState('closed'); return; }
        
        const eData = examSnap.data();
        
        if (eData.submittedStudentIds?.includes(user.uid)) {
          setExamState('submitted');
          setLoading(false); return;
        }
        
        const now = new Date();
        const startTime = eData.examDate.toDate();
        const endTime = new Date(startTime.getTime() + eData.durationMinutes * 60000);

        if (now > endTime) {
          setExamState('closed');
        } else {
          setExamState('waiting');
          setExamData(eData);
          const templateSnap = await getDoc(doc(db, 'bsb_chsb_tests', eData.testId));
          setTestTemplate(templateSnap.data());
        }
      } catch (error) {
        toast.error("Xatolik yuz berdi");
        setExamState('closed');
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId, classId, user]);

  useEffect(() => {
    if (examState !== 'active') return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches(prev => prev + 1);
        toast.error(t.active.warning, { icon: '⚠️', duration: 4000 });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [examState, t.active.warning]);

  useEffect(() => {
    if (examState !== 'active') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examState]);

  useEffect(() => {
    if (timeLeft === 0 && examState === 'active' && !isSubmitting) {
      toast(t.active.submitAuto, { icon: '⏳' });
      setShowSubmitModal(false);
      submitExam();
    }
  }, [timeLeft, examState, isSubmitting]);

  const handleStartExam = () => {
    if (!examData) return;
    const now = new Date();
    const startTime = examData.examDate.toDate();
    const endTime = new Date(startTime.getTime() + examData.durationMinutes * 60000);
    
    if (now < startTime) return toast.error(t.waiting.early);
    
    const remainingSeconds = Math.floor((endTime.getTime() - now.getTime()) / 1000);
    if (remainingSeconds <= 0) { setExamState('closed'); return; }

    setTimeLeft(remainingSeconds);
    setExamState('active');
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const submitExam = async () => {
    if (isSubmitting || !user || !testTemplate || !examData || !classId) return;
    setIsSubmitting(true);
    setShowSubmitModal(false);

    try {
      const attemptId = `${user.uid}_${examId}`;
      const attemptRef = doc(db, 'attempts', attemptId);
      const [freshExamSnap, freshAttemptSnap] = await Promise.all([ getDoc(doc(db, 'classes', classId, 'exams', examId)), getDoc(attemptRef) ]);

      if (freshExamSnap.data()?.submittedStudentIds?.includes(user.uid) || freshAttemptSnap.exists()) {
        toast.success("Siz allaqachon topshirgansiz!");
        setExamState('submitted'); return;
      }

      let autoScore = 0;
      testTemplate.questions.forEach((q: any) => {
        const sAns = answers[q.id];
        if (sAns === undefined) return;
        if (q.type === 'mcq' || q.type === 'true_false') {
          if (sAns === q.answer) autoScore += q.points;
        } else if (q.type === 'short_answer') {
           const cleanS = String(sAns).trim().toLowerCase();
           const cleanC = String(q.answer?.uz || q.answer).trim().toLowerCase();
           if (cleanS === cleanC) autoScore += q.points;
        } else if (q.type === 'matching') {
           let correctMatches = 0;
           const totalPairs = q.pairs.length;
           q.pairs.forEach((p: any) => {
             const leftText = p.left?.uz || p.left;
             const rightText = p.right?.uz || p.right;
             if (sAns[leftText] === rightText) correctMatches += 1;
           });
           if (totalPairs > 0) autoScore += Number(((correctMatches / totalPairs) * q.points).toFixed(1));
        }
      });

      const cleanAnswers = Object.fromEntries(Object.entries(answers).filter(([_, v]) => v !== undefined));

      await setDoc(attemptRef, {
        userId: user.uid, userName: user.displayName || 'Student', classId, assignmentId: examId, type: 'exam',
        testId: examData.testId, answers: cleanAnswers, autoScore, teacherScore: 0,
        totalPoints: testTemplate.totalPoints || 0, tabSwitches: tabSwitches || 0, submittedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'classes', classId, 'exams', examId), { submittedStudentIds: arrayUnion(user.uid) });
      setExamState('submitted');
    } catch (error: any) {
      toast.error(`Xatolik: ${error.message}`);
      setIsSubmitting(false);
    }
  };

  if (loading || examState === 'loading') return <div className="min-h-screen flex items-center justify-center bg-zinc-50"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;

  if (examState === 'closed') return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4 font-sans"><div className="bg-white p-8 rounded-[2rem] border-2 border-b-4 border-zinc-200 text-center max-w-sm w-full shadow-sm"><Lock size={48} className="mx-auto text-zinc-300 mb-4" strokeWidth={2.5}/><h2 className="text-xl font-black text-zinc-900 mb-2">{t.closed.title}</h2><p className="text-zinc-500 text-[13px] font-bold">{t.closed.desc}</p><button onClick={() => router.push(`/classes/${classId}`)} className="mt-8 w-full py-3.5 bg-zinc-900 text-white rounded-xl font-black active:scale-95 transition-transform">{t.closed.back}</button></div></div>
  );

  if (examState === 'submitted') return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4 font-sans"><div className="bg-white p-8 rounded-[2rem] border-2 border-b-4 border-emerald-200 text-center max-w-sm w-full shadow-sm"><div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-100 text-emerald-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} strokeWidth={3} /></div><h2 className="text-2xl font-black text-emerald-900 mb-2">{t.submitted.title}</h2><p className="text-emerald-700 text-[13px] font-bold leading-relaxed">{t.submitted.desc}</p><button onClick={() => router.push(`/classes/${classId}`)} className="mt-8 w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black active:scale-95 transition-transform shadow-md shadow-emerald-600/20">{t.submitted.back}</button></div></div>
  );

  if (examState === 'waiting') return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-4 font-sans"><div className="bg-white p-8 md:p-10 rounded-[2rem] border-2 border-b-4 border-zinc-200 text-center max-w-lg w-full shadow-sm"><div className="w-16 h-16 bg-indigo-50 border-2 border-indigo-100 text-indigo-600 rounded-[1.2rem] flex items-center justify-center mx-auto mb-5"><FileBadge size={32} strokeWidth={2.5}/></div><h1 className="text-2xl md:text-3xl font-black text-zinc-900 mb-2 leading-tight">{examData?.title}</h1><div className="flex items-center justify-center gap-2 mb-8"><span className="bg-indigo-50 text-indigo-600 font-black uppercase tracking-widest text-[11px] px-3 py-1 rounded-md border border-indigo-100">{examData?.assessmentType}</span><span className="bg-zinc-100 text-zinc-500 font-black uppercase tracking-widest text-[11px] px-3 py-1 rounded-md border border-zinc-200">{examData?.durationMinutes} Daqiqa</span></div><div className="bg-rose-50 border-2 border-rose-100 p-5 rounded-2xl mb-8 text-left space-y-3"><h3 className="font-black text-rose-800 flex items-center gap-2 text-[14px] uppercase tracking-widest"><AlertTriangle size={18} strokeWidth={3}/> {t.waiting.rules}</h3><ul className="text-[13px] font-bold text-rose-700 space-y-2 pl-6 list-disc"><li>{t.waiting.rule1}</li><li>{t.waiting.rule2}</li><li>{t.waiting.rule3}</li></ul></div><button onClick={handleStartExam} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[16px] shadow-lg shadow-indigo-600/20 transition-all active:translate-y-[2px] border-b-4 border-indigo-800 active:border-b-0">{t.waiting.start}</button></div></div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 selection:bg-indigo-100 font-sans relative">
      
      {/* 🟢 CUSTOM CONFIRMATION MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border-2 border-zinc-200 animate-in zoom-in-95 text-center">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-[1.2rem] border-2 border-indigo-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} strokeWidth={2.5}/>
            </div>
            <h2 className="text-[20px] font-black text-zinc-900 tracking-tight mb-2">Testni yakunlaysizmi?</h2>
            <p className="text-zinc-500 font-bold mb-6 text-[14px] leading-relaxed">{t.active.submitConfirm}</p>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowSubmitModal(false)} 
                disabled={isSubmitting}
                className="py-4 font-black text-[12px] uppercase tracking-widest text-zinc-500 bg-white border-2 border-zinc-200 border-b-4 hover:bg-zinc-50 rounded-xl active:translate-y-[2px] active:border-b-2 transition-all"
              >
                {t.active.cancel}
              </button>
              <button 
                onClick={submitExam} 
                disabled={isSubmitting}
                className="py-4 bg-indigo-600 hover:bg-indigo-500 border-b-4 border-indigo-800 text-white font-black text-[12px] uppercase tracking-widest rounded-xl active:translate-y-[4px] active:border-b-0 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : t.active.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b-2 border-zinc-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex flex-col min-w-0 pr-4">
          <h1 className="text-[14px] md:text-[16px] font-black text-zinc-900 truncate">{testTemplate?.title}</h1>
          <p className="text-[10px] md:text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{testTemplate?.assessmentType} • {testTemplate?.questions?.length} Savol</p>
        </div>

        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          {tabSwitches > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 bg-rose-50 text-rose-600 px-3 py-1.5 rounded-xl border-2 border-rose-200 text-[11px] font-black tracking-widest uppercase">
              <ShieldAlert size={14} strokeWidth={3}/> {t.active.focusLost}: {tabSwitches}
            </div>
          )}
          <div className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border-2 font-mono font-black text-[16px] sm:text-[18px] transition-colors ${timeLeft !== null && timeLeft < 300 ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' : 'bg-zinc-100 text-zinc-700 border-zinc-200 shadow-inner'}`}>
            <Clock size={18} strokeWidth={3} className={timeLeft !== null && timeLeft < 300 ? "text-rose-500" : "text-zinc-400"} />
            {timeLeft !== null ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : '--:--'}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6 md:space-y-8 relative z-10">
        {testTemplate?.questions?.map((q: any, idx: number) => (
          <div key={q.id} className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-2 border-b-4 border-zinc-200 shadow-sm">
            
            <div className="flex items-center gap-2 mb-4 md:mb-5">
              <span className="bg-zinc-900 text-white text-[12px] font-black px-3 py-1 rounded-lg shrink-0 border-b-2 border-zinc-950">{idx + 1}</span>
              <span className="bg-zinc-100 text-zinc-500 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border-2 border-zinc-200">{q.points} Ball</span>
            </div>

            <h3 className="text-[15px] md:text-[17px] font-bold text-zinc-900 mb-6 leading-relaxed">
              <FormattedText text={q.question?.uz || q.question} />
            </h3>

            {q.type === 'mcq' && <McqRenderer question={q} value={answers[q.id]} onChange={(val: any) => handleAnswerChange(q.id, val)} />}
            {q.type === 'true_false' && <TrueFalseRenderer value={answers[q.id]} onChange={(val: any) => handleAnswerChange(q.id, val)} />}
            {q.type === 'short_answer' && <ShortAnswerRenderer value={answers[q.id]} onChange={(val: any) => handleAnswerChange(q.id, val)} />}
            {q.type === 'open_ended' && <OpenEndedRenderer value={answers[q.id]} onChange={(val: any) => handleAnswerChange(q.id, val)} />}
            {q.type === 'matching' && <MatchingRenderer question={q} value={answers[q.id] || {}} onChange={(val: any) => handleAnswerChange(q.id, val)} />}
          </div>
        ))}

        <div className="pt-8 pb-12">
          <button 
            onClick={() => setShowSubmitModal(true)} // 🟢 Trigger Custom Modal
            disabled={isSubmitting}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-600/20 active:translate-y-[2px] border-b-4 border-indigo-800 active:border-b-0 transition-all flex items-center justify-center gap-2 text-[16px]"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <CheckCircle2 size={20} strokeWidth={3}/>}
            {isSubmitting ? t.active.saving : t.active.finish}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function StudentExamPlayer() {
  return <Suspense fallback={<div className="min-h-screen bg-zinc-50 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>}><ExamPlayerContent /></Suspense>;
}

// ============================================================================
// 🎯 QUESTION RENDERERS
// ============================================================================

const McqRenderer = ({ question, value, onChange }: any) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Object.entries(question.options || {}).sort(([a],[b]) => a.localeCompare(b)).map(([key, opt]) => {
        const isSelected = value === key;
        return (
          <button 
            key={key} onClick={() => onChange(key)}
            className={`flex items-start p-3 md:p-4 rounded-xl md:rounded-[1.2rem] border-2 text-left transition-all active:scale-[0.98] ${isSelected ? 'bg-indigo-50 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20' : 'bg-white border-zinc-200 hover:border-indigo-300 hover:bg-indigo-50/30'}`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[13px] shrink-0 mr-3 mt-0.5 border-2 ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>{key}</div>
            <div className={`text-[14px] md:text-[15px] pt-1 leading-snug ${isSelected ? 'text-indigo-950 font-bold' : 'text-zinc-700 font-medium'}`}><FormattedText text={(opt as any)?.uz || opt as string} /></div>
          </button>
        );
      })}
    </div>
  );
};

const TrueFalseRenderer = ({ value, onChange }: any) => {
  return (
    <div className="flex gap-3">
      <button onClick={() => onChange(true)} className={`flex-1 py-4 rounded-[1.2rem] border-2 border-b-4 font-black text-[15px] transition-all active:translate-y-[2px] active:border-b-2 ${value === true ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300'}`}>Rost</button>
      <button onClick={() => onChange(false)} className={`flex-1 py-4 rounded-[1.2rem] border-2 border-b-4 font-black text-[15px] transition-all active:translate-y-[2px] active:border-b-2 ${value === false ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300'}`}>Yolg'on</button>
    </div>
  );
};

const ShortAnswerRenderer = ({ value, onChange }: any) => {
  return <input type="text" placeholder="Javobingizni yozing..." value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full p-4 bg-zinc-50 border-2 border-zinc-200 rounded-[1.2rem] text-[15px] font-bold text-zinc-900 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner" />;
};

const OpenEndedRenderer = ({ value, onChange }: any) => {
  return <textarea placeholder="Batafsil yechim yoki javobni yozing..." value={value || ''} onChange={(e) => onChange(e.target.value)} rows={5} className="w-full p-4 bg-zinc-50 border-2 border-zinc-200 rounded-[1.2rem] text-[14px] md:text-[15px] font-medium text-zinc-900 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner custom-scrollbar resize-y" />;
};

// 🟢 NEW: Custom Dropdown Component for LaTeX Support
const MatchingDropdown = ({ options, value, onChange }: { options: string[], value: string, onChange: (val: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative flex-1 md:max-w-[50%]">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left p-3 md:p-4 bg-white border-2 rounded-xl font-medium text-[13px] md:text-[14px] shadow-sm transition-colors flex justify-between items-center ${isOpen ? 'border-indigo-400 ring-2 ring-indigo-500/20' : 'border-indigo-200 hover:border-indigo-300'} ${value ? 'text-indigo-900' : 'text-indigo-300 font-bold'}`}
      >
        <span className="truncate pr-2">
          {value ? <FormattedText text={value} /> : "Mosini tanlang..."}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-indigo-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border-2 border-slate-200 rounded-xl shadow-xl z-50 max-h-[250px] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 p-1.5">
            {options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className={`w-full text-left p-3 rounded-lg text-[13px] md:text-[14px] font-medium transition-colors mb-1 last:mb-0 hover:bg-indigo-50 hover:text-indigo-700 ${value === opt ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'}`}
              >
                <FormattedText text={opt} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const MatchingRenderer = ({ question, value, onChange }: any) => {
  const shuffledOptions = useMemo(() => {
    if (!question.pairs) return [];
    const rights = question.pairs.map((p: any) => p.right?.uz || p.right);
    return rights.sort(() => Math.random() - 0.5);
  }, [question.pairs]);

  return (
    <div className="space-y-3">
      {question.pairs?.map((pair: any, i: number) => {
        const leftText = pair.left?.uz || pair.left;
        return (
          <div key={i} className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-3 bg-zinc-50 border-2 border-zinc-200 rounded-[1.2rem]">
            <div className="flex-1 p-3 md:p-4 bg-white border-2 border-zinc-200 rounded-xl font-bold text-[13px] md:text-[14px] text-zinc-800 shadow-sm flex items-center">
              <FormattedText text={leftText} />
            </div>
            
            <div className="flex items-center justify-center text-zinc-300 font-black rotate-90 sm:rotate-0 shrink-0">➔</div>
            
            {/* 🟢 CUSTOM LATEX DROPDOWN INJECTED HERE */}
            <MatchingDropdown 
              options={shuffledOptions}
              value={value[leftText] || ""}
              onChange={(newVal) => onChange({ ...value, [leftText]: newVal })}
            />
          </div>
        );
      })}
    </div>
  );
};
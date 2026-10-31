'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ChevronLeft, ShieldAlert, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTeacherLanguage } from '@/app/teacher/layout';
import { Button, IconButton, Spinner } from '@/components/ui';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// --- TRANSLATION DICTIONARY ---
const GRADING_TRANSLATIONS: Record<string, any> = {
  uz: {
    notAnswered: "Javob berilmagan", trueLabel: "Rost", falseLabel: "Yolg'on",
    back: "Orqaga", tabSwitches: (n: number) => `${n} marta chiqib ketgan`,
    confirmedScore: "Tasdiqlangan Ball", score: "Ball", gradeLabel: "Baho:", partial: "Qisman to'g'ri",
    studentAnswer: "O'quvchi javobi", rubric: "Baholash Mezoni (Rubric)", correctAnswer: "To'g'ri javob",
    confirmChanges: "O'zgarishlarni Tasdiqlash",
    toasts: {
      attemptNotFound: "Urinish topilmadi.", templateNotFound: "Test template topilmadi.",
      saved: "Baholar saqlandi!", error: (m: string) => `Xatolik: ${m}`
    }
  },
  en: {
    notAnswered: "Not answered", trueLabel: "True", falseLabel: "False",
    back: "Back", tabSwitches: (n: number) => `Left the tab ${n} time(s)`,
    confirmedScore: "Confirmed Score", score: "Pts", gradeLabel: "Score:", partial: "Partially correct",
    studentAnswer: "Student's answer", rubric: "Grading Criteria (Rubric)", correctAnswer: "Correct answer",
    confirmChanges: "Confirm Changes",
    toasts: {
      attemptNotFound: "Attempt not found.", templateNotFound: "Test template not found.",
      saved: "Grades saved!", error: (m: string) => `Error: ${m}`
    }
  },
  ru: {
    notAnswered: "Ответ не дан", trueLabel: "Верно", falseLabel: "Неверно",
    back: "Назад", tabSwitches: (n: number) => `Покидал(а) вкладку: ${n} раз`,
    confirmedScore: "Подтвержденный Балл", score: "Балл", gradeLabel: "Оценка:", partial: "Частично верно",
    studentAnswer: "Ответ ученика", rubric: "Критерии Оценивания (Рубрика)", correctAnswer: "Правильный ответ",
    confirmChanges: "Подтвердить Изменения",
    toasts: {
      attemptNotFound: "Попытка не найдена.", templateNotFound: "Шаблон теста не найден.",
      saved: "Оценки сохранены!", error: (m: string) => `Ошибка: ${m}`
    }
  }
};

// --- BULLETPROOF LATEX PARSER ---
const FormattedText = ({ text, empty }: { text: any; empty?: string }) => {
  if (text === undefined || text === null || text === '') return <span className="text-on-surface-variant italic text-[13px]">{empty ?? "Javob berilmagan"}</span>;
  let content = typeof text === 'string' ? text : JSON.stringify(text);
  const hasMathCommands = /\\frac|\\pi|\\sin|\\cos|\\tan|\\ge|\\le|\\cup|\\cap|\\in|\\begin|\\sqrt|\\empty/.test(content);
  if (!content.includes('$') && hasMathCommands) content = `$${content}$`;
  content = content.replace(/\\\((.*?)\\\)/g, '$$$1$$').replace(/\\\[(.*?)\\\]/g, '$$$$$1$$$$');
  
  return (
    <span className="break-words leading-relaxed inline-block">
      {content.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g).map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          try { return <span key={index} dangerouslySetInnerHTML={{ __html: katex.renderToString(part.slice(2, -2).trim(), { displayMode: true }) }} className="block my-2 overflow-x-auto custom-scrollbar" />; } catch (e) { return <span key={index}>{part}</span>; }
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          try { return <span key={index} dangerouslySetInnerHTML={{ __html: katex.renderToString(part.slice(1, -1).trim(), { displayMode: false }) }} className="px-1 inline-block" />; } catch (e) { return <span key={index}>{part}</span>; }
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export default function GradingPage() {
  const { classId, examId, studentId } = useParams() as { classId: string, examId: string, studentId: string };
  const router = useRouter();
  const { lang } = useTeacherLanguage();
  const t = GRADING_TRANSLATIONS[lang] || GRADING_TRANSLATIONS['uz'];

  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  
  // 🟢 State holds 'any' temporarily so users can type decimals like "2." without it disappearing
  const [scores, setScores] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchGradingData = async () => {
      try {
        const q = query(
          collection(db, 'attempts'), 
          where('classId', '==', classId), 
          where('assignmentId', '==', examId), 
          where('userId', '==', studentId)
        );
        const attemptSnap = await getDocs(q);
        
        if (attemptSnap.empty) {
          toast.error(t.toasts.attemptNotFound);
          router.back();
          return;
        }

        const attemptData: any = { id: attemptSnap.docs[0].id, ...attemptSnap.docs[0].data() };
        setAttempt(attemptData);

        const templateSnap = await getDoc(doc(db, 'bsb_chsb_tests', attemptData.testId));
        if (!templateSnap.exists()) throw new Error(t.toasts.templateNotFound);
        
        const templateData = templateSnap.data();
        setTemplate(templateData);

        const initialScores: Record<string, number> = {};
        templateData.questions.forEach((q: any) => {
          if (attemptData.manualScores && attemptData.manualScores[q.id] !== undefined) {
            initialScores[q.id] = attemptData.manualScores[q.id];
          } else {
            const sAns = attemptData.answers?.[q.id];
            let qScore = 0;
            if (sAns !== undefined && sAns !== null) {
              if (q.type === 'mcq' || q.type === 'true_false') {
                if (sAns === q.answer) qScore = q.points;
              } else if (q.type === 'short_answer') {
                if (String(sAns).trim().toLowerCase() === String(q.answer?.uz || q.answer).trim().toLowerCase()) qScore = q.points;
              } else if (q.type === 'matching' && typeof sAns === 'object') {
                let correctMatches = 0;
                const totalPairs = q.pairs?.length || 1;
                q.pairs?.forEach((p: any) => {
                  const left = p.left?.uz || p.left;
                  const right = p.right?.uz || p.right;
                  if (sAns[left] === right) correctMatches++;
                });
                qScore = Number(((correctMatches / totalPairs) * q.points).toFixed(1));
              }
            }
            initialScores[q.id] = qScore;
          }
        });
        
        setScores(initialScores);
      } catch (error: any) {
        toast.error(t.toasts.error(error.message));
      } finally {
        setLoading(false);
      }
    };

    fetchGradingData();
  }, [examId, studentId, classId, router]);

  // 🟢 FLAWLESS DECIMAL HANDLING
  const handleScoreChange = (qId: string, value: string, maxPoints: number) => {
    if (value === '') {
      setScores(prev => ({ ...prev, [qId]: '' }));
      return;
    }
    
    let parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      if (parsed > maxPoints) value = maxPoints.toString();
      if (parsed < 0) value = '0';
    }

    setScores(prev => ({ ...prev, [qId]: value }));
  };

  const handleSaveGrades = async () => {
    setIsSaving(true);
    try {
      // Convert temporary strings back to strict numbers before saving
      const sanitizedScores: Record<string, number> = {};
      let finalTotal = 0;

      Object.entries(scores).forEach(([k, v]) => {
        const num = parseFloat(String(v));
        const safeNum = isNaN(num) ? 0 : num; 
        sanitizedScores[k] = safeNum;
        finalTotal += safeNum;
      });

      await updateDoc(doc(db, 'attempts', attempt.id), {
        manualScores: sanitizedScores, 
        autoScore: 0, 
        teacherScore: finalTotal, 
        status: 'graded' 
      });
      toast.success(t.toasts.saved);
      router.back();
    } catch (error: any) {
      toast.error(t.toasts.error(error.message));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !attempt || !template) return <div className="min-h-screen flex items-center justify-center bg-surface"><Spinner size={32}/></div>;

  const currentTotal = Object.values(scores).reduce((acc, curr) => acc + (parseFloat(String(curr)) || 0), 0);

  // --- RENDER HELPERS ---
  const renderStudentAnswer = (q: any, ans: any) => {
    if (ans === undefined || ans === null || ans === '') return <span className="text-on-surface-variant italic text-[13px]">{t.notAnswered}</span>;
    if (q.type === 'true_false') return <span className="font-bold text-[14px] text-on-surface">{ans ? t.trueLabel : t.falseLabel}</span>;
    
    // 🟢 MCQ: Lookup the actual option text and render a letter badge
    if (q.type === 'mcq') {
      const optionText = q.options?.[ans]?.uz || q.options?.[ans] || ans;
      return (
        <div className="flex items-start gap-2.5">
          <span className="shrink-0 flex items-center justify-center min-w-[24px] h-[24px] bg-primary-container text-on-primary-container font-black text-[12px] rounded-m3-xs mt-0.5">
            {ans}
          </span>
          <span className="font-medium text-on-surface text-[14px] md:text-[15px] leading-relaxed"><FormattedText text={optionText} empty={t.notAnswered} /></span>
        </div>
      );
    }
    
    if (q.type === 'matching' && typeof ans === 'object') {
      return (
        <div className="space-y-2 w-full mt-1">
          {Object.entries(ans).map(([left, right], i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-2.5 bg-surface-container-lowest rounded-m3-md border border-outline-variant shadow-elev-1 text-[13px] md:text-[14px]">
              <span className="font-bold text-on-surface flex-1"><FormattedText text={left} empty={t.notAnswered} /></span>
              <span className="hidden sm:block text-outline shrink-0">➔</span>
              <span className="font-medium text-primary flex-1"><FormattedText text={String(right)} empty={t.notAnswered} /></span>
            </div>
          ))}
        </div>
      );
    }
    return <span className="text-[14px] md:text-[15px] font-medium text-on-surface"><FormattedText text={ans} empty={t.notAnswered} /></span>;
  };

  const renderCorrectAnswer = (q: any) => {
    if (q.type === 'true_false') return <span className="font-bold text-[14px] text-on-surface">{q.answer ? t.trueLabel : t.falseLabel}</span>;
    
    // 🟢 MCQ: Lookup the actual correct option text and render a letter badge
    if (q.type === 'mcq') {
      const correctAns = q.answer?.uz || q.answer;
      const optionText = q.options?.[correctAns]?.uz || q.options?.[correctAns] || correctAns;
      return (
        <div className="flex items-start gap-2.5">
          <span className="shrink-0 flex items-center justify-center min-w-[24px] h-[24px] bg-success-container text-on-success-container font-black text-[12px] rounded-m3-xs mt-0.5">
            {correctAns}
          </span>
          <span className="font-medium text-on-surface text-[14px] md:text-[15px] leading-relaxed"><FormattedText text={optionText} empty={t.notAnswered} /></span>
        </div>
      );
    }

    if (q.type === 'matching') {
      return (
        <div className="space-y-2 w-full mt-1">
          {q.pairs?.map((p: any, i: number) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-2.5 bg-surface-container-lowest rounded-m3-md border border-outline-variant shadow-elev-1 text-[13px] md:text-[14px]">
              <span className="font-bold text-on-surface flex-1"><FormattedText text={p.left?.uz || p.left} empty={t.notAnswered} /></span>
              <span className="hidden sm:block text-outline shrink-0">➔</span>
              <span className="font-medium text-success flex-1"><FormattedText text={p.right?.uz || p.right} empty={t.notAnswered} /></span>
            </div>
          ))}
        </div>
      );
    }
    if (q.type === 'open_ended') return <span className="text-[14px] md:text-[15px] font-medium text-on-surface"><FormattedText text={q.rubric?.uz || q.rubric} empty={t.notAnswered} /></span>;
    return <span className="text-[14px] md:text-[15px] font-medium text-on-surface"><FormattedText text={q.answer?.uz || q.answer} empty={t.notAnswered} /></span>;
  };

  return (
    <div className="min-h-screen bg-surface pb-24 font-t-body selection:bg-primary-container">

      <header className="t-page-bar sticky top-0 z-40 bg-[color-mix(in_oklab,var(--m3-surface)_90%,transparent)] backdrop-blur-xl border-b border-outline-variant shadow-elev-1 px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4 min-w-0 pr-2">
          <IconButton aria-label={t.back} onClick={() => router.back()} className="shrink-0"><ChevronLeft size={20}/></IconButton>
          <div className="min-w-0">
            <h1 className="text-[15px] md:text-[18px] font-black text-on-surface leading-tight truncate">{attempt.userName}</h1>
            <p className="text-[10px] md:text-[11px] font-bold text-on-surface-variant uppercase tracking-widest truncate">{template.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {attempt.tabSwitches > 0 && (
            <div className="hidden md:flex items-center gap-1.5 bg-error-container text-on-error-container px-3 py-1.5 rounded-m3-sm text-[11px] font-black uppercase">
              <ShieldAlert size={14}/> {t.tabSwitches(attempt.tabSwitches)}
            </div>
          )}
          <div className="bg-primary px-3 py-1.5 md:px-4 md:py-2 rounded-m3-md shadow-elev-1 flex flex-col items-center">
            <span className="hidden md:block text-[10px] font-black text-[color-mix(in_oklab,var(--m3-on-primary)_75%,transparent)] uppercase tracking-widest leading-none mb-0.5">{t.confirmedScore}</span>
            <span className="md:hidden text-[9px] font-black text-[color-mix(in_oklab,var(--m3-on-primary)_75%,transparent)] uppercase tracking-widest leading-none mb-0.5">{t.score}</span>
            <span className="text-[16px] md:text-[18px] font-black text-on-primary leading-none">{Number(currentTotal.toFixed(1))} <span className="text-[color-mix(in_oklab,var(--m3-on-primary)_70%,transparent)] text-[14px]">/ {template.totalPoints}</span></span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 md:mt-8 space-y-6">
        
        {template.questions.map((q: any, idx: number) => {
          const currentScoreRaw = scores[q.id];
          const currentScore = parseFloat(String(currentScoreRaw));
          const isPerfect = !isNaN(currentScore) && currentScore === q.points;
          const isZero = !isNaN(currentScore) && currentScore === 0;

          let ringColor = "border-warning bg-warning-container text-on-warning-container";
          if (isPerfect) ringColor = "border-success bg-success-container text-on-success-container";
          if (isZero) ringColor = "border-error bg-error-container text-on-error-container";

          return (
            <div key={q.id} className="bg-surface-container-low p-5 md:p-8 rounded-m3-lg md:rounded-m3-xl border border-outline-variant shadow-elev-1 transition-colors relative overflow-hidden">

              <div className="flex justify-between items-start mb-5 gap-4">
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <span className="bg-inverse-surface text-inverse-on-surface text-[12px] font-black px-3 py-1 rounded-m3-sm shadow-elev-1">{idx + 1}</span>
                  <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-black px-3 py-1 rounded-m3-sm uppercase tracking-widest">{q.type.replace('_', ' ')}</span>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-m3-md border-2 transition-all shadow-elev-1 ${ringColor}`}>
                    <span className="text-[11px] font-black uppercase tracking-widest opacity-80 hidden sm:block">{t.gradeLabel}</span>
                    
                    <div className="relative flex items-center group">
                      <input 
                        type="number" 
                        step="0.5"
                        placeholder="0"
                        value={scores[q.id] !== undefined ? scores[q.id] : ''}
                        onChange={(e) => handleScoreChange(q.id, e.target.value, q.points)}
                        className="w-16 h-10 bg-surface-container-lowest border-2 border-outline focus:border-primary rounded-m3-sm text-center font-black text-[16px] text-on-surface outline-none focus:ring-4 focus:ring-[color-mix(in_oklab,var(--m3-primary)_20%,transparent)] transition-all shadow-inner placeholder:text-on-surface-variant"
                      />
                    </div>
                    
                    <span className="text-[14px] font-black opacity-60">/ {q.points}</span>
                  </div>
                  
                  {q.type !== 'open_ended' && !isPerfect && !isZero && !isNaN(currentScore) && (
                    <span className="text-[10px] font-bold text-warning flex items-center gap-1"><AlertCircle size={12}/> {t.partial}</span>
                  )}
                </div>
              </div>

              <h3 className="text-[15px] md:text-[16px] font-bold text-on-surface mb-6 leading-relaxed"><FormattedText text={q.question?.uz || q.question} empty={t.notAnswered} /></h3>

              <div className="grid md:grid-cols-2 gap-3 md:gap-5">
                <div className={`p-4 md:p-5 rounded-m3-lg border ${isPerfect ? 'bg-[color-mix(in_oklab,var(--m3-success-container)_45%,transparent)] border-[color-mix(in_oklab,var(--m3-success)_25%,transparent)]' : isZero ? 'bg-[color-mix(in_oklab,var(--m3-error-container)_45%,transparent)] border-[color-mix(in_oklab,var(--m3-error)_25%,transparent)]' : 'bg-[color-mix(in_oklab,var(--m3-warning-container)_45%,transparent)] border-[color-mix(in_oklab,var(--m3-warning)_25%,transparent)]'}`}>
                  <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3 block">{t.studentAnswer}</span>
                  <div className="w-full">
                    {/* 🟢 PASS THE FULL 'q' OBJECT HERE */}
                    {renderStudentAnswer(q, attempt.answers?.[q.id])}
                  </div>
                </div>

                <div className="p-4 md:p-5 rounded-m3-lg border bg-surface-container border-outline-variant">
                  <span className="text-[10px] font-black uppercase tracking-widest mb-3 block text-primary">
                    {q.type === 'open_ended' ? t.rubric : t.correctAnswer}
                  </span>
                  <div className="w-full">
                    {/* 🟢 PASS THE FULL 'q' OBJECT HERE */}
                    {renderCorrectAnswer(q)}
                  </div>
                </div>
              </div>

            </div>
          );
        })}

        <div className="pt-4 pb-12 flex justify-end">
          <Button
            variant="filled"
            size="lg"
            onClick={handleSaveGrades}
            disabled={isSaving}
            loading={isSaving}
            icon={<Save strokeWidth={2.5}/>}
            className="w-full md:w-auto"
          >
            {t.confirmChanges}
          </Button>
        </div>

      </main>
    </div>
  );
}
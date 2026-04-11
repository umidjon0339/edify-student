'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ChevronLeft, Loader2, ShieldAlert, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// --- BULLETPROOF LATEX PARSER ---
const FormattedText = ({ text }: { text: any }) => {
  if (text === undefined || text === null || text === '') return <span className="text-slate-400 italic text-[13px]">Javob berilmagan</span>;
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
          toast.error("Urinish topilmadi.");
          router.back();
          return;
        }

        const attemptData: any = { id: attemptSnap.docs[0].id, ...attemptSnap.docs[0].data() };
        setAttempt(attemptData);

        const templateSnap = await getDoc(doc(db, 'bsb_chsb_tests', attemptData.testId));
        if (!templateSnap.exists()) throw new Error("Test template topilmadi.");
        
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
        toast.error(`Xatolik: ${error.message}`);
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
      toast.success("Baholar saqlandi!");
      router.back();
    } catch (error: any) {
      toast.error(`Xatolik: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !attempt || !template) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]"><Loader2 className="animate-spin text-indigo-600" size={32}/></div>;

  const currentTotal = Object.values(scores).reduce((acc, curr) => acc + (parseFloat(String(curr)) || 0), 0);

  // --- RENDER HELPERS ---
  const renderStudentAnswer = (q: any, ans: any) => {
    if (ans === undefined || ans === null || ans === '') return <span className="text-slate-400 italic text-[13px]">Javob berilmagan</span>;
    if (q.type === 'true_false') return <span className="font-bold text-[14px] text-slate-800">{ans ? "Rost" : "Yolg'on"}</span>;
    
    // 🟢 MCQ: Lookup the actual option text and render a letter badge
    if (q.type === 'mcq') {
      const optionText = q.options?.[ans]?.uz || q.options?.[ans] || ans;
      return (
        <div className="flex items-start gap-2.5">
          <span className="shrink-0 flex items-center justify-center min-w-[24px] h-[24px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-[12px] rounded-md mt-0.5">
            {ans}
          </span>
          <span className="font-medium text-slate-800 text-[14px] md:text-[15px] leading-relaxed"><FormattedText text={optionText} /></span>
        </div>
      );
    }
    
    if (q.type === 'matching' && typeof ans === 'object') {
      return (
        <div className="space-y-2 w-full mt-1">
          {Object.entries(ans).map(([left, right], i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-2.5 bg-white/60 rounded-xl border border-slate-100/50 shadow-sm text-[13px] md:text-[14px]">
              <span className="font-bold text-slate-800 flex-1"><FormattedText text={left} /></span>
              <span className="hidden sm:block text-slate-300 shrink-0">➔</span>
              <span className="font-medium text-indigo-700 flex-1"><FormattedText text={String(right)} /></span>
            </div>
          ))}
        </div>
      );
    }
    return <span className="text-[14px] md:text-[15px] font-medium text-slate-800"><FormattedText text={ans} /></span>;
  };

  const renderCorrectAnswer = (q: any) => {
    if (q.type === 'true_false') return <span className="font-bold text-[14px] text-slate-800">{q.answer ? "Rost" : "Yolg'on"}</span>;
    
    // 🟢 MCQ: Lookup the actual correct option text and render a letter badge
    if (q.type === 'mcq') {
      const correctAns = q.answer?.uz || q.answer;
      const optionText = q.options?.[correctAns]?.uz || q.options?.[correctAns] || correctAns;
      return (
        <div className="flex items-start gap-2.5">
          <span className="shrink-0 flex items-center justify-center min-w-[24px] h-[24px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-[12px] rounded-md mt-0.5">
            {correctAns}
          </span>
          <span className="font-medium text-slate-800 text-[14px] md:text-[15px] leading-relaxed"><FormattedText text={optionText} /></span>
        </div>
      );
    }

    if (q.type === 'matching') {
      return (
        <div className="space-y-2 w-full mt-1">
          {q.pairs?.map((p: any, i: number) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-2.5 bg-white/60 rounded-xl border border-slate-100/50 shadow-sm text-[13px] md:text-[14px]">
              <span className="font-bold text-slate-800 flex-1"><FormattedText text={p.left?.uz || p.left} /></span>
              <span className="hidden sm:block text-slate-300 shrink-0">➔</span>
              <span className="font-medium text-emerald-700 flex-1"><FormattedText text={p.right?.uz || p.right} /></span>
            </div>
          ))}
        </div>
      );
    }
    if (q.type === 'open_ended') return <span className="text-[14px] md:text-[15px] font-medium text-slate-800"><FormattedText text={q.rubric?.uz || q.rubric} /></span>;
    return <span className="text-[14px] md:text-[15px] font-medium text-slate-800"><FormattedText text={q.answer?.uz || q.answer} /></span>;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24 font-sans selection:bg-indigo-100">
      
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4 min-w-0 pr-2">
          <button onClick={() => router.back()} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors shrink-0"><ChevronLeft size={20}/></button>
          <div className="min-w-0">
            <h1 className="text-[15px] md:text-[18px] font-black text-slate-900 leading-tight truncate">{attempt.userName}</h1>
            <p className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate">{template.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {attempt.tabSwitches > 0 && (
            <div className="hidden md:flex items-center gap-1.5 bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg border border-rose-200 text-[11px] font-black uppercase">
              <ShieldAlert size={14}/> {attempt.tabSwitches} marta chiqib ketgan
            </div>
          )}
          <div className="bg-indigo-600 border border-indigo-700 px-3 py-1.5 md:px-4 md:py-2 rounded-xl shadow-sm flex flex-col items-center">
            <span className="hidden md:block text-[10px] font-black text-indigo-200 uppercase tracking-widest leading-none mb-0.5">Tasdiqlangan Ball</span>
            <span className="md:hidden text-[9px] font-black text-indigo-200 uppercase tracking-widest leading-none mb-0.5">Ball</span>
            <span className="text-[16px] md:text-[18px] font-black text-white leading-none">{Number(currentTotal.toFixed(1))} <span className="text-indigo-300 text-[14px]">/ {template.totalPoints}</span></span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 md:mt-8 space-y-6">
        
        {template.questions.map((q: any, idx: number) => {
          const currentScoreRaw = scores[q.id];
          const currentScore = parseFloat(String(currentScoreRaw));
          const isPerfect = !isNaN(currentScore) && currentScore === q.points;
          const isZero = !isNaN(currentScore) && currentScore === 0;

          let ringColor = "border-amber-200 bg-amber-50 text-amber-800";
          if (isPerfect) ringColor = "border-emerald-200 bg-emerald-50 text-emerald-800";
          if (isZero) ringColor = "border-rose-200 bg-rose-50 text-rose-800";

          return (
            <div key={q.id} className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm transition-colors relative overflow-hidden">
              
              <div className="flex justify-between items-start mb-5 gap-4">
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <span className="bg-slate-900 text-white text-[12px] font-black px-3 py-1 rounded-lg shadow-sm">{idx + 1}</span>
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border border-slate-200/60">{q.type.replace('_', ' ')}</span>
                </div>
                
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-[1rem] border-2 transition-all shadow-sm ${ringColor}`}>
                    <span className="text-[11px] font-black uppercase tracking-widest opacity-80 hidden sm:block">Baho:</span>
                    
                    <div className="relative flex items-center group">
                      <input 
                        type="number" 
                        step="0.5"
                        placeholder="0"
                        value={scores[q.id] !== undefined ? scores[q.id] : ''}
                        onChange={(e) => handleScoreChange(q.id, e.target.value, q.points)}
                        className="w-16 h-10 bg-white border-2 border-slate-300 focus:border-indigo-500 rounded-[10px] text-center font-black text-[16px] text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all shadow-inner placeholder:text-slate-300"
                      />
                    </div>
                    
                    <span className="text-[14px] font-black opacity-60">/ {q.points}</span>
                  </div>
                  
                  {q.type !== 'open_ended' && !isPerfect && !isZero && !isNaN(currentScore) && (
                    <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1"><AlertCircle size={12}/> Qisman to'g'ri</span>
                  )}
                </div>
              </div>

              <h3 className="text-[15px] md:text-[16px] font-bold text-slate-900 mb-6 leading-relaxed"><FormattedText text={q.question?.uz || q.question} /></h3>

              <div className="grid md:grid-cols-2 gap-3 md:gap-5">
                <div className={`p-4 md:p-5 rounded-[1.2rem] border ${isPerfect ? 'bg-emerald-50/40 border-emerald-200/60' : isZero ? 'bg-rose-50/40 border-rose-200/60' : 'bg-amber-50/40 border-amber-200/60'}`}>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">O'quvchi javobi</span>
                  <div className="w-full">
                    {/* 🟢 PASS THE FULL 'q' OBJECT HERE */}
                    {renderStudentAnswer(q, attempt.answers?.[q.id])}
                  </div>
                </div>

                <div className="p-4 md:p-5 rounded-[1.2rem] border bg-slate-50/50 border-slate-200/80">
                  <span className="text-[10px] font-black uppercase tracking-widest mb-3 block text-indigo-400">
                    {q.type === 'open_ended' ? 'Baholash Mezoni (Rubric)' : "To'g'ri javob"}
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
          <button 
            onClick={handleSaveGrades}
            disabled={isSaving}
            className="w-full md:w-auto px-8 md:px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 text-[14px] md:text-[15px]"
          >
            {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} strokeWidth={2.5}/>}
            O'zgarishlarni Tasdiqlash
          </button>
        </div>

      </main>
    </div>
  );
}
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, ChevronLeft, Lock, CheckCircle2, XCircle, AlertCircle, Trophy } from 'lucide-react';
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

function ReviewPageContent() {
  const { examId } = useParams() as { examId: string };
  const searchParams = useSearchParams();
  const classId = searchParams.get('classId');
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [examData, setExamData] = useState<any>(null);

  useEffect(() => {
    if (!user || !examId || !classId) return;

    const fetchReviewData = async () => {
      try {
        // 1. Fetch Class Exam Settings (to check if results are hidden)
        const examSnap = await getDoc(doc(db, 'classes', classId, 'exams', examId));
        if (!examSnap.exists()) throw new Error("Imtihon topilmadi.");
        const eData = examSnap.data();
        setExamData(eData);

        if (eData.hideResults) throw new Error("Natijalar o'qituvchi tomonidan yashirilgan.");

        // 2. Fetch Attempt Data safely
        const attemptId = `${user.uid}_${examId}`;
        let attemptSnap = await getDoc(doc(db, 'attempts', attemptId));
        
        // Fallback query just in case the deterministic ID wasn't used
        if (!attemptSnap.exists()) {
          const q = query(collection(db, 'attempts'), where('classId', '==', classId), where('assignmentId', '==', examId), where('userId', '==', user.uid));
          const qDocs = await getDocs(q);
          if (qDocs.empty) throw new Error("Sizning urinishingiz topilmadi.");
          attemptSnap = qDocs.docs[0] as any;
        }

        const aData = attemptSnap.data();
        if (aData?.status !== 'graded') throw new Error("Imtihon hali to'liq baholanmagan.");
        setAttempt(aData);

        // 3. Fetch Original Test Template safely
        const templateSnap = await getDoc(doc(db, 'bsb_chsb_tests', aData.testId || eData.testId));
        if (!templateSnap.exists()) throw new Error("Test shabloni topilmadi.");
        setTemplate(templateSnap.data());

      } catch (err: any) {
        console.error("🔥 REVIEW FETCH ERROR:", err);
        setError(err.message || "Noma'lum xatolik yuz berdi.");
      } finally {
        setLoading(false);
      }
    };

    fetchReviewData();
  }, [examId, classId, user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]"><Loader2 className="animate-spin text-indigo-600" size={32}/></div>;

  if (error || !attempt || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-4 font-sans">
        <div className="bg-white p-8 rounded-[2rem] border-2 border-b-4 border-zinc-200 text-center max-w-sm w-full shadow-sm">
          <Lock size={48} className="mx-auto text-zinc-300 mb-4" strokeWidth={2.5}/>
          <h2 className="text-xl font-black text-zinc-900 mb-2">Kirish taqiqlangan</h2>
          <p className="text-zinc-500 text-[13px] font-bold">{error || "Xatolik yuz berdi."}</p>
          <button onClick={() => router.back()} className="mt-8 w-full py-3.5 bg-zinc-900 text-white rounded-xl font-black active:scale-95 transition-transform">Ortga qaytish</button>
        </div>
      </div>
    );
  }

  // --- SAFE RENDERING HELPERS ---
  const renderAnswer = (q: any, ans: any) => {
    if (ans === undefined || ans === null || ans === '') return <span className="text-slate-400 italic text-[13px]">Javob berilmagan</span>;
    if (q.type === 'true_false') return <span className="font-bold text-[14px] text-slate-800">{ans ? "Rost" : "Yolg'on"}</span>;
    if (q.type === 'mcq') {
      const optionText = q.options?.[ans]?.uz || q.options?.[ans] || ans;
      return (
        <div className="flex items-start gap-2.5">
          <span className="shrink-0 flex items-center justify-center min-w-[24px] h-[24px] bg-slate-100 border border-slate-200 text-slate-700 font-black text-[12px] rounded-md mt-0.5">{ans}</span>
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
              <span className="font-medium text-slate-700 flex-1"><FormattedText text={String(right)} /></span>
            </div>
          ))}
        </div>
      );
    }
    return <span className="text-[14px] md:text-[15px] font-medium text-slate-800"><FormattedText text={ans} /></span>;
  };

  const renderCorrectAnswer = (q: any) => {
    if (q.type === 'true_false') return <span className="font-bold text-[14px] text-slate-800">{q.answer ? "Rost" : "Yolg'on"}</span>;
    
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
    if (q.type === 'open_ended') return <span className="text-[14px] md:text-[15px] font-medium text-slate-800"><FormattedText text={q.rubric?.uz || q.rubric || 'N/A'} /></span>;
    return <span className="text-[14px] md:text-[15px] font-medium text-slate-800"><FormattedText text={q.answer?.uz || q.answer || 'N/A'} /></span>;
  };


  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24 font-sans selection:bg-indigo-100">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4 min-w-0 pr-2">
          <button onClick={() => router.back()} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors shrink-0"><ChevronLeft size={20}/></button>
          <div className="min-w-0">
            <h1 className="text-[15px] md:text-[18px] font-black text-slate-900 leading-tight truncate">Natijalar tahlili</h1>
            <p className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate">{template.title}</p>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 md:px-4 md:py-2 rounded-xl shadow-sm flex flex-col items-center shrink-0">
          <span className="text-[9px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-0.5">To'plangan Ball</span>
          <span className="text-[16px] md:text-[18px] font-black text-emerald-700 leading-none">{attempt.teacherScore ?? 0} <span className="text-emerald-400 text-[14px]">/ {attempt.totalPoints ?? template.totalPoints ?? '?'}</span></span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 md:mt-8 space-y-6">
        {template.questions?.map((q: any, idx: number) => {
          // Safety fallbacks
          const earned = attempt.manualScores?.[q.id] ?? 0;
          const total = q.points ?? 0;
          const isPerfect = earned === total && total > 0;
          const isZero = earned === 0;

          let ringColor = "border-amber-200 bg-amber-50 text-amber-700";
          let Icon = AlertCircle;
          if (isPerfect) { ringColor = "border-emerald-200 bg-emerald-50 text-emerald-700"; Icon = CheckCircle2; }
          if (isZero) { ringColor = "border-rose-200 bg-rose-50 text-rose-700"; Icon = XCircle; }

          return (
            <div key={q.id} className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
              
              <div className="flex justify-between items-start mb-5 gap-4">
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <span className="bg-slate-900 text-white text-[12px] font-black px-3 py-1 rounded-lg shadow-sm">{idx + 1}</span>
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border border-slate-200/60">{q.type?.replace('_', ' ') || 'Savol'}</span>
                </div>
                
                <div className={`flex items-center gap-1.5 md:gap-2 px-3 py-1.5 rounded-xl border-2 shadow-sm ${ringColor} shrink-0`}>
                  <Icon size={16} strokeWidth={2.5} className="hidden sm:block"/>
                  <span className="font-black text-[14px] md:text-[16px]">{earned} <span className="opacity-60 text-[12px]">/ {total}</span></span>
                </div>
              </div>

              <h3 className="text-[15px] md:text-[16px] font-bold text-slate-900 mb-6 leading-relaxed"><FormattedText text={q.question?.uz || q.question} /></h3>

              <div className="grid md:grid-cols-2 gap-3 md:gap-5">
                <div className={`p-4 md:p-5 rounded-[1.2rem] border ${isPerfect ? 'bg-emerald-50/40 border-emerald-200/60' : isZero ? 'bg-rose-50/40 border-rose-200/60' : 'bg-amber-50/40 border-amber-200/60'}`}>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Sizning javobingiz</span>
                  <div className="w-full">
                    {renderAnswer(q, attempt.answers?.[q.id])}
                  </div>
                </div>

                <div className="p-4 md:p-5 rounded-[1.2rem] border bg-slate-50/50 border-slate-200/80">
                  <span className="text-[10px] font-black uppercase tracking-widest mb-3 block text-indigo-400">
                    {q.type === 'open_ended' ? "O'qituvchi mezoni (Rubric)" : "To'g'ri javob"}
                  </span>
                  <div className="w-full">
                    {/* 🟢 Now properly maps matching pairs and MCQs! */}
                    {renderCorrectAnswer(q)}
                  </div>
                </div>
              </div>

            </div>
          );
        }) || <p className="text-center text-slate-400 font-bold">Savollar mavjud emas.</p>}
      </main>
    </div>
  );
}

export default function StudentReviewWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32}/></div>}>
      <ReviewPageContent />
    </Suspense>
  );
}
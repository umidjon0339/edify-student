'use client';

import { useState } from 'react';
import { Check, Plus, Minus, ChevronDown, ChevronUp, AlertTriangle, X, Loader2 } from 'lucide-react';
import LatexRenderer from '@/components/LatexRenderer';
import { db } from '@/lib/firebase';
import { doc, setDoc, arrayUnion, increment, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import toast from 'react-hot-toast';
import { useTeacherLanguage } from '@/app/teacher/layout';

// --- TRANSLATION DICTIONARY FOR REPORTING ---
const REPORT_TRANSLATIONS = {
  uz: {
    reportBtn: "Report",
    modalTitle: "Xatoni xabar qilish",
    modalDesc: "Nima uchun bu savol xato?",
    reasons: {
      wrongAns: "Noto'g'ri javob",
      typo: "Imlo xatosi / Format",
      missing: "Ma'lumot/Rasm yetishmaydi",
      other: "Boshqa"
    },
    submit: "Yuborish",
    cancel: "Bekor qilish",
    success: "Xabar yuborildi. Rahmat!",
    fail: "Yuborishda xatolik yuz berdi."
  },
  en: {
    reportBtn: "Report",
    modalTitle: "Report an Error",
    modalDesc: "What is wrong with this question?",
    reasons: {
      wrongAns: "Wrong Answer",
      typo: "Typo / Formatting",
      missing: "Missing Info/Image",
      other: "Other"
    },
    submit: "Submit",
    cancel: "Cancel",
    success: "Report submitted. Thank you!",
    fail: "Failed to submit report."
  },
  ru: {
    reportBtn: "Ошибка",
    modalTitle: "Сообщить об ошибке",
    modalDesc: "Что не так с этим вопросом?",
    reasons: {
      wrongAns: "Неверный ответ",
      typo: "Опечатка / Формат",
      missing: "Нет данных/картинки",
      other: "Другое"
    },
    submit: "Отправить",
    cancel: "Отмена",
    success: "Жалоба отправлена. Спасибо!",
    fail: "Ошибка отправки."
  }
};

interface Props {
  question: any; 
  isAdded: boolean;
  onToggle: () => void;
  index: number;
  disabled?: boolean;
}

export default function QuestionCard({ question, isAdded, onToggle, index, disabled }: Props) {
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const rt = REPORT_TRANSLATIONS[lang];

  // UI States
  const [showOptions, setShowOptions] = useState(false);
  
  // Reporting States
  const [isReporting, setIsReporting] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const getText = (obj: any) => {
    if (!obj) return "";
    if (typeof obj === 'string') return obj;
    return obj?.uz || obj?.en || obj?.ru || "No text";
  };

  const questionText = getText(question.question || question.text);
  const options = question.options || {};
  const correctAnswer = question.answer; 
  const difficulty = (question.difficulty || 'medium').toLowerCase();

  const badgeColors: Record<string, string> = {
    easy: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    medium: 'text-amber-700 bg-amber-50 border-amber-100',
    hard: 'text-rose-700 bg-rose-50 border-rose-100',
  };
  const badgeClass = badgeColors[difficulty] || 'text-slate-600 bg-slate-50 border-slate-100';

  // 🟢 CORE: The Spam-Proof Report Logic
  const handleReportSubmit = async () => {
    if (!user || !selectedReason) return;
    setIsSubmittingReport(true);
    
    try {
      // Step 2 & 3: Use the question ID as the document ID to prevent duplicates
      const reportRef = doc(db, 'reported_questions', question.id);
      
      await setDoc(reportRef, {
        questionId: question.id,
        subjectId: question.subjectId || '01',
        topicId: question.topicId || 'unknown',
        chapterId: question.chapterId || 'unknown',
        subtopicId: question.subtopicId || 'unknown',
        
        // arrayUnion ensures the same teacher isn't added twice, 
        // and identical reasons aren't duplicated endlessly
        reasons: arrayUnion(selectedReason),
        reportedBy: arrayUnion(user.uid),
        
        // Increment tallies how many times it was clicked total
        reportCount: increment(1),
        status: 'pending',
        lastReportedAt: serverTimestamp()
      }, { merge: true }); // merge: true is the magic that updates instead of overwriting

      toast.success(rt.success, { duration: 1000 });
      setIsReporting(false);
      setSelectedReason(null);
    } catch (error) {
      console.error("Report Error:", error);
      toast.error(rt.fail);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <>
      <div 
        className={`
          relative bg-white rounded-xl border transition-all duration-200 group
          ${isAdded 
            ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md z-10' 
            : 'border-slate-200 hover:border-indigo-300 shadow-sm'}
        `}
      >
        <div className="p-3 md:p-4 flex gap-3 md:gap-4 items-start">
          
          {/* 1. Left: Number Only */}
          <div className="pt-1 shrink-0">
            <span className="text-xs font-bold text-slate-400 font-mono">#{index}</span>
          </div>

          {/* 2. Middle: Content */}
          <div className="flex-1 min-w-0">
            
            {/* Metadata Badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border tracking-wide ${badgeClass}`}>
                {difficulty}
              </span>
            </div>

            {/* Question Text */}
            <div className="text-slate-800 text-sm leading-relaxed overflow-x-auto min-w-0 break-words custom-scrollbar">
               <LatexRenderer latex={questionText} />
            </div>

            {/* Actions Row */}
            <div className="mt-3 flex items-center gap-4">
              {Object.keys(options).length > 0 && (
                <button 
                  onClick={() => setShowOptions(!showOptions)}
                  className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200"
                >
                  {showOptions ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                  {showOptions ? 'Hide Options' : 'Show Options'}
                </button>
              )}
              
              {/* 🟢 STEP 1: Subtle Report Button */}
              <button
                onClick={() => setIsReporting(true)}
                className="text-[11px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-red-50"
                title="Report error in this question"
              >
                <AlertTriangle size={12} />
                {rt.reportBtn}
              </button>
            </div>
          </div>

          {/* 3. Right: Add/Remove Button */}
          <div className="pt-0.5 shrink-0 ml-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled || isAdded) onToggle();
              }}
              disabled={disabled && !isAdded}
              className={`
                w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm
                ${isAdded 
                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                  : disabled 
                    ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white hover:shadow-md hover:scale-105'
                }
              `}
              title={isAdded ? "Remove" : disabled ? "Limit reached (Max 100)" : "Add"}
            >
              {isAdded ? <Minus size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
            </button>
          </div>

        </div>

        {/* Options Panel */}
        {showOptions && (
          <div className="bg-slate-50/50 border-t border-slate-100 px-3 py-3 md:px-4 rounded-b-xl animate-in slide-in-from-top-1 fade-in duration-200">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(options).map(([key, val]: any) => {
                const isCorrect = key === correctAnswer;
                return (
                  <div key={key} className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-600'}`}>
                    <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold shrink-0 mt-0.5 ${isCorrect ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{key}</span>
                    <div className="min-w-0 overflow-x-auto break-words flex-1"><LatexRenderer latex={getText(val)} /></div>
                    {isCorrect && <Check size={14} className="text-emerald-600 shrink-0" />}
                  </div>
                );
              })}
             </div>
          </div>
        )}
      </div>

      {/* 🟢 REPORT MODAL */}
      {isReporting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsReporting(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 text-red-500">
                  <AlertTriangle size={20} />
                  <h3 className="font-bold text-lg text-slate-900">{rt.modalTitle}</h3>
                </div>
                <button onClick={() => setIsReporting(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
             </div>
             
             <p className="text-sm text-slate-500 mb-4">{rt.modalDesc}</p>
             
             <div className="space-y-2 mb-6">
                {Object.entries(rt.reasons).map(([key, label]) => (
                  <label key={key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedReason === label ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <input 
                      type="radio" 
                      name="reportReason" 
                      value={label} 
                      checked={selectedReason === label}
                      onChange={() => setSelectedReason(label)}
                      className="w-4 h-4 text-red-500 focus:ring-red-500"
                    />
                    <span className={`text-sm font-medium ${selectedReason === label ? 'text-red-700' : 'text-slate-700'}`}>{label}</span>
                  </label>
                ))}
             </div>

             <div className="flex gap-3">
               <button onClick={() => setIsReporting(false)} className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">{rt.cancel}</button>
               <button 
                  onClick={handleReportSubmit} 
                  disabled={!selectedReason || isSubmittingReport} 
                  className="flex-1 py-3 font-bold text-white bg-red-500 hover:bg-red-600 disabled:bg-red-300 rounded-xl shadow-lg shadow-red-200 transition-colors flex justify-center items-center gap-2"
                >
                  {isSubmittingReport ? <Loader2 size={18} className="animate-spin" /> : rt.submit}
               </button>
             </div>
          </div>
        </div>
      )}
    </>
  );
}
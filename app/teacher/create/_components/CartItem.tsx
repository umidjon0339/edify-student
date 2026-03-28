'use client';

import { useState } from 'react';
import { Trash2, BookOpen, Eye, Check, ChevronDown, CheckCircle2 } from 'lucide-react';
import LatexRenderer from '@/components/LatexRenderer';

interface Props {
  question: any;
  index: number;
  onRemove: () => void;
}

export default function CartItem({ question, index, onRemove }: Props) {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isSolutionOpen, setIsSolutionOpen] = useState(false);

  // Safe Text Helper
  const getText = (obj: any) => {
    if (!obj) return "";
    if (typeof obj === 'string') return obj;
    return obj?.uz || obj?.en || obj?.ru || "No text";
  };

  const questionText = getText(question.question || question.text);
  const options = question.options || {};
  const correctAnswer = question.answer;
  const explanation = getText(question.explanation);
  
  const singleSolution = getText(question.solution); 
  const multiSolutions = question.solutions || [];
  const hasSolution = (explanation && explanation !== "No text") || 
                      multiSolutions.length > 0 || 
                      (singleSolution && singleSolution !== "No text");

  // 🟢 PREMIUM LIGHT MODE DIFFICULTY BADGES
  const diffStyles: Record<string, string> = {
    easy: 'text-emerald-700 bg-emerald-50 border-emerald-200/60',
    medium: 'text-amber-700 bg-amber-50 border-amber-200/60',
    hard: 'text-rose-700 bg-rose-50 border-rose-200/60',
  };

  const difficultyKey = (question.uiDifficulty || question.difficulty || 'medium').toLowerCase();
  const diffStyle = diffStyles[difficultyKey] || 'text-slate-600 bg-slate-50 border-slate-200';

  return (
    // 🟢 UPGRADED CARD CONTAINER
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_2px_10px_rgb(0,0,0,0.02)] overflow-hidden group hover:border-indigo-200 hover:shadow-md transition-all duration-300">
      
      {/* 1. MAIN CONTENT ROW */}
      <div className="p-4 md:p-5 flex gap-4 relative">
        {/* Index Badge */}
        <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
           <span className="text-slate-500 font-black text-[12px]">
             {index}
           </span>
        </div>
        
        <div className="flex-1 min-w-0 pt-1">
          <div className="text-[14px] font-semibold text-slate-800 leading-relaxed break-words overflow-x-auto custom-scrollbar">
             <LatexRenderer latex={questionText} />
          </div>
        </div>

        <button 
          onClick={onRemove}
          className="text-slate-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 flex items-center justify-center rounded-xl transition-colors shrink-0 -mr-1 -mt-1 group-hover:opacity-100 opacity-60 sm:opacity-0"
          title="Remove Question"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* 2. ACTION BAR */}
      <div className="bg-slate-50/50 px-4 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Difficulty Badge */}
        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border shadow-sm ${diffStyle}`}>
          {question.uiDifficulty || question.difficulty || 'Normal'}
        </span>

        {/* Toggles */}
        <div className="flex items-center gap-2">
           {Object.keys(options).length > 0 && (
              <button 
                onClick={() => setIsOptionsOpen(!isOptionsOpen)}
                className={`text-[11px] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                  isOptionsOpen 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <Eye size={14} className={isOptionsOpen ? 'text-indigo-500' : 'text-slate-400'} />
                Options
                <ChevronDown size={14} className={`transition-transform duration-200 ${isOptionsOpen ? 'rotate-180 text-indigo-400' : 'text-slate-400'}`} />
              </button>
            )}

            {hasSolution && (
              <button 
                onClick={() => setIsSolutionOpen(!isSolutionOpen)}
                className={`text-[11px] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                  isSolutionOpen 
                    ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <BookOpen size={14} className={isSolutionOpen ? 'text-amber-500' : 'text-slate-400'} />
                Solution
                <ChevronDown size={14} className={`transition-transform duration-200 ${isSolutionOpen ? 'rotate-180 text-amber-400' : 'text-slate-400'}`} />
              </button>
            )}
        </div>
      </div>

      {/* 3. EXPANDABLE PANELS */}
      
      {/* OPTIONS PANEL */}
      {isOptionsOpen && (
        <div className="border-t border-slate-100 p-4 bg-white space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
           {Object.entries(options).map(([key, val]: any) => {
             const isCorrect = key === correctAnswer;
             return (
               <div key={key} className={`flex gap-3 items-center p-3 rounded-xl border-2 transition-colors ${
                 isCorrect 
                   ? 'bg-emerald-50/50 border-emerald-500/30 shadow-sm' 
                   : 'border-slate-100 hover:border-slate-200'
               }`}>
                 
                 <div className={`w-6 h-6 flex items-center justify-center rounded-lg text-[11px] font-black shrink-0 ${
                   isCorrect 
                     ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                     : 'bg-slate-100 text-slate-500'
                 }`}>
                   {key}
                 </div>
                 
                 <div className={`flex-1 break-words overflow-x-auto text-[13px] font-medium pt-0.5 ${
                   isCorrect ? 'text-emerald-950' : 'text-slate-700'
                 }`}>
                   <LatexRenderer latex={getText(val)} />
                 </div>
                 
                 {isCorrect && <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />}
               </div>
             )
           })}
        </div>
      )}

      {/* SOLUTION PANEL */}
      {isSolutionOpen && (
        <div className="border-t border-slate-100 p-5 bg-[#FAFAFA] space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
          
          {explanation && explanation !== "No text" && (
            <div className="text-[13px] font-medium text-slate-700 break-words">
              <span className="font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5 mb-2 text-[10px]">
                <BookOpen size={12}/> Explanation
              </span>
              <div className="pl-3 border-l-2 border-amber-300 overflow-x-auto bg-amber-50/50 p-3 rounded-r-xl">
                <LatexRenderer latex={explanation} />
              </div>
            </div>
          )}

          {singleSolution && singleSolution !== "No text" && (
             <div className="text-[13px] font-medium text-slate-700 break-words">
               <span className="font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 mb-2 text-[10px]">
                 <CheckCircle2 size={12}/> Solution
               </span>
               <div className="pl-3 border-l-2 border-emerald-300 overflow-x-auto bg-emerald-50/50 p-3 rounded-r-xl">
                 <LatexRenderer latex={singleSolution} />
               </div>
             </div>
          )}
          
          {multiSolutions.length > 0 && (
            <div className="text-[13px] font-medium text-slate-700 break-words">
              <span className="font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 mb-2 text-[10px]">
                <BookOpen size={12}/> Step-by-Step
              </span>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                {multiSolutions.map((sol: any, idx: number) => (
                  <ul key={idx} className="space-y-3">
                    {sol.steps?.map((step: string, sIdx: number) => (
                      <li key={sIdx} className="overflow-x-auto flex gap-3 items-start">
                        <span className="text-[10px] font-black text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-md mt-0.5 shrink-0">
                          {sIdx + 1}
                        </span>
                        <LatexRenderer latex={step} />
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
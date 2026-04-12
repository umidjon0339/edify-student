"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight, Loader2, Minus, Plus, Wand2, Layers, BookMarked, Settings2, Zap, GraduationCap, BookOpen } from "lucide-react";

const formatSubjectName = (rawSubject: string) => {
  if (!rawSubject) return "";
  const cleanedStr = rawSubject.replace(/-/g, " ");
  return cleanedStr.charAt(0).toUpperCase() + cleanedStr.slice(1).toLowerCase();
};

export default function IxtisosControlPanel({
  selectedClass, onOpenClassModal,
  selectedSubject, onOpenSubjectModal,
  activeChapter, activeSubtopic, onOpenSyllabus,
  difficulty, setDifficulty,
  count, setCount,
  isLoadingSyllabus, isReadyToGenerate, isGenerating, handleGenerate,
  aiData, setIsLimitModalOpen
}: any) {
  
  const difficulties = [
    { id: "easy", label: "Oson", color: "hover:border-emerald-400 hover:bg-emerald-50", active: "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm ring-2 ring-emerald-500/20" },
    { id: "medium", label: "O'rtacha", color: "hover:border-blue-400 hover:bg-blue-50", active: "border-blue-500 bg-blue-50 text-blue-700 shadow-sm ring-2 ring-blue-500/20" },
    { id: "hard", label: "Murakkab", color: "hover:border-amber-400 hover:bg-amber-50", active: "border-amber-500 bg-amber-50 text-amber-700 shadow-sm ring-2 ring-amber-500/20" },
    { id: "olympiad", label: "Olimpiada", color: "hover:border-purple-400 hover:bg-purple-50", active: "border-purple-500 bg-purple-50 text-purple-700 shadow-sm ring-2 ring-purple-500/20" }
  ];

  const onGenerateClick = () => {
    if (aiData?.isLimitReached || (aiData && count > aiData.remaining)) {
      setIsLimitModalOpen(true);
      return; 
    }
    handleGenerate();
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 pb-32 space-y-6">
        
        {/* STEP 1: CLASS */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-black ${selectedClass ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-600'}`}>
              {selectedClass ? <CheckCircle2 size={14} /> : "1"}
            </div>
            <h3 className={`text-[14px] font-bold ${selectedClass ? 'text-emerald-700' : 'text-slate-900'}`}>Sinfni tanlang</h3>
          </div>
          
          <div className="pl-8">
            <button 
              onClick={onOpenClassModal}
              className={`w-full p-4 rounded-2xl border-2 text-left transition-all group flex items-center justify-between shadow-sm ${selectedClass ? 'bg-amber-50/50 border-amber-200 hover:border-amber-400' : 'bg-slate-50 border-slate-200 hover:border-amber-400 hover:bg-white'}`}
            >
              {selectedClass ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm"><GraduationCap size={20} /></div>
                  <span className="text-[15px] font-bold text-slate-800">{selectedClass}</span>
                </div>
              ) : (
                <span className="text-[14px] font-bold text-slate-400 pl-2">Sinfni tanlang...</span>
              )}
              <ChevronRight size={20} className="text-slate-400 group-hover:text-amber-500 transition-colors shrink-0" />
            </button>
          </div>
        </div>

        {/* STEP 2: SUBJECT */}
        <AnimatePresence>
          {selectedClass && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-black ${selectedSubject ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-600'}`}>
                  {selectedSubject ? <CheckCircle2 size={14} /> : "2"}
                </div>
                <h3 className={`text-[14px] font-bold ${selectedSubject ? 'text-emerald-700' : 'text-slate-900'}`}>Fanni tanlang</h3>
              </div>
              
              <div className="pl-8">
                <button 
                  onClick={onOpenSubjectModal}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all group flex items-center justify-between shadow-sm ${selectedSubject ? 'bg-amber-50/50 border-amber-200 hover:border-amber-400' : 'bg-slate-50 border-slate-200 hover:border-amber-400 hover:bg-white'}`}
                >
                  {selectedSubject ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm"><BookOpen size={20} /></div>
                      <span className="text-[15px] font-bold text-slate-800">{formatSubjectName(selectedSubject)}</span>
                    </div>
                  ) : (
                    <span className="text-[14px] font-bold text-slate-400 pl-2">Fanni tanlang...</span>
                  )}
                  <ChevronRight size={20} className="text-slate-400 group-hover:text-amber-500 transition-colors shrink-0" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STEP 3: TOPIC */}
        <AnimatePresence>
          {selectedSubject && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-black ${activeSubtopic ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-600'}`}>
                    {activeSubtopic ? <CheckCircle2 size={14} /> : "3"}
                  </div>
                  <h3 className={`text-[14px] font-bold ${activeSubtopic ? 'text-emerald-700' : 'text-slate-900'}`}>O'quv mavzusi</h3>
                </div>
                {isLoadingSyllabus && <Loader2 size={14} className="animate-spin text-amber-500"/>}
              </div>
              
              <div className="pl-8">
                <button 
                  onClick={onOpenSyllabus}
                  disabled={isLoadingSyllabus}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all group flex items-center justify-between shadow-sm ${activeSubtopic ? 'bg-amber-50/50 border-amber-200 hover:border-amber-400' : 'bg-slate-50 border-slate-200 hover:border-amber-400 hover:bg-white'}`}
                >
                  {activeChapter && activeSubtopic ? (
                    <div className="min-w-0 pr-4">
                      <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1 truncate flex items-center gap-1.5"><BookMarked size={12}/> {activeChapter.chapter}</div>
                      <div className="text-[13px] font-bold text-slate-800 leading-snug line-clamp-2">{activeSubtopic.name}</div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-slate-400">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover:text-amber-500 transition-colors"><Layers size={20} /></div>
                      <span className="text-[14px] font-bold">Mavzuni tanlang...</span>
                    </div>
                  )}
                  <ChevronRight size={20} className="text-slate-400 group-hover:text-amber-500 transition-colors shrink-0" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STEP 4: CONFIGURATION (Difficulty & Count) */}
        <AnimatePresence>
          {activeSubtopic && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-6 pt-6 border-t border-slate-100">
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-black">4</div>
                  <h3 className="text-[14px] font-bold text-slate-900">Sozlamalar</h3>
                </div>
                
                <div className="pl-8 space-y-5">
                  {/* Difficulty */}
                  <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-200/60 shadow-inner">
                    {difficulties.map(diff => {
                      const isSelected = difficulty === diff.id;
                      return (
                        <button key={diff.id} onClick={() => setDifficulty(diff.id)} className={`py-2 px-1 rounded-lg text-[12px] font-bold transition-all text-center ${isSelected ? diff.active : `bg-white border border-slate-200 text-slate-600 ${diff.color}`}`}>
                          {diff.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Count & Limits */}
                  <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
                    <span className="text-[13px] font-bold text-slate-600 flex items-center gap-2"><Settings2 size={16} className="text-amber-400"/> Savollar soni</span>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setCount((prev: number) => Math.max(1, prev - 1))} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors disabled:opacity-40" disabled={count <= 1}><Minus size={16} strokeWidth={3} /></button>
                      <span className="text-[16px] font-black text-slate-900 w-4 text-center">{count}</span>
                      <button onClick={() => setCount((prev: number) => Math.min(15, aiData?.remaining ?? 15, prev + 1))} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors disabled:opacity-40" disabled={count >= 15 || count >= (aiData?.remaining ?? 15)}><Plus size={16} strokeWidth={3} /></button>
                    </div>
                  </div>

                  {aiData && !aiData.isLimitReached && aiData.remaining < 15 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3 items-start">
                      <Zap size={16} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] font-bold text-amber-700 leading-snug">
                        Sizda faqat <span className="font-black text-amber-900">{aiData.remaining} ta</span> savol yaratish limiti qoldi.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* STICKY BOTTOM GENERATE BUTTON */}
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-white via-white to-white/0 pt-10">
        <button 
          onClick={onGenerateClick} 
          disabled={isGenerating || !isReadyToGenerate} 
          className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-white rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-amber-500/20 disabled:shadow-none text-[15px] border-b-4 border-amber-700 active:border-b-0"
        >
          {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} strokeWidth={2.5}/>} 
          {isGenerating ? "Yaratilmoqda..." : "Savol Yaratish"}
        </button>
      </div>

    </div>
  );
}
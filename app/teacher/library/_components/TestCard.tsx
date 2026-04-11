'use client';

import { Clock, ArrowRight, Layers, Calendar } from 'lucide-react';
import PrintLauncher from '@/app/teacher/create/_components/PrintLauncher';
import { useTeacherLanguage } from '@/app/teacher/layout';
import { motion } from 'framer-motion';

// --- TRANSLATION DICTIONARY ---
const CARD_TRANSLATIONS: Record<string, any> = {
  uz: { active: "Faol", archived: "Arxiv", pin: "Kod", noLimit: "Cheksiz", min: "daq", items: "ta savol" },
  en: { active: "Active", archived: "Archived", pin: "Pin", noLimit: "No Limit", min: "min", items: "Items" },
  ru: { active: "Активен", archived: "Архив", pin: "Код", noLimit: "Без лимита", min: "мин", items: "вопр." }
};

// --- DYNAMIC MESH BACKGROUND ---
const CardIllustration = ({ theme }: { theme: string }) => (
  // The overflow-hidden here perfectly clips the mesh to the card's rounded corners!
  <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none opacity-30 group-hover:opacity-100 transition-opacity duration-700 z-0">
    <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`grad-${theme}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <motion.circle cx="160" cy="160" r="80" fill={`url(#grad-${theme})`} className={`text-${theme}-500`}
        animate={{ x: [-15, 10, -15], y: [-10, 15, -10], scale: [1, 1.1, 1] }} 
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} 
      />
      <motion.circle cx="40" cy="40" r="60" fill={`url(#grad-${theme})`} className={`text-${theme}-500`}
        animate={{ x: [10, -10, 10], y: [15, -10, 15], scale: [1, 1.2, 1] }} 
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} 
      />
    </svg>
  </div>
);

interface Props {
  test: any;
  theme: string;
  onManage: () => void;
}

export default function TestCard({ test, theme, onManage }: Props) {
  const { lang } = useTeacherLanguage();
  const t = CARD_TRANSLATIONS[lang] || CARD_TRANSLATIONS['uz'];
  const isActive = test.status !== 'archived';

  const formattedDate = test.createdAt ? (() => {
    try {
      const dateObj = test.createdAt?.toDate ? test.createdAt.toDate() : new Date(test.createdAt);
      const locales: any = { uz: 'uz-UZ', en: 'en-US', ru: 'ru-RU' };
      return new Intl.DateTimeFormat(locales[lang] || 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(dateObj);
    } catch { return ''; }
  })() : '';

  return (
    <div 
      onClick={onManage}
      // 🟢 THE FIX: Removed 'overflow-hidden' from this main wrapper class list
      className={`group bg-white rounded-3xl md:rounded-[2rem] border border-slate-200/80 p-5 md:p-6 transition-all duration-300 relative flex flex-col h-full cursor-pointer hover:shadow-xl hover:border-${theme}-300 hover:shadow-${theme}-500/10 ${!isActive ? 'opacity-60 hover:opacity-100 grayscale hover:grayscale-0' : ''}`}
    >
      
      <CardIllustration theme={theme} />

      {/* TOP ROW */}
      <div className="flex justify-between items-start mb-5 relative z-10">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg border text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-colors ${isActive ? `bg-white border-${theme}-200 text-${theme}-600 shadow-sm` : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isActive ? `bg-${theme}-500 animate-pulse` : 'bg-slate-400'}`}></div>
          {isActive ? t.active : t.archived}
        </div>
        
        {/* Tooltip Wrapper */}
        <div onClick={(e) => e.stopPropagation()} className="relative z-20">
           <PrintLauncher 
              title={test.title} 
              questions={test.questions} 
              className={`p-2 bg-slate-50 border border-slate-100 text-slate-400 rounded-xl transition-all shadow-sm group-hover:bg-white group-hover:text-${theme}-600 group-hover:border-${theme}-200 group-hover:shadow-md`} 
           />
        </div>
      </div>

      {/* MIDDLE ROW */}
      <div className="mb-6 flex-1 relative z-10">
        <h3 className={`font-black text-slate-900 text-[16px] md:text-[18px] leading-snug mb-2 group-hover:text-${theme}-700 transition-colors line-clamp-2`}>
          {test.title}
        </h3>
        
        <div className="flex flex-wrap items-center gap-3 mt-3">
          {formattedDate && (
            <div className="flex items-center gap-1.5 text-[11px] md:text-[12px] font-bold text-slate-400 tracking-wide">
              <Calendar size={14} className="text-slate-300" /> {formattedDate}
            </div>
          )}
          {test.accessCode && (
            <div className="flex items-center gap-1.5">
               <span className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest">{t.pin}:</span>
               <span className="bg-slate-50 text-slate-700 font-mono text-[11px] md:text-[12px] font-black px-2 py-0.5 rounded border border-slate-200 shadow-inner group-hover:bg-white transition-colors">
                 {test.accessCode}
               </span>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className={`pt-4 border-t border-slate-100 flex items-center justify-between relative z-10 transition-colors group-hover:border-${theme}-100`}>
         <div className="flex items-center gap-4 text-[12px] md:text-[13px] font-bold text-slate-500">
           <span className="flex items-center gap-1.5" title="Duration"><Clock size={14} className="text-slate-400" /> {test.duration ? `${test.duration} ${t.min}` : t.noLimit}</span>
           <span className="flex items-center gap-1.5" title="Question Count"><Layers size={14} className="text-slate-400" /> {test.questionCount} {t.items}</span>
         </div>
         <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center transition-colors duration-300 text-slate-400 group-hover:bg-${theme}-600 group-hover:border-transparent group-hover:text-white shadow-sm group-hover:shadow-md group-hover:shadow-${theme}-500/20`}>
           <ArrowRight size={16} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
         </div>
      </div>

    </div>
  );
}
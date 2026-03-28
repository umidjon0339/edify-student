'use client';

import { Clock, ArrowRight, Layers, Calendar } from 'lucide-react';
import PrintLauncher from '@/app/teacher/create/_components/PrintLauncher';
import { useTeacherLanguage } from '@/app/teacher/layout';

// --- TRANSLATION DICTIONARY ---
const CARD_TRANSLATIONS = {
  uz: {
    active: "Faol",
    archived: "Arxivlangan",
    pin: "Kod",
    noLimit: "Cheksiz",
    min: "daq",
    items: "ta savol"
  },
  en: {
    active: "Active",
    archived: "Archived",
    pin: "Pin",
    noLimit: "No Limit",
    min: "min",
    items: "Items"
  },
  ru: {
    active: "Активен",
    archived: "Архив",
    pin: "Код",
    noLimit: "Без лимита",
    min: "мин",
    items: "вопр."
  }
};

interface Props {
  test: any;
  onManage: () => void;
}

export default function TestCard({ test, onManage }: Props) {
  const { lang } = useTeacherLanguage();
  const t = CARD_TRANSLATIONS[lang] || CARD_TRANSLATIONS['en'];
  
  const isActive = test.status !== 'archived';

  // 🟢 SMART DATE FORMATTER: Automatically adapts to Uz/En/Ru formats
  const formattedDate = test.createdAt ? (() => {
    try {
      // Handle both Firebase Timestamp objects and ISO strings
      const dateObj = test.createdAt?.toDate ? test.createdAt.toDate() : new Date(test.createdAt);
      const locales = { uz: 'uz-UZ', en: 'en-US', ru: 'ru-RU' };
      return new Intl.DateTimeFormat(locales[lang] || 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(dateObj);
    } catch {
      return '';
    }
  })() : '';

  return (
    <div 
      onClick={onManage}
      // 🟢 1-O'ZGARISH: Asosiy div dan "overflow-hidden" olib tashlandi
      className={`
        group rounded-3xl p-5 md:p-6 transition-all duration-300 cursor-pointer flex flex-col h-full relative
        ${isActive 
          ? 'bg-gradient-to-br from-indigo-50/90 via-white to-slate-50/50 border border-slate-200 hover:border-indigo-300 shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgb(99,102,241,0.1)] hover:-translate-y-1 hover:from-indigo-100/60' 
          : 'bg-white border border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300 hover:shadow-md'}
      `}
    >
      
      {/* 🟢 2-O'ZGARISH: Nur (glow) tashqariga chiqib ketmasligi uchun alohida "overflow-hidden" qatlam qo'shildi */}
      {isActive && (
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-400/40 to-violet-400/30 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
      )}

      {/* TOP ROW: Status Badge & Print Button */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        
        {/* Modern Status Badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors
          ${isActive ? 'bg-white border-emerald-100 text-emerald-600 shadow-inner' : 'bg-slate-50 border-slate-200 text-slate-500'}
        `}>
          <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
          {isActive ? t.active : t.archived}
        </div>
        
        {/* Stop Propagation Wrapper for Print */}
        <div onClick={(e) => e.stopPropagation()} className="relative z-20">
           <PrintLauncher 
              title={test.title} 
              questions={test.questions}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-100 transition-all shadow-sm group-hover:shadow-md"
           />
        </div>
      </div>

      {/* MIDDLE ROW: Title, Date & Access Code */}
      <div className="mb-6 flex-1">
        <h3 className="font-black text-slate-900 text-[17px] leading-snug mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
          {test.title}
        </h3>
        
        <div className="flex flex-wrap items-center gap-3 mt-3">
          {/* 🟢 NEW: Creation Date */}
          {formattedDate && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 tracking-wide">
              <Calendar size={12} className="text-slate-300" />
              {formattedDate}
            </div>
          )}

          {/* Secure Pin Badge */}
          {test.accessCode && (
            <div className="flex items-center gap-1.5">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.pin}:</span>
               <span className="bg-slate-100 text-slate-700 font-mono text-[12px] font-bold px-2.5 py-0.5 rounded-md border border-slate-200/60 shadow-inner">
                 {test.accessCode}
               </span>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM ROW: Metrics & Action Arrow */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
         
         <div className="flex items-center gap-4 text-[12px] font-bold text-slate-500">
           <span className="flex items-center gap-1.5" title="Duration">
             <Clock size={14} className="text-slate-400" /> 
             {test.duration ? `${test.duration} ${t.min}` : t.noLimit}
           </span>
           <span className="flex items-center gap-1.5" title="Question Count">
             <Layers size={14} className="text-slate-400" /> 
             {test.questionCount} {t.items}
           </span>
         </div>
         
         <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 transition-colors duration-300">
           <ArrowRight size={14} className="text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
         </div>

      </div>
    </div>
  );
}
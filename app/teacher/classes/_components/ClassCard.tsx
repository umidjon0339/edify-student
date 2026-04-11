'use client';

import { Users, Hash, ArrowRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { useTeacherLanguage } from '@/app/teacher/layout'; 

// --- TRANSLATION DICTIONARY ---
const CARD_TRANSLATIONS: Record<string, any> = {
  uz: { noDesc: "Tavsif yo'q", students: "O'quvchi", manage: "Boshqarish" },
  en: { noDesc: "No description", students: "Students", manage: "Manage Class" },
  ru: { noDesc: "Нет описания", students: "Учеников", manage: "Управление" }
};

// --- DYNAMIC MESH BACKGROUND ---
const CardIllustration = ({ theme }: { theme: string }) => (
  <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none opacity-30 group-hover:opacity-100 transition-opacity duration-700">
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

const cardVariants: Variants = { 
  hidden: { opacity: 0, y: 15, scale: 0.98 }, 
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } },
  hover: { y: -4, transition: { duration: 0.2 } },
  tap: { scale: 0.97 }
};

interface Props {
  cls: any;
  theme: string; // Passed from parent (e.g., 'blue', 'rose', 'emerald')
}

export default function ClassCard({ cls, theme }: Props) {
  const { lang } = useTeacherLanguage();
  const t = CARD_TRANSLATIONS[lang] || CARD_TRANSLATIONS['uz'];

  return (
    <motion.div variants={cardVariants} whileHover="hover" whileTap="tap" className={`group bg-white rounded-3xl md:rounded-[2rem] border border-slate-200/80 p-5 md:p-6 transition-all duration-300 relative overflow-hidden flex flex-col h-full hover:shadow-xl hover:border-${theme}-300 hover:shadow-${theme}-500/10`}>
      
      <CardIllustration theme={theme} />

      {/* HEADER ROW: Icon + Title */}
      <div className="flex items-start gap-4 mb-5 relative z-10">
        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 shadow-sm bg-${theme}-50 text-${theme}-600 border border-${theme}-100 group-hover:bg-${theme}-600 group-hover:text-white group-hover:scale-110 group-hover:rotate-3`}>
           <BookOpen size={20} strokeWidth={2.5} className="md:w-6 md:h-6" />
        </div>
        <div className="flex-1 min-w-0 pt-1">
           <h3 className={`font-black text-slate-900 text-[16px] md:text-[18px] transition-colors line-clamp-1 group-hover:text-${theme}-700`}>
             {cls.title}
           </h3>
           <p className="text-[12px] md:text-[13px] text-slate-500 font-medium line-clamp-1 mt-0.5 md:mt-1">
             {cls.description || t.noDesc}
           </p>
        </div>
      </div>

      {/* METRICS ROW: Badges */}
      <div className="flex flex-wrap items-center gap-2.5 mb-6 relative z-10">
         <div className={`flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg group-hover:bg-white group-hover:border-${theme}-200 transition-colors`}>
            <Hash size={14} className="text-slate-400"/>
            <span className="font-mono text-[11px] md:text-[12px] font-black text-slate-700 tracking-widest">{cls.joinCode}</span>
         </div>
         
         <div className="flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 bg-slate-100 border border-slate-200 rounded-lg group-hover:bg-slate-800 transition-colors group-hover:border-slate-800">
            <Users size={14} className="text-slate-500 group-hover:text-slate-300"/>
            <span className="text-[11px] md:text-[12px] font-bold text-slate-700 group-hover:text-white transition-colors">{cls.studentIds?.length || 0} {t.students}</span>
         </div>
      </div>

      <div className="flex-1"></div> 

      {/* ACTION BUTTON */}
      <Link 
        href={`/teacher/classes/${cls.id}`} 
        className={`flex items-center justify-between w-full p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-200/80 font-bold text-[13px] md:text-[14px] transition-all duration-300 relative z-10 text-slate-600 group-hover:bg-${theme}-600 group-hover:border-${theme}-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-${theme}-500/25`}
      >
         <span className="ml-2">{t.manage}</span>
         <div className={`w-8 h-8 rounded-lg md:rounded-xl bg-white border border-slate-200 flex items-center justify-center transition-colors text-slate-400 group-hover:bg-white/20 group-hover:border-transparent group-hover:text-white`}>
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
         </div>
      </Link>

    </motion.div>
  );
}
'use client';

import { Users, Hash, ArrowRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useTeacherLanguage } from '@/app/teacher/layout'; 

// --- TRANSLATION DICTIONARY ---
const CARD_TRANSLATIONS = {
  uz: { noDesc: "Tavsif yo'q", students: "O'quvchi", manage: "Boshqarish" },
  en: { noDesc: "No description", students: "Students", manage: "Manage Class" },
  ru: { noDesc: "Нет описания", students: "Учеников", manage: "Управление" }
};

interface Props {
  cls: any;
}

export default function ClassCard({ cls }: Props) {
  const { lang } = useTeacherLanguage();
  const t = CARD_TRANSLATIONS[lang] || CARD_TRANSLATIONS['en'];

  return (
    <div className="group bg-white rounded-3xl border border-slate-200/80 p-5 md:p-6 hover:border-indigo-200 hover:shadow-[0_12px_30px_rgb(99,102,241,0.06)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col h-full">
      
      {/* 🔴 "Not Boring" Element: Colorful subsurface glow on hover */}
      <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-400/30 to-violet-400/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0" />

      {/* HEADER ROW: Icon + Title */}
      <div className="flex items-start gap-4 mb-5 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:border-indigo-600 group-hover:text-white group-hover:shadow-md transition-all duration-300">
           <BookOpen size={20} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0 pt-1">
           <h3 className="font-black text-slate-800 text-[17px] group-hover:text-indigo-700 transition-colors line-clamp-1">
             {cls.title}
           </h3>
           <p className="text-[13px] text-slate-500 font-medium line-clamp-1 mt-0.5">
             {cls.description || t.noDesc}
           </p>
        </div>
      </div>

      {/* METRICS ROW: Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-6 relative z-10">
         
         {/* Secure Code Badge */}
         <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg shadow-inner group-hover:bg-white group-hover:border-indigo-100 transition-colors">
            <Hash size={14} className="text-indigo-400"/>
            <span className="font-mono text-[12px] font-bold text-slate-700 tracking-widest">{cls.joinCode}</span>
         </div>
         
         {/* Students Badge */}
         <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg shadow-sm">
            <Users size={14} className="text-emerald-500"/>
            <span className="text-[12px] font-bold text-emerald-700">{cls.studentIds?.length || 0} {t.students}</span>
         </div>

      </div>

      <div className="flex-1"></div> {/* Pushes button to bottom if heights differ */}

      {/* ACTION BUTTON */}
      <Link 
        href={`/teacher/classes/${cls.id}`} 
        className="flex items-center justify-between w-full p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 font-bold text-[13px] group-hover:bg-indigo-600 group-hover:border-indigo-600 group-hover:text-white transition-all duration-300 relative z-10 shadow-sm group-hover:shadow-[0_4px_12px_rgb(99,102,241,0.2)]"
      >
         <span>{t.manage}</span>
         <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-white/20 group-hover:border-transparent group-hover:text-white transition-colors">
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" strokeWidth={3} />
         </div>
      </Link>

    </div>
  );
}
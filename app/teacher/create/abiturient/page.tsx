"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Database, Sparkles, GraduationCap, ChevronRight, BrainCircuit, ArrowRight, Zap, Calculator, Atom, Globe, Plus } from "lucide-react";
import { motion, Variants } from "framer-motion";
import { useTeacherLanguage } from "@/app/teacher/layout";

// --- TRANSLATION DICTIONARY ---
const ABITURIENT_TRANSLATIONS: Record<string, any> = {
  uz: {
    heroBadge: "Abiturient 2026",
    title: "Testlarni qanday shakllantiramiz?",
    subtitle: "O'zingizga qulay usulni tanlang.",
    db: { 
      badge: "100K+ Savollar 🔥", 
      title: "Edify DTM Bazasi", 
      desc: "100,000 dan ortiq oldingi yillarda tushgan, DTM va BMBA tomonidan tasdiqlangan tayyor savollar bazasidan test yig'ish.", 
      btn: "Bazaga o'tish" 
    },
    ai: { 
      badge: "Barcha Fanlar ✨", 
      title: "Smart AI Studiya", 
      desc: "O'z faningizni tanlang. AI siz uchun DTM standartidagi butunlay yangi va original savollarni noldan yaratib beradi.", 
      btn: "AI studiyaga o'tish" 
    }
  },
  en: {
    heroBadge: "University Prep",
    title: "How do you want to build tests?",
    subtitle: "Choose your preferred method.",
    db: { 
      badge: "100K+ Questions 🔥", 
      title: "Edify Verified Database", 
      desc: "Build tests using our massive database of over 100,000 verified past exam questions and official DTM materials.", 
      btn: "Open Database" 
    },
    ai: { 
      badge: "All Subjects ✨", 
      title: "Smart AI Studio", 
      desc: "Choose your subject. The AI will generate completely unique, DTM-standard questions from scratch.", 
      btn: "Open AI Studio" 
    }
  },
  ru: {
    heroBadge: "Абитуриент 2026",
    title: "Как вы хотите составить тест?",
    subtitle: "Выберите удобный метод.",
    db: { 
      badge: "100K+ Вопросов 🔥", 
      title: "База DTM Edify", 
      desc: "Создайте тест, используя нашу базу из более чем 100 000 проверенных вопросов прошлых лет и экзаменов DTM.", 
      btn: "Перейти в базу" 
    },
    ai: { 
      badge: "Все предметы ✨", 
      title: "Умная ИИ Студия", 
      desc: "Выберите свой предмет. ИИ создаст абсолютно новые оригинальные вопросы стандарта DTM с нуля.", 
      btn: "Открыть ИИ студию" 
    }
  }
};

// --- ANIMATION VARIANTS ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0.4, duration: 0.8 } },
  hover: { y: -4, transition: { duration: 0.3 } },
  tap: { scale: 0.98 }
};

export default function AbiturientSelectionPage() {
  const router = useRouter();
  const { lang } = useTeacherLanguage();
  const t = ABITURIENT_TRANSLATIONS[lang] || ABITURIENT_TRANSLATIONS['en'];

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col font-sans relative overflow-hidden pb-24">
      
      {/* 🟢 PREMIUM BACKGROUND GLOWS */}
      <div className="absolute top-0 inset-x-0 h-[60vh] bg-gradient-to-b from-slate-100/80 via-white/50 to-transparent pointer-events-none z-0"></div>
      <div className="absolute -left-40 top-[-10%] w-[500px] h-[500px] bg-cyan-400/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute -right-40 top-[20%] w-[500px] h-[500px] bg-violet-400/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* --- HEADER --- */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 flex items-center shadow-sm">
        <button 
          onClick={() => router.push('/teacher/create')} 
          className="p-1.5 md:p-2 -ml-1 md:-ml-2 mr-2 md:mr-3 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all"
        >
          <ArrowLeft size={18} className="md:w-5 md:h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 md:w-7 md:h-7 rounded-md bg-slate-900 flex items-center justify-center text-white shadow-sm">
            <GraduationCap size={14} className="md:w-[16px] md:h-[16px]" />
          </div>
          <h1 className="text-[14px] md:text-[16px] font-bold text-slate-900 tracking-tight">
            Abiturient Tayyorgarligi
          </h1>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col items-center w-full max-w-[800px] mx-auto px-4 md:px-6 relative z-10 pt-8 md:pt-12">
        
        {/* HERO SECTION */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center mb-8 md:mb-12 max-w-xl flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-slate-200 text-slate-500 font-bold text-[9px] md:text-[10px] uppercase tracking-widest mb-4 shadow-sm">
            <Zap size={12} className="fill-amber-400 text-amber-400" /> {t.heroBadge}
          </div>
          <h2 className="text-[22px] md:text-[32px] leading-tight font-black text-slate-900 tracking-tight mb-2 md:mb-3">
            {t.title}
          </h2>
          <p className="text-slate-500 text-[12px] md:text-[14px] font-medium max-w-sm leading-relaxed">
            {t.subtitle}
          </p>
        </motion.div>

        {/* OPTIONS GRID */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
          
          {/* OPTION 1: 100K DATABASE (Cyan/Blue Theme) */}
          <motion.div 
            variants={cardVariants} whileHover="hover" whileTap="tap" 
            onClick={() => router.push('/teacher/create/database?track=abiturient')}
            className="group relative bg-white rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 border border-slate-200/80 hover:border-cyan-300 hover:shadow-[0_10px_30px_-10px_rgba(6,182,212,0.2)] transition-all duration-500 ease-out cursor-pointer overflow-hidden flex flex-col text-left h-full"
          >
            <Database className="absolute -bottom-6 -right-6 text-cyan-500 opacity-[0.03] group-hover:opacity-10 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-700 ease-out" size={140} />
            
            <div className="flex justify-between items-start mb-4 md:mb-5 relative z-10">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-cyan-50 border border-cyan-100 text-cyan-600 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-all duration-500 shadow-sm">
                <Database size={20} strokeWidth={2} className="md:w-6 md:h-6" />
              </div>
              <span className="px-2.5 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm shadow-cyan-500/20 border border-cyan-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-md group-hover:shadow-cyan-500/40 transition-all duration-300">
                {t.db.badge}
              </span>
            </div>
            
            <h3 className="text-[16px] md:text-[18px] font-black text-slate-900 mb-2 relative z-10 group-hover:text-cyan-600 transition-colors">{t.db.title}</h3>
            <p className="text-[12px] md:text-[13px] text-slate-500 mb-6 md:mb-8 relative z-10 font-medium leading-relaxed">{t.db.desc}</p>
            
            <div className="mt-auto inline-flex items-center gap-1.5 md:gap-2 text-cyan-600 text-[12px] md:text-[13px] font-bold relative z-10">
              <span className="group-hover:mr-1 transition-all duration-300">{t.db.btn}</span>
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-cyan-50 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-all duration-300">
                <ArrowRight size={14} className="md:w-4 md:h-4" />
              </div>
            </div>
          </motion.div>

          {/* OPTION 2: AI GENERATOR (Violet/Purple Theme) */}
          <motion.div 
            variants={cardVariants} whileHover="hover" whileTap="tap" 
            onClick={() => router.push('/teacher/create/ai?track=abiturient')}
            className="group relative bg-white rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 border border-slate-200/80 hover:border-violet-300 hover:shadow-[0_10px_30px_-10px_rgba(139,92,246,0.2)] transition-all duration-500 ease-out cursor-pointer overflow-hidden flex flex-col text-left h-full"
          >
            <BrainCircuit className="absolute -bottom-6 -right-6 text-violet-500 opacity-[0.03] group-hover:opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 ease-out" size={140} />
            
            <div className="flex justify-between items-start mb-4 md:mb-5 relative z-10">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-violet-50 border border-violet-100 text-violet-600 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-all duration-500 shadow-sm">
                <BrainCircuit size={20} strokeWidth={2} className="md:w-6 md:h-6" />
              </div>
              <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-md group-hover:bg-violet-50 group-hover:text-violet-600 group-hover:border-violet-200 transition-colors duration-300">
                {t.ai.badge}
              </span>
            </div>
            
            <h3 className="text-[16px] md:text-[18px] font-black text-slate-900 mb-2 relative z-10 group-hover:text-violet-600 transition-colors">{t.ai.title}</h3>
            <p className="text-[12px] md:text-[13px] text-slate-500 mb-4 relative z-10 font-medium leading-relaxed">{t.ai.desc}</p>
            
            {/* 🟢 NEW: VISUAL SUBJECT PILLS TO SHOW IT SUPPORTS ALL SUBJECTS */}
            <div className="flex flex-wrap gap-1.5 mb-6 md:mb-8 relative z-10">
              <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold bg-slate-50 border border-slate-100 text-slate-600 px-2 py-1 rounded-md uppercase tracking-widest"><Calculator size={10}/> Matematika</span>
              <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold bg-slate-50 border border-slate-100 text-slate-600 px-2 py-1 rounded-md uppercase tracking-widest"><Atom size={10}/> Fizika</span>
              <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold bg-slate-50 border border-slate-100 text-slate-600 px-2 py-1 rounded-md uppercase tracking-widest"><Globe size={10}/> Ingliz</span>
              <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold bg-slate-50 border border-slate-100 text-slate-400 px-2 py-1 rounded-md uppercase tracking-widest"><Plus size={10}/> 9 Fanlar</span>
            </div>
            
            <div className="mt-auto inline-flex items-center gap-1.5 md:gap-2 text-violet-600 text-[12px] md:text-[13px] font-bold relative z-10">
              <span className="group-hover:mr-1 transition-all duration-300">{t.ai.btn}</span>
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-violet-50 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-all duration-300">
                <ArrowRight size={14} className="md:w-4 md:h-4" />
              </div>
            </div>
          </motion.div>

        </motion.div>
      </main>
    </div>
  );
}
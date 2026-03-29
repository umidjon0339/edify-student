"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Database, Sparkles, GraduationCap, ChevronRight, BrainCircuit, ArrowRight, Zap } from "lucide-react";
import { motion, Variants } from "framer-motion";
import { useTeacherLanguage } from "@/app/teacher/layout";

// --- TRANSLATION DICTIONARY ---
const ABITURIENT_TRANSLATIONS: Record<string, any> = {
  uz: {
    heroBadge: "Abiturient 2026",
    title: "Abiturient Tayyorgarligi",
    subtitle: "Testlarni qanday shakllantiramiz? O'zingizga qulay usulni tanlang.",
    db: { 
      badge: "100K+ Savollar 🔥", 
      title: "Edify DTM Bazasi", 
      desc: "100,000 dan ortiq oldingi yillarda tushgan, DTM va BMBA tomonidan tasdiqlangan savollar bazasidan test yig'ish.", 
      btn: "Bazaga o'tish" 
    },
    ai: { 
      badge: "Cheksiz ✨", 
      title: "AI Generator", 
      desc: "Sun'iy intellekt yordamida o'quvchilar uchun kutilmagan, DTM darajasidagi yangi mantiqiy masalalarni noldan yaratish.", 
      btn: "AI studiyaga o'tish" 
    }
  },
  en: {
    heroBadge: "University Prep",
    title: "University Preparation",
    subtitle: "How do you want to build tests? Choose your preferred method.",
    db: { 
      badge: "100K+ Questions 🔥", 
      title: "Edify Verified Database", 
      desc: "Build tests using our massive database of over 100,000 verified past exam questions and official DTM materials.", 
      btn: "Open Database" 
    },
    ai: { 
      badge: "Infinite ✨", 
      title: "AI Generator", 
      desc: "Generate completely unique, unpredictable logic and math problems from scratch using artificial intelligence.", 
      btn: "Open AI Studio" 
    }
  },
  ru: {
    heroBadge: "Абитуриент 2026",
    title: "Подготовка абитуриентов",
    subtitle: "Как вы хотите составить тест? Выберите удобный метод.",
    db: { 
      badge: "100K+ Вопросов 🔥", 
      title: "База DTM Edify", 
      desc: "Создайте тест, используя нашу базу из более чем 100 000 проверенных вопросов прошлых лет и экзаменов DTM.", 
      btn: "Перейти в базу" 
    },
    ai: { 
      badge: "Бесконечно ✨", 
      title: "ИИ Генератор", 
      desc: "Создавайте абсолютно новые, непредсказуемые задачи уровня DTM с нуля с помощью искусственного интеллекта.", 
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
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0.4, duration: 0.8 } },
  hover: { y: -8, transition: { duration: 0.3 } },
  tap: { scale: 0.98 }
};

export default function AbiturientSelectionPage() {
  const router = useRouter();
  const { lang } = useTeacherLanguage();
  const t = ABITURIENT_TRANSLATIONS[lang] || ABITURIENT_TRANSLATIONS['en'];

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col font-sans relative overflow-hidden pb-24">
      
      {/* 🟢 PREMIUM BACKGROUND GLOWS */}
      <div className="absolute top-0 inset-x-0 h-[60vh] bg-gradient-to-b from-slate-100/80 via-white/50 to-transparent pointer-events-none"></div>
      <div className="absolute -left-40 top-[-10%] w-[500px] h-[500px] bg-cyan-400/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute -right-40 top-[20%] w-[500px] h-[500px] bg-violet-400/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* --- HEADER --- */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 flex items-center shadow-sm">
        <button 
          onClick={() => router.push('/teacher/create')} 
          className="p-2 -ml-2 mr-3 text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm">
            <GraduationCap size={16} />
          </div>
          <h1 className="text-[16px] md:text-[18px] font-bold text-slate-900 tracking-tight">
            {t.title}
          </h1>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col items-center w-full max-w-[900px] mx-auto px-4 md:px-6 relative z-10 pt-10 md:pt-16">
        
        {/* HERO SECTION */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-16 max-w-2xl flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-widest mb-6 shadow-sm">
            <Zap size={14} className="fill-slate-400 text-slate-400" /> {t.heroBadge}
          </div>
          <h2 className="text-3xl md:text-[44px] leading-tight font-black text-slate-900 tracking-tight mb-5">
            Testlarni qanday shakllantiramiz?
          </h2>
          <p className="text-slate-500 text-[15px] md:text-[17px] font-medium max-w-lg leading-relaxed">
            {t.subtitle}
          </p>
        </motion.div>

        {/* OPTIONS GRID */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 w-full">
          
          {/* OPTION 1: 100K DATABASE (Cyan/Blue Theme) */}
          <motion.div 
            variants={cardVariants} whileHover="hover" whileTap="tap" 
            onClick={() => router.push('/teacher/create/database?track=abiturient')}
            className="group relative bg-white rounded-[2rem] p-8 border border-slate-200/80 hover:border-cyan-300 hover:shadow-[0_20px_40px_-15px_rgba(6,182,212,0.2)] transition-all duration-500 ease-out cursor-pointer overflow-hidden flex flex-col text-left h-full"
          >
            {/* Giant Background Icon */}
            <Database className="absolute -bottom-6 -right-6 text-cyan-500 opacity-[0.03] group-hover:opacity-10 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-700 ease-out" size={160} />
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="w-14 h-14 bg-cyan-50 border border-cyan-100 text-cyan-600 rounded-2xl flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-all duration-500 shadow-sm">
                <Database size={26} strokeWidth={1.5} />
              </div>
              <span className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm shadow-cyan-500/20 border border-cyan-400 text-[10px] font-black uppercase tracking-widest rounded-lg group-hover:shadow-cyan-500/40 transition-all duration-300">
                {t.db.badge}
              </span>
            </div>
            
            <h3 className="text-[22px] font-black text-slate-900 mb-3 relative z-10 group-hover:text-cyan-600 transition-colors">{t.db.title}</h3>
            <p className="text-[14px] text-slate-500 mb-10 relative z-10 font-medium leading-relaxed">{t.db.desc}</p>
            
            <div className="mt-auto inline-flex items-center gap-2 text-cyan-600 text-[14px] font-bold relative z-10">
              <span className="group-hover:mr-1 transition-all duration-300">{t.db.btn}</span>
              <div className="w-7 h-7 rounded-full bg-cyan-50 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-all duration-300">
                <ArrowRight size={14} />
              </div>
            </div>
          </motion.div>

          {/* OPTION 2: AI GENERATOR (Violet/Purple Theme) */}
          <motion.div 
            variants={cardVariants} whileHover="hover" whileTap="tap" 
            onClick={() => router.push('/teacher/create/ai?track=abiturient')}
            className="group relative bg-white rounded-[2rem] p-8 border border-slate-200/80 hover:border-violet-300 hover:shadow-[0_20px_40px_-15px_rgba(139,92,246,0.2)] transition-all duration-500 ease-out cursor-pointer overflow-hidden flex flex-col text-left h-full"
          >
            {/* Giant Background Icon */}
            <BrainCircuit className="absolute -bottom-6 -right-6 text-violet-500 opacity-[0.03] group-hover:opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 ease-out" size={160} />
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="w-14 h-14 bg-violet-50 border border-violet-100 text-violet-600 rounded-2xl flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-all duration-500 shadow-sm">
                <BrainCircuit size={26} strokeWidth={1.5} />
              </div>
              <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg group-hover:bg-violet-50 group-hover:text-violet-600 group-hover:border-violet-200 transition-colors duration-300">
                {t.ai.badge}
              </span>
            </div>
            
            <h3 className="text-[22px] font-black text-slate-900 mb-3 relative z-10 group-hover:text-violet-600 transition-colors">{t.ai.title}</h3>
            <p className="text-[14px] text-slate-500 mb-10 relative z-10 font-medium leading-relaxed">{t.ai.desc}</p>
            
            <div className="mt-auto inline-flex items-center gap-2 text-violet-600 text-[14px] font-bold relative z-10">
              <span className="group-hover:mr-1 transition-all duration-300">{t.ai.btn}</span>
              <div className="w-7 h-7 rounded-full bg-violet-50 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-all duration-300">
                <ArrowRight size={14} />
              </div>
            </div>
          </motion.div>

        </motion.div>
      </main>
    </div>
  );
}
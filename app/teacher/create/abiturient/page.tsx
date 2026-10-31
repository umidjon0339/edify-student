"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Database, Sparkles, GraduationCap, ChevronRight, BrainCircuit, ArrowRight, Zap, Calculator, Atom, Globe, Plus } from "lucide-react";
import { motion, Variants } from "framer-motion";
import { useTeacherLanguage } from "@/app/teacher/layout";

import { IconButton } from "@/components/ui";

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
    <div className="min-h-[100dvh] bg-surface flex flex-col font-t-body relative overflow-clip pb-24">

      {/* 🟢 PREMIUM BACKGROUND GLOWS */}
      <div className="absolute top-0 inset-x-0 h-[60vh] bg-gradient-to-b from-[color-mix(in_oklab,var(--m3-surface-container)_80%,transparent)] via-[color-mix(in_oklab,var(--m3-surface)_50%,transparent)] to-transparent pointer-events-none z-0"></div>
      <div className="absolute -left-40 top-[-10%] w-[500px] h-[500px] bg-[color-mix(in_oklab,var(--m3-primary)_10%,transparent)] rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute -right-40 top-[20%] w-[500px] h-[500px] bg-[color-mix(in_oklab,var(--m3-tertiary)_10%,transparent)] rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* --- HEADER --- */}
      <header className="t-page-bar sticky top-0 z-30 bg-[color-mix(in_oklab,var(--m3-surface)_85%,transparent)] backdrop-blur-md border-b border-outline-variant px-4 md:px-8 py-3 flex items-center shadow-elev-1">
        <IconButton
          aria-label="Orqaga"
          size="sm"
          onClick={() => router.push('/teacher/create')}
          className="-ml-1 md:-ml-2 mr-2 md:mr-3"
        >
          <ArrowLeft />
        </IconButton>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 md:w-7 md:h-7 rounded-m3-sm bg-inverse-surface flex items-center justify-center text-inverse-on-surface shadow-elev-1">
            <GraduationCap size={14} className="md:w-[16px] md:h-[16px]" />
          </div>
          <h1 className="text-[14px] md:text-[16px] font-bold text-on-surface tracking-tight">
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-m3-sm bg-surface-container-low border border-outline-variant text-on-surface-variant font-bold text-[9px] md:text-[10px] uppercase tracking-widest mb-4 shadow-elev-1">
            <Zap size={12} className="fill-warning text-warning" /> {t.heroBadge}
          </div>
          <h2 className="text-[22px] md:text-[32px] leading-tight font-black text-on-surface tracking-tight mb-2 md:mb-3">
            {t.title}
          </h2>
          <p className="text-on-surface-variant text-[12px] md:text-[14px] font-medium max-w-sm leading-relaxed">
            {t.subtitle}
          </p>
        </motion.div>

        {/* OPTIONS GRID */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
          
          {/* OPTION 1: 100K DATABASE (Cyan/Blue Theme) */}
          <motion.div 
            variants={cardVariants} whileHover="hover" whileTap="tap" 
            onClick={() => router.push('/teacher/create/database?track=abiturient')}
            className="group relative bg-surface-container-low rounded-m3-lg md:rounded-m3-xl p-5 md:p-7 border border-outline-variant hover:border-primary hover:shadow-elev-2 transition-all duration-500 ease-out cursor-pointer overflow-hidden flex flex-col text-left h-full"
          >
            <Database className="absolute -bottom-6 -right-6 text-primary opacity-[0.03] group-hover:opacity-10 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-700 ease-out" size={140} />

            <div className="flex justify-between items-start mb-4 md:mb-5 relative z-10">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-container text-on-primary-container rounded-m3-md md:rounded-m3-lg flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-all duration-500 shadow-elev-1">
                <Database size={20} strokeWidth={2} className="md:w-6 md:h-6" />
              </div>
              <span className="px-2.5 py-1 bg-primary text-on-primary shadow-elev-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-m3-sm transition-all duration-300">
                {t.db.badge}
              </span>
            </div>

            <h3 className="text-[16px] md:text-[18px] font-black text-on-surface mb-2 relative z-10 group-hover:text-primary transition-colors">{t.db.title}</h3>
            <p className="text-[12px] md:text-[13px] text-on-surface-variant mb-6 md:mb-8 relative z-10 font-medium leading-relaxed">{t.db.desc}</p>

            <div className="mt-auto inline-flex items-center gap-1.5 md:gap-2 text-primary text-[12px] md:text-[13px] font-bold relative z-10">
              <span className="group-hover:mr-1 transition-all duration-300">{t.db.btn}</span>
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-primary-container flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                <ArrowRight size={14} className="md:w-4 md:h-4" />
              </div>
            </div>
          </motion.div>

          {/* OPTION 2: AI GENERATOR (Violet/Purple Theme) */}
          <motion.div 
            variants={cardVariants} whileHover="hover" whileTap="tap" 
            onClick={() => router.push('/teacher/create/ai?track=abiturient')}
            className="group relative bg-surface-container-low rounded-m3-lg md:rounded-m3-xl p-5 md:p-7 border border-outline-variant hover:border-tertiary hover:shadow-elev-2 transition-all duration-500 ease-out cursor-pointer overflow-hidden flex flex-col text-left h-full"
          >
            <BrainCircuit className="absolute -bottom-6 -right-6 text-tertiary opacity-[0.03] group-hover:opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 ease-out" size={140} />

            <div className="flex justify-between items-start mb-4 md:mb-5 relative z-10">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-tertiary-container text-on-tertiary-container rounded-m3-md md:rounded-m3-lg flex items-center justify-center group-hover:bg-tertiary group-hover:text-on-tertiary transition-all duration-500 shadow-elev-1">
                <BrainCircuit size={20} strokeWidth={2} className="md:w-6 md:h-6" />
              </div>
              <span className="px-2.5 py-1 bg-surface-container border border-outline-variant text-on-surface-variant text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-m3-sm group-hover:bg-tertiary-container group-hover:text-on-tertiary-container group-hover:border-tertiary transition-colors duration-300">
                {t.ai.badge}
              </span>
            </div>

            <h3 className="text-[16px] md:text-[18px] font-black text-on-surface mb-2 relative z-10 group-hover:text-tertiary transition-colors">{t.ai.title}</h3>
            <p className="text-[12px] md:text-[13px] text-on-surface-variant mb-4 relative z-10 font-medium leading-relaxed">{t.ai.desc}</p>

            {/* 🟢 NEW: VISUAL SUBJECT PILLS TO SHOW IT SUPPORTS ALL SUBJECTS */}
            <div className="flex flex-wrap gap-1.5 mb-6 md:mb-8 relative z-10">
              <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold bg-surface-container border border-outline-variant text-on-surface-variant px-2 py-1 rounded-m3-xs uppercase tracking-widest"><Calculator size={10}/> Matematika</span>
              <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold bg-surface-container border border-outline-variant text-on-surface-variant px-2 py-1 rounded-m3-xs uppercase tracking-widest"><Atom size={10}/> Fizika</span>
              <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold bg-surface-container border border-outline-variant text-on-surface-variant px-2 py-1 rounded-m3-xs uppercase tracking-widest"><Globe size={10}/> Ingliz</span>
              <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold bg-surface-container border border-outline-variant text-on-surface-variant px-2 py-1 rounded-m3-xs uppercase tracking-widest"><Plus size={10}/> 9 Fanlar</span>
            </div>

            <div className="mt-auto inline-flex items-center gap-1.5 md:gap-2 text-tertiary text-[12px] md:text-[13px] font-bold relative z-10">
              <span className="group-hover:mr-1 transition-all duration-300">{t.ai.btn}</span>
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-tertiary-container flex items-center justify-center group-hover:bg-tertiary group-hover:text-on-tertiary transition-all duration-300">
                <ArrowRight size={14} className="md:w-4 md:h-4" />
              </div>
            </div>
          </motion.div>

        </motion.div>
      </main>
    </div>
  );
}
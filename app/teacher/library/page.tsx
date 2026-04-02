"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, BookCopy, ChevronRight, CheckCircle2, Layers, Printer, Sparkles } from "lucide-react";
import { useTeacherLanguage } from "@/app/teacher/layout";

// ============================================================================
// 🎨 CUSTOM SVG ILLUSTRATIONS
// ============================================================================

const TestsIllustration = () => (
  <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>
      <linearGradient id="cyanGrad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#0EA5E9" />
        <stop offset="100%" stopColor="#10B981" />
      </linearGradient>
    </defs>
    <rect x="20" y="20" width="70" height="80" rx="16" fill="url(#blueGrad)" fillOpacity="0.1" stroke="url(#blueGrad)" strokeWidth="2" />
    <motion.g initial={{ y: 0 }} animate={{ y: [-3, 3, -3] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
      {/* 🟢 FIXED: Removed the invalid shadow="xl" attribute here */}
      <rect x="30" y="30" width="60" height="60" rx="12" fill="white" />
      <rect x="30" y="30" width="60" height="60" rx="12" fill="url(#blueGrad)" fillOpacity="0.05" />
      <circle cx="45" cy="50" r="6" fill="url(#blueGrad)" />
      <path d="M43 50L44.5 51.5L47 48.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="58" y="48" width="22" height="4" rx="2" fill="#E2E8F0" />
      <circle cx="45" cy="68" r="6" fill="#E2E8F0" />
      <rect x="58" y="66" width="16" height="4" rx="2" fill="#E2E8F0" />
    </motion.g>
    <motion.circle cx="85" cy="25" r="8" fill="url(#cyanGrad)" initial={{ y: 0 }} animate={{ y: [4, -4, 4] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
    <motion.rect x="15" y="75" width="14" height="14" rx="4" fill="#3B82F6" fillOpacity="0.8" initial={{ rotate: 0 }} animate={{ rotate: [0, 15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
  </svg>
);

const AssessmentsIllustration = () => (
  <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#D946EF" />
      </linearGradient>
      <linearGradient id="pinkGrad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#EC4899" />
        <stop offset="100%" stopColor="#F43F5E" />
      </linearGradient>
    </defs>
    <rect x="35" y="15" width="55" height="75" rx="10" fill="url(#purpleGrad)" fillOpacity="0.2" transform="rotate(8 62 52)" />
    <rect x="25" y="20" width="55" height="75" rx="10" fill="url(#purpleGrad)" fillOpacity="0.4" transform="rotate(4 52 57)" />
    <motion.g initial={{ y: 0 }} animate={{ y: [-3, 3, -3] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
      <rect x="15" y="25" width="60" height="75" rx="10" fill="white" />
      <rect x="15" y="25" width="60" height="75" rx="10" fill="url(#purpleGrad)" fillOpacity="0.05" stroke="url(#purpleGrad)" strokeWidth="1" />
      <rect x="25" y="40" width="40" height="4" rx="2" fill="#E2E8F0" />
      <rect x="25" y="50" width="30" height="4" rx="2" fill="#E2E8F0" />
      <rect x="25" y="60" width="35" height="4" rx="2" fill="#E2E8F0" />
      <rect x="25" y="80" width="20" height="6" rx="3" fill="url(#purpleGrad)" fillOpacity="0.2" />
    </motion.g>
    <motion.path d="M95 55L98 62L105 63L100 68L101 75L95 72L89 75L90 68L85 63L92 62L95 55Z" fill="url(#pinkGrad)" initial={{ scale: 1, rotate: 0 }} animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
    <motion.circle cx="20" cy="30" r="5" fill="#A855F7" fillOpacity="0.8" initial={{ y: 0 }} animate={{ y: [3, -3, 3] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
  </svg>
);

// ============================================================================
// 🏛️ MAIN HUB PAGE
// ============================================================================

export default function LibraryHubPage() {
  const router = useRouter();
  const { lang } = useTeacherLanguage();

  const content = {
    uz: {
      title: "Mening Kutubxonam",
      subtitle: "Barcha yaratilgan testlar va imtihon materiallari shu yerda saqlanadi. Quyidagi bo'limlardan birini tanlang.",
      testsTitle: "Kundalik Testlar",
      testsDesc: "O'quvchilar onlayn tarzda ishlaydigan standart testlar, uy vazifalari va tezkor so'rovnomalar.",
      testsFeatures: ["Onlayn ishlash", "Avtomatik tekshirish", "Tahlil"],
      assessTitle: "Yaratilgan BSB va CHSB materiallar",
      assessDesc: "Rasmiy maktab standartlariga mos, qog'ozda chop etishga mo'ljallangan BSB va CHSB imtihonlari.",
      assessFeatures: ["Matritsa", "A4 PDF", "Javoblar kaliti"]
    },
    en: {
      title: "My Library",
      subtitle: "All your created tests and exam materials are stored here. Choose a section below to manage them.",
      testsTitle: "Daily Tests & Quizzes",
      testsDesc: "Manage standard multiple-choice tests, homework assignments, and quick online quizzes.",
      testsFeatures: ["Online execution", "Auto-grading", "Results analytics"],
      assessTitle: "Created BSB and CHSB materials",
      assessDesc: "Manage formal, printable exams (BSB/CHSB) designed for official school curriculums.",
      assessFeatures: ["Matrix system", "A4 PDF format", "Teacher answer keys"]
    },
    ru: {
      title: "Моя Библиотека",
      subtitle: "Здесь хранятся все созданные вами тесты и экзаменационные материалы. Выберите раздел ниже.",
      testsTitle: "Ежедневные тесты",
      testsDesc: "Управление стандартными тестами, домашними заданиями и быстрыми онлайн-опросами.",
      testsFeatures: ["Онлайн выполнение", "Автопроверка", "Аналитика результатов"],
      assessTitle: "Созданные материалы BSB и CHSB",
      assessDesc: "Официальные экзамены (BSB/CHSB) для распечатки на бумаге, соответствующие школьным стандартам.",
      assessFeatures: ["Матричная система", "Формат A4 PDF", "Ключи с ответами"]
    }
  };

  const t = content[lang as keyof typeof content] || content['uz'];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-24 selection:bg-indigo-100 selection:text-indigo-900 relative overflow-hidden">
      
      {/* GLOBAL BACKGROUND MESH (Very subtle) */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none" />

      {/* HEADER */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-[900px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/teacher/dashboard')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all">
              <ArrowLeft size={18} />
            </button>
            <div className="w-px h-5 bg-slate-200"></div>
            <h1 className="text-[16px] md:text-[18px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BookCopy size={18} className="text-indigo-600"/> {t.title}
            </h1>
          </div>
        </div>
      </div>

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 mt-12 relative z-10">
        
        {/* HERO TITLE */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <motion.h2 initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-3">
            {t.title}
          </motion.h2>
          <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }} className="text-[14px] sm:text-[15px] font-medium text-slate-500 leading-relaxed max-w-lg mx-auto">
            {t.subtitle}
          </motion.p>
        </div>

        {/* LIST OF CARDS (HORIZONTAL LAYOUT) */}
        <div className="flex flex-col gap-6">
          
          {/* ==================================================== */}
          {/* CARD 1: STANDARD TESTS (BLUE/CYAN)                   */}
          {/* ==================================================== */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            onClick={() => router.push('/teacher/library/tests')}
            className="group relative bg-white rounded-[2rem] p-5 sm:p-6 md:p-8 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(59,130,246,0.1)] hover:border-blue-300 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col md:flex-row items-center gap-6 md:gap-10"
          >
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-400/10 rounded-full blur-[80px] group-hover:bg-blue-400/20 transition-all duration-700 pointer-events-none" />
            
            {/* Left SVG Side */}
            <div className="w-full md:w-44 h-40 md:h-44 bg-slate-50/80 rounded-3xl border border-slate-100 flex items-center justify-center p-4 shrink-0 group-hover:bg-blue-50/80 transition-colors relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-slate-100/[0.04] bg-[size:20px_20px]" />
              <div className="w-28 h-28 relative z-10 transition-transform duration-500 group-hover:scale-110">
                <TestsIllustration />
              </div>
            </div>
            
            {/* Right Info Side */}
            <div className="flex-1 w-full relative z-10">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-[22px] font-black text-slate-900 group-hover:text-blue-600 transition-colors">{t.testsTitle}</h3>
                <div className="hidden sm:flex w-10 h-10 rounded-full bg-slate-50 items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                  <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform"/>
                </div>
              </div>
              <p className="text-[14.5px] text-slate-500 font-medium leading-relaxed mb-6">
                {t.testsDesc}
              </p>

              {/* Modern Pill Tags */}
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {t.testsFeatures.map((feature, i) => (
                  <span key={i} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3.5 py-1.5 rounded-lg text-[13px] font-bold border border-blue-100 shadow-sm">
                    <CheckCircle2 size={14} strokeWidth={2.5}/> {feature}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ==================================================== */}
          {/* CARD 2: BSB/CHSB ASSESSMENTS (PURPLE/PINK)             */}
          {/* ==================================================== */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            onClick={() => router.push('/teacher/library/assessments')}
            className="group relative bg-white rounded-[2rem] p-5 sm:p-6 md:p-8 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(168,85,247,0.1)] hover:border-purple-300 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col md:flex-row items-center gap-6 md:gap-10"
          >
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-400/10 rounded-full blur-[80px] group-hover:bg-purple-400/20 transition-all duration-700 pointer-events-none" />
            
            {/* Left SVG Side */}
            <div className="w-full md:w-44 h-40 md:h-44 bg-slate-50/80 rounded-3xl border border-slate-100 flex items-center justify-center p-4 shrink-0 group-hover:bg-purple-50/80 transition-colors relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-slate-100/[0.04] bg-[size:20px_20px]" />
              <div className="w-28 h-28 relative z-10 transition-transform duration-500 group-hover:scale-110">
                <AssessmentsIllustration />
              </div>
            </div>
            
            {/* Right Info Side */}
            <div className="flex-1 w-full relative z-10">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-[20px] font-black text-slate-900 group-hover:text-purple-600 transition-colors">{t.assessTitle}</h3>
                <div className="hidden sm:flex w-10 h-10 rounded-full bg-slate-50 items-center justify-center text-slate-400 group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-sm">
                  <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform"/>
                </div>
              </div>
              <p className="text-[14.5px] text-slate-500 font-medium leading-relaxed mb-6">
                {t.assessDesc}
              </p>

              {/* Modern Pill Tags */}
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {t.assessFeatures.map((feature, i) => (
                  <span key={i} className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3.5 py-1.5 rounded-lg text-[13px] font-bold border border-purple-100 shadow-sm">
                    {i === 1 ? <Printer size={14} strokeWidth={2.5}/> : i === 0 ? <Layers size={14} strokeWidth={2.5}/> : <Sparkles size={14} strokeWidth={2.5}/>}
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
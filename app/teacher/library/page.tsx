"use client";

import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { ArrowRight, CheckCircle2, Layers, Printer, Sparkles, FileText, CheckSquare, Zap, BookCopy } from "lucide-react";
import { useTeacherLanguage } from "@/app/teacher/layout";

// ============================================================================
// 🎨 PREMIUM DYNAMIC SVG ILLUSTRATION (Organic Floating Blobs)
// ============================================================================
const CardIllustration = ({ theme }: { theme: string }) => {
  const baseColor = theme.split('-')[1]; 
  
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity duration-700">
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id={`grad1-${baseColor}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <motion.circle cx="160" cy="160" r="80" fill={`url(#grad1-${baseColor})`} className={`text-${baseColor}-500`}
          animate={{ x: [-20, 10, -20], y: [-10, 20, -10], scale: [1, 1.1, 1] }} 
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} 
        />
        <motion.circle cx="40" cy="180" r="60" fill={`url(#grad1-${baseColor})`} className={`text-${baseColor}-500`}
          animate={{ x: [10, -15, 10], y: [15, -10, 15], scale: [1, 1.2, 1] }} 
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} 
        />
        <motion.rect x="150" y="30" width="40" height="40" rx="10" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" className={`text-${baseColor}-500`} transform="rotate(15 170 50)"
          animate={{ rotate: [15, 45, 15] }} 
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
};

// ============================================================================
// 🌐 TRANSLATION DICTIONARY
// ============================================================================
const LIBRARY_TRANSLATIONS: Record<string, any> = {
  uz: {
    heroBadge: "Arxiv", title: "Mening Kutubxonam", subtitle: "Barcha yaratilgan testlar va imtihon materiallari shu yerda saqlanadi.",
    tests: {
      badge: "Onlayn", title: "Kundalik Testlar", desc: "O'quvchilar onlayn tarzda ishlaydigan standart testlar, uy vazifalari va tezkor so'rovnomalar.",
      features: ["Onlayn ishlash", "Avtomatik tekshirish", "Tahlil"], btn: "Ochish"
    },
    assess: {
      badge: "Qog'oz", title: "BSB va CHSB", desc: "Rasmiy maktab standartlariga mos, qog'ozda chop etishga mo'ljallangan BSB va CHSB imtihonlari.",
      features: ["Matritsa", "A4 PDF", "Javoblar kaliti"], btn: "Ochish"
    }
  },
  en: {
    heroBadge: "Archive", title: "My Library", subtitle: "All your created tests and exam materials are stored securely here.",
    tests: {
      badge: "Online", title: "Daily Tests & Quizzes", desc: "Manage standard multiple-choice tests, homework assignments, and quick online quizzes.",
      features: ["Online execution", "Auto-grading", "Analytics"], btn: "Open"
    },
    assess: {
      badge: "Paper", title: "BSB & CHSB Exams", desc: "Manage formal, printable exams designed for official school curriculums.",
      features: ["Matrix system", "A4 PDF Format", "Answer Keys"], btn: "Open"
    }
  },
  ru: {
    heroBadge: "Архив", title: "Моя Библиотека", subtitle: "Здесь надежно хранятся все созданные вами тесты и материалы.",
    tests: {
      badge: "Онлайн", title: "Ежедневные тесты", desc: "Управление тестами, домашними заданиями и быстрыми онлайн-опросами.",
      features: ["Онлайн выполнение", "Автопроверка", "Аналитика"], btn: "Открыть"
    },
    assess: {
      badge: "Бумага", title: "Экзамены BSB и CHSB", desc: "Официальные экзамены для распечатки, соответствующие школьным стандартам.",
      features: ["Матричная система", "Формат A4 PDF", "Ключи ответов"], btn: "Открыть"
    }
  }
};

// --- THEME ENGINE ---
const THEMES = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'group-hover:bg-blue-600', border: 'hover:border-blue-300', shadow: 'hover:shadow-blue-500/20' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'group-hover:bg-purple-600', border: 'hover:border-purple-300', shadow: 'hover:shadow-purple-500/20' },
};

// --- ANIMATION VARIANTS ---
const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const cardVariants: Variants = { 
  hidden: { opacity: 0, y: 15, scale: 0.98 }, 
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } },
  hover: { y: -4, transition: { duration: 0.2 } },
  tap: { scale: 0.97 }
};

// ============================================================================
// 🏛️ MAIN PAGE COMPONENT
// ============================================================================
export default function LibraryHubPage() {
  const router = useRouter();
  const { lang } = useTeacherLanguage();
  const t = LIBRARY_TRANSLATIONS[lang] || LIBRARY_TRANSLATIONS['uz'];

  // --- DATA STRUCTURE ---
  const LIBRARY_CARDS = [
    { id: 'tests', icon: CheckSquare, theme: 'blue', href: '/teacher/library/tests', data: t.tests },
    { id: 'assessments', icon: FileText, theme: 'purple', href: '/teacher/library/assessments', data: t.assess },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans relative overflow-hidden pb-[100px] selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* 🟢 AMBIENT BACKGROUND GLOWS */}
      <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-slate-100 to-transparent pointer-events-none z-0"></div>
      <div className="absolute -left-[20%] top-[-10%] w-[70vw] h-[50vh] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute -right-[20%] top-[10%] w-[70vw] h-[50vh] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      
      <div className="flex-1 flex flex-col items-center w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 relative z-10 pt-8 md:pt-12">
        
        {/* --- HERO SECTION --- */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10 md:mb-14 max-w-2xl flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200/80 text-slate-700 font-bold text-[10px] md:text-[12px] uppercase tracking-widest mb-4 shadow-sm">
            <BookCopy size={14} className="text-indigo-500" /> {t.heroBadge}
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-3 leading-tight">{t.title}</h1>
          <p className="text-slate-500 text-[14px] md:text-[16px] font-medium leading-relaxed px-4">{t.subtitle}</p>
        </motion.div>

        {/* --- DYNAMIC CARDS GRID --- */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 max-w-4xl">
          {LIBRARY_CARDS.map((item) => {
            const theme = THEMES[item.theme as keyof typeof THEMES];
            return (
              <motion.div 
                key={item.id} variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push(item.href)} 
                className={`group relative bg-white rounded-3xl md:rounded-[2rem] p-5 md:p-8 border border-slate-200/80 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col ${theme.border} hover:shadow-2xl ${theme.shadow}`}
              >
                <CardIllustration theme={item.theme} />
                
                {/* Header: Icon & Badge */}
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm border border-slate-100 group-hover:text-white group-hover:scale-110 group-hover:rotate-3 shrink-0 ${theme.bg} ${theme.text} ${theme.iconBg}`}>
                    <item.icon size={28} strokeWidth={2.5} className="md:w-8 md:h-8" />
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1.5 rounded-lg border uppercase tracking-widest bg-white shadow-sm ${theme.text} border-${item.theme}-200`}>{item.data.badge}</span>
                </div>

                {/* Text Content */}
                <div className="relative z-10 flex-1">
                  <h2 className={`text-[20px] md:text-[22px] font-black text-slate-900 group-hover:${theme.text} transition-colors leading-tight mb-2 md:mb-3`}>{item.data.title}</h2>
                  <p className="text-[13px] md:text-[15px] text-slate-500 font-medium leading-relaxed mb-6 md:mb-8 line-clamp-3">{item.data.desc}</p>
                  
                  {/* Pills */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {item.data.features.map((feature: string, i: number) => (
                      <span key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] md:text-[12px] font-bold border shadow-sm bg-white ${theme.text} border-${item.theme}-200`}>
                        {i === 0 ? <CheckCircle2 size={14}/> : i === 1 ? <Layers size={14}/> : <Sparkles size={14}/>} {feature}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Bottom Action */}
                <div className={`flex items-center justify-between mt-auto pt-4 border-t border-slate-100 relative z-10 transition-colors group-hover:border-${item.theme}-100`}>
                  <span className={`text-[14px] font-black transition-colors ${theme.text}`}>{item.data.btn}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm bg-white border border-slate-200 group-hover:bg-${item.theme}-600 group-hover:text-white group-hover:border-transparent ${theme.text}`}>
                    <ArrowRight size={16} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </div>
  );
}
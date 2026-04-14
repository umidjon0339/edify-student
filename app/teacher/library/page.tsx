"use client";

import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { ArrowRight, CheckCircle2, Layers, Sparkles, FileText, CheckSquare, BookCopy, Database } from "lucide-react";
import { useTeacherLanguage } from "@/app/teacher/layout";

// ============================================================================
// 🎨 PREMIUM DYNAMIC SVG ILLUSTRATION (Organic Floating Blobs)
// ============================================================================
const CardIllustration = ({ colorClass }: { colorClass: string }) => {
  return (
    <div className={`absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity duration-700 ${colorClass}`}>
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grad1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <motion.circle cx="160" cy="160" r="80" fill="url(#grad1)" 
          animate={{ x: [-20, 10, -20], y: [-10, 20, -10], scale: [1, 1.1, 1] }} 
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} 
        />
        <motion.circle cx="40" cy="180" r="60" fill="url(#grad1)" 
          animate={{ x: [10, -15, 10], y: [15, -10, 15], scale: [1, 1.2, 1] }} 
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} 
        />
        <motion.rect x="150" y="30" width="40" height="40" rx="10" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" transform="rotate(15 170 50)"
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
    heroBadge: "Arxiv va Baza", 
    title: "Mening Kutubxonam", 
    subtitle: "Barcha yaratilgan testlar, qog'oz imtihonlar va shaxsiy savollar bazangizni shu yerdan boshqaring.",
    tests: {
      badge: "Onlayn", title: "Kundalik Testlar", desc: "O'quvchilar onlayn tarzda ishlaydigan standart testlar, uy vazifalari va tezkor so'rovnomalar.",
      features: ["Onlayn ishlash", "Avtomatik tekshirish"], btn: "Ochish"
    },
    assess: {
      badge: "Qog'oz", title: "BSB va CHSB", desc: "Rasmiy maktab standartlariga mos, qog'ozda chop etishga mo'ljallangan BSB va CHSB imtihonlari.",
      features: ["A4 PDF Format", "Javoblar kaliti"], btn: "Ochish"
    },
    bank: {
      badge: "Baza", title: "Mening savollarim", desc: "O'zingiz yaratgan, AI orqali tuzilgan barcha savollar to'plami. Ularni tanlab yangi testlar yarating.",
      features: ["Cheksiz sig'im", "Tezkor qidiruv"], btn: "Ochish"
    }
  },
  en: {
    heroBadge: "Archive & Bank", 
    title: "My Library", 
    subtitle: "Manage all your online tests, printable exams, and your personal question bank here.",
    tests: {
      badge: "Online", title: "Daily Tests & Quizzes", desc: "Manage standard multiple-choice tests, homework assignments, and quick online quizzes.",
      features: ["Online execution", "Auto-grading"], btn: "Open"
    },
    assess: {
      badge: "Paper", title: "BSB & CHSB Exams", desc: "Manage formal, printable exams designed for official school curriculums.",
      features: ["A4 PDF Format", "Answer Keys"], btn: "Open"
    },
    bank: {
      badge: "Bank", title: "My Questions", desc: "Your personal collection of AI-generated and manual questions. Select them to build new tests.",
      features: ["Infinite Capacity", "Fast Search"], btn: "Open"
    }
  },
  ru: {
    heroBadge: "Архив и База", 
    title: "Моя Библиотека", 
    subtitle: "Управляйте всеми онлайн-тестами, печатными экзаменами и вашей личной базой вопросов здесь.",
    tests: {
      badge: "Онлайн", title: "Ежедневные тесты", desc: "Управление тестами, домашними заданиями и быстрыми онлайн-опросами.",
      features: ["Онлайн выполнение", "Автопроверка"], btn: "Открыть"
    },
    assess: {
      badge: "Бумага", title: "Экзамены BSB и CHSB", desc: "Официальные экзамены для распечатки, соответствующие школьным стандартам.",
      features: ["Формат A4 PDF", "Ключи ответов"], btn: "Открыть"
    },
    bank: {
      badge: "База", title: "Моя База Вопросов", desc: "Ваша личная коллекция вопросов, созданных ИИ и добавленных вручную. Создавайте новые тесты из них.",
      features: ["Бесконечная емкость", "Быстрый поиск"], btn: "Открыть"
    }
  }
};

// --- TAILWIND SAFE THEME ENGINE ---
const THEMES = {
  blue: { 
    bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'group-hover:bg-blue-600', 
    border: 'border-blue-200', hoverBorder: 'hover:border-blue-300', shadow: 'hover:shadow-blue-500/20' 
  },
  purple: { 
    bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'group-hover:bg-purple-600', 
    border: 'border-purple-200', hoverBorder: 'hover:border-purple-300', shadow: 'hover:shadow-purple-500/20' 
  },
  emerald: { 
    bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'group-hover:bg-emerald-600', 
    border: 'border-emerald-200', hoverBorder: 'hover:border-emerald-300', shadow: 'hover:shadow-emerald-500/20' 
  },
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

  // --- DATA STRUCTURE (Now 3 Pillars) ---
  const LIBRARY_CARDS = [
    { id: 'tests', icon: CheckSquare, theme: 'blue', href: '/teacher/library/tests', data: t.tests },
    { id: 'assessments', icon: FileText, theme: 'purple', href: '/teacher/library/assessments', data: t.assess },
    { id: 'bank', icon: Database, theme: 'emerald', href: '/teacher/create/my_questions', data: t.bank }, // 🟢 NEW QUESTION BANK ROUTE
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans relative overflow-hidden pb-[100px] selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* 🟢 AMBIENT BACKGROUND GLOWS */}
      <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-slate-100 to-transparent pointer-events-none z-0"></div>
      <div className="absolute -left-[20%] top-[-10%] w-[70vw] h-[50vh] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute -right-[20%] top-[10%] w-[70vw] h-[50vh] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      
      <div className="flex-1 flex flex-col items-center w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 relative z-10 pt-8 md:pt-12">
        
        {/* --- HERO SECTION --- */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10 md:mb-14 max-w-2xl flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200/80 text-slate-700 font-bold text-[10px] md:text-[11px] uppercase tracking-widest mb-4 shadow-sm">
            <BookCopy size={14} className="text-indigo-500" /> {t.heroBadge}
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight mb-3 leading-tight">{t.title}</h1>
          <p className="text-slate-500 text-[13px] md:text-[15px] font-medium leading-relaxed px-4">{t.subtitle}</p>
        </motion.div>

        {/* --- DYNAMIC CARDS GRID (3 Columns) --- */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
          {LIBRARY_CARDS.map((item) => {
            const theme = THEMES[item.theme as keyof typeof THEMES];
            return (
              <motion.div 
                key={item.id} variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push(item.href)} 
                className={`group relative bg-white rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 border border-slate-200/80 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col ${theme.hoverBorder} hover:shadow-2xl ${theme.shadow}`}
              >
                <CardIllustration colorClass={theme.text} />
                
                {/* Header: Icon & Badge */}
                <div className="flex justify-between items-start mb-5 md:mb-6 relative z-10">
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm border border-slate-100 group-hover:text-white group-hover:scale-110 group-hover:rotate-3 shrink-0 ${theme.bg} ${theme.text} ${theme.iconBg}`}>
                    <item.icon size={24} strokeWidth={2.5} className="md:w-7 md:h-7" />
                  </div>
                  <span className={`text-[9px] md:text-[10px] font-black px-2.5 py-1.5 rounded-md border uppercase tracking-widest bg-white shadow-sm ${theme.text} ${theme.border}`}>{item.data.badge}</span>
                </div>

                {/* Text Content */}
                <div className="relative z-10 flex-1">
                  <h2 className={`text-[18px] md:text-[20px] font-black text-slate-900 group-hover:${theme.text} transition-colors leading-tight mb-2 md:mb-3`}>{item.data.title}</h2>
                  <p className="text-[12px] md:text-[14px] text-slate-500 font-medium leading-relaxed mb-5 md:mb-6 line-clamp-3">{item.data.desc}</p>
                  
                  {/* Features Pills */}
                  <div className="flex flex-wrap gap-1.5 md:gap-2 mb-5 md:mb-6">
                    {item.data.features.map((feature: string, i: number) => (
                      <span key={i} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] md:text-[11px] font-bold border shadow-sm bg-white ${theme.text} ${theme.border}`}>
                        {i === 0 ? <CheckCircle2 size={12}/> : <Sparkles size={12}/>} {feature}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Bottom Action */}
                <div className={`flex items-center justify-between mt-auto pt-4 border-t border-slate-100 relative z-10 transition-colors group-hover:border-transparent`}>
                  <span className={`text-[12px] md:text-[13px] font-black transition-colors ${theme.text}`}>{item.data.btn}</span>
                  <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-colors shadow-sm bg-white border border-slate-200 group-hover:bg-transparent group-hover:text-white group-hover:border-transparent ${theme.text}`}>
                    <ArrowRight size={14} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform md:w-4 md:h-4" />
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
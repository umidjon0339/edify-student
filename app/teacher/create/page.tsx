"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Bot, PenTool, Image as ImageIcon, School, Award, GraduationCap, Zap, FileText } from "lucide-react";
import { useTeacherLanguage } from "@/app/teacher/layout"; 
import { motion, Variants } from "framer-motion";

// ============================================================================
// 🎨 PREMIUM LAYERED SVG ILLUSTRATION FOR CARDS
// ============================================================================
const CardIllustration = ({ colorClass }: { colorClass: string }) => (
  <svg viewBox="0 0 100 100" className={`w-full h-full drop-shadow-md opacity-40 group-hover:opacity-100 transition-all duration-500 ${colorClass}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <motion.circle cx="50" cy="50" r="38" fill="currentColor" fillOpacity="0.05" initial={{ scale: 0.9 }} animate={{ scale: [0.9, 1.05, 0.9] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
    <motion.g initial={{ y: 0 }} animate={{ y: [-4, 4, -4] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
      <rect x="30" y="20" width="45" height="45" rx="12" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" transform="rotate(12 55 45)" />
      <rect x="20" y="35" width="45" height="45" rx="12" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" />
      <path d="M30 50 H55 M30 60 H45" stroke="currentColor" strokeOpacity="0.8" strokeWidth="3" strokeLinecap="round" />
    </motion.g>
    <motion.circle cx="80" cy="75" r="8" fill="currentColor" fillOpacity="0.6" initial={{ y: 0, opacity: 0.5 }} animate={{ y: [5, -5, 5], opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
    <motion.path d="M75 20 L76.5 25.5 L82 27 L76.5 28.5 L75 34 L73.5 28.5 L68 27 L73.5 25.5 Z" fill="currentColor" fillOpacity="0.8" initial={{ scale: 0.8, rotate: 0 }} animate={{ scale: [0.8, 1.2, 0.8], rotate: [0, 90, 180] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
  </svg>
);

// ============================================================================
// 🌐 TRANSLATION DICTIONARY (PUNCHY, ACTION-ORIENTED COPY)
// ============================================================================
const HUB_TRANSLATIONS: Record<string, any> = {
  uz: {
    heroBadge: "Studiya 2.0 ✨", title: "Test Yaratish Markazi", subtitle: "Maqsadingizga qarab, eng tezkor usulni tanlang.",
    section1: "Ta'lim Dasturlari", section2: "AI va Maxsus Vositalar",
    
    bsb: { badge: "Rasmiy", title: "BSB va CHSB", desc: "Matritsa asosida rasmiy chorak imtihonlarini avtomatik yarating.", btn: "Boshlash" },
    maktab: { badge: "Kundalik", title: "Maktab Dasturi", desc: "Darsliklar asosida tezkor so'rovlar va uy vazifalarini tuzing.", btn: "Boshlash" },
    ixtisos: { badge: "Mantiq", title: "Ixtisoslashtirilgan", desc: "Iqtidorli o'quvchilar uchun qiyinlashtirilgan, mantiqiy masalalar.", btn: "Boshlash" },
    abiturient: { badge: "DTM", title: "Abituriyent (Blok)", desc: "Oliy ta'limga kirish imtihonlari formatidagi 5 fanli blok testlar.", btn: "Boshlash" },
    
    aiImage: { badge: "Skaner 📸", title: "Rasm Orqali", desc: "Eski testni rasmga oling. AI uni o'qib, yangi variantlarini tuzadi.", btn: "Yuklash" },
    aiPrompt: { badge: "Avtomat", title: "AI Maxsus Buyruq", desc: "Test mavzusini so'z bilan yozing, AI qolganini o'zi bajaradi.", btn: "Yozish" },
    custom: { badge: "Qo'l Mehnati", title: "Oq Qog'oz", desc: "Matematik klaviatura yordamida o'z savollaringizni noldan yozing.", btn: "Ochish" },
  },
  en: {
    heroBadge: "Studio 2.0 ✨", title: "Test Creation Hub", subtitle: "Select the fastest workflow for your teaching goals.",
    section1: "Curriculum Standards", section2: "AI & Manual Tools",
    
    bsb: { badge: "Official", title: "BSB & CHSB", desc: "Instantly generate matrix-based, official term exam papers.", btn: "Start" },
    maktab: { badge: "Daily", title: "Public School", desc: "Create quick quizzes and homework based on standard textbooks.", btn: "Start" },
    ixtisos: { badge: "Logic", title: "Specialized Track", desc: "Generate multi-step, Olympiad-level logic problems.", btn: "Start" },
    abiturient: { badge: "University", title: "Entrance Exams", desc: "Build highly competitive subject blocks formatted for DTM.", btn: "Start" },
    
    aiImage: { badge: "Scanner 📸", title: "Create via Image", desc: "Snap a photo of an old test. AI will generate brand new variants.", btn: "Upload" },
    aiPrompt: { badge: "Auto", title: "AI Text Command", desc: "Just describe your topic. The AI builds the entire test for you.", btn: "Write" },
    custom: { badge: "Manual", title: "Blank Canvas", desc: "Write questions from scratch using our built-in math keyboard.", btn: "Open" },
  },
  ru: {
    heroBadge: "Студия 2.0 ✨", title: "Центр Создания Тестов", subtitle: "Выберите самый быстрый способ для ваших целей.",
    section1: "Учебные Программы", section2: "ИИ и Инструменты",
    
    bsb: { badge: "Официально", title: "Генератор BSB / CHSB", desc: "Автоматическое создание четвертных экзаменов по матрице.", btn: "Начать" },
    maktab: { badge: "Ежедневно", title: "Школьная программа", desc: "Быстрые тесты и домашки на основе стандартных учебников.", btn: "Начать" },
    ixtisos: { badge: "Логика", title: "Спец. школы", desc: "Сложные, многоэтапные логические задачи для одаренных детей.", btn: "Начать" },
    abiturient: { badge: "Поступление", title: "Подготовка в ВУЗ", desc: "Блоки по 5 предметам в формате вступительных экзаменов DTM.", btn: "Начать" },
    
    aiImage: { badge: "Сканер 📸", title: "Создать по фото", desc: "Сфотографируйте старый тест. ИИ создаст его новые аналоги.", btn: "Загрузить" },
    aiPrompt: { badge: "Автомат", title: "AI Свой Запрос", desc: "Просто опишите тему. ИИ сам составит готовый тест.", btn: "Написать" },
    custom: { badge: "Вручную", title: "Чистый Лист", desc: "Создавайте тесты с нуля, используя математическую клавиатуру.", btn: "Открыть" },
  }
};

// --- ANIMATION VARIANTS ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0.4, duration: 0.6 } },
  hover: { y: -6, transition: { duration: 0.2 } },
  tap: { scale: 0.96 }
};

// ============================================================================
// 🏛️ MAIN PAGE COMPONENT
// ============================================================================
export default function CreateHubPage() {
  const router = useRouter();
  const { lang } = useTeacherLanguage();
  const t = HUB_TRANSLATIONS[lang] || HUB_TRANSLATIONS['uz'];

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans relative overflow-hidden pb-24 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* 🟢 AMBIENT BACKGROUND GLOWS (Vercel Style) */}
      <div className="absolute top-0 inset-x-0 h-[60vh] bg-gradient-to-b from-slate-100 to-transparent pointer-events-none z-0"></div>
      <div className="absolute -left-[20%] top-[-10%] w-[70vw] h-[50vh] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute -right-[20%] top-[10%] w-[70vw] h-[50vh] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <div className="flex-1 flex flex-col items-center w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 relative z-10 pt-12 md:pt-16">
        
        {/* --- HERO SECTION --- */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="text-center mb-16 max-w-2xl flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200/80 text-slate-700 font-bold text-[12px] uppercase tracking-widest mb-6 shadow-sm">
            <Zap size={14} className="fill-amber-400 text-amber-500" /> {t.heroBadge}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-5 leading-tight">
            {t.title}
          </h1>
          <p className="text-slate-500 text-[16px] md:text-[18px] font-medium leading-relaxed">
            {t.subtitle}
          </p>
        </motion.div>

        {/* ================= SECTION 1: CURRICULUMS ================= */}
        <div className="w-full mb-16">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-px flex-1 max-w-[100px] bg-gradient-to-r from-transparent to-slate-300"></div>
            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest text-center">{t.section1}</h3>
            <div className="h-px flex-1 max-w-[100px] bg-gradient-to-l from-transparent to-slate-300"></div>
          </div>
          
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* 1. BSB/CHSB (Purple Glow) */}
            <motion.div variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/bsb-chsb')} className="group relative bg-white hover:bg-gradient-to-b hover:from-white hover:to-purple-50/50 rounded-[2rem] p-6 border border-slate-200/80 hover:border-purple-300 hover:shadow-[0_20px_40px_-15px_rgba(168,85,247,0.2)] transition-all duration-500 cursor-pointer overflow-hidden flex flex-col h-full">
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-purple-600 group-hover:border-purple-500 group-hover:text-white transition-all duration-500 shadow-sm group-hover:scale-110 shrink-0">
                  <FileText size={22} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md uppercase tracking-wider border border-purple-100">{t.bsb.badge}</span>
              </div>
              <h2 className="text-[18px] font-black text-slate-900 mb-2.5 group-hover:text-purple-700 transition-colors leading-tight relative z-10">{t.bsb.title}</h2>
              <p className="text-[14px] text-slate-500 mb-8 font-medium leading-relaxed relative z-10">{t.bsb.desc}</p>
              <div className="mt-auto inline-flex items-center gap-2 text-slate-400 group-hover:text-purple-600 text-[14px] font-bold transition-colors relative z-10">
                <span className="group-hover:mr-1 transition-all duration-300">{t.bsb.btn}</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300"/>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 pointer-events-none"><CardIllustration colorClass="text-purple-500" /></div>
            </motion.div>

            {/* 2. MAKTAB (Blue Glow) */}
            <motion.div variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/maktab')} className="group relative bg-white hover:bg-gradient-to-b hover:from-white hover:to-blue-50/50 rounded-[2rem] p-6 border border-slate-200/80 hover:border-blue-300 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.2)] transition-all duration-500 cursor-pointer overflow-hidden flex flex-col h-full">
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-500 group-hover:text-white transition-all duration-500 shadow-sm group-hover:scale-110 shrink-0">
                  <School size={22} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wider border border-blue-100">{t.maktab.badge}</span>
              </div>
              <h2 className="text-[18px] font-black text-slate-900 mb-2.5 group-hover:text-blue-700 transition-colors leading-tight relative z-10">{t.maktab.title}</h2>
              <p className="text-[14px] text-slate-500 mb-8 font-medium leading-relaxed relative z-10">{t.maktab.desc}</p>
              <div className="mt-auto inline-flex items-center gap-2 text-slate-400 group-hover:text-blue-600 text-[14px] font-bold transition-colors relative z-10">
                <span className="group-hover:mr-1 transition-all duration-300">{t.maktab.btn}</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300"/>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 pointer-events-none"><CardIllustration colorClass="text-blue-500" /></div>
            </motion.div>

            {/* 3. IXTISOS (Amber Glow) */}
            <motion.div variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/ixtisoslashtirilgan_maktab')} className="group relative bg-white hover:bg-gradient-to-b hover:from-white hover:to-amber-50/50 rounded-[2rem] p-6 border border-slate-200/80 hover:border-amber-300 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.2)] transition-all duration-500 cursor-pointer overflow-hidden flex flex-col h-full">
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-amber-500 group-hover:border-amber-400 group-hover:text-white transition-all duration-500 shadow-sm group-hover:scale-110 shrink-0">
                  <Award size={22} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md uppercase tracking-wider border border-amber-100">{t.ixtisos.badge}</span>
              </div>
              <h2 className="text-[18px] font-black text-slate-900 mb-2.5 group-hover:text-amber-600 transition-colors leading-tight relative z-10">{t.ixtisos.title}</h2>
              <p className="text-[14px] text-slate-500 mb-8 font-medium leading-relaxed relative z-10">{t.ixtisos.desc}</p>
              <div className="mt-auto inline-flex items-center gap-2 text-slate-400 group-hover:text-amber-600 text-[14px] font-bold transition-colors relative z-10">
                <span className="group-hover:mr-1 transition-all duration-300">{t.ixtisos.btn}</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300"/>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 pointer-events-none"><CardIllustration colorClass="text-amber-500" /></div>
            </motion.div>

            {/* 4. ABITURIENT (Emerald Glow) */}
            <motion.div variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/abiturient')} className="group relative bg-white hover:bg-gradient-to-b hover:from-white hover:to-emerald-50/50 rounded-[2rem] p-6 border border-slate-200/80 hover:border-emerald-300 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.2)] transition-all duration-500 cursor-pointer overflow-hidden flex flex-col h-full">
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:border-emerald-500 group-hover:text-white transition-all duration-500 shadow-sm group-hover:scale-110 shrink-0">
                  <GraduationCap size={22} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-100">{t.abiturient.badge}</span>
              </div>
              <h2 className="text-[18px] font-black text-slate-900 mb-2.5 group-hover:text-emerald-700 transition-colors leading-tight relative z-10">{t.abiturient.title}</h2>
              <p className="text-[14px] text-slate-500 mb-8 font-medium leading-relaxed relative z-10">{t.abiturient.desc}</p>
              <div className="mt-auto inline-flex items-center gap-2 text-slate-400 group-hover:text-emerald-600 text-[14px] font-bold transition-colors relative z-10">
                <span className="group-hover:mr-1 transition-all duration-300">{t.abiturient.btn}</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300"/>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 pointer-events-none"><CardIllustration colorClass="text-emerald-500" /></div>
            </motion.div>

          </motion.div>
        </div>

        {/* ================= SECTION 2: ADVANCED TOOLS ================= */}
        <div className="w-full">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-px flex-1 max-w-[100px] bg-gradient-to-r from-transparent to-slate-300"></div>
            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest text-center">{t.section2}</h3>
            <div className="h-px flex-1 max-w-[100px] bg-gradient-to-l from-transparent to-slate-300"></div>
          </div>
          
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 5. IMAGE AI (Rose) */}
            <motion.div variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/by_image')} className="group relative bg-white hover:bg-gradient-to-b hover:from-white hover:to-rose-50/50 rounded-[2rem] p-6 border border-slate-200/80 hover:border-rose-300 hover:shadow-[0_20px_40px_-15px_rgba(244,63,94,0.2)] transition-all duration-500 cursor-pointer overflow-hidden flex flex-col h-full">
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-rose-500 group-hover:border-rose-400 group-hover:text-white transition-all duration-500 shadow-sm group-hover:scale-110 shrink-0">
                  <ImageIcon size={22} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md uppercase tracking-wider border border-rose-100">{t.aiImage.badge}</span>
              </div>
              <h2 className="text-[18px] font-black text-slate-900 mb-2.5 group-hover:text-rose-600 transition-colors leading-tight relative z-10">{t.aiImage.title}</h2>
              <p className="text-[14px] text-slate-500 mb-8 font-medium leading-relaxed relative z-10">{t.aiImage.desc}</p>
              <div className="mt-auto inline-flex items-center gap-2 text-slate-400 group-hover:text-rose-500 text-[14px] font-bold transition-colors relative z-10">
                <span className="group-hover:mr-1 transition-all duration-300">{t.aiImage.btn}</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300"/>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 pointer-events-none"><CardIllustration colorClass="text-rose-500" /></div>
            </motion.div>

            {/* 6. PROMPT AI (Violet) */}
            <motion.div variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/by_user_input')} className="group relative bg-white hover:bg-gradient-to-b hover:from-white hover:to-violet-50/50 rounded-[2rem] p-6 border border-slate-200/80 hover:border-violet-300 hover:shadow-[0_20px_40px_-15px_rgba(139,92,246,0.2)] transition-all duration-500 cursor-pointer overflow-hidden flex flex-col h-full">
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-violet-600 group-hover:border-violet-500 group-hover:text-white transition-all duration-500 shadow-sm group-hover:scale-110 shrink-0">
                  <Bot size={22} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black text-violet-600 bg-violet-50 px-2.5 py-1 rounded-md uppercase tracking-wider border border-violet-100">{t.aiPrompt.badge}</span>
              </div>
              <h2 className="text-[18px] font-black text-slate-900 mb-2.5 group-hover:text-violet-700 transition-colors leading-tight relative z-10">{t.aiPrompt.title}</h2>
              <p className="text-[14px] text-slate-500 mb-8 font-medium leading-relaxed relative z-10">{t.aiPrompt.desc}</p>
              <div className="mt-auto inline-flex items-center gap-2 text-slate-400 group-hover:text-violet-600 text-[14px] font-bold transition-colors relative z-10">
                <span className="group-hover:mr-1 transition-all duration-300">{t.aiPrompt.btn}</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300"/>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 pointer-events-none"><CardIllustration colorClass="text-violet-500" /></div>
            </motion.div>

            {/* 7. CUSTOM STUDIO (Teal) */}
            <motion.div variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/custom')} className="group relative bg-white hover:bg-gradient-to-b hover:from-white hover:to-teal-50/50 rounded-[2rem] p-6 border border-slate-200/80 hover:border-teal-300 hover:shadow-[0_20px_40px_-15px_rgba(20,184,166,0.2)] transition-all duration-500 cursor-pointer overflow-hidden flex flex-col h-full">
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-teal-500 group-hover:border-teal-400 group-hover:text-white transition-all duration-500 shadow-sm group-hover:scale-110 shrink-0">
                  <PenTool size={22} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md uppercase tracking-wider border border-teal-100">{t.custom.badge}</span>
              </div>
              <h2 className="text-[18px] font-black text-slate-900 mb-2.5 group-hover:text-teal-600 transition-colors leading-tight relative z-10">{t.custom.title}</h2>
              <p className="text-[14px] text-slate-500 mb-8 font-medium leading-relaxed relative z-10">{t.custom.desc}</p>
              <div className="mt-auto inline-flex items-center gap-2 text-slate-400 group-hover:text-teal-600 text-[14px] font-bold transition-colors relative z-10">
                <span className="group-hover:mr-1 transition-all duration-300">{t.custom.btn}</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300"/>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 pointer-events-none"><CardIllustration colorClass="text-teal-500" /></div>
            </motion.div>

          </motion.div>
        </div>

      </div>
    </div>
  );
}
"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Bot, PenTool, Image as ImageIcon, School, Award, GraduationCap, Zap, FileText } from "lucide-react";
import { useTeacherLanguage } from "@/app/teacher/layout"; 
import { motion, Variants } from "framer-motion";

// ============================================================================
// 🎨 PREMIUM LAYERED SVG ILLUSTRATION FOR CARDS
// ============================================================================
const CardIllustration = ({ colorClass }: { colorClass: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={`w-full h-full drop-shadow-sm opacity-80 group-hover:opacity-100 transition-all duration-500 ${colorClass}`} 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* 1. Background Breathing Pulse */}
    <motion.circle 
      cx="50" cy="50" r="35" 
      fill="currentColor" fillOpacity="0.04" 
      initial={{ scale: 0.85 }} 
      animate={{ scale: [0.85, 1.05, 0.85] }} 
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} 
    />
    
    {/* 2. Floating Stacked Cards / Layers */}
    <motion.g 
      initial={{ y: 0 }} 
      animate={{ y: [-3, 3, -3] }} 
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Back Layer (Tilted) */}
      <rect 
        x="35" y="25" width="40" height="40" rx="10" 
        fill="currentColor" fillOpacity="0.05" 
        stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" 
        transform="rotate(10 55 45)" 
      />
      {/* Front Layer (Glass) */}
      <rect 
        x="25" y="35" width="40" height="40" rx="10" 
        fill="currentColor" fillOpacity="0.12" 
        stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" 
      />
      
      {/* Inner UI Lines (Representing text/data) */}
      <path 
        d="M35 48 H55 M35 56 H45" 
        stroke="currentColor" strokeOpacity="0.6" strokeWidth="2.5" strokeLinecap="round" 
      />
    </motion.g>

    {/* 3. Orbiting Data Node (Bottom Right) */}
    <motion.circle 
      cx="75" cy="70" r="6" 
      fill="currentColor" fillOpacity="0.5" 
      initial={{ y: 0, opacity: 0.5 }} 
      animate={{ y: [4, -4, 4], opacity: [0.5, 0.9, 0.5] }} 
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} 
    />
    
    {/* 4. Rotating Geometric Accent (Top Left) */}
    <motion.rect 
      x="18" y="22" width="8" height="8" rx="2" 
      fill="currentColor" fillOpacity="0.4" 
      initial={{ rotate: 0 }} 
      animate={{ rotate: [0, 90, 180] }} 
      transition={{ duration: 4, repeat: Infinity, ease: "linear" }} 
    />
    
    {/* 5. Magic Sparkle/Star (Top Right) */}
    <motion.path 
      d="M75 20 L76.5 25.5 L82 27 L76.5 28.5 L75 34 L73.5 28.5 L68 27 L73.5 25.5 Z" 
      fill="currentColor" fillOpacity="0.6" 
      initial={{ scale: 0.8 }} 
      animate={{ scale: [0.8, 1.2, 0.8] }} 
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} 
    />
  </svg>
);

// ============================================================================
// 🌐 TRANSLATION DICTIONARY
// ============================================================================
const HUB_TRANSLATIONS: Record<string, any> = {
  uz: {
    heroBadge: "Studiya 2.0 ✨",
    title: "Material Yaratish",
    subtitle: "O'quvchilaringiz uchun test va imtihon tuzish usulini tanlang.",
    section1: "Ta'lim Dasturlari va Baholash",
    section2: "Ilg'or AI va Maxsus Yaratish Vositalari",
    
    bsb: { badge: "Matritsa", title: "BSB va CHSB", desc: "Matritsa asosida barcha fanlardan summativ baholash qog'ozlarini tuzish.", btn: "Boshlash" },
    maktab: { badge: "Umumta'lim", title: "Maktab Dasturi", desc: "1-11 sinflar uchun davlat standarti asosidagi onlayn testlar.", btn: "Boshlash" },
    ixtisos: { badge: "Murakkab", title: "Ixtisoslashtirilgan", desc: "Prezident va ixtisoslashtirilgan maktablar uchun mantiqiy masalalar.", btn: "Boshlash" },
    abiturient: { badge: "DTM / BMBA", title: "Abiturient Tayyorgarligi", desc: "Oliy ta'limga kirish imtihonlari uchun AI test generatori.", btn: "Boshlash" },
    
    aiImage: { badge: "Tezkor 📸", title: "Rasm Orqali Yaratish", desc: "Test qog'ozini rasmga oling. AI uni o'qib test tuzib beradi.", btn: "Yuklash" },
    aiPrompt: { badge: "Moslashuvchan", title: "AI Maxsus Prompt", desc: "Test mavzusi va parametrlarini oddiy matn orqali tushuntiring.", btn: "Yozish" },
    custom: { badge: "Nazorat", title: "Maxsus Studiya", desc: "Matematik klaviatura yordamida o'z savollaringizni noldan yozing.", btn: "Ochish" },
  },
  en: {
    heroBadge: "Studio 2.0 ✨",
    title: "Test Creation Hub",
    subtitle: "Select a track to start building your assessments and exams.",
    section1: "Curriculums & Assessments",
    section2: "Advanced AI & Custom Tools",
    
    bsb: { badge: "Matrix", title: "BSB & CHSB Exams", desc: "Generate printable summative assessment papers based on matrices.", btn: "Start" },
    maktab: { badge: "Standard", title: "Public School", desc: "Standardized online tests based on the national curriculum.", btn: "Start" },
    ixtisos: { badge: "Advanced", title: "Specialized Track", desc: "Complex, logic-based problems for Specialized schools.", btn: "Start" },
    abiturient: { badge: "University", title: "University Prep", desc: "Question banks and AI generators for university entrance exams.", btn: "Start" },
    
    aiImage: { badge: "Quick 📸", title: "Create via Image", desc: "Take a photo of an exam paper. The AI will generate similar questions.", btn: "Upload" },
    aiPrompt: { badge: "Flexible", title: "AI Custom Prompt", desc: "Describe your test topic and parameters in plain text.", btn: "Write" },
    custom: { badge: "Control", title: "Custom Studio", desc: "Write your own questions from scratch using our math keyboard.", btn: "Open" },
  },
  ru: {
    heroBadge: "Студия 2.0 ✨",
    title: "Центр создания тестов",
    subtitle: "Выберите направление для формирования тестов и экзаменов.",
    section1: "Программы и Оценивание",
    section2: "Продвинутые ИИ и Инструменты",
    
    bsb: { badge: "Матрица", title: "Экзамены BSB / CHSB", desc: "Создание суммативных экзаменационных работ на основе матриц.", btn: "Начать" },
    maktab: { badge: "Стандарт", title: "Школьная программа", desc: "Тесты по государственным стандартам для 1-11 классов.", btn: "Начать" },
    ixtisos: { badge: "Углубленный", title: "Спец. школы", desc: "Сложные логические задачи для специализированных школ.", btn: "Начать" },
    abiturient: { badge: "Поступление", title: "Подготовка в ВУЗ", desc: "Базы и генератор ИИ для вступительных экзаменов (DTM).", btn: "Начать" },
    
    aiImage: { badge: "Быстро 📸", title: "Создать по фото", desc: "Сфотографируйте экзамен. ИИ создаст похожие вопросы.", btn: "Загрузить" },
    aiPrompt: { badge: "Гибкий", title: "AI Свой Промпт", desc: "Опишите тему и параметры теста простыми словами.", btn: "Написать" },
    custom: { badge: "Контроль", title: "Своя Студия", desc: "Напишите свои вопросы с нуля, используя математическую клавиатуру.", btn: "Открыть" },
  }
};

// --- ANIMATION VARIANTS ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0.4, duration: 0.6 } },
  hover: { y: -4, transition: { duration: 0.2 } },
  tap: { scale: 0.97 }
};

// ============================================================================
// 🏛️ MAIN PAGE COMPONENT
// ============================================================================
export default function CreateHubPage() {
  const router = useRouter();
  const { lang } = useTeacherLanguage();
  const t = HUB_TRANSLATIONS[lang] || HUB_TRANSLATIONS['uz'];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans relative overflow-hidden pb-24 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* 🟢 PREMIUM BACKGROUND GLOWS */}
      <div className="absolute top-0 inset-x-0 h-[50vh] bg-gradient-to-b from-slate-200/50 via-white/50 to-transparent pointer-events-none"></div>
      <div className="absolute -left-40 top-[-10%] w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute -right-40 top-[20%] w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="flex-1 flex flex-col items-center w-full max-w-[1200px] mx-auto px-4 sm:px-6 relative z-10 pt-10 md:pt-14">
        
        {/* --- HERO SECTION --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center mb-12 max-w-xl flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-widest mb-6 shadow-sm">
            <Zap size={14} className="fill-amber-400 text-amber-500" /> {t.heroBadge}
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">
            {t.title}
          </h1>
          <p className="text-slate-500 text-[15px] font-medium max-w-sm leading-relaxed">
            {t.subtitle}
          </p>
        </motion.div>

        {/* ================= SECTION 1: CURRICULUMS & ASSESSMENTS (4 CARDS) ================= */}
        <div className="w-full mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-slate-300"></div>
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">{t.section1}</h3>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-slate-300"></div>
          </div>
          
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* 1. BSB/CHSB (Purple) */}
            <motion.div variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/bsb-chsb')} className="group relative bg-white rounded-3xl p-5 border border-slate-200/80 hover:border-purple-300 hover:shadow-[0_15px_30px_-10px_rgba(168,85,247,0.15)] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full">
              <div className="flex justify-between items-start mb-5 relative z-10">
                <div className="w-11 h-11 bg-purple-50 border border-purple-100 text-purple-600 rounded-xl flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:scale-110">
                  <FileText size={20} strokeWidth={2.5} />
                </div>
                <div className="w-12 h-12"><CardIllustration colorClass="text-purple-500" /></div>
              </div>
              <h2 className="text-[16px] font-black text-slate-900 mb-1.5 group-hover:text-purple-600 transition-colors">{t.bsb.title}</h2>
              <p className="text-[13px] text-slate-500 mb-6 font-medium leading-relaxed line-clamp-3">{t.bsb.desc}</p>
              <div className="mt-auto inline-flex items-center gap-2 text-purple-600 text-[13px] font-bold">
                <span className="group-hover:mr-1 transition-all duration-300">{t.bsb.btn}</span>
                <div className="w-6 h-6 rounded-full bg-purple-50 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all duration-300"><ArrowRight size={14} /></div>
              </div>
            </motion.div>

            {/* 2. MAKTAB (Blue) */}
            <motion.div variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/maktab')} className="group relative bg-white rounded-3xl p-5 border border-slate-200/80 hover:border-blue-300 hover:shadow-[0_15px_30px_-10px_rgba(59,130,246,0.15)] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full">
              <div className="flex justify-between items-start mb-5 relative z-10">
                <div className="w-11 h-11 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:scale-110">
                  <School size={20} strokeWidth={2.5} />
                </div>
                <div className="w-12 h-12"><CardIllustration colorClass="text-blue-500" /></div>
              </div>
              <h2 className="text-[16px] font-black text-slate-900 mb-1.5 group-hover:text-blue-600 transition-colors">{t.maktab.title}</h2>
              <p className="text-[13px] text-slate-500 mb-6 font-medium leading-relaxed line-clamp-3">{t.maktab.desc}</p>
              <div className="mt-auto inline-flex items-center gap-2 text-blue-600 text-[13px] font-bold">
                <span className="group-hover:mr-1 transition-all duration-300">{t.maktab.btn}</span>
                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300"><ArrowRight size={14} /></div>
              </div>
            </motion.div>

            {/* 3. IXTISOS (Amber) */}
            <motion.div variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/ixtisoslashtirilgan_maktab')} className="group relative bg-white rounded-3xl p-5 border border-slate-200/80 hover:border-amber-300 hover:shadow-[0_15px_30px_-10px_rgba(245,158,11,0.15)] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full">
              <div className="flex justify-between items-start mb-5 relative z-10">
                <div className="w-11 h-11 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-sm group-hover:scale-110">
                  <Award size={20} strokeWidth={2.5} />
                </div>
                <div className="w-12 h-12"><CardIllustration colorClass="text-amber-500" /></div>
              </div>
              <h2 className="text-[16px] font-black text-slate-900 mb-1.5 group-hover:text-amber-600 transition-colors">{t.ixtisos.title}</h2>
              <p className="text-[13px] text-slate-500 mb-6 font-medium leading-relaxed line-clamp-3">{t.ixtisos.desc}</p>
              <div className="mt-auto inline-flex items-center gap-2 text-amber-600 text-[13px] font-bold">
                <span className="group-hover:mr-1 transition-all duration-300">{t.ixtisos.btn}</span>
                <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all duration-300"><ArrowRight size={14} /></div>
              </div>
            </motion.div>

            {/* 4. ABITURIENT (Emerald) */}
            <motion.div variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/abiturient')} className="group relative bg-white rounded-3xl p-5 border border-slate-200/80 hover:border-emerald-300 hover:shadow-[0_15px_30px_-10px_rgba(16,185,129,0.15)] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full">
              <div className="flex justify-between items-start mb-5 relative z-10">
                <div className="w-11 h-11 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-sm group-hover:scale-110">
                  <GraduationCap size={20} strokeWidth={2.5} />
                </div>
                <div className="w-12 h-12"><CardIllustration colorClass="text-emerald-500" /></div>
              </div>
              <h2 className="text-[16px] font-black text-slate-900 mb-1.5 group-hover:text-emerald-600 transition-colors">{t.abiturient.title}</h2>
              <p className="text-[13px] text-slate-500 mb-6 font-medium leading-relaxed line-clamp-3">{t.abiturient.desc}</p>
              <div className="mt-auto inline-flex items-center gap-2 text-emerald-600 text-[13px] font-bold">
                <span className="group-hover:mr-1 transition-all duration-300">{t.abiturient.btn}</span>
                <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300"><ArrowRight size={14} /></div>
              </div>
            </motion.div>

          </motion.div>
        </div>

        {/* ================= SECTION 2: ADVANCED TOOLS (3 CARDS) ================= */}
        <div className="w-full">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-slate-300"></div>
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">{t.section2}</h3>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-slate-300"></div>
          </div>
          
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* 5. IMAGE AI (Rose) */}
            <motion.div variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/by_image')} className="group relative bg-white rounded-3xl p-5 border border-slate-200/80 hover:border-rose-300 hover:shadow-[0_15px_30px_-10px_rgba(244,63,94,0.15)] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full">
              <div className="flex justify-between items-start mb-5 relative z-10">
                <div className="w-11 h-11 bg-rose-50 border border-rose-100 text-rose-500 rounded-xl flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all duration-300 shadow-sm group-hover:scale-110">
                  <ImageIcon size={20} strokeWidth={2.5} />
                </div>
                <div className="w-12 h-12"><CardIllustration colorClass="text-rose-500" /></div>
              </div>
              <h2 className="text-[16px] font-black text-slate-900 mb-1.5 group-hover:text-rose-500 transition-colors">{t.aiImage.title}</h2>
              <p className="text-[13px] text-slate-500 mb-6 font-medium leading-relaxed line-clamp-3">{t.aiImage.desc}</p>
              <div className="mt-auto inline-flex items-center gap-2 text-rose-500 text-[13px] font-bold">
                <span className="group-hover:mr-1 transition-all duration-300">{t.aiImage.btn}</span>
                <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all duration-300"><ArrowRight size={14} /></div>
              </div>
            </motion.div>

            {/* 6. PROMPT AI (Violet) */}
            <motion.div variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/by_user_input')} className="group relative bg-white rounded-3xl p-5 border border-slate-200/80 hover:border-violet-300 hover:shadow-[0_15px_30px_-10px_rgba(139,92,246,0.15)] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full">
              <div className="flex justify-between items-start mb-5 relative z-10">
                <div className="w-11 h-11 bg-violet-50 border border-violet-100 text-violet-600 rounded-xl flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:scale-110">
                  <Bot size={20} strokeWidth={2.5} />
                </div>
                <div className="w-12 h-12"><CardIllustration colorClass="text-violet-500" /></div>
              </div>
              <h2 className="text-[16px] font-black text-slate-900 mb-1.5 group-hover:text-violet-600 transition-colors">{t.aiPrompt.title}</h2>
              <p className="text-[13px] text-slate-500 mb-6 font-medium leading-relaxed line-clamp-3">{t.aiPrompt.desc}</p>
              <div className="mt-auto inline-flex items-center gap-2 text-violet-600 text-[13px] font-bold">
                <span className="group-hover:mr-1 transition-all duration-300">{t.aiPrompt.btn}</span>
                <div className="w-6 h-6 rounded-full bg-violet-50 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-all duration-300"><ArrowRight size={14} /></div>
              </div>
            </motion.div>

            {/* 7. CUSTOM STUDIO (Teal) */}
            <motion.div variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/custom')} className="group relative bg-white rounded-3xl p-5 border border-slate-200/80 hover:border-teal-300 hover:shadow-[0_15px_30px_-10px_rgba(20,184,166,0.15)] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full">
              <div className="flex justify-between items-start mb-5 relative z-10">
                <div className="w-11 h-11 bg-teal-50 border border-teal-100 text-teal-600 rounded-xl flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:scale-110">
                  <PenTool size={20} strokeWidth={2.5} />
                </div>
                <div className="w-12 h-12"><CardIllustration colorClass="text-teal-500" /></div>
              </div>
              <h2 className="text-[16px] font-black text-slate-900 mb-1.5 group-hover:text-teal-600 transition-colors">{t.custom.title}</h2>
              <p className="text-[13px] text-slate-500 mb-6 font-medium leading-relaxed line-clamp-3">{t.custom.desc}</p>
              <div className="mt-auto inline-flex items-center gap-2 text-teal-600 text-[13px] font-bold">
                <span className="group-hover:mr-1 transition-all duration-300">{t.custom.btn}</span>
                <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-all duration-300"><ArrowRight size={14} /></div>
              </div>
            </motion.div>

          </motion.div>
        </div>

      </div>
    </div>
  );
}
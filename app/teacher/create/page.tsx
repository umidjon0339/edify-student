"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, LayoutGrid, Bot, PenTool, Image as ImageIcon, School, Award, GraduationCap, Zap } from "lucide-react";
import { useTeacherLanguage } from "@/app/teacher/layout"; 
import { motion, Variants } from "framer-motion";

// --- TRANSLATION DICTIONARY ---
const HUB_TRANSLATIONS: Record<string, any> = {
  uz: {
    heroBadge: "Studiya 2.0 ✨",
    title: "Test yaratish markazi",
    subtitle: "O'quvchilaringiz uchun test shakllantirish yo'nalishini tanlang.",
    section1: "Asosiy Dasturlar",
    section2: "Ilg'or AI va Maxsus Asboblar",
    maktab: { badge: "Umumta'lim", title: "Maktab Dasturi", desc: "1-11 sinflar uchun davlat standarti asosidagi testlar.", btn: "Boshlash" },
    ixtisos: { badge: "Murakkab", title: "Ixtisoslashtirilgan", desc: "Prezident va ixtisoslashtirilgan maktablar uchun masalalar.", btn: "Boshlash" },
    abiturient: { badge: "DTM / BMBA", title: "Abiturient Tayyorgarligi", desc: "Oliy ta'limga kirish imtihonlari uchun AI generatori.", btn: "Boshlash" },
    aiImage: { badge: "Tezkor 📸", title: "Rasm orqali yaratish", desc: "Darslik yoki test qog'ozini rasmga oling. AI uni o'qib test tuzadi.", btn: "Yuklash" },
    aiPrompt: { badge: "Moslashuvchan ✨", title: "AI Maxsus Prompt", desc: "Test mavzusini va detallarini oddiy matn orqali tushuntiring.", btn: "Yozish" },
    custom: { badge: "Nazorat", title: "Maxsus Studiya", desc: "O'zingizning maxsus savollaringizni klaviatura orqali tahrirlang.", btn: "Ochish" },
  },
  en: {
    heroBadge: "Studio 2.0 ✨",
    title: "Test Creation Hub",
    subtitle: "Select a track to start building your assessments.",
    section1: "Main Curriculums",
    section2: "Advanced AI & Custom Tools",
    maktab: { badge: "Standard", title: "Public School", desc: "Standardized tests based on the national curriculum.", btn: "Start" },
    ixtisos: { badge: "Advanced", title: "Specialized Track", desc: "Complex, logic-based problems for Specialized schools.", btn: "Start" },
    abiturient: { badge: "University", title: "University Prep", desc: "Question banks and AI generators for entrance exams.", btn: "Start" },
    aiImage: { badge: "Quick 📸", title: "Create via Image", desc: "Take a photo of an exam paper. The AI will generate similar questions.", btn: "Upload" },
    aiPrompt: { badge: "Flexible ✨", title: "AI Custom Prompt", desc: "Describe your test topic and parameters in plain text.", btn: "Write" },
    custom: { badge: "Control", title: "Custom Studio", desc: "Write your own questions from scratch using our math keyboard.", btn: "Open" },
  },
  ru: {
    heroBadge: "Студия 2.0 ✨",
    title: "Центр создания тестов",
    subtitle: "Выберите направление для формирования тестов.",
    section1: "Основные программы",
    section2: "Продвинутые ИИ и Инструменты",
    maktab: { badge: "Стандарт", title: "Школьная программа", desc: "Тесты по государственным стандартам для 1-11 классов.", btn: "Начать" },
    ixtisos: { badge: "Углубленный", title: "Спец. школы", desc: "Сложные логические задачи для специализированных школ.", btn: "Начать" },
    abiturient: { badge: "Поступление", title: "Подготовка в ВУЗ", desc: "Базы и генератор ИИ для вступительных экзаменов (DTM).", btn: "Начать" },
    aiImage: { badge: "Быстро 📸", title: "Создать по фото", desc: "Сфотографируйте экзамен. ИИ создаст похожие вопросы.", btn: "Загрузить" },
    aiPrompt: { badge: "Гибкий ✨", title: "AI Свой Промпт", desc: "Опишите тему и параметры теста простыми словами.", btn: "Написать" },
    custom: { badge: "Контроль", title: "Своя Студия", desc: "Напишите свои вопросы, используя математическую клавиатуру.", btn: "Открыть" },
  }
};

// --- ANIMATION VARIANTS ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0.4, duration: 0.8 } },
  hover: { y: -6, transition: { duration: 0.2 } },
  tap: { scale: 0.97 }
};

export default function CreateHubPage() {
  const router = useRouter();
  const { lang } = useTeacherLanguage();
  const t = HUB_TRANSLATIONS[lang] || HUB_TRANSLATIONS['en'];

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col font-sans relative overflow-hidden pb-24">
      
      {/* 🟢 PREMIUM BACKGROUND GLOWS */}
      <div className="absolute top-0 inset-x-0 h-[60vh] bg-gradient-to-b from-slate-100/80 via-white/50 to-transparent pointer-events-none"></div>
      <div className="absolute -left-40 top-[-10%] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute -right-40 top-[20%] w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="flex-1 flex flex-col items-center w-full max-w-[1000px] mx-auto px-4 md:px-6 relative z-10 pt-10 md:pt-16">
        
        {/* --- HERO SECTION --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-12 max-w-xl flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-[11px] uppercase tracking-widest mb-6 shadow-sm">
            <Zap size={14} className="fill-indigo-600" /> {t.heroBadge}
          </div>
          <h1 className="text-3xl md:text-5xl leading-tight font-black text-slate-900 tracking-tight mb-4">
            {t.title}
          </h1>
          <p className="text-slate-500 text-[15px] md:text-[16px] font-medium max-w-sm">
            {t.subtitle}
          </p>
        </motion.div>

        {/* ================= SECTION 1: MAIN CURRICULUMS ================= */}
        <div className="w-full mb-16">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-slate-300"></div>
            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest text-center">{t.section1}</h3>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-slate-300"></div>
          </div>
          
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* 1. MAKTAB (Blue Theme) */}
            <motion.div 
              variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/maktab')}
              className="group relative bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-blue-300 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.15)] transition-all duration-300 ease-out cursor-pointer overflow-hidden flex flex-col text-left h-full"
            >
              <School className="absolute -bottom-6 -right-6 text-blue-500 opacity-[0.02] group-hover:opacity-10 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-500 ease-out" size={140} />
              
              <div className="flex justify-between items-start mb-5 relative z-10">
                <div className="w-12 h-12 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                  <School size={22} strokeWidth={2} />
                </div>
                <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors duration-300">{t.maktab.badge}</span>
              </div>
              
              <h2 className="text-[17px] font-black text-slate-900 mb-2 relative z-10 group-hover:text-blue-600 transition-colors">{t.maktab.title}</h2>
              <p className="text-[13px] text-slate-500 mb-8 relative z-10 font-medium leading-relaxed line-clamp-3">{t.maktab.desc}</p>
              
              <div className="mt-auto inline-flex items-center gap-2 text-blue-600 text-[13px] font-bold relative z-10">
                <span className="group-hover:mr-1 transition-all duration-300">{t.maktab.btn}</span>
                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <ArrowRight size={14} />
                </div>
              </div>
            </motion.div>

            {/* 2. IXTISOSLASHTIRILGAN (Amber Theme) */}
            <motion.div 
              variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/ixtisoslashtirilgan_maktab')}
              className="group relative bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-amber-300 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)] transition-all duration-300 ease-out cursor-pointer overflow-hidden flex flex-col text-left h-full"
            >
              <Award className="absolute -bottom-6 -right-6 text-amber-500 opacity-[0.02] group-hover:opacity-10 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-500 ease-out" size={140} />
              
              <div className="flex justify-between items-start mb-5 relative z-10">
                <div className="w-12 h-12 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-sm">
                  <Award size={22} strokeWidth={2} />
                </div>
                <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg group-hover:bg-amber-50 group-hover:text-amber-600 group-hover:border-amber-200 transition-colors duration-300">{t.ixtisos.badge}</span>
              </div>
              
              <h2 className="text-[17px] font-black text-slate-900 mb-2 relative z-10 group-hover:text-amber-600 transition-colors">{t.ixtisos.title}</h2>
              <p className="text-[13px] text-slate-500 mb-8 relative z-10 font-medium leading-relaxed line-clamp-3">{t.ixtisos.desc}</p>
              
              <div className="mt-auto inline-flex items-center gap-2 text-amber-600 text-[13px] font-bold relative z-10">
                <span className="group-hover:mr-1 transition-all duration-300">{t.ixtisos.btn}</span>
                <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                  <ArrowRight size={14} />
                </div>
              </div>
            </motion.div>

            {/* 3. ABITURIENT (Emerald Theme) */}
            <motion.div 
              variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/abiturient')}
              className="group relative bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-emerald-300 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.15)] transition-all duration-300 ease-out cursor-pointer overflow-hidden flex flex-col text-left h-full"
            >
              <GraduationCap className="absolute -bottom-6 -right-6 text-emerald-500 opacity-[0.02] group-hover:opacity-10 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-500 ease-out" size={140} />
              
              <div className="flex justify-between items-start mb-5 relative z-10">
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-sm">
                  <GraduationCap size={22} strokeWidth={2} />
                </div>
                <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-200 transition-colors duration-300">{t.abiturient.badge}</span>
              </div>
              
              <h2 className="text-[17px] font-black text-slate-900 mb-2 relative z-10 group-hover:text-emerald-600 transition-colors">{t.abiturient.title}</h2>
              <p className="text-[13px] text-slate-500 mb-8 relative z-10 font-medium leading-relaxed line-clamp-3">{t.abiturient.desc}</p>
              
              <div className="mt-auto inline-flex items-center gap-2 text-emerald-600 text-[13px] font-bold relative z-10">
                <span className="group-hover:mr-1 transition-all duration-300">{t.abiturient.btn}</span>
                <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                  <ArrowRight size={14} />
                </div>
              </div>
            </motion.div>

          </motion.div>
        </div>

        {/* ================= SECTION 2: ADVANCED TOOLS ================= */}
        <div className="w-full">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-slate-300"></div>
            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest text-center">{t.section2}</h3>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-slate-300"></div>
          </div>
          
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* 4. IMAGE AI (Rose Theme) */}
            <motion.div 
              variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/by_image')}
              className="group relative bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-rose-300 hover:shadow-[0_20px_40px_-15px_rgba(244,63,94,0.15)] transition-all duration-300 ease-out cursor-pointer flex flex-col text-left overflow-hidden h-full"
            >
              <ImageIcon className="absolute -bottom-4 -right-4 text-rose-500 opacity-[0.02] group-hover:opacity-10 group-hover:scale-125 transition-all duration-500" size={120} />
              
              <div className="flex justify-between items-start mb-5 relative z-10">
                <div className="w-12 h-12 bg-rose-50 border border-rose-100 text-rose-500 rounded-xl flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all duration-300 shadow-sm">
                  <ImageIcon size={22} strokeWidth={2} />
                </div>
                <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg group-hover:bg-rose-50 group-hover:text-rose-500 group-hover:border-rose-200 transition-colors duration-300">{t.aiImage.badge}</span>
              </div>

              <h2 className="text-[17px] font-black text-slate-900 mb-2 relative z-10 group-hover:text-rose-500 transition-colors">{t.aiImage.title}</h2>
              <p className="text-[13px] text-slate-500 mb-8 relative z-10 font-medium leading-relaxed line-clamp-3">{t.aiImage.desc}</p>
              
              <div className="mt-auto inline-flex items-center gap-2 text-rose-500 text-[13px] font-bold relative z-10">
                <span className="group-hover:mr-1 transition-all duration-300">{t.aiImage.btn}</span>
                <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all duration-300">
                  <ArrowRight size={14} />
                </div>
              </div>
            </motion.div>

            {/* 5. PROMPT AI (Violet Theme) */}
            <motion.div 
              variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/by_user_input')}
              className="group relative bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-violet-300 hover:shadow-[0_20px_40px_-15px_rgba(139,92,246,0.15)] transition-all duration-300 ease-out cursor-pointer flex flex-col text-left overflow-hidden h-full"
            >
              <Bot className="absolute -bottom-4 -right-4 text-violet-500 opacity-[0.02] group-hover:opacity-10 group-hover:scale-125 transition-all duration-500" size={120} />

              <div className="flex justify-between items-start mb-5 relative z-10">
                <div className="w-12 h-12 bg-violet-50 border border-violet-100 text-violet-600 rounded-xl flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-all duration-300 shadow-sm">
                  <Bot size={22} strokeWidth={2} />
                </div>
                <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg group-hover:bg-violet-50 group-hover:text-violet-600 group-hover:border-violet-200 transition-colors duration-300">{t.aiPrompt.badge}</span>
              </div>

              <h2 className="text-[17px] font-black text-slate-900 mb-2 relative z-10 group-hover:text-violet-600 transition-colors">{t.aiPrompt.title}</h2>
              <p className="text-[13px] text-slate-500 mb-8 relative z-10 font-medium leading-relaxed line-clamp-3">{t.aiPrompt.desc}</p>
              
              <div className="mt-auto inline-flex items-center gap-2 text-violet-600 text-[13px] font-bold relative z-10">
                <span className="group-hover:mr-1 transition-all duration-300">{t.aiPrompt.btn}</span>
                <div className="w-6 h-6 rounded-full bg-violet-50 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-all duration-300">
                  <ArrowRight size={14} />
                </div>
              </div>
            </motion.div>

            {/* 6. CUSTOM STUDIO (Teal Theme) */}
            <motion.div 
              variants={cardVariants} whileHover="hover" whileTap="tap" onClick={() => router.push('/teacher/create/custom')}
              className="group relative bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-teal-300 hover:shadow-[0_20px_40px_-15px_rgba(20,184,166,0.15)] transition-all duration-300 ease-out cursor-pointer flex flex-col text-left overflow-hidden h-full"
            >
               <PenTool className="absolute -bottom-4 -right-4 text-teal-500 opacity-[0.02] group-hover:opacity-10 group-hover:scale-125 transition-all duration-500" size={120} />

              <div className="flex justify-between items-start mb-5 relative z-10">
                <div className="w-12 h-12 bg-teal-50 border border-teal-100 text-teal-600 rounded-xl flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-all duration-300 shadow-sm">
                  <PenTool size={22} strokeWidth={2} />
                </div>
                <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg group-hover:bg-teal-50 group-hover:text-teal-600 group-hover:border-teal-200 transition-colors duration-300">{t.custom.badge}</span>
              </div>

              <h2 className="text-[17px] font-black text-slate-900 mb-2 relative z-10 group-hover:text-teal-600 transition-colors">{t.custom.title}</h2>
              <p className="text-[13px] text-slate-500 mb-8 relative z-10 font-medium leading-relaxed line-clamp-3">{t.custom.desc}</p>
              
              <div className="mt-auto inline-flex items-center gap-2 text-teal-600 text-[13px] font-bold relative z-10">
                <span className="group-hover:mr-1 transition-all duration-300">{t.custom.btn}</span>
                <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-all duration-300">
                  <ArrowRight size={14} />
                </div>
              </div>
            </motion.div>

          </motion.div>
        </div>

      </div>
    </div>
  );
}
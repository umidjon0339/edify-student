"use client";

import { useRouter } from "next/navigation";
import { Database, Wand2, ArrowRight, Sparkles, LayoutGrid, Bot, PenTool, Image as ImageIcon } from "lucide-react";
import { useTeacherLanguage } from "@/app/teacher/layout"; 
import { motion, Variants } from "framer-motion";

// --- TRANSLATION DICTIONARY ---
const HUB_TRANSLATIONS = {
  uz: {
    title: "Qanday usulda yaratmoqchisiz?",
    subtitle: "Test yaratish uchun o'zingizga qulay usulni tanlang.",
    db: { badge: "Eng tez", title: "Edify Bazasi", desc: "Minglab tasdiqlangan savollardan foydalaning. Bir necha soniya ichida test tuzing.", btn: "Baza orqali yaratish" },
    custom: { badge: "To'liq nazorat", title: "Maxsus Studiya", desc: "O'zingizning maxsus savollaringizni yozing. Matematik klaviatura yordamida bemalol tahrirlang.", btn: "Studiyani ochish" },
    ai: { badge: "Avtomatik ✨", title: "AI Generator", desc: "Mavzu va darslikni tanlang, sun'iy intellekt siz uchun mutlaqo noyob savollarni yaratib beradi.", btn: "AI bilan yaratish" },
    aiPrompt: { badge: "Eng qulay ✨", title: "AI Maxsus Prompt", desc: "Test mavzusini va detallarini oddiy matn orqali tushuntiring. AI hamma narsani o'zi anglab test tuzadi.", btn: "Matn orqali yaratish" },
    aiImage: { badge: "Super Qulay 📸", title: "Rasm orqali yaratish", desc: "Darslik yoki test qog'ozini rasmga oling. AI uni o'qib, xuddi shunday savollar tuzadi.", btn: "Rasm orqali yaratish" }
  },
  en: {
    title: "How do you want to build?",
    subtitle: "Choose your preferred method to create a new test.",
    db: { badge: "Fastest", title: "Edify Database", desc: "Browse thousands of verified questions mapped exactly to the national syllabus. Auto-generate tests.", btn: "Browse Database" },
    custom: { badge: "Full Control", title: "Custom Studio", desc: "Write your own questions from scratch using our visual math keyboard. Save them to your library.", btn: "Open Studio" },
    ai: { badge: "Automatic ✨", title: "AI Generator", desc: "Select a syllabus topic and let our AI generate completely unique, curriculum-aligned questions.", btn: "Generate with AI" },
    aiPrompt: { badge: "Flexible ✨", title: "AI Custom Prompt", desc: "Describe your test topic and parameters in plain text. The AI will understand and generate it instantly.", btn: "Create via Text" },
    aiImage: { badge: "Super Easy 📸", title: "Create via Image", desc: "Take a photo of a textbook or exam paper. The AI will read it and generate similar questions.", btn: "Create via Image" }
  },
  ru: {
    title: "Как вы хотите создать тест?",
    subtitle: "Выберите удобный для вас способ создания теста.",
    db: { badge: "Самый быстрый", title: "База Edify", desc: "Используйте тысячи проверенных вопросов. Создайте тест за несколько секунд.", btn: "Использовать базу" },
    custom: { badge: "Полный контроль", title: "Своя Студия", desc: "Напишите свои собственные вопросы, используя математическую клавиатуру. Сохраняйте их в библиотеку.", btn: "Открыть студию" },
    ai: { badge: "Автоматически ✨", title: "AI Генератор", desc: "Выберите тему учебника, и наш ИИ сгенерирует абсолютно уникальные вопросы за секунды.", btn: "Создать с ИИ" },
    aiPrompt: { badge: "Самый удобный ✨", title: "AI Свой Промпт", desc: "Опишите тему и параметры теста простыми словами. ИИ сам все поймет и создаст вопросы.", btn: "Создать по тексту" },
    aiImage: { badge: "Супер Легко 📸", title: "Создать по фото", desc: "Сфотографируйте учебник или экзамен. ИИ прочитает его и создаст похожие вопросы.", btn: "Создать по фото" }
  }
};

// --- FRAMER MOTION VARIANTS ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", bounce: 0.4, duration: 0.8 } 
  }
};

export default function CreateHubPage() {
  const router = useRouter();
  const { lang } = useTeacherLanguage();
  const t = HUB_TRANSLATIONS[lang] || HUB_TRANSLATIONS['en'];

  // This class handles the flexible grid centering. 
  // Mobile: 100% width. Tablet: 50% width. Desktop: 33% width. Max width ~360px per card to keep them pretty.
  const cardSizingClass = "w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-[400px] shrink-0";

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col font-sans relative overflow-hidden pb-12">
      
      {/* Premium Background Glows */}
      <div className="absolute top-0 inset-x-0 h-[50vh] bg-gradient-to-b from-slate-200/40 to-transparent pointer-events-none"></div>
      <div className="absolute -left-40 top-20 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -right-40 top-40 w-96 h-96 bg-purple-400/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative z-10">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-14 max-w-2xl mt-8"
        >
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-6 text-slate-700">
            <LayoutGrid size={28} strokeWidth={2} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            {t.title}
          </h1>
          <p className="text-slate-500 text-lg font-medium">
            {t.subtitle}
          </p>
        </motion.div>

        {/* 🟢 UPGRADED: Flex-Wrap Centered Grid for 5 Items */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-wrap justify-center gap-6 w-full max-w-[1200px] px-4"
        >
          
          {/* OPTION 1: THE EDIFY DATABASE (Blue) */}
          <motion.div 
            variants={cardVariants}
            onClick={() => router.push('/teacher/create/database')}
            className={`group relative bg-gradient-to-b from-blue-50/50 to-white rounded-3xl p-8 border border-blue-100 hover:border-blue-400 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.2)] hover:-translate-y-2 transition-all duration-300 ease-out cursor-pointer overflow-hidden flex flex-col items-start text-left ${cardSizingClass}`}
          >
            <div className="absolute top-5 right-5 px-3 py-1 bg-white border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
              {t.db.badge}
            </div>
            
            <div className="absolute -right-12 -top-12 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors duration-500"></div>
            
            <div className="w-14 h-14 bg-white border border-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-300 shadow-sm">
              <Database size={26} strokeWidth={2} />
            </div>
            
            <h2 className="text-xl font-black text-slate-900 mb-3 relative z-10">{t.db.title}</h2>
            <p className="text-[14px] text-slate-500 mb-10 relative z-10 font-medium leading-relaxed">{t.db.desc}</p>
            <div className="mt-auto flex items-center gap-2 text-blue-600 text-[14px] font-bold relative z-10 group-hover:translate-x-2 transition-transform duration-300">
              {t.db.btn} <ArrowRight size={18} />
            </div>
          </motion.div>

          {/* OPTION 2: THE CUSTOM STUDIO (Emerald) */}
          <motion.div 
            variants={cardVariants}
            onClick={() => router.push('/teacher/create/custom')}
            className={`group relative bg-gradient-to-b from-emerald-50/50 to-white rounded-3xl p-8 border border-emerald-100 hover:border-emerald-400 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.2)] hover:-translate-y-2 transition-all duration-300 ease-out cursor-pointer overflow-hidden flex flex-col items-start text-left ${cardSizingClass}`}
          >
            <div className="absolute top-5 right-5 px-3 py-1 bg-white border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
              {t.custom.badge}
            </div>

            <div className="absolute -right-12 -top-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors duration-500"></div>
            
            <div className="w-14 h-14 bg-white border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-all duration-300 shadow-sm">
              <PenTool size={26} strokeWidth={2} />
            </div>
            
            <h2 className="text-xl font-black text-slate-900 mb-3 relative z-10">{t.custom.title}</h2>
            <p className="text-[14px] text-slate-500 mb-10 relative z-10 font-medium leading-relaxed">{t.custom.desc}</p>
            <div className="mt-auto flex items-center gap-2 text-emerald-600 text-[14px] font-bold relative z-10 group-hover:translate-x-2 transition-transform duration-300">
              {t.custom.btn} <ArrowRight size={18} />
            </div>
          </motion.div>

          {/* OPTION 3: AI GENERATOR (Violet) */}
          <motion.div 
            variants={cardVariants}
            onClick={() => router.push('/teacher/create/ai')}
            className={`group relative bg-gradient-to-b from-violet-50/50 to-white rounded-3xl p-8 border border-violet-100 hover:border-violet-400 hover:shadow-[0_20px_40px_-15px_rgba(139,92,246,0.2)] hover:-translate-y-2 transition-all duration-300 ease-out cursor-pointer overflow-hidden flex flex-col items-start text-left ${cardSizingClass}`}
          >
            <div className="absolute top-5 right-5 px-3 py-1 bg-white border border-violet-100 text-violet-600 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
              {t.ai.badge}
            </div>

            <div className="absolute -right-12 -top-12 w-40 h-40 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-colors duration-500"></div>
            
            <div className="w-14 h-14 bg-white border border-violet-100 text-violet-600 rounded-2xl flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white group-hover:border-violet-600 transition-all duration-300 shadow-sm">
              <Sparkles size={26} strokeWidth={2} />
            </div>
            
            <h2 className="text-xl font-black text-slate-900 mb-3 relative z-10">{t.ai.title}</h2>
            <p className="text-[14px] text-slate-500 mb-10 relative z-10 font-medium leading-relaxed">{t.ai.desc}</p>
            <div className="mt-auto flex items-center gap-2 text-violet-600 text-[14px] font-bold relative z-10 group-hover:translate-x-2 transition-transform duration-300">
              {t.ai.btn} <ArrowRight size={18} />
            </div>
          </motion.div>

          {/* OPTION 4: AI CUSTOM PROMPT (Rose/Pink) */}
          <motion.div 
            variants={cardVariants}
            onClick={() => router.push('/teacher/create/by_user_input')}
            className={`group relative bg-gradient-to-b from-rose-50/50 to-white rounded-3xl p-8 border border-rose-100 hover:border-rose-400 hover:shadow-[0_20px_40px_-15px_rgba(244,63,94,0.2)] hover:-translate-y-2 transition-all duration-300 ease-out cursor-pointer overflow-hidden flex flex-col items-start text-left ${cardSizingClass}`}
          >
            <div className="absolute top-5 right-5 px-3 py-1 bg-white border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm group-hover:bg-rose-500 group-hover:text-white transition-colors duration-300">
              {t.aiPrompt.badge}
            </div>

            <div className="absolute -right-12 -top-12 w-40 h-40 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-colors duration-500"></div>
            
            <div className="w-14 h-14 bg-white border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white group-hover:border-rose-500 transition-all duration-300 shadow-sm">
              <Bot size={26} strokeWidth={2} />
            </div>
            
            <h2 className="text-xl font-black text-slate-900 mb-3 relative z-10">{t.aiPrompt.title}</h2>
            <p className="text-[14px] text-slate-500 mb-10 relative z-10 font-medium leading-relaxed">{t.aiPrompt.desc}</p>
            <div className="mt-auto flex items-center gap-2 text-rose-600 text-[14px] font-bold relative z-10 group-hover:translate-x-2 transition-transform duration-300">
              {t.aiPrompt.btn} <ArrowRight size={18} />
            </div>
          </motion.div>

          {/* 🟢 NEW OPTION 5: AI BY IMAGE (Amber/Gold) */}
          <motion.div 
            variants={cardVariants}
            onClick={() => router.push('/teacher/create/by_image')}
            className={`group relative bg-gradient-to-b from-amber-50/50 to-white rounded-3xl p-8 border border-amber-100 hover:border-amber-400 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.2)] hover:-translate-y-2 transition-all duration-300 ease-out cursor-pointer overflow-hidden flex flex-col items-start text-left ${cardSizingClass}`}
          >
            <div className="absolute top-5 right-5 px-3 py-1 bg-white border border-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
              {t.aiImage.badge}
            </div>

            <div className="absolute -right-12 -top-12 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors duration-500"></div>
            
            <div className="w-14 h-14 bg-white border border-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-500 transition-all duration-300 shadow-sm">
              <ImageIcon size={26} strokeWidth={2} />
            </div>
            
            <h2 className="text-xl font-black text-slate-900 mb-3 relative z-10">{t.aiImage.title}</h2>
            <p className="text-[14px] text-slate-500 mb-10 relative z-10 font-medium leading-relaxed">{t.aiImage.desc}</p>
            <div className="mt-auto flex items-center gap-2 text-amber-600 text-[14px] font-bold relative z-10 group-hover:translate-x-2 transition-transform duration-300">
              {t.aiImage.btn} <ArrowRight size={18} />
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
"use client";

import { useRouter } from "next/navigation";
import { Database, Wand2, ArrowRight, Sparkles, LayoutGrid } from "lucide-react";
import { useTeacherLanguage } from "@/app/teacher/layout"; 

// --- TRANSLATION DICTIONARY ---
const HUB_TRANSLATIONS = {
  uz: {
    title: "Qanday usulda yaratmoqchisiz?",
    subtitle: "Test yaratish uchun o'zingizga qulay usulni tanlang.",
    db: {
      badge: "Eng tez",
      title: "Edify Bazasi",
      desc: "Minglab tasdiqlangan savollardan foydalaning. Bir necha soniya ichida test tuzing.",
      btn: "Baza orqali yaratish"
    },
    custom: {
      badge: "To'liq nazorat",
      title: "Maxsus Studiya",
      desc: "O'zingizning maxsus savollaringizni yozing. Matematik klaviatura yordamida bemalol tahrirlang.",
      btn: "Studiyani ochish"
    },
    ai: {
      badge: "Yangi ✨",
      title: "AI Generator",
      desc: "Mavzuni tanlang va sun'iy intellekt siz uchun mutlaqo noyob savollarni yaratib beradi.",
      btn: "AI bilan yaratish"
    }
  },
  en: {
    title: "How do you want to build?",
    subtitle: "Choose your preferred method to create a new test.",
    db: {
      badge: "Fastest",
      title: "Edify Database",
      desc: "Browse thousands of verified questions mapped exactly to the national syllabus. Auto-generate tests in seconds.",
      btn: "Browse Database"
    },
    custom: {
      badge: "Full Control",
      title: "Custom Studio",
      desc: "Write your own questions from scratch using our visual math keyboard. Save them to your personal library.",
      btn: "Open Studio"
    },
    ai: {
      badge: "New ✨",
      title: "AI Generator",
      desc: "Select a syllabus topic and let our AI generate completely unique, curriculum-aligned questions in seconds.",
      btn: "Generate with AI"
    }
  },
  ru: {
    title: "Как вы хотите создать тест?",
    subtitle: "Выберите удобный для вас способ создания теста.",
    db: {
      badge: "Самый быстрый",
      title: "База Edify",
      desc: "Используйте тысячи проверенных вопросов. Создайте тест за несколько секунд.",
      btn: "Использовать базу"
    },
    custom: {
      badge: "Полный контроль",
      title: "Своя Студия",
      desc: "Напишите свои собственные вопросы, используя математическую клавиатуру. Сохраняйте их в библиотеку.",
      btn: "Открыть студию"
    },
    ai: {
      badge: "Новое ✨",
      title: "AI Генератор",
      desc: "Выберите тему, и наш ИИ сгенерирует абсолютно уникальные вопросы за считанные секунды.",
      btn: "Создать с ИИ"
    }
  }
};

export default function CreateHubPage() {
  const router = useRouter();
  const { lang } = useTeacherLanguage();
  const t = HUB_TRANSLATIONS[lang];

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col font-sans relative overflow-hidden">
      
      {/* Background decoration for a professional feel */}
      <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-slate-200/50 to-transparent pointer-events-none"></div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-16 max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6 text-slate-400">
            <LayoutGrid size={32} strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            {t.title}
          </h1>
          <p className="text-slate-500 text-lg md:text-xl font-medium">
            {t.subtitle}
          </p>
        </div>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl px-4">
          
          {/* OPTION 1: THE EDIFY DATABASE */}
          <div 
            onClick={() => router.push('/teacher/create/database')}
            className="group relative bg-white rounded-3xl p-8 border-2 border-slate-200 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 transition-all duration-300 ease-out cursor-pointer overflow-hidden flex flex-col items-start text-left animate-in fade-in zoom-in-95 duration-500 delay-100"
          >
            <div className="absolute top-4 right-6 px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider rounded-full group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
              {t.db.badge}
            </div>
            
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl group-hover:bg-indigo-100 transition-colors"></div>
            
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 group-hover:bg-indigo-100 transition-all">
              <Database size={28} />
            </div>
            
            <h2 className="text-2xl font-black text-slate-800 mb-3 relative z-10">
              {t.db.title}
            </h2>
            
            <p className="text-slate-500 mb-10 relative z-10 font-medium leading-relaxed">
              {t.db.desc}
            </p>

            <div className="mt-auto flex items-center gap-2 text-indigo-600 font-bold relative z-10 group-hover:translate-x-2 transition-transform">
              {t.db.btn} <ArrowRight size={18} />
            </div>
          </div>

          {/* OPTION 2: THE CUSTOM STUDIO */}
          <div 
            onClick={() => router.push('/teacher/create/custom')}
            className="group relative bg-white rounded-3xl p-8 border-2 border-slate-200 hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-2 transition-all duration-300 ease-out cursor-pointer overflow-hidden flex flex-col items-start text-left animate-in fade-in zoom-in-95 duration-500 delay-200"
          >
            <div className="absolute top-4 right-6 px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider rounded-full group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
              {t.custom.badge}
            </div>

            <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-50 rounded-full blur-3xl group-hover:bg-emerald-100 transition-colors"></div>
            
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 group-hover:bg-emerald-100 transition-all">
              <Wand2 size={28} />
            </div>
            
            <h2 className="text-2xl font-black text-slate-800 mb-3 relative z-10">
              {t.custom.title}
            </h2>
            
            <p className="text-slate-500 mb-10 relative z-10 font-medium leading-relaxed">
              {t.custom.desc}
            </p>

            <div className="mt-auto flex items-center gap-2 text-emerald-600 font-bold relative z-10 group-hover:translate-x-2 transition-transform">
              {t.custom.btn} <ArrowRight size={18} />
            </div>
          </div>

          {/* OPTION 3: AI GENERATOR */}
          <div 
            onClick={() => router.push('/teacher/create/ai')}
            className="group relative bg-white rounded-3xl p-8 border-2 border-slate-200 hover:border-violet-500 hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-2 transition-all duration-300 ease-out cursor-pointer overflow-hidden flex flex-col items-start text-left animate-in fade-in zoom-in-95 duration-500 delay-300"
          >
            <div className="absolute top-4 right-6 px-3 py-1 bg-violet-100 text-violet-700 text-xs font-black uppercase tracking-wider rounded-full shadow-sm">
              {t.ai.badge}
            </div>

            <div className="absolute -right-10 -top-10 w-40 h-40 bg-violet-50 rounded-full blur-3xl group-hover:bg-violet-100 transition-colors"></div>
            
            <div className="w-14 h-14 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 group-hover:bg-violet-100 transition-all">
              <Sparkles size={28} />
            </div>
            
            <h2 className="text-2xl font-black text-slate-800 mb-3 relative z-10">
              {t.ai.title}
            </h2>
            
            <p className="text-slate-500 mb-10 relative z-10 font-medium leading-relaxed">
              {t.ai.desc}
            </p>

            <div className="mt-auto flex items-center gap-2 text-violet-600 font-bold relative z-10 group-hover:translate-x-2 transition-transform">
              {t.ai.btn} <ArrowRight size={18} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
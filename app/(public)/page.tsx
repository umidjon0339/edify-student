'use client';

import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { 
  Rocket, BookOpen, Calculator, Globe, Brain, Palette, Zap, 
  Users, Shield, BarChart3, ChevronRight, MapPin, Mail, Phone, 
  Github, Linkedin, Send, FlaskConical, Play, Presentation, 
  GraduationCap, Smartphone 
} from 'lucide-react';
import Link from 'next/link';
import { LanguageContext } from './layout';

// --- 1. TRANSLATION DATA ---

const TRANSLATIONS = {
  uz: {
    hero: {
      badge: "✨ Ta'lim tizimining kelajagi shu yerda",
      titlePrefix: "Platforma:",
      titleHighlight: "Zamonaviy Ta'lim",
      titleSuffix: "Uchun",
      desc: "Edify o'qituvchilar va o'quvchilarni bog'laydi. Daqiqalar ichida kuchli testlar yarating, baholashni avtomatlashtiring va har bir o'quvchiga fanlarni o'zlashtirishda yordam bering.",
      btnStart: "Boshlash",
      btnLogin: "Kirish"
    },
    appShowcase: {
      title: "Edify har doim yoningizda",
      desc: "Maxsus mahalliy Android ilovalarimiz orqali platformamizning to'liq imkoniyatlaridan yo'l-yo'lakay foydalaning.",
      teacherTitle: "EdifyTeacher",
      teacherDesc: "Ixtiyoriy testlar yarating, o'quvchilar o'sishini real vaqtda kuzating va sinflaringizni to'g'ridan-to'g'ri cho'ntagingizdan boshqaring.",
      studentTitle: "EdifyStudent",
      studentDesc: "Testlarni xavfsiz ishlang, XP yig'ing, baholaringizni kuzating va istalgan vaqtda, istalgan joyda peshqadamlar ro'yxatida ko'tariling.",
      getItOn: "Yuklab oling",
      googlePlay: "Google Play"
    },
    benefits: {
      title: "Nega Edify ni tanlash kerak?",
      items: [
        { title: "O'qituvchilar uchun", desc: "Soniya ichida test tuzing, sinflarni boshqaring va jurnallarni oson eksport qiling." },
        { title: "Xavfsiz Testlar", desc: "Fokus rejimi, tab almashishni aniqlash va aralashtirilgan savollar." },
        { title: "O'quvchilar uchun", desc: "Shaxsiy o'sishni kuzating, bo'shliqlarni aniqlang va fanlarni o'zlashtiring." },
        { title: "Tezkor Natijalar", desc: "O'quvchilar uchun darhol baholash, o'qituvchilar uchun batafsil tahlil." }
      ]
    },
    features: [
      { title: "Matematika", desc: "Murakkab formulalar uchun LaTeX, bosqichma-bosqich yechimlar va avto-baholash." },
      { title: "Adabiyot", desc: "Matn tahlili va insholarni avtomatik baholash yordamida o'qishni tushunish testlari." },
      { title: "Fan (Science)", desc: "Biologiya va Fizika uchun interaktiv vizual yordamlar bilan diagrammali savollar." },
      { title: "Tillar", desc: "So'z boyligi va grammatika uchun ko'p tilli baholash (O'zbek, Rus, Ingliz)." },
      { title: "San'at & Tarix", desc: "Gumanitar fanlar uchun vizual identifikatsiya viktorinalari va xronologik baholashlar." },
      { title: "Kimyo", desc: "Interaktiv davriy jadvallar, reaksiyalarni tenglashtirish va molekulyar tuzilmalar." }
    ],
    footer: {
      desc: "Wasp-2 AI tomonidan quvvatlanadi. Maktablar va undan tashqari uchun keyingi avlod baholash vositalarini yaratish.",
      platform: "Platforma",
      contact: "Aloqa",
      rights: "Barcha huquqlar himoyalangan."
    }
  },
  en: {
    hero: {
      badge: "✨ The Future of Assessment is Here",
      titlePrefix: "The Platform for",
      titleHighlight: "Modern Education",
      titleSuffix: "",
      desc: "Edify connects teachers and students. Create powerful assessments in minutes, automate grading, and help every student master their subjects.",
      btnStart: "Get Started",
      btnLogin: "Log In"
    },
    appShowcase: {
      title: "Take Edify Anywhere",
      desc: "Experience the full power of our platform on the go with our dedicated, native Android applications.",
      teacherTitle: "EdifyTeacher",
      teacherDesc: "Create custom assessments, monitor student progress in real-time, and manage your classrooms right from your pocket.",
      studentTitle: "EdifyStudent",
      studentDesc: "Take tests securely, earn XP, track your grades, and climb the leaderboard anytime, anywhere.",
      getItOn: "Get it on",
      googlePlay: "Google Play"
    },
    benefits: {
      title: "Why Choose Edify?",
      items: [
        { title: "For Teachers", desc: "Create custom tests in seconds, manage rosters, and export gradebooks effortlessly." },
        { title: "Secure Testing", desc: "Focus-mode, tab-switching detection, and randomized questions." },
        { title: "For Students", desc: "Track personal progress, identify weak spots, and master subjects." },
        { title: "Real-time Results", desc: "Instant grading and feedback for students, detailed analytics for educators." }
      ]
    },
    features: [
      { title: "Mathematics", desc: "LaTeX support for complex formulas, step-by-step solutions, and auto-grading." },
      { title: "Literature", desc: "Reading comprehension tests with rich text analysis." },
      { title: "Science", desc: "Diagram-based questions for Biology and Physics with interactive visual aids." },
      { title: "Languages", desc: "Multilingual assessment support (Uzbek, Russian, English)." },
      { title: "Arts & History", desc: "Visual identification quizzes and timeline-based assessments." },
      { title: "Chemistry", desc: "Interactive periodic tables, reaction balancing, and molecular structures." }
    ],
    footer: {
      desc: "Powered by Wasp-2 AI. Creating the next generation of assessment tools for Schools and beyond.",
      platform: "Platform",
      contact: "Contact",
      rights: "All rights reserved."
    }
  },
  ru: {
    hero: {
      badge: "✨ Будущее системы оценивания здесь",
      titlePrefix: "Платформа для",
      titleHighlight: "Современного Образования",
      titleSuffix: "",
      desc: "Edify соединяет учителей и учеников. Создавайте мощные тесты за минуты, автоматизируйте оценивание и помогайте каждому ученику осваивать предметы.",
      btnStart: "Начать",
      btnLogin: "Войти"
    },
    appShowcase: {
      title: "Edify всегда с вами",
      desc: "Испытайте всю мощь нашей платформы в любое время и в любом месте с помощью наших нативных приложений для Android.",
      teacherTitle: "EdifyTeacher",
      teacherDesc: "Создавайте тесты, следите за прогрессом учеников в реальном времени и управляйте классами прямо с вашего телефона.",
      studentTitle: "EdifyStudent",
      studentDesc: "Безопасно проходите тесты, зарабатывайте XP, следите за оценками и поднимайтесь в таблице лидеров где угодно.",
      getItOn: "Загрузите в",
      googlePlay: "Google Play"
    },
    benefits: {
      title: "Почему выбирают Edify?",
      items: [
        { title: "Для Учителей", desc: "Создавайте тесты за секунды, управляйте списками и экспортируйте журналы." },
        { title: "Безопасные Тесты", desc: "Режим фокусировки, детектор переключения вкладок и случайные вопросы." },
        { title: "Для Учеников", desc: "Отслеживайте прогресс, выявляйте слабые места и осваивайте предметы." },
        { title: "Мгновенные Результаты", desc: "Моментальная оценка для учеников, детальная аналитика для учителей." }
      ]
    },
    features: [
      { title: "Математика", desc: "Поддержка LaTeX для формул, пошаговые решения и авто-проверка." },
      { title: "Литература", desc: "Тесты на понимание прочитанного с анализом текста." },
      { title: "Наука", desc: "Вопросы с диаграммами по биологии и физике с визуальными подсказками." },
      { title: "Языки", desc: "Мультиязычная поддержка (Узбекский, Русский, Английский)." },
      { title: "Искусство и История", desc: "Викторины с визуальной идентификацией и хронологические оценки." },
      { title: "Химия", desc: "Интерактивные таблицы Менделеева, балансировка реакций и молекулярные структуры." }
    ],
    footer: {
      desc: "При поддержке Wasp-2 AI. Создание инструментов оценки следующего поколения.",
      platform: "Платформа",
      contact: "Контакты",
      rights: "Все права защищены."
    }
  }
};

// --- 2. STATIC ASSETS & CONFIG ---

const featureConfig = [
  { icon: Calculator, gradient: "from-blue-500 to-cyan-500", delay: 0.1 },
  { icon: BookOpen, gradient: "from-emerald-500 to-teal-500", delay: 0.2 },
  { icon: Brain, gradient: "from-purple-500 to-pink-500", delay: 0.3 },
  { icon: Globe, gradient: "from-orange-500 to-red-500", delay: 0.4 },
  { icon: Palette, gradient: "from-indigo-500 to-violet-500", delay: 0.5 },
  { icon: FlaskConical, gradient: "from-teal-500 to-green-500", delay: 0.6 }
];

const benefitConfig = [
  { icon: Users },
  { icon: Shield },
  { icon: BarChart3 },
  { icon: Zap }
];

// --- 3. MAIN PAGE ---

export default function LandingPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // 🟢 CONSUME CONTEXT
  const { lang } = useContext(LanguageContext) as { lang: 'uz'|'en'|'ru' }; 
  const t = TRANSLATIONS[lang];

  // Merge static config with translated text
  const currentFeatures = featureConfig.map((f, i) => ({ ...f, ...t.features[i] }));
  const currentBenefits = benefitConfig.map((b, i) => ({ ...b, ...t.benefits.items[i] }));

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden relative">
      
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-4000" />
        <motion.div
          className="fixed w-80 h-80 bg-gradient-to-r from-purple-400/20 to-cyan-400/20 rounded-full blur-3xl pointer-events-none"
          animate={{ x: mousePosition.x - 160, y: mousePosition.y - 160 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />
      </div>

      {/* CONTENT */}
      <main className="flex-1 pt-24 lg:pt-5 relative z-10">
        
        {/* HERO SECTION */}
        <section className="max-w-7xl mx-auto px-4 lg:px-6 py-20 lg:py-32 text-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 text-cyan-400 font-bold text-sm tracking-wide">
                {t.hero.badge}
              </div>
              <h1 className="text-5xl lg:text-7xl font-black leading-tight mb-6">
                {t.hero.titlePrefix} <br/>
                <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {t.hero.titleHighlight}
                </span>
                <br/> {t.hero.titleSuffix}
              </h1>
              <p className="text-xl text-slate-300 mb-10 leading-relaxed max-w-2xl mx-auto">
                {t.hero.desc}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/signup">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2">
                      {t.hero.btnStart} <ChevronRight size={20} />
                    </motion.button>
                </Link>
                <Link href="/auth/login">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto bg-slate-800 text-white border border-slate-700 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-slate-700 hover:border-slate-600 transition-colors">
                      {t.hero.btnLogin}
                    </motion.button>
                </Link>
              </div>
            </motion.div>
        </section>

        {/* FEATURES GRID */}
        <section className="max-w-7xl mx-auto px-4 lg:px-6 py-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: feature.delay }}
                className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/60 hover:border-slate-600 transition-all group"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* PREMIUM APP DOWNLOAD SECTION */}
        <section className="max-w-7xl mx-auto px-4 lg:px-6 py-24 relative">
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="text-center mb-16 relative z-10">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-white">{t.appShowcase.title}</h2>
            <p className="text-slate-400 text-xl max-w-2xl mx-auto">
              {t.appShowcase.desc}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 relative z-10">
            
            {/* 👨‍🏫 TEACHER APP CARD */}
            <div className="group relative bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-8 md:p-10 hover:bg-slate-800/80 hover:border-indigo-500/50 transition-all duration-500 overflow-hidden flex flex-col justify-between">
              
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full transition-all group-hover:bg-indigo-500/20" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-inner">
                    <Presentation size={32} />
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/50 border border-slate-700 rounded-full px-3 py-1 text-xs font-bold text-slate-300">
                    <Smartphone size={14} /> Android
                  </div>
                </div>
                
                <h3 className="text-3xl font-black text-white mb-3">{t.appShowcase.teacherTitle}</h3>
                <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                  {t.appShowcase.teacherDesc}
                </p>
              </div>

              <a 
                href="https://play.google.com/store/apps/details?id=uz.wasp2ai.edifyteachers&pcampaignid=web_share" 
                target="_blank" 
                rel="noopener noreferrer"
                className="relative z-10 flex items-center gap-4 bg-black hover:bg-zinc-900 text-white p-2 pr-6 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-all active:scale-[0.98] w-fit"
              >
                <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center">
                  <Play size={24} fill="currentColor" className="text-emerald-400 translate-x-0.5" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">{t.appShowcase.getItOn}</span>
                  <span className="text-lg font-black leading-none mt-0.5">{t.appShowcase.googlePlay}</span>
                </div>
              </a>
            </div>

            {/* 🎓 STUDENT APP CARD */}
            <div className="group relative bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-8 md:p-10 hover:bg-slate-800/80 hover:border-cyan-500/50 transition-all duration-500 overflow-hidden flex flex-col justify-between">
              
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 blur-3xl rounded-full transition-all group-hover:bg-cyan-500/20" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-16 h-16 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center border border-cyan-500/20 shadow-inner">
                    <GraduationCap size={32} />
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/50 border border-slate-700 rounded-full px-3 py-1 text-xs font-bold text-slate-300">
                    <Smartphone size={14} /> Android
                  </div>
                </div>
                
                <h3 className="text-3xl font-black text-white mb-3">{t.appShowcase.studentTitle}</h3>
                <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                  {t.appShowcase.studentDesc}
                </p>
              </div>

              <a 
                href="https://play.google.com/store/apps/details?id=uz.wasp2ai.edifystudent&pcampaignid=web_share" 
                target="_blank" 
                rel="noopener noreferrer"
                className="relative z-10 flex items-center gap-4 bg-black hover:bg-zinc-900 text-white p-2 pr-6 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-all active:scale-[0.98] w-fit"
              >
                <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center">
                  <Play size={24} fill="currentColor" className="text-cyan-400 translate-x-0.5" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">{t.appShowcase.getItOn}</span>
                  <span className="text-lg font-black leading-none mt-0.5">{t.appShowcase.googlePlay}</span>
                </div>
              </a>
            </div>

          </div>
        </section>

        {/* BENEFITS SECTION */}
        <section className="max-w-7xl mx-auto px-4 lg:px-6 py-20">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-black mb-12">{t.benefits.title}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {currentBenefits.map((benefit, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                    <benefit.icon className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-slate-400">{benefit.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-800 pt-16 pb-8 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            
            {/* 1. Company Info & Socials */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Rocket className="w-6 h-6 text-white" />
                </div>
                <span className="font-black text-xl bg-gradient-to-r from-white to-cyan-400 bg-clip-text text-transparent">
                  Edify.
                </span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-sm">
                {t.footer.desc}
              </p>
              
              <div className="flex gap-5">
                <motion.a 
                  href="https://github.com/Wasp-2-AI" 
                  target="_blank"
                  className="w-12 h-12 rounded-xl bg-slate-800/70 flex items-center justify-center text-slate-400 hover:text-white hover:bg-gradient-to-br hover:from-purple-600 hover:to-cyan-500 transition-all border border-slate-700/50"
                  whileHover={{ y: -4, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Github className="w-6 h-6" />
                </motion.a>
                <motion.a 
                  href="https://www.linkedin.com/company/wasp-2-ai" 
                  target="_blank"
                  className="w-12 h-12 rounded-xl bg-slate-800/70 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-gradient-to-br hover:from-blue-600 hover:to-cyan-500 transition-all border border-slate-700/50"
                  whileHover={{ y: -4, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Linkedin className="w-6 h-6" />
                </motion.a>
                <motion.a 
                  href="https://t.me/umidjon0339" 
                  target="_blank"
                  className="w-12 h-12 rounded-xl bg-slate-800/70 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-gradient-to-br hover:from-cyan-600 hover:to-teal-500 transition-all border border-slate-700/50"
                  whileHover={{ y: -4, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Send className="w-6 h-6 -ml-0.5 mt-0.5" /> 
                </motion.a>
              </div>
            </div>

            {/* 2. Platform Links */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-white">{t.footer.platform}</h3>
              <ul className="space-y-3">
                {['For Teachers', 'For Students', 'Features', 'Pricing', 'Login'].map((link) => (
                  <motion.li key={link}>
                    <a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors hover:underline">
                      {link}
                    </a>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* 3. Contact & Map */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-white">{t.footer.contact}</h3>
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-cyan-400 shrink-0" />
                  <span className="text-slate-400 text-sm">Afrosiyob koʻchasi, 15/2, Tashkent</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-cyan-400 shrink-0" />
                  <span className="text-slate-400 text-sm">u.jumaqulov@newuu.uz</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-cyan-400 shrink-0" />
                  <span className="text-slate-400 text-sm">+998 33 860 20 06</span>
                </div>
              </div>
              
              <div className="rounded-xl overflow-hidden h-40 w-full border border-slate-700/50 shadow-lg grayscale hover:grayscale-0 transition-all duration-500 relative group">
                <iframe 
                  src="https://maps.google.com/maps?q=41.296837,69.272712&t=&z=15&ie=UTF8&iwloc=&output=embed" 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen 
                  loading="lazy"
                  className="opacity-70 group-hover:opacity-100 transition-opacity"
                ></iframe>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-700/50 text-center text-slate-500 text-sm">
            <p>© {new Date().getFullYear()} Wasp-2 AI Solutions. {t.footer.rights}</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
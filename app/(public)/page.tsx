'use client';

import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { 
  Rocket, BookOpen, Calculator, Globe, Brain, Palette, Zap, 
  Users, Shield, BarChart3, ChevronRight, MapPin, Mail, Phone, 
  Github, Linkedin, Send, FlaskConical, Play, Presentation, 
  GraduationCap, Smartphone, Wand2, BrainCircuit, Lightbulb, 
  LineChart, FileDown, CheckCircle2, UserCheck, Layout,
  FileText, CheckCircle,Sparkles,
  BarChart2
} from 'lucide-react';
import Link from 'next/link';
import { LanguageContext } from './layout';

const TRANSLATIONS = {
  uz: {
    hero: {
      badge: "🎉 O'zbekistonning yangi ta'lim platformasi",
      titlePrefix: "Ta'limni",
      titleHighlight: "Raqamlashtirish",
      titleSuffix: "Vaqti Keldi",
      desc: "O'quv markazlari, xususiy maktablar va repetitorlar uchun yagona tizim. Qog'ozbozliksiz testlar, avtomatik baholash va AI yordamchi bilan vaqtingizni tejang.",
      btnStart: "Bepul Boshlash",
      btnLogin: "Tizimga Kirish",
      trusted: "100+ o'quv markazlari va repetitorlar tanlovi",
      card1: { title: "Avtomatik baholash", desc: "Testlar soniyalarda tekshiriladi" },
      card2: { title: "Kimlar uchun?", items: ["🏢 Xususiy maktablar", "🏫 O'quv markazlari", "👨‍🏫 Repetitorlar", "🎓 O'quvchilar"] },
      card3: { title: "Edify AI Yordamchi", desc: "Testlarni 10x tezroq yarating" }
    },
    globalLibrary: {
      badge: "YANGI IMKONIYAT",
      title: "Xalqaro Ta'lim Dasturlari Kutubxonasi",
      desc: "AQSh va mahalliy ta'lim standartlari (B.E.S.T. va boshqalar) asosidagi ochiq darsliklar va qo'llanmalarni bepul o'qing. O'quvchilaringizga eng yaxshi bilimlarni bering.",
      button: "Kutubxonaga o'tish"
    },
    stats: {
      badge: "Statistika",
      titlePrefix: "Raqamlarda",
      titleHighlight: "Edify",
      items: [
        { number: "100K+", label: "Kiritilgan testlar", desc: "Bazaga qo'shilgan savollar" },
        { number: "300+", label: "Foydalanuvchilar", desc: "Ustozlar va o'quvchilar" },
        { number: "3", label: "Ta'lim tili", desc: "O'zbek, Rus va Ingliz" },
        { number: "100%", label: "Batafsil yechimlar", desc: "Har bir savol uchun izoh" }
      ]
    },
    capabilities: {
      title: "Platforma imkoniyatlari",
      subtitle: "Bilim berish va olishning zamonaviy usuli",
      items: [
        { title: "Ustozlar paneli", desc: "BSB, ChSB va darslik materiallarini yaratish va boshqarish" },
        { title: "O'quvchi rejimi", desc: "Testlarni ishlash, XP yig'ish va reytingda ko'tarilish" },
        { title: "AI Test yaratish", desc: "Sun'iy intellekt yordamida soniyalar ichida test tuzish" },
        { title: "Barcha fanlar", desc: "Matematika, aniq va gumanitar fanlar bo'yicha testlar" },
        { title: "Avtomatik baholash", desc: "Testlarni qo'lda tekshirishni unuting, tizim o'zi baholaydi" },
        { title: "Chuqur Tahlil", desc: "Sinf va o'quvchilarning o'zlashtirish grafiklari" },
        { title: "Oson Eksport", desc: "Natijalar va jurnallarni Excel yoki PDF formatida yuklab olish" },
        { title: "Xavfsiz Sinovlar", desc: "Ko'chirishni oldini olish va ekran nazorati tizimi" }
      ]
    },
    aiSection: {
      badge: "AI Powered",
      title: "Edify AI Yordamchi",
      desc: "Sun'iy intellekt yordamida siz testlarni tezroq va samaraliroq yaratishingiz mumkin. Edify AI sizning shaxsiy yordamchingiz!",
      items: [
        { title: "AI test yaratish", desc: "Istalgan mavzu yoki fan bo'yicha avtomatik testlar tuzib beradi. Savollar, javob variantlari va tushuntirishlar tayyor bo'ladi." },
        { title: "Aqlli tushuntirishlar", desc: "O'quvchi xato qilgan har bir savol uchun AI tomonidan qadam-ba-qadam yechimlar va izohlar taqdim etiladi." },
        { title: "Shaxsiylashtirish", desc: "O'quvchilarning oldingi natijalarini tahlil qiladi va aynan ular qiynaladigan mavzularga mos testlarni tavsiya qiladi." }
      ]
    },
    appShowcase: {
      title: "Edify doim yoningizda",
      desc: "O'quv jarayonini to'xtatmang. O'qituvchi va o'quvchilar uchun maxsus yaratilgan mobil ilovalarimizni yuklab oling.",
      teacherTitle: "Edify Teacher",
      teacherDesc: "Testlarni telefoningizdan yarating, o'quvchilar natijalarini kuzating va jurnallarni yuritishni avtomatlashtiring.",
      studentTitle: "Edify Student",
      studentDesc: "Uy vazifalarini ishlang, DTM testlariga tayyorlaning va respublika bo'ylab reytingda o'z o'rningizni toping.",
      getItOn: "Yuklab oling",
      googlePlay: "Google Play"
    },
    footer: {
      desc: "Wasp-2 AI tomonidan O'zbekiston ta'lim tizimi uchun maxsus ishlab chiqilgan innovatsion platforma.",
      platform: "Platforma",
      contact: "Aloqa",
      rights: "Barcha huquqlar himoyalangan."
    }
  },

  // --- ENGLISH TRANSLATION ---
  en: {
    hero: {
      badge: "🎉 Uzbekistan's new educational platform",
      titlePrefix: "The Time to",
      titleHighlight: "Digitize",
      titleSuffix: "Education is Now",
      desc: "An all-in-one system for learning centers, private schools, and tutors. Save time with paperless tests, automated grading, and an AI assistant.",
      btnStart: "Start for Free",
      btnLogin: "Log In",
      trusted: "Trusted by 100+ learning centers and tutors",
      card1: { title: "Automated Grading", desc: "Tests checked in seconds" },
      card2: { title: "For Whom?", items: ["🏢 Private Schools", "🏫 Learning Centers", "👨‍🏫 Tutors", "🎓 Students"] },
      card3: { title: "Edify AI Assistant", desc: "Create tests 10x faster" }
    },
    globalLibrary: {
      badge: "NEW FEATURE",
      title: "Global Curriculum Library",
      desc: "Access curated open educational resources and standardized textbooks (like Florida B.E.S.T.) from the USA and locally. Provide your students with world-class materials.",
      button: "Explore Library"
    },
    stats: {
      badge: "Statistics",
      titlePrefix: "Edify in",
      titleHighlight: "Numbers",
      items: [
        { number: "100K+", label: "Generated Tests", desc: "Questions added to database" },
        { number: "300+", label: "Active Users", desc: "Teachers and students" },
        { number: "3", label: "Languages", desc: "Uzbek, Russian & English" },
        { number: "100%", label: "Detailed Solutions", desc: "Explanations for every question" }
      ]
    },
    capabilities: {
      title: "Platform Capabilities",
      subtitle: "The modern way to teach and learn",
      items: [
        { title: "Teacher Dashboard", desc: "Create and manage assessments and course materials" },
        { title: "Student Mode", desc: "Take tests, earn XP, and climb the leaderboard" },
        { title: "AI Test Generation", desc: "Create tests in seconds using artificial intelligence" },
        { title: "All Subjects", desc: "Tests covering mathematics, exact, and humanities sciences" },
        { title: "Automated Grading", desc: "Forget manual grading, the system evaluates instantly" },
        { title: "Deep Analytics", desc: "Performance graphs for classes and individual students" },
        { title: "Easy Export", desc: "Download results and gradebooks in Excel or PDF formats" },
        { title: "Secure Testing", desc: "Anti-cheat and screen monitoring system" }
      ]
    },
    aiSection: {
      badge: "AI Powered",
      title: "Edify AI Assistant",
      desc: "Create tests faster and more efficiently with Artificial Intelligence. Edify AI is your personal teaching assistant!",
      items: [
        { title: "AI Test Generator", desc: "Automatically generates tests for any topic or subject. Questions, multiple choices, and explanations are ready instantly." },
        { title: "Smart Explanations", desc: "Step-by-step solutions and explanations provided by AI for every mistake a student makes." },
        { title: "Personalization", desc: "Analyzes past student performance and recommends tests tailored specifically to their weak points." }
      ]
    },
    appShowcase: {
      title: "Edify is always with you",
      desc: "Never pause your learning process. Download our dedicated mobile apps built for teachers and students.",
      teacherTitle: "Edify Teacher",
      teacherDesc: "Create tests from your phone, track student results, and automate gradebook management.",
      studentTitle: "Edify Student",
      studentDesc: "Do your homework, prepare for university exams, and find your spot in the nationwide leaderboard.",
      getItOn: "Get it on",
      googlePlay: "Google Play"
    },
    
    footer: {
      desc: "An innovative platform specially developed for the Uzbekistan education system by Wasp-2 AI.",
      platform: "Platform",
      contact: "Contact",
      rights: "All rights reserved."
    }
  },

  // --- RUSSIAN TRANSLATION ---
  ru: {
    hero: {
      badge: "🎉 Новая образовательная платформа Узбекистана",
      titlePrefix: "Пришло Время",
      titleHighlight: "Оцифровать",
      titleSuffix: "Образование",
      desc: "Единая система для учебных центров, частных школ и репетиторов. Экономьте время с тестами без бумаги, автопроверкой и ИИ-помощником.",
      btnStart: "Начать Бесплатно",
      btnLogin: "Войти в систему",
      trusted: "Нам доверяют 100+ учебных центров и репетиторов",
      card1: { title: "Автопроверка", desc: "Тесты проверяются за секунды" },
      card2: { title: "Для кого?", items: ["🏢 Частные школы", "🏫 Учебные центры", "👨‍🏫 Репетиторы", "🎓 Ученики"] },
      card3: { title: "Edify AI Помощник", desc: "Создавайте тесты в 10 раз быстрее" }
    },

    globalLibrary: {
      badge: "НОВАЯ ФУНКЦИЯ",
      title: "Библиотека Глобальных Программ",
      desc: "Изучайте открытые учебные материалы и стандартизированные учебники (США и местные). Дайте своим ученикам знания мирового уровня.",
      button: "Перейти в библиотеку"
    },
    
    stats: {
      badge: "Статистика",
      titlePrefix: "Edify в",
      titleHighlight: "Цифрах",
      items: [
        { number: "100K+", label: "Созданных тестов", desc: "Вопросов добавлено в базу" },
        { number: "300+", label: "Пользователей", desc: "Учителей и учеников" },
        { number: "3", label: "Языка обучения", desc: "Узбекский, Русский и Английский" },
        { number: "100%", label: "Подробные решения", desc: "Объяснение к каждому вопросу" }
      ]
    },
    capabilities: {
      title: "Возможности платформы",
      subtitle: "Современный способ обучения и преподавания",
      items: [
        { title: "Панель учителя", desc: "Создание и управление учебными материалами и экзаменами" },
        { title: "Режим ученика", desc: "Проходите тесты, зарабатывайте XP и поднимайтесь в рейтинге" },
        { title: "AI Создание тестов", desc: "Создавайте тесты за секунды с помощью искусственного интеллекта" },
        { title: "Все предметы", desc: "Тесты по математике, точным и гуманитарным наукам" },
        { title: "Автоматическая проверка", desc: "Забудьте о ручной проверке, система оценивает сама" },
        { title: "Глубокая аналитика", desc: "Графики успеваемости классов и отдельных учеников" },
        { title: "Легкий экспорт", desc: "Скачивайте результаты и журналы в формате Excel или PDF" },
        { title: "Безопасное тестирование", desc: "Защита от списывания и система контроля экрана" }
      ]
    },
    aiSection: {
      badge: "На базе ИИ",
      title: "Edify AI Помощник",
      desc: "Создавайте тесты быстрее и эффективнее с помощью Искусственного Интеллекта. Edify AI — ваш личный помощник!",
      items: [
        { title: "Генератор тестов ИИ", desc: "Автоматически создает тесты по любой теме или предмету. Вопросы, варианты ответов и объяснения готовы моментально." },
        { title: "Умные объяснения", desc: "Пошаговые решения и объяснения от ИИ для каждой ошибки, допущенной учеником." },
        { title: "Персонализация", desc: "Анализирует прошлые результаты учеников и рекомендует тесты, адаптированные к их слабым местам." }
      ]
    },
    appShowcase: {
      title: "Edify всегда с вами",
      desc: "Не прерывайте учебный процесс. Скачайте наши специальные мобильные приложения для учителей и учеников.",
      teacherTitle: "Edify Teacher",
      teacherDesc: "Создавайте тесты с телефона, следите за результатами учеников и автоматизируйте ведение журнала.",
      studentTitle: "Edify Student",
      studentDesc: "Выполняйте домашние задания, готовьтесь к экзаменам ВУЗов и занимайте места в республиканском рейтинге.",
      getItOn: "Загрузите в",
      googlePlay: "Google Play"
    },
    footer: {
      desc: "Инновационная платформа, специально разработанная для системы образования Узбекистана компанией Wasp-2 AI.",
      platform: "Платформа",
      contact: "Контакты",
      rights: "Все права защищены."
    }
  }
};

// --- 2. CONFIGURATIONS ---

// The Light, Colorful Grid Config (Like Edu-zon "Platforma imkoniyatlari")
const capabilityIcons = [
  { icon: Layout, color: "bg-blue-500", shadow: "shadow-blue-500/30" },
  { icon: UserCheck, color: "bg-emerald-500", shadow: "shadow-emerald-500/30" },
  { icon: Wand2, color: "bg-purple-500", shadow: "shadow-purple-500/30" },
  { icon: BookOpen, color: "bg-amber-500", shadow: "shadow-amber-500/30" },
  { icon: CheckCircle2, color: "bg-rose-500", shadow: "shadow-rose-500/30" },
  { icon: LineChart, color: "bg-indigo-500", shadow: "shadow-indigo-500/30" },
  { icon: FileDown, color: "bg-cyan-500", shadow: "shadow-cyan-500/30" },
  { icon: Shield, color: "bg-teal-500", shadow: "shadow-teal-500/30" },
];

const statConfig = [
  { icon: FileText, color: "bg-blue-500", shadow: "shadow-blue-500/40", border: "border-l-blue-500" },
  { icon: Users, color: "bg-indigo-500", shadow: "shadow-indigo-500/40", border: "border-l-indigo-500" },
  { icon: Globe, color: "bg-fuchsia-500", shadow: "shadow-fuchsia-500/40", border: "border-l-fuchsia-500" },
  { icon: CheckCircle, color: "bg-emerald-500", shadow: "shadow-emerald-500/40", border: "border-l-emerald-500" },
];

// The Dark AI Section Config
const aiIcons = [
  { icon: Wand2 },
  { icon: BrainCircuit },
  { icon: Lightbulb }
];

// --- 3. MAIN COMPONENT ---

export default function LandingPage() {
  const { lang } = useContext(LanguageContext) as { lang: 'uz'|'en'|'ru' }; 
  const t = TRANSLATIONS[lang] || TRANSLATIONS['uz']; 

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      
      <main className="flex-1 pt-24 lg:pt-16 relative z-10">
        
        {/* HERO SECTION (Split Layout: Left Text, Right Visual Cards) */}
        <section className="max-w-7xl mx-auto px-4 lg:px-8 pt-12 lg:pt-20 pb-16 relative z-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* ⬅️ CHAP TOMON: Asosiy Matn va Tugmalar */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left pt-10 lg:pt-0"
            >
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-bold text-sm tracking-wide shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                {t.hero.badge}
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-[4rem] font-black leading-[1.1] mb-6 tracking-tight text-slate-900">
                {t.hero.titlePrefix} <br className="hidden lg:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  {t.hero.titleHighlight}
                </span>
                <br className="hidden lg:block"/> {t.hero.titleSuffix}
              </h1>
              
              <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium">
                {t.hero.desc}
              </p>
              
              {/* Harakatga chaqiruvchi tugmalar (CTAs) */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center mb-8">
                <Link href="/auth/signup" className="w-full sm:w-auto">
                    <button className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-xl text-[17px] font-bold shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2">
                      {t.hero.btnStart} <ChevronRight size={20} />
                    </button>
                </Link>
                <Link href="/auth/login" className="w-full sm:w-auto">
                    <button className="w-full sm:w-auto bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl text-[17px] font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                      {t.hero.btnLogin}
                    </button>
                </Link>
              </div>

              {/* Ishonch belgisi (Social Proof) */}
              <div className="flex items-center justify-center lg:justify-start gap-4 text-sm font-bold text-slate-500">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[#FAFAFA] bg-slate-200 flex items-center justify-center overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i+10}`} alt="User" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <span>{t.hero.trusted}</span>
              </div>
            </motion.div>

            {/* ➡️ O'NG TOMON: Suzib yuruvchi kartochkalar (Visual Proof) */}
            <div className="relative w-full h-[500px] lg:h-[600px] hidden md:flex items-center justify-center perspective-1000">
              
              {/* Orqa fondagi yorug'lik effekti */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-gradient-to-tr from-blue-100 to-indigo-50 rounded-full blur-[80px] -z-10" />

              {/* 1-Karta: Avtomatik baholash (Yuqori o'ng) */}
              <motion.div 
                initial={{ opacity: 0, y: 20, rotate: 5 }}
                animate={{ opacity: 1, y: 0, rotate: 5 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="absolute top-10 right-4 bg-white p-5 rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100/80 w-64 backdrop-blur-sm z-10"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="font-bold text-slate-800 leading-tight">
                    {t.hero.card1.title}
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="w-[85%] h-full bg-emerald-400 rounded-full"></div>
                </div>
                <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-wide">{t.hero.card1.desc}</p>
              </motion.div>

              {/* 2-Karta: Asosiy Auditoriya (O'rta chap) */}
              <motion.div 
                initial={{ opacity: 0, x: 30, rotate: -3 }}
                animate={{ opacity: 1, x: 0, rotate: -3 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="absolute top-1/2 left-0 -translate-y-1/2 bg-white p-6 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] border border-slate-100 w-72 z-20"
              >
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">
                  {t.hero.card2.title}
                </h3>
                <div className="space-y-3">
                  {t.hero.card2.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                      <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={14} />
                      </div>
                      <span className="font-bold text-slate-700 text-[15px]">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* 3-Karta: AI Yordamchi (Pastki o'ng) */}
              <motion.div 
                initial={{ opacity: 0, y: -20, rotate: 2 }}
                animate={{ opacity: 1, y: 0, rotate: 2 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="absolute bottom-16 right-10 bg-slate-900 p-5 rounded-2xl shadow-[0_20px_40px_-15px_rgba(59,130,246,0.2)] border border-slate-800 w-64 z-30"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shadow-inner border border-blue-500/30">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div className="font-black text-white leading-tight">
                      {t.hero.card3.title}
                    </div>
                    <div className="text-[11px] font-bold text-blue-400 mt-0.5">{t.hero.card3.desc}</div>
                  </div>
                </div>
                {/* AI skeleton loader animation */}
                <div className="mt-4 space-y-2">
                  <div className="h-2 w-full bg-slate-800 rounded-full animate-pulse"></div>
                  <div className="h-2 w-2/3 bg-slate-800 rounded-full animate-pulse delay-75"></div>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        

        {/* 🟢 UPGRADED: EDU-ZON STYLE STATISTICS SECTION */}
        <section className="relative z-20 max-w-7xl mx-auto px-4 lg:px-8 py-16 bg-[#F8FAFC]">
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-blue-600 text-[11px] font-bold mb-4 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {t.stats.badge}
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              {t.stats.titlePrefix} <span className="text-blue-600">{t.stats.titleHighlight}</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.stats.items.map((stat, index) => {
              const Config = statConfig[index];
              return (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all border-l-4 ${Config.border} flex flex-col group`}
                >
                  {/* Ikonka */}
                  <div className={`w-12 h-12 rounded-xl ${Config.color} text-white flex items-center justify-center shadow-lg ${Config.shadow} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <Config.icon size={22} />
                  </div>
                  
                  {/* Raqam */}
                  <div className="text-3xl md:text-4xl font-black text-slate-900 mb-1 tracking-tight">
                    {stat.number}
                  </div>
                  
                  {/* Sarlavha (Kiritilgan testlar) */}
                  <div className="text-[14px] font-bold text-slate-700 mb-1">
                    {stat.label}
                  </div>
                  
                  {/* Izoh matni (Bazaga qo'shilgan savollar) */}
                  <p className="text-[12px] text-slate-400 font-medium">
                    {stat.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* 🟢 NEW: PLATFORM CAPABILITIES GRID (Light, Colorful, like Edu-zon) */}
        <section className="bg-white py-24 relative z-20">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">{t.capabilities.title}</h2>
              <p className="text-slate-500 font-medium text-lg">{t.capabilities.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {t.capabilities.items.map((item, index) => {
                const IconConfig = capabilityIcons[index];
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-3xl p-8 flex flex-col items-center text-center shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all border border-slate-100 group cursor-default"
                  >
                    <div className={`w-16 h-16 rounded-2xl ${IconConfig.color} text-white flex items-center justify-center mb-6 shadow-lg ${IconConfig.shadow} group-hover:-translate-y-1 transition-transform duration-300`}>
                      <IconConfig.icon size={28} />
                    </div>
                    <h3 className="text-[17px] font-black mb-2.5 text-slate-900 leading-tight">{item.title}</h3>
                    <p className="text-slate-500 text-[14px] leading-relaxed font-medium">{item.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 🟢 UPGRADED: LIVE AI ASSISTANT SECTION */}
        <section className="bg-[#0A0F1C] relative py-24 overflow-hidden z-20">
          
          {/* 1. Nafas Oluvchi Fon (Animated Background Glows) */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none animate-[pulse_6s_ease-in-out_infinite]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none animate-[pulse_8s_ease-in-out_infinite_reverse]" />
          
          {/* Qo'shimcha markaziy yorug'lik */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-500/5 rounded-[100%] blur-[100px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/80 text-cyan-400 text-[11px] font-bold mb-6 shadow-inner backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                {t.aiSection.badge}
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                {t.aiSection.title}
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium leading-relaxed">
                {t.aiSection.desc}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {t.aiSection.items.map((item, index) => {
                const IconConfig = aiIcons[index];
                return (
                  <motion.div 
                    key={index} 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.2 }} // Staggered entrance
                    className="relative overflow-hidden bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 group hover:bg-slate-800/60 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.15)] flex flex-col justify-between"
                  >
                    {/* 2. Sehrli Chegara (Animated Top Border) */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left opacity-0 group-hover:opacity-100" />
                    
                    <div>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-cyan-400 flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                        <IconConfig.icon size={24} />
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-white group-hover:text-cyan-50 transition-colors">{item.title}</h3>
                      <p className="text-slate-400 text-[15px] leading-relaxed group-hover:text-slate-300 transition-colors">
                        {item.desc}
                      </p>
                    </div>

                    {/* 4. Tirik Jarayon (Live Micro-animation on Hover) */}
                    <div className="mt-8 flex items-center gap-1.5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                      <div className="flex gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-[bounce_1s_infinite_0ms]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-[bounce_1s_infinite_150ms]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-[bounce_1s_infinite_300ms]" />
                      </div>
                      <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest ml-2">
                        Tizim jarayonda...
                      </span>
                    </div>

                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 🟢 NEW: GLOBAL LIBRARY BANNER (Shorter, highly attractive bridge section) */}
        <section className="bg-[#F8FAFC] pt-24 pb-12 relative z-20 px-4 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded-[2.5rem] bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 overflow-hidden shadow-2xl shadow-indigo-500/20 flex flex-col lg:flex-row items-center justify-between p-8 md:p-12 lg:p-16 border border-indigo-400/30"
            >
              {/* Abstract Background Glows */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none translate-x-1/3 -translate-y-1/3" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none -translate-x-1/3 translate-y-1/3" />

              {/* Left Side: Content */}
              <div className="relative z-10 lg:w-3/5 text-center lg:text-left mb-10 lg:mb-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-cyan-300 text-[10px] font-black uppercase tracking-widest mb-6 backdrop-blur-md">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                  </span>
                  {t.globalLibrary.badge}
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-5 tracking-tight leading-tight">
                  {t.globalLibrary.title}
                </h2>
                <p className="text-indigo-100 text-[15px] md:text-[17px] font-medium leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8">
                  {t.globalLibrary.desc}
                </p>
                <Link 
                  href="/teacher/online-books" 
                  className="inline-flex items-center gap-2 bg-white text-indigo-600 hover:bg-slate-50 font-black py-3.5 px-8 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 group"
                >
                  <Globe size={20} className="group-hover:rotate-12 transition-transform duration-300" />
                  {t.globalLibrary.button}
                </Link>
              </div>

              {/* Right Side: Floating Books & Flags Illusion */}
              <div className="relative z-10 w-full lg:w-2/5 h-64 lg:h-full flex items-center justify-center">
                
                {/* Center Book Icon */}
                <div className="absolute z-30 w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center border-4 border-indigo-100 animate-[bounce_4s_infinite]">
                  <BookOpen size={40} className="text-indigo-600" />
                </div>

                {/* USA Floating Tag */}
                <div className="absolute z-20 -top-4 right-10 md:right-20 lg:right-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-white/50 flex items-center gap-2 animate-[bounce_5s_infinite_0.5s]">
                  <span className="text-xl">🇺🇸</span>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Curriculum</p>
                    <p className="text-sm font-bold text-slate-800 leading-tight">USA B.E.S.T.</p>
                  </div>
                </div>

                {/* UZB Floating Tag */}
                <div className="absolute z-20 bottom-0 left-10 md:left-20 lg:left-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-white/50 flex items-center gap-2 animate-[bounce_6s_infinite_1s]">
                  <span className="text-xl">🇺🇿</span>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Standart</p>
                    <p className="text-sm font-bold text-slate-800 leading-tight">O'zbekiston</p>
                  </div>
                </div>

                {/* Math/Subject Floating Tag */}
                <div className="absolute z-10 top-1/2 -right-4 lg:-right-8 bg-indigo-900/40 backdrop-blur-xl px-4 py-3 rounded-2xl shadow-2xl border border-indigo-400/30 flex items-center gap-3 animate-[bounce_4.5s_infinite_0.2s]">
                  <div className="bg-cyan-400/20 p-1.5 rounded-lg text-cyan-300">
                    <BarChart2 size={16} />
                  </div>
                  <p className="text-sm font-bold text-white tracking-wide">Algebra & Geometry</p>
                </div>

              </div>
            </motion.div>
          </div>
        </section>

        {/* 🟢 UPGRADED: MOBILE APPS SECTION (Premium & Highly Attractive) */}
        <section className="bg-[#F8FAFC] py-24 relative z-20 border-t border-slate-100 overflow-hidden">
          
          {/* Orqa fon bezaklari */}
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-50/50 to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-emerald-50/50 to-transparent pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black mb-5 text-slate-900 tracking-tight">{t.appShowcase.title}</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium leading-relaxed">
                {t.appShowcase.desc}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              
              {/* 👨‍🏫 TEACHER APP CARD (Blue Theme with Mockup Edge) */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="group relative bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-200 overflow-hidden hover:shadow-[0_20px_60px_-15px_rgba(37,99,235,0.15)] hover:border-blue-200 transition-all duration-500"
              >
                {/* Abstrakt Telefon (Phone Mockup Illusion) */}
                <div className="absolute -bottom-16 -right-10 w-64 h-80 bg-slate-50 rounded-[2rem] border-8 border-slate-100 shadow-2xl rotate-12 group-hover:rotate-6 group-hover:-translate-y-4 transition-all duration-500 opacity-40 sm:opacity-100 hidden sm:block">
                  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-50 to-white flex flex-col p-4 border border-blue-100">
                    <div className="w-1/2 h-2 bg-slate-200 mx-auto rounded-b-lg -mt-4 mb-4" /> {/* Notch */}
                    <div className="w-full h-12 bg-white rounded-xl mb-3 shadow-sm border border-slate-100" />
                    <div className="w-full h-12 bg-white rounded-xl mb-3 shadow-sm border border-slate-100" />
                    <div className="w-full h-full bg-white rounded-xl shadow-sm border border-slate-100" />
                  </div>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
                      <Presentation size={32} />
                    </div>
                    {/* Social Proof Badge */}
                    <div className="bg-amber-50 text-amber-600 border border-amber-200/50 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                      ⭐ 4.9 Baho
                    </div>
                  </div>
                  
                  <h3 className="text-3xl font-black text-slate-900 mb-4">{t.appShowcase.teacherTitle}</h3>
                  <p className="text-slate-500 text-[16px] mb-12 leading-relaxed font-medium max-w-[280px]">
                    {t.appShowcase.teacherDesc}
                  </p>

                  <a href="https://play.google.com/store/apps/details?id=uz.wasp2ai.edifyteachers" target="_blank" className="flex items-center gap-3 bg-slate-900 hover:bg-black text-white p-2.5 pr-6 rounded-2xl transition-transform hover:-translate-y-1 shadow-md hover:shadow-xl w-fit group/btn border border-slate-800">
                    {/* ORIGINAL GOOGLE PLAY SVG */}
                    <div className="w-10 h-10 ml-1 flex items-center justify-center">
                      <svg viewBox="0 0 512 512" className="w-8 h-8">
                        <path fill="#00E676" d="M46.7 34.6c-1.3 1.9-2.1 4.5-2.1 7.6v427.6c0 3.1.8 5.7 2.1 7.6l.3.2 242.3-241.6v-2.1l-242.3-241.6-.3.2z"/>
                        <path fill="#FFEA00" d="M289.3 234.3l-59-58.8-183.3-183.3c-2.3-2.3-5.2-3.1-7.8-2.6l239.9 138.5 10.2 106.2z"/>
                        <path fill="#FF3D00" d="M289.3 277.7l-10.2 106.2L39.2 522.4c2.6.5 5.5-.3 7.8-2.6l183.3-183.3 59-58.8z"/>
                        <path fill="#29B6F6" d="M289.3 234.3l10.2-106.2L453.6 217c8.5 4.8 8.5 12.8 0 17.7l-154.1 88.9-10.2-106.2z"/>
                      </svg>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-0.5 group-hover/btn:text-slate-300 transition-colors">{t.appShowcase.getItOn}</span>
                      <span className="text-lg font-black leading-none">{t.appShowcase.googlePlay}</span>
                    </div>
                  </a>
                </div>
              </motion.div>

              {/* 🎓 STUDENT APP CARD (Emerald Theme with Mockup Edge) */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="group relative bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-200 overflow-hidden hover:shadow-[0_20px_60px_-15px_rgba(16,185,129,0.15)] hover:border-emerald-200 transition-all duration-500"
              >
                {/* Abstrakt Telefon (Phone Mockup Illusion) */}
                <div className="absolute -bottom-16 -right-10 w-64 h-80 bg-slate-50 rounded-[2rem] border-8 border-slate-100 shadow-2xl -rotate-12 group-hover:-rotate-6 group-hover:-translate-y-4 transition-all duration-500 opacity-40 sm:opacity-100 hidden sm:block">
                  <div className="w-full h-full rounded-2xl bg-gradient-to-bl from-emerald-50 to-white flex flex-col p-4 border border-emerald-100">
                    <div className="w-1/2 h-2 bg-slate-200 mx-auto rounded-b-lg -mt-4 mb-4" /> {/* Notch */}
                    <div className="w-full h-12 bg-white rounded-xl mb-3 shadow-sm border border-slate-100" />
                    <div className="w-full h-12 bg-white rounded-xl mb-3 shadow-sm border border-slate-100" />
                    <div className="w-full h-full bg-white rounded-xl shadow-sm border border-slate-100" />
                  </div>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm">
                      <GraduationCap size={32} />
                    </div>
                    {/* Social Proof Badge */}
                    <div className="bg-amber-50 text-amber-600 border border-amber-200/50 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                      🔥 5.0 Baho
                    </div>
                  </div>
                  
                  <h3 className="text-3xl font-black text-slate-900 mb-4">{t.appShowcase.studentTitle}</h3>
                  <p className="text-slate-500 text-[16px] mb-12 leading-relaxed font-medium max-w-[280px]">
                    {t.appShowcase.studentDesc}
                  </p>

                  <a href="https://play.google.com/store/apps/details?id=uz.wasp2ai.edifystudent" target="_blank" className="flex items-center gap-3 bg-slate-900 hover:bg-black text-white p-2.5 pr-6 rounded-2xl transition-transform hover:-translate-y-1 shadow-md hover:shadow-xl w-fit group/btn border border-slate-800">
                    {/* ORIGINAL GOOGLE PLAY SVG */}
                    <div className="w-10 h-10 ml-1 flex items-center justify-center">
                      <svg viewBox="0 0 512 512" className="w-8 h-8">
                        <path fill="#00E676" d="M46.7 34.6c-1.3 1.9-2.1 4.5-2.1 7.6v427.6c0 3.1.8 5.7 2.1 7.6l.3.2 242.3-241.6v-2.1l-242.3-241.6-.3.2z"/>
                        <path fill="#FFEA00" d="M289.3 234.3l-59-58.8-183.3-183.3c-2.3-2.3-5.2-3.1-7.8-2.6l239.9 138.5 10.2 106.2z"/>
                        <path fill="#FF3D00" d="M289.3 277.7l-10.2 106.2L39.2 522.4c2.6.5 5.5-.3 7.8-2.6l183.3-183.3 59-58.8z"/>
                        <path fill="#29B6F6" d="M289.3 234.3l10.2-106.2L453.6 217c8.5 4.8 8.5 12.8 0 17.7l-154.1 88.9-10.2-106.2z"/>
                      </svg>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-0.5 group-hover/btn:text-slate-300 transition-colors">{t.appShowcase.getItOn}</span>
                      <span className="text-lg font-black leading-none">{t.appShowcase.googlePlay}</span>
                    </div>
                  </a>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        

      </main>

      {/* 🟢 UPGRADED: PREMIUM DARK FOOTER */}
      <footer className="bg-[#0A0F1C] border-t border-slate-800/50 pt-20 pb-10 relative z-20 overflow-hidden">
        
        {/* Subtle top glow to blend with the light section above */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-3 gap-12 mb-16">
            
            {/* 1. Company Info & Socials */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <span className="font-black text-2xl text-white tracking-tight">Edify.</span>
              </div>
              <p className="text-slate-400 text-[15px] leading-relaxed mb-8 max-w-sm font-medium">
                {t.footer.desc}
              </p>
              
              <div className="flex gap-4">
                <motion.a 
                  href="https://github.com/Wasp-2-AI" 
                  target="_blank"
                  className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-slate-700/50 hover:border-slate-500"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Github className="w-5 h-5" />
                </motion.a>
                <motion.a 
                  href="https://www.linkedin.com/company/wasp-2-ai" 
                  target="_blank"
                  className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#0A66C2] transition-all border border-slate-700/50 hover:border-[#0A66C2]"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Linkedin className="w-5 h-5" />
                </motion.a>
                <motion.a 
                  href="https://t.me/umidjon0339" 
                  target="_blank"
                  className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#229ED9] transition-all border border-slate-700/50 hover:border-[#229ED9]"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Send className="w-5 h-5 -ml-0.5 mt-0.5" /> 
                </motion.a>
              </div>
            </div>

            {/* 2. Platform Links */}
            <div>
              <h3 className="text-[13px] font-bold mb-6 text-white uppercase tracking-widest">{t.footer.platform}</h3>
              <ul className="space-y-4">
                {['O\'qituvchilar uchun', 'O\'quvchilar uchun', 'Platforma haqida', 'Tizimga kirish'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-slate-400 hover:text-blue-400 transition-colors font-medium text-[15px] flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500/0 group-hover:bg-blue-500 transition-colors" />
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. Contact & Map (Interactive) */}
            <div>
              <h3 className="text-[13px] font-bold mb-6 text-white uppercase tracking-widest">{t.footer.contact}</h3>
              <div className="space-y-4 mb-8">
                {/* Manzil (Faqat matn) */}
                <div className="flex items-start gap-3 text-slate-400 font-medium text-[15px]">
                  <MapPin className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <span className="leading-snug">Afrosiyob koʻchasi, 15/2, <br/>Tashkent, Uzbekistan</span>
                </div>
                
                {/* Email (Bosiladigan) */}
                <a href="mailto:u.jumaqulov@newuu.uz" className="flex items-center gap-3 text-slate-400 font-medium text-[15px] hover:text-blue-400 transition-colors group w-fit">
                  <Mail className="w-5 h-5 text-blue-500 shrink-0 group-hover:scale-110 transition-transform" />
                  <span>u.jumaqulov@newuu.uz</span>
                </a>
                
                {/* Telefon (Bosiladigan) */}
                <a href="tel:+998338602006" className="flex items-center gap-3 text-slate-400 font-medium text-[15px] hover:text-blue-400 transition-colors group w-fit">
                  <Phone className="w-5 h-5 text-blue-500 shrink-0 group-hover:scale-110 transition-transform" />
                  <span>+998 33 860 20 06</span>
                </a>
              </div>
              
              {/* Dark Mode Map (CSS Filter Trick) */}
              <div className="rounded-xl overflow-hidden h-36 w-full border border-slate-800 shadow-2xl relative group bg-slate-900">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2997.436155557718!2d69.2667364!3d41.303964!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38ae8ad742354c25%3A0xc3f14fa76fb7535b!2sAfrosiyob%20Street%2C%20Tashkent%2C%20Uzbekistan!5e0!3m2!1sen!2s!4v1700000000000!5m2!1sen!2s" 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen 
                  loading="lazy"
                  className="opacity-60 grayscale-[0.8] invert-[0.9] hue-rotate-180 group-hover:opacity-100 group-hover:invert-0 group-hover:grayscale-0 group-hover:hue-rotate-0 transition-all duration-700"
                ></iframe>
                {/* Map ustidagi parda (ko'proq to'q qilish uchun) */}
                <div className="absolute inset-0 bg-blue-900/10 pointer-events-none group-hover:opacity-0 transition-opacity duration-700" />
              </div>
            </div>
          </div>
          
          {/* Bottom Copyright */}
          <div className="pt-8 border-t border-slate-800/60 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-sm font-medium">
            <p>© {new Date().getFullYear()} Wasp-2 AI Solutions. {t.footer.rights}</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-blue-400 transition-colors">Maxfiylik siyosati</a>
              <a href="#" className="hover:text-blue-400 transition-colors">Foydalanish shartlari</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
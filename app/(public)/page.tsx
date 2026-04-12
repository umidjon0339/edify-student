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
  BarChart2,Bot,UserPlus,Trophy,Crown,ArrowUpRight,Flame,Star,ShieldAlert,Target
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
      platform: "Qisqa Havolalar",
      contact: "Aloqa & Manzil",
      rights: "Barcha huquqlar himoyalangan.",
      address: "Afrosiyob ko'chasi, 15/2, Toshkent",
      links: [
        { label: "Ustozlar uchun", href: "#" },
        { label: "O'quvchilar uchun", href: "#" },
        { label: "Ochiq Kutubxona", href: "#" },
        { label: "Platforma haqida", href: "#" }
      ]
    },
    howItWorks: {
      badge: "ODDIY QADAMLAR",
      title: "Boshlash juda oson",
      desc: "Atigi 3 ta oddiy qadam orqali ta'lim jarayonini avtomatlashtiring va vaqtingizni tejang.",
      steps: [
        { title: "Ro'yxatdan o'ting", desc: "O'qituvchi yoki o'quvchi sifatida bir necha soniyada bepul akkaunt yarating." },
        { title: "Test yarating", desc: "AI yordamchi yordamida istalgan mavzuda test va materiallar tuzing." },
        { title: "Natijalarni oling", desc: "O'quvchilarga ulashing, tizim esa ularni o'zi avtomatik baholaydi." }
      ],
      cta: "Hoziroq Boshlash"
    },
    gamification: {
      badge: "GEYMIFIKATSIYA",
      title: "O'qish endi zerikarli emas",
      desc: "O'quvchilar testlarni yechgani sari tajriba ballari (XP) yig'ishadi, noyob nishonlarni ochishadi va respublika reytingida kuch sinashadi.",
      cards: {
        leaderboard: { title: "Respublika Reytingi", desc: "O'zbekiston bo'yicha kuchlilar qatoriga kiring" },
        streak: { title: "Kunlik Seriya", desc: "Har kuni o'qib, olovni saqlab qoling" },
        badges: { title: "Maxsus Nishonlar", desc: "Qiyin vazifalarni bajarib yutuqlarga erishing" },
        level: { title: "Darajangizni oshiring", desc: "Har bir to'g'ri javob uchun XP oling" }
      }
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

    howItWorks: {
      badge: "SIMPLE STEPS",
      title: "Getting started is easy",
      desc: "Automate your educational process and save time in just 3 simple steps.",
      steps: [
        { title: "Sign Up", desc: "Create a free account in seconds as a teacher or student." },
        { title: "Create a Test", desc: "Generate tests and materials on any topic using the AI assistant." },
        { title: "Get Results", desc: "Share with students, and the system will grade them automatically." }
      ],
      cta: "Get Started Now"
    },
    
    footer: {
      desc: "An innovative platform specially developed for the Uzbekistan education system by Wasp-2 AI.",
      platform: "Quick Links",
      contact: "Contact & Address",
      rights: "All rights reserved.",
      address: "15/2 Afrosiyob Street, Tashkent",
      links: [
        { label: "For Teachers", href: "#" },
        { label: "For Students", href: "#" },
        { label: "Global Library", href: "#" },
        { label: "About Platform", href: "#" }
      ]
    },
    gamification: {
      badge: "GAMIFICATION",
      title: "Learning is now a game",
      desc: "Students earn Experience Points (XP) for solving tests, unlock unique badges, and compete on the national leaderboard.",
      cards: {
        leaderboard: { title: "National Leaderboard", desc: "Rank among the best in Uzbekistan" },
        streak: { title: "Daily Streak", desc: "Keep the fire alive by learning every day" },
        badges: { title: "Special Badges", desc: "Earn achievements for completing hard tasks" },
        level: { title: "Level Up", desc: "Earn XP for every correct answer" }
      }
    },
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

    howItWorks: {
      badge: "ПРОСТЫЕ ШАГИ",
      title: "Начать очень легко",
      desc: "Автоматизируйте учебный процесс и сэкономьте время всего за 3 простых шага.",
      steps: [
        { title: "Зарегистрируйтесь", desc: "Создайте бесплатный аккаунт за несколько секунд как учитель или ученик." },
        { title: "Создайте тест", desc: "Создавайте тесты и материалы на любую тему с помощью ИИ-помощника." },
        { title: "Получите результаты", desc: "Поделитесь с учениками, а система оценит их автоматически." }
      ],
      cta: "Начать сейчас"
    },

    footer: {
      desc: "Инновационная платформа, специально разработанная для системы образования Узбекистана компанией Wasp-2 AI.",
      platform: "Быстрые ссылки",
      contact: "Контакты и Адрес",
      rights: "Все права защищены.",
      address: "ул. Афросиёб, 15/2, Ташкент",
      links: [
        { label: "Для учителей", href: "#" },
        { label: "Для учеников", href: "#" },
        { label: "Открытая библиотека", href: "#" },
        { label: "О платформе", href: "#" }
      ]
    },
    gamification: {
      badge: "ГЕЙМИФИКАЦИЯ",
      title: "Учеба больше не скучная",
      desc: "Ученики зарабатывают очки опыта (XP) за тесты, открывают уникальные значки и соревнуются в национальном рейтинге.",
      cards: {
        leaderboard: { title: "Национальный Рейтинг", desc: "Войдите в число лучших по Узбекистану" },
        streak: { title: "Серия Дней", desc: "Занимайтесь каждый день, чтобы сохранить огонь" },
        badges: { title: "Особые Значки", desc: "Получайте достижения за сложные задания" },
        level: { title: "Повышайте Уровень", desc: "Получайте XP за каждый правильный ответ" }
      }
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
        
        {/* 🟢 UPGRADED: PREMIUM BENTO COMMAND CENTER HERO SECTION */}
        <section className="relative w-full pt-12 lg:pt-24 pb-20 lg:pb-32 overflow-hidden z-20">
          
          {/* Animated Background Mesh Glows (Premium SaaS Aesthetic) */}
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-[100px] mix-blend-multiply animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-gradient-to-tr from-cyan-300/10 to-blue-400/10 rounded-full blur-[100px] mix-blend-multiply animate-[pulse_10s_ease-in-out_infinite_reverse]" />

          <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              
              {/* ⬅️ CHAP TOMON: Asosiy Matn va Tugmalar (UNCHANGED) */}
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

              {/* ➡️ O'NG TOMON: UPGRADED - Live Bento Command Center Visuals */}
              <div className="relative w-full h-[500px] lg:h-[600px] hidden md:flex items-center justify-center perspective-[2000px]">
                
                <div className="relative w-full h-full grid grid-cols-6 grid-rows-6 gap-3 transform rotateY-[-10deg] rotateX-[5deg] scale-95 transition-transform duration-1000 ease-out hover:rotateY-0 hover:rotateX-0 hover:scale-100">
                  
                  {/* BENTO 1: AI Test Generation (Live Simulation - Spans Top Left) */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
                    className="col-span-4 row-span-2 bg-white/80 backdrop-blur-xl rounded-3xl p-5 border border-white shadow-[0_15px_35px_rgba(0,0,0,0.05)] flex flex-col justify-center relative overflow-hidden group"
                  >
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center relative border border-purple-100 shadow-inner">
                        <Wand2 size={20} />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                        </span>
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm leading-tight">AI Test Generation</div>
                        <div className="text-[10px] font-bold text-purple-500 animate-pulse">Processing Algebra Chapter 3...</div>
                      </div>
                    </div>
                    {/* Simulated Text/Code generation */}
                    <div className="space-y-1.5 relative z-10 bg-slate-50 border border-slate-100 p-3 rounded-lg">
                      <motion.div animate={{ width: ["10%", "90%", "60%"] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="h-1.5 bg-slate-200 rounded-full"></motion.div>
                      <motion.div animate={{ width: ["0%", "100%", "80%"] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} className="h-1.5 bg-indigo-100 rounded-full"></motion.div>
                    </div>
                  </motion.div>

                  {/* BENTO 2: Instant Grading (Success Indicator - Top Right) */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.4 }}
                    className="col-span-2 row-span-2 bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-[0_15px_35px_rgba(59,130,246,0.2)] flex flex-col items-center justify-center text-center relative overflow-hidden group"
                  >
                    {/* Pulsing glow */}
                    <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 shadow-inner border border-emerald-500/20 group-hover:scale-110 transition-transform">
                      <CheckCircle2 size={28} />
                    </div>
                    <div className="font-black text-2xl text-white mb-0.5 tracking-tight">Checked</div>
                    <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                      <Zap size={10}/> in 0.3 seconds
                    </div>
                  </motion.div>

                  {/* BENTO 3: Analytics Graph (Live Class Progress - Left Spanning) */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.6 }}
                    className="col-span-3 row-span-4 bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white shadow-[0_15px_35px_rgba(0,0,0,0.05)] flex flex-col group"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="font-black text-lg text-slate-800">Sinf Tahlili</div>
                      <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border border-emerald-100">
                         <BarChart3 size={12}/> +18.2%
                      </div>
                    </div>
                    {/* Fake Chart bars */}
                    <div className="flex items-end justify-between gap-1.5 h-full mt-auto">
                      {[60, 40, 70, 90, 65, 85, 100, 75, 95].map((h, i) => (
                        <motion.div 
                          key={i}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.8 + (i * 0.1), ease: "easeOut" }}
                          className={`flex-1 rounded-t-lg group-hover:scale-y-105 transition-transform origin-bottom ${i === 6 ? 'bg-blue-600' : 'bg-blue-100'}`}
                        />
                      ))}
                    </div>
                  </motion.div>

                  {/* BENTO 4: Subject Icons (Breadth of Platform - Right Middle) */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.8 }}
                    className="col-span-3 row-span-2 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-3xl p-5 border border-blue-100 shadow-inner flex items-center justify-center gap-2 overflow-hidden"
                  >
                    {[Calculator, Globe, Brain, Palette].map((Icon, i) => (
                      <motion.div 
                        key={i}
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 3, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                        className="w-12 h-12 rounded-xl bg-white text-blue-500 flex items-center justify-center shadow border border-slate-100"
                      >
                        <Icon size={20} />
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* BENTO 5: Student Leaderboard Activity (Bottom Right) */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1 }}
                    className="col-span-3 row-span-2 bg-white/80 backdrop-blur-xl rounded-3xl p-5 border border-white shadow-[0_15px_35px_rgba(0,0,0,0.05)] flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs border-2 border-slate-200 shadow">#1</div>
                      <div className="w-16 h-2 bg-slate-100 rounded-full animate-pulse"></div>
                    </div>
                    <div className="w-full h-8 bg-slate-50 rounded-xl border border-slate-100 p-2 flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      <div className="w-24 h-1.5 bg-slate-200 rounded-full"></div>
                      <div className="ml-auto text-xs font-bold text-slate-400">12 XP</div>
                    </div>
                  </motion.div>

                </div>
              </div>
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

        {/* 🟢 NEW: GAMIFICATION FOR STUDENTS SECTION */}
        <section className="bg-white py-24 lg:py-32 relative z-20 border-t border-slate-100 overflow-hidden">
          
          {/* Fun, Energetic Background Elements */}
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-amber-100/40 via-orange-50/20 to-transparent rounded-full pointer-events-none -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-violet-100/40 via-fuchsia-50/20 to-transparent rounded-full pointer-events-none translate-y-1/3 -translate-x-1/3" />
          
          <div className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

          <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
            
            {/* Header */}
            <div className="text-center mb-16 lg:mb-20">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-[11px] font-black uppercase tracking-widest mb-6 shadow-sm"
              >
                <Trophy size={14} className="text-orange-500" />
                {t.gamification?.badge || "GEYMIFIKATSIYA"}
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-slate-900 tracking-tight"
              >
                {t.gamification?.title || "O'qish endi zerikarli emas"}
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed"
              >
                {t.gamification?.desc || "O'quvchilar testlarni yechgani sari tajriba ballari (XP) yig'ishadi, noyob nishonlarni ochishadi va respublika reytingida kuch sinashadi."}
              </motion.p>
            </div>

            {/* Gamification Bento Grid */}
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              
              {/* 1. Leaderboard Simulator (Spans 2 cols, 2 rows on large screens) */}
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="md:col-span-2 lg:col-span-2 lg:row-span-2 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2rem] p-8 border border-slate-800 shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-colors" />
                
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div>
                    <h3 className="text-2xl font-black text-white mb-2">{t.gamification?.cards.leaderboard.title}</h3>
                    <p className="text-slate-400 text-sm font-medium">{t.gamification?.cards.leaderboard.desc}</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                    <Crown size={24} />
                  </div>
                </div>

                {/* Live Leaderboard Animation */}
                <div className="space-y-3 relative z-10">
                  {/* Competitor 1 */}
                  <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-3">
                    <div className="font-black text-slate-500 w-4 text-center">1</div>
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">M</div>
                    <div className="flex-1 font-bold text-slate-200 text-sm">Malika T.</div>
                    <div className="font-mono text-cyan-400 text-sm font-bold">14,250 XP</div>
                  </div>
                  
                  {/* THE USER (Animated Overtake) */}
                  <motion.div 
                    initial={{ y: 55, scale: 0.95, opacity: 0.8 }}
                    whileInView={{ y: 0, scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.8, type: "spring", stiffness: 100 }}
                    className="flex items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-3 shadow-lg shadow-blue-500/25 border border-blue-400/30 relative z-20"
                  >
                    <div className="font-black text-white w-4 text-center">2</div>
                    <div className="w-8 h-8 rounded-full bg-white text-blue-600 flex items-center justify-center font-black text-xs shadow-inner">Siz</div>
                    <div className="flex-1 font-black text-white text-sm">Sizning Profilingiz</div>
                    <div className="flex items-center gap-2">
                      <motion.span 
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 1.5 }}
                        className="text-[10px] font-black text-emerald-300 bg-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-0.5"
                      >
                        <ArrowUpRight size={10} /> 120
                      </motion.span>
                      <span className="font-mono text-white text-sm font-black">13,900 XP</span>
                    </div>
                  </motion.div>

                  {/* Competitor 3 */}
                  <motion.div 
                    initial={{ y: -55 }}
                    whileInView={{ y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.8, type: "spring", stiffness: 100 }}
                    className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-3 relative z-10"
                  >
                    <div className="font-black text-slate-500 w-4 text-center">3</div>
                    <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs">J</div>
                    <div className="flex-1 font-bold text-slate-200 text-sm">Javohir N.</div>
                    <div className="font-mono text-cyan-400 text-sm font-bold">13,850 XP</div>
                  </motion.div>
                </div>
              </motion.div>

              {/* 2. Daily Streak (1 col, 1 row) */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] flex flex-col justify-between group"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 border border-orange-100 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                    <Flame size={24} className="fill-orange-500 text-orange-500 group-hover:animate-pulse" />
                  </div>
                  <span className="text-3xl font-black text-slate-900 tracking-tight">14<span className="text-sm text-slate-400 ml-1">kun</span></span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 mb-1">{t.gamification?.cards.streak.title}</h3>
                  <p className="text-slate-500 text-[13px] font-medium mb-4">{t.gamification?.cards.streak.desc}</p>
                  <div className="flex gap-1.5 w-full">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="flex-1 h-2 rounded-full bg-orange-500" />
                    ))}
                    <div className="flex-1 h-2 rounded-full bg-slate-100" />
                  </div>
                </div>
              </motion.div>

              {/* 3. Badges (1 col, 1 row) */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] flex flex-col justify-between overflow-hidden relative group"
              >
                {/* Shine effect */}
                <div className="absolute top-0 -inset-full h-full w-1/2 z-0 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-40 group-hover:animate-[shimmer_1.5s_infinite]" />
                
                <div className="flex gap-3 mb-6 relative z-10">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 border-2 border-yellow-200 shadow-sm z-30">
                    <Star size={20} className="fill-yellow-500" />
                  </div>
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 border-2 border-slate-200 shadow-sm -ml-6 z-20">
                    <ShieldAlert size={20} className="fill-slate-300" />
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 border-2 border-amber-200 shadow-sm -ml-6 z-10">
                    <Target size={20} className="fill-amber-500" />
                  </div>
                </div>
                <div className="relative z-10">
                  <h3 className="text-lg font-black text-slate-900 mb-1">{t.gamification?.cards.badges.title}</h3>
                  <p className="text-slate-500 text-[13px] font-medium">{t.gamification?.cards.badges.desc}</p>
                </div>
              </motion.div>

              {/* 4. Level Up & XP Progress (Spans 2 cols on lg) */}
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="md:col-span-3 lg:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-[2rem] p-6 md:p-8 border border-blue-100 shadow-inner flex flex-col justify-center relative"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{t.gamification?.cards.level.title}</h3>
                    <p className="text-slate-500 text-sm font-medium mt-1">{t.gamification?.cards.level.desc}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-blue-500 uppercase tracking-widest mb-1">Level 12</div>
                    <div className="font-mono text-slate-800 font-black">2,450 / 3,000</div>
                  </div>
                </div>
                
                <div className="relative w-full h-4 bg-white rounded-full border border-slate-200/60 overflow-hidden shadow-inner">
                  <motion.div 
                    initial={{ width: "0%" }}
                    whileInView={{ width: "82%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, delay: 1, ease: "easeOut" }}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full relative overflow-hidden"
                  >
                    {/* Progress Bar Shimmer */}
                    <motion.div 
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                    />
                  </motion.div>
                </div>
                <div className="absolute top-4 right-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5">
                  <Zap size={14} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-xs font-black text-slate-800">+120 XP</span>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* 🟢 UPGRADED: LIVE AI ASSISTANT SECTION (Simulation & Split Layout) */}
        <section className="bg-[#0A0F1C] relative py-24 lg:py-32 overflow-hidden z-20">
          
          {/* Animated Background Glows */}
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none animate-[pulse_6s_ease-in-out_infinite]" />
          <div className="absolute bottom-[-10%] right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none animate-[pulse_8s_ease-in-out_infinite_reverse]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-500/5 rounded-[100%] blur-[100px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
            
            {/* Header Area */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16 lg:mb-24"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/80 text-cyan-400 text-[11px] font-bold mb-6 shadow-inner backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                {t.aiSection.badge}
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight">
                {t.aiSection.title.split('AI').map((part, i, arr) => (
                  <React.Fragment key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">AI</span>
                    )}
                  </React.Fragment>
                ))}
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium leading-relaxed">
                {t.aiSection.desc}
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
              
              {/* ⬅️ LEFT SIDE: Interactive Feature Stack */}
              <div className="space-y-6">
                {t.aiSection.items.map((item, index) => {
                  const IconConfig = aiIcons[index];
                  return (
                    <motion.div 
                      key={index} 
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.2 }}
                      className="group relative bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/80 transition-all duration-300 flex items-start gap-5 overflow-hidden"
                    >
                      {/* Left glowing accent line on hover */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-600 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top" />
                      
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-600 text-cyan-400 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30 transition-all duration-300">
                        <IconConfig.icon size={22} />
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-bold mb-2 text-white group-hover:text-cyan-50 transition-colors">{item.title}</h3>
                        <p className="text-slate-400 text-[14px] leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* ➡️ RIGHT SIDE: Live AI Simulation Terminal */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
                whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative rounded-3xl bg-[#0F172A]/80 backdrop-blur-xl border border-slate-700 shadow-[0_0_50px_rgba(37,99,235,0.15)] overflow-hidden h-[480px] flex flex-col perspective-[1000px]"
              >
                {/* Mac-style Window Header */}
                <div className="bg-slate-800/50 border-b border-slate-700/50 px-4 py-3 flex items-center gap-2 shrink-0">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-slate-600"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-600"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-600"></div>
                  </div>
                  <div className="mx-auto text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Bot size={12} className="text-cyan-400" /> Edify AI Engine
                  </div>
                </div>

                {/* Terminal Body with Animation Loop */}
                <div className="p-6 flex-1 flex flex-col gap-6 overflow-hidden relative">
                  
                  {/* 1. Fake Prompt Entry */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="self-end max-w-[85%] bg-blue-600 text-white p-3.5 rounded-2xl rounded-tr-sm text-[13px] font-medium shadow-lg"
                  >
                    10-sinf uchun trigonometriya mavzusida 5 ta qiyin test tuzib ber. Tushuntirishi bilan.
                  </motion.div>

                  {/* 2. AI Processing Indicator */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 2.5, delay: 1.5, times: [0, 0.2, 1] }}
                    className="self-start flex items-center gap-3 bg-slate-800/80 p-3 rounded-2xl rounded-tl-sm border border-slate-700/50 w-fit"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center animate-spin">
                      <div className="w-4 h-4 bg-slate-800 rounded-full"></div>
                    </div>
                    <span className="text-[12px] font-bold text-cyan-400">Edify AI o'ylamoqda...</span>
                  </motion.div>

                  {/* 3. Generated Result Card (Pops in after processing) */}
                  <motion.div 
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, delay: 3.5 }}
                    className="self-start w-full bg-white rounded-xl p-4 shadow-2xl relative z-10"
                  >
                    {/* Tiny header */}
                    <div className="flex justify-between items-start mb-3">
                      <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-1 rounded-md uppercase">1-Savol</span>
                      <span className="bg-rose-50 text-rose-600 text-[10px] font-black px-2 py-1 rounded-md">Qiyin</span>
                    </div>
                    
                    {/* Fake Math Question */}
                    <div className="text-slate-800 text-[13px] font-bold mb-3 leading-snug">
                      Agar <span className="font-serif italic">sin(x) + cos(x) = 1.2</span> bo'lsa, <span className="font-serif italic">sin(2x)</span> ning qiymatini toping.
                    </div>

                    {/* Fake Options */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-[12px] font-bold text-slate-700 flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-emerald-500 text-white flex items-center justify-center text-[10px]">A</div>
                        0.44 <CheckCircle2 size={12} className="ml-auto text-emerald-500" />
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-[12px] font-bold text-slate-700 flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-slate-200 text-slate-500 flex items-center justify-center text-[10px]">B</div> 0.22
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-[12px] font-bold text-slate-700 flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-slate-200 text-slate-500 flex items-center justify-center text-[10px]">C</div> 1.44
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-[12px] font-bold text-slate-700 flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-slate-200 text-slate-500 flex items-center justify-center text-[10px]">D</div> 0.64
                      </div>
                    </div>

                    {/* Fake Explanation Snippet */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-1 mb-1">
                        <Sparkles size={10} className="text-amber-500" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">AI Yechim</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full mb-1"></div>
                      <div className="w-3/4 h-1.5 bg-slate-200 rounded-full"></div>
                    </div>
                  </motion.div>

                  {/* Gradient Overlay to fade out bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0F172A] to-transparent z-20"></div>
                </div>

                {/* Decorative scanning laser line */}
                <motion.div 
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-[1px] bg-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.5)] z-0 pointer-events-none"
                />
              </motion.div>

            </div>
          </div>
        </section>

        {/* 🟢 UPGRADED: PREMIUM GLOBAL LIBRARY BANNER */}
        <section className="bg-[#F8FAFC] pt-16 pb-12 relative z-20 px-4 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative rounded-[2.5rem] bg-slate-900 overflow-hidden shadow-[0_20px_60px_-15px_rgba(79,70,229,0.4)] flex flex-col lg:flex-row items-center justify-between p-8 md:p-12 lg:p-16 border border-slate-800"
            >
              {/* Vibrant Ambient Glows */}
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-violet-600/40 via-indigo-500/20 to-transparent rounded-full blur-[80px] pointer-events-none translate-x-1/4 -translate-y-1/4" />
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-500/30 via-cyan-400/10 to-transparent rounded-full blur-[80px] pointer-events-none -translate-x-1/4 translate-y-1/4" />
              
              {/* Subtle Grid Texture */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

              {/* ⬅️ Left Side: Content */}
              <div className="relative z-10 lg:w-1/2 text-center lg:text-left mb-16 lg:mb-0">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-cyan-300 text-[10px] font-black uppercase tracking-widest mb-6 backdrop-blur-md shadow-inner"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                  </span>
                  {t.globalLibrary.badge}
                </motion.div>
                
                <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-black text-white mb-6 tracking-tight leading-[1.1]">
                  {t.globalLibrary.title}
                </h2>
                
                <p className="text-slate-300 text-[16px] md:text-[17px] font-medium leading-relaxed max-w-xl mx-auto lg:mx-0 mb-10">
                  {t.globalLibrary.desc}
                </p>
                
                <Link 
                  href="/teacher/online-books" 
                  className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-50 font-black py-4 px-8 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:-translate-y-1 transition-all active:scale-95 group"
                >
                  {t.globalLibrary.button}
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* ➡️ Right Side: Floating Isometric Tech Stack */}
              <div className="relative z-10 w-full lg:w-1/2 h-[350px] lg:h-[400px] flex items-center justify-center perspective-[1200px]">
                
                {/* Decorative Glowing Core */}
                <div className="absolute w-40 h-40 bg-indigo-500/30 rounded-full blur-2xl animate-[pulse_4s_ease-in-out_infinite]" />

                {/* 1. Back Card (Math/Geometry) */}
                <motion.div 
                  animate={{ y: [-10, 10, -10], rotateZ: [-2, -2, -2] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-10 lg:top-4 right-10 lg:right-20 w-48 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl z-10 transform scale-90"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-300"><BarChart2 size={16} /></div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Category</div>
                  </div>
                  <div className="w-3/4 h-2 bg-slate-600 rounded-full mb-1.5" />
                  <div className="w-1/2 h-2 bg-slate-700 rounded-full" />
                </motion.div>

                {/* 2. Middle Card (Uzbekistan Standard) */}
                <motion.div 
                  animate={{ y: [10, -10, 10], rotateZ: [2, 2, 2] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute bottom-16 lg:bottom-12 left-4 lg:left-12 w-64 bg-slate-800/80 backdrop-blur-xl border border-slate-600/50 rounded-2xl p-5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] z-20"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl drop-shadow-md">🇺🇿</div>
                    <div>
                      <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest leading-none mb-1">Milliy Standart</p>
                      <p className="text-sm font-bold text-white leading-tight mb-2">O'zbekiston Dasturi</p>
                      <div className="flex gap-1">
                        <div className="w-12 h-1 bg-slate-600 rounded-full" />
                        <div className="w-8 h-1 bg-slate-600 rounded-full" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* 3. Front Main Card (USA Standard) */}
                <motion.div 
                  animate={{ y: [-15, 15, -15], rotateZ: [-4, -4, -4] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 rounded-[2rem] p-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] z-30"
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-inner flex items-center justify-center">
                      <BookOpen size={24} className="text-indigo-600" />
                    </div>
                    <div className="text-4xl drop-shadow-lg">🇺🇸</div>
                  </div>
                  {/* Card Body */}
                  <p className="text-[11px] font-black text-indigo-300 uppercase tracking-widest leading-none mb-1.5">Global Curriculum</p>
                  <p className="text-lg font-black text-white leading-tight mb-4">USA B.E.S.T. Standards</p>
                  
                  {/* Fake Progress/Details */}
                  <div className="space-y-2">
                    <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div className="w-[75%] h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>K-12 Syllabus</span>
                      <span className="text-cyan-300">100% Open</span>
                    </div>
                  </div>
                </motion.div>

              </div>
            </motion.div>
          </div>
        </section>

        {/* 🟢 UPGRADED: PREMIUM "HOW IT WORKS" & FINAL CTA */}
        <section className="bg-[#F8FAFC] py-24 lg:py-32 relative z-20 border-t border-slate-200/60 overflow-hidden">
          
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none" 
               style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
          </div>

          {/* Ambient Glows */}
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/4 w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
            
            {/* Header */}
            <div className="text-center mb-16 lg:mb-24">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-blue-600 text-[11px] font-black uppercase tracking-widest mb-6 shadow-sm"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                </span>
                {t.howItWorks?.badge || "ODDIY QADAMLAR"}
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-slate-900 tracking-tight"
              >
                {t.howItWorks?.title || "Boshlash juda oson"}
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed"
              >
                {t.howItWorks?.desc || "Atigi 3 ta oddiy qadam orqali ta'lim jarayonini avtomatlashtiring va vaqtingizni tejang."}
              </motion.p>
            </div>

            {/* 3 Steps Bento Grid */}
            <div className="relative max-w-6xl mx-auto mb-24 lg:mb-32">
              
              {/* Animated Connecting Line (Desktop Only) */}
              <div className="hidden lg:block absolute top-[45%] left-[10%] right-[10%] h-[2px] z-0">
                <div className="w-full h-full bg-slate-200/60 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: "-100%" }}
                    whileInView={{ x: "100%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 2.5, ease: "easeInOut", delay: 0.5 }}
                    className="w-full h-full bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                  />
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-6 lg:gap-10 relative z-10">
                
                {/* Step 1: Sign Up */}
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_-10px_rgba(37,99,235,0.1)] hover:-translate-y-2 transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                      <UserPlus size={24} />
                    </div>
                    <span className="text-5xl font-black text-slate-100 group-hover:text-blue-50 transition-colors">01</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-3">{t.howItWorks?.steps[0].title || "Ro'yxatdan o'ting"}</h3>
                  <p className="text-slate-500 text-[15px] font-medium leading-relaxed mb-6">{t.howItWorks?.steps[0].desc || "O'qituvchi yoki o'quvchi sifatida bir necha soniyada bepul akkaunt yarating."}</p>
                  
                  {/* Micro-Visual */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center shrink-0">
                       <UserPlus size={16} className="text-slate-400" />
                    </div>
                    <div className="space-y-1.5 w-full">
                      <div className="h-2 w-1/2 bg-slate-200 rounded-full" />
                      <div className="h-2 w-3/4 bg-blue-200 rounded-full" />
                    </div>
                  </div>
                </motion.div>

                {/* Step 2: Create Test */}
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_-10px_rgba(139,92,246,0.1)] hover:-translate-y-2 transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 group-hover:scale-110 transition-transform duration-300 shadow-sm relative overflow-hidden">
                      <Wand2 size={24} className="relative z-10" />
                      <div className="absolute inset-0 bg-purple-200 opacity-0 group-hover:animate-ping z-0" />
                    </div>
                    <span className="text-5xl font-black text-slate-100 group-hover:text-purple-50 transition-colors">02</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-3">{t.howItWorks?.steps[1].title || "Test yarating"}</h3>
                  <p className="text-slate-500 text-[15px] font-medium leading-relaxed mb-6">{t.howItWorks?.steps[1].desc || "AI yordamchi yordamida istalgan mavzuda test va materiallar tuzing."}</p>
                  
                  {/* Micro-Visual */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex gap-2 mb-2">
                       <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                       <div className="h-2 w-full bg-purple-100 rounded-full" />
                    </div>
                    <div className="h-2 w-2/3 bg-slate-200 rounded-full" />
                  </div>
                </motion.div>

                {/* Step 3: Get Results */}
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_-10px_rgba(16,185,129,0.1)] hover:-translate-y-2 transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                      <CheckCircle2 size={24} />
                    </div>
                    <span className="text-5xl font-black text-slate-100 group-hover:text-emerald-50 transition-colors">03</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-3">{t.howItWorks?.steps[2].title || "Natijalarni oling"}</h3>
                  <p className="text-slate-500 text-[15px] font-medium leading-relaxed mb-6">{t.howItWorks?.steps[2].desc || "O'quvchilarga ulashing, tizim esa ularni o'zi avtomatik baholaydi."}</p>
                  
                  {/* Micro-Visual */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-end justify-between h-14">
                    {[40, 60, 45, 80, 100].map((h, i) => (
                      <div key={i} className={`w-full mx-0.5 rounded-t-sm transition-all duration-500 ${i === 4 ? 'bg-emerald-500 h-full' : 'bg-emerald-100'}`} style={{ height: i !== 4 ? `${h}%` : '100%' }} />
                    ))}
                  </div>
                </motion.div>

              </div>
            </div>

            {/* Massive Final CTA (Dark Mode Bridge) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="max-w-5xl mx-auto bg-slate-900 rounded-[2.5rem] p-10 md:p-16 lg:p-20 text-center shadow-2xl relative overflow-hidden"
            >
              {/* Animated Inner Glows */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-blue-600/30 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[60px] pointer-events-none" />
              
              <h2 className="relative z-10 text-3xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight">
                Hali ham o'ylanyapsizmi?
              </h2>
              <p className="relative z-10 text-slate-400 text-lg md:text-xl font-medium mb-10 max-w-2xl mx-auto">
                Hoziroq ro'yxatdan o'ting va ta'lim jarayonini avtomatlashtirish qanchalik oson ekanligini o'z ko'zingiz bilan ko'ring.
              </p>
              
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/auth/signup">
                  <button className="bg-white text-slate-900 px-8 py-4 rounded-2xl text-[17px] font-black shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:-translate-y-1 transition-all flex items-center gap-2 group">
                    {t.howItWorks?.cta || "Hoziroq Boshlash"}
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform text-blue-600" />
                  </button>
                </Link>
                <span className="text-slate-500 font-bold text-sm flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" /> Mutlaqo bepul
                </span>
              </div>
            </motion.div>

          </div>
        </section>
        
        

      </main>

      {/* 🟢 UPGRADED: ULTRA-PREMIUM DARK FOOTER WITH MAP */}
        <footer className="bg-[#0A0F1C] border-t border-slate-800/80 pt-20 pb-10 relative z-20 overflow-hidden">
          
          {/* Subtle Grid & Ambient Glows */}
          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
               style={{ backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 mb-16">
              
              {/* 1. Brand & Socials (Takes up 5 columns on desktop) */}
              <div className="md:col-span-5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)] border border-white/10">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-black text-3xl text-white tracking-tight">Edify.</span>
                </div>
                <p className="text-slate-400 text-[16px] leading-relaxed mb-8 max-w-sm font-medium">
                  {t.footer.desc}
                </p>
                
                {/* Social Buttons */}
                <div className="flex gap-4">
                  {[
                    { icon: Github, link: "https://github.com/Wasp-2-AI", color: "hover:bg-slate-700 hover:border-slate-500 hover:text-white" },
                    { icon: Linkedin, link: "https://www.linkedin.com/company/wasp-2-ai", color: "hover:bg-[#0A66C2] hover:border-[#0A66C2] hover:text-white hover:shadow-[0_0_15px_rgba(10,102,194,0.4)]" },
                    { icon: Send, link: "https://t.me/umidjon0339", color: "hover:bg-[#229ED9] hover:border-[#229ED9] hover:text-white hover:shadow-[0_0_15px_rgba(34,158,217,0.4)]" }
                  ].map((social, i) => (
                    <motion.a 
                      key={i}
                      href={social.link} 
                      target="_blank"
                      className={`w-11 h-11 rounded-xl bg-slate-800/50 backdrop-blur-sm flex items-center justify-center text-slate-400 transition-all duration-300 border border-slate-700/50 ${social.color}`}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <social.icon className={`w-5 h-5 ${social.icon === Send ? '-ml-0.5 mt-0.5' : ''}`} />
                    </motion.a>
                  ))}
                </div>
              </div>

              {/* 2. Platform Links (Takes up 3 columns) */}
              <div className="md:col-span-3">
                <h3 className="text-[13px] font-black mb-6 text-slate-100 uppercase tracking-widest">{t.footer.platform}</h3>
                <ul className="space-y-4">
                  {t.footer.links?.map((link: any, index: number) => (
                    <li key={index}>
                      <a href={link.href} className="text-slate-400 hover:text-cyan-400 transition-colors font-medium text-[15px] flex items-center gap-3 group w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-cyan-400 transition-colors shadow-[0_0_0_rgba(34,211,238,0)] group-hover:shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 3. Contact & Map (Takes up 4 columns) */}
              <div className="md:col-span-4">
                <h3 className="text-[13px] font-black mb-6 text-slate-100 uppercase tracking-widest">{t.footer.contact}</h3>
                
                <div className="space-y-4 mb-6">
                  {/* Manzil (Address) */}
                  <div className="flex items-start gap-4 text-slate-400 font-medium text-[15px] w-fit">
                    <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-rose-400" />
                    </div>
                    <span className="mt-2 leading-snug">{t.footer.address}</span>
                  </div>

                  {/* Email */}
                  <a href="mailto:u.jumaqulov@newuu.uz" className="flex items-center gap-4 text-slate-400 font-medium text-[15px] hover:text-white transition-colors group w-fit">
                    <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center group-hover:border-blue-500/50 group-hover:bg-blue-500/10 transition-colors shrink-0">
                      <Mail className="w-4 h-4 text-blue-400" />
                    </div>
                    <span>u.jumaqulov@newuu.uz</span>
                  </a>
                  
                  {/* Telefon */}
                  <a href="tel:+998338602006" className="flex items-center gap-4 text-slate-400 font-medium text-[15px] hover:text-white transition-colors group w-fit">
                    <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-colors shrink-0">
                      <Phone className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span>+998 33 860 20 06</span>
                  </a>
                </div>
                
                {/* 🚀 PREMIUM DARK MODE MAP */}
                <div className="rounded-xl overflow-hidden h-36 w-full border border-slate-700/50 shadow-2xl relative group bg-slate-900">
                  <iframe 
                    src="https://maps.google.com/maps?q=41.296837,69.272712&t=&z=15&ie=UTF8&iwloc=&output=embed" 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    allowFullScreen 
                    loading="lazy"
                    className="w-full h-full opacity-60 grayscale-[0.8] invert-[0.9] hue-rotate-180 group-hover:opacity-100 group-hover:invert-0 group-hover:grayscale-0 group-hover:hue-rotate-0 transition-all duration-700"
                  ></iframe>
                  {/* Blue ambient overlay to blend map into the footer (disappears on hover) */}
                  <div className="absolute inset-0 bg-blue-900/10 pointer-events-none group-hover:opacity-0 transition-opacity duration-700" />
                </div>

              </div>
            </div>
            
            {/* Bottom Copyright Bar */}
            <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-sm font-medium relative z-10">
              <p className="flex items-center gap-1">
                © {new Date().getFullYear()} Wasp-2 AI Solutions. {t.footer.rights}
              </p>
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
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
  Users, FileText, Layout, Settings, 
  BookOpen, Star, Zap, BarChart2, Sparkles, 
  ArrowUpRight, ChevronDown, LogOut, User as UserIcon,
  Play, School, ImageIcon, Bot, Check, Globe, Library
} from 'lucide-react';
import Link from 'next/link';
import { useTeacherLanguage, LangType } from '@/app/teacher/layout';
import { useAiLimits } from '@/hooks/useAiLimits';
import NotificationBell from '@/components/NotificationBell';
import { useRouter } from 'next/navigation';

// --- TRANSLATIONS ---
const DASHBOARD_TRANSLATIONS = {
  uz: {
    title: "Boshqaruv Paneli",
    welcome: { morning: "Xayrli tong", afternoon: "Xayrli kun", evening: "Xayrli kech", subtitle: "Asosiy ko'rsatkichlar va tezkor amallar paneli." },
    stats: { students: "Jami O'quvchilar", classes: "Faol Sinflar", tests: "Yaratilgan Testlar" },
    sections: { quickActions: "Kashfiyot va Yaratish", management: "Boshqaruv" },
    actions: {
      classes: { title: "Sinflarim", desc: "Jurnalni boshqarish" },
      analytics: { title: "Tahlillar", desc: "Umumiy natijalarni ko'rish" },
      library: { title: "Mening Arxivim", desc: "Saqlangan testlar va qoralamalar" },
      settings: { title: "Sozlamalar", desc: "Profil va xavfsizlik" }
    },
    magicLinks: {
      maktab: { badge: "Umumta'lim", title: "Maktab Dasturi", desc: "Davlat standarti asosidagi testlar." },
      aiImage: { badge: "Tezkor 📸", title: "Rasm orqali yaratish", desc: "Darslikni rasmga oling. AI test tuzadi." },
      aiPrompt: { badge: "Moslashuvchan ✨", title: "AI Maxsus Prompt", desc: "Test mavzusini matn orqali tushuntiring." },
      onlineLibrary: { badge: "Yangi 🌐", title: "Onlayn Kutubxona", desc: "Xalqaro va mahalliy darsliklarni kashf eting." },
    },
    appPromo: { title: "Edify Mobil Ilovasi", desc: "O'quvchilarni telefoningizdan kuzating.", button: "Google Play" },
    aiLimit: { title: "AI Assistent", remaining: "savol qoldi", reset: "00:00 da yangilanadi", upgrade: "Cheksiz qilish", used: "ishlatildi" },
    logoutConfirm: { title: "Tizimdan chiqish", desc: "Haqiqatan ham hisobingizdan chiqmoqchimisiz?", cancel: "Bekor qilish", confirm: "Ha, chiqish" }
  },
  en: {
    title: "Dashboard",
    welcome: { morning: "Good Morning", afternoon: "Good Afternoon", evening: "Good Evening", subtitle: "Your primary metrics and quick actions." },
    stats: { students: "Total Students", classes: "Active Classes", tests: "Created Tests" },
    sections: { quickActions: "Discover & Create", management: "Management" },
    actions: {
      classes: { title: "My Classes", desc: "Manage your rosters" },
      analytics: { title: "Analytics", desc: "View performance trends" },
      library: { title: "My Archive", desc: "Saved tests & drafts" },
      settings: { title: "Settings", desc: "Profile & security" }
    },
    magicLinks: {
      maktab: { badge: "Standard", title: "Public School", desc: "Standardized tests based on curriculum." },
      aiImage: { badge: "Quick 📸", title: "Create via Image", desc: "Take a photo of an exam paper." },
      aiPrompt: { badge: "Flexible ✨", title: "AI Custom Prompt", desc: "Describe your test topic in plain text." },
      onlineLibrary: { badge: "New 🌐", title: "Online Library", desc: "Discover international and local textbooks." },
    },
    appPromo: { title: "Edify Mobile App", desc: "Monitor your students directly from your phone.", button: "Google Play" },
    aiLimit: { title: "AI Assistant", remaining: "questions left", reset: "Resets at midnight", upgrade: "Go Unlimited", used: "used" },
    logoutConfirm: { title: "Sign Out", desc: "Are you sure you want to sign out of your account?", cancel: "Cancel", confirm: "Yes, Sign Out" }
  },
  ru: {
    title: "Панель",
    welcome: { morning: "Доброе утро", afternoon: "Добрый день", evening: "Добрый вечер", subtitle: "Ваши основные показатели и быстрые действия." },
    stats: { students: "Всего Учеников", classes: "Активные Классы", tests: "Создано Тестов" },
    sections: { quickActions: "Создание и Поиск", management: "Управление" },
    actions: {
      classes: { title: "Мои Классы", desc: "Управление журналом" },
      analytics: { title: "Аналитика", desc: "Смотреть тренды" },
      library: { title: "Мой Архив", desc: "Сохраненные тесты и черновики" },
      settings: { title: "Настройки", desc: "Профиль и безопасность" }
    },
    magicLinks: {
      maktab: { badge: "Стандарт", title: "Школьная программа", desc: "Тесты по государственным стандартам." },
      aiImage: { badge: "Быстро 📸", title: "Создать по фото", desc: "Сфотографируйте экзамен для ИИ." },
      aiPrompt: { badge: "Гибкий ✨", title: "AI Свой Промпт", desc: "Опишите тему теста простыми словами." },
      onlineLibrary: { badge: "Новое 🌐", title: "Онлайн Библиотека", desc: "Открывайте международные и местные учебники." },
    },
    appPromo: { title: "Мобильное Приложение", desc: "Следите за учениками прямо с телефона.", button: "Google Play" },
    aiLimit: { title: "ИИ Ассистент", remaining: "вопросов осталось", reset: "Сброс в 00:00", upgrade: "Безлимит", used: "использовано" },
    logoutConfirm: { title: "Выход", desc: "Вы уверены, что хотите выйти из аккаунта?", cancel: "Отмена", confirm: "Да, выйти" }
  }
};

const LANGUAGE_OPTIONS = [
  { code: 'uz', label: "O'zbek", flag: '🇺🇿' },
  { code: 'en', label: "English", flag: '🇬🇧' },
  { code: 'ru', label: "Русский", flag: '🇷🇺' }
];

// --- ANIMATION VARIANTS ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function TeacherDashboard() {
  const { user } = useAuth() as any; 
  const router = useRouter();
  const { lang, setLang } = useTeacherLanguage() as { lang: LangType, setLang: (l: LangType) => void };
  const t = DASHBOARD_TRANSLATIONS[lang];
  const aiData = useAiLimits(); 

  const [greeting, setGreeting] = useState('');
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const [userStats, setUserStats] = useState({ students: 0, classes: 0, tests: 0 });
  const [loading, setLoading] = useState(true);

  const activeLanguage = LANGUAGE_OPTIONS.find(l => l.code === lang) || LANGUAGE_OPTIONS[0];

  // Time-based greeting
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t.welcome.morning);
    else if (hour < 18) setGreeting(t.welcome.afternoon);
    else setGreeting(t.welcome.evening);
  }, [lang, t]);

  // Fetch Database Stats
  useEffect(() => {
    if (!user) return;
    const fetchUserStats = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserStats({
            students: data.totalStudents || 0,
            classes: data.activeClassCount || 0,
            tests: data.customTestCount || 0,
          });
        }
      } catch (error) {
        console.error("Failed to fetch user stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserStats();
  }, [user]);

  if (loading || !user) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans relative">
      
      

{/* --- LOGOUT MODAL --- */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowLogoutModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl border border-slate-100 z-10 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <LogOut size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{t.logoutConfirm.title}</h3>
              <p className="text-slate-500 text-[15px] mb-8 font-medium">{t.logoutConfirm.desc}</p>
              
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button onClick={() => setShowLogoutModal(false)} className="w-full px-5 py-3 rounded-xl text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 transition-colors">
                  {t.logoutConfirm.cancel}
                </button>
                <button onClick={() => { signOut(auth); setShowLogoutModal(false); }} className="w-full px-5 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-sm">
                  {t.logoutConfirm.confirm}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- TOP BAR --- */}
      <header className="bg-white border-b border-slate-200/60 sticky top-0 z-40 px-4 md:px-6 py-3 flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
            {t.title}
          </h2>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          
          {/* PREMIUM LANGUAGE SELECTOR */}
        <div className="relative hidden sm:block">
          <button 
            onClick={() => { 
              setIsLangMenuOpen(!isLangMenuOpen); 
              setIsAiMenuOpen(false); 
              setIsProfileMenuOpen(false); 
            }}
            aria-haspopup="true"
            aria-expanded={isLangMenuOpen}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 active:scale-95
              ${isLangMenuOpen 
                ? 'bg-slate-50 border-slate-300 shadow-inner' 
                : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm'
              }`}
          >
            <span className="text-base leading-none">{activeLanguage.flag}</span>
            <span className="text-xs font-bold uppercase text-slate-700">{lang}</span>
            <ChevronDown 
              size={14} 
              className={`text-slate-400 transition-transform duration-300 ${isLangMenuOpen ? 'rotate-180 text-slate-600' : ''}`} 
            />
          </button>

          <AnimatePresence>
            {isLangMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute top-full right-0 mt-2 w-36 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 p-1.5 z-50"
              >
                {LANGUAGE_OPTIONS.map((l) => (
                  <button 
                    key={l.code} 
                    onClick={() => { 
                      setLang(l.code as LangType); 
                      setIsLangMenuOpen(false); 
                    }} 
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all
                      ${lang === l.code 
                        ? 'bg-indigo-50/80 text-indigo-700' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <span className="text-sm">{l.flag}</span>
                    <span className="flex-1 text-left">{l.label}</span>
                    {lang === l.code && <Check size={14} className="text-indigo-600" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

          {/* NOTIFICATION BELL */}
          <div className="flex items-center justify-center p-2 text-slate-500 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
            <NotificationBell />
          </div>

          {/* AI LIMIT WIDGET */}
          <div className="relative">
            <button 
              onClick={() => { setIsAiMenuOpen(!isAiMenuOpen); setIsProfileMenuOpen(false); setIsLangMenuOpen(false); }}
              className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border-2 transition-all shadow-sm active:scale-95 ${
                aiData?.isLimitReached 
                  ? 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100' 
                  : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100 text-indigo-700 hover:border-indigo-200'
              }`}
            >
              <Zap size={18} className={aiData?.isLimitReached ? '' : 'fill-indigo-500 text-indigo-500 animate-pulse'} />
              <div className="flex flex-col items-start text-left leading-none">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 hidden md:block">AI Limit</span>
                <span className="text-sm font-black">
                  {aiData?.remaining} <span className="hidden md:inline">{t.aiLimit.remaining.split(' ')[0]}</span>
                </span>
              </div>
            </button>

            {/* AI Dropdown Menu */}
            <AnimatePresence>
              {isAiMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-3 w-72 bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 p-5 z-50"
                >
                   <div className="flex justify-between items-end mb-5">
                      <div>
                        <h4 className="font-black text-slate-900 text-lg flex items-center gap-2">
                          <Sparkles size={18} className="text-indigo-500"/> {t.aiLimit.title}
                        </h4>
                        <p className="text-xs text-slate-400 font-bold mt-1">{t.aiLimit.reset}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-3xl font-black ${aiData?.isLimitReached ? 'text-red-500' : 'text-indigo-600'}`}>
                          {aiData?.remaining}
                        </span>
                        <span className="text-sm font-bold text-slate-300"> / {aiData?.limit}</span>
                      </div>
                   </div>
                   
                   <div className="space-y-1.5 mb-5">
                      <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>{t.aiLimit.used}: <span className="text-slate-700">{aiData?.used}</span></span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 relative overflow-hidden ${aiData?.isLimitReached ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
                          style={{ width: `${aiData?.usagePercentage || 0}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                        </div>
                      </div>
                   </div>

                   {/* 🟢 THE FIX: Replaced <Link> with an external <a> tag targeting Telegram */}
                   <a 
                      href="https://t.me/Umidjon0339" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-black rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                   >
                      <Star size={16} className="text-amber-400 fill-amber-400"/> {t.aiLimit.upgrade}
                   </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-8 bg-slate-200 hidden md:block"></div>

          {/* PROFILE WIDGET */}
          <div className="relative">
            <button 
              onClick={() => { setIsProfileMenuOpen(!isProfileMenuOpen); setIsAiMenuOpen(false); setIsLangMenuOpen(false); }}
              className="flex items-center gap-3 hover:bg-slate-50 p-1.5 pr-3 rounded-2xl border border-transparent hover:border-slate-200 transition-all active:scale-95"
            >
               <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black shadow-md border-2 border-white overflow-hidden shrink-0">
                 {user?.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover"/> : user?.displayName?.[0]}
               </div>
               <div className="hidden md:flex flex-col items-start text-left">
                 <span className="text-sm font-bold text-slate-900 leading-tight">{user?.displayName?.split(' ')[0]}</span>
                 <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-1.5 py-0.5 rounded mt-0.5">
                   {user?.planId === 'free' ? 'Bozaviy' : 'Pro'}
                 </span>
               </div>
               <ChevronDown size={16} className={`text-slate-400 hidden md:block transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50"
                >
                   <div className="px-4 py-4 bg-slate-50 rounded-xl mb-2 border border-slate-100">
                      <p className="text-sm font-black text-slate-900 truncate">{user?.displayName}</p>
                      <p className="text-xs font-medium text-slate-500 truncate">{user?.email}</p>
                   </div>
                   
                   <Link href="/teacher/profile" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors">
                      <UserIcon size={18} /> Profil
                   </Link>
                   <Link href="/teacher/settings" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors">
                      <Settings size={18} /> {t.actions.settings.title}
                   </Link>
                   
                   <div className="h-px bg-slate-100 my-2 mx-2"></div>
                   
                   <button 
                     onClick={() => { setIsProfileMenuOpen(false); setShowLogoutModal(true); }}
                     className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                   >
                      <LogOut size={18} /> {t.logoutConfirm.title}
                   </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </header>


      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 md:mt-8 space-y-6 md:space-y-10">
        
        {/* --- WELCOME BANNER --- */}
        <section className="relative overflow-hidden bg-white rounded-[2rem] p-6 md:p-10 shadow-sm border border-slate-200/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group">
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-100/60 to-purple-100/60 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 group-hover:scale-110 transition-transform duration-1000"></div>
           <div className="relative z-10">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">
                {greeting}, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">{user?.displayName?.split(' ')[0]}</span>
              </h1>
              <p className="text-slate-500 font-medium text-sm md:text-base max-w-lg">{t.welcome.subtitle}</p>
           </div>
        </section>

        {/* --- STAT CARDS --- */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <ColorfulStat label={t.stats.students} value={userStats.students} icon={Users} color="from-blue-500 to-cyan-500" shadow="shadow-blue-500/20" />
          <ColorfulStat label={t.stats.classes} value={userStats.classes} icon={Layout} color="from-violet-500 to-fuchsia-500" shadow="shadow-violet-500/20" />
          <ColorfulStat label={t.stats.tests} value={userStats.tests} icon={FileText} color="from-amber-400 to-orange-500" shadow="shadow-orange-500/20" />
        </section>

        {/* --- QUICK ACTIONS & PROMO --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 pb-10">
          
          <div className="lg:col-span-2 space-y-8">
             
             {/* --- 1. DISCOVERY & CREATION (The 4 Magic Cards) --- */}
             <div>
               <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-4">
                 {t.sections.quickActions}
               </h3>
               <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Maktab (Blue) */}
                  <MagicActionCard 
                    title={t.magicLinks.maktab.title} desc={t.magicLinks.maktab.desc} badge={t.magicLinks.maktab.badge}
                    icon={School} theme="blue" href="/teacher/create/maktab" router={router}
                  />
                  
                  {/* Image AI (Rose) */}
                  <MagicActionCard 
                    title={t.magicLinks.aiImage.title} desc={t.magicLinks.aiImage.desc} badge={t.magicLinks.aiImage.badge}
                    icon={ImageIcon} theme="rose" href="/teacher/create/by_image" router={router}
                  />

                  {/* Prompt AI (Violet) */}
                  <MagicActionCard 
                    title={t.magicLinks.aiPrompt.title} desc={t.magicLinks.aiPrompt.desc} badge={t.magicLinks.aiPrompt.badge}
                    icon={Bot} theme="violet" href="/teacher/create/by_user_input" router={router}
                  />

                  {/* Online Library (Emerald) */}
                  <MagicActionCard 
                    title={t.magicLinks.onlineLibrary.title} desc={t.magicLinks.onlineLibrary.desc} badge={t.magicLinks.onlineLibrary.badge}
                    icon={Globe} theme="emerald" href="/teacher/online-books" router={router}
                  />

               </motion.div>
             </div>

             {/* --- 2. MANAGEMENT (The 3 Outline Cards) --- */}
             <div>
               <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-4">
                 {t.sections.management}
               </h3>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <OutlineActionTile icon={BookOpen} label={t.actions.classes.title} sub={t.actions.classes.desc} href="/teacher/classes" />
                  <OutlineActionTile icon={BarChart2} label={t.actions.analytics.title} sub={t.actions.analytics.desc} href="/teacher/analytics" />
                  <OutlineActionTile icon={Star} label={t.actions.library.title} sub={t.actions.library.desc} href="/teacher/library" />
               </div>
             </div>

          </div>

          {/* --- GOOGLE PLAY PROMO --- */}
          <div className="space-y-4 md:space-y-6">
             <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2 hidden lg:block select-none opacity-0">Promo</h3>
             
             <div className="relative overflow-hidden bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-800 flex flex-col group h-[220px]">
                {/* Animated Background Blob */}
                <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/40 group-hover:scale-110 transition-all duration-700"></div>
                
                <div className="flex items-center gap-4 mb-5 relative z-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0 group-hover:scale-105 transition-transform">
                    <Play size={24} className="text-white ml-1" fill="currentColor" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white leading-tight">{t.appPromo.title}</h3>
                    <p className="text-slate-400 text-xs mt-1 font-medium line-clamp-2 pr-2">{t.appPromo.desc}</p>
                  </div>
                </div>
                
                <a 
                  href="https://play.google.com/store/apps/details?id=uz.wasp2ai.edifyteachers" 
                  target="_blank" rel="noopener noreferrer"
                  className="relative z-10 w-full py-3.5 px-4 bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm font-black rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 mt-auto backdrop-blur-md"
                >
                  {t.appPromo.button} <ArrowUpRight size={16} className="opacity-70" />
                </a>
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}

// --- NEW COMPONENT: MAGIC ACTION CARD ---
const themeStyles = {
  blue: { bg: 'group-hover:bg-blue-50', text: 'group-hover:text-blue-600', border: 'hover:border-blue-300', shadow: 'hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.2)]', iconBg: 'bg-blue-50 group-hover:bg-blue-600', iconText: 'text-blue-600 group-hover:text-white', badgeBg: 'group-hover:bg-blue-100', badgeText: 'group-hover:text-blue-700' },
  rose: { bg: 'group-hover:bg-rose-50', text: 'group-hover:text-rose-600', border: 'hover:border-rose-300', shadow: 'hover:shadow-[0_20px_40px_-15px_rgba(244,63,94,0.2)]', iconBg: 'bg-rose-50 group-hover:bg-rose-500', iconText: 'text-rose-500 group-hover:text-white', badgeBg: 'group-hover:bg-rose-100', badgeText: 'group-hover:text-rose-700' },
  violet: { bg: 'group-hover:bg-violet-50', text: 'group-hover:text-violet-600', border: 'hover:border-violet-300', shadow: 'hover:shadow-[0_20px_40px_-15px_rgba(139,92,246,0.2)]', iconBg: 'bg-violet-50 group-hover:bg-violet-600', iconText: 'text-violet-600 group-hover:text-white', badgeBg: 'group-hover:bg-violet-100', badgeText: 'group-hover:text-violet-700' },
  emerald: { bg: 'group-hover:bg-emerald-50', text: 'group-hover:text-emerald-600', border: 'hover:border-emerald-300', shadow: 'hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.2)]', iconBg: 'bg-emerald-50 group-hover:bg-emerald-500', iconText: 'text-emerald-500 group-hover:text-white', badgeBg: 'group-hover:bg-emerald-100', badgeText: 'group-hover:text-emerald-700' }
};

const MagicActionCard = ({ title, desc, badge, icon: Icon, theme, href, router }: any) => {
  const styles = themeStyles[theme as keyof typeof themeStyles];

  return (
    <motion.div 
      variants={cardVariants}
      onClick={() => router.push(href)} 
      className={`group relative bg-white rounded-3xl p-6 border border-slate-200/80 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-[180px] ${styles.border} ${styles.shadow}`}
    >
      {/* Background Hover Effect */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-transparent to-black/5 pointer-events-none ${styles.bg}`}></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3 shadow-sm ${styles.iconBg} ${styles.iconText}`}>
          <Icon size={22} strokeWidth={2.5} />
        </div>
        <span className={`px-2.5 py-1 bg-slate-50 border border-slate-200/60 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors duration-300 ${styles.badgeBg} ${styles.badgeText}`}>
          {badge}
        </span>
      </div>
      
      <div className="relative z-10 mt-auto">
        <h2 className={`text-lg font-black text-slate-900 mb-1 transition-colors duration-300 ${styles.text}`}>
          {title}
        </h2>
        <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed">
          {desc}
        </p>
      </div>
    </motion.div>
  );
};

// --- SUB-COMPONENTS ---
const ColorfulStat = ({ label, value, icon: Icon, color, shadow }: any) => (
  <div className={`bg-gradient-to-br ${color} p-6 rounded-[2rem] shadow-xl ${shadow} text-white flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group`}>
    <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-white/20 backdrop-blur-sm border border-white/10 group-hover:scale-110 group-hover:rotate-3 transition-transform">
      <Icon size={26} strokeWidth={2.5} className="text-white" />
    </div>
    <div className="relative z-10">
      <h3 className="text-4xl font-black tracking-tight drop-shadow-sm">{value}</h3>
      <p className="text-[11px] font-black text-white/90 uppercase tracking-widest mt-1">{label}</p>
    </div>
  </div>
);

const OutlineActionTile = ({ icon: Icon, label, sub, href }: any) => (
  <Link href={href} className="flex flex-col justify-between p-5 rounded-3xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-[0_10px_30px_-15px_rgba(99,102,241,0.2)] transition-all duration-300 hover:-translate-y-1 h-36 group">
    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:scale-110">
      <Icon size={20} strokeWidth={2} />
    </div>
    <div>
      <h4 className="font-black text-slate-900 text-[15px] group-hover:text-indigo-600 transition-colors flex items-center justify-between">
        {label} <ArrowUpRight size={16} className="opacity-0 -translate-x-2 translate-y-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300 text-indigo-600" />
      </h4>
      <p className="text-slate-500 text-[11px] font-medium mt-1 leading-relaxed line-clamp-1">{sub}</p>
    </div>
  </Link>
);

const DashboardSkeleton = () => (
  <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-10 space-y-8">
    <div className="h-16 bg-white w-full border-b mb-8"></div>
    <div className="h-32 bg-slate-200 rounded-[2rem] w-full animate-pulse"></div>
    <div className="grid grid-cols-3 gap-4">
       {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-200 rounded-[2rem] animate-pulse"></div>)}
    </div>
  </div>
);



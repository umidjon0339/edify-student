'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, Variants } from 'framer-motion';
import { 
  Users, FileText, Layout, Settings, 
  BookOpen, Zap, BarChart2, Sparkles, 
  ArrowUpRight, School, ImageIcon, Bot, Globe, ArrowRight, Library,
  Plus, Calendar // 🟢 Added for the new Top Bar
} from 'lucide-react';
import Link from 'next/link';
import { useTeacherLanguage, LangType } from '@/app/teacher/layout';
import { useRouter } from 'next/navigation';

// ============================================================================
// 🎨 PREMIUM CUSTOM SVG ILLUSTRATIONS
// ============================================================================

const WelcomeIllustration = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
    <motion.rect x="30" y="50" width="100" height="120" rx="20" fill="white" fillOpacity="0.8" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }} />
    <motion.rect x="45" y="70" width="70" height="12" rx="6" fill="#E2E8F0" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.2 }} />
    <motion.rect x="45" y="90" width="50" height="12" rx="6" fill="#E2E8F0" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
    
    <motion.g initial={{ y: 10, opacity: 0 }} animate={{ y: [-5, 5, -5], opacity: 1 }} transition={{ y: { duration: 4, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.5, delay: 0.5 } }}>
      <rect x="90" y="40" width="90" height="90" rx="24" fill="url(#gradPurple)" />
      <path d="M110 95 L125 75 L140 85 L160 55" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="160" cy="55" r="6" fill="white" />
      <circle cx="110" cy="95" r="6" fill="white" />
    </motion.g>
    
    <defs>
      <linearGradient id="gradPurple" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#6366F1" />
      </linearGradient>
    </defs>
  </svg>
);

const CardSvgBackground = ({ colorClass }: { colorClass: string }) => (
  <svg viewBox="0 0 100 100" className={`absolute inset-0 w-full h-full object-cover opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 pointer-events-none ${colorClass}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="40" fill="currentColor" />
    <circle cx="80" cy="80" r="30" fill="currentColor" />
    <rect x="60" y="10" width="40" height="40" rx="10" fill="currentColor" transform="rotate(15)" />
  </svg>
);

// --- TRANSLATIONS ---
const DASHBOARD_TRANSLATIONS = {
  uz: {
    welcome: { morning: "Xayrli tong", afternoon: "Xayrli kun", evening: "Xayrli kech", subtitle: "Asosiy ko'rsatkichlar va tezkor amallar paneli." },
    stats: { students: "Jami O'quvchilar", classes: "Faol Sinflar", tests: "Yaratilgan Testlar" },
    sections: { quickActions: "Kashfiyot va Yaratish", management: "Boshqaruv" },
    actions: {
      classes: { title: "Sinflarim", desc: "Jurnalni boshqarish" },
      analytics: { title: "Tahlillar", desc: "Umumiy natijalarni ko'rish" },
      library: { title: "Mening Arxivim", desc: "Saqlangan testlar va qoralamalar" },
    },
    magicLinks: {
      maktab: { badge: "Umumta'lim", title: "Maktab Dasturi", desc: "Davlat standarti asosidagi testlar." },
      aiImage: { badge: "Tezkor 📸", title: "Rasm orqali", desc: "Darslikni rasmga oling. AI test tuzadi." },
      aiPrompt: { badge: "Moslashuvchan", title: "AI Prompt", desc: "Test mavzusini matn orqali tushuntiring." },
      onlineLibrary: { badge: "Yangi 🌐", title: "Kutubxona", desc: "Xalqaro va mahalliy darsliklarni kashf eting." },
      bsb: { badge: "Matritsa 📊", title: "BSB / CHSB", desc: "Summativ baholash imtihonlarini yaratish." },
    }
  },
  en: {
    welcome: { morning: "Good Morning", afternoon: "Good Afternoon", evening: "Good Evening", subtitle: "Your primary metrics and quick actions." },
    stats: { students: "Total Students", classes: "Active Classes", tests: "Created Tests" },
    sections: { quickActions: "Discover & Create", management: "Management" },
    actions: {
      classes: { title: "My Classes", desc: "Manage your rosters" },
      analytics: { title: "Analytics", desc: "View performance trends" },
      library: { title: "My Archive", desc: "Saved tests & drafts" },
    },
    magicLinks: {
      maktab: { badge: "Standard", title: "Public School", desc: "Standardized tests based on curriculum." },
      aiImage: { badge: "Quick 📸", title: "Create via Image", desc: "Take a photo of an exam paper." },
      aiPrompt: { badge: "Flexible", title: "AI Custom Prompt", desc: "Describe your test topic in plain text." },
      onlineLibrary: { badge: "New 🌐", title: "Online Library", desc: "Discover international and local textbooks." },
      bsb: { badge: "Matrix 📊", title: "BSB / CHSB", desc: "Generate summative assessment papers." },
    }
  },
  ru: {
    welcome: { morning: "Доброе утро", afternoon: "Добрый день", evening: "Добрый вечер", subtitle: "Ваши основные показатели и быстрые действия." },
    stats: { students: "Всего Учеников", classes: "Активные Классы", tests: "Создано Тестов" },
    sections: { quickActions: "Создание и Поиск", management: "Управление" },
    actions: {
      classes: { title: "Мои Классы", desc: "Управление журналом" },
      analytics: { title: "Аналитика", desc: "Смотреть тренды" },
      library: { title: "Мой Архив", desc: "Сохраненные тесты и черновики" },
    },
    magicLinks: {
      maktab: { badge: "Стандарт", title: "Школьная программа", desc: "Тесты по государственным стандартам." },
      aiImage: { badge: "Быстро 📸", title: "Создать по фото", desc: "Сфотографируйте экзамен для ИИ." },
      aiPrompt: { badge: "Гибкий", title: "AI Свой Промпт", desc: "Опишите тему теста простыми словами." },
      onlineLibrary: { badge: "Новое 🌐", title: "Онлайн Библиотека", desc: "Открывайте международные и местные учебники." },
      bsb: { badge: "Матрица 📊", title: "BSB / CHSB", desc: "Создание суммативных экзаменационных работ." },
    }
  }
};

// --- ANIMATION VARIANTS ---
const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const cardVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

export default function TeacherDashboard() {
  const { user } = useAuth() as any; 
  const router = useRouter();
  const { lang } = useTeacherLanguage() as { lang: LangType };
  const t = DASHBOARD_TRANSLATIONS[lang as keyof typeof DASHBOARD_TRANSLATIONS] || DASHBOARD_TRANSLATIONS['uz'];

  const [greeting, setGreeting] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [userStats, setUserStats] = useState({ students: 0, classes: 0, tests: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set Greeting
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t.welcome.morning);
    else if (hour < 18) setGreeting(t.welcome.afternoon);
    else setGreeting(t.welcome.evening);

    // Set Date based on Language
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(new Date().toLocaleDateString(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US', options));
  }, [lang, t]);

  useEffect(() => {
    if (!user) return;
    const fetchUserStats = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserStats({ students: data.totalStudents || 0, classes: data.activeClassCount || 0, tests: data.customTestCount || 0 });
        }
      } catch (error) { console.error("Failed to fetch user stats:", error); } finally { setLoading(false); }
    };
    fetchUserStats();
  }, [user]);

  if (loading || !user) return <DashboardSkeleton />;

  return (
    <div className="min-h-full bg-transparent font-sans relative selection:bg-indigo-100 selection:text-indigo-900">
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 md:mt-8 space-y-6 md:space-y-8 relative z-10 pb-28 md:pb-10">        
        
        {/* 🟢 NEW: PC ONLY PAGE TOP BAR */}
        <div className="hidden md:flex justify-between items-center mb-2 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Boshqaruv Paneli</h1>
            <p className="text-[13px] font-bold text-slate-400 mt-0.5 capitalize flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-500" /> {currentDate}
            </p>
          </div>
          <button 
            onClick={() => router.push('/teacher/create')} 
            className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-900/20 transition-all active:scale-95 flex items-center gap-2 text-[14px]"
          >
            <Plus size={16} strokeWidth={3} /> Yangi Yaratish
          </button>
        </div>

        {/* --- 🟢 COMPACT WELCOME BANNER W/ SVG --- */}
        <section className="relative overflow-hidden bg-white rounded-3xl p-5 md:p-8 shadow-sm border border-slate-200/60 flex flex-col md:flex-row justify-between items-center gap-6 group">
           <div className="relative z-10 flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-[10px] uppercase tracking-widest mb-3 shadow-sm">
                <Sparkles size={14} className="fill-indigo-600" /> Edify Premium
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2 leading-tight">
                {greeting}, <br className="hidden md:block"/><span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">{user?.displayName?.split(' ')[0]}</span>
              </h1>
              <p className="text-slate-500 font-medium text-[13px] md:text-[15px] max-w-md leading-relaxed mx-auto md:mx-0">{t.welcome.subtitle}</p>
           </div>
           
           <div className="w-full max-w-[200px] md:max-w-none md:w-64 h-32 md:h-44 relative shrink-0 mx-auto md:mx-0">
             <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors duration-1000"></div>
             <WelcomeIllustration />
           </div>
        </section>

        {/* --- STAT CARDS --- */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
          <ColorfulStat label={t.stats.students} value={userStats.students} icon={Users} color="from-blue-500 to-cyan-500" shadow="shadow-blue-500/20" />
          <ColorfulStat label={t.stats.classes} value={userStats.classes} icon={Layout} color="from-violet-500 to-fuchsia-500" shadow="shadow-violet-500/20" />
          <ColorfulStat label={t.stats.tests} value={userStats.tests} icon={FileText} color="from-amber-400 to-orange-500" shadow="shadow-orange-500/20" />
        </section>

        {/* --- QUICK ACTIONS & MANAGEMENT --- */}
        <div className="space-y-8 md:space-y-10">
             
           {/* 1. DISCOVERY & CREATION */}
           <div>
             <div className="flex items-center gap-3 mb-4">
               <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Zap size={16} strokeWidth={2.5}/></div>
               <h3 className="text-[15px] font-black text-slate-900">{t.sections.quickActions}</h3>
             </div>
             
             <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <MagicActionCard title={t.magicLinks.maktab.title} desc={t.magicLinks.maktab.desc} badge={t.magicLinks.maktab.badge} icon={School} theme="blue" href="/teacher/create/maktab" router={router} />
                <MagicActionCard title={t.magicLinks.aiImage.title} desc={t.magicLinks.aiImage.desc} badge={t.magicLinks.aiImage.badge} icon={ImageIcon} theme="rose" href="/teacher/create/by_image" router={router} />
                <MagicActionCard title={t.magicLinks.aiPrompt.title} desc={t.magicLinks.aiPrompt.desc} badge={t.magicLinks.aiPrompt.badge} icon={Bot} theme="violet" href="/teacher/create/by_user_input" router={router} />
                <MagicActionCard title={t.magicLinks.onlineLibrary.title} desc={t.magicLinks.onlineLibrary.desc} badge={t.magicLinks.onlineLibrary.badge} icon={Globe} theme="emerald" href="/teacher/online-books" router={router} />
                <MagicActionCard title={t.magicLinks.bsb.title} desc={t.magicLinks.bsb.desc} badge={t.magicLinks.bsb.badge} icon={FileText} theme="purple" href="/teacher/create/bsb-chsb" router={router} />
                <MagicActionCard title={t.actions.library.title} desc={t.actions.library.desc} badge="Arxiv 📚" icon={Library} theme="slate" href="/teacher/library" router={router} />
             </motion.div>
           </div>

           {/* 2. MANAGEMENT */}
           <div>
             <div className="flex items-center gap-3 mb-4">
               <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"><Settings size={16} strokeWidth={2.5}/></div>
               <h3 className="text-[15px] font-black text-slate-900">{t.sections.management}</h3>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <OutlineActionTile icon={BookOpen} label={t.actions.classes.title} sub={t.actions.classes.desc} href="/teacher/classes" />
                <OutlineActionTile icon={BarChart2} label={t.actions.analytics.title} sub={t.actions.analytics.desc} href="/teacher/analytics" />
             </div>
           </div>

        </div>

      </main>
    </div>
  );
}

// ============================================================================
// 🧩 SUB-COMPONENTS
// ============================================================================

const themeStyles = {
  blue: { bg: 'bg-blue-500 text-blue-500', border: 'hover:border-blue-300', shadow: 'hover:shadow-[0_15px_30px_-10px_rgba(59,130,246,0.15)]' },
  rose: { bg: 'bg-rose-500 text-rose-500', border: 'hover:border-rose-300', shadow: 'hover:shadow-[0_15px_30px_-10px_rgba(244,63,94,0.15)]' },
  violet: { bg: 'bg-violet-500 text-violet-500', border: 'hover:border-violet-300', shadow: 'hover:shadow-[0_15px_30px_-10px_rgba(139,92,246,0.15)]' },
  emerald: { bg: 'bg-emerald-500 text-emerald-500', border: 'hover:border-emerald-300', shadow: 'hover:shadow-[0_15px_30px_-10px_rgba(16,185,129,0.15)]' },
  purple: { bg: 'bg-purple-500 text-purple-500', border: 'hover:border-purple-300', shadow: 'hover:shadow-[0_15px_30px_-10px_rgba(168,85,247,0.15)]' },
  slate: { bg: 'bg-slate-700 text-slate-700', border: 'hover:border-slate-400', shadow: 'hover:shadow-[0_15px_30px_-10px_rgba(51,65,85,0.15)]' }
};

const MagicActionCard = ({ title, desc, badge, icon: Icon, theme, href, router }: any) => {
  const styles = themeStyles[theme as keyof typeof themeStyles];
  return (
    <motion.div variants={cardVariants} onClick={() => router.push(href)} className={`group relative bg-white rounded-[1.5rem] p-5 border border-slate-200 transition-all duration-300 cursor-pointer flex flex-col h-[150px] md:h-[160px] overflow-hidden ${styles.border} ${styles.shadow}`}>
      <CardSvgBackground colorClass={styles.bg.split(' ')[1]} />
      <div className="flex justify-between items-start mb-3 relative z-10">
        <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm bg-opacity-10 text-opacity-100 ${styles.bg.replace('bg-', 'bg-').replace('500', '50')} ${styles.bg.replace('bg-', 'text-')}`}>
          <Icon size={18} strokeWidth={2.5} className="md:w-5 md:h-5" />
        </div>
        <span className="px-2.5 py-1 bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-600 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">{badge}</span>
      </div>
      <div className="relative z-10 mt-auto">
        <h2 className="text-[14px] md:text-[15px] font-black text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{title}</h2>
        <p className="text-[12px] md:text-[12.5px] text-slate-500 font-medium line-clamp-2 leading-relaxed">{desc}</p>
      </div>
      <div className="absolute bottom-4 right-4 w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-50 flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
        <ArrowRight size={14} className="text-slate-600" />
      </div>
    </motion.div>
  );
};

const ColorfulStat = ({ label, value, icon: Icon, color, shadow }: any) => (
  <div className={`bg-gradient-to-br ${color} p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-lg ${shadow} text-white flex items-center gap-4 hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group`}>
    <CardSvgBackground colorClass="text-white" />
    <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 bg-white/20 backdrop-blur-sm border border-white/10 group-hover:scale-110 group-hover:rotate-3 transition-transform">
      <Icon size={20} strokeWidth={2.5} className="text-white md:w-6 md:h-6" />
    </div>
    <div className="relative z-10">
      <h3 className="text-2xl md:text-4xl font-black tracking-tight drop-shadow-sm">{value}</h3>
      <p className="text-[9px] md:text-[11px] font-black text-white/90 uppercase tracking-widest mt-0.5 md:mt-1">{label}</p>
    </div>
  </div>
);

const OutlineActionTile = ({ icon: Icon, label, sub, href }: any) => (
  <Link href={href} className="group flex items-center justify-between p-4 md:p-5 rounded-[1.5rem] md:rounded-3xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-[0_15px_30px_-10px_rgba(99,102,241,0.15)] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
    <CardSvgBackground colorClass="text-slate-400" />
    <div className="flex items-center gap-3 md:gap-4 relative z-10">
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:scale-110">
        <Icon size={20} strokeWidth={2} className="md:w-5 md:h-5" />
      </div>
      <div>
        <h4 className="font-black text-slate-900 text-[14px] md:text-[15px] group-hover:text-indigo-600 transition-colors">{label}</h4>
        <p className="text-slate-500 text-[11px] md:text-[12.5px] font-medium mt-0.5 leading-relaxed">{sub}</p>
      </div>
    </div>
    <ArrowUpRight size={18} className="opacity-0 -translate-x-4 translate-y-4 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300 text-indigo-600 relative z-10 md:w-5 md:h-5" />
  </Link>
);

const DashboardSkeleton = () => (
  <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 md:p-10 space-y-6 md:space-y-8">
    <div className="h-32 md:h-40 bg-slate-200 rounded-[2rem] w-full animate-pulse"></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6"><div className="h-28 md:h-32 bg-slate-200 rounded-[1.5rem] md:rounded-[2rem] animate-pulse"></div><div className="h-28 md:h-32 bg-slate-200 rounded-[1.5rem] md:rounded-[2rem] animate-pulse"></div><div className="h-28 md:h-32 bg-slate-200 rounded-[1.5rem] md:rounded-[2rem] animate-pulse"></div></div>
  </div>
);
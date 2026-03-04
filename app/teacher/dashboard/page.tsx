'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, getCountFromServer } from 'firebase/firestore';
import { 
  Plus, Users, FileText, Activity, 
  Layout, Bell, Settings, BookOpen, 
  ChevronRight, Clock, Star, Zap,
  BarChart2, Calendar, Sparkles,
  Smartphone, DownloadCloud // 🟢 Added these two
} from 'lucide-react';
import Link from 'next/link';
import { useTeacherLanguage } from '@/app/teacher/layout';

// --- 1. TRANSLATION DICTIONARY ---
const DASHBOARD_TRANSLATIONS = {
  uz: {
    welcome: {
      morning: "Xayrli tong",
      afternoon: "Xayrli kun",
      evening: "Xayrli kech",
      subtitle: "Bugungi kun tartibi va sinf ko'rsatkichlari."
    },
    stats: {
      students: "Jami O'quvchilar",
      classes: "Faol Sinflar",
      tests: "Yaratilgan Testlar",
      submissions: "Yangi Natijalar"
    },
    sections: {
      quickActions: "Tezkor Amallar",
      activity: "So'nggi Faoliyat",
      analytics: "Tahlillar"
    },
    actions: {
      create: { title: "Yangi Test", desc: "Savollar tuzish" },
      classes: { title: "Sinflarim", desc: "Jurnalni boshqarish" },
      library: { title: "Kutubxona", desc: "Arxiv va qoralamalar" },
      analytics: { title: "Tahlillar", desc: "Natijalarni ko'rish" },
      settings: { title: "Sozlamalar", desc: "Profilni tahrirlash" },
      help: { title: "Yordam", desc: "Qo'llanma" }
    },
    activity: {
      empty: "Hozircha faoliyat yo'q",
      submitted: "testni ishladi",
      score: "Ball"
    },
    appPromo: {
      title: "Mobil ilovani yuklab oling!",
      desc: "Sinflaringizni boshqaring, natijalarni ko'ring va o'quvchilarni telefoningizdan kuzating.",
      button: "Play Store'dan yuklash"
    }
  },
  en: {
    welcome: {
      morning: "Good Morning",
      afternoon: "Good Afternoon",
      evening: "Good Evening",
      subtitle: "Here is your daily classroom overview."
    },
    stats: {
      students: "Total Students",
      classes: "Active Classes",
      tests: "Created Tests",
      submissions: "New Results"
    },
    sections: {
      quickActions: "Quick Actions",
      activity: "Recent Activity",
      analytics: "Analytics"
    },
    actions: {
      create: { title: "New Test", desc: "Create assessment" },
      classes: { title: "My Classes", desc: "Manage roster" },
      library: { title: "Library", desc: "Archives & drafts" },
      analytics: { title: "Analytics", desc: "View performance" },
      settings: { title: "Settings", desc: "Edit profile" },
      help: { title: "Help", desc: "Guides" }
    },
    activity: {
      empty: "No recent activity",
      submitted: "completed",
      score: "Score"
    },
    appPromo: {
      title: "Get the Mobile App!",
      desc: "Manage classes, view analytics, and monitor your students directly from your phone.",
      button: "Get it on Play Store"
    }
  },
  ru: {
    welcome: {
      morning: "Доброе утро",
      afternoon: "Добрый день",
      evening: "Добрый вечер",
      subtitle: "Ваш обзор дня и показатели класса."
    },
    stats: {
      students: "Всего Учеников",
      classes: "Активные Классы",
      tests: "Создано Тестов",
      submissions: "Новые Ответы"
    },
    sections: {
      quickActions: "Быстрые Действия",
      activity: "Недавняя Активность",
      analytics: "Аналитика"
    },
    actions: {
      create: { title: "Новый Тест", desc: "Создать опрос" },
      classes: { title: "Мои Классы", desc: "Управление" },
      library: { title: "Библиотека", desc: "Архив и черновики" },
      analytics: { title: "Аналитика", desc: "Смотреть отчеты" },
      settings: { title: "Настройки", desc: "Профиль" },
      help: { title: "Помощь", desc: "Гайды" }
    },
    activity: {
      empty: "Активности пока нет",
      submitted: "завершил(а)",
      score: "Балл"
    },
    appPromo: {
      title: "Скачайте мобильное приложение!",
      desc: "Управляйте классами, смотрите аналитику и следите за учениками прямо с телефона.",
      button: "Скачать с Play Store"
    }
  }
};

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = DASHBOARD_TRANSLATIONS[lang];

  // --- STATE ---
  const [stats, setStats] = useState({ students: 0, classes: 0, tests: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  // --- 1. TIME BASED GREETING ---
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t.welcome.morning);
    else if (hour < 18) setGreeting(t.welcome.afternoon);
    else setGreeting(t.welcome.evening);
  }, [lang, t]);

  // --- 2. DATA FETCHING ---
  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        // Use Promise.all to run these in parallel
        // This ensures one slow query doesn't block the others completely
        // and we get the data as fast as possible.
        const [classesSnap, testsCountSnap, activitySnap] = await Promise.all([
          // 1. Classes (for Student Count)
          getDocs(query(collection(db, 'classes'), where('teacherId', '==', user.uid))),
          
          // 2. Active Tests Count
          getCountFromServer(query(collection(db, 'custom_tests'), where('teacherId', '==', user.uid))),
          
          // 3. Recent Activity (Attempts)
          // Note: If this query fails due to missing index, others will still work if handled individually,
          // but here we group them. Ensure composite index exists in Firestore!
          getDocs(query(
            collection(db, 'attempts'), 
            where('teacherId', '==', user.uid),
            orderBy('createdAt', 'desc'), 
            limit(5)
          )).catch(err => {
            console.warn("Activity query failed (likely missing index or teacherId on attempts):", err);
            return { docs: [] }; // Fallback to empty
          })
        ]);

        // Calculate Student Count safely
        let totalStudents = 0;
        classesSnap.docs.forEach(doc => {
          const data = doc.data();
          if (Array.isArray(data.studentIds)) {
            totalStudents += data.studentIds.length;
          }
        });

        // Process Activity
        // @ts-ignore - The catch block fallback returns an object with docs property
        const activities = activitySnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

        setStats({
          classes: classesSnap.size,
          students: totalStudents,
          tests: testsCountSnap.data().count
        });
        setRecentActivity(activities);

      } catch (error) {
        console.error("Dashboard Load Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // --- SKELETON LOADER ---
  if (loading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      
      {/* 1. HERO SECTION */}
      <div className="bg-white border-b border-slate-200 pt-8 pb-12 px-6 md:px-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold mb-2 text-xs uppercase tracking-widest">
               <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> {new Date().toLocaleDateString(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">
              {greeting}, {user?.displayName?.split(' ')[0]} 👋
            </h1>
            <p className="text-slate-500 font-medium text-sm md:text-base max-w-lg">{t.welcome.subtitle}</p>
          </div>
          
          <div className="flex gap-3">
             <Link href="/teacher/notifications" className="p-3 rounded-2xl bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors relative border border-transparent hover:border-indigo-100">
                <Bell size={20} />
                {/* Optional: Add logic to show red dot only if unread > 0 */}
                <span className="absolute top-2.5 right-3 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
             </Link>
             <Link href="/teacher/profile" className="flex items-center gap-3 bg-slate-900 text-white hover:bg-slate-800 px-5 py-3 rounded-2xl transition-all shadow-lg shadow-slate-200 hover:shadow-xl active:scale-95">
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold ring-2 ring-slate-900">
                   {user?.displayName?.[0] || 'T'}
                </div>
                <span className="font-bold text-sm">Profile</span>
             </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-8 space-y-8">
        {/* 🟢 NEW: APP PROMO BANNER 🟢 */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-[2rem] p-6 md:p-8 shadow-2xl shadow-emerald-500/20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border border-emerald-400/30 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
          {/* Animated background decoration */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-900 opacity-20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex items-center gap-5 w-full md:w-auto">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md text-white shrink-0 shadow-inner border border-white/20">
              <Smartphone size={36} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">{t.appPromo.title}</h3>
              <p className="text-emerald-50 font-medium mt-1 max-w-md text-sm md:text-base leading-relaxed">
                {t.appPromo.desc}
              </p>
            </div>
          </div>

          <a
            href="https://play.google.com/store/apps/details?id=uz.wasp2ai.edifyteachers"
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 w-full md:w-auto px-8 py-4 bg-white text-emerald-700 font-black rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-center gap-3 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all duration-300 shrink-0"
          >
            <DownloadCloud size={24} />
            {t.appPromo.button}
          </a>
        </div>
        {/* 🟢 END OF APP PROMO BANNER 🟢 */}
        
        {/* 2. STATS GRID (Gradient Cards like Analytics) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label={t.stats.students} 
            value={stats.students} 
            icon={Users} 
            theme="blue" 
            delay="0ms"
          />
          <StatCard 
            label={t.stats.classes} 
            value={stats.classes} 
            icon={BookOpen} 
            theme="violet" 
            delay="100ms"
          />
          <StatCard 
            label={t.stats.tests} 
            value={stats.tests} 
            icon={FileText} 
            theme="amber" 
            delay="200ms"
          />
          <StatCard 
            label={t.stats.submissions} 
            value={recentActivity.length > 0 ? recentActivity.length + '+' : '0'} 
            icon={Activity} 
            theme="emerald" 
            delay="300ms"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 3. QUICK ACTIONS GRID */}
          <div className="lg:col-span-2 space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                   <Zap size={20} className="text-amber-500 fill-amber-500" /> {t.sections.quickActions}
                </h3>
             </div>
             
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                
                {/* HERO ACTION: Create Test */}
                <Link href="/teacher/create" className="col-span-2 sm:col-span-1 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 text-white p-6 rounded-[2rem] shadow-xl shadow-indigo-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-44 group relative overflow-hidden ring-1 ring-white/20">
                   <div className="absolute top-[-20%] right-[-20%] p-4 opacity-10 group-hover:opacity-20 transition-opacity transform rotate-12 group-hover:rotate-0 duration-500">
                      <Sparkles size={120} />
                   </div>
                   <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/10 group-hover:scale-110 transition-transform">
                      <Plus size={24} />
                   </div>
                   <div className="relative z-10">
                      <h4 className="font-bold text-xl leading-tight">{t.actions.create.title}</h4>
                      <p className="text-indigo-100 text-xs mt-1 font-medium opacity-80">{t.actions.create.desc}</p>
                   </div>
                </Link>

                <ActionTile icon={Layout} label={t.actions.classes.title} sub={t.actions.classes.desc} href="/teacher/classes" theme="violet" />
                <ActionTile icon={Star} label={t.actions.library.title} sub={t.actions.library.desc} href="/teacher/library" theme="amber" />
                <ActionTile icon={BarChart2} label={t.actions.analytics.title} sub={t.actions.analytics.desc} href="/teacher/analytics" theme="blue" />
                <ActionTile icon={Settings} label={t.actions.settings.title} sub={t.actions.settings.desc} href="/teacher/settings" theme="slate" />
                
             </div>
          </div>

          {/* 4. ACTIVITY FEED */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex flex-col h-full hover:border-slate-200 transition-colors">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                   <Clock size={20} className="text-slate-400" /> {t.sections.activity}
                </h3>
             </div>
             
             <div className="flex-1 space-y-5">
               {recentActivity.length === 0 ? (
                 <div className="h-40 flex flex-col items-center justify-center text-slate-400">
                    <Activity size={32} className="mb-2 opacity-20"/>
                    <p className="text-sm font-medium">{t.activity.empty}</p>
                 </div>
               ) : (
                 recentActivity.map((act, i) => (
                   <div key={act.id} className="group flex items-start gap-4">
                      {/* Timeline Dot */}
                      <div className="relative pt-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${i===0 ? 'bg-emerald-500 shadow-lg shadow-emerald-200 animate-pulse' : 'bg-slate-200 group-hover:bg-slate-300 transition-colors'}`}></div>
                        {i !== recentActivity.length - 1 && (
                          <div className="absolute top-4 left-[4px] w-0.5 h-full bg-slate-100 -z-10"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 pb-4 border-b border-slate-50 group-last:border-0 group-last:pb-0">
                         <div className="flex justify-between items-start">
                           <div>
                             <p className="text-sm font-bold text-slate-800 truncate leading-tight">
                               {act.studentName || 'Student'}
                             </p>
                             <p className="text-xs text-slate-500 mt-0.5 truncate w-40">
                               {t.activity.submitted} <span className="text-indigo-600 font-medium">{act.testTitle}</span>
                             </p>
                           </div>
                           <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                              {Math.round((act.score / act.totalQuestions) * 100)}%
                           </span>
                         </div>
                      </div>
                   </div>
                 ))
               )}
             </div>
             
             <Link href="/teacher/analytics" className="mt-4 flex items-center justify-center gap-1 text-xs font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-wide transition-colors pt-4 border-t border-slate-50">
               View All <ChevronRight size={14}/>
             </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS (With enhanced styles) ---

const StatCard = ({ label, value, icon: Icon, theme, delay }: any) => {
  const themes: any = {
    // Gradient Backgrounds (KPI Style)
    blue: "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-200/50",
    violet: "bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-violet-200/50",
    amber: "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-200/50",
    emerald: "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-200/50",
  };

  return (
    <div 
      className={`p-6 rounded-[2rem] shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group animate-in fade-in slide-in-from-bottom-4 ${themes[theme]}`}
      style={{ animationDelay: delay, animationFillMode: 'backwards' }}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/10">
          <Icon size={24} className="text-white" />
        </div>
        <div className="flex gap-1 opacity-60">
           <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
           <div className="w-1.5 h-1.5 rounded-full bg-white/50"></div>
        </div>
      </div>
      <div>
        <h3 className="text-4xl font-black text-white tracking-tight">{value}</h3>
        <p className="text-xs font-bold text-white/80 uppercase tracking-wider mt-1">{label}</p>
      </div>
    </div>
  );
};

const ActionTile = ({ icon: Icon, label, sub, href, theme }: any) => {
  const themes: any = {
    violet: "text-violet-600 bg-violet-50 group-hover:bg-violet-600 group-hover:text-white",
    amber: "text-amber-600 bg-amber-50 group-hover:bg-amber-500 group-hover:text-white",
    blue: "text-blue-600 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white",
    slate: "text-slate-600 bg-slate-100 group-hover:bg-slate-800 group-hover:text-white",
  };

  return (
    <Link 
      href={href}
      className="flex flex-col justify-between p-5 rounded-[2rem] bg-white border border-slate-100 shadow-lg shadow-slate-200/40 hover:shadow-xl hover:border-slate-200 transition-all duration-300 hover:-translate-y-1 group h-44"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${themes[theme]}`}>
        <Icon size={24} />
      </div>
      <div>
        <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{label}</h4>
        <p className="text-slate-400 text-xs mt-1 line-clamp-2">{sub}</p>
      </div>
    </Link>
  );
};

const DashboardSkeleton = () => (
  <div className="min-h-screen bg-slate-50 p-6 md:p-10 space-y-8">
    <div className="h-24 bg-slate-200 rounded-[2rem] w-full animate-pulse"></div>
    <div className="grid grid-cols-4 gap-4">
       {[1,2,3,4].map(i => <div key={i} className="h-40 bg-slate-200 rounded-[2rem] animate-pulse"></div>)}
    </div>
    <div className="grid grid-cols-3 gap-8 h-96">
       <div className="col-span-2 bg-slate-200 rounded-[2rem] animate-pulse"></div>
       <div className="bg-slate-200 rounded-[2rem] animate-pulse"></div>
    </div>
  </div>
);
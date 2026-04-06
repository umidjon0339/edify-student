'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { 
  Trophy, Flame, Target, ArrowRight, Star, 
  CheckCircle, Activity, Sparkles, School, BookOpen, BookMarked
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudentLanguage } from '../layout'; 
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, YAxis } from 'recharts';
import toast from 'react-hot-toast';

// ============================================================================
// 🟢 1. GLOBAL CACHE (0 Reads on Back Navigation)
// ============================================================================
const globalDashboardCache: Record<string, { profile: any, timestamp: number }> = {};
const CACHE_LIFESPAN = 60 * 1000; // 60 seconds

// --- TRANSLATION DICTIONARY ---
const DASHBOARD_TRANSLATIONS: any = {
  uz: {
    loading: "Yuklanmoqda...",
    hello: "Salom, {name}!", subtitle: "O'qishni davom ettiramizmi?",
    buttons: { classes: "Sinflarim", browse: "Sinflarni Ko'rish", cancel: "Bekor qilish" },
    stats: { xp: "Jami XP", streak: "Seriya", level: "Daraja", goal: "Maqsad", days: "kun", edit: "Tahrir" },
    task: { title: "So'nggi Faollik", empty: "Hali hech qanday test ishlanmadi.", btn: "Sinflarga O'tish", score: "Ball" },
    activity: { title: "7 Kunlik Faollik", live: "Jonli" },
    modal: { title: "Kunlik Maqsad", desc: "O'zingizga mos maqsadni tanlang!", levels: { Casual: "Oddiy", Regular: "O'rtacha", Serious: "Jiddiy", Insane: "Dahshat" }, saved: "Maqsad saqlandi!" },
    library: { title: "Onlayn Kutubxona", desc: "Xalqaro va mahalliy darsliklar to'plamini kashf eting.", btn: "Kutubxonaga o'tish" }
  },
  en: {
    loading: "Loading...",
    hello: "Hi, {name}!", subtitle: "Ready to learn something new?",
    buttons: { classes: "Classes", browse: "Browse Classes", cancel: "Cancel" },
    stats: { xp: "Total XP", streak: "Streak", level: "Level", goal: "Daily Goal", days: "days", edit: "Edit" },
    task: { title: "Recent Activity", empty: "No tests taken yet.", btn: "Go to Classes", score: "Score" },
    activity: { title: "7-Day Activity", live: "Live" },
    modal: { title: "Daily Goal", desc: "Choose an XP target that challenges you!", levels: { Casual: "Casual", Regular: "Regular", Serious: "Serious", Insane: "Insane" }, saved: "Goal saved!" },
    library: { title: "Online Library", desc: "Discover a massive collection of textbooks and resources.", btn: "Explore Library" }
  },
  ru: {
    loading: "Загрузка...",
    hello: "Привет, {name}!", subtitle: "Готовы продолжить обучение?",
    buttons: { classes: "Классы", browse: "Смотреть", cancel: "Отмена" },
    stats: { xp: "Всего XP", streak: "Серия", level: "Уровень", goal: "Цель", days: "дн.", edit: "Изм." },
    task: { title: "Недавняя активность", empty: "Тесты еще не пройдены.", btn: "Перейти к классам", score: "Балл" },
    activity: { title: "Активность (7 Дней)", live: "Live" },
    modal: { title: "Цель Дня", desc: "Выберите свою цель XP на день!", levels: { Casual: "Легкий", Regular: "Обычный", Serious: "Серьезный", Insane: "Безумный" }, saved: "Цель сохранена!" },
    library: { title: "Онлайн Библиотека", desc: "Откройте для себя коллекцию учебников и ресурсов.", btn: "В Библиотеку" }
  }
};

interface UserProfile {
  displayName: string;
  totalXP: number;
  currentStreak: number;
  dailyGoal: number;
  dailyHistory: Record<string, number>;
  recentActivity: any[]; 
}

const generateChartData = (dailyHistory: Record<string, number> | undefined, lang: string) => {
  const data = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const offset = d.getTimezoneOffset() * 60000;
    const dateStr = new Date(d.getTime() - offset).toISOString().split('T')[0];
    const displayDate = d.toLocaleDateString(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' });
    data.push({ name: displayDate.toUpperCase(), XP: dailyHistory?.[dateStr] || 0 });
  }
  return data;
};

const calculateTrueStreak = (dailyHistory: Record<string, number> | undefined) => {
  if (!dailyHistory) return 0;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const formatDate = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  if (!dailyHistory[formatDate(today)] && !dailyHistory[formatDate(yesterday)]) return 0;

  let streakCount = 0;
  let checkDate = new Date(dailyHistory[formatDate(today)] ? today : yesterday);

  while (dailyHistory[formatDate(checkDate)] && dailyHistory[formatDate(checkDate)] > 0) {
    streakCount++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streakCount;
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const { lang } = useStudentLanguage();
  const t = DASHBOARD_TRANSLATIONS[lang] || DASHBOARD_TRANSLATIONS['en'];

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState(200);

  const chartData = useMemo(() => generateChartData(profile?.dailyHistory, lang), [profile, lang]);

  // ============================================================================
  // 🟢 2. DATA FETCHING (Strictly 1 Read per session)
  // ============================================================================
  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return;
      const cached = globalDashboardCache[user.uid];
      const now = Date.now();

      if (cached && now - cached.timestamp < CACHE_LIFESPAN) {
        setProfile(cached.profile);
        setNewGoal(cached.profile.dailyGoal);
        setLoading(false);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        let userData: UserProfile = { displayName: user.displayName || 'Student', totalXP: 0, currentStreak: 0, dailyGoal: 200, dailyHistory: {}, recentActivity: [] };
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          userData = {
            displayName: data.displayName || user.displayName || 'Student',
            totalXP: data.totalXP ?? data.xp ?? 0,
            currentStreak: calculateTrueStreak(data.dailyHistory),
            dailyGoal: data.dailyGoal || 200,
            dailyHistory: data.dailyHistory || {},
            recentActivity: data.recentActivity || []
          };
        }
        
        setProfile(userData);
        setNewGoal(userData.dailyGoal);
        globalDashboardCache[user.uid] = { profile: userData, timestamp: Date.now() };

      } catch (error) {
        console.error("Dashboard Load Error:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [user]);

  // ============================================================================
  // 🟢 3. ACTIONS & HELPERS
  // ============================================================================
  const todayKey = new Date().toISOString().split('T')[0];
  const todayXP = profile?.dailyHistory?.[todayKey] || 0;
  const dailyGoal = profile?.dailyGoal || 200;
  const progressPercent = Math.min(Math.round((todayXP / dailyGoal) * 100), 100);
  
  const currentLevel = Math.floor((profile?.totalXP || 0) / 1000) + 1;
  const currentLevelProgress = (profile?.totalXP || 0) % 1000;
  const levelProgressPercent = Math.min((currentLevelProgress / 1000) * 100, 100);

  const handleSaveGoal = async (goal: number) => {
    if (!user) return;
    setNewGoal(goal);
    setProfile(prev => prev ? ({ ...prev, dailyGoal: goal }) : null);
    setIsEditingGoal(false);
    
    try {
      await updateDoc(doc(db, 'users', user.uid), { dailyGoal: goal });
      toast.success(t.modal.saved);
      if (globalDashboardCache[user.uid]) globalDashboardCache[user.uid].profile.dailyGoal = goal;
    } catch (e) {
      console.error(e);
      toast.error("Error saving goal");
    }
  };

  // ============================================================================
  // 🟢 4. RENDER UI
  // ============================================================================
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 gap-4 font-sans">
        <div className="w-16 h-16 bg-white border-4 border-zinc-200 border-b-8 rounded-[2rem] flex items-center justify-center shadow-sm">
          <BookOpen className="text-indigo-500 animate-bounce" size={32} strokeWidth={3} />
        </div>
        <span className="font-black text-zinc-400 uppercase tracking-widest text-[14px]">{t.loading}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans pb-24 md:pb-12">
      
      {/* 🟢 HERO GREETING */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 pt-8 pb-6">
        <h1 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight">
          {t.hello.replace("{name}", profile?.displayName?.split(' ')[0] || '')} 👋
        </h1>
        <p className="text-[15px] font-bold text-zinc-500 mt-1">{t.subtitle}</p>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 flex flex-col gap-6">
        
        {/* 🟢 TACTILE STATS GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {/* XP Card */}
          <div className="bg-white rounded-[1.5rem] border-2 border-zinc-200 border-b-[6px] p-5 flex flex-col hover:-translate-y-1 transition-transform">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-500 border-2 border-amber-200"><Trophy size={16} strokeWidth={3}/></div>
              <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">{t.stats.xp}</span>
            </div>
            <p className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight">{(profile?.totalXP || 0).toLocaleString()}</p>
          </div>

          {/* Streak Card */}
          <div className="bg-white rounded-[1.5rem] border-2 border-zinc-200 border-b-[6px] p-5 flex flex-col hover:-translate-y-1 transition-transform">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500 border-2 border-orange-200"><Flame size={16} strokeWidth={3}/></div>
              <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">{t.stats.streak}</span>
            </div>
            <p className={`text-2xl md:text-3xl font-black tracking-tight ${profile!.currentStreak > 0 ? 'text-orange-500' : 'text-zinc-900'}`}>
              {profile?.currentStreak} <span className="text-[14px] font-bold text-zinc-400">{t.stats.days}</span>
            </p>
          </div>

          {/* Level Card */}
          <div className="bg-white rounded-[1.5rem] border-2 border-zinc-200 border-b-[6px] p-5 flex flex-col hover:-translate-y-1 transition-transform">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-500 border-2 border-emerald-200"><Star size={16} strokeWidth={3}/></div>
                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest hidden sm:block">{t.stats.level}</span>
              </div>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border-2 border-emerald-100">{currentLevelProgress}/1K</span>
            </div>
            <p className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight">{currentLevel}</p>
            <div className="w-full h-2.5 bg-zinc-100 rounded-full mt-3 overflow-hidden border border-zinc-200/50">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${levelProgressPercent}%` }}></div>
            </div>
          </div>

          {/* Daily Goal Card (Interactive) */}
          <div onClick={() => setIsEditingGoal(true)} className="bg-white rounded-[1.5rem] border-2 border-zinc-200 border-b-[6px] hover:border-indigo-300 hover:border-b-indigo-400 active:border-b-2 active:translate-y-[4px] p-5 flex flex-col cursor-pointer transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-500 border-2 border-indigo-200"><Target size={16} strokeWidth={3}/></div>
                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest hidden sm:block">{t.stats.goal}</span>
              </div>
              <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-lg border-2 border-indigo-100 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">{t.stats.edit}</span>
            </div>
            <p className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight">{todayXP} <span className="text-[14px] font-bold text-zinc-400">/ {dailyGoal}</span></p>
            <div className="w-full h-2.5 bg-zinc-100 rounded-full mt-3 overflow-hidden border border-zinc-200/50">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </div>

        {/* 🟢 MAIN CONTENT AREA */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Zero-Cost Recent Activity Card */}
          <div className="lg:col-span-2 bg-white border-2 border-zinc-200 border-b-[6px] rounded-[2rem] p-6 md:p-8 flex flex-col justify-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 bg-emerald-50 border-emerald-200 text-emerald-600 font-black text-[11px] uppercase tracking-widest mb-6 w-max">
              <Sparkles size={14} strokeWidth={3}/> {t.task.title}
            </div>
            
            {profile?.recentActivity && profile.recentActivity.length > 0 ? (
              <div className="space-y-3 mb-8">
                {profile.recentActivity.slice(0, 2).map((activity: any, idx: number) => {
                  const percent = Math.round((activity.score / activity.totalQuestions) * 100);
                  const badgeColor = percent >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : percent >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-rose-100 text-rose-700 border-rose-200';
                  return (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-[1.5rem] border-2 border-zinc-100 bg-zinc-50">
                      <div className="min-w-0 pr-4">
                        <p className="font-black text-zinc-800 text-[15px] truncate">{activity.testTitle}</p>
                        <p className="text-[11px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">{new Date(activity.submittedAt).toLocaleDateString()}</p>
                      </div>
                      <div className={`px-3 py-1.5 rounded-xl border-2 font-black text-[14px] shrink-0 ${badgeColor}`}>
                        {percent}%
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-zinc-400 font-bold mb-8 text-[15px] border-2 border-dashed border-zinc-200 p-6 rounded-[1.5rem] text-center">
                {t.task.empty}
              </div>
            )}
            
            <Link href="/classes" className="w-full md:w-max px-8 py-4 bg-indigo-600 text-white font-black text-[15px] uppercase tracking-widest rounded-[1.2rem] border-b-4 border-indigo-800 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2 shadow-sm">
              <School size={18} strokeWidth={3}/> {t.task.btn} <ArrowRight size={18} strokeWidth={3} className="ml-1"/>
            </Link>
          </div>

          {/* TACTILE AREA CHART (Last 7 Days) */}
          <div className="bg-white border-2 border-zinc-200 border-b-[6px] rounded-[2rem] p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-zinc-900 flex items-center gap-2 text-[14px] uppercase tracking-widest">
                <Activity size={18} strokeWidth={3} className="text-indigo-500" /> {t.activity.title}
              </h3>
              {(profile?.totalXP || 0) > 0 && (
                <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded-lg border-2 border-indigo-100 uppercase tracking-widest">
                  {t.activity.live}
                </span>
              )}
            </div>
            
            <div className="w-full h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorXP" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A1A1AA', fontWeight: 900 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A1A1AA', fontWeight: 900 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181B', borderRadius: '16px', border: 'none', color: '#fff', fontWeight: '900', fontSize: '13px', padding: '8px 14px' }}
                    itemStyle={{ color: '#6366F1' }} cursor={{ stroke: '#E4E4E7', strokeWidth: 2, strokeDasharray: '4 4' }} 
                  />
                  <Area type="monotone" dataKey="XP" stroke="#6366F1" strokeWidth={4} fillOpacity={1} fill="url(#colorXP)" activeDot={{ r: 6, fill: '#6366F1', stroke: '#fff', strokeWidth: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* 🟢 NEW: FULL-WIDTH LIBRARY PROMO BANNER */}
          <div className="lg:col-span-3 bg-white border-2 border-zinc-200 border-b-[6px] rounded-[2rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-indigo-300 hover:border-b-indigo-400 transition-colors group">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 text-center md:text-left">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-[1.5rem] flex items-center justify-center border-2 border-indigo-200 shadow-sm shrink-0 rotate-3 group-hover:rotate-6 transition-transform">
                <BookMarked size={32} strokeWidth={2.5} />
              </div>
              <div className="pt-1">
                <h3 className="text-xl md:text-2xl font-black text-zinc-900 tracking-tight mb-2">{t.library.title}</h3>
                <p className="text-[14px] md:text-[15px] font-bold text-zinc-500 max-w-lg">{t.library.desc}</p>
              </div>
            </div>
            <Link href="/library" className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white font-black text-[15px] uppercase tracking-widest rounded-[1.2rem] border-b-4 border-indigo-800 hover:bg-indigo-500 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2 shadow-sm shrink-0">
              {t.library.btn} <ArrowRight size={18} strokeWidth={3} />
            </Link>
          </div>

        </div>

        {/* 🟢 TACTILE GOAL EDIT MODAL */}
        <AnimatePresence>
          {isEditingGoal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsEditingGoal(false)} />
              
              <motion.div 
                className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 md:p-8 w-full max-w-md shadow-2xl relative z-10 flex flex-col"
                initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              >
                <h3 className="text-2xl font-black text-zinc-900 tracking-tight mb-2">{t.modal.title}</h3>
                <p className="text-[14px] font-bold text-zinc-500 mb-6">{t.modal.desc}</p>
                
                <div className="space-y-3">
                  {[
                    { xp: 50, label: 'Casual', emoji: '😌', color: 'emerald' },
                    { xp: 100, label: 'Regular', emoji: '🎯', color: 'blue' },
                    { xp: 200, label: 'Serious', emoji: '🔥', color: 'orange' },
                    { xp: 500, label: 'Insane', emoji: '⚡', color: 'indigo' }
                  ].map(({ xp, label, emoji, color }) => {
                    const isSelected = newGoal === xp;
                    return (
                      <button
                        key={xp}
                        onClick={() => handleSaveGoal(xp)}
                        className={`w-full p-4 rounded-2xl border-2 transition-all flex justify-between items-center ${isSelected ? `border-${color}-500 bg-${color}-50 border-b-2 translate-y-[2px]` : 'border-zinc-200 border-b-4 bg-white hover:bg-zinc-50 active:border-b-2 active:translate-y-[2px]'}`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{emoji}</span>
                          <div className="text-left">
                            <div className={`font-black text-[16px] ${isSelected ? `text-${color}-700` : 'text-zinc-900'}`}>{xp} XP</div>
                            <div className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">{t.modal.levels[label as keyof typeof t.modal.levels]}</div>
                          </div>
                        </div>
                        {isSelected && <CheckCircle className={`text-${color}-500`} size={24} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
                
                <button onClick={() => setIsEditingGoal(false)} className="w-full mt-6 py-4 bg-zinc-100 text-zinc-500 hover:text-zinc-700 font-black text-[13px] uppercase tracking-widest rounded-[1.2rem] border-2 border-zinc-200 border-b-4 active:border-b-0 active:translate-y-[4px] transition-all">
                  {t.buttons.cancel}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
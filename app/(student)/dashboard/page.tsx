'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { 
  Trophy, Flame, Target, ArrowRight, Star, 
  CheckCircle, Activity, Sparkles, Clock, School,
  Smartphone, DownloadCloud // 🟢 Added these two
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudentLanguage } from '../layout'; 

// --- 1. TRANSLATION DICTIONARY ---
const DASHBOARD_TRANSLATIONS = {
  uz: {
    loading: "Talabalar markazi yuklanmoqda...",
    hello: "Salom, {name}!",
    subtitle: "Akademik panelingiz tayyor. Keling, o'rganamiz!",
    buttons: {
      history: "Natijalar",
      classes: "Sinflarim",
      startTest: "Testni Boshlash",
      browse: "Sinflarni Ko'rish",
      viewAll: "Barcha Sinflar",
      cancel: "Bekor qilish"
    },
    stats: {
      xp: "Jami XP",
      streak: "Faol Seriya",
      level: "Joriy Daraja",
      goal: "Kunlik Maqsad",
      days: "kun"
    },
    task: {
      upcoming: "Yaqinlashayotgan Muddat",
      caughtUp: "Hammasi bajarildi!",
      defaultTitle: "Sinovga tayyormisiz?",
      descPending: "Bu test sizning navbatdagi vazifangiz. Seriyani saqlab qolish va XP olish uchun uni bajaring.",
      descEmpty: "Kutilayotgan vazifalar yo'q! Natijalarni yaxshilash uchun sinflarni ko'zdan kechiring."
    },
    activity: {
      title: "Faollik Seriyasi (7 Kun)",
      today: "Bugun"
    },
    modal: {
      title: "Kunlik Maqsadni Sozlash",
      desc: "O'zingizga mos keladigan kunlik XP maqsadini tanlang!",
      levels: {
        Casual: "Oddiy",
        Regular: "O'rtacha",
        Serious: "Jiddiy",
        Insane: "Dahshat"
      }
    },
    appPromo: {
      title: "Mobil ilovani yuklab oling!",
      desc: "Yangi imkoniyatlar uchun Play Store'dan yangilang yoki yuklab oling.",
      button: "Play Store'dan yuklash"
    }
  },
  en: {
    loading: "Loading Student Hub...",
    hello: "Hello, {name}!",
    subtitle: "Your academic dashboard is ready. Let's learn!",
    buttons: {
      history: "Past Results",
      classes: "My Classes",
      startTest: "Start Test Now",
      browse: "Browse Classes",
      viewAll: "View All Classes",
      cancel: "Cancel"
    },
    stats: {
      xp: "Total XP Earned",
      streak: "Active Streak",
      level: "Current Level",
      goal: "Daily Goal",
      days: "days"
    },
    task: {
      upcoming: "Upcoming Deadline",
      caughtUp: "You're All Caught Up!",
      defaultTitle: "Ready for a Challenge?",
      descPending: "This test is your next priority. Complete it to keep your streak alive and earn XP.",
      descEmpty: "No pending assignments! Browse your classes to review or improve your scores."
    },
    activity: {
      title: "Activity Streak (7 Days)",
      today: "Today"
    },
    modal: {
      title: "Set Daily Goal",
      desc: "Choose a daily XP target that challenges you!",
      levels: {
        Casual: "Casual",
        Regular: "Regular",
        Serious: "Serious",
        Insane: "Insane"
      }
    },
    appPromo: {
      title: "Get the Mobile App!",
      desc: "Update or download from the Play Store for anti-cheat features and the best experience.",
      button: "Get it on Play Store"
    }
  },
  ru: {
    loading: "Загрузка центра...",
    hello: "Привет, {name}!",
    subtitle: "Ваша панель готова. Давайте учиться!",
    buttons: {
      history: "История",
      classes: "Мои Классы",
      startTest: "Начать Тест",
      browse: "Обзор Классов",
      viewAll: "Все Классы",
      cancel: "Отмена"
    },
    stats: {
      xp: "Всего XP",
      streak: "Серия",
      level: "Текущий Уровень",
      goal: "Цель Дня",
      days: "дн."
    },
    task: {
      upcoming: "Срок сдачи",
      caughtUp: "Все выполнено!",
      defaultTitle: "Готовы к вызову?",
      descPending: "Этот тест - ваш приоритет. Выполните его, чтобы сохранить серию и получить XP.",
      descEmpty: "Нет активных заданий! Просмотрите классы, чтобы улучшить свои результаты."
    },
    activity: {
      title: "Активность (7 Дней)",
      today: "Сегодня"
    },
    modal: {
      title: "Цель Дня",
      desc: "Выберите цель XP, которая бросит вам вызов!",
      levels: {
        Casual: "Легкий",
        Regular: "Обычный",
        Serious: "Серьезный",
        Insane: "Безумный"
      }
    },
    appPromo: {
      title: "Скачайте мобильное приложение!",
      desc: "Обновите или скачайте с Play Store для защиты от списывания и новых функций.",
      button: "Скачать с Play Store"
    }
  }
};

interface UserProfile {
  displayName: string;
  totalXP: number;
  currentStreak: number;
  dailyGoal: number;
  dailyHistory: Record<string, number>;
}

interface UpcomingTask {
  assignmentId: string;
  classId: string;
  title: string;
  className: string;
  dueAt: any;
}

const FloatingParticles = () => {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
    opacity: Math.random() * 0.6 + 0.2,
  }));

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.sin(particle.id) * 50, 0],
            opacity: [particle.opacity, particle.opacity * 0.1, particle.opacity],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

const GlowingOrb = ({ color, size, position }: { color: string; size: number; position: { x: string; y: string } }) => {
  return (
    <motion.div
      className={`absolute rounded-full ${color} blur-3xl opacity-20`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        left: position.x,
        top: position.y,
      }}
      animate={{
        scale: [1, 1.5, 1],
        opacity: [0.2, 0.4, 0.2],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const { lang } = useStudentLanguage();
  const t = DASHBOARD_TRANSLATIONS[lang];

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [nextTask, setNextTask] = useState<UpcomingTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState(200); // 🟢 Default 200

  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return;

      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data() as UserProfile;
          setProfile({
            displayName: data.displayName || user.displayName || 'Student',
            totalXP: data.totalXP || 0,
            currentStreak: data.currentStreak || 0,
            dailyGoal: data.dailyGoal || 200, // 🟢 Default 200
            dailyHistory: data.dailyHistory || {}
          });
          setNewGoal(data.dailyGoal || 200);
        } else {
          setProfile({
            displayName: user.displayName || 'Student',
            totalXP: 0,
            currentStreak: 0,
            dailyGoal: 200, // 🟢 Default 200
            dailyHistory: {}
          });
        }

        // Load Task Logic (Unchanged)
        const enrolledQ = collection(db, `users/${user.uid}/enrolled_classes`);
        const enrolledSnap = await getDocs(enrolledQ);
        const classIds = enrolledSnap.docs.map(d => d.id);

        if (classIds.length > 0) {
           let foundTask: UpcomingTask | null = null;
           for (const clsId of classIds) {
             const assignQ = query(collection(db, `classes/${clsId}/assignments`), where('status', '==', 'active'), orderBy('dueAt', 'asc'), limit(1));
             const assignSnap = await getDocs(assignQ);
             if (!assignSnap.empty) {
                const aData = assignSnap.docs[0].data();
                const attemptQ = query(collection(db, 'attempts'), where('assignmentId', '==', assignSnap.docs[0].id), where('userId', '==', user.uid));
                const attemptSnap = await getDocs(attemptQ);
                if(attemptSnap.empty) {
                   foundTask = { assignmentId: assignSnap.docs[0].id, classId: clsId, title: aData.title, className: "Mathematics", dueAt: aData.dueAt };
                   break;
                }
             }
           }
           setNextTask(foundTask);
        }

      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [user]);

  // 🟢 CALCULATIONS
  const todayKey = new Date().toISOString().split('T')[0];
  const todayXP = profile?.dailyHistory?.[todayKey] || 0;
  const dailyGoal = profile?.dailyGoal || 200;
  const progressPercent = Math.min(Math.round((todayXP / dailyGoal) * 100), 100);
  
  // 🟢 LEVEL LOGIC: Every 1000 XP = 1 Level
  const currentLevel = Math.floor((profile?.totalXP || 0) / 1000) + 1;
  const currentLevelProgress = (profile?.totalXP || 0) % 1000;
  const nextLevelXP = 1000; // Fixed Target
  const levelProgressPercent = Math.min((currentLevelProgress / nextLevelXP) * 100, 100);

  const saveGoal = (goal: number) => {
    setProfile(prev => prev ? ({ ...prev, dailyGoal: goal }) : null);
    setIsEditingGoal(false);
    // Note: Ideally save to Firebase here
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <FloatingParticles />
        <div className="text-center relative z-10">
          <div className="w-20 h-20 border-4 border-slate-700 border-t-blue-500 rounded-full mx-auto animate-spin"></div>
          <p className="mt-6 text-slate-300 font-bold text-lg">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-800 relative overflow-hidden">
      <FloatingParticles />
      <GlowingOrb color="bg-blue-500" size={300} position={{ x: '10%', y: '20%' }} />
      <GlowingOrb color="bg-purple-500" size={400} position={{ x: '85%', y: '15%' }} />
      <GlowingOrb color="bg-orange-500" size={250} position={{ x: '70%', y: '80%' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-12 relative z-10">
        
        {/* HEADER */}
        <motion.div 
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-5"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="space-y-2 pt-[40px] md:pt-0">
            <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight">
              {t.hello.replace("{name}", "")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                {profile?.displayName}
              </span>! 👋
            </h1>
            <p className="text-slate-400 font-semibold flex items-center gap-2 text-lg">
              <Activity size={20} className="text-blue-400" />
              {t.subtitle}
            </p>
          </div>
          <div className="flex gap-3">
            <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
              <Link href="/history" className="px-6 py-3 bg-slate-800/80 backdrop-blur-sm border-2 border-slate-700 text-slate-300 font-bold rounded-xl hover:bg-slate-800 hover:border-slate-600 hover:shadow-xl hover:shadow-slate-700/50 transition-all">
                {t.buttons.history}
              </Link>
            </motion.button>
            <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
              <Link href="/classes" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-500/40 hover:shadow-2xl transition-all flex items-center gap-2">
                <School size={20} /> {t.buttons.classes}
              </Link>
            </motion.button>
          </div>
        </motion.div>

        {/* 🟢 NEW: APP PROMO BANNER 🟢 */}
        <motion.div
          className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 md:p-8 shadow-2xl shadow-emerald-500/20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border border-emerald-400/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
        >
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

          <motion.a
            href="https://play.google.com/store/apps/details?id=uz.wasp2ai.edifystudent"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="relative z-10 w-full md:w-auto px-8 py-4 bg-white text-emerald-700 font-black rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shrink-0"
          >
            <DownloadCloud size={24} />
            {t.appPromo.button}
          </motion.a>
        </motion.div>
        {/* 🟢 END OF APP PROMO BANNER 🟢 */}

        {/* STATS GRID */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {[
            { 
              icon: <Trophy size={28} />, 
              value: (profile?.totalXP || 0).toLocaleString(), 
              label: t.stats.xp, 
              color: "blue" 
            },
            { 
              icon: <Flame size={28} />, 
              value: `${profile?.currentStreak || 0} ${t.stats.days}`, 
              label: t.stats.streak, 
              color: "orange" 
            },
            { 
              icon: <Star size={28} />, 
              value: `${t.stats.level.split(' ')[1] || 'Lvl'} ${currentLevel}`, 
              label: t.stats.level, 
              color: "purple", 
              sub: `${currentLevelProgress} / 1000 XP`, // 🟢 Updated Display
              progress: levelProgressPercent // 🟢 Updated Percent
            },
            { 
              icon: <Target size={20} />, 
              value: `${todayXP} / ${dailyGoal} XP`, 
              label: t.stats.goal, 
              color: "blue", 
              progress: progressPercent,
              onClick: () => setIsEditingGoal(true) // Click to Edit
            }
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              onClick={stat.onClick}
              className={`bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl p-6 rounded-2xl border border-${stat.color}-500/30 shadow-2xl relative overflow-hidden group ${stat.onClick ? 'cursor-pointer hover:border-blue-400' : ''}`}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-transparent opacity-0 group-hover:opacity-10 transition-opacity"></div>
              <div className="relative">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 bg-gradient-to-br from-${stat.color}-500 to-${stat.color}-600 rounded-xl text-white`}>
                    {stat.icon}
                  </div>
                  {stat.sub && <span className={`text-xs font-bold text-${stat.color}-300 bg-${stat.color}-500/20 px-2 py-1 rounded-full`}>{stat.sub}</span>}
                </div>
                <p className="text-3xl font-black text-white mb-1">{stat.value}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
                
                {stat.progress !== undefined && (
                  <div className="mt-3 w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full rounded-full bg-gradient-to-r from-${stat.color}-500 to-${stat.color}-600`}
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.progress}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ACTION SECTION */}
        <motion.div 
          className="grid lg:grid-cols-3 gap-5"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Main Task Card */}
          <motion.div 
            className="lg:col-span-2 bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 relative overflow-hidden group"
            whileHover={{ y: -5 }}
          >
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-full text-xs font-bold mb-5">
                {nextTask ? <Clock size={14} /> : <Sparkles size={14} />} 
                {nextTask ? t.task.upcoming : t.task.caughtUp}
              </div>
              
              <h2 className="text-3xl font-black text-white mb-3">
                {nextTask ? nextTask.title : t.task.defaultTitle}
              </h2>
              
              <p className="text-slate-400 mb-6 max-w-lg text-lg">
                {nextTask ? t.task.descPending : t.task.descEmpty}
              </p>
              
              <div className="flex flex-wrap gap-4">
                <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
                  <Link 
                    href={nextTask ? `/classes/${nextTask.classId}/test/${nextTask.assignmentId}` : "/classes"}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-500 hover:to-indigo-500 shadow-xl flex items-center gap-2"
                  >
                    {nextTask ? t.buttons.startTest : t.buttons.browse} <ArrowRight size={20} />
                  </Link>
                </motion.button>
                <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/classes" className="px-8 py-4 bg-slate-700/50 border-2 border-slate-600 text-slate-300 font-bold rounded-xl hover:bg-slate-700 hover:border-slate-500 flex items-center gap-2">
                    <School size={20} /> {t.buttons.viewAll}
                  </Link>
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* 🟢 ACTIVITY CHART (Last 7 Days) */}
          <motion.div 
            className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 flex flex-col justify-between group"
            whileHover={{ y: -5 }}
          >
            <h3 className="font-black text-white mb-5 flex items-center gap-2 text-lg">
              <Activity size={20} className="text-orange-400" /> {t.activity.title}
            </h3>
            
            <div className="flex gap-2 h-28 items-end justify-between">
              {/* Loop Last 7 Days (Correct Order) */}
              {[6, 5, 4, 3, 2, 1, 0].map((daysAgo) => {
                const d = new Date();
                d.setDate(d.getDate() - daysAgo);
                const key = d.toISOString().split('T')[0];
                const xp = profile?.dailyHistory?.[key] || 0;
                
                const isToday = daysAgo === 0;
                // Scale bar: max 200 XP = 100% height (min 10%)
                const height = Math.min(Math.max((xp / 200) * 100, 10), 100);
                
                // Get Day Name (M, T, W...)
                const dayName = d.toLocaleDateString('en-US', { weekday: 'narrow' });

                return (
                  <div key={key} className="w-full flex flex-col items-center gap-2 group/bar relative" title={`${key}: ${xp} XP`}>
                    {/* Tooltip on Hover */}
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10">
                      {xp} XP
                    </div>

                    <div 
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        isToday ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : xp > 0 ? 'bg-blue-600/60 hover:bg-blue-500' : 'bg-slate-700/30'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                    <span className={`text-[10px] font-bold ${isToday ? 'text-white' : 'text-slate-500'}`}>
                      {dayName}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>

        {/* GOAL EDIT MODAL (Unchanged) */}
        <AnimatePresence>
          {isEditingGoal && (
            <motion.div 
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
              >
                <h3 className="text-2xl font-black text-white mb-2">{t.modal.title}</h3>
                <p className="text-slate-400 mb-6">{t.modal.desc}</p>
                {[
                  { xp: 50, label: 'Casual', emoji: '😌' },
                  { xp: 100, label: 'Regular', emoji: '🎯' },
                  { xp: 200, label: 'Serious', emoji: '🔥' },
                  { xp: 500, label: 'Insane', emoji: '⚡' }
                ].map(({ xp, label, emoji }) => (
                  <motion.button
                    key={xp}
                    onClick={() => saveGoal(xp)}
                    className={`w-full p-4 rounded-xl border-2 mb-3 text-left ${newGoal === xp ? 'border-blue-500 bg-blue-500/20' : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'}`}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{emoji}</span>
                        <div>
                          <div className="font-black text-white">{xp} XP</div>
                          <div className="text-sm text-slate-400">{t.modal.levels[label as keyof typeof t.modal.levels]}</div>
                        </div>
                      </div>
                      {newGoal === xp && <CheckCircle className="text-blue-400" size={20} />}
                    </div>
                  </motion.button>
                ))}
                <button onClick={() => setIsEditingGoal(false)} className="w-full mt-4 py-3 text-slate-400 font-bold rounded-xl">{t.buttons.cancel}</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
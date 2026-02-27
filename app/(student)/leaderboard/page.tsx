'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import { 
  Trophy, Medal, Crown, Sparkles, Shield 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudentLanguage } from '@/app/(student)/layout';

// --- 1. HELPERS: DATE IDs ---
const getPeriodIds = () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');

  const oneJan = new Date(Date.UTC(year, 0, 1));
  const days = Math.floor((now.getTime() - oneJan.getTime()) / 86400000);
  const weekNum = Math.ceil((days + oneJan.getUTCDay() + 1) / 7);

  return {
    today: `day_${year}_${month}_${day}`,
    week: `week_${year}_${String(weekNum).padStart(2, '0')}`,
    month: `month_${year}_${month}`,
    all: `all_time`
  };
};

// --- TRANSLATIONS ---
const LEADERBOARD_TRANSLATIONS = {
  uz: {
    title: "Chempionlar Ligasi",
    subtitle: "Eng kuchli o'quvchilar reytingi",
    tabs: { today: "Bugun", week: "Hafta", month: "Oy", all: "Umumiy" },
    empty: "Hozircha natijalar yo'q",
    you: "Siz",
    xp: "XP"
  },
  en: {
    title: "Champions League",
    subtitle: "Ranking the top performing students",
    tabs: { today: "Today", week: "This Week", month: "This Month", all: "All Time" },
    empty: "No results yet",
    you: "You",
    xp: "XP"
  },
  ru: {
    title: "Лига Чемпионов",
    subtitle: "Рейтинг лучших учеников",
    tabs: { today: "Сегодня", week: "Неделя", month: "Месяц", all: "Все время" },
    empty: "Пока нет результатов",
    you: "Вы",
    xp: "XP"
  }
};

// --- VISUAL COMPONENT: Floating Particles ---
const FloatingParticles = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 2,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
    opacity: Math.random() * 0.5 + 0.1,
  }));

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-blue-400"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
          }}
          animate={{
            y: [0, -80, 0],
            opacity: [particle.opacity, 0, particle.opacity],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

export default function LeaderboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useStudentLanguage();
  const t = LEADERBOARD_TRANSLATIONS[lang];

  // 🟢 State
  const [cache, setCache] = useState<Record<string, { leaders: any[], me: any }>>({});
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [leaders, setLeaders] = useState<any[]>([]);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- FETCH DATA (OPTIMIZED WITH CACHING & LIMIT 20) ---
  useEffect(() => {
    const fetchData = async () => {
      const periodIds = getPeriodIds();
      const collectionId = periodIds[activeTab];

      // 1. Check Cache First (Costs 0 Firebase Reads!)
      if (cache[activeTab]) {
        setLeaders(cache[activeTab].leaders);
        setCurrentUserData(cache[activeTab].me);
        return;
      }

      setLoading(true);
      try {
        // 2. Fetch Top 20 (Decreased from 50 to save costs)
        const q = query(
          collection(db, 'leaderboards', collectionId, 'users'), 
          orderBy('xp', 'desc'), 
          limit(20)
        );
        const snapshot = await getDocs(q);
        const fetchedLeaders = snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));

        let myData = null;

        // 3. Fetch "ME" logic
        if (user) {
          const myIndexInTop20 = fetchedLeaders.findIndex((u: any) => u.uid === user.uid);
          
          if (myIndexInTop20 !== -1) {
            // I am in the top 20
            myData = { ...fetchedLeaders[myIndexInTop20], rank: myIndexInTop20 + 1 };
          } else {
            // I am NOT in the top 20. Fetch my specific doc.
            const myDocRef = doc(db, 'leaderboards', collectionId, 'users', user.uid);
            const myDocSnap = await getDoc(myDocRef);
            if (myDocSnap.exists()) {
              myData = { uid: user.uid, ...myDocSnap.data(), rank: '>20' };
            }
          }
        }

        // 4. Save to Cache & Update State
        setCache(prev => ({
          ...prev,
          [activeTab]: { leaders: fetchedLeaders, me: myData }
        }));
        
        setLeaders(fetchedLeaders);
        setCurrentUserData(myData);

      } catch (error) {
        console.error("Leaderboard error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, user, cache]);

  // --- STYLING HELPERS ---
  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return "bg-gradient-to-r from-yellow-500/20 to-yellow-900/20 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.3)]";
      case 1: return "bg-gradient-to-r from-slate-400/20 to-slate-800/20 border-slate-400/50 shadow-[0_0_15px_rgba(148,163,184,0.2)]";
      case 2: return "bg-gradient-to-r from-orange-500/20 to-orange-900/20 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]";
      default: return "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60";
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown size={24} className="text-yellow-400 fill-yellow-400 animate-pulse drop-shadow-md" />;
      case 1: return <Medal size={22} className="text-slate-300 drop-shadow-md" />;
      case 2: return <Medal size={22} className="text-orange-400 drop-shadow-md" />;
      default: return <span className="font-bold text-slate-500 w-8 text-center text-lg">#{index + 1}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-800 pb-24 relative overflow-hidden text-slate-100">
      <FloatingParticles />

      <div className="max-w-2xl mx-auto relative z-10 flex flex-col h-full min-h-screen">
        
        {/* HEADER */}
        <div className="pt-20 md:pt-10 pb-6 px-6 text-center">
           <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 flex items-center justify-center gap-2 drop-shadow-sm">
             <Trophy size={28} className="text-yellow-400" fill="currentColor" /> {t.title}
           </h1>
           <p className="text-slate-400 text-sm font-medium mt-1 tracking-wide">{t.subtitle}</p>
        </div>

        {/* TABS */}
        <div className="px-4 mb-6 sticky top-4 z-50">
           <div className="bg-slate-900/80 p-1.5 rounded-2xl flex items-center justify-between border border-white/10 backdrop-blur-xl shadow-2xl">
              {(['today', 'week', 'month', 'all'] as const).map((tab) => (
                 <button
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={`relative flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === tab ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                 >
                   {activeTab === tab && (
                     <motion.div 
                        layoutId="tab-bg" 
                        className="absolute inset-0 bg-indigo-600 rounded-xl shadow-lg border border-indigo-400/30" 
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} 
                     />
                   )}
                   <span className="relative z-10">{t.tabs[tab]}</span>
                 </button>
              ))}
           </div>
        </div>

        {/* LIST VIEW */}
        <div className="flex-1 px-4 space-y-3 pb-6 relative">
          {loading ? (
             <div className="flex flex-col items-center justify-center space-y-4 py-20 opacity-50">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
             </div>
          ) : (
            <>
              <AnimatePresence mode="popLayout">
                 {leaders.length > 0 ? (
                   leaders.map((u, idx) => {
                     const isMe = user?.uid === u.uid;

                     return (
                       <motion.div
                         key={u.uid}
                         initial={{ opacity: 0, y: 15, scale: 0.95 }}
                         animate={{ opacity: 1, y: 0, scale: 1 }}
                         transition={{ delay: idx * 0.05, duration: 0.3 }}
                         onClick={() => router.push(`/profile/${u.uid}`)}
                         className={`rounded-2xl p-4 flex items-center gap-4 transition-all border backdrop-blur-sm relative overflow-hidden group cursor-pointer 
                           ${isMe ? 'ring-2 ring-blue-500/50 z-10' : ''} 
                           ${getRankStyle(idx)}
                         `}
                       >
                          <div className="w-10 flex justify-center shrink-0">
                            {getRankIcon(idx)}
                          </div>

                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border-2 overflow-hidden shadow-sm
                              ${idx === 0 ? 'border-yellow-400/50 bg-yellow-900/20 text-yellow-200' : 'border-slate-600 bg-slate-700 text-slate-300'}
                          `}>
                             {u.avatar ? (
                               <img src={u.avatar} className="w-full h-full object-cover" alt="User" />
                             ) : (
                               u.displayName?.[0] || 'U'
                             )}
                          </div>

                          <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2">
                               <h4 className={`font-bold text-base md:text-lg truncate ${idx === 0 ? 'text-yellow-100' : 'text-slate-200'}`}>
                                 {u.displayName || 'Anonymous Student'}
                               </h4>
                               {isMe && (
                                 <span className="shrink-0 text-[10px] font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full shadow-sm shadow-blue-500/50">
                                   {t.you}
                                 </span>
                               )}
                             </div>
                          </div>

                          <div className="text-right pl-2">
                             <span className={`block font-black text-xl tracking-tight ${
                                 idx === 0 ? 'text-yellow-400 drop-shadow-md' : 
                                 idx === 1 ? 'text-slate-300' : 
                                 idx === 2 ? 'text-orange-400' : 'text-indigo-400'}
                             `}>
                               {u.xp?.toLocaleString() || 0}
                             </span>
                             <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">XP</span>
                          </div>
                          
                          {idx < 3 && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000" />
                          )}
                       </motion.div>
                     );
                   })
                 ) : (
                   <div className="text-center py-20 text-slate-500">
                      <Sparkles className="mx-auto mb-2 opacity-20" size={40} />
                      <p className="text-sm font-medium">{t.empty}</p>
                   </div>
                 )}
              </AnimatePresence>

              {/* 🟢 FIXED BOTTOM CARD FOR CURRENT USER (If not in Top 20) */}
              {currentUserData && currentUserData.rank === '>20' && (
                <div className="sticky bottom-4 z-50 mt-4">
                  <div className="rounded-2xl p-4 flex items-center gap-4 border-2 border-indigo-500 bg-slate-800/90 backdrop-blur-md shadow-[0_-10px_30px_rgba(99,102,241,0.2)]">
                    
                    <div className="w-10 flex justify-center shrink-0">
                      <span className="font-bold text-slate-400 w-8 text-center text-lg">{currentUserData.rank}</span>
                    </div>

                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border-2 border-slate-600 bg-slate-700 text-slate-300 overflow-hidden">
                      {currentUserData.avatar ? (
                        <img src={currentUserData.avatar} className="w-full h-full object-cover" alt="User" />
                      ) : (
                        currentUserData.displayName?.[0] || 'U'
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base md:text-lg text-white truncate">
                          {currentUserData.displayName || 'Anonymous'}
                        </h4>
                        <span className="shrink-0 text-[10px] font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-full">
                          {t.you}
                        </span>
                      </div>
                    </div>

                    <div className="text-right pl-2">
                      <span className="block font-black text-xl tracking-tight text-indigo-400">
                        {currentUserData.xp?.toLocaleString() || 0}
                      </span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">XP</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
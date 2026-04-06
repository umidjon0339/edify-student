'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import { Trophy, Crown, Sparkles, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudentLanguage } from '@/app/(student)/layout';

// =========================================
// 1. HELPERS & GLOBAL CACHE
// =========================================

// 🟢 SMART CACHE: Survives navigation and tracks data age!
const globalLeaderboardCache: Record<string, { leaders: any[], me: any, timestamp: number }> = {};
const CACHE_LIFESPAN = 60 * 1000; // 60 seconds (1 minute)

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

// =========================================
// 2. TRANSLATIONS
// =========================================
const LEADERBOARD_TRANSLATIONS: any = {
  uz: {
    title: "Reyting",
    subtitle: "Eng faol o'quvchilar ro'yxati",
    tabs: { today: "Bugun", week: "Hafta", month: "Oy", all: "Umumiy" },
    empty: "Hozircha natijalar yo'q",
    you: "SIZ",
    xp: "XP"
  },
  en: {
    title: "Leaderboard",
    subtitle: "Ranking the top performing students",
    tabs: { today: "Today", week: "Week", month: "Month", all: "All Time" },
    empty: "No results yet",
    you: "YOU",
    xp: "XP"
  },
  ru: {
    title: "Рейтинг",
    subtitle: "Самые активные ученики",
    tabs: { today: "Сегодня", week: "Неделя", month: "Месяц", all: "За все время" },
    empty: "Пока нет результатов",
    you: "ВЫ",
    xp: "XP"
  }
};

export default function LeaderboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { lang } = useStudentLanguage();
  const t = LEADERBOARD_TRANSLATIONS[lang] || LEADERBOARD_TRANSLATIONS['en'];

  // 🟢 URL State Tab Logic
  const urlTab = searchParams.get('tab') as 'today' | 'week' | 'month' | 'all';
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month' | 'all'>(
    ['today', 'week', 'month', 'all'].includes(urlTab) ? urlTab : 'week'
  );

  const [leaders, setLeaders] = useState<any[]>([]);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🟢 Custom Tab Changer (Updates URL silently)
  const handleTabChange = (tab: 'today' | 'week' | 'month' | 'all') => {
    setActiveTab(tab);
    router.replace(`${pathname}?tab=${tab}`, { scroll: false });
  };

 // =========================================
  // 3. FETCH DATA (Stale-While-Revalidate)
  // =========================================
  useEffect(() => {
    const fetchData = async () => {
      const periodIds = getPeriodIds();
      const collectionId = periodIds[activeTab];
      const now = Date.now();

      // 🟢 1. INSTANT CACHE LOAD
      const cachedData = globalLeaderboardCache[activeTab];
      if (cachedData) {
        setLeaders(cachedData.leaders);
        setCurrentUserData(cachedData.me);
        setLoading(false); // Instantly paint the UI

        // If the cache is less than 60 seconds old, stop here. Zero reads!
        if (now - cachedData.timestamp < CACHE_LIFESPAN) {
          return; 
        }
        
        // 🟢 If older than 60s, DO NOT return. We let the code continue to 
        // fetch fresh data silently in the background (no loading spinner).
      } else {
        // Only show the loading skeleton if we have absolutely no cache
        setLoading(true); 
      }

      try {
        const q = query(
          collection(db, 'leaderboards', collectionId, 'users'), 
          orderBy('xp', 'desc'), 
          limit(20)
        );
        const snapshot = await getDocs(q);
        const fetchedLeaders = snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));

        let myData = null;

        if (user) {
          const myIndexInTop20 = fetchedLeaders.findIndex((u: any) => u.uid === user.uid);
          
          if (myIndexInTop20 !== -1) {
            myData = { ...fetchedLeaders[myIndexInTop20], rank: myIndexInTop20 + 1 };
          } else {
            const myDocRef = doc(db, 'leaderboards', collectionId, 'users', user.uid);
            const myDocSnap = await getDoc(myDocRef);
            if (myDocSnap.exists()) {
              myData = { uid: user.uid, ...myDocSnap.data(), rank: '20+' };
            }
          }
        }

        // 🟢 2. UPDATE CACHE & UI WITH FRESH DATA
        globalLeaderboardCache[activeTab] = { 
          leaders: fetchedLeaders, 
          me: myData, 
          timestamp: Date.now() // Record exactly when we fetched this
        };
        
        setLeaders(fetchedLeaders);
        setCurrentUserData(myData);

      } catch (error) {
        console.error("Leaderboard error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, user]);

  return (
    <div className="min-h-screen bg-zinc-50 pb-28 md:pb-12 relative font-sans">
      <div className="w-full max-w-[800px] mx-auto px-4 sm:px-6 relative z-10 flex flex-col h-full min-h-screen">
        
        {/* ========================================= */}
        {/* HEADER (Hidden on Mobile) */}
        {/* ========================================= */}
        <div className="hidden md:flex pt-10 pb-6 flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-zinc-900 tracking-tight flex items-center justify-start gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-[1.2rem] flex items-center justify-center border-2 border-amber-200 text-amber-500">
                <Trophy size={24} strokeWidth={2.5} />
              </div>
              {t.title}
            </h1>
            <p className="text-zinc-500 text-[15px] font-bold mt-1.5">{t.subtitle}</p>
          </div>
        </div>

        {/* ========================================= */}
        {/* CHUNKY TABS */}
        {/* ========================================= */}
        <div className="pt-6 md:pt-0 mb-6 sticky top-0 z-40 bg-zinc-50/90 backdrop-blur-xl pb-2">
           <div className="bg-zinc-200/80 p-1.5 rounded-[1.25rem] flex items-center justify-between border-2 border-white/50 shadow-sm mt-2">
              {(['today', 'week', 'month', 'all'] as const).map((tab) => (
                 <button
                   key={tab}
                   onClick={() => handleTabChange(tab)}
                   className={`relative flex-1 py-3 text-[12px] sm:text-[14px] font-black rounded-xl transition-all duration-200 ${
                     activeTab === tab ? 'text-violet-700' : 'text-zinc-500 hover:bg-zinc-300/50'
                   }`}
                 >
                   {activeTab === tab && (
                     <motion.div 
                        layoutId="tab-bg-leaderboard" 
                        className="absolute inset-0 bg-white rounded-xl shadow-sm border-2 border-zinc-200/50" 
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} 
                     />
                   )}
                   <span className="relative z-10 uppercase tracking-wide">{t.tabs[tab]}</span>
                 </button>
              ))}
           </div>
        </div>

        {/* ========================================= */}
        {/* LEADERBOARD LIST & PODIUM */}
        {/* ========================================= */}
        <div className="flex-1 space-y-3 pb-6 relative">
          {loading ? (
             // 🟢 TACTILE SKELETON LOADER
             <div className="space-y-3 animate-pulse pt-4">
                <div className="flex justify-center items-end gap-3 mb-10">
                  <div className="w-[30%] h-28 bg-zinc-200/80 rounded-t-[2rem]"></div>
                  <div className="w-[35%] h-36 bg-zinc-300 rounded-t-[2.5rem]"></div>
                  <div className="w-[30%] h-24 bg-zinc-200/80 rounded-t-[2rem]"></div>
                </div>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-20 bg-white border-2 border-zinc-200 rounded-2xl w-full"></div>
                ))}
             </div>
          ) : (
            <>
              <AnimatePresence mode="popLayout">
                 {leaders.length > 0 ? (
                   <div className="animate-in fade-in zoom-in-95 duration-500">
                     
                     {/* ========================================= */}
                     {/* 🏆 THE PODIUM (TOP 3) */}
                     {/* ========================================= */}
                     <div className="flex justify-center items-end gap-2 sm:gap-6 mt-4 sm:mt-8 mb-8 px-1">
                       
                       {/* 🥈 2ND PLACE */}
                       {leaders[1] && (
                         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} onClick={() => router.push(`/profile/${leaders[1].uid}`)} className="flex flex-col items-center w-[30%] max-w-[110px] mb-4 cursor-pointer group">
                           <div className="relative">
                             <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-gradient-to-b from-slate-300 to-slate-400 shadow-lg group-hover:-translate-y-2 transition-transform duration-300 ${user?.uid === leaders[1].uid ? 'ring-4 ring-violet-500/30' : ''}`}>
                               <div className="w-full h-full rounded-full overflow-hidden bg-white border-2 border-white flex items-center justify-center font-black text-2xl text-slate-400">
                                 {leaders[1].photoURL || leaders[1].photoUrl || leaders[1].avatar ? <img src={leaders[1].photoURL || leaders[1].photoUrl || leaders[1].avatar} className="w-full h-full object-cover" alt="User" /> : leaders[1].displayName?.[0]?.toUpperCase()}
                               </div>
                             </div>
                             <div className="absolute -bottom-2 -right-1 bg-slate-500 text-white w-7 h-7 rounded-full flex items-center justify-center font-black text-[13px] border-2 border-white shadow-md z-10">2</div>
                           </div>
                           <h4 className="font-black text-[12px] sm:text-[14px] text-slate-700 mt-4 text-center line-clamp-2 leading-tight px-1">{leaders[1].displayName || 'Student'}</h4>
                           <div className="mt-1.5 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                             <span className="font-black text-slate-600 text-[12px]">{leaders[1].xp?.toLocaleString()}</span><span className="text-[8px] font-bold text-slate-400 mt-0.5">XP</span>
                           </div>
                         </motion.div>
                       )}

                       {/* 🥇 1ST PLACE */}
                       {leaders[0] && (
                         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={() => router.push(`/profile/${leaders[0].uid}`)} className="flex flex-col items-center w-[38%] max-w-[130px] z-10 cursor-pointer group">
                           <div className="relative">
                             <Crown size={40} strokeWidth={2.5} className="absolute -top-10 left-1/2 -translate-x-1/2 text-amber-500 fill-amber-200 drop-shadow-md group-hover:-translate-y-2 transition-transform duration-300" />
                             <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1.5 bg-gradient-to-b from-amber-300 to-amber-500 shadow-[0_10px_30px_rgba(251,191,36,0.4)] group-hover:-translate-y-2 transition-transform duration-300 ${user?.uid === leaders[0].uid ? 'ring-4 ring-violet-500/30' : ''}`}>
                               <div className="w-full h-full rounded-full overflow-hidden bg-white border-2 border-white flex items-center justify-center font-black text-3xl text-amber-400">
                                 {leaders[0].photoURL || leaders[0].photoUrl || leaders[0].avatar ? <img src={leaders[0].photoURL || leaders[0].photoUrl || leaders[0].avatar} className="w-full h-full object-cover" alt="User" /> : leaders[0].displayName?.[0]?.toUpperCase()}
                               </div>
                             </div>
                             <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white w-9 h-9 rounded-full flex items-center justify-center font-black text-[16px] border-2 border-white shadow-md z-10">1</div>
                           </div>
                           <h4 className="font-black text-[14px] sm:text-[16px] text-amber-600 mt-5 text-center line-clamp-2 leading-tight px-1">{leaders[0].displayName || 'Student'}</h4>
                           <div className="mt-1.5 bg-amber-100 border border-amber-200 px-3 py-1 rounded-xl flex items-center gap-1 shadow-sm">
                             <span className="font-black text-amber-600 text-[14px]">{leaders[0].xp?.toLocaleString()}</span><span className="text-[9px] font-bold text-amber-500 mt-0.5">XP</span>
                           </div>
                         </motion.div>
                       )}

                       {/* 🥉 3RD PLACE */}
                       {leaders[2] && (
                         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} onClick={() => router.push(`/profile/${leaders[2].uid}`)} className="flex flex-col items-center w-[30%] max-w-[110px] mb-4 cursor-pointer group">
                           <div className="relative">
                             <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-b from-orange-300 to-orange-500 shadow-lg group-hover:-translate-y-2 transition-transform duration-300 ${user?.uid === leaders[2].uid ? 'ring-4 ring-violet-500/30' : ''}`}>
                               <div className="w-full h-full rounded-full overflow-hidden bg-white border-2 border-white flex items-center justify-center font-black text-2xl text-orange-400">
                                 {leaders[2].photoURL || leaders[2].photoUrl || leaders[2].avatar ? <img src={leaders[2].photoURL || leaders[2].photoUrl || leaders[2].avatar} className="w-full h-full object-cover" alt="User" /> : leaders[2].displayName?.[0]?.toUpperCase()}
                               </div>
                             </div>
                             <div className="absolute -bottom-2 -right-1 bg-orange-500 text-white w-7 h-7 rounded-full flex items-center justify-center font-black text-[13px] border-2 border-white shadow-md z-10">3</div>
                           </div>
                           <h4 className="font-black text-[12px] sm:text-[14px] text-slate-700 mt-4 text-center line-clamp-2 leading-tight px-1">{leaders[2].displayName || 'Student'}</h4>
                           <div className="mt-1.5 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                             <span className="font-black text-orange-600 text-[12px]">{leaders[2].xp?.toLocaleString()}</span><span className="text-[8px] font-bold text-orange-400 mt-0.5">XP</span>
                           </div>
                         </motion.div>
                       )}
                     </div>

                     {/* ========================================= */}
                     {/* 📝 THE REST OF THE LIST (4th to 20th) */}
                     {/* ========================================= */}
                     {leaders.length > 3 && (
                       <div className="space-y-3">
                         {leaders.slice(3).map((u, idx) => {
                           const rank = idx + 4;
                           const isMe = user?.uid === u.uid;
                           const avatarUrl = u.photoURL || u.photoUrl || u.avatar || null;

                           return (
                             <motion.div
                               key={u.uid}
                               initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                               onClick={() => router.push(`/profile/${u.uid}`)}
                               className={`rounded-[1.5rem] p-3 sm:p-4 flex items-center gap-3 sm:gap-4 transition-all cursor-pointer 
                                 ${isMe 
                                   ? 'bg-violet-50 border-2 border-violet-300 border-b-4 shadow-[0_8px_30px_rgb(139,92,246,0.15)] ring-4 ring-violet-500/10 z-10' 
                                   : 'bg-white border-2 border-zinc-200 border-b-4 hover:border-violet-200 hover:shadow-[0_8px_30px_rgb(139,92,246,0.08)] active:translate-y-[2px] active:border-b-2'} 
                               `}
                             >
                                {/* 🟢 Avatar with Rank Badge Bottom Right */}
                                <div className="relative shrink-0">
                                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full p-[2px] bg-gradient-to-tr from-violet-200 to-fuchsia-200 shadow-sm">
                                    <div className="w-full h-full rounded-full border-2 border-white bg-zinc-100 overflow-hidden flex items-center justify-center font-black text-xl text-zinc-400">
                                      {avatarUrl ? (
                                        <img src={avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                                      ) : (
                                        u.displayName?.[0]?.toUpperCase() || <UserIcon size={20} strokeWidth={3}/>
                                      )}
                                    </div>
                                  </div>
                                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] border-2 border-white shadow-sm z-10 ${isMe ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-white'}`}>
                                    {rank}
                                  </div>
                                </div>

                                {/* Name */}
                                <div className="flex-1 min-w-0 ml-1">
                                   <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                     <h4 className={`font-black text-[15px] sm:text-[17px] truncate tracking-tight ${isMe ? 'text-violet-700' : 'text-zinc-900'}`}>
                                       {u.displayName || 'Student'}
                                     </h4>
                                     {isMe && (
                                       <span className="w-fit text-[9px] font-black bg-violet-600 text-white px-2 py-0.5 rounded-lg uppercase tracking-widest">
                                         {t.you}
                                       </span>
                                     )}
                                   </div>
                                </div>

                                {/* 🟢 Tactile XP Badge */}
                                <div className="shrink-0">
                                  <div className={`border-2 rounded-xl px-3 py-1.5 flex items-center gap-1 ${isMe ? 'bg-white border-violet-200' : 'bg-violet-50 border-violet-100'}`}>
                                    <span className={`font-black text-[15px] sm:text-[17px] leading-none ${isMe ? 'text-violet-700' : 'text-violet-600'}`}>
                                      {(u.xp || 0).toLocaleString()}
                                    </span>
                                    <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest mt-0.5">{t.xp}</span>
                                  </div>
                                </div>
                             </motion.div>
                           );
                         })}

                         {/* ========================================= */}
                         {/* 🟢 THE "ME" CARD (Appended at bottom if > 20) */}
                         {/* ========================================= */}
                         {currentUserData && currentUserData.rank === '20+' && (
                           <>
                             {/* Vertical Ellipsis to show gap */}
                             <div className="flex flex-col items-center gap-1.5 my-3">
                               <div className="w-1.5 h-1.5 rounded-full bg-zinc-300"></div>
                               <div className="w-1.5 h-1.5 rounded-full bg-zinc-300"></div>
                               <div className="w-1.5 h-1.5 rounded-full bg-zinc-300"></div>
                             </div>

                             {/* Purple Me Card */}
                             <motion.div
                               initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                               onClick={() => router.push(`/profile/${currentUserData.uid}`)}
                               className="rounded-[1.5rem] p-3 sm:p-4 flex items-center gap-4 bg-violet-600 border-2 border-violet-700 border-b-4 cursor-pointer active:translate-y-[2px] active:border-b-2 transition-all shadow-xl"
                             >
                                {/* Avatar with Rank Badge */}
                                <div className="relative shrink-0">
                                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full p-[2px] bg-gradient-to-tr from-white/40 to-white/10 shadow-sm">
                                    <div className="w-full h-full rounded-full border-2 border-violet-500 bg-violet-400 overflow-hidden flex items-center justify-center font-black text-xl text-white">
                                      {currentUserData.photoURL || currentUserData.photoUrl || currentUserData.avatar ? (
                                        <img src={currentUserData.photoURL || currentUserData.photoUrl || currentUserData.avatar} className="w-full h-full object-cover" alt="Me" />
                                      ) : (
                                        currentUserData.displayName?.[0]?.toUpperCase() || <UserIcon size={20} strokeWidth={3}/>
                                      )}
                                    </div>
                                  </div>
                                  <div className="absolute -bottom-1 -right-1 bg-white text-violet-700 w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] sm:text-[11px] border-2 border-violet-600 shadow-sm z-10">
                                    {currentUserData.rank}
                                  </div>
                                </div>

                                {/* Name */}
                                <div className="flex-1 min-w-0 ml-1">
                                   <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                     <h4 className="font-black text-[15px] sm:text-[17px] text-white truncate tracking-tight">
                                       {currentUserData.displayName || 'Student'}
                                     </h4>
                                     <span className="w-fit text-[9px] font-black bg-white text-violet-700 px-2 py-0.5 rounded-lg uppercase tracking-widest">
                                       {t.you}
                                     </span>
                                   </div>
                                </div>

                                {/* XP Badge */}
                                <div className="shrink-0">
                                  <div className="bg-white/20 border-2 border-white/30 rounded-xl px-3 py-1.5 flex items-center gap-1">
                                    <span className="font-black text-[15px] sm:text-[17px] text-white leading-none">
                                      {(currentUserData.xp || 0).toLocaleString()}
                                    </span>
                                    <span className="text-[9px] font-black text-violet-200 uppercase tracking-widest mt-0.5">{t.xp}</span>
                                  </div>
                                </div>
                             </motion.div>
                           </>
                         )}
                       </div>
                     )}
                   </div>
                 ) : (
                   <div className="text-center py-20 text-zinc-400 flex flex-col items-center">
                      <div className="w-20 h-20 bg-zinc-200 rounded-[2rem] flex items-center justify-center mb-4 rotate-12">
                        <Sparkles size={32} strokeWidth={2.5} />
                      </div>
                      <p className="text-[15px] font-black">{t.empty}</p>
                   </div>
                 )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
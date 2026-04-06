'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { Trophy, Medal, Award, Loader2, Star, ChevronRight, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useStudentLanguage } from '@/app/(student)/layout';

const globalStudentLeaderboardCache: Record<string, { leaderboard: any[], lastDoc: any, hasMore: boolean, timestamp: number }> = {};
const CACHE_LIFESPAN = 60 * 1000; 
const PAGE_SIZE = 10;

const LEADERBOARD_TRANSLATIONS: any = {
  uz: { emptyTitle: "Reyting bo'sh", emptyDesc: "O'quvchilar test ishlaganda XP to'plashadi va shu yerda ko'rinadi.", points: "XP", rank: "O'rin" },
  en: { emptyTitle: "Leaderboard is empty", emptyDesc: "Students will earn XP by taking tests to appear here.", points: "XP", rank: "Rank" },
  ru: { emptyTitle: "Рейтинг пуст", emptyDesc: "Ученики появятся здесь, когда заработают XP.", points: "XP", rank: "Место" }
};

export default function LeaderboardTab({ classId }: { classId: string }) {
  const router = useRouter();
  const { lang } = useStudentLanguage();
  const t = LEADERBOARD_TRANSLATIONS[lang] || LEADERBOARD_TRANSLATIONS['en'];

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const initializeTab = async () => {
      const cached = globalStudentLeaderboardCache[classId];
      const now = Date.now();

      if (cached) {
        setLeaderboard(cached.leaderboard);
        setLastDoc(cached.lastDoc);
        setHasMore(cached.hasMore);
        setLoadingInitial(false);
        if (now - cached.timestamp < CACHE_LIFESPAN) return;
        revalidateSnapshot(cached.leaderboard.length);
      } else {
        setLoadingInitial(true);
        fetchLeaderboard(false);
      }
    };
    initializeTab();
  }, [classId]);

  const fetchLeaderboard = async (isNextPage: boolean = false) => {
    if (!classId) return;
    if (isNextPage && !lastDoc) return;
    
    isNextPage ? setLoadingMore(true) : setLoadingInitial(true);

    try {
      let q = query(collection(db, 'classes', classId, 'leaderboard'), orderBy('xp', 'desc'), limit(PAGE_SIZE));
      if (isNextPage && lastDoc) {
        q = query(collection(db, 'classes', classId, 'leaderboard'), orderBy('xp', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
      }

      const snap = await getDocs(q);
      const newDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      setLeaderboard(prev => {
        const updated = isNextPage ? [...prev, ...newDocs] : newDocs;
        const newLastDoc = snap.docs[snap.docs.length - 1] || null;
        const newHasMore = snap.docs.length >= PAGE_SIZE;

        globalStudentLeaderboardCache[classId] = { leaderboard: updated, lastDoc: newLastDoc, hasMore: newHasMore, timestamp: Date.now() };
        setLastDoc(newLastDoc); setHasMore(newHasMore);
        return updated;
      });
    } catch (e) { console.error(e); } finally { setLoadingInitial(false); setLoadingMore(false); }
  };

  const revalidateSnapshot = async (currentTotalLoaded: number) => {
    try {
      const q = query(collection(db, 'classes', classId, 'leaderboard'), orderBy('xp', 'desc'), limit(currentTotalLoaded));
      const snap = await getDocs(q);
      const freshDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLeaderboard(freshDocs);
      globalStudentLeaderboardCache[classId].leaderboard = freshDocs;
      globalStudentLeaderboardCache[classId].timestamp = Date.now();
    } catch (e) { console.error(e); }
  };

  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingInitial || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) fetchLeaderboard(true);
    }, { threshold: 0.5 });
    if (node) observerRef.current.observe(node);
  }, [loadingInitial, loadingMore, hasMore]);

  if (loadingInitial && leaderboard.length === 0) return <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={28}/></div>;

  if (leaderboard.length === 0) return (
    <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-zinc-200 flex flex-col items-center">
      <div className="w-20 h-20 bg-amber-50 rounded-[2rem] flex items-center justify-center mb-4 shadow-sm text-amber-500 border-2 border-amber-100 rotate-12 hover:rotate-0 transition-transform"><Trophy size={40} strokeWidth={2.5} /></div>
      <h3 className="text-zinc-900 font-black text-[18px] mb-2">{t.emptyTitle}</h3>
      <p className="text-[14px] font-bold text-zinc-500 max-w-sm leading-relaxed">{t.emptyDesc}</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {leaderboard.map((student, index) => {
        const isLastElement = index === leaderboard.length - 1;
        const rank = index + 1; 
        const avatarUrl = student.photoURL || student.photoUrl || student.avatar || null;
        
        let cardStyle = "bg-white border-zinc-200 hover:border-indigo-300 hover:border-b-indigo-400 active:border-b-2 active:translate-y-[2px]";
        let rankColor = "bg-zinc-800 text-white";
        let avatarBorder = "border-zinc-200 bg-zinc-100 text-zinc-400";

        if (rank === 1) {
          cardStyle = "bg-amber-50/30 border-amber-300 shadow-[0_8px_30px_rgba(251,191,36,0.15)] hover:border-amber-400 hover:border-b-amber-500 active:border-b-2 active:translate-y-[2px] z-10";
          rankColor = "bg-amber-500 text-white border-amber-400";
          avatarBorder = "border-amber-400 bg-amber-100 text-amber-500";
        } else if (rank === 2) {
          cardStyle = "bg-slate-50/50 border-slate-300 hover:border-slate-400 hover:border-b-slate-500 active:border-b-2 active:translate-y-[2px]";
          rankColor = "bg-slate-400 text-white border-slate-300";
          avatarBorder = "border-slate-300 bg-slate-100 text-slate-400";
        } else if (rank === 3) {
          cardStyle = "bg-orange-50/30 border-orange-300 hover:border-orange-400 hover:border-b-orange-500 active:border-b-2 active:translate-y-[2px]";
          rankColor = "bg-orange-500 text-white border-orange-400";
          avatarBorder = "border-orange-300 bg-orange-100 text-orange-500";
        }

        return (
          <div 
            key={student.id} ref={isLastElement ? lastElementRef : null}
            // 🟢 CLICK TO VIEW PUBLIC PROFILE
            onClick={() => router.push(`/profile/${student.uid}`)}
            className={`flex items-center justify-between p-3 md:p-4 rounded-[1.5rem] border-2 border-b-4 transition-all duration-200 cursor-pointer group ${cardStyle}`}
          >
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="relative shrink-0">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 overflow-hidden flex items-center justify-center font-black text-xl shadow-sm ${avatarBorder}`}>
                  {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : (student.displayName?.[0]?.toUpperCase() || <UserIcon size={20} strokeWidth={3}/>)}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-black text-[11px] sm:text-[12px] border-2 border-white shadow-sm z-10 ${rankColor}`}>
                  {rank === 1 ? <Trophy size={12} strokeWidth={3}/> : rank === 2 ? <Medal size={12} strokeWidth={3}/> : rank === 3 ? <Award size={12} strokeWidth={3}/> : rank}
                </div>
              </div>
              <div className="min-w-0 pr-2 ml-1">
                <p className="font-black text-[15px] sm:text-[17px] text-zinc-900 truncate tracking-tight group-hover:text-indigo-600 transition-colors">{student.displayName || "Anonymous Student"}</p>
                <p className="text-[12px] font-bold text-zinc-400 truncate">{rank === 1 ? '🥇 1st Place' : rank === 2 ? '🥈 2nd Place' : rank === 3 ? '🥉 3rd Place' : `@${student.username || 'student'}`}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <div className={`border-2 rounded-xl px-3 py-1.5 flex items-center gap-1.5 ${rank === 1 ? 'bg-white border-amber-200' : 'bg-zinc-50 border-zinc-200'}`}>
                <span className={`font-black text-[15px] sm:text-[18px] leading-none ${rank === 1 ? 'text-amber-600' : 'text-indigo-600'}`}>{(student.xp || 0).toLocaleString()}</span>
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">{t.points}</span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-white border-2 border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:bg-indigo-500 group-hover:border-indigo-500 group-hover:text-white transition-all hidden sm:flex">
                <ChevronRight size={18} strokeWidth={3} />
              </div>
            </div>
          </div>
        );
      })}
      {loadingMore && <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={24}/></div>}
    </div>
  );
}
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { Trophy, Medal, Award, Loader2, Star, ChevronRight } from 'lucide-react';
import { useTeacherLanguage } from '@/app/teacher/layout';

// --- TRANSLATION DICTIONARY ---
const LEADERBOARD_TRANSLATIONS = {
  uz: { emptyTitle: "Reyting bo'sh", emptyDesc: "O'quvchilar test ishlaganda XP to'plashadi va shu yerda ko'rinadi.", points: "XP", rank: "O'rin" },
  en: { emptyTitle: "Leaderboard is empty", emptyDesc: "Students will appear here as they earn XP by taking tests.", points: "XP", rank: "Rank" },
  ru: { emptyTitle: "Рейтинг пуст", emptyDesc: "Ученики появятся здесь, когда заработают XP за тесты.", points: "XP", rank: "Место" }
};

const PAGE_SIZE = 10;

export default function LeaderboardTab({ classId }: { classId: string }) {
  const router = useRouter();
  const { lang } = useTeacherLanguage();
  const t = LEADERBOARD_TRANSLATIONS[lang] || LEADERBOARD_TRANSLATIONS['en'];

  // --- STATE ---
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const observerRef = useRef<IntersectionObserver | null>(null);

  // --- 1. INFINITE SCROLL FETCHING ---
  const fetchLeaderboard = async (isNextPage: boolean = false) => {
    if (!classId) return;
    if (isNextPage && !lastDoc) return;
    
    isNextPage ? setLoadingMore(true) : setLoadingInitial(true);

    try {
      // 🟢 Ask Firestore for the Top XP earners, but ONLY 10 at a time!
      let q = query(
        collection(db, 'classes', classId, 'leaderboard'), 
        orderBy('xp', 'desc'), 
        limit(PAGE_SIZE)
      );

      if (isNextPage && lastDoc) {
        q = query(
          collection(db, 'classes', classId, 'leaderboard'), 
          orderBy('xp', 'desc'), 
          startAfter(lastDoc), 
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(q);
      const newDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      setLeaderboard(prev => isNextPage ? [...prev, ...newDocs] : newDocs);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length >= PAGE_SIZE);
    } catch (e) {
      console.error("Leaderboard fetch error:", e);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => { fetchLeaderboard(); }, [classId]);

  // --- 2. INTERSECTION OBSERVER (THE INVISIBLE TRIGGER) ---
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingInitial || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchLeaderboard(true);
      }
    }, { threshold: 0.5 });
    
    if (node) observerRef.current.observe(node);
  }, [loadingInitial, loadingMore, hasMore]);


  if (loadingInitial && leaderboard.length === 0) {
    return <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={28}/></div>;
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 flex flex-col items-center">
        <div className="w-16 h-16 bg-white rounded-[1.2rem] flex items-center justify-center mb-4 shadow-sm text-amber-400 border border-amber-100">
          <Trophy size={32} />
        </div>
        <h3 className="text-slate-800 font-black text-[16px]">{t.emptyTitle}</h3>
        <p className="text-[13px] font-medium text-slate-500 mt-1 max-w-xs">{t.emptyDesc}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leaderboard.map((student, index) => {
        const isLastElement = index === leaderboard.length - 1;
        const rank = index + 1; // Because the array is ordered, index+1 is their absolute rank!
        
        // --- MODERN UI STYLING FOR TOP 3 ---
        let rankStyle = "bg-slate-50 border-slate-200/80 text-slate-500";
        let icon = <span className="font-black text-[14px]">{rank}</span>;
        let cardGlow = "border-slate-200/80 hover:border-indigo-300";

        if (rank === 1) {
          rankStyle = "bg-amber-50 border-amber-200 text-amber-500 shadow-inner";
          icon = <Trophy size={20} strokeWidth={2.5} />;
          cardGlow = "border-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.15)] hover:shadow-[0_0_20px_rgba(251,191,36,0.25)]";
        } else if (rank === 2) {
          rankStyle = "bg-slate-100 border-slate-300 text-slate-500 shadow-inner";
          icon = <Medal size={20} strokeWidth={2.5} />;
          cardGlow = "border-slate-300 shadow-sm hover:shadow-md";
        } else if (rank === 3) {
          rankStyle = "bg-orange-50 border-orange-200 text-orange-600 shadow-inner";
          icon = <Award size={20} strokeWidth={2.5} />;
          cardGlow = "border-orange-200 shadow-sm hover:shadow-md";
        }

        return (
          <div 
            key={student.id} 
            ref={isLastElement ? lastElementRef : null}
            onClick={() => router.push(`/teacher/students/${student.uid}`)} // 🟢 3. CLICK TO PROFILE
            className={`flex items-center justify-between p-4 md:p-5 bg-white rounded-[1.2rem] border transition-all duration-300 cursor-pointer group hover:-translate-y-0.5 ${cardGlow}`}
          >
            
            {/* Left side: Rank & Avatar & Name */}
            <div className="flex items-center gap-4 min-w-0">
              <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 border ${rankStyle}`}>
                {icon}
              </div>

              <div className="flex items-center gap-3 min-w-0 pr-2">
                {student.avatar ? (
                  <img src={student.avatar} alt="avatar" className="w-10 h-10 rounded-xl border border-slate-200 object-cover shadow-sm" />
                ) : (
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-[14px] shrink-0 border border-indigo-100">
                    {student.displayName?.[0]?.toUpperCase() || 'S'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-black text-[15px] text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                    {student.displayName || "Student"}
                  </p>
                  <p className="text-[12px] font-bold text-slate-400 truncate">
                    {rank === 1 ? '🥇 1st Place' : rank === 2 ? '🥈 2nd Place' : rank === 3 ? '🥉 3rd Place' : `#${rank} ${t.rank}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Right side: XP & Arrow */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right flex flex-col items-end">
                <span className={`font-black text-[18px] sm:text-[20px] flex items-center gap-1.5 ${rank === 1 ? 'text-amber-500' : 'text-indigo-600'}`}>
                  {student.xp || 0} <Star size={16} strokeWidth={2.5} className={rank === 1 ? 'fill-amber-500' : 'fill-indigo-600'} />
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.points}</span>
              </div>
              
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors hidden sm:flex">
                <ChevronRight size={18} strokeWidth={2.5} />
              </div>
            </div>

          </div>
        );
      })}

      {loadingMore && (
        <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={24}/></div>
      )}
    </div>
  );
}
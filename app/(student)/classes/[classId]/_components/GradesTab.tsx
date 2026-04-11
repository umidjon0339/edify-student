'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { ChevronRight, Loader2, CheckCircle } from 'lucide-react';
import { useStudentLanguage } from '@/app/(student)/layout';

// 🟢 1. GLOBAL CACHE FOR GRADES (0 Reads on Tab Switch)
const globalGradesCache: Record<string, { attempts: any[], lastDoc: any, hasMore: boolean, timestamp: number }> = {};
const CACHE_LIFESPAN = 60 * 1000; // 60 seconds
const PAGE_SIZE = 15; // 🟢 Bumped to 15 to ensure we always have enough items even after filtering out exams

const GRADES_TRANSLATIONS: any = {
  uz: { noGrades: "Hali baholar yo'q.", justNow: "Hozirgina", tries: "Urinishlar", score: "Ball" },
  en: { noGrades: "No grades recorded yet.", justNow: "Just now", tries: "Tries", score: "Score" },
  ru: { noGrades: "Оценок пока нет.", justNow: "Только что", tries: "Попытки", score: "Балл" }
};

export default function GradesTab({ classId, userId }: { classId: string, userId: string }) {
  const router = useRouter();
  const { lang } = useStudentLanguage();
  const t = GRADES_TRANSLATIONS[lang] || GRADES_TRANSLATIONS['en'];

  const [attempts, setAttempts] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const observerRef = useRef<IntersectionObserver | null>(null);

  // 🟢 2. SWR FETCH LOGIC
  useEffect(() => {
    const initializeTab = async () => {
      const cached = globalGradesCache[classId];
      const now = Date.now();

      if (cached) {
        setAttempts(cached.attempts);
        setLastDoc(cached.lastDoc);
        setHasMore(cached.hasMore);
        setLoadingInitial(false);

        if (now - cached.timestamp < CACHE_LIFESPAN) return;
        fetchGrades(false, true); // Silently revalidate
      } else {
        setLoadingInitial(true);
        fetchGrades(false, false);
      }
    };
    initializeTab();
  }, [classId]);

  const fetchGrades = async (isNextPage: boolean = false, silent: boolean = false) => {
    if (isNextPage && !lastDoc) return;
    if (!silent) isNextPage ? setLoadingMore(true) : setLoadingInitial(true);

    try {
      let q = query(
        collection(db, 'attempts'), 
        where('classId', '==', classId), 
        where('userId', '==', userId),
        orderBy('submittedAt', 'desc'), 
        limit(PAGE_SIZE)
      );

      if (isNextPage && lastDoc) {
        q = query(
          collection(db, 'attempts'), 
          where('classId', '==', classId), 
          where('userId', '==', userId), 
          orderBy('submittedAt', 'desc'), 
          startAfter(lastDoc), 
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(q);
      
      // 🟢 FILTER OUT EXAMS HERE: We only want standard assignments
      const newDocs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((d: any) => d.type !== 'exam'); 

      setAttempts(prev => {
        const updated = isNextPage ? [...prev, ...newDocs] : newDocs;
        
        // 🟢 CRITICAL: We MUST use the raw snap.docs for the cursor, NOT the filtered array!
        const newLastDoc = snap.docs[snap.docs.length - 1] || null;
        const newHasMore = snap.docs.length >= PAGE_SIZE;

        globalGradesCache[classId] = { attempts: updated, lastDoc: newLastDoc, hasMore: newHasMore, timestamp: Date.now() };

        if (!silent || !isNextPage) { 
          setLastDoc(newLastDoc); 
          setHasMore(newHasMore); 
        }
        return updated;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInitial(false); setLoadingMore(false);
    }
  };

  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingInitial || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) fetchGrades(true);
    }, { threshold: 0.5 });
    if (node) observerRef.current.observe(node);
  }, [loadingInitial, loadingMore, hasMore]);

  if (loadingInitial && attempts.length === 0) return <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={28}/></div>;

  if (attempts.length === 0) return (
    <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-zinc-300 flex flex-col items-center">
      <div className="w-16 h-16 bg-zinc-100 text-zinc-400 rounded-[1.2rem] flex items-center justify-center mb-4 rotate-6 border-2 border-zinc-200"><CheckCircle size={32} strokeWidth={2.5}/></div>
      <h3 className="text-[16px] font-black text-zinc-900">{t.noGrades}</h3>
    </div>
  );

  return (
    <div className="space-y-3">
      {attempts.map((attempt, index) => {
        const isLastElement = index === attempts.length - 1;
        // 🟢 SAFETY: Prevent crashes if database fields are corrupted or missing
        const safeScore = attempt.score || 0;
        const safeTotal = attempt.totalQuestions || 1; 
        const percentage = Math.round((safeScore / safeTotal) * 100);
        
        let badgeColor = 'bg-zinc-100 text-zinc-600 border-zinc-200';
        if (percentage >= 80) badgeColor = 'bg-emerald-50 text-emerald-600 border-emerald-200';
        else if (percentage >= 50) badgeColor = 'bg-amber-50 text-amber-600 border-amber-200';
        else badgeColor = 'bg-red-50 text-red-600 border-red-200';

        return (
          <div 
            key={attempt.id} 
            ref={isLastElement ? lastElementRef : null}
            onClick={() => router.push(`/classes/${classId}/test/${attempt.assignmentId}/results`)} 
            className="bg-white border-2 border-zinc-200 border-b-4 rounded-[1.5rem] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-indigo-300 hover:border-b-indigo-400 active:border-b-2 active:translate-y-[2px] transition-all group"
          >
            <div className="flex-1 min-w-0">
               <h3 className="font-black text-[16px] text-zinc-900 truncate group-hover:text-indigo-600 transition-colors">{attempt.testTitle || 'Unknown Test'}</h3>
               <div className="flex items-center gap-3 mt-1.5 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                 <span>{attempt.submittedAt?.seconds ? new Date(attempt.submittedAt.seconds * 1000).toLocaleDateString() : t.justNow}</span>
                 <span>•</span>
                 <span className="bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md">{attempt.attemptsTaken || 1}x {t.tries}</span>
               </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 border-t-2 sm:border-t-0 border-zinc-100 pt-3 sm:pt-0">
               <div className={`px-4 py-2 rounded-xl border-2 flex flex-col items-center justify-center min-w-[80px] ${badgeColor}`}>
                 <span className="font-black text-[18px] leading-none">{percentage}%</span>
                 <span className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-70">{safeScore}/{safeTotal}</span>
               </div>
               <div className="w-10 h-10 rounded-xl bg-zinc-50 border-2 border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-500 transition-all shrink-0">
                 <ChevronRight size={20} strokeWidth={3} />
               </div>
            </div>
          </div>
        );
      })}
      {loadingMore && <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={24}/></div>}
    </div>
  );
}
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, startAfter, getDocs, where } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { 
  FileText, CheckCircle, Clock, ArrowRight, Lock, 
  AlertCircle, RotateCcw, Calendar, ShieldCheck, Trophy, Loader2, Info
} from 'lucide-react';
import { useStudentLanguage } from '@/app/(student)/layout'; 

// ============================================================================
// 🟢 1. GLOBAL CACHE (0 Reads on Tab Switch, Survives Navigation)
// ============================================================================
const globalStudentAssignmentsCache: Record<string, { assignments: any[], attempts: any[], lastDoc: any, hasMore: boolean, timestamp: number }> = {};
const CACHE_LIFESPAN = 60 * 1000; // 60 seconds
const PAGE_SIZE = 10;

const ASSIGNMENT_TRANSLATIONS: any = {
  uz: {
    empty: { title: "Faol topshiriqlar yo'q", desc: "Hozircha barcha vazifalar bajarilgan." },
    meta: { questions: "Savol", noLimit: "Vaqt Cheklovisiz", mins: "daq", closed: "Yopilgan", due: "Muddat", attempts: "Urinishlar", infinite: "∞", teacherNote: "O'qituvchi eslatmasi:" },
    status: { locked: "Qulflangan", view: "Natijani Ko'rish", missed: "O'tkazib yuborilgan", retake: "Qayta Topshirish", start: "Boshlash" }
  },
  en: {
    empty: { title: "No active assignments", desc: "You're all caught up for now." },
    meta: { questions: "Questions", noLimit: "No Time Limit", mins: "mins", closed: "Closed", due: "Due", attempts: "Attempts", infinite: "∞", teacherNote: "Teacher's Note:" },
    status: { locked: "Locked", view: "View Results", missed: "Missed", retake: "Retake", start: "Start" }
  },
  ru: {
    empty: { title: "Нет активных заданий", desc: "На данный момент все выполнено." },
    meta: { questions: "Вопросов", noLimit: "Без ограничений", mins: "мин", closed: "Закрыто", due: "Срок", attempts: "Попытки", infinite: "∞", teacherNote: "Заметка учителя:" },
    status: { locked: "Закрыто", view: "Результаты", missed: "Пропущено", retake: "Пересдать", start: "Начать" }
  }
};

export default function AssignmentsTab({ classId }: { classId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useStudentLanguage();
  const t = ASSIGNMENT_TRANSLATIONS[lang] || ASSIGNMENT_TRANSLATIONS['en'];

  // --- STATE ---
  const [assignments, setAssignments] = useState<any[]>([]);
  const [myAttempts, setMyAttempts] = useState<any[]>([]);
  
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const observerRef = useRef<IntersectionObserver | null>(null);

  // ============================================================================
  // 🟢 2. SWR FETCH LOGIC (Pagination Limit 10)
  // ============================================================================
  useEffect(() => {
    if (!user || !classId) return;

    const initializeTab = async () => {
      const cached = globalStudentAssignmentsCache[classId];
      const now = Date.now();

      if (cached) {
        setAssignments(cached.assignments);
        setMyAttempts(cached.attempts);
        setLastDoc(cached.lastDoc);
        setHasMore(cached.hasMore);
        setLoadingInitial(false);

        if (now - cached.timestamp < CACHE_LIFESPAN) return;
        fetchAssignments(false, true); // Silently revalidate
      } else {
        setLoadingInitial(true);
        fetchAssignments(false, false);
      }
    };
    initializeTab();
  }, [classId, user]);

  const fetchAssignments = async (isNextPage: boolean = false, silent: boolean = false) => {
    if (!user || !classId) return;
    if (isNextPage && !lastDoc) return;
    
    if (!silent) isNextPage ? setLoadingMore(true) : setLoadingInitial(true);

    try {
      // 1. Fetch exactly 10 assignments
      let q = query(
        collection(db, 'classes', classId, 'assignments'), 
        orderBy('createdAt', 'desc'), 
        limit(PAGE_SIZE)
      );

      if (isNextPage && lastDoc) {
        q = query(collection(db, 'classes', classId, 'assignments'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
      }

      const snap = await getDocs(q);
      const newAssignDocs: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 2. Filter client-side for assignments belonging to this specific student
      const myNewAssignments = newAssignDocs.filter(a => a.assignedTo === 'all' || (Array.isArray(a.assignedTo) && a.assignedTo.includes(user.uid)));

      // 3. Fetch attempts ONLY for these 10 assignments
      let newAttempts: any[] = [];
      if (newAssignDocs.length > 0) {
        const assignmentIds = newAssignDocs.map(a => a.id);
        const attQ = query(
          collection(db, 'attempts'), 
          where('userId', '==', user.uid), 
          where('assignmentId', 'in', assignmentIds)
        );
        const attSnap = await getDocs(attQ);
        newAttempts = attSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      // 4. Update State & Cache
      setAssignments(prev => {
        const updatedAssigns = isNextPage ? [...prev, ...myNewAssignments] : myNewAssignments;
        const newLastDoc = snap.docs[snap.docs.length - 1] || null;
        const newHasMore = snap.docs.length >= PAGE_SIZE;

        setMyAttempts(prevAtt => {
          const updatedAttempts = isNextPage ? [...prevAtt, ...newAttempts] : newAttempts;
          
          globalStudentAssignmentsCache[classId] = { 
            assignments: updatedAssigns, 
            attempts: updatedAttempts, 
            lastDoc: newLastDoc, 
            hasMore: newHasMore, 
            timestamp: Date.now() 
          };
          return updatedAttempts;
        });

        if (!silent || !isNextPage) { 
          setLastDoc(newLastDoc); 
          setHasMore(newHasMore); 
        }
        return updatedAssigns;
      });

    } catch (e) {
      console.error("Assignment fetch error", e);
    } finally {
      setLoadingInitial(false); 
      setLoadingMore(false);
    }
  };

  // --- 3. INFINITE SCROLL TRIGGER ---
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingInitial || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) fetchAssignments(true);
    }, { threshold: 0.5 });
    if (node) observerRef.current.observe(node);
  }, [loadingInitial, loadingMore, hasMore]);


  // ============================================================================
  // 🟢 RENDER UI
  // ============================================================================
  if (loadingInitial && assignments.length === 0) {
    return <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={28}/></div>;
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-zinc-300 flex flex-col items-center shadow-sm">
        <div className="w-16 h-16 bg-zinc-100 text-zinc-400 rounded-[1.2rem] flex items-center justify-center mb-4 rotate-6 border-2 border-zinc-200">
          <FileText size={32} strokeWidth={2.5} />
        </div>
        <h3 className="text-[16px] font-black text-zinc-900 tracking-tight">{t.empty.title}</h3>
        <p className="text-[14px] font-bold text-zinc-500 mt-1 max-w-xs leading-relaxed">{t.empty.desc}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {assignments.map((assign: any, index: number) => {
        const isLastElement = index === assignments.length - 1;
        
        // --- CALCULATE STATUS ---
        const attemptDoc = myAttempts.find((a: any) => a.assignmentId === assign.id);
        const attemptCount = attemptDoc ? (attemptDoc.attemptsTaken || 1) : 0;
        const maxAttempts = assign.allowedAttempts ?? 1; 
        
        const scorePercent = attemptDoc 
          ? Math.round((attemptDoc.score / attemptDoc.totalQuestions) * 100) 
          : null;

        const isCompleted = maxAttempts !== 0 && attemptCount >= maxAttempts;
        
        // ⚠️ SECURITY WARNING: This uses local device time for UI rendering.
        // For strict security, use Firestore Security rules (which we already implemented in firestore.rules)
        // to block writes if the student tampers with their device clock.
        const now = new Date();
        const openDate = assign.openAt ? new Date(assign.openAt.seconds * 1000) : null;
        const dueDate = assign.dueAt ? new Date(assign.dueAt.seconds * 1000) : null;
        
        const isLocked = openDate && now < openDate;
        const isExpired = dueDate && now > dueDate;
        
        const formatDate = (date: Date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const formatTime = (date: Date) => date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

        return (
          <div 
            key={assign.id} 
            ref={isLastElement ? lastElementRef : null}
            className="group bg-white rounded-[1.5rem] border-2 border-zinc-200 border-b-[6px] p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-indigo-300 hover:border-b-indigo-400 active:border-b-2 active:translate-y-[4px] transition-all duration-200"
          >
            {/* LEFT: INFO */}
            <div className="flex-1 space-y-3 min-w-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border-2 border-indigo-100 shrink-0">
                  <FileText size={20} strokeWidth={2.5} />
                </div>
                <h3 className="font-black text-zinc-900 text-[16px] md:text-[18px] group-hover:text-indigo-600 transition-colors truncate tracking-tight">
                  {assign.testTitle || 'Untitled Assignment'}
                </h3>
                
                {(assign.duration > 0 || !assign.showResults) && (
                  <span title="Proctored" className="flex items-center shrink-0">
                    <ShieldCheck size={16} strokeWidth={3} className="text-emerald-500" />
                  </span>
                )}
              </div>

              {/* 🟢 NEW: TEACHER INSTRUCTIONS */}
              {assign.description && (
                <div className="pl-1 md:pl-12 mt-1">
                  <div className="bg-indigo-50/50 border-2 border-indigo-100 rounded-xl p-3 inline-block w-full">
                    <p className="text-[13px] font-bold text-indigo-900 leading-relaxed flex items-start gap-2">
                      <Info size={14} className="text-indigo-500 shrink-0 mt-0.5" strokeWidth={3} />
                      <span>
                        <span className="text-indigo-600 font-black mr-1 uppercase tracking-widest text-[10px]">{t.meta.teacherNote}</span> 
                        {assign.description}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Metadata Row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] font-bold text-zinc-500 uppercase tracking-widest pl-1 md:pl-12 pt-1">
                
                <span className="flex items-center gap-1.5">
                  <span className="text-zinc-800">{assign.questionCount}</span> {t.meta.questions}
                </span>

                <span className="flex items-center gap-1.5">
                  <Clock size={14} strokeWidth={2.5} className="text-zinc-400" />
                  {assign.duration ? `${assign.duration} ${t.meta.mins}` : t.meta.noLimit}
                </span>

                {dueDate && (
                  <span className={`flex items-center gap-1.5 ${isExpired ? 'text-red-500' : ''}`}>
                    <Calendar size={14} strokeWidth={2.5} className={isExpired ? 'text-red-500' : 'text-zinc-400'} />
                    {isExpired ? `${t.meta.closed} ` : `${t.meta.due} `} 
                    {formatDate(dueDate)} - {formatTime(dueDate)}
                  </span>
                )}

                {maxAttempts !== 1 && (
                  <span className="flex items-center gap-1 bg-zinc-100 border-2 border-zinc-200 px-2 py-0.5 rounded-lg text-zinc-600">
                    <RotateCcw size={12} strokeWidth={3}/>
                    <span className="text-zinc-900">{attemptCount}</span> / {maxAttempts === 0 ? t.meta.infinite : maxAttempts} {t.meta.attempts}
                  </span>
                )}

                {scorePercent !== null && (
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border-2 ${
                    scorePercent >= 60 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
                  }`}>
                    <Trophy size={12} strokeWidth={3} />
                    <span>{scorePercent}%</span>
                  </span>
                )}
              </div>
            </div>

            {/* RIGHT: ACTION BUTTON */}
            <div className="md:min-w-[160px] flex justify-end">
              
              {isLocked ? (
                <button disabled className="w-full md:w-auto px-5 py-3 bg-zinc-100 text-zinc-400 font-black rounded-xl border-2 border-zinc-200 flex items-center justify-center gap-2 text-[14px] cursor-not-allowed uppercase tracking-widest">
                  <Lock size={16} strokeWidth={3} /> 
                  <span>{t.status.locked}</span>
                </button>
              ) 
              : (isCompleted || (isExpired && attemptCount > 0)) ? (
                <button 
                  onClick={() => router.push(`/classes/${classId}/test/${assign.id}/results`)}
                  className="w-full md:w-auto px-5 py-3 bg-white border-2 border-zinc-200 border-b-4 text-zinc-700 font-black rounded-xl hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50 active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2 text-[14px] uppercase tracking-widest"
                >
                  {t.status.view} <ArrowRight size={16} strokeWidth={3} />
                </button>
              )
              : isExpired ? (
                <div className="w-full md:w-auto px-5 py-3 bg-red-50 text-red-500 font-black rounded-xl border-2 border-red-200 flex items-center justify-center gap-2 text-[14px] uppercase tracking-widest">
                  <AlertCircle size={16} strokeWidth={3} /> {t.status.missed}
                </div>
              )
              : (
                <button 
                  onClick={() => router.push(`/classes/${classId}/test/${assign.id}`)}
                  className={`w-full md:w-auto px-6 py-3 font-black rounded-xl border-b-4 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2 text-[15px] uppercase tracking-widest ${
                    attemptCount > 0 
                    ? 'bg-orange-500 text-white border-orange-700 hover:bg-orange-400' 
                    : 'bg-indigo-600 text-white border-indigo-800 hover:bg-indigo-500' 
                  }`}
                >
                  {attemptCount > 0 ? <RotateCcw size={18} strokeWidth={3}/> : <CheckCircle size={18} strokeWidth={3}/>}
                  {attemptCount > 0 ? t.status.retake : t.status.start}
                </button>
              )}
            </div>
          </div>
        );
      })}
      
      {/* Invisible loading indicator at bottom to trigger observer */}
      {loadingMore && <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={24}/></div>}
    </div>
  );
}
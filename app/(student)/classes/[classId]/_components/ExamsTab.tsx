'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, where, limit } from 'firebase/firestore';
import { FileBadge, Clock, Play, Lock, CheckCircle2, ChevronRight, Loader2, SearchCode, Trophy, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useStudentLanguage } from '@/app/(student)/layout';

const TRANSLATIONS: any = {
  uz: { empty: "Sinfda hozircha imtihonlar yo'q.", start: "Boshlash", wait: "Kutilmoqda", done: "Yakunlangan", submitted: "Tekshirilmoqda", gradedHidden: "Baholandi", ball: "Ball" },
  en: { empty: "No exams in this class yet.", start: "Start Exam", wait: "Waiting", done: "Closed", submitted: "Under Review", gradedHidden: "Graded", ball: "Pts" },
  ru: { empty: "В классе пока нет экзаменов.", start: "Начать", wait: "Ожидание", done: "Завершено", submitted: "Проверяется", gradedHidden: "Оценено", ball: "Баллов" }
};

export default function ExamsTab({ classId }: { classId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const { lang } = useStudentLanguage();
  const t = TRANSLATIONS[lang] || TRANSLATIONS['en'];

  const [exams, setExams] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // 🟢 INFINITE SCROLL STATES
  const [limitCount, setLimitCount] = useState(10);
  const [hasMore, setHasMore] = useState(true);

  // 1. 🟢 PAGINATED EXAMS LISTENER
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'classes', classId, 'exams'), 
      orderBy('examDate', 'desc'),
      limit(limitCount) // 🟢 Start with 10
    );
    
    const unsub = onSnapshot(q, (snap) => {
      setExams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setHasMore(snap.docs.length === limitCount); // If we get exactly what we asked for, there's likely more
      setLoading(false);
    });
    return () => unsub();
  }, [classId, user, limitCount]);

  // 2. Fetch Student's Attempts (Real-time for instant grade updates)
  useEffect(() => {
    if (!user) return;
    const qAttempts = query(
      collection(db, 'attempts'), 
      where('classId', '==', classId), 
      where('userId', '==', user.uid),
      where('type', '==', 'exam')
    );
    
    const unsubAttempts = onSnapshot(qAttempts, (snap) => {
      const attMap: Record<string, any> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        attMap[data.assignmentId] = data; 
      });
      setAttempts(attMap);
    });
    
    return () => unsubAttempts();
  }, [classId, user]);

  // 🟢 INTERSECTION OBSERVER (Detects when student scrolls to the bottom)
  const observer = useRef<IntersectionObserver | null>(null);
  const lastExamElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return; 
    if (observer.current) observer.current.disconnect(); 
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setLimitCount(prev => prev + 10); // Load 10 more silently
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  if (loading && exams.length === 0) return <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>;

  if (exams.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center bg-zinc-100/50 rounded-3xl border-2 border-dashed border-zinc-200">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 border-2 border-zinc-200 shadow-sm"><FileBadge size={32} className="text-zinc-300"/></div>
        <p className="text-[16px] font-black text-zinc-600">{t.empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {exams.map((exam, index) => {
        const now = new Date();
        const examDate = exam.examDate.toDate();
        const endDate = new Date(examDate.getTime() + exam.durationMinutes * 60000);
        
        const attempt = attempts[exam.id];
        const hasSubmitted = !!attempt || exam.submittedStudentIds?.includes(user?.uid);
        const isGraded = attempt?.status === 'graded';
        const showScore = isGraded && !exam.hideResults;
        
        let status = 'scheduled';
        if (now >= examDate && now <= endDate) status = 'active';
        if (now > endDate) status = 'closed';

        let cardStyle = "bg-white border-zinc-200";
        let iconBox = "bg-zinc-100 text-zinc-400 border-zinc-200";
        let btnStyle = "bg-zinc-100 text-zinc-400 border-zinc-200";
        let btnText = t.wait;
        let Icon = Clock;
        let canClick = false;

        if (showScore) {
          cardStyle = "bg-amber-50/30 border-amber-300 shadow-sm";
          iconBox = "bg-amber-100 text-amber-600 border-amber-300";
          btnStyle = "bg-amber-100 text-amber-700 border-amber-300 font-black shadow-inner tracking-widest";
          btnText = `${attempt.teacherScore} / ${attempt.totalPoints || exam.totalPoints || '?'} ${t.ball}`;
          Icon = Trophy;
        } else if (isGraded && exam.hideResults) {
          cardStyle = "bg-emerald-50/30 border-emerald-200";
          iconBox = "bg-emerald-100 text-emerald-600 border-emerald-200";
          btnStyle = "bg-emerald-50 text-emerald-600 border-emerald-200 font-bold";
          btnText = t.gradedHidden;
          Icon = EyeOff;
        } else if (hasSubmitted) {
          cardStyle = "bg-zinc-50 border-zinc-200";
          iconBox = "bg-indigo-50 text-indigo-400 border-indigo-100";
          btnStyle = "bg-zinc-100 text-zinc-500 border-zinc-200 font-bold";
          btnText = t.submitted;
          Icon = SearchCode;
        } else if (status === 'active') {
          cardStyle = "bg-white border-indigo-200 hover:border-indigo-400 cursor-pointer active:translate-y-[2px] active:border-b-2 hover:-translate-y-1 shadow-sm";
          iconBox = "bg-indigo-100 text-indigo-600 border-indigo-200 animate-pulse";
          btnStyle = "bg-indigo-600 text-white border-indigo-700 font-black shadow-md shadow-indigo-600/20";
          btnText = t.start;
          Icon = Play;
          canClick = true;
        } else if (status === 'closed') {
          cardStyle = "bg-zinc-50 border-zinc-200 opacity-70";
          iconBox = "bg-zinc-200 text-zinc-500 border-zinc-300";
          btnStyle = "bg-zinc-200 text-zinc-500 border-zinc-300";
          btnText = t.done;
          Icon = Lock;
        }

        const handleExamClick = () => {
          if (showScore) {
            // 🟢 Route to the new Review Page
            router.push(`/student/exam/${exam.id}/review?classId=${classId}`);
          } else if (canClick) {
            // Route to the Live Exam Player
            router.push(`/student/exam/${exam.id}?classId=${classId}`);
          }
        };

        // 🟢 ATTACH THE SENSOR TO THE VERY LAST EXAM IN THE ARRAY
        const isLastElement = exams.length === index + 1;

        return (
          <div 
            key={exam.id} 
            ref={isLastElement ? lastExamElementRef : null} // 🟢 Sensor attached here!
            onClick={handleExamClick}
            className={`p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-2 border-b-4 transition-all duration-200 flex flex-col sm:flex-row justify-between gap-4 group ${cardStyle}`}
          >
            <div className="flex items-start sm:items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2 ${iconBox}`}>
                <Icon size={22} strokeWidth={2.5} className={status === 'active' ? 'ml-0.5' : ''}/>
              </div>
              
              <div>
                <h3 className="font-black text-[16px] sm:text-[18px] text-zinc-900 leading-tight">{exam.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-[11px] sm:text-[12px] font-bold text-zinc-500 uppercase tracking-widest">
                  <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{exam.assessmentType}</span>
                  <span>•</span>
                  <span>{examDate.toLocaleDateString()} {examDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{exam.durationMinutes} daq</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 border-t-2 border-zinc-100 sm:border-0 pt-3 sm:pt-0 w-full sm:w-auto shrink-0">
               <span className="sm:hidden text-[11px] font-black text-zinc-400 uppercase bg-zinc-100 px-2 py-1 rounded-md border-2 border-zinc-200">
                 {exam.durationMinutes} daq
               </span>
               
               <button className={`px-5 py-2.5 rounded-xl text-[12px] md:text-[13px] border-2 transition-all flex items-center justify-center gap-2 min-w-[120px] ${btnStyle}`}>
                 {showScore && <Trophy size={16} strokeWidth={2.5} className="text-amber-500"/>}
                 {!showScore && isGraded && exam.hideResults && <EyeOff size={16} strokeWidth={2.5}/>}
                 {!showScore && !isGraded && hasSubmitted && <SearchCode size={16} strokeWidth={2.5}/>}
                 
                 {btnText} 
                 
                 {canClick && <ChevronRight size={16} strokeWidth={3}/>}
               </button>
            </div>
          </div>
        );
      })}

      {/* 🟢 LOADING SPINNER AT BOTTOM WHEN FETCHING MORE */}
      {hasMore && (
        <div className="py-4 flex justify-center">
          <Loader2 className="animate-spin text-zinc-300" size={24}/>
        </div>
      )}
    </div>
  );
}
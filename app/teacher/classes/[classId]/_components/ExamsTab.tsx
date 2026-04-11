'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, where, limit, doc, updateDoc } from 'firebase/firestore';
import { 
  FileBadge, Clock, Play, Lock, Users, ChevronRight, Loader2, Plus, 
  Edit2, X, CheckCircle, CircleDashed, UserIcon, Trophy, EyeOff, Eye 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExamsTab({ classId, roster, onAdd, onEdit }: any) {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingSubmissions, setViewingSubmissions] = useState<any>(null);

  // INFINITE SCROLL STATES
  const [limitCount, setLimitCount] = useState(10);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'classes', classId, 'exams'), 
      orderBy('examDate', 'desc'), 
      limit(limitCount)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      setExams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setHasMore(snap.docs.length === limitCount); 
      setLoading(false);
    });
    
    return () => unsub();
  }, [classId, limitCount]);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastExamElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return; 
    if (observer.current) observer.current.disconnect(); 
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) setLimitCount(prev => prev + 10);
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  // 🟢 NEW: QUICK TOGGLE VISIBILITY FUNCTION
  const toggleVisibility = async (e: any, exam: any) => {
    e.stopPropagation(); // Prevent opening the modal
    const isCurrentlyHidden = exam.hideResults !== false; // Defaults to true if undefined
    
    try {
      await updateDoc(doc(db, 'classes', classId, 'exams', exam.id), {
        hideResults: !isCurrentlyHidden
      });
      toast.success(!isCurrentlyHidden ? "Natijalar yashirildi!" : "O'quvchilar natijalarni ko'ra oladi!", {
        icon: !isCurrentlyHidden ? '🙈' : '🏆'
      });
    } catch (error) {
      toast.error("Xatolik yuz berdi");
    }
  };

  if (loading && exams.length === 0) return <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-rose-500" size={28}/></div>;

  if (exams.length === 0) {
    return (
      <div className="text-center py-12 md:py-16 bg-white rounded-3xl md:rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center shadow-sm mx-2 md:mx-0">
         <div className="w-14 h-14 md:w-16 md:h-16 bg-rose-50 rounded-2xl md:rounded-[1.2rem] flex items-center justify-center mb-3 md:mb-4 shadow-sm text-rose-400 border border-rose-100">
           <FileBadge size={28} strokeWidth={2.5} />
         </div>
         <h3 className="text-slate-800 font-black text-[15px] md:text-[16px] mb-1">Imtihonlar yo'q</h3>
         <p className="text-[12px] md:text-[13px] font-medium text-slate-500 mb-5">Sinf uchun BSB yoki CHSB biriktirmagansiz.</p>
         <button onClick={onAdd} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-600/20 transition-all active:scale-95 flex items-center gap-2 text-[12px] md:text-[13px]">
           <Plus size={16} strokeWidth={2.5}/> BSB / CHSB Biriktirish
         </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 md:space-y-4">
        {exams.map((exam, index) => {
          const now = new Date();
          const examDate = exam.examDate.toDate();
          const endDate = new Date(examDate.getTime() + exam.durationMinutes * 60000);
          
          let status = 'scheduled';
          if (now >= examDate && now <= endDate) status = 'active';
          if (now > endDate) status = 'closed';

          const isLastElement = exams.length === index + 1;
          const isHidden = exam.hideResults !== false;

          return (
            <div 
              key={exam.id} 
              ref={isLastElement ? lastExamElementRef : null} 
              onClick={() => setViewingSubmissions({ exam, status })} 
              className="bg-white rounded-2xl md:rounded-[1.5rem] border border-slate-200/80 p-4 md:p-5 shadow-sm flex flex-col sm:flex-row justify-between gap-4 group hover:border-rose-300 transition-all cursor-pointer active:scale-[0.98] sm:active:scale-100"
            >
              
              <div className="flex items-start md:items-center gap-3 md:gap-4 min-w-0">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-[10px] md:rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                  status === 'active' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 border-rose-500 animate-pulse' :
                  status === 'scheduled' ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}>
                  {status === 'active' ? <Play size={18} className="ml-0.5 md:w-5 md:h-5" fill="currentColor"/> : status === 'scheduled' ? <Clock size={18} className="md:w-5 md:h-5" strokeWidth={2.5}/> : <Lock size={18} className="md:w-5 md:h-5" strokeWidth={2.5}/>}
                </div>
                
                <div className="min-w-0 pr-2">
                  <h3 className="font-black text-[14px] md:text-[16px] text-slate-900 group-hover:text-rose-600 transition-colors truncate leading-snug">{exam.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-2 md:gap-3 gap-y-1 mt-1 md:mt-1.5 text-[10px] md:text-[12px] font-bold text-slate-500">
                    <span className="uppercase tracking-widest text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100/50">{exam.assessmentType}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{examDate.toLocaleDateString()} {examDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span>•</span>
                    <span>{exam.durationMinutes} daq</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 border-t border-slate-100 sm:border-0 pt-3 sm:pt-0 w-full sm:w-auto shrink-0">
                 <div className="flex items-center gap-1.5 text-[11px] md:text-[12px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/50">
                    <Users size={14} className="text-indigo-400"/>
                    {exam.submittedStudentIds?.length || 0} / {roster.length}
                 </div>
                 
                 {/* 🟢 NEW: QUICK ACTION BUTTONS */}
                 <div className="flex items-center gap-1.5">
                   
                   {/* QUICK TOGGLE VISIBILITY */}
                   <button 
                     onClick={(e) => toggleVisibility(e, exam)}
                     className={`w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-xl flex items-center justify-center transition-all border active:scale-95 ${
                       isHidden 
                         ? 'bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 border-slate-200/50' 
                         : 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm ring-1 ring-emerald-500/20'
                     }`}
                     title={isHidden ? "Natijalar yashirilgan (Ochish uchun bosing)" : "Natijalar ochiq (Yashirish uchun bosing)"}
                   >
                     {isHidden ? <EyeOff size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5}/> : <Eye size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5}/>}
                   </button>

                   {/* EDIT EXAM */}
                   <button 
                     onClick={(e) => { e.stopPropagation(); onEdit(exam); }} 
                     className="w-8 h-8 md:w-10 md:h-10 bg-slate-50 rounded-[10px] md:rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-slate-200/50 hover:border-blue-200 active:scale-95"
                     title="Tahrirlash"
                   >
                     <Edit2 size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5}/>
                   </button>

                   {/* ENTER SUBMISSIONS */}
                   <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-50 rounded-[10px] md:rounded-xl flex items-center justify-center text-slate-400 group-hover:text-rose-500 group-hover:bg-rose-50 transition-colors border border-slate-200/50 group-hover:border-rose-200">
                     <ChevronRight size={18} className="md:w-5 md:h-5" strokeWidth={3}/>
                   </div>

                 </div>
              </div>

            </div>
          );
        })}
        
        {hasMore && (
          <div className="py-4 flex justify-center">
            <Loader2 className="animate-spin text-slate-300" size={24}/>
          </div>
        )}
      </div>

      <ExamSubmissionsModal 
        classId={classId}
        isOpen={!!viewingSubmissions} 
        onClose={() => setViewingSubmissions(null)} 
        data={viewingSubmissions} 
        roster={roster} 
      />
    </>
  );
}

// ============================================================================
// EXAM SUBMISSIONS MODAL 
// ============================================================================
function ExamSubmissionsModal({ classId, isOpen, onClose, data, roster }: any) {
  const router = useRouter(); 
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'submitted' | 'pending'>('submitted');
  const [attemptsMap, setAttemptsMap] = useState<Record<string, any>>({});
  
  useEffect(() => setMounted(true), []);

  const exam = data?.exam;

  useEffect(() => {
    if (!isOpen || !exam?.id || !classId) return;

    const q = query(
      collection(db, 'attempts'), 
      where('classId', '==', classId),
      where('assignmentId', '==', exam.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, any> = {};
      snap.docs.forEach(d => {
        const attemptData = d.data();
        map[attemptData.userId] = attemptData;
      });
      setAttemptsMap(map);
    });

    return () => unsub();
  }, [isOpen, exam?.id, classId]);
  
  const submittedList = useMemo(() => {
    if (!exam) return [];
    return roster.filter((r: any) => (exam.submittedStudentIds || []).includes(r.uid));
  }, [exam, roster]);

  const pendingList = useMemo(() => {
    if (!exam) return [];
    return roster.filter((r: any) => !(exam.submittedStudentIds || []).includes(r.uid));
  }, [exam, roster]);

  const displayList = activeTab === 'submitted' ? submittedList : pendingList;

  if (!mounted || !isOpen || !exam) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-lg h-[90vh] sm:h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 fade-in duration-300 border border-slate-100 overflow-hidden">
        
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-start justify-between shrink-0 bg-white/90 backdrop-blur-md z-20 shadow-sm">
          <div className="flex-1 pr-4 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
               <span className={`w-2 h-2 rounded-full ${data.status === 'active' ? 'bg-emerald-500 animate-pulse' : data.status === 'scheduled' ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{data.status === 'active' ? 'Imtihon jarayonda' : data.status === 'scheduled' ? 'Kutilmoqda' : 'Yakunlangan'}</span>
            </div>
            <h2 className="text-[15px] sm:text-[18px] font-black text-slate-900 leading-tight truncate">{exam.title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-full flex items-center justify-center text-slate-400 transition-colors shrink-0 active:scale-95"><X size={18} strokeWidth={2.5}/></button>
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-[#FAFAFA] shrink-0 z-10 border-b border-slate-100">
          <div className="flex p-1 bg-slate-200/60 rounded-xl shadow-inner border border-slate-200/50">
            <button onClick={() => setActiveTab('submitted')} className={`flex-1 py-2 text-[11px] sm:text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'submitted' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}>
              <CheckCircle size={14} strokeWidth={2.5}/> Topshirganlar ({submittedList.length})
            </button>
            <button onClick={() => setActiveTab('pending')} className={`flex-1 py-2 text-[11px] sm:text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'pending' ? 'bg-white text-amber-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}>
              <CircleDashed size={14} strokeWidth={2.5}/> Kutilmoqda ({pendingList.length})
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-20 bg-[#FAFAFA] custom-scrollbar">
          {displayList.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-slate-400 gap-3 border-2 border-dashed border-slate-200/80 rounded-[1.5rem] bg-white shadow-sm">
              {activeTab === 'submitted' ? <CircleDashed size={32} className="opacity-30"/> : <CheckCircle size={32} className="opacity-30 text-emerald-500"/>}
              <p className="font-bold text-[12px] sm:text-[13px]">{activeTab === 'submitted' ? 'Hali hech kim topshirmadi.' : "Barcha o'quvchilar topshirib bo'ldi!"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayList.map((student: any) => {
                const attempt = attemptsMap[student.uid];
                const isGraded = attempt?.status === 'graded';
                const currentScore = attempt?.teacherScore || 0;
                
                return (
                  <div key={student.uid} className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-white border border-slate-200/80 rounded-[1.2rem] shadow-sm hover:border-indigo-100 transition-colors">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-500 text-[13px] shrink-0 overflow-hidden">
                      {student.photoURL || student.photoUrl || student.avatar ? (
                        <img src={student.photoURL || student.photoUrl || student.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        student.displayName?.[0]?.toUpperCase() || <UserIcon size={14} strokeWidth={3}/>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-[12px] sm:text-[14px] truncate leading-tight">{student.displayName}</p>
                      <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 truncate">@{student.username || 'student'}</p>
                    </div>
                    
                    {/* 🟢 NEW: ULTRA-MINIMAL MOBILE LAYOUT FOR BADGES */}
                    <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
                      {activeTab === 'submitted' ? (
                        <>
                          {isGraded ? (
                            <div className="flex items-center gap-1.5">
                              {/* Always visible Score Badge */}
                              <span className="flex bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2 py-1.5 sm:px-2.5 rounded-lg items-center gap-1 sm:gap-1.5 border border-emerald-200 shadow-inner">
                                <Trophy size={12} strokeWidth={2.5} className="text-emerald-500"/> {currentScore} <span className="hidden sm:inline">Ball</span>
                              </span>
                              {/* Edit Button (Icon only on mobile) */}
                              <button 
                                onClick={() => router.push(`/teacher/classes/${classId}/grade/${exam.id}/${student.uid}`)}
                                className="px-2.5 sm:px-4 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-[11px] sm:text-[12px] font-black rounded-lg shadow-sm active:scale-95 transition-all flex items-center gap-1.5 border border-amber-200"
                              >
                                <Edit2 size={14} strokeWidth={2.5} /> <span className="hidden sm:inline">Tahrirlash</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="hidden sm:flex bg-indigo-50 text-indigo-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg items-center gap-1.5 border border-indigo-100">
                                <Clock size={12} strokeWidth={2.5}/> Tekshirilmoqda
                              </span>
                              <button 
                                onClick={() => router.push(`/teacher/classes/${classId}/grade/${exam.id}/${student.uid}`)}
                                className="px-3 sm:px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] sm:text-[12px] font-black rounded-lg shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1"
                              >
                                Baholash <ChevronRight size={14} strokeWidth={3}/>
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1 border border-amber-100">
                          <CircleDashed size={12} className="animate-spin-slow"/>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
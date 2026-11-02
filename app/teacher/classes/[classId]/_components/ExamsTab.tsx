'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, where, limit, doc, updateDoc } from 'firebase/firestore';
import {
  FileBadge, Clock, Play, Lock, Users, ChevronRight, Plus,
  Edit2, X, CheckCircle, CircleDashed, UserIcon, Trophy, EyeOff, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTeacherLanguage } from '@/app/teacher/layout';
import { Button, IconButton, StatusChip, Spinner, EmptyState } from '@/components/ui';

// --- TRANSLATION DICTIONARY ---
const EXAMS_TAB_TRANSLATIONS: Record<string, any> = {
  uz: {
    empty: { title: "Imtihonlar yo'q", desc: "Sinf uchun BSB yoki CHSB biriktirmagansiz.", btn: "BSB / CHSB Biriktirish" },
    min: (n: number) => `${n} daq`,
    hiddenTitle: "Natijalar yashirilgan (Ochish uchun bosing)", visibleTitle: "Natijalar ochiq (Yashirish uchun bosing)",
    edit: "Tahrirlash", close: "Yopish",
    status: { active: "Imtihon jarayonda", scheduled: "Kutilmoqda", closed: "Yakunlangan" },
    submittedTab: "Topshirganlar", pendingTab: "Kutilmoqda",
    emptySubmitted: "Hali hech kim topshirmadi.", emptyPending: "Barcha o'quvchilar topshirib bo'ldi!",
    points: "Ball", checking: "Tekshirilmoqda", grade: "Baholash",
    toasts: { hidden: "Natijalar yashirildi!", visible: "O'quvchilar natijalarni ko'ra oladi!", error: "Xatolik yuz berdi" }
  },
  en: {
    empty: { title: "No exams yet", desc: "You haven't assigned a BSB or CHSB for this class.", btn: "Assign BSB / CHSB" },
    min: (n: number) => `${n} min`,
    hiddenTitle: "Results hidden (click to reveal)", visibleTitle: "Results visible (click to hide)",
    edit: "Edit", close: "Close",
    status: { active: "Exam in progress", scheduled: "Scheduled", closed: "Finished" },
    submittedTab: "Submitted", pendingTab: "Pending",
    emptySubmitted: "No one has submitted yet.", emptyPending: "All students have submitted!",
    points: "Pts", checking: "Pending review", grade: "Grade",
    toasts: { hidden: "Results hidden!", visible: "Students can now see the results!", error: "Something went wrong" }
  },
  ru: {
    empty: { title: "Экзаменов нет", desc: "Вы не назначили BSB или CHSB для этого класса.", btn: "Назначить BSB / CHSB" },
    min: (n: number) => `${n} мин`,
    hiddenTitle: "Результаты скрыты (нажмите, чтобы открыть)", visibleTitle: "Результаты открыты (нажмите, чтобы скрыть)",
    edit: "Редактировать", close: "Закрыть",
    status: { active: "Экзамен идет", scheduled: "Ожидается", closed: "Завершен" },
    submittedTab: "Сдали", pendingTab: "Ожидаются",
    emptySubmitted: "Пока никто не сдал.", emptyPending: "Все ученики сдали работу!",
    points: "Балл", checking: "На проверке", grade: "Оценить",
    toasts: { hidden: "Результаты скрыты!", visible: "Ученики теперь видят результаты!", error: "Произошла ошибка" }
  }
};

export default function ExamsTab({ classId, roster, onAdd, onEdit }: any) {
  const { lang } = useTeacherLanguage();
  const t = EXAMS_TAB_TRANSLATIONS[lang] || EXAMS_TAB_TRANSLATIONS['uz'];
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
      toast.success(!isCurrentlyHidden ? t.toasts.hidden : t.toasts.visible, {
        icon: !isCurrentlyHidden ? '🙈' : '🏆'
      });
    } catch (error) {
      toast.error(t.toasts.error);
    }
  };

  if (loading && exams.length === 0) return <div className="py-12 flex justify-center"><Spinner size={28}/></div>;

  if (exams.length === 0) {
    return (
      <div className="py-6 md:py-8 t-glass-card rounded-m3-xl mx-2 md:mx-0">
        <EmptyState
          icon={<FileBadge strokeWidth={2.5} />}
          title={t.empty.title}
          description={t.empty.desc}
          action={
            <Button variant="filled" size="sm" icon={<Plus strokeWidth={2.5}/>} onClick={onAdd}>
              {t.empty.btn}
            </Button>
          }
        />
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
              className="t-glass-card rounded-m3-lg p-4 md:p-5 flex flex-col sm:flex-row justify-between gap-4 group hover:shadow-elev-2 hover:-translate-y-0.5 transition-all cursor-pointer active:scale-[0.98] sm:active:scale-100"
            >

              <div className="flex items-start md:items-center gap-3 md:gap-4 min-w-0">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  status === 'active' ? 't-icon-chip animate-pulse' :
                  status === 'scheduled' ? 't-icon-chip-soft' : 'bg-surface-container-highest text-on-surface-variant'
                }`}>
                  {status === 'active' ? <Play size={18} className="ml-0.5 md:w-5 md:h-5" fill="currentColor"/> : status === 'scheduled' ? <Clock size={18} className="md:w-5 md:h-5" strokeWidth={2.5}/> : <Lock size={18} className="md:w-5 md:h-5" strokeWidth={2.5}/>}
                </div>

                <div className="min-w-0 pr-2">
                  <h3 className="font-black text-[14px] md:text-[16px] text-on-surface group-hover:text-primary transition-colors truncate leading-snug">{exam.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-2 md:gap-3 gap-y-1 mt-1 md:mt-1.5 text-[10px] md:text-[12px] font-bold text-on-surface-variant">
                    <span className="t-icon-chip-soft uppercase tracking-widest px-2 py-0.5 rounded-full">{exam.assessmentType}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{examDate.toLocaleDateString()} {examDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span>•</span>
                    <span>{t.min(exam.durationMinutes)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 pt-1 sm:pt-0 w-full sm:w-auto shrink-0">
                 <div className="t-icon-chip-soft flex items-center gap-1.5 text-[11px] md:text-[12px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                    <Users size={14}/>
                    {exam.submittedStudentIds?.length || 0} / {roster.length}
                 </div>

                 {/* 🟢 NEW: QUICK ACTION BUTTONS */}
                 <div className="flex items-center gap-1.5">

                   {/* QUICK TOGGLE VISIBILITY */}
                   <button
                     onClick={(e) => toggleVisibility(e, exam)}
                     className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                       isHidden
                         ? 'text-on-surface-variant hover:text-on-surface hover:bg-[color-mix(in_oklab,var(--m3-on-surface)_8%,transparent)]'
                         : 'bg-success-container text-on-success-container'
                     }`}
                     title={isHidden ? t.hiddenTitle : t.visibleTitle}
                   >
                     {isHidden ? <EyeOff size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5}/> : <Eye size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5}/>}
                   </button>

                   {/* EDIT EXAM */}
                   <button
                     onClick={(e) => { e.stopPropagation(); onEdit(exam); }}
                     className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-primary-container hover:bg-primary-container transition-colors active:scale-95"
                     title={t.edit}
                   >
                     <Edit2 size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5}/>
                   </button>

                   {/* ENTER SUBMISSIONS */}
                   <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-on-surface-variant group-hover:bg-primary group-hover:text-on-primary transition-colors">
                     <ChevronRight size={18} className="md:w-5 md:h-5" strokeWidth={3}/>
                   </div>

                 </div>
              </div>

            </div>
          );
        })}
        
        {hasMore && (
          <div className="py-4 flex justify-center">
            <Spinner size={24}/>
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
  const { lang } = useTeacherLanguage();
  const t = EXAMS_TAB_TRANSLATIONS[lang] || EXAMS_TAB_TRANSLATIONS['uz'];
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
      <div className="absolute inset-0 bg-scrim backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      <div className="relative bg-surface-container-low rounded-t-m3-xl sm:rounded-m3-xl w-full max-w-lg h-[90vh] sm:h-[80vh] flex flex-col shadow-elev-3 animate-in slide-in-from-bottom-10 sm:zoom-in-95 fade-in duration-300 overflow-hidden">

        <div className="p-4 sm:p-6 border-b border-outline-variant flex items-start justify-between shrink-0 bg-[color-mix(in_oklab,var(--m3-surface-container-low)_90%,transparent)] backdrop-blur-md z-20 shadow-elev-1">
          <div className="flex-1 pr-4 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
               <span className={`w-2 h-2 rounded-full ${data.status === 'active' ? 'bg-success animate-pulse' : data.status === 'scheduled' ? 'bg-warning' : 'bg-outline'}`}></span>
               <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{data.status === 'active' ? t.status.active : data.status === 'scheduled' ? t.status.scheduled : t.status.closed}</span>
            </div>
            <h2 className="text-[15px] sm:text-[18px] font-black text-on-surface leading-tight truncate">{exam.title}</h2>
          </div>
          <IconButton aria-label={t.close} size="sm" onClick={onClose} className="shrink-0"><X strokeWidth={2.5}/></IconButton>
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-surface shrink-0 z-10 border-b border-outline-variant">
          <div className="flex p-1 bg-surface-container-high rounded-m3-md shadow-inner border border-outline-variant">
            <button onClick={() => setActiveTab('submitted')} className={`flex-1 py-2 text-[11px] sm:text-[12px] font-bold rounded-m3-sm transition-all flex items-center justify-center gap-1.5 ${activeTab === 'submitted' ? 'bg-surface-container-lowest text-success shadow-elev-1 ring-1 ring-outline-variant' : 'text-on-surface-variant hover:text-on-surface'}`}>
              <CheckCircle size={14} strokeWidth={2.5}/> {t.submittedTab} ({submittedList.length})
            </button>
            <button onClick={() => setActiveTab('pending')} className={`flex-1 py-2 text-[11px] sm:text-[12px] font-bold rounded-m3-sm transition-all flex items-center justify-center gap-1.5 ${activeTab === 'pending' ? 'bg-surface-container-lowest text-warning shadow-elev-1 ring-1 ring-outline-variant' : 'text-on-surface-variant hover:text-on-surface'}`}>
              <CircleDashed size={14} strokeWidth={2.5}/> {t.pendingTab} ({pendingList.length})
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-20 bg-surface custom-scrollbar">
          {displayList.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-on-surface-variant gap-3 border-2 border-dashed border-outline-variant rounded-m3-lg bg-surface-container-low shadow-elev-1">
              {activeTab === 'submitted' ? <CircleDashed size={32} className="opacity-30"/> : <CheckCircle size={32} className="opacity-30 text-success"/>}
              <p className="font-bold text-[12px] sm:text-[13px]">{activeTab === 'submitted' ? t.emptySubmitted : t.emptyPending}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayList.map((student: any) => {
                const attempt = attemptsMap[student.uid];
                const isGraded = attempt?.status === 'graded';
                const currentScore = attempt?.teacherScore || 0;
                
                return (
                  <div key={student.uid} className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-surface-container-lowest border border-outline-variant rounded-m3-lg shadow-elev-1 hover:border-outline transition-colors">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-surface-container-high rounded-m3-md flex items-center justify-center font-black text-on-surface-variant text-[13px] shrink-0 overflow-hidden">
                      {student.photoURL || student.photoUrl || student.avatar ? (
                        <img src={student.photoURL || student.photoUrl || student.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        student.displayName?.[0]?.toUpperCase() || <UserIcon size={14} strokeWidth={3}/>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-on-surface text-[12px] sm:text-[14px] truncate leading-tight">{student.displayName}</p>
                      <p className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant truncate">@{student.username || 'student'}</p>
                    </div>

                    {/* 🟢 NEW: ULTRA-MINIMAL MOBILE LAYOUT FOR BADGES */}
                    <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
                      {activeTab === 'submitted' ? (
                        <>
                          {isGraded ? (
                            <div className="flex items-center gap-1.5">
                              {/* Always visible Score Badge */}
                              <StatusChip tone="success" noDot className="text-[10px] font-black uppercase tracking-widest">
                                <Trophy size={12} strokeWidth={2.5}/> {currentScore} <span className="hidden sm:inline">{t.points}</span>
                              </StatusChip>
                              {/* Edit Button (Icon only on mobile) */}
                              <Button
                                variant="tonal"
                                size="sm"
                                icon={<Edit2 strokeWidth={2.5} />}
                                onClick={() => router.push(`/teacher/classes/${classId}/grade/${exam.id}/${student.uid}`)}
                              >
                                <span className="hidden sm:inline">{t.edit}</span>
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <StatusChip tone="info" noDot className="hidden sm:inline-flex text-[10px] font-black uppercase tracking-widest">
                                <Clock size={12} strokeWidth={2.5}/> {t.checking}
                              </StatusChip>
                              <Button
                                variant="filled"
                                size="sm"
                                onClick={() => router.push(`/teacher/classes/${classId}/grade/${exam.id}/${student.uid}`)}
                              >
                                {t.grade} <ChevronRight size={14} strokeWidth={3}/>
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <StatusChip tone="warning" noDot className="text-[10px] font-black uppercase tracking-widest px-2">
                          <CircleDashed size={12} className="animate-spin-slow"/>
                        </StatusChip>
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
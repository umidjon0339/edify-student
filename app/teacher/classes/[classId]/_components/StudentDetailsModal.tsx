'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom'; // 🟢 ADDED PORTAL
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { 
  X, FileText, Calendar, Clock, AlertCircle, 
  ChevronRight, ArrowLeft, CheckCircle, XCircle, 
  Loader2, ShieldAlert, ShieldCheck, Target, UserCircle
} from 'lucide-react';
import LatexRenderer from '@/components/LatexRenderer'; 
import { useTeacherLanguage } from '@/app/teacher/layout'; 

// --- TRANSLATION DICTIONARY ---
const STUDENT_MODAL_TRANSLATIONS = {
  uz: {
    historyTitle: "Topshiriqlar Tarixi", loading: "Yuklanmoqda...", loadingData: "Ma'lumotlar olinmoqda...",
    empty: "Hozircha topshiriqlar yo'q.", review: "Urinishni Ko'rish", late: "Kechikkan", due: "Muddat",
    noDeadline: "Muddat yo'q", missing: "Topshirilmagan", pending: "Kutilmoqda", performance: "Natijalar",
    correct: "To'g'ri", integrity: "Xavfsizlik", switches: "Oyna almashish", focusLost: "Diqqat yo'qotildi.",
    focusKept: "Diqqat bilan ishladi.", submissionInfo: "Ma'lumot", attempt: "Urinish", analysis: "Tahlil",
    studentAns: "O'quvchi Javobi", correctAns: "To'g'ri Javob", skipped: "O'tkazib yuborilgan", viewProfile: "Profilni Ko'rish",
    unknown: "Noma'lum o'quvchi"
  },
  en: {
    historyTitle: "Assignment History", loading: "Loading...", loadingData: "Retrieving Data...",
    empty: "No assignments yet.", review: "Review Attempt", late: "Late", due: "Due",
    noDeadline: "No Deadline", missing: "Missing", pending: "Pending", performance: "Performance",
    correct: "Correct", integrity: "Integrity", switches: "Tab Switches", focusLost: "Focus lost.",
    focusKept: "Stayed focused.", submissionInfo: "Info", attempt: "Attempt", analysis: "Analysis",
    studentAns: "Student Answer", correctAns: "Correct Answer", skipped: "Skipped", viewProfile: "View Profile",
    unknown: "Unknown Student"
  },
  ru: {
    historyTitle: "История Заданий", loading: "Загрузка...", loadingData: "Получение данных...",
    empty: "Заданий пока нет.", review: "Обзор Попытки", late: "Поздно", due: "Срок",
    noDeadline: "Без срока", missing: "Отсутствует", pending: "В ожидании", performance: "Результаты",
    correct: "Верно", integrity: "Честность", switches: "Переключений", focusLost: "Потеря фокуса.",
    focusKept: "Был сосредоточен.", submissionInfo: "Инфо", attempt: "Попытка", analysis: "Анализ",
    studentAns: "Ответ Ученика", correctAns: "Правильный Ответ", skipped: "Пропущено", viewProfile: "Смотреть Профиль",
    unknown: "Неизвестный ученик"
  }
};

const getContentText = (content: any) => {
  if (!content) return "";
  if (typeof content === 'string') return content;
  return content.uz || content.en || content.ru || content.text || JSON.stringify(content) || "";
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  assignments: any[]; 
  classId: string; 
}

const PAGE_SIZE = 10;

export default function StudentDetailsModal({ isOpen, onClose, student, assignments = [], classId }: Props) {
  const router = useRouter();
  const { lang } = useTeacherLanguage();
  const t = STUDENT_MODAL_TRANSLATIONS[lang] || STUDENT_MODAL_TRANSLATIONS['en'];

  // 🟢 SSR HYDRATION FIX FOR PORTAL
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // --- STATE ---
  const [attemptsMap, setAttemptsMap] = useState<Record<string, any>>({});
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  
  // Pagination State
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Drill-down State
  const [viewingAttempt, setViewingAttempt] = useState<any>(null); 
  const [fullTestData, setFullTestData] = useState<any>(null);     
  const [loadingTest, setLoadingTest] = useState(false);

  // Filter assignments relevant to this student
  const relevantAssignments = assignments.filter(a => 
    !Array.isArray(a.assignedTo) || a.assignedTo.includes(student?.uid)
  );

  const visibleAssignments = relevantAssignments.slice(0, displayCount);
  const hasMore = displayCount < relevantAssignments.length;

  // --- FETCH ATTEMPTS ---
  useEffect(() => {
    if (isOpen && student && classId) {
      const fetchStudentGrades = async () => {
        setLoadingAttempts(true);
        try {
          const q = query(
            collection(db, 'attempts'),
            where('classId', '==', classId),
            where('userId', '==', student.uid)
          );
          const snap = await getDocs(q);
          const newMap: Record<string, any> = {};
          
          snap.forEach(doc => {
            const data = doc.data();
            newMap[data.assignmentId] = { id: doc.id, ...data };
          });
          
          setAttemptsMap(newMap);
        } catch (e) {
          console.error("Failed to load student grades", e);
        } finally {
          setLoadingAttempts(false);
        }
      };
      fetchStudentGrades();
      setDisplayCount(PAGE_SIZE);
    } else {
      setAttemptsMap({});
      setViewingAttempt(null);
      setFullTestData(null);
    }
  }, [isOpen, student, classId]);

  // --- INFINITE SCROLL OBSERVER ---
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setDisplayCount(prev => prev + PAGE_SIZE);
      }
    }, { threshold: 0.5 });
    if (node) observerRef.current.observe(node);
  }, [hasMore]);

  // --- HANDLERS ---
  const handleViewDetails = async (attempt: any) => {
    setLoadingTest(true);
    setViewingAttempt(attempt);
    try {
      const testRef = doc(db, 'custom_tests', attempt.testId);
      const testSnap = await getDoc(testRef);
      if (testSnap.exists()) {
        setFullTestData(testSnap.data());
      } else {
        setFullTestData({ questions: [] }); 
      }
    } catch (error) {
      setFullTestData({ questions: [] });
    } finally {
      setLoadingTest(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.seconds) return '-';
    return new Date(timestamp.seconds * 1000).toLocaleString([], {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // 🟢 COMBINED MOUNTED & OPEN CHECK
  if (!mounted || !isOpen || !student) return null;

  // 🟢 WRAPPED IN CREATE PORTAL
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-6">
      
      {/* OVERLAY */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      {/* 🟢 ULTRA MINIMALISTIC MOBILE-FIRST MODAL */}
      <div className="relative bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-3xl overflow-hidden flex flex-col h-[90vh] sm:h-[85vh] animate-in slide-in-from-bottom-10 sm:zoom-in-95 fade-in duration-300 shadow-2xl border border-slate-100">
        
        {/* --- HEADER --- */}
        <div className="px-5 py-4 border-b border-slate-100 bg-white/90 backdrop-blur-xl flex justify-between items-center shrink-0 z-20 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
             {viewingAttempt ? (
               <button onClick={() => { setViewingAttempt(null); setFullTestData(null); }} className="w-9 h-9 md:w-10 md:h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl flex items-center justify-center text-slate-500 transition-all shrink-0 active:scale-95">
                 <ArrowLeft size={18} strokeWidth={2.5}/>
               </button>
             ) : (
               <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-tr from-indigo-500 to-violet-500 text-white rounded-[1rem] flex items-center justify-center font-black text-[16px] md:text-[18px] shadow-sm border-2 border-white shrink-0">
                 {student.displayName?.[0]?.toUpperCase() || 'S'}
               </div>
             )}
             
             <div className="min-w-0 pr-2">
               <h2 className="text-[16px] md:text-[18px] font-black text-slate-900 tracking-tight truncate leading-tight">
                 {viewingAttempt ? t.review : (student.displayName || t.unknown)}
               </h2>
               <p className="text-[11px] md:text-[12px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 truncate">
                 {viewingAttempt ? viewingAttempt.testTitle : `@${student.username || 'student'}`}
               </p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-full text-slate-400 hover:text-slate-600 transition-colors shrink-0 active:scale-95">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* --- SCROLLABLE BODY --- */}
        {/* Added pb-[env(safe-area-inset-bottom)] for iOS devices */}
        <div className="flex-1 overflow-y-auto bg-[#FAFAFA] custom-scrollbar relative pb-[calc(1rem+env(safe-area-inset-bottom))]">
          
          {/* VIEW 1: ASSIGNMENT LIST */}
          {!viewingAttempt && (
            <div className="p-4 md:p-8 space-y-4">
              
              <button 
                onClick={() => { onClose(); router.push(`/teacher/students/${student.uid}`); }}
                className="w-full bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-sm active:scale-[0.98] rounded-2xl p-4 flex items-center justify-center gap-2 text-indigo-600 font-black text-[13px] md:text-[14px] transition-all shadow-sm mb-4 md:mb-6"
              >
                <UserCircle size={18} strokeWidth={2.5}/> {t.viewProfile}
              </button>

              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2 px-1">
                <FileText size={14}/> {t.historyTitle}
              </h3>

              {loadingAttempts ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-indigo-500">
                  <Loader2 className="animate-spin" size={28}/>
                  <span className="text-[11px] font-black uppercase tracking-widest">{t.loading}</span>
                </div>
              ) : relevantAssignments.length === 0 ? (
                <div className="text-center py-16 bg-white border-2 border-dashed border-slate-200/80 rounded-[1.5rem] text-slate-400 font-bold text-[13px] md:text-[14px] shadow-sm">
                  {t.empty}
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleAssignments.map((assign, index) => {
                    const isLastElement = index === visibleAssignments.length - 1;
                    const attempt = attemptsMap[assign.id];
                    const isLate = !attempt && assign.dueAt && new Date() > new Date(assign.dueAt.seconds * 1000);
                    const score = attempt && attempt.totalQuestions > 0 ? Math.round((attempt.score / attempt.totalQuestions) * 100) : 0;

                    return (
                      <div 
                        key={assign.id} 
                        ref={isLastElement ? lastElementRef : null}
                        onClick={() => attempt && handleViewDetails(attempt)} 
                        className={`border border-slate-200/80 rounded-2xl p-4 md:p-5 bg-white transition-all flex items-center justify-between group shadow-sm ${attempt ? 'cursor-pointer hover:border-indigo-300 active:scale-[0.98]' : ''}`}
                      >
                        <div className="flex items-start gap-3 md:gap-4 min-w-0 pr-2 md:pr-4">
                          <div className={`mt-1.5 md:mt-2 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full shrink-0 shadow-inner border-2 border-white ${attempt ? (score >= 60 ? 'bg-emerald-500' : 'bg-red-500') : (isLate ? 'bg-red-400' : 'bg-slate-300')}`} />
                          <div className="min-w-0">
                            <h4 className="font-black text-slate-800 text-[14px] md:text-[15px] truncate group-hover:text-indigo-700 transition-colors leading-snug">{assign.testTitle || 'Untitled'}</h4>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1.5 text-[11px] md:text-[12px] font-bold text-slate-500">
                              {assign.dueAt ? (
                                <span className={`flex items-center gap-1 ${isLate ? 'text-red-500' : ''}`}>
                                   <Calendar size={12}/> {isLate ? t.late : t.due}: {formatDate(assign.dueAt)}
                                </span>
                              ) : <span className="flex items-center gap-1"><Calendar size={12}/> {t.noDeadline}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-2 md:gap-3 shrink-0">
                          {attempt ? (
                            <div className="flex flex-col items-end">
                              <span className={`text-[16px] md:text-[20px] font-black leading-none ${score >= 60 ? 'text-emerald-600' : 'text-red-600'}`}>{score}%</span>
                              <span className="text-[10px] md:text-[11px] text-slate-400 font-black uppercase tracking-widest mt-1">{attempt.score}/{attempt.totalQuestions}</span>
                            </div>
                          ) : isLate ? (
                            <span className="bg-red-50 text-red-600 text-[10px] md:text-[11px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm border border-red-100"><AlertCircle size={12}/> {t.missing}</span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 text-[10px] md:text-[11px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm border border-slate-200"><Clock size={12}/> {t.pending}</span>
                          )}
                          {attempt && <ChevronRight size={18} strokeWidth={2.5} className="text-slate-300 group-hover:text-indigo-500 transition-colors hidden sm:block"/>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: DRILL DOWN (Review Attempt) */}
          {viewingAttempt && (
            <div className="p-4 md:p-8 animate-in slide-in-from-right-4 fade-in duration-300">
              {loadingTest || !fullTestData ? (
                <div className="flex flex-col items-center justify-center py-24 text-indigo-600 gap-3">
                  <Loader2 className="animate-spin" size={32} /> 
                  <span className="text-[11px] md:text-[12px] font-black uppercase tracking-widest">{t.loadingData}</span>
                </div>
              ) : (
                <div className="space-y-6 md:space-y-8">
                  {/* 🟢 COMPACT MOBILE PERFORMANCE BENTO */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    
                    {/* SCORE */}
                    <div className="col-span-2 md:col-span-1 bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 mb-2 md:mb-3 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        <Target size={14} className="text-indigo-400"/> {t.performance}
                      </div>
                      <div>
                        <span className="text-3xl md:text-4xl font-black text-slate-900">{viewingAttempt.score || 0}</span>
                        <span className="text-[12px] md:text-[14px] text-slate-400 font-bold"> / {viewingAttempt.totalQuestions || 0} {t.correct}</span>
                      </div>
                      <div className="w-full h-1.5 md:h-2 bg-slate-100 rounded-full mt-3 md:mt-4 overflow-hidden shadow-inner">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" style={{ width: `${((viewingAttempt.score || 0) / (viewingAttempt.totalQuestions || 1)) * 100}%` }}></div>
                      </div>
                    </div>

                    {/* INTEGRITY */}
                    <div className={`p-4 md:p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
                      (viewingAttempt.tabSwitches || 0) > 0 ? 'bg-red-50/50 border-red-200' : 'bg-emerald-50/50 border-emerald-200'
                    }`}>
                      <div className={`flex items-center gap-1.5 mb-2 md:mb-3 text-[10px] font-black uppercase tracking-widest ${
                        (viewingAttempt.tabSwitches || 0) > 0 ? 'text-red-500' : 'text-emerald-500'
                      }`}>
                        {(viewingAttempt.tabSwitches || 0) > 0 ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />} {t.integrity}
                      </div>
                      <div>
                        <span className={`text-2xl md:text-4xl font-black ${(viewingAttempt.tabSwitches || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {viewingAttempt.tabSwitches || 0}
                        </span>
                        <span className={`text-[11px] md:text-[14px] font-bold block md:inline ${(viewingAttempt.tabSwitches || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}> {t.switches}</span>
                      </div>
                    </div>

                    {/* INFO */}
                    <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 mb-2 md:mb-3 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        <Clock size={14} className="text-amber-400"/> {t.submissionInfo}
                      </div>
                      <div>
                        <p className="text-[12px] md:text-[15px] font-black text-slate-800 leading-tight">
                          {formatDate(viewingAttempt.submittedAt || viewingAttempt.createdAt)}
                        </p>
                        <p className="text-[10px] md:text-[12px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 md:mt-2">
                          {t.attempt} #{viewingAttempt.attemptsTaken || 1}
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* 🟢 QUESTION ANALYSIS LIST */}
                  <div className="space-y-3 md:space-y-4">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.analysis}</h3>
                    
                    {Array.isArray(fullTestData?.questions) && fullTestData.questions.map((q: any, idx: number) => {
                       const studentAnswer = viewingAttempt.answers?.[q.id] || null;
                       const isCorrect = studentAnswer === q.answer;

                       return (
                         <div key={q.id || idx} className={`bg-white border rounded-2xl p-4 md:p-6 shadow-sm ${isCorrect ? 'border-emerald-200/60' : 'border-red-200/60 bg-red-50/20'}`}>
                           <div className="flex flex-col gap-3 md:gap-6">
                             
                             {/* Question Stem */}
                             <div className="flex items-start gap-3 md:gap-4 flex-1">
                               <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-[14px] md:text-[16px] text-white shadow-sm mt-0.5 ${isCorrect ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-red-500 shadow-red-500/20'}`}>
                                 {idx + 1}
                               </div>
                               <div className="font-bold text-slate-800 text-[13px] md:text-[15px] leading-relaxed pt-1 overflow-hidden break-words">
                                 <LatexRenderer latex={getContentText(q.question)} />
                               </div>
                             </div>
                             
                             {/* Answers Grid (Stacks on mobile) */}
                             <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full shrink-0 border-t border-slate-100 pt-3 md:pt-4">
                               <div className={`flex-1 p-3 md:p-4 rounded-xl border flex flex-col justify-center min-w-0 ${isCorrect ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-red-50/50 border-red-200 text-red-900'}`}>
                                  <p className="font-black text-[9px] md:text-[10px] opacity-60 uppercase tracking-widest mb-1 md:mb-1.5 flex items-center gap-1.5">
                                    {isCorrect ? <CheckCircle size={12}/> : <XCircle size={12}/>} {t.studentAns}
                                  </p>
                                  <div className="font-bold text-[12px] md:text-[14px] flex items-center gap-2 overflow-hidden">
                                    <span className="bg-white px-2 py-0.5 rounded-lg border border-slate-200/50 shadow-sm shrink-0">{studentAnswer || '-'}</span>
                                    <span className="opacity-80 truncate">
                                      <LatexRenderer latex={getContentText(q.options?.[studentAnswer]) || t.skipped} />
                                    </span>
                                  </div>
                               </div>

                               {!isCorrect && (
                                 <div className="flex-1 p-3 md:p-4 rounded-xl border bg-emerald-50/50 border-emerald-200 text-emerald-900 flex flex-col justify-center min-w-0">
                                    <p className="font-black text-[9px] md:text-[10px] opacity-60 uppercase tracking-widest mb-1 md:mb-1.5 flex items-center gap-1.5">
                                      <CheckCircle size={12}/> {t.correctAns}
                                    </p>
                                    <div className="font-bold text-[12px] md:text-[14px] flex items-center gap-2 overflow-hidden">
                                      <span className="bg-white px-2 py-0.5 rounded-lg border border-emerald-200/50 shadow-sm text-emerald-700 shrink-0">{q.answer || '-'}</span>
                                      <span className="opacity-80 truncate">
                                        <LatexRenderer latex={getContentText(q.options?.[q.answer]) || '-'} />
                                      </span>
                                    </div>
                                 </div>
                               )}
                             </div>

                           </div>
                         </div>
                       );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
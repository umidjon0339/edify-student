'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom'; // 🟢 ADDED PORTAL
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, startAfter, getDocs, deleteDoc, doc, where } from 'firebase/firestore';
import { 
  Calendar, Clock, Trash2, Edit2, Plus, 
  Copy, AlertTriangle, X, Loader2, Play, Lock, CheckCircle, User as UserIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTeacherLanguage } from '@/app/teacher/layout';
import { useRouter } from 'next/navigation';

// ============================================================================
// 🟢 1. GLOBAL CACHES (Survives Tab Switches, 0 Reads on Back Navigation)
// ============================================================================
const globalAssignmentsCache: Record<string, { assignments: any[], lastDoc: any, hasMore: boolean, timestamp: number }> = {};
const globalSubmissionsCache: Record<string, { attempts: any[], missingProfiles: any[], timestamp: number }> = {};
const CACHE_LIFESPAN = 60 * 1000; // 60 seconds

// --- TRANSLATION DICTIONARY ---
const ASSIGN_TAB_TRANSLATIONS: any = {
  uz: {
    emptyTitle: "Hozircha topshiriqlar yo'q", createBtn: "Topshiriq Yaratish", loading: "Yuklanmoqda...",
    status: { scheduled: "Rejalashtirilgan", active: "Faol", closed: "Yopilgan", due: "Muddat", noDeadline: "Muddatsiz" },
    assignees: { all: "Barcha O'quvchilar", count: "{n} ta" },
    progress: { submitted: "Topshirildi", missing: "Topshirilmagan", pending: "Kutilmoqda" },
    toasts: { deleted: "Topshiriq o'chirildi", failDelete: "O'chirib bo'lmadi", copied: "Havola nusxalandi!" },
    modals: { deleteTitle: "Topshiriqni o'chirasizmi?", deleteDesc: "\"{title}\"ni o'chirishni tasdiqlaysizmi?", cancel: "Bekor qilish", confirmDelete: "Ha, O'chirish" },
    submissions: { title: "Natijalar", submitted: "Topshirganlar", pending: "Kutilmoqda", correct: "To'g'ri", emptySub: "Hali hech kim topshirmadi.", emptyPend: "Barcha topshirdi!" }
  },
  en: {
    emptyTitle: "No assignments yet", createBtn: "Create Assignment", loading: "Loading...",
    status: { scheduled: "Scheduled", active: "Active", closed: "Closed", due: "Due", noDeadline: "No Deadline" },
    assignees: { all: "All Students", count: "{n} students" },
    progress: { submitted: "Submitted", missing: "Missing", pending: "Pending" },
    toasts: { deleted: "Assignment deleted", failDelete: "Could not delete", copied: "Link copied!" },
    modals: { deleteTitle: "Delete Assignment?", deleteDesc: "Are you sure you want to delete \"{title}\"?", cancel: "Cancel", confirmDelete: "Yes, Delete" },
    submissions: { title: "Submissions", submitted: "Submitted", pending: "Pending", correct: "Correct", emptySub: "No submissions yet.", emptyPend: "Everyone submitted!" }
  },
  ru: {
    emptyTitle: "Заданий пока нет", createBtn: "Создать Задание", loading: "Загрузка...",
    status: { scheduled: "Запланировано", active: "Активно", closed: "Закрыто", due: "Срок", noDeadline: "Без срока" },
    assignees: { all: "Все", count: "{n} учеников" },
    progress: { submitted: "Сдано", missing: "Отсутствует", pending: "В ожидании" },
    toasts: { deleted: "Задание удалено", failDelete: "Не удалось удалить", copied: "Ссылка скопирована!" },
    modals: { deleteTitle: "Удалить Задание?", deleteDesc: "Удалить \"{title}\"?", cancel: "Отмена", confirmDelete: "Да, Удалить" },
    submissions: { title: "Результаты", submitted: "Сдали", pending: "Ожидают", correct: "Верно", emptySub: "Пока нет ответов.", emptyPend: "Все сдали!" }
  }
};

interface Props {
  classId: string;
  roster?: any[]; 
  totalRosterSize?: number; 
  onEdit: (assignment: any) => void;
  onAdd: () => void;
}

const PAGE_SIZE = 10;

export default function AssignmentsTab({ classId, roster = [], totalRosterSize, onEdit, onAdd }: Props) {
  const { lang } = useTeacherLanguage();
  const t = ASSIGN_TAB_TRANSLATIONS[lang] || ASSIGN_TAB_TRANSLATIONS['en'];

  // 🟢 SSR HYDRATION FIX FOR PORTAL
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const [deleteData, setDeleteData] = useState<any>(null);
  const [submissionsData, setSubmissionsData] = useState<any>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // ============================================================================
  // 🟢 2. SWR FETCHING LOGIC (Cache First, Fetch Later)
  // ============================================================================
  useEffect(() => {
    const initializeTab = async () => {
      const cached = globalAssignmentsCache[classId];
      const now = Date.now();

      // Cache Hit: Instant Load!
      if (cached) {
        setAssignments(cached.assignments);
        setLastDoc(cached.lastDoc);
        setHasMore(cached.hasMore);
        setLoadingInitial(false);

        // If fresh, stop. If stale, silently re-fetch page 1 in the background
        if (now - cached.timestamp < CACHE_LIFESPAN) return;
        fetchAssignments(false, true); 
      } else {
        setLoadingInitial(true);
        fetchAssignments(false, false);
      }
    };

    initializeTab();
  }, [classId]);

  const fetchAssignments = async (isNextPage: boolean = false, silent: boolean = false) => {
    if (!classId) return;
    if (isNextPage && !lastDoc) return;
    
    if (!silent) {
      isNextPage ? setLoadingMore(true) : setLoadingInitial(true);
    }

    try {
      let q = query(collection(db, 'classes', classId, 'assignments'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
      if (isNextPage && lastDoc) {
        q = query(collection(db, 'classes', classId, 'assignments'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
      }

      const snap = await getDocs(q);
      const newDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      setAssignments(prev => {
        const updated = isNextPage ? [...prev, ...newDocs] : newDocs;
        const newLastDoc = snap.docs[snap.docs.length - 1] || null;
        const newHasMore = snap.docs.length >= PAGE_SIZE;

        // 🟢 Update Cache
        globalAssignmentsCache[classId] = {
          assignments: updated,
          lastDoc: newLastDoc,
          hasMore: newHasMore,
          timestamp: Date.now()
        };

        if (!silent || !isNextPage) {
          setLastDoc(newLastDoc);
          setHasMore(newHasMore);
        }
        return updated;
      });

    } catch (e) { console.error(e); } 
    finally { setLoadingInitial(false); setLoadingMore(false); }
  };

  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingInitial || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) fetchAssignments(true);
    }, { threshold: 0.5 });
    if (node) observerRef.current.observe(node);
  }, [loadingInitial, loadingMore, hasMore]);

  // --- ACTIONS ---
  const handleDeleteConfirm = async () => {
    if (!deleteData) return;
    try {
      await deleteDoc(doc(db, 'classes', classId, 'assignments', deleteData.id));
      toast.success(t.toasts.deleted);
      
      setAssignments(prev => {
        const updated = prev.filter(a => a.id !== deleteData.id);
        if (globalAssignmentsCache[classId]) globalAssignmentsCache[classId].assignments = updated;
        return updated;
      });
      setDeleteData(null);
    } catch (e) { toast.error(t.toasts.failDelete); }
  };

  const handleCopyLink = (e: React.MouseEvent, assignmentId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/classes/${classId}/test/${assignmentId}`);
    toast.success(t.toasts.copied);
  };

  const safeRosterSize = totalRosterSize || roster.length;

  if (loadingInitial && assignments.length === 0) {
    return <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={28}/></div>;
  }

  return (
    <>
      <div className="space-y-3 md:space-y-4">
        {assignments.length === 0 && (
          <div className="text-center py-16 bg-slate-50 rounded-[1.5rem] border border-dashed border-slate-200 flex flex-col items-center">
             <div className="w-16 h-16 bg-white rounded-[1.2rem] flex items-center justify-center mb-4 shadow-sm text-slate-300">
               <Clock size={32} />
             </div>
             <h3 className="text-slate-800 font-black text-[14px] md:text-[15px]">{t.emptyTitle}</h3>
             <button onClick={onAdd} className="mt-4 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-2 text-[13px]">
               <Plus size={16} strokeWidth={2.5}/> {t.createBtn}
             </button>
          </div>
        )}

        <div className="grid gap-3">
          {assignments.map((a, index) => {
            const isLastElement = index === assignments.length - 1;
            const now = new Date();
            const openDate = a.openAt?.seconds ? new Date(a.openAt.seconds * 1000) : null;
            const dueDate = a.dueAt?.seconds ? new Date(a.dueAt.seconds * 1000) : null;
            
            let status: 'scheduled' | 'active' | 'closed' = 'active';
            if (openDate && now < openDate) status = 'scheduled';
            else if (dueDate && now > dueDate) status = 'closed';

            const statusUI = {
              scheduled: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600', icon: <Clock size={16}/> },
              active: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', icon: <Play size={16}/> },
              closed: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500', icon: <Lock size={16}/> }
            };

            const targetRequired = Array.isArray(a.assignedTo) ? a.assignedTo.length : safeRosterSize;
            const submittedCount = (a.completedBy || []).length;
            const percent = targetRequired > 0 ? (submittedCount / targetRequired) * 100 : 0;

            return (
              <div 
                key={a.id} 
                ref={isLastElement ? lastElementRef : null}
                onClick={() => setSubmissionsData({ assignment: a, targetRequired, submittedCount, percent })}
                className="bg-white rounded-2xl md:rounded-[1.2rem] border border-slate-200/80 p-4 hover:border-slate-300 hover:shadow-sm transition-all duration-200 cursor-pointer group flex flex-col md:flex-row md:items-center gap-4 active:scale-[0.98] md:active:scale-100"
              >
                <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 border ${statusUI[status].bg} ${statusUI[status].border} ${statusUI[status].text}`}>
                    {statusUI[status].icon}
                  </div>
                  
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2">
                       <h3 className="font-bold text-[14px] md:text-[15px] text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                         {a.testTitle || 'Untitled Assignment'}
                       </h3>
                       <span className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${statusUI[status].bg} ${statusUI[status].text}`}>
                         {t.status[status]}
                       </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] md:text-[12px] font-bold text-slate-500">
                      {dueDate ? (
                        <span className={`flex items-center gap-1 ${status === 'closed' ? 'text-red-500' : ''}`}>
                          <Calendar size={12}/> {t.status.due} {dueDate.toLocaleDateString([], {month: 'short', day: 'numeric'})}
                        </span>
                      ) : <span className="text-slate-400">{t.status.noDeadline}</span>}
                      <span className="text-slate-300 hidden sm:block">•</span>
                      <span>
                         {Array.isArray(a.assignedTo) ? t.assignees.count.replace("{n}", a.assignedTo.length.toString()) : t.assignees.all}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 pl-14 md:pl-0">
                   <div className="flex flex-col w-32 shrink-0">
                     <div className="flex justify-between items-end mb-1.5">
                        <span className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest">{submittedCount}/{targetRequired} {t.progress.submitted}</span>
                        <span className={`text-[10px] md:text-[11px] font-black ${percent === 100 ? 'text-emerald-500' : 'text-slate-700'}`}>{Math.round(percent)}%</span>
                     </div>
                     <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${percent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${percent}%` }}></div>
                     </div>
                   </div>

                   <div className="flex items-center gap-1 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); onEdit(a); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors active:scale-95" title="Edit"><Edit2 size={14} strokeWidth={2.5}/></button>
                      <button onClick={(e) => handleCopyLink(e, a.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors active:scale-95" title="Copy Link"><Copy size={14} strokeWidth={2.5}/></button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteData(a); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors active:scale-95" title="Delete"><Trash2 size={14} strokeWidth={2.5}/></button>
                   </div>
                </div>
              </div>
            )
          })}
          
          {loadingMore && (
            <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={24}/></div>
          )}
        </div>
      </div>

      {/* --- DANGER ZONE MODAL (PORTAL) --- */}
      {mounted && deleteData && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setDeleteData(null)}></div>
          <div className="relative bg-white rounded-[2rem] w-full max-w-sm p-6 md:p-8 shadow-2xl animate-in zoom-in-95 fade-in text-center border border-slate-100">
             <div className="w-14 h-14 bg-red-50 text-red-500 rounded-[1.2rem] flex items-center justify-center mb-5 mx-auto"><AlertTriangle size={24} strokeWidth={2.5}/></div>
             <h3 className="text-[18px] font-black text-slate-900 mb-2">{t.modals.deleteTitle}</h3>
             <p className="text-[13px] text-slate-500 font-medium mb-6 leading-relaxed">{t.modals.deleteDesc.replace("{title}", deleteData.testTitle)}</p>
             <div className="flex flex-col-reverse sm:flex-row gap-3">
               <button onClick={() => setDeleteData(null)} className="w-full py-3.5 text-[13px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200/80 active:scale-95">{t.modals.cancel}</button>
               <button onClick={handleDeleteConfirm} className="w-full py-3.5 text-[13px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-600/20 active:scale-95 transition-all">{t.modals.confirmDelete}</button>
             </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- SUBMISSIONS MODAL --- */}
      {submissionsData && (
        <AssignmentSubmissionsModal 
          data={submissionsData} 
          onClose={() => setSubmissionsData(null)} 
          roster={roster} 
          classId={classId} 
          t={t} 
        />
      )}
    </>
  );
}

// ============================================================================
// 🟢 3. SUBMISSIONS MODAL (With Caching & Safe Profile Pics & Portal)
// ============================================================================
function AssignmentSubmissionsModal({ data, onClose, roster, classId, t }: any) {
  const router = useRouter();
  const { assignment, targetRequired, submittedCount, percent } = data;
  
  // 🟢 SSR HYDRATION FIX FOR PORTAL
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [localRoster, setLocalRoster] = useState<any[]>(roster);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'submitted' | 'pending'>('submitted');

  useEffect(() => {
    const fetchData = async () => {
      const cached = globalSubmissionsCache[assignment.id];
      const now = Date.now();

      // Cache Hit: Open results instantly!
      if (cached && (now - cached.timestamp < CACHE_LIFESPAN)) {
        setAttempts(cached.attempts);
        setLocalRoster(prev => {
          const newProfiles = cached.missingProfiles.filter((p: any) => !prev.find(r => r.uid === p.uid));
          return [...prev, ...newProfiles];
        });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const q = query(collection(db, 'attempts'), where('classId', '==', classId), where('assignmentId', '==', assignment.id));
        const snap = await getDocs(q);
        const fetchedAttempts = snap.docs.map(d => d.data());
        setAttempts(fetchedAttempts);

        // 🟢 100k-Ready: Safe Promise Chunking for Missing Profiles
        const missingIds = (assignment.completedBy || []).filter((uid: string) => !localRoster.find(r => r.uid === uid));
        const missingProfiles: any[] = [];
        
        if (missingIds.length > 0) {
          for (let i = 0; i < missingIds.length; i += 10) {
            const chunk = missingIds.slice(i, i + 10);
            const userQ = query(collection(db, 'users'), where('uid', 'in', chunk));
            const userSnap = await getDocs(userQ);
            userSnap.forEach(d => missingProfiles.push({ uid: d.id, ...d.data() }));
          }
          setLocalRoster(prev => [...prev, ...missingProfiles]);
        }

        // Save to cache
        globalSubmissionsCache[assignment.id] = {
          attempts: fetchedAttempts,
          missingProfiles: missingProfiles,
          timestamp: Date.now()
        };

      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [assignment]);

  const targetStudents = useMemo(() => {
    if (Array.isArray(assignment.assignedTo)) return localRoster.filter(r => assignment.assignedTo.includes(r.uid));
    return localRoster;
  }, [assignment, localRoster]);

  const submittedList = useMemo(() => {
    const list = targetStudents.filter(r => (assignment.completedBy || []).includes(r.uid));
    return list.sort((a, b) => {
      const aAtt = attempts.find(x => x.userId === a.uid);
      const bAtt = attempts.find(x => x.userId === b.uid);
      const aScore = aAtt && aAtt.totalQuestions > 0 ? aAtt.score / aAtt.totalQuestions : -1;
      const bScore = bAtt && bAtt.totalQuestions > 0 ? bAtt.score / bAtt.totalQuestions : -1;
      return bScore - aScore;
    });
  }, [targetStudents, assignment, attempts]);

  const pendingList = useMemo(() => targetStudents.filter(r => !(assignment.completedBy || []).includes(r.uid)), [targetStudents, assignment]);
  const displayList = activeTab === 'submitted' ? submittedList : pendingList;

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-6">
      {/* OVERLAY */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      {/* 🟢 ULTRA MINIMALISTIC MOBILE-FIRST MODAL */}
      <div className="relative bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-lg h-[90vh] sm:h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 fade-in duration-300 border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 md:p-8 border-b border-slate-100 flex items-start justify-between shrink-0 bg-white/90 backdrop-blur-md z-20 shadow-sm">
          <div className="flex-1 pr-4 min-w-0">
            <h2 className="text-[16px] md:text-[18px] font-black text-slate-900 leading-tight mb-3 truncate">{assignment.testTitle}</h2>
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 md:p-4">
              <div className="flex justify-between items-end mb-2">
                <span className="text-slate-500 text-[10px] md:text-[11px] font-bold uppercase tracking-widest">{submittedCount}/{targetRequired} {t.progress.submitted}</span>
                <span className="text-[12px] md:text-[13px] font-black text-indigo-600">{Math.round(percent)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${percent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${percent}%` }}></div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 md:w-9 md:h-9 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-full flex items-center justify-center text-slate-400 transition-colors shrink-0 active:scale-95"><X size={18} strokeWidth={2.5}/></button>
        </div>

        {/* Segmented Tabs */}
        <div className="px-5 md:px-8 py-3 md:py-4 bg-[#FAFAFA] shrink-0 z-10 border-b border-slate-100">
          <div className="flex p-1 bg-slate-200/60 rounded-xl shadow-inner border border-slate-200/50">
            <button onClick={() => setActiveTab('submitted')} className={`flex-1 py-2 text-[11px] md:text-[12px] font-bold rounded-lg transition-all ${activeTab === 'submitted' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}>
              {t.submissions.submitted} ({submittedCount})
            </button>
            <button onClick={() => setActiveTab('pending')} className={`flex-1 py-2 text-[11px] md:text-[12px] font-bold rounded-lg transition-all ${activeTab === 'pending' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}>
              {t.submissions.pending} ({targetRequired - submittedCount})
            </button>
          </div>
        </div>

        {/* List */}
        {/* Added pb-[env(safe-area-inset-bottom)] for iOS devices */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-[#FAFAFA] custom-scrollbar">
          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={28}/></div>
          ) : displayList.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-slate-400 gap-3 border-2 border-dashed border-slate-200/80 rounded-[1.5rem] bg-white shadow-sm">
              <CheckCircle size={32} className="opacity-30"/>
              <p className="font-bold text-[12px] md:text-[13px]">{activeTab === 'submitted' ? t.submissions.emptySub : t.submissions.emptyPend}</p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {displayList.map((student, idx) => {
                const attempt = attempts.find(a => a.userId === student.uid);
                const scoreP = attempt && attempt.totalQuestions > 0 ? Math.round((attempt.score / attempt.totalQuestions) * 100) : 0;
                const avatarUrl = student.photoURL || student.photoUrl || student.avatar || null;
                
                let rankColor = '#94A3B8'; // default slate-400
                if (activeTab === 'submitted') {
                  if (idx === 0) rankColor = '#F59E0B'; // amber-500
                  else if (idx === 1) rankColor = '#94A3B8'; // slate-400
                  else if (idx === 2) rankColor = '#D97706'; // amber-600
                }

                return (
                  <div 
                    key={student.uid} 
                    onClick={() => {
                      onClose(); 
                      router.push(`/teacher/students/${student.uid}`); 
                    }}
                    className="flex items-center gap-2.5 md:gap-3 p-3.5 md:p-4 bg-white border border-slate-200/80 rounded-2xl md:rounded-[1.2rem] shadow-sm hover:border-indigo-300 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer group"
                  >
                    {activeTab === 'submitted' && (
                       <span style={{ color: rankColor }} className="font-black text-[12px] md:text-[13px] w-5 text-center shrink-0">#{idx + 1}</span>
                    )}
                    
                    {/* 🟢 Safe Profile Picture Implementation */}
                    <div className="w-9 h-9 md:w-10 md:h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-500 text-[13px] md:text-[14px] shrink-0 border border-slate-200 overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        student.displayName?.[0]?.toUpperCase() || <UserIcon size={16} strokeWidth={3}/>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-black text-slate-900 text-[13px] md:text-[14px] truncate group-hover:text-indigo-600 transition-colors">{student.displayName}</p>
                      <p className="text-[10px] md:text-[11px] font-bold text-slate-400 truncate">@{student.username || 'student'}</p>
                    </div>
                    {activeTab === 'submitted' && attempt ? (
                      <div className="text-right shrink-0">
                        <p className={`font-black text-[15px] md:text-[16px] leading-none ${scoreP >= 60 ? 'text-emerald-500' : 'text-red-500'}`}>{scoreP}%</p>
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{attempt.score}/{attempt.totalQuestions} {t.submissions.correct}</p>
                      </div>
                    ) : activeTab === 'pending' ? (
                      <span className="bg-slate-100 text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md shrink-0">{t.submissions.pending}</span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
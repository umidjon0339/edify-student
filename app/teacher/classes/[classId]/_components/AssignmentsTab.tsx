'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, limit } from 'firebase/firestore'; // 🟢 Added limit
import { 
  FileText, Calendar, Clock, Trash2, Users, Edit2, Plus, 
  Copy, AlertTriangle, AlertCircle, Search, X, ChevronDown // 🟢 Added ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTeacherLanguage } from '@/app/teacher/layout'; // 🟢 Import Hook

// --- 1. TRANSLATION DICTIONARY ---
const ASSIGN_TAB_TRANSLATIONS = {
  uz: {
    emptyTitle: "Hozircha topshiriqlar yo'q",
    createBtn: "Topshiriq Yaratish",
    loadMore: "Yana 10 ta yuklash", // 🟢 Added
    status: {
      scheduled: "Rejalashtirilgan",
      active: "Faol",
      closed: "Yopilgan",
      due: "Muddat",
      noDeadline: "Muddat yo'q"
    },
    assignees: {
      all: "Barcha O'quvchilar",
      count: "{n} ta O'quvchi"
    },
    progress: {
      submitted: "Topshirildi",
      missing: "Topshirilmagan"
    },
    toasts: {
      deleted: "Topshiriq o'chirildi",
      failDelete: "O'chirib bo'lmadi",
      copied: "Havola nusxalandi!"
    },
    modals: {
      deleteTitle: "Topshiriqni o'chirasizmi?",
      deleteDesc: "Haqiqatan ham \"{title}\"ni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.",
      cancel: "Bekor qilish",
      confirmDelete: "Ha, O'chirish",
      searchPlace: "O'quvchilarni qidirish..."
    }
  },
  en: {
    emptyTitle: "No assignments yet",
    createBtn: "Create Assignment",
    loadMore: "Load Next 10", // 🟢 Added
    status: {
      scheduled: "Scheduled",
      active: "Active",
      closed: "Closed",
      due: "Due",
      noDeadline: "No Deadline"
    },
    assignees: {
      all: "All Students",
      count: "{n} Assignees"
    },
    progress: {
      submitted: "Submitted",
      missing: "Missing"
    },
    toasts: {
      deleted: "Assignment deleted",
      failDelete: "Could not delete",
      copied: "Link copied!"
    },
    modals: {
      deleteTitle: "Delete Assignment?",
      deleteDesc: "Are you sure you want to delete \"{title}\"? This cannot be undone.",
      cancel: "Cancel",
      confirmDelete: "Yes, Delete",
      searchPlace: "Search students..."
    }
  },
  ru: {
    emptyTitle: "Заданий пока нет",
    createBtn: "Создать Задание",
    loadMore: "Загрузить еще 10", // 🟢 Added
    status: {
      scheduled: "Запланировано",
      active: "Активно",
      closed: "Закрыто",
      due: "Срок",
      noDeadline: "Без срока"
    },
    assignees: {
      all: "Все Ученики",
      count: "{n} Учеников"
    },
    progress: {
      submitted: "Сдано",
      missing: "Отсутствует"
    },
    toasts: {
      deleted: "Задание удалено",
      failDelete: "Не удалось удалить",
      copied: "Ссылка скопирована!"
    },
    modals: {
      deleteTitle: "Удалить Задание?",
      deleteDesc: "Вы уверены, что хотите удалить \"{title}\"? Это действие нельзя отменить.",
      cancel: "Отмена",
      confirmDelete: "Да, Удалить",
      searchPlace: "Поиск учеников..."
    }
  }
};

interface Props {
  classId: string;
  roster?: any[]; 
  onEdit: (assignment: any) => void;
  onAdd: () => void;
}

export default function AssignmentsTab({ classId, roster = [], onEdit, onAdd }: Props) {
  const { lang } = useTeacherLanguage();
  const t = ASSIGN_TAB_TRANSLATIONS[lang];

  const [assignments, setAssignments] = useState<any[]>([]);
  const [deleteData, setDeleteData] = useState<any>(null);
  const [progressData, setProgressData] = useState<any>(null);

  // 🟢 Pagination State
  const [fetchLimit, setFetchLimit] = useState(10);
  const [hasMore, setHasMore] = useState(true);

  // 🟢 Optimized useEffect with dynamic limits
  useEffect(() => {
    const qAssign = query(
      collection(db, 'classes', classId, 'assignments'), 
      orderBy('createdAt', 'desc'),
      limit(fetchLimit)
    );
    
    const unsubscribe = onSnapshot(qAssign, (snap) => {
      setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      // Determine if there are more assignments to load
      setHasMore(snap.docs.length >= fetchLimit);
    });
    
    return () => unsubscribe();
  }, [classId, fetchLimit]);

  const handleDeleteConfirm = async () => {
    if (!deleteData) return;
    try {
      await deleteDoc(doc(db, 'classes', classId, 'assignments', deleteData.id));
      toast.success(t.toasts.deleted);
      setDeleteData(null);
    } catch (e) { toast.error(t.toasts.failDelete); }
  };

  const handleCopyLink = (assignmentId: string) => {
    const link = `${window.location.origin}/classes/${classId}/test/${assignmentId}`;
    navigator.clipboard.writeText(link);
    toast.success(t.toasts.copied);
  };

  const openProgress = (assignment: any) => {
    const submittedIds = assignment.completedBy || [];
    setProgressData({ assignment, submittedIds });
  };

  return (
    <>
      <div className="space-y-4">
        {assignments.length === 0 && (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm text-slate-300">
               <FileText size={32} />
             </div>
             <h3 className="text-slate-600 font-bold text-lg">{t.emptyTitle}</h3>
             <button onClick={onAdd} className="mt-4 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg flex items-center gap-2">
               <Plus size={18} /> {t.createBtn}
             </button>
          </div>
        )}

        <div className="grid gap-4">
          {assignments.map(a => {
            const now = new Date();
            const openDate = a.openAt?.seconds ? new Date(a.openAt.seconds * 1000) : null;
            const dueDate = a.dueAt?.seconds ? new Date(a.dueAt.seconds * 1000) : null;
            
            let status: 'scheduled' | 'active' | 'closed' = 'active';
            if (openDate && now < openDate) status = 'scheduled';
            else if (dueDate && now > dueDate) status = 'closed';

            const targetStudentIds = Array.isArray(a.assignedTo) ? a.assignedTo : roster.map(r => r.uid);
            const totalRequired = targetStudentIds.length;
            const submittedCount = (a.completedBy || []).length;
            const percent = totalRequired > 0 ? Math.round((submittedCount / totalRequired) * 100) : 0;

            return (
              <div key={a.id} className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all shadow-sm group relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  status === 'active' ? 'bg-green-500' : status === 'scheduled' ? 'bg-amber-400' : 'bg-slate-300'
                }`}></div>

                <div className="flex flex-col sm:flex-row justify-between gap-6 pl-3">
                  <div className="flex gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                      status === 'active' ? 'bg-green-50 border-green-100 text-green-600' : 
                      status === 'scheduled' ? 'bg-amber-50 border-amber-100 text-amber-600' : 
                      'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                      {status === 'scheduled' ? <Clock size={22} /> : status === 'closed' ? <AlertCircle size={22}/> : <FileText size={22} />}
                    </div>

                    <div className="w-full">
                      <div className="flex items-center justify-between">
                         <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-700 transition-colors">
                           {a.testTitle}
                         </h3>
                         <span className={`sm:hidden text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                           status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                         }`}>
                           {/* @ts-ignore */}
                           {t.status[status]}
                         </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs font-medium text-slate-500">
                        {dueDate ? (
                          <span className={`flex items-center gap-1 ${status === 'closed' ? 'text-red-500' : 'text-slate-500'}`}>
                             <Calendar size={12}/> {status === 'closed' ? t.status.closed : t.status.due}: {dueDate.toLocaleDateString([], {month: 'short', day: 'numeric'})}
                          </span>
                        ) : <span className="text-green-600">{t.status.noDeadline}</span>}
                        <span className="text-slate-300">|</span>
                        <span>
                          {Array.isArray(a.assignedTo) 
                            ? t.assignees.count.replace("{n}", a.assignedTo.length.toString()) 
                            : t.assignees.all}
                        </span>
                      </div>

                      {/* PROGRESS BAR */}
                      <div 
                        onClick={() => openProgress(a)}
                        className="mt-3 cursor-pointer group/progress"
                      >
                         <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-600 group-hover/progress:text-indigo-600 flex items-center gap-1">
                               <Users size={12}/> {submittedCount}/{totalRequired} {t.progress.submitted}
                            </span>
                            <span className="text-slate-400 group-hover/progress:text-indigo-600">{percent}%</span>
                         </div>
                         <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${percent === 100 ? 'bg-green-500' : 'bg-indigo-600'}`} 
                              style={{ width: `${percent}%` }}
                            ></div>
                         </div>
                      </div>

                    </div>
                  </div>

                  <div className="flex items-start gap-2 border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100 justify-end">
                     <button onClick={() => handleCopyLink(a.id)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Copy Link"><Copy size={18} /></button>
                     <button onClick={() => onEdit(a)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit"><Edit2 size={18} /></button>
                     <button onClick={() => setDeleteData(a)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* 🟢 LOAD MORE BUTTON */}
        {hasMore && assignments.length > 0 && (
          <div className="flex justify-center pt-4 pb-2">
            <button 
              onClick={() => setFetchLimit(prev => prev + 10)}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 font-bold py-3 px-8 rounded-xl shadow-sm transition-all active:scale-95"
            >
              {t.loadMore} <ChevronDown size={18} />
            </button>
          </div>
        )}
      </div>

      {deleteData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteData(null)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
             <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
               <AlertTriangle size={24} />
             </div>
             <h3 className="text-lg font-black text-slate-800 text-center mb-2">{t.modals.deleteTitle}</h3>
             <p className="text-sm text-slate-500 text-center mb-6">
               {t.modals.deleteDesc.replace("{title}", deleteData.testTitle)}
             </p>
             <div className="flex gap-3">
               <button onClick={() => setDeleteData(null)} className="flex-1 py-3 font-bold text-slate-600 hover:bg-slate-100 rounded-xl">{t.modals.cancel}</button>
               <button onClick={handleDeleteConfirm} className="flex-1 py-3 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-200">{t.modals.confirmDelete}</button>
             </div>
          </div>
        </div>
      )}

      {progressData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setProgressData(null)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-md h-[70vh] flex flex-col shadow-2xl animate-in zoom-in-95">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <div><h3 className="font-bold text-slate-800">{progressData.assignment.testTitle}</h3></div>
                <button onClick={() => setProgressData(null)}><X size={20}/></button>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <div className="relative mb-4">
                   <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                   <input disabled placeholder={t.modals.searchPlace} className="w-full pl-9 py-2 text-sm bg-slate-100 rounded-lg border-transparent focus:bg-white focus:ring-2 ring-indigo-500 outline-none transition-all"/>
                </div>

                {roster.map(student => {
                   const isAssigned = Array.isArray(progressData.assignment.assignedTo) 
                      ? progressData.assignment.assignedTo.includes(student.uid) : true;
                   if (!isAssigned) return null;

                   const hasSubmitted = progressData.submittedIds.includes(student.uid);

                   return (
                      <div key={student.uid} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                               {student.displayName?.[0] || 'S'}
                            </div>
                            <p className="text-sm font-bold text-slate-700">{student.displayName}</p>
                         </div>
                         {hasSubmitted ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">{t.progress.submitted}</span>
                         ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full">{t.progress.missing}</span>
                         )}
                      </div>
                   );
                })}
             </div>
          </div>
        </div>
      )}
    </>
  );
}
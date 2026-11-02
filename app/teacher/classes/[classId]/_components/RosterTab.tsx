'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayRemove, collection, query, getDocs, orderBy } from 'firebase/firestore';
import { Trash2, UserX, ChevronRight, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { Spinner, EmptyState } from '@/components/ui';
import StudentDetailsModal from './StudentDetailsModal';
import ConfirmDialog from './ConfirmDialog';
import { useTeacherLanguage } from '@/app/teacher/layout';

// ============================================================================
// 🟢 1. GLOBAL CACHE (Survives Tab Switches, 0 Reads on Back Navigation)
// ============================================================================
const globalRosterCache: Record<string, { 
  students: any[], 
  assignments: any[],
  page: number, 
  hasMore: boolean, 
  timestamp: number 
}> = {};

const CACHE_LIFESPAN = 60 * 1000; // 60 seconds

// --- TRANSLATION DICTIONARY ---
const ROSTER_TRANSLATIONS: any = {
  uz: { loading: "Jurnal yuklanmoqda...", empty: "Bu sinfda hali o'quvchilar yo'q.", unknown: "Noma'lum", deleted: "o'chirilgan", confirmRemove: "Bu o'quvchini sinfdan o'chirasizmi?", confirmTitle: "O'quvchini o'chirish", confirmBtn: "O'chirish", cancelBtn: "Bekor qilish", removed: "O'quvchi o'chirildi", errRemove: "O'quvchini o'chirishda xatolik", errLoad: "Sinf ma'lumotlarini yuklab bo'lmadi", hint: "Baholarni ko'rish uchun bosing", details: "Batafsil", removeBtn: "Sinfdan o'chirish" },
  en: { loading: "Loading roster...", empty: "No students in this class yet.", unknown: "Unknown", deleted: "deleted", confirmRemove: "Remove this student from the class?", confirmTitle: "Remove student", confirmBtn: "Remove", cancelBtn: "Cancel", removed: "Student removed", errRemove: "Error removing student", errLoad: "Could not load class data", hint: "Click to view grades", details: "Details", removeBtn: "Remove from class" },
  ru: { loading: "Загрузка списка...", empty: "В этом классе пока нет учеников.", unknown: "Неизвестно", deleted: "удален", confirmRemove: "Удалить этого ученика из класса?", confirmTitle: "Удалить ученика", confirmBtn: "Удалить", cancelBtn: "Отмена", removed: "Ученик удален", errRemove: "Ошибка удаления ученика", errLoad: "Не удалось загрузить данные класса", hint: "Нажмите для просмотра оценок", details: "Подробнее", removeBtn: "Удалить из класса" }
};

// "Kamronbek Toshpulatov" -> "KT", "Madina" -> "MA"
const getInitials = (name: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'S';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

interface Props {
  classId: string;
  studentIds: string[];
  /** Center groups: roster is manager-run — hide the remove action (rules deny it anyway). */
  readOnly?: boolean;
  readOnlyHint?: string;
}

const PAGE_SIZE = 10;

export default function RosterTab({ classId, studentIds, readOnly = false, readOnlyHint }: Props) {
  const { lang } = useTeacherLanguage();
  const t = ROSTER_TRANSLATIONS[lang] || ROSTER_TRANSLATIONS['en'];

  // State
  const [students, setStudents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  
  // Pagination State
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // UI State
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Removal confirmation state
  const [removeTarget, setRemoveTarget] = useState<any>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);

  // ============================================================================
  // 🟢 2. SMART FETCHING & CHUNKING LOGIC
  // ============================================================================
  
  useEffect(() => {
    const initializeTab = async () => {
      const cached = globalRosterCache[classId];
      const now = Date.now();

      if (cached) {
        setStudents(cached.students);
        setAssignments(cached.assignments);
        setPage(cached.page);
        setHasMore(cached.hasMore);
        setLoadingInitial(false);

        // If cache is fresh, do nothing. If stale, fetch silently.
        if (now - cached.timestamp < CACHE_LIFESPAN) return;
        revalidateLoadedData(cached.page);
      } else {
        setLoadingInitial(true);
        await Promise.all([fetchAssignments(), loadStudentsPage(0)]);
      }
    };

    initializeTab();
  }, [classId]);

  // Sync state if a student is removed from the parent array via another tab
  useEffect(() => {
    setStudents(prev => {
      const updated = prev.filter(s => studentIds.includes(s.uid));
      if (globalRosterCache[classId]) globalRosterCache[classId].students = updated;
      return updated;
    });
  }, [studentIds, classId]);

  const fetchAssignments = async () => {
    try {
      const q = query(collection(db, 'classes', classId, 'assignments'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAssignments(data);
      if (globalRosterCache[classId]) globalRosterCache[classId].assignments = data;
      return data;
    } catch (e) { console.error("Assignments Error", e); return []; }
  };

  const loadStudentsPage = async (pageIndex: number) => {
    const startIndex = pageIndex * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    const idsToFetch = studentIds.slice(startIndex, endIndex);

    if (idsToFetch.length === 0) {
      setHasMore(false);
      setLoadingInitial(false);
      return;
    }

    if (pageIndex > 0) setLoadingMore(true);

    try {
      const promises = idsToFetch.map(uid => getDoc(doc(db, 'users', uid)));
      const snaps = await Promise.all(promises);
      
      const loadedStudents = snaps.map((snap, index) => {
        if (snap.exists()) return { uid: snap.id, ...snap.data() };
        return { uid: idsToFetch[index], displayName: t.unknown, username: t.deleted, isDeleted: true };
      });

      setStudents(prev => {
        const newState = pageIndex === 0 ? loadedStudents : [...prev, ...loadedStudents.filter(s => !prev.find(p => p.uid === s.uid))];
        const stillHasMore = endIndex < studentIds.length;
        
        globalRosterCache[classId] = {
          students: newState,
          assignments: assignments,
          page: pageIndex,
          hasMore: stillHasMore,
          timestamp: Date.now()
        };

        setHasMore(stillHasMore);
        return newState;
      });
    } catch (e) { toast.error(t.errLoad); } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  };

  const revalidateLoadedData = async (currentPage: number) => {
    try {
      const newAssignments = await fetchAssignments();
      
      const totalLoaded = (currentPage + 1) * PAGE_SIZE;
      const idsToRefetch = studentIds.slice(0, totalLoaded);
      if (idsToRefetch.length === 0) return;

      const CHUNK_SIZE = 10;
      const freshStudents: any[] = [];

      for (let i = 0; i < idsToRefetch.length; i += CHUNK_SIZE) {
        const chunkIds = idsToRefetch.slice(i, i + CHUNK_SIZE);
        const promises = chunkIds.map(uid => getDoc(doc(db, 'users', uid)));
        const snaps = await Promise.all(promises);
        
        const chunkStudents = snaps.map((snap, index) => {
          if (snap.exists()) return { uid: snap.id, ...snap.data() };
          return { uid: chunkIds[index], displayName: t.unknown, username: t.deleted, isDeleted: true };
        });

        freshStudents.push(...chunkStudents);
      }

      setStudents(freshStudents);
      globalRosterCache[classId] = {
        students: freshStudents,
        assignments: newAssignments,
        page: currentPage,
        hasMore: hasMore,
        timestamp: Date.now()
      };
    } catch (e) { console.error("Silent revalidation failed", e); }
  };

  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingInitial || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => {
          const next = prev + 1;
          loadStudentsPage(next);
          return next;
        });
      }
    }, { threshold: 0.5 });

    if (node) observerRef.current.observe(node);
  }, [loadingInitial, loadingMore, hasMore, studentIds]);

  const handleShowDetails = (student: any) => {
    if (student.isDeleted) return;
    setSelectedStudent(student);
    setIsDetailsOpen(true);
  };

  const handleRemoveClick = (e: React.MouseEvent, student: any) => {
    e.stopPropagation();
    setRemoveError(null);
    setRemoveTarget(student);
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setRemoveError(null);
    try {
      await updateDoc(doc(db, 'classes', classId), { studentIds: arrayRemove(removeTarget.uid) });
      toast.success(t.removed);
      setRemoveTarget(null);
    } catch (e) {
      setRemoveError(t.errRemove);
    }
  };

  // --- 3. RENDER (Elegant Teacher UI Preserved) ---
  if (loadingInitial && students.length === 0) {
    return <div className="py-16 flex items-center justify-center"><Spinner size={28}/></div>;
  }

  if (students.length === 0) {
    return (
      <div className="t-glass-card rounded-m3-xl">
        <EmptyState icon={<Users />} title={t.empty} className="py-14 md:py-16" />
      </div>
    );
  }

  return (
    <>
      <StudentDetailsModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} student={selectedStudent} assignments={assignments} classId={classId} />

      <ConfirmDialog
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={confirmRemove}
        title={t.confirmTitle}
        message={t.confirmRemove}
        confirmLabel={t.confirmBtn}
        cancelLabel={t.cancelBtn}
        error={removeError}
        subject={
          removeTarget && (
            <>
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-[12px] bg-surface-container-highest text-on-surface-variant">
                {(removeTarget.photoURL || removeTarget.photoUrl || removeTarget.avatar) ? (
                  <img src={removeTarget.photoURL || removeTarget.photoUrl || removeTarget.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(removeTarget.displayName)
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[14px] text-on-surface truncate">{removeTarget.displayName}</p>
                <p className="text-[12px] font-medium text-on-surface-variant truncate">@{removeTarget.username || 'student'}</p>
              </div>
            </>
          )
        }
      />

      <div className="space-y-2">
        {readOnly && readOnlyHint && (
          <div className="t-glass-card flex items-center gap-2.5 p-3 rounded-m3-lg">
            <Users size={16} className="text-on-surface-variant shrink-0" />
            <p className="text-[12px] font-semibold text-on-surface-variant leading-snug">{readOnlyHint}</p>
          </div>
        )}
        {students.map((student, index) => {
          const isLastElement = index === students.length - 1;
          const photo = student.photoURL || student.photoUrl || student.avatar;

          return (
            <div
              key={student.uid}
              ref={isLastElement ? lastElementRef : null}
              role={!student.isDeleted ? 'button' : undefined}
              tabIndex={!student.isDeleted ? 0 : undefined}
              onClick={() => handleShowDetails(student)}
              onKeyDown={(e) => { if (!student.isDeleted && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleShowDetails(student); } }}
              className={`t-glass-card group flex items-center gap-3 p-3 md:p-4 rounded-m3-lg transition-all ${
                student.isDeleted
                  ? 'opacity-70'
                  : 'cursor-pointer hover:shadow-elev-2 hover:-translate-y-0.5 active:scale-[0.99] outline-none focus-visible:ring-2 focus-visible:ring-primary'
              }`}
            >
              {/* Number */}
              <span className="text-[12px] font-semibold text-on-surface-variant tabular-nums w-5 text-center shrink-0">{index + 1}</span>

              {/* Avatar */}
              <div className="t-icon-chip-soft relative w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-[13px]">
                {student.isDeleted ? (
                  <UserX size={18} className="text-on-surface-variant" />
                ) : (
                  <>
                    {getInitials(student.displayName)}
                    {/* Initials sit underneath; a dead photo URL hides itself instead of a broken-image icon. */}
                    {photo && <img src={photo} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="absolute inset-0 w-full h-full object-cover" />}
                  </>
                )}
              </div>

              {/* Name + username */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <p className={`font-semibold text-[14px] md:text-[15px] truncate ${student.isDeleted ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                    {student.displayName}
                  </p>
                  {student.isDeleted && (
                    <span className="px-1.5 py-0.5 bg-surface-container-highest text-on-surface-variant text-[10px] font-semibold rounded-m3-xs shrink-0">{t.deleted}</span>
                  )}
                </div>
                <p className="text-[12px] font-medium text-on-surface-variant truncate mt-0.5">@{student.username || 'student'}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {!readOnly && (
                  <button
                    onClick={(e) => handleRemoveClick(e, student)}
                    title={t.removeBtn}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-error-container hover:text-error transition-colors active:scale-95"
                  >
                    <Trash2 size={16} strokeWidth={2.25} />
                  </button>
                )}
                {!student.isDeleted && (
                  <ChevronRight size={18} className="text-outline group-hover:text-on-surface-variant group-hover:translate-x-0.5 transition-all" />
                )}
              </div>
            </div>
          );
        })}

        {loadingMore && (
          <div className="py-4 flex justify-center">
            <Spinner size={22} />
          </div>
        )}
      </div>
    </>
  );
}
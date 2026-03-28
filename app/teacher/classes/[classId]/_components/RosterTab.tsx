'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayRemove, collection, query, getDocs, orderBy } from 'firebase/firestore';
import { Trash2, UserX, ChevronRight, Loader2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import StudentDetailsModal from './StudentDetailsModal';
import { useTeacherLanguage } from '@/app/teacher/layout'; 

// --- TRANSLATION DICTIONARY ---
const ROSTER_TRANSLATIONS = {
  uz: { loading: "Jurnal yuklanmoqda...", empty: "Bu sinfda hali o'quvchilar yo'q.", unknown: "Noma'lum", deleted: "o'chirilgan", confirmRemove: "Bu o'quvchini sinfdan o'chirasizmi?", removed: "O'quvchi o'chirildi", errRemove: "O'quvchini o'chirishda xatolik", errLoad: "Sinf ma'lumotlarini yuklab bo'lmadi", hint: "Baholarni ko'rish uchun bosing", details: "Batafsil", removeBtn: "Sinfdan o'chirish" },
  en: { loading: "Loading roster...", empty: "No students in this class yet.", unknown: "Unknown", deleted: "deleted", confirmRemove: "Remove this student from the class?", removed: "Student removed", errRemove: "Error removing student", errLoad: "Could not load class data", hint: "Click to view grades", details: "Details", removeBtn: "Remove from class" },
  ru: { loading: "Загрузка списка...", empty: "В этом классе пока нет учеников.", unknown: "Неизвестно", deleted: "удален", confirmRemove: "Удалить этого ученика из класса?", removed: "Ученик удален", errRemove: "Ошибка удаления ученика", errLoad: "Не удалось загрузить данные класса", hint: "Нажмите для просмотра оценок", details: "Подробнее", removeBtn: "Удалить из класса" }
};

// 🟢 PREMIUM VIBRANT PALETTE
const STUDENT_COLORS = ['#3B82F6', '#A855F7', '#10B981', '#F59E0B', '#F43F5E', '#06B6D4'];

const getStudentColor = (uid: string) => {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  return STUDENT_COLORS[Math.abs(hash) % STUDENT_COLORS.length];
};

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface Props {
  classId: string;
  studentIds: string[];
}

const PAGE_SIZE = 10;

export default function RosterTab({ classId, studentIds }: Props) {
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

  const observerRef = useRef<IntersectionObserver | null>(null);

  // --- 1. INFINITE SCROLL & FETCHING ARCHITECTURE ---
  const fetchAssignments = async () => {
    try {
      const q = query(collection(db, 'classes', classId, 'assignments'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error("Assignments Error", e); }
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

    if (pageIndex === 0) setLoadingInitial(true);
    else setLoadingMore(true);

    try {
      const promises = idsToFetch.map(uid => getDoc(doc(db, 'users', uid)));
      const snaps = await Promise.all(promises);
      
      const loadedStudents = snaps.map((snap, index) => {
        if (snap.exists()) return { uid: snap.id, ...snap.data() };
        return { uid: idsToFetch[index], displayName: t.unknown, username: t.deleted, isDeleted: true };
      });

      setStudents(prev => {
        if (pageIndex === 0) return loadedStudents;
        const existingUids = new Set(prev.map(s => s.uid));
        const uniques = loadedStudents.filter(s => !existingUids.has(s.uid));
        return [...prev, ...uniques];
      });

      setHasMore(endIndex < studentIds.length);
    } catch (e) {
      toast.error(t.errLoad);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  };

  // Initial Mount
  useEffect(() => {
    fetchAssignments();
    loadStudentsPage(0);
  }, [classId]);

  // Sync state if a student is removed from the parent array via another tab
  useEffect(() => {
    setStudents(prev => prev.filter(s => studentIds.includes(s.uid)));
  }, [studentIds]);

  // Intersection Observer for Infinite Scroll
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

  // --- ACTIONS ---
  const handleShowDetails = (student: any) => {
    if (student.isDeleted) return;
    setSelectedStudent(student);
    setIsDetailsOpen(true);
  };

  const handleRemove = async (e: React.MouseEvent, studentUid: string) => {
    e.stopPropagation(); // Prevents opening the modal when clicking trash
    if (!confirm(t.confirmRemove)) return;
    try {
      await updateDoc(doc(db, 'classes', classId), { studentIds: arrayRemove(studentUid) });
      toast.success(t.removed);
      // Local state is synced automatically by the useEffect above monitoring `studentIds`
    } catch (e) { toast.error(t.errRemove); }
  };

  // --- RENDER ---
  if (loadingInitial && students.length === 0) {
    return <div className="py-12 flex flex-col items-center justify-center gap-3"><Loader2 className="animate-spin text-indigo-500" size={28}/></div>;
  }

  if (students.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4"><Users size={32} className="text-slate-300"/></div>
        <p className="text-[16px] font-black text-slate-700">{t.empty}</p>
      </div>
    );
  }

  return (
    <>
      <StudentDetailsModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} student={selectedStudent} assignments={assignments} classId={classId} />

      <div className="space-y-4">
        {students.map((student, index) => {
          const color = getStudentColor(student.uid);
          const isLastElement = index === students.length - 1;

          // Premium Angled Gradient Match
          const bgGradient = student.isDeleted 
            ? 'linear-gradient(135deg, #FAFAFA 0%, #FAFAFA 100%)' 
            : `linear-gradient(135deg, ${hexToRgba(color, 0.1)} 0%, #FFFFFF 30%, #FFFFFF 100%)`;
          const borderColor = student.isDeleted ? '#F1F5F9' : hexToRgba(color, 0.2);

          return (
            <div 
              key={student.uid} 
              ref={isLastElement ? lastElementRef : null}
              onClick={() => handleShowDetails(student)}
              style={{ background: bgGradient, borderColor: borderColor }}
              className={`p-4 md:p-5 rounded-[1.2rem] border flex items-center justify-between gap-4 group transition-all duration-300 ${!student.isDeleted ? 'cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-0.5' : ''}`}
            >
              
              <div className="flex items-center gap-4 min-w-0">
                <div style={{ color: student.isDeleted ? '#94A3B8' : hexToRgba(color, 0.6) }} className="text-[13px] font-black w-6 text-center shrink-0">
                  {index + 1}
                </div>
                
                {/* Glowing Squircle Avatar */}
                <div 
                  style={{ backgroundColor: student.isDeleted ? '#F1F5F9' : hexToRgba(color, 0.15), borderColor: student.isDeleted ? '#E2E8F0' : hexToRgba(color, 0.3), color: student.isDeleted ? '#94A3B8' : color }} 
                  className="w-12 h-12 rounded-[1rem] border flex items-center justify-center font-black text-[18px] shrink-0"
                >
                  {student.isDeleted ? <UserX size={20}/> : (student.displayName?.[0]?.toUpperCase() || 'S')}
                </div>
                
                <div className="min-w-0 pr-2">
                  <p style={{ color: student.isDeleted ? '#64748B' : '#0F172A' }} className="font-black text-[15px] truncate">
                    {student.isDeleted ? t.deleted : student.displayName}
                  </p>
                  <p style={{ color: student.isDeleted ? '#94A3B8' : '#64748B' }} className="text-[12px] font-bold truncate mt-0.5">
                    @{student.username || 'student'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                
                {/* Trash Button */}
                <button onClick={(e) => handleRemove(e, student.uid)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors z-10" title={t.removeBtn}>
                  <Trash2 size={18} />
                </button>

                {/* Android-Style Tinted Chevron */}
                {!student.isDeleted && (
                  <div style={{ color: hexToRgba(color, 0.5) }} className="w-8 h-8 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                    <ChevronRight size={24} strokeWidth={2.5} />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading More Spinner Indicator */}
        {loadingMore && (
          <div className="py-6 flex justify-center">
            <Loader2 className="animate-spin text-indigo-500" size={24}/>
          </div>
        )}
      </div>
    </>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { 
  ChevronLeft, FileText, BarChart2, LogOut, 
  User, Hash, Calendar, Folder, Loader2, 
  Trophy, Info, X, FileBadge
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Tabs
import AssignmentsTab from './_components/AssignmentsTab';
import MaterialsTab from './_components/MaterialsTab'; 
import GradesTab from './_components/GradesTab'; 
import LeaderboardTab from './_components/LeaderboardTab'; 
import ExamsTab from './_components/ExamsTab'; 
import { useStudentLanguage } from '@/app/(student)/layout';

const globalStudentClassCache: Record<string, { classData: any, timestamp: number }> = {};
const CACHE_LIFESPAN = 60 * 1000; 

const CLASS_TRANSLATIONS: any = {
  uz: {
    back: "Sinflarim", instructor: "O'qituvchi", code: "Kod", created: "Sana",
    tabs: { assignments: "Topshiriqlar", exams: "Imtihonlar", grades: "Baholarim", leaderboard: "Reyting", materials: "Materiallar" },
    info: { title: "Sinf Haqida", leaveDesc: "Sinfdan chiqish sizni ro'yxatdan o'chiradi. Barcha topshiriqlarga kirish imkoniyatini yo'qotasiz.", leaveBtn: "Sinfni Tark Etish" },
    modals: { confirmLeave: "Haqiqatan ham tark etmoqchimisiz?", cancel: "Bekor qilish", confirm: "Ha, Chiqish" },
    toasts: { notFound: "Sinf topilmadi", accessDenied: "Kirish rad etildi", leftSuccess: "Sinfdan chiqdingiz", leftFail: "Chiqishda xatolik yuz berdi" }
  },
  en: {
    back: "Classes", instructor: "Teacher", code: "Code", created: "Created",
    tabs: { assignments: "Assignments", exams: "Exams", grades: "Grades", leaderboard: "Leaderboard", materials: "Materials" },
    info: { title: "Class Info", leaveDesc: "Leaving this class will remove you from the student list. You will lose access to all assignments.", leaveBtn: "Leave Class" },
    modals: { confirmLeave: "Are you sure you want to leave?", cancel: "Cancel", confirm: "Yes, Leave" },
    toasts: { notFound: "Class not found", accessDenied: "Access Denied", leftSuccess: "Left class successfully", leftFail: "Failed to leave" }
  },
  ru: {
    back: "Классы", instructor: "Учитель", code: "Код", created: "Создан",
    tabs: { assignments: "Задания", exams: "Экзамены", grades: "Оценки", leaderboard: "Рейтинг", materials: "Материалы" },
    info: { title: "О классе", leaveDesc: "Выход из класса удалит вас из списка. Вы потеряете доступ ко всем заданиям.", leaveBtn: "Покинуть Класс" },
    modals: { confirmLeave: "Вы уверены, что хотите выйти?", cancel: "Отмена", confirm: "Да, Выйти" },
    toasts: { notFound: "Класс не найден", accessDenied: "Доступ запрещен", leftSuccess: "Вы покинули класс", leftFail: "Не удалось выйти" }
  }
};

export default function StudentClassPage() {
  const { classId } = useParams() as { classId: string };
  const { user } = useAuth();
  const router = useRouter();
  const { lang } = useStudentLanguage();
  const t = CLASS_TRANSLATIONS[lang] || CLASS_TRANSLATIONS['en'];

  const [classData, setClassData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assignments');
  
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (!user) return; 

    const fetchClassInfo = async (silent = false) => {
      const cached = globalStudentClassCache[classId];
      const now = Date.now();

      if (cached && !silent) {
        setClassData(cached.classData);
        setLoading(false);
        if (now - cached.timestamp < CACHE_LIFESPAN) return;
        fetchClassInfo(true);
        return;
      }

      if (!silent) setLoading(true);

      try {
        const classSnap = await getDoc(doc(db, 'classes', classId));
        if (!classSnap.exists()) {
          toast.error(t.toasts.notFound);
          router.push('/classes');
          return;
        }

        const cData = { id: classSnap.id, ...classSnap.data() };
        setClassData(cData);
        globalStudentClassCache[classId] = { classData: cData, timestamp: Date.now() };

      } catch (e: any) {
        if (e.code === 'permission-denied') { toast.error(t.toasts.accessDenied); router.push('/classes'); }
      } finally {
        if (!silent) setLoading(false);
      }
    };

    fetchClassInfo();
  }, [classId, user, router, t]);

  const handleLeaveClass = async () => {
    if (!confirm(t.modals.confirmLeave)) return;
    setIsLeaving(true);
    try {
      await updateDoc(doc(db, 'classes', classId), { studentIds: arrayRemove(user?.uid) });
      delete globalStudentClassCache[classId]; 
      toast.success(t.toasts.leftSuccess); 
      router.push('/classes');
    } catch(e) { 
      toast.error(t.toasts.leftFail); 
      setIsLeaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 pb-28 md:pb-12 font-sans">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pt-8">
         <div className="h-12 w-full max-w-sm bg-zinc-200 rounded-xl animate-pulse"></div>
         <div className="h-16 w-full bg-zinc-200 rounded-[1.5rem] animate-pulse"></div>
         <div className="space-y-4 pt-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-zinc-200 rounded-[1.5rem] border-2 border-zinc-100 animate-pulse"></div>)}</div>
      </div>
    </div>
  );

  if (!classData || !user) return null;

  const TABS = [
    { id: 'assignments', label: t.tabs.assignments, icon: FileText },
    { id: 'exams', label: t.tabs.exams, icon: FileBadge }, 
    { id: 'grades', label: t.tabs.grades, icon: BarChart2 },
    { id: 'leaderboard', label: t.tabs.leaderboard, icon: Trophy },
    { id: 'materials', label: t.tabs.materials, icon: Folder },
  ];

  return (
    <div className="min-h-[100dvh] bg-zinc-50 font-sans pb-28 md:pb-12">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-6 md:pt-10">
        
        {/* HEADER */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link href="/classes" className="w-10 h-10 sm:w-12 sm:h-12 bg-white border-2 border-zinc-200 rounded-xl flex items-center justify-center text-zinc-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-95 shrink-0">
              <ChevronLeft size={20} strokeWidth={3} />
            </Link>
            
            <h1 className="text-[18px] sm:text-[24px] font-black text-zinc-900 tracking-tight truncate max-w-[200px] sm:max-w-sm md:max-w-md">
              {classData.title}
            </h1>
          </div>
          
          <button onClick={() => setIsInfoModalOpen(true)} className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 border-2 border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-all shadow-sm active:scale-95 shrink-0">
            <Info size={20} strokeWidth={3} />
          </button>
        </div>

        {/* 🟢 TABS (Non-scrollable, Fixed Grid) */}
        <div className="relative mb-6 z-40">
          <div className="flex w-full bg-zinc-200/80 rounded-[1.25rem] p-1 shadow-sm border-2 border-white/50 sticky top-0 backdrop-blur-xl">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              // Handle text shortening for mobile
              const shortLabel = tab.id === 'leaderboard' && lang === 'uz' ? 'Reyting' : tab.label;

              return (
                 <button 
                   key={tab.id} 
                   onClick={() => setActiveTab(tab.id)} 
                   className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 flex-1 transition-all duration-200 active:scale-95 rounded-xl ${
                     isActive ? 'text-indigo-700' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-300/50'
                   }`}
                 >
                   {isActive && (
                     <motion.div layoutId="class-tab-bg" className="absolute inset-0 bg-white rounded-xl shadow-sm border-2 border-zinc-200/50" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                   )}
                   <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 w-full">
                     <Icon size={20} strokeWidth={isActive ? 3 : 2.5} className="sm:w-[18px] sm:h-[18px] shrink-0" />
                     <span className={`text-[9px] sm:text-[11px] uppercase tracking-tight sm:tracking-widest truncate px-0.5 ${isActive ? 'font-black' : 'font-bold'}`}>
                       {shortLabel}
                     </span>
                   </div>
                 </button>
              )
            })}
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              
              {activeTab === 'assignments' && <AssignmentsTab classId={classId} />}
              {activeTab === 'exams' && <ExamsTab classId={classId} />} 
              {activeTab === 'grades' && <GradesTab classId={classId} userId={user.uid} />}
              {activeTab === 'leaderboard' && <LeaderboardTab classId={classId} />}
              {activeTab === 'materials' && <MaterialsTab classId={classId} />}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* INFO MODAL */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsInfoModalOpen(false)}></div>
          <div className="relative bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 flex flex-col max-h-[90vh] border-t-2 sm:border-2 border-zinc-100">
            <div className="px-6 py-5 border-b-2 border-zinc-100 flex justify-between items-center bg-white rounded-t-[2rem]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0"><Info size={20} strokeWidth={3}/></div>
                <h2 className="text-[18px] font-black text-zinc-900 tracking-tight">{t.info.title}</h2>
              </div>
              <button onClick={() => setIsInfoModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 border-2 border-zinc-200 rounded-full text-zinc-500 transition-colors"><X size={16} strokeWidth={3}/></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
              {classData.description && (
                 <div className="bg-zinc-50 border-2 border-zinc-100 rounded-xl p-4 mb-2">
                   <p className="text-[13px] font-bold text-zinc-600 leading-relaxed">{classData.description}</p>
                 </div>
              )}
              <div className="flex items-center gap-4 p-3 bg-white rounded-xl border-2 border-zinc-200">
                 <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500 shrink-0"><User size={18} strokeWidth={2.5}/></div>
                 <div className="min-w-0"><p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t.instructor}</p><p className="font-black text-[14px] text-zinc-800 truncate">{classData.teacherName || 'Unknown'}</p></div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-white rounded-xl border-2 border-zinc-200">
                 <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500 shrink-0"><Calendar size={18} strokeWidth={2.5}/></div>
                 <div className="min-w-0"><p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t.created}</p><p className="font-black text-[14px] text-zinc-800 truncate">{classData.createdAt?.seconds ? new Date(classData.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p></div>
              </div>
              <div className="mt-6 pt-6 border-t-2 border-zinc-100">
                <button onClick={handleLeaveClass} disabled={isLeaving} className="w-full py-4 bg-red-50 border-2 border-red-200 border-b-4 text-red-600 font-black rounded-xl hover:border-red-300 hover:bg-red-100 active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2 group">
                  {isLeaving ? <Loader2 size={18} className="animate-spin"/> : <LogOut size={18} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform"/>}
                  {t.info.leaveBtn}
                </button>
                <p className="text-center text-[11px] font-bold text-zinc-400 mt-3">{t.info.leaveDesc}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
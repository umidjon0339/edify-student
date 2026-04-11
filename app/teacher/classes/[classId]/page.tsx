'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc, collection, query } from 'firebase/firestore';
import { 
  Users, UserPlus, Hash, ChevronLeft, Inbox, 
  FileText, UploadCloud, FolderOpen, Loader2, 
  Settings, Lock, Trophy, Plus 
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// Extracted Tabs and Modals
import RosterTab from './_components/RosterTab';
import RequestsTab from './_components/RequestsTab';
import AddStudentModal from './_components/AddStudentModal';
import AssignTestModal from './_components/AssignTestModal';
import AssignmentsTab from './_components/AssignmentsTab';
import MaterialsTab from './_components/MaterialsTab';
import UploadMaterialModal from './_components/UploadMaterialModal';
import ClassSettingsModal from './_components/ClassSettingsModal'; 
import { useTeacherLanguage } from '@/app/teacher/layout';
import LeaderboardTab from './_components/LeaderboardTab';

// --- TRANSLATION DICTIONARY ---
const DETAILS_TRANSLATIONS = {
  uz: {
    back: "Sinflarga", noDesc: "Tavsif berilmagan.", code: "Kod", studentsCount: "O'quvchi", locked: "Qulflangan",
    buttons: { add: "O'quvchi Qo'shish", assign: "Test Biriktirish", upload: "Material Yuklash", settings: "Sozlamalar" },
    tabs: { students: "O'quvchilar", assignments: "Topshiriqlar", materials: "Materiallar", requests: "So'rovlar", leaderboard: "Reyting" },
    loading: "Sinf yuklanmoqda...", unknown: "Noma'lum Foydalanuvchi"
  },
  en: {
    back: "Classes", noDesc: "No description provided.", code: "Code", studentsCount: "Students", locked: "Locked",
    buttons: { add: "Add Student", assign: "Assign Test", upload: "Upload Material", settings: "Settings" },
    tabs: { students: "Students", assignments: "Assignments", requests: "Requests", materials: "Materials", leaderboard: "Leaderboard" },
    loading: "Loading Class...", unknown: "Unknown User"
  },
  ru: {
    back: "Классы", noDesc: "Описание отсутствует.", code: "Код", studentsCount: "Учеников", locked: "Закрыт",
    buttons: { add: "Добавить Ученика", assign: "Назначить Тест", upload: "Загрузить Материал", settings: "Настройки" },
    tabs: { students: "Ученики", assignments: "Задания", requests: "Запросы", materials: "Материалы", leaderboard: "Рейтинг" },
    loading: "Загрузка класса...", unknown: "Неизвестный пользователь"
  }
};

type TabType = 'students' | 'assignments' | 'materials' | 'leaderboard' | 'requests';
const TAB_ORDER: TabType[] = ['students', 'assignments', 'materials', 'leaderboard', 'requests'];

export default function ClassDetailsPage() {
  const { classId } = useParams() as { classId: string };
  const { lang } = useTeacherLanguage();
  const t = DETAILS_TRANSLATIONS[lang] || DETAILS_TRANSLATIONS['en'];

  const [classData, setClassData] = useState<any>(null);
  const [rosterData, setRosterData] = useState<any[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  
  const [activeTab, setActiveTab] = useState<TabType>('students');
  
  // Modals & Menus
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); 
  const [assignmentToEdit, setAssignmentToEdit] = useState<any>(null);

  // Swipe Gesture State
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [touchEnd, setTouchEnd] = useState<{x: number, y: number} | null>(null);
   
  useEffect(() => {
    if (!classId) return;
    const unsubscribe = onSnapshot(doc(db, 'classes', classId), (doc) => {
      if (doc.exists()) setClassData({ id: doc.id, ...doc.data() });
    });
    return () => unsubscribe();
  }, [classId]);

  useEffect(() => {
    if (!classId) return;
    const q = query(collection(db, 'classes', classId, 'requests'));
    const unsubscribe = onSnapshot(q, (snapshot) => setRequestCount(snapshot.size));
    return () => unsubscribe();
  }, [classId]);

  useEffect(() => {
    const fetchRoster = async () => {
      if (!classData?.studentIds || classData.studentIds.length === 0) {
        setRosterData([]); return;
      }
      try {
        const promises = classData.studentIds.map((uid: string) => getDoc(doc(db, 'users', uid)));
        const snapshots = await Promise.all(promises);
        const students = snapshots.map((snap, index) => {
          if (snap.exists()) return { uid: snap.id, ...snap.data() };
          return { uid: classData.studentIds[index], displayName: t.unknown, username: 'unknown' };
        });
        setRosterData(students);
      } catch (error) { console.error(error); } 
    };
    fetchRoster();
  }, [classData?.studentIds, t.unknown]);

  const handleEditAssignment = (assignment: any) => { setAssignmentToEdit(assignment); setIsAssignOpen(true); };
  const handleCreateAssignment = () => { setAssignmentToEdit(null); setIsAssignOpen(true); };

  // --- NATIVE SWIPE LOGIC ---
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    
    // Ensure it's a horizontal swipe (X distance greater than Y distance) and passes a 40px threshold
    if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > 40) {
      const currentIndex = TAB_ORDER.indexOf(activeTab);
      // Swipe Left -> Go to next tab
      if (distanceX > 0 && currentIndex < TAB_ORDER.length - 1) setActiveTab(TAB_ORDER[currentIndex + 1]);
      // Swipe Right -> Go to previous tab
      if (distanceX < 0 && currentIndex > 0) setActiveTab(TAB_ORDER[currentIndex - 1]);
    }
  };

  if (!classData) {
    return (
      <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={32}/>
        <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest">{t.loading}</p>
      </div>
    );
  }

  const TABS_CONFIG = [
    { id: 'students', label: t.tabs.students, icon: Users, badge: 0 },
    { id: 'assignments', label: t.tabs.assignments, icon: FileText, badge: 0 },
    { id: 'materials', label: t.tabs.materials, icon: FolderOpen, badge: 0 },
    { id: 'leaderboard', label: t.tabs.leaderboard, icon: Trophy, badge: 0 }, 
    { id: 'requests', label: t.tabs.requests, icon: Inbox, badge: requestCount }
  ];

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col relative">
      
      {/* --- MODALS --- */}
      <AddStudentModal classId={classId} isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <AssignTestModal classId={classId} isOpen={isAssignOpen} onClose={() => setIsAssignOpen(false)} roster={rosterData} editData={assignmentToEdit} />
      <UploadMaterialModal classId={classId} isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
      <ClassSettingsModal classId={classId} classData={classData} isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} /> 

      {/* --- PLUS ACTION MENU OVERLAY --- */}
      <AnimatePresence>
        {isPlusMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm"
              onClick={() => setIsPlusMenuOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-[60px] md:top-[70px] right-4 md:right-8 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 w-56 p-2 flex flex-col gap-1 origin-top-right"
            >
              <button onClick={() => { setIsAssignOpen(true); setIsPlusMenuOpen(false); }} className="flex items-center gap-3 px-3 py-3 hover:bg-indigo-50 rounded-xl transition-colors text-slate-700 hover:text-indigo-700 w-full text-left">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0"><FileText size={16} strokeWidth={2.5}/></div>
                <span className="font-bold text-[13px]">{t.buttons.assign}</span>
              </button>
              <button onClick={() => { setIsUploadOpen(true); setIsPlusMenuOpen(false); }} className="flex items-center gap-3 px-3 py-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 hover:text-slate-900 w-full text-left">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><UploadCloud size={16} strokeWidth={2.5}/></div>
                <span className="font-bold text-[13px]">{t.buttons.upload}</span>
              </button>
              <div className="h-px bg-slate-100 my-1 mx-2"></div>
              <button onClick={() => { setIsAddOpen(true); setIsPlusMenuOpen(false); }} className="flex items-center gap-3 px-3 py-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 hover:text-slate-900 w-full text-left">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><UserPlus size={16} strokeWidth={2.5}/></div>
                <span className="font-bold text-[13px]">{t.buttons.add}</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🟢 ULTRA MINIMALISTIC HEADER */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-3 md:px-6 py-2.5 md:py-3 flex justify-between items-center shadow-sm shrink-0">

        {/* Left Side: Back Button & Class Info */}
        <div className="flex items-center gap-2.5 md:gap-4 min-w-0">
          <Link href="/teacher/classes" className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm transition-all shrink-0" title={t.back}>
            <ChevronLeft size={18} strokeWidth={2.5} />
          </Link>

          <div className="w-px h-5 bg-slate-200 hidden md:block shrink-0"></div>

          <div className="flex flex-col justify-center min-w-0">
            <h1 className="text-[15px] md:text-[18px] font-black text-slate-900 tracking-tight truncate max-w-[160px] sm:max-w-xs md:max-w-sm">
              {classData.title}
            </h1>
            
            {/* Compact Badges */}
            <div className="flex items-center gap-1.5 mt-0.5">
              {classData.isLocked && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-50 border border-red-100 rounded-md text-[9px] md:text-[10px] font-black text-red-600 tracking-widest uppercase shadow-sm">
                  <Lock size={10} strokeWidth={3}/> {t.locked}
                </span>
              )}
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 border border-slate-200/60 rounded-md text-[9px] md:text-[10px] font-black text-slate-600 tracking-widest uppercase shadow-inner">
                <Hash size={10} className="text-indigo-400"/> {classData.joinCode}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Global Action (+) & Settings */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Main Action Button (+) */}
          <button 
            onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)} 
            className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl transition-all shadow-sm active:scale-95 shrink-0 ${isPlusMenuOpen ? 'bg-indigo-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
          >
            <Plus size={20} strokeWidth={2.5} className={`transition-transform duration-300 ${isPlusMenuOpen ? 'rotate-45' : ''}`} />
          </button>
          
          {/* Settings Button */}
          <button 
            onClick={() => setIsSettingsOpen(true)} 
            className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-slate-50 border border-slate-200/80 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm transition-all shrink-0 active:scale-95"
            title={t.buttons.settings}
          >
            <Settings size={18} strokeWidth={2.5} />
          </button>
        </div>

      </header>

      {/* --- MAIN BODY --- */}
      <div className="flex-1 w-full max-w-6xl mx-auto flex flex-col md:px-8 md:py-6">
        
        {/* --- FIXED, NON-SCROLLABLE TELEGRAM-STYLE TABS --- */}
        <div className="bg-white md:bg-transparent border-b border-slate-200/80 md:border-none px-2 md:px-0 pt-2 pb-0 md:pb-4 shrink-0 z-20">
          <div className="flex justify-between items-end md:bg-slate-200/50 md:p-1.5 md:rounded-[1.2rem] md:shadow-inner w-full">
            {TABS_CONFIG.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`
                  relative flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-2 pb-2 md:pb-0 md:py-2.5 flex-1 transition-all active:scale-95
                  ${activeTab === tab.id ? 'text-indigo-600 md:bg-white md:shadow-[0_2px_10px_rgb(0,0,0,0.04)] md:ring-1 md:ring-slate-200/50 md:rounded-xl' : 'text-slate-400 hover:text-slate-600 md:hover:bg-slate-200/50 md:rounded-xl'}
                `}
              >
                <div className="relative">
                  <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} className="md:w-[18px] md:h-[18px]" />
                  {/* Mobile Red Dot Badge */}
                  {tab.badge > 0 && <div className="md:hidden absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>}
                </div>
                
                <span className={`text-[10px] md:text-[13px] font-bold tracking-tight md:tracking-normal ${activeTab === tab.id ? 'md:font-black' : ''}`}>
                  {tab.id === 'leaderboard' ? 'Reyting' : tab.label} {/* Shorten name if needed on mobile */}
                </span>
                
                {/* PC Text Badge */}
                {tab.badge > 0 && (
                  <span className="hidden md:flex ml-1 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                    {tab.badge}
                  </span>
                )}

                {/* Mobile Active Indicator Line */}
                {activeTab === tab.id && (
                  <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-indigo-600 rounded-t-full md:hidden" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* --- SWIPEABLE CONTENT CANVAS --- */}
        <div 
          className="flex-1 bg-[#FAFAFA] md:bg-white md:rounded-[2rem] md:border border-slate-200/80 md:shadow-sm p-3 md:p-8 min-h-[500px] overflow-x-hidden relative"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="h-full"
            >
              {activeTab === 'students' && <RosterTab classId={classId} studentIds={classData.studentIds || []} />}
              {activeTab === 'assignments' && <AssignmentsTab classId={classId} roster={rosterData} totalRosterSize={classData.studentIds?.length || 0} onEdit={handleEditAssignment} onAdd={handleCreateAssignment} />}
              {activeTab === 'materials' && <MaterialsTab classId={classId} />}
              {activeTab === 'leaderboard' && <LeaderboardTab classId={classId} />} 
              {activeTab === 'requests' && <RequestsTab classId={classId} />}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
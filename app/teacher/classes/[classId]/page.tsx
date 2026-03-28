'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc, collection, query } from 'firebase/firestore';
import { Users, UserPlus, Hash, ChevronLeft, Inbox, FileText, UploadCloud, FolderOpen, Loader2, Settings, Lock,Trophy } from 'lucide-react';
import Link from 'next/link';

// Extracted Tabs and Modals
import RosterTab from './_components/RosterTab';
import RequestsTab from './_components/RequestsTab';
import AddStudentModal from './_components/AddStudentModal';
import AssignTestModal from './_components/AssignTestModal';
import AssignmentsTab from './_components/AssignmentsTab';
import MaterialsTab from './_components/MaterialsTab';
import UploadMaterialModal from './_components/UploadMaterialModal';
import ClassSettingsModal from './_components/ClassSettingsModal'; // 🟢 NEW
import { useTeacherLanguage } from '@/app/teacher/layout';
import LeaderboardTab from './_components/LeaderboardTab';

// --- TRANSLATION DICTIONARY ---
const DETAILS_TRANSLATIONS = {
  uz: {
    back: "Sinflarga qaytish", noDesc: "Tavsif berilmagan.", code: "Kod", studentsCount: "O'quvchi", locked: "Qulflangan",
    buttons: { add: "Qo'shish", assign: "Test Biriktirish", upload: "Material Yuklash", settings: "Sozlamalar" },
    tabs: { students: "O'quvchilar", assignments: "Topshiriqlar", materials: "Materiallar", requests: "So'rovlar", leaderboard: "Reyting" }, // 🟢 ADDED leaderboard
    loading: "Sinf yuklanmoqda...", unknown: "Noma'lum Foydalanuvchi"
  },
  en: {
    back: "Back to Classes", noDesc: "No description provided.", code: "Code", studentsCount: "Students", locked: "Locked",
    buttons: { add: "Add", assign: "Assign Test", upload: "Upload Material", settings: "Settings" },
    tabs: { students: "Students", assignments: "Assignments", requests: "Requests", materials: "Materials", leaderboard: "Leaderboard" }, // 🟢 ADDED leaderboard
    loading: "Loading Class...", unknown: "Unknown User"
  },
  ru: {
    back: "Назад к классам", noDesc: "Описание отсутствует.", code: "Код", studentsCount: "Учеников", locked: "Закрыт",
    buttons: { add: "Добавить", assign: "Назначить Тест", upload: "Загрузить Материал", settings: "Настройки" },
    tabs: { students: "Ученики", assignments: "Задания", requests: "Запросы", materials: "Материалы", leaderboard: "Рейтинг" }, // 🟢 ADDED leaderboard
    loading: "Загрузка класса...", unknown: "Неизвестный пользователь"
  }
};

export default function ClassDetailsPage() {
  const { classId } = useParams() as { classId: string };
  const { lang } = useTeacherLanguage();
  const t = DETAILS_TRANSLATIONS[lang] || DETAILS_TRANSLATIONS['en'];

  const [classData, setClassData] = useState<any>(null);
  const [rosterData, setRosterData] = useState<any[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  
  const [activeTab, setActiveTab] = useState<'students' | 'assignments' | 'requests' | 'materials' | 'leaderboard'>('students');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // 🟢 NEW
  const [assignmentToEdit, setAssignmentToEdit] = useState<any>(null);
   

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

  if (!classData) {
    return (
      <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={32}/>
        <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col">
      
      {/* --- MODALS --- */}
      <AddStudentModal classId={classId} isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <AssignTestModal classId={classId} isOpen={isAssignOpen} onClose={() => setIsAssignOpen(false)} roster={rosterData} editData={assignmentToEdit} />
      <UploadMaterialModal classId={classId} isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
      <ClassSettingsModal classId={classId} classData={classData} isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} /> {/* 🟢 NEW */}

      {/* 🟢 PREMIUM COMPACT STICKY HEADER */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm shrink-0">

        {/* Left: Back Button & Class Info */}
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <Link href="/teacher/classes" className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm transition-all shrink-0" title={t.back}>
            <ChevronLeft size={18} />
          </Link>

          <div className="w-px h-6 bg-slate-200 hidden md:block shrink-0"></div>

          <div className="flex flex-col justify-center min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[16px] md:text-[18px] font-black text-slate-900 tracking-tight truncate max-w-[200px] md:max-w-sm">
                {classData.title}
              </h1>
              
              {/* Compact Badges */}
              {classData.isLocked && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-50 border border-red-100 rounded-md text-[10px] font-black text-red-600 tracking-widest uppercase shadow-sm">
                  <Lock size={10} strokeWidth={3}/> {t.locked}
                </span>
              )}
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 border border-slate-200/60 rounded-md text-[10px] font-black text-slate-600 tracking-widest uppercase shadow-inner">
                <Hash size={12} className="text-indigo-400"/> {classData.joinCode}
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-100/60 rounded-md text-[11px] font-bold text-emerald-700 shadow-sm">
                <Users size={12} className="text-emerald-500"/> {classData.studentIds?.length || 0}
              </span>
            </div>
            <p className="text-[12px] font-medium text-slate-500 truncate max-w-md mt-0.5 hidden md:block">{classData.description || t.noDesc}</p>
          </div>
        </div>

        {/* Right: Action Buttons Group */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 md:pb-0 shrink-0 snap-x pr-1">
          <button onClick={() => setIsAddOpen(true)} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl font-bold transition-all text-[12px] shadow-sm active:scale-95 whitespace-nowrap snap-start">
            <UserPlus size={14} /> <span>{t.buttons.add}</span>
          </button>
          <button onClick={() => setIsUploadOpen(true)} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl font-bold transition-all shadow-sm active:scale-95 text-[12px] whitespace-nowrap snap-start">
            <UploadCloud size={14} /> <span>{t.buttons.upload}</span>
          </button>
          <button onClick={handleCreateAssignment} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl font-bold transition-all shadow-sm shadow-indigo-600/20 active:scale-95 text-[12px] whitespace-nowrap snap-start">
            <FileText size={14} /> <span>{t.buttons.assign}</span>
          </button>
          
          {/* 🟢 SETTINGS GEAR ICON */}
          <div className="w-px h-6 bg-slate-200 shrink-0 mx-1"></div>
          <button 
            onClick={() => setIsSettingsOpen(true)} 
            className="w-9 h-9 flex items-center justify-center bg-slate-50 border border-slate-200/80 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-sm transition-all shrink-0 snap-start" 
            title={t.buttons.settings}
          >
            <Settings size={16} strokeWidth={2.5} />
          </button>
        </div>

      </header>

      {/* --- MAIN BODY --- */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">
        
        {/* --- SEGMENTED TABS --- */}
        <div className="flex p-1.5 bg-slate-200/50 rounded-[1.2rem] overflow-x-auto hide-scrollbar border border-slate-200/60 shadow-inner">
          {[
            { id: 'students', label: t.tabs.students, icon: Users, badge: 0 },
            { id: 'assignments', label: t.tabs.assignments, icon: FileText, badge: 0 },
            { id: 'materials', label: t.tabs.materials, icon: FolderOpen, badge: 0 },
            { id: 'leaderboard', label: t.tabs.leaderboard, icon: Trophy, badge: 0 }, // 🟢 ADDED THIS LINE
            { id: 'requests', label: t.tabs.requests, icon: Inbox, badge: requestCount }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap flex-1 min-w-[120px]
                ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-[0_2px_10px_rgb(0,0,0,0.04)] ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}
              `}
            >
              <tab.icon size={16} strokeWidth={2.5} />
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* --- CONTENT CANVAS --- */}
        <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm p-4 md:p-8 min-h-[500px]">
          {activeTab === 'students' && <RosterTab classId={classId} studentIds={classData.studentIds || []} />}
          {activeTab === 'assignments' && <AssignmentsTab classId={classId} roster={rosterData} totalRosterSize={classData.studentIds?.length || 0} onEdit={handleEditAssignment} onAdd={handleCreateAssignment} />}
          {activeTab === 'materials' && <MaterialsTab classId={classId} />}
          {activeTab === 'leaderboard' && <LeaderboardTab classId={classId} />} {/* 🟢 ADDED THIS LINE */}
          {activeTab === 'requests' && <RequestsTab classId={classId} />}
        </div>

      </div>
    </div>
  );
}
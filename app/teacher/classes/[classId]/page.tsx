'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc, collection, query } from 'firebase/firestore';
import { Users, UserPlus, Hash, ChevronLeft, Inbox, FileText, UploadCloud, FolderOpen } from 'lucide-react';
import Link from 'next/link';

// Extracted Tabs and Modals
import RosterTab from './_components/RosterTab';
import RequestsTab from './_components/RequestsTab';
import AddStudentModal from './_components/AddStudentModal';
import AssignTestModal from './_components/AssignTestModal';
import AssignmentsTab from './_components/AssignmentsTab';
import MaterialsTab from './_components/MaterialsTab'; // 🟢 NEW
import UploadMaterialModal from './_components/UploadMaterialModal'; // 🟢 NEW
import { useTeacherLanguage } from '@/app/teacher/layout';

// --- 1. TRANSLATION DICTIONARY (Updated) ---
const DETAILS_TRANSLATIONS = {
  uz: {
    back: "Sinflarga qaytish",
    noDesc: "Tavsif berilmagan.",
    code: "Kod:",
    studentsCount: "O'quvchi",
    buttons: {
      add: "O'quvchi Qo'shish",
      assign: "Test Biriktirish",
      upload: "Material Yuklash" // 🟢 NEW
    },
    tabs: {
      students: "O'quvchilar",
      assignments: "Topshiriqlar",
      requests: "So'rovlar",
      materials: "Materiallar" // 🟢 NEW
    },
    loading: "Sinf yuklanmoqda...",
    unknown: "Noma'lum Foydalanuvchi"
  },
  en: {
    back: "Back to Classes",
    noDesc: "No description provided.",
    code: "Code:",
    studentsCount: "Students",
    buttons: {
      add: "Add Student",
      assign: "Assign Test",
      upload: "Upload Material" // 🟢 NEW
    },
    tabs: {
      students: "Students",
      assignments: "Assignments",
      requests: "Requests",
      materials: "Materials" // 🟢 NEW
    },
    loading: "Loading Class...",
    unknown: "Unknown User"
  },
  ru: {
    back: "Назад к классам",
    noDesc: "Описание отсутствует.",
    code: "Код:",
    studentsCount: "Учеников",
    buttons: {
      add: "Добавить Ученика",
      assign: "Назначить Тест",
      upload: "Загрузить Материал" // 🟢 NEW
    },
    tabs: {
      students: "Ученики",
      assignments: "Задания",
      requests: "Запросы",
      materials: "Материалы" // 🟢 NEW
    },
    loading: "Загрузка класса...",
    unknown: "Неизвестный пользователь"
  }
};

export default function ClassDetailsPage() {
  const { classId } = useParams() as { classId: string };
  const { lang } = useTeacherLanguage();
  const t = DETAILS_TRANSLATIONS[lang];

  // --- STATE ---
  const [classData, setClassData] = useState<any>(null);
  const [rosterData, setRosterData] = useState<any[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  
  // UI State (Added 'materials')
  const [activeTab, setActiveTab] = useState<'students' | 'assignments' | 'requests' | 'materials'>('students');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false); // 🟢 NEW
  const [assignmentToEdit, setAssignmentToEdit] = useState<any>(null); 

  // --- LISTENERS ---
  useEffect(() => {
    if (!classId) return;
    const unsubscribe = onSnapshot(doc(db, 'classes', classId), (doc) => {
      if (doc.exists()) {
        setClassData({ id: doc.id, ...doc.data() });
      }
    });
    return () => unsubscribe();
  }, [classId]);

  useEffect(() => {
    if (!classId) return;
    const q = query(collection(db, 'classes', classId, 'requests'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequestCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [classId]);

  useEffect(() => {
    const fetchRoster = async () => {
      if (!classData?.studentIds || classData.studentIds.length === 0) {
        setRosterData([]);
        return;
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

  const handleEditAssignment = (assignment: any) => {
    setAssignmentToEdit(assignment);
    setIsAssignOpen(true);
  };

  const handleCreateAssignment = () => {
    setAssignmentToEdit(null);
    setIsAssignOpen(true);
  };

  if (!classData) return <div className="p-10 text-center text-slate-500">{t.loading}</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* --- MODALS --- */}
      <AddStudentModal classId={classId} isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      
      <AssignTestModal 
        classId={classId} 
        isOpen={isAssignOpen} 
        onClose={() => setIsAssignOpen(false)} 
        roster={rosterData} 
        editData={assignmentToEdit} 
      />

      <UploadMaterialModal 
        classId={classId} 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
      />

      {/* --- HEADER --- */}
      <div>
        <Link href="/teacher/classes" className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-2 transition-colors">
          <ChevronLeft size={14}/> {t.back}
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">{classData.title}</h1>
            <p className="text-slate-500 text-sm font-medium mb-3">{classData.description || t.noDesc}</p>
            
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm whitespace-nowrap">
                <Hash size={14} className="text-indigo-500"/> 
                {t.code} <span className="font-mono text-slate-900 bg-slate-100 px-1 rounded ml-1">{classData.joinCode}</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm whitespace-nowrap">
                <Users size={14} className="text-indigo-500"/> 
                {classData.studentIds?.length || 0} {t.studentsCount}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <button 
              onClick={() => setIsAddOpen(true)}
              className="flex justify-center items-center gap-2 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl font-bold transition-all text-sm active:scale-95"
            >
              <UserPlus size={18} /> <span className="hidden sm:inline">{t.buttons.add}</span>
            </button>
            <button 
              onClick={handleCreateAssignment}
              className="flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-indigo-200 active:scale-95 text-sm"
            >
              <FileText size={18} /> <span className="hidden sm:inline">{t.buttons.assign}</span>
            </button>
            <button 
              onClick={() => setIsUploadOpen(true)}
              className="flex justify-center items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-slate-200 active:scale-95 text-sm"
            >
              <UploadCloud size={18} /> <span className="hidden sm:inline">{t.buttons.upload}</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- TABS --- */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-hide">
          <button onClick={() => setActiveTab('students')} className={`flex-1 min-w-[120px] py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'students' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
            <Users size={16} /> {t.tabs.students}
          </button>
          <button onClick={() => setActiveTab('assignments')} className={`flex-1 min-w-[120px] py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'assignments' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
            <FileText size={16} /> {t.tabs.assignments}
          </button>
          <button onClick={() => setActiveTab('materials')} className={`flex-1 min-w-[120px] py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'materials' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
            <FolderOpen size={16} /> {t.tabs.materials}
          </button>
          <button onClick={() => setActiveTab('requests')} className={`flex-1 min-w-[120px] py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'requests' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
            <Inbox size={16} /> {t.tabs.requests}
            {requestCount > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">{requestCount}</span>}
          </button>
        </div>

        {/* --- CONTENT AREA --- */}
        <div className="p-4 md:p-6 bg-slate-50/30 min-h-[400px]">
          {activeTab === 'students' && <RosterTab classId={classId} studentIds={classData.studentIds || []} />}
          {activeTab === 'assignments' && <AssignmentsTab classId={classId} roster={rosterData} onEdit={handleEditAssignment} onAdd={handleCreateAssignment} />}
          {activeTab === 'materials' && <MaterialsTab classId={classId} />}
          {activeTab === 'requests' && <RequestsTab classId={classId} />}
        </div>
      </div>
    </div>
  );
}
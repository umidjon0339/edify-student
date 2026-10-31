'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc, collection, query } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import {
  Users, UserPlus, Hash, ChevronLeft, Inbox,
  FileText, UploadCloud, FolderOpen,
  Settings, Lock, Trophy, Plus, FileBadge, CalendarCheck, Building2
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { IconButton, Spinner } from '@/components/ui';

// Extracted Tabs and Modals
import RosterTab from './_components/RosterTab';
import RequestsTab from './_components/RequestsTab';
import AddStudentModal from './_components/AddStudentModal';
import AssignTestModal from './_components/AssignTestModal';
import AssignExamModal from './_components/AssignExamModal'; 
import AssignmentsTab from './_components/AssignmentsTab';
import ExamsTab from './_components/ExamsTab'; 
import MaterialsTab from './_components/MaterialsTab';
import UploadMaterialModal from './_components/UploadMaterialModal';
import ClassSettingsModal from './_components/ClassSettingsModal'; 
import { useTeacherLanguage } from '@/app/teacher/layout';
import LeaderboardTab from './_components/LeaderboardTab';
import AttendanceTab from './_components/AttendanceTab';

// --- TRANSLATION DICTIONARY ---
const DETAILS_TRANSLATIONS = {
  uz: {
    back: "Sinflarga", noDesc: "Tavsif berilmagan.", code: "Kod", studentsCount: "O'quvchi", locked: "Qulflangan",
    centerGroup: "Markaz guruhi", centerManagedHint: "Bu guruh markaz tomonidan boshqariladi — o'quvchilarni menejer qo'shadi.",
    buttons: { add: "O'quvchi Qo'shish", assign: "Test Biriktirish", assignExam: "BSB/CHSB Biriktirish", upload: "Material Yuklash", settings: "Sozlamalar" },
    tabs: { students: "O'quvchilar", assignments: "Topshiriqlar", attendance: "Davomat", exams: "Imtihonlar", materials: "Materiallar", requests: "So'rovlar", leaderboard: "Reyting" },
    loading: "Sinf yuklanmoqda...", unknown: "Noma'lum Foydalanuvchi"
  },
  en: {
    back: "Classes", noDesc: "No description provided.", code: "Code", studentsCount: "Students", locked: "Locked",
    centerGroup: "Center group", centerManagedHint: "This group is managed by the learning center — students are enrolled by the manager.",
    buttons: { add: "Add Student", assign: "Assign Test", assignExam: "Assign BSB/CHSB", upload: "Upload Material", settings: "Settings" },
    tabs: { students: "Students", assignments: "Assignments", attendance: "Attendance", exams: "Exams", requests: "Requests", materials: "Materials", leaderboard: "Leaderboard" },
    loading: "Loading Class...", unknown: "Unknown User"
  },
  ru: {
    back: "Классы", noDesc: "Описание отсутствует.", code: "Код", studentsCount: "Учеников", locked: "Закрыт",
    centerGroup: "Группа центра", centerManagedHint: "Эта группа управляется учебным центром — учеников добавляет менеджер.",
    buttons: { add: "Добавить Ученика", assign: "Назначить Тест", assignExam: "Назначить БСБ/ЧСБ", upload: "Загрузить Материал", settings: "Настройки" },
    tabs: { students: "Ученики", assignments: "Задания", attendance: "Посещаемость", exams: "Экзамены", requests: "Запросы", materials: "Материалы", leaderboard: "Рейтинг" },
    loading: "Загрузка класса...", unknown: "Неизвестный пользователь"
  }
};

type TabType = 'students' | 'assignments' | 'attendance' | 'exams' | 'materials' | 'leaderboard' | 'requests';

export default function ClassDetailsPage() {
  const { classId } = useParams() as { classId: string };
  const { lang } = useTeacherLanguage();
  const t = DETAILS_TRANSLATIONS[lang] || DETAILS_TRANSLATIONS['en'];
  const { user } = useAuth();

  const [classData, setClassData] = useState<any>(null);
  const [rosterData, setRosterData] = useState<any[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [centerName, setCenterName] = useState("");

  // 🟢 Markaz guruhi (centerId != '') — roster/sozlamalar/kod menejer tomonidan
  // boshqariladi; o'qituvchi uchun view-only (rules ham shuni majburlaydi).
  const isCenterClass = !!classData?.centerId;
  
  // `?tab=attendance` deep-links here from the center hub / dashboard "today's
  // lessons" card. Read from the URL directly, not useSearchParams — the latter
  // forces a Suspense boundary at build time for no benefit.
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window === 'undefined') return 'students';
    const wanted = new URLSearchParams(window.location.search).get('tab');
    const valid: TabType[] = ['students', 'assignments', 'attendance', 'exams', 'materials', 'leaderboard', 'requests'];
    return valid.includes(wanted as TabType) ? (wanted as TabType) : 'students';
  });
  
  // Modals & Menus
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAssignExamOpen, setIsAssignExamOpen] = useState(false); 
  const [isUploadOpen, setIsUploadOpen] = useState(false); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); 
  
  const [assignmentToEdit, setAssignmentToEdit] = useState<any>(null);
  const [examToEdit, setExamToEdit] = useState<any>(null); // 🟢 Exam Edit State

  useEffect(() => {
    if (!classId) return;
    const unsubscribe = onSnapshot(doc(db, 'classes', classId), (doc) => {
      if (doc.exists()) setClassData({ id: doc.id, ...doc.data() });
    });
    return () => unsubscribe();
  }, [classId]);

  // Join requests exist only on personal classes — center groups can't receive
  // them (rules block the create), so skip the listener entirely.
  useEffect(() => {
    if (!classId || isCenterClass) { setRequestCount(0); return; }
    const q = query(collection(db, 'classes', classId, 'requests'));
    const unsubscribe = onSnapshot(q, (snapshot) => setRequestCount(snapshot.size));
    return () => unsubscribe();
  }, [classId, isCenterClass]);

  // Center name for the header chip (centers are readable by any authed user).
  useEffect(() => {
    const cId = classData?.centerId;
    if (!cId) { setCenterName(""); return; }
    let mounted = true;
    getDoc(doc(db, 'centers', cId))
      .then(snap => { if (mounted) setCenterName(snap.exists() ? (snap.data().name || "") : ""); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [classData?.centerId]);

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
      <div className="min-h-[100dvh] bg-surface flex flex-col items-center justify-center gap-4">
        <Spinner size={32} />
        <p className="text-[13px] font-bold text-on-surface-variant uppercase tracking-widest">{t.loading}</p>
      </div>
    );
  }

  const TABS_CONFIG = [
    { id: 'students', label: t.tabs.students, icon: Users, badge: 0 },
    { id: 'assignments', label: t.tabs.assignments, icon: FileText, badge: 0 },
    { id: 'attendance', label: t.tabs.attendance, icon: CalendarCheck, badge: 0 },
    { id: 'exams', label: t.tabs.exams, icon: FileBadge, badge: 0 },
    { id: 'materials', label: t.tabs.materials, icon: FolderOpen, badge: 0 },
    { id: 'leaderboard', label: t.tabs.leaderboard, icon: Trophy, badge: 0 },
    // Center groups take no join requests — the tab disappears entirely.
    ...(isCenterClass ? [] : [{ id: 'requests', label: t.tabs.requests, icon: Inbox, badge: requestCount }])
  ];

  return (
    <div className="min-h-[100dvh] bg-surface font-t-body selection:bg-primary-container selection:text-on-primary-container flex flex-col relative">
      
      {/* --- MODALS --- */}
      {/* Markaz guruhida qo'shish/sozlamalar menejerniki — modallar umuman mount qilinmaydi. */}
      {!isCenterClass && <AddStudentModal classId={classId} isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />}
      <AssignTestModal classId={classId} isOpen={isAssignOpen} onClose={() => setIsAssignOpen(false)} roster={rosterData} editData={assignmentToEdit} />
      <AssignExamModal classId={classId} isOpen={isAssignExamOpen} onClose={() => setIsAssignExamOpen(false)} editData={examToEdit} />
      <UploadMaterialModal classId={classId} isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
      {!isCenterClass && <ClassSettingsModal classId={classId} classData={classData} isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}

      {/* --- PLUS ACTION MENU OVERLAY --- */}
      <AnimatePresence>
        {isPlusMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-scrim backdrop-blur-sm"
              onClick={() => setIsPlusMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-[60px] md:top-[70px] right-4 md:right-8 z-50 bg-surface-container-lowest rounded-m3-lg shadow-elev-3 border border-outline-variant w-64 p-2 flex flex-col gap-1 origin-top-right"
            >
              {/* 🟢 NEW: Assign Exam Button properly clears editData */}
              <button onClick={() => { setExamToEdit(null); setIsAssignExamOpen(true); setIsPlusMenuOpen(false); }} className="flex items-center gap-3 px-3 py-3 hover:bg-state-hover rounded-m3-md transition-colors text-on-surface w-full text-left group">
                <div className="w-8 h-8 rounded-m3-sm bg-tertiary-container text-on-tertiary-container flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><FileBadge size={16} strokeWidth={2.5}/></div>
                <span className="font-bold text-[13px]">{t.buttons.assignExam}</span>
              </button>

              <button onClick={() => { handleCreateAssignment(); setIsPlusMenuOpen(false); }} className="flex items-center gap-3 px-3 py-3 hover:bg-state-hover rounded-m3-md transition-colors text-on-surface w-full text-left group">
                <div className="w-8 h-8 rounded-m3-sm bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><FileText size={16} strokeWidth={2.5}/></div>
                <span className="font-bold text-[13px]">{t.buttons.assign}</span>
              </button>

              <button onClick={() => { setIsUploadOpen(true); setIsPlusMenuOpen(false); }} className="flex items-center gap-3 px-3 py-3 hover:bg-state-hover rounded-m3-md transition-colors text-on-surface w-full text-left group">
                <div className="w-8 h-8 rounded-m3-sm bg-surface-container-high text-on-surface-variant flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><UploadCloud size={16} strokeWidth={2.5}/></div>
                <span className="font-bold text-[13px]">{t.buttons.upload}</span>
              </button>

              {!isCenterClass && (
                <>
                  <div className="h-px bg-outline-variant my-1 mx-2"></div>

                  <button onClick={() => { setIsAddOpen(true); setIsPlusMenuOpen(false); }} className="flex items-center gap-3 px-3 py-3 hover:bg-state-hover rounded-m3-md transition-colors text-on-surface w-full text-left group">
                    <div className="w-8 h-8 rounded-m3-sm bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><UserPlus size={16} strokeWidth={2.5}/></div>
                    <span className="font-bold text-[13px]">{t.buttons.add}</span>
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🟢 ULTRA MINIMALISTIC HEADER */}
      <header className="t-page-bar sticky top-0 z-30 bg-[color-mix(in_oklab,var(--m3-surface)_85%,transparent)] backdrop-blur-xl border-b border-outline-variant px-3 md:px-6 py-2.5 md:py-3 flex justify-between items-center shadow-elev-1 shrink-0">

        <div className="flex items-center gap-2.5 md:gap-4 min-w-0">
          <Link href="/teacher/classes" className="m3-interactive w-8 h-8 md:w-9 md:h-9 rounded-m3-md bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest hover:shadow-elev-1 transition-all shrink-0" title={t.back}>
            <ChevronLeft size={18} strokeWidth={2.5} />
          </Link>

          <div className="w-px h-5 bg-outline-variant hidden md:block shrink-0"></div>

          <div className="flex flex-col justify-center min-w-0">
            <h1 className="text-[15px] md:text-[18px] font-black text-on-surface tracking-tight truncate max-w-[160px] sm:max-w-xs md:max-w-sm">
              {classData.title}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              {classData.isLocked && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-error-container rounded-m3-xs text-[9px] md:text-[10px] font-black text-on-error-container tracking-widest uppercase shadow-elev-1">
                  <Lock size={10} strokeWidth={3}/> {t.locked}
                </span>
              )}
              {isCenterClass ? (
                // Markaz guruhi: kirish kodi o'rniga markaz chipi (kod yashiriladi —
                // o'quvchi qo'shilishi yopiq, faqat menejer qo'shadi).
                <span title={t.centerManagedHint} className="flex items-center gap-1 px-1.5 py-0.5 bg-tertiary-container rounded-m3-xs text-[9px] md:text-[10px] font-black text-on-tertiary-container tracking-widest uppercase shadow-elev-1 max-w-[180px] md:max-w-[260px]">
                  <Building2 size={10} strokeWidth={3} className="shrink-0"/>
                  <span className="truncate">{centerName || t.centerGroup}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-surface-container-high border border-outline-variant rounded-m3-xs text-[9px] md:text-[10px] font-black text-on-surface-variant tracking-widest uppercase shadow-inner">
                  <Hash size={10} className="text-primary"/> {classData.joinCode}
                </span>
              )}
              {/* Moved here from the class card on the list page. */}
              {classData.description && (
                <span className="hidden md:inline truncate max-w-[260px] text-[11px] font-medium text-on-surface-variant" title={classData.description}>
                  {classData.description}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <IconButton
            variant="filled"
            onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
            aria-label="Menyu"
            className="shrink-0"
          >
            <Plus strokeWidth={2.5} className={`transition-transform duration-300 ${isPlusMenuOpen ? 'rotate-45' : ''}`} />
          </IconButton>
          {!isCenterClass && (
            <IconButton
              onClick={() => setIsSettingsOpen(true)}
              aria-label={t.buttons.settings}
              title={t.buttons.settings}
              className="shrink-0"
            >
              <Settings strokeWidth={2.5} />
            </IconButton>
          )}
        </div>

      </header>

      {/* --- MAIN BODY (full width) --- */}
      <div className="flex-1 w-full flex flex-col md:px-6 md:py-6">
        
        {/* --- UNDERLINE TAB BAR (minimalist, scrollable) --- */}
        <div className="border-b border-outline-variant px-2 md:px-1 shrink-0 z-20 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-1 md:gap-3 min-w-max">
            {TABS_CONFIG.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`relative flex items-center gap-2 px-3 md:px-3.5 py-3 text-[13px] font-semibold whitespace-nowrap transition-colors active:scale-95 ${
                    active ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="relative flex items-center justify-center">
                    <tab.icon size={17} strokeWidth={active ? 2.5 : 2} />
                    {tab.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-error text-on-error text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-surface">
                        {tab.badge}
                      </span>
                    )}
                  </span>
                  <span>{tab.label}</span>
                  {active && (
                    <motion.div layoutId="teacherTabUnderline" className="absolute left-1 right-1 -bottom-px h-[2.5px] bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* --- CONTENT CANVAS --- */}
        {/* Attendance renders edge-to-edge (its grid is already a card); other tabs get the white canvas card. */}
        <div className={`flex-1 min-h-[500px] overflow-x-hidden relative ${
          activeTab === 'attendance'
            ? 'px-2 md:px-0 pt-3 md:pt-4 pb-8'
            : 'bg-surface md:bg-surface-container-low md:rounded-m3-xl md:border border-outline-variant md:shadow-elev-1 p-3 md:p-8 pb-[100px]'
        }`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === 'students' && <RosterTab classId={classId} studentIds={classData.studentIds || []} readOnly={isCenterClass} readOnlyHint={isCenterClass ? t.centerManagedHint : undefined} />}
              {activeTab === 'assignments' && <AssignmentsTab classId={classId} roster={rosterData} totalRosterSize={classData.studentIds?.length || 0} onEdit={handleEditAssignment} onAdd={handleCreateAssignment} />}
              {activeTab === 'attendance' && (
                <AttendanceTab
                  classId={classId}
                  // Davomat yozuvi guruhning O'Z centerId'sini oladi: markaz guruhi →
                  // menejer hisobotlariga tushadi; shaxsiy guruh → '' (markazga oqmaydi).
                  centerId={classData.centerId || ''}
                  studentIds={classData.studentIds || []}
                  recordedBy={user?.uid || ''}
                  schedule={classData.schedule || []}
                />
              )}
              
              {/* 🟢 NEW: Exams Tab with onEdit wiring */}
              {activeTab === 'exams' && (
                <ExamsTab 
                  classId={classId} 
                  roster={rosterData} 
                  onAdd={() => { setExamToEdit(null); setIsAssignExamOpen(true); }} 
                  onEdit={(exam: any) => { setExamToEdit(exam); setIsAssignExamOpen(true); }}
                />
              )} 

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
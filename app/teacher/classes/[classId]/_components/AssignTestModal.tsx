'use client';

import { sendNotification } from '@/services/notificationService';
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom'; // 🟢 ADDED PORTAL
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp, orderBy, limit, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { 
  X, Clock, Users, Search, Loader2, AlignLeft, RotateCcw, 
  Plus, BookOpen, CheckCircle2, Minus, Calendar, AlertTriangle,FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTeacherLanguage } from '@/app/teacher/layout';

// --- TRANSLATION DICTIONARY ---
const ASSIGN_MODAL_TRANSLATIONS = {
  uz: {
    titleCreate: "Test Biriktirish", titleEdit: "Topshiriqni Tahrirlash", titleConfig: "Qoidalarni Sozlash",
    search: "Kutubxonangizdan qidiring...",
    empty: { title: "Kutubxonangiz Bo'sh", desc: "Sinfga biriktirishdan oldin test shablonini yarating.", btn: "Yangi Test Yaratish" },
    list: { loadMore: "Yana 10 ta yuklash", loading: "Yuklanmoqda...", notFound: "Test topilmadi." },
    questions: "Savollar", noLimit: "Cheklovsiz",
    config: {
      instructions: "Ko'rsatmalar", instPlace: "Masalan: Boshlashdan oldin qoidalarni o'qing...",
      attempts: "Ruxsat etilgan urinishlar", maxAttempts: "Maksimal urinishlar:", unlimited: "Cheklovsiz", setUnlimited: "Cheklovsiz qilish",
      schedule: "Jadval", openDate: "Ochilish Sanasi", dueDate: "Tugash Sanasi", now: "Hozir", noDeadline: "Muddatsiz",
      presets: { plus1: "+1 Kun", plus3: "+3 Kun", plus7: "+7 Kun", clear: "Tozalash" },
      assignTo: "Kimga Biriktirish", all: "Barcha O'quvchilar", individual: "Ayrim O'quvchilar", noStudents: "Sinfda o'quvchilar yo'q."
    },
    buttons: { back: "Ortga", next: "Keyingi qadam", publish: "Topshiriqni Nashr Qilish", save: "O'zgarishlarni Saqlash", select: "Testni tanlang" },
    toasts: { updated: "Topshiriq Yangilandi!", published: "Topshiriq Nashr Qilindi!", fail: "Xatolik yuz berdi" }
  },
  en: {
    titleCreate: "Assign a Test", titleEdit: "Edit Assignment", titleConfig: "Configure Rules",
    search: "Search your library...",
    empty: { title: "Library is Empty", desc: "Create a test template before assigning.", btn: "Create New Test" },
    list: { loadMore: "Load Next 10", loading: "Loading...", notFound: "No tests found." },
    questions: "Questions", noLimit: "No Limit",
    config: {
      instructions: "Instructions", instPlace: "e.g. Read the rules before starting...",
      attempts: "Attempts Allowed", maxAttempts: "Max Attempts:", unlimited: "Unlimited", setUnlimited: "Set Unlimited",
      schedule: "Schedule", openDate: "Open Date", dueDate: "Due Date", now: "Now", noDeadline: "No Deadline",
      presets: { plus1: "+1 Day", plus3: "+3 Days", plus7: "+7 Days", clear: "Clear" },
      assignTo: "Assign To", all: "All Students", individual: "Select Individuals", noStudents: "No students in class yet."
    },
    buttons: { back: "Back", next: "Next Step", publish: "Publish Assignment", save: "Save Changes", select: "Select a test" },
    toasts: { updated: "Assignment Updated!", published: "Assignment Published!", fail: "Failed to save" }
  },
  ru: {
    titleCreate: "Назначить Тест", titleEdit: "Редактировать Задание", titleConfig: "Настройка Правил",
    search: "Поиск в библиотеке...",
    empty: { title: "Библиотека пуста", desc: "Создайте шаблон теста перед назначением.", btn: "Создать Тест" },
    list: { loadMore: "Загрузить еще 10", loading: "Загрузка...", notFound: "Тесты не найдены." },
    questions: "Вопросов", noLimit: "Без лимита",
    config: {
      instructions: "Инструкции", instPlace: "Напр.: Прочитайте правила перед началом...",
      attempts: "Допустимые попытки", maxAttempts: "Макс. попыток:", unlimited: "Безлимит", setUnlimited: "Сделать безлимитным",
      schedule: "Расписание", openDate: "Дата Открытия", dueDate: "Срок Сдачи", now: "Сейчас", noDeadline: "Без срока",
      presets: { plus1: "+1 День", plus3: "+3 Дня", plus7: "+7 Дней", clear: "Очистить" },
      assignTo: "Кому Назначить", all: "Всем Ученикам", individual: "Выбрать Индивидуально", noStudents: "В классе нет учеников."
    },
    buttons: { back: "Назад", next: "Далее", publish: "Опубликовать", save: "Сохранить Изменения", select: "Выберите тест" },
    toasts: { updated: "Задание Обновлено!", published: "Опубликовано!", fail: "Ошибка сохранения" }
  }
};

interface Props {
  classId: string;
  isOpen: boolean;
  onClose: () => void;
  roster: any[];
  editData?: any; 
}

export default function AssignTestModal({ classId, isOpen, onClose, roster, editData }: Props) {
  const { user } = useAuth();
  const router = useRouter(); 
  const { lang } = useTeacherLanguage();
  const t = ASSIGN_MODAL_TRANSLATIONS[lang] || ASSIGN_MODAL_TRANSLATIONS['en'];

  // 🟢 SSR HYDRATION FIX FOR PORTAL
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Library Pagination State
  const [myTests, setMyTests] = useState<any[]>([]);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [openAt, setOpenAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [description, setDescription] = useState('');
  const [assignMode, setAssignMode] = useState<'all' | 'individual'>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [allowedAttempts, setAllowedAttempts] = useState<number>(1); 

  // Initialize Data
  useEffect(() => {
    if (isOpen && user) {
      if (editData) {
        setStep(2);
        setSelectedTest({ id: editData.testId, title: editData.testTitle, questionCount: editData.questionCount });
        setDescription(editData.description || '');
        setAllowedAttempts(editData.allowedAttempts ?? 1);
        
        const toInputString = (ts: any) => {
           if (!ts?.seconds) return '';
           const d = new Date(ts.seconds * 1000);
           d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
           return d.toISOString().slice(0, 16);
        };

        setOpenAt(toInputString(editData.openAt));
        setDueAt(toInputString(editData.dueAt));
        
        if (Array.isArray(editData.assignedTo)) {
          setAssignMode('individual');
          setSelectedStudentIds(editData.assignedTo);
        } else {
          setAssignMode('all');
        }

      } else {
        // Reset for Create Mode
        setStep(1); setOpenAt(''); setDueAt(''); setDescription('');
        setAssignMode('all'); setSelectedStudentIds([]); setSelectedTest(null);
        setAllowedAttempts(1); setSearchQuery(''); setMyTests([]); setLastDoc(null); setHasMore(true);

        fetchInitialTests();
      }
    }
  }, [isOpen, user, editData]);

  // --- FETCHING LOGIC (Matches Android Pagination) ---
  const fetchInitialTests = async () => {
    if (!user) return;
    setIsLoadingMore(true);
    try {
      const q = query(collection(db, 'custom_tests'), where('teacherId', '==', user.uid), orderBy('createdAt', 'desc'), limit(10));
      const snap = await getDocs(q);
      const tests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyTests(tests);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(tests.length >= 10);
    } catch (e) { console.error("Index error (Requires composite index)", e); } finally { setIsLoadingMore(false); }
  };

  const loadMoreTests = async () => {
    if (!user || !lastDoc) return;
    setIsLoadingMore(true);
    try {
      const q = query(collection(db, 'custom_tests'), where('teacherId', '==', user.uid), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(10));
      const snap = await getDocs(q);
      const newTests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyTests(prev => [...prev, ...newTests]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(newTests.length >= 10);
    } catch (e) { console.error(e); } finally { setIsLoadingMore(false); }
  };

  // Local Search Filtering (Matches Android)
  const filteredTests = useMemo(() => {
    if (!searchQuery.trim()) return myTests;
    return myTests.filter(test => test.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [myTests, searchQuery]);

  // --- ACTIONS ---
  const applyPreset = (type: '1_day' | '3_days' | '7_days' | 'clear') => {
    if (type === 'clear') { setDueAt(''); return; }
    
    const target = new Date();
    if (type === '1_day') target.setDate(target.getDate() + 1);
    if (type === '3_days') target.setDate(target.getDate() + 3);
    if (type === '7_days') target.setDate(target.getDate() + 7);
    
    // Android math explicitly sets 23:59 for deadline presets
    target.setHours(23, 59, 0, 0);
    target.setMinutes(target.getMinutes() - target.getTimezoneOffset());
    setDueAt(target.toISOString().slice(0, 16));
  };

  const handleAttemptsChange = (delta: number) => {
    if (delta === -1) {
      setAllowedAttempts(prev => prev > 1 ? prev - 1 : (prev === 1 ? 0 : 0));
    } else {
      setAllowedAttempts(prev => prev === 0 ? 1 : (prev < 10 ? prev + 1 : prev));
    }
  };

  const handleSave = async () => {
    if (!selectedTest || !user) return;
    setLoading(true);

    try {
      const openDate = openAt ? new Date(openAt) : new Date();
      const dueDate = dueAt ? new Date(dueAt) : null;
      
      const payload = {
        testId: selectedTest.id,
        testTitle: selectedTest.title,
        questionCount: selectedTest.questionCount,
        description: description.trim(),
        openAt: openDate,
        dueAt: dueDate,
        assignedTo: assignMode === 'all' ? 'all' : selectedStudentIds,
        allowedAttempts: allowedAttempts,
        status: 'active',
        teacherId: user.uid
      };

      if (editData) {
        await updateDoc(doc(db, 'classes', classId, 'assignments', editData.id), payload);
        toast.success(t.toasts.updated);
      } else {
        await addDoc(collection(db, 'classes', classId, 'assignments'), { ...payload, createdAt: serverTimestamp() });
        toast.success(t.toasts.published);
        
        // Notifications
        const targets = assignMode === 'all' ? roster.map(r => r.uid) : selectedStudentIds;
        targets.forEach(uid => {
          if(uid) sendNotification(uid, 'assignment', 'New Test Assigned', `You have a new test: ${selectedTest.title}`, `/classes/${classId}`);
        });
      }
      onClose();
    } catch (error) {
      toast.error(t.toasts.fail);
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (uid: string) => setSelectedStudentIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);

  if (!mounted || !isOpen) return null;

  // 🟢 WRAPPED IN CREATE PORTAL
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-6">
      {/* Premium Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      {/* 🟢 ULTRA MINIMALISTIC MOBILE-FIRST MODAL */}
      <div className="relative bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-2xl overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh] shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 fade-in duration-300 border border-slate-100">
        
        {/* HEADER */}
        <div className="px-5 py-4 sm:px-8 sm:py-5 border-b border-slate-100 bg-white/90 backdrop-blur-xl flex justify-between items-center shrink-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
               <FileText size={18} strokeWidth={2.5} className="sm:w-5 sm:h-5" />
            </div>
            <h2 className="text-[16px] sm:text-[18px] font-black text-slate-900 tracking-tight leading-tight">
              {editData ? t.titleEdit : (step === 1 ? t.titleCreate : t.titleConfig)}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-full text-slate-400 hover:text-slate-600 transition-colors shrink-0 active:scale-95">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#FAFAFA] custom-scrollbar relative pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-8">
          
          {/* ================= STEP 1: SELECT TEST ================= */}
          {step === 1 && !editData && (
            <div className="space-y-4 sm:space-y-5">
              
              {/* Search Bar */}
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18}/>
                <input 
                  type="text" 
                  placeholder={t.search} 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-white border border-slate-200/80 rounded-[1rem] text-[13px] sm:text-[14px] font-bold text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                />
              </div>
              
              {/* List or Empty State */}
              {myTests.length === 0 && !isLoadingMore ? (
                 <div className="text-center py-10 sm:py-12 px-6 bg-white rounded-[1.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center shadow-sm">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 text-slate-400 border border-slate-100"><BookOpen size={24} className="sm:w-7 sm:h-7" /></div>
                    <h4 className="text-slate-800 font-black text-[15px] sm:text-[16px]">{t.empty.title}</h4>
                    <p className="text-slate-500 font-medium text-[12px] sm:text-[13px] mt-1.5 max-w-xs mx-auto mb-6">{t.empty.desc}</p>
                    <button onClick={() => router.push('/teacher/create')} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-95 text-[12px] sm:text-[13px]">
                       <Plus size={16} /> {t.empty.btn}
                    </button>
                 </div>
              ) : filteredTests.length === 0 && searchQuery ? (
                 <div className="text-center py-10 text-slate-400 font-bold text-[13px] sm:text-[14px]">{t.list.notFound}</div>
              ) : (
                <div className="space-y-2.5 sm:space-y-3">
                  {filteredTests.map(test => (
                    <div 
                      key={test.id} onClick={() => setSelectedTest(test)}
                      className={`p-4 sm:p-5 rounded-[1.2rem] border cursor-pointer transition-all flex justify-between items-center group shadow-sm active:scale-[0.98] sm:active:scale-100 ${selectedTest?.id === test.id ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20' : 'border-slate-200/80 bg-white hover:border-indigo-300 hover:shadow-md'}`}
                    >
                      <div>
                        <p className={`font-black text-[14px] sm:text-[15px] transition-colors leading-snug ${selectedTest?.id === test.id ? 'text-indigo-800' : 'text-slate-800 group-hover:text-indigo-600'}`}>{test.title}</p>
                        <p className="text-[11px] sm:text-[12px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{test.questionCount} {t.questions} • {test.duration ? `${test.duration}m` : t.noLimit}</p>
                      </div>
                      {selectedTest?.id === test.id 
                        ? <CheckCircle2 size={22} className="text-indigo-600 fill-indigo-100 shrink-0 sm:w-6 sm:h-6"/> 
                        : <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-slate-200 group-hover:border-indigo-300 shrink-0 transition-colors"></div>
                      }
                    </div>
                  ))}
                  
                  {/* Load More Button */}
                  {hasMore && !searchQuery && (
                    <div className="pt-3 pb-2 text-center">
                      <button onClick={loadMoreTests} disabled={isLoadingMore} className="px-5 sm:px-6 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 font-bold rounded-xl shadow-sm transition-all text-[12px] sm:text-[13px] active:scale-95 flex items-center justify-center gap-2 mx-auto">
                        {isLoadingMore ? <><Loader2 size={16} className="animate-spin"/> {t.list.loading}</> : t.list.loadMore}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 2: CONFIGURE ================= */}
          {step === 2 && (
            <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
              
              {/* Description (With 200 Char Limit) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><AlignLeft size={14}/> {t.config.instructions}</label>
                  <span className={`text-[9px] sm:text-[10px] font-black tracking-widest ${description.length >= 190 ? 'text-red-500' : 'text-slate-400'}`}>{description.length}/200</span>
                </div>
                <textarea rows={2} maxLength={200} placeholder={t.config.instPlace} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-xl text-[13px] sm:text-[14px] font-medium text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none transition-all shadow-sm" />
              </div>

              {/* Attempts (Android Stepper Match) */}
              <div>
                <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 sm:mb-3"><RotateCcw size={14}/> {t.config.attempts}</label>
                <div className="flex flex-row items-center justify-between bg-white border border-slate-200/80 p-3 sm:p-4 rounded-xl shadow-sm gap-2">
                  <span className="text-[13px] sm:text-[14px] font-black text-slate-800 leading-tight">{allowedAttempts === 0 ? t.config.unlimited : t.config.maxAttempts}</span>
                  
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    {allowedAttempts > 0 && (
                      <button onClick={() => setAllowedAttempts(0)} className="text-[11px] sm:text-[12px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors hidden sm:block">{t.config.setUnlimited}</button>
                    )}
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-inner p-1">
                      <button onClick={() => handleAttemptsChange(-1)} className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all active:scale-95"><Minus size={16}/></button>
                      <span className="w-10 sm:w-12 text-center text-[15px] sm:text-[16px] font-black text-indigo-600">{allowedAttempts === 0 ? '∞' : allowedAttempts}</span>
                      <button onClick={() => handleAttemptsChange(1)} className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all active:scale-95"><Plus size={16}/></button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timing (Exact Math Presets) */}
              <div className="space-y-3 sm:space-y-4 pt-4 border-t border-slate-200/80">
                <h3 className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={14}/> {t.config.schedule}</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-white border border-slate-200/80 p-3 sm:p-4 rounded-xl shadow-sm">
                    <label className="block text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">{t.config.openDate}</label>
                    <input type="datetime-local" className="w-full bg-slate-50 border border-slate-200 p-2 sm:p-2.5 rounded-lg text-[12px] sm:text-[13px] font-bold text-slate-700 focus:border-indigo-400 focus:bg-white outline-none transition-colors" value={openAt} onChange={e => setOpenAt(e.target.value)} />
                  </div>
                  <div className="bg-white border border-slate-200/80 p-3 sm:p-4 rounded-xl shadow-sm">
                    <label className="block text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">{t.config.dueDate}</label>
                    <input type="datetime-local" className="w-full bg-slate-50 border border-slate-200 p-2 sm:p-2.5 rounded-lg text-[12px] sm:text-[13px] font-bold text-slate-700 focus:border-indigo-400 focus:bg-white outline-none transition-colors" value={dueAt} onChange={e => setDueAt(e.target.value)} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { label: t.config.presets.plus1, type: '1_day' as const },
                    { label: t.config.presets.plus3, type: '3_days' as const },
                    { label: t.config.presets.plus7, type: '7_days' as const }
                  ].map(preset => (
                    <button key={preset.type} onClick={() => applyPreset(preset.type)} className="px-3 sm:px-4 py-1.5 bg-white border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 text-[10px] sm:text-[11px] font-black text-slate-500 rounded-lg transition-all shadow-sm active:scale-95">
                      {preset.label}
                    </button>
                  ))}
                  <button onClick={() => applyPreset('clear')} className="px-3 sm:px-4 py-1.5 bg-red-50 border border-red-100 hover:bg-red-100 text-[10px] sm:text-[11px] font-black text-red-500 rounded-lg transition-all active:scale-95">
                    {t.config.presets.clear}
                  </button>
                </div>
              </div>

              {/* Assignees (Segmented Apple-Style Tabs) */}
              <div className="space-y-3 sm:space-y-4 pt-4 border-t border-slate-200/80">
                <h3 className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Users size={14}/> {t.config.assignTo}</h3>
                
                <div className="flex p-1.5 bg-slate-900 rounded-[1rem] shadow-inner">
                  <button onClick={() => setAssignMode('all')} className={`flex-1 py-2 text-[11px] sm:text-[12px] font-bold rounded-xl transition-all ${assignMode === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}>
                    {t.config.all}
                  </button>
                  <button onClick={() => setAssignMode('individual')} className={`flex-1 py-2 text-[11px] sm:text-[12px] font-bold rounded-xl transition-all ${assignMode === 'individual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}>
                    {t.config.individual}
                  </button>
                </div>

                {assignMode === 'individual' && (
                  <div className="max-h-48 sm:max-h-56 overflow-y-auto border border-slate-200/80 rounded-[1.2rem] p-2 sm:p-3 space-y-1.5 bg-white shadow-sm custom-scrollbar">
                    {roster.length === 0 ? (
                       <div className="flex flex-col items-center justify-center py-6 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                         <AlertTriangle size={24} className="mb-2 text-slate-300"/>
                         <p className="text-[11px] sm:text-[12px] font-bold">{t.config.noStudents}</p>
                       </div>
                    ) : (
                      roster.map(student => {
                        const isChecked = selectedStudentIds.includes(student.uid);
                        return (
                          <div 
                            key={student.uid} onClick={() => toggleStudent(student.uid)}
                            className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-xl cursor-pointer transition-all border active:scale-[0.98] sm:active:scale-100 ${isChecked ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'}`}
                          >
                            <div className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition-colors shrink-0 ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                              {isChecked && <CheckCircle2 size={14} className="text-white"/>}
                            </div>
                            <span className={`text-[12px] sm:text-[13px] font-bold truncate ${isChecked ? 'text-indigo-900' : 'text-slate-700'}`}>{student.displayName}</span>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-4 sm:px-8 py-4 sm:py-4 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4 z-20 shadow-[0_-10px_30px_rgb(0,0,0,0.03)]">
          {step === 2 && !editData && (
            <button onClick={() => setStep(1)} className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-slate-50 border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 hover:text-slate-900 rounded-xl text-[12px] sm:text-[13px] transition-colors active:scale-95">
              {t.buttons.back}
            </button>
          )}
          <button 
            onClick={() => step === 1 ? (selectedTest ? setStep(2) : toast.error(t.buttons.select)) : handleSave()}
            disabled={loading || (step === 1 && !selectedTest)}
            className="w-full sm:w-auto px-8 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 text-[12px] sm:text-[13px] disabled:opacity-50 active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={16}/> : step === 1 ? t.buttons.next : (editData ? t.buttons.save : t.buttons.publish)}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
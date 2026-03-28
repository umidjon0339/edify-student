'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  X, Save, Trash2, Archive, RefreshCw, Settings, FileText, 
  Clock, CheckCircle, Shield, Eye, EyeOff, CalendarClock, AlertTriangle, PenLine 
} from 'lucide-react';
import CartItem from '../../create/_components/CartItem';
import toast from 'react-hot-toast';
import { useTeacherLanguage } from '@/app/teacher/layout';

// --- TRANSLATION DICTIONARY ---
const EDIT_TEST_TRANSLATIONS = {
  uz: {
    title: "Testni Boshqarish", tabs: { settings: "Sozlamalar", questions: "Savollar" },
    settings: {
      name: "Test Nomi", duration: "Davomiyligi", mins: "daq", none: "Cheklovsiz", custom: "MAXSUS:", unlimited: "(Cheklovsiz Vaqt)",
      shuffleTitle: "Savollarni Aralashtirish", shuffleDesc: "Har bir o'quvchi uchun tartibni o'zgartirish",
      securityTitle: "Javoblar Xavfsizligi",
      afterDue: { title: "Muddatdan keyin", desc: "Muddat tugagach ochiladi." },
      never: { title: "Hech qachon", desc: "Faqat yakuniy ball." },
      always: { title: "Darhol", desc: "Topshirgach ochiladi." },
      danger: "Xavfli Hudud", archive: "Arxivlash", restore: "Tiklash", delete: "O'chirish"
    },
    questions: { empty: "Savollar mavjud emas." }, buttons: { save: "Saqlash", saving: "Saqlanmoqda..." },
    toasts: { saved: "Saqlandi!", failSave: "Xatolik", archived: "Arxivlandi", restored: "Tiklandi", failStatus: "Xatolik", deleted: "O'chirildi", failDelete: "Xatolik", confirmDelete: "Ishonchingiz komilmi? Qaytarib bo'lmaydi." }
  },
  en: {
    title: "Manage Test", tabs: { settings: "Settings", questions: "Questions" },
    settings: {
      name: "Test Title", duration: "Duration", mins: "m", none: "None", custom: "CUSTOM:", unlimited: "(Unlimited)",
      shuffleTitle: "Shuffle Questions", shuffleDesc: "Randomize order for students",
      securityTitle: "Answer Key Security",
      afterDue: { title: "After Deadline", desc: "Show after due date." },
      never: { title: "Never Show", desc: "Only final score." },
      always: { title: "Show Immediately", desc: "Right after submission." },
      danger: "Danger Zone", archive: "Archive", restore: "Restore", delete: "Delete"
    },
    questions: { empty: "No questions." }, buttons: { save: "Save", saving: "Saving..." },
    toasts: { saved: "Saved!", failSave: "Failed", archived: "Archived", restored: "Restored", failStatus: "Error", deleted: "Deleted", failDelete: "Failed", confirmDelete: "Are you sure? Cannot be undone." }
  },
  ru: {
    title: "Управление Тестом", tabs: { settings: "Настройки", questions: "Вопросы" },
    settings: {
      name: "Название Теста", duration: "Длительность", mins: "мин", none: "Нет", custom: "СВОЕ:", unlimited: "(Без ограничений)",
      shuffleTitle: "Перемешать вопросы", shuffleDesc: "Случайный порядок",
      securityTitle: "Безопасность ответов",
      afterDue: { title: "После срока", desc: "Только после дедлайна." },
      never: { title: "Никогда", desc: "Только итоговый балл." },
      always: { title: "Показать сразу", desc: "Сразу после сдачи." },
      danger: "Опасная Зона", archive: "Архивировать", restore: "Восстановить", delete: "Удалить"
    },
    questions: { empty: "Вопросов нет." }, buttons: { save: "Сохранить", saving: "Сохранение..." },
    toasts: { saved: "Сохранено!", failSave: "Ошибка", archived: "Архивирован", restored: "Восстановлен", failStatus: "Ошибка", deleted: "Удален", failDelete: "Ошибка", confirmDelete: "Вы уверены? Нельзя отменить." }
  }
};

interface Props { test: any; isOpen: boolean; onClose: () => void; }

export default function EditTestModal({ test, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'settings' | 'questions'>('settings');
  const [isSaving, setIsSaving] = useState(false);
  const { lang } = useTeacherLanguage();
  const t = EDIT_TEST_TRANSLATIONS[lang] || EDIT_TEST_TRANSLATIONS['en'];

  const [settings, setSettings] = useState({
    title: '', duration: 0, shuffle: false, resultsVisibility: 'never' as 'always' | 'never' | 'after_due', status: 'active'
  });
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (test) {
      let visibility = test.resultsVisibility;
      if (!visibility) visibility = test.showResults ? 'always' : 'never';
      setSettings({
        title: test.title || '', duration: test.duration || 0, shuffle: test.shuffle || false, resultsVisibility: visibility, status: test.status || 'active'
      });
      setQuestions(test.questions || []);
    }
  }, [test]);

  if (!isOpen) return null;

  const handleRemoveQuestion = (qId: string) => setQuestions(questions.filter(q => q.id !== qId));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'custom_tests', test.id);
      await updateDoc(docRef, { ...settings, showResults: settings.resultsVisibility === 'always', questions: questions, questionCount: questions.length });
      toast.success(t.toasts.saved);
      onClose();
    } catch (error) { toast.error(t.toasts.failSave); } finally { setIsSaving(false); }
  };

  const handleArchiveToggle = async () => {
    const newStatus = settings.status === 'active' ? 'archived' : 'active';
    try {
      await updateDoc(doc(db, 'custom_tests', test.id), { status: newStatus });
      toast.success(newStatus === 'archived' ? t.toasts.archived : t.toasts.restored);
      onClose();
    } catch (e) { toast.error(t.toasts.failStatus); }
  };

  const handleDeleteTest = async () => {
    if (!confirm(t.toasts.confirmDelete)) return;
    try {
      await deleteDoc(doc(db, 'custom_tests', test.id));
      toast.success(t.toasts.deleted);
      onClose();
    } catch (e) { toast.error(t.toasts.failDelete); }
  };

  const durationOptions = [0, 10, 20, 30, 45, 60];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* 🟢 COLORFUL & COMPACT MODAL CONTAINER */}
      <div className="relative bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/80 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/50">
        
        {/* 🟢 COMPACT HEADER WITH INLINE EDITABLE TITLE */}
        <div className="px-5 py-3 border-b border-indigo-100/50 flex justify-between items-center z-20 shrink-0 bg-white/40 backdrop-blur-md">
          <div className="flex-1 mr-4">
            <div className="flex items-center gap-2 group">
              <input 
                type="text" 
                value={settings.title}
                onChange={(e) => setSettings({...settings, title: e.target.value})}
                placeholder={t.settings.name}
                className="text-[18px] md:text-xl font-black text-slate-900 bg-transparent border-none outline-none w-full max-w-md placeholder:text-slate-400 focus:ring-0 p-0 truncate"
              />
              <PenLine size={14} className="text-slate-300 group-focus-within:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PIN:</span>
              <span className="bg-white text-indigo-600 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-100 shadow-sm">{test.accessCode}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 bg-white/60 hover:bg-white border border-indigo-100/50 text-slate-500 rounded-xl transition-colors shadow-sm">
            <X size={18}/>
          </button>
        </div>

        {/* 🟢 COMPACT TABS */}
        <div className="px-5 flex border-b border-indigo-100/50 z-10 shrink-0 bg-white/20">
          <button 
            onClick={() => setActiveTab('settings')}
            className={`py-2.5 px-2 mr-6 text-[13px] font-bold flex items-center gap-1.5 border-b-2 transition-all ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Settings size={14} /> {t.tabs.settings}
          </button>
          <button 
            onClick={() => setActiveTab('questions')}
            className={`py-2.5 px-2 text-[13px] font-bold flex items-center gap-1.5 border-b-2 transition-all ${activeTab === 'questions' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <FileText size={14} /> {t.tabs.questions} 
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'questions' ? 'bg-indigo-100 text-indigo-700' : 'bg-white/50 text-slate-500'}`}>{questions.length}</span>
          </button>
        </div>

        {/* BODY CONTENT */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-6">
          
          {/* 🟢 FLATTENED SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto space-y-6">
              
              {/* Duration Settings (Inline) */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <label className="text-[13px] font-bold text-slate-800 flex items-center gap-2">
                    <Clock size={16} className="text-indigo-500"/> {t.settings.duration}
                </label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {durationOptions.map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setSettings({ ...settings, duration: mins })}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all border shadow-sm ${
                        settings.duration === mins ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-white/60 text-slate-600 hover:border-indigo-200'
                      }`}
                    >
                      {mins === 0 ? t.settings.none : `${mins} ${t.settings.mins}`}
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:inline">{t.settings.custom}</span>
                    <input 
                      type="number" min="0" value={settings.duration}
                      onChange={(e) => setSettings({...settings, duration: Number(e.target.value)})}
                      className="w-16 px-2 py-1.5 bg-white border border-white/60 shadow-sm rounded-lg text-[13px] font-bold text-center text-slate-800 focus:border-indigo-400 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-indigo-100/50" /> {/* Divider */}

              {/* Shuffle Switch (Inline) */}
              <div className="flex items-center justify-between">
                <div>
                    <div className="text-[13px] font-bold text-slate-800">{t.settings.shuffleTitle}</div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">{t.settings.shuffleDesc}</p>
                </div>
                <button 
                    onClick={() => setSettings({...settings, shuffle: !settings.shuffle})}
                    className={`w-10 h-6 rounded-full transition-colors relative shadow-inner ${settings.shuffle ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                    <span className={`block w-4 h-4 bg-white rounded-full shadow-sm absolute top-1 left-1 transition-transform duration-300 ${settings.shuffle ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="h-px w-full bg-indigo-100/50" /> {/* Divider */}

              {/* Visibility Options (Compact Grid) */}
              <div>
                <label className="text-[13px] font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <Shield size={16} className="text-indigo-500"/> {t.settings.securityTitle}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Never */}
                  <button onClick={() => setSettings({...settings, resultsVisibility: 'never'})} className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left transition-all shadow-sm ${settings.resultsVisibility === 'never' ? 'border-slate-800 bg-slate-800 text-white' : 'border-white/60 hover:border-slate-300 bg-white text-slate-700'}`}>
                    <div className={`p-1.5 rounded-lg shrink-0 ${settings.resultsVisibility === 'never' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}><EyeOff size={16} /></div>
                    <div className="leading-tight">
                      <p className="text-[12px] font-bold mb-0.5">{t.settings.never.title}</p>
                      <p className={`text-[9px] ${settings.resultsVisibility === 'never' ? 'text-slate-300' : 'text-slate-500'}`}>{t.settings.never.desc}</p>
                    </div>
                  </button>
                  {/* After Deadline */}
                  <button onClick={() => setSettings({...settings, resultsVisibility: 'after_due'})} className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left transition-all shadow-sm ${settings.resultsVisibility === 'after_due' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-white/60 hover:border-emerald-300 bg-white text-slate-700'}`}>
                    <div className={`p-1.5 rounded-lg shrink-0 ${settings.resultsVisibility === 'after_due' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'}`}><CalendarClock size={16} /></div>
                    <div className="leading-tight">
                      <p className="text-[12px] font-bold mb-0.5">{t.settings.afterDue.title}</p>
                      <p className={`text-[9px] ${settings.resultsVisibility === 'after_due' ? 'text-emerald-100' : 'text-slate-500'}`}>{t.settings.afterDue.desc}</p>
                    </div>
                  </button>
                  {/* Always */}
                  <button onClick={() => setSettings({...settings, resultsVisibility: 'always'})} className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left transition-all shadow-sm ${settings.resultsVisibility === 'always' ? 'border-amber-500 bg-amber-500 text-white' : 'border-white/60 hover:border-amber-300 bg-white text-slate-700'}`}>
                    <div className={`p-1.5 rounded-lg shrink-0 ${settings.resultsVisibility === 'always' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-500'}`}><Eye size={16} /></div>
                    <div className="leading-tight">
                      <p className="text-[12px] font-bold mb-0.5">{t.settings.always.title}</p>
                      <p className={`text-[9px] ${settings.resultsVisibility === 'always' ? 'text-amber-100' : 'text-slate-500'}`}>{t.settings.always.desc}</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="h-px w-full bg-indigo-100/50" /> {/* Divider */}

              {/* Danger Zone (Inline) */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className="text-[11px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5"><AlertTriangle size={14} /> {t.settings.danger}</p>
                <div className="flex gap-2 w-full sm:w-auto">
                   <button onClick={handleArchiveToggle} className="flex-1 sm:flex-none py-2 px-4 bg-white/80 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-white transition-all flex items-center justify-center gap-1.5 text-[12px] shadow-sm">
                     {settings.status === 'active' ? <><Archive size={14}/> {t.settings.archive}</> : <><RefreshCw size={14}/> {t.settings.restore}</>}
                   </button>
                   <button onClick={handleDeleteTest} className="flex-1 sm:flex-none py-2 px-4 bg-red-50 border border-red-200 rounded-lg font-bold text-red-600 hover:bg-red-100 transition-all flex items-center justify-center gap-1.5 text-[12px] shadow-sm">
                     <Trash2 size={14}/> {t.settings.delete}
                   </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB: QUESTIONS */}
          {activeTab === 'questions' && (
            <div className="space-y-3 max-w-4xl mx-auto">
              {questions.map((q, idx) => (
                <div key={q.id} className="bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl border border-indigo-100/50 shadow-sm hover:shadow-md transition-shadow">
                    <CartItem question={q} index={idx + 1} onRemove={() => handleRemoveQuestion(q.id)} />
                </div>
              ))}
              {questions.length === 0 && (
                <div className="text-center py-12 bg-white/50 rounded-2xl border-2 border-dashed border-indigo-200/50 flex flex-col items-center">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-3 shadow-sm"><AlertTriangle size={24} className="text-slate-300"/></div>
                  <span className="text-[14px] font-bold text-slate-500">{t.questions.empty}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 🟢 COMPACT FOOTER */}
        <div className="px-5 py-3 border-t border-indigo-100/50 bg-white/40 backdrop-blur-md flex justify-end shrink-0 z-20">
           <button 
             onClick={handleSave}
             disabled={isSaving}
             className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-70 active:scale-95 text-[13px]"
           >
             {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>}
             {isSaving ? t.buttons.saving : t.buttons.save}
           </button>
        </div>
      </div>
    </div>
  );
}
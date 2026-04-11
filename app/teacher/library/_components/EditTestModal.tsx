'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  X, Save, Trash2, Archive, RefreshCw, Settings, FileText, 
  Clock, CheckCircle, Shield, Eye, EyeOff, CalendarClock, AlertTriangle, PenLine 
} from 'lucide-react';
import CartItem from '../../create/_components/CartItem'; // Adjust path if needed
import toast from 'react-hot-toast';
import { useTeacherLanguage } from '@/app/teacher/layout';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

// --- TRANSLATION DICTIONARY ---
const EDIT_TEST_TRANSLATIONS: Record<string, any> = {
  uz: {
    title: "Testni Boshqarish", tabs: { settings: "Sozlamalar", questions: "Savollar" },
    settings: {
      name: "Test Nomi", duration: "Vaqt", mins: "daq", none: "Cheklovsiz", custom: "MAXSUS", unlimited: "(Cheklovsiz)",
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
  // ... (Add EN and RU dicts back here to save space)
};

interface Props { test: any; isOpen: boolean; onClose: () => void; }

export default function EditTestModal({ test, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'settings' | 'questions'>('settings');
  const [isSaving, setIsSaving] = useState(false);
  const { lang } = useTeacherLanguage();
  const t = EDIT_TEST_TRANSLATIONS[lang] || EDIT_TEST_TRANSLATIONS['uz'];

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [settings, setSettings] = useState({
    title: '', duration: 0, shuffle: false, resultsVisibility: 'never' as 'always' | 'never' | 'after_due', status: 'active'
  });
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (test) {
      let visibility = test.resultsVisibility;
      if (!visibility) visibility = test.showResults ? 'always' : 'never';
      setSettings({ title: test.title || '', duration: test.duration || 0, shuffle: test.shuffle || false, resultsVisibility: visibility, status: test.status || 'active' });
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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></motion.div>
          
          <motion.div 
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-3xl h-[85vh] sm:h-[80vh] flex flex-col overflow-hidden shadow-2xl z-10"
          >
            
            {/* 🟢 HEADER */}
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center z-20 shrink-0 bg-white">
              <div className="flex-1 mr-4 min-w-0">
                <div className="flex items-center gap-2 group">
                  <input 
                    type="text" value={settings.title} onChange={(e) => setSettings({...settings, title: e.target.value})} placeholder={t.settings.name}
                    className="text-[16px] md:text-[18px] font-black text-slate-900 bg-transparent border-none outline-none w-full placeholder:text-slate-400 focus:ring-0 p-0 truncate"
                  />
                  <PenLine size={14} className="text-slate-300 group-focus-within:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hidden sm:block" />
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PIN:</span>
                  <span className="bg-slate-50 text-indigo-600 font-mono text-[11px] font-black px-2 py-0.5 rounded-md border border-slate-200">{test.accessCode}</span>
                </div>
              </div>
              <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl transition-colors shrink-0">
                <X size={20}/>
              </button>
            </div>

            {/* 🟢 TABS */}
            <div className="px-5 flex border-b border-slate-100 z-10 shrink-0 bg-white">
              <button onClick={() => setActiveTab('settings')} className={`py-3 px-2 mr-6 text-[13px] md:text-[14px] font-black flex items-center gap-2 border-b-2 transition-all ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                <Settings size={16} strokeWidth={2.5} /> {t.tabs.settings}
              </button>
              <button onClick={() => setActiveTab('questions')} className={`py-3 px-2 text-[13px] md:text-[14px] font-black flex items-center gap-2 border-b-2 transition-all ${activeTab === 'questions' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                <FileText size={16} strokeWidth={2.5} /> {t.tabs.questions} 
                <span className={`px-2 py-0.5 rounded-md text-[10px] ${activeTab === 'questions' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{questions.length}</span>
              </button>
            </div>

            {/* 🟢 SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-6 bg-slate-50/50">
              
              {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  
                  {/* Duration */}
                  <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                        <Clock size={14} className="text-indigo-500"/> {t.settings.duration}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {durationOptions.map((mins) => (
                        <button key={mins} onClick={() => setSettings({ ...settings, duration: mins })} className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all border ${settings.duration === mins ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                          {mins === 0 ? t.settings.none : `${mins} ${t.settings.mins}`}
                        </button>
                      ))}
                      <div className="flex items-center gap-2 px-2 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">{t.settings.custom}</span>
                        <input type="number" min="0" value={settings.duration} onChange={(e) => setSettings({...settings, duration: Number(e.target.value)})} className="w-14 bg-transparent text-[13px] font-bold text-center text-slate-800 outline-none py-2" />
                      </div>
                    </div>
                  </div>

                  {/* Shuffle */}
                  <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-[14px] font-black text-slate-800">{t.settings.shuffleTitle}</div>
                        <p className="text-[12px] text-slate-500 font-medium mt-0.5">{t.settings.shuffleDesc}</p>
                    </div>
                    <button onClick={() => setSettings({...settings, shuffle: !settings.shuffle})} className={`w-12 h-7 rounded-full transition-colors relative shadow-inner ${settings.shuffle ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                        <span className={`block w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 left-1 transition-transform duration-300 ${settings.shuffle ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Visibility */}
                  <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                        <Shield size={14} className="text-indigo-500"/> {t.settings.securityTitle}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button onClick={() => setSettings({...settings, resultsVisibility: 'never'})} className={`p-3 rounded-xl border-2 flex items-center gap-3 text-left transition-all ${settings.resultsVisibility === 'never' ? 'border-slate-800 bg-slate-800 text-white shadow-md' : 'border-slate-100 hover:border-slate-300 bg-slate-50 text-slate-700'}`}>
                        <div className={`p-2 rounded-lg shrink-0 ${settings.resultsVisibility === 'never' ? 'bg-white/20 text-white' : 'bg-white shadow-sm text-slate-500'}`}><EyeOff size={16} /></div>
                        <div className="leading-tight"><p className="text-[13px] font-bold mb-0.5">{t.settings.never.title}</p><p className={`text-[10px] font-medium ${settings.resultsVisibility === 'never' ? 'text-slate-300' : 'text-slate-500'}`}>{t.settings.never.desc}</p></div>
                      </button>
                      <button onClick={() => setSettings({...settings, resultsVisibility: 'after_due'})} className={`p-3 rounded-xl border-2 flex items-center gap-3 text-left transition-all ${settings.resultsVisibility === 'after_due' ? 'border-emerald-600 bg-emerald-600 text-white shadow-md' : 'border-slate-100 hover:border-emerald-300 bg-slate-50 text-slate-700'}`}>
                        <div className={`p-2 rounded-lg shrink-0 ${settings.resultsVisibility === 'after_due' ? 'bg-white/20 text-white' : 'bg-white shadow-sm text-emerald-600'}`}><CalendarClock size={16} /></div>
                        <div className="leading-tight"><p className="text-[13px] font-bold mb-0.5">{t.settings.afterDue.title}</p><p className={`text-[10px] font-medium ${settings.resultsVisibility === 'after_due' ? 'text-emerald-100' : 'text-slate-500'}`}>{t.settings.afterDue.desc}</p></div>
                      </button>
                      <button onClick={() => setSettings({...settings, resultsVisibility: 'always'})} className={`p-3 rounded-xl border-2 flex items-center gap-3 text-left transition-all ${settings.resultsVisibility === 'always' ? 'border-amber-500 bg-amber-500 text-white shadow-md' : 'border-slate-100 hover:border-amber-300 bg-slate-50 text-slate-700'}`}>
                        <div className={`p-2 rounded-lg shrink-0 ${settings.resultsVisibility === 'always' ? 'bg-white/20 text-white' : 'bg-white shadow-sm text-amber-500'}`}><Eye size={16} /></div>
                        <div className="leading-tight"><p className="text-[13px] font-bold mb-0.5">{t.settings.always.title}</p><p className={`text-[10px] font-medium ${settings.resultsVisibility === 'always' ? 'text-amber-100' : 'text-slate-500'}`}>{t.settings.always.desc}</p></div>
                      </button>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-red-50 p-4 md:p-5 rounded-2xl border border-red-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[11px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5 w-full sm:w-auto"><AlertTriangle size={14} /> {t.settings.danger}</p>
                    <div className="flex gap-2 w-full sm:w-auto">
                       <button onClick={handleArchiveToggle} className="flex-1 sm:flex-none py-2.5 px-4 bg-white border border-red-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-[13px] shadow-sm">
                         {settings.status === 'active' ? <><Archive size={16}/> {t.settings.archive}</> : <><RefreshCw size={16}/> {t.settings.restore}</>}
                       </button>
                       <button onClick={handleDeleteTest} className="flex-1 sm:flex-none py-2.5 px-4 bg-red-600 border border-red-600 rounded-xl font-bold text-white hover:bg-red-700 transition-all flex items-center justify-center gap-2 text-[13px] shadow-sm shadow-red-600/20">
                         <Trash2 size={16}/> {t.settings.delete}
                       </button>
                    </div>
                  </div>

                </div>
              )}

              {activeTab === 'questions' && (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm"><CartItem question={q} index={idx + 1} onRemove={() => handleRemoveQuestion(q.id)} /></div>
                  ))}
                  {questions.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-3 shadow-sm"><AlertTriangle size={24} className="text-slate-400"/></div>
                      <span className="text-[14px] font-bold text-slate-500">{t.questions.empty}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 🟢 FOOTER */}
            <div className="px-5 py-4 border-t border-slate-100 bg-white flex justify-end shrink-0 z-20 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4">
               <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95 text-[14px]">
                 {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>}
                 {isSaving ? t.buttons.saving : t.buttons.save}
               </button>
            </div>
            
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body // 🟢 TELLS THE PORTAL TO RENDER IN THE BODY
  );
}
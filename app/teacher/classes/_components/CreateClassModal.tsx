'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { X, Hash, CheckCircle, Loader2, BookOpen, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/AuthContext';
import { useTeacherLanguage } from '@/app/teacher/layout';

// --- TRANSLATION DICTIONARY ---
const CREATE_CLASS_TRANSLATIONS = {
  uz: {
    title: "Yangi Sinf Yaratish", nameLabel: "Sinf Nomi", namePlace: "Masalan: Algebra 9-B", descLabel: "Tavsif (Ixtiyoriy)", descPlace: "Ertalabki guruh...", codeLabel: "Kirish Kodi", helpText: "O'quvchilar qo'shilish uchun ushbu koddan foydalanadilar.", btn: "Yaratish", success: "Sinf Muvaffaqiyatli Yaratildi!", fail: "Sinf yaratishda xatolik"
  },
  en: {
    title: "Create New Class", nameLabel: "Class Name", namePlace: "e.g. Algebra 9-B", descLabel: "Description (Optional)", descPlace: "Morning session...", codeLabel: "Join Code", helpText: "Students will use this code to request access.", btn: "Create Class", success: "Class Created Successfully!", fail: "Failed to create class"
  },
  ru: {
    title: "Создать Новый Класс", nameLabel: "Название Класса", namePlace: "Напр.: Алгебра 9-Б", descLabel: "Описание (Необязательно)", descPlace: "Утренняя группа...", codeLabel: "Код Входа", helpText: "Ученики будут использовать этот код для входа.", btn: "Создать", success: "Класс успешно создан!", fail: "Ошибка создания класса"
  }
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateClassModal({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = CREATE_CLASS_TRANSLATIONS[lang] || CREATE_CLASS_TRANSLATIONS['en'];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-generate secure 6-char code (Executes only once on mount)
  const [joinCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!title.trim() || !user) return;
    setIsSaving(true);

    try {
      await addDoc(collection(db, 'classes'), {
        title: title.trim(),
        description: description.trim(),
        joinCode,
        teacherId: user.uid,
        teacherName: user.displayName,
        studentIds: [], 
        studentCount: 0,
        createdAt: serverTimestamp(),
      });

      toast.success(t.success);
      // Reset state so next time it opens it's fresh
      setTitle('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(t.fail);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Soft Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      {/* Premium Modal Container */}
      <div className="relative bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 fade-in duration-300 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-6 md:px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
               <BookOpen size={20} strokeWidth={2.5} />
            </div>
            <h2 className="text-[18px] font-black text-slate-900 tracking-tight">{t.title}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 md:p-8 space-y-5 overflow-y-auto custom-scrollbar">
          
          {/* Title Input */}
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.nameLabel}</label>
            <input 
              type="text" 
              placeholder={t.namePlace}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[14px] font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
              autoFocus
            />
          </div>

          {/* Description Input */}
          <div>
             <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.descLabel}</label>
             <textarea 
               rows={2}
               placeholder={t.descPlace}
               value={description}
               onChange={(e) => setDescription(e.target.value)}
               className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none transition-all"
             />
          </div>

          {/* 🟢 UPGRADED: Glowing Join Code Box */}
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-violet-50 p-5 rounded-2xl border border-indigo-100/60 flex items-center justify-between group mt-2">
            {/* Subtle background flare */}
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/40 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="relative z-10">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <Sparkles size={12} className="text-indigo-500" /> {t.codeLabel}
              </p>
              <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 tracking-[0.2em] font-mono leading-none py-1 drop-shadow-sm">
                {joinCode}
              </p>
            </div>
            
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-400 shadow-[0_2px_10px_rgb(99,102,241,0.1)] border border-indigo-50 relative z-10">
              <Hash size={24} strokeWidth={2.5} />
            </div>
          </div>
          
          <p className="text-[12px] font-medium text-center text-slate-500">{t.helpText}</p>
        </div>

        {/* FOOTER */}
        <div className="px-6 md:px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
          <button 
            onClick={handleCreate}
            disabled={isSaving || !title.trim()}
            className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-[14px]"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle size={18} strokeWidth={2.5}/>}
            {t.btn}
          </button>
        </div>
        
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  X, Settings, Shield, Edit2, Key, RefreshCw, 
  Lock, Unlock, Loader2, Copy 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTeacherLanguage } from '@/app/teacher/layout';

const SETTINGS_TRANSLATIONS = {
  uz: {
    title: "Sinf Sozlamalari", save: "Saqlash", cancel: "Bekor qilish",
    profile: { title: "Sinf Profili", name: "Sinf Nomi", desc: "Tavsif (Ixtiyoriy)" },
    security: { title: "Xavfsizlik va Kirish", code: "Kirish Kodi", copy: "Nusxalash", newCode: "Yangi kod yaratish", lock: "Sinfni qulflash", lockDesc: "Yangi o'quvchilar qo'shilishini taqiqlash" },
    toasts: { updated: "Sozlamalar saqlandi", copied: "Kod nusxalandi", syncError: "Kodni yangilashda xatolik" }
  },
  en: {
    title: "Class Settings", save: "Save Changes", cancel: "Cancel",
    profile: { title: "Class Profile", name: "Class Name", desc: "Description (Optional)" },
    security: { title: "Security & Access", code: "Join Code", copy: "Copy Code", newCode: "Regenerate Code", lock: "Lock Class", lockDesc: "Prevent new students from requesting to join" },
    toasts: { updated: "Settings saved", copied: "Code copied to clipboard", syncError: "Failed to regenerate code" }
  },
  ru: {
    title: "Настройки Класса", save: "Сохранить", cancel: "Отмена",
    profile: { title: "Профиль Класса", name: "Название", desc: "Описание (Необяз.)" },
    security: { title: "Безопасность", code: "Код входа", copy: "Скопировать", newCode: "Сгенерировать новый", lock: "Закрыть класс", lockDesc: "Запретить новые заявки на вступление" },
    toasts: { updated: "Настройки сохранены", copied: "Код скопирован", syncError: "Ошибка обновления кода" }
  }
};

interface Props {
  classId: string;
  classData: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ClassSettingsModal({ classId, classData, isOpen, onClose }: Props) {
  const { lang } = useTeacherLanguage();
  const t = SETTINGS_TRANSLATIONS[lang] || SETTINGS_TRANSLATIONS['en'];

  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // Added syncing state for safety
  
  // Form State
  const [title, setTitle] = useState(classData?.title || '');
  const [description, setDescription] = useState(classData?.description || '');
  const [isLocked, setIsLocked] = useState(classData?.isLocked || false);

  if (!isOpen || !classData) return null;

  const handleSaveProfile = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'classes', classId), {
        title: title.trim(),
        description: description.trim(),
        isLocked
      });
      toast.success(t.toasts.updated);
      onClose();
    } catch (e) {
      console.error("Save Error:", e);
      toast.error("Failed to update");
    } finally {
      setIsSaving(false);
    }
  };

  // 🟢 FIXED SYNC FUNCTION
  const handleRegenerateCode = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    
    try {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let newCode = "";
      for (let i = 0; i < 6; i++) {
        newCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      await updateDoc(doc(db, 'classes', classId), { 
        joinCode: newCode 
      });
      
      toast.success(t.toasts.updated);
    } catch (e) {
      console.error("Sync Error Details:", e);
      toast.error(t.toasts.syncError);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative bg-[#FAFAFA] rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 fade-in duration-300 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-6 md:px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm shrink-0">
               <Settings size={20} strokeWidth={2.5} />
            </div>
            <h2 className="text-[18px] font-black text-slate-900 tracking-tight">{t.title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
          
          {/* Section 1: Class Profile */}
          <div className="space-y-4">
            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <Edit2 size={14}/> {t.profile.title}
            </h3>
            <div className="bg-white rounded-[1.5rem] border border-slate-200/80 shadow-sm overflow-hidden p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.profile.name}</label>
                <input 
                  type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-[1rem] text-[14px] font-bold text-slate-900 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.profile.desc}</label>
                <textarea 
                  rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-[1rem] text-[14px] font-medium text-slate-900 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Security & Access */}
          <div className="space-y-4">
            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <Shield size={14}/> {t.security.title}
            </h3>
            <div className="bg-white rounded-[1.5rem] border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
              
              {/* Join Code */}
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0"><Key size={20}/></div>
                  <div>
                    <p className="text-[14px] font-black text-slate-800">{t.security.code}</p>
                    <p className="text-[18px] font-mono font-black text-indigo-600 tracking-widest mt-0.5">{classData.joinCode}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => { navigator.clipboard.writeText(classData.joinCode); toast.success(t.toasts.copied); }} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[12px] font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 shadow-sm flex items-center gap-1.5"><Copy size={14}/> {t.security.copy}</button>
                  
                  {/* 🟢 FIXED SYNC BUTTON */}
                  <button 
                    onClick={handleRegenerateCode} 
                    disabled={isSyncing}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[12px] font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} /> {t.security.newCode}
                  </button>
                </div>
              </div>

              <div className="h-px bg-slate-100 mx-5"></div>

              {/* Lock Class */}
              <div className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${isLocked ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>
                    {isLocked ? <Lock size={20}/> : <Unlock size={20}/>}
                  </div>
                  <div>
                    <p className="text-[14px] font-black text-slate-800">{t.security.lock}</p>
                    <p className="text-[12px] font-medium text-slate-500 mt-0.5">{t.security.lockDesc}</p>
                  </div>
                </div>
                {/* Custom Toggle */}
                <button onClick={() => setIsLocked(!isLocked)} className={`w-12 h-6 rounded-full p-1 transition-colors relative shrink-0 ${isLocked ? 'bg-red-500' : 'bg-slate-200'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isLocked ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="px-6 md:px-8 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl text-[13px] transition-colors">
            {t.cancel}
          </button>
          <button onClick={handleSaveProfile} disabled={isSaving || !title.trim()} className="px-8 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 text-[13px] disabled:opacity-50">
            {isSaving && <Loader2 className="animate-spin" size={16}/>} {t.save}
          </button>
        </div>

      </div>
    </div>
  );
}
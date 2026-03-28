'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { X, Search, UserPlus, Loader2, AtSign, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/AuthContext';
import { useTeacherLanguage } from '@/app/teacher/layout';

// --- TRANSLATION DICTIONARY ---
const ADD_STUDENT_TRANSLATIONS = {
  uz: {
    title: "O'quvchini Qo'shish", placeholder: "username orqali qidirish",
    toasts: { self: "Siz o'zingizni sinfga qo'sha olmaysiz!", teacher: "Boshqa o'qituvchilarni qo'sha olmaysiz.", notFound: "Foydalanuvchi topilmadi", searchFail: "Qidiruvda xatolik", success: "{name} sinfga qo'shildi!", addFail: "Qo'shishda xatolik" }
  },
  en: {
    title: "Add Student", placeholder: "Search by username",
    toasts: { self: "You cannot add yourself!", teacher: "You cannot add other teachers.", notFound: "User not found", searchFail: "Search failed", success: "Added {name} to class!", addFail: "Failed to add student" }
  },
  ru: {
    title: "Добавить ученика", placeholder: "Поиск по username",
    toasts: { self: "Нельзя добавить себя!", teacher: "Нельзя добавить учителей.", notFound: "Пользователь не найден", searchFail: "Ошибка поиска", success: "{name} добавлен в класс!", addFail: "Не удалось добавить" }
  }
};

interface Props {
  classId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AddStudentModal({ classId, isOpen, onClose }: Props) {
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = ADD_STUDENT_TRANSLATIONS[lang] || ADD_STUDENT_TRANSLATIONS['en'];

  const [username, setUsername] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!username.trim()) return;
    setIsSearching(true);
    setFoundUser(null);

    try {
      const cleanName = username.replace('@', '').toLowerCase();
      const usernameRef = doc(db, 'usernames', cleanName);
      const usernameSnap = await getDoc(usernameRef);

      if (usernameSnap.exists()) {
        const uid = usernameSnap.data().uid;
        const userSnap = await getDoc(doc(db, 'users', uid));
        
        if (userSnap.exists()) {
          const userData = userSnap.data();

          if (uid === user?.uid) { toast.error(t.toasts.self); setIsSearching(false); return; }
          if (userData.role === 'teacher') { toast.error(t.toasts.teacher); setIsSearching(false); return; }

          setFoundUser({ uid, ...userData });
        }
      } else {
        toast.error(t.toasts.notFound);
      }
    } catch (error) {
      toast.error(t.toasts.searchFail);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddStudent = async () => {
    if (!foundUser) return;
    setIsAdding(true);
    try {
      const classRef = doc(db, 'classes', classId);
      await updateDoc(classRef, { studentIds: arrayUnion(foundUser.uid) });
      
      toast.success(t.toasts.success.replace("{name}", foundUser.displayName));
      setFoundUser(null);
      setUsername('');
      onClose();
    } catch (error) {
      toast.error(t.toasts.addFail);
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setFoundUser(null);
    setUsername('');
    onClose();
  };

  const hasInput = username.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={handleClose}></div>
      
      <div className="relative bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 fade-in duration-300">
        
        {/* HEADER */}
        <div className="px-6 md:px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
               <Search size={20} strokeWidth={2.5} />
            </div>
            <h2 className="text-[18px] font-black text-slate-900 tracking-tight">{t.title}</h2>
          </div>
          <button 
            onClick={handleClose} 
            className="w-9 h-9 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 md:p-8 bg-[#FAFAFA]">
          
          {/* 🟢 UPGRADED: Android-Style Search Input */}
          <div className="relative group">
            <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder={t.placeholder}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-11 pr-14 py-4 bg-white border border-slate-200/80 rounded-[1rem] text-[14px] font-bold text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
              autoFocus
            />
            
            {/* Square Arrow Button (Matches Android) */}
            <button 
              onClick={handleSearch}
              disabled={isSearching || !hasInput}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm
                ${hasInput && !isSearching ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95' : 'bg-slate-100 text-slate-400 border border-slate-200'}
              `}
            >
              {isSearching ? <Loader2 className="animate-spin" size={18}/> : <ArrowRight size={18} strokeWidth={3}/>}
            </button>
          </div>

          {/* Found User Result Card */}
          {foundUser && (
            <div className="mt-6 bg-white border border-emerald-200/80 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-[0_4px_20px_rgb(16,185,129,0.06)] animate-in fade-in slide-in-from-bottom-4 duration-300 relative overflow-hidden group">
              
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center gap-4 relative z-10 min-w-0">
                <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-[1rem] flex items-center justify-center font-black text-white text-[18px] shadow-md shadow-emerald-500/20 shrink-0 border-2 border-white">
                  {foundUser.displayName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-slate-900 text-[15px] truncate">{foundUser.displayName}</p>
                  <p className="text-[12px] font-bold text-slate-400 truncate">@{foundUser.username || username.replace('@', '')}</p>
                </div>
              </div>
              
              {/* 🟢 UPGRADED: Android-Style Square Add Button */}
              <button 
                onClick={handleAddStudent}
                disabled={isAdding}
                className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[1rem] transition-all disabled:opacity-50 shadow-md shadow-emerald-500/20 active:scale-95 flex items-center justify-center relative z-10 shrink-0"
              >
                {isAdding ? <Loader2 className="animate-spin" size={20}/> : <UserPlus size={20} strokeWidth={2.5}/>}
              </button>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
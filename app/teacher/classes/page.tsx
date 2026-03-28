'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { Users, Plus, Loader2, BookOpen, Sparkles } from 'lucide-react';
import ClassCard from './_components/ClassCard';
import CreateClassModal from './_components/CreateClassModal';
import { useTeacherLanguage } from '@/app/teacher/layout'; 

// --- TRANSLATION DICTIONARY ---
const CLASSES_TRANSLATIONS = {
  uz: {
    title: "Mening Sinflarim", subtitle: "O'quvchilar, ro'yxatlar va so'rovlarni boshqaring.", createBtn: "Yangi Sinf Yaratish",
    empty: { title: "Sinflar topilmadi.", desc: "O'quvchilarni taklif qilish uchun birinchi sinfingizni yarating.", btn: "Sinf Yaratish" }
  },
  en: {
    title: "My Classes", subtitle: "Manage students, rosters, and join requests.", createBtn: "Create New Class",
    empty: { title: "No classes found.", desc: "Create your first class to invite students.", btn: "Create Class" }
  },
  ru: {
    title: "Мои Классы", subtitle: "Управление учениками, списками и запросами.", createBtn: "Создать Класс",
    empty: { title: "Классы не найдены.", desc: "Создайте свой первый класс, чтобы пригласить учеников.", btn: "Создать Класс" }
  }
};

export default function ClassesPage() {
  const { user, loading } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = CLASSES_TRANSLATIONS[lang] || CLASSES_TRANSLATIONS['en'];

  const [classes, setClasses] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'classes'),
      where('teacherId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoadingData(false);
    });
    return () => unsubscribe();
  }, [user]);

  if (loading || isLoadingData) {
    return (
      <div className="min-h-[100dvh] bg-[#FAFAFA] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32}/>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      
      {/* Create Modal */}
      <CreateClassModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-10 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* 🟢 PREMIUM HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
               <Users size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{t.title}</h1>
              <p className="text-[13px] md:text-[14px] font-medium text-slate-500 mt-0.5">{t.subtitle}</p>
            </div>
          </div>

          <button 
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold shadow-sm transition-all active:scale-95 w-full sm:w-auto text-[14px]"
          >
            <Plus size={18} strokeWidth={2.5} /> 
            <span>{t.createBtn}</span>
          </button>
        </div>

        {/* 🟢 CLASS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {classes.length > 0 ? (
            classes.map((cls, idx) => (
              <div key={cls.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${(idx % 10) * 40}ms`, animationFillMode: 'both' }}>
                <ClassCard cls={cls} />
              </div>
            ))
          ) : (
            
            <div className="col-span-full py-16 md:py-24 text-center flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-[2rem] shadow-sm relative overflow-hidden group">
              {/* 🟢 PREMIUM EMPTY STATE */}
              
              {/* Subtle Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-50/80 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0"></div>
              
              <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-5 shadow-sm relative z-10">
                <BookOpen size={28} className="text-slate-300" />
              </div>
              
              <h3 className="text-[18px] font-black text-slate-800 tracking-tight relative z-10">{t.empty.title}</h3>
              <p className="text-[14px] font-medium text-slate-500 mt-1.5 mb-8 max-w-sm relative z-10">{t.empty.desc}</p>
              
              <button 
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all active:scale-95 text-[14px] relative z-10"
              >
                <Sparkles size={16} /> {t.empty.btn}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
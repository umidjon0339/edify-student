'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { Users, Plus, BookOpen, Sparkles } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import ClassCard from './_components/ClassCard';
import CreateClassModal from './_components/CreateClassModal';
import { useTeacherLanguage } from '@/app/teacher/layout'; 

// --- TRANSLATION DICTIONARY ---
const CLASSES_TRANSLATIONS: Record<string, any> = {
  uz: {
    title: "Mening Sinflarim", subtitle: "O'quvchilar, ro'yxatlar va so'rovlarni boshqaring.", createBtn: "Yangi Sinf",
    empty: { title: "Sinflar topilmadi", desc: "O'quvchilarni taklif qilish uchun birinchi sinfingizni yarating.", btn: "Sinf Yaratish" }
  },
  en: {
    title: "My Classes", subtitle: "Manage students, rosters, and join requests.", createBtn: "New Class",
    empty: { title: "No classes found", desc: "Create your first class to invite students.", btn: "Create Class" }
  },
  ru: {
    title: "Мои Классы", subtitle: "Управление учениками, списками и запросами.", createBtn: "Новый Класс",
    empty: { title: "Классы не найдены", desc: "Создайте свой первый класс, чтобы пригласить учеников.", btn: "Создать Класс" }
  }
};

const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

export default function ClassesPage() {
  const { user, loading } = useAuth() as any;
  const { lang } = useTeacherLanguage();
  const t = CLASSES_TRANSLATIONS[lang] || CLASSES_TRANSLATIONS['uz'];

  const [classes, setClasses] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Dynamic Theme Palette for Cards
  const THEMES = ['blue', 'violet', 'emerald', 'rose', 'amber', 'cyan'];

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'classes'), where('teacherId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoadingData(false);
    });
    return () => unsubscribe();
  }, [user]);

  if (loading || isLoadingData) return <ClassesSkeleton />;

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-12">
      
      <CreateClassModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />

      <main className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 mt-4 md:mt-8 relative z-10">
        
        {/* 🟢 ULTRA MINIMALISTIC HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4 mb-5 md:mb-8 bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-indigo-50 border border-indigo-100 rounded-[10px] md:rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner shrink-0">
               <Users size={20} strokeWidth={2.5} className="md:w-7 md:h-7" />
            </div>
            <div>
              <h1 className="text-[18px] md:text-3xl font-black text-slate-900 tracking-tight leading-tight">{t.title}</h1>
              <p className="text-[11px] md:text-[14px] font-bold text-slate-400 md:font-medium md:text-slate-500 mt-0.5">{t.subtitle}</p>
            </div>
          </div>

          <button 
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 md:px-6 py-2.5 md:py-3.5 rounded-xl font-black shadow-md md:shadow-lg shadow-indigo-600/20 transition-all active:scale-95 w-full sm:w-auto text-[13px] md:text-[15px]"
          >
            <Plus size={16} strokeWidth={3} className="md:w-[18px] md:h-[18px]"/> {t.createBtn}
          </button>
        </div>

        {/* 🟢 CLASS GRID OR EMPTY STATE */}
        {classes.length > 0 ? (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {classes.map((cls, index) => {
              // Assign a color theme based on the index
              const themeColor = THEMES[index % THEMES.length];
              return <ClassCard key={cls.id} cls={cls} theme={themeColor} />;
            })}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="col-span-full py-12 md:py-24 text-center flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-[1.5rem] md:rounded-[2rem] shadow-sm relative overflow-hidden group mx-1 md:mx-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors duration-700 pointer-events-none z-0"></div>
            <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-50 border border-slate-100 rounded-[14px] md:rounded-2xl flex items-center justify-center mb-4 md:mb-5 shadow-sm relative z-10">
              <BookOpen size={24} className="text-slate-400 md:w-7 md:h-7" />
            </div>
            <h3 className="text-[16px] md:text-[20px] font-black text-slate-800 tracking-tight relative z-10">{t.empty.title}</h3>
            <p className="text-[12px] md:text-[14px] font-medium text-slate-500 mt-1 md:mt-1.5 mb-6 md:mb-8 max-w-sm relative z-10 px-4">{t.empty.desc}</p>
            <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all active:scale-95 text-[13px] md:text-[14px] relative z-10">
              <Sparkles size={16} /> {t.empty.btn}
            </button>
          </motion.div>
        )}

      </main>
    </div>
  );
}

// Skeleton Loader Component (Adjusted for minimal mobile layout)
const ClassesSkeleton = () => (
  <div className="min-h-[100dvh] bg-[#FAFAFA] px-3 sm:px-6 lg:px-8 pt-4 md:pt-10">
    <div className="max-w-6xl mx-auto">
      <div className="h-[120px] md:h-28 bg-slate-200 rounded-[1.5rem] md:rounded-[2rem] w-full animate-pulse mb-5 md:mb-8"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-[160px] md:h-48 bg-slate-200 rounded-[1.2rem] md:rounded-[2rem] animate-pulse"></div>)}
      </div>
    </div>
  </div>
);
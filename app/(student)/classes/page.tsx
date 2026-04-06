'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import JoinClassModal from './_components/JoinClassModal';
import { Users, ChevronRight, Plus, BookOpen, ArrowRight, School } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudentLanguage } from '../layout'; 

// --- TRANSLATION DICTIONARY ---
const CLASSES_TRANSLATIONS: any = {
  uz: {
    title: "Mening Sinflarim", subtitle: "O'qishni qoldirgan joydan davom eting.", joinBtn: "Qo'shilish", emptyTitle: "Sinflar topilmadi", emptyDesc: "Siz hali hech qanday sinfga yozilmagansiz. O'qituvchingizdan 6 xonali kodni so'rang!", emptyAction: "Hozir qo'shilish", students: "O'quvchilar", noDesc: "Tavsif yo'q."
  },
  en: {
    title: "My Classes", subtitle: "Continue where you left off.", joinBtn: "Join Class", emptyTitle: "No classes found", emptyDesc: "You haven't enrolled in any classes yet. Ask your teacher for a 6-digit Join Code!", emptyAction: "Join a class now", students: "Students", noDesc: "No description provided."
  },
  ru: {
    title: "Мои Классы", subtitle: "Продолжайте с того места, где остановились.", joinBtn: "Вступить", emptyTitle: "Классы не найдены", emptyDesc: "Вы еще не записаны ни в один класс. Попросите у учителя 6-значный код присоединения!", emptyAction: "Вступить сейчас", students: "Учеников", noDesc: "Описание отсутствует."
  }
};

// ============================================================================
// 🟢 GLOBAL CACHE (Survives page navigation, saves Firebase reads)
// ============================================================================
const globalClassesCache: Record<string, { data: any[], timestamp: number }> = {};
const CACHE_LIFESPAN = 60 * 1000; // 60 seconds

// ============================================================================
// 3. MAIN PAGE COMPONENT
// ============================================================================
export default function MyClassesPage() {
  const { user } = useAuth();
  const { lang } = useStudentLanguage();
  const t = CLASSES_TRANSLATIONS[lang] || CLASSES_TRANSLATIONS['en'];

  const [classes, setClasses] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  useEffect(() => {
    async function fetchClasses() {
      if (!user) return;

      const now = Date.now();
      const cached = globalClassesCache[user.uid];

      // 🟢 1. INSTANT CACHE LOAD
      if (cached) {
        setClasses(cached.data);
        setLoading(false); // Instantly remove skeleton loader
        
        // If data is fresh (< 60s old), stop here. ZERO FIREBASE READS!
        if (now - cached.timestamp < CACHE_LIFESPAN) {
          return;
        }
      } else {
        // Only show skeleton if we have no cache at all
        setLoading(true);
      }

      // 🟢 2. BACKGROUND FETCH (or initial fetch)
      try {
        const q = query(
          collection(db, 'classes'), 
          where('studentIds', 'array-contains', user.uid)
        );
        const snap = await getDocs(q);
        const fetchedClasses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // 🟢 3. UPDATE CACHE & UI
        globalClassesCache[user.uid] = {
          data: fetchedClasses,
          timestamp: Date.now()
        };
        
        setClasses(fetchedClasses);
      } catch (e) { 
        console.error("Error fetching classes:", e); 
      } finally { 
        setLoading(false); 
      }
    }
    
    fetchClasses();
  }, [user]);

  // --- SKELETON LOADING ---
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans pb-28 md:pb-12">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-pulse pt-8">
            <div className="space-y-3">
              <div className="h-10 w-48 bg-zinc-200 rounded-xl"></div>
              <div className="h-5 w-64 bg-zinc-200 rounded-lg"></div>
            </div>
            <div className="h-12 w-40 bg-zinc-200 rounded-xl"></div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-zinc-200 rounded-[2rem] border-2 border-zinc-100"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans pb-28 md:pb-12">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
        
        {/* MODAL */}
        <AnimatePresence>
          {isJoinModalOpen && (
            <JoinClassModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} lang={lang} />
          )}
        </AnimatePresence>
        
        {/* HEADER SECTION */}
        <div className="mb-10 pt-6 md:pt-4 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-zinc-900 flex items-center gap-3 tracking-tight">
              <div className="w-12 h-12 bg-blue-100 rounded-[1.2rem] text-blue-600 flex items-center justify-center border-2 border-blue-200">
                <School size={24} strokeWidth={2.5} />
              </div>
              {t.title}
            </h1>
            <p className="text-zinc-500 mt-2 font-bold text-[15px]">
              {t.subtitle}
            </p>
          </div>
          
          {/* JOIN BUTTON */}
          <button 
            onClick={() => setIsJoinModalOpen(true)}
            className="w-full md:w-auto px-6 py-3.5 bg-white text-zinc-800 font-black text-[14px] rounded-2xl border-2 border-zinc-200 border-b-4 hover:border-violet-200 hover:text-violet-600 active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Plus size={20} strokeWidth={3} /> {t.joinBtn}
          </button>
        </div>

        {/* CLASS GRID */}
        {classes.length === 0 ? (
          // 🟢 EMPTY STATE (Tactile Design)
          <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-zinc-300 flex flex-col items-center">
            <div className="w-24 h-24 bg-zinc-100 text-zinc-400 rounded-[2rem] flex items-center justify-center mb-6 border-2 border-zinc-200 rotate-12 hover:rotate-0 transition-transform">
              <BookOpen size={40} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 mb-2 tracking-tight">{t.emptyTitle}</h3>
            <p className="text-zinc-500 font-bold text-[15px] mb-8 max-w-sm mx-auto leading-relaxed">
              {t.emptyDesc}
            </p>
            <button 
              onClick={() => setIsJoinModalOpen(true)}
              className="px-8 py-4 bg-violet-500 text-white font-black text-[15px] rounded-2xl border-b-4 border-violet-700 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
            >
              {t.emptyAction} <ArrowRight size={18} strokeWidth={3} />
            </button>
          </div>
        ) : (
          // 🟢 LIST OF CLASSES (Tactile Cards)
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls, index) => (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link 
                  href={`/classes/${cls.id}`}
                  className="group bg-white rounded-[2rem] border-2 border-zinc-200 border-b-[6px] hover:border-violet-300 hover:border-b-violet-400 active:border-b-2 active:translate-y-[4px] transition-all flex flex-col justify-between h-full relative overflow-hidden"
                >
                  <div className="p-6 md:p-8">
                    <div className="flex justify-between items-start mb-5">
                      <span className="bg-zinc-100 text-zinc-600 border-2 border-zinc-200 text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl group-hover:bg-violet-100 group-hover:text-violet-700 group-hover:border-violet-200 transition-colors">
                        {cls.joinCode || 'CLASS'}
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 border-2 border-zinc-200 text-zinc-400 flex items-center justify-center group-hover:bg-violet-500 group-hover:text-white group-hover:border-violet-500 transition-all">
                         <ChevronRight size={20} strokeWidth={3} />
                      </div>
                    </div>
                    
                    <h3 className="text-2xl font-black text-zinc-900 group-hover:text-violet-600 transition-colors mb-3 line-clamp-2 tracking-tight leading-tight">
                      {cls.title}
                    </h3>
                    <p className="text-[14px] text-zinc-500 font-bold line-clamp-2 leading-relaxed h-10 mb-2">
                      {cls.description || t.noDesc}
                    </p>
                  </div>

                  <div className="px-6 md:px-8 py-5 bg-zinc-50 border-t-2 border-zinc-100 flex items-center justify-between mt-auto group-hover:bg-violet-50/50 transition-colors">
                    <div className="flex items-center gap-2 text-[12px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-violet-600">
                      <Users size={16} strokeWidth={3} />
                      {cls.studentIds?.length || 0} {t.students}
                    </div>
                    {cls.teacherName && (
                      <div className="flex items-center gap-2 text-[13px] font-black text-zinc-700 group-hover:text-violet-800 transition-colors">
                        <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 border-2 border-blue-200 flex items-center justify-center text-[10px]">
                          {cls.teacherName.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[100px]">{cls.teacherName}</span>
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
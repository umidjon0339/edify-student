"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot } from 'firebase/firestore'; 
import { useAuth } from '@/lib/AuthContext';
import { FolderOpen, Archive, Loader2, Search, Library, Sparkles, ChevronDown, Plus } from 'lucide-react'; 
import TestCard from '../_components/TestCard';
import EditTestModal from '../_components/EditTestModal';
import { useTeacherLanguage } from '@/app/teacher/layout';
import toast from 'react-hot-toast';
import { motion, Variants } from 'framer-motion';

// --- TRANSLATION DICTIONARY ---
const LIBRARY_TRANSLATIONS: any = {
  uz: {
    title: "Mening Kutubxonam",
    filters: { active: "Faol Testlar", archived: "Arxivlangan" },
    search: "Yuklanganlarni qidirish...",
    empty: { title: "Testlar topilmadi", desc: "Boshlash uchun yangi test yarating." },
    loadMore: "Yana yuklash",
    items: "Ta",
    createTest: "Yangi Test Yaratish"
  },
  en: {
    title: "My Library",
    filters: { active: "Active Tests", archived: "Archived" },
    search: "Filter loaded tests...",
    empty: { title: "No tests found", desc: "Create a new test to get started." },
    loadMore: "Load More",
    items: "Items",
    createTest: "Create New Test"
  },
  ru: {
    title: "Моя Библиотека",
    filters: { active: "Активные", archived: "Архив" },
    search: "Поиск по загруженным...",
    empty: { title: "Тесты не найдены", desc: "Создайте новый тест, чтобы начать." },
    loadMore: "Загрузить еще",
    items: "Шт",
    createTest: "Создать Тест"
  }
};

const PAGE_SIZE = 10;
const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

export default function LibraryPage() {
  const router = useRouter();
  const { user, loading } = useAuth() as any;
  const { lang } = useTeacherLanguage();
  const t = LIBRARY_TRANSLATIONS[lang] || LIBRARY_TRANSLATIONS['en'];

  // State
  const [tests, setTests] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Server-Side Filters 
  const [filterStatus, setFilterStatus] = useState<'active' | 'archived'>('active');

  // Pagination State
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Modal State
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Optimized Server-Side Fetching
  const fetchTests = useCallback(async (isLoadMore = false) => {
    if (!user) return;
    if (isLoadMore) setIsLoadingMore(true);
    else setIsLoadingData(true);

    try {
      let q = query(
        collection(db, 'custom_tests'),
        where('teacherId', '==', user.uid),
        where('status', '==', filterStatus),
        orderBy("createdAt", 'desc'),
        limit(PAGE_SIZE)
      );

      if (isLoadMore && lastDoc) q = query(q, startAfter(lastDoc));

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
        
        const fetchedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTests(prev => isLoadMore ? [...prev, ...fetchedData] : fetchedData);
      } else {
        setHasMore(false);
        if (!isLoadMore) setTests([]);
      }
    } catch (error: any) {
      console.error("Error fetching tests:", error);
      toast.error("Failed to load tests.");
    } finally {
      setIsLoadingData(false);
      setIsLoadingMore(false);
    }
  }, [user, filterStatus, lastDoc]);

  useEffect(() => {
    setLastDoc(null);
    setTests([]);
    setHasMore(true);
    fetchTests(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, user]);

  const displayTests = tests.filter(test => {
    if (!searchQuery) return true;
    return test.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           (test.accessCode && test.accessCode.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const handleManage = (test: any) => {
    setSelectedTest(test);
    setIsEditOpen(true);
  };

  if (loading || (isLoadingData && tests.length === 0)) {
    return <div className="flex h-[100dvh] bg-[#FAFAFA] items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32}/></div>;
  }

  // Dynamic Theme Palette for Cards
  const THEMES = ['blue', 'violet', 'emerald', 'rose', 'amber', 'cyan'];

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-[100px] md:pb-12">
      
      {selectedTest && <EditTestModal key={selectedTest.id} isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); fetchTests(false); }} test={selectedTest} />}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 md:mt-8 relative z-10">
        
        {/* 🟢 PREMIUM UNIFIED HEADER */}
        <div className="bg-white rounded-[2rem] p-5 md:p-6 border border-slate-200/80 shadow-sm mb-8">
          
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner shrink-0">
                 <Library size={24} strokeWidth={2.5} className="md:w-7 md:h-7" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight flex items-center gap-3">
                  {t.title}
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-200/80 animate-in fade-in">
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${filterStatus === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                    <span className="text-[11px] font-bold text-slate-600 tracking-wide uppercase">{tests.length} {hasMore ? '+' : ''} {t.items}</span>
                  </div>
                </h1>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 md:w-auto w-full">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={2.5} />
                <input 
                  type="text" placeholder={t.search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100 my-6 hidden md:block"></div>

          {/* 🟢 APPLE-STYLE SEGMENTED TABS */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner w-full md:w-max">
            <button 
              onClick={() => setFilterStatus('active')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-[13px] font-bold rounded-xl transition-all duration-300 ${filterStatus === 'active' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FolderOpen size={16} strokeWidth={2.5} className={filterStatus === 'active' ? 'text-emerald-500' : ''} /> {t.filters.active}
            </button>
            <button 
              onClick={() => setFilterStatus('archived')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-[13px] font-bold rounded-xl transition-all duration-300 ${filterStatus === 'archived' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Archive size={16} strokeWidth={2.5} className={filterStatus === 'archived' ? 'text-slate-500' : ''} /> {t.filters.archived}
            </button>
          </div>

        </div>

        {/* 🟢 EDGE-TO-EDGE GRID */}
        {isLoadingData ? (
           <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>
        ) : displayTests.length > 0 ? (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {displayTests.map((test, index) => {
               const themeColor = THEMES[index % THEMES.length];
               return <TestCard key={test.id} test={test} theme={themeColor} onManage={() => handleManage(test)} />;
            })}
          </motion.div>
        ) : (
          /* FUNCTIONAL EMPTY STATE */
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="col-span-full py-16 md:py-24 text-center flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-[2rem] shadow-sm relative overflow-hidden group mt-4">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors duration-700 pointer-events-none z-0"></div>
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-5 shadow-sm relative z-10">
              <Sparkles size={28} className="text-slate-400" />
            </div>
            <h3 className="text-[18px] md:text-[20px] font-black text-slate-800 tracking-tight relative z-10">{t.empty.title}</h3>
            <p className="text-[13px] md:text-[14px] text-slate-500 font-medium mt-1.5 mb-8 max-w-sm relative z-10 px-4">{t.empty.desc}</p>
            
            {filterStatus === 'active' && !searchQuery && (
              <button onClick={() => router.push('/teacher/create')} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all active:scale-95 text-[14px] relative z-10">
                <Plus size={16} strokeWidth={2.5} /> {t.createTest}
              </button>
            )}
          </motion.div>
        )}

        {/* LOAD MORE BUTTON */}
        {hasMore && !searchQuery && (
          <div className="flex justify-center pt-10 pb-6">
            <button 
              onClick={() => fetchTests(true)}
              disabled={isLoadingMore}
              className="flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 font-black py-3 px-8 rounded-2xl shadow-sm transition-all active:scale-95 text-[14px] disabled:opacity-50"
            >
              {isLoadingMore ? <Loader2 size={18} className="animate-spin"/> : <ChevronDown size={18} strokeWidth={2.5} />}
              {t.loadMore}
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
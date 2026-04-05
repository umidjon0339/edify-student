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

// --- TRANSLATION DICTIONARY ---
// Removed the "sort" translations to keep it clean
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

export default function LibraryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = LIBRARY_TRANSLATIONS[lang] || LIBRARY_TRANSLATIONS['en'];

  // State
  const [tests, setTests] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 🟢 Server-Side Filters (Sorting is now hardcoded to newest)
  const [filterStatus, setFilterStatus] = useState<'active' | 'archived'>('active');

  // Pagination State
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Modal State
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // 🟢 Optimized Server-Side Fetching
  const fetchTests = useCallback(async (isLoadMore = false) => {
    if (!user) return;
    if (isLoadMore) setIsLoadingMore(true);
    else setIsLoadingData(true);

    try {
      // 🟢 This perfectly matches your existing Firebase Composite Index!
      let q = query(
        collection(db, 'custom_tests'),
        where('teacherId', '==', user.uid),
        where('status', '==', filterStatus),
        orderBy("createdAt", 'desc'),
        limit(PAGE_SIZE)
      );

      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

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

  // Refetch completely when Status changes
  useEffect(() => {
    setLastDoc(null);
    setTests([]);
    setHasMore(true);
    fetchTests(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, user]);

  // Client-side text search (only applies to what is currently loaded in memory)
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

  return (
    <div className="flex h-[100dvh] bg-[#FAFAFA] overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {selectedTest && <EditTestModal key={selectedTest.id} isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); fetchTests(false); }} test={selectedTest} />}

      <main className="flex-1 overflow-y-auto custom-scrollbar relative w-full pb-20">
        
        {/* UNIFIED STICKY TOP BAR */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
          
          <div className="flex items-center gap-4">
            <h1 className="text-[16px] md:text-[18px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Library size={18} className="text-indigo-500" /> {t.title}
            </h1>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full border border-slate-200/60 animate-in fade-in">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${filterStatus === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
              <span className="text-[11px] font-bold text-slate-600 tracking-wide uppercase">{tests.length} {hasMore ? '+' : ''} {t.items}</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder={t.search} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-100/80 border border-slate-200/60 rounded-lg text-[13px] font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 md:px-8 mt-6">
          
          {/* APPLE-STYLE SEGMENTED TABS */}
          <div className="flex justify-center sm:justify-start mb-8">
            <div className="flex items-center bg-slate-200/50 p-1 rounded-xl border border-slate-200/60 shadow-inner">
              <button 
                onClick={() => setFilterStatus('active')}
                className={`flex items-center gap-2 px-5 py-2 text-[13px] font-bold rounded-lg transition-all ${filterStatus === 'active' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <FolderOpen size={16} className={filterStatus === 'active' ? 'text-emerald-500' : ''} /> {t.filters.active}
              </button>
              <button 
                onClick={() => setFilterStatus('archived')}
                className={`flex items-center gap-2 px-5 py-2 text-[13px] font-bold rounded-lg transition-all ${filterStatus === 'archived' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Archive size={16} className={filterStatus === 'archived' ? 'text-slate-500' : ''} /> {t.filters.archived}
              </button>
            </div>
          </div>

          {/* EDGE-TO-EDGE GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {isLoadingData ? (
               <div className="col-span-full flex justify-center py-10"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>
            ) : displayTests.length > 0 ? (
              displayTests.map((test, idx) => (
                <div key={test.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${(idx % 10) * 40}ms`, animationFillMode: 'both' }}>
                  <TestCard test={test} onManage={() => handleManage(test)} />
                </div>
              ))
            ) : (
              /* FUNCTIONAL EMPTY STATE */
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl animate-in zoom-in-95 duration-500 shadow-sm">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                  <Sparkles size={28} className="text-slate-300" />
                </div>
                <h3 className="text-[18px] font-black text-slate-800 tracking-tight">{t.empty.title}</h3>
                <p className="text-slate-400 text-[14px] mt-1 font-medium mb-6 max-w-sm">{t.empty.desc}</p>
                
                {filterStatus === 'active' && !searchQuery && (
                  <button onClick={() => router.push('/teacher/create')} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all active:scale-95 text-[14px]">
                    <Plus size={16} /> {t.createTest}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* LOAD MORE BUTTON */}
          {hasMore && !searchQuery && (
            <div className="flex justify-center pt-8 pb-4">
              <button 
                onClick={() => fetchTests(true)}
                disabled={isLoadingMore}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 font-bold py-2.5 px-6 rounded-xl shadow-sm transition-all active:scale-95 text-[13px] disabled:opacity-50"
              >
                {isLoadingMore ? <Loader2 size={16} className="animate-spin"/> : <ChevronDown size={16} />}
                {t.loadMore}
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
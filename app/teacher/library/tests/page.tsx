"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore'; 
import { useAuth } from '@/lib/AuthContext';
import { FolderOpen, Archive, Loader2, Search, Library, Sparkles, ChevronDown, Plus } from 'lucide-react'; 
import TestCard from '../_components/TestCard';
import EditTestModal from '../_components/EditTestModal';
import { useTeacherLanguage } from '@/app/teacher/layout';

// --- 1. TRANSLATION DICTIONARY ---
const LIBRARY_TRANSLATIONS = {
  uz: {
    title: "Mening Kutubxonam",
    filters: { active: "Faol Testlar", archived: "Arxivlangan" },
    search: "Qidirish...",
    empty: { title: "Testlar topilmadi", desc: "Boshlash uchun yangi test yarating." },
    loadMore: "Yana 10 ta yuklash",
    items: "Ta",
    createTest: "Yangi Test Yaratish"
  },
  en: {
    title: "My Library",
    filters: { active: "Active Tests", archived: "Archived" },
    search: "Search tests...",
    empty: { title: "No tests found", desc: "Create a new test to get started." },
    loadMore: "Load Next 10",
    items: "Items",
    createTest: "Create New Test"
  },
  ru: {
    title: "Моя Библиотека",
    filters: { active: "Активные", archived: "Архив" },
    search: "Поиск...",
    empty: { title: "Тесты не найдены", desc: "Создайте новый тест, чтобы начать." },
    loadMore: "Загрузить еще 10",
    items: "Шт",
    createTest: "Создать Тест"
  }
};

export default function LibraryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = LIBRARY_TRANSLATIONS[lang] || LIBRARY_TRANSLATIONS['en'];

  // State
  const [tests, setTests] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [filter, setFilter] = useState<'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [fetchLimit, setFetchLimit] = useState(10);
  const [hasMore, setHasMore] = useState(true);

  // Modal State
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Fetch Tests Real-time (Optimized)
  useEffect(() => {
    if (!user) return;

    // 🟢 Keeps your cost-saving pagination logic intact
    const q = query(
      collection(db, 'custom_tests'),
      where('teacherId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(fetchLimit) 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTests(data);
      setHasMore(snapshot.docs.length >= fetchLimit);
      setIsLoadingData(false);
    });

    return () => unsubscribe();
  }, [user, fetchLimit]); 

  // Filtering Logic
  const filteredTests = tests.filter(test => {
    const matchesStatus = (test.status || 'active') === filter;
    const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (test.accessCode && test.accessCode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleManage = (test: any) => {
    setSelectedTest(test);
    setIsEditOpen(true);
  };

  if (loading || (isLoadingData && tests.length === 0)) {
    return (
      <div className="flex h-[100dvh] bg-[#FAFAFA] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32}/>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-[#FAFAFA] overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Edit Modal */}
      {selectedTest && (
        <EditTestModal key={selectedTest.id} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} test={selectedTest} />
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative w-full pb-20">
        
        {/* 🟢 1. UNIFIED STICKY TOP BAR (Vercel Style) */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          
          {/* Left: Title & Count Badge */}
          <div className="flex items-center gap-4">
            <h1 className="text-[16px] md:text-[18px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Library size={18} className="text-indigo-500" /> {t.title}
            </h1>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full border border-slate-200/60 animate-in fade-in">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${filter === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
              <span className="text-[11px] font-bold text-slate-600 tracking-wide uppercase">{filteredTests.length} {t.items}</span>
            </div>
          </div>
          
          {/* Right: Compact Search Bar */}
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

        <div className="max-w-[1200px] mx-auto px-4 md:px-8 mt-6">
          
          {/* 🟢 2. APPLE-STYLE SEGMENTED TABS */}
          <div className="flex justify-center sm:justify-start mb-8">
            <div className="flex items-center bg-slate-200/50 p-1 rounded-xl border border-slate-200/60 shadow-inner">
              <button 
                onClick={() => setFilter('active')}
                className={`flex items-center gap-2 px-5 py-2 text-[13px] font-bold rounded-lg transition-all ${filter === 'active' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <FolderOpen size={16} className={filter === 'active' ? 'text-emerald-500' : ''} /> {t.filters.active}
              </button>
              <button 
                onClick={() => setFilter('archived')}
                className={`flex items-center gap-2 px-5 py-2 text-[13px] font-bold rounded-lg transition-all ${filter === 'archived' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Archive size={16} className={filter === 'archived' ? 'text-slate-500' : ''} /> {t.filters.archived}
              </button>
            </div>
          </div>

          {/* 🟢 3. EDGE-TO-EDGE GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTests.length > 0 ? (
              filteredTests.map((test, idx) => (
                <div key={test.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${(idx % 10) * 40}ms`, animationFillMode: 'both' }}>
                  <TestCard test={test} onManage={() => handleManage(test)} />
                </div>
              ))
            ) : (
              
              /* 🟢 4. FUNCTIONAL EMPTY STATE */
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl animate-in zoom-in-95 duration-500 shadow-sm">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                  <Sparkles size={28} className="text-slate-300" />
                </div>
                <h3 className="text-[18px] font-black text-slate-800 tracking-tight">{t.empty.title}</h3>
                <p className="text-slate-400 text-[14px] mt-1 font-medium mb-6 max-w-sm">{t.empty.desc}</p>
                
                {filter === 'active' && !searchQuery && (
                  <button onClick={() => router.push('/teacher/create')} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all active:scale-95 text-[14px]">
                    <Plus size={16} /> {t.createTest}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 🟢 5. LOAD MORE BUTTON (Cost-Saving Logic) */}
{hasMore && !searchQuery && tests.length >= fetchLimit && (
            <div className="flex justify-center pt-8 pb-4">
              <button 
                onClick={() => setFetchLimit(prev => prev + 10)}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 font-bold py-2.5 px-6 rounded-xl shadow-sm transition-all active:scale-95 text-[13px]"
              >
                {t.loadMore} <ChevronDown size={16} />
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
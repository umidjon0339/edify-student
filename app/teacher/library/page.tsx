'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore'; // 🟢 Added limit
import { useAuth } from '@/lib/AuthContext';
import { FolderOpen, Archive, Loader2, Search, Library, Sparkles, ChevronDown } from 'lucide-react'; // 🟢 Added ChevronDown
import TestCard from './_components/TestCard';
import EditTestModal from './_components/EditTestModal';
import { useTeacherLanguage } from '@/app/teacher/layout';

// --- 1. TRANSLATION DICTIONARY ---
const LIBRARY_TRANSLATIONS = {
  uz: {
    title: "Mening Kutubxonam",
    subtitle: "Yaratilgan testlaringizni boshqaring va kuzatib boring.",
    filters: { active: "Faol Testlar", archived: "Arxivlangan" },
    search: "Nom yoki kirish kodi bo'yicha qidirish...",
    empty: { title: "testlar topilmadi.", desc: "Boshlash uchun yangi test yarating." },
    noFilter: "Hech qanday",
    loadMore: "Yana 10 ta yuklash" // 🟢 Added Translation
  },
  en: {
    title: "My Library",
    subtitle: "Manage and monitor your created assessments.",
    filters: { active: "Active Tests", archived: "Archived" },
    search: "Search by Title or Access Code...",
    empty: { title: "tests found.", desc: "Create a new test to get started." },
    noFilter: "No",
    loadMore: "Load Next 10" // 🟢 Added Translation
  },
  ru: {
    title: "Моя Библиотека",
    subtitle: "Управляйте и следите за созданными тестами.",
    filters: { active: "Активные", archived: "Архив" },
    search: "Поиск по названию или коду...",
    empty: { title: "тестов не найдено.", desc: "Создайте новый тест, чтобы начать." },
    noFilter: "Нет",
    loadMore: "Загрузить еще 10" // 🟢 Added Translation
  }
};

export default function LibraryPage() {
  const { user, loading } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = LIBRARY_TRANSLATIONS[lang];

  // State
  const [tests, setTests] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [filter, setFilter] = useState<'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // 🟢 Pagination State
  const [fetchLimit, setFetchLimit] = useState(10);
  const [hasMore, setHasMore] = useState(true);

  // Modal State
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Fetch Tests Real-time (Optimized)
  useEffect(() => {
    if (!user) return;

    // 🟢 Added limit() to the query
    const q = query(
      collection(db, 'custom_tests'),
      where('teacherId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(fetchLimit) 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTests(data);
      
      // 🟢 Check if there are more documents to load
      setHasMore(snapshot.docs.length >= fetchLimit);
      setIsLoadingData(false);
    });

    return () => unsubscribe();
  }, [user, fetchLimit]); // 🟢 Re-run listener when limit changes

  // Filtering Logic
  const filteredTests = tests.filter(test => {
    const matchesStatus = (test.status || 'active') === filter;
    const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          test.accessCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleManage = (test: any) => {
    setSelectedTest(test);
    setIsEditOpen(true);
  };

  if (loading || (isLoadingData && tests.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32}/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      
      {/* 1. HERO HEADER */}
      <div className="bg-white border-b border-slate-200 pt-8 pb-12 px-6 md:px-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-50 rounded-full translate-y-1/2 -translate-x-1/2 opacity-50"></div>

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold mb-2 text-xs uppercase tracking-widest">
               <Library size={16} /> {t.title}
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">
              {t.title}
            </h1>
            <p className="text-slate-500 font-medium text-sm md:text-base max-w-lg">{t.subtitle}</p>
          </div>

          {/* TABS */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
             <button 
               onClick={() => setFilter('active')}
               className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${filter === 'active' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
             >
               <FolderOpen size={18}/> 
               <span>{t.filters.active}</span>
             </button>
             <button 
               onClick={() => setFilter('archived')}
               className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${filter === 'archived' ? 'bg-white text-slate-800 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
             >
               <Archive size={18}/> 
               <span>{t.filters.archived}</span>
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 -mt-6 space-y-8">
        
        {/* 2. SEARCH BAR */}
        <div className="relative max-w-2xl mx-auto shadow-lg shadow-slate-200/50 rounded-2xl">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder={t.search} 
            className="w-full pl-14 pr-6 py-4 bg-white border-none rounded-2xl font-medium text-slate-700 placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 3. GRID LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.length > 0 ? (
            filteredTests.map((test, idx) => (
              <div key={test.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${(idx % 10) * 50}ms`, animationFillMode: 'backwards' }}>
                <TestCard 
                  test={test} 
                  onManage={() => handleManage(test)} 
                />
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center flex flex-col items-center justify-center bg-white border border-slate-100 rounded-[2rem] shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Sparkles size={40} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                {t.noFilter} {t.filters[filter].toLowerCase()} {t.empty.title}
              </h3>
              <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">{t.empty.desc}</p>
            </div>
          )}
        </div>

        {/* 🟢 4. LOAD MORE BUTTON */}
        {hasMore && !searchQuery && (
          <div className="flex justify-center pt-4 pb-8">
            <button 
              onClick={() => setFetchLimit(prev => prev + 10)}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 font-bold py-3 px-8 rounded-xl shadow-sm transition-all active:scale-95"
            >
              {t.loadMore} <ChevronDown size={18} />
            </button>
          </div>
        )}

       {/* Edit Modal */}
       {selectedTest && (
          <EditTestModal 
            key={selectedTest.id} 
            isOpen={isEditOpen} 
            onClose={() => setIsEditOpen(false)} 
            test={selectedTest} 
          />
        )}

      </div>
    </div>
  );
}
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { BookOpen, Download, Eye, X, ExternalLink, ChevronDown, Search, Share2, Check, BookMarked, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudentLanguage } from '@/app/(student)/layout'; 

// ============================================================================
// 🟢 1. AGGRESSIVE GLOBAL CACHE (48-Hour Lifespan with SWR)
// ============================================================================
const globalLibraryCache: { books: OnlineBook[] | null, timestamp: number } = { books: null, timestamp: 0 };

// --- TRANSLATIONS ---
const PAGE_TRANSLATIONS: any = {
  uz: {
    title: "Kutubxona", subtitle: "Xalqaro va mahalliy darsliklarni kashf eting.", searchPlaceholder: "Kitob nomi yoki muallifni izlang...", booksFound: "ta kitob",
    filters: { country: "Davlat", grade: "Sinf", subject: "Fan", type: "Turi", sort: "Saralash", all: "Barchasi", defaultSort: "Saralash..." },
    sortOptions: { popular: "Ko'p yuklangan", viewed: "Ko'p ko'rilgan", newest: "Yangi nashr" },
    actions: { view: "Ko'rish", telegram: "Telegramdan olish", loading: "Kitoblar yuklanmoqda...", share: "Ulashish", copied: "Nusxa olindi!" },
    drawer: { details: "Kitob Tafsilotlari", views: "Ko'rilgan", downloads: "Yuklangan", description: "Tavsif", downloadSection: "Yuklab olish", pages: "bet" },
    empty: "Ushbu filtrlarga mos kitob topilmadi."
  },
  en: {
    title: "Library", subtitle: "Discover international and local textbooks.", searchPlaceholder: "Search by title or author...", booksFound: "books",
    filters: { country: "Country", grade: "Grade", subject: "Subject", type: "Type", sort: "Sort By", all: "All", defaultSort: "Sort..." },
    sortOptions: { popular: "Most Downloaded", viewed: "Most Viewed", newest: "Newest" },
    actions: { view: "View", telegram: "Get via Telegram", loading: "Loading books...", share: "Share", copied: "Copied!" },
    drawer: { details: "Book Details", views: "Views", downloads: "Downloads", description: "Description", downloadSection: "Download Parts", pages: "pages" },
    empty: "No books match these filters."
  },
  ru: {
    title: "Библиотека", subtitle: "Международные и местные учебники.", searchPlaceholder: "Поиск по названию или автору...", booksFound: "книг",
    filters: { country: "Страна", grade: "Класс", subject: "Предмет", type: "Тип", sort: "Сортировка", all: "Все", defaultSort: "Сортировка..." },
    sortOptions: { popular: "Популярные", viewed: "Просматриваемые", newest: "Новые" },
    actions: { view: "Смотреть", telegram: "Скачать в Telegram", loading: "Загрузка книг...", share: "Поделиться", copied: "Скопировано!" },
    drawer: { details: "Детали Книги", views: "Просмотры", downloads: "Скачивания", description: "Описание", downloadSection: "Скачать", pages: "стр." },
    empty: "Книги по этим фильтрам не найдены."
  }
};

// --- TYPES ---
interface BookPart { partId: string; partName: string; pages: number | string; fileSize: string; telegramLink: string; }
interface OnlineBook {
  id: string; title: string; country: string; grade: string; originalGrade: string; subject: string; bookType?: string;
  publishedYear: number; authors: string[]; coverImageUrl: string; description: { en: string; uz: string; ru: string };
  parts: BookPart[]; viewscount: number; downloadscount: number;
}

export default function OnlineLibraryPage() {
  const { lang } = useStudentLanguage();
  const t = PAGE_TRANSLATIONS[lang] || PAGE_TRANSLATIONS['en'];

  const [allBooks, setAllBooks] = useState<OnlineBook[]>([]);
  const [loading, setLoading] = useState(true);

  // --- FILTER, SEARCH & SORT STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [sortBy, setSortBy] = useState('none');

  // --- INFINITE SCROLL STATE ---
  const [visibleCount, setVisibleCount] = useState(12);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Drawer & UI State
  const [selectedBook, setSelectedBook] = useState<OnlineBook | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // ============================================================================
  // 🟢 2. SWR DATA FETCHING
  // ============================================================================
  useEffect(() => {
    const fetchAllBooks = async () => {
      const now = Date.now();
      const CACHE_LIFESPAN = 48 * 60 * 60 * 1000; // 48 Hours

      const localCached = localStorage.getItem('student_library_books');
      const localCacheTime = localStorage.getItem('student_library_timestamp');
      
      let hasValidCache = false;

      if (localCached && localCacheTime) {
        const parsed = JSON.parse(localCached);
        setAllBooks(parsed); 
        setLoading(false);   
        hasValidCache = true;
        
        if (now - parseInt(localCacheTime) < (60 * 60 * 1000)) {
          return; // Stop if strictly less than 1 hour old
        }
      }

      if (!hasValidCache) setLoading(true);

      try {
        const querySnapshot = await getDocs(collection(db, 'online_books'));
        const fetchedBooks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OnlineBook));
        
        setAllBooks(fetchedBooks); 
        localStorage.setItem('student_library_books', JSON.stringify(fetchedBooks));
        localStorage.setItem('student_library_timestamp', now.toString());
      } catch (error) {
        console.error("Error fetching library:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllBooks();
  }, []);

  // --- 3. EXTRACT UNIQUE OPTIONS ---
  const uniqueGrades = useMemo(() => Array.from(new Set(allBooks.map(b => b.grade))).sort(), [allBooks]);
  const uniqueSubjects = useMemo(() => Array.from(new Set(allBooks.map(b => b.subject))).sort(), [allBooks]);

  // --- 4. APPLY FILTERS, SEARCH & SORTING ---
  const processedBooks = useMemo(() => {
    let result = [...allBooks];

    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(b => b.title.toLowerCase().includes(lowerQuery) || b.authors.some(a => a.toLowerCase().includes(lowerQuery)));
    }

    if (countryFilter !== 'all') result = result.filter(b => b.country === countryFilter);
    if (gradeFilter !== 'all') result = result.filter(b => b.grade === gradeFilter);
    if (subjectFilter !== 'all') result = result.filter(b => b.subject === subjectFilter);

    if (sortBy === 'popular') result.sort((a, b) => (b.downloadscount || 0) - (a.downloadscount || 0));
    else if (sortBy === 'viewed') result.sort((a, b) => (b.viewscount || 0) - (a.viewscount || 0));
    else if (sortBy === 'newest') result.sort((a, b) => (b.publishedYear || 0) - (a.publishedYear || 0));

    return result;
  }, [allBooks, searchQuery, countryFilter, gradeFilter, subjectFilter, sortBy]);

  useEffect(() => { setVisibleCount(12); }, [searchQuery, countryFilter, gradeFilter, subjectFilter, sortBy]);

  // --- 5. INFINITE SCROLL ---
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visibleCount < processedBooks.length) {
        setVisibleCount(prev => prev + 12);
      }
    }, { threshold: 0.1 });
    if (node) observerRef.current.observe(node);
  }, [loading, visibleCount, processedBooks.length]);

  const displayedBooks = processedBooks.slice(0, visibleCount);

  // --- 6. CLICK HANDLERS ---
  const handleBookClick = async (book: OnlineBook) => {
    setSelectedBook(book);
    setIsDrawerOpen(true);
    setCopiedLink(false); 

    setAllBooks(prev => prev.map(b => b.id === book.id ? { ...b, viewscount: (b.viewscount || 0) + 1 } : b));
    try { await updateDoc(doc(db, 'online_books', book.id), { viewscount: increment(1) }); } catch (e) {}
  };

  const handleDownloadClick = async (bookId: string, telegramLink: string) => {
    setAllBooks(prev => prev.map(b => b.id === bookId ? { ...b, downloadscount: (b.downloadscount || 0) + 1 } : b));
    if (selectedBook) setSelectedBook({ ...selectedBook, downloadscount: (selectedBook.downloadscount || 0) + 1 });
    
    window.open(telegramLink, '_blank');
    try { await updateDoc(doc(db, 'online_books', bookId), { downloadscount: increment(1) }); } catch (e) {}
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-4 font-sans">
      <div className="w-16 h-16 bg-white border-2 border-b-8 border-zinc-200 rounded-[2rem] flex items-center justify-center shadow-sm">
        <BookOpen className="text-indigo-500 animate-bounce" size={32} strokeWidth={3} />
      </div>
      <span className="font-black text-zinc-400 uppercase tracking-widest text-[14px]">{t.actions.loading}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 font-sans pb-28 md:pb-12">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 pt-8 md:pt-10">
        
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-[1.2rem] flex items-center justify-center border-2 border-indigo-200 shadow-sm shrink-0">
                 <BookMarked size={24} strokeWidth={2.5}/>
              </div>
              {t.title}
            </h1>
            <p className="text-[15px] font-bold text-zinc-500 mt-2 pl-1">{t.subtitle}</p>
          </div>

          {/* SEARCH BAR */}
          <div className="w-full lg:w-96 relative">
            <Search size={18} strokeWidth={3} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-zinc-200 text-zinc-900 py-3.5 pl-12 pr-10 rounded-2xl text-[15px] font-black placeholder:text-zinc-400 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 bg-zinc-100 rounded-full p-1 transition-colors">
                 <X size={14} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>

        {/* COMPREHENSIVE FILTER BAR */}
        <div className="bg-white p-2.5 rounded-[1.5rem] shadow-sm border-2 border-zinc-200 mb-8 flex flex-wrap gap-2 items-center">
          
          <div className="flex-1 min-w-[130px] relative">
            <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="w-full appearance-none bg-zinc-100 border-2 border-zinc-200 text-zinc-700 py-2.5 pl-4 pr-10 rounded-xl text-[13px] font-black uppercase tracking-widest cursor-pointer outline-none focus:border-indigo-400 focus:bg-white transition-all">
              <option value="all">{t.filters.country}: {t.filters.all}</option>
              <option value="usa">🇺🇸 USA</option>
              <option value="uz">🇺🇿 UZB</option>
            </select>
            <ChevronDown size={14} strokeWidth={3} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>

          <div className="flex-1 min-w-[130px] relative">
            <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="w-full appearance-none bg-zinc-100 border-2 border-zinc-200 text-zinc-700 py-2.5 pl-4 pr-10 rounded-xl text-[13px] font-black uppercase tracking-widest cursor-pointer outline-none focus:border-indigo-400 focus:bg-white transition-all">
              <option value="all">{t.filters.grade}: {t.filters.all}</option>
              {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <ChevronDown size={14} strokeWidth={3} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>

          <div className="flex-1 min-w-[130px] relative">
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="w-full appearance-none bg-zinc-100 border-2 border-zinc-200 text-zinc-700 py-2.5 pl-4 pr-10 rounded-xl text-[13px] font-black uppercase tracking-widest cursor-pointer outline-none focus:border-indigo-400 focus:bg-white transition-all">
              <option value="all">{t.filters.subject}: {t.filters.all}</option>
              {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={14} strokeWidth={3} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>

          <div className="flex-1 min-w-[150px] relative">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full appearance-none bg-indigo-50 border-2 border-indigo-100 text-indigo-700 py-2.5 pl-4 pr-10 rounded-xl text-[13px] font-black uppercase tracking-widest cursor-pointer outline-none focus:border-indigo-400 focus:bg-white shadow-sm transition-all">
              <option value="none">{t.filters.defaultSort}</option>
              <option value="popular">{t.sortOptions.popular}</option>
              <option value="viewed">{t.sortOptions.viewed}</option>
              <option value="newest">{t.sortOptions.newest}</option>
            </select>
            <ChevronDown size={14} strokeWidth={3} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
          </div>
        </div>

        {/* 🟢 MAIN GRID */}
        <div>
          {processedBooks.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-zinc-300 flex flex-col items-center">
               <div className="w-20 h-20 bg-zinc-100 rounded-[1.5rem] border-2 border-zinc-200 flex items-center justify-center text-zinc-400 mb-4 rotate-6">
                 <BookOpen size={40} strokeWidth={2.5} />
               </div>
               <h3 className="text-[18px] font-black text-zinc-900 tracking-tight">{t.empty}</h3>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {displayedBooks.map((book, index) => {
                const isLastElement = index === displayedBooks.length - 1;
                return (
                  <div 
                    key={book.id} 
                    ref={isLastElement ? lastElementRef : null}
                    onClick={() => handleBookClick(book)} 
                    className="group cursor-pointer flex flex-col bg-white rounded-[1.5rem] border-2 border-zinc-200 border-b-[6px] p-4 hover:border-indigo-300 hover:border-b-indigo-400 active:border-b-2 active:translate-y-[4px] transition-all duration-200"
                  >
                    
                    {/* 🟢 PREMIUM 3D PHYSICAL BOOK COVER */}
                    <div className="relative aspect-[3/4] w-full max-w-[180px] mx-auto rounded-r-xl rounded-l-md overflow-hidden bg-zinc-100 border border-zinc-200 mb-5 shadow-[4px_4px_15px_rgba(0,0,0,0.1)] group-hover:shadow-[8px_8px_20px_rgba(99,102,241,0.2)] transition-all duration-300 transform group-hover:-translate-y-1 group-hover:rotate-1 origin-bottom-left">
                      {/* Physical Book Spine Shadow Effect */}
                      <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/20 via-black/5 to-transparent z-10 pointer-events-none"></div>
                      
                      <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      
                      {/* Hover "View" Button */}
                      <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px] z-20">
                        <span className="bg-white text-indigo-600 font-black text-[12px] uppercase tracking-widest px-4 py-2 rounded-[1rem] shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all flex items-center gap-2">
                          <Eye size={16} strokeWidth={3}/> {t.actions.view}
                        </span>
                      </div>
                    </div>
                    
                    {/* 🟢 CLEAN BOOK METADATA */}
                    <div className="flex-1 flex flex-col justify-between text-center">
                      <div>
                        <h3 className="font-black text-[15px] md:text-[16px] text-zinc-900 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2 tracking-tight mb-2">
                          {book.title}
                        </h3>
                        
                        {/* Elegant Tag Row */}
                        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3">
                          <span className="inline-flex items-center bg-zinc-100 text-zinc-600 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-zinc-200">
                            {book.country === 'usa' ? '🇺🇸 USA' : '🇺🇿 UZB'}
                          </span>
                          <span className="inline-flex items-center text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                            {book.grade}
                          </span>
                          <span className="inline-flex items-center text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 line-clamp-1 max-w-[100px]">
                            {book.subject}
                          </span>
                        </div>
                      </div>
                      
                      {/* Stats Footer */}
                      <div className="flex items-center justify-center gap-4 pt-3 border-t-2 border-zinc-100">
                        <div className="flex items-center gap-1.5 text-[12px] font-black text-zinc-400">
                          <Eye size={14} strokeWidth={3}/> {book.viewscount || 0}
                        </div>
                        <div className="flex items-center gap-1.5 text-[12px] font-black text-zinc-400">
                          <Download size={14} strokeWidth={3}/> {book.downloadscount || 0}
                        </div>
                      </div>
                    </div>

                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* SPINNER */}
        {visibleCount < processedBooks.length && (
          <div className="py-10 flex justify-center">
             <Loader2 className="animate-spin text-indigo-500" size={28} strokeWidth={3}/>
          </div>
        )}

      </div>

      {/* 🟢 RIGHT SLIDE-OVER DRAWER */}
      <AnimatePresence>
        {isDrawerOpen && selectedBook && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDrawerOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" />
            
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
              className="fixed top-0 right-0 h-full w-full max-w-md bg-zinc-50 shadow-2xl z-[110] border-l-2 border-zinc-200 flex flex-col"
            >
              
              {/* DRAWER HEADER */}
              <div className="bg-white z-10 px-6 py-5 border-b-2 border-zinc-200 flex justify-between items-center shadow-sm">
                <h2 className="font-black text-[18px] text-zinc-900 tracking-tight">{t.drawer.details}</h2>
                <div className="flex items-center gap-3">
                  <button onClick={handleShare} className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border-2 border-indigo-100 hover:bg-indigo-100 transition-colors" title={t.actions.share}>
                    {copiedLink ? <Check size={18} strokeWidth={3} className="text-emerald-500" /> : <Share2 size={18} strokeWidth={2.5} />}
                  </button>
                  <button onClick={() => setIsDrawerOpen(false)} className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-500 flex items-center justify-center border-2 border-zinc-200 hover:bg-zinc-200 transition-colors">
                     <X size={18} strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* DRAWER BODY */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                
                {/* Book Cover */}
                <div className="w-48 mx-auto rounded-r-[1.5rem] rounded-l-lg overflow-hidden shadow-[4px_4px_20px_rgba(0,0,0,0.15)] border border-zinc-200 relative bg-zinc-100 aspect-[3/4]">
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/30 via-black/5 to-transparent z-10 pointer-events-none"></div>
                  <img src={selectedBook.coverImageUrl} alt={selectedBook.title} className="w-full h-full object-cover" />
                </div>

                <div className="mt-8 text-center">
                  <h2 className="text-2xl font-black text-zinc-900 tracking-tight leading-tight">{selectedBook.title}</h2>
                  <p className="text-[13px] font-black text-zinc-400 uppercase tracking-widest mt-2">{selectedBook.authors.join(', ')} • {selectedBook.publishedYear}</p>
                </div>

                {/* Stats Row */}
                <div className="flex justify-center gap-4 mt-6 py-5 border-y-2 border-zinc-200">
                  <div className="bg-white px-6 py-3 rounded-[1.2rem] border-2 border-zinc-200 shadow-sm text-center">
                    <p className="text-[10px] uppercase font-black text-zinc-400 tracking-widest">{t.drawer.views}</p>
                    <p className="text-2xl font-black text-indigo-600 mt-0.5">{selectedBook.viewscount || 0}</p>
                  </div>
                  <div className="bg-emerald-50 px-6 py-3 rounded-[1.2rem] border-2 border-emerald-200 shadow-sm text-center">
                    <p className="text-[10px] uppercase font-black text-emerald-600/70 tracking-widest">{t.drawer.downloads}</p>
                    <p className="text-2xl font-black text-emerald-600 mt-0.5">{selectedBook.downloadscount || 0}</p>
                  </div>
                </div>

                {/* Description */}
                <div className="mt-6">
                  <h3 className="font-black text-[14px] text-zinc-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <BookOpen size={16} strokeWidth={3} className="text-indigo-500"/> {t.drawer.description}
                  </h3>
                  <div className="bg-white p-5 rounded-[1.5rem] border-2 border-zinc-200 shadow-sm">
                    <p className="text-zinc-600 text-[14px] leading-relaxed font-medium">
                      {selectedBook.description[lang as keyof typeof selectedBook.description] || selectedBook.description.uz}
                    </p>
                  </div>
                </div>

                {/* Downloads */}
                <div className="mt-8 mb-8">
                  <h3 className="font-black text-[14px] text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Download size={16} strokeWidth={3} className="text-emerald-500"/> {t.drawer.downloadSection}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {selectedBook.parts.map((part) => (
                      <div key={part.partId} className="bg-white border-2 border-zinc-200 border-b-4 rounded-[1.5rem] p-4 flex flex-col gap-4 transition-all">
                        <div>
                          <p className="font-black text-[16px] text-zinc-800 tracking-tight">{part.partName}</p>
                          <p className="text-[12px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">{part.fileSize} • {part.pages} {t.drawer.pages}</p>
                        </div>
                        <button onClick={() => handleDownloadClick(selectedBook.id, part.telegramLink)} className="w-full bg-[#2AABEE] hover:bg-[#229ED9] text-white font-black text-[14px] uppercase tracking-widest py-3.5 rounded-xl border-b-4 border-[#1C88C2] active:border-b-0 active:translate-y-[4px] flex items-center justify-center gap-2 transition-all shadow-sm">
                          <ExternalLink size={18} strokeWidth={3} /> {t.actions.telegram}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
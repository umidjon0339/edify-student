'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { BookOpen, Download, Eye, X, ExternalLink, ChevronDown, Search, Share2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacherLanguage } from '@/app/teacher/layout';

// --- TRANSLATIONS ---
const PAGE_TRANSLATIONS = {
  uz: {
    title: "Onlayn Kutubxona",
    subtitle: "Xalqaro va mahalliy darsliklarni kashf eting.",
    searchPlaceholder: "Kitob nomi yoki muallifni izlang...",
    booksFound: "ta kitob topildi",
    filters: { country: "Davlat", grade: "Sinf", subject: "Fan", type: "Turi", sort: "Saralash", all: "Barchasi", defaultSort: "Tanlanmagan" },
    sortOptions: { popular: "Eng ko'p yuklangan", viewed: "Eng ko'p ko'rilgan", newest: "Yangi nashrlar" },
    actions: { view: "Ko'rish", telegram: "Yuklab olish", loading: "Kitoblar yuklanmoqda...", share: "Ulashish", copied: "Nusxa olindi!" },
    drawer: { details: "Kitob Tafsilotlari", views: "Ko'rilgan", downloads: "Yuklangan", description: "Tavsif", downloadSection: "Yuklab olish", pages: "bet" },
    empty: "Ushbu filtrlarga mos kitob topilmadi."
  },
  en: {
    title: "Online Library",
    subtitle: "Discover international and local textbooks.",
    searchPlaceholder: "Search by title or author...",
    booksFound: "books found",
    filters: { country: "Country", grade: "Grade", subject: "Subject", type: "Type", sort: "Sort By", all: "All", defaultSort: "None" },
    sortOptions: { popular: "Most Downloaded", viewed: "Most Viewed", newest: "Newest Published" },
    actions: { view: "View", telegram: "Download", loading: "Loading books...", share: "Share", copied: "Copied!" },
    drawer: { details: "Book Details", views: "Views", downloads: "Downloads", description: "Description", downloadSection: "Download Parts", pages: "pages" },
    empty: "No books match these filters."
  },
  ru: {
    title: "Онлайн Библиотека",
    subtitle: "Открывайте международные и местные учебники.",
    searchPlaceholder: "Поиск по названию или автору...",
    booksFound: "книг найдено",
    filters: { country: "Страна", grade: "Класс", subject: "Предмет", type: "Тип", sort: "Сортировка", all: "Все", defaultSort: "Не выбрано" },
    sortOptions: { popular: "Популярные", viewed: "Просматриваемые", newest: "Новые издания" },
    actions: { view: "Смотреть", telegram: "Скачать", loading: "Загрузка книг...", share: "Поделиться", copied: "Скопировано!" },
    drawer: { details: "Детали Книги", views: "Просмотры", downloads: "Скачивания", description: "Описание", downloadSection: "Скачать", pages: "стр." },
    empty: "Книги по этим фильтрам не найдены."
  }
};

// --- TYPES ---
interface BookPart {
  partId: string;
  partName: string;
  pages: number | string;
  fileSize: string;
  telegramLink: string;
}

interface OnlineBook {
  id: string;
  title: string;
  country: string;
  grade: string;
  originalGrade: string;
  subject: string;
  bookType?: string;
  publishedYear: number;
  authors: string[];
  coverImageUrl: string;
  description: { en: string; uz: string; ru: string };
  parts: BookPart[];
  viewscount: number;
  downloadscount: number;
}

export default function OnlineLibraryPage() {
  const { lang } = useTeacherLanguage();
  const t = PAGE_TRANSLATIONS[lang];

  const [allBooks, setAllBooks] = useState<OnlineBook[]>([]);
  const [loading, setLoading] = useState(true);

  // --- FILTER, SEARCH & SORT STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('none');

  // --- INFINITE SCROLL STATE ---
  const [visibleCount, setVisibleCount] = useState(15); // Start by showing 15 books
  const observerTarget = useRef(null);

  // Drawer & UI State
  const [selectedBook, setSelectedBook] = useState<OnlineBook | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // --- 1. FETCH ALL BOOKS (WITH STALE-WHILE-REVALIDATE CACHE) ---
  useEffect(() => {
    const fetchAllBooks = async () => {
      // Step A: Load from Cache instantly
      const cachedBooks = localStorage.getItem('edify_online_books');
      if (cachedBooks) {
        setAllBooks(JSON.parse(cachedBooks));
        setLoading(false);
      }

      // Step B: Fetch fresh data in background
      try {
        const querySnapshot = await getDocs(collection(db, 'online_books'));
        const fetchedBooks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OnlineBook));
        
        // Step C: Update Cache and State
        localStorage.setItem('edify_online_books', JSON.stringify(fetchedBooks));
        setAllBooks(fetchedBooks);
      } catch (error) {
        console.error("Error fetching books:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllBooks();
  }, []);

  // --- 2. EXTRACT UNIQUE OPTIONS ---
  const uniqueGrades = useMemo(() => Array.from(new Set(allBooks.map(b => b.grade))).sort(), [allBooks]);
  const uniqueSubjects = useMemo(() => Array.from(new Set(allBooks.map(b => b.subject))).sort(), [allBooks]);
  const uniqueTypes = useMemo(() => Array.from(new Set(allBooks.map(b => b.bookType || 'darslik'))).sort(), [allBooks]);

  // --- 3. APPLY FILTERS, SEARCH & SORTING ---
  const processedBooks = useMemo(() => {
    let result = [...allBooks];

    // Search
    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.title.toLowerCase().includes(lowerQuery) || 
        b.authors.some(a => a.toLowerCase().includes(lowerQuery))
      );
    }

    // Filters
    if (countryFilter !== 'all') result = result.filter(b => b.country === countryFilter);
    if (gradeFilter !== 'all') result = result.filter(b => b.grade === gradeFilter);
    if (subjectFilter !== 'all') result = result.filter(b => b.subject === subjectFilter);
    if (typeFilter !== 'all') result = result.filter(b => (b.bookType || 'darslik') === typeFilter);

    // Sort
    if (sortBy === 'popular') result.sort((a, b) => (b.downloadscount || 0) - (a.downloadscount || 0));
    else if (sortBy === 'viewed') result.sort((a, b) => (b.viewscount || 0) - (a.viewscount || 0));
    else if (sortBy === 'newest') result.sort((a, b) => (b.publishedYear || 0) - (a.publishedYear || 0));

    return result;
  }, [allBooks, searchQuery, countryFilter, gradeFilter, subjectFilter, typeFilter, sortBy]);

  // Reset visible count when filters change
  useEffect(() => { setVisibleCount(15); }, [searchQuery, countryFilter, gradeFilter, subjectFilter, typeFilter, sortBy]);

  // --- 4. INFINITE SCROLL INTERSECTION OBSERVER ---
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < processedBooks.length) {
          // Add 15 more books when user scrolls to the bottom
          setVisibleCount(prev => prev + 15);
        }
      },
      { threshold: 0.1 } // Trigger when target is 10% visible
    );

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [visibleCount, processedBooks.length]);

  const displayedBooks = processedBooks.slice(0, visibleCount);

  // --- 5. CLICK HANDLERS ---
  const handleBookClick = async (book: OnlineBook) => {
    setSelectedBook(book);
    setIsDrawerOpen(true);
    setCopiedLink(false); // Reset copy state
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
    // Creates a link that points directly to this page.
    // Future update: you could add `?book=usa-math-grade-5` to the URL if you build deep-linking.
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading && allBooks.length === 0) return <div className="p-20 text-center text-indigo-600 font-bold">{t.actions.loading}</div>;

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto w-full relative h-full flex flex-col min-h-screen">
      
      {/* --- HEADER ROW (Title & Stats & Search) --- */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t.title}</h1>
             {/* TOTAL BOOKS BADGE */}
             <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-black shadow-sm border border-indigo-100">
                {processedBooks.length} {t.booksFound}
             </div>
          </div>
          <p className="text-slate-500 mt-1 font-medium">{t.subtitle}</p>
        </div>

        {/* SEARCH BAR */}
        <div className="w-full lg:w-96 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-900 py-3 pl-11 pr-4 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
               <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* --- COMPREHENSIVE FILTER BAR --- */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-wrap gap-4 items-center">
        
        <div className="flex-1 min-w-[140px]">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{t.filters.country}</label>
          <div className="relative">
            <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-xl text-sm font-bold cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
              <option value="all">{t.filters.all}</option>
              <option value="usa">🇺🇸 USA</option>
              <option value="uz">🇺🇿 O'zbekiston</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 min-w-[140px]">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{t.filters.grade}</label>
          <div className="relative">
            <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-xl text-sm font-bold cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
              <option value="all">{t.filters.all}</option>
              {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 min-w-[140px]">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{t.filters.subject}</label>
          <div className="relative">
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-xl text-sm font-bold cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
              <option value="all">{t.filters.all}</option>
              {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 min-w-[140px]">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{t.filters.type}</label>
          <div className="relative">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-xl text-sm font-bold cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
              <option value="all">{t.filters.all}</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 min-w-[160px] border-l border-slate-100 pl-4">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{t.filters.sort}</label>
          <div className="relative">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full appearance-none bg-white border border-slate-200 text-indigo-700 py-2 pl-3 pr-8 rounded-xl text-sm font-bold cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all">
              <option value="none">{t.filters.defaultSort}</option>
              <option value="popular">{t.sortOptions.popular}</option>
              <option value="viewed">{t.sortOptions.viewed}</option>
              <option value="newest">{t.sortOptions.newest}</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* --- MAIN GRID --- */}
      <div className="flex-1">
        {processedBooks.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-3xl border border-slate-200 border-dashed">
             <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
             <h3 className="text-xl font-bold text-slate-900">{t.empty}</h3>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {displayedBooks.map((book) => (
              <div key={book.id} onClick={() => handleBookClick(book)} className="group cursor-pointer flex flex-col">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 shadow-sm border border-slate-200 transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
                  <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover" />
                  
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white text-slate-900 font-bold px-4 py-2 rounded-xl shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all">{t.actions.view}</span>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-600 mb-1.5">
                    {book.country === 'usa' ? '🇺🇸 USA' : '🇺🇿 UZB'}
                  </div>
                  
                  <h3 className="font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">{book.title}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wide">
                    {book.grade} • {book.subject}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs font-medium text-slate-400">
                    <span className="flex items-center gap-1"><Eye size={14} /> {book.viewscount || 0}</span>
                    <span className="flex items-center gap-1"><Download size={14} /> {book.downloadscount || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* INFINITE SCROLL TARGET (Invisible div to trigger loading more) */}
      {visibleCount < processedBooks.length && (
        <div ref={observerTarget} className="py-10 flex justify-center">
          <span className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full"></span>
        </div>
      )}

      {/* --- RIGHT SLIDE-OVER DRAWER --- */}
      <AnimatePresence>
        {isDrawerOpen && selectedBook && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDrawerOpen(false)} className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[110] border-l border-slate-100 flex flex-col overflow-y-auto custom-scrollbar">
              
              {/* DRAWER HEADER WITH SHARE BUTTON */}
              <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 p-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-bold text-slate-900">{t.drawer.details}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={handleShare} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors relative" title={t.actions.share}>
                    {copiedLink ? <Check size={20} className="text-emerald-500" /> : <Share2 size={20} />}
                  </button>
                  <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                     <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="w-48 mx-auto rounded-xl overflow-hidden shadow-lg border border-slate-200 relative group">
                  <img src={selectedBook.coverImageUrl} alt={selectedBook.title} className="w-full h-auto" />
                </div>

                <div className="mt-6 text-center">
                  <h2 className="text-2xl font-black text-slate-900">{selectedBook.title}</h2>
                  <p className="text-slate-500 font-medium mt-1">{selectedBook.authors.join(', ')} • {selectedBook.publishedYear}</p>
                </div>

                <div className="flex justify-center gap-6 mt-6 py-4 border-y border-slate-100">
                  <div className="text-center">
                    <p className="text-xl font-bold text-indigo-600">{selectedBook.viewscount || 0}</p>
                    <p className="text-xs uppercase font-bold text-slate-400">{t.drawer.views}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-emerald-600">{selectedBook.downloadscount || 0}</p>
                    <p className="text-xs uppercase font-bold text-slate-400">{t.drawer.downloads}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-bold text-slate-900 mb-2">{t.drawer.description}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {selectedBook.description[lang as keyof typeof selectedBook.description] || selectedBook.description.uz}
                  </p>
                </div>

                <div className="mt-8 mb-8">
                  <h3 className="font-bold text-slate-900 mb-4">{t.drawer.downloadSection}</h3>
                  <div className="flex flex-col gap-3">
                    {selectedBook.parts.map((part) => (
                      <div key={part.partId} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-4 bg-white hover:border-indigo-200 transition-colors shadow-sm">
                        <div>
                          <p className="font-bold text-slate-800">{part.partName}</p>
                          <p className="text-xs text-slate-500">{part.fileSize} • {part.pages} {t.drawer.pages}</p>
                        </div>
                        <button onClick={() => handleDownloadClick(selectedBook.id, part.telegramLink)} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm">
                          <ExternalLink size={18} /> {t.actions.telegram}
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
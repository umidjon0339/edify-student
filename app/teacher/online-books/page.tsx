'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { BookOpen, Search, X, ChevronRight, Download, Eye, Check, Share2, SlidersHorizontal, Copy, Filter, GraduationCap, Library, BookMarked, AlignLeft, CalendarDays, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacherLanguage } from '@/app/teacher/layout';
import { Button, Spinner, EmptyState } from '@/components/ui';
// Import your local JSON file directly
import libraryBooks from '@/data/library_books.json';

// --- TRANSLATIONS ---
const PAGE_TRANSLATIONS = {
  uz: {
    title: "Onlayn Kutubxona",
    searchPlaceholder: "Kitob yoki muallifni qidirish...",
    booksFound: "natija",
    tabs: { allFields: "Barcha yo'nalishlar", allLevels: "Barcha sinflar" },
    filters: {
      title: "Filtrlar", clear: "Tozalash", sort: "Saralash", defaultSort: "Standart",
      generalSection: "Umumiy",
      academicHierarchy: "Katalog",
      numericSection: "Sinf & Yil",
      scienceField: "Yo'nalish",
      lifePath: "Kitob turi", field: "Bo'lim", publisher: "Nashriyot", editionType: "Nashr turi", subject: "Fan", grade: "Sinf", year: "Yil",
      mobileFilterBtn: "Filtrlar"
    },
    sortOptions: { popular: "Ko'p yuklangan", viewed: "Ko'p ko'rilgan", newest: "Yangi nashr" },
    actions: { view: "Tafsilotlar", readMore: "Batafsil o'qish", loading: "Yuklanmoqda...", share: "Ulashish", copied: "Nusxa olindi!", copyIsbn: "Nusxa olish" },
    drawer: { details: "Tafsilotlar", views: "Ko'rilgan", downloads: "Yuklangan", description: "Tavsif", isbn: "ISBN", publisher: "Nashriyot", grade: "Sinf", year: "Yil", edition: "Nashr" },
    empty: "Ushbu filtrlarga mos kitob topilmadi."
  },
  en: {
    title: "Online Library",
    searchPlaceholder: "Search title or author...",
    booksFound: "results",
    tabs: { allFields: "All Fields", allLevels: "All Levels" },
    filters: {
      title: "Filters", clear: "Clear Filters", sort: "Sort By", defaultSort: "Default",
      generalSection: "General",
      academicHierarchy: "Catalog",
      numericSection: "Level & Year",
      scienceField: "Field",
      lifePath: "Type", field: "Category", publisher: "Publisher", editionType: "Edition Type", subject: "Subject", grade: "Grade", year: "Year",
      mobileFilterBtn: "Filters"
    },
    sortOptions: { popular: "Most Downloaded", viewed: "Most Viewed", newest: "Newest" },
    actions: { view: "Learn more", readMore: "Read More", loading: "Loading...", share: "Share", copied: "Copied!", copyIsbn: "Copy" },
    drawer: { details: "Book Details", views: "Views", downloads: "Downloads", description: "Description", isbn: "ISBN", publisher: "Publisher", grade: "Grade", year: "Year", edition: "Edition" },
    empty: "No books match these filters."
  },
  ru: {
    title: "Онлайн Библиотека",
    searchPlaceholder: "Поиск...",
    booksFound: "результатов",
    tabs: { allFields: "Все направления", allLevels: "Все уровни" },
    filters: {
      title: "Фильтры", clear: "Очистить", sort: "Сортировка", defaultSort: "По умолчанию",
      generalSection: "Общие",
      academicHierarchy: "Каталог",
      numericSection: "Класс и Год",
      scienceField: "Направление",
      lifePath: "Тип книги", field: "Раздел", publisher: "Издатель", editionType: "Тип издания", subject: "Предмет", grade: "Класс", year: "Год",
      mobileFilterBtn: "Фильтры"
    },
    sortOptions: { popular: "Популярные", viewed: "Просматриваемые", newest: "Новые издания" },
    actions: { view: "Подробнее", readMore: "Читать далее", loading: "Загрузка...", share: "Поделиться", copied: "Скопировано!", copyIsbn: "Копировать" },
    drawer: { details: "Детали", views: "Просмотры", downloads: "Скачивания", description: "Описание", isbn: "ISBN", publisher: "Издатель", grade: "Класс", year: "Год", edition: "Издание" },
    empty: "Книги по этим фильтрам не найдены."
  }
};

const SCIENCE_FIELD_TRANS: Record<string, MultilingualString> = {
  "Formal Science": { en: "Formal Science", uz: "Aniq fanlar", ru: "Точные науки" },
  "Natural Science": { en: "Natural Science", uz: "Tabiiy fanlar", ru: "Естественные науки" },
  "Social Science": { en: "Social Science", uz: "Ijtimoiy fanlar", ru: "Социальные науки" }
};

interface MultilingualString { en: string; uz: string; ru: string; }

interface OnlineBook {
  id: string;
  isbn: string;
  order: number;
  title: MultilingualString;
  lifePath: MultilingualString;
  publisher: string;
  scienceField?: string; 
  field: MultilingualString;
  schoolType: MultilingualString;
  grades: number[]; 
  edition?: number; 
  country: string;
  bookType: string;
  editionType: MultilingualString;
  Subject: MultilingualString;
  publishedYear: number;
  authors: string[];
  language: string;
  description: MultilingualString;
  localCoverPath: string;
  telegramLink: string;
  downloadscount: number;
  viewscount: number;
}

interface FilterOption {
  value: string;
  count: number;
}

export default function OnlineLibraryPage() {
  const { lang } = useTeacherLanguage();
  const currentLang = lang as keyof MultilingualString;
  const t = PAGE_TRANSLATIONS[currentLang];

  const [allBooks, setAllBooks] = useState<OnlineBook[]>(() => {
    return (libraryBooks as OnlineBook[]).sort((a, b) => a.order - b.order);
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [schoolTypeFilter, setSchoolTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('none');

  const [filters, setFilters] = useState({
    scienceField: [] as string[],
    field: [] as string[],
    subject: [] as string[],
    lifePath: [] as string[],
    publisher: [] as string[],
    editionType: [] as string[],
    grade: [] as string[],
    year: [] as string[]
  });

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    scienceField: true,
    field: true,
    subject: true,
    grade: true,
    year: true
  });

  const toggleSection = (cat: string) => {
    setOpenSections(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const [visibleCount, setVisibleCount] = useState(15);
  const observerTarget = useRef(null);
  const [selectedBook, setSelectedBook] = useState<OnlineBook | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedIsbn, setCopiedIsbn] = useState(false);

  const getLoc = (multiStr: MultilingualString | undefined | null) => {
    if (!multiStr) return '';
    return multiStr[currentLang] || multiStr.en || '';
  };

  const formatEdition = (edition: number | undefined, lang: string) => {
    if (!edition) return '';
    if (lang === 'uz') return `${edition}-nashr`;
    if (lang === 'ru') return `${edition}-е издание`;
    const j = edition % 10, k = edition % 100;
    if (j === 1 && k !== 11) return edition + "st Edition";
    if (j === 2 && k !== 12) return edition + "nd Edition";
    if (j === 3 && k !== 13) return edition + "rd Edition";
    return edition + "th Edition";
  };

  const formatGrades = (grades: number[]) => {
    if (!grades || grades.length === 0) return 'N/A';
    if (grades.length === 1) return grades[0] === 0 ? 'K' : grades[0].toString();
    const sorted = [...grades].sort((a, b) => a - b);
    const min = sorted[0] === 0 ? 'K' : sorted[0];
    const max = sorted[sorted.length - 1];
    if (sorted.length === max - sorted[0] + 1) return `${min} - ${max}`; 
    return sorted.map(g => g === 0 ? 'K' : g).join(', ');
  };

  const filterDictionaries = useMemo(() => {
    const fields: Record<string, MultilingualString> = {};
    const lifePaths: Record<string, MultilingualString> = {};
    const schoolTypes: Record<string, MultilingualString> = {};
    const editionTypes: Record<string, MultilingualString> = {};
    const subjects: Record<string, MultilingualString> = {};

    allBooks.forEach(b => {
      if (b.field?.en) fields[b.field.en] = b.field;
      if (b.lifePath?.en) lifePaths[b.lifePath.en] = b.lifePath;
      if (b.schoolType?.en) schoolTypes[b.schoolType.en] = b.schoolType;
      if (b.editionType?.en) editionTypes[b.editionType.en] = b.editionType;
      if (b.Subject?.en) subjects[b.Subject.en] = b.Subject;
    });

    return { fields, lifePaths, schoolTypes, editionTypes, subjects };
  }, [allBooks]);

  const uniqueSchoolTypes = useMemo(() => {
    const types = Object.keys(filterDictionaries.schoolTypes);
    const getWeight = (str: string) => {
      const lower = str.toLowerCase();
      if (lower.includes('elementary')) return 1;
      if (lower.includes('middle')) return 2;
      if (lower.includes('high')) return 3;
      return 4;
    };
    return types.sort((a, b) => getWeight(a) - getWeight(b));
  }, [filterDictionaries.schoolTypes]);

  const getBooksExcludingCategory = (excludeCategory?: keyof typeof filters) => {
    return allBooks.filter(b => {
      if (searchQuery.trim() !== '') {
        const lowerQuery = searchQuery.toLowerCase();
        if (!getLoc(b.title).toLowerCase().includes(lowerQuery) && !b.authors.some(a => a.toLowerCase().includes(lowerQuery))) return false;
      }
      if (schoolTypeFilter !== 'all' && b.schoolType?.en !== schoolTypeFilter) return false;

      for (const [key, selectedVals] of Object.entries(filters)) {
        if (key === excludeCategory || selectedVals.length === 0) continue;
        if (key === 'scienceField' && (!b.scienceField || !selectedVals.includes(b.scienceField))) return false;
        if (key === 'field' && (!b.field || !selectedVals.includes(b.field.en))) return false;
        if (key === 'subject' && (!b.Subject || !selectedVals.includes(b.Subject.en))) return false;
        if (key === 'lifePath' && (!b.lifePath || !selectedVals.includes(b.lifePath.en))) return false;
        if (key === 'publisher' && !selectedVals.includes(b.publisher)) return false;
        if (key === 'editionType' && (!b.editionType || !selectedVals.includes(b.editionType.en))) return false;
        if (key === 'grade' && (!b.grades || !b.grades.some(g => selectedVals.includes(g.toString())))) return false;
        if (key === 'year' && !selectedVals.includes(b.publishedYear.toString())) return false;
      }
      return true;
    });
  };

  const processedBooks = useMemo(() => {
    let result = getBooksExcludingCategory(); 
    if (sortBy === 'popular') result.sort((a, b) => (b.downloadscount || 0) - (a.downloadscount || 0));
    else if (sortBy === 'viewed') result.sort((a, b) => (b.viewscount || 0) - (a.viewscount || 0));
    else if (sortBy === 'newest') result.sort((a, b) => (b.publishedYear || 0) - (a.publishedYear || 0));
    else result.sort((a, b) => a.order - b.order);
    return result;
  }, [allBooks, searchQuery, schoolTypeFilter, filters, sortBy]);

  const getDynamicOptions = (category: keyof typeof filters, extractor: (b: OnlineBook) => string | string[]): FilterOption[] => {
    const validBooks = getBooksExcludingCategory(category);
    const counts: Record<string, number> = {};
    
    validBooks.forEach(b => {
      const vals = extractor(b);
      const valArray = Array.isArray(vals) ? vals : [vals];
      valArray.forEach(v => {
        if (v) counts[v] = (counts[v] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => {
        if (!isNaN(Number(a.value)) && !isNaN(Number(b.value))) {
          return category === 'year' ? Number(b.value) - Number(a.value) : Number(a.value) - Number(b.value);
        }
        return a.value.localeCompare(b.value);
      });
  };

  const dynamicScienceFields = useMemo(() => getDynamicOptions('scienceField', b => b.scienceField || ''), [filters, searchQuery, schoolTypeFilter]);
  const dynamicFields = useMemo(() => getDynamicOptions('field', b => b.field?.en || ''), [filters, searchQuery, schoolTypeFilter]);
  const dynamicSubjects = useMemo(() => getDynamicOptions('subject', b => b.Subject?.en || ''), [filters, searchQuery, schoolTypeFilter]);
  
  const dynamicLifePaths = useMemo(() => getDynamicOptions('lifePath', b => b.lifePath?.en || ''), [filters, searchQuery, schoolTypeFilter]);
  const dynamicPublishers = useMemo(() => getDynamicOptions('publisher', b => b.publisher), [filters, searchQuery, schoolTypeFilter]);
  const dynamicEditions = useMemo(() => getDynamicOptions('editionType', b => b.editionType?.en || ''), [filters, searchQuery, schoolTypeFilter]);
  const dynamicGrades = useMemo(() => getDynamicOptions('grade', b => (b.grades || []).map(String)), [filters, searchQuery, schoolTypeFilter]);
  const dynamicYears = useMemo(() => getDynamicOptions('year', b => b.publishedYear.toString()), [filters, searchQuery, schoolTypeFilter]);

  const handleFilterChange = (category: keyof typeof filters, val: string) => {
    setFilters(prev => {
      const isSelected = prev[category].includes(val);
      const newCategoryList = isSelected 
        ? prev[category].filter(item => item !== val) 
        : [...prev[category], val];

      const newState = { ...prev, [category]: newCategoryList };

      // Cascade Reset
      if (category === 'scienceField') {
        newState.field = [];
        newState.subject = [];
      } else if (category === 'field') {
        newState.subject = [];
      }

      return newState;
    });
  };

  const handleClearFilters = () => {
    setFilters({ scienceField: [], field: [], subject: [], lifePath: [], publisher: [], editionType: [], grade: [], year: [] });
    setSortBy('none');
  };

  const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);

  useEffect(() => { setVisibleCount(15); }, [searchQuery, schoolTypeFilter, filters, sortBy]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && visibleCount < processedBooks.length) setVisibleCount(prev => prev + 15); },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [visibleCount, processedBooks.length]);

  const displayedBooks = processedBooks.slice(0, visibleCount);

  // --- RENDERING HELPERS ---
  const renderMultiSelectCheckbox = (label: string, category: keyof typeof filters, options: FilterOption[], dict?: Record<string, MultilingualString>, isCollapsible: boolean = true) => {
    const optionsToShow = options.filter(opt => opt.count > 0 || filters[category].includes(opt.value));
    if (optionsToShow.length === 0) return null;

    const isOpen = isCollapsible ? openSections[category] : true;

    const renderCheckboxes = () => (
      <div className="flex flex-col gap-3 pb-3 pt-1">
        {optionsToShow.map(opt => {
          const isChecked = filters[category].includes(opt.value);
          const displayLabel = dict && dict[opt.value] ? getLoc(dict[opt.value]) : opt.value;
          const isDisabled = opt.count === 0 && !isChecked;

          return (
            <label key={opt.value} className={`flex items-start gap-3 group ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
              <div className="relative flex items-center justify-center shrink-0 mt-[2px]">
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={() => handleFilterChange(category, opt.value)}
                  className="peer appearance-none w-[16px] h-[16px] border-[1.5px] border-outline rounded-[3px] checked:bg-primary checked:border-primary focus:outline-none transition-all cursor-pointer disabled:cursor-not-allowed"
                />
                <Check size={12} strokeWidth={4} className="absolute text-on-primary pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-center justify-between w-full">
                <span className={`text-[13px] leading-tight transition-colors ${isChecked ? 'text-on-surface font-bold' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                  {displayLabel}
                </span>
                <span className="text-[10px] font-semibold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded-m3-xs border border-outline-variant">
                  {opt.count}
                </span>
              </div>
            </label>
          );
        })}
      </div>
    );

    return (
      <div className="mb-5">
        {isCollapsible ? (
          <button 
            onClick={() => toggleSection(category)}
            className="flex w-full items-center justify-between text-[13px] font-bold text-on-surface mb-2 hover:text-primary transition-colors"
          >
            {label}
            <ChevronRight size={14} className={`text-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <h3 className="text-[13px] font-bold text-on-surface mb-2.5">{label}</h3>
        )}
        
        {isCollapsible ? (
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {renderCheckboxes()}
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <div>{renderCheckboxes()}</div>
        )}
      </div>
    );
  };

  const renderMultiSelectGrid = (label: string, category: keyof typeof filters, options: FilterOption[], isNumber = false, isCollapsible: boolean = true) => {
    const optionsToShow = options.filter(opt => opt.count > 0 || filters[category].includes(opt.value));
    if (optionsToShow.length === 0) return null;
    
    const isOpen = isCollapsible ? openSections[category] : true;

    const renderButtons = () => (
      <div className="grid grid-cols-4 gap-2 pb-3 pt-1">
        {optionsToShow.map(opt => {
          const isChecked = filters[category].includes(opt.value);
          const displayLabel = isNumber && opt.value === '0' ? 'K' : opt.value;
          const isDisabled = opt.count === 0 && !isChecked;

          return (
            <button
              key={opt.value}
              disabled={isDisabled}
              onClick={() => handleFilterChange(category, opt.value)}
              className={`py-1.5 text-xs font-bold rounded-m3-sm border transition-all
                ${isChecked ? 'bg-primary border-primary text-on-primary' : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:border-outline hover:bg-state-hover'}
                ${isDisabled ? 'opacity-40 cursor-not-allowed hover:border-outline-variant hover:bg-surface-container-lowest' : ''}
              `}
              title={`${opt.count} ${t.booksFound}`}
            >
              {displayLabel}
            </button>
          );
        })}
      </div>
    );

    return (
      <div className="mb-5">
        {isCollapsible ? (
          <button 
            onClick={() => toggleSection(category)}
            className="flex w-full items-center justify-between text-[13px] font-bold text-on-surface mb-2 hover:text-primary transition-colors"
          >
            {label}
            <ChevronRight size={14} className={`text-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <h3 className="text-[13px] font-bold text-on-surface mb-2.5">{label}</h3>
        )}

        {isCollapsible ? (
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {renderButtons()}
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <div>{renderButtons()}</div>
        )}
      </div>
    );
  };

  const renderSidebarContent = () => (
    <>
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant">
        <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-on-surface-variant" /> {t.filters.title}
        </h2>
        {hasActiveFilters && (
          <button onClick={handleClearFilters} className="text-xs font-bold text-primary hover:underline transition-colors">
            {t.filters.clear}
          </button>
        )}
      </div>
      
      {/* 1. GENERAL SECTION */}
      <h3 className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-4 flex items-center gap-1.5">
        <Layers size={12} /> {t.filters.generalSection}
      </h3>
      
      {renderMultiSelectCheckbox(t.filters.lifePath, "lifePath", dynamicLifePaths, filterDictionaries.lifePaths, false)}
      {renderMultiSelectCheckbox(t.filters.publisher, "publisher", dynamicPublishers, undefined, false)}
      {renderMultiSelectCheckbox(t.filters.editionType, "editionType", dynamicEditions, filterDictionaries.editionTypes, false)}

      <hr className="my-6 border-outline-variant" />

      {/* 2. CATALOG / ACADEMIC HIERARCHY */}
      <div className="mb-2">
        <h3 className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-4 flex items-center gap-1.5">
          <AlignLeft size={12} /> {t.filters.academicHierarchy}
        </h3>

        {/* Level 1 */}
        {renderMultiSelectCheckbox(t.filters.scienceField, "scienceField", dynamicScienceFields, SCIENCE_FIELD_TRANS, true)}
        
        {/* Level 2 (Appears if Level 1 is selected) */}
        {filters.scienceField.length > 0 && (
          <div className="relative ml-[7px] pl-4 border-l-2 border-[color-mix(in_oklab,var(--m3-primary)_30%,transparent)]">
            {renderMultiSelectCheckbox(t.filters.field, "field", dynamicFields, filterDictionaries.fields, true)}
          </div>
        )}

        {/* Level 3 (Appears if Level 2 is selected) */}
        {filters.field.length > 0 && (
          <div className="relative ml-[27px] pl-4 border-l-2 border-[color-mix(in_oklab,var(--m3-primary)_30%,transparent)]">
            {renderMultiSelectCheckbox(t.filters.subject, "subject", dynamicSubjects, filterDictionaries.subjects, true)}
          </div>
        )}
      </div>

      <hr className="my-6 border-outline-variant" />

      {/* 3. NUMERIC SECTION (Grades & Years) */}
      <h3 className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-4 flex items-center gap-1.5">
        <CalendarDays size={12} /> {t.filters.numericSection}
      </h3>

      {renderMultiSelectGrid(t.filters.grade, "grade", dynamicGrades, true, true)}
      {renderMultiSelectGrid(t.filters.year, "year", dynamicYears, false, true)}
    </>
  );

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyIsbn = (isbn: string) => {
    if (!isbn) return;
    navigator.clipboard.writeText(isbn);
    setCopiedIsbn(true);
    setTimeout(() => setCopiedIsbn(false), 2000);
  };

  const handleBookClick = (book: OnlineBook) => {
    const updatedBook = { ...book, viewscount: book.viewscount + 1 };
    setSelectedBook(updatedBook);
    setIsDrawerOpen(true);
    setCopiedLink(false);
    setCopiedIsbn(false);
    setAllBooks(prev => prev.map(b => b.id === book.id ? updatedBook : b));
  };

  const handleDownloadClick = (bookId: string, telegramLink: string) => {
    if (selectedBook) setSelectedBook({ ...selectedBook, downloadscount: selectedBook.downloadscount + 1 });
    setAllBooks(prev => prev.map(b => b.id === bookId ? { ...b, downloadscount: b.downloadscount + 1 } : b));
    window.open(telegramLink, '_blank');
  };

  return (
    <div className="min-h-screen bg-surface font-t-body flex flex-col">

      {/* HEADER */}
      <header className="bg-[color-mix(in_oklab,var(--m3-surface)_85%,transparent)] backdrop-blur-md border-b border-outline-variant t-page-bar sticky top-0 z-40 shadow-elev-1">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4">

          <div className="flex items-center justify-between w-full md:w-auto">
            <h1 className="text-xl font-bold text-on-surface tracking-tight hidden lg:block mr-6">{t.title}</h1>
            <Button
              variant="tonal"
              size="sm"
              icon={<Filter />}
              onClick={() => setIsMobileFiltersOpen(true)}
              className="lg:hidden"
            >
              {t.filters.mobileFilterBtn}
            </Button>
          </div>

          <div className="flex-1 w-full flex items-center gap-4">
            <div className="w-full max-w-md relative ml-auto">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container border-none text-on-surface py-2 pl-9 pr-4 rounded-m3-sm text-sm focus:bg-surface-container-lowest focus:ring-2 focus:ring-[color-mix(in_oklab,var(--m3-primary)_30%,transparent)] transition-all outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="max-w-[1400px] mx-auto w-full px-4 md:px-6 pt-6 pb-12 flex flex-col lg:flex-row gap-8">

        {/* DESKTOP SIDEBAR */}
        <aside className="hidden lg:block w-[260px] shrink-0 h-[calc(100vh-100px)] sticky top-[80px] overflow-y-auto custom-scrollbar bg-surface-container-low p-5 rounded-m3-sm border border-outline-variant shadow-elev-1">
          {renderSidebarContent()}
        </aside>

        {/* MOBILE SIDEBAR */}
        <AnimatePresence>
          {isMobileFiltersOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileFiltersOpen(false)} className="fixed inset-0 bg-scrim backdrop-blur-sm z-[120] lg:hidden" />
              <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 left-0 h-full w-[300px] bg-surface-container-low shadow-elev-3 z-[130] flex flex-col lg:hidden">
                <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container">
                  <h2 className="text-sm font-bold text-on-surface uppercase tracking-widest">{t.filters.title}</h2>
                  <button onClick={() => setIsMobileFiltersOpen(false)} className="p-2 bg-surface-container-highest rounded-full text-on-surface-variant">
                    <X size={16} />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                  {renderSidebarContent()}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* BOOK GRID AREA */}
        <main className="flex-1 min-w-0">

          <div className="flex justify-center mb-10 overflow-x-auto pb-2">
            <div className="inline-flex bg-surface-container-lowest rounded-m3-sm overflow-hidden border border-outline shadow-elev-1" role="group">
              <button
                onClick={() => setSchoolTypeFilter('all')}
                className={`px-5 py-2.5 text-[14px] font-bold border-r border-outline transition-colors ${schoolTypeFilter === 'all' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-state-hover'}`}
              >
                {t.tabs.allLevels}
              </button>
              {uniqueSchoolTypes.map((typeKey, index) => (
                <button
                  key={typeKey}
                  onClick={() => setSchoolTypeFilter(typeKey)}
                  className={`px-5 py-2.5 text-[14px] font-bold capitalize transition-colors ${index !== uniqueSchoolTypes.length - 1 ? 'border-r border-outline' : ''} ${schoolTypeFilter === typeKey ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-state-hover'}`}
                >
                  {getLoc(filterDictionaries.schoolTypes[typeKey])}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 flex justify-between items-center border-b border-outline-variant pb-2">
            <span className="text-sm text-on-surface-variant font-medium">
              {processedBooks.length} {t.booksFound}
            </span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-sm border-none bg-transparent text-on-surface font-bold focus:ring-0 cursor-pointer outline-none">
              <option value="none">{t.filters.defaultSort}</option>
              <option value="popular">{t.sortOptions.popular}</option>
              <option value="viewed">{t.sortOptions.viewed}</option>
              <option value="newest">{t.sortOptions.newest}</option>
            </select>
          </div>

          {processedBooks.length === 0 ? (
            <div className="py-12 bg-surface-container-low rounded-m3-md border border-outline-variant shadow-elev-1">
               <EmptyState
                 icon={<BookOpen />}
                 title={t.empty}
                 action={<Button variant="text" size="sm" onClick={handleClearFilters}>{t.filters.clear}</Button>}
               />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16 justify-items-center mt-6">
              {displayedBooks.map((book) => {
                 const imagePath = book.localCoverPath.replace('./', '/');
                 const bookTitle = getLoc(book.title);

                 return (
                  <div key={book.id} className="flex flex-col items-center group cursor-pointer w-full" onClick={() => handleBookClick(book)}>
                    <div className="h-[240px] md:h-[280px] mb-5 relative transition-transform duration-300 group-hover:-translate-y-2">
                      <img src={imagePath} alt={bookTitle} className="h-full w-auto object-contain shadow-elev-2" />
                    </div>
                    <div className="text-center flex flex-col items-center max-w-[220px]">
                      <h3 className="text-[14px] font-bold text-on-surface leading-snug mb-1">{bookTitle}</h3>
                      {book.edition && (
                        <p className="text-[13px] font-bold text-primary mb-0.5">{formatEdition(book.edition, currentLang)}</p>
                      )}
                      <p className="text-[13px] text-on-surface-variant font-medium mb-2">{getLoc(book.editionType)}</p>
                      <button className="inline-flex items-center justify-center text-[13px] font-bold text-primary group-hover:underline transition-colors">
                        {t.actions.view} <ChevronRight size={14} className="ml-0.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {visibleCount < processedBooks.length && (
            <div ref={observerTarget} className="py-16 flex justify-center">
              <Spinner size={32} />
            </div>
          )}
        </main>
      </div>

      {/* DRAWER */}
      <AnimatePresence>
        {isDrawerOpen && selectedBook && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDrawerOpen(false)} className="fixed inset-0 bg-scrim backdrop-blur-sm z-[150]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 h-full w-full max-w-[420px] bg-surface-container-low shadow-elev-3 z-[160] flex flex-col">

              <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container sticky top-0 z-20">
                <h2 className="text-xs font-bold tracking-widest uppercase text-on-surface">{t.drawer.details}</h2>
                <div className="flex items-center gap-3">
                  <button onClick={handleShare} className="p-2 bg-surface-container-lowest border border-outline-variant rounded-full text-on-surface-variant hover:text-on-surface hover:bg-state-hover transition-colors" title={t.actions.share}>
                    {copiedLink ? <Check size={16} className="text-success" /> : <Share2 size={16} />}
                  </button>
                  <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-surface-container-lowest border border-outline-variant rounded-full text-on-surface-variant hover:text-error hover:bg-error-container transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto custom-scrollbar flex-1 p-6 md:p-8">
                <div className="flex flex-col items-center mb-6">
                  <div className="h-60 shadow-elev-3 border border-outline-variant mb-6 relative rounded-m3-sm overflow-hidden flex-shrink-0 bg-surface-container-lowest">
                    <img src={selectedBook.localCoverPath.replace('./', '/')} alt="Cover" className="h-full w-auto object-contain block" />
                  </div>
                  <h2 className="text-xl font-bold text-on-surface leading-snug text-center mb-2">{getLoc(selectedBook.title)}</h2>
                  <p className="text-sm font-medium text-on-surface-variant text-center">{selectedBook.authors.join(', ')}</p>
                </div>

                <Button
                  variant="filled"
                  size="lg"
                  icon={<BookOpen />}
                  onClick={() => handleDownloadClick(selectedBook.id, selectedBook.telegramLink)}
                  className="w-full mb-8"
                >
                  {t.actions.readMore}
                </Button>

                <div className="mb-8">
                  <h3 className="text-xs font-bold text-on-surface uppercase tracking-widest mb-3 border-b border-outline-variant pb-2">{t.drawer.description}</h3>
                  <div className="text-on-surface-variant text-sm leading-relaxed whitespace-pre-wrap">{getLoc(selectedBook.description) || "No description provided."}</div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-on-surface uppercase tracking-widest mb-3 border-b border-outline-variant pb-2">Info</h3>
                  <ul className="space-y-4 text-sm">
                    <li className="flex justify-between items-center">
                      <span className="text-on-surface-variant font-medium">{t.drawer.isbn}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-on-surface font-bold">{selectedBook.isbn || 'N/A'}</span>
                        {selectedBook.isbn && (
                          <button onClick={() => handleCopyIsbn(selectedBook.isbn)} className="m3-interactive text-on-primary-container bg-primary-container p-1.5 rounded-m3-xs" title={t.actions.copyIsbn}>
                            {copiedIsbn ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                          </button>
                        )}
                      </div>
                    </li>
                    {selectedBook.edition && (
                      <li className="flex justify-between items-center">
                        <span className="text-on-surface-variant font-medium">{t.drawer.edition}</span>
                        <span className="text-on-surface font-bold">{formatEdition(selectedBook.edition, currentLang)}</span>
                      </li>
                    )}
                    <li className="flex justify-between items-center">
                      <span className="text-on-surface-variant font-medium">{t.drawer.publisher}</span>
                      <span className="text-on-surface font-bold">{selectedBook.publisher}</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span className="text-on-surface-variant font-medium">{t.drawer.year}</span>
                      <span className="text-on-surface font-bold">{selectedBook.publishedYear}</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span className="text-on-surface-variant font-medium">{t.drawer.grade}</span>
                      <span className="text-on-surface font-bold">{formatGrades(selectedBook.grades)}</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span className="text-on-surface-variant font-medium">{t.drawer.views}</span>
                      <span className="text-on-surface font-bold flex items-center gap-1"><Eye size={14} className="text-on-surface-variant" />{selectedBook.viewscount}</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span className="text-on-surface-variant font-medium">{t.drawer.downloads}</span>
                      <span className="text-on-surface font-bold flex items-center gap-1"><Download size={14} className="text-on-surface-variant" />{selectedBook.downloadscount}</span>
                    </li>
                  </ul>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
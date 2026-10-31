"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { FolderOpen, Archive, Library, Sparkles, ChevronDown, Plus, Search } from 'lucide-react';
import TestCard from '../_components/TestCard';
import EditTestModal from '../_components/EditTestModal';
import { normalizeQuestions } from '@/lib/questionSchema';
import { useTeacherLanguage } from '@/app/teacher/layout';
import toast from 'react-hot-toast';
import { motion, Variants } from 'framer-motion';
import { Button, Spinner, PillGroup } from '@/components/ui';

// --- TRANSLATION DICTIONARY ---
const LIBRARY_TRANSLATIONS: any = {
  uz: {
    title: "Mening Kutubxonam",
    filters: { active: "Faol Testlar", archived: "Arxivlangan" },
    search: "Yuklanganlarni qidirish...",
    empty: { title: "Testlar topilmadi", desc: "Boshlash uchun yangi test yarating." },
    loadMore: "Yana yuklash",
    items: "Ta",
    createTest: "Yangi Test Yaratish",
    loadError: "Testlarni yuklashda xatolik."
  },
  en: {
    title: "My Library",
    filters: { active: "Active Tests", archived: "Archived" },
    search: "Filter loaded tests...",
    empty: { title: "No tests found", desc: "Create a new test to get started." },
    loadMore: "Load More",
    items: "Items",
    createTest: "Create New Test",
    loadError: "Failed to load tests."
  },
  ru: {
    title: "Моя Библиотека",
    filters: { active: "Активные", archived: "Архив" },
    search: "Поиск по загруженным...",
    empty: { title: "Тесты не найдены", desc: "Создайте новый тест, чтобы начать." },
    loadMore: "Загрузить еще",
    items: "Шт",
    createTest: "Создать Тест",
    loadError: "Не удалось загрузить тесты."
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

        // ── Normalization boundary ────────────────────────────────────────────
        // custom_tests.questions[] holds FROZEN question snapshots that may be
        // legacy-shaped (options map / answer letter / difficulty string) OR
        // canonical v1 (options array / correctAnswer.value / difficulty object).
        // Normalize once here so every consumer below (TestCard → PrintLauncher,
        // EditTestModal → CartItem) reads one shape. Each NormalizedQuestion still
        // carries `raw` = the untouched doc, which is what EditTestModal writes back.
        const fetchedData = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          const rawQuestions: any[] = Array.isArray(data.questions) ? data.questions : [];
          return {
            id: doc.id,
            ...data,
            questions: normalizeQuestions(rawQuestions, lang),
            questionCount: typeof data.questionCount === 'number' ? data.questionCount : rawQuestions.length,
          };
        });
        setTests(prev => isLoadMore ? [...prev, ...fetchedData] : fetchedData);
      } else {
        setHasMore(false);
        if (!isLoadMore) setTests([]);
      }
    } catch (error: any) {
      console.error("Error fetching tests:", error);
      toast.error(t.loadError);
    } finally {
      setIsLoadingData(false);
      setIsLoadingMore(false);
    }
  }, [user, filterStatus, lastDoc, lang]);

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
    return <div className="flex h-[100dvh] bg-surface items-center justify-center"><Spinner size={32}/></div>;
  }

  // Dynamic Theme Palette for Cards
  const THEMES = ['primary', 'secondary', 'tertiary'];

  return (
    <div className="min-h-[100dvh] bg-surface font-t-body pb-[100px] md:pb-12">

      {selectedTest && <EditTestModal key={selectedTest.id} isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); fetchTests(false); }} test={selectedTest} />}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 md:mt-8 relative z-10">

        {/* HEADER — pillbar look (docs/UI_KIT.md): gradient icon chip + title
            + count pill · glass search pill · pill-capsule tabs. */}
        <div className="mb-8 flex flex-col gap-5">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="t-icon-chip grid h-12 w-12 shrink-0 place-items-center rounded-m3-lg">
                <Library size={22} strokeWidth={2.4} />
              </span>
              <h1 className="font-t-display text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface truncate">{t.title}</h1>
              <span className="t-glass-pill hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant tabular-nums">
                <span className={`h-1.5 w-1.5 rounded-full ${filterStatus === 'active' ? 'bg-success' : 'bg-outline'}`} />
                {tests.length}{hasMore ? '+' : ''} {t.items}
              </span>
            </div>

            <label className="t-glass-pill flex h-11 w-full sm:w-72 items-center gap-2.5 rounded-full px-4 text-on-surface-variant focus-within:ring-2 focus-within:ring-primary">
              <Search size={17} className="shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.search}
                aria-label={t.search}
                className="min-w-0 flex-1 bg-transparent text-[13.5px] font-medium text-on-surface placeholder:text-on-surface-variant outline-none"
              />
            </label>
          </div>

          <PillGroup
            ariaLabel={t.title}
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { id: 'active', label: <span className="flex items-center gap-2"><FolderOpen size={16} strokeWidth={2.4} />{t.filters.active}</span> },
              { id: 'archived', label: <span className="flex items-center gap-2"><Archive size={16} strokeWidth={2.4} />{t.filters.archived}</span> },
            ]}
            className="self-start"
          />
        </div>

        {/* 🟢 EDGE-TO-EDGE GRID */}
        {isLoadingData ? (
           <div className="flex justify-center py-20"><Spinner size={32}/></div>
        ) : displayTests.length > 0 ? (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {displayTests.map((test, index) => {
               const themeColor = THEMES[index % THEMES.length];
               return <TestCard key={test.id} test={test} theme={themeColor} onManage={() => handleManage(test)} />;
            })}
          </motion.div>
        ) : (
          /* FUNCTIONAL EMPTY STATE */
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="col-span-full py-16 md:py-24 text-center flex flex-col items-center justify-center bg-surface-container-low border-2 border-dashed border-outline-variant rounded-m3-xl shadow-elev-1 relative overflow-hidden group mt-4">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[color-mix(in_oklab,var(--m3-primary)_10%,transparent)] rounded-full blur-3xl group-hover:bg-[color-mix(in_oklab,var(--m3-primary)_20%,transparent)] transition-colors duration-700 pointer-events-none z-0"></div>
            <div className="w-16 h-16 bg-surface-container rounded-m3-lg flex items-center justify-center mb-5 shadow-elev-1 relative z-10">
              <Sparkles size={28} className="text-on-surface-variant" />
            </div>
            <h3 className="text-[18px] md:text-[20px] font-black text-on-surface tracking-tight relative z-10">{t.empty.title}</h3>
            <p className="text-[13px] md:text-[14px] text-on-surface-variant font-medium mt-1.5 mb-8 max-w-sm relative z-10 px-4">{t.empty.desc}</p>

            {filterStatus === 'active' && !searchQuery && (
              <Button variant="filled" icon={<Plus strokeWidth={2.5} />} onClick={() => router.push('/teacher/create')} className="relative z-10">
                {t.createTest}
              </Button>
            )}
          </motion.div>
        )}

        {/* LOAD MORE BUTTON */}
        {hasMore && !searchQuery && (
          <div className="flex justify-center pt-10 pb-6">
            <Button
              variant="outlined"
              icon={<ChevronDown strokeWidth={2.5} />}
              loading={isLoadingMore}
              onClick={() => fetchTests(true)}
            >
              {t.loadMore}
            </Button>
          </div>
        )}

      </main>
    </div>
  );
}

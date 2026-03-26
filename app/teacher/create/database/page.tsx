"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  DocumentSnapshot,
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { fetchQuestions, Question } from "@/services/quizService";
import rawSyllabusData from "@/data/syllabus.json";
import QuestionCard from "../_components/QuestionCard";
import CartItem from "../_components/CartItem";
import TestConfigurationModal from "../_components/TestConfigurationModal";
import toast from "react-hot-toast";
import { useTeacherLanguage } from "@/app/teacher/layout"; // 🟢 Import Hook

import {
  Save,
  FileText,
  ChevronRight,
  Layout,
  Grid,
  SearchX,
  Loader2,
  ChevronDown,
  Layers,
  X,
  ShoppingBag,
  Sparkles,
  Database,
  Menu,
  Trash2,
  Wand2,
  Check,
} from "lucide-react";

// --- 1. TRANSLATION DICTIONARY ---
const CREATE_TRANSLATIONS = {
  uz: {
    placeholder: "Nomsiz Test...",
    questions: "Savollar",
    publish: "Nashr qilish",
    syllabus: {
      title: "Mundarija",
      subtitle: "Mavzuni tanlang",
    },
    topic: {
      select: "Mavzu tanlanmagan",
      instant: "Tezkor Yuklash",
      auto: "Avto Tanlash:",
      generate: "Yaratish",
      clear: "Tozalash",
    },
    diff: {
      easy: "Oson",
      medium: "O'rtacha",
      hard: "Qiyin",
    },
    list: {
      selectSub: "Boshlash uchun mavzu tanlang",
      notFound: "uchun savollar topilmadi",
      loadMore: "Ko'proq yuklash",
      loading: "Yuklanmoqda...",
    },
    cart: {
      title: "Testni Ko'rish",
      clearAll: "Tozalash",
      emptyTitle: "Test bo'sh",
      emptyDesc: "Maxsus test yaratish uchun ro'yxatdan savollarni tanlang.",
      finalize: "Testni Yakunlash va Nashr Qilish",
      reviewBtn: "Tanlovni Ko'rish",
    },
    toasts: {
      limit: "Maksimal 100 ta savol limiti yetdi!",
      added: "Qo'shildi",
      allAdded: "Barcha ko'rinib turgan savollar qo'shilgan.",
      randomAdded: "Tasodifiy {count} ta savol qo'shildi!",
      limitHit: "{count} ta savol qo'shildi (100 ta limit yetdi!)",
      titleReq: "Iltimos, test nomini kiriting",
      oneReq: "Kamida bitta savol qo'shing",
      success: "Test Nashr Qilindi!",
      fail: "Nashr qilishda xatolik",
      failLoad: "Yuklashda xatolik",
      removed: "Barcha savollar o'chirildi",
      confirmRemove: "Barcha savollarni o'chirmoqchimisiz?",
    },
  },
  en: {
    placeholder: "Untitled Test...",
    questions: "Questions",
    publish: "Publish",
    syllabus: {
      title: "Syllabus",
      subtitle: "Select a topic",
    },
    topic: {
      select: "Select a Topic",
      instant: "Instant Load",
      auto: "Auto Select:",
      generate: "Generate",
      clear: "Clear All",
    },
    diff: {
      easy: "Easy",
      medium: "Medium",
      hard: "Hard",
    },
    list: {
      selectSub: "Select a subtopic to begin",
      notFound: "No questions found for",
      loadMore: "Load More",
      loading: "Loading...",
    },
    cart: {
      title: "Review Test",
      clearAll: "Clear",
      emptyTitle: "Your test is empty",
      emptyDesc: "Select questions from the list to build your custom test.",
      finalize: "Finalize & Publish Test",
      reviewBtn: "Review Selection",
    },
    toasts: {
      limit: "Maximum limit of 100 questions reached!",
      added: "Added",
      allAdded: "All visible questions are already added.",
      randomAdded: "Randomly added {count} questions!",
      limitHit: "Added {count} questions (Hit the 100 limit!)",
      titleReq: "Please enter a test title",
      oneReq: "Add at least one question",
      success: "Test Published!",
      fail: "Failed to publish",
      failLoad: "Failed to load",
      removed: "All questions removed",
      confirmRemove: "Are you sure you want to remove all questions?",
    },
  },
  ru: {
    placeholder: "Тест без названия...",
    questions: "Вопросов",
    publish: "Опубликовать",
    syllabus: {
      title: "Учебный план",
      subtitle: "Выберите тему",
    },
    topic: {
      select: "Выберите тему",
      instant: "Быстрая загрузка",
      auto: "Автовыбор:",
      generate: "Генерировать",
      clear: "Очистить",
    },
    diff: {
      easy: "Легкий",
      medium: "Средний",
      hard: "Сложный",
    },
    list: {
      selectSub: "Выберите подтему, чтобы начать",
      notFound: "Вопросов не найдено для",
      loadMore: "Загрузить еще",
      loading: "Загрузка...",
    },
    cart: {
      title: "Обзор Теста",
      clearAll: "Очистить",
      emptyTitle: "Тест пуст",
      emptyDesc: "Выберите вопросы из списка, чтобы создать тест.",
      finalize: "Завершить и Опубликовать",
      reviewBtn: "Обзор Выбора",
    },
    toasts: {
      limit: "Достигнут лимит в 100 вопросов!",
      added: "Добавлено",
      allAdded: "Все видимые вопросы уже добавлены.",
      randomAdded: "Случайно добавлено {count} вопросов!",
      limitHit: "Добавлено {count} вопросов (Лимит 100!)",
      titleReq: "Пожалуйста, введите название теста",
      oneReq: "Добавьте хотя бы один вопрос",
      success: "Тест опубликован!",
      fail: "Ошибка публикации",
      failLoad: "Ошибка загрузки",
      removed: "Все вопросы удалены",
      confirmRemove: "Вы уверены, что хотите удалить все вопросы?",
    },
  },
};

// --- TYPES ---
interface Subtopic {
  name: string;
  index: number;
}
interface Chapter {
  chapter: string;
  index: number;
  subtopics: Subtopic[];
}
interface Category {
  category: string;
  index: number;
  chapters: Chapter[];
}
interface UIQuestion extends Question {
  uiDifficulty: "Easy" | "Medium" | "Hard";
}

export default function CreateTestPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // 🟢 Use Language Hook
  const { lang } = useTeacherLanguage();
  const t = CREATE_TRANSLATIONS[lang];

  const categories: Category[] = Array.isArray(rawSyllabusData)
    ? (rawSyllabusData as any)
    : [];

  // --- STATE ---
  const [testTitle, setTestTitle] = useState("");

  // Navigation & Data
  const [activeCatIndex, setActiveCatIndex] = useState<number | null>(null);
  const [activeChapIndex, setActiveChapIndex] = useState<number | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<{
    name: string;
    index: number;
  } | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<
    "Easy" | "Medium" | "Hard"
  >("Easy");
  const [availableQuestions, setAvailableQuestions] = useState<UIQuestion[]>(
    []
  );
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Pagination & Cache
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | string | null>(
    null
  );
  const [hasMore, setHasMore] = useState(true);
  const [isCachedData, setIsCachedData] = useState(false);

  // Cart & Logic
  const [addedQuestions, setAddedQuestions] = useState<UIQuestion[]>([]);
  const [randomCount, setRandomCount] = useState<string>("5");
  const [isSaving, setIsSaving] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // UI Toggles
  const [isSyllabusOpen, setIsSyllabusOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // --- CACHE HELPERS ---
  const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
  const getCacheKey = (subIdx: number, diff: string) =>
    `quiz_cache_${activeCatIndex}_${activeChapIndex}_${subIdx}_${diff}`;

  const saveToCache = (key: string, questions: UIQuestion[]) => {
    try {
      const payload = JSON.stringify({
        timestamp: Date.now(),
        data: questions,
      });
      localStorage.setItem(key, payload);
    } catch (e) {
      console.error("Cache Full", e);
    }
  };

  const loadFromCache = (key: string): UIQuestion[] | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - (parsed.timestamp || 0) > CACHE_TTL) {
        localStorage.removeItem(key);
        return null;
      }
      return parsed.data;
    } catch (e) {
      return null;
    }
  };

  // --- FETCH LOGIC ---
  const handleFetch = async (
    subtopic: typeof selectedSubtopic,
    difficulty: typeof difficultyFilter,
    cursor: DocumentSnapshot | string | null
  ) => {
    if (activeCatIndex === null || activeChapIndex === null || !subtopic)
      return;

    const cacheKey = getCacheKey(subtopic.index, difficulty);

    if (!cursor) {
      const cached = loadFromCache(cacheKey);
      if (cached && cached.length > 0) {
        setAvailableQuestions(cached);
        setLastDoc(cached[cached.length - 1].id);
        setIsCachedData(true);
        setHasMore(true);
        return;
      }
    }

    setLoadingQuestions(true);
    try {
      const pathIds = {
        subjectId: "01",
        topicId: activeCatIndex,
        chapterId: activeChapIndex,
        subtopicId: subtopic.index,
      };
      const { questions, lastDoc: newCursor } = await fetchQuestions(
        pathIds,
        difficulty,
        cursor
      );

      const formatted: UIQuestion[] = questions.map((q) => ({
        ...q,
        text:
          typeof q.question === "object"
            ? (q.question as any).uz || "Question Text"
            : q.question || "Question Text",
        uiDifficulty: difficulty,
      }));

      setAvailableQuestions((prev) => {
        const upd = cursor ? [...prev, ...formatted] : formatted;
        saveToCache(cacheKey, upd);
        return upd;
      });
      setLastDoc(newCursor);
      setIsCachedData(false);
      if (questions.length < 5) setHasMore(false);
    } catch (err) {
      console.error(err);
      toast.error(t.toasts.failLoad);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSelectionChange = (
    newSub: typeof selectedSubtopic,
    newDiff: typeof difficultyFilter
  ) => {
    if (!newSub) return;
    setAvailableQuestions([]);
    setLastDoc(null);
    setHasMore(true);
    setIsCachedData(false);
    handleFetch(newSub, newDiff, null);
    if (window.innerWidth < 1024) setIsSyllabusOpen(false);
  };

  const handleLoadMore = () => {
    if (!lastDoc) return;
    handleFetch(selectedSubtopic, difficultyFilter, lastDoc);
  };

  const onDifficultyClick = (d: any) => {
    if (d === difficultyFilter) return;
    setDifficultyFilter(d);
    handleSelectionChange(selectedSubtopic, d);
  };

  const onSubtopicClick = (sub: any) => {
    setSelectedSubtopic(sub);
    handleSelectionChange(sub, difficultyFilter);
  };

  // --- QUESTION LOGIC ---
  const toggleQuestion = (q: UIQuestion) => {
    const exists = addedQuestions.some((item) => item.id === q.id);

    if (exists) {
      setAddedQuestions(addedQuestions.filter((item) => item.id !== q.id));
    } else {
      if (addedQuestions.length >= 100) {
        toast.error(t.toasts.limit, {
          icon: "🚫",
          style: { borderRadius: "10px", background: "#1e293b", color: "#fff" },
        });
        return;
      }
      setAddedQuestions([...addedQuestions, q]);
      toast.success(t.toasts.added, { position: "bottom-center", duration: 1000 });
    }
  };

  const handleAutoSelect = () => {
    if (addedQuestions.length >= 100) {
      toast.error(t.toasts.limit, { icon: "🚫" });
      return;
    }

    const candidates = availableQuestions.filter(
      (q) => !addedQuestions.some((added) => added.id === q.id)
    );

    if (candidates.length === 0) {
      toast(t.toasts.allAdded, { icon: "ℹ️" });
      return;
    }

    const remainingSlots = 100 - addedQuestions.length;
    const userRequested = parseInt(randomCount) || 5;
    const countToAdd = Math.min(
      userRequested,
      remainingSlots,
      candidates.length
    );

    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, countToAdd);

    setAddedQuestions((prev) => [...prev, ...selected]);

    if (countToAdd < userRequested) {
      toast.success(t.toasts.limitHit.replace("{count}", countToAdd.toString()), {
        icon: "⚠️",
      });
    } else {
      toast.success(t.toasts.randomAdded.replace("{count}", countToAdd.toString()), { icon: "✨" });
    }
  };

  const handlePublishClick = () => {
    if (!testTitle.trim()) return toast.error(t.toasts.titleReq);
    if (addedQuestions.length === 0)
      return toast.error(t.toasts.oneReq);
    setIsConfigModalOpen(true);
  };

  const handleFinalPublish = async (settings: any) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "custom_tests"), {
        teacherId: user.uid,
        teacherName: user.displayName,
        title: testTitle,
        accessCode: settings.accessCode,
        duration: settings.duration,
        shuffle: settings.shuffleQuestions,
        resultsVisibility: settings.resultsVisibility || "never",
        status: "active",
        createdAt: serverTimestamp(),
        questionCount: addedQuestions.length,
        questions: addedQuestions,
      });
      toast.success(t.toasts.success);
      setIsConfigModalOpen(false);
      router.push("/teacher/dashboard");
    } catch (error) {
      console.error(error);
      toast.error(t.toasts.fail);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper for Difficulty Colors
  const getDiffStyle = (lvl: string) => {
    if (difficultyFilter !== lvl)
      return "text-slate-500 hover:bg-slate-100 bg-white border-slate-200";
    switch (lvl) {
      case "Easy":
        return "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200";
      case "Medium":
        return "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200";
      case "Hard":
        return "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-200";
      default:
        return "";
    }
  };

  if (!categories.length)
    return <div className="p-10 text-center">Data Error</div>;

  return (
    <div className="h-[100dvh] bg-slate-50 flex flex-col overflow-hidden">
      <TestConfigurationModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onConfirm={handleFinalPublish}
        questionCount={addedQuestions.length}
        testTitle={testTitle}
        isSaving={isSaving}
      />

      {/* --- HEADER --- */}
<header className="bg-white border-b border-slate-200 h-16 shrink-0 flex items-center justify-between px-4 lg:px-6 z-20 shadow-sm relative">
  
  <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0 mr-4">
    <button
      onClick={() => setIsSyllabusOpen(!isSyllabusOpen)}
      className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg active:bg-slate-200 shrink-0"
    >
      <Menu size={20} />
    </button>

    <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-indigo-200 shadow-lg">
      <Sparkles size={18} />
    </div>

    <button
  onClick={() => router.push('/teacher/create-custom-test')}
  className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-bold shadow-md hover:bg-slate-800 transition-colors"
>
  <Wand2 size={16} />
  <span>Create Test from Scratch</span>
</button>

    <input
      type="text"
      placeholder={t.placeholder}
      className="flex-1 min-w-0 text-lg font-bold text-slate-800 placeholder:text-slate-400 border-none outline-none bg-transparent focus:bg-slate-50 focus:ring-2 focus:ring-indigo-100 rounded-md px-2 -ml-2 transition-all truncate"
      value={testTitle}
      onChange={(e) => setTestTitle(e.target.value)}
    />
  </div>

  <div className="flex items-center gap-3 shrink-0">
    <div className="hidden md:flex items-center text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full whitespace-nowrap">
      {addedQuestions.length} {t.questions}
    </div>
    <button
      onClick={handlePublishClick}
      disabled={isSaving}
      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
    >
      <Save size={16} /> <span className="hidden sm:inline">{t.publish}</span>
    </button>
  </div>
</header>

      {/* --- WORKSPACE --- */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* --- A. SYLLABUS --- */}
        <aside
          className={`
          fixed lg:static inset-y-0 left-0 z-40 w-80 bg-slate-50 border-r border-slate-200 transform transition-transform duration-300 shadow-2xl lg:shadow-none
          ${
            isSyllabusOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
          flex flex-col h-full
        `}
        >
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Layers size={18} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-base">{t.syllabus.title}</h2>
                <p className="text-xs text-slate-400">{t.syllabus.subtitle}</p>
              </div>
            </div>
            <button
              onClick={() => setIsSyllabusOpen(false)}
              className="lg:hidden text-slate-400 p-2 hover:bg-slate-100 rounded-full"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3 pb-24 lg:pb-6">
            {categories.map((cat) => {
              const isCatActive = activeCatIndex === cat.index;
              return (
                <div
                  key={cat.index}
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isCatActive
                      ? "bg-white border-indigo-200 shadow-lg ring-1 ring-indigo-100"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <button
                    onClick={() => {
                      setActiveCatIndex(isCatActive ? null : cat.index);
                      setActiveChapIndex(null);
                    }}
                    className={`w-full text-left px-4 py-4 flex justify-between items-center transition-colors group ${
                      isCatActive
                        ? "bg-indigo-600"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`font-bold text-sm ${
                        isCatActive ? "text-white" : "text-slate-700"
                      }`}
                    >
                      {cat.category}
                    </span>
                    <ChevronRight
                      size={16}
                      className={`transition-transform duration-300 ${
                        isCatActive
                          ? "rotate-90 text-indigo-200"
                          : "text-slate-300"
                      }`}
                    />
                  </button>
                  {isCatActive && (
                    <div className="bg-slate-50/50 p-2 space-y-1 border-t border-indigo-50">
                      {cat.chapters.map((chap) => {
                        const isChapActive = activeChapIndex === chap.index;
                        return (
                          <div
                            key={chap.index}
                            className="rounded-xl overflow-hidden"
                          >
                            <button
                              onClick={() =>
                                setActiveChapIndex(
                                  isChapActive ? null : chap.index
                                )
                              }
                              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all duration-200 ${
                                isChapActive
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "text-slate-600 hover:bg-white"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isChapActive
                                      ? "bg-indigo-500"
                                      : "bg-slate-300"
                                  }`}
                                ></span>
                                <span className="truncate">{chap.chapter}</span>
                              </div>
                              {isChapActive && (
                                <ChevronRight
                                  size={12}
                                  className="text-indigo-400 rotate-90"
                                />
                              )}
                            </button>
                            {isChapActive && (
                              <div className="ml-4 pl-3 border-l-2 border-indigo-100 my-2 space-y-1">
                                {chap.subtopics.map((sub) => (
                                  <button
                                    key={sub.index}
                                    onClick={() => onSubtopicClick(sub)}
                                    className={`w-full text-left px-3 py-2 rounded-md text-[11px] font-medium truncate transition-all duration-200 flex items-center gap-2 ${
                                      selectedSubtopic?.index === sub.index
                                        ? "bg-white text-indigo-600 shadow-sm border border-indigo-100 translate-x-1"
                                        : "text-slate-500 hover:text-indigo-600"
                                    }`}
                                  >
                                    {selectedSubtopic?.index === sub.index && (
                                      <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                                    )}
                                    {sub.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {isSyllabusOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setIsSyllabusOpen(false)}
          />
        )}

        {/* --- B. MAIN CONTENT --- */}
        <main className="flex-1 overflow-hidden flex flex-col relative bg-slate-50/50 w-full font-sans">
          <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 z-30 sticky top-0 shadow-sm">
            <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                {selectedSubtopic ? <Layout size={18} /> : <Grid size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-800 truncate text-sm md:text-base leading-tight">
                  {selectedSubtopic ? selectedSubtopic.name : t.topic.select}
                </h3>
                {isCachedData && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                    <Database size={9} /> {t.topic.instant}
                  </span>
                )}
              </div>
            </div>

            <div className="px-4 py-2 flex flex-col md:flex-row gap-3 justify-between items-start md:items-center bg-slate-50/50">
              {/* Difficulty Pills */}
              <div className="flex gap-1.5 shrink-0 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
                {["Easy", "Medium", "Hard"].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => onDifficultyClick(lvl)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all duration-200 whitespace-nowrap ${getDiffStyle(
                      lvl
                    )}`}
                  >
                    {/* @ts-ignore */}
                    {t.diff[lvl.toLowerCase()]}
                  </button>
                ))}
              </div>

              {/* Random Generator */}
              {selectedSubtopic && (
                <div className="flex items-center gap-2 w-full md:w-auto border-t md:border-t-0 border-slate-200 pt-2 md:pt-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:block">
                    {t.topic.auto}
                  </span>
                  <div className="flex items-center gap-1 w-full">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={randomCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setRandomCount(val > 50 ? "50" : e.target.value);
                      }}
                      className="w-12 px-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg text-center focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <button
                      onClick={handleAutoSelect}
                      className="flex-1 md:flex-none px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                      <Wand2 size={12} />{" "}
                      <span className="md:hidden">{t.topic.generate}</span>
                    </button>
                    {addedQuestions.length > 0 && (
                      <button
                        onClick={() => setAddedQuestions([])}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 rounded-lg"
                        title={t.topic.clear}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Question List */}
          <div className="flex-1 overflow-y-auto px-2 md:px-4 pb-28 pt-4 custom-scrollbar scroll-smooth bg-slate-50">
            <div className="max-w-4xl mx-auto space-y-3">
              {!selectedSubtopic ? (
                <div className="flex flex-col items-center justify-center h-[40vh] text-slate-400">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-4">
                    <Layout size={28} className="text-indigo-200 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">
                    {t.list.selectSub}
                  </p>
                </div>
              ) : availableQuestions.length === 0 && !loadingQuestions ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <SearchX size={40} className="text-slate-300 mb-3" />
                  <p className="text-sm">
                    {t.list.notFound}{" "}
                    <span className="font-bold text-slate-500">
                      {/* @ts-ignore */}
                      {t.diff[difficultyFilter.toLowerCase()]}
                    </span>
                  </p>
                </div>
              ) : (
                <>
                  {availableQuestions.map((q, idx) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      index={idx + 1}
                      isAdded={addedQuestions.some((add) => add.id === q.id)}
                      onToggle={() => toggleQuestion(q)}
                      disabled={
                        !addedQuestions.some((add) => add.id === q.id) &&
                        addedQuestions.length >= 100
                      }
                    />
                  ))}
                  {hasMore && (
                    <div className="pt-6 pb-10 text-center">
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingQuestions}
                        className="w-full md:w-auto px-6 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
                      >
                        {loadingQuestions ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 size={14} className="animate-spin" />{" "}
                            {t.list.loading}
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            {t.list.loadMore} <ChevronDown size={14} />
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>

        {/* --- C. CART DRAWER --- */}
        <aside
          className={`
            fixed lg:static inset-x-0 bottom-0 lg:inset-y-0 lg:right-0 z-50 
            w-full lg:w-96 bg-slate-900 text-white 
            transform transition-transform duration-300 ease-out
            ${isCartOpen ? "translate-y-0" : "translate-y-full lg:translate-y-0"}
            lg:translate-x-0 flex flex-col border-t lg:border-l border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] lg:shadow-none 
            h-[90vh] lg:h-full rounded-t-3xl lg:rounded-none
            `}
        >
          <div
            className="lg:hidden flex justify-center pt-3 pb-1 w-full"
            onClick={() => setIsCartOpen(false)}
          >
            <div className="w-12 h-1.5 bg-slate-700 rounded-full cursor-pointer opacity-50 hover:opacity-100 transition-opacity"></div>
          </div>

          <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
            <div>
              <h3 className="font-bold flex items-center gap-2 text-indigo-400 text-lg">
                <ShoppingBag size={20} /> {t.cart.title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                {addedQuestions.length} / 100 {t.questions}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {addedQuestions.length > 0 && (
                <button
                  onClick={() => {
                    if (
                      confirm(t.toasts.confirmRemove)
                    ) {
                      setAddedQuestions([]);
                      toast.success(t.toasts.removed);
                    }
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-red-400 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> {t.cart.clearAll}
                </button>
              )}
              <button
                onClick={() => setIsCartOpen(false)}
                className="lg:hidden p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-300"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {addedQuestions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center mx-2">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <FileText size={32} className="opacity-40" />
                </div>
                <p className="text-sm font-medium text-slate-400">
                  {t.cart.emptyTitle}
                </p>
                <p className="text-xs text-slate-500 mt-2 max-w-[200px]">
                  {t.cart.emptyDesc}
                </p>
              </div>
            ) : (
              addedQuestions.map((q, idx) => (
                <CartItem
                  key={q.id}
                  index={idx + 1}
                  question={q}
                  onRemove={() => toggleQuestion(q)}
                />
              ))
            )}
          </div>

          <div className="p-4 bg-slate-900 border-t border-slate-800 pb-8 lg:pb-4 shrink-0 z-10">
            <button
              onClick={handlePublishClick}
              disabled={addedQuestions.length === 0}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl font-bold text-white shadow-lg shadow-indigo-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Check size={18} strokeWidth={3} />
              {t.cart.finalize}
            </button>
          </div>
        </aside>

        {isCartOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          />
        )}

        {/* --- D. FLOATING ACTION BUTTON --- */}
        {!isCartOpen && (
          <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-auto">
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-3 bg-slate-900 text-white pl-5 pr-6 py-3 rounded-full shadow-2xl shadow-slate-900/40 hover:scale-105 transition-transform active:scale-95 ring-2 ring-white/10 backdrop-blur-md"
            >
              <div className="relative">
                <ShoppingBag size={20} />
                {addedQuestions.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full text-[9px] flex items-center justify-center font-bold border border-slate-900 animate-in zoom-in">
                    {addedQuestions.length}
                  </span>
                )}
              </div>
              <span className="font-bold text-sm whitespace-nowrap">
                {t.cart.reviewBtn}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
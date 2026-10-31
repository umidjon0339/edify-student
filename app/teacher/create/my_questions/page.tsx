"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Database,BookMarked,BookOpen,ChevronRight, Layers, Calendar, Folder, Target, CheckCircle2, Trash2, Eye, Pencil, Image as ImageIcon, Plus, Search, Sparkles, Filter, X, AlertCircle, User } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs, startAfter, DocumentData, QueryDocumentSnapshot, deleteDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

import { useTeacherLanguage } from "@/app/teacher/layout";
import TestConfigurationModal from "@/app/teacher/create/_components/TestConfigurationModal";
import { normalizeQuestion } from "@/lib/questionSchema";
import QuestionPartsPreview from "@/components/QuestionPartsPreview";
import { cacheList, cacheQuestion, getCachedList, invalidateQuestionCache, listKey } from "@/lib/questionCache";
import {
  AI_CREATION_METHODS as AI_METHODS,
  DIFFICULTY_ID_BY_NAME,
  IMAGE_CREATION_METHODS as IMAGE_METHODS,
  MANUAL_CREATION_METHODS as MANUAL_METHODS,
} from "@/types/question";

import { Button, IconButton, Spinner, Skeleton } from "@/components/ui";

import SolutionSteps from "@/components/SolutionSteps";
// The bank holds questions from every era. A filter chip must match BOTH the
// legacy creationMethod values and the v1 enum, so each chip queries an `in`
// list. Firestore bills only the docs returned — no extra reads. The lists live
// in types/question.ts because the Rasch builder's picker filters on them too.

// --- TRANSLATION DICTIONARY ---
const PAGE_TRANSLATIONS = {
  uz: {
    noData: "Ma'lumot yo'q",
    indexError: "Firebase Index xatosi! Konsolga qarab index yarating.",
    deleted: "Savol o'chirildi",
    deleteError: "O'chirishda xatolik yuz berdi",
    enterTitleErr: "Test nomini kiriting",
    noSelectedFound: "Tanlangan savollar topilmadi",
    testCreated: "Test muvaffaqiyatli yaratildi!",
    createError: "Test yaratishda xatolik",
    bankTitle: "Savollar Bazasi",
    countSuffix: "ta savol",
    filterAll: "Barchasi",
    filterAi: "Smart AI",
    filterImage: "Rasm orqali",
    easy: "Oson", medium: "O'rta", hard: "Qiyin",
    notFound: "Savollar topilmadi",
    notFoundDesc: "Ushbu filtr bo'yicha bazangizda savollar yo'q.",
    showAll: "Barcha savollarni ko'rish",
    subjectFallback: "Umumiy Fan",
    methodCustom: "Maxsus",
    methodImage: "Rasm",
    methodAi: "AI",
    blockLabel: (n: number) => `Blok · ${n} savol`,
    imageQuestion: "Rasmli savol",
    correctedBy: "Tuzatgan:",
    recently: "Yaqinda",
    viewFull: "To'liq ko'rish",
    edit: "Tahrirlash",
    allLoaded: "Barcha savollar yuklandi",
    selectedWord1: "savol",
    selectedWord2: "tanlandi",
    createTest: "Topshiriq yaratish",
    fullInfo: "To'liq Ma'lumot",
    questionTextLabel: "Savol Matni",
    questionsCount: (n: number) => `Savollar (${n})`,
    variants: "Variantlar",
    correctAnswer: "To'g'ri Javob",
    solutionExp: "Yechim / Izoh",
    deleteConfirm: "O'chirishni tasdiqlaysizmi?",
    deleteConfirmDesc: "Bu savol bazadan butunlay o'chiriladi. Bu jarayonni orqaga qaytarib bo'lmaydi.",
    cancel: "Bekor qilish",
    delete: "O'chirish",
    titleModalTitle: "Test nomini kiriting",
    titleModalDesc: (n: number) => `Tanlangan ${n} ta savoldan iborat test uchun nom bering.`,
    titlePlaceholder: "Masalan: Aralash savollar to'plami",
    continue: "Davom etish"
  },
  en: {
    noData: "No data",
    indexError: "Firebase Index error! Check the console and create the index.",
    deleted: "Question deleted",
    deleteError: "An error occurred while deleting",
    enterTitleErr: "Enter a test title",
    noSelectedFound: "Selected questions not found",
    testCreated: "Test created successfully!",
    createError: "An error occurred while creating the test",
    bankTitle: "Question Bank",
    countSuffix: "questions",
    filterAll: "All",
    filterAi: "Smart AI",
    filterImage: "By Image",
    easy: "Easy", medium: "Medium", hard: "Hard",
    notFound: "No questions found",
    notFoundDesc: "There are no questions in your bank for this filter.",
    showAll: "Show all questions",
    subjectFallback: "General Subject",
    methodCustom: "Custom",
    methodImage: "Image",
    methodAi: "AI",
    blockLabel: (n: number) => `Block · ${n} questions`,
    imageQuestion: "Image question",
    correctedBy: "Corrected by:",
    recently: "Recently",
    viewFull: "View full",
    edit: "Edit",
    allLoaded: "All questions loaded",
    selectedWord1: "questions",
    selectedWord2: "selected",
    createTest: "Create Test",
    fullInfo: "Full Details",
    questionTextLabel: "Question Text",
    questionsCount: (n: number) => `Questions (${n})`,
    variants: "Options",
    correctAnswer: "Correct Answer",
    solutionExp: "Solution / Explanation",
    deleteConfirm: "Confirm deletion?",
    deleteConfirmDesc: "This question will be permanently deleted from the bank. This action cannot be undone.",
    cancel: "Cancel",
    delete: "Delete",
    titleModalTitle: "Enter a test title",
    titleModalDesc: (n: number) => `Give a title for the test made up of ${n} selected questions.`,
    titlePlaceholder: "e.g., Mixed question set",
    continue: "Continue"
  },
  ru: {
    noData: "Нет данных",
    indexError: "Ошибка индекса Firebase! Проверьте консоль и создайте индекс.",
    deleted: "Вопрос удалён",
    deleteError: "Произошла ошибка при удалении",
    enterTitleErr: "Введите название теста",
    noSelectedFound: "Выбранные вопросы не найдены",
    testCreated: "Тест успешно создан!",
    createError: "Произошла ошибка при создании теста",
    bankTitle: "База вопросов",
    countSuffix: "вопросов",
    filterAll: "Все",
    filterAi: "Smart AI",
    filterImage: "По фото",
    easy: "Легкий", medium: "Средний", hard: "Сложный",
    notFound: "Вопросы не найдены",
    notFoundDesc: "В вашей базе нет вопросов по этому фильтру.",
    showAll: "Показать все вопросы",
    subjectFallback: "Общий предмет",
    methodCustom: "Свой",
    methodImage: "Фото",
    methodAi: "AI",
    blockLabel: (n: number) => `Блок · ${n} вопросов`,
    imageQuestion: "Вопрос с картинкой",
    correctedBy: "Исправил:",
    recently: "Недавно",
    viewFull: "Подробнее",
    edit: "Редактировать",
    allLoaded: "Все вопросы загружены",
    selectedWord1: "вопросов",
    selectedWord2: "выбрано",
    createTest: "Создать тест",
    fullInfo: "Полная информация",
    questionTextLabel: "Текст вопроса",
    questionsCount: (n: number) => `Вопросы (${n})`,
    variants: "Варианты",
    correctAnswer: "Правильный ответ",
    solutionExp: "Решение / Пояснение",
    deleteConfirm: "Подтвердить удаление?",
    deleteConfirmDesc: "Этот вопрос будет полностью удалён из базы. Это действие нельзя отменить.",
    cancel: "Отмена",
    delete: "Удалить",
    titleModalTitle: "Введите название теста",
    titleModalDesc: (n: number) => `Дайте название тесту из ${n} выбранных вопросов.`,
    titlePlaceholder: "Например: Сборник смешанных вопросов",
    continue: "Продолжить"
  }
};

// --- LATEX FORMATTER ---
const FormattedText = ({ text, empty = "" }: { text: any, empty?: string }) => {
  if (!text) return <span className="text-on-surface-variant italic">{empty}</span>;
  let content = typeof text === 'string' ? text : JSON.stringify(text);
  const hasMathCommands = /\\frac|\\pi|\\sin|\\cos|\\tan|\\ge|\\le|\\cup|\\cap|\\in|\\begin|\\sqrt|\\empty/.test(content);
  if (!content.includes('$') && hasMathCommands) content = `$${content}$`;
  content = content.replace(/\\\((.*?)\\\)/g, '$$$1$$').replace(/\\\[(.*?)\\\]/g, '$$$$$1$$$$').replace(/&nbsp;/g, ' ').replace(/\\\\/g, '\\');                 
  const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

  return (
    <span className="break-words leading-relaxed">
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(math, { displayMode: true, throwOnError: false, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="block my-2 text-center overflow-x-auto custom-scrollbar" />;
          } catch (e) { return <span key={index} className="text-error font-mono text-[11px] bg-error-container px-1 rounded-m3-xs">{part}</span>; }
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(math, { displayMode: false, throwOnError: false, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="px-0.5 inline-block" />;
          } catch (e) { return <span key={index} className="text-error font-mono text-[11px] bg-error-container px-1 rounded-m3-xs">{part}</span>; }
        }
        return <span key={index}>{part.split('\n').map((line, i, arr) => (<span key={i}>{line}{i < arr.length - 1 && <br />}</span>))}</span>;
      })}
    </span>
  );
};

export default function MyQuestionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = PAGE_TRANSLATIONS[lang] || PAGE_TRANSLATIONS['en'];
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // --- STATE ---
  const [questions, setQuestions] = useState<any[]>([]);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const FETCH_LIMIT = 15;

  // Shopping Cart & Filters
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string>("all");
  
  // Modals
  const [infoModalData, setInfoModalData] = useState<any | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [testTitle, setTestTitle] = useState("");
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // --- INITIAL FETCH ---
  useEffect(() => {
    if (!user) return;
    fetchInitialQuestions();
  }, [user, activeFilter]);

  const fetchInitialQuestions = async () => {
    // Coming back from the editor, or flipping a filter chip back and forth, used
    // to re-read 15 documents every time. Within the 60s TTL that is now free.
    // (No cursor is cached, so "load more" simply starts a fresh paged read.)
    const cached = getCachedList(listKey(user!.uid, activeFilter));
    if (cached) {
      setQuestions(cached);
      setLoading(false);
      setHasMore(false);
      return;
    }

    setLoading(true);
    setQuestions([]);
    setLastVisible(null);
    setHasMore(true);

    try {
      let q = query(collection(db, "teacher_questions"), where("creatorId", "==", user!.uid));
      
      // Apply filters
      // Filter on difficultyId / a creationMethod `in` list, NOT on the legacy
      // `difficulty` string: v1 docs store difficulty as an object, so a
      // `where("difficulty","==","easy")` would silently return zero new
      // questions. difficultyId is flat on BOTH shapes — one query, both eras.
      if (activeFilter === "easy") q = query(q, where("difficultyId", "==", DIFFICULTY_ID_BY_NAME.easy));
      else if (activeFilter === "medium") q = query(q, where("difficultyId", "==", DIFFICULTY_ID_BY_NAME.medium));
      else if (activeFilter === "hard") q = query(q, where("difficultyId", "==", DIFFICULTY_ID_BY_NAME.hard));
      else if (activeFilter === "ai") q = query(q, where("creationMethod", "in", AI_METHODS));
      else if (activeFilter === "image") q = query(q, where("creationMethod", "in", IMAGE_METHODS));
      else if (activeFilter === "custom") q = query(q, where("creationMethod", "in", MANUAL_METHODS));
      
      q = query(q, orderBy("createdAt", "desc"), limit(FETCH_LIMIT));
      
      const querySnapshot = await getDocs(q);
      // Normalized at the boundary: v1 and legacy docs render identically below.
      const fetchedQs = querySnapshot.docs.map(doc => normalizeQuestion({ ...doc.data(), id: doc.id }));
      setQuestions(fetchedQs);
      cacheList(listKey(user!.uid, activeFilter), fetchedQs);

      if (querySnapshot.docs.length < FETCH_LIMIT) setHasMore(false);
      else setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      
    } catch (error: any) {
      console.error("Error fetching questions:", error);
      if (error.message.includes("requires an index")) toast.error(t.indexError);
    } finally {
      setLoading(false);
    }
  };

  // --- FETCH MORE (INFINITE SCROLL) ---
  const fetchMoreQuestions = async () => {
    if (!user || !lastVisible || !hasMore || loadingMore) return;
    setLoadingMore(true);

    try {
      let q = query(collection(db, "teacher_questions"), where("creatorId", "==", user!.uid));
      
      // Filter on difficultyId / a creationMethod `in` list, NOT on the legacy
      // `difficulty` string: v1 docs store difficulty as an object, so a
      // `where("difficulty","==","easy")` would silently return zero new
      // questions. difficultyId is flat on BOTH shapes — one query, both eras.
      if (activeFilter === "easy") q = query(q, where("difficultyId", "==", DIFFICULTY_ID_BY_NAME.easy));
      else if (activeFilter === "medium") q = query(q, where("difficultyId", "==", DIFFICULTY_ID_BY_NAME.medium));
      else if (activeFilter === "hard") q = query(q, where("difficultyId", "==", DIFFICULTY_ID_BY_NAME.hard));
      else if (activeFilter === "ai") q = query(q, where("creationMethod", "in", AI_METHODS));
      else if (activeFilter === "image") q = query(q, where("creationMethod", "in", IMAGE_METHODS));
      else if (activeFilter === "custom") q = query(q, where("creationMethod", "in", MANUAL_METHODS));

      q = query(q, orderBy("createdAt", "desc"), startAfter(lastVisible), limit(FETCH_LIMIT));
      
      const querySnapshot = await getDocs(q);
      const newQs = querySnapshot.docs.map(doc => normalizeQuestion({ ...doc.data(), id: doc.id }));
      setQuestions(prev => [...prev, ...newQs]);
      
      if (querySnapshot.docs.length < FETCH_LIMIT) setHasMore(false);
      else setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
    } catch (error) {
      console.error("Error fetching more:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // --- INTERSECTION OBSERVER ---
  const observer = useRef<IntersectionObserver | null>(null);
  const lastQuestionElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) fetchMoreQuestions();
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  // --- ACTIONS ---
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedQuestions);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedQuestions(newSet);
  };

  const handleDelete = async () => {
    if (!deleteModalId) return;
    try {
      await deleteDoc(doc(db, "teacher_questions", deleteModalId));
      // The cached bank list still holds this question — drop it, or it reappears
      // for up to 60s after being deleted.
      invalidateQuestionCache(deleteModalId);
      setQuestions(prev => prev.filter(q => q.id !== deleteModalId));

      const newSet = new Set(selectedQuestions);
      newSet.delete(deleteModalId);
      setSelectedQuestions(newSet);
      
      toast.success(t.deleted);
    } catch (error: any) {
      // 🟢 ASL XATONING NIMALIGINI KONSOLGA CHIQARAMIZ:
      console.error("ASL XATOLIK:", error);
      toast.error(error.message || t.deleteError);
    } finally {
      setDeleteModalId(null);
    }
  };

  const handleCreateTestInitiate = () => {
    if (selectedQuestions.size === 0) return;
    setIsTitleModalOpen(true);
  };

  const handleTitleSubmit = () => {
    if (!testTitle.trim()) return toast.error(t.enterTitleErr);
    setIsTitleModalOpen(false);
    setIsConfigModalOpen(true);
  };

  const handleFinalPublish = async (testSettings: any) => {
    if (!user || selectedQuestions.size === 0) return;
    setIsPublishing(true);

    const selectedQsData = questions.filter(q => selectedQuestions.has(q.id));
    if (selectedQsData.length === 0) {
      setIsPublishing(false);
      return toast.error(t.noSelectedFound);
    }

    try {
      const uniqueSubjects = [...new Set(selectedQsData.map(q => q.subject || "Umumiy"))];
      const finalSubjectName = uniqueSubjects.length === 1 ? uniqueSubjects[0] : "Aralash fanlar";

      // The embedded snapshot must be the STORED doc, not the normalized view
      // model (which carries a `raw` back-reference and a flattened shape).
      // Readers normalize on the way out — see lib/questionSchema.ts.
      const embeddedQuestions = selectedQsData.map(q => q.raw);

      // ✅ THIS IS THE CORRECT V9 SYNTAX
      await addDoc(collection(db, "custom_tests"), {
        teacherId: user.uid,
        title: testTitle,
        track: "custom_mix",
        subjectName: finalSubjectName,
        topicName: "Aralash",
        chapterName: "Aralash",
        subtopicName: "Aralash",
        questions: embeddedQuestions,
        duration: testSettings.duration,
        shuffle: testSettings.shuffleQuestions,
        resultsVisibility: testSettings.resultsVisibility,
        accessCode: testSettings.accessCode,
        status: "active",
        createdAt: serverTimestamp(),
        questionCount: selectedQsData.length,
      });

      toast.success(t.testCreated);
      setSelectedQuestions(new Set());
      setIsConfigModalOpen(false);
      setTestTitle("");
      router.push("/teacher/dashboard");
    } catch (error) {
      console.error(error);
      toast.error(t.createError);
    } finally {
      setIsPublishing(false);
    }
  };

  // --- HELPERS ---
  const getText = (field: any): string => {
    if (!field) return t.noData;
    if (typeof field === "string") return field;
    if (field.uz && typeof field.uz === "string") return field.uz;
    if (field.uz && field.uz.uz) return field.uz.uz; 
    return JSON.stringify(field); 
  };

  // --- UI RENDER ---
  return (
    <div className="min-h-[100dvh] bg-surface font-t-body pb-32">

      {/* 🟢 TOP HEADER */}
      <div className="bg-[color-mix(in_oklab,var(--m3-surface)_85%,transparent)] backdrop-blur-md border-b border-outline-variant t-page-bar sticky top-0 z-30 shadow-elev-1">
        <div className="max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 md:gap-3">
              <IconButton aria-label="Orqaga" size="sm" className="-ml-1 md:-ml-2" onClick={() => router.push('/teacher/create')}>
                <ArrowLeft />
              </IconButton>
              <div>
                <h1 className="text-[14px] md:text-[16px] font-black text-on-surface tracking-tight flex items-center gap-1.5 md:gap-2">
                  <Database size={16} className="text-primary" /> {t.bankTitle}
                </h1>
              </div>
            </div>
            <div className="text-[10px] md:text-[12px] font-bold text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-m3-xs border border-outline-variant">
              {questions.length} {t.countSuffix}
            </div>
          </div>

          {/* 🟢 SMART PILL FILTERS */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 -mx-3 px-3 md:mx-0 md:px-0">
            <button onClick={() => setActiveFilter("all")} className={`m3-interactive px-3 py-1.5 rounded-m3-sm text-[10px] md:text-[11px] font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeFilter === "all" ? "bg-primary text-on-primary shadow-elev-1" : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"}`}>
              <Layers size={12}/> {t.filterAll}
            </button>
            <div className="w-px h-4 bg-outline-variant shrink-0 mx-1"></div>
            <button onClick={() => setActiveFilter("ai")} className={`m3-interactive px-3 py-1.5 rounded-m3-sm text-[10px] md:text-[11px] font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeFilter === "ai" ? "bg-secondary text-on-secondary shadow-elev-1" : "bg-secondary-container border border-transparent text-on-secondary-container"}`}>
              <Sparkles size={12}/> {t.filterAi}
            </button>
            <button onClick={() => setActiveFilter("image")} className={`m3-interactive px-3 py-1.5 rounded-m3-sm text-[10px] md:text-[11px] font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeFilter === "image" ? "bg-tertiary text-on-tertiary shadow-elev-1" : "bg-tertiary-container border border-transparent text-on-tertiary-container"}`}>
              <Eye size={12}/> {t.filterImage}
            </button>
            <div className="w-px h-4 bg-outline-variant shrink-0 mx-1"></div>
            <button onClick={() => setActiveFilter("easy")} className={`m3-interactive px-3 py-1.5 rounded-m3-sm text-[10px] md:text-[11px] font-bold whitespace-nowrap transition-colors ${activeFilter === "easy" ? "bg-inverse-surface text-inverse-on-surface shadow-elev-1" : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"}`}>{t.easy}</button>
            <button onClick={() => setActiveFilter("medium")} className={`m3-interactive px-3 py-1.5 rounded-m3-sm text-[10px] md:text-[11px] font-bold whitespace-nowrap transition-colors ${activeFilter === "medium" ? "bg-inverse-surface text-inverse-on-surface shadow-elev-1" : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"}`}>{t.medium}</button>
            <button onClick={() => setActiveFilter("hard")} className={`m3-interactive px-3 py-1.5 rounded-m3-sm text-[10px] md:text-[11px] font-bold whitespace-nowrap transition-colors ${activeFilter === "hard" ? "bg-inverse-surface text-inverse-on-surface shadow-elev-1" : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"}`}>{t.hard}</button>
          </div>
        </div>
      </div>

      {/* 🟢 MAIN LIST */}
      <div className="max-w-4xl mx-auto px-3 md:px-4 mt-4 md:mt-6">
        
        {loading ? (
          <div className="space-y-3 md:space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-surface-container-low p-4 rounded-m3-lg border border-outline-variant h-28 flex flex-col justify-between">
                <div className="flex gap-2"><Skeleton className="w-12 h-4" /><Skeleton className="w-20 h-4" /></div>
                <div className="space-y-2"><Skeleton className="w-full h-2.5 rounded-full" /><Skeleton className="w-2/3 h-2.5 rounded-full" /></div>
              </div>
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-surface-container-low rounded-m3-xl border border-outline-variant p-8 md:p-12 text-center shadow-elev-1 mt-8">
            <div className="w-14 h-14 bg-surface-container border border-outline-variant rounded-m3-lg flex items-center justify-center mx-auto mb-4"><Filter size={24} className="text-on-surface-variant" /></div>
            <h2 className="text-[15px] md:text-[16px] font-black text-on-surface mb-1.5">{t.notFound}</h2>
            <p className="text-[11px] md:text-[13px] text-on-surface-variant mb-6 max-w-sm mx-auto">{t.notFoundDesc}</p>
            <Button variant="tonal" size="sm" onClick={() => setActiveFilter("all")}>{t.showAll}</Button>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {questions.map((q, index) => {
              const isSelected = selectedQuestions.has(q.id);
              const questionText = getText(q.question);
              const subject = q.subject && q.subject !== "by_image" ? q.subject : t.subjectFallback;
              const diff = q.difficulty || "medium";
              const method = q.creationMethod || "custom";

              // Method styling
              let methodStyle = "bg-surface-container-high text-on-surface-variant border-transparent";
              let methodLabel = t.methodCustom;
              let MethodIcon = Layers;
              if (method === "by_image") { methodStyle = "bg-tertiary-container text-on-tertiary-container border-transparent"; methodLabel = t.methodImage; MethodIcon = Eye; }
              else if (method.includes("ai")) { methodStyle = "bg-secondary-container text-on-secondary-container border-transparent"; methodLabel = t.methodAi; MethodIcon = Sparkles; }

              const cardContent = (
                <div className={`bg-surface-container-low p-3.5 md:p-5 rounded-m3-lg border-[2px] transition-all duration-200 group relative ${isSelected ? 'border-primary shadow-elev-2 ring-4 ring-[color-mix(in_oklab,var(--m3-primary)_10%,transparent)]' : 'border-outline-variant shadow-elev-1 hover:shadow-elev-2 hover:border-outline'}`}>

                  {/* Select Checkbox (Absolute Top Right) */}
                  <div className="absolute top-3.5 right-3.5 md:top-5 md:right-5 z-10">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelection(q.id); }}
                      className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-primary border-primary text-on-primary scale-110 shadow-elev-1' : 'bg-surface-container border-outline text-transparent hover:border-primary'}`}
                    >
                      <CheckCircle2 size={14} className="md:w-4 md:h-4" strokeWidth={3} />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-3 pr-10">
                    <span className={`text-[9px] md:text-[10px] font-black px-2 py-1 rounded-m3-xs uppercase flex items-center gap-1 border ${methodStyle}`}>
                      <MethodIcon size={10} strokeWidth={2.5}/> {methodLabel}
                    </span>
                    <span className="bg-surface-container text-on-surface-variant text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-m3-xs border border-outline-variant uppercase flex items-center gap-1">
                      <Folder size={10} /> <span className="truncate max-w-[100px]">{subject}</span>
                    </span>
                    <span className={`text-[9px] md:text-[10px] font-black px-2 py-1 rounded-m3-xs uppercase border border-transparent ${diff === 'hard' ? 'bg-error-container text-on-error-container' : diff === 'easy' ? 'bg-success-container text-on-success-container' : 'bg-warning-container text-on-warning-container'}`}>
                      {diff}
                    </span>
                    {/* A block holds several sub-questions — say so, or it looks like a
                        normal question whose answer is missing. */}
                    {q.isBlock && (
                      <span className="bg-primary-container text-on-primary-container text-[9px] md:text-[10px] font-black px-2 py-1 rounded-m3-xs uppercase flex items-center gap-1">
                        <Layers size={10} /> {t.blockLabel(q.parts.length)}
                      </span>
                    )}
                  </div>

                  {/* Prompt + its image side by side. An image-only question used to
                      render as an empty card — it now shows the picture and a label. */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 font-semibold text-[12px] md:text-[14px] text-on-surface leading-snug line-clamp-2 pr-2">
                      {questionText ? (
                        <FormattedText text={questionText} />
                      ) : (
                        <span className="text-on-surface-variant italic flex items-center gap-1.5">
                          <ImageIcon size={13} /> {t.imageQuestion}
                        </span>
                      )}
                    </div>

                    {q.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={q.imageUrl}
                        alt=""
                        loading="lazy"
                        className="w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-m3-sm border border-outline-variant object-cover bg-surface-container"
                      />
                    )}
                  </div>

                  {/* Options that are pictures — the whole point of the question. */}
                  {q.optionList.some((o: any) => o.imageUrl) && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {q.optionList.filter((o: any) => o.imageUrl).map((o: any) => (
                        <div key={o.id} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={o.imageUrl} alt="" loading="lazy" className="w-11 h-11 rounded-m3-xs border border-outline-variant object-cover bg-surface-container" />
                          <span className="absolute -top-1 -left-1 bg-inverse-surface text-inverse-on-surface text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">{o.id}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.correctedBy && (
                    <p className="mt-2 text-[9px] md:text-[10px] font-medium text-on-surface-variant italic flex items-center gap-1">
                      <Pencil size={9} /> {t.correctedBy} {q.correctedBy}
                    </p>
                  )}

                  <div className="mt-3 md:mt-4 pt-3 border-t border-outline-variant flex items-center justify-between gap-2">
                    <span className="min-w-0 text-[9px] md:text-[10px] font-medium text-on-surface-variant flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} /> {q.createdAt?.toDate ? q.createdAt.toDate().toLocaleDateString('uz-UZ') : t.recently}
                      </span>
                      {q.creatorName && (
                        <span className="flex items-center gap-1 min-w-0">
                          <User size={10} /> <span className="truncate">{q.creatorName}</span>
                        </span>
                      )}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); setInfoModalData(q); }} className="m3-interactive px-2.5 py-1 bg-surface-container hover:text-primary text-on-surface-variant border border-outline-variant rounded-m3-sm text-[10px] md:text-[11px] font-bold transition-colors flex items-center gap-1">
                        <Eye size={12}/> {t.viewFull}
                      </button>
                      {/* Fix a broken question — opens it in the builder, writing back to the
                          same doc. ⚠️ A BLOCK must open the BLOCK editor: the single-question
                          builder has no concept of `parts` and would drop every sub-question.
                          The question is handed over in memory, so the editor reads 0 docs. */}
                      <button onClick={(e) => { e.stopPropagation(); cacheQuestion(q); router.push(`${q.isBlock ? '/teacher/create/block' : '/teacher/create/question'}?edit=${q.id}`); }} className="m3-interactive px-2.5 py-1 bg-surface-container hover:text-primary text-on-surface-variant border border-outline-variant rounded-m3-sm text-[10px] md:text-[11px] font-bold transition-colors flex items-center gap-1">
                        <Pencil size={12}/> {t.edit}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteModalId(q.id); }} className="p-1 md:p-1.5 bg-surface-container hover:bg-error-container text-on-surface-variant hover:text-error border border-outline-variant rounded-m3-sm transition-colors">
                        <Trash2 size={12} className="md:w-3.5 md:h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );

              if (questions.length === index + 1) {
                return <div ref={lastQuestionElementRef} key={q.id} onClick={() => toggleSelection(q.id)} className="cursor-pointer">{cardContent}</div>;
              } else {
                return <div key={q.id} onClick={() => toggleSelection(q.id)} className="cursor-pointer">{cardContent}</div>;
              }
            })}

            <div className="pt-4 pb-12 flex justify-center text-on-surface-variant">
              {loadingMore && <Spinner size={20} />}
              {!hasMore && questions.length > 0 && <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest">{t.allLoaded}</p>}
            </div>
          </div>
        )}
      </div>

      {/* 🟢 FLOATING SHOPPING CART ACTIONS */}
      <AnimatePresence>
        {selectedQuestions.size > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-5 left-0 right-0 px-4 z-40 flex justify-center"
          >
            <div className="bg-inverse-surface text-inverse-on-surface px-4 md:px-5 py-3 md:py-3.5 rounded-m3-lg shadow-elev-3 flex items-center gap-4 md:gap-6 border border-transparent w-full max-w-[400px]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-inverse-primary text-inverse-surface rounded-full flex items-center justify-center text-[12px] md:text-[14px] font-black shadow-inner">
                  {selectedQuestions.size}
                </div>
                <span className="text-[10px] md:text-[12px] font-medium text-inverse-on-surface leading-tight">{t.selectedWord1}<br/>{t.selectedWord2}</span>
              </div>

              <Button
                variant="filled"
                className="flex-1"
                icon={<CheckCircle2 />}
                onClick={handleCreateTestInitiate}
              >
                {t.createTest}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* 🟢 ALL MODALS (PORTALIZED)                                            */}
      {/* ===================================================================== */}
      
      {mounted && createPortal(
        <>
          {/* X-RAY INFO MODAL */}
          <AnimatePresence>
            {infoModalData && (
              <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={() => setInfoModalData(null)} />
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-surface-container-low rounded-m3-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-elev-3 z-10 overflow-hidden">

                  <div className="p-4 md:p-5 border-b border-outline-variant flex justify-between items-center bg-surface-container shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-m3-sm bg-primary-container text-on-primary-container flex items-center justify-center"><Eye size={16} /></div>
                      <div>
                        <h3 className="text-[14px] md:text-[16px] font-black text-on-surface leading-tight">{t.fullInfo}</h3>
                        <p className="text-[9px] md:text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mt-0.5">{infoModalData.id}</p>
                        {infoModalData.correctedBy && (
                          <p className="text-[10px] md:text-[11px] font-medium text-on-surface-variant italic flex items-center gap-1 mt-1">
                            <Pencil size={10} /> {t.correctedBy} {infoModalData.correctedBy}
                          </p>
                        )}
                      </div>
                    </div>
                    <IconButton aria-label="Yopish" size="sm" onClick={() => setInfoModalData(null)}><X /></IconButton>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 md:gap-2 mb-5 md:mb-6">
                      <span className="bg-surface-container-high text-on-surface-variant text-[10px] md:text-[11px] font-bold px-2.5 py-1.5 rounded-m3-xs border border-outline-variant uppercase"><Folder size={12} className="inline mr-1"/> {infoModalData.subject || t.subjectFallback}</span>
                      {infoModalData.topic && <span className="bg-surface-container-high text-on-surface-variant text-[10px] md:text-[11px] font-bold px-2.5 py-1.5 rounded-m3-xs border border-outline-variant uppercase"><Target size={12} className="inline mr-1"/> {infoModalData.topic}</span>}
                      {infoModalData.chapter && <span className="bg-surface-container-high text-on-surface-variant text-[10px] md:text-[11px] font-bold px-2.5 py-1.5 rounded-m3-xs border border-outline-variant uppercase"><BookMarked size={12} className="inline mr-1"/> {infoModalData.chapter}</span>}
                      <span className="bg-inverse-surface text-inverse-on-surface text-[10px] md:text-[11px] font-bold px-2.5 py-1.5 rounded-m3-xs uppercase">{infoModalData.difficulty || "medium"}</span>
                    </div>

                    {/* Question */}
                    <div className="mb-6 md:mb-8">
                      <h4 className="text-[10px] md:text-[11px] font-black text-on-surface-variant uppercase tracking-widest mb-2 border-b border-outline-variant pb-2">{t.questionTextLabel}</h4>
                      <p className="font-semibold text-[14px] md:text-[16px] text-on-surface leading-relaxed"><FormattedText text={getText(infoModalData.question)} /></p>
                      {infoModalData.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={infoModalData.imageUrl} alt="" className="mt-3 max-h-[220px] w-auto rounded-m3-md border border-outline-variant object-contain bg-surface-container" />
                      )}
                    </div>

                    {/* A BLOCK: the shared pool + every sub-question with its answer. */}
                    {infoModalData.isBlock ? (
                      <div className="mb-6 md:mb-8">
                        <h4 className="text-[10px] md:text-[11px] font-black text-on-surface-variant uppercase tracking-widest mb-3 border-b border-outline-variant pb-2">
                          {t.questionsCount(infoModalData.parts.length)}
                        </h4>
                        <QuestionPartsPreview question={infoModalData} />
                      </div>
                    ) : infoModalData.optionList.length > 0 ? (
                      <div className="mb-6 md:mb-8">
                        <h4 className="text-[10px] md:text-[11px] font-black text-on-surface-variant uppercase tracking-widest mb-3 border-b border-outline-variant pb-2">{t.variants}</h4>
                        <div className="flex flex-col gap-2">
                          {infoModalData.optionList.map((opt: any) => {
                            const correctLetters = Array.isArray(infoModalData.correctAnswer.value) ? infoModalData.correctAnswer.value : [infoModalData.answer];
                            const isCorrect = correctLetters.includes(opt.id);
                            return (
                              <div key={opt.id} className={`flex items-start p-3 rounded-m3-md border transition-all ${isCorrect ? 'bg-success-container border-success' : 'bg-surface-container-lowest border-outline-variant'}`}>
                                <div className={`w-6 h-6 rounded-m3-xs flex items-center justify-center text-[11px] font-black mr-3 shrink-0 mt-0.5 ${isCorrect ? 'bg-success text-surface-container-lowest shadow-elev-1' : 'bg-surface-container-high text-on-surface-variant'}`}>{opt.id}</div>
                                <div className={`text-[13px] md:text-[14px] font-medium pt-0.5 break-words ${isCorrect ? 'text-on-success-container' : 'text-on-surface'}`}>
                                  <FormattedText text={getText(opt.text)} />
                                  {opt.imageUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={opt.imageUrl} alt="" className="mt-1.5 max-h-[90px] w-auto rounded-m3-xs border border-outline-variant object-contain bg-surface" />
                                  )}
                                </div>
                                {isCorrect && <div className="ml-auto bg-success text-surface-container-lowest text-[9px] font-black px-2 py-1 rounded-m3-xs border border-transparent uppercase tracking-widest mt-0.5">{t.correctAnswer}</div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* Text-answer types (open / numeric) have no options — show the expected answer. */
                      <div className="mb-6 md:mb-8">
                        <h4 className="text-[10px] md:text-[11px] font-black text-on-surface-variant uppercase tracking-widest mb-3 border-b border-outline-variant pb-2">{t.correctAnswer}</h4>
                        <div className="flex flex-wrap gap-2">
                          <div className="bg-success-container border border-success text-on-success-container text-[13px] font-bold px-3 py-2 rounded-m3-md">
                            <FormattedText text={String(infoModalData.correctAnswer.value || "")} empty={t.noData} />
                          </div>
                          {infoModalData.correctAnswer.acceptedAnswers.map((alt: string) => (
                            <div key={alt} className="bg-surface-container-lowest border border-outline-variant text-on-surface-variant text-[13px] font-medium px-3 py-2 rounded-m3-md">
                              <FormattedText text={alt} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Explanation */}
                    {getText(infoModalData.explanation).trim().length > 0 && (
                      <div>
                        <h4 className="text-[10px] md:text-[11px] font-black text-on-surface-variant uppercase tracking-widest mb-2 border-b border-outline-variant pb-2">{t.solutionExp}</h4>
                        <div className="bg-tertiary-container border border-transparent p-4 rounded-m3-md">
                          <div className="text-[12px] md:text-[14px] text-on-tertiary-container leading-relaxed font-medium"><SolutionSteps text={getText(infoModalData.explanation)} render={(part) => <FormattedText text={part} />} /></div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* DELETE CONFIRMATION MODAL */}
          <AnimatePresence>
            {deleteModalId && (
              <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={() => setDeleteModalId(null)} />
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-surface-container-low rounded-m3-xl p-6 max-w-[320px] w-full text-center shadow-elev-3 z-10 border border-outline-variant">
                  <div className="w-14 h-14 bg-error-container border border-transparent rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={24} className="text-on-error-container" /></div>
                  <h3 className="text-[16px] font-black text-on-surface mb-2">{t.deleteConfirm}</h3>
                  <p className="text-[12px] text-on-surface-variant mb-6 font-medium leading-relaxed">{t.deleteConfirmDesc}</p>
                  <div className="flex gap-2">
                    <Button variant="tonal" className="flex-1" onClick={() => setDeleteModalId(null)}>{t.cancel}</Button>
                    <Button variant="danger" className="flex-1" icon={<Trash2 />} onClick={handleDelete}>{t.delete}</Button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* TITLE SAVE MODAL */}
          <AnimatePresence>
            {isTitleModalOpen && (
              <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={() => setIsTitleModalOpen(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-surface-container-low rounded-m3-xl p-5 md:p-8 w-full max-w-[320px] md:max-w-sm shadow-elev-3 border border-outline-variant z-10">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-primary-container rounded-m3-md md:rounded-m3-lg flex items-center justify-center mb-4 md:mb-5 border border-transparent"><BookOpen size={24} strokeWidth={2.5} className="text-on-primary-container md:w-7 md:h-7" /></div>
                  <h3 className="text-lg md:text-xl font-black text-on-surface mb-1 md:mb-1.5">{t.titleModalTitle}</h3>
                  <p className="text-[11px] md:text-[13px] font-medium text-on-surface-variant mb-5 md:mb-6 leading-relaxed">{t.titleModalDesc(selectedQuestions.size)}</p>
                  <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} className="w-full px-3 py-2.5 md:px-4 md:py-3.5 bg-surface-container border border-outline-variant rounded-m3-md text-[13px] md:text-[14px] font-black text-on-surface outline-none focus:bg-surface-container-lowest focus:border-primary focus:ring-4 focus:ring-[color-mix(in_oklab,var(--m3-primary)_10%,transparent)] transition-all mb-6 md:mb-8 placeholder:font-medium placeholder:text-on-surface-variant" autoFocus placeholder={t.titlePlaceholder}/>
                  <div className="flex flex-col-reverse sm:flex-row gap-2 md:gap-3">
                    <Button variant="tonal" className="w-full" onClick={() => setIsTitleModalOpen(false)}>{t.cancel}</Button>
                    <Button variant="filled" className="w-full" onClick={handleTitleSubmit}>
                      {t.continue} <ChevronRight strokeWidth={2.5}/>
                    </Button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}

      {mounted && createPortal(
        <TestConfigurationModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={handleFinalPublish} questionCount={selectedQuestions.size} testTitle={testTitle} isSaving={isPublishing} />,
        document.body
      )}

    </div>
  );
}
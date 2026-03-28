"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, DocumentSnapshot } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { fetchQuestions, Question } from "@/services/quizService";
import rawSyllabusData from "@/data/syllabus.json";
import QuestionCard from "../_components/QuestionCard";
import CartItem from "../_components/CartItem";
import TestConfigurationModal from "../_components/TestConfigurationModal";
import DatabaseSidebar from "./_components/DatabaseSidebar"; 
import toast from "react-hot-toast";
import { useTeacherLanguage } from "@/app/teacher/layout";
import { motion, AnimatePresence } from "framer-motion";

import { Save, FileText, Layout, Grid, SearchX, Loader2, ChevronDown, X, ShoppingBag, Sparkles, Database, Menu, Trash2, Check, ArrowLeft } from "lucide-react";

// --- TRANSLATION DICTIONARY ---
const CREATE_TRANSLATIONS = {
  uz: { 
    placeholder: "Nomsiz Test...", questions: "Savollar", publish: "Nashr qilish", 
    syllabus: { title: "Mundarija", subtitle: "Mavzuni tanlang" }, 
    topic: { select: "Mavzu tanlanmagan", instant: "Tezkor Yuklash", auto: "Avto Tanlash", generate: "Qo'shish", clear: "Tozalash" }, 
    diff: { easy: "Oson", medium: "O'rta", hard: "Qiyin" }, 
    list: { selectSub: "Boshlash uchun mavzu tanlang", notFound: "uchun savollar topilmadi", loadMore: "Yana 10 ta yuklash", loading: "Yuklanmoqda..." }, 
    cart: { title: "Testni Ko'rish", clearAll: "Tozalash", emptyTitle: "Test bo'sh", emptyDesc: "Maxsus test yaratish uchun ro'yxatdan savollarni tanlang.", finalize: "Testni Nashr Qilish", reviewBtn: "Tanlovni Ko'rish" }, 
    toasts: { limit: "Maksimal 100 ta savol limiti yetdi!", added: "Qo'shildi", allAdded: "Barcha ko'rinib turgan savollar qo'shilgan.", randomAdded: "Tasodifiy {count} ta savol qo'shildi!", limitHit: "{count} ta savol qo'shildi (100 ta limit yetdi!)", titleReq: "Iltimos, test nomini kiriting", oneReq: "Kamida bitta savol qo'shing", success: "Test Nashr Qilindi!", fail: "Nashr qilishda xatolik", failLoad: "Yuklashda xatolik", removed: "Barcha savollar o'chirildi", confirmRemove: "Barcha savollarni o'chirmoqchimisiz?" },
    modal: { title: "Test nomini kiriting", desc: "Yangi yaratilgan testni saqlash va sozlashdan oldin unga nom bering.", cancel: "Bekor qilish", next: "Keyingi qadam" }
  },
  en: { 
    placeholder: "Untitled Test...", questions: "Questions", publish: "Publish", 
    syllabus: { title: "Syllabus", subtitle: "Select a topic" }, 
    topic: { select: "Select a Topic", instant: "Instant Load", auto: "Auto Pick", generate: "Add", clear: "Clear" }, 
    diff: { easy: "Easy", medium: "Medium", hard: "Hard" }, 
    list: { selectSub: "Select a subtopic to begin", notFound: "No questions found for", loadMore: "Load Next 10", loading: "Loading..." }, 
    cart: { title: "Review Test", clearAll: "Clear", emptyTitle: "Your test is empty", emptyDesc: "Select questions from the list to build your custom test.", finalize: "Publish Test", reviewBtn: "Review Selection" }, 
    toasts: { limit: "Maximum limit of 100 questions reached!", added: "Added", allAdded: "All visible questions are already added.", randomAdded: "Randomly added {count} questions!", limitHit: "Added {count} questions (Hit the 100 limit!)", titleReq: "Please enter a test title", oneReq: "Add at least one question", success: "Test Published!", fail: "Failed to publish", failLoad: "Failed to load", removed: "All questions removed", confirmRemove: "Are you sure you want to remove all questions?" },
    modal: { title: "Name Your Test", desc: "Give your newly generated test a clear title before configuring the settings.", cancel: "Cancel", next: "Next Step" }
  },
  ru: { 
    placeholder: "Тест без названия...", questions: "Вопросов", publish: "Опубликовать", 
    syllabus: { title: "Учебный план", subtitle: "Выберите тему" }, 
    topic: { select: "Выберите тему", instant: "Быстрая загрузка", auto: "Автовыбор", generate: "Добавить", clear: "Очистить" }, 
    diff: { easy: "Легкий", medium: "Средний", hard: "Сложный" }, 
    list: { selectSub: "Выберите подтему, чтобы начать", notFound: "Вопросов не найдено для", loadMore: "Загрузить еще 10", loading: "Загрузка..." }, 
    cart: { title: "Обзор Теста", clearAll: "Очистить", emptyTitle: "Тест пуст", emptyDesc: "Выберите вопросы из списка, чтобы создать тест.", finalize: "Опубликовать", reviewBtn: "Обзор Выбора" }, 
    toasts: { limit: "Достигнут лимит в 100 вопросов!", added: "Добавлено", allAdded: "Все видимые вопросы уже добавлены.", randomAdded: "Случайно добавлено {count} вопросов!", limitHit: "Добавлено {count} вопросов (Лимит 100!)", titleReq: "Пожалуйста, введите название теста", oneReq: "Добавьте хотя бы один вопрос", success: "Тест опубликован!", fail: "Ошибка публикации", failLoad: "Ошибка загрузки", removed: "Все вопросы удалены", confirmRemove: "Вы уверены, что хотите удалить все вопросы?" },
    modal: { title: "Назовите свой тест", desc: "Дайте вашему новому тесту понятное название перед настройкой.", cancel: "Отмена", next: "Следующий Шаг" }
  }
};

interface UIQuestion extends Question { uiDifficulty: "Easy" | "Medium" | "Hard"; }

export default function CreateTestPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { lang } = useTeacherLanguage();
  const t = CREATE_TRANSLATIONS[lang] || CREATE_TRANSLATIONS['en'];

  const categories: any[] = Array.isArray(rawSyllabusData) ? (rawSyllabusData as any) : [];

  const [testTitle, setTestTitle] = useState("");
  const [activeCatIndex, setActiveCatIndex] = useState<number | null>(null);
  const [activeChapIndex, setActiveChapIndex] = useState<number | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<{ name: string; index: number; } | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<"Easy" | "Medium" | "Hard">("Easy");
  const [availableQuestions, setAvailableQuestions] = useState<UIQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | string | null>(null);
  
  const [hasMore, setHasMore] = useState(true);
  const [isCachedData, setIsCachedData] = useState(false);
  const [addedQuestions, setAddedQuestions] = useState<UIQuestion[]>([]);
  const [randomCount, setRandomCount] = useState<string>("5");
  
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isSyllabusOpen, setIsSyllabusOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // 🟢 7-DAY CACHE (Still active and saving read costs!)
  const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
  const getCacheKey = (subIdx: number, diff: string) => `quiz_cache_${activeCatIndex}_${activeChapIndex}_${subIdx}_${diff}`;

  const saveToCache = (key: string, questions: UIQuestion[]) => {
    try { localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data: questions })); } catch (e) {}
  };

  const loadFromCache = (key: string): UIQuestion[] | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - (parsed.timestamp || 0) > CACHE_TTL) { localStorage.removeItem(key); return null; }
      return parsed.data;
    } catch (e) { return null; }
  };

  // 🟢 FIXED: `hasMore` logic now strictly adheres to the 10-limit check for both DB and Cache
  const handleFetch = async (subtopic: any, difficulty: any, cursor: any) => {
    if (activeCatIndex === null || activeChapIndex === null || !subtopic) return;
    const cacheKey = getCacheKey(subtopic.index, difficulty);
    
    if (!cursor) {
      const cached = loadFromCache(cacheKey);
      if (cached && cached.length > 0) {
        setAvailableQuestions(cached); 
        setLastDoc(cached[cached.length - 1].id); 
        setIsCachedData(true); 
        // FIX: Only show 'Load More' if the cache has exactly a multiple of 10 items.
        setHasMore(cached.length >= 10 && cached.length % 10 === 0); 
        return;
      }
    }
    
    setLoadingQuestions(true);
    try {
      const pathIds = { subjectId: "01", topicId: activeCatIndex, chapterId: activeChapIndex, subtopicId: subtopic.index };
      const { questions, lastDoc: newCursor } = await fetchQuestions(pathIds, difficulty, cursor);
      
      const formatted: UIQuestion[] = questions.map((q) => ({ 
        ...q, text: typeof q.question === "object" ? (q.question as any).uz || "Question Text" : q.question || "Question Text", uiDifficulty: difficulty 
      }));
      
      setAvailableQuestions((prev) => { 
        const upd = cursor ? [...prev, ...formatted] : formatted; 
        saveToCache(cacheKey, upd); 
        return upd; 
      });
      
      setLastDoc(newCursor); 
      setIsCachedData(false); 
      
      // FIX: Correctly check if the DB returned exactly 10 questions.
      setHasMore(questions.length >= 10);
      
    } catch (err) { toast.error(t.toasts.failLoad); } finally { setLoadingQuestions(false); }
  };

  const handleSelectionChange = (newSub: any, newDiff: any) => {
    if (!newSub) return;
    setAvailableQuestions([]); setLastDoc(null); setHasMore(true); setIsCachedData(false);
    handleFetch(newSub, newDiff, null);
    if (window.innerWidth < 1024) setIsSyllabusOpen(false);
  };

  const handleLoadMore = () => { if (lastDoc) handleFetch(selectedSubtopic, difficultyFilter, lastDoc); };

  const onDifficultyClick = (d: any) => {
    if (d === difficultyFilter) return;
    setDifficultyFilter(d); handleSelectionChange(selectedSubtopic, d);
  };

  const onSubtopicClick = (sub: any) => { setSelectedSubtopic(sub); handleSelectionChange(sub, difficultyFilter); };

  const toggleQuestion = (q: UIQuestion) => {
    if (addedQuestions.some((item) => item.id === q.id)) setAddedQuestions(addedQuestions.filter((item) => item.id !== q.id));
    else {
      if (addedQuestions.length >= 100) return toast.error(t.toasts.limit);
      setAddedQuestions([...addedQuestions, q]);
      toast.success(t.toasts.added, { position: "bottom-center", duration: 1000 });
    }
  };

  const handleAutoSelect = () => {
    if (addedQuestions.length >= 100) return toast.error(t.toasts.limit);
    const candidates = availableQuestions.filter((q) => !addedQuestions.some((add) => add.id === q.id));
    if (candidates.length === 0) return toast(t.toasts.allAdded);
    const countToAdd = Math.min(parseInt(randomCount) || 5, 100 - addedQuestions.length, candidates.length);
    const selected = [...candidates].sort(() => 0.5 - Math.random()).slice(0, countToAdd);
    setAddedQuestions((prev) => [...prev, ...selected]);
    countToAdd < (parseInt(randomCount) || 5) ? toast.success(t.toasts.limitHit.replace("{count}", countToAdd.toString())) : toast.success(t.toasts.randomAdded.replace("{count}", countToAdd.toString()));
  };

  const handleInitiatePublish = () => {
    if (addedQuestions.length === 0) return toast.error(t.toasts.oneReq);
    setIsTitleModalOpen(true);
  };

  const handleTitleSubmit = () => {
    if (!testTitle.trim()) return toast.error(t.toasts.titleReq);
    setIsTitleModalOpen(false);
    setIsConfigModalOpen(true);
  };

  const handleFinalPublish = async (settings: any) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "custom_tests"), { teacherId: user.uid, teacherName: user.displayName, title: testTitle, accessCode: settings.accessCode, duration: settings.duration, shuffle: settings.shuffleQuestions, resultsVisibility: settings.resultsVisibility || "never", status: "active", createdAt: serverTimestamp(), questionCount: addedQuestions.length, questions: addedQuestions });
      toast.success(t.toasts.success); setIsConfigModalOpen(false); router.push("/teacher/dashboard");
    } catch (error) { toast.error(t.toasts.fail); } finally { setIsSaving(false); }
  };

  return (
    <div className="h-[100dvh] bg-[#FAFAFA] flex flex-col overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* TITLE MODAL */}
      <AnimatePresence>
        {isTitleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTitleModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-100 z-10">
              <h3 className="text-xl font-black text-slate-900 mb-2">{t.modal.title}</h3>
              <p className="text-[14px] text-slate-500 mb-6 font-medium">{t.modal.desc}</p>
              <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} placeholder={t.placeholder} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all mb-8" autoFocus/>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setIsTitleModalOpen(false)} className="px-5 py-2.5 font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">{t.modal.cancel}</button>
                <button onClick={handleTitleSubmit} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2">{t.modal.next} <ArrowLeft className="rotate-180" size={16}/></button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TestConfigurationModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={handleFinalPublish} questionCount={addedQuestions.length} testTitle={testTitle} isSaving={isSaving} />

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* SIDEBAR COMPONENT */}
        <DatabaseSidebar 
          categories={categories} activeCatIndex={activeCatIndex} setActiveCatIndex={setActiveCatIndex}
          activeChapIndex={activeChapIndex} setActiveChapIndex={setActiveChapIndex}
          selectedSubtopic={selectedSubtopic} onSubtopicClick={onSubtopicClick}
          isSyllabusOpen={isSyllabusOpen} setIsSyllabusOpen={setIsSyllabusOpen} t={t}
        />

        {/* MAIN CANVAS */}
        <main className="flex-1 overflow-hidden flex flex-col relative w-full bg-[#FAFAFA]">
          
          {/* HEADER (Topic + Filters) */}
          <header className="bg-white/80 backdrop-blur-md px-4 md:px-6 py-3 border-b border-slate-200/80 z-30 sticky top-0 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-3 md:gap-4 shrink-0">
            
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setIsSyllabusOpen(!isSyllabusOpen)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg shrink-0 transition-colors"><Menu size={20} /></button>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
                {selectedSubtopic ? <Layout size={18} /> : <Grid size={18} />}
              </div>
              <div className="truncate pr-2">
                <h3 className="font-bold text-slate-800 text-[15px] leading-tight truncate">{selectedSubtopic ? selectedSubtopic.name : t.topic.select}</h3>
                {isCachedData && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5"><Database size={10} /> {t.topic.instant}</span>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-inner shrink-0 w-full sm:w-auto">
                {["Easy", "Medium", "Hard"].map((lvl) => (
  <button key={lvl} onClick={() => onDifficultyClick(lvl)} className={`flex-1 sm:flex-none px-4 py-1.5 text-[12px] font-bold rounded-lg transition-all ${difficultyFilter === lvl ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}>
    {t.diff[lvl.toLowerCase() as keyof typeof t.diff]}
  </button>
))}
              </div>

              {/* 🟢 UPGRADED AUTO-SELECT WIDGET */}
              {selectedSubtopic && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/80 p-1.5 rounded-xl shadow-sm w-full sm:w-auto relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-16 h-16 bg-white/40 blur-xl rounded-full mix-blend-overlay"></div>
                   
                   <div className="flex items-center gap-1.5 pl-2 pr-1 relative z-10" title={t.topic.auto}>
                     <Sparkles size={16} className="text-indigo-500 animate-pulse" />
                     <span className="text-[12px] font-black bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent uppercase tracking-wider hidden lg:inline mr-1">
                       {t.topic.auto}
                     </span>
                   </div>
                   
                   <input type="number" min="1" max="50" value={randomCount} onChange={(e) => setRandomCount(parseInt(e.target.value) > 50 ? "50" : e.target.value)} className="w-14 h-8 px-1 bg-white text-[14px] font-bold border border-indigo-200/60 rounded-lg text-center focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-inner relative z-10" />
                   
                   <button onClick={handleAutoSelect} className="h-8 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-[13px] font-bold rounded-lg flex items-center justify-center transition-all active:scale-95 shadow-md shadow-indigo-500/20 relative z-10">
                     {t.topic.generate}
                   </button>
                </div>
              )}
            </div>
          </header>

          {/* QUESTION LIST */}
          <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32 pt-6 custom-scrollbar scroll-smooth">
            <div className="max-w-4xl mx-auto space-y-4">
              
              {!selectedSubtopic ? (
                <div className="h-[40vh] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-white mt-6 p-6 text-center shadow-sm animate-in zoom-in-95 duration-500">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100 mb-4"><Layout size={24} className="text-indigo-400" /></div>
                  <p className="font-bold text-[16px] text-slate-600">{t.list.selectSub}</p>
                </div>
              ) : availableQuestions.length === 0 && !loadingQuestions ? (
                <div className="h-[40vh] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-white mt-6 p-6 text-center shadow-sm animate-in zoom-in-95 duration-500">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 mb-4"><SearchX size={24} className="text-slate-400" /></div>
                  <p className="font-bold text-[15px] text-slate-600">{t.list.notFound} <span className="text-indigo-500">{t.diff[difficultyFilter.toLowerCase() as keyof typeof t.diff]}</span></p>
                </div>
              ) : (
                <>
                  {availableQuestions.map((q, idx) => (
                    <QuestionCard key={q.id} question={q} index={idx + 1} isAdded={addedQuestions.some((add) => add.id === q.id)} onToggle={() => toggleQuestion(q)} disabled={!addedQuestions.some((add) => add.id === q.id) && addedQuestions.length >= 100} />
                  ))}
                  {hasMore && (
                    <div className="pt-6 pb-12 text-center flex justify-center">
                      <button onClick={handleLoadMore} disabled={loadingQuestions} className="px-8 py-3 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all flex items-center gap-2">
                        {loadingQuestions ? <><Loader2 size={16} className="animate-spin" /> {t.list.loading}</> : <>{t.list.loadMore} <ChevronDown size={16} /></>}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>

        {/* CART DRAWER */}
        <aside className={`
            fixed lg:static inset-x-0 bottom-0 lg:inset-y-0 lg:right-0 z-50 
            w-full lg:w-[360px] bg-[#FAFAFA] text-slate-900 
            transform transition-transform duration-300 ease-out
            ${isCartOpen ? "translate-y-0" : "translate-y-full lg:translate-y-0"}
            lg:translate-x-0 flex flex-col border-t lg:border-l border-slate-200/80 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] lg:shadow-none 
            h-[90vh] lg:h-full rounded-t-3xl lg:rounded-none shrink-0
        `}>
          <div className="lg:hidden flex justify-center pt-3 pb-1 w-full" onClick={() => setIsCartOpen(false)}>
            <div className="w-12 h-1.5 bg-slate-200 rounded-full cursor-pointer"></div>
          </div>

          <div className="px-5 py-4 border-b border-slate-200/80 flex justify-between items-center shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-[15px] flex items-center gap-2 text-slate-900"><ShoppingBag size={18} className="text-indigo-500" /> {t.cart.title}</h3>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full tracking-widest">{addedQuestions.length}/100</span>
            </div>
            <div className="flex items-center gap-2">
              {addedQuestions.length > 0 && (
                <button onClick={() => { if (confirm(t.toasts.confirmRemove)) { setAddedQuestions([]); toast.success(t.toasts.removed); } }} className="text-[11px] font-bold text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-100 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                  <Trash2 size={14} /> {t.cart.clearAll}
                </button>
              )}
              <button onClick={() => setIsCartOpen(false)} className="lg:hidden p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg border border-slate-200"><X size={16} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {addedQuestions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-white shadow-sm">
                <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4"><FileText size={24} className="text-slate-300" /></div>
                <p className="text-[15px] font-bold text-slate-600">{t.cart.emptyTitle}</p>
                <p className="text-[12px] text-slate-400 mt-1.5 font-medium leading-relaxed">{t.cart.emptyDesc}</p>
              </div>
            ) : (
              addedQuestions.map((q, idx) => (
                <div key={q.id} className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
                  <CartItem index={idx + 1} question={q} onRemove={() => toggleQuestion(q)} />
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-200/80 pb-8 lg:pb-4 shrink-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
            <button
              onClick={handleInitiatePublish}
              disabled={addedQuestions.length === 0 || isSaving}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl font-bold text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[14px]"
            >
              <Check size={18} strokeWidth={3} />
              {t.cart.finalize}
            </button>
          </div>
        </aside>

        {isCartOpen && <div className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />}

        {/* FLOATING MOBILE BUTTON */}
        {!isCartOpen && (
          <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
            <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-3 bg-slate-900 text-white pl-5 pr-6 py-3.5 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.2)] active:scale-95 transition-transform border border-slate-700">
              <div className="relative">
                <ShoppingBag size={20} />
                {addedQuestions.length > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-500 border border-slate-900 rounded-full text-[9px] flex items-center justify-center font-bold animate-in zoom-in">{addedQuestions.length}</span>}
              </div>
              <span className="font-bold text-[14px]">{t.cart.reviewBtn}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
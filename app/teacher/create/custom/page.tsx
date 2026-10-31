"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, BookOpen, Settings2, ChevronUp, ChevronDown, CheckCircle2, PenTool, Layers, Database } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, serverTimestamp, Timestamp } from "firebase/firestore";
import { toQuestionV1, InvalidTopicError } from "@/lib/questionSchema";
import type { TopicPath } from "@/lib/questionTopics";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

import { useTeacherLanguage } from "@/app/teacher/layout";
import RichQuestionInput from "@/app/teacher/create/_components/RichQuestionInput";
import TestConfigurationModal from "@/app/teacher/create/_components/TestConfigurationModal";
import TopicAssignModal from "@/app/teacher/create/_components/TopicAssignModal";

import { Button, IconButton } from "@/components/ui";

// --- TRANSLATION DICTIONARY ---
const PAGE_TRANSLATIONS = {
  uz: {
    headerTitle: "Maxsus Studiya",
    publishBtn: "Nashr Qilish",
    saveToBankBtn: "Bazaga Saqlash", // 🟢 NEW
    savedToBankSuccess: "Savollar bazangizga muvaffaqiyatli saqlandi!", // 🟢 NEW
    topicRequired: "Iltimos, savollar uchun mavzu tanlang.",
    modalTitle: "Test nomini kiriting",
    modalDesc: "Yangi yaratilgan testni saqlash va sozlashdan oldin unga nom bering.",
    modalCancel: "Bekor qilish",
    modalNext: "Keyingi qadam",
    canvasTitle: "Savollar Doskasi",
    canvasDesc: "Test savollarini quyida o'zingiz yarating va tahrirlang.",
    blocks: "Blok",
    multChoice: "Test (A, B, C, D)",
    promptLabel: "Savol matni",
    correctAnswer: "To'g'ri Javob",
    difficultyLabel: "Daraja",
    addExp: "Yechim qo'shish",
    hideExp: "Yechimni yashirish",
    stepByStep: "Qadam-baqadam Yechim",
    addQuestion: "Savol qo'shish",
    addMoreInstructions: "Yangi savol uchun maydonlarni to'ldiring.", // 🟢 NEW
    emptyFieldsErr: "Iltimos, barcha savol va variantlarni to'ldiring.",
    easy: "Oson",
    medium: "O'rta",
    hard: "Qiyin",
    minOneQuestion: "Testda kamida bitta savol bo'lishi kerak.",
    saveBankError: "Bazaga saqlashda xatolik yuz berdi.",
    enterTitleErr: "Iltimos, test nomini kiriting.",
    publishSuccess: "Test muvaffaqiyatli chop qilindi!",
    publishError: "Testni chop qilishda xatolik.",
    titlePlaceholder: "Masalan: Algebra oraliq nazorati",
    promptPlaceholder: "Masalan: Tenglamani yeching...",
    optionPlaceholder: (letter: string) => `${letter} varianti...`,
    expPlaceholder: "Yechimni shu yerda tushuntiring..."
  },
  en: {
    headerTitle: "Custom Studio",
    publishBtn: "Publish Test",
    saveToBankBtn: "Save to Bank", // 🟢 NEW
    savedToBankSuccess: "Questions successfully saved to your bank!", // 🟢 NEW
    topicRequired: "Please choose a topic for the questions.",
    modalTitle: "Name Your Test",
    modalDesc: "Give your newly created test a clear title before configuring the settings.",
    modalCancel: "Cancel",
    modalNext: "Next Step",
    canvasTitle: "Question Canvas",
    canvasDesc: "Build and edit your test questions manually below.",
    blocks: "Blocks",
    multChoice: "Multiple Choice",
    promptLabel: "Prompt / Question Text",
    correctAnswer: "Correct Answer",
    difficultyLabel: "Difficulty",
    addExp: "Add Explanation",
    hideExp: "Hide Explanation",
    stepByStep: "Step-by-Step Solution",
    addQuestion: "Add Question",
    addMoreInstructions: "Fill out the fields for the new question.", // 🟢 NEW
    emptyFieldsErr: "Please fill out all question text and options.",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    minOneQuestion: "Test must have at least one question.",
    saveBankError: "An error occurred while saving to the bank.",
    enterTitleErr: "Please enter a test title.",
    publishSuccess: "Custom test published successfully!",
    publishError: "Failed to publish test.",
    titlePlaceholder: "e.g., Algebra Midterm",
    promptPlaceholder: "E.g., Solve the equation...",
    optionPlaceholder: (letter: string) => `Option ${letter}...`,
    expPlaceholder: "Explain the solution here..."
  },
  ru: {
    headerTitle: "Своя Студия",
    publishBtn: "Опубликовать",
    saveToBankBtn: "Сохранить в базу", // 🟢 NEW
    savedToBankSuccess: "Вопросы успешно сохранены в вашу базу!", // 🟢 NEW
    topicRequired: "Пожалуйста, выберите тему для вопросов.",
    modalTitle: "Назовите свой тест",
    modalDesc: "Дайте вашему новому тесту понятное название перед настройкой.",
    modalCancel: "Отмена",
    modalNext: "Следующий Шаг",
    canvasTitle: "Доска вопросов",
    canvasDesc: "Создавайте и редактируйте тестовые вопросы вручную ниже.",
    blocks: "Блоков",
    multChoice: "Тест (A, B, C, D)",
    promptLabel: "Текст вопроса",
    correctAnswer: "Правильный ответ",
    difficultyLabel: "Сложность",
    addExp: "Добавить объяснение",
    hideExp: "Скрыть объяснение",
    stepByStep: "Пошаговое решение",
    addQuestion: "Добавить вопрос",
    addMoreInstructions: "Заполните поля для нового вопроса.", // 🟢 NEW
    emptyFieldsErr: "Пожалуйста, заполните все тексты вопросов и варианты.",
    easy: "Легкий",
    medium: "Средний",
    hard: "Сложный",
    minOneQuestion: "В тесте должен быть хотя бы один вопрос.",
    saveBankError: "Произошла ошибка при сохранении в базу.",
    enterTitleErr: "Пожалуйста, введите название теста.",
    publishSuccess: "Тест успешно опубликован!",
    publishError: "Не удалось опубликовать тест.",
    titlePlaceholder: "Например: Промежуточный тест по алгебре",
    promptPlaceholder: "Например: Решите уравнение...",
    optionPlaceholder: (letter: string) => `Вариант ${letter}...`,
    expPlaceholder: "Объясните решение здесь..."
  }
};

interface DraftQuestion {
  id: string;
  text: string;
  optA: string;
  optB: string;
  optC: string;
  optD: string;
  answer: "A" | "B" | "C" | "D";
  explanation: string;
  showExplanation: boolean;
  difficulty: "easy" | "medium" | "hard";
}

const DRAFT_STORAGE_KEY = "edify_custom_test_draft";

const DIFFICULTY_ID: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

/* ─── topic taxonomy ────────────────────────────────────────────────────────
 * `toQuestionV1()` throws InvalidTopicError unless the subject/topic/subtopic exists
 * in data/question_topics.json — the old `subject: "custom"` placeholder is gone. The
 * teacher picks the path in TopicAssignModal before anything is written. */

/** custom_tests header name: the shared value, or "Aralash" when the batch spans several. */
const sharedName = (paths: TopicPath[], key: "subjectName" | "topicName" | "subtopicName") => {
  const uniq = [...new Set(paths.map((p) => p[key]))];
  return uniq.length === 1 ? uniq[0] : "Aralash";
};

/** A hand-written draft in the loose shape `toQuestionV1` consumes.
 *  ⚠️ subject/topic/subtopic are OBJECTS — `normalizeQuestion` reads `.id`/`.name`. */
const draftToSource = (draft: DraftQuestion, p: TopicPath) => ({
  subject: { id: p.subjectId, name: p.subjectName },
  topic: { id: p.topicId, name: p.topicName },
  subtopic: { id: p.subtopicId, name: p.subtopicName },
  chapter: { id: "", name: "" }, // the canvas has no chapter concept
  difficulty: draft.difficulty,
  difficultyId: DIFFICULTY_ID[draft.difficulty] || 2,
  question: { uz: draft.text, ru: "", en: "" },
  options: {
    A: { uz: draft.optA, ru: "", en: "" },
    B: { uz: draft.optB, ru: "", en: "" },
    C: { uz: draft.optC, ru: "", en: "" },
    D: { uz: draft.optD, ru: "", en: "" },
  },
  answer: draft.answer,
  explanation: { uz: draft.explanation, ru: "", en: "" },
  tags: ["teacher_custom"], language: ["uz"], solutions: [],
});

export default function CreateCustomTestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = PAGE_TRANSLATIONS[lang] || PAGE_TRANSLATIONS['en'];
  
  const [mounted, setMounted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [testTitle, setTestTitle] = useState("");
  
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingToBank, setIsSavingToBank] = useState(false); // 🟢 NEW
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [topicIntent, setTopicIntent] = useState<"bank" | "publish">("bank");
  const [topicPaths, setTopicPaths] = useState<TopicPath[]>([]);
  
  const generateSecureId = () => doc(collection(db, "teacher_questions")).id;

  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([
    { id: generateSecureId(), text: "", optA: "", optB: "", optC: "", optD: "", answer: "A", explanation: "", showExplanation: false, difficulty: "medium" }
  ]);

  useEffect(() => setMounted(true), []);

  // SILENT DRAFT LOAD
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        const TWENTY_FOUR_HOURS = 1 * 60 * 60 * 1000;
        if (parsed.timestamp && (Date.now() - parsed.timestamp < TWENTY_FOUR_HOURS)) {
          if (parsed.q && parsed.q.length > 0) setDraftQuestions(parsed.q);
          if (parsed.t) setTestTitle(parsed.t);
        } else {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      } catch (e) {
        localStorage.removeItem(DRAFT_STORAGE_KEY); 
      }
    }
    setIsHydrated(true);
  }, []);

  // SILENT AUTO-SAVE
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ 
          q: draftQuestions, t: testTitle, timestamp: Date.now() 
        }));
      } catch (e: any) {
        if (e.name === 'QuotaExceededError') console.warn("Local storage quota exceeded.");
      }
    }
  }, [draftQuestions, testTitle, isHydrated]);

  const handleCardFocus = (id: string) => {
    const card = document.getElementById(`card-${id}`);
    if (card) {
      const yOffset = -80; // Offset for sticky header
      const y = card.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQ = [...draftQuestions];
    if (direction === 'up' && index > 0) {
      [newQ[index - 1], newQ[index]] = [newQ[index], newQ[index - 1]];
      setDraftQuestions(newQ);
    } else if (direction === 'down' && index < newQ.length - 1) {
      [newQ[index], newQ[index + 1]] = [newQ[index + 1], newQ[index]];
      setDraftQuestions(newQ);
    }
  };

  const updateDraftQuestion = (id: string, field: keyof DraftQuestion, value: any) => {
    setDraftQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const addBlankQuestion = () => {
    setDraftQuestions(prev => [...prev, { id: generateSecureId(), text: "", optA: "", optB: "", optC: "", optD: "", answer: "A", explanation: "", showExplanation: false, difficulty: "medium" }]);
    toast(t.addMoreInstructions, { icon: "💡", duration: 3000 });
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
  };

  const removeQuestion = (id: string) => {
    if (draftQuestions.length === 1) return toast.error(t.minOneQuestion);
    setDraftQuestions(prev => prev.filter(q => q.id !== id));
  };

  // --- 🟢 TOPIC GATE (runs before BOTH save paths) ---
  const openTopicModal = (intent: "bank" | "publish") => {
    const hasEmptyFields = draftQuestions.some(q => !q.text || !q.optA || !q.optB || !q.optC || !q.optD);
    if (hasEmptyFields) return toast.error(t.emptyFieldsErr);
    setTopicIntent(intent);
    setIsTopicModalOpen(true);
  };

  const handleTopicConfirm = (paths: TopicPath[]) => {
    setTopicPaths(paths);
    if (topicIntent === "bank") {
      void handleSaveToBank(paths);
      return;
    }
    // publish: topic first, then title, then TestConfigurationModal.
    setIsTopicModalOpen(false);
    setIsTitleModalOpen(true);
  };

  /** Defensive: toQuestionV1 should never throw once the modal is wired. */
  const onInvalidTopic = (intent: "bank" | "publish") => {
    toast.error(t.topicRequired);
    setTopicIntent(intent);
    setIsTopicModalOpen(true);
  };

  // --- 🟢 SAVE TO BANK LOGIC ---
  const handleSaveToBank = async (paths: TopicPath[]) => {
    if (!user) return;

    setIsSavingToBank(true);
    const batch = writeBatch(db);

    try {
      draftQuestions.forEach((draft, i) => {
        const id = `tq_${doc(collection(db, "teacher_questions")).id}`;
        const v1 = toQuestionV1(draftToSource(draft, paths[i]), {
          id,
          creatorId: user.uid,
          creatorName: user.displayName || "Teacher",
          creationMethod: "teacher_created",
          status: "published",
          timestamp: serverTimestamp(),
        });

        batch.set(doc(db, "teacher_questions", id), v1);
      });

      await batch.commit();
      setIsTopicModalOpen(false);
      toast.success(t.savedToBankSuccess);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      router.push('/teacher/create/my_questions');
    } catch (error) {
      if (error instanceof InvalidTopicError) {
        onInvalidTopic("bank");
        return;
      }
      console.error("Save to bank error:", error);
      toast.error(t.saveBankError);
    } finally {
      setIsSavingToBank(false);
    }
  };


  // --- PUBLISH FLOW ---
  const handleTitleSubmit = () => {
    if (!testTitle.trim()) return toast.error(t.enterTitleErr);
    setIsTitleModalOpen(false);
    setIsConfigModalOpen(true);
  };

  const handleFinalPublish = async (testSettings: any) => {
    if (!user) return;
    if (topicPaths.length !== draftQuestions.length) {
      setIsConfigModalOpen(false);
      return onInvalidTopic("publish");
    }
    setIsPublishing(true);

    const batch = writeBatch(db);
    const finalQuestionsToSave: ReturnType<typeof toQuestionV1>[] = [];

    try {
      draftQuestions.forEach((draft, i) => {
        const id = `tq_${doc(collection(db, "teacher_questions")).id}`;
        const source = draftToSource(draft, topicPaths[i]);
        const meta = {
          id,
          creatorId: user.uid,
          creatorName: user.displayName || "Teacher",
          creationMethod: "teacher_created" as const,
          status: "published" as const,
        };

        batch.set(doc(db, "teacher_questions", id), toQuestionV1(source, { ...meta, timestamp: serverTimestamp() }));
        // The embedded snapshot needs a CONCRETE time: Firestore rejects serverTimestamp() sentinels inside arrays.
        finalQuestionsToSave.push(toQuestionV1(source, { ...meta, timestamp: Timestamp.now() }));
      });

      batch.set(doc(collection(db, "custom_tests")), {
        teacherId: user.uid, teacherName: user.displayName || "Teacher", title: testTitle,
        track: "custom",
        subjectName: sharedName(topicPaths, "subjectName"), topicName: sharedName(topicPaths, "topicName"),
        chapterName: "", subtopicName: sharedName(topicPaths, "subtopicName"),
        questions: finalQuestionsToSave, duration: testSettings.duration, shuffle: testSettings.shuffleQuestions,
        resultsVisibility: testSettings.resultsVisibility, accessCode: testSettings.accessCode,
        status: "active", createdAt: serverTimestamp(), questionCount: finalQuestionsToSave.length,
      });

      await batch.commit();
      toast.success(t.publishSuccess);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setIsConfigModalOpen(false);
      router.push("/teacher/dashboard");
    } catch (error) {
      if (error instanceof InvalidTopicError) {
        setIsConfigModalOpen(false);
        onInvalidTopic("publish");
        return;
      }
      toast.error(t.publishError);
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isHydrated) return <div className="min-h-[100dvh] bg-surface" />;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-surface font-t-body selection:bg-primary-container selection:text-on-primary-container pb-24 lg:pb-0">

      {/* 🟢 TOP BAR (Mobile Offset) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-[60px] bg-[color-mix(in_oklab,var(--m3-surface)_90%,transparent)] backdrop-blur-xl border-b border-outline-variant z-[10000] flex items-center justify-between px-3 shadow-elev-1">
        <IconButton aria-label="Orqaga" size="sm" className="-ml-1" onClick={() => router.push('/teacher/create')}><ArrowLeft /></IconButton>
        <span className="font-black text-on-surface text-[14px]">{t.headerTitle}</span>
        <div className="w-8"></div>
      </div>

      {/* 🟢 TITLE MODAL */}
      <AnimatePresence>
        {isTitleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={() => setIsTitleModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-surface-container-low rounded-m3-xl p-5 md:p-8 w-full max-w-[320px] md:max-w-md shadow-elev-3 border border-outline-variant z-10">
              <h3 className="text-lg md:text-xl font-black text-on-surface mb-1.5 md:mb-2">{t.modalTitle}</h3>
              <p className="text-[12px] md:text-[14px] text-on-surface-variant mb-5 md:mb-6 font-medium">{t.modalDesc}</p>
              <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} placeholder={t.titlePlaceholder} className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-surface-container border border-outline-variant rounded-m3-md text-[13px] md:text-[14px] font-bold text-on-surface outline-none focus:bg-surface-container-lowest focus:border-primary transition-all mb-6 md:mb-8" autoFocus/>
              <div className="flex gap-2 md:gap-3 justify-end">
                <Button variant="outlined" size="sm" onClick={() => setIsTitleModalOpen(false)}>{t.modalCancel}</Button>
                <Button variant="filled" size="sm" onClick={handleTitleSubmit}>{t.modalNext} <ArrowLeft className="rotate-180"/></Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TopicAssignModal
        open={isTopicModalOpen}
        questions={draftQuestions.map(q => q.text.slice(0, 120))}
        isSaving={isSavingToBank}
        onClose={() => setIsTopicModalOpen(false)}
        onConfirm={handleTopicConfirm}
      />

      {mounted && createPortal(
        <TestConfigurationModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={handleFinalPublish} questionCount={draftQuestions.length} testTitle={testTitle} isSaving={isPublishing} />,
        document.body
      )}

      {/* 🟢 UNIFIED HEADER (Desktop) */}
      <div className="hidden lg:flex t-page-bar sticky top-0 z-30 bg-[color-mix(in_oklab,var(--m3-surface)_85%,transparent)] backdrop-blur-md border-b border-outline-variant px-4 md:px-8 py-3 justify-between items-center shadow-elev-1 w-full">
        <div className="flex items-center gap-3">
          <IconButton aria-label="Orqaga" size="sm" className="-ml-2" onClick={() => router.push('/teacher/create')}><ArrowLeft /></IconButton>
          <h1 className="text-[16px] md:text-[18px] font-bold text-on-surface tracking-tight flex items-center gap-2">
            <PenTool size={16} className="text-primary" /> {t.headerTitle}
          </h1>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar px-2 max-w-[40%] md:max-w-[50%]">
           {draftQuestions.map((q, i) => (
             <button key={q.id} onClick={() => handleCardFocus(q.id)} className="m3-interactive w-7 h-7 rounded-m3-sm bg-surface-container border border-outline-variant hover:border-primary hover:text-primary font-bold text-on-surface-variant text-[11px] flex items-center justify-center shrink-0 transition-colors">
               {i + 1}
             </button>
           ))}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="tonal"
            size="sm"
            icon={<Database />}
            loading={isSavingToBank}
            onClick={() => openTopicModal("bank")}
            disabled={isPublishing || isSavingToBank}
          >
            <span>{t.saveToBankBtn}</span>
          </Button>
          <Button
            variant="filled"
            size="sm"
            icon={<CheckCircle2 />}
            loading={isPublishing}
            onClick={() => openTopicModal("publish")}
            disabled={isPublishing || isSavingToBank}
          >
            <span className="hidden sm:inline">{t.publishBtn}</span>
          </Button>
        </div>
      </div>

      {/* MAIN CANVAS */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative w-full pt-[60px] lg:pt-0">
        <div className="max-w-[900px] mx-auto px-3 md:px-8 mt-4">
          <header className="flex justify-between items-end mb-4 md:mb-8 px-1 md:px-0">
            <div>
              <h1 className="text-[18px] md:text-3xl font-black text-on-surface tracking-tight">{t.canvasTitle}</h1>
              <p className="text-[11px] md:text-[13px] text-on-surface-variant mt-0.5 md:mt-1 font-medium">{t.canvasDesc}</p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[18px] md:text-2xl font-black text-primary leading-none">{draftQuestions.length}</span>
              <span className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t.blocks}</span>
            </div>
          </header>

          <div className="space-y-4 md:space-y-6">
            {draftQuestions.map((q, index) => (
               <div key={q.id} id={`card-${q.id}`} onFocusCapture={() => handleCardFocus(q.id)} className="bg-surface-container-low rounded-m3-lg md:rounded-m3-xl shadow-elev-1 border border-outline-variant overflow-hidden focus-within:ring-2 focus-within:ring-[color-mix(in_oklab,var(--m3-primary)_20%,transparent)] transition-all duration-300">
                  <div className="bg-surface-container border-b border-outline-variant px-3.5 md:px-5 py-2.5 md:py-4 flex justify-between items-center group">
                    <div className="flex items-center gap-2 md:gap-3">
                      <span className="bg-primary-container text-on-primary-container font-black px-2 md:px-3 py-1 rounded-m3-sm text-[10px] md:text-[13px] shadow-elev-1">Q{index + 1}</span>
                      <span className="text-[9px] md:text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">{t.multChoice}</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded-m3-sm overflow-hidden shadow-elev-1 mr-1 md:mr-2 h-[26px] md:h-[32px]">
                         <button onClick={() => moveQuestion(index, 'up')} disabled={index === 0} className="w-7 md:w-8 h-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-state-hover disabled:text-disabled-fg disabled:cursor-not-allowed transition-colors border-r border-outline-variant"><ChevronUp size={14} className="md:w-4 md:h-4" /></button>
                         <button onClick={() => moveQuestion(index, 'down')} disabled={index === draftQuestions.length - 1} className="w-7 md:w-8 h-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-state-hover disabled:text-disabled-fg disabled:cursor-not-allowed transition-colors"><ChevronDown size={14} className="md:w-4 md:h-4" /></button>
                      </div>
                      <button onClick={() => removeQuestion(q.id)} className="text-on-surface-variant hover:text-error hover:bg-error-container p-1.5 rounded-m3-sm transition-colors border border-transparent h-[26px] md:h-[32px] flex items-center justify-center"><Trash2 size={14} className="md:w-4 md:h-4" /></button>
                    </div>
                  </div>

                  <div className="p-3 md:p-6">
                    
                    <div className="mb-4 md:mb-6">
                      <RichQuestionInput label={t.promptLabel} value={q.text} onChange={(latex) => updateDraftQuestion(q.id, 'text', latex)} placeholder={t.promptPlaceholder} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 md:gap-x-6 gap-y-3 md:gap-y-4 mb-4 md:mb-6">
                       {['A', 'B', 'C', 'D'].map(letter => {
                         const fieldKey = `opt${letter}` as keyof DraftQuestion;
                         return (
                           <div key={letter} className="flex gap-2 md:gap-3 items-start group">
                             <div className="w-7 h-7 md:w-8 md:h-8 rounded-m3-sm bg-surface-container border border-outline-variant flex items-center justify-center text-[11px] md:text-[13px] font-black text-on-surface-variant mt-1 md:mt-2 group-focus-within:bg-primary-container group-focus-within:text-on-primary-container group-focus-within:border-primary transition-colors shrink-0 shadow-elev-1">
                               {letter}
                             </div>
                             <div className="flex-1">
                               <RichQuestionInput label="" value={q[fieldKey] as string} onChange={(latex) => updateDraftQuestion(q.id, fieldKey, latex)} compact={true} placeholder={t.optionPlaceholder(letter)} />
                             </div>
                           </div>
                         )
                       })}
                    </div>

                    <div className="flex flex-wrap justify-between items-center pt-3 md:pt-5 border-t border-outline-variant gap-2 md:gap-4">
                      <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
                        <div className="flex-1 sm:flex-none flex items-center gap-1.5 md:gap-3 bg-surface-container p-1 md:p-1.5 pr-1.5 md:pr-2 rounded-m3-sm md:rounded-m3-md border border-outline-variant">
                          <span className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1.5 md:ml-2">{t.correctAnswer}</span>
                          <select value={q.answer} onChange={(e) => updateDraftQuestion(q.id, 'answer', e.target.value as any)} className="pl-2 pr-6 md:pl-3 md:pr-8 py-1 md:py-1.5 border border-outline-variant rounded-m3-sm font-bold text-[11px] md:text-[13px] bg-surface-container-lowest text-primary shadow-elev-1 focus:ring-2 focus:ring-[color-mix(in_oklab,var(--m3-primary)_20%,transparent)] focus:border-primary cursor-pointer outline-none transition-colors">
                            <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                          </select>
                        </div>

                        <div className="flex-1 sm:flex-none flex items-center gap-1.5 md:gap-3 bg-surface-container p-1 md:p-1.5 pr-1.5 md:pr-2 rounded-m3-sm md:rounded-m3-md border border-outline-variant">
                          <span className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1.5 md:ml-2">{t.difficultyLabel}</span>
                          <select value={q.difficulty} onChange={(e) => updateDraftQuestion(q.id, 'difficulty', e.target.value)} className="pl-2 pr-6 md:pl-3 md:pr-8 py-1 md:py-1.5 border border-outline-variant rounded-m3-sm font-bold text-[11px] md:text-[13px] bg-surface-container-lowest text-primary shadow-elev-1 focus:ring-2 focus:ring-[color-mix(in_oklab,var(--m3-primary)_20%,transparent)] focus:border-primary cursor-pointer outline-none transition-colors">
                            <option value="easy">{t.easy}</option><option value="medium">{t.medium}</option><option value="hard">{t.hard}</option>
                          </select>
                        </div>
                      </div>

                      <button onClick={() => updateDraftQuestion(q.id, 'showExplanation', !q.showExplanation)} className={`m3-interactive w-full sm:w-auto text-[11px] md:text-[13px] font-bold flex items-center justify-center gap-1.5 px-3 py-2 md:px-4 md:py-2 rounded-m3-sm md:rounded-m3-md transition-all ${q.showExplanation ? 'text-on-surface-variant bg-surface-container border border-outline-variant' : 'text-on-primary-container bg-primary-container border border-transparent shadow-elev-1'}`}>
                        <BookOpen size={14} className="md:w-4 md:h-4" /> {q.showExplanation ? t.hideExp : t.addExp}
                      </button>
                    </div>

                    {q.showExplanation && (
                      <div className="mt-3 md:mt-5 pt-3 md:pt-5 border-t border-dashed border-outline-variant animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="bg-surface-container p-2.5 md:p-4 rounded-m3-md md:rounded-m3-lg border border-outline-variant">
                          <RichQuestionInput label={t.stepByStep} value={q.explanation} onChange={(latex) => updateDraftQuestion(q.id, 'explanation', latex)} placeholder={t.expPlaceholder} compact={true} />
                        </div>
                      </div>
                    )}
                  </div>
               </div>
            ))}
          </div>

          <div className="flex justify-center pt-6 md:pt-8 pb-10 md:pb-12">
            <Button variant="elevated" size="lg" icon={<Plus />} onClick={addBlankQuestion}>
              {t.addQuestion}
            </Button>
          </div>
        </div>
      </main>

      {/* 🟢 MOBILE FLOATING ACTIONS */}
      {mounted && createPortal(
        <div className="lg:hidden fixed bottom-5 left-0 right-0 px-3 flex justify-between gap-2 z-[100] animate-in slide-in-from-bottom-10">
          <Button
            variant="tonal"
            size="lg"
            className="flex-1 shadow-elev-2"
            icon={<Database />}
            loading={isSavingToBank}
            onClick={() => openTopicModal("bank")}
            disabled={isSavingToBank || isPublishing}
          >
            {t.saveToBankBtn}
          </Button>

          <Button
            variant="filled"
            size="lg"
            className="flex-1 shadow-elev-3"
            icon={<CheckCircle2 />}
            loading={isPublishing}
            onClick={() => openTopicModal("publish")}
            disabled={isPublishing || isSavingToBank}
          >
            {t.publishBtn}
          </Button>
        </div>,
        document.body
      )}

    </div>
  );
}
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, BookOpen, Settings2, ChevronUp, ChevronDown, CheckCircle2, PenTool, Layers } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

import { useTeacherLanguage } from "@/app/teacher/layout";
import RichQuestionInput from "@/app/teacher/create/_components/RichQuestionInput";
import TestConfigurationModal from "@/app/teacher/create/_components/TestConfigurationModal";

// --- TRANSLATION DICTIONARY ---
const PAGE_TRANSLATIONS = {
  uz: {
    headerTitle: "Maxsus Studiya",
    publishBtn: "Nashr Qilish",
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
    emptyFieldsErr: "Iltimos, barcha savol va variantlarni to'ldiring.",
    easy: "Oson",
    medium: "O'rta",
    hard: "Qiyin"
  },
  en: {
    headerTitle: "Custom Studio",
    publishBtn: "Publish Test",
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
    emptyFieldsErr: "Please fill out all question text and options.",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard"
  },
  ru: {
    headerTitle: "Своя Студия",
    publishBtn: "Опубликовать",
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
    emptyFieldsErr: "Пожалуйста, заполните все тексты вопросов и варианты.",
    easy: "Легкий",
    medium: "Средний",
    hard: "Сложный"
  }
};

// 🟢 NEW INTERFACE: Added 'difficulty' directly to each question
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

export default function CreateCustomTestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = PAGE_TRANSLATIONS[lang] || PAGE_TRANSLATIONS['en'];
  
  const [isHydrated, setIsHydrated] = useState(false);
  const [testTitle, setTestTitle] = useState("");
  
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const generateSecureId = () => doc(collection(db, "teacher_questions")).id;

  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([
    { id: generateSecureId(), text: "", optA: "", optB: "", optC: "", optD: "", answer: "A", explanation: "", showExplanation: false, difficulty: "medium" }
  ]);

  // SILENT DRAFT LOAD (Removed Syllabus)
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
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
  };

  const removeQuestion = (id: string) => {
    if (draftQuestions.length === 1) return toast.error("Test must have at least one question.");
    setDraftQuestions(prev => prev.filter(q => q.id !== id));
  };

  // --- PUBLISH FLOW ---
  const handleInitiatePublish = () => {
    const hasEmptyFields = draftQuestions.some(q => !q.text || !q.optA || !q.optB || !q.optC || !q.optD);
    if (hasEmptyFields) return toast.error(t.emptyFieldsErr);
    setIsTitleModalOpen(true);
  };

  const handleTitleSubmit = () => {
    if (!testTitle.trim()) return toast.error("Please enter a test title.");
    setIsTitleModalOpen(false);
    setIsConfigModalOpen(true);
  };

  const handleFinalPublish = async (testSettings: any) => {
    if (!user) return;
    setIsPublishing(true);
    
    const batch = writeBatch(db);
    const finalQuestionsToSave = [];

    for (const draft of draftQuestions) {
      
      // Map difficulty text to numeric ID for sorting
      const difficultyMap: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
      const diffId = difficultyMap[draft.difficulty] || 2;

      const secureFirebaseId = doc(collection(db, "teacher_questions")).id;

      const finalQ = {
        id: `tq_${secureFirebaseId}`,
        creatorId: user.uid,
        number: "",
        
        // 🟢 THE FIX: Everything is hardcoded to "custom"
        track: "custom",
        subject: "custom",
        topic: "custom",
        chapter: "custom",
        subtopic: "custom",
        
        difficulty: draft.difficulty,
        difficultyId: diffId,
        
        // Manually build the question objects to avoid syllabus dependencies
        question: { uz: draft.text, ru: "", en: "" },
        options: {
          A: { uz: draft.optA, ru: "", en: "" },
          B: { uz: draft.optB, ru: "", en: "" },
          C: { uz: draft.optC, ru: "", en: "" },
          D: { uz: draft.optD, ru: "", en: "" },
        },
        answer: draft.answer,
        explanation: { uz: draft.explanation, ru: "", en: "" },
        
        tags: ["teacher_custom"],
        language: ["uz"],
        solutions: [],
        uploadedAt: new Date().toISOString(),
      };
      
      finalQuestionsToSave.push(finalQ);
      batch.set(doc(db, "teacher_questions", finalQ.id), { ...finalQ, createdAt: serverTimestamp() });
    }

    batch.set(doc(collection(db, "custom_tests")), {
      teacherId: user.uid, 
      teacherName: user.displayName || "Teacher",
      title: testTitle, 
      
      // 🟢 Save the container cleanly
      track: "custom",
      subjectName: "custom",
      topicName: "custom",
      chapterName: "custom",
      subtopicName: "custom",

      questions: finalQuestionsToSave, 
      duration: testSettings.duration,
      shuffle: testSettings.shuffleQuestions, 
      resultsVisibility: testSettings.resultsVisibility,
      accessCode: testSettings.accessCode, 
      status: "active",
      createdAt: serverTimestamp(), 
      questionCount: finalQuestionsToSave.length,
    });

    try {
      await batch.commit(); 
      toast.success("Custom test published successfully!");
      localStorage.removeItem(DRAFT_STORAGE_KEY); 
      setIsConfigModalOpen(false);
      router.push("/teacher/dashboard");
    } catch (error) {
      toast.error("Failed to publish test.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isHydrated) return <div className="min-h-screen bg-[#FAFAFA]" />;

  return (
    <div className="flex flex-col h-[100dvh] bg-[#FAFAFA] overflow-hidden font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* 🟢 TITLE MODAL */}
      <AnimatePresence>
        {isTitleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTitleModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-100 z-10">
              <h3 className="text-xl font-black text-slate-900 mb-2">{t.modalTitle}</h3>
              <p className="text-[14px] text-slate-500 mb-6 font-medium">{t.modalDesc}</p>
              <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} placeholder="e.g., Algebra Midterm" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all mb-8" autoFocus/>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setIsTitleModalOpen(false)} className="px-5 py-2.5 font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">{t.modalCancel}</button>
                <button onClick={handleTitleSubmit} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2">{t.modalNext} <ArrowLeft className="rotate-180" size={16}/></button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TestConfigurationModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={handleFinalPublish} questionCount={draftQuestions.length} testTitle={testTitle} isSaving={isPublishing} />

      {/* 🟢 UNIFIED HEADER */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 flex justify-between items-center shadow-sm w-full">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/teacher/create')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"><ArrowLeft size={18} /></button>
          <h1 className="text-[16px] md:text-[18px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <PenTool size={16} className="text-emerald-500" /> {t.headerTitle}
          </h1>
        </div>
        
        {/* Mini-Map Navigator */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar px-2 max-w-[40%] md:max-w-[50%]">
           {draftQuestions.map((q, i) => (
             <button key={q.id} onClick={() => handleCardFocus(q.id)} className="w-7 h-7 rounded-md bg-slate-50 border border-slate-200 hover:border-emerald-500 hover:text-emerald-600 font-bold text-slate-500 text-[11px] flex items-center justify-center shrink-0 transition-colors">
               {i + 1}
             </button>
           ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleInitiatePublish} disabled={isPublishing} className="bg-slate-900 hover:bg-slate-800 text-white px-4 md:px-5 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 text-[13px] md:text-[14px]">
            <CheckCircle2 size={16} /> <span className="hidden sm:inline">{t.publishBtn}</span>
          </button>
        </div>
      </div>

      {/* MAIN CANVAS (Full Width, No Sidebar) */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative w-full pb-32">
        <div className="max-w-[900px] mx-auto p-4 md:p-8 mt-4">
          <header className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{t.canvasTitle}</h1>
              <p className="text-[13px] text-slate-500 mt-1 font-medium">{t.canvasDesc}</p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-2xl font-black text-emerald-500 leading-none">{draftQuestions.length}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.blocks}</span>
            </div>
          </header>

          <div className="space-y-6">
            {draftQuestions.map((q, index) => (
               <div key={q.id} id={`card-${q.id}`} onFocusCapture={() => handleCardFocus(q.id)} className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all duration-300">
                  <div className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      <span className="bg-emerald-100 text-emerald-700 font-black px-3 py-1 rounded-lg text-[13px] shadow-sm">Q{index + 1}</span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t.multChoice}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm mr-2">
                         <button onClick={() => moveQuestion(index, 'up')} disabled={index === 0} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-slate-200"><ChevronUp size={16} /></button>
                         <button onClick={() => moveQuestion(index, 'down')} disabled={index === draftQuestions.length - 1} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronDown size={16} /></button>
                      </div>
                      <button onClick={() => removeQuestion(q.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-100"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6">
                    
                    {/* PROMPT */}
                    <div className="mb-6">
                      <RichQuestionInput label={t.promptLabel} value={q.text} onChange={(latex) => updateDraftQuestion(q.id, 'text', latex)} placeholder="Masalan: Tenglamani yeching..." />
                    </div>

                    {/* OPTIONS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-6">
                       {['A', 'B', 'C', 'D'].map(letter => {
                         const fieldKey = `opt${letter}` as keyof DraftQuestion;
                         return (
                           <div key={letter} className="flex gap-3 items-start group">
                             <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-[13px] font-black text-slate-400 mt-2 group-focus-within:bg-emerald-50 group-focus-within:text-emerald-600 group-focus-within:border-emerald-200 transition-colors shrink-0 shadow-sm">
                               {letter}
                             </div>
                             <div className="flex-1">
                               <RichQuestionInput
                                 label="" 
                                 value={q[fieldKey] as string} 
                                 onChange={(latex) => updateDraftQuestion(q.id, fieldKey, latex)} 
                                 compact={true} 
                                 placeholder={`${letter} varianti...`}
                               />
                             </div>
                           </div>
                         )
                       })}
                    </div>

                    {/* FOOTER CONTROLS */}
                    <div className="flex flex-wrap justify-between items-center pt-5 border-t border-slate-100 gap-4">
                      
                      <div className="flex items-center gap-4">
                        {/* Correct Answer */}
                        <div className="flex items-center gap-3 bg-slate-50 p-1.5 pr-2 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">{t.correctAnswer}</span>
                          <select 
                            value={q.answer} 
                            onChange={(e) => updateDraftQuestion(q.id, 'answer', e.target.value as any)} 
                            className="pl-3 pr-8 py-1.5 border border-slate-200 rounded-lg font-bold text-[13px] bg-white text-emerald-600 shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer outline-none transition-colors"
                          >
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                          </select>
                        </div>

                        {/* 🟢 NEW: Per-Question Difficulty Selector */}
                        <div className="flex items-center gap-3 bg-slate-50 p-1.5 pr-2 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">{t.difficultyLabel}</span>
                          <select 
                            value={q.difficulty} 
                            onChange={(e) => updateDraftQuestion(q.id, 'difficulty', e.target.value)} 
                            className="pl-3 pr-8 py-1.5 border border-slate-200 rounded-lg font-bold text-[13px] bg-white text-emerald-600 shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer outline-none transition-colors"
                          >
                            <option value="easy">{t.easy}</option>
                            <option value="medium">{t.medium}</option>
                            <option value="hard">{t.hard}</option>
                          </select>
                        </div>
                      </div>

                      <button onClick={() => updateDraftQuestion(q.id, 'showExplanation', !q.showExplanation)} className={`text-[13px] font-bold flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${q.showExplanation ? 'text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 shadow-sm'}`}>
                        <BookOpen size={16} /> {q.showExplanation ? t.hideExp : t.addExp}
                      </button>
                    </div>

                    {/* EXPLANATION */}
                    {q.showExplanation && (
                      <div className="mt-5 pt-5 border-t border-dashed border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                          <RichQuestionInput label={t.stepByStep} value={q.explanation} onChange={(latex) => updateDraftQuestion(q.id, 'explanation', latex)} placeholder="Yechimni shu yerda tushuntiring..." compact={true} />
                        </div>
                      </div>
                    )}
                  </div>
               </div>
            ))}
          </div>

          <div className="flex justify-center pt-8">
            <button onClick={addBlankQuestion} className="flex items-center gap-2 px-8 py-3.5 bg-white border border-slate-200 hover:border-emerald-300 shadow-sm hover:shadow-md text-slate-600 hover:text-emerald-600 font-bold rounded-2xl transition-all duration-200 text-[14px]">
              <Plus size={18} /> {t.addQuestion}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
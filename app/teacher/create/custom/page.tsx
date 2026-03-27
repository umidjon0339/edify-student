"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, BookOpen, Wand2, Settings2, ChevronUp, ChevronDown, CheckCircle2, Menu, X, LayoutGrid,PenTool } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

import { useTeacherLanguage } from "@/app/teacher/layout";
import SyllabusSelector from "@/app/teacher/create/_components/SyllabusSelector";
import RichQuestionInput from "@/app/teacher/create/_components/RichQuestionInput";
import TestConfigurationModal from "@/app/teacher/create/_components/TestConfigurationModal";
import { buildSafeEdifyQuestion } from "@/utils/questionFormatter";

// --- TRANSLATION DICTIONARY ---
const PAGE_TRANSLATIONS = {
  uz: {
    headerTitle: "Maxsus Studiya",
    sidebarTitle: "Hujjat Sozlamalari",
    topicTagging: "Mavzuni biriktirish",
    topicDesc: "Savollar qaysi mavzuga tegishli ekanligini tanlang.",
    publishBtn: "Nashr Qilish",
    modalTitle: "Test nomini kiriting",
    modalDesc: "Yangi yaratilgan testni saqlash va sozlashdan oldin unga nom bering.",
    modalCancel: "Bekor qilish",
    modalNext: "Keyingi qadam",
    canvasTitle: "Savollar Doskasi",
    canvasDesc: "Test savollarini quyida yarating va tahrirlang.",
    blocks: "Blok",
    multChoice: "Test (A, B, C, D)",
    promptLabel: "Savol matni",
    correctAnswer: "To'g'ri Javob",
    addExp: "Yechim qo'shish",
    hideExp: "Yechimni yashirish",
    stepByStep: "Qadam-baqadam Yechim",
    addQuestion: "Savol qo'shish",
    selectSyllabusErr: "Iltimos, o'quv dasturini to'liq tanlang.",
    emptyFieldsErr: "Iltimos, barcha savol va variantlarni to'ldiring.",
  },
  en: {
    headerTitle: "Custom Studio",
    sidebarTitle: "Document Setup",
    topicTagging: "Syllabus Tagging",
    topicDesc: "Select the curriculum parameters for these questions.",
    publishBtn: "Publish Test",
    modalTitle: "Name Your Test",
    modalDesc: "Give your newly created test a clear title before configuring the settings.",
    modalCancel: "Cancel",
    modalNext: "Next Step",
    canvasTitle: "Question Canvas",
    canvasDesc: "Build and edit your test questions below.",
    blocks: "Blocks",
    multChoice: "Multiple Choice",
    promptLabel: "Prompt / Question Text",
    correctAnswer: "Correct Answer",
    addExp: "Add Explanation",
    hideExp: "Hide Explanation",
    stepByStep: "Step-by-Step Solution",
    addQuestion: "Add Question",
    selectSyllabusErr: "Please select a complete Syllabus path.",
    emptyFieldsErr: "Please fill out all question text and options.",
  },
  ru: {
    headerTitle: "Своя Студия",
    sidebarTitle: "Настройка документа",
    topicTagging: "Привязка к программе",
    topicDesc: "Выберите параметры учебной программы для этих вопросов.",
    publishBtn: "Опубликовать",
    modalTitle: "Назовите свой тест",
    modalDesc: "Дайте вашему новому тесту понятное название перед настройкой.",
    modalCancel: "Отмена",
    modalNext: "Следующий Шаг",
    canvasTitle: "Доска вопросов",
    canvasDesc: "Создавайте и редактируйте тестовые вопросы ниже.",
    blocks: "Блоков",
    multChoice: "Тест (A, B, C, D)",
    promptLabel: "Текст вопроса",
    correctAnswer: "Правильный ответ",
    addExp: "Добавить объяснение",
    hideExp: "Скрыть объяснение",
    stepByStep: "Пошаговое решение",
    addQuestion: "Добавить вопрос",
    selectSyllabusErr: "Пожалуйста, выберите полный путь учебной программы.",
    emptyFieldsErr: "Пожалуйста, заполните все тексты вопросов и варианты.",
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
}

const DRAFT_STORAGE_KEY = "edify_custom_test_draft";

export default function CreateCustomTestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = PAGE_TRANSLATIONS[lang] || PAGE_TRANSLATIONS['en'];
  
  const [isHydrated, setIsHydrated] = useState(false);
  const [testTitle, setTestTitle] = useState("");
  const [testSyllabus, setTestSyllabus] = useState<any>(null);
  
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const generateSecureId = () => doc(collection(db, "teacher_questions")).id;

  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([
    { id: generateSecureId(), text: "", optA: "", optB: "", optC: "", optD: "", answer: "A", explanation: "", showExplanation: false }
  ]);

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
          if (parsed.s) setTestSyllabus(parsed.s);
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
          q: draftQuestions, t: testTitle, s: testSyllabus, timestamp: Date.now() 
        }));
      } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') console.warn("Local storage quota exceeded.");
      }
    }
  }, [draftQuestions, testTitle, testSyllabus, isHydrated]);

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
    setDraftQuestions(prev => [...prev, { id: generateSecureId(), text: "", optA: "", optB: "", optC: "", optD: "", answer: "A", explanation: "", showExplanation: false }]);
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
  };

  const removeQuestion = (id: string) => {
    if (draftQuestions.length === 1) return toast.error("Test must have at least one question.");
    setDraftQuestions(prev => prev.filter(q => q.id !== id));
  };

  // --- PUBLISH FLOW ---
  const handleInitiatePublish = () => {
    if (!testSyllabus?.subtopic) return toast.error(t.selectSyllabusErr);
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
    const generatedQuestions = [];

    for (const draft of draftQuestions) {
      const baseQuestion = buildSafeEdifyQuestion(
        user.uid, testSyllabus, draft.text,
        { A: draft.optA, B: draft.optB, C: draft.optC, D: draft.optD },
        draft.answer, draft.explanation 
      );
      
      const safeQuestion = {
        ...baseQuestion, 
        id: `tq_${draft.id}`, 
        number: "", 
        subjectId: "01",
        topicId: testSyllabus.topic.index.toString(),
        chapterId: testSyllabus.chapter.index.toString().padStart(2, '0'),
        subtopicId: testSyllabus.subtopic.index.toString().padStart(2, '0'),
        difficultyId: 2, 
        subject: "Matematika",
        topic: testSyllabus.topic.category,
        chapter: testSyllabus.chapter.chapter,
        subtopic: testSyllabus.subtopic.name,
        difficulty: "medium",
        tags: ["teacher_custom", testSyllabus.subtopic.name.toLowerCase(), testSyllabus.chapter.chapter.toLowerCase()],
        solutions: [], 
        uploadedAt: new Date().toISOString(), 
      };
      
      generatedQuestions.push(safeQuestion);
      batch.set(doc(db, "teacher_questions", safeQuestion.id), { ...safeQuestion, createdAt: serverTimestamp() });
    }

    batch.set(doc(collection(db, "custom_tests")), {
      teacherId: user.uid, teacherName: user.displayName || "Teacher",
      title: testTitle, topicId: testSyllabus.topic.index.toString(),
      questions: generatedQuestions, duration: testSettings.duration,
      shuffle: testSettings.shuffleQuestions, resultsVisibility: testSettings.resultsVisibility,
      accessCode: testSettings.accessCode, status: "active",
      createdAt: serverTimestamp(), questionCount: generatedQuestions.length,
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
    <div className="flex h-[100dvh] bg-[#FAFAFA] overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* 🟢 TITLE MODAL */}
      <AnimatePresence>
        {isTitleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTitleModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-100 z-10">
              <h3 className="text-xl font-black text-slate-900 mb-2">{t.modalTitle}</h3>
              <p className="text-[14px] text-slate-500 mb-6 font-medium">{t.modalDesc}</p>
              <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} placeholder="e.g., Algebra Midterm" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all mb-8" autoFocus/>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setIsTitleModalOpen(false)} className="px-5 py-2.5 font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">{t.modalCancel}</button>
                <button onClick={handleTitleSubmit} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2">{t.modalNext} <ArrowLeft className="rotate-180" size={16}/></button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TestConfigurationModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={handleFinalPublish} questionCount={draftQuestions.length} testTitle={testTitle} isSaving={isPublishing} />

      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}/>}

      {/* SIDEBAR */}
      <aside className={`absolute lg:relative w-[340px] bg-white border-r border-slate-200 flex flex-col h-full z-50 shrink-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col">
          <div className="flex justify-between items-center pb-4 mb-5 shrink-0 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/teacher/create')} className="p-1.5 -ml-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all"><ArrowLeft size={18} /></button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-100 text-emerald-600 rounded-md flex items-center justify-center shadow-sm"><Settings2 size={14} /></div>
                <h2 className="font-bold text-[15px] text-slate-900 tracking-tight">{t.sidebarTitle}</h2>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors"><X size={18} /></button>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 mb-4 flex-1">
             <label className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-1.5"><LayoutGrid size={14} className="text-emerald-600" /> {t.topicTagging}</label>
             <p className="text-[12px] text-slate-500 mb-4 font-medium leading-relaxed">{t.topicDesc}</p>
             <SyllabusSelector onChange={setTestSyllabus} />
          </div>
        </div>
      </aside>

      {/* MAIN CANVAS */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative w-full pb-32">
        
        {/* 🟢 UNIFIED HEADER WITH INTEGRATED MINI-MAP */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors"><Menu size={20} /></button>
            <h1 className="text-[16px] md:text-[18px] font-bold text-slate-900 tracking-tight flex items-center gap-2 hidden sm:flex">
              <PenTool size={16} className="text-emerald-500" /> {t.headerTitle}
            </h1>
          </div>
          
          {/* Mini-Map Navigator seamlessly in header */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar px-2 max-w-[40%] md:max-w-[50%]">
             {draftQuestions.map((q, i) => (
               <button key={q.id} onClick={() => handleCardFocus(q.id)} className="w-7 h-7 rounded-md bg-slate-50 border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 font-bold text-slate-500 text-[11px] flex items-center justify-center shrink-0 transition-colors">
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

        <div className="max-w-[800px] mx-auto p-4 md:p-8 mt-4">
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
                         <button onClick={() => moveQuestion(index, 'up')} disabled={index === 0} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-slate-200"><ChevronUp size={16} /></button>
                         <button onClick={() => moveQuestion(index, 'down')} disabled={index === draftQuestions.length - 1} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronDown size={16} /></button>
                      </div>
                      <button onClick={() => removeQuestion(q.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-100"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    
                    {/* 1. PROMPT (Tighter bottom margin) */}
                    <div className="mb-5">
                      <RichQuestionInput label={t.promptLabel} value={q.text} onChange={(latex) => updateDraftQuestion(q.id, 'text', latex)} placeholder="Masalan: Tenglamani yeching..." />
                    </div>

                    {/* 2. OPTIONS (2x2 Grid + Removed redundant labels) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mb-5">
                       {['A', 'B', 'C', 'D'].map(letter => {
                         const fieldKey = `opt${letter}` as keyof DraftQuestion;
                         return (
                           <div key={letter} className="flex gap-2.5 items-start group">
                             {/* Reduced letter box size slightly to match compact input */}
                             <div className="w-7 h-7 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-400 mt-2.5 group-focus-within:bg-emerald-50 group-focus-within:text-emerald-600 group-focus-within:border-emerald-200 transition-colors shrink-0">
                               {letter}
                             </div>
                             <div className="flex-1">
                               {/* Removed the 'label' prop to save height, added placeholder */}
                               <RichQuestionInput
                               label="" 
                                 value={q[fieldKey] as string} 
                                 onChange={(latex) => updateDraftQuestion(q.id, fieldKey, latex)} 
                                 compact={true} 
                                 placeholder={`${letter} varianti matni...`}
                               />
                             </div>
                           </div>
                         )
                       })}
                    </div>

                    {/* 3. FOOTER (Tighter padding, removed "Option" from dropdown) */}
                    <div className="flex flex-wrap justify-between items-center pt-4 border-t border-slate-100 gap-4">
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

                      <button onClick={() => updateDraftQuestion(q.id, 'showExplanation', !q.showExplanation)} className={`text-[13px] font-bold flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${q.showExplanation ? 'text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100'}`}>
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

          <div className="flex justify-center pt-6">
            <button onClick={addBlankQuestion} className="flex items-center gap-2 px-8 py-3.5 bg-white border border-slate-200 hover:border-emerald-300 shadow-sm hover:shadow-md text-slate-600 hover:text-emerald-600 font-bold rounded-2xl transition-all duration-200 text-[14px]">
              <Plus size={18} /> {t.addQuestion}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
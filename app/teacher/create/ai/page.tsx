"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Loader2, CheckCircle2, Wand2, BookOpen, Trash2, Layers, EyeOff, Eye, Menu, X, Minus, Plus } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { motion, AnimatePresence } from "framer-motion";

import { useTeacherLanguage } from "@/app/teacher/layout"; 
import SyllabusSelector from "@/app/teacher/create/_components/SyllabusSelector";
import TestConfigurationModal from "@/app/teacher/create/_components/TestConfigurationModal";

// --- TRANSLATION DICTIONARY ---
const PAGE_TRANSLATIONS = {
  uz: {
    headerTitle: "AI Qoralama",
    publishBtn: "Nashr Qilish",
    modalTitle: "Test nomini kiriting",
    modalDesc: "Yangi yaratilgan testni saqlash va sozlashdan oldin unga nom bering.",
    modalCancel: "Bekor qilish",
    modalNext: "Keyingi qadam",
    sidebarTitle: "AI Studiya",
    topicGenerator: "Mavzu Generatori",
    topicDesc: "O'quv dasturi parametrlarini aniq tanlang.",
    qsCount: "Savollar soni",
    generating: "Yaratilmoqda...",
    generateBtn: "Savollar Yaratish",
    emptyTitle: "Yaratishga tayyor.",
    emptyDesc: "Chap tomondan mavzularni sozlang va yarating.",
    openSettings: "Sozlamalarni ochish",
    mixMore: "Yana mavzu qo'shishni xohlaysizmi?",
    mixMoreDesc: "Yangi savollarni qo'shish uchun chap tomondagi sozlamalarni o'zgartiring.",
    items: "Savol",
    solutionLogic: "AI Yechim Mantiqi",
    hideExp: "Yechimni yashirish",
    showExp: "Yechimni ko'rish",
    selectSyllabusErr: "Iltimos, o'quv dasturini to'liq tanlang.",
    selectDiffErr: "Iltimos, qiyinlik darajasini tanlang.",
  },
  en: {
    headerTitle: "Draft Editor",
    publishBtn: "Publish Test",
    modalTitle: "Name Your Test",
    modalDesc: "Give your newly generated test a clear title before configuring the settings.",
    modalCancel: "Cancel",
    modalNext: "Next Step",
    sidebarTitle: "AI Studio",
    topicGenerator: "Topic Generator",
    topicDesc: "Select the exact curriculum parameters.",
    qsCount: "Questions to Generate",
    generating: "Generating...",
    generateBtn: "Generate Questions",
    emptyTitle: "Ready to create.",
    emptyDesc: "Configure topics on the left and generate.",
    openSettings: "Open Settings",
    mixMore: "Want to mix in more topics?",
    mixMoreDesc: "Adjust the syllabus settings to append new questions to this draft.",
    items: "Items",
    solutionLogic: "AI Solution Logic",
    hideExp: "Hide Explanation",
    showExp: "Show Explanation",
    selectSyllabusErr: "Please select a complete Syllabus path.",
    selectDiffErr: "Please select a Difficulty Level.",
  },
  ru: {
    headerTitle: "Черновик ИИ",
    publishBtn: "Опубликовать Тест",
    modalTitle: "Назовите свой тест",
    modalDesc: "Дайте вашему новому тесту понятное название перед настройкой.",
    modalCancel: "Отмена",
    modalNext: "Следующий Шаг",
    sidebarTitle: "AI Студия",
    topicGenerator: "Генератор тем",
    topicDesc: "Выберите точные параметры учебной программы.",
    qsCount: "Количество вопросов",
    generating: "Создание...",
    generateBtn: "Создать вопросы",
    emptyTitle: "Готово к созданию.",
    emptyDesc: "Настройте темы слева и нажмите создать.",
    openSettings: "Открыть настройки",
    mixMore: "Хотите добавить другие темы?",
    mixMoreDesc: "Измените настройки слева, чтобы добавить новые вопросы.",
    items: "Вопр.",
    solutionLogic: "Логика ИИ",
    hideExp: "Скрыть объяснение",
    showExp: "Показать объяснение",
    selectSyllabusErr: "Пожалуйста, выберите полный путь учебной программы.",
    selectDiffErr: "Пожалуйста, выберите уровень сложности.",
  }
};

interface AIQuestion {
  id: string;
  uiDifficulty: string;
  question: { uz: string; ru: string; en: string };
  options: {
    A: { uz: string; ru: string; en: string };
    B: { uz: string; ru: string; en: string };
    C: { uz: string; ru: string; en: string };
    D: { uz: string; ru: string; en: string };
  };
  answer: string;
  explanation: { uz: string; ru: string; en: string };
  topicId: string;
  chapterId: string;
  subtopicId: string;
  subject: string;
  topic: string;
  chapter: string;
  subtopic: string;
  difficultyId: number;
}
const FormattedText = ({ text }: { text: string }) => {
  if (!text) return null;

  // This regex splits the text by block math ($$...$$) and inline math ($...$)
  // keeping the delimiters so we know exactly how to render it.
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

  return (
    <span className="break-words">
      {parts.map((part, index) => {
        // Handle Display Math ($$ ... $$)
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2); // Remove the $$ delimiters
          try {
            const html = katex.renderToString(math, { 
              displayMode: true, 
              throwOnError: false 
            });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="block my-2 text-center overflow-x-auto" />;
          } catch (e) {
            return <span key={index} className="text-red-500 font-mono text-sm">{part}</span>;
          }
        }
        
        // Handle Inline Math ($ ... $)
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1); // Remove the $ delimiters
          try {
            const html = katex.renderToString(math, { 
              displayMode: false, 
              throwOnError: false 
            });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="px-0.5 inline-block" />;
          } catch (e) {
             return <span key={index} className="text-red-500 font-mono text-sm">{part}</span>;
          }
        }

        // Standard Text
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

const AIQuestionCard = ({ q, idx, onRemove, t }: { q: AIQuestion, idx: number, onRemove: (id: string) => void, t: any }) => {
  const [showOptions, setShowOptions] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false); // Default hidden to save space

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 relative group">
      {/* 🟢 FIXED: Added gap-4, flex-1, min-w-0, and strict truncations */}
      <div className="flex justify-between items-start gap-4 mb-5 pb-4 border-b border-slate-100">
        
        {/* LEFT SIDE: Tags (Flex-1 and min-w-0 forces it to stay inside bounds) */}
        <div className="flex items-center flex-wrap gap-2 flex-1 min-w-0">
          
          <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 border border-indigo-100/50 shrink-0">
            <Sparkles size={12} className="text-indigo-500" /> Q{idx + 1}
          </span>
          
          {/* Syllabus Tag with Strict Truncation */}
          <span className="bg-slate-50 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center border border-slate-200/60 max-w-full min-w-0">
             <Layers size={10} className="shrink-0 mr-1.5" /> 
             <span className="truncate">{q.chapter}</span> 
             <span className="text-slate-300 mx-1.5 shrink-0">/</span> 
             <span className="truncate">{q.subtopic}</span>
          </span>
          
          <span className="bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm shrink-0">
            {q.uiDifficulty}
          </span>
        </div>

        {/* RIGHT SIDE: Action Buttons (shrink-0 protects them from being crushed) */}
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => setShowOptions(!showOptions)} className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-md transition-colors"><Eye size={16} /></button>
          <button onClick={() => setShowExplanation(!showExplanation)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-md transition-colors"><BookOpen size={16} /></button>
          <div className="w-px h-4 bg-slate-200 mx-1"></div>
          <button onClick={() => onRemove(q.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors"><Trash2 size={16} /></button>
        </div>
      </div>
      
      <p className="font-semibold text-[15px] text-slate-900 mb-6 leading-relaxed"><FormattedText text={q.question.uz} /></p>
      
      {showOptions && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
          {Object.entries(q.options).map(([key, value]) => {
            const isCorrect = q.answer === key;
            return (
              <div key={key} className={`flex items-start p-3 rounded-xl border-2 transition-all ${isCorrect ? 'bg-indigo-50/40 border-indigo-500/30' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black mr-3 shrink-0 mt-0.5 transition-colors ${isCorrect ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' : 'bg-slate-100 text-slate-500'}`}>{key}</div>
                <div className={`text-sm font-medium pt-0.5 break-words overflow-hidden ${isCorrect ? 'text-indigo-950' : 'text-slate-700'}`}><FormattedText text={value.uz} /></div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="mt-2 pt-4 border-t border-slate-50">
        <button onClick={() => setShowExplanation(!showExplanation)} className="text-[13px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 transition-colors">
          {showExplanation ? <EyeOff size={14} /> : <Eye size={14} />} {showExplanation ? t.hideExp : t.showExp}
        </button>
      </div>

      {showExplanation && (
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mt-4 animate-in fade-in slide-in-from-top-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Sparkles size={14} className="text-indigo-400" /> {t.solutionLogic}</p>
          <p className="text-[13.5px] text-slate-700 leading-relaxed font-medium"><FormattedText text={q.explanation.uz} /></p>
        </div>
      )}
    </div>
  );
};

export default function AIGeneratorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = PAGE_TRANSLATIONS[lang] || PAGE_TRANSLATIONS['en'];

  const bottomRef = useRef<HTMLDivElement>(null);

  // States
  const [testTitle, setTestTitle] = useState("");
  const [testSyllabus, setTestSyllabus] = useState<any>(null);
  const [count, setCount] = useState(5); // 🟢 Default is now 5
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<AIQuestion[]>([]);
  
  // Modals
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (generatedQuestions.length > 0 && !isGenerating) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [generatedQuestions, isGenerating]);

  const handleGenerate = async () => {
    if (!testSyllabus?.subtopic) return toast.error(t.selectSyllabusErr);
    if (!testSyllabus?.difficulty) return toast.error(t.selectDiffErr);

    setIsGenerating(true);
    setIsSidebarOpen(false);

    try {
      const response = await fetch("/teacher/create/ai/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: testSyllabus.topic.category,
          chapter: testSyllabus.chapter.chapter,
          subtopic: testSyllabus.subtopic.name, 
          difficulty: testSyllabus.difficulty,
          count,
          language: "uz",
          context: testSyllabus.subtopic.context || "" 
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const diffLower = testSyllabus.difficulty.toLowerCase();
      const diffVal = diffLower === "easy" ? 1 : diffLower === "medium" ? 2 : 3;

      const enrichedQuestions: AIQuestion[] = data.questions.map((q: any) => ({
        ...q,
        topicId: testSyllabus.topic.index.toString(),
        chapterId: testSyllabus.chapter.index.toString().padStart(2, '0'),
        subtopicId: testSyllabus.subtopic.index.toString().padStart(2, '0'),
        subject: "Matematika",
        topic: testSyllabus.topic.category,
        chapter: testSyllabus.chapter.chapter,
        subtopic: testSyllabus.subtopic.name,
        difficultyId: diffVal,
      }));

      setGeneratedQuestions(prev => [...prev, ...enrichedQuestions]);
      toast.success(`Added ${count} new questions!`);
      
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  };

  const removeQuestion = (idToDelete: string) => setGeneratedQuestions(prev => prev.filter(q => q.id !== idToDelete));

  const handleInitiatePublish = () => {
    if (generatedQuestions.length === 0) return toast.error("Please generate questions first.");
    setIsTitleModalOpen(true); // Open Title Modal first!
  };

  const handleTitleSubmit = () => {
    if (!testTitle.trim()) return toast.error("Please enter a test title.");
    setIsTitleModalOpen(false);
    setIsConfigModalOpen(true); // Proceed to Config Modal
  };

  const handleFinalPublish = async (testSettings: any) => {
    if (!user) return;
    setIsPublishing(true);
    
    const batch = writeBatch(db);
    const finalQuestionsToSave = [];

    for (const q of generatedQuestions) {
      const secureFirebaseId = doc(collection(db, "teacher_questions")).id;
      const finalQ = {
        ...q,
        id: `tq_${secureFirebaseId}`, 
        creatorId: user.uid, 
        number: "", 
        subjectId: "01",
        topicId: q.topicId,
        chapterId: q.chapterId,
        subtopicId: q.subtopicId,
        difficultyId: q.difficultyId, 
        subject: q.subject,
        topic: q.topic,
        chapter: q.chapter,
        subtopic: q.subtopic,
        difficulty: q.uiDifficulty.toLowerCase(),
        tags: ["ai_generated", q.subtopic.toLowerCase(), q.chapter.toLowerCase()],
        language: ["uz", "ru", "en"],
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
      topicId: finalQuestionsToSave[0]?.topicId || "0",
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
      toast.success("Test published successfully!");
      setIsConfigModalOpen(false);
      router.push("/teacher/dashboard");
    } catch (error) {
      toast.error("Failed to publish test.");
    } finally {
      setIsPublishing(false);
    }
  };

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
              <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} placeholder="e.g., Algebra Midterm Exam" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all mb-8" autoFocus/>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setIsTitleModalOpen(false)} className="px-5 py-2.5 font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">{t.modalCancel}</button>
                <button onClick={handleTitleSubmit} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2">{t.modalNext} <ArrowLeft className="rotate-180" size={16}/></button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TestConfigurationModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={handleFinalPublish} questionCount={generatedQuestions.length} testTitle={testTitle} isSaving={isPublishing} />

      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}/>}

      {/* SIDEBAR */}
      <aside className={`absolute lg:relative w-[340px] bg-white border-r border-slate-200 flex flex-col h-full z-50 shrink-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col">
          <div className="flex justify-between items-center pb-4 mb-5 shrink-0 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/teacher/create')} className="p-1.5 -ml-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all"><ArrowLeft size={18} /></button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-slate-900 text-white rounded-md flex items-center justify-center shadow-sm"><Sparkles size={14} /></div>
                <h2 className="font-bold text-[15px] text-slate-900 tracking-tight">{t.sidebarTitle}</h2>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors"><X size={18} /></button>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 mb-4 flex-1">
             <label className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Layers size={14} className="text-indigo-600" /> {t.topicGenerator}</label>
             <p className="text-[12px] text-slate-500 mb-4 font-medium leading-relaxed">{t.topicDesc}</p>
             <SyllabusSelector onChange={setTestSyllabus} />
          </div>
        </div>

        {/* 🟢 UPGRADED: Stepper inside Sidebar */}
        <div className="sticky bottom-0 bg-white p-5 pt-4 border-t border-slate-100 z-20 mt-auto">
            <div className="flex flex-col gap-2 mb-6">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t.qsCount}</label>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-inner h-[46px]">
                <button onClick={() => setCount(prev => Math.max(1, prev - 1))} className="w-10 h-full flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all disabled:opacity-40" disabled={count <= 1}><Minus size={16} strokeWidth={2.5} /></button>
                <div className="flex-1 text-center flex items-center justify-center flex-col">
                  <span className="text-[15px] font-black text-slate-800 leading-none">{count}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.items}</span>
                </div>
                <button onClick={() => setCount(prev => Math.min(15, prev + 1))} className="w-10 h-full flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all disabled:opacity-40" disabled={count >= 15}><Plus size={16} strokeWidth={2.5} /></button>
              </div>
            </div>

            <button onClick={handleGenerate} disabled={isGenerating || !testSyllabus?.subtopic} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm text-[14px]">
              {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />} {isGenerating ? t.generating : t.generateBtn}
            </button>
        </div>
      </aside>

      {/* MAIN BUILDER AREA */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative w-full">
        
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors"><Menu size={20} /></button>
            <div className="flex items-center gap-4">
              <h1 className="text-[16px] md:text-[18px] font-bold text-slate-900 tracking-tight">{t.headerTitle}</h1>
              {generatedQuestions.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full border border-slate-200/60 animate-in fade-in">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                  <span className="text-[11px] font-bold text-slate-600 tracking-wide uppercase">{generatedQuestions.length} {t.items}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={handleInitiatePublish} disabled={isPublishing || isGenerating || generatedQuestions.length === 0} className="bg-slate-900 hover:bg-slate-800 text-white px-4 md:px-5 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 text-[13px] md:text-[14px]"><CheckCircle2 size={16} /> <span className="hidden sm:inline">{t.publishBtn}</span></button>
          </div>
        </div>

        <div className="max-w-[800px] mx-auto p-4 md:p-8 space-y-6">
          {generatedQuestions.length === 0 && !isGenerating ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-[50vh] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-white mt-6 p-6 text-center shadow-sm">
              <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center mb-4 border border-slate-100"><Sparkles size={24} className="text-slate-300" /></div>
              <p className="font-bold text-slate-600 text-[16px]">{t.emptyTitle}</p>
              <p className="text-[14px] text-slate-400 mt-1">{t.emptyDesc}</p>
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden mt-6 px-6 py-2.5 bg-indigo-50 text-indigo-600 font-bold rounded-xl text-[13px] hover:bg-indigo-100 transition-colors border border-indigo-100">{t.openSettings}</button>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {generatedQuestions.map((q, idx) => (
                <AIQuestionCard key={q.id} q={q} idx={idx} onRemove={removeQuestion} t={t} />
              ))}

              {isGenerating && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/50 to-transparent w-[200%] animate-[shimmer_2s_infinite]" />
                  <div className="flex items-center gap-3 mb-6"><div className="w-20 h-6 bg-slate-100 rounded-full" /><div className="w-32 h-6 bg-slate-50 rounded-full" /></div>
                  <div className="w-3/4 h-5 bg-slate-100 rounded-lg mb-6" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[1, 2, 3, 4].map(i => <div key={i} className="w-full h-12 bg-slate-50 rounded-xl border border-slate-100" />)}</div>
                </div>
              )}
              
              {!isGenerating && generatedQuestions.length > 0 && (
                <div className="py-10 flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
                  <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3"><Layers size={18} /></div>
                  <p className="text-[14px] font-bold text-slate-600">{t.mixMore}</p>
                  <p className="text-[13px] text-slate-400 mt-1 max-w-[280px] mb-5">{t.mixMoreDesc}</p>
                  <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden px-6 py-2 bg-slate-900 text-white font-bold rounded-xl text-[13px] hover:bg-slate-800 transition-colors shadow-sm">{t.openSettings}</button>
                </div>
              )}

              <div ref={bottomRef} className="h-8" />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
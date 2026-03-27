"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Loader2, Wand2, CheckCircle2, Trash2, EyeOff, Eye, BookOpen, Layers, Info, Check, Target, Zap, Minus, Plus } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { motion, AnimatePresence } from "framer-motion";

import { useTeacherLanguage } from "@/app/teacher/layout"; 
import TestConfigurationModal from "@/app/teacher/create/_components/TestConfigurationModal";

// --- 1. TRANSLATION DICTIONARY ---
const PAGE_TRANSLATIONS = {
  uz: {
    headerTitle: "AI Maxsus Prompt",
    publishBtn: "Nashr Qilish",
    modalTitle: "Test nomini kiriting",
    modalDesc: "Yangi yaratilgan testni saqlash va sozlashdan oldin unga nom bering.",
    modalCancel: "Bekor qilish",
    modalNext: "Keyingi qadam",
    inputTitle: "Vazifani tushuntiring",
    inputDesc: "Sun'iy intellekt siz yozgan matn asosida test tuzadi.",
    items: "Savol",
    easy: "Oson", medium: "O'rta", hard: "Qiyin",
    placeholder: "Masalan: Abituriyentlar uchun trigonometrik tengsizliklar va tenglamalar mavzusida test tayyorlab ber...",
    wordsMore: "Yana {n} ta so'z yozing",
    ready: "Yaratishga tayyor",
    generating: "Yaratilmoqda...",
    generateBtn: "Test Yaratish",
    tips: {
      t1: { title: "Auditoriyani bildiring", desc: "\"5-sinflar uchun\" deb yozsangiz, AI savollarni shunga moslaydi." },
      t2: { title: "Avtomatik formatlash", desc: "Barcha matematik formulalar AI tomonidan toza render qilinadi." },
      t3: { title: "Uzluksiz yaratish", desc: "Matnni o'zgartirib qayta bossangiz, yangi savollar pastga qo'shiladi." }
    },
    resultsTitle: "Tayyorlangan Savollar",
    addMore: "Yana savol qo'shish",
    solutionLogic: "Yechim Mantiqi",
    hideExp: "Yechimni yashirish",
    showExp: "Yechimni ko'rish"
  },
  en: {
    headerTitle: "AI Prompt Builder",
    publishBtn: "Publish Test",
    modalTitle: "Name Your Test",
    modalDesc: "Give your newly generated test a clear title before configuring the settings.",
    modalCancel: "Cancel",
    modalNext: "Next Step",
    inputTitle: "Task Description",
    inputDesc: "Describe what kind of questions the AI should create.",
    items: "Items",
    easy: "Easy", medium: "Medium", hard: "Hard",
    placeholder: "E.g., Generate a test on trigonometric equations and inequalities for high school graduates...",
    wordsMore: "Type {n} more words",
    ready: "Ready to generate",
    generating: "Generating...",
    generateBtn: "Generate Test",
    tips: {
      t1: { title: "Specify Audience", desc: "E.g. \"For 5th graders\", AI adjusts the difficulty accordingly." },
      t2: { title: "Auto-formatting", desc: "All mathematical formulas are cleanly rendered by AI." },
      t3: { title: "Continuous Creation", desc: "Modify the text and press again to append new questions below." }
    },
    resultsTitle: "Generated Questions",
    addMore: "Add More Questions",
    solutionLogic: "Solution Logic",
    hideExp: "Hide Explanation",
    showExp: "Show Explanation"
  },
  ru: {
    headerTitle: "AI Конструктор Промптов",
    publishBtn: "Опубликовать Тест",
    modalTitle: "Назовите свой тест",
    modalDesc: "Дайте вашему новому тесту понятное название перед настройкой.",
    modalCancel: "Отмена",
    modalNext: "Следующий Шаг",
    inputTitle: "Описание задачи",
    inputDesc: "Опишите, какие вопросы должен создать ИИ.",
    items: "Вопр.",
    easy: "Легкий", medium: "Средний", hard: "Сложный",
    placeholder: "Например, Создай тест по тригонометрическим уравнениям для абитуриентов...",
    wordsMore: "Напишите еще {n} слов",
    ready: "Готово к созданию",
    generating: "Создание...",
    generateBtn: "Создать Тест",
    tips: {
      t1: { title: "Укажите аудиторию", desc: "Например, \"Для 5 класса\", ИИ адаптирует вопросы." },
      t2: { title: "Авто-форматирование", desc: "Все математические формулы чисто рендерятся ИИ." },
      t3: { title: "Непрерывное создание", desc: "Измените текст и нажмите снова, чтобы добавить новые вопросы." }
    },
    resultsTitle: "Сгенерированные Вопросы",
    addMore: "Добавить вопросы",
    solutionLogic: "Логика решения",
    hideExp: "Скрыть объяснение",
    showExp: "Показать объяснение"
  }
};

// --- 2. LATEX FORMATTER ---
const FormattedText = ({ text }: { text: string }) => {
  if (!text) return null;
  const parts = text.split('$');
  return (
    <span>
      {parts.map((part, index) => {
        if (index % 2 === 1) { 
          try {
            const html = katex.renderToString(part, { throwOnError: false, displayMode: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="px-1" />;
          } catch (e) {
            return <span key={index} className="text-red-500">{part}</span>;
          }
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

// --- 3. QUESTION CARD COMPONENT ---
const AIQuestionCard = ({ q, idx, onRemove, t }: { q: any, idx: number, onRemove: (id: string) => void, t: any }) => {
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 group relative">
      <div className="flex justify-between items-start mb-5 pb-4 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-indigo-50 text-indigo-700 text-[11px] font-black px-3 py-1 rounded-full uppercase flex items-center gap-1.5 border border-indigo-100/50">
            <Sparkles size={12} className="text-indigo-500" /> Q{idx + 1}
          </span>
          <span className="bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase shadow-sm">
            {q.uiDifficulty}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button onClick={() => onRemove(q.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors" title="Delete Question">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <div className="font-semibold text-[15px] text-slate-900 mb-6 leading-relaxed">
        <FormattedText text={q.question.uz} />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {Object.entries(q.options).map(([key, value]: any) => {
          const isCorrect = q.answer === key;
          return (
            <div key={key} className={`flex items-start p-3 rounded-xl border-2 transition-all ${isCorrect ? 'bg-indigo-50/40 border-indigo-500/30' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black mr-3 mt-0.5 transition-colors ${isCorrect ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>{key}</div>
              <div className={`text-sm font-medium pt-0.5 ${isCorrect ? 'text-indigo-950' : 'text-slate-700'}`}><FormattedText text={value.uz} /></div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 pt-4 border-t border-slate-50">
        <button 
          onClick={() => setShowExplanation(!showExplanation)}
          className="text-[13px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 transition-colors"
        >
          {showExplanation ? <EyeOff size={14} /> : <Eye size={14} />}
          {showExplanation ? t.hideExp : t.showExp}
        </button>
      </div>

      {showExplanation && (
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mt-4 animate-in fade-in slide-in-from-top-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <BookOpen size={14} className="text-indigo-400" /> {t.solutionLogic}
          </p>
          <p className="text-[13.5px] text-slate-700 font-medium leading-relaxed">
            <FormattedText text={q.explanation.uz} />
          </p>
        </div>
      )}
    </div>
  );
};

// --- 4. MAIN PAGE ---
export default function AIUserInputPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Translation Hook
  const { lang } = useTeacherLanguage();
  const t = PAGE_TRANSLATIONS[lang] || PAGE_TRANSLATIONS['en'];

  // Refs
  const bottomRef = useRef<HTMLDivElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  // States
  const [testTitle, setTestTitle] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  
  // Modals
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const wordCount = userPrompt.trim() ? userPrompt.trim().split(/\s+/).length : 0;
  const wordsNeeded = Math.max(0, 5 - wordCount);

  useEffect(() => {
    if (generatedQuestions.length > 0 && !isGenerating) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [generatedQuestions, isGenerating]);

  const removeQuestion = (idToDelete: string) => {
    setGeneratedQuestions(prev => prev.filter(q => q.id !== idToDelete));
  };

  const handleScrollToPrompt = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      promptInputRef.current?.focus();
    }, 500);
  };

  // --- GENERATE API CALL ---
  const handleGenerate = async () => {
    if (wordCount < 5) return toast.error("Please provide a more detailed prompt (at least 5 words).");
    
    setIsGenerating(true);

    try {
      const response = await fetch("/teacher/create/by_user_input/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptText: userPrompt,
          difficulty: difficulty,
          count: count,
          language: "uz"
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const diffLower = difficulty.toLowerCase();
      const diffVal = diffLower === "easy" ? 1 : diffLower === "medium" ? 2 : 3;

      // 🟢 Enforce hardcoded database structure
      const enrichedQuestions = data.questions.map((q: any) => ({
        ...q,
        topicId: "0",
        chapterId: "0",
        subtopicId: "0",
        subject: "Matematika",
        topic: "by_prompt",
        chapter: "by_prompt",
        subtopic: "by_prompt",
        difficultyId: diffVal,
      }));

      setGeneratedQuestions(prev => [...prev, ...enrichedQuestions]);
      toast.success(`${count} questions generated successfully!`);
      
    } catch (error: any) {
      console.error(error);
      if (error.message.includes("fetch failed") || error.message.includes("ENOTFOUND")) {
        toast.error("Network error. Please check your internet connection.");
      } else {
        toast.error(error.message || "An error occurred.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // --- PUBLISH LOGIC ---
  const handleInitiatePublish = () => {
    if (generatedQuestions.length === 0) return toast.error("Please generate questions first.");
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

    for (const q of generatedQuestions) {
      const secureFirebaseId = doc(collection(db, "teacher_questions")).id;

      const finalQ = {
        ...q,
        id: `tq_${secureFirebaseId}`, 
        creatorId: user.uid, 
        number: "", 
        subjectId: "01",
        topicId: "0",
        chapterId: "0",
        subtopicId: "0",
        difficultyId: q.difficultyId, 
        subject: "Matematika",
        topic: "by_prompt",
        chapter: "by_prompt",
        subtopic: "by_prompt",
        difficulty: q.uiDifficulty.toLowerCase(),
        tags: ["ai_generated", "custom_prompt"],
        language: ["uz", "ru", "en"],
        solutions: [], 
        uploadedAt: new Date().toISOString(), 
      };
      
      finalQuestionsToSave.push(finalQ);
      const qRef = doc(db, "teacher_questions", finalQ.id);
      batch.set(qRef, { ...finalQ, createdAt: serverTimestamp() });
    }

    const testRef = doc(collection(db, "custom_tests"));
    batch.set(testRef, {
      teacherId: user.uid,
      teacherName: user.displayName || "Teacher",
      title: testTitle,
      subjectId: "01",
      topicId: "0", 
      chapterId: "0",
      subtopicId: "0",
      topicName: "by_prompt",
      chapterName: "by_prompt",
      subtopicName: "by_prompt",
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
      toast.error("Error publishing test.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans pb-24">
      
      {/* 🟢 TITLE MODAL */}
      <AnimatePresence>
        {isTitleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTitleModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-100 z-10">
              <h3 className="text-xl font-black text-slate-900 mb-2">{t.modalTitle}</h3>
              <p className="text-[14px] text-slate-500 mb-6 font-medium">{t.modalDesc}</p>
              
              <input 
                type="text" 
                value={testTitle}
                onChange={e => setTestTitle(e.target.value)}
                placeholder="e.g., Algebra Midterm Exam"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all mb-8"
                autoFocus
              />
              
              <div className="flex gap-3 justify-end">
                <button onClick={() => setIsTitleModalOpen(false)} className="px-5 py-2.5 font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">
                  {t.modalCancel}
                </button>
                <button onClick={handleTitleSubmit} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2">
                  {t.modalNext} <ArrowLeft className="rotate-180" size={16}/>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TestConfigurationModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onConfirm={handleFinalPublish}
        questionCount={generatedQuestions.length}
        testTitle={testTitle}
        isSaving={isPublishing}
      />

      {/* TOP NAVIGATION */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/teacher/create')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-[15px] md:text-[16px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-500" /> {t.headerTitle}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleInitiatePublish} 
              disabled={isPublishing || isGenerating || generatedQuestions.length === 0}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 md:px-5 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 text-[13px]"
            >
              <CheckCircle2 size={16} /> <span className="hidden sm:inline">{t.publishBtn}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8">
        
        {/* MAIN INPUT CARD */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 mb-8 relative overflow-hidden">
          
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl pointer-events-none"></div>

          {/* TOP CONTROLS */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-6 relative z-10 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-[18px] font-black text-slate-900 tracking-tight">{t.inputTitle}</h2>
              <p className="text-[13px] font-medium text-slate-500 mt-1">{t.inputDesc}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Count Selector */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-inner">
                <button 
                  onClick={() => setCount(prev => Math.max(1, prev - 1))}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all disabled:opacity-40"
                  disabled={count <= 1}
                >
                  <Minus size={16} strokeWidth={2.5} />
                </button>
                <div className="w-14 text-center flex flex-col justify-center">
                  <span className="text-[15px] font-black text-slate-800 leading-none">{count}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.items}</span>
                </div>
                <button 
                  onClick={() => setCount(prev => Math.min(15, prev + 1))}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all disabled:opacity-40"
                  disabled={count >= 15}
                >
                  <Plus size={16} strokeWidth={2.5} />
                </button>
              </div>

              <div className="hidden sm:block w-px h-8 bg-slate-200"></div>

              {/* Difficulty Selector */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-inner">
                <button onClick={() => setDifficulty('Easy')} className={`px-4 py-2 text-[12px] font-bold rounded-lg transition-all ${difficulty === 'Easy' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>{t.easy}</button>
                <button onClick={() => setDifficulty('Medium')} className={`px-4 py-2 text-[12px] font-bold rounded-lg transition-all ${difficulty === 'Medium' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>{t.medium}</button>
                <button onClick={() => setDifficulty('Hard')} className={`px-4 py-2 text-[12px] font-bold rounded-lg transition-all ${difficulty === 'Hard' ? 'bg-white text-rose-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>{t.hard}</button>
              </div>
            </div>
          </div>

          {/* TEXT AREA */}
          <div className="mb-2 relative z-10">
            <textarea 
              ref={promptInputRef}
              value={userPrompt}
              onChange={e => setUserPrompt(e.target.value)}
              placeholder={t.placeholder}
              maxLength={1500} 
              className="w-full min-h-[140px] p-5 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 resize-none transition-all placeholder:text-slate-400"
            />
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                {wordsNeeded > 0 ? (
                  <span className="text-[12px] font-bold text-amber-500 bg-amber-50 px-3 py-1 rounded-full flex items-center gap-1.5 border border-amber-100">
                    <Info size={14} /> {t.wordsMore.replace('{n}', wordsNeeded.toString())}
                  </span>
                ) : (
                  <span className="text-[12px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1.5 border border-emerald-100">
                    <Check size={14} /> {t.ready}
                  </span>
                )}
              </div>

              <button 
                onClick={handleGenerate}
                disabled={isGenerating || wordsNeeded > 0}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
                {isGenerating ? t.generating : t.generateBtn}
              </button>
            </div>
          </div>
        </div>

        {/* 🟢 RESTORED: "Pro Tips" Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start gap-4 shadow-sm">
             <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><Target size={20} /></div>
             <div>
               <h3 className="text-[14px] font-bold text-slate-800 mb-1">{t.tips.t1.title}</h3>
               <p className="text-[12px] text-slate-500 font-medium leading-relaxed">{t.tips.t1.desc}</p>
             </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start gap-4 shadow-sm">
             <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0"><Zap size={20} /></div>
             <div>
               <h3 className="text-[14px] font-bold text-slate-800 mb-1">{t.tips.t2.title}</h3>
               <p className="text-[12px] text-slate-500 font-medium leading-relaxed">{t.tips.t2.desc}</p>
             </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start gap-4 shadow-sm">
             <div className="w-10 h-10 rounded-full bg-violet-50 text-violet-500 flex items-center justify-center shrink-0"><Layers size={20} /></div>
             <div>
               <h3 className="text-[14px] font-bold text-slate-800 mb-1">{t.tips.t3.title}</h3>
               <p className="text-[12px] text-slate-500 font-medium leading-relaxed">{t.tips.t3.desc}</p>
             </div>
          </div>
        </div>

        {/* RESULTS SECTION */}
        {generatedQuestions.length > 0 && (
          <div className="space-y-5 pb-12">
            <div className="flex items-center justify-between px-2 mb-4">
               <div className="flex items-center gap-2">
                 <Layers size={18} className="text-slate-400" />
                 <h2 className="text-sm font-bold text-slate-600 uppercase tracking-widest">
                   {t.resultsTitle} ({generatedQuestions.length})
                 </h2>
               </div>
            </div>
            
            {generatedQuestions.map((q, idx) => (
              <AIQuestionCard key={q.id} q={q} idx={idx} onRemove={removeQuestion} t={t} />
            ))}

            {/* Add More Questions Button */}
            {!isGenerating && (
              <div className="pt-6 flex justify-center animate-in fade-in duration-500">
                <button 
                  onClick={handleScrollToPrompt}
                  className="px-6 py-3 bg-transparent border-2 border-dashed border-slate-300 text-slate-500 font-bold rounded-xl hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-2"
                >
                  <Plus size={18} /> {t.addMore}
                </button>
              </div>
            )}

            <div ref={bottomRef} className="h-8" />
          </div>
        )}

      </div>
    </div>
  );
}
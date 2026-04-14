"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Loader2,X, CheckCircle2, Wand2, BookOpen, Trash2, Layers, EyeOff, Eye, Minus, Plus, ChevronRight, Bot, Zap, Target, Database, Lightbulb } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

import { useTeacherLanguage } from "@/app/teacher/layout"; 
import TestConfigurationModal from "@/app/teacher/create/_components/TestConfigurationModal";

// 🟢 AI LIMIT BLOCK START
import { useAiLimits } from "@/hooks/useAiLimits";
import AiLimitCard from "@/app/teacher/create/_components/AiLimitCard"; 
// 🔴 AI LIMIT BLOCK END

// --- 1. TRANSLATION DICTIONARY ---
const PAGE_TRANSLATIONS = {
  uz: {
    headerTitle: "AI Maxsus Prompt",
    publishBtn: "Nashr Qilish",
    saveToBankBtn: "Bazaga Saqlash", // 🟢 NEW
    savedToBankSuccess: "Savollar bazangizga muvaffaqiyatli saqlandi!", // 🟢 NEW
    modalTitle: "Test nomini kiriting",
    modalDesc: "Yangi yaratilgan testni saqlash va sozlashdan oldin unga nom bering.",
    modalCancel: "Bekor qilish",
    modalNext: "Keyingi qadam",
    inputTitle: "Vazifani tushuntiring",
    inputDesc: "Sun'iy intellekt siz yozgan matn asosida test tuzadi.",
    items: "Savol",
    easy: "Oson", medium: "O'rta", hard: "Qiyin",
    placeholder: "Masalan: Abituriyentlar uchun trigonometrik tengsizliklar va tenglamalar mavzusida test tayyorlab ber...",
    wordsMore: "Yana {n} ta so'z",
    ready: "Tayyor",
    generating: "Yaratilmoqda...",
    generateBtn: "Test Yaratish",
    tips: {
      t1: { title: "Auditoriyani bildiring", desc: "\"5-sinflar uchun\" deb yozsangiz, AI savollarni shunga moslaydi." },
      t2: { title: "Avtomatik formatlash", desc: "Barcha matematik formulalar AI tomonidan toza render qilinadi." },
      t3: { title: "Uzluksiz yaratish", desc: "Matnni o'zgartirib qayta bossangiz, yangi savollar pastga qo'shiladi." }
    },
    resultsTitle: "Tayyorlangan Savollar",
    addMore: "Yana savol qo'shish",
    addMoreInstructions: "Matnni o'zgartiring va 'Test Yaratish' tugmasini bosing.", // 🟢 NEW
    solutionLogic: "Yechim Mantiqi",
    hideExp: "Yashirish",
    showExp: "Yechim"
  },
  en: {
    headerTitle: "AI Prompt Builder",
    publishBtn: "Publish Test",
    saveToBankBtn: "Save to Bank", // 🟢 NEW
    savedToBankSuccess: "Questions successfully saved to your bank!", // 🟢 NEW
    modalTitle: "Name Your Test",
    modalDesc: "Give your newly generated test a clear title before configuring the settings.",
    modalCancel: "Cancel",
    modalNext: "Next Step",
    inputTitle: "Task Description",
    inputDesc: "Describe what kind of questions the AI should create.",
    items: "Items",
    easy: "Easy", medium: "Medium", hard: "Hard",
    placeholder: "E.g., Generate a test on trigonometric equations and inequalities for high school graduates...",
    wordsMore: "{n} more words",
    ready: "Ready",
    generating: "Generating...",
    generateBtn: "Generate Test",
    tips: {
      t1: { title: "Specify Audience", desc: "E.g. \"For 5th graders\", AI adjusts the difficulty accordingly." },
      t2: { title: "Auto-formatting", desc: "All mathematical formulas are cleanly rendered by AI." },
      t3: { title: "Continuous Creation", desc: "Modify the text and press again to append new questions below." }
    },
    resultsTitle: "Generated Questions",
    addMore: "Add More",
    addMoreInstructions: "Modify the text and click 'Generate Test' to append more.", // 🟢 NEW
    solutionLogic: "Solution Logic",
    hideExp: "Hide",
    showExp: "Explanation"
  },
  ru: {
    headerTitle: "AI Промпты",
    publishBtn: "Опубликовать",
    saveToBankBtn: "Сохранить в базу", // 🟢 NEW
    savedToBankSuccess: "Вопросы успешно сохранены в вашу базу!", // 🟢 NEW
    modalTitle: "Назовите свой тест",
    modalDesc: "Дайте вашему новому тесту понятное название перед настройкой.",
    modalCancel: "Отмена",
    modalNext: "Далее",
    inputTitle: "Описание задачи",
    inputDesc: "Опишите, какие вопросы должен создать ИИ.",
    items: "Вопр.",
    easy: "Легкий", medium: "Средний", hard: "Сложный",
    placeholder: "Например, Создай тест по тригонометрическим уравнениям для абитуриентов...",
    wordsMore: "Еще {n} слов",
    ready: "Готово",
    generating: "Создание...",
    generateBtn: "Создать Тест",
    tips: {
      t1: { title: "Укажите аудиторию", desc: "Например, \"Для 5 класса\", ИИ адаптирует вопросы." },
      t2: { title: "Авто-формат", desc: "Все математические формулы чисто рендерятся ИИ." },
      t3: { title: "Непрерывно", desc: "Измените текст и нажмите снова, чтобы добавить новые вопросы." }
    },
    resultsTitle: "Сгенерированные",
    addMore: "Добавить",
    addMoreInstructions: "Измените текст и нажмите 'Создать Тест', чтобы добавить еще.", // 🟢 NEW
    solutionLogic: "Логика решения",
    hideExp: "Скрыть",
    showExp: "Решение"
  }
};

interface AIQuestion { 
  id: string; 
  uiDifficulty: string; 
  question: { uz: string; ru: string; en: string }; 
  options: { A: { uz: string; ru: string; en: string }; B: { uz: string; ru: string; en: string }; C: { uz: string; ru: string; en: string }; D: { uz: string; ru: string; en: string }; }; 
  answer: string; 
  explanation: { uz: string; ru: string; en: string }; 
  subject: string; 
  topic: string; 
  chapter: string; 
  subtopic: string; 
  difficultyId: number; 
}

const AiThinkingModal = ({ isVisible }: { isVisible: boolean }) => {
  const phrases = ["Ma'lumotlar tahlil qilinmoqda...", "Qoidalar tekshirilmoqda...", "Qiyinlik darajasi moslashtirilmoqda...", "Savollar va javoblar yozilmoqda...", "Formula va chizmalar tekshirilmoqda..."];
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => setPhraseIndex((prev) => (prev + 1) % phrases.length), 2500); 
    return () => clearInterval(interval);
  }, [isVisible, phrases.length]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-[320px] md:max-w-md bg-white/90 backdrop-blur-2xl rounded-[1.5rem] md:rounded-3xl border border-indigo-100/50 shadow-2xl p-6 md:p-8 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-indigo-500/20 rounded-full blur-[80px] animate-pulse"></div>
            <div className="absolute bottom-[-30%] right-[-20%] w-[80%] h-[80%] bg-blue-500/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "1s" }}></div>
            <div className="relative mb-6 md:mb-8 mt-2 md:mt-4">
              <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-blue-400 rounded-full blur-xl opacity-40" />
              <div className="relative w-20 h-20 md:w-24 md:h-24 bg-white/80 backdrop-blur-md rounded-2xl md:rounded-3xl border border-white flex items-center justify-center shadow-xl">
                <Bot size={36} className="text-indigo-600 animate-bounce md:w-11 md:h-11" style={{ animationDuration: "2s" }} />
                <Sparkles size={16} className="absolute -top-2 -right-2 text-amber-400 animate-pulse md:w-5 md:h-5 md:-top-3 md:-right-3" />
              </div>
            </div>
            <h3 className="text-lg md:text-xl font-black text-slate-800 mb-1 md:mb-2 relative z-10 tracking-tight text-center">AI Studiya ishlamoqda</h3>
            <div className="h-5 md:h-6 relative z-10 overflow-hidden flex items-center justify-center w-full">
              <motion.p key={phraseIndex} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.4 }} className="text-[12px] md:text-[14px] font-medium text-slate-500 absolute text-center w-full">{phrases[phraseIndex]}</motion.p>
            </div>
            <div className="w-[80%] h-1 md:h-1.5 bg-slate-200/50 rounded-full mt-6 md:mt-8 overflow-hidden relative z-10">
              <motion.div className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500 rounded-full w-[200%]" animate={{ x: ["-50%", "0%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const FormattedText = ({ text }: { text: any }) => {
  if (!text) return null;
  let content = typeof text === 'string' ? text : JSON.stringify(text);
  const hasMathCommands = /\\frac|\\pi|\\sin|\\cos|\\tan|\\ge|\\le|\\cup|\\cap|\\in|\\begin|\\sqrt|\\empty/.test(content);
  if (!content.includes('$') && hasMathCommands) content = `$${content}$`;
  content = content.replace(/\\\((.*?)\\\)/g, '$$$1$$').replace(/\\\[(.*?)\\\]/g, '$$$$$1$$$$').replace(/&nbsp;/g, ' ').replace(/\\\\/g, '\\');                 
  const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

  return (
    <span className="leading-relaxed break-words">
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(math, { displayMode: true, throwOnError: false, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="block my-2 md:my-3 text-center overflow-x-auto custom-scrollbar" />;
          } catch (e) { return <span key={index} className="text-rose-500 font-mono text-[11px] md:text-[13px] bg-rose-50 px-1 rounded">{part}</span>; }
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(math, { displayMode: false, throwOnError: false, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="px-0.5 inline-block" />;
          } catch (e) { return <span key={index} className="text-rose-500 font-mono text-[11px] md:text-[13px] bg-rose-50 px-1 rounded">{part}</span>; }
        }
        return <span key={index}>{part.split('\n').map((line, i, arr) => (<span key={i}>{line}{i < arr.length - 1 && <br />}</span>))}</span>;
      })}
    </span>
  );
};

const AIQuestionCard = ({ q, idx, onRemove, t }: { q: any, idx: number, onRemove: (id: string) => void, t: any }) => {
  const [showOptions, setShowOptions] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);
  
  const getText = (field: any): string => {
    if (!field) return "";
    if (typeof field === "string") return field;
    if (field.uz && typeof field.uz === "string") return field.uz;
    if (field.uz && field.uz.uz) return field.uz.uz; 
    return JSON.stringify(field); 
  };

  return (
    <div className="bg-white p-3.5 md:p-5 rounded-[1.25rem] md:rounded-3xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-indigo-200 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 relative group">
      <div className="flex justify-between items-center gap-2 mb-3 md:mb-5 md:pb-4 md:border-b border-slate-100">
        <div className="flex items-center flex-wrap gap-1.5 flex-1 min-w-0">
          <span className="bg-indigo-50 text-indigo-700 text-[9px] md:text-[11px] font-black px-2 md:px-3 py-1 md:py-1.5 rounded-md md:rounded-xl uppercase tracking-widest flex items-center gap-1 md:gap-1.5 border border-indigo-100/50 shrink-0">
            Q{idx + 1}
          </span>
          <span className="bg-slate-50 text-slate-500 text-[9px] md:text-[11px] font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-md md:rounded-xl uppercase tracking-tight flex items-center border border-slate-200/60 max-w-full min-w-0">
             <span className="truncate">AI Prompt</span>
          </span>
          <span className="hidden sm:inline-flex bg-slate-900 text-white text-[10px] md:text-[11px] font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-md md:rounded-xl uppercase tracking-widest shadow-sm shrink-0">
            {q.uiDifficulty}
          </span>
        </div>
        <div className="flex items-center bg-slate-50 md:bg-transparent border border-slate-200 md:border-transparent rounded-lg md:rounded-none p-0.5 md:p-0 shrink-0">
          <button onClick={() => setShowOptions(!showOptions)} className="text-slate-400 hover:text-slate-900 hover:bg-white md:hover:bg-slate-100 p-1 md:p-2 rounded-md md:rounded-xl transition-colors"><Eye size={14} className="md:w-[18px] md:h-[18px]" /></button>
          {getText(q.explanation).trim().length > 0 && (
            <>
              <div className="w-px h-3 md:h-5 bg-slate-200 mx-0.5 md:mx-1"></div>
              <button onClick={() => setShowExplanation(!showExplanation)} className={`p-1 md:p-2 rounded-md md:rounded-xl transition-colors ${showExplanation ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-white md:hover:bg-indigo-50'}`}><BookOpen size={14} className="md:w-[18px] md:h-[18px]" /></button>
            </>
          )}
          <div className="w-px h-3 md:h-5 bg-slate-200 mx-0.5 md:mx-1"></div>
          <button onClick={() => onRemove(q.id)} className="text-slate-400 hover:text-red-600 hover:bg-white md:hover:bg-red-50 p-1 md:p-2 rounded-md md:rounded-xl transition-colors"><Trash2 size={14} className="md:w-[18px] md:h-[18px]" /></button>
        </div>
      </div>
      <div className="font-semibold text-[12px] md:text-[15.5px] text-slate-900 mb-3 md:mb-6 leading-snug md:leading-relaxed"><FormattedText text={getText(q.question)} /></div>
      {showOptions && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-3 mb-1">
          {Object.entries(q.options).map(([key, value]) => {
            const isCorrect = q.answer === key;
            return (
              <div key={key} className={`flex items-start p-2 md:p-3.5 rounded-xl md:rounded-2xl border transition-all ${isCorrect ? 'bg-indigo-50 border-indigo-300/50' : 'bg-slate-50/50 md:bg-white border-slate-100 md:border-slate-200 hover:border-slate-300'}`}>
                <div className={`w-5 h-5 md:w-7 md:h-7 rounded-md md:rounded-lg flex items-center justify-center text-[10px] md:text-[12px] font-black mr-2 md:mr-3 shrink-0 transition-colors ${isCorrect ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/20' : 'bg-white md:bg-slate-100 text-slate-400 md:text-slate-500 border border-slate-200 md:border-none'}`}>{key}</div>
                <div className={`text-[11px] md:text-[14.5px] font-medium pt-0.5 break-words overflow-hidden ${isCorrect ? 'text-indigo-950' : 'text-slate-700'}`}><FormattedText text={getText(value)} /></div>
              </div>
            );
          })}
        </div>
      )}
      {showExplanation && getText(q.explanation).trim().length > 0 && (
        <div className="bg-indigo-50/50 border border-indigo-100/60 p-2.5 md:p-4.5 rounded-xl md:rounded-2xl mt-2 md:mt-3 animate-in fade-in slide-in-from-top-2">
          <p className="text-[9px] md:text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-1 md:mb-2 flex items-center gap-1 md:gap-1.5"><Sparkles size={10} className="md:w-[14px] md:h-[14px]" /> {t.solutionLogic}</p>
          <p className="text-[11px] md:text-[14px] text-slate-700 leading-relaxed font-medium"><FormattedText text={getText(q.explanation)} /></p>
        </div>
      )}
    </div>
  );
};

export default function AIUserInputPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const { lang } = useTeacherLanguage();
  const t = PAGE_TRANSLATIONS[lang] || PAGE_TRANSLATIONS['en'];

  const bottomRef = useRef<HTMLDivElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const aiData = useAiLimits(); 

  const [testTitle, setTestTitle] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<AIQuestion[]>([]);
  
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingToBank, setIsSavingToBank] = useState(false); // 🟢 NEW STATE
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

  const wordCount = userPrompt.trim() ? userPrompt.trim().split(/\s+/).length : 0;
  const wordsNeeded = Math.max(0, 5 - wordCount);

  useEffect(() => {
    if (generatedQuestions.length > 0 && !isGenerating) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [generatedQuestions, isGenerating]);

  const removeQuestion = (idToDelete: string) => setGeneratedQuestions(prev => prev.filter(q => q.id !== idToDelete));

  const handleScrollToPrompt = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(t.addMoreInstructions, { icon: "💡", duration: 4000 }); // 🟢 NEW TOAST
    setTimeout(() => { promptInputRef.current?.focus(); }, 500);
  };

  // --- GENERATE API CALL ---
  const handleGenerate = async () => {
    if (wordCount < 5) return toast.error("Please provide a more detailed prompt (at least 5 words).");
    if (aiData?.isLimitReached || (aiData && count > aiData.remaining)) {
      setIsLimitModalOpen(true);
      return; 
    }
    setIsGenerating(true);

    try {
      const response = await fetch("/teacher/create/by_user_input/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid, 
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

      const enrichedQuestions: AIQuestion[] = data.questions.map((q: any) => ({
        ...q,
        id: `tq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        subject: "by_prompt", topic: "by_prompt", chapter: "by_prompt", subtopic: "by_prompt",
        difficultyId: diffVal, uiDifficulty: difficulty,
        explanation: typeof q.explanation === 'string' ? { uz: q.explanation } : (q.explanation || { uz: "" }),
      }));

      setGeneratedQuestions(prev => [...prev, ...enrichedQuestions]);
      toast.success(`${count} ta savol yaratildi!`);
      
    } catch (error: any) {
      if (error.message.includes("fetch failed") || error.message.includes("ENOTFOUND")) {
        toast.error("Tarmoq xatosi. Internetni tekshiring.");
      } else {
        toast.error(error.message || "Xatolik yuz berdi.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // --- 🟢 NEW: SAVE TO BANK LOGIC ---
  const handleSaveToBank = async () => {
    if (generatedQuestions.length === 0) return toast.error("Iltimos, oldin savol yarating.");
    if (!user) return;

    setIsSavingToBank(true);
    const batch = writeBatch(db);
    const currentTimestampString = new Date().toISOString();

    try {
      for (const q of generatedQuestions) {
        const questionRef = doc(collection(db, "teacher_questions"));
        const finalQ = {
          ...q,
          id: `tq_${questionRef.id}`, 
          creatorId: user.uid, 
          number: "", 
          track: "by_prompt", subject: "by_prompt", topic: "by_prompt", chapter: "by_prompt", subtopic: "by_prompt",
          creationMethod: "by_prompt", 
          difficulty: q.uiDifficulty.toLowerCase(), difficultyId: q.difficultyId, 
          tags: ["ai_generated", "custom_prompt"], language: ["uz", "ru", "en"], solutions: [], 
          uploadedAt: currentTimestampString, 
        };
        batch.set(questionRef, { ...finalQ, createdAt: serverTimestamp() });
      }

      await batch.commit();
      toast.success(t.savedToBankSuccess);
      router.push('/teacher/create/my_questions'); 
    } catch (error) {
      console.error("Save to bank error:", error);
      toast.error("Bazaga saqlashda xatolik yuz berdi.");
    } finally {
      setIsSavingToBank(false);
    }
  };

  // --- PUBLISH LOGIC ---
  const handleInitiatePublish = () => {
    if (generatedQuestions.length === 0) return toast.error("Iltimos, oldin savol yarating.");
    setIsTitleModalOpen(true); 
  };

  const handleTitleSubmit = () => {
    if (!testTitle.trim()) return toast.error("Iltimos, test nomini kiriting.");
    setIsTitleModalOpen(false);
    setIsConfigModalOpen(true); 
  };

  const handleFinalPublish = async (testSettings: any) => {
    if (!user) return;
    setIsPublishing(true);
    
    const batch = writeBatch(db);
    const finalQuestionsToSave = [];
    const currentTimestampString = new Date().toISOString();

    for (const q of generatedQuestions) {
      const secureFirebaseId = doc(collection(db, "teacher_questions")).id;
      const finalQ = {
        ...q, id: `tq_${secureFirebaseId}`, creatorId: user.uid, number: "", track: "by_prompt",
        subject: "by_prompt", topic: "by_prompt", chapter: "by_prompt", subtopic: "by_prompt", creationMethod: "by_prompt",
        difficulty: q.uiDifficulty.toLowerCase(), difficultyId: q.difficultyId, 
        tags: ["ai_generated", "custom_prompt"], language: ["uz", "ru", "en"], solutions: [], uploadedAt: currentTimestampString, 
      };
      finalQuestionsToSave.push(finalQ);
      batch.set(doc(db, "teacher_questions", finalQ.id), { ...finalQ, createdAt: serverTimestamp() });
    }

    batch.set(doc(collection(db, "custom_tests")), {
      teacherId: user.uid, teacherName: user.displayName || "Teacher", title: testTitle, track: "by_prompt",
      subjectName: "by_prompt", topicName: "by_prompt", chapterName: "by_prompt", subtopicName: "by_prompt",
      questions: finalQuestionsToSave, duration: testSettings.duration, shuffle: testSettings.shuffleQuestions, resultsVisibility: testSettings.resultsVisibility, accessCode: testSettings.accessCode, status: "active", createdAt: serverTimestamp(), questionCount: finalQuestionsToSave.length,
    });

    try {
      await batch.commit();
      toast.success("Test published successfully!");
      setIsConfigModalOpen(false);
      router.push("/teacher/library/tests");
    } catch (error) {
      toast.error("Error publishing test.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#FAFAFA] font-sans pt-[60px] lg:pt-0">
      
      <AiThinkingModal isVisible={isGenerating} />

      {/* 🟢 TOP BAR (Mobile Offset) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-[60px] bg-white/90 backdrop-blur-xl border-b border-slate-200 z-[10000] flex items-center justify-between px-3 shadow-sm">
        <button onClick={() => router.push('/teacher/create')} className="p-2 -ml-1 text-slate-500 rounded-lg"><ArrowLeft size={18} /></button>
        <span className="font-black text-slate-800 text-[14px]">{t.headerTitle}</span>
        <div className="w-8"></div>
      </div>

      <AnimatePresence>
        {isLimitModalOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsLimitModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-[1.5rem] md:rounded-3xl p-6 md:p-8 w-full max-w-[320px] md:max-w-sm shadow-2xl z-10 flex flex-col items-center text-center">
              <button onClick={() => setIsLimitModalOpen(false)} className="absolute top-3 right-3 md:top-4 md:right-4 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"><X size={18} className="md:w-5 md:h-5" /></button>
              <div className="w-12 h-12 md:w-16 md:h-16 bg-rose-50 rounded-[1rem] md:rounded-2xl flex items-center justify-center mb-4 md:mb-5 border border-rose-100 shadow-inner"><Zap size={24} className="text-rose-500 md:w-7 md:h-7" /></div>
              <h3 className="text-lg md:text-xl font-black text-slate-900 mb-1.5 md:mb-2">{aiData?.isLimitReached ? "Kunlik limit tugadi" : "Limit yetarli emas"}</h3>
              <p className="text-[12px] md:text-[14px] text-slate-500 mb-5 md:mb-6 font-medium leading-relaxed">{aiData?.isLimitReached ? "Siz bugungi bepul kunlik limitingizni tugatdingiz. Cheklovsiz foydalanish uchun profilingizni yangilang." : `Sizda bugun uchun faqatgina ${aiData?.remaining} ta bepul limit qoldi.`}</p>
              <div className="w-full flex flex-col gap-2 md:gap-3">
                <button onClick={() => window.open('https://t.me/Umidjon0339', '_blank')} className="w-full py-3 md:py-3.5 bg-[#0088cc] hover:bg-[#0077b3] text-white text-[13px] md:text-[14px] font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2">Limitni oshirish</button>
                <button onClick={() => setIsLimitModalOpen(false)} className="w-full py-3 md:py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[13px] md:text-[14px] font-bold rounded-xl transition-colors active:scale-[0.98]">Orqaga qaytish</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTitleModalOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTitleModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-[1.5rem] md:rounded-3xl p-5 md:p-8 w-full max-w-[320px] md:max-w-sm shadow-2xl border border-slate-100 z-10">
              <h3 className="text-lg md:text-xl font-black text-slate-900 mb-1.5 md:mb-2">{t.modalTitle}</h3>
              <p className="text-[12px] md:text-[14px] text-slate-500 mb-5 md:mb-6 font-medium">{t.modalDesc}</p>
              <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} placeholder="Masalan: 1-chorak nazorati" className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] md:text-[14px] font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all mb-6 md:mb-8" autoFocus/>
              <div className="flex gap-2 md:gap-3 justify-end">
                <button onClick={() => setIsTitleModalOpen(false)} className="px-4 py-2 md:px-5 md:py-2.5 text-[12px] md:text-[14px] font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">{t.modalCancel}</button>
                <button onClick={handleTitleSubmit} className="px-4 py-2 md:px-6 md:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-[12px] md:text-[14px] text-white font-bold rounded-xl flex items-center gap-1.5 md:gap-2">{t.modalNext} <ChevronRight size={16} strokeWidth={3}/></button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {mounted && createPortal(
        <TestConfigurationModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={handleFinalPublish} questionCount={generatedQuestions.length} testTitle={testTitle} isSaving={isPublishing} />,
        document.body
      )}

      {/* 🟢 TOP BAR (Desktop) */}
      <div className="hidden lg:flex bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl w-full mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/teacher/create')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-[16px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-500" /> {t.headerTitle}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <AiLimitCard aiData={aiData} />
            
            {/* 🟢 SAVE TO BANK BUTTON (Desktop) */}
            <button 
              onClick={handleSaveToBank} 
              disabled={isPublishing || isSavingToBank || isGenerating || generatedQuestions.length === 0} 
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 text-[13px]"
            >
              {isSavingToBank ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />} 
              <span>{t.saveToBankBtn}</span>
            </button>

            <button onClick={handleInitiatePublish} disabled={isPublishing || isGenerating || generatedQuestions.length === 0} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 text-[13px]">
              <CheckCircle2 size={16} /> <span>{t.publishBtn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🟢 MAIN CONTENT */}
      <div className="max-w-4xl w-full mx-auto px-3 md:px-4 mt-4 md:mt-8 pb-32">
        
        {/* HERO PROMPT AREA */}
        <div className="bg-white rounded-[1rem] md:rounded-3xl border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-4 md:p-8 mb-5 md:mb-8 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl pointer-events-none"></div>

          <div className="mb-3 md:mb-4 relative z-10 px-1 md:px-0">
            <h2 className="text-[14px] md:text-[18px] font-black text-slate-900 tracking-tight">{t.inputTitle}</h2>
            <p className="text-[10px] md:text-[13px] font-medium text-slate-500 mt-0.5 md:mt-1">{t.inputDesc}</p>
          </div>

          <div className="relative z-10 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl p-1.5 md:p-2 mb-3 md:mb-4">
             <textarea 
               ref={promptInputRef}
               value={userPrompt}
               onChange={e => setUserPrompt(e.target.value)}
               placeholder={t.placeholder}
               maxLength={1500} 
               className="w-full min-h-[90px] md:min-h-[120px] p-2.5 md:p-3 bg-transparent text-[12px] md:text-[15px] font-medium text-slate-800 outline-none resize-none placeholder:text-slate-400 custom-scrollbar"
             />
          </div>

          {/* CONTROLS (Compact Row on Mobile) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 md:gap-4 relative z-10 px-1 md:px-0">
            
            <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
              <div className="flex items-center bg-slate-100 p-1 rounded-lg md:rounded-xl border border-slate-200/60 flex-1 sm:flex-none justify-between h-[36px] md:h-[42px]">
                <button onClick={() => setCount(prev => Math.max(1, prev - 1))} className="w-8 md:w-10 h-full flex items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-900 transition-all disabled:opacity-40" disabled={count <= 1}>
                  <Minus size={14} className="md:w-4 md:h-4" strokeWidth={2.5} />
                </button>
                <div className="w-8 md:w-10 text-center flex flex-col justify-center">
                  <span className="text-[12px] md:text-[14px] font-black text-slate-800 leading-none">{count}</span>
                </div>
                <button onClick={() => setCount(prev => Math.min(15, aiData?.remaining ?? 15, prev + 1))} className="w-8 md:w-10 h-full flex items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-900 transition-all disabled:opacity-40" disabled={count >= 15 || count >= (aiData?.remaining ?? 15)}>
                  <Plus size={14} className="md:w-4 md:h-4" strokeWidth={2.5} />
                </button>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-lg md:rounded-xl border border-slate-200/60 flex-1 sm:flex-none h-[36px] md:h-[42px]">
                <button onClick={() => setDifficulty('Easy')} className={`flex-1 sm:flex-none px-2 md:px-3 text-[10px] md:text-[12px] font-bold rounded-md transition-all ${difficulty === 'Easy' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>{t.easy}</button>
                <button onClick={() => setDifficulty('Medium')} className={`flex-1 sm:flex-none px-2 md:px-3 text-[10px] md:text-[12px] font-bold rounded-md transition-all ${difficulty === 'Medium' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>{t.medium}</button>
                <button onClick={() => setDifficulty('Hard')} className={`flex-1 sm:flex-none px-2 md:px-3 text-[10px] md:text-[12px] font-bold rounded-md transition-all ${difficulty === 'Hard' ? 'bg-white text-rose-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>{t.hard}</button>
              </div>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating || wordsNeeded > 0}
              className="w-full sm:w-auto px-4 py-2.5 md:px-6 md:py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 md:gap-2 disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none text-[12px] md:text-[14px]"
            >
              {isGenerating ? <Loader2 className="animate-spin w-4 h-4 md:w-[18px] md:h-[18px]" /> : <Wand2 className="w-4 h-4 md:w-[18px] md:h-[18px]" />}
              {wordsNeeded > 0 ? t.wordsMore.replace('{n}', wordsNeeded.toString()) : (isGenerating ? t.generating : t.generateBtn)}
            </button>

          </div>
        </div>

        {/* 🟢 HORIZONTAL SCROLLING TIPS (MOBILE SAVES SPACE) */}
        <div className="flex flex-nowrap md:grid md:grid-cols-3 gap-2.5 md:gap-4 mb-6 md:mb-8 overflow-x-auto snap-x snap-mandatory custom-scrollbar pb-3 md:pb-0 -mx-3 px-3 md:mx-0 md:px-0">
          <div className="bg-white p-3 md:p-5 rounded-xl md:rounded-2xl border border-slate-200 flex items-start gap-2 md:gap-3 shadow-sm w-[75vw] md:w-auto shrink-0 snap-center">
             <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><Target size={16} className="md:w-5 md:h-5" /></div>
             <div>
               <h3 className="text-[11px] md:text-[14px] font-bold text-slate-800 mb-0.5 md:mb-1">{t.tips.t1.title}</h3>
               <p className="text-[9px] md:text-[12px] text-slate-500 font-medium leading-relaxed">{t.tips.t1.desc}</p>
             </div>
          </div>
          <div className="bg-white p-3 md:p-5 rounded-xl md:rounded-2xl border border-slate-200 flex items-start gap-2 md:gap-3 shadow-sm w-[75vw] md:w-auto shrink-0 snap-center">
             <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0"><Zap size={16} className="md:w-5 md:h-5" /></div>
             <div>
               <h3 className="text-[11px] md:text-[14px] font-bold text-slate-800 mb-0.5 md:mb-1">{t.tips.t2.title}</h3>
               <p className="text-[9px] md:text-[12px] text-slate-500 font-medium leading-relaxed">{t.tips.t2.desc}</p>
             </div>
          </div>
          <div className="bg-white p-3 md:p-5 rounded-xl md:rounded-2xl border border-slate-200 flex items-start gap-2 md:gap-3 shadow-sm w-[75vw] md:w-auto shrink-0 snap-center">
             <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center shrink-0"><Layers size={16} className="md:w-5 md:h-5" /></div>
             <div>
               <h3 className="text-[11px] md:text-[14px] font-bold text-slate-800 mb-0.5 md:mb-1">{t.tips.t3.title}</h3>
               <p className="text-[9px] md:text-[12px] text-slate-500 font-medium leading-relaxed">{t.tips.t3.desc}</p>
             </div>
          </div>
        </div>

        {/* RESULTS */}
        {generatedQuestions.length > 0 && (
          <div className="space-y-3.5 md:space-y-5">
            <div className="flex items-center justify-between px-1">
               <div className="flex items-center gap-1.5 md:gap-2">
                 <Layers size={14} className="text-slate-400 md:w-4 md:h-4" />
                 <h2 className="text-[10px] md:text-sm font-bold text-slate-600 uppercase tracking-widest">
                   {t.resultsTitle} ({generatedQuestions.length})
                 </h2>
               </div>
               <div className="lg:hidden"><AiLimitCard aiData={aiData} /></div>
            </div>
            
            {generatedQuestions.map((q, idx) => (
              <AIQuestionCard key={q.id} q={q} idx={idx} onRemove={removeQuestion} t={t} />
            ))}

            {!isGenerating && (
              <div className="pt-4 md:pt-6 flex justify-center animate-in fade-in duration-500">
                <button onClick={handleScrollToPrompt} className="px-5 py-2.5 md:px-6 md:py-3.5 bg-transparent border-2 border-dashed border-slate-300 text-[11px] md:text-[14px] text-slate-500 font-bold rounded-xl hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-1.5 md:gap-2">
                  <Plus size={14} className="md:w-[18px] md:h-[18px]" /> {t.addMore}
                </button>
              </div>
            )}

            <div ref={bottomRef} className="h-8" />
          </div>
        )}

      </div>

      {/* 🟢 MOBILE FLOATING ACTIONS (Sticky bottom with both Save & Publish) */}
      {mounted && generatedQuestions.length > 0 && createPortal(
        <div className="lg:hidden fixed bottom-5 left-0 right-0 px-3 flex justify-between gap-2 z-[100] animate-in slide-in-from-bottom-10">
          <button 
            onClick={handleSaveToBank} 
            disabled={isSavingToBank || isPublishing || isGenerating} 
            className="flex-1 bg-indigo-50 text-indigo-700 rounded-[1rem] shadow-lg shadow-indigo-600/10 font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-[11px] py-3.5 border border-indigo-200/50"
          >
            {isSavingToBank ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />} 
            {t.saveToBankBtn}
          </button>
          
          <button 
            onClick={handleInitiatePublish} 
            disabled={isPublishing || isSavingToBank || isGenerating} 
            className="flex-1 bg-slate-900 text-white rounded-[1rem] shadow-xl shadow-slate-900/20 font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-[11px] py-3.5 border border-slate-800"
          >
            {isPublishing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} 
            {t.publishBtn}
          </button>
        </div>,
        document.body
      )}

    </div>
  );
}
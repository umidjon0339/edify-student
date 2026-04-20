"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Loader2, CheckCircle2, BookOpen, Minus, Wand2, Trash2, Layers, EyeOff, Eye, Menu, X, ChevronRight, Calculator, Atom, BookA, Globe, FlaskConical, Leaf, Landmark, Bot, Zap, Plus, Database, Gavel, Crown } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import TestConfigurationModal from "@/app/teacher/create/_components/TestConfigurationModal";

// 🟢 NEW MONTHLY LIMIT IMPORTS
import { useMonthlyLimit } from "@/hooks/useMonthlyLimit";
import AiMonthlyLimitCard from "@/app/teacher/create/_components/AiMonthlyLimitCard"; 

// 🟢 ALL UZBEKISTAN SUBJECTS
const UZB_SUBJECTS = [
  { id: "Matematika", icon: Calculator, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { id: "Fizika", icon: Atom, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  { id: "Kimyo", icon: FlaskConical, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-200" },
  { id: "Biologiya", icon: Leaf, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  { id: "Ona tili va adabiyot", icon: BookA, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  { id: "Tarix", icon: Landmark, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { id: "Geografiya", icon: Globe, color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-200" },
  { id: "Informatika", icon: Bot, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
  { id: "Huquqshunoslik", icon: Gavel, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" }
];

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
  const phrases = [
    "Mavzu tahlil qilinmoqda...",
    "Qiyinlik darajasi moslashtirilmoqda...",
    "Savollar va javoblar yozilmoqda...",
    "Formula va chizmalar tekshirilmoqda..."
  ];
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }, 2500); 
    return () => clearInterval(interval);
  }, [isVisible, phrases.length]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-[320px] md:max-w-md bg-white/90 backdrop-blur-2xl rounded-[1.5rem] md:rounded-3xl border border-blue-100/50 shadow-2xl p-6 md:p-8 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-blue-500/20 rounded-full blur-[80px] animate-pulse"></div>
            <div className="absolute bottom-[-30%] right-[-20%] w-[80%] h-[80%] bg-indigo-500/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "1s" }}></div>
            <div className="relative mb-6 md:mb-8 mt-2 md:mt-4">
              <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-indigo-400 rounded-full blur-xl opacity-40" />
              <div className="relative w-20 h-20 md:w-24 md:h-24 bg-white/80 backdrop-blur-md rounded-2xl md:rounded-3xl border border-white flex items-center justify-center shadow-xl">
                <Bot size={36} className="text-blue-600 animate-bounce md:w-11 md:h-11" style={{ animationDuration: "2s" }} />
                <Sparkles size={16} className="absolute -top-2 -right-2 text-amber-400 animate-pulse md:w-5 md:h-5 md:-top-3 md:-right-3" />
              </div>
            </div>
            <h3 className="text-lg md:text-xl font-black text-slate-800 mb-1 md:mb-2 relative z-10 tracking-tight text-center">AI Studiya ishlamoqda</h3>
            <div className="h-5 md:h-6 relative z-10 overflow-hidden flex items-center justify-center w-full">
              <motion.p key={phraseIndex} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.4 }} className="text-[12px] md:text-[14px] font-medium text-slate-500 absolute text-center w-full">{phrases[phraseIndex]}</motion.p>
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
    <span className="break-words leading-relaxed">
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

const AIQuestionCard = ({ q, idx, onRemove }: { q: AIQuestion, idx: number, onRemove: (id: string) => void }) => {
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
    <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-3xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-blue-200 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 relative group mb-4">
      
      <div className="flex justify-between items-start mb-3">
        <span className="bg-[#EEF2FF] text-blue-600 text-[10px] md:text-[11px] font-black px-3 py-1.5 rounded-lg md:rounded-xl uppercase tracking-widest flex items-center gap-1.5 shrink-0">
          <Sparkles size={12} className="md:w-3.5 md:h-3.5" /> Q{idx + 1}
        </span>

        <div className="flex items-center border border-slate-200 rounded-lg md:rounded-xl p-0.5 md:p-1 shrink-0 bg-white">
          <button onClick={() => setShowOptions(!showOptions)} className="text-slate-400 hover:text-slate-700 p-1 md:p-1.5 rounded-md transition-colors"><Eye size={14} className="md:w-4 md:h-4" /></button>
          <div className="w-px h-3.5 md:h-4 bg-slate-200 mx-0.5"></div>
          <button onClick={() => onRemove(q.id)} className="text-slate-400 hover:text-rose-500 p-1 md:p-1.5 rounded-md transition-colors"><Trash2 size={14} className="md:w-4 md:h-4" /></button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <span className="bg-slate-50 text-slate-500 text-[9px] md:text-[10px] font-bold px-2.5 py-1.5 rounded-lg md:rounded-xl uppercase tracking-widest flex items-center border border-slate-100/80 max-w-full min-w-0">
            <Layers size={10} className="shrink-0 mr-1.5 md:w-3 md:h-3" /> 
            <span className="truncate max-w-[200px] md:max-w-[300px]">{q.subtopic}</span>
        </span>
      </div>
      
      <div className="font-semibold text-[14px] md:text-[15px] text-slate-900 mb-4 md:mb-5 leading-snug md:leading-relaxed">
        <FormattedText text={getText(q.question)} />
      </div>
      
      {showOptions && (
        <div className="flex flex-col gap-2 mb-2">
          {Object.entries(q.options).map(([key, value]) => {
            const isCorrect = q.answer === key;
            return (
              <div key={key} className={`flex items-center p-3 md:p-3.5 rounded-[1rem] md:rounded-2xl border transition-all ${isCorrect ? 'bg-[#EEF2FF] border-blue-300/60' : 'bg-white border-slate-100/80 hover:border-slate-200'}`}>
                <div className={`w-6 h-6 md:w-7 md:h-7 rounded-[0.4rem] md:rounded-lg flex items-center justify-center text-[11px] md:text-[12px] font-black mr-3 md:mr-3.5 shrink-0 transition-colors ${isCorrect ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20' : 'bg-slate-50 text-slate-400 border border-slate-200/60'}`}>{key}</div>
                <div className={`text-[13px] md:text-[14px] font-medium pt-0.5 break-words overflow-hidden ${isCorrect ? 'text-blue-950' : 'text-slate-600'}`}>
                  <FormattedText text={getText(value)} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {getText(q.explanation).trim().length > 0 && (
        <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-slate-50 flex justify-start">
          <button onClick={() => setShowExplanation(!showExplanation)} className={`flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-[11px] md:text-[12px] font-bold transition-all duration-300 ${showExplanation ? 'bg-blue-100 text-blue-700 shadow-inner' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200/60 shadow-sm'}`}>
            <Sparkles size={12} className={`md:w-3.5 md:h-3.5 ${showExplanation ? "text-blue-500" : "text-slate-400"}`} />
            {showExplanation ? "Yechimni yashirish" : "AI Yechim"}
          </button>
        </div>
      )}
      
      {showExplanation && getText(q.explanation).trim().length > 0 && (
        <div className="bg-slate-50/80 border border-slate-100 p-3.5 md:p-4 rounded-xl md:rounded-2xl mt-3 md:mt-4 animate-in fade-in slide-in-from-top-2">
          <p className="text-[10px] md:text-[11px] font-black text-blue-400 uppercase tracking-widest mb-1.5 md:mb-2 flex items-center gap-1.5"><Sparkles size={12} className="text-blue-400 md:w-3.5 md:h-3.5" /> AI Yechim Mantiqi</p>
          <p className="text-[12px] md:text-[13px] text-slate-700 leading-relaxed font-medium">
            <FormattedText text={getText(q.explanation)} />
          </p>
        </div>
      )}
    </div>
  );
};


export default function GeneralAIGeneratorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // 🟢 NEW: Fetching the monthly limits instead of daily
  const aiData = useMonthlyLimit(); 

  const difficulties = [
    { id: "easy", label: "Oson", color: "hover:border-emerald-400 hover:bg-emerald-50", active: "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20" },
    { id: "medium", label: "O'rtacha", color: "hover:border-blue-400 hover:bg-blue-50", active: "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20" },
    { id: "hard", label: "Murakkab", color: "hover:border-indigo-400 hover:bg-indigo-50", active: "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20" },
    { id: "olympiad", label: "Olimpiada", color: "hover:border-purple-400 hover:bg-purple-50", active: "border-purple-500 bg-purple-50 text-purple-700 ring-2 ring-purple-500/20" }
  ];

  const [selectedSubject, setSelectedSubject] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [difficulty, setDifficulty] = useState("medium"); 
  const [count, setCount] = useState(5);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<AIQuestion[]>([]);
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingToBank, setIsSavingToBank] = useState(false); 
  const [testTitle, setTestTitle] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [limitModalMessage, setLimitModalMessage] = useState(""); // 🟢 NEW
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isReadyToGenerate = selectedSubject && topicInput.trim().length > 2;

  useEffect(() => {
    if (generatedQuestions.length > 0 && !isGenerating) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [generatedQuestions, isGenerating]);

  const handleGenerate = async () => {
    if (!isReadyToGenerate) return toast.error("Iltimos, fan va mavzuni kiriting.");

    // 🟢 NEW: Pre-check monthly limits
    if (!aiData.isUnlimited && aiData.remaining < count) {
      setLimitModalMessage(`Sizda oylik limitdan ${aiData.remaining} ta savol qoldi. Iltimos so'ralayotgan miqdorni kamaytiring yoki tarifni oshiring.`);
      setIsLimitModalOpen(true);
      return; 
    }

    setIsGenerating(true);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);

    try {
      const response = await fetch("/teacher/create/ai/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid, 
          subject: selectedSubject,   
          topic: topicInput,
          difficulty,
          count,
          language: "uz"
        }),
      });

      const data = await response.json();
      
      // 🟢 NEW: Gatekeeper error handling
      if (!response.ok) {
        if (data.code === 'LIMIT_REACHED') {
          setLimitModalMessage("Oylik AI limitingiz yetarli emas. Tarifingizni oshiring yoki keyingi oyni kuting.");
          setIsLimitModalOpen(true);
          return;
        }
        throw new Error(data.error);
      }

      let diffVal = 2;
      if (difficulty === "easy") diffVal = 1;
      else if (difficulty === "medium") diffVal = 2;
      else if (difficulty === "hard") diffVal = 3;
      else if (difficulty === "olympiad") diffVal = 4;

      const enrichedQuestions: AIQuestion[] = data.questions.map((q: any) => ({
        ...q, 
        id: `tq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        subject: selectedSubject,
        topic: "Abiturient",
        chapter: "Umumiy",
        subtopic: topicInput,
        difficultyId: diffVal, 
        uiDifficulty: difficulty
      }));

      setGeneratedQuestions(prev => [...prev, ...enrichedQuestions]);
      toast.success(`${count} savol qo'shildi!`);
    } catch (error: any) {
      toast.error(error.message || "Xatolik yuz berdi.");
    } finally {
      setIsGenerating(false);
    }
  };

  const removeQuestion = (idToDelete: string) => setGeneratedQuestions(prev => prev.filter(q => q.id !== idToDelete));
  
  const handleSaveToBank = async () => {
    if (generatedQuestions.length === 0) return toast.error("Oldin savol yarating.");
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
          subject: q.subject,
          topic: q.topic,
          chapter: q.chapter,
          subtopic: q.subtopic,
          creationMethod: "general_ai", 
          difficulty: q.uiDifficulty.toLowerCase(),
          difficultyId: q.difficultyId, 
          tags: ["general_ai", "smart"],
          language: ["uz"],
          solutions: [], 
          uploadedAt: currentTimestampString, 
        };
        batch.set(questionRef, { ...finalQ, createdAt: serverTimestamp() });
      }

      await batch.commit();
      toast.success("Savollar bazangizga muvaffaqiyatli saqlandi!");
      setGeneratedQuestions([]);
      router.push('/teacher/create/my_questions'); 
    } catch (error) {
      console.error("Save to bank error:", error);
      toast.error("Bazaga saqlashda xatolik yuz berdi.");
    } finally {
      setIsSavingToBank(false);
    }
  };

  const handleInitiatePublish = () => {
    if (generatedQuestions.length === 0) return toast.error("Oldin savol yarating.");
    setIsTitleModalOpen(true); 
  };
  
  const handleTitleSubmit = () => {
    if (!testTitle.trim()) return toast.error("Test nomini kiriting.");
    setIsTitleModalOpen(false);
    setIsConfigModalOpen(true); 
  };

  const handleFinalPublish = async (testSettings: any) => {
    if (!user) return;
    setIsPublishing(true);
    const batch = writeBatch(db);
    const finalQuestionsToSave = [];

    const uniqueSubjects = [...new Set(generatedQuestions.map(q => q.subject))];
    const uniqueSubtopics = [...new Set(generatedQuestions.map(q => q.subtopic))];

    const finalSubjectName = uniqueSubjects.length === 1 ? uniqueSubjects[0] : "Aralash fanlar";
    const finalSubtopicName = uniqueSubtopics.length === 1 ? uniqueSubtopics[0] : "Aralash mavzular";

    const currentTimestampString = new Date().toISOString();

    for (const q of generatedQuestions) {
      const secureFirebaseId = doc(collection(db, "teacher_questions")).id;
      const finalQ = {
        ...q,
        id: `tq_${secureFirebaseId}`, 
        creatorId: user.uid, 
        number: "", 
        track: "general_ai",
        subject: q.subject,           
        topic: q.topic,               
        chapter: q.chapter,           
        subtopic: q.subtopic,
        creationMethod: "general_ai",         
        difficulty: q.uiDifficulty.toLowerCase(),
        difficultyId: q.difficultyId, 
        tags: ["general_ai", "smart"],
        language: ["uz"], 
        solutions: [], 
        uploadedAt: currentTimestampString, 
      };
      
      finalQuestionsToSave.push(finalQ);
      batch.set(doc(db, "teacher_questions", finalQ.id), { ...finalQ, createdAt: serverTimestamp() }); 
    }

    batch.set(doc(collection(db, "custom_tests")), {
      teacherId: user.uid,
      title: testTitle,
      track: "general_ai",
      subjectName: finalSubjectName,
      topicName: "Erkin Mavzu", 
      chapterName: "Umumiy",
      subtopicName: finalSubtopicName,
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
      toast.success("Test muvaffaqiyatli nashr qilindi!");
      router.push("/teacher/dashboard");
    } catch (error) {
      toast.error("Nashr qilishda xatolik.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex h-[100dvh] bg-[#FAFAFA] overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      
      <AiThinkingModal isVisible={isGenerating} />

      {/* 🟢 SUBJECT SELECTION MODAL */}
      {mounted && createPortal(
        <AnimatePresence>
          {isSubjectModalOpen && (
            <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSubjectModalOpen(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white rounded-t-[2rem] sm:rounded-3xl w-full max-w-3xl h-auto max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden z-10">
                
                <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                  <div>
                    <h3 className="text-[18px] md:text-xl font-black text-slate-900">Fanni tanlang</h3>
                    <p className="text-slate-500 text-[11px] md:text-sm mt-0.5 md:mt-1">Barcha fanlar ruyxati</p>
                  </div>
                  <button onClick={() => setIsSubjectModalOpen(false)} className="p-1.5 md:p-2 bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"><X size={18} className="md:w-5 md:h-5"/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#FAFAFA] custom-scrollbar grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-4">
                  {UZB_SUBJECTS.map((s) => {
                    const isSelected = selectedSubject === s.id;
                    const Icon = s.icon;
                    return (
                      <button 
                        key={s.id} 
                        onClick={() => { setSelectedSubject(s.id); setIsSubjectModalOpen(false); }}
                        className={`relative flex flex-col items-center justify-center p-3.5 md:p-5 rounded-[1rem] md:rounded-2xl border transition-all duration-300 overflow-hidden group text-center ${isSelected ? `bg-white ${s.border} ring-2 ring-blue-500/20 shadow-md` : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm active:scale-95'}`}
                      >
                        <div className={`p-2.5 md:p-3 rounded-xl mb-2.5 md:mb-3 transition-colors ${isSelected ? s.bg : 'bg-slate-50 group-hover:bg-white'}`}>
                          <Icon size={24} className={`md:w-7 md:h-7 transition-colors ${isSelected ? s.color : 'text-slate-400 group-hover:text-slate-600'}`} strokeWidth={isSelected ? 2.5 : 2} />
                        </div>
                        <span className={`text-[12px] md:text-[14px] font-bold capitalize leading-tight ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                          {s.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 🟢 NEW PREMIUM LIMIT MODAL */}
      <AnimatePresence>
        {isLimitModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsLimitModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-[1.5rem] md:rounded-3xl p-6 md:p-8 w-full max-w-[320px] md:max-w-sm shadow-2xl z-10 flex flex-col items-center text-center">
              <button onClick={() => setIsLimitModalOpen(false)} className="absolute top-3 right-3 md:top-4 md:right-4 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"><X size={18} className="md:w-5 md:h-5" /></button>
              
              <div className="w-14 h-14 md:w-16 md:h-16 bg-indigo-50 rounded-[1rem] md:rounded-2xl flex items-center justify-center mb-4 border border-indigo-100 shadow-inner">
                <Crown size={28} className="text-amber-500" />
              </div>
              
              <h3 className="text-lg md:text-xl font-black text-slate-900 mb-2">Premium Xususiyat</h3>
              <p className="text-[13px] md:text-[14px] text-slate-500 mb-6 font-medium leading-relaxed">
                {limitModalMessage}
              </p>
              
              <div className="w-full flex flex-col gap-2">
                <button onClick={() => router.push('/teacher/subscription')} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-[13px] md:text-[14px] font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  Tariflarni ko'rish <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
                <button onClick={() => setIsLimitModalOpen(false)} className="w-full py-3 md:py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[13px] md:text-[14px] font-bold rounded-xl transition-colors active:scale-[0.98]">
                  Orqaga qaytish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TITLE SAVE MODAL */}
      {mounted && createPortal(
        <AnimatePresence>
          {isTitleModalOpen && (
            <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsTitleModalOpen(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-[1.5rem] md:rounded-3xl p-5 md:p-8 w-full max-w-[320px] md:max-w-md shadow-2xl border border-slate-100 z-10">
                <h3 className="text-[18px] md:text-xl font-black text-slate-900 mb-1.5 md:mb-2">Test nomini kiriting</h3>
                <p className="text-[12px] md:text-[14px] text-slate-500 mb-5 md:mb-6 font-medium">Yaratilgan testni saqlashdan oldin nom bering.</p>
                <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} placeholder="Masalan: Olimpiada tayyorgarligi" className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] md:text-[14px] font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all mb-6 md:mb-8" autoFocus/>
                <div className="flex flex-col-reverse sm:flex-row gap-2 md:gap-3">
                  <button onClick={() => setIsTitleModalOpen(false)} className="w-full px-4 py-2.5 md:py-3.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-[12px] md:text-[14px]">Bekor qilish</button>
                  <button onClick={handleTitleSubmit} className="w-full px-4 py-2.5 md:py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 md:gap-2 text-[12px] md:text-[14px]">
                    Keyingi Qadam <ChevronRight size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5}/>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {mounted && createPortal(
        <TestConfigurationModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={handleFinalPublish} questionCount={generatedQuestions.length} testTitle={testTitle} isSaving={isPublishing} />,
        document.body
      )}

      {/* 🟢 TOP BAR (Mobile) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-[60px] bg-white/90 backdrop-blur-xl border-b border-slate-200 z-[90000] flex items-center justify-between px-3 shadow-sm">
        <button onClick={() => router.push('/teacher/create')} className="p-2 -ml-1 text-slate-500 rounded-lg"><ArrowLeft size={18} /></button>
        <span className="font-black text-slate-800 text-[14px]">AI Studiya</span>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 -mr-1 bg-blue-50 text-blue-600 rounded-lg shadow-sm border border-blue-100/50"><Menu size={18} /></button>
      </div>

      {mounted && (
        <>
          <AnimatePresence>
            {isSidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="lg:hidden fixed top-[60px] left-0 right-0 bottom-0 bg-slate-900/60 backdrop-blur-sm z-[99998]" onClick={() => setIsSidebarOpen(false)} />}
          </AnimatePresence>
          
          <aside className={`fixed lg:relative top-[60px] lg:top-0 left-0 w-full sm:w-[400px] h-[calc(100dvh-60px)] lg:h-[100dvh] bg-white border-r border-slate-200 shadow-2xl lg:shadow-none z-[99998] lg:z-10 transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
            <div className="flex justify-between items-center p-3 md:p-5 border-b border-slate-100 bg-white shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-2 md:gap-3">
                <button onClick={() => router.push('/teacher/create')} className="hidden lg:flex p-1.5 -ml-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all"><ArrowLeft size={18} /></button>
                <h2 className="font-bold text-[14px] md:text-[16px] text-slate-900 tracking-tight flex items-center gap-2"><Layers size={16} className="text-blue-600 md:w-[18px] md:h-[18px]"/> Smart AI Studiya</h2>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1.5 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-full border border-slate-200 transition-colors"><X size={16} strokeWidth={2.5}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 md:p-5 pb-24 md:pb-32 flex flex-col space-y-4 md:space-y-7 relative bg-white">
              
              <div className="space-y-2 md:space-y-3">
                <label className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1 block">1. Fanni tanlang</label>
                <button 
                  onClick={() => setIsSubjectModalOpen(true)}
                  className="w-full bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-400 p-3 md:p-4 rounded-xl text-left transition-all group flex items-center justify-between shadow-sm"
                >
                  {selectedSubject ? (
                    <div className="flex items-center gap-2.5 md:gap-3">
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center ${UZB_SUBJECTS.find(s => s.id === selectedSubject)?.bg || "bg-slate-100"}`}>
                        {(() => {
                          const subj = UZB_SUBJECTS.find(s => s.id === selectedSubject);
                          const Icon = subj ? subj.icon : BookOpen;
                          return <Icon size={16} className={`md:w-5 md:h-5 ${subj?.color || "text-slate-600"}`} />;
                        })()}
                      </div>
                      <div>
                        <div className="text-[9px] md:text-[11px] font-black text-blue-600 uppercase tracking-widest mb-0.5">Tanlangan Fan</div>
                        <div className="text-[12px] md:text-[14px] font-bold text-slate-800 capitalize leading-snug">{selectedSubject}</div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[12px] md:text-[14px] font-bold text-slate-400 pl-1 md:pl-2">Fanni tanlang...</span>
                  )}
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors md:w-[18px] md:h-[18px]" />
                </button>
              </div>

              <div className={`space-y-2 md:space-y-3 ${!selectedSubject ? 'opacity-40 pointer-events-none grayscale transition-all' : 'transition-all'}`}>
                <label className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1 block">
                  2. O'quv mavzusi
                </label>
                <div className="relative">
                  <textarea 
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="Mavzu nomini yozing... (masalan: Kvadrat ildizlar)"
                    className="w-full bg-slate-50 border border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-3 md:p-4 rounded-xl text-[13px] md:text-[14px] font-medium text-slate-800 outline-none transition-all shadow-sm min-h-[80px] md:min-h-[100px] resize-none custom-scrollbar"
                  />
                </div>
              </div>

              <div className={`space-y-2 md:space-y-3 ${!isReadyToGenerate ? 'opacity-40 pointer-events-none grayscale transition-all' : 'transition-all'}`}>
                <label className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1 block">3. Qiyinlik darajasi</label>
                <div className="grid grid-cols-2 gap-1.5 md:gap-2 p-1 md:p-1.5 bg-slate-50 rounded-lg md:rounded-xl border border-slate-200/60 shadow-inner">
                  {difficulties.map(diff => {
                    const isSelected = difficulty === diff.id;
                    return (
                      <button 
                        key={diff.id} onClick={() => setDifficulty(diff.id)}
                        className={`py-1.5 md:py-2.5 px-1 md:px-2 rounded-md md:rounded-lg text-[10px] md:text-[13px] font-bold transition-all text-center ${isSelected ? diff.active : `bg-white border border-slate-200 text-slate-600 ${diff.color}`}`}
                      >
                        {diff.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className={`space-y-2 md:space-y-3 ${!isReadyToGenerate ? 'opacity-40 pointer-events-none grayscale transition-all' : 'transition-all'}`}>
                <label className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1 block">4. Savollar soni</label>
                <div className="flex items-center bg-slate-50 p-1 rounded-lg md:rounded-xl border border-slate-200/60 shadow-inner h-[36px] md:h-[46px]">
                  <button onClick={() => setCount(prev => Math.max(1, prev - 1))} className="w-8 md:w-10 h-full flex items-center justify-center rounded-md md:rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all disabled:opacity-40" disabled={count <= 1}>
                    <Minus size={14} className="md:w-4 md:h-4" strokeWidth={2.5} />
                  </button>
                  <div className="flex-1 text-center flex items-center justify-center flex-col">
                    <span className="text-[12px] md:text-[15px] font-black text-slate-800 leading-none">{count}</span>
                  </div>
                  {/* 🟢 NEW: Disable Plus button if count exceeds monthly limit */}
                  <button 
                    onClick={() => setCount(prev => Math.min(15, aiData?.isUnlimited ? 15 : (aiData?.remaining ?? 15), prev + 1))} 
                    className="w-8 md:w-10 h-full flex items-center justify-center rounded-md md:rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all disabled:opacity-40" 
                    disabled={count >= 15 || (!aiData?.isUnlimited && count >= (aiData?.remaining ?? 15))}
                  >
                    <Plus size={14} className="md:w-4 md:h-4" strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* 🟢 NEW: Show warning if running low on monthly limits */}
              {aiData && !aiData.isUnlimited && aiData.remaining < 15 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg md:rounded-xl p-2 md:p-3 flex gap-2 md:gap-3 items-start">
                  <Zap size={14} className="text-amber-500 shrink-0 mt-0.5 md:w-4 md:h-4" />
                  <p className="text-[9px] md:text-[11px] font-bold text-amber-700 leading-snug">
                    Sizda oylik limitdan faqatgina <span className="font-black text-amber-900">{aiData.remaining} ta</span> savol qoldi.
                  </p>
                </div>
              )}
              
            </div>

            {/* 🟢 STICKY BOTTOM GENERATE BUTTON */}
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 bg-gradient-to-t from-white via-white to-white/0 pt-8 md:pt-10 z-20">
              <button 
                onClick={() => {
                  // 🟢 NEW: Pre-check monthly limits
                  if (!aiData.isUnlimited && aiData.remaining < count) {
                    setLimitModalMessage(`Sizda ${aiData.remaining} ta savol yaratish uchun limit qoldi. Iltimos so'ralayotgan miqdorni kamaytiring yoki tarifni oshiring.`);
                    setIsLimitModalOpen(true);
                    return; 
                  }
                  handleGenerate();
                }}
                disabled={isGenerating || !isReadyToGenerate} 
                className="w-full py-3.5 md:py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-white rounded-xl md:rounded-2xl font-black flex items-center justify-center gap-1.5 md:gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20 disabled:shadow-none text-[13px] md:text-[15px] border-b-[3px] md:border-b-4 border-blue-800 active:border-b-0"
              >
                {isGenerating ? <Loader2 className="animate-spin md:w-[18px] md:h-[18px]" size={16} /> : <Wand2 size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5}/>} 
                {isGenerating ? "Yaratilmoqda..." : "Savol Yaratish"}
              </button>
            </div>
          </aside>
        </>
      )}

      <main className="flex-1 overflow-y-auto custom-scrollbar relative w-full pt-[60px] lg:pt-0 pb-24 lg:pb-0">
        
        <div className="hidden lg:flex sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-8 py-3 justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-[16px] font-bold text-slate-900 tracking-tight">AI Qoralama</h1>
            {generatedQuestions.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-200/60 animate-in fade-in">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-[11px] font-bold text-blue-700 tracking-wide uppercase">{generatedQuestions.length} Savol</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* 🟢 NEW: AiMonthlyLimitCard Replaces the old card */}
            <AiMonthlyLimitCard aiData={aiData} />
            
            <button 
              onClick={handleSaveToBank} 
              disabled={isPublishing || isSavingToBank || isGenerating || generatedQuestions.length === 0} 
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 text-[13px]"
            >
              {isSavingToBank ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />} 
              <span>Bazaga Saqlash</span>
            </button>

            <button onClick={handleInitiatePublish} disabled={isPublishing || isSavingToBank || isGenerating || generatedQuestions.length === 0} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 text-[13px]">
               <CheckCircle2 size={16} /> Nashr qilish
            </button>
          </div>
        </div>

        <div className="max-w-[800px] mx-auto p-3 md:p-8 space-y-4 md:space-y-6">
          {generatedQuestions.length === 0 && !isGenerating ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-[60vh] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-[1.5rem] bg-white lg:mt-6 p-4 md:p-6 text-center shadow-sm mx-1 lg:mx-0">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-3 md:mb-4 border border-blue-100"><Sparkles size={24} className="text-blue-400 md:w-6 md:h-6" /></div>
              <p className="font-bold text-slate-600 text-[14px] md:text-[16px]">Yaratishga tayyor.</p>
              <p className="text-[11px] md:text-[14px] text-slate-400 mt-1 max-w-[300px]">Chap tomondan fanni tanlang va mavzu nomini yozib savollar yarating.</p>
            </motion.div>
          ) : (
            <div className="space-y-4 md:space-y-6 lg:pb-12">
              <div className="lg:hidden flex items-center justify-between mb-1 px-1">
                <span className="text-[10px] md:text-[12px] font-bold text-slate-500 uppercase tracking-widest">{generatedQuestions.length} ta savol</span>
                {/* 🟢 NEW: Mobile Monthly Limit Card */}
                <AiMonthlyLimitCard aiData={aiData} />
              </div>

              {generatedQuestions.map((q, idx) => (
                <AIQuestionCard key={q.id} q={q} idx={idx} onRemove={removeQuestion} />
              ))}
              
              {isGenerating && (
                <div className="bg-white p-4 md:p-5 rounded-[1.25rem] md:rounded-2xl border border-blue-200 shadow-sm relative overflow-hidden animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/50 to-transparent w-[200%] animate-[shimmer_2s_infinite]" />
                  <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6"><div className="w-16 h-5 md:w-20 md:h-6 bg-slate-100 rounded-full" /><div className="w-24 h-5 md:w-32 md:h-6 bg-slate-50 rounded-full" /></div>
                  <div className="w-3/4 h-4 md:h-5 bg-slate-100 rounded-lg mb-4 md:mb-6" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">{[1, 2, 3, 4].map(i => <div className="w-full h-10 md:h-12 bg-slate-50 rounded-xl border border-slate-100" key={i} />)}</div>
                </div>
              )}

              {!isGenerating && generatedQuestions.length > 0 && (
                <div className="py-8 md:py-10 flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
                  <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-2.5 md:mb-3"><Layers size={16} className="md:w-[18px] md:h-[18px]" /></div>
                  <p className="text-[13px] md:text-[14px] font-bold text-slate-600">Yana savol qo'shmoqchimisiz?</p>
                  <p className="text-[11px] md:text-[13px] text-slate-400 mt-1 max-w-[280px] mb-4 md:mb-5">Mavzuni o'zgartirib 'Yaratish' tugmasini yana bir bor bosing.</p>
                </div>
              )}

              <div ref={bottomRef} className="h-8" />
            </div>
          )}
        </div>
      </main>

      {/* 🟢 MOBILE FLOATING ACTIONS */}
      {mounted && !isSidebarOpen && generatedQuestions.length > 0 && createPortal(
        <div className="lg:hidden fixed bottom-6 left-0 right-0 px-4 flex items-center gap-3 z-[100] animate-in slide-in-from-bottom-10">
          
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="w-[52px] h-[52px] bg-[#0F172A] text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform shrink-0 relative overflow-hidden"
          >
             <span className="text-[18px] font-black tracking-widest relative z-10">N</span>
             <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent opacity-50"></div>
          </button>
          
          <div className="flex-1 flex gap-2">
            <button 
              onClick={handleSaveToBank} 
              disabled={isSavingToBank || isPublishing || isGenerating} 
              className="flex-1 bg-[#EEF2FF] text-indigo-600 rounded-[1.25rem] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform text-[13px] h-[52px]"
            >
              {isSavingToBank ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />} 
              Saqlash
            </button>
            
            <button 
              onClick={handleInitiatePublish} 
              disabled={isPublishing || isSavingToBank || isGenerating} 
              className="flex-1 bg-[#0F172A] text-white rounded-[1.25rem] shadow-lg shadow-slate-900/20 font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform text-[13px] h-[52px]"
            >
              {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} 
              Nashr Qilish
            </button>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
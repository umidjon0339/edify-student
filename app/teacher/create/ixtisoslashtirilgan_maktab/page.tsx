"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Loader2, CheckCircle2, BookOpen, Trash2, Layers, EyeOff, Eye, Menu, X, ChevronRight, BookMarked, Search, Bot, Zap, Plus, GraduationCap, Database, Crown } from "lucide-react";
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

import IxtisosControlPanel from "./_components/IxtisosControlPanel";
import structureMap from "@/data/ixtisoslashtirilgan_maktab/structure.json";

interface AIQuestion { 
  id: string; uiDifficulty: string; 
  question: { uz: string; ru: string; en: string }; 
  options: { A: { uz: string; ru: string; en: string }; B: { uz: string; ru: string; en: string }; C: { uz: string; ru: string; en: string }; D: { uz: string; ru: string; en: string }; }; 
  answer: string; explanation: { uz: string; ru: string; en: string }; 
  subject: string; topic: string; chapter: string; subtopic: string; difficultyId: number; 
}

const formatSubjectName = (rawSubject: string) => {
  if (!rawSubject) return "";
  const cleanedStr = rawSubject.replace(/-/g, " ");
  return cleanedStr.charAt(0).toUpperCase() + cleanedStr.slice(1).toLowerCase();
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
          try { return <span key={index} dangerouslySetInnerHTML={{ __html: katex.renderToString(math, { displayMode: true, throwOnError: false, strict: false }) }} className="block my-2 md:my-3 text-center overflow-x-auto custom-scrollbar" />; } 
          catch (e) { return <span key={index} className="text-rose-500 font-mono text-[11px] md:text-[13px] bg-rose-50 px-1 rounded">{part}</span>; }
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).trim();
          try { return <span key={index} dangerouslySetInnerHTML={{ __html: katex.renderToString(math, { displayMode: false, throwOnError: false, strict: false }) }} className="px-0.5 inline-block" />; } 
          catch (e) { return <span key={index} className="text-rose-500 font-mono text-[11px] md:text-[13px] bg-rose-50 px-1 rounded">{part}</span>; }
        }
        return <span key={index}>{part.split('\n').map((line, i, arr) => (<span key={i}>{line}{i < arr.length - 1 && <br />}</span>))}</span>;
      })}
    </span>
  );
};

const AiThinkingModal = ({ isVisible }: { isVisible: boolean }) => {
  const phrases = ["Mavzu tahlil qilinmoqda...", "Konteks o'qilmoqda...", "Ixtisoslashtirilgan mantiq tuzilmoqda...", "Qiyinlik darajasi moslashtirilmoqda...", "Savollar yozilmoqda..."];
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
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-[320px] md:max-w-md bg-white/90 backdrop-blur-2xl rounded-[1.5rem] md:rounded-3xl border border-amber-100/50 shadow-2xl p-6 md:p-8 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-amber-500/20 rounded-full blur-[80px] animate-pulse"></div>
            <div className="absolute bottom-[-30%] right-[-20%] w-[80%] h-[80%] bg-orange-500/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "1s" }}></div>
            <div className="relative mb-6 md:mb-8 mt-2 md:mt-4">
              <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-tr from-amber-500 to-orange-400 rounded-full blur-xl opacity-40" />
              <div className="relative w-20 h-20 md:w-24 md:h-24 bg-white/80 backdrop-blur-md rounded-2xl md:rounded-3xl border border-white flex items-center justify-center shadow-xl">
                <Bot size={36} className="text-amber-600 animate-bounce md:w-11 md:h-11" style={{ animationDuration: "2s" }} />
                <Sparkles size={16} className="absolute -top-2 -right-2 text-orange-400 animate-pulse md:w-5 md:h-5 md:-top-3 md:-right-3" />
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
    <div className="bg-white p-3.5 md:p-5 rounded-[1.25rem] md:rounded-3xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-amber-200 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 relative group">
      <div className="flex justify-between items-center gap-2 mb-3 md:mb-5 md:pb-4 md:border-b border-slate-100">
        <div className="flex items-center flex-wrap gap-1.5 md:gap-2 flex-1 min-w-0">
          <span className="bg-amber-50 text-amber-700 text-[9px] md:text-[11px] font-black px-2 md:px-3 py-1 md:py-1.5 rounded-md md:rounded-xl uppercase tracking-widest flex items-center gap-1 md:gap-1.5 border border-amber-100/50 shrink-0">
            <Sparkles size={10} className="text-amber-500 md:w-3 md:h-3" /> Q{idx + 1}
          </span>
          <span className="bg-slate-50 text-slate-500 text-[9px] md:text-[11px] font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-md md:rounded-xl uppercase tracking-widest flex items-center border border-slate-200/60 max-w-full min-w-0">
             <Layers size={10} className="shrink-0 mr-1 md:mr-1.5 md:w-3 md:h-3" /> 
             <span className="truncate">{q.chapter}</span> <span className="text-slate-300 mx-1 md:mx-1.5 shrink-0">/</span> <span className="truncate">{q.subtopic}</span>
          </span>
          <span className="hidden sm:inline-flex bg-slate-900 text-white text-[10px] md:text-[11px] font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-md md:rounded-xl uppercase tracking-widest shadow-sm shrink-0">{q.uiDifficulty}</span>
        </div>

        <div className="flex items-center bg-slate-50 md:bg-transparent border border-slate-200 md:border-transparent rounded-lg md:rounded-none p-0.5 md:p-0 shrink-0">
          <button onClick={() => setShowOptions(!showOptions)} className="text-slate-400 hover:text-slate-900 hover:bg-white md:hover:bg-slate-100 p-1 md:p-2 rounded-md md:rounded-xl transition-colors"><Eye size={14} className="md:w-[18px] md:h-[18px]" /></button>
          
          {getText(q.explanation).trim().length > 0 && (
            <>
              <div className="w-px h-3 md:h-5 bg-slate-200 mx-0.5 md:mx-1"></div>
              <button onClick={() => setShowExplanation(!showExplanation)} className={`p-1 md:p-2 rounded-md md:rounded-xl transition-colors ${showExplanation ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:text-amber-600 hover:bg-white md:hover:bg-amber-50'}`}><BookOpen size={14} className="md:w-[18px] md:h-[18px]" /></button>
            </>
          )}

          <div className="w-px h-3 md:h-5 bg-slate-200 mx-0.5 md:mx-1"></div>
          <button onClick={() => onRemove(q.id)} className="text-slate-400 hover:text-red-600 hover:bg-white md:hover:bg-red-50 p-1 md:p-2 rounded-md md:rounded-xl transition-colors"><Trash2 size={14} className="md:w-[18px] md:h-[18px]" /></button>
        </div>
      </div>
      
      <div className="font-semibold text-[12px] md:text-[15.5px] text-slate-900 mb-3 md:mb-6 leading-snug md:leading-relaxed"><FormattedText text={getText(q.question)} /></div>
      
      {showOptions && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-3 mb-1 md:mb-2">
          {Object.entries(q.options).map(([key, value]) => {
            const isCorrect = q.answer === key;
            return (
              <div key={key} className={`flex items-start p-2 md:p-3.5 rounded-xl md:rounded-2xl border-2 transition-all ${isCorrect ? 'bg-amber-50 border-amber-300/50' : 'bg-slate-50/50 md:bg-white border-slate-100 md:border-slate-200 hover:border-slate-300'}`}>
                <div className={`w-5 h-5 md:w-7 md:h-7 rounded-md md:rounded-lg flex items-center justify-center text-[10px] md:text-[12px] font-black mr-2 md:mr-3 shrink-0 mt-0.5 transition-colors ${isCorrect ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20' : 'bg-white md:bg-slate-100 text-slate-400 md:text-slate-500 border border-slate-200 md:border-none'}`}>{key}</div>
                <div className={`text-[11px] md:text-[14.5px] font-medium pt-0.5 break-words overflow-hidden ${isCorrect ? 'text-amber-950' : 'text-slate-700'}`}><FormattedText text={getText(value)} /></div>
              </div>
            );
          })}
        </div>
      )}
      
      {getText(q.explanation).trim().length > 0 && (
        <div className="mt-2.5 md:mt-4 pt-2.5 md:pt-4 border-t border-slate-50 flex justify-start">
          <button onClick={() => setShowExplanation(!showExplanation)} className={`flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-[11px] md:text-[13px] font-bold transition-all duration-300 ${showExplanation ? 'bg-amber-100 text-amber-700 shadow-inner' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 hover:shadow-sm'}`}>
            <Sparkles size={12} className={`md:w-4 md:h-4 ${showExplanation ? "text-amber-500" : "text-amber-400"}`} />
            {showExplanation ? "Yechimni yashirish" : "AI Yechimni ko'rish"}
          </button>
        </div>
      )}

      {showExplanation && getText(q.explanation).trim().length > 0 && (
        <div className="bg-amber-50/50 border border-amber-100/60 p-2.5 md:p-4.5 rounded-xl md:rounded-2xl mt-2.5 md:mt-4 animate-in fade-in slide-in-from-top-2">
          <p className="text-[9px] md:text-[11px] font-black text-amber-500 uppercase tracking-widest mb-1.5 md:mb-2 flex items-center gap-1 md:gap-1.5"><Sparkles size={10} className="md:w-[14px] md:h-[14px]" /> AI Yechim Mantiqi</p>
          <p className="text-[11px] md:text-[14px] text-slate-700 leading-relaxed font-medium"><FormattedText text={getText(q.explanation)} /></p>
        </div>
      )}
    </div>
  );
};

export default function IxtisoslashtirilganGeneratorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // 🟢 NEW: Monthly Limit Logic
  const aiData = useMonthlyLimit(); 

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  
  const availableClasses = Object.keys(structureMap).sort((a, b) => parseInt(a) - parseInt(b));
  // @ts-ignore
  const availableSubjects = selectedClass ? (structureMap[selectedClass] || []) : [];

  const [syllabusData, setSyllabusData] = useState<any>(null);
  const [isLoadingSyllabus, setIsLoadingSyllabus] = useState(false);
  
  const [selectedChapterIndex, setSelectedChapterIndex] = useState("");
  const [selectedSubtopicIndex, setSelectedSubtopicIndex] = useState("");
  const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false);

  const [difficulty, setDifficulty] = useState("hard");
  const [count, setCount] = useState(5);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<AIQuestion[]>([]);
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingToBank, setIsSavingToBank] = useState(false); 
  const [testTitle, setTestTitle] = useState("");
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [limitModalMessage, setLimitModalMessage] = useState(""); // 🟢 NEW STATE
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      setIsLoadingSyllabus(true);
      setSyllabusData(null);
      setSelectedChapterIndex("");
      setSelectedSubtopicIndex("");

      fetch(`/api/syllabus?track=ixtisoslashtirilgan_maktab&class=${selectedClass}&subject=${selectedSubject}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => { if (data && data[0]) setSyllabusData(data[0]); })
        .catch(() => toast.error("Syllabus topilmadi!"))
        .finally(() => setIsLoadingSyllabus(false));
    }
  }, [selectedClass, selectedSubject]);

  const activeChapter = syllabusData?.chapters?.find((c: any) => c.index.toString() === selectedChapterIndex);
  const activeSubtopic = activeChapter?.subtopics?.find((s: any) => s.index.toString() === selectedSubtopicIndex);
  const isReadyToGenerate = selectedClass && selectedSubject && activeChapter && activeSubtopic;

  useEffect(() => {
    if (generatedQuestions.length > 0 && !isGenerating) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [generatedQuestions, isGenerating]);

  const handleClassSelect = (c: string) => {
    setSelectedClass(c);
    // @ts-ignore
    if (!structureMap[c]?.includes(selectedSubject)) {
      setSelectedSubject("");
      setSyllabusData(null);
      setSelectedChapterIndex("");
      setSelectedSubtopicIndex("");
    }
    setIsClassModalOpen(false);
    setTimeout(() => setIsSubjectModalOpen(true), 300);
  };

  const handleSubjectSelect = (s: string) => {
    setSelectedSubject(s);
    setIsSubjectModalOpen(false);
    setTimeout(() => setIsSyllabusModalOpen(true), 300);
  };

  const handleGenerate = async () => {
    if (!isReadyToGenerate) return toast.error("Iltimos, barcha maydonlarni tanlang.");

    // 🟢 NEW: Pre-check monthly limits
    if (!aiData.isUnlimited && aiData.remaining < count) {
      setLimitModalMessage(`Sizda oylik limitdan faqatgina ${aiData.remaining} ta savol qoldi. Iltimos so'ralayotgan miqdorni kamaytiring yoki tarifni oshiring.`);
      setIsLimitModalOpen(true);
      return; 
    }

    setIsGenerating(true);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);

    try {
      const response = await fetch("/teacher/create/ixtisoslashtirilgan_maktab/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid, 
          topic: selectedClass,       
          subject: selectedSubject,   
          chapter: activeChapter.chapter,
          subtopic: activeSubtopic.name, 
          context: activeSubtopic.context || "", 
          difficulty,
          count,
          language: "uz"
        }),
      });

      const data = await response.json();
      
      // 🟢 NEW: Gatekeeper Error Handling
      if (!response.ok) {
        if (data.code === 'LIMIT_REACHED') {
          setLimitModalMessage("Oylik AI limitingiz yetarli emas. Tarifingizni oshiring yoki keyingi oyni kuting.");
          setIsLimitModalOpen(true);
          return;
        }
        throw new Error(data.error);
      }

      let diffVal = 1;
      if (difficulty === "easy") diffVal = 1;
      else if (difficulty === "medium") diffVal = 2;
      else if (difficulty === "hard") diffVal = 3;
      else if (difficulty === "olympiad") diffVal = 4;

      const enrichedQuestions: AIQuestion[] = data.questions.map((q: any) => ({
        ...q,
        id: `tq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        subject: formatSubjectName(selectedSubject), 
        topic: syllabusData.category,                
        chapter: activeChapter.chapter,
        subtopic: activeSubtopic.name,
        difficultyId: diffVal,
        uiDifficulty: difficulty
      }));

      setGeneratedQuestions(prev => [...prev, ...enrichedQuestions]);
      toast.success(`${count} ta savol qo'shildi!`);
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
          creationMethod: "ixtisoslashtirilgan_maktab", 
          difficulty: q.uiDifficulty.toLowerCase(),
          difficultyId: q.difficultyId, 
          tags: ["ixtisos_ai", q.subtopic.toLowerCase(), q.chapter.toLowerCase()],
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
    const uniqueTopics = [...new Set(generatedQuestions.map(q => q.topic))];
    const uniqueChapters = [...new Set(generatedQuestions.map(q => q.chapter))];
    const uniqueSubtopics = [...new Set(generatedQuestions.map(q => q.subtopic))];

    const finalSubjectName = uniqueSubjects.length === 1 ? uniqueSubjects[0] : "Aralash fanlar";
    const finalTopicName = uniqueTopics.length === 1 ? uniqueTopics[0] : "Aralash sinflar";
    const finalChapterName = uniqueChapters.length === 1 ? uniqueChapters[0] : "Aralash bo'limlar";
    const finalSubtopicName = uniqueSubtopics.length === 1 ? uniqueSubtopics[0] : "Aralash mavzular";

    const currentTimestampString = new Date().toISOString();

    for (const q of generatedQuestions) {
      const secureFirebaseId = doc(collection(db, "teacher_questions")).id;
      const finalQ = {
        ...q,
        id: `tq_${secureFirebaseId}`, 
        creatorId: user.uid, 
        number: "", 
        subject: q.subject,           
        topic: q.topic,               
        chapter: q.chapter,           
        subtopic: q.subtopic,
        creationMethod: "ixtisoslashtirilgan_maktab",         
        difficulty: q.uiDifficulty.toLowerCase(),
        difficultyId: q.difficultyId, 
        explanation: typeof q.explanation === 'string' ? { uz: q.explanation } : (q.explanation || { uz: "" }),
        tags: ["ixtisos_ai", q.subtopic.toLowerCase(), q.chapter.toLowerCase()],
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
      track: "ixtisoslashtirilgan_maktab",
      subjectName: finalSubjectName,
      topicName: finalTopicName,
      chapterName: finalChapterName,
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
      router.push("/teacher/library/tests");
    } catch (error) {
      toast.error("Nashr qilishda xatolik.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex h-[100dvh] bg-[#FAFAFA] overflow-hidden font-sans selection:bg-amber-100 selection:text-amber-900">
      
      <AiThinkingModal isVisible={isGenerating} />

      <div className="lg:hidden fixed top-0 left-0 right-0 h-[60px] bg-white/90 backdrop-blur-xl border-b border-slate-200 z-[100000] flex items-center justify-between px-3 shadow-sm">
        <button onClick={() => router.push('/teacher/create')} className="p-2 -ml-1 text-slate-500 rounded-lg"><ArrowLeft size={18} /></button>
        <span className="font-black text-slate-800 text-[14px]">Savol Yaratish</span>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 -mr-1 bg-amber-50 text-amber-600 rounded-lg shadow-sm border border-amber-100/50"><Menu size={18} /></button>
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
                <h2 className="font-bold text-[14px] md:text-[16px] text-slate-900 tracking-tight flex items-center gap-2"><Sparkles size={16} className="text-amber-500 md:w-[18px] md:h-[18px]"/> Ixtisos. Dastur</h2>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1.5 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-full border border-slate-200 transition-colors"><X size={16} strokeWidth={2.5}/></button>
            </div>
            
            <div className="flex-1 overflow-hidden relative bg-white">
               <IxtisosControlPanel 
                 selectedClass={selectedClass} onOpenClassModal={() => setIsClassModalOpen(true)}
                 selectedSubject={selectedSubject} onOpenSubjectModal={() => setIsSubjectModalOpen(true)}
                 activeChapter={activeChapter} activeSubtopic={activeSubtopic} onOpenSyllabus={() => setIsSyllabusModalOpen(true)}
                 difficulty={difficulty} setDifficulty={setDifficulty}
                 count={count} setCount={setCount}
                 isLoadingSyllabus={isLoadingSyllabus} 
                 isReadyToGenerate={isReadyToGenerate} isGenerating={isGenerating} handleGenerate={handleGenerate}
                 aiData={aiData} 
                 setIsLimitModalOpen={setIsLimitModalOpen}
                 setLimitModalMessage={setLimitModalMessage} // 🟢 PASSED HERE
               />
            </div>
          </aside>
        </>
      )}

      <main className="flex-1 overflow-y-auto custom-scrollbar relative w-full pt-[60px] lg:pt-0 pb-24 lg:pb-0">
        
        <div className="hidden lg:flex sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-8 py-3 justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-[16px] font-bold text-slate-900 tracking-tight">AI Qoralama</h1>
            {generatedQuestions.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full border border-amber-200/60">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                <span className="text-[11px] font-bold text-amber-700 tracking-wide uppercase">{generatedQuestions.length} Savol</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* 🟢 NEW: Monthly Limit Card */}
            <AiMonthlyLimitCard aiData={aiData} />

            <button 
              onClick={handleSaveToBank} 
              disabled={isPublishing || isSavingToBank || isGenerating || generatedQuestions.length === 0} 
              className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 text-[13px]"
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
              <div className="w-12 h-12 md:w-16 md:h-16 bg-amber-50 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-5 border border-amber-100"><Sparkles size={24} className="text-amber-500 md:w-7 md:h-7" /></div>
              <p className="font-black text-slate-800 text-[16px] md:text-[18px] mb-1.5 md:mb-2">Hozircha bo'sh</p>
              <p className="text-[12px] md:text-[14px] text-slate-500 max-w-[250px] font-medium leading-relaxed">Chap paneldan parametrlarni tanlang va AI savol yozib beradi.</p>
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden mt-6 px-6 py-3 bg-amber-500 text-white font-bold rounded-xl shadow-md active:scale-95 text-[13px]">Parametrlarni tanlash</button>
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
                <div className="bg-white p-4 md:p-6 rounded-[1.25rem] md:rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-50/50 to-transparent w-[200%] animate-[shimmer_2s_infinite]" />
                  <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6"><div className="w-16 h-5 md:w-24 md:h-6 bg-slate-100 rounded-full" /><div className="w-24 h-5 md:w-32 md:h-6 bg-slate-50 rounded-full" /></div>
                  <div className="w-3/4 h-4 md:h-5 bg-slate-100 rounded-lg mb-4 md:mb-6" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">{[1, 2, 3, 4].map(i => <div key={i} className="w-full h-12 md:h-14 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100" />)}</div>
                </div>
              )}

              {!isGenerating && generatedQuestions.length > 0 && (
                <div className="py-8 md:py-10 flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3 md:mb-4"><Layers size={18} className="md:w-5 md:h-5" /></div>
                  <p className="text-[13px] md:text-[15px] font-black text-slate-800">Yana savol qo'shmoqchimisiz?</p>
                  <p className="text-[11px] md:text-[13.5px] text-slate-500 mt-1 max-w-[280px] font-medium leading-relaxed">Parametrlarni o'zgartirib yana "Yaratish" tugmasini bosing.</p>
                </div>
              )}
              
              <div ref={bottomRef} className="h-10" />
            </div>
          )}
        </div>
      </main>

      {/* 🟢 MOBILE FLOATING ACTIONS */}
      {mounted && !isSidebarOpen && generatedQuestions.length > 0 && createPortal(
        <div className="lg:hidden fixed bottom-5 left-0 right-0 px-3 flex items-center gap-2 z-[100] animate-in slide-in-from-bottom-10">
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="w-[46px] h-[46px] bg-amber-500 text-white rounded-full shadow-lg shadow-amber-500/30 flex items-center justify-center active:scale-95 transition-transform shrink-0"
          >
            <Plus size={20} strokeWidth={2.5}/>
          </button>
          
          <div className="flex-1 flex gap-2">
            <button 
              onClick={handleSaveToBank} 
              disabled={isSavingToBank || isPublishing || isGenerating} 
              className="flex-1 bg-[#EEF2FF] text-indigo-600 rounded-[1rem] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-[11px] h-[46px]"
            >
              {isSavingToBank ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />} 
              Saqlash
            </button>
            <button 
              onClick={handleInitiatePublish} 
              disabled={isPublishing || isSavingToBank || isGenerating} 
              className="flex-1 bg-[#0F172A] text-white rounded-[1rem] shadow-lg shadow-slate-900/20 font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-[11px] h-[46px]"
            >
              {isPublishing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} 
              Nashr Qilish
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* 🟢 NEW PREMIUM LIMIT MODAL */}
      <AnimatePresence>
        {isLimitModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsLimitModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-[1.5rem] md:rounded-3xl p-6 md:p-8 w-full max-w-[320px] md:max-w-sm shadow-2xl z-10 flex flex-col items-center text-center">
              <button onClick={() => setIsLimitModalOpen(false)} className="absolute top-3 right-3 md:top-4 md:right-4 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"><X size={18} className="md:w-5 md:h-5" /></button>
              
              <div className="w-14 h-14 md:w-16 md:h-16 bg-amber-50 rounded-[1rem] md:rounded-2xl flex items-center justify-center mb-4 border border-amber-100 shadow-inner">
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

      {/* ===================================================================== */}
      {/* ALL OTHER MODALS (Class, Subject, Syllabus, Title)                    */}
      {/* ===================================================================== */}
      {mounted && createPortal(
        <>
          {/* CLASS SELECTION MODAL */}
          <AnimatePresence>
            {isClassModalOpen && (
              <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsClassModalOpen(false)} />
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative bg-white rounded-t-[2rem] sm:rounded-3xl w-full max-w-md h-auto max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden z-10">
                  <div className="p-4 md:p-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <h3 className="text-[18px] md:text-xl font-black text-slate-900">Sinfni tanlang</h3>
                    <button onClick={() => setIsClassModalOpen(false)} className="p-1.5 md:p-2 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"><X size={18} className="md:w-5 md:h-5"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar bg-[#FAFAFA]">
                    <div className="grid grid-cols-2 gap-2.5 md:gap-3">
                      {availableClasses.map(c => (
                        <button key={c} onClick={() => handleClassSelect(c)} className={`p-3 md:p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 md:gap-3 active:scale-[0.98] ${selectedClass === c ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-md ring-2 ring-amber-500/20' : 'bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:shadow-sm'}`}>
                          <GraduationCap size={24} className={`md:w-7 md:h-7 ${selectedClass === c ? "text-amber-500" : "text-slate-400"}`}/>
                          <span className="text-[13px] md:text-[15px] font-bold">{c}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>




          {/* SUBJECT SELECTION MODAL */}
          <AnimatePresence>
            {isSubjectModalOpen && selectedClass && (
              <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSubjectModalOpen(false)} />
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative bg-white rounded-t-[2rem] sm:rounded-3xl w-full max-w-lg h-auto max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden z-10">
                  <div className="p-4 md:p-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <div>
                      <h3 className="text-[18px] md:text-xl font-black text-slate-900">Fanni tanlang</h3>
                      <p className="text-slate-500 text-[10px] md:text-[12px] font-bold mt-0.5 uppercase tracking-widest">{selectedClass}</p>
                    </div>
                    <button onClick={() => setIsSubjectModalOpen(false)} className="p-1.5 md:p-2 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"><X size={18} className="md:w-5 md:h-5"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar bg-[#FAFAFA]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
                      {availableSubjects.map((s: string) => (
                        <button key={s} onClick={() => handleSubjectSelect(s)} className={`p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all flex items-center gap-3 md:gap-4 active:scale-[0.98] ${selectedSubject === s ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-md ring-2 ring-amber-500/20' : 'bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:shadow-sm'}`}>
                          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${selectedSubject === s ? 'bg-amber-600 text-white' : 'bg-slate-50 border border-slate-200 text-slate-400'}`}>
                            <BookOpen size={18} className="md:w-5 md:h-5" />
                          </div>
                          <span className="text-[13px] md:text-[15px] font-bold text-left leading-snug">{formatSubjectName(s)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* SYLLABUS SELECTION MODAL */}
          <AnimatePresence>
            {isSyllabusModalOpen && syllabusData && (
              <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setIsSyllabusModalOpen(false); setSearchQuery(""); }} />
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative bg-white rounded-t-[2rem] sm:rounded-3xl w-full max-w-4xl h-[90dvh] sm:h-[85vh] flex flex-col shadow-2xl overflow-hidden z-10">
                  <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col gap-3 md:gap-4 bg-white shrink-0">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-[18px] md:text-2xl font-black text-slate-900">Mavzuni tanlang</h3>
                        <p className="text-slate-500 text-[11px] md:text-[13px] font-bold mt-0.5">{selectedClass} • {formatSubjectName(selectedSubject)}</p>
                      </div>
                      <button onClick={() => { setIsSyllabusModalOpen(false); setSearchQuery(""); }} className="p-1.5 md:p-2 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"><X size={18} className="md:w-5 md:h-5"/></button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" placeholder="Mavzu nomini qidiring..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 md:py-3.5 rounded-[1rem] md:rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all text-[13px] md:text-[14px] font-bold text-slate-800 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-[#FAFAFA]">
                    {syllabusData.chapters.map((chapter: any) => {
                      const filteredSubtopics = chapter.subtopics.filter((sub: any) => sub.name.toLowerCase().includes(searchQuery.toLowerCase()));
                      if (filteredSubtopics.length === 0) return null;

                      return (
                        <div key={chapter.index} className="mb-6 md:mb-8 last:mb-0 animate-in fade-in">
                          <h4 className="text-[10px] md:text-[12px] font-black text-amber-600 uppercase tracking-widest mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2">
                            <BookMarked size={12} className="md:w-3.5 md:h-3.5" strokeWidth={3}/> {chapter.chapter}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3">
                            {filteredSubtopics.map((sub: any) => {
                              const isSelected = selectedChapterIndex === chapter.index.toString() && selectedSubtopicIndex === sub.index.toString();
                              return (
                                <button 
                                  key={sub.index}
                                  onClick={() => { setSelectedChapterIndex(chapter.index.toString()); setSelectedSubtopicIndex(sub.index.toString()); setIsSyllabusModalOpen(false); setSearchQuery(""); }}
                                  className={`text-left p-3.5 md:p-4 rounded-[1rem] md:rounded-2xl border transition-all duration-200 flex flex-col justify-between h-full min-h-[80px] md:min-h-[90px] active:scale-[0.98] ${isSelected ? 'bg-amber-600 border-amber-600 text-white shadow-md' : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-sm'}`}
                                >
                                  <span className={`text-[12px] md:text-[13.5px] font-bold leading-snug ${isSelected ? 'text-white' : 'text-slate-800'}`}>{sub.name}</span>
                                  <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-3 md:mt-4 ${isSelected ? 'text-amber-200' : 'text-slate-400'}`}>Mavzu {sub.index}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {syllabusData.chapters.every((c: any) => c.subtopics.filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0) && (
                      <div className="flex flex-col items-center justify-center py-12 md:py-16 text-slate-400">
                        <Search size={32} className="mb-3 md:mb-4 opacity-30 text-amber-500 md:w-10 md:h-10" />
                        <p className="font-bold text-[13px] md:text-[15px] text-slate-600">"{searchQuery}" topilmadi</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* TITLE SAVE MODAL */}
          <AnimatePresence>
            {isTitleModalOpen && (
              <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsTitleModalOpen(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-[1.5rem] md:rounded-3xl p-5 md:p-8 w-full max-w-[320px] md:max-w-sm shadow-2xl border border-slate-100 z-10">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-amber-50 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-5 border border-amber-100"><BookOpen size={24} strokeWidth={2.5} className="text-amber-600 md:w-7 md:h-7" /></div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 mb-1 md:mb-1.5">Hujjat nomi</h3>
                  <p className="text-[11px] md:text-[13px] font-medium text-slate-500 mb-5 md:mb-6 leading-relaxed">O'quvchilarga ko'rinadigan rasmiy nomni yozing.</p>
                  <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} className="w-full px-3 py-2.5 md:px-4 md:py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] md:text-[14px] font-black text-slate-900 outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all mb-6 md:mb-8 placeholder:font-medium placeholder:text-slate-400" autoFocus placeholder="Masalan: Olimpiada tayyorgarligi"/>
                  <div className="flex flex-col-reverse sm:flex-row gap-2 md:gap-3">
                    <button onClick={() => setIsTitleModalOpen(false)} className="w-full px-4 py-2.5 md:py-3.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-[12px] md:text-[14px]">Bekor qilish</button>
                    <button onClick={handleTitleSubmit} className="w-full px-4 py-2.5 md:py-3.5 bg-slate-900 hover:bg-black text-white font-black rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-[12px] md:text-[14px]">
                      Keyingi Qadam <ChevronRight size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5}/>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
          {isConfigModalOpen && (
            <TestConfigurationModal 
              isOpen={isConfigModalOpen}
              onClose={() => setIsConfigModalOpen(false)}
              onConfirm={handleFinalPublish}
              
              // 🟢 YOU MUST ADD THESE 3 LINES:
              isSaving={isPublishing} 
              testTitle={testTitle}
              questionCount={generatedQuestions.length}
            />
          )}
        </AnimatePresence>

          
        </>,
        document.body
      )}

    </div>
  );
}


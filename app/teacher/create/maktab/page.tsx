"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Loader2, CheckCircle2, BookOpen, Trash2, Layers, EyeOff, Eye, Menu, X, ChevronRight, BookMarked, Search, Bot, Zap, Plus, GraduationCap } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import TestConfigurationModal from "@/app/teacher/create/_components/TestConfigurationModal";
import AiLimitCard from "@/app/teacher/create/_components/AiLimitCard"; 
import { useAiLimits } from "@/hooks/useAiLimits";

// 🟢 IMPORT THE CONTROL PANEL
import GeneratorControlPanel from "./_components/GeneratorControlPanel";

// 🟢 IMPORT THE MASTER MAP FOR MAKTAB
import structureMap from "@/data/maktab/structure.json";

// --- TYPES ---
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

// --- COMPONENTS ---
const AiThinkingModal = ({ isVisible }: { isVisible: boolean }) => {
  const phrases = ["Mavzu tahlil qilinmoqda...", "Maktab dasturi tekshirilmoqda...", "Konteks o'qilmoqda...", "Qiyinlik darajasi moslashtirilmoqda...", "Savollar va javoblar yozilmoqda..."];
  const [phraseIndex, setPhraseIndex] = useState(0);
  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => setPhraseIndex((prev) => (prev + 1) % phrases.length), 2500); 
    return () => clearInterval(interval);
  }, [isVisible, phrases.length]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-indigo-500/20 rounded-full blur-[80px] animate-pulse"></div>
            <div className="absolute bottom-[-30%] right-[-20%] w-[80%] h-[80%] bg-blue-500/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "1s" }}></div>
            <div className="relative mb-8 mt-4">
              <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-blue-400 rounded-full blur-xl opacity-40" />
              <div className="relative w-24 h-24 bg-white/80 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-xl">
                <Bot size={44} className="text-indigo-600 animate-bounce" style={{ animationDuration: "2s" }} />
                <Sparkles size={20} className="absolute -top-3 -right-3 text-amber-400 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2 relative z-10 tracking-tight text-center">AI Studiya ishlamoqda</h3>
            <div className="h-6 relative z-10 overflow-hidden flex items-center justify-center w-full">
              <motion.p key={phraseIndex} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.4 }} className="text-[14px] font-medium text-slate-500 absolute text-center w-full">{phrases[phraseIndex]}</motion.p>
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
          try { return <span key={index} dangerouslySetInnerHTML={{ __html: katex.renderToString(math, { displayMode: true, throwOnError: false, strict: false }) }} className="block my-3 text-center overflow-x-auto custom-scrollbar" />; } 
          catch (e) { return <span key={index} className="text-rose-500 font-mono text-[13px] bg-rose-50 px-1 rounded">{part}</span>; }
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).trim();
          try { return <span key={index} dangerouslySetInnerHTML={{ __html: katex.renderToString(math, { displayMode: false, throwOnError: false, strict: false }) }} className="px-0.5 inline-block" />; } 
          catch (e) { return <span key={index} className="text-rose-500 font-mono text-[13px] bg-rose-50 px-1 rounded">{part}</span>; }
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
    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 relative group">
      <div className="flex justify-between items-start gap-4 mb-5 pb-4 border-b border-slate-100">
        <div className="flex items-center flex-wrap gap-2 flex-1 min-w-0">
          <span className="bg-indigo-50 text-indigo-700 text-[11px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest flex items-center gap-1.5 border border-indigo-100/50 shrink-0">
            <Sparkles size={14} className="text-indigo-500" /> Q{idx + 1}
          </span>
          <span className="bg-slate-50 text-slate-600 text-[11px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-widest flex items-center border border-slate-200/60 max-w-full min-w-0">
             <Layers size={12} className="shrink-0 mr-1.5" /> 
             <span className="truncate">{q.chapter}</span> <span className="text-slate-300 mx-1.5 shrink-0">/</span> <span className="truncate">{q.subtopic}</span>
          </span>
          <span className="bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm shrink-0">{q.uiDifficulty}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setShowOptions(!showOptions)} className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-xl transition-colors"><Eye size={18} /></button>
          <div className="w-px h-5 bg-slate-200 mx-1"></div>
          <button onClick={() => onRemove(q.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-colors"><Trash2 size={18} /></button>
        </div>
      </div>
      
      <p className="font-semibold text-[15.5px] text-slate-900 mb-6 leading-relaxed"><FormattedText text={getText(q.question)} /></p>
      
      {showOptions && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
          {Object.entries(q.options).map(([key, value]) => {
            const isCorrect = q.answer === key;
            return (
              <div key={key} className={`flex items-start p-3.5 rounded-2xl border-2 transition-all ${isCorrect ? 'bg-indigo-50/40 border-indigo-500/30' : 'bg-white border-slate-100'}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-black mr-3 shrink-0 mt-0.5 transition-colors ${isCorrect ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' : 'bg-slate-100 text-slate-500'}`}>{key}</div>
                <div className={`text-[14.5px] font-medium pt-0.5 break-words overflow-hidden ${isCorrect ? 'text-indigo-950' : 'text-slate-700'}`}><FormattedText text={getText(value)} /></div>
              </div>
            );
          })}
        </div>
      )}
      
      {getText(q.explanation).trim().length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-start">
          <button onClick={() => setShowExplanation(!showExplanation)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all duration-300 ${showExplanation ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:shadow-sm'}`}>
            <Sparkles size={16} className={showExplanation ? "text-indigo-500" : "text-indigo-400"} />
            {showExplanation ? "Yechimni yashirish" : "AI Yechimni ko'rish"}
          </button>
        </div>
      )}

      {showExplanation && getText(q.explanation).trim().length > 0 && (
        <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-2xl mt-4 animate-in fade-in slide-in-from-top-2">
          <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Sparkles size={14} className="text-indigo-400" /> AI Yechim Mantiqi</p>
          <p className="text-[14px] text-slate-700 leading-relaxed font-medium"><FormattedText text={getText(q.explanation)} /></p>
        </div>
      )}
    </div>
  );
};


// --- MAIN PAGE ---
export default function MaktabGeneratorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);
  const aiData = useAiLimits(); 

  // --- STATES ---
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [syllabusData, setSyllabusData] = useState<any>(null);
  const [isLoadingSyllabus, setIsLoadingSyllabus] = useState(false);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState("");
  const [selectedSubtopicIndex, setSelectedSubtopicIndex] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<AIQuestion[]>([]);
  const [testTitle, setTestTitle] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // --- MODAL STATES ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const availableClasses = Object.keys(structureMap).sort((a, b) => parseInt(a) - parseInt(b));
  // @ts-ignore
  const availableSubjects = selectedClass ? (structureMap[selectedClass] || []) : [];

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      setIsLoadingSyllabus(true);
      setSyllabusData(null);
      setSelectedChapterIndex("");
      setSelectedSubtopicIndex("");

      fetch(`/api/syllabus?track=maktab&class=${selectedClass}&subject=${selectedSubject}`)
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

  // 🟢 WATERFALL UX HANDLERS
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
    setTimeout(() => setIsSubjectModalOpen(true), 300); // Auto-open Subject modal
  };

  const handleSubjectSelect = (s: string) => {
    setSelectedSubject(s);
    setIsSubjectModalOpen(false);
    setTimeout(() => setIsSyllabusModalOpen(true), 300); // Auto-open Syllabus modal
  };

  const handleGenerate = async () => {
    if (!isReadyToGenerate) return toast.error("Iltimos, barcha maydonlarni tanlang.");
    if (aiData?.isLimitReached || (aiData && count > aiData.remaining)) { setIsLimitModalOpen(true); return; }

    setIsGenerating(true);
    if (window.innerWidth < 1024) setIsSidebarOpen(false); // Auto-close sidebar on mobile

    try {
      const response = await fetch("/teacher/create/maktab/api", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.uid, topic: selectedClass, subject: selectedSubject, chapter: activeChapter.chapter, subtopic: activeSubtopic.name, context: activeSubtopic.context || "", difficulty, count, language: "uz" }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      let diffVal = 2; // Default to medium
      if (difficulty === "easy") diffVal = 1;
      else if (difficulty === "medium") diffVal = 2;
      else if (difficulty === "hard") diffVal = 3;
      else if (difficulty === "mixed") diffVal = 0; 

      const enrichedQuestions: AIQuestion[] = data.questions.map((q: any) => ({
        ...q,
        id: `tq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        subject: formatSubjectName(selectedSubject), topic: syllabusData.category, chapter: activeChapter.chapter, subtopic: activeSubtopic.name,
        difficultyId: diffVal, uiDifficulty: difficulty
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

  // 🟢 ADD THESE TWO MISSING FUNCTIONS HERE:
  const handleInitiatePublish = () => {
    if (generatedQuestions.length === 0) return toast.error("Oldin savol yarating.");
    setIsTitleModalOpen(true); 
  };

  const handleTitleSubmit = () => {
    if (!testTitle.trim()) return toast.error("Test nomini kiriting.");
    setIsTitleModalOpen(false);
    setIsConfigModalOpen(true); 
  };
  // 🟢 -----------------------------------
  

  
  const handleFinalPublish = async (testSettings: any) => {
    if (!user) return;
    setIsPublishing(true);
    const batch = writeBatch(db);
    const finalQuestionsToSave = [];

    const formattedTopic = syllabusData.category;                
    const formattedSubject = formatSubjectName(selectedSubject); 
    const currentTimestampString = new Date().toISOString();

    for (const q of generatedQuestions) {
      const secureFirebaseId = doc(collection(db, "teacher_questions")).id;
      const finalQ = {
        ...q, id: `tq_${secureFirebaseId}`, creatorId: user.uid, number: "", 
        subject: formattedSubject, topic: formattedTopic, chapter: q.chapter, subtopic: q.subtopic, difficulty: q.uiDifficulty.toLowerCase(), difficultyId: q.difficultyId, 
        tags: ["maktab_ai", q.subtopic.toLowerCase(), q.chapter.toLowerCase()], language: ["uz"], solutions: [], uploadedAt: currentTimestampString, 
      };
      finalQuestionsToSave.push(finalQ);
      batch.set(doc(db, "teacher_questions", finalQ.id), { ...finalQ, createdAt: serverTimestamp() }); 
    }

    batch.set(doc(collection(db, "custom_tests")), {
      teacherId: user.uid, title: testTitle, subjectName: formattedSubject, topicName: formattedTopic, chapterName: generatedQuestions[0]?.chapter || "Aralash", subtopicName: generatedQuestions[0]?.subtopic || "Aralash",
      questions: finalQuestionsToSave, duration: testSettings.duration, shuffle: testSettings.shuffleQuestions, resultsVisibility: testSettings.resultsVisibility, accessCode: testSettings.accessCode, status: "active", createdAt: serverTimestamp(), questionCount: finalQuestionsToSave.length,
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
    <div className="flex h-[100dvh] bg-[#FAFAFA] overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      <AiThinkingModal isVisible={isGenerating} />

      {/* 🟢 TOP BAR (Mobile) */}
<div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-xl border-b border-slate-200 z-[100000] flex items-center justify-between px-4 shadow-sm">
        <button onClick={() => router.push('/teacher/create')} className="p-2 -ml-2 text-slate-500 rounded-lg"><ArrowLeft size={20} /></button>
        <span className="font-black text-slate-800 text-[15px]">Savol Yaratish</span>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 -mr-2 bg-indigo-50 text-indigo-600 rounded-lg shadow-sm border border-indigo-100/50"><Menu size={20} /></button>
      </div>

      {/* 🟢 SIDEBAR CONTROL PANEL */}
      {mounted && (
        <>
          <AnimatePresence>
            {isSidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="lg:hidden fixed top-16 left-0 right-0 bottom-0 bg-slate-900/60 backdrop-blur-sm z-[99998]" onClick={() => setIsSidebarOpen(false)} />}
          </AnimatePresence>
          
          {/* 🟢 SIDEBAR CONTROL PANEL */}
          <aside className={`fixed lg:relative top-16 lg:top-0 left-0 w-full sm:w-[400px] h-[calc(100dvh-64px)] lg:h-[100dvh] bg-white border-r border-slate-200 shadow-2xl lg:shadow-none z-[99998] lg:z-10 transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
            
            {/* 🟢 THE FIX: A dedicated, sticky header for the sidebar with a clear 'X' button */}
            <div className="flex justify-between items-center p-4 md:p-5 border-b border-slate-100 bg-white shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => router.push('/teacher/create')} className="hidden lg:flex p-1.5 -ml-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all">
                  <ArrowLeft size={18} />
                </button>
                <h2 className="font-bold text-[16px] text-slate-900 tracking-tight flex items-center gap-2">
                  <Layers size={18} className="text-indigo-600"/> Maktab Dasturi
                </h2>
              </div>
              
              {/* 🟢 THE "X" BUTTON FOR MOBILE */}
              <button 
                onClick={() => setIsSidebarOpen(false)} 
                className="lg:hidden p-2 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-full border border-slate-200 transition-colors"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
            
            {/* Control Panel Content */}
            <div className="flex-1 overflow-hidden relative bg-white">
               <GeneratorControlPanel 
                 selectedClass={selectedClass} onOpenClassModal={() => setIsClassModalOpen(true)}
                 selectedSubject={selectedSubject} onOpenSubjectModal={() => setIsSubjectModalOpen(true)}
                 activeChapter={activeChapter} activeSubtopic={activeSubtopic} onOpenSyllabus={() => setIsSyllabusModalOpen(true)}
                 difficulty={difficulty} setDifficulty={setDifficulty}
                 count={count} setCount={setCount}
                 isLoadingSyllabus={isLoadingSyllabus} 
                 isReadyToGenerate={isReadyToGenerate} isGenerating={isGenerating} handleGenerate={handleGenerate}
                 aiData={aiData} setIsLimitModalOpen={setIsLimitModalOpen}
               />
            </div>
          </aside>
        </>
      )}

      {/* --- MAIN CANVAS --- */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative w-full pt-16 lg:pt-0 pb-24 lg:pb-0">
        
        <div className="hidden lg:flex sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-8 py-4 justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-[18px] font-bold text-slate-900 tracking-tight">AI Qoralama</h1>
            {generatedQuestions.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-full border border-indigo-200/60">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                <span className="text-[11px] font-bold text-indigo-700 tracking-wide uppercase">{generatedQuestions.length} Savol</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <AiLimitCard aiData={aiData} />
            <button onClick={() => setIsTitleModalOpen(true)} disabled={isPublishing || isGenerating || generatedQuestions.length === 0} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-slate-900/10 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 text-[14px]">
               <CheckCircle2 size={18} /> Nashr qilish
            </button>
          </div>
        </div>

        <div className="max-w-[800px] mx-auto p-4 md:p-8 space-y-6">
          {generatedQuestions.length === 0 && !isGenerating ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-[60vh] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-[2rem] bg-white lg:mt-6 p-6 text-center shadow-sm mx-2 lg:mx-0">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5 border border-indigo-100"><Sparkles size={28} className="text-indigo-500" /></div>
              <p className="font-black text-slate-800 text-[18px] mb-2">Hozircha bo'sh</p>
              <p className="text-[14px] text-slate-500 max-w-[250px] font-medium leading-relaxed">Chap paneldan parametrlarni tanlang va AI savol yozib beradi.</p>
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden mt-8 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md active:scale-95">Parametrlarni tanlash</button>
            </motion.div>
          ) : (
            <div className="space-y-6 lg:pb-12">
              <div className="lg:hidden flex items-center justify-between mb-2 px-2">
                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">{generatedQuestions.length} ta savol</span>
                <AiLimitCard aiData={aiData} />
              </div>

              {generatedQuestions.map((q, idx) => (
                <AIQuestionCard key={q.id} q={q} idx={idx} onRemove={removeQuestion} />
              ))}

              {isGenerating && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-50/50 to-transparent w-[200%] animate-[shimmer_2s_infinite]" />
                  <div className="flex items-center gap-3 mb-6"><div className="w-24 h-6 bg-slate-100 rounded-full" /><div className="w-32 h-6 bg-slate-50 rounded-full" /></div>
                  <div className="w-3/4 h-5 bg-slate-100 rounded-lg mb-6" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[1, 2, 3, 4].map(i => <div key={i} className="w-full h-14 bg-slate-50 rounded-2xl border border-slate-100" />)}</div>
                </div>
              )}

              {!isGenerating && generatedQuestions.length > 0 && (
                <div className="py-10 flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4"><Layers size={20} /></div>
                  <p className="text-[15px] font-black text-slate-800">Yana savol qo'shmoqchimisiz?</p>
                  <p className="text-[13.5px] text-slate-500 mt-1 max-w-[280px] font-medium leading-relaxed">Parametrlarni o'zgartirib yana "Yaratish" tugmasini bosing.</p>
                </div>
              )}
              
              <div ref={bottomRef} className="h-10" />
            </div>
          )}
        </div>
      </main>

      {/* 🟢 MOBILE FLOATING ACTIONS */}
      {mounted && !isSidebarOpen && generatedQuestions.length > 0 && createPortal(
        <div className="lg:hidden fixed bottom-6 left-0 right-0 px-4 flex justify-between gap-3 z-30 animate-in slide-in-from-bottom-10">
          <button onClick={() => setIsSidebarOpen(true)} className="w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20 flex items-center justify-center active:scale-95 transition-transform shrink-0 border border-indigo-500">
            <Plus size={24} strokeWidth={3}/>
          </button>
          <button onClick={() => setIsTitleModalOpen(true)} disabled={isPublishing || isGenerating} className="flex-1 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/20 font-black flex items-center justify-center gap-2 active:scale-95 transition-transform text-[14px] border border-slate-800">
            <CheckCircle2 size={18} strokeWidth={2.5}/> Nashr Qilish
          </button>
        </div>,
        document.body
      )}

      {/* ===================================================================== */}
      {/* 🟢 ALL MODALS (PORTALIZED FOR 100% Z-INDEX SAFETY ON MOBILE)          */}
      {/* ===================================================================== */}
      
      {mounted && createPortal(
        <>
          {/* CLASS SELECTION MODAL */}
          <AnimatePresence>
            {isClassModalOpen && (
              <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsClassModalOpen(false)} />
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative bg-white rounded-t-[2rem] sm:rounded-3xl w-full max-w-md h-auto max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden z-10">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <h3 className="text-xl font-black text-slate-900">Sinfni tanlang</h3>
                    <button onClick={() => setIsClassModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[#FAFAFA]">
                    <div className="grid grid-cols-2 gap-3">
                      {availableClasses.map(c => (
                        <button key={c} onClick={() => handleClassSelect(c)} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 active:scale-[0.98] ${selectedClass === c ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:shadow-sm'}`}>
                          <GraduationCap size={28} className={selectedClass === c ? "text-indigo-500" : "text-slate-400"}/>
                          <span className="text-[15px] font-bold">{c}</span>
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
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Fanni tanlang</h3>
                      <p className="text-slate-500 text-[12px] font-bold mt-0.5 uppercase tracking-widest">{selectedClass}</p>
                    </div>
                    <button onClick={() => setIsSubjectModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[#FAFAFA]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {availableSubjects.map((s: string) => (
                        <button key={s} onClick={() => handleSubjectSelect(s)} className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 active:scale-[0.98] ${selectedSubject === s ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:shadow-sm'}`}>
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedSubject === s ? 'bg-indigo-600 text-white' : 'bg-slate-50 border border-slate-200 text-slate-400'}`}>
                            <BookOpen size={20} />
                          </div>
                          <span className="text-[15px] font-bold text-left leading-snug">{formatSubjectName(s)}</span>
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
                  <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col gap-4 bg-white shrink-0">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xl md:text-2xl font-black text-slate-900">Mavzuni tanlang</h3>
                        <p className="text-slate-500 text-[13px] font-bold mt-0.5">{selectedClass} • {formatSubjectName(selectedSubject)}</p>
                      </div>
                      <button onClick={() => { setIsSyllabusModalOpen(false); setSearchQuery(""); }} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" placeholder="Mavzu nomini qidiring..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-[14px] font-bold text-slate-800 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 md:p-6 custom-scrollbar bg-[#FAFAFA]">
                    {syllabusData.chapters.map((chapter: any) => {
                      const filteredSubtopics = chapter.subtopics.filter((sub: any) => sub.name.toLowerCase().includes(searchQuery.toLowerCase()));
                      if (filteredSubtopics.length === 0) return null;

                      return (
                        <div key={chapter.index} className="mb-8 last:mb-0 animate-in fade-in">
                          <h4 className="text-[12px] font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <BookMarked size={14} strokeWidth={3}/> {chapter.chapter}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {filteredSubtopics.map((sub: any) => {
                              const isSelected = selectedChapterIndex === chapter.index.toString() && selectedSubtopicIndex === sub.index.toString();
                              return (
                                <button 
                                  key={sub.index}
                                  onClick={() => { setSelectedChapterIndex(chapter.index.toString()); setSelectedSubtopicIndex(sub.index.toString()); setIsSyllabusModalOpen(false); setSearchQuery(""); }}
                                  className={`text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between h-full min-h-[90px] active:scale-[0.98] ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-sm'}`}
                                >
                                  <span className={`text-[13.5px] font-bold leading-snug ${isSelected ? 'text-white' : 'text-slate-800'}`}>{sub.name}</span>
                                  <span className={`text-[10px] font-black uppercase tracking-widest mt-4 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>Mavzu {sub.index}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {syllabusData.chapters.every((c: any) => c.subtopics.filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0) && (
                      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Search size={40} className="mb-4 opacity-30 text-indigo-500" />
                        <p className="font-bold text-[15px] text-slate-600">"{searchQuery}" topilmadi</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* LIMIT MODAL */}
          <AnimatePresence>
            {isLimitModalOpen && (
              <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsLimitModalOpen(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl z-10 flex flex-col items-center text-center">
                  <button onClick={() => setIsLimitModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
                  <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-5 border border-rose-100 shadow-inner"><Zap size={28} className="text-rose-500" /></div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">{aiData?.isLimitReached ? "Kunlik limit tugadi" : "Limit yetarli emas"}</h3>
                  <p className="text-[14px] text-slate-500 mb-6 font-medium leading-relaxed">{aiData?.isLimitReached ? "Siz bugungi bepul kunlik limitingizni tugatdingiz. Cheklovsiz foydalanish uchun profilingizni yangilang." : `Sizda bugun uchun faqatgina ${aiData?.remaining} ta bepul limit qoldi.`}</p>
                  <div className="w-full flex flex-col gap-3">
                    <button onClick={() => window.open('https://t.me/Umidjon0339', '_blank')} className="w-full py-3.5 bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2">Limitni oshirish</button>
                    <button onClick={() => setIsLimitModalOpen(false)} className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors active:scale-[0.98]">Orqaga qaytish</button>
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
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl border border-slate-100 z-10">
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5 border border-indigo-100"><BookOpen size={28} strokeWidth={2.5} className="text-indigo-600" /></div>
                  <h3 className="text-xl font-black text-slate-900 mb-1.5">Hujjat nomi</h3>
                  <p className="text-[13px] font-medium text-slate-500 mb-6 leading-relaxed">O'quvchilarga ko'rinadigan rasmiy nomni yozing.</p>
                  <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-black text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all mb-8 placeholder:font-medium placeholder:text-slate-400" autoFocus placeholder="Masalan: 1-chorak nazorati"/>
                  <div className="flex flex-col-reverse sm:flex-row gap-3">
                    <button onClick={() => setIsTitleModalOpen(false)} className="w-full px-4 py-3.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-[14px]">Bekor qilish</button>
                    <button onClick={handleTitleSubmit} className="w-full px-4 py-3.5 bg-slate-900 hover:bg-black text-white font-black rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-[14px]">
                      Keyingi Qadam <ChevronRight size={18} strokeWidth={2.5}/>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}

      {/* RENDER CONFIG MODAL AT ROOT LEVEL SO IT ALSO ESCAPES OVERFLOW TRAPS */}
      {mounted && createPortal(
        <TestConfigurationModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={handleFinalPublish} questionCount={generatedQuestions.length} testTitle={testTitle} isSaving={isPublishing} />,
        document.body
      )}

    </div>
  );
}
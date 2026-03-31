"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Loader2, CheckCircle2, Wand2, BookOpen, Trash2, Layers, EyeOff, Eye, Menu, X, Minus, Plus, ChevronRight, BookMarked, Search, Bot, Zap } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { motion, AnimatePresence } from "framer-motion";
import TestConfigurationModal from "@/app/teacher/create/_components/TestConfigurationModal";

// 🟢 AI LIMIT BLOCK START
import { useAiLimits } from "@/hooks/useAiLimits";
import AiLimitCard from "@/app/teacher/create/_components/AiLimitCard"; 
// 🔴 AI LIMIT BLOCK END

// 🟢 INSTANT LOAD: The Master Map for Maktab
import structureMap from "@/data/maktab/structure.json";

// --- TYPES ---
interface AIQuestion { 
  id: string; 
  uiDifficulty: string; 
  question: { uz: string; ru: string; en: string }; 
  options: { A: { uz: string; ru: string; en: string }; B: { uz: string; ru: string; en: string }; C: { uz: string; ru: string; en: string }; D: { uz: string; ru: string; en: string }; }; 
  answer: string; 
  explanation: { uz: string; ru: string; en: string }; 
  // 🟢 IDs REMOVED! Only keeping the clean text fields and difficultyId
  subject: string; 
  topic: string; 
  chapter: string; 
  subtopic: string; 
  difficultyId: number; 
}

// 🟢 THE HELPER FUNCTION
const formatSubjectName = (rawSubject: string) => {
  if (!rawSubject) return "";
  const cleanedStr = rawSubject.replace(/-/g, " ");
  return cleanedStr.charAt(0).toUpperCase() + cleanedStr.slice(1).toLowerCase();
};

// ==========================================
// 🟢 AI THINKING MODAL (INDIGO THEME)
// ==========================================
const AiThinkingModal = ({ isVisible }: { isVisible: boolean }) => {
  const phrases = [
    "Mavzu tahlil qilinmoqda...",
    "Maktab dasturi tekshirilmoqda...",
    "Konteks o'qilmoqda...",
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
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-3xl border border-indigo-100/50 shadow-2xl p-8 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-indigo-500/20 rounded-full blur-[80px] animate-pulse"></div>
            <div className="absolute bottom-[-30%] right-[-20%] w-[80%] h-[80%] bg-blue-500/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "1s" }}></div>
            <div className="relative mb-8 mt-4">
              <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-blue-400 rounded-full blur-xl opacity-40" />
              <div className="relative w-24 h-24 bg-white/80 backdrop-blur-md rounded-3xl border border-white flex items-center justify-center shadow-xl">
                <Bot size={44} className="text-indigo-600 animate-bounce" style={{ animationDuration: "2s" }} />
                <Sparkles size={20} className="absolute -top-3 -right-3 text-amber-400 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2 relative z-10 tracking-tight text-center">AI Studiya ishlamoqda</h3>
            <div className="h-6 relative z-10 overflow-hidden flex items-center justify-center w-full">
              <motion.p key={phraseIndex} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.4 }} className="text-[14px] font-medium text-slate-500 absolute text-center w-full">{phrases[phraseIndex]}</motion.p>
            </div>
            <div className="w-[80%] h-1.5 bg-slate-200/50 rounded-full mt-8 overflow-hidden relative z-10">
              <motion.div className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500 rounded-full w-[200%]" animate={{ x: ["-50%", "0%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
// ==========================================

// --- BULLETPROOF LATEX FORMATTER ---
const FormattedText = ({ text }: { text: any }) => {
  if (!text) return null;

  let content = typeof text === 'string' ? text : JSON.stringify(text);

  const hasMathCommands = /\\frac|\\pi|\\sin|\\cos|\\tan|\\ge|\\le|\\cup|\\cap|\\in|\\begin|\\sqrt|\\empty/.test(content);
  if (!content.includes('$') && hasMathCommands) {
    content = `$${content}$`;
  }

  content = content
    .replace(/\\\((.*?)\\\)/g, '$$$1$$')
    .replace(/\\\[(.*?)\\\]/g, '$$$$$1$$$$')
    .replace(/&nbsp;/g, ' ')
    .replace(/\\\\/g, '\\');

  const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

  return (
    <span className="break-words leading-relaxed">
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(math, { displayMode: true, throwOnError: false, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="block my-3 text-center overflow-x-auto custom-scrollbar" />;
          } catch (e) { return <span key={index} className="text-rose-500 font-mono text-[13px] bg-rose-50 px-1 rounded">{part}</span>; }
        }
        
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(math, { displayMode: false, throwOnError: false, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="px-0.5 inline-block" />;
          } catch (e) { return <span key={index} className="text-rose-500 font-mono text-[13px] bg-rose-50 px-1 rounded">{part}</span>; }
        }
        
        return (
          <span key={index}>
            {part.split('\n').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </span>
        );
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
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 relative group">
      <div className="flex justify-between items-start gap-4 mb-5 pb-4 border-b border-slate-100">
        <div className="flex items-center flex-wrap gap-2 flex-1 min-w-0">
          <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 border border-indigo-100/50 shrink-0">
            <Sparkles size={12} className="text-indigo-500" /> Q{idx + 1}
          </span>
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

        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => setShowOptions(!showOptions)} className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-md transition-colors"><Eye size={16} /></button>
          <button onClick={() => setShowExplanation(!showExplanation)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-md transition-colors"><BookOpen size={16} /></button>
          <div className="w-px h-4 bg-slate-200 mx-1"></div>
          <button onClick={() => onRemove(q.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors"><Trash2 size={16} /></button>
        </div>
      </div>
      
      <p className="font-semibold text-[15px] text-slate-900 mb-6 leading-relaxed"><FormattedText text={getText(q.question)} /></p>
      
      {showOptions && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
          {Object.entries(q.options).map(([key, value]) => {
            const isCorrect = q.answer === key;
            return (
              <div key={key} className={`flex items-start p-3 rounded-xl border-2 transition-all ${isCorrect ? 'bg-indigo-50/40 border-indigo-500/30' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black mr-3 shrink-0 mt-0.5 transition-colors ${isCorrect ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' : 'bg-slate-100 text-slate-500'}`}>{key}</div>
                <div className={`text-sm font-medium pt-0.5 break-words overflow-hidden ${isCorrect ? 'text-indigo-950' : 'text-slate-700'}`}><FormattedText text={getText(value)} /></div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="mt-2 pt-4 border-t border-slate-50 flex justify-start">
        <button onClick={() => setShowExplanation(!showExplanation)} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] font-bold transition-all duration-300 ${showExplanation ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:shadow-sm'}`}>
          <Sparkles size={16} className={showExplanation ? "text-indigo-500" : "text-indigo-400"} />
          {showExplanation ? "Yechimni yashirish" : "AI Yechimni ko'rish"}
        </button>
      </div>

      {showExplanation && (
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mt-4 animate-in fade-in slide-in-from-top-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Sparkles size={14} className="text-indigo-400" /> AI Yechim Mantiqi</p>
          <p className="text-[13.5px] text-slate-700 leading-relaxed font-medium"><FormattedText text={getText(q.explanation)} /></p>
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
  const [searchQuery, setSearchQuery] = useState("");

  // 🟢 AI LIMIT BLOCK START
  const aiData = useAiLimits(); 
  // 🔴 AI LIMIT BLOCK END

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [syllabusData, setSyllabusData] = useState<any>(null);
  const [isLoadingSyllabus, setIsLoadingSyllabus] = useState(false);

  const availableClasses = Object.keys(structureMap).sort((a, b) => parseInt(a) - parseInt(b));
  // @ts-ignore
  const availableSubjects = selectedClass ? (structureMap[selectedClass] || []) : [];
  
  const difficulties = [
    { id: "easy", label: "Oson", color: "hover:border-emerald-400 hover:bg-emerald-50", active: "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20" },
    { id: "medium", label: "O'rtacha", color: "hover:border-blue-400 hover:bg-blue-50", active: "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20" },
    { id: "hard", label: "Qiyin", color: "hover:border-indigo-400 hover:bg-indigo-50", active: "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20" },
  ];
  
  const [selectedChapterIndex, setSelectedChapterIndex] = useState("");
  const [selectedSubtopicIndex, setSelectedSubtopicIndex] = useState("");
  const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false);

  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<AIQuestion[]>([]);
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [testTitle, setTestTitle] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 

  // 🟢 AI LIMIT BLOCK START: State for the upgrade modal
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  // 🔴 AI LIMIT BLOCK END

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
    if (generatedQuestions.length > 0 && !isGenerating) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [generatedQuestions, isGenerating]);

  const handleGenerate = async () => {
    if (!isReadyToGenerate) return toast.error("Iltimos, barcha maydonlarni tanlang.");

    // 🟢 AI LIMIT BLOCK START: Intercept the click if out of credits!
    if (aiData?.isLimitReached || (aiData && count > aiData.remaining)) {
      setIsLimitModalOpen(true);
      return; 
    }
    // 🔴 AI LIMIT BLOCK END

    setIsGenerating(true);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);

    try {
      const response = await fetch("/teacher/create/maktab/api", {
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
      if (!response.ok) throw new Error(data.error);

      const diffVal = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;

      const enrichedQuestions: AIQuestion[] = data.questions.map((q: any) => ({
        ...q,
        id: `tq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        
        // 🟢 TEXT-FIRST: Using pure strings from state and syllabus.json
        subject: formatSubjectName(selectedSubject), // e.g. "Matematika"
        topic: syllabusData.category,                // e.g. "5-sinf"
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

    // 🟢 TEXT-FIRST: Grab clean names directly. No Maps, no IDs!
    const formattedTopic = syllabusData.category;                // e.g., "5-sinf"
    const formattedSubject = formatSubjectName(selectedSubject); // e.g., "Matematika"
    
    const currentTimestampString = new Date().toISOString();

    for (const q of generatedQuestions) {
      const secureFirebaseId = doc(collection(db, "teacher_questions")).id;
      const finalQ = {
        ...q,
        id: `tq_${secureFirebaseId}`, 
        creatorId: user.uid, 
        number: "", 
        
        // 🟢 Database is now completely human-readable
        subject: formattedSubject,           
        topic: formattedTopic,               
        chapter: q.chapter,           
        subtopic: q.subtopic,         
        difficulty: q.uiDifficulty.toLowerCase(),
        difficultyId: q.difficultyId, 
        
        tags: ["maktab_ai", q.subtopic.toLowerCase(), q.chapter.toLowerCase()],
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
      
      // 🟢 Save the container cleanly
      subjectName: formattedSubject,
      topicName: formattedTopic,
      chapterName: generatedQuestions[0]?.chapter || "Aralash",
      subtopicName: generatedQuestions[0]?.subtopic || "Aralash",
      
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
    <div className="flex h-[100dvh] bg-[#FAFAFA] overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* 🟢 NEW: AI THINKING FULL-SCREEN MODAL */}
      <AiThinkingModal isVisible={isGenerating} />

      {/* ========================================================= */}
      {/* 🟢 AI LIMIT BLOCK START: The Limit Reached / Upgrade Modal */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isLimitModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsLimitModalOpen(false)} />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl z-10 flex flex-col items-center text-center">
              
              <button onClick={() => setIsLimitModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>

              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-5 border border-rose-100 shadow-inner">
                <Zap size={28} className="text-rose-500" />
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-2">
                {aiData?.isLimitReached ? "Kunlik limit tugadi" : "Limit yetarli emas"}
              </h3>
              
              <p className="text-[14px] text-slate-500 mb-6 font-medium leading-relaxed">
                {aiData?.isLimitReached 
                  ? "Siz bugungi bepul kunlik limitingizni tugatdingiz. Cheklovsiz foydalanish uchun profilingizni yangilang." 
                  : `Sizda bugun uchun faqatgina ${aiData?.remaining} ta bepul limit qoldi. Iltimos, so'ralayotgan miqdorni kamaytiring yoki limitni oshiring.`}
              </p>

              <div className="w-full flex flex-col gap-3">
                <button 
                  onClick={() => window.open('https://t.me/Umidjon0339', '_blank')} 
                  className="w-full py-3.5 bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Limitni oshirish
                </button>
                
                <button 
                  onClick={() => setIsLimitModalOpen(false)} 
                  className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors active:scale-[0.98]"
                >
                  Orqaga qaytish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* 🔴 AI LIMIT BLOCK END */}
      {/* ========================================================= */}
      
      {/* --- SYLLABUS SELECTION MODAL --- */}
      <AnimatePresence>
        {isSyllabusModalOpen && syllabusData && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setIsSyllabusModalOpen(false); setSearchQuery(""); }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden z-10">
              
              <div className="p-6 border-b border-slate-100 flex flex-col gap-5 bg-slate-50/50">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Mavzuni tanlang</h3>
                    {/* 🟢 THE FIX: Format the Subject nicely in the title */}
                    <p className="text-slate-500 text-sm mt-1">{selectedClass} • {formatSubjectName(selectedSubject)}</p>
                  </div>
                  <button onClick={() => { setIsSyllabusModalOpen(false); setSearchQuery(""); }} className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Mavzu nomini qidiring..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-[14px] font-medium text-slate-800 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#FAFAFA]">
                {syllabusData.chapters.map((chapter: any) => {
                  const filteredSubtopics = chapter.subtopics.filter((sub: any) => 
                    sub.name.toLowerCase().includes(searchQuery.toLowerCase())
                  );

                  if (filteredSubtopics.length === 0) return null;

                  return (
                    <div key={chapter.index} className="mb-8 last:mb-0 animate-in fade-in">
                      <h4 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <BookMarked size={16} /> {chapter.chapter}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {filteredSubtopics.map((sub: any) => {
                          const isSelected = selectedChapterIndex === chapter.index.toString() && selectedSubtopicIndex === sub.index.toString();
                          return (
                            <button 
                              key={sub.index}
                              onClick={() => {
                                setSelectedChapterIndex(chapter.index.toString());
                                setSelectedSubtopicIndex(sub.index.toString());
                                setIsSyllabusModalOpen(false);
                                setSearchQuery(""); 
                              }}
                              className={`text-left p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between h-full min-h-[90px] ${isSelected ? 'bg-indigo-50 border-indigo-500 shadow-md ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-sm'}`}
                            >
                              <span className={`text-[13.5px] font-bold leading-snug ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{sub.name}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase mt-3">Mavzu {sub.index}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {syllabusData.chapters.every((c: any) => c.subtopics.filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0) && (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Search size={32} className="mb-3 opacity-50" />
                    <p className="font-medium text-[15px]">"{searchQuery}" bo'yicha mavzu topilmadi</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- TITLE & CONFIG MODALS --- */}
      <AnimatePresence>
        {isTitleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTitleModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-100 z-10">
              <h3 className="text-xl font-black text-slate-900 mb-2">Test nomini kiriting</h3>
              <p className="text-[14px] text-slate-500 mb-6 font-medium">Yaratilgan testni saqlashdan oldin nom bering.</p>
              <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} placeholder="Masalan: 1-chorak nazorati" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all mb-8" autoFocus/>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setIsTitleModalOpen(false)} className="px-5 py-2.5 font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">Bekor qilish</button>
                <button onClick={handleTitleSubmit} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2">Keyingi qadam</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TestConfigurationModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={handleFinalPublish} questionCount={generatedQuestions.length} testTitle={testTitle} isSaving={isPublishing} />

      {/* --- SIDEBAR --- */}
      <aside className={`absolute lg:relative w-[360px] bg-white border-r border-slate-200 flex flex-col h-full z-50 shrink-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col">
          <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/teacher/create')} className="p-1.5 -ml-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all"><ArrowLeft size={18} /></button>
              <h2 className="font-bold text-[16px] text-slate-900 tracking-tight flex items-center gap-2">
                <Layers size={18} className="text-indigo-600"/> Maktab Dasturi
              </h2>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1.5 text-slate-400 hover:bg-slate-100 rounded-md"><X size={18} /></button>
          </div>
          
          <div className="space-y-7 flex-1">
            
            {/* 1. CLASS PILLS */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">1. Sinfni tanlang</label>
              <div className="flex flex-wrap gap-2">
                {availableClasses.map(c => (
                  <button 
                    key={c} 
                    onClick={() => {
                      setSelectedClass(c);
                      // @ts-ignore
                      if (!structureMap[c]?.includes(selectedSubject)) {
                        setSelectedSubject("");
                        setSyllabusData(null);
                        setSelectedChapterIndex("");
                        setSelectedSubtopicIndex("");
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-bold border transition-all ${selectedClass === c ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. SUBJECT PILLS */}
            <div className={!selectedClass ? 'opacity-40 pointer-events-none grayscale transition-all' : 'transition-all'}>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">2. Fanni tanlang</label>
              <div className="flex flex-wrap gap-2">
                {availableSubjects.map((s: string) => (
                  <button 
                    key={s} 
                    onClick={() => setSelectedSubject(s)}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-bold border transition-all ${selectedSubject === s ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'}`}
                  >
                    {/* 🟢 THE FIX: Safely render formatted Subject Name */}
                    {formatSubjectName(s)}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. SYLLABUS CARD BUTTON */}
            <div className={(!selectedClass || !selectedSubject) ? 'opacity-40 pointer-events-none grayscale transition-all' : 'transition-all'}>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block flex justify-between items-center">
                3. O'quv mavzusi
                {isLoadingSyllabus && <Loader2 size={12} className="animate-spin text-indigo-500"/>}
              </label>
              
              <button 
                onClick={() => setIsSyllabusModalOpen(true)}
                disabled={isLoadingSyllabus || !syllabusData}
                className="w-full bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-400 p-4 rounded-xl text-left transition-all group flex items-center justify-between shadow-sm"
              >
                {activeChapter && activeSubtopic ? (
                  <div>
                     <div className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-1">{activeChapter.chapter}</div>
                     <div className="text-[14px] font-bold text-slate-800 leading-snug">{activeSubtopic.name}</div>
                  </div>
                ) : (
                  <span className="text-[14px] font-bold text-slate-400">Mavzuni tanlang...</span>
                )}
                <ChevronRight size={18} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </button>
            </div>

            {/* 4. DIFFICULTY GRID */}
            <div className={!isReadyToGenerate ? 'opacity-40 pointer-events-none grayscale transition-all' : 'transition-all'}>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">4. Qiyinlik darajasi</label>
              <div className="grid grid-cols-3 gap-2">
                {difficulties.map(diff => {
                  const isSelected = difficulty === diff.id;
                  return (
                    <button 
                      key={diff.id} onClick={() => setDifficulty(diff.id)}
                      className={`py-2.5 px-2 rounded-xl text-[13px] font-bold border transition-all text-center ${isSelected ? diff.active : `bg-white border-slate-200 text-slate-600 ${diff.color}`}`}
                    >
                      {diff.label}
                    </button>
                  )
                })}
              </div>
            </div>

          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="sticky bottom-0 bg-white p-5 pt-4 border-t border-slate-100 z-20 mt-auto">
            <div className="flex flex-col gap-2 mb-5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Savollar soni</label>
              <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200/60 shadow-inner h-[46px]">
                <button onClick={() => setCount(prev => Math.max(1, prev - 1))} className="w-10 h-full flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all disabled:opacity-40" disabled={count <= 1}><Minus size={16} strokeWidth={2.5} /></button>
                <div className="flex-1 text-center flex items-center justify-center flex-col">
                  <span className="text-[15px] font-black text-slate-800 leading-none">{count}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Savol</span>
                </div>
                
                {/* 🟢 AI LIMIT BLOCK START: Limit Plus Button */}
                <button 
                  onClick={() => setCount(prev => Math.min(15, aiData?.remaining ?? 15, prev + 1))} 
                  className="w-10 h-full flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all disabled:opacity-40" 
                  disabled={count >= 15 || count >= (aiData?.remaining ?? 15)}
                >
                  <Plus size={16} strokeWidth={2.5} />
                </button>
                {/* 🔴 AI LIMIT BLOCK END */}

              </div>
            </div>

            {/* 🟢 AI LIMIT BLOCK START: Contextual Helper Text */}
            {aiData && !aiData.isLimitReached && aiData.remaining < 15 && (
              <p className="text-[11px] font-medium text-amber-600 mb-3 px-1 text-center">
                Sizda faqat <span className="font-bold">{aiData.remaining} ta</span> savol yaratish limiti qoldi.
              </p>
            )}
            {/* 🔴 AI LIMIT BLOCK END */}

            <button 
              onClick={handleGenerate} 
              // 🟢 AI LIMIT BLOCK START: Removed limit lock from disabled 
              disabled={isGenerating || !isReadyToGenerate} 
              // 🔴 AI LIMIT BLOCK END
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm text-[14px]"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />} {isGenerating ? "Yaratilmoqda..." : "Yaratish"}
            </button>
        </div>
      </aside>

      {/* --- MAIN CANVAS --- */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative w-full">
        
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"><Menu size={20} /></button>
            <div className="flex items-center gap-4">
              <h1 className="text-[16px] md:text-[18px] font-bold text-slate-900 tracking-tight">AI Qoralama</h1>
              {generatedQuestions.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-200/60 animate-in fade-in">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                  <span className="text-[11px] font-bold text-indigo-700 tracking-wide uppercase">{generatedQuestions.length} Savol</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* 🟢 AI LIMIT BLOCK START */}
            <AiLimitCard aiData={aiData} />
            {/* 🔴 AI LIMIT BLOCK END */}

            <button onClick={handleInitiatePublish} disabled={isPublishing || isGenerating || generatedQuestions.length === 0} className="bg-slate-900 hover:bg-slate-800 text-white px-4 md:px-5 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 text-[13px] md:text-[14px]">
               <CheckCircle2 size={16} /> <span className="hidden sm:inline">Nashr qilish</span>
            </button>
          </div>
        </div>

        <div className="max-w-[800px] mx-auto p-4 md:p-8 space-y-6">
          {generatedQuestions.length === 0 && !isGenerating ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-[50vh] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-white mt-6 p-6 text-center shadow-sm">
              <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 border border-indigo-100"><Sparkles size={24} className="text-indigo-400" /></div>
              <p className="font-bold text-slate-600 text-[16px]">Yaratishga tayyor.</p>
              <p className="text-[14px] text-slate-400 mt-1">Chap tomondan o'quv dasturini tanlang va savol yarating.</p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {generatedQuestions.map((q, idx) => (
                <AIQuestionCard key={q.id} q={q} idx={idx} onRemove={removeQuestion} />
              ))}

              {isGenerating && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-50/50 to-transparent w-[200%] animate-[shimmer_2s_infinite]" />
                  <div className="flex items-center gap-3 mb-6"><div className="w-20 h-6 bg-slate-100 rounded-full" /><div className="w-32 h-6 bg-slate-50 rounded-full" /></div>
                  <div className="w-3/4 h-5 bg-slate-100 rounded-lg mb-6" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[1, 2, 3, 4].map(i => <div key={i} className="w-full h-12 bg-slate-50 rounded-xl border border-slate-100" />)}</div>
                </div>
              )}

              {/* 🟢 "Add More" Message after the last card */}
              {!isGenerating && generatedQuestions.length > 0 && (
                <div className="py-10 flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
                  <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3"><Layers size={18} /></div>
                  <p className="text-[14px] font-bold text-slate-600">Yana savol qo'shmoqchimisiz?</p>
                  <p className="text-[13px] text-slate-400 mt-1 max-w-[280px]">Mavzu yoki qiyinlikni o'zgartirib, "Yaratish" tugmasini yana bir bor bosing.</p>
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
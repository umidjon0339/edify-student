"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Loader2, CheckCircle2, Wand2, BookOpen, Trash2, Layers, EyeOff, Eye, Menu, X, Minus, Plus, ChevronRight, BookMarked, Search } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { motion, AnimatePresence } from "framer-motion";
import TestConfigurationModal from "@/app/teacher/create/_components/TestConfigurationModal";

// 🟢 INSTANT LOAD: Replaces the slow API call for folder structures
import structureMap from "@/data/ixtisoslashtirilgan_maktab/structure.json";

// --- TYPES ---
interface AIQuestion {
  id: string;
  uiDifficulty: string;
  question: { uz: string; ru: string; en: string };
  options: { A: { uz: string; ru: string; en: string }; B: { uz: string; ru: string; en: string }; C: { uz: string; ru: string; en: string }; D: { uz: string; ru: string; en: string }; };
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

// --- COMPONENTS ---
const FormattedText = ({ text }: { text: string }) => {
  if (!text) return null;
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

  return (
    <span className="break-words">
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2);
          try {
            const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="block my-2 text-center overflow-x-auto" />;
          } catch (e) { return <span key={index} className="text-red-500 font-mono text-sm">{part}</span>; }
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1);
          try {
            const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="px-0.5 inline-block" />;
          } catch (e) { return <span key={index} className="text-red-500 font-mono text-sm">{part}</span>; }
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

const AIQuestionCard = ({ q, idx, onRemove }: { q: AIQuestion, idx: number, onRemove: (id: string) => void }) => {
  const [showOptions, setShowOptions] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 relative group">
      <div className="flex justify-between items-start gap-4 mb-5 pb-4 border-b border-slate-100">
        <div className="flex items-center flex-wrap gap-2 flex-1 min-w-0">
          <span className="bg-amber-50 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 border border-amber-100/50 shrink-0">
            <Sparkles size={12} className="text-amber-500" /> Q{idx + 1}
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
          <button onClick={() => setShowExplanation(!showExplanation)} className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 p-1.5 rounded-md transition-colors"><BookOpen size={16} /></button>
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
              <div key={key} className={`flex items-start p-3 rounded-xl border-2 transition-all ${isCorrect ? 'bg-amber-50/40 border-amber-500/30' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black mr-3 shrink-0 mt-0.5 transition-colors ${isCorrect ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20' : 'bg-slate-100 text-slate-500'}`}>{key}</div>
                <div className={`text-sm font-medium pt-0.5 break-words overflow-hidden ${isCorrect ? 'text-amber-950' : 'text-slate-700'}`}><FormattedText text={value.uz} /></div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="mt-2 pt-4 border-t border-slate-50">
        <button onClick={() => setShowExplanation(!showExplanation)} className="text-[13px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1.5 transition-colors">
          {showExplanation ? <EyeOff size={14} /> : <Eye size={14} />} {showExplanation ? "Yechimni yashirish" : "Yechimni ko'rish"}
        </button>
      </div>

      {showExplanation && (
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mt-4 animate-in fade-in slide-in-from-top-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Sparkles size={14} className="text-amber-500" /> AI Yechim Mantiqi</p>
          <p className="text-[13.5px] text-slate-700 leading-relaxed font-medium"><FormattedText text={q.explanation.uz} /></p>
        </div>
      )}
    </div>
  );
};

// --- MAIN PAGE ---
export default function IxtisoslashtirilganGeneratorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const difficulties = [
    { id: "easy", label: "Oson", color: "hover:border-emerald-400 hover:bg-emerald-50", active: "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20" },
    { id: "medium", label: "O'rtacha", color: "hover:border-blue-400 hover:bg-blue-50", active: "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20" },
    { id: "hard", label: "Murakkab", color: "hover:border-amber-400 hover:bg-amber-50", active: "border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-500/20" },
    { id: "olympiad", label: "Olimpiada", color: "hover:border-purple-400 hover:bg-purple-50", active: "border-purple-500 bg-purple-50 text-purple-700 ring-2 ring-purple-500/20" }
  ];

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  
  // 🟢 DERIVE DYNAMIC CLASSES & SUBJECTS FROM JSON MAP
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
  const [testTitle, setTestTitle] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 

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
    if (generatedQuestions.length > 0 && !isGenerating) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [generatedQuestions, isGenerating]);

  const handleGenerate = async () => {
    if (!isReadyToGenerate) return toast.error("Iltimos, barcha maydonlarni tanlang.");
    setIsGenerating(true);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);

    try {
      const response = await fetch("/teacher/create/ixtisoslashtirilgan_maktab/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

      let diffVal = 1;
      if (difficulty === "easy") diffVal = 1;
      else if (difficulty === "medium") diffVal = 2;
      else if (difficulty === "hard") diffVal = 3;
      else if (difficulty === "olympiad") diffVal = 4;

      const enrichedQuestions: AIQuestion[] = data.questions.map((q: any) => ({
        id: `tq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        question: { uz: q.question || "", ru: "", en: "" },
        options: { A: { uz: q.options?.A || "", ru: "", en: "" }, B: { uz: q.options?.B || "", ru: "", en: "" }, C: { uz: q.options?.C || "", ru: "", en: "" }, D: { uz: q.options?.D || "", ru: "", en: "" } },
        answer: q.answer || "A",
        explanation: { uz: q.explanation || "", ru: "", en: "" },
        topicId: selectedClass, 
        chapterId: activeChapter.index.toString().padStart(2, '0'),
        subtopicId: activeSubtopic.index.toString().padStart(2, '0'),
        subject: selectedSubject,
        topic: selectedClass,
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

    const SUBJECT_MAP: Record<string, string> = { "matematika": "01", "fizika": "02", "ona-tili": "03", "ingliz-tili": "04", "algebra": "05", "geometriya": "06" };
    const currentSubjectId = SUBJECT_MAP[selectedSubject.toLowerCase()] || "99";
    const currentTopicId = selectedClass.toLowerCase().replace("-sinf", "").trim(); 
    const formattedSubject = selectedSubject.charAt(0).toUpperCase() + selectedSubject.slice(1).toLowerCase().replace("-", " ");
    const formattedTopic = selectedClass.toLowerCase(); 
    const currentTimestampString = new Date().toISOString();

    for (const q of generatedQuestions) {
      const secureFirebaseId = doc(collection(db, "teacher_questions")).id;
      const finalQ = {
        ...q,
        id: `tq_${secureFirebaseId}`, 
        creatorId: user.uid, 
        number: "", 
        subjectId: currentSubjectId,  
        topicId: currentTopicId,      
        chapterId: q.chapterId,       
        subtopicId: q.subtopicId,     
        difficultyId: q.difficultyId, 
        subject: formattedSubject,           
        topic: formattedTopic,               
        chapter: q.chapter,           
        subtopic: q.subtopic,         
        difficulty: q.uiDifficulty.toLowerCase(),
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
      topicId: currentTopicId, 
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
    <div className="flex h-[100dvh] bg-[#FAFAFA] overflow-hidden font-sans selection:bg-amber-100 selection:text-amber-900">
      
      <AnimatePresence>
        {isSyllabusModalOpen && syllabusData && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setIsSyllabusModalOpen(false); setSearchQuery(""); }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden z-10">
              
              <div className="p-6 border-b border-slate-100 flex flex-col gap-5 bg-slate-50/50">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Mavzuni tanlang</h3>
                    <p className="text-slate-500 text-sm mt-1">{selectedClass} • {selectedSubject.charAt(0).toUpperCase() + selectedSubject.slice(1)}</p>
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all text-[14px] font-medium text-slate-800 placeholder:text-slate-400"
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
                      <h4 className="text-sm font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
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
                              className={`text-left p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between h-full min-h-[90px] ${isSelected ? 'bg-amber-50 border-amber-500 shadow-md ring-2 ring-amber-500/20' : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-sm'}`}
                            >
                              <span className={`text-[13.5px] font-bold leading-snug ${isSelected ? 'text-amber-900' : 'text-slate-700'}`}>{sub.name}</span>
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

      <AnimatePresence>
        {isTitleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTitleModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-100 z-10">
              <h3 className="text-xl font-black text-slate-900 mb-2">Test nomini kiriting</h3>
              <p className="text-[14px] text-slate-500 mb-6 font-medium">Yaratilgan testni saqlashdan oldin nom bering.</p>
              <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} placeholder="Masalan: Olimpiada tayyorgarligi" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-500 transition-all mb-8" autoFocus/>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setIsTitleModalOpen(false)} className="px-5 py-2.5 font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">Bekor qilish</button>
                <button onClick={handleTitleSubmit} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2">Keyingi qadam</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TestConfigurationModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={handleFinalPublish} questionCount={generatedQuestions.length} testTitle={testTitle} isSaving={isPublishing} />

      <aside className={`absolute lg:relative w-[360px] bg-white border-r border-slate-200 flex flex-col h-full z-50 shrink-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col">
          <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/teacher/create')} className="p-1.5 -ml-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all"><ArrowLeft size={18} /></button>
              <h2 className="font-bold text-[16px] text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500"/> Ixtisos. Dastur
              </h2>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1.5 text-slate-400 hover:bg-slate-100 rounded-md"><X size={18} /></button>
          </div>
          
          <div className="space-y-7 flex-1">
            
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block flex items-center justify-between">
                1. Sinfni tanlang
              </label>
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
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-bold border transition-all ${selectedClass === c ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className={!selectedClass ? 'opacity-40 pointer-events-none grayscale transition-all' : 'transition-all'}>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">2. Fanni tanlang</label>
              <div className="flex flex-wrap gap-2">
                {availableSubjects.map((s: string) => (
                  <button 
                    key={s} 
                    onClick={() => setSelectedSubject(s)}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-bold border transition-all capitalize ${selectedSubject === s ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50'}`}
                  >
                    {s.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className={(!selectedClass || !selectedSubject) ? 'opacity-40 pointer-events-none grayscale transition-all' : 'transition-all'}>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block flex justify-between items-center">
                3. O'quv mavzusi
                {isLoadingSyllabus && <Loader2 size={12} className="animate-spin text-amber-500"/>}
              </label>
              
              <button 
                onClick={() => setIsSyllabusModalOpen(true)}
                disabled={isLoadingSyllabus || !syllabusData}
                className="w-full bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-400 p-4 rounded-xl text-left transition-all group flex items-center justify-between shadow-sm"
              >
                {activeChapter && activeSubtopic ? (
                  <div>
                     <div className="text-[11px] font-black text-amber-600 uppercase tracking-widest mb-1">{activeChapter.chapter}</div>
                     <div className="text-[14px] font-bold text-slate-800 leading-snug">{activeSubtopic.name}</div>
                  </div>
                ) : (
                  <span className="text-[14px] font-bold text-slate-400">Mavzuni tanlang...</span>
                )}
                <ChevronRight size={18} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
              </button>
            </div>

            <div className={!isReadyToGenerate ? 'opacity-40 pointer-events-none grayscale transition-all' : 'transition-all'}>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">4. Qiyinlik darajasi</label>
              <div className="grid grid-cols-2 gap-2">
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

        <div className="sticky bottom-0 bg-white p-5 pt-4 border-t border-slate-100 z-20 mt-auto">
            <div className="flex flex-col gap-2 mb-5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Savollar soni</label>
              <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200/60 shadow-inner h-[46px]">
                <button onClick={() => setCount(prev => Math.max(1, prev - 1))} className="w-10 h-full flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all disabled:opacity-40" disabled={count <= 1}><Minus size={16} strokeWidth={2.5} /></button>
                <div className="flex-1 text-center flex items-center justify-center flex-col">
                  <span className="text-[15px] font-black text-slate-800 leading-none">{count}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Savol</span>
                </div>
                <button onClick={() => setCount(prev => Math.min(15, prev + 1))} className="w-10 h-full flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all disabled:opacity-40" disabled={count >= 15}><Plus size={16} strokeWidth={2.5} /></button>
              </div>
            </div>

            <button onClick={handleGenerate} disabled={isGenerating || !isReadyToGenerate} className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm text-[14px]">
              {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />} {isGenerating ? "Yaratilmoqda..." : "Yaratish"}
            </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto custom-scrollbar relative w-full">
        
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition-colors"><Menu size={20} /></button>
            <div className="flex items-center gap-4">
              <h1 className="text-[16px] md:text-[18px] font-bold text-slate-900 tracking-tight">AI Qoralama</h1>
              {generatedQuestions.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full border border-amber-200/60 animate-in fade-in">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                  <span className="text-[11px] font-bold text-amber-700 tracking-wide uppercase">{generatedQuestions.length} Savol</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={handleInitiatePublish} disabled={isPublishing || isGenerating || generatedQuestions.length === 0} className="bg-slate-900 hover:bg-slate-800 text-white px-4 md:px-5 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 text-[13px] md:text-[14px]">
               <CheckCircle2 size={16} /> <span className="hidden sm:inline">Nashr qilish</span>
            </button>
          </div>
        </div>

        <div className="max-w-[800px] mx-auto p-4 md:p-8 space-y-6">
          {generatedQuestions.length === 0 && !isGenerating ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-[50vh] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-white mt-6 p-6 text-center shadow-sm">
              <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center mb-4 border border-amber-100"><Sparkles size={24} className="text-amber-400" /></div>
              <p className="font-bold text-slate-600 text-[16px]">Yaratishga tayyor.</p>
              <p className="text-[14px] text-slate-400 mt-1">Chap tomondan o'quv dasturini tanlang va murakkab savollar yarating.</p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {generatedQuestions.map((q, idx) => (
                <AIQuestionCard key={q.id} q={q} idx={idx} onRemove={removeQuestion} />
              ))}

              {isGenerating && (
                <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-50/50 to-transparent w-[200%] animate-[shimmer_2s_infinite]" />
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
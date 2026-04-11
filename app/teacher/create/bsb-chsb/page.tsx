"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, CheckCircle2, Loader2, Sparkles, Wand2, 
  BookOpen, Plus, Minus, AlignLeft, Type, 
  GripVertical, Check, Zap, X, ChevronDown, ChevronRight, 
  Trash2, Building2, GraduationCap, CheckSquare, Bot,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/AuthContext";
import AiLimitCard from "@/app/teacher/create/_components/AiLimitCard";
import { useAiLimits } from "@/hooks/useAiLimits";
import { db } from "@/lib/firebase";
import { doc, collection, writeBatch, serverTimestamp } from "firebase/firestore";
import katex from 'katex';
import 'katex/dist/katex.min.css';

// --- IMPORT BOTH CURRICULUMS ---
import maktabMap from "@/data/maktab/structure.json";
import ixtisosMap from "@/data/ixtisoslashtirilgan_maktab/structure.json";

// --- TYPES ---
type SchoolType = "maktab" | "ixtisos";
type AssessmentType = "BSB" | "CHSB";
type Difficulty = "Aralash" | "Oson" | "O'rta" | "Qiyin";

interface QuestionConfig {
  id: "mcq" | "short_answer" | "open_ended" | "matching" | "true_false";
  icon: any;
  label: string;
  enabled: boolean;
  count: number;
  points: number;
}

// ============================================================================
// 1. AI THINKING MODAL (PORTAL)
// ============================================================================
const AiThinkingModal = ({ isVisible }: { isVisible: boolean }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  const phrases = [
    "Matritsa tahlil qilinmoqda...",
    "Mavzularga oid ma'lumotlar o'qilmoqda...",
    "Qiyinlik darajasi moslashtirilmoqda...",
    "Savollar va javoblar yozilmoqda...",
    "Formula va chizmalar tekshirilmoqda...",
    "Yakuniy imtihon qog'ozi yig'ilmoqda..."
  ];
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => setPhraseIndex((prev) => (prev + 1) % phrases.length), 2500); 
    return () => clearInterval(interval);
  }, [isVisible, phrases.length]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative w-full max-w-sm bg-white/95 backdrop-blur-2xl rounded-[2rem] border border-white/50 shadow-2xl p-8 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-indigo-500/20 rounded-full blur-[60px] animate-pulse"></div>
            <div className="absolute bottom-[-30%] right-[-20%] w-[80%] h-[80%] bg-purple-500/20 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: "1s" }}></div>
            <div className="relative mb-6 mt-2">
              <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-400 rounded-full blur-xl opacity-40" />
              <div className="relative w-20 h-20 bg-white/80 backdrop-blur-md rounded-3xl border border-white flex items-center justify-center shadow-xl">
                <Bot size={36} className="text-indigo-600 animate-bounce" style={{ animationDuration: "2s" }} />
                <Sparkles size={16} className="absolute -top-2 -right-2 text-amber-400 animate-pulse" />
              </div>
            </div>
            <h3 className="text-[18px] font-black text-slate-900 mb-2 relative z-10 tracking-tight text-center">AI Studiya ishlamoqda</h3>
            <div className="h-5 relative z-10 overflow-hidden flex items-center justify-center w-full">
              <motion.p key={phraseIndex} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.4 }} className="text-[13px] font-bold text-slate-500 absolute text-center w-full">{phrases[phraseIndex]}</motion.p>
            </div>
            <div className="w-[70%] h-1.5 bg-slate-200/50 rounded-full mt-6 overflow-hidden relative z-10">
              <motion.div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full w-[200%]" animate={{ x: ["-50%", "0%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

// ============================================================================
// 2. HELPER COMPONENTS (LATEX & EXAM CARD)
// ============================================================================
const FormattedText = ({ text }: { text: any }) => {
  if (!text) return null;
  let content = typeof text === 'string' ? text : JSON.stringify(text);

  const hasMathCommands = /\\frac|\\pi|\\sin|\\cos|\\tan|\\ge|\\le|\\cup|\\cap|\\in|\\begin|\\sqrt|\\empty/.test(content);
  if (!content.includes('$') && hasMathCommands) content = `$${content}$`;

  content = content.replace(/\\\((.*?)\\\)/g, '$$$1$$').replace(/\\\[(.*?)\\\]/g, '$$$$$1$$$$').replace(/&nbsp;/g, ' ').replace(/\\\\/g, '\\');
  const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

  return (
    <span className="break-words leading-relaxed text-slate-800">
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(math, { displayMode: true, throwOnError: false, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="block my-3 text-center overflow-x-auto custom-scrollbar" />;
          } catch (e) { return <span key={index} className="text-red-500 font-mono text-[13px] bg-red-50 px-1 rounded">{part}</span>; }
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(math, { displayMode: false, throwOnError: false, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="px-0.5 inline-block align-middle" />;
          } catch (e) { return <span key={index} className="text-red-500 font-mono text-[13px] bg-red-50 px-1 rounded">{part}</span>; }
        }
        return <span key={index}>{part.split('\n').map((line, i, arr) => (<span key={i}>{line}{i < arr.length - 1 && <br />}</span>))}</span>;
      })}
    </span>
  );
};

const ExamQuestionCard = ({ q, idx, onRemove }: { q: any, idx: number, onRemove: (id: string) => void }) => {
  const getText = (field: any) => field?.uz || field || "";

  return (
    <div className="bg-white p-5 md:p-8 rounded-[1.5rem] border border-slate-200 shadow-sm relative group mb-5 hover:border-indigo-200 transition-colors">
      <div className="absolute top-4 right-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onRemove(q.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Savolni o'chirish">
          <Trash2 size={16} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4 pr-8">
        <span className="bg-slate-900 text-white text-[11px] font-black px-2.5 py-1 rounded-md shrink-0">{idx + 1}</span>
        <span className="text-[10px] font-black text-slate-500 border border-slate-200 px-2 py-1 rounded-md uppercase tracking-widest bg-slate-50 truncate">
          {q.type.replace('_', ' ')} • {q.points} Ball
        </span>
      </div>

      <div className="text-[14px] md:text-[15px] font-bold text-slate-900 mb-5 leading-snug">
        <FormattedText text={getText(q.question)} />
      </div>

      <div className="pl-3 border-l-2 border-indigo-100">
        {q.type === "mcq" && q.options && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {Object.entries(q.options).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)).map(([key, value]) => {
              const isCorrect = q.answer === key;
              return (
                <div key={key} className={`flex items-start p-2.5 rounded-xl border ${isCorrect ? 'bg-indigo-50/80 border-indigo-200 shadow-sm' : 'bg-white border-slate-200'}`}>
                  <div className={`w-6 h-6 rounded flex items-center justify-center text-[12px] font-bold mr-3 shrink-0 ${isCorrect ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>{key}</div>
                  <div className={`text-[13px] pt-0.5 leading-snug ${isCorrect ? 'text-indigo-900 font-bold' : 'text-slate-700 font-medium'}`}><FormattedText text={getText(value)} /></div>
                </div>
              );
            })}
          </div>
        )}
        
        {q.type === "short_answer" && (
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Javob:</span>
            <span className="text-[14px] font-bold text-indigo-700"><FormattedText text={getText(q.answer)} /></span>
          </div>
        )}

        {q.type === "true_false" && (
          <div className="flex gap-2.5">
            <div className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-[13px] text-center font-bold border ${q.answer === true ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400'}`}>Rost</div>
            <div className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-[13px] text-center font-bold border ${q.answer === false ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400'}`}>Yolg'on</div>
          </div>
        )}

        {q.type === "matching" && q.pairs && (
          <div className="grid gap-2">
            {q.pairs.map((pair: any, i: number) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-700 shadow-sm leading-snug"><FormattedText text={getText(pair.left)} /></div>
                <div className="hidden sm:block text-slate-300 font-black">➔</div>
                <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-800 shadow-sm leading-snug"><FormattedText text={getText(pair.right)} /></div>
              </div>
            ))}
          </div>
        )}

        {q.type === "open_ended" && (
          <div className="space-y-3">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Namuna Yechim</span>
              <p className="text-[13px] font-medium text-slate-800 leading-relaxed"><FormattedText text={getText(q.answer)} /></p>
            </div>
            {q.rubric && (
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                <span className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-1.5 block">Baholash Mezoni</span>
                <p className="text-[13px] font-bold text-indigo-900 leading-relaxed"><FormattedText text={getText(q.rubric)} /></p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


// ============================================================================
// 3. MAIN PAGE
// ============================================================================
export default function BsbChsbGeneratorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const aiData = useAiLimits();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // --- STATE ---
  const [schoolType, setSchoolType] = useState<SchoolType>("maktab");
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("BSB");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  
  const [syllabusData, setSyllabusData] = useState<any>(null);
  const [isLoadingSyllabus, setIsLoadingSyllabus] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]); 
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);

  const [difficulty, setDifficulty] = useState<Difficulty>("Aralash");
  const [distribution, setDistribution] = useState<QuestionConfig[]>([
    { id: "mcq", icon: CheckSquare, label: "Test (MCQ)", enabled: true, count: 5, points: 2 },
    { id: "short_answer", icon: Type, label: "Qisqa javob", enabled: true, count: 2, points: 3 },
    { id: "open_ended", icon: AlignLeft, label: "Ochiq (Tahlil)", enabled: true, count: 1, points: 5 },
    { id: "matching", icon: GripVertical, label: "Moslashtirish", enabled: false, count: 1, points: 4 },
    { id: "true_false", icon: Check, label: "Rost / Yolg'on", enabled: false, count: 2, points: 1 },
  ]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  
  // MODALS STATE
  const [isClassSubjectModalOpen, setIsClassSubjectModalOpen] = useState(false);
  const [isTopicsModalOpen, setIsTopicsModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  
  const [testTitle, setTestTitle] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // --- DERIVED DATA ---
  const currentStructureMap = schoolType === "maktab" ? maktabMap : ixtisosMap;
  const availableClasses = Object.keys(currentStructureMap).sort((a, b) => parseInt(a) - parseInt(b));
  // @ts-ignore
  const availableSubjects = selectedClass ? (currentStructureMap[selectedClass] || []) : [];
  
  const totalQuestions = distribution.filter(d => d.enabled).reduce((acc, curr) => acc + curr.count, 0);
  const totalPoints = distribution.filter(d => d.enabled).reduce((acc, curr) => acc + (curr.count * curr.points), 0);

  // --- EFFECTS ---
  useEffect(() => {
    setSelectedClass(""); setSelectedSubject(""); setSyllabusData(null); setSelectedScopes([]);
  }, [schoolType]);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      setIsLoadingSyllabus(true);
      setSelectedScopes([]); setExpandedChapters([]);
      const track = schoolType === "maktab" ? "maktab" : "ixtisoslashtirilgan_maktab";
      
      fetch(`/api/syllabus?track=${track}&class=${selectedClass}&subject=${selectedSubject}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data[0]) {
            setSyllabusData(data[0]);
            if(data[0].chapters?.length > 0) setExpandedChapters([data[0].chapters[0].chapter]);
          }
        })
        .catch(() => toast.error("Syllabus topilmadi!"))
        .finally(() => setIsLoadingSyllabus(false));
    }
  }, [selectedClass, selectedSubject, schoolType]);

  useEffect(() => {
    if (generatedQuestions.length > 0 && !isGenerating) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [generatedQuestions, isGenerating]);

  // --- HANDLERS ---
  const toggleChapterExpand = (chapterName: string) => setExpandedChapters(prev => prev.includes(chapterName) ? prev.filter(c => c !== chapterName) : [...prev, chapterName]);
  const toggleSubtopic = (subtopicName: string) => setSelectedScopes(prev => prev.includes(subtopicName) ? prev.filter(s => s !== subtopicName) : [...prev, subtopicName]);
  const handleChapterCheckbox = (chapter: any) => {
    const subNames = chapter.subtopics.map((s: any) => s.name);
    const allSelected = subNames.every((name: string) => selectedScopes.includes(name));
    if (allSelected) setSelectedScopes(prev => prev.filter(s => !subNames.includes(s)));
    else setSelectedScopes(prev => Array.from(new Set([...prev, ...subNames])));
  };

  const updateDistribution = (id: string, field: "enabled" | "count" | "points", value: boolean | number) => {
    setDistribution(prev => prev.map(item => {
      if (item.id === id) {
        let finalVal = value;
        if (field === "count" && typeof value === "number") finalVal = Math.max(1, Math.min(20, value));
        if (field === "points" && typeof value === "number") finalVal = Math.max(1, Math.min(20, value));
        return { ...item, [field]: finalVal };
      }
      return item;
    }));
  };

  const handleGenerate = async () => {
    if (!selectedClass || !selectedSubject) return toast.error("Sinf va fanni tanlang.");
    if (selectedScopes.length === 0) return toast.error(`Kamida bitta mavzuni tanlang.`);
    if (totalQuestions === 0) return toast.error("Kamida bitta savol turini faollashtiring.");
    if (aiData?.isLimitReached || (aiData && totalQuestions > aiData.remaining)) return setIsLimitModalOpen(true);

    setIsGenerating(true);

    let response;
    let data;
    let retries = 3;

    while (retries > 0) {
      try {
        let selectedContexts: string[] = [];
        syllabusData?.chapters?.forEach((ch: any) => {
          ch.subtopics.forEach((sub: any) => {
            if (selectedScopes.includes(sub.name)) selectedContexts.push(`${ch.chapter}: ${sub.name}`);
          });
        });

        const payload = {
          userId: user?.uid, schoolType, assessmentType, topic: selectedClass, subject: selectedSubject,
          scopes: selectedContexts, difficulty, distribution: distribution.filter(d => d.enabled), language: "uz"
        };

        response = await fetch("/teacher/create/bsb-chsb/api", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });

        data = await response.json();
        
        if (response.ok) break;

        if (data.error?.includes("high demand") || response.status === 503) {
          retries--;
          if (retries === 0) throw new Error("Tarmoq hozirda band. Iltimos bir ozdan so'ng qayta urinib ko'ring.");
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw new Error(data.error || "Xatolik yuz berdi");
        }
      } catch (error: any) {
        if (retries === 1) {
          toast.error(error.message);
          setIsGenerating(false);
          return;
        }
      }
    }

    try {
      const enrichedQuestions = data.questions.map((q: any) => ({ ...q, id: `temp_${Math.random().toString(36).substr(2, 9)}` }));
      setGeneratedQuestions(enrichedQuestions);
      toast.success(`${totalQuestions} ta savol yaratildi!`);
    } catch(err) {
      toast.error("Savollarni o'qishda xatolik.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinalPublish = async () => {
    if (!testTitle.trim()) return toast.error("Test nomini kiriting");
    if (!user) return;
    setIsPublishing(true);
    
    try {
      const newTestRef = doc(collection(db, "bsb_chsb_tests")); 
      const examPaper = {
        id: newTestRef.id, teacherId: user.uid, teacherName: user.displayName || "Teacher",
        title: testTitle, schoolType, assessmentType, grade: selectedClass, subject: selectedSubject,
        scopesCovered: selectedScopes, totalPoints, questionCount: generatedQuestions.length,
        difficultyTarget: difficulty, questions: generatedQuestions, status: "active", createdAt: serverTimestamp(),
      };

      await writeBatch(db).set(newTestRef, examPaper).commit();
      toast.success("Imtihon muvaffaqiyatli saqlandi!");
      setIsTitleModalOpen(false);
      router.push("/teacher/library/assessments"); 
    } catch (error) {
      toast.error("Saqlashda xatolik yuz berdi.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] font-sans pb-[100px] text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 pt-[64px] md:pt-[72px]">
      
      <AiThinkingModal isVisible={isGenerating} />
      
      {/* 🟢 UNIFIED TOP BAR PORTAL (Hides Global Top Nav & Holds the Publish Button) */}
      {mounted && createPortal(
        <div className="fixed top-0 left-0 right-0 h-[64px] md:h-[72px] bg-white/95 backdrop-blur-xl border-b border-slate-200/80 z-[99999] px-4 sm:px-6 flex items-center justify-between shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => router.push('/teacher/create')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95">
              <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
            <div className="w-px h-5 bg-slate-200 hidden sm:block"></div>
            <h1 className="text-[14px] sm:text-[16px] font-black text-slate-800 tracking-tight flex items-center gap-2 truncate">
              <FileText size={16} className="text-indigo-500 hidden sm:block" /> BSB/CHSB Generatori
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* AI Limit integrated cleanly into top bar */}
            <div className="scale-[0.85] sm:scale-100 origin-right">
               <AiLimitCard aiData={aiData} />
            </div>

            {/* Seamless Publish Button visible on Mobile & PC */}
            <AnimatePresence>
              {generatedQuestions.length > 0 && !isGenerating && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => { setTestTitle(`${selectedClass} ${selectedSubject.replace(/-/g,' ')} ${assessmentType}`); setIsTitleModalOpen(true); }}
                  className="bg-slate-900 hover:bg-black text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-slate-900/20 text-[12px] sm:text-[14px]"
                >
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                  <span className="hidden sm:block">Saqlash</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>,
        document.body
      )}

      {/* 🟢 HIDE GLOBAL BOTTOM NAV PORTAL ON MOBILE (Immersive Studio Mode) */}
      {mounted && createPortal(
        <div className="fixed bottom-0 left-0 right-0 h-[calc(env(safe-area-inset-bottom)+70px)] bg-[#FAFAFA] z-[99998] sm:hidden flex items-center justify-center border-t border-slate-200">
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest relative -top-3">Studiya Rejimi</span>
        </div>,
        document.body
      )}

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 mt-6 flex flex-col lg:flex-row gap-6 md:gap-8">
        
        {/* --- LEFT: SETTINGS (MINIMAL APP LAYOUT) --- */}
        <div className="w-full lg:w-[40%] flex flex-col gap-4 md:gap-6">
          <div className="bg-white rounded-[2rem] border border-slate-200/80 p-5 md:p-6 shadow-sm">
            <div className="flex bg-slate-100/80 p-1.5 rounded-xl mb-6">
              <button onClick={() => setSchoolType('maktab')} className={`flex-1 py-2 text-[12px] md:text-[13px] font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${schoolType === 'maktab' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Building2 size={16}/> Umumta'lim
              </button>
              <button onClick={() => setSchoolType('ixtisos')} className={`flex-1 py-2 text-[12px] md:text-[13px] font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${schoolType === 'ixtisos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <GraduationCap size={16}/> Ixtisos
              </button>
            </div>

            <div className="flex gap-2.5 mb-6">
              <button onClick={() => setAssessmentType('BSB')} className={`flex-1 py-2.5 border rounded-xl text-[13px] font-bold transition-all ${assessmentType === 'BSB' ? 'border-indigo-500 text-indigo-700 bg-indigo-50/50 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>BSB</button>
              <button onClick={() => setAssessmentType('CHSB')} className={`flex-1 py-2.5 border rounded-xl text-[13px] font-bold transition-all ${assessmentType === 'CHSB' ? 'border-indigo-500 text-indigo-700 bg-indigo-50/50 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>CHSB</button>
            </div>

            <div className="space-y-2.5">
              <div onClick={() => setIsClassSubjectModalOpen(true)} className="group border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 flex justify-between items-center bg-slate-50/50 hover:bg-indigo-50/30 cursor-pointer transition-all active:scale-[0.98]">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-400 transition-colors">1. Sinf va Fan</p>
                  <p className="text-[14px] font-bold text-slate-900">{selectedClass && selectedSubject ? `${selectedClass} • ${selectedSubject.replace(/-/g, ' ')}` : "Tanlanmagan"}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-indigo-200 shadow-sm"><ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-500" /></div>
              </div>

              <div onClick={() => setIsTopicsModalOpen(true)} className={`group border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 flex justify-between items-center bg-slate-50/50 hover:bg-indigo-50/30 cursor-pointer transition-all active:scale-[0.98] ${(!selectedClass || !selectedSubject) ? 'opacity-40 pointer-events-none' : ''}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">2. Mavzular</p>
                    {isLoadingSyllabus && <Loader2 size={12} className="animate-spin text-indigo-500" />}
                  </div>
                  <p className="text-[14px] font-bold text-slate-900">{selectedScopes.length > 0 ? `${selectedScopes.length} ta tanlandi` : "Tanlanmagan"}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-indigo-200 shadow-sm"><ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-500" /></div>
              </div>
            </div>
          </div>
        </div>

        {/* --- RIGHT: MATRIX BUILDER --- */}
        <div className="w-full lg:w-[60%] flex flex-col">
          <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm flex flex-col h-full overflow-hidden">
            
            <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
              <div>
                <h2 className="text-[16px] md:text-[18px] font-black text-slate-900">3. Matritsa</h2>
                <p className="text-[12px] font-bold text-slate-400 mt-0.5">Savollar va ballarni sozlang</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-1 flex shadow-sm w-full sm:w-auto">
                {['Aralash', 'Oson', "O'rta", 'Qiyin'].map((diff) => (
                  <button key={diff} onClick={() => setDifficulty(diff as Difficulty)} className={`flex-1 sm:flex-none px-3 py-1.5 text-[11px] font-black rounded-lg transition-colors uppercase tracking-wide ${difficulty === diff ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-900'}`}>{diff}</button>
                ))}
              </div>
            </div>

            {/* COMPACT MOBILE MATRIX LIST */}
            <div className="p-4 md:p-6 flex-1 bg-white">
              <div className="space-y-3">
                {distribution.map((item) => (
                  <div key={item.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${item.enabled ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-white border-transparent opacity-60 hover:opacity-100 hover:bg-slate-50'}`}>
                    
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={item.enabled} onChange={() => updateDistribution(item.id, 'enabled', !item.enabled)} className="w-5 h-5 text-indigo-600 rounded-md border-slate-300 shadow-sm" />
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg shrink-0 ${item.enabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}><item.icon size={16} strokeWidth={2.5}/></div>
                        <span className={`text-[13px] md:text-[14px] font-bold ${item.enabled ? 'text-slate-900' : 'text-slate-500'}`}>{item.label}</span>
                      </div>
                    </div>

                    <div className={`flex items-center gap-3 ml-8 sm:ml-0 ${!item.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-[90px]">
                        <button onClick={() => updateDistribution(item.id, 'count', item.count - 1)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 active:scale-95"><Minus size={14} strokeWidth={3}/></button>
                        <span className="text-[13px] font-black text-slate-900">{item.count}</span>
                        <button onClick={() => updateDistribution(item.id, 'count', item.count + 1)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 active:scale-95"><Plus size={14} strokeWidth={3}/></button>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 shadow-sm h-9">
                        <input type="number" min="1" max="20" value={item.points} onChange={(e) => updateDistribution(item.id, 'points', parseInt(e.target.value) || 1)} className="w-6 text-center bg-transparent text-[13px] font-black text-slate-900 outline-none" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Ball</span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 md:p-6 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex justify-between items-center mb-5 px-1">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Jami Savol</p>
                  <p className="text-[22px] font-black text-slate-900 leading-none">{totalQuestions}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Jami Ball</p>
                  <p className="text-[22px] font-black text-indigo-600 leading-none">{totalPoints}</p>
                </div>
              </div>
              <button onClick={handleGenerate} disabled={isGenerating || totalQuestions === 0 || selectedScopes.length === 0} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-black text-[14px] transition-all active:scale-[0.98] shadow-md shadow-indigo-600/20 disabled:shadow-none flex items-center justify-center gap-2">
                <Wand2 size={18} strokeWidth={2.5} /> Imtihonni Yaratish
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* --- RENDER RESULTS --- */}
      <AnimatePresence>
        {generatedQuestions.length > 0 && !isGenerating && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[900px] mx-auto px-4 sm:px-6 mt-12">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-[20px] md:text-[24px] font-black text-slate-900">Imtihon Qog'ozi</h2>
                <p className="text-[13px] font-medium text-slate-500 mt-1">Savollarni tekshiring. Noto'g'ri savollarni o'chirishingiz mumkin.</p>
              </div>
              <div className="text-[12px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl shadow-sm self-start sm:self-auto uppercase tracking-wide">
                Tasdiqlangan: {generatedQuestions.reduce((acc, q) => acc + (q.points || 0), 0)} Ball
              </div>
            </div>

            <div ref={bottomRef} className="scroll-mt-24">
              {generatedQuestions.map((q, idx) => (
                <ExamQuestionCard key={q.id} q={q} idx={idx} onRemove={(id) => setGeneratedQuestions(prev => prev.filter(x => x.id !== id))} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* POPUP MODALS (WRAPPED IN PORTALS FOR Z-INDEX SAFETY) */}
      {/* ===================================================================== */}

      {/* 1. LIMIT MODAL */}
      {mounted && createPortal(
        <AnimatePresence>
          {isLimitModalOpen && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsLimitModalOpen(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl z-10 flex flex-col items-center text-center border border-slate-100">
                <button onClick={() => setIsLimitModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-5 border border-rose-100 shadow-inner"><Zap size={28} className="text-rose-500" /></div>
                <h3 className="text-[18px] font-black text-slate-900 mb-2">{aiData?.isLimitReached ? "Kunlik limit tugadi" : "Limit yetarli emas"}</h3>
                <p className="text-[13px] text-slate-500 mb-8 font-medium leading-relaxed px-2">
                  {aiData?.isLimitReached ? "Siz bugungi bepul kunlik limitingizni tugatdingiz. Cheklovsiz foydalanish uchun profilingizni yangilang." : `Sizda bugun uchun faqatgina ${aiData?.remaining} ta limit qoldi. Iltimos, matritsani kamaytiring.`}
                </p>
                <div className="w-full flex flex-col gap-2.5">
                  <button onClick={() => window.open('https://t.me/Umidjon0339', '_blank')} className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black rounded-xl shadow-md transition-all active:scale-[0.98] text-[14px]">PRO ga o'tish</button>
                  <button onClick={() => setIsLimitModalOpen(false)} className="w-full py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl active:scale-[0.98] text-[14px]">Yopish</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 2. CLASS & SUBJECT MODAL */}
      {mounted && createPortal(
        <AnimatePresence>
          {isClassSubjectModalOpen && (
            <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsClassSubjectModalOpen(false)} />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative bg-white rounded-t-[2rem] sm:rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl z-10 flex flex-col max-h-[90dvh]">
                <div className="flex justify-between items-center mb-6 shrink-0">
                  <h3 className="text-[18px] font-black text-slate-900">Sinf va Fan</h3>
                  <button onClick={() => setIsClassSubjectModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
                </div>
                
                <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2 pb-6">
                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 block">1. Sinfni tanlang</label>
                    <div className="flex flex-wrap gap-2">
                      {availableClasses.map(c => (
                        <button key={c} onClick={() => { setSelectedClass(c); setSelectedSubject(""); }} className={`px-4 py-2.5 rounded-xl text-[14px] font-bold border transition-colors ${selectedClass === c ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{c}</button>
                      ))}
                    </div>
                  </div>
                  <div className={`transition-opacity duration-300 ${!selectedClass ? 'opacity-30 pointer-events-none' : ''}`}>
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 block">2. Fanni tanlang</label>
                    <div className="flex flex-wrap gap-2">
                      {availableSubjects.map((s: string) => (
                        <button key={s} onClick={() => setSelectedSubject(s)} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold border capitalize transition-colors ${selectedSubject === s ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{s.replace(/-/g, ' ')}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 shrink-0 mt-auto">
                  <button onClick={() => setIsClassSubjectModalOpen(false)} className="w-full py-3.5 bg-slate-900 text-white font-black rounded-xl active:scale-[0.98] transition-transform text-[14px] shadow-md">Tasdiqlash</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 3. TOPICS (SYLLABUS) MODAL */}
      {mounted && createPortal(
        <AnimatePresence>
          {isTopicsModalOpen && (
            <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsTopicsModalOpen(false)} />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-2xl shadow-2xl z-10 h-[90dvh] flex flex-col overflow-hidden">
                
                <div className="p-5 md:p-6 border-b border-slate-200 flex justify-between items-center bg-white shrink-0 z-20 shadow-sm">
                  <div className="min-w-0 pr-4">
                    <h3 className="text-[17px] md:text-[18px] font-black text-slate-900 truncate">Qamrov (Mavzular)</h3>
                    <p className="text-[12px] font-bold text-indigo-600 mt-0.5 truncate">{selectedClass} • {selectedSubject.replace(/-/g, ' ')}</p>
                  </div>
                  <button onClick={() => setIsTopicsModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-full transition-colors shrink-0"><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 bg-slate-50/50">
                  {!syllabusData && !isLoadingSyllabus && <div className="text-center py-10 text-slate-400 text-[13px] font-bold">Dastur yuklanmadi. Fan tanlang.</div>}
                  {isLoadingSyllabus && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-500" size={24}/></div>}
                  
                  {syllabusData?.chapters?.map((chapter: any, cIdx: number) => {
                    const isExpanded = expandedChapters.includes(chapter.chapter);
                    const subNames = chapter.subtopics.map((s: any) => s.name);
                    const selectedCount = subNames.filter((name: string) => selectedScopes.includes(name)).length;
                    const isAllSelected = selectedCount === subNames.length && subNames.length > 0;
                    
                    return (
                      <div key={cIdx} className="mb-4 bg-white border border-slate-200 rounded-[1.25rem] overflow-hidden shadow-sm transition-all hover:border-indigo-200">
                        <div className="flex items-center p-4 cursor-pointer" onClick={() => toggleChapterExpand(chapter.chapter)}>
                          <div onClick={(e) => { e.stopPropagation(); handleChapterCheckbox(chapter); }} className="mr-3 cursor-pointer p-1">
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isAllSelected ? 'bg-indigo-600 border-indigo-600 text-white' : selectedCount > 0 ? 'bg-indigo-100 border-indigo-300 text-indigo-600' : 'bg-white border-slate-300'}`}>
                              {isAllSelected && <Check size={14} strokeWidth={3} />}
                              {!isAllSelected && selectedCount > 0 && <Minus size={14} strokeWidth={3} />}
                            </div>
                          </div>
                          <span className="flex-1 text-[13px] md:text-[14px] font-bold text-slate-800 leading-snug">{chapter.chapter}</span>
                          <div className="flex items-center gap-3 shrink-0 ml-2">
                            <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">{selectedCount}/{subNames.length}</span>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-indigo-50 text-indigo-500' : ''}`}><ChevronDown size={16} strokeWidth={2.5}/></div>
                          </div>
                        </div>
                        
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-slate-100 bg-slate-50/50">
                              <div className="p-2 space-y-1">
                                {chapter.subtopics.map((sub: any, sIdx: number) => (
                                  <label key={sIdx} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer transition-colors group">
                                    <div className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${selectedScopes.includes(sub.name) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 group-hover:border-indigo-300'}`}>
                                      {selectedScopes.includes(sub.name) && <Check size={12} strokeWidth={4} />}
                                    </div>
                                    <span className={`text-[13px] leading-snug ${selectedScopes.includes(sub.name) ? 'text-indigo-950 font-bold' : 'text-slate-600 font-medium'}`}>{sub.name}</span>
                                  </label>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 md:p-5 border-t border-slate-200 bg-white shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5">
                  <button onClick={() => setIsTopicsModalOpen(false)} className="w-full py-3.5 bg-slate-900 text-white font-black rounded-xl active:scale-[0.98] transition-transform text-[14px] shadow-md">Tanlovni Tasdiqlash</button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 4. TITLE SAVE MODAL */}
      {mounted && createPortal(
        <AnimatePresence>
          {isTitleModalOpen && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsTitleModalOpen(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-[2rem] p-6 md:p-8 w-full max-w-sm shadow-2xl z-10 border border-slate-100">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5 border border-indigo-100"><BookOpen size={24} className="text-indigo-600" /></div>
                <h3 className="text-[18px] font-black text-slate-900 mb-1.5">Hujjat nomi</h3>
                <p className="text-[12px] font-bold text-slate-500 mb-6">O'quvchilarga ko'rinadigan rasmiy nomni yozing.</p>
                
                <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-black text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all mb-6" autoFocus placeholder="Masalan: 7-sinf Biologiya CHSB"/>
                
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button onClick={() => setIsTitleModalOpen(false)} className="w-full px-4 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-[13px]">Bekor qilish</button>
                  <button onClick={handleFinalPublish} disabled={isPublishing} className="w-full px-4 py-3 bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-black rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-[13px]">
                    {isPublishing ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>}
                    {isPublishing ? "Saqlanmoqda..." : "Saqlash"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}
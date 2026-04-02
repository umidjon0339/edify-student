"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, CheckCircle2, Loader2, Sparkles, Wand2, 
  BookOpen, Plus, Minus, FileText, AlignLeft, Type, 
  GripVertical, Check, Zap, X, ChevronDown, ChevronRight, 
  Trash2, Building2, GraduationCap, CheckSquare, Bot
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
// 1. AI THINKING MODAL (INTERNAL COMPONENT)
// ============================================================================
const AiThinkingModal = ({ isVisible }: { isVisible: boolean }) => {
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

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-[2rem] border border-indigo-100/50 shadow-2xl p-8 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-indigo-500/20 rounded-full blur-[80px] animate-pulse"></div>
            <div className="absolute bottom-[-30%] right-[-20%] w-[80%] h-[80%] bg-purple-500/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "1s" }}></div>
            <div className="relative mb-8 mt-4">
              <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-400 rounded-full blur-xl opacity-40" />
              <div className="relative w-24 h-24 bg-white/80 backdrop-blur-md rounded-3xl border border-white flex items-center justify-center shadow-xl">
                <Bot size={44} className="text-indigo-600 animate-bounce" style={{ animationDuration: "2s" }} />
                <Sparkles size={20} className="absolute -top-3 -right-3 text-amber-400 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 relative z-10 tracking-tight text-center">AI Studiya ishlamoqda</h3>
            <div className="h-6 relative z-10 overflow-hidden flex items-center justify-center w-full">
              <motion.p key={phraseIndex} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.4 }} className="text-[14px] font-medium text-slate-500 absolute text-center w-full">{phrases[phraseIndex]}</motion.p>
            </div>
            <div className="w-[80%] h-1.5 bg-slate-200/50 rounded-full mt-8 overflow-hidden relative z-10">
              <motion.div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full w-[200%]" animate={{ x: ["-50%", "0%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
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
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="block my-4 text-center overflow-x-auto custom-scrollbar" />;
          } catch (e) { return <span key={index} className="text-red-500 font-mono text-[13px] bg-red-50 px-1 rounded">{part}</span>; }
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(math, { displayMode: false, throwOnError: false, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="px-0.5 inline-block" />;
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
    <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm relative group mb-6 hover:border-indigo-200 transition-colors">
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onRemove(q.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Savolni o'chirish">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="bg-slate-900 text-white text-[12px] font-bold px-3 py-1 rounded-md">{idx + 1}</span>
        <span className="text-[12px] font-semibold text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md uppercase tracking-wide bg-slate-50">
          {q.type.replace('_', ' ')} • {q.points} Ball
        </span>
      </div>

      <div className="text-[16px] font-medium text-slate-900 mb-6">
        <FormattedText text={getText(q.question)} />
      </div>

      <div className="pl-2 border-l-2 border-indigo-100">
        {q.type === "mcq" && q.options && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(q.options).map(([key, value]) => {
              const isCorrect = q.answer === key;
              return (
                <div key={key} className={`flex items-start p-3 rounded-lg border ${isCorrect ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                  <div className={`w-6 h-6 rounded flex items-center justify-center text-[12px] font-bold mr-3 shrink-0 ${isCorrect ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{key}</div>
                  <div className={`text-[14px] pt-0.5 ${isCorrect ? 'text-indigo-900 font-medium' : 'text-slate-700'}`}><FormattedText text={getText(value)} /></div>
                </div>
              );
            })}
          </div>
        )}
        
        {q.type === "short_answer" && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <span className="text-[12px] font-bold text-slate-400 uppercase mr-2">Javob:</span>
            <span className="text-[15px] font-bold text-slate-800"><FormattedText text={getText(q.answer)} /></span>
          </div>
        )}

        {q.type === "true_false" && (
          <div className="flex gap-3">
            <div className={`px-6 py-2.5 rounded-lg text-[14px] font-bold border ${q.answer === true ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-400'}`}>Rost</div>
            <div className={`px-6 py-2.5 rounded-lg text-[14px] font-bold border ${q.answer === false ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-400'}`}>Yolg'on</div>
          </div>
        )}

        {q.type === "matching" && q.pairs && (
          <div className="grid gap-2 max-w-2xl">
            {q.pairs.map((pair: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 bg-white p-3 rounded-lg border border-slate-200 text-[14px] text-slate-700 shadow-sm"><FormattedText text={getText(pair.left)} /></div>
                <div className="text-slate-400 font-bold">➔</div>
                <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[14px] font-medium text-slate-800 shadow-sm"><FormattedText text={getText(pair.right)} /></div>
              </div>
            ))}
          </div>
        )}

        {q.type === "open_ended" && (
          <div className="space-y-3 max-w-3xl">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <span className="text-[12px] font-bold text-slate-500 uppercase mb-2 block">Namuna Yechim</span>
              <p className="text-[14px] text-slate-800"><FormattedText text={getText(q.answer)} /></p>
            </div>
            {q.rubric && (
              <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100">
                <span className="text-[12px] font-bold text-indigo-600 uppercase mb-2 block">Baholash Mezoni (Rubric)</span>
                <p className="text-[13px] text-indigo-900"><FormattedText text={getText(q.rubric)} /></p>
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
    { id: "open_ended", icon: AlignLeft, label: "Ochiq savol (Tahlil)", enabled: true, count: 1, points: 5 },
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
    setSelectedClass("");
    setSelectedSubject("");
    setSyllabusData(null);
    setSelectedScopes([]);
  }, [schoolType]);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      setIsLoadingSyllabus(true);
      setSelectedScopes([]); 
      setExpandedChapters([]);
      
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
    if (generatedQuestions.length > 0 && !isGenerating) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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

    if (aiData?.isLimitReached || (aiData && totalQuestions > aiData.remaining)) {
      setIsLimitModalOpen(true);
      return;
    }

    setIsGenerating(true);

    try {
      let selectedContexts: string[] = [];
      syllabusData?.chapters?.forEach((ch: any) => {
        ch.subtopics.forEach((sub: any) => {
          if (selectedScopes.includes(sub.name)) selectedContexts.push(`${ch.chapter}: ${sub.name}`);
        });
      });

      const payload = {
        userId: user?.uid,
        schoolType,
        assessmentType,
        topic: selectedClass,
        subject: selectedSubject,
        scopes: selectedContexts,
        difficulty,
        distribution: distribution.filter(d => d.enabled),
        language: "uz"
      };

      const response = await fetch("/teacher/create/bsb-chsb/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const enrichedQuestions = data.questions.map((q: any) => ({
        ...q, id: `temp_${Math.random().toString(36).substr(2, 9)}`
      }));

      setGeneratedQuestions(enrichedQuestions);
      toast.success(`${totalQuestions} ta savol yaratildi!`);

    } catch (error: any) {
      toast.error(error.message || "Xatolik yuz berdi.");
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
        id: newTestRef.id,
        teacherId: user.uid,
        teacherName: user.displayName || "Teacher",
        title: testTitle,
        schoolType,
        assessmentType, 
        grade: selectedClass,
        subject: selectedSubject,
        scopesCovered: selectedScopes,
        totalPoints,
        questionCount: generatedQuestions.length,
        difficultyTarget: difficulty,
        questions: generatedQuestions, 
        status: "active",
        createdAt: serverTimestamp(),
      };

      await writeBatch(db).set(newTestRef, examPaper).commit();
      toast.success("Imtihon muvaffaqiyatli saqlandi!");
      setIsTitleModalOpen(false);
      router.push("/teacher/dashboard"); 
    } catch (error) {
      toast.error("Saqlashda xatolik yuz berdi.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-32 text-slate-900">
      
      {/* GLOBAL MODALS */}
      <AiThinkingModal isVisible={isGenerating} />
      
      <AnimatePresence>
        {isLimitModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsLimitModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl z-10 flex flex-col items-center text-center">
              <button onClick={() => setIsLimitModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-5 border border-rose-100 shadow-inner"><Zap size={28} className="text-rose-500" /></div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{aiData?.isLimitReached ? "Kunlik limit tugadi" : "Limit yetarli emas"}</h3>
              <p className="text-[14px] text-slate-500 mb-8 font-medium leading-relaxed">
                {aiData?.isLimitReached ? "Siz bugungi bepul kunlik limitingizni tugatdingiz. Cheklovsiz foydalanish uchun profilingizni yangilang." : `Sizda bugun uchun faqatgina ${aiData?.remaining} ta bepul limit qoldi. Iltimos, matritsani kamaytiring yoki limitni oshiring.`}
              </p>
              <div className="w-full flex flex-col gap-3">
                <button onClick={() => window.open('https://t.me/Umidjon0339', '_blank')} className="w-full py-3.5 bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2">Limitni oshirish</button>
                <button onClick={() => setIsLimitModalOpen(false)} className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors active:scale-[0.98]">Yopish</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/teacher/create')} className="text-slate-400 hover:text-slate-900 transition-colors"><ArrowLeft size={20} /></button>
            <div className="w-px h-5 bg-slate-200"></div>
            <h1 className="text-[16px] font-semibold text-slate-800 tracking-tight">Summativ Baholash Generatori</h1>
          </div>
          <AiLimitCard aiData={aiData} />
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 mt-8 flex flex-col lg:flex-row gap-8">
        
        {/* --- LEFT: SETTINGS --- */}
        <div className="w-full lg:w-[40%] flex flex-col gap-6">
          
          {/* Section: School & Type */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            
            {/* School Type */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
              <button onClick={() => setSchoolType('maktab')} className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${schoolType === 'maktab' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                <Building2 size={16}/> Umumta'lim
              </button>
              <button onClick={() => setSchoolType('ixtisos')} className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${schoolType === 'ixtisos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                <GraduationCap size={16}/> Ixtisoslashgan
              </button>
            </div>

            {/* Assessment Type */}
            <div className="flex gap-3 mb-8">
              <button onClick={() => setAssessmentType('BSB')} className={`flex-1 py-3 border rounded-xl text-[14px] font-semibold transition-all ${assessmentType === 'BSB' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>BSB (Bo'lim)</button>
              <button onClick={() => setAssessmentType('CHSB')} className={`flex-1 py-3 border rounded-xl text-[14px] font-semibold transition-all ${assessmentType === 'CHSB' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>CHSB (Chorak)</button>
            </div>

            {/* NEW POPUP TRIGGERS */}
            <div className="space-y-3">
              <div 
                className="border border-slate-200 hover:border-indigo-300 hover:shadow-sm rounded-xl p-4 flex justify-between items-center bg-slate-50 cursor-pointer transition-all"
                onClick={() => setIsClassSubjectModalOpen(true)}
              >
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">1. Sinf va Fan</p>
                  <p className="text-[15px] font-bold text-slate-900">
                    {selectedClass && selectedSubject ? `${selectedClass} • ${selectedSubject.replace(/-/g, ' ')}` : "Tanlanmagan"}
                  </p>
                </div>
                <ChevronRight size={20} className="text-slate-400" />
              </div>

              <div 
                className={`border border-slate-200 hover:border-indigo-300 hover:shadow-sm rounded-xl p-4 flex justify-between items-center bg-slate-50 cursor-pointer transition-all ${(!selectedClass || !selectedSubject) ? 'opacity-40 pointer-events-none' : ''}`}
                onClick={() => setIsTopicsModalOpen(true)}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">2. Qamrov (Mavzular)</p>
                    {isLoadingSyllabus && <Loader2 size={12} className="animate-spin text-indigo-500" />}
                  </div>
                  <p className="text-[15px] font-bold text-slate-900">
                    {selectedScopes.length > 0 ? `${selectedScopes.length} ta mavzu tanlandi` : "Tanlanmagan"}
                  </p>
                </div>
                <ChevronRight size={20} className="text-slate-400" />
              </div>
            </div>

          </div>
        </div>

        {/* --- RIGHT: MATRIX BUILDER --- */}
        <div className="w-full lg:w-[60%] flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
            
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <div>
                <h2 className="text-[18px] font-bold text-slate-900">3. Matritsa</h2>
                <p className="text-[13px] text-slate-500 mt-1">Savollar turi, soni va balini belgilang</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-1 flex">
                {['Aralash', 'Oson', "O'rta", 'Qiyin'].map((diff) => (
                  <button key={diff} onClick={() => setDifficulty(diff as Difficulty)} className={`px-3 py-1.5 text-[12px] font-semibold rounded-md transition-colors ${difficulty === diff ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{diff}</button>
                ))}
              </div>
            </div>

            <div className="p-6 flex-1">
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 mb-4 px-2">
                <div className="w-5"></div>
                <div className="text-[12px] font-semibold text-slate-400 uppercase">Turi</div>
                <div className="text-[12px] font-semibold text-slate-400 uppercase text-center w-24">Soni</div>
                <div className="text-[12px] font-semibold text-slate-400 uppercase text-center w-20">Ball</div>
                <div className="text-[12px] font-semibold text-slate-400 uppercase text-right w-16">Jami</div>
              </div>

              <div className="space-y-3">
                {distribution.map((item) => (
                  <div key={item.id} className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center p-3 rounded-xl border transition-all ${item.enabled ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-transparent opacity-60 hover:opacity-100'}`}>
                    <input type="checkbox" checked={item.enabled} onChange={() => updateDistribution(item.id, 'enabled', !item.enabled)} className="w-5 h-5 text-indigo-600 rounded border-slate-300 cursor-pointer" />
                    <div className="flex items-center gap-3">
                      <div className="text-slate-400 hidden sm:block"><item.icon size={16} /></div>
                      <span className={`text-[14px] font-medium ${item.enabled ? 'text-slate-900' : 'text-slate-500'}`}>{item.label}</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-1 w-24">
                      <button onClick={() => updateDistribution(item.id, 'count', item.count - 1)} disabled={!item.enabled} className="p-1 hover:bg-white rounded text-slate-500 disabled:opacity-50"><Minus size={14}/></button>
                      <span className="text-[14px] font-semibold text-slate-900">{item.count}</span>
                      <button onClick={() => updateDistribution(item.id, 'count', item.count + 1)} disabled={!item.enabled} className="p-1 hover:bg-white rounded text-slate-500 disabled:opacity-50"><Plus size={14}/></button>
                    </div>
                    <div className="w-20">
                      <input type="number" min="1" max="20" disabled={!item.enabled} value={item.points} onChange={(e) => updateDistribution(item.id, 'points', parseInt(e.target.value) || 1)} className="w-full h-9 text-center bg-slate-50 border border-slate-200 rounded-lg text-[14px] font-semibold text-slate-900 outline-none focus:border-indigo-500 disabled:opacity-50" />
                    </div>
                    <div className="text-right w-16 text-[15px] font-semibold text-slate-900">
                      {item.enabled ? item.count * item.points : 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50/50 rounded-b-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-[12px] text-slate-500 uppercase font-semibold mb-1">Jami Savollar</p>
                  <p className="text-[24px] font-bold text-slate-900 leading-none">{totalQuestions}</p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] text-slate-500 uppercase font-semibold mb-1">Jami Ball</p>
                  <p className="text-[24px] font-bold text-indigo-600 leading-none">{totalPoints}</p>
                </div>
              </div>
              <button onClick={handleGenerate} disabled={isGenerating || totalQuestions === 0 || selectedScopes.length === 0} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-semibold text-[15px] transition-colors flex items-center justify-center gap-2">
                <Wand2 size={18} /> Imtihonni Yaratish
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* --- RENDER RESULTS --- */}
      <AnimatePresence>
        {generatedQuestions.length > 0 && !isGenerating && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[800px] mx-auto px-6 mt-16 pb-20">
            <div className="mb-8 pb-4 border-b border-slate-200 flex justify-between items-end">
              <div>
                <h2 className="text-[24px] font-bold text-slate-900">Imtihon Qog'ozi</h2>
                <p className="text-[14px] text-slate-500 mt-1">Savollarni tekshiring. Noto'g'ri savollarni o'chirishingiz mumkin.</p>
              </div>
              <div className="text-[14px] font-semibold text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm">
                Jami: {generatedQuestions.reduce((acc, q) => acc + (q.points || 0), 0)} Ball
              </div>
            </div>

            {generatedQuestions.map((q, idx) => (
              <ExamQuestionCard key={q.id} q={q} idx={idx} onRemove={(id) => setGeneratedQuestions(prev => prev.filter(x => x.id !== id))} />
            ))}
            <div ref={bottomRef} className="h-20" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- STICKY PUBLISH BAR --- */}
      <AnimatePresence>
        {generatedQuestions.length > 0 && !isGenerating && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-50 shadow-[0_-10px_40px_rgb(0,0,0,0.05)]">
            <div className="max-w-[1200px] mx-auto flex justify-between items-center">
              <div className="hidden sm:block">
                <p className="text-[14px] font-medium text-slate-500">Tayyor: <strong className="text-slate-900">{generatedQuestions.length} savol</strong></p>
              </div>
              <button onClick={() => { setTestTitle(`${selectedClass} ${selectedSubject} ${assessmentType}`); setIsTitleModalOpen(true); }} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                Tizimga Saqlash
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* POPUP MODALS */}
      {/* ===================================================================== */}

      {/* 1. CLASS & SUBJECT MODAL */}
      <AnimatePresence>
        {isClassSubjectModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsClassSubjectModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[18px] font-bold text-slate-900">Sinf va Fan</h3>
                <button onClick={() => setIsClassSubjectModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-3 block">Sinfni tanlang</label>
                  <div className="flex flex-wrap gap-2">
                    {availableClasses.map(c => (
                      <button key={c} onClick={() => { setSelectedClass(c); setSelectedSubject(""); }} className={`px-4 py-2 rounded-lg text-[13px] font-medium border transition-colors ${selectedClass === c ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{c}</button>
                    ))}
                  </div>
                </div>
                <div className={!selectedClass ? 'opacity-40 pointer-events-none' : ''}>
                  <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-3 block">Fanni tanlang</label>
                  <div className="flex flex-wrap gap-2">
                    {availableSubjects.map((s: string) => (
                      <button key={s} onClick={() => setSelectedSubject(s)} className={`px-4 py-2 rounded-lg text-[13px] font-medium border capitalize transition-colors ${selectedSubject === s ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{s.replace(/-/g, ' ')}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end">
                <button onClick={() => setIsClassSubjectModalOpen(false)} className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white font-medium rounded-lg transition-colors w-full">Saqlash</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. TOPICS (SYLLABUS) MODAL */}
      <AnimatePresence>
        {isTopicsModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTopicsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl w-full max-w-2xl shadow-xl z-10 max-h-[85vh] flex flex-col">
              
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                <div>
                  <h3 className="text-[18px] font-bold text-slate-900">Qamrov (Mavzular)</h3>
                  <p className="text-[13px] text-slate-500 mt-1">{selectedClass} • {selectedSubject.replace(/-/g, ' ')}</p>
                </div>
                <button onClick={() => setIsTopicsModalOpen(false)} className="text-slate-400 hover:text-slate-900 bg-white p-2 rounded-lg border border-slate-200"><X size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50">
                {!syllabusData && !isLoadingSyllabus && (
                  <div className="text-center py-10 text-slate-400 text-[14px]">Dastur yuklanmadi.</div>
                )}
                {syllabusData?.chapters?.map((chapter: any, cIdx: number) => {
                  const isExpanded = expandedChapters.includes(chapter.chapter);
                  const subNames = chapter.subtopics.map((s: any) => s.name);
                  const selectedCount = subNames.filter((name: string) => selectedScopes.includes(name)).length;
                  const isAllSelected = selectedCount === subNames.length && subNames.length > 0;
                  
                  return (
                    <div key={cIdx} className="mb-3 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="flex items-center p-4 hover:bg-slate-50 transition-colors">
                        <input type="checkbox" checked={isAllSelected} onChange={() => handleChapterCheckbox(chapter)} className="w-4 h-4 text-indigo-600 rounded border-slate-300 mr-4 cursor-pointer" />
                        <button onClick={() => toggleChapterExpand(chapter.chapter)} className="flex-1 text-left text-[14px] font-bold text-slate-800 mr-2">{chapter.chapter}</button>
                        <span className="text-[12px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md mr-3">{selectedCount}/{subNames.length}</span>
                        <button onClick={() => toggleChapterExpand(chapter.chapter)} className="text-slate-400">
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50 p-3 space-y-1">
                          {chapter.subtopics.map((sub: any, sIdx: number) => (
                            <label key={sIdx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer transition-colors">
                              <input type="checkbox" checked={selectedScopes.includes(sub.name)} onChange={() => toggleSubtopic(sub.name)} className="w-4 h-4 mt-0.5 text-indigo-600 rounded border-slate-300" />
                              <span className={`text-[14px] leading-snug ${selectedScopes.includes(sub.name) ? 'text-slate-900 font-bold' : 'text-slate-600'}`}>{sub.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-6 border-t border-slate-200 bg-white rounded-b-2xl">
                <button onClick={() => setIsTopicsModalOpen(false)} className="w-full py-3 bg-slate-900 hover:bg-black text-white font-semibold rounded-xl transition-colors text-[15px]">Tasdiqlash</button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. TITLE SAVE MODAL */}
      <AnimatePresence>
        {isTitleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTitleModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl z-10">
              <h3 className="text-[18px] font-bold text-slate-900 mb-2">Hujjat nomi</h3>
              <p className="text-[13px] text-slate-500 mb-5">O'quvchilarga ko'rinadigan test nomini kiriting.</p>
              <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-[14px] font-medium text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all mb-6" autoFocus/>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setIsTitleModalOpen(false)} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors text-[14px]">Bekor qilish</button>
                <button onClick={handleFinalPublish} disabled={isPublishing} className="px-6 py-2 bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-2 text-[14px]">
                  {isPublishing ? <Loader2 size={16} className="animate-spin"/> : "Saqlash"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
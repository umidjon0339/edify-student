"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Loader2, CheckCircle2, Wand2, BookOpen, Trash2, Layers, EyeOff, Eye, FileText } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Components
import SyllabusSelector from "@/app/teacher/create/_components/SyllabusSelector";
import TestConfigurationModal from "@/app/teacher/create/_components/TestConfigurationModal";

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

// 🟢 FIXED: LaTeX Renderer Helper Component (Math matches text color exactly)
const FormattedText = ({ text }: { text: string }) => {
  if (!text) return null;
  // Splits text by $ to isolate math. Even indexes are text, odd are math.
  const parts = text.split('$');
  
  return (
    <span>
      {parts.map((part, index) => {
        if (index % 2 === 1) { // It's LaTeX
          try {
            const html = katex.renderToString(part, { throwOnError: false, displayMode: false });
            // 🟢 REMOVED text-violet-700 so it inherits the parent text color perfectly
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="px-1" />;
          } catch (e) {
            return <span key={index} className="text-red-500">{part}</span>;
          }
        }
        // Normal text
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

// 🟢 NEW: Extracted Card Component (Allows per-card toggle states)
const AIQuestionCard = ({ q, idx, onRemove }: { q: AIQuestion, idx: number, onRemove: (id: string) => void }) => {
  const [showOptions, setShowOptions] = useState(true);
  const [showExplanation, setShowExplanation] = useState(true);

  return (
    <div className="bg-white p-5 rounded-2xl border border-violet-100/50 shadow-[0_4px_20px_-4px_rgba(139,92,246,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(139,92,246,0.12)] transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 relative group">
      
      {/* CARD HEADER */}
      <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-50">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm flex items-center gap-1">
            <Sparkles size={10} /> AI Q{idx + 1}
          </span>
          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
             <Layers size={10} /> {q.chapter} <span className="text-slate-300 mx-1">/</span> {q.subtopic}
          </span>
          <span className="bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">
            {q.uiDifficulty}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setShowOptions(!showOptions)} className="text-slate-400 hover:text-violet-600 hover:bg-violet-50 p-1.5 rounded-lg transition-colors" title="Toggle Options">
            {showOptions ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button onClick={() => setShowExplanation(!showExplanation)} className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 p-1.5 rounded-lg transition-colors" title="Toggle Explanation">
            <BookOpen size={16} />
          </button>
          <div className="w-px h-4 bg-slate-200 mx-1"></div>
          <button onClick={() => onRemove(q.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Delete Question">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      {/* QUESTION TEXT (LaTeX Rendered) */}
      <p className="font-semibold text-[15px] text-slate-800 mb-5 leading-relaxed">
        <FormattedText text={q.question.uz} />
      </p>
      
      {/* OPTIONS GRID (2-Column & Toggleable) */}
      {showOptions && (
        <div className="grid grid-cols-2 gap-2.5 mb-2">
          {Object.entries(q.options).map(([key, value]) => (
            <div key={key} className={`flex items-start p-2.5 rounded-xl border transition-colors ${q.answer === key ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'}`}>
              <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black mr-3 shrink-0 mt-0.5 ${q.answer === key ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20' : 'bg-white border border-slate-200 text-slate-400'}`}>
                {key}
              </div>
              <div className={`text-sm font-medium pt-0.5 ${q.answer === key ? 'text-emerald-900' : 'text-slate-700'}`}>
                <FormattedText text={value.uz} />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* EXPLANATION (Toggleable) */}
      {showExplanation && (
        <div className="bg-amber-50/50 border border-amber-100/50 p-3.5 rounded-xl mt-4">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <BookOpen size={12} /> AI Solution Logic
          </p>
          <p className="text-sm text-amber-900/80 leading-relaxed font-medium">
             <FormattedText text={q.explanation.uz} />
          </p>
        </div>
      )}
    </div>
  );
};


export default function AIGeneratorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [testTitle, setTestTitle] = useState("");
  const [testSyllabus, setTestSyllabus] = useState<any>(null);
  const [count, setCount] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<AIQuestion[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (generatedQuestions.length > 0 && !isGenerating) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [generatedQuestions, isGenerating]);

  const handleGenerate = async () => {
    if (!testSyllabus?.subtopic) return toast.error("Please select a complete Syllabus path.");
    if (!testSyllabus?.difficulty) return toast.error("Please select a Difficulty Level in the syllabus box.");
    if (count < 1 || count > 10) return toast.error("Please choose between 1 and 10 questions.");

    setIsGenerating(true);

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

  const removeQuestion = (idToDelete: string) => {
    setGeneratedQuestions(prev => prev.filter(q => q.id !== idToDelete));
  };

  const handleInitiatePublish = () => {
    if (!user) return toast.error("Please log in to publish a test.");
    if (!testTitle.trim()) return toast.error("Please enter a Document Title on the left.");
    if (generatedQuestions.length === 0) return toast.error("Please generate questions first.");
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

      const qRef = doc(db, "teacher_questions", finalQ.id);
      batch.set(qRef, { ...finalQ, createdAt: serverTimestamp() });
    }

    const testRef = doc(collection(db, "custom_tests"));
    batch.set(testRef, {
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
      toast.success("AI Test published successfully!");
      setIsConfigModalOpen(false);
      router.push("/teacher/dashboard");
    } catch (error) {
      console.error(error);
      toast.error("Failed to publish test.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden font-sans selection:bg-violet-100 selection:text-violet-900">
      
      <TestConfigurationModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onConfirm={handleFinalPublish}
        questionCount={generatedQuestions.length}
        testTitle={testTitle}
        isSaving={isPublishing}
      />

      {/* 🟢 SIDEBAR (Compact, non-scrollable focus) */}
      <aside className="w-[340px] bg-white border-r border-slate-200 p-5 flex flex-col h-full z-10 shadow-lg shrink-0">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4 shrink-0">
          <button onClick={() => router.push('/teacher/create')} className="p-1.5 -ml-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white rounded-md flex items-center justify-center shadow-sm">
              <Sparkles size={14} />
            </div>
            <h2 className="font-black text-[15px] text-slate-800 tracking-tight">AI Studio</h2>
          </div>
        </div>
        
        {/* Document Title Input (Rounded Card Style) */}
        <div className="group mb-6 shrink-0">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 group-focus-within:text-violet-600 transition-colors ml-1">
            Document Title <span className="text-red-400">*</span>
          </label>
          <input 
            type="text" 
            value={testTitle} 
            onChange={e => setTestTitle(e.target.value)}
            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] font-semibold text-slate-800 hover:border-slate-300 focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium shadow-sm" 
            placeholder="e.g., Mixed Algebra Quiz" 
          />
        </div>

        {/* Syllabus Selector Container (Flex-1 allows internal scrolling if needed, but keeps sidebar static) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-4">
          <div className="bg-violet-50/50 p-3.5 rounded-2xl border border-violet-100">
             <label className="text-[11px] font-bold text-violet-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
               <Layers size={14} /> Topic Generator
             </label>
             <p className="text-[11px] text-slate-500 mb-3 font-medium leading-relaxed">
               Select syllabus parameters below. 
             </p>
             <SyllabusSelector onChange={setTestSyllabus} />
          </div>
        </div>

        {/* Fixed Bottom Generation Bar */}
        <div className="pt-4 border-t border-slate-100 bg-white shrink-0 mt-2">
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Questions to Generate</label>
                <span className="text-xs font-black text-violet-600 bg-violet-100 px-2 py-0.5 rounded-md">+{count}</span>
              </div>
              <input 
                type="range" min="1" max="10" 
                value={count} onChange={(e) => setCount(parseInt(e.target.value))}
                className="w-full accent-violet-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !testSyllabus?.subtopic}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-violet-600/20 text-sm"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
              {isGenerating ? "Generating..." : "Generate Questions"}
            </button>
        </div>
      </aside>

      {/* MAIN BUILDER AREA */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-50/50">
        
        {/* 🟢 SLIM TOP BAR */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-2.5 flex justify-between items-center shadow-sm">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Curated Test</h1>
            <p className="text-[11px] text-slate-500 font-medium">Review and publish your generated questions.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-lg font-black text-slate-800 leading-none">{generatedQuestions.length}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Qs</div>
            </div>
            <button 
              onClick={handleInitiatePublish} 
              disabled={isPublishing || isGenerating || generatedQuestions.length === 0}
              className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg font-bold shadow-md shadow-slate-900/10 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 text-sm"
            >
              <CheckCircle2 size={16} /> Publish
            </button>
          </div>
        </div>

        <div className="max-w-[800px] mx-auto p-4 md:p-6 space-y-5">
          {generatedQuestions.length === 0 && !isGenerating ? (
            <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50 animate-in zoom-in-95 duration-500 mt-6">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Sparkles size={28} className="text-slate-300" />
              </div>
              <p className="font-bold text-slate-500 text-lg">Your canvas is empty.</p>
              <p className="text-sm text-slate-400 mt-1">Configure topics on the left and hit generate.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {generatedQuestions.map((q, idx) => (
                <AIQuestionCard key={q.id} q={q} idx={idx} onRemove={removeQuestion} />
              ))}

              {isGenerating && (
                <div className="bg-white p-6 rounded-2xl border border-violet-200/50 shadow-[0_0_20px_rgba(139,92,246,0.1)] relative overflow-hidden animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-50/30 to-transparent w-[200%] animate-[shimmer_2s_infinite]" />
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-20 h-5 bg-violet-100 rounded-full" />
                    <div className="w-32 h-5 bg-slate-100 rounded-full" />
                  </div>
                  <div className="w-3/4 h-5 bg-slate-100 rounded-lg mb-6" />
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="w-full h-10 bg-slate-50 rounded-xl" />)}
                  </div>
                </div>
              )}
              
              {/* 🟢 NEW: Bottom Helper Prompt */}
              {!isGenerating && generatedQuestions.length > 0 && (
                <div className="py-8 flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
                  <div className="w-12 h-12 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-3">
                    <Layers size={20} />
                  </div>
                  <p className="text-sm font-bold text-slate-500">Want to mix in more topics?</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[250px]">
                    Change the syllabus on the left and click "Generate Magic" to append more questions to this test.
                  </p>
                </div>
              )}

              <div ref={bottomRef} className="h-4" />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
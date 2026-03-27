"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Loader2, CheckCircle2, Wand2, BookOpen, Trash2, Layers, EyeOff, Eye, FileText, Menu, X, Check } from "lucide-react";
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

// LaTeX Renderer Helper Component
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

// 🟢 UPGRADED: Clean, Minimalist Card Design (Notion/Vercel Aesthetic)
const AIQuestionCard = ({ q, idx, onRemove }: { q: AIQuestion, idx: number, onRemove: (id: string) => void }) => {
  const [showOptions, setShowOptions] = useState(true);
  const [showExplanation, setShowExplanation] = useState(true);

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 relative group">
      
      {/* CARD HEADER */}
      <div className="flex justify-between items-start mb-5 pb-4 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 border border-indigo-100/50">
            <Sparkles size={12} className="text-indigo-500" /> Q{idx + 1}
          </span>
          <span className="bg-slate-50 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 border border-slate-200/60">
             <Layers size={10} /> {q.chapter} <span className="text-slate-300 mx-1">/</span> {q.subtopic}
          </span>
          <span className="bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm">
            {q.uiDifficulty}
          </span>
        </div>

        {/* Action Buttons: Always visible on mobile, visible on hover for desktop. Clean slate styling. */}
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button onClick={() => setShowOptions(!showOptions)} className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-md transition-colors" title="Toggle Options">
            {showOptions ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button onClick={() => setShowExplanation(!showExplanation)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-md transition-colors" title="Toggle Explanation">
            <BookOpen size={16} />
          </button>
          <div className="w-px h-4 bg-slate-200 mx-1"></div>
          <button onClick={() => onRemove(q.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors" title="Delete Question">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      {/* QUESTION TEXT */}
      <p className="font-semibold text-[15px] text-slate-900 mb-6 leading-relaxed">
        <FormattedText text={q.question.uz} />
      </p>
      
      {/* OPTIONS GRID */}
      {showOptions && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
          {Object.entries(q.options).map(([key, value]) => {
            const isCorrect = q.answer === key;
            return (
              <div key={key} className={`flex items-start p-3 rounded-xl border-2 transition-all ${isCorrect ? 'bg-indigo-50/40 border-indigo-500/30' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black mr-3 shrink-0 mt-0.5 transition-colors ${isCorrect ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' : 'bg-slate-100 text-slate-500'}`}>
                  {key}
                </div>
                <div className={`text-sm font-medium pt-0.5 break-words overflow-hidden ${isCorrect ? 'text-indigo-950' : 'text-slate-700'}`}>
                  <FormattedText text={value.uz} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* EXPLANATION */}
      {showExplanation && (
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mt-5">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Sparkles size={14} className="text-indigo-400" /> AI Solution Logic
          </p>
          <p className="text-[13.5px] text-slate-700 leading-relaxed font-medium">
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
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    setIsSidebarOpen(false);

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
    <div className="flex h-[100dvh] bg-[#FAFAFA] overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      <TestConfigurationModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onConfirm={handleFinalPublish}
        questionCount={generatedQuestions.length}
        testTitle={testTitle}
        isSaving={isPublishing}
      />

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`absolute lg:relative w-[340px] bg-white border-r border-slate-200 flex flex-col h-full z-50 shrink-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}`}>
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col">
          <div className="flex justify-between items-center pb-4 mb-5 shrink-0 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/teacher/create')} className="p-1.5 -ml-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all">
                <ArrowLeft size={18} />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-slate-900 text-white rounded-md flex items-center justify-center shadow-sm">
                  <Sparkles size={14} />
                </div>
                <h2 className="font-bold text-[15px] text-slate-900 tracking-tight">AI Studio</h2>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <div className="group mb-6 shrink-0">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1 group-focus-within:text-indigo-600 transition-colors">
              Document Title <span className="text-red-400">*</span>
            </label>
            <input 
              type="text" 
              value={testTitle} 
              onChange={e => setTestTitle(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-900 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400 shadow-sm" 
              placeholder="e.g., Algebra Midterm" 
            />
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 mb-4">
             <label className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-1.5">
               <Layers size={14} className="text-indigo-600" /> Topic Generator
             </label>
             <p className="text-[12px] text-slate-500 mb-4 font-medium leading-relaxed">
               Select the exact curriculum parameters.
             </p>
             <SyllabusSelector onChange={setTestSyllabus} />
          </div>
        </div>

        {/* 🟢 UPGRADED: Sticky Bottom Bar inside Sidebar (Point 3) */}
        <div className="sticky bottom-0 bg-white p-5 pt-4 border-t border-slate-100 z-20 mt-auto">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Questions to Generate</label>
                <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">+{count}</span>
              </div>
              <input 
                type="range" min="1" max="10" 
                value={count} onChange={(e) => setCount(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !testSyllabus?.subtopic}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm text-[14px]"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
              {isGenerating ? "Generating..." : "Generate Math"}
            </button>
        </div>
      </aside>

      {/* MAIN BUILDER AREA */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative w-full">
        
        {/* 🟢 UPGRADED: Vercel Style Header (Point 5) */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-4">
              <h1 className="text-[16px] md:text-[18px] font-bold text-slate-900 tracking-tight">Draft Editor</h1>
              {/* Clean Vercel-style progress pill */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full border border-slate-200/60">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                <span className="text-[11px] font-bold text-slate-600 tracking-wide uppercase">{generatedQuestions.length} Items</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleInitiatePublish} 
              disabled={isPublishing || isGenerating || generatedQuestions.length === 0}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 md:px-5 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 text-[13px] md:text-[14px]"
            >
              <CheckCircle2 size={16} /> <span className="hidden sm:inline">Publish Test</span>
            </button>
          </div>
        </div>

        <div className="max-w-[800px] mx-auto p-4 md:p-8 space-y-6">
          {generatedQuestions.length === 0 && !isGenerating ? (
            <div className="h-[50vh] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-white animate-in zoom-in-95 duration-500 mt-6 p-6 text-center shadow-sm">
              <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center mb-4 border border-slate-100">
                <Sparkles size={24} className="text-slate-300" />
              </div>
              <p className="font-bold text-slate-600 text-[16px]">Ready to create.</p>
              <p className="text-[14px] text-slate-400 mt-1">Configure topics on the left and generate.</p>
              
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden mt-6 px-6 py-2.5 bg-indigo-50 text-indigo-600 font-bold rounded-xl text-[13px] hover:bg-indigo-100 transition-colors border border-indigo-100">
                Open Settings
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {generatedQuestions.map((q, idx) => (
                <AIQuestionCard key={q.id} q={q} idx={idx} onRemove={removeQuestion} />
              ))}

              {isGenerating && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/50 to-transparent w-[200%] animate-[shimmer_2s_infinite]" />
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-20 h-6 bg-slate-100 rounded-full" />
                    <div className="w-32 h-6 bg-slate-50 rounded-full" />
                  </div>
                  <div className="w-3/4 h-5 bg-slate-100 rounded-lg mb-6" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="w-full h-12 bg-slate-50 rounded-xl border border-slate-100" />)}
                  </div>
                </div>
              )}
              
              {!isGenerating && generatedQuestions.length > 0 && (
                <div className="py-10 flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
                  <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3">
                    <Layers size={18} />
                  </div>
                  <p className="text-[14px] font-bold text-slate-600">Want to mix in more topics?</p>
                  <p className="text-[13px] text-slate-400 mt-1 max-w-[280px] mb-5">
                    Adjust the syllabus settings to append new questions to this draft.
                  </p>
                  <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden px-6 py-2 bg-slate-900 text-white font-bold rounded-xl text-[13px] hover:bg-slate-800 transition-colors shadow-sm">
                    Open Settings
                  </button>
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
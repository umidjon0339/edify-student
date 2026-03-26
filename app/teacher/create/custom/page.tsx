"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, BookOpen, Wand2, Settings2, ChevronUp, ChevronDown } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";

import SyllabusSelector from "@/app/teacher/create/_components/SyllabusSelector";
import RichQuestionInput from "@/app/teacher/create/_components/RichQuestionInput";
import TestConfigurationModal from "@/app/teacher/create/_components/TestConfigurationModal";
import { buildSafeEdifyQuestion } from "@/utils/questionFormatter";

interface DraftQuestion {
  id: string;
  text: string;
  optA: string;
  optB: string;
  optC: string;
  optD: string;
  answer: "A" | "B" | "C" | "D";
  explanation: string;
  showExplanation: boolean;
}

const DRAFT_STORAGE_KEY = "edify_custom_test_draft";

export default function CreateCustomTestPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // --- STATE ---
  const [isHydrated, setIsHydrated] = useState(false);

  const [testTitle, setTestTitle] = useState("");
  const [testSyllabus, setTestSyllabus] = useState<any>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const generateSecureId = () => doc(collection(db, "teacher_questions")).id;

  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([
    { id: generateSecureId(), text: "", optA: "", optB: "", optC: "", optD: "", answer: "A", explanation: "", showExplanation: false }
  ]);

  // 🟢 SILENT FEATURE 1: LOAD DRAFT ON MOUNT (No Toasts)
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        const TWENTY_FOUR_HOURS = 1 * 60 * 60 * 1000;
        
        if (parsed.timestamp && (Date.now() - parsed.timestamp < TWENTY_FOUR_HOURS)) {
          if (parsed.q && parsed.q.length > 0) setDraftQuestions(parsed.q);
          if (parsed.t) setTestTitle(parsed.t);
          if (parsed.s) setTestSyllabus(parsed.s);
        } else {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      } catch (e) {
        localStorage.removeItem(DRAFT_STORAGE_KEY); 
      }
    }
    setIsHydrated(true);
  }, []);

  // 🟢 SILENT FEATURE 2: AUTO-SAVE (No UI Indicators)
  useEffect(() => {
    if (isHydrated) {
      const draftData = { 
        q: draftQuestions, 
        t: testTitle, 
        s: testSyllabus,
        timestamp: Date.now() 
      };
      
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      } catch (e: any) {
        // Silently catch quota errors so the app doesn't crash
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
           console.warn("Local storage quota exceeded. Draft not saved.");
        }
      }
    }
  }, [draftQuestions, testTitle, testSyllabus, isHydrated]);

  // --- NAVIGATION & SWAPPING ---
  const handleCardFocus = (id: string) => {
    const card = document.getElementById(`card-${id}`);
    if (card) {
      // 🟢 FIX: scrollIntoView automatically scrolls the <main> container instead of the window
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQ = [...draftQuestions];
    if (direction === 'up' && index > 0) {
      [newQ[index - 1], newQ[index]] = [newQ[index], newQ[index - 1]];
      setDraftQuestions(newQ);
    } else if (direction === 'down' && index < newQ.length - 1) {
      [newQ[index], newQ[index + 1]] = [newQ[index + 1], newQ[index]];
      setDraftQuestions(newQ);
    }
  };

  // --- FORM HANDLERS ---
  const updateDraftQuestion = (id: string, field: keyof DraftQuestion, value: any) => {
    setDraftQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const addBlankQuestion = () => {
    setDraftQuestions(prev => [
      ...prev, 
      { id: generateSecureId(), text: "", optA: "", optB: "", optC: "", optD: "", answer: "A", explanation: "", showExplanation: false }
    ]);
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
  };

  const removeQuestion = (id: string) => {
    if (draftQuestions.length === 1) return toast.error("Test must have at least one question.");
    setDraftQuestions(prev => prev.filter(q => q.id !== id));
  };

  // --- VALIDATION ---
  const handleInitiatePublish = () => {
    if (!user) return toast.error("Please log in to publish a test.");
    if (!testTitle.trim()) return toast.error("Please enter a Test Title.");
    if (!testSyllabus?.subtopic) return toast.error("Please select a complete Syllabus path.");
    
    const hasEmptyFields = draftQuestions.some(q => !q.text || !q.optA || !q.optB || !q.optC || !q.optD);
    if (hasEmptyFields) return toast.error("Please fill out all question text and options.");

    setIsConfigModalOpen(true);
  };

  // --- FINAL BATCH SAVE ---
  const handleFinalPublish = async (testSettings: any) => {
    if (!user) return;
    setIsPublishing(true);
    
    const batch = writeBatch(db);
    const generatedQuestions = [];

    for (const draft of draftQuestions) {
      const baseQuestion = buildSafeEdifyQuestion(
        user.uid, testSyllabus, draft.text,
        { A: draft.optA, B: draft.optB, C: draft.optC, D: draft.optD },
        draft.answer, draft.explanation 
      );
      
      const safeQuestion = {
        ...baseQuestion, 
        id: `tq_${draft.id}`, 
        number: "", 
        subjectId: "01",
        topicId: testSyllabus.topic.index.toString(),
        chapterId: testSyllabus.chapter.index.toString().padStart(2, '0'),
        subtopicId: testSyllabus.subtopic.index.toString().padStart(2, '0'),
        difficultyId: 2, 
        subject: "Matematika",
        topic: testSyllabus.topic.category,
        chapter: testSyllabus.chapter.chapter,
        subtopic: testSyllabus.subtopic.name,
        difficulty: "medium",
        tags: ["teacher_custom", testSyllabus.subtopic.name.toLowerCase(), testSyllabus.chapter.chapter.toLowerCase()],
        solutions: [], 
        uploadedAt: new Date().toISOString(), 
      };
      
      generatedQuestions.push(safeQuestion);
      const qRef = doc(db, "teacher_questions", safeQuestion.id);
      batch.set(qRef, { ...safeQuestion, createdAt: serverTimestamp() });
    }

    const testRef = doc(collection(db, "custom_tests"));
    batch.set(testRef, {
      teacherId: user.uid, teacherName: user.displayName || "Teacher",
      title: testTitle, topicId: testSyllabus.topic.index.toString(),
      questions: generatedQuestions, duration: testSettings.duration,
      shuffle: testSettings.shuffleQuestions, resultsVisibility: testSettings.resultsVisibility,
      accessCode: testSettings.accessCode, status: "active",
      createdAt: serverTimestamp(), questionCount: generatedQuestions.length,
    });

    try {
      await batch.commit(); 
      toast.success("Custom test published successfully!");
      localStorage.removeItem(DRAFT_STORAGE_KEY); // Wipe draft on success
      setIsConfigModalOpen(false);
      router.push("/teacher/dashboard");
    } catch (error) {
      console.error(error);
      toast.error("Failed to publish test.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isHydrated) return <div className="min-h-screen bg-slate-100" />;

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      <TestConfigurationModal
        isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)}
        onConfirm={handleFinalPublish} questionCount={draftQuestions.length}
        testTitle={testTitle} isSaving={isPublishing}
      />

      {/* SIDEBAR */}
      <aside className="w-[340px] bg-white border-r border-slate-200/60 p-6 flex flex-col gap-6 overflow-y-auto z-10 shadow-lg shrink-0 custom-scrollbar relative">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all">
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Settings2 size={18} className="text-slate-400" /> Document Setup
          </h2>
        </div>
        
        <div className="space-y-6 flex-1">
          <div className="group">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block group-focus-within:text-indigo-600 transition-colors">Document Title</label>
            <input 
              type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)}
              className="w-full pb-2 border-b-2 border-slate-200 bg-transparent text-lg font-semibold text-slate-800 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-300 placeholder:font-normal" 
              placeholder="e.g., Algebra Final Quiz" 
            />
          </div>

          <div>
             <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Syllabus Tagging</label>
             <SyllabusSelector onChange={setTestSyllabus} />
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 bg-white sticky bottom-0 -mx-6 px-6 pb-6">
          <button 
            onClick={handleInitiatePublish} disabled={isPublishing}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Wand2 size={18} />
            {isPublishing ? "Publishing..." : "Publish Test"}
          </button>
        </div>
      </aside>

      {/* MAIN CANVAS */}
      <main className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth pb-[60vh] relative">
        
        {/* STICKY MINI-MAP NAVIGATOR (Removed save indicators) */}
        <div className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/50 px-8 py-3 flex items-start shadow-sm">
           <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 max-w-full">
             {draftQuestions.map((q, i) => (
               <button 
                 key={q.id}
                 onClick={() => handleCardFocus(q.id)}
                 className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 font-bold text-slate-500 text-xs flex items-center justify-center shrink-0 transition-colors shadow-sm"
                 title={`Jump to Question ${i + 1}`}
               >
                 {i + 1}
               </button>
             ))}
             <button onClick={addBlankQuestion} className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 transition-colors">
               <Plus size={16} />
             </button>
           </div>
        </div>

        <div className="max-w-[700px] mx-auto space-y-8 p-4 md:p-8 mt-4">
          
          <header className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Question Canvas</h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">Build your test questions below.</p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-2xl font-black text-slate-300">{draftQuestions.length}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Blocks</span>
            </div>
          </header>

          <div className="space-y-6">
            {draftQuestions.map((q, index) => (
               <div 
                 key={q.id} id={`card-${q.id}`} onFocusCapture={() => handleCardFocus(q.id)}
                 className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all duration-300"
               >
                  {/* CARD HEADER */}
                  <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      <span className="bg-indigo-600 text-white font-bold px-3 py-1 rounded-lg text-sm shadow-sm">
                        Q{index + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Multiple Choice</span>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm mr-2">
                         <button 
                           onClick={() => moveQuestion(index, 'up')} disabled={index === 0}
                           className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-slate-200"
                           title="Move Up"
                         >
                           <ChevronUp size={16} />
                         </button>
                         <button 
                           onClick={() => moveQuestion(index, 'down')} disabled={index === draftQuestions.length - 1}
                           className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                           title="Move Down"
                         >
                           <ChevronDown size={16} />
                         </button>
                      </div>

                      <button 
                        onClick={() => removeQuestion(q.id)} 
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        title="Delete Question"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* CARD BODY */}
                  <div className="p-5">
                    <div className="mb-6">
                      <RichQuestionInput 
                        label="Prompt / Question Text" value={q.text}
                        onChange={(latex) => updateDraftQuestion(q.id, 'text', latex)}
                        placeholder="Start typing your question..."
                      />
                    </div>

                    <div className="flex flex-col gap-3 mb-6">
                       {['A', 'B', 'C', 'D'].map(letter => {
                         const fieldKey = `opt${letter}` as keyof DraftQuestion;
                         return (
                           <div key={letter} className="flex gap-3 items-start group">
                             <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-400 mt-2.5 group-focus-within:bg-indigo-50 group-focus-within:text-indigo-600 group-focus-within:border-indigo-200 transition-colors shrink-0">
                               {letter}
                             </div>
                             <div className="flex-1">
                              <RichQuestionInput 
                                label={`Option ${letter}`} 
                                value={q[fieldKey] as string}  
                                onChange={(latex) => updateDraftQuestion(q.id, fieldKey, latex)}
                                compact={true} 
                              />
                            </div>
                           </div>
                         )
                       })}
                    </div>

                    <div className="flex flex-wrap justify-between items-center pt-4 border-t border-slate-100 gap-4">
                      <div className="flex items-center gap-3 bg-slate-50 p-1.5 pr-3 rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Correct Answer</span>
                        <select 
                          value={q.answer} onChange={(e) => updateDraftQuestion(q.id, 'answer', e.target.value as any)}
                          className="pl-2 pr-6 py-1.5 border border-slate-200 rounded-md font-bold text-sm bg-white text-emerald-600 shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer outline-none transition-colors"
                        >
                          <option value="A">Option A</option><option value="B">Option B</option><option value="C">Option C</option><option value="D">Option D</option>
                        </select>
                      </div>

                      <button
                        onClick={() => updateDraftQuestion(q.id, 'showExplanation', !q.showExplanation)}
                        className={`text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${q.showExplanation ? 'text-slate-500 hover:bg-slate-100' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}
                      >
                        <BookOpen size={14} /> {q.showExplanation ? "Hide Explanation" : "Add Explanation"}
                      </button>
                    </div>

                    {q.showExplanation && (
                      <div className="mt-4 pt-4 border-t border-dashed border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
                          <RichQuestionInput 
                            label="Step-by-Step Solution" value={q.explanation}
                            onChange={(latex) => updateDraftQuestion(q.id, 'explanation', latex)}
                            placeholder="Explain the solution logic here..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
               </div>
            ))}
          </div>

          <div className="flex justify-center pt-4 pb-8">
            <button onClick={addBlankQuestion} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-md text-slate-600 hover:text-indigo-600 font-bold rounded-xl transition-all duration-200">
              <Plus size={18} /> Add Question
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
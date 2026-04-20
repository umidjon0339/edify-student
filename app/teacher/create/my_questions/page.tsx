"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Database,BookMarked,BookOpen,ChevronRight, Layers, Calendar, Folder, Target, CheckCircle2, Trash2, Eye, Plus, Search, Sparkles, Filter, X, AlertCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs, startAfter, DocumentData, QueryDocumentSnapshot, deleteDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

import { useTeacherLanguage } from "@/app/teacher/layout"; 
import TestConfigurationModal from "@/app/teacher/create/_components/TestConfigurationModal";

// --- LATEX FORMATTER ---
const FormattedText = ({ text }: { text: any }) => {
  if (!text) return <span className="text-slate-400 italic">Ma'lumot yo'q</span>;
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
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="block my-2 text-center overflow-x-auto custom-scrollbar" />;
          } catch (e) { return <span key={index} className="text-rose-500 font-mono text-[11px] bg-rose-50 px-1 rounded">{part}</span>; }
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(math, { displayMode: false, throwOnError: false, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="px-0.5 inline-block" />;
          } catch (e) { return <span key={index} className="text-rose-500 font-mono text-[11px] bg-rose-50 px-1 rounded">{part}</span>; }
        }
        return <span key={index}>{part.split('\n').map((line, i, arr) => (<span key={i}>{line}{i < arr.length - 1 && <br />}</span>))}</span>;
      })}
    </span>
  );
};

export default function MyQuestionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // --- STATE ---
  const [questions, setQuestions] = useState<any[]>([]);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const FETCH_LIMIT = 15;

  // Shopping Cart & Filters
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string>("all");
  
  // Modals
  const [infoModalData, setInfoModalData] = useState<any | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [testTitle, setTestTitle] = useState("");
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // --- INITIAL FETCH ---
  useEffect(() => {
    if (!user) return;
    fetchInitialQuestions();
  }, [user, activeFilter]);

  const fetchInitialQuestions = async () => {
    setLoading(true);
    setQuestions([]);
    setLastVisible(null);
    setHasMore(true);

    try {
      let q = query(collection(db, "teacher_questions"), where("creatorId", "==", user!.uid));
      
      // Apply filters
      if (activeFilter === "easy") q = query(q, where("difficulty", "==", "easy"));
      else if (activeFilter === "medium") q = query(q, where("difficulty", "==", "medium"));
      else if (activeFilter === "hard") q = query(q, where("difficulty", "==", "hard"));
      else if (activeFilter === "ai") q = query(q, where("creationMethod", "==", "general_ai"));
      else if (activeFilter === "image") q = query(q, where("creationMethod", "==", "by_image"));
      else if (activeFilter === "custom") q = query(q, where("creationMethod", "==", "custom"));
      
      q = query(q, orderBy("createdAt", "desc"), limit(FETCH_LIMIT));
      
      const querySnapshot = await getDocs(q);
      const fetchedQs = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setQuestions(fetchedQs);
      
      if (querySnapshot.docs.length < FETCH_LIMIT) setHasMore(false);
      else setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      
    } catch (error: any) {
      console.error("Error fetching questions:", error);
      if (error.message.includes("requires an index")) toast.error("Firebase Index xatosi! Konsolga qarab index yarating.");
    } finally {
      setLoading(false);
    }
  };

  // --- FETCH MORE (INFINITE SCROLL) ---
  const fetchMoreQuestions = async () => {
    if (!user || !lastVisible || !hasMore || loadingMore) return;
    setLoadingMore(true);

    try {
      let q = query(collection(db, "teacher_questions"), where("creatorId", "==", user!.uid));
      
      if (activeFilter === "easy") q = query(q, where("difficulty", "==", "easy"));
      else if (activeFilter === "medium") q = query(q, where("difficulty", "==", "medium"));
      else if (activeFilter === "hard") q = query(q, where("difficulty", "==", "hard"));
      else if (activeFilter === "ai") q = query(q, where("creationMethod", "==", "general_ai"));
      else if (activeFilter === "image") q = query(q, where("creationMethod", "==", "by_image"));
      else if (activeFilter === "custom") q = query(q, where("creationMethod", "==", "custom"));

      q = query(q, orderBy("createdAt", "desc"), startAfter(lastVisible), limit(FETCH_LIMIT));
      
      const querySnapshot = await getDocs(q);
      const newQs = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setQuestions(prev => [...prev, ...newQs]);
      
      if (querySnapshot.docs.length < FETCH_LIMIT) setHasMore(false);
      else setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
    } catch (error) {
      console.error("Error fetching more:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // --- INTERSECTION OBSERVER ---
  const observer = useRef<IntersectionObserver | null>(null);
  const lastQuestionElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) fetchMoreQuestions();
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  // --- ACTIONS ---
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedQuestions);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedQuestions(newSet);
  };

  const handleDelete = async () => {
    if (!deleteModalId) return;
    try {
      await deleteDoc(doc(db, "teacher_questions", deleteModalId));
      setQuestions(prev => prev.filter(q => q.id !== deleteModalId));
      
      const newSet = new Set(selectedQuestions);
      newSet.delete(deleteModalId);
      setSelectedQuestions(newSet);
      
      toast.success("Savol o'chirildi");
    } catch (error: any) {
      // 🟢 ASL XATONING NIMALIGINI KONSOLGA CHIQARAMIZ:
      console.error("ASL XATOLIK:", error); 
      toast.error(error.message || "O'chirishda xatolik yuz berdi");
    } finally {
      setDeleteModalId(null);
    }
  };

  const handleCreateTestInitiate = () => {
    if (selectedQuestions.size === 0) return;
    setIsTitleModalOpen(true);
  };

  const handleTitleSubmit = () => {
    if (!testTitle.trim()) return toast.error("Test nomini kiriting");
    setIsTitleModalOpen(false);
    setIsConfigModalOpen(true);
  };

  const handleFinalPublish = async (testSettings: any) => {
    if (!user || selectedQuestions.size === 0) return;
    setIsPublishing(true);

    const selectedQsData = questions.filter(q => selectedQuestions.has(q.id));
    if (selectedQsData.length === 0) {
      setIsPublishing(false);
      return toast.error("Tanlangan savollar topilmadi");
    }

    try {
      const uniqueSubjects = [...new Set(selectedQsData.map(q => q.subject || "Umumiy"))];
      const finalSubjectName = uniqueSubjects.length === 1 ? uniqueSubjects[0] : "Aralash fanlar";

      // ✅ THIS IS THE CORRECT V9 SYNTAX
      await addDoc(collection(db, "custom_tests"), {
        teacherId: user.uid,
        title: testTitle,
        track: "custom_mix",
        subjectName: finalSubjectName,
        topicName: "Aralash",
        chapterName: "Aralash",
        subtopicName: "Aralash",
        questions: selectedQsData,
        duration: testSettings.duration,
        shuffle: testSettings.shuffleQuestions,
        resultsVisibility: testSettings.resultsVisibility,
        accessCode: testSettings.accessCode,
        status: "active",
        createdAt: serverTimestamp(),
        questionCount: selectedQsData.length,
      });

      toast.success("Test muvaffaqiyatli yaratildi!");
      setSelectedQuestions(new Set());
      setIsConfigModalOpen(false);
      setTestTitle("");
      router.push("/teacher/dashboard");
    } catch (error) {
      console.error(error);
      toast.error("Test yaratishda xatolik");
    } finally {
      setIsPublishing(false);
    }
  };

  // --- HELPERS ---
  const getText = (field: any): string => {
    if (!field) return "Ma'lumot yo'q";
    if (typeof field === "string") return field;
    if (field.uz && typeof field.uz === "string") return field.uz;
    if (field.uz && field.uz.uz) return field.uz.uz; 
    return JSON.stringify(field); 
  };

  // --- UI RENDER ---
  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] font-sans pb-32">
      
      {/* 🟢 TOP HEADER */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 md:gap-3">
              <button onClick={() => router.push('/teacher/create')} className="p-1.5 md:p-2 -ml-1 md:-ml-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft size={18} className="md:w-5 md:h-5" />
              </button>
              <div>
                <h1 className="text-[14px] md:text-[16px] font-black text-slate-900 tracking-tight flex items-center gap-1.5 md:gap-2">
                  <Database size={16} className="text-indigo-500" /> Savollar Bazasi
                </h1>
              </div>
            </div>
            <div className="text-[10px] md:text-[12px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              {questions.length} ta savol
            </div>
          </div>

          {/* 🟢 SMART PILL FILTERS */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 -mx-3 px-3 md:mx-0 md:px-0">
            <button onClick={() => setActiveFilter("all")} className={`px-3 py-1.5 rounded-lg text-[10px] md:text-[11px] font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeFilter === "all" ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              <Layers size={12}/> Barchasi
            </button>
            <div className="w-px h-4 bg-slate-200 shrink-0 mx-1"></div>
            <button onClick={() => setActiveFilter("ai")} className={`px-3 py-1.5 rounded-lg text-[10px] md:text-[11px] font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeFilter === "ai" ? "bg-blue-600 text-white shadow-sm" : "bg-blue-50/50 border border-blue-100 text-blue-700 hover:bg-blue-100"}`}>
              <Sparkles size={12}/> Smart AI
            </button>
            <button onClick={() => setActiveFilter("image")} className={`px-3 py-1.5 rounded-lg text-[10px] md:text-[11px] font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeFilter === "image" ? "bg-emerald-600 text-white shadow-sm" : "bg-emerald-50/50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100"}`}>
              <Eye size={12}/> Rasm orqali
            </button>
            <div className="w-px h-4 bg-slate-200 shrink-0 mx-1"></div>
            <button onClick={() => setActiveFilter("easy")} className={`px-3 py-1.5 rounded-lg text-[10px] md:text-[11px] font-bold whitespace-nowrap transition-colors ${activeFilter === "easy" ? "bg-slate-800 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Oson</button>
            <button onClick={() => setActiveFilter("medium")} className={`px-3 py-1.5 rounded-lg text-[10px] md:text-[11px] font-bold whitespace-nowrap transition-colors ${activeFilter === "medium" ? "bg-slate-800 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>O'rta</button>
            <button onClick={() => setActiveFilter("hard")} className={`px-3 py-1.5 rounded-lg text-[10px] md:text-[11px] font-bold whitespace-nowrap transition-colors ${activeFilter === "hard" ? "bg-slate-800 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Qiyin</button>
          </div>
        </div>
      </div>

      {/* 🟢 MAIN LIST */}
      <div className="max-w-4xl mx-auto px-3 md:px-4 mt-4 md:mt-6">
        
        {loading ? (
          <div className="space-y-3 md:space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-4 rounded-[1.25rem] border border-slate-100 h-28 animate-pulse flex flex-col justify-between">
                <div className="flex gap-2"><div className="w-12 h-4 bg-slate-100 rounded-md"></div><div className="w-20 h-4 bg-slate-100 rounded-md"></div></div>
                <div className="space-y-2"><div className="w-full h-2.5 bg-slate-100 rounded-full"></div><div className="w-2/3 h-2.5 bg-slate-100 rounded-full"></div></div>
              </div>
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 md:p-12 text-center shadow-sm mt-8">
            <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Filter size={24} className="text-slate-400" /></div>
            <h2 className="text-[15px] md:text-[16px] font-black text-slate-900 mb-1.5">Savollar topilmadi</h2>
            <p className="text-[11px] md:text-[13px] text-slate-500 mb-6 max-w-sm mx-auto">Ushbu filtr bo'yicha bazangizda savollar yo'q.</p>
            <button onClick={() => setActiveFilter("all")} className="px-5 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-[11px] md:text-[12px] font-bold rounded-xl transition-colors">Barcha savollarni ko'rish</button>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {questions.map((q, index) => {
              const isSelected = selectedQuestions.has(q.id);
              const questionText = getText(q.question);
              const subject = q.subject && q.subject !== "by_image" ? q.subject : "Umumiy Fan";
              const diff = q.difficulty || "medium";
              const method = q.creationMethod || "custom";

              // Method styling
              let methodStyle = "bg-slate-100 text-slate-600";
              let methodLabel = "Maxsus";
              let MethodIcon = Layers;
              if (method === "by_image") { methodStyle = "bg-emerald-50 text-emerald-600 border-emerald-100"; methodLabel = "Rasm"; MethodIcon = Eye; }
              else if (method.includes("ai")) { methodStyle = "bg-blue-50 text-blue-600 border-blue-100"; methodLabel = "AI"; MethodIcon = Sparkles; }

              const cardContent = (
                <div className={`bg-white p-3.5 md:p-5 rounded-[1.25rem] md:rounded-2xl border-[2px] transition-all duration-200 group relative ${isSelected ? 'border-indigo-500 shadow-md ring-4 ring-indigo-500/10' : 'border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300'}`}>
                  
                  {/* Select Checkbox (Absolute Top Right) */}
                  <div className="absolute top-3.5 right-3.5 md:top-5 md:right-5 z-10">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleSelection(q.id); }}
                      className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white scale-110 shadow-sm shadow-indigo-500/30' : 'bg-slate-50 border-slate-300 text-transparent hover:border-indigo-400'}`}
                    >
                      <CheckCircle2 size={14} className="md:w-4 md:h-4" strokeWidth={3} />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-3 pr-10">
                    <span className={`text-[9px] md:text-[10px] font-black px-2 py-1 rounded-md uppercase flex items-center gap-1 border ${methodStyle}`}>
                      <MethodIcon size={10} strokeWidth={2.5}/> {methodLabel}
                    </span>
                    <span className="bg-slate-50 text-slate-600 text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-md border border-slate-200/60 uppercase flex items-center gap-1">
                      <Folder size={10} /> <span className="truncate max-w-[100px]">{subject}</span>
                    </span>
                    <span className={`text-[9px] md:text-[10px] font-black px-2 py-1 rounded-md uppercase border ${diff === 'hard' ? 'bg-rose-50 text-rose-600 border-rose-100' : diff === 'easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                      {diff}
                    </span>
                  </div>

                  <div className="font-semibold text-[12px] md:text-[14px] text-slate-900 leading-snug line-clamp-2 pr-2">
                    <FormattedText text={questionText} />
                  </div>

                  <div className="mt-3 md:mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[9px] md:text-[10px] font-medium text-slate-400 flex items-center gap-1">
                      <Calendar size={10} /> {q.createdAt?.toDate ? q.createdAt.toDate().toLocaleDateString('uz-UZ') : "Yaqinda"}
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); setInfoModalData(q); }} className="px-2.5 py-1 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 border border-slate-200 rounded-lg text-[10px] md:text-[11px] font-bold transition-colors flex items-center gap-1">
                        <Eye size={12}/> To'liq ko'rish
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteModalId(q.id); }} className="p-1 md:p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 border border-slate-200 rounded-lg transition-colors">
                        <Trash2 size={12} className="md:w-3.5 md:h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );

              if (questions.length === index + 1) {
                return <div ref={lastQuestionElementRef} key={q.id} onClick={() => toggleSelection(q.id)} className="cursor-pointer">{cardContent}</div>;
              } else {
                return <div key={q.id} onClick={() => toggleSelection(q.id)} className="cursor-pointer">{cardContent}</div>;
              }
            })}

            <div className="pt-4 pb-12 flex justify-center text-slate-400">
              {loadingMore && <Loader2 size={20} className="animate-spin text-indigo-500" />}
              {!hasMore && questions.length > 0 && <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest">Barcha savollar yuklandi</p>}
            </div>
          </div>
        )}
      </div>

      {/* 🟢 FLOATING SHOPPING CART ACTIONS */}
      <AnimatePresence>
        {selectedQuestions.size > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-5 left-0 right-0 px-4 z-40 flex justify-center"
          >
            <div className="bg-slate-900 text-white px-4 md:px-5 py-3 md:py-3.5 rounded-2xl shadow-2xl shadow-slate-900/40 flex items-center gap-4 md:gap-6 border border-slate-700 w-full max-w-[400px]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-500 rounded-full flex items-center justify-center text-[12px] md:text-[14px] font-black shadow-inner">
                  {selectedQuestions.size}
                </div>
                <span className="text-[10px] md:text-[12px] font-medium text-slate-300 leading-tight">savol<br/>tanlandi</span>
              </div>
              
              <button 
                onClick={handleCreateTestInitiate}
                className="flex-1 bg-white text-slate-900 px-4 py-2.5 md:py-3 rounded-xl font-black text-[12px] md:text-[13px] active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 size={16}/> Topshiriq yaratish
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* 🟢 ALL MODALS (PORTALIZED)                                            */}
      {/* ===================================================================== */}
      
      {mounted && createPortal(
        <>
          {/* X-RAY INFO MODAL */}
          <AnimatePresence>
            {infoModalData && (
              <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setInfoModalData(null)} />
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-[1.5rem] md:rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl z-10 overflow-hidden">
                  
                  <div className="p-4 md:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Eye size={16} /></div>
                      <div>
                        <h3 className="text-[14px] md:text-[16px] font-black text-slate-900 leading-tight">To'liq Ma'lumot</h3>
                        <p className="text-[9px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{infoModalData.id}</p>
                      </div>
                    </div>
                    <button onClick={() => setInfoModalData(null)} className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 md:gap-2 mb-5 md:mb-6">
                      <span className="bg-slate-100 text-slate-600 text-[10px] md:text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 uppercase"><Folder size={12} className="inline mr-1"/> {infoModalData.subject || "Umumiy Fan"}</span>
                      {infoModalData.topic && <span className="bg-slate-100 text-slate-600 text-[10px] md:text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 uppercase"><Target size={12} className="inline mr-1"/> {infoModalData.topic}</span>}
                      {infoModalData.chapter && <span className="bg-slate-100 text-slate-600 text-[10px] md:text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 uppercase"><BookMarked size={12} className="inline mr-1"/> {infoModalData.chapter}</span>}
                      <span className="bg-slate-900 text-white text-[10px] md:text-[11px] font-bold px-2.5 py-1.5 rounded-lg uppercase">{infoModalData.difficulty || "medium"}</span>
                    </div>

                    {/* Question */}
                    <div className="mb-6 md:mb-8">
                      <h4 className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">Savol Matni</h4>
                      <p className="font-semibold text-[14px] md:text-[16px] text-slate-900 leading-relaxed"><FormattedText text={getText(infoModalData.question)} /></p>
                    </div>

                    {/* Options */}
                    <div className="mb-6 md:mb-8">
                      <h4 className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Variantlar</h4>
                      <div className="flex flex-col gap-2">
                        {['A', 'B', 'C', 'D'].map(key => {
                          const val = infoModalData.options?.[key];
                          if (!val) return null;
                          const isCorrect = infoModalData.answer === key;
                          return (
                            <div key={key} className={`flex items-start p-3 rounded-xl border transition-all ${isCorrect ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'}`}>
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black mr-3 shrink-0 mt-0.5 ${isCorrect ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20' : 'bg-slate-100 text-slate-500'}`}>{key}</div>
                              <div className={`text-[13px] md:text-[14px] font-medium pt-0.5 break-words ${isCorrect ? 'text-emerald-950' : 'text-slate-700'}`}><FormattedText text={getText(val)} /></div>
                              {isCorrect && <div className="ml-auto bg-emerald-100 text-emerald-700 text-[9px] font-black px-2 py-1 rounded border border-emerald-200 uppercase tracking-widest mt-0.5">To'g'ri Javob</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanation */}
                    {getText(infoModalData.explanation).trim().length > 0 && (
                      <div>
                        <h4 className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">Yechim / Izoh</h4>
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                          <p className="text-[12px] md:text-[14px] text-slate-700 leading-relaxed font-medium"><FormattedText text={getText(infoModalData.explanation)} /></p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* DELETE CONFIRMATION MODAL */}
          <AnimatePresence>
            {deleteModalId && (
              <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteModalId(null)} />
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-[1.5rem] p-6 max-w-[320px] w-full text-center shadow-2xl z-10 border border-slate-100">
                  <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={24} className="text-rose-500" /></div>
                  <h3 className="text-[16px] font-black text-slate-900 mb-2">O'chirishni tasdiqlaysizmi?</h3>
                  <p className="text-[12px] text-slate-500 mb-6 font-medium leading-relaxed">Bu savol bazadan butunlay o'chiriladi. Bu jarayonni orqaga qaytarib bo'lmaydi.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteModalId(null)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[12px] font-bold rounded-xl transition-colors">Bekor qilish</button>
                    <button onClick={handleDelete} className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"><Trash2 size={14}/> O'chirish</button>
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
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-indigo-50 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-5 border border-indigo-100"><BookOpen size={24} strokeWidth={2.5} className="text-indigo-600 md:w-7 md:h-7" /></div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 mb-1 md:mb-1.5">Test nomini kiriting</h3>
                  <p className="text-[11px] md:text-[13px] font-medium text-slate-500 mb-5 md:mb-6 leading-relaxed">Tanlangan {selectedQuestions.size} ta savoldan iborat test uchun nom bering.</p>
                  <input type="text" value={testTitle} onChange={e => setTestTitle(e.target.value)} className="w-full px-3 py-2.5 md:px-4 md:py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] md:text-[14px] font-black text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all mb-6 md:mb-8 placeholder:font-medium placeholder:text-slate-400" autoFocus placeholder="Masalan: Aralash savollar to'plami"/>
                  <div className="flex flex-col-reverse sm:flex-row gap-2 md:gap-3">
                    <button onClick={() => setIsTitleModalOpen(false)} className="w-full px-4 py-2.5 md:py-3.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-[12px] md:text-[14px]">Bekor qilish</button>
                    <button onClick={handleTitleSubmit} className="w-full px-4 py-2.5 md:py-3.5 bg-slate-900 hover:bg-black text-white font-black rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-[12px] md:text-[14px]">
                      Davom etish <ChevronRight size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5}/>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}

      {mounted && createPortal(
        <TestConfigurationModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={handleFinalPublish} questionCount={selectedQuestions.size} testTitle={testTitle} isSaving={isPublishing} />,
        document.body
      )}

    </div>
  );
}
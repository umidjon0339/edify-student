"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc, orderBy, limit, startAfter } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { 
  ArrowLeft, FileText, Search, Plus, Trash2, Clock, 
  Layers, Zap, Printer, X, Eye, Loader2, Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import katex from 'katex';
import 'katex/dist/katex.min.css';

// ============================================================================
// 1. YORDAMCHI FUNKSIYALAR VA KOMPONENTLAR
// ============================================================================

// --- LATEX FORMATTER ---
const FormattedText = ({ text }: { text: any }) => {
  if (!text) return null;
  let content = typeof text === 'string' ? text : JSON.stringify(text);

  const hasMathCommands = /\\frac|\\pi|\\sin|\\cos|\\tan|\\ge|\\le|\\cup|\\cap|\\in|\\begin|\\sqrt|\\empty/.test(content);
  if (!content.includes('$') && hasMathCommands) content = `$${content}$`;

  content = content.replace(/\\\((.*?)\\\)/g, '$$$1$$').replace(/\\\[(.*?)\\\]/g, '$$$$$1$$$$').replace(/&nbsp;/g, ' ').replace(/\\\\/g, '\\');
  const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

  return (
    <span className="break-words leading-relaxed text-slate-900">
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
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="px-0.5 inline-block" />;
          } catch (e) { return <span key={index} className="text-red-500 font-mono text-[13px] bg-red-50 px-1 rounded">{part}</span>; }
        }
        return <span key={index}>{part.split('\n').map((line, i, arr) => (<span key={i}>{line}{i < arr.length - 1 && <br />}</span>))}</span>;
      })}
    </span>
  );
};

// --- SHUFFLE MATCHING PAIRS ---
const processMatchingQuestion = (pairs: any[]) => {
  const getText = (f: any) => f?.uz || f || "";
  const lefts = pairs.map((p, i) => ({ text: getText(p.left), originalIndex: i }));
  const rights = pairs.map((p, i) => ({ text: getText(p.right), originalIndex: i }));
  
  rights.sort((a, b) => a.text.localeCompare(b.text)); // Alphabetical sort for stable shuffle
  
  const answerKey = lefts.map((leftItem, i) => {
    const rightIndex = rights.findIndex(r => r.originalIndex === leftItem.originalIndex);
    return `${i + 1}) - ${String.fromCharCode(65 + rightIndex)}`;
  }).join(", ");
  
  return { lefts, rights, answerKey };
};

// ============================================================================
// 2. EXAM VIEWER MODAL (PROFESSIONAL PRINT STYLING & PAGINATION FIX)
// ============================================================================
const ExamViewer = ({ selectedTest, onClose }: { selectedTest: any, onClose: () => void }) => {
  const printRef = useRef<HTMLDivElement>(null);
  
  const [isGeneratingStudent, setIsGeneratingStudent] = useState(false);
  const [isGeneratingTeacher, setIsGeneratingTeacher] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  const getText = (field: any) => field?.uz || field || "";

  const handleDownloadPdf = async (withAnswers: boolean) => {
    if (!printRef.current) return toast.error("Hujjat topilmadi!");

    if (withAnswers) setIsGeneratingTeacher(true);
    else setIsGeneratingStudent(true);
    
    setShowAnswers(withAnswers);

    setTimeout(async () => {
      try {
        const element = printRef.current;
        if (!element) return;

        await document.fonts.ready;

        const images = Array.from(element.getElementsByTagName('img'));
        await Promise.all(images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
        }));

        const html2pdf = (await import("html2pdf.js")).default;

        const opt: any = {
          margin:       [15, 15, 20, 15], // Added more bottom margin for natural page breaks
          filename:     `${selectedTest?.title.replace(/\s+/g, '_')}_${withAnswers ? 'Kalit' : 'Oquvchi'}.pdf`,
          image:        { type: 'jpeg', quality: 1 },
          html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            letterRendering: true,
            scrollY: 0,
            windowWidth: 850 // Slightly wider for a better A4 aspect ratio fit
          },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
          // 🟢 THE BUG FIX: Removed 'avoid-all'. Relying strictly on CSS classes now.
          pagebreak:    { mode: ['css', 'legacy'] } 
        };

        await html2pdf().set(opt).from(element).save();
        toast.success("PDF muvaffaqiyatli yuklandi!");

      } catch (error) {
        console.error("PDF yaratishda xatolik:", error);
        toast.error("PDF yaratishda xatolik yuz berdi. Internet aloqasini tekshiring.");
      } finally {
        setIsGeneratingStudent(false);
        setIsGeneratingTeacher(false);
        setShowAnswers(false); 
      }
    }, 500); 
  };

  return (
    <>
      {/* 🟢 UPGRADED GLOBAL CSS FOR PROFESSIONAL PRINTING */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&family=Inter:wght@400;500;600;700&display=swap');
        
        .pdf-document { font-family: 'Inter', sans-serif; color: #111827; }
        .pdf-header-text { font-family: 'Merriweather', serif; }
        
        /* Strict Page Break Rules to fix the Biology Gap Bug */
        .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; margin-bottom: 2rem; }
        
        /* Math Alignment Fixes */
        .pdf-document .katex-display { margin: 0.5em 0 !important; overflow: visible !important; }
        .pdf-document .katex { font-size: 1.1em; line-height: 1; padding-bottom: 2px; }
        .pdf-document .katex-html { overflow: visible !important; }
        
        /* General Print Fixes */
        .pdf-document * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .pdf-document img { page-break-inside: avoid; break-inside: avoid; max-width: 100%; height: auto; }
      `}} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100]" />
      
      <motion.div 
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 w-full max-w-4xl h-full bg-slate-100 shadow-2xl z-[110] flex flex-col"
      >
        {/* Control Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 shadow-sm z-10">
          <div>
            <h2 className="text-[18px] font-black text-slate-900">{selectedTest?.title}</h2>
            <p className="text-[13px] font-medium text-slate-500">{selectedTest?.grade} • {selectedTest?.subject}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => handleDownloadPdf(false)} disabled={isGeneratingStudent || isGeneratingTeacher} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 border border-slate-300 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all">
              {isGeneratingStudent ? <Loader2 size={16} className="animate-spin"/> : <Download size={16} />}
              {isGeneratingStudent ? "Yuklanmoqda..." : "O'quvchi PDF"}
            </button>
            <button onClick={() => handleDownloadPdf(true)} disabled={isGeneratingStudent || isGeneratingTeacher} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all shadow-sm">
              {isGeneratingTeacher ? <Loader2 size={16} className="animate-spin"/> : <Eye size={16} />}
              {isGeneratingTeacher ? "Kutib turing..." : "Javoblar kaliti PDF"}
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            <button onClick={onClose} disabled={isGeneratingStudent || isGeneratingTeacher} className="p-2 bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-500 rounded-xl transition-colors disabled:opacity-50">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          
          {/* 🟢 PRINTABLE AREA */}
          <div ref={printRef} className="pdf-document bg-white max-w-[850px] mx-auto p-10 shadow-lg text-slate-900">
            
            {/* 🎓 PROFESSIONAL EXAM HEADER */}
            <div className="mb-10 pb-6 border-b-[3px] border-slate-800 avoid-break">
              <h1 className="pdf-header-text text-[24px] md:text-[28px] font-black uppercase tracking-wide text-center text-slate-900 mb-6">
                {selectedTest?.title || `${selectedTest?.subject} — ${selectedTest?.assessmentType}`}
              </h1>
              
              <div className="grid grid-cols-2 gap-x-12 gap-y-5 text-[14px] font-medium text-slate-800">
                <div className="flex items-end gap-3">
                  <span className="shrink-0 font-bold">O'quvchi F.I.Sh:</span>
                  <div className="border-b border-slate-400 flex-1 h-5"></div>
                </div>
                <div className="flex items-end gap-3">
                  <span className="shrink-0 font-bold">Sana:</span>
                  <div className="border-b border-slate-400 w-32 h-5"></div>
                </div>
                <div className="flex items-end gap-3">
                  <span className="shrink-0 font-bold">Sinf / Guruh:</span>
                  <div className="border-b border-slate-400 flex-1 h-5"></div>
                </div>
                <div className="flex items-end gap-3">
                  <span className="shrink-0 font-bold">To'plangan Ball:</span>
                  <div className="border-b border-slate-400 w-32 h-5 text-center text-slate-400 italic text-[12px] pb-1">/ {selectedTest?.totalPoints || 0}</div>
                </div>
              </div>
            </div>

            {/* Questions Loop */}
            <div className="space-y-0"> {/* Margin is handled by .avoid-break class now */}
              {selectedTest?.questions?.map((q: any, idx: number) => {
                return (
                  <div key={q.id} className="avoid-break html2pdf__page-break-inside-avoid">
                    
                    {/* Reading Passages */}
                    {q.context && (
                      <div className="mb-4 p-5 bg-slate-50 border-l-4 border-slate-400 text-[14px] text-slate-800 leading-relaxed text-justify">
                        <FormattedText text={getText(q.context)} />
                      </div>
                    )}

                    {/* Question Stem */}
                    <div className="flex items-start gap-3 mb-4">
                      <span className="text-[16px] font-bold shrink-0">{idx + 1}.</span>
                      <div className="text-[15.5px] font-normal leading-relaxed text-slate-900 w-full">
                        <FormattedText text={getText(q.question)} />
                        <span className="ml-2 text-[12px] font-semibold text-slate-500 whitespace-nowrap">({q.points} Ball)</span>
                        
                        {/* Images */}
                        {q.imageUrl && (
                          <div className="my-4 flex justify-center w-full">
                            <img 
                              src={q.imageUrl} 
                              alt="Question Figure" 
                              crossOrigin="anonymous" 
                              className="max-w-full max-h-[300px] object-contain rounded-md border border-slate-300 p-1"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pl-7">
                      
                      {/* 1. MCQ OPTIONS */}
                      {q.type === "mcq" && q.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 pl-1">
                          {Object.entries(q.options).map(([key, value]) => (
                            <div key={key} className="flex items-start gap-2.5">
                              <span className="font-bold text-slate-800 shrink-0">{key})</span>
                              <span className="text-slate-800 text-[15px] leading-snug"><FormattedText text={getText(value)} /></span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 2. SHORT ANSWER */}
                      {q.type === "short_answer" && (
                        <div className="mt-4 mb-2 flex items-end gap-3">
                          <span className="font-bold text-slate-800 text-[15px]">Javob:</span>
                          <div className="border-b border-dashed border-slate-500 w-64 h-6"></div>
                        </div>
                      )}

                      {/* 3. TRUE / FALSE */}
                      {q.type === "true_false" && (
                        <div className="flex gap-10 mt-4 pl-1">
                          <label className="flex items-center gap-3">
                            <div className="w-5 h-5 border-[1.5px] border-slate-400 rounded-sm"></div>
                            <span className="font-bold text-[15px] text-slate-800">Rost</span>
                          </label>
                          <label className="flex items-center gap-3">
                            <div className="w-5 h-5 border-[1.5px] border-slate-400 rounded-sm"></div>
                            <span className="font-bold text-[15px] text-slate-800">Yolg'on</span>
                          </label>
                        </div>
                      )}

                      {/* 4. MATCHING */}
                      {q.type === "matching" && q.pairs && (() => {
                        const { lefts, rights, answerKey } = processMatchingQuestion(q.pairs);
                        return (
                          <div className="mt-4">
                            <div className="grid grid-cols-2 gap-6 mb-5 border-[1.5px] border-slate-300 rounded-xl p-4 bg-slate-50/30">
                              <div className="space-y-3 border-r border-slate-300 pr-6">
                                {lefts.map((l, i) => (
                                  <div key={i} className="flex items-start gap-2.5">
                                    <span className="font-bold text-[14px] shrink-0">{i + 1})</span>
                                    <span className="text-[14px] leading-snug"><FormattedText text={l.text} /></span>
                                  </div>
                                ))}
                              </div>
                              <div className="space-y-3 pl-2">
                                {rights.map((r, i) => (
                                  <div key={i} className="flex items-start gap-2.5">
                                    <span className="font-bold text-[14px] shrink-0">{String.fromCharCode(65 + i)})</span>
                                    <span className="text-[14px] leading-snug"><FormattedText text={r.text} /></span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-5 items-center pl-1">
                              <span className="font-bold text-[15px] text-slate-800">Javoblar:</span>
                              {lefts.map((_, i) => (
                                <div key={i} className="flex items-end gap-1.5">
                                  <span className="font-bold text-[15px]">{i + 1} - </span>
                                  <div className="border-b border-slate-500 w-10 h-5"></div>
                                </div>
                              ))}
                            </div>
                            <div className="hidden">{q.injectedAnswer = answerKey}</div>
                          </div>
                        );
                      })()}

                      {/* 5. OPEN ENDED */}
                      {q.type === "open_ended" && (
                        <div className="mt-5 space-y-7">
                          <div className="border-b border-dashed border-slate-400 w-full h-5"></div>
                          <div className="border-b border-dashed border-slate-400 w-full h-5"></div>
                          <div className="border-b border-dashed border-slate-400 w-full h-5"></div>
                          <div className="border-b border-dashed border-slate-400 w-full h-5"></div>
                        </div>
                      )}

                      {/* 🟢 TEACHER ANSWER KEY */}
                      <div style={{ display: showAnswers ? 'block' : 'none' }} className="mt-6 bg-slate-50 p-5 rounded-xl border border-slate-300 html2pdf__page-break-inside-avoid">
                        <p className="text-[12px] font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2"><Eye size={16}/> To'g'ri Javob Kaliti</p>
                        
                        {q.type === "mcq" && <p className="font-bold text-slate-800 text-[15px]">Javob: <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{q.answer}</span></p>}
                        {q.type === "short_answer" && <p className="font-bold text-slate-800 text-[15px]">Javob: <span className="text-indigo-700"><FormattedText text={getText(q.answer)} /></span></p>}
                        {q.type === "true_false" && <p className="font-bold text-slate-800 text-[15px]">Javob: <span className={q.answer ? "text-emerald-600" : "text-rose-600"}>{q.answer ? "Rost" : "Yolg'on"}</span></p>}
                        {q.type === "matching" && <p className="font-bold text-slate-800 text-[15px]">Javob kaliti: <span className="text-indigo-700">{q.injectedAnswer}</span></p>}

                        {q.type === "open_ended" && (
                          <div className="space-y-3">
                            <p className="text-[15px] text-slate-800 font-medium leading-relaxed"><FormattedText text={getText(q.answer)} /></p>
                            <div className="border-t border-slate-200 pt-3 mt-3">
                              <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Baholash mezoni (Rubric):</span>
                              <p className="text-[14px] font-semibold text-slate-700 mt-1"><FormattedText text={getText(q.rubric)} /></p>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};
// ============================================================================
// 3. MAIN PAGE (PAGINATION, FILTERING, UI)
// ============================================================================

export default function MyAssessmentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // States
  const [tests, setTests] = useState<any[]>([]);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"Barcha" | "BSB" | "CHSB">("Barcha");
  
  const [selectedTest, setSelectedTest] = useState<any | null>(null);
  const ITEMS_PER_PAGE = 12;

  // --- FETCH LOGIC ---
  const fetchTests = async (isLoadMore = false) => {
    if (!user) return;
    if (isLoadMore) setIsLoadingMore(true);
    else setIsLoading(true);

    try {
      let constraints: any[] = [
        where("teacherId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(ITEMS_PER_PAGE)
      ];

      if (isLoadMore && lastVisibleDoc) {
        constraints.push(startAfter(lastVisibleDoc));
      }

      const q = query(collection(db, "bsb_chsb_tests"), ...constraints);
      const snapshot = await getDocs(q);
      
      const newTests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (isLoadMore) {
        setTests(prev => [...prev, ...newTests]);
      } else {
        setTests(newTests);
      }

      if (snapshot.docs.length > 0) {
        setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === ITEMS_PER_PAGE); 
      } else {
        setHasMore(false);
      }

    } catch (error) {
      console.error("Error fetching tests:", error);
      toast.error("Imtihonlarni yuklashda xatolik yuz berdi.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchTests(false);
  }, [user]);

  // --- DELETE LOGIC ---
  const handleDelete = async (e: React.MouseEvent, testId: string) => {
    e.stopPropagation(); 
    if (!confirm("Haqiqatan ham bu imtihonni o'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.")) return;
    
    try {
      await deleteDoc(doc(db, "bsb_chsb_tests", testId));
      setTests(prev => prev.filter(t => t.id !== testId));
      toast.success("Imtihon o'chirildi!");
      if (selectedTest?.id === testId) setSelectedTest(null);
    } catch (error) {
      toast.error("O'chirishda xatolik yuz berdi.");
    }
  };

  // --- CLIENT-SIDE FILTERING ---
  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          test.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "Barcha" || test.assessmentType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/teacher/library')} className="text-slate-400 hover:text-slate-900 transition-colors"><ArrowLeft size={20} /></button>
            <div className="w-px h-5 bg-slate-200"></div>
            <h1 className="text-[18px] font-bold text-slate-900 tracking-tight flex items-center gap-2"><FileText size={18} className="text-indigo-600"/> Mening Imtihonlarim</h1>
          </div>
          <button onClick={() => router.push('/teacher/create/bsb-chsb')} className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-lg text-[14px] font-semibold transition-all flex items-center gap-2 shadow-sm">
            <Plus size={16} /> Yangi Yaratish
          </button>
        </div>
      </div>

      <main className="max-w-[1200px] mx-auto px-6 py-8">
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto">
            {['Barcha', 'BSB', 'CHSB'].map((type) => (
              <button key={type} onClick={() => setFilterType(type as any)} className={`flex-1 md:px-6 py-2 text-[13px] font-bold rounded-lg transition-all ${filterType === type ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                {type}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Qidirish (Nomi yoki Fan)..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm"/>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={32} className="animate-spin mb-4 text-indigo-500" />
            <p className="font-medium text-[14px]">Imtihonlar yuklanmoqda...</p>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6"><FileText size={32} className="text-indigo-300" /></div>
            <h2 className="text-[20px] font-bold text-slate-800 mb-2">Hozircha imtihonlar yo'q</h2>
            <button onClick={() => router.push('/teacher/create/bsb-chsb')} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-md transition-all">
              Generatorda Yaratish
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
              {filteredTests.map((test) => (
                <motion.div key={test.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => setSelectedTest(test)} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer group flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${test.assessmentType === 'BSB' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                      {test.assessmentType}
                    </span>
                    <button onClick={(e) => handleDelete(e, test.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                  </div>
                  
                  <h3 className="text-[16px] font-bold text-slate-900 mb-1 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">{test.title}</h3>
                  <p className="text-[13px] font-medium text-slate-500 mb-6 flex items-center gap-1.5"><Layers size={14}/> {test.grade} • {test.subject}</p>

                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-[12px] font-bold text-slate-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1"><FileText size={14} className="text-slate-400"/> {test.questionCount} Savol</span>
                      <span className="flex items-center gap-1 text-indigo-600"><Zap size={14} className="text-indigo-400"/> {test.totalPoints} Ball</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} className="text-slate-400"/> {test.createdAt ? new Date(test.createdAt.toDate()).toLocaleDateString('uz-UZ') : 'Yangi'}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* LOAD MORE */}
            {hasMore && (
              <div className="flex justify-center">
                <button 
                  onClick={() => fetchTests(true)} 
                  disabled={isLoadingMore}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-8 py-3 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isLoadingMore ? <Loader2 size={18} className="animate-spin text-indigo-600" /> : null}
                  {isLoadingMore ? "Yuklanmoqda..." : "Ko'proq yuklash"}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* RENDER VIEWER IF TEST IS SELECTED */}
      <AnimatePresence>
        {selectedTest && <ExamViewer selectedTest={selectedTest} onClose={() => setSelectedTest(null)} />}
      </AnimatePresence>

    </div>
  );
}
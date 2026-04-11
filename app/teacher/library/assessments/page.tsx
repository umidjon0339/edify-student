"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc, orderBy, limit, startAfter } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { 
  FileText, Search, Plus, Trash2, Clock, 
  Layers, Zap, Eye, Loader2, Download, X,
  ChevronDown, ChevronRight, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import toast from "react-hot-toast";
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { createPortal } from "react-dom";
import { useTeacherLanguage } from "@/app/teacher/layout";

// ============================================================================
// 1. YORDAMCHI FUNKSIYALAR VA KOMPONENTLAR
// ============================================================================

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

const processMatchingQuestion = (pairs: any[]) => {
  const getText = (f: any) => f?.uz || f || "";
  const lefts = pairs.map((p, i) => ({ text: getText(p.left), originalIndex: i }));
  const rights = pairs.map((p, i) => ({ text: getText(p.right), originalIndex: i }));
  rights.sort((a, b) => a.text.localeCompare(b.text)); 
  const answerKey = lefts.map((leftItem, i) => {
    const rightIndex = rights.findIndex(r => r.originalIndex === leftItem.originalIndex);
    return `${i + 1}) - ${String.fromCharCode(65 + rightIndex)}`;
  }).join(", ");
  return { lefts, rights, answerKey };
};

const CardIllustration = ({ theme }: { theme: string }) => (
  <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none opacity-20 group-hover:opacity-60 transition-opacity duration-700 z-0">
    <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`grad-${theme}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <motion.circle cx="160" cy="160" r="80" fill={`url(#grad-${theme})`} className={`text-${theme}-500`} animate={{ x: [-15, 10, -15], y: [-10, 15, -10], scale: [1, 1.1, 1] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
      <motion.circle cx="40" cy="40" r="60" fill={`url(#grad-${theme})`} className={`text-${theme}-500`} animate={{ x: [10, -10, 10], y: [15, -10, 15], scale: [1, 1.2, 1] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
    </svg>
  </div>
);

const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const THEMES = ['blue', 'purple', 'emerald', 'rose', 'amber', 'cyan'];

// ============================================================================
// 2. EXAM VIEWER MODAL (BULLETPROOF PDF OPTIMIZED)
// ============================================================================
const ExamViewer = ({ selectedTest, onClose }: { selectedTest: any, onClose: () => void }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { lang } = useTeacherLanguage();
  
  const [isGeneratingStudent, setIsGeneratingStudent] = useState(false);
  const [isGeneratingTeacher, setIsGeneratingTeacher] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const VIEWER_T: any = {
    uz: { studentBtn: "O'quvchi uchun", keyBtn: "Javoblar bilan", generating: "Yuklanmoqda...", wait: "Kutib turing..." },
    en: { studentBtn: "For Student", keyBtn: "With Answer Key", generating: "Generating...", wait: "Please wait..." },
    ru: { studentBtn: "Для ученика", keyBtn: "С ответами", generating: "Загрузка...", wait: "Подождите..." }
  };
  const t = VIEWER_T[lang] || VIEWER_T['uz'];

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

        // Force a slight delay to ensure KaTeX and fonts are absolutely ready
        await document.fonts.ready;
        await new Promise(r => setTimeout(r, 300)); 

        const images = Array.from(element.getElementsByTagName('img'));
        await Promise.all(images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
        }));

        const html2pdf = (await import("html2pdf.js")).default;
        
        const opt: any = {
  margin: [12, 12, 15, 12], 
  filename: `${selectedTest?.title.replace(/\s+/g, '_')}_${withAnswers ? 'Kalit' : 'Oquvchi'}.pdf`,
  image: { type: 'jpeg', quality: 1 },
  html2canvas: { 
    scale: 2, 
    useCORS: true, 
    letterRendering: true, 
    scrollY: 0, 
    windowWidth: 800,
    onclone: (documentClone: Document) => {
      const el = documentClone.getElementById('pdf-content');
      if (el) {
        el.style.width = '794px'; 
        el.style.maxWidth = '794px';
      }
    }
  },
  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  // 🟢 ASOSIY YECHIM: avoid: '.avoid-break' qo'shildi! 
  // Bu kutubxonaga ushbu klassga ega bloklarni ASLO o'rtasidan kesmaslikni buyuradi.
  pagebreak: { mode: ['css', 'legacy'], avoid: '.avoid-break' } 
};

        await html2pdf().set(opt).from(element).save();
        toast.success("PDF muvaffaqiyatli yuklandi!");
      } catch (error) {
        toast.error("PDF yaratishda xatolik yuz berdi.");
      } finally {
        setIsGeneratingStudent(false);
        setIsGeneratingTeacher(false);
        setShowAnswers(false); 
      }
    }, 500); 
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@700;900&family=Inter:wght@400;500;600;700&display=swap');
        .pdf-document { font-family: 'Inter', sans-serif; color: #0F172A; line-height: 1.5; }
        .pdf-header-text { font-family: 'Merriweather', serif; }
        .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; margin-bottom: 1.5rem; }
        
        /* 🟢 1. KATEX ALIGNMENT FIX */
        .pdf-document .katex-display { margin: 0.4em 0 !important; overflow: visible !important; }
        .pdf-document .katex { font-size: 1.1em; line-height: 1; display: inline-block; vertical-align: middle; }
        .pdf-document .katex-html { overflow: visible !important; }
        
        /* 🟢 2. GENERAL INLINE FIXES */
        .align-middle-fix { display: inline-block; vertical-align: middle; line-height: 1; }
        
        .pdf-document * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .pdf-document img { page-break-inside: avoid; break-inside: avoid; max-width: 100%; height: auto; }
      `}} />
      
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] flex justify-end overflow-hidden">
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-full md:max-w-4xl h-[100dvh] bg-slate-100 shadow-2xl flex flex-col z-10">
          
          {/* Header Controls */}
          <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3.5 flex justify-between items-center shrink-0 z-20 shadow-sm">
            <div className="min-w-0 pr-4">
              <h2 className="text-[17px] md:text-[20px] font-black text-slate-900 truncate">{selectedTest?.title}</h2>
              <p className="text-[12px] md:text-[13px] font-medium text-slate-500 mt-0.5">{selectedTest?.grade} • {selectedTest?.subject}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden md:flex items-center gap-3">
                <button onClick={() => handleDownloadPdf(false)} disabled={isGeneratingStudent || isGeneratingTeacher} className="flex justify-center items-center gap-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all shadow-sm">
                  {isGeneratingStudent ? <Loader2 size={16} className="animate-spin"/> : <Download size={16} />}
                  {isGeneratingStudent ? t.generating : t.studentBtn}
                </button>
                <button onClick={() => handleDownloadPdf(true)} disabled={isGeneratingStudent || isGeneratingTeacher} className="flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all shadow-sm shadow-indigo-600/20">
                  {isGeneratingTeacher ? <Loader2 size={16} className="animate-spin"/> : <Eye size={16} />}
                  {isGeneratingTeacher ? t.wait : t.keyBtn}
                </button>
                <div className="w-px h-6 bg-slate-200 mx-1"></div>
              </div>
              <button onClick={onClose} disabled={isGeneratingStudent || isGeneratingTeacher} className="p-2 md:p-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-500 rounded-full transition-colors disabled:opacity-50"><X size={20} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-0 md:p-8 pb-[100px] md:pb-8 custom-scrollbar">
            
            {/* 🟢 PDF CONTENT WRAPPER */}
            <div ref={printRef} id="pdf-content" className="pdf-document bg-white w-full max-w-[794px] mx-auto p-8 shadow-lg text-slate-900 min-h-full relative overflow-hidden">
              
              {/* Premium Header Box */}
              <div className="mb-8 border-2 border-slate-800 rounded-xl overflow-hidden avoid-break">
                <div className="bg-slate-100/80 p-4 border-b-2 border-slate-800">
                  <h1 className="pdf-header-text text-[22px] font-black uppercase tracking-widest text-center text-slate-900 m-0">
                    {selectedTest?.title || `${selectedTest?.subject} — ${selectedTest?.assessmentType}`}
                  </h1>
                </div>
                {/* 🟢 Replaced Grid with Flex for guaranteed alignment */}
                <div className="p-5 flex flex-col gap-4 text-[13px] font-bold text-slate-800">
                  <div className="flex gap-10">
                    <div className="flex items-end gap-2 flex-1"><span className="shrink-0">O'quvchi F.I.Sh:</span><div className="border-b border-slate-400 flex-1 h-4"></div></div>
                    <div className="flex items-end gap-2 flex-1"><span className="shrink-0">Sana:</span><div className="border-b border-slate-400 flex-1 h-4"></div></div>
                  </div>
                  <div className="flex gap-10">
                    <div className="flex items-end gap-2 flex-1"><span className="shrink-0">Sinf / Guruh:</span><div className="border-b border-slate-400 flex-1 h-4"></div></div>
                    <div className="flex items-end gap-2 flex-1">
                      <span className="shrink-0">To'plangan Ball:</span>
                      <div className="border-b border-slate-400 flex-1 h-4"></div>
                    </div>                  
                    </div>
                </div>
              </div>

              {/* Questions Loop */}
              <div className="space-y-0 w-full">
                {selectedTest?.questions?.map((q: any, idx: number) => {
                  return (
                    <div key={q.id} className="avoid-break w-full">
                      
                      {q.context && (
                        <div className="mb-4 p-4 bg-slate-50 border-l-[4px] border-slate-400 text-[13px] text-slate-800 leading-relaxed text-justify">
                          <FormattedText text={getText(q.context)} />
                        </div>
                      )}
                      
                      <div className="flex items-start gap-2.5 mb-3 w-full">
                        <span className="text-[15px] font-black shrink-0 w-5">{idx + 1}.</span>
                        <div className="text-[14px] font-medium leading-snug text-slate-900 w-full pt-0.5">
                          {/* 🟢 Ensures badge flows nicely inline with text */}
                          <span className="inline-block"><FormattedText text={getText(q.question)} /></span>
                          <span className="ml-1.5 align-middle-fix text-[11px] font-bold text-slate-500 whitespace-nowrap relative -top-[1px]">
                            ({q.points} Ball)
                          </span>
                          
                          {q.imageUrl && <div className="my-3 flex justify-start w-full"><img src={q.imageUrl} alt="Figure" crossOrigin="anonymous" className="max-w-[70%] object-contain rounded border border-slate-300 p-1" /></div>}
                        </div>
                      </div>
                      
                      <div className="pl-8 w-full">
                        
                        {/* 🟢 FIXED MCQ: Using Flex wrapping instead of Grid for safety */}
                        {q.type === "mcq" && q.options && (
                          <div className="flex flex-wrap gap-y-2 mt-2 w-full">
                            {Object.entries(q.options)
                              .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                              .map(([key, value]) => (
                              <div key={key} className="w-1/2 flex items-start gap-2 pr-4">
                                <span className="font-bold text-slate-900 text-[14px] shrink-0">{key})</span>
                                <span className="text-slate-800 text-[14px] leading-snug break-words inline-block w-full"><FormattedText text={getText(value)} /></span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Short Answer */}
                        {q.type === "short_answer" && <div className="mt-3 mb-2 flex items-end gap-2"><span className="font-bold text-slate-800 text-[14px]">Javob:</span><div className="border-b border-slate-500 w-64 h-4"></div></div>}
                        
                        {/* 🟢 NEW: Fixed Checkbox Alignment */}
                        {q.type === "true_false" && (
                          <div className="flex gap-8 mt-3 pl-1">
                            <label className="inline-block cursor-pointer">
                              <div className="align-middle-fix w-4 h-4 border-[1.5px] border-slate-400 bg-white rounded-sm mr-2 relative -top-[1px]"></div>
                              <span className="align-middle-fix font-bold text-[14px] text-slate-800">Rost</span>
                            </label>
                            <label className="inline-block cursor-pointer">
                              <div className="align-middle-fix w-4 h-4 border-[1.5px] border-slate-400 bg-white rounded-sm mr-2 relative -top-[1px]"></div>
                              <span className="align-middle-fix font-bold text-[14px] text-slate-800">Yolg'on</span>
                            </label>
                          </div>
                        )}
                        
                        {/* 🟢 FIXED MATCHING: Using HTML Table for unbreakable layout */}
                        {q.type === "matching" && q.pairs && (() => {
                          const { lefts, rights, answerKey } = processMatchingQuestion(q.pairs);
                          return (
                            <div className="mt-3 w-full">
                              <table className="matching-table mb-4">
                                <tbody>
                                  <tr>
                                    <td>
                                      <div className="space-y-3">
                                        {lefts.map((l, i) => (<div key={i} className="flex items-start gap-2"><span className="font-bold text-[13px] shrink-0">{i + 1})</span><span className="text-[13px] leading-tight break-words inline-block w-full"><FormattedText text={l.text} /></span></div>))}
                                      </div>
                                    </td>
                                    <td>
                                      <div className="space-y-3">
                                        {rights.map((r, i) => (<div key={i} className="flex items-start gap-2"><span className="font-bold text-[13px] shrink-0">{String.fromCharCode(65 + i)})</span><span className="text-[13px] leading-tight break-words inline-block w-full"><FormattedText text={r.text} /></span></div>))}
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                              
                              <div className="flex flex-wrap gap-4 items-center">
                                <span className="font-bold text-[14px] text-slate-800">Javoblar:</span>
                                {lefts.map((_, i) => (<div key={i} className="flex items-end gap-1.5"><span className="font-bold text-[14px]">{i + 1} - </span><div className="border-b border-slate-500 w-8 h-4"></div></div>))}
                              </div>
                              <div className="hidden">{q.injectedAnswer = answerKey}</div>
                            </div>
                          );
                        })()}
                        
                        {/* Open Ended Lines */}
                        {q.type === "open_ended" && (
                          <div className="mt-5 space-y-6">
                            <div className="border-b border-slate-300 w-full h-4"></div>
                            <div className="border-b border-slate-300 w-full h-4"></div>
                            <div className="border-b border-slate-300 w-full h-4"></div>
                          </div>
                        )}
                        
                        {/* Teacher Key */}
                        <div style={{ display: showAnswers ? 'block' : 'none' }} className="mt-5 bg-slate-50 p-4 rounded-xl border border-slate-300">
                          <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2"><Eye size={14}/> Javob Kaliti</p>
                          {q.type === "mcq" && <p className="font-bold text-slate-800 text-[14px]">Javob: <span className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{q.answer}</span></p>}
                          {q.type === "short_answer" && <p className="font-bold text-slate-800 text-[14px]">Javob: <span className="text-indigo-700"><FormattedText text={getText(q.answer)} /></span></p>}
                          {q.type === "true_false" && <p className="font-bold text-slate-800 text-[14px]">Javob: <span className={q.answer ? "text-emerald-600" : "text-rose-600"}>{q.answer ? "Rost" : "Yolg'on"}</span></p>}
                          {q.type === "matching" && <p className="font-bold text-slate-800 text-[14px]">Javob kaliti: <span className="text-indigo-700">{q.injectedAnswer}</span></p>}
                          {q.type === "open_ended" && (
                            <div className="space-y-2">
                              <p className="text-[14px] text-slate-800 font-medium leading-snug"><FormattedText text={getText(q.answer)} /></p>
                              <div className="border-t border-slate-200 pt-3 mt-3">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Baholash mezoni:</span>
                                <p className="text-[13px] font-semibold text-slate-700 mt-1"><FormattedText text={getText(q.rubric)} /></p>
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

          {/* MOBILE STICKY ACTIONS */}
          <div className="md:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex flex-row gap-2.5 shadow-[0_-10px_20px_rgba(0,0,0,0.1)]">
             <button onClick={() => handleDownloadPdf(false)} disabled={isGeneratingStudent || isGeneratingTeacher} className="flex-1 flex justify-center items-center gap-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 border border-slate-200 px-2 py-3.5 rounded-xl text-[12px] font-bold transition-all shadow-sm leading-tight text-center">
               {isGeneratingStudent ? <Loader2 size={16} className="animate-spin shrink-0"/> : <Download size={16} className="shrink-0" />}
               <span>{isGeneratingStudent ? t.generating : t.studentBtn}</span>
             </button>
             <button onClick={() => handleDownloadPdf(true)} disabled={isGeneratingStudent || isGeneratingTeacher} className="flex-1 flex justify-center items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-2 py-3.5 rounded-xl text-[12px] font-bold transition-all shadow-md shadow-indigo-600/20 leading-tight text-center">
               {isGeneratingTeacher ? <Loader2 size={16} className="animate-spin shrink-0"/> : <Eye size={16} className="shrink-0" />}
               <span>{isGeneratingTeacher ? t.wait : t.keyBtn}</span>
             </button>
          </div>

        </motion.div>
      </motion.div>
    </>,
    document.body
  );
};

// ============================================================================
// 3. MAIN PAGE (PAGINATION, FILTERING, UI)
// ============================================================================

export default function MyAssessmentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [tests, setTests] = useState<any[]>([]);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"Barcha" | "BSB" | "CHSB">("Barcha");
  
  const [selectedTest, setSelectedTest] = useState<any | null>(null);
  const ITEMS_PER_PAGE = 12;

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

      if (isLoadMore) setTests(prev => [...prev, ...newTests]);
      else setTests(newTests);

      if (snapshot.docs.length > 0) {
        setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === ITEMS_PER_PAGE); 
      } else {
        setHasMore(false);
      }

    } catch (error) {
      toast.error("Imtihonlarni yuklashda xatolik yuz berdi.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => { fetchTests(false); }, [user]);

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

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title?.toLowerCase().includes(searchQuery.toLowerCase()) || test.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "Barcha" || test.assessmentType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-[100px] md:pb-12">
      
      {/* 🟢 ORIGINAL STICKY TOP BAR */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={() => router.push('/teacher/library')} className="p-1.5 md:p-2 -ml-1 md:-ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
              <ArrowLeft size={20} />
            </button>
            <div className="w-px h-5 bg-slate-200 hidden sm:block"></div>
            <h1 className="text-[16px] md:text-[18px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText size={18} className="text-indigo-600 hidden sm:block"/> Mening Imtihonlarim
            </h1>
          </div>
          <button onClick={() => router.push('/teacher/create/bsb-chsb')} className="bg-slate-900 hover:bg-black text-white px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl text-[13px] md:text-[14px] font-semibold transition-all flex items-center gap-2 shadow-sm active:scale-95">
            <Plus size={16} /> <span className="hidden sm:inline">Yangi Yaratish</span><span className="sm:hidden">Yaratish</span>
          </button>
        </div>
      </div>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 md:py-8 relative z-10">
        
        {/* 🟢 FILTERS & SEARCH */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm w-full md:w-auto">
            {['Barcha', 'BSB', 'CHSB'].map((type) => (
              <button 
                key={type} 
                onClick={() => setFilterType(type as any)} 
                className={`flex-1 md:px-8 py-2.5 text-[13px] font-bold rounded-xl transition-all ${filterType === type ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Qidirish (Nomi yoki Fan)..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-[14px] font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* 🟢 EDGE-TO-EDGE GRID / EMPTY STATE */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={32} className="animate-spin mb-4 text-indigo-500" />
            <p className="font-medium text-[14px]">Imtihonlar yuklanmoqda...</p>
          </div>
        ) : filteredTests.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center mt-4">
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-5 shadow-sm"><FileText size={28} className="text-slate-400" /></div>
            <h2 className="text-[18px] md:text-[20px] font-black text-slate-800 mb-2">Hozircha imtihonlar yo'q</h2>
            
            {!searchQuery && (
              <button onClick={() => router.push('/teacher/create/bsb-chsb')} className="mt-4 flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all active:scale-95 text-[14px]">
                <Plus size={16} strokeWidth={2.5} /> Generatorda Yaratish
              </button>
            )}
          </motion.div>
        ) : (
          <>
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mb-10">
              {filteredTests.map((test, index) => {
                 const theme = THEMES[index % THEMES.length];
                 return (
                  <motion.div 
                    key={test.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (index % 10) * 0.05 }}
                    onClick={() => setSelectedTest(test)} 
                    className={`group bg-white rounded-3xl md:rounded-[2rem] border border-slate-200/80 p-5 md:p-6 transition-all duration-300 relative flex flex-col h-full cursor-pointer hover:shadow-xl hover:border-${theme}-300 hover:shadow-${theme}-500/10`}
                  >
                    <CardIllustration theme={theme} />

                    <div className="flex justify-between items-start mb-5 relative z-10">
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] md:text-[11px] font-black uppercase tracking-widest border transition-colors bg-white border-${theme}-200 text-${theme}-600 shadow-sm`}>
                        {test.assessmentType}
                      </span>
                      <button onClick={(e) => handleDelete(e, test.id)} className="relative z-20 p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all opacity-100 md:opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} strokeWidth={2.5}/>
                      </button>
                    </div>
                    
                    <div className="mb-6 flex-1 relative z-10">
                      <h3 className={`font-black text-slate-900 text-[16px] md:text-[18px] leading-snug mb-2 group-hover:text-${theme}-700 transition-colors line-clamp-2`}>{test.title}</h3>
                      <p className="flex items-center gap-1.5 text-[12px] md:text-[13px] font-bold text-slate-500 tracking-wide mt-3"><Layers size={14} className="text-slate-400"/> {test.grade} • {test.subject}</p>
                    </div>

                    <div className={`pt-4 border-t border-slate-100 flex items-center justify-between relative z-10 transition-colors group-hover:border-${theme}-100`}>
                      <div className="flex items-center gap-4 text-[12px] md:text-[13px] font-bold text-slate-500">
                        <span className="flex items-center gap-1.5"><FileText size={14} className="text-slate-400"/> {test.questionCount} Savol</span>
                        <span className="flex items-center gap-1.5 text-indigo-600"><Zap size={14} className="text-indigo-400"/> {test.totalPoints} Ball</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                        <Clock size={12} /> {test.createdAt ? new Date(test.createdAt.toDate()).toLocaleDateString('uz-UZ') : 'Yangi'}
                      </div>
                    </div>
                  </motion.div>
                 );
              })}
            </motion.div>

            {/* LOAD MORE */}
            {hasMore && (
              <div className="flex justify-center pt-6 pb-6">
                <button onClick={() => fetchTests(true)} disabled={isLoadingMore} className="flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 font-black py-3 px-8 rounded-2xl shadow-sm transition-all active:scale-95 text-[14px] disabled:opacity-50">
                  {isLoadingMore ? <Loader2 size={18} className="animate-spin"/> : <ChevronDown size={18} strokeWidth={2.5} />}
                  {isLoadingMore ? "Yuklanmoqda..." : "Ko'proq yuklash"}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <AnimatePresence>
        {selectedTest && <ExamViewer selectedTest={selectedTest} onClose={() => setSelectedTest(null)} />}
      </AnimatePresence>

    </div>
  );
}
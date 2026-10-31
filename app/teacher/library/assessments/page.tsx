"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc, orderBy, limit, startAfter } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import {
  FileText, Plus, Trash2, Clock,
  Layers, Zap, Eye, Download, X,
  ChevronDown, ChevronRight, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import toast from "react-hot-toast";
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { createPortal } from "react-dom";
import { useTeacherLanguage } from "@/app/teacher/layout";
import { Button, IconButton, Spinner, SearchBar } from "@/components/ui";

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
    <span className="break-words leading-relaxed text-on-surface">
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(math, { displayMode: true, throwOnError: false, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="block my-3 text-center overflow-x-auto custom-scrollbar" />;
          } catch (e) { return <span key={index} className="text-on-error-container font-mono text-[13px] bg-error-container px-1 rounded-m3-xs">{part}</span>; }
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(math, { displayMode: false, throwOnError: false, strict: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="px-0.5 inline-block" />;
          } catch (e) { return <span key={index} className="text-on-error-container font-mono text-[13px] bg-error-container px-1 rounded-m3-xs">{part}</span>; }
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

// --- M3 three-tone rotation (see docs/UI_KIT.md — no rainbow accents) ---
type Tone = 'primary' | 'secondary' | 'tertiary';
const TONES: Tone[] = ['primary', 'secondary', 'tertiary'];
const TONE_STYLES: Record<Tone, { chip: string; accent: string }> = {
  primary: { chip: 'bg-primary-container text-on-primary-container', accent: 'text-primary' },
  secondary: { chip: 'bg-secondary-container text-on-secondary-container', accent: 'text-secondary' },
  tertiary: { chip: 'bg-tertiary-container text-on-tertiary-container', accent: 'text-tertiary' },
};

const CardIllustration = ({ tone }: { tone: Tone }) => (
  <div className="absolute inset-0 overflow-hidden rounded-m3-xl pointer-events-none opacity-20 group-hover:opacity-60 transition-opacity duration-700 z-0">
    <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`grad-${tone}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <motion.circle cx="160" cy="160" r="80" fill={`url(#grad-${tone})`} className={TONE_STYLES[tone].accent} animate={{ x: [-15, 10, -15], y: [-10, 15, -10], scale: [1, 1.1, 1] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
      <motion.circle cx="40" cy="40" r="60" fill={`url(#grad-${tone})`} className={TONE_STYLES[tone].accent} animate={{ x: [10, -10, 10], y: [15, -10, 15], scale: [1, 1.2, 1] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
    </svg>
  </div>
);

const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

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
    uz: { studentBtn: "O'quvchi uchun", keyBtn: "Javoblar bilan", generating: "Yuklanmoqda...", wait: "Kutib turing...", close: "Yopish", toasts: { docNotFound: "Hujjat topilmadi!", pdfSuccess: "PDF muvaffaqiyatli yuklandi!", pdfFail: "PDF yaratishda xatolik yuz berdi." } },
    en: { studentBtn: "For Student", keyBtn: "With Answer Key", generating: "Generating...", wait: "Please wait...", close: "Close", toasts: { docNotFound: "Document not found!", pdfSuccess: "PDF downloaded successfully!", pdfFail: "Failed to generate the PDF." } },
    ru: { studentBtn: "Для ученика", keyBtn: "С ответами", generating: "Загрузка...", wait: "Подождите...", close: "Закрыть", toasts: { docNotFound: "Документ не найден!", pdfSuccess: "PDF успешно загружен!", pdfFail: "Ошибка при создании PDF." } }
  };
  const t = VIEWER_T[lang] || VIEWER_T['uz'];

  const getText = (field: any) => field?.uz || field || "";

  const handleDownloadPdf = async (withAnswers: boolean) => {
    if (!printRef.current) return toast.error(t.toasts.docNotFound);
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
        toast.success(t.toasts.pdfSuccess);
      } catch (error) {
        toast.error(t.toasts.pdfFail);
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
        <div className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-full md:max-w-4xl h-[100dvh] bg-surface-container shadow-elev-3 flex flex-col z-10">

          {/* Header Controls */}
          <div className="bg-surface-container-low border-b border-outline-variant px-4 md:px-6 py-3.5 flex justify-between items-center shrink-0 z-20 shadow-elev-1">
            <div className="min-w-0 pr-4">
              <h2 className="text-[17px] md:text-[20px] font-black text-on-surface truncate">{selectedTest?.title}</h2>
              <p className="text-[12px] md:text-[13px] font-medium text-on-surface-variant mt-0.5">{selectedTest?.grade} • {selectedTest?.subject}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden md:flex items-center gap-3">
                <Button variant="tonal" icon={<Download size={16} />} loading={isGeneratingStudent} disabled={isGeneratingTeacher} onClick={() => handleDownloadPdf(false)}>
                  {isGeneratingStudent ? t.generating : t.studentBtn}
                </Button>
                <Button variant="filled" icon={<Eye size={16} />} loading={isGeneratingTeacher} disabled={isGeneratingStudent} onClick={() => handleDownloadPdf(true)}>
                  {isGeneratingTeacher ? t.wait : t.keyBtn}
                </Button>
                <div className="w-px h-6 bg-outline-variant mx-1"></div>
              </div>
              <IconButton aria-label={t.close} onClick={onClose} disabled={isGeneratingStudent || isGeneratingTeacher} className="hover:text-error"><X size={20} /></IconButton>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-0 md:p-8 pb-[100px] md:pb-8 custom-scrollbar">

            {/* 🟢 PDF CONTENT WRAPPER */}
            <div ref={printRef} id="pdf-content" className="pdf-document bg-surface-container-lowest w-full max-w-[794px] mx-auto p-8 shadow-elev-2 text-on-surface min-h-full relative overflow-hidden">

              {/* Premium Header Box */}
              <div className="mb-8 border-2 border-on-surface rounded-m3-md overflow-hidden avoid-break">
                <div className="bg-surface-container p-4 border-b-2 border-on-surface">
                  <h1 className="pdf-header-text text-[22px] font-black uppercase tracking-widest text-center text-on-surface m-0">
                    {selectedTest?.title || `${selectedTest?.subject} — ${selectedTest?.assessmentType}`}
                  </h1>
                </div>
                {/* 🟢 Replaced Grid with Flex for guaranteed alignment */}
                <div className="p-5 flex flex-col gap-4 text-[13px] font-bold text-on-surface">
                  <div className="flex gap-10">
                    <div className="flex items-end gap-2 flex-1"><span className="shrink-0">O'quvchi F.I.Sh:</span><div className="border-b border-outline flex-1 h-4"></div></div>
                    <div className="flex items-end gap-2 flex-1"><span className="shrink-0">Sana:</span><div className="border-b border-outline flex-1 h-4"></div></div>
                  </div>
                  <div className="flex gap-10">
                    <div className="flex items-end gap-2 flex-1"><span className="shrink-0">Sinf / Guruh:</span><div className="border-b border-outline flex-1 h-4"></div></div>
                    <div className="flex items-end gap-2 flex-1">
                      <span className="shrink-0">To'plangan Ball:</span>
                      <div className="border-b border-outline flex-1 h-4"></div>
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
                        <div className="mb-4 p-4 bg-surface-container border-l-[4px] border-outline text-[13px] text-on-surface leading-relaxed text-justify">
                          <FormattedText text={getText(q.context)} />
                        </div>
                      )}

                      <div className="flex items-start gap-2.5 mb-3 w-full">
                        <span className="text-[15px] font-black shrink-0 w-5">{idx + 1}.</span>
                        <div className="text-[14px] font-medium leading-snug text-on-surface w-full pt-0.5">
                          {/* 🟢 Ensures badge flows nicely inline with text */}
                          <span className="inline-block"><FormattedText text={getText(q.question)} /></span>
                          <span className="ml-1.5 align-middle-fix text-[11px] font-bold text-on-surface-variant whitespace-nowrap relative -top-[1px]">
                            ({q.points} Ball)
                          </span>

                          {q.imageUrl && <div className="my-3 flex justify-start w-full"><img src={q.imageUrl} alt="Figure" crossOrigin="anonymous" className="max-w-[70%] object-contain rounded-m3-xs border border-outline-variant p-1" /></div>}
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
                                <span className="font-bold text-on-surface text-[14px] shrink-0">{key})</span>
                                <span className="text-on-surface text-[14px] leading-snug break-words inline-block w-full"><FormattedText text={getText(value)} /></span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Short Answer */}
                        {q.type === "short_answer" && <div className="mt-3 mb-2 flex items-end gap-2"><span className="font-bold text-on-surface text-[14px]">Javob:</span><div className="border-b border-outline w-64 h-4"></div></div>}

                        {/* 🟢 NEW: Fixed Checkbox Alignment */}
                        {q.type === "true_false" && (
                          <div className="flex gap-8 mt-3 pl-1">
                            <label className="inline-block cursor-pointer">
                              <div className="align-middle-fix w-4 h-4 border-[1.5px] border-outline bg-surface-container-lowest rounded-sm mr-2 relative -top-[1px]"></div>
                              <span className="align-middle-fix font-bold text-[14px] text-on-surface">Rost</span>
                            </label>
                            <label className="inline-block cursor-pointer">
                              <div className="align-middle-fix w-4 h-4 border-[1.5px] border-outline bg-surface-container-lowest rounded-sm mr-2 relative -top-[1px]"></div>
                              <span className="align-middle-fix font-bold text-[14px] text-on-surface">Yolg'on</span>
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
                                <span className="font-bold text-[14px] text-on-surface">Javoblar:</span>
                                {lefts.map((_, i) => (<div key={i} className="flex items-end gap-1.5"><span className="font-bold text-[14px]">{i + 1} - </span><div className="border-b border-outline w-8 h-4"></div></div>))}
                              </div>
                              <div className="hidden">{q.injectedAnswer = answerKey}</div>
                            </div>
                          );
                        })()}

                        {/* Open Ended Lines */}
                        {q.type === "open_ended" && (
                          <div className="mt-5 space-y-6">
                            <div className="border-b border-outline-variant w-full h-4"></div>
                            <div className="border-b border-outline-variant w-full h-4"></div>
                            <div className="border-b border-outline-variant w-full h-4"></div>
                          </div>
                        )}

                        {/* Teacher Key */}
                        <div style={{ display: showAnswers ? 'block' : 'none' }} className="mt-5 bg-surface-container p-4 rounded-m3-md border border-outline">
                          <p className="text-[11px] font-black text-on-surface uppercase tracking-widest mb-3 flex items-center gap-2"><Eye size={14}/> Javob Kaliti</p>
                          {q.type === "mcq" && <p className="font-bold text-on-surface text-[14px]">Javob: <span className="text-on-primary-container bg-primary-container px-1.5 py-0.5 rounded-m3-xs">{q.answer}</span></p>}
                          {q.type === "short_answer" && <p className="font-bold text-on-surface text-[14px]">Javob: <span className="text-primary"><FormattedText text={getText(q.answer)} /></span></p>}
                          {q.type === "true_false" && <p className="font-bold text-on-surface text-[14px]">Javob: <span className={q.answer ? "text-success" : "text-error"}>{q.answer ? "Rost" : "Yolg'on"}</span></p>}
                          {q.type === "matching" && <p className="font-bold text-on-surface text-[14px]">Javob kaliti: <span className="text-primary">{q.injectedAnswer}</span></p>}
                          {q.type === "open_ended" && (
                            <div className="space-y-2">
                              <p className="text-[14px] text-on-surface font-medium leading-snug"><FormattedText text={getText(q.answer)} /></p>
                              <div className="border-t border-outline-variant pt-3 mt-3">
                                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Baholash mezoni:</span>
                                <p className="text-[13px] font-semibold text-on-surface mt-1"><FormattedText text={getText(q.rubric)} /></p>
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
          <div className="md:hidden absolute bottom-0 left-0 right-0 bg-surface-container-low border-t border-outline-variant p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex flex-row gap-2.5 shadow-elev-3">
             <Button variant="tonal" size="lg" className="flex-1" icon={<Download size={16} className="shrink-0" />} loading={isGeneratingStudent} disabled={isGeneratingTeacher} onClick={() => handleDownloadPdf(false)}>
               <span>{isGeneratingStudent ? t.generating : t.studentBtn}</span>
             </Button>
             <Button variant="filled" size="lg" className="flex-1" icon={<Eye size={16} className="shrink-0" />} loading={isGeneratingTeacher} disabled={isGeneratingStudent} onClick={() => handleDownloadPdf(true)}>
               <span>{isGeneratingTeacher ? t.wait : t.keyBtn}</span>
             </Button>
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

// --- TRANSLATION DICTIONARY ---
const ASSESSMENTS_TRANSLATIONS: Record<string, any> = {
  uz: {
    back: "Orqaga", title: "Mening Imtihonlarim", createNew: "Yangi Yaratish", create: "Yaratish",
    filterAll: "Barcha", searchPlace: "Qidirish (Nomi yoki Fan)...",
    loading: "Imtihonlar yuklanmoqda...", emptyTitle: "Hozircha imtihonlar yo'q", createInGenerator: "Generatorda Yaratish",
    questions: "Savol", points: "Ball", newLabel: "Yangi",
    loadingMore: "Yuklanmoqda...", loadMore: "Ko'proq yuklash",
    confirmDelete: "Haqiqatan ham bu imtihonni o'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.",
    toasts: { loadFail: "Imtihonlarni yuklashda xatolik yuz berdi.", deleted: "Imtihon o'chirildi!", deleteFail: "O'chirishda xatolik yuz berdi." }
  },
  en: {
    back: "Back", title: "My Exams", createNew: "Create New", create: "Create",
    filterAll: "All", searchPlace: "Search (Title or Subject)...",
    loading: "Loading exams...", emptyTitle: "No exams yet", createInGenerator: "Create in Generator",
    questions: "Questions", points: "Pts", newLabel: "New",
    loadingMore: "Loading...", loadMore: "Load more",
    confirmDelete: "Are you sure you want to delete this exam? This action cannot be undone.",
    toasts: { loadFail: "Failed to load exams.", deleted: "Exam deleted!", deleteFail: "Failed to delete." }
  },
  ru: {
    back: "Назад", title: "Мои Экзамены", createNew: "Создать Новый", create: "Создать",
    filterAll: "Все", searchPlace: "Поиск (Название или Предмет)...",
    loading: "Загрузка экзаменов...", emptyTitle: "Экзаменов пока нет", createInGenerator: "Создать в Генераторе",
    questions: "Вопросов", points: "Балл", newLabel: "Новый",
    loadingMore: "Загрузка...", loadMore: "Загрузить еще",
    confirmDelete: "Вы действительно хотите удалить этот экзамен? Это действие нельзя отменить.",
    toasts: { loadFail: "Ошибка при загрузке экзаменов.", deleted: "Экзамен удален!", deleteFail: "Ошибка при удалении." }
  }
};

export default function MyAssessmentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = ASSESSMENTS_TRANSLATIONS[lang] || ASSESSMENTS_TRANSLATIONS['uz'];

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
      toast.error(t.toasts.loadFail);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => { fetchTests(false); }, [user]);

  const handleDelete = async (e: React.MouseEvent, testId: string) => {
    e.stopPropagation();
    if (!confirm(t.confirmDelete)) return;
    try {
      await deleteDoc(doc(db, "bsb_chsb_tests", testId));
      setTests(prev => prev.filter(item => item.id !== testId));
      toast.success(t.toasts.deleted);
      if (selectedTest?.id === testId) setSelectedTest(null);
    } catch (error) {
      toast.error(t.toasts.deleteFail);
    }
  };

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title?.toLowerCase().includes(searchQuery.toLowerCase()) || test.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "Barcha" || test.assessmentType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-[100dvh] bg-surface font-t-body pb-[100px] md:pb-12">

      {/* 🟢 ORIGINAL STICKY TOP BAR */}
      <div className="bg-surface-container-low border-b border-outline-variant t-page-bar sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <IconButton aria-label={t.back} onClick={() => router.push('/teacher/library')} className="-ml-1 md:-ml-2">
              <ArrowLeft size={20} />
            </IconButton>
            <div className="w-px h-5 bg-outline-variant hidden sm:block"></div>
            <h1 className="text-[16px] md:text-[18px] font-bold text-on-surface tracking-tight flex items-center gap-2">
              <FileText size={18} className="text-primary hidden sm:block"/> {t.title}
            </h1>
          </div>
          <Button variant="filled" size="sm" icon={<Plus size={16} />} onClick={() => router.push('/teacher/create/bsb-chsb')} className="md:h-10 md:px-5 md:text-sm">
            <span className="hidden sm:inline">{t.createNew}</span><span className="sm:hidden">{t.create}</span>
          </Button>
        </div>
      </div>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 md:py-8 relative z-10">

        {/* 🟢 FILTERS & SEARCH */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex bg-surface-container-low p-1.5 rounded-m3-lg shadow-elev-1 w-full md:w-auto">
            {[
              { value: 'Barcha', label: t.filterAll },
              { value: 'BSB', label: 'BSB' },
              { value: 'CHSB', label: 'CHSB' }
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => setFilterType(type.value as any)}
                className={`flex-1 md:px-8 py-2.5 text-[13px] font-bold rounded-m3-md transition-all ${filterType === type.value ? 'bg-primary-container text-on-primary-container shadow-elev-1' : 'text-on-surface-variant hover:text-on-surface hover:bg-state-hover'}`}
              >
                {type.label}
              </button>
            ))}
          </div>

          <SearchBar
            placeholder={t.searchPlace}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-80"
          />
        </div>

        {/* 🟢 EDGE-TO-EDGE GRID / EMPTY STATE */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <Spinner size={32} className="mb-4" />
            <p className="font-medium text-[14px]">{t.loading}</p>
          </div>
        ) : filteredTests.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface-container-low border-2 border-dashed border-outline-variant rounded-m3-xl p-12 flex flex-col items-center justify-center text-center mt-4">
            <div className="w-16 h-16 bg-surface-container rounded-m3-lg flex items-center justify-center mb-5 shadow-elev-1"><FileText size={28} className="text-on-surface-variant" /></div>
            <h2 className="text-[18px] md:text-[20px] font-black text-on-surface mb-2">{t.emptyTitle}</h2>

            {!searchQuery && (
              <Button variant="tonal" icon={<Plus strokeWidth={2.5} />} onClick={() => router.push('/teacher/create/bsb-chsb')} className="mt-4">
                {t.createInGenerator}
              </Button>
            )}
          </motion.div>
        ) : (
          <>
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mb-10">
              {filteredTests.map((test, index) => {
                 const tone = TONES[index % TONES.length];
                 return (
                  <motion.div
                    key={test.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (index % 10) * 0.05 }}
                    onClick={() => setSelectedTest(test)}
                    className="group bg-surface-container-low rounded-m3-xl p-5 md:p-6 shadow-elev-1 hover:shadow-elev-2 transition-all duration-300 relative flex flex-col h-full cursor-pointer"
                  >
                    <CardIllustration tone={tone} />

                    <div className="flex justify-between items-start mb-5 relative z-10">
                      <span className={`px-3 py-1.5 rounded-m3-sm text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-colors ${TONE_STYLES[tone].chip}`}>
                        {test.assessmentType}
                      </span>
                      <button onClick={(e) => handleDelete(e, test.id)} className="relative z-20 p-2 text-on-surface-variant hover:bg-error-container hover:text-on-error-container rounded-m3-md transition-all opacity-100 md:opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} strokeWidth={2.5}/>
                      </button>
                    </div>

                    <div className="mb-6 flex-1 relative z-10">
                      <h3 className="font-black text-on-surface text-[16px] md:text-[18px] leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">{test.title}</h3>
                      <p className="flex items-center gap-1.5 text-[12px] md:text-[13px] font-bold text-on-surface-variant tracking-wide mt-3"><Layers size={14} className="text-on-surface-variant"/> {test.grade} • {test.subject}</p>
                    </div>

                    <div className="pt-4 border-t border-outline-variant flex items-center justify-between relative z-10 transition-colors">
                      <div className="flex items-center gap-4 text-[12px] md:text-[13px] font-bold text-on-surface-variant">
                        <span className="flex items-center gap-1.5"><FileText size={14} className="text-on-surface-variant"/> {test.questionCount} {t.questions}</span>
                        <span className="flex items-center gap-1.5 text-primary"><Zap size={14} className="text-primary"/> {test.totalPoints} {t.points}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-on-surface-variant">
                        <Clock size={12} /> {test.createdAt ? new Date(test.createdAt.toDate()).toLocaleDateString('uz-UZ') : t.newLabel}
                      </div>
                    </div>
                  </motion.div>
                 );
              })}
            </motion.div>

            {/* LOAD MORE */}
            {hasMore && (
              <div className="flex justify-center pt-6 pb-6">
                <Button variant="outlined" icon={<ChevronDown strokeWidth={2.5} />} loading={isLoadingMore} onClick={() => fetchTests(true)}>
                  {isLoadingMore ? t.loadingMore : t.loadMore}
                </Button>
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

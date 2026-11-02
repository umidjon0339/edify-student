'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // 🟢 ADDED PORTAL
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import {
  X, FileText, Calendar, CheckCircle, XCircle, UserCircle, PartyPopper,
} from 'lucide-react';
import LatexRenderer from '@/components/LatexRenderer';
import QuestionCreator from '@/components/QuestionCreator';
import { normalizeQuestions, getText, isAnswerCorrect, isPartCorrect, gradeQuestion, isBlockAnswer } from '@/lib/questionSchema';
import type { NormalizedQuestion } from '@/types/question';
import { useTeacherLanguage } from '@/app/teacher/layout';
import { Spinner } from '@/components/ui';

// --- TRANSLATION DICTIONARY ---
const STUDENT_MODAL_TRANSLATIONS = {
  uz: {
    mistakesTitle: "Xatolar", loading: "Yuklanmoqda...", loadingData: "Ma'lumotlar olinmoqda...",
    empty: "Hozircha topshiriqlar yo'q.", noMistakes: "Ajoyib! Xatolar yo'q — barcha javoblar to'g'ri.",
    studentAns: "O'quvchi Javobi", correctAns: "To'g'ri Javob", skipped: "O'tkazib yuborilgan",
    viewProfile: "Profilni Ko'rish", unknown: "Noma'lum o'quvchi", showMore: "Yana ko'rsatish"
  },
  en: {
    mistakesTitle: "Mistakes", loading: "Loading...", loadingData: "Retrieving Data...",
    empty: "No assignments yet.", noMistakes: "Great job — no mistakes, every answer was correct.",
    studentAns: "Student Answer", correctAns: "Correct Answer", skipped: "Skipped",
    viewProfile: "View Profile", unknown: "Unknown Student", showMore: "Show more"
  },
  ru: {
    mistakesTitle: "Ошибки", loading: "Загрузка...", loadingData: "Получение данных...",
    empty: "Заданий пока нет.", noMistakes: "Отлично! Ошибок нет — все ответы верны.",
    studentAns: "Ответ Ученика", correctAns: "Правильный Ответ", skipped: "Пропущено",
    viewProfile: "Смотреть Профиль", unknown: "Неизвестный ученик", showMore: "Показать ещё"
  }
};

// Trilingual text → a display string. Uses the schema helper so an image-only
// option (empty {uz,ru,en}) yields "" instead of a JSON dump.
const getContentText = (content: any) => getText(content);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  assignments: any[];
  classId: string;
}

/** One wrong question, flattened out of whichever assignment it came from. */
interface FlatMistake {
  key: string;
  assignmentId: string;
  testTitle: string;
  submittedAt: any;
  scorePct: number;
  question: NormalizedQuestion;
  studentAnswer: any;
}

/** Firestore Timestamp → epoch ms; missing/malformed dates sort last. */
const toMillis = (ts: any): number => (typeof ts?.seconds === 'number' ? ts.seconds * 1000 : 0);

const PAGE_SIZE = 10;

export default function StudentDetailsModal({ isOpen, onClose, student, assignments = [], classId }: Props) {
  const router = useRouter();
  const { lang } = useTeacherLanguage();
  const t = STUDENT_MODAL_TRANSLATIONS[lang] || STUDENT_MODAL_TRANSLATIONS['en'];

  // 🟢 SSR HYDRATION FIX FOR PORTAL
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // --- STATE ---
  const [loading, setLoading] = useState(false);
  const [hasAttempts, setHasAttempts] = useState(false);
  const [allMistakes, setAllMistakes] = useState<FlatMistake[]>([]);

  // Pagination — over individual mistakes (most recent first), revealed
  // PAGE_SIZE at a time by an explicit "Show more" tap, not auto-scroll:
  // everything is already fetched on open, so this just slices the array.
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  const visibleMistakes = allMistakes.slice(0, displayCount);
  const hasMore = displayCount < allMistakes.length;

  // Group the visible slice back into per-assignment blocks for display —
  // consecutive runs only, since the underlying list is sorted by recency,
  // not by assignment.
  const visibleBlocks: { assignmentId: string; testTitle: string; submittedAt: any; scorePct: number; mistakes: FlatMistake[] }[] = [];
  for (const m of visibleMistakes) {
    const last = visibleBlocks[visibleBlocks.length - 1];
    if (last && last.assignmentId === m.assignmentId) last.mistakes.push(m);
    else visibleBlocks.push({ assignmentId: m.assignmentId, testTitle: m.testTitle, submittedAt: m.submittedAt, scorePct: m.scorePct, mistakes: [m] });
  }

  // --- FETCH ATTEMPTS + TESTS, THEN REDUCE TO WRONG QUESTIONS ONLY ---
  useEffect(() => {
    if (!(isOpen && student && classId)) {
      setAllMistakes([]);
      setHasAttempts(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'attempts'),
          where('classId', '==', classId),
          where('userId', '==', student.uid),
        );
        const snap = await getDocs(q);
        const attemptsByAssignment: Record<string, any> = {};
        snap.forEach((d) => {
          const data = d.data();
          attemptsByAssignment[data.assignmentId] = { id: d.id, ...data };
        });

        const relevantAssignments = assignments.filter(
          (a) => !Array.isArray(a.assignedTo) || a.assignedTo.includes(student?.uid),
        );
        const withAttempts = relevantAssignments.filter((a) => attemptsByAssignment[a.id]);

        // One fetch per unique test template — a retaken/duplicated test is
        // fetched once even if several assignments point at it.
        const testIds = Array.from(new Set(withAttempts.map((a) => a.testId).filter(Boolean)));
        const testDocs = await Promise.all(testIds.map((id) => getDoc(doc(db, 'custom_tests', id))));
        const testMap: Record<string, NormalizedQuestion[]> = {};
        testDocs.forEach((docSnap, i) => {
          if (docSnap.exists()) testMap[testIds[i]] = normalizeQuestions((docSnap.data() as any)?.questions, lang);
        });

        const flat: FlatMistake[] = [];
        for (const a of withAttempts) {
          const attempt = attemptsByAssignment[a.id];
          const questions = testMap[a.testId] || [];
          const submittedAt = attempt.submittedAt || attempt.createdAt;
          const scorePct = attempt.totalQuestions > 0 ? Math.round((attempt.score / attempt.totalQuestions) * 100) : 0;

          for (const question of questions) {
            const studentAnswer = attempt.answers?.[question.id] ?? null;
            if (isAnswerCorrect(question, studentAnswer)) continue;
            flat.push({
              key: `${a.id}_${question.id}`,
              assignmentId: a.id,
              testTitle: a.testTitle || 'Untitled',
              submittedAt,
              scorePct,
              question,
              studentAnswer,
            });
          }
        }
        // Most recent mistake first — "last 10 mistakes" means the latest
        // sittings, not whichever assignment happens to sort first.
        flat.sort((x, y) => toMillis(y.submittedAt) - toMillis(x.submittedAt));

        if (!cancelled) {
          setHasAttempts(withAttempts.length > 0);
          setAllMistakes(flat);
          setDisplayCount(PAGE_SIZE);
        }
      } catch (e) {
        console.error('Failed to load student mistakes', e);
        if (!cancelled) { setHasAttempts(false); setAllMistakes([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [isOpen, student, classId, assignments, lang]);

  const showMoreMistakes = () => setDisplayCount((prev) => prev + PAGE_SIZE);

  const formatDate = (timestamp: any) => {
    if (!timestamp?.seconds) return '-';
    return new Date(timestamp.seconds * 1000).toLocaleString([], {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // One wrong-question card — reused for every mistake in every group.
  const renderQuestionCard = (q: NormalizedQuestion, studentAnswer: any, key: string) => {
    const answerLabel = Array.isArray(studentAnswer) ? studentAnswer.join(", ") : studentAnswer;
    const studentOptionImage = typeof studentAnswer === "string" ? q.options?.[studentAnswer]?.imageUrl : null;
    const correctOptionImage = q.options?.[q.answer]?.imageUrl;

    return (
      <div key={key} className="bg-surface-container-low border border-error-container rounded-m3-lg p-4 md:p-6 shadow-elev-1">
        <div className="flex flex-col gap-3 md:gap-6">

          {/* Question Stem */}
          <div className="flex items-start gap-3 md:gap-4 flex-1">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-m3-md flex items-center justify-center shrink-0 font-black text-[14px] md:text-[16px] shadow-elev-1 mt-0.5 bg-error text-on-error">
              <XCircle size={18} strokeWidth={2.5} />
            </div>
            <div className="font-bold text-on-surface text-[13px] md:text-[15px] leading-relaxed pt-1 overflow-hidden break-words min-w-0">
              <LatexRenderer latex={getContentText(q.question)} />
              {q.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={q.imageUrl}
                  alt=""
                  className="mt-2 max-h-32 md:max-h-40 max-w-full object-contain rounded-m3-sm border border-outline-variant"
                />
              )}
              <QuestionCreator creatorName={q.creatorName} correctedBy={q.correctedBy} className="mt-2 text-on-surface-variant" />
            </div>
          </div>

          {/* A BLOCK is answered part by part — one row each, or the
              student's whole answer would render as a raw object. */}
          {q.isBlock ? (
            <div className="w-full border-t border-outline-variant pt-3 md:pt-4 space-y-2">
              {(() => {
                const { earned, total } = gradeQuestion(q, studentAnswer);
                const given: Record<string, any> = isBlockAnswer(studentAnswer) ? studentAnswer : {};
                return (
                  <>
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      {earned} / {total} ball
                    </p>
                    {q.parts.map((part) => {
                      const partAnswer = given[part.id];
                      const partOk = isPartCorrect(part, partAnswer ?? null);
                      const label = Array.isArray(partAnswer) ? partAnswer.join(", ") : (partAnswer ?? "");
                      const correct = Array.isArray(part.correctAnswer.value)
                        ? part.correctAnswer.value.join(", ")
                        : String(part.correctAnswer.value ?? "");
                      return (
                        <div
                          key={part.id}
                          className={`flex items-start gap-2 rounded-m3-sm border p-2.5 text-[12px] md:text-[13px] ${partOk ? 'border-success bg-success-container text-on-success-container' : 'border-error bg-error-container text-on-error-container'}`}
                        >
                          <span className="font-black shrink-0">{part.id})</span>
                          <div className="min-w-0 flex-1 break-words">
                            <LatexRenderer latex={getContentText(part.prompt)} />
                            <p className="mt-1 font-bold flex flex-wrap gap-x-3">
                              <span>{t.studentAns}: {label || t.skipped}</span>
                              {!partOk && <span>{t.correctAns}: {correct || '-'}</span>}
                            </p>
                          </div>
                          {partOk ? <CheckCircle size={14} className="shrink-0 mt-0.5" /> : <XCircle size={14} className="shrink-0 mt-0.5" />}
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          ) : (

          /* Answers Grid (Stacks on mobile) */
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full shrink-0 border-t border-outline-variant pt-3 md:pt-4">
            <div className="flex-1 p-3 md:p-4 rounded-m3-md border border-transparent flex flex-col justify-center min-w-0 bg-error-container text-on-error-container">
               <p className="font-black text-[9px] md:text-[10px] opacity-60 uppercase tracking-widest mb-1 md:mb-1.5 flex items-center gap-1.5">
                 <XCircle size={12}/> {t.studentAns}
               </p>
               <div className="font-bold text-[12px] md:text-[14px] flex items-center gap-2 overflow-hidden">
                 <span className="bg-surface-container-lowest text-on-surface px-2 py-0.5 rounded-m3-sm border border-transparent shadow-elev-1 shrink-0">{answerLabel || '-'}</span>
                 <span className="opacity-80 truncate">
                   <LatexRenderer latex={getContentText(typeof studentAnswer === 'string' ? q.options?.[studentAnswer] : null) || (q.optionList.length === 0 ? (answerLabel || t.skipped) : (studentOptionImage ? '' : t.skipped))} />
                 </span>
                 {studentOptionImage && (
                   // eslint-disable-next-line @next/next/no-img-element
                   <img
                     src={studentOptionImage}
                     alt=""
                     className="h-10 md:h-12 w-auto max-w-[40%] object-contain rounded-m3-sm border border-outline-variant bg-surface-container-lowest shrink-0"
                   />
                 )}
               </div>
            </div>

            <div className="flex-1 p-3 md:p-4 rounded-m3-md border border-transparent bg-success-container text-on-success-container flex flex-col justify-center min-w-0">
               <p className="font-black text-[9px] md:text-[10px] opacity-60 uppercase tracking-widest mb-1 md:mb-1.5 flex items-center gap-1.5">
                 <CheckCircle size={12}/> {t.correctAns}
               </p>
               <div className="font-bold text-[12px] md:text-[14px] flex items-center gap-2 overflow-hidden">
                 <span className="bg-surface-container-lowest px-2 py-0.5 rounded-m3-sm border border-transparent shadow-elev-1 text-success shrink-0">{q.answer || '-'}</span>
                 <span className="opacity-80 truncate">
                   <LatexRenderer latex={getContentText(q.options?.[q.answer]) || (correctOptionImage ? '' : '-')} />
                 </span>
                 {correctOptionImage && (
                   // eslint-disable-next-line @next/next/no-img-element
                   <img
                     src={correctOptionImage}
                     alt=""
                     className="h-10 md:h-12 w-auto max-w-[40%] object-contain rounded-m3-sm border border-outline-variant bg-surface-container-lowest shrink-0"
                   />
                 )}
               </div>
            </div>
          </div>
          )}

        </div>
      </div>
    );
  };

  // 🟢 COMBINED MOUNTED & OPEN CHECK
  if (!mounted || !isOpen || !student) return null;

  // 🟢 WRAPPED IN CREATE PORTAL
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-6">

      {/* OVERLAY */}
      <div className="absolute inset-0 bg-scrim backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      {/* 🟢 ULTRA MINIMALISTIC MOBILE-FIRST MODAL */}
      <div className="relative bg-surface-container-low rounded-t-m3-xl sm:rounded-m3-xl w-full max-w-3xl overflow-hidden flex flex-col h-[90vh] sm:h-[85vh] animate-in slide-in-from-bottom-10 sm:zoom-in-95 fade-in duration-300 shadow-elev-3 border border-outline-variant">

        {/* --- HEADER --- */}
        <div className="px-5 py-4 border-b border-outline-variant bg-[color-mix(in_oklab,var(--m3-surface-container-low)_90%,transparent)] backdrop-blur-xl flex justify-between items-center shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
             <div className="t-icon-chip w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-[16px] md:text-[18px] shrink-0">
               {student.displayName?.[0]?.toUpperCase() || 'S'}
             </div>

             <div className="min-w-0 pr-2">
               <h2 className="text-[16px] md:text-[18px] font-black text-on-surface tracking-tight truncate leading-tight">
                 {student.displayName || t.unknown}
               </h2>
               <p className="text-[11px] md:text-[12px] text-on-surface-variant font-bold uppercase tracking-widest mt-0.5 truncate">
                 @{student.username || 'student'}
               </p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[color-mix(in_oklab,var(--m3-on-surface)_8%,transparent)] rounded-full text-on-surface-variant hover:text-on-surface transition-colors shrink-0 active:scale-95">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* --- SCROLLABLE BODY --- */}
        {/* Added pb-[env(safe-area-inset-bottom)] for iOS devices */}
        <div className="flex-1 overflow-y-auto bg-surface custom-scrollbar relative pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="p-4 md:p-8 space-y-4">

            {/* Edify style (2026-11-01): a soft accent pill, not an elevated slab. */}
            <button
              type="button"
              onClick={() => { onClose(); router.push(`/teacher/students/${student.uid}`); }}
              className="t-icon-chip-soft w-full h-12 mb-4 md:mb-6 rounded-full flex items-center justify-center gap-2 font-black text-[13px] md:text-[14px] active:scale-[0.99] transition-transform"
            >
              <UserCircle size={18} strokeWidth={2.5}/> {t.viewProfile}
            </button>

            <h3 className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2 mb-2 px-1">
              <FileText size={14}/> {t.mistakesTitle}
            </h3>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-primary">
                <Spinner size={28}/>
                <span className="text-[11px] font-black uppercase tracking-widest">{t.loadingData}</span>
              </div>
            ) : !hasAttempts ? (
              <div className="text-center py-16 bg-[color-mix(in_oklab,var(--m3-on-surface)_4%,transparent)] rounded-m3-xl text-on-surface-variant font-bold text-[13px] md:text-[14px]">
                {t.empty}
              </div>
            ) : allMistakes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 text-center py-16 bg-success-container text-on-success-container rounded-m3-xl">
                <PartyPopper size={28} />
                <span className="font-bold text-[13px] md:text-[14px] max-w-xs">{t.noMistakes}</span>
              </div>
            ) : (
              <div className="space-y-8">
                {visibleBlocks.map((block, index) => (
                  <div key={`${block.assignmentId}_${index}`} className="space-y-3">
                    <div className="flex items-center justify-between gap-3 px-1">
                      <h4 className="font-black text-on-surface text-[14px] md:text-[15px] truncate">{block.testTitle}</h4>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-on-surface-variant"><Calendar size={12}/> {formatDate(block.submittedAt)}</span>
                        <span className={`text-[13px] md:text-[14px] font-black ${block.scorePct >= 60 ? 'text-success' : 'text-error'}`}>{block.scorePct}%</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {block.mistakes.map(({ question, studentAnswer, key }) => renderQuestionCard(question, studentAnswer, key))}
                    </div>
                  </div>
                ))}

                {hasMore && (
                  <button
                    type="button"
                    onClick={showMoreMistakes}
                    className="t-icon-chip-soft w-full h-11 rounded-full flex items-center justify-center gap-2 font-black text-[13px] active:scale-[0.99] transition-transform"
                  >
                    {t.showMore} (+{Math.min(PAGE_SIZE, allMistakes.length - displayCount)})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

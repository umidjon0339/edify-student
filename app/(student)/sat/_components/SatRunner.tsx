"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calculator, ChevronLeft, ChevronRight, Clock, Eye, EyeOff, Flag,
  Grid3x3, Maximize, Ruler, ShieldAlert,
} from "lucide-react";

import LatexRenderer from "@/components/LatexRenderer";
import { Button, Dialog, IconButton, cn } from "@/components/student-ui";
import { useExamLockdown } from "@/hooks/useExamLockdown";
import { isSatItemCorrect } from "@/lib/SatMathQuiz";
import { estimateScaledScore, estimateScoreBand } from "@/lib/SATscore";
import SatCalculator from "./SatCalculator";
import SatReferenceSheet from "./SatReferenceSheet";
import type { SatDomain, SatExamSnapshot, SatMathResult, SatQuizItem } from "@/types/SatQuiz";

/**
 * The Bluebook-style adaptive SAT Math sitting: Module 1, then (after the
 * transition screen decides the route) Module 2 — Easier or Harder. Contract:
 * docs/SAT_QUIZ.md.
 *
 * ⚠️ A `fixed inset-0 z-[100]` overlay, the same convention `ExamRunner`
 * follows (STUDENT.md's exam-lockdown contract) — callers must NOT wrap it in
 * a `<Page>`. `useExamLockdown` is reused unchanged; this component adds no
 * anti-cheat logic of its own.
 *
 * Fully controlled: `snapshot` is the whole sitting, `onChange` persists every
 * mutation (the caller writes it to `lib/SatSession.ts`), `onSubmit` fires
 * once grading is done and the result is saved. Local UI-only state (timer
 * visibility, calculator/reference panel, dialogs, split-pane width) stays
 * inside this component — it does not need to survive a reload.
 *
 * ⚠️ English-only chrome, unlike every other student-facing runner in this
 * repo — the real SAT is administered in English. `snapshot.examLang` is
 * hard-set to `'en'` by the caller for every new sitting.
 *
 * ⚠️ Shared by BOTH SAT subjects — Math and English (Reading & Writing),
 * docs/SAT_QUIZ.md. `subjectName` labels the module header (`"Module 1: Math"`
 * / `"Module 1: Reading & Writing"`); `onSave` is dependency-injected so this
 * component never imports a subject-specific Firestore write — the caller
 * page passes `saveSatMathResult`/`saveSatEnglishResult`.
 */

const t = {
  question: "Question", of: "of",
  flag: "Mark for Review", flagged: "Flagged",
  prev: "Back", next: "Next",
  continueModule: "Finish module", continueConfirm: "Finish this module? You can't come back to it.",
  yes: "Yes, finish", cancel: "Cancel",
  reviewTitle: "Review", reviewUnanswered: "Unanswered", reviewAnswered: "Answered", reviewFlagged: "Flagged",
  transitionTitle: "Module 1 complete", transitionBody: "Module 2 starts now. Module 1's result isn't shown — that's how the real digital SAT works too.",
  startModule2: "Start Module 2",
  numericLabel: "Enter your answer",
  calculator: "Calculator", reference: "Reference",
  navigator: "Question list",
  textSize: "Text size",
  hideTime: "Hide time", showTime: "Show time",
  fullscreen: "Full screen",
  focusTitle: "You left the test!",
  focusDesc: "Switching to another window or app during the test is not allowed. This has been recorded.",
  focusBtn: "Back to the test", focusCount: "Exits",
};

const formatTime = (totalSeconds: number) => {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

export interface SatRunnerProps {
  uid: string;
  studentName: string;
  /** `"Math"` or `"Reading & Writing"` — labels the module header. */
  subjectName: string;
  snapshot: SatExamSnapshot;
  onChange: (next: SatExamSnapshot) => void;
  /** Writes the result to THIS subject's own results collection. */
  onSave: (result: SatMathResult) => Promise<void>;
  onSubmit: (result: SatMathResult, finished: SatExamSnapshot) => void;
}

/** Split-pane bounds, in percent of the row width the question column may take on desktop. */
const MIN_PANE_PCT = 22;
const MAX_PANE_PCT = 65;

// Text-size ramp — mirrors the IELTS runner's own scale
// (app/(student)/ielts/_components/runner/IeltsRunner.tsx) so the "A-/A+"
// control behaves the same wherever a student meets it.
const FONT_SIZES = [12, 14, 16, 18, 20, 23, 26, 30];
const DEFAULT_FONT_STEP = 2; // 16px
const FONT_PREF_KEY = "sat:runner:font";

const readFontPref = (): number => {
  if (typeof window === "undefined") return DEFAULT_FONT_STEP;
  const n = Number(window.localStorage.getItem(FONT_PREF_KEY));
  return Number.isFinite(n) && n >= 0 && n < FONT_SIZES.length ? n : DEFAULT_FONT_STEP;
};
const writeFontPref = (step: number) => {
  try { window.localStorage.setItem(FONT_PREF_KEY, String(step)); } catch { /* private mode */ }
};

export default function SatRunner({ uid, studentName, subjectName, snapshot, onChange, onSave, onSubmit }: SatRunnerProps) {
  const L = snapshot.examLang;

  // A tick-driven re-render for the countdown — the value itself is never
  // read, only the fact that it changed once a second.
  const [, setTick] = useState(0);
  const [showTimer, setShowTimer] = useState(true);
  const [showCalc, setShowCalc] = useState(false);
  const [showRef, setShowRef] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [saving, setSaving] = useState(false);
  // Smaller question column, bigger workspace column by default — draggable via the divider.
  const [leftPanePct, setLeftPanePct] = useState(38);
  const draggingRef = useRef(false);
  // Device-local reading comfort pref, shared across Math and English —
  // restored after mount so the server-rendered markup stays identical.
  const [fontStep, setFontStep] = useState(DEFAULT_FONT_STEP);
  useEffect(() => { setFontStep(readFontPref()); }, []);
  const changeFont = (delta: number) => {
    setFontStep((f) => {
      const next = Math.min(FONT_SIZES.length - 1, Math.max(0, f + delta));
      writeFontPref(next);
      return next;
    });
  };
  const fontSize = FONT_SIZES[fontStep];

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { interruptions, warned, dismiss, isFullscreen, enterFullscreen } = useExamLockdown({
    active: snapshot.phase !== "submitted",
  });

  // Draggable divider between the question column and the workspace column —
  // pointer capture keeps delivering move/up events to the handle even once
  // the cursor leaves it, so no window-level listener is needed.
  const startPaneDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPaneDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const row = e.currentTarget.parentElement;
    if (!row) return;
    const rect = row.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setLeftPanePct(Math.min(MAX_PANE_PCT, Math.max(MIN_PANE_PCT, pct)));
  }, []);
  const endPaneDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const module2Pool = useMemo(
    () => (snapshot.route === "harder" ? snapshot.module2Harder : snapshot.module2Easier),
    [snapshot.route, snapshot.module2Harder, snapshot.module2Easier],
  );

  const items: SatQuizItem[] = snapshot.phase === "module1" || snapshot.phase === "module1-review"
    ? snapshot.module1
    : module2Pool;
  const answers = snapshot.phase === "module1" || snapshot.phase === "module1-review"
    ? snapshot.module1Answers : snapshot.module2Answers;
  const flagged = snapshot.phase === "module1" || snapshot.phase === "module1-review"
    ? snapshot.module1Flagged : snapshot.module2Flagged;
  const endsAt = snapshot.phase === "module1" ? snapshot.module1EndsAt : snapshot.module2EndsAt;
  const secondsLeft = Math.max(0, Math.round((endsAt - Date.now()) / 1000));

  const setAnswers = (next: Record<string, string>) => {
    if (snapshot.phase === "module1") onChange({ ...snapshot, module1Answers: next });
    else onChange({ ...snapshot, module2Answers: next });
  };
  const setFlagged = (next: string[]) => {
    if (snapshot.phase === "module1") onChange({ ...snapshot, module1Flagged: next });
    else onChange({ ...snapshot, module2Flagged: next });
  };
  const setCurrent = (index: number) => onChange({ ...snapshot, current: index });

  const finishModule1 = () => {
    const correct = snapshot.module1.filter((q) => isSatItemCorrect(q, snapshot.module1Answers[q.id])).length;
    const route = correct >= snapshot.routingThreshold ? "harder" as const : "easier" as const;
    onChange({ ...snapshot, phase: "transition", route });
  };

  const startModule2 = () => {
    onChange({
      ...snapshot,
      phase: "module2",
      current: 0,
      module2EndsAt: Date.now() + snapshot.module2Minutes * 60_000,
    });
  };

  const finalize = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const pool = snapshot.route === "harder" ? snapshot.module2Harder : snapshot.module2Easier;
      const module1Correct = snapshot.module1.filter((q) => isSatItemCorrect(q, snapshot.module1Answers[q.id])).length;
      const module2Correct = pool.filter((q) => isSatItemCorrect(q, snapshot.module2Answers[q.id])).length;
      const correct = module1Correct + module2Correct;
      const total = snapshot.module1.length + pool.length;
      const route = snapshot.route ?? "easier";
      const scaledScore = estimateScaledScore(route, correct, total);
      const scoreBand = estimateScoreBand(route, correct, total);

      const itemOutcomes: Record<string, number> = {};
      const omitted: string[] = [];
      const domains: Partial<Record<SatDomain, { correct: number; total: number }>> = {};
      // A BLANK still scores 0 — `omitted` only records which zeros were blanks,
      // so the score report can say "left empty" instead of "got it wrong".
      // Same emptiness test `isSatItemCorrect` uses, so the two can never disagree.
      const isBlank = (v: string | undefined) => !(v ?? "").trim();
      for (const q of snapshot.module1) {
        const given = snapshot.module1Answers[q.id];
        const ok = isSatItemCorrect(q, given) ? 1 : 0;
        itemOutcomes[q.id] = ok;
        if (!ok && isBlank(given)) omitted.push(q.id);
        const d = domains[q.domain] ?? { correct: 0, total: 0 };
        domains[q.domain] = { correct: d.correct + ok, total: d.total + 1 };
      }
      for (const q of pool) {
        const given = snapshot.module2Answers[q.id];
        const ok = isSatItemCorrect(q, given) ? 1 : 0;
        itemOutcomes[q.id] = ok;
        if (!ok && isBlank(given)) omitted.push(q.id);
        const d = domains[q.domain] ?? { correct: 0, total: 0 };
        domains[q.domain] = { correct: d.correct + ok, total: d.total + 1 };
      }

      const result: SatMathResult = {
        testId: snapshot.testId,
        testTitle: snapshot.testTitle,
        teacherId: snapshot.teacherId,
        studentId: uid,
        studentName,
        module1Correct,
        module1Total: snapshot.module1.length,
        route,
        module2Correct,
        module2Total: pool.length,
        correct,
        total,
        scaledScore,
        scoreBand,
        durationSec: Math.max(0, Math.round((Date.now() - snapshot.startedAt) / 1000)),
        submittedAt: Date.now(),
        examLang: snapshot.examLang,
        items: itemOutcomes,
        omitted,
        domains,
      };

      await onSave(result);
      const finished: SatExamSnapshot = { ...snapshot, phase: "submitted" };
      onChange(finished);
      // ⚠️ Passes the finished snapshot alongside the result — `onSubmit` fires
      // from inside this async function, so it must not rely on the page's
      // `snapshot` prop being fresh; the page may not have re-rendered yet.
      onSubmit(result, finished);
    } finally {
      setSaving(false);
    }
  };

  // Auto-advance on timeout — matches the real test's own behaviour (a module
  // ends when the clock does, with no extra review step to skip through).
  useEffect(() => {
    if (snapshot.phase === "module1" && secondsLeft <= 0) finishModule1();
    if (snapshot.phase === "module2" && secondsLeft <= 0) finalize();
    // Only the tick that reaches zero should fire this; re-running on every
    // snapshot change would refire mid-transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft <= 0, snapshot.phase]);

  // ── transition screen (Module 1 → Module 2) ─────────────────────────────
  if (snapshot.phase === "transition") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background p-6 text-center">
        <h1 className="text-[22px] font-black text-on-surface">{t.transitionTitle}</h1>
        <p className="max-w-sm text-[14px] font-medium leading-relaxed text-on-surface-variant">{t.transitionBody}</p>
        <Button size="lg" onClick={startModule2}>{t.startModule2}</Button>
      </div>
    );
  }

  // ── review screen (end of a module) ──────────────────────────────────────
  if (snapshot.phase === "module1-review" || snapshot.phase === "module2-review") {
    const reviewItems = snapshot.phase === "module1-review" ? snapshot.module1 : module2Pool;
    const reviewAnswers = snapshot.phase === "module1-review" ? snapshot.module1Answers : snapshot.module2Answers;
    const reviewFlagged = new Set(snapshot.phase === "module1-review" ? snapshot.module1Flagged : snapshot.module2Flagged);
    const backToActive = () => onChange({ ...snapshot, phase: snapshot.phase === "module1-review" ? "module1" : "module2" });
    const finishThisModule = () => (snapshot.phase === "module1-review" ? finishModule1() : finalize());

    return (
      <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-background">
        <header className="flex shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-4 py-3">
          <h1 className="text-[15px] font-black text-on-surface">{t.reviewTitle}</h1>
          <Button size="sm" variant="text" onClick={backToActive}>{t.prev}</Button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto grid max-w-2xl grid-cols-5 gap-2 sm:grid-cols-8">
            {reviewItems.map((q, i) => {
              const answered = !!reviewAnswers[q.id];
              const isFlag = reviewFlagged.has(q.id);
              return (
                <button
                  key={q.id}
                  onClick={() => { setCurrent(i); backToActive(); }}
                  className={cn(
                    "relative flex h-12 items-center justify-center rounded-m3-md border text-[13px] font-black",
                    answered ? "border-primary bg-primary-container text-on-primary-container" : "border-outline-variant bg-surface-container-lowest text-on-surface-variant",
                  )}
                >
                  {i + 1}
                  {isFlag && <Flag size={10} className="absolute right-1 top-1 fill-warning text-warning" />}
                </button>
              );
            })}
          </div>
        </div>
        <div className="shrink-0 border-t border-outline-variant bg-surface-container-low px-4 py-3">
          <Button fullWidth size="lg" loading={saving} onClick={() => setConfirmFinish(true)}>
            {t.continueModule}
          </Button>
        </div>

        <Dialog
          open={confirmFinish}
          onClose={() => setConfirmFinish(false)}
          title={t.continueModule}
          actions={
            <>
              <Button variant="text" onClick={() => setConfirmFinish(false)}>{t.cancel}</Button>
              <Button loading={saving} onClick={() => { setConfirmFinish(false); finishThisModule(); }}>{t.yes}</Button>
            </>
          }
        >
          <p className="text-[13px] font-medium text-on-surface-variant">{t.continueConfirm}</p>
        </Dialog>
      </div>
    );
  }

  // ── active module ────────────────────────────────────────────────────────
  const q = items[snapshot.current];
  if (!q) return null;
  const isFlagged = flagged.includes(q.id);
  const crossed = new Set(snapshot.crossedOut[q.id] ?? []);
  const lowTime = secondsLeft <= 5 * 60;

  const toggleCross = (letter: string) => {
    const cur = new Set(snapshot.crossedOut[q.id] ?? []);
    if (cur.has(letter)) cur.delete(letter); else cur.add(letter);
    onChange({ ...snapshot, crossedOut: { ...snapshot.crossedOut, [q.id]: [...cur] } });
  };
  const answer = (value: string) => setAnswers({ ...answers, [q.id]: value });
  const toggleFlag = () => setFlagged(isFlagged ? flagged.filter((id) => id !== q.id) : [...flagged, q.id]);
  const goto = (delta: number) => {
    const next = snapshot.current + delta;
    if (next < 0) return;
    if (next >= items.length) {
      onChange({ ...snapshot, phase: snapshot.phase === "module1" ? "module1-review" : "module2-review" });
      return;
    }
    setCurrent(next);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-background">
      {warned && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-scrim-bg p-4 backdrop-blur-md">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-sm rounded-m3-xl bg-surface-container-high p-7 text-center shadow-elev-3">
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-m3-lg bg-error-container text-on-error-container">
              <ShieldAlert size={32} strokeWidth={2.5} />
            </div>
            <h2 className="mb-2 text-[20px] font-bold text-on-surface">{t.focusTitle}</h2>
            <p className="mb-2 text-[13.5px] font-bold leading-relaxed text-on-surface-variant">{t.focusDesc}</p>
            <p className="mb-6 text-[12px] font-black uppercase tracking-wider text-error">{t.focusCount}: {interruptions}</p>
            <Button fullWidth size="lg" tone="error" onClick={() => { dismiss(); enterFullscreen(); }}>
              {t.focusBtn}
            </Button>
          </div>
        </div>
      )}

      <header className="z-30 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-outline-variant bg-surface px-3 py-2.5 sm:px-4">
        <span className="text-[13px] font-black text-on-surface">
          {snapshot.phase === "module1" ? "Module 1" : "Module 2"}: {subjectName}
        </span>

        <div className="flex items-center gap-1.5">
          {interruptions > 0 && (
            <span className="flex items-center gap-1 rounded-m3-sm bg-error-container px-2 py-1.5 text-[12px] font-black text-on-error-container">
              <ShieldAlert size={13} strokeWidth={3} /> {interruptions}×
            </span>
          )}
          {/* Text size — 8 steps, remembered per device (matches the IELTS runner's control). */}
          <div
            className="flex items-center rounded-m3-sm border border-outline-variant bg-surface-container p-0.5"
            title={`${t.textSize}: ${fontSize}px`}
          >
            <button
              type="button"
              onClick={() => changeFont(-1)}
              disabled={fontStep === 0}
              aria-label={`${t.textSize} −`}
              className="rounded-m3-xs px-2 py-0.5 text-[12px] font-bold text-on-surface-variant hover:bg-state-hover disabled:opacity-35"
            >
              A−
            </button>
            <span className="s-num hidden min-w-[22px] text-center text-[11px] font-black text-on-surface-variant sm:block">
              {fontSize}
            </span>
            <button
              type="button"
              onClick={() => changeFont(1)}
              disabled={fontStep === FONT_SIZES.length - 1}
              aria-label={`${t.textSize} +`}
              className="rounded-m3-xs px-2 py-0.5 text-[15px] font-bold text-on-surface-variant hover:bg-state-hover disabled:opacity-35"
            >
              A+
            </button>
          </div>
          {!isFullscreen && (
            <IconButton aria-label={t.fullscreen} size="sm" onClick={enterFullscreen}><Maximize /></IconButton>
          )}
          <IconButton aria-label={t.calculator} size="sm" onClick={() => setShowCalc((v) => !v)}><Calculator /></IconButton>
          <IconButton aria-label={t.reference} size="sm" onClick={() => setShowRef(true)}><Ruler /></IconButton>
          <button
            type="button"
            onClick={() => setShowTimer((v) => !v)}
            title={showTimer ? t.hideTime : t.showTime}
            className={cn(
              "flex items-center gap-1.5 rounded-m3-sm px-3 py-1.5 text-[13px] font-black",
              lowTime && showTimer ? "bg-error-container text-on-error-container" : "bg-primary-container text-on-primary-container",
            )}
          >
            {showTimer ? <Clock size={14} strokeWidth={3} /> : <EyeOff size={14} strokeWidth={3} />}
            {showTimer ? formatTime(secondsLeft) : "--:--"}
          </button>
        </div>
      </header>

      {showCalc && (
        <div className="absolute right-3 top-14 z-40 sm:right-4">
          <SatCalculator onClose={() => setShowCalc(false)} />
        </div>
      )}

      <div
        className="flex flex-1 flex-col overflow-hidden md:flex-row"
        style={{ ["--sat-left" as string]: `${leftPanePct}%` }}
      >
        <div className="w-full flex-1 overflow-y-auto p-4 sm:p-6 md:w-[var(--sat-left)] md:flex-none">
          <div className="mx-auto max-w-2xl md:mx-0 md:max-w-none">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[19px] font-black text-on-surface">{t.question} {snapshot.current + 1}</h2>
              <button
                onClick={toggleFlag}
                className={cn(
                  "flex items-center gap-1.5 rounded-m3-sm px-2.5 py-1.5 text-[12px] font-bold",
                  isFlagged ? "bg-warning-container text-on-warning-container" : "bg-surface-container text-on-surface-variant",
                )}
              >
                <Flag size={13} className={isFlagged ? "fill-current" : undefined} />
                {isFlagged ? t.flagged : t.flag}
              </button>
            </div>

            <div
              className="mb-5 font-medium leading-relaxed text-on-surface"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.65 }}
            >
              <LatexRenderer latex={q.question[L] || q.question.uz || ""} />
            </div>
            {q.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={q.imageUrl} alt="" className="mb-5 max-h-72 w-auto rounded-m3-md border border-outline-variant md:hidden" />
            )}

            {q.qType === "mcq" ? (
              <div className="flex flex-col gap-2.5">
                {q.optionKeys.map((letter) => {
                  const selected = answers[q.id] === letter;
                  const isCrossed = crossed.has(letter);
                  return (
                    <div
                      key={letter}
                      onClick={() => answer(letter)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-m3-lg border-2 p-3.5 transition-colors",
                        selected ? "border-primary bg-primary-container" : "border-outline-variant bg-surface-container-lowest",
                        isCrossed && "opacity-50",
                      )}
                    >
                      <span className={cn(
                        "flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 text-[13px] font-black",
                        selected ? "border-primary bg-primary text-on-primary" : "border-outline-variant text-on-surface-variant",
                      )}>
                        {letter}
                      </span>
                      <span
                        className={cn("min-w-0 flex-1 font-medium text-on-surface", isCrossed && "line-through")}
                        style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
                      >
                        <LatexRenderer latex={q.options[letter]?.[L] || q.options[letter]?.uz || ""} />
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCross(letter); }}
                        className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
                        aria-label="cross out"
                      >
                        {isCrossed ? <Eye size={14} /> : <span className="text-[11px] font-black underline">{letter}</span>}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-[12px] font-bold text-on-surface-variant">{t.numericLabel}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => answer(e.target.value)}
                  className="w-full max-w-xs rounded-m3-lg border-2 border-outline-variant bg-surface-container-lowest px-4 py-3 text-[16px] font-bold text-on-surface outline-none focus:border-primary"
                />
              </div>
            )}
          </div>
        </div>

        {/* Draggable divider — pointer capture keeps routing move/up events here even once the cursor leaves the handle. */}
        <div
          onPointerDown={startPaneDrag}
          onPointerMove={onPaneDrag}
          onPointerUp={endPaneDrag}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panes"
          className="hidden shrink-0 touch-none md:block md:w-1.5 md:cursor-col-resize md:bg-outline-variant md:hover:bg-primary md:active:bg-primary"
        />

        {/* Bluebook-style workspace pane — plots/images live here; otherwise mostly empty real estate. The calculator/reference toggles float on top of it. */}
        <div className="hidden md:flex md:flex-1 md:flex-col md:items-center md:overflow-y-auto md:p-6">
          {q.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={q.imageUrl} alt="" className="max-h-full w-auto max-w-full rounded-m3-md border border-outline-variant" />
          )}
        </div>
      </div>

      <div className="z-30 flex shrink-0 items-center justify-between gap-2 border-t border-outline-variant bg-surface-container-low px-3 py-2.5 sm:px-4">
        <Button variant="outlined" tone="secondary" disabled={snapshot.current === 0} onClick={() => goto(-1)} icon={<ChevronLeft size={16} />}>
          {t.prev}
        </Button>
        <button
          onClick={() => setShowNav(true)}
          className="flex items-center gap-2 rounded-full bg-on-surface px-4 py-2.5 text-[13px] font-bold text-surface"
        >
          <Grid3x3 size={14} />
          {t.question} {snapshot.current + 1} {t.of} {items.length}
        </button>
        <Button onClick={() => goto(1)} trailingIcon={snapshot.current === items.length - 1 ? undefined : <ChevronRight size={16} />}>
          {t.next}
        </Button>
      </div>

      <Dialog open={showNav} onClose={() => setShowNav(false)} title={t.navigator}>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {items.map((it, i) => {
            const answeredHere = !!answers[it.id];
            const flaggedHere = flagged.includes(it.id);
            return (
              <button
                key={it.id}
                onClick={() => { setCurrent(i); setShowNav(false); }}
                className={cn(
                  "relative flex h-11 items-center justify-center rounded-m3-md border text-[13px] font-black",
                  i === snapshot.current ? "border-primary bg-primary text-on-primary"
                    : answeredHere ? "border-primary bg-primary-container text-on-primary-container"
                    : "border-outline-variant bg-surface-container-lowest text-on-surface-variant",
                )}
              >
                {i + 1}
                {flaggedHere && <Flag size={9} className="absolute right-0.5 top-0.5 fill-warning text-warning" />}
              </button>
            );
          })}
        </div>
      </Dialog>

      <Dialog open={showRef} onClose={() => setShowRef(false)} title={t.reference} className="max-w-2xl">
        <SatReferenceSheet />
      </Dialog>
    </div>
  );
}

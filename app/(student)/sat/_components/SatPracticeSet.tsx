"use client";

import { useState } from "react";
import { Check, ChevronRight, RotateCcw, X } from "lucide-react";

import LatexRenderer from "@/components/LatexRenderer";
import { isSatItemCorrect, satDomainSlot } from "@/lib/SatMathQuiz";
import { cn } from "@/components/student-ui";
import type { SatQuizItem } from "@/types/SatQuiz";

/**
 * One topic-practice set (2026-11-02): a question at a time, Check → right /
 * wrong + the answer + explanation, Skip allowed, then a summary. Writes
 * nothing itself — `onDone(answers)` fires ONCE when the last question is
 * passed, and the caller records it (satTopics.ts › recordTopicSet).
 * English-only chrome, like every SAT page.
 */

const t = {
  check: "Check",
  next: "Next",
  finish: "Finish",
  skip: "Skip",
  correct: "Correct",
  wrong: "Not quite",
  answer: "Answer",
  typeAnswer: "Type your answer",
  done: "Set complete",
  again: "New set",
  back: "All topics",
};

export default function SatPracticeSet({
  items, label, onDone, onAgain, onExit,
}: {
  items: SatQuizItem[];
  label: string;
  onDone: (answers: Record<string, string>) => void;
  onAgain: () => void;
  onExit: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const total = items.length;

  if (idx >= total) {
    const right = items.filter((q) => isSatItemCorrect(q, answers[q.id])).length;
    return (
      <section className="s-panel flex flex-col items-center gap-4 rounded-m3-lg p-6 text-center">
        <span className="s-chip grid h-14 w-14 place-items-center rounded-full"><Check size={26} strokeWidth={2.6} /></span>
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant">{t.done} · {label}</p>
          <p className="s-num mt-1 text-[34px] font-black leading-none text-on-surface">
            {right}<span className="text-[18px] text-on-surface-variant">/{total}</span>
          </p>
          <p className="s-num mt-1 text-[13px] font-bold text-primary">{Math.round((right / total) * 100)}%</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onAgain} className="s-chip s-press inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-extrabold">
            <RotateCcw size={16} /> {t.again}
          </button>
          <button type="button" onClick={onExit} className="s-panel s-press inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-extrabold text-on-surface">
            {t.back}
          </button>
        </div>
      </section>
    );
  }

  const q = items[idx];
  const given = answers[q.id] ?? "";
  const isChecked = !!checked[q.id];
  const ok = isChecked && isSatItemCorrect(q, given);
  const last = idx === total - 1;
  const advance = () => {
    if (last) onDone(answers);
    setIdx(idx + 1);
  };

  return (
    <section className="s-panel flex flex-col gap-4 rounded-m3-lg p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: `var(--s-viz-${satDomainSlot(q.domain)})` }} />
        <p className="min-w-0 flex-1 truncate text-[13px] font-extrabold text-on-surface">{label}</p>
        <span className="s-num text-[12px] font-bold text-on-surface-variant">{idx + 1}/{total}</span>
        <button type="button" aria-label="Close" onClick={onExit} className="grid h-8 w-8 place-items-center rounded-full text-on-surface-variant hover:bg-state-hover">
          <X size={16} />
        </button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-state-hover">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(idx / total) * 100}%` }} />
      </div>

      <div className="text-[15px] font-medium leading-relaxed text-on-surface">
        <LatexRenderer latex={q.question.en || q.question.uz || ""} />
      </div>
      {q.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={q.imageUrl} alt="" className="max-h-64 w-auto self-start rounded-m3-md" />
      )}

      {q.qType === "mcq" ? (
        <div className="flex flex-col gap-2">
          {q.optionKeys.map((k) => {
            const picked = given === k;
            const isRight = isChecked && k === q.answer;
            const isWrongPick = isChecked && picked && k !== q.answer;
            return (
              <button
                key={k}
                type="button"
                disabled={isChecked}
                onClick={() => setAnswers({ ...answers, [q.id]: k })}
                className={cn(
                  "flex items-start gap-3 rounded-m3-md px-3.5 py-3 text-left text-[14px] transition-colors",
                  isRight ? "bg-success-container text-on-success-container"
                    : isWrongPick ? "bg-error-container text-on-error-container"
                    : picked ? "ring-2 ring-primary bg-state-hover text-on-surface"
                    : "bg-state-hover text-on-surface hover:bg-state-press",
                )}
              >
                <span className={cn("grid h-6 w-6 flex-none place-items-center rounded-full text-[12px] font-black", picked && !isChecked ? "s-chip" : "bg-surface-container-lowest text-on-surface-variant")}>{k}</span>
                <span className="min-w-0 flex-1"><LatexRenderer latex={q.options[k]?.en || q.options[k]?.uz || ""} /></span>
              </button>
            );
          })}
        </div>
      ) : (
        <input
          value={given}
          disabled={isChecked}
          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
          placeholder={t.typeAnswer}
          inputMode="decimal"
          className={cn(
            "s-num h-12 rounded-full bg-state-hover px-5 text-[16px] font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary",
            isChecked && (ok ? "ring-2 ring-success" : "ring-2 ring-error"),
          )}
        />
      )}

      {isChecked && (
        <div className={cn("rounded-m3-md px-3.5 py-3 text-[13px]", ok ? "bg-success-container text-on-success-container" : "bg-error-container text-on-error-container")}>
          <p className="font-black">{ok ? t.correct : t.wrong}</p>
          {!ok && (
            <p className="mt-1 font-bold">
              {t.answer}:{" "}
              <LatexRenderer latex={q.qType === "mcq" ? `${q.answer}. ${q.options[q.answer]?.en || q.options[q.answer]?.uz || ""}` : q.answer} />
            </p>
          )}
          {q.explanation && (q.explanation.en || q.explanation.uz) && (
            <div className="mt-2 text-[12.5px] font-medium opacity-90">
              <LatexRenderer latex={q.explanation.en || q.explanation.uz || ""} />
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        {!isChecked ? (
          <>
            <button type="button" onClick={advance} className="h-11 rounded-full px-4 text-[13.5px] font-extrabold text-on-surface-variant hover:bg-state-hover">
              {t.skip}
            </button>
            <button
              type="button"
              disabled={!given.trim()}
              onClick={() => setChecked({ ...checked, [q.id]: true })}
              className="s-chip s-press h-11 rounded-full px-6 text-[14px] font-extrabold disabled:opacity-40"
            >
              {t.check}
            </button>
          </>
        ) : (
          <button type="button" onClick={advance} className="s-chip s-press inline-flex h-11 items-center gap-1.5 rounded-full px-6 text-[14px] font-extrabold">
            {last ? t.finish : t.next} <ChevronRight size={16} />
          </button>
        )}
      </div>
    </section>
  );
}

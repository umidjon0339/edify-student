"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

import LatexRenderer from "@/components/LatexRenderer";
import type { SatImportOk } from "@/lib/SatQuestionImport";
import { IconButton, cn } from "@/components/ui";

/**
 * One row of the import preview: collapsed = the one-line summary it always
 * was; tapped = the WHOLE question as it will be saved (text, image, every
 * choice with the correct one marked, typed answer + accepted forms,
 * explanation) — so the teacher can check the answer key BEFORE anything is
 * written. ✕ removes the row from this import (it is simply not written).
 *
 * Reads the built `source` (what `toQuestionV1` receives), not the raw file
 * row — what you see is exactly what gets stored.
 */

type Loc = { uz?: string; ru?: string; en?: string };
const textOf = (v: unknown): string => {
  if (typeof v === "string") return v;
  const l = (v ?? {}) as Loc;
  return l.en || l.uz || l.ru || "";
};

export interface PreviewLabels {
  removeRow: string;
  correctMark: string;
  answerLabel: string;
  acceptedLabel: string;
  explanationLabel: string;
}

export default function PreviewRow({
  row, labels: t, onRemove,
}: {
  row: SatImportOk;
  labels: PreviewLabels;
  onRemove: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const src = row.source;
  const options = Object.entries((src.options ?? {}) as Record<string, unknown>);
  const correct = (src.correctAnswer ?? {}) as { value?: string; acceptedAnswers?: string[] };
  const explanation = textOf(src.explanation);
  const imageUrl = typeof src.imageUrl === "string" ? src.imageUrl : "";
  const tags = (src.tags as string[] | undefined) ?? [];

  return (
    <li className={cn("transition-colors", open && "bg-surface-container-low")}>
      <div className="flex items-start gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <ChevronDown
            size={14}
            className={cn("mt-0.5 flex-none text-on-surface-variant transition-transform", open && "rotate-180")}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-medium text-on-surface">
              <span className="mr-1.5 tabular-nums text-on-surface-variant">#{row.index + 1}</span>
              {row.preview}
            </span>
            <span className="mt-0.5 block text-[10.5px] font-bold uppercase tracking-wide text-on-surface-variant">
              {row.type} · {row.topicName} → {row.subtopicName} · {row.difficulty}
              {tags.length > 0 && ` · #${tags.join(" #")}`}
            </span>
          </span>
        </button>
        <IconButton aria-label={t.removeRow} title={t.removeRow} size="sm" onClick={() => onRemove(row.index)}>
          <X size={14} />
        </IconButton>
      </div>

      {open && (
        <div className="flex flex-col gap-3 px-3 pb-3 pl-9">
          <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-on-surface">
            <LatexRenderer latex={textOf(src.question)} />
          </div>

          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary file URLs; next/image needs whitelisted hosts
            <img src={imageUrl} alt="" className="max-h-64 w-auto self-start rounded-m3-sm border border-outline-variant" />
          )}

          {options.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {options.map(([key, value]) => {
                const isCorrect = key === correct.value;
                return (
                  <li
                    key={key}
                    className={cn(
                      "flex items-start gap-2 rounded-m3-sm border px-2.5 py-1.5 text-[12.5px]",
                      isCorrect
                        ? "border-success bg-success-container text-on-success-container"
                        : "border-outline-variant text-on-surface",
                    )}
                  >
                    <b className="w-4 flex-none">{key}</b>
                    <span className="min-w-0 flex-1"><LatexRenderer latex={textOf(value)} /></span>
                    {isCorrect && (
                      <span className="flex flex-none items-center gap-1 text-[11px] font-bold">
                        <Check size={13} /> {t.correctMark}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
              <span className="font-bold text-on-surface-variant">{t.answerLabel}:</span>
              <span className="rounded-m3-sm border border-success bg-success-container px-2.5 py-1 font-bold text-on-success-container">
                <LatexRenderer latex={correct.value ?? ""} />
              </span>
              {(correct.acceptedAnswers?.length ?? 0) > 0 && (
                <span className="text-[11.5px] text-on-surface-variant">
                  {t.acceptedLabel}: {correct.acceptedAnswers!.join(", ")}
                </span>
              )}
            </div>
          )}

          {explanation && (
            <div className="rounded-m3-sm bg-surface-container-highest p-2.5">
              <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-on-surface-variant">{t.explanationLabel}</p>
              <div className="whitespace-pre-wrap text-[12px] leading-relaxed text-on-surface">
                <LatexRenderer latex={explanation} />
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

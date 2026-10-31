"use client";

/* Shared building blocks for the test-creation pages (app/teacher/create/*).
   Minimal on purpose: plain surfaces, 1px borders, one accent, short labels.
   Token utilities only — every palette / dark mode keeps working. */

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { cn } from "@/components/ui";

/** Plain text input / textarea look. 16px on phones so iOS doesn't zoom in. */
export const INPUT =
  "w-full rounded-m3-sm border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-base md:text-sm text-on-surface " +
  "placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary transition-colors";

/** Sticky page header: back arrow · title · optional right slot. */
export function CreateHeader({ title, backHref = "/teacher/create", backLabel = "Orqaga", right }: {
  title: ReactNode;
  backHref?: string;
  backLabel?: string;
  right?: ReactNode;
}) {
  return (
    <header className="t-page-bar sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-outline-variant bg-background-blur px-2 backdrop-blur-xl md:px-4">
      <Link
        href={backHref}
        aria-label={backLabel}
        title={backLabel}
        className="m3-interactive grid h-10 w-10 shrink-0 place-items-center rounded-full text-on-surface-variant"
      >
        <ArrowLeft size={20} />
      </Link>
      <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-on-surface">{title}</h1>
      {right && <div className="flex shrink-0 items-center gap-2 pr-1">{right}</div>}
    </header>
  );
}

/** Label above a control, optional one-line hint below. */
export function Field({ label, hint, htmlFor, children, className }: {
  label: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-on-surface">{label}</label>
      {children}
      {hint && <p className="text-xs text-on-surface-variant">{hint}</p>}
    </div>
  );
}

/** One-of-N choice as a segmented control (difficulty, mode…). */
export function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode }[];
  /** Accessible name of the group. */
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-m3-sm bg-surface-container p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-9 truncate rounded-m3-xs px-1.5 text-[13px] transition-colors",
              active ? "bg-surface-container-lowest font-semibold text-on-surface shadow-elev-1" : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** − n + number picker. */
export function Stepper({ value, onChange, min = 1, max = 99, label }: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  const btn = "m3-interactive grid h-10 w-10 place-items-center rounded-m3-xs text-on-surface-variant disabled:text-disabled-fg disabled:cursor-not-allowed";
  return (
    <div role="group" aria-label={label} className="inline-flex items-center rounded-m3-sm border border-outline-variant bg-surface-container-lowest p-0.5">
      <button type="button" aria-label="−" className={btn} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus size={16} />
      </button>
      <span aria-live="polite" className="w-10 text-center text-sm font-semibold tabular-nums text-on-surface">{value}</span>
      <button type="button" aria-label="+" className={btn} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus size={16} />
      </button>
    </div>
  );
}

/** Bar pinned to the bottom of the page: a short summary + the actions.
 *  Sticky inside the layout's scroll area, so it never hides content. */
export function ActionBar({ summary, children }: { summary?: ReactNode; children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 mt-auto border-t border-outline-variant bg-background-blur backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6">
        {summary && <p className="mr-auto hidden text-sm text-on-surface-variant sm:block">{summary}</p>}
        <div className="flex flex-1 gap-2 sm:flex-none [&>*]:flex-1 sm:[&>*]:flex-none">{children}</div>
      </div>
    </div>
  );
}

/** Centered placeholder for an empty results area. */
export function EmptyHint({ icon, title, text }: { icon?: ReactNode; title: ReactNode; text?: ReactNode }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-m3-lg border border-dashed border-outline-variant px-6 py-12 text-center">
      {icon && <div className="mb-3 text-on-surface-variant [&_svg]:h-6 [&_svg]:w-6">{icon}</div>}
      <p className="text-sm font-medium text-on-surface">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-on-surface-variant">{text}</p>}
    </div>
  );
}

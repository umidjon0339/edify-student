"use client";

/**
 * One-of-N choice styled like the pillbar's nav capsule: a frosted glass
 * capsule (.t-glass-pill) of rounded-full options; the selected one sits in
 * the blue gradient pill (.t-icon-chip), which glides between options
 * (framer layoutId — instant when Motion_level is 'none'). Wraps onto more
 * lines when it runs out of room.
 */
import { useId, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "./cn";
import { springTransition } from "./config";

export interface PillGroupOption<T extends string> {
  id: T;
  label: ReactNode;
}

export interface PillGroupProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: PillGroupOption<T>[];
  /** Accessible name of the group. */
  ariaLabel: string;
  className?: string;
}

export function PillGroup<T extends string>({ value, onChange, options, ariaLabel, className }: PillGroupProps<T>) {
  const glideId = `pill-group-${useId()}`;
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("t-glass-pill inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-m3-xl p-1.5", className)}
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={cn(
              "relative h-10 rounded-full px-4 text-[13px] whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary",
              active ? "t-on-chip font-semibold" : "font-medium text-on-surface-variant hover:bg-state-hover hover:text-on-surface",
            )}
          >
            {active && <motion.span layoutId={glideId} transition={springTransition} className="t-icon-chip absolute inset-0 rounded-full" />}
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

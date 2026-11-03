"use client";

import { useRef, useState } from "react";
import { Calculator, GripHorizontal, LineChart, Sigma, X, type LucideIcon } from "lucide-react";
import { cn } from "@/components/student-ui";

/**
 * The SAT Math runner's calculator — THREE modes behind a header toggle,
 * each the REAL official Desmos product, iframed: "Basic"
 * (desmos.com/fourfunction), "Scientific" (desmos.com/scientific),
 * "Graphing" (desmos.com/calculator, the default mode). docs/SAT_QUIZ.md.
 *
 * ⚠️ Deliberately an iframe of the real desmos.com, NOT a self-built
 * substitute (an earlier version of this file built its own four-function
 * calculator and its own Desmos-style graphing engine — both removed
 * 2026-11-03 in favor of the real products). Trade-off this accepts: a
 * student can navigate the real desmos.com from inside the iframe (sign in,
 * open a saved graph) and it needs network — neither true of a self-built
 * substitute, see docs/SAT_QUIZ.md for the full reasoning. The public
 * desmos.com pages set no `X-Frame-Options`/CSP `frame-ancestors`, so a bare
 * iframe works with no API key.
 *
 * Each mode's iframe is LAZILY mounted (only once the student first switches
 * to it) but then stays mounted — hidden via `className`, never unmounted —
 * for the rest of the session, so switching modes doesn't reload Desmos or
 * lose whatever the student typed into it.
 *
 * Draggable (header) and resizable (a visible grip in the bottom-right
 * corner), pointer-capture based — same convention as the runner's own
 * question/workspace pane divider. Mode, position and size are local
 * component state only, never persisted; a reopen/reload starts from
 * Graphing mode and the default geometry.
 *
 * ⚠️ **Position is explicit pixels (`pos.left/top`, `position: fixed`), not a
 * `transform: translate` offset on top of a CSS-anchored box** (2026-11-03
 * fix). The caller (`SatRunner`) mounts this inside a wrapper positioned
 * `right-3` — an element with `right` set and no explicit `width` shrink-wraps
 * its content and recomputes its LEFT edge from that width, so resizing
 * `size.w` silently moved the box's left edge while the resize handle (pinned
 * to the box's own right edge, which the wrapper keeps fixed on screen) never
 * visually moved — the drag no longer tracked the cursor at all horizontally,
 * reported as "resizing left makes it go right." `pos` is lazily captured
 * (`getBoundingClientRect()`) the first time the student drags OR resizes, at
 * which point this component switches itself to `position: fixed` and owns
 * its on-screen position outright — from then on resize only changes
 * `size.{w,h}` with the top-left corner pinned, so the bottom-right handle
 * tracks the cursor correctly in both directions, and drag only changes
 * `pos.{left,top}`. Before the first interaction the wrapper's CSS anchoring
 * places it, same as before.
 */

const DEFAULT_SIZE = { w: 560, h: 480 };
const MIN_SIZE = { w: 340, h: 300 };

type Mode = "basic" | "scientific" | "graphing";
const SRC: Record<Mode, string> = {
  basic: "https://www.desmos.com/fourfunction",
  scientific: "https://www.desmos.com/scientific",
  graphing: "https://www.desmos.com/calculator",
};
const MODES: Array<{ id: Mode; icon: LucideIcon; label: string }> = [
  { id: "basic", icon: Calculator, label: "Basic calculator" },
  { id: "scientific", icon: Sigma, label: "Scientific calculator" },
  { id: "graphing", icon: LineChart, label: "Graphing calculator" },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default function SatCalculator({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("graphing");
  const [shown, setShown] = useState<Record<Mode, boolean>>({ basic: false, scientific: false, graphing: true });
  const switchMode = (m: Mode) => {
    setMode(m);
    setShown((prev) => (prev[m] ? prev : { ...prev, [m]: true }));
  };

  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const dragState = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const resizeState = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  /** Captures the box's CURRENT on-screen position once, the first time it's
   *  dragged or resized, and switches it to `position: fixed` from then on. */
  const ensurePositioned = (): { left: number; top: number } => {
    if (pos) return pos;
    const rect = rootRef.current?.getBoundingClientRect();
    const next = rect ? { left: rect.left, top: rect.top } : { left: 0, top: 0 };
    setPos(next);
    return next;
  };

  const onDragDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const base = ensurePositioned();
    dragState.current = { x: e.clientX, y: e.clientY, left: base.left, top: base.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const { x, y, left, top } = dragState.current;
    setPos({ left: left + (e.clientX - x), top: top + (e.clientY - y) });
  };
  const onDragUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onResizeDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    ensurePositioned(); // pin the top-left corner before the box starts resizing
    resizeState.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeState.current) return;
    const { x, y, w, h } = resizeState.current;
    const left = pos?.left ?? 0;
    const top = pos?.top ?? 0;
    const maxW = window.innerWidth - left - 16;
    const maxH = window.innerHeight - top - 16;
    setSize({
      w: clamp(w + (e.clientX - x), MIN_SIZE.w, maxW),
      h: clamp(h + (e.clientY - y), MIN_SIZE.h, maxH),
    });
  };
  const onResizeUp = (e: React.PointerEvent<HTMLDivElement>) => {
    resizeState.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={rootRef}
      className={cn("flex flex-col overflow-hidden rounded-m3-lg border border-outline-variant bg-surface-container-high shadow-elev-3 z-40", pos ? "fixed" : "relative")}
      style={pos ? { left: pos.left, top: pos.top, width: size.w, height: size.h } : { width: size.w, height: size.h }}
    >
      <div
        onPointerDown={onDragDown}
        onPointerMove={onDragMove}
        onPointerUp={onDragUp}
        className="flex touch-none cursor-move select-none items-center justify-between border-b border-outline-variant bg-surface-container px-3 py-2"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-on-surface-variant">
          <GripHorizontal size={14} /> Calculator
        </span>
        <span className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <span className="flex items-center rounded-m3-sm border border-outline-variant bg-surface-container-lowest p-0.5">
            {MODES.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => switchMode(id)}
                aria-pressed={mode === id}
                title={label}
                className={cn("rounded-m3-xs p-1", mode === id ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-state-hover")}
              >
                <Icon size={14} />
              </button>
            ))}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close calculator"
            className="rounded-m3-xs p-1 text-on-surface-variant hover:bg-state-hover"
          >
            <X size={16} />
          </button>
        </span>
      </div>

      {MODES.map(({ id, label }) => shown[id] && (
        <div key={id} className={cn("flex min-h-0 flex-1", mode !== id && "hidden")}>
          <iframe title={`Desmos ${label}`} src={SRC[id]} className="h-full w-full border-0 bg-white" />
        </div>
      ))}

      <div
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
        aria-label="Resize calculator"
        role="separator"
        className="absolute bottom-0 right-0 flex h-6 w-6 touch-none cursor-nwse-resize items-end justify-end rounded-tl-m3-xs p-1 text-on-surface-variant/70 hover:bg-state-hover hover:text-on-surface-variant"
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
          <line x1="10" y1="1" x2="1" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="10" y1="5" x2="5" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="10" y1="9" x2="9" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calculator, Delete, GripHorizontal, Home, Keyboard, LineChart, Minus, Plus, X } from "lucide-react";
import { Slider, cn } from "@/components/student-ui";
import { buildGraph, niceNumber, type GraphPlot } from "@/lib/GraphCalc";
import SatBasicCalculator from "./SatBasicCalculator";

/**
 * The SAT Math runner's calculator — TWO modes, a header toggle between them
 * (matches the real Bluebook calculator, which also offers a basic and a
 * graphing mode): "Graphing" (this file) is a self-built Desmos-style
 * calculator, NOT an embed of desmos.com (no iframe, no external network
 * call, nothing a student could navigate away into mid-exam) — the
 * expression-list + canvas-graph math engine lives in lib/GraphCalc.ts (pure,
 * no `eval`), this file is the UI + canvas renderer on top of it. "Basic"
 * (SatBasicCalculator.tsx) is a classic four-function calculator for
 * straightforward arithmetic without the graphing UI's overhead. docs/SAT_QUIZ.md.
 *
 * Graphing mode supports: explicit functions (`y = x^2`, `f(x) = sin(x)`,
 * then `f(x)+1` on another row), implicit equations (`8x - 7y = 13y + 2`,
 * `x^2+y^2=25`, marching-squares traced), sliders (`a = 3`, dragged live into
 * every other row), bare numeric expressions (shown as `= value`), pan
 * (drag) and zoom (wheel / buttons), colored/toggleable rows, an
 * always-present trailing blank row to type into (matches Desmos's own list
 * behavior).
 *
 * Draggable (header) and resizable (a VISIBLE grip in the bottom-right
 * corner, not just a hit target), pointer-capture based — same convention as
 * the runner's own question/workspace pane divider, in BOTH modes. A
 * keyboard-icon toggle in the header (graphing mode only — Basic has its own
 * number pad) opens a virtual keypad (digits, +−×÷, ^, √, (), x/y, π/e,
 * sin/cos/tan/log/ln/abs, backspace) that inserts at the last-focused row's
 * cursor — so a student who doesn't know the `sin(`/`sqrt(` typed syntax can
 * still build an expression by tapping. Mode, geometry, expressions and
 * keypad visibility are all local component state, never persisted — a
 * reopen/reload starts from Graphing mode, a single blank row and the
 * default view.
 */

const DEFAULT_SIZE = { w: 560, h: 440 };
const MIN_SIZE = { w: 380, h: 320 };

const PALETTE = ["#2d70b3", "#c74440", "#388c46", "#6042a6", "#fa7e19", "#000000"];

type Row = { id: string; text: string; hidden?: boolean; sliderValue?: number };

/** A key inserts `insert` at the cursor; `cursorOffset` (default = insert's own
 *  length) is where the caret lands afterward — functions land the caret
 *  BETWEEN the parens they just inserted, ready to type the argument. */
type Key = { label: string; insert: string; cursorOffset?: number };
const fn = (label: string, name: string): Key => ({ label, insert: `${name}()`, cursorOffset: name.length + 1 });
const KEYPAD: Key[] = [
  { label: "7", insert: "7" }, { label: "8", insert: "8" }, { label: "9", insert: "9" },
  { label: "÷", insert: "/" }, { label: "(", insert: "(" }, { label: ")", insert: ")" },
  { label: "4", insert: "4" }, { label: "5", insert: "5" }, { label: "6", insert: "6" },
  { label: "×", insert: "*" }, { label: "^", insert: "^" }, fn("√", "sqrt"),
  { label: "1", insert: "1" }, { label: "2", insert: "2" }, { label: "3", insert: "3" },
  { label: "−", insert: "-" }, { label: "x", insert: "x" }, { label: "y", insert: "y" },
  { label: "0", insert: "0" }, { label: ".", insert: "." }, { label: "=", insert: "=" },
  { label: "+", insert: "+" }, { label: "π", insert: "pi" }, { label: "e", insert: "e" },
  fn("sin", "sin"), fn("cos", "cos"), fn("tan", "tan"), fn("log", "log"), fn("ln", "ln"), fn("abs", "abs"),
];

const sliderRange = (value: number): [number, number] => [
  Math.min(-10, Math.floor(value) - 5),
  Math.max(10, Math.ceil(value) + 5),
];

function formatTick(v: number): string {
  const r = Math.round(v * 1e6) / 1e6;
  return Object.is(r, -0) ? "0" : String(r);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Viewport = { cx: number; cy: number; scale: number };

function plotYOfX(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  toPy: (y: number) => number, toMathX: (px: number) => number,
  fn: (x: number) => number,
) {
  ctx.beginPath();
  let prevPy: number | null = null;
  for (let px = 0; px <= w; px++) {
    const y = fn(toMathX(px));
    if (!Number.isFinite(y)) { prevPy = null; continue; }
    const py = toPy(y);
    if (prevPy === null || Math.abs(py - prevPy) > h * 3) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
    prevPy = py;
  }
  ctx.stroke();
}

function plotXOfY(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  toPx: (x: number) => number, toMathY: (py: number) => number,
  fn: (y: number) => number,
) {
  ctx.beginPath();
  let prevPx: number | null = null;
  for (let py = 0; py <= h; py++) {
    const x = fn(toMathY(py));
    if (!Number.isFinite(x)) { prevPx = null; continue; }
    const px = toPx(x);
    if (prevPx === null || Math.abs(px - prevPx) > w * 3) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
    prevPx = px;
  }
  ctx.stroke();
}

/** Traces the zero contour of `F(x,y)` with marching squares over a coarse pixel grid. */
function plotImplicit(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  toMathX: (px: number) => number, toMathY: (py: number) => number,
  F: (x: number, y: number) => number,
) {
  const cols = Math.max(20, Math.floor(w / 6));
  const rows = Math.max(20, Math.floor(h / 6));
  const stepX = w / cols;
  const stepY = h / rows;
  const vals: number[][] = [];
  for (let j = 0; j <= rows; j++) {
    const my = toMathY(j * stepY);
    const row: number[] = [];
    for (let i = 0; i <= cols; i++) row.push(F(toMathX(i * stepX), my));
    vals.push(row);
  }
  ctx.beginPath();
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const v00 = vals[j][i], v10 = vals[j][i + 1], v11 = vals[j + 1][i + 1], v01 = vals[j + 1][i];
      if (![v00, v10, v11, v01].every(Number.isFinite)) continue;
      const bits = (v00 > 0 ? 1 : 0) | (v10 > 0 ? 2 : 0) | (v11 > 0 ? 4 : 0) | (v01 > 0 ? 8 : 0);
      if (bits === 0 || bits === 15) continue;
      const x0 = i * stepX, x1 = (i + 1) * stepX, y0 = j * stepY, y1 = (j + 1) * stepY;
      const lerp = (va: number, vb: number) => va / (va - vb);
      const N = (): [number, number] => [x0 + lerp(v00, v10) * (x1 - x0), y0];
      const E = (): [number, number] => [x1, y0 + lerp(v10, v11) * (y1 - y0)];
      const S = (): [number, number] => [x0 + lerp(v01, v11) * (x1 - x0), y1];
      const W = (): [number, number] => [x0, y0 + lerp(v00, v01) * (y1 - y0)];
      const center = (v00 + v10 + v11 + v01) / 4;
      let segs: Array<[() => [number, number], () => [number, number]]> = [];
      switch (bits) {
        case 1: case 14: segs = [[W, N]]; break;
        case 2: case 13: segs = [[N, E]]; break;
        case 3: case 12: segs = [[W, E]]; break;
        case 4: case 11: segs = [[E, S]]; break;
        case 6: case 9: segs = [[N, S]]; break;
        case 7: case 8: segs = [[W, S]]; break;
        case 5: segs = center > 0 ? [[W, N], [E, S]] : [[N, E], [W, S]]; break;
        case 10: segs = center > 0 ? [[N, E], [W, S]] : [[W, N], [E, S]]; break;
        default: break;
      }
      for (const [a, b] of segs) {
        const [ax, ay] = a();
        const [bx, by] = b();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
      }
    }
  }
  ctx.stroke();
}

function drawGraph(ctx: CanvasRenderingContext2D, w: number, h: number, vp: Viewport, plots: GraphPlot[]) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  if (w === 0 || h === 0) return;

  const toPx = (x: number) => w / 2 + (x - vp.cx) * vp.scale;
  const toPy = (y: number) => h / 2 - (y - vp.cy) * vp.scale;
  const toMathX = (px: number) => (px - w / 2) / vp.scale + vp.cx;
  const toMathY = (py: number) => (h / 2 - py) / vp.scale + vp.cy;

  const step = niceNumber(70 / vp.scale);
  const xMinVis = toMathX(0), xMaxVis = toMathX(w);
  const yMinVis = toMathY(h), yMaxVis = toMathY(0);
  const startX = Math.ceil(xMinVis / step) * step;
  const startY = Math.ceil(yMinVis / step) * step;

  ctx.strokeStyle = "#e3e3e3";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gx = startX; gx <= xMaxVis; gx += step) {
    const px = Math.round(toPx(gx)) + 0.5;
    ctx.moveTo(px, 0); ctx.lineTo(px, h);
  }
  for (let gy = startY; gy <= yMaxVis; gy += step) {
    const py = Math.round(toPy(gy)) + 0.5;
    ctx.moveTo(0, py); ctx.lineTo(w, py);
  }
  ctx.stroke();

  const axisPxRaw = toPx(0), axisPyRaw = toPy(0);
  const axisPx = clamp(axisPxRaw, 0, w);
  const axisPy = clamp(axisPyRaw, 0, h);
  ctx.strokeStyle = "#9a9a9a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (axisPxRaw >= 0 && axisPxRaw <= w) { ctx.moveTo(axisPx, 0); ctx.lineTo(axisPx, h); }
  if (axisPyRaw >= 0 && axisPyRaw <= h) { ctx.moveTo(0, axisPy); ctx.lineTo(w, axisPy); }
  ctx.stroke();

  ctx.fillStyle = "#6b6b6b";
  ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
  for (let gx = startX; gx <= xMaxVis; gx += step) {
    if (Math.abs(gx) < step / 1000) continue;
    const labelY = clamp(axisPy + 4, 2, h - 14);
    ctx.fillText(formatTick(gx), clamp(toPx(gx) + 3, 0, w - 24), labelY);
  }
  for (let gy = startY; gy <= yMaxVis; gy += step) {
    if (Math.abs(gy) < step / 1000) continue;
    const labelX = clamp(axisPx + 3, 2, w - 26);
    ctx.fillText(formatTick(gy), labelX, clamp(toPy(gy) - 3, 11, h - 2));
  }

  for (const plot of plots) {
    ctx.strokeStyle = plot.color;
    ctx.lineWidth = 2.25;
    ctx.lineJoin = "round";
    if (plot.kind === "y" && plot.fnOfX) plotYOfX(ctx, w, h, toPy, toMathX, plot.fnOfX);
    else if (plot.kind === "x" && plot.fnOfY) plotXOfY(ctx, w, h, toPx, toMathY, plot.fnOfY);
    else if (plot.kind === "implicit" && plot.implicitF) plotImplicit(ctx, w, h, toMathX, toMathY, plot.implicitF);
  }
}

export default function SatCalculator({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"graphing" | "basic">("graphing");
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState(DEFAULT_SIZE);
  const dragState = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const resizeState = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const [rows, setRows] = useState<Row[]>(() => [{ id: "row-1", text: "" }]);
  const nextIdRef = useRef(2);

  const updateRowText = (id: string, text: string) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx === -1) return prev;
      const next = prev.slice();
      next[idx] = { ...next[idx], text, sliderValue: undefined };
      if (idx === next.length - 1 && text.trim() !== "") {
        next.push({ id: `row-${nextIdRef.current++}` , text: "" });
      }
      return next;
    });
  };
  const deleteRow = (id: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (next.length === 0 || next[next.length - 1].text.trim() !== "") {
        next.push({ id: `row-${nextIdRef.current++}`, text: "" });
      }
      return next;
    });
  };
  const toggleHidden = (id: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r)));
  const setSliderValue = (id: string, value: number) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, sliderValue: value } : r)));

  // The virtual keypad: inserts at the last-focused row's cursor (the
  // trailing blank row if nothing was focused yet), same as tapping on a
  // physical/on-screen keyboard would.
  const [showKeypad, setShowKeypad] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const targetRowId = () => activeRowId ?? rows[rows.length - 1]?.id ?? null;

  const focusAt = (id: string, pos: number) => {
    requestAnimationFrame(() => {
      const el = inputRefs.current.get(id);
      if (el) { el.focus(); el.setSelectionRange(pos, pos); }
    });
  };
  const pressKey = (key: Key) => {
    const id = targetRowId();
    const row = rows.find((r) => r.id === id);
    if (!id || !row) return;
    const input = inputRefs.current.get(id);
    const start = input?.selectionStart ?? row.text.length;
    const end = input?.selectionEnd ?? row.text.length;
    updateRowText(id, row.text.slice(0, start) + key.insert + row.text.slice(end));
    focusAt(id, start + (key.cursorOffset ?? key.insert.length));
  };
  const pressBackspace = () => {
    const id = targetRowId();
    const row = rows.find((r) => r.id === id);
    if (!id || !row) return;
    const input = inputRefs.current.get(id);
    const start = input?.selectionStart ?? row.text.length;
    const end = input?.selectionEnd ?? row.text.length;
    const [next, pos] = start !== end
      ? [row.text.slice(0, start) + row.text.slice(end), start]
      : start > 0 ? [row.text.slice(0, start - 1) + row.text.slice(start), start - 1] : [row.text, 0];
    updateRowText(id, next);
    focusAt(id, pos);
  };

  const rowList = useMemo(
    () => rows.map((r, i) => ({ id: r.id, text: r.text, color: PALETTE[i % PALETTE.length] })),
    [rows],
  );
  const sliderOverrides = useMemo(() => {
    const out: Record<string, number> = {};
    for (const r of rows) if (r.sliderValue !== undefined) out[r.id] = r.sliderValue;
    return out;
  }, [rows]);
  const graph = useMemo(() => buildGraph(rowList, sliderOverrides), [rowList, sliderOverrides]);
  const visiblePlots = useMemo(
    () => graph.plots.filter((p) => !rows.find((r) => r.id === p.id)?.hidden),
    [graph, rows],
  );

  const graphWrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  // 30px/unit is a reasonable default for the panel's default geometry (~17×13
  // units visible); the Home button refits to whatever the panel is sized to
  // right now, computed in its click handler rather than an initializing effect.
  const [viewport, setViewport] = useState<Viewport>({ cx: 0, cy: 0, scale: 30 });

  useEffect(() => {
    const el = graphWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setCanvasSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.w === 0 || canvasSize.h === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvasSize.w * dpr);
    canvas.height = Math.round(canvasSize.h * dpr);
    canvas.style.width = `${canvasSize.w}px`;
    canvas.style.height = `${canvasSize.h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawGraph(ctx, canvasSize.w, canvasSize.h, viewport, visiblePlots);
  }, [canvasSize, viewport, visiblePlots]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      setViewport((v) => {
        const factor = Math.exp(-e.deltaY * 0.0015);
        const newScale = clamp(v.scale * factor, 2, 4000);
        const mathX = (px - rect.width / 2) / v.scale + v.cx;
        const mathY = (rect.height / 2 - py) / v.scale + v.cy;
        return {
          scale: newScale,
          cx: mathX - (px - rect.width / 2) / newScale,
          cy: mathY - (rect.height / 2 - py) / newScale,
        };
      });
    };
    canvas.addEventListener("wheel", handler, { passive: false });
    return () => canvas.removeEventListener("wheel", handler);
  }, []);

  const panRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    panRef.current = { x: e.clientX, y: e.clientY, cx: viewport.cx, cy: viewport.cy };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!panRef.current) return;
    const { x, y, cx, cy } = panRef.current;
    const dx = e.clientX - x, dy = e.clientY - y;
    setViewport((v) => ({ ...v, cx: cx - dx / v.scale, cy: cy + dy / v.scale }));
  };
  const onCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    panRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const zoomBy = (factor: number) => setViewport((v) => ({ ...v, scale: clamp(v.scale * factor, 2, 4000) }));
  const resetView = () =>
    setViewport({ cx: 0, cy: 0, scale: Math.min(canvasSize.w, canvasSize.h) / 22 || 32 });

  const onDragDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const { x, y, ox, oy } = dragState.current;
    setOffset({ x: ox + (e.clientX - x), y: oy + (e.clientY - y) });
  };
  const onDragUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onResizeDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    resizeState.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeState.current) return;
    const { x, y, w, h } = resizeState.current;
    const maxW = window.innerWidth - 32;
    const maxH = window.innerHeight - 80;
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
      className="relative flex flex-col overflow-hidden rounded-m3-lg border border-outline-variant bg-surface-container-high shadow-elev-3"
      style={{ width: size.w, height: size.h, transform: `translate(${offset.x}px, ${offset.y}px)` }}
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
            <button
              type="button"
              onClick={() => setMode("basic")}
              aria-pressed={mode === "basic"}
              title="Basic calculator"
              className={cn("rounded-m3-xs p-1", mode === "basic" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-state-hover")}
            >
              <Calculator size={14} />
            </button>
            <button
              type="button"
              onClick={() => setMode("graphing")}
              aria-pressed={mode === "graphing"}
              title="Graphing calculator"
              className={cn("rounded-m3-xs p-1", mode === "graphing" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-state-hover")}
            >
              <LineChart size={14} />
            </button>
          </span>
          {mode === "graphing" && (
            <button
              type="button"
              onClick={() => setShowKeypad((v) => !v)}
              aria-pressed={showKeypad}
              aria-label="Toggle keypad"
              className={cn("rounded-m3-xs p-1 hover:bg-state-hover", showKeypad ? "text-primary" : "text-on-surface-variant")}
            >
              <Keyboard size={16} />
            </button>
          )}
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

      {/* Both modes stay MOUNTED, only hidden via CSS — the graphing side owns a
          canvas + a ResizeObserver + a native wheel listener set up by effects
          that only run once; unmounting/remounting it on every mode switch left
          the new canvas never observed/sized/drawn (blank grid after a round
          trip through Basic). Hiding instead of unmounting also keeps the pan/
          zoom position and the Basic display across a mode switch, for free. */}
      <div className={cn("flex min-h-0 flex-1", mode !== "basic" && "hidden")}>
        <SatBasicCalculator />
      </div>

      <div className={cn("flex min-h-0 flex-1", mode !== "graphing" && "hidden")}>
        <aside className="flex w-[42%] min-w-[150px] max-w-[220px] shrink-0 flex-col overflow-y-auto border-r border-outline-variant bg-surface-container-highest/40">
          {rows.map((row, idx) => {
            const result = graph.rows[row.id];
            const dotColor = result && (result.kind === "plot" || result.kind === "function") ? PALETTE[idx % PALETTE.length] : undefined;
            return (
              <div key={row.id}>
                <div className="group flex items-center gap-1.5 border-b border-outline-variant/50 px-2 py-1.5">
                  {result?.kind === "error" ? (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-error" title={result.message} />
                  ) : dotColor ? (
                    <button
                      type="button"
                      onClick={() => toggleHidden(row.id)}
                      aria-label={row.hidden ? "Show expression" : "Hide expression"}
                      className="h-2.5 w-2.5 shrink-0 rounded-full border-2"
                      style={{ backgroundColor: row.hidden ? "transparent" : dotColor, borderColor: dotColor }}
                    />
                  ) : (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-outline-variant/40" />
                  )}
                  <input
                    ref={(el) => {
                      if (el) inputRefs.current.set(row.id, el);
                      else inputRefs.current.delete(row.id);
                    }}
                    value={row.text}
                    onChange={(e) => updateRowText(row.id, e.target.value)}
                    onFocus={() => setActiveRowId(row.id)}
                    placeholder={idx === rows.length - 1 ? "Add an expression" : undefined}
                    spellCheck={false}
                    className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-on-surface outline-none placeholder:text-on-surface-variant/50"
                  />
                  {row.text.trim() !== "" && (
                    <button
                      type="button"
                      onClick={() => deleteRow(row.id)}
                      aria-label="Delete expression"
                      className="shrink-0 rounded p-0.5 text-on-surface-variant opacity-0 hover:bg-state-hover group-hover:opacity-100"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                {result?.kind === "value" && (
                  <div className="border-b border-outline-variant/50 px-2 py-1 text-[11px] text-on-surface-variant">
                    = {formatTick(result.value)}
                  </div>
                )}
                {result?.kind === "slider" && (
                  <div className="flex items-center gap-2 border-b border-outline-variant/50 px-2 py-1.5">
                    <Slider
                      label={result.name}
                      min={sliderRange(result.defaultValue)[0]}
                      max={sliderRange(result.defaultValue)[1]}
                      step={0.1}
                      value={row.sliderValue ?? result.defaultValue}
                      onChange={(e) => setSliderValue(row.id, Number(e.target.value))}
                      className="h-1.5 flex-1"
                    />
                    <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-on-surface-variant">
                      {(row.sliderValue ?? result.defaultValue).toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </aside>

        <div ref={graphWrapRef} className="relative min-w-0 flex-1 overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing"
          />
          <div className="absolute bottom-2 right-2 flex flex-col overflow-hidden rounded-m3-sm border border-outline-variant bg-surface shadow-elev-1">
            <button type="button" onClick={() => zoomBy(1.3)} aria-label="Zoom in" className="p-1.5 text-on-surface-variant hover:bg-state-hover">
              <Plus size={14} />
            </button>
            <button type="button" onClick={() => zoomBy(1 / 1.3)} aria-label="Zoom out" className="border-t border-outline-variant p-1.5 text-on-surface-variant hover:bg-state-hover">
              <Minus size={14} />
            </button>
            <button type="button" onClick={resetView} aria-label="Reset view" className="border-t border-outline-variant p-1.5 text-on-surface-variant hover:bg-state-hover">
              <Home size={14} />
            </button>
          </div>
        </div>
      </div>

      {mode === "graphing" && showKeypad && (
        <div className="shrink-0 border-t border-outline-variant bg-surface-container px-2 py-1.5">
          <div className="mb-1 flex justify-end">
            <button
              type="button"
              onClick={pressBackspace}
              aria-label="Backspace"
              className="flex items-center gap-1 rounded-m3-xs px-2 py-1 text-[11px] font-bold text-on-surface-variant hover:bg-state-hover"
            >
              <Delete size={13} /> Backspace
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {KEYPAD.map((k) => (
              <button
                key={k.label}
                type="button"
                onClick={() => pressKey(k)}
                className="rounded-m3-xs bg-surface-container-lowest py-1.5 text-[12.5px] font-bold text-on-surface hover:bg-state-hover"
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
      )}

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

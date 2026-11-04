"use client";

import { useState } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/components/student-ui";

/**
 * "Basic" mode of the SAT runner's calculator — a classic four-function
 * calculator, alongside the "Graphing" mode (SatCalculator.tsx, which hosts
 * this as a mode toggle). Classic value+pending-operator state machine, NOT a
 * string expression evaluator — no `eval`/`Function` on anything resembling
 * user input. docs/SAT_QUIZ.md.
 */

type Op = "+" | "−" | "×" | "÷" | null;

export default function SatBasicCalculator() {
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [op, setOp] = useState<Op>(null);
  const [fresh, setFresh] = useState(true);

  const inputDigit = (d: string) => {
    setDisplay((prev) => {
      if (fresh) return d === "." ? "0." : d;
      if (d === "." && prev.includes(".")) return prev;
      if (prev === "0" && d !== ".") return d;
      return prev + d;
    });
    setFresh(false);
  };

  const compute = (a: number, b: number, operator: Op): number => {
    switch (operator) {
      case "+": return a + b;
      case "−": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? NaN : a / b;
      default: return b;
    }
  };

  const applyOp = (next: Op) => {
    const current = Number(display);
    if (stored !== null && op && !fresh) {
      const result = compute(stored, current, op);
      setDisplay(Number.isFinite(result) ? String(Math.round(result * 1e10) / 1e10) : "Error");
      setStored(Number.isFinite(result) ? result : null);
    } else {
      setStored(current);
    }
    setOp(next);
    setFresh(true);
  };

  const equals = () => { applyOp(null); setOp(null); };
  const clear = () => { setDisplay("0"); setStored(null); setOp(null); setFresh(true); };
  const toggleSign = () => setDisplay((prev) => (prev.startsWith("-") ? prev.slice(1) : prev === "0" ? prev : `-${prev}`));
  const percent = () => setDisplay((prev) => String(Number(prev) / 100));
  const sqrt = () => setDisplay((prev) => {
    const n = Number(prev);
    return n < 0 ? "Error" : String(Math.sqrt(n));
  });
  const backspace = () => setDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));

  const KEYS: Array<{ label: string; onPress: () => void; tone?: "op" | "fn" }> = [
    { label: "C", onPress: clear, tone: "fn" },
    { label: "√", onPress: sqrt, tone: "fn" },
    { label: "%", onPress: percent, tone: "fn" },
    { label: "÷", onPress: () => applyOp("÷"), tone: "op" },
    { label: "7", onPress: () => inputDigit("7") },
    { label: "8", onPress: () => inputDigit("8") },
    { label: "9", onPress: () => inputDigit("9") },
    { label: "×", onPress: () => applyOp("×"), tone: "op" },
    { label: "4", onPress: () => inputDigit("4") },
    { label: "5", onPress: () => inputDigit("5") },
    { label: "6", onPress: () => inputDigit("6") },
    { label: "−", onPress: () => applyOp("−"), tone: "op" },
    { label: "1", onPress: () => inputDigit("1") },
    { label: "2", onPress: () => inputDigit("2") },
    { label: "3", onPress: () => inputDigit("3") },
    { label: "+", onPress: () => applyOp("+"), tone: "op" },
    { label: "±", onPress: toggleSign },
    { label: "0", onPress: () => inputDigit("0") },
    { label: ".", onPress: () => inputDigit(".") },
    { label: "=", onPress: equals, tone: "op" },
  ];

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto bg-surface-container-highest/40 p-4">
      <div className="w-full max-w-[260px]">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">Basic</span>
          <button
            type="button"
            onClick={backspace}
            aria-label="Backspace"
            className="rounded-m3-xs p-1 text-on-surface-variant hover:bg-state-hover"
          >
            <Delete size={14} />
          </button>
        </div>
        <div className="mb-3 truncate rounded-m3-md bg-surface px-3 py-3 text-right text-[26px] font-black tabular-nums text-on-surface">
          {display}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {KEYS.map((k) => (
            <button
              key={k.label}
              type="button"
              onClick={k.onPress}
              className={cn(
                "rounded-m3-sm py-3 text-[15px] font-bold transition-colors",
                k.tone === "op" ? "bg-primary text-on-primary hover:opacity-90"
                  : k.tone === "fn" ? "bg-surface-container text-on-surface-variant hover:bg-surface-container-lowest"
                  : "bg-surface-container-lowest text-on-surface hover:bg-surface-container",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

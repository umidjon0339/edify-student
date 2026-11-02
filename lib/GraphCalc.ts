/**
 * Pure math engine for a self-built Desmos-style graphing calculator — no
 * `eval`/`Function` on anything resembling user input, ever. Used by
 * app/(student)/sat/_components/SatCalculator.tsx (docs/SAT_QUIZ.md).
 *
 * Pipeline: tokenize -> parse (recursive descent, implicit multiplication) ->
 * classify (one call line into a slider / named function / explicit y=f(x) or
 * x=g(y) / implicit equation / bare numeric value) -> evaluate (interpreter
 * over the AST, no code generation).
 */

export type Node =
  | { t: "num"; v: number }
  | { t: "var"; name: string }
  | { t: "neg"; a: Node }
  | { t: "bin"; op: "+" | "-" | "*" | "/" | "^"; a: Node; b: Node }
  | { t: "call"; name: string; args: Node[] };

export type ParsedRow =
  | { kind: "equation"; left: Node; right: Node }
  | { kind: "expr"; node: Node };

type Token =
  | { type: "num"; value: number }
  | { type: "ident"; value: string }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "lparen" | "rparen" | "comma" | "eq" };

const FUNCTION_NAMES = new Set([
  "sin", "cos", "tan", "asin", "acos", "atan",
  "sinh", "cosh", "tanh", "sqrt", "abs", "ln", "log", "exp",
  "floor", "ceil", "round", "sign", "min", "max", "mod",
]);
const CONSTANT_NAMES = new Set(["pi", "e"]);
const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

export const BUILTINS: Record<string, (...args: number[]) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  sqrt: (x) => (x < 0 ? NaN : Math.sqrt(x)),
  abs: Math.abs,
  ln: (x) => (x <= 0 ? NaN : Math.log(x)),
  log: (x) => (x <= 0 ? NaN : Math.log10(x)),
  exp: Math.exp,
  floor: Math.floor, ceil: Math.ceil, round: Math.round,
  sign: Math.sign,
  min: (...xs) => Math.min(...xs),
  max: (...xs) => Math.max(...xs),
  mod: (a, b) => a % b,
};

/** Known multi-letter names (functions, constants, plus caller-supplied slider/function names) are
 * tokenized whole; any other letter run is split into single-letter variables, implicitly multiplied
 * (so "xy" tokenizes as x, y — matching how Desmos reads an unrecognized multi-letter run). */
function tokenize(input: string, knownNames: ReadonlySet<string>): Token[] {
  const tokens: Token[] = [];
  const s = input.replace(/\s+/g, "");
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let j = i;
      let seenDot = false;
      while (j < s.length && (/[0-9]/.test(s[j]) || (s[j] === "." && !seenDot))) {
        if (s[j] === ".") seenDot = true;
        j++;
      }
      const raw = s.slice(i, j);
      if (raw === "." || raw === "") throw new Error("Bad number");
      tokens.push({ type: "num", value: parseFloat(raw) });
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z0-9]/.test(s[j])) j++;
      const run = s.slice(i, j);
      let k = 0;
      while (k < run.length) {
        let matched = "";
        for (let len = run.length - k; len >= 1; len--) {
          const candidate = run.slice(k, k + len);
          if (len === 1) {
            if (CONSTANT_NAMES.has(candidate)) { matched = candidate; break; }
            continue;
          }
          if (FUNCTION_NAMES.has(candidate) || CONSTANT_NAMES.has(candidate) || knownNames.has(candidate)) {
            matched = candidate;
            break;
          }
        }
        if (!matched) matched = run[k];
        tokens.push({ type: "ident", value: matched });
        k += matched.length;
      }
      i = j;
      continue;
    }
    if (c === "(") { tokens.push({ type: "lparen" }); i++; continue; }
    if (c === ")") { tokens.push({ type: "rparen" }); i++; continue; }
    if (c === ",") { tokens.push({ type: "comma" }); i++; continue; }
    if (c === "=") { tokens.push({ type: "eq" }); i++; continue; }
    if (c === "+" || c === "-" || c === "*" || c === "/" || c === "^") {
      tokens.push({ type: "op", value: c });
      i++;
      continue;
    }
    throw new Error(`Unexpected character "${c}"`);
  }
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private eat(): Token {
    const tok = this.tokens[this.pos];
    if (!tok) throw new Error("Unexpected end of input");
    this.pos++;
    return tok;
  }

  parseRow(): ParsedRow {
    const left = this.parseAddSub();
    if (this.peek()?.type === "eq") {
      this.eat();
      const right = this.parseAddSub();
      if (this.pos !== this.tokens.length) throw new Error("Unexpected token after equation");
      return { kind: "equation", left, right };
    }
    if (this.pos !== this.tokens.length) throw new Error("Unexpected token");
    return { kind: "expr", node: left };
  }

  private parseAddSub(): Node {
    let node = this.parseMulDiv();
    for (;;) {
      const tok = this.peek();
      if (tok?.type === "op" && (tok.value === "+" || tok.value === "-")) {
        this.eat();
        node = { t: "bin", op: tok.value, a: node, b: this.parseMulDiv() };
      } else break;
    }
    return node;
  }

  private canStartFactor(tok: Token | undefined): boolean {
    return !!tok && (tok.type === "num" || tok.type === "ident" || tok.type === "lparen");
  }

  private parseMulDiv(): Node {
    let node = this.parseUnary();
    for (;;) {
      const tok = this.peek();
      if (tok?.type === "op" && (tok.value === "*" || tok.value === "/")) {
        this.eat();
        node = { t: "bin", op: tok.value, a: node, b: this.parseUnary() };
      } else if (this.canStartFactor(tok)) {
        node = { t: "bin", op: "*", a: node, b: this.parseUnary() };
      } else break;
    }
    return node;
  }

  private parseUnary(): Node {
    const tok = this.peek();
    if (tok?.type === "op" && tok.value === "-") { this.eat(); return { t: "neg", a: this.parseUnary() }; }
    if (tok?.type === "op" && tok.value === "+") { this.eat(); return this.parseUnary(); }
    return this.parsePow();
  }

  private parsePow(): Node {
    const base = this.parsePrimary();
    const tok = this.peek();
    if (tok?.type === "op" && tok.value === "^") {
      this.eat();
      return { t: "bin", op: "^", a: base, b: this.parseUnary() };
    }
    return base;
  }

  private parsePrimary(): Node {
    const tok = this.peek();
    if (!tok) throw new Error("Unexpected end of input");
    if (tok.type === "num") { this.eat(); return { t: "num", v: tok.value }; }
    if (tok.type === "lparen") {
      this.eat();
      const node = this.parseAddSub();
      if (this.peek()?.type !== "rparen") throw new Error("Expected )");
      this.eat();
      return node;
    }
    if (tok.type === "ident") {
      this.eat();
      const name = tok.value;
      if (this.peek()?.type === "lparen") {
        this.eat();
        const args: Node[] = [];
        if (this.peek()?.type !== "rparen") {
          args.push(this.parseAddSub());
          while (this.peek()?.type === "comma") { this.eat(); args.push(this.parseAddSub()); }
        }
        if (this.peek()?.type !== "rparen") throw new Error("Expected )");
        this.eat();
        return { t: "call", name, args };
      }
      return { t: "var", name };
    }
    throw new Error("Unexpected token");
  }
}

export function parseRow(text: string, knownNames: ReadonlySet<string>): ParsedRow {
  const tokens = tokenize(text, knownNames);
  if (tokens.length === 0) throw new Error("Empty");
  const parser = new Parser(tokens);
  return parser.parseRow();
}

export type Scope = Record<string, number>;
export type Funcs = Record<string, { param: string; body: Node }>;

export function evaluate(node: Node, scope: Scope, funcs: Funcs): number {
  switch (node.t) {
    case "num": return node.v;
    case "var": {
      if (node.name in scope) return scope[node.name];
      if (node.name in CONSTANTS) return CONSTANTS[node.name];
      return NaN;
    }
    case "neg": return -evaluate(node.a, scope, funcs);
    case "bin": {
      const a = evaluate(node.a, scope, funcs);
      const b = evaluate(node.b, scope, funcs);
      switch (node.op) {
        case "+": return a + b;
        case "-": return a - b;
        case "*": return a * b;
        case "/": return b === 0 ? NaN : a / b;
        case "^": return Math.pow(a, b);
      }
    }
    case "call": {
      const args = node.args.map((a) => evaluate(a, scope, funcs));
      const builtin = BUILTINS[node.name];
      if (builtin) return builtin(...args);
      const fn = funcs[node.name];
      if (fn) return evaluate(fn.body, { ...scope, [fn.param]: args[0] }, funcs);
      return NaN;
    }
  }
}

function containsVar(node: Node, name: string): boolean {
  switch (node.t) {
    case "num": return false;
    case "var": return node.name === name;
    case "neg": return containsVar(node.a, name);
    case "bin": return containsVar(node.a, name) || containsVar(node.b, name);
    case "call": return node.args.some((a) => containsVar(a, name));
  }
}

const isBareVar = (node: Node, name: string): boolean => node.t === "var" && node.name === name;

export type GraphPlot = {
  id: string;
  color: string;
  kind: "y" | "x" | "implicit";
  fnOfX?: (x: number) => number;
  fnOfY?: (y: number) => number;
  implicitF?: (x: number, y: number) => number;
};

export type GraphRowResult =
  | { kind: "slider"; name: string; defaultValue: number }
  | { kind: "function" }
  | { kind: "plot" }
  | { kind: "value"; value: number }
  | { kind: "empty" }
  | { kind: "error"; message: string };

export type GraphBuild = {
  rows: Record<string, GraphRowResult>;
  plots: GraphPlot[];
  scope: Scope;
};

const RESERVED = new Set(["x", "y"]);

/**
 * Classifies every expression-list row and builds the final evaluator scope in two
 * passes so rows can reference sliders/functions defined in a LATER row (matches
 * Desmos: order in the list doesn't gate what a row can reference).
 * `sliderOverrides` wins over a row's own parsed default — that's how a dragged
 * slider's live value reaches every other row without re-parsing the row text.
 */
export function buildGraph(
  rowList: Array<{ id: string; text: string; color: string }>,
  sliderOverrides: Record<string, number>,
): GraphBuild {
  const parsed: Record<string, { ast: ParsedRow } | { error: string } | null> = {};

  // Pass 1: which names are user-defined (functions + sliders) so the tokenizer
  // treats e.g. "foo" as one identifier, and later rows can call/reference it.
  const knownNames = new Set<string>();
  for (const row of rowList) {
    const text = row.text.trim();
    if (!text) continue;
    const funcDefMatch = text.match(/^([a-zA-Z]\w*)\(\s*([a-zA-Z])\s*\)\s*=/);
    if (funcDefMatch) { knownNames.add(funcDefMatch[1]); continue; }
    // Single letter only — "ty = 1/3 + 2x" must stay t*y (implicit multiplication),
    // not be misread as a slider literally named "ty"; `\w*` here would swallow it.
    const sliderMatch = text.match(/^([a-zA-Z])\s*=/);
    if (sliderMatch && !RESERVED.has(sliderMatch[1])) knownNames.add(sliderMatch[1]);
  }

  for (const row of rowList) {
    const text = row.text.trim();
    if (!text) { parsed[row.id] = null; continue; }
    try {
      parsed[row.id] = { ast: parseRow(text, knownNames) };
    } catch (e) {
      parsed[row.id] = { error: e instanceof Error ? e.message : "Parse error" };
    }
  }

  // Pass 2: collect function definitions.
  const funcs: Funcs = {};
  for (const row of rowList) {
    const p = parsed[row.id];
    if (!p || "error" in p) continue;
    const { ast } = p;
    if (ast.kind === "equation" && ast.left.t === "call" && ast.left.args.length === 1 && ast.left.args[0].t === "var") {
      funcs[ast.left.name] = { param: ast.left.args[0].name, body: ast.right };
    }
  }

  // Pass 3: collect sliders — a few iterative passes so a slider may reference
  // another slider defined earlier OR later in the list.
  const scope: Scope = {};
  const sliderRows = rowList.filter((row) => {
    const p = parsed[row.id];
    if (!p || "error" in p) return false;
    const { ast } = p;
    return (
      ast.kind === "equation" &&
      ast.left.t === "var" &&
      !RESERVED.has(ast.left.name) &&
      !(ast.left.name in funcs) &&
      !containsVar(ast.right, "x") &&
      !containsVar(ast.right, "y")
    );
  });
  for (let pass = 0; pass < 4; pass++) {
    for (const row of sliderRows) {
      const p = parsed[row.id];
      if (!p || "error" in p || p.ast.kind !== "equation" || p.ast.left.t !== "var") continue;
      const value = row.id in sliderOverrides
        ? sliderOverrides[row.id]
        : evaluate(p.ast.right, scope, funcs);
      if (Number.isFinite(value)) scope[p.ast.left.name] = value;
    }
  }

  // Pass 4: classify every row for the UI, and build plots for graphable rows.
  const results: Record<string, GraphRowResult> = {};
  const plots: GraphPlot[] = [];
  const sliderIds = new Set(sliderRows.map((r) => r.id));

  for (const row of rowList) {
    const text = row.text.trim();
    const p = parsed[row.id];
    if (!text || !p) { results[row.id] = { kind: "empty" }; continue; }
    if ("error" in p) { results[row.id] = { kind: "error", message: p.error }; continue; }
    const { ast } = p;

    if (sliderIds.has(row.id) && ast.kind === "equation" && ast.left.t === "var") {
      const defaultValue = row.id in sliderOverrides ? sliderOverrides[row.id] : evaluate(ast.right, scope, funcs);
      results[row.id] = { kind: "slider", name: ast.left.name, defaultValue: Number.isFinite(defaultValue) ? defaultValue : 0 };
      continue;
    }

    if (ast.kind === "equation" && ast.left.t === "call" && ast.left.args.length === 1 && ast.left.args[0].t === "var") {
      results[row.id] = { kind: "function" };
      const param = ast.left.args[0].name;
      plots.push({
        id: row.id, color: row.color, kind: "y",
        fnOfX: (x) => evaluate(ast.right, { ...scope, [param]: x }, funcs),
      });
      continue;
    }

    if (ast.kind === "equation") {
      results[row.id] = { kind: "plot" };
      if (isBareVar(ast.left, "y") && !containsVar(ast.right, "y")) {
        plots.push({ id: row.id, color: row.color, kind: "y", fnOfX: (x) => evaluate(ast.right, { ...scope, x }, funcs) });
      } else if (isBareVar(ast.right, "y") && !containsVar(ast.left, "y")) {
        plots.push({ id: row.id, color: row.color, kind: "y", fnOfX: (x) => evaluate(ast.left, { ...scope, x }, funcs) });
      } else if (isBareVar(ast.left, "x") && !containsVar(ast.right, "x")) {
        plots.push({ id: row.id, color: row.color, kind: "x", fnOfY: (y) => evaluate(ast.right, { ...scope, y }, funcs) });
      } else if (isBareVar(ast.right, "x") && !containsVar(ast.left, "x")) {
        plots.push({ id: row.id, color: row.color, kind: "x", fnOfY: (y) => evaluate(ast.left, { ...scope, y }, funcs) });
      } else {
        plots.push({
          id: row.id, color: row.color, kind: "implicit",
          implicitF: (x, y) => evaluate(ast.left, { ...scope, x, y }, funcs) - evaluate(ast.right, { ...scope, x, y }, funcs),
        });
      }
      continue;
    }

    // Bare expression, no "=": graphed only if it still depends on x or y
    // (then it's an implicit "expr - 0 = 0"); otherwise it's just a value.
    if (containsVar(ast.node, "x") || containsVar(ast.node, "y")) {
      results[row.id] = { kind: "plot" };
      if (!containsVar(ast.node, "y")) {
        plots.push({ id: row.id, color: row.color, kind: "y", fnOfX: (x) => evaluate(ast.node, { ...scope, x }, funcs) });
      } else {
        plots.push({
          id: row.id, color: row.color, kind: "implicit",
          implicitF: (x, y) => evaluate(ast.node, { ...scope, x, y }, funcs),
        });
      }
    } else {
      const value = evaluate(ast.node, scope, funcs);
      results[row.id] = { kind: "value", value };
    }
  }

  return { rows: results, plots, scope };
}

/** Rounds `rough` to the nearest "nice" 1/2/5 × 10^n — used for gridline spacing. */
export function niceNumber(rough: number): number {
  if (!Number.isFinite(rough) || rough <= 0) return 1;
  const exp = Math.floor(Math.log10(rough));
  const base = rough / Math.pow(10, exp);
  const niceBase = base < 1.5 ? 1 : base < 3.5 ? 2 : base < 7.5 ? 5 : 10;
  return niceBase * Math.pow(10, exp);
}

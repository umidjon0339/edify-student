// lib/questions1Schema.ts
/**
 * The authoring contract for the `questions1` bank — the abiturient Algebra +
 * Geometriya questions (docs/DATA_MODEL.md, docs/ADMIN.md "Question bank").
 * One pure module shared by the admin page (form + JSON import) and
 * `/api/admin/questions1`, so the browser and the server agree on what a
 * valid question is.
 *
 *   coerceQuestion1(raw)    lenient: a JSON item / stored doc → draft + auto-fixes + issues
 *   checkQuestion1(draft)   strict: what a draft must pass to be saved
 *   questions1Content(d)    the content fields of the stored doc (ids + names + text)
 *   parseQuestions1Json(t)  a whole import file → one Q1Check per question
 *
 * Auto-fixes are deterministic (no AI) and always reported, never silent. A
 * missing translation is never invented — only a language-neutral value (a
 * number or a formula) is copied across languages. The server adds rand /
 * uploadedAt / number / subject itself.
 */
import { canonicalizeRow, expandQuestionGroups, findQuestionList } from '@/lib/importAliases';
import { getMathTopics, padId } from '@/lib/Mathstructure';
import { fixMath } from '@/lib/ai/fixMath';
import type { DifficultyKey, LocalizedText, OptionKey } from '@/types/Math';

export const Q1_LANGS = ['uz', 'ru', 'en'] as const;
export type Q1Lang = (typeof Q1_LANGS)[number];
export const Q1_LANG_LABEL: Record<Q1Lang, string> = { uz: 'UZ', ru: 'RU', en: 'EN' };

export const Q1_OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

export type Q1DifficultyId = 1 | 2 | 3;
export const Q1_DIFFICULTIES: { id: Q1DifficultyId; key: DifficultyKey; label: string }[] = [
  { id: 1, key: 'easy', label: 'Easy' },
  { id: 2, key: 'medium', label: 'Medium' },
  { id: 3, key: 'hard', label: 'Hard' },
];

/** Algebra ("1") and Geometriya ("2") from data/syllabus.json — bundled, zero reads. */
export const Q1_TREE = getMathTopics();

/** One import request / one Firestore batch stays well under the 500-write cap. */
export const Q1_MAX_PER_REQUEST = 200;
export const Q1_MAX_PER_FILE = 1000;

export interface Q1Solution {
  final_answer: string;
  method: string;
  steps: string[];
}

/** What the admin authors. Ids use the questions1 encoding (topicId unpadded, the rest padded). */
export interface Q1Draft {
  topicId: string;
  chapterId: string;
  subtopicId: string;
  /** 0 = not chosen yet. */
  difficultyId: Q1DifficultyId | 0;
  question: LocalizedText;
  options: Record<OptionKey, LocalizedText>;
  answer: OptionKey | '';
  explanation: LocalizedText;
  /** Stored as `solutions: [this]` — the legacy single-language shape every reader expects. */
  solution: Q1Solution;
}

export interface Q1Issue {
  /** Dotted path into the draft: `question.ru`, `options.B.en`, `answer`, `location`… */
  path: string;
  message: string;
  lang?: Q1Lang;
}

export interface Q1Check {
  draft: Q1Draft;
  errors: Q1Issue[];
  warnings: Q1Issue[];
  fixes: Q1Issue[];
}

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => !!v && typeof v === 'object' && !Array.isArray(v);

export const emptyL10n = (): LocalizedText => ({ uz: '', ru: '', en: '' });

export function emptyQuestion1(
  loc: Partial<Pick<Q1Draft, 'topicId' | 'chapterId' | 'subtopicId' | 'difficultyId'>> = {},
): Q1Draft {
  return {
    topicId: loc.topicId ?? '',
    chapterId: loc.chapterId ?? '',
    subtopicId: loc.subtopicId ?? '',
    difficultyId: loc.difficultyId ?? 0,
    question: emptyL10n(),
    options: { A: emptyL10n(), B: emptyL10n(), C: emptyL10n(), D: emptyL10n() },
    answer: '',
    explanation: emptyL10n(),
    solution: { final_answer: '', method: '', steps: [] },
  };
}

export function locateQuestion1(d: Pick<Q1Draft, 'topicId' | 'chapterId' | 'subtopicId'>) {
  const topic = Q1_TREE.find((t) => t.topicId === d.topicId);
  const chapter = topic?.chapters.find((c) => c.chapterId === d.chapterId);
  const subtopic = chapter?.subtopics.find((s) => s.subtopicId === d.subtopicId);
  return topic && chapter && subtopic ? { topic, chapter, subtopic } : null;
}

// ─── text helpers ───────────────────────────────────────────────────────────

/** Case, apostrophe and whitespace-insensitive comparison key. */
const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ’‘`']/g, "'").replace(/\s+/g, ' ').trim();

/** Unescaped `$` signs — an odd count leaves KaTeX an unclosed formula. */
const dollarCount = (s: string) => (s.match(/(?<!\\)\$/g) || []).length;

const MATH_SEGMENTS = /\$\$[\s\S]*?\$\$|\$[^$]*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g;

/** A LaTeX command outside `$…$` renders as raw text. */
const hasBareLatex = (s: string) => /\\[a-zA-Z]+/.test(s.replace(MATH_SEGMENTS, ''));

const MATH_WORDS = /\b(?:sin|cos|tg|ctg|tan|cot|log|ln|lg|arcsin|arccos|arctg|arcctg|sqrt|max|min|lim)\b/gi;

/** A number or a formula reads the same in uz/ru/en, so it may be copied across. */
export function isLanguageNeutral(s: string): boolean {
  const outside = s.replace(MATH_SEGMENTS, ' ').replace(/\\[a-zA-Z]+/g, ' ').replace(MATH_WORDS, ' ');
  return !/\p{L}{2,}/u.test(outside);
}

/** JSON escapes that ate a LaTeX backslash: "\frac" parses as form-feed + "rac". */
function repairEatenEscapes(s: string): string {
  return s
    .replace(/\f/g, '\\f')
    .replace(/\u0008/g, '\\b')
    .replace(/\t(?=[a-zA-Z])/g, '\\t')
    .replace(/\r(?=[a-zA-Z])/g, '\\r')
    .replace(/\n(?=(?:eq|abla|otin|mid)(?![a-zA-Z]))/g, '\\n');
}

// ─── strict check ───────────────────────────────────────────────────────────

/** The rules a draft must pass to be saved. Shared by the form, the import and the API. */
export function checkQuestion1(d: Q1Draft): { errors: Q1Issue[]; warnings: Q1Issue[] } {
  const errors: Q1Issue[] = [];
  const warnings: Q1Issue[] = [];

  if (!Q1_TREE.some((t) => t.topicId === d.topicId)) {
    errors.push({ path: 'location', message: 'Choose Algebra or Geometriya' });
  } else if (!locateQuestion1(d)) {
    errors.push({ path: 'location', message: 'Choose a chapter and a subtopic from the syllabus' });
  }
  if (!Q1_DIFFICULTIES.some((x) => x.id === d.difficultyId)) {
    errors.push({ path: 'difficultyId', message: 'Choose a difficulty (easy / medium / hard)' });
  }

  const text = (path: string, label: string, v: LocalizedText, required: boolean) => {
    for (const lang of Q1_LANGS) {
      const s = v[lang];
      if (!s.trim()) {
        if (required) errors.push({ path: `${path}.${lang}`, lang, message: `${label} is empty` });
        continue;
      }
      if (dollarCount(s) % 2) {
        errors.push({ path: `${path}.${lang}`, lang, message: `${label}: a $ … $ formula is not closed` });
      } else if (hasBareLatex(s)) {
        warnings.push({ path: `${path}.${lang}`, lang, message: `${label}: LaTeX outside $ … $ shows as raw text` });
      }
    }
  };

  text('question', 'Question', d.question, true);
  for (const k of Q1_OPTION_KEYS) text(`options.${k}`, `Option ${k}`, d.options[k], true);

  const hasExplanation = Q1_LANGS.some((l) => d.explanation[l].trim());
  if (!hasExplanation) {
    warnings.push({ path: 'explanation', message: 'No explanation — students only see the correct letter' });
  }
  text('explanation', 'Explanation', d.explanation, hasExplanation);

  if (!Q1_OPTION_KEYS.includes(d.answer as OptionKey)) {
    errors.push({ path: 'answer', message: 'Mark the correct option (A–D)' });
  }

  const pairs = new Set<string>();
  for (const lang of Q1_LANGS) {
    const seen = new Map<string, OptionKey>();
    for (const k of Q1_OPTION_KEYS) {
      const s = norm(d.options[k][lang]);
      if (!s) continue;
      const prev = seen.get(s);
      if (!prev) { seen.set(s, k); continue; }
      if (pairs.has(prev + k)) continue;
      pairs.add(prev + k);
      warnings.push({ path: `options.${k}.${lang}`, lang, message: `Options ${prev} and ${k} are identical` });
    }
  }

  if (dollarCount(d.solution.final_answer) % 2) {
    errors.push({ path: 'solution.final_answer', message: 'Final answer: a $ … $ formula is not closed' });
  }

  return { errors, warnings };
}

// ─── lenient coercion ───────────────────────────────────────────────────────

const LANG_ALIASES: Record<string, Q1Lang> = {
  uz: 'uz', oz: 'uz', uzb: 'uz', "o'z": 'uz',
  ru: 'ru', rus: 'ru',
  en: 'en', eng: 'en',
};

const DIFFICULTY_ALIASES: Record<string, Q1DifficultyId> = {
  '1': 1, easy: 1, oson: 1, yengil: 1, 'легкий': 1, 'лёгкий': 1, 'легко': 1,
  '2': 2, medium: 2, "o'rta": 2, orta: 2, 'средний': 2,
  '3': 3, hard: 3, qiyin: 3, murakkab: 3, 'сложный': 3,
};

/** Written by the server or the offline calibration — an import must not set them. */
const SERVER_FIELDS = new Set([
  'id', 'rand', 'uploadedAt', 'number', 'b', 'rpb', 'responses', 'suspect',
  'addedBy', 'source', 'editedAt', 'editedBy', 'subjectId', 'subject', 'tags', 'language',
]);
const KNOWN_FIELDS = new Set([
  'topicId', 'topic', 'category', 'chapterId', 'chapter', 'subtopicId', 'subtopic',
  'difficultyId', 'difficulty', 'question', 'options', 'answer', 'correct', 'correctAnswer',
  'explanation', 'solution', 'solutions',
]);

const TOPIC_KEYS = ['topicId', 'topic', 'category'];
const CHAPTER_KEYS = ['chapterId', 'chapter'];
const SUBTOPIC_KEYS = ['subtopicId', 'subtopic'];
const DIFFICULTY_KEYS = ['difficultyId', 'difficulty'];

interface Ctx { errors: Q1Issue[]; warnings: Q1Issue[]; fixes: Q1Issue[] }

const pick = (raw: Raw, keys: string[]): unknown => {
  for (const k of keys) {
    const v = raw[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
};

function cleanText(
  raw: unknown, path: string, lang: Q1Lang | undefined, ctx: Ctx,
  opts: { letter?: OptionKey; numbering?: boolean } = {},
): string | null {
  if (raw === undefined || raw === null) return '';
  if (typeof raw === 'number') return String(raw);
  if (typeof raw !== 'string') return null;

  let s = raw;
  const repaired = repairEatenEscapes(s);
  if (repaired !== s) {
    ctx.fixes.push({ path, lang, message: 'Restored LaTeX backslashes eaten by JSON escapes (\\frac, \\times…)' });
    s = repaired;
  }
  s = s.trim();
  if (opts.letter) {
    const m = s.match(/^\(?([A-Da-d])\s*[).:]\s+/);
    if (m && m[1].toUpperCase() === opts.letter) {
      s = s.slice(m[0].length);
      ctx.fixes.push({ path, lang, message: `Removed the "${m[0].trim()}" prefix` });
    }
  }
  if (opts.numbering) {
    const m = s.match(/^\d{1,3}\s*[.)]\s+/);
    if (m) {
      s = s.slice(m[0].length);
      ctx.fixes.push({ path, lang, message: `Removed the question number "${m[0].trim()}"` });
    }
  }
  const wrapped = fixMath(s);
  if (wrapped !== s) {
    ctx.fixes.push({ path, lang, message: 'Wrapped bare LaTeX in $ … $' });
    s = wrapped;
  }
  return s;
}

function coerceL10n(
  raw: unknown, path: string, label: string, ctx: Ctx,
  opts: { letter?: OptionKey; numbering?: boolean } = {},
): LocalizedText {
  const out = emptyL10n();
  if (raw === undefined || raw === null || raw === '') return out;

  if (typeof raw === 'string' || typeof raw === 'number') {
    const s = cleanText(raw, path, undefined, ctx, opts) ?? '';
    if (!s) return out;
    if (isLanguageNeutral(s)) {
      out.uz = out.ru = out.en = s;
      ctx.fixes.push({ path, message: `${label}: number/formula copied to UZ, RU and EN` });
    } else {
      out.uz = s;
      ctx.fixes.push({ path, message: `${label}: plain text treated as UZ` });
    }
    return out;
  }

  if (!isObj(raw)) {
    ctx.errors.push({ path, message: `${label} must be text or { "uz": …, "ru": …, "en": … }` });
    return out;
  }

  for (const [key, value] of Object.entries(raw)) {
    const lang = LANG_ALIASES[norm(key)];
    if (!lang) {
      ctx.warnings.push({ path: `${path}.${key}`, message: `${label}: unknown language "${key}" ignored — use uz, ru, en` });
      continue;
    }
    if (lang !== key) ctx.fixes.push({ path: `${path}.${lang}`, lang, message: `${label}: key "${key}" read as "${lang}"` });
    const s = cleanText(value, `${path}.${lang}`, lang, ctx, opts);
    if (s === null) {
      ctx.errors.push({ path: `${path}.${lang}`, lang, message: `${label} must be text` });
      continue;
    }
    out[lang] = s;
  }

  // A formula is the same in every language — the only gap we may fill.
  const filled = Q1_LANGS.filter((l) => out[l]);
  const missing = Q1_LANGS.filter((l) => !out[l]);
  if (filled.length && missing.length) {
    const only = out[filled[0]];
    if (filled.every((l) => out[l] === only) && isLanguageNeutral(only)) {
      for (const l of missing) out[l] = only;
      ctx.fixes.push({ path, message: `${label}: number/formula copied to ${missing.map((l) => Q1_LANG_LABEL[l]).join(', ')}` });
    }
  }
  return out;
}

/**
 * Topic → chapter → subtopic. Each level comes from the most specific layer
 * that has it (the item, then the file header, then the page selection), and
 * a lower level never comes from a less specific layer than the one above it —
 * a file header's chapter is never combined with the page's subtopic.
 */
function coerceLocation(layers: Raw[], draft: Q1Draft, ctx: Ctx) {
  let limit = layers.length - 1;
  const take = (keys: string[]): unknown => {
    for (let i = 0; i <= limit; i++) {
      const v = pick(layers[i], keys);
      if (v !== undefined) { limit = i; return v; }
    }
    return undefined;
  };

  const topicV = take(TOPIC_KEYS);
  if (topicV === undefined) return;
  const ts = norm(String(topicV));
  const topic = Q1_TREE.find((t) => t.topicId === ts || norm(t.name) === ts || (ts === 'geometry' && t.topicId === '2'));
  if (!topic) {
    ctx.errors.push({ path: 'location', message: `Unknown topic "${topicV}" — use "Algebra" / "Geometriya" or 1 / 2` });
    return;
  }
  draft.topicId = topic.topicId;

  const chapterV = take(CHAPTER_KEYS);
  if (chapterV === undefined) return;
  const chapter = findNode(topic.chapters.map((c) => ({ id: c.chapterId, name: c.name, node: c })), chapterV);
  if (!chapter) {
    ctx.errors.push({ path: 'location', message: `Chapter "${chapterV}" not found in ${topic.name} (1–${topic.chapters.length})` });
    return;
  }
  draft.chapterId = chapter.chapterId;
  if (String(chapterV) !== chapter.chapterId) {
    ctx.fixes.push({ path: 'location', message: `Chapter "${chapterV}" → ${chapter.chapterId}` });
  }

  const subV = take(SUBTOPIC_KEYS);
  if (subV === undefined) return;
  const sub = findNode(chapter.subtopics.map((s) => ({ id: s.subtopicId, name: s.name, node: s })), subV);
  if (!sub) {
    ctx.errors.push({
      path: 'location',
      message: `Subtopic "${subV}" not found in chapter ${chapter.chapterId} "${chapter.name}" (1–${chapter.subtopics.length})`,
    });
    return;
  }
  draft.subtopicId = sub.subtopicId;
  if (String(subV) !== sub.subtopicId) {
    ctx.fixes.push({ path: 'location', message: `Subtopic "${subV}" → ${sub.subtopicId}` });
  }
}

function findNode<T>(nodes: { id: string; name: string; node: T }[], v: unknown): T | undefined {
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return nodes.find((n) => n.id === padId(Number(s)))?.node;
  return nodes.find((n) => norm(n.name) === norm(s))?.node;
}

function coerceSolution(raw: Raw, draft: Q1Draft, ctx: Ctx) {
  let sol: unknown = raw.solution;
  if (sol === undefined && Array.isArray(raw.solutions)) {
    sol = raw.solutions[0];
    if (raw.solutions.length > 1) ctx.warnings.push({ path: 'solution', message: 'Only the first of several solutions is kept' });
  }
  if (sol === undefined || sol === null) return;
  if (!isObj(sol)) {
    ctx.errors.push({ path: 'solution', message: 'solution must be { "final_answer", "method", "steps": [] }' });
    return;
  }

  // The stored solution is single-language (the legacy shape every reader expects).
  const single = (v: unknown, path: string, label: string): string => {
    if (isObj(v)) {
      const lang = Q1_LANGS.find((l) => typeof v[l] === 'string' && (v[l] as string).trim());
      if (!lang) return '';
      ctx.warnings.push({ path, message: `${label} is stored once — kept the ${Q1_LANG_LABEL[lang]} text` });
      return repairEatenEscapes(String(v[lang])).trim();
    }
    if (typeof v === 'string' || typeof v === 'number') return repairEatenEscapes(String(v)).trim();
    return '';
  };

  draft.solution.final_answer = single(sol.final_answer ?? sol.finalAnswer, 'solution.final_answer', 'Final answer');
  draft.solution.method = single(sol.method, 'solution.method', 'Method');

  let steps: unknown = sol.steps;
  if (isObj(steps)) {
    const lang = Q1_LANGS.find((l) => Array.isArray((steps as Raw)[l]) && ((steps as Raw)[l] as unknown[]).length);
    if (lang) ctx.warnings.push({ path: 'solution.steps', message: `Steps are stored once — kept the ${Q1_LANG_LABEL[lang]} steps` });
    steps = lang ? (steps as Raw)[lang] : [];
  }
  if (typeof steps === 'string') steps = steps.split('\n');
  if (Array.isArray(steps)) {
    draft.solution.steps = steps
      .filter((s): s is string | number => typeof s === 'string' || typeof s === 'number')
      .map((s) => fixMath(repairEatenEscapes(String(s)).trim()))
      .filter(Boolean);
  }
}

function coerceAnswer(raw: Raw, draft: Q1Draft, ctx: Ctx) {
  const a = pick(raw, ['answer', 'correct', 'correctAnswer']);
  if (a === undefined) return;
  if (typeof a === 'number') {
    ctx.errors.push({ path: 'answer', message: `answer ${a} is ambiguous — use a letter A–D` });
    return;
  }
  if (typeof a !== 'string') {
    ctx.errors.push({ path: 'answer', message: 'answer must be a letter A–D' });
    return;
  }
  const m = a.trim().match(/^\(?([A-Da-d])\)?[.)]?$/);
  if (m) {
    draft.answer = m[1].toUpperCase() as OptionKey;
    if (draft.answer !== a) ctx.fixes.push({ path: 'answer', message: `answer "${a}" → ${draft.answer}` });
    return;
  }
  // The answer written out as the option's text.
  const target = norm(a);
  const hit = Q1_OPTION_KEYS.filter((k) => Q1_LANGS.some((l) => norm(draft.options[k][l]) === target));
  if (hit.length === 1) {
    draft.answer = hit[0];
    ctx.fixes.push({ path: 'answer', message: `answer "${a}" matched option ${hit[0]}` });
  } else {
    ctx.errors.push({ path: 'answer', message: `answer "${a}" is not A–D and matches no single option's text` });
  }
}

export interface Q1CoerceOptions {
  /** Fallback layers for location + difficulty, most specific first (file header, page selection). */
  defaults?: Raw[];
  /** Warn about server-owned and unknown fields (an import file, not a stored doc). */
  fromImport?: boolean;
}

/** Lenient: any JSON item or stored questions1 doc → a draft, the fixes applied, and what is still wrong. */
export function coerceQuestion1(input: unknown, opts: Q1CoerceOptions = {}): Q1Check {
  const ctx: Ctx = { errors: [], warnings: [], fixes: [] };
  const draft = emptyQuestion1();
  if (!isObj(input)) {
    ctx.errors.push({ path: 'question', message: 'Each question must be a JSON object { … }' });
    return finish(draft, ctx);
  }
  let raw: Raw = input;

  // Import files may name things freely (`stem`, `savol`, `variantlar`,
  // `{text,isCorrect}[]`, `correct_index`…) — the SHARED reader folds them onto
  // this schema's names first (lib/importAliases.ts), noting each as a fix.
  // Stored docs are never rewritten this way.
  if (opts.fromImport) {
    const canon = canonicalizeRow(raw, {
      fields: ['question', 'passage', 'choices', 'answer', 'explanation', 'topic', 'chapter', 'subtopic', 'difficulty'],
      rename: { choices: 'options' },
      // Names this schema already reads itself — not "renamed", and `solution`
      // is its own worked-solution object, never the explanation.
      exclude: {
        explanation: ['solution'],
        answer: ['correct', 'correct_answer'],
        topic: ['topic_id'], chapter: ['chapter_id'], subtopic: ['subtopic_id'],
      },
    });
    raw = canon.row;
    for (const note of canon.notes) ctx.fixes.push({ path: 'import', message: note });
  }

  // After the alias step, so a field it understood is not reported as unknown.
  if (opts.fromImport) {
    for (const k of Object.keys(raw)) {
      if (SERVER_FIELDS.has(k)) ctx.warnings.push({ path: k, message: `"${k}" is set by the server — ignored` });
      else if (!KNOWN_FIELDS.has(k)) ctx.warnings.push({ path: k, message: `Unknown field "${k}" ignored` });
    }
  }

  const layers = [raw, ...(opts.defaults ?? [])];
  coerceLocation(layers, draft, ctx);

  const diffV = layers.map((l) => pick(l, DIFFICULTY_KEYS)).find((v) => v !== undefined);
  if (diffV !== undefined) {
    const id = DIFFICULTY_ALIASES[norm(String(diffV))];
    if (id) {
      draft.difficultyId = id;
      const key = Q1_DIFFICULTIES.find((x) => x.id === id)!.key;
      if (String(diffV) !== key && diffV !== id) ctx.fixes.push({ path: 'difficultyId', message: `Difficulty "${diffV}" → ${key}` });
    } else {
      ctx.errors.push({ path: 'difficultyId', message: `Unknown difficulty "${diffV}" — use easy / medium / hard or 1 / 2 / 3` });
    }
  }

  // Pasted-test residue ("1. …", "A) …") is only stripped from import files —
  // a stored question is never rewritten behind the editor's back.
  const imported = !!opts.fromImport;
  draft.question = coerceL10n(raw.question, 'question', 'Question', ctx, { numbering: imported });

  let opts4: unknown = raw.options;
  if (Array.isArray(opts4)) {
    if (opts4.length === 4) {
      opts4 = { A: opts4[0], B: opts4[1], C: opts4[2], D: opts4[3] };
      ctx.fixes.push({ path: 'options', message: 'Options list read as A, B, C, D' });
    } else {
      ctx.errors.push({ path: 'options', message: `Expected exactly 4 options, got ${opts4.length}` });
      opts4 = undefined;
    }
  }
  if (isObj(opts4)) {
    for (const [key, value] of Object.entries(opts4)) {
      const k = key.trim().toUpperCase() as OptionKey;
      if (!Q1_OPTION_KEYS.includes(k)) {
        ctx.errors.push({ path: `options.${key}`, message: `Unexpected option "${key}" — DTM questions have exactly A, B, C, D` });
        continue;
      }
      draft.options[k] = coerceL10n(value, `options.${k}`, `Option ${k}`, ctx, { letter: imported ? k : undefined });
    }
  } else if (opts4 !== undefined) {
    ctx.errors.push({ path: 'options', message: 'options must be { "A": …, "B": …, "C": …, "D": … }' });
  }

  coerceAnswer(raw, draft, ctx);
  draft.explanation = coerceL10n(raw.explanation, 'explanation', 'Explanation', ctx);
  coerceSolution(raw, draft, ctx);

  return finish(draft, ctx);
}

function finish(draft: Q1Draft, ctx: Ctx): Q1Check {
  const strict = checkQuestion1(draft);
  // A coercion error on a path already explains the strict one ("must be text" → "is empty").
  const errors = [...ctx.errors, ...strict.errors.filter((e) => !ctx.errors.some((c) => c.path === e.path))];
  return { draft, errors, warnings: dedupe([...ctx.warnings, ...strict.warnings]), fixes: dedupe(ctx.fixes) };
}

function dedupe(list: Q1Issue[]): Q1Issue[] {
  const seen = new Set<string>();
  return list.filter((i) => {
    const key = `${i.path}|${i.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── stored document ────────────────────────────────────────────────────────

const trimL10n = (v: LocalizedText): LocalizedText => ({ uz: v.uz.trim(), ru: v.ru.trim(), en: v.en.trim() });

/**
 * The content fields of a questions1 doc, in exactly the bulk-import shape the
 * readers know (docs/DATA_MODEL.md). Call only on a draft that passed
 * checkQuestion1. The server adds rand / uploadedAt / number / subject.
 */
export function questions1Content(d: Q1Draft) {
  const loc = locateQuestion1(d);
  const diff = Q1_DIFFICULTIES.find((x) => x.id === d.difficultyId);
  if (!loc || !diff || !d.answer) throw new Error('questions1Content: draft did not pass checkQuestion1');

  const solution: Q1Solution = {
    final_answer: d.solution.final_answer.trim(),
    method: d.solution.method.trim(),
    steps: d.solution.steps.map((s) => s.trim()).filter(Boolean),
  };
  const hasSolution = !!(solution.final_answer || solution.method || solution.steps.length);

  return {
    topicId: loc.topic.topicId,
    topic: loc.topic.name,
    chapterId: loc.chapter.chapterId,
    chapter: loc.chapter.name,
    subtopicId: loc.subtopic.subtopicId,
    subtopic: loc.subtopic.name,
    difficultyId: diff.id,
    difficulty: diff.key,
    question: trimL10n(d.question),
    options: {
      A: trimL10n(d.options.A),
      B: trimL10n(d.options.B),
      C: trimL10n(d.options.C),
      D: trimL10n(d.options.D),
    },
    answer: d.answer,
    explanation: trimL10n(d.explanation),
    solutions: hasSolution ? [solution] : [],
  };
}

/** Duplicate-detection key: the UZ question text, ignoring case, spacing and punctuation. */
export function questions1Key(question: unknown): string {
  const text = isObj(question) ? String(question.uz ?? '') : String(question ?? '');
  return norm(text).replace(/[\s.,;:!?]+/g, '');
}

// ─── import files ───────────────────────────────────────────────────────────

/**
 * Repairs the JSON mistakes LaTeX authors make, before parsing: a lone
 * backslash that is not a JSON escape (`\sqrt`, `\cdot`, `\left`), raw line
 * breaks inside a string, and trailing commas.
 */
export function repairJsonText(text: string): { text: string; fixes: Q1Issue[] } {
  let out = '';
  let inString = false;
  let escapes = 0, breaks = 0, commas = 0;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === '\\') {
        const n = text[i + 1];
        const valid = n !== undefined && ('"\\/bfnrt'.includes(n) || (n === 'u' && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))));
        if (valid) { out += c + n; i++; } else { out += '\\\\'; escapes++; }
        continue;
      }
      if (c === '"') inString = false;
      if (c === '\n') { out += '\\n'; breaks++; continue; }
      if (c === '\r') continue;
      if (c === '\t') { out += ' '; continue; }
      out += c;
      continue;
    }
    if (c === '"') inString = true;
    if (c === ',') {
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      if (text[j] === '}' || text[j] === ']') { commas++; continue; }
    }
    out += c;
  }

  const fixes: Q1Issue[] = [];
  if (escapes) fixes.push({ path: 'file', message: `Escaped ${escapes} lone LaTeX backslash(es) (\\sqrt → \\\\sqrt)` });
  if (breaks) fixes.push({ path: 'file', message: `Turned ${breaks} raw line break(s) inside text into \\n` });
  if (commas) fixes.push({ path: 'file', message: `Removed ${commas} trailing comma(s)` });
  return { text: out, fixes };
}

function describeJsonError(e: unknown, text: string): string {
  const msg = e instanceof Error ? e.message : String(e);
  const pos = Number(/position (\d+)/.exec(msg)?.[1] ?? NaN);
  if (!Number.isFinite(pos)) return `Invalid JSON: ${msg}`;
  const before = text.slice(0, pos);
  const line = before.split('\n').length;
  const col = pos - before.lastIndexOf('\n');
  const snippet = text.split('\n')[line - 1]?.trim().slice(0, 120) ?? '';
  return `Invalid JSON at line ${line}, column ${col}: ${msg}${snippet ? `\n→ ${snippet}` : ''}`;
}

export interface Q1ParseResult {
  items: Q1Check[];
  fileFixes: Q1Issue[];
  parseError?: string;
}

/**
 * A whole import file → one Q1Check per question. Accepts an array of
 * questions, `{ ...header, "questions": [...] }` (the header's topic /
 * chapter / subtopic / difficulty apply to every item without its own), or a
 * single question object. `pageDefaults` (the subtopic open on the page) is
 * the last fallback.
 */
export function parseQuestions1Json(text: string, pageDefaults?: Partial<Q1Draft>): Q1ParseResult {
  const source = text.replace(/^﻿/, '');
  const fileFixes: Q1Issue[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (first) {
    const repaired = repairJsonText(source);
    try {
      parsed = JSON.parse(repaired.text);
      fileFixes.push(...repaired.fixes);
    } catch {
      return { items: [], fileFixes, parseError: describeJsonError(first, source) };
    }
  }

  let list: unknown[];
  let header: Raw = {};
  if (Array.isArray(parsed)) list = parsed;
  else if (isObj(parsed) && Array.isArray(parsed.questions)) {
    list = parsed.questions;
    header = Object.fromEntries(Object.entries(parsed).filter(([k]) => k !== 'questions'));
  } else if (isObj(parsed) && 'question' in parsed) list = [parsed];
  else {
    // Any other wrapper (`items`, `data`, `savollar`, nested…): the shared finder.
    const found = findQuestionList(parsed);
    if (!found) {
      return { items: [], fileFixes, parseError: 'No list of questions found in this file.' };
    }
    list = found.list;
    header = found.header;
    fileFixes.push({ path: 'file', message: `Questions read from the file's list of ${found.list.length}` });
  }
  // `{passage, questions:[…]}` groups → one question each.
  const expanded = expandQuestionGroups(list);
  if (expanded.length !== list.length) {
    fileFixes.push({ path: 'file', message: `${list.length} entries expanded to ${expanded.length} questions (grouped questions)` });
    list = expanded;
  }

  if (!list.length) return { items: [], fileFixes, parseError: 'The file has no questions.' };
  if (list.length > Q1_MAX_PER_FILE) {
    return { items: [], fileFixes, parseError: `${list.length} questions — split the file (max ${Q1_MAX_PER_FILE}).` };
  }

  const page: Raw = {};
  if (pageDefaults?.topicId) page.topicId = pageDefaults.topicId;
  if (pageDefaults?.chapterId) page.chapterId = pageDefaults.chapterId;
  if (pageDefaults?.subtopicId) page.subtopicId = pageDefaults.subtopicId;
  if (pageDefaults?.difficultyId) page.difficultyId = pageDefaults.difficultyId;

  const defaults = [header, page];
  return { items: list.map((raw) => coerceQuestion1(raw, { defaults, fromImport: true })), fileFixes };
}

/** A draft in the import format — for "download fixed JSON" and the template. */
export function questions1ToJson(d: Q1Draft) {
  return {
    topicId: d.topicId,
    chapterId: d.chapterId,
    subtopicId: d.subtopicId,
    difficulty: Q1_DIFFICULTIES.find((x) => x.id === d.difficultyId)?.key ?? '',
    question: d.question,
    options: d.options,
    answer: d.answer,
    explanation: d.explanation,
    solution: d.solution,
  };
}

// lib/importAliases.ts
//
// PURE, SHARED "free-form" reader for question-import files (2026-10-31). It
// sits IN FRONT of every JSON question importer — the teacher importer
// (lib/SatQuestionImport.ts) and the admin questions1 bulk import
// (lib/questions1Schema.ts) — and folds whatever a file calls things onto the
// field names that importer validates. Nothing here validates; it only
// renames, unwraps and resolves, so each importer keeps its own rules.
//
//  - Field names match LOOSELY: case, `_`, `-`, spaces and apostrophes are
//    ignored (`Question_Text` = `question-text` = `QUESTIONTEXT`), and Uzbek /
//    Russian names count (`savol`, `javob`, `variantlar`, `вопрос`, `ответ`…).
//  - Each alias has a value test, so an ambiguous name is only taken when its
//    value fits (`answers: [..4 items]` → choices, `answers: "B"` → answer;
//    `level: "hard"` → difficulty, `level: "SAT"` → ignored).
//  - Choices: array or object; entries may be text, `{en,uz,ru}`, or objects
//    (`{text, isCorrect}`, `{id:"A", content}`); keys `"a)"`, `"option_a"`, `"1"`.
//  - The answer: a decorated letter ("(B)", "option c"), the choice's own text,
//    or its position (1-based; 0-based when the field name says "index"), or a
//    choice flagged correct.
//  - Groups `{passage, questions:[…]}` expand to one row per child.
//  - `findQuestionList` finds the question array anywhere in the file.
//
// To accept a new spelling: add it to FIELD_ALIASES below (any case/format —
// it is normalised). That is the ONE place; both importers pick it up.

type Json = Record<string, unknown>;

export type CanonField =
  | 'question' | 'passage' | 'choices' | 'answer' | 'explanation'
  | 'topic' | 'chapter' | 'subtopic' | 'difficulty' | 'type'
  | 'tags' | 'imageUrl' | 'acceptedAnswers';

/** Loose key form: lower-case letters/digits only (any script). */
export const normKey = (k: string): string => k.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/**
 * Every accepted name per field, most specific first. Written readably — they
 * are normalised with `normKey`, so `question_text` also covers `QuestionText`.
 */
export const FIELD_ALIASES: Record<CanonField, string[]> = {
  question: [
    'question', 'question_text', 'question_body', 'question_stem', 'stem', 'prompt', 'body',
    'text', 'q', 'problem', 'task', 'item', 'query',
    'savol', 'savol_matni', 'topshiriq', 'masala',
    'вопрос', 'текст_вопроса', 'задание', 'задача',
  ],
  passage: [
    'passage', 'passage_text', 'reading_passage', 'stimulus', 'paragraph', 'context',
    'reading', 'article', 'excerpt', 'matn', 'parcha', 'текст', 'отрывок',
  ],
  choices: [
    'choices', 'options', 'answer_choices', 'answer_options', 'variants', 'alternatives',
    'answers', 'choice_list', 'option_list',
    'variantlar', 'javoblar', 'javob_variantlari', 'варианты', 'варианты_ответа', 'ответы',
  ],
  answer: [
    'answer', 'correct', 'correct_answer', 'correct_option', 'correct_choice', 'correct_letter',
    'correct_key', 'answer_key', 'key', 'right_answer', 'right', 'solution_letter',
    'correct_index', 'answer_index', 'correct_option_index', 'right_index',
    "to'g'ri_javob", 'togri_javob', 'javob', 'ответ', 'правильный_ответ', 'верный_ответ',
  ],
  explanation: [
    'explanation', 'explanation_text', 'rationale', 'solution', 'reasoning', 'worked_solution',
    'how_to_solve', 'izoh', 'yechim', 'tushuntirish', 'javob_izohi', 'объяснение', 'решение', 'пояснение',
  ],
  topic: [
    'topic', 'topic_name', 'topic_id', 'domain', 'domain_name', 'category', 'unit',
    'mavzu', 'тема',
  ],
  chapter: ['chapter', 'chapter_id', 'chapter_name', 'bob', 'глава', 'раздел'],
  subtopic: [
    'subtopic', 'subtopic_name', 'subtopic_id', 'skill', 'skill_name', 'skill_desc', 'subskill',
    'lesson', "bo'lim", 'bolim', 'kichik_mavzu', 'подтема', 'навык',
  ],
  difficulty: [
    'difficulty', 'difficulty_level', 'level', 'complexity', 'hardness',
    'daraja', 'qiyinlik', 'qiyinlik_darajasi', 'сложность', 'уровень',
  ],
  type: ['type', 'question_type', 'qtype', 'answer_type', 'format', 'kind', 'turi', 'тип'],
  tags: ['tags', 'tag', 'keywords', 'labels', 'teglar', "kalit_so'zlar", 'теги'],
  imageUrl: [
    'image_url', 'image', 'img', 'image_src', 'image_link', 'picture', 'figure', 'diagram',
    'rasm', 'surat', 'изображение', 'картинка',
  ],
  acceptedAnswers: [
    'accepted_answers', 'also_accepted', 'acceptable_answers', 'alternative_answers',
    'other_answers', 'equivalent_answers',
  ],
};

const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);
const LOCALE_KEYS = ['uz', 'ru', 'en', 'uk', 'oz'];
const isLocalized = (v: unknown): v is Json => isObj(v) && LOCALE_KEYS.some((k) => typeof v[k] === 'string');
const isText = (v: unknown) => (typeof v === 'string' && v.trim() !== '') || isLocalized(v);
const textOf = (v: unknown): string =>
  typeof v === 'string' ? v.trim()
    : typeof v === 'number' ? String(v)
      : isLocalized(v) ? LOCALE_KEYS.map((k) => (typeof v[k] === 'string' ? (v[k] as string).trim() : '')).find(Boolean) ?? ''
        : '';
const looseText = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[.。]$/, '').trim();

// ─── difficulty / type synonyms ─────────────────────────────────────────────

const DIFFICULTY_WORDS: [RegExp, string][] = [
  [/^(1|e|easy|simple|basic|low|oson|yengil|oddiy|легк|лёгк|простой|низк)/, 'easy'],
  [/^(2|m|med|medium|intermediate|average|normal|moderate|orta|o'rta|o‘rta|средн|нормал)/, 'medium'],
  [/^(3|h|hard|difficult|advanced|high|challenging|qiyin|murakkab|сложн|трудн|высок)/, 'hard'],
  [/^(0|beginner|novice|boshlang)/, 'beginner'],
  [/^(4|5|expert|olymp|olimp|олимп)/, 'expert'],
];

/** A difficulty value in any common spelling → 'easy' | 'medium' | 'hard' | 'beginner' | 'expert', or null. */
export function normalizeDifficulty(v: unknown): string | null {
  if (v == null || v === '') return null;
  const s = String(v).toLowerCase().trim();
  if (s === 'olympiad') return 'olympiad';
  const hit = DIFFICULTY_WORDS.find(([re]) => re.test(s));
  return hit ? hit[1] : null;
}

/** A question-type value in any common spelling → 'mcq' | 'numeric' | 'open', or null. */
export function normalizeType(v: unknown): 'mcq' | 'numeric' | 'open' | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const s = normKey(v);
  if (/^(mcq|mc|multiplechoice|singlechoice|choice|test|closed|abcd|yopiq|tanlov|выбор|закрыт)/.test(s)) return 'mcq';
  if (/^(numeric|number|num|gridin|grid|spr|studentproducedresponse|integer|decimal|son|числ)/.test(s)) return 'numeric';
  if (/^(open|short|shortanswer|written|text|fillin|fill|freeresponse|free|ochiq|yozma|открыт|кратк)/.test(s)) return 'open';
  return null;
}

// ─── choices + answer ───────────────────────────────────────────────────────

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const CHOICE_TEXT_KEYS = ['text', 'content', 'value', 'body', 'option', 'label', 'choice', 'answer', 'title', 'matn'];
const CHOICE_LETTER_KEYS = ['id', 'key', 'letter', 'label', 'option', 'name'];
const CHOICE_FLAG_KEYS = ['isCorrect', 'is_correct', 'correct', 'isAnswer', 'is_answer', 'right', 'isRight', 'togri'];

/** A key/value naming a choice letter: "A", "a)", "(b)", "option_c", "choiceD" → letter, else null. */
function letterFrom(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/^(?:option|choice|variant|answer|javob)?[\s_.:-]*\(?([a-fA-F])\)?[.)]?$/);
  return m ? m[1].toUpperCase() : null;
}

/** One choice entry → its text (string or localized) and whether it is flagged correct. */
function readChoiceEntry(entry: unknown): { text: unknown; letter: string | null; flagged: boolean } {
  if (!isObj(entry) || isLocalized(entry)) return { text: entry, letter: null, flagged: false };
  const letter = CHOICE_LETTER_KEYS.map((k) => letterFrom(entry[k])).find(Boolean) ?? null;
  const text = CHOICE_TEXT_KEYS
    .map((k) => entry[k])
    .find((v) => isText(v) && !(typeof v === 'string' && letterFrom(v)));
  const flagged = CHOICE_FLAG_KEYS.some((k) => entry[k] === true || entry[k] === 'true' || entry[k] === 1);
  return { text: text ?? '', letter, flagged };
}

/**
 * Choices in any shape → `{A: text, B: text…}` (text may stay a `{en,uz,ru}`
 * object) + the letters flagged correct. Unrecognised keys are kept as written
 * (upper-cased) so the importer's own check can name them.
 */
export function normalizeChoices(v: unknown): { map: Record<string, unknown>; flagged: string[] } | null {
  const flagged: string[] = [];
  if (Array.isArray(v)) {
    if (!v.length) return null;
    const entries = v.map(readChoiceEntry);
    // Use the entries' own letters only when they are all present and distinct.
    const own = entries.map((e) => e.letter);
    const useOwn = own.every(Boolean) && new Set(own).size === own.length;
    const map: Record<string, unknown> = {};
    entries.forEach((e, i) => {
      const letter = useOwn ? own[i]! : (LETTERS[i] ?? String(i + 1));
      map[letter] = e.text;
      if (e.flagged) flagged.push(letter);
    });
    return { map, flagged };
  }
  if (isObj(v) && !isLocalized(v)) {
    const keys = Object.keys(v);
    if (!keys.length) return null;
    const zeroBased = keys.includes('0');
    const map: Record<string, unknown> = {};
    for (const k of keys) {
      const digit = k.trim().match(/^(?:option|choice|variant)?[\s_.-]*(\d)$/i);
      const letter = letterFrom(k) ?? (digit ? LETTERS[Number(digit[1]) - (zeroBased ? 0 : 1)] : null) ?? k.trim().toUpperCase();
      const e = readChoiceEntry(v[k]);
      map[letter] = e.text;
      if (e.flagged) flagged.push(letter);
    }
    return { map, flagged };
  }
  return null;
}

/**
 * The answer, resolved against the choices → a letter, or null when it cannot
 * be. Order: decorated letter → the choice's own text (unique) → position
 * (0-based if the field name says "index", else 1-based).
 */
export function resolveChoiceAnswer(answer: unknown, choices: Record<string, unknown>, fromIndexField = false): string | null {
  const value = Array.isArray(answer) ? answer[0] : answer;
  const letters = Object.keys(choices);
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const s = String(value).trim();

  if (!fromIndexField) {
    const letter = letterFrom(s);
    if (letter && letters.includes(letter)) return letter;
    const target = looseText(s);
    const byText = letters.filter((k) => looseText(textOf(choices[k])) === target);
    if (byText.length === 1) return byText[0];
  }
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    const at = fromIndexField ? n : n - 1;
    if (at >= 0 && at < letters.length) return letters[at];
  }
  return null;
}

// ─── one row ────────────────────────────────────────────────────────────────

const ALIAS_SETS = Object.fromEntries(
  (Object.keys(FIELD_ALIASES) as CanonField[]).map((f) => [f, FIELD_ALIASES[f].map(normKey)]),
) as Record<CanonField, string[]>;

/** Value tests — an alias is only taken when its value fits the field. */
const FITS: Record<CanonField, (v: unknown) => boolean> = {
  question: isText,
  passage: isText,
  choices: (v) => (Array.isArray(v) && v.length >= 2) || (isObj(v) && !isLocalized(v) && Object.keys(v).length >= 2),
  answer: (v) => (typeof v === 'string' && v.trim() !== '') || (typeof v === 'number' && Number.isFinite(v))
    || (Array.isArray(v) && v.length > 0 && ['string', 'number'].includes(typeof v[0])),
  explanation: isText,
  topic: (v) => isText(v) || (isObj(v) && ('id' in v || 'name' in v)),
  chapter: (v) => isText(v) || typeof v === 'number' || (isObj(v) && ('id' in v || 'name' in v)),
  subtopic: (v) => isText(v) || (isObj(v) && ('id' in v || 'name' in v)),
  difficulty: (v) => normalizeDifficulty(v) !== null,
  type: (v) => normalizeType(v) !== null,
  tags: (v) => Array.isArray(v) || (typeof v === 'string' && v.trim() !== ''),
  imageUrl: (v) => typeof v === 'string' && /^(https?:|data:image\/|\/)/.test(v.trim()),
  acceptedAnswers: (v) => Array.isArray(v),
};

export interface CanonicalizeOptions {
  /** Which fields to look for (default: all). */
  fields?: CanonField[];
  /** Write a field under another name (questions1: `choices` → `options`). */
  rename?: Partial<Record<CanonField, string>>;
  /** Aliases NOT to use for a field (questions1 keeps its own `solution` object). */
  exclude?: Partial<Record<CanonField, string[]>>;
  /** Put a separate passage in front of the question text (default true). */
  mergePassage?: boolean;
}

export interface CanonicalizeResult {
  row: Json;
  /** What was read under another name / reinterpreted — for "fixes" reports. */
  notes: string[];
}

/** Prepend a passage to a question (string, or per language for `{en,uz,ru}`). */
function withPassage(question: unknown, passage: unknown): unknown {
  const p = textOf(passage);
  if (!p) return question;
  if (typeof question === 'string') {
    return question.includes(p.slice(0, 40)) ? question : `${p}\n\n${question.trim()}`;
  }
  if (isLocalized(question)) {
    const out: Json = { ...question };
    for (const k of LOCALE_KEYS) {
      if (typeof question[k] !== 'string' || !(question[k] as string).trim()) continue;
      const pk = isLocalized(passage) && typeof passage[k] === 'string' && (passage[k] as string).trim() ? (passage[k] as string).trim() : p;
      if (!(question[k] as string).includes(pk.slice(0, 40))) out[k] = `${pk}\n\n${(question[k] as string).trim()}`;
    }
    return out;
  }
  return question;
}

/**
 * Fold one raw row onto canonical field names. An alias key is MOVED (removed
 * under its own name) so an importer that warns about unknown fields stays
 * quiet; a canonical field already present is never overwritten.
 */
export function canonicalizeRow(raw: Json, opts: CanonicalizeOptions = {}): CanonicalizeResult {
  const row: Json = { ...raw };
  const notes: string[] = [];
  const fields = opts.fields ?? (Object.keys(FIELD_ALIASES) as CanonField[]);
  const target = (f: CanonField) => opts.rename?.[f] ?? f;
  const present = (name: string) => row[name] !== undefined && row[name] !== null && row[name] !== '';
  let answerFromIndex = false;

  // Choices first — the answer is resolved against them.
  const order: CanonField[] = ['choices', ...fields.filter((f) => f !== 'choices')];
  for (const field of order) {
    if (!fields.includes(field)) continue;
    const to = target(field);
    if (present(to)) continue;
    const excluded = new Set((opts.exclude?.[field] ?? []).map(normKey));
    const allowed = ALIAS_SETS[field].filter((a) => !excluded.has(a));
    // Keys in alias priority order (first alias wins), then their value test.
    const candidates = Object.keys(row)
      .map((k) => ({ k, rank: allowed.indexOf(normKey(k)) }))
      .filter((c) => c.rank >= 0 && c.k !== to)
      .sort((a, b) => a.rank - b.rank);
    const hit = candidates.find((c) => FITS[field](row[c.k]));
    if (!hit) continue;
    row[to] = row[hit.k];
    delete row[hit.k];
    notes.push(`"${hit.k}" read as "${to}"`);
    if (field === 'answer' && normKey(hit.k).includes('index')) answerFromIndex = true;
  }

  // Normalise the choices' shape and resolve the answer to a letter.
  const choicesKey = target('choices');
  const answerKey = target('answer');
  if (fields.includes('choices') && row[choicesKey] != null) {
    const norm = normalizeChoices(row[choicesKey]);
    if (norm) {
      row[choicesKey] = norm.map;
      if (!present(answerKey) && norm.flagged.length === 1) {
        row[answerKey] = norm.flagged[0];
        notes.push(`answer taken from the choice marked correct (${norm.flagged[0]})`);
      }
      if (present(answerKey)) {
        const before = row[answerKey];
        const letter = resolveChoiceAnswer(before, norm.map, answerFromIndex);
        if (letter && String(before).trim() !== letter) {
          row[answerKey] = letter;
          notes.push(`answer "${String(Array.isArray(before) ? before[0] : before)}" → ${letter}`);
        }
      }
    }
  }

  // Normalise difficulty / type spellings.
  const diffKey = target('difficulty');
  if (fields.includes('difficulty') && present(diffKey) && typeof row[diffKey] !== 'number') {
    const d = normalizeDifficulty(row[diffKey]);
    if (d && d !== String(row[diffKey]).toLowerCase().trim()) { notes.push(`difficulty "${row[diffKey]}" → ${d}`); row[diffKey] = d; }
  }
  const typeKey = target('type');
  if (fields.includes('type') && present(typeKey)) {
    const tp = normalizeType(row[typeKey]);
    if (tp && tp !== String(row[typeKey]).toLowerCase().trim()) { notes.push(`type "${row[typeKey]}" → ${tp}`); row[typeKey] = tp; }
  }

  // A separate passage goes in front of the question text.
  const passageKey = target('passage');
  if ((opts.mergePassage ?? true) && fields.includes('passage') && present(passageKey) && present(target('question'))) {
    row[target('question')] = withPassage(row[target('question')], row[passageKey]);
    delete row[passageKey];
  }
  return { row, notes };
}

// ─── the list ───────────────────────────────────────────────────────────────

const GROUP_KEYS = ['questions', 'items', 'subquestions', 'sub_questions', 'parts', 'children', 'savollar', 'вопросы'].map(normKey);
const hasQuestionField = (row: Json) => Object.keys(row).some((k) => ALIAS_SETS.question.includes(normKey(k)) && isText(row[k]));

/**
 * `{passage, questions:[…]}`-style groups → one row per child, each inheriting
 * the group's passage/topic/difficulty/tags… (a child's own fields win). Rows
 * that are already single questions pass through untouched.
 */
export function expandQuestionGroups(rows: unknown[]): unknown[] {
  return rows.flatMap((row) => {
    if (!isObj(row) || hasQuestionField(row)) return [row];
    const groupKey = Object.keys(row).find((k) => GROUP_KEYS.includes(normKey(k))
      && Array.isArray(row[k]) && (row[k] as unknown[]).length > 0 && (row[k] as unknown[]).every(isObj));
    if (!groupKey) return [row];
    const shared = Object.fromEntries(Object.entries(row).filter(([k]) => k !== groupKey));
    return (row[groupKey] as Json[]).map((child) => ({ ...shared, ...child }));
  });
}

const LIST_KEYS = [
  'questions', 'items', 'data', 'results', 'records', 'rows', 'list', 'entries', 'tests',
  'quiz', 'question_list', 'savollar', 'testlar', 'вопросы',
].map(normKey);
const looksLikeQuestion = (v: unknown) => isObj(v) && (hasQuestionField(v) || Object.keys(v).some((k) => GROUP_KEYS.includes(normKey(k))));

/**
 * The question array anywhere in a parsed file: the root array, a well-known
 * key (`questions`, `items`, `data`, `results`, `savollar`…), else the LARGEST
 * array of question-like objects up to 4 levels deep. `header` = the sibling
 * fields of a wrapped list (file-wide defaults). A single question object →
 * a list of one. null when nothing question-like is found.
 */
export function findQuestionList(parsed: unknown): { list: unknown[]; header: Json } | null {
  if (Array.isArray(parsed)) return parsed.length ? { list: parsed, header: {} } : null;
  if (!isObj(parsed)) return null;
  if (looksLikeQuestion(parsed) && hasQuestionField(parsed)) return { list: [parsed], header: {} };

  for (const k of Object.keys(parsed)) {
    const v = parsed[k];
    if (LIST_KEYS.includes(normKey(k)) && Array.isArray(v) && v.length && v.every(isObj)) {
      return { list: v, header: Object.fromEntries(Object.entries(parsed).filter(([key]) => key !== k)) };
    }
  }

  let best: unknown[] | null = null;
  const walk = (node: unknown, depth: number) => {
    if (depth > 4 || node == null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      if (node.length && node.every(isObj) && node.some(looksLikeQuestion) && (!best || node.length > best.length)) best = node;
      node.forEach((n) => walk(n, depth + 1));
      return;
    }
    Object.values(node as Json).forEach((n) => walk(n, depth + 1));
  };
  walk(parsed, 0);
  return best ? { list: best, header: {} } : null;
}

// lib/SatQuestionImport.ts
//
// The PURE layer of the teacher JSON question importer (`/teacher/create/import`):
// parse a JSON file, validate every row against the taxonomy, and hand back
// rows already shaped for `toQuestionV1`. No Firestore, no React — the page
// only renders what this returns, and this can be reasoned about on its own.
//
// Born SAT-only (hence the file name, which the Android teacher app mirrors);
// since 2026-10-29 it serves EVERY `data/question_topics.json` subject —
// biologiya, kimyo, fizika, ona-tili, algebra, geometriya and the two SATs.
// What differs per subject is only `importProfile`: allowed types + the content
// language (SAT is written in English, everything else in Uzbek).
//
// Accepted row shapes: the native one (`question`/`choices`/`explanation` as
// strings), the extended exported one (`question`/`explanation` and each of
// `options`/`choices` as `{en, uz, ru}` objects — `options` is folded into
// `choices` by `normalizeRow`), and College Board bank rows
// (`lib/SatCollegeBoardImport.ts`). All three meet the same validator.
//
// ⚠️ EVERY row is validated against `data/question_topics.json`, not merely
// type-checked. `toQuestionV1` THROWS `InvalidTopicError` on an unknown
// subject/topic/subtopic triple (docs/QUESTIONS.md — "an LLM cannot pick a
// topic"), so an unvalidated row would blow up mid-import after earlier rows
// had already been written. Rejecting up front is what makes the import
// all-or-nothing per row and reportable before anything is saved.
//
// ⚠️ The ids in the file are the TAXONOMY'S ids, not free text, and they are
// persisted into the document. That is why the upload page offers
// `buildSatAiPrompt` (below) — it lists exactly the subject's ids: a teacher
// cannot guess `research-organizing-margin-of-error-outliers`.

import { collegeBoardToNative, isCollegeBoardRow } from '@/lib/SatCollegeBoardImport';
import { foreignSatSubject, resolveSatTaxonomy } from '@/lib/SatTaxonomyMatch';
import { canonicalizeRow, expandQuestionGroups, findQuestionList, normalizeDifficulty } from '@/lib/importAliases';
import { SUBJECTS, findSubtopic, findTopic, findSubject } from '@/lib/questionTopics';
import { SAT_MATH_TAXONOMY_SLUG, SAT_RW_TAXONOMY_SLUG } from '@/lib/SatMathQuiz';
import { DIFFICULTY_ID_BY_NAME, DIFFICULTY_LEVELS, type DifficultyName } from '@/types/question';

/** Any `data/question_topics.json` subject id (`biologiya`, `sat-matematika`…). */
export type ImportSubject = string;
/** @deprecated the importer is no longer SAT-only — use `ImportSubject`. */
export type SatImportSubject = ImportSubject;

export type ImportType = 'mcq' | 'numeric' | 'open';
type ContentLang = 'uz' | 'en';

export const isSatSubject = (subject: ImportSubject) =>
  subject === SAT_MATH_TAXONOMY_SLUG || subject === SAT_RW_TAXONOMY_SLUG;

/**
 * Per-subject rules. SAT Math authors `mcq` + `numeric` (grid-in), SAT R&W has
 * no grid-in; both are English exams, so their text goes into `.en` (the SAT
 * runner reads `.en`). Every other subject is Uzbek (`.uz`, the app default)
 * and takes closed `mcq` plus typed answers (`open`, `numeric`) — the closed /
 * typed split the Milliy sertifikat papers draw on (`isClosedQuestion`).
 */
export function importProfile(subject: ImportSubject): { types: ImportType[]; lang: ContentLang } {
  if (subject === SAT_MATH_TAXONOMY_SLUG) return { types: ['mcq', 'numeric'], lang: 'en' };
  if (subject === SAT_RW_TAXONOMY_SLUG) return { types: ['mcq'], lang: 'en' };
  return { types: ['mcq', 'open', 'numeric'], lang: 'uz' };
}

export const allowedTypesFor = (subject: ImportSubject): ImportType[] => importProfile(subject).types;

/** Every importable subject, in taxonomy order. */
export const importSubjects = (): { id: ImportSubject; name: string }[] =>
  SUBJECTS.map((s) => ({ id: s.id, name: s.name }));

/** One row of the uploaded file, before validation — genuinely untyped input. */
type RawRow = Record<string, unknown>;

/** A row that passed, with the exact `toQuestionV1` source object built. */
export interface SatImportOk {
  /** 0-based position in the file — what the error/preview lists cite. */
  index: number;
  preview: string;
  type: ImportType;
  topicName: string;
  subtopicName: string;
  difficulty: DifficultyName;
  /** Ready to hand straight to `toQuestionV1`. */
  source: Record<string, unknown>;
}

export interface SatImportError {
  index: number;
  reason: string;
  /** The row's topic id when THAT resolved (only the subtopic is missing/bad),
   *  else '' — lets the fix UI ask one subtopic per topic instead of per row. */
  topic: string;
  /** The original raw row object — lets the fix UI seed valid fields. */
  raw: Record<string, unknown>;
  /** Set when the row belongs to the OTHER SAT subject (`foreignSatSubject`) —
   *  the page groups these and offers to switch subject. */
  foreignSubject?: string;
}

export interface SatImportReport {
  subject: ImportSubject;
  ok: SatImportOk[];
  errors: SatImportError[];
  /** Rows dropped as exact content duplicates of an earlier row in the SAME file. */
  duplicates: number;
  /** Set when the file itself could not be read as a JSON array of objects. */
  fatal?: string;
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** A taxonomy reference as files carry it: an id/name string, or `{id, name}`
 *  (our own exported documents). The resolver matches either against both. */
const label = (v: unknown): string =>
  typeof v === 'string' ? v.trim()
    : v && typeof v === 'object' ? str((v as { id?: unknown }).id) || str((v as { name?: unknown }).name)
      : '';

/** First non-empty label among the given fields. */
const firstLabel = (row: RawRow, keys: string[]) => keys.map((k) => label(row[k])).find(Boolean) ?? '';

/** `tags` as an array of strings or one comma-separated string → clean list. */
export const readTags = (v: unknown): string[] => {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [];
  return [...new Set(list.map((t) => str(t)).filter(Boolean))];
};

type Localized = { uz: string; ru: string; en: string };
const LOCALES = ['uz', 'ru', 'en'] as const;

/** A text field as files carry it: a plain string, or the extended exported
 *  shape `{en:"…", uz:"…", ru:"…"}` (our own `toQuestionV1` docs; `uk` is a
 *  legacy alias some exports use). '' when neither. */
const isLocalized = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/** First non-empty language of a text field — what previews/dedupe compare. */
const textOf = (v: unknown): string => {
  if (typeof v === 'string') return v.trim();
  if (!isLocalized(v)) return '';
  return str(v.en) || str(v.uz) || str(v.ru) || str(v.uk);
};

/** A text field → `{uz, ru, en}`. A plain string goes into the subject's
 *  language; an object keeps every language it has, and the subject's own slot
 *  is back-filled so the runner (`.en` for SAT, `.uz` elsewhere) never reads ''. */
const toLocalized = (v: unknown, lang: ContentLang): Localized => {
  const out: Localized = { uz: '', ru: '', en: '' };
  if (isLocalized(v)) {
    for (const l of LOCALES) out[l] = str(v[l]);
    if (!out.en) out.en = str(v.uk);
  }
  if (!out[lang]) out[lang] = textOf(v);
  return out;
};

/** Accepts `choices` as `{A:"…"}` or as a plain array `["…","…"]` (→ A,B,C,D);
 *  each entry may itself be a `{en,uz,ru}` object. */
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
function readChoices(v: unknown): Record<string, unknown> | null {
  if (Array.isArray(v)) {
    if (v.length > LETTERS.length) return null;
    const out: Record<string, unknown> = {};
    v.forEach((text, i) => { out[LETTERS[i]] = text; });
    return out;
  }
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, text] of Object.entries(v as Record<string, unknown>)) {
      out[k.trim().toUpperCase()] = text;
    }
    return out;
  }
  return null;
}

/** `options` (the extended exported format) is an alias of `choices`. Folded
 *  in BEFORE validation, so the reasons, the fix UI's `raw.choices` check and
 *  the dedupe key only ever see one field name. */
/**
 * Free-form field names → the native ones, via the SHARED reader
 * (lib/importAliases.ts — the one place to add a spelling): `stem`/`savol`/
 * `вопрос`… → `question`; `options`/`variantlar`/`{text,isCorrect}[]`… →
 * `choices` (A, B, C…); `correct_answer`/`javob`/a choice's text/its position →
 * `answer` as a letter; `rationale`/`yechim` → `explanation`; a separate
 * `passage` is put in front of the question; difficulty/type synonyms
 * normalised. Run BEFORE validation, so the reasons, the fix UI's `raw.choices`
 * check and the dedupe key only ever see the native names.
 */
function normalizeRow(row: RawRow): RawRow {
  return canonicalizeRow(row).row;
}

/** Exact-content key, so re-uploading the same file twice in a row is visible. */
const contentKey = (row: RawRow) => JSON.stringify([
  textOf(row.question),
  str(row.answer).toLowerCase(),
  Object.entries(readChoices(row.choices) ?? {}).map(([k, v]) => [k, textOf(v)]).sort(),
]);

/**
 * Exact ids pass through; display names ("Linear Equations", "Umumiy kimyo"),
 * other field names (`domain`/`skill`), `tags` and College Board skill text are
 * resolved to the real ids — so a file need not carry our ids at all.
 */
function rowTaxonomy(row: RawRow, subject: ImportSubject) {
  const topicText = firstLabel(row, ['topic', 'topicName', 'topic_name', 'domain', 'category']);
  const subtopicText = firstLabel(row, ['subtopic', 'subtopicName', 'subtopic_name', 'skill', 'skill_desc']);
  const tags = readTags(row.tags);
  const hints = [
    ...(Array.isArray(row.hints) ? row.hints.filter((h): h is string => typeof h === 'string') : []),
    ...tags,
    str(row.name),
  ].filter(Boolean);
  const resolved = resolveSatTaxonomy(subject, topicText, subtopicText, hints);
  return {
    topicId: resolved.topic || topicText,
    subtopicId: resolved.subtopic || subtopicText,
    tags,
    // Checked BEFORE trusting `resolved` — see `foreignSatSubject`.
    foreign: foreignSatSubject(subject, [topicText, subtopicText, ...hints.filter((h) => h !== str(row.name))]),
  };
}

/** A rejected row, with its resolved topic (if any) for the grouped fix UI. */
export function importError(index: number, reason: string, row: RawRow, subject: ImportSubject): SatImportError {
  const { topicId, foreign } = rowTaxonomy(row, subject);
  return {
    index, reason, raw: row,
    topic: !foreign && findTopic(subject, topicId) ? topicId : '',
    ...(foreign ? { foreignSubject: foreign } : {}),
  };
}

/**
 * Validate ONE row. Returns the built source object, or a human reason string.
 * Reasons name the offending value — a 400-row file is only fixable if the
 * report says *which* id was wrong, not merely that one was.
 */
function buildRow(row: RawRow, subject: ImportSubject): { source: Record<string, unknown>; meta: Omit<SatImportOk, 'index' | 'source'> } | string {
  const subjectNode = findSubject(subject);
  if (!subjectNode) return `unknown subject "${subject}"`;

  const question = textOf(row.question);
  if (question.length < 3) return 'missing "question"';

  const { types: allowed, lang } = importProfile(subject);
  // No `type` but no `choices` either ⇒ a typed answer, not a broken mcq:
  // `open` where the subject has it, else `numeric` (SAT Math grid-in).
  const typed: ImportType | undefined = allowed.includes('open') ? 'open' : allowed.includes('numeric') ? 'numeric' : undefined;
  const fallbackType = row.choices == null && typed ? typed : 'mcq';
  let rawType = (str(row.type) || fallbackType).toLowerCase();
  // "open" vs "numeric" is the file's wording, not a different question: use
  // whichever typed kind this subject accepts.
  if ((rawType === 'open' || rawType === 'numeric') && !allowed.includes(rawType as ImportType) && typed) rawType = typed;
  if (!allowed.includes(rawType as ImportType)) {
    return `"type": "${rawType}" — this subject accepts ${allowed.join(' or ')}`;
  }
  const type = rawType as ImportType;

  const { topicId, subtopicId, tags, foreign } = rowTaxonomy(row, subject);
  if (foreign) {
    return `this looks like a ${findSubject(foreign)?.name ?? foreign} question — pick that subject (topic "${firstLabel(row, ['topic', 'topicName', 'domain', 'skill', 'skill_desc']) || topicId}")`;
  }
  const topic = findTopic(subject, topicId);
  if (!topic) return `unknown "topic": "${topicId}"`;
  const subtopic = findSubtopic(subject, topicId, subtopicId);
  if (!subtopic) return `unknown "subtopic": "${subtopicId}" under topic "${topicId}"`;

  const difficultyRaw = (normalizeDifficulty(row.difficulty) ?? (str(row.difficulty) || 'medium')).toLowerCase();
  if (!DIFFICULTY_LEVELS.includes(difficultyRaw as DifficultyName)) {
    return `unknown "difficulty": "${difficultyRaw}" — one of ${DIFFICULTY_LEVELS.join(', ')}`;
  }
  const difficulty = difficultyRaw as DifficultyName;
  const difficultyId = DIFFICULTY_ID_BY_NAME[difficulty];

  // A bare number (`"answer": 16.25`) is a valid grid-in answer, not a missing one.
  const answer = typeof row.answer === 'number' && Number.isFinite(row.answer) ? String(row.answer) : str(row.answer);
  if (!answer) return 'missing "answer"';

  const options: Record<string, { uz: string; ru: string; en: string }> = {};
  let correctValue = answer;

  if (type === 'mcq') {
    const choices = readChoices(row.choices);
    if (!choices) return 'missing "choices" (object {"A":…} or array)';
    const keys = Object.keys(choices);
    if (keys.length < 2) return `"choices" needs at least 2 entries, got ${keys.length}`;
    if (keys.some((k) => !textOf(choices[k]))) return '"choices" has an empty entry';
    const letter = answer.toUpperCase();
    if (!(letter in choices)) return `"answer": "${answer}" is not one of its own choices (${keys.join(', ')})`;
    // Content goes in the subject's language — `.en` for SAT (its runner reads
    // `.en`, docs/SAT_QUIZ.md), `.uz` for everything else.
    for (const [k, text] of Object.entries(choices)) options[k] = toLocalized(text, lang);
    correctValue = letter;
  }

  const acceptedAnswers = Array.isArray(row.acceptedAnswers)
    ? row.acceptedAnswers.map((a) => str(a)).filter(Boolean)
    : [];
  if (type === 'mcq' && acceptedAnswers.length) {
    return '"acceptedAnswers" only applies to a typed ("numeric"/"open") question';
  }

  const source = {
    question: toLocalized(row.question, lang),
    imageUrl: str(row.imageUrl) || null,
    imageStoragePath: null,

    type,
    options,
    correctAnswer: { value: correctValue, acceptedAnswers, caseSensitive: false },

    subject: { id: subject, name: subjectNode.name },
    topic: { id: topic.id, name: topic.name },
    subtopic: { id: subtopic.id, name: subtopic.name },
    chapter: { id: '', name: '' },

    difficulty: { id: difficultyId, name: difficulty },
    difficultyId,

    explanation: toLocalized(row.explanation, lang),
    hint: '',
    // The file's own tags are kept so the bank can be filtered by them later.
    tags,
    curriculum: [],
    language: [lang],
  };

  const flat = question.replace(/\s+/g, ' ');
  return {
    source,
    meta: {
      preview: flat.length > 120 ? `${flat.slice(0, 120)}…` : flat,
      type,
      topicName: topic.name,
      subtopicName: subtopic.name,
      difficulty,
    },
  };
}

/**
 * Re-validate ONE row (the fix UI, after the teacher picked a topic/answer):
 * same path as the file parse, so a fixed row is built exactly like a clean one.
 */
export function buildSatImportRow(index: number, row: RawRow, subject: ImportSubject): SatImportOk | string {
  const built = buildRow(row, subject);
  return typeof built === 'string' ? built : { index, source: built.source, ...built.meta };
}

/** Hard cap per upload. Independent of Firestore's 500-write batch cap — the
 *  page chunks the writes at that size — so this only keeps one upload reviewable. */
export const MAX_IMPORT_ROWS = 5000;

/**
 * Parse and validate a whole file. NEVER throws — a malformed file comes back
 * as `fatal`, a malformed row as an entry in `errors`, so the page can always
 * render a report instead of an error boundary.
 */
export function parseSatImport(text: string, subject: ImportSubject): SatImportReport {
  const empty: SatImportReport = { subject, ok: [], errors: [], duplicates: 0 };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { ...empty, fatal: `Not valid JSON: ${e instanceof Error ? e.message : 'parse failed'}` };
  }

  // Tolerate a wrapper object — `{"questions": [...]}` is a shape people export.
  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { questions?: unknown })?.questions)
      ? (parsed as { questions: unknown[] }).questions
      : isCollegeBoardRow(parsed) ? [parsed]
        // Anything else: the question array wherever it sits (`results`, `savollar`, nested…).
        : findQuestionList(parsed)?.list ?? null;

  if (!rows) return { ...empty, fatal: 'Expected a JSON array of questions, or {"questions": [...]}.' };
  return parseSatImportRows(rows, subject);
}

/**
 * Validate already-extracted rows — what `parseSatImport` does after reading
 * the file, and what the full-exam import (`lib/SatExamImport.ts`) calls per
 * section. `dedupe: false` there: an adaptive exam may legitimately carry the
 * same question in both Module 2 pools, and the row index must keep mapping
 * onto its module.
 */
export function parseSatImportRows(
  rows: unknown[],
  subject: ImportSubject,
  { dedupe = true }: { dedupe?: boolean } = {},
): SatImportReport {
  const empty: SatImportReport = { subject, ok: [], errors: [], duplicates: 0 };
  // `{passage, questions:[…]}` groups → one row per question.
  rows = expandQuestionGroups(rows);
  if (rows.length === 0) return { ...empty, fatal: 'The file contains no questions.' };
  if (rows.length > MAX_IMPORT_ROWS) {
    return { ...empty, fatal: `${rows.length} rows — split the file, the limit is ${MAX_IMPORT_ROWS} per upload.` };
  }

  const ok: SatImportOk[] = [];
  const errors: SatImportError[] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  rows.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      errors.push({ index, reason: 'not a JSON object', raw: {}, topic: '' });
      return;
    }
    // College Board bank rows are converted to the native shape first, so they
    // share every check below — and the fix UI seeds from the converted row.
    const row: RawRow = isCollegeBoardRow(raw) ? collegeBoardToNative(raw) : normalizeRow(raw as RawRow);

    if (dedupe) {
      const key = contentKey(row);
      if (seen.has(key)) { duplicates += 1; return; }
      seen.add(key);
    }

    const built = buildSatImportRow(index, row, subject);
    if (typeof built === 'string') { errors.push(importError(index, built, row, subject)); return; }
    ok.push(built);
  });

  return { subject, ok, errors, duplicates };
}

/** The example shown on the upload page — kept here so the docs, the UI and
 *  the validator above can never describe three different formats. */
export const SAT_IMPORT_EXAMPLE = `[
  {
    "question": "If 3x + 5 = 20, what is the value of x?",
    "type": "mcq",
    "topic": "algebra",
    "subtopic": "linear-equations",
    "difficulty": "easy",
    "choices": { "A": "3", "B": "5", "C": "7", "D": "15" },
    "answer": "B",
    "explanation": "3x = 15, so x = 5."
  },
  {
    "question": "What is the value of 65/4 as a decimal?",
    "type": "numeric",
    "topic": "problem-solving-and-data-analysis",
    "subtopic": "unit-conversion",
    "difficulty": "medium",
    "answer": "16.25",
    "acceptedAnswers": ["65/4"]
  }
]`;

/**
 * The example for THIS subject, using its own first topic/subtopic ids — the
 * shared one above uses SAT Math ids, which every other validator rejects.
 */
export function importExampleFor(subject: ImportSubject): string {
  if (subject === SAT_MATH_TAXONOMY_SLUG) return SAT_IMPORT_EXAMPLE;
  const firstTopic = findSubject(subject)?.topics[0];
  const topic = firstTopic?.id ?? '';
  const subtopic = firstTopic?.subtopics[0]?.id ?? '';
  if (subject === SAT_RW_TAXONOMY_SLUG) return `[
  {
    "question": "…passage…\\n\\nWhich choice completes the text with the most logical and precise word or phrase?",
    "type": "mcq",
    "topic": "${topic}",
    "subtopic": "${subtopic}",
    "difficulty": "medium",
    "choices": { "A": "…", "B": "…", "C": "…", "D": "…" },
    "answer": "C",
    "explanation": "…"
  }
]`;
  return `[
  {
    "question": "…savol matni…",
    "type": "mcq",
    "topic": "${topic}",
    "subtopic": "${subtopic}",
    "difficulty": "medium",
    "choices": { "A": "…", "B": "…", "C": "…", "D": "…" },
    "answer": "B",
    "explanation": "…",
    "tags": ["…"]
  },
  {
    "question": "…javobi yoziladigan savol…",
    "type": "open",
    "topic": "${topic}",
    "subtopic": "${subtopic}",
    "difficulty": "hard",
    "answer": "…",
    "acceptedAnswers": ["…"]
  }
]`;
}

/**
 * A ready-to-paste prompt for an AI chat (ChatGPT, Gemini, Claude…) that makes
 * it emit questions in exactly the format above, restricted to THIS subject's
 * taxonomy ids. Built from `data/question_topics.json` at render time, so it
 * can never list a topic/subtopic the validator would reject.
 */
export function buildImportAiPrompt(subject: ImportSubject): string {
  const node = findSubject(subject);
  const { types, lang } = importProfile(subject);
  const isSatMath = subject === SAT_MATH_TAXONOMY_SLUG;
  const isSat = isSatSubject(subject);
  const typed = types.filter((x) => x !== 'mcq');

  const tree = (node?.topics ?? [])
    .map((tp) => [
      `- topic "${tp.id}" (${tp.name})`,
      ...tp.subtopics.map((st) => `    - subtopic "${st.id}" (${st.name})`),
    ].join('\n'))
    .join('\n');

  const writer = isSat
    ? `an expert Digital SAT ${isSatMath ? 'Math' : 'Reading and Writing'} question writer`
    : `an expert Uzbek exam (Milliy sertifikat / DTM) question writer for the subject "${node?.name ?? subject}"`;
  const typeNote = isSatMath
    ? ' ("numeric" = student-produced response / grid-in)'
    : typed.length ? ` (${typed.map((x) => `"${x}"`).join('/')} = the student types the answer)` : '';

  return `You are ${writer}.

Create [N] original ${isSat ? 'SAT-style ' : ''}questions. Use ONLY the topics and subtopics listed below — do not invent new ones, and every "subtopic" must belong to the "topic" it is listed under.

[Optional: focus on topic/subtopic …, difficulty …]

ALLOWED TOPICS AND SUBTOPICS (use the quoted ids exactly):
${tree}

OUTPUT RULES:
- Return ONLY a valid JSON array — no markdown, no code fences, no commentary.
- Each object has these fields:
  - "question": the question text, in ${lang === 'en' ? 'English' : 'Uzbek (Latin script)'} (use LaTeX between $…$ for formulas)
  - "type": ${types.map((x) => `"${x}"`).join(' or ')}${typeNote}
  - "topic": one topic id from the list above
  - "subtopic": one subtopic id from that topic
  - "difficulty": one of ${DIFFICULTY_LEVELS.map((d) => `"${d}"`).join(', ')}
  - "choices": ${typed.length ? 'for "mcq" only — ' : ''}an object {"A": "…", "B": "…", "C": "…", "D": "…"}
  - "answer": ${typed.length ? `for "mcq" the correct letter ("A"–"D"); for ${typed.map((x) => `"${x}"`).join('/')} the exact answer` : 'the correct letter ("A"–"D")'}
${typed.length ? `  - "acceptedAnswers": optional, ${typed.map((x) => `"${x}"`).join('/')} only — equivalent forms, e.g. ["65/4", "16.25"]\n` : ''}  - "explanation": a short step-by-step solution${lang === 'en' ? '' : ', in Uzbek'}
  - "tags": optional — short keywords to find the question by later, e.g. ["word-problem", "calculator"]
- Exactly one choice must be correct; double-check every answer.
- Do not repeat questions. Maximum ${MAX_IMPORT_ROWS} questions.

EXAMPLE:
${importExampleFor(subject)}`;
}

/** @deprecated kept for existing callers — same as `buildImportAiPrompt`. */
export const buildSatAiPrompt = buildImportAiPrompt;

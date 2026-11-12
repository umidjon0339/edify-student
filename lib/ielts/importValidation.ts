// Single source of truth for "is this pasted JSON a valid IELTS test?".
//
// Used by BOTH:
//   • the admin JSON importer (app/admin/ielts/page.tsx) — blocks the write on any error
//   • the authoring CLI (`npm run ielts:verify`, data/ielts practise/verify.ts)
//
// It covers all four modules (reading / listening / writing / speaking) and deliberately
// re-implements the parts of the pipeline that fail *silently* rather than loudly:
//   • list_selection consumes one question number PER correct letter, so a wrong count
//     shifts every later number (renumberTest);
//   • gap tokens in summary_text / table rows / flowchart steps are POSITIONAL, so a
//     token-count ≠ answer-row-count mismatch misaligns every answer in the block;
//   • per-type `correct_answer` shapes drive lib/ielts/grading.ts — the wrong shape
//     silently grades every row wrong.
//
// Errors block the import. Warnings never do — they flag things that will still import
// but that a human should look at (missing distractors, unlocatable passage_reference…).
//
// The normalized `test` returned on success is a CLEAN object: only known fields, no
// `undefined` anywhere (Firestore rejects undefined), ids/numbering/word counts filled in.

import {
  IELTS_QUESTION_TYPES,
  type IeltsListeningPart,
  type IeltsListeningTest,
  type IeltsPassage,
  type IeltsQuestionBlock,
  type IeltsQuestionRow,
  type IeltsQuestionType,
  type IeltsReadingTest,
  type IeltsSkill,
  type IeltsSpeakingTest,
  type IeltsTextBlock,
  type IeltsWritingTest,
} from './types';
import { renumberTest, typeBreakdown } from './testSchema';

// ---------------------------------------------------------------------------
// Public shapes
// ---------------------------------------------------------------------------

export interface ImportIssue {
  /** Machine path into the pasted JSON, e.g. `passages[1].questions[2].questions[0].correct_answer`. */
  path: string;
  /** Human location, e.g. `Passage 2 · block 3 (matching_headings) · Q17`. */
  label?: string;
  message: string;
  /** How to fix it. */
  hint?: string;
}

export interface ImportSummary {
  module: IeltsSkill;
  title: string;
  testId: string;
  /** passages / parts (R/L); 2 tasks (writing); 3 parts (speaking). */
  sections: number;
  questions: number;
  timeMinutes: number;
  category?: 'academic' | 'general';
  typeBreakdown: Record<string, number>;
}

export type ImportedTest =
  | IeltsReadingTest | IeltsListeningTest | IeltsWritingTest | IeltsSpeakingTest;

export interface ImportValidationResult {
  ok: boolean;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  /** Present iff `ok` — normalized, renumbered, ready for saveIeltsTest / saveWriting|SpeakingTest. */
  test?: ImportedTest;
  summary?: ImportSummary;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const GAP_TOKEN_SPLIT = /(\[\s*\d*\s*\]|\[_\]|\[\])/g;
const isGapToken = (s: string) => /^\[\s*[\d_]*\s*\]$/.test(s);

const isStr = (v: unknown): v is string => typeof v === 'string';
const nonEmptyStr = (v: unknown): v is string => isStr(v) && v.trim().length > 0;
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Official IELTS word count: parentheticals are optional, hyphenated words count as one. */
function countWords(answer: string): number {
  return answer.replace(/\([^)]*\)/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

function countGapTokens(text: unknown): number {
  return String(text ?? '').split(GAP_TOKEN_SPLIT).filter(isGapToken).length;
}

/** Block-level option ids, whichever of the three option shapes was used. */
function optionIds(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options
    .map((o) => (isStr(o) ? o : isObj(o) ? String(o.id ?? o.label ?? '') : ''))
    .filter(Boolean);
}

const TYPE_SET = new Set<string>(IELTS_QUESTION_TYPES);

/** Blocks whose answers are typed text (word limits apply, unless a word bank is given). */
const FREE_TEXT_TYPES = new Set<IeltsQuestionType>([
  'summary_completion', 'sentence_completion', 'short_answer',
  'table_completion', 'flowchart_completion', 'diagram_completion',
]);
/** Blocks whose gap tokens live in block-level text and are positional. */
const GAP_TEXT_TYPES = new Set<IeltsQuestionType>([
  'summary_completion', 'table_completion', 'flowchart_completion',
]);
/** Blocks that accept an optional word bank in `options`. */
const WORD_BANK_TYPES = new Set<IeltsQuestionType>([
  'summary_completion', 'sentence_completion', 'table_completion',
  'flowchart_completion', 'diagram_completion',
]);

const KNOWN_ROOT_KEYS = new Set([
  'test_id', 'test_title', 'module', 'test_category', 'total_time_minutes',
  'total_questions', 'passages', 'parts', 'task1', 'task2',
  'part1Questions', 'part2CueCard', 'part3Questions',
  'teacherId', 'source', 'status', 'answers_split', 'createdAt', 'updatedAt',
]);
const KNOWN_BLOCK_KEYS = new Set([
  'type', 'instructions', 'start_question', 'end_question', 'questions', 'options',
  'word_limit', 'summary_title', 'summary_text', 'table_title', 'headers', 'rows',
  'flowchart_title', 'steps', 'diagram_title', 'diagram_url', 'diagram_alt_text',
]);
const KNOWN_ROW_KEYS = new Set([
  'question_number', 'correct_answer', 'statement', 'question_text', 'sentence',
  'sentence_start', 'target_paragraph', 'passage_reference', 'explanation', 'options',
]);

class Issues {
  errors: ImportIssue[] = [];
  warnings: ImportIssue[] = [];
  err(path: string, message: string, hint?: string, label?: string) {
    this.errors.push({ path, message, ...(hint ? { hint } : {}), ...(label ? { label } : {}) });
  }
  warn(path: string, message: string, hint?: string, label?: string) {
    this.warnings.push({ path, message, ...(hint ? { hint } : {}), ...(label ? { label } : {}) });
  }
}

/** Where the block sits, for the human-readable half of an issue. */
interface BlockCtx {
  /** `Passage 2` / `Part 3` */
  section: string;
  /** 0-based index of this block inside the section */
  index: number;
  /** Full text of the passage (reading only) — used for passage_reference locating. */
  sectionText?: string;
  /** Paragraph labels of the passage (reading only) — used for target_paragraph. */
  sectionLabels?: Set<string>;
}

// ---------------------------------------------------------------------------
// Question-block validation (reading + listening share this entirely)
// ---------------------------------------------------------------------------

interface BlockWalkState {
  /** Running global question number, exactly as renumberTest() computes it. */
  counter: number;
}

function validateBlock(
  qbRaw: unknown,
  path: string,
  ctx: BlockCtx,
  state: BlockWalkState,
  iss: Issues,
): void {
  const human = (extra?: string) =>
    `${ctx.section} · block ${ctx.index + 1}${isObj(qbRaw) && isStr(qbRaw.type) ? ` (${qbRaw.type})` : ''}${extra ? ` · ${extra}` : ''}`;

  if (!isObj(qbRaw)) {
    iss.err(path, 'must be an object', 'Each entry of `questions` is one question BLOCK.', human());
    return;
  }
  const qb = qbRaw as Record<string, unknown>;

  const type = qb.type;
  if (!isStr(type) || !TYPE_SET.has(type)) {
    iss.err(`${path}.type`, `unknown question type ${JSON.stringify(type ?? null)}`,
      `Allowed: ${IELTS_QUESTION_TYPES.join(', ')}`, human());
    return; // every later check is type-driven
  }
  const t = type as IeltsQuestionType;

  for (const k of Object.keys(qb)) {
    if (!KNOWN_BLOCK_KEYS.has(k)) {
      iss.warn(`${path}.${k}`, 'unknown field — it will be dropped on import', undefined, human());
    }
  }

  if (!nonEmptyStr(qb.instructions)) {
    iss.err(`${path}.instructions`, 'instructions required (the rubric shown above the questions)',
      'e.g. "Choose the correct letter, A, B, C or D."', human());
  }

  const rows = qb.questions;
  if (!Array.isArray(rows) || rows.length === 0) {
    iss.err(`${path}.questions`, 'a non-empty `questions` array of answer rows is required',
      'One row = one question (except list_selection, where one row spans several numbers).', human());
    return;
  }

  const blockOptIds = optionIds(qb.options);
  const hasWordBank = Array.isArray(qb.options) && qb.options.length > 0;

  // ---- block-level, per-type shape --------------------------------------
  switch (t) {
    case 'matching_headings': {
      if (!Array.isArray(qb.options) || qb.options.length === 0) {
        iss.err(`${path}.options`, 'matching_headings needs a heading list',
          'options: [{ "id": "i", "text": "Heading text" }, …] — roman numerals by convention.', human());
      } else {
        if (!qb.options.every((o) => isObj(o) && nonEmptyStr(o.id) && nonEmptyStr(o.text))) {
          iss.err(`${path}.options`, 'every heading must be { id, text } with both non-empty',
            undefined, human());
        }
        if (qb.options.length <= rows.length) {
          iss.warn(`${path}.options`, `${qb.options.length} headings for ${rows.length} paragraphs — no distractors`,
            'A real IELTS heading list has more headings than paragraphs.', human());
        }
      }
      break;
    }
    case 'matching_paragraph_information': {
      if (!Array.isArray(qb.options) || qb.options.length === 0) {
        iss.err(`${path}.options`, 'needs the list of paragraph letters',
          'options: ["A", "B", "C", …] (plain strings).', human());
      }
      break;
    }
    case 'matching_features':
    case 'matching_sentence_endings': {
      if (!Array.isArray(qb.options) || qb.options.length === 0) {
        iss.err(`${path}.options`, `${t} needs its option list`,
          'options: [{ "id": "A", "text": "…" }, …]', human());
      } else if (!qb.options.every((o) => isObj(o) && nonEmptyStr(o.id) && nonEmptyStr(o.text))) {
        iss.err(`${path}.options`, 'every option must be { id, text } with both non-empty', undefined, human());
      } else if (t === 'matching_sentence_endings' && qb.options.length <= rows.length) {
        iss.warn(`${path}.options`, `${qb.options.length} endings for ${rows.length} sentence starts — no distractors`,
          'IELTS always offers more endings than sentences.', human());
      }
      break;
    }
    case 'true_false_not_given': {
      if (qb.options != null) {
        if (!Array.isArray(qb.options) || qb.options.length === 0) {
          iss.err(`${path}.options`, 'options must be a non-empty array or omitted',
            'Omit it for the default TRUE / FALSE / NOT GIVEN, or give [{ label, description }].', human());
        } else if (!qb.options.every((o) => isObj(o) && nonEmptyStr(o.label))) {
          iss.err(`${path}.options`, 'each option must be { label, description }',
            'e.g. { "label": "YES", "description": "if the statement agrees with the writer\'s claims" }', human());
        }
      }
      break;
    }
    case 'summary_completion': {
      if (!nonEmptyStr(qb.summary_text)) {
        iss.err(`${path}.summary_text`, 'summary_text required (the paragraph containing the gaps)',
          'Mark each gap with [1], [2], … — the number inside is ignored, only the position counts.', human());
      }
      break;
    }
    case 'table_completion': {
      const headers = qb.headers;
      if (!Array.isArray(headers) || headers.length === 0 || !headers.every(isStr)) {
        iss.err(`${path}.headers`, 'headers must be a non-empty array of strings',
          'e.g. headers: ["Feature", "Detail"]', human());
      }
      const tRows = qb.rows;
      if (!Array.isArray(tRows) || tRows.length === 0) {
        iss.err(`${path}.rows`, 'rows must be a non-empty array of { cells: string[] }', undefined, human());
      } else {
        const width = Array.isArray(headers) ? headers.length : 0;
        tRows.forEach((r, i) => {
          if (!isObj(r) || !Array.isArray(r.cells) || !r.cells.every(isStr)) {
            iss.err(`${path}.rows[${i}]`, 'each row must be { "cells": ["…", "…"] }', undefined, human());
          } else if (width && r.cells.length !== width) {
            iss.err(`${path}.rows[${i}].cells`,
              `${r.cells.length} cells but headers define ${width} columns`,
              'Pad short rows with "" — the table renders as a grid.', human());
          }
        });
      }
      break;
    }
    case 'flowchart_completion': {
      if (!Array.isArray(qb.steps) || qb.steps.length === 0 || !qb.steps.every(isStr)) {
        iss.err(`${path}.steps`, 'steps must be a non-empty array of strings',
          'Each step is one box; put the gap tokens inside the step text.', human());
      }
      break;
    }
    case 'diagram_completion': {
      if (!nonEmptyStr(qb.diagram_url)) {
        // Not fatal — the runner draws a placeholder frame — but the labels are then
        // unguessable, so this is all but always an authoring mistake.
        iss.warn(`${path}.diagram_url`, 'no diagram image — students see an empty placeholder frame',
          'Upload the image to Firebase Storage (ielts_diagrams/) and paste the download URL.', human());
      } else if (!isMediaUrl(qb.diagram_url)) {
        iss.err(`${path}.diagram_url`, 'must be an absolute http(s) URL or a same-site path starting with "/"', undefined, human());
      }
      if (!nonEmptyStr(qb.diagram_alt_text)) {
        iss.warn(`${path}.diagram_alt_text`, 'no alt text — screen readers get nothing', undefined, human());
      }
      break;
    }
    case 'multiple_choice':
    case 'list_selection':
    case 'sentence_completion':
    case 'short_answer':
      break;
  }

  // word_limit
  if (qb.word_limit != null) {
    if (typeof qb.word_limit !== 'number' || !Number.isInteger(qb.word_limit) || qb.word_limit < 1 || qb.word_limit > 5) {
      iss.err(`${path}.word_limit`, 'word_limit must be a whole number between 1 and 5',
        'It is the "NO MORE THAN X WORDS" cap; the grader enforces it.', human());
    }
  } else if (FREE_TEXT_TYPES.has(t) && !hasWordBank) {
    iss.warn(`${path}.word_limit`, 'free-text block without word_limit — nothing caps a rambling answer',
      'Set word_limit to match the rubric ("NO MORE THAN TWO WORDS" → 2).', human());
  }
  if (qb.word_limit != null && hasWordBank) {
    iss.warn(`${path}.word_limit`, 'word_limit is ignored when a word bank (`options`) is given',
      undefined, human());
  }
  if (hasWordBank && !WORD_BANK_TYPES.has(t) && !['matching_headings', 'matching_paragraph_information',
    'matching_features', 'matching_sentence_endings', 'true_false_not_given'].includes(t)) {
    iss.warn(`${path}.options`, `${t} does not use a block-level option list`, undefined, human());
  }

  // ---- rows --------------------------------------------------------------
  const usedHeadings = new Map<string, number>();
  const blockStart = state.counter;

  rows.forEach((rowRaw, j) => {
    const rp = `${path}.questions[${j}]`;
    const qn = state.counter;
    const label = human(`Q${qn}`);

    if (!isObj(rowRaw)) {
      iss.err(rp, 'must be an object', undefined, label);
      state.counter += 1;
      return;
    }
    const row = rowRaw as Record<string, unknown>;

    for (const k of Object.keys(row)) {
      if (!KNOWN_ROW_KEYS.has(k)) {
        iss.warn(`${rp}.${k}`, 'unknown field — it will be dropped on import', undefined, label);
      }
    }

    // authored numbering vs what renumberTest() will actually assign
    if (row.question_number != null && row.question_number !== qn) {
      iss.warn(`${rp}.question_number`,
        `authored as ${row.question_number} but the numbering engine assigns ${qn}`,
        'Numbers are recomputed on import; a mismatch usually means a list_selection block above '
        + 'consumes more numbers than you counted (one per correct letter).', label);
    }

    const a = row.correct_answer;
    const isStrAns = nonEmptyStr(a);
    const isArrAns = Array.isArray(a) && a.length > 0 && a.every((x) => nonEmptyStr(x));
    if (!isStrAns && !isArrAns) {
      iss.err(`${rp}.correct_answer`, 'correct_answer required (non-empty string or non-empty string[])',
        'Shapes differ per type — see the structure doc for this question type.', label);
    }

    const rowOptIds = Array.isArray(row.options)
      ? row.options.map((o) => (isObj(o) ? String(o.id ?? '') : '')).filter(Boolean)
      : [];

    switch (t) {
      case 'matching_headings': {
        if (!nonEmptyStr(row.target_paragraph)) {
          iss.warn(`${rp}.target_paragraph`, 'no target_paragraph — the student sees "Paragraph ?"',
            'Set it to the passage block label ("A", "B", …).', label);
        } else if (ctx.sectionLabels && ctx.sectionLabels.size && !ctx.sectionLabels.has(row.target_paragraph)) {
          iss.err(`${rp}.target_paragraph`,
            `"${row.target_paragraph}" is not a paragraph label of this passage`,
            `Labels present: ${[...ctx.sectionLabels].join(', ') || '(none)'}`, label);
        }
        if (isStrAns) {
          if (blockOptIds.length && !blockOptIds.includes(a)) {
            iss.err(`${rp}.correct_answer`, `"${a}" is not one of this block's heading ids`,
              `Available: ${blockOptIds.join(', ')}`, label);
          }
          const prev = usedHeadings.get(a);
          if (prev != null) {
            iss.err(`${rp}.correct_answer`, `heading "${a}" is already the answer to Q${prev}`,
              'Each heading may be used once only.', label);
          } else usedHeadings.set(a, qn);
        } else if (isArrAns) {
          iss.err(`${rp}.correct_answer`, 'must be a plain string letter, not an array',
            `Use "correct_answer": "${(a as string[])[0]}"`, label);
        }
        break;
      }
      case 'matching_paragraph_information': {
        if (!nonEmptyStr(row.statement)) {
          iss.err(`${rp}.statement`, 'statement required', undefined, label);
        }
        if (isArrAns) {
          iss.err(`${rp}.correct_answer`, 'must be a plain string letter, not an array',
            `Use "correct_answer": "${(a as string[])[0]}"`, label);
        } else if (isStrAns && blockOptIds.length && !blockOptIds.includes(a)) {
          iss.err(`${rp}.correct_answer`, `"${a}" is not one of the paragraph letters offered`,
            `Available: ${blockOptIds.join(', ')}`, label);
        }
        break;
      }
      case 'matching_features':
      case 'matching_sentence_endings': {
        const textField = t === 'matching_features' ? 'statement' : 'sentence_start';
        if (!nonEmptyStr(row[textField])) {
          iss.err(`${rp}.${textField}`, `${textField} required`, undefined, label);
        }
        if (isStrAns) {
          iss.err(`${rp}.correct_answer`, 'must be a ONE-element array, not a plain string',
            `Use "correct_answer": ["${a}"]`, label);
        } else if (isArrAns) {
          const arr = a as string[];
          if (arr.length !== 1) {
            iss.err(`${rp}.correct_answer`, `${arr.length} answers given — this type takes exactly one`,
              undefined, label);
          }
          for (const x of arr) {
            if (blockOptIds.length && !blockOptIds.includes(x)) {
              iss.err(`${rp}.correct_answer`, `"${x}" is not one of this block's option ids`,
                `Available: ${blockOptIds.join(', ')}`, label);
            }
          }
        }
        break;
      }
      case 'true_false_not_given': {
        if (!nonEmptyStr(row.statement)) {
          iss.err(`${rp}.statement`, 'statement required', undefined, label);
        }
        const allowed = blockOptIds.length ? blockOptIds : ['TRUE', 'FALSE', 'NOT GIVEN'];
        if (isArrAns) {
          iss.err(`${rp}.correct_answer`, 'must be a plain string, not an array',
            `Use "correct_answer": "${(a as string[])[0]}"`, label);
        } else if (isStrAns && !allowed.includes(a)) {
          iss.err(`${rp}.correct_answer`, `"${a}" is not one of ${allowed.join(' / ')}`,
            'The answer must match an option label exactly (case-sensitive).', label);
        }
        break;
      }
      case 'multiple_choice': {
        if (!nonEmptyStr(row.question_text)) {
          iss.err(`${rp}.question_text`, 'question_text required', undefined, label);
        }
        if (!Array.isArray(row.options) || row.options.length < 2) {
          iss.err(`${rp}.options`, 'each multiple_choice row needs its own options array (≥2)',
            'options: [{ "id": "A", "text": "…" }, { "id": "B", "text": "…" }, …]', label);
        } else {
          if (!row.options.every((o) => isObj(o) && nonEmptyStr(o.id) && nonEmptyStr(o.text))) {
            iss.err(`${rp}.options`, 'every option must be { id, text } with both non-empty', undefined, label);
          }
          if (row.options.length < 3) {
            iss.warn(`${rp}.options`, `only ${row.options.length} options — IELTS MCQs offer 3–4`,
              undefined, label);
          }
          if (new Set(rowOptIds).size !== rowOptIds.length) {
            iss.err(`${rp}.options`, 'duplicate option ids', undefined, label);
          }
        }
        if (isStrAns) {
          iss.err(`${rp}.correct_answer`, 'must be a ONE-element array, not a plain string',
            `Use "correct_answer": ["${a}"]`, label);
        } else if (isArrAns) {
          const arr = a as string[];
          if (arr.length > 1) {
            iss.err(`${rp}.correct_answer`, `${arr.length} correct letters on a multiple_choice row`,
              'A "Choose TWO letters" question MUST be authored as type "list_selection" — public test '
              + 'docs carry no answers, so the student renderer detects multi-select only from a '
              + 'list_selection span and would render this single-select (unanswerable).', label);
          }
          for (const x of arr) {
            if (rowOptIds.length && !rowOptIds.includes(x)) {
              iss.err(`${rp}.correct_answer`, `"${x}" is not one of this row's option ids`,
                `Available: ${rowOptIds.join(', ')}`, label);
            }
          }
        }
        break;
      }
      case 'list_selection': {
        if (j > 0) {
          iss.warn(rp, 'a list_selection block normally holds exactly ONE row',
            'Split extra "Choose TWO letters" questions into their own blocks so the numbering stays readable.', label);
        }
        if (!nonEmptyStr(row.question_text)) {
          iss.err(`${rp}.question_text`, 'question_text required',
            'e.g. "Which TWO benefits of hedgerows are mentioned?"', label);
        }
        if (!Array.isArray(row.options) || row.options.length < 3) {
          iss.err(`${rp}.options`, 'a list_selection row needs its own options array (≥3, usually A–E)',
            undefined, label);
        } else if (!row.options.every((o) => isObj(o) && nonEmptyStr(o.id) && nonEmptyStr(o.text))) {
          iss.err(`${rp}.options`, 'every option must be { id, text } with both non-empty', undefined, label);
        }
        if (isStrAns) {
          iss.err(`${rp}.correct_answer`, 'must be an array of the correct letters',
            `Use "correct_answer": ["${a}", "…"]`, label);
        } else if (isArrAns) {
          const arr = a as string[];
          if (arr.length < 2) {
            iss.err(`${rp}.correct_answer`, 'list_selection needs at least 2 correct letters',
              'For a single-answer question use type "multiple_choice".', label);
          }
          if (new Set(arr).size !== arr.length) {
            iss.err(`${rp}.correct_answer`, 'the same letter is listed twice', undefined, label);
          }
          for (const x of arr) {
            if (rowOptIds.length && !rowOptIds.includes(x)) {
              iss.err(`${rp}.correct_answer`, `"${x}" is not one of this row's option ids`,
                `Available: ${rowOptIds.join(', ')}`, label);
            }
          }
          if (rowOptIds.length && arr.length >= rowOptIds.length) {
            iss.err(`${rp}.correct_answer`, 'every option is correct — there is nothing to choose',
              undefined, label);
          }
        }
        break;
      }
      case 'sentence_completion': {
        if (!nonEmptyStr(row.sentence)) {
          iss.err(`${rp}.sentence`, 'sentence required, containing exactly one gap token',
            'e.g. "Water clocks were used to time [1] in ancient courts."', label);
        } else {
          const gaps = countGapTokens(row.sentence);
          if (gaps !== 1) {
            iss.err(`${rp}.sentence`, `${gaps} gap tokens found — exactly 1 is required`,
              'Gap tokens are [1], [ 7 ], [_] or []. One row = one gap.', label);
          }
        }
        if (hasWordBank) {
          if (isArrAns) {
            iss.err(`${rp}.correct_answer`, 'word-bank block: the answer must be the option letter as a string',
              `Use "correct_answer": "${(a as string[])[0]}"`, label);
          } else if (isStrAns && !blockOptIds.includes(a)) {
            iss.err(`${rp}.correct_answer`, `"${a}" is not in this block's word bank`,
              `Available: ${blockOptIds.join(', ')}`, label);
          }
        } else if (isStrAns) {
          iss.err(`${rp}.correct_answer`, 'free-text answers must be an array of accepted forms',
            `Use "correct_answer": ["${a}"]`, label);
        }
        break;
      }
      case 'short_answer': {
        if (!nonEmptyStr(row.question_text)) {
          iss.err(`${rp}.question_text`, 'question_text required', undefined, label);
        }
        if (isStrAns) {
          iss.err(`${rp}.correct_answer`, 'must be an array of accepted answers',
            `Use "correct_answer": ["${a}"]`, label);
        }
        break;
      }
      case 'summary_completion':
      case 'table_completion':
      case 'flowchart_completion':
      case 'diagram_completion': {
        if (hasWordBank) {
          if (isArrAns) {
            iss.err(`${rp}.correct_answer`, 'word-bank block: the answer must be the option letter as a string',
              `Use "correct_answer": "${(a as string[])[0]}"`, label);
          } else if (isStrAns && !blockOptIds.includes(a)) {
            iss.err(`${rp}.correct_answer`, `"${a}" is not in this block's word bank`,
              `Available: ${blockOptIds.join(', ')}`, label);
          }
        } else if (isStrAns) {
          iss.err(`${rp}.correct_answer`, 'free-text answers must be an array of accepted forms',
            `Use "correct_answer": ["${a}"]`, label);
        }
        break;
      }
    }

    // free-text answer hygiene (word limit + the ≤3-letter grader trap)
    if (isArrAns && FREE_TEXT_TYPES.has(t) && !hasWordBank) {
      const arr = a as string[];
      const limit = typeof qb.word_limit === 'number' ? qb.word_limit : 0;
      for (const alt of arr) {
        if (limit) {
          const n = countWords(alt);
          if (n > limit) {
            iss.err(`${rp}.correct_answer`,
              `"${alt}" is ${n} words but word_limit is ${limit} — the grader would reject its own key`,
              'Either shorten the answer or raise word_limit to match the rubric.', label);
          }
        }
        if (t === 'summary_completion' && /^[a-z]{1,3}$/i.test(alt.trim())) {
          iss.warn(`${rp}.correct_answer`,
            `"${alt}" is ≤3 letters — the grader treats short summary_completion answers as OPTION LETTERS`,
            'Use a longer accepted form, or switch the block to a word bank.', label);
        }
        if (/\[\s*\d*\s*\]/.test(alt)) {
          iss.err(`${rp}.correct_answer`, `"${alt}" contains a gap token`,
            'Answers hold the missing words only.', label);
        }
      }
      if (new Set(arr.map((x) => x.trim().toLowerCase())).size !== arr.length) {
        iss.warn(`${rp}.correct_answer`, 'duplicate accepted answers', undefined, label);
      }
    }

    // Locate button (review page) needs the reference verbatim in the passage.
    if (row.passage_reference != null) {
      if (!isStr(row.passage_reference)) {
        iss.err(`${rp}.passage_reference`, 'must be a string', undefined, label);
      } else if (row.passage_reference.trim() && ctx.sectionText
        && !ctx.sectionText.includes(row.passage_reference)) {
        iss.warn(`${rp}.passage_reference`,
          'not found verbatim in the passage — the review page\'s "Locate" button will do nothing',
          'Copy the evidence sentence character-for-character out of the passage text.', label);
      }
    }
    if (row.explanation != null && !isStr(row.explanation)) {
      iss.err(`${rp}.explanation`, 'must be a string', undefined, label);
    }

    // advance exactly like renumberTest()
    state.counter += (t === 'list_selection' && Array.isArray(a)) ? Math.max(1, a.length) : 1;
  });

  // ---- block-level positional gap check ---------------------------------
  if (GAP_TEXT_TYPES.has(t)) {
    let gaps = 0;
    if (t === 'summary_completion') gaps = countGapTokens(qb.summary_text);
    if (t === 'table_completion') {
      for (const r of (Array.isArray(qb.rows) ? qb.rows : [])) {
        if (isObj(r) && Array.isArray(r.cells)) for (const c of r.cells) gaps += countGapTokens(c);
      }
    }
    if (t === 'flowchart_completion') {
      for (const s of (Array.isArray(qb.steps) ? qb.steps : [])) gaps += countGapTokens(s);
    }
    if (gaps !== rows.length) {
      iss.err(`${path}`, `${gaps} gap token(s) but ${rows.length} answer row(s)`,
        'Gap tokens are POSITIONAL: the i-th token maps to start_question + i. A mismatch silently '
        + 'misaligns every answer in this block.', human(`Q${blockStart}–Q${state.counter - 1}`));
    }
  }
}

function validateBlockContainer(
  blocks: unknown,
  path: string,
  ctx: Omit<BlockCtx, 'index'>,
  state: BlockWalkState,
  iss: Issues,
): void {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    iss.err(path, '`questions` must be a non-empty array of question blocks',
      'Even a passage with no questions of its own needs at least one block.', ctx.section);
    return;
  }
  blocks.forEach((qb, i) => validateBlock(qb, `${path}[${i}]`, { ...ctx, index: i }, state, iss));
}

// ---------------------------------------------------------------------------
// Normalization — build clean docs (known fields only, never undefined)
// ---------------------------------------------------------------------------

/** Hosted media: an absolute http(s) URL (Firebase Storage) or a same-site path
 *  served from the app's `public/` folder (`/ielts/listening/…/part1.mp3`).
 *  Protocol-relative `//host` is rejected — it would silently point off-site. */
function isMediaUrl(u: string): boolean {
  return /^https?:\/\//i.test(u) || /^\/(?!\/)\S+$/.test(u);
}

function cleanRow(row: Record<string, unknown>): IeltsQuestionRow {
  const out: IeltsQuestionRow = {
    question_number: 0, // renumberTest fills this in
    correct_answer: row.correct_answer as string | string[],
  };
  if (nonEmptyStr(row.statement)) out.statement = row.statement;
  if (nonEmptyStr(row.question_text)) out.question_text = row.question_text;
  if (nonEmptyStr(row.sentence)) out.sentence = row.sentence;
  if (nonEmptyStr(row.sentence_start)) out.sentence_start = row.sentence_start;
  if (nonEmptyStr(row.target_paragraph)) out.target_paragraph = row.target_paragraph;
  if (nonEmptyStr(row.passage_reference)) out.passage_reference = row.passage_reference;
  if (nonEmptyStr(row.explanation)) out.explanation = row.explanation;
  if (Array.isArray(row.options)) {
    out.options = row.options
      .filter(isObj)
      .map((o) => ({ id: String(o.id ?? ''), text: String(o.text ?? '') }));
  }
  return out;
}

function cleanBlock(qb: Record<string, unknown>): IeltsQuestionBlock {
  const out: IeltsQuestionBlock = {
    type: qb.type as IeltsQuestionType,
    instructions: String(qb.instructions ?? ''),
    start_question: 0,
    end_question: 0,
    questions: (qb.questions as Record<string, unknown>[]).map(cleanRow),
  };
  if (Array.isArray(qb.options)) out.options = qb.options as IeltsQuestionBlock['options'];
  else if (qb.options === null) out.options = null;
  if (typeof qb.word_limit === 'number') out.word_limit = qb.word_limit;
  if (nonEmptyStr(qb.summary_title)) out.summary_title = qb.summary_title;
  if (nonEmptyStr(qb.summary_text)) out.summary_text = qb.summary_text;
  if (nonEmptyStr(qb.table_title)) out.table_title = qb.table_title;
  if (Array.isArray(qb.headers)) out.headers = qb.headers.map(String);
  if (Array.isArray(qb.rows)) {
    out.rows = qb.rows.filter(isObj).map((r) => ({ cells: (r.cells as unknown[]).map(String) }));
  }
  if (nonEmptyStr(qb.flowchart_title)) out.flowchart_title = qb.flowchart_title;
  if (Array.isArray(qb.steps)) out.steps = qb.steps.map(String);
  if (nonEmptyStr(qb.diagram_title)) out.diagram_title = qb.diagram_title;
  if (nonEmptyStr(qb.diagram_url)) out.diagram_url = qb.diagram_url;
  if (nonEmptyStr(qb.diagram_alt_text)) out.diagram_alt_text = qb.diagram_alt_text;
  return out;
}

/** Deterministic-ish id derived from the title (only used when the author gave none). */
function slugId(title: string, fallback: string): string {
  const base = String(title).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || fallback;
  return `${base}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// The validator
// ---------------------------------------------------------------------------

export interface ValidateOptions {
  /** Reject a paper whose `module` is not this skill (the importer knows which tab you are on). */
  expectSkill?: IeltsSkill;
}

export function validateIeltsImport(input: unknown, opts?: ValidateOptions): ImportValidationResult {
  const iss = new Issues();

  if (!isObj(input)) {
    return {
      ok: false,
      errors: [{ path: 'root', message: 'the payload must be a single JSON object', hint: 'Paste one test, not an array.' }],
      warnings: [],
    };
  }
  const t = input as Record<string, unknown>;

  const mod = t.module;
  if (mod !== 'reading' && mod !== 'listening' && mod !== 'writing' && mod !== 'speaking') {
    return {
      ok: false,
      errors: [{
        path: 'root.module',
        message: `module must be "reading" | "listening" | "writing" | "speaking" (got ${JSON.stringify(mod ?? null)})`,
      }],
      warnings: [],
    };
  }
  const moduleName = mod as IeltsSkill;
  if (opts?.expectSkill && opts.expectSkill !== moduleName) {
    return {
      ok: false,
      errors: [{
        path: 'root.module',
        message: `this is a "${moduleName}" test but you are importing into ${opts.expectSkill}`,
        hint: `Switch to the ${moduleName} tab, or change "module" to "${opts.expectSkill}".`,
      }],
      warnings: [],
    };
  }

  // ---- root ---------------------------------------------------------------
  for (const k of Object.keys(t)) {
    if (!KNOWN_ROOT_KEYS.has(k)) {
      iss.warn(`root.${k}`, 'unknown field — it will be dropped on import');
    }
  }
  if (!nonEmptyStr(t.test_title)) {
    iss.err('root.test_title', 'test_title required', 'The name teachers and students see in the library.');
  } else if (t.test_title.length > 150) {
    iss.err('root.test_title', `title is ${t.test_title.length} characters — keep it under 150`);
  }
  if (t.test_id != null) {
    if (!nonEmptyStr(t.test_id)) {
      iss.err('root.test_id', 'test_id must be a non-empty string when present');
    } else if (!/^[A-Za-z0-9][A-Za-z0-9_-]{2,119}$/.test(t.test_id)) {
      iss.err('root.test_id',
        'test_id must be 3–120 chars of letters, digits, "_" or "-" and start with a letter/digit',
        'It becomes the Firestore document id. Re-importing the same id OVERWRITES the test.');
    }
  }
  if (t.total_time_minutes != null) {
    const n = t.total_time_minutes;
    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0 || n > 240) {
      iss.err('root.total_time_minutes', 'must be a number of minutes between 1 and 240');
    }
  }
  if (t.test_category != null) {
    if (t.test_category !== 'academic' && t.test_category !== 'general') {
      iss.err('root.test_category', 'must be "academic" or "general"',
        'Reading band tables differ between Academic and General Training.');
    } else if (moduleName === 'listening' || moduleName === 'speaking') {
      iss.warn('root.test_category', `test_category has no effect on ${moduleName}`);
    }
  } else if (moduleName === 'reading') {
    iss.warn('root.test_category', 'not set — the band table defaults to Academic',
      'Add "test_category": "academic" or "general".');
  }

  // ---- per module ---------------------------------------------------------
  const state: BlockWalkState = { counter: 1 };
  let normalized: ImportedTest | null = null;

  if (moduleName === 'reading') {
    const passages = t.passages;
    if (!Array.isArray(passages) || passages.length === 0 || passages.length > 3) {
      iss.err('root.passages', 'passages must be an array of 1–3 passages',
        'A full Academic Reading paper has exactly 3.');
    } else {
      if (passages.length !== 3) {
        iss.warn('root.passages', `${passages.length} passage(s) — a full paper has 3`);
      }
      passages.forEach((pRaw, i) => {
        const pp = `passages[${i}]`;
        const section = `Passage ${i + 1}`;
        if (!isObj(pRaw)) { iss.err(pp, 'must be an object', undefined, section); return; }
        const p = pRaw as Record<string, unknown>;
        if (!nonEmptyStr(p.title)) iss.err(`${pp}.title`, 'title required', undefined, section);
        if (p.difficulty != null && !['easy', 'medium', 'hard'].includes(String(p.difficulty))) {
          iss.err(`${pp}.difficulty`, 'must be "easy", "medium" or "hard"', undefined, section);
        }
        const labels = new Set<string>();
        let text = '';
        if (!Array.isArray(p.blocks) || p.blocks.length === 0) {
          iss.err(`${pp}.blocks`, 'blocks required — the passage text',
            'blocks: [{ "label": "A", "content": "…" }, …] — one entry per lettered paragraph.', section);
        } else {
          p.blocks.forEach((bRaw, j) => {
            const bp = `${pp}.blocks[${j}]`;
            if (!isObj(bRaw)) { iss.err(bp, 'must be an object', undefined, section); return; }
            const b = bRaw as Record<string, unknown>;
            if (!nonEmptyStr(b.content)) iss.err(`${bp}.content`, 'content required (paragraph text)', undefined, section);
            else text += `${b.content}\n`;
            if (b.label != null && !isStr(b.label)) iss.err(`${bp}.label`, 'label must be a string', undefined, section);
            else if (nonEmptyStr(b.label)) {
              if (labels.has(b.label)) {
                iss.warn(`${bp}.label`, `duplicate paragraph label "${b.label}"`, undefined, section);
              }
              labels.add(b.label);
            }
          });
        }
        validateBlockContainer(p.questions, `${pp}.questions`,
          { section, sectionText: text, sectionLabels: labels }, state, iss);
      });
    }
  } else if (moduleName === 'listening') {
    const parts = t.parts;
    if (!Array.isArray(parts) || parts.length === 0 || parts.length > 4) {
      iss.err('root.parts', 'parts must be an array of 1–4 parts', 'A full Listening paper has exactly 4.');
    } else {
      if (parts.length !== 4) iss.warn('root.parts', `${parts.length} part(s) — a full paper has 4`);
      parts.forEach((pRaw, i) => {
        const pp = `parts[${i}]`;
        const section = `Part ${i + 1}`;
        if (!isObj(pRaw)) { iss.err(pp, 'must be an object', undefined, section); return; }
        const p = pRaw as Record<string, unknown>;
        if (!nonEmptyStr(p.audio_url)) {
          iss.err(`${pp}.audio_url`, 'audio_url required — a part without audio cannot be taken',
            'Upload the mp3 to Firebase Storage (ielts_audio/{testId}/…) and paste the download URL.', section);
        } else if (!isMediaUrl(p.audio_url)) {
          iss.err(`${pp}.audio_url`, 'must be an absolute http(s) URL or a same-site path starting with "/"', undefined, section);
        }
        if (p.audio_duration_seconds != null
          && (typeof p.audio_duration_seconds !== 'number' || p.audio_duration_seconds <= 0)) {
          iss.err(`${pp}.audio_duration_seconds`, 'must be a positive number of seconds', undefined, section);
        }
        if (p.transcript != null && !isStr(p.transcript)) {
          iss.err(`${pp}.transcript`, 'transcript must be a string', undefined, section);
        }
        const transcript = isStr(p.transcript) ? p.transcript : '';
        validateBlockContainer(p.questions, `${pp}.questions`,
          { section, sectionText: transcript || undefined }, state, iss);
      });
    }
  } else if (moduleName === 'writing') {
    (['task1', 'task2'] as const).forEach((key) => {
      const raw = t[key];
      const section = key === 'task1' ? 'Task 1' : 'Task 2';
      if (!isObj(raw)) {
        iss.err(`root.${key}`, `${key} required`,
          `${key}: { "prompt": "…" } — plus an optional "imageUrl" / "modelAnswer".`, section);
        return;
      }
      const task = raw as Record<string, unknown>;
      for (const k of Object.keys(task)) {
        if (!['prompt', 'imageUrl', 'modelAnswer'].includes(k)) {
          iss.warn(`root.${key}.${k}`, 'unknown field — it will be dropped on import', undefined, section);
        }
      }
      if (!nonEmptyStr(task.prompt)) {
        iss.err(`root.${key}.prompt`, 'prompt required (the full task wording the student reads)', undefined, section);
      } else if (task.prompt.trim().length < 40) {
        iss.warn(`root.${key}.prompt`, 'prompt looks very short for an IELTS task', undefined, section);
      }
      if (task.imageUrl != null) {
        if (!nonEmptyStr(task.imageUrl)) iss.err(`root.${key}.imageUrl`, 'imageUrl must be a non-empty string when present', undefined, section);
        else if (!/^https?:\/\//i.test(task.imageUrl)) iss.err(`root.${key}.imageUrl`, 'must be an absolute http(s) URL', undefined, section);
        if (key === 'task2') iss.warn('root.task2.imageUrl', 'Task 2 is an essay — an image is unusual', undefined, section);
      } else if (key === 'task1' && t.test_category !== 'general') {
        iss.warn('root.task1.imageUrl', 'Academic Task 1 describes a chart/diagram but no imageUrl was given',
          'Upload the chart to Storage (ielts_writing/) and paste the URL.', section);
      }
      if (task.modelAnswer != null && !isStr(task.modelAnswer)) {
        iss.err(`root.${key}.modelAnswer`, 'modelAnswer must be a string', undefined, section);
      }
    });
  } else {
    // speaking
    (['part1Questions', 'part3Questions'] as const).forEach((key) => {
      const section = key === 'part1Questions' ? 'Part 1' : 'Part 3';
      const arr = t[key];
      if (!Array.isArray(arr) || arr.length === 0) {
        iss.err(`root.${key}`, `${key} must be a non-empty array of question strings`, undefined, section);
      } else {
        arr.forEach((q, i) => {
          if (!nonEmptyStr(q)) iss.err(`root.${key}[${i}]`, 'question must be a non-empty string', undefined, section);
        });
        if (arr.length < 3) iss.warn(`root.${key}`, `only ${arr.length} question(s) — ${section} usually has 4–6`, undefined, section);
      }
    });
    const cue = t.part2CueCard;
    if (!isObj(cue)) {
      iss.err('root.part2CueCard', 'part2CueCard required',
        'part2CueCard: { "topic": "Describe …", "bullets": ["…", "…"] }', 'Part 2');
    } else {
      const c = cue as Record<string, unknown>;
      for (const k of Object.keys(c)) {
        if (!['topic', 'bullets'].includes(k)) {
          iss.warn(`root.part2CueCard.${k}`, 'unknown field — it will be dropped on import', undefined, 'Part 2');
        }
      }
      if (!nonEmptyStr(c.topic)) {
        iss.err('root.part2CueCard.topic', 'topic required', 'e.g. "Describe a skill you would like to learn."', 'Part 2');
      }
      if (!Array.isArray(c.bullets) || c.bullets.length === 0) {
        iss.err('root.part2CueCard.bullets', 'bullets must be a non-empty array of strings',
          'The "You should say:" prompts.', 'Part 2');
      } else {
        c.bullets.forEach((b, i) => {
          if (!nonEmptyStr(b)) iss.err(`root.part2CueCard.bullets[${i}]`, 'bullet must be a non-empty string', undefined, 'Part 2');
        });
        if (c.bullets.length < 3) {
          iss.warn('root.part2CueCard.bullets', `only ${c.bullets.length} bullet(s) — a cue card usually has 3–4`, undefined, 'Part 2');
        }
      }
    }
  }

  if (iss.errors.length) return { ok: false, errors: iss.errors, warnings: iss.warnings };

  // ---- normalize (errors-free from here) ---------------------------------
  const testId = nonEmptyStr(t.test_id) ? t.test_id : slugId(String(t.test_title), moduleName);
  const title = String(t.test_title).trim();
  const category = t.test_category === 'general' ? 'general'
    : t.test_category === 'academic' ? 'academic' : undefined;

  if (moduleName === 'reading' || moduleName === 'listening') {
    const base = {
      test_id: testId,
      test_title: title,
      total_time_minutes: typeof t.total_time_minutes === 'number'
        ? t.total_time_minutes : (moduleName === 'reading' ? 60 : 32),
      total_questions: 0,
      teacherId: null as string | null,
      status: 'published',
      ...(category ? { test_category: category } : {}),
    };

    if (moduleName === 'reading') {
      const passages: IeltsPassage[] = (t.passages as Record<string, unknown>[]).map((p, i) => {
        const blocks: IeltsTextBlock[] = (p.blocks as Record<string, unknown>[]).map((b) => ({
          type: 'text' as const,
          label: nonEmptyStr(b.label) ? b.label : '',
          content: String(b.content),
        }));
        return {
          id: nonEmptyStr(p.id) ? p.id : `${testId}_p${i + 1}`,
          module: 'reading' as const,
          passage_number: i + 1,
          title: String(p.title).trim(),
          subtitle: nonEmptyStr(p.subtitle) ? p.subtitle : '',
          instruction: nonEmptyStr(p.instruction) ? p.instruction : '',
          difficulty: (['easy', 'medium', 'hard'].includes(String(p.difficulty))
            ? p.difficulty : 'medium') as IeltsPassage['difficulty'],
          word_count: blocks.reduce((s, b) => s + b.content.split(/\s+/).filter(Boolean).length, 0),
          blocks,
          questions: (p.questions as Record<string, unknown>[]).map(cleanBlock),
        };
      });
      normalized = { ...base, module: 'reading', passages } as IeltsReadingTest;
    } else {
      const parts: IeltsListeningPart[] = (t.parts as Record<string, unknown>[]).map((p, i) => {
        const part: IeltsListeningPart = {
          part_number: i + 1,
          audio_url: String(p.audio_url),
          questions: (p.questions as Record<string, unknown>[]).map(cleanBlock),
        };
        if (typeof p.audio_duration_seconds === 'number') part.audio_duration_seconds = p.audio_duration_seconds;
        if (nonEmptyStr(p.transcript)) part.transcript = p.transcript;
        return part;
      });
      normalized = { ...base, module: 'listening', parts } as IeltsListeningTest;
    }

    renumberTest(normalized as IeltsReadingTest | IeltsListeningTest);
    const total = (normalized as IeltsReadingTest).total_questions;
    if (total !== 40) {
      iss.warn('root', `${total} questions — a full IELTS paper has 40`,
        'Bands are extrapolated (and flagged as indicative) when the total is not 40.');
    }
    const breakdown = typeBreakdown(normalized as IeltsReadingTest | IeltsListeningTest);
    return {
      ok: true,
      errors: [],
      warnings: iss.warnings,
      test: normalized,
      summary: {
        module: moduleName,
        title,
        testId,
        sections: moduleName === 'reading'
          ? (normalized as IeltsReadingTest).passages.length
          : (normalized as IeltsListeningTest).parts.length,
        questions: total,
        timeMinutes: base.total_time_minutes,
        ...(category ? { category } : {}),
        typeBreakdown: breakdown,
      },
    };
  }

  if (moduleName === 'writing') {
    const t1 = t.task1 as Record<string, unknown>;
    const t2 = t.task2 as Record<string, unknown>;
    const test: IeltsWritingTest = {
      test_id: testId,
      test_title: title,
      module: 'writing',
      total_time_minutes: typeof t.total_time_minutes === 'number' ? t.total_time_minutes : 60,
      total_questions: 2,
      teacherId: null,
      status: 'published',
      ...(category ? { test_category: category } : {}),
      task1: {
        prompt: String(t1.prompt).trim(),
        ...(nonEmptyStr(t1.imageUrl) ? { imageUrl: t1.imageUrl } : {}),
        ...(nonEmptyStr(t1.modelAnswer) ? { modelAnswer: t1.modelAnswer } : {}),
      },
      task2: {
        prompt: String(t2.prompt).trim(),
        ...(nonEmptyStr(t2.modelAnswer) ? { modelAnswer: t2.modelAnswer } : {}),
      },
    };
    return {
      ok: true,
      errors: [],
      warnings: iss.warnings,
      test,
      summary: {
        module: moduleName, title, testId, sections: 2, questions: 2,
        timeMinutes: test.total_time_minutes,
        ...(category ? { category } : {}),
        typeBreakdown: {},
      },
    };
  }

  // speaking
  const cue = t.part2CueCard as Record<string, unknown>;
  const p1 = (t.part1Questions as string[]).map((q) => q.trim()).filter(Boolean);
  const p3 = (t.part3Questions as string[]).map((q) => q.trim()).filter(Boolean);
  const test: IeltsSpeakingTest = {
    test_id: testId,
    test_title: title,
    module: 'speaking',
    total_time_minutes: typeof t.total_time_minutes === 'number' ? t.total_time_minutes : 14,
    total_questions: p1.length + 1 + p3.length,
    teacherId: null,
    status: 'published',
    part1Questions: p1,
    part2CueCard: {
      topic: String(cue.topic).trim(),
      bullets: (cue.bullets as string[]).map((b) => b.trim()).filter(Boolean),
    },
    part3Questions: p3,
  };
  return {
    ok: true,
    errors: [],
    warnings: iss.warnings,
    test,
    summary: {
      module: moduleName, title, testId, sections: 3, questions: test.total_questions,
      timeMinutes: test.total_time_minutes, typeBreakdown: {},
    },
  };
}

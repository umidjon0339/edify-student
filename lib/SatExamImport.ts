// lib/SatExamImport.ts
//
// PURE: read the STRUCTURE of an SAT file — modules and sections — so a
// whole mock exam (or a two-section Math + R&W file) can be imported. Since
// 2026-10-31 a mock file is NOT turned into one fixed test: its questions go
// into the shared SAT PRACTICE BANK (lib/SatPractice.ts), split per section
// into the right subject, and the student's SAT page generates tests from it.
// The module split is therefore only used to find the rows; rows are validated
// by `parseSatImportRows`, the same checks as any bank import.
//
// Shapes read (first match wins, per section): module keys `{module1, module2}`
// / `module2Easier`/`module2Harder` (+ spellings `module_1`, `m1`, `easier`…);
// `modules:[…]`; a per-question `module` field; a NESTED wrapper with no module
// info (`{data:{items:[…]}}`) — split in half. A plain array or top-level
// `{questions:[…]}` is NOT a mock file unless `force` (the bank tab). Sections:
// `math` / `reading_writing` (`english`, `rw`, `verbal`…) keys, `sections:[…]`,
// or a per-question `section`/`subject` field.

import { SAT_MATH_TAXONOMY_SLUG, SAT_RW_TAXONOMY_SLUG } from '@/lib/SatMathQuiz';

export type SatExamSubject = typeof SAT_MATH_TAXONOMY_SLUG | typeof SAT_RW_TAXONOMY_SLUG;
type Json = Record<string, unknown>;

export interface SatExamSection {
  /** '' when the file does not say which — the page's selected SAT subject is used. */
  subject: SatExamSubject | '';
  module1: Json[];
  module2Easier: Json[];
  module2Harder: Json[];
  /** false = the file had ONE Module 2, served to everyone (both pools equal). */
  adaptive: boolean;
  /** How the modules were found — a guessed half split must be visible. */
  split: 'keys' | 'field' | 'half';
  module1Minutes?: number;
  module2Minutes?: number;
}

export interface SatExamLayout {
  title: string;
  description: string;
  sections: SatExamSection[];
}

const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);
const norm = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

const ROW_KEYS = ['questions', 'items', 'question_list', 'questionList', 'data'];

/** An array of question objects, directly or under a `questions`/`items` key. */
function rowsOf(v: unknown): Json[] | null {
  if (Array.isArray(v)) return v.length > 0 && v.every(isObj) ? (v as Json[]) : null;
  if (isObj(v)) for (const k of ROW_KEYS) { const r = rowsOf(v[k]); if (r) return r; }
  return null;
}

/** Minutes a module object declares about itself, if any. */
function minutesOf(v: unknown): number | undefined {
  if (!isObj(v)) return undefined;
  for (const k of ['minutes', 'time', 'duration', 'timeLimit', 'time_limit', 'durationMinutes']) {
    const n = Number(v[k]);
    if (Number.isFinite(n) && n > 0 && n <= 180) return Math.round(n);
  }
  return undefined;
}

type ModuleSlot = 'm1' | 'm2' | 'easier' | 'harder';

/** A key or a field value → which module it names, or null. */
function moduleSlot(v: unknown): ModuleSlot | null {
  const n = norm(v);
  if (!n) return null;
  if (/^(module|mod|m)?(1|one|first)$/.test(n)) return 'm1';
  const two = /^(module|mod|m)?(2|two|second)/.test(n) || /^(easy|easier|lower|harder|hard|upper)/.test(n);
  if (!two) return null;
  if (/(easy|easier|lower|low|basic)/.test(n)) return 'easier';
  if (/(hard|harder|upper|high|advanced)/.test(n)) return 'harder';
  return /^(module|mod|m)?(2|two|second)$/.test(n) ? 'm2' : null;
}

/** A key or a field value → which SAT section it names, or null. */
function sectionSubject(v: unknown): SatExamSubject | null {
  const n = norm(v);
  if (!n) return null;
  if (n === SAT_MATH_TAXONOMY_SLUG.replace(/-/g, '') || /^(sat)?(math|maths|mathematics|matematika)(section)?$/.test(n)) {
    return SAT_MATH_TAXONOMY_SLUG;
  }
  if (n === SAT_RW_TAXONOMY_SLUG.replace(/-/g, '') || n === 'rw' || n === 'ebrw' || n === 'verbal' ||
      /reading|writing|english|ingliz/.test(n)) {
    return SAT_RW_TAXONOMY_SLUG;
  }
  return null;
}

const MODULE_FIELDS = ['module', 'moduleNumber', 'module_number', 'moduleId', 'module_id', 'moduleName'];
const SECTION_FIELDS = ['section', 'sectionName', 'section_name', 'subject', 'test'];

const firstField = (row: Json, keys: string[]) => keys.map((k) => row[k]).find((v) => v != null && v !== '');

/** Assemble the three pools from whatever slots were found. */
function assemble(
  slots: Partial<Record<ModuleSlot, Json[]>>,
  split: SatExamSection['split'],
  minutes: { m1?: number; m2?: number } = {},
): Omit<SatExamSection, 'subject'> | null {
  const m1 = slots.m1;
  const easier = slots.easier ?? slots.m2 ?? slots.harder;
  const harder = slots.harder ?? slots.m2 ?? slots.easier;
  if (!m1?.length || !easier?.length || !harder?.length) return null;
  return {
    module1: m1,
    module2Easier: easier,
    module2Harder: harder,
    adaptive: easier !== harder,
    split,
    ...(minutes.m1 ? { module1Minutes: minutes.m1 } : {}),
    ...(minutes.m2 ? { module2Minutes: minutes.m2 } : {}),
  };
}

/** Group a flat row list by each row's own `module` field (every row must have one). */
function byModuleField(rows: Json[]): Omit<SatExamSection, 'subject'> | null {
  const slots: Partial<Record<ModuleSlot, Json[]>> = {};
  for (const row of rows) {
    const slot = moduleSlot(firstField(row, MODULE_FIELDS));
    if (!slot) return null;
    (slots[slot] ??= []).push(row);
  }
  return assemble(slots, 'field');
}

/** The module structure inside ONE section node (object or flat row list). */
function sectionFrom(node: unknown, allowHalf: boolean): Omit<SatExamSection, 'subject'> | null {
  if (isObj(node)) {
    // 1. module keys
    const slots: Partial<Record<ModuleSlot, Json[]>> = {};
    const minutes: { m1?: number; m2?: number } = {};
    for (const [k, v] of Object.entries(node)) {
      const slot = moduleSlot(k);
      const rows = slot && rowsOf(v);
      if (!slot || !rows) continue;
      slots[slot] = rows;
      const m = minutesOf(v);
      if (m) minutes[slot === 'm1' ? 'm1' : 'm2'] = m;
    }
    const fromKeys = assemble(slots, 'keys', minutes);
    if (fromKeys) return fromKeys;

    // 2. `modules: [...]`
    if (Array.isArray(node.modules)) {
      const list = node.modules;
      const named: Partial<Record<ModuleSlot, Json[]>> = {};
      const mins: { m1?: number; m2?: number } = {};
      let allNamed = true;
      list.forEach((entry) => {
        const slot = isObj(entry) ? moduleSlot(entry.name ?? entry.module ?? entry.id ?? entry.label ?? entry.title ?? entry.type) : null;
        if (!slot) allNamed = false;
      });
      const order: ModuleSlot[] = list.length === 2 ? ['m1', 'm2'] : ['m1', 'easier', 'harder'];
      list.forEach((entry, i) => {
        const slot = allNamed && isObj(entry)
          ? moduleSlot(entry.name ?? entry.module ?? entry.id ?? entry.label ?? entry.title ?? entry.type)!
          : order[i];
        const rows = rowsOf(entry);
        if (!slot || !rows) return;
        named[slot] = rows;
        const m = minutesOf(entry);
        if (m) mins[slot === 'm1' ? 'm1' : 'm2'] = m;
      });
      const fromList = (list.length === 2 || list.length === 3 || allNamed) ? assemble(named, 'keys', mins) : null;
      if (fromList) return fromList;
    }
  }

  // 3. per-question `module` field / 4. half split
  const rows = rowsOf(node);
  if (!rows) return null;
  const fromField = byModuleField(rows);
  if (fromField) return fromField;
  if (!allowHalf || rows.length < 2) return null;
  const mid = Math.ceil(rows.length / 2);
  return assemble({ m1: rows.slice(0, mid), m2: rows.slice(mid) }, 'half');
}

/** Container keys a full exam is commonly wrapped in. */
const WRAPPERS = ['data', 'exam', 'test', 'payload', 'result', 'content', 'practiceTest', 'practice_test'];

/**
 * Recognise a full SAT exam. Never throws.
 *
 * Default (the "questions" tab uses it to spot a mock-shaped file): returns
 * null for a plain bank file (array / `{questions}`). `force: true` (the
 * "full mock test" tab — the teacher SAID this file is one exam): a plain
 * list with no module info is accepted too, split in half (`split: 'half'`).
 */
export function detectSatExam(parsed: unknown, { force = false }: { force?: boolean } = {}): SatExamLayout | null {
  let node: unknown = parsed;
  let title = '';
  let description = '';
  let wrapped = force;

  // Unwrap containers, collecting the exam's own title on the way down.
  for (let depth = 0; depth < 4 && isObj(node); depth++) {
    const obj: Json = node;
    title ||= str(obj.title) || str(obj.name) || str(obj.testName) || str(obj.examName) || str(obj.test_name);
    description ||= str(obj.description);
    const key = WRAPPERS.find((k) => isObj(obj[k]) || (Array.isArray(obj[k]) && !rowsOf(obj.questions)));
    if (!key) break;
    node = obj[key];
    wrapped = true;
  }

  const sections: SatExamSection[] = [];
  const push = (subject: SatExamSubject | '', body: Omit<SatExamSection, 'subject'> | null) => {
    if (body) sections.push({ subject, ...body });
  };

  if (isObj(node)) {
    // Section keys: `{math:{…}, reading_writing:{…}}`.
    for (const [k, v] of Object.entries(node)) {
      const subject = sectionSubject(k);
      if (subject) push(subject, sectionFrom(v, true));
    }
    // `sections: [{name:"Math", modules:[…]}, …]`.
    if (!sections.length && Array.isArray(node.sections)) {
      for (const entry of node.sections) {
        if (!isObj(entry)) continue;
        push(sectionSubject(entry.subject ?? entry.name ?? entry.section ?? entry.title) ?? '', sectionFrom(entry, true));
      }
    }
  }

  if (!sections.length) {
    const rows = rowsOf(node);
    // Per-question `section` field splitting one flat list into two tests.
    const bySection = new Map<SatExamSubject, Json[]>();
    if (rows) {
      for (const row of rows) {
        const s = sectionSubject(firstField(row, SECTION_FIELDS));
        if (!s) { bySection.clear(); break; }
        bySection.set(s, [...(bySection.get(s) ?? []), row]);
      }
    }
    if (bySection.size > 0) {
      for (const [subject, list] of bySection) push(subject, sectionFrom(list, wrapped));
    } else {
      // A top-level array / `{questions}` with no module info stays a bank file.
      push('', sectionFrom(node, wrapped));
    }
  }

  return sections.length ? { title, description, sections } : null;
}

/** Every distinct row of ONE section, in file order (a shared Module 2 counted once). */
export const sectionAllRows = (section: SatExamSection): Json[] => [
  ...new Set([...section.module1, ...section.module2Easier, ...section.module2Harder]),
];

/** Every distinct row of every section — the questions-tab flattening of a mock-shaped file. */
export const allExamRows = (layout: SatExamLayout): Json[] => [
  ...new Set(layout.sections.flatMap(sectionAllRows)),
];

// lib/SatTaxonomyMatch.ts
//
// PURE fuzzy resolver for the SAT importer: turn whatever topic/subtopic text a
// file carries ("Linear Equations", "linear_equations", a College Board
// `skill_desc`, "quadratic") into the taxonomy's real ids. Order of trust:
// exact id → normalised id/name → synonym keywords → parent-of-matched-subtopic
// → per-topic default. Returns '' for anything it still cannot place, so the
// row lands in the error report (fix UI) rather than being invented.
//
// Used for EVERY importable subject (biologiya, kimyo, fizika…), not only SAT.
// The synonym tables are SAT-only, but each hit is checked against the
// subject's own ids, so on another subject they simply never fire. Those
// subjects' names carry numbering ("I. Umumiy kimyo") and a "Parent — Child"
// form, which `byName` handles; the per-topic default subtopic is SAT Math-only
// — elsewhere an unplaced subtopic goes to the fix UI rather than being guessed.

import { findSubject } from '@/lib/questionTopics';
import { SAT_MATH_TAXONOMY_SLUG, SAT_RW_TAXONOMY_SLUG } from '@/lib/SatMathQuiz';

const norm = (s: unknown) =>
  typeof s === 'string' ? s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '') : '';

/** Name without its list numbering: "1. Tiriklik…", "II. Anorganik kimyo" → bare name. */
const bareName = (s: string) => s.replace(/^\s*(?:\d+|[ivxlc]+)[.)]\s+/i, '');

/** The child half of a "Parent — Child" name ("Sitologiya — Hujayra tuzilishi"). */
const childName = (s: string) => s.split(/\s+[—–-]\s+/).pop() ?? s;

/** Subtopic id → keywords (tested against lower-cased text). First match wins. */
const SUBTOPIC_SYNONYMS: [RegExp, string][] = [
  [/system|simultaneous/, 'linear-system-of-equations'],
  [/linear inequalit|inequalit/, 'linear-inequalities'],
  [/linear function|slope|intercept|rate of change/, 'linear-functions'],
  [/linear equation|one variable|two variables|equation of a line|linear/, 'linear-equations'],
  [/equivalent expression|simplif|factor|expand|polynomial|binomial/, 'polynomials'],
  [/exponent|radical|root|power/, 'exponents-and-radicals'],
  [/exponential|growth|decay|compound/, 'exponential-functions'],
  [/quadratic|parabola|vertex|nonlinear equation|discriminant|zeros?\b/, 'quadratics'],
  [/function notation|nonlinear function|transformation|composite|function/, 'functions-and-function-notation'],
  [/percent|ratio|rate|proportion|%/, 'percent-ratio-and-proportion'],
  [/unit|convert|conversion|dimensional/, 'unit-conversion'],
  [/probab|chance|likel|conditional|two-way|table/, 'probability'],
  [/mean|median|mode|range|average|center|spread|standard deviation|distribution|one-variable data/, 'mean-median-mode-range'],
  [/scatter|best fit|regression|correlation|two-variable|trend/, 'scatterplots'],
  [/margin of error|outlier|inference|sample|survey|observational|experiment|statistical claim|causal|study/, 'research-organizing-margin-of-error-outliers'],
  [/area|volume|perimeter|surface|solid|prism|cylinder|cone|sphere/, 'areas-and-volumes'],
  [/right triangle|trigonometr|sine|cosine|tangent|radian|pythag|sin\b|cos\b|tan\b/, 'trigonometry'],
  [/circle|arc|chord|sector|radius|diameter|circumference/, 'circles'],
  [/similar|congruen|triangle/, 'triangles'],
  [/line|angle|parallel|perpendicular|polygon|geometry/, 'lines-and-angles'],
  [/expression/, 'expressions'],
  [/formula/, 'algebra-formulas'],
];

/** Topic id → keywords, used when the topic text itself is off. */
const TOPIC_SYNONYMS: [RegExp, string][] = [
  [/information|idea|inference|central|evidence|quantitative|command|retriev/, 'information-and-ideas'],
  [/craft|structure|words in context|vocab|purpose|cross-text|text structure|connotation/, 'craft-and-structure'],
  [/expression|rhetorical|synthesis|transition|effective language/, 'expression-of-ideas'],
  [/convention|boundar|form, structure|grammar|punctuation|agreement|verb|pronoun|sentence/, 'standard-english-conventions'],
  [/advanced|nonlinear|quadratic|polynomial|exponential|radical/, 'advanced-math'],
  [/problem|data|statistic|probab|ratio|percent|scatter/, 'problem-solving-and-data-analysis'],
  [/geometry|trig|circle|triangle|area|volume|angle/, 'geometry-and-trigonometry'],
  [/algebra|linear/, 'algebra'],
];

/** Last-resort subtopic per math topic (R&W topics have one same-named subtopic). */
const TOPIC_DEFAULT_SUBTOPIC: Record<string, string> = {
  algebra: 'linear-equations',
  'advanced-math': 'functions-and-function-notation',
  'problem-solving-and-data-analysis': 'percent-ratio-and-proportion',
  'geometry-and-trigonometry': 'lines-and-angles',
};

export interface TaxonomyMatch { topic: string; subtopic: string }

export function resolveSatTaxonomy(
  subject: string,
  topicText: string,
  subtopicText: string,
  hints: string[] = [],
): TaxonomyMatch {
  const node = findSubject(subject);
  if (!node) return { topic: '', subtopic: '' };
  const topics = node.topics;
  const clues = (extra: string[]) => [subtopicText, ...hints, ...extra].join(' | ').toLowerCase();

  const byNorm = (text: string, items: { id: string; name: string }[]) => {
    const n = norm(text);
    if (!n) return undefined;
    const exact = items.find((i) => norm(i.id) === n || norm(i.name) === n);
    if (exact) return exact.id;
    // Numbering / parent prefix dropped — only when exactly ONE item matches, so
    // a short child name shared by two parents is never filed under a guess.
    const loose = items.filter((i) => norm(bareName(i.name)) === n || norm(childName(i.name)) === n);
    if (loose.length === 1) return loose[0].id;
    // A shortened name ("Research organizing" ← "Research organizing (margin of
    // error; outliers)") — a prefix of ≥ 6 chars, again only when unique.
    const prefix = n.length >= 6 ? items.filter((i) => norm(bareName(i.name)).startsWith(n)) : [];
    return prefix.length === 1 ? prefix[0].id : undefined;
  };

  // 1. Topic: exact/normalised, else synonyms (restricted to this subject's topics).
  let topic = byNorm(topicText, topics) ?? '';
  if (!topic) {
    const hit = TOPIC_SYNONYMS.find(([re, id]) => re.test(clues([topicText])) && topics.some((t) => t.id === id));
    topic = hit?.[1] ?? '';
  }

  // 2. Subtopic: within the topic if known, else across the whole subject.
  const pool = (topic ? topics.filter((t) => t.id === topic) : topics).flatMap((t) =>
    t.subtopics.map((s) => ({ ...s, parent: t.id })),
  );
  let sub = byNorm(subtopicText, pool) ?? '';
  if (!sub) sub = SUBTOPIC_SYNONYMS.find(([re, id]) => re.test(clues([])) && pool.some((s) => s.id === id))?.[1] ?? '';

  // 3. Fill the gaps: parent from the subtopic, default subtopic from the topic.
  if (sub && !topic) topic = pool.find((s) => s.id === sub)?.parent ?? '';
  if (topic && !sub) {
    const t = topics.find((x) => x.id === topic);
    // SAT Math: per-topic default. Elsewhere only an unambiguous one (R&W's
    // single same-named subtopic); a biology topic with 20 subtopics stays ''.
    sub = subject === SAT_MATH_TAXONOMY_SLUG
      ? (TOPIC_DEFAULT_SUBTOPIC[topic] ?? t?.subtopics[0]?.id ?? '')
      : (t?.subtopics.find((s) => s.id === topic)?.id ?? (t?.subtopics.length === 1 ? t.subtopics[0].id : ''));
  }
  return { topic, subtopic: sub };
}

/** Official Digital SAT Reading & Writing SKILL names — not in our taxonomy
 *  (its R&W subtopics are the four domains), but files label rows with them. */
const RW_SKILLS = /words? in context|text structure|cross-text|central ideas?|command of evidence|inferences?|boundaries|form, structure|transitions?|rhetorical synthesis|standard english|expression of ideas|craft and structure|information and ideas/i;

/**
 * Does this label belong to the OTHER SAT subject? Returns that subject's id,
 * else null (2026-10-31). Run BEFORE the fuzzy resolver: without it a Reading &
 * Writing row imported under SAT Math ("Information and Ideas", "Command of
 * Evidence") found no exact Math topic, and the keyword synonyms then filed it
 * under Problem-Solving → Research organizing ("data", "study", "survey"…).
 * Exact id/name match against the other subject, or an R&W skill name — and
 * only when the label is NOT an exact match in the selected subject itself.
 */
export function foreignSatSubject(subject: string, labels: string[]): string | null {
  const other = subject === SAT_MATH_TAXONOMY_SLUG ? SAT_RW_TAXONOMY_SLUG
    : subject === SAT_RW_TAXONOMY_SLUG ? SAT_MATH_TAXONOMY_SLUG : '';
  if (!other) return null;
  const items = (id: string) => (findSubject(id)?.topics ?? []).flatMap((t) => [t, ...t.subtopics]);
  const own = items(subject);
  const foreign = items(other);
  for (const text of labels) {
    const n = norm(text);
    if (!n) continue;
    if (own.some((i) => norm(i.id) === n || norm(i.name) === n)) continue;
    if (foreign.some((i) => norm(i.id) === n || norm(i.name) === n)) return other;
    if (other === SAT_RW_TAXONOMY_SLUG && RW_SKILLS.test(text)) return other;
  }
  return null;
}

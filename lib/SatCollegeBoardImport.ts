// lib/SatCollegeBoardImport.ts
//
// PURE adapter: a College Board question-bank row (the `{ questionId, skill_cd,
// primary_class_cd, difficulty: "E|M|H", content: { stem, stimulus,
// answerOptions, keys, correct_answer, rationale } }` shape) → the importer's
// native row (`{ question, type, topic, subtopic, difficulty, choices, answer,
// explanation }`). `parseSatImport` runs it BEFORE validation, so a converted
// row goes through exactly the same taxonomy checks as a hand-written one.
//
// The College Board text is HTML (+ MathML). The runner renders plain text, so
// it is flattened here. Topic mapping is by the row's own domain/skill
// description; anything it cannot place is left blank so the row lands in the
// error report (where the fix UI can set it) instead of being misfiled.

type Json = Record<string, unknown>;

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', mdash: '—', ndash: '–',
  hellip: '…', minus: '−', times: '×', divide: '÷', middot: '·', deg: '°',
  plusmn: '±', le: '≤', ge: '≥', ne: '≠', pi: 'π', theta: 'θ', radic: '√',
};

const decodeEntities = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return NAMED_ENTITIES[e.toLowerCase()] ?? m;
  });

const LEAF = /<(mn|mi|mo|mtext)\b[^>]*>([^<]*)<\/\1>/;
const NODE = /<(mfrac|msup|msub|msqrt|mroot|mrow|mstyle|mpadded|mphantom|menclose|mfenced|semantics|math)\b[^>]*>((?:(?!<m(?:frac|sup|sub|sqrt|root|row|style|padded|phantom|enclose|fenced)\b|<semantics\b|<math\b)[\s\S])*?)<\/\1>/;
const G_OPEN = '\u0001';
const G_CLOSE = '\u0002';
const groupsOf = (s: string) => [...s.matchAll(/\u0001([^\u0001\u0002]*)\u0002/g)].map((g) => g[1]);

/** MathML → linear text. Innermost-first: every reduction yields one flat group. */
function mathmlToText(html: string): string {
  let out = html.replace(/<annotation[\s\S]*?<\/annotation>/g, '');
  for (let guard = 0; guard < 5000; guard++) {
    const leaf = LEAF.exec(out);
    if (leaf) {
      out = out.replace(LEAF, `${G_OPEN}${decodeEntities(leaf[2]).trim()}${G_CLOSE}`);
      continue;
    }
    const node = NODE.exec(out);
    if (!node) break;
    const g = groupsOf(node[2]);
    let text: string;
    switch (node[1]) {
      case 'mfrac': text = `(${g[0] ?? ''})/(${g[1] ?? ''})`; break;
      case 'msup': text = `${g[0] ?? ''}^(${g[1] ?? ''})`; break;
      case 'msub': text = `${g[0] ?? ''}_${g[1] ?? ''}`; break;
      case 'msqrt': text = `√(${g.join('')})`; break;
      case 'mroot': text = `root(${g[1] ?? ''}, ${g[0] ?? ''})`; break;
      default: text = g.join('');
    }
    out = out.replace(NODE, `${G_OPEN}${text}${G_CLOSE}`);
  }
  return out.replace(/[\u0001\u0002]/g, '');
}

/** HTML fragment → plain text with paragraph breaks. */
export function htmlToText(input: unknown): string {
  if (typeof input !== 'string') return '';
  let s = input
    .replace(/<span[^>]*class="[^"]*sr-only[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<math\b[\s\S]*?<\/math>/gi, (m) => mathmlToText(m))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/t[dh]>/gi, '  ')
    .replace(/<[^>]+>/g, '');
  s = decodeEntities(s).replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

/** `src` of the first `<img>` in any of the given fragments, if any. */
const firstImage = (...html: unknown[]): string => {
  for (const h of html) {
    if (typeof h !== 'string') continue;
    const m = /<img\b[^>]*\bsrc="([^"]+)"/i.exec(h);
    if (m) return decodeEntities(m[1]);
  }
  return '';
};

const DOMAIN_BY_CODE: Record<string, string> = {
  INI: 'information-and-ideas', CAS: 'craft-and-structure',
  EOI: 'expression-of-ideas', SEC: 'standard-english-conventions',
  H: 'algebra', P: 'advanced-math', Q: 'problem-solving-and-data-analysis', S: 'geometry-and-trigonometry',
};

const DIFFICULTY: Record<string, string> = { E: 'easy', M: 'medium', H: 'hard' };

/** True for a College Board bank row (the markers are `content` + a skill/domain code). */
export const isCollegeBoardRow = (row: unknown): row is Json =>
  !!row && typeof row === 'object' && !Array.isArray(row) &&
  typeof (row as Json).content === 'object' && (row as Json).content !== null &&
  !('question' in (row as Json));

/** Convert one College Board row to the native importer row. Never throws. */
export function collegeBoardToNative(row: Json): Json {
  const c = row.content as Json;

  const stimulus = htmlToText(c.stimulus);
  const stem = htmlToText(c.stem);
  const question = [stimulus, stem].filter(Boolean).join('\n\n');

  const domainCode = typeof row.primary_class_cd === 'string' ? row.primary_class_cd.toUpperCase() : '';
  // Pass what the file says; the synonym resolver fills in the real taxonomy ids
  // (`subject` is only known to the caller, so topic/subtopic stay as raw hints).
  const topic = DOMAIN_BY_CODE[domainCode] ?? '';
  const subtopic = '';

  const type = String(c.type ?? 'mcq').toLowerCase() === 'mcq' ? 'mcq' : 'numeric';
  const correct = Array.isArray(c.correct_answer) ? c.correct_answer.map((a) => String(a).trim()).filter(Boolean) : [];

  const out: Json = {
    question,
    type,
    topic,
    subtopic,
    difficulty: DIFFICULTY[String(row.difficulty ?? '').toUpperCase()] ?? 'medium',
    explanation: htmlToText(c.rationale),
    // Free-text clues for `resolveSatTaxonomy` (domain name, skill name/code).
    hints: [row.primary_class_cd_desc, row.skill_desc, row.skill_cd].filter((h) => typeof h === 'string'),
  };
  const img = firstImage(c.stimulus, c.stem);
  if (img) out.imageUrl = img;

  if (type === 'mcq') {
    const options = Array.isArray(c.answerOptions) ? (c.answerOptions as Json[]) : [];
    out.choices = options.map((o) => htmlToText(o?.content));
    // Letter from `correct_answer`; fall back to the position of `keys[0]`.
    let answer = correct[0]?.toUpperCase() ?? '';
    if (!/^[A-F]$/.test(answer)) {
      const keyId = Array.isArray(c.keys) ? c.keys[0] : undefined;
      const at = options.findIndex((o) => o?.id === keyId);
      answer = at >= 0 ? 'ABCDEF'[at] : '';
    }
    out.answer = answer;
  } else {
    out.answer = correct[0] ?? '';
    if (correct.length > 1) out.acceptedAnswers = correct.slice(1);
  }
  return out;
}

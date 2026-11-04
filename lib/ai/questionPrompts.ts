/**
 * The prompts of the teacher question generators (docs/AI.md) — ONE copy,
 * shared by the /teacher/create/* routes and the classroom-games route
 * (docs/GAMES.md), so a game asks Gemini exactly what the create page asks.
 *
 * ⚠️ Moved VERBATIM out of the create routes (2026-10-21). Changing a prompt
 * here changes it for the create page AND the games — that is the point.
 * Every route sends it with the same response schema: `[{q, o[4], e, a}]` —
 * the solution `e` BEFORE the answer index `a` (see SOLUTION_RULE).
 */

import { fixMath } from "./fixMath";

/**
 * How every generator writes `e` (2026-10-31): a worked solution, not a 15-word
 * hint. The schema puts `e` before `a`, so the AI solves first and picks the
 * answer from its own result instead of justifying a letter it already chose.
 * The solution ends with "Javob: X"; `checkMcqItems` drops a question whose X
 * is not `a`, then rewrites that tail to the option TEXT (options get shuffled
 * later, so a stored letter would point at the wrong option).
 */
export const SOLUTION_RULE = `SOLUTION RULES for "e" (write it BEFORE choosing "a"):
1. Solve the question yourself first. At most 4 short numbered steps ("1) ... 2) ..."), about 50 words in total, all on ONE line (no line breaks).
2. Show the real working: the rule/formula used, the substitution and the calculation, with the exact numbers. Never just "by the formula". For non-math subjects state the exact fact or rule and why it gives this answer.
3. Same language as the question. Wrap math in $...$ exactly like the question (double-escaped backslashes).
4. End "e" with "Javob: X" — X is the Latin letter (A, B, C or D) of the option that equals your result.
5. Then set "a" to that same option (A=0, B=1, C=2, D=3). The option text must be exactly your result; if no option matches, fix the options, never the solution.`;

export interface AiPrompt {
  prompt: string;
  temperature: number;
}

/** The input every generator gets; `count` is a number, `language` 'uz' | 'ru' | 'en'. */
interface Base {
  difficulty: string;
  count: number;
  language: string;
}

/** "Matn orqali" (`create/by_user_input`): any topic the teacher types. */
export function freePromptQuestions({ promptText, difficulty, count, language }: Base & { promptText: string }): AiPrompt {
  const diffLower = difficulty.toLowerCase();

  const difficultyDefinitions: Record<string, string> = {
    "easy": "Fundamental concepts, basic definitions, and single-step recall. Clear and direct.",
    "medium": "Intermediate level. Requires analysis, application of rules, or multi-step reasoning. Standard high-school level.",
    "hard": "Highly complex, advanced analysis. Synthesize multiple concepts to find the answer."
  };

  const activeDifficultyInstruction = difficultyDefinitions[diffLower] || difficultyDefinitions["medium"];

  // 🟢 TOKEN-SAVER PROMPT (Qisqartirilgan kalitlar va Massiv javoblar)
  const systemPrompt = `Role: Expert Academic Examiner. Generate exactly ${count} multiple-choice questions.
Language: ${language}. Difficulty: ${difficulty.toUpperCase()}.

CRITICAL DIFFICULTY RULE: ${activeDifficultyInstruction}
USER INSTRUCTION (Topic/Context): "${promptText}"

STRICT RULES:
1. Accuracy: Correct answer must be factually and mathematically flawless.
2. Distractors: The 3 incorrect options must be plausible misconceptions. Randomize the correct answer index (0-3) across the set.
3. Formatting: Wrap ALL math/variables in $ (inline) or $$ (blocks). Double-escape backslashes (e.g., \\\\frac, \\\\sqrt).

OUTPUT SCHEMA EXPLANATION:
"q" = Question text.
"o" = Array of exactly 4 option strings.
"e" = Worked solution, written BEFORE "a" (rules below).
"a" = Index of correct option (0, 1, 2, or 3) — the one your solution's "Javob" names.

${SOLUTION_RULE}`;

  return { prompt: systemPrompt, temperature: 0.25 };
}

/** "Smart AI Studiya" (`create/ai`, the abiturient path): DTM-standard questions for a subject + typed topic. */
export function dtmQuestions({ subject, topic, difficulty, count, language, context }: Base & { subject: string; topic: string; context?: string }): AiPrompt {
  let subjectSpecificRule = "";
  const lowerSubject = subject.toLowerCase();

  if (["matematika", "fizika", "kimyo", "informatika"].some(s => lowerSubject.includes(s))) {
    subjectSpecificRule = "- Yechilishi kerak bo'lgan murakkab masalalar, tenglamalar yoki mantiqiy hisoblashlarni tuzing. Shunchaki formula qanday deb so'ramang. DTM darajasidagi qiyinlikda bo'lsin.";
  } else if (["tarix", "huquq"].some(s => lowerSubject.includes(s))) {
    subjectSpecificRule = "- Aniq sanalar, xronologiya, tarixiy shaxslar ishtirok etgan tahliliy va qiyosiy savollar tuzing.";
  } else if (["ona tili", "ingliz tili", "adabiyot", "language"].some(s => lowerSubject.includes(s))) {
    subjectSpecificRule = "- Grammatika, so'z boyligi, matn tahlili yoki bo'sh joylarni to'ldirishga oid (fill-in-the-blanks) savollar tuzing. DTM grammatika qoidalariga asoslaning.";
  } else if (["biologiya", "geografiya"].some(s => lowerSubject.includes(s))) {
    subjectSpecificRule = "- O'zaro bog'liqlik, qonuniyatlar va chuqur nazariy tahlil talab qiladigan savollar tuzing.";
  } else {
    subjectSpecificRule = "- O'quvchini mantiqiy fikrlashga undaydigan chuqur tahliliy va DTM formatidagi savollar tuzing.";
  }

  // 🟢 TOKEN-SAVER PROMPT
  let systemPrompt = `Role: Expert Uzbekistan Academic Examiner (DTM Standard). Generate exactly ${count} multiple-choice questions.
Params: Lang:${language}, Diff:${difficulty}, Subject:${subject}, Topic:${topic}.

CRITICAL FORMATTING & LATEX RULES:
1. Wrap ALL math, numbers, variables, and formulas in $ (for inline) or $$ (for display/blocks). NEVER use \\( \\) or \\[ \\].
2. JSON ESCAPING: You MUST double-escape all LaTeX backslashes (e.g., \\\\frac, \\\\alpha, \\\\sqrt).
3. DTM EXAM STYLE (CRITICAL):
   ${subjectSpecificRule}
   DO NOT ask simple trivia or basic definitions.
4. QUALITY: The 3 incorrect options MUST be plausible misconceptions to test real understanding. Randomize the correct answer index (0-3).

OUTPUT SCHEMA EXPLANATION:
"q" = Question text.
"o" = Array of exactly 4 option strings.
"e" = Worked solution, written BEFORE "a" (rules below).
"a" = Index of correct option (0, 1, 2, or 3) — the one your solution's "Javob" names.

${SOLUTION_RULE}`;

  if (context && context.trim() !== "") {
    systemPrompt += `\nSTRICT CONTEXT: Base questions ONLY on this text: "${context}"`;
  }

  return { prompt: systemPrompt, temperature: 0.3 };
}

/** Ixtisoslashtirilgan maktab (`create/ixtisoslashtirilgan_maktab`). `topic` is the CLASS ("7-sinf"), as the page sends it. */
export function ixtisosQuestions({ topic, subject, difficulty, count, language, context }: Base & { topic: string; subject: string; context?: string }): AiPrompt {
  let subjectSpecificRule = "";
  const lowerSubject = subject.toLowerCase();

  if (["matematika", "fizika", "kimyo", "informatika"].some(s => lowerSubject.includes(s))) {
    subjectSpecificRule = "- Yechilishi qiyin bo'lgan, bir necha bosqichli (multi-step) masalalar va mantiqiy boshqotirmalar tuzing. O'quvchi formulani shunchaki yodlagan emas, uni qo'llay oladigan bo'lishi shart.";
  } else if (["tarix", "huquq"].some(s => lowerSubject.includes(s))) {
    subjectSpecificRule = "- Ma'lumotlarni yodlashni emas, balki voqea-hodisalarni tahlil qilishni, sabab-oqibat bog'lanishlarini topishni talab qiladigan qiyosiy savollar tuzing.";
  } else if (["ona tili", "ingliz tili", "adabiyot", "language"].some(s => lowerSubject.includes(s))) {
    subjectSpecificRule = "- Murakkab grammatik qoidalar, istisnolar (exceptions), matnni chuqur tushunish (reading comprehension) va mantiqiy tahlilga oid savollar tuzing.";
  } else {
    subjectSpecificRule = "- O'quvchining tanqidiy fikrlashini (critical thinking) tekshiradigan va chuqur tahlilni talab qiluvchi murakkab savollar tuzing.";
  }

  // 🟢 REFINED TOKEN-SAVER PROMPT
  let systemPrompt = `Act as an expert examiner for the Uzbekistan Specialized Schools curriculum.
Generate exactly ${count} multiple-choice questions.

TARGET AUDIENCE: Class ${topic}, Subject: ${subject}. Difficulty: ${difficulty}. Language: ${language}.

CURRICULUM BOUNDARIES & SPECIALIZED LOGIC:
You are generating questions for gifted students. 
- Avoid simple memory recall questions.
- ${subjectSpecificRule}

STRICT MATH & FORMAT RULES:
1. Wrap ALL math/variables in $ (inline) or $$ (blocks). Double-escape backslashes (e.g., \\\\frac).
2. The 3 incorrect options MUST represent logical traps or common miscalculations. Randomize the correct answer index (0-3).

OUTPUT SCHEMA EXPLANATION:
"q" = Question text.
"o" = Array of exactly 4 option strings.
"e" = Worked solution, written BEFORE "a" (rules below).
"a" = Index of correct option (0, 1, 2, or 3) — the one your solution's "Javob" names.

${SOLUTION_RULE}`;

  if (context && context.trim() !== "") {
    systemPrompt += `\nSTRICT CONTEXT RULES FOR THIS SUBTOPIC:\n${context}`;
  }

  return { prompt: systemPrompt, temperature: 0.35 };
}

/** Maktab (`create/maktab`) — the Gemini fallback after the local bank. `topic` is the CLASS ("6-sinf"), as the page sends it. */
export function maktabQuestions({ topic, subject, difficulty, count, language, context }: Base & { topic: string; subject: string; context?: string }): AiPrompt {
  const safeSubject = subject.toLowerCase().trim();

  // 🟢 DINAMIK FAN QOIDALARI
  let subjectSpecificRule = "";
  if (["matematika", "fizika", "kimyo", "informatika"].some(s => safeSubject.includes(s))) {
    subjectSpecificRule = "- Yechilishi kerak bo'lgan amaliy masalalar, tenglamalar yoki mantiqiy hisoblashlarni tuzing.";
  } else if (["tarix", "huquq"].some(s => safeSubject.includes(s))) {
    subjectSpecificRule = "- Aniq sanalar, tarixiy shaxslar va voqealarni tahlil qiluvchi savollar tuzing.";
  } else if (["ona tili"].some(s => safeSubject.includes(s))) {
    subjectSpecificRule = "- Grammatika qoidalari va tahlilga oid savollar tuzing.";
  } else if (["english", "ingliz tili", "ingliz"].some(s => safeSubject.includes(s))) {
    
    // 🚀 EXTREMELY STRICT ENGLISH RULES
    subjectSpecificRule = `You MUST generate a diverse mix of exactly these 4 question types. Do not use the same type for all questions.

      THE 4 ALLOWED QUESTION TYPES (t):
      1. "pure_grammar": Fill-in-the-blanks or choose the correct verb/preposition. 
      2. "pure_vocab": Match a definition to a word, or logical deduction based on vocabulary. 
      3. "translate_uz_en": Translate an Uzbek word/phrase into English.
      4. "translate_en_uz": Translate an English word/phrase into Uzbek.

      CRITICAL LANGUAGE ISOLATION RULES:
      - If 't' is "pure_grammar" or "pure_vocab": The question (q), options (o), and explanation (e) MUST BE 100% IN ENGLISH. Do NOT use a single word of Uzbek.
      - If 't' is "translate_uz_en": The question (q) is in Uzbek, but the options (o) MUST be in English.
      - If 't' is "translate_en_uz": The question (q) is in English, but the options (o) MUST be in Uzbek.
      - Never use phrases like "in the picture" or "according to the audio".`;
    
  } else if (["musiqa", "musiqiy savodxonlik", "musiqa madaniyati"].some(s => safeSubject.includes(s))) {
    subjectSpecificRule = `MUSIQA FANI UCHUN QAT'IY QOIDALAR:
      1. Qo'shiq yoki she'r qatorlarini yoddan davom ettirishni so'raydigan savollar (masalan: "keyingi qatorni toping") QAT'IYAN TAQIQLANADI. AI o'zbek she'rlarini xato to'qib chiqarishi mumkin.
      2. Asosiy e'tiborni berilgan Kontekstdagi qahramonlar tahlili, qo'shiqning tarbiyaviy ma'nosi (Moral) va kayfiyatiga qarating.
      3. Musiqa nazariyasi so'ralganda cholg'u asboblarining turlari (torli, zarbli, puflama), dinamika (qattiq/sekin), temp va registr bo'yicha mantiqiy savollar tuzing.`;
  // 👆 ============================= 👆

  } else {
    subjectSpecificRule = "- O'quvchini mantiqiy fikrlashga undaydigan va darslikka to'liq mos keladigan savollar tuzing.";
  }

  // 🟢 TOKEN SAVER PROMPT (Qisqartirilgan kalitlar va Massiv javoblar)
  let systemPrompt = `Act as an expert examiner for the Uzbekistan public school system (Maktab).
Generate exactly ${count} multiple-choice questions.

TARGET AUDIENCE: Class ${topic}, Subject: ${subject}. Difficulty: ${difficulty}. Language: ${language}.

CURRICULUM BOUNDARIES & STYLE:
1. You are generating questions purely based on the curriculum topic name. Ensure the logic strictly aligns with what a ${topic} student in Uzbekistan learns in ${subject}. Do not use concepts from higher grades.
2. ${subjectSpecificRule}
3. The 3 incorrect options MUST be plausible misconceptions. Randomize the correct answer index (0-3) across the set.

STRICT MATH/SCIENCE FORMATTING (CRITICAL):
1. Wrap ALL math, numbers, variables, and equations in $ (for inline) or $$ (for display/blocks). NEVER use \\( \\) or \\[ \\].
2. JSON ESCAPING: You MUST double-escape all LaTeX commands (e.g., \\\\frac, \\\\alpha).

OUTPUT SCHEMA EXPLANATION:
"q" = Question text.
"o" = Array of exactly 4 option strings.
"e" = Worked solution, written BEFORE "a" (rules below).
"a" = Index of correct option (0, 1, 2, or 3) — the one your solution's "Javob" names.

${SOLUTION_RULE}`;

  if (context && context.trim() !== "") {
    systemPrompt += `\nSTRICT CONTEXT RULES FOR THIS SUBTOPIC:\n${context}`;
  }

  return { prompt: systemPrompt, temperature: 0.25 };
}

/** One of the 4 official digital SAT Math domains, by their English name (see
 *  `SAT_MATH_DOMAINS` in lib/SatMathQuiz.ts — NOT free text). */
const SAT_DOMAIN_SCOPE: Record<string, string> = {
  "Algebra": "Linear equations and inequalities in one or two variables, systems of two linear equations, linear functions.",
  "Advanced Math": "Equivalent expressions, nonlinear equations and systems, nonlinear functions (quadratic, exponential, polynomial, rational).",
  "Problem-Solving and Data Analysis": "Ratios/rates/proportions/percentages, one- and two-variable data (tables, scatterplots, two-way tables), probability and statistics — ALWAYS wrapped in a short real-world scenario, never a bare equation.",
  "Geometry and Trigonometry": "Area and volume, lines/angles/triangles (incl. congruence/similarity), right-triangle trigonometry, circles (incl. radians).",
};

/**
 * `/teacher/sat/math` → "AI bilan yaratish" (2026-11-01, docs/SAT_QUIZ.md).
 * One official digital SAT Math domain at a time, matching the real exam's
 * own style (short, self-contained, calculator-neutral). Always English — the
 * digital SAT is administered in English only, same reason `SatRunner`'s own
 * chrome stopped being trilingual (docs/SAT_QUIZ.md).
 */
export function satMathQuestions({ domain, difficulty, count }: { domain: string; difficulty: string; count: number }): AiPrompt {
  const scope = SAT_DOMAIN_SCOPE[domain] ?? SAT_DOMAIN_SCOPE["Algebra"];

  const systemPrompt = `Role: Official digital SAT Math item writer (College Board style). Generate exactly ${count} multiple-choice questions.
Domain: ${domain}. Difficulty: ${difficulty.toUpperCase()}. Language: English only (the digital SAT is administered in English).

DOMAIN SCOPE: ${scope}
Stay inside this domain only — do not drift into another SAT Math domain's topics.

STYLE RULES (match the real digital SAT Math, not a generic exam):
1. Each question is short and self-contained: one scenario or equation, one clear question, no padding.
2. Calculator-neutral: solvable with or without a graphing calculator; never require a feature only a specific calculator has.
3. Exactly 4 answer choices. The 3 incorrect ones must be plausible results of ONE common error (sign slip, wrong operation, misread condition) — never random unrelated numbers.
4. Wrap ALL math, numbers, variables and equations in $ (inline) or $$ (block). Double-escape LaTeX backslashes (e.g. \\\\frac, \\\\sqrt).
5. Randomize the correct option's index (0-3) across the set — do not always put it first.

OUTPUT SCHEMA:
"q" = Question text.
"o" = Array of exactly 4 option strings.
"e" = Worked solution, written BEFORE "a" (rules below).
"a" = Index of correct option (0, 1, 2 or 3) — the one your solution's "Answer" names.

${SOLUTION_RULE}`;

  return { prompt: systemPrompt, temperature: 0.3 };
}

/** One generated question: stem, 4 options, worked solution, correct index. */
export interface McqItem {
  q: string;
  o: string[];
  e: string;
  a: number;
}

/**
 * The response schema every MCQ generator above is sent with (create routes + games).
 * ⚠️ Key order matters: `e` (solution) before `a` (answer). Claude/DeepSeek follow
 * the `properties` order; Gemini sorts keys alphabetically unless `propertyOrdering` is set.
 */
export const MCQ_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      q: { type: "STRING" },
      o: { type: "ARRAY", items: { type: "STRING" } },
      e: { type: "STRING" },
      a: { type: "INTEGER" },
    },
    required: ["q", "o", "e", "a"],
    propertyOrdering: ["q", "o", "e", "a"],
  },
};

/** The word the stored solution ends with, by question language. */
const ANSWER_WORD: Record<string, string> = { uz: "Javob", ru: "Ответ", en: "Answer" };
/** "Javob: B" (also "Ответ:"/"Answer:", "B)", "(B)") — the letter the solution concluded. */
const ANSWER_MARK = /(?:[Jj]avob|JAVOB|[Оо]твет|[Aa]nswer)\s*[:：]?\s*\(?([A-D])(?![A-Za-z])/g;

/**
 * Keeps only questions whose solution agrees with the marked answer, and turns the
 * solution's "Javob: B" into "Javob: <option text>". A solution without the mark
 * cannot be checked and is kept as written.
 */
export function checkMcqItems(items: McqItem[], language: string): McqItem[] {
  const word = ANSWER_WORD[language] ?? ANSWER_WORD.uz;
  return items.flatMap((item) => {
    const e = String(item.e ?? "");
    const marks = [...e.matchAll(ANSWER_MARK)];
    const mark = marks[marks.length - 1];
    if (!mark) return [item];
    if ("ABCD".indexOf(mark[1]) !== Number(item.a)) {
      console.warn(`AI question dropped: solution says ${mark[1]}, answer index is ${item.a} — "${String(item.q).slice(0, 80)}"`);
      return [];
    }
    const steps = e.slice(0, mark.index).trim().replace(/[\s.,;:—-]+$/, "");
    const answer = `${word}: ${item.o?.[Number(item.a)] ?? ""}`;
    return [{ ...item, e: steps ? `${steps}. ${answer}` : answer }];
  });
}

/** Generated questions with any math the AI left bare wrapped in `$…$` (see lib/ai/fixMath.ts). */
export const cleanMcqItems = (items: McqItem[]): McqItem[] =>
  (Array.isArray(items) ? items : []).map((it) => ({
    ...it,
    q: fixMath(it.q ?? ""),
    o: Array.isArray(it.o) ? it.o.map((o) => fixMath(String(o ?? ""))) : it.o,
    e: fixMath(it.e ?? ""),
  }));

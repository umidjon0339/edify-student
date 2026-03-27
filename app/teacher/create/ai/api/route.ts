import { NextResponse } from 'next/server';
import { jsonrepair } from 'jsonrepair'; // 🟢 JSON healer preserved

export async function POST(req: Request) {
  try {
    // 🟢 1. Extract all inputs, including the new optional 'context' and 'language'
    const { topic, chapter, subtopic, difficulty, count, language = "uz", context } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing in .env.local" }, { status: 500 });
    }

    // 🟢 2. DYNAMIC PERSONAS (Minified)
    const categoryPersonas: Record<string, string> = {
      "5_sinf": `Target: 5th-grade (10-11yo). Tone: Simple. Math Rule: NO negative numbers, complex fractions, or advanced algebra unless in context.`,
      "algebra": `Target: High school/University applicants (Abituriyentlar). Tone: Academic. Math Rule: Advanced algebra, multi-step equations, university-entrance difficulty.`,
      "geometriya": `Target: High school/University applicants (Abituriyentlar). Tone: Academic. Math Rule: Advanced theorems, complex spatial reasoning, proofs.`
    };

    const activePersona = categoryPersonas[topic] || `Target: General math students. Adjust difficulty by subtopic.`;

    // 🟢 3. BUILD THE BASE PROMPT (Compressed Structure)
    let systemPrompt = `Act as an expert Uzbekistan Math Teacher. Generate exactly ${count} multiple-choice questions.
Params: Lang:${language}, Diff:${difficulty}, Topic:${topic}, Chapter:${chapter}, Subtopic:${subtopic}.
${activePersona}`;

    // 🟢 4. STRICT VS CREATIVE (Minified)
    if (context && context.trim() !== "") {
      systemPrompt += `\nSTRICT CONTEXT: Base questions ONLY on this text. Mimic its exact style/scope. Do not invent outside concepts. Text: "${context}"`;
    } else {
      systemPrompt += `\nCREATIVE MODE: Use standard Uzbekistan national curriculum for this subtopic.`;
    }

    // 🟢 5. MATH & JSON RULES (Highly Compressed)
    systemPrompt += `
RULES:
1. Accuracy: Correct answer must be mathematically flawless.
2. Distractors: The 3 wrong options must be common student mistakes.
3. Randomize: The 'answer' key (A, B, C, D) must be randomized.
4. Brevity: 'explanation' max 2 sentences.
5. Dollar Signs: Wrap ALL math, variables, and numbers in single $. (e.g., $x=2$).
6. JSON LATEX ESCAPING (CRITICAL): MUST double-escape all LaTeX to prevent JSON parsing crashes. Use \\\\frac, \\\\pi, \\\\sin x, \\\\begin{cases}. NEVER use single backslashes.

Output RAW JSON array only. No markdown.
Schema:
[{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"..."}]`;

    // 🟢 6. FETCH FROM GEMINI (Your existing robust setup)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.2, 
          responseMimeType: "application/json", 
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error?.message || "Failed to fetch from Gemini");

    let generatedText = data.candidates[0].content.parts[0].text;
    let sanitizedText = generatedText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    let rawAiQuestions;

    // 🟢 7. PARSE & REPAIR (Your existing brilliant logic)
    try {
      rawAiQuestions = JSON.parse(sanitizedText);
    } catch (parseError) {
      console.warn("Standard parse failed. Engaging jsonrepair...");
      try {
        const repairedJson = jsonrepair(sanitizedText);
        rawAiQuestions = JSON.parse(repairedJson);
      } catch (repairError) {
        throw new Error("AI output was too corrupted to repair.");
      }
    }

    // 🟢 8. MAP TO DATABASE SCHEMA
    const formattedQuestions = rawAiQuestions.map((q: any) => ({
      id: `tq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      uiDifficulty: difficulty,
      question: { uz: q.question, ru: "", en: "" },
      options: {
        A: { uz: q.options.A, ru: "", en: "" },
        B: { uz: q.options.B, ru: "", en: "" },
        C: { uz: q.options.C, ru: "", en: "" },
        D: { uz: q.options.D, ru: "", en: "" }
      },
      answer: q.answer,
      explanation: { uz: q.explanation, ru: "", en: "" }
    }));

    return NextResponse.json({ questions: formattedQuestions });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate questions" }, { status: 500 });
  }
}

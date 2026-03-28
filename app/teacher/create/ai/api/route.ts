import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { topic, chapter, subtopic, difficulty, count, language = "uz", context } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing in .env.local" }, { status: 500 });
    }

    const categoryPersonas: Record<string, string> = {
      "5_sinf": `Target: 5th-grade. Use simple integer math. No complex algebra.`,
      "algebra": `Target: High school/University applicants. Use advanced equations.`,
      "geometriya": `Target: Geometry students. Use theorems and spatial proofs.`
    };

    const activePersona = categoryPersonas[topic] || `Target: General math students.`;

    // PROMPT FIX: Added Quality & Logic rules for solvable questions, 
    // unpredictable distractors, and short explanations.
    let systemPrompt = `Act as an expert Uzbekistan Math Teacher. Generate exactly ${count} multiple-choice questions.
Params: Lang:${language}, Diff:${difficulty}, Topic:${topic}, Chapter:${chapter}, Subtopic:${subtopic}.
${activePersona}

STRICT MATH & JSON RULES:
1. Wrap EVERY math symbol, variable, or formula in $ signs for inline math (e.g., $x=2$) or $$ for display math.
2. Because you are outputting JSON, you MUST double-escape all LaTeX backslashes. 
   - Write \\\\frac instead of \\frac
   - Write \\\\sqrt instead of \\sqrt
   - Write \\\\infty instead of \\infty
3. The 'answer' must match exactly one of the options (A, B, C, or D).

QUALITY & LOGIC RULES:
1. Solvability: Every question MUST be 100% mathematically correct, logically sound, and definitively solvable. There must be exactly one correct answer.
2. Unpredictable Options: Wrong options (distractors) MUST NOT be random. They must represent common student errors (e.g., missed signs, partial steps). Avoid obvious outliers so the answer isn't guessable.
3. Concise Explanation: The 'explanation' field MUST be extremely concise, strictly under 30 words.

Output RAW JSON array only.
Schema:
[{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"..."}]`;

    if (context && context.trim() !== "") {
      systemPrompt += `\nSTRICT CONTEXT: Base questions ONLY on this text: "${context}"`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.3, // Kept low to ensure logical math generation
          responseMimeType: "application/json", 
        }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Gemini API Error");

    let generatedText = data.candidates[0].content.parts[0].text;
    let rawAiQuestions;
    
    try {
      rawAiQuestions = JSON.parse(generatedText);
    } catch (parseError) {
      console.error("Failed to parse JSON directly. Attempting cleanup.", parseError);
      const cleaned = generatedText.replace(/```json/gi, '').replace(/```/g, '').trim();
      rawAiQuestions = JSON.parse(cleaned);
    }

    const diffVal = difficulty.toLowerCase() === "easy" ? 1 : difficulty.toLowerCase() === "medium" ? 2 : 3;

    const formattedQuestions = rawAiQuestions.map((q: any) => ({
      id: `tq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      uiDifficulty: difficulty,
      question: { uz: q.question || "", ru: "", en: "" },
      options: {
        A: { uz: q.options?.A || "", ru: "", en: "" },
        B: { uz: q.options?.B || "", ru: "", en: "" },
        C: { uz: q.options?.C || "", ru: "", en: "" },
        D: { uz: q.options?.D || "", ru: "", en: "" }
      },
      answer: q.answer || "A",
      explanation: { uz: q.explanation || "", ru: "", en: "" }
    }));

    return NextResponse.json({ questions: formattedQuestions });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { subject, topic, chapter, subtopic, difficulty, count, language = "uz", context } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing in .env.local" }, { status: 500 });
    }

    const categoryPersonas: Record<string, string> = {
      "5-sinf": `Target: 5th-grade. Use simple integer math. No complex algebra.`,
      "Abiturient": `Target: High school graduates/University applicants. Use advanced logic and DTM standards.`,
      "algebra": `Target: Advanced equations and functions.`,
      "geometriya": `Target: Geometry students. Use theorems and spatial proofs.`
    };

    const activePersona = categoryPersonas[topic] || categoryPersonas[subject] || `Target: General students. Ensure strict logical accuracy.`;

    let systemPrompt = `Act as an expert Uzbekistan Examiner. Generate exactly ${count} multiple-choice questions.
Params: Lang:${language}, Diff:${difficulty}, Subject:${subject}, Topic:${topic}, Chapter:${chapter}, Subtopic:${subtopic}.
${activePersona}

STRICT MATH & JSON RULES:
1. Wrap ALL math symbols, variables, numbers, and formulas in $ signs (e.g., $x=2$).
2. JSON ESCAPING: You MUST double-escape all LaTeX backslashes inside the JSON string. Write \\\\frac instead of \\frac.

QUALITY & LOGIC RULES:
1. Solvability: Questions MUST be 100% mathematically correct and solvable.
2. Unpredictable Options: Wrong options MUST be common student errors, not random numbers.

OUTPUT FORMAT: You MUST return a RAW JSON array matching this exact structure (Notice the $ signs and \\\\ double backslashes!):
[
  {
    "question": "Tengsizlikni yeching: $ \\\\sin x \\\\ge \\\\cos x $",
    "options": {
      "A": "$ [ \\\\frac{\\\\pi}{4} + \\\\pi k; \\\\frac{3\\\\pi}{4} + \\\\pi k ], k \\\\in Z $",
      "B": "$ x = 5 $",
      "C": "$ y = \\\\sqrt{2} $",
      "D": "$ 0 $"
    },
    "answer": "A",
    "explanation": "Kiritilgan burchak qiymatlari tekshirildi."
  }
]`;
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

    // 🟢 THE FIX: Safely map all 4 levels of difficulty here!
    let diffVal = 2; // Default to medium just in case
    const lowerDiff = difficulty ? difficulty.toLowerCase() : "medium";
    
    if (lowerDiff === "easy") diffVal = 1;
    else if (lowerDiff === "medium") diffVal = 2;
    else if (lowerDiff === "hard") diffVal = 3;
    else if (lowerDiff === "olympiad") diffVal = 4;

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
      explanation: { uz: q.explanation || "", ru: "", en: "" },
      difficultyId: diffVal // 🟢 Perfectly assigned 1, 2, 3, or 4
    }));

    return NextResponse.json({ questions: formattedQuestions });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
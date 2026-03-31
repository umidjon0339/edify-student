import { NextResponse } from 'next/server';
import { jsonrepair } from 'jsonrepair';

// 🟢 AI LIMIT BLOCK START
import { consumeAiCredits } from "@/lib/ai/aiLimitsHelper"; 
// 🔴 AI LIMIT BLOCK END

export async function POST(req: Request) {
  try {
    const { userId, subject, topic, chapter, subtopic, difficulty, count, language = "uz", context } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing in .env.local" }, { status: 500 });
    }

    // ==========================================
    // 🟢 AI LIMIT BLOCK START: Step 1 - Check only
    // ==========================================
    if (!userId) {
      return NextResponse.json({ error: "Foydalanuvchi tasdiqlanmadi (User ID missing)" }, { status: 401 });
    }

    const limitCheck = await consumeAiCredits(userId, count, false); // false = check only
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.error }, { status: 402 }); 
    }
    // 🔴 AI LIMIT BLOCK END
    // ==========================================

    const categoryPersonas: Record<string, string> = {
      "5-sinf": `Target: 5th-grade. Use simple integer math. No complex algebra.`,
      "Abiturient": `Target: High school graduates/University applicants. Use advanced logic and DTM standards.`,
      "algebra": `Target: Advanced equations and functions.`,
      "geometriya": `Target: Geometry students. Use theorems and spatial proofs.`
    };

    const activePersona = categoryPersonas[topic] || categoryPersonas[subject] || `Target: General students. Ensure strict logical accuracy.`;

    let systemPrompt = `Role: Expert Uzbekistan Academic Examiner. Generate exactly ${count} multiple-choice questions.
Params: Lang:${language}, Diff:${difficulty}, Subject:${subject}, Topic:${topic}, Chapter:${chapter}, Subtopic:${subtopic}.
${activePersona}

CRITICAL FORMATTING & LATEX RULES:
1. No newlines (\\n). Use single quotes ('') inside text.
2. Wrap ALL math, numbers, variables, and formulas in $ (for inline) or $$ (for display/blocks). NEVER use \\( \\) or \\[ \\].
3. Systems of equations MUST use: $$ \\\\begin{cases} x+y=2 \\\\\\\\ x-y=0 \\\\end{cases} $$
4. JSON ESCAPING: You MUST double-escape all LaTeX backslashes so the JSON does not break. (e.g., write \\\\frac instead of \\frac, write \\\\alpha instead of \\alpha).
5. Solvability: Questions MUST be 100% mathematically/factually correct and solvable. Randomize 'answer' (A-D).

Output RAW JSON array ONLY. No markdown.
Schema: [{"question":"","options":{"A":"","B":"","C":"","D":""},"answer":"A","explanation":""}]`;

    if (context && context.trim() !== "") {
      systemPrompt += `\nSTRICT CONTEXT: Base questions ONLY on this text: "${context}"`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.3, 
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
      
      try {
        rawAiQuestions = JSON.parse(cleaned);
      } catch (repairError) {
        try {
          const repairedJson = jsonrepair(cleaned);
          rawAiQuestions = JSON.parse(repairedJson);
        } catch (finalError) {
           throw new Error("AI output was too corrupted to repair.");
        }
      }
    }

    let diffVal = 2; 
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
      difficultyId: diffVal
    }));

    // ==========================================
    // 🟢 AI LIMIT BLOCK START: Step 2 - Deduct!
    // ==========================================
    await consumeAiCredits(userId, count, true); // true = deduct credits
    // 🔴 AI LIMIT BLOCK END
    // ==========================================

    return NextResponse.json({ questions: formattedQuestions });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
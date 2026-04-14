import { NextResponse } from 'next/server';
import { jsonrepair } from 'jsonrepair';

// 🟢 AI LIMIT BLOCK START
import { consumeAiCredits } from "@/lib/ai/aiLimitsHelper"; 
// 🔴 AI LIMIT BLOCK END

export async function POST(req: Request) {
  try {
    const { userId, subject, topic, difficulty, count, language = "uz", context } = await req.json();

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

    let systemPrompt = `Role: Expert Uzbekistan Academic Examiner (DTM Standard). Generate exactly ${count} multiple-choice questions.
Params: Lang:${language}, Diff:${difficulty}, Subject:${subject}, Topic:${topic}.

CRITICAL FORMATTING, LATEX & QUALITY RULES:
1. No newlines (\\n). Use single quotes ('') inside text.
2. Wrap ALL math, numbers, variables, and formulas in $ (for inline) or $$ (for display/blocks). NEVER use \\( \\) or \\[ \\].
3. Systems of equations MUST use: $$ \\\\begin{cases} x+y=2 \\\\\\\\ x-y=0 \\\\end{cases} $$
4. JSON ESCAPING: You MUST double-escape all LaTeX backslashes so the JSON does not break. (e.g., write \\\\frac instead of \\frac, write \\\\alpha instead of \\alpha).
5. DTM EXAM STYLE (CRITICAL): Questions MUST strictly mimic real Uzbekistan DTM university entrance exams. DO NOT ask simple trivia, definitions, or "what is the formula for X". 
   - For Physics, Math, Chemistry: Create realistic word problems, situational tasks, and multi-step calculations with specific numerical values. The student MUST calculate to find the answer.
   - For Biology, History, Languages: Use deep analytical, contextual, or comparative questions.
6. QUALITY: Options must be highly plausible to test real understanding. Randomize the correct 'answer' (A-D) across the set.
7. TOKEN ECONOMY: The 'explanation' field MUST be extremely concise, strictly 1-2 sentences maximum. Only provide the core logic, translation, or formula used.

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
          temperature: 0.4, // Slightly higher to allow creative problem generation
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
    await consumeAiCredits(userId, count, true); 
    // 🔴 AI LIMIT BLOCK END
    // ==========================================

    return NextResponse.json({ questions: formattedQuestions });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
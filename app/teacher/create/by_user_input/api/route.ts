import { NextResponse } from 'next/server';
import { jsonrepair } from 'jsonrepair';

// 🟢 AI LIMIT BLOCK START
import { consumeAiCredits } from "@/lib/ai/aiLimitsHelper"; 
// 🔴 AI LIMIT BLOCK END

export async function POST(req: Request) {
  try {
    const { userId, promptText, difficulty, count, language = "uz" } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing in .env.local" }, { status: 500 });
    }

    // =========================================================================
    // 🟢 AI LIMIT BLOCK START: Step 1 - GATEKEEPER CHECK (Do NOT deduct yet)
    // =========================================================================
    if (!userId) {
      return NextResponse.json({ error: "Foydalanuvchi tasdiqlanmadi (User ID missing)" }, { status: 401 });
    }
    
    // deduct: false -> "Just check if they have enough, don't update Firebase yet"
    const limitCheck = await consumeAiCredits(userId, count, false); 
    
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.error }, { status: 402 }); 
    }
    // 🔴 AI LIMIT BLOCK END
    // =========================================================================

    // 🟢 UNIVERSAL DIFFICULTY DEFINITIONS: Works for Math, History, Biology, etc.
    const difficultyDefinitions: Record<string, string> = {
      "Easy": "Fundamental concepts, basic definitions, and single-step recall. Clear and direct.",
      "Medium": "Intermediate level. Requires analysis, application of rules, or multi-step reasoning. Standard high-school level.",
      "Hard": "Highly complex, advanced analysis. University entrance exam or Olympiad level. Synthesize multiple concepts to find the answer."
    };

    const activeDifficultyInstruction = difficultyDefinitions[difficulty] || difficultyDefinitions["Medium"];

    // 🟢 REFINED UNIVERSAL PROMPT: Subject-agnostic, with conditional strict LaTeX rules
    const systemPrompt = `Role: Expert Academic Examiner. Generate exactly ${count} multiple-choice questions.
Language: ${language}. Difficulty: ${difficulty.toUpperCase()}.

CRITICAL DIFFICULTY RULE: ${activeDifficultyInstruction}
USER INSTRUCTION (Topic/Context): "${promptText}"

RULES:
1. Accuracy: Correct answer must be factually and/or mathematically flawless.
2. Distractors: The 3 wrong options must be common student mistakes or plausible misconceptions.
3. Randomize: The 'answer' key (A, B, C, D) must be randomized.
4. STRICT MATH/SCIENCE FORMATTING (If applicable): 
   - If the questions involve math, physics, or chemistry, wrap ALL formulas, numbers, and variables in $ (for inline) or $$ (for display/blocks). NEVER use \\( \\) or \\[ \\].
   - Systems of equations MUST use: $$ \\\\begin{cases} x+y=2 \\\\\\\\ x-y=0 \\\\end{cases} $$
   - Matrices MUST use: $$ \\\\begin{pmatrix} 1 & 2 \\\\\\\\ 3 & 4 \\\\end{pmatrix} $$
   - Integrals/Limits MUST use: $ \\\\int_{0}^{1} x dx $ or $ \\\\lim_{x \\\\to \\\\infty} $
5. JSON ESCAPING (CRITICAL): You MUST double-escape all LaTeX commands (e.g., write \\\\frac instead of \\frac).
6. NO NEWLINES: Do not use \\n. Write explanations as a single continuous line. Max 2 sentences.

Output RAW JSON array only. No markdown.
Schema: [{"question":"","options":{"A":"","B":"","C":"","D":""},"answer":"A","explanation":"(no more that 1 sentences)"}]`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.1, 
          responseMimeType: "application/json", 
        }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Failed to fetch from Gemini");

    let generatedText = data.candidates[0].content.parts[0].text;
    let parsedJSON;

    try {
      parsedJSON = JSON.parse(generatedText);
    } catch (initialParseError) {
      console.warn("Initial JSON parse failed, attempting cleanup...");
      
      let sanitizedText = generatedText.replace(/```json/gi, '').replace(/```/g, '').trim();
      sanitizedText = sanitizedText.replace(/\\\\\\\\/g, '\\\\'); 
      sanitizedText = sanitizedText.replace(/(?<!\\)\\([a-zA-Z]+)/g, '\\\\$1'); 
      sanitizedText = sanitizedText.replace(/\\'/g, "'"); 
      sanitizedText = sanitizedText.replace(/\\n/g, ' ').replace(/\n/g, ' '); 

      try {
        parsedJSON = JSON.parse(sanitizedText);
      } catch (parseError) {
        try {
          const repairedJson = jsonrepair(sanitizedText);
          parsedJSON = JSON.parse(repairedJson);
        } catch (repairError) {
          throw new Error("AI output was too corrupted to repair.");
        }
      }
    }

    let rawAiQuestions = [];
    if (Array.isArray(parsedJSON)) {
      rawAiQuestions = parsedJSON;
    } else if (parsedJSON.questions && Array.isArray(parsedJSON.questions)) {
      rawAiQuestions = parsedJSON.questions;
    } else if (typeof parsedJSON === 'object') {
      rawAiQuestions = [parsedJSON];
    }

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

    // =========================================================================
    // 🟢 AI LIMIT BLOCK START: Step 2 - SUCCESS! DEDUCT THE CREDITS NOW
    // =========================================================================
    // deduct: true -> We know it succeeded, so actually deduct the credits!
    await consumeAiCredits(userId, count, true);
    // 🔴 AI LIMIT BLOCK END
    // =========================================================================

    return NextResponse.json({ questions: formattedQuestions });

  } catch (error: any) {
    // If Gemini crashes, the code jumps here. Credits are NOT deducted!
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate questions" }, { status: 500 });
  }
}
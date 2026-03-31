import { NextResponse } from 'next/server';
import { jsonrepair } from 'jsonrepair';

// 🟢 AI LIMIT BLOCK START
import { consumeAiCredits } from "@/lib/ai/aiLimitsHelper"; 
// 🔴 AI LIMIT BLOCK END

export async function POST(req: Request) {
  try {
    const { userId, images, promptText, difficulty, count, language = "uz" } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing" }, { status: 500 });
    }

    // =========================================================================
    // 🟢 AI LIMIT BLOCK START: Step 1 - GATEKEEPER CHECK (Do NOT deduct yet)
    // =========================================================================
    if (!userId) {
      return NextResponse.json({ error: "Foydalanuvchi tasdiqlanmadi (User ID missing)" }, { status: 401 });
    }
    
    // Notice the 'false' parameter here! It means "just check the math, don't update Firebase yet"
    const limitCheck = await consumeAiCredits(userId, count, false); 
    
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.error }, { status: 402 }); 
    }
    // 🔴 AI LIMIT BLOCK END
    // =========================================================================


    if (!images || images.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const systemPrompt = `Role: Expert Academic Examiner. Generate exactly ${count} multiple-choice questions based on the image content.
Lang: ${language}. Diff: ${difficulty}. Instruction: "${promptText || 'Extract main concepts'}".

CRITICAL RULES:
1. GUARDRAIL: If image is NOT educational, academic, or text-based, output EXACTLY: {"error": "invalid_image"}
2. STANDALONE: NEVER say "Rasmdagi" or "In the image". Questions must make sense without seeing the photo.
3. FORMATTING: No newlines (\\n). Use single quotes ('') inside text.
4. STRICT MATH LATEX RULES (CRITICAL): 
   - Wrap ALL math/numbers/variables in $ (for inline) or $$ (for display/blocks).
   - NEVER use \\( \\) or \\[ \\].
   - Systems of equations MUST use: $$ \\\\begin{cases} x+y=2 \\\\\\\\ x-y=0 \\\\end{cases} $$
   - Matrices MUST use: $$ \\\\begin{pmatrix} 1 & 2 \\\\\\\\ 3 & 4 \\\\end{pmatrix} $$
   - Integrals/Limits MUST use: $ \\\\int_{0}^{1} x dx $ or $ \\\\lim_{x \\\\to \\\\infty} $
5. JSON ESCAPING: You MUST double-escape all LaTeX backslashes so the JSON does not break. (e.g., write \\\\frac instead of \\frac, write \\\\alpha instead of \\alpha).
6. CONTENT: 1 correct answer, 3 plausible distractors. Randomize 'answer' (A-D). Max 2 sentence 'explanation'.

Output RAW JSON array ONLY. No markdown.
Schema: [{"question":"","options":{"A":"","B":"","C":"","D":""},"answer":"A","explanation":""}]`;

    const requestParts: any[] = [{ text: systemPrompt }];

    images.forEach((imgBase64: string) => {
      const mimeType = imgBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || "image/jpeg";
      const base64Data = imgBase64.split(',')[1];
      requestParts.push({
        inlineData: { data: base64Data, mimeType: mimeType }
      });
    });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: requestParts }],
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

    // 🟢 If the AI says the image is invalid, the code stops here! 
    // The credits are NEVER deducted, which is exactly what we want.
    if (parsedJSON.error === "invalid_image") {
      return NextResponse.json({ error: "invalid_image" }, { status: 400 });
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
    // By the time we reach this line, we know the JSON is valid, the image was good, 
    // and the questions are formatted perfectly. Now we actually deduct the count!
    // Notice the 'true' parameter here!
    await consumeAiCredits(userId, count, true);
    // 🔴 AI LIMIT BLOCK END
    // =========================================================================

    return NextResponse.json({ questions: formattedQuestions });

  } catch (error: any) {
    // 🟢 If the Gemini API crashes or times out, the code jumps here.
    // The bottom consumeAiCredits(..., true) is skipped, and credits are saved!
    console.error("AI Image Generation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate questions" }, { status: 500 });
  }
}
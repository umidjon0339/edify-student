import { NextResponse } from 'next/server';
import { checkUserPermission, deductMonthlyAiCredits } from "@/lib/ai/featureGatekeeper"; 

export async function POST(req: Request) {
  try {
    const { userId, images, promptText, difficulty, count, language = "uz" } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY is missing" }, { status: 500 });

    if (!userId) return NextResponse.json({ error: "Foydalanuvchi tasdiqlanmadi (User ID missing)" }, { status: 401 });

    // =========================================================================
    // 🟢 GATEKEEPER CHECK: Ensure they have 'IMAGE_AI' feature AND enough limits
    // =========================================================================
    const permission = await checkUserPermission(userId, 'IMAGE_AI', count);
    
    if (!permission.allowed) {
      return NextResponse.json({ 
        error: permission.error, 
        code: permission.code 
      }, { status: 403 }); 
    }
    // =========================================================================

    if (!images || images.length === 0) return NextResponse.json({ error: "No images provided" }, { status: 400 });

    const diffLower = difficulty.toLowerCase();
    const diffVal = diffLower === "easy" ? 1 : diffLower === "hard" ? 3 : 2;

    // 🟢 TOKEN-SAVER PROMPT WITH ERROR HANDLING
    const systemPrompt = `Role: Expert Academic Examiner. Generate exactly ${count} multiple-choice questions based on the educational content of the provided image(s).
Language: ${language}. Difficulty: ${difficulty}. 
Teacher's Instruction: "${promptText || 'Identify the core concepts and generate questions that test deep understanding and application.'}".

CRITICAL INSTRUCTION BY SUBJECT TYPE:
- MATH/PHYSICS (Formulas/Equations): Do NOT just ask what the formula is. Generate novel, solvable problems that require the student to APPLY the formulas seen in the image.
- TEXT/READING (History, Literature, Sciences): Test critical thinking, main ideas, and vocabulary. 
- DIAGRAMS (Biology, Geography, etc.): Test the functions, relationships, and identification of the components shown.

STRICT RULES:
1. GUARDRAIL (CRITICAL): If the image is NOT educational, academic, or text-based, set the "error" property to "invalid_image" and leave "items" empty.
2. STANDALONE CONTEXT (CRITICAL): The student taking the test will NOT see this image. NEVER use phrases like "Rasmdagi", "As shown in the image". You MUST extract the necessary context from the image and embed it directly into the question text.
3. HIGH-QUALITY DISTRACTORS: Incorrect options must be highly plausible logical traps. Randomize the correct answer index (0-3).
4. MATH/LATEX FORMATTING: Wrap ALL math symbols/equations in $ (inline) or $$ (display block). Double-escape backslashes (e.g., \\\\frac, \\\\alpha).
5. EXPLANATION: Max 15 words. Keep it extremely concise.

OUTPUT SCHEMA EXPLANATION:
"error" = "invalid_image" (ONLY if the image is inappropriate/not educational).
"items" = Array of questions.
"q" = Question text.
"o" = Array of exactly 4 option strings.
"a" = Index of correct option (0, 1, 2, or 3).
"e" = Explanation (Max 15 words).`;

    const requestParts: any[] = [{ text: systemPrompt }];

    images.forEach((imgBase64: string) => {
      const mimeType = imgBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || "image/jpeg";
      const base64Data = imgBase64.split(',')[1];
      requestParts.push({ inlineData: { data: base64Data, mimeType: mimeType } });
    });

    // 🟢 GEMINI API WITH ADVANCED OBJECT RESPONSE SCHEMA
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: requestParts }],
        generationConfig: { 
          temperature: 0.1, 
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              error: { type: "STRING" }, // Xavfsizlik qoidasi uchun
              items: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    q: { type: "STRING" },
                    o: { type: "ARRAY", items: { type: "STRING" } }, // Qisqa Array
                    a: { type: "INTEGER" }, // Javob indeksi
                    e: { type: "STRING" }
                  },
                  required: ["q", "o", "a", "e"]
                }
              }
            }
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Failed to fetch from Gemini");

    let generatedText = data.candidates[0].content.parts[0].text;
    
    // 🟢 Direct Safe Parse
    const parsedJSON = JSON.parse(generatedText);

    // Rasm ta'limga oid bo'lmasa, Gatekeeper orqali to'xtatamiz
    if (parsedJSON.error === "invalid_image") {
      return NextResponse.json({ error: "invalid_image" }, { status: 400 });
    }

    const rawAiQuestions = parsedJSON.items || [];
    if (rawAiQuestions.length === 0) throw new Error("AI savol yarata olmadi.");

    // 🟢 MAP MINIFIED SCHEMA TO FRONTEND FORMAT
    const letterMap = ["A", "B", "C", "D"];

    const formattedQuestions = rawAiQuestions.map((item: any) => ({
      id: `tq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: "mcq",
      points: 2,
      uiDifficulty: difficulty,
      difficultyId: diffVal,
      question: { uz: item.q || "" },
      options: {
        A: { uz: item.o[0] || "" },
        B: { uz: item.o[1] || "" },
        C: { uz: item.o[2] || "" },
        D: { uz: item.o[3] || "" }
      },
      answer: letterMap[item.a] || "A",
      explanation: { uz: item.e || "" }
    }));

    // =========================================================================
    // 🟢 DEDUCTION LOGIC: Deduct credits based on what was ACTUALLY generated
    // =========================================================================
    await deductMonthlyAiCredits(userId, formattedQuestions.length);

    return NextResponse.json({ questions: formattedQuestions });

  } catch (error: any) {
    console.error("AI Image Generation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate questions" }, { status: 500 });
  }
}
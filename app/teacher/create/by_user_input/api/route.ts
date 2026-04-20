import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin'; 
import { deductMonthlyAiCredits } from "@/lib/ai/featureGatekeeper"; 

// 🟢 jsonrepair importi butunlay olib tashlandi, u endi umuman kerak emas!

export async function POST(req: Request) {
  try {
    const { userId, promptText, difficulty, count, language = "uz" } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing in .env.local" }, { status: 500 });
    }

    if (!userId) {
      return NextResponse.json({ error: "Foydalanuvchi tasdiqlanmadi (User ID missing)" }, { status: 401 });
    }

    // =========================================================================
    // 🟢 LIMIT CHECK ONLY: Open to everyone, respects their monthly limits
    // =========================================================================
    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();
    
    if (userSnap.exists) {
      const userData = userSnap.data();
      const monthlyLimit = userData?.currentLimits?.monthlyAiQuestions || 100;
      const aiUsed = userData?.usage?.aiQuestionsUsed || 0;
      const isUnlimited = monthlyLimit >= 5000;

      if (!isUnlimited && (aiUsed + count > monthlyLimit)) {
        return NextResponse.json({ 
          error: "Oylik AI limitingiz yetarli emas.",
          code: 'LIMIT_REACHED' 
        }, { status: 403 }); 
      }
    }
    // =========================================================================

    const diffLower = difficulty.toLowerCase();
    const diffVal = diffLower === "easy" ? 1 : diffLower === "hard" ? 3 : 2;

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
4. EXPLANATION: Max 15 words. Explain the core logic briefly. Must be plain text.

OUTPUT SCHEMA EXPLANATION:
"q" = Question text.
"o" = Array of exactly 4 option strings.
"a" = Index of correct option (0, 1, 2, or 3).
"e" = Explanation (Max 15 words).`;

    // 🟢 GEMINI API CALL WITH MINIFIED RESPONSE SCHEMA
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.25, 
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                q: { type: "STRING" },
                o: { type: "ARRAY", items: { type: "STRING" } }, // 🟢 Options are an Array
                a: { type: "INTEGER" }, // 🟢 Answer is an Index
                e: { type: "STRING" }   // 🟢 Guarantees Explanation is ONLY a string (fixes {"uz":""} bug)
              },
              required: ["q", "o", "a", "e"]
            }
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Failed to fetch from Gemini");

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) throw new Error("AI kutilmagan javob qaytardi. Qayta urinib ko'ring.");

    // 🟢 SAFE DIRECT PARSE: AI majburiy Schema bilan qaytargani uchun hech qanday qotish yoki regex kerak emas
    const rawAiQuestions = JSON.parse(generatedText);

    // 🟢 MAP TO STANDARD FRONTEND FORMAT
    const letterMap = ["A", "B", "C", "D"];

    const formattedQuestions = rawAiQuestions.map((item: any) => ({
      id: `tq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: "mcq",
      points: 2,
      uiDifficulty: difficulty,
      difficultyId: diffVal,
      subject: "by_prompt",
      topic: "by_prompt",
      chapter: "by_prompt",
      subtopic: "by_prompt",
      question: { uz: item.q || "" },
      options: {
        A: { uz: item.o[0] || "" },
        B: { uz: item.o[1] || "" },
        C: { uz: item.o[2] || "" },
        D: { uz: item.o[3] || "" }
      },
      answer: letterMap[item.a] || "A", // Indeksni (0-3) Harfga (A-D) o'giramiz
      explanation: { uz: item.e || "" } 
    }));

    // =========================================================================
    // 🟢 DEDUCTION LOGIC: Deduct limits securely
    // =========================================================================
    await deductMonthlyAiCredits(userId, formattedQuestions.length);

    return NextResponse.json({ questions: formattedQuestions });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate questions" }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin'; 
import { deductMonthlyAiCredits } from "@/lib/ai/featureGatekeeper"; 

export async function POST(req: Request) {
  try {
    const { userId, subject, topic, difficulty, count, language = "uz", context } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing in .env.local" }, { status: 500 });
    }

    if (!userId) {
      return NextResponse.json({ error: "Foydalanuvchi tasdiqlanmadi (User ID missing)" }, { status: 401 });
    }

    // ==========================================
    // 🟢 LIMIT CHECK ONLY (Accessible to everyone)
    // ==========================================
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
    // ==========================================

    // 🟢 DTM SUBJECT-SPECIFIC RULES (Fanga qarab dinamik mantiq)
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
5. EXPLANATION: Max 15 words. Strictly plain text. Give the core logic or formula used.

OUTPUT SCHEMA EXPLANATION:
"q" = Question text.
"o" = Array of exactly 4 option strings.
"a" = Index of correct option (0, 1, 2, or 3).
"e" = Explanation (Max 15 words plain text).`;

    if (context && context.trim() !== "") {
      systemPrompt += `\nSTRICT CONTEXT: Base questions ONLY on this text: "${context}"`;
    }

    // 🟢 GEMINI API WITH MINIFIED RESPONSE SCHEMA
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                q: { type: "STRING" },
                o: { type: "ARRAY", items: { type: "STRING" } }, // Javoblar Array formatida
                a: { type: "INTEGER" }, // To'g'ri javob indeksi
                e: { type: "STRING" }   // 🟢 Xato tuzatildi: "e" qat'iy STRING formatida bo'lishi shart!
              },
              required: ["q", "o", "a", "e"]
            }
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Gemini API Error");

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) throw new Error("AI javob qaytarmadi.");

    // 🟢 SCHEMA kafolati bo'lgani uchun to'g'ridan-to'g'ri parse qilamiz (jsonrepair kerak emas)
    const rawAiQuestions = JSON.parse(generatedText);

    let diffVal = 2; 
    const lowerDiff = difficulty ? difficulty.toLowerCase() : "medium";
    if (lowerDiff === "easy") diffVal = 1;
    else if (lowerDiff === "hard") diffVal = 3;
    else if (lowerDiff === "olympiad") diffVal = 4;

    // Harf xaritasi (0 -> A, 1 -> B ...)
    const letterMap = ["A", "B", "C", "D"];

    // 🟢 MAP MINIFIED JSON TO FRONTEND FORMAT
    const formattedQuestions = rawAiQuestions.map((item: any) => ({
      id: `tq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      uiDifficulty: difficulty,
      difficultyId: diffVal,
      question: { uz: item.q || "", ru: "", en: "" },
      options: {
        A: { uz: item.o[0] || "", ru: "", en: "" },
        B: { uz: item.o[1] || "", ru: "", en: "" },
        C: { uz: item.o[2] || "", ru: "", en: "" },
        D: { uz: item.o[3] || "", ru: "", en: "" }
      },
      answer: letterMap[item.a] || "A", // Indeksni harfga aylantirish
      explanation: { uz: item.e || "", ru: "", en: "" } // 🟢 "e" endi aniq yozuv bo'lib tushadi
    }));

    // ==========================================
    // 🟢 AI LIMIT DEDUCTION
    // ==========================================
    await deductMonthlyAiCredits(userId, formattedQuestions.length);
    // ==========================================

    return NextResponse.json({ questions: formattedQuestions });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
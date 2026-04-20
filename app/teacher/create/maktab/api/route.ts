import { NextResponse } from 'next/server';

// 🟢 NEW: Admin DB and the Deduction Gatekeeper
import { adminDb } from '@/lib/firebaseAdmin';
import { deductMonthlyAiCredits } from "@/lib/ai/featureGatekeeper";

// 🟢 1. IMPORT THE REGISTRY (Loaded instantly into RAM on Vercel boot)
import dbRegistry from "@/data/local_dbs/structure.json";

// 🟢 2. GLOBAL RAM CACHE
const localDbCache: Record<string, any[]> = {};

// 🟢 3. YOUR FIREBASE BUCKET
const BUCKET_NAME = "scanqr-64512.firebasestorage.app";

const shuffleArray = (array: any[]) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => ({})); 
    const { 
      userId, 
      topic = "", 
      subject = "", 
      chapter = "", 
      subtopic = "", 
      difficulty = "medium", 
      count = 5, 
      language = "uz", 
      context = "" 
    } = payload;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

    if (!userId) return NextResponse.json({ error: "Foydalanuvchi tasdiqlanmadi" }, { status: 401 });
    
    // =========================================================================
    // 🟢 LIMIT CHECK ONLY (Accessible to everyone, checks Monthly Limits)
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

    // =========================================================================
    // 🚀 ULTRA-FAST FIREBASE STORAGE INTERCEPTOR (WITH RAM CACHING)
    // =========================================================================
    const safeSubject = subject.toLowerCase().trim();
    const safeGrade = topic.toLowerCase().trim();

    // @ts-ignore
    const availableGradesForSubject = dbRegistry[safeSubject];

    if (availableGradesForSubject && availableGradesForSubject.includes(safeGrade)) {
      try {
        const cacheKey = `${safeSubject}_${safeGrade}`;
        let localDatabase = localDbCache[cacheKey];

        if (!localDatabase) {
          const encodedPath = encodeURIComponent(`local_dbs/${safeSubject}/${safeGrade}.json`);
          const firebaseUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodedPath}?alt=media`;

          const res = await fetch(firebaseUrl);
          if (!res.ok) throw new Error(`Firebase Storage'dan topilmadi: ${res.statusText}`);
          
          localDatabase = await res.json();
          localDbCache[cacheKey] = localDatabase; 
        }

        let matchedQuestions = localDatabase.filter((q: any) => 
          q.chapter === chapter && q.subtopic === subtopic
        );

        if (matchedQuestions.length > 0) {
          matchedQuestions = shuffleArray(matchedQuestions);
          const selectedQuestions = matchedQuestions.slice(0, count);

          // ⚠️ Local DB format parses standard JSON
          const formattedQuestions = selectedQuestions.map((q: any) => ({
            id: `tq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            type: "mcq",
            points: 2,
            uiDifficulty: difficulty, 
            difficultyId: diffVal,
            question: { uz: q.question?.[language] || q.question?.uz || q.question || "Savol topilmadi" },
            options: {
              A: { uz: q.options?.A?.[language] || q.options?.A?.uz || q.options?.A || "A" },
              B: { uz: q.options?.B?.[language] || q.options?.B?.uz || q.options?.B || "B" },
              C: { uz: q.options?.C?.[language] || q.options?.C?.uz || q.options?.C || "C" },
              D: { uz: q.options?.D?.[language] || q.options?.D?.uz || q.options?.D || "D" }
            },
            answer: q.answer || "A",
            explanation: { uz: q.explanation?.uz || q.explanation || "" } 
          }));

          await new Promise(resolve => setTimeout(resolve, 3500));
          
          // 🟢 Deduct limits securely for cached questions
          await deductMonthlyAiCredits(userId, formattedQuestions.length);

          return NextResponse.json({ questions: formattedQuestions });
        }
      } catch (err) {
        console.error(`Firebase Storage Error for ${safeSubject} ${safeGrade}:`, err);
      }
    }
    // =========================================================================

    // =========================================================================
    // 🔴 TOKEN-SAVER GEMINI AI GENERATION (WITH MINIFIED SCHEMA)
    // =========================================================================
    
    // 🟢 DINAMIK FAN QOIDALARI
    let subjectSpecificRule = "";
    if (["matematika", "fizika", "kimyo", "informatika"].some(s => safeSubject.includes(s))) {
      subjectSpecificRule = "- Yechilishi kerak bo'lgan amaliy masalalar, tenglamalar yoki mantiqiy hisoblashlarni tuzing. Shunchaki qoidani so'ramang.";
    } else if (["tarix", "huquq"].some(s => safeSubject.includes(s))) {
      subjectSpecificRule = "- Aniq sanalar, tarixiy shaxslar va voqealarning sabab-oqibatlarini tahlil qiluvchi savollar tuzing.";
    } else if (["ona tili", "ingliz tili", "adabiyot"].some(s => safeSubject.includes(s))) {
      subjectSpecificRule = "- Grammatika qoidalari, so'z boyligi, tahlil yoki bo'sh joylarni to'ldirishga oid (fill-in-the-blanks) savollar tuzing.";
    } else {
      subjectSpecificRule = "- O'quvchini mantiqiy fikrlashga undaydigan va darslikka to'liq mos keladigan savollar tuzing.";
    }

    // 🟢 TOKEN SAVER PROMPT (Qisqartirilgan kalitlar va Massiv javoblar)
    let systemPrompt = `Act as an expert examiner for the Uzbekistan public school system (Maktab).
Generate exactly ${count} multiple-choice questions.

TARGET AUDIENCE: Class ${topic}, Subject: ${subject}. Difficulty: ${difficulty}. Language: ${language}.

CURRICULUM BOUNDARIES & STYLE:
1. You are generating questions purely based on the curriculum topic name. Ensure the logic strictly aligns with what a ${topic} student in Uzbekistan learns in ${subject}. Do not use concepts from higher grades.
2. ${subjectSpecificRule}
3. The 3 incorrect options MUST be plausible misconceptions. Randomize the correct answer index (0-3) across the set.

STRICT MATH/SCIENCE FORMATTING (CRITICAL):
1. Wrap ALL math, numbers, variables, and equations in $ (for inline) or $$ (for display/blocks). NEVER use \\( \\) or \\[ \\].
2. JSON ESCAPING: You MUST double-escape all LaTeX commands (e.g., \\\\frac, \\\\alpha).
3. EXPLANATION: Max 15 words! Extremely concise core logic.

OUTPUT SCHEMA EXPLANATION:
"q" = Question text.
"o" = Array of exactly 4 option strings.
"a" = Index of correct option (0, 1, 2, or 3).
"e" = Explanation (Max 15 words).`;

    if (context && context.trim() !== "") {
      systemPrompt += `\nSTRICT CONTEXT RULES FOR THIS SUBTOPIC:\n${context}`;
    }

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
                o: { type: "ARRAY", items: { type: "STRING" } }, // 🟢 Options are now an Array!
                a: { type: "INTEGER" }, // 🟢 Answer is just a number (0-3)
                e: { type: "STRING" }
              },
              required: ["q", "o", "a", "e"]
            }
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Gemini Error");

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      throw new Error(data.candidates?.[0]?.finishReason === "SAFETY" 
        ? "AI xavfsizlik filtri: Bu mavzu bo'yicha savol tuzish taqiqlangan." 
        : "AI kutilmagan javob qaytardi. Qayta urinib ko'ring.");
    }

    // 🟢 SCHEMA kafolati bilan to'g'ridan-to'g'ri Parse qilish
    const rawAiQuestions = JSON.parse(generatedText);

    // 🟢 MAP TO STANDARD FRONTEND FORMAT (Translates [0,1,2,3] -> A, B, C, D)
    const letterMap = ["A", "B", "C", "D"];

    const enrichedQuestions = rawAiQuestions.map((item: any) => ({
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
      answer: letterMap[item.a] || "A", // Map index to Letter
      explanation: { uz: item.e || "" } 
    }));

    // 🟢 Deduct limits securely for AI generated questions
    await deductMonthlyAiCredits(userId, enrichedQuestions.length); 

    return NextResponse.json({ questions: enrichedQuestions });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message || "Tizim xatoligi yuz berdi" }, { status: 500 });
  }
}
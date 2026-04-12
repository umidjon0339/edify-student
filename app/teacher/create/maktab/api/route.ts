import { NextResponse } from 'next/server';
import { jsonrepair } from 'jsonrepair';

// 🟢 AI LIMIT BLOCK START
import { consumeAiCredits } from "@/lib/ai/aiLimitsHelper"; 
// 🔴 AI LIMIT BLOCK END

// 🟢 1. IMPORT THE REGISTRY (Loaded instantly into RAM on Vercel boot)
// This file MUST stay in your Vercel project folder!
import dbRegistry from "@/data/local_dbs/structure.json";

// 🟢 2. GLOBAL RAM CACHE (Keeps Firebase JSONs in memory for warm serverless functions)
const localDbCache: Record<string, any[]> = {};

// 🟢 3. YOUR FIREBASE BUCKET FROM SCREENSHOT
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
    const payload = await req.json().catch(() => ({})); // Safe JSON parsing
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
    
    const limitCheck = await consumeAiCredits(userId, count, false); 
    if (!limitCheck.allowed) return NextResponse.json({ error: limitCheck.error }, { status: 402 }); 

    // =========================================================================
    // 🚀 ULTRA-FAST FIREBASE STORAGE INTERCEPTOR (WITH RAM CACHING)
    // =========================================================================
    const safeSubject = subject.toLowerCase().trim();
    const safeGrade = topic.toLowerCase().trim();

    // STEP A: O(1) Check in Local Registry (0ms)
    // @ts-ignore
    const availableGradesForSubject = dbRegistry[safeSubject];

    if (availableGradesForSubject && availableGradesForSubject.includes(safeGrade)) {
      try {
        const cacheKey = `${safeSubject}_${safeGrade}`;
        let localDatabase = localDbCache[cacheKey];

        // STEP B: If not in RAM Cache, fetch directly from Firebase Storage
        if (!localDatabase) {
          // Encode the path to handle spaces and apostrophes (e.g., o'zbekiston tarixi)
          const encodedPath = encodeURIComponent(`local_dbs/${safeSubject}/${safeGrade}.json`);
          
          // Direct Google Cloud Storage URL for public read
          const firebaseUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodedPath}?alt=media`;

          const res = await fetch(firebaseUrl);
          
          if (!res.ok) throw new Error(`Firebase Storage'dan topilmadi: ${res.statusText}`);
          
          localDatabase = await res.json();
          localDbCache[cacheKey] = localDatabase; // ⚡ CACHED IN RAM FOR NEXT TIME!
        }

        // STEP C: Filter & Process
        let matchedQuestions = localDatabase.filter((q: any) => 
          q.chapter === chapter && q.subtopic === subtopic
        );

        if (matchedQuestions.length > 0) {
          matchedQuestions = shuffleArray(matchedQuestions);
          const selectedQuestions = matchedQuestions.slice(0, count);

          const formattedQuestions = selectedQuestions.map((q: any) => ({
            // SAFE EXTRACTION: Prevents crashes if your DB has a typo
            question: q.question?.[language] || q.question?.uz || "Savol topilmadi",
            options: {
              A: q.options?.A?.[language] || q.options?.A?.uz || q.options?.A || "A",
              B: q.options?.B?.[language] || q.options?.B?.uz || q.options?.B || "B",
              C: q.options?.C?.[language] || q.options?.C?.uz || q.options?.C || "C",
              D: q.options?.D?.[language] || q.options?.D?.uz || q.options?.D || "D"
            },
            answer: q.answer || "A",
            explanation: "" 
          }));

          // Artificial delay (3.5 seconds) for the UX animation
          await new Promise(resolve => setTimeout(resolve, 3500));
          await consumeAiCredits(userId, formattedQuestions.length, true);

          return NextResponse.json({ questions: formattedQuestions });
        }
      } catch (err) {
        console.error(`Firebase Storage Error for ${safeSubject} ${safeGrade}:`, err);
        // Silently fail and fall back to AI
      }
    }
    // =========================================================================


    // =========================================================================
    // 🔴 STANDARD GEMINI AI GENERATION
    // =========================================================================
    let systemPrompt = `Act as an expert examiner for the Uzbekistan public school system (Maktab).
Generate exactly ${count} multiple-choice questions.

TARGET AUDIENCE:
Class/Grade: ${topic}
Subject: ${subject}
Chapter: ${chapter}
Subtopic: ${subtopic}
Difficulty Level: ${difficulty}
Language: ${language}

CURRICULUM BOUNDARIES:
You are generating questions purely based on the curriculum topic name. Ensure the logic strictly aligns with what a ${topic} student in Uzbekistan learns in ${subject}. Do not use concepts from higher grades.

STRICT MATH/SCIENCE FORMATTING (CRITICAL):
1. Wrap ALL math, numbers, variables, and equations in $ (for inline) or $$ (for display/blocks). NEVER use \\( \\) or \\[ \\].
2. Systems of equations MUST use: $$ \\\\begin{cases} x+y=2 \\\\\\\\ x-y=0 \\\\end{cases} $$
3. JSON ESCAPING: You MUST double-escape all LaTeX commands to ensure valid JSON (e.g., write \\\\frac instead of \\frac).
4. NO NEWLINES: Do not use \\n. Write explanations as a single continuous line. Max 30 words.

Output ONLY a RAW JSON array. No markdown.
Schema: [{"question":"","options":{"A":"","B":"","C":"","D":""},"answer":"A","explanation":"no more than 10 words"}]`;

    if (context && context.trim() !== "") {
      systemPrompt += `\nSTRICT CONTEXT RULES FOR THIS SUBTOPIC:\n${context}`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Gemini Error");

    // 🟢 SAFETY CHECK: Handles Gemini Safety Filter Blocks
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      throw new Error(data.candidates?.[0]?.finishReason === "SAFETY" 
        ? "AI xavfsizlik filtri: Bu mavzu bo'yicha savol tuzish taqiqlangan." 
        : "AI kutilmagan javob qaytardi. Qayta urinib ko'ring.");
    }

    let parsedJSON;

    try {
      parsedJSON = JSON.parse(generatedText);
    } catch (initialParseError) {
      let sanitizedText = generatedText.replace(/```json/gi, '').replace(/```/g, '').trim();
      sanitizedText = sanitizedText.replace(/\\\\\\\\/g, '\\\\'); 
      sanitizedText = sanitizedText.replace(/(?<!\\)\\([a-zA-Z]+)/g, '\\\\$1'); 
      sanitizedText = sanitizedText.replace(/\\'/g, "'"); 
      sanitizedText = sanitizedText.replace(/\\n/g, ' ').replace(/\n/g, ' '); 

      try {
        parsedJSON = JSON.parse(sanitizedText);
      } catch (parseError) {
        try {
          parsedJSON = JSON.parse(jsonrepair(sanitizedText));
        } catch (repairError) {
          throw new Error("AI javobini qayta ishlash imkonsiz. Qayta urinib ko'ring.");
        }
      }
    }

    let rawAiQuestions = Array.isArray(parsedJSON) ? parsedJSON : (parsedJSON.questions || [parsedJSON]);

    // 🟢 SAFE MAPPING
    const enrichedQuestions = rawAiQuestions.map((q: any) => ({
      ...q,
      explanation: { uz: "" },
      type: "mcq",
      points: 2
    }));

    await consumeAiCredits(userId, enrichedQuestions.length, true); 

    return NextResponse.json({ questions: enrichedQuestions });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message || "Tizim xatoligi yuz berdi" }, { status: 500 });
  }
}
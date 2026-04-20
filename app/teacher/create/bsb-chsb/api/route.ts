import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin'; 
import { deductMonthlyAiCredits } from "@/lib/ai/featureGatekeeper";

export async function POST(req: Request) {
  try {
    const { 
      userId, 
      schoolType,
      assessmentType, 
      topic, 
      subject, 
      scopes, 
      difficulty, 
      distribution, 
      language = "uz" 
    } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

    const totalQuestions = distribution.reduce((acc: number, curr: any) => acc + curr.count, 0);

    if (!userId) return NextResponse.json({ error: "User unauthorized" }, { status: 401 });
    
    // =========================================================================
    // 🟢 LIMIT CHECK ONLY: Checks Monthly Limits
    // =========================================================================
    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();
    
    if (userSnap.exists) {
      const userData = userSnap.data();
      const monthlyLimit = userData?.currentLimits?.monthlyAiQuestions || 100;
      const aiUsed = userData?.usage?.aiQuestionsUsed || 0;
      const isUnlimited = monthlyLimit >= 5000;

      if (!isUnlimited && (aiUsed + totalQuestions > monthlyLimit)) {
        return NextResponse.json({ 
          error: "Oylik AI limitingiz yetarli emas.",
          code: 'LIMIT_REACHED' 
        }, { status: 403 }); 
      }
    }
    // =========================================================================

    const distRules = distribution.map((d: any) => 
      `- ${d.count} questions of type "${d.id}" (Worth ${d.points} points each)`
    ).join("\n");

    const schoolContext = schoolType === "ixtisos" 
      ? "Specialized/Gifted Schools (requires deep analytical thinking, multi-step logic, and complex problem solving)" 
      : "Standard Public Schools (requires clear, curriculum-aligned questions based on standard textbooks)";

    // 🟢 TOKEN-SAVER PROMPT WITH UNIVERSAL SCHEMA INSTRUCTIONS
    const systemPrompt = `You are an expert exam creator for Uzbekistan ${schoolContext}.
You are generating a summative assessment (${assessmentType}).

<context>
Grade: ${topic}, Subject: ${subject}, Difficulty: ${difficulty}, Language: ${language}.
Topics Covered: ${scopes.join(", ")}
</context>

<instructions>
Generate EXACTLY ${totalQuestions} questions based on this distribution:
${distRules}

CRITICAL RULES:
1. LATEX: Wrap ALL math, numbers, and formulas in $ (inline) or $$ (display). Double-escape LaTeX commands (e.g., \\\\frac, \\\\sqrt).
2. OUTPUT SCHEMA: You must return a JSON array of objects. EVERY object must include all keys (t, p, to, q, o, a, m, ru, e). If a key is not needed for a specific question type, leave it empty ("" or []).
3. "t" = type (mcq, short_answer, open_ended, matching, true_false)
4. "p" = points (integer)
5. "to" = topic name
6. "q" = question text
7. "e" = explanation (Max 10 words)

TYPE SPECIFIC RULES:
- mcq: "o" MUST be an array of 4 option strings. "a" MUST be the index of correct option ("0", "1", "2", "3").
- short_answer: "a" MUST be the exact answer text. "o", "m", "ru" remain empty.
- open_ended: "a" MUST be step-by-step solution no more than 15 words. "ru" MUST be the grading rubric no more than 10 words. "o", "m" empty.
- matching: "m" MUST be an array of exactly 3 or 4 objects {"l": "Term", "r": "Definition"}. "a", "o", "ru" empty.
- true_false: "a" MUST be strictly "true" or "false". "o", "m", "ru" empty.
</instructions>`;

    // 🟢 MINIFIED RESPONSE SCHEMA
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
                t: { type: "STRING" },
                p: { type: "INTEGER" },
                to: { type: "STRING" },
                q: { type: "STRING" },
                o: { type: "ARRAY", items: { type: "STRING" } }, // Only for MCQ
                a: { type: "STRING" }, // Answer (index, text, or boolean string)
                m: { type: "ARRAY", items: { type: "OBJECT", properties: { l: { type: "STRING" }, r: { type: "STRING" } }, required: ["l", "r"] } }, // Only for Matching
                ru: { type: "STRING" }, // Only for Open Ended
                e: { type: "STRING" }
              },
              required: ["t", "p", "to", "q", "o", "a", "m", "ru", "e"]
            }
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Gemini Error");

    const generatedText = data.candidates[0].content.parts[0].text;
    
    // 🟢 SAFE DIRECT PARSING (No jsonrepair!)
    const rawAiQuestions = JSON.parse(generatedText);
    const letterMap = ["A", "B", "C", "D"];

    // 🟢 MAP MINIFIED DATA TO THE EXACT FRONTEND FORMAT
    const formattedQuestions = rawAiQuestions.map((item: any) => {
      let base: any = {
        id: `tq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: item.t,
        points: item.p,
        difficulty: difficulty,
        topic: item.to,
        question: { uz: item.q || "" },
        explanation: { uz: item.e || "" }
      };

      if (item.t === "mcq") {
        base.options = {
          A: { uz: item.o[0] || "" },
          B: { uz: item.o[1] || "" },
          C: { uz: item.o[2] || "" },
          D: { uz: item.o[3] || "" }
        };
        base.answer = letterMap[parseInt(item.a)] || "A";
      } 
      else if (item.t === "short_answer") {
        base.answer = { uz: item.a || "" };
      } 
      else if (item.t === "open_ended") {
        base.answer = { uz: item.a || "" };
        base.rubric = { uz: item.ru || "" };
      } 
      else if (item.t === "matching") {
        base.question = { uz: "Quyidagilarni moslashtiring: " + (item.q || "") };
        base.pairs = (item.m || []).map((pair: any) => ({
          left: { uz: pair.l || "" },
          right: { uz: pair.r || "" }
        }));
      } 
      else if (item.t === "true_false") {
        base.answer = (item.a === "true" || item.a === "1" || item.a?.toLowerCase() === "rost" || item.a?.toLowerCase() === "true");
      }

      return base;
    });

    // =========================================================================
    // 🟢 DEDUCTION LOGIC
    // =========================================================================
    await deductMonthlyAiCredits(userId, formattedQuestions.length);

    return NextResponse.json({ questions: formattedQuestions });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
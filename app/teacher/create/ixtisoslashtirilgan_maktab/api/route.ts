import { NextResponse } from 'next/server';
import { jsonrepair } from 'jsonrepair';

// 🟢 AI LIMIT BLOCK START
import { consumeAiCredits } from "@/lib/ai/aiLimitsHelper"; 
// 🔴 AI LIMIT BLOCK END

export async function POST(req: Request) {
  try {
    // 🟢 ADDED userId to request
    const { userId, topic, subject, chapter, subtopic, difficulty, count, language = "uz", context } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

    // =========================================================================
    // 🟢 AI LIMIT BLOCK START: Step 1 - GATEKEEPER CHECK (Do NOT deduct yet)
    // =========================================================================
    if (!userId) {
      return NextResponse.json({ error: "Foydalanuvchi tasdiqlanmadi (User ID missing)" }, { status: 401 });
    }
    
    const limitCheck = await consumeAiCredits(userId, count, false); 
    
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.error }, { status: 402 }); 
    }
    // 🔴 AI LIMIT BLOCK END
    // =========================================================================

    // 🟢 REFINED PROMPT: Gifted student logic + Strict LaTeX Formatting
    let systemPrompt = `Act as an expert examiner for the Uzbekistan Specialized Schools and Presidential Schools curriculum.
Generate exactly ${count} multiple-choice questions.

TARGET AUDIENCE:
Class/Grade: ${topic}
Subject: ${subject}
Chapter: ${chapter}
Subtopic: ${subtopic}
Difficulty Level: ${difficulty}
Language: ${language}

CURRICULUM BOUNDARIES & SPECIALIZED LOGIC:
You are generating questions for gifted students. 
- Avoid simple memory recall questions.
- Create questions that require multi-step logic, deep analytical thinking, or real-world application of the concept.
- The distractor options (wrong answers) MUST represent logical traps or common miscalculations made by advanced students.

STRICT MATH/SCIENCE FORMATTING (CRITICAL):
1. Wrap ALL math, numbers, variables, and equations in $ (for inline) or $$ (for display/blocks). NEVER use \\( \\) or \\[ \\].
2. Systems of equations MUST use: $$ \\\\begin{cases} x+y=2 \\\\\\\\ x-y=0 \\\\end{cases} $$
3. JSON ESCAPING: You MUST double-escape all LaTeX commands to ensure valid JSON (e.g., write \\\\frac instead of \\frac).
4. NO NEWLINES: Do not use \\n. Write explanations as a single continuous line. Max 40 words.

Output ONLY a RAW JSON array. No markdown.
Schema: [{"question":"","options":{"A":"","B":"","C":"","D":""},"answer":"A","explanation":""}]`;

    if (context && context.trim() !== "") {
      systemPrompt += `\nSTRICT CONTEXT RULES FOR THIS SUBTOPIC:\n${context}`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { 
            temperature: 0.4, // Slightly higher for creative gifted problems
            responseMimeType: "application/json" 
        }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Gemini Error");

    const generatedText = data.candidates[0].content.parts[0].text;
    let parsedJSON;

    // 🟢 BULLETPROOF PARSING
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

    // =========================================================================
    // 🟢 AI LIMIT BLOCK START: Step 2 - SUCCESS! DEDUCT THE CREDITS NOW
    // =========================================================================
    await consumeAiCredits(userId, count, true);
    // 🔴 AI LIMIT BLOCK END
    // =========================================================================

    return NextResponse.json({ questions: rawAiQuestions });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
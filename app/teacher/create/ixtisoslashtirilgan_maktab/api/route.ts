import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { topic, subject, chapter, subtopic, difficulty, count, language, context } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

    // 🟢 CHANGED: Persona is now set for Specialized / Presidential Schools
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

STRICT MATH & JSON RULES:
1. Wrap EVERY math symbol, variable, equation, or number inside $ signs for inline math (e.g., $x=2$) or $$ for block equations.
2. Double-escape all LaTeX backslashes for valid JSON (e.g., \\\\frac, \\\\sqrt).
3. Create 4 options (A, B, C, D). Only one is correct.
4. Provide a concise 'explanation' (under 40 words) that clarifies the advanced logical step required to solve the problem.

Output ONLY a RAW JSON array. Schema:
[{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"..."}]`;

    if (context && context.trim() !== "") {
      systemPrompt += `\nSTRICT CONTEXT RULES FOR THIS SUBTOPIC:\n${context}`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { 
            temperature: 0.4, // Slightly higher temperature for more creative/complex problem generation
            responseMimeType: "application/json" 
        }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Gemini Error");

    const generatedText = data.candidates[0].content.parts[0].text;
    const cleaned = generatedText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const rawAiQuestions = JSON.parse(cleaned);

    return NextResponse.json({ questions: rawAiQuestions });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
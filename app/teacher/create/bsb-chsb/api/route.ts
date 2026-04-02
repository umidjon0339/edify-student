import { NextResponse } from 'next/server';
import { jsonrepair } from 'jsonrepair';
import { consumeAiCredits } from "@/lib/ai/aiLimitsHelper";

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
    
    // AI LIMIT CHECK
    const limitCheck = await consumeAiCredits(userId, totalQuestions, false); 
    if (!limitCheck.allowed) return NextResponse.json({ error: limitCheck.error }, { status: 402 }); 

    // MATRIX STRING
    const distRules = distribution.map((d: any) => 
      `- ${d.count} questions of type "${d.id}" (Worth ${d.points} points each)`
    ).join("\n");

    const schoolContext = schoolType === "ixtisos" 
      ? "Specialized/Gifted Schools (requires deep analytical thinking, multi-step logic, and complex problem solving)" 
      : "Standard Public Schools (requires clear, curriculum-aligned questions based on standard textbooks)";

    const systemPrompt = `You are an expert exam creator for Uzbekistan ${schoolContext}.
You are generating a summative assessment (${assessmentType}).

<context>
Grade: ${topic}
Subject: ${subject}
Difficulty: ${difficulty}
Topics Covered: ${scopes.join(", ")}
Language: ${language}
</context>

<instructions>
Generate EXACTLY ${totalQuestions} questions based on this distribution:
${distRules}

CRITICAL RULES:
1. Return ONLY a valid, raw JSON array of objects. NO MARKDOWN (do not use \`\`\`json).
2. The structure of each object must strictly match the schemas below based on its "type".
3. LATEX: Wrap ALL math, numbers, and formulas in $ (inline) or $$ (display).
4. ESCAPING: You MUST double-escape LaTeX commands in the JSON string (e.g., write \\\\frac instead of \\frac, \\\\sqrt instead of \\sqrt).
</instructions>

<schemas>
For "mcq" type:
{"type": "mcq", "points": [int], "topic": "...", "difficulty": "${difficulty}", "question": {"uz": "..."}, "options": {"A": {"uz": "..."}, "B": {"uz": "..."}, "C": {"uz": "..."}, "D": {"uz": "..."}}, "answer": "A", "explanation": {"uz": "..."}}

For "short_answer" type (Must NOT have "options"):
{"type": "short_answer", "points": [int], "topic": "...", "difficulty": "${difficulty}", "question": {"uz": "..."}, "answer": {"uz": "Specific short string or number"}, "explanation": {"uz": "..."}}

For "open_ended" type (Must NOT have "options"):
{"type": "open_ended", "points": [int], "topic": "...", "difficulty": "${difficulty}", "question": {"uz": "..."}, "answer": {"uz": "Detailed step-by-step model solution"}, "rubric": {"uz": "Grading criteria, e.g., 1 ball for formula, 2 for calculation"}, "explanation": {"uz": "..."}}

For "matching" type (Must NOT have "options"):
{"type": "matching", "points": [int], "topic": "...", "difficulty": "${difficulty}", "question": {"uz": "Quyidagilarni moslashtiring:"}, "pairs": [{"left": {"uz": "Term 1"}, "right": {"uz": "Definition 1"}}, {"left": {"uz": "Term 2"}, "right": {"uz": "Definition 2"}}], "explanation": {"uz": "..."}}

For "true_false" type (Must NOT have "options"):
{"type": "true_false", "points": [int], "topic": "...", "difficulty": "${difficulty}", "question": {"uz": "Statement to evaluate"}, "answer": true, "explanation": {"uz": "..."}}
</schemas>`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { temperature: 0.3, responseMimeType: "application/json" }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Gemini Error");

    const generatedText = data.candidates[0].content.parts[0].text;
    let parsedJSON;

    // BULLETPROOF JSON PARSING
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
          throw new Error("AI output corrupted.");
        }
      }
    }

    let rawAiQuestions = Array.isArray(parsedJSON) ? parsedJSON : (parsedJSON.questions || [parsedJSON]);

    // Deduct limits upon success
    await consumeAiCredits(userId, totalQuestions, true);

    return NextResponse.json({ questions: rawAiQuestions });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
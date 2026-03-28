import { NextResponse } from 'next/server';
import { jsonrepair } from 'jsonrepair';

export async function POST(req: Request) {
  try {
    const { promptText, difficulty, count, language = "uz" } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing in .env.local" }, { status: 500 });
    }

    const difficultyDefinitions: Record<string, string> = {
      "Easy": "Single-step problems. Direct application of basic formulas. Use simple integers.",
      "Medium": "Two-step problems. Requires standard algebraic manipulation. Standard high-school level.",
      "Hard": "Highly complex, multi-step problems. University entrance exam or Olympiad level. Combine multiple concepts. Use fractions, roots, or logarithms."
    };

    const activeDifficultyInstruction = difficultyDefinitions[difficulty] || difficultyDefinitions["Medium"];

    // 🟢 1. REFINED PROMPT: Added $$ support and strict JSON escaping rules
    const systemPrompt = `Act as an expert Uzbekistan Math Teacher. Generate exactly ${count} multiple-choice questions.
Language: ${language}. Difficulty: ${difficulty.toUpperCase()}.

CRITICAL DIFFICULTY RULE: ${activeDifficultyInstruction}
USER INSTRUCTION: "${promptText}"

RULES:
1. Accuracy: Correct answer must be mathematically flawless.
2. Distractors: The 3 wrong options must be common student mistakes.
3. Randomize: The 'answer' key (A, B, C, D) must be randomized.
4. MATH FORMATTING & JSON: 
   - Wrap ALL math/variables in single $ for inline math or $$ for display math.
   - Systems of equations MUST use \\\\begin{cases} ... \\\\end{cases}. NEVER use a plain '{'.
   - Because you are outputting JSON, you MUST double-escape all LaTeX commands (e.g., \\\\frac, \\\\pi, \\\\sin).
5. NO NEWLINES: Do not use \\n. Write explanations as a single continuous line. Max 2 sentences.

Output RAW JSON array only. No markdown.
Schema: [{"question":"","options":{"A":"","B":"","C":"","D":""},"answer":"A","explanation":""}]`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
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

    // 🟢 2. PARSE & REPAIR: Try native parse first to preserve backslashes.
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

    // 🟢 3. BULLETPROOF ARRAY WRAPPER
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

    return NextResponse.json({ questions: formattedQuestions });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate questions" }, { status: 500 });
  }
}
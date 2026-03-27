import { NextResponse } from 'next/server';
import { jsonrepair } from 'jsonrepair';

export async function POST(req: Request) {
  try {
    const { promptText, difficulty, count, language = "uz" } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing in .env.local" }, { status: 500 });
    }

    // 🟢 1. THE DIFFICULTY MATRIX: Tell the AI exactly what each level means
    const difficultyDefinitions: Record<string, string> = {
      "Easy": "Single-step problems. Direct application of basic formulas. Use simple integers. Very clear and straightforward.",
      "Medium": "Two-step problems. Requires standard algebraic manipulation or combining two basic properties. Standard high-school level.",
      "Hard": "Highly complex, multi-step problems. University entrance exam (DTM/Abituriyent) or Olympiad level. Combine multiple mathematical concepts. Use abstract variables, fractions, roots, or logarithms. Require deep critical thinking."
    };

    const activeDifficultyInstruction = difficultyDefinitions[difficulty] || difficultyDefinitions["Medium"];

    // 🟢 2. INJECT INTO PROMPT
    const systemPrompt = `Act as an expert Uzbekistan Math Teacher. Generate exactly ${count} multiple-choice questions.
Language: ${language}

DIFFICULTY LEVEL: ${difficulty.toUpperCase()}
CRITICAL DIFFICULTY RULE: ${activeDifficultyInstruction}

USER INSTRUCTION:
"${promptText}"

RULES:
1. Analyze the USER INSTRUCTION to determine the core topic.
2. Accuracy: Correct answer must be mathematically flawless.
3. Distractors: The 3 wrong options must be common student mistakes (especially important for Hard questions).
4. Randomize: The 'answer' key (A, B, C, D) must be randomized.
5. Brevity: 'explanation' max 2 sentences.
6. Dollar Signs: Wrap ALL math, variables, and numbers in single $. (e.g., $x=2$).
7. JSON LATEX ESCAPING: MUST double-escape all LaTeX to prevent JSON parsing crashes. Use \\\\frac, \\\\pi, \\\\sin x, \\\\begin{cases}. NEVER use single backslashes.

Output RAW JSON array only. No markdown.
Schema:
[{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"..."}]`;

    // Fetch from Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.2, // Keep low for math accuracy
          responseMimeType: "application/json", 
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error?.message || "Failed to fetch from Gemini");

    let generatedText = data.candidates[0].content.parts[0].text;
    let sanitizedText = generatedText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    // 🟢 3. The "LaTeX Backslash Saver" (Prevents fracpi4 errors)
    sanitizedText = sanitizedText.replace(/(?<!\\)\\([a-zA-Z]+)/g, '\\\\$1');
    
    let rawAiQuestions;

    // 🟢 4. PARSE & REPAIR (Cleaned up the duplicate blocks)
    try {
      rawAiQuestions = JSON.parse(sanitizedText);
    } catch (parseError) {
      console.warn("Standard parse failed. Engaging jsonrepair...");
      try {
        const repairedJson = jsonrepair(sanitizedText);
        rawAiQuestions = JSON.parse(repairedJson);
      } catch (repairError) {
        throw new Error("AI output was too corrupted to repair.");
      }
    }

    // Map to schema. Topic IDs will be set to "0" on the frontend.
    const formattedQuestions = rawAiQuestions.map((q: any) => ({
      id: `tq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      uiDifficulty: difficulty,
      question: { uz: q.question, ru: "", en: "" },
      options: {
        A: { uz: q.options.A, ru: "", en: "" },
        B: { uz: q.options.B, ru: "", en: "" },
        C: { uz: q.options.C, ru: "", en: "" },
        D: { uz: q.options.D, ru: "", en: "" }
      },
      answer: q.answer,
      explanation: { uz: q.explanation, ru: "", en: "" }
    }));

    return NextResponse.json({ questions: formattedQuestions });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate questions" }, { status: 500 });
  }
}
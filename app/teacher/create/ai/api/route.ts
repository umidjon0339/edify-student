import { NextResponse } from 'next/server';
import { jsonrepair } from 'jsonrepair'; // 🟢 JSON healer preserved

export async function POST(req: Request) {
  try {
    // 🟢 1. Extract all inputs, including the new optional 'context' and 'language'
    const { topic, chapter, subtopic, difficulty, count, language = "uz", context } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing in .env.local" }, { status: 500 });
    }

    // 🟢 2. DYNAMIC PERSONAS: Define how the AI should act based on the topic
    const categoryPersonas: Record<string, string> = {
      "5_sinf": `
        TARGET AUDIENCE: 5th-grade students (10-11 years old). 
        TONE: Simple and clear. 
        MATH RULES: Do not use negative numbers, complex fractions, or advanced algebra unless explicitly stated in the context.`,
      "algebra": `
        TARGET AUDIENCE: High school graduates and university applicants (Abituriyentlar). 
        TONE: Academic and rigorous. 
        MATH RULES: Use advanced algebraic notation, complex multi-step equations, and university-entrance level difficulty.`,
      "geometriya": `
        TARGET AUDIENCE: High school graduates and university applicants (Abituriyentlar). 
        TONE: Academic and rigorous. 
        MATH RULES: Focus on advanced theorems, complex spatial reasoning, and proofs.`
    };

    // Grab the specific persona, or default to general math if not found
    const activePersona = categoryPersonas[topic] || `TARGET AUDIENCE: General math students. Adjust difficulty based on the subtopic.`;

    // 🟢 3. BUILD THE BASE PROMPT (Stacking the instructions)
    let systemPrompt = `You are an expert Math Teacher in Uzbekistan. Generate exactly ${count} multiple-choice questions.
    
Context Parameters:
- Language: ${language}
- Difficulty: ${difficulty}
- Topic Category: ${topic}
- Chapter: ${chapter}
- Specific Subtopic: ${subtopic}

${activePersona}`;

    // 🟢 4. STRICT VS CREATIVE CONTEXT INJECTION
    if (context && context.trim() !== "") {
      systemPrompt += `\n\nCRITICAL CURRICULUM RULE (STRICT MODE):
You MUST base your questions STRICTLY on the following curriculum text. Mimic the exact teaching style and scope shown here. Do not introduce concepts outside of this text:
"${context}"`;
    } else {
      systemPrompt += `\n\nGENERAL CURRICULUM RULE (CREATIVE MODE):
We do not have a specific text snippet for this lesson. Use standard Uzbekistan national curriculum rules for this specific category and subtopic.`;
    }

    // 🟢 5. APPEND YOUR EXISTING MATH AND JSON RULES
    systemPrompt += `\n\nCRITICAL MATH & FORMATTING RULES:
1. Accuracy: The correct answer MUST be mathematically flawless.
2. Distractors: The 3 wrong options MUST be common student mistakes.
3. Randomize Answer: The correct 'answer' key must be randomly distributed.
4. Brevity: The 'explanation' must be extremely concise. Max 2 sentences.
5. THE DOLLAR SIGN RULE: You MUST wrap ALL mathematical formulas, variables, and numbers in single dollar signs $. 
   - GOOD: "Tenglamani yeching: $\\begin{cases} x=2 \\\\ y=3 \\end{cases}$"
   - BAD: "Tenglamani yeching: \\begin{cases} x=2 \\\\ y=3 \\end{cases}"
6. THE DOUBLE BACKSLASH RULE (ZERO TOLERANCE): Because your output is JSON, you MUST double-escape every single LaTeX command. Single backslashes will crash the JSON parser.
   - You MUST write $\\\\frac{1}{2}$, NEVER $\\frac{1}{2}$.
   - You MUST write $\\\\pi$, NEVER $\\pi$.
   - You MUST write $\\\\sin x$, NEVER $\\sin x$.
   - You MUST write $\\\\begin{cases} ... \\\\end{cases}$
Output a RAW JSON array. No markdown. No greetings.
Schema:
[
  {
    "question": "...",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "answer": "A", 
    "explanation": "..."
  }
]`;

    // 🟢 6. FETCH FROM GEMINI (Your existing robust setup)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.2, 
          responseMimeType: "application/json", 
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error?.message || "Failed to fetch from Gemini");

    let generatedText = data.candidates[0].content.parts[0].text;
    let sanitizedText = generatedText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    let rawAiQuestions;

    // 🟢 7. PARSE & REPAIR (Your existing brilliant logic)
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

    // 🟢 8. MAP TO DATABASE SCHEMA
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
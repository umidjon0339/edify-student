import { NextResponse } from 'next/server';
import { jsonrepair } from 'jsonrepair';

export async function POST(req: Request) {
  try {
    const { images, promptText, difficulty, count, language = "uz" } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing" }, { status: 500 });
    }

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    // 🟢 HIGHLY COMPRESSED PROMPT: Added support for $$ and strict JSON escaping rules
    const systemPrompt = `Role: Expert Math Teacher. Generate exactly ${count} multiple-choice questions.
Lang: ${language}. Diff: ${difficulty}.

CRITICAL RULES:
1. GUARDRAIL: If image lacks math/graphs/education content, output EXACTLY: {"error": "invalid_image"}
2. SELF-CONTAINED: NEVER reference the image (e.g., "Rasmdagi", "shown above"). Questions must be pure standalone text.
3. FORMATTING: 
   - NO newlines. Do NOT use \\n. Write continuous strings.
   - Use single quotes ('') inside text, NEVER double quotes ("").
4. MATH LATEX & JSON: 
   - Wrap ALL math/variables in single $ for inline math or $$ for display math.
   - Systems of equations MUST use \\\\begin{cases} ... \\\\end{cases}. NEVER use a plain '{'.
   - Because you are outputting JSON, you MUST double-escape all LaTeX commands (e.g., \\\\frac, \\\\pi, \\\\sin).
5. CONTENT: Extract concepts from image. Apply instruction: "${promptText}". Flawless correct answer. 3 common-mistake distractors. Randomize 'answer' (A-D). Max 2 sentence 'explanation'.

Output RAW JSON array ONLY. No markdown.
Schema: [{"question":"","options":{"A":"","B":"","C":"","D":""},"answer":"A","explanation":""}]`;

    const requestParts: any[] = [{ text: systemPrompt }];

    images.forEach((imgBase64: string) => {
      const mimeType = imgBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || "image/jpeg";
      const base64Data = imgBase64.split(',')[1];
      requestParts.push({
        inlineData: { data: base64Data, mimeType: mimeType }
      });
    });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: requestParts }],
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

    // 🟢 PARSING LOGIC: Try native parse first to preserve backslashes. 
    // Only apply regex/repair if native parse fails.
    try {
      parsedJSON = JSON.parse(generatedText);
    } catch (initialParseError) {
      console.warn("Initial JSON parse failed, attempting cleanup...");
      let sanitizedText = generatedText.replace(/```json/gi, '').replace(/```/g, '').trim();
      
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

    // Handle Image Guardrail
    if (parsedJSON.error === "invalid_image") {
      return NextResponse.json({ error: "invalid_image" }, { status: 400 });
    }

    // 🟢 ROBUST ARRAY HANDLER
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
    console.error("AI Image Generation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate questions" }, { status: 500 });
  }
}
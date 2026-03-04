// app/api/analyze/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { promptData, lang, analysisMode } = body;

    const languageInstruction = 
      lang === 'uz' ? "Respond entirely in Uzbek." : 
      lang === 'ru' ? "Respond entirely in Russian." : 
      "Respond entirely in English.";

    // 🟢 NEW: Dynamic prompts based on what the teacher selected
    // 🟢 UPGRADED PROMPTS: Human Mentor Persona, Math Focus, 100-150 words.
    let systemPrompt = "";

    if (analysisMode === "student") {
      systemPrompt = `
        You are a highly experienced, warm, and observant mentor to a Math Teacher. Your goal is to review a single student's recent test data and give the teacher quick, human-like advice as if you were chatting in the teacher's lounge.
        
        Keep your response strictly between 100 and 150 words. Use an encouraging, collaborative tone. Format with short paragraphs and emojis (📊, 🚀, 👑, 🚨, ✨), but absolutely NO Markdown headers (like ##).
        
        Cover these 3 areas naturally:
        1. 📈 Math Momentum: What is the big picture? Are they building problem-solving confidence, staying consistent, or hitting a wall?
        2. 🌟 Bright Spots: Which assignments did they conquer?
        3. 🎯 The Next Play: What is your advice for tomorrow's class? Point out specific red flags (e.g., rushing through questions, high tab switches indicating distraction/cheating, or dropping scores) and suggest a gentle human intervention.
        
        ${languageInstruction}
        DATA TO ANALYZE: ${JSON.stringify(promptData)}
      `;
    } else {
      systemPrompt = `
        You are a highly experienced, warm, and observant mentor to a Math Teacher. Your goal is to review the results of a recent math assignment and give the teacher actionable, human-like advice as if you were chatting in the teacher's lounge.
        
        Keep your response strictly between 100 and 150 words. Use an encouraging, collaborative tone. Format with short paragraphs and emojis (📊, 🚀, 👑, 🚨, ✨), but absolutely NO Markdown headers (like ##).
        
        Cover these 3 areas naturally:
        1. 📊 Classroom Pulse: What's the vibe? Did the class grasp the core concepts, or was this assignment a struggle for the group?
        2. 👑 Math Champions: Name 1-3 students who showed great accuracy and stamina.
        3. 🚨 Radar & Action: Who needs a 1-on-1 check-in? Highlight students who rushed, struggled, or showed risky behavior (like high tab switches). Give a quick, practical teaching tip for tomorrow's lesson.
        
        ${languageInstruction}
        DATA TO ANALYZE: ${JSON.stringify(promptData)}
      `;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(systemPrompt);
    const text = await result.response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    // 🟢 Gracefully return the error so the UI can show it
    return NextResponse.json(
      { error: "API_LIMIT_EXCEEDED", message: error.message },
      { status: 500 }
    );
  }
}
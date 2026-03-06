// app/api/analyze/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/firebase'; 
import { doc, getDoc, setDoc } from 'firebase/firestore';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, promptData, lang, analysisMode, message, history, userId, dailyLimit } = body;

    // 🟢 1. SERVER-SIDE DAILY LIMIT CHECK
    // We create a unique document ID for this user for TODAY (e.g., "user123_2026-03-05")
    const today = new Date().toISOString().split('T')[0];
    const usageRef = doc(db, 'ai_usage', `${userId}_${today}`);
    const usageSnap = await getDoc(usageRef);
    
    let currentUsage = 0;
    if (usageSnap.exists()) {
      currentUsage = usageSnap.data().count;
    }

    // 🟢 DYNAMIC LIMIT FROM REMOTE CONFIG (Fallback to 15 if missing)
    const limitToUse = dailyLimit || 10 ;

    // Block the request if they hit the limit
    if (currentUsage >= limitToUse) {
      return NextResponse.json({ error: "DAILY_LIMIT_REACHED" }, { status: 429 });
    }

    // 🟢 2. AI GENERATION LOGIC
    const languageInstruction = 
      lang === 'uz' ? "Respond entirely in Uzbek." : 
      lang === 'ru' ? "Respond entirely in Russian." : "Respond entirely in English.";

    let systemInstruction = `You are a warm, observant mentor to a Math Teacher and you are giving advices and infos to teacher. Give actionable advice under 150 words. Use emojis. No markdown headers. ${languageInstruction} DATA CONTEXT: ${JSON.stringify(promptData)}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction });
    let aiResponseText = "";
    let initialPromptSent = "";

    if (action === "initial") {
       initialPromptSent = analysisMode === "student" 
         ? "Provide a 3-bullet summary: 1. 📈 Math Momentum 2. 🌟 Bright Spots 3. 🎯 The Next Play."
         : "Provide a 3-bullet summary: 1. 📊 Classroom Pulse 2. 👑 Math Champions 3. 🚨 Radar & Action.";
       const result = await model.generateContent(initialPromptSent);
       aiResponseText = result.response.text();
    } else if (action === "chat") {
       const chat = model.startChat({ history: history || [] });
       const result = await chat.sendMessage(message);
       aiResponseText = result.response.text();
    }

    // 🟢 3. RECORD THE USAGE
    // Increment the count in the database so they are one step closer to their limit
    await setDoc(usageRef, { count: currentUsage + 1, userId, date: today }, { merge: true });

    return NextResponse.json({ text: aiResponseText, initialPromptSent });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: error.message }, { status: 500 });
  }
}
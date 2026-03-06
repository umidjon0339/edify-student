// app/api/tts/route.ts
import { NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import fs from 'fs';
import os from 'os';

// Force Node.js runtime to prevent Next.js from breaking native modules
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { text, voice } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Select the Azure Neural voices
    //const voiceName = voice === 'male' ? 'uz-UZ-SardorNeural' : 'uz-UZ-MadinaNeural';
    const voiceName = 'uz-UZ-SardorNeural' ;

    // Initialize the Edge TTS trick
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    // 🟢 FIX: Give it the temporary FOLDER, and let it generate the file path!
    const { audioFilePath } = await tts.toFile(os.tmpdir(), text);

    // Read the newly created file into memory
    const audioBuffer = fs.readFileSync(audioFilePath);

    // Delete the temporary file so we don't clutter the server
    fs.unlinkSync(audioFilePath);

    // Send the MP3 file back to the browser
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error("Edge TTS Error:", error);
    return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 });
  }
}








// // app/api/tts/route.ts
// import { NextResponse } from 'next/server';

// export async function POST(req: Request) {
//   try {
//     const { text, voice } = await req.json();

//     if (!text) {
//       return NextResponse.json({ error: "Text is required" }, { status: 400 });
//     }

//     // 🔴 CRITICAL: Muxlisa has a strict 512 character limit.
//     // We slice the text to ensure it never exceeds this limit and causes a crash.
//     const safeText = text.slice(0, 510);

//     // Muxlisa Speakers: 0 for Female, 1 for Male
//     // We will default to 0 (Female) if the frontend asks for 'female', otherwise 1.
//     const speakerId = voice === 'female' ? 0 : 1;

//     // Send the request securely to Muxlisa
//     const response = await fetch('https://service.muxlisa.uz/api/v2/tts', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'x-api-key': process.env.MUXLISA_API_KEY || '', // Hiding the key on the server!
//       },
//       body: JSON.stringify({
//         text: safeText,
//         speaker: speakerId
//       })
//     });

//     if (!response.ok) {
//       // Muxlisa returns errors in JSON format, so we parse it to see what went wrong
//       const errorData = await response.json();
//       throw new Error(errorData.detail || "Muxlisa TTS API failed");
//     }

//     // Muxlisa returns a binary .wav file on success
//     const audioBuffer = await response.arrayBuffer();
    
//     // Send the audio file straight to the teacher's browser!
//     return new NextResponse(audioBuffer, {
//       headers: {
//         'Content-Type': 'audio/wav', 
//       },
//     });

//   } catch (error: any) {
//     console.error("TTS Error:", error);
//     return NextResponse.json({ error: error.message || "Failed to generate audio" }, { status: 500 });
//   }
// }
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const track = searchParams.get('track');       // e.g., "maktab"
  const className = searchParams.get('class');   // e.g., "1-sinf"
  const subject = searchParams.get('subject');   // e.g., "matematika"

  if (!track || !className || !subject) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    // This points exactly to your local folder structure!
    const filePath = path.join(process.cwd(), 'data', track, className, subject, 'syllabus.json');
    
    // Read the file
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const syllabusData = JSON.parse(fileContents);
    
    // Send the JSON to the frontend
    return NextResponse.json(syllabusData);
  } catch (error) {
    console.error("Syllabus read error:", error);
    return NextResponse.json({ error: "Syllabus not found" }, { status: 404 });
  }
}
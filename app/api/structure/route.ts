import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const track = searchParams.get('track');

  if (!track) {
    return NextResponse.json({ error: "Missing track parameter" }, { status: 400 });
  }

  try {
    const trackPath = path.join(process.cwd(), 'data', track);
    
    // If the track folder doesn't exist yet, return an empty object
    if (!fs.existsSync(trackPath)) {
        return NextResponse.json({});
    }

    // 1. Get all Class folders (e.g., "5-sinf", "6-sinf")
    const classes = fs.readdirSync(trackPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const structure: Record<string, string[]> = {};

    // 2. For each Class, get its Subject folders (e.g., "matematika", "fizika")
    for (const cls of classes) {
      const classPath = path.join(trackPath, cls);
      const subjects = fs.readdirSync(classPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      structure[cls] = subjects;
    }

    // Returns something like: { "5-sinf": ["matematika"], "7-sinf": ["algebra", "geometriya"] }
    return NextResponse.json(structure);
  } catch (error) {
    console.error("Structure read error:", error);
    return NextResponse.json({ error: "Failed to read structure" }, { status: 500 });
  }
}
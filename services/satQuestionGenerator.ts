import { auth } from "@/lib/firebase";
import type { SatMathDomain } from "@/types/SatQuiz";

/**
 * `/teacher/sat/math` → "AI bilan yaratish" (docs/SAT_QUIZ.md). Calls
 * `/api/teacher/sat/math/generate` (verifies the ID token, spends monthly AI
 * credits). Nothing is saved server-side — the caller reviews/edits each
 * draft before adding it to a module.
 */

export type SatAiDifficulty = "easy" | "medium" | "hard";

export interface SatAiDraft {
  /** Question text. */
  q: string;
  /** Exactly 4 option strings. */
  o: string[];
  /** Worked solution. */
  e: string;
  /** Index (0-3) of the correct option. */
  a: number;
}

export type SatAiError = "LIMIT_REACHED" | "BAD_TOPIC" | "BAD_INPUT" | "FAILED";
const KNOWN: SatAiError[] = ["LIMIT_REACHED", "BAD_TOPIC", "BAD_INPUT"];

export class SatAiFailure extends Error {
  constructor(public code: SatAiError) {
    super(code);
  }
}

export async function generateSatMathQuestions(req: {
  domain: SatMathDomain;
  difficulty: SatAiDifficulty;
  count: number;
}): Promise<SatAiDraft[]> {
  const user = auth.currentUser;
  if (!user) throw new SatAiFailure("FAILED");

  let res: Response;
  try {
    res = await fetch("/api/teacher/sat/math/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify(req),
    });
  } catch {
    throw new SatAiFailure("FAILED");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(data.questions)) {
    throw new SatAiFailure(KNOWN.includes(data.error) ? data.error : "FAILED");
  }
  return data.questions;
}

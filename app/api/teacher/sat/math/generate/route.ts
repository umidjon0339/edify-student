import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { checkUserPermission, deductMonthlyAiCredits } from "@/lib/ai/featureGatekeeper";
import { satMathQuestions } from "@/lib/ai/questionPrompts";
import { generateMcqs } from "@/lib/ai/generateMcqs";
import { AiError } from "@/lib/ai/generate";
import { SAT_MATH_DOMAINS } from "@/lib/SatMathQuiz";

/**
 * SAT Math AI question generator — `/teacher/sat/math/build` → "AI bilan
 * yaratish" (2026-11-01, docs/SAT_QUIZ.md). `mcq` only, same scope limit the
 * classroom-games generator already has (docs/GAMES.md); `numeric` (grid-in)
 * items stay hand-authored.
 *
 * Nothing is saved here — the client reviews/edits every draft (text, which
 * option is correct) and adds the approved ones straight into the module it
 * is building. No bank write, no topic-assign step: SAT items are embedded
 * snapshots, not `teacher_questions` refs (docs/SAT_QUIZ.md, "Building — one
 * document, three item arrays, no refs").
 *
 * ⚠️ Identity is SERVER-OWNED (the uid comes from the verified ID token, same
 * rule the games route follows). Credits: the shared monthly AI limit
 * (docs/AI.md, system B) — check → generate → deduct what was actually
 * returned.
 */

const MIN_COUNT = 1;
const MAX_COUNT = 10;
const DIFFICULTIES = ["easy", "medium", "hard"];

const fail = (code: string, status: number) => NextResponse.json({ error: code }, { status });

export async function POST(req: Request) {
  const match = (req.headers.get("authorization") || "").match(/^Bearer (.+)$/);
  if (!match) return fail("UNAUTHORIZED", 401);
  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(match[1])).uid;
  } catch {
    return fail("UNAUTHORIZED", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("BAD_INPUT", 400);
  }

  const domain = SAT_MATH_DOMAINS.find((d) => d.id === body.domain);
  const difficulty = String(body.difficulty);
  const count = Number(body.count);
  if (!domain || !DIFFICULTIES.includes(difficulty) || !Number.isInteger(count) || count < MIN_COUNT || count > MAX_COUNT) {
    return fail("BAD_INPUT", 400);
  }

  const user = await adminDb.collection("users").doc(uid).get();
  if (user.data()?.role !== "teacher") return fail("FORBIDDEN", 403);

  const permission = await checkUserPermission(uid, null, count);
  if (!permission.allowed) return fail(permission.code === "LIMIT_REACHED" ? "LIMIT_REACHED" : "AI_FAILED", 403);

  // `toLocalized(string)` (lib/questionSchema.ts) files a bare name under `.uz`,
  // not `.en` — SAT_MATH_DOMAINS' English names live there, same as every
  // other reader of `.name` in this feature (SatBankPicker, satQuizItem()).
  let items;
  try {
    items = await generateMcqs({
      build: (n) => satMathQuestions({ domain: domain.name.uz, difficulty, count: n }),
      count,
      language: "en",
    });
  } catch (error) {
    console.error("SAT Math AI generation error:", error);
    return fail(error instanceof AiError && error.code === "SAFETY" ? "BAD_TOPIC" : "AI_FAILED", 502);
  }

  if (!items.length) return fail("BAD_TOPIC", 422);

  await deductMonthlyAiCredits(uid, items.length);
  return NextResponse.json({ questions: items });
}

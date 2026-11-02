// ─── "My Mistakes" client service (docs/MISTAKES.md) ─────────────────────────
//
// The student's own bucket: reads and writes are theirs alone (rules enforce
// `studentId == request.auth.uid` on every path), so this is plain client-SDK
// Firestore — no API route, nothing privileged.

import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDocs,
  increment,
  limit as fbLimit,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { canPractise } from "@/lib/mistakes";
import { normalizeQuestion } from "@/lib/questionSchema";
import { mistakeDocId, type MistakeDoc, type MistakeEntry } from "@/types/mistakes";
import type { NormalizedQuestion } from "@/types/question";

const COLLECTION = "student_mistakes";

/** Firestore's own batch cap — a 45-question paper never gets near it, but a
 *  fully-blank sitting of a long paper could, so the write chunks anyway. */
const BATCH_LIMIT = 500;

/** Strips `undefined` — Firestore throws on it, and several snapshot fields
 *  (`explanation`, `stem`, `imageUrl`) are legitimately absent. */
function clean<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as T;
}

/**
 * Record everything the student got wrong or left blank in one sitting.
 *
 * ⚠️ FIRE-AND-FORGET AT THE CALL SITE. Every runner awaits its RESULT write
 * first and only then calls this; a failure here must never cost the student
 * their score. Each caller wraps it in `.catch()` for that reason.
 *
 * Idempotent by construction: the doc id is `${studentId}_${slotKey}`, so
 * missing the same slot in a retake UPDATES the row —
 *   • `timesWrong` increments (`increment(1)`, which creates the field at 1 on
 *     a merge into a non-existent doc),
 *   • `resolved` is forced back to false, because they missed it again,
 *   • the snapshot is refreshed, so an edited question re-syncs.
 */
export async function recordMistakes(studentId: string, entries: MistakeEntry[]): Promise<void> {
  if (!studentId || entries.length === 0) return;

  // One slot can only be missed once per sitting; a duplicate key in the same
  // batch is illegal in Firestore, so collapse defensively.
  const unique = new Map<string, MistakeEntry>();
  for (const e of entries) unique.set(e.slotKey, e);
  const rows = [...unique.values()];

  const now = Date.now();
  for (let start = 0; start < rows.length; start += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const entry of rows.slice(start, start + BATCH_LIMIT)) {
      const id = mistakeDocId(studentId, entry.slotKey);
      batch.set(
        doc(db, COLLECTION, id),
        clean({
          ...entry,
          id,
          studentId,
          lastMissedAt: now,
          timesWrong: increment(1),
          resolved: false,
          resolvedAt: null,
        }),
        { merge: true },
      );
    }
    await batch.commit();
  }
}

/**
 * The bucket, newest miss first. `resolved` is an equality leg rather than a
 * client-side filter so a student with a long history of sorted mistakes does
 * not pay to read them just to see the open ones.
 */
export async function listMistakes(
  studentId: string,
  opts: { resolved?: boolean; max?: number } = {},
): Promise<MistakeDoc[]> {
  // No cap by default (2026-11-01): the page shows ALL of the tab's mistakes.
  // A student's own rows only, so the read is bounded by what they missed.
  const max = opts.max ?? Infinity;
  const base = [
    where("studentId", "==", studentId),
    where("resolved", "==", opts.resolved ?? false),
  ];
  try {
    const snap = await getDocs(
      query(
        collection(db, COLLECTION),
        ...base,
        orderBy("lastMissedAt", "desc"),
        ...(Number.isFinite(max) ? [fbLimit(max)] : []),
      ),
    );
    return snap.docs.map((d) => d.data() as MistakeDoc);
  } catch (err) {
    // ⚠️ The composite index (studentId + resolved + lastMissedAt desc) was in
    // firestore.indexes.json but never deployed (found 2026-11-01), so every
    // load failed with failed-precondition and the page showed "Could not
    // load". Equality-only on two fields needs no composite index — read the
    // student's rows and sort here, so the bucket works either way.
    // ⚠️ permission-denied here means the `student_mistakes` RULES are not
    // live either (they shipped with the index) — no client fix for that:
    // deploy firestore:rules.
    if ((err as { code?: string }).code !== "failed-precondition") throw err;
    const snap = await getDocs(query(collection(db, COLLECTION), ...base));
    return snap.docs
      .map((d) => d.data() as MistakeDoc)
      .sort((a, b) => (b.lastMissedAt ?? 0) - (a.lastMissedAt ?? 0))
      .slice(0, max);
  }
}

/** Open-mistake count for the dashboard/nav badge — a COUNT query, so it bills
 *  far less than reading the rows just to length them. */
export async function countOpenMistakes(studentId: string): Promise<number> {
  const snap = await getCountFromServer(
    query(
      collection(db, COLLECTION),
      where("studentId", "==", studentId),
      where("resolved", "==", false),
    ),
  );
  return snap.data().count;
}

/** Tick a mistake off (or put it back). Missing it again re-opens it anyway. */
export async function setMistakeResolved(
  studentId: string,
  slotKey: string,
  resolved: boolean,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, mistakeDocId(studentId, slotKey)), {
    resolved,
    resolvedAt: resolved ? Date.now() : null,
  });
}

/** Remove a mistake entirely — the student's own row, their call. */
export async function deleteMistake(studentId: string, slotKey: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, mistakeDocId(studentId, slotKey)));
}

// ─── "practise 5 similar" ────────────────────────────────────────────────────

/** How many to show, and how wide a pool to rank them out of. */
export const SIMILAR_COUNT = 5;
const POOL = 30;

/**
 * Up to `SIMILAR_COUNT` OTHER questions to practise the same thing on.
 *
 * ⚠️ These are SIMILAR questions, not clones of the one that was missed —
 * nothing in this schema models a variant family, and question ids are random
 * (`tq_` + a Firestore auto-id), so there is no id arithmetic that finds
 * "versions" of a question. Same subject+topic, preferring the same subtopic
 * and difficulty, is the closest honest thing and needs no new authoring.
 *
 * The query is EQUALITY on `subject.id` + `topic.id` ordered by `rand` — the
 * same random-field pattern `lib/Examquestions.ts` uses, so one composite index
 * serves it and a big topic doesn't cost a scan. Difficulty and subtopic are
 * deliberately NOT extra equality legs: they would each demand another index
 * and, worse, a narrow cell would come back empty. They rank the pool instead,
 * so the student always gets something.
 */
export async function fetchSimilarQuestions(
  mistake: Pick<MistakeDoc, "subjectId" | "topicId" | "subtopicId" | "difficultyId" | "questionId">,
  count = SIMILAR_COUNT,
): Promise<NormalizedQuestion[]> {
  if (!canPractise(mistake)) return [];

  const base = [
    where("subject.id", "==", mistake.subjectId),
    where("topic.id", "==", mistake.topicId),
  ];
  const threshold = Math.random();
  const found = new Map<string, NormalizedQuestion>();

  // Wrap around the rand ring: read above the threshold, then below if thin.
  for (const op of [">=", "<"] as const) {
    if (found.size >= POOL) break;
    const snap = await getDocs(
      query(
        collection(db, "teacher_questions"),
        ...base,
        where("rand", op, threshold),
        orderBy("rand"),
        fbLimit(POOL - found.size),
      ),
    );
    for (const d of snap.docs) {
      if (d.id === mistake.questionId) continue; // never re-serve the missed one
      found.set(d.id, normalizeQuestion({ id: d.id, ...d.data() }));
    }
  }

  // Rank: same subtopic first, then closest difficulty. A stable sort keeps the
  // random order inside each tier, so two visits don't show the same five.
  const scored = [...found.values()].map((q) => ({
    q,
    sameSubtopic: mistake.subtopicId && q.subtopicId === mistake.subtopicId ? 0 : 1,
    difficultyGap: Math.abs((q.difficultyId ?? 2) - mistake.difficultyId),
  }));
  scored.sort((a, b) => a.sameSubtopic - b.sameSubtopic || a.difficultyGap - b.difficultyGap);

  return scored.slice(0, count).map((s) => s.q);
}

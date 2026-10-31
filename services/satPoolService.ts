// services/satPoolService.ts
//
// The SAT PRACTICE BANK — `sat_pool/{batchId}_{part}` (2026-10-31,
// docs/SAT_QUIZ.md §Practice bank). One teacher upload = one batch, stored as
// CHUNKS of embedded `SatQuizItem`s (each < 700 KB) instead of one document per
// question: a student's SAT page needs the whole pool to generate a test, and
// ~1,800 questions then cost ~6 reads instead of ~1,800.
//
// Rules (firestore.rules §sat_pool): read by any signed-in user; created only
// by a user whose `users.role == 'teacher'`, as themselves; never updated;
// deleted only by the uploader.

import {
  collection, deleteDoc, doc, getDocs, limit, query, serverTimestamp, setDoc, where,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { chunkSatPool, type SatPracticeSubject } from '@/lib/SatPractice';
import type { SatQuizItem } from '@/types/SatQuiz';

const POOL = 'sat_pool';

/** Hard cap on chunks read per subject (≈ 300 questions each). */
const MAX_CHUNKS = 60;

export interface SatPoolChunk {
  id: string;
  subject: SatPracticeSubject;
  batchId: string;
  title: string;
  teacherId: string;
  teacherName: string;
  part: number;
  parts: number;
  count: number;
  items: SatQuizItem[];
  createdAt: unknown;
}

export interface SatPoolBatch {
  batchId: string;
  subject: SatPracticeSubject;
  title: string;
  count: number;
  createdAt: unknown;
}

export const newSatPoolBatchId = (): string => `pool_${doc(collection(db, POOL)).id}`;

/**
 * Write one upload as chunk documents. Sequential on purpose: a chunk is up to
 * 700 KB, and one batched request is capped at 10 MiB. Returns the chunk count.
 * A failure part-way leaves the earlier chunks written — the teacher can delete
 * the batch from the upload list and retry.
 */
export async function saveSatPoolBatch(
  batchId: string,
  subject: SatPracticeSubject,
  items: SatQuizItem[],
  meta: { teacherId: string; teacherName: string; title: string },
): Promise<number> {
  const chunks = chunkSatPool(items);
  for (let part = 0; part < chunks.length; part++) {
    await setDoc(doc(db, POOL, `${batchId}_${part}`), {
      subject,
      batchId,
      title: meta.title,
      teacherId: meta.teacherId,
      teacherName: meta.teacherName,
      part,
      parts: chunks.length,
      count: chunks[part].length,
      items: chunks[part],
      createdAt: serverTimestamp(),
    });
  }
  return chunks.length;
}

/**
 * Every question in the subject's practice bank, de-duplicated by content
 * (two teachers uploading the same dataset must not double its weight).
 * Single-field equality: no composite index.
 */
export async function loadSatPool(subject: SatPracticeSubject): Promise<SatQuizItem[]> {
  const snap = await getDocs(query(collection(db, POOL), where('subject', '==', subject), limit(MAX_CHUNKS)));
  const seen = new Set<string>();
  const out: SatQuizItem[] = [];
  for (const d of snap.docs) {
    for (const item of ((d.data().items ?? []) as SatQuizItem[])) {
      const key = JSON.stringify([item.question?.en || item.question?.uz || '', item.answer]);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

/**
 * The teacher's own uploads, one row per batch, newest first. ⚠️ Reads the
 * full chunks (Firestore cannot select fields) — teacher-only and rare.
 */
export async function listMySatPoolBatches(teacherId: string): Promise<SatPoolBatch[]> {
  const snap = await getDocs(query(collection(db, POOL), where('teacherId', '==', teacherId), limit(MAX_CHUNKS * 2)));
  const batches = new Map<string, SatPoolBatch>();
  for (const d of snap.docs) {
    const c = d.data() as Omit<SatPoolChunk, 'id'>;
    const b = batches.get(c.batchId);
    if (b) b.count += c.count;
    else batches.set(c.batchId, { batchId: c.batchId, subject: c.subject, title: c.title, count: c.count, createdAt: c.createdAt });
  }
  const millis = (v: unknown) =>
    v && typeof (v as { toMillis?: () => number }).toMillis === 'function' ? (v as { toMillis: () => number }).toMillis() : 0;
  return [...batches.values()].sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
}

/** Delete every chunk of one of the teacher's uploads. */
export async function deleteSatPoolBatch(teacherId: string, batchId: string): Promise<void> {
  const snap = await getDocs(query(
    collection(db, POOL), where('teacherId', '==', teacherId), where('batchId', '==', batchId),
  ));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

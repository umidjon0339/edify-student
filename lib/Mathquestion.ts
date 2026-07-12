// lib/mathQuestions.ts
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import type { QuestionDoc, DifficultyId } from '@/types/Math';

const QUESTIONS_COLLECTION = 'questions1';
const DEFAULT_PAGE_SIZE = 20;

/**
 * Fetches ONE page of questions for a given chapter (optionally filtered by
 * difficulty). Relies on the composite indexes defined in
 * firestore.indexes.json, so it never scans more documents than `pageSize`
 * — no matter how large questions1 grows.
 */
export async function getChapterQuestions(params: {
  subjectId: string;
  chapterId: string;
  difficultyId?: DifficultyId;
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
}) {
  const { subjectId, chapterId, difficultyId, pageSize = DEFAULT_PAGE_SIZE, cursor } = params;

  const constraints = [
    where('subjectId', '==', subjectId),
    where('chapterId', '==', chapterId),
    ...(difficultyId ? [where('difficultyId', '==', difficultyId)] : []),
    orderBy('number'),
    limit(pageSize),
    ...(cursor ? [startAfter(cursor)] : []),
  ];

  const q = query(collection(db, QUESTIONS_COLLECTION), ...constraints);
  const snap = await getDocs(q);

  return {
    questions: snap.docs.map((d) => d.data() as QuestionDoc),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === pageSize,
  };
}
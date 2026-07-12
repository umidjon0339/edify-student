/**
 * scripts/generateMathStructure.ts
 *
 * Offline maintenance script — run it with Node, NOT in the browser/app.
 *
 * It scans the `questions1` collection ONCE, aggregates question counts per
 * subject -> topic -> chapter -> difficulty, and writes the result to a
 * single document at metadata/mathStructure.
 *
 * The app itself (lib/mathStructure.ts) only ever reads that one document,
 * so this script is the only place that pays the cost of reading the full
 * questions1 collection.
 *
 * Run whenever questions are added, edited, or removed:
 *   npx tsx scripts/generateMathStructure.ts
 *
 * Requires a Firebase service account key at ./serviceAccountKey.json
 * (keep this file OUT of git — add it to .gitignore).
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require('../serviceAccountKey.json');

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

type DifficultyKey = 'easy' | 'medium' | 'hard';

// Normalizes whatever is stored in `difficulty` (e.g. "easy", "Oson",
// "O'rta", "Qiyin") down to one of the three canonical buckets.
const DIFFICULTY_MAP: Record<string, DifficultyKey> = {
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
  oson: 'easy',
  "o'rta": 'medium',
  orta: 'medium',
  qiyin: 'hard',
};

interface ChapterAcc {
  chapterId: string;
  name: string;
  subtopicId: string;
  subtopic: string;
  counts: Record<DifficultyKey, number>;
  total: number;
}

interface TopicAcc {
  topicId: string;
  name: string;
  chapters: Map<string, ChapterAcc>;
  total: number;
}

interface SubjectAcc {
  subjectId: string;
  name: string;
  topics: Map<string, TopicAcc>;
  total: number;
}

async function main() {
  console.log('Scanning questions1 …');
  const snap = await db.collection('questions1').get();
  console.log(`Read ${snap.size} documents.`);

  const subjects = new Map<string, SubjectAcc>();

  snap.forEach((docSnap) => {
    const q = docSnap.data() as Record<string, any>;

    const subjectId: string = q.subjectId ?? 'unknown';
    const topicId: string = q.topicId ?? 'unknown';
    const chapterId: string = q.chapterId ?? 'unknown';
    const diffKey: DifficultyKey =
      DIFFICULTY_MAP[String(q.difficulty ?? '').toLowerCase()] ?? 'medium';

    if (!subjects.has(subjectId)) {
      subjects.set(subjectId, {
        subjectId,
        name: q.subject ?? subjectId,
        topics: new Map(),
        total: 0,
      });
    }
    const subject = subjects.get(subjectId)!;
    subject.total += 1;

    if (!subject.topics.has(topicId)) {
      subject.topics.set(topicId, {
        topicId,
        name: q.topic ?? topicId,
        chapters: new Map(),
        total: 0,
      });
    }
    const topic = subject.topics.get(topicId)!;
    topic.total += 1;

    if (!topic.chapters.has(chapterId)) {
      topic.chapters.set(chapterId, {
        chapterId,
        name: q.chapter ?? chapterId,
        subtopicId: q.subtopicId ?? '',
        subtopic: q.subtopic ?? '',
        counts: { easy: 0, medium: 0, hard: 0 },
        total: 0,
      });
    }
    const chapter = topic.chapters.get(chapterId)!;
    chapter.counts[diffKey] += 1;
    chapter.total += 1;
  });

  const result = {
    subjects: Array.from(subjects.values()).map((s) => ({
      subjectId: s.subjectId,
      name: s.name,
      total: s.total,
      topics: Array.from(s.topics.values()).map((t) => ({
        topicId: t.topicId,
        name: t.name,
        total: t.total,
        chapters: Array.from(t.chapters.values()),
      })),
    })),
    updatedAt: Date.now(),
  };

  await db.doc('metadata/mathStructure').set(result);
  console.log('metadata/mathStructure written successfully ✅');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
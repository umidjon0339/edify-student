// lib/mathStructure.ts
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { MathStructureDoc } from '@/types/Math';

const STRUCTURE_COLLECTION = 'metadata';
const STRUCTURE_DOC_ID = 'mathStructure';
const CACHE_KEY = 'rushmodel:mathStructure:v1';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheShape {
  data: MathStructureDoc;
  cachedAt: number;
}

function readCache(): MathStructureDoc | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CacheShape = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: MathStructureDoc) {
  if (typeof window === 'undefined') return;
  try {
    const payload: CacheShape = { data, cachedAt: Date.now() };
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage unavailable (private mode / quota) — fail silently, just skip caching
  }
}

/**
 * Fetches the precomputed math structure:
 *   subjects -> topics -> chapters, with question counts per difficulty.
 *
 * This reads a SINGLE Firestore document instead of scanning `questions1`,
 * so rendering the RushModel Mathematics card costs exactly 1 read no
 * matter how many thousand question documents exist. Results are also
 * cached in sessionStorage for CACHE_TTL_MS so repeat visits in the same
 * tab cost 0 reads.
 *
 * The structure document is generated/refreshed offline by
 * `scripts/generateMathStructure.ts` — run it whenever questions1 changes.
 */
export async function getMathStructure(forceRefresh = false): Promise<MathStructureDoc> {
  if (!forceRefresh) {
    const cached = readCache();
    if (cached) return cached;
  }

  const ref = doc(db, STRUCTURE_COLLECTION, STRUCTURE_DOC_ID);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error(
      'metadata/mathStructure hujjati topilmadi. scripts/generateMathStructure.ts skriptini ishga tushiring.'
    );
  }

  const data = snap.data() as MathStructureDoc;
  writeCache(data);
  return data;
}
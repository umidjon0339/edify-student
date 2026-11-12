#!/usr/bin/env tsx
/**
 * Import Reading/Listening papers into the IELTS platform dataset from the CLI —
 * the same result as /admin/ielts → Import JSON, without pasting.
 *
 *   npm run ielts:import -- "data/ielts practise/listening"            # dry run (validate + show plan)
 *   npm run ielts:import -- "data/ielts practise/listening" --apply    # write to Firestore
 *
 * Mirrors the admin path step for step: validateIeltsImport (the importer's exact
 * validator; any error aborts that file) → saveIeltsTest({asPlatform:true}) logic:
 * renumber → extract key → strip answers → ONE batch writing
 *   ielts_{reading|listening}_tests/{id}   public, answer-free (answers_split: true)
 *   ielts_answer_keys/{id}                 the key (never student-readable)
 *   ielts_test_meta/{id}                   library card the student Practice tab reads
 * preserving createdAt and the admin catalog fields (order/visibility) on a re-import.
 * Keep it in step with services/ieltsService.ts saveIeltsTest.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import admin from 'firebase-admin';
import { validateIeltsImport } from '../lib/ielts/importValidation';
import { extractAnswerKey, renumberTest, stripAnswers, typeBreakdown } from '../lib/ielts/testSchema';
import type { IeltsListeningTest, IeltsReadingTest } from '../lib/ielts/types';

const TEST_COLLECTIONS = { reading: 'ielts_reading_tests', listening: 'ielts_listening_tests' } as const;
const CATALOG_KEYS = ['catalogOrder', 'hiddenFromStudents', 'hiddenFromTeachers'] as const;

const argv = process.argv.slice(2);
const apply = argv.includes('--apply');
const targets = argv.filter((a) => !a.startsWith('--'));
if (!targets.length) {
  console.error('usage: npm run ielts:import -- <file.json|dir> [...] [--apply]');
  process.exit(1);
}

const files = targets.flatMap((t) => {
  const st = statSync(t);
  if (!st.isDirectory()) return [t];
  return readdirSync(t).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort().map((f) => path.join(t, f));
});

type Paper = IeltsReadingTest | IeltsListeningTest;
const ready: { file: string; test: Paper }[] = [];
let failed = false;
for (const file of files) {
  const res = validateIeltsImport(JSON.parse(readFileSync(file, 'utf8')));
  if (!res.ok || !res.test) {
    failed = true;
    console.log(`✗ ${file}`);
    for (const e of res.errors) console.log(`    ${e.label ? `${e.label} — ` : ''}${e.path}: ${e.message}`);
    continue;
  }
  const mod = (res.test as { module: string }).module;
  if (mod !== 'reading' && mod !== 'listening') {
    console.log(`– ${file}: ${mod} papers are not handled by this script (use /admin/ielts)`);
    continue;
  }
  const t = res.test as Paper;
  console.log(`✓ ${file}\n    ${t.module} · ${t.test_id} · "${t.test_title}" · ${res.summary?.questions ?? t.total_questions} Q`
    + (res.warnings.length ? ` · ${res.warnings.length} warning(s)` : ''));
  ready.push({ file, test: t });
}
if (failed) {
  console.log('\nValidation errors — nothing written. Fix them (npm run ielts:verify) and re-run.');
  process.exit(1);
}
if (!apply) {
  console.log(`\nDry run. Re-run with --apply to write ${ready.length} test(s) to Firestore.`);
  process.exit(0);
}

if (!process.env.FIREBASE_CLIENT_EMAIL) {
  console.error('Firebase Admin env missing — run via `npm run ielts:import` (loads .env.local).');
  process.exit(1);
}
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

async function main() {
for (const { test } of ready) {
  renumberTest(test);
  const keys = extractAnswerKey(test);
  const publicDoc = stripAnswers(test);
  const skill = test.module;
  const testRef = db.collection(TEST_COLLECTIONS[skill]).doc(test.test_id);
  const existing = await testRef.get();
  const prev = existing.data();
  const catalog: Record<string, unknown> = {};
  for (const k of CATALOG_KEYS) if (prev?.[k] !== undefined && prev?.[k] !== null) catalog[k] = prev[k];
  const createdAt = existing.exists ? prev!.createdAt : now;

  const batch = db.batch();
  batch.set(testRef, {
    ...publicDoc, ...catalog,
    teacherId: null, source: 'platform', createdAt, updatedAt: now, status: 'published',
  });
  batch.set(db.collection('ielts_answer_keys').doc(test.test_id), {
    testId: test.test_id, teacherId: null, skill, keys,
  });
  batch.set(db.collection('ielts_test_meta').doc(test.test_id), {
    ...catalog,
    testId: test.test_id, skill, test_title: test.test_title || '', teacherId: null, source: 'platform',
    ...(test.test_category ? { test_category: test.test_category } : {}),
    total_questions: test.total_questions || 0,
    total_time_minutes: test.total_time_minutes || 0,
    typeBreakdown: typeBreakdown(test),
    createdAt, updatedAt: now,
  });
  await batch.commit();
  console.log(`  ↑ ${existing.exists ? 'updated' : 'created'} ${TEST_COLLECTIONS[skill]}/${test.test_id} (+ key, meta) — ${Object.keys(keys).length} answers`);
}
}

main().then(() => console.log('\nDone.')).catch((e) => { console.error(e); process.exit(1); });

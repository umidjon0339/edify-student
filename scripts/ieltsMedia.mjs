// Upload a listening paper's audio + diagram images to Firebase Storage and
// patch the hosted URLs into the paper JSON, so it passes `npm run ielts:verify`
// and the /admin/ielts importer.
//
//   npm run ielts:media -- "data/ielts practise/listening/ielts-listening-c18-test1.json"           # dry run
//   npm run ielts:media -- "data/ielts practise/listening/ielts-listening-c18-test1.json" --apply   # upload
//
// Media lives next to the papers, one folder per test_id (not committed — see .gitignore):
//
//   data/ielts practise/listening/media/<test_id>/part1.mp3 … part4.mp3     (mp3 | m4a | ogg | wav)
//   data/ielts practise/listening/media/<test_id>/part2-diagram.png          (png | jpg | jpeg | webp)
//
// Only placeholders are touched: a part whose audio_url is "TODO"/empty, a
// diagram_completion block whose diagram_url is "TODO"/empty. Re-running after a
// successful upload is a no-op. Paths match what the teacher builder uses:
// ielts_audio/{testId}/… and ielts_diagrams/….  ffprobe (if installed) fills
// audio_duration_seconds.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import admin from 'firebase-admin';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error('usage: npm run ielts:media -- <paper.json> [--apply]');
  process.exit(1);
}

const AUDIO_EXT = ['mp3', 'm4a', 'ogg', 'wav'];
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp'];
const MIME = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg', wav: 'audio/wav',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
};

const isPlaceholder = (v) => typeof v !== 'string' || !v.trim() || v.trim().toUpperCase() === 'TODO';
const findMedia = (dir, base, exts) => {
  for (const e of exts) {
    const p = path.join(dir, `${base}.${e}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
};
const durationOf = (p) => {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], { encoding: 'utf8' });
    const s = Math.round(Number(out.trim()));
    return Number.isFinite(s) && s > 0 ? s : null;
  } catch {
    return null;
  }
};

const paper = JSON.parse(fs.readFileSync(file, 'utf8'));
if (paper.module !== 'listening' || !Array.isArray(paper.parts)) {
  console.error('not a listening paper (module must be "listening" with a parts array)');
  process.exit(1);
}
const testId = paper.test_id;
if (!testId) {
  console.error('the paper needs a test_id — it names the media folder and the Storage path');
  process.exit(1);
}
const mediaDir = path.join(path.dirname(file), 'media', testId);

// ---- plan -----------------------------------------------------------------
const jobs = []; // { local, remote, apply(url) }
const missing = [];
paper.parts.forEach((part, pi) => {
  const n = pi + 1;
  if (isPlaceholder(part.audio_url)) {
    const local = findMedia(mediaDir, `part${n}`, AUDIO_EXT);
    if (!local) missing.push(`part${n}.{${AUDIO_EXT.join(',')}}`);
    else {
      jobs.push({
        local,
        remote: `ielts_audio/${testId}/part${n}${path.extname(local)}`,
        apply: (url) => {
          part.audio_url = url;
          const d = durationOf(local);
          if (d) part.audio_duration_seconds = d;
        },
      });
    }
  }
  (part.questions || []).forEach((qb) => {
    if (qb.type !== 'diagram_completion' || !isPlaceholder(qb.diagram_url)) return;
    const local = findMedia(mediaDir, `part${n}-diagram`, IMAGE_EXT);
    if (!local) missing.push(`part${n}-diagram.{${IMAGE_EXT.join(',')}}`);
    else {
      jobs.push({
        local,
        remote: `ielts_diagrams/${testId}_part${n}${path.extname(local)}`,
        apply: (url) => { qb.diagram_url = url; },
      });
    }
  });
});

console.log(`${paper.test_title || testId}\nmedia folder: ${mediaDir}\n`);
for (const j of jobs) console.log(`  ↑ ${path.basename(j.local)}  →  ${j.remote}`);
for (const m of missing) console.log(`  ✗ missing ${m}`);
if (!jobs.length && !missing.length) console.log('  nothing to do — every URL is already set');

if (!apply) {
  console.log(`\nDry run. Re-run with --apply to upload ${jobs.length} file(s) and rewrite the JSON.`);
  process.exit(0);
}
if (!jobs.length) process.exit(missing.length ? 1 : 0);

// ---- upload ---------------------------------------------------------------
const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;
if (!bucketName || !process.env.FIREBASE_CLIENT_EMAIL) {
  console.error('\nFirebase env missing — run through `npm run ielts:media` (loads .env.local).');
  process.exit(1);
}
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
  storageBucket: bucketName,
});
const bucket = admin.storage().bucket();

for (const j of jobs) {
  const token = crypto.randomUUID();
  const ext = path.extname(j.local).slice(1).toLowerCase();
  await bucket.upload(j.local, {
    destination: j.remote,
    metadata: {
      contentType: MIME[ext] || 'application/octet-stream',
      cacheControl: 'public, max-age=31536000',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(j.remote)}?alt=media&token=${token}`;
  j.apply(url);
  console.log(`  ✓ ${j.remote}`);
}

fs.writeFileSync(file, `${JSON.stringify(paper, null, 2)}\n`);
console.log(`\nWrote ${file}. Next: npm run ielts:verify -- "${file}"`);
if (missing.length) process.exit(1);

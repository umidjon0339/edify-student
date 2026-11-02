# MISTAKES — "My Mistakes", the student's practice bucket

> **Agent workflow:** read this BEFORE touching `app/(student)/mistakes/*`, `lib/mistakes.ts`, `services/mistakeService.ts`, `types/mistakes.ts`, the `student_mistakes` collection, or the submit path of ANY runner that feeds it (SAT, Milliy sertifikat, Rasch). Also read [QUESTIONS.md](QUESTIONS.md). Index: [README.md](README.md).

**Last verified:** 2026-09-16 (built). ⚠️ `tests/rules/studentMistakes.rules.test.mjs` was written with this change but **has not been executed** — the dev machine has no Java, so the Firestore emulator could not start. Run `npm run test:rules` before deploying the ruleset.

## Purpose & scope

Every question a student gets **wrong** or **leaves blank** is banked into their own private "My Mistakes" pile at `/mistakes`, where they can review the correct answer and pull up **5 similar questions** to practise on.

Fed by every auto-graded runner (2026-11-01): **SAT** (Math + English), **Milliy sertifikat**, **Rasch** (teacher papers by code AND the sampled `/raschmodel/exam` paper), **Rasch practice drills**, and **class assignments**. ⚠️ **Class EXAMS are deliberately not** — see Known issues.

## Key files

| File | Responsibility |
|---|---|
| [types/mistakes.ts](../types/mistakes.ts) | `MistakeDoc`, `MistakeEntry`, `mistakeDocId`, source labels |
| [lib/mistakes.ts](../lib/mistakes.ts) | The extractors — `satMistakes`, `examMistakes`, `canPractise`, `questionIdOf`. Pure functions (they read and write nothing) |
| [services/mistakeService.ts](../services/mistakeService.ts) | `recordMistakes`, `listMistakes`, `countOpenMistakes`, `setMistakeResolved`, `deleteMistake`, `fetchSimilarQuestions` |
| [app/(student)/mistakes/page.tsx](../app/(student)/mistakes/page.tsx) | The bucket: To-practise / Learned tabs, per-row review + practice set |
| `tests/rules/studentMistakes.rules.test.mjs` | Rules regression suite (see the ⚠️ above — not yet run) |

## Data model

### `student_mistakes/{studentId}_{slotKey}`

```ts
{
  id, studentId,
  slotKey, questionId,              // slotKey may be `${questionId}#${partId}`
  source: 'sat-math'|'sat-english'|'milliy'|'rasch'|'class'|'practice',  // class/practice 2026-11-01, additive
  outcome: 'wrong' | 'blank',
  testId, testTitle,                // snapshots
  question, stem?, imageUrl?,       // the question SNAPSHOT
  optionKeys[], options{}, answer, explanation?, examLang,
  subjectId, subjectName, topicId, topicName,
  subtopicId, subtopicName, difficultyId,   // for the "5 similar" lookup
  timesWrong, lastMissedAt,         // epoch ms
  resolved, resolvedAt?,
}
```

⚠️ **The question is SNAPSHOTTED, not referenced** — the same trade every exam-shaped collection here makes. The paper can be edited, closed or deleted, and a mistake the student can no longer read is worthless. It also means the whole bucket renders from ONE query, with no fan-out read per row.

⚠️ **The deterministic id makes a repeat idempotent.** Missing the same slot again UPDATES the row: `timesWrong` increments, `resolved` is forced back to `false` (they missed it again), and the snapshot refreshes. No duplicates ever accumulate.

⚠️ **A blank is its own `outcome`, not a wrong answer.** Both score zero, but "you skipped 6" and "you misunderstood 6" are different problems, and this is a *learning* surface.

**Index**: `studentId + resolved + lastMissedAt desc`. ⚠️ **Found NOT deployed on 2026-11-01** — every load of `/mistakes` failed ("Could not load your mistakes"). `listMistakes` now falls back on `failed-precondition` to the two equality legs alone (no composite index needed) and sorts by `lastMissedAt` in memory. Deploy `firestore:indexes` anyway — the fallback reads every row of the tab.

## Flows

### Capture — at submit, after the result is safely written

| Runner | Where | Extractor |
|---|---|---|
| SAT Math / English | each page's `onSubmit` (`app/(student)/sat/{math,english}/page.tsx`) | `satMistakes` |
| Milliy sertifikat | `app/(student)/milliy-sertifikat/[subject]/page.tsx`, after `saveMilliyResult` | `examMistakes` |
| Rasch (teacher paper) | `app/(student)/raschmodel/quiz/page.tsx`, after `saveQuizResult` | `examMistakes` |
| Rasch (sampled paper) | `app/(student)/raschmodel/exam/page.tsx`, after `saveExamResult` (2026-11-01; `testId` `exam_<endsAt>`) | `examMistakes` |
| Rasch practice | `app/(student)/raschmodel/practice/page.tsx`, after `savePracticeResult` (2026-11-01; `practice_<startedAt>`) | `practiceMistakes` — legacy `QuestionDoc`, so no "5 similar" set |
| SAT Learn by topic | `/sat/topics` → `recordTopicSet` (`app/(student)/sat/_components/satTopics.ts`), at the end of a set (2026-11-02; no result doc — testId `satpt_<subtopicKey>`) | `satMistakes` |
| Class assignment | `app/(student)/classes/[classId]/test/[assignmentId]/page.tsx`, after the attempt transaction commits (2026-11-01) | `classMistakes` — v1-normalized; asks `isAnswerCorrect`/`isPartCorrect`, blocks filed per part `id#partId` |

⚠️ **Always FIRE-AND-FORGET, always after the result write.** Each call site is `recordMistakes(...).catch(console.error)`. Banking a study aid must never cost a student their score, and the bucket is reconstructible from the next sitting anyway.

⚠️ **The outcome map is PASSED IN, never recomputed.** Each runner hands over the exact `items` map it just wrote to the result document, so the bucket can never disagree with the score the student was shown.

### ⚠️ Why there are TWO extractors — the three sources don't agree on keys

- **SAT**: `items` is keyed by **plain question id**, and `omitted` (2026-09-16, [SAT_QUIZ.md](SAT_QUIZ.md)) names the blanks. A sitting from before that field existed passes `undefined`, and every miss is recorded as `wrong` — the honest reading, since we genuinely cannot tell.
- **Milliy / Rasch**: `items` is keyed by **`examSlotKeys`** (`id`, or `id#partId` for a `shared_options` sub-question), and **nothing records blanks**, so "was it answered" is recomputed from the answers map the runner still holds.

⚠️ **The answers map and the outcome map are DIFFERENT key spaces**: `partKey` is `id::partId`, `examSlotKeys` is `id#partId` — a distinction [lib/ExamTeacher.ts](../lib/ExamTeacher.ts) calls out explicitly. Reading the answers map with a slot key silently finds nothing and reports every block part as blank. `slotAnswered()` is the only place that conversion happens.

Granularity is per **slot**, so a `shared_options` sub-question is its own mistake ("you failed part b" is the useful fact). Its card shows the PART's prompt with the block statement as `stem` — rendering `q.question` alone would show the shared preamble and none of what was asked. A `multi_part` block is one slot, and counts as *answered* if any part was attempted (it is graded all-or-nothing, so a half-done block is a wrong answer, not a blank).

### "Practise 5 similar" — `fetchSimilarQuestions`

⚠️ **These are SIMILAR questions, NOT clones of the one that was missed.** Nothing in this schema models a variant family, and question ids are random (`tq_` + a Firestore auto-id), so there is no id arithmetic — no "last two digits differ" trick — that finds versions of a question. Same subject+topic, ranked by subtopic and difficulty, is the closest honest thing and needs no new authoring work.

The query is **equality on `subject.id` + `topic.id`, ordered by `rand`** — the same random-field pattern [lib/Examquestions.ts](../lib/Examquestions.ts) uses, wrapping around the ring (`>=` then `<`) so a thin window still fills. Difficulty and subtopic are deliberately **not** extra equality legs: each would demand another composite index and, worse, a narrow cell would come back empty. They rank the fetched pool instead, so the student always gets something. The missed question itself is filtered out.

**Index**: `teacher_questions: subject.id + topic.id + rand`.

⚠️ **Topic level, not subtopic level, for every source** — because a SAT item carries only a `domain` (topic) and no subtopic at all. `subtopicId` is stored as `''` for SAT rather than faked from the domain, and used only for ranking where it exists.

⚠️ **A `questions1` (legacy bank) mistake gets NO practice set, by design.** That bank uses its own numeric zero-padded taxonomy ([lib/Mathstructure.ts](../lib/Mathstructure.ts)), bridged to slugs only by POSITION inside the exam pipeline — its `topicId` matches nothing in `data/question_topics.json`. `canPractise()` gates on the taxonomy resolving, and the row says so rather than showing an empty or wrong set. The mistake itself is still saved and fully reviewable.

Loaded **only when the row is opened and the button is pressed** — a bucket of 40 mistakes must not fire 40 sampling queries on mount.

## Security

```
match /student_mistakes/{mistakeId} {
  allow get:    isAuth() && (resource == null || resource.data.studentId == request.auth.uid);
  allow list:   isAuth() && resource.data.studentId == request.auth.uid;
  allow create: isAuth() && request.resource.data.studentId == request.auth.uid
                         && mistakeId == request.resource.data.id;
  allow update: isAuth() && resource.data.studentId == request.auth.uid
                         && request.resource.data.studentId == request.auth.uid;
  allow delete: isAuth() && resource.data.studentId == request.auth.uid;
}
```

⚠️ **Entirely private to the student — not readable by their teacher or centre manager.** Deliberate: the teacher already holds the authoritative per-question outcomes in `teacher_rasch_results` / `milliy_quiz_results` / the SAT results. This is a private revision list, and exposing it would change what it is for. Don't "helpfully" open it to teachers without deciding that separately.

⚠️ **The doc id is NOT trusted as the owner check.** A uid cannot be separated from a slotKey by string surgery — question ids contain underscores too (`tq_…`) — so both branches compare the `studentId` FIELD. `create` additionally pins `mistakeId == request.resource.data.id`, so a row cannot be filed under a mismatched key.

## Invariants & traps

- ⚠️ Capture is **after** the result write and **never awaited** by the sitting.
- ⚠️ Never recompute grading in the extractors — take the runner's outcome map.
- ⚠️ `partKey` (`::`) vs `examSlotKeys` (`#`) — see above. This is the single easiest thing to get wrong here.
- ⚠️ `increment(1)` on a `merge` into a non-existent document creates the field at 1; that is what makes `timesWrong` work without a read-then-write.
- ⚠️ Firestore rejects `undefined`. `clean()` in the service strips it, because `explanation`/`stem`/`imageUrl` are legitimately absent on many questions.
- A duplicate `slotKey` in one batch is illegal in Firestore; `recordMistakes` de-dupes defensively before writing.

## Known issues / dead code (verified 2026-09-16)

- **The rules test suite has not been run** (no Java → no emulator). The one real gap in this change.
- **Class EXAMS (`/student/exam/[examId]`, `attempts.type == 'exam'`) do not feed the bucket — on purpose.** Their results stay hidden until the teacher releases them (and `open_ended` answers are teacher-graded), so banking mistakes at submit would show the student the correct answers early. Wire them at release time if ever needed. Class ASSIGNMENTS do feed it (2026-11-01).
- `countOpenMistakes()` exists and is cheap (a COUNT query) but **nothing renders a badge with it yet** — the nav entry is a plain link.
- Since 2026-11-01 the bucket loads ALL of a tab's rows (`listMistakes` has no default cap; pass `max` to limit). No paging UI — fine while a student's own pile stays in the hundreds.
- ⚠️ **2026-11-01: the `student_mistakes` rules + index were found NOT live** on `scanqr-64512` (index confirmed missing; the rules shipped in the same change and the page kept failing after the index fallback, so they are almost certainly missing too). The repo rules compile (dry run). Fix = `npx firebase-tools deploy --only firestore:rules,firestore:indexes` — nothing client-side can work around missing rules.
- Resolving is manual. Nothing auto-resolves a mistake when the student later answers a similar question correctly.

## How to verify changes

**Rules:** `npm run test:rules` (install a JDK first on this machine — see the ⚠️ at the top).

**App** (`npm run dev`), as a student:
1. Sit a **SAT** test. Deliberately answer some wrong and **leave at least one blank**. Submit.
2. Open `/mistakes` → the wrong ones show ✗ "Wrong", the blank one shows — "Left blank". A question you got RIGHT must not appear.
3. Expand a row: the correct option is highlighted, the explanation shows. Press "Practise 5 similar" → up to 5 *other* questions on the same topic, none of them the one you missed.
4. Press "Got it" → the row leaves the tab; check the **Learned** tab. Press "Undo" → it comes back.
5. **Retake the same test and miss the same question again** → the row re-appears in To-practise with `timesWrong` at 2 (check the `×2` chip), and it did NOT duplicate in Firestore.
6. Sit a **Milliy sertifikat** paper containing a `shared_options` block; miss one sub-question and skip another. Both should appear as SEPARATE rows showing the sub-question prompt (not the shared preamble), one "Wrong" and one "Left blank".
7. Sit a **Rasch** paper with a `multi_part` block; fill in one part only → it records as ONE row, "Wrong" (not blank).
8. A Milliy paper built from the legacy `questions1` bank → rows appear, but the practice button is replaced by "came from the legacy bank".
9. Sign in as a different student and confirm `/mistakes` shows only their own.

# SAT_QUIZ — the adaptive SAT Math & English test programs

> **Agent workflow:** read this BEFORE touching `app/teacher/sat/*`,
> `app/(student)/sat/*`, `lib/SatMathQuiz.ts`, `lib/SatDefaultPaper.ts`,
> `lib/SATscore.ts`, `lib/SatSession.ts`, `lib/SatEnglishSession.ts`,
> `types/SatQuiz.ts`, `services/satMathQuizService.ts`,
> `services/satEnglishQuizService.ts`, `scripts/importSATEnglishQuestions.ts`,
> or the `sat_math_tests` / `sat_math_results` / `sat_english_tests` /
> `sat_english_results` collections. Also read [QUESTIONS.md](QUESTIONS.md)
> (the questions these tests embed). Update this doc in the same change
> whenever you alter behavior described here. Index: [README.md](README.md).

**Last verified:** 2026-09-16 (**the `sat-matematika` subtopics were replaced
with the centre's own book structure, and teachers can now bulk-import a SAT
question dataset from JSON at `/teacher/create/import`** (was `/teacher/sat/import`, now a redirect; the importer serves every subject since 2026-10-29) — §The taxonomy, §Teacher
dataset import; earlier the same day: **scoring moved from a straight line to a
real published conversion CURVE reporting a score BAND, and the score report
gained the blank-vs-wrong distinction** — §Scoring, §Reporting; previously
2026-09-15:
**SAT English (Reading & Writing) shipped** —
own collections, a platform-owned 1,406-question bank, `SatRunner` reused
as-is for both subjects; `SatRunner` also switched to English-only chrome + a
draggable two-pane split with images/plots in the workspace column + an A-/A+
text-size control — all below; previously added the "Namunaviy variant"
sample test on 2026-09-14, introduced 2026-09-11).

## Purpose & scope

A teacher builds an **adaptive SAT test** — Module 1 (fixed, every student
answers the same one) and two Module 2 pools (**Easier** / **Harder**) — by
picking questions from a bank and/or writing new ones, publishes it behind a
private 6-digit code, and a student sits it in an interface built to resemble
the real digital SAT (Bluebook): a hideable timer, a question navigator,
mark-for-review, answer elimination (cross-out), a calculator, a
reference-formulas panel, and an A-/A+ text-size control. Which Module 2 pool
a student is served depends on their Module 1 score — the real digital SAT's
own per-module (not per-question) adaptivity.

**Two subjects, one shared shape, own everything else.** Math shipped first
(teacher's own bank, own collections, own code namespace). English (Reading &
Writing) followed the SAME shape — own collections
(`sat_english_tests`/`sat_english_results`), own code namespace, own
localStorage session key — but its question pool is different: rather than
relying on teachers to hand-author ~1,400 R&W questions, the donated bank at
`questions.json` (repo root, 4 official R&W domains, Easy/Medium/Hard) was
imported ONCE as **platform-owned** `teacher_questions`
(`scripts/importSATEnglishQuestions.ts`, `creatorId: ''`) that every teacher's
builder can pick from alongside their own. `SatRunner`, the student-facing
sitting component, is REUSED AS-IS by both subjects (`subjectName`/`onSave`
props inject what differs) — English's items are always a single self-contained
paragraph + question + 4 choices, never a shared long passage, so the
"passages/highlighting" extension the original design assumed R&W would need
never became necessary.

### ⚠️ Why this is a NEW subsystem, not a Milliy sertifikat subject

SAT looks superficially like a fourth Milliy sertifikat paper (teacher owns a
paper behind a code, student sits it, one result doc), but three things make
it genuinely different, and each is why it does not reuse that machinery:

| | Milliy sertifikat (`milliy_quizzes`/`teacher_rasch_quizzes`) | SAT (Math + English) |
|---|---|---|
| Structure | one flat list of questions | **Module 1 + two Module 2 pools**, chosen by routing |
| Scoring | cohort-relative dynamic marks (`lib/RASCHmarks.ts`, `B = Y + σ`) | **per-student** approximate scaled score (`lib/SATscore.ts`) — the real SAT does not re-price a question by how the class did |
| Question shape | reuses `ExamQuestion`/`lib/ExamTeacher.ts` (blueprint `sectionId`, `testType` Y-1/Y-2/O, block expansion) | **its own small `SatQuizItem`** (`types/SatQuiz.ts`) — always a single `mcq` or `numeric`, never a block; forcing it through `toExamItem` would import DTM-protocol meaning that does not apply |
| Student UI | shared `ExamRunner`/`ExamReview` | **a new runner**, `SatRunner` — Bluebook-style visual language (hideable timer, cross-out, calculator, module transition screen, a resizable two-pane split, A-/A+ text size), which is not a "variant" of the existing exam family. **Shared by BOTH SAT subjects** — `subjectName`/`onSave` props are all that differ per caller |
| Chrome language | trilingual `{uz, ru, en}`, follows `useStudentLanguage()` | **English-only** — the real SAT is administered in English, so the whole student-facing `/sat` tree (hub, code entry, runner) ignores the app's language setting |
| Code namespace | shared across `milliy_quizzes` + `teacher_rasch_quizzes` (one student code box resolves both) | **its own PER SUBJECT** — `reserveSatCode`/`findSatTestByCode` only ever look at `sat_math_tests`; `reserveSatEnglishCode`/`findSatEnglishTestByCode` only ever look at `sat_english_tests`. The two are not cross-checked against each other either |
| Question bank ownership | always the individual teacher's own | Math: teacher's own bank only. English: teacher's own bank **PLUS** a platform-owned pool (`creatorId: SAT_PLATFORM_CREATOR_ID` — `''`, the repo's existing "no owner" sentinel) — 1,406 questions imported once from a donated bank, picked from a "Platform bank" tab exactly like a teacher's own questions |

What IS reused, deliberately: the whole v1 question-authoring pipeline
(`toQuestionV1`/`normalizeQuestion`, `/teacher/create/question`, the
`?back=`/`?add=`/`?subject=` round trip via
[returnTo.ts](../app/teacher/create/_components/returnTo.ts)), the topic
taxonomy mechanism, `useExamLockdown` (full-screen + interruption detection,
unchanged), and the `createSessionStore` PATTERN (`lib/SatSession.ts` is a
sibling implementation of the same factory in
[lib/Examsession.ts](../lib/Examsession.ts), not a shared instantiation — SAT's
snapshot shape is different enough, and its own localStorage key, that
touching the shared module for one more caller was not worth the risk to the
three callers already depending on it).

## Key files

| File | Responsibility |
|---|---|
| [types/SatQuiz.ts](../types/SatQuiz.ts) | Document shapes: `SatQuizItem`, `SatMathTest`, `SatMathResult`, and the runner's own `SatExamSnapshot`. |
| [lib/SatMathQuiz.ts](../lib/SatMathQuiz.ts) | Pure layer — `SAT_MATH_DOMAINS` (the 4 domains), `SAT_SECTIONS` (the section registry, Math live / R&W soon), picked-question → `SatQuizItem`, the add check, the routing rule, grading (`isSatItemCorrect`). No Firestore. |
| [lib/SATscore.ts](../lib/SATscore.ts) | The 200–800 **approximate** scaled score: `SAT_RAW_SCORE_TABLE` (the published Practice Test 11 conversion curve), `estimateScoreBand`, `estimateScaledScore`, `formatScoreBand`. Pure. ⚠️ Read its length-trap note before touching. |
| [lib/SatDefaultPaper.ts](../lib/SatDefaultPaper.ts) | The **sample test** — validates `data/sat-math-default-paper.json` and turns it into `SatQuizItem`s for all three modules. Pure; no Firestore. |
| [data/sat-math-default-paper.json](../data/sat-math-default-paper.json) | **The sample test's content — the only file to edit to change it.** 22 real questions per module (66 total, the real digital SAT's own module length), Algebra + Advanced Math domains, 17 with a graph image. |
| [lib/SatSession.ts](../lib/SatSession.ts) | The browser-side sitting store — own localStorage key `sat:math:v1`. |
| [services/satMathQuizService.ts](../services/satMathQuizService.ts) | Every read and write, plus `reserveSatCode`/`findSatTestByCode`. Nothing else touches the two collections. |
| [app/(student)/sat/_components/SatScoreSummary.tsx](../app/(student)/sat/_components/SatScoreSummary.tsx) | The score-report banner — band, disclaimer, raw/%, route badge, right/wrong/blank tally, per-module split. **Shared by both student subject pages.** |
| [lib/SatQuestionImport.ts](../lib/SatQuestionImport.ts) | **Pure** parse/validate for the teacher JSON importer + `SAT_IMPORT_EXAMPLE` (the one true format). No Firestore. |
| [app/teacher/create/import/page.tsx](../app/teacher/create/import/page.tsx) | The import page (ALL subjects; `/teacher/sat/import` redirects here with `?subject=sat-matematika`) — subject picker, the copyable AI prompt (`buildImportAiPrompt`, lists only that subject's taxonomy ids), the format block, the grouped fix UI, the batched write. |
| [scripts/setSATMathSubtopics.mjs](../scripts/setSATMathSubtopics.mjs) | Replaced the `sat-matematika` subtopics with the centre's own book sections (2026-09-16). ⚠️ Supersedes the subtopic half of `addSATMathTopics.mjs` — don't re-run that one. |
| [scripts/addSATMathTopics.mjs](../scripts/addSATMathTopics.mjs) | How the `sat-matematika` taxonomy (4 official College Board Math domains) was appended to `data/question_topics.json`. |
| `app/teacher/sat/page.tsx` | The teacher's section hub — `SAT_SECTIONS` cards (icon · name · Ready/Soon only since 2026-10-31; no banner, no import card). The test facts are info pills + the JSON import button on `sat/math` and `sat/english`. |
| `app/teacher/sat/math/page.tsx` | The teacher's test list: code, status, edit, results, delete. |
| `app/teacher/sat/math/build/page.tsx` | The builder — three module pickers + settings (`?id=` to edit). |
| `app/teacher/sat/math/_components/{SatBankPicker,draft}.tsx/.ts` | The one pool (own bank, filtered to `sat-matematika` + `mcq`/`numeric`) and the localStorage stash for the "write a question" round trip. |
| `app/teacher/sat/math/results/[testId]/page.tsx` | Who sat it; scaled score, route taken, per-domain breakdown, per-question solve rate (plain %, not cohort-priced). |
| [services/satEnglishQuizService.ts](../services/satEnglishQuizService.ts) | English's OWN read/write layer — `sat_english_tests`/`sat_english_results`, `reserveSatEnglishCode`/`findSatEnglishTestByCode`. A sibling of `satMathQuizService.ts`, not a shared module. |
| [scripts/addSATEnglishTopics.mjs](../scripts/addSATEnglishTopics.mjs) | How the `sat-ingliz-tili` taxonomy (4 official College Board R&W domains, ONE subtopic each — the source bank has no finer tag) was appended to `data/question_topics.json`. |
| [scripts/importSATEnglishQuestions.ts](../scripts/importSATEnglishQuestions.ts) | **One-off** (already run): imports the donated `questions.json` bank as platform-owned `teacher_questions` — content de-dup (1,443 → 1,406 unique), the trailing-meta-question strip (see below), `toQuestionV1` for a real v1 doc. `npx tsx scripts/importSATEnglishQuestions.ts [--apply]`. |
| `app/teacher/sat/english/page.tsx` | The teacher's English test list — sibling of `sat/math/page.tsx`. |
| `app/teacher/sat/english/build/page.tsx` | The English builder — same shape as Math's, minus the "Namunaviy variant" sample-paper button (no bundled sample for English; the platform bank IS the ready content). |
| `app/teacher/sat/english/_components/{SatEnglishBankPicker,draft}.tsx/.ts` | The picker (Platform bank / Mine tabs, filtered to `sat-ingliz-tili` + `mcq` only) and the localStorage stash for the "write a question" round trip. |
| `app/teacher/sat/english/results/[testId]/page.tsx` | Sibling of Math's results page, `SAT_RW_DOMAINS` breakdown. |
| `app/(student)/sat/page.tsx` | The student's section hub. |
| `app/(student)/sat/math/page.tsx` | Code box, intro, the sitting, results, past sittings — Math. |
| `app/(student)/sat/english/page.tsx` | Code box, intro, the sitting, results, past sittings — English. Sibling of the Math page: own session store, own service, but passes the SAME `SatRunner`. |
| `app/(student)/sat/_components/SatRunner.tsx` | **The Bluebook-style runner, SHARED by Math and English** — module screens, timer, navigator, cross-out, flag, calculator, reference panel, a draggable two-pane split (question column / workspace column, plots/images in the workspace pane), an A-/A+ text-size control. English-only chrome. Takes `subjectName` (labels the module header) and `onSave` (which collection the result lands in) so it never imports a subject-specific Firestore write itself. |
| `app/(student)/sat/_components/{SatCalculator,SatReferenceSheet,SatReview}.tsx` | The on-screen calculator (NOT Desmos — see below), the reference-formulas panel, and the per-question review grid. |
| [lib/SatEnglishSession.ts](../lib/SatEnglishSession.ts) | English's browser-side sitting store — own localStorage key `sat:english:v1`, a sibling of `lib/SatSession.ts`. |

## Flows

### The taxonomy: `sat-matematika` / `sat-ingliz-tili`, two normal subjects

`data/question_topics.json` gained a subject, `sat-matematika`, with the 4
official College Board digital SAT Math domains as topics (Algebra, Advanced
Math, Problem-Solving and Data Analysis, Geometry and Trigonometry). This is
factual, non-copyrightable test-specification vocabulary — not excerpted
questions.

🟢 **2026-09-16 — the SUBTOPICS under those 4 topics were replaced** with the
learning centre's own SAT Math book structure (chapter → section), 25 sections
in total, by [scripts/setSATMathSubtopics.mjs](../scripts/setSATMathSubtopics.mjs).
`scripts/addSATMathTopics.mjs` (which seeded College Board's own content
categories) is kept for history — **do not re-run it**, it would put the old
categories back.

⚠️ **The 4 topic ids AND names were deliberately left alone.** Each is a
`SatMathDomain` in `types/SatQuiz.ts`, is mirrored by `SAT_MATH_DOMAINS` in
`lib/SatMathQuiz.ts`, is snapshotted onto every `SatQuizItem.domain`, and is a
KEY inside `SatMathResult.domains` on every sitting ever submitted. Renaming or
re-slugging one silently orphans finished results and breaks the typed union.
The supplied chapter titles map 1:1 onto the four, so only the section level
moved.

⚠️ **17 old subtopic ids are now orphans.** A question already filed under, say,
`linear-equations-in-one-variable` keeps that id — `normalizeQuestion` reads the
stored NAME, so it still displays and grades fine, but it matches no taxonomy
row, so a subtopic filter won't find it. Only `linear-functions` and `circles`
survive the swap by coincidence. Nothing is migrated, per docs/QUESTIONS.md
("never touch a legacy doc"). The script prints both lists when it runs.

⚠️ **This is why `/teacher/create/question` needed ZERO new code** to author
SAT Math questions — it already reads `SUBJECTS` off `data/question_topics.json`,
exactly the mechanism biology/chemistry/physics/ona-tili each rode in for free
(docs/QUESTIONS.md). A SAT Math question is authored, stored and normalized
exactly like any other `teacher_questions` v1 document; only `mcq` and
`numeric` are meaningful here (a "student-produced response" grid-in answer
IS a `numeric` question — no new question type exists for it).

`data/question_topics.json` also gained `sat-ingliz-tili`, the 4 official
College Board digital SAT Reading & Writing domains as topics (Information and
Ideas, Craft and Structure, Expression of Ideas, Standard English
Conventions) — same factual, non-copyrightable naming. ⚠️ **Unlike Math, each
domain has exactly ONE subtopic, same name as the topic** — the donated
question bank (below) carries only a domain per question, no finer
content-category tag, so a real subtopic split would be unfillable for every
bulk-imported item. A teacher hand-authoring a new R&W question by hand still
only ever sees this one choice per domain. SAT English authors ONLY `mcq`
(`isSatEnglishAuthorableType`) — the real digital SAT R&W section has no
grid-in questions, unlike Math.

### Building — one document, three item arrays, no refs

The builder (`app/teacher/sat/math/build/page.tsx`) has three module tabs (a
`PillGroup` with per-module counts; routing is drawn as a Module 1 → ≥N →
Harder / otherwise → Easier flow instead of a hint sentence; the access code
box appears only once a code exists), one per
module (`module1`, `module2Easier`, `module2Harder`), each backed by
`SatBankPicker` — the teacher's own bank, filtered server-side to
`subject.id == 'sat-matematika'` and client-side to `mcq`/`numeric`
(`isSatAuthorableType`). Writing a new question leaves for the real builder,
`/teacher/create/question?subject=sat-matematika&back=…&module=…`, and returns
with the question already added to **the module the teacher was on** (the
`?module=` query rides the same `?back=`/`?add=` round trip
[returnTo.ts](../app/teacher/create/_components/returnTo.ts) already defines —
see docs/MILLIY_QUIZ.md/[RASCH_QUIZ.md](RASCH_QUIZ.md) for the mechanism in
full; SAT is the third caller).

⚠️ **No blueprint, no quota.** A teacher builds each module to whatever length
they like; publishing only requires all three modules non-empty.

**English's builder** (`app/teacher/sat/english/build/page.tsx`) is a SIBLING
of the above — same three tabs, same no-blueprint/no-quota rule, same
`?back=`/`?add=`/`?module=` round trip to `/teacher/create/question`, own
`app/teacher/sat/english/_components/draft.ts` localStorage stash. The one
structural difference: `SatEnglishBankPicker` has a **Platform bank / Mine**
source toggle instead of Math's All/AI/Mine — Platform queries
`teacher_questions` with `creatorId == SAT_PLATFORM_CREATOR_ID` (`''`) instead
of the signed-in teacher's own uid, both filtered to `subject.id ==
'sat-ingliz-tili'`. **No rules change was needed for this** — `teacher_questions`
already reads `allow read: if isAuth()` for every signed-in user (docs/QUESTIONS.md),
so a different `creatorId` in the query is all it takes. There is also no
"Namunaviy variant" button for English — the platform bank already IS 1,406
ready questions, so the relief a bundled sample paper gives Math isn't needed.

### The platform question bank — `scripts/importSATEnglishQuestions.ts` (2026-09-15)

The donated 1,443-question SAT Reading & Writing bank (`questions.json`, repo
root) was imported **once** into `teacher_questions` as platform-owned content
— `creatorId: SAT_PLATFORM_CREATOR_ID` (`''`, the SAME "no owner" sentinel
`scripts/createSatSampleTest.ts` already uses for `sat_math_tests.teacherId`),
`creatorName: "SAT Ingliz tili (bank)"`, `creationMethod: 'exam_import'`,
`status: 'published'` (curated, already-correct content — no review queue
needed). Every document is built through `lib/questionSchema.ts::toQuestionV1`,
the SAME adapter every hand-authored question goes through — not a hand-rolled
shape — so it renders, filters and grades identically to a teacher-written
question.

⚠️ **The source data needed real cleanup before import, not a blind pass-through:**

- **The source's own `id` field is JUNK** — only 799 unique values across
  1,443 rows, with completely DIFFERENT questions sharing an id (e.g.
  `"random_id_a1"` labels 61 unrelated questions). Never keyed off it; every
  imported document gets a fresh `tq_<random>` id, same convention
  `services/questionBankService.ts::newQuestionId()` uses.
- **37 rows are exact content duplicates** (same paragraph + question +
  choices + answer) under a handful of those junk ids — de-duped by content
  hash before import. **1,443 → 1,406 unique questions actually imported.**
- **766 of the 1,443 rows (53%) have their own trailing meta-question baked
  into `paragraph`** — e.g. `paragraph` ending "...individuals. What is the
  main point of the passage?" followed by a `question` field asking basically
  the same thing again, more specifically. A leftover from however the source
  bank was generated. The import strips that trailing clause (regex-isolate
  the passage up to the last sentence boundary before the trailing `?`,
  verified against all 766 affected rows: 657 strip cleanly, the other 109
  don't match this shape confidently and are left as-is rather than risk
  cutting real passage content) before joining `paragraph + "\n\n" + question`
  into the ONE `question` field the v1 schema has (there is no separate
  passage field — matches the "one question per screen" runner decision
  below; each row is already self-contained, never a shared long passage).
- **All 1,443 rows are `mcq`** (source has no `numeric`/grid-in items) with
  **exactly 4 choices each** and **no real images** (`visuals.svg_content` is
  `"null"` on every row that has the field at all) — confirmed before import,
  not assumed.

Re-running the script is safe but NOT idempotent-by-design: it always mints
fresh ids and writes fresh documents, so re-running would DUPLICATE the whole
bank rather than update it. If the source ever needs a correction pass, that's
a deliberate decision to make explicitly (delete-and-reimport, or a separate
one-off patch script), not a "just run it again."

### The sample test — "Namunaviy variant" (2026-09-14, Math only)

A second route to a complete test, beside the picker: a button at the top of
the **Savol qo'shish** card (one per module tab) that drops a ready-made test
onto all three modules at once — the same relief the Milliy sertifikat
builders give ("write a question before you can publish anything" is a wall in
front of the first test anyone tries to make). Mirrors `lib/MilliyDefaultPaper.ts`'s
pattern (see [MILLIY_QUIZ.md](MILLIY_QUIZ.md)), adapted to SAT's three-module
shape instead of one flat list.

- **The content is DATA, and it is REAL SAT content**: [data/sat-math-default-paper.json](../data/sat-math-default-paper.json)
  — 22 questions per module (66 total, matching the real digital SAT's own
  module length), curated from a donated bank of 885 Algebra-domain questions
  (Linear equations/functions/systems; the items that were actually quadratics,
  factoring or rational expressions were re-filed under `advanced-math` rather
  than left under the source's own coarser "Algebra" label). Every module
  keeps roughly the same Algebra:Advanced Math ratio; Module 2 Easier is built
  ONLY from the bank's
  beginner/easy/medium items, Module 2 Harder ONLY from hard/expert, Module 1
  is a genuine mix — the same shape the real adaptive test has. **17 of the 66
  carry a graph image** (`/sat/*.png`, bundled as static files under
  `public/sat/` — never a Firebase Storage URL, so the sample stays a
  zero-Firestore-read, zero-network-write bundle even with images). All 66 are
  `mcq`; the source bank had no `numeric` items. That file is the only place to
  edit the sample content.
- **[lib/SatDefaultPaper.ts](../lib/SatDefaultPaper.ts) owns every rule.** Each
  entry names only a `domainId` (one of `SAT_MATH_DOMAINS`'s ids) — the
  `domainLabel` is derived from the registry, so the JSON cannot invent a
  domain the results page can't group under.
- ⚠️ **mcq vs numeric is decided by the PRESENCE of `options`**, not a flag —
  same rule the Milliy sample papers use.
- ⚠️ **A file that does not validate is REFUSED, not loaded**, with the first
  problem named in a toast: an unknown `domainId`, a closed item with fewer
  than two options, an `answer` that isn't one of its own option keys, or an
  empty `answer`.
- ⚠️ **It REPLACES all three modules** (with a `confirm()` when any is
  non-empty), and also sets `module1Minutes`/`module2Minutes`/
  `routingThreshold` from the file. Afterwards the items are ordinary module
  items — remove, reorder and mix in your own freely.
- ⚠️ **The items are snapshots, not bank documents** — same freeze every
  stored quiz item has elsewhere in this repo. Their ids are
  `sat-sample-<module>-NN`, deliberately not Firestore-shaped so they can
  never collide with a real question in `satPickedIds`/`checkSatAdd`.
- The file is loaded with a **dynamic `import()`** so the sample content ships
  in its own chunk, fetched only on the first click rather than by every
  teacher who opens the builder.

⚠️ **Questions are EMBEDDED SNAPSHOTS, not refs** — the same trade every
teacher-built paper in this repo makes. A whole test costs ONE read however
many students sit it, and freezes the questions so a later correction does not
re-key a test somebody already answered.

⚠️ **A Firestore document is capped at 1 MiB.** `satByteSize` sums all THREE
module arrays; the builder warns (Banner) once the size passes 80 % of
`SAT_MAX_BYTES` (900 KB) — no meter below that (2026-10-31 simplification) — and
`saveSatMathTest` refuses to write past it.

### Teacher dataset import — `/teacher/create/import` (2026-09-16; all subjects 2026-10-29)

A teacher picks a subject and uploads a **JSON file** of questions; every row is validated and
written to `teacher_questions` as ordinary v1 documents, through the SAME
adapter hand-authored questions use (`toQuestionV1`), so they render, filter
and grade identically to anything else in the bank.

| File | Role |
|---|---|
| [lib/SatQuestionImport.ts](../lib/SatQuestionImport.ts) | **Pure** parse + validate + the documented example. No Firestore, no React. |
| [app/teacher/create/import/page.tsx](../app/teacher/create/import/page.tsx) | The page: subject picker, the AI prompt, the format block, the report, the commit. `?subject=<taxonomy id>` preselects, `?back=` sets the back button. |
| [app/teacher/sat/import/page.tsx](../app/teacher/sat/import/page.tsx) | Server redirect → `/teacher/create/import?subject=sat-matematika&back=/teacher/sat` (old links). |

**Every subject (2026-10-29).** The subject chips list ALL of
`data/question_topics.json` (`importSubjects`): biologiya, kimyo, fizika,
ona-tili, algebra, geometriya, SAT Math, SAT R&W. Entry points: the create hub
card "JSON orqali import", a "JSON import" button on each SAT section page
(`/teacher/sat/math` → `sat-matematika`, `/teacher/sat/english` →
`sat-ingliz-tili`; replaced the SAT hub's import card 2026-10-31), and one on each
Milliy sertifikat subject page (`/teacher/milliy-sertifikat/[subject]`, preselects
its `taxonomySlug` — imported rows land in the teacher's own bank, which is that
paper builder's only pool). What differs per subject is `importProfile`:

| Subject | Types | Text stored in |
|---|---|---|
| `sat-matematika` | `mcq`, `numeric` | `.en`, `language: ['en']` |
| `sat-ingliz-tili` | `mcq` | `.en` |
| every other subject | `mcq`, `open`, `numeric` | `.uz`, `language: ['uz']` |

A row with no `type` and no `choices` defaults to `open` where allowed. The
example (`importExampleFor`) and the AI prompt (`buildImportAiPrompt`; Uzbek
content for non-SAT) use the selected subject's own ids. The "share with other
teachers" switch (`sharedBank`) is shown and written **for SAT only** — only the
SAT pickers read that flag. ⚠️ File names (`SatQuestionImport.ts`,
`SatTaxonomyMatch.ts`) kept on purpose: the Android teacher app mirrors them.

**The file format** (`SAT_IMPORT_EXAMPLE` in the pure module is the single
source of truth — the UI prints that same constant, so the docs, the screen and
the validator cannot describe three different shapes):

```json
[
  { "question": "…", "type": "mcq", "topic": "algebra", "subtopic": "linear-equations",
    "difficulty": "easy", "choices": { "A": "…", "B": "…" }, "answer": "B", "explanation": "…" },
  { "question": "…", "type": "numeric", "topic": "problem-solving-and-data-analysis",
    "subtopic": "unit-conversion", "answer": "16.25", "acceptedAnswers": ["65/4"] }
]
```

A top-level array, or `{"questions": [...]}`. `choices` may also be a plain
array (→ A, B, C, D). `difficulty` defaults to `medium`. Math accepts
`mcq`+`numeric`, English `mcq` only (`allowedTypesFor`). Cap: `MAX_IMPORT_ROWS`
(5000) per upload; the page writes in chunks of 500 (Firestore's batch cap).

**The extended exported format is accepted too**: `question`/`explanation` may be `{en, uz, ru}` objects (legacy `uk`
is read as `en`), and the options may come as `options` instead of `choices`,
each entry a string or a `{en, uz, ru}` object. `normalizeRow` folds `options`
into `choices` before validation (so reasons and the fix UI see one name);
`toLocalized` keeps every language present and back-fills the subject's own slot
(`.en` SAT / `.uz` else) from the first non-empty one, so the runner never reads
`''`. A plain string still goes only into the subject's language.

**Free-form rows (2026-10-31) — [lib/importAliases.ts](../lib/importAliases.ts), SHARED with the admin questions1 import.** `normalizeRow` = `canonicalizeRow`: field names match loosely (case/`_`/`-`/spaces/apostrophes ignored; Uzbek + Russian names: `savol`, `variantlar`, `javob`, `вопрос`, `ответ`…), each alias only taken when its value fits (`answers: [...]` → choices but `answers: "B"` → answer; `level: "SAT"` is not a difficulty). Choices: array/object, entries text / `{en,uz,ru}` / `{text, isCorrect}` / `{id:"A", content}`, keys `"a)"`/`"option_a"`/`"1"`. Answer: decorated letter → the choice's own TEXT (unique) → position (1-based; 0-based for a field named `…index`) → the choice flagged correct. ⚠️ Text beats position: choices `3,5,8,9` + `"answer": 3` resolves to A ("3"), not C — the preview is where a teacher catches it. A separate `passage` is put in front of the question; `{passage, questions:[…]}` groups expand to one row each (`expandQuestionGroups`); difficulty (`3`, `qiyin`, `сложный`…) and type (`grid-in`, `multiple_choice`, `short_answer`…) synonyms are normalised; a row with no type and no choices is `open`, or `numeric` where the subject has no `open` (SAT Math). Any wrapper is found by `findQuestionList` (`results`, `savollar`, nested). **To accept a new spelling, add it to `FIELD_ALIASES` — one place, both importers.** ⚠️ **Wrong-subject guard**: before fuzzy resolution, a row whose
topic/subtopic/hint label is an exact id/name of the OTHER SAT subject (or an
official R&W skill name — "Command of Evidence", "Boundaries"…) is REJECTED with
`this looks like a … question` and `SatImportError.foreignSubject`. Before this,
R&W rows imported under SAT Math were silently filed under Problem-Solving →
Research organizing by the keyword synonyms ("data", "study", "survey"). The page
groups them in one banner: re-read the file as that subject, or remove them.
Name matching also accepts a unique ≥ 6-char name PREFIX ("Research organizing").

**Review before writing (2026-10-31).** Preview rows (`_components/PreviewRow.tsx`)
expand to the full built question — text (LaTeX), image, every choice with the
correct one marked, typed answer + accepted forms, explanation — and ✕ removes a
row from the import (`removedOk`, never written). Paged 50 at a time. The
rejected-rows box has **Remove all errors** (confirm; dismissed rows are simply
not imported).

**College Board bank rows are accepted as-is** (`{questionId, skill_cd,
primary_class_cd, difficulty:"E|M|H", content:{stem, stimulus, answerOptions,
keys, correct_answer, rationale}}`, also a single object). `parseSatImport`
detects them (`isCollegeBoardRow`) and converts via
[lib/SatCollegeBoardImport.ts](../lib/SatCollegeBoardImport.ts) BEFORE
validation: HTML/MathML flattened to plain text (stimulus + stem → `question`,
`sr-only` spans dropped, first `<img>` → `imageUrl`), `spr` → `numeric` (extra
`correct_answer` entries → `acceptedAnswers`), `E/M/H` → easy/medium/hard, domain
code (INI/CAS/EOI/SEC, H/P/Q/S) → topic, plus `hints` (domain/skill text).

**Fuzzy topic matching** ([lib/SatTaxonomyMatch.ts](../lib/SatTaxonomyMatch.ts),
`resolveSatTaxonomy`, used by `buildRow` for EVERY row, native or College Board):
exact id → normalised id/name (`"Linear Equations"`, `linear_equations`) → synonym
keyword regexes (`quadratic`→quadratics, `sine`→trigonometry…) → parent topic of a
matched subtopic → per-topic default subtopic (`TOPIC_DEFAULT_SUBTOPIC`). ⚠️ The
default means an unrecognised math skill inside a KNOWN topic is filed under that
topic's default subtopic, not rejected; only rows with no resolvable topic hit the
error report. Add a synonym there when a skill is misfiled. Order in
`SUBTOPIC_SYNONYMS` matters (first match wins). The synonym tables are SAT ids,
so on other subjects they never fire. Name matching also tries the name without
its numbering (`"I. Umumiy kimyo"` ← `"Umumiy kimyo"`) and the child half of a
`"Parent — Child"` name (`"Oksidlar"`), **only when exactly one item matches**.
The per-topic default subtopic is SAT Math-only; elsewhere a topic with several
subtopics is never guessed — the row goes to the fix UI.

Field aliases (2026-10-28): topic text is read from the first of `topic`,
`topicName`, `topic_name`, `domain`, `category`; subtopic text from `subtopic`,
`subtopicName`, `subtopic_name`, `skill`, `skill_desc`. Each may be a string (id
OR display name) or a `{id, name}` object (our own exported docs). `hints`,
`tags` and `name` are passed to the resolver as extra clues. **`tags`** (array or
comma-separated string, `readTags`) are also **persisted** into the question's
`tags[]` (merged with `exam_import` by `toQuestionV1`); the page adds an
import-wide "Tags" field merged into every row at write time.

**Fix UI**: rows the resolver still cannot place are NOT fixed one by one —
they are grouped by `SatImportError.topic` (the resolved topic id, `''` when the
topic itself is unknown) and each group gets ONE `BulkTopicFix` picker (display
names): a known-topic group asks only the subtopic, the `''` group asks both. Answer/difficulty errors stay per row (`FixableRow`). Both re-validate
through `buildSatImportRow` (the same `buildRow` as the parse), so a fixed row is
built exactly like a clean one; a row that then fails for another reason stays
in the list with the new reason.

⚠️ **Every row is validated against the taxonomy before ANY write.**
`toQuestionV1` THROWS `InvalidTopicError` on an unknown subject/topic/subtopic
triple (docs/QUESTIONS.md), so an unvalidated row would blow up mid-import with
earlier rows already committed. Rejecting up front is what makes the report
trustworthy. Rejections name the offending value (`unknown "subtopic": "…"
under topic "…"`) — a 400-row file is only fixable if the report says which id
was wrong. Exact-content duplicates **within one file** are dropped and counted.

⚠️ **This is why the page offers a copyable AI prompt** (`buildImportAiPrompt`, alias `buildSatAiPrompt`, in
`lib/SatQuestionImport.ts`, 2026-10-17 — replaced the printed topic → section
tree): `topic`/`subtopic` are the taxonomy's own ids, they are persisted into the
document, and nobody can guess `research-organizing-margin-of-error-outliers`.
The prompt is built from `data/question_topics.json` for the selected subject and
tells the model to use only those ids, in the exact import format.

**Status**: rows are written with `creationMethod: 'exam_import'`, whose default
status is **`review`** — deliberately NOT overridden to `published` the way the
curated platform import was (that content was vetted; a teacher's upload is not).
`review` questions are still pickable — no picker filters on status.

#### ⚠️ Ownership vs visibility — do not conflate these

| | `creatorId` | Who can edit/delete | Written by |
|---|---|---|---|
| A teacher's import | **the uploader's uid** | the uploader | the client, `/teacher/create/import` |
| The platform pool | `''` (`SAT_PLATFORM_CREATOR_ID`) | nobody in-app | an Admin-SDK script only |

The `teacher_questions` create rule is
`request.resource.data.creatorId == request.auth.uid`, so a client **cannot**
write into the anonymous platform pool — and shouldn't: that pool is curated.

"Share" is therefore a **visibility flag, not an ownership change**: ticking it
adds the flat `sharedBank: true` field (`types/question.ts`). The uploader keeps
`creatorId`, so they alone can edit or delete it, and the picker shows their
`creatorName` as attribution — a bad upload is traceable and removable by its
owner, which an anonymous global write would not be.

Read back by `fetchSharedQuestionsPage(subjectSlug, …)` —
`sharedBank == true && subject.id == … orderBy createdAt desc`, on its own
composite index. It cannot ride the `creatorId + subject.id + createdAt` one:
the query is deliberately NOT creator-scoped.

**In the pickers**: SAT Math's `SatBankPicker` gained a **bank axis**
(`My bank` / `Shared`) above its existing PROVENANCE chips (all/AI/me — a
different axis; the chips hide in Shared, since adding a `creationMethod in […]`
leg would need yet another index). SAT English's picker gained `Shared` as a
third source beside `Platform bank` and `Me`. Shared rows carry the uploader's
name.

### The SAT practice bank → generated practice tests (2026-10-31)

The import page has **two tabs** (`kind`): **Savollar (bazaga)** — the bank
import above, into the teacher's own `teacher_questions` — and **SAT amaliyot
banki** (`?kind=exam`, SAT subjects only): the questions go into ONE shared
**practice bank** (`sat_pool`), and every student's SAT page **generates** a new
real-SAT-shaped test from it on demand. (Superseded the same day: an earlier
version turned a mock file into ONE fixed test listed via a `catalog` flag — a
1,845-question file is a bank, not a test. Nothing writes `catalog`.)

| File | Role |
|---|---|
| [lib/SatPractice.ts](../lib/SatPractice.ts) | **Pure.** `SAT_MODULE_PLAN` (per module: 22 Q / 35 min Math — Algebra 7, Advanced 7, PSDA 4, Geometry 4; 27 Q / 32 min R&W — C&S 7, I&I 7, SEC 7, EoI 6), `buildSatPoolItems` (validated rows → `SatQuizItem`s with `subtopic`, ids `<batchId>-0001`), `chunkSatPool` (< 700 KB per chunk), `generateSatPractice`. |
| [services/satPoolService.ts](../services/satPoolService.ts) | `saveSatPoolBatch` (sequential chunk writes), `loadSatPool(subject)` (one `subject ==` query, content-deduped across uploads), `listMySatPoolBatches`, `deleteSatPoolBatch`. |
| [lib/SatExamImport.ts](../lib/SatExamImport.ts) | **Pure.** File STRUCTURE only: `detectSatExam` finds modules/sections so a whole mock or a Math + R&W file can be imported; `sectionAllRows` / `allExamRows` flatten them. Module boundaries no longer matter. |
| [app/(student)/sat/_components/SatPracticeGenerator.tsx](../app/(student)/sat/_components/SatPracticeGenerator.tsx) | The student card on `/sat/math` and `/sat/english`: bank size + domain-mix bar, "Generate a practice test", the practice-score chart. Hidden until the bank holds ≥ 2 modules' worth. |
| `app/teacher/create/import/_components/ModuleMixChart.tsx` | Bank tab: questions by domain, one bar per difficulty. |

**Bank tab.** Any file shape — a question list, a full mock (`module1`/`module2`…),
a `{data:{items}}` wrapper, a two-section file (`detectSatExam(…, {force: true})`;
section chips import Math and R&W in turn). Rows are validated by
`parseSatImportRows` (same checks, fix UI, wrong-subject guard, dedupe on).
"Add N questions to the practice bank" → one **batch** = chunk docs
`sat_pool/{batchId}_{part}`; no test is created. **"Also add to the question bank"** (default ON, 2026-10-31) writes the same rows to the teacher's own `teacher_questions` too (`writeToQuestionBank`, the questions tab's writer, `sharedBank` per the share switch) so the SAT test builder can use them for real mock tests. ⚠️ Those are separate docs: deleting the practice-bank upload does NOT remove them. The tab lists the teacher's own uploads with **delete** (a
correction = delete + re-upload; chunks are never updated).

**Generating (`generateSatPractice`).** Per module and domain: the domain's
quota, split by the module's difficulty mix (Module 1 ⅓/⅓/⅓; Module 2 Easier
50/40/10 easy/medium/hard; Harder 10/40/50 — largest remainder, ties rotated per
domain), a short difficulty borrowing from the nearest one; inside a bucket the
**subtopic picked least so far in this module goes first** (one per subtopic,
then round again); **unseen questions first** (`seen` = every item id in the
student's past results' `items`). Module 1 never repeats in Module 2; the two
Module 2 pools MAY share questions (a student sits only one). A domain the bank
can't fill is topped up from others (`shortages`). Order: Math easiest →
hardest; R&W grouped by domain in plan order, then difficulty.

**The generated test is a normal `sat_*_tests` doc owned by the student**:
id `satp_…` (Math) / `satep_…` (English), `teacherId` = the student's uid,
`teacherName: 'Edify practice'`, `accessCode: ''` (never matched by the code
box), `practice: true`, `status: 'published'`, title
`SAT Math|Reading and Writing Practice Test N` (N = `count(teacherId == uid) + 1`).
It then goes through the same pending → Start screen as a code lookup, so
`SatRunner`, scoring, results, My Mistakes and the past-sittings review work
unchanged. **No rules change for this part**: `sat_*_tests` create is
`teacherId == request.auth.uid`, results already allow the student. The
practice-score chart reads past results whose `testId` starts with the prefix.
The page's past-sittings cache is cleared on submit so the next generation
sees the questions just answered.

**Visuals.** Student card: a `bg-primary-container` hero with an original SVG
subject illustration (`SatArt`, token-coloured, `aria-hidden`), the bank's
**domain-mix bar** (legend with counts, hover/focus tooltip) and — once the
student sat a practice test — **"Your practice scores"**: band range bar + score
dot per sitting, oldest first (single series, recessive 200–800 grid,
screen-reader table). Teacher bank tab: `ModuleMixChart`, one stacked domain bar
per difficulty. Domain colours are fixed slots (`satDomainSlot` → `--s-viz-N` /
`--t-viz-N`), the same on both sides — see STUDENT_UI.md / UI_KIT.md.

### The access code — its OWN namespace PER SUBJECT

Six **digits**, a string everywhere. `reserveSatCode` checks only
`sat_math_tests` — SAT is a separate program with its own code-entry screen
(`/sat`, not `/milliy-sertifikat`), so there is nothing to cross-check the way
`reserveMilliyCode` must check two collections for one shared code box. Still a
check, not a constraint (same accepted limitation the other two subsystems
have). ⚠️ **English gets its OWN separate namespace too** —
`reserveSatEnglishCode`/`findSatEnglishTestByCode` check only
`sat_english_tests`, never `sat_math_tests`. A Math test and an English test
CAN legitimately share the same 6-digit code with no collision — they live at
different student URLs (`/sat/math` vs `/sat/english`), so there is nothing to
resolve between them.

### The routing algorithm

`routingThreshold` (default `Math.ceil(module1.length / 2)`, teacher-editable)
is a raw correct-answer count. At the end of Module 1:

```
route = module1Correct >= routingThreshold ? 'harder' : 'easier'
```

The route is decided **the moment Module 1 is submitted** (or times out) and
is never re-decided; Module 2 is then served from `test.module2Harder` or
`test.module2Easier` accordingly. ⚠️ **The student is never shown their Module
1 score before or during the transition** — the real digital SAT never reveals
it either, and showing it here would let a student reverse-engineer the
threshold. The transition screen (`SatRunner`'s `'transition'` phase) says only
that Module 1 is complete.

### Sitting it — a NEW runner, not `ExamRunner`, SHARED by both subjects

`SatRunner` is a `fixed inset-0 z-[100]` overlay, the same convention
`ExamRunner` established (callers must not wrap it in a `<Page>`), and reuses
`useExamLockdown` unchanged for full-screen + interruption detection. Its own
state machine (`SatRunnerPhase`): `module1 → module1-review → transition →
module2 → module2-review → submitted`. Bluebook-format additions `ExamRunner`
has no equivalent of:

⚠️ **Both `app/(student)/sat/math/page.tsx` and `app/(student)/sat/english/page.tsx`
render this SAME component** — English needed no passage/highlighting fork
after all (every item is already self-contained, never a shared long
passage), so the "extend deliberately, don't fork wholesale" warning below
was honored by dependency injection instead: `subjectName` (`"Math"` /
`"Reading & Writing"`) labels the module header, and `onSave` is the
Firestore write (`saveSatMathResult`/`saveSatEnglishResult`) — the runner
itself imports NEITHER subject's service, only the type. If Reading & Writing
ever needs shared-passage machinery Math doesn't, extend from here, still not
a wholesale fork.

- **Hideable timer** — a toggle that swaps the countdown for `--:--` without
  pausing it (matches the real Bluebook's "hide time" button).
- **Cross-out** — a per-option toggle that strikes an `mcq` choice through
  without deselecting it if it was already chosen; purely a UI aid, never
  graded, never persisted server-side (it lives in the snapshot's
  `crossedOut` map only for reload-survival).
- **Mark for review** — a per-question flag (separately tracked per module —
  `module1Flagged`/`module2Flagged`), surfaced in both the inline flag button
  and the navigator grid.
- **Module review screen** — before a module can be finished, a grid of every
  question (answered/unanswered/flagged) with an explicit confirm dialog. On
  timeout this step is skipped entirely (matches the real test: a module ends
  when the clock does, with no extra step to click through).
- **Calculator** (`SatCalculator`) — ⚠️ **NOT the real Desmos graphing
  calculator** the actual digital SAT embeds. Desmos's embeddable API requires
  an API key registered to this domain under Desmos's own terms
  (desmos.com/api) — something only the account owner can obtain, so this ships
  a small self-built four-function calculator (classic value+pending-operator
  state machine, no `eval`/expression parsing of any kind) as a placeholder.
  Swap it for the real Desmos embed once a key exists; nothing else about the
  runner needs to change.
- **Reference panel** (`SatReferenceSheet`) — ⚠️ **NOT a reproduction of College
  Board's printed reference sheet** (a copyrighted graphic). It is an
  originally-written list of the same standard, public, factual geometry/algebra
  formulas (circle area, Pythagorean theorem, special right triangles, solid
  volumes…), not an image or a copied layout.
- **Two-pane split** (desktop only; mobile stays single-column) — a narrower
  question/options column on the left, a wider workspace column on the right
  that renders the question's `imageUrl` (plots/graphs), separated by a
  divider the student can drag (pointer-capture based, clamped
  22%–65%). Purely a local UI preference (`leftPanePct` component state) —
  never persisted, resets to the 38% default on reload. The calculator and
  reference sheet still float on top rather than docking into the pane.
- ⚠️ **English-only** — `SatRunner`'s own chrome (buttons, labels, module
  names) is no longer keyed by `useStudentLanguage()`; it is plain English
  text. `snapshot.examLang` is hard-set to `'en'` by BOTH
  `app/(student)/sat/math/page.tsx` and `app/(student)/sat/english/page.tsx`
  for every new sitting — there is no question-language picker anymore (the
  intro card used to offer uz/ru/en). A question's content itself is still
  authored trilingually (`SatQuizItem.question`/`.options` are `{uz, ru,
  en}`); the runner simply always reads the `en` key now. Sittings taken
  before this change may still carry `examLang: 'uz' | 'ru'` on their stored
  result — `SatReview` keys off the stored `examLang`, so old reviews still
  render in their original language.
- **Text size — A-/A+, 8 steps** (`12px`→`30px`, same ramp the IELTS reading
  runner uses) — remembered per device (`localStorage`, key
  `sat:runner:font`, shared across BOTH SAT subjects since it's a reading
  preference, not exam content). Applied to the question body and each
  option's text.

### Submit — exactly ONE write

`saveSatMathResult` writes `sat_math_results/{testId}_{uid}` once, at the end
of Module 2 (or its timeout). Deterministic id ⇒ a retake overwrites, the same
rule every exam-shaped result in this repo follows. Stored alongside the score:

- **`items`** — `{ [questionId]: 0 | 1 }`. No block sub-question namespace is
  needed (SAT items are never blocks), so this is keyed by plain question id,
  unlike `examSlotKeys` elsewhere in the repo.
- **`domains`** — raw `{correct, total}` per SAT Math domain, summed across
  both modules. A domain neither module touched is ABSENT, never `{0,0}`.
- **`scoreBand`** (2026-09-16) — `{lower, upper}`, the estimated scaled-score
  range this sitting falls in. See §Scoring.
- **`omitted`** (2026-09-16) — ids the student left BLANK. ⚠️ `items` cannot
  express this: it stores `0` for a blank exactly as for a wrong answer, and
  "left 6 empty" is different coaching from "got 6 wrong". A blank still scores
  0 — this changes REPORTING only, never the grade.

⚠️ Both new fields are **optional and additive-only**. A sitting from before
2026-09-16 has neither, and every reader must degrade rather than invent:
no `scoreBand` → show the single `scaledScore`; no `omitted` → **hide the
right/wrong/blank tally entirely**, never render it as "0 unanswered".

🟢 **2026-09-16 — submit also banks the student's mistakes.** Each SAT page's
`onSubmit` calls `recordMistakes(satMistakes(...))` with the served items, the
outcome map and `omitted`, so every wrong or blank question lands in the
student's private practice bucket. Fire-and-forget, after the result write —
see [MISTAKES.md](MISTAKES.md). `omitted` is what lets that bucket distinguish
a skipped question from a misunderstood one.

⚠️ **Unlike the mock exam / Milliy sertifikat papers, a mostly-unanswered
sitting is still saved** (not treated as "abandoned"). SAT here has no ability
model to protect from a distorting zero — a raw, low score is just informative
context for the teacher, the same way a real proctor would record whatever a
student actually did.

### Scoring — `lib/SATscore.ts`, an explicit approximation on a real curve

🟢 **2026-09-16 — the straight line was replaced by a published conversion
curve.** `SAT_RAW_SCORE_TABLE` is the raw-score conversion table shipped with
digital SAT **Practice Test 11** (adapted from
[github.com/yudopr11/sat-simulation](https://github.com/yudopr11/sat-simulation)):
55 rows, raw `0…54` → a scaled **band** `[lower, upper]`. The curve matters
because the real mapping is nowhere near linear — steep at both ends, much
flatter through the middle — so the old line overpaid mid-range students
(50% used to read 500; it now reads 440–480) and underpaid strong ones.

Three functions:

| Function | Returns |
|---|---|
| `estimateScoreBand(route, correct, total)` | `{lower, upper}` — the band |
| `estimateScaledScore(route, correct, total)` | the band's MIDPOINT, rounded to 10 — the single number persisted on `scaledScore` |
| `formatScoreBand(band)` | `"640–700"`, or `"590"` when the band collapsed |

⚠️ **THE LENGTH TRAP.** That table is indexed by the raw score of a
**54-question** section, but our tests are teacher-built and can be ANY length.
The table is therefore **never indexed with a raw count directly** —
`bandForFraction` maps `correct / total` onto the table's own `0…54` domain
first (then blends the two neighbouring rows, so a short paper doesn't jump in
visible steps). Index a 12/12 sitting as raw `12` and you read off `[330, 370]`,
reporting a perfect paper as a failing score. Verified: a given percentage
yields the same band at 54, 44, 22 and 12 questions, and the curve is monotonic.

The **route ceiling is unchanged** and applied ON TOP of the curve: a student
routed to the easier Module 2 has both ends clamped to **590**, so a perfect
easier-route paper reports a single `590` rather than a band — the cap is hard,
and a band would promise a ceiling that route cannot reach.

⚠️ **SCORES FROM BEFORE 2026-09-16 ARE NOT COMPARABLE TO SCORES AFTER IT.**
`scaledScore` is persisted at submit, so a sitting graded under the old line
keeps its old number and a teacher's average mixes the two models. Nothing
re-scores old sittings — both models were always labeled an approximation, and
silently rewriting a student's past score would be worse. If the mixed average
ever matters, write a one-off backfill rather than special-casing the UI.

⚠️ **This is STILL NOT College Board's proprietary IRT-equated score.** The
per-form equating is not public; what is public is this one released form's
conversion table, so this remains a transparent, documented substitute — the same honesty pattern `MILLIY_SUBJECTS.fizika`/`.ona-tili`
already use for their un-encoded, this-repo's-own defaults
(docs/MILLIY_QUIZ.md). Never present `scaledScore` or `scoreBand` as an
official SAT score anywhere in the UI; both the results page and the student's
own screen show it next to the raw correct/total and a one-line disclaimer.

⚠️ **Scoring is per-student, not cohort-relative.** SAT deliberately does NOT
use `lib/RASCHmarks.ts` (`B = Y + σ`) — that formula re-prices a question by
how the whole class answered it, which is exactly how the real Milliy
sertifikat/DTM protocol is marked but is NOT how the real SAT works. A
student's score here never moves because of how classmates did.

### Reporting

The teacher's results page (`app/teacher/sat/math/results/[testId]/page.tsx`
and its English twin): sat/average/best scaled-score tiles, a per-domain bar
list (weakest first, aggregated raw counts across every sitting), a dense
per-question solve-rate grid (plain percentage, colour-banded — NOT a
cohort-priced ball, unlike the Milliy sertifikat results pages), and a
per-student expandable row (Module 1 score, route badge, Module 2 score, total,
**score band**, and a **wrong-vs-blank breakdown** when the sitting has
`omitted`).

The student's own just-submitted screen is
[`SatScoreSummary`](../app/(student)/sat/_components/SatScoreSummary.tsx) —
**one component shared by `/sat/math` and `/sat/english`**, which previously
duplicated the identical block (a second copy is how the two drift). It shows
the band, the disclaimer, raw correct/total + %, the route badge, the
right/wrong/blank tally, and the per-module split.

The student's own past-sittings list (under the code box) expands into
`SatReview` — a green/red grid per module, tap a cell to open the question in a
dialog. ⚠️ **No "your answer" line** — `items` is an outcome map, never an
answer map, the same cost decision `ExamReview`'s replay mode makes elsewhere
in this repo. `showAnswers` (the teacher's own toggle) still gates whether the
correct answer/explanation are shown.

## Firestore

```
sat_math_tests/{sat_…}
  id, title, description, teacherId, teacherName,
  accessCode: "482913",              ← 6 digits, STRING, OWN namespace
  module1: SatQuizItem[],            ← fixed for every student
  module2Easier: SatQuizItem[],      ← served only if routed "easier"
  module2Harder: SatQuizItem[],      ← served only if routed "harder"
  module1Minutes, module2Minutes,    ← default 35 / 35
  routingThreshold,                  ← module1 correct-count needed to route "harder"
  shuffle, showAnswers,
  status: 'draft' | 'published' | 'closed',
  practice?: true,                   ← 2026-10-31, additive: a STUDENT's generated practice test (id satp_/satep_, teacherId = student uid, accessCode '')
  createdAt / updatedAt: serverTimestamp

sat_math_results/{testId}_{uid}
  testId, testTitle, teacherId, studentId, studentName,
  module1Correct, module1Total, route: 'easier' | 'harder',
  module2Correct, module2Total, correct, total,
  scaledScore,                       ← 200-800 APPROXIMATION, never official
                                        (midpoint of scoreBand since 2026-09-16)
  scoreBand?: {lower, upper},        ← 2026-09-16, additive; absent on older sittings
  durationSec, submittedAt: <epoch ms>, examLang,
  items?: Record<questionId, 0|1>,   ← outcomes only, plain question-id keys
  omitted?: questionId[],            ← 2026-09-16, additive; blanks (still scored 0)
  domains?: Record<domainSlug, {correct, total}>

sat_english_tests/{sate_…}          ← SAME shape as sat_math_tests, own collection
  id, title, description, teacherId, teacherName,
  accessCode: "482913",              ← 6 digits, STRING, OWN namespace (never checked against sat_math_tests)
  module1: SatQuizItem[], module2Easier: SatQuizItem[], module2Harder: SatQuizItem[],
  module1Minutes, module2Minutes,    ← default 32 / 32 (real digital SAT R&W timing)
  routingThreshold, shuffle, showAnswers,
  status: 'draft' | 'published' | 'closed',
  practice?: true,                   ← 2026-10-31, additive: a STUDENT's generated practice test (id satp_/satep_, teacherId = student uid, accessCode '')
  createdAt / updatedAt: serverTimestamp

sat_english_results/{testId}_{uid}  ← SAME shape as sat_math_results, own collection
  (identical fields; domains keyed by SatRwDomain instead of SatMathDomain)

sat_pool/{batchId}_{part}           ← 2026-10-31, the SAT PRACTICE BANK (chunks)
  subject: 'sat-matematika' | 'sat-ingliz-tili',
  batchId, title (file name), teacherId, teacherName,
  part, parts, count,
  items: SatQuizItem[],              ← < 700 KB per chunk; items carry `subtopic`
  createdAt: serverTimestamp
```

Rules (`firestore.rules`, sections **12d** and **12e**) mirror each other and
12b/12c exactly: tests `read: if isAuth()`, written only by `teacherId`;
results read by the student or the test's teacher, created by the student,
updated only by the same student on the same test, **delete never**.

⚠️ **SAME KNOWN TRAP as `teacher_rasch_quizzes`/`milliy_quizzes`, on BOTH
subjects: each test embeds its questions, and therefore their correct
answers, behind `read: if isAuth()`.** A signed-in student who enumerates
either collection can read the key without ever entering a code. The 6-digit
code is a sharing convenience, not a security boundary.

Indexes: `sat_math_tests (teacherId ASC, createdAt DESC)` and
`sat_english_tests (teacherId ASC, createdAt DESC)`. Every other query is
equality-only, served from single-field indexes — including the platform
question-bank query (`teacher_questions` filtered to `creatorId == ''`), which
rides the SAME existing `creatorId + subject.id + createdAt desc` composite
index every teacher's own bank query already uses (composite indexes aren't
keyed by VALUE, so no new index was needed for the platform `creatorId`).

## Invariants & traps

- ⚠️ **`sat_pool` item ids are STABLE (`<batchId>-0001`) on purpose** — "unseen
  first" matches them against the keys of past results' `items`. Re-uploading
  the same file makes NEW ids (a new batch); `loadSatPool` content-dedupes
  across batches so the duplicate doesn't double a question's weight.
- ⚠️ **The whole subject bank is read per student session** (chunks, cached 5 min
  module-level; `MAX_CHUNKS` 60 ≈ 18k questions). Past that, add a summary or
  sample per-domain chunks — don't raise the cap blindly.
- ⚠️ **Any teacher can add to and delete their own uploads in the shared bank;
  students cannot write it** (rules check `users.role == 'teacher'` on create).
  A student CAN create `sat_*_tests` docs as themselves — that is how generated
  practice tests are stored; they never get an access code.

- ⚠️ **Never write `undefined` to Firestore** — `satQuizItem` spreads optional
  fields (`optionImages`, `acceptedAnswers`, `explanation`, `creatorId`…)
  conditionally, matching the style every other converter in this repo uses.
- ⚠️ **`SatQuizItem` is not `ExamQuestion`.** Do not thread SAT data through
  `lib/ExamTeacher.ts` — its blueprint/`testType`/block machinery encodes the
  Milliy sertifikat DTM protocol, which has no meaning here.
- ⚠️ **The calculator and reference panel are deliberate placeholders**, not
  bugs to "fix" by embedding a real Desmos widget without first obtaining a
  Desmos API key for this domain, and not by scraping/reproducing College
  Board's printed reference sheet graphic.
- ⚠️ **`SatRunner` is now genuinely shared by Math and English — don't fork it
  for a THIRD subject without first checking whether dependency injection
  (`subjectName`/`onSave`, the pattern English used) still covers the
  difference.** Only reach for "a shared header/lockdown wrapper, a different
  body" (the lesson RASCH_QUIZ.md draws for `ExamRunner`) once a subject
  genuinely needs different BODY markup (e.g. a real shared passage pane) —
  English didn't, because its items are self-contained.
- ⚠️ **`SAT_SECTIONS` is the single source of truth for which sections exist**
  on both hubs (`app/teacher/sat/page.tsx`, `app/(student)/sat/page.tsx`). A
  section flipped live in one place and not the other is the bug this registry
  prevents — see `MILLIY_SUBJECTS` for the pattern being mirrored.
- ⚠️ **`SAT_PLATFORM_CREATOR_ID` (`''`) is a real, load-bearing sentinel, not a
  placeholder to "fix" into a real uid.** It is what lets EVERY teacher's SAT
  English builder see the same 1,406-question bank via an ordinary
  `creatorId ==` query. Do not backfill it with a real account, and do not
  reuse the empty string for anything else that expects a genuine owner.
- ⚠️ **The English question bank was imported ONCE, not idempotently** — see
  "The platform question bank" above. Re-running
  `scripts/importSATEnglishQuestions.ts --apply` duplicates the whole bank; it
  is not a safe "sync" operation.

## Known issues / dead code (verified 2026-09-15)

- **The answer key is readable by any signed-in user** (above). The same
  largest limitation every teacher-built paper subsystem in this repo has —
  now true of BOTH `sat_math_tests` and `sat_english_tests`.
- **Code uniqueness is a check, not a constraint** (above) — on both subjects'
  namespaces.
- **English has no bundled sample/starter test** (unlike Math's "Namunaviy
  variant") — not needed, since the platform bank already gives every teacher
  1,406 ready questions to pick from with zero authoring.
- **English's taxonomy has only ONE subtopic per domain** (above) — the source
  bank carries no finer content-category tag. A future finer taxonomy (if the
  real College Board R&W skill/content-category list is ever added by hand)
  would need to re-file the 1,406 imported questions, which currently all sit
  on that one generic subtopic per domain.
- **109 of the 766 rows with a trailing meta-question in `paragraph` were left
  un-stripped** (above) — the stripping regex didn't confidently match their
  shape, so those 109 imported questions show the question twice (once as
  part of the passage, once as the actual prompt). A cosmetic redundancy, not
  a correctness bug — the `correct_answer`/choices are unaffected.
- **The scaled score is an approximation** (above) — there is no path to the
  real College Board equating without their proprietary data.
- **The calculator is not Desmos** (above) — a self-built substitute pending an
  API key.
- ~~No sample/starter test~~ — **fixed 2026-09-14**: the "Namunaviy variant"
  button (above) fills all three modules from `data/sat-math-default-paper.json`
  (Math only — see above for why English doesn't need one).
- **The teacher cannot see what a student ANSWERED**, only whether each
  question was right. Same deliberate cost decision every result collection in
  this repo makes.

## How to verify changes

`npm run dev`, as a **teacher**:

1. `node scripts/addSATMathTopics.mjs` and `node scripts/addSATEnglishTopics.mjs`
   (both idempotent; already run when these features shipped) →
   `/teacher/create/question`: **Fan** offers **SAT Matematika** (4 domains:
   Algebra, Advanced Math, Problem-Solving and Data Analysis, Geometry and
   Trigonometry) and **SAT Ingliz tili (Reading & Writing)** (4 domains:
   Information and Ideas, Craft and Structure, Expression of Ideas, Standard
   English Conventions). Write 2–3 `mcq` and one `numeric` Math question, and
   one `mcq` English question.
2. `/teacher/sat` → both **Math** and **Reading & Writing** cards are live
   (neither says "tez kunda"/"soon" anymore) → **Math** → new test. Build
   Module 1, Module 2 — Easier, Module 2 — Harder from the picker; also use
   "Create a new question" from inside a module tab and confirm the round trip
   returns to the SAME tab with the question already added, at zero extra
   reads. Publish → 6-digit code shown, copies on tap.
3. On a fresh test, press **Namunaviy variant** — all three modules fill with
   22 questions each (66 total), the title/minutes/threshold fill in if empty,
   both domains show up in the domain breakdown, and 17 questions render their
   graph image. Press it again with items already on a module and confirm the
   overwrite prompt.
4. Set a low routing threshold on a throwaway test to make "easier" easy to
   trigger for testing.

As a **student**, in another account:

5. `/sat` → **Math** → enter the code → intro card (title, teacher, module
   lengths) → Start (full screen engages; no language picker — everything is
   English). Answer Module 1
   deliberately below the threshold → submit the module (review grid → confirm)
   → the transition screen shows NO score → Module 2 turns out to be the
   **Easier** pool. Submit → results show route "Easier" and a scaled score
   ≤ ~590. Repeat with a second account answering Module 1 well → routed to
   **Harder** → scaled score can reach the high 700s/800.
6. Exercise the Bluebook UI on a question: hide/show the timer, cross out an
   option (struck through, still selectable, toggle again to un-cross), flag a
   question and see it flagged in the navigator grid, open/close the
   calculator (basic arithmetic works) and the reference panel, adjust text
   size with A-/A+ (question + option text visibly resizes, persists across a
   reload), drag the
   divider between the question and workspace columns (question column
   resizes, clamps at the min/max, workspace fills the rest), confirm a
   question with a graph shows it in the workspace column on desktop and
   inline under the question on mobile, reload
   mid-module and confirm it resumes with no extra reads, drop out of full
   screen and confirm the interruption overlay fires with a live count
   (`useExamLockdown`, unchanged behavior from the other exams).
7. Review the just-submitted result inline (per-module green/red grid, tap a
   cell) and again from "Tests I've taken" on the code screen.

Back as the **teacher**:

8. Open **Natijalar** for the test: sat/average/best tiles, per-domain bars
   weakest-first, the per-question solve-rate grid, and the student row
   expanding into Module 1/Module 2/route/total.
9. Close the test; the student's code entry must now say the test is closed,
   not "not found".

Now **SAT English** end to end — `/teacher/sat` → **Reading & Writing** →
new test:

10. On the **Platform bank** tab (default), press Load — questions appear
    from the 1,406-question bank with no prior authoring. Build all three
    modules from it; switch to the **Mine** tab and confirm it shows only the
    question you wrote in step 1 (not the platform bank). Publish → 6-digit
    code shown.
11. As a student: `/sat` → **Reading & Writing** → enter the code → sit it —
    same Bluebook UI as Math (timer, navigator, cross-out, flag, text size,
    two-pane split), same routing/transition/no-score behavior, but no
    calculator use expected (still present, just not needed for R&W) and no
    grid-in/numeric questions ever appear. Submit → results page, review grid.
12. Back as the teacher: **Natijalar** for the English test — same shape as
    Math's, `SAT_RW_DOMAINS` breakdown instead of `SAT_MATH_DOMAINS`.
13. Spot-check a handful of platform-bank questions in the runner for the
    known data quirk: most read as one clean paragraph + question; a small
    minority (the 109 un-stripped rows, above) show a redundant question
    sentence at the end of the passage before the actual prompt — cosmetic,
    not a correctness issue.

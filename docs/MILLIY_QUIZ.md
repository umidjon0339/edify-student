# MILLIY_QUIZ — Milliy sertifikat SUBJECT papers (biology, chemistry, physics, ona tili; English next)

> **Agent workflow:** read this BEFORE touching `app/teacher/milliy-sertifikat/*`,
> `app/(student)/milliy-sertifikat/`, `lib/MilliyQuiz.ts`,
> `types/MilliyQuiz.ts`, `services/milliyQuizService.ts`, or the
> `milliy_quizzes` / `milliy_quiz_results` collections. Also read
> [QUESTIONS.md](QUESTIONS.md) (the questions these papers embed) and
> [RASCH_QUIZ.md](RASCH_QUIZ.md) (the **maths** paper, which is a different
> subsystem — see below). Update this doc in the same change whenever you alter
> behavior described here. Index: [README.md](README.md).

**Last verified:** 2026-08-03 (**fizika and ona-tili went live**, each a registry flip + a taxonomy + a sample paper — no new component, route, service, rule or index); 2026-08-01: the shared marking formula is now **base + difficulty bonus**, `B = Y + σ`; 2026-07-31: the question-builder round trip is closed — `?back=`/`?add=`/`?subject=`; 2026-07-30: subsystem introduced; biology **and chemistry** live, each with a sample paper; the SAME dynamic marking as maths; full-screen exam lockdown.

## Purpose & scope

The Milliy sertifikat is sat per **subject**. Maths already had a complete
subsystem — [RASCH_QUIZ.md](RASCH_QUIZ.md) — because the DTM maths blueprint is
encoded in this repo (`EXAM_BLUEPRINT`) and a maths sitting moves a student's
measured ability. Nothing equivalent exists for the other subjects, so this
subsystem gives them a paper: **pick questions from your own bank, publish behind
a private 6-digit code, see who sat it.**

### ⚠️ Two paper systems, and the split is deliberate

| | **maths** | **every other subject** |
|---|---|---|
| Collection | `teacher_rasch_quizzes` | `milliy_quizzes` |
| Results | `teacher_rasch_results` | `milliy_quiz_results` |
| Length | exactly 45, from the DTM blueprint | the teacher's own declared number |
| Section quota | 13 blueprint rows, HARD | none |
| Question pools | own bank **+** `questions1` | own bank only |
| Marking | **dynamic, cohort-priced (`lib/RASCHmarks.ts`)** | **the same, verbatim** |
| Ability model | Rasch θ + 0–5 levels | none — see below |
| Moves `RASCH_levels/{uid}`? | **yes** | **never** |
| Teacher route | `/teacher/milliy-sertifikat/math` | `/teacher/milliy-sertifikat/[subject]` |
| Student section | `/raschmodel` (the whole suite) | `/milliy-sertifikat/[subject]` |

**Why not one system.** Merging them would mean either giving biology a blueprint
that does not exist, or stripping maths of the ability model that is the entire
point of it. What IS shared is everything that must never drift: `ExamRunner`,
`ExamReview`, `toExamItem`, `examSlotKeys`/`examSlotCount`/`examScore`,
`isClosedQuestion`, the access-code helpers, and `createSessionStore`.

### ⚠️ Marking is SHARED; the ability model is NOT — and the distinction is the point

Both are "the Rasch stuff" colloquially, and conflating them is the mistake this
section exists to prevent:

- **The dynamic marks ARE shared, verbatim** ([lib/RASCHmarks.ts](../lib/RASCHmarks.ts)).
  Since 2026-08-01 a question's ball is `B = Y + σ`: a **guaranteed base** by test
  type (`BASE_BALL` — closed `Y-1` 1.1, typed `O` 1.6 on a subject paper) plus a
  share of the paper's **difficulty budget**, `σ = (100 − ΣY)·w/Σw` with
  `w = (1−p̂)²` and p̂ the shrunk share of the cohort that solved it. Pure cohort
  arithmetic — no blueprint, no calibration, no taxonomy. Nothing in it is
  maths-specific, so **the fewer of the class that solve a question the more it
  adds, on every subject**, while every question still keeps its base. The paper
  sums to exactly 100 by construction, and the student's score is
  `Σ(balls earned) / Σ(balls) × 100`, which is what makes ten hard answers beat
  ten easy ones.
  - ⚠️ A subject paper's mix of types is whatever the teacher built, so its base
    total (and therefore its budget) is NOT the maths paper's 55.1/44.9 — it is
    summed per paper. A paper long enough that the bases alone would reach
    `BASE_SHARE` of 100 has them scaled down by one factor (`baseBalls`); at
    30–45 questions that never triggers.
  - ⚠️ The ONE maths-specific part is the **printed** value: the DTM protocol
    prints a per-position ball and a subject paper has no published protocol. So
    `paperMarks` takes `printed` as an argument and the subject pages pass
    `evenPrinted(slots)` — an even split of 100. It is a "before" for display
    beside a moved mark, **not** a value the marking ever falls back to.
- **θ and the 0–5 levels are NOT shared.** `RASCH_TOPICS` are the seven maths
  dimensions, `questions1` holds algebra and geometry only, and `DIFFICULTY_LOGIT`
  and the calibrated `b` values are anchored on the maths bank. A θ from biology
  answers would be a precise-looking number with nothing behind it, and worse than
  a percentage because it would look authoritative. ⚠️ **Nothing in this subsystem
  may show a 0–5 level**, and `milliy_quiz_results` deliberately has no `theta`.

⚠️ The student still sees **percent**, not the ball score, on their own result.
A ball is a property of the whole COHORT — `paperMarks` needs every sitting — and a
student may not read their classmates' rows (correctly, and the rules enforce it).
A ball computed from one sitting would be a different number wearing the teacher's
label. Same rule the maths paper follows.

## Key files

| File | Responsibility |
|---|---|
| [types/MilliyQuiz.ts](../types/MilliyQuiz.ts) | Document shapes: `MilliyQuiz`, `MilliyQuizItem`, `MilliyQuizResult`, `MilliySubjectId`. |
| [lib/MilliyQuiz.ts](../lib/MilliyQuiz.ts) | Pure layer — **`MILLIY_SUBJECTS` (the subject registry)**, picked-question → stored item, `hydrateMilliyQuiz`, slot/topic/difficulty/kind counts, `checkMilliyAdd`, size guard. No Firestore. |
| [services/milliyQuizService.ts](../services/milliyQuizService.ts) | Every read and write, **plus `findPaperByCode`** — the cross-collection code lookup. Nothing else touches the two collections. |
| `app/teacher/milliy-sertifikat/page.tsx` | The subject hub (teacher). Maths card → `math/`. Cards are minimal since 2026-10-31 — icon · name · Ready/Soon only; the paper facts (DTM protocol / own bank, length, 6-digit code, scored immediately) are info pills on `math/page.tsx` and `[subject]/page.tsx`. |
| `app/teacher/milliy-sertifikat/math/*` | **The maths paper builder — moved here from `create/rasch` on 2026-07-30.** Still `teacher_rasch_quizzes` and still documented by [RASCH_QUIZ.md](RASCH_QUIZ.md). ⚠️ The static `math` segment beats the sibling `[subject]` route, which is why `genericSubject` also refuses `'math'`. |
| [lib/MilliyDefaultPaper.ts](../lib/MilliyDefaultPaper.ts) | The **sample paper** — validates `data/<subject>-default-paper.json` and turns it into `MilliyQuizItem`s. Pure; no Firestore. `SAMPLE_FILES` is the registry of which subjects ship one. |
| [data/biology-default-paper.json](../data/biology-default-paper.json) | **The biology sample paper's content — the only file to edit to change it.** 31 questions. |
| [data/chemistry-default-paper.json](../data/chemistry-default-paper.json) | **The chemistry sample paper's content.** 40 questions — the DTM part-1 distribution, see below. |
| [data/physics-default-paper.json](../data/physics-default-paper.json) | **The physics sample paper's content.** 35 questions (30 closed / 5 typed-numeric), 100 min — this file's own length, not a protocol. |
| [data/ona-tili-default-paper.json](../data/ona-tili-default-paper.json) | **The ona tili sample paper's content.** 30 questions (26 closed / 4 typed-TEXT), 90 min. ⚠️ Its typed answers are apostrophe-free by rule — see below. |
| [lib/RASCHmarks.ts](../lib/RASCHmarks.ts) | **The dynamic marks, shared with maths.** A guaranteed base per test type + a share of the difficulty budget from the cohort solve rate (`B = Y + σ`), summing to 100; `evenPrinted` is the no-protocol "before" value. Pure. |
| `app/teacher/milliy-sertifikat/[subject]/page.tsx` | One subject's papers: code, status, edit, results, delete. |
| `app/teacher/milliy-sertifikat/[subject]/build/page.tsx` | The builder (`?id=` to edit). |
| `app/teacher/milliy-sertifikat/[subject]/results/[quizId]/page.tsx` | Who sat it; dynamic ball score, per-topic counts, and the per-question marks grid — **the same surface as the maths results page** (grouped by topic, dense, solve-rate coloured). |
| `app/teacher/milliy-sertifikat/_components/SubjectBankPicker.tsx` | The one pool: the teacher's own `teacher_questions`, narrowed to the subject **server-side**. |
| `app/teacher/milliy-sertifikat/_components/draft.ts` | The localStorage stash that survives leaving to write a question. |
| [app/teacher/create/_components/returnTo.ts](../app/teacher/create/_components/returnTo.ts) | The `?back=` / `?add=` / `?subject=` contract — how a builder sends a teacher to write a question **and gets them back with it**. Shared with the maths builder. |
| `app/(student)/milliy-sertifikat/page.tsx` | **The student's subject hub — and their only nav entry to the programme.** Cards only, zero reads. Maths → `/raschmodel`. |
| `app/(student)/dashboard/_components/MilliyCard.tsx` | **The dashboard's door to the programme** (2026-07-30) — the hub plus a chip per subject. Zero reads. ⚠️ It exists because the nav entry is `hideOnMobile`, so on a phone the drawer was the only way in. See [STUDENT.md](STUDENT.md). |
| [lib/announcements.ts](../lib/announcements.ts) | Where each subject is **announced** on the dashboard (maths / biology / chemistry entries). ⚠️ A new subject going live wants an entry here too — and ⚠️ **no question count for a generic subject**, whose length is the teacher's. See [STUDENT.md](STUDENT.md). |
| `app/(student)/milliy-sertifikat/[subject]/page.tsx` | One subject for the student: code box, sitting, result, its sat papers. |
| [scripts/addBiologyTopics.mjs](../scripts/addBiologyTopics.mjs) | How the biology taxonomy was appended to `data/question_topics.json`. |
| [scripts/addChemistryTopics.mjs](../scripts/addChemistryTopics.mjs) | The same for chemistry — **the pattern every later subject copies.** Idempotent; re-running replaces its own subject entry. |
| [scripts/addPhysicsTopics.mjs](../scripts/addPhysicsTopics.mjs) | The same for physics — `fizika`, **5 topics, 98 subtopics**. |
| [scripts/addNativeLanguageTopics.mjs](../scripts/addNativeLanguageTopics.mjs) | The same for ona tili — `ona-tili`, **7 topics, 84 subtopics**. ⚠️ Language only, no literature — see below. |

## Flows

### 🟢 One nav entry, subjects inside (2026-07-30)

Both sides used to show the maths paper twice — the teacher had a *Rasch varianti*
card in the create hub AND a Matematika card here, and the student had a **Rasch**
nav item sitting beside **Milliy sertifikat** as if they were separate products.
They are not: the Rasch suite IS the Milliy sertifikat maths section. So:

| | Before | Now |
|---|---|---|
| Teacher routes | `app/teacher/create/rasch/*` | `app/teacher/milliy-sertifikat/math/*` |
| Teacher create hub | had a *Rasch varianti* card | ⚠️ card **removed** — this is a programme, not a test-creation method |
| Student nav | `Rasch` + `Milliy sertifikat` | **`Milliy sertifikat` only** |
| Student maths | `/raschmodel` (own nav item) | `/raschmodel`, reached from the hub's Matematika card |

- ⚠️ **`studentSubjectHref(subject)` owns the student mapping**, `MilliySubject.href`
  owns the teacher's. They are different routes for the same subject and keeping
  them as two functions is what stops one being used for the other.
- ⚠️ **`/raschmodel` was NOT moved or renamed.** It is a whole suite (level chart,
  practice, diagnosis, topic pages, its own code page) with many internal links;
  the change is navigational. Don't "finish the move" without reading
  [RASCH_QUIZ.md](RASCH_QUIZ.md) and [STUDENT.md](STUDENT.md) first.
- The student hub costs **zero reads** — the subject list is `MILLIY_SUBJECTS`.

### The subject registry is the single source of truth

`MILLIY_SUBJECTS` ([lib/MilliyQuiz.ts](../lib/MilliyQuiz.ts)) lists every subject
with a `kind`:

- **`rasch`** — maths. `href` points at `/teacher/milliy-sertifikat/math`; this subsystem
  never stores a maths paper.
- **`generic`** — served here (biology, chemistry, **fizika** and **ona-tili**
  today). Needs a `taxonomySlug` pointing at a subject in
  `data/question_topics.json`.
- **`soon`** — announced, `href: null`. The teacher hub renders the card inert
  (muted, no pointer, out of the tab order) and the student hub tags it *soon*.

The teacher hub, the student hub, the `[subject]` pages and the builder all read
that list. ⚠️ **`genericSubject(segment)` refuses `math` as well as an unknown
segment** — `/teacher/milliy-sertifikat/math` must never open a second, empty
maths builder pointed at the wrong collection.

**To add English** (chemistry, physics and ona tili are done — three worked
examples): append its taxonomy to `data/question_topics.json` (copy
`scripts/addChemistryTopics.mjs` — the ids are persisted into `teacher_questions`
docs, so a typo is a topic path that can never be matched again), then flip its
registry entry from `soon` to `generic` with the right `taxonomySlug` and `href`,
and optionally add `data/<subject>-default-paper.json` + one line in
`SAMPLE_FILES`. **That is the whole change** — chemistry, physics and ona tili
each needed no new component, route, service, rule or index. (Then tell students:
one entry in [lib/announcements.ts](../lib/announcements.ts), which is the
dashboard's hero — [STUDENT.md](STUDENT.md); and give the subject an icon in the
two hubs' `LOOK` maps, which is presentation only and falls back to a generic
badge.) ⚠️ **Do not point a new subject at the Rasch flow**: its quota rules,
difficulty bands and ability model are maths-specific.

⚠️ **A registry `id` may contain a hyphen** (`ona-tili`) — it is the route segment
AND the stored `subject` field AND, by convention here, the `taxonomySlug`. Keep
the three identical: they are matched by string in `genericSubject(segment)`,
`SAMPLE_FILES` and every `where('subject','==',…)` query.

### Biology's taxonomy (2026-07-30)

`data/question_topics.json` gained a third subject, `biologiya` — **8 topics, 126
subtopics**, the Milliy sertifikat biology programme's own numbered sections.

- ⚠️ **The taxonomy is only 3 levels** (subject → topic → subtopic) and sections 2
  and 4 of the programme have an intermediate grouping. Those groups are folded
  into the SUBTOPIC NAME as a `"Group — Leaf"` prefix (`Sitologiya — Mitoz`,
  `Zoologiya — Baliqlar`), which keeps the official 8-section numbering at the
  topic level and still lets the groups read and sort together in the builder's
  dropdown. Do not "flatten" that away — the numbering is the programme's.
- ⚠️ **Appending a subject is safe for maths, but the ORDER of `algebra` and
  `geometriya` topics is not.** `ExamTeacher.slugForChapter` bridges a
  `questions1` chapter to a topic slug **by its 1-based position** in
  `subject.topics[]`. Adding a third subject does not disturb that (the lookup is
  by subject id), but reordering or inserting an algebra/geometry topic silently
  re-files every bank question. Biology has no `questions1` mirror, so `bankIds`
  falls back to the document's own ids — which is exactly what these papers want.

**Bulk add (2026-10-29):** each subject page has a **JSON import** button →
`/teacher/create/import?subject=<taxonomySlug>` — rows land in the teacher's own
bank as `.uz` v1 docs (`mcq`/`open`/`numeric`), i.e. straight into this
builder's pool. Contract: [SAT_QUIZ.md](SAT_QUIZ.md) §Teacher dataset import.

**Creating a biology question needed no new code**: `/teacher/create/question`
and `/teacher/create/block` read `SUBJECTS`, so both open/typed and closed
questions (and blocks) became authorable for biology the moment the taxonomy
landed. See [QUESTIONS.md](QUESTIONS.md).

### Chemistry's taxonomy (2026-07-30)

`data/question_topics.json` gained a fourth subject, `kimyo` — **4 topics, 117
subtopics**, written by
[scripts/addChemistryTopics.mjs](../scripts/addChemistryTopics.mjs).

- ⚠️ **Only 4 topics, against biology's 8 — that is the programme, not an
  oversight.** The chemistry programme has exactly four numbered sections
  (I. Umumiy kimyo · II. Anorganik kimyo · III. Organik kimyo · IV. Kimyoviy
  tahlil) and the DTM question distribution is published **per section**
  (Y1: 13 · 6 · 10 · 3). Keeping the sections as the TOPIC level is what lets a
  teacher check a paper against those counts, and what the results page groups
  by. **Do not promote the intermediate groups to topics**: the results page would
  then name a class's weakest area with a label that appears in no official
  document.
- The groups (*Asosiy tushunchalar va qonunlar*, *Atom tuzilishi*, *Kimyoviy
  bog'lanish*, *Eritmalar*, *Metallar*, *Kislorodli birikmalar*, *Sifat
  reaksiyalari*, …) are folded into the SUBTOPIC NAME as the same `"Group — Leaf"`
  prefix biology uses — `Atom tuzilishi — Izotoplar`,
  `Metallmaslar — VIIA guruh (galogenlar)`.
- ⚠️ **A leaf must not contain a dash of its own**, or the `"Group — Leaf"` fold
  reads as two separators. Sub-classifications use parentheses instead
  (`IA guruh (ishqoriy metallar)`), whose parens slugify to a single hyphen.
- ⚠️ **The chemistry sections are numbered with ROMAN numerals**, unlike biology's
  arabic ones, so `topicSlug` strips both — otherwise every id would begin `i-`,
  `ii-`… and would sort by numeral. The ids came out clean: `umumiy-kimyo`,
  `anorganik-kimyo`, `organik-kimyo`, `kimyoviy-tahlil`.

### Physics' taxonomy (2026-08-03)

`data/question_topics.json` gained a fifth subject, `fizika` — **5 topics, 98
subtopics**, written by
[scripts/addPhysicsTopics.mjs](../scripts/addPhysicsTopics.mjs).

- The topics are the five classical branches: `mexanika`,
  `molekulyar-fizika-va-termodinamika`, `elektr-va-magnetizm`,
  `optika-va-nisbiylik-nazariyasi`, `kvant-va-yadro-fizikasi`. Roman numerals in
  the NAMES (`I. Mexanika`), stripped from the ids exactly as chemistry does.
- The intermediate groups (*Kinematika*, *Dinamika*, *Saqlanish qonunlari*,
  *Statika va gidrostatika*, *Elektrostatika*, *Geometrik optika*, *Yadro
  fizikasi*, …) are folded into the SUBTOPIC NAME as the same `"Group — Leaf"`
  prefix biology and chemistry use — `dinamika-elastiklik-kuchi-guk-qonuni`,
  `tolqin-optikasi-dispersiya-va-spektr`.
- ⚠️ **Do not promote those groups to topics.** Twenty topics would make the
  results page name a class's weakest area as *Statika va gidrostatika* rather
  than *Mexanika* — finer than a 35-question paper can measure, since with one or
  two questions per group the per-topic counts stop meaning anything.
- ⚠️ Same leaf rule as chemistry: **no dash inside a leaf**, or the fold reads as
  two separators. That is why the Joule–Lenz law is written *Tok ishi va quvvati
  (Joul va Lens qonuni)*.
- ⚠️ **35 / 100 is this repo's default, not a national spec.** There is no
  physics `EXAM_BLUEPRINT` and no published protocol encoded anywhere here, so
  `MILLIY_SUBJECTS.fizika` simply matches its sample paper, and the teacher
  changes the target if they want another length. Do not present it as a DTM
  count on any surface.

### Ona tili's taxonomy (2026-08-03)

`data/question_topics.json` gained a sixth subject, `ona-tili` — **7 topics, 84
subtopics**, written by
[scripts/addNativeLanguageTopics.mjs](../scripts/addNativeLanguageTopics.mjs):
`fonetika-va-grafika`, `leksikologiya`, `soz-tarkibi-va-soz-yasalishi`,
`morfologiya`, `sintaksis`, `imlo-va-tinish-belgilari`,
`uslubiyat-va-nutq-madaniyati`.

- ⚠️ **This is ONA TILI, not "ona tili va adabiyot" — there is deliberately no
  literature topic.** Literature is examined on its own texts and authors; a
  question about a novel filed under *Sintaksis* (or under an invented *Adabiyot*
  topic here) would put a whole second subject inside this one's per-topic
  report. If literature is ever added it gets its own taxonomy and its own
  registry entry, exactly as biology and chemistry are two subjects.
- ⚠️ **It is the first subject whose id carries a hyphen** (`ona-tili`), and the
  route segment, the stored `subject` value and the taxonomy slug are all that
  same string.
- ⚠️ **A TYPED answer here must not contain an apostrophe.** Text grading
  (`textMatch` in [lib/ExamTeacher.ts](../lib/ExamTeacher.ts)) collapses
  whitespace and case but **not** apostrophes, and Uzbek is written with at least
  three of them in the wild (`'`, `‘`, `ʻ`). `ko'makchi` as an answer would mark a
  correct student wrong on their keyboard's choice of glyph. Every typed entry in
  the sample paper is apostrophe-free by construction (`yuklama`, `atama`,
  `atov gap`); a new one either follows that rule or lists every spelling in
  `acceptedAnswers`.

### ⚠️ Chemistry is 40 questions / 100 minutes, NOT the programme's 43 / 180

The DTM chemistry paper is **two parts**, and only the first can be
machine-marked:

| | Part 1 (#1–40) | Part 2 (#41–43) |
|---|---|---|
| Contents | Y1 closed ×32, Y2 matching ×3, O1 short typed ×5 | extended WRITTEN work ×3 |
| Time | 100 min | 80 min |
| Marking | Rasch / the cohort curve | **a human**, per-step M (method) + A (arithmetic), 25 balls each |

Part 2 is marked against per-step criteria and **scores 0 if the candidate writes
only a final answer** — a judgement no auto-grader in this repo can make. So
`MILLIY_SUBJECTS.kimyo` defaults to **40 / 100**: the whole of what this subsystem
can actually score, rather than a 43-question paper it would silently mis-mark.
A teacher who wants #41–43 sets them outside the platform. ⚠️ **Do not "complete"
the paper to 43** without first building human marking — an extended-response item
added today would be graded by exact string match.

⚠️ **Y2 matching is authored as a closed A–D question** whose options are whole
pairings (`"1-b, 2-c, 3-a"`), which is how a matching item is printed on the paper
anyway. There is no matching `qType` in this repo; a real drag-to-match widget
would need one in the runner, the review screen **and** the grader.

⚠️ The 13 · 6 · 10 · 3 distribution above is **not enforced anywhere.** There is
no chemistry `EXAM_BLUEPRINT` and the builder has no per-section quotas (by
design — see `checkMilliyAdd`), so it is the sample paper file's own discipline,
recorded in its `_readme`. Recount it by hand if you add or remove an entry.

### The sample paper — "Namunaviy variant" (2026-07-30)

The builder's second route to a paper, beside the picker: one button at the top of
the **Savol qo'shish** card that drops a complete variant onto the builder. It
exists for the same reason the maths one does — "write 30 questions before you can
publish anything" is a wall in front of the first paper anyone tries to make.

- **The content is DATA**: `data/<subject>-default-paper.json` —
  [biology](../data/biology-default-paper.json),
  [chemistry](../data/chemistry-default-paper.json),
  [physics](../data/physics-default-paper.json) and
  [ona tili](../data/ona-tili-default-paper.json) today. That file is the only
  place to edit questions; its `_readme` key carries the per-entry field docs. A
  developer changes it in a reviewable diff.
- **[lib/MilliyDefaultPaper.ts](../lib/MilliyDefaultPaper.ts) owns every rule.**
  Each entry names only a **topic slug** of its own subject; the topic and subtopic
  NAMES are derived from `data/question_topics.json`, and `testType` from whether
  the entry has options. ⚠️ The JSON therefore **cannot invent a topic** or
  mislabel a typed item as closed — the two mistakes that would corrupt the
  results page's grouping and the runner's rendering.
- ⚠️ **Closed vs typed is decided by the PRESENCE of `options`**, not by a flag.
  One fewer field to get wrong, and it cannot contradict itself.
- ⚠️ **A file that does not validate is REFUSED, not loaded**, with the first
  problem named in a toast. Checked: unknown topic slug, a subtopic that is not in
  its topic, a closed item with fewer than two options, an `answer` that is not one
  of its own option keys, an empty `answer`.
- ⚠️ **It REPLACES the paper** (with a confirm when one is non-empty) and sets the
  length target to what the file holds. Appending would overshoot whatever target
  was set. Afterwards the items are ordinary paper items — remove, reorder and mix
  in your own freely.
- ⚠️ **A–D only.** `OptionKey` is `'A'|'B'|'C'|'D'`; A–F pools exist only on a
  `shared_options` block, whose `optionKeys` is a plain `string[]`.
- ⚠️ **The items are snapshots, not bank documents.** They are in nobody's question
  bank, the picker never lists them, and editing the JSON does not touch a paper a
  teacher already saved — the same freeze every stored item has. Their ids are
  `milliy-sample-<subject>-NN`, deliberately not Firestore-shaped so they can never
  collide with a real question in `milliyPickedIds` / `checkMilliyAdd`.
- The JSON is loaded with a **dynamic `import()`** keyed by a literal in
  `SAMPLE_FILES`, so each subject's paper is its own chunk fetched on the first
  click. ⚠️ A computed `import(`@/data/${slug}…`)` would pull EVERY json in the
  folder into one chunk.
- `hasSamplePaper(slug)` drives whether the button renders at all, so a subject
  with no file shows nothing rather than an error.

**Biology's paper is 31 questions** — 23 closed, 8 typed — across all eight
programme sections.

**Chemistry's paper is 40 questions** — 35 closed, 5 typed — matching the DTM
part-1 distribution exactly (Y1 32 = 13·6·10·3, Y2 3, O1 5 = 2·1·2; see the
section above). ⚠️ Its typed entries set **`numeric: true` on every calculation
answer**, the opposite default from biology: most chemistry short answers are
numbers, and numeric grading normalizes `5,6` / `5.60` / spacing so a right answer
is not marked wrong for formatting. ⚠️ Formulas are authored as **plain text with
digits** (`H2SO4`, `Fe(OH)3`, `C2H5OH`), not LaTeX subscripts — these strings run
through the same `LatexRenderer` as every other question, so a stray `$` or `_`
would be read as math.

**Physics' paper is 35 questions** — 30 closed, 5 typed — 12 · 6 · 8 · 5 · 4
across the five branches, in 100 minutes. ⚠️ Like chemistry, **every typed entry
sets `numeric: true`**: all five are calculations, and numeric grading normalizes
`0,2` / `0.2` / spacing so a right answer is not marked wrong for formatting.
⚠️ Formulas are authored as **plain text** (`E = mc²`, `6,6·10⁻³⁴`, `pV = (m/M)RT`)
— never LaTeX, since these strings run through the same `LatexRenderer` and a
stray `$`, `_` or `^` would be read as math.

**Ona tili's paper is 30 questions** — 26 closed, 4 typed — across all seven
sections, in 90 minutes. ⚠️ Its typed entries are **text, not numeric** (the
opposite default from the two sciences: the answers are words), and every one of
them is **apostrophe-free** for the grading reason in the taxonomy section above.

⚠️ **All four papers are authored Uzbek-only**: a bare string fills ru and en with
the same text, so a student who picked Russian sees Uzbek rather than a blank. Add
`{uz, ru, en}` objects per entry as translations are made. ⚠️ For **ona tili**
most entries cannot be translated at all — they ask about Uzbek words, so a
ru/en variant would have to be a different question, not a translation.

### Building — one document, no refs

One pool: the teacher's own `teacher_questions`, filtered to the subject.

- **The subject filter is SERVER-side** (`fetchMyQuestionsPage(…, subjectSlug)` →
  `where('subject.id','==',slug)`), on its own index `creatorId + subject.id +
  createdAt desc`. ⚠️ It had to be: a teacher whose bank is mostly maths would
  otherwise page through it 10 documents at a time hunting for a biology
  question, paying for every one.
- **The closed/typed filter is CLIENT-side**, exactly as in the maths picker: in
  Firestore it would need a third composite index and still could not express the
  per-part block rule. A filtered press walks up to **3 pages (30 documents)** and
  the picker prints what it read.
- ⚠️ **There is no `questions1` tab.** That bank holds algebra and geometry only,
  so for biology it is empty by construction — a tab would be a dead end that
  spends reads proving it.
- ⚠️ **`SubjectBankPicker` is deliberately NOT `MyBankPicker`.** That component's
  whole contract is the blueprint quota (`roomForItem` → a required `TopicRoom`,
  disabled Adds, "to'ldi" badges); threading a fake quota through it would make
  the maths picker's quota code lie. The parts that must not drift are imported,
  not copied.
- **Writing a new question leaves for the real builders** —
  `/teacher/create/question` and `/teacher/create/block`. ⚠️ Both links **stash
  the paper to localStorage first** (`_components/draft.ts`), or clicking one
  would silently destroy a hand-picked paper: the builder holds it in component
  state and those links are ordinary navigations. The draft carries its `quizId`
  **and its `subject`**, so it can never drop biology questions onto a chemistry
  paper, and on mount **the draft wins over the server copy** (it is only written
  when the teacher leaves, so it is strictly newer). Separate key from the Rasch
  draft. ⚠️ **A restore ADOPTS the draft's `quizId`** — a fresh one is minted on
  mount, so a paper already saved once used to fork into a second document with
  the first one's access code the moment the teacher came back.

### 🟢 The round trip is closed: save a question → back on the paper, with it (2026-07-31)

Leaving was safe; **arriving back was the teacher's problem.** The question
builder dropped them at the create hub and finding the way back to a half-built
paper was theirs to work out. Both links now carry `?back=<this builder>` and
`?subject=<taxonomySlug>`
([app/teacher/create/_components/returnTo.ts](../app/teacher/create/_components/returnTo.ts)):

- the question builder's **back arrow** returns to the paper instead of the
  create hub, a banner says a paper is waiting and offers the way back at any
  time, and **a successful save returns there by itself**;
- the save carries `?add=<questionId>` and the builder **puts that question on
  the paper on arrival** — writing a question and putting it on the paper are one
  act, not two;
- `?subject=` pre-picks the **Fan** dropdown, so a biology paper cannot send a
  teacher off to write something it would then have to refuse.

⚠️ **The auto-add waits for `hydrated`** (the draft/server copy in state). Adding
against a paper that has not been restored yet would check the length against
nothing and then **stash that empty paper over the real draft**.

⚠️ **It costs zero reads**: the question builder leaves the document it just
wrote in `questionCache`, which `fetchQuestionById` consults first (a cold reload
of the link pays one read). ⚠️ It then **re-stashes** — the draft was written on
the way OUT and knows nothing of the new question, so a refresh would otherwise
restore the paper without it. ⚠️ **A question of another subject is refused**
with a named toast even though `milliyQuizItem` would happily convert it: the
picker below could never have offered it, and a paper is one subject's.
`?back=` is user input, so only an in-app `/teacher/…` path is ever pushed.

⚠️ **Only a NEW question rides back.** An edited one is either already on the
paper (a duplicate) or was left off it on purpose; the return trip happens, the
`add` does not.

⚠️ **Questions are EMBEDDED SNAPSHOTS, not refs** — the same trade
`teacher_rasch_quizzes` and `custom_tests.questions[]` make. A ref list would
cost one read per question per student per sitting; the snapshot makes a whole
paper **one read** however many students sit it, and freezes the question so
editing the source later can never re-key a paper somebody already answered. The
cost: a fixed paper does not pick up a correction.

⚠️ **A Firestore document is capped at 1 MiB.** `slimMilliyItem` drops
`solutions[].steps` on every add, the builder shows the live size against
`MILLIY_MAX_BYTES` (900 KB), and `saveMilliyQuiz` refuses to write past it.

### Positions are derived, never stored

`MilliyQuizItem = Omit<ExamQuestion, 'slotNumber' | 'sectionLabel'>`, exactly as
`RaschQuizItem` is:

- **`slotNumber`** — a `shared_options` block occupies one slot *per
  sub-question*, so inserting or reordering one question renumbers every question
  after it. `hydrateMilliyQuiz` stamps them on load.
- **`sectionLabel`** — rehydrated from the item's own topic. ⚠️ **Unlike
  `hydrateQuiz`, it must NOT fall back to `EXAM_BLUEPRINT[0].label`** — that is a
  maths dimension name, and printing "Sonlar" on a biology question is worse than
  printing nothing.

⚠️ **`sectionId` here is the question's own TOPIC SLUG**, not a blueprint row id,
and `testType` records only how the item is answered (`O` typed / `Y-1` closed).
Nothing reads `testType` to decide rendering: every item is `source: 'teacher'`,
so `examMode` goes by the question's own `qType`.

### The access code — checked across BOTH collections

Six **digits**, a string everywhere (⚠️ `"048213"` parsed as a number loses its
leading zero and stops matching). Minted on the **first save** and never
regenerated: a teacher who has read it out must not have it change under them.

⚠️ **`reserveMilliyCode` queries `milliy_quizzes` AND `teacher_rasch_quizzes`.**
The student types one code into one box; a code live in both collections would
resolve to whichever query is consulted first, and one teacher's class would sit
another's paper. It is still a **check, not a constraint** — two teachers
generating the same code in the same instant both pass. Airtight needs a
`milliy_quiz_codes/{code}` reservation document written in a transaction;
deliberately not done, same as the maths side.

### Sitting it — one box, two destinations

`findPaperByCode(code)` runs both lookups in parallel and returns a discriminated
union. ⚠️ **The caller MUST branch:**

- **`kind: 'rasch'`** → `router.push('/raschmodel/quiz?code=…')`. Only that page
  writes the Rasch levels a maths sitting moves. The code rides in the URL so the
  student never retypes it; that page reads it from `window.location` once, and
  **only when there is nothing to resume** — a link must not pull a new paper on
  top of one still running against its clock.
- **`kind: 'generic'`** → sat in place.

Resolution order: a **published** subject paper wins, then a live maths paper,
and `closed` is reported only when nothing published anywhere carries the code —
a student told "wrong code" retypes it forever.

From there the sitting is the mock exam with a different source:

- `hydrateMilliyQuiz` → `ExamQuestion[]`, shuffled **once** at lookup if the
  teacher asked for it (re-shuffling would reorder a paper mid-sitting). Shuffling
  moves **cards**, so a block is never split apart.
- The clock starts when **Start** is pressed, not when the code is entered.
- The sitting is persisted to its **own** localStorage store (`milliy:quiz:v1`).
  ⚠️ **A third key, deliberately** — one shared with the mock exam or the maths
  paper would mean starting a biology paper silently discards an exam still
  running against its clock. `createSessionStore` is written once and instantiated
  three times.
- ⚠️ localStorage is shared by every account on one browser, so a snapshot whose
  `uid` is not the current student's is ignored; and a snapshot is only treated as
  a subject paper when `milliySubject` is set.
- ⚠️ **The sitting is FULL SCREEN and locked down.** `ExamRunner` is a
  `fixed inset-0` overlay that covers the shell nav, and it owns the interruption
  warning; `startPaper()` calls `requestExamFullscreen()` inside the click.
  Contract: [STUDENT.md](STUDENT.md#exam-lockdown--full-screen--interruption-warning-2026-07-30).
- ⚠️ **A paper whose deadline passed with NOTHING answered is abandoned, not
  submitted** — identical rule to the mock exam. It must never reach the teacher
  as a 0% result for a paper nobody sat.

### Submit — exactly ONE write

A maths sitting writes twice (the teacher's copy *and* the student's levels). A
subject sitting has no ability model to move, so there is one write:
`milliy_quiz_results/{quizId}_{uid}`. The id is deterministic, so a **retake
overwrites** — the same rule `attempts/{uid}_{assignmentId}` follows, and the
same reason: "how did this class do" goes wrong the moment somebody sits twice.
`savingRef` closes the double-save window on the client.

Stored alongside the score:

- **`items`** — `{ [slotKey]: 0|1 }`, keyed by **`examSlotKeys`**
  ([lib/ExamTeacher.ts](../lib/ExamTeacher.ts)), the one place that vocabulary is
  defined. ⚠️ OUTCOMES ONLY, never what was answered. It drives the teacher's
  per-question solve rate at **no extra read**, and `ExamReview`'s replay mode.
- **`topics`** — raw `{correct, total}` per topic slug. ⚠️ A topic the paper never
  touched is ABSENT, never `{0, 0}` — "not measured" is not zero.

### Reporting

The teacher's results page: sat / average / best, a per-student row that expands
into a green-red slot grid, per-topic counts **weakest first**, and the
per-question marks.

🟢 **The marks surface is now the maths one, feature for feature (2026-08-01).**
It was a 40-row list of `slot · topic · rate · ball` while maths had a grouped
grid, so the two subsystems reported the same numbers in two shapes:

- **Grouped by TOPIC, with what that topic currently adds up to** in the row
  header. ⚠️ That comes free: these papers have no blueprint, so `slotMeta` stores
  the question's own topic slug as `sectionId`, which makes `SlotMark.sectionTotal`
  a per-topic total here and a per-blueprint-row total on maths. Reported, never
  reserved — the paper is priced as a whole.
- **A dense grid, up to 12 cells a row** (number · ball · solve rate), so a
  40-question paper is one glance. Coloured by the **solve rate**, dashed under
  `MIN_RESPONSES`; the `base + bonus` split, the closed/typed label and the raw
  `correct/seen` are in the tooltip. The per-student expanded grid matches it.
- **The paper's own split** is printed under the hint — `44.00 + 56.00 = 100.00`.
  ⚠️ Not the maths paper's `55.10 + 44.90`: a subject paper's base total follows
  the teacher's own mix of closed (1.1) and typed (1.6) items, so it is summed per
  paper, never assumed.
- ⚠️ **No struck-through / underlined "before".** That flags a mark that moved off
  the DTM printed value, and these papers have no printed protocol —
  `evenPrinted` is a flat split, not a protocol, and dressing it up as one would
  invent an authority that does not exist.

⚠️ Sittings with no `items` map are **excluded from the solve-rate denominator**
rather than counted as wrong — an older client wrote no outcomes, and treating
"unknown" as "wrong" would make every question look harder than it is.

The student's own list under the code box shows every subject paper they have sat
and expands into **`ExamReview` in replay mode** (`outcomes`). ⚠️ Offered only
when `items` exists — a review marking everything red would be a lie. ⚠️
`hideAnswers` still holds months later: a teacher who withheld the key keeps it
withheld here.

## Firestore

```
milliy_quizzes/{ms_…}
  id, subject: 'biologiya' | 'kimyo' | 'fizika' | 'ona-tili' | 'ingliz',
  title, description, teacherId, teacherName,
  accessCode: "482913",            ← 6 digits, STRING (never parsed to a number)
  questions: MilliyQuizItem[],     ← embedded snapshots
  questionCount: <slots>,          ← slots, not cards
  questionTarget: <slots>,         ← the teacher's declared length, NOT a national spec
  durationMinutes, shuffle, showAnswers,
  status: 'draft' | 'published' | 'closed',
  createdAt / updatedAt: serverTimestamp

milliy_quiz_results/{quizId}_{uid}
  quizId, quizTitle, subject, teacherId, studentId, studentName,
  correct, total, percent, durationSec,
  submittedAt: <epoch ms>,         ← number, matching every other exam timestamp
  examLang,
  items?:  Record<slotKey, 0|1>,   ← per-SLOT outcome, keys are `examSlotKeys`
  topics?: Record<topicSlug, {correct, total}>   ← raw counts, no ability estimate
```

Rules (`firestore.rules`, **section 12c**) mirror 12b: papers `read: if isAuth()`,
written only by `teacherId`; results read by the student **or** the paper's
teacher, created by the student, updated only by the same student on the same
paper, **delete never**.

⚠️ **KNOWN TRAP, inherited from `custom_tests` and `teacher_rasch_quizzes`: the
paper embeds its questions, and therefore their correct answers, behind
`read: if isAuth()`.** A signed-in student who enumerates the collection can read
the key without ever entering a code. **The 6-digit code is a convenience for
sharing, not a security boundary.** The student lookup is a *query* on
`accessCode`, so a rule that matched the code could not serve it; closing this
means moving the read behind an Admin-SDK route, not changing the rule.

Indexes:

- `milliy_quizzes (teacherId ASC, subject ASC, createdAt DESC)` — the teacher's list.
- `teacher_questions (creatorId ASC, subject.id ASC, createdAt DESC)` — the picker.

Every other query is equality-only, which Firestore serves from single-field
indexes.

## Firestore budget

| Action | Cost |
|---|---|
| Open the teacher hub / a builder | **0** — the picker is on-demand |
| One page of the picker | 10 reads — up to 30 with the closed/typed filter on (shown on screen) |
| Save a paper (any length) | 1 read (to keep `createdAt`) + 1 write |
| Mint a code | 2 queries, 0 documents on the happy path |
| Student opens a paper by code | **≤2 reads** — one per collection, whatever the paper's length |
| Student submits | **1 write** |
| Teacher opens the results | 1 read + 1 query — the solve rate adds nothing |

⚠️ **`listMyMilliyQuizzes` reads FULL documents**, so ten papers pull ten embedded
question arrays for a list that shows only titles. Capped at 20 for that reason;
if it ever needs paging, the fix is a summary mirror, not a bigger limit.

## Invariants & traps

- ⚠️ **Slots, not cards.** A `shared_options` block is worth one slot per
  sub-question (`examSlotCount`), so a 30-slot paper can hold fewer than 30
  documents. `checkMilliyAdd` refuses a block that would overshoot **whole** —
  truncating it would break its shared pool.
- ⚠️ **`questionTarget` is the TEACHER's number, not a national spec.** The maths
  45 comes from a blueprint in this repo; no published biology blueprint is
  encoded, so rather than invent one the teacher declares the length and
  publishing checks against that. Change the default in `MILLIY_SUBJECTS`.
- ⚠️ **Never write `undefined` to Firestore.** `toExamItem` spreads documents that
  may lack optional fields (`b`, `imageUrl`, `parts`) — keep its conditional-spread
  style.
- ⚠️ **Do not copy `ExamRunner` or `ExamReview`** to add a variant. A block's
  answers live under per-part keys (`partKey` → `id::partId`); every surface that
  forgets to branch renders `[object Object]`. And note the two key namespaces:
  **outcomes are `id#partId`** (`examSlotKeys`), answers are `id::partId`. Mixing
  them silently colours every block green.
- ⚠️ **A published paper can still be edited.** Nothing stops a teacher changing
  the questions after students have sat it, which makes those results
  incomparable. Same limitation as the maths paper.
- ⚠️ **Percent is the headline, and it is only comparable within one paper.**
  There is no cross-paper scale here by design (that is what the maths ability
  model is for).

## Known issues / dead code (verified 2026-07-30)

- **The answer key is readable by any signed-in user** (above). The single largest
  limitation, inherited.
- **Code uniqueness is a check, not a constraint** (above) — and it now spans two
  collections, so the race window is the union of both.
- **English is a registry entry only.** No taxonomy, no questions, no builder —
  the card is inert on purpose. Chemistry left this list on 2026-07-30, physics
  and ona tili on 2026-08-03.
- **Physics and ona tili have no encoded protocol.** Their 35/100 and 30/90
  defaults are this repo's, matching their sample papers; only maths has a
  blueprint. Nothing may present those numbers as a national spec.
- **Chemistry stops at question 40.** The programme's #41–43 extended written work
  needs human, per-step marking that does not exist anywhere in this repo (above).
- **No AI generation path.** Biology and chemistry questions are written by hand
  (or by the existing generic AI creators, which accept both taxonomies — the AI
  route's DTM style rule already branches on `kimyo`); there is no
  subject-specific generator.
- **The teacher cannot see what a student ANSWERED**, only whether each slot was
  right. Same deliberate cost decision as the maths paper.

## How to verify changes

**Rules first — `npm run test:rules`.** `tests/rules/milliyquiz.rules.test.mjs`
pins both collections down: the code lookup, teacher ownership, the provable list
queries (teacher's and student's), the retake overwrite and that it cannot
re-point at another paper/student/teacher, and delete being denied to everyone. It
also asserts the answer-key leak **on purpose**, so the limitation stays visible —
if that test starts failing, the read path moved behind a server route and this
doc should say so. Expect **167 tests** total across the suite.

Then `npm run dev`, as a **teacher**:

1. `/teacher/create/question` → the **Fan** dropdown offers **Biologiya** and
   **Kimyo**. Write one `mcq` and one `open` biology question (pick a topic under
   section 2 — the subtopics read `Sitologiya — …`). Then `/teacher/create/block` →
   write one multi-question closed block. Now switch **Fan** to *Kimyo*: exactly
   **four** Mavzu options appear (`I. Umumiy kimyo` … `IV. Kimyoviy tahlil`) and
   their subtopics read `Atom tuzilishi — Izotoplar`,
   `Metallmaslar — VIIA guruh (galogenlar)`. Write one chemistry question.
2. `/teacher/create` must have **no Rasch card** any more. Nav → **Milliy
   sertifikat**: Matematika is *Tayyor* and opens `/teacher/milliy-sertifikat/math`
   (the moved builder — check the old `/teacher/create/rasch` 404s). Biologiya,
   **Kimyo**, **Fizika** and **Ona tili** are *Tayyor*; only Ingliz tili is *Tez
   kunda* and it must be unclickable and un-tabbable.
3. Biologiya → **Yangi variant**. The builder opens with **zero** network
   activity (watch the network tab). Press **Namunaviy variant**: one JS chunk is
   fetched — **no Firestore read** — the paper fills to **31/31**, the length target
   follows the file, the title fills in if empty, and **Saqlash va faollashtirish**
   unlocks. Press it again with a paper present: it must ASK before replacing. Then
   break `data/biology-default-paper.json` on purpose (a bad `topicId`, or an
   `answer` of `"E"`) and press again: nothing loads and the toast names the entry.
   Start over (**Tozalash**), set **Savollar soni** to 3, press **Yuklash**
   — only your *biology* questions come back (the maths ones must not appear), each
   badged *Yopiq* or *Ochiq*. Add all three; the block's Add must be refused whole
   if it would overshoot 3. **Saqlash va faollashtirish** unlocks only at exactly
   3/3.
4. Press **Bitta savol yaratish** — it leaves for `/teacher/create/question`
   with **Fan** already on *Biologiya* and a banner saying a paper is waiting.
   Write a question and save it: **the browser returns to the builder by itself**,
   the paper is still there with a "saved" banner, the new question is **already
   on it** (the counter went up), and the network tab shows **no read** for it.
   Reload: it is still on the paper (the stash was rewritten). Press the link
   again and use the banner's **Variantga qaytish** without saving — the paper
   must come back untouched. Then, from the *Kimyo* builder, write a **biology**
   question: the return must refuse it by name, not drop it onto the chemistry
   paper.
5. Publish → the list shows a 6-digit code; tapping it copies it.
6. **Now do the same for Kimyo**, which is the check that the subsystem really is
   generic — nothing but the registry entry, the taxonomy and the JSON was added
   for it. **Yangi variant** must open with **Savollar soni 40** and **Davomiyligi
   100** already filled in (⚠️ 40/100, not 43/180 — see above). Press **Namunaviy
   variant**: the paper fills to **40/40** from its OWN chunk (the network tab shows
   one JS file, and it must NOT be the biology one), and **Yuklash** must return
   only your *chemistry* question — not the biology or maths ones. Publish it too.
6a. **Fizika** (2026-08-03). `/teacher/create/question` → **Fan** offers
   *Fizika*, with exactly **five** Mavzu options (`I. Mexanika` …
   `V. Kvant va yadro fizikasi`) whose subtopics read `Dinamika — Ishqalanish
   kuchi`, `Geometrik optika — Linzalar va linza formulasi`. Then the hub →
   Fizika → **Yangi variant** opens with **Savollar soni 35** / **Davomiyligi
   100** pre-filled; **Namunaviy variant** fills it to **35/35** from its own
   chunk. Publish it.
6b. **Ona tili** (2026-08-03). **Fan** offers *Ona tili* with **seven** Mavzu
   options (`I. Fonetika va grafika` … `VII. Uslubiyat va nutq madaniyati`) — and
   ⚠️ **no literature topic**, which is deliberate. **Yangi variant** opens at
   **30 / 90**, **Namunaviy variant** fills it to **30/30**, and the URL segment is
   the hyphenated `/teacher/milliy-sertifikat/ona-tili`. Publish it.

As a **student**, in another account:

7. Nav → **Milliy sertifikat**. The hub lists Matematika, Biologiya, **Kimyo**,
   **Fizika** and **Ona tili** as open and only Ingliz tili as *soon* — and so does
   the dashboard's `MilliyCard` chip row. Type the biology code → the intro names
   the paper, its teacher and its length. Watch the network tab: **at most two
   document reads**.
8. Start it. The runner must be pixel-identical to `/raschmodel/exam` — same
   navigator, flags, block pool, typed inputs. Answer some, reload: the paper
   resumes with **no** further reads and the clock kept running.
9. Submit → percent, correct/wrong, and the per-question review. Now open
   `/raschmodel/exam`: it must still offer a **fresh** paper, and a maths paper you
   had in flight must still be there (separate localStorage stores).
10. **Sit the chemistry paper**, and on its typed items check the numeric grading:
    for the `16,25` answer, `16.25` and `16,25` must BOTH be accepted (that is
    `numeric: true` + `squashNumeric`), and for `2-metilbutan`, `2 metilbutan` must
    be accepted (that is its `acceptedAnswers`). A right answer rejected on
    formatting is the failure mode this checks for.
10a. **Sit the physics paper** and check the same thing on its five typed items:
    `0,2` and `0.2` must both be accepted for the kVt·soat question, and `146 ta`
    for the neutron count. ⚠️ Then check the RENDERING: `E = mc²`, `pV = (m/M)RT`
    and `6,6·10⁻³⁴` must read as plain text — a formula showing as raw LaTeX or
    swallowing a character means an entry picked up a `$`, `_` or `^`.
10b. **Sit the ona tili paper.** Its typed items are graded as TEXT, so
    `Atov gap`, `atov gap` and `atov gaplar` must all be accepted while `atov`
    alone is only accepted because it is listed. ⚠️ The check that matters: type
    the answers with a **different apostrophe glyph** anywhere in the paper — no
    typed answer may contain one, so nothing can be marked wrong for it.
11. **Now type a MATHS paper's code into the same box.** It must jump to
    `/raschmodel/quiz` with the code already filled in and the paper found — not an
    empty code box. ⚠️ Repeat while a biology paper is unfinished: the maths link
    must not clobber it.
12. A paper with **Javoblarni ko'rsatish** off must show correctness only — no
    correct answers, no explanations — both right after submitting and later from
    the sat-papers list.

Back as the **teacher**:

13. Biologiya → **Natijalar**. ⚠️ **Check the marking.** The per-question card must
    be the maths one: **grouped by topic** with each topic's current total on the
    right, a **dense grid up to 12 a row** (number · ball · solve rate) with the
    whole paper visible without scrolling the card, and the paper's own split
    printed under the hint (`x + y = 100.00`, ⚠️ *not* 55.10 + 44.90 — a subject
    paper's base total follows its own mix of closed and typed items). After the
    FIRST sitting every question carries a live ball to two decimals, colour-coded
    by solve rate and dashed while under 5 answers; hover one for its
    `base + bonus`, its closed/typed label and `correct/seen`. Sit the
    paper on several accounts, failing one question on all of them and passing
    another on all of them: the failed one climbs, the passed one falls back
    toward its base (1.10 closed / 1.60 typed — ⚠️ **never below it**), and every
    student's score is recomputed. **The paper total must read `100.00/100`
    always** — `B = Y + σ` prices to 100 by construction, with no cap and no
    easy-paper exception. Then check that the marking actually rewards
    difficulty: a student who solved only hard questions must score ABOVE one who
    solved the same NUMBER of easy ones (expand both and compare their per-question
    grids, which add up to the headline by construction). Per-topic counts are
    weakest first. ⚠️ Nothing on this page may show a 0–5 level or a θ.
14. Open **Kimyo → Natijalar** for the chemistry paper and confirm the per-topic
    list groups under the **four** programme sections (`I. Umumiy kimyo` …), not
    under the intermediate groups and not under an empty label.
15. Close the paper; the student's code entry must now say *closed*, not *not
    found*.

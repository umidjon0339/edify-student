# TEACHER — Test Creation, Classes, Analytics, Subscription

> **Agent workflow:** read this BEFORE touching `app/teacher/*`, test/question collections (`teacher_questions`, `custom_tests`, `bsb_chsb_tests`), grading, or subscription/limits display. AI generation routes are covered in [AI.md](AI.md); read both when touching `app/teacher/create/*/api/`. Update this doc in the same change whenever you alter behavior described here. Index: [README.md](README.md).

**Last verified:** 2026-07-30 (Milliy sertifikat hub + the maths builder moved into it, biology **and chemistry** live with sample papers, shared dynamic marking; Rasch paper creator 2026-07-28; rest unverified since commit `7c31a96`).

## Cross-cutting

- Layout gate: `role==='teacher'` (see [AUTH.md](AUTH.md)).
- `TeacherLanguageContext` (`app/teacher/layout.tsx`): `useTeacherLanguage()` → `lang ∈ uz|en|ru`, **persisted per-device** in localStorage `edify-teacher-lang` (restored post-hydration; SSR shell renders uz). Pattern: every page/modal defines its own inline `TRANSLATIONS` dict and picks `TRANSLATIONS[lang] || TRANSLATIONS['uz']`. Hardcoded Uzbek strings still leak (toasts, grade page).
- AI balance widget: `hooks/useMonthlyLimit.ts` — live `onSnapshot(users/{uid})`, `currentLimits.monthlyAiQuestions` (default 100), `usage.aiQuestionsUsed`, unlimited at ≥5000, danger at 80%.
- ⚠️ Nav entries for **subscription** and **ielts** are commented out in the layout even though both routes are fully built (subscription reachable only via the AI-balance "Buy Credits" button).
- ⚠️ **`navItems` order is load-bearing on the `topbar` shell**: `topbarPrimary = navItems.slice(0, 5)` and everything after falls behind "More". Inserting a destination therefore pushes one out of the inline row. The default shell is `sidebar`, which shows them all.
- **Design system:** the ENTIRE teacher tree is styled with the M3 UI kit (`components/ui/*`, tokens only — no raw colors). Read [UI_KIT.md](UI_KIT.md) before styling any teacher page.
- **Shell (layout.tsx):** desktop = flush sidebar that collapses to an 84px labeled M3 rail (header toggle, `[` shortcut, state in localStorage `edify-sb-rail`); mobile = slim top bar + **M3 bottom navigation bar** (Boshqaruv/Yaratish/Sinflar/Kutubxona + Menyu→drawer). ⚠️ The bottom bar auto-hides on deep routes with their own bottom action bars (`HIDE_BOTTOM_BAR` regexes: `create/*`, `classes/*`, `print`, IELTS builder/view) — check that list when adding a page with a floating bottom bar. Language switcher uses inline SVG flags inside the profile popover; desktop NotificationBell was replaced by a "Bildirishnomalar" nav item (bell quick-panel remains on the mobile top bar). **Side shells (2026-10-16)** render the nav from `sideGroups` (Asosiy / Imtihonlar / Resurslar labels, a divider between groups when collapsed), promote "Yangi Test" to a filled CTA button above the list, and omit Settings (still in the profile popover); top shells keep the flat `navItems`. The sidebar AI meter is labeled ("AI kreditlar · used / limit"); the avatar falls back to initials when `photoURL` fails to load. **Games:** `/teacher/games` (nav entry in the Asosiy group, appended late in `navItems` so the topbar inline five are unchanged) — the classroom games hub + **Arqon tortish**, **Savol doskasi**, **Omad g'ildiragi** and **Penalti seriyasi**, playing questions from the teacher's own `custom_tests`; TestCard has a gamepad quick-launch. Everything about it: [GAMES.md](GAMES.md).

## Test creation (`app/teacher/create/*`)

Hub lists 8 methods (the Rasch/Milliy sertifikat card moved out on 2026-07-30 — see below). Two write targets: per-question docs in **`teacher_questions`** and one aggregate test doc in **`custom_tests`** (or **`bsb_chsb_tests`** for BSB/CHSB).

> ⚠️ **Every creator now writes the canonical v1 question schema** via `toQuestionV1()`, and every reader normalizes via `normalizeQuestion()`. Legacy questions are never migrated and must keep working. **Read [QUESTIONS.md](QUESTIONS.md) before changing any creation or rendering path** — including the trap that `where('difficulty','==','easy')` silently misses every v1 doc.
>
> The embedded copy in `custom_tests.questions[]` is v1 too. ⚠️ `serverTimestamp()` **cannot go inside an array** — publish paths build the doc twice: `serverTimestamp()` for the standalone `teacher_questions` doc, `Timestamp.now()` for the embedded snapshot.
>
> Full v1 field list + the legacy shape it coexists with: [DATA_MODEL.md](DATA_MODEL.md).

### Shared creation UI (minimal redesign, 2026-10-29 — rolling out page by page)

All creation pages are moving to one plain look (1px borders, one accent, short words, phone-first). Reuse these, don't re-copy them per page:

| File | What |
|---|---|
| `create/_components/CreateKit.tsx` | `CreateHeader` (sticky: back · title · right slot), `Field` (label above control), `Segmented`, `Stepper`, `ActionBar` (sticky bottom bar: summary + actions), `EmptyHint`, `INPUT` class (16px on phones so iOS doesn't zoom) |
| `create/_components/GeneratingOverlay.tsx` | The ONE "AI is working" screen. ⚠️ **Portaled to `<body>`**: the layout's page-transition wrapper is transformed, so an in-page `fixed inset-0` only covers the content column — the sidebar stayed sharp and clickable |
| `create/_components/MathText.tsx` | Lenient `$…$` renderer for AI output (+ `pickText(value, lang)`) — replaces the per-page `FormattedText` copies, logic unchanged |
| `create/_components/DraftQuestionCard.tsx` | One AI-generated question under review (number · meta · ✓ correct · "Yechim" toggle · delete) |
| `create/_components/AiMonthlyLimitCard.tsx` | "⚡ N ta qoldi" chip + small popover |

Done: `create/ai`. Still on the old look: the other AI pages, hub, manual and bank pages. ⚠️ `tailwindcss-animate` is **not installed** — `animate-in`/`fade-in` classes on the old pages are no-ops.

| Method | Route | Writes | Notes |
|---|---|---|---|
| Manual "Blank Canvas" | `create/custom/` | both | localStorage draft (1h TTL despite the 24h constant name); MathInput/RichQuestionInput |
| Single question builder | `create/question/` | `teacher_questions` only | images on prompt + every option, 5 question types, required topic path — see below |
| Question block | `create/block/` | `teacher_questions` only | one stem + N sub-questions in **ONE doc** (`multi_part` / `shared_options`); ⚠️ edit blocks HERE (`?edit=`), never in `create/question` — see [QUESTIONS.md](QUESTIONS.md). Bottom of the page reuses `CreatedQuestionsList` with `filter={q => q.isBlock}` — the teacher's own blocks, edit loads back into the builder in place |
| JSON import (all subjects) | `create/import/` | `teacher_questions` only | bulk JSON → v1 docs (`creationMethod: 'exam_import'`, status `review`); subject chips = every taxonomy subject, `?subject=`/`?back=`; fuzzy topic matching + grouped bulk topic fix; accepts native, extended `{en,uz,ru}` and College Board rows. **Two tabs**: questions → own bank, or **SAT practice bank** (`?kind=exam`) → shared `sat_pool` chunks that students' SAT pages generate tests from (no `teacher_questions` writes, no test created). `/teacher/sat/import` redirects here. Contract: [SAT_QUIZ.md](SAT_QUIZ.md) §Teacher dataset import |
| General AI | `create/ai/` + api | both | prompt text in [lib/ai/questionPrompts.ts](../lib/ai/questionPrompts.ts) — shared with the classroom games, like every AI create route below ([AI.md](AI.md)) |
| By image | `create/by_image/` + api | both | the ONLY feature-gated AI route (`IMAGE_AI`) — see [AI.md](AI.md) |
| Free prompt | `create/by_user_input/` + api | both | |
| Maktab / Ixtisoslashtirilgan | `create/maktab/`, `create/ixtisoslashtirilgan_maktab/` + api | both | pick topic via `/api/structure` + `/api/syllabus` (local JSON syllabus) |
| From bank (`questions1`) | `create/database/` | `custom_tests` | the only consumer of `quizService.fetchQuestions`; query traps in [DATA_MODEL.md](DATA_MODEL.md) |
| From own bank | `create/my_questions/` | `custom_tests` | manages `teacher_questions where creatorId==uid` |
| BSB/CHSB | `create/bsb-chsb/` + api | **`bsb_chsb_tests`** only | mixed question types with `points`, `pairs`, `rubric`; ⚠️ NOT feature-gated despite `BSB_GENERATOR` existing in the registry |
| Operations / Abiturient | `create/operations/`, `create/abiturient/` | none | operations = client-side jsPDF worksheets; abiturient = router hub |
| **Rasch paper (45 q + 6-digit code)** | ⚠️ **moved** to `milliy-sertifikat/math/` (+ `build/`, `results/[quizId]/`) | **`teacher_rasch_quizzes`** only | Two pools: the teacher's own `teacher_questions` (default tab) and `questions1` to top up. Writing a new question links out to `create/question` / `create/block`; ⚠️ the paper is stashed to localStorage first so navigating away can't destroy it. Students open it at `/raschmodel/quiz` and it scores into their Rasch levels. Full contract: [RASCH_QUIZ.md](RASCH_QUIZ.md) |
| **Milliy sertifikat subject paper** (biology…) | `milliy-sertifikat/[subject]/` (+ `build/`, `results/[quizId]/`) | **`milliy_quizzes`** only | One pool: the teacher's own `teacher_questions` filtered to the subject **server-side**. Teacher-declared length, no blueprint quota, **no ability model** — results are raw counts. Students open it at `/milliy-sertifikat` with the same 6-digit code box that serves maths. Full contract: [MILLIY_QUIZ.md](MILLIY_QUIZ.md) |

`custom_tests` doc: `{teacherId, teacherName?, title, track, subjectName, topicName..., questions:[full question objects embedded], duration (0 = no limit), shuffle (default true), resultsVisibility ('always'|'after_due'|'never', default 'after_due'), accessCode, status:'active', createdAt, questionCount}`. ⚠️ Shape drifts by creator: `teacherName` absent in ai/my_questions paths; `track` varies (`custom`/`general_ai`/`custom_mix`); `EditTestModal` writes a derived `showResults` bool no creator writes.

`accessCode`: 6 chars from an ambiguity-safe alphabet, generated once per modal mount, **no uniqueness check**. ⚠️ Not the same thing as a Rasch paper's `accessCode`, which is 6 **digits**, minted once on first save and best-effort uniqueness-checked ([RASCH_QUIZ.md](RASCH_QUIZ.md)).

### Single question builder (`create/question/`)

Its own hub section ("Savollar Bazasi"). One question at a time, written to **`teacher_questions`** in the **canonical v1 schema** — the same format every other creation method now writes. **Read [QUESTIONS.md](QUESTIONS.md) before touching this or any other question path.** Firestore/Storage logic: [services/questionBankService.ts](../services/questionBankService.ts); the page only holds form state. Route-local: `_components/ImagePicker.tsx` (pick + preview, no upload) and `_components/CreatedQuestionsList.tsx` (the teacher's own questions, list + delete). ⚠️ `CreatedQuestionsList` is shared with `create/block` — it reads **nothing** on mount (the just-saved question is handed over in memory as `sessionQuestions`), only on "load 10". Its optional `filter` prop narrows what is shown, and because filtering is client-side a press then pulls up to 3 pages of 10 until something matches.

- **Prompt** = rich text (RichQuestionInput → LaTeX inline as `$...$`, math via the ∑ toolbar button) **and/or** an image.
- **Images everywhere**: the prompt and **every answer option** may carry one (≤5 MB). An option is valid with text, an image, or both. Images upload to Storage `teacher_questions/{uid}/{questionId}_{slot}_{ts}{ext}` (`slot` = `prompt`|`correct`|`opt{i}`) **only on save, after validation passes** — an abandoned form uploads nothing. `deleteQuestion()` removes every owned object before the doc, or they'd leak.
- **Topic path is required**: Fan → Mavzu → Ichki mavzu, from **[data/question_topics.json](../data/question_topics.json)** via [lib/questionTopics.ts](../lib/questionTopics.ts) (plain import, *not* `/api/structure` — it's small and needed client-side). Ids **and** names are persisted; ids are referenced by saved docs, so keep them stable when editing the JSON.
- **Question types** (`IMPLEMENTED_QUESTION_TYPES`): `mcq`, `multiple_select`, `true_false`, `open`, `numeric`. Option-based types collect a correct answer + 1–5 other options; on save they are **shuffled** into `options[]` A…F and `correctAnswer.value` records the winning letter(s) — so the answer is never predictably `A` when a test runs with `shuffle: false`. Text types collect a typed answer plus optional `acceptedAnswers[]` and a `caseSensitive` flag. The other 12 types in the enum are declared but **not authorable/renderable** yet.
- 6 difficulty levels (beginner…olympiad — ⚠️ non-monotonic ids, see [QUESTIONS.md](QUESTIONS.md)), `status`, `points`, `estimatedTime`, `hint`, `tags`, `curriculum`.
- Every doc is stamped with `creatorId` + `creatorName` (Auth `displayName`, falling back to `users/{uid}.displayName` — username-flow accounts have no Auth displayName).
- The doc ID is reserved client-side (`newQuestionId()`) before any upload so Storage paths key off it; **doc key === `id` field**.
- ⚠️ **The list under the form does NOT read Firestore on mount, or after a save.** The question you just created is shown from memory; Firestore is touched only when the teacher presses "load 10" (10 docs per press, cursor-paged). Opening the builder costs zero reads — don't reintroduce an auto-fetch.
- **Editing**: the pencil on any row, or `Tahrirlash` on any card in `create/my_questions` → `/teacher/create/question?edit=<id>`. Loads the stored question back into the form (legacy docs included — they're the ones that need fixing) and writes back to the SAME doc: `createdAt` preserved, `metadata.updatedAt` moved, replaced images deleted from Storage, `creationMethod` kept. See [QUESTIONS.md](QUESTIONS.md).
- Per-source defaults (AI → `status: review`, hand-written → `published`, plus `aiModel` and provenance tags) come from `CREATION_METHOD_DEFAULTS` — see [QUESTIONS.md](QUESTIONS.md).

## Milliy sertifikat (`app/teacher/milliy-sertifikat/`) — 2026-07-30

A top-level nav destination (`BadgeCheck` icon, between IELTS and Library) whose
only job is to be a **subject router**. One page, no state, no Firestore, no
service — it reads nothing and writes nothing.

🟢 **The maths builder now LIVES here** (`milliy-sertifikat/math/*`, moved from
`create/rasch` on 2026-07-30) and its card is **gone from the create hub** — it is
a per-subject exam programme, not one of that hub's test-creation methods. It is
still `teacher_rasch_quizzes` and still documented by [RASCH_QUIZ.md](RASCH_QUIZ.md).
⚠️ The static `math` segment beats the sibling `[subject]` route, which is why
`genericSubject()` also refuses `'math'`.

⚠️ **Maths is NOT a new subsystem, and must not become one.** The Milliy
sertifikat maths paper is *exactly* the paper `create/rasch` already builds: the
45-question DTM protocol (Y-1 #1–32, Y-2 #33–40, O #41–45) is what
`EXAM_BLUEPRINT` encodes — see the header comment of
[lib/Examblueprint.ts](../lib/Examblueprint.ts) and `RASCH_QUIZ_TOTAL` in
[lib/RASCHquiz.ts](../lib/RASCHquiz.ts). So the **Matematika** card links to
`milliy-sertifikat/math` and the whole chain behind it (6-digit code → student
runner at `/raschmodel/quiz` → results page) is reused unchanged. A second
maths paper system in its own collection was considered and rejected: it would
have meant two builders, two collections and two student runners for one exam,
guaranteed to drift. Contract: [RASCH_QUIZ.md](RASCH_QUIZ.md).

- **Biologiya and Kimyo are live** and are served by a *different* subsystem — the
  generic Milliy sertifikat subject paper, `milliy_quizzes`, with no blueprint quota
  and no ability model. Full contract: [MILLIY_QUIZ.md](MILLIY_QUIZ.md). Its routes
  are `milliy-sertifikat/[subject]` (papers list), `[subject]/build`, and
  `[subject]/results/[quizId]` — **one set of routes for every subject**, so
  chemistry needed no new page. Each ships a **Namunaviy variant** sample paper
  (biology 31 questions, chemistry 40).
  - ⚠️ Chemistry's builder defaults to **40 questions / 100 minutes, not the
    programme's 43 / 180**: #41–43 are extended written work that only a human can
    mark. See [MILLIY_QUIZ.md](MILLIY_QUIZ.md).
- **Fizika / Ingliz tili are registry entries only** — `href: null` makes the card
  inert (muted, no pointer, out of the tab order) and it says so on its face. They
  are placeholders for the intended shape, not stubs that lead somewhere broken.
- ⚠️ **Which subjects exist is `MILLIY_SUBJECTS`** ([lib/MilliyQuiz.ts](../lib/MilliyQuiz.ts)),
  not this page. The teacher hub, the student hub and the builder all read that
  list, so a subject can never be live in one place and missing from another.
- ⚠️ **When a new subject lands, do NOT point it at the Rasch flow.** That flow's
  quota rules (`BLUEPRINT_SECTION_TARGET`), difficulty bands and ability model are
  maths-specific — `questions1` only knows Algebra and Geometriya, and a sitting
  moves `RASCH_levels/{uid}`. Add its taxonomy to `data/question_topics.json` and
  flip its registry entry to `generic`; see [MILLIY_QUIZ.md](MILLIY_QUIZ.md).
- Trilingual inline `TR` dicts + `useTeacherLanguage()`, teacher UI kit only. The
  Rasch card in the `create` hub is **deliberately left in place** — the same
  builder is now reachable two ways, which is intended, not a duplicate.

## Classes (`app/teacher/classes`)

Local schema notes: `classes/_components/class_info.txt` (accurate).

- **Create**: `{title, description, joinCode, teacherId, teacherName, studentIds:[], studentCount:0, createdAt}`. `joinCode` = random base36 uppercased, ≤6 chars, no collision check; regenerable in settings; `isLocked` blocks joins. `studentCount` never maintained.
- **Roster**: module-level cache + IntersectionObserver paging; add student by `usernames/{name}` lookup (`arrayUnion`); remove `arrayRemove`. Join requests in `classes/{id}/requests` — accept = `arrayUnion(studentId)` + delete request (also handled from the notifications inbox). ⚠️ Must tolerate both request shapes (see [STUDENT.md](STUDENT.md)).

### 🟢 Center groups are VIEW-ONLY for the teacher (2026-07-19)

A class with `centerId != ''` is a **center group** — its roster, identity and lifecycle belong to the center manager ([MANAGER.md](MANAGER.md)); the teacher keeps teaching features only (assignments, exams, materials, attendance, grading, leaderboard). Everything below is gated on `cls.centerId` in UI **and** enforced by rules (suite "TEACHER — center groups are manager-run" in `tests/rules/manager.rules.test.mjs`):

- **Roster tab is read-only** (`RosterTab readOnly` prop): no remove button; a hint banner explains the manager runs enrollment. The plus-menu's "O'quvchi Qo'shish" and the Settings button are hidden; AddStudentModal/ClassSettingsModal aren't even mounted.
- **No join code**: the card badge and header chip show the **center name** (`centers/{id}.name`, `Building2` icon, tertiary-container) instead of the joinCode. Students entering the code in `JoinClassModal` get a "managed by the center" toast; request creation is also rules-blocked, and the Requests tab disappears (its listener isn't subscribed).
- **Notifications inbox**: accepting a stale join request for a center group cleans the request + notification up and shows the explanation toast instead of `arrayUnion`.
- **Settings → Manage Classes** (`SecurityTab`): center groups show a center badge instead of the delete button, and `confirmDeleteClass` hard-refuses them — ⚠️ essential because `deleteClassAPI` is a Cloud Function (Admin SDK, bypasses rules).
- **Attendance stamps the CLASS's own `centerId`** (`classData.centerId || ''`), not the teacher's center — a center teacher's personal-group attendance no longer leaks into center reports (`fetchCenterSessions` queries `centerId ==`).
- **`hooks/useTeacherCenter.ts`** resolves the teacher's center chip (dashboard header, `getDoc(center_teachers/{uid})` + `centers/{id}`, module-cached). ⚠️ Never `where('teacherId','==',uid)`-query `center_teachers` from the teacher side — the list rule checks the doc-id wildcard, the query is not provable, and it fails with permission-denied (the old class-detail page did exactly this and silently stamped `''`).
- **Assignments** (`AssignTestModal`): `{testId→custom_tests, testTitle, questionCount, duration|null, resultsVisibility, description, openAt, dueAt|null, assignedTo:'all'|uid[], allowedAttempts (0=unlimited), status:'active' (static — UI derives scheduled/active/closed from dates), teacherId, createdAt}`. `duration`/`resultsVisibility` are denormalized from the test at save (in edit mode the modal fetches the template — `selectedTest` is a stub); saving `resultsVisibility:'after_due'` **without a dueAt is refused** (`needDue` toast) — the student side holds results for `after_due`+no-deadline, so it would never reveal. Sends notifications on create; **edit sends none**.
- **Exams** (`AssignExamModal`): `{testId→bsb_chsb_tests, title, assessmentType, examDate, durationMinutes, hideResults (undefined = hidden), submittedStudentIds:[], status:'scheduled', teacherId, createdAt}`.
- **Grading** (`grade/[examId]/[studentId]/`): loads attempt by `classId+assignmentId(examId)+userId`, template from `bsb_chsb_tests`; auto-scores unless `manualScores[qId]` present; save writes `{manualScores, autoScore: 0, teacherScore: finalTotal, status:'graded'}`. ⚠️ **`autoScore` is hard-set to 0 on every save** — the final grade lives only in `teacherScore`/`manualScores`. 🟢 Exams with no `open_ended` questions arrive **already in that graded shape** (student-side auto-release, 2026-07-20) — the grade page pre-fills from `manualScores` and a re-save simply overwrites.
- **Materials** (`UploadMaterialModal`): Storage path `classes/{classId}/materials/{ts}_{rand}{ext}` or external link (`isExternal`); doc has `isVisible`/`isArchived` toggles, `orderIndex: Date.now()`, `viewCount`/`downloadCount` (initialized, never incremented teacher-side). Delete removes Storage object + doc.
- **Schedule**: `classes.schedule` is read by `AttendanceTab` but **no teacher UI writes it** — schedules are managed by the center manager ([MANAGER.md](MANAGER.md)/[ROOMS.md](ROOMS.md)).

## 🏢 Center hub — `app/teacher/center/` (2026-07-29)

The teacher-side counterpart of the student's `/center`. **Everything is read-only** except the
attendance deep-links; the teacher has no write path to rosters, schedules or money
([MANAGER.md](MANAGER.md) — center groups are manager-run and the rules' teacher branch requires
`centerId == ''`). No new Firestore collections, no rules changes, no new indexes.

- **Gating**: the "Markazim" nav entry (layout) and the dashboard center strip render only when
  `useTeacherCenter().centerId` is non-empty. A solo teacher sees **zero** change anywhere, and
  `/teacher/center` reached directly renders a friendly "not linked" empty state — never an error.
  This also covers being removed from a center mid-session.
- **Groups source**: `services/teacherCenterService.ts` → `classes where teacherId == uid`, filtered
  client-side to `centerId === myCenterId` (membership is `classes.centerId`-anchored). Single-field
  equality query, so **no composite index**. Module-cached 60s per (teacher, center); the dashboard
  and every hub tab share the one fetch. `groupHref()` sends center IELTS twins to
  `/teacher/ielts/groups/{ieltsGroupId}` — they are hidden from `/teacher/classes`.
- **Tabs**: Umumiy (stat tiles + today's lessons) · Guruhlar (link-only cards — each group already
  has a full page; do not duplicate roster/assignment UI here) · Jadval (merged Monday-first week,
  7-column ≥md / one day per row below) · Davomat (per-month rate, per-group bars, recent sessions,
  month nav) · Maosh ([FINANCE.md](FINANCE.md) §9.1).
- **`components/center/TeacherTodayLessons.tsx`** — shared by the hub AND the dashboard (hence
  `components/`, not `_components/`). Lessons come from `classes.schedule`; marking progress is LIVE
  via ONE `center_attendance where centerId== and date==today` listener covering every group
  (`centerId+date` index; `list: if isAuth()` — never a per-doc `get()`, see [ATTENDANCE.md](ATTENDANCE.md)).
  Its "Davomat olish" button deep-links to `…?tab=attendance`.
- **`?tab=` deep links**: `/teacher/classes/[classId]`, `/teacher/ielts/groups/[groupId]` and the hub
  itself seed their initial tab from `window.location.search` in a lazy `useState` initializer —
  **not `useSearchParams`**, which would force a Suspense boundary at build time. The IELTS group page
  falls back to `dashboard` when the requested tab doesn't exist for that group (e.g.
  `?tab=attendance` on a non-managed group), so it can never render blank.
- **`lib/weekSchedule.ts`** holds the pure timetable helpers (flatten/group/next-lesson, Monday-first
  order, Tashkent clock reads) shared with the student hub — rendering can't be shared across the
  three UI kits, so the logic is. ⚠️ `todayDowTashkent()`/`nowHmTashkent()` read the clock: call them
  in lazy `useState` initializers, never inside `useMemo` (the React Compiler bails on the component).
- **Dashboard**: for center teachers the "Faol Sinflar"/"O'quvchilar" stat cards now show real
  center-derived counts instead of `users.activeClassCount`/`totalStudents`, which are
  Cloud-Function-generated with no `functions/` dir in the repo (often stale/absent). Solo teachers
  still read those fields — unchanged. The old center *chip* in the greeting was replaced by the
  center strip below it.
- ⚠️ The teacher **cannot list `center_students`** (rules `list` allows manager or self only) — never
  add a center-wide roster here; student info must come from `classes.studentIds`.
- Mobile: the entry lives in the ☰ drawer (the bottom bar is at its M3 cap of 4 + Menu) plus the
  dashboard strip.

## Analytics & print

- `analytics/page.tsx`: modes assignment/student; aggregates `attempts`, anonymizes, POSTs to `/api/analyze` (see [AI.md](AI.md) — daily limit from Remote Config `ai_daily_limit`, spoofable). Chats persisted to `ai_sessions/{sess_${Date.now()}}` `{teacherId, title, createdAt ISO, messages[]}`; history paged 5 by `teacherId+createdAt desc`. ⚠️ Calls `/api/stt` which **does not exist**.
- Print: `PrintLauncher` → localStorage `print_payload` → `/teacher/print` A4 studio (bubble sheets, answer keys, HTML-based PDF). No Firestore.

## Subscription & limits (`subscription/page.tsx` + `plansData.ts`)

- Plans `free|pro|vip`: limits {maxClasses 1/5/9999, maxStudents 20/200/99999, monthlyAiQuestions 100/1000/5000}, `includedFeatures` from `FEATURE_REGISTRY` (ONLINE_LIBRARY, MATH_WORKSHEETS, PDF_EXPORT, IMAGE_AI, BSB_GENERATOR, ANALYTICS, CLOUD_STORAGE), dual monthly/6-month pricing, `paymentIds` placeholders.
- Reads `users/{uid}` live. Trial → Cloud Function `startFreeTrial` (**not in repo**). Purchase → Telegram contact (`t.me/Umidjon0339`), no in-app payment.
- Who writes the fields: admin panel (both membership editors — see [ADMIN.md](ADMIN.md)) and `deductMonthlyAiCredits`. `usage.activeClassCount`/`totalStudents`/`customTestCount`/`aiLimitResetDate` are **Cloud-Function-generated, and no `functions/` dir exists in the repo** — treat as possibly absent.
- ⚠️ **Enforcement reality: only the monthly AI count is enforced (in AI routes), and only IMAGE_AI is feature-locked.** `maxClasses`/`maxStudents` and all other advertised features (BSB, analytics, materials…) are display-only — free users can use them. Don't assume plan gating exists when adding features.
- `membership_details/` (repo root) describes a **legacy divergent design** (`usePlanLimits`, `aiRequestsToday`, paywall modal…) — none of it exists in code. Historical notes only.

## Known issues / dead code (verified 2026-07-12)

- Feature-locks unenforced except IMAGE_AI; maxClasses/maxStudents never enforced.
- joinCode/accessCode collision risk (no uniqueness checks).
- Language preference not persisted.
- Dashboard's primary usage-derivation block commented out.

## How to verify changes

`npm run dev`; create a test via the touched method → check `teacher_questions` + `custom_tests` docs; assign to a class with a student account, submit, grade (exam path); confirm AI credits deducted by the actual generated count.

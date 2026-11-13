# IELTS — Groups, Tests, Runner, Grading

> **Agent workflow:** read this BEFORE touching anything under `app/(student)/ielts/`, `app/teacher/ielts/`, `app/admin/ielts/`, `app/api/ielts/`, `lib/ielts/`, or `services/ieltsService.ts`. Update this doc in the same change whenever you alter behavior described here. Index: [README.md](README.md). Design/product rationale: [IELTS_UPGRADE_PLAN.md](IELTS_UPGRADE_PLAN.md).

**Last verified:** 2026-11-13 (**C19** reading + listening papers imported (8 tests); flowchart steps keep `\n`; the import validator's short-answer warning now matches the grader — only an all-single-letter array is read as option letters; **listening**: runner follows the audio part / no mid-audio auto-submit / practice player decoupled + speed & skip; renderer keeps `\n` in notes & tables; labelled map rows; C18 listening papers + `ielts:media` uploader). Earlier: 2026-07-31 (**runner marker/font/split fixes**; **platform catalog** — admin order + per-audience visibility, 4-module JSON import validator, structure specs in `data/ielts practise/`; **tabbed student hub** — `?tab=groups|practice|progress`).

## Architecture in one paragraph

Teachers (and the admin, for the **platform dataset**) author Reading/Listening tests with 13 question types plus Writing tasks and Speaking cue-card sets. Public test docs are **answer-free** (`answers_split: true`); the key lives in `ielts_answer_keys/{testId}` (teacher-only read) and grading happens **server-side** in `/api/ielts/submit` (Admin SDK), which writes `ielts_attempts` (clients cannot create/forge attempts — rules `create: false`). Teachers assign tests to `ielts_groups` via `ielts_groups/{id}/assignments`; students take them in a CD-IELTS-style runner (split-pane / mobile Passage-Questions tab toggle, 1–40 palette, review flags, red-at-10/5-min timer, play-once listening in simulation mode) and get raw score + **band** (tables in `lib/ielts/bands.ts`; Academic vs GT Reading differ). Students can also self-practice any **platform** test (`source: 'platform'`, unlimited retakes, history kept). Writing/Speaking attempts are teacher-graded (`reviewStatus`/`teacherGrade`). Submissions award XP client-side after the server grade (same applyUserXp/mirrorLeaderboards flow as the regular runner).

## Collections

| Collection | Shape / notes |
|---|---|
| `ielts_reading_tests/{test_id}` | `{test_id, test_title, module:'reading', test_category?:'academic'\|'general', total_time_minutes, total_questions, passages[], teacherId (null = platform), source:'teacher'\|'platform', answers_split:true, status, createdAt (preserved on re-save), updatedAt}`. Passage = `{id, passage_number, title, subtitle, instruction, word_count, difficulty, blocks[{type:'text',label,content}], questions: QuestionBlock[]}`. |
| `ielts_listening_tests/{test_id}` | Same base + `parts: [{part_number 1–4, audio_url (Storage `ielts_audio/{testId}/…`), audio_duration_seconds?, transcript?, questions: QuestionBlock[]}]`. |
| `ielts_writing_tests/{test_id}` | `{module:'writing', task1:{prompt, imageUrl?, modelAnswer?}, task2:{prompt, modelAnswer?}, teacherId, source, …}` |
| `ielts_speaking_tests/{test_id}` | `{module:'speaking', part1Questions[], part2CueCard:{topic, bullets[]}, part3Questions[], …}` |
| `ielts_answer_keys/{testId}` | `{testId, teacherId, skill, keys: {"<qn>": {t: type, a: string\|string[], wl?: wordLimit, span?: listSelectionSpan}}}`. **Never student-readable.** |
| `ielts_test_meta/{testId}` | Library-card summary written in the **same batch** as every test save (`saveIeltsTest` + W/S saves): `{testId, skill, test_title, teacherId, source, test_category?, total_questions, total_time_minutes, typeBreakdown? (R/L), createdAt, updatedAt}` **+ the catalog controls `catalogOrder?, hiddenFromStudents?, hiddenFromTeachers?`** (2026-07-31, additive — mirrored from the test doc, admin-written only). **Never contains answers**; read `isAuth()`, ownership mirrors the banks. Legacy tests get one on re-save; `fetchPlatformTestSummaries` compares a `getCountFromServer` count and **falls back to full-doc fetch on any mismatch** (correctness over speed). Delete rules on keys/meta allow `resource == null` so `deleteIeltsTest`'s batch works for legacy tests. |
| `ielts_ai_usage/{uid}_{YYYY-MM-DD}` | Per-day counter for `/api/ielts/analyze-writing` (UTC date key, System-C pattern from [AI.md](AI.md)); Admin-SDK only, no client rules. Env `IELTS_AI_WRITING_DAILY_LIMIT` (default 5). |
| `ielts_groups/{groupId}` | base shape unchanged; read = teacher/member (join goes through the API). **Center-managed groups (2026-07-29, additive)**: `centerId?, classId?, managed?` set ONLY by `POST /api/manager/ielts-groups`, which batches the group with a `classes` twin (`classes.ieltsGroupId` back-link) so timetable/rooms/attendance/walk-in/finance work untouched. `studentIds` mirrors the class roster (manager-owned; `managedRosterBatch` in `services/ieltsService.ts` writes both docs atomically). Rules: owning manager may also read + do limited-key updates (`studentIds/teacherId/teacherName/title/description/targetBand/updatedAt`); the TEACHER cannot touch the managed group doc at all (assignments subcollection stays theirs); managed delete is API-only. Tests: `tests/rules/ieltsCenter.rules.test.mjs`. |
| `ielts_groups/{id}/assignments/{id}` | `{testId, skill, testTitle, questionCount, totalTimeMinutes, mode:'simulation'\|'practice', openAt, dueAt, allowedAttempts, resultsVisibility:'always'\|'after_due'\|'never', assignedTo:'all'\|uid[], teacherId, createdAt, status:'active', completedBy[]}` — `completedBy` is server-written. |
| `ielts_groups/{id}/requests/{id}` | created **only** by `/api/ielts/join`; teacher reads/deletes; student may delete own. |
| `ielts_attempts/{id}` | Assignment attempts: deterministic id `{uid}_{groupId}_{assignmentId}` (attemptsTaken increments). Practice: auto-id, `kind:'practice'`, unlimited history. Fields: see `lib/ielts/types.ts` `IeltsAttempt` (answers, rawScore, bandScore, perQuestion, typeStats, writing/speaking payloads, reviewStatus/teacherGrade, tabSwitches, xpEarned). New optional: `teacherGrade.criteria` `{ta,cc,lr,gra}` (writing rubric sub-scores) and `aiEstimate` `{band, criteria, feedback{uz,ru,en}, model, createdAt}` — written **only** by `/api/ielts/analyze-writing`, advisory, teacherGrade always wins. **Server-written only**; teacher may update only `reviewStatus`+`teacherGrade` (W/S grading). |

QuestionBlock: 13 types (unchanged from the original builder), `start_question`/`end_question` global numbering, gap-token grammar `[0]`/`[_]`/`[]`, `options: null` = free-text vs array = word-bank. New optional: `word_limit` (block), `explanation` (row). ⚠️ `list_selection` span must be derived from `end_question - start_question + 1` in student code (public docs have no `correct_answer`).

## Server boundary — `app/api/ielts/*` (first IELTS API routes)

- `POST /api/ielts/submit` — verifies Bearer token, membership, open/due window (+60s grace), attempt limit; loads key (fallback: extracts inline answers from **legacy** docs); grades via `lib/ielts/grading.ts`; band via `lib/ielts/bands.ts` (extrapolated when total ≠ 40 — indicative); writes attempt + `completedBy` arrayUnion in a transaction; returns result with `perQuestion` withheld unless `resultsVisibility` allows. Returns `xpSuggested` (1/correct + 10; W/S flat 15; practice retakes 0) — client applies XP via `submitIeltsAttempt` in `services/ieltsService.ts`.
- `GET /api/ielts/review?attemptId=` — attempt + correct answers, gated by visibility (owner) or group ownership (teacher).
- `POST /api/ielts/join` — join by code (regex `I-[A-Z0-9]{4,6}`), duplicate-code → 409, creates the request doc server-side. Returns `member|pending|requested`. Center-managed groups are refused with 403 `CENTER_MANAGED` (roster is manager-only, even with a leaked code).
- **Manager routes** (`requireActiveCenterManager`, see [MANAGER.md](MANAGER.md)): `POST /api/manager/ielts-groups` (create the linked pair), `DELETE /api/manager/ielts-groups/{groupId}` (pair delete: group + assignments/requests + class twin; **attempts and finance docs kept**), `GET /api/manager/ielts-groups/{groupId}/overview` (read-only oversight: per-student latest/best band, per-assignment completion, pending W/S count, avg band — Admin SDK, so no client rules opened on assignments/attempts).
- `POST /api/ielts/check` — practice self-check: grades the answers given so far and returns per-question correctness **without accepted answers**. **Platform tests only** (assignment tests refused so teacher windows can't be probed pre-submit). list_selection spans expose one span number per selected letter. ⚠️ **No UI calls this since 2026-07-31**: the runner's "Tekshirish" button was removed on request (submit is the only action), so the route + `checkPracticeAnswers` in `services/ieltsService.ts` are live but unreferenced — kept deliberately, don't build on it and don't delete it without a decision.
- `POST /api/ielts/analyze-writing` — Gemini (`gemini-2.5-flash`, JSON responseSchema) first-pass writing estimate: TA/CC/LR/GRA sub-bands (0.5 steps, clamped 1–9), overall = rounded mean, trilingual feedback. Caller: attempt owner or group teacher. **Cached on the attempt** (`aiEstimate`) — one Gemini call per attempt ever; check→generate→deduct via `ielts_ai_usage` daily counter. Consumers: student review page ("Get AI feedback") and the teacher grading form ("AI draft" pre-fill).
- **Structured error codes**: every route returns `{error, code}` (`IeltsApiErrorCode` in `lib/server/ieltsRoute.ts` — `NOT_MEMBER`, `NOT_OPEN`, `PAST_DUE`, `NO_ATTEMPTS_LEFT`, `RESULTS_HIDDEN`, `RESULTS_AFTER_DUE`, `LIMIT_REACHED`, …). Clients branch on `code` via `IeltsClientError` (thrown by `api()` in `services/ieltsService.ts`) — **never on the Uzbek message text** (the old review-page regex is gone).

Grading rules implemented in `lib/ielts/grading.ts`: UK/US spelling equivalence, digit↔word numbers, `(the) library` optionals, `taxi/cab` alternates, word-limit enforcement (hyphenated = 1 word), strict singular/plural, order-insensitive multi-select, list_selection = 1 mark per correct letter.

## Route map

- **Teacher** `app/teacher/ielts/`: hub (+ cross-group grading-queue banner); `reviews/` (cross-group W/S grading queue — reuses the group Reviews tab with `groupTitles`); `review/[attemptId]` (attempt drill-down: R/L per-question student-vs-accepted table, W/S submission + grade — linked from the roster history modal and the analytics missed-by chips); `reading/*` + `listening/*` (list/builder/edit; `view/[id]` on BOTH skills is the shared read-only `_shared/TestPreview.tsx` — the old broken simulator + 903-line `question_renderer` are deleted); `writing/`, `speaking/`; `groups/[groupId]` (Pulse/Assignments/Reviews/Students/Requests; AssignTestModal remembers last-used settings in localStorage `ielts_assign_defaults` and supports reassign-prefill; Reviews grading has TA/CC/LR/GRA sub-scores that auto-average + "AI draft" pre-fill; assignment analytics bars are clickable → students who missed that question; roster cards open an attempt-history modal). Teacher user-name lookups go through `services/userLookup.ts` `fetchUsersLite` (batched `documentId() in` + module cache).
- **Student** `app/(student)/ielts/`: hub — **three URL-addressable tabs** (2026-07-31), `page.tsx` holds only the group snapshot + attempts fetch and the tab shell, each tab is a component in `_components/` (`GroupsTab`, `PracticeTab`, `ProgressTab`; copy in `_components/hubTexts.ts`, `attemptBand` in `_components/hubData.ts`). URL contract: `?tab=groups|practice|progress` — no `?tab=` falls back to `practice` when `?skill=` is present or the student has no groups, else `groups`; tab clicks `router.replace` (deep-linkable, no history spam) and leaving the library drops `skill`/`type` from the URL. `useSearchParams` ⇒ the page is wrapped in a `Suspense` boundary (it must stay static-prerenderable). **Groups** = group cards only (still no `joinCode`) + the join banner; **Practice** = the Practice Library **from `ielts_test_meta` summaries**, skill chips write `?skill=`, the group page's `?skill=&type=` weak-type deep link lands here and shows a clearable filter row; **Progress** = the old "IELTS journey" card, now a tab (overall/attempts/graded stat tiles + cross-attempt band sparkline + per-skill latest/best/count, `overallBand` estimate). `[groupId]` (assignments, my progress, weak types — each weak type links to the filtered Practice Library); `[groupId]/test/[assignmentId]` + `practice/[skill]/[testId]` (runner, chrome-suppressed); `review/[attemptId]` (error-code-driven denied state; W/S practice shows an honest "self-practice" chip instead of a never-resolving "not graded"; writing shows teacher criteria + the AI feedback section).
- **Admin** `app/admin/ielts/`: platform dataset — builders (reused with `asPlatform`), promote teacher tests, **JSON import for all four skills** validated by `lib/ielts/importValidation.ts` `validateIeltsImport` before write (R/L → `saveIeltsTest`, W/S → `saveWriting|SpeakingTest`, all `{asPlatform:true}`), and the **platform catalog** (order + per-audience visibility, below). The importer reports `{path, label, message, hint}` issues — **errors block the write, warnings never do**. Authoring specs + ready-made papers live in [`data/ielts practise/`](../data/ielts%20practise/README.md) (authoring source only — nothing reads the folder at runtime): `STRUCTURE-{READING,LISTENING,WRITING,SPEAKING}.md` + `STRUCTURE-QUESTION-TYPES.md` are the per-module JSON specs (hand them to an LLM to generate a paper; `LLM-PROMPT.md` has the briefs), and `npm run ielts:verify -- <file|dir>` runs **the identical validator** from the CLI (`--strict` also fails on warnings). Listening media: `audio_url`/`diagram_url` may be an absolute http(s) URL **or a same-site path** (`/ielts/listening/<test_id>/part1.mp3`, served from `public/` — `isMediaUrl` in `lib/ielts/importValidation.ts`; `//host` is rejected). The C18 papers use the `public/` route (≈110 MB committed). CLI import (same result as the admin paste box, Admin SDK): `npm run ielts:import -- <file|dir> [--apply]` (`scripts/ieltsImport.ts` — runs `validateIeltsImport`, then the `saveIeltsTest` batch: test + key + meta, keeps `createdAt` + catalog fields; **keep it in step with `saveIeltsTest`**). The 4 C18 listening papers were imported this way on 2026-11-13. Optional Storage route: `npm run ielts:media -- <paper.json> [--apply]` (`scripts/ieltsMedia.mjs`) uploads `listening/media/<test_id>/…` and replaces `"TODO"` URLs.
- **Manager** (center-managed groups, 2026-07-29): created from the Groups page (`CreateGroupModal` group-type toggle + target band → the pair API); groups list + detail header show an IELTS badge instead of the join code; detail page gains an **IELTS tab** (`IeltsOverviewTab` — overview API, read-only); Settings syncs title/desc/teacher/**targetBand** to the twin in one batch and has an IELTS-only danger-zone delete (pair API). Roster writes (RosterTab remove, AddStudentModal, students/create with classId, remove-from-center, account deletion) all mirror `ielts_groups.studentIds`.
- **Managed-group behavior in the teacher/student trees**: teacher group page hides Requests + Add-student, roster is view-only, header shows a center chip (name from `centers`, read `isAuth()`) instead of the join code — content control (assign/grade/analytics) is unchanged. It also gains a **Davomat (Attendance) tab** (managed groups only): the shared `AttendanceGrid` over the linked class (live class onSnapshot feeds schedule/roster; `recordedBy` = teacher uid — same `center_attendance` docs as the manager grid). The twin class is therefore **hidden from `/teacher/classes`** (filter on `ieltsGroupId`) — the IELTS group page is the teacher's ONE home for these groups. Student: the linked class is hidden from `/classes` and the `/center` hub links it to `/ielts/{groupId}`; the dashboard gains a "today's lessons" widget (`TodayScheduleCard`, all scheduled center classes incl. IELTS, Tashkent day keys). The group page is **tabbed like an ordinary class page** (2026-07-29) — Mocklar (assignments) · Natijalar (band trajectory + weak types) · **Jadval** · **Davomat**, the last two only for center groups; a center-name card sits above the tabs. `_components/ScheduleTab.tsx` renders the weekly board (Monday-first, today highlighted, room chips) plus a "next lesson" hero from the linked class `schedule`; the attendance tab reuses `components/attendance/StudentAttendanceView` (the same view the class page uses) with the linked `classId`.

## Invariants & traps

- **Never re-embed `correct_answer` in public test docs.** Save must go through `saveIeltsTest` (renumber → extract key → strip → batch write test+key, preserving `createdAt`).
- Legacy docs (pre-split, no `answers_split`) still contain answers; the student runner refuses them ("not ready") until the teacher re-saves. The grading route grades them via the inline fallback.
- Rules: `ielts_groups` read is member/teacher-provable for the two live list queries — don't add other client group queries (they'll be denied); go through the API instead.
- `ielts_attempts` client create is `false` by design. Don't "fix" a failing client write by opening rules — use the API.
- Join codes are now 6-char via `generateUniqueJoinCode` — keep the `I-` prefix (join API regex + student input depend on it).
- Timestamps: assignment `openAt`/`dueAt` are Firestore Timestamps; attempt `startedAt` comes from a client ms epoch → server Date. XP day keys go through `lib/xpDays.ts` inside `applyUserXp` — never re-derive.
- Storage rules are **console-managed** (no storage.rules in repo): paths `ielts_diagrams/`, `ielts_audio/`, `ielts_writing/`, `ielts_speaking/` must allow authenticated read/write.
- Load-bearing typo filename remains: `reading/manual/_components/passsage.tsx` (triple-s).
- **"Choose TWO letters" questions must be authored as `list_selection`**, not multi-answer
  `multiple_choice`: public docs carry no `correct_answer`, so the student renderer can only
  detect multi-select via the list_selection span (`end_question - start_question + 1`); a
  multi-answer `multiple_choice` renders single-select for students.
- The student runner is a `fixed inset-0` overlay (the student layout has no route-based chrome
  suppression) — review pages keep normal chrome. Runner details: fullscreen is requested only in
  **simulation on ≥768px** viewports; the submit dialog lists unanswered question numbers; reading
  highlights persist per passage in the session (`highlights` — serialized block innerHTML, spans
  carry `data-hl`, removal is event-delegated so restored marks stay clickable).
- **The marker (highlighter) lives in `_components/runner/highlight.ts` — never re-introduce
  `range.surroundContents()`.** It throws `InvalidStateError` on any selection that only partially
  contains an element, i.e. on nearly every real selection (passage blocks carry `<br>`/`<b>`, and
  students drag across paragraphs); the old runner swallowed that error, which is why the pen
  appeared dead. The replacement walks the text nodes the range touches and wraps each slice.
  Three invariants: (1) **snapshot every slice before mutating** — the Range is live, so splitting/
  re-parenting one node can move `endOffset` and the rest of the passage gets swallowed;
  (2) removal is decided by **real overlap** (`compareBoundaryPoints`, strict) and never by
  `intersectsNode`, or marking the word next to a yellow one erases it; (3) unwrapping must restore
  byte-identical original HTML — the session store round-trips that innerHTML.
- **The add/erase rule is asymmetric — do not "simplify" it to erase-on-overlap.** Erase only when
  every non-whitespace slice under the selection is already inside a mark; otherwise mark the parts
  that are not. Erase-on-any-overlap (the first cut) broke two everyday gestures: selecting a phrase
  that merely *starts* inside a mark deleted the mark and highlighted nothing, and **triple-click
  marked nothing at all** — the double-click inside it marks a word, then the paragraph selection
  overlapped that word and wiped it. Whitespace-only slices are excluded from the "all yellow" test
  so re-selecting a marked word (which usually grabs the neighbouring space) still erases.
- **The marker has no tool button and no eraser (2026-07-31).** `toggleHighlight` is the whole
  interaction: releasing a selection inside the passage marks it, selecting over yellow clears it.
  The runner calls it from ONE document-level `pointerup` (touch gets a 10 ms tick so the range has
  settled). Don't add click-to-remove back — with the marker always live, a stray click while
  reading would silently erase a mark. **Right-click is disabled for the whole sitting**, both
  modes: the native menu offers copy/translate on the passage and fights the marker.
- **Passage and question text must render at the same size.** Both panes take the same
  `fontSize`/`lineHeight` from the runner, so per-element sizes inside `StudentQuestionRenderer`
  have to stay `em`-relative and the body rows at `1em` (they were `0.95em`/`md:1em`, i.e. 5%
  smaller on phones). The passage body also dropped `font-serif` for the same reason — serif and
  sans at one px value do not read as the same size.
- **Anti-cheat (`tabSwitches`) ignores a `blur` while `document.hasFocus()` is still true.** On
  Android the native text-selection toolbar and the soft keyboard both blur the window without the
  student leaving, so plain `blur` counting made *selecting text* or *typing an answer* register as
  a tab switch — and in simulation it threw the full-screen "focus lost" blocker mid-passage. That
  hit reading AND listening (both panes have selectable text). `visibilitychange` stays the primary
  signal.
- Runner reading comfort (2026-07-31): **8 font steps** (`FONT_SIZES` 12→30px, A−/A+ in the header)
  and a **drag-to-resize passage/questions divider** (25–75%, double-click resets to 45, ←/→ nudge).
  Both are device-local `localStorage` prefs (`ielts:runner:font`, `ielts:runner:split`) restored in
  an effect **after mount** — never in a `useState` initializer, or the runner hydrates mismatched.
  The split is applied as the `--ielts-split` CSS var (`md:w-[var(--ielts-split)]`), so the panes
  stay class-driven and mobile keeps the Passage/Questions toggle untouched.
- **The two silent authoring failure modes** — a `list_selection` block consumes one question number
  **per correct letter** (so every later block shifts), and gap tokens in `summary_text`/`rows`/`steps`
  are **positional** (so a token-count ≠ answer-row-count block misaligns every answer in it) — are
  now caught by `lib/ielts/importValidation.ts`, which the admin importer AND `npm run ielts:verify`
  both run. Keep them as ONE implementation: if you add a check, add it there, never in a page.
- **Platform catalog (2026-07-31)** — `catalogOrder` / `hiddenFromStudents` / `hiddenFromTeachers`
  are written by the admin panel onto **both** the test doc and its `ielts_test_meta` doc
  (`setPlatformTestVisibility`, `savePlatformTestOrder`), because the teacher lists read full docs
  while the student library reads metas. Three rules: (1) `saveIeltsTest`/`saveWSTest` must carry the
  fields across a re-save (`carryCatalog`) — an edit must not reset the admin's order; (2) readers
  pass `audience: 'student' | 'teacher' | 'all'` to `fetchPlatformTests`/`fetchPlatformTestSummaries`
  and must NOT re-sort the result (it already arrives in `compareCatalog` order; missing
  `catalogOrder` sorts last); (3) filtering is client-side on purpose — a `where('hiddenFromStudents','!=',true)`
  query would drop every legacy doc that has no such field. Hiding affects the **browsable lists
  only**: an already-assigned test and existing attempts keep working.
- **Listening runner (2026-11-13).** Simulation: the question pane **follows the recording** —
  `activeGroupIdx` is set to the new part on part-end, start and session restore (event-driven,
  not an effect). The overall timer **does not auto-submit while audio is playing**
  (`audioStillPlaying` excludes it from `autoSubmits`; a stalled "Resume audio" state does not
  count as playing) — real Cambridge recordings with their reading pauses can outrun the nominal
  `total_time_minutes`, and the paper must end at audio-end + the 2-min check window, never
  mid-Part 4. Practice: the player's part (`practiceAudioIdx`) is **separate from the viewed
  part** — clicking another part to read ahead no longer remounts/kills the audio (an idle player
  follows the tab; a playing one shows "Now playing: Part N" + "Play this part's audio"), with
  −5s/+5s and 0.75–1.25× speed. All tab clicks go through `selectGroup`, not `setActiveGroupIdx`.
- **Line breaks in gap text are content.** `summary_text`, table cells and flowchart steps are rendered
  `whitespace-pre-wrap` in the student renderer (teacher `TestPreview` already did): note/form
  summaries (all C18 reading notes, listening Parts 1 & 4) are authored as `\n` lines + `•`/`–`
  bullets and used to collapse into one paragraph. Don't re-add `text-justify`/drop pre-wrap.
- **Map/plan labelling** = `diagram_completion` + a letters-only word bank (`{id:"A",text:"A"}`…)
  + `question_text` on each row ("School"). The renderer lists labelled rows vertically and hides
  a bank whose every `text === id`.
- **Media URLs can be same-site paths** (`/ielts/…`). Web `<audio>`/`<img>` resolve them against
  the current origin; any non-browser client (Android) must prefix the site origin itself.
- ⚠️ **Known issue (not fixed): the listening `transcript` ships in the public test doc.**
  `stripAnswers` removes only `correct_answer`, so a student with devtools can read the script
  (and every `passage_reference`) mid-test, although the authoring spec says students never see
  it. Fix needs a decision: move transcripts into `ielts_answer_keys` and have `/api/ielts/review`
  return them (review page + teacher builder load + Android all change). Low stakes for published
  Cambridge papers, real for teacher-authored simulation assignments.
- Type labels come from **one source**: `lib/ielts/typeLabels.ts` (`IELTS_TYPE_LABELS` short,
  `IELTS_TYPE_LABELS_LONG`, `typeLabel`, `breakdownChips`). Do not re-declare per-page maps.
- Students must never see a group's `joinCode` (it would bypass the request/approve flow) — the
  hub group card deliberately omits it.
- On any test save keep the `ielts_test_meta` batch write in sync with the doc (title/counts/
  typeBreakdown); library pages trust it via the count-guarded `fetchPlatformTestSummaries`.
- **The student hub's tab is URL state, not React state** — the only writer is `setUrl` in
  `page.tsx` (`router.replace`). Don't add a `useState` mirror: the group page's weak-type link
  (`/ielts?skill=…&type=…`) and any shared link must keep landing on the right tab. Because
  `useSearchParams` is read there, the page must stay inside its `Suspense` boundary or the
  build drops `/ielts` from static prerendering.
- **Center-managed pair invariants**: managed groups are born ONLY in the manager panel (client create/update cannot stamp a `centerId`); every roster write must hit BOTH docs (`managedRosterBatch` client-side, batched Admin-SDK writes server-side) — a lone `classes.studentIds` edit desyncs the IELTS mirror; deleting the pair keeps `ielts_attempts` (history) and finance docs (append-only); reassigning the teacher in manager Settings transfers the IELTS group (assignments + pending grading) to the new center teacher.
- Android: student flows + shapes are mirrored — append to `ANDROID_STUDENT_IMPACT.md` (and `ANDROID_IMPACT.md` for shared contracts) on every change; shapes are additive-only.

## How to verify

`npm run dev` → teacher: author reading test (check `answers_split` + `ielts_answer_keys` + `ielts_test_meta` docs), author listening test with audio; preview both via `view/[id]`; create group; assign both (reassign button prefills, settings persist). Student: join by code (API), take the reading test on a phone-width viewport (tab toggle), submit → band + XP; review with Locate; hub: switch all three tabs and confirm the URL follows (`?tab=`), reload on `?tab=progress` (journey card, not groups), open the group page → weak type → "Practice" lands on the practice tab with the type filter chip, clear it and confirm `?type=` disappears; practice a platform test: drag a selection ACROSS a paragraph break and across a bold word (both must turn yellow with no tool button), drag over the yellow again to clear it, mark the word right after a mark (the first must survive), right-click anywhere (no menu), reload mid-test and confirm the marks come back, A−/A+ walks all 8 sizes and passage + question text stay the same size, drag the divider and reload (the ratio sticks); retake (0 XP, history kept). Writing: submit essay → "Get AI feedback" on review (practice) → teacher grades via queue (`/teacher/ielts/reviews`, AI draft + criteria) → student sees band + criteria. Teacher drill-down: roster → student → attempt → per-question table; analytics bar click → missed-by chips → same page. **Center flow**: manager → Groups → create with type IELTS (+ band) → group appears with badge, IELTS tab shows the overview; enroll a student (check BOTH `classes.studentIds` and `ielts_groups.studentIds` updated); set a schedule/room; teacher opens the group (center chip, no Requests tab, roster view-only) and assigns a test; student sees it under `/ielts` (not `/classes`), the group page shows center + timetable + attendance after the teacher marks a lesson, and the dashboard widget lists today's lesson; try `I-` join code on the managed group → CENTER_MANAGED error; delete via Settings danger zone → pair gone, attempts kept. **Admin dataset flow**: `npm run ielts:verify` (the two full papers must be clean; the all-types fixture warns about 1 passage / 24 Q / no `diagram_url` — expected) → `/admin/ielts` → each of the 4 tabs → **Import JSON**: paste a deliberately broken paper (two letters in a `multiple_choice`, a gap-token/row mismatch) and check the errors name the path *and* the human location and that **Import** stays disabled; paste a good one → import → it appears in the catalog. Then reorder with ↑/↓ → **Save order** → confirm the same order in `/teacher/ielts/reading` (Platform tab), the assign-test picker, and the student Practice Library; toggle the **students** eye → the test vanishes from the student library but an already-assigned copy still opens; toggle the **teachers** eye → it vanishes from both teacher lists; re-save that test in the builder and confirm order/visibility survive. Rules: `npm run test:rules` (167 tests incl. `ieltsMeta` + `ieltsCenter`), deploy: `npx firebase-tools deploy --only firestore:rules,firestore:indexes`.

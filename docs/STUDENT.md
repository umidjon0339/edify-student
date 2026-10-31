# STUDENT — Dashboard, Classes, Gamification, Games, Library

> **Agent workflow:** read this BEFORE touching `app/(student)/*`, XP/streak/leaderboard logic, `services/quizService.ts`, `services/historyService.ts`, or `lib/social.ts`. Update this doc in the same change whenever you alter behavior described here. Index: [README.md](README.md).

**Last verified:** 2026-07-30 (**2 maths papers a day / 12-hour cooldown**; the dashboard's hero is now a **rotating announcement card** driven by `lib/announcements.ts`, and `MmsCard` moved to `/raschmodel`; `MilliyCard` replaces `MathLevelSummary` there, because the mobile dock has no slot for the programme; Milliy sertifikat is the only nav entry, maths inside it; full-screen exam lockdown; Milliy sertifikat subject papers + the single code box); 2026-07-28 (teacher-built Rasch papers, the shared exam runner, and the one level component).

🟢 **My Mistakes (2026-09-16)** — a new student page at `/mistakes` (nav entry beside SAT) banking every question the student got wrong or left blank in a SAT, Milliy sertifikat or Rasch sitting, with a "practise 5 similar" lookup per row. Capture hangs off those three runners' submit paths (fire-and-forget, after the result write). Full contract: [MISTAKES.md](MISTAKES.md).

## Purpose & scope

The student route tree `app/(student)/` (route group, no URL segment): dashboard, classes (assignments + exams), explore, games, history, leaderboard, library, notifications, profile, settings, IELTS (see [IELTS.md](IELTS.md)). All pages consume `useStudentLanguage()` from the layout (uz/en/ru).

> 🎨 **Styling lives in [STUDENT_UI.md](STUDENT_UI.md), not here.** The whole tree runs on the student design system — pages use `@/components/student-ui` (never the teacher `@/components/ui`) and carry zero raw colors, so the app re-skins by editing one word in [`design.config.ts`](../design.config.ts). This doc covers logic and data only.

## ⚠️ Headline facts that contradict old assumptions

1. **The syllabus API routes (`/api/structure`, `/api/syllabus`) and `quizService.fetchQuestions` are consumed ONLY by the teacher app.** Inside classes, students only take teacher-authored tests. Self-practice exists exactly once, in the Rasch hub (`/raschmodel/exam` + `/practice`), and it reaches `questions1` through **`lib/Examquestions.ts`**, never through those routes — the tree it browses is the bundled `data/syllabus.json` (see the Rasch hub section below).
2. **`services/historyService.ts` is entirely dead** (`saveAttempt`, `getUserHistory`, `fetchReviewQuestions`, the `questionPath` review mechanism — zero consumers). The "legacy practice attempt shape" exists in code but nothing writes or reads it.
3. **`services/userService.ts::updateUserStats` is dead** (zero consumers) — and with it the `users.progress` field. All live XP/streak writing flows through **`lib/xp.ts`** (`applyUserXp` + `mirrorLeaderboards`), called from the two writers below inside their own transactions.
4. `profile/_components/EditProfileModal.tsx` and the typing game were **deleted 2026-07-20** (both were dead: unimported / unlinked).

## Classes

- **Join by code**: `JoinClassModal` — `classes where joinCode==` (6-char uppercased) → `addDoc(classes/{id}/requests, {studentId, studentName, studentUsername, photoURL, createdAt})`. 🟢 **Center groups (`centerId != ''`) refuse the code** — the modal shows a "managed by the center" toast and the rules also deny the request create; only the manager enrolls ([MANAGER.md](MANAGER.md)). **The class page also hides/guards "Leave Class" for center groups** (self-leave would orphan `center_students` + finance docs); self-leave stays possible for ordinary classes and rules-wise for the deletion flow. ⚠️ The explore page uses a **different** request write: `setDoc(.../requests/{uid}, {..., status:'pending'})` (deterministic ID + `status` field) — it now pre-checks BOTH pending shapes, blocks center groups with a toast, and reports errors via toast. Teacher approval code must tolerate both shapes.
- Class list: `classes where studentIds array-contains uid`. Leave = `arrayRemove` self.
- **Assignments** (`AssignmentsTab`): reads `classes/{id}/assignments` (SWR `getDocs`, paged 10), client-filters `assignedTo`. `allowedAttempts ?? 1`; `0` = unlimited. Open/expired computed from the **device clock** (known weakness). New assignments carry denormalized `duration` (null = no limit) + `resultsVisibility` copied from the test by `AssignTestModal`; the card renders the time-limit chip only when the field exists (legacy docs have neither) and the "proctored" shield keys on `duration > 0 || resultsVisibility === 'never'`.
- **Center groups** additionally get: an **Attendance tab** (`AttendanceTab` — `center_attendance where classId== + date range`, aggregated via `services/attendanceService.ts`; rules already allow the list), the **weekly `schedule[]`** (day 0=Sun / time / `roomName`) + a **center badge** (resolved `centers.name`) in the info modal, the **teacher's contact** (via `POST /api/directory/contact`, student-of-teacher relationship), and a link to **`/center`** — the "My Center" hub (see below).
- **Exams** (`ExamsTab`): live `onSnapshot` (inconsistent with assignments' SWR — intentional as-is).

### The two test runners (do not confuse)

| | Assignment runner | Exam runner |
|---|---|---|
| Route | `classes/[classId]/test/[assignmentId]/` | `student/exam/[examId]/` (`?classId=` param) |
| Template | `custom_tests/{testId}` | `bsb_chsb_tests/{testId}` |
| Attempt doc ID | `${uid}_${assignmentId}` (merge upsert — retakes overwrite; `attemptsTaken: increment`). The runner's attempt-limit guard reads THIS doc's `attemptsTaken` (never count docs — there is only ever one) | `${uid}_${examId}` |
| Attempt shape | `{userId, userName, classId, assignmentId, type:'assignment', testId, testTitle, score, totalQuestions, answers:{qId:letter}, tabSwitches, submittedAt, attemptsTaken, xpEarned}` | `{userId, userName, classId, assignmentId: examId, type:'exam', testId, answers, autoScore, teacherScore:0, totalPoints, tabSwitches, submittedAt}` |
| Grading | client-side `isAnswerCorrect(q, answers[q.id])` ⚠️ (lib/questionSchema.ts — answers may be a letter, a letter[] for `multiple_select`, or typed text for `open`/`numeric`; see [QUESTIONS.md](QUESTIONS.md)) | auto by type (mcq/TF exact, short_answer lowercase-trim, matching proportional); open_ended → teacher (`manualScores`, `status:'graded'`). 🟢 **Auto-release**: an exam with NO `open_ended` questions is published at submit time in the teacher-save shape (`manualScores` per-question, `teacherScore`=auto total, `autoScore:0`, `status:'graded'`) — a later teacher re-grade simply overwrites |
| XP | yes (see below) | **none** |
| Anti-cheat | visibilitychange + blur/focus, blocking modal, fullscreen, no contextmenu; any switch kills bonuses | visibilitychange toast + counter only (weaker) |
| Completion marker | `assignments.completedBy: arrayUnion` | `exams.submittedStudentIds: arrayUnion` |

⚠️ **Exam attempts overload `assignmentId` with the examId** and set `type:'exam'` — every `attempts` query must branch on `type` (the History page now does: exams score `(autoScore+teacherScore)/totalPoints`, show "under review" until graded, and route to `/student/exam/{id}/review?classId=`). Results visibility: `resultsVisibility ('always'|'after_due'|'never')` OR legacy `showResults` bool — **`after_due` with a null `dueAt` now HOLDS results** (runner + results page; it used to reveal immediately) and `AssignTestModal` refuses to save an `after_due` assignment without a deadline. Exam review requires `status==='graded'` AND `!exam.hideResults`.

**Runner data-safety invariants (2026-07-20):** the countdown is clamped to `min(duration, dueAt)` at start AND on session restore (rules reject post-`dueAt` writes, so working past it only lost the attempt); `localStorage` session is cleared **only after** the submit transaction commits (a failed submit keeps the answers recoverable); a `permission-denied` on submit surfaces the deadline toast, not a generic failure.

## Gamification (XP / streak / levels)

**XP has exactly two writers** (assignment submit, checkers) and **one engine**: both run their own `runTransaction` but MUST route the user-doc mutation through `lib/xp.ts::applyUserXp` and the leaderboard writes through `mirrorLeaderboards` **inside that same transaction** — user doc and leaderboards commit atomically (the old separate batch could fail after the transaction and desync `totalXP` vs leaderboard `xp` forever).

1. **Assignment submit** (`test/[assignmentId]/page.tsx`): base XP per correct answer by `difficulty` string (see `XP_BY_DIFFICULTY`). First clean attempt (no tab switches): Perfectionist +5 (>80%), Speed Demon +5 (>80% and under half the time limit). Retake: +5 only if >60%, >5 questions, <2 switches. ≥10 previous attempts → 0 XP. `recentActivity` last 5.
2. **Checkers** (`games/checkers/page.tsx`): wins only — `XP_REWARDS` by mode/difficulty, **losses and draws pay 0**; capped by `GAMES_DAILY_XP_CAP` (60/UTC-day, tracked in `users.gamesDaily {date, xp}`); an online game decided by forfeit with `< 10` moves pays 0 (collusion guard, `active_games.moveCount`). `recentActivity` last 10. Mirrors into **every class the student belongs to** (game XP used to be invisible on class leaderboards).

**The engine adds, for BOTH writers** (`lib/xp.ts`): streak advance + 7-day +30 / 30-day +200 bonuses, **daily-goal bonus** (+25 the first time a UTC day's XP crosses `users.dailyGoal`, once per day via `users.dailyGoalRewardedOn`), **level-up bonus** (+50 when `floor(totalXP/1000)+1` increases, plus a `levelup` notification via `notifyLevelUp`), the 30-entry `dailyHistory` trim, and the `recentActivity` slice.

Key traps:
- **Live writers use `lastActiveDate`; the `UserProfile` interface (and dead code) says `lastStudyDate`.** Trust `lastActiveDate`.
- **The stored streak/`lastActiveDate` only move on writes with XP > 0** — zero-XP submissions no longer keep a stored streak alive that the displayed streak (recomputed from `dailyHistory`) would show as broken, which also closes the old zero-XP-submit path to the 7/30-day bonuses.
- **Levels are derived, never stored**: `floor(totalXP/1000)+1` (the stored `level:1` from signup is dead).
- **Displayed streak is recomputed from `dailyHistory` keys**, never read from the stored `currentStreak` (which can differ).
- `dailyHistory` keys are **UTC** dates (`toISOString().slice(0,10)`) — in the writers AND now in every reader. [lib/xpDays.ts](../lib/xpDays.ts) (`xpDayKey`, `calculateStreak`, `last7Days`) is the single source of that convention; the student layout, dashboard, profile and the teacher student-detail page all import it. They each used to re-derive the key from **device-local** time, so east of UTC (Tashkent = UTC+5) every key between 00:00 and 05:00 local named a day the writers never wrote — today's XP read as 0 and the streak broke overnight. Don't reintroduce a local-time day key. `dailyHistory` is trimmed to the last 30 entries on write.
- `dailyGoal` (50/100/200/500, default 200) written from the dashboard modal.

### Leaderboards
- Global: `leaderboards/{periodId}/users/{uid}` `{uid, displayName, avatar, classId, xp: increment, lastActive}`, read `orderBy xp desc limit 20` (+ a "me" getDoc if outside top 20 → rank "20+").
- Period IDs (`getPeriodIds()`, all UTC): `day_YYYY_MM_DD`, `week_YYYY_WW`, `month_YYYY_MM`, `all_time`. 🟢 **ONE implementation in [lib/xpDays.ts](../lib/xpDays.ts)** — the leaderboard page, the XP engine and the account-deletion API all import it. Never re-derive the ISO-week formula locally.
- On XP>0 `mirrorLeaderboards` writes all 4 global period docs + per-class mirrors **in the same transaction as the user doc**: the assignment path mirrors its class, checkers mirrors every class the student is in.
- Two counters: `users.totalXP` vs leaderboard `xp` — mirrored only when XP>0 (zero-XP events touch neither, by design); with the mirrors now transactional the historic drift source is closed.

## Games / Library / History / Notifications / Social / Explore

- **Checkers** (`active_games/{4-digit code}`): realtime `onSnapshot`; `board` is a JSON **string**; host=red; the guest **joins in a transaction** asserting `status==='waiting' && guest==null` (closes the double-join hijack); `moveCount: increment(1)` per move. Exit is unified in `handleExitToMenu`: unstarted room → doc deleted, live game → counts as forfeit (`status:'forfeit'`), finished game → doc deleted best-effort (finished docs used to accumulate forever; tab-close still leaks a ghost room — known). Rules are STRICT Russian shashki, centralized in `_components/rules.ts` (flying kings; mandatory captures and full chain completion; captured pieces stay as dead "ghost" blockers until the chain ends; a king that can continue capturing from some landing square must land there; a man crowned mid-chain continues as king). The online doc field `mustJumpPiece` now stores the whole chain state `{pos, ghosts}` (JSON string, name kept for shape continuity); `winner` may also be `'draw'` (threefold repetition or 30 quiet king moves, detected by the mover). AI = `_components/engine.ts` (full-chain negamax, alpha-beta, iterative deepening, quiescence, transposition table) running in a Web Worker (`_components/aiWorker.ts`) — level 5 thinks ~2.6s and is effectively unbeatable; levels 1–4 inject scored near-best mistakes. Board has 3 switchable themes (wood/green/slate, `localStorage checkers_board_theme`) and synthesized WebAudio sounds (`_components/sounds.ts`, mute in `localStorage checkers_muted`). The typing game was deleted (dead).
- **Library** (2026-07-20): `app/(student)/library/page.tsx` is a **1:1 copy of `app/teacher/online-books/page.tsx`** (only the language hook and a direct `components/ui/theme.css` import differ — the M3 tokens otherwise load only via the teacher layout). Books come from the **local `data/library_books.json`**, filters/drawer/counters are all client-local; the page no longer reads or writes the Firestore `online_books` collection at all. When the teacher page changes, re-copy it. (The old Firestore-backed implementation with `viewscount`/`downloadscount` increments is gone from the student side; `online_books` + its lowercase-counter trap now only matter to whoever still writes that collection.)
- **History**: live `attempts where userId== orderBy submittedAt desc` (paged 5), relies on denormalized fields on the attempt (no N+1). Card click routes to the *assignment* results page — exam-type attempts route oddly (known).
- **Notifications**: `where userId== orderBy createdAt limit 50`, 60s SWR, optimistic batch mark-read/clear. Types are reconciled: the union (service + page, keep in sync) is `'assignment' | 'request' | 'levelup' | 'general'` — exactly the types with real emitters (`AssignTestModal`, follow in lib/social.ts, `lib/xp.ts::notifyLevelUp`) plus the default-icon catch-all. Class-join deliberately sends no notification.
- **Social** (`lib/social.ts`): `toggleFollowUser` + `removeFollower` are **transactions** that read the edge first and NO-OP when the stored state already matches (stale-UI double-follow / phantom-unfollow can no longer drift counters); counters are written as clamped computed values (never < 0, delta stays within the rules ±1 carve-out). The follow notification is sent AFTER the transaction (best-effort, so a retry can't duplicate it).
- **Explore**: top teachers `users where role=='teacher' orderBy totalStudents desc` (⚠️ `totalStudents` is Cloud-Function-generated, may be absent) + the divergent join-request shape noted above (now with center-group refusal, both-shape pending pre-check, and toast feedback).

## Account deletion & settings (2026-07-20)

- **Deletion is server-side**: `settings/page.tsx` reauthenticates, then `POST /api/account/delete` (Bearer token; Admin SDK). The route deletes attempts (students can't — teacher-only rule; the old client flow ABORTED for anyone with ≥1 attempt), notifications, class membership + per-class leaderboard rows + join requests (both shapes, via a `requests` collection-group query — `firestore.indexes.json` has the field override), the 4 current global leaderboard docs, the social graph **both directions with clamped counter decrements**, `private/*`/`bookmarks`/`test_stats`, RASCH docs, checkers rooms, `center_students` links + `center_student_credentials`, `usernames/{name}`, the user doc, the storage photo (best-effort) and finally the Auth user. **Finance docs are intentionally kept** (append-only money, FINANCE.md).
- **Center-managed accounts** (`users.accountType === 'center-managed'`): the password form is replaced with a "managed by your center" note — a self-change would desync the manager's stored recovery credential (`center_student_credentials`) and the synthetic email has no inbox for resets ([AUTH.md](AUTH.md)).

## "My Center" hub (`/center`) + center surfacing

- **Membership is `center_students`-derived, never class-derived** — `services/studentCenterService.ts::fetchMyCenters` queries `center_students where studentId == uid` (the rules explicitly allow own-reads) + resolves `centers.name`, 60s module cache. A student can belong to several centers or to a center with zero groups.
- **`/center`** (`app/(student)/center/page.tsx`) is the ONE center page. **Tabbed since 2026-07-29** — the same shape as the class and IELTS group pages: **Umumiy** (rate/groups/balance stat tiles + the groups list with schedule chips, linking to the class page or `/ielts/{gid}`) · **Jadval** (`_components/CenterScheduleTab.tsx` — merged Monday-first weekly board across ALL the student's groups in that center, "next lesson" hero, room chips, today highlighted; built on the shared `lib/weekSchedule.ts` helpers) · **Davomat** (last ~92 days across the center's groups via `center_attendance` classId+date queries + `tallyStudent`) · **To'lovlar** (balance/charges/payments from `GET /api/student/finance`; Admin-SDK route keyed strictly to the caller's own uid — finance rules stay manager-only, **never** query those collections from the client). The old `/payments` page was absorbed into this hub and deleted.
- **Several centers** → a segmented **switcher** above the tabs picks one and every tab follows it; a single-center student sees no switcher at all (they used to be stacked vertically). The active index is clamped, so a center disappearing mid-session can't index out of bounds.
- **Nav entry (2026-07-29)**: the layout adds a conditional **"Markazim"** destination — desktop sidebar *and* the mobile dock — gated on `fetchMyCenters(uid).length > 0`. M3 caps a bottom bar at 5 destinations, so for center students Markazim takes **Reyting**'s dock slot (`hideOnMobile: isCenterStudent`) and Leaderboard stays one tap away in the ☰ drawer. Non-center students see the unchanged 5.
- **Surfacing**: the dashboard shows a center banner (below the hero) and the profile identity card shows a center chip — both work with zero groups and link to `/center`; the class info modal's center badge links there too. Since 2026-07-29 the dashboard also has a **"today's lessons" widget** (`dashboard/_components/TodayScheduleCard.tsx`): all scheduled center classes (ordinary + IELTS) for the Tashkent-today weekday + a 7-day dot strip; hidden entirely for non-center students.
- **Center IELTS groups (2026-07-29)**: a class carrying `ieltsGroupId` is the twin of a center-managed `ielts_groups` doc — it is **hidden from `/classes`** (its student home is `/ielts/{ieltsGroupId}`), and the `/center` hub links it there with an IELTS chip. That page is tabbed like a class page (Mocks · Results · Schedule · Attendance) and reuses the shared `StudentAttendanceView`. See [IELTS.md](IELTS.md).

## Explore is hidden (2026-07-20)

`/explore` redirects to `/dashboard` and its nav item is removed; the implementation is preserved (not routable) in `app/(student)/explore/_disabled_page.tsx` — restore by moving it back over `page.tsx` and re-adding the layout nav item. The join-request guard notes above still describe that preserved code.

## Charts

Every recharts chart mounts inside [components/ChartFrame.tsx](../components/ChartFrame.tsx), which measures its own box and passes numeric `width`/`height` to the chart. **Do not go back to `<ResponsiveContainer width="100%" height="100%">`**: its default `initialDimension` is `-1 × -1`, so on the first pass of every mount it renders nothing and logs *"The width(-1) and height(-1) of chart should be greater than 0…"*. The frame also leaves the chart unmounted inside a zero-sized (hidden/collapsed) parent instead of warning. Give the frame its size via `className`; the chart takes `width`/`height` from the render prop.

## The dashboard's two "levels" (they measure different things)

- **Level** (the stat tile) is XP: `floor(totalXP/1000)+1` — how much the student has *done*.
- **Mathematics level** is Rasch ability θ mapped to **0–5** — how hard a problem the student can *solve* (1 simple, 2 easy, 3 medium, 4 hard, 5 olympiad; see [RASCH_SKILLS.md](RASCH_SKILLS.md#the-05-level-scale)). ⚠️ **Since 2026-07-30 it is NOT on the dashboard at all.** Both cards that showed it — `MathLevelSummary` and `MmsCard` — now live on **`/raschmodel`**, whose nav chip shows it too; the dashboard's two slots went to `MilliyCard` (the programme's door) and the announcement carousel (the platform's news). So the dashboard answers "what can I do", `/raschmodel` answers "how good am I at maths". Everything on that page reads `RASCH_levels/{uid}` through the same 12h localStorage cache in `services/RASCHProgressService.ts`, so all three surfaces cost **one** read and each renders `null` until it resolves.

## The dashboard's hero is a rotating announcement (2026-07-30)

`app/(student)/dashboard/_components/AnnouncementCarousel.tsx` is the ONE place the
platform tells students what is new, and **[lib/announcements.ts](../lib/announcements.ts)
is the only file to edit to say something.** It replaced `MmsCard` in that slot: a
hero welded to one feature had to be rewritten, re-reviewed and re-translated
every time something else shipped, so the maths paper, biology and chemistry are
now three entries in an array.

**It sits directly under the stat grid, ABOVE `MilliyCard`** — the news is what a
student should read first, and the programme's door is where they go afterwards.

- **Adding the next announcement** = one entry at the TOP of `ANNOUNCEMENTS`
  (array order is display order). Retire one with `until: 'YYYY-MM-DD'` instead of
  deleting it, or schedule one with `from:`; `activeAnnouncements()` filters the
  window on the client, never at module scope, so a tab left open overnight ages
  correctly. Every text field accepts a bare string (fills all three languages) or
  a `{uz, ru, en}` object — `say()` resolves it, falling back to Uzbek.
- ⚠️ **The window filter deliberately runs only after hydration** (a
  `useSyncExternalStore` flag, not a setState in an effect — the React Compiler
  forbids that). `/dashboard` is statically prerendered, so a clock read during
  render is a hydration mismatch waiting to happen; today the auth gate means no
  dashboard markup reaches that prerender at all, but don't "optimize" the guard
  away on the strength of that. Same reason `prefers-reduced-motion` and
  `document.visibilityState` are read through stores here.
- ⚠️ **Numbers the code owns are imported, never typed.** The maths entry's
  `45 / 150 / 100` come from `EXAM_TOTAL_QUESTIONS` / `EXAM_DURATION_MINUTES`
  ([lib/Examblueprint.ts](../lib/Examblueprint.ts)) and `PAPER_TOTAL`
  ([lib/RASCHmarks.ts](../lib/RASCHmarks.ts)) — the dashboard must not be able to
  advertise a paper this app does not serve.
- ⚠️ **The biology/chemistry entries deliberately advertise no question count.**
  For every subject except maths the length is the TEACHER's
  (`questionTarget` is not a national spec — [MILLIY_QUIZ.md](MILLIY_QUIZ.md)), so
  a number here would be wrong for most papers.
- **Zero Firestore reads** — bundled constant. That is what makes it acceptable to
  spend the dashboard's hero on news.
- **It is an endless marquee of compact cards (2026-11-01).** Every
  announcement is its OWN card (`.s-deck-card` in the student `theme.css`, ~17rem
  wide) in its own `tone` — a deep, mode-independent `[data-tone]` pair
  (`--s-deck-a/-b`, white text ≥ 4.5:1) + a bright `--s-deck-tint`. A card is
  Edify-minimal (2026-11-01): icon orb + badge · title · at most 2 `meta` facts
  on one plain line · ONE CTA (the `filled` one's `href`, else the first's) whose
  label is ALWAYS "Try yourself" (`UI.try` — "Sinab ko'ring" / "Попробуйте
  сами"), not the CTA's own `label`. `body` and any
  secondary CTA stay in `lib/announcements.ts` but are NOT shown here — don't
  re-add them. Hovering lifts a card and sweeps a sheen. `tone` and
  `short` are optional `Announcement` fields. White text on cards ⇒ opacity
  modifiers use plain palette colours (`bg-white/15`), never an M3 token.
- **Motion is pure CSS** (`.s-marquee`): the track renders the list TWICE and
  slides by exactly −50%, so the loop seam is invisible; spacing is per-card
  `pr-3`, never `gap` (a trailing gap would make the −50% land off by one gap).
  A copy shorter than 6 cards is repeated so a short list leaves no hole. Speed
  = 6s per card per loop. It **never stops on its own and stops under the
  cursor** (`:hover`) and while anything inside has focus (`:focus-within`);
  there is an explicit pause/play button (APG + touch screens have no hover).
- ⚠️ **The repeats are presentation only**: `aria-hidden` wrapper + their links
  `tabIndex=-1`, so a screen reader hears each card once and Tab visits each
  once. They are deliberately NOT `inert` — a mouse user must be able to click
  whichever copy is on screen.
- **`prefers-reduced-motion` (read through `useSyncExternalStore`) or
  `Motion_level: 'none'` renders no marquee** — one copy in a sideways-scrolling
  snap row. A single active announcement renders the same static row.
- The stage is `overflow-x-clip` (not `hidden`, which would clip the hover lift
  and shadow) with a mask fading its edges, plus two `.s-marquee-edge`
  backdrop-blur strips (masked to fade inward, inset to the cards' height — a
  full-height strip shows the frosted canvas as a faint box) so cards blur as
  they enter/leave. Two fixed blurs, never a per-card filter.

## `MilliyCard` — the dashboard's door to the programme (2026-07-30)

`app/(student)/dashboard/_components/MilliyCard.tsx` sits under the stat grid,
where `MathLevelSummary` used to be, and links to `/milliy-sertifikat` plus every
built subject directly (`Matematika` → `/raschmodel`, `Biologiya`/`Kimyo` →
`/milliy-sertifikat/{id}`; unbuilt subjects render as inert *soon* chips).

- ⚠️ **Why it is on the dashboard at all: the mobile dock cannot hold the nav
  entry.** M3 caps a bottom bar at 5 destinations, so `/milliy-sertifikat` is
  `hideOnMobile: true` in the student layout — on a phone the whole exam programme
  was reachable only through the ☰ drawer. This card is the phone's first-class
  route to it. Don't remove it without giving the programme a dock slot.
- **Zero Firestore reads** — the subject list is `MILLIY_SUBJECTS`, exactly like
  the hub. That is why replacing a data-driven card with it costs nothing.
- ⚠️ **Destinations come from `studentSubjectHref`**, never `MilliySubject.href`
  (that is the TEACHER's route for the same subject). See [MILLIY_QUIZ.md](MILLIY_QUIZ.md).
- The subject chips are siblings of the header link, not nested inside it — an
  `<a>` inside an `<a>` is invalid and React will warn.

## MMS — the Rasch hub's exam card (2026-07-29, moved 2026-07-30)

`MmsCard` (`app/(student)/raschmodel/components/MmsCard.tsx`) names the mock exam
the way a student actually knows it: **Matematika Milliy Sertifikat**, `45`
questions, `150` minutes (the card prints only these two since the 2026-10-31
Edify restyle; `100` points is the expected-score denominator). They are read from
`EXAM_TOTAL_QUESTIONS` / `EXAM_DURATION_MINUTES` ([lib/Examblueprint.ts](../lib/Examblueprint.ts))
and `PAPER_TOTAL` ([lib/RASCHmarks.ts](../lib/RASCHmarks.ts)), never typed into
the copy — the paper's shape must not be able to drift from what the app
advertises.

- ⚠️ **It sits on `/raschmodel`, under `MathLevelSummary` — not on the dashboard.**
  Built for the dashboard on 2026-07-29, moved on 2026-07-30 when that hero slot
  became the generic announcement carousel. On the hub it replaced a purely
  decorative "Imtihonga tayyorlaning!" gradient banner (whose `bannerTitle` /
  `bannerDesc` strings went with it). Since 2026-10-31 (Edify style) it is a
  `.s-glass` panel, not a `gradient` Card: the start CTA is an `.s-chip` pill, the
  code route a glass pill, and the locked state a `bg-disabled-bg` pill.
- **Why it exists.** Nothing named what the exam IS or let a student start one, so
  the feature the whole Rasch subsystem exists for sat behind a four-letter word
  (`RASCH`) that means nothing to a student. The dashboard's *announcement* now
  carries the invitation; this card carries the numbers.
- ⚠️ **Zero extra reads.** It calls `getRASCHLevels` — the SAME 12h
  localStorage-cached single document `MathLevelSummary`, the nav's level chip and
  `/progress` read — so three surfaces on one screen cost one read. That is the
  only reason it is allowed to be data-driven rather than a static banner.
- **What makes it useful, not decorative:** `expectedScore(θ)` — the score this
  student would be expected to get on the standard paper at their measured
  ability — plus their **weakest measured dimension**, linked straight to
  `/raschmodel/topic/{key}`. ⚠️ Unmeasured dimensions are excluded from that
  pick: a dimension the paper never asked about is not a weakness.
- **Two routes out**, both needed: `/raschmodel/exam` (the sampled paper) and
  `/raschmodel/quiz` (a teacher's paper, by code — previously reachable only from
  the Rasch sub-nav). ⚠️ **While the 2-a-day cap is closed the first one renders
  as a DISABLED button with the countdown and no `<Link>` at all** — a disabled
  `<Button>` inside an anchor still navigates, which is exactly how a "disabled"
  CTA lands a student on a screen that then refuses them.
- Before any sitting it degrades to an invitation ("your level is not measured
  yet"), and a failed level read degrades it the same way rather than hiding it.
- ⚠️ It spends the student kit's **one `gradient` hero card** for the screen. On
  that card the text is white, so opacity modifiers use plain palette colours
  (`border-white/20`), never `border-current/25` — `currentColor` cannot take a
  Tailwind opacity modifier, and neither can an M3 token (see the cross-cutting
  trap in CLAUDE.md).

## Two maths papers a day — the 12-hour cooldown (2026-07-30)

[lib/RASCHquota.ts](../lib/RASCHquota.ts) owns the rule, and it is **one** rule
expressed two ways: a **12-hour wait after each sitting**, which is exactly
`EXAMS_PER_DAY = 2` (24h / 12h — derived in the module, never typed twice). The
cooldown is the form that can be shown on screen; "0 of 2 left" cannot tell a
student when to come back.

**Why it exists:** the paper is a *measurement*, not a quiz. Unlimited sittings let
a student farm `RASCH_levels` — sit ten papers in an afternoon and grind the
ability estimate up on familiarity with the item pool rather than on maths (and
spend 45 question reads a go).

- ⚠️ **The timestamps come from the DATABASE, not the device.** `lastExamAt()`
  takes the max `at` from `RASCH_levels.exams[]`, written by `saveExamResult` — so
  clearing localStorage resets nothing. It is read through `getRASCHLevels`, which
  is 12h-cached and single-flighted and which `RaschNav`'s level chip on the same
  page already calls, so the cap costs **zero extra reads**. `saveExamResult` ends
  with `writeCache(next)`, so the cooldown is visible the instant a paper is
  submitted.
- ⚠️ **It is a deterrent, not a security boundary.** The comparison is client-side
  against `Date.now()`, so moving the device clock forward defeats it. Closing that
  needs the draw behind an Admin-SDK route — deliberately not done, and stated the
  same way the exam lockdown states its limits.
- ⚠️ **Everything unknown FAILS OPEN.** `lastAt === null` (no sittings yet, or the
  levels read threw) ⇒ allowed. A network blip must never lock a student out of an
  exam. A `lastAt` in the **future** is clamped to now, so a clock-skewed
  submission can't ban them for the length of the skew.
- ⚠️ **`exams[]` cannot distinguish a mock paper from a teacher's paper**
  (`ExamPoint` has no source field), so a teacher-code sitting also starts a
  cooldown. That is intended — both move the same ability estimate — but
  **`/raschmodel/quiz` itself is never blocked**: a teacher handing a code to a
  class must not be defeated by it. The gate is only on the self-serve draw.
- **Practice (`/raschmodel/practice`) is not capped.** A drill is not a
  measurement, and capping it would punish the exact behaviour the cap exists to
  encourage.
- ⚠️ **A paper already in flight is never blocked.** The check lives on the intro
  screen, which by construction only renders when there is no session; a restored
  paper goes straight to `in-progress`. Don't move the check into `ExamRunner`.
- ⚠️ `startExam()` re-checks the quota on entry. The button is disabled, but a
  stale render or a devtools click must not draw a paper the cap has closed.
- The intro's header row states the cap **before** it bites ("Kuniga 2 marta"); the
  countdown banner appears only when it does. Finding out about a limit only after
  it stops you reads as a fault.
- The exam page ticks `now` every second on the intro too (a countdown that only
  moves on navigation reads as frozen); `MmsCard` ticks every 30s, because a
  summary card does not need second accuracy.

## Teacher-built Rasch papers (`/raschmodel/quiz`)

A teacher can assemble their own 45-question Rasch paper and hand out a private
**6-digit code**; the student enters it at `/raschmodel/quiz` (nav item **Kod**),
sits it in the SAME runner as the mock exam, and the result both moves their
`RASCH_levels` and is reported back to the teacher
(`teacher_rasch_results/{quizId}_{uid}`). One Firestore read opens a whole paper —
the questions are embedded snapshots, not refs.

⚠️ The runner and the per-question review now live in
`raschmodel/_components/{ExamRunner,ExamReview}.tsx` and are shared by both pages;
`/raschmodel/exam` no longer renders its own. ⚠️ The two sittings use **separate**
localStorage stores, so starting a teacher paper never discards a mock exam that
is still running. Full contract, traps and the answer-key caveat:
**[RASCH_QUIZ.md](RASCH_QUIZ.md)**.

## Milliy sertifikat — the ONLY nav entry to the exam programme (2026-07-30)

⚠️ **`/raschmodel` is no longer a nav destination of its own.** It used to sit
beside "Milliy sertifikat", which read as two separate products; it is the **maths
section** of this one. The nav now has a single `Milliy sertifikat` entry
(`BadgeCheck`, hidden from the mobile dock — M3 caps a bottom bar at 5, which is
exactly why the dashboard carries `MilliyCard`), and:

- `/milliy-sertifikat` — the **subject hub**: cards only, **zero Firestore reads**
  (the list is `MILLIY_SUBJECTS`). Matematika → `/raschmodel`; every other built
  subject → `/milliy-sertifikat/[subject]`.
- `/milliy-sertifikat/[subject]` — one subject: its code box, the sitting, the
  result and the papers already sat for it. ⚠️ `genericSubject` refuses `math`
  here, because the maths section is the Rasch suite.
- ⚠️ **`studentSubjectHref()` owns this mapping**, not the pages —
  `MilliySubject.href` is the TEACHER's route and is a different one.

The code box still resolves ACROSS subjects, and `findPaperByCode` queries **both**
paper collections.

- ⚠️ **The two kinds are handled differently, and the caller MUST branch.** A
  **maths** code is handed to `/raschmodel/quiz?code=…` — only that page writes the
  `RASCH_levels` a maths sitting moves. A **subject** paper (biology…) is sat right
  here and scored on **raw counts only**: no θ, no 0–5 level, because there is no
  calibrated item difficulty or blueprint for those subjects.
- The `?code=` hand-off fires **once** and only when there is nothing to resume — a
  link must not pull a new paper on top of one still running against its clock.
- ⚠️ **A third localStorage store** (`milliy:quiz:v1`), so a biology paper, a maths
  paper and a mock exam can all be in flight without discarding each other.
  `createSessionStore` is written once and instantiated three times.
- Reuses `ExamRunner` and `ExamReview` unchanged (replay mode for papers sat
  earlier). Module-level 60s cache for the sat-papers list, **patched** on submit —
  a list missing the paper you just finished reads as data loss.
- One write on submit; the id is deterministic so a retake overwrites.

Full contract, the subject registry, and the answer-key caveat:
**[MILLIY_QUIZ.md](MILLIY_QUIZ.md)**.

## Exam lockdown — full screen + interruption warning (2026-07-30)

`ExamRunner` is a **`fixed inset-0 z-[100]` overlay**, not page content. Every
sitting — `/raschmodel/exam`, `/raschmodel/quiz`, `/milliy-sertifikat` — covers the
shell nav, the topbar and the mobile dock, so there is nothing in the app to
wander off to. ⚠️ **Callers must NOT wrap it in a `<Page>`**: it renders its own
shell, its own header (progress · exit counter · full-screen button · timer) and
the single scroll container.

The guard is [hooks/useExamLockdown.ts](../hooks/useExamLockdown.ts), called
**inside `ExamRunner`** rather than in the three pages, so no sitting can end up
with different rules. Read its header before changing anything — it documents what
a browser can and cannot enforce.

- ⚠️ **This DETECTS and DETERS; it cannot prevent a second tab.** `Ctrl`/`⌘`+`T`,
  a second window, the phone's app switcher and a second device are all outside
  any web page's reach. What is actually wired: `visibilitychange` + `blur`
  (tab/app switch), `fullscreenchange` (an `Esc` that drops full screen),
  `beforeunload` (reload / close / typed URL → the browser's own prompt), and
  `contextmenu` suppression (right-click → open in new tab). Don't describe it to
  users as proctoring.
- **Every interruption raises a blocking overlay** the student must acknowledge,
  and the running count sits in the header while the paper is being sat. The count
  is the deterrent — it says the exit was noticed.
- ⚠️ The overlay is **deliberately not a `<Dialog>`**: a dialog closes on its
  scrim or on `Escape`, and `Escape` is the very key that just dropped the student
  out of full screen. Only its button clears it.
- ⚠️ **One interruption fires several events** (a tab switch fires both
  `visibilitychange` and `blur`). An `away` ref latches so it counts once; coming
  back re-arms the latch but never clears the warning.
- ⚠️ **`requestFullscreen()` needs a live user gesture**, so it is NOT called on
  mount — mounting happens in a re-render after the click and Safari/Firefox
  reject it there. `requestExamFullscreen()` is exported for each page's Start
  handler to call synchronously, and the runner header shows a **Full screen**
  button whenever the document is not full screen (a genuine gesture, so it always
  works) — which is also the recovery path when the browser refused.
- Full screen is **released** when the runner unmounts, i.e. on submit. Leaving a
  student in full screen on a results page with no browser chrome traps them.
- `isFullscreen` is read with **`useSyncExternalStore`**, not mirrored into state
  from an effect: the browser owns that value and `Esc` changes it without asking
  React (and a synchronous setState in an effect body is a lint error with the
  React Compiler on).
- **Nothing is persisted.** The count is a view concern; `useExamLockdown` takes an
  optional `onInterruption(total)` if a result document should ever record it.
  ⚠️ Four older runners (`IeltsRunner`, `WritingRunner`, `SpeakingRunner`, the
  class-test runner) still carry their own copies of this logic and DO persist a
  `tabSwitches` count — they were left alone deliberately; migrating them to this
  hook is the obvious follow-up.

## The skill axis

Inside the seven dimensions sit **34 content-free skills** ([lib/RASCHskills.ts](../lib/RASCHskills.ts)) — what the student can *do*, as opposed to which content the item came from. Derived entirely from data already persisted (no Firestore change, no migration), 13 of them span more than one dimension, and the 45-question paper detects ~21 of 34 per sitting. Full contract, traps and the syllabus→skill map: **[RASCH_SKILLS.md](RASCH_SKILLS.md)**.

## The Rasch suite runs dense, and short (2026-07-28)

`app/(student)/raschmodel/layout.tsx` wraps the whole suite in `.s-dense`, which
re-declares the density custom properties for that subtree only (14px card
padding instead of 20, tighter gaps) — see [STUDENT_UI.md](STUDENT_UI.md). These
pages stack a heptagon, a skills panel, chapter levels, a forecast and a chart,
and at the app's comfortable density that is a wall of padding on a phone.

⚠️ **Keep the copy to one short line.** Every hint on these pages was a
paragraph explaining the Rasch model (what θ is, why a skill is content-free,
how the expected score is summed) and it read as noise on top of the numbers.
They are now single clauses. If you need to explain the model at length, the
place for it is the docs, not the student's screen — and don't restore the long
version "just for this one card", because it is exactly how the wall came back
last time. The heptagon is 280px on a phone, the chart 220px; the headline
numbers dropped one step each.

## The Rasch suite's shared navbar

`raschmodel/_components/RaschNav.tsx` is the ONE nav for every page under `/raschmodel`. Fixed order, everywhere: **Home → My level → Analysis → Practice → Code → Quick start** (the last is the filled CTA, pushed right with `ml-auto`).

- **The level chip lives here** (2026-07-28). `_components/LevelBadge.tsx::LevelChip` is pinned to the right of the bar, BEFORE the CTA, on every page of the suite — a ring gauge, the 0–5 number and the band name. It reads `getRASCHLevels`, which is 12h-cached and single-flighted, so a bar on six pages costs **0 reads warm** and one shared read cold. It renders `null` until the read resolves and whenever nothing is measured; a permanent empty pill reads as broken. ⚠️ The bar is now two explicit flex groups, not an `ml-auto` on the CTA — a lone `ml-auto` lands on whichever element carries it first, which put the chip to the RIGHT of the button.
- **Six items since 2026-07-28**: `Kod` (`/raschmodel/quiz`) sits between Practice and Quick start. It is a plain item, not the CTA — a student arrives holding a code somebody gave them, so it must be findable, but the paper they can always start alone stays the filled call to action.
- Each page used to roll its own row and they disagreed on both membership and order (progress had Home/Analysis/New test, diagnosis had My level/Home/Practice, practice had Analysis/Home). ⚠️ **Don't add a local nav row back to a Rasch page** — put the change in `RaschNav`.
- **Sticky, not static**: `sticky top-[var(--s-topbar-h)] z-20`. It parks under the shell's own app bar (z-40) and below the shell-C tab row (z-30) so it can never overlap either; the active shell is `shell_b`, so that tab row isn't rendered today. Translucency uses `bg-surface-blur` — a `bg-surface/85` would render **opaque** (M3 tokens are plain hex inside `var()`).
- **Phone = a mini bar (2026-07-28)**: below `sm` every item is a **32px icon-only chip** (`h-8 px-2`, 16px icon, label `hidden sm:inline` but kept as `aria-label`/`title`), and the level chip matches it (`h-8 px-2 sm:h-9 sm:px-3`). That is what makes all six destinations plus the readout fit a 360px screen. ⚠️ Don't put a label back on just the active item or the CTA — the Uzbek labels ("Bosh sahifa", "Tezkor test") blow the width immediately, which is how this overflowed in the first place. `overflow-x-auto` (`s-no-scrollbar`) stays as the safety net for a 320px screen; wrapping is still refused, because a bar that grows to two rows shifts the page down as you navigate.
- The current page is a **tonal chip**, not an outline, so position is readable without parsing labels. Matching is exact (`pathname === href`) — every route is a sibling of `/raschmodel`, so `startsWith` would light "Home" everywhere.
- ⚠️ **The exam page mounts it only at `intro` and `submitted`, never `in-progress`.** A running paper has its own sticky timer bar, and offering "Home / Practice" mid-sitting invites abandoning a paper that is already being graded against the clock.
- The hub's `PageHeader actions` row was removed as a duplicate of this bar, along with its `progress`/`diagnosis`/`practice`/`quickStart` strings.

## Known dead after the 2026-07-27 progress-page trim

The per-topic card grid on `/raschmodel/progress` (topic %, delta, "N/M solved correctly", "next ≈ X%", "Review →") was removed at the user's request. It was the only consumer of **`lib/RASCHforecast.ts::forecastByTopic`**, which is now dead (zero call sites; `forecastOverall` is still live). Kept rather than deleted — it works and per-topic forecasting is plausibly wanted again — but don't treat it as reachable code. `DeltaBadge`, the page's `solved_counts` rollup and the `solvedLabel`/`noneSolved`/`nextShort`/`review` strings went with the grid. ⚠️ `setSolvedUser` stayed: the per-skill review panels read the same localStorage archive and it must be scoped to the account.

## The Rasch hub's syllabus browser (`/raschmodel`)

`raschmodel/components/MathematicsCard.tsx` renders the **whole Algebra/Geometriya taxonomy — all three levels** (section → chapter → subtopic) from **`data/syllabus.json` via [lib/Mathstructure.ts](../lib/Mathstructure.ts)**. Bundled at build time, so the entire tree costs **zero Firestore reads** (it deliberately shows no question counts — those were 87 COUNT aggregations per cold cache for a number nobody acted on).

- ⚠️ **Two files hold the same taxonomy. The student side must use `syllabus.json`.** `data/question_topics.json` is the *slug*-keyed copy for `/teacher/create/question`; `syllabus.json` is *numeric*-keyed and its ids (`topicId` unpadded, `chapterId`/`subtopicId` zero-padded to 2 — `padId`) are the ones `questions1` is actually keyed by. Rendering the slug version on a student page would produce ids that match nothing.
- **Search** is apostrophe- and punctuation-insensitive (`norm()`): the syllabus mixes `o'`, `o’`, `oʻ` and `oʼ`, so `korsatkichli`, `ko'rsatkichli` and `koʻrsatkichli` must all hit. It matches chapter **and** subtopic names; a chapter whose own name matched keeps its full lesson list, a chapter matched only through its lessons shows just those. A live query force-opens every surviving section and chapter (collapsing mid-search would hide the results). Highlighting falls back to plain text when the hit exists only in normalized form — normalized offsets are not mapped back onto the original string.
- **A chapter row expands; it no longer navigates.** Practice moved to an explicit trailing button on the row (unchanged href).
- ⚠️ **That practice href's params are dead.** `MathematicsCard` links to `/raschmodel/practice?topicId=&chapterId=&lang=`, but `practice/page.tsx` never calls `useSearchParams` — it builds its set from `weakestSpots(diagnosticsFor(levels,'exam'))` regardless, and `buildPractice` (lib/Examquestions.ts) only filters to **chapter** granularity anyway (no subtopic support in `sample()`). So chapter- and subtopic-targeted drilling does not exist yet; the link lands on the generic weakest-spots intro. Subtopic rows are therefore rendered as a read-only lesson list, not as drill targets — don't make them clickable before the practice page honours the params.

## Caching convention

Student pages use module-level `globalXxxCache` objects (60s) + sometimes localStorage. **Any mutation must also patch the cache object** or the UI goes stale — the pattern is repeated in dashboard, classes, notifications, library, and tabs.

## How to verify changes

`npm run dev`; join a class with a second account, submit an assignment (check the `attempts/{uid}_{assignmentId}` doc, XP increment, leaderboard mirrors in the SAME snapshot), retake past `allowedAttempts` (must block via `attemptsTaken`), take a no-open-ended exam (result must show instantly), play a checkers round (win pays, loss pays 0), open a center group (attendance tab, schedule, payments link), and delete a throwaway account that has attempts (must succeed via the API). Watch for stale caches after mutations.

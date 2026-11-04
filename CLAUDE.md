# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## The doc-first workflow (MANDATORY)

This repo maintains verified per-domain docs in [docs/](docs/) so an agent can load exactly the context it needs. **The contract:**

1. **Before touching code**, look up your area in the routing table below (full table + doc template: [docs/README.md](docs/README.md)) and read that doc. For ANY Firestore read/write change, also read [docs/DATA_MODEL.md](docs/DATA_MODEL.md).
2. **Code** the change, respecting the doc's "Invariants & traps". Things marked dead/inconsistent are documented deliberately — don't "fix" them blindly; external writers/rules may depend on them.
3. **After the change, update the doc in the same commit** if you altered any behavior it describes (flows, fields, routes, rules, traps, dead code). New subsystem → new doc from the template in docs/README.md + a row in both routing tables.
4. If a doc contradicts the code, trust the code, then fix the doc.

| Touching… | Read first |
|---|---|
| Auth, signup/login, roles, layout guards, SSO, rules helpers | [docs/AUTH.md](docs/AUTH.md) |
| Any Firestore collection/field/index | [docs/DATA_MODEL.md](docs/DATA_MODEL.md) |
| Creating/storing/rendering/grading a **question** (v1 schema, normalizer, banks) | [docs/QUESTIONS.md](docs/QUESTIONS.md) |
| `app/(student)/*` — runners, XP/leaderboards, games, library, social | [docs/STUDENT.md](docs/STUDENT.md) |
| Rasch **skill axis** — `lib/RASCHskills.ts`, skills inside the heptagon, exam skill detection | [docs/RASCH_SKILLS.md](docs/RASCH_SKILLS.md) |
| **Teacher-built Rasch papers = the Milliy sertifikat maths paper** — `teacher_rasch_quizzes`, the 6-digit code, `/raschmodel/quiz`, the shared exam runner, `app/teacher/milliy-sertifikat/math/` | [docs/RASCH_QUIZ.md](docs/RASCH_QUIZ.md) |
| **Milliy sertifikat SUBJECT papers** (biology…) — `milliy_quizzes`, `app/teacher/milliy-sertifikat/*`, `app/(student)/milliy-sertifikat/*`, `MILLIY_SUBJECTS`, sample papers | [docs/MILLIY_QUIZ.md](docs/MILLIY_QUIZ.md) |
| **Dynamic marking** — `lib/RASCHmarks.ts`: guaranteed base per test type + a share of the difficulty budget from the cohort solve rate (`B = Y + σ`, always 100). Shared by every subject | [docs/MILLIY_QUIZ.md](docs/MILLIY_QUIZ.md) |
| **My Mistakes** — `student_mistakes`, `app/(student)/mistakes/*`, `lib/mistakes.ts`, the capture hook in ANY runner's submit | [docs/MISTAKES.md](docs/MISTAKES.md) |
| **SAT** — `sat_math_*`/`sat_english_*`, `app/teacher/sat/*`, `app/(student)/sat/*`, `lib/SatMathQuiz.ts`, `lib/SATscore.ts`, `SatRunner` | [docs/SAT_QUIZ.md](docs/SAT_QUIZ.md) |
| **Classroom games** — `app/teacher/games/*` (Arqon tortish, Savol doskasi, Omad g'ildiragi, Penalti seriyasi, Karvon yo'li), `services/teacherTestService.ts`, the TestCard quick-launch, **AI bilan yaratish** (`/api/teacher/games/questions`, `services/gameQuestionService.ts`) | [docs/GAMES.md](docs/GAMES.md) |
| **"My Mistakes"** — `student_mistakes`, `app/(student)/mistakes/*`, `lib/mistakes.ts`, `services/mistakeService.ts` | [docs/MISTAKES.md](docs/MISTAKES.md) |
| **Director/buxgalter back-office** — `center_staff`, `app/office/*`, `isCenterOffice()`, `requireCenterOffice()` | [docs/OFFICE.md](docs/OFFICE.md) |
| `app/teacher/*` — test creation, classes, grading, analytics, subscription | [docs/TEACHER.md](docs/TEACHER.md) |
| AI routes, credit limits, `lib/ai/*`, `/api/analyze`, TTS | [docs/AI.md](docs/AI.md) |
| `app/manager/*` core — approval gate, groups, teachers, enrollment, walk-in | [docs/MANAGER.md](docs/MANAGER.md) |
| Attendance (student + staff) | [docs/ATTENDANCE.md](docs/ATTENDANCE.md) |
| **Parent access by QR** — `parent_links`, `app/p/*`, `app/manager/parents/*`, `/api/parent/*`, `/api/manager/parent-links/*` | [docs/PARENTS.md](docs/PARENTS.md) |
| Rooms / timetable / schedule conflicts | [docs/ROOMS.md](docs/ROOMS.md) |
| Finance (charges, payments, payroll, expenses) | [docs/FINANCE.md](docs/FINANCE.md) + [docs/FINANCE_DATABASE.md](docs/FINANCE_DATABASE.md) |
| **Director / buxgalter back-office** — `center_staff`, `app/office/*`, `isCenterOffice`, `requireCenterOffice`, `/api/admin/centers/[id]/staff` | [docs/OFFICE.md](docs/OFFICE.md) |
| `app/admin/*`, `/api/admin/*`, god-mode | [docs/ADMIN.md](docs/ADMIN.md) |
| IELTS | [docs/IELTS.md](docs/IELTS.md) |
| **Teacher design system** — [design.teacher.config.ts](design.teacher.config.ts) switchboard, `components/ui/*`, M3 tokens, restyling `app/teacher/*` | [docs/UI_KIT.md](docs/UI_KIT.md) |
| **Student design system** — [design.config.ts](design.config.ts) switchboard, `components/student-ui/*`, restyling `app/(student)/*` | [docs/STUDENT_UI.md](docs/STUDENT_UI.md) |
| **Manager design system** — [design.manager.config.ts](design.manager.config.ts) switchboard, `components/manager-ui/*`, restyling `app/manager/*` | [docs/MANAGER_UI.md](docs/MANAGER_UI.md) |
| Android APK distribution — `public/app/*`, `/app` download page, version.json | [docs/APP_DISTRIBUTION.md](docs/APP_DISTRIBUTION.md) |

## Token discipline (read this, it saves the most)

- **Read docs by section, never whole.** Several docs are 50–60 KB. First `grep -n '^## ' docs/X.md`, then `Read` with `offset`/`limit` for only the sections you need (usually *Key files*, the relevant *Flow*, and always *Invariants & traps*).
- **Grep before Read** for code too: locate the symbol, then read only the surrounding range. Don't re-read a file you just edited.
- **Never open whole** `data/**/*.json` (syllabus trees), `questions.json`, `firestore.indexes.json`, `package-lock.json`, or `public/` assets. Query them with `grep`/`python3 -c` / `jq` instead.
- **Verify cheaply first:** `npx tsc --noEmit` and `npx eslint <changed files>` before a full `npm run build` or dev-server walkthrough.
- **Subagents only when the work is genuinely parallel or a broad search**; give them the exact doc sections and files to read so they don't re-explore.
- Keep replies short: report what changed and what was verified, not a retelling of the diff.

## Commands

```bash
npm run dev      # Start dev server (Next.js, http://localhost:3000)
npm run build    # Production build
npm run start    # Serve the production build
npm run lint     # ESLint (eslint-config-next: core-web-vitals + typescript)

npm run test:rules  # Firestore rules tests (emulator) — run after ANY rules edit
npx firebase-tools deploy --only firestore:rules,firestore:indexes   # after ANY rules/indexes edit
```

There is **no test suite for application code** — verify by running the dev server and exercising the flow (each doc ends with a concrete walkthrough). The ONE exception is `firestore.rules`: `npm run test:rules` runs `tests/rules/*.test.mjs` against the Firestore emulator (**167 tests**, all passing as of 2026-07-30). **Run it after any rules edit** — it is the only automated check in the repo. ⚠️ The script shells out to a bare `firebase`, and `firebase-tools` is **not** a dependency of this repo — on a machine without a global install `npm run test:rules` dies with `firebase: command not found`. Equivalent one-liner that always works: `npx --yes firebase-tools emulators:exec --only firestore --project demo-edify-rules "node --test tests/rules/*.test.mjs"`. ⚠️ Never run a bare `firebase deploy`: it will also try to deploy `functions/` (the Hikvision bridge, [docs/ATTENDANCE.md](docs/ATTENDANCE.md) §2.4) alongside rules/indexes — always scope with `--only`. Firebase project: `scanqr-64512`.

## Stack

Next.js 16 (App Router) · React 19 with the **React Compiler enabled** (`reactCompiler: true` in [next.config.ts](next.config.ts)) · TypeScript · Tailwind CSS 3 · Firebase (client + Admin SDK) · AI: Google Gemini, DeepSeek or Claude — provider + model chosen ONLY in [lib/ai/models.ts](lib/ai/models.ts), every call goes through [lib/ai/generate.ts](lib/ai/generate.ts) ([docs/AI.md](docs/AI.md)). Path alias `@/*` = repo root.

> [README.md](README.md) describes an early "MathMaster" app and is outdated; `membership_details/`, `lib/aouth.txt`, `lib/fireba.md`, and root scratch files (`all.md`, `xps.md`, `*.txt`) are stale planning notes — trust code + docs/ over all of them.

## Architecture in one screen

Multi-role SaaS ("Edify") with four role trees, each with a `'use client'` role-guarded layout:

- **`app/(student)/`** (no URL segment) — dashboard, classes (assignment/exam runners), games, leaderboard, library, IELTS.
- **`app/(public)/`** — landing, login, signup, pricing.
- **`app/teacher/`** — test creation (8 methods), library, classes, analytics, IELTS, subscription.
- **`app/manager/`** — learning-center management: groups, teachers, students, attendance, rooms/timetable, finance.
- **`app/admin/`** — super-admin: centers, teachers, students, classes, memberships.

**Two authorization mechanisms — never confuse them:** admin = Firebase custom claim `super_admin` (set out-of-band, god-mode rules wildcard); student/teacher/manager = `role` field on `users/{uid}`. Details: [docs/AUTH.md](docs/AUTH.md).

**Firebase:** [lib/firebase.ts](lib/firebase.ts) = client SDK (components/services); [lib/firebaseAdmin.ts](lib/firebaseAdmin.ts) = Admin SDK (**API routes/server only** — bypasses rules). [lib/AuthContext.tsx](lib/AuthContext.tsx) provides `useAuth()`. Server guards: `requireSuperAdmin` (`/api/admin/*`), `requireActiveCenterManager` (`/api/manager/*`).

**Data logic lives in [services/](services/)** (user, quiz, ielts, notification, attendance, room, finance, checkIn, centerAdmin) — add there, not inline in components. Firestore is the source of truth; the syllabus hierarchy is **local JSON** under `data/` served by `/api/structure` + `/api/syllabus` (Node runtime — they read the filesystem).

**Center membership is teacher-anchored:** a class belongs to a center iff its `teacherId` is in `center_teachers` — `classes.centerId` is NOT used for membership (only the admin cascade-delete uses it). See [docs/MANAGER.md](docs/MANAGER.md).

**Finance iron rules:** append-only money, snapshot prices, integer so'm, API-only writes via `/api/manager/finance/*` + [lib/server/financeOps.ts](lib/server/financeOps.ts), every client query filters `centerId ==`. See [docs/FINANCE.md](docs/FINANCE.md).

## Cross-cutting traps (the ones that bite regardless of domain)

- **Three UI kits exist — never mix them.** `@/components/ui` = teacher, `@/components/student-ui` = student, `@/components/manager-ui` = manager. Each tree re-skins entirely from its own root switchboard: student = [design.config.ts](design.config.ts) ([docs/STUDENT_UI.md](docs/STUDENT_UI.md)), teacher = [design.teacher.config.ts](design.teacher.config.ts) ([docs/UI_KIT.md](docs/UI_KIT.md)), manager = [design.manager.config.ts](design.manager.config.ts) ([docs/MANAGER_UI.md](docs/MANAGER_UI.md)).
- **M3 token colors are plain hex in `var()`, so Tailwind opacity modifiers silently render them opaque** (`bg-surface/85`). Use the prebuilt translucent tokens (`bg-surface-blur`, `bg-scrim-bg`, `bg-state-hover`…) or add a `color-mix()` var.
- **Never write `undefined` to Firestore** — build optional fields conditionally.
- **Timestamps are inconsistent by collection** (serverTimestamp vs ISO string vs `YYYY-MM-DD` key vs number) — check the writer before comparing/ordering. Table in [docs/DATA_MODEL.md](docs/DATA_MODEL.md).
- **`attempts` is polymorphic** — always branch on `type` ('assignment'|'exam'); exam docs overload `assignmentId` with the examId.
- **Rules `list` queries must not call `get()` per document** — use the split `get`(strict)/`list: if isAuth()` pattern (attendance) or a provable constant-path check (finance).
- Date keys for attendance/finance are Asia/Tashkent via [lib/dateUtils.ts](lib/dateUtils.ts); gamification/`ai_usage` use UTC — don't mix. XP day keys (`users.dailyHistory`) go through [lib/xpDays.ts](lib/xpDays.ts) on both sides; never re-derive one from device-local time.
- Charts go in [components/ChartFrame.tsx](components/ChartFrame.tsx), never `<ResponsiveContainer width="100%" height="100%">` (it mounts at `-1 × -1` and warns on every mount).
- `online_books` counters are lowercase `viewscount`/`downloadscount`.
- Join codes / access codes have **no uniqueness checks** anywhere.
- API routes using `fs`/native modules need `export const dynamic = 'force-dynamic'` (see `/api/tts`).
- Known-dead code is catalogued per doc ("Known issues / dead code") — e.g. `historyService`, `updateUserStats`, daily AI credits, `/api/stt`. Don't build on it; don't delete without a deliberate decision.

## Conventions

- Interactive pages/layouts are Client Components; Admin SDK strictly in API routes/server modules.
- Route-local UI in `_components/` folders. Icons: `lucide-react`. Toasts: `react-hot-toast`. Class merging: `clsx` + `tailwind-merge`. Math: `katex`/`mathlive` via [components/LatexRenderer.tsx](components/LatexRenderer.tsx).
- User-facing content is trilingual `{uz, ru, en}`; Uzbek is the default UI language. Teacher pages use inline `TRANSLATIONS` dicts + `useTeacherLanguage()`; student pages use `useStudentLanguage()`; manager pages use `useManagerLanguage()` (from `app/manager/_components/ManagerLanguage.tsx`).
- AI flows follow **check permission → generate → deduct actual count** with the monthly gatekeeper ([docs/AI.md](docs/AI.md)).
- Student pages use module-level 60s caches — mutations must patch the cache too.

## Android app sync (required — three apps, three ledgers)

Native Android ports under `/home/matimatik/AndroidStudioProjects/` mirror this repo 1:1. When a change touches an app's area, **any Firestore document shape/query, or `firestore.rules`**, append one line (date, files, what the app must mirror) to that app's ledger **in the same change**. Each repo's `/sync-web` consumes its ledger + the git diff.

| App (repo) | Mirrors | Also triggered by API contract | Ledger |
|---|---|---|---|
| `EdifyManager` | `app/manager/*` | `/api/manager\|directory\|auth` | [ANDROID_IMPACT.md](ANDROID_IMPACT.md) |
| `EdifyStudent` | `app/(student)/*`, `lib/xp\|xpDays\|questionSchema\|Exam*\|RASCH*\|Mathstructure\|social\|dateUtils`, student services, checkers | `/api/account\|student\|directory\|auth` | [ANDROID_STUDENT_IMPACT.md](ANDROID_STUDENT_IMPACT.md) |
| `EdifyTeacher` | `app/teacher/*` (+ `app/teacher/create/**/api`), `lib/questionSchema\|questionTopics\|RASCH*\|Milliy*\|Examblueprint\|Mathstructure\|ielts\|weekSchedule\|dateUtils`, teacher services | `/api/teacher\|ielts\|auth\|account\|directory\|analyze\|tts` | [ANDROID_TEACHER_IMPACT.md](ANDROID_TEACHER_IMPACT.md) |

A shared `lib/`/`services/` change usually needs a line in **more than one** ledger (e.g. `lib/RASCHmarks.ts` → student runner + teacher results). Keep Firestore shapes **additive-only** — APK rollouts lag web deploys, so old clients keep writing the old shape.

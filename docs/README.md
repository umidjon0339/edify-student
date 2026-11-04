# Edify Docs — Index & Routing Table

This directory is the **source of truth** for how Edify works. The workflow contract (from [CLAUDE.md](../CLAUDE.md)):

1. **Before coding**: find your area in the routing table below and read that doc (plus [DATA_MODEL.md](DATA_MODEL.md) for any Firestore change).
2. **Code** the change, respecting the doc's invariants & traps.
3. **After coding**: update the doc **in the same change** if you altered any behavior it describes (flows, fields, routes, rules, traps). Bump its "Last verified" date when you re-verify it.
4. If you discover the doc is wrong, fix the doc — a wrong doc is worse than no doc.

## Routing table — "touching X → read Y first"

| If you're touching… | Read first |
|---|---|
| Login, signup, roles, layout guards, SSO (`lib/sso.ts`), `firestore.rules` helpers, token verification | [AUTH.md](AUTH.md) |
| Any Firestore read/write, collection shapes, indexes, timestamps | [DATA_MODEL.md](DATA_MODEL.md) + the domain doc |
| **Anything that creates, stores, renders or grades a question** — `teacher_questions`, `questions1`, embedded `custom_tests.questions[]`, the v1 schema, the normalizer | [QUESTIONS.md](QUESTIONS.md) |
| Student app `app/(student)/*` — dashboard, classes, test/exam runners, XP/streak/leaderboards, games, library, notifications, social, explore | [STUDENT.md](STUDENT.md) |
| **Announcing something to students** — `lib/announcements.ts` (the dashboard's rotating hero) | [STUDENT.md](STUDENT.md) |
| **The skill axis** — `lib/RASCHskills.ts`, the syllabus→skill map, skills inside the heptagon, exam skill detection | [RASCH_SKILLS.md](RASCH_SKILLS.md) |
| **The Milliy sertifikat MATHS paper (a.k.a. the Rasch paper)** — `teacher_rasch_quizzes`/`teacher_rasch_results`, the 6-digit access code, `app/teacher/milliy-sertifikat/math/*`, `/raschmodel/quiz`, the shared `ExamRunner`/`ExamReview` | [RASCH_QUIZ.md](RASCH_QUIZ.md) |
| **Milliy sertifikat SUBJECT papers (biology, chemistry, physics, ona tili, English)** — `milliy_quizzes`/`milliy_quiz_results`, `app/teacher/milliy-sertifikat/*`, `app/(student)/milliy-sertifikat/*`, the subject registry, the cross-collection code lookup, the sample papers | [MILLIY_QUIZ.md](MILLIY_QUIZ.md) |
| **SAT (adaptive Math + English tests, Bluebook-style)** — `sat_math_tests`/`sat_math_results`, `sat_english_tests`/`sat_english_results`, `app/teacher/sat/*`, `app/(student)/sat/*`, `lib/SatMathQuiz.ts`, `lib/SATscore.ts`, the Module 1 → Module 2 routing, the shared `SatRunner`, the platform-owned English question bank | [SAT_QUIZ.md](SAT_QUIZ.md) |
| **What a question is WORTH** — `lib/RASCHmarks.ts`, the guaranteed base per test type + the cohort-priced difficulty bonus (`B = Y + σ`, summing to 100). Shared by EVERY subject | [MILLIY_QUIZ.md](MILLIY_QUIZ.md) + [RASCH_QUIZ.md](RASCH_QUIZ.md) |
| **"My Mistakes"** — the student's private bucket of wrong/blank questions + the "practise 5 similar" lookup: `student_mistakes`, `app/(student)/mistakes/*`, `lib/mistakes.ts`, `services/mistakeService.ts`, and the capture hook in the SAT / Milliy / Rasch submit paths | [MISTAKES.md](MISTAKES.md) |
| **Classroom games** — `app/teacher/games/*` (Arqon tortish / tug of war, Savol doskasi / question board, Omad g'ildiragi / lucky wheel, Penalti seriyasi / penalty shootout, Karvon yo'li / caravan race, the hub), `games/_lib/questionDeck.ts`, `services/teacherTestService.ts`, the tests-library gamepad quick-launch, AI questions in the game setup (`/api/teacher/games/questions`, `services/gameQuestionService.ts`) | [GAMES.md](GAMES.md) |
| Teacher app `app/teacher/*` — test creation, question banks, classes/assignments/exams/grading/materials, analytics, print, subscription | [TEACHER.md](TEACHER.md) |
| AI generation routes, credit/limit systems, `lib/ai/*`, `/api/analyze`, TTS | [AI.md](AI.md) |
| Manager app `app/manager/*` core — center lifecycle/approval, groups, teachers, student enrollment, walk-in check-in | [MANAGER.md](MANAGER.md) |
| Attendance (student + staff), `center_attendance`, `AttendanceGrid`, `checkInService` | [ATTENDANCE.md](ATTENDANCE.md) |
| **Parent access by QR** — `parent_links`, `app/p/*` (the account-free parent page), `app/manager/parents/*`, `/api/parent/{token}`, `/api/manager/parent-links/*`, `lib/server/parentReport.ts` | [PARENTS.md](PARENTS.md) |
| Rooms, timetable, schedule conflicts, `roomService` | [ROOMS.md](ROOMS.md) |
| Finance — charges/payments/payroll/expenses, `/api/manager/finance/*`, `financeOps`, `billingEngine` | [FINANCE.md](FINANCE.md) + [FINANCE_DATABASE.md](FINANCE_DATABASE.md) |
| **Director & buxgalter back-office** — the `center_staff` link doc, `app/office/*`, the `isCenterOffice()` rules helper, `requireCenterOffice()`, office access on the finance routes, `/api/admin/centers/[id]/staff` | [OFFICE.md](OFFICE.md) |
| Admin panel `app/admin/*`, `/api/admin/*`, super-admin claim, god-mode writes | [ADMIN.md](ADMIN.md) |
| IELTS (groups, reading tests) — student or teacher side | [IELTS.md](IELTS.md) |
| Teacher UI kit / design tokens — `components/ui/*`, `--m3-*` vars (`theme.css`), `tailwind.config.ts` token mapping, restyling `app/teacher/*` pages | [UI_KIT.md](UI_KIT.md) |
| Student design system — **`design.config.ts`** (the one-word switchboard), `components/student-ui/*`, M3 palettes, restyling `app/(student)/*` pages | [STUDENT_UI.md](STUDENT_UI.md) |
| Manager design system — **`design.manager.config.ts`** (the one-word switchboard), `components/manager-ui/*`, restyling `app/manager/*` pages | [MANAGER_UI.md](MANAGER_UI.md) |
| Android APK distribution — `public/app/version.json` + `edify-manager.apk`, `/app` download page, release/rollback procedure | [APP_DISTRIBUTION.md](APP_DISTRIBUTION.md) |

Historical (design rationale only, drifted — do not trust for current state): [ADMIN_CENTERS_PLAN.md](ADMIN_CENTERS_PLAN.md).

## Doc template (use for any new domain doc)

```markdown
# NAME — one-line scope

> **Agent workflow:** read this BEFORE touching <area>; update it in the same change
> whenever you alter behavior described here. Index: [README.md](README.md).

**Last verified:** YYYY-MM-DD (commit `<short-hash>`).

## Purpose & scope
## Key files            (table: file → responsibility)
## Flows                (how it actually works, with collection names and exact fields)
## Invariants & traps   (the things that cause bugs when violated — ⚠️ mark them)
## Known issues / dead code (verified DATE — don't "fix" blindly)
## How to verify changes (no test suite — concrete dev-server walkthrough)
```

Rules of style: document **verified behavior** (file:line-checkable), not intentions; mark dead/unwired code explicitly; prefer "⚠️ trap" callouts over prose; keep each doc under ~200 lines — split if it grows past that.

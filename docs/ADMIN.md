# ADMIN — Super-Admin Panel

> **Agent workflow:** read this BEFORE touching `app/admin/*`, `app/api/admin/*`, `services/centerAdminService.ts`, or `lib/server/verifySuperAdmin.ts`. Update this doc in the same change whenever you alter behavior described here. Index: [README.md](README.md).
>
> This doc supersedes the historical plan in [ADMIN_CENTERS_PLAN.md](ADMIN_CENTERS_PLAN.md) wherever they disagree.

**Last verified:** 2026-10-29 (the Question bank section); 2026-09-15 (the Office staff tab — [OFFICE.md](OFFICE.md); previously 2026-07-15).

## Auth

- Gate = Firebase custom claim `super_admin`. **Nothing in this repo sets it** (no `setCustomUserClaims` anywhere; no `functions/` dir) — provisioned out-of-band.
- Client: `app/admin/layout.tsx` — `getIdTokenResult(true)` → `claims.super_admin`, fail-closed to `/`.
- Server: `requireSuperAdmin(request)` (`lib/server/verifySuperAdmin.ts`) — Bearer → `verifyIdToken` → `decoded.super_admin === true`; 401/403 via `AdminAuthError`. **Every `/api/admin/*` route must call it first.**
- Rules: god-mode `match /{document=**} { allow read, write: if isSuperAdmin(); }` — this is what makes all the client-side admin writes below legal.
- Client fetch: `lib/adminApi.ts` `adminApiFetch` (Bearer attach, JSON error unwrap).

## The two write paths (deliberate split)

- **Client SDK via god-mode rules**: everything expressible as a plain Firestore doc write — all directory/detail reads (`centerAdminService.ts`), center `status` approve/suspend, center `name/slug/size/adminNotes` edits, `adminStatus` archive, `center_teachers` add/remove, manager `displayName/phone/isActive`, teacher/student `isActive`, membership/limits edits, class student removal, test/assignment deletes.
- **Admin-SDK API routes** (`requireSuperAdmin` + `adminDb`/`adminAuth`): anything needing Auth-user mutation, cascade, or link generation — `POST /api/admin/centers` (create center + Auth user + username), `POST /api/admin/centers/[id]/manager` (reset-password link, transfer-ownership), `DELETE /api/admin/centers/[id]` (cascade delete).
- **Cloud Functions NOT in this repo** (`httpsCallable`): `deleteAccountAPI` (teacher & student deletion), `deleteClassAPI`. External dependency — failures surface as auth-sounding errors.

## Sections

### Centers (`app/admin/centers/`)
- **Directory**: `fetchAllCenters()` reads `centers` + whole `center_teachers` + chunked `classes`/`users`; counts teachers/groups/unique students; pending-first sort. Status normalization: only `active`/`suspended` kept, anything else → `pending`. Inline approve/suspend = **client `updateDoc(centers,{status})`**.
- **Detail** (`fetchCenterDetailData`): tabs Overview / Teachers / Groups / Manager / Danger.
  - Overview: edit `name/slug/size/adminNotes` (slug regex `^[a-z0-9-]+$`); a **second copy** of the approve/suspend status write — keep both sites in sync. Subscription plan/validUntil shown read-only (nothing enforces it).
  - Teachers: add by email; if linked to another center → conflict banner with **"Move Anyway"** override (admin can steal across centers; the old center's manager gets no signal). Write `setDoc(center_teachers/{uid}, {...})`. Remove = `deleteDoc` (classes untouched).
  - Manager: client edits `displayName/phone/isActive`; API for reset-password + transfer-ownership.
  - Danger: archive (client `adminStatus:'archived'` — admin-only bookkeeping) and Delete (API, type-"DELETE" gate, three option checkboxes: groups / center-created teacher accounts / manager account — all default on).
- **Create** (`centers/new` → `POST /api/admin/centers`): validates (`USERNAME ^[a-zA-Z][a-zA-Z0-9_]{4,}$`, phone, `SLUG ^[a-z0-9]+(?:-[a-z0-9]+)*$`), `adminAuth.createUser`, Admin batch writing `centers` (**`status:'active'`** — unlike public signup's `pending`), `users` (manager), `usernames`. Rollback: `deleteUser` on batch failure.
- **Cascade delete** (`DELETE /api/admin/centers/[id]`), idempotent, center doc last (2026-07-15 full rewrite — covers EVERY center-owned store): attendance (`center_attendance` → `center_staff_attendance` → `center_attendance_summary`) → `face_enrollments` → `rooms` → `crm_leads` → **finance** (`center_student_finance`, `center_charges`, `center_payments`, `center_expenses`, `center_payouts`, `center_finance_settings/{id}`) → `classes` (**by `classes.centerId`**, the membership anchor; `deleteClasses:true` → `recursiveDelete` each incl. subcollections, else strip `centerId`) → **center-managed IELTS twins** (`ielts_groups where centerId==`, 2026-07-29 — without this they'd be orphaned AND unmanageable, since the rules lock the teacher out of managed-group docs; `deleteClasses:true` → recursiveDelete incl. assignments/requests [`ielts_attempts` kept], else strip `centerId`+`managed` so the group reverts to a personal teacher group) → **center-created teacher accounts** (`users where accountType=='center-managed' && centerId==` — classes-per-account follow `deleteClasses`; recursiveDelete of `users/{uid}` takes `private/contact`; + `usernames` + Auth user; **self-signup teachers never touched**) → `center_teacher_credentials` → `center_teachers` → `center_students` + `center_student_credentials` (2026-07-29 — roster links/passwords no longer linger; student ACCOUNTS are never deleted here) → optionally manager (same account teardown, personal classes untouched) → `centers`. Flags `{deleteManagerAccount, deleteClasses, deleteCreatedTeacherAccounts}` all default **true**; returns `deletedCounts` per bucket.
- **Transfer ownership**: target found by email; blocked if they own or teach at another center. `oldOwnerAction` ∈ `demote-teacher` | `demote-student` | `keep`. ⚠️ `demote-teacher` sets `role:'teacher'` but does **NOT** create a `center_teachers` link — the ex-owner ends up as a teacher with no center.

### Office staff (`app/admin/centers/[id]/_components/StaffTab.tsx`) — 2026-09-15
The center's **director** and **buxgalter** accounts ([OFFICE.md](OFFICE.md)) — a tab beside Manager.
⚠️ **Super-admin-only by design**: a director outranks the manager, so there is deliberately no
`/api/manager/...` twin and `center_staff` is `write: if false` for every client. All four operations
go through `/api/admin/centers/{id}/staff` (Admin SDK + `requireSuperAdmin`): GET list (with the
stored password), POST create (translit email/username from `lib/teacherProvision.ts`, Auth user +
one batch over `users`/`usernames`/`private/contact`/`center_staff`/`center_staff_credentials`, Auth
rolled back on batch failure), PATCH reset-password (Auth first, then the credential doc), DELETE
revoke (deleting the **link** is what closes access; `deleteAccount` defaults true and also takes the
username + user + Auth user). The synthetic email has **no inbox**, so the password is shown here —
the super admin is the only recovery path.
⚠️ **The cascade delete does NOT yet cover `center_staff`/`center_staff_credentials`** — see the
Invariants list below.

### Question bank (`app/admin/question-bank/`) — 2026-10-29
Adds and edits the abiturient Algebra + Geometriya bank **`questions1`** ([DATA_MODEL.md](DATA_MODEL.md)) — the bank behind `create/database`, Milliy exam slots 1–32 + the teacher top-up, the Rasch builder, the games "DTM bazasidan" source and the student app.
- **Contract = [lib/questions1Schema.ts](../lib/questions1Schema.ts)**, pure, shared by the page and the API: `coerceQuestion1` (lenient: JSON item / stored doc → draft + `fixes` + `errors` + `warnings`), `checkQuestion1` (strict), `questions1Content` (the stored content fields), `parseQuestions1Json` (a whole file). Location is **picked** from `data/syllabus.json` (`Q1_TREE` = `getMathTopics()`), never typed: `topicId` unpadded, `chapterId`/`subtopicId` padded, names copied from the syllabus. Required: question + 4 options in **uz, ru AND en**, `answer` A–D, difficulty 1/2/3. Explanation optional, but all-three-or-none. `solutions` stays the legacy single-language `[{final_answer, method, steps[]}]`.
- **Writes = `POST|PATCH /api/admin/questions1`** (Admin SDK, `requireSuperAdmin`) — never client god-mode, because the server must stamp what readers depend on: `rand` (no `rand` = invisible to the exam sampler), `uploadedAt` (every listing orders by it — written in the **same type as a sibling doc's**, since the external import's type is unknown in-repo), `number` (running count in the subtopic, type copied), `subjectId`/`subject` (copied from a sibling, fallback `'01'`/`'Matematika'`), `tags: []`, `language: ['uz','ru','en']`, plus additive `addedBy`/`source:'admin'`. Each item is re-validated server-side; ≤200 per request (one batch). **Duplicates** (same normalized UZ text in the same subtopic, incl. inside the request) are skipped unless `allowDuplicates`; `dryRun` reports them without writing (the import's Check step).
- **PATCH `{id, item}`** rewrites content + location (keeps `rand`, `uploadedAt`, `number`, calibration fields, and `solutions[1..]`). **PATCH `{id, benched}`** = delete `rand` (the [scripts/analyzeItems.ts](../scripts/analyzeItems.ts) quarantine) / restore with a new `rand` + clear `suspect`. There is deliberately **no delete** — attempts and mistakes may reference the id.
- **Bulk import** (`BulkImportDialog`): accepts an array, `{header…, questions:[…]}` (header topic/chapter/subtopic/difficulty apply to items without their own) or one object; the open subtopic is the last fallback. 🟢 **Free-form since 2026-10-31**: any other wrapper (`items`/`data`/`savollar`/nested — `findQuestionList`), `{passage, questions:[…]}` groups expanded, and per item the SHARED alias reader [lib/importAliases.ts](../lib/importAliases.ts) folds other field names onto this schema before coercion (`stem`/`savol`/`вопрос` → question, `variantlar`/`{text,isCorrect}[]` → options, `correct_index`/choice text/flagged choice → answer letter, `izoh`/`rationale` → explanation, `mavzu`/`bob`/`bolim`/`daraja` → location/difficulty) — each listed as a fix (`path: 'import'`). ⚠️ Its `solution` object, `topicId`/`chapterId`/`subtopicId` and `correct`/`correctAnswer` are excluded from aliasing (this schema reads them itself). Unknown-field warnings run AFTER aliasing. Deterministic auto-fixes, always listed: lone LaTeX backslashes / trailing commas / raw line breaks (raw-text repair, only if `JSON.parse` fails), backslashes eaten by valid JSON escapes (`\frac` → form-feed), bare LaTeX wrapped in `$…$` (`lib/ai/fixMath.ts`), `A)` prefixes + `1.` numbering, option arrays → A–D, answer letter / option-text → letter, difficulty words (oson/o'rta/qiyin…), chapter/subtopic names → ids, `UZ`/`rus` keys. A **missing translation is never invented** — only a language-neutral value (number/formula, `isLanguageNeutral`) is copied across. Everything else is reported per field with UZ/RU/EN chips; fix in the form ("Fix in form") or "Download fixed JSON", then import the ready ones.
- Listing reuses `lib/Mathquestion.getChapterQuestions` (subtopic × difficulty, 20/page) + 3 count reads per subtopic.

### Membership (`app/admin/membership/`)
Edits **teacher** users' `subscription.planId` + `currentLimits.{maxClasses,maxStudents,monthlyAiQuestions}` via client `updateDoc`. ⚠️ Overlaps with `admin/teachers/[id]/_components/MembershipTab.tsx`, which writes a **wider** field set (`subscription.{billingCycle,status,expiresAt}`, `includedFeatures[]`, `usage.aiLimitResetDate`, "Refund AI Usage" → `usage.aiQuestionsUsed=0`) — two editors, last-writer-wins, different coverage. Plan defaults from `app/teacher/subscription/plansData.ts`.

### Teachers / Students (`app/admin/teachers/`, `app/admin/students/`)
Directories query `users where role==...`; detail pages with lazy-paged tabs. Suspend/activate = `isActive` client write. **Delete = external Cloud Function `deleteAccountAPI`.**

### Classes (`app/admin/classes/`)
Server-paginated `classes orderBy(studentCount|createdAt)` — hard dependency on the `studentCount` field + composite index (surfaces an index-error toast). Detail: hydrate roster, remove student (`arrayRemove`), delete assignment, **delete class via `deleteClassAPI`** Cloud Function. ⚠️ Dark slate theme, inconsistent with the light admin shell.

## Invariants & traps

- Admin-created centers are born `active`; public-signup centers are born `pending` — the only two legal creators of `status`.
- ⚠️ **`DELETE /api/admin/centers/[id]` does not delete `center_staff` / `center_staff_credentials`** (added 2026-09-15, cascade not updated). The orphaned links point at a missing center, so `requireCenterOffice` fails and access is closed — but the documents linger. Add them to the cascade's bucket list when you next touch it.
- `center_teachers` doc ID == teacher uid (one center per teacher) — preserved even by the admin steal path.
- Timestamp mix: `centers.createdAt` is an ISO string; `classes.createdAt` is a Timestamp. `centerAdminService.toMillis()` tolerates both, but `GroupsTab.formatDate` and classes-detail (`createdAt.seconds`) assume Timestamp → render "—"/NaN for ISO (known minor bug).
- Nav has Dashboard/Centers/Teachers/Memberships/IELTS/Question bank only — `/admin/students` and `/admin/classes` exist but are unlisted (dashboard "Active Classes" card is still a dead `#` despite `/admin/classes` being built).
- ⚠️ **`questions1` is written ONLY by `/api/admin/questions1`.** Never add a client write (rules are `write: false` for a reason) and never write a doc without `rand` + an `uploadedAt` of the bank's type — it would silently vanish from the exam sampler / the uploadedAt-ordered listings. Reordering `data/syllabus.json` re-files the bank (ids are positions).
- ⚠️ Teachers' `create/database` caches each subtopic in localStorage for **7 days** — a newly added question shows there only after that cache expires (or on "load more"). Exams and the admin page read live.
- `CopyIdButton` is copy-pasted in ≥4 files with divergent styling (never extracted).
- `membership/page.tsx` uses `alert()` instead of toasts.

## How to verify changes

**Question bank:** `/admin/question-bank` → Algebra › a chapter › a subtopic → "Add here", fill UZ only and Save (expect RU/EN chips), fill all three and save; the question appears at the top of that difficulty and the count goes up. Bulk import the downloaded template after adding a single-backslash `\sqrt{4}` to a question and emptying one `en` — expect the backslash fix + an EN error; import the ready one; import again → "already in bank". Bench → `rand` gone in the console.

`npm run dev` with a super-admin account; exercise: approve a pending center (check `centers.status`), create a center via the API route, add/steal a teacher, then build a throwaway center with real fixtures (group, walk-in attendance day, a finance charge, a **center-created teacher account** via the manager panel) and run cascade delete — verify `deletedCounts` covers each bucket, the created teacher can no longer log in, and a self-signup teacher's account + personal classes survive. Remember `deleteAccountAPI`/`deleteClassAPI` need the deployed Cloud Functions.

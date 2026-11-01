# AUTH — Authentication, Roles & SSO

> **Agent workflow:** read this BEFORE touching auth, signup, login, role guards, SSO, or `firestore.rules` helper functions. Update this doc in the same change whenever you alter behavior described here. Index of all docs: [README.md](README.md).

**Last verified:** 2026-09-15 (office roles — [OFFICE.md](OFFICE.md); previously 2026-07-13).

## Purpose & scope

How users sign up, log in, get a role, and get authorized — client-side (layout guards, security rules) and server-side (API-route verifiers) — plus the SSO hand-off to partner apps.

## Key files

| File | Responsibility |
|---|---|
| `lib/firebase.ts` | Client SDK singleton (`auth`, `db`, …) |
| `lib/firebaseAdmin.ts` | Admin SDK (`adminAuth`, `adminDb`, `adminStorage`); env `FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY` (`\n` un-escaped at load) |
| `lib/AuthContext.tsx` | `AuthProvider` + `useAuth()` → `{user, loading}`. Renders children only after first auth resolution (`{!loading && children}`) |
| `app/(public)/auth/login/page.tsx` | Login (email **or** username), role-based redirect, forgot-password, SSO auto-redirect |
| `app/api/auth/login/route.ts` | Username login: resolves username→email server-side, verifies password via Identity Toolkit REST, returns a custom token |
| `app/api/auth/reset-password/route.ts` | Forgot-password by username (sends Firebase reset email server-side; always replies `{ok:true}`) |
| `lib/server/authRateLimit.ts` | In-memory per-IP throttle shared by the two `/api/auth/*` routes |
| `app/(public)/auth/signup/_components/{Student,Teacher,Manager}SignupFlow.tsx` | Per-role signup wizards; all three accept a `googleMode` prop (see Google sign-in) |
| `app/(public)/auth/signup/_components/FormSteps.tsx` | Shared wizard steps + helpers: validation (`passwordError`, `usernameFormatError`), `step1ErrorFor` (auth error → step-1 field), `formatUzPhone`, `slugify`/`isValidSlug`, `TermsAgreement` |
| `app/(public)/auth/_components/roleHome.ts` | `roleHome(role)` — the ONE role→landing-path map used by login, Google sign-in, complete-profile and the wizards' already-registered redirect |
| `app/(public)/auth/_components/AuthShell.tsx` | Shared login/signup frame (illustration panel, logo → `/`, language toggle) |
| `app/(public)/auth/_components/Field.tsx` | `FloatField`/`FloatSelect` — the one floating-label input style of login + signup |
| `app/(public)/auth/_components/lastLogin.ts` | localStorage `edify:lastLogin` = `password`\|`google` (method only, never the identifier) → "last used" badge on the login page |
| `lib/googleAuth.ts` | `signInWithGoogle()` (popup + profile-existence check) and `suggestUsername()` |
| `app/(public)/auth/_components/GoogleAuthButton.tsx` | "Continue with Google" button (login + signup pages) incl. post-sign-in routing |
| `app/(public)/auth/complete-profile/page.tsx` | Onboarding for authenticated users with no `users/{uid}` doc (role picker + wizards in `googleMode`) |
| `lib/sso.ts` + `app/api/sso/token/route.ts` | SSO custom-token mint for partner apps (e.g. tez-yozish typing trainer) |
| `lib/server/verifySuperAdmin.ts` | `requireSuperAdmin(request)` — gates every `/api/admin/*` route |
| `lib/server/verifyCenterManager.ts` | `requireActiveCenterManager(request)` — gates every `/api/manager/*` route; returns `{uid, centerId}` |
| `lib/server/verifyCenterOffice.ts` | `requireCenterOffice(request, roles?)` — director/buxgalter guard, anchored on `center_staff/{uid}` ([OFFICE.md](OFFICE.md)) |
| `lib/adminApi.ts` / `lib/managerApi.ts` | Client fetch wrappers attaching `Authorization: Bearer <idToken>`. **`managerApiFetch` is a re-export alias of `adminApiFetch`** — same client code; only the server-side verifier differs |
| `firestore.rules` (top) | Role helper functions (see below) |

**Not auth despite the name:** `lib/api.ts` is a syllabus-name→ID lookup. **Stale notes, do not trust:** `lib/aouth.txt`, `lib/fireba.md` (old "WASPAI" design docs — predate manager/admin roles, wrong redirect paths).

## The authorization mechanisms (never confuse them)

1. **`super_admin`** — Firebase **custom claim**. Read via `getIdTokenResult()` client-side, `decoded.super_admin === true` server-side, `request.auth.token.super_admin` in rules. **No code in this repo sets it** — it is provisioned out-of-band (gcloud/admin script). God-mode rule: `match /{document=**} { allow read, write: if isSuperAdmin(); }` (firestore.rules:58-60).
2. **student / teacher / manager** — plain **`role` field on `users/{uid}`** (no claim). Checked by layouts via `getUserProfile()`.
3. **director / accountant (buxgalter)** — the back-office roles ([OFFICE.md](OFFICE.md), 2026-09-15). ⚠️ **`users.role` is a REDIRECT HINT ONLY for these two**; the real boundary is the Admin-SDK-only link doc **`center_staff/{uid}`** (doc id == uid), checked by `isCenterOffice()` in rules and `requireCenterOffice()` on the server — the `center_teachers` pattern. Provisioned **only** by a super admin via `POST /api/admin/centers/{id}/staff`; the rules' `users` create allowlist deliberately still excludes both values, so nobody can self-serve one.

## Flows

### Signup (all client-side, per-role wizard)
Common: `createUserWithEmailAndPassword` → `updateProfile(displayName)` → one atomic `writeBatch` (`users/{uid}` + `usernames/{lowerUsername}`, manager also `centers/{autoId}`) → commit → SSO check (`getSsoReturnTo` → `completeSsoRedirect`) **before** the normal dashboard redirect. On any error: `deleteUser(auth.currentUser)` rolls back the orphaned Auth account (**password path only** — never in `googleMode`, see Google sign-in).

- Password ≥ 8 chars. Username ≥ 5 chars, starts with a letter, `[a-zA-Z0-9_]`.
- Auth errors that belong to step 1 (`auth/email-already-in-use`, `auth/invalid-email`, `auth/weak-password`) send the wizard back to step 1 with the message under the field (password path only). All wizard copy, incl. grade/subject options and validation messages, lives in `SIGNUP_TRANSLATIONS` (uz/en/ru). After the batch commits, the wizard shows an "account created" screen for ~1.1s (`pauseOnDone`) before the SSO check / redirect.
- Username availability: debounced 800ms `checkUsernameUnique` with in-memory cache — **fails open** (network error → treated as available); the batch create against immutable `usernames/{name}` is the real uniqueness guarantee.
- **Student** → `/dashboard`. Writes gamification zeros: `totalXP:0, currentStreak:0, level:1, dailyHistory:{}, progress:{...}`, `location:{country:'Uzbekistan',...}`, `createdAt` ISO string.
- **Teacher** → `/teacher/dashboard`. Writes `subject`, `grade:'Teacher'`, `verifiedTeacher:false`, `experience:0`.
- **Manager** → `/manager/dashboard`. 3 steps; phone typed as the local part behind a fixed `+998` prefix and stored formatted `+998 XX XXX XX XX`; the center slug follows the center name (`slugify`: Cyrillic transliterated, `o'`/`g'` apostrophes dropped) until the user edits it by hand, and must pass `isValidSlug` (≥3 chars, `a-z0-9` joined by single `-`) before submit. Writes `users` doc (`role:'manager'`, `centerId`) + `centers` doc: `{id, name, slug, ownerUid, size, status:'pending', subscription:{plan:'free_trial', validUntil:+14d ISO}, createdAt}`.

### Google sign-in (no password ever)

"Continue with Google" appears on the login page and on the signup role-selection screen (`GoogleAuthButton`, self-contained). `signInWithPopup` with `prompt: 'select_account'`; default provider scopes already supply `displayName`, `email`, `photoURL`. Popup only — `signInWithRedirect` is deliberately avoided (broken on Safari/ITP without an authDomain proxy). Requires the Google provider to be enabled in Firebase Console → Authentication.

After the popup, `signInWithGoogle()` checks `users/{uid}`:

- **Profile exists** → the exact post-sign-in precedence as password login (SSO `returnTo` → `super_admin` claim → role redirect via `roleHome`, so director/accountant go to `/office` here too).
- **No profile (new user)** → redirect to **`/auth/complete-profile`** (forwarding `?returnTo=` if an SSO hand-off is pending). Exception: a `super_admin` claim with no user doc goes to `/admin` (admin accounts are provisioned out-of-band and have no profile).

**`/auth/complete-profile`** = role picker + the same three signup wizards rendered with `googleMode`:

- Step 1 (email/password) is skipped; the account is `auth.currentUser`; email comes from Google. Full name is pre-filled from the Google `displayName`, username is pre-suggested from the email local part (`suggestUsername`, editable, same debounced uniqueness check).
- Commits the **same atomic batch** as password signup (`users/{uid}` + `usernames/{name}` + `private/contact` dual-write, manager also `centers/{autoId}`), plus `photoURL` (built conditionally — never `undefined`). No rules changes were needed.
- **No `deleteUser` rollback in `googleMode`** — the Google account pre-exists and onboarding is *resumable*: the page itself redirects doc-holders to their dashboard, and login sends doc-less users back here (below).
- SSO check runs after commit, exactly like password signup.

**Onboarding is resumable:** any authenticated user whose `users/{uid}` doc is missing is sent to `/auth/complete-profile` by the login page (this replaced the old "Profile not found" error) — covering abandoned Google onboarding and password signups whose batch never committed.

**Account linking:** Firebase is on the default *one account per email* setting, so a Google sign-in with the email of an existing password account resolves to the **same uid** (profile intact). Caveat: Google is a "trusted provider" — for a previously **unverified** email/password account it removes the password credential. Do not use `fetchSignInMethodsForEmail` anywhere (account-enumeration oracle).

### Login (`app/(public)/auth/login/page.tsx`)
One smart identifier field. Input contains `@` → email path (`signInWithEmailAndPassword`, unchanged legacy behavior). No `@` → username path: `POST /api/auth/login {username, password}`; the route lowercases the username, resolves `usernames/{name}` → uid → `adminAuth.getUser(uid).email` (**email never reaches the browser**), verifies the password via Identity Toolkit REST `accounts:signInWithPassword` (Firebase's per-account lockout applies; key = `NEXT_PUBLIC_FIREBASE_API_KEY`), then returns `createCustomToken(uid)`; the client finishes with `signInWithCustomToken`. Unknown username, wrong password, and disabled account all get the identical generic 401 (`invalid-credentials`) — no account enumeration. Per-IP throttle: 20 attempts / 10 min (429 → "too many attempts" toast).

Both paths then run the same post-sign-in precedence:
1. SSO `returnTo` pending → `completeSsoRedirect` and stop.
2. `getIdTokenResult(true)` → `super_admin` claim → `/admin`.
3. `users/{uid}` doc; missing → redirect to `/auth/complete-profile` (resume onboarding — see Google sign-in).
4. `role`: teacher → `/teacher/dashboard`, manager → `/manager/dashboard`, **director|accountant → `/office`** ([OFFICE.md](OFFICE.md) — a hint only; that layout re-checks `center_staff`), else `/dashboard`.

Already-signed-in users landing on the login page with `?returnTo=` are auto-SSO-redirected (one-shot `onAuthStateChanged`).

### Password reset
Login page "forgot password" uses whatever is in the identifier field (no separate page). Email typed → client `sendPasswordResetEmail` (legacy behavior, incl. its per-address error toasts). Username typed → `POST /api/auth/reset-password {username}`: the route resolves the username server-side and sends the reset email via Identity Toolkit `accounts:sendOobCode`, but **always responds `{ok:true}`** whether or not the username exists (enumeration-safe; the success toast means "sent if the account exists"). Per-IP throttle: 5 requests / 15 min. Admin can mint a reset link for a center owner via `POST /api/admin/centers/[id]/manager` action `reset-password`.

### SSO (partner hand-off)
Partner sends the user to login/signup with `?returnTo=<callbackURL>`:
1. `getSsoReturnTo()` validates the `returnTo` **origin** against `NEXT_PUBLIC_SSO_ALLOWED_ORIGINS` (comma-separated). Default when unset: `["http://localhost:3000"]` → **production SSO is dead unless this env var is set**.
2. `completeSsoRedirect()`: client's ID token → `POST /api/sso/token` (Bearer) → server `verifyIdToken` then `createCustomToken(uid)`.
3. Redirect `returnTo + '#sso_token=' + token` — token in the **URL fragment** so it never hits server logs. Partner signs in with `signInWithCustomToken`.

Security invariant: the caller proves identity with its own ID token, so SSO can never sign someone into a different account.

## Layout guards (all `'use client'`, useEffect + redirect)

| Layout | Check | Failure behavior |
|---|---|---|
| `app/admin/layout.tsx` | `super_admin` claim via `getIdTokenResult(true)` | not admin / error → `/`; renders `null` until resolved |
| `app/(student)/layout.tsx` | `role` from profile | manager/teacher → their dashboards. ⚠️ **Fails OPEN**: profile-read error → `setIsAuthorized(true)` |
| `app/teacher/layout.tsx` | `role === 'teacher'` | manager → `/manager/dashboard`, other → `/dashboard`; no explicit error catch |
| `app/manager/layout.tsx` | `role === 'manager'` + resolves center name & `status` for `ApprovalGate` | **Fails CLOSED**: error → `/auth/login` |
| `app/office/layout.tsx` | **`center_staff/{uid}`**, not `role` — resolves `centerId` + `staffRole` ([OFFICE.md](OFFICE.md)) | **Fails CLOSED**: no link / error → `/auth/login` |

## firestore.rules helpers

- `isAuth()`, `isOwner(userId)`, `isParentOf(studentId)` (checks `parents/{uid}.children`).
- `isCenterManager(centerId)` — ownerUid match only. **READ-level checks only.**
- `isActiveCenterManager(centerId)` — ownerUid **AND** `status == 'active'`. **All manager WRITE privileges go through this.** Missing `status` = pending = blocked.
- `isTeacherInMyCenter(teacherUid)` / `isTeacherOfCenter(centerId)` — via `center_teachers/{teacherUid}` link docs.
- `isCenterOffice(centerId)` — via `center_staff/{request.auth.uid}` (2026-09-15). **READ-level only**; every money collection stays `write: if false`. The path is constant, so it costs a fixed number of document accesses inside a `list` rule — see [OFFICE.md](OFFICE.md).
- `isSuperAdmin()` + god-mode wildcard match.
- `centers`: create requires `ownerUid == uid` AND `status == 'pending'` (no self-approval); owner update `hasOnly(['name','slug','size'])`. Activation happens only via god-mode client write from `/admin/centers` or Admin SDK.
- `usernames`: public read; create-if-absent with own uid; owner delete; **update: false** (immutable).
- `users`: read if authed. Owner create/delete/update, **minus a privileged-field denylist** (below), plus a carve-out allowing any authed user a ±1 delta on `followersCount`/`followingCount` only (social follow, `lib/social.ts`).

### Contact details: `users/{uid}/private/contact` (email, phone)

`users/{uid}` is readable by **every signed-in user** (class rosters, leaderboards, social profiles, explore all need it) and Firestore has **no field-level read rules** — so any field left on that doc is world-readable to anyone who signs up. Contact details therefore live in `users/{uid}/private/contact`, whose rule is a flat `isOwner(userId)`.

| Who | How they read contact details |
|---|---|
| the user themselves | directly, client SDK (`getOwnContact()` in `lib/directory.ts`) |
| teacher of the student / manager of the center / **student of the teacher** (2026-07-20 — the class page shows the teacher's phone/email through this) | **`POST /api/directory/contact`** — the relationship is proven with the Admin SDK (`lib/server/directory.ts`), because a rules-level "is this student in one of my classes?" check would need a query, which rules cannot do |
| super admin | god mode |
| anyone else | never |

`POST /api/directory/lookup` resolves an email → account (teacher/manager/admin only, rate-limited) via `adminAuth.getUserByEmail`. It replaced four client-side `where('email','==')` queries, which broke once `email` left the doc **and** were themselves a leak — any signed-in user could use one as an email→account oracle.

⚠️ **Never write `email`/`phone` onto `users/{uid}`.** Every profile save and every XP submit used to mirror them there; each such write silently re-opens the leak. Use `setOwnContact()`.

#### Migration status (staged, zero-downtime)

- **DEPLOY 1 (done):** subcollection + API routes live; signup and profile saves dual-write; readers moved. `users.email/phone` still present as a fallback, so nothing breaks.
- **DEPLOY 2 (pending):** `scripts/stripPublicContact.mjs --apply` deletes `email`/`phone` from `users/*` — **this is what actually closes the leak.** It refuses to strip any user whose details are not already in the subcollection.

  **DEPLOY-2 BLOCKERS — these still read `phone` off the public doc and must be moved to `getOwnContact()` / `getContactOf()` first, or they will silently render blank:**
  `app/manager/profile/page.tsx` · `app/teacher/profile/page.tsx` (both → `getOwnContact`) · `app/manager/students/_components/ManagerStudentInfoPanel.tsx` · `app/manager/finance/_components/StudentInfoDialog.tsx` (→ `getContactOf`) · `services/centerAdminService.ts` (admin; read the subcollection under god mode). (`ManagerTeacherInfoPanel.tsx` was migrated to `getContactOf` on 2026-07-15 — no longer a blocker.)

  Then delete the `mirror` write in `setOwnContact()` and the `legacy` fallbacks in `getOwnContact()` / `readContact()`.

### The `users` privileged-field denylist (the core of the authz model)

`users/{uid}` is client-writable, so **anything stored there that grants privilege or costs money must be unwritable by its owner**. These fields are settable only by the Admin SDK (API routes) or a super admin (god mode):

| Field | Why it's locked |
|---|---|
| `role`, `centerId` | authorization *hints* only — the real gate is always an ownerUid check |
| `subscription`, `currentLimits`, `includedFeatures`, `usage` | the paid plan + AI quota that `lib/ai/featureGatekeeper` reads as its authorization source — self-writable meant free premium + unlimited Gemini on your bill |
| `verifiedTeacher` | trust badge |
| `isActive` | moderation / ban flag |

⚠️ **Locked on `create` as well as `update`** — the owner may delete their own doc, so an update-only lock is bypassed in two calls by delete-then-recreate. `create` additionally forces `role ∈ {student,teacher,manager}`, `verifiedTeacher == false`, `totalXP == 0`.

⚠️ **Never trust `users.role` / `users.centerId` as an authorization source.** They are attacker-controlled. Every privileged path must prove ownership independently: `isActiveCenterManager()` / `isCenterManager()` in rules, and `requireActiveCenterManager()` server-side — all three compare `centers/{centerId}.ownerUid` to the caller's uid.

Not yet locked (see docs/STUDENT.md): `totalXP`, `currentStreak`, `dailyHistory` are still client-written by the test runner, so XP remains forgeable until scoring moves server-side.

## Invariants & traps

- **Usernames are always lowercased** — in `users.username`, in the `usernames/{id}` doc ID, in the availability check, and in the `/api/auth/*` lookups.
- **Google users have no password** — password login/reset simply doesn't apply to them; they must use the Google button. Don't add a "set a password" shortcut without deciding on the linking story deliberately.
- **Center-managed accounts** (2026-07-15): managers can provision **teacher AND student** accounts via `POST /api/manager/teachers/create` / `POST /api/manager/students/create` — `users.accountType:'center-managed'`, synthetic email `f.surname@edify.uz` (short form, shared fixed domain) (**no inbox — email-based password reset can never work for them**), manager-held password in `center_teacher_credentials/{uid}` (manager-read-only). The manager is the recovery path (`PATCH /api/manager/teachers/[uid]`, password branch restricted to this account type). Login: username or the synthetic email, standard flows. 🟢 The student settings page **hides self-service password change for `accountType:'center-managed'`** (2026-07-20) — a self-change would desync the manager's stored credential. See [MANAGER.md](MANAGER.md).
- **Account self-deletion is server-side** (2026-07-20): `POST /api/account/delete` (Bearer token, Admin SDK, only ever deletes the caller). Removes attempts (rules forbid student deletes — the old client flow aborted for anyone with attempts), notifications, class membership/leaderboard rows/join requests, current global leaderboard docs, the social graph both directions (clamped counter decrements), `private/*`, RASCH docs, checkers rooms, `center_students` + `center_student_credentials`, `usernames`, storage photo, the user doc, then the Auth user. Finance docs are kept (append-only).
- **"Use Google photo" on the student profile LINKS Google** (2026-11-01,
  `app/(student)/profile/page.tsx` › `handleUseGooglePhoto`): if the account has
  no `google.com` provider it calls `linkWithPopup(user, GoogleAuthProvider)` —
  the only way to read a Gmail photo — so the student can afterwards also sign in
  with Google. `auth/credential-already-in-use` (that Google identity is already
  its own Firebase user) → toast, nothing changes. The photo URL comes from
  `lib/googlePhoto.ts` (`providerData` google photo, upsized `=s400-c`) and is
  written to `users.photoURL` + `updateProfile`; any uploaded Storage photo is
  deleted. The profile also falls back to that Google photo when `users.photoURL`
  is empty.
- **`photoURL` written at Google signup is the `lh3.googleusercontent.com` URL** — it can go stale if the user changes their Google photo. Copying it into Firebase Storage is a known future improvement, not done yet.
- **Username login/reset must stay enumeration-safe**: the `/api/auth/*` routes never reveal whether a username exists (identical generic responses) and never return the account's email to the client. Don't "improve" the error messages into specific ones, and don't put emails in the public-read `usernames/*` docs.
- **Pending-center gate is triple-enforced**: rules (`isActiveCenterManager`), server (`requireActiveCenterManager`), UX (`ApprovalGate.tsx` overlay). The rules are the security boundary; the component is UX only.
- **`requireActiveCenterManager` must compare `centers.ownerUid` to the caller's uid** — not just `users.role == 'manager'` + `users.centerId`. It previously trusted the (client-writable) user doc alone, so any signed-in user could point `centerId` at someone else's center and drive every `/api/manager/*` route — which use the Admin SDK and bypass rules — against it. Regression-tested in `tests/rules/`.
- **Rules are regression-tested.** `npm run test:rules` runs `firestore.rules` against the emulator: attack tests (each reproduces a real escalation) + legit-flow tests (signup ×3 — both per-doc AND as the app's real atomic `writeBatch` — profile edit, XP submit, social follow, center admin, god mode), plus `tests/rules/manager.rules.test.mjs` for the full manager surface. ⚠️ `node --test` runs test files in parallel against one emulator — every test file must use its OWN `projectId`, or one file's `clearFirestore()` wipes another's seed mid-test (shows up as random "Null value error" rule denials). **Never tighten a rule without first adding the legit-flow test that proves you didn't break the live app.**
- Rules changes require `firebase deploy --only firestore:rules`. ⚠️ **Local/live rules drift breaks signup completely**: on 2026-07-13 the released ruleset was missing the `users/{uid}/private/contact` block, so every signup batch (password AND Google) died with `permission-denied` — a batch write to a path with no matching rule denies the whole batch. When signup fails with permission-denied, diff the released ruleset against `firestore.rules` before debugging code.
- **complete-profile must fail CLOSED** when the profile-existence check errors (it shows a retry screen). Showing the wizard to a user who might already have a profile lets a full-overwrite `set` wipe XP/role data; as a second layer, `googleMode` `handleSignup` re-checks `users/{uid}` and redirects instead of writing if it exists.
- Center approval by admin is a **raw client `updateDoc`** on `centers.status`, legal only because of god-mode — there is no approve API route.
- Manager ownership transfer (`/api/admin/centers/[id]/manager` action transfer) mutates `role`/`centerId` on both users; `oldOwnerAction` ∈ demote-teacher | demote-student | keep.

## Known issues / dead code (verified 2026-07-12 — don't "fix" without deciding deliberately)

- Student layout fails open vs manager fails closed (inconsistent security posture).
- `users.level` is written at signup but never updated afterwards (`updateUserStats` touches only `totalXP`/`currentStreak`).
- `getUserProfile(uid, email?, displayName?)` — trailing params unused.
- `lib/api.ts` has leftover `console.log` debug spam.

## How to verify changes

No test suite. `npm run dev`, then exercise: signup per role (check `users` + `usernames` docs), **Google flow** (Google button on login with a brand-new Google account → complete-profile → each role → check `users` doc has `photoURL` and `private/contact` has the Google email; abandon onboarding mid-way, log in again → lands back on complete-profile; Google button with an existing account → straight to the right dashboard), login redirect per role — **with email AND with username** (username of an existing account + correct password → same redirect as email login; wrong password and non-existent username → the same generic "invalid" toast; verify the `/api/auth/login` response carries only `{token}`, no email), forgot-password with a username in the field (generic success toast; reset email arrives for real accounts), a pending manager hitting `ApprovalGate`, SSO round-trip with `NEXT_PUBLIC_SSO_ALLOWED_ORIGINS=http://localhost:3001` and a fake `?returnTo=`. Rules edits: deploy to a test project or use the emulator before production deploy.

# GAMES — classroom games built from a teacher's own tests

> **Agent workflow:** read this BEFORE touching `app/teacher/games/*`, `services/teacherTestService.ts`, `services/gameQuestionService.ts`, `app/api/teacher/games/*`, or the tests-library quick-launch button; update it in the same change whenever you alter behavior described here. Index: [README.md](README.md).

**Last verified:** 2026-11-02 (Karvon yo'li added, uncommitted, on top of `261aceb`).

## Purpose & scope

`/teacher/games` is a catalogue of projector games that play questions from the teacher's **own tests** (`custom_tests`, built in `/teacher/library/tests`) **or from a set made with AI right in the game's setup** ("AI bilan yaratish"). Five games are live: **Arqon tortish** (tug of war), **Savol doskasi** (Baamboozle-style question board), **Omad g'ildiragi** (lucky wheel), **Penalti seriyasi** (penalty shootout) and **Karvon yo'li** (Silk Road caravan race — the only game where every team answers every question). Live quiz is a "Tez kunda" card with no code behind it.

**No Firestore writes from the games, no rules, no index.** The only read is the teacher's own `custom_tests` (same query shape as the tests library). Game results are not saved anywhere. The AI route's only write is the monthly AI usage counter (`users.usage.aiQuestionsUsed`, docs/AI.md); AI sets live in the browser.

## Key files

| File | Responsibility |
|---|---|
| `app/teacher/games/page.tsx` | Hub: clean cards (animated scene, name, one line, full-width button). The whole card is the link; the button is a styled span. Non-live cards show a grey "Tez kunda" button |
| `app/teacher/games/_components/{TestPicker,Confetti}.tsx` | Shared by every game: test picker (strings via the `PickerText` shape) and the confetti burst |
| `app/teacher/games/_components/{TeamBar,QuestionCard,Podium,StageBackdrop,TeamGameSettings,PlayControls}.tsx` | Shared by the **team games** (board, wheel, penalty, caravan — caravan uses its own `RoundCard` but borrows `TimerRing`/`questionSize` from `QuestionCard`), presentational, each takes its strings as a small `*Text` shape: team cards with counting scores + floating "+20"; the open question (generic props: `question`, `turn`, `nextTeam` — `null` → the button reads "Natijalar", `badge`, `morphId`…; timer ring, answers, result + one Continue — no button without `onNext`); full-screen result podium; floating backdrop shapes; setup blocks `TeamSetup` (no count chips without `onTeamCount`) / `TimerField` (− / + stepper) / `QuestionSummary`; footer `ControlButton` + `PauseOverlay` |
| `app/teacher/games/_lib/{stage,ranking}.ts` | Team-game colors (`GAME_TEAMS` ×4, `STAGE` page wash / tile faces / correct / wrong / gold, `OPTION_COLORS`) and `ranking` (equal scores share a place) |
| `app/teacher/games/_lib/sound.ts` | Shared Web Audio sound kit (`sfx.*`, synthesized, no files) + `useGameSound()` → `[muted, toggle]`, persisted in localStorage `edify.games.muted` |
| `app/teacher/games/_lib/useBigScreen.ts` | Shared `(min-width:768px) and (orientation: landscape)` check for play views |
| `app/teacher/games/question-board/page.tsx` | Savol doskasi: setup ↔ full-screen board, sounds, keyboard, pause, exit/finish guards |
| `question-board/_lib/engine.ts` | **All board rules** as a pure reducer: tiles (10/20/30 points each, `buildPoints`), turns, timer |
| `question-board/_lib/i18n.ts` | Every board string, uz/ru/en |
| `question-board/_components/{BoardSettings,TileGrid}.tsx` | Settings (shared blocks + board size); tile grid (gloss, shine wave, used tiles show ✓ +points or ✗). The question card morphs out of the tile (`morphId`) |
| `app/teacher/games/lucky-wheel/page.tsx` | Omad g'ildiragi: setup ↔ full-screen wheel, landed beat → reveal timer, sounds, keyboard, pause, exit/finish guards |
| `lucky-wheel/_lib/engine.ts` | **All wheel rules** as a pure reducer: `SEGMENTS` (12: 10–50 points, one ×2, one Bankrot), turns/rounds, multiplier, timer, `isLastTurn`, `questionsNeeded` |
| `lucky-wheel/_lib/{theme,i18n}.ts` | Fixed wheel colors (`WHEEL`, `WEDGE_FILLS`); every wheel string, uz/ru/en |
| `lucky-wheel/_components/Wheel.tsx` | The wheel: static rim + blinking bulbs → rotating disc (wedges, labels, pegs) → static gloss → flapping pointer → hub button (spin, then the landed value). Spin animation + drag-flick |
| `lucky-wheel/_components/{WheelSettings,BankruptCard}.tsx` | Settings (shared blocks + rounds, `roundChoices`); the Bankrot card |
| `app/teacher/games/penalty/page.tsx` | Penalti seriyasi: setup ↔ full-screen stadium, answered beat → proceed timer, kick timer → `kicked`, sounds, keyboard, pause, exit guard |
| `penalty/_lib/engine.ts` | **All penalty rules** as a pure reducer: 2 teams alternate, `ZONE_COUNT` 5, keeper zone passed in with the answer, sudden death, `goals`, `kicker`/`kickerOf`, `isOver`, `questionsNeeded` |
| `penalty/_lib/{theme,i18n}.ts` | Fixed pitch colors (`PITCH`, `CROWD_NEUTRALS`); every penalty string, uz/ru/en |
| `penalty/_components/Stadium.tsx` | The scene as one SVG (viewBox 1600×700, `overflow: visible` background layers): tiered stands + crowd, EDIFY LED board, perspective grass stripes + lines, 3D net (back/roof/side panels) + frame, keeper, ball paths per shot, kicker, vignette, 5 aim target rings. Owns the kick timeline (`KICK_MS`); exports `Ball` |
| `penalty/_components/{Keeper,Kicker}.tsx` | The two figures: keeper (`KeeperFigure` + moves idle / sway / dive per zone / watch; dives pivot on the body center), kicker from behind (run-up, kick, cheer) |
| `penalty/_components/{KickTally,KickBanner,PenaltySettings}.tsx` | Top bar (names, one pip per kick, score); the result banner (✓ GOL! green / ✕ GOL EMAS red + a one-line reason) + Continue; settings (shared blocks + kicks, `kickChoices`) |
| `app/teacher/games/caravan/page.tsx` | Karvon yo'li: setup ↔ full-screen desert map, move timer → `settled` (with step/oasis/coins/storm sounds), keyboard rows, pause, exit/finish guards |
| `caravan/_lib/engine.ts` | **All caravan rules** as a pure reducer: `ROAD_LENGTHS` 12/18/24, `BETS` 1–3, `RISKY_BET` 3, `cities`/`shelter` (checkpoints), `placeEvents` (2 Vaha + 1 Bozor, random per game, passed in), `Move` per team computed at `reveal`, `questionsFor`, `isOver` |
| `caravan/_lib/{theme,i18n}.ts` | Fixed desert colors (`DESERT`); every caravan string, uz/ru/en |
| `caravan/_components/DesertMap.tsx` | The map as one SVG (viewBox 1600×640): sky/dunes, one sine-wave road (`nodeAt`), cities, event squares, one camel per team in its own **lane** (`laneGap`), hop keyframes per `Move.path`, storm swirl / oasis ripple / float labels. Exports `STEP_S`, `moveSeconds` |
| `caravan/_components/{Camel,Landmarks}.tsx` | Bactrian camel token (team colors, pennant number, ×2 badge, legs swing for `walkSeconds`) + `CamelGlyph`; `City` (`registan` Samarqand / `kalon` Buxoro / `kalta` Xiva), `Oasis`, `Bazaar` |
| `caravan/_components/{BetPanel,RoundCard,CaravanSettings}.tsx` | Fixed-height strip under the map (bet buttons ↔ round results, `outcomeOf`); the all-teams question card (display-only options + one answer column per team, lock + undo, reveal results); settings (shared blocks + road length) |
| `app/teacher/games/_components/GameArt.tsx` | The 6 animated card scenes (tug uses the real `Puller` + `FIELD`; caravan the real `Camel`/`City` + `DESERT`; quiz/board/wheel/penalty use M3 tokens so palettes and dark mode work). `on=false` → still frame |
| `app/teacher/games/_components/QuestionSource.tsx` | Step 1 of every game: tabs **Mening testlarim** (`TestPicker`) / **AI bilan yaratish** (`AiQuestionMaker`). The open tab owns the selection; switching restores the other tab's pick. Both stay mounted once opened (no re-fetch, the form keeps its text). Tabs lock while AI is generating |
| `app/teacher/games/_components/AiSourcePicker.tsx` | "Savollar nimadan tuzilsin?": 4 source cards — **O'z mavzuingiz** (topic box + examples), **Maktab uchun** / **Ixtisoslashgan maktab** (grade pills → subject pills → searchable syllabus topic list by chapter, then a summary with "O'zgartirish"), **Abiturient (DTM)** (exam subject pills + topic box). Owns `SourceForm` ↔ `AiSource` (`toSource`, `formFromSet`, `sourceTitle`) |
| `app/teacher/games/_components/AiQuestionMaker.tsx` | The AI panel, 3 views: form (source picker, difficulty, count `10·15·20·30` with the game's suggestion marked "tavsiya", question language, credits left) → wait → ready list (✕ per question, answers hidden behind a switch) + "Yangi savollar" |
| `app/teacher/games/_lib/aiSource.ts` | Pure, shared by the panel AND the route: `AiSource` kinds, `TRACKS` (`data/maktab` + `data/ixtisoslashtirilgan_maktab` `structure.json`), `EXAM_SUBJECTS` (same 9 as `/teacher/create/ai`), `normalizeSyllabus`, `isKnownSubject` |
| `app/teacher/games/_lib/{aiSet,aiText}.ts` | `AiSet` + localStorage per teacher (`edify.games.aiSet.{uid}`), `aiSetToPicked` (the set as a `PickedTest`, so settings/decks work unchanged), `COUNT_OPTIONS`, `suggestCount`; the panel's strings uz/ru/en |
| `services/gameQuestionService.ts` + `app/api/teacher/games/questions/route.ts` | `generateGameQuestions({source, difficulty, count, language})` → the route: ID-token auth, teacher role, `checkUserPermission(uid, null, count)`, then **the matching create page's recipe** (`lib/ai/questionPrompts.ts` + `lib/ai/maktabBank.ts`), server-side validation, deduct the returned count. `fetchDtmBankQuestions` reads the DTM bank (`questions1`) in the browser, free |
| `app/teacher/games/_lib/questionDeck.ts` | Shared by every game: eligibility, `analyzeTest`, `buildDeck` (shuffle + option re-lettering), time estimates, `MIN_GAME_QUESTIONS = 6` |
| `services/teacherTestService.ts` | Read-only `fetchActiveTeacherTests(uid, pageSize, cursor)` / `fetchTeacherTest(id, uid)` (returns null if not the caller's) |
| `app/teacher/games/tug-of-war/page.tsx` | Setup ↔ full-screen play: game clock, keyboard, pause, exit guard, fullscreen |
| `tug-of-war/_lib/engine.ts` | **All rules** as a pure reducer; time is passed in (`now`) |
| `tug-of-war/_lib/teams.ts` | Blue/red team colors + `FIELD`, the chosen "Maydon" (sports field) look: blue/red split page, sky arena, grass mat, yellow timer (red last 10 s). The only hard-coded game colors |
| `tug-of-war/_lib/i18n.ts` | Every game string, uz/ru/en |
| `tug-of-war/_components/RopeArena.tsx` | SVG stage (viewBox cropped to the action): floor + lanes, win flags, rope (tension sag + shake per pull) with tails on the floor, 4 pullers as one spring group, dust/skid puffs, ribbon |
| `tug-of-war/_components/Puller.tsx` | One figure: rig of body/legs/torso pivots + 5 face expressions; the `Pose` contract (= designer brief below) |
| `tug-of-war/_components/Scoreboard.tsx` | Top bar (names, scores, test title) + `TimerPill` + `TugMeter` (rope position cells) used in the arena panel |
| `tug-of-war/_components/TeamPanel.tsx` | One team's question, answer buttons, correct/wrong feedback, freeze ring |
| `tug-of-war/_components/{Countdown,ResultCard,Confetti,TestPicker,GameSettings}.tsx` | The rest of the UI |
| `app/teacher/library/_components/TestCard.tsx` | Gamepad button → `/teacher/games/tug-of-war?testId=…` (active tests only) |

## Flows

**Eligibility** (`questionDeck.ts`): a question is playable iff `!isBlock && answerMode === 'single' && 2 ≤ optionList.length ≤ 6 && answer ∈ option ids`, i.e. mcq + true_false. Others are counted as skipped by reason: `open` (typed), `multi` (multiple_select…), `block`, `broken` (no or invalid correct answer). Grading goes through `isAnswerCorrect` (docs/QUESTIONS.md).

**AI bilan yaratish** (every game's step 1, second tab):
- Source (what the questions are built from), mirroring `/teacher/create`:
  - **O'z mavzuingiz** — any topic (2–400 chars; Ctrl/Cmd+Enter submits).
  - **Maktab uchun** / **Ixtisoslashgan maktab** — grade → subject → topic, from the same local syllabus as `create/maktab` and `create/ixtisoslashtirilgan_maktab` (`data/{track}/structure.json` imported; topics via `/api/syllabus`). The topic's syllabus **notes (`context`) go into the prompt**, so questions stay at that grade's level. Switching between the two school tracks resets the grade/subject/topic. The set is named "6-sinf · Matematika · Algebraik ifodalar".
  - **Abiturient (DTM)** — exam subject (the 9 of `create/ai`) + a typed topic → the `create/ai` prompt. Named "DTM · Biologiya · …". **For Matematika only** a second choice appears, "Savollar: AI yaratadi | DTM bazasidan · bepul": bank = Bo'lim (Algebra / Geometriya, `data/syllabus.json`) → topic → ready questions from `questions1`, read in the browser exactly like `create/database` (`fetchQuestions`, 10 per page, by difficulty), **no credits**; the language choice and credit line are hidden. Nothing found → "Bazada … savol yo'q"; fewer than 6 → the usual "not enough" block.
- Then: difficulty Oson/O'rta/Qiyin, count `10·15·20·30`, question language (defaults to the UI language — an English teacher with an Uzbek UI picks English). The suggested count follows the game's current settings until the teacher taps a number: tug `neededForMinutes(min)` (∞ → 30), board = tiles, wheel = teams × rounds, penalty = 2 × kicks + 4 (spares for sudden death), caravan = `questionsFor(length)` (12 → 10, 18 → 15, 24 → 20); `suggestCount` rounds up to an option.
- Credits come from the live `useMonthlyLimit`. Counts above what's left are disabled; nothing left → a warning with a link to `/teacher/subscription`.
- Route (`/api/teacher/games/questions`): verified ID token → `users/{uid}.role === 'teacher'` → monthly limit (no feature lock) → `planFor(source)` (a syllabus source sends only grade/subject/**positions**; the route checks grade+subject against `structure.json`, reads the file itself and resolves names + notes — the browser's text is never trusted) → **the create page's recipe, 100% identical prompt** (decided 2026-10-21):
  - own topic → `freePromptQuestions` (= `create/by_user_input`, temp 0.25)
  - maktab → `findMaktabBankQuestions` first (= `create/maktab`), then `maktabQuestions` (temp 0.25) — games only add a **top-up**: if the bank has fewer than asked, the AI writes the rest (create/maktab returns just the bank's few)
  - ixtisos → `ixtisosQuestions` (temp 0.35); abiturient → `dtmQuestions` (= `create/ai`, temp 0.3, no context)
  - the create pages send the class as `topic` and the subject folder name as `subject` — the route does the same, so the prompt text matches byte for byte. Same AI call through `lib/ai/generateMcqs.ts` (`MCQ_SCHEMA` = `q/o/e/a`; the solution `e` is checked against `a` and mismatches dropped + regenerated once, then `e` is ignored) — provider per `lib/ai/models.ts`.
  → drops anything malformed (not 4 options, duplicates, bad answer) → deducts what it returns, **bank questions included** (as create/maktab does). Errors: `UNAUTHORIZED` 401, `BAD_INPUT` 400, `FORBIDDEN`/`LIMIT_REACHED` 403, `BAD_TOPIC` 422/502 (nothing usable or the AI's SAFETY refusal), `AI_FAILED` 502. If the AI fails after some bank questions were found, those are returned. Takes ~15–30 s.
- Ready: the questions with a ✕ each; **answers are hidden by default** (the setup is often already on the projector) behind "Javoblarni ko'rsatish". Under 6 left → the normal "not enough" block in settings. The set is saved per teacher in localStorage and reopens in every game's AI tab, so one set can be played in all four games without new credits. "Yangi savollar" returns to the form (a link leads back to the ready set until a new one replaces it).

**Setup:** pick a test (paginated 12/page, title search on loaded rows; tests with fewer than 6 usable questions are disabled), two team names (max 20 chars, empty → default), time `1·2·3·5 min | ∞`. The summary shows usable/total, skipped by reason, and an estimate of `n × 8 s / 2 teams`. If usable is below what the chosen time needs (`neededForMinutes`), a non-blocking warning appears. With fewer than 6 usable, Start is disabled.

**Play (engine):**
- `init` → `countdown` (3-2-1-Go, 3.2 s) → `begin` draws one question per side from **one shared shuffled pile**. Each question is used once per game, so a faster team simply gets through more.
- **Correct:** rope moves 1 step toward that team (`rope < 0` = blue), green flash for `CORRECT_FLASH_MS = 650`, then the side draws next. `|rope| ≥ WIN_STEPS (5)` → instant win (`finishReason: 'rope'`).
- **Wrong:** the side is frozen for `FREEZE_MS = 2000` and then gets a NEW question. The wrong question is discarded and **the correct answer is never shown**. The rope does not move.
- Clock 0 → `'time'`; winner by rope sign, 0 = draw.
- When the pile is empty and both sides have no question or feedback → `'questions'`.
- `pause` stores `pausedAt`; `resume` shifts `endsAt`, every feedback `until` and `lastPullAt` by the paused span.
- The page drives `tick` every 100 ms only while `playing`. Keyboard: blue `1–4`, red `7 8 9 0`, `P`/Space = pause.

**Play layout:** top bar (team names + scores, test title) → 3 columns `1 : 1.2 : 1` (`1 : 1.45 : 1` from `xl`). Center panel = timer (top) · stage, vertically centered in the free height (`RopeArena` svg `h-full w-full`, `meet`) · rope meter + "1 tortish qoldi" (bottom). Teacher controls (pause, fullscreen, exit) sit **bottom-left on their own footer row**, under the three columns, so they can never cover a team's answers. No keyboard hint is shown (clean screen); the keys still work. The pause screen carries its own Resume + Exit, because it covers the arena controls.

### Savol doskasi (question board)

**Setup:** pick a test (same picker/eligibility, ≥ 6 usable), 2–4 teams (blue, red, green, yellow; names editable, max 20), time per question via a **− / + stepper** (5 s steps, 5–300 s; from "off" either button turns it on at 30 s) or the quick chips `15 · 30 · 60 s | off`, board size `12 · 16 · 20 · 24` (sizes above the usable count are disabled; a test with 6–11 usable gets one size = all of them). Tiles take a random slice of the shuffled deck.

**Play (engine):**
- Board → the team whose turn it is picks a tile → `answers` (question AND its options open together; the timer starts here) → teacher taps the option the team said → `result`. Pressing **Start** also enters browser full screen (inside the click, so the browser allows it; a refusal is ignored).
- **Correct:** the tile's points (10/20/30, shown only now) go to the team: "To'g'ri! +20 ochko", the score counts up and "+20" floats on the team card. Then ONE button: "Davom etish" (in the next team's color).
- **Wrong / time-out:** no points; the correct answer is highlighted green, then "Davom etish". Nothing else is shown (kept deliberately clean).
- `next` → the turn passes to the next team in order (always, right or wrong). When no tiles are left → `finished`. "Finish game" (board phase, with confirm) ends early.
- No surprise tiles or gift boxes — removed 2026-10-18 at the user's request ("just show the points earned and continue"). `buildPoints` spreads 10/20/30 evenly in random spots.
- Pause (only while a timed question is open) shifts `endsAt` by the paused span and covers the screen. Opening the exit dialog pauses too; cancel resumes.
- `ranking`: equal scores share a place (1, 1, 3). Two teams tied for first → "Durang!".
- Keyboard: Enter/Space = continue, A–F or 1–6 = answer, P = pause.
- Sounds: flip (pick), tick (last 5 s), correct/wrong/timeout, win. Mute button in the footer.

**Result screen (`Podium`):** opaque full-screen overlay (stage wash + a glow in the winner's color) — only: trophy medallion with slowly turning gold rays, "G'olib" + the winner's name, the podium, and two buttons (Qayta o'ynash, Sozlamalar); an X in the corner leaves to the games hub. Sequence: bars rise from last place to first (scores count up from 0 on each), then the trophy and name land, confetti in the winner's color (`Confetti` `delay` prop), then the buttons. Ties share a place and bar height; a tie for first shows a handshake + "Durang!" and no confetti. No per-team correct/wrong stats (kept clean on purpose).

**Play layout:** team cards (active one raised with a team-color ring + "Navbat") → "X, katak tanlang!" pill → tile grid filling the free height (`gridShape`: 12 → 4×3, 16 → 4×4, 20 → 5×4, 24 → 6×4) → footer (controls left, tiles left center, Finish right). The question card overlays only the board area, so the team cards (and their score floats) stay visible.

### Omad g'ildiragi (lucky wheel)

**Setup:** same test picker, teams (2–4) and timer stepper as the board, plus **rounds** `3 · 5 · 8 · 10` (one round = one spin per team). A round count is disabled when `teams × rounds` (`questionsNeeded`) exceeds the usable questions; a short test gets one fitting count (`floor(usable / teams)`). The deck is cut to exactly that many questions.

**Play (engine phases `spin → spinning → landed → answers → result → spin…`, `finished`):**
- **Spin:** a student flicks the wheel (drag → release faster than `MIN_FLICK` 0.25°/ms; the speed sets turns/duration and the flick direction sets the spin direction), or the teacher taps the hub **Aylantir** button / presses Space or Enter. A gentle drag shows "Kuchliroq aylantiring!". The page picks `target = random segment` and dispatches `spin`; the wheel animates to it (4–8 turns, 4.2–6.2 s, ease-out) and dispatches `land`.
- **Points** (10–50): `landed` beat (the wedge glows, the hub shows the value, "50 ochko" pill, ding) → after 1.1 s `reveal` opens the shared question card worth `value × multiplier` (badge shows it). Correct → the points + confetti; wrong / time-out → nothing, the correct answer is shown. One Continue → next team.
- **×2:** gold beat + gold confetti → after 1.5 s the SAME team spins again with `multiplier × 2` (max ×4; the prompt shows "yana aylantiring! ×2").
- **Bankrot:** straight to `result` with the Bankrot card: no points this turn, **earlier points are kept** (the user's choice — kinder than the TV rule), no question used, multiplier reset.
- `next` → the next team; after the last team the round advances. After round `rounds` (or when the deck is empty) → `finished` → the shared `Podium`. "Finish game" (spin phase, with confirm) ends early.
- Keyboard: Space/Enter = spin or continue, A–F or 1–6 = answer, P = pause (timed question only).
- Sounds: `peg` click per peg passed (throttled 35 ms), `land`, `double`, `bankrupt`, plus correct/wrong/tick/timeout/win.

**Play layout:** team cards → prompt pill ("X, g'ildirakni aylantiring!") → the wheel (square, `min(97% of the free height, 58vw)`) → footer (controls left, "2-raund / 5" + round pips center, Finish right). The question / Bankrot card overlays the wheel area only, so the team cards stay visible.

### Penalti seriyasi (penalty shootout)

**Setup:** same test picker and timer stepper as the board; **2 fixed teams** (name fields only) and **kicks per team** `3 · 5 · 10`. A count is disabled when `2 × kicks` (`questionsNeeded`) exceeds the usable questions (3 always fits: 6 = `MIN_GAME_QUESTIONS`). The **whole** deck is passed in — sudden death uses what is left. The first kick alternates between the teams on every replay (`starter`).

**Play (engine phases `question → answered → aim → kick → result → question…`, `finished`):**
- **Question:** whistle, the shared question card (badge = kick number, timer). The team answers, the teacher taps it (or A–F / 1–6).
- **Answered (1.2 s):** the card shows To'g'ri / Noto'g'ri / Vaqt tugadi (the correct answer is shown, like the other team games), then `proceed`.
- **Correct → aim:** the card closes, 5 numbered zones pop up in the goal (top-left, bottom-left, center, bottom-right, top-right), the keeper sways. Tap a zone or press 1–5.
- **Kick (1.4 s):** run-up → boot sound → the ball flies to the zone while the keeper dives to **his** zone. Same zone = **saved** (the ball ends in his gloves — at his chest for the center) → banner "GOL EMAS · Darvozabon to'pni qaytardi", otherwise **GOL!** (net ripple, crowd jumps, confetti, roar).
- **Wrong / time-out:** no aim — the kick goes **over the bar** → "GOL EMAS · Javob noto'g'ri, shuning uchun gol yo'q", so the class sees the answer, not the keeper, cost the goal. Result words are deliberately plain (GOL! / GOL EMAS — the user rejected "Ushladi"/"Tashqariga").
- **Result:** the banner + Continue (Space/Enter). Every kick is played (no early finish, the user's choice). After `kicks` each, a level score → **sudden death** (one kick each; decided after a pair; footer shows "Hal qiluvchi zarba!"). Deck empty → the game ends where it stands (draw if level) → `Podium` with goals.
- Sounds: `whistle`, `kick`, `goal`, `save`, `miss` (the noise helper in `sound.ts`), plus correct/wrong/tick/timeout/win.

**Play layout:** `KickTally` (team cards with kick pips, score in the middle) → the stadium (fills the free space; question card, aim pill and result banner overlay it) → footer (controls left, "3-zarba / 5" or the sudden-death chip center).

### Karvon yo'li (caravan race)

**Setup:** same test picker and timer stepper ("O'ylash uchun vaqt", default 30 s), 2–4 teams (names default "Ko'k karvon"…), **road length** `Qisqa 12 · O'rta 18 · Uzoq 24` steps. The road is never locked by test size: the **whole** deck is played; below `questionsFor(length)` usable a gentle "may not reach Xiva" note shows. Surprise squares are placed per game by `placeEvents` (one Vaha per half, one Bozor, never on/next to a city or each other).

**Play (engine phases `bet → question → reveal → move → bet…`, `finished`):**
- **Bet:** each team shows 1, 2 or 3 fingers; the teacher taps it in the strip under the map (or the team's key row). "Savolni ochish" (Space/Enter) unlocks only when every team has bet. Bets are visible (shown together, nothing to hide).
- **Question:** the card covers map + strip; options are display-only. Each team holds up a letter; the teacher taps it in that team's column. A tapped answer shows **only a lock** ("Qabul qilindi") + an undo icon — never the letter, so teams answering later can't copy. **The timer only ends the thinking time:** at 0 the header shows "Vaqt tugadi — kartochkalarni ko'taring!" and answers can still be entered. "Javoblarni ochish" (Space/Enter) works any time; an untapped team = no answer (= wrong).
- **Reveal:** correct option goes green; each column shows the team's letter, ✓/✗ and its result: `+N qadam` (×2 marked), `Bo'ron! −1`, `Shahar panohi`, `Joyida`/`Javobsiz`. "Karvonlar yo'lga!" → `go`.
- **Move rules (`moveFor`, computed at reveal):** correct → `bet` steps (×2 if the team holds a Bozor bonus, which is then used), capped at Xiva; wrong / no answer with bet 3 → 1 step back, never behind the last city reached (`shelter`: Samarqand 0, Buxoro `floor(length/2)`); bet 1–2 wrong → stays. Only a **forward move ending** on a square triggers it: Vaha = +1 hop (no chaining), Bozor = bonus for the next correct answer (kept through wrong answers). Storm/oasis hops don't trigger squares.
- **Move:** positions apply at `go`; caravans hop square by square (`STEP_S` 0.36 s; storms wait a beat and slide back slower), team cards show "+3"/"−1", the strip shows each result, float labels name the event. The page dispatches `settled` after `moveSeconds + 0.9 s` (1.9 s if an event happened) → next bet, or `finished` when a caravan is in Xiva or the deck is empty. Several caravans reaching Xiva in the same round tie (podium "Durang!"). "O'yinni yakunlash" (bet phase, after round 1, confirm) ends early; furthest wins.
- **Keyboard:** one row per team — team 1 `1–6`, team 2 `Q–Y`, team 3 `A–H`, team 4 `Z–N`; in bet the first 3 keys = 1/2/3, in question the n-th key = the n-th option. Space/Enter = the round's main button, P = pause (timed question only). No on-screen hint (clean screen).
- Sounds: `bet` click, `flip` (question), `tick`/`timeout`, `correct`/`wrong` on reveal (any team right → correct), `step` per hop, `storm`, `oasis`, `coins`, `win`.

**Play layout:** `TeamBar` (scores = steps, no active team: `turn=-1`) → the map (fills the free height, `meet`; container gradient matches sky/sand letterbox) → the fixed-height strip (`h-[clamp(92px,14.5vh,156px)]`, so bet ↔ results never resizes the map) → footer (controls left, "5-savol · 12 ta savol qoldi" center, finish right). The round card overlays map + strip only.

## Invariants & traps

- ⚠️ **Anti-cheat is by design; don't "simplify" it.** Each question appears once per game and never on both sides. MCQ options are reshuffled and re-lettered by position (true_false keeps its order). A miss never reveals the answer. Pause covers the whole screen with an opaque layer.
- ⚠️ **Team colors are hard-coded on purpose** (`teams.ts`): blue/red must survive every palette. Tints use `color-mix(…, var(--m3-surface-container-lowest))` so dark mode works. Never inline team hex elsewhere; import `TEAM_THEME`.
- ⚠️ Poses and animations are **derived from engine state** (`clock`, `lastPullAt`, `pulls`/`misses` counters used as React keys). Don't add effects/timeouts to drive them. One-shot animations (dust, ribbon swing, score pop) remount by key.
- ⚠️ **Sizes are fluid:** every play-view size is `clamp(min, vw+vh, max)` (question tiers by length, answers, badges, scoreboard, timer, meter, controls), so laptops, projectors and landscape tablets get no breakpoint jumps. Keep new play-view sizes in the same form. Fixed `text-[Npx]` there breaks small or 4K screens.
- Motion: everything is gated on `MOTION_ON && !useReducedMotion()`. Off → no idle loop, dust or confetti, and short fades instead. Only transform/opacity animate.
- ⚠️ **The play view is portaled to `<body>`** (`createPortal`). The shell wraps every page in a transformed `motion.div` (`pageTransition`), and `position: fixed` inside a transformed ancestor is fixed to THAT box, so the sidebar sat on top of the game and cropped the blue panel. Theme tokens live on `<html>`, so they still apply; the portal root re-adds `t-canvas font-t-body`. It needs `(min-width: 768px) and (orientation: landscape)`; otherwise it shows a "use a big screen" message.
- ⚠️ **Rig pivots:** framer rotates SVG groups around their bounding box, so every pivot group in `Puller` holds an invisible `<Pivot>` square centered on its joint (origin 50%/50%). Don't remove it or move joints without moving the pivot. `ROPE_Y = GROUND − 65` matches the hand position at the base lean (−26°); change both together.
- `useSearchParams` requires the page's `<Suspense>` wrapper (Next 16 build).
- ⚠️ **The game AI route takes the uid from the verified ID token, never from the body.** The `create/*` AI routes still trust a body `userId` (docs/AI.md) — don't copy them. The limit check passes `featureKey: null` (no plan feature needed).
- ⚠️ **Syllabus files are not uniform** (an array of categories or one bare object; chapters nested in `chapters` or sitting in the top array; chapters without a name — e.g. `maktab/2-sinf/tarbiya`, `maktab/9-sinf/geometriya`, the 1–5-sinf art/music files). `normalizeSyllabus` flattens all of them and topics are addressed by **position** (chapter i, topic j), never by the files' repeating `index`. The create pages read only `data[0]` and so miss chapters in those files — don't copy that. Panel and route must use the same normalizer, or positions drift.
- ⚠️ **Bare LaTeX is wrapped at display time** too: `buildDeck` and the AI review list run every stem/option through `fixMath` (lib/ai/fixMath.ts), so questions saved before the fix (or tests whose AI options lack `$…$`) still render in games.
- ⚠️ **AI sets are never written to Firestore** — they live in localStorage (`aiSet.ts`, try/catch around every access; blocked storage just means the set lasts for this visit). An AI pick has a synthetic `test.id` `ai-…` — never pass it to `fetchTeacherTest` or a `?testId=` link.
- ⚠️ **Board tile ↔ card morph** uses framer `layoutId={`tile-${n}`}`: the active tile renders as a plain empty slot (no layoutId) while the card's background holds the id; used tiles keep the id so the card shrinks back into them. Two mounted elements with the same id break the morph. Off when motion is off.
- ⚠️ **framer springs take only 2 keyframes.** `type: 'spring'` + an array like `scale: [1, 1.05, 1]` throws at runtime ("Only two keyframes currently supported with spring") and kills the component — the board's result row once never rendered because of it. Give keyframe props their own tween: `transition={{ default: {type:'spring',…}, scale: { duration: 0.5 } }}`.
- ⚠️ **`.m3-interactive` forces `position: relative`** (unlayered CSS in `components/ui/theme.css` beats Tailwind's `absolute`). An absolutely placed button with that class drops into normal flow — the podium's ✕ once landed on the trophy. Put the position on a wrapper `div` instead.
- Team-game colors are a deliberate hard-coded exception like `teams.ts`; keep them in `games/_lib/stage.ts` (wheel wedges in `lucky-wheel/_lib/theme.ts`, pitch in `penalty/_lib/theme.ts`).
- ⚠️ **The keeper's dive is drawn when the answer is given** (page → `answer{keeperZone}`), stored in the engine and only shown in the kick. The aim tap can't change it and nothing on screen hints at it. Don't move the draw to the aim or the animation.
- ⚠️ **Keeper dives are solved against the ball's end points** (`DIVES` in `Keeper.tsx` ↔ `ZONES` / `KEEPER_AT` / `KEEPER_CHEST` in `Stadium.tsx`): a glove lands on the zone. Moving a zone, the keeper's spot/scale or the figure's arms means re-solving the dives, or saves land on the face.
- Headless screenshots of the play view need no login: a temporary unguarded route rendering `Stadium`/`KickTally`/`KickBanner` with fixed props, captured over the Chrome DevTools protocol (`--virtual-time-budget` stalls the dev build's hydration). Delete the route afterwards.
- ⚠️ **Keyframe arrays need one value per `times` entry.** The stadium's ball/shadow paths give every property (rotate and opacity too) the same length; a short array with a longer `times` animates wrongly. Looping moves (keeper sway / idle) put the loop on their own property only (`transition: { default: settle, x: loop }`), or the dive's "get up" would loop too.
- ⚠️ **The wheel result comes from the engine, never from the drag.** `spin` carries a random `target`; the flick only chooses strength/direction and the animation solves the angle to land inside that wedge (± jitter). Don't derive the result from where the wheel physically stops — a slow, careful drag could then steer it.
- ⚠️ **framer's `style={{ rotate }}` / `animate` writes the whole `transform`,** so a Tailwind `-translate-x-1/2` on the same element is lost (the wheel pointer and the "spin harder" chip once jumped off-center). Center with a wrapper `div`, animate the inner element.
- ⚠️ **Shared team-game components are presentational.** Each game's engine owns its rules and maps its state to their props (`QuestionCard` knows nothing about tiles or wheels). Add rules to the engine, not to the shared card.
- Sounds must start from a click (browser autoplay policy). Every game starts from a click, so the lazy `AudioContext` in `sound.ts` is always allowed. Never call `sfx` on mount.
- ⚠️ **Caravan answers stay hidden until reveal** (lock only, no letter) — same anti-cheat stance as above; don't show the picked letter in the question phase. The caravan timer deliberately does NOT close answering (simultaneous cards are entered after time is up).
- ⚠️ **Caravan lanes:** each team has a fixed vertical lane around the road (`spot` = node + `(team − (n−1)/2) × laneGap(n)`), drawn top lane first. Moving the road (`X0/X1/MID_Y/AMP`), `CAMEL_SCALE` or the lanes means re-checking that 4 lanes + labels still fit the 1600×640 box.
- ⚠️ **Camel legs end at 0°:** swing keyframes are `[0, ±14, 0, ∓14, 0]` with a finite `repeat` from `walkSeconds`; a cycle that ends off-zero leaves the legs splayed after the walk.
- The Games nav entry is appended late in `navItems` (topbar inlines `slice(0, 5)`). Its `soon` flag support stays in the layout for future items.

## Designer brief: Rive character (planned replacement for `Puller`)

The user chose designer animation (Rive) for the final characters. Until a file exists, `Puller.tsx` is the shipping placeholder. A delivered file must match this contract so it drops in without touching the engine:

- **One artboard `Puller`**, facing RIGHT, feet at the artboard's bottom-center; the hands must sit at **65 units above the feet** (the rope height) in the base pull pose. The game mirrors it for the Red team.
- **Team color** comes from an input, not separate files: a number input `team` (0 = blue `#2563eb`, 1 = red `#dc2626`) or a bound color property. A second shade (`#1e40af` / `#991b1b`) is used for the back puller.
- **State machine `pose`** with one number input `pose`: 0 stand (ready stance, hands on the rope), 1 idle (looping strain), 2 heave (one-shot ~0.45 s backward step + strong lean), 3 lurch (one-shot ~0.45 s dragged forward, surprised face), 4 droop (after a wrong answer), 5 fall (one-shot, ends lying down), 6 cheer (looping hop, happy face). Expressions are part of each state (strain / surprised / sad / happy).
- Style: minimal flat, Uzbek-inspired (doppi cap, atlas/ikat shirt pattern), readable at ~150 px tall on a projector, light and dark backgrounds.
- Integration plan: add `@rive-app/react-canvas`, render one `<Rive>` per figure inside the arena group, map `poseFor()` → the `pose` input; keep `Puller` as the fallback when the file fails to load or motion is off.

## Known issues / dead code (verified 2026-10-17)

- ⚠️ **The Maktab local banks are unreachable (verified 2026-10-21):** every `local_dbs/{subject}/{grade}.json` on `scanqr-64512.firebasestorage.app` answers **402 Payment Required** (that bucket type needs the Blaze plan). `findMaktabBankQuestions` logs the error and returns null, so create/maktab AND the games silently use the AI for every topic. Fix the billing, not the code.

- The non-live hub card (live quiz) is a placeholder with no route.
- The TestCard quick-launch only opens Arqon tortish; the board, the wheel, the penalty and the caravan games are reached from the hub (all accept `?testId=`).
- Arqon tortish has no sounds yet (the board does). Results are not persisted (deliberate for v1).

## How to verify changes

`npx tsc --noEmit`, `npx eslint app/teacher/games app/api/teacher/games services/gameQuestionService.ts`. Then `npm run dev` → `/teacher/games` → Arqon tortish:
1. A test with fewer than 6 usable questions is disabled; a mixed test shows correct skipped counts.
2. A 1-min game: correct answers pull the rope, and the score pops; a wrong one shakes and shows the 2 s lock without revealing the answer; when time runs out the result is correct (winner or draw).
3. ∞ with a small test ends with "Savollar tugadi"; a 5-step lead wins instantly with confetti.
4. Pause hides everything; Exit asks for confirmation; Play again reshuffles; keys 1–4 / 7–0 work; LaTeX and images render.
5. Check light, dark and a second palette: blue and red stay distinct.
6. The TestCard gamepad button opens setup with that test's summary preloaded.
7. Board: a test with 8 usable → only one size chip (8). With 3 teams + 15 s: Start goes full screen; options open with the question; a correct answer shows "+N ochko" and the score counts up; wrong shows the right answer; the timer runs out → "Vaqt tugadi"; pause during a question hides it. The last tile → podium; Finish early → confirm → podium; ties share a place. Mute persists after reload.
8. Wheel: 2 teams + 3 rounds. Flick the wheel hard → long spin, pointer flaps and clicks; a gentle drag → "Kuchliroq aylantiring!"; Space spins too. Points → the value pops in the hub, then the question opens worth that much. ×2 → gold beat, same team spins again for double. Bankrot → the card, scores unchanged, next team. After 3 rounds → podium (the last card's button reads "Natijalar").
9. Penalty: 3 kicks + 15 s. Whistle → question; correct → the card shows "To'g'ri!" then the 5 zones; tap one → run-up, ball, keeper dive → GOL! (net ripple, confetti) or GOL EMAS (same zone, ~1 in 5; the ball lands in the gloves). Wrong / time-out → GOL EMAS with no aim, ball over the bar. Pips fill per team; 2:0 after 2 each still plays the last kick. Level after 3 each → "Hal qiluvchi zarba!" until a pair decides. Play again → the other team kicks first. Reduced motion: the same flow without the flights.
10. Caravan: 3 teams, Qisqa, 15 s. Bet 2/3/1 → Savolni ochish unlocks only after all three; tap answers (column shows a lock, undo reopens the letters); let the timer run out → "Vaqt tugadi" banner and taps still work; Javoblarni ochish → letters + ✓/✗ + results; Karvonlar yo'lga → camels hop, team cards show +N/−1. Wrong at 3 from step 0 → "Shahar panohi", stays. Land on Vaha → extra hop + label; on Bozor → ×2 badge, next correct moves double. Reach Xiva → podium. Keys: `1 2 3 / q w e / a s d` bet, the same rows answer; Space advances. Reduced motion: no hops, positions jump.
11. AI tab (any game): Maktab uchun → 6-sinf → Matematika → pick "Algebraik ifodalar" (summary + O'zgartirish) → Create → the questions follow the syllabus notes. Ixtisoslashgan maktab shows 5–7-sinf only; Abiturient needs a subject + topic. 9-sinf Geometriya lists all 5 chapters. Own topic: type one or tap an example → the suggested count changes with the game's settings (penalty 5 kicks → 15, 10 kicks → 30) → Create → wait view → ready list, answers hidden; the switch shows them with the right one green; ✕ removes one and the settings summary follows. Switch to "Mening testlarim" and back: each tab keeps its own pick. Open another game → the same set is in its AI tab. Start → the game plays the AI questions. A request without a login → 401. A teacher with no credits left → warning + "Tarifni ko'rish".

# IELTS practice dataset — authoring source

Everything needed to **write a new IELTS paper as JSON** and get it into the platform
dataset: the per-module structure specs, ready-made papers, and the checker.

Nothing here is read at runtime — no import, no API route serves this folder. It is the
source of truth for the **platform dataset**: an admin pastes a file into `/admin/ielts` →
**Import JSON**, which validates it with [`lib/ielts/importValidation.ts`](../../lib/ielts/importValidation.ts)
and writes it through `saveIeltsTest` / `saveWritingTest` / `saveSpeakingTest` with
`{ asPlatform: true }`.

Collections, the answer-key split and the runner: [docs/IELTS.md](../../docs/IELTS.md).

---

## The structure specs

| File | Covers |
|---|---|
| [STRUCTURE-READING.md](STRUCTURE-READING.md) | Reading envelope: `passages`, paragraph labels, Cambridge paper shape |
| [STRUCTURE-LISTENING.md](STRUCTURE-LISTENING.md) | Listening envelope: `parts`, `audio_url`, transcripts, part-by-part design |
| [STRUCTURE-QUESTION-TYPES.md](STRUCTURE-QUESTION-TYPES.md) | **The 13 question types** — shared by Reading *and* Listening |
| [STRUCTURE-WRITING.md](STRUCTURE-WRITING.md) | Writing: `task1` / `task2`, Academic vs GT, rubric context |
| [STRUCTURE-SPEAKING.md](STRUCTURE-SPEAKING.md) | Speaking: Part 1 / cue card / Part 3 |
| [LLM-PROMPT.md](LLM-PROMPT.md) | Copy-paste briefs for asking a model to generate a paper |

### Generating a paper with an LLM

Give the model the file(s) for the module, then ask for the paper:

| Module | Hand over |
|---|---|
| Reading | `STRUCTURE-READING.md` **+** `STRUCTURE-QUESTION-TYPES.md` |
| Listening | `STRUCTURE-LISTENING.md` **+** `STRUCTURE-QUESTION-TYPES.md` |
| Writing | `STRUCTURE-WRITING.md` |
| Speaking | `STRUCTURE-SPEAKING.md` |

[LLM-PROMPT.md](LLM-PROMPT.md) has the exact wording to use, plus what a model **cannot**
produce (audio files, chart images, diagram images — those must be uploaded by a human and
their URLs pasted in).

---

## Ready-made papers

| File | Module | Questions | Purpose |
|---|---|---|---|
| `reading/academic-01.json` | Academic Reading | 40 | Full paper — water clocks / hedgerows / expert forecasting |
| `reading/academic-02.json` | Academic Reading | 40 | Full paper — saffron / mass timber / the psychology of waiting |
| `reading/_template-all-question-types.json` | Academic Reading | 24 | Fixture exercising **all 13** question types. Import this first when testing the pipeline. |
| `reading/ielts-reading-c18-test{1-4}.json` | Academic Reading | 40 each | Cambridge IELTS 18, Tests 1–4 |
| `reading/ielts-reading-c19-test{1-4}.json` | Academic Reading | 40 each | Cambridge IELTS 19, Tests 1–4 — every free-text answer located verbatim in its passage (`passage_reference`) |
| `listening/ielts-listening-c19-test{1-4}.json` | Listening | 40 each | Cambridge IELTS 19, Tests 1–4 — audio + Test 1 map in `public/ielts/listening/cambridge_19_*`; scripts checked against the recordings |
| `listening/ielts-listening-c18-test{1-4}.json` | Listening | 40 each | Cambridge IELTS 18, Tests 1–4 — full audioscripts as `transcript`, every answer row has a `passage_reference` into it (review → **Locate**). Audio + map served from `public/ielts/listening/` — see below. Audio checked against the official recordings (every part matches its script; every free-text answer is spoken). |

### Listening media (audio + map images)

The C18 listening media is **served by the app itself** from `public/`, not Firebase Storage:

```
public/ielts/listening/<test_id>/part1.mp3 … part4.mp3
public/ielts/listening/<test_id>/part2-diagram.png        (Test 2 map)
```

The papers point at them with same-site paths — `"audio_url": "/ielts/listening/cambridge_18_listening_test_1/part1.mp3"` —
which the validator accepts alongside absolute `https://` URLs. The files are committed (≈110 MB)
so every deploy carries them. Adding another paper the same way: drop the files in
`public/ielts/listening/<test_id>/`, write the `/ielts/listening/…` paths into the JSON, verify, import.

Prefer Firebase Storage instead? `npm run ielts:media -- <paper.json> [--apply]` uploads
`listening/media/<test_id>/part{N}.mp3` + `part{N}-diagram.png` and replaces `"TODO"` URLs.

Between the two full papers, twelve of the thirteen types appear in exam-realistic
proportions; `diagram_completion` appears only in the template, because it needs a hosted
image to be worth putting on a real paper.

**These passages are original work written to Cambridge specification** (3 passages, 40
questions, 60 minutes, ascending difficulty, standard instruction wording). They are not
reproductions of Cambridge IELTS texts — those are copyrighted and must never be pasted
into the platform dataset.

---

## Checking a file before you import it

```bash
npm run ielts:verify                                   # every .json in this folder
npm run ielts:verify -- reading                        # one sub-folder
npm run ielts:verify -- "data/ielts practise/reading/academic-01.json"
npm run ielts:verify -- --strict                       # warnings fail the run too
```

The CLI runs the **exact** validator the admin importer runs, so "verify passes" and "the
paste box accepts it" mean the same thing.

- **Errors** block the import and name the JSON path (`passages[1].questions[2].questions[0].correct_answer`)
  plus a human location (`Passage 2 · block 3 (matching_headings) · Q17`).
- **Warnings** never block, but for the curated dataset in this folder you should fix them.

Expected warnings on the fixture: `_template-all-question-types.json` reports 1 passage /
24 questions / no `diagram_url` — that is deliberate, it is a pipeline fixture, not a paper.

It catches, among ~60 checks, the things that fail **silently** rather than loudly:

- authored `question_number`s vs what the numbering engine actually assigns — a
  `list_selection` block consumes **one number per correct letter**, so everything after it
  shifts;
- gap-token count vs answer-row count in `summary_completion` / `table_completion` /
  `flowchart_completion` — tokens are **positional**, so a mismatch misaligns every answer
  in the block;
- per-type `correct_answer` shape (string vs 1-element array vs multi-letter array), and
  every letter answer resolving to a real option id;
- accepted answers that exceed their own `word_limit` (the grader would reject its own key);
- free-text answers made only of single letters, which the grader reads as option letters
  (short real words like `["map"]` are fine — the old ≤3-letter warning was a false positive);
- a two-answer `multiple_choice` (must be `list_selection` — otherwise it renders
  single-select and is unanswerable);
- `matching_headings` reusing a heading or pointing at a non-existent paragraph label;
- `passage_reference` strings that are not verbatim in the passage, so the review page's
  **Locate** button does nothing;
- table rows that don't match the header count.

---

## Importing

**From the CLI** (no pasting): `npm run ielts:import -- "data/ielts practise/listening"` validates
and shows the plan; add `--apply` to write (Reading/Listening only — same validator and same
Firestore writes as the admin importer). Re-importing the same `test_id` updates in place.

**From the admin panel:**

1. Sign in as a `super_admin` and open `/admin/ielts` → the module's tab → **Import JSON**.
2. Paste the whole file, press **Validate** (shows question count, type breakdown, and every
   error/warning with its path), then **Import to dataset**.
3. For Reading/Listening the save renumbers the paper, extracts the key into
   `ielts_answer_keys/{testId}`, strips `correct_answer` from the public doc
   (`answers_split: true`) and writes `ielts_test_meta/{testId}` in the same batch.
4. Verify: `/teacher/ielts/{reading|listening}/view/{id}` shows the paper answer-free with
   the "answers hidden (platform test)" chip; the test appears in the student Practice
   Library.

`test_id` is fixed in each file here, so **re-importing overwrites** rather than duplicating.

---

## After importing: order and visibility

The **Platform catalog** section of `/admin/ielts` controls how the dataset is presented:

- **↑ / ↓** reorder a skill's tests; press **Save order** to persist. That order is what
  teachers see in their platform library and the assign-test picker, and what students see
  in the Practice Library.
- The **students** and **teachers** toggles hide a test from that audience without deleting
  it. Hiding affects the browsable lists only — attempts already taken and tests already
  assigned keep working.

Both live on the test doc *and* its `ielts_test_meta` doc, and survive a re-save/edit.

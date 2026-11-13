# IELTS question blocks — the 13 types (Reading **and** Listening)

> Companion file. Pair it with [STRUCTURE-READING.md](STRUCTURE-READING.md) **or**
> [STRUCTURE-LISTENING.md](STRUCTURE-LISTENING.md) — those define the document envelope
> (passages / audio parts); this file defines everything that goes inside `questions`.
>
> Everything here is enforced by `lib/ielts/importValidation.ts`. Check a file before
> importing with `npm run ielts:verify -- path/to/file.json`.

---

## 1. The anatomy of a question block

A passage (Reading) or part (Listening) carries a `questions` array. **Each entry of that
array is a question BLOCK** — one rubric plus the rows it governs:

```json
{
  "type": "true_false_not_given",
  "instructions": "Do the following statements agree with the information given in the passage?",
  "questions": [
    { "question_number": 1, "statement": "…", "correct_answer": "TRUE", "passage_reference": "…" },
    { "question_number": 2, "statement": "…", "correct_answer": "NOT GIVEN" }
  ]
}
```

| Block field | Required | Notes |
|---|---|---|
| `type` | ✅ | One of the 13 names below. Any other value is rejected. |
| `instructions` | ✅ | The rubric shown above the questions. Write it exactly as Cambridge would. |
| `questions` | ✅ | Non-empty array of **answer rows**. |
| `options` | per type | Block-level option list. Shape differs per type — see the table. |
| `word_limit` | free-text types | Whole number **1–5**. The "NO MORE THAN X WORDS" cap; the grader enforces it. |
| `summary_title`, `summary_text` | summary_completion | |
| `table_title`, `headers`, `rows` | table_completion | |
| `flowchart_title`, `steps` | flowchart_completion | |
| `diagram_title`, `diagram_url`, `diagram_alt_text` | diagram_completion | |
| `start_question`, `end_question` | ❌ **never author** | Computed on import. |

| Row field | Notes |
|---|---|
| `correct_answer` | ✅ always. **The shape differs per type — get it wrong and every row in the block grades wrong.** |
| `question_number` | Optional; **recomputed on import**. Author it anyway — the verifier compares yours with the computed one, which is how you catch a numbering drift. |
| `statement` / `question_text` / `sentence` / `sentence_start` / `target_paragraph` | The row's visible text — which one applies depends on the type. |
| `options` | Row-level options — **only** `multiple_choice` and `list_selection` use these. |
| `passage_reference` | Optional. Must be a **verbatim substring** of the passage (Reading) or transcript (Listening); the review page's "Locate" button searches for it literally. |
| `explanation` | Optional teaching note shown after grading. |

Unknown fields are dropped on import (the validator warns about each one).

---

## 2. Numbering: one global 1…40 counter

Question numbers run **across the whole paper**, not per passage/part. The counter walks
passages/parts in order, blocks in order, rows in order, and assigns one number per row —
**except `list_selection`, which consumes one number per correct letter.**

```
block 1  true_false_not_given   3 rows                        → Q1, Q2, Q3
block 2  list_selection         1 row, correct_answer 2 long  → Q4–Q5   ← eats TWO numbers
block 3  short_answer           3 rows                        → Q6, Q7, Q8
```

This is the single most common authoring mistake: forget it and every number after the
`list_selection` block is off by one. The import renumbers regardless, so nothing breaks —
but your `passage_reference` proof-reading and any numbers you wrote in `instructions`
("Questions 14–20") will be wrong. The verifier reports the exact drift.

---

## 3. Gap tokens are POSITIONAL

Gaps in `summary_text`, table `cells` and flowchart `steps` are written as `[1]`, `[ 7 ]`,
`[_]` or `[]`. **The number inside is ignored.** Only the order matters: the i-th token in
the block maps to the i-th row of `questions`.

> **Hard rule: gap-token count must equal answer-row count.** A mismatch is an import
> error, because otherwise every answer in the block silently shifts.

Keep the numbers inside the tokens accurate anyway — they are what a human proof-reads
against.

---

## 4. Writing accepted answers (free-text types)

`correct_answer` for a free-text gap is an **array of accepted forms**:

```json
"correct_answer": ["water clock", "clepsydra"]
```

Two pieces of grammar are understood inside a single string:

| Syntax | Meaning |
|---|---|
| `"taxi/cab"` | either word is accepted |
| `"(the) library"` | the parenthetical part is optional — `library` and `the library` both pass |

**Do not hand-list these** — the grader already handles them automatically:

- UK ↔ US spelling (`colour`/`color`, `organise`/`organize`)
- digits ↔ words (`19` / `nineteen`), thousands separators (`1,000` / `1000`)
- letter case and surrounding whitespace/punctuation

It is **strict** about singular vs plural: if both are acceptable, list both.

**Word limit counting** (official convention, enforced by the grader *and* the verifier):
whitespace-separated tokens; a hyphenated word is **one** word; text inside `(…)` doesn't
count — so `"(the) water-clock"` counts as **one** word. An accepted answer longer than the
block's `word_limit` is an import error: the grader would otherwise reject its own key.

---

## 5. The 13 types

### 5.1 Quick reference

| Type | Block `options` | Row text field | `correct_answer` |
|---|---|---|---|
| `matching_headings` | `[{id:"i", text}]` | `target_paragraph` | `"iv"` — plain string |
| `matching_paragraph_information` | `["A","B","C"]` | `statement` | `"C"` — plain string |
| `matching_features` | `[{id:"A", text}]` | `statement` | `["A"]` — 1-element array |
| `matching_sentence_endings` | `[{id:"A", text}]` | `sentence_start` | `["A"]` — 1-element array |
| `true_false_not_given` | optional `[{label, description}]` | `statement` | `"TRUE"` — plain string |
| `multiple_choice` | — (row-level) | `question_text` + row `options` | `["B"]` — 1-element array |
| `list_selection` | — (row-level) | `question_text` + row `options` | `["A","C"]` — 2+ letters |
| `sentence_completion` | `null` | `sentence` (1 gap token) | `["answer","alt"]` |
| `short_answer` | — | `question_text` | `["answer","alt"]` |
| `summary_completion` | `null` **or** word bank | — (rows are answers only) | free `["answer"]` / bank `"A"` |
| `table_completion` | `null` **or** word bank | — | free `["answer"]` / bank `"A"` |
| `flowchart_completion` | `null` **or** word bank | — | free `["answer"]` / bank `"A"` |
| `diagram_completion` | `null` **or** word bank | — | free `["answer"]` / bank `"A"` |

> **String vs 1-element array is not cosmetic.** `matching_headings` wants `"iv"`;
> `matching_features` wants `["A"]`. The grader branches on it.

---

### 5.2 `matching_headings`

Reading only, in practice. Each heading may be used **once**.

```json
{
  "type": "matching_headings",
  "instructions": "The passage has six paragraphs, A–F.\nChoose the correct heading for each paragraph from the list of headings below.",
  "options": [
    { "id": "i",   "text": "An unexpected source of funding" },
    { "id": "ii",  "text": "Early attempts and their limits" },
    { "id": "iii", "text": "How the mechanism actually worked" },
    { "id": "iv",  "text": "A rival technology emerges" },
    { "id": "v",   "text": "Lasting influence on modern design" }
  ],
  "questions": [
    { "question_number": 1, "target_paragraph": "A", "correct_answer": "ii" },
    { "question_number": 2, "target_paragraph": "B", "correct_answer": "iii" }
  ]
}
```

Rules
- `options[].id` is a lower-case roman numeral by convention (`i`, `ii`, `iii`…).
- `target_paragraph` **must match a paragraph `label`** in the passage — otherwise the
  student sees "Paragraph ?" and the import fails.
- **More headings than paragraphs** (distractors), otherwise it's a process of elimination.
- No two rows may share a `correct_answer`.

---

### 5.3 `matching_paragraph_information`

"Which paragraph contains the following information?" A paragraph letter **may repeat**.

```json
{
  "type": "matching_paragraph_information",
  "instructions": "Which paragraph contains the following information?\nWrite the correct letter, A–F.\nNB You may use any letter more than once.",
  "options": ["A", "B", "C", "D", "E", "F"],
  "questions": [
    { "question_number": 8, "statement": "a reference to the cost of early prototypes", "correct_answer": "C" },
    { "question_number": 9, "statement": "an explanation of why the design failed in winter", "correct_answer": "E" }
  ]
}
```

`options` here are **plain strings**, not `{id, text}` objects.

---

### 5.4 `matching_features`

Classify statements against a short list of features (researchers, countries, periods…).
Letters **may repeat**.

```json
{
  "type": "matching_features",
  "instructions": "Look at the following statements and the list of researchers below.\nMatch each statement with the correct researcher, A–D.",
  "options": [
    { "id": "A", "text": "Tetlock" },
    { "id": "B", "text": "Kahneman" },
    { "id": "C", "text": "Meehl" },
    { "id": "D", "text": "Simon" }
  ],
  "questions": [
    { "question_number": 14, "statement": "argued that simple models outperform experts", "correct_answer": ["C"] }
  ]
}
```

`correct_answer` is a **one-element array**.

---

### 5.5 `matching_sentence_endings`

```json
{
  "type": "matching_sentence_endings",
  "instructions": "Complete each sentence with the correct ending, A–F, below.",
  "options": [
    { "id": "A", "text": "because the water froze in winter." },
    { "id": "B", "text": "although the design was never patented." },
    { "id": "C", "text": "until mechanical clocks became cheap." }
  ],
  "questions": [
    { "question_number": 20, "sentence_start": "Water clocks remained in daily use", "correct_answer": ["C"] }
  ]
}
```

Offer **more endings than sentence starts**. `correct_answer` is a one-element array.

---

### 5.6 `true_false_not_given`

```json
{
  "type": "true_false_not_given",
  "instructions": "Do the following statements agree with the information given in the passage?\nWrite TRUE / FALSE / NOT GIVEN.",
  "options": [
    { "label": "TRUE",      "description": "if the statement agrees with the information" },
    { "label": "FALSE",     "description": "if the statement contradicts the information" },
    { "label": "NOT GIVEN", "description": "if there is no information on this" }
  ],
  "questions": [
    { "question_number": 1, "statement": "Water clocks were invented in Egypt.", "correct_answer": "TRUE",
      "passage_reference": "the earliest surviving example was found in the tomb of Amenhotep I" }
  ]
}
```

- `options` may be **omitted** — the runner then shows the default TRUE / FALSE / NOT GIVEN.
- For a **YES / NO / NOT GIVEN** ("do the following statements agree with the *claims of
  the writer*") block you **must** supply `options` with those labels; `correct_answer`
  must then be `"YES"` / `"NO"` / `"NOT GIVEN"`.
- `correct_answer` must match a `label` **exactly**, including case.

---

### 5.7 `multiple_choice` — exactly ONE correct letter

```json
{
  "type": "multiple_choice",
  "instructions": "Choose the correct letter, A, B, C or D.",
  "questions": [
    {
      "question_number": 27,
      "question_text": "What does the writer say about the first prototype?",
      "options": [
        { "id": "A", "text": "It was cheaper than expected." },
        { "id": "B", "text": "It could not be scaled up." },
        { "id": "C", "text": "It was rejected on aesthetic grounds." },
        { "id": "D", "text": "It inspired an unrelated invention." }
      ],
      "correct_answer": ["B"]
    }
  ]
}
```

- `options` live **on the row**, not on the block (each question has its own set).
- 3–4 options; `correct_answer` is a **one-element array**.
- 🚫 **Never put two letters here.** See the next type.

---

### 5.8 `list_selection` — "Choose TWO letters"

```json
{
  "type": "list_selection",
  "instructions": "Choose TWO letters, A–E.",
  "questions": [
    {
      "question_number": 31,
      "question_text": "Which TWO benefits of hedgerows does the writer mention?",
      "options": [
        { "id": "A", "text": "flood control" },
        { "id": "B", "text": "timber production" },
        { "id": "C", "text": "wildlife corridors" },
        { "id": "D", "text": "reduced fencing costs" },
        { "id": "E", "text": "carbon storage" }
      ],
      "correct_answer": ["A", "C"]
    }
  ]
}
```

- **One row per block.** The row consumes `correct_answer.length` question numbers
  (here Q31 **and** Q32) and earns one mark per correct letter.
- ≥3 options, ≥2 correct letters, and not every option may be correct.
- 🚫 **Every "Choose TWO/THREE letters" question must be this type.** Public test documents
  carry no answers, so the student runner detects multi-select *only* from the
  `list_selection` span. A two-answer `multiple_choice` renders as single-select and is
  literally unanswerable.

---

### 5.9 `sentence_completion`

```json
{
  "type": "sentence_completion",
  "instructions": "Complete the sentences below.\nChoose NO MORE THAN TWO WORDS from the passage for each answer.",
  "word_limit": 2,
  "options": null,
  "questions": [
    { "question_number": 33, "sentence": "The mechanism was regulated by a floating [1].",
      "correct_answer": ["valve", "float valve"] }
  ]
}
```

- Each row's `sentence` contains **exactly one** gap token.
- `options: null` = typed answers. A word bank (`options: [{id, text}]`) is allowed, and
  then `correct_answer` becomes the option letter as a plain string (`"D"`).

---

### 5.10 `short_answer`

```json
{
  "type": "short_answer",
  "instructions": "Answer the questions below.\nChoose NO MORE THAN THREE WORDS AND/OR A NUMBER from the passage for each answer.",
  "word_limit": 3,
  "questions": [
    { "question_number": 38, "question_text": "What powered the earliest models?",
      "correct_answer": ["(falling) water", "water pressure"] }
  ]
}
```

---

### 5.11 `summary_completion`

Free text:

```json
{
  "type": "summary_completion",
  "instructions": "Complete the summary below.\nChoose NO MORE THAN TWO WORDS from the passage for each answer.",
  "summary_title": "The spread of the water clock",
  "summary_text": "Early water clocks measured time by the steady flow of water through a small [1]. Because the flow slowed as the vessel emptied, later designs added a [2] to keep the pressure constant.",
  "word_limit": 2,
  "options": null,
  "questions": [
    { "question_number": 9,  "correct_answer": ["aperture", "hole"] },
    { "question_number": 10, "correct_answer": ["reservoir"] }
  ]
}
```

Word bank:

```json
{
  "type": "summary_completion",
  "instructions": "Complete the summary using the list of words, A–F, below.",
  "summary_text": "The technique spread first to [1] and only later to [2].",
  "options": [
    { "id": "A", "text": "Greece" }, { "id": "B", "text": "Persia" },
    { "id": "C", "text": "China" }, { "id": "D", "text": "Rome" }
  ],
  "questions": [
    { "question_number": 9,  "correct_answer": "B" },
    { "question_number": 10, "correct_answer": "D" }
  ]
}
```

- Rows carry **no visible text** — the summary paragraph is the question. Row order = gap order.
- `questions.length` must equal the number of gap tokens in `summary_text`.
- ⚠️ **Always write free-text answers as an array** (`["map"]`, `["son"]`). A *plain string*
  answer of three letters or fewer is read by the grader as an option letter (that is how
  word-bank mode is detected), and so is an array whose every form is a **single letter**.
  Short real words in an array — `["map"]`, `["ice"]`, `["gut"]` — grade as text (verified).

---

### 5.12 `table_completion`

```json
{
  "type": "table_completion",
  "instructions": "Complete the table below.\nChoose ONE WORD ONLY from the passage for each answer.",
  "table_title": "Materials used in each period",
  "word_limit": 1,
  "options": null,
  "headers": ["Period", "Material", "Main drawback"],
  "rows": [
    { "cells": ["1600s", "[1]", "cracked in frost"] },
    { "cells": ["1700s", "granite", "very slow to [2]"] }
  ],
  "questions": [
    { "question_number": 21, "correct_answer": ["timber", "wood"] },
    { "question_number": 22, "correct_answer": ["quarry"] }
  ]
}
```

- Every `rows[].cells` array must be exactly `headers.length` long — pad with `""`.
- Gap tokens are read **row by row, left to right**; that order must match `questions`.

---

### 5.13 `flowchart_completion`

```json
{
  "type": "flowchart_completion",
  "instructions": "Complete the flow-chart below.\nChoose NO MORE THAN TWO WORDS from the passage for each answer.",
  "flowchart_title": "How a saffron crocus is harvested",
  "word_limit": 2,
  "options": null,
  "steps": [
    "Flowers are picked before [1].",
    "The three red [2] are separated by hand.",
    "The threads are dried over a low heat."
  ],
  "questions": [
    { "question_number": 30, "correct_answer": ["sunrise", "dawn"] },
    { "question_number": 31, "correct_answer": ["stigmas"] }
  ]
}
```

One `steps` entry = one box. Steps without gaps are fine and normal.

---

### 5.14 `diagram_completion`

```json
{
  "type": "diagram_completion",
  "instructions": "Label the diagram below.\nChoose NO MORE THAN TWO WORDS from the passage for each answer.",
  "diagram_title": "Cross-section of the tower",
  "diagram_url": "https://firebasestorage.googleapis.com/…/ielts_diagrams%2Ftower.png?alt=media",
  "diagram_alt_text": "Cross-section showing the base and shaft of the lighthouse",
  "word_limit": 2,
  "options": null,
  "questions": [
    { "question_number": 23, "correct_answer": ["cylindrical"] },
    { "question_number": 24, "correct_answer": ["waves"] }
  ]
}
```

- No gap tokens here — the numbered labels live **inside the image**, so row order must
  match the label numbers printed on it.
- `diagram_url` must be an already-hosted absolute `https://` image (upload it to Firebase
  Storage under `ielts_diagrams/` first). Without it the student sees an empty frame — the
  validator warns.
- 🚫 **An LLM cannot invent this image.** Don't generate `diagram_completion` blocks unless
  you were given a real URL.

---

## 6. Checklist before you hand the JSON over

- [ ] Every `correct_answer` matches the shape in §5.1 (string vs 1-element array).
- [ ] Every letter answer exists in the right option list (block-level or row-level).
- [ ] "Choose TWO letters" → `list_selection`, and the numbers after it are shifted.
- [ ] Gap-token count == answer-row count in every summary / table / flowchart block.
- [ ] `matching_headings`: more headings than paragraphs, each used once,
      `target_paragraph` matches a real paragraph label.
- [ ] Free-text answers fit `word_limit`; free-text answers are arrays, never a lone single letter.
- [ ] Every `passage_reference` is copied character-for-character from the passage.
- [ ] Numbers run 1…40 with no gaps or repeats.

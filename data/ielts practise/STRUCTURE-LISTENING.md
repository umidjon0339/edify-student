# IELTS **Listening** — JSON structure spec

> **Using this with an LLM?** Hand over **this file *and*
> [STRUCTURE-QUESTION-TYPES.md](STRUCTURE-QUESTION-TYPES.md)**. Note the hard constraint in
> §4: an LLM **cannot** produce the audio, so it can only draft the transcript + questions —
> a human must record/upload the audio and paste the URLs in before import.

---

## 1. The envelope

```json
{
  "test_id": "platform_listening_01",
  "module": "listening",
  "test_title": "Listening Practice Test 1",
  "total_time_minutes": 32,
  "parts": [ /* 1–4 part objects */ ]
}
```

| Field | Required | Rules |
|---|---|---|
| `module` | ✅ | Literally `"listening"`. |
| `test_title` | ✅ | ≤150 characters. |
| `test_id` | recommended | 3–120 chars, `A–Z a–z 0–9 _ -`. It is the Firestore document id — **re-importing the same id overwrites** the test. |
| `total_time_minutes` | optional | Defaults to 32 (30 min audio + 2 min review; the real exam adds 10 min transfer time on paper). |
| `parts` | ✅ | 1–4 parts. A full paper has **exactly 4**. |
| `test_category` | ignore | Listening has one band table; the field has no effect. |

---

## 2. A part

```json
{
  "audio_url": "https://firebasestorage.googleapis.com/…/ielts_audio%2Ftest01%2Fpart1.mp3?alt=media",
  "audio_duration_seconds": 312,
  "transcript": "WOMAN: Good morning, Greenfield Community Centre…",
  "questions": [ /* question blocks — see STRUCTURE-QUESTION-TYPES.md */ ]
}
```

| Field | Required | Rules |
|---|---|---|
| `audio_url` | ✅ | Absolute `https://` URL of an uploaded audio file, or a same-site path (`/ielts/listening/…/part1.mp3`) for a file in `public/`. **A part without audio cannot be taken** — the import rejects it. |
| `audio_duration_seconds` | optional | Positive number; used for the progress readout. |
| `transcript` | optional | Full script. Teacher-facing only — students never see it. If present, `passage_reference` rows are checked against it. |
| `questions` | ✅ | Non-empty array of question blocks. |

`part_number` is computed from array order — don't author it.

**Play-once rule.** In *simulation* mode the runner plays each part's audio exactly once,
as in the real exam. In *practice* mode students can replay. Nothing in the JSON controls
this — the teacher picks the mode when assigning.

---

## 3. Cambridge-shaped paper

| Part | Situation | Speakers | Typical types |
|---|---|---|---|
| 1 | everyday transactional (booking, enquiry) | 2 | form / `table_completion`, `short_answer`, `sentence_completion` |
| 2 | everyday monologue (tour, announcement) | 1 | `matching_features`, `multiple_choice`, `diagram_completion` (map/plan) |
| 3 | academic discussion (students + tutor) | 2–4 | `multiple_choice`, `matching_features`, `list_selection` |
| 4 | academic lecture | 1 | `summary_completion`, `sentence_completion`, `flowchart_completion` |

- **10 questions per part, 40 total.** Difficulty rises from Part 1 to Part 4.
- Instructions must carry the real range (`"Questions 11–14"`), computed **after**
  accounting for `list_selection` blocks, which eat one number per correct letter.
- Answers must be **exactly what is said** in the audio, not a paraphrase.
- Spell out the whole answer set: names get spelled aloud in Part 1, so `["Whitfield"]` is
  right and `["Whitefield"]` is a different (wrong) word.
- Prefer `word_limit: 1` or `2` — long transcribed answers are unfair when heard once.

---

## 4. What an LLM can and cannot produce

| | Can an LLM do it? |
|---|---|
| Transcript, questions, answer keys, instructions | ✅ yes — that is the useful part |
| `audio_url` | ❌ no. Record or synthesise the audio, upload it to Firebase Storage under `ielts_audio/{testId}/`, then paste the download URL. |
| `diagram_url` for map/plan labelling in Part 2 | ❌ no — same reason. |

Workflow: ask the model for the JSON **with `"audio_url": "TODO"` placeholders and full
transcripts**, produce the audio from the transcripts, replace the placeholders, then run
the verifier. The import refuses a paper that still has placeholder URLs.

---

## 5. Minimal but complete example

```json
{
  "test_id": "platform_listening_demo",
  "module": "listening",
  "test_title": "Listening Demo",
  "total_time_minutes": 32,
  "parts": [
    {
      "audio_url": "https://firebasestorage.googleapis.com/…/part1.mp3?alt=media",
      "audio_duration_seconds": 300,
      "transcript": "WOMAN: Greenfield Community Centre, how can I help?\nMAN: Hello, I'd like to book the small hall for a birthday party on the 14th of March. My name's Whitfield, W-H-I-T-F-I-E-L-D. The deposit is thirty pounds, is that right?\nWOMAN: That's right, thirty pounds…",
      "questions": [
        {
          "type": "table_completion",
          "instructions": "Questions 1–3\nComplete the booking form below.\nWrite ONE WORD AND/OR A NUMBER for each answer.",
          "table_title": "Hall booking form",
          "word_limit": 2,
          "options": null,
          "headers": ["Detail", "Information"],
          "rows": [
            { "cells": ["Surname", "[1]"] },
            { "cells": ["Date of event", "[2] March"] },
            { "cells": ["Deposit", "£[3]"] }
          ],
          "questions": [
            { "question_number": 1, "correct_answer": ["Whitfield"] },
            { "question_number": 2, "correct_answer": ["14", "14th"] },
            { "question_number": 3, "correct_answer": ["30", "thirty"] }
          ]
        },
        {
          "type": "multiple_choice",
          "instructions": "Question 4\nChoose the correct letter, A, B or C.",
          "questions": [
            {
              "question_number": 4,
              "question_text": "Which room does the man book?",
              "options": [
                { "id": "A", "text": "the small hall" },
                { "id": "B", "text": "the main hall" },
                { "id": "C", "text": "the meeting room" }
              ],
              "correct_answer": ["A"]
            }
          ]
        }
      ]
    }
  ]
}
```

The grader already accepts digit↔word equivalents, so `["14"]` alone would also match
"fourteen" — listing both is harmless belt-and-braces.

---

## 6. Notes, forms and maps — the layouts Listening uses most

- **Notes / forms** (most Parts 1 and 4): `summary_completion` with `summary_title` and a
  `summary_text` written line by line — `\n` between lines, `•` / `–` bullets. Line breaks are
  preserved in the runner, so it reads like the printed form.
- **Map / plan labelling** (typical Part 2): `diagram_completion` with a letters-only word
  bank and a `question_text` per row:

```json
{
  "type": "diagram_completion",
  "instructions": "Questions 15–20\nLabel the map below.\nWrite the correct letter, A–I, next to Questions 15–20.",
  "diagram_url": "TODO",
  "diagram_alt_text": "…",
  "options": [{ "id": "A", "text": "A" }, { "id": "B", "text": "B" }],
  "questions": [{ "question_number": 15, "question_text": "School", "correct_answer": "B" }]
}
```

Media URLs may be absolute `https://` links **or same-site paths** for files in the app's
`public/` folder (`"/ielts/listening/<test_id>/part1.mp3"`) — see
[README.md](README.md#listening-media-audio--map-images).

## 7. Before importing

```bash
npm run ielts:verify -- "data/ielts practise/listening/my-paper.json"
```

Then `/admin/ielts` → **Listening** tab → **Import JSON** → paste → **Validate** →
**Import to dataset**.

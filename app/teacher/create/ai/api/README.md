# 📚 AI Abiturient Generator: Architecture & Database Flow

This document explains the backend logic, University Prep prompt engineering, and the optimized "Text-First" Firebase database structure for the Abiturient AI Generator.

---

## 🧭 1. Text-First Taxonomy & Flat Structure

Unlike public schools (which require specific grades like 5-sinf), the Abiturient track targets general University Entrance Exam preparation. 

* **The Source of Truth:** The UI reads subjects from a flat array in `structure.json` (e.g., `["algebra", "geometriya", "fizika"]`).
* **Hardcoded Topic:** Because there are no grades, the `topic` field is permanently hardcoded as `"Abiturient"` in the backend.
* **The Formatter:** A `formatSubjectName` helper intercepts raw strings, replacing dashes with spaces, and capitalizes them (e.g., `"ona-tili"` -> `"Ona tili"`).
* **The `track` Differentiator:** To ensure Abiturient questions don't mix with standard school questions in the database, every document is explicitly tagged with `track: "abiturient"`.

*(Note: Numerical IDs like `subjectId` and `chapterId` have been deleted. The only ID kept is `difficultyId` [1, 2, 3, 4] to allow mathematical sorting from Easiest to Hardest).*

---

## 🔀 2. Smart Aggregation (Aralash Logic)

Abiturient teachers frequently generate DTM-style block tests containing questions from multiple chapters or even multiple subjects.

When publishing a test, the backend uses a **Smart Aggregator**. It analyzes all questions inside the packet using a JavaScript `Set`. 
* If questions span multiple subjects, the test container's `subjectName` becomes `"Aralash fanlar"`.
* If they span multiple chapters, the `chapterName` becomes `"Aralash bo'limlar"`.
* *Crucially, the individual questions inside the test still retain their specific, original chapter and subject names.*

---

## 🧠 3. DTM Prompt Engineering

The Abiturient generator uses a highly specific prompt tailored for university entrance exams:
* **Persona:** `"Expert examiner creating University Entrance Exam (DTM) level questions."`
* **Logic Constraints:** The AI is instructed to focus on multi-step derivations, complex theoretical applications, and logical distractors typical of actual DTM testing formats.
* **Temperature:** Set to `0.2`. DTM tests require extreme factual precision and strict adherence to known scientific/mathematical laws.

---

## 🗄️ 4. Firebase Database Saving Process (Denormalized)

When a teacher clicks "Nashr qilish" (Publish), the frontend triggers a Firebase `writeBatch`. Notice how clean the data structures are without the clutter of arbitrary IDs:

### Destination A: `teacher_questions` (Individual Question Bank)
| Field | Data Type | Source / Value Origin |
| :--- | :--- | :--- |
| **`id`** | String | Auto-generated secure Firebase ID (`tq_...`). |
| **`creatorId`** | String | The authenticated teacher's ID (`user.uid`). |
| **`track`** | String | Hardcoded as `"abiturient"`. |
| **`subject`** | String | Formatted string via `formatSubjectName` (e.g., `"Algebra"`). |
| **`topic`** | String | Hardcoded as `"Abiturient"`. |
| **`chapter`** | String | Name of the chapter from syllabus API. |
| **`subtopic`** | String | Name of the subtopic from syllabus API. |
| **`difficulty`** | String | Lowercase string from UI (`"hard"`, `"olympiad"`). |
| **`difficultyId`**| Number | Mapped from UI selection: Easy=`1`, Medium=`2`, Hard=`3`, Olympiad=`4`. |
| **`question`** | Object | `{ uz: "..." }` (From Gemini AI payload). |
| **`options`** | Object | `{ A: {uz: "..."}, B: {...}, ... }` (From Gemini AI). |
| **`answer`** | String | Correct option letter. |
| **`explanation`**| Object | `{ uz: "..." }` (From Gemini AI payload). |
| **`tags`** | Array | `["abiturient_ai", "dtm", <subtopic_name>]`. |
| **`language`** | Array | `["uz"]` |
| **`uploadedAt`** | String | ISO Timestamp. |

### Destination B: `custom_tests` (The Shared Test Container)
| Field | Data Type | Source / Value Origin |
| :--- | :--- | :--- |
| **`teacherId`** | String | The authenticated teacher's ID (`user.uid`). |
| **`title`** | String | The name the teacher entered in the `isTitleModalOpen` modal. |
| **`track`** | String | Hardcoded as `"abiturient"`. |
| **`subjectName`** | String | Auto-aggregated (Specific subject or `"Aralash fanlar"`). |
| **`topicName`** | String | Hardcoded as `"Abiturient"`. |
| **`chapterName`** | String | Auto-aggregated (Specific chapter or `"Aralash bo'limlar"`). |
| **`subtopicName`**| String | Auto-aggregated (Specific subtopic or `"Aralash mavzular"`). |
| **`questions`** | Array | The complete array of all formatted question objects. |
| **`questionCount`**| Number | Total number of questions (`finalQuestionsToSave.length`). |
| **`duration`** | Number | Time limit in minutes. |
| **`shuffle`** | Boolean | Whether options shuffle for students. |
| **`status`** | String | Always initialized as `"active"`. |
| **`createdAt`** | Timestamp| Firebase `serverTimestamp()`. |

---

## 🔒 5. Credit Protection Pipeline
This route implements the standard **"Check First, Deduct Later"** security pipeline:
1. **Gatekeeper:** Validates `userId` and checks remaining `aiLimits` WITHOUT deducting (`deduct: false`).
2. **Rejection:** If limit is reached, returns a `402 Payment Required` status, triggering the Blue upgrade modal in the frontend.
3. **Generation:** Sends the DTM curriculum context to Gemini.
4. **Sanitization:** Repairs and sanitizes LaTeX formatting via Regex and `jsonrepair`.
5. **Deduction:** ONLY upon 100% successful generation and parsing does the API officially deduct the limit from Firebase (`deduct: true`).
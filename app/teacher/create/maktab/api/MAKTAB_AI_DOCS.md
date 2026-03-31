# 🏫 AI Maktab Generator: Architecture & Database Flow

This document explains the backend logic, prompt engineering, and the optimized "Text-First" Firebase database structure for the Standard Maktab AI Generator.

---

## 🧭 1. Text-First Taxonomy (NoSQL Optimization)

In a traditional SQL database, items are linked using numerical IDs (e.g., `subjectId: "01"`). However, Firebase is a NoSQL document database, which thrives on **Denormalization**. 

To make the codebase dramatically cleaner and the database human-readable, this route uses a **"Text-First Architecture"**. We have eliminated arbitrary IDs (`topicId`, `chapterId`, `subtopicId`) and now rely entirely on the exact text provided by the JSON structures.

* **The Source of Truth:** The UI reads available classes and subjects from `structure.json` (e.g., `"5-sinf": ["matematika", "ona-tili"]`).
* **The Formatter:** Before saving, a `formatSubjectName` helper intercepts raw strings like `"ona-tili"`, replaces dashes with spaces, and capitalizes them to `"Ona tili"`.
* **The Result:** The database queries become incredibly intuitive: `where("subject", "==", "Ona tili")`. If a new subject is added to the JSON, the app scales instantly without needing new hardcoded ID mappings.

---

## 🧠 2. Standard Prompt Engineering

The Maktab generator uses a prompt tailored specifically for the general public education system:
* **Persona:** `"Expert examiner for the Uzbekistan public school system (Maktab)."`
* **Curriculum Boundaries:** The AI is strictly instructed **NOT** to use concepts from higher grades. This ensures a 7th-grade math question is entirely solvable with only 7th-grade knowledge, preventing advanced Olympiad-level logic from bleeding into standard tests.
* **Temperature:** Set to `0.2`. Standard curriculum questions require high factual/mathematical accuracy and lower variance/creativity.

---

## 🗄️ 3. Firebase Database Saving Process (Denormalized)

When a teacher clicks "Nashr qilish" (Publish), the frontend triggers a Firebase `writeBatch` to save to two distinct collections simultaneously. 

Notice how clean the data structures are without the clutter of numerical IDs:

### Destination A: `teacher_questions` (Individual Question Bank)
| Field | Data Type | Source / Value Origin |
| :--- | :--- | :--- |
| **`id`** | String | Auto-generated secure Firebase ID (`tq_...`). |
| **`creatorId`** | String | The authenticated teacher's ID (`user.uid`). |
| **`subject`** | String | Formatted string via `formatSubjectName` (e.g., `"Ona tili"`). |
| **`topic`** | String | Extracted directly from `syllabusData.category` (e.g., `"5-sinf"`). |
| **`chapter`** | String | Name of the chapter from syllabus API. |
| **`subtopic`** | String | Name of the subtopic from syllabus API. |
| **`difficulty`** | String | Lowercase string from UI (`"hard"`, `"medium"`). |
| **`difficultyId`**| Number | **Kept for Sorting:** Easy=`1`, Medium=`2`, Hard=`3`. |
| **`question`** | Object | `{ uz: "..." }` (From Gemini AI payload). |
| **`options`** | Object | `{ A: {uz: "..."}, B: {...}, ... }` (From Gemini AI). |
| **`answer`** | String | Correct option letter (From Gemini AI payload). |
| **`explanation`**| Object | `{ uz: "..." }` (From Gemini AI payload). |
| **`tags`** | Array | `["maktab_ai", <subtopic_name>, <chapter_name>]`. |
| **`language`** | Array | `["uz"]` |
| **`uploadedAt`** | String | ISO Timestamp of the exact moment of creation. |

### Destination B: `custom_tests` (The Shared Test Container)
All individual questions are bundled into a single active test packet that is used for student exam sessions.

| Field | Data Type | Source / Value Origin |
| :--- | :--- | :--- |
| **`teacherId`** | String | The authenticated teacher's ID (`user.uid`). |
| **`title`** | String | The name the teacher entered in the `isTitleModalOpen` modal. |
| **`subjectName`** | String | Formatted string via `formatSubjectName`. |
| **`topicName`** | String | Extracted directly from syllabus JSON (`syllabusData.category`). |
| **`chapterName`** | String | The chapter name of the first generated question. |
| **`subtopicName`**| String | The subtopic name of the first generated question. |
| **`questions`** | Array | The complete array of all formatted question objects. |
| **`questionCount`**| Number | Total number of questions (`finalQuestionsToSave.length`). |
| **`duration`** | Number | Time limit in minutes (From the `TestConfigurationModal`). |
| **`shuffle`** | Boolean | Whether options shuffle for students. |
| **`status`** | String | Always initialized as `"active"`. |
| **`createdAt`** | Timestamp| Firebase `serverTimestamp()`. |

---

## 🔒 4. Credit Protection Pipeline
This route implements the standard **"Check First, Deduct Later"** security pipeline:
1. **Gatekeeper:** Validates `userId` and checks remaining `aiLimits` WITHOUT deducting (`deduct: false`).
2. **Rejection:** If limit is reached, returns a `402 Payment Required` status, triggering the Indigo upgrade modal in the frontend.
3. **Generation:** Sends the curriculum context to Gemini.
4. **Sanitization:** Repairs and sanitizes LaTeX formatting via Regex and `jsonrepair`.
5. **Deduction:** ONLY upon 100% successful generation and parsing does the API officially deduct the limit from Firebase (`deduct: true`).
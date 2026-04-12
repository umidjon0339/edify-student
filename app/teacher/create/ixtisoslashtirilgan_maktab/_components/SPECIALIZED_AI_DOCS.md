# 🏫 AI Ixtisoslashtirilgan Maktab: Architecture & Database Flow

This document explains the backend logic, gifted-student prompt engineering, and the highly optimized "Text-First" Firebase database structure for the Specialized Schools AI Generator.

---

## 🧭 1. Text-First Taxonomy (NoSQL Optimization)

To make the codebase dramatically cleaner and the database human-readable, this route uses a **"Text-First Architecture"**. We have eliminated arbitrary numerical IDs (`subjectId`, `topicId`, `chapterId`, `subtopicId`) and now rely entirely on the exact text provided by the JSON structures.

* **The Source of Truth:** The UI reads available classes and subjects from `structure.json`.
* **The Formatter:** Before saving, a `formatSubjectName` helper intercepts raw strings like `"algebra"`, replacing dashes with spaces, and capitalizes them to `"Algebra"`.
* **The Benefit:** Database queries become incredibly intuitive: `where("subject", "==", "Algebra")`. If a new subject is added to the JSON, the app scales instantly without needing new hardcoded ID mappings. 

*(Note: The only ID kept is `difficultyId` [1, 2, 3, 4] purely to allow mathematical sorting from Easiest to Hardest).*

---

## 🔀 2. Smart Aggregation (Mixed Test Logic)

Teachers often generate questions from multiple chapters to create Midterm or Final exams. The backend now features a **Smart Aggregator**.

When publishing a test, the system analyzes all questions inside the packet using a JavaScript `Set`. 
* If all questions share the exact same Chapter, the test is labeled with that Chapter (e.g., `"Darajalar"`).
* If the questions come from different Chapters, the system automatically labels the test container as **"Aralash bo'limlar"** (Mixed Chapters). 
* *Crucially, the individual questions inside the test still retain their specific, original chapter names.*

---

## 🧠 3. Specialized Prompt Engineering

Generating questions for Presidential and Specialized schools requires more than standard math problems. The `route.ts` API uses a custom persona:
* **Persona:** `"Expert examiner for the Uzbekistan Specialized Schools curriculum."`
* **Logic Constraints:** The AI is strictly instructed to avoid simple memory recall and instead focus on multi-step logic, deep analytical thinking, and advanced logical traps for distractor options.
* **Temperature:** Set to `0.4` (higher than the standard Maktab `0.2`). This allows the AI more creative freedom in designing complex, Olympiad-style scenarios.

---

## 🗄️ 4. Firebase Database Saving Process (Denormalized)

When a teacher clicks "Nashr qilish" (Publish), the frontend triggers a Firebase `writeBatch` to save to two distinct collections simultaneously. Notice how perfectly clean the data structures are without the clutter of IDs:

### Destination A: `teacher_questions` (Individual Question Bank)
| Field | Data Type | Source / Value Origin |
| :--- | :--- | :--- |
| **`id`** | String | Auto-generated secure Firebase ID (`tq_...`). |
| **`creatorId`** | String | The authenticated teacher's ID (`user.uid`). |
| **`subject`** | String | Formatted string via `formatSubjectName` (e.g., `"Algebra"`). |
| **`topic`** | String | Extracted directly from `syllabusData.category` (e.g., `"7-sinf"`). |
| **`chapter`** | String | Name of the chapter from syllabus API. |
| **`subtopic`** | String | Name of the subtopic from syllabus API. |
| **`difficulty`** | String | Lowercase string from UI (`"hard"`, `"olympiad"`). |
| **`difficultyId`**| Number | Mapped from UI selection: Easy=`1`, Medium=`2`, Hard=`3`, Olympiad=`4`. |
| **`question`** | Object | `{ uz: "..." }` (From Gemini AI payload). |
| **`options`** | Object | `{ A: {uz: "..."}, B: {...}, ... }` (From Gemini AI). |
| **`answer`** | String | Correct option letter (From Gemini AI payload). |
| **`explanation`**| Object | `{ uz: "..." }` (From Gemini AI payload). |
| **`tags`** | Array | `["ixtisos_ai", <subtopic_name>, <chapter_name>]`. |
| **`language`** | Array | `["uz"]` |
| **`uploadedAt`** | String | ISO Timestamp of the exact moment of creation. |

### Destination B: `custom_tests` (The Shared Test Container)
| Field | Data Type | Source / Value Origin |
| :--- | :--- | :--- |
| **`teacherId`** | String | The authenticated teacher's ID (`user.uid`). |
| **`title`** | String | The name the teacher entered in the `isTitleModalOpen` modal. |
| **`subjectName`** | String | Auto-aggregated (Specific subject or `"Aralash fanlar"`). |
| **`topicName`** | String | Auto-aggregated (Specific class or `"Aralash sinflar"`). |
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
2. **Rejection:** If limit is reached, returns a `402 Payment Required` status, triggering the Amber/Orange upgrade modal in the frontend.
3. **Generation:** Sends the specialized curriculum context to Gemini.
4. **Sanitization:** Repairs and sanitizes LaTeX formatting via Regex and `jsonrepair`.
5. **Deduction:** ONLY upon 100% successful generation and parsing does the API officially deduct the limit from Firebase (`deduct: true`).
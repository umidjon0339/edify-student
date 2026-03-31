# ✍️ AI Custom Prompt: Architecture & Database Flow

This document explains the backend logic, API design, and optimized "Text-First" Firebase database structure for the "Custom Prompt" (AI Maxsus Prompt) feature.

---

## 🌍 1. Universal Subject Handling (Economy Style)

This feature allows teachers to type freeform instructions (e.g., "Create a 5-question test on human anatomy"). 

* **The Problem:** Because the user can type literally anything, there is no predefined syllabus to match against. Previously, we forced the AI to attempt "Auto-Classification" to guess the subject, which consumed extra tokens and occasionally led to misclassified Database rows.
* **The Solution:** We embrace the unstructured nature of the prompt. We instruct the AI solely to focus on academic generation.
* **The Architecture:** To prevent these unstructured questions from polluting the structured `maktab` or `abiturient` databases, we hardcode all taxonomy text to `"by_prompt"`.

---

## 🧭 2. Text-First Taxonomy & Flat Structure

To adhere to the global "Text-First" (ID-less) architecture, we initialize the data cleanly without relying on fake numerical indexes.

* **The Differentiator:** Every generated document receives `track: "by_prompt"`. This acts as an isolated bucket in the NoSQL database.
* *(Note: All numerical IDs like `subjectId` and `chapterId` have been deleted. The only ID kept is `difficultyId` [1, 2, 3] to allow mathematical sorting from Easiest to Hardest).*

---

## 🗄️ 3. Firebase Database Saving Process (Denormalized)

When a teacher clicks "Nashr qilish" (Publish), the frontend utilizes a Firebase `writeBatch`. Notice how perfectly clean the data structures are:

### Destination A: `teacher_questions` (Individual Question Bank)
| Field | Data Type | Source / Value Origin |
| :--- | :--- | :--- |
| **`id`** | String | Auto-generated secure Firebase ID (`tq_...`). |
| **`creatorId`** | String | The authenticated teacher's ID (`user.uid`). |
| **`track`** | String | Hardcoded as `"by_prompt"`. |
| **`subject`** | String | Hardcoded as `"by_prompt"`. |
| **`topic`** | String | Hardcoded as `"by_prompt"`. |
| **`chapter`** | String | Hardcoded as `"by_prompt"`. |
| **`subtopic`** | String | Hardcoded as `"by_prompt"`. |
| **`difficulty`** | String | Lowercase string from UI (`"hard"`, `"easy"`). |
| **`difficultyId`**| Number | Mapped from UI selection: Easy=`1`, Medium=`2`, Hard=`3`. |
| **`question`** | Object | `{ uz: "..." }` (From Gemini Text). |
| **`options`** | Object | `{ A: {uz: "..."}, B: {...}, ... }` (From Gemini). |
| **`answer`** | String | Correct option letter. |
| **`explanation`**| Object | `{ uz: "..." }` (From Gemini). |
| **`tags`** | Array | `["ai_generated", "custom_prompt"]`. |
| **`language`** | Array | `["uz", "ru", "en"]` |
| **`uploadedAt`** | String | ISO Timestamp. |

### Destination B: `custom_tests` (The Shared Test Container)
| Field | Data Type | Source / Value Origin |
| :--- | :--- | :--- |
| **`teacherId`** | String | The authenticated teacher's ID (`user.uid`). |
| **`title`** | String | The name the teacher entered in the `isTitleModalOpen` modal. |
| **`track`** | String | Hardcoded as `"by_prompt"`. |
| **`subjectName`** | String | Hardcoded as `"by_prompt"`. |
| **`topicName`** | String | Hardcoded as `"by_prompt"`. |
| **`chapterName`** | String | Hardcoded as `"by_prompt"`. |
| **`subtopicName`**| String | Hardcoded as `"by_prompt"`. |
| **`questions`** | Array | The complete array of all formatted question objects. |
| **`questionCount`**| Number | Total number of questions (`finalQuestionsToSave.length`). |
| **`duration`** | Number | Time limit in minutes. |
| **`shuffle`** | Boolean | Whether options shuffle for students. |
| **`status`** | String | Always initialized as `"active"`. |
| **`createdAt`** | Timestamp| Firebase `serverTimestamp()`. |

---

## 🔒 4. Credit Protection Pipeline
This route implements the standard **"Check First, Deduct Later"** security pipeline:
1. **Gatekeeper:** Validates `userId` and checks remaining `aiLimits` WITHOUT deducting (`deduct: false`).
2. **Rejection:** If limit is reached, returns a `402 Payment Required` status, triggering the upgrade modal in the frontend.
3. **Generation:** Sends the user's custom string to Gemini 2.5 Flash.
4. **Sanitization:** Repairs and sanitizes LaTeX formatting via Regex and `jsonrepair`.
5. **Deduction:** ONLY upon 100% successful generation and parsing does the API officially deduct the limit from Firebase (`deduct: true`).
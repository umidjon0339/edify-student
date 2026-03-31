# 📸 AI Image-to-Test: Architecture & Database Flow

This document explains the backend logic, API design, and optimized "Text-First" Firebase database structure for the "Create via Image" (Rasm orqali yaratish) feature.

---

## 🌍 1. Universal Subject Handling (Economy Style)

To keep API token costs low and make the user interface as simple as possible, this feature uses a **Subject-Agnostic Prompt**.

* **The Problem:** Asking the user to select a subject (Math, History, Biology) via dropdowns requires extra UI elements and passes unnecessary metadata to the backend when the AI is smart enough to just read the image.
* **The Solution:** We instruct the AI with the role of `"Expert Academic Examiner"` instead of a specific subject teacher. The AI relies entirely on its vision capabilities (Gemini 1.5 Flash Vision). If a user uploads a cell structure, the AI acts like a Biology teacher.
* **The Guardrail:** The prompt includes a strict rule: `If image is NOT educational, academic, or text-based, output EXACTLY: {"error": "invalid_image"}`. This prevents users from wasting limits on irrelevant photos (like selfies).

---

## 🧭 2. Text-First Taxonomy & Flat Structure

Because this generator relies on a visual input rather than a strict syllabus, we do not know the exact Class, Chapter, or Subtopic.

To adhere to the global "Text-First" architecture while avoiding Database indexing issues, we hardcode all taxonomy text to `"by_image"`.

* **The Differentiator:** Every generated document receives `track: "by_image"`. This prevents these unstructured visual questions from accidentally appearing inside a strict 5th Grade Maktab query.
* *(Note: All numerical IDs like `subjectId` and `chapterId` have been deleted. The only ID kept is `difficultyId` [1, 2, 3] to allow mathematical sorting from Easiest to Hardest).*

---

## 🗄️ 3. Firebase Database Saving Process (Denormalized)

When a teacher clicks "Nashr qilish" (Publish), the frontend utilizes a Firebase `writeBatch`. Notice how clean the data structures are without arbitrary IDs:

### Destination A: `teacher_questions` (Individual Question Bank)
| Field | Data Type | Source / Value Origin |
| :--- | :--- | :--- |
| **`id`** | String | Auto-generated secure Firebase ID (`tq_...`). |
| **`creatorId`** | String | The authenticated teacher's ID (`user.uid`). |
| **`track`** | String | Hardcoded as `"by_image"`. |
| **`subject`** | String | Hardcoded as `"by_image"`. |
| **`topic`** | String | Hardcoded as `"by_image"`. |
| **`chapter`** | String | Hardcoded as `"by_image"`. |
| **`subtopic`** | String | Hardcoded as `"by_image"`. |
| **`difficulty`** | String | Lowercase string from UI (`"hard"`, `"easy"`). |
| **`difficultyId`**| Number | Mapped from UI selection: Easy=`1`, Medium=`2`, Hard=`3`. |
| **`question`** | Object | `{ uz: "..." }` (From Gemini Vision). |
| **`options`** | Object | `{ A: {uz: "..."}, B: {...}, ... }` (From Gemini Vision). |
| **`answer`** | String | Correct option letter. |
| **`explanation`**| Object | `{ uz: "..." }` (From Gemini Vision). |
| **`tags`** | Array | `["ai_generated", "by_image"]`. |
| **`language`** | Array | `["uz", "ru", "en"]` |
| **`uploadedAt`** | String | ISO Timestamp. |

### Destination B: `custom_tests` (The Shared Test Container)
| Field | Data Type | Source / Value Origin |
| :--- | :--- | :--- |
| **`teacherId`** | String | The authenticated teacher's ID (`user.uid`). |
| **`title`** | String | The name the teacher entered in the `isTitleModalOpen` modal. |
| **`track`** | String | Hardcoded as `"by_image"`. |
| **`subjectName`** | String | Hardcoded as `"by_image"`. |
| **`topicName`** | String | Hardcoded as `"by_image"`. |
| **`chapterName`** | String | Hardcoded as `"by_image"`. |
| **`subtopicName`**| String | Hardcoded as `"by_image"`. |
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
3. **Generation:** Sends the base64 image strings to Gemini Vision.
4. **Guardrail Check:** If the AI determines the image is not educational, it returns a `400 Bad Request` with `invalid_image`. Limits are NOT deducted.
5. **Sanitization:** Repairs and sanitizes LaTeX formatting via Regex and `jsonrepair`.
6. **Deduction:** ONLY upon 100% successful generation and parsing does the API officially deduct the limit from Firebase (`deduct: true`).
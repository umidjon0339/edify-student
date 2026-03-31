# ✍️ Manual Custom Studio: Architecture & Database Flow

This document explains the frontend UI design, state management, and the optimized "Text-First" Firebase database structure for the Manual Custom Studio (where teachers type their own questions).

---

## 🎨 1. Full-Canvas UI Architecture

Because the teacher is manually typing questions, the UI prioritizes screen real-estate. 

* **No Syllabus Sidebar:** We completely removed the `SyllabusSelector` sidebar. This gives the teacher a much wider, distraction-free "Canvas" to draft complex mathematical equations without feeling cramped.
* **Per-Question Difficulty:** Instead of setting the difficulty for the entire test, every single question card now has its own Difficulty dropdown. This allows a teacher to create a beautifully structured test that starts easy and gets progressively harder.
* **Auto-Save:** As the teacher types, the `draftQuestions` array is silently saved to the browser's `localStorage`. If they accidentally close the tab, their work is instantly restored upon reopening.

---

## 🧭 2. Text-First Taxonomy & Flat Structure

Because this generator does not enforce a specific syllabus, we do not know the exact Class, Chapter, or Subtopic the teacher is writing about.

To adhere to the global "Text-First" architecture and prevent Database indexing issues, we hardcode all taxonomy text to `"custom"`.

* **The Differentiator:** Every generated document receives `track: "custom"`. This prevents these unstructured, manually-created questions from accidentally polluting standard Maktab or Abiturient queries.
* *(Note: All numerical IDs like `subjectId`, `topicId`, and `chapterId` have been deleted to keep the database clean).*

---

## 🗄️ 3. Firebase Database Saving Process (Denormalized)

When a teacher clicks "Nashr qilish" (Publish), the frontend utilizes a Firebase `writeBatch`. Notice how perfectly clean the data structures are:

### Destination A: `teacher_questions` (Individual Question Bank)
| Field | Data Type | Source / Value Origin |
| :--- | :--- | :--- |
| **`id`** | String | Auto-generated secure Firebase ID (`tq_...`). |
| **`creatorId`** | String | The authenticated teacher's ID (`user.uid`). |
| **`track`** | String | Hardcoded as `"custom"`. |
| **`subject`** | String | Hardcoded as `"custom"`. |
| **`topic`** | String | Hardcoded as `"custom"`. |
| **`chapter`** | String | Hardcoded as `"custom"`. |
| **`subtopic`** | String | Hardcoded as `"custom"`. |
| **`difficulty`** | String | From the per-card selector (`"easy"`, `"medium"`, `"hard"`). |
| **`difficultyId`**| Number | Mapped from per-card selection: Easy=`1`, Medium=`2`, Hard=`3`. |
| **`question`** | Object | `{ uz: "..." }` (From user input). |
| **`options`** | Object | `{ A: {uz: "..."}, B: {...}, ... }` (From user input). |
| **`answer`** | String | From the Correct Answer dropdown. |
| **`explanation`**| Object | `{ uz: "..." }` (From user input). |
| **`tags`** | Array | `["teacher_custom"]`. |
| **`language`** | Array | `["uz"]` |
| **`uploadedAt`** | String | ISO Timestamp. |

### Destination B: `custom_tests` (The Shared Test Container)
| Field | Data Type | Source / Value Origin |
| :--- | :--- | :--- |
| **`teacherId`** | String | The authenticated teacher's ID (`user.uid`). |
| **`title`** | String | The name the teacher entered in the `isTitleModalOpen` modal. |
| **`track`** | String | Hardcoded as `"custom"`. |
| **`subjectName`** | String | Hardcoded as `"custom"`. |
| **`topicName`** | String | Hardcoded as `"custom"`. |
| **`chapterName`** | String | Hardcoded as `"custom"`. |
| **`subtopicName`**| String | Hardcoded as `"custom"`. |
| **`questions`** | Array | The complete array of all formatted question objects. |
| **`questionCount`**| Number | Total number of questions (`finalQuestionsToSave.length`). |
| **`duration`** | Number | Time limit in minutes. |
| **`shuffle`** | Boolean | Whether options shuffle for students. |
| **`status`** | String | Always initialized as `"active"`. |
| **`createdAt`** | Timestamp| Firebase `serverTimestamp()`. |

---

## 🔒 4. State Management Notes
* Because this is a manual entry page, no AI credits are consumed, so the `aiLimits` hooks have been safely bypassed for the generation phase.
* The `buildSafeEdifyQuestion` helper has been removed in favor of mapping the `finalQ` object directly. This ensures we are not forced to pass dummy syllabus data into external functions, keeping our code tightly scoped and completely bug-free.
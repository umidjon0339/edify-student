# 🏛️ BSB & CHSB Assessment Module: Architecture & Data Specifications

## 1. Overview
The BSB (Bo'lim bo'yicha Summativ Baholash) and CHSB (Choraklik Summativ Baholash) module is an advanced exam generation system. It supports both **Standard Public Schools (Maktab)** and **Specialized Schools (Ixtisoslashtirilgan Maktab)**. 

Unlike standard MCQ quizzes, this module utilizes a **Question Matrix Builder**, allowing teachers to generate a mixed-format exam paper with precise control over question types, counts, and point values.

---

## 2. System Workflow
1. **Curriculum Selection:** The teacher selects the School Type, Assessment Type, Grade, and Subject. The system fetches the appropriate dynamic syllabus (`maktabMap` or `ixtisosMap`).
2. **Scope Definition:** - For **BSB**, teachers select specific subtopics within a chapter.
   - For **CHSB**, teachers select entire chapters.
3. **Matrix Configuration:** The teacher defines the exact distribution of 5 question types, setting the count and point value (Ball) for each.
4. **AI Generation:** The frontend sends a consolidated payload to the API. A strict XML-structured prompt forces Gemini 2.5 Flash to generate a mixed-schema JSON array containing LaTeX-escaped math.
5. **Review & Edit:** The generated questions are displayed on the UI. The teacher can review the questions, solutions, and rubrics, and **delete** any unsatisfactory questions before saving.
6. **Database Commit:** The teacher names the exam and clicks "Save". The entire exam container, including the mixed question array, is written to Firestore as a single document via a Batch Write.

---

## 3. Database Architecture
To keep the primary `teacher_questions` bank clean, these massive, mixed-format exam papers are stored in a dedicated collection called **`bsb_chsb_tests`**.

### Exam Container Document (`bsb_chsb_tests/{testId}`)
```json
{
  "id": "doc_id_12345",
  "teacherId": "user_uid_67890",
  "teacherName": "John Doe",
  "title": "Algebra 11-sinf 1-CHSB",
  "schoolType": "maktab", 
  "assessmentType": "CHSB", 
  "grade": "11-sinf",
  "subject": "Algebra",
  "scopesCovered": ["Ko'rsatkichli funksiya", "Logarifmik funksiya"], 
  "totalPoints": 45,
  "questionCount": 10,
  "difficultyTarget": "Aralash",
  "status": "active",
  "createdAt": "timestamp",
  "questions": [ 
     // Array of Mixed Question Objects (See Section 4)
  ]
}





4.1 Multiple Choice Question ("type": "mcq")
Used for standard 4-option questions.

JSON
{
  "id": "temp_abc123",
  "type": "mcq",
  "points": 2,
  "topic": "Logarifm xossalari",
  "difficulty": "O'rta",
  "question": { "uz": "Quyidagi ifodaning qiymatini toping: $\\log_2 8$" },
  "options": {
    "A": { "uz": "2" },
    "B": { "uz": "3" },
    "C": { "uz": "4" },
    "D": { "uz": "8" }
  },
  "answer": "B",
  "explanation": { "uz": "$2^3 = 8$ bo'lganligi uchun $\\log_2 8 = 3$." }
}
4.2 Short Answer ("type": "short_answer")
Used for fill-in-the-blank or direct calculation results. It lacks the options object.

JSON
{
  "id": "temp_def456",
  "type": "short_answer",
  "points": 3,
  "topic": "Tenglamalar",
  "difficulty": "Oson",
  "question": { "uz": "Tenglamani yeching: $2x - 4 = 10$. $x = ?$" },
  "answer": { "uz": "7" },
  "explanation": { "uz": "$2x = 14 \\implies x = 7$" }
}
4.3 Open-Ended / Essay ("type": "open_ended")
Used for complex analysis or multi-step math proofs. Includes a crucial rubric field for teachers to use during manual grading.

JSON
{
  "id": "temp_ghi789",
  "type": "open_ended",
  "points": 5,
  "topic": "Funksiya hosilasi",
  "difficulty": "Qiyin",
  "question": { "uz": "$f(x) = x^3 - 3x^2$ funksiyaning monotonlik oraliqlarini toping." },
  "answer": { "uz": "1) $f'(x) = 3x^2 - 6x$. 2) Kritik nuqtalar: $3x(x - 2) = 0 \\implies x=0, x=2$. 3) $(-\\infty, 0)$ o'suvchi, $(0, 2)$ kamayuvchi, $(2, \\infty)$ o'suvchi." },
  "rubric": { "uz": "Hosilani to'g'ri topish: 2 ball. Kritik nuqtalarni topish: 1 ball. Oraliqlarni to'g'ri belgilash: 2 ball." },
  "explanation": { "uz": "Hosilaning ishorasi funksiya monotonligini belgilaydi." }
}
4.4 Matching ("type": "matching")
Used to link definitions, formulas, or concepts. Uses a pairs array containing left and right objects.

JSON
{
  "id": "temp_jkl012",
  "type": "matching",
  "points": 4,
  "topic": "Geometrik shakllar",
  "difficulty": "Oson",
  "question": { "uz": "Shakllarni ularning xossalariga moslashtiring:" },
  "pairs": [
    {
      "left": { "uz": "Kvadrat" },
      "right": { "uz": "Barcha tomonlari va burchaklari teng" }
    },
    {
      "left": { "uz": "Romb" },
      "right": { "uz": "Barcha tomonlari teng, burchaklari teng emas" }
    }
  ],
  "explanation": { "uz": "Geometriya asosiy qoidalari." }
}
4.5 True/False ("type": "true_false")
Evaluates logical statements. The answer is strictly a boolean.

JSON
{
  "id": "temp_mno345",
  "type": "true_false",
  "points": 1,
  "topic": "Haqiqiy sonlar",
  "difficulty": "Oson",
  "question": { "uz": "Barcha butun sonlar natural sonlardir." },
  "answer": false,
  "explanation": { "uz": "Manfiy butun sonlar va nol natural son hisoblanmaydi." }
}
5. Security & Access Rules
The Firestore rules for bsb_chsb_tests follow strict ownership protocols:

Read: (allow read: if isAuth();) Students and teachers can read the documents to view or take the exams.

Write: (allow create: if isAuth() && request.resource.data.teacherId == request.auth.uid;) A teacher can only save an exam to the database if the teacherId perfectly matches their authentication token.

Modification/Deletion: (allow update, delete: if isAuth() && resource.data.teacherId == request.auth.uid;) Only the original author of the exam can modify or permanently delete the document.
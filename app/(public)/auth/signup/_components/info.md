# Edify User Database & Signup Flow Architecture

## 1. Core Database Collections
When a user registers, the system writes to two separate collections in Firestore simultaneously:

1. **`users` Collection:** The primary collection where the user's profile and app data are stored. The Document ID is the user's Firebase Auth `uid`.
2. **`usernames` Collection:** A helper collection used strictly to ensure username uniqueness. The Document ID is the `username` (lowercased), and it stores `{ uid: user.uid }`.

---

## 2. Registration Methods (The Flows)
There are two ways a user's data reaches the database. Because the Google Auth flow skips several form steps, the resulting database objects look slightly different.

### A. Manual Signup (`handleManualSignup`)
The user goes through all 4 steps, providing their email, password, full name, birthdate, phone, location, and school/institution.

### B. Google Auth Signup (`handleGoogleFinalize`)
The user authenticates with Google, which bypasses steps 2, 3, and 4. They are redirected straight to Step 10, where they only provide a `username` and (if they are a teacher) a `schoolSubject`. 

Because of this, fields like `phone`, `birthDate`, `institution`, and specific `location` details are saved as `null` and must be filled out later in their profile settings.

---

## 3. Database Structures by Role

Below is the exact JSON structure of the documents saved to the `users` collection for each scenario.

### Case 1: Student (Manual Signup)
If a user selects "Student" and fills out the manual form, the database object looks like this:

```json
{
  "uid": "aB1cD2eF3gH4...",
  "email": "student@example.com",
  "username": "student_01",
  "displayName": "Aliyev Vali",
  "phone": "+998 (90) 123-45-67",
  "birthDate": "2008-05-15",
  "role": "student",
  "institution": "15-maktab",
  "location": {
    "country": "Uzbekistan",
    "region": "Tashkent City",
    "district": "Yunusabad"
  },
  "createdAt": "2026-04-03T19:03:17.000Z",
  
  // Student-Specific App Data
  "grade": "school_9",
  "totalXP": 0,
  "currentStreak": 0,
  "level": 1,
  "dailyHistory": {},
  "progress": {
    "completedTopicIndex": 0,
    "completedChapterIndex": 0,
    "completedSubtopicIndex": 0
  }
}



Case 2: Teacher (Manual Signup)
If a user selects "Teacher" and fills out the manual form, the gamification stats are replaced with teaching tools:

JSON
{
  "uid": "tE5aC6hE7r...",
  "email": "teacher@school.uz",
  "username": "math_master",
  "displayName": "Azizova Malika",
  "phone": "+998 (99) 987-65-43",
  "birthDate": "1985-10-20",
  "role": "teacher",
  "institution": "Prezident Maktabi",
  "location": {
    "country": "Uzbekistan",
    "region": "Samarkand",
    "district": "Samarkand City"
  },
  "createdAt": "2026-04-03T19:05:00.000Z",

  // Teacher-Specific App Data
  "grade": "Teacher",
  "subject": "matematika",
  "verifiedTeacher": false,
  "createdTests": []
}









Case 3: Student (Google Auth)
If a student signs up using Google, they skip the personal details form. Notice the null fields and the addition of photoURL:

JSON
{
  "uid": "gO0gL3uS3r...",
  "email": "google.student@gmail.com",
  "username": "googlestudent99",
  "displayName": "Javohir (from Google)",
  "photoURL": "[https://lh3.googleusercontent.com/a/](https://lh3.googleusercontent.com/a/)...",
  "phone": null,
  "birthDate": null,
  "role": "student",
  "institution": null,
  "location": {
    "country": "Uzbekistan",
    "region": null,
    "district": null
  },
  "createdAt": "2026-04-03T19:10:00.000Z",
  
  // Student-Specific App Data
  "grade": null,
  "totalXP": 0,
  "currentStreak": 0,
  "level": 1,
  "dailyHistory": {},
  "progress": {
    "completedTopicIndex": 0,
    "completedChapterIndex": 0,
    "completedSubtopicIndex": 0
  }
}
Case 4: Teacher (Google Auth)
If a teacher signs up using Google, they still have to select their schoolSubject in Step 10, but other personal details are left blank:

JSON
{
  "uid": "gO0gT3aC6h...",
  "email": "google.teacher@gmail.com",
  "username": "physics_guru",
  "displayName": "Nodirbek (from Google)",
  "photoURL": "[https://lh3.googleusercontent.com/a/](https://lh3.googleusercontent.com/a/)...",
  "phone": null,
  "birthDate": null,
  "role": "teacher",
  "institution": null,
  "location": {
    "country": "Uzbekistan",
    "region": null,
    "district": null
  },
  "createdAt": "2026-04-03T19:15:00.000Z",

  // Teacher-Specific App Data
  "grade": "Teacher",
  "subject": "fizika",
  "verifiedTeacher": false,
  "createdTests": []
}
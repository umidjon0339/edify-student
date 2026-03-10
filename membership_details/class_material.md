# 📚 LMS Materials Vault Documentation

## 📝 Overview
The "Materials Vault" is a core feature of the Learning Management System (LMS). It allows teachers to upload educational files (PDFs, Images, Videos) or share external resources (YouTube, Zoom, Google Drive links) with their students. 

It is designed with enterprise-grade scalability, including pagination to minimize Firebase read costs, active/archive states to declutter UI, and automatic Google Cloud Storage cleanup to prevent ghost-file billing.

---

## 🗄️ Database Structure (Firestore Schema)
Materials are stored as a subcollection inside each specific class.

**Path:** `/classes/{classId}/materials/{materialId}`

```json
{
  "classId": "oP7YBwFzwk2keC50cEBf",
  "title": "Chapter 1 Formula Sheet",
  "description": "Memorize these before the test.",
  "topicId": "Week 1",                 // Used for grouping/folders
  
  // File vs Link Data
  "isExternal": false,                 // true if it's a YouTube/Web link
  "externalUrl": null,                 // "[https://youtube.com/](https://youtube.com/)..." if external
  "fileType": "pdf",                   // 'pdf', 'image', 'video', 'link', or 'document'
  "fileSize": 2886562,                 // Size in bytes (0 for links)
  "fileExtension": ".pdf",             // Extension for downloaded files
  "fileUrl": "https://firebasestorage...", // Download URL or External Link
  "storagePath": "classes/oP7YBwFzw...",   // Location in Firebase Storage bucket
  
  // Metadata & Status
  "createdAt": "Timestamp",
  "uploaderId": "DtJD4orBGFdTYwTNujwi...",
  "isVisible": true,                   // If false, students cannot see or query it
  "isArchived": false,                 // If true, hidden from the Teacher's "Active" tab
  "orderIndex": 1773004105523,         // Timestamp used for future drag-and-drop sorting
  
  // Analytics (Future Gamification)
  "viewCount": 0,
  "downloadCount": 0
}







⚙️ How It Works (Core Logic)
1. File vs. Link Uploading (UploadMaterialModal.tsx)
File Mode: Files are uploaded to Firebase Storage. We calculate the upload progress, get the secure download URL, and save the storagePath.

Link Mode: Bypasses Firebase Storage entirely. It saves the URL directly to Firestore, saving cloud storage space and money.

2. Teacher Management (MaterialsTab.tsx - Teacher)
Pagination: Uses limit(10) to prevent fetching thousands of documents at once. A "Load More" button increments the limit.

Archiving: Teachers can toggle isArchived. Archived items are moved to a separate tab to keep the active workspace clean.

Storage Cleanup: When a teacher deletes a file, the app checks if storagePath exists. If it does, it physically deletes the file from the Google Cloud bucket before deleting the Firestore document.

Editing: Teachers can edit the Title, Topic, Description, and Link URL on the fly without needing to re-upload files.

3. Student View (MaterialsTab.tsx - Student)
Read-Only: Students can only view, open, or download materials.

Security Filter: The query explicitly includes where('isVisible', '==', true) and where('isArchived', '==', false). Firebase Rules block students from accessing hidden files.

Deferred Loading: The materials are only fetched from Firestore if the student actually clicks the "Materials" tab, saving massive database read costs.

🔐 Firebase Security Rules
To ensure data privacy, the following rules are applied to the materials subcollection:

CREATE/UPDATE/DELETE: Only the Teacher (teacherId matches request.auth.uid) can modify materials.

READ (Teacher): The Teacher can read all materials, including hidden and archived ones.

READ (Student): Students enrolled in the class can ONLY read materials where isVisible == true.

🌐 Localization (i18n)
All UI elements, toast notifications, confirmation modals, and error messages are fully translated using the useTeacherLanguage and useStudentLanguage hooks, supporting:

en (English)

ru (Russian)

uz (Uzbek)
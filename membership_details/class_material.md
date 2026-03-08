{
  "id": "mat_8923nkasd",
  "classId": "class_123xyz",
  
  // 1. DISPLAY INFO
  "title": "Algebra Chapter 1 Formulas",
  "description": "Memorize these before Friday's exam.",
  
  // 2. FILE METADATA (Crucial for UI and SaaS Limits)
  "fileType": "pdf",                // Options: "pdf", "image", "video", "link", "document"
  "fileSize": 1048576,              // Size in bytes (1MB). VERY IMPORTANT for tracking SaaS limits!
  "fileExtension": ".pdf",          // Helps the frontend know how to render it
  
  // 3. STORAGE LOCATIONS
  "fileUrl": "https://firebasestorage...", // The public link the browser uses to download/view it
  "storagePath": "classes/class_123xyz/materials/algebra.pdf", // The secret backend path (CRITICAL for deleting)
  
  // 4. ORGANIZATION & TIMING
  "createdAt": Timestamp,           // When it was uploaded
  "uploaderId": "teacher_abc",      // Who uploaded it
  "topicId": "topic_456",           // (Optional) If you ever want to group files into folders like "Week 1"
  "orderIndex": 1,                  // Number to allow teachers to drag-and-drop reorder the list
  
  // 5. ACCESS CONTROL
  "isVisible": true,                // Allows teachers to "Hide" a file while they prepare it
  
  // 6. TEACHER ANALYTICS (The Pro Feature!)
  "viewCount": 0,                   // How many times students opened it
  "downloadCount": 0                // How many times students downloaded it
}
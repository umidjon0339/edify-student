// types/user.ts
export interface UserLocation {
    country: string;
    region: string | null;
    district: string | null;
  }
  
  export interface TeacherUser {
    id: string; // The Firestore Document ID (usually matches uid)
    uid: string;
    email: string;
    username: string;
    displayName: string;
    photoURL: string | null;
    phone: string | null;
    birthDate: string | null;
    role: string;
    institution: string | null;
    location: UserLocation | null;
    createdAt: string;
    
    // Professional Fields
    grade: string;
    subject: string | null;
    verifiedTeacher: boolean;
    createdTests: string[];
    
    // Background Fields
    experience: number;
    qualification: string | null;
    education: string | null;
    bio: string | null;
    classes: string[];
    isActive: boolean;
    
    // Cloud Function Generated Fields (Optional because they might not exist until a class is created)
    activeClassCount?: number;
    totalStudents?: number;
    planId?: string;
  subscriptionStatus?: string;
  }
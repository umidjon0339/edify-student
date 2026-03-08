# EdTech SaaS Membership & User Schema Architecture

This document outlines how memberships, free trials, and usage limits are structured and enforced across the platform using Firebase and Next.js.

## 1. The `users` Collection Schema (Teacher Profile)

Every teacher document in the `users` collection contains core identity data, membership status, and automated usage counters. 

```json
{
  "uid": "abc123xyz",
  "displayName": "Umidjon",
  "email": "teacher@example.com",
  "role": "teacher",
  
  // --- MEMBERSHIP DATA ---
  "planId": "free",                 // Options: "free", "pro", "school_license"
  "subscriptionStatus": "trialing", // Options: "trialing", "active", "past_due", "canceled"
  "trialEndsAt": Timestamp,         // Exact date/time the 15-day free trial ends
  "subscriptionEndsAt": null,       // Populated with a Timestamp ONLY when they pay
  
  // --- USAGE COUNTERS (Managed by Cloud Functions) ---
  "activeClassCount": 2,            // Total active classes
  "totalStudents": 45,              // Total students across all classes
  "customTestCount": 5,             // Total tests created in their library
  
  // --- AI LIMIT COUNTERS (Managed by Next.js API) ---
  "aiRequestsToday": 3,             // Resets daily via lazy evaluation
  "lastAiRequestDate": "2026-03-08" // Used to trigger the daily reset (YYYY-MM-DD format)
}


4. The Implementation Workflow
The system enforces limits through a secure, four-step pipeline:

Step 1: Automated Trial Stamping (Backend)
When a teacher signs up, the Next.js frontend simply creates the standard Auth account. A Firebase Cloud Function (initializeTeacherMembership) detects the new user and silently injects planId: "free" and the 15-day trialEndsAt timestamp into their document.

Step 2: Automated Tracking (Backend)
Whenever a teacher creates a Class or a Custom Test, Firebase Cloud Functions instantly update their activeClassCount or customTestCount. The frontend never calculates these totals; it only reads them.

Step 3: The Gatekeeper (Frontend Hook)
The React application uses a central hook (usePlanLimits.ts). This hook compares the teacher's current counters against the global PLAN_LIMITS configuration. It calculates if trialEndsAt is still valid and returns boolean flags (e.g., canCreateClass: false, canShuffle: true).

Step 4: The UI Block (Paywall)
If a teacher attempts an action (like clicking "Create Test") and the Gatekeeper hook returns canCreateTest: false, the action is intercepted. Instead of opening the creation modal, a "Paywall Modal" is triggered, prompting them to upgrade their subscription.
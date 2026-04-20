// 🟢 IMPORTANT: We use the Admin SDK here so API routes don't get 403 errors
import { adminDb } from '@/lib/firebaseAdmin'; 
import { FieldValue } from 'firebase-admin/firestore';

export type PermissionResult = {
  allowed: boolean;
  code?: 'FEATURE_LOCKED' | 'LIMIT_REACHED' | 'USER_NOT_FOUND' | 'ERROR';
  error?: string;
};

/**
 * STEP 1: Check if the user has the specific feature AND enough monthly credits
 */
export async function checkUserPermission(
  userId: string, 
  featureKey: string, 
  requestedCount: number = 1
): Promise<PermissionResult> {
  try {
    if (!userId) {
      return { allowed: false, code: 'USER_NOT_FOUND', error: "Foydalanuvchi ID si kiritilmadi." };
    }

    // 🟢 Using Admin SDK to bypass client security rules
    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return { allowed: false, code: 'USER_NOT_FOUND', error: "Foydalanuvchi topilmadi (User not found)." };
    }

    const userData = userSnap.data();

    // 1. CHECK FEATURE LOCK (Is it included in their current plan?)
    const includedFeatures = userData?.includedFeatures || [];
    if (!includedFeatures.includes(featureKey)) {
      return { 
        allowed: false, 
        code: 'FEATURE_LOCKED', 
        error: "Bu xususiyat sizning joriy tarifingizda mavjud emas. Iltimos, tarifingizni oshiring." 
      };
    }

    // 2. CHECK MONTHLY AI LIMITS (Based on your new plan architecture)
    const monthlyLimit = userData?.currentLimits?.monthlyAiQuestions || 100; // Default Free Limit
    const aiUsed = userData?.usage?.aiQuestionsUsed || 0;

    // We consider 5000+ as "Unlimited" (VIP Plan)
    const isUnlimited = monthlyLimit >= 5000;

    if (!isUnlimited && (aiUsed + requestedCount > monthlyLimit)) {
      const remaining = Math.max(monthlyLimit - aiUsed, 0);
      return { 
        allowed: false, 
        code: 'LIMIT_REACHED', 
        error: `Oylik AI limitingiz yetarli emas. Sizda faqat ${remaining} ta savol qoldi.` 
      };
    }

    // Passed both checks!
    return { allowed: true };
    
  } catch (error: any) {
    console.error("Gatekeeper check error:", error);
    return { allowed: false, code: 'ERROR', error: "Server xatosi. Ruxsatlarni tekshirib bo'lmadi." };
  }
}

/**
 * STEP 2: Deduct credits ONLY AFTER the AI successfully generates the content
 */
export async function deductMonthlyAiCredits(userId: string, actualGeneratedCount: number): Promise<boolean> {
  if (!userId || actualGeneratedCount <= 0) return true;
  
  try {
    const userRef = adminDb.collection("users").doc(userId);
    
    // 🟢 FieldValue.increment securely adds the amount directly on the server
    await userRef.set({
      usage: {
        aiQuestionsUsed: FieldValue.increment(actualGeneratedCount)
      }
    }, { merge: true }); // merge: true ensures we don't accidentally overwrite the rest of the usage object

    return true;
  } catch (error) {
    console.error("Failed to deduct AI credits:", error);
    return false;
  }
}
// 🟢 NOTICE: We use your Admin SDK setup here, NOT the regular 'firebase/firestore'
import { adminDb } from '@/lib/firebaseAdmin'; 

function getTodayDateStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
}

// 🟢 CHANGED: Added `deduct: boolean = true` parameter
export async function consumeAiCredits(userId: string, requestedAmount: number = 1, deduct: boolean = true) {
  try {
    if (!userId) throw new Error("User ID is required");

    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    const userData = userSnap.exists ? userSnap.data() : {};
    const today = getTodayDateStr();

    // 1. Fallbacks
    const currentLimit = Number(userData?.aiDailyQuestionLimit) || 50; 
    let currentUsed = Number(userData?.aiQuestionUsedToday) || 0; 
    const lastReset = userData?.aiQuestionLastResetDate || "2000-01-01"; 

    // 2. Lazy Reset
    if (lastReset !== today) {
      currentUsed = 0; 
    }

    // 3. Gatekeeper Check
    const remaining = currentLimit - currentUsed;

    if (requestedAmount > remaining) {
      if (remaining <= 0) {
        return { allowed: false, error: `Siz bugungi limitni tugatdingiz. (Limit: ${currentLimit} ta savol)` };
      } else {
        return { allowed: false, error: `Sizda faqat ${remaining} ta savol yaratish imkoniyati qoldi.` };
      }
    }

    // 🟢 CHANGED: If we just want to check, stop here and say "Yes, they are allowed"
    if (!deduct) {
      return { allowed: true };
    }

    // 4. Update Database (Only happens if deduct is true)
    await userRef.set({
      aiDailyQuestionLimit: currentLimit,
      aiQuestionUsedToday: currentUsed + requestedAmount,
      aiQuestionLastResetDate: today
    }, { merge: true });

    return { allowed: true };

  } catch (error) {
    console.error("AI Limit Checker Error:", error);
    return { allowed: false, error: "Tizimda xatolik yuz berdi. Iltimos qayta urinib ko'ring." };
  }
}
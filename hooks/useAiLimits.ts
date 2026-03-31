import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext'; // Your untouched, working Auth!
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Adjust this to your firebase config path

export function useAiLimits() {
  const { user } = useAuth();
  const [dbData, setDbData] = useState<any>(null);

  // 1. Fetch the custom AI data from Firestore safely
  useEffect(() => {
    if (!user?.uid) return;

    // We listen to the "users" collection for this specific user's ID
    const userDocRef = doc(db, 'users', user.uid);
    
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setDbData(docSnap.data());
      } else {
        setDbData({}); // Empty object if they don't have a document yet
      }
    });

    return () => unsubscribe();
  }, [user]);

  // 2. Do the math using the data we just fetched
  return useMemo(() => {
    // Wait until both the user is logged in AND we have their database file
    if (!user || !dbData) return null; 

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });

    // Fallbacks for missing data, using dbData instead of user
    const dbLastReset = dbData.aiQuestionLastResetDate || "2000-01-01";
    const dbLimit = Number(dbData.aiDailyQuestionLimit) || 50;
    const dbUsed = Number(dbData.aiQuestionUsedToday) || 0;

    // The Visual Override
    const isNewDay = dbLastReset !== today;
    const displayUsed = isNewDay ? 0 : dbUsed;
    
    const remaining = Math.max(0, dbLimit - displayUsed);
    const isLimitReached = remaining <= 0;

    const usagePercentage = Math.min((displayUsed / dbLimit) * 100, 100);

    return {
      used: displayUsed,
      limit: dbLimit,
      remaining,
      isLimitReached,
      usagePercentage,
    };
  }, [user, dbData]);
}
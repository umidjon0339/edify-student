import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export function useMonthlyLimit() {
  const [limitData, setLimitData] = useState({
    limit: 100,
    used: 0,
    remaining: 100,
    usagePercentage: 0,
    isUnlimited: false,
    isDanger: false,
    resetDate: '',
    loading: true
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Real-time listener: user hujjatidagi har qanday o'zgarishni darhol tutadi
        const unsubscribeDb = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Yangi SaaS Engine maydonlarini o'qish
            const limit = data.currentLimits?.monthlyAiQuestions || 100;
            const used = data.usage?.aiQuestionsUsed || 0;
            const resetDate = data.usage?.aiLimitResetDate || 'Noma\'lum';
            
            // Mantiqiy hisob-kitoblar
            const isUnlimited = limit >= 5000;
            const remaining = isUnlimited ? limit : Math.max(limit - used, 0);
            const usagePercentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
            
            // Xavf darajasi: Agar 80% dan ko'pini ishlatgan bo'lsa (yoki 20% dan kam qolsa)
            const isDanger = !isUnlimited && usagePercentage >= 80;

            setLimitData({
              limit,
              used,
              remaining,
              usagePercentage,
              isUnlimited,
              isDanger,
              resetDate,
              loading: false
            });
          }
        });
        return () => unsubscribeDb();
      } else {
        setLimitData(prev => ({ ...prev, loading: false }));
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return limitData;
}
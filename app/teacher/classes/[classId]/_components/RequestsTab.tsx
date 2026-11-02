'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { Check, X, Clock, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTeacherLanguage } from '@/app/teacher/layout';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/ui';

// --- 1. TRANSLATION DICTIONARY ---
const REQUESTS_TRANSLATIONS = {
  uz: {
    emptyTitle: "Kutilayotgan so'rovlar yo'q",
    emptyDesc: "Kirish kodi orqali qo'shilgan o'quvchilar shu yerda ko'rinadi.",
    accept: "{name} qabul qilindi",
    errAccept: "Qabul qilishda xatolik",
    confirmReject: "Bu o'quvchini rad etasizmi?",
    rejected: "So'rov rad etildi",
    errReject: "Rad etishda xatolik",
    unknown: "noma'lum"
  },
  en: {
    emptyTitle: "No pending requests",
    emptyDesc: "Students using the Join Code will appear here.",
    accept: "Accepted {name}",
    errAccept: "Error accepting student",
    confirmReject: "Reject this student?",
    rejected: "Request rejected",
    errReject: "Error rejecting",
    unknown: "unknown"
  },
  ru: {
    emptyTitle: "Нет ожидающих запросов",
    emptyDesc: "Ученики, использующие код входа, появятся здесь.",
    accept: "{name} принят(а)",
    errAccept: "Ошибка принятия",
    confirmReject: "Отклонить этого ученика?",
    rejected: "Запрос отклонен",
    errReject: "Ошибка отклонения",
    unknown: "неизвестно"
  }
};

interface Props {
  classId: string;
}

export default function RequestsTab({ classId }: Props) {
  const [requests, setRequests] = useState<any[]>([]);
  
  const { lang } = useTeacherLanguage();
  const t = REQUESTS_TRANSLATIONS[lang] || REQUESTS_TRANSLATIONS['en'];
  const router = useRouter();

  useEffect(() => {
    if (!classId) return;
    const q = query(collection(db, 'classes', classId, 'requests'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [classId]);

  const handleAccept = async (req: any) => {
    try {
      // 🟢 STANDARD UPDATE 🟢
      await updateDoc(doc(db, 'classes', classId), {
        studentIds: arrayUnion(req.studentId)
      });

      // Remove from requests queue
      await deleteDoc(doc(db, 'classes', classId, 'requests', req.id));
      
      toast.success(t.accept.replace("{name}", req.studentName));
    } catch (e) { 
      console.error(e);
      toast.error(t.errAccept); 
    }
  };

  const handleReject = async (reqId: string) => {
    if (!confirm(t.confirmReject)) return;
    try {
      await deleteDoc(doc(db, 'classes', classId, 'requests', reqId));
      toast.success(t.rejected);
    } catch (e) { 
      console.error(e);
      toast.error(t.errReject); 
    }
  };

  if (requests.length === 0) {
    return (
      <div className="py-3 md:py-7 t-glass-card rounded-m3-xl mx-2 md:mx-0">
        <EmptyState icon={<UserPlus />} title={t.emptyTitle} description={t.emptyDesc} />
      </div>
    );
  }

  return (
    <div className="space-y-2.5 md:space-y-3">
      {requests.map((req) => (
        <div 
          key={req.id} 
          className="t-glass-card p-3 md:p-5 rounded-m3-lg flex items-center justify-between gap-3 md:gap-4 hover:shadow-elev-2 active:scale-[0.98] md:active:scale-100 md:hover:-translate-y-0.5 transition-all duration-200 group"
        >
          {/* 🟢 CLICKING LEFT SIDE GOES TO FULL PROFILE */}
          <div 
            onClick={() => router.push(`/teacher/students/${req.studentId}`)}
            className="flex items-center gap-3 md:gap-4 min-w-0 flex-1 cursor-pointer"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-warning-container text-on-warning-container rounded-full flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
              <Clock size={18} className="md:w-[22px] md:h-[22px]" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 pr-2 flex-1">
              <p className="font-black text-[14px] md:text-[15px] text-on-surface group-hover:text-primary transition-colors truncate leading-snug">
                {req.studentName}
              </p>
              <p className="text-[11px] md:text-[12px] font-bold text-on-surface-variant mt-0.5 truncate">
                @{req.studentUsername || t.unknown}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <button 
              onClick={() => handleReject(req.id)}
              className="m3-interactive w-9 h-9 md:w-11 md:h-11 flex items-center justify-center bg-error-container text-on-error-container rounded-full transition-colors active:scale-95"
              title="Reject"
            >
              <X size={16} className="md:w-5 md:h-5" strokeWidth={3} />
            </button>
            <button 
              onClick={() => handleAccept(req)}
              className="m3-interactive w-9 h-9 md:w-11 md:h-11 flex items-center justify-center bg-success text-surface-container-lowest rounded-full transition-all shadow-elev-1 md:shadow-elev-2 active:scale-95"
              title="Accept"
            >
              <Check size={16} className="md:w-5 md:h-5" strokeWidth={3} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
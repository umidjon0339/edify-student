'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { Check, X, Clock, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTeacherLanguage } from '@/app/teacher/layout'; 
import { useRouter } from 'next/navigation';

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
      <div className="py-16 flex flex-col items-center justify-center text-center bg-white rounded-[2rem] border border-slate-200/80 shadow-sm">
        <div className="w-16 h-16 bg-orange-50 rounded-[1.2rem] flex items-center justify-center mb-4 text-orange-400 border border-orange-100 shadow-inner">
          <UserPlus size={32} strokeWidth={2} />
        </div>
        <h3 className="text-[16px] font-black text-slate-800">{t.emptyTitle}</h3>
        <p className="text-[13px] font-medium text-slate-500 mt-1 max-w-xs">{t.emptyDesc}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div 
          key={req.id} 
          className="bg-white p-4 md:p-5 rounded-[1.2rem] border border-slate-200/80 flex items-center justify-between gap-4 shadow-sm hover:shadow-md hover:border-orange-200 hover:-translate-y-0.5 transition-all duration-300 group"
        >
          {/* 🟢 CLICKING LEFT SIDE GOES TO FULL PROFILE */}
          <div 
            onClick={() => router.push(`/teacher/students/${req.studentId}`)}
            className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer"
          >
            <div className="w-12 h-12 bg-orange-50 text-orange-500 border border-orange-100 rounded-[1rem] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
              <Clock size={22} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 pr-2">
              {/* Added group-hover:underline so it feels like a link */}
              <p className="font-black text-[15px] text-slate-900 group-hover:text-orange-600 group-hover:underline transition-colors truncate">
                {req.studentName}
              </p>
              <p className="text-[12px] font-bold text-slate-500 mt-0.5 truncate">
                @{req.studentUsername || t.unknown}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => handleReject(req.id)}
              className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-xl transition-colors border border-red-100/50"
              title="Reject"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
            <button 
              onClick={() => handleAccept(req)}
              className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl transition-all shadow-md shadow-emerald-500/20 active:scale-95"
              title="Accept"
            >
              <Check size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
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
      <div className="text-center py-12 md:py-16 bg-white rounded-3xl md:rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center shadow-sm mx-2 md:mx-0">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-orange-50 rounded-2xl md:rounded-[1.2rem] flex items-center justify-center mb-3 md:mb-4 text-orange-400 border border-orange-100 shadow-inner">
          <UserPlus size={24} className="md:w-8 md:h-8" strokeWidth={2.5} />
        </div>
        <h3 className="text-[15px] md:text-[16px] font-black text-slate-800 mb-1.5">{t.emptyTitle}</h3>
        <p className="text-[13px] font-medium text-slate-500 max-w-xs px-4">{t.emptyDesc}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 md:space-y-3">
      {requests.map((req) => (
        <div 
          key={req.id} 
          className="bg-white p-3 md:p-5 rounded-2xl md:rounded-[1.2rem] border border-slate-200/80 flex items-center justify-between gap-3 md:gap-4 shadow-sm hover:shadow-md hover:border-orange-200 active:scale-[0.98] md:active:scale-100 md:hover:-translate-y-0.5 transition-all duration-200 group"
        >
          {/* 🟢 CLICKING LEFT SIDE GOES TO FULL PROFILE */}
          <div 
            onClick={() => router.push(`/teacher/students/${req.studentId}`)}
            className="flex items-center gap-3 md:gap-4 min-w-0 flex-1 cursor-pointer"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-50 text-orange-500 border border-orange-100 rounded-[10px] md:rounded-[1rem] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
              <Clock size={18} className="md:w-[22px] md:h-[22px]" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 pr-2 flex-1">
              <p className="font-black text-[14px] md:text-[15px] text-slate-900 group-hover:text-orange-600 transition-colors truncate leading-snug">
                {req.studentName}
              </p>
              <p className="text-[11px] md:text-[12px] font-bold text-slate-500 mt-0.5 truncate">
                @{req.studentUsername || t.unknown}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <button 
              onClick={() => handleReject(req.id)}
              className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-[10px] md:rounded-[14px] transition-colors border border-red-100/50 active:scale-95"
              title="Reject"
            >
              <X size={16} className="md:w-5 md:h-5" strokeWidth={3} />
            </button>
            <button 
              onClick={() => handleAccept(req)}
              className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center bg-emerald-500 text-white hover:bg-emerald-600 rounded-[10px] md:rounded-[14px] transition-all shadow-sm md:shadow-md shadow-emerald-500/20 active:scale-95"
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
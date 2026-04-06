'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { Hash, Loader2, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

// --- TRANSLATION DICTIONARY ---
const JOIN_TRANSLATIONS: any = {
  uz: {
    title: "Sinfga Qo'shilish", subtitle: "O'qituvchingizdan olingan 6 xonali kodni kiriting.", placeholder: "M: A1B2C3", btnSend: "So'rov Yuborish", successTitle: "So'rov Yuborildi!", successDesc: "O'qituvchi tasdiqlashini kuting.",
    toasts: { invalid: "Noto'g'ri Sinf Kodi", joined: "Siz allaqachon bu sinfdasiz!", pending: "So'rov allaqachon yuborilgan.", success: "So'rov muvaffaqiyatli yuborildi!", error: "Xatolik yuz berdi" }
  },
  en: {
    title: "Join a Class", subtitle: "Enter the 6-character code from your teacher.", placeholder: "Ex: A1B2C3", btnSend: "Send Request", successTitle: "Request Sent!", successDesc: "Please wait for teacher approval.",
    toasts: { invalid: "Invalid Class Code", joined: "You are already in this class!", pending: "Request already pending.", success: "Request sent successfully!", error: "Something went wrong" }
  },
  ru: {
    title: "Вступить в Класс", subtitle: "Введите 6-значный код от учителя.", placeholder: "Напр: A1B2C3", btnSend: "Отправить Запрос", successTitle: "Запрос Отправлен!", successDesc: "Пожалуйста, ожидайте подтверждения учителя.",
    toasts: { invalid: "Неверный код класса", joined: "Вы уже в этом классе!", pending: "Запрос уже отправлен.", success: "Запрос успешно отправлен!", error: "Что-то пошло не так" }
  }
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: string;
}

export default function JoinClassModal({ isOpen, onClose, lang }: Props) {
  const { user } = useAuth();
  const t = JOIN_TRANSLATIONS[lang] || JOIN_TRANSLATIONS['en'];

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success'>('idle');

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !user) return;
    setLoading(true);

    try {
      // 1. Find the class
      const q = query(collection(db, 'classes'), where('joinCode', '==', code.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast.error(t.toasts.invalid);
        setLoading(false); return;
      }

      const classDoc = snapshot.docs[0];
      const classId = classDoc.id;
      const classData = classDoc.data();

      // 2. Check if already joined
      if (classData.studentIds?.includes(user.uid)) {
        toast.error(t.toasts.joined);
        setLoading(false); return;
      }

      // 3. Check for pending request
      const requestQ = query(collection(db, 'classes', classId, 'requests'), where('studentId', '==', user.uid));
      const requestSnap = await getDocs(requestQ);
      
      if (!requestSnap.empty) {
        toast(t.toasts.pending, { icon: '⏳' });
        setLoading(false); return;
      }

      // 4. Send Request (Notification logic removed for 100k scale safety)
      await addDoc(collection(db, 'classes', classId, 'requests'), {
        studentId: user.uid,
        studentName: user.displayName || 'Unknown Student',
        studentUsername: user.email?.split('@')[0] || 'student', 
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp()
      });

      setStatus('success');
      toast.success(t.toasts.success);
      setTimeout(() => handleClose(), 2000);
    } catch (error) {
      console.error(error);
      toast.error(t.toasts.error);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStatus('idle'); setCode(''); setLoading(false); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={handleClose}></motion.div>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative bg-white w-full max-w-md rounded-[2rem] border-2 border-zinc-200 p-8 shadow-2xl z-10">
        
        <button onClick={handleClose} className="absolute top-4 right-4 p-2 w-10 h-10 flex items-center justify-center text-zinc-400 bg-zinc-100 hover:bg-zinc-200 hover:text-zinc-900 rounded-full transition-colors">
          <X size={20} strokeWidth={3} />
        </button>

        <div className="text-center mb-6 mt-2">
          <div className="w-16 h-16 bg-violet-100 text-violet-600 rounded-[1.2rem] flex items-center justify-center mx-auto mb-4 border-2 border-violet-200">
            <Hash size={32} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{t.title}</h2>
          <p className="text-zinc-500 text-[14px] font-bold mt-1.5">{t.subtitle}</p>
        </div>

        {status === 'success' ? (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 text-center">
            <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-3" strokeWidth={2.5} />
            <h3 className="text-[18px] font-black text-emerald-700">{t.successTitle}</h3>
            <p className="text-emerald-600 text-[14px] font-bold mt-1">{t.successDesc}</p>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text" placeholder={t.placeholder} value={code} maxLength={6} autoFocus
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full text-center text-3xl font-black tracking-[0.3em] p-4 bg-zinc-50 border-2 border-zinc-200 rounded-2xl outline-none focus:border-violet-500 focus:bg-white transition-all placeholder:text-zinc-300 placeholder:font-black text-zinc-900 uppercase"
            />
            <button type="submit" disabled={loading || code.length < 3} className="w-full py-4 bg-violet-500 text-white font-black text-[16px] rounded-2xl border-b-4 border-violet-700 active:border-b-0 active:translate-y-[4px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
              {loading ? <Loader2 className="animate-spin" size={20} /> : t.btnSend}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
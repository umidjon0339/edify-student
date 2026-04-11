'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // 🟢 ADDED PORTAL IMPORT
import { X, Clock, Shuffle, Eye, Lock, CheckCircle, Shield, CalendarClock, EyeOff } from 'lucide-react';
import { useTeacherLanguage } from '@/app/teacher/layout'; 
import { motion, AnimatePresence } from 'framer-motion'; 

// --- 1. TRANSLATION DICTIONARY ---
const CONFIG_TRANSLATIONS = {
  uz: {
    title: "Yakunlash va Nashr Qilish",
    subtitle: "\"{title}\" uchun sozlamalar",
    timeLimit: {
      title: "Vaqt Cheklovi",
      noLimit: "Cheklovsiz",
      fixed: "Belgilangan Vaqt",
      mins: "DAQ"
    },
    shuffle: {
      title: "Savollarni Aralashtirish",
      desc: "Har bir o'quvchi uchun tartibni o'zgartirish"
    },
    security: {
      title: "Javoblar Xavfsizligi",
      afterDue: {
        title: "Muddatdan keyin ko'rsatish",
        desc: "O'quvchilar javoblarni faqat muddat tugagandan so'ng ko'radi."
      },
      never: {
        title: "Hech qachon ko'rsatilmasin",
        desc: "Qat'iy rejim. Faqat yakuniy ball ko'rinadi."
      },
      always: {
        title: "Darhol ko'rsatish",
        desc: "Javoblar topshirilgandan so'ng darhol ochiladi."
      }
    },
    accessCode: "Maxfiy Kirish Kodi",
    buttons: {
      cancel: "Bekor qilish",
      publishing: "Nashr qilinmoqda...",
      confirm: "Tasdiqlash va Nashr Qilish"
    }
  },
  en: {
    title: "Finalize & Publish",
    subtitle: "Settings for \"{title}\"",
    timeLimit: {
      title: "Time Limit",
      noLimit: "No Limit",
      fixed: "Fixed Time",
      mins: "MINS"
    },
    shuffle: {
      title: "Shuffle Questions",
      desc: "Randomize order for every student"
    },
    security: {
      title: "Answer Key Security",
      afterDue: {
        title: "Show After Deadline",
        desc: "Students see answers only after the due date."
      },
      never: {
        title: "Never Show Answers",
        desc: "Strict mode. Students only see their final score."
      },
      always: {
        title: "Show Immediately",
        desc: "Answers revealed right after submission."
      }
    },
    accessCode: "Secret Access Code",
    buttons: {
      cancel: "Cancel",
      publishing: "Publishing...",
      confirm: "Confirm & Publish"
    }
  },
  ru: {
    title: "Завершить и Опубликовать",
    subtitle: "Настройки для \"{title}\"",
    timeLimit: {
      title: "Ограничение времени",
      noLimit: "Без лимита",
      fixed: "Фиксированное",
      mins: "МИН"
    },
    shuffle: {
      title: "Перемешать вопросы",
      desc: "Случайный порядок для каждого ученика"
    },
    security: {
      title: "Безопасность ответов",
      afterDue: {
        title: "Показать после срока",
        desc: "Ответы открываются после истечения срока."
      },
      never: {
        title: "Никогда не показывать",
        desc: "Строгий режим. Виден только итоговый балл."
      },
      always: {
        title: "Показать сразу",
        desc: "Ответы открываются сразу после сдачи."
      }
    },
    accessCode: "Секретный Код Доступа",
    buttons: {
      cancel: "Отмена",
      publishing: "Публикация...",
      confirm: "Подтвердить и Опубликовать"
    }
  }
};

// --- INTERFACE ---
interface TestSettings {
  duration: number; 
  shuffleQuestions: boolean;
  resultsVisibility: 'always' | 'after_due' | 'never'; 
  accessCode: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: TestSettings) => void;
  questionCount: number;
  testTitle: string;
  isSaving: boolean;
}

export default function TestConfigurationModal({ 
  isOpen, onClose, onConfirm, questionCount, testTitle, isSaving 
}: Props) {
  
  const { lang } = useTeacherLanguage();
  const t = CONFIG_TRANSLATIONS[lang];

  // 🟢 MOUNTED STATE FOR PORTAL SSR FIX
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [duration, setDuration] = useState<number>(45);
  const [isTimeLimited, setIsTimeLimited] = useState(true);
  const [shuffle, setShuffle] = useState(true);
  const [visibility, setVisibility] = useState<'always' | 'after_due' | 'never'>('after_due');
  
  const [accessCode] = useState(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  });

  const handlePublish = () => {
    onConfirm({
      duration: isTimeLimited ? duration : 0,
      shuffleQuestions: shuffle,
      resultsVisibility: visibility, 
      accessCode: accessCode
    });
  };

  // 🟢 SSR PREVENT ERROR
  if (!mounted) return null;

  // 🟢 WRAPPED IN CREATE PORTAL
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
          
          {/* BACKGROUND BLUR */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={onClose}
          />

          {/* UPGRADED MODAL CARD */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] w-full max-w-xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] z-10"
          >
            
            {/* HEADER */}
            <div className="bg-white border-b border-slate-100 p-6 flex justify-between items-start shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                  <Shield size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">{t.title}</h2>
                  <p className="text-[13px] font-medium text-slate-500 mt-0.5 max-w-[280px] truncate">
                    {t.subtitle.replace("{title}", testTitle)}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
              
              {/* 1. TIME LIMIT */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[13px] font-bold text-slate-400 uppercase tracking-widest">
                  <Clock size={14} className="text-indigo-500" /> {t.timeLimit.title}
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/60">
                  <button 
                    onClick={() => setIsTimeLimited(false)} 
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${!isTimeLimited ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {t.timeLimit.noLimit}
                  </button>
                  <button 
                    onClick={() => setIsTimeLimited(true)} 
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${isTimeLimited ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {t.timeLimit.fixed}
                  </button>
                  {isTimeLimited && (
                    <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} className="flex items-center gap-2 pr-2 overflow-hidden">
                      <input 
                        type="number" min="5" max="180" 
                        value={duration} 
                        onChange={(e) => setDuration(Number(e.target.value))} 
                        className="w-16 px-2 py-2 text-center font-black text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                      />
                      <span className="text-[11px] font-black text-slate-400">{t.timeLimit.mins}</span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* 2. SHUFFLE */}
              <div 
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group ${shuffle ? 'bg-indigo-50/50 border-indigo-500 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-200'}`}
                onClick={() => setShuffle(!shuffle)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${shuffle ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-400'}`}>
                    <Shuffle size={18} />
                  </div>
                  <div>
                    <p className={`text-[15px] font-bold ${shuffle ? 'text-indigo-900' : 'text-slate-700'}`}>{t.shuffle.title}</p>
                    <p className="text-[13px] font-medium text-slate-500 mt-0.5">{t.shuffle.desc}</p>
                  </div>
                </div>
                {shuffle && <CheckCircle size={20} className="text-indigo-500 mr-2" />}
              </div>

              {/* 3. ANSWER VISIBILITY */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[13px] font-bold text-slate-400 uppercase tracking-widest">
                  <Shield size={14} className="text-indigo-500" /> {t.security.title}
                </div>
                <div className="grid grid-cols-1 gap-3">
                  
                  {/* Option A: After Deadline */}
                  <div 
                    onClick={() => setVisibility('after_due')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center gap-4 transition-all ${visibility === 'after_due' ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${visibility === 'after_due' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <CalendarClock size={18} />
                    </div>
                    <div>
                      <p className={`text-[15px] font-bold ${visibility === 'after_due' ? 'text-emerald-900' : 'text-slate-700'}`}>{t.security.afterDue.title}</p>
                      <p className="text-[13px] font-medium text-slate-500 mt-0.5 leading-relaxed">{t.security.afterDue.desc}</p>
                    </div>
                    {visibility === 'after_due' && <CheckCircle size={20} className="text-emerald-500 ml-auto shrink-0" />}
                  </div>

                  {/* Option B: Never */}
                  <div 
                    onClick={() => setVisibility('never')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center gap-4 transition-all ${visibility === 'never' ? 'border-slate-800 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${visibility === 'never' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <EyeOff size={18} />
                    </div>
                    <div>
                      <p className={`text-[15px] font-bold ${visibility === 'never' ? 'text-slate-900' : 'text-slate-700'}`}>{t.security.never.title}</p>
                      <p className="text-[13px] font-medium text-slate-500 mt-0.5 leading-relaxed">{t.security.never.desc}</p>
                    </div>
                    {visibility === 'never' && <CheckCircle size={20} className="text-slate-800 ml-auto shrink-0" />}
                  </div>

                  {/* Option C: Always */}
                  <div 
                    onClick={() => setVisibility('always')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center gap-4 transition-all ${visibility === 'always' ? 'border-amber-400 bg-amber-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${visibility === 'always' ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <Eye size={18} />
                    </div>
                    <div>
                      <p className={`text-[15px] font-bold ${visibility === 'always' ? 'text-amber-900' : 'text-slate-700'}`}>{t.security.always.title}</p>
                      <p className="text-[13px] font-medium text-slate-500 mt-0.5 leading-relaxed">{t.security.always.desc}</p>
                    </div>
                    {visibility === 'always' && <CheckCircle size={20} className="text-amber-500 ml-auto shrink-0" />}
                  </div>

                </div>
              </div>

              {/* 4. ACCESS CODE (Premium Style) */}
              <div className="bg-slate-900 rounded-2xl p-5 flex items-center justify-between shadow-inner relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/20 rounded-full blur-xl pointer-events-none"></div>
                <div className="relative z-10">
                  <p className="text-[11px] text-indigo-300 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-2">
                    <Lock size={12} /> {t.accessCode}
                  </p>
                  <p className="text-3xl font-mono font-black tracking-[0.2em] text-white">
                    {accessCode}
                  </p>
                </div>
              </div>

            </div>

            {/* FOOTER */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
              <button 
                onClick={onClose} 
                className="w-full sm:w-auto px-6 py-3.5 font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
              >
                {t.buttons.cancel}
              </button>
              <button 
                onClick={handlePublish} 
                disabled={isSaving} 
                className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <CheckCircle size={20} />
                )}
                {isSaving ? t.buttons.publishing : t.buttons.confirm}
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
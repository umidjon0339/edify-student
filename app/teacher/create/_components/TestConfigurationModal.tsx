'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Shuffle, Eye, Lock, CheckCircle, Shield, CalendarClock, EyeOff } from 'lucide-react';
import { useTeacherLanguage } from '@/app/teacher/layout'; 
import { motion, AnimatePresence } from 'framer-motion'; 

const CONFIG_TRANSLATIONS = {
  uz: {
    title: "Yakunlash va Nashr Qilish",
    subtitle: "\"{title}\" uchun sozlamalar",
    timeLimit: { title: "Vaqt Cheklovi", noLimit: "Cheklovsiz", fixed: "Belgilangan", mins: "DAQ" },
    shuffle: { title: "Savollarni Aralashtirish", desc: "Har bir o'quvchi uchun tartibni o'zgartirish" },
    security: {
      title: "Javoblar Xavfsizligi",
      afterDue: { title: "Muddatdan keyin ko'rsatish", desc: "O'quvchilar javoblarni faqat muddat tugagandan so'ng ko'radi." },
      never: { title: "Hech qachon ko'rsatilmasin", desc: "Qat'iy rejim. Faqat yakuniy ball ko'rinadi." },
      always: { title: "Darhol ko'rsatish", desc: "Javoblar topshirilgandan so'ng darhol ochiladi." }
    },
    accessCode: "Maxfiy Kirish Kodi",
    buttons: { cancel: "Bekor qilish", publishing: "Nashr qilinmoqda...", confirm: "Tasdiqlash va Nashr Qilish" }
  },
  en: {
    title: "Finalize & Publish",
    subtitle: "Settings for \"{title}\"",
    timeLimit: { title: "Time Limit", noLimit: "No Limit", fixed: "Fixed Time", mins: "MINS" },
    shuffle: { title: "Shuffle Questions", desc: "Randomize order for every student" },
    security: {
      title: "Answer Key Security",
      afterDue: { title: "Show After Deadline", desc: "Students see answers only after the due date." },
      never: { title: "Never Show Answers", desc: "Strict mode. Students only see their final score." },
      always: { title: "Show Immediately", desc: "Answers revealed right after submission." }
    },
    accessCode: "Secret Access Code",
    buttons: { cancel: "Cancel", publishing: "Publishing...", confirm: "Confirm & Publish" }
  },
  ru: {
    title: "Завершить и Опубликовать",
    subtitle: "Настройки для \"{title}\"",
    timeLimit: { title: "Ограничение времени", noLimit: "Без лимита", fixed: "Фиксированное", mins: "МИН" },
    shuffle: { title: "Перемешать вопросы", desc: "Случайный порядок для каждого ученика" },
    security: {
      title: "Безопасность ответов",
      afterDue: { title: "Показать после срока", desc: "Ответы открываются после истечения срока." },
      never: { title: "Никогда не показывать", desc: "Строгий режим. Виден только итоговый балл." },
      always: { title: "Показать сразу", desc: "Ответы открываются сразу после сдачи." }
    },
    accessCode: "Секретный Код Доступа",
    buttons: { cancel: "Отмена", publishing: "Публикация...", confirm: "Подтвердить и Опубликовать" }
  }
};

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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-6">
          
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={onClose}
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: "100%" }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative bg-white rounded-t-[2rem] sm:rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] w-full max-w-xl flex flex-col h-[90dvh] sm:h-auto sm:max-h-[90vh] z-10"
          >
            
            {/* HEADER */}
            <div className="bg-white border-b border-slate-100 p-5 md:p-6 flex justify-between items-center shrink-0 rounded-t-[2rem] sm:rounded-t-3xl z-20">
              <div className="flex items-center gap-3 md:gap-4 min-w-0 pr-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                  <Shield size={20} className="md:w-6 md:h-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[16px] md:text-xl font-black text-slate-900 tracking-tight truncate">{t.title}</h2>
                  <p className="text-[11px] md:text-[13px] font-medium text-slate-500 mt-0.5 truncate">
                    {t.subtitle.replace("{title}", testTitle)}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-full sm:rounded-lg transition-colors shrink-0 border border-slate-200 sm:border-none">
                <X size={20} />
              </button>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="flex-1 p-5 md:p-6 space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar bg-[#FAFAFA] sm:bg-white">
              
              {/* 1. TIME LIMIT */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[12px] md:text-[13px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  <Clock size={14} className="text-indigo-500" /> {t.timeLimit.title}
                </div>
                <div className="flex items-center gap-2 md:gap-3 p-1.5 bg-white sm:bg-slate-100/80 rounded-xl md:rounded-2xl border border-slate-200 sm:border-slate-200/60 shadow-sm sm:shadow-none">
                  <button onClick={() => setIsTimeLimited(false)} className={`flex-1 py-3 md:py-2.5 px-2 md:px-4 rounded-lg md:rounded-xl text-[13px] md:text-sm font-bold transition-all ${!isTimeLimited ? 'bg-indigo-50 sm:bg-white text-indigo-700 sm:text-indigo-600 border border-indigo-200 sm:border-transparent shadow-sm' : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}>
                    {t.timeLimit.noLimit}
                  </button>
                  <button onClick={() => setIsTimeLimited(true)} className={`flex-1 py-3 md:py-2.5 px-2 md:px-4 rounded-lg md:rounded-xl text-[13px] md:text-sm font-bold transition-all ${isTimeLimited ? 'bg-indigo-50 sm:bg-white text-indigo-700 sm:text-indigo-600 border border-indigo-200 sm:border-transparent shadow-sm' : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}>
                    {t.timeLimit.fixed}
                  </button>
                  {isTimeLimited && (
                    <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} className="flex items-center gap-1.5 md:gap-2 pr-1 md:pr-2 overflow-hidden shrink-0">
                      <input 
                        type="number" min="5" max="180" value={duration} onChange={(e) => setDuration(Number(e.target.value))} 
                        className="w-14 md:w-16 px-1 md:px-2 py-2 text-center font-black text-indigo-700 bg-indigo-100/50 sm:bg-indigo-50 border border-indigo-200 rounded-lg text-[13px] md:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                      />
                      <span className="text-[10px] md:text-[11px] font-black text-slate-400">{t.timeLimit.mins}</span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* 2. SHUFFLE */}
              <div 
                className={`p-4 md:p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group bg-white ${shuffle ? 'border-indigo-500 shadow-[0_4px_12px_rgba(99,102,241,0.1)]' : 'border-slate-200 shadow-sm'}`}
                onClick={() => setShuffle(!shuffle)}
              >
                <div className="flex items-center gap-3.5 md:gap-4">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors ${shuffle ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Shuffle size={18} className="md:w-5 md:h-5" />
                  </div>
                  <div>
                    <p className={`text-[14px] md:text-[15px] font-bold ${shuffle ? 'text-indigo-900' : 'text-slate-800'}`}>{t.shuffle.title}</p>
                    <p className="text-[12px] md:text-[13px] font-medium text-slate-500 mt-0.5 leading-snug pr-4">{t.shuffle.desc}</p>
                  </div>
                </div>
                {shuffle && <CheckCircle size={20} className="text-indigo-500 shrink-0" />}
              </div>

              {/* 3. ANSWER VISIBILITY */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[12px] md:text-[13px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  <Shield size={14} className="text-indigo-500" /> {t.security.title}
                </div>
                <div className="grid grid-cols-1 gap-2.5 md:gap-3">
                  
                  <div onClick={() => setVisibility('after_due')} className={`p-3.5 md:p-4 rounded-2xl border-2 cursor-pointer flex items-center gap-3.5 md:gap-4 transition-all bg-white ${visibility === 'after_due' ? 'border-emerald-500 shadow-sm' : 'border-slate-200'}`}>
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${visibility === 'after_due' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <CalendarClock size={18} className="md:w-5 md:h-5" />
                    </div>
                    <div className="pr-2">
                      <p className={`text-[14px] md:text-[15px] font-bold ${visibility === 'after_due' ? 'text-emerald-900' : 'text-slate-800'}`}>{t.security.afterDue.title}</p>
                      <p className="text-[12px] md:text-[13px] font-medium text-slate-500 mt-0.5 leading-snug">{t.security.afterDue.desc}</p>
                    </div>
                    {visibility === 'after_due' && <CheckCircle size={20} className="text-emerald-500 ml-auto shrink-0" />}
                  </div>

                  <div onClick={() => setVisibility('never')} className={`p-3.5 md:p-4 rounded-2xl border-2 cursor-pointer flex items-center gap-3.5 md:gap-4 transition-all bg-white ${visibility === 'never' ? 'border-slate-800 shadow-sm' : 'border-slate-200'}`}>
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${visibility === 'never' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <EyeOff size={18} className="md:w-5 md:h-5" />
                    </div>
                    <div className="pr-2">
                      <p className={`text-[14px] md:text-[15px] font-bold ${visibility === 'never' ? 'text-slate-900' : 'text-slate-800'}`}>{t.security.never.title}</p>
                      <p className="text-[12px] md:text-[13px] font-medium text-slate-500 mt-0.5 leading-snug">{t.security.never.desc}</p>
                    </div>
                    {visibility === 'never' && <CheckCircle size={20} className="text-slate-800 ml-auto shrink-0" />}
                  </div>

                  <div onClick={() => setVisibility('always')} className={`p-3.5 md:p-4 rounded-2xl border-2 cursor-pointer flex items-center gap-3.5 md:gap-4 transition-all bg-white ${visibility === 'always' ? 'border-amber-400 shadow-sm' : 'border-slate-200'}`}>
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${visibility === 'always' ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <Eye size={18} className="md:w-5 md:h-5" />
                    </div>
                    <div className="pr-2">
                      <p className={`text-[14px] md:text-[15px] font-bold ${visibility === 'always' ? 'text-amber-900' : 'text-slate-800'}`}>{t.security.always.title}</p>
                      <p className="text-[12px] md:text-[13px] font-medium text-slate-500 mt-0.5 leading-snug">{t.security.always.desc}</p>
                    </div>
                    {visibility === 'always' && <CheckCircle size={20} className="text-amber-500 ml-auto shrink-0" />}
                  </div>

                </div>
              </div>

              {/* 4. ACCESS CODE */}
              <div className="bg-slate-900 rounded-2xl p-5 md:p-6 flex items-center justify-between shadow-lg relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 md:w-32 md:h-32 bg-indigo-500/20 rounded-full blur-xl md:blur-2xl pointer-events-none"></div>
                <div className="relative z-10">
                  <p className="text-[10px] md:text-[11px] text-indigo-300 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-2">
                    <Lock size={12} /> {t.accessCode}
                  </p>
                  <p className="text-2xl md:text-3xl font-mono font-black tracking-[0.2em] text-white">
                    {accessCode}
                  </p>
                </div>
              </div>

            </div>

            {/* FOOTER (Always sticky at bottom on mobile) */}
            <div className="p-4 md:p-5 border-t border-slate-100 bg-white sm:bg-slate-50 flex flex-col sm:flex-row justify-end gap-3 shrink-0 rounded-b-none sm:rounded-b-3xl z-20 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5">
              <button 
                onClick={onClose} 
                className="w-full sm:w-auto px-6 py-3.5 md:py-3 font-bold text-slate-600 bg-slate-100 sm:bg-white border border-slate-200 hover:bg-slate-200 sm:hover:bg-slate-100 rounded-xl transition-colors text-[14px]"
              >
                {t.buttons.cancel}
              </button>
              <button 
                onClick={handlePublish} 
                disabled={isSaving} 
                className="w-full sm:w-auto px-8 py-3.5 md:py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-[14px]"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <CheckCircle size={18} />
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
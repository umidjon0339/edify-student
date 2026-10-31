'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import {
  X, Save, Trash2, Archive, RefreshCw, Settings, FileText,
  Clock, CheckCircle, Shield, Eye, EyeOff, CalendarClock, AlertTriangle, PenLine,
  Calendar, KeyRound, Layers
} from 'lucide-react';
import CartItem from '../../create/_components/CartItem'; // Adjust path if needed
import { normalizeQuestions } from '@/lib/questionSchema';
import toast from 'react-hot-toast';
import { useTeacherLanguage } from '@/app/teacher/layout';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Button, IconButton, PillGroup, Switch, cn } from '@/components/ui';

// --- TRANSLATION DICTIONARY ---
const EDIT_TEST_TRANSLATIONS: Record<string, any> = {
  uz: {
    title: "Testni Boshqarish", tabs: { settings: "Sozlamalar", questions: "Savollar" },
    info: { active: "Faol", archived: "Arxiv", created: "Yaratilgan", code: "Kod", items: "ta savol" },
    settings: {
      name: "Test Nomi", duration: "Vaqt", mins: "daq", none: "Cheklovsiz", custom: "MAXSUS", unlimited: "(Cheklovsiz)",
      shuffleTitle: "Savollarni Aralashtirish", shuffleDesc: "Har bir o'quvchi uchun tartibni o'zgartirish",
      securityTitle: "Javoblar Xavfsizligi",
      afterDue: { title: "Muddatdan keyin", desc: "Muddat tugagach ochiladi." },
      never: { title: "Hech qachon", desc: "Faqat yakuniy ball." },
      always: { title: "Darhol", desc: "Topshirgach ochiladi." },
      danger: "Xavfli Hudud", archive: "Arxivlash", restore: "Tiklash", delete: "O'chirish"
    },
    questions: { empty: "Savollar mavjud emas." }, buttons: { save: "Saqlash", saving: "Saqlanmoqda...", close: "Yopish" },
    toasts: { saved: "Saqlandi!", failSave: "Xatolik", archived: "Arxivlandi", restored: "Tiklandi", failStatus: "Xatolik", deleted: "O'chirildi", failDelete: "Xatolik", confirmDelete: "Ishonchingiz komilmi? Qaytarib bo'lmaydi." }
  },
  en: {
    title: "Manage Test", tabs: { settings: "Settings", questions: "Questions" },
    info: { active: "Active", archived: "Archived", created: "Created", code: "Code", items: "questions" },
    settings: {
      name: "Test Name", duration: "Time", mins: "min", none: "No limit", custom: "CUSTOM", unlimited: "(No limit)",
      shuffleTitle: "Shuffle Questions", shuffleDesc: "Change the order for every student",
      securityTitle: "Answer Security",
      afterDue: { title: "After due date", desc: "Revealed once the deadline passes." },
      never: { title: "Never", desc: "Final score only." },
      always: { title: "Immediately", desc: "Revealed upon submission." },
      danger: "Danger Zone", archive: "Archive", restore: "Restore", delete: "Delete"
    },
    questions: { empty: "No questions available." }, buttons: { save: "Save", saving: "Saving...", close: "Close" },
    toasts: { saved: "Saved!", failSave: "Error", archived: "Archived", restored: "Restored", failStatus: "Error", deleted: "Deleted", failDelete: "Error", confirmDelete: "Are you sure? This cannot be undone." }
  },
  ru: {
    title: "Управление Тестом", tabs: { settings: "Настройки", questions: "Вопросы" },
    info: { active: "Активен", archived: "Архив", created: "Создан", code: "Код", items: "вопр." },
    settings: {
      name: "Название Теста", duration: "Время", mins: "мин", none: "Без лимита", custom: "СВОЁ", unlimited: "(Без лимита)",
      shuffleTitle: "Перемешать Вопросы", shuffleDesc: "Менять порядок для каждого ученика",
      securityTitle: "Безопасность Ответов",
      afterDue: { title: "После дедлайна", desc: "Откроются после срока сдачи." },
      never: { title: "Никогда", desc: "Только итоговый балл." },
      always: { title: "Сразу", desc: "Откроются после отправки." },
      danger: "Опасная Зона", archive: "Архивировать", restore: "Восстановить", delete: "Удалить"
    },
    questions: { empty: "Вопросов нет." }, buttons: { save: "Сохранить", saving: "Сохранение...", close: "Закрыть" },
    toasts: { saved: "Сохранено!", failSave: "Ошибка", archived: "В архиве", restored: "Восстановлено", failStatus: "Ошибка", deleted: "Удалено", failDelete: "Ошибка", confirmDelete: "Вы уверены? Это нельзя отменить." }
  }
};

interface Props { test: any; isOpen: boolean; onClose: () => void; }

export default function EditTestModal({ test, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'settings' | 'questions'>('settings');
  const [isSaving, setIsSaving] = useState(false);
  const { lang } = useTeacherLanguage();
  const t = EDIT_TEST_TRANSLATIONS[lang] || EDIT_TEST_TRANSLATIONS['uz'];

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [settings, setSettings] = useState({
    title: '', duration: 0, shuffle: false, resultsVisibility: 'never' as 'always' | 'never' | 'after_due', status: 'active'
  });

  // ⚠️ THIS ARRAY IS WHAT GETS WRITTEN BACK TO FIRESTORE.
  // It holds the ORIGINAL, untouched question docs (legacy-shaped or canonical v1)
  // exactly as they were stored in custom_tests.questions[]. It is never a
  // NormalizedQuestion — those carry a `raw` field and a rewritten shape, and
  // persisting them would corrupt the saved test.
  const [rawQuestions, setRawQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (test) {
      let visibility = test.resultsVisibility;
      if (!visibility) visibility = test.showResults ? 'always' : 'never';
      setSettings({ title: test.title || '', duration: test.duration || 0, shuffle: test.shuffle || false, resultsVisibility: visibility, status: test.status || 'active' });

      // The library page hands us questions that have already been normalized for
      // display, so unwrap `.raw` back to the original doc. If a caller passes raw
      // questions straight from Firestore (no `.raw`), they are kept as-is.
      const source: any[] = Array.isArray(test.questions) ? test.questions : [];
      setRawQuestions(source.map((q: any) => (q && typeof q === 'object' && q.raw ? q.raw : q)));
    }
  }, [test]);

  // Display-only view model. Never written anywhere.
  const displayQuestions = useMemo(() => normalizeQuestions(rawQuestions, lang), [rawQuestions, lang]);

  if (!isOpen) return null;

  // Remove by INDEX, not by id: legacy snapshots are not guaranteed to carry a
  // unique `id`, and an empty id would otherwise delete every id-less question.
  const handleRemoveQuestion = (index: number) =>
    setRawQuestions(prev => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'custom_tests', test.id);
      // `rawQuestions` — the original docs, minus any the teacher removed.
      await updateDoc(docRef, { ...settings, showResults: settings.resultsVisibility === 'always', questions: rawQuestions, questionCount: rawQuestions.length });
      toast.success(t.toasts.saved);
      onClose();
    } catch (error) { toast.error(t.toasts.failSave); } finally { setIsSaving(false); }
  };

  const handleArchiveToggle = async () => {
    const newStatus = settings.status === 'active' ? 'archived' : 'active';
    try {
      await updateDoc(doc(db, 'custom_tests', test.id), { status: newStatus });
      toast.success(newStatus === 'archived' ? t.toasts.archived : t.toasts.restored);
      onClose();
    } catch (e) { toast.error(t.toasts.failStatus); }
  };

  const handleDeleteTest = async () => {
    if (!confirm(t.toasts.confirmDelete)) return;
    try {
      await deleteDoc(doc(db, 'custom_tests', test.id));
      toast.success(t.toasts.deleted);
      onClose();
    } catch (e) { toast.error(t.toasts.failDelete); }
  };

  const durationOptions = [0, 10, 20, 30, 45, 60];

  // The details the library card no longer shows (status · created · code ·
  // duration · count) are summarised here, under the title.
  const createdLabel = (() => {
    if (!test.createdAt) return '';
    try {
      const d = test.createdAt?.toDate ? test.createdAt.toDate() : new Date(test.createdAt);
      const locales: Record<string, string> = { uz: 'uz-UZ', en: 'en-US', ru: 'ru-RU' };
      return new Intl.DateTimeFormat(locales[lang] || 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
    } catch { return ''; }
  })();
  const isActiveTest = settings.status !== 'archived';
  const INFO = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold";

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={onClose}></motion.div>

          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative bg-surface-container-low rounded-t-m3-xl sm:rounded-m3-xl w-full max-w-3xl h-[85vh] sm:h-[80vh] flex flex-col overflow-hidden shadow-elev-3 z-10"
          >

            {/* 🟢 HEADER */}
            <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center z-20 shrink-0 bg-surface-container-low">
              <div className="flex-1 mr-4 min-w-0">
                <div className="flex items-center gap-2 group">
                  <input
                    type="text" value={settings.title} onChange={(e) => setSettings({...settings, title: e.target.value})} placeholder={t.settings.name}
                    className="text-[16px] md:text-[18px] font-black text-on-surface bg-transparent border-none outline-none w-full placeholder:text-on-surface-variant focus:ring-0 p-0 truncate"
                  />
                  <PenLine size={14} className="text-outline group-focus-within:text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hidden sm:block" />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className={cn(INFO, "t-glass-pill text-on-surface-variant")}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", isActiveTest ? "bg-success" : "bg-outline")} />
                    {isActiveTest ? t.info.active : t.info.archived}
                  </span>
                  {createdLabel && (
                    <span className={cn(INFO, "t-glass-pill text-on-surface-variant")} title={t.info.created}>
                      <Calendar size={12} /> {createdLabel}
                    </span>
                  )}
                  {test.accessCode && (
                    <span className={cn(INFO, "t-icon-chip-soft")} title={t.info.code}>
                      <KeyRound size={12} /> <span className="font-mono tracking-wider">{test.accessCode}</span>
                    </span>
                  )}
                  <span className={cn(INFO, "t-glass-pill text-on-surface-variant")}>
                    <Clock size={12} /> {settings.duration ? `${settings.duration} ${t.settings.mins}` : t.settings.none}
                  </span>
                  <span className={cn(INFO, "t-glass-pill text-on-surface-variant tabular-nums")}>
                    <Layers size={12} /> {rawQuestions.length} {t.info.items}
                  </span>
                </div>
              </div>
              <IconButton aria-label={t.buttons.close} onClick={onClose} className="shrink-0">
                <X size={20}/>
              </IconButton>
            </div>

            {/* 🟢 TABS */}
            <div className="px-5 py-3 border-b border-outline-variant z-10 shrink-0 bg-surface-container-low">
              <PillGroup
                ariaLabel={t.title}
                value={activeTab}
                onChange={setActiveTab}
                options={[
                  { id: 'settings', label: <span className="flex items-center gap-2"><Settings size={15} strokeWidth={2.4} /> {t.tabs.settings}</span> },
                  { id: 'questions', label: <span className="flex items-center gap-2"><FileText size={15} strokeWidth={2.4} /> {t.tabs.questions} <span className="rounded-full bg-[color-mix(in_oklab,currentColor_14%,transparent)] px-2 py-0.5 text-[10px] tabular-nums">{rawQuestions.length}</span></span> },
                ]}
              />
            </div>

            {/* 🟢 SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-6 bg-surface-container">

              {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto space-y-6">

                  {/* Duration */}
                  <div className="t-panel p-4 md:p-5 rounded-m3-xl">
                    <label className="text-[12px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5 mb-3">
                        <Clock size={14} className="text-primary"/> {t.settings.duration}
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* A custom value outside the presets simply leaves no preset selected. */}
                      <PillGroup
                        ariaLabel={t.settings.duration}
                        value={String(settings.duration)}
                        onChange={(v) => setSettings({ ...settings, duration: Number(v) })}
                        options={durationOptions.map((mins) => ({ id: String(mins), label: mins === 0 ? t.settings.none : `${mins} ${t.settings.mins}` }))}
                      />
                      <label className={cn(
                        "t-glass-pill flex h-[52px] items-center gap-2 rounded-full pl-4 pr-2 focus-within:ring-2 focus-within:ring-primary",
                        !durationOptions.includes(settings.duration) && "ring-2 ring-primary",
                      )}>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t.settings.custom}</span>
                        <input type="number" min="0" value={settings.duration} onChange={(e) => setSettings({...settings, duration: Number(e.target.value)})} className="w-14 bg-transparent text-[13px] font-bold text-center text-on-surface outline-none py-2" />
                      </label>
                    </div>
                  </div>

                  {/* Shuffle */}
                  <div className="t-panel p-4 md:p-5 rounded-m3-xl flex items-center justify-between">
                    <div>
                        <div className="text-[14px] font-black text-on-surface">{t.settings.shuffleTitle}</div>
                        <p className="text-[12px] text-on-surface-variant font-medium mt-0.5">{t.settings.shuffleDesc}</p>
                    </div>
                    <Switch checked={settings.shuffle} onChange={() => setSettings({...settings, shuffle: !settings.shuffle})} />
                  </div>

                  {/* Visibility */}
                  <div className="t-panel p-4 md:p-5 rounded-m3-xl">
                    <label className="text-[12px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5 mb-3">
                        <Shield size={14} className="text-primary"/> {t.settings.securityTitle}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {([
                        { id: 'never', icon: EyeOff, copy: t.settings.never },
                        { id: 'after_due', icon: CalendarClock, copy: t.settings.afterDue },
                        { id: 'always', icon: Eye, copy: t.settings.always },
                      ] as const).map(({ id, icon: Icon, copy }) => {
                        const on = settings.resultsVisibility === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setSettings({ ...settings, resultsVisibility: id })}
                            className={cn(
                              "flex items-center gap-3 rounded-m3-xl p-3 text-left transition-all",
                              on ? "t-icon-chip" : "t-glass-pill text-on-surface hover:ring-1 hover:ring-primary",
                            )}
                          >
                            <span className={cn(
                              "grid h-9 w-9 shrink-0 place-items-center rounded-full",
                              on ? "bg-[color-mix(in_oklab,currentColor_18%,transparent)]" : "t-icon-chip-soft",
                            )}>
                              <Icon size={16} />
                            </span>
                            <span className="leading-tight">
                              <span className="block text-[13px] font-bold mb-0.5">{copy.title}</span>
                              <span className={cn("block text-[10.5px] font-medium", on ? "opacity-85" : "text-on-surface-variant")}>{copy.desc}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="p-4 md:p-5 rounded-m3-xl border border-error bg-[color-mix(in_oklab,var(--m3-error)_8%,transparent)] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[11px] font-black text-error uppercase tracking-widest flex items-center gap-1.5 w-full sm:w-auto"><AlertTriangle size={14} /> {t.settings.danger}</p>
                    <div className="flex gap-2 w-full sm:w-auto">
                       <Button variant="elevated" onClick={handleArchiveToggle} className="flex-1 sm:flex-none" icon={settings.status === 'active' ? <Archive size={16}/> : <RefreshCw size={16}/>}>
                         {settings.status === 'active' ? t.settings.archive : t.settings.restore}
                       </Button>
                       <Button variant="danger" onClick={handleDeleteTest} className="flex-1 sm:flex-none" icon={<Trash2 size={16}/>}>
                         {t.settings.delete}
                       </Button>
                    </div>
                  </div>

                </div>
              )}

              {activeTab === 'questions' && (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {/* CartItem renders the NORMALIZED question (legacy-shaped: options map,
                      answer letter, difficulty string) — display only. Removal acts on the
                      raw array by index, so the write path stays untouched. */}
                  {displayQuestions.map((q, idx) => (
                    <div key={q.id || idx} className="bg-surface-container-low p-1 rounded-m3-lg shadow-elev-1"><CartItem question={q} index={idx + 1} onRemove={() => handleRemoveQuestion(idx)} /></div>
                  ))}
                  {displayQuestions.length === 0 && (
                    <div className="text-center py-16 bg-surface-container-low rounded-m3-lg border-2 border-dashed border-outline-variant flex flex-col items-center">
                      <div className="w-12 h-12 bg-surface-container rounded-m3-md flex items-center justify-center mb-3 shadow-elev-1"><AlertTriangle size={24} className="text-on-surface-variant"/></div>
                      <span className="text-[14px] font-bold text-on-surface-variant">{t.questions.empty}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 🟢 FOOTER */}
            <div className="px-5 py-4 border-t border-outline-variant bg-surface-container-low flex justify-end shrink-0 z-20 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4">
               <Button variant="filled" size="lg" onClick={handleSave} loading={isSaving} icon={<Save size={18}/>} className="w-full sm:w-auto">
                 {isSaving ? t.buttons.saving : t.buttons.save}
               </Button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body // 🟢 TELLS THE PORTAL TO RENDER IN THE BODY
  );
}

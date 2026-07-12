// app/(student)/rushmodel/componentss/MathematicsCard.tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, ChevronRight, ChevronDown,
  Pi, Triangle, Sigma, Ruler, BarChart3,
  Star, Zap, Clock, BookOpen, AlertCircle, Globe,
} from 'lucide-react';

import { useMathStructure } from '@/hooks/Usemathstructure';
import type { ChapterStructure, TopicStructure, Lang, DifficultyKey } from '@/types/Math';

// ─── i18n (UI chrome strings only — question content is localized separately) ─
const UI_STRINGS: Record<Lang, Record<string, string>> = {
  uz: {
    title: 'Matematika', subtitle: "Barcha mavzular bo'yicha mashq qiling",
    topicsLabel: 'mavzu', questionsLabel: 'savol', sectionsLabel: "Bo'limlar", avgLabel: "O'rtacha",
    easy: 'Oson', medium: "O'rta", hard: 'Qiyin', newLabel: 'Yangi',
    tip: "Har bir mavzuni bosib, savollarni yechishni boshlang. Qiyinlik darajasi Oson, O'rta va Qiyin bo'lingan.",
    loading: 'Yuklanmoqda…', errorTitle: 'Maʼlumotlarni yuklab boʻlmadi', retry: 'Qayta urinish',
  },
  ru: {
    title: 'Математика', subtitle: 'Практикуйтесь по всем темам',
    topicsLabel: 'тем', questionsLabel: 'вопросов', sectionsLabel: 'Разделы', avgLabel: 'В среднем',
    easy: 'Легко', medium: 'Средне', hard: 'Сложно', newLabel: 'Новое',
    tip: 'Нажмите на тему, чтобы начать решать вопросы. Уровни сложности: Лёгкий, Средний и Сложный.',
    loading: 'Загрузка…', errorTitle: 'Не удалось загрузить данные', retry: 'Повторить',
  },
  en: {
    title: 'Mathematics', subtitle: 'Practice across all topics',
    topicsLabel: 'topics', questionsLabel: 'questions', sectionsLabel: 'Sections', avgLabel: 'Average',
    easy: 'Easy', medium: 'Medium', hard: 'Hard', newLabel: 'New',
    tip: 'Tap a topic to start solving questions. Difficulty is split into Easy, Medium, and Hard.',
    loading: 'Loading…', errorTitle: 'Could not load data', retry: 'Retry',
  },
};

// ─── Icon / color mapping by topic name (topic names come from Firestore) ──
const TOPIC_VISUALS: Record<string, { icon: React.ElementType; color: string; bgColor: string; borderColor: string }> = {
  Algebra: { icon: Sigma, color: 'text-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  Geometriya: { icon: Triangle, color: 'text-emerald-500', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  Trigonometriya: { icon: Pi, color: 'text-violet-500', bgColor: 'bg-violet-50', borderColor: 'border-violet-200' },
  Statistika: { icon: BarChart3, color: 'text-amber-500', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
};
const DEFAULT_VISUAL = { icon: Calculator, color: 'text-zinc-500', bgColor: 'bg-zinc-50', borderColor: 'border-zinc-200' };

function difficultyBadge(level: DifficultyKey) {
  switch (level) {
    case 'easy': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    case 'medium': return 'bg-amber-50 border-amber-200 text-amber-700';
    case 'hard': return 'bg-rose-50 border-rose-200 text-rose-700';
  }
}

// ─── Chapter row (what "topics" were in the old static data) ──────────────
function ChapterRow({
  chapter, subjectId, index, t, lang,
}: { chapter: ChapterStructure; subjectId: string; index: number; t: Record<string, string>; lang: Lang }) {
  const router = useRouter();
  const difficulties: DifficultyKey[] = ['easy', 'medium', 'hard'];

  const goPractice = (difficulty?: DifficultyKey) => {
    const params = new URLSearchParams({
      subjectId, chapterId: chapter.chapterId, lang,
      ...(difficulty ? { difficulty } : {}),
    });
    router.push(`/rushmodel/practice?${params.toString()}`);
  };

  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      onClick={() => goPractice()}
      className="w-full group/topic flex items-center gap-3 p-3.5 rounded-2xl border-2 border-zinc-100 hover:border-violet-200 hover:bg-violet-50/40 active:translate-y-[2px] active:border-b-2 transition-all text-left"
    >
      <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[12px] font-black text-zinc-400 shrink-0 group-hover/topic:bg-violet-100 group-hover/topic:text-violet-600 group-hover/topic:border-violet-200 transition-colors">
        {index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-zinc-800 truncate group-hover/topic:text-violet-800 transition-colors">
            {chapter.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {difficulties.map((d) => chapter.counts[d] > 0 && (
            <span
              key={d}
              className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-black ${difficultyBadge(d)}`}
            >
              {t[d]} · {chapter.counts[d]}
            </span>
          ))}
          <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
            <BookOpen size={10} strokeWidth={3} />
            {chapter.total} {t.questionsLabel}
          </span>
        </div>
      </div>

      <div className="w-7 h-7 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-300 shrink-0 group-hover/topic:bg-violet-500 group-hover/topic:text-white group-hover/topic:border-violet-500 transition-all">
        <ChevronRight size={14} strokeWidth={3} />
      </div>
    </motion.button>
  );
}

// ─── Section Accordion (Algebra / Geometriya / ...) ────────────────────────
function SectionAccordion({
  topic, subjectId, index, t, lang,
}: { topic: TopicStructure; subjectId: string; index: number; t: Record<string, string>; lang: Lang }) {
  const [isOpen, setIsOpen] = useState(index === 0);
  const visual = TOPIC_VISUALS[topic.name] ?? DEFAULT_VISUAL;
  const Icon = visual.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
    >
      <div className="bg-white rounded-[1.5rem] border-2 border-zinc-200 border-b-[6px] overflow-hidden hover:border-zinc-300 transition-colors">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-4 p-5 text-left group"
        >
          <div className={`w-12 h-12 rounded-[1rem] border-2 flex items-center justify-center shrink-0 ${visual.bgColor} ${visual.borderColor} ${visual.color}`}>
            <Icon size={22} strokeWidth={2.5} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-[17px] font-black text-zinc-900 tracking-tight group-hover:text-violet-700 transition-colors">
              {topic.name}
            </h3>
            <p className="text-[12px] font-bold text-zinc-400 mt-0.5">
              {topic.chapters.length} {t.topicsLabel} · {topic.total} {t.questionsLabel}
            </p>
          </div>

          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all shrink-0 ${
            isOpen
              ? 'bg-violet-500 border-violet-600 text-white'
              : 'bg-zinc-50 border-zinc-200 text-zinc-400 group-hover:bg-violet-50 group-hover:border-violet-200 group-hover:text-violet-500'
          }`}>
            <ChevronDown size={18} strokeWidth={3} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-2 border-t-2 border-zinc-100 pt-4">
                {topic.chapters.map((chapter, cIndex) => (
                  <ChapterRow
                    key={chapter.chapterId}
                    chapter={chapter}
                    subjectId={subjectId}
                    index={cIndex}
                    t={t}
                    lang={lang}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Stats Row ────────────────────────────────────────────────────────────
function StatsRow({ topics, t }: { topics: TopicStructure[]; t: Record<string, string> }) {
  const totalTopics = topics.reduce((s, sec) => s + sec.chapters.length, 0);
  const totalQuestions = topics.reduce((s, sec) => s + sec.total, 0);

  const stats = [
    { icon: BookOpen, label: t.topicsLabel, value: totalTopics, color: 'bg-blue-50 border-blue-200 text-blue-500' },
    { icon: Star, label: t.questionsLabel, value: totalQuestions, color: 'bg-amber-50 border-amber-200 text-amber-500' },
    { icon: Ruler, label: t.sectionsLabel, value: topics.length, color: 'bg-emerald-50 border-emerald-200 text-emerald-500' },
    { icon: Clock, label: t.avgLabel, value: '15 daq', color: 'bg-violet-50 border-violet-200 text-violet-500' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(({ icon: SIcon, label, value, color }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.06 }}
          className="bg-white rounded-2xl border-2 border-zinc-200 border-b-[6px] p-4 flex items-center gap-3 hover:-translate-y-0.5 transition-transform"
        >
          <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 ${color}`}>
            <SIcon size={18} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[18px] font-black text-zinc-900 leading-none">{value}</p>
            <p className="text-[11px] font-bold text-zinc-400 mt-0.5 uppercase tracking-wider">{label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Skeleton / Error states ────────────────────────────────────────────────
function LoadingState({ t }: { t: Record<string, string> }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[68px] bg-white rounded-2xl border-2 border-zinc-200 animate-pulse" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[84px] bg-white rounded-[1.5rem] border-2 border-zinc-200 animate-pulse" />
      ))}
      <p className="text-center text-[13px] font-bold text-zinc-400">{t.loading}</p>
    </div>
  );
}

function ErrorState({ message, t, onRetry }: { message: string; t: Record<string, string>; onRetry: () => void }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-rose-200 p-6 flex flex-col items-center text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-rose-50 border-2 border-rose-200 text-rose-500 flex items-center justify-center">
        <AlertCircle size={22} strokeWidth={2.5} />
      </div>
      <p className="font-black text-zinc-900">{t.errorTitle}</p>
      <p className="text-[13px] font-bold text-zinc-400">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-violet-500 text-white text-[13px] font-black rounded-xl border-b-4 border-violet-700 active:border-b-0 active:translate-y-1 transition-all"
      >
        {t.retry}
      </button>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function MathematicsCard({ lang = 'uz' }: { lang?: Lang }) {
  const { structure, loading, error, refresh } = useMathStructure();
  const t = UI_STRINGS[lang];

  const mathSubject = useMemo(() => {
    if (!structure) return null;
    // "Matematika" subject — falls back to the first subject in the doc
    return structure.subjects.find((s) => s.name === 'Matematika') ?? structure.subjects[0] ?? null;
  }, [structure]);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-4"
      >
        <div className="w-14 h-14 bg-blue-50 border-2 border-blue-200 rounded-[1.2rem] text-blue-500 flex items-center justify-center">
          <Calculator size={28} strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight">
            {t.title}
          </h2>
          <p className="text-[14px] font-bold text-zinc-500 mt-0.5">
            {t.subtitle}
          </p>
        </div>
      </motion.div>

      {loading && <LoadingState t={t} />}

      {!loading && error && <ErrorState message={error} t={t} onRetry={refresh} />}

      {!loading && !error && mathSubject && (
        <>
          <StatsRow topics={mathSubject.topics} t={t} />

          <div className="flex flex-col gap-4">
            {mathSubject.topics.map((topic, index) => (
              <SectionAccordion
                key={topic.topicId}
                topic={topic}
                subjectId={mathSubject.subjectId}
                index={index}
                t={t}
                lang={lang}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 bg-white border-2 border-zinc-200 rounded-2xl px-4 py-3.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center shrink-0 text-[14px]">
              💡
            </div>
            <p className="text-[13px] font-bold text-zinc-500 leading-snug">
              {t.tip}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
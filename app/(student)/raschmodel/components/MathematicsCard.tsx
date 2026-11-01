// app/(student)/raschmodel/components/MathematicsCard.tsx
'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, ChevronDown, ChevronRight,
  Pi, Triangle, Sigma, BarChart3, Dumbbell, SearchX,
} from 'lucide-react';

import { getMathTopics } from '@/lib/Mathstructure';
import {
  Button, EmptyState, SearchBar, Tile, cn, MOTION_ON, springTransition,
  type TileProps,
} from '@/components/student-ui';
import type { ChapterStructure, Lang, TopicStructure } from '@/types/Math';

// ─── i18n (UI chrome strings only — question content is localized separately) ─
// Edify style (2026-10-31): no subtitle, stats row or usage tip — the
// accordion explains itself.
const UI_STRINGS: Record<Lang, Record<string, string>> = {
  uz: {
    title: 'Matematika',
    topicsLabel: 'mavzu', lessonsLabel: 'dars',
    search: 'Mavzu yoki ichki mavzuni qidiring',
    practice: 'Mashq',
    noResults: 'Hech narsa topilmadi',
    matches: 'ta natija',
    subtopics: 'ta ichki mavzu',
  },
  ru: {
    title: 'Математика',
    topicsLabel: 'тем', lessonsLabel: 'уроков',
    search: 'Поиск темы или подтемы',
    practice: 'Тренировка',
    noResults: 'Ничего не найдено',
    matches: 'результатов',
    subtopics: 'подтем',
  },
  en: {
    title: 'Mathematics',
    topicsLabel: 'topics', lessonsLabel: 'lessons',
    search: 'Search a topic or subtopic',
    practice: 'Practice',
    noResults: 'Nothing found',
    matches: 'matches',
    subtopics: 'subtopics',
  },
};

// ─── Icon / tone mapping by topic name (topic names come from syllabus.json) ──
const TOPIC_VISUALS: Record<string, { icon: React.ElementType; tone: NonNullable<TileProps['tone']> }> = {
  Algebra: { icon: Sigma, tone: 'secondary' },
  Geometriya: { icon: Triangle, tone: 'success' },
  Trigonometriya: { icon: Pi, tone: 'primary' },
  Statistika: { icon: BarChart3, tone: 'gold' },
};
const DEFAULT_VISUAL = { icon: Calculator, tone: 'neutral' } as const;

// ─── Search ───────────────────────────────────────────────────────────────
/**
 * Uzbek chapter names are written with apostrophes that arrive in at least four
 * shapes across the syllabus (`o'`, `o’`, `oʻ`, `oʼ`), and nobody types the same
 * one the data happens to use. Stripping them — plus punctuation and doubled
 * spaces — makes "korsatkichli", "ko'rsatkichli" and "koʻrsatkichli" one query.
 */
function norm(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’ʻʼ`´]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** A chapter reduced to what survives the current query. */
interface FilteredChapter {
  chapter: ChapterStructure;
  /** The subtopics to show — all of them when the chapter name itself matched. */
  subtopics: ChapterStructure['subtopics'];
  /** True when the query hit the chapter name rather than only its subtopics. */
  self: boolean;
}

function filterTopic(topic: TopicStructure, query: string): FilteredChapter[] {
  if (!query) {
    return topic.chapters.map((chapter) => ({ chapter, subtopics: chapter.subtopics, self: false }));
  }
  const out: FilteredChapter[] = [];
  for (const chapter of topic.chapters) {
    const self = norm(chapter.name).includes(query);
    // A chapter whose own name matched keeps its full lesson list: the student
    // searched for the chapter, so hiding its contents would answer a question
    // they did not ask.
    const subtopics = self
      ? chapter.subtopics
      : chapter.subtopics.filter((s) => norm(s.name).includes(query));
    if (self || subtopics.length > 0) out.push({ chapter, subtopics, self });
  }
  return out;
}

/**
 * Highlights the raw query inside a name. Deliberately falls back to plain text
 * when the hit only exists in normalized form (`korsatkichli` → `ko'rsatkichli`):
 * mapping normalized offsets back onto the original string is not worth the
 * bug surface for a visual nicety.
 */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const at = text.toLowerCase().indexOf(query);
  if (at === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-[3px] bg-primary-container px-0.5 text-on-primary-container">
        {text.slice(at, at + query.length)}
      </mark>
      {text.slice(at + query.length)}
    </>
  );
}

// ─── Chapter row — expands to its subtopics ───────────────────────────────
// The row used to navigate straight to /raschmodel/practice. It now opens the
// third level of the syllabus (the lessons the chapter is actually made of) and
// keeps the practice link as an explicit button, so browsing and drilling are
// two separate gestures instead of one overloaded tap.
function ChapterRow({
  entry, topicId, index, lang, t, query, forceOpen,
}: {
  entry: FilteredChapter;
  topicId: string;
  index: number;
  lang: Lang;
  t: Record<string, string>;
  query: string;
  /** A search auto-opens every surviving chapter — the matches are the point. */
  forceOpen: boolean;
}) {
  const [manualOpen, setManualOpen] = useState(false);
  const isOpen = forceOpen || manualOpen;
  const { chapter, subtopics } = entry;

  const practiceHref = `/raschmodel/practice?${new URLSearchParams({
    topicId,
    chapterId: chapter.chapterId,
    lang,
  }).toString()}`;

  return (
    <div className="overflow-hidden rounded-m3-md bg-state-hover">
      <div className="flex items-center gap-3 px-s-row-x py-2.5">
        <button
          type="button"
          onClick={() => setManualOpen((v) => !v)}
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="s-num grid h-8 w-8 shrink-0 place-items-center rounded-full s-panel text-[12px] font-black text-on-surface-variant">
            {index + 1}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold leading-snug text-on-surface">
              <Highlight text={chapter.name} query={query} />
            </span>
            <span className="s-num mt-0.5 block text-[11px] font-bold text-on-surface-variant">
              {subtopics.length} {t.subtopics}
            </span>
          </span>

          <ChevronRight
            size={16}
            strokeWidth={3}
            className={cn(
              'shrink-0 text-outline transition-transform duration-m3-fast',
              isOpen && 'rotate-90',
            )}
          />
        </button>

        <Link href={practiceHref} className="shrink-0" aria-label={`${t.practice}: ${chapter.name}`}>
          <Button variant="text" size="sm" icon={<Dumbbell size={14} strokeWidth={3} />}>
            <span className="hidden sm:inline">{t.practice}</span>
          </Button>
        </Link>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && subtopics.length > 0 && (
          <motion.div
            initial={MOTION_ON ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            {/* The rail makes the nesting readable at a glance on a phone, where
                the indent alone is too subtle to carry three levels. `ml-11`
                lines it up under the chapter number (2rem badge + 0.75rem gap). */}
            <ul className="ml-11 mr-s-row-x border-l-2 border-outline-variant pb-2 pl-3 pt-1">
              {subtopics.map((sub) => (
                <li
                  key={sub.subtopicId}
                  className="flex items-start gap-2.5 py-1.5 text-[13px] font-semibold leading-snug text-on-surface-variant"
                >
                  <span className="s-num mt-px shrink-0 text-[11px] font-black text-outline">
                    {sub.subtopicId}
                  </span>
                  <span className="min-w-0">
                    <Highlight text={sub.name} query={query} />
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Section Accordion (Algebra / Geometriya) ─────────────────────────────
function SectionAccordion({
  topic, chapters, index, t, lang, query, searching,
}: {
  topic: TopicStructure;
  chapters: FilteredChapter[];
  index: number;
  t: Record<string, string>;
  lang: Lang;
  query: string;
  searching: boolean;
}) {
  const [manualOpen, setManualOpen] = useState(false);
  // A search opens whatever survived it; closing a section mid-search would
  // hide the very rows the query produced.
  const isOpen = searching || manualOpen;
  const visual = TOPIC_VISUALS[topic.name] ?? DEFAULT_VISUAL;
  const Icon = visual.icon;

  const lessonCount = useMemo(
    () => chapters.reduce((sum, c) => sum + c.subtopics.length, 0),
    [chapters],
  );

  if (chapters.length === 0) return null;

  return (
    <motion.div
      initial={MOTION_ON ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springTransition, delay: MOTION_ON ? index * 0.08 : 0 }}
    >
      {/* Edify style: a frosted glass panel on the mesh. */}
      <div className="s-panel overflow-hidden rounded-m3-lg">
        <button
          onClick={() => setManualOpen((v) => !v)}
          aria-expanded={isOpen}
          className="flex w-full items-center gap-4 p-s-card text-left"
        >
          <Tile tone={visual.tone}>
            <Icon size={22} strokeWidth={2.5} />
          </Tile>

          <div className="min-w-0 flex-1">
            <h3 className="s-display text-[17px] font-bold tracking-tight">{topic.name}</h3>
            <p className="s-num mt-0.5 text-[12px] font-bold text-on-surface-variant">
              {chapters.length} {t.topicsLabel} · {lessonCount} {t.lessonsLabel}
            </p>
          </div>

          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors duration-m3-fast',
              isOpen ? 's-chip' : 'bg-state-hover text-on-surface-variant',
            )}
          >
            <ChevronDown
              size={18}
              strokeWidth={3}
              className={cn('transition-transform duration-300', isOpen && 'rotate-180')}
            />
          </span>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={MOTION_ON ? { height: 0, opacity: 0 } : false}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2 px-s-card pb-s-card">
                {chapters.map((entry, cIndex) => (
                  <ChapterRow
                    key={entry.chapter.chapterId}
                    entry={entry}
                    topicId={topic.topicId}
                    index={cIndex}
                    lang={lang}
                    t={t}
                    query={query}
                    forceOpen={searching}
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

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function MathematicsCard({ lang = 'uz' }: { lang?: Lang }) {
  // The syllabus is bundled at build time (data/syllabus.json) — rendering this
  // whole card, all three levels of it, touches Firestore zero times.
  const topics = useMemo(() => getMathTopics(), []);
  const t = UI_STRINGS[lang];

  const [rawQuery, setRawQuery] = useState('');
  // ~29 chapters and ~200 subtopics are re-filtered on every keystroke; deferring
  // keeps the input itself responsive while the tree catches up.
  const deferred = useDeferredValue(rawQuery);
  const query = norm(deferred);
  const searching = query.length > 0;

  const filtered = useMemo(
    () => topics.map((topic) => ({ topic, chapters: filterTopic(topic, query) })),
    [topics, query],
  );
  const matchCount = useMemo(
    () => filtered.reduce((sum, f) => sum + f.chapters.length, 0),
    [filtered],
  );

  return (
    <div className="flex flex-col gap-s-section">
      <h2 className="s-display px-1 text-2xl font-bold tracking-tight text-on-surface md:text-[26px]">{t.title}</h2>

      <div className="flex flex-col gap-s-gap">
        <SearchBar
          label={t.search}
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
          onClear={() => setRawQuery('')}
        />
        {searching && matchCount > 0 && (
          <p className="s-num px-1 text-[12px] font-bold text-on-surface-variant">
            {matchCount} {t.matches}
          </p>
        )}
      </div>

      {searching && matchCount === 0 ? (
        <div className="s-panel rounded-m3-lg">
          <EmptyState icon={<SearchX size={28} strokeWidth={2.5} />} title={t.noResults} />
        </div>
      ) : (
        <div className="flex flex-col gap-s-gap">
          {filtered.map(({ topic, chapters }, index) => (
            <SectionAccordion
              key={topic.topicId}
              topic={topic}
              chapters={chapters}
              index={index}
              t={t}
              lang={lang}
              query={deferred.toLowerCase()}
              searching={searching}
            />
          ))}
        </div>
      )}
    </div>
  );
}

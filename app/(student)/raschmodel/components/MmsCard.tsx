// app/(student)/raschmodel/components/MmsCard.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, KeyRound, Play, ShieldCheck, Timer } from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';
import { dimensions, getRASCHLevels, mathLevel } from '@/services/RASCHProgressService';
import { EXAM_DURATION_MINUTES, EXAM_TOTAL_QUESTIONS } from '@/lib/Examblueprint';
import { PAPER_TOTAL } from '@/lib/RASCHmarks';
import { examQuota, formatCooldown, formatUnlockTime, lastExamAt } from '@/lib/RASCHquota';
import { expectedScore } from '@/lib/RASCHtheta';
import { MASTER_LEVEL, formatLevel } from '@/lib/RASCHscale';
import { RASCH_TOPICS } from '@/lib/RASCHtopics';
import { MOTION_ON, springTransition } from '@/components/student-ui';
import type { RASCHLevels } from '@/types/RASCH';
import type { Lang } from '@/types/Math';

/**
 * **MMS — Matematika Milliy Sertifikat.** The dashboard's route into the real
 * thing: a full 45-question, 150-minute paper on the national spec.
 *
 * Nothing named the exam the way a student knows it, so the feature the whole
 * RASCH subsystem exists for sat behind a four-letter word ("RASCH") that means
 * nothing to them. This card names it.
 *
 * ⚠️ **It lives on the Rasch hub (`/raschmodel`), not the dashboard.** It was
 * built for the dashboard on 2026-07-29 and moved here on 2026-07-30, when the
 * dashboard's hero slot went to the generic announcement carousel
 * (`lib/announcements.ts`) — a card welded to one feature had to be rewritten
 * every time the platform shipped another. Here it replaces a purely decorative
 * gradient banner and pairs with `MathLevelSummary` exactly as designed. The
 * maths *announcement* now carries the "start a paper" invitation on the
 * dashboard; this card carries the numbers.
 *
 * ⚠️ **It costs ZERO extra reads.** `getRASCHLevels` is the same 12h
 * localStorage-cached single document `MathLevelSummary` and `/progress` read,
 * so a second consumer on the same screen is free — which is the only reason
 * this is allowed to be data-driven rather than a static banner.
 *
 * What makes it *useful* rather than decorative: it shows the score this student
 * would be expected to get on the standard paper at their measured ability, and
 * names their weakest dimension with a one-tap route into practising it.
 */

// Edify style (2026-10-31): name + two facts, no lead sentence.
const UI: Record<Lang, Record<string, string>> = {
  uz: {
    title: 'Matematika Milliy Sertifikat',
    facts: `${EXAM_TOTAL_QUESTIONS} savol · ${EXAM_DURATION_MINUTES} daqiqa`,
    expected: 'Kutilayotgan natija',
    firstTime: 'Birinchi variant darajangizni aniqlaydi.',
    weakest: 'Eng zaif',
    start: 'Variantni boshlash',
    byCode: "O'qituvchi kodi",
    // The 2-a-day cap — lib/RASCHquota.ts owns the rule, this only reports it.
    locked: '{time} da ochiladi',
  },
  ru: {
    title: 'Национальный сертификат по математике',
    facts: `${EXAM_TOTAL_QUESTIONS} вопросов · ${EXAM_DURATION_MINUTES} минут`,
    expected: 'Ожидаемый результат',
    firstTime: 'Первый вариант определит ваш уровень.',
    weakest: 'Слабее всего',
    start: 'Начать вариант',
    byCode: 'Код учителя',
    locked: 'Откроется в {time}',
  },
  en: {
    title: 'Mathematics National Certificate',
    facts: `${EXAM_TOTAL_QUESTIONS} questions · ${EXAM_DURATION_MINUTES} min`,
    expected: 'Expected result',
    firstTime: 'Your first paper sets your level.',
    weakest: 'Weakest',
    start: 'Start a paper',
    byCode: "Teacher's code",
    locked: 'Unlocks at {time}',
  },
};

export default function MmsCard({ lang, className = '' }: { lang: Lang; className?: string }) {
  const { user, loading } = useAuth();
  const t = UI[lang];

  const [levels, setLevels] = useState<RASCHLevels | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;

    getRASCHLevels(user.uid)
      .then((next) => {
        if (cancelled) return;
        setLevels(next);
        setReady(true);
      })
      .catch((err: unknown) => {
        // The card's VALUE is the invitation, not the statistic — a failed level
        // read must degrade it to the plain "start a paper" state, never hide it.
        console.error('[RASCH] MMS card level read failed', err);
        if (!cancelled) setReady(true);
      });

    return () => { cancelled = true; };
  }, [user, loading]);

  const math = useMemo(() => mathLevel(levels), [levels]);
  const measured = math.measuredDimensions > 0;

  // ⚠️ The 2-a-day cap, so this card's primary CTA is never a dead end — it used
  // to send the student to a Start button the exam page then refused. 30s is
  // deliberate: a summary card does not need a per-second countdown (the exam
  // page has that one), and the paper's own clock is the only second-accurate
  // timer on the account. `lastExamAt` reads the levels doc already in hand, so
  // this costs nothing. See lib/RASCHquota.ts.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const quota = useMemo(() => examQuota(lastExamAt(levels?.exams), now), [levels, now]);

  /** The dimension to send them at — lowest measured level, never an unmeasured
   *  one (a dimension the paper never asked about is not a weakness). */
  const weakest = useMemo(() => {
    const rated = dimensions(levels).filter((d) => d.measured > 0);
    if (rated.length === 0) return null;
    const low = rated.reduce((a, b) => (b.level < a.level ? b : a));
    return { ...low, topic: RASCH_TOPICS.find((tp) => tp.key === low.key)! };
  }, [levels]);

  if (!user || !ready) return null;

  return (
    <motion.div
      initial={MOTION_ON ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={springTransition}
      className={className}
    >
      {/* Edify style: a glass panel with the accent chip as its only colour. */}
      <div className="s-panel rounded-m3-lg p-s-card">
        <div className="flex items-center gap-3">
          <span className="s-chip grid h-10 w-10 shrink-0 place-items-center rounded-full">
            <ShieldCheck size={19} strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <h3 className="s-display text-[17px] font-bold leading-tight tracking-tight text-on-surface">{t.title}</h3>
            <p className="s-num mt-0.5 text-[12.5px] font-bold text-on-surface-variant">{t.facts}</p>
          </div>
        </div>

        {/* ── the useful half ─────────────────────────────────────────── */}
        <div className="mt-4 rounded-m3-md bg-state-hover px-3.5 py-3">
          {measured ? (
            <>
              <p className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">{t.expected}</p>
              <p className="s-num mt-1 flex items-baseline gap-1.5 text-[28px] font-black leading-none text-on-surface">
                {expectedScore(math.theta)}
                <span className="text-[13px] font-black text-on-surface-variant">/ {PAPER_TOTAL}</span>
              </p>

              {weakest && (
                <Link
                  href={`/raschmodel/topic/${weakest.key}`}
                  className="mt-2.5 flex items-center gap-1.5 text-[12px] font-bold text-on-surface-variant hover:text-primary"
                >
                  <span
                    className="h-2.5 w-2.5 flex-none rounded-full"
                    style={{ backgroundColor: weakest.topic.hex }}
                  />
                  <span className="min-w-0 truncate">
                    {t.weakest}: {weakest.topic.label[lang]}
                  </span>
                  <span className="s-num flex-none font-black">{formatLevel(weakest.level)}/{MASTER_LEVEL}</span>
                  <ArrowRight size={13} strokeWidth={3} className="flex-none" />
                </Link>
              )}
            </>
          ) : (
            <p className="text-[13px] font-bold leading-snug text-on-surface-variant">{t.firstTime}</p>
          )}
        </div>

        {/* ⚠️ Two routes, and both are needed: a student sits the SAMPLED paper
            from here, or opens the one their teacher built by code. */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {/* ⚠️ Locked ⇒ NO <Link> at all, so a "disabled" CTA can never land the
              student on a screen that refuses them. */}
          {quota.allowed || quota.nextAt === null ? (
            <Link
              href="/raschmodel/exam"
              className="s-chip s-press inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[14.5px] font-extrabold sm:flex-1"
            >
              <Play size={16} strokeWidth={3} />
              {t.start}
              <ArrowRight size={16} strokeWidth={3} />
            </Link>
          ) : (
            <span
              aria-disabled
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-disabled-bg px-5 text-[14px] font-extrabold text-disabled-fg sm:flex-1"
            >
              <Timer size={16} strokeWidth={3} />
              <span className="s-num">
                {t.locked.replace('{time}', formatUnlockTime(quota.nextAt, lang))}
                {' · '}
                {formatCooldown(quota.msLeft, lang)}
              </span>
            </span>
          )}
          <Link
            href="/raschmodel/quiz"
            className="s-panel s-press inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[14.5px] font-extrabold text-on-surface"
          >
            <KeyRound size={16} strokeWidth={3} />
            {t.byCode}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

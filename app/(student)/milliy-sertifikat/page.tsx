'use client';

import Link from 'next/link';
import { Atom, BadgeCheck, BookText, ChevronRight, FlaskConical, Languages, Sigma } from 'lucide-react';

import { useStudentLanguage } from '../layout';
import { MILLIY_SUBJECTS, studentSubjectHref, subjectName } from '@/lib/MilliyQuiz';
import { Page, cn } from '@/components/student-ui';
import type { Lang } from '@/types/Math';

/**
 * **Milliy sertifikat — the student's subject hub, and their only nav entry to it.**
 *
 * ⚠️ The Rasch suite is no longer a nav destination of its own. It IS the Milliy
 * sertifikat **maths** section — its level chart, practice, diagnosis and code
 * page are the maths programme — so it is reached through the Matematika card
 * here instead of sitting beside "Milliy sertifikat" as if it were a separate
 * product. `studentSubjectHref` owns that mapping, so the hub cannot disagree
 * with the nav or with the teacher side about where a subject lives.
 *
 * Every other built subject opens `/milliy-sertifikat/[subject]` — code box,
 * sitting, result, sat papers. Contract: docs/MILLIY_QUIZ.md.
 *
 * Zero Firestore reads: the subject list is `MILLIY_SUBJECTS`, a bundled constant.
 */

// Edify style (2026-11-01): title + one tile per subject (name only). The
// lead sentence, per-card hints, "Ready" badges (every live subject is) and
// the marking footnote were removed — the subject page explains its own flow.
const UI: Record<Lang, Record<string, string>> = {
  uz: { title: 'Milliy sertifikat', soon: 'Tez kunda' },
  ru: { title: 'Milliy sertifikat', soon: 'Скоро' },
  en: { title: 'Milliy sertifikat', soon: 'Soon' },
};

/** Presentation only — `MILLIY_SUBJECTS` owns everything else. */
const ICON: Record<string, typeof Sigma> = {
  math: Sigma,
  biologiya: FlaskConical,
  kimyo: FlaskConical,
  fizika: Atom,
  'ona-tili': BookText,
  ingliz: Languages,
};

export default function MilliySertifikatHubPage() {
  const { lang } = useStudentLanguage();
  const t = UI[lang];

  return (
    <Page>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <h1 className="s-display px-1 text-[clamp(22px,3.4vw,30px)] font-bold text-on-surface">{t.title}</h1>

        <div className="grid gap-3 sm:grid-cols-2">
          {MILLIY_SUBJECTS.map((subject) => {
            const href = studentSubjectHref(subject);
            const Icon = ICON[subject.id] ?? BadgeCheck;
            const body = (
              <>
                <span className={cn(
                  'grid h-11 w-11 flex-none place-items-center rounded-full',
                  href ? 's-chip' : 'bg-state-hover text-on-surface-variant',
                )}>
                  <Icon size={20} strokeWidth={2.5} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-on-surface">
                  {subjectName(subject, lang)}
                </span>
                {href
                  ? <ChevronRight size={18} strokeWidth={2.6} className="flex-none text-on-surface-variant transition-transform group-hover:translate-x-0.5" />
                  : <span className="flex-none rounded-full bg-state-hover px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wider text-on-surface-variant">{t.soon}</span>}
              </>
            );
            // A tile that goes nowhere must not look or feel like one that
            // does — no link, no pointer, muted.
            return href ? (
              <Link key={subject.id} href={href} className="s-panel s-press group flex items-center gap-3.5 rounded-m3-lg p-3.5">
                {body}
              </Link>
            ) : (
              <div key={subject.id} className="s-panel flex items-center gap-3.5 rounded-m3-lg p-3.5 opacity-60">
                {body}
              </div>
            );
          })}
        </div>
      </div>
    </Page>
  );
}

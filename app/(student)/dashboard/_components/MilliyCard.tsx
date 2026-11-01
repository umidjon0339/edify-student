// app/(student)/dashboard/_components/MilliyCard.tsx
'use client';

import Link from 'next/link';
import { ArrowRight, BadgeCheck } from 'lucide-react';

import { MILLIY_SUBJECTS, studentSubjectHref, subjectName } from '@/lib/MilliyQuiz';
import { Card, Chip, Tile, cn } from '@/components/student-ui';
import type { Lang } from '@/types/Math';

/**
 * **The dashboard's door to the Milliy sertifikat programme.**
 *
 * ⚠️ **Why it exists: the mobile dock cannot hold the nav entry.** M3 caps a
 * bottom bar at 5 destinations, so `/milliy-sertifikat` is `hideOnMobile` in the
 * student layout — on a phone the programme is reachable only through the ☰
 * drawer. This card is the phone's first-class route to it, which is why it sits
 * on the dashboard rather than being "one more banner".
 *
 * It replaced `MathLevelSummary` in that slot (2026-07-30). That card measured
 * *maths ability* and linked to a report; the programme is bigger than maths now
 * (biology, chemistry), so the dashboard points at the hub instead of at one
 * subject's report. ⚠️ **The measured 0–5 level is therefore no longer on the
 * dashboard at all** — it lives on `/raschmodel` (`MathLevelSummary`, the nav's
 * level chip and `MmsCard`, which all share one cached read). Don't "restore" it
 * here without checking that read is still warm.
 *
 * **Zero Firestore reads**, exactly like the hub itself: the subject list is
 * `MILLIY_SUBJECTS`, a bundled constant. ⚠️ Subject destinations come from
 * `studentSubjectHref` — never `MilliySubject.href`, which is the TEACHER's
 * route. See docs/MILLIY_QUIZ.md.
 */

const UI: Record<Lang, Record<string, string>> = {
  uz: {
    label: 'Milliy sertifikat',
    title: 'Milliy sertifikat, o\'zingizni sinab ko\'ring.',
    lead: "O‘qituvchi bergan 6 xonali kod bilan variant ochiladi.",
    open: 'Ochish',
    soon: 'tez kunda',
  },
  ru: {
    label: 'Milliy sertifikat',
    title: 'Выберите предмет и пройдите вариант',
    lead: 'Вариант открывается 6-значным кодом от учителя.',
    open: 'Открыть',
    soon: 'скоро',
  },
  en: {
    label: 'Milliy sertifikat',
    title: 'Pick a subject and sit a paper',
    lead: 'A paper opens with the 6-digit code your teacher gives you.',
    open: 'Open',
    soon: 'soon',
  },
};

export default function MilliyCard({ lang, className = '' }: { lang: Lang; className?: string }) {
  const t = UI[lang];

  return (
    <Card className={cn('flex flex-col gap-3', className)}>
      {/* The hub, for anyone who wants the whole programme. */}
      <Link href="/milliy-sertifikat" className="group flex items-center gap-3">
        <Tile tone="primary" size="sm">
          <BadgeCheck size={17} strokeWidth={2.5} />
        </Tile>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">
            {t.label}
          </p>
          <p className="s-display truncate text-[17px] font-bold">{t.title}</p>
        </div>

        <Chip status="primary" className="hidden sm:inline-flex">
          {t.open} <ArrowRight size={13} strokeWidth={3} />
        </Chip>
        <ArrowRight
          size={18}
          strokeWidth={3}
          className="shrink-0 text-on-surface-variant transition-colors group-hover:text-primary sm:hidden"
        />
      </Link>


      {/* Every subject, one tap each — a phone user should not have to open the
          hub to reach the subject they actually sit. An unbuilt subject is shown
          (it is an announcement) but is not a link and is out of the tab order. */}
      <div className="flex flex-wrap gap-2">
        {MILLIY_SUBJECTS.map((subject) => {
          const href = studentSubjectHref(subject);
          const name = subjectName(subject, lang);

          if (!href) {
            return (
              <Chip key={subject.id} status="neutral" className="opacity-60">
                {name} · {t.soon}
              </Chip>
            );
          }

          return (
            <Link key={subject.id} href={href} className="s-press rounded-full">
              <Chip status="info">{name}</Chip>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

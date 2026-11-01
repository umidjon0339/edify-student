"use client";

import { useRouter } from "next/navigation";
import { Atom, BadgeCheck, BookText, FlaskConical, Languages, Sigma } from "lucide-react";

import { useTeacherLanguage } from "@/app/teacher/layout";
import { MILLIY_SUBJECTS, subjectName } from "@/lib/MilliyQuiz";
import { PageHeader, StatusChip, cn } from "@/components/ui";
import type { Lang } from "@/types/Math";

/**
 * Milliy sertifikat — the subject hub.
 *
 * ⚠️ **Maths is NOT a new subsystem.** The Milliy sertifikat maths paper is
 * exactly the paper `app/teacher/milliy-sertifikat/math` already builds: the 45-question
 * DTM protocol (Y-1 #1–32, Y-2 #33–40, O #41–45) is what `EXAM_BLUEPRINT`
 * encodes — see the header of [lib/Examblueprint.ts](../../../lib/Examblueprint.ts).
 * So the Matematika card ROUTES there rather than duplicating it; the 6-digit
 * code, the student runner and the results page all come along for free.
 * Contract: docs/RASCH_QUIZ.md.
 *
 * Every other subject is served by the generic subject-paper subsystem
 * (docs/MILLIY_QUIZ.md). ⚠️ **This page invents nothing** — which subjects exist,
 * what they are called and where they lead all come from `MILLIY_SUBJECTS`, so a
 * subject can never be live here and missing from the student hub.
 *
 * Cards are deliberately minimal — icon · name · Ready/Soon. The per-subject
 * details (DTM protocol / own bank, length, the 6-digit code) live on each
 * subject's own page as info pills, not here.
 */

const TR: Record<string, Record<string, string>> = {
  uz: {
    title: "Milliy sertifikat",
    subtitle: "Fan tanlang va shu fandan variant tuzing.",
    ready: "Tayyor",
    soon: "Tez kunda",
  },
  ru: {
    title: "Milliy sertifikat",
    subtitle: "Выберите предмет и составьте вариант по нему.",
    ready: "Готово",
    soon: "Скоро",
  },
  en: {
    title: "Milliy sertifikat",
    subtitle: "Pick a subject and build a paper for it.",
    ready: "Ready",
    soon: "Soon",
  },
};

/** Presentation only — the registry owns everything else. */
const LOOK: Record<string, typeof Sigma> = {
  math: Sigma,
  biologiya: FlaskConical,
  kimyo: FlaskConical,
  fizika: Atom,
  "ona-tili": BookText,
  ingliz: Languages,
};

export default function MilliySertifikatHubPage() {
  const router = useRouter();
  const { lang } = useTeacherLanguage();
  const t = TR[lang] || TR.uz;
  const L = (lang === "ru" || lang === "en" ? lang : "uz") as Lang;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 md:px-6">
      <PageHeader title={t.title} subtitle={t.subtitle} />

      <div className="grid gap-4 sm:grid-cols-2">
        {MILLIY_SUBJECTS.map((subject) => {
          const ready = subject.href !== null;
          const Icon = LOOK[subject.id] ?? BadgeCheck;
          const open = () => router.push(subject.href!);

          return (
            <div
              key={subject.id}
              onClick={ready ? open : undefined}
              // A card that goes nowhere must not look or feel like one that
              // does — no pointer, no ring, muted, out of the tab order.
              className={cn(
                "t-panel group flex items-center gap-4 rounded-m3-xl p-4 md:p-5",
                ready ? "t-ring-hover cursor-pointer" : "opacity-60",
              )}
              role={ready ? "link" : undefined}
              tabIndex={ready ? 0 : undefined}
              onKeyDown={ready ? (e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
              } : undefined}
            >
              <span className={cn(
                "grid h-12 w-12 flex-none place-items-center rounded-m3-lg transition-transform duration-t-med",
                ready ? "t-icon-chip group-hover:scale-105" : "t-icon-chip-soft",
              )}>
                <Icon size={22} strokeWidth={2.3} />
              </span>
              <h2 className="min-w-0 flex-1 truncate font-t-display text-[16px] md:text-[17px] font-bold tracking-tight text-on-surface transition-colors group-hover:text-primary">
                {subjectName(subject, L)}
              </h2>
              <StatusChip tone={ready ? "success" : "muted"}>
                {ready ? t.ready : t.soon}
              </StatusChip>
            </div>
          );
        })}
      </div>
    </div>
  );
}

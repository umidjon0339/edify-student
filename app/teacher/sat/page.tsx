"use client";

import { useRouter } from "next/navigation";
import { BadgeCheck, BookOpenText, Sigma } from "lucide-react";

import { useTeacherLanguage } from "@/app/teacher/layout";
import { SAT_SECTIONS, type SatSection } from "@/lib/SatMathQuiz";
import { PageHeader, StatusChip, cn } from "@/components/ui";
import type { Lang } from "@/types/Math";

/**
 * SAT — the section hub (docs/SAT_QUIZ.md).
 *
 * ⚠️ **This page invents nothing** — which sections exist, what they are
 * called and where they lead all come from `SAT_SECTIONS`, so a section can
 * never be live here and missing from the student hub. Mirrors the Milliy
 * sertifikat hub's own contract.
 *
 * Cards are minimal — icon · name · Ready/Soon. The test facts (2 modules,
 * adaptive Module 2, own bank, 6-digit code) and the JSON import button live
 * on each section's own page (sat/math, sat/english), like Milliy subjects.
 */

const TR: Record<string, Record<string, string>> = {
  uz: {
    title: "SAT",
    subtitle: "Bo'lim tanlang va shu bo'limdan adaptiv test tuzing.",
    ready: "Tayyor", soon: "Tez kunda",
  },
  ru: {
    title: "SAT",
    subtitle: "Выберите раздел и составьте адаптивный тест.",
    ready: "Готово", soon: "Скоро",
  },
  en: {
    title: "SAT",
    subtitle: "Pick a section and build an adaptive test for it.",
    ready: "Ready", soon: "Soon",
  },
};

const LOOK: Record<string, typeof Sigma> = {
  math: Sigma,
  "reading-writing": BookOpenText,
};

export default function SatHubPage() {
  const router = useRouter();
  const { lang } = useTeacherLanguage();
  const t = TR[lang] || TR.uz;
  const L = (lang === "ru" || lang === "en" ? lang : "uz") as Lang;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 md:px-6">
      <PageHeader title={t.title} subtitle={t.subtitle} />

      <div className="grid gap-4 sm:grid-cols-2">
        {SAT_SECTIONS.map((section: SatSection) => {
          const ready = section.teacherHref !== null;
          const Icon = LOOK[section.id] ?? BadgeCheck;
          const open = () => router.push(section.teacherHref!);

          return (
            <div
              key={section.id}
              onClick={ready ? open : undefined}
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
                {section.name[L] || section.name.uz}
              </h2>
              <StatusChip tone={ready ? "success" : "muted"}>{ready ? t.ready : t.soon}</StatusChip>
            </div>
          );
        })}
      </div>
    </div>
  );
}

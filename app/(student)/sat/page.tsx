"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, BarChart3, BookOpenText, ChevronRight, Sigma } from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { SAT_SECTIONS, type SatSection } from "@/lib/SatMathQuiz";
import { formatScoreBand } from "@/lib/SATscore";
import { Page } from "@/components/student-ui";
import type { SatMathResult } from "@/types/SatQuiz";
import { loadMySatResults, summarise, type SatSubjectKey } from "./_components/satAnalysis";

/**
 * SAT — the student's section hub (docs/SAT_QUIZ.md). The section list is
 * `SAT_SECTIONS`, mirroring how the Milliy sertifikat student hub reads
 * `MILLIY_SUBJECTS`. Since 2026-10-31 each live section shows the student's
 * latest score and an Analysis card opens /sat/analysis — two `studentId ==`
 * queries, cached 60s and shared with that page (`_components/satAnalysis.ts`).
 *
 * ⚠️ English-only, unlike the rest of the student app: the real SAT is
 * administered in English, so this hub (and the code entry / runner it leads
 * to) ignores `useStudentLanguage()` and always renders English chrome +
 * English question content, regardless of the student's app-wide language.
 */

const t = {
  title: "SAT",
  soon: "Soon",
  latest: "Latest",
  notYet: "No sittings yet",
  analysis: "Analysis",
  analysisFacts: (n: number) => `${n} sitting${n === 1 ? "" : "s"} · scores, domains, pacing`,
  analysisEmpty: "Scores, domains and pacing after your first mock",
};

const LOOK: Record<string, typeof Sigma> = { math: Sigma, "reading-writing": BookOpenText };
/** Section id → the results bucket it reads. */
const KEY: Record<string, SatSubjectKey> = { math: "math", "reading-writing": "english" };

export default function SatHubPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const [data, setData] = useState<Record<SatSubjectKey, SatMathResult[]> | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    loadMySatResults(uid)
      .then((d) => { if (!cancelled) setData(d); })
      // The scores are a nice-to-have — the section cards work without them.
      .catch((err) => console.warn(err));
    return () => { cancelled = true; };
  }, [uid]);

  const total = data ? data.math.length + data.english.length : 0;

  return (
    <Page>
      <div className="mx-auto flex max-w-lg flex-col gap-4 py-2">
        <h1 className="s-display px-1 text-[22px] font-bold text-on-surface">{t.title}</h1>

        <div className="flex flex-col gap-3">
          {SAT_SECTIONS.map((section: SatSection) => {
            const ready = section.studentHref !== null;
            const Icon = LOOK[section.id] ?? BadgeCheck;
            const key = KEY[section.id];
            const latest = data && key ? summarise(data[key], key).latest : null;
            const body = (
              <>
                <span className="s-chip grid h-11 w-11 flex-none place-items-center rounded-full">
                  <Icon size={20} strokeWidth={2.4} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-bold text-on-surface">{section.name.en}</span>
                  {ready && data && (
                    <span className="block text-[12px] font-medium text-on-surface-variant">
                      {latest ? (
                        <>
                          {t.latest}{" "}
                          <span className="s-num font-black text-primary">
                            {latest.scoreBand ? formatScoreBand(latest.scoreBand) : latest.scaledScore}
                          </span>
                        </>
                      ) : t.notYet}
                    </span>
                  )}
                </span>
                {ready ? (
                  <ChevronRight size={18} className="flex-none text-on-surface-variant" />
                ) : (
                  <span className="flex-none rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                    {t.soon}
                  </span>
                )}
              </>
            );
            return ready ? (
              <Link key={section.id} href={section.studentHref!} className="s-panel s-press flex items-center gap-4 rounded-m3-lg p-4">
                {body}
              </Link>
            ) : (
              <div key={section.id} className="s-panel flex items-center gap-4 rounded-m3-lg p-4 opacity-60">
                {body}
              </div>
            );
          })}
        </div>

        {/* ── the student's own mocks, analysed (/sat/analysis) ── */}
        <Link href="/sat/analysis" className="s-panel s-press flex items-center gap-4 rounded-m3-lg p-4">
          <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-primary-container text-on-primary-container">
            <BarChart3 size={20} strokeWidth={2.4} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-bold text-on-surface">{t.analysis}</span>
            <span className="block text-[12px] font-medium text-on-surface-variant">
              {total > 0 ? t.analysisFacts(total) : t.analysisEmpty}
            </span>
          </span>
          <ChevronRight size={18} className="flex-none text-on-surface-variant" />
        </Link>
      </div>
    </Page>
  );
}

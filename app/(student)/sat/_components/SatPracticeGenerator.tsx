"use client";

import { useEffect, useState } from "react";
import { Clock, Layers, ListChecks, Sparkles, TrendingUp } from "lucide-react";

import {
  SAT_MODULE_PLAN, generateSatPractice, satPracticeMinimum, type SatPracticeSubject,
} from "@/lib/SatPractice";
import { loadSatPool } from "@/services/satPoolService";
import { Banner, Button, Card, Chip } from "@/components/student-ui";
import type { SatMathResult, SatMathTest, SatMathTestDraft, SatQuizItem } from "@/types/SatQuiz";
import { DomainMixBar, SatArt, ScoreHistoryChart, type SatVizSubject, type ScorePoint } from "./SatViz";

/**
 * "Practice tests" — a NEW SAT-shaped test generated for this student from the
 * shared SAT practice bank (`sat_pool`, filled by teachers' imports): real
 * module length and domain mix, a difficulty mix per module, picks spread
 * across subtopics, unseen questions first (lib/SatPractice.ts). The generated
 * paper is saved as the student's own test doc (`practice: true`, id prefix
 * `satp_`/`satep_`), then goes through the same pending → Start screen a code
 * lookup does — so runner, scoring, results and review are unchanged.
 * Contract: docs/SAT_QUIZ.md §Practice bank. English-only chrome.
 */

/** Module-level cache per subject — the bank changes rarely and is a few MB. */
const poolCache = new Map<string, { at: number; items: SatQuizItem[] }>();
const POOL_TTL = 5 * 60_000;

const t = {
  title: "Practice tests",
  lead: "A new SAT-style test every time, built from the question bank.",
  bank: "questions in the bank",
  modules: "2 modules",
  questions: "questions",
  minutes: "min",
  generate: "Generate a practice test",
  generating: "Building your test…",
  failed: "Could not build the test. Check your connection and try again.",
  howTitle: "How each test is built",
  how: "Real SAT length and topic mix · Module 1 mixed difficulty, Module 2 easier or harder by your score · questions you haven't seen come first.",
  scores: "Your practice scores",
  scoresHint: "Bar = score band, dot = your score, in the order you took them.",
};

export default function SatPracticeGenerator({
  subject, slug, uid, past, newTestId, countMine, save, onReady,
}: {
  subject: SatVizSubject;
  slug: SatPracticeSubject;
  uid: string;
  past: SatMathResult[] | null;
  newTestId: () => string;
  countMine: (uid: string) => Promise<number>;
  save: (id: string, draft: SatMathTestDraft) => Promise<void>;
  onReady: (test: SatMathTest) => void;
}) {
  const [pool, setPool] = useState<SatQuizItem[] | null>(() => {
    const hit = poolCache.get(slug);
    return hit && Date.now() - hit.at < POOL_TTL ? hit.items : null;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const hit = poolCache.get(slug);
    if (hit && Date.now() - hit.at < POOL_TTL) return;
    let cancelled = false;
    loadSatPool(slug)
      .then((items) => {
        poolCache.set(slug, { at: Date.now(), items });
        if (!cancelled) setPool(items);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setPool([]);
      });
    return () => { cancelled = true; };
  }, [slug]);

  // Hidden until the bank can fill a whole test at least once.
  if (!pool || pool.length < satPracticeMinimum(slug)) return null;

  const plan = SAT_MODULE_PLAN[slug];
  const practicePrefix = slug === "sat-matematika" ? "satp_" : "satep_";
  const practicePast = (past ?? [])
    .filter((r) => r.testId.startsWith(practicePrefix))
    .sort((a, b) => a.submittedAt - b.submittedAt);
  const points: ScorePoint[] = practicePast.map((r) => ({
    key: r.testId,
    label: r.testTitle,
    lower: r.scoreBand?.lower ?? r.scaledScore,
    upper: r.scoreBand?.upper ?? r.scaledScore,
    score: r.scaledScore,
  }));

  async function generate() {
    setBusy(true);
    setError("");
    try {
      // Every question this student has already answered, from their results.
      const seen = new Set((past ?? []).flatMap((r) => Object.keys(r.items ?? {})));
      const paper = generateSatPractice(pool!, slug, { seen });
      const n = (await countMine(uid)) + 1;
      const id = newTestId();
      const draft: SatMathTestDraft = {
        title: `SAT ${subject === "math" ? "Math" : "Reading and Writing"} Practice Test ${n}`,
        description: "",
        teacherId: uid,
        teacherName: "Edify practice",
        accessCode: "",
        module1: paper.module1,
        module2Easier: paper.module2Easier,
        module2Harder: paper.module2Harder,
        module1Minutes: paper.minutes,
        module2Minutes: paper.minutes,
        routingThreshold: paper.routingThreshold,
        shuffle: false,
        showAnswers: true,
        status: "published",
        practice: true,
      };
      await save(id, draft);
      onReady({ ...draft, id, createdAt: null, updatedAt: null });
    } catch (err) {
      console.error(err);
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card flush className="overflow-hidden">
      {/* ── hero ── */}
      <div className="flex items-center gap-3 bg-primary-container px-4 py-3.5">
        <SatArt subject={subject} className="h-12 w-12 flex-none" />
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-black text-on-primary-container">{t.title}</h3>
          <p className="text-[12px] font-medium text-on-primary-container">{t.lead}</p>
        </div>
        <Chip status="primary" className="s-num">{pool.length} {t.bank}</Chip>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-medium text-on-surface-variant">
          <span className="flex items-center gap-1"><Layers size={12} />{t.modules}</span>
          <span className="flex items-center gap-1"><ListChecks size={12} /><span className="s-num">{plan.perModule * 2}</span> {t.questions}</span>
          <span className="flex items-center gap-1"><Clock size={12} /><span className="s-num">{plan.minutes * 2}</span> {t.minutes}</span>
        </div>

        {/* What the bank holds, by domain — the same colours the tests use. */}
        <DomainMixBar items={pool} subject={subject} />

        <p className="text-[11.5px] font-medium text-on-surface-variant">
          <b className="text-on-surface">{t.howTitle}:</b> {t.how}
        </p>

        {error && <Banner status="error" title={error} />}

        <Button size="lg" icon={<Sparkles />} loading={busy} onClick={generate}>
          {busy ? t.generating : t.generate}
        </Button>

        {points.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-m3-md border border-outline-variant p-3">
            <h4 className="flex items-center gap-2 text-[12.5px] font-bold text-on-surface">
              <TrendingUp size={14} /> {t.scores}
            </h4>
            <ScoreHistoryChart points={points} />
            <p className="text-[11px] font-medium text-on-surface-variant">{t.scoresHint}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

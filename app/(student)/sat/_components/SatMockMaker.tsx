"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Clock, Database, Layers, ListChecks, Play, Sparkles, TrendingUp, Upload, Users } from "lucide-react";

import {
  SAT_MODULE_PLAN, generateSatPractice, satPracticeMinimum, type SatPracticeSubject,
} from "@/lib/SatPractice";
import { formatScoreBand } from "@/lib/SATscore";
import { loadSatMockSources, type SatMockSources } from "@/services/satMockSourceService";
import { Banner, Button, Card, Chip, Skeleton } from "@/components/student-ui";
import type { SatMathResult, SatMathTest, SatMathTestDraft } from "@/types/SatQuiz";
import { DomainMixBar, SatArt, ScoreHistoryChart, type SatVizSubject, type ScorePoint } from "./SatViz";

/**
 * "Create a full SAT mock" — always on the student's SAT subject page (Math
 * page → Math-only mock, English page → R&W-only mock). The mock is built
 * (lib/SatPractice.ts: real module length + domain mix, difficulty mix per
 * module, subtopics spread, unseen questions first) from THREE sources
 * (services/satMockSourceService.ts): the practice bank (teachers' imports),
 * the shared/platform question bank, and platform full mocks.
 *
 * Every created mock is SAVED as the student's own test doc (`practice: true`,
 * id `satp_…`/`satep_…`) and stays under "My mocks" — start it now or later,
 * retake it any time. Since 2026-10-31 mocks are SHARED: "Community mocks"
 * lists every other student's mock, and anyone can sit it (the page stamps
 * the sitter's own uid as the result's `teacherId`, so the mock's creator never
 * reads other students' results). Runner, scoring, results and review are the
 * normal SAT ones. Contract: docs/SAT_QUIZ.md §Student mocks. English-only chrome.
 */

/** Module-level caches per subject (student pages use 60s+ caches; mutations patch them). */
const sourceCache = new Map<string, { at: number; data: SatMockSources }>();
const SOURCE_TTL = 5 * 60_000;
const mineCache = new Map<string, { at: number; tests: SatMathTest[] }>();
const MINE_TTL = 60_000;
const sharedCache = new Map<string, { at: number; tests: SatMathTest[] }>();

const t = {
  title: "Full SAT mock",
  lead: "Build a complete, real-SAT-shaped mock. It is saved under My mocks.",
  only: { math: "Math only", english: "Reading and Writing only" },
  create: { math: "Create a Math mock", english: "Create a Reading and Writing mock" },
  creating: "Building your mock…",
  loading: "Collecting questions…",
  modules: "2 modules",
  questions: "questions",
  minutes: "min",
  sources: "Questions from",
  bank: "Imports",
  questionBank: "Question bank",
  mocks: "Full mocks",
  notEnough: (have: number, need: number) =>
    `Not enough questions yet — ${have} of ${need}. Ask your teacher to import more SAT questions.`,
  partial: "Some question sources could not be loaded right now — the mock uses the rest.",
  failed: "Could not create the mock. Check your connection and try again.",
  how: "Real SAT length and topic mix · Module 1 mixed difficulty, Module 2 easier or harder by your score · questions you haven't seen come first.",
  mine: "My mocks",
  community: "Community mocks",
  communityHint: "Mocks other students built — same questions for everyone.",
  notTaken: "Not taken yet",
  start: "Start",
  retake: "Retake",
  scores: "Your mock scores",
  scoresHint: "Bar = score band, dot = your score, in the order you took them.",
};

const millis = (v: unknown) =>
  v && typeof (v as { toMillis?: () => number }).toMillis === "function" ? (v as { toMillis: () => number }).toMillis() : 0;

export default function SatMockMaker({
  subject, slug, uid, past, newTestId, countMine, listMine, listShared, save, onReady,
}: {
  subject: SatVizSubject;
  slug: SatPracticeSubject;
  uid: string;
  past: SatMathResult[] | null;
  newTestId: () => string;
  countMine: (uid: string) => Promise<number>;
  listMine: (uid: string, max?: number) => Promise<SatMathTest[]>;
  /** Every student's mock, newest first (services/sat*QuizService `listSharedSat*Mocks`). */
  listShared: (max?: number) => Promise<SatMathTest[]>;
  save: (id: string, draft: SatMathTestDraft) => Promise<void>;
  onReady: (test: SatMathTest) => void;
}) {
  const prefix = slug === "sat-matematika" ? "satp_" : "satep_";
  const mineKey = `${slug}:${uid}`;

  const [sources, setSources] = useState<SatMockSources | null>(() => {
    const hit = sourceCache.get(slug);
    return hit && Date.now() - hit.at < SOURCE_TTL ? hit.data : null;
  });
  const [mine, setMine] = useState<SatMathTest[] | null>(() => {
    const hit = mineCache.get(mineKey);
    return hit && Date.now() - hit.at < MINE_TTL ? hit.tests : null;
  });
  const [shared, setShared] = useState<SatMathTest[] | null>(() => {
    const hit = sharedCache.get(slug);
    return hit && Date.now() - hit.at < MINE_TTL ? hit.tests : null;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const hit = sourceCache.get(slug);
    if (hit && Date.now() - hit.at < SOURCE_TTL) return;
    let cancelled = false;
    loadSatMockSources(slug)
      .then((data) => {
        sourceCache.set(slug, { at: Date.now(), data });
        if (!cancelled) setSources(data);
      })
      .catch((err) => {
        console.warn(err);
        if (!cancelled) setSources({ items: [], counts: { bank: 0, questions: 0, mocks: 0 }, failed: ["bank", "questions", "mocks"] });
      });
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!uid) return;
    const hit = mineCache.get(mineKey);
    if (hit && Date.now() - hit.at < MINE_TTL) return;
    let cancelled = false;
    listMine(uid, 20)
      .then((tests) => {
        // Only generated mocks — never anything else a uid might own.
        const own = tests.filter((x) => x.practice || x.id.startsWith(prefix));
        mineCache.set(mineKey, { at: Date.now(), tests: own });
        if (!cancelled) setMine(own);
      })
      .catch((err) => {
        console.warn(err);
        if (!cancelled) setMine([]);
      });
    return () => { cancelled = true; };
  }, [uid, mineKey, listMine, prefix]);

  useEffect(() => {
    const hit = sharedCache.get(slug);
    if (hit && Date.now() - hit.at < MINE_TTL) return;
    let cancelled = false;
    listShared(20)
      .then((tests) => {
        sharedCache.set(slug, { at: Date.now(), tests });
        if (!cancelled) setShared(tests);
      })
      .catch((err) => {
        console.warn(err);
        if (!cancelled) setShared([]);
      });
    return () => { cancelled = true; };
  }, [slug, listShared]);

  // Other students' mocks only — the student's own are under My mocks.
  const community = (shared ?? []).filter((x) => x.teacherId !== uid);

  const plan = SAT_MODULE_PLAN[slug];
  const need = satPracticeMinimum(slug);
  const have = sources?.items.length ?? 0;
  const enough = have >= need;
  const resultOf = (id: string) => past?.find((r) => r.testId === id);

  const points: ScorePoint[] = (past ?? [])
    .filter((r) => r.testId.startsWith(prefix))
    .sort((a, b) => a.submittedAt - b.submittedAt)
    .map((r) => ({
      key: r.testId,
      label: r.testTitle,
      lower: r.scoreBand?.lower ?? r.scaledScore,
      upper: r.scoreBand?.upper ?? r.scaledScore,
      score: r.scaledScore,
    }));

  async function create() {
    if (!sources || !enough) return;
    setBusy(true);
    setError("");
    try {
      // Every question this student has already answered, from their results.
      const seen = new Set((past ?? []).flatMap((r) => Object.keys(r.items ?? {})));
      const paper = generateSatPractice(sources.items, slug, { seen });
      const n = (await countMine(uid)) + 1;
      const id = newTestId();
      const draft: SatMathTestDraft = {
        title: `SAT ${subject === "math" ? "Math" : "Reading and Writing"} Mock ${n}`,
        description: "",
        teacherId: uid,
        teacherName: "Edify mock",
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
      const test: SatMathTest = { ...draft, id, createdAt: { toMillis: () => Date.now() }, updatedAt: null };
      // Patch the module cache — it stays listed under My mocks.
      const next = [test, ...(mine ?? [])];
      mineCache.set(mineKey, { at: Date.now(), tests: next });
      setMine(next);
      // Others see it on their next load; drop the shared cache so ours is fresh too.
      sharedCache.delete(slug);
      onReady(test);
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
        <Chip status="primary">{t.only[subject]}</Chip>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-medium text-on-surface-variant">
          <span className="flex items-center gap-1"><Layers size={12} />{t.modules}</span>
          <span className="flex items-center gap-1"><ListChecks size={12} /><span className="s-num">{plan.perModule * 2}</span> {t.questions}</span>
          <span className="flex items-center gap-1"><Clock size={12} /><span className="s-num">{plan.minutes * 2}</span> {t.minutes}</span>
        </div>

        {!sources ? (
          <div className="flex flex-col gap-2">
            <p className="text-[12px] font-medium text-on-surface-variant">{t.loading}</p>
            <Skeleton height={10} className="w-full" />
          </div>
        ) : (
          <>
            {/* Where the questions come from */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{t.sources}</span>
              <Chip icon={<Upload size={12} />}><span className="s-num">{sources.counts.bank}</span>&nbsp;{t.bank}</Chip>
              <Chip icon={<Database size={12} />}><span className="s-num">{sources.counts.questions}</span>&nbsp;{t.questionBank}</Chip>
              <Chip icon={<ClipboardList size={12} />}><span className="s-num">{sources.counts.mocks}</span>&nbsp;{t.mocks}</Chip>
            </div>

            {have > 0 && <DomainMixBar items={sources.items} subject={subject} />}

            {sources.failed.length > 0 && have > 0 && <Banner status="info" title={t.partial} />}
            {!enough && <Banner status="warning" title={t.notEnough(have, need)} />}
            {enough && <p className="text-[11.5px] font-medium text-on-surface-variant">{t.how}</p>}
          </>
        )}

        {error && <Banner status="error" title={error} />}

        <Button size="lg" icon={<Sparkles />} loading={busy} disabled={!sources || !enough} onClick={create}>
          {busy ? t.creating : t.create[subject]}
        </Button>

        {/* ── My mocks: every created mock stays here ── */}
        {mine && mine.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="flex items-center gap-2 text-[12.5px] font-bold text-on-surface">
              <ClipboardList size={14} /> {t.mine}
            </h4>
            <ul className="flex flex-col gap-2">
              {[...mine].sort((a, b) => millis(b.createdAt) - millis(a.createdAt)).map((test) => (
                <MockRow key={test.id} test={test} subject={subject} result={resultOf(test.id)} onStart={onReady} />
              ))}
            </ul>
          </div>
        )}

        {/* ── Community mocks: every other student's mock, open to all ── */}
        {community.length > 0 && (
          <div className="flex flex-col gap-2">
            <div>
              <h4 className="flex items-center gap-2 text-[12.5px] font-bold text-on-surface">
                <Users size={14} /> {t.community}
                <span className="s-num font-medium text-on-surface-variant">{community.length}</span>
              </h4>
              <p className="text-[11px] font-medium text-on-surface-variant">{t.communityHint}</p>
            </div>
            <ul className="flex max-h-[360px] flex-col gap-2 overflow-y-auto">
              {community.map((test) => (
                <MockRow key={test.id} test={test} subject={subject} result={resultOf(test.id)} onStart={onReady} />
              ))}
            </ul>
          </div>
        )}

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

/** One mock in a list — title, size, date, the student's score if sat, start/retake. */
function MockRow({
  test, subject, result, onStart,
}: {
  test: SatMathTest;
  subject: SatVizSubject;
  result: SatMathResult | undefined;
  onStart: (test: SatMathTest) => void;
}) {
  const created = millis(test.createdAt);
  return (
    <li className="flex items-center gap-3 rounded-m3-md border border-outline-variant bg-surface-container-lowest p-3">
      <SatArt subject={subject} className="h-10 w-10 flex-none" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-bold text-on-surface">{test.title}</p>
        <p className="text-[11px] font-medium text-on-surface-variant">
          <span className="s-num">{test.module1.length + test.module2Easier.length}</span> {t.questions}
          {created > 0 && <> · {new Date(created).toLocaleDateString()}</>}
        </p>
      </div>
      {result ? (
        <Chip status="success" className="s-num">
          {result.scoreBand ? formatScoreBand(result.scoreBand) : result.scaledScore}
        </Chip>
      ) : (
        <Chip status="neutral">{t.notTaken}</Chip>
      )}
      <Button size="sm" icon={<Play />} onClick={() => onStart(test)}>
        {result ? t.retake : t.start}
      </Button>
    </li>
  );
}

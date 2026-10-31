"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AlertTriangle, ChevronDown, KeyRound, Play, TrendingUp } from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { requestExamFullscreen } from "@/hooks/useExamLockdown";
import { ACCESS_CODE_LENGTH, isValidAccessCode, sanitizeAccessCode } from "@/lib/RASCHquiz";
import { shuffleSatItems, SAT_RW_TAXONOMY_SLUG } from "@/lib/SatMathQuiz";
import { formatScoreBand } from "@/lib/SATscore";
import { satMistakes } from "@/lib/mistakes";
import { recordMistakes } from "@/services/mistakeService";
import {
  clearSatEnglishSnapshot, getSatEnglishSnapshot, getServerSatEnglishSnapshot,
  saveSatEnglishSnapshot, subscribeSatEnglishSnapshot,
} from "@/lib/SatEnglishSession";
import {
  findSatEnglishTestByCode, countMySatEnglishPracticeTests, newSatEnglishPracticeTestId, saveSatEnglishTest, getSatEnglishTest, listMySatEnglishResults, saveSatEnglishResult,
} from "@/services/satEnglishQuizService";
import SatRunner from "../_components/SatRunner";
import SatPracticeGenerator from "../_components/SatPracticeGenerator";
import SatReview from "../_components/SatReview";
import SatScoreSummary from "../_components/SatScoreSummary";
import { Banner, Button, Card, EmptyState, Page, cn } from "@/components/student-ui";
import type { SatExamSnapshot, SatMathResult, SatMathTest, SatQuizItem } from "@/types/SatQuiz";

/**
 * SAT English (Reading & Writing) — the student's code box, sitting and
 * results. Contract: docs/SAT_QUIZ.md.
 *
 * A SIBLING of `app/(student)/sat/math/page.tsx` — own collections
 * (`sat_english_tests`/`sat_english_results`), own localStorage session key
 * (`lib/SatEnglishSession.ts`), own code namespace — but REUSES `SatRunner`
 * as-is (it takes `subjectName`/`onSave` precisely so both subjects can share
 * it without either importing the other's Firestore write).
 *
 * ⚠️ English-only, same as Math: no question-language picker, `examLang` is
 * hard-set to `'en'`.
 */

const t = {
  title: "SAT English",
  lead: "Enter the 6-digit code your teacher gave you.",
  codeLabel: "Access code",
  open: "Open",
  notFound: "No test found with that code. Check it and try again.",
  closed: "This test is closed — ask your teacher.",
  lookupFailed: "Could not check the code. Check your connection and try again.",
  intro: "Test", teacher: "Teacher",
  module1: "Module 1", module2: "Module 2", minutes: "minutes",
  start: "Start", another: "Enter another code",
  result: "Result", scaledScore: "Approximate score (200-800)",
  scaledHint: "Not College Board's official equating — an approximate scale.",
  route: "Route", routeEasier: "Easier", routeHarder: "Harder",
  correct: "Correct", of: "of",
  review: "Review questions",
  myTests: "Tests I've taken",
  noTests: "You haven't taken a test yet.",
  openReview: "Open", closeReview: "Close",
  reviewGone: "That test was deleted — questions can't be shown.",
  reviewFailed: "Could not load the questions.",
};

/** Module-lifetime cache for a reviewed test's item content — a sat test is an
 *  immutable snapshot, so nothing can go stale. */
const reviewCache = new Map<string, SatMathTest>();
let pastCache: { uid: string; at: number; rows: SatMathResult[] } | null = null;
const PAST_TTL = 60_000;

export default function SatEnglishPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  const [code, setCode] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [pendingTest, setPendingTest] = useState<SatMathTest | null>(null);

  const stored = useSyncExternalStore(subscribeSatEnglishSnapshot, getSatEnglishSnapshot, getServerSatEnglishSnapshot);
  const restored = useMemo(() => (stored && stored.uid === uid ? stored : null), [stored, uid]);
  const [session, setSession] = useState<SatExamSnapshot | null>(null);
  const live = session ?? restored;

  const [submittedView, setSubmittedView] = useState<{
    result: SatMathResult; module1: SatQuizItem[]; module2: SatQuizItem[]; showAnswers: boolean;
  } | null>(null);

  const commit = (next: SatExamSnapshot | null) => {
    setSession(next);
    if (!next) { clearSatEnglishSnapshot(); return; }
    saveSatEnglishSnapshot(next);
  };

  // ── past sittings, loaded only on the code screen ────────────────────────
  const [past, setPast] = useState<SatMathResult[] | null>(null);
  const [openPast, setOpenPast] = useState<string | null>(null);
  const [openTest, setOpenTest] = useState<SatMathTest | null>(null);
  const [openState, setOpenState] = useState<"idle" | "loading" | "gone" | "failed">("idle");

  const showCode = !live && !pendingTest && !submittedView;

  useEffect(() => {
    if (!showCode || !uid) return;
    if (pastCache && pastCache.uid === uid && Date.now() - pastCache.at < PAST_TTL) {
      setPast(pastCache.rows);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await listMySatEnglishResults(uid);
        if (cancelled) return;
        pastCache = { uid, at: Date.now(), rows };
        setPast(rows);
      } catch (err) {
        console.error(err);
        if (!cancelled) setPast([]);
      }
    })();
    return () => { cancelled = true; };
  }, [showCode, uid]);

  const toggleReview = async (result: SatMathResult) => {
    if (openPast === result.testId) {
      setOpenPast(null); setOpenTest(null); setOpenState("idle");
      return;
    }
    setOpenPast(result.testId);
    const cached = reviewCache.get(result.testId);
    if (cached) { setOpenTest(cached); setOpenState("idle"); return; }

    setOpenState("loading");
    try {
      const testDoc = await getSatEnglishTest(result.testId);
      if (!testDoc) { setOpenTest(null); setOpenState("gone"); return; }
      reviewCache.set(result.testId, testDoc);
      setOpenTest(testDoc);
      setOpenState("idle");
    } catch (err) {
      console.error(err);
      setOpenState("failed");
    }
  };

  // ── open by code ───────────────────────────────────────────────────────
  async function openByCode() {
    if (!isValidAccessCode(code)) return;
    setLooking(true);
    setLookupError(null);
    try {
      const found = await findSatEnglishTestByCode(code);
      if ("error" in found) {
        setLookupError(found.error === "closed" ? t.closed : t.notFound);
        return;
      }
      setPendingTest(found.test);
    } catch (err) {
      console.error(err);
      setLookupError(t.lookupFailed);
    } finally {
      setLooking(false);
    }
  }

  function startTest() {
    if (!pendingTest) return;
    // ⚠️ Synchronously inside the click — see hooks/useExamLockdown.ts.
    requestExamFullscreen();
    const now = Date.now();
    const test = pendingTest;
    const snapshot: SatExamSnapshot = {
      version: 1,
      uid,
      examLang: "en",
      testId: test.id,
      testTitle: test.title,
      teacherId: test.teacherId,
      teacherName: test.teacherName,
      module1: test.shuffle ? shuffleSatItems(test.module1) : test.module1,
      module2Easier: test.shuffle ? shuffleSatItems(test.module2Easier) : test.module2Easier,
      module2Harder: test.shuffle ? shuffleSatItems(test.module2Harder) : test.module2Harder,
      module1Minutes: test.module1Minutes,
      module2Minutes: test.module2Minutes,
      routingThreshold: test.routingThreshold,
      showAnswers: test.showAnswers,
      phase: "module1",
      module1Answers: {},
      module1Flagged: [],
      crossedOut: {},
      current: 0,
      module1EndsAt: now + test.module1Minutes * 60_000,
      route: null,
      module2Answers: {},
      module2Flagged: [],
      module2EndsAt: 0,
      startedAt: now,
      savedAt: now,
    };
    commit(snapshot);
    setPendingTest(null);
  }

  function backToCode() {
    setSubmittedView(null);
    setPendingTest(null);
    setCode("");
    setLookupError(null);
  }

  // ── the runner ─────────────────────────────────────────────────────────
  if (live && live.phase !== "submitted") {
    return (
      <SatRunner
        uid={uid}
        studentName={user?.displayName || ""}
        subjectName="Reading & Writing"
        snapshot={live}
        onChange={commit}
        onSave={saveSatEnglishResult}
        onSubmit={(result, finished) => {
          // The past-sittings cache is now stale — the practice generator reads it
          // to skip questions this student has already seen.
          pastCache = null;
          const served = finished.route === "harder" ? finished.module2Harder : finished.module2Easier;
          setSubmittedView({
            result,
            module1: finished.module1,
            module2: served,
            showAnswers: finished.showAnswers,
          });
          commit(null);
          // My Mistakes (docs/MISTAKES.md) — fire-and-forget ON PURPOSE: the
          // result is already saved by this point, and a failure to bank the
          // mistakes must never cost the student their score.
          if (uid) {
            recordMistakes(
              uid,
              satMistakes({
                source: "sat-english",
                testId: result.testId,
                testTitle: result.testTitle,
                examLang: result.examLang,
                items: [...finished.module1, ...served],
                outcomes: result.items ?? {},
                omitted: result.omitted,
                subjectId: SAT_RW_TAXONOMY_SLUG,
                subjectName: "SAT Ingliz tili (Reading & Writing)",
              }),
            ).catch((e) => console.error("recordMistakes failed:", e));
          }
        }}
      />
    );
  }

  return (
    <Page>
      <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-6">
        <h1 className="text-[20px] font-black text-on-surface">{t.title}</h1>

        {/* ── just-submitted results ─────────────────────────────────────── */}
        {submittedView && (
          <Card variant="filled" className="flex flex-col gap-4 p-5 text-center">
            <h2 className="text-[16px] font-black text-on-surface">{t.result}</h2>
            <SatScoreSummary result={submittedView.result} />
            <SatReview
              module1={submittedView.module1}
              module2={submittedView.module2}
              outcomes={submittedView.result.items ?? {}}
              showAnswers={submittedView.showAnswers}
              lang={submittedView.result.examLang}
            />
            <Button onClick={backToCode}>{t.another}</Button>
          </Card>
        )}

        {/* ── pending: found by code, start ────────────────────────────── */}
        {pendingTest && (
          <Card variant="filled" className="flex flex-col gap-4 p-5">
            <h2 className="text-[16px] font-black text-on-surface">{pendingTest.title || t.intro}</h2>
            {pendingTest.teacherName && (
              <p className="text-[12.5px] font-medium text-on-surface-variant">{t.teacher}: {pendingTest.teacherName}</p>
            )}
            <div className="flex flex-wrap gap-3 text-[12.5px] font-bold text-on-surface-variant">
              <span>{t.module1}: {pendingTest.module1.length} · {pendingTest.module1Minutes} {t.minutes}</span>
              <span>{t.module2}: {pendingTest.module2Minutes} {t.minutes}</span>
            </div>

            <Button size="lg" icon={<Play />} onClick={startTest}>{t.start}</Button>
          </Card>
        )}

        {/* ── code entry ──────────────────────────────────────────────────── */}
        {showCode && (
          <>
            {/* A fresh SAT-shaped test from the shared practice bank (sat_pool). */}
            <SatPracticeGenerator
              subject="english"
              slug="sat-ingliz-tili"
              uid={uid}
              past={past}
              newTestId={newSatEnglishPracticeTestId}
              countMine={countMySatEnglishPracticeTests}
              save={saveSatEnglishTest}
              onReady={setPendingTest}
            />

            <Card className="flex flex-col gap-4 p-5">
              <p className="text-[13px] font-medium text-on-surface-variant">{t.lead}</p>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(sanitizeAccessCode(e.target.value))}
                  maxLength={ACCESS_CODE_LENGTH}
                  placeholder={t.codeLabel}
                  inputMode="numeric"
                  className="flex-1 rounded-m3-md border-2 border-outline-variant bg-surface-container-lowest px-4 py-3 text-center text-[20px] font-black tracking-[0.3em] text-on-surface outline-none focus:border-primary"
                />
                <Button icon={<KeyRound />} loading={looking} disabled={!isValidAccessCode(code)} onClick={openByCode}>
                  {t.open}
                </Button>
              </div>
              {lookupError && <Banner status="error" icon={<AlertTriangle size={14} />} title={lookupError} />}
            </Card>

            {past && past.length > 0 && (
              <Card className="flex flex-col gap-3 p-4">
                <h3 className="flex items-center gap-2 text-[13px] font-bold text-on-surface">
                  <TrendingUp size={15} /> {t.myTests}
                </h3>
                <ul className="flex flex-col gap-2">
                  {past.map((r) => {
                    const open = openPast === r.testId;
                    return (
                      <li key={r.testId} className="rounded-m3-md border border-outline-variant">
                        <button
                          onClick={() => toggleReview(r)}
                          className="flex w-full items-center gap-3 p-3 text-left"
                        >
                          <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-on-surface">{r.testTitle}</span>
                          {/* The BAND when the sitting has one, else the legacy single number. */}
                          <span className="flex-none text-[14px] font-black text-primary">
                            {r.scoreBand ? formatScoreBand(r.scoreBand) : r.scaledScore}
                          </span>
                          <ChevronDown size={14} className={cn("flex-none text-on-surface-variant transition-transform", open && "rotate-180")} />
                        </button>
                        {open && (
                          <div className="border-t border-outline-variant p-3">
                            {openState === "loading" && <p className="text-[12px] text-on-surface-variant">…</p>}
                            {openState === "gone" && <p className="text-[12px] text-on-surface-variant">{t.reviewGone}</p>}
                            {openState === "failed" && <p className="text-[12px] text-error">{t.reviewFailed}</p>}
                            {openTest && openState === "idle" && (
                              <SatReview
                                module1={openTest.module1}
                                module2={r.route === "harder" ? openTest.module2Harder : openTest.module2Easier}
                                outcomes={r.items ?? {}}
                                showAnswers={openTest.showAnswers}
                                lang={r.examLang}
                              />
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}

            {past && past.length === 0 && (
              <EmptyState icon={<KeyRound />} title={t.noTests} />
            )}
          </>
        )}
      </div>
    </Page>
  );
}

"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { pickFromPool, type SatPracticeSubject } from "@/lib/SatPractice";
import { loadSatMockSourcesCached, peekSatMockSources, type SatMockSources } from "@/services/satMockSourceService";
import { Page, Skeleton, cn } from "@/components/student-ui";
import type { SatQuizItem } from "@/types/SatQuiz";
import SatPracticeSet from "../_components/SatPracticeSet";
import { loadMySatResults } from "../_components/satAnalysis";
import {
  buildTopicSections, loadTopicProgress, practisedIds, recordTopicSet,
  type TopicEntry, type TopicProgress,
} from "../_components/satTopics";

/**
 * **Learn by topic** — `/sat/topics?s=math|english` (2026-11-02).
 *
 * The SUBTOPIC is the unit (Linear Equations, Quadratics, Circles…), not the
 * domain: every subtopic of the subject's taxonomy is a card — question count
 * + the student's own progress on it — grouped under small domain headings.
 * Tap → a 10/20-question set (`SatPracticeSet`) from the mock pool, unseen
 * first. Subtopics with no questions yet stay visible, greyed, so the syllabus
 * reads complete. Progress is device-local; wrong / skipped questions go to My
 * Mistakes. English-only chrome. docs/SAT_QUIZ.md §Topic practice.
 */

const t = {
  title: "Learn by topic",
  back: "SAT",
  subjects: { math: "Math", english: "Reading and Writing" } as const,
  questions: "questions",
  none: "No questions yet",
  answered: "answered",
  size: "Questions per set",
  loading: "Collecting questions…",
  mixed: "Mixed",
};

const SLUG: Record<"math" | "english", SatPracticeSubject> = { math: "sat-matematika", english: "sat-ingliz-tili" };
const SUBJECT_NAME: Record<"math" | "english", string> = { math: "SAT Matematika", english: "SAT Ingliz tili (Reading & Writing)" };
const SIZES = [10, 20] as const;

export default function SatTopicsPage() {
  return (
    <Suspense fallback={<Page><Skeleton height={120} className="w-full rounded-m3-lg" /></Page>}>
      <SatTopics />
    </Suspense>
  );
}

function SatTopics() {
  const router = useRouter();
  const params = useSearchParams();
  const subject: "math" | "english" = params.get("s") === "english" ? "english" : "math";
  const slug = SLUG[subject];

  const { user } = useAuth();
  const uid = user?.uid ?? "";

  // Keyed by subject so switching Math ⇄ R&W never shows the other's pool.
  const [loaded, setLoaded] = useState<{ slug: string; data: SatMockSources } | null>(null);
  const sources = loaded?.slug === slug ? loaded.data : peekSatMockSources(slug);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  // Device-local progress: read once per user, replaced after each set.
  const stored = useMemo(() => (uid ? loadTopicProgress(uid) : {}), [uid]);
  const [updated, setProgress] = useState<Record<string, TopicProgress> | null>(null);
  const progress = updated ?? stored;
  const [size, setSize] = useState<(typeof SIZES)[number]>(10);
  const [set, setSet] = useState<{ topic: TopicEntry; items: SatQuizItem[]; n: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSatMockSourcesCached(slug)
      .then((d) => { if (!cancelled) setLoaded({ slug, data: d }); })
      .catch((err) => {
        console.warn(err);
        if (!cancelled) setLoaded({ slug, data: { items: [], counts: { bank: 0, questions: 0, mocks: 0 }, failed: ["bank", "questions", "mocks"] } });
      });
    return () => { cancelled = true; };
  }, [slug]);

  // Questions answered in past sittings count as seen (unseen come first).
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    loadMySatResults(uid)
      .then((d) => {
        if (cancelled) return;
        setSeen(new Set(d[subject].flatMap((r) => Object.keys(r.items ?? {}))));
      })
      .catch((err) => console.warn(err));
    return () => { cancelled = true; };
  }, [uid, subject]);

  const sections = useMemo(() => buildTopicSections(sources?.items ?? [], slug, t.mixed), [sources, slug]);

  function start(topic: TopicEntry) {
    const seenNow = new Set([...seen, ...(practisedIds.get(slug) ?? [])]);
    const items = pickFromPool(topic.items, { count: size, seen: seenNow });
    if (items.length) setSet((prev) => ({ topic, items, n: (prev?.n ?? 0) + 1 }));
  }

  return (
    <Page>
      <div className="mx-auto flex max-w-4xl flex-col gap-4 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/sat" aria-label={t.back} className="s-panel s-press grid h-10 w-10 place-items-center rounded-full text-on-surface">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="s-display min-w-0 flex-1 text-[22px] font-bold text-on-surface">{t.title}</h1>
        </div>

        {set ? (
          <SatPracticeSet
            // A fresh component per set — its answers start empty.
            key={set.n}
            items={set.items}
            label={set.topic.name}
            onDone={(answers) => {
              setProgress(recordTopicSet({
                uid, slug, topic: set.topic, items: set.items, answers,
                subjectName: SUBJECT_NAME[subject],
                title: `${t.title}: ${set.topic.name}`,
              }));
            }}
            onAgain={() => start(set.topic)}
            onExit={() => setSet(null)}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="s-panel inline-flex gap-0.5 rounded-full p-1" role="group">
                {(["math", "english"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={subject === s}
                    onClick={() => router.replace(`/sat/topics?s=${s}`)}
                    className={cn("h-9 rounded-full px-4 text-[13px] font-bold", subject === s ? "s-chip" : "text-on-surface-variant hover:text-on-surface")}
                  >
                    {t.subjects[s]}
                  </button>
                ))}
              </div>
              <div className="s-panel inline-flex items-center gap-0.5 rounded-full p-1" role="group" aria-label={t.size}>
                {SIZES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={size === n}
                    onClick={() => setSize(n)}
                    className={cn("s-num h-9 rounded-full px-3.5 text-[13px] font-extrabold", size === n ? "s-chip" : "text-on-surface-variant")}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {!sources ? (
              <div className="flex flex-col gap-3">
                {[0, 1, 2].map((i) => <Skeleton key={i} height={84} className="w-full rounded-m3-lg" />)}
              </div>
            ) : (
              sections.map((d) => (
                <section key={d.id} className="flex flex-col gap-2">
                  <h2 className="flex items-center gap-2 px-1 text-[12px] font-black uppercase tracking-[0.08em] text-on-surface-variant">
                    <span className="h-2 w-2 rounded-full" style={{ background: `var(--s-viz-${d.slot})` }} />
                    {d.name}
                  </h2>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {d.topics.map((topic) => {
                      const ready = topic.items.length > 0;
                      const p = progress[`${slug}|${topic.key}`];
                      const pct = p && p.total > 0 ? Math.round((p.right / p.total) * 100) : null;
                      return (
                        <button
                          key={topic.key}
                          type="button"
                          disabled={!ready}
                          onClick={() => start(topic)}
                          className={cn(
                            "s-panel flex flex-col gap-2 rounded-m3-lg p-3.5 text-left",
                            ready ? "s-press" : "cursor-default opacity-55",
                          )}
                        >
                          <span className="flex items-start gap-2">
                            <span className="min-w-0 flex-1 text-[14px] font-extrabold leading-snug text-on-surface">{topic.name}</span>
                            {ready && <ChevronRight size={16} className="mt-0.5 flex-none text-on-surface-variant" />}
                          </span>
                          <span className="s-num text-[11.5px] font-medium text-on-surface-variant">
                            {ready ? `${topic.items.length} ${t.questions}` : t.none}
                            {p && p.total > 0 && <> · {p.total} {t.answered}</>}
                          </span>
                          {pct !== null && (
                            <span className="flex items-center gap-2">
                              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-state-hover">
                                <span
                                  className="block h-full rounded-full"
                                  style={{ width: `${pct}%`, background: pct >= 70 ? "var(--m3-success)" : pct >= 40 ? "var(--m3-warning)" : "var(--m3-error)" }}
                                />
                              </span>
                              <span className="s-num text-[11.5px] font-black text-on-surface">{pct}%</span>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </>
        )}
      </div>
    </Page>
  );
}

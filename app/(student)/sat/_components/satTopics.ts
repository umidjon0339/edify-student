// app/(student)/sat/_components/satTopics.ts
//
// "Learn by topic" (/sat/topics, 2026-11-02) — the SUBTOPIC is the unit, not
// the domain. Builds the subtopic list from the taxonomy
// (data/question_topics.json) + the question pool, records a finished set,
// and keeps per-subtopic progress on the device. docs/SAT_QUIZ.md §Topic practice.

import { SUBJECTS } from "@/lib/questionTopics";
import { isSatItemCorrect, satDomainSlot } from "@/lib/SatMathQuiz";
import type { SatPracticeSubject } from "@/lib/SatPractice";
import { satMistakes } from "@/lib/mistakes";
import { recordMistakes } from "@/services/mistakeService";
import type { SatQuizItem } from "@/types/SatQuiz";

export interface TopicEntry {
  /** Stable key: the subtopic id, or `${domain}::mixed` for untagged items. */
  key: string;
  name: string;
  domain: string;
  slot: number;
  /** Pool items belonging to this subtopic. */
  items: SatQuizItem[];
}

export interface DomainSection {
  id: string;
  name: string;
  slot: number;
  topics: TopicEntry[];
}

/**
 * Every subtopic of the subject (taxonomy order), each with its pool items.
 * Subtopics with no questions are KEPT (shown greyed) so the syllabus is
 * complete. Items with no `subtopic` go to the domain's single subtopic when it
 * has exactly one (SAT R&W), otherwise to a per-domain "Mixed" entry; ids the
 * taxonomy doesn't know become their own entries.
 */
export function buildTopicSections(items: SatQuizItem[], slug: SatPracticeSubject, mixedLabel: string): DomainSection[] {
  const subject = SUBJECTS.find((s) => s.id === slug);
  if (!subject) return [];
  return subject.topics.map((topic) => {
    const slot = satDomainSlot(topic.id);
    const inDomain = items.filter((q) => q.domain === topic.id);
    const single = topic.subtopics.length === 1 ? topic.subtopics[0].id : null;
    const byKey = new Map<string, SatQuizItem[]>();
    for (const q of inDomain) {
      const key = q.subtopic || single || `${topic.id}::mixed`;
      byKey.set(key, [...(byKey.get(key) ?? []), q]);
    }
    const known = topic.subtopics.map((st) => ({
      key: st.id, name: st.name, domain: topic.id, slot, items: byKey.get(st.id) ?? [],
    }));
    const knownIds = new Set(topic.subtopics.map((st) => st.id));
    const extra = [...byKey.entries()]
      .filter(([k]) => !knownIds.has(k))
      .map(([k, list]) => ({
        key: k,
        name: k.endsWith("::mixed") ? `${mixedLabel} · ${topic.name}` : k,
        domain: topic.id,
        slot,
        items: list,
      }));
    return { id: topic.id, name: topic.name, slot, topics: [...known, ...extra] };
  });
}

// ─── progress (device-local) ─────────────────────────────────────────────────

export interface TopicProgress { right: number; total: number; at: number }

const storeKey = (uid: string) => `edify-sat-topics:${uid}`;

export function loadTopicProgress(uid: string): Record<string, TopicProgress> {
  if (!uid || typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(storeKey(uid)) || "{}");
  } catch {
    return {};
  }
}

/** Ids practised this browser session, per subject — so a new set moves on. */
export const practisedIds = new Map<string, Set<string>>();

/**
 * A set is over: remember its ids, add it to the subtopic's progress and bank
 * the wrong / skipped questions in My Mistakes (fire-and-forget). Returns the
 * updated progress map.
 */
export function recordTopicSet(params: {
  uid: string;
  slug: SatPracticeSubject;
  topic: TopicEntry;
  items: SatQuizItem[];
  answers: Record<string, string>;
  subjectName: string;
  title: string;
}): Record<string, TopicProgress> {
  const { uid, slug, topic, items, answers } = params;
  const bucket = practisedIds.get(slug) ?? new Set<string>();
  for (const q of items) bucket.add(q.id);
  practisedIds.set(slug, bucket);

  const outcomes: Record<string, number> = {};
  const omitted: string[] = [];
  for (const q of items) {
    const a = answers[q.id];
    outcomes[q.id] = isSatItemCorrect(q, a) ? 1 : 0;
    if (!a?.trim()) omitted.push(q.id);
  }

  const progress = loadTopicProgress(uid);
  if (uid) {
    const key = `${slug}|${topic.key}`;
    const prev = progress[key] ?? { right: 0, total: 0, at: 0 };
    progress[key] = {
      right: prev.right + Object.values(outcomes).filter((v) => v === 1).length,
      total: prev.total + items.length,
      at: Date.now(),
    };
    try { localStorage.setItem(storeKey(uid), JSON.stringify(progress)); } catch { /* quota — progress is a nicety */ }

    recordMistakes(
      uid,
      satMistakes({
        source: slug === "sat-matematika" ? "sat-math" : "sat-english",
        testId: `satpt_${topic.key}`,
        testTitle: params.title,
        examLang: "en",
        items,
        outcomes,
        omitted,
        subjectId: slug,
        subjectName: params.subjectName,
      }),
    ).catch((e) => console.error("recordMistakes failed:", e));
  }
  return progress;
}

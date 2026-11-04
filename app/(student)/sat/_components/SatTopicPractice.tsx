"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Target } from "lucide-react";

import type { SatPracticeSubject } from "@/lib/SatPractice";
import { loadSatMockSourcesCached, peekSatMockSources, type SatMockSources } from "@/services/satMockSourceService";
import type { SatVizSubject } from "./SatViz";
import { buildTopicSections } from "./satTopics";

/**
 * The subject page's door to **Learn by topic** (`/sat/topics?s=…`, 2026-11-02):
 * name + "N topics · M questions". The practice itself lives on that page —
 * subtopic by subtopic — so there is one flow, not two. Reads the shared
 * 5-min pool cache, so it costs nothing beside the mock card.
 */

export default function SatTopicPractice({ subject, slug }: { subject: SatVizSubject; slug: SatPracticeSubject }) {
  const [sources, setSources] = useState<SatMockSources | null>(() => peekSatMockSources(slug));

  useEffect(() => {
    if (peekSatMockSources(slug)) return;
    let cancelled = false;
    loadSatMockSourcesCached(slug)
      .then((d) => { if (!cancelled) setSources(d); })
      .catch((err) => console.warn(err));
    return () => { cancelled = true; };
  }, [slug]);

  const facts = useMemo(() => {
    if (!sources) return null;
    const topics = buildTopicSections(sources.items, slug, "Mixed").flatMap((d) => d.topics).filter((x) => x.items.length > 0);
    return { topics: topics.length, questions: sources.items.length };
  }, [sources, slug]);

  return (
    <Link href={`/sat/topics?s=${subject}`} className="s-panel s-press flex items-center gap-3.5 rounded-m3-lg p-4">
      <span className="s-chip grid h-11 w-11 flex-none place-items-center rounded-full"><Target size={20} strokeWidth={2.5} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-black text-on-surface">Learn by topic</span>
        <span className="s-num block text-[12px] font-medium text-on-surface-variant">
          {facts ? `${facts.topics} topics · ${facts.questions} questions` : "…"}
        </span>
      </span>
      <ChevronRight size={18} className="flex-none text-on-surface-variant" />
    </Link>
  );
}

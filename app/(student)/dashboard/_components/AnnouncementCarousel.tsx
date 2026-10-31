// app/(student)/dashboard/_components/AnnouncementCarousel.tsx
'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowRight, Pause, Play, Sparkles } from 'lucide-react';

import {
  ANNOUNCEMENTS, ANNOUNCEMENT_FALLBACK_ICON, activeAnnouncements, say,
  type Announcement,
} from '@/lib/announcements';
import { MOTION_ON, cn } from '@/components/student-ui';
import type { Lang } from '@/types/Math';

/**
 * **The dashboard's announcement strip.** It shows every entry of
 * [lib/announcements.ts](../../../../lib/announcements.ts) — that array is the
 * only thing to edit to announce the next feature; nothing here knows what an
 * announcement is *about*.
 *
 * It took the slot the hardcoded `MmsCard` held until 2026-07-30. A card welded
 * to one feature had to be rewritten (and re-reviewed, and re-translated) every
 * time the platform shipped something else, so every subject is now an entry in
 * a list instead of a component.
 *
 * ⚠️ **Zero Firestore reads.** The content is a bundled constant. That is what
 * makes it acceptable for the dashboard to spend its hero slot on news.
 *
 * **An endless marquee of compact cards (2026-11-01).** Every announcement is
 * its own card in its own `tone` (`.s-deck-card` in the student theme.css); the
 * strip glides left without stopping and **stops under the cursor** (and while
 * anything inside has keyboard focus) — pure CSS (`.s-marquee`), no timers. The
 * track renders the list twice and slides by exactly one copy, so the loop seam
 * is invisible. White text on the cards ⇒ every opacity modifier uses a plain
 * palette colour (`bg-white/15`), never an M3 token (see the cross-cutting trap
 * in CLAUDE.md).
 *
 * Accessibility / behaviour, all deliberate:
 * - **There is an explicit pause/play control** (APG requires one of any
 *   auto-moving content, and touch screens have no hover).
 * - **`prefers-reduced-motion` / `Motion_level: 'none'` render no marquee at
 *   all** — one copy in a sideways-scrolling row, so nothing moves on its own
 *   and nothing becomes unreachable.
 * - **The repeats are presentation only**: `aria-hidden` and their link is
 *   `tabIndex=-1`, so a screen reader hears each card once and Tab visits each
 *   card once. They are NOT `inert` — a mouse user must still be able to click
 *   whichever copy happens to be on screen.
 */

/** Seconds per card in one loop — sets the strip's speed. */
const SECONDS_PER_CARD = 6;
/** A copy shorter than this is repeated so the strip never shows a gap. */
const MIN_PER_COPY = 6;

// ─── browser-owned state ─────────────────────────────────────────────────────
// ⚠️ Read with `useSyncExternalStore`, never mirrored into state from an effect:
// the browser owns them, and a synchronous setState in an effect body is a lint
// error with the React Compiler on.

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

const subscribeReducedMotion = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};

/** No-op store: the snapshot flips from the server value to the client one at hydration. */
const subscribeNever = () => () => {};

const UI: Record<Lang, Record<string, string>> = {
  uz: { region: 'Yangiliklar', pause: "To'xtatish", play: 'Davom etish', try: "Sinab ko'ring" },
  ru: { region: 'Новости', pause: 'Остановить', play: 'Продолжить', try: 'Попробуйте сами' },
  en: { region: 'Announcements', pause: 'Pause', play: 'Play', try: 'Try yourself' },
};

export default function AnnouncementCarousel({
  lang,
  className = '',
}: {
  lang: Lang;
  className?: string;
}) {
  const t = UI[lang];

  // ⚠️ **The `from`/`until` filter is applied only after hydration.** Reading a
  // clock during render is server/client-divergent by nature, and `/dashboard` is
  // statically prerendered — its HTML is baked at BUILD time. Today nothing here
  // reaches that prerender (the student layout renders an auth gate until the
  // profile resolves), but a strip that starts silently mismatching the moment
  // that changes is not worth two saved lines. Until the store flips, the full
  // list renders; the client narrows it to today's on the next commit.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const items = useMemo(() => (hydrated ? activeAnnouncements() : ANNOUNCEMENTS), [hydrated]);

  const [userPaused, setUserPaused] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );

  const count = items.length;
  if (count === 0) return null;

  // A single card, or no motion allowed: a plain row, nothing moves.
  const moving = MOTION_ON && !reduced && count > 1;

  // One copy of the loop: the list, repeated until it is long enough to fill a
  // wide screen (a 2-card loop would otherwise show an empty gap).
  const copy: Announcement[] = [];
  while (moving && copy.length < MIN_PER_COPY) copy.push(...items);

  return (
    <section aria-label={t.region} className={cn('relative min-w-0', className)}>
      {moving ? (
        // ⚠️ `overflow-x-clip`, not `hidden`: the strip must not widen the page,
        // but `hidden` would also clip the cards' hover lift and shadow.
        <div className="s-marquee-stage overflow-x-clip py-3">
          <div
            className="s-marquee flex"
            data-paused={userPaused}
            style={{ '--s-marquee-dur': `${copy.length * SECONDS_PER_CARD}s` } as React.CSSProperties}
          >
            {[0, 1].map((half) =>
              copy.map((item, k) => {
                // Only the first appearance of each item is "real" — every
                // repeat is read once and tabbed once (i.e. not at all).
                const primary = half === 0 && k < count;
                return (
                  <div
                    key={`${half}-${k}-${item.id}`}
                    // Spacing is padding, not `gap`: a gap after the last card
                    // of a copy would make the -50% slide land off by one gap.
                    className="flex shrink-0 pr-3"
                    aria-hidden={primary ? undefined : true}
                  >
                    <PromoCard item={item} lang={lang} focusable={primary} cta={t.try} />
                  </div>
                );
              }),
            )}
          </div>
        </div>
      ) : (
        <div className="s-no-scrollbar flex snap-x gap-3 overflow-x-auto py-3">
          {items.map((item) => (
            <div key={item.id} className="flex shrink-0 snap-start">
              <PromoCard item={item} lang={lang} focusable cta={t.try} />
            </div>
          ))}
        </div>
      )}

      {/* Frosted side edges — cards blur as they enter and leave. */}
      {moving && <div aria-hidden data-side="left" className="s-marquee-edge" />}
      {moving && <div aria-hidden data-side="right" className="s-marquee-edge" />}

      {moving && (
        <button
          type="button"
          aria-label={userPaused ? t.play : t.pause}
          title={userPaused ? t.play : t.pause}
          onClick={() => setUserPaused((p) => !p)}
          className="s-glass absolute bottom-0 right-1 z-10 grid h-8 w-8 place-items-center rounded-full text-on-surface-variant hover:text-on-surface s-press"
        >
          {userPaused ? <Play size={13} strokeWidth={3} /> : <Pause size={13} strokeWidth={3} />}
        </button>
      )}
    </section>
  );
}

/**
 * One compact announcement card — Edify-minimal: icon, badge, title, at most two
 * facts on one line, ONE action. The long `body` and any secondary CTA stay in
 * lib/announcements.ts for the feature's own page; they are not repeated here.
 *
 * ⚠️ The button always reads the same "Try yourself" (`UI.try`, 2026-11-01) —
 * one inviting verb across the strip instead of "Enter a code" / "Start a
 * paper". Only its `href` comes from the announcement's primary CTA; the CTA's
 * own `label` is not shown here.
 */
function PromoCard({
  item, lang, focusable, cta: ctaLabel,
}: {
  item: Announcement;
  lang: Lang;
  /** False on the marquee's visual repeats: their link leaves the Tab order. */
  focusable: boolean;
  /** The button's label — the same on every card. */
  cta: string;
}) {
  const Icon = item.icon ?? ANNOUNCEMENT_FALLBACK_ICON;
  const facts = (item.meta ?? []).slice(0, 2).map((m) => say(m, lang));
  const cta = item.ctas?.find((c) => c.variant === 'filled') ?? item.ctas?.[0];

  return (
    <article
      data-tone={item.tone}
      className="s-deck-card flex w-[16rem] flex-col rounded-m3-lg p-4 sm:w-[17rem]"
    >
      <span aria-hidden className="s-deck-sheen" />

      <div className="flex items-center gap-2.5">
        <span aria-hidden className="s-deck-orb grid h-10 w-10 shrink-0 place-items-center rounded-full">
          <Icon size={19} strokeWidth={2.4} />
        </span>
        {item.badge && (
          <span className="s-num inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10.5px] font-black uppercase tracking-[0.12em] text-[var(--s-deck-a)]">
            <Sparkles size={11} strokeWidth={3} aria-hidden />
            {say(item.badge, lang)}
          </span>
        )}
      </div>

      <h3 className="s-display mt-3 line-clamp-2 text-[17px] font-bold leading-tight tracking-tight">
        {say(item.title, lang)}
      </h3>

      {facts.length > 0 && (
        <p className="s-num mt-1 truncate text-[12px] font-bold text-white/75">
          {facts.join(' · ')}
        </p>
      )}

      {cta && (
        // `mt-auto`: cards in the strip are stretched to the tallest, so the
        // buttons line up along one edge.
        <div className="mt-auto pt-3.5">
          <Link
            href={cta.href}
            tabIndex={focusable ? undefined : -1}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[12.5px] font-black text-[var(--s-deck-a)] shadow-elev-1 hover:shadow-elev-2 s-press"
          >
            {ctaLabel}
            <ArrowRight size={14} strokeWidth={3} aria-hidden />
          </Link>
        </div>
      )}
    </article>
  );
}

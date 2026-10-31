'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import { Sparkles } from 'lucide-react';
import { useStudentLanguage } from '@/app/(student)/layout';
import { getPeriodIds as getSharedPeriodIds } from '@/lib/xpDays';
import {
  Page, PageHeader, SegmentedControl, ListGroup, Podium, RankRow, Chip,
  EmptyState, LoadingState, cn, type RankEntry,
} from '@/components/student-ui';

// =========================================
// 1. HELPERS & GLOBAL CACHE
// =========================================

// 🟢 SMART CACHE: Survives navigation and tracks data age!
const globalLeaderboardCache: Record<string, { leaders: any[], me: any, timestamp: number }> = {};
const CACHE_LIFESPAN = 60 * 1000; // 60 seconds (1 minute)

const PERIODS = ['today', 'week', 'month', 'all'] as const;
type Period = (typeof PERIODS)[number];

// Period IDs come from the single shared implementation in lib/xpDays.ts —
// writers (test runner, checkers via lib/xp.ts) address the same docs.
const getPeriodIds = () => {
  const { dayId, weekId, monthId, globalId } = getSharedPeriodIds();
  return { today: dayId, week: weekId, month: monthId, all: globalId };
};

/** Firestore leaderboard row → the kit's RankEntry shape. */
const toEntry = (u: any, isMe: boolean): RankEntry => ({
  id: u.uid,
  name: u.displayName || 'Student',
  xp: u.xp || 0,
  avatar: u.photoURL || u.photoUrl || u.avatar || null,
  isMe,
});

/** A rank row that navigates to the student's profile. */
function RankLink({
  entry,
  rank,
  rankLabel,
  youLabel,
  onSelect,
}: {
  entry: RankEntry;
  rank: number;
  rankLabel?: string;
  youLabel: string;
  onSelect: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); }
      }}
      className={cn(
        'flex cursor-pointer items-center transition-colors duration-m3-fast ease-m3-std',
        !entry.isMe && 'hover:bg-state-hover active:bg-state-press',
      )}
    >
      <RankRow entry={entry} rank={rank} rankLabel={rankLabel} className="min-w-0 flex-1" />
      {entry.isMe && (
        <Chip status="primary" className="mr-s-row-x uppercase tracking-widest">{youLabel}</Chip>
      )}
    </div>
  );
}

// =========================================
// 2. TRANSLATIONS
// =========================================
const LEADERBOARD_TRANSLATIONS: any = {
  uz: {
    title: "Reyting",
    subtitle: "Eng faol o'quvchilar ro'yxati",
    tabs: { today: "Bugun", week: "Hafta", month: "Oy", all: "Umumiy" },
    empty: "Hozircha natijalar yo'q",
    you: "SIZ",
    xp: "XP"
  },
  en: {
    title: "Leaderboard",
    subtitle: "Ranking the top performing students",
    tabs: { today: "Today", week: "Week", month: "Month", all: "All Time" },
    empty: "No results yet",
    you: "YOU",
    xp: "XP"
  },
  ru: {
    title: "Рейтинг",
    subtitle: "Самые активные ученики",
    tabs: { today: "Сегодня", week: "Неделя", month: "Месяц", all: "За все время" },
    empty: "Пока нет результатов",
    you: "ВЫ",
    xp: "XP"
  }
};

export default function LeaderboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { lang } = useStudentLanguage();
  const t = LEADERBOARD_TRANSLATIONS[lang] || LEADERBOARD_TRANSLATIONS['en'];

  // 🟢 URL State Tab Logic
  const urlTab = searchParams.get('tab') as Period;
  const [activeTab, setActiveTab] = useState<Period>(
    PERIODS.includes(urlTab) ? urlTab : 'week'
  );

  const [leaders, setLeaders] = useState<any[]>([]);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🟢 Custom Tab Changer (Updates URL silently)
  const handleTabChange = (tab: Period) => {
    setActiveTab(tab);
    router.replace(`${pathname}?tab=${tab}`, { scroll: false });
  };

 // =========================================
  // 3. FETCH DATA (Stale-While-Revalidate)
  // =========================================
  useEffect(() => {
    const fetchData = async () => {
      const periodIds = getPeriodIds();
      const collectionId = periodIds[activeTab];
      const now = Date.now();

      // 🟢 1. INSTANT CACHE LOAD
      const cachedData = globalLeaderboardCache[activeTab];
      if (cachedData) {
        setLeaders(cachedData.leaders);
        setCurrentUserData(cachedData.me);
        setLoading(false); // Instantly paint the UI

        // If the cache is less than 60 seconds old, stop here. Zero reads!
        if (now - cachedData.timestamp < CACHE_LIFESPAN) {
          return;
        }

        // 🟢 If older than 60s, DO NOT return. We let the code continue to
        // fetch fresh data silently in the background (no loading spinner).
      } else {
        // Only show the loading skeleton if we have absolutely no cache
        setLoading(true);
      }

      try {
        const q = query(
          collection(db, 'leaderboards', collectionId, 'users'),
          orderBy('xp', 'desc'),
          limit(20)
        );
        const snapshot = await getDocs(q);
        const fetchedLeaders = snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));

        let myData = null;

        if (user) {
          const myIndexInTop20 = fetchedLeaders.findIndex((u: any) => u.uid === user.uid);

          if (myIndexInTop20 !== -1) {
            myData = { ...fetchedLeaders[myIndexInTop20], rank: myIndexInTop20 + 1 };
          } else {
            const myDocRef = doc(db, 'leaderboards', collectionId, 'users', user.uid);
            const myDocSnap = await getDoc(myDocRef);
            if (myDocSnap.exists()) {
              myData = { uid: user.uid, ...myDocSnap.data(), rank: '20+' };
            }
          }
        }

        // 🟢 2. UPDATE CACHE & UI WITH FRESH DATA
        globalLeaderboardCache[activeTab] = {
          leaders: fetchedLeaders,
          me: myData,
          timestamp: Date.now() // Record exactly when we fetched this
        };

        setLeaders(fetchedLeaders);
        setCurrentUserData(myData);

      } catch (error) {
        console.error("Leaderboard error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, user]);

  // The podium needs a full top-3; with fewer entries everyone falls back to rows.
  const hasPodium = leaders.length >= 3;
  const rest = hasPodium ? leaders.slice(3) : leaders;
  const firstRestRank = hasPodium ? 4 : 1;

  return (
    <Page>
      <PageHeader title={t.title} />

      {/* ========================================= */}
      {/* PERIOD FILTER */}
      {/* ========================================= */}
      {/* Sticks just under the shell's pills (z-40). Edify style: no band —
          the glass capsule floats on its own. */}
      <div className="sticky top-[calc(var(--s-topbar-h)_+_6px)] z-30 mb-s-gap-lg">
        <div className="s-no-scrollbar overflow-x-auto">
          <SegmentedControl
            label={t.title}
            value={activeTab}
            onChange={handleTabChange}
            options={PERIODS.map((p) => ({ value: p, label: t.tabs[p] as string }))}
            className="min-w-full [&_button]:flex-1"
          />
        </div>
      </div>

      {/* ========================================= */}
      {/* LEADERBOARD LIST & PODIUM */}
      {/* ========================================= */}
      {loading ? (
        <LoadingState rows={6} />
      ) : leaders.length === 0 ? (
        <EmptyState icon={<Sparkles size={28} strokeWidth={2.5} />} title={t.empty} />
      ) : (
        <div className="flex flex-col gap-s-section">
          {hasPodium && (
            <Podium
              top={leaders.slice(0, 3).map((u) => toEntry(u, user?.uid === u.uid))}
              onSelect={(entry) => router.push(`/profile/${entry.id}`)}
              className="pt-2"
            />
          )}

          {rest.length > 0 && (
            <ListGroup>
              {rest.map((u, idx) => (
                <RankLink
                  key={u.uid}
                  entry={toEntry(u, user?.uid === u.uid)}
                  rank={idx + firstRestRank}
                  youLabel={t.you}
                  onSelect={() => router.push(`/profile/${u.uid}`)}
                />
              ))}
            </ListGroup>
          )}

          {/* 🟢 THE "ME" CARD (Appended at bottom if > 20) */}
          {currentUserData && currentUserData.rank === '20+' && (
            <div className="flex flex-col gap-s-gap">
              {/* Vertical ellipsis to show the gap in ranks */}
              <div className="flex flex-col items-center gap-1.5" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full bg-outline-variant" />
                ))}
              </div>

              <ListGroup>
                <RankLink
                  entry={toEntry(currentUserData, true)}
                  rank={leaders.length + 1}
                  rankLabel={String(currentUserData.rank)}
                  youLabel={t.you}
                  onSelect={() => router.push(`/profile/${currentUserData.uid}`)}
                />
              </ListGroup>
            </div>
          )}
        </div>
      )}
    </Page>
  );
}

'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  Trophy, Target, ArrowRight, CheckCircle, Activity, Sparkles, School,
  BookMarked, Building2,
} from 'lucide-react';
import { useStudentLanguage } from '../layout';
import { AreaChart, Area, XAxis, Tooltip, YAxis } from 'recharts';
import ChartFrame from '@/components/ChartFrame';
import AnnouncementCarousel from './_components/AnnouncementCarousel';
import MilliyCard from './_components/MilliyCard';
import TodayScheduleCard from './_components/TodayScheduleCard';

import { calculateStreak, last7Days, xpDayKey } from '@/lib/xpDays';
import { fetchMyCenters, type MyCenter } from '@/services/studentCenterService';
import {
  Button, Card, Chip, Dialog, EmptyState, ListGroup, ListRow, LoadingState,
  Page, PageHeader, ProgressBar, Stack, StatTile, StreakDisplay, Tile,
  XpProgress, cn, sToast,
} from '@/components/student-ui';

// ============================================================================
// 🟢 1. GLOBAL CACHE (0 Reads on Back Navigation)
// ============================================================================
const globalDashboardCache: Record<string, { profile: any, timestamp: number }> = {};
const CACHE_LIFESPAN = 60 * 1000; // 60 seconds

// --- TRANSLATION DICTIONARY ---
const DASHBOARD_TRANSLATIONS: any = {
  uz: {
    loading: "Yuklanmoqda...",
    hello: "Salom, {name}!", subtitle: "O'qishni davom ettiramizmi?",
    buttons: { classes: "Sinflarim", browse: "Sinflarni Ko'rish", cancel: "Bekor qilish" },
    stats: { xp: "Jami XP", streak: "Seriya", level: "Daraja", goal: "Maqsad", days: "kun", edit: "Tahrir" },
    task: { title: "So'nggi Faollik", empty: "Hali hech qanday test ishlanmadi.", btn: "Sinflarga O'tish", score: "Ball" },
    activity: { title: "7 Kunlik Faollik", live: "Jonli" },
    modal: { title: "Kunlik Maqsad", desc: "O'zingizga mos maqsadni tanlang!", levels: { Casual: "Oddiy", Regular: "O'rtacha", Serious: "Jiddiy", Insane: "Dahshat" }, saved: "Maqsad saqlandi!" },
    library: { title: "Onlayn Kutubxona", desc: "Xalqaro va mahalliy darsliklar to'plamini kashf eting.", btn: "Kutubxonaga o'tish" },
    center: { label: "O'quv Markazim", btn: "Davomat va to'lovlar" }
  },
  en: {
    loading: "Loading...",
    hello: "Hi, {name}!", subtitle: "Ready to learn something new?",
    buttons: { classes: "Classes", browse: "Browse Classes", cancel: "Cancel" },
    stats: { xp: "Total XP", streak: "Streak", level: "Level", goal: "Daily Goal", days: "days", edit: "Edit" },
    task: { title: "Recent Activity", empty: "No tests taken yet.", btn: "Go to Classes", score: "Score" },
    activity: { title: "7-Day Activity", live: "Live" },
    modal: { title: "Daily Goal", desc: "Choose an XP target that challenges you!", levels: { Casual: "Casual", Regular: "Regular", Serious: "Serious", Insane: "Insane" }, saved: "Goal saved!" },
    library: { title: "Online Library", desc: "Discover a massive collection of textbooks and resources.", btn: "Explore Library" },
    center: { label: "My Learning Center", btn: "Attendance & payments" }
  },
  ru: {
    loading: "Загрузка...",
    hello: "Привет, {name}!", subtitle: "Готовы продолжить обучение?",
    buttons: { classes: "Классы", browse: "Смотреть", cancel: "Отмена" },
    stats: { xp: "Всего XP", streak: "Серия", level: "Уровень", goal: "Цель", days: "дн.", edit: "Изм." },
    task: { title: "Недавняя активность", empty: "Тесты еще не пройдены.", btn: "Перейти к классам", score: "Балл" },
    activity: { title: "Активность (7 Дней)", live: "Live" },
    modal: { title: "Цель Дня", desc: "Выберите свою цель XP на день!", levels: { Casual: "Легкий", Regular: "Обычный", Serious: "Серьезный", Insane: "Безумный" }, saved: "Цель сохранена!" },
    library: { title: "Онлайн Библиотека", desc: "Откройте для себя коллекцию учебников и ресурсов.", btn: "В Библиотеку" },
    center: { label: "Мой Учебный Центр", btn: "Посещаемость и платежи" }
  }
};

interface UserProfile {
  displayName: string;
  totalXP: number;
  currentStreak: number;
  dailyGoal: number;
  dailyHistory: Record<string, number>;
  recentActivity: any[];
}

const DAY_MS = 86_400_000;

// The four daily-goal tiers. Tailwind only ships classes it can see as whole
// strings, so the selected treatment is spelled out per tone below — a
// template-built `bg-${tone}-container` compiles to nothing and the selected
// tier comes out unstyled.
const GOAL_TIERS = [
  { xp: 50, label: 'Casual', emoji: '😌', tone: 'success' },
  { xp: 100, label: 'Regular', emoji: '🎯', tone: 'secondary' },
  { xp: 200, label: 'Serious', emoji: '🔥', tone: 'warning' },
  { xp: 500, label: 'Insane', emoji: '⚡', tone: 'primary' },
] as const;

const TIER_SELECTED: Record<(typeof GOAL_TIERS)[number]['tone'], string> = {
  success: 'border-transparent bg-success-container text-on-success-container',
  secondary: 'border-transparent bg-secondary-container text-on-secondary-container',
  warning: 'border-transparent bg-warning-container text-on-warning-container',
  primary: 'border-transparent bg-primary-container text-on-primary-container',
};

const SECTION_LABEL = 'text-[11.5px] font-black uppercase tracking-[0.09em] text-on-surface-variant';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { lang } = useStudentLanguage();
  const t = DASHBOARD_TRANSLATIONS[lang] || DASHBOARD_TRANSLATIONS['en'];

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myCenters, setMyCenters] = useState<MyCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState(200);

  const chartData = useMemo(() => last7Days(profile?.dailyHistory, lang), [profile, lang]);

  // The streak dots render the same seven UTC days the chart does — the keys go
  // through xpDayKey so they can never drift to device-local time.
  const week = useMemo(() => {
    const locale = lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US';
    const now = Date.now();
    const days = Array.from({ length: 7 }, (_, i) => new Date(now - (6 - i) * DAY_MS));
    return {
      keys: days.map((d) => xpDayKey(d)),
      labels: days.map((d) => d.toLocaleDateString(locale, { weekday: 'narrow', timeZone: 'UTC' })),
    };
  }, [lang]);

  const activeDays = useMemo(
    () => week.keys.filter((k) => (profile?.dailyHistory?.[k] ?? 0) > 0),
    [week, profile],
  );

  // ============================================================================
  // 🟢 2. DATA FETCHING (Strictly 1 Read per session)
  // ============================================================================
  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return;
      const cached = globalDashboardCache[user.uid];
      const now = Date.now();

      if (cached && now - cached.timestamp < CACHE_LIFESPAN) {
        setProfile(cached.profile);
        setNewGoal(cached.profile.dailyGoal);
        setLoading(false);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        let userData: UserProfile = { displayName: user.displayName || 'Student', totalXP: 0, currentStreak: 0, dailyGoal: 200, dailyHistory: {}, recentActivity: [] };

        if (userSnap.exists()) {
          const data = userSnap.data();
          userData = {
            displayName: data.displayName || user.displayName || 'Student',
            totalXP: data.totalXP ?? data.xp ?? 0,
            currentStreak: calculateStreak(data.dailyHistory),
            dailyGoal: data.dailyGoal || 200,
            dailyHistory: data.dailyHistory || {},
            recentActivity: data.recentActivity || []
          };
        }

        setProfile(userData);
        setNewGoal(userData.dailyGoal);
        globalDashboardCache[user.uid] = { profile: userData, timestamp: Date.now() };

      } catch (error) {
        console.error("Dashboard Load Error:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
    // Center membership comes from center_students (own-read allowed) — shown
    // even for a student with zero groups. Non-blocking, 60s service cache.
    if (user) fetchMyCenters(user.uid).then(setMyCenters).catch(() => { });
  }, [user]);

  // ============================================================================
  // 🟢 3. ACTIONS & HELPERS
  // ============================================================================
  const todayXP = profile?.dailyHistory?.[xpDayKey()] || 0;
  const dailyGoal = profile?.dailyGoal || 200;
  const progressPercent = Math.min(Math.round((todayXP / dailyGoal) * 100), 100);

  const currentLevel = Math.floor((profile?.totalXP || 0) / 1000) + 1;
  const currentLevelProgress = (profile?.totalXP || 0) % 1000;

  const handleSaveGoal = async (goal: number) => {
    if (!user) return;
    setNewGoal(goal);
    setProfile(prev => prev ? ({ ...prev, dailyGoal: goal }) : null);
    setIsEditingGoal(false);

    try {
      await updateDoc(doc(db, 'users', user.uid), { dailyGoal: goal });
      sToast.success(t.modal.saved);
      if (globalDashboardCache[user.uid]) globalDashboardCache[user.uid].profile.dailyGoal = goal;
    } catch (e) {
      console.error(e);
      sToast.error("Error saving goal");
    }
  };

  // ============================================================================
  // 🟢 4. RENDER UI
  // ============================================================================
  if (loading) {
    return (
      <Page width="wide">
        <LoadingState rows={5} label={t.loading} />
      </Page>
    );
  }

  // Recent activity rows that can actually be shown: a question count to
  // divide by and a parsable date (Firestore Timestamp, {seconds}, ISO or ms).
  // Malformed entries used to render "Invalid Date" + "NaN%".
  type RecentActivity = { testTitle?: string; score?: number; totalQuestions?: number; submittedAt?: unknown };
  const toDate = (v: unknown): Date | null => {
    const o = v as { toDate?: () => Date; seconds?: number } | null | undefined;
    const d = typeof o?.toDate === 'function' ? o.toDate()
      : typeof o?.seconds === 'number' ? new Date(o.seconds * 1000)
      : typeof v === 'string' || typeof v === 'number' ? new Date(v)
      : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  };
  const recentValid = ((profile?.recentActivity ?? []) as RecentActivity[])
    .map((activity) => ({ activity, date: toDate(activity?.submittedAt) }))
    .filter((r): r is { activity: RecentActivity & { score: number; totalQuestions: number }; date: Date } =>
      !!r.date && Number(r.activity?.totalQuestions) > 0 && Number.isFinite(Number(r.activity?.score)));

  return (
    <Page width="wide">
      <Stack>
        {/* 🟢 HERO GREETING */}
        <PageHeader
          title={`${t.hello.replace("{name}", profile?.displayName?.split(' ')[0] || '')} 👋`}
          subtitle={t.subtitle}
          className="pb-0"
        />

        {/* 🟢 LEARNING-CENTER BANNER (center_students membership; zero-group safe) */}
        {myCenters.length > 0 && (
          <Link href="/center" className="block">
            <Card interactive className="flex items-center gap-4">
              <Tile tone="primary" size="lg"><Building2 size={24} strokeWidth={2.5} /></Tile>
              <div className="min-w-0 flex-1">
                <p className={SECTION_LABEL}>{t.center.label}</p>
                <p className="s-display truncate text-[17px] font-bold">
                  {myCenters.map(c => c.name).filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <Chip status="primary" className="hidden sm:inline-flex">
                {t.center.btn} <ArrowRight size={13} strokeWidth={3} />
              </Chip>
              <ArrowRight size={18} strokeWidth={3} className="shrink-0 text-on-surface-variant sm:hidden" />
            </Card>
          </Link>
        )}

        {/* 🟢 TODAY'S LESSONS (center groups incl. IELTS; hidden when none) */}
        <TodayScheduleCard lang={lang} />

        {/* 🟢 STATS GRID */}
        <div className="grid gap-s-gap sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label={t.stats.xp}
            value={profile?.totalXP || 0}
            tone="gold"
            icon={<Trophy size={15} strokeWidth={3} />}
            trend={chartData.map((d) => d.XP)}
          />

          {/* `profile` is null when the read failed — the page still renders, so
              nothing here may assume it exists. */}
          <Card className="flex flex-col gap-3">
            <span className={SECTION_LABEL}>{t.stats.streak}</span>
            <StreakDisplay
              days={profile?.currentStreak ?? 0}
              label={t.stats.days}
              activeDays={activeDays}
              dayKeys={week.keys}
              dayLabels={week.labels}
              todayKey={xpDayKey()}
            />
          </Card>

          <Card className="flex flex-col justify-center">
            <XpProgress
              level={currentLevel}
              current={currentLevelProgress}
              target={1000}
              levelLabel={t.stats.level}
            />
          </Card>

          {/* Daily Goal Card (Interactive) */}
          <Card
            interactive
            role="button"
            tabIndex={0}
            aria-label={t.stats.goal}
            onClick={() => setIsEditingGoal(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsEditingGoal(true); }
            }}
            className="flex flex-col"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Tile tone="primary" size="sm"><Target size={15} strokeWidth={3} /></Tile>
                <span className={cn(SECTION_LABEL, 'truncate')}>{t.stats.goal}</span>
              </div>
              <Chip status="primary">{t.stats.edit}</Chip>
            </div>
            <p className="s-display s-num mt-3 text-[clamp(24px,3vw,30px)] font-bold leading-none">
              {todayXP}{' '}
              <span className="text-[14px] font-black text-on-surface-variant">/ {dailyGoal}</span>
            </p>
            <div className="mt-auto pt-3">
              <ProgressBar value={progressPercent} label={t.stats.goal} />
            </div>
          </Card>
        </div>

        {/* 🟢 ANNOUNCEMENTS — the dashboard's hero, and the ONLY place the
            platform tells students what is new. ⚠️ Content lives in
            lib/announcements.ts; nothing about a specific feature belongs here.
            It replaced the hardcoded `MmsCard` (now on /raschmodel, where its
            level + expected score belong) — see docs/STUDENT.md.
            ⚠️ It sits ABOVE MilliyCard: the announcement is what a student should
            read first, and the door below it is where they go afterwards. */}
        <AnnouncementCarousel lang={lang} />

        {/* 🟢 MILLIY SERTIFIKAT — the programme's door, zero Firestore reads.
            ⚠️ It stands here BECAUSE the mobile dock cannot hold the nav entry
            (M3 caps a bottom bar at 5, so `/milliy-sertifikat` is hideOnMobile).
            It replaced `MathLevelSummary`; the 0–5 level it showed now lives only
            on /raschmodel. */}
        <MilliyCard lang={lang} />

        {/* 🟢 MAIN CONTENT AREA */}
        <div className="grid gap-s-gap lg:grid-cols-3">

          {/* Zero-Cost Recent Activity Card */}
          <Card className="flex flex-col gap-s-gap lg:col-span-2">
            <Chip status="success" icon={<Sparkles size={13} strokeWidth={3} />} className="w-max">
              {t.task.title}
            </Chip>

            {recentValid.length > 0 ? (
              <ListGroup variant="cards">
                {recentValid.slice(0, 2).map(({ activity, date }, idx) => {
                  const percent = Math.round((activity.score / activity.totalQuestions) * 100);
                  const status = percent >= 80 ? 'success' : percent >= 50 ? 'warning' : 'error';
                  return (
                    <ListRow
                      key={idx}
                      variant="cards"
                      title={activity.testTitle || '—'}
                      subtitle={date.toLocaleDateString()}
                      trailing={<Chip status={status} className="s-num">{percent}%</Chip>}
                    />
                  );
                })}
              </ListGroup>
            ) : (
              <EmptyState icon="📝" title={t.task.empty} className="py-8" />
            )}

            <Link href="/classes" className="mt-auto w-full md:w-max">
              <Button
                fullWidth
                size="lg"
                icon={<School size={18} strokeWidth={2.8} />}
                trailingIcon={<ArrowRight size={18} strokeWidth={2.8} />}
              >
                {t.task.btn}
              </Button>
            </Link>
          </Card>

          {/* AREA CHART (Last 7 Days) */}
          <Card className="flex flex-col justify-between">
            <div className="mb-6 flex items-center justify-between gap-2">
              <h3 className={cn(SECTION_LABEL, 'flex items-center gap-2 text-on-surface')}>
                <Activity size={17} strokeWidth={3} className="text-primary" /> {t.activity.title}
              </h3>
              {(profile?.totalXP || 0) > 0 && <Chip status="primary">{t.activity.live}</Chip>}
            </div>

            {/* recharts paints through SVG presentation attributes, which do not
                read the theme's CSS variables — the values below are pinned
                theme colors and are deliberately literal. */}
            <ChartFrame className="w-full h-[200px]">
              {({ width, height }) => (
                <AreaChart width={width} height={height} data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorXP" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0067d7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0067d7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A1A1AA', fontWeight: 900 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A1A1AA', fontWeight: 900 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181B', borderRadius: '16px', border: 'none', color: '#fff', fontWeight: '900', fontSize: '13px', padding: '8px 14px' }}
                    itemStyle={{ color: '#0067d7' }} cursor={{ stroke: '#E4E4E7', strokeWidth: 2, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="XP" stroke="#0067d7" strokeWidth={4} fillOpacity={1} fill="url(#colorXP)" activeDot={{ r: 6, fill: '#0067d7', stroke: '#fff', strokeWidth: 3 }} />
                </AreaChart>
              )}
            </ChartFrame>
          </Card>

          {/* 🟢 FULL-WIDTH LIBRARY PROMO BANNER */}
          <Card className="flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left lg:col-span-3">
            <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
              <Tile tone="primary" size="lg" className="rotate-3">
                <BookMarked size={28} strokeWidth={2.5} />
              </Tile>
              <div>
                <h3 className="s-display text-[20px] font-bold md:text-[23px]">{t.library.title}</h3>
              </div>
            </div>
            <Link href="/library" className="w-full md:w-auto">
              <Button fullWidth size="lg" trailingIcon={<ArrowRight size={18} strokeWidth={2.8} />}>
                {t.library.btn}
              </Button>
            </Link>
          </Card>

        </div>
      </Stack>

      {/* 🟢 GOAL EDIT MODAL */}
      <Dialog
        open={isEditingGoal}
        onClose={() => setIsEditingGoal(false)}
        title={t.modal.title}
        actions={
          <Button variant="text" onClick={() => setIsEditingGoal(false)}>{t.buttons.cancel}</Button>
        }
      >
        <p className="mb-5">{t.modal.desc}</p>
        <div className="flex flex-col gap-2.5">
          {GOAL_TIERS.map(({ xp, label, emoji, tone }) => {
            const isSelected = newGoal === xp;
            return (
              <button
                key={xp}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleSaveGoal(xp)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-m3-md border-[1.5px] p-4 text-left s-press',
                  isSelected
                    ? TIER_SELECTED[tone]
                    : 'border-outline-variant bg-surface text-on-surface hover:bg-state-hover',
                )}
              >
                <span className="flex items-center gap-4">
                  <span className="text-[22px] leading-none" aria-hidden>{emoji}</span>
                  <span className="block">
                    <span className="s-num block text-[16px] font-black">{xp} XP</span>
                    <span className="mt-0.5 block text-[11px] font-black uppercase tracking-[0.09em] opacity-70">
                      {t.modal.levels[label as keyof typeof t.modal.levels]}
                    </span>
                  </span>
                </span>
                {isSelected && <CheckCircle size={22} strokeWidth={2.8} />}
              </button>
            );
          })}
        </div>
      </Dialog>
    </Page>
  );
}

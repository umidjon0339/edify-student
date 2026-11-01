'use client';

import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// Firebase & Auth
import { googlePhotoURL } from '@/lib/googlePhoto';
import { useAuth } from '@/lib/AuthContext';
import { calculateStreak } from '@/lib/xpDays';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

// Icons
import {
  LayoutDashboard, BookOpen, User as UserIcon,
  LogOut, Flame, Trophy, ChevronDown, Check, Bell,
  Settings, BookMarked, Gamepad2, Globe, Building2, BadgeCheck, Target, Brain, MoreVertical,
} from 'lucide-react';
import { fetchMyCenters } from '@/services/studentCenterService';

// Components

// 🎓 Student design system. Tokens are imported ONCE here — never in a page.
// To restyle the whole student app, edit design.config.ts (repo root).
import '@/components/student-ui/theme.css';
import {
  StudentThemeProvider, Shell, MobileDrawer, ConfirmDialog, ThemeWaveToggle,
  Avatar, Flag, cn, MOTION_ON, DESIGN,
  type NavItem,
} from '@/components/student-ui';

// ============================================================================
// 1. CONTEXT & TYPES
// ============================================================================
export type LangType = 'uz' | 'en' | 'ru';

interface StudentLangContextType {
  lang: LangType;
  setLang: (lang: LangType) => void;
}

export const StudentLanguageContext = createContext<StudentLangContextType | undefined>(undefined);

export function useStudentLanguage() {
  const context = useContext(StudentLanguageContext);
  if (!context) throw new Error("useStudentLanguage must be used within StudentLayout");
  return context;
}

// ============================================================================
// 2. TRANSLATIONS & HELPERS
// ============================================================================
const LAYOUT_TRANSLATIONS: any = {
  uz: {
    menu: { dashboard: "Boshqaruv", classes: "Sinflarim", explore: "Kurslar", library: "Kutubxona", games: "O'yinlar", leaderboard: "Reyting", ielts: "IELTS", profile: "Profil", raschmodel: "Rasch", milliy: "Milliy sertifikat", sat: "SAT", center: "Markazim", mistakes: "Xatolarim" },
    groups: { main: "Asosiy", exams: "Imtihonlar", resources: "Resurslar" },
    mobileMenu: "Menyu",
    topbar: { streak: "Seriya", profile: "Profil", settings: "Sozlamalar", logout: "Chiqish", language: "Til", notifications: "Bildirishnomalar", light: "Yorug'", dark: "Tun" },
    brandSubtitle: "O'QUVCHI PORTALI",
    loading: "Yuklanmoqda...",
    logoutConfirm: { title: "Tizimdan chiqish", desc: "Haqiqatan ham hisobingizdan chiqmoqchimisiz?", cancel: "Bekor qilish", confirm: "Ha, chiqish" }
  },
  en: {
    menu: { dashboard: "Dashboard", classes: "Classes", explore: "Courses", library: "Library", games: "Games", leaderboard: "Rank", ielts: "IELTS", profile: "Profile", raschmodel: "Rasch", milliy: "Milliy sertifikat", sat: "SAT" , mistakes: "My Mistakes", center: "My center" },
    groups: { main: "Main", exams: "Exams", resources: "Resources" },
    mobileMenu: "Menu",
    topbar: { streak: "Streak", profile: "Profile", settings: "Settings", logout: "Sign Out", language: "Language", notifications: "Notifications", light: "Light", dark: "Dark" },
    brandSubtitle: "STUDENT PORTAL",
    loading: "Loading...",
    logoutConfirm: { title: "Sign Out", desc: "Are you sure you want to sign out of your account?", cancel: "Cancel", confirm: "Yes, Sign Out" }
  },
  ru: {
    menu: { dashboard: "Главная", classes: "Классы", explore: "Курсы", library: "Библиотека", games: "Игры", leaderboard: "Рейтинг", ielts: "IELTS", profile: "Профиль", raschmodel: "Rasch", milliy: "Milliy sertifikat", sat: "SAT" , mistakes: "Мои ошибки", center: "Мой центр" },
    groups: { main: "Главное", exams: "Экзамены", resources: "Ресурсы" },
    mobileMenu: "Меню",
    topbar: { streak: "Серия", profile: "Профиль", settings: "Настройки", logout: "Выйти", language: "Язык", notifications: "Уведомления", light: "Светлая", dark: "Тёмная" },
    brandSubtitle: "ПОРТАЛ УЧЕНИКА",
    loading: "Загрузка...",
    logoutConfirm: { title: "Выход", desc: "Вы уверены, что хотите выйти из аккаунта?", cancel: "Отмена", confirm: "Да, выйти" }
  }
};

// Flags are SVGs (student-ui <Flag/>) — emoji flags render as "UZ"/"GB" letter
// glyphs or mismatched art on many platforms.
const LANGUAGE_OPTIONS: { code: LangType; label: string }[] = [
  { code: 'uz', label: "O'zbek" },
  { code: 'en', label: "English" },
  { code: 'ru', label: "Русский" },
];

// The chosen language survives reloads and new sessions on this device.
const LANG_STORAGE_KEY = 'edify-student-lang';

// ============================================================================
// 3. MAIN LAYOUT COMPONENT
// ============================================================================
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [lang, setLangState] = useState<LangType>('uz');

  // Restore the device's saved language once on mount (post-hydration, so the
  // server-rendered 'uz' shell never mismatches), then persist every change.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY);
      if (stored === 'uz' || stored === 'en' || stored === 'ru') setLangState(stored);
    } catch { /* private mode */ }
  }, []);

  const setLang = useCallback((l: LangType) => {
    setLangState(l);
    try { localStorage.setItem(LANG_STORAGE_KEY, l); } catch { /* private mode */ }
  }, []);
  const [stats, setStats] = useState({ xp: 0, streak: 0 });

  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCenterStudent, setIsCenterStudent] = useState(false);

  const topbarRef = useRef<HTMLDivElement>(null);

  const t = LAYOUT_TRANSLATIONS[lang] || LAYOUT_TRANSLATIONS['en'];
  const activeLang = LANGUAGE_OPTIONS.find(l => l.code === lang) || LANGUAGE_OPTIONS[0];

  // Auth Protection
  useEffect(() => {
    async function checkRole() {
      if (!loading) {
        if (!user) router.push('/auth/login');
        else {
          try {
            const { getUserProfile } = await import('@/services/userService');
            const profile = await getUserProfile(user.uid);
            if (profile?.role === 'manager') router.push('/manager/dashboard');
            else if (profile?.role === 'teacher') router.push('/teacher/dashboard');
            // Office staff (docs/OFFICE.md) — without this they'd fall through
            // to the student dashboard, which has no data for them.
            else if (profile?.role === 'director' || profile?.role === 'accountant') router.push('/office');
            else setIsAuthorized(true);
          } catch (error) {
            console.error(error);
            setIsAuthorized(true);
          }
        }
      }
    }
    checkRole();
  }, [user, loading, router]);

  // 🏢 Center membership — decides whether the "Markazim" nav entry exists.
  // `center_students` own-links are readable by the student (rules `list` allows
  // a `studentId ==` filter), and the service caches for 60s, so this is one
  // cheap query per session shared with the dashboard banner and /center.
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    fetchMyCenters(user.uid)
      .then((centers) => mounted && setIsCenterStudent(centers.length > 0))
      .catch(() => {/* nav entry simply stays hidden */});
    return () => { mounted = false; };
  }, [user]);

  // Live Stats Listener
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStats({
          xp: data.totalXP ?? data.xp ?? 0,
          streak: calculateStreak(data.dailyHistory),
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Close the top-bar menus on an outside press (pointerdown — mouse, touch and
  // pen alike; `mousedown` alone missed some touch taps) and on Escape. Menu
  // links close them themselves (`closeMenus`). Listeners exist only while a
  // menu is open.
  useEffect(() => {
    if (!isLangMenuOpen && !isProfileMenuOpen) return;
    const onDown = (event: PointerEvent) => {
      if (topbarRef.current && !topbarRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
        setIsProfileMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setIsLangMenuOpen(false); setIsProfileMenuOpen(false); }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isLangMenuOpen, isProfileMenuOpen]);

  const isActive = useCallback(
    (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href)),
    [pathname],
  );

  // Loading Screen
  if (loading || (user && !isAuthorized)) {
    return (
      <StudentThemeProvider className="grid min-h-[100dvh] place-items-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-m3-lg bg-surface-container shadow-elev-1">
            <BookOpen className={cn('text-primary', MOTION_ON && 'animate-bounce')} size={32} strokeWidth={2.6} />
          </div>
          <span className="text-[13px] font-black uppercase tracking-[0.12em] text-on-surface-variant">
            {t.loading}
          </span>
        </div>
      </StudentThemeProvider>
    );
  }
  if (!user) return null;

  // 🏢 Center students get a "Markazim" destination (groups, timetable,
  // attendance, payments). Students with no `center_students` link never see it,
  // and /center itself renders an empty state if reached directly.
  // M3 caps a bottom bar at 5 destinations, so on phones Markazim takes
  // Leaderboard's slot — Reyting stays one tap away in the ☰ drawer.
  const menuItems: NavItem[] = [
    { href: '/dashboard', label: t.menu.dashboard, icon: LayoutDashboard },
    { href: '/classes', label: t.menu.classes, icon: BookOpen, group: 'main' },
    ...(isCenterStudent ? [{ href: '/center', label: t.menu.center, icon: Building2, group: 'main' }] : []),
    { href: '/library', label: t.menu.library, icon: BookMarked, hideOnMobile: true, group: 'resources' },
    { href: '/games', label: t.menu.games, icon: Gamepad2, group: 'main' },
    { href: '/leaderboard', label: t.menu.leaderboard, icon: Trophy, hideOnMobile: isCenterStudent, group: 'main' },
    // Phones: off the dock since 2026-11-01 — its slot is the "Menu" tab,
    // and IELTS sits in the drawer's Exams box with Milliy and SAT.
    { href: '/ielts', label: t.menu.ielts, icon: Globe, hideOnMobile: true, group: 'exams' },
    // ⚠️ **Milliy sertifikat is the ONLY entry to the exam programme, including
    // maths.** `/raschmodel` used to sit here beside it, which read as two
    // separate products — it is the maths SECTION of this one, so the hub's
    // Matematika card links there instead (`studentSubjectHref`). Don't add a
    // second nav row for it. See docs/MILLIY_QUIZ.md.
    // Hidden from the mobile dock: M3 caps a bottom bar at 5 destinations.
    { href: '/milliy-sertifikat', label: t.menu.milliy, icon: BadgeCheck, hideOnMobile: true, group: 'exams' },
    // SAT — own nav entry, hidden from the mobile dock for the same M3-cap
    // reason as Milliy sertifikat. A different exam programme, not a subject
    // inside that one. See docs/SAT_QUIZ.md.
    { href: '/sat', label: t.menu.sat, icon: Target, hideOnMobile: true, group: 'exams' },
    // My Mistakes (docs/MISTAKES.md) — fed by SAT / Milliy / Rasch. In the
    // pillbar it is the capsule's FEATURED link (icon chip + label, like the
    // teacher's "Yangi Test"), not a dropdown row; `group` still files it under
    // Resources for any shell that uses groups without `pillCta`.
    { href: '/mistakes', label: t.menu.mistakes, icon: Brain, hideOnMobile: true, group: 'resources', pillCta: true },
    // Hidden from the mobile dock: M3 caps a bottom bar at 5 destinations, and
    // Profile is already one tap away in the avatar menu.
    { href: '/profile', label: t.menu.profile, icon: UserIcon, hideOnMobile: true, hideInPillbar: true },
  ];

  // pillbar dropdown groups (Edify style) — items above reference these keys.
  const navGroups = [
    { key: 'main', label: t.groups.main },
    { key: 'exams', label: t.groups.exams, dot: true },
    { key: 'resources', label: t.groups.resources },
  ];

  // Edify logo (public/brand). The pillbar shell wraps it in a glass pill;
  // the drawer/rail shells show it as-is.
  const brand = (
    <Link href="/dashboard" aria-label="Edify" className="flex min-w-0 items-center gap-2">
      <Image src="/brand/edify-logo.webp" alt="Edify" width={307} height={120} priority unoptimized className="s-brand-logo h-[26px] w-auto shrink-0" />
      {/* `rail` is an icon-only strip (docs/STUDENT_UI.md § Shell variants) — no wordmark there. */}
      {DESIGN.App_shell_navigation !== 'rail' && (
        <span className="hidden sm:block truncate text-[9.5px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">{t.brandSubtitle}</span>
      )}
    </Link>
  );

  const closeMenus = () => { setIsLangMenuOpen(false); setIsProfileMenuOpen(false); };
  // One look for every row of both menus.
  const menuRow = 'flex w-full items-center gap-3 rounded-m3-md px-3 py-2.5 text-[13.5px] font-extrabold text-on-surface-variant hover:bg-state-hover hover:text-on-surface';

  // ⚠️ Top-bar pills are `.s-pill` (no backdrop blur) and the menus open with a
  // CSS entrance (`.s-menu-in`), not a framer-motion spring — four live blurs
  // on a sticky header plus a spring per open was the cluster's lag. See the
  // TOP-BAR PILLS block in components/student-ui/theme.css.
  const topbar = (
    <div ref={topbarRef} className="flex items-center gap-1.5 sm:gap-2">
      {/* Streak */}
      <Link
        href="/profile"
        aria-label={`${t.topbar.streak}: ${stats.streak}`}
        title={t.topbar.streak}
        className="flex h-10 items-center gap-1.5 rounded-full bg-gold-container px-3.5 text-on-gold-container s-press"
      >
        <Flame size={15} strokeWidth={2.8} className={stats.streak > 0 ? 'fill-current' : 'opacity-50'} />
        <span className="s-num text-[13.5px] font-black">{stats.streak}</span>
      </Link>

      {/* Language */}
      <div className="relative hidden md:block">
        <button
          type="button"
          onClick={() => { setIsLangMenuOpen((o) => !o); setIsProfileMenuOpen(false); }}
          aria-label={t.topbar.language}
          aria-haspopup="menu"
          aria-expanded={isLangMenuOpen}
          className="s-pill flex h-10 items-center gap-1.5 rounded-full px-3.5 s-press"
        >
          <Flag code={activeLang.code} size={14} />
          <span className="text-[12px] font-black uppercase text-on-surface-variant">{lang}</span>
          <ChevronDown size={14} strokeWidth={2.8} className={cn('text-on-surface-variant transition-transform duration-m3-fast', isLangMenuOpen && 'rotate-180')} />
        </button>
        {isLangMenuOpen && (
          <div role="menu" aria-label={t.topbar.language} className="s-menu s-menu-in absolute right-0 top-full z-50 mt-2 w-44 rounded-m3-lg p-1.5">
            {LANGUAGE_OPTIONS.map((l) => (
              <button
                key={l.code}
                type="button"
                role="menuitemradio"
                aria-checked={lang === l.code}
                onClick={() => { setLang(l.code); setIsLangMenuOpen(false); }}
                className={cn(menuRow, lang === l.code && 's-chip hover:bg-transparent hover:text-[var(--s-on-accent,var(--m3-on-primary))]')}
              >
                <Flag code={l.code} size={15} />
                <span className="flex-1 text-left">{l.label}</span>
                {lang === l.code && <Check size={15} strokeWidth={3} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Light/dark wave switch (Edify style — replaces the bell; notifications
          moved into the profile menu). */}
      <ThemeWaveToggle
        className="s-pill h-10 w-10 text-on-surface s-press"
        labels={{ toLight: t.topbar.light, toDark: t.topbar.dark }}
      />

      {/* Profile */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setIsProfileMenuOpen((o) => !o); setIsLangMenuOpen(false); }}
          aria-label={t.topbar.profile}
          aria-haspopup="menu"
          aria-expanded={isProfileMenuOpen}
          className="s-pill flex h-10 items-center gap-2 rounded-full p-1 s-press md:pr-3"
        >
          <Avatar src={user?.photoURL || googlePhotoURL(user, 96)} name={user?.displayName ?? 'S'} size="sm" className="h-8 w-8" />
          <span className="hidden max-w-[90px] truncate text-[13px] font-extrabold md:block">
            {user?.displayName?.split(' ')[0] || 'User'}
          </span>
          <ChevronDown size={15} strokeWidth={2.8} className={cn('hidden text-on-surface-variant transition-transform duration-m3-fast md:block', isProfileMenuOpen && 'rotate-180')} />
        </button>

        {isProfileMenuOpen && (
          <div role="menu" aria-label={t.topbar.profile} className="s-menu s-menu-in absolute right-0 top-full z-50 mt-2 w-64 rounded-m3-lg p-1.5">
            <div className="mb-1 flex items-center gap-3 rounded-m3-md bg-state-hover px-3 py-2.5">
              <Avatar src={user?.photoURL || googlePhotoURL(user, 96)} name={user?.displayName ?? 'S'} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-black">{user?.displayName}</p>
                <p className="truncate text-[11.5px] font-bold text-on-surface-variant">{user?.email}</p>
              </div>
            </div>

            {/* Language lives in this menu on phones (no room in the top bar).
                A segmented flag control, not a native <select> — emoji flags
                and OS pickers looked broken and off-brand. */}
            <div className="px-1.5 py-2 md:hidden" role="radiogroup" aria-label={t.topbar.language}>
              <p className="mb-2 px-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-on-surface-variant">{t.topbar.language}</p>
              <div className="grid grid-cols-3 gap-1 rounded-full bg-state-hover p-1">
                {LANGUAGE_OPTIONS.map(l => (
                  <button
                    key={l.code}
                    type="button"
                    role="radio"
                    aria-checked={lang === l.code}
                    onClick={() => setLang(l.code)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 s-press',
                      lang === l.code ? 's-chip' : 'text-on-surface-variant hover:bg-state-hover',
                    )}
                  >
                    <Flag code={l.code} size={14} />
                    <span className="text-[10.5px] font-black uppercase tracking-wide">{l.code}</span>
                  </button>
                ))}
              </div>
            </div>

            <Link href="/profile" role="menuitem" onClick={closeMenus} className={menuRow}>
              <UserIcon size={17} strokeWidth={2.5} /> {t.topbar.profile}
            </Link>
            <Link href="/notifications" role="menuitem" onClick={closeMenus} className={menuRow}>
              <Bell size={17} strokeWidth={2.5} /> {t.topbar.notifications}
            </Link>
            <Link href="/settings" role="menuitem" onClick={closeMenus} className={menuRow}>
              <Settings size={17} strokeWidth={2.5} /> {t.topbar.settings}
            </Link>
            <div className="mx-2 my-1 h-px bg-outline-variant" />
            <button
              type="button"
              role="menuitem"
              onClick={() => { closeMenus(); setShowLogoutModal(true); }}
              className="flex w-full items-center gap-3 rounded-m3-md px-3 py-2.5 text-[13.5px] font-extrabold text-error hover:bg-error-container hover:text-on-error-container"
            >
              <LogOut size={17} strokeWidth={2.5} /> {t.topbar.logout}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <StudentLanguageContext.Provider value={{ lang, setLang }}>
      <StudentThemeProvider>
        <Shell
          items={menuItems}
          isActive={isActive}
          brand={brand}
          topbar={topbar}
          groups={navGroups}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          menuLabel={t.mobileMenu}
        >
          {children}
        </Shell>

        <MobileDrawer
          open={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
          items={menuItems}
          isActive={isActive}
          brand={brand}
          groups={navGroups}
          footer={
            <Link
              href="/profile"
              onClick={() => setIsMobileNavOpen(false)}
              className="flex items-center gap-3 rounded-m3-lg p-1.5 hover:bg-state-hover"
            >
              <Avatar src={user?.photoURL || googlePhotoURL(user, 96)} name={user?.displayName ?? 'S'} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-extrabold text-on-surface">{user?.displayName || t.topbar.profile}</span>
                <span className="block truncate text-[12px] font-medium text-on-surface-variant">{user?.email}</span>
              </span>
              <MoreVertical size={18} className="shrink-0 text-on-surface-variant" />
            </Link>
          }
        />

        <ConfirmDialog
          open={showLogoutModal}
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={() => { signOut(auth); setShowLogoutModal(false); }}
          title={t.logoutConfirm.title}
          description={t.logoutConfirm.desc}
          cancelLabel={t.logoutConfirm.cancel}
          confirmLabel={t.logoutConfirm.confirm}
          destructive
          icon={
            <div className="grid h-14 w-14 place-items-center rounded-full bg-error-container text-on-error-container">
              <LogOut size={26} strokeWidth={2.6} />
            </div>
          }
        />
      </StudentThemeProvider>
    </StudentLanguageContext.Provider>
  );
}

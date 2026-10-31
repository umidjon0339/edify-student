'use client';

import { useEffect, useState, useRef, useCallback, createContext, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';

import '@/components/ui/theme.css';
import {
  Button, ConfirmDialog, ProgressBar, Loader, cn, ThemeWaveToggle,
  TeacherThemeProvider, useTeacherTheme,
  TEACHER_DESIGN, MOTION_ON, springTransition, popIn, pageTransition,
} from '@/components/ui';

import { resolveSideStyle } from '@/components/ui/shellStyles';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { getUserProfile } from '@/services/userService';
import { useMonthlyLimit } from '@/hooks/useMonthlyLimit';
import NotificationBell from '@/components/NotificationBell';

import {
  LayoutDashboard, Users, FilePlus, FolderOpen, Library,
  Sparkles, Settings, LogOut, Menu, X, Bell,
  Zap, BookOpen, UserIcon, CreditCard, PanelLeft, MoreVertical,
  MoreHorizontal, Plus, Sun, Moon, Monitor, Globe, BadgeCheck, Building2, GraduationCap, Gamepad2, ChevronDown, ArrowRight,
} from 'lucide-react';
import { useTeacherCenter } from '@/hooks/useTeacherCenter';

// ============================================================================
// 1. CONTEXT & TYPES
// ============================================================================
export type LangType = 'uz' | 'en' | 'ru';

interface TeacherLangContextType {
  lang: LangType;
  setLang: (lang: LangType) => void;
}

export const TeacherLanguageContext = createContext<TeacherLangContextType | undefined>(undefined);

export function useTeacherLanguage() {
  const context = useContext(TeacherLanguageContext);
  if (!context) throw new Error("useTeacherLanguage must be used within TeacherLayout");
  return context;
}

const LANG_STORAGE_KEY = 'edify-teacher-lang';

// ============================================================================
// 2. TRANSLATION DICTIONARY
// ============================================================================
const LAYOUT_TRANSLATIONS = {
  uz: {
    brandSubtitle: "O'QITUVCHI PORTALI",
    menu: { overview: "Boshqaruv", library: "Mening kutubxonam", classes: "Sinflar", onlineLibrary: "Onlayn Kitoblar", analytics: "Tahlillar", notifications: "Bildirishnomalar", subscription: "Obuna", profile: "Profil", ielts: "IELTS Moduli", milliy: "Milliy sertifikat", sat: "SAT", center: "Markazim", games: "O'yinlar" },
    menuShort: { library: "Kutubxonam", onlineLibrary: "Kitoblar", notifications: "Xabarlar", milliy: "Milliy", sat: "SAT" },
    bottom: { home: "Boshqaruv", create: "Yaratish", classes: "Sinflar", library: "Kutubxona", menu: "Menyu" },
    soon: "Tez kunda", create: "Yangi Test", signOut: "Chiqish", settings: "Sozlamalar", more: "Yana",
    theme: { label: "Mavzu", light: "Yorug'", system: "Tizim", dark: "Tun" },
    groups: { main: "Asosiy", exams: "Imtihonlar", resources: "Resurslar", profile: "Profil va sozlamalar" },
    aiLimit: { short: "AI kreditlar", title: "Oylik AI Balans", upgrade: "Kredit Olish", used: "ishlatildi", unlimited: "Cheksiz", renews: "Yangilanadi" },
    logoutConfirm: { title: "Tizimdan chiqish", desc: "Haqiqatan ham hisobingizdan chiqmoqchimisiz?", cancel: "Bekor qilish", confirm: "Chiqish" }
  },
  en: {
    brandSubtitle: "INSTRUCTOR PORTAL",
    menu: { overview: "Dashboard", library: "Library", classes: "Classes", onlineLibrary: "Online Books", analytics: "Analytics", notifications: "Notifications", subscription: "Subscription", profile: "Profile", ielts: "IELTS Module", milliy: "Milliy sertifikat", sat: "SAT", center: "My Center", games: "Games" },
    menuShort: { library: "Library", onlineLibrary: "Books", notifications: "Alerts", milliy: "Milliy", sat: "SAT" },
    bottom: { home: "Home", create: "Create", classes: "Classes", library: "Library", menu: "Menu" },
    soon: "Soon", create: "New Test", signOut: "Sign Out", settings: "Settings", more: "More",
    theme: { label: "Theme", light: "Light", system: "System", dark: "Dark" },
    groups: { main: "Main", exams: "Exams", resources: "Resources", profile: "Profile & settings" },
    aiLimit: { short: "AI credits", title: "Monthly AI Balance", upgrade: "Buy Credits", used: "used", unlimited: "Unlimited", renews: "Renews" },
    logoutConfirm: { title: "Sign Out", desc: "Are you sure you want to sign out of your account?", cancel: "Cancel", confirm: "Sign Out" }
  },
  ru: {
    brandSubtitle: "ПОРТАЛ УЧИТЕЛЯ",
    menu: { overview: "Обзор", library: "Библиотека", classes: "Классы", onlineLibrary: "Онлайн Книги", analytics: "Аналитика", notifications: "Уведомления", subscription: "Подписка", profile: "Профиль", ielts: "Модуль IELTS", milliy: "Milliy sertifikat", sat: "SAT", center: "Мой центр", games: "Игры" },
    menuShort: { library: "Библиотека", onlineLibrary: "Книги", notifications: "Инбокс", milliy: "Milliy", sat: "SAT" },
    bottom: { home: "Обзор", create: "Создать", classes: "Классы", library: "Книги", menu: "Меню" },
    soon: "Скоро", create: "Новый Тест", signOut: "Выйти", settings: "Настройки", more: "Ещё",
    theme: { label: "Тема", light: "День", system: "Система", dark: "Ночь" },
    groups: { main: "Главное", exams: "Экзамены", resources: "Ресурсы", profile: "Профиль и настройки" },
    aiLimit: { short: "ИИ кредиты", title: "Месячный баланс ИИ", upgrade: "Купить кредиты", used: "использовано", unlimited: "Безлимит", renews: "Обновится" },
    logoutConfirm: { title: "Выход", desc: "Вы уверены, что хотите выйти из аккаунта?", cancel: "Отмена", confirm: "Выйти" }
  }
};

const LANGUAGE_OPTIONS: { code: LangType; label: string }[] = [
  { code: 'uz', label: "O'zbek" },
  { code: 'en', label: "English" },
  { code: 'ru', label: "Русский" },
];

// Deep routes with their own bottom action bars — every mobile nav bar
// variant (dock/floating/iconic/topline) hides there.
const HIDE_BOTTOM_BAR = [
  /^\/teacher\/create\/.+/,
  /^\/teacher\/classes\/.+/,
  /^\/teacher\/print/,
  /^\/teacher\/ielts\/(reading|listening)\/(manual|view)/,
];

// Shared popover panel styling (M3 menu surface)
const PANEL = "bg-surface-container rounded-m3-lg shadow-elev-3 border border-outline-variant z-[60]";

// The switchboard decisions this shell renders (design.teacher.config.ts).
const SHELL = TEACHER_DESIGN.App_shell_navigation;
const MOBILE_NAV = TEACHER_DESIGN.Mobile_navigation;
const TOP_SHELL = SHELL === 'topbar' || SHELL === 'toolbar' || SHELL === 'pillbar';
const SIDE_SHELL = !TOP_SHELL;
// Every side shell collapses except rail (born collapsed, pinned).
const COLLAPSIBLE = SIDE_SHELL && SHELL !== 'rail';
// Mobile variants that render a bottom bar (vs the drawer-only original).
const BAR_MOBILE = MOBILE_NAV === 'dock' || MOBILE_NAV === 'floating' || MOBILE_NAV === 'iconic' || MOBILE_NAV === 'topline';

// Sidebar style recipes live in components/ui/shellStyles.ts so the
// /theme-check-teacher gallery previews exactly what this shell renders.
// (Top shells and rail/floating resolve to the 'sidebar' recipe.)
const STYLE = resolveSideStyle(SHELL);
/** The light-panel recipes (sidebar/classic/minimal) share this brand box —
 *  only they get the gradient brand chip and the tinted exam-group card. */
const SIDE_BRAND_DEFAULT = "bg-primary text-on-primary";
const LIGHT_PANEL = STYLE.brandBox === SIDE_BRAND_DEFAULT;
/** The Imtihonlar group (SAT / Milliy sertifikat / IELTS) wears its own
 *  violet exam accent (--t-exam*, docs/UI_KIT.md) so it reads as a section. */
const EXAM_HREFS = ['/teacher/milliy-sertifikat', '/teacher/sat', '/teacher/ielts'];
// The mobile drawer always paints a solid panel — transparent/glass variants
// fall back to the plain surface so the slide-out stays readable over content.
const DRAWER_BG = STYLE.bg === 'bg-transparent' ? 'bg-surface-container-lowest' : STYLE.bg;

// ============================================================================
// 3. SVG FLAGS (emoji flags render inconsistently across devices)
// ============================================================================
function FlagSvg({ code }: { code: LangType }) {
  if (code === 'uz') return (
    <svg viewBox="0 0 20 14" className="w-5 h-3.5 rounded-[3px] shrink-0" aria-hidden>
      <rect width="20" height="14" fill="#0099B5" /><rect y="4.9" width="20" height="4.2" fill="#fff" />
      <rect y="4.55" width="20" height="0.5" fill="#CE1126" /><rect y="8.95" width="20" height="0.5" fill="#CE1126" />
      <rect y="9.45" width="20" height="4.55" fill="#1EB53A" />
      <circle cx="3.4" cy="2.5" r="1.5" fill="#fff" /><circle cx="4" cy="2.3" r="1.35" fill="#0099B5" />
    </svg>
  );
  if (code === 'ru') return (
    <svg viewBox="0 0 20 14" className="w-5 h-3.5 rounded-[3px] shrink-0" aria-hidden>
      <rect width="20" height="4.67" fill="#fff" /><rect y="4.67" width="20" height="4.67" fill="#0039A6" /><rect y="9.33" width="20" height="4.67" fill="#D52B1E" />
    </svg>
  );
  return (
    <svg viewBox="0 0 20 14" className="w-5 h-3.5 rounded-[3px] shrink-0" aria-hidden>
      <rect width="20" height="14" fill="#012169" />
      <path d="M0 0l20 14M20 0L0 14" stroke="#fff" strokeWidth="2.6" />
      <path d="M0 0l20 14M20 0L0 14" stroke="#C8102E" strokeWidth="1.1" />
      <path d="M10 0v14M0 7h20" stroke="#fff" strokeWidth="4.4" />
      <path d="M10 0v14M0 7h20" stroke="#C8102E" strokeWidth="2.4" />
    </svg>
  );
}

// ============================================================================
// 4. LAYOUT ENTRY — theme provider wraps the shell so useTeacherTheme works
//    everywhere inside (including the mode toggle in the profile popover).
// ============================================================================
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <TeacherThemeProvider>
      <TeacherShell>{children}</TeacherShell>
    </TeacherThemeProvider>
  );
}

// ============================================================================
// 5. THE SHELL
// ============================================================================
function TeacherShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth() as any;
  const router = useRouter();
  const pathname = usePathname();
  const aiData = useMonthlyLimit();
  const { preference, setPreference, toggleEnabled } = useTeacherTheme();
  // Module-cached lookup (one getDoc per session) — gates the "Markazim" nav entry.
  const teacherCenter = useTeacherCenter();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(SHELL === 'rail');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  // A dead photoURL (expired Google avatar, deleted file) falls back to initials.
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  // 'pillbar' shell: which hover dropdown is open (group key, 'profile' or 'lang').
  const [openNavGroup, setOpenNavGroup] = useState<string | null>(null);
  const navCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 'pillbar' shell: the bar never moves — once the page is scrolled it gains
  // a soft shadow so it reads as floating above the content.
  const [navScrolled, setNavScrolled] = useState(false);

  const [lang, setLangState] = useState<LangType>('uz');
  const t = LAYOUT_TRANSLATIONS[lang as keyof typeof LAYOUT_TRANSLATIONS] || LAYOUT_TRANSLATIONS['uz'];

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

  const headerRef = useRef<HTMLDivElement>(null);
  const deskHeaderRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const showBottomBar = BAR_MOBILE && !HIDE_BOTTOM_BAR.some((r) => r.test(pathname));

  // Restore persisted rail state (collapsible shells only; 'rail' is pinned).
  useEffect(() => {
    if (!COLLAPSIBLE) return;
    try { setIsCollapsed(localStorage.getItem('edify-sb-rail') === '1'); } catch { /* private mode */ }
  }, []);
  const toggleCollapsed = () => {
    if (!COLLAPSIBLE) return;
    setIsCollapsed((v) => {
      try { localStorage.setItem('edify-sb-rail', v ? '0' : '1'); } catch { /* private mode */ }
      return !v;
    });
  };

  // Keyboard shortcut: [ toggles the rail
  useEffect(() => {
    if (!COLLAPSIBLE) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '[') return;
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (document.activeElement as HTMLElement)?.isContentEditable) return;
      toggleCollapsed();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Click outside listener for popovers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const inHeader = headerRef.current?.contains(event.target as Node);
      const inDeskHeader = deskHeaderRef.current?.contains(event.target as Node);
      const inSidebar = sidebarRef.current?.contains(event.target as Node);
      if (!inHeader && !inDeskHeader && !inSidebar) {
        setIsProfileMenuOpen(false);
        setIsAiMenuOpen(false);
        setIsMoreMenuOpen(false);
        setOpenNavGroup(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auth & Role Check
  useEffect(() => {
    async function checkRole() {
      if (!loading) {
        if (!user) router.push('/auth/login');
        else {
          const profile = await getUserProfile(user.uid);
          if (profile?.role === 'manager') router.push('/manager/dashboard');
          // Office staff (docs/OFFICE.md) get their own panel, not /dashboard.
          else if (profile?.role === 'director' || profile?.role === 'accountant') router.push('/office');
          else if (profile?.role !== 'teacher') router.push('/dashboard');
          else setIsAuthorized(true);
        }
      }
    }
    checkRole();
  }, [user, loading, router]);

  useEffect(() => { setMobileMenuOpen(false); setIsProfileMenuOpen(false); setIsAiMenuOpen(false); setIsMoreMenuOpen(false); setOpenNavGroup(null); setNavScrolled(false); }, [pathname]);

  // Handle tour step changes for mobile sidebar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleTourStepChange = (e: any) => {
      const stepId = e.detail;
      if (window.innerWidth < 768) {
        if (stepId && stepId.startsWith('tour-sidebar-')) setMobileMenuOpen(true);
        else setMobileMenuOpen(false);
      }
      // Pillbar shell: the tour's sidebar targets live inside hover dropdowns —
      // open the one holding the step's element (the tour re-queries it each frame).
      else if (SHELL === 'pillbar') {
        setOpenNavGroup(stepId === 'tour-sidebar-classes' ? 'main' : stepId === 'tour-sidebar-online-books' ? 'resources' : null);
      }
    };
    window.addEventListener('tour-step-change', handleTourStepChange);
    return () => window.removeEventListener('tour-step-change', handleTourStepChange);
  }, []);

  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface t-canvas">
        <Loader className="w-40" />
      </div>
    );
  }

  const navItems: { name: string; href: string; icon: typeof LayoutDashboard; isAI?: boolean; soon?: boolean; tourId?: string; short?: string }[] = [
    { name: t.menu.overview, href: '/teacher/dashboard', icon: LayoutDashboard },
    { name: t.create, href: '/teacher/create', icon: FilePlus, isAI: true },
    { name: t.menu.classes, href: '/teacher/classes', icon: Users, tourId: 'tour-sidebar-classes' },
    // Center teachers only — a solo teacher never sees this entry, and
    // /teacher/center itself renders a "not linked" state if reached directly.
    ...(teacherCenter.centerId
      ? [{ name: t.menu.center, href: '/teacher/center', icon: Building2 }]
      : []),
    { name: t.menu.ielts, href: '/teacher/ielts', icon: Globe, isAI: true },
    // Milliy sertifikat — the subject hub. Maths routes into the existing Rasch
    // paper builder (same 45-question DTM paper); see docs/RASCH_QUIZ.md.
    { name: t.menu.milliy, href: '/teacher/milliy-sertifikat', icon: BadgeCheck, short: t.menuShort.milliy },
    // SAT — adaptive tests (docs/SAT_QUIZ.md). Own nav entry: it is a
    // different exam programme from Milliy sertifikat, not a subject inside it.
    { name: t.menu.sat, href: '/teacher/sat', icon: GraduationCap, short: t.menuShort.sat },
    { name: t.menu.library, href: '/teacher/library', icon: FolderOpen, short: t.menuShort.library },
    { name: t.menu.onlineLibrary, href: '/teacher/online-books', icon: Library, tourId: 'tour-sidebar-online-books', short: t.menuShort.onlineLibrary },
    { name: t.menu.analytics, href: '/teacher/analytics', icon: Sparkles, isAI: true },
    // Classroom games (docs/GAMES.md). Kept late in the list: the topbar
    // shell inlines navItems.slice(0, 5), so an early insert would push an
    // existing destination behind "More".
    { name: t.menu.games, href: '/teacher/games', icon: Gamepad2 },
    { name: t.menu.notifications, href: '/teacher/notifications', icon: Bell, short: t.menuShort.notifications },
    // { name: t.menu.subscription, href: '/teacher/subscription', icon: CreditCard }, // deliberately hidden — reachable via AI-balance widget
    { name: t.settings, href: '/teacher/settings', icon: Settings },
  ];

  // Topbar shell: first 5 destinations inline, the rest behind "More".
  // Toolbar shell shows every destination on its own nav row instead.
  const topbarPrimary = navItems.slice(0, 5);
  const topbarOverflow = navItems.slice(5);

  // Side shells render the nav grouped, with "New test" promoted to a CTA
  // button and Settings left to the profile menu. Top shells keep the flat
  // navItems list above (their own overflow logic depends on its order).
  const navByHref = (href: string) => navItems.find((i) => i.href === href);
  const sideGroups = [
    { label: t.groups.main, items: ['/teacher/dashboard', '/teacher/classes', '/teacher/center', '/teacher/games', '/teacher/analytics', '/teacher/notifications'] },
    { label: t.groups.exams, items: EXAM_HREFS },
    { label: t.groups.resources, items: ['/teacher/library', '/teacher/online-books'] },
  ].map((g) => ({ label: g.label, items: g.items.map(navByHref).filter((i): i is (typeof navItems)[number] => !!i) }));

  const isActive = (href: string) => pathname === href || (href !== '/teacher/dashboard' && pathname.startsWith(href));

  // --- AI balance panel body (shared: desktop popover + mobile popover) ---
  const aiPanelBody = (
    <>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-bold text-on-surface text-[14px] flex items-center gap-1.5"><Zap size={14} className="text-warning fill-warning" /> {t.aiLimit.title}</h4>
          <p className="text-[10px] text-on-surface-variant font-medium mt-1">{t.aiLimit.renews}: {aiData.resetDate}</p>
        </div>
        <span className={cn("text-xl font-bold leading-none tracking-tight tabular-nums", aiData.isDanger ? "text-error" : "text-on-surface")}>
          {aiData.isUnlimited ? '∞' : aiData.remaining}
        </span>
      </div>
      {!aiData.isUnlimited && (
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between text-[10px] font-semibold text-on-surface-variant"><span>{t.aiLimit.used}</span> <span className="text-on-surface tabular-nums">{aiData.used} / {aiData.limit}</span></div>
          <ProgressBar value={aiData.usagePercentage} tone={aiData.isDanger ? 'error' : 'primary'} />
        </div>
      )}
      <Button size="sm" icon={<CreditCard />} className="w-full" onClick={() => { setIsAiMenuOpen(false); setMobileMenuOpen(false); router.push('/teacher/subscription'); }}>
        {t.aiLimit.upgrade}
      </Button>
    </>
  );

  // --- Theme (light/system/dark) segmented switch — per-device override ---
  const themeSwitch = toggleEnabled && (
    <div className="flex items-center bg-surface-container-high p-1 rounded-m3-sm gap-1 mb-2" role="group" aria-label={t.theme.label}>
      {([
        { v: 'light' as const, icon: Sun, label: t.theme.light },
        { v: 'system' as const, icon: Monitor, label: t.theme.system },
        { v: 'dark' as const, icon: Moon, label: t.theme.dark },
      ]).map(({ v, icon: Icon, label }) => (
        <button
          key={v}
          onClick={() => setPreference(v)}
          aria-pressed={preference === v}
          title={label}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-m3-xs text-[11px] font-bold transition-all",
            preference === v ? "bg-surface-container-lowest text-primary shadow-elev-1" : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          <Icon size={13} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );

  // --- Profile popover body (shared: sidebar + top bars) ---
  const profilePanelBody = (
    <>
      <div className="px-3 py-3 bg-surface-container-high rounded-m3-md mb-2">
        <p className="text-[13px] font-semibold text-on-surface truncate">{user?.displayName}</p>
        <p className="text-[10px] font-medium text-on-surface-variant truncate">{user?.email}</p>
      </div>
      {themeSwitch}
      {/* SVG-flag language switcher */}
      <div className="flex items-center bg-surface-container-high p-1 rounded-m3-sm gap-1 mb-2" role="group" aria-label="Til">
        {LANGUAGE_OPTIONS.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            aria-pressed={lang === l.code}
            title={l.label}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-m3-xs text-[11px] font-bold uppercase transition-all",
              lang === l.code ? "bg-surface-container-lowest text-primary shadow-elev-1" : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            <FlagSvg code={l.code} />
            {l.code}
          </button>
        ))}
      </div>
      <Link href="/teacher/profile" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-m3-sm text-[13px] font-medium text-on-surface-variant hover:text-on-surface hover:bg-state-hover transition-colors"><UserIcon size={16} /> {t.menu.profile}</Link>
      <Link href="/teacher/settings" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-m3-sm text-[13px] font-medium text-on-surface-variant hover:text-on-surface hover:bg-state-hover transition-colors"><Settings size={16} /> {t.settings}</Link>
      <div className="h-px bg-outline-variant my-1.5 mx-2"></div>
      <button onClick={() => { setIsProfileMenuOpen(false); setShowLogoutModal(true); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-m3-sm text-[13px] font-medium text-error hover:bg-error-container transition-colors"><LogOut size={16} /> {t.logoutConfirm.title}</button>
    </>
  );

  const avatar = (size: string, text: string) => (
    <span className={cn("rounded-m3-sm bg-primary text-on-primary flex items-center justify-center font-bold overflow-hidden shrink-0 shadow-elev-1", size, text)}>
      {user?.photoURL && !avatarFailed
        ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} className="w-full h-full object-cover" />
        : (user?.displayName?.[0] || user?.email?.[0] || '?').toUpperCase()}
    </span>
  );

  // --- The animated active indicator, per recipe ---
  // Positions use fixed offsets, never translate — framer's layout animation
  // owns `transform`, so translate-based centering breaks the glide.
  const navIndicator = (collapsed: boolean, isMobile: boolean, exam = false) => {
    const indicatorCls = exam ? (STYLE.indicator === 'pill' ? "bg-t-exam-container" : "bg-t-exam") : STYLE.indicatorCls;
    const layoutId = isMobile ? 'sb-pill-m' : 'sb-pill';
    if (STYLE.indicator === 'pill') {
      return (
        <motion.span
          layoutId={layoutId}
          transition={springTransition}
          className={cn(
            "absolute", indicatorCls,
            collapsed ? "top-1.5 inset-x-0 mx-auto w-[52px] h-[30px] rounded-full" : cn("inset-0", STYLE.itemShape),
          )}
        />
      );
    }
    if (STYLE.indicator === 'bar') {
      return (
        <motion.span
          layoutId={layoutId}
          transition={springTransition}
          className={cn(
            "absolute left-0 w-1 rounded-r-full", indicatorCls,
            collapsed ? "top-[16px] h-6" : "top-[10px] h-5",
          )}
        />
      );
    }
    // dot
    return (
      <motion.span
        layoutId={layoutId}
        transition={springTransition}
        className={cn(
          "absolute w-1.5 h-1.5 rounded-full", indicatorCls,
          collapsed ? "left-2 top-[25px]" : "left-1.5 top-[17px]",
        )}
      />
    );
  };

  // --- SIDEBAR CONTENT (desktop side shells + mobile slide-out drawer) ---
  const renderSidebarContent = (collapsed: boolean, isMobile: boolean = false) => (
    <div className={cn("flex flex-col w-full min-w-0 h-full relative", SHELL === 'floating' && !isMobile ? "bg-transparent" : isMobile ? DRAWER_BG : STYLE.bg)}>

      {/* Header: brand + rail toggle */}
      <div className={cn("flex items-center gap-2.5 px-3.5 pt-4 pb-2 shrink-0 min-h-[64px]", collapsed && "flex-col gap-2 px-0 justify-center")}>
        <div className="flex items-center gap-2.5 overflow-hidden cursor-pointer min-w-0" onClick={() => router.push('/teacher/dashboard')}>
          <div className={cn("w-9 h-9 rounded-m3-md flex items-center justify-center shrink-0 shadow-elev-1", LIGHT_PANEL ? "t-icon-chip" : STYLE.brandBox)}><BookOpen size={19} /></div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className={cn("font-t-display font-bold text-[15px] leading-none tracking-tight truncate", STYLE.brandTitle)}>Edify<span className={STYLE.brandAccent}>Teacher</span></h1>
              <p className={cn("text-[8.5px] font-semibold uppercase tracking-[0.14em] mt-1 truncate", STYLE.brandSub)}>{t.brandSubtitle}</p>
            </div>
          )}
        </div>
        {isMobile ? (
          <button onClick={() => setMobileMenuOpen(false)} aria-label="Yopish" className={cn("m3-interactive ml-auto p-2 rounded-full", STYLE.email)}>
            <X size={19} />
          </button>
        ) : COLLAPSIBLE ? (
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Yoyish  [" : "Yig'ish  ["}
            aria-label={collapsed ? "Yoyish" : "Yig'ish"}
            className={cn("m3-interactive p-2 rounded-full", STYLE.email, !collapsed && "ml-auto")}
          >
            <PanelLeft size={18} className={cn("transition-transform duration-300", collapsed && "rotate-180")} />
          </button>
        ) : null}
      </div>

      {/* Primary action: New test */}
      <div className={cn("shrink-0 pt-1 pb-2", collapsed ? "px-2" : "px-3")}>
        <Link
          href="/teacher/create"
          title={collapsed ? t.create : undefined}
          aria-label={t.create}
          onClick={() => isMobile && setMobileMenuOpen(false)}
          className={cn(
            "m3-interactive flex items-center justify-center gap-2 h-10 rounded-m3-md t-icon-chip text-[13.5px] font-semibold transition-shadow hover:shadow-[var(--t-glow)]",
            collapsed ? "w-11 mx-auto" : "w-full",
          )}
        >
          <Plus size={18} strokeWidth={2.4} className="shrink-0" />
          {!collapsed && <span className="truncate">{t.create}</span>}
        </Link>
      </div>

      {/* Navigation — grouped */}
      <nav className="flex-1 px-2.5 pb-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {sideGroups.map((group, gi) => {
          const exam = group.items.length > 0 && group.items.every((i) => EXAM_HREFS.includes(i.href));
          return (
          <div
            key={group.label}
            className={cn(
              gi > 0 && (collapsed ? "mt-2 pt-2 border-t border-outline-variant" : "mt-4"),
              exam && !collapsed && LIGHT_PANEL && "rounded-m3-lg bg-t-exam-soft border border-t-glass-border p-1.5 pt-2",
            )}
          >
            {!collapsed && (
              <p className={cn(
                "px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]",
                exam ? "flex items-center gap-1.5 px-1.5 text-t-exam" : STYLE.email,
              )}>
                {group.label}
                {exam && (
                  <span aria-hidden className="ml-auto h-1.5 w-1.5 rounded-full bg-t-exam" />
                )}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-tour={item.tourId}
                    title={collapsed ? item.name : undefined}
                    onClick={() => isMobile && setMobileMenuOpen(false)}
                    className={cn(
                      "group relative flex items-center transition-colors",
                      collapsed
                        ? "flex-col justify-center gap-[3px] h-[56px] rounded-m3-md px-1"
                        : cn("gap-3 h-10 px-3", STYLE.itemShape, STYLE.indicator === 'bar' && "pl-4"),
                      active ? cn(STYLE.active, STYLE.activeRowBg) : STYLE.idle,
                      exam && LIGHT_PANEL && (active ? "text-t-on-exam-container" : "hover:bg-t-exam-container hover:text-t-on-exam-container"),
                    )}
                  >
                    {active && navIndicator(collapsed, isMobile, exam && LIGHT_PANEL)}
                    <item.icon size={collapsed ? 20 : 18} strokeWidth={active ? 2.3 : 1.9} className={cn("shrink-0 relative z-10", active ? (exam && LIGHT_PANEL ? "text-t-exam" : STYLE.iconActive) : exam && LIGHT_PANEL && "text-t-exam")} />
                    <span className={cn(
                      "relative z-10 truncate",
                      collapsed ? "text-[9.5px] font-semibold max-w-full px-0.5" : "flex-1 text-[13.5px] font-medium",
                      active && "font-semibold",
                    )}>
                      {collapsed ? (item.short || item.name) : item.name}
                    </span>
                    {item.isAI && !collapsed && (
                      <Sparkles size={13} aria-label="AI" className={cn("relative z-10 shrink-0 opacity-70", exam && LIGHT_PANEL ? "text-t-exam" : "text-primary")} />
                    )}
                    {item.soon && !collapsed && (
                      <span className="relative z-10 shrink-0 rounded-full bg-surface-container-high px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-on-surface-variant">{t.soon}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      {/* Footer: AI meter + profile row (or the classic user card + logout) */}
      <div className={cn("shrink-0 px-2.5 pb-3 pt-2 border-t relative", STYLE.footerBorder)}>

        {/* AI popover */}
        <AnimatePresence>
          {isAiMenuOpen && !isMobile && (
            <motion.div
              {...popIn}
              className={cn("absolute w-64 p-4", PANEL, collapsed ? "left-full ml-2 bottom-2" : "bottom-full mb-2 left-2.5 origin-bottom-left")}
            >
              {aiPanelBody}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile popover */}
        <AnimatePresence>
          {isProfileMenuOpen && (
            <motion.div
              {...popIn}
              className={cn("absolute w-60 p-2", PANEL, collapsed && !isMobile ? "left-full ml-2 bottom-2" : "bottom-full mb-2 left-2.5 origin-bottom-left")}
            >
              {profilePanelBody}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Slim AI meter */}
        <button
          onClick={() => {
            if (isMobile) { setMobileMenuOpen(false); router.push('/teacher/subscription'); return; }
            setIsAiMenuOpen(!isAiMenuOpen); setIsProfileMenuOpen(false);
          }}
          title={t.aiLimit.title}
          className={cn(
            "m3-interactive w-full flex items-center rounded-m3-md transition-colors",
            collapsed ? "flex-col gap-1.5 px-1.5 py-2" : "px-3 py-2.5",
            aiData.isDanger ? "bg-error-container" : "bg-surface-container-low hover:bg-surface-container",
          )}
        >
          {collapsed ? (
            <>
              <Zap size={15} className={cn("shrink-0", aiData.isDanger ? "text-error fill-error" : "text-warning")} />
              <span className={cn("w-full h-[5px] rounded-full overflow-hidden", aiData.isDanger ? "bg-[color-mix(in_oklab,var(--m3-on-error-container)_15%,transparent)]" : "bg-surface-container-highest")}>
                <i className={cn("block h-full rounded-full", aiData.isDanger ? "bg-error" : "bg-primary")} style={{ width: `${aiData.isUnlimited ? 100 : Math.min(100, aiData.usagePercentage)}%` }} />
              </span>
              <b className={cn("text-[10.5px] tabular-nums shrink-0", aiData.isDanger ? "text-on-error-container" : "text-on-surface-variant")}>
                {aiData.isUnlimited ? '∞' : `${aiData.used}/${aiData.limit}`}
              </b>
            </>
          ) : (
            <span className="flex-1 min-w-0 text-left">
              <span className="flex items-center gap-1.5">
                <Zap size={14} className={cn("shrink-0", aiData.isDanger ? "text-error fill-error" : "text-warning fill-warning")} />
                <span className={cn("flex-1 truncate text-[12px] font-semibold", aiData.isDanger ? "text-on-error-container" : "text-on-surface")}>{t.aiLimit.short}</span>
                <b className={cn("text-[11px] font-semibold tabular-nums shrink-0", aiData.isDanger ? "text-on-error-container" : "text-on-surface-variant")}>
                  {aiData.isUnlimited ? '∞' : `${aiData.used} / ${aiData.limit}`}
                </b>
              </span>
              <span className={cn("block mt-2 h-[5px] rounded-full overflow-hidden", aiData.isDanger ? "bg-[color-mix(in_oklab,var(--m3-on-error-container)_15%,transparent)]" : "bg-surface-container-highest")}>
                <i className={cn("block h-full rounded-full", aiData.isDanger ? "bg-error" : "bg-primary")} style={{ width: `${aiData.isUnlimited ? 100 : Math.min(100, aiData.usagePercentage)}%` }} />
              </span>
            </span>
          )}
        </button>

        {STYLE.classicFooter && !collapsed ? (
          /* Classic footer: user card opens the popover, logout is its own
             always-visible button on the right. */
          <div className="flex items-center gap-1.5 mt-1.5">
            <button
              onClick={() => { setIsProfileMenuOpen(!isProfileMenuOpen); setIsAiMenuOpen(false); }}
              title={user?.displayName || t.menu.profile}
              className="m3-interactive flex-1 flex items-center gap-2.5 p-1.5 rounded-m3-md text-left transition-colors hover:bg-state-hover min-w-0"
            >
              {avatar("w-10 h-10", "text-[13px]")}
              <span className="flex-1 min-w-0">
                <b className={cn("block text-[12.5px] font-bold truncate", STYLE.name)}>{user?.displayName?.split(' ')[0]}</b>
                <small className={cn("block text-[10px] truncate", STYLE.email)}>{user?.email}</small>
              </span>
            </button>
            <button
              onClick={() => { setIsProfileMenuOpen(false); if (isMobile) setMobileMenuOpen(false); setShowLogoutModal(true); }}
              title={t.logoutConfirm.title}
              aria-label={t.logoutConfirm.title}
              className="m3-interactive w-9 h-9 shrink-0 rounded-m3-md flex items-center justify-center text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
            >
              <LogOut size={17} strokeWidth={2.25} />
            </button>
          </div>
        ) : (
          /* Profile row */
          <button
            onClick={() => { setIsProfileMenuOpen(!isProfileMenuOpen); setIsAiMenuOpen(false); }}
            title={user?.displayName || t.menu.profile}
            className={cn("m3-interactive w-full flex items-center rounded-m3-md mt-1.5 transition-colors hover:bg-state-hover", collapsed ? "justify-center p-1.5" : "gap-2.5 p-1.5 text-left")}
          >
            {avatar("w-9 h-9", "text-[13px]")}
            {!collapsed && (
              <>
                <span className="flex-1 min-w-0">
                  <b className={cn("block text-[12.5px] font-semibold truncate", STYLE.name)}>{user?.displayName?.split(' ')[0]}</b>
                  <small className={cn("block text-[10px] truncate", STYLE.email)}>{user?.email}</small>
                </span>
                <MoreVertical size={15} className={cn("shrink-0", STYLE.email)} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  // --- Top-bar nav pill (shared by 'topbar' and 'toolbar') ---
  const topbarLink = (item: (typeof navItems)[number]) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        data-tour={item.tourId}
        className={cn(
          "relative flex items-center gap-2 h-[38px] px-3.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors",
          active ? "text-on-secondary-container" : "text-on-surface-variant hover:text-on-surface hover:bg-state-hover",
        )}
      >
        {active && (
          <motion.span layoutId="tb-pill" transition={springTransition} className="absolute inset-0 bg-secondary-container rounded-full" />
        )}
        <item.icon size={16} strokeWidth={active ? 2.4 : 2} className={cn("relative z-10", active && "text-primary")} />
        <span className={cn("relative z-10", active && "font-bold")}>{item.name}</span>
      </Link>
    );
  };

  const brandBlock = (
    <div className="flex items-center gap-2.5 cursor-pointer min-w-0 shrink-0" onClick={() => router.push('/teacher/dashboard')}>
      <div className="w-9 h-9 bg-primary rounded-m3-md flex items-center justify-center text-on-primary shrink-0 shadow-elev-1"><BookOpen size={19} /></div>
      <b className="font-t-display text-[15px] text-on-surface tracking-tight truncate hidden lg:block">Edify<span className="text-primary">Teacher</span></b>
    </div>
  );

  // Right cluster of both top shells: AI chip · bell · avatar
  const topbarRightCluster = (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="relative">
        <button
          onClick={() => { setIsAiMenuOpen(!isAiMenuOpen); setIsProfileMenuOpen(false); setIsMoreMenuOpen(false); }}
          className={cn(
            "m3-interactive flex items-center gap-1.5 px-2.5 h-9 rounded-full transition-colors",
            aiData.isDanger ? "bg-error-container text-on-error-container" : "bg-surface-container-low text-on-surface",
          )}
        >
          <Zap size={13} className={aiData.isDanger ? "fill-current" : "text-warning"} />
          <span className="text-[11.5px] font-bold tabular-nums">{aiData.isUnlimited ? '∞' : aiData.remaining}</span>
        </button>
        <AnimatePresence>
          {isAiMenuOpen && (
            <motion.div {...popIn} className={cn("absolute top-full right-0 mt-2 w-[260px] p-4 origin-top-right", PANEL)}>
              {aiPanelBody}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="m3-interactive flex items-center justify-center h-9 w-9 text-on-surface-variant rounded-full shrink-0">
        <NotificationBell />
      </div>

      <div className="relative">
        <button onClick={() => { setIsProfileMenuOpen(!isProfileMenuOpen); setIsAiMenuOpen(false); setIsMoreMenuOpen(false); }} className="transition-transform active:scale-95">
          {avatar("w-9 h-9", "text-[12px]")}
        </button>
        <AnimatePresence>
          {isProfileMenuOpen && (
            <motion.div {...popIn} className={cn("absolute top-full right-0 mt-2 w-60 p-2 origin-top-right", PANEL)}>
              {profilePanelBody}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  // --- DESKTOP TOP BAR (SHELL === 'topbar'): single row, 5 + "More" ---
  const desktopTopbar = SHELL === 'topbar' && (
    <header ref={deskHeaderRef} className="hidden md:flex bg-t-bar-blur backdrop-blur-xl border-b border-outline-variant sticky top-0 z-40 px-4 h-[60px] items-center gap-4 shrink-0">
      {brandBlock}

      {/* Horizontal nav */}
      <nav className="flex-1 flex items-center gap-1 min-w-0 overflow-x-auto custom-scrollbar">
        {topbarPrimary.map(topbarLink)}

        {/* More (overflow) */}
        <div className="relative shrink-0">
          <button
            onClick={() => { setIsMoreMenuOpen(!isMoreMenuOpen); setIsProfileMenuOpen(false); setIsAiMenuOpen(false); }}
            aria-expanded={isMoreMenuOpen}
            className={cn(
              "flex items-center gap-2 h-[38px] px-3.5 rounded-full text-[13px] font-medium transition-colors",
              topbarOverflow.some((i) => isActive(i.href)) ? "bg-secondary-container text-on-secondary-container font-bold" : "text-on-surface-variant hover:text-on-surface hover:bg-state-hover",
            )}
          >
            <MoreHorizontal size={16} />
            {t.more}
          </button>
          <AnimatePresence>
            {isMoreMenuOpen && (
              <motion.div {...popIn} className={cn("absolute top-full left-0 mt-2 w-56 p-2 origin-top-left", PANEL)}>
                {topbarOverflow.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-tour={item.tourId}
                      onClick={() => setIsMoreMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5 rounded-m3-sm text-[13px] font-medium transition-colors",
                        active ? "bg-secondary-container text-on-secondary-container font-bold" : "text-on-surface-variant hover:text-on-surface hover:bg-state-hover",
                      )}
                    >
                      <item.icon size={16} /> {item.name}
                      {item.isAI && <span className="ml-auto bg-primary-container text-on-primary-container text-[8.5px] px-1.5 py-[2px] rounded-m3-xs uppercase font-bold tracking-wider">AI</span>}
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {topbarRightCluster}
    </header>
  );

  // --- DESKTOP TWO-DECK TOOLBAR (SHELL === 'toolbar'): brand row + full nav row ---
  const desktopToolbar = SHELL === 'toolbar' && (
    <header ref={deskHeaderRef} className="hidden md:block bg-t-bar-blur backdrop-blur-xl border-b border-outline-variant sticky top-0 z-40 shrink-0">
      <div className="px-4 h-[54px] flex items-center justify-between gap-4">
        {brandBlock}
        {topbarRightCluster}
      </div>
      <nav className="px-3 pb-2 flex items-center gap-1 overflow-x-auto custom-scrollbar">
        {navItems.map(topbarLink)}
      </nav>
    </header>
  );


  // --- DESKTOP PILL BAR (SHELL === 'pillbar') ---
  // Sky-washed header: brand · a glass pill of grouped hover dropdowns
  // (Boshqaruv · Asosiy · Imtihonlar · Resurslar · Profil va sozlamalar) ·
  // "Yangi Test" in the pill; language pill, bell and the profile pill on the
  // right (the light/dark wave switch replaced the bell). Only the pills are fixed (no band) — the page scrolls behind them;
  // once scrolled they turn more opaque. Dropdowns open on hover
  // (with a short close delay so the pointer can travel into the panel) and
  // on click/Enter for touch + keyboard; Escape or an outside click closes.
  const openNav = (key: string) => {
    if (navCloseTimer.current) clearTimeout(navCloseTimer.current);
    setOpenNavGroup(key);
    setIsProfileMenuOpen(false); setIsAiMenuOpen(false);
  };
  const closeNavSoon = () => {
    if (navCloseTimer.current) clearTimeout(navCloseTimer.current);
    navCloseTimer.current = setTimeout(() => setOpenNavGroup(null), 160);
  };
  const toggleNav = (key: string) => {
    if (navCloseTimer.current) clearTimeout(navCloseTimer.current);
    setOpenNavGroup((cur) => (cur === key ? null : key));
  };

  const pillGroups = [
    { key: 'main', label: t.groups.main, items: ['/teacher/classes', '/teacher/center', '/teacher/games', '/teacher/analytics', '/teacher/notifications'], exam: false, wide: true },
    { key: 'exams', label: t.groups.exams, items: EXAM_HREFS, exam: true, wide: false },
    { key: 'resources', label: t.groups.resources, items: ['/teacher/library', '/teacher/online-books'], exam: false, wide: false },
  ].map((g) => ({ ...g, items: g.items.map(navByHref).filter((i): i is (typeof navItems)[number] => !!i) }));

  const PROFILE_HREFS = ['/teacher/profile', '/teacher/settings', '/teacher/subscription'];

  /** Trigger button inside the glass pill. Active = the current page lives
   *  in this group → gradient pill (gliding via layoutId). */
  const pillTrigger = (key: string, label: React.ReactNode, active: boolean, opts?: { chevron?: boolean; className?: string }) => {
    const open = openNavGroup === key;
    return (
      <button
        type="button"
        onClick={() => toggleNav(key)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "relative flex items-center gap-1.5 h-10 px-4 rounded-full text-[13.5px] whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary",
          active ? "t-on-chip font-semibold" : open ? "text-on-surface font-medium" : "text-on-surface-variant hover:text-on-surface font-medium",
          opts?.className,
        )}
      >
        {active && <motion.span layoutId="pb-active" transition={springTransition} className="absolute inset-0 rounded-full t-icon-chip" />}
        {!active && open && <motion.span layoutId="pb-hover" transition={springTransition} className="absolute inset-0 rounded-full bg-t-glass" />}
        <span className="relative z-10 flex items-center gap-1.5">{label}</span>
        {opts?.chevron !== false && (
          <ChevronDown size={14} strokeWidth={2.4} className={cn("relative z-10 transition-transform duration-200", open && "rotate-180")} />
        )}
      </button>
    );
  };

  /** Hover zone: trigger + its dropdown. The panel wrapper's top padding
   *  bridges the gap so moving the pointer down never closes it. */
  const pillDropdown = (key: string, trigger: React.ReactNode, panel: React.ReactNode, width: string, align: 'center' | 'right' = 'center') => (
    <div key={key} className="relative" onMouseEnter={() => openNav(key)} onMouseLeave={closeNavSoon}>
      {trigger}
      <div className={cn("absolute top-full pt-3 z-[60]", align === 'center' ? "left-1/2 -translate-x-1/2" : "right-0")}>
        <AnimatePresence>
          {openNavGroup === key && (
            <motion.div {...popIn} role="menu" className={cn("t-mega rounded-m3-xl p-2", align === 'center' ? "origin-top" : "origin-top-right", width)}>
              {panel}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const megaItem = (item: (typeof navItems)[number], exam: boolean) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        role="menuitem"
        data-tour={item.tourId}
        onClick={() => setOpenNavGroup(null)}
        className={cn(
          "group/item flex items-center gap-3 rounded-m3-lg px-2.5 py-2 transition-colors",
          active
            ? exam ? "bg-t-exam-container text-t-on-exam-container" : "bg-t-primary-tint text-primary"
            : "text-on-surface hover:bg-state-hover",
        )}
      >
        <span className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-m3-md transition-transform duration-200 group-hover/item:scale-105",
          exam ? "bg-t-exam-container text-t-exam" : "t-icon-chip-soft",
        )}>
          <item.icon size={17} strokeWidth={2.2} />
        </span>
        <span className="flex-1 min-w-0 truncate text-[13px] font-semibold">{item.name}</span>
        {item.isAI && <Sparkles size={13} aria-label="AI" className={cn("shrink-0 opacity-70", exam ? "text-t-exam" : "text-primary")} />}
        <ArrowRight size={14} aria-hidden className="shrink-0 opacity-0 -translate-x-1 transition-all duration-200 group-hover/item:opacity-60 group-hover/item:translate-x-0" />
      </Link>
    );
  };

  const megaHeader = (label: string, exam: boolean) => (
    <p className={cn("flex items-center gap-2 px-2.5 pt-1.5 pb-2 text-[10.5px] font-bold uppercase tracking-[0.1em]", exam ? "text-t-exam" : "text-on-surface-variant")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", exam ? "bg-t-exam" : "bg-primary")} />
      {label}
    </p>
  );

  const profileActive = PROFILE_HREFS.some((h) => pathname.startsWith(h));
  const profileLinks = [
    { name: t.menu.profile, href: '/teacher/profile', icon: UserIcon },
    { name: t.settings, href: '/teacher/settings', icon: Settings },
    { name: t.menu.subscription, href: '/teacher/subscription', icon: CreditCard },
  ];

  const profileMega = (
    <div>
      <div className="flex items-center gap-3 rounded-m3-lg bg-t-primary-tint p-3 mb-2">
        {avatar("w-10 h-10", "text-[13px]")}
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-on-surface truncate">{user?.displayName}</p>
          <p className="text-[10.5px] font-medium text-on-surface-variant truncate">{user?.email}</p>
        </div>
      </div>
      <div className="rounded-m3-lg bg-surface-container-low border border-t-glass-border p-3.5 mb-2">{aiPanelBody}</div>
      {themeSwitch}
      <div className="space-y-0.5">
        {profileLinks.map((l) => megaItem({ ...l } as (typeof navItems)[number], false))}
      </div>
      <div className="h-px bg-outline-variant my-1.5 mx-2" />
      <button
        type="button"
        onClick={() => { setOpenNavGroup(null); setShowLogoutModal(true); }}
        className="w-full flex items-center gap-3 rounded-m3-lg px-2.5 py-2 text-[13px] font-semibold text-error hover:bg-error-container transition-colors"
      >
        <span className="grid h-9 w-9 place-items-center rounded-m3-md bg-error-container"><LogOut size={16} /></span>
        {t.logoutConfirm.title}
      </button>
    </div>
  );

  const currentLang = LANGUAGE_OPTIONS.find((l) => l.code === lang) || LANGUAGE_OPTIONS[0];

  const desktopPillbar = SHELL === 'pillbar' && (
    <header
      ref={deskHeaderRef}
      onKeyDown={(e) => { if (e.key === 'Escape') setOpenNavGroup(null); }}
      className={cn(
        "hidden md:grid grid-cols-[1fr_auto_1fr] items-center gap-4 absolute top-0 inset-x-0 z-40 h-[76px] px-4 lg:px-8",
        // No band: only the pills float; the page scrolls (visibly) behind
        // them. The empty strip lets clicks fall through to the page.
        "pointer-events-none [&>*]:pointer-events-auto",
        navScrolled && "t-bar-scrolled",
      )}
    >
      {/* Brand */}
      <Link href="/teacher/dashboard" aria-label="Edify Teacher" className="t-glass-pill flex items-center h-11 px-5 min-w-0 justify-self-start rounded-full">
        {/* Brand mark = the Edify logo alone (public/brand, cropped from the
            "Edify Math" artwork without "Math"). */}
        <Image src="/brand/edify-logo.webp" alt="Edify" width={307} height={120} priority unoptimized className="t-brand-logo h-[30px] w-auto" />
      </Link>

      {/* Centre: the glass pill */}
      <nav className="t-glass-pill flex items-center gap-0.5 rounded-full p-1.5 justify-self-center">
        <Link
          href="/teacher/dashboard"
          className={cn(
            "relative flex items-center h-10 px-4 lg:px-5 rounded-full text-[13.5px] whitespace-nowrap transition-colors",
            isActive('/teacher/dashboard') ? "t-on-chip font-semibold" : "text-on-surface-variant hover:text-on-surface font-medium",
          )}
        >
          {isActive('/teacher/dashboard') && <motion.span layoutId="pb-active" transition={springTransition} className="absolute inset-0 rounded-full t-icon-chip" />}
          <span className="relative z-10">{t.menu.overview}</span>
        </Link>

        {pillGroups.map((g) => pillDropdown(
          g.key,
          pillTrigger(g.key, g.exam
            ? <><span className="h-1.5 w-1.5 rounded-full bg-t-exam" aria-hidden />{g.label}</>
            : g.label, g.items.some((i) => isActive(i.href))),
          <>
            {megaHeader(g.label, g.exam)}
            <div className={cn(g.wide ? "grid grid-cols-2 gap-0.5" : "space-y-0.5")}>
              {g.items.map((i) => megaItem(i, g.exam))}
            </div>
          </>,
          g.wide ? "w-[460px]" : "w-[270px]",
        ))}

        <Link
          href="/teacher/create"
          className={cn(
            "group relative flex items-center gap-2 h-10 pl-2 pr-4 rounded-full text-[13.5px] whitespace-nowrap transition-colors",
            isActive('/teacher/create') ? "t-on-chip font-semibold" : "text-on-surface-variant hover:text-on-surface font-medium",
          )}
        >
          {isActive('/teacher/create') && <motion.span layoutId="pb-active" transition={springTransition} className="absolute inset-0 rounded-full t-icon-chip" />}
          <span className={cn(
            "relative z-10 grid h-7 w-7 place-items-center rounded-full transition-transform duration-300 group-hover:rotate-90",
            isActive('/teacher/create') ? "bg-[color-mix(in_oklab,currentColor_18%,transparent)]" : "t-icon-chip",
          )}>
            <Plus size={15} strokeWidth={2.8} />
          </span>
          <span className="relative z-10">{t.create}</span>
        </Link>
      </nav>

      {/* Right cluster: language · light/dark · profile */}
      <div className="flex items-center gap-2 justify-self-end">
        {pillDropdown(
          'lang',
          <button
            type="button"
            onClick={() => toggleNav('lang')}
            aria-expanded={openNavGroup === 'lang'}
            aria-label="Til"
            className="t-glass-pill flex items-center gap-2 h-11 pl-2 pr-3 rounded-full text-[13px] font-bold uppercase text-on-surface"
          >
            <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full ring-1 ring-outline-variant [&>svg]:h-7 [&>svg]:w-10 [&>svg]:max-w-none [&>svg]:rounded-none"><FlagSvg code={currentLang.code} /></span>
            {currentLang.code}
            <ChevronDown size={14} strokeWidth={2.4} className={cn("transition-transform duration-200", openNavGroup === 'lang' && "rotate-180")} />
          </button>,
          <div className="space-y-0.5">
            {LANGUAGE_OPTIONS.map((l) => (
              <button
                key={l.code}
                type="button"
                role="menuitemradio"
                aria-checked={lang === l.code}
                onClick={() => { setLang(l.code); setOpenNavGroup(null); }}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-m3-lg px-2.5 py-2 text-[13px] font-semibold transition-colors",
                  lang === l.code ? "bg-t-primary-tint text-primary" : "text-on-surface hover:bg-state-hover",
                )}
              >
                <FlagSvg code={l.code} /> {l.label}
                <span className="ml-auto text-[10.5px] font-bold uppercase opacity-60">{l.code}</span>
              </button>
            ))}
          </div>,
          "w-[200px]",
          'right',
        )}

        {/* Light/dark switch with the circular wave reveal (replaces the bell
            here; notifications stay under Asosiy → Bildirishnomalar). */}
        <ThemeWaveToggle
          className="t-glass-pill h-11 w-11 text-on-surface"
          labels={{ toLight: t.theme.light, toDark: t.theme.dark }}
        />

        {pillDropdown(
          'profile',
          <button
            type="button"
            onClick={() => toggleNav('profile')}
            aria-expanded={openNavGroup === 'profile'}
            aria-haspopup="menu"
            aria-label={t.groups.profile}
            className={cn(
              "t-glass-pill flex items-center gap-2.5 h-11 pl-2 lg:pl-4 pr-1.5 rounded-full text-[13.5px] font-semibold text-on-surface",
              (profileActive || openNavGroup === 'profile') && "ring-2 ring-primary",
            )}
          >
            <span className="hidden lg:inline max-w-[120px] truncate">{user?.displayName?.split(' ')[0] || t.menu.profile}</span>
            <ChevronDown size={14} strokeWidth={2.4} className={cn("hidden lg:block -ml-1 opacity-70 transition-transform duration-200", openNavGroup === 'profile' && "rotate-180")} />
            {avatar("w-8 h-8 !rounded-full", "text-[12px]")}
          </button>,
          profileMega,
          "w-[320px]",
          'right',
        )}
      </div>
    </header>
  );

  // --- MOBILE BOTTOM NAV (dock / floating / iconic / topline) ---
  const mobileNavItems = [
    { label: t.bottom.home, href: '/teacher/dashboard', icon: LayoutDashboard },
    { label: t.bottom.create, href: '/teacher/create', icon: FilePlus },
    { label: t.bottom.classes, href: '/teacher/classes', icon: Users },
    { label: t.bottom.library, href: '/teacher/library', icon: FolderOpen },
  ];

  const mobileNavLink = (item: { label: string; href: string; icon: typeof LayoutDashboard }) => {
    const active = isActive(item.href);
    if (MOBILE_NAV === 'iconic') {
      return (
        <Link key={item.href} href={item.href} aria-label={item.label} className={cn("flex-1 flex items-center justify-center h-[52px] relative", active ? "text-primary" : "text-on-surface-variant")}>
          {active && (
            <motion.span layoutId="bn-pill" transition={springTransition} className="absolute inset-y-2 inset-x-0 mx-auto w-[56px] bg-secondary-container rounded-full" />
          )}
          <item.icon size={22} strokeWidth={active ? 2.4 : 2} className="relative z-10" />
        </Link>
      );
    }
    if (MOBILE_NAV === 'topline') {
      return (
        <Link key={item.href} href={item.href} className={cn("flex-1 flex flex-col items-center gap-[3px] pt-2 pb-1 relative", active ? "text-primary" : "text-on-surface-variant")}>
          {active && (
            <motion.span layoutId="bn-pill" transition={springTransition} className="absolute top-0 inset-x-0 mx-auto w-9 h-[3px] rounded-b-full bg-primary" />
          )}
          <item.icon size={21} strokeWidth={active ? 2.4 : 2} className="relative z-10" />
          <span className={cn("relative z-10 text-[9.5px] font-semibold", active && "font-bold")}>{item.label}</span>
        </Link>
      );
    }
    // dock + floating
    return (
      <Link key={item.href} href={item.href} className={cn("flex-1 flex flex-col items-center gap-[3px] py-1 relative", active ? "text-primary" : "text-on-surface-variant")}>
        {active && (
          <motion.span layoutId="bn-pill" transition={springTransition} className="absolute -top-0.5 inset-x-0 mx-auto w-[52px] h-[28px] t-icon-chip rounded-full" />
        )}
        <item.icon size={21} strokeWidth={active ? 2.4 : 2} className={cn("relative z-10", active && "t-on-chip")} />
        <span className={cn("relative z-10 text-[9.5px] font-semibold", active && "font-bold")}>{item.label}</span>
      </Link>
    );
  };

  const menuButton = MOBILE_NAV === 'iconic' ? (
    <button onClick={() => setMobileMenuOpen(true)} aria-label={t.bottom.menu} className="flex-1 flex items-center justify-center h-[52px] text-on-surface-variant">
      <Menu size={22} strokeWidth={2} />
    </button>
  ) : (
    <button onClick={() => setMobileMenuOpen(true)} className={cn("flex-1 flex flex-col items-center gap-[3px] text-on-surface-variant", MOBILE_NAV === 'topline' ? "pt-2 pb-1" : "py-1")}>
      <Menu size={21} strokeWidth={2} />
      <span className="text-[9.5px] font-semibold">{t.bottom.menu}</span>
    </button>
  );

  // Bottom padding the scroll area reserves for each bar height.
  const mainBarPad =
    MOBILE_NAV === 'dock' ? "pb-[calc(68px+env(safe-area-inset-bottom))] md:pb-0"
    : MOBILE_NAV === 'floating' ? "pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-0"
    : MOBILE_NAV === 'iconic' ? "pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0"
    : MOBILE_NAV === 'topline' ? "pb-[calc(70px+env(safe-area-inset-bottom))] md:pb-0"
    : "";

  return (
    <TeacherLanguageContext.Provider value={{ lang, setLang }}>
      <div className={cn(
        "h-[100dvh] bg-surface font-t-body selection:bg-primary-container selection:text-on-primary-container overflow-hidden relative",
        SIDE_SHELL ? "flex" : "flex flex-col",
      )}>

        {/* --- LOGOUT CONFIRM --- */}
        <ConfirmDialog
          open={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={() => { signOut(auth); setShowLogoutModal(false); }}
          title={t.logoutConfirm.title}
          description={t.logoutConfirm.desc}
          confirmText={t.logoutConfirm.confirm}
          cancelText={t.logoutConfirm.cancel}
          danger
        />

        {/* --- MOBILE SLIDE-OUT DRAWER (full nav list, styled like the chosen sidebar) --- */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
              <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", bounce: 0, duration: MOTION_ON ? 0.4 : 0 }} className={cn("relative w-[280px] h-full shadow-elev-3", DRAWER_BG)}>
                {renderSidebarContent(false, true)}
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* --- DESKTOP SIDE SHELLS: recipe-styled aside · rail (pinned) · floating (glass card) --- */}
        {SIDE_SHELL && SHELL !== 'floating' && (
          <aside
            ref={sidebarRef}
            className={cn(
              "hidden md:flex shrink-0 h-[100dvh] transition-[width] duration-t-med ease-t-std relative z-[50]",
              STYLE.bg, STYLE.asideBorder,
              isCollapsed ? "w-[84px]" : "w-[264px]",
            )}
          >
            {renderSidebarContent(isCollapsed, false)}
          </aside>
        )}
        {SHELL === 'floating' && (
          <aside
            ref={sidebarRef}
            className={cn(
              "hidden md:flex shrink-0 h-[100dvh] p-3 pr-0 relative z-[50] transition-[width] duration-t-med ease-t-std",
              isCollapsed ? "w-[96px]" : "w-[276px]",
            )}
          >
            <div className="flex-1 rounded-m3-xl bg-t-glass backdrop-blur-xl border border-t-glass-border shadow-elev-2 overflow-hidden">
              {renderSidebarContent(isCollapsed, false)}
            </div>
          </aside>
        )}

        {/* --- MAIN COLUMN --- */}
        {/* Every shell pins the root + this column to the viewport so <main> is
            the only scroller — the header (side or top) stays put while content
            moves. ⚠️ `min-h-0` is load-bearing: in the top shells the root is a
            flex COLUMN, where flex-1 overrides the height and the default
            min-height:auto let this column grow to the page's full length, so
            the window scrolled and carried the bar away. */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 h-[100dvh] relative z-10">

          {desktopTopbar}
          {desktopToolbar}
          {desktopPillbar}

          {/* MOBILE TOP BAR — Edify style: floating glass pills (logo · AI chip ·
              light/dark switch · avatar) over <main>, which scrolls behind it;
              pills turn more opaque once scrolled (.t-bar-scrolled). */}
          <header
            ref={headerRef}
            className={cn(
              "md:hidden absolute top-0 inset-x-0 z-40 h-[60px] px-3 flex justify-between items-center pointer-events-none [&>*]:pointer-events-auto",
              navScrolled && "t-bar-scrolled",
            )}
          >

            <div className="flex items-center gap-1.5 min-w-0">
              {MOBILE_NAV === 'drawer' && (
                <button onClick={() => setMobileMenuOpen(true)} aria-label={t.bottom.menu} className="m3-interactive flex items-center justify-center h-9 w-9 -ml-1 text-on-surface-variant rounded-full shrink-0">
                  <Menu size={20} />
                </button>
              )}
              <Link href="/teacher/dashboard" aria-label="Edify Teacher" className="t-glass-pill flex items-center h-10 px-4 rounded-full">
                <Image src="/brand/edify-logo.webp" alt="Edify" width={307} height={120} priority unoptimized className="t-brand-logo h-[24px] w-auto" />
              </Link>
            </div>

            <div className="flex items-center gap-1.5">

              {/* AI chip + popover */}
              <div className="relative">
                <button
                  onClick={() => { setIsAiMenuOpen(!isAiMenuOpen); setIsProfileMenuOpen(false); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 h-10 rounded-full transition-colors",
                    aiData.isDanger ? "bg-error-container text-on-error-container" : "t-glass-pill text-on-surface",
                  )}
                >
                  <Zap size={13} className={aiData.isDanger ? "fill-current" : "text-primary"} />
                  <span className="text-[11.5px] font-bold tabular-nums">{aiData.isUnlimited ? '∞' : aiData.remaining}</span>
                </button>
                <AnimatePresence>
                  {isAiMenuOpen && (
                    <motion.div {...popIn} className={cn("absolute top-full right-0 mt-2 w-[260px] p-4 origin-top-right", PANEL)}>
                      {aiPanelBody}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Light/dark wave switch (replaces the bell; notifications live
                  in the Menu drawer → Bildirishnomalar). */}
              <ThemeWaveToggle
                className="t-glass-pill h-10 w-10 text-on-surface"
                labels={{ toLight: t.theme.light, toDark: t.theme.dark }}
              />

              {/* Avatar + profile popover (theme + language switchers live inside) */}
              <div className="relative">
                <button onClick={() => { setIsProfileMenuOpen(!isProfileMenuOpen); setIsAiMenuOpen(false); }} className="t-glass-pill grid place-items-center h-10 w-10 rounded-full transition-transform active:scale-95">
                  {avatar("w-8 h-8 !rounded-full", "text-[12px]")}
                </button>
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div {...popIn} className={cn("absolute top-full right-0 mt-2 w-60 p-2 origin-top-right", PANEL)}>
                      {profilePanelBody}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </header>

          {/* MAIN SCROLLABLE CONTENT — reserves space for the bottom bar on mobile */}
          <main
            onScroll={(e) => {
              const scrolled = e.currentTarget.scrollTop > 4;
              if (scrolled !== navScrolled) setNavScrolled(scrolled);
            }}
            className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative t-canvas",
            showBottomBar && mainBarPad,
            // Pillbar floats over <main>: content starts below it, then scrolls
            // behind it; .t-under-bar re-pins pages' sticky top-0 bars below it.
            // Phones: the floating mobile header (60px) sits over <main> too.
            "pt-[60px] md:pt-0 t-under-bar-m",
            SHELL === 'pillbar' && "md:pt-[76px] t-under-bar",
            // Printable sheets keep a plain canvas (html-to-image snapshots it).
            pathname.startsWith('/teacher/print') && "t-canvas-plain",
          )}>
            <motion.div key={pathname} {...pageTransition} className="w-full h-full relative z-10">
              {children}
            </motion.div>
          </main>

          {/* MOBILE BOTTOM NAVIGATION — per Mobile_navigation */}
          {showBottomBar && MOBILE_NAV === 'floating' && (
            <nav className="t-glass-pill t-dock md:hidden fixed inset-x-3 z-40 rounded-full flex px-2 py-1.5" style={{ bottom: 'calc(10px + env(safe-area-inset-bottom))' }}>
              {mobileNavItems.map(mobileNavLink)}
              {menuButton}
            </nav>
          )}
          {showBottomBar && MOBILE_NAV !== 'floating' && (
            <nav
              className={cn(
                "md:hidden fixed bottom-0 inset-x-0 z-40 bg-t-bar-blur backdrop-blur-xl border-t border-outline-variant flex",
                MOBILE_NAV === 'dock' && "px-1.5 pt-1.5",
                MOBILE_NAV === 'iconic' && "px-1.5",
                MOBILE_NAV === 'topline' && "px-1.5",
              )}
              style={{ paddingBottom: 'calc(6px + env(safe-area-inset-bottom))' }}
            >
              {mobileNavItems.map(mobileNavLink)}
              {menuButton}
            </nav>
          )}

        </div>
      </div>
    </TeacherLanguageContext.Provider>
  );
}

'use client';

/**
 * Teacher dashboard.
 * Styled entirely with the M3 teacher UI kit (see docs/UI_KIT.md) — tokens only,
 * no raw colors. Tour integration: data-tour attributes + useDashboardTour
 * auto-start; <TourProvider> wraps the export (move it to app/teacher/layout.tsx
 * if the tour ever needs to reach other pages).
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, Variants } from 'framer-motion';
import {
    Users, FileText, Layout, BarChart2, Sparkles,
    School, ImageIcon, Bot, Library, Calendar, ChevronRight,
    ClipboardList, Settings, Crown, ArrowRight, Zap, Target, BookOpen,
    Award, GraduationCap, Calculator, PenTool, Gift, HelpCircle, Building2,
} from 'lucide-react';
import { useTeacherLanguage, LangType } from '@/app/teacher/layout';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTeacherCenter } from '@/hooks/useTeacherCenter';
import TeacherTodayLessons from '@/components/center/TeacherTodayLessons';
import {
    fetchTeacherCenterGroups, uniqueStudentCount, type TeacherCenterGroup,
} from '@/services/teacherCenterService';

import { Button, ProgressBar, Skeleton, cn } from '@/components/ui';

import { TourProvider } from './tourComponents/TourContext';
import { useDashboardTour } from './tourComponents/useDashboardTour';

// ============================================================================
// 1. TRANSLATION DICTIONARY
// ============================================================================
const DASHBOARD_TRANSLATIONS: Record<string, any> = {
    uz: {
        welcome: { morning: "Xayrli tong", afternoon: "Xayrli kun", evening: "Xayrli kech", subtitle: "Bugun nima o'rganamiz?" },
        stats: { students: "O'quvchilar", classes: "Faol Sinflar", tests: "Testlar" },
        headers: { create: "Test Yaratish Vositalari", manage: "O'quv Markazi", limits: "Oylik AI Limit" },
        tourBtn: "Qo'llanma",
        center: { groups: "guruh", students: "o'quvchi", open: "Markazni ochish" },
        subscription: {
            trialTitle: "Pro tarifini 30 kun BEPUL sinab ko'ring! 🎉",
            trialDesc: "Cheksiz testlar, BSB/CHSB generatori va AI vositalaridan to'liq foydalanish imkoniyati.",
            trialBtn: "Sinovni Boshlash",
            current: "Joriy Tarif",
            plans: { free: "Start (Bepul)", pro: "Pro", vip: "VIP" }
        },
        actions: {
            library: { title: "Mening Arxivim", desc: "Barcha testlar va materiallar" },
            classes: { title: "Sinflar va O'quvchilar", desc: "Jurnal va reytinglar" },
            analytics: { title: "Tahlillar", desc: "O'zlashtirish ko'rsatkichlari" },
            assignments: { title: "Uy Vazifalari", desc: "Vazifalar va tekshiruv" },
            settings: { title: "Sozlamalar", desc: "Profil va xavfsizlik" },
        },
        tools: {
            bsb: { badge: "Rasmiy", title: "BSB va CHSB", desc: "Matritsa asosida rasmiy chorak imtihonlarini avtomatik yarating.", btn: "Boshlash" },
            maktab: { badge: "Kundalik", title: "Maktab Dasturi", desc: "Darsliklar asosida tezkor so'rovlar va uy vazifalarini tuzing.", btn: "Boshlash" },
            ixtisos: { badge: "Mantiq", title: "Ixtisoslashtirilgan", desc: "Iqtidorli o'quvchilar uchun qiyinlashtirilgan, mantiqiy masalalar.", btn: "Boshlash" },
            abiturient: { badge: "DTM", title: "Abituriyent", desc: "Oliy ta'limga kirish imtihonlari formatidagi 5 fanli blok testlar.", btn: "Boshlash" },
            mathOps: { badge: "Yangi", title: "Arifmetika", desc: "Qo'shish, ayirish, ko'paytirish uchun cheksiz PDF misollar.", btn: "Yaratish" },
            aiImage: { badge: "Skaner 📸", title: "Rasm Orqali", desc: "Eski testni rasmga oling. AI uning yangi variantlarini tuzadi.", btn: "Yuklash" },
            aiPrompt: { badge: "Avtomat", title: "AI Prompt", desc: "Test mavzusini yozing, AI qolgan barcha ishni o'zi bajaradi.", btn: "Yozish" },
            custom: { badge: "Qo'l Mehnati", title: "Oq Qog'oz", desc: "Matematik klaviatura yordamida o'z savollaringizni yozing.", btn: "Ochish" },
        }
    },
    en: {
        welcome: { morning: "Good Morning", afternoon: "Good Afternoon", evening: "Good Evening", subtitle: "What are we learning today?" },
        stats: { students: "Students", classes: "Active Classes", tests: "Tests Created" },
        headers: { create: "Creation Tools", manage: "Management Hub", limits: "Monthly AI Limit" },
        tourBtn: "Guide",
        center: { groups: "groups", students: "students", open: "Open center" },
        subscription: {
            trialTitle: "Try Pro for 30 Days FREE! 🎉",
            trialDesc: "Unlock unlimited tests, BSB generators, and full access to all AI teaching tools.",
            trialBtn: "Start Free Trial",
            current: "Current Plan",
            plans: { free: "Starter (Free)", pro: "Pro", vip: "VIP" }
        },
        actions: {
            library: { title: "My Library", desc: "All saved tests and materials" },
            classes: { title: "Classes & Students", desc: "Rosters and leaderboards" },
            analytics: { title: "Analytics", desc: "Performance tracking" },
            assignments: { title: "Assignments", desc: "Homework and grading" },
            settings: { title: "Settings", desc: "Profile and limits" },
        },
        tools: {
            bsb: { badge: "Official", title: "BSB & CHSB", desc: "Instantly generate matrix-based, official term exam papers.", btn: "Start" },
            maktab: { badge: "Daily", title: "Public School", desc: "Create quick quizzes and homework based on textbooks.", btn: "Start" },
            ixtisos: { badge: "Logic", title: "Specialized", desc: "Generate Olympiad-level logic problems for gifted students.", btn: "Start" },
            abiturient: { badge: "DTM", title: "Entrance Exams", desc: "Build highly competitive subject blocks formatted for exams.", btn: "Start" },
            mathOps: { badge: "New", title: "Arithmetic", desc: "Endless PDF worksheets for basic math operations.", btn: "Generate" },
            aiImage: { badge: "Scanner 📸", title: "Create via Image", desc: "Snap a photo of an old test to generate brand new variants.", btn: "Upload" },
            aiPrompt: { badge: "Auto", title: "AI Text Command", desc: "Describe your topic. AI builds the entire test for you.", btn: "Write" },
            custom: { badge: "Manual", title: "Blank Canvas", desc: "Write questions from scratch using the math keyboard.", btn: "Open" },
        }
    }
};

// ============================================================================
// 2. TONES & ANIMATIONS
// ============================================================================
// One hue family, two weights: 'primary' = the gradient chip (t-icon-chip),
// 'soft' = the tinted chip (t-icon-chip-soft). Calm, near-monochrome — the
// recipes live in components/ui/theme.css, status colors stay reserved.
type Tone = 'primary' | 'soft';

const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants: Variants = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } } };

// ============================================================================
// 3. MAIN COMPONENT
// ============================================================================
function TeacherDashboardInner() {
    const { user } = useAuth() as any;
    const router = useRouter();
    const { lang } = useTeacherLanguage() as { lang: LangType };
    const t = DASHBOARD_TRANSLATIONS[lang] || DASHBOARD_TRANSLATIONS['uz'];

    // Auto-starts on first visit; exposes startTour() for the button
    const { startTour } = useDashboardTour(lang);
    const teacherCenter = useTeacherCenter();

    const [greeting, setGreeting] = useState('');
    const [currentDate, setCurrentDate] = useState('');
    const [userData, setUserData] = useState<any>({
        stats: { students: 0, classes: 0, tests: 0 },
        sub: { planId: 'free', status: 'active', hasUsedTrial: false },
        usage: { aiUsed: 0, aiLimit: 100 },
    });
    const [loading, setLoading] = useState(true);
    // Center groups — only fetched for a teacher who HAS a center link, so a
    // solo teacher's dashboard makes exactly the reads it always did.
    const [centerGroups, setCenterGroups] = useState<TeacherCenterGroup[] | null>(null);

    useEffect(() => {
        if (!user || !teacherCenter.centerId) return;
        let mounted = true;
        fetchTeacherCenterGroups(user.uid, teacherCenter.centerId)
            .then((list) => mounted && setCenterGroups(list))
            .catch((e) => {
                console.error('dashboard center groups load failed', e);
                if (mounted) setCenterGroups([]);
            });
        return () => { mounted = false; };
    }, [user, teacherCenter.centerId]);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting(t.welcome.morning);
        else if (hour < 18) setGreeting(t.welcome.afternoon);
        else setGreeting(t.welcome.evening);
        setCurrentDate(new Date().toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }, [lang, t]);

    useEffect(() => {
        if (!user) return;
        const fetchUserData = async () => {
            try {
                const userSnap = await getDoc(doc(db, 'users', user.uid));
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    setUserData({
                        stats: { students: data.totalStudents || 0, classes: data.activeClassCount || 0, tests: (data.customTestCount || 0) + (data.bsbTestCount || 0) },
                        sub: { planId: data.subscription?.planId || 'free', status: data.subscription?.status || 'active', hasUsedTrial: data.hasUsedTrial === true },
                        usage: { aiUsed: data.usage?.aiQuestionsUsed || 0, aiLimit: data.currentLimits?.monthlyAiQuestions || 100 }
                    });
                }
            } catch (error) { console.error("Failed to fetch data", error); }
            finally { setLoading(false); }
        };
        fetchUserData();
    }, [user]);

    if (loading || !user) return <DashboardSkeleton />;

    const showTrialPrompt = userData.sub.planId === 'free' && !userData.sub.hasUsedTrial;

    // For a CENTER teacher the class/student counts come from live center data.
    // `users.activeClassCount`/`totalStudents` are Cloud-Function-generated and
    // no functions/ dir exists in this repo (docs/TEACHER.md), so they are often
    // stale or absent. Solo teachers keep reading those fields — unchanged.
    const isCenterTeacher = !!teacherCenter.centerId && centerGroups !== null;
    const displayStats = isCenterTeacher
        ? {
            ...userData.stats,
            classes: centerGroups!.length,
            students: uniqueStudentCount(centerGroups!),
        }
        : userData.stats;

    const getPlanStyle = () => {
        switch (userData.sub.planId) {
            case 'vip': return { classes: 't-icon-chip', icon: <Crown size={14} />, label: t.subscription.plans.vip };
            case 'pro': return { classes: 't-icon-chip', icon: <Sparkles size={14} />, label: t.subscription.plans.pro };
            default: return { classes: 'bg-surface-container-highest text-on-surface-variant', icon: <Layout size={14} />, label: t.subscription.plans.free };
        }
    };
    const planStyle = getPlanStyle();

    // 'primary' = featured (gradient chip at rest); 'soft' turns gradient on hover.
    const CREATION_TOOLS: { id: string; icon: any; tone: Tone; href: string; data: any; tourId: string }[] = [
        { id: 'bsb', icon: FileText, tone: 'primary', href: '/teacher/create/bsb-chsb', data: t.tools.bsb, tourId: 'tour-bsb-tool' },
        { id: 'maktab', icon: School, tone: 'soft', href: '/teacher/create/maktab', data: t.tools.maktab, tourId: '' },
        { id: 'ixtisos', icon: Award, tone: 'soft', href: '/teacher/create/ixtisoslashtirilgan_maktab', data: t.tools.ixtisos, tourId: '' },
        { id: 'abiturient', icon: GraduationCap, tone: 'soft', href: '/teacher/create/abiturient', data: t.tools.abiturient, tourId: '' },
        { id: 'aiPrompt', icon: Bot, tone: 'primary', href: '/teacher/create/by_user_input', data: t.tools.aiPrompt, tourId: 'tour-ai-prompt-tool' },
        { id: 'aiImage', icon: ImageIcon, tone: 'soft', href: '/teacher/create/by_image', data: t.tools.aiImage, tourId: '' },
        { id: 'mathOps', icon: Calculator, tone: 'soft', href: '/teacher/create/operations', data: t.tools.mathOps, tourId: '' },
        { id: 'custom', icon: PenTool, tone: 'soft', href: '/teacher/create/custom', data: t.tools.custom, tourId: '' },
    ];

    return (
        <div className="min-h-[100dvh] bg-surface relative pb-28 md:pb-12 overflow-x-hidden">
            <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 relative z-10">
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 md:space-y-8">

                    {/* ═══════════════ 1. HEADER ═══════════════ */}
                    <motion.div
                        variants={itemVariants}
                        data-tour="tour-header"
                        className="t-hero w-full rounded-m3-xl p-5 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5 overflow-hidden"
                    >
                        <div className="relative z-10 flex flex-col gap-1">
                            <span className="self-start text-[11px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5 mb-2 rounded-full bg-t-primary-tint px-3 py-1">
                                <Calendar size={13} /> {currentDate}
                            </span>
                            <h1 className="font-t-display text-2xl md:text-[34px] md:leading-[1.15] font-extrabold text-on-surface tracking-tight">
                                {greeting}, <span className="t-gradient bg-clip-text text-transparent">{user?.displayName?.split(' ')[0] || "O'qituvchi"}</span>
                                <span aria-hidden className="t-wave ml-1.5"> 👋</span>
                            </h1>
                            <p className="text-[13.5px] text-on-surface-variant font-medium">{t.welcome.subtitle}</p>
                            {/* The center chip that used to live here moved into the
                                center strip below — one place, not two. */}
                        </div>

                        <div className="relative z-10 flex items-center gap-2.5">
                            <Button variant="tonal" size="sm" icon={<HelpCircle />} onClick={startTour}>
                                {t.tourBtn}
                            </Button>

                            <div
                                data-tour="tour-plan-badge"
                                onClick={() => router.push('/teacher/subscription')}
                                title={t.subscription.current}
                                className={cn(
                                    "m3-interactive flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold cursor-pointer transition-transform hover:scale-105 active:scale-95",
                                    planStyle.classes,
                                )}
                            >
                                {planStyle.icon} {planStyle.label}
                            </div>
                        </div>
                    </motion.div>

                    {/* ═══════════════ 1b. CENTER STRIP (center teachers only) ═══════════════ */}
                    {teacherCenter.centerId && (
                        <motion.div variants={itemVariants} className="space-y-4">
                            <Link
                                href="/teacher/center"
                                className="t-accent-strip group flex items-center gap-4 rounded-m3-xl p-4 transition-transform hover:-translate-y-0.5 md:p-5"
                            >
                                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-m3-lg bg-[color-mix(in_oklab,currentColor_16%,transparent)] ring-1 ring-[color-mix(in_oklab,currentColor_25%,transparent)] backdrop-blur-sm">
                                    <Building2 size={22} strokeWidth={2.4} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <h2 className="truncate text-[16px] font-extrabold leading-tight md:text-[18px]">
                                        {teacherCenter.centerName || 'Markaz'}
                                    </h2>
                                    {centerGroups && (
                                        <p className="mt-0.5 text-[12px] font-bold opacity-85 tabular-nums">
                                            {centerGroups.length} {t.center.groups} · {uniqueStudentCount(centerGroups)} {t.center.students}
                                        </p>
                                    )}
                                </div>
                                <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,currentColor_14%,transparent)] px-3.5 py-1.5 text-[12px] font-bold sm:flex">
                                    {t.center.open} <ArrowRight size={14} strokeWidth={2.5} className="transition-transform group-hover:translate-x-1" />
                                </span>
                                <ChevronRight size={18} className="shrink-0 opacity-70 sm:hidden" />
                            </Link>

                            {centerGroups && centerGroups.length > 0 && (
                                <TeacherTodayLessons
                                    groups={centerGroups}
                                    centerId={teacherCenter.centerId}
                                    lang={lang}
                                />
                            )}
                        </motion.div>
                    )}

                    {/* ═══════════════ 2. TRIAL BANNER ═══════════════ */}
                    {showTrialPrompt && (
                        <motion.div variants={itemVariants}>
                            <div
                                onClick={() => router.push('/teacher/subscription')}
                                className="t-accent-strip w-full rounded-m3-xl p-5 md:p-6 cursor-pointer group transition-transform hover:-translate-y-1 active:scale-[0.98]"
                            >
                                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-[color-mix(in_oklab,currentColor_16%,transparent)] flex items-center justify-center backdrop-blur-md shrink-0 group-hover:scale-110 transition-transform">
                                            <Gift size={24} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h3 className="text-[18px] md:text-2xl font-extrabold leading-tight">{t.subscription.trialTitle}</h3>
                                            <p className="text-[12px] md:text-[14px] opacity-85 font-medium mt-1 max-w-lg leading-snug">{t.subscription.trialDesc}</p>
                                        </div>
                                    </div>
                                    <Button variant="elevated" className="w-full md:w-auto shrink-0">
                                        {t.subscription.trialBtn} <ArrowRight size={16} />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ═══════════════ 3. STATS GRID ═══════════════ */}
                    <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        <StatCard label={t.stats.tests} value={userData.stats.tests} icon={FileText} tone="primary" tourId="tour-stat-tests" />
                        <StatCard label={t.stats.classes} value={displayStats.classes} icon={Layout} tone="soft" tourId="tour-stat-classes" />
                        <StatCard label={t.stats.students} value={displayStats.students} icon={Users} tone="soft" tourId="tour-stat-students" />

                        {/* AI limit card */}
                        <motion.div
                            variants={itemVariants}
                            data-tour="tour-ai-limit"
                            onClick={() => router.push('/teacher/subscription')}
                            className="t-panel t-ring-hover relative overflow-hidden p-4 md:p-5 rounded-m3-xl flex flex-col justify-between cursor-pointer group"
                        >
                            <div className="relative flex justify-between items-start mb-2">
                                <span className="text-[10px] md:text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">{t.headers.limits}</span>
                                <span className="t-icon-chip-soft grid h-7 w-7 place-items-center rounded-full">
                                    <Zap size={14} className="group-hover:scale-110 transition-transform" />
                                </span>
                            </div>
                            <div className="relative">
                                <div className="flex items-end gap-1 mb-1.5">
                                    <span className="text-[20px] md:text-[24px] font-extrabold text-on-surface leading-none tabular-nums">{userData.usage.aiUsed}</span>
                                    <span className="text-[11px] md:text-[13px] font-bold text-on-surface-variant mb-0.5">/ {userData.usage.aiLimit >= 5000 ? '∞' : userData.usage.aiLimit}</span>
                                </div>
                                <ProgressBar
                                    value={(userData.usage.aiUsed / userData.usage.aiLimit) * 100}
                                    tone={userData.usage.aiUsed >= userData.usage.aiLimit ? 'error' : userData.usage.aiUsed >= userData.usage.aiLimit * 0.8 ? 'warning' : 'primary'}
                                />
                            </div>
                        </motion.div>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

                        {/* ═══════════════ 4. CREATION TOOLS ═══════════════ */}
                        <div className="lg:col-span-2 space-y-4">
                            <SectionTitle icon={Target} title={t.headers.create} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                {CREATION_TOOLS.map((tool) => (
                                    <CreateToolCard
                                        key={tool.id}
                                        icon={tool.icon}
                                        title={tool.data.title}
                                        featured={tool.tone === 'primary'}
                                        tourId={tool.tourId}
                                        onClick={() => router.push(tool.href)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* ═══════════════ 5. MANAGEMENT HUB ═══════════════ */}
                        <div className="space-y-4 mt-6 lg:mt-0">
                            <SectionTitle icon={BookOpen} title={t.headers.manage} />
                            <div className="flex flex-col gap-2.5 md:gap-3">
                                <ManagementRow icon={Library} title={t.actions.library.title} tourId="tour-library" onClick={() => router.push('/teacher/library')} />
                                <ManagementRow icon={Users} title={t.actions.classes.title} tourId="tour-classes-row" onClick={() => router.push('/teacher/classes')} />
                                <ManagementRow icon={ClipboardList} title={t.actions.assignments.title} tourId="" onClick={() => router.push('/teacher/library/tests')} />
                                <ManagementRow icon={BarChart2} title={t.actions.analytics.title} tourId="tour-analytics-row" onClick={() => router.push('/teacher/analytics')} />
                                <ManagementRow icon={Settings} title={t.actions.settings.title} tourId="" onClick={() => router.push('/teacher/profile')} />
                            </div>
                        </div>

                    </div>
                </motion.div>
            </main>
        </div>
    );
}

// ============================================================================
// 4. SUB-COMPONENTS
// ============================================================================

const SectionTitle = ({ icon: Icon, title }: { icon: typeof Target; title: string }) => (
    <div className="flex items-center gap-2.5 px-1">
        <span className="t-icon-chip-soft grid h-8 w-8 place-items-center rounded-m3-sm">
            <Icon size={16} strokeWidth={2.4} />
        </span>
        <h2 className="font-t-display text-[16px] md:text-[18px] font-extrabold text-on-surface tracking-tight">{title}</h2>
        <span aria-hidden className="ml-2 h-px flex-1 bg-gradient-to-r from-outline-variant to-transparent" />
    </div>
);

/** tourId prop: if provided, adds data-tour="..." to the element */
const StatCard = ({ label, value, icon: Icon, tone, tourId }: { label: string; value: number; icon: any; tone: Tone; tourId?: string }) => (
    <motion.div
        variants={itemVariants}
        {...(tourId ? { 'data-tour': tourId } : {})}
        className="t-panel t-ring-hover group p-4 md:p-5 rounded-m3-xl flex flex-col items-start gap-2 relative overflow-hidden"
    >
        <div className={cn("relative w-9 h-9 md:w-11 md:h-11 rounded-m3-md flex items-center justify-center", tone === 'primary' ? 't-icon-chip' : 't-icon-chip-soft')}>
            <Icon size={18} className="md:w-5 md:h-5" strokeWidth={2.3} />
        </div>
        <div className="relative mt-1">
            <span className="font-t-display text-[24px] md:text-[30px] font-extrabold text-on-surface leading-none block mb-1.5 tabular-nums tracking-tight">{value}</span>
            <span className="text-[10px] md:text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">{label}</span>
        </div>
    </motion.div>
);

const CreateToolCard = ({ icon: Icon, title, featured, tourId, onClick }: { icon: any; title: string; featured: boolean; tourId?: string; onClick: () => void }) => (
    <motion.button
        whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
        onClick={onClick}
        {...(tourId ? { 'data-tour': tourId } : {})}
        className="t-panel t-ring-hover relative flex items-center p-3.5 md:p-5 rounded-m3-xl text-left group overflow-hidden"
    >
        {/* Soft sky wash that blooms from the icon on hover */}
        <span aria-hidden className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-t-primary-tint blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="relative w-12 h-12 md:w-14 md:h-14 shrink-0 mr-3 md:mr-4 z-10">
            <span className={cn("absolute inset-0 rounded-m3-lg flex items-center justify-center transition-opacity duration-300", featured ? "t-icon-chip" : "t-icon-chip-soft group-hover:opacity-0")}>
                <Icon size={24} strokeWidth={2} className="md:w-7 md:h-7" />
            </span>
            {!featured && (
                <span className="t-icon-chip absolute inset-0 rounded-m3-lg flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:rotate-[-4deg]">
                    <Icon size={24} strokeWidth={2} className="md:w-7 md:h-7" />
                </span>
            )}
        </div>

        <h4 className="flex-1 min-w-0 pr-6 z-10 text-[14px] md:text-[16px] font-extrabold text-on-surface group-hover:text-primary truncate transition-colors">{title}</h4>

        <ArrowRight aria-hidden size={18} strokeWidth={2.4} className="absolute right-4 top-1/2 -mt-[9px] z-10 text-primary opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
    </motion.button>
);

const ManagementRow = ({ icon: Icon, title, tourId, onClick }: { icon: any; title: string; tourId?: string; onClick: () => void }) => (
    <motion.button
        whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
        onClick={onClick}
        {...(tourId ? { 'data-tour': tourId } : {})}
        className="t-panel t-ring-hover relative w-full flex items-center justify-between p-3 md:p-3.5 rounded-m3-lg group overflow-hidden"
    >
        {/* Accent rail that grows in on hover */}
        <span aria-hidden className="absolute left-0 top-1/2 h-0 w-1 -translate-y-1/2 rounded-r-full t-gradient transition-all duration-300 group-hover:h-3/5" />
        <div className="flex items-center gap-3">
            <div className="t-icon-chip-soft w-9 h-9 md:w-10 md:h-10 rounded-m3-md flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                <Icon size={16} className="md:w-[18px] md:h-[18px]" />
            </div>
            <h4 className="text-left text-[13px] md:text-[14px] font-bold text-on-surface">{title}</h4>
        </div>
        <span className="grid h-7 w-7 place-items-center rounded-full transition-colors group-hover:bg-t-primary-tint">
            <ChevronRight size={16} className="text-outline group-hover:text-primary transition-colors md:w-[18px] md:h-[18px]" />
        </span>
    </motion.button>
);

const DashboardSkeleton = () => (
    <div className="min-h-screen bg-surface p-4 max-w-[1200px] mx-auto space-y-6 pt-8">
        <Skeleton className="h-12 w-64 rounded-m3-md" />
        <Skeleton className="h-36 w-full rounded-m3-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-m3-xl" />)}
        </div>
    </div>
);

// ============================================================================
// 5. PAGE EXPORT — TourProvider wraps the inner component
// ============================================================================
export default function TeacherDashboard() {
    return (
        <TourProvider>
            <TeacherDashboardInner />
        </TourProvider>
    );
}

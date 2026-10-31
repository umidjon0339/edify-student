'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, onSnapshot, collection, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useTeacherLanguage } from '@/app/teacher/layout';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

import AddIeltsStudentModal from '../_components/AddIeltsStudentModal';
import AssignTestModal, { type AssignPrefill } from './_components/AssignTestModal';
import IeltsPulseDashboard from './_components/IeltsPulseDashboard';
import IeltsUnifiedFeed from './_components/IeltsUnifiedFeed';
import IeltsRosterTab from './_components/IeltsRosterTab';
import IeltsRequestsTab from './_components/IeltsRequestsTab';
import IeltsReviewsTab from './_components/IeltsReviewsTab';
import { GroupAttempt } from './_components/groupData';
import { fetchGroupAttempts } from '@/services/ieltsService';

import {
  Users, Hash, ChevronLeft, Inbox,
  FileText, Plus, Sparkles, UserPlus, Activity, ClipboardCheck, Building2, CalendarCheck
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import AttendanceGrid from '@/components/attendance/AttendanceGrid';
import type { ScheduleEntry } from '@/types/attendance';

import { IeltsGroup } from '@/lib/ielts/types';
import { IconButton, Spinner, Badge } from '@/components/ui';

// ─── Translations ─────────────────────────────────────────────────────────────
const T: Record<string, any> = {
  uz: {
    back: "Guruhlarga",
    loading: "Yuklanmoqda...",
    buttons: { add: "O'quvchi Qo'shish", assign: "Mock Berish" },
    tabs: { dashboard: "Pulse", assignments: "Topshiriqlar", students: "O'quvchilar", requests: "So'rovlar", reviews: "Tekshirish", attendance: "Davomat" },
  },
  en: {
    back: "Groups",
    loading: "Loading...",
    buttons: { add: "Add Student", assign: "Assign Mock" },
    tabs: { dashboard: "Pulse", assignments: "Assignments", students: "Students", requests: "Requests", reviews: "Reviews", attendance: "Attendance" },
  },
  ru: {
    back: "Группы",
    loading: "Загрузка...",
    buttons: { add: "Добавить ученика", assign: "Назначить тест" },
    tabs: { dashboard: "Пульс", assignments: "Задания", students: "Ученики", requests: "Запросы", reviews: "Проверка", attendance: "Посещаемость" },
  },
};

type IeltsTab = 'dashboard' | 'assignments' | 'students' | 'requests' | 'reviews' | 'attendance';

export default function IeltsGroupDetailsPage() {
  const { groupId } = useParams() as { groupId: string };
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = T[lang] || T['uz'];

  const [group, setGroup]               = useState<IeltsGroup | null>(null);
  const [centerName, setCenterName]     = useState<string | null>(null);
  // `?tab=attendance` deep-links here from the center hub / dashboard "today's
  // lessons" card (managed groups mark attendance on this page). Read from the
  // URL directly — useSearchParams would force a Suspense boundary at build time.
  const [activeTab, setActiveTab]       = useState<IeltsTab>(() => {
    if (typeof window === 'undefined') return 'dashboard';
    const wanted = new URLSearchParams(window.location.search).get('tab');
    const valid: IeltsTab[] = ['dashboard', 'assignments', 'students', 'requests', 'reviews', 'attendance'];
    return valid.includes(wanted as IeltsTab) ? (wanted as IeltsTab) : 'dashboard';
  });
  const [requestCount, setRequestCount] = useState(0);
  const [isAddOpen, setIsAddOpen]       = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignPrefill, setAssignPrefill] = useState<AssignPrefill | null>(null);
  const [isPlusOpen, setIsPlusOpen]     = useState(false);

  // Group attempts — one-shot fetch shared by all tabs, refreshed on tab change
  const [attempts, setAttempts]             = useState<GroupAttempt[]>([]);
  const [attemptsLoaded, setAttemptsLoaded] = useState(false);
  // Bumped after creating an assignment so the Assignments tab refetches
  const [feedRefresh, setFeedRefresh]       = useState(0);

  const loadAttempts = useCallback(async () => {
    try {
      const list = await fetchGroupAttempts(groupId);
      setAttempts(list as GroupAttempt[]);
    } catch (e) {
      console.error(e);
    } finally {
      setAttemptsLoaded(true);
    }
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    loadAttempts();
  }, [groupId, activeTab, loadAttempts]);

  // Group document — live
  useEffect(() => {
    if (!groupId) return;
    const unsub = onSnapshot(doc(db, 'ielts_groups', groupId), (snap) => {
      if (snap.exists()) setGroup({ id: snap.id, ...snap.data() } as IeltsGroup);
      else router.push('/teacher/ielts/groups');
    });
    return () => unsub();
  }, [groupId, router]);

  // Center name for the header chip (managed groups; centers read is isAuth)
  const groupCenterId = group?.centerId || null;
  useEffect(() => {
    if (!groupCenterId) { setCenterName(null); return; }
    getDoc(doc(db, 'centers', groupCenterId))
      .then((snap) => setCenterName(snap.exists() ? (snap.data().name || null) : null))
      .catch(() => setCenterName(null));
  }, [groupCenterId]);

  // Linked class twin (managed groups) — live, feeds the Attendance tab with the
  // schedule + roster the manager maintains (docs/IELTS.md linked-pair model).
  const groupClassId = group?.classId || null;
  const [linkedClass, setLinkedClass] = useState<{ centerId: string; studentIds: string[]; schedule: ScheduleEntry[] } | null>(null);
  useEffect(() => {
    if (!groupClassId) { setLinkedClass(null); return; }
    const unsub = onSnapshot(doc(db, 'classes', groupClassId), (snap) => {
      if (!snap.exists()) { setLinkedClass(null); return; }
      const data = snap.data();
      setLinkedClass({
        centerId: data.centerId || '',
        studentIds: Array.isArray(data.studentIds) ? data.studentIds : [],
        schedule: Array.isArray(data.schedule) ? data.schedule : [],
      });
    }, () => setLinkedClass(null));
    return () => unsub();
  }, [groupClassId]);

  // Request badge — live
  useEffect(() => {
    if (!groupId) return;
    const q = query(collection(db, 'ielts_groups', groupId, 'requests'));
    const unsub = onSnapshot(q, (snap) => setRequestCount(snap.size));
    return () => unsub();
  }, [groupId]);

  if (!group) {
    return (
      <div className="min-h-[100dvh] bg-surface flex flex-col items-center justify-center gap-3">
        <Spinner size={28} />
        <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest">{t.loading}</p>
      </div>
    );
  }

  const pendingReviews = attempts.filter(a => a.reviewStatus === 'pending_review').length;
  // Center-managed group: the roster (and joining) belongs to the center manager —
  // hide Requests + Add Student; the Students tab is view-only. Content stays ours.
  const isManaged = !!(group.managed || group.centerId);

  // A hand-typed `?tab=attendance` on a NON-managed group would select a tab
  // that has no button and no content — fall back rather than render blank.
  const currentTab: IeltsTab =
    activeTab === 'attendance' && !isManaged ? 'dashboard'
      : activeTab === 'requests' && isManaged ? 'dashboard'
        : activeTab;

  const TABS: { id: IeltsTab; label: string; icon: any; badge: number }[] = [
    { id: 'dashboard',   label: t.tabs.dashboard,   icon: Activity,       badge: 0 },
    { id: 'assignments', label: t.tabs.assignments, icon: FileText,       badge: 0 },
    { id: 'reviews',     label: t.tabs.reviews,     icon: ClipboardCheck, badge: pendingReviews },
    // Managed groups get lesson attendance here (the linked class is hidden from
    // /teacher/classes — this page is the group's ONE home for the teacher).
    ...(isManaged ? [{ id: 'attendance' as IeltsTab, label: t.tabs.attendance, icon: CalendarCheck, badge: 0 }] : []),
    { id: 'students',    label: t.tabs.students,    icon: Users,          badge: 0 },
    ...(!isManaged ? [{ id: 'requests' as IeltsTab, label: t.tabs.requests, icon: Inbox, badge: requestCount }] : []),
  ];

  return (
    <div className="min-h-[100dvh] bg-surface font-t-body flex flex-col selection:bg-primary-container selection:text-on-primary-container">

      {/* ── Modals ── */}
      <AddIeltsStudentModal groupId={groupId} isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <AssignTestModal
        groupId={groupId}
        group={group}
        isOpen={isAssignOpen}
        onClose={() => { setIsAssignOpen(false); setAssignPrefill(null); }}
        onCreated={() => { setFeedRefresh(n => n + 1); setActiveTab('assignments'); }}
        prefill={assignPrefill}
      />

      {/* ── Plus dropdown overlay ── */}
      <AnimatePresence>
        {isPlusOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsPlusOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="fixed top-[56px] right-4 md:right-8 z-50 bg-surface-container-lowest rounded-m3-lg shadow-elev-3 border border-outline-variant w-52 p-1.5 flex flex-col gap-0.5 origin-top-right"
            >
              <button
                onClick={() => { setIsAssignOpen(true); setIsPlusOpen(false); }}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-state-hover rounded-m3-md transition-colors text-on-surface w-full text-left group"
              >
                <div className="w-7 h-7 rounded-m3-sm bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                  <Sparkles size={14} strokeWidth={2.5} />
                </div>
                <span className="font-bold text-[13px]">{t.buttons.assign}</span>
              </button>

              {!isManaged && (
                <>
                  <div className="h-px bg-outline-variant mx-2" />

                  <button
                    onClick={() => { setIsAddOpen(true); setIsPlusOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-state-hover rounded-m3-md transition-colors text-on-surface w-full text-left group"
                  >
                    <div className="w-7 h-7 rounded-m3-sm bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                      <UserPlus size={14} strokeWidth={2.5} />
                    </div>
                    <span className="font-bold text-[13px]">{t.buttons.add}</span>
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <header className="t-page-bar sticky top-0 z-30 bg-[color-mix(in_oklab,var(--m3-surface)_85%,transparent)] backdrop-blur-xl border-b border-outline-variant px-4 md:px-6 h-14 flex items-center justify-between shrink-0 gap-3">

        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/teacher/ielts/groups"
            className="m3-interactive w-8 h-8 rounded-m3-md bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest transition-all shrink-0"
          >
            <ChevronLeft size={17} strokeWidth={2.5} />
          </Link>

          <div className="hidden md:block w-px h-4 bg-outline-variant shrink-0" />

          <div className="flex flex-col min-w-0">
            <h1 className="text-[15px] md:text-[17px] font-black text-on-surface tracking-tight truncate leading-tight">
              {group.title}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-black text-on-tertiary-container bg-tertiary-container border border-transparent px-1.5 py-0.5 rounded-m3-xs tracking-wide">
                🎯 Band {Number(group.targetBand).toFixed(1)}
              </span>
              {isManaged ? (
                // Managed group — no join code to share; show the owning center instead.
                <span className="hidden sm:flex items-center gap-1 text-[10px] font-black text-on-secondary-container bg-secondary-container border border-transparent px-1.5 py-0.5 rounded-m3-xs">
                  <Building2 size={9} />{centerName || 'Markaz'}
                </span>
              ) : (
                <span className="hidden sm:flex items-center gap-0.5 text-[10px] font-black text-on-surface-variant bg-surface-container-high border border-outline-variant px-1.5 py-0.5 rounded-m3-xs font-mono">
                  <Hash size={9} className="text-primary" />{group.joinCode}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right */}
        <IconButton
          variant="filled"
          onClick={() => setIsPlusOpen(!isPlusOpen)}
          aria-label="Menyu"
          className="shrink-0"
        >
          <Plus strokeWidth={2.5} className={`transition-transform duration-200 ${isPlusOpen ? 'rotate-45' : ''}`} />
        </IconButton>
      </header>

      {/* ── Tab bar ── */}
      <div className="bg-surface-container-low border-b border-outline-variant px-4 md:px-6 shrink-0">
        <div className="flex gap-0 overflow-x-auto custom-scrollbar">
          {TABS.map(tab => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-4 py-3.5 text-[13px] font-bold transition-colors ${
                  isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <tab.icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <Badge className="h-4 min-w-[16px] px-1 text-[9px]">
                    {tab.badge}
                  </Badge>
                )}
                {isActive && (
                  <motion.div
                    layoutId="ielts-tab-line"
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-full"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── The attendance grid is a spreadsheet: it gets the full
          viewport width with no gutters so as many lesson columns as possible
          are visible. Every other tab keeps the readable 4xl column. ── */}
      <div className={
        currentTab === 'attendance'
          ? 'flex-1 w-full pb-20'
          : 'flex-1 w-full max-w-4xl mx-auto px-4 md:px-6 py-6 pb-28'
      }>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {currentTab === 'dashboard' && (
              <IeltsPulseDashboard
                group={group}
                attempts={attempts}
                loaded={attemptsLoaded}
                onOpenReviews={() => setActiveTab('reviews')}
              />
            )}
            {currentTab === 'assignments' && (
              <IeltsUnifiedFeed
                groupId={groupId}
                group={group}
                attempts={attempts}
                refreshKey={feedRefresh}
                onAssign={() => setIsAssignOpen(true)}
                onReassign={(a) => {
                  setAssignPrefill({
                    skill: a.skill,
                    test: {
                      id: a.testId,
                      test_title: a.testTitle,
                      total_questions: a.questionCount,
                      total_time_minutes: a.totalTimeMinutes,
                    },
                    mode: a.mode,
                    allowedAttempts: a.allowedAttempts,
                    resultsVisibility: a.resultsVisibility,
                  });
                  setIsAssignOpen(true);
                }}
              />
            )}
            {currentTab === 'reviews' && (
              <IeltsReviewsTab
                attempts={attempts}
                loaded={attemptsLoaded}
                onGraded={(attemptId, band, comments) =>
                  setAttempts(prev => prev.map(a => a.id === attemptId
                    ? { ...a, reviewStatus: 'graded' as const, teacherGrade: { band, comments, gradedAt: new Date() } }
                    : a))
                }
              />
            )}
            {currentTab === 'attendance' && isManaged && (
              linkedClass && user ? (
                <AttendanceGrid
                  classId={group.classId!}
                  centerId={linkedClass.centerId}
                  studentIds={linkedClass.studentIds}
                  recordedBy={user.uid}
                  schedule={linkedClass.schedule}
                  flush
                />
              ) : (
                <div className="py-16 flex justify-center"><Spinner size={28} /></div>
              )
            )}
            {currentTab === 'students' && (
              <IeltsRosterTab groupId={groupId} studentIds={group.studentIds} attempts={attempts} readOnly={isManaged} />
            )}
            {currentTab === 'requests' && !isManaged && <IeltsRequestsTab groupId={groupId} />}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}

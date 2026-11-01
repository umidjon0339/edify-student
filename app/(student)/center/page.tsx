'use client';

// ─── "My Center" hub ─────────────────────────────────────────────────────────
// Everything a center student needs, in the same tabbed shape as the class and
// IELTS group pages: Umumiy · Jadval · Davomat · To'lovlar.
//
// Membership comes from `center_students` (own-read allowed by rules), never
// from classes — a student can belong to a center with ZERO groups. Finance
// comes from GET /api/student/finance (Admin SDK; the finance collections stay
// manager-only in the rules — never query them here).
//
// A student in several centers gets a switcher above the tabs; with exactly one
// center no switcher renders at all.

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { useStudentLanguage } from '../layout';
import { fetchMyCenters, type MyCenter } from '@/services/studentCenterService';
import { getTodayKey, toDateKey } from '@/lib/dateUtils';
import {
  normalizeRecords, isCountedLesson, tallyStudent, type CenterSession,
} from '@/services/attendanceService';
import type { LessonStatus, ScheduleEntry } from '@/types/attendance';
import { WEEK_MON_FIRST, weekdayName } from '@/lib/weekSchedule';
import {
  Building2, CalendarCheck, CalendarDays, Wallet, Users, Clock, LayoutGrid,
  CheckCircle2, XCircle, ShieldQuestion, CircleDollarSign, ReceiptText,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import {
  Card, Chip, EmptyState, ListGroup, ListRow, LoadingState, Page, PageHeader,
  Stack, StatTile, Tabs, cn, type Status,
} from '@/components/student-ui';
import CenterScheduleTab from './_components/CenterScheduleTab';

const DAYS_BACK = 92;

const CENTER_TRANSLATIONS: any = {
  uz: {
    title: "Mening Markazim",
    tabs: { overview: "Umumiy", schedule: "Jadval", attendance: "Davomat", finance: "To'lovlar" },
    groups: "Guruhlarim", teacher: "O'qituvchi", schedule: "Jadval", noGroups: "Bu markazda hali guruhga qo'shilmagansiz.",
    attendance: "Davomat", attRate: "Davomat darajasi", present: "Kelgan", late: "Kechikkan", absent: "Kelmagan", excused: "Sababli", noAttendance: "Hali davomat belgilanmagan.",
    finance: "To'lovlar", balance: "Balans", debt: "Qarz", prepaid: "Avans", zero: "Balans nol", frozen: "Hisob muzlatilgan", discount: "Chegirma",
    charges: "Hisoblar (oyliklar)", payments: "To'lovlar tarixi", noFinance: "Hisob-kitob ma'lumotlari hali yo'q.",
    chargeStatus: { pending: "To'lanmagan", partial: "Qisman", paid: "To'langan", waived: "Kechirilgan", cancelled: "Bekor qilingan" },
    payType: { payment: "To'lov", refund: "Qaytarim" },
    methods: { cash: "Naqd", card: "Karta", click: "Click", payme: "Payme", transfer: "O'tkazma", other: "Boshqa" },
    cancelled: "Bekor qilingan", sum: "so'm", groupsCount: "Guruhlar",
    empty: { title: "Siz o'quv markaziga biriktirilmagansiz", desc: "Markaz menejeri sizni ro'yxatga qo'shganida bu sahifada markaz, davomat va to'lov ma'lumotlari ko'rinadi." },
  },
  en: {
    title: "My Center",
    tabs: { overview: "Overview", schedule: "Schedule", attendance: "Attendance", finance: "Payments" },
    groups: "My Groups", teacher: "Teacher", schedule: "Schedule", noGroups: "You are not in any group at this center yet.",
    attendance: "Attendance", attRate: "Attendance rate", present: "Present", late: "Late", absent: "Absent", excused: "Excused", noAttendance: "No attendance marked yet.",
    finance: "Payments", balance: "Balance", debt: "Owed", prepaid: "Prepaid", zero: "Settled", frozen: "Billing frozen", discount: "Discount",
    charges: "Charges (monthly)", payments: "Payment history", noFinance: "No billing records yet.",
    chargeStatus: { pending: "Unpaid", partial: "Partial", paid: "Paid", waived: "Waived", cancelled: "Cancelled" },
    payType: { payment: "Payment", refund: "Refund" },
    methods: { cash: "Cash", card: "Card", click: "Click", payme: "Payme", transfer: "Transfer", other: "Other" },
    cancelled: "Cancelled", sum: "UZS", groupsCount: "Groups",
    empty: { title: "You are not linked to a learning center", desc: "Once a center manager adds you to their roster, this page shows your center, attendance and payment details." },
  },
  ru: {
    title: "Мой Центр",
    tabs: { overview: "Обзор", schedule: "Расписание", attendance: "Посещаемость", finance: "Платежи" },
    groups: "Мои группы", teacher: "Учитель", schedule: "Расписание", noGroups: "Вы пока не состоите в группах этого центра.",
    attendance: "Посещаемость", attRate: "Уровень посещаемости", present: "Присутствовал", late: "Опоздал", absent: "Отсутствовал", excused: "Уважительная", noAttendance: "Посещаемость пока не отмечена.",
    finance: "Платежи", balance: "Баланс", debt: "Долг", prepaid: "Аванс", zero: "Без долга", frozen: "Счёт заморожен", discount: "Скидка",
    charges: "Начисления (месяцы)", payments: "История платежей", noFinance: "Начислений пока нет.",
    chargeStatus: { pending: "Не оплачено", partial: "Частично", paid: "Оплачено", waived: "Прощено", cancelled: "Отменено" },
    payType: { payment: "Платёж", refund: "Возврат" },
    methods: { cash: "Наличные", card: "Карта", click: "Click", payme: "Payme", transfer: "Перевод", other: "Другое" },
    cancelled: "Отменён", sum: "сум", groupsCount: "Группы",
    empty: { title: "Вы не привязаны к учебному центру", desc: "Когда менеджер центра добавит вас в список, здесь появятся данные центра, посещаемости и платежей." },
  },
};

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(n);

const ATT_STYLE: Record<string, { status: Status; Icon: LucideIcon }> = {
  present: { status: 'success', Icon: CheckCircle2 },
  late: { status: 'warning', Icon: Clock },
  absent: { status: 'error', Icon: XCircle },
  excused: { status: 'neutral', Icon: ShieldQuestion },
};

const CHARGE_STATUS: Record<string, Status> = {
  pending: 'error',
  partial: 'warning',
  paid: 'success',
  waived: 'neutral',
  cancelled: 'neutral',
};

type TabKey = 'overview' | 'schedule' | 'attendance' | 'finance';

interface CenterGroup {
  id: string;
  title: string;
  teacherName: string;
  schedule: ScheduleEntry[];
  /** Center IELTS group twin — the group's student home is /ielts/{ieltsGroupId}. */
  ieltsGroupId?: string;
}

interface CenterView extends MyCenter {
  groups: CenterGroup[];
  sessions: CenterSession[];
  finance: any | null;
}

/** Uppercase label that opens each section. */
function SectionLabel({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-1.5 px-s-row-x pb-2 text-[12px] font-black uppercase tracking-[0.1em] text-on-surface-variant">
      <Icon size={13} strokeWidth={3} /> {children}
    </h2>
  );
}

export default function MyCenterPage() {
  const { user } = useAuth();
  const { lang } = useStudentLanguage();
  const t = CENTER_TRANSLATIONS[lang] || CENTER_TRANSLATIONS['en'];
  const locale = lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US';

  const [loading, setLoading] = useState(true);
  const [centers, setCenters] = useState<CenterView[]>([]);
  const [activeCenter, setActiveCenter] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const uid = user!.uid;
        const [myCenters, myClassesSnap, financeRes] = await Promise.all([
          fetchMyCenters(uid),
          getDocs(query(collection(db, 'classes'), where('studentIds', 'array-contains', uid))),
          user!.getIdToken().then((token) =>
            fetch('/api/student/finance', { headers: { Authorization: `Bearer ${token}` } })
              .then((r) => (r.ok ? r.json() : { centers: [] }))
              .catch(() => ({ centers: [] })),
          ),
        ]);

        const myClasses = myClassesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        const todayKey = getTodayKey();
        const startKey = toDateKey(new Date(Date.now() - DAYS_BACK * 86_400_000));

        const views: CenterView[] = await Promise.all(myCenters.map(async (center) => {
          const groups: CenterGroup[] = myClasses
            .filter((c) => c.centerId === center.centerId)
            .map((c) => ({
              id: c.id, title: c.title || '', teacherName: c.teacherName || '',
              schedule: Array.isArray(c.schedule) ? c.schedule : [],
              ...(c.ieltsGroupId ? { ieltsGroupId: c.ieltsGroupId } : {}),
            }));

          // Attendance: one classId+date range query per group (index exists).
          const sessionSnaps = await Promise.all(groups.map((g) =>
            getDocs(query(
              collection(db, 'center_attendance'),
              where('classId', '==', g.id),
              where('date', '>=', startKey),
              where('date', '<=', todayKey),
            )).catch(() => null),
          ));
          const sessions: CenterSession[] = sessionSnaps
            .filter(Boolean)
            .flatMap((snap) => snap!.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id, classId: data.classId, centerId: data.centerId, date: data.date,
                weekday: data.weekday ?? 0,
                lessonStatus: (data.lessonStatus as LessonStatus) || 'held',
                records: normalizeRecords(data.records),
              };
            }))
            .sort((a, b) => (a.date < b.date ? 1 : -1));

          const finance = (financeRes.centers || []).find((f: any) => f.centerId === center.centerId) || null;
          return { ...center, groups, sessions, finance };
        }));

        setCenters(views);
      } catch (e) {
        console.error('center hub load failed', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <Page>
        <LoadingState rows={4} />
      </Page>
    );
  }

  if (centers.length === 0) {
    return (
      <Page>
        <EmptyState
          icon={<Building2 size={28} strokeWidth={2.5} />}
          title={t.empty.title}
          description={t.empty.desc}
        />
      </Page>
    );
  }

  const todayKey = getTodayKey();
  // A center could disappear between renders (removed from the roster) — clamp.
  const center = centers[Math.min(activeCenter, centers.length - 1)];
  const uid = user!.uid;

  const tally = tallyStudent(center.sessions, uid, todayKey);
  const mySessions = center.sessions
    .filter((s) => isCountedLesson(s.lessonStatus, s.date, todayKey) && s.records[uid])
    .slice(0, 20);
  const fin = center.finance;
  const balanceLabel = fin ? (fin.balance < 0 ? t.debt : fin.balance > 0 ? t.prepaid : t.zero) : t.zero;
  const balanceStatus: Status = fin && fin.balance < 0
    ? 'error'
    : fin && fin.balance > 0
      ? 'success'
      : 'neutral';

  const TABS = [
    { value: 'overview' as TabKey, label: t.tabs.overview, icon: <LayoutGrid size={16} strokeWidth={2.75} /> },
    { value: 'schedule' as TabKey, label: t.tabs.schedule, icon: <CalendarDays size={16} strokeWidth={2.75} /> },
    { value: 'attendance' as TabKey, label: t.tabs.attendance, icon: <CalendarCheck size={16} strokeWidth={2.75} /> },
    { value: 'finance' as TabKey, label: t.tabs.finance, icon: <Wallet size={16} strokeWidth={2.75} /> },
  ];

  return (
    <Page>
      <Stack>
        <PageHeader title={t.title} className="pb-0" />

        {/* ── CENTER HEADER ── */}
        {/* Edify style: glass panel + accent icon chip; the page title already
            says "My center", so no eyebrow label repeating it. */}
        <Card className="flex items-center gap-4">
          <span className="s-chip grid h-12 w-12 shrink-0 place-items-center rounded-full">
            <Building2 size={22} strokeWidth={2.5} />
          </span>
          <h2 className="s-display min-w-0 truncate text-[22px] font-bold">{center.name || '—'}</h2>
        </Card>

        {/* ── CENTER SWITCHER (only when the student is in 2+ centers) ── */}
        {centers.length > 1 && (
          <div className="s-no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            {centers.map((c, i) => (
              <button
                key={c.centerId}
                type="button"
                onClick={() => setActiveCenter(i)}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-[13px] font-extrabold s-press',
                  i === activeCenter
                    ? 's-chip'
                    : 's-panel text-on-surface-variant',
                )}
              >
                {c.name || '—'}
              </button>
            ))}
          </div>
        )}

        <Tabs tabs={TABS} value={activeTab} onChange={setActiveTab} label={t.title} />

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-s-section">
            <div className="flex flex-wrap items-center gap-3">
              <StatTile
                label={t.attRate}
                value={tally.rate !== null ? `${tally.rate}%` : '—'}
                tone="primary"
                className="min-w-[140px] flex-1"
              />
              <StatTile
                label={t.groupsCount}
                value={String(center.groups.length)}
                className="min-w-[110px] flex-1"
              />
              {fin && (
                <StatTile
                  label={t.balance}
                  value={`${fmt(Math.abs(fin.balance))}`}
                  icon={<CircleDollarSign size={15} strokeWidth={2.8} />}
                  className="min-w-[150px] flex-1"
                />
              )}
            </div>

            <div>
              <SectionLabel icon={Users}>{t.groups}</SectionLabel>
              {center.groups.length === 0 ? (
                <EmptyState icon="🏫" title={t.noGroups} className="py-8" />
              ) : (
                <ListGroup>
                  {center.groups.map((g) => (
                    // Center IELTS groups: the student home is the IELTS page.
                    <Link key={g.id} href={g.ieltsGroupId ? `/ielts/${g.ieltsGroupId}` : `/classes/${g.id}`} className="block">
                      <ListRow
                        clickable
                        className="flex-wrap"
                        title={g.ieltsGroupId ? <>{g.title} <Chip status="primary" size="sm" className="ml-1 align-middle">IELTS</Chip></> : g.title}
                        subtitle={`${t.teacher}: ${g.teacherName || '—'}`}
                      >
                        {g.schedule.length > 0 && (
                          <div className="flex basis-full flex-wrap gap-1.5 pt-2">
                            {[...g.schedule]
                              .sort((a, b) => WEEK_MON_FIRST.indexOf(a.dayOfWeek) - WEEK_MON_FIRST.indexOf(b.dayOfWeek))
                              .map((slot, i) => (
                                <Chip key={i} className="capitalize">
                                  <span className="s-num">
                                    {weekdayName(slot.dayOfWeek, locale, 'short')} {slot.startTime}–{slot.endTime}
                                    {slot.roomName ? ` · ${slot.roomName}` : ''}
                                  </span>
                                </Chip>
                              ))}
                          </div>
                        )}
                      </ListRow>
                    </Link>
                  ))}
                </ListGroup>
              )}
            </div>
          </div>
        )}

        {/* ── SCHEDULE ── */}
        {activeTab === 'schedule' && (
          <CenterScheduleTab groups={center.groups} centerName={center.name} lang={lang} />
        )}

        {/* ── ATTENDANCE ── */}
        {activeTab === 'attendance' && (
          mySessions.length === 0 ? (
            <EmptyState icon="🗓️" title={t.noAttendance} className="py-8" />
          ) : (
            <div className="flex flex-col gap-s-gap">
              <div className="flex flex-wrap items-center gap-3">
                <StatTile
                  label={t.attRate}
                  value={tally.rate !== null ? `${tally.rate}%` : '—'}
                  tone="primary"
                  className="min-w-[140px]"
                />
                <div className="flex flex-wrap gap-1.5">
                  {(['present', 'late', 'absent', 'excused'] as const).map((k) => (
                    <Chip key={k} status={ATT_STYLE[k].status}>
                      {t[k]}: <span className="s-num">{tally[k]}</span>
                    </Chip>
                  ))}
                </div>
              </div>

              <ListGroup>
                {mySessions.map((s) => {
                  const status = s.records[uid]?.status;
                  const style = ATT_STYLE[status] || ATT_STYLE.excused;
                  const Icon = style.Icon;
                  const group = center.groups.find((g) => g.id === s.classId);
                  return (
                    <ListRow
                      key={s.id}
                      title={
                        <>
                          {new Date(`${s.date}T00:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                          {group ? <span className="font-bold text-on-surface-variant"> · {group.title}</span> : null}
                        </>
                      }
                      trailing={
                        <Chip status={style.status} icon={<Icon size={12} strokeWidth={3} />}>
                          {t[status] || status}
                        </Chip>
                      }
                    />
                  );
                })}
              </ListGroup>
            </div>
          )
        )}

        {/* ── FINANCE ── */}
        {activeTab === 'finance' && (
          !fin ? (
            <EmptyState icon="🧾" title={t.noFinance} className="py-8" />
          ) : (
            <div className="flex flex-col gap-s-gap-lg">
              <div className="flex flex-wrap items-center gap-3">
                <StatTile
                  label={t.balance}
                  value={`${fmt(Math.abs(fin.balance))} ${t.sum}`}
                  icon={<CircleDollarSign size={15} strokeWidth={2.8} />}
                  className="min-w-[200px]"
                />
                <div className="flex flex-wrap gap-1.5">
                  <Chip status={balanceStatus} size="md">{balanceLabel}</Chip>
                  {fin.financeStatus === 'frozen' && <Chip status="info">{t.frozen}</Chip>}
                  {fin.discountPercent > 0 && (
                    <Chip status="primary">{t.discount}: <span className="s-num">{fin.discountPercent}%</span></Chip>
                  )}
                </div>
              </div>

              {fin.charges.length > 0 && (
                <div>
                  <SectionLabel icon={ReceiptText}>{t.charges}</SectionLabel>
                  <ListGroup>
                    {fin.charges.map((ch: any) => (
                      <ListRow
                        key={ch.id}
                        title={`${ch.classTitle} · ${ch.periodKey}`}
                        subtitle={
                          <span className="s-num">
                            {fmt(ch.paidAmount)} / {fmt(ch.amount)} {t.sum}
                          </span>
                        }
                        trailing={
                          <Chip
                            status={CHARGE_STATUS[ch.status] || CHARGE_STATUS.pending}
                            className={ch.status === 'cancelled' ? 'line-through' : undefined}
                          >
                            {t.chargeStatus[ch.status] || ch.status}
                          </Chip>
                        }
                      />
                    ))}
                  </ListGroup>
                </div>
              )}

              {fin.payments.length > 0 && (
                <div>
                  <SectionLabel icon={Wallet}>{t.payments}</SectionLabel>
                  <ListGroup>
                    {fin.payments.map((p: any) => (
                      <ListRow
                        key={p.id}
                        className={p.status === 'cancelled' ? 'opacity-50' : undefined}
                        title={
                          <>
                            {t.payType[p.type] || p.type} · {t.methods[p.method] || p.method}
                            {p.status === 'cancelled' && (
                              <span className="ml-2 text-[10px] font-black uppercase text-error">{t.cancelled}</span>
                            )}
                          </>
                        }
                        subtitle={p.paidAt || ''}
                        trailing={
                          <span className={cn(
                            's-num shrink-0 text-[13.5px] font-black',
                            p.type === 'refund' ? 'text-error' : 'text-success',
                          )}>
                            {p.type === 'refund' ? '−' : '+'}{fmt(p.amount)} {t.sum}
                          </span>
                        }
                      />
                    ))}
                  </ListGroup>
                </div>
              )}
            </div>
          )
        )}
      </Stack>
    </Page>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { Users, Plus, Target, Hash, ChevronLeft, BookOpen, Sparkles, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTeacherLanguage } from '@/app/teacher/layout';
import { IeltsGroup } from '@/lib/ielts/types';
import CreateIeltsGroupModal from './_components/CreateIeltsGroupModal';
import { Button, Skeleton, EmptyState } from '@/components/ui';

function bandPill(band: number) {
  if (band >= 8)   return 'bg-success-container text-on-success-container';
  if (band >= 6.5) return 'bg-warning-container text-on-warning-container';
  return                  'bg-error-container text-on-error-container';
}

const T: any = {
  uz: {
    heading: "IELTS Guruhlar",
    sub: "Mock imtihonlar, band maqsadlari, o'quvchilar",
    newBtn: "Yangi Guruh",
    back: "IELTS",
    oquvchi: "o'quvchi",
    total: "guruh",
    empty: {
      title: "Guruh yo'q",
      desc: "Birinchi IELTS guruhingizni yarating.",
      btn: "Guruh Yaratish",
    },
  },
  en: {
    heading: "IELTS Groups",
    sub: "Mock exams, band targets, student rosters",
    newBtn: "New Group",
    back: "IELTS",
    oquvchi: "students",
    total: "groups",
    empty: {
      title: "No groups yet",
      desc: "Create your first IELTS group to get started.",
      btn: "Create Group",
    },
  },
  ru: {
    heading: "Группы IELTS",
    sub: "Симуляции, цели и списки учеников",
    newBtn: "Новая Группа",
    back: "IELTS",
    oquvchi: "учеников",
    total: "групп",
    empty: {
      title: "Нет групп",
      desc: "Создайте первую группу IELTS.",
      btn: "Создать Группу",
    },
  },
};

export default function IeltsGroupsPage() {
  const { user } = useAuth();
  const { lang } = useTeacherLanguage();
  const t = T[lang] || T['uz'];

  const [groups, setGroups]         = useState<IeltsGroup[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'ielts_groups'),
      where('teacherId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as IeltsGroup)));
      setIsLoading(false);
    });
  }, [user]);

  return (
    <div className="min-h-[100dvh] bg-surface font-t-body pb-28">
      <CreateIeltsGroupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* ── Premium top bar ── */}
      <div className="bg-surface-container-low border-b border-outline-variant t-page-bar sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header Row */}
          <div className="flex items-center justify-between gap-4 py-4 md:py-5">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              {/* Back Button */}
              <Link
                href="/teacher/ielts"
                className="m3-interactive w-10 h-10 md:w-11 md:h-11 rounded-m3-md bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest hover:shadow-elev-1 transition-all shrink-0"
              >
                <ChevronLeft size={18} strokeWidth={2.5} />
              </Link>

              <div className="w-px h-6 bg-outline-variant hidden sm:block shrink-0" />

              {/* Icon & Title */}
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-m3-md bg-primary flex items-center justify-center text-on-primary shrink-0 shadow-elev-2">
                <Target size={20} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <h1 className="text-[17px] md:text-[20px] font-black text-on-surface tracking-tight leading-tight truncate">
                  {t.heading}
                </h1>
                <p className="text-[12px] font-medium text-on-surface-variant hidden sm:block truncate">{t.sub}</p>
              </div>
            </div>

            {/* Create Button */}
            <Button
              variant="filled"
              icon={<Plus strokeWidth={3} />}
              onClick={() => setIsModalOpen(true)}
              className="shrink-0 px-4 md:px-5"
            >
              <span className="hidden sm:inline">{t.newBtn}</span>
            </Button>
          </div>

          {/* Stats bar */}
          {!isLoading && groups.length > 0 && (
            <div className="flex items-center gap-4 pb-4 md:pl-[124px]">
              <div className="flex items-center gap-1.5 bg-primary-container px-2.5 py-1 rounded-m3-sm border border-transparent">
                <Sparkles size={13} className="text-on-primary-container" strokeWidth={2.5} />
                <span className="text-[12px] font-black text-on-primary-container">{groups.length}</span>
                <span className="text-[12px] font-bold text-on-primary-container">{t.total}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-surface-container-high px-2.5 py-1 rounded-m3-sm border border-outline-variant">
                <Users size={13} className="text-on-surface-variant" strokeWidth={2.5} />
                <span className="text-[12px] font-black text-on-surface">
                  {groups.reduce((acc, g) => acc + (g.studentIds?.length ?? 0), 0)}
                </span>
                <span className="text-[12px] font-bold text-on-surface-variant">{t.oquvchi}</span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-40 rounded-m3-lg" />
            ))}
          </div>

        ) : groups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((grp, i) => (
              <motion.div
                key={grp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
              >
                <Link
                  href={`/teacher/ielts/groups/${grp.id}`}
                  className="group flex flex-col bg-surface-container-low rounded-m3-lg border border-outline-variant shadow-elev-1 hover:shadow-elev-2 transition-all duration-200 overflow-hidden h-full"
                >
                  {/* ── Card body with SVG Pattern ── */}
                  <div className="relative px-5 pt-5 pb-5 flex-1 flex flex-col gap-2 z-10">

                    {/* Decorative SVG Mesh Background */}
                    <svg className="absolute inset-0 w-full h-full text-outline-variant opacity-40 z-0 pointer-events-none" fill="currentColor">
                      <pattern id={`dots-${grp.id}`} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="1.5" />
                      </pattern>
                      <rect x="0" y="0" width="100%" height="100%" fill={`url(#dots-${grp.id})`} />
                    </svg>

                    <div className="relative z-10 flex-1 flex flex-col gap-2">
                      {/* Title — hero element */}
                      <h3 className="text-[17px] font-black text-on-surface leading-snug tracking-tight group-hover:text-primary transition-colors line-clamp-2 drop-shadow-sm">
                        {grp.title}
                      </h3>

                      {/* Description */}
                      {grp.description ? (
                        <p className="text-[12px] text-on-surface-variant font-medium line-clamp-2 leading-relaxed">
                          {grp.description}
                        </p>
                      ) : (
                        <div className="h-px" />
                      )}
                    </div>
                  </div>

                  {/* ── Footer: band + code + students ── */}
                  <div className="px-5 py-3 bg-surface-container border-t border-outline-variant flex items-center justify-between gap-2 group-hover:bg-state-hover transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Band badge */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-m3-xs border border-transparent text-[11px] font-black shrink-0 ${bandPill(Number(grp.targetBand))}`}>
                        <Target size={10} strokeWidth={3} />
                        Band {Number(grp.targetBand).toFixed(1)}
                      </span>
                      {/* Code — center-managed groups have no shareable code */}
                      {(grp.managed || grp.centerId) ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-on-secondary-container bg-secondary-container border border-transparent px-1.5 py-0.5 rounded-m3-xs shrink-0">
                          <Building2 size={10} /> Markaz
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 font-mono text-[11px] font-black text-on-surface-variant bg-surface-container-lowest border border-outline-variant px-1.5 py-0.5 rounded-m3-xs shrink-0">
                          <Hash size={10} className="text-primary" />{grp.joinCode}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-[12px] font-bold text-on-surface-variant">
                        <Users size={12} strokeWidth={2.5} />{grp.studentIds?.length ?? 0}
                      </span>
                      <span className="text-[13px] font-black text-primary group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

        ) : (
          <EmptyState
            className="py-28"
            icon={<BookOpen strokeWidth={2} />}
            title={t.empty.title}
            description={t.empty.desc}
            action={
              <Button variant="tonal" icon={<Plus strokeWidth={3} />} onClick={() => setIsModalOpen(true)}>
                {t.empty.btn}
              </Button>
            }
          />
        )}

      </div>
    </div>
  );
}

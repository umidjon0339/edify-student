'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import JoinClassModal from './_components/JoinClassModal';
import { Users, ChevronRight, Plus, BookOpen, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Page, PageHeader, Card, Chip, Avatar, Button, EmptyState, LoadingState,
  MOTION_ON, springTransition,
} from '@/components/student-ui';
import { useStudentLanguage } from '../layout';

// --- TRANSLATION DICTIONARY ---
const CLASSES_TRANSLATIONS: any = {
  uz: {
    title: "Mening Sinflarim", subtitle: "O'qishni qoldirgan joydan davom eting.", joinBtn: "Qo'shilish", emptyTitle: "Sinflar topilmadi", emptyDesc: "Siz hali hech qanday sinfga yozilmagansiz. O'qituvchingizdan 6 xonali kodni so'rang!", emptyAction: "Hozir qo'shilish", students: "O'quvchilar", noDesc: "Tavsif yo'q."
  },
  en: {
    title: "My Classes", subtitle: "Continue where you left off.", joinBtn: "Join Class", emptyTitle: "No classes found", emptyDesc: "You haven't enrolled in any classes yet. Ask your teacher for a 6-digit Join Code!", emptyAction: "Join a class now", students: "Students", noDesc: "No description provided."
  },
  ru: {
    title: "Мои Классы", subtitle: "Продолжайте с того места, где остановились.", joinBtn: "Вступить", emptyTitle: "Классы не найдены", emptyDesc: "Вы еще не записаны ни в один класс. Попросите у учителя 6-значный код присоединения!", emptyAction: "Вступить сейчас", students: "Учеников", noDesc: "Описание отсутствует."
  }
};

// ============================================================================
// 🟢 GLOBAL CACHE (Survives page navigation, saves Firebase reads)
// ============================================================================
const globalClassesCache: Record<string, { data: any[], timestamp: number }> = {};
const CACHE_LIFESPAN = 60 * 1000; // 60 seconds

// ============================================================================
// 3. MAIN PAGE COMPONENT
// ============================================================================
export default function MyClassesPage() {
  const { user } = useAuth();
  const { lang } = useStudentLanguage();
  const t = CLASSES_TRANSLATIONS[lang] || CLASSES_TRANSLATIONS['en'];

  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  useEffect(() => {
    async function fetchClasses() {
      if (!user) return;

      const now = Date.now();
      const cached = globalClassesCache[user.uid];

      // 🟢 1. INSTANT CACHE LOAD
      if (cached) {
        setClasses(cached.data);
        setLoading(false); // Instantly remove skeleton loader

        // If data is fresh (< 60s old), stop here. ZERO FIREBASE READS!
        if (now - cached.timestamp < CACHE_LIFESPAN) {
          return;
        }
      } else {
        // Only show skeleton if we have no cache at all
        setLoading(true);
      }

      // 🟢 2. BACKGROUND FETCH (or initial fetch)
      try {
        const q = query(
          collection(db, 'classes'),
          where('studentIds', 'array-contains', user.uid)
        );
        const snap = await getDocs(q);
        // Center IELTS groups live on the IELTS page (their linked class carries
        // schedule/attendance data only) — hide them here to avoid a duplicate card.
        const fetchedClasses = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(cls => !cls.ieltsGroupId);

        // 🟢 3. UPDATE CACHE & UI
        globalClassesCache[user.uid] = {
          data: fetchedClasses,
          timestamp: Date.now()
        };

        setClasses(fetchedClasses);
      } catch (e) {
        console.error("Error fetching classes:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchClasses();
  }, [user]);

  const joinButton = (
    <Button onClick={() => setIsJoinModalOpen(true)} icon={<Plus size={18} strokeWidth={3} />}>
      {t.joinBtn}
    </Button>
  );

  // --- SKELETON LOADING ---
  if (loading) {
    return (
      <Page width="wide">
        <PageHeader title={t.title} />
        <LoadingState rows={3} />
      </Page>
    );
  }

  return (
    <Page width="wide">
      {/* MODAL */}
      <JoinClassModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} lang={lang} />

      <PageHeader title={t.title} actions={joinButton} />

      {/* CLASS GRID */}
      {classes.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={30} strokeWidth={2.5} />}
          title={t.emptyTitle}
          description={t.emptyDesc}
          action={
            <Button
              size="lg"
              onClick={() => setIsJoinModalOpen(true)}
              trailingIcon={<ArrowRight size={18} strokeWidth={3} />}
            >
              {t.emptyAction}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-s-gap md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls, index) => (
            <motion.div
              key={cls.id}
              initial={MOTION_ON ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: MOTION_ON ? index * 0.05 : 0 }}
            >
              <Link href={`/classes/${cls.id}`} className="block h-full">
                <Card interactive flush className="group flex h-full flex-col justify-between overflow-hidden">
                  <div className="p-s-card">
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <Chip status="neutral" className="uppercase tracking-widest">
                        {cls.joinCode || 'CLASS'}
                      </Chip>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-state-hover text-on-surface-variant transition-colors group-hover:bg-primary group-hover:text-on-primary">
                        <ChevronRight size={20} strokeWidth={3} />
                      </span>
                    </div>

                    <h3 className="s-display mb-2 line-clamp-2 text-[20px] font-bold leading-tight text-on-surface transition-colors group-hover:text-primary">
                      {cls.title}
                    </h3>
                    {/* Edify style: no "No description" filler — only a real one. */}
                    {cls.description && (
                      <p className="line-clamp-2 text-[13.5px] font-bold leading-relaxed text-on-surface-variant">
                        {cls.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 px-s-card pb-s-card">
                    <span className="flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-on-surface-variant">
                      <Users size={16} strokeWidth={3} />
                      {cls.studentIds?.length || 0} {t.students}
                    </span>
                    {cls.teacherName && (
                      <span className="flex min-w-0 items-center gap-2 text-[13px] font-bold text-on-surface">
                        <Avatar name={cls.teacherName} size="xs" shape="square" />
                        <span className="truncate">{cls.teacherName}</span>
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </Page>
  );
}

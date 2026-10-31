'use client';

/**
 * Class card — deliberately minimal: icon · class name, then the center it
 * belongs to (center groups only) and how many students joined; the whole
 * card opens the class. The description and join code live in the class
 * page's header (app/teacher/classes/[classId]/page.tsx).
 * Pillbar look (docs/UI_KIT.md): .t-panel card, accent icon chip.
 */
import { Users, BookOpen, Building2 } from 'lucide-react';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { useTeacherLanguage } from '@/app/teacher/layout';

const CARD_TRANSLATIONS: Record<string, { students: string; centerGroup: string }> = {
  uz: { students: "o'quvchi", centerGroup: "Markaz guruhi" },
  en: { students: "students", centerGroup: "Center group" },
  ru: { students: "учеников", centerGroup: "Группа центра" },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } },
  hover: { y: -3, transition: { duration: 0.2 } },
  tap: { scale: 0.98 },
};

interface Props {
  cls: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- classes doc, shape owned by the page
  /** Kept for call-site compatibility; cards no longer rotate tones. */
  theme?: string;
  /** Resolved center name when cls.centerId is set. */
  centerName?: string;
}

export default function ClassCard({ cls, centerName }: Props) {
  const { lang } = useTeacherLanguage();
  const t = CARD_TRANSLATIONS[lang] || CARD_TRANSLATIONS.uz;

  return (
    <motion.div variants={cardVariants} whileHover="hover" whileTap="tap" className="h-full">
      <Link
        href={`/teacher/classes/${cls.id}`}
        className="t-panel t-ring-hover group flex h-full flex-col gap-3.5 rounded-m3-xl p-4 md:p-5"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="t-icon-chip grid h-12 w-12 shrink-0 place-items-center rounded-m3-lg transition-transform duration-300 group-hover:scale-105">
            <BookOpen size={21} strokeWidth={2.3} />
          </span>
          <h3 className="min-w-0 flex-1 truncate font-t-display text-[16px] md:text-[17px] font-extrabold tracking-tight text-on-surface transition-colors group-hover:text-primary">
            {cls.title}
          </h3>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2">
          {/* Which center (center groups only). */}
          {cls.centerId && (
            <span className="t-glass-pill inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold text-on-surface">
              <Building2 size={14} className="shrink-0 text-primary" />
              <span className="truncate">{centerName || t.centerGroup}</span>
            </span>
          )}
          {/* How many students joined. */}
          <span className="t-icon-chip-soft inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold tabular-nums">
            <Users size={14} /> {cls.studentIds?.length || 0} {t.students}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

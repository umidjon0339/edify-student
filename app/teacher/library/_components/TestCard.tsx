'use client';

/**
 * Library test card — deliberately minimal: the test name, the two quick
 * actions (classroom game · print) and the question count. Everything else
 * (status, created date, access code, duration) lives inside EditTestModal,
 * which opens on click. Styled with the pillbar recipes (docs/UI_KIT.md):
 * .t-panel card, .t-glass-pill round actions, a tinted count pill.
 */
import Link from 'next/link';
import { Gamepad2, Layers } from 'lucide-react';
import PrintLauncher from '@/app/teacher/create/_components/PrintLauncher';
import { useTeacherLanguage } from '@/app/teacher/layout';
import { cn } from '@/components/ui';

const CARD_TRANSLATIONS: Record<string, { play: string; items: string }> = {
  uz: { play: "Arqon tortish o'yini", items: "ta savol" },
  en: { play: "Play Tug of War", items: "questions" },
  ru: { play: "Игра «Перетягивание каната»", items: "вопр." },
};

const ACTION = "t-glass-pill grid h-10 w-10 place-items-center rounded-full text-on-surface-variant hover:text-primary";

interface Props {
  test: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- custom_tests doc, shape owned by the library page
  /** Kept for call-site compatibility; the card no longer rotates tones. */
  theme?: string;
  onManage: () => void;
}

export default function TestCard({ test, onManage }: Props) {
  const { lang } = useTeacherLanguage();
  const t = CARD_TRANSLATIONS[lang] || CARD_TRANSLATIONS.uz;
  const isActive = test.status !== 'archived';

  return (
    <div
      onClick={onManage}
      className={cn(
        "t-panel t-ring-hover group relative flex h-full cursor-pointer flex-col gap-4 rounded-m3-xl p-5",
        !isActive && "opacity-60 grayscale hover:opacity-100 hover:grayscale-0",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 pt-1.5 font-t-display text-[16px] md:text-[17px] font-extrabold leading-snug tracking-tight text-on-surface line-clamp-2 transition-colors group-hover:text-primary">
          {test.title}
        </h3>
        {/* Quick actions — clicks must not open the manage modal. */}
        <div onClick={(e) => e.stopPropagation()} className="flex shrink-0 items-center gap-2">
          {isActive && (
            <Link href={`/teacher/games/tug-of-war?testId=${test.id}`} title={t.play} aria-label={t.play} className={ACTION}>
              <Gamepad2 size={18} />
            </Link>
          )}
          <PrintLauncher title={test.title} questions={test.questions} className={ACTION} />
        </div>
      </div>

      <span className="t-icon-chip-soft mt-auto inline-flex w-max items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold tabular-nums">
        <Layers size={14} /> {test.questionCount ?? test.questions?.length ?? 0} {t.items}
      </span>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Gamepad2, ChevronRight, Crown, Sparkles } from 'lucide-react';
import { Page, PageHeader, Card, Tile, Chip } from '@/components/student-ui';
import { useStudentLanguage } from '../layout'; // Assuming your context is exported from the layout

// --- TRANSLATIONS ---
const PAGE_TRANSLATIONS = {
  uz: {
    title: "O'yinlar",
    subtitle: "Aql-idrokingizni va mantiqiy fikrlashni charxlang",
    games: {
      checkers: {
        title: "Shashka",
        desc: "Klassik mantiqiy stol o'yini. Kompyuterga qarshi yoki do'stingiz bilan o'ynang.",
        play: "O'ynash"
      }
    }
  },
  en: {
    title: "Games",
    subtitle: "Sharpen your mind and logical thinking",
    games: {
      checkers: {
        title: "Checkers",
        desc: "The classic strategic board game. Play against the computer or a friend.",
        play: "Play Now"
      }
    }
  },
  ru: {
    title: "Игры",
    subtitle: "Тренируйте свой ум и логическое мышление",
    games: {
      checkers: {
        title: "Шашки",
        desc: "Классическая стратегическая настольная игра. Играйте против компьютера или друга.",
        play: "Играть"
      }
    }
  }
};

type LangType = 'uz' | 'en' | 'ru';

export default function GamesPage() {
  const { lang } = useStudentLanguage();
  const currentLang = (lang as LangType) || 'en';
  const t = PAGE_TRANSLATIONS[currentLang];

  return (
    <Page width="wide">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            <span className="s-chip grid h-11 w-11 place-items-center rounded-full">
              <Gamepad2 size={22} strokeWidth={2.5} />
            </span>
            {t.title}
          </span>
        }
      />

      {/* Games Grid */}
      <div className="grid grid-cols-1 gap-s-gap-lg md:grid-cols-2 lg:grid-cols-3">

        {/* Checkers Card */}
        <Link href="/games/checkers" className="block">
          <Card interactive className="group flex h-full flex-col">
            <div className="mb-4 flex items-start justify-between gap-3">
              <Tile tone="primary" size="lg">
                <Crown size={28} strokeWidth={2.5} />
              </Tile>
              <Chip status="gold" icon={<Sparkles size={12} />}>
                Top
              </Chip>
            </div>

            <div className="flex-1">
              <h3 className="s-display mb-2 text-[19px] font-bold leading-tight">
                {t.games.checkers.title}
              </h3>
              <p className="mb-6 text-[13.5px] font-bold leading-relaxed text-on-surface-variant">
                {t.games.checkers.desc}
              </p>
            </div>

            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="text-[15px] font-extrabold text-primary">
                {t.games.checkers.play}
              </span>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-state-hover text-on-surface-variant transition-colors duration-m3-fast group-hover:bg-primary group-hover:text-on-primary">
                <ChevronRight size={18} strokeWidth={3} />
              </span>
            </div>
          </Card>
        </Link>

        {/* You can add more game cards here in the future (e.g., Chess, Sudoku, Math Games) */}

      </div>
    </Page>
  );
}

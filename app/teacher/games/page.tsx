"use client";

import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { Clock, Play } from "lucide-react";

import { useTeacherLanguage } from "@/app/teacher/layout";
import { Card, PageHeader, cn, MOTION_ON } from "@/components/ui";
import GameArt, { type GameArtKey } from "./_components/GameArt";

/**
 * Classroom games hub (docs/GAMES.md). Every game plays questions from the
 * teacher's own tests (`custom_tests`). Clean cards: animated scene, name,
 * one line, one button. Games with an `href` are live; the rest are "coming soon".
 */

const TR = {
  uz: {
    title: "O'yinlar",
    subtitle: "Testlaringizdagi savollar bilan sinf o'yinlari.",
    play: "Boshlash", soon: "Tez kunda",
    games: {
      tug: { title: "Arqon tortish", text: "Ikki jamoa bellashadi: har to'g'ri javob arqonni o'z tomoniga tortadi." },
      quiz: { title: "Jonli viktorina", text: "O'quvchilar telefondan qo'shilib, tez va to'g'ri javob beradi." },
      board: { title: "Savol doskasi", text: "Jamoalar navbat bilan ball va savol tanlaydi." },
      wheel: { title: "Omad g'ildiragi", text: "Jamoalar g'ildirakni aylantiradi va tushgan ochko uchun javob beradi." },
      penalty: { title: "Penalti seriyasi", text: "Ikki jamoa penalti tepadi: to'g'ri javob — zarba, darvozabonni aldang!" },
      caravan: { title: "Karvon yo'li", text: "Barcha jamoalar har savolga javob beradi: tavakkal qiling va karvonni Xivaga birinchi yetkazing!" },
    },
  },
  ru: {
    title: "Игры",
    subtitle: "Игры для класса с вопросами из ваших тестов.",
    play: "Начать", soon: "Скоро",
    games: {
      tug: { title: "Перетягивание каната", text: "Две команды соревнуются: каждый верный ответ тянет канат к себе." },
      quiz: { title: "Живая викторина", text: "Ученики подключаются с телефона и отвечают быстро и верно." },
      board: { title: "Доска вопросов", text: "Команды по очереди выбирают баллы и вопрос." },
      wheel: { title: "Колесо удачи", text: "Команды крутят колесо и отвечают за выпавшие очки." },
      penalty: { title: "Серия пенальти", text: "Две команды бьют пенальти: верный ответ — удар, обманите вратаря!" },
      caravan: { title: "Караванный путь", text: "Все команды отвечают на каждый вопрос: рискните и первыми приведите караван в Хиву!" },
    },
  },
  en: {
    title: "Games",
    subtitle: "Classroom games played with questions from your tests.",
    play: "Play", soon: "Coming soon",
    games: {
      tug: { title: "Tug of War", text: "Two teams compete: every correct answer pulls the rope their way." },
      quiz: { title: "Live quiz", text: "Students join from their phones and answer fast and right." },
      board: { title: "Question board", text: "Teams take turns picking points and a question." },
      wheel: { title: "Lucky wheel", text: "Teams spin the wheel and answer for the points it lands on." },
      penalty: { title: "Penalty shootout", text: "Two teams take penalties: a correct answer earns a shot — beat the keeper!" },
      caravan: { title: "Caravan Road", text: "Every team answers every question: take a risk and be the first caravan to reach Khiva!" },
    },
  },
};

const GAMES: { key: GameArtKey; href: string | null }[] = [
  { key: "tug", href: "/teacher/games/tug-of-war" },
  { key: "quiz", href: null },
  { key: "board", href: "/teacher/games/question-board" },
  { key: "wheel", href: "/teacher/games/lucky-wheel" },
  { key: "penalty", href: "/teacher/games/penalty" },
  { key: "caravan", href: "/teacher/games/caravan" },
];

export default function TeacherGamesPage() {
  const { lang } = useTeacherLanguage();
  const t = TR[lang] || TR.uz;
  const reduce = useReducedMotion();
  const on = MOTION_ON && !reduce;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 md:px-6">
      <PageHeader title={t.title} subtitle={t.subtitle} />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map(({ key, href }) => {
          const g = t.games[key];
          const live = href !== null;
          const body = (
            <Card hoverable={live} className="group flex h-full flex-col overflow-hidden !p-0">
              <div className="relative aspect-[16/9] overflow-hidden">
                <div className={cn(
                  "h-full w-full",
                  on && live && "transition-transform duration-500 ease-out group-hover:scale-[1.04]",
                )}>
                  <GameArt game={key} on={on} />
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-1.5 px-5 pb-5 pt-4">
                <h2 className="text-[18px] font-bold leading-tight text-on-surface">{g.title}</h2>
                <p className="mb-4 line-clamp-2 text-[13.5px] font-medium leading-relaxed text-on-surface-variant">{g.text}</p>
                {/* A styled span, not a <button>: the whole card is the link. */}
                <span className={cn(
                  "flex h-t-control-lg w-full items-center justify-center gap-2 rounded-m3-btn text-[15px] font-bold",
                  "[&_svg]:h-[18px] [&_svg]:w-[18px]",
                  live
                    ? "bg-primary text-on-primary shadow-elev-1 transition-[box-shadow,filter] duration-t-fast group-hover:shadow-elev-2 group-hover:brightness-110 group-active:brightness-95"
                    : "bg-surface-container-high text-on-surface-variant",
                  "mt-auto",
                )}>
                  {live ? <Play fill="currentColor" /> : <Clock />}
                  {live ? t.play : t.soon}
                </span>
              </div>
            </Card>
          );
          return live ? (
            <Link key={key} href={href} aria-label={`${g.title} — ${t.play}`} className="block rounded-m3-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {body}
            </Link>
          ) : (
            <div key={key} aria-disabled>{body}</div>
          );
        })}
      </div>
    </div>
  );
}

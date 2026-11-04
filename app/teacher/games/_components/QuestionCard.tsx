'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, TimerOff, Trophy, X } from 'lucide-react';
import LatexRenderer from '@/components/LatexRenderer';
import { cn } from '@/components/ui';
import type { GameQuestion } from '../_lib/questionDeck';
import { GAME_TEAMS, OPTION_COLORS, STAGE } from '../_lib/stage';

/**
 * The open question of a team game (Savol doskasi, Omad g'ildiragi,
 * Penalti seriyasi): team header + timer, question, answer buttons, then the
 * result row with one continue button (none without `onNext` — the game moves
 * on by itself). Presentational — the game's engine owns every rule.
 */

export type CardOutcome = 'correct' | 'wrong' | 'timeout';

export interface QuestionCardText {
  turn: string;
  correct: string;
  wrong: string;
  timeout: string;
  next: string;
  nextTurn: (name: string) => string;
  results: string;
  plusPoints: (n: number) => string;
}

/** Long questions get a smaller font so they still fit a projector. */
export function questionSize(text: string): string {
  const n = text.length;
  if (n > 260) return 'text-[clamp(15px,2.2vh,24px)]';
  if (n > 140) return 'text-[clamp(17px,2.8vh,30px)]';
  if (n > 60) return 'text-[clamp(19px,3.4vh,38px)]';
  return 'text-[clamp(22px,4.4vh,50px)]';
}

/** Circular countdown in the card header. */
export function TimerRing({ remainingMs, limitMs, color, animate }: { remainingMs: number; limitMs: number; color: string; animate: boolean }) {
  const secs = Math.ceil(remainingMs / 1000);
  const urgent = secs <= 5;
  const R = 26;
  const C = 2 * Math.PI * R;
  const frac = Math.max(0, Math.min(1, remainingMs / limitMs));
  return (
    <motion.div
      className="relative h-[clamp(44px,7vh,72px)] w-[clamp(44px,7vh,72px)]"
      animate={urgent && animate ? { scale: [1, 1.12, 1] } : { scale: 1 }}
      transition={urgent ? { duration: 0.5, repeat: Infinity } : undefined}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx={32} cy={32} r={R} fill="var(--m3-surface-container-lowest)" stroke="rgba(255,255,255,0.35)" strokeWidth={6} />
        <circle
          cx={32} cy={32} r={R} fill="none"
          stroke={urgent ? STAGE.wrong : color}
          strokeWidth={6} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-t-display text-[clamp(16px,2.6vh,28px)] font-black tabular-nums"
        style={{ color: urgent ? STAGE.wrong : 'var(--m3-on-surface)' }}
      >
        {secs}
      </span>
    </motion.div>
  );
}

interface Props {
  question: GameQuestion;
  /** Answering team. */
  turn: number;
  /** Team that plays after this one; null = this was the last question. */
  nextTeam: number | null;
  names: string[];
  /** Big header figure: the tile number, the points at stake… */
  badge: React.ReactNode;
  /** true once answered (or timed out). */
  done: boolean;
  outcome: CardOutcome | null;
  picked: string | null;
  gained: number | null;
  timeLimitMs: number | null;
  remainingMs: number | null;
  /** Shared-layout id to morph out of (the board's tile). */
  morphId?: string;
  onAnswer: (optionId: string) => void;
  /** Continue button after the answer; omit when the game moves on by itself. */
  onNext?: () => void;
  animate: boolean;
  t: QuestionCardText;
}

export default function QuestionCard({
  question: q, turn, nextTeam, names, badge, done, outcome, picked, gained, timeLimitMs, remainingMs,
  morphId, onAnswer, onNext, animate, t,
}: Props) {
  const team = GAME_TEAMS[turn];
  const morph = morphId !== undefined;
  const correctId = q.options.find((o) => o.id === q.source.answer)?.id ?? null;

  return (
    <motion.div
      className="absolute inset-0 z-20 flex items-center justify-center bg-scrim-bg p-[clamp(8px,1.4vw,24px)] backdrop-blur-[3px]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="relative flex max-h-full w-full max-w-[min(1180px,100%)] flex-col">
        {/* Morphs out of the picked tile */}
        <motion.div
          layoutId={morphId}
          className="absolute inset-0 rounded-[clamp(16px,1.8vw,30px)] bg-surface-container-lowest shadow-elev-3"
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        />

        <motion.div
          className="relative flex min-h-0 flex-col overflow-hidden rounded-[clamp(16px,1.8vw,30px)]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.25, delay: morph ? 0.22 : 0 }}
        >
          {/* Header band in the answering team's color */}
          <div className="flex shrink-0 items-center gap-3 px-[clamp(12px,1.6vw,28px)] py-[clamp(8px,1.2vh,14px)]" style={{ background: team.solid }}>
            <div className="min-w-0 flex-1">
              <p className="text-[clamp(10px,1.3vh,13px)] font-bold uppercase tracking-[0.16em] text-white/80">{t.turn}</p>
              <p className="truncate text-[clamp(15px,2.3vh,24px)] font-extrabold text-white">{names[turn]}</p>
            </div>
            <span className="font-t-display text-[clamp(26px,5vh,56px)] font-black leading-none text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.18)]">
              {badge}
            </span>
            <div className="flex flex-1 justify-end">
              {timeLimitMs !== null && remainingMs !== null && !done ? (
                <TimerRing remainingMs={remainingMs} limitMs={timeLimitMs} color={team.solid} animate={animate} />
              ) : timeLimitMs === null ? (
                <TimerOff className="h-[clamp(20px,3vh,30px)] w-[clamp(20px,3vh,30px)] text-white/70" />
              ) : null}
            </div>
          </div>

          {/* Question */}
          <div className="min-h-0 shrink overflow-y-auto px-[clamp(14px,2vw,40px)] pb-[clamp(8px,1.4vh,18px)] pt-[clamp(12px,2vh,26px)] text-center custom-scrollbar">
            {q.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={q.imageUrl} alt="" className="mx-auto mb-[clamp(8px,1.4vh,18px)] max-h-[clamp(90px,24vh,300px)] rounded-[clamp(10px,1vw,16px)] object-contain" />
            )}
            <LatexRenderer latex={q.text} className={cn('block font-bold leading-snug text-on-surface', questionSize(q.text))} />
          </div>

          {/* Answers — open together with the question */}
          <div className="shrink-0 px-[clamp(12px,1.6vw,28px)] pb-[clamp(12px,2vh,26px)]">
            <div className="flex flex-col gap-[clamp(8px,1.2vh,14px)]">
              <div className={cn('grid gap-[clamp(8px,1vw,14px)]', q.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
                {q.options.map((o, idx) => {
                  const isCorrect = done && o.id === correctId;
                  const isPicked = done && o.id === picked;
                  const faded = done && !isCorrect && !isPicked;
                  const fill = isCorrect ? STAGE.correct : isPicked ? STAGE.wrong : undefined;
                  return (
                    <motion.button
                      key={o.id}
                      type="button"
                      disabled={done}
                      onClick={() => onAnswer(o.id)}
                      className={cn(
                        'flex min-h-[clamp(48px,8vh,96px)] items-center gap-[clamp(8px,0.9vw,16px)] rounded-[clamp(12px,1.2vw,20px)] border-2 px-[clamp(10px,1vw,18px)] py-[clamp(6px,1vh,12px)] text-left shadow-elev-1 transition-colors',
                        fill ? 'border-transparent text-white' : 'border-outline-variant bg-surface-container-lowest text-on-surface',
                        !done && 'hover:border-current',
                      )}
                      style={fill ? { background: fill } : undefined}
                      initial={animate ? { opacity: 0, y: 24, scale: 0.94 } : { opacity: 0 }}
                      animate={{
                        opacity: faded ? 0.4 : 1, y: 0,
                        scale: isCorrect && animate ? [1, 1.05, 1] : 1,
                        x: isPicked && !isCorrect && animate ? [0, -10, 10, -7, 7, 0] : 0,
                      }}
                      // Springs take only 2 values — the pulse/shake keyframes get tweens.
                      transition={{
                        default: { type: 'spring', stiffness: 380, damping: 24, delay: done ? 0 : animate ? idx * 0.07 : 0 },
                        scale: { duration: 0.5, ease: 'easeOut' },
                        x: { duration: 0.45, ease: 'easeInOut' },
                      }}
                      whileHover={!done && animate ? { y: -3 } : undefined}
                    >
                      <span
                        className="flex h-[clamp(30px,5vh,52px)] w-[clamp(30px,5vh,52px)] shrink-0 items-center justify-center rounded-[clamp(8px,0.8vw,14px)] font-t-display text-[clamp(15px,2.6vh,28px)] font-black text-white"
                        style={{ background: fill ? 'rgba(255,255,255,0.22)' : OPTION_COLORS[idx % OPTION_COLORS.length] }}
                      >
                        {isCorrect ? <Check className="h-[60%] w-[60%]" strokeWidth={3.5} /> : isPicked ? <X className="h-[60%] w-[60%]" strokeWidth={3.5} /> : o.letter}
                      </span>
                      <span className="min-w-0 flex-1 text-[clamp(14px,2.4vh,28px)] font-bold leading-snug">
                        <LatexRenderer latex={o.text} />
                        {o.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={o.imageUrl} alt="" className="mt-1 max-h-[clamp(36px,8vh,90px)] rounded-lg object-contain" />
                        )}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Result */}
            <AnimatePresence>
              {done && (
                <motion.div
                  className="mt-[clamp(10px,1.6vh,20px)] flex items-center gap-[clamp(12px,2vw,32px)]"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-[clamp(10px,1.4vw,22px)]">
                    <motion.p
                      className="font-t-display text-[clamp(24px,4.4vh,46px)] font-black leading-none"
                      style={{ color: outcome === 'correct' ? STAGE.correct : STAGE.wrong }}
                      initial={animate ? { scale: 0.5 } : false}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.2 }}
                    >
                      {outcome === 'correct' ? t.correct : outcome === 'timeout' ? t.timeout : t.wrong}
                    </motion.p>
                    {outcome === 'correct' && gained !== null && (
                      <motion.span
                        className="rounded-full px-[0.8em] py-[0.25em] font-t-display text-[clamp(20px,3.6vh,38px)] font-black text-white shadow-elev-2"
                        style={{ background: STAGE.correct }}
                        initial={animate ? { scale: 0, rotate: -12 } : false}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.35 }}
                      >
                        {t.plusPoints(gained)}
                      </motion.span>
                    )}
                  </div>

                  {onNext && (
                    <motion.button
                      type="button"
                      onClick={onNext}
                      className="inline-flex shrink-0 items-center gap-[0.5em] rounded-full px-[1.4em] py-[0.65em] text-[clamp(14px,2vh,20px)] font-extrabold text-white shadow-elev-2"
                      style={{ background: nextTeam === null ? `linear-gradient(160deg, ${STAGE.gold}, ${STAGE.goldDeep})` : GAME_TEAMS[nextTeam].solid }}
                      whileHover={animate ? { scale: 1.04 } : undefined}
                      whileTap={animate ? { scale: 0.96 } : undefined}
                    >
                      {nextTeam === null ? (
                        <>
                          <Trophy className="h-[1.2em] w-[1.2em]" />
                          <span>{t.results}</span>
                        </>
                      ) : (
                        <>
                          <span className="flex flex-col items-start leading-tight">
                            <span>{t.next}</span>
                            <span className="text-[0.7em] font-bold opacity-85">{t.nextTurn(names[nextTeam])}</span>
                          </span>
                          <ArrowRight className="h-[1.2em] w-[1.2em]" />
                        </>
                      )}
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Check, Eye, Lock, TimerOff, Undo2, X } from 'lucide-react';
import LatexRenderer from '@/components/LatexRenderer';
import { cn } from '@/components/ui';
import type { GameQuestion } from '../../_lib/questionDeck';
import { GAME_TEAMS, OPTION_COLORS, STAGE } from '../../_lib/stage';
import { questionSize, TimerRing } from '../../_components/QuestionCard';
import type { Bet, Move } from '../_lib/engine';
import { DESERT } from '../_lib/theme';
import { outcomeOf, type OutcomeText } from './BetPanel';
import { CamelGlyph } from './Camel';

/**
 * The open question of a Karvon yo'li round: EVERY team answers it.
 * Question + options (display only) on top; one column per team below where
 * the teacher taps the letter that team holds up. A tapped answer shows only
 * a lock (no letter on the projector, so later teams can't copy it) with a
 * "Change" link. On reveal the correct option lights up and each column shows
 * the team's letter, ✓/✗ and what the caravan gets. Presentational.
 */

export interface RoundText extends OutcomeText {
  questionNo: (n: number) => string;
  answersTitle: string;
  accepted: string;
  change: string;
  noAnswer: string;
  timeUp: string;
  reveal: string;
  go: string;
}

interface Props {
  question: GameQuestion;
  round: number;
  names: string[];
  bets: (Bet | null)[];
  answers: (string | null)[];
  /** Set once revealed. */
  moves: Move[] | null;
  timeLimitMs: number | null;
  remainingMs: number | null;
  timeUp: boolean;
  onAnswer: (team: number, optionId: string | null) => void;
  onReveal: () => void;
  onGo: () => void;
  animate: boolean;
  t: RoundText;
}

export default function RoundCard({
  question: q, round, names, bets, answers, moves, timeLimitMs, remainingMs, timeUp,
  onAnswer, onReveal, onGo, animate, t,
}: Props) {
  const revealed = moves !== null;
  const correctId = q.options.find((o) => o.id === q.source.answer)?.id ?? null;
  const letterOf = (id: string | null) => q.options.find((o) => o.id === id)?.letter ?? '—';

  return (
    <motion.div
      className="absolute inset-0 z-20 flex items-center justify-center bg-scrim-bg p-[clamp(8px,1.4vw,24px)] backdrop-blur-[3px]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="flex max-h-full w-full max-w-[min(1240px,100%)] flex-col overflow-hidden rounded-[clamp(16px,1.8vw,30px)] bg-surface-container-lowest shadow-elev-3"
        initial={animate ? { y: 30, scale: 0.97 } : false}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 px-[clamp(12px,1.6vw,28px)] py-[clamp(6px,1vh,12px)]" style={{ background: DESERT.header }}>
          <p className="flex-1 font-t-display text-[clamp(18px,3.2vh,36px)] font-black text-white">{t.questionNo(round)}</p>
          {!revealed && timeUp && (
            <motion.p
              className="rounded-full bg-white px-[0.9em] py-[0.25em] text-[clamp(12px,1.9vh,20px)] font-extrabold"
              style={{ color: STAGE.wrong }}
              initial={animate ? { scale: 0.6, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }}
            >
              {t.timeUp}
            </motion.p>
          )}
          <div className="flex justify-end">
            {!revealed && !timeUp && timeLimitMs !== null && remainingMs !== null ? (
              <TimerRing remainingMs={remainingMs} limitMs={timeLimitMs} color={STAGE.goldDeep} animate={animate} />
            ) : timeLimitMs === null && !revealed ? (
              <TimerOff className="h-[clamp(20px,3vh,30px)] w-[clamp(20px,3vh,30px)] text-white/70" />
            ) : null}
          </div>
        </div>

        {/* Question */}
        <div className="min-h-0 shrink overflow-y-auto px-[clamp(14px,2vw,40px)] pb-[clamp(6px,1vh,14px)] pt-[clamp(10px,1.6vh,22px)] text-center custom-scrollbar">
          {q.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={q.imageUrl} alt="" className="mx-auto mb-[clamp(8px,1.2vh,16px)] max-h-[clamp(80px,20vh,260px)] rounded-[clamp(10px,1vw,16px)] object-contain" />
          )}
          <LatexRenderer latex={q.text} className={cn('block font-bold leading-snug text-on-surface', questionSize(q.text))} />
        </div>

        {/* Options — display only; the teams answer in their columns */}
        <div className="shrink-0 px-[clamp(12px,1.6vw,28px)]">
          <div className={cn('grid gap-[clamp(6px,0.8vw,12px)]', q.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
            {q.options.map((o, idx) => {
              const isCorrect = revealed && o.id === correctId;
              const faded = revealed && !isCorrect;
              return (
                <motion.div
                  key={o.id}
                  className={cn(
                    'flex min-h-[clamp(40px,6.4vh,78px)] items-center gap-[clamp(8px,0.8vw,14px)] rounded-[clamp(10px,1vw,18px)] border-2 px-[clamp(8px,0.9vw,16px)] py-[clamp(4px,0.8vh,10px)]',
                    isCorrect ? 'border-transparent text-white' : 'border-outline-variant bg-surface-container-lowest text-on-surface',
                  )}
                  style={isCorrect ? { background: STAGE.correct } : undefined}
                  initial={animate ? { opacity: 0, y: 16 } : { opacity: 0 }}
                  animate={{ opacity: faded ? 0.4 : 1, y: 0, scale: isCorrect && animate ? [1, 1.04, 1] : 1 }}
                  transition={{ default: { type: 'spring', stiffness: 380, damping: 26, delay: revealed ? 0 : animate ? idx * 0.06 : 0 }, scale: { duration: 0.5 } }}
                >
                  <span
                    className="flex h-[clamp(26px,4.2vh,46px)] w-[clamp(26px,4.2vh,46px)] shrink-0 items-center justify-center rounded-[clamp(7px,0.7vw,12px)] font-t-display text-[clamp(14px,2.3vh,26px)] font-black text-white"
                    style={{ background: isCorrect ? 'rgba(255,255,255,0.22)' : OPTION_COLORS[idx % OPTION_COLORS.length] }}
                  >
                    {isCorrect ? <Check className="h-[60%] w-[60%]" strokeWidth={3.5} /> : o.letter}
                  </span>
                  <span className="min-w-0 flex-1 text-[clamp(13px,2.2vh,26px)] font-bold leading-snug">
                    <LatexRenderer latex={o.text} />
                    {o.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.imageUrl} alt="" className="mt-1 max-h-[clamp(30px,6vh,72px)] rounded-lg object-contain" />
                    )}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Team answers */}
        <div className="shrink-0 px-[clamp(12px,1.6vw,28px)] pb-[clamp(10px,1.6vh,22px)] pt-[clamp(8px,1.4vh,18px)]">
          <div className="flex items-end gap-[clamp(8px,1vw,16px)]">
            <div className="grid min-w-0 flex-1 gap-[clamp(6px,0.7vw,12px)]" style={{ gridTemplateColumns: `repeat(${names.length}, minmax(0, 1fr))` }}>
              {names.map((name, i) => {
                const c = GAME_TEAMS[i];
                const picked = answers[i];
                const m = moves?.[i];
                const out = m ? outcomeOf(m, t) : null;
                return (
                  <div key={i} className="flex min-w-0 flex-col gap-[clamp(3px,0.6vh,7px)] rounded-[clamp(10px,1vw,16px)] border-2 px-[clamp(6px,0.7vw,12px)] py-[clamp(4px,0.7vh,9px)]" style={{ borderColor: c.solid, background: c.tint }}>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="min-w-0 flex-1 truncate text-[clamp(11px,1.6vh,17px)] font-extrabold" style={{ color: c.solid }}>{name}</p>
                      {bets[i] !== null && (
                        <span className="flex shrink-0 items-center gap-0.5 rounded-full px-[0.5em] py-[0.05em] text-[clamp(10px,1.4vh,14px)] font-black text-white" style={{ background: c.solid }}>
                          {bets[i]} <CamelGlyph color="#fff" className="h-[0.9em] w-[1.1em]" />
                        </span>
                      )}
                    </div>

                    {m && out ? (
                      <div className="flex h-[clamp(30px,4.6vh,52px)] items-center gap-[clamp(6px,0.6vw,10px)]">
                        <span
                          className="flex h-full aspect-square shrink-0 items-center justify-center rounded-[clamp(7px,0.7vw,12px)] font-t-display text-[clamp(14px,2.3vh,26px)] font-black text-white"
                          style={{ background: m.correct ? STAGE.correct : STAGE.wrong }}
                        >
                          {m.picked === null ? '—' : letterOf(m.picked)}
                        </span>
                        {m.correct ? <Check className="h-[clamp(16px,2.4vh,26px)] w-[clamp(16px,2.4vh,26px)] shrink-0" style={{ color: STAGE.correct }} strokeWidth={3.5} />
                          : <X className="h-[clamp(16px,2.4vh,26px)] w-[clamp(16px,2.4vh,26px)] shrink-0" style={{ color: STAGE.wrong }} strokeWidth={3.5} />}
                        <span className="min-w-0 truncate font-t-display text-[clamp(13px,2.1vh,22px)] font-black" style={{ color: out.color }}>
                          {m.picked === null && !m.correct && m.event !== 'storm' ? t.noAnswer : out.text}
                          {m.doubled && ' ×2'}
                        </span>
                      </div>
                    ) : picked === null ? (
                      <div className="flex h-[clamp(30px,4.6vh,52px)] gap-[clamp(4px,0.4vw,7px)]">
                        {q.options.map((o) => (
                          <motion.button
                            key={o.id}
                            type="button"
                            onClick={() => onAnswer(i, o.id)}
                            className="flex min-w-0 flex-1 items-center justify-center rounded-[clamp(7px,0.7vw,12px)] border-2 border-[var(--team)] bg-surface-container-lowest font-t-display text-[clamp(14px,2.3vh,26px)] font-black text-[var(--team)] transition-colors hover:bg-[var(--team)] hover:text-white"
                            style={{ '--team': c.solid } as React.CSSProperties}
                            whileTap={animate ? { scale: 0.9 } : undefined}
                          >
                            {o.letter}
                          </motion.button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-[clamp(30px,4.6vh,52px)] items-center gap-[clamp(6px,0.6vw,10px)]">
                        <motion.span
                          className="flex h-full aspect-square shrink-0 items-center justify-center rounded-[clamp(7px,0.7vw,12px)] text-white"
                          style={{ background: c.solid }}
                          initial={animate ? { scale: 0.5 } : false} animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                        >
                          <Lock className="h-[50%] w-[50%]" strokeWidth={2.8} />
                        </motion.span>
                        <span className="min-w-0 flex-1 truncate text-[clamp(11px,1.7vh,18px)] font-extrabold text-on-surface">{t.accepted}</span>
                        <button
                          type="button"
                          onClick={() => onAnswer(i, null)}
                          title={t.change}
                          aria-label={t.change}
                          className="flex h-[70%] aspect-square shrink-0 items-center justify-center rounded-full text-on-surface-variant opacity-70 transition hover:bg-state-hover hover:opacity-100"
                        >
                          <Undo2 className="h-[60%] w-[60%]" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <motion.button
              type="button"
              onClick={revealed ? onGo : onReveal}
              className="inline-flex shrink-0 items-center gap-[0.5em] rounded-full px-[1.3em] py-[0.7em] text-[clamp(13px,2vh,20px)] font-extrabold text-white shadow-elev-2"
              style={{ background: revealed ? DESERT.header : `linear-gradient(160deg, ${STAGE.gold}, ${STAGE.goldDeep})` }}
              whileHover={animate ? { scale: 1.04 } : undefined}
              whileTap={animate ? { scale: 0.96 } : undefined}
            >
              {revealed ? <>{t.go} <ArrowRight className="h-[1.15em] w-[1.15em]" /></> : <><Eye className="h-[1.15em] w-[1.15em]" /> {t.reveal}</>}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

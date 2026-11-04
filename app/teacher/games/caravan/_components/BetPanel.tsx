'use client';

import { motion } from 'framer-motion';
import { Check, Eye, Wind, X } from 'lucide-react';
import { cn } from '@/components/ui';
import { GAME_TEAMS, STAGE } from '../../_lib/stage';
import { BETS, RISKY_BET, type Bet, type Move } from '../_lib/engine';
import { DESERT } from '../_lib/theme';
import { CamelGlyph } from './Camel';

/**
 * The strip under the map. Phase 'bet': one column per team with the
 * 1 / 2 / 3 risk buttons + "Show the question". Phase 'move' (same slot, so
 * the map never resizes): what each team got this round.
 */

export interface OutcomeText {
  moveSteps: (n: number) => string;
  stay: string;
  storm: string;
  sheltered: string;
}

/** Text + color of one team's round result (the oasis hop is the map's surprise, not counted here). */
export function outcomeOf(m: Move, t: OutcomeText): { text: string; color: string } {
  if (m.correct) return { text: t.moveSteps(m.path.length - (m.event === 'oasis' ? 1 : 0)), color: STAGE.correct };
  if (m.event === 'storm') return m.to < m.from ? { text: t.storm, color: STAGE.wrong } : { text: t.sheltered, color: DESERT.tile };
  return { text: t.stay, color: 'var(--m3-on-surface-variant)' };
}

export interface BetText extends OutcomeText {
  betTitle: string;
  betHint: string;
  openQuestion: string;
}

interface Props {
  names: string[];
  bets: (Bet | null)[];
  bonus: boolean[];
  /** Set in phase 'move': show the results instead of the buttons. */
  moves: Move[] | null;
  canOpen: boolean;
  onBet: (team: number, bet: Bet) => void;
  onOpen: () => void;
  animate: boolean;
  t: BetText;
}

export default function BetPanel({ names, bets, bonus, moves, canOpen, onBet, onOpen, animate, t }: Props) {
  const betting = moves === null;
  return (
    // Fixed height: betting ↔ results must not resize the map above.
    <div className="relative flex h-[clamp(92px,14.5vh,156px)] shrink-0 items-stretch gap-[clamp(8px,1vw,16px)] overflow-hidden rounded-[clamp(14px,1.4vw,24px)] bg-surface-container-lowest p-[clamp(8px,1.1vh,14px)] shadow-elev-2">
      <div className="grid min-w-0 flex-1 gap-[clamp(6px,0.8vw,12px)]" style={{ gridTemplateColumns: `repeat(${names.length}, minmax(0, 1fr))` }}>
        {names.map((name, i) => {
          const c = GAME_TEAMS[i];
          const m = moves?.[i];
          const out = m ? outcomeOf(m, t) : null;
          return (
            <div key={i} className="flex min-w-0 flex-col justify-center gap-[clamp(4px,0.7vh,8px)] rounded-[clamp(10px,1vw,16px)] px-[clamp(6px,0.7vw,12px)] py-[clamp(4px,0.7vh,8px)]" style={{ background: c.tint }}>
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="h-[clamp(8px,1.1vh,12px)] w-[clamp(8px,1.1vh,12px)] shrink-0 rounded-full" style={{ background: c.solid }} />
                <p className="min-w-0 flex-1 truncate text-[clamp(11px,1.6vh,17px)] font-extrabold" style={{ color: c.solid }}>{name}</p>
                {bonus[i] && (
                  <span className="shrink-0 rounded-full px-[0.5em] text-[clamp(10px,1.4vh,14px)] font-black text-white" style={{ background: STAGE.gold }}>×2</span>
                )}
              </div>

              {betting ? (
                <div className="grid grid-cols-3 gap-[clamp(4px,0.5vw,8px)]">
                  {BETS.map((b) => {
                    const on = bets[i] === b;
                    return (
                      <motion.button
                        key={b}
                        type="button"
                        onClick={() => onBet(i, b)}
                        className={cn(
                          'relative flex h-[clamp(40px,6.4vh,74px)] flex-col items-center justify-center rounded-[clamp(8px,0.8vw,14px)] border-2 font-t-display font-black transition-colors',
                          on ? 'border-transparent text-white shadow-elev-2' : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:border-current',
                        )}
                        style={on ? { background: c.solid } : { color: c.solid }}
                        whileTap={animate ? { scale: 0.92 } : undefined}
                        animate={on && animate ? { y: -2 } : { y: 0 }}
                      >
                        <span className="text-[clamp(16px,2.8vh,30px)] leading-none">{b}</span>
                        <span className="mt-[0.15em] flex gap-px">
                          {Array.from({ length: b }, (_, k) => (
                            <CamelGlyph key={k} color={on ? '#fff' : c.solid} className="h-[clamp(8px,1.3vh,14px)] w-[clamp(10px,1.6vh,17px)]" />
                          ))}
                        </span>
                        {b === RISKY_BET && (
                          <Wind className="absolute right-[0.25em] top-[0.25em] h-[clamp(9px,1.3vh,14px)] w-[clamp(9px,1.3vh,14px)]" style={{ color: on ? '#fff' : STAGE.wrong }} />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ) : m && out && (
                <div className="flex h-[clamp(40px,6.4vh,74px)] items-center gap-[clamp(6px,0.6vw,10px)]">
                  <span
                    className="flex h-[clamp(26px,4vh,44px)] w-[clamp(26px,4vh,44px)] shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: m.correct ? STAGE.correct : STAGE.wrong }}
                  >
                    {m.correct ? <Check className="h-[60%] w-[60%]" strokeWidth={3.5} /> : <X className="h-[60%] w-[60%]" strokeWidth={3.5} />}
                  </span>
                  <span className="min-w-0 truncate font-t-display text-[clamp(14px,2.4vh,26px)] font-black" style={{ color: out.color }}>{out.text}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {betting && (
        <div className="flex w-[clamp(150px,17vw,260px)] shrink-0 flex-col justify-center gap-[clamp(4px,0.7vh,8px)]">
          <p className="text-[clamp(13px,2vh,20px)] font-black leading-tight text-on-surface">{t.betTitle}</p>
          <p className="line-clamp-2 text-[clamp(10px,1.35vh,13px)] font-semibold leading-snug text-on-surface-variant">{t.betHint}</p>
          <motion.button
            type="button"
            disabled={!canOpen}
            onClick={onOpen}
            className="inline-flex items-center justify-center gap-[0.45em] rounded-full px-[1em] py-[0.55em] text-[clamp(13px,1.9vh,19px)] font-extrabold text-white shadow-elev-2 disabled:opacity-40 disabled:shadow-none"
            style={{ background: DESERT.header }}
            whileHover={canOpen && animate ? { scale: 1.03 } : undefined}
            whileTap={canOpen && animate ? { scale: 0.96 } : undefined}
          >
            <Eye className="h-[1.1em] w-[1.1em]" /> {t.openQuestion}
          </motion.button>
        </div>
      )}
    </div>
  );
}

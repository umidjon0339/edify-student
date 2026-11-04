"use client";

import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";

import Puller from "../tug-of-war/_components/Puller";
import { FIELD } from "../tug-of-war/_lib/teams";
import { KeeperFigure } from "../penalty/_components/Keeper";
import { Ball } from "../penalty/_components/Stadium";
import { CROWD_NEUTRALS, PITCH } from "../penalty/_lib/theme";
import { GAME_TEAMS } from "../_lib/stage";
import Camel from "../caravan/_components/Camel";
import { City } from "../caravan/_components/Landmarks";
import { DESERT } from "../caravan/_lib/theme";

/**
 * Animated card scenes for the games hub (docs/GAMES.md). Each fills its
 * parent box. `on = false` (motion off / reduced motion) renders a still frame.
 * Colors come from M3 tokens so every palette and dark mode work; only the
 * tug, penalty and caravan scenes reuse their game's own fixed look (FIELD, PITCH, DESERT).
 */

export type GameArtKey = "tug" | "quiz" | "board" | "wheel" | "penalty" | "caravan";

const loop = (duration: number, extra: object = {}) => ({ duration, repeat: Infinity, ease: "easeInOut" as const, ...extra });

/** Arqon tortish: the real game's figures on the sky + grass field. */
function TugArt({ on }: { on: boolean }) {
  const GROUND = 150;
  const S = 0.66;
  const ROPE = GROUND - 65 * S;
  return (
    <div className="h-full w-full" style={{ background: FIELD.sky }}>
      <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden>
        <ellipse cx={160} cy={GROUND + 4} rx={150} ry={20} fill={FIELD.grass} stroke={FIELD.grassRing} strokeWidth={2} />
        <line x1={160} x2={160} y1={GROUND - 10} y2={GROUND + 14} stroke="#ffffff" strokeWidth={2} strokeDasharray="3 4" opacity={0.8} />
        <motion.g animate={on ? { x: [-5, 5, -5] } : undefined} transition={loop(2.4)}>
          <path d={`M36 ${ROPE + 1} Q160 ${ROPE + 5} 284 ${ROPE + 1}`} fill="none" stroke="#b08850" strokeWidth={4.5} strokeLinecap="round" />
          <path d={`M36 ${ROPE + 1} Q160 ${ROPE + 5} 284 ${ROPE + 1}`} fill="none" stroke="#7d5f35" strokeWidth={4.5} strokeDasharray="3 6" strokeLinecap="round" opacity={0.5} />
          <motion.g
            animate={on ? { rotate: [-10, 10, -10] } : undefined}
            transition={loop(1.2)}
            style={{ originX: 0.5, originY: 0 }}
          >
            <path d={`M159 ${ROPE + 6} L152 ${ROPE + 28} L160 ${ROPE + 22} Z`} fill="#f59e0b" />
          </motion.g>
          <circle cx={160} cy={ROPE + 4} r={5.5} fill="#f59e0b" stroke="#b45309" strokeWidth={2} />
          <g transform={`translate(70 ${GROUND}) scale(${S})`}><Puller team="blue" pose="idle" back delay={0.3} animate={on} /></g>
          <g transform={`translate(114 ${GROUND}) scale(${S})`}><Puller team="blue" pose="idle" animate={on} /></g>
          <g transform={`translate(206 ${GROUND}) scale(${-S} ${S})`}><Puller team="red" pose="idle" delay={0.7} animate={on} /></g>
          <g transform={`translate(250 ${GROUND}) scale(${-S} ${S})`}><Puller team="red" pose="idle" back delay={1} animate={on} /></g>
        </motion.g>
      </svg>
    </div>
  );
}

const QUIZ_TILES = ["var(--m3-error)", "var(--m3-primary)", "var(--m3-warning)", "var(--m3-success)"];

/** Jonli viktorina: a question card, a shrinking timer and a correct answer that lights up. */
function QuizArt({ on }: { on: boolean }) {
  const T = 3;
  return (
    <div
      className="relative flex h-full w-full items-center justify-center"
      style={{ background: "linear-gradient(160deg, color-mix(in oklab, var(--m3-primary) 28%, var(--m3-surface-container-lowest)), color-mix(in oklab, var(--m3-primary) 8%, var(--m3-surface-container-lowest)))" }}
    >
      <div className="flex w-[58%] flex-col gap-2 rounded-m3-md bg-surface-container-lowest p-3 shadow-elev-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
          <motion.div
            className="h-full rounded-full bg-primary"
            style={{ originX: 0 }}
            animate={on ? { scaleX: [1, 0] } : undefined}
            transition={{ duration: T, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <div className="h-2 w-4/5 rounded-full bg-surface-container-highest" />
        <div className="h-2 w-1/2 rounded-full bg-surface-container-highest" />
        <div className="mt-1 grid grid-cols-2 gap-1.5">
          {QUIZ_TILES.map((c, i) => (
            <motion.div
              key={c}
              className="relative flex h-7 items-center justify-center rounded-m3-sm"
              style={{ background: c }}
              animate={on ? (i === 3 ? { scale: [1, 1, 1.08, 1, 1] } : { opacity: [1, 1, 0.35, 0.35, 1] }) : undefined}
              transition={{ duration: T, repeat: Infinity, times: [0, 0.62, 0.7, 0.95, 1] }}
            >
              {i === 3 && (
                <motion.span
                  className="text-on-success"
                  animate={on ? { opacity: [0, 0, 1, 1, 0], scale: [0.4, 0.4, 1, 1, 0.4] } : { opacity: 1 }}
                  transition={{ duration: T, repeat: Infinity, times: [0, 0.62, 0.7, 0.95, 1] }}
                >
                  <Check size={16} strokeWidth={3} />
                </motion.span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
      <motion.span
        className="absolute right-[12%] top-[14%] flex h-9 w-9 items-center justify-center rounded-full bg-warning text-on-warning shadow-elev-1"
        animate={on ? { y: [0, -6, 0], rotate: [0, -8, 0] } : undefined}
        transition={loop(1.6)}
      >
        <Zap size={18} fill="currentColor" />
      </motion.span>
    </div>
  );
}

const BOARD_PICKS = [5, 2, 10, 7];

/** Savol doskasi: a points board where tiles get picked one after another. */
function BoardArt({ on }: { on: boolean }) {
  const STEP = 1.1;
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: "linear-gradient(160deg, color-mix(in oklab, var(--m3-tertiary) 28%, var(--m3-surface-container-lowest)), color-mix(in oklab, var(--m3-tertiary) 8%, var(--m3-surface-container-lowest)))" }}
    >
      <div className="grid w-[64%] grid-cols-4 gap-1.5 rounded-m3-md bg-surface-container-lowest p-2 shadow-elev-2">
        {Array.from({ length: 12 }, (_, i) => {
          const pick = BOARD_PICKS.indexOf(i);
          return (
            <motion.div
              key={i}
              className="flex h-8 items-center justify-center rounded-m3-xs bg-tertiary text-[11px] font-extrabold text-on-tertiary"
              animate={on && pick >= 0 ? { scale: [1, 1.18, 1], y: [0, -3, 0] } : undefined}
              transition={{ duration: 0.7, repeat: Infinity, repeatDelay: STEP * BOARD_PICKS.length - 0.7, delay: pick * STEP, ease: "easeOut" }}
            >
              {(Math.floor(i / 4) + 1) * 100}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

const WHEEL_COLORS = ["var(--m3-primary)", "var(--m3-tertiary)", "var(--m3-warning)", "var(--m3-success)"];

/** Omad g'ildiragi: the wheel spins, slows down and the pointer ticks. */
function WheelArt({ on }: { on: boolean }) {
  const R = 58;
  const CX = 160;
  const CY = 98;
  const seg = (i: number) => {
    const a0 = ((i * 45 - 90) * Math.PI) / 180;
    const a1 = (((i + 1) * 45 - 90) * Math.PI) / 180;
    return `M${CX} ${CY} L${CX + R * Math.cos(a0)} ${CY + R * Math.sin(a0)} A${R} ${R} 0 0 1 ${CX + R * Math.cos(a1)} ${CY + R * Math.sin(a1)} Z`;
  };
  const spin = { duration: 2.8, repeat: Infinity, repeatDelay: 1.4, ease: [0.15, 0.85, 0.25, 1] as const };
  return (
    <div
      className="h-full w-full"
      style={{ background: "linear-gradient(160deg, color-mix(in oklab, var(--m3-warning) 26%, var(--m3-surface-container-lowest)), color-mix(in oklab, var(--m3-warning) 8%, var(--m3-surface-container-lowest)))" }}
    >
      <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden>
        <ellipse cx={CX} cy={CY + R + 10} rx={44} ry={6} fill="var(--m3-shadow)" opacity={0.12} />
        <circle cx={CX} cy={CY} r={R + 5} fill="var(--m3-surface-container-lowest)" />
        <motion.g animate={on ? { rotate: [0, 720] } : undefined} transition={spin} style={{ originX: 0.5, originY: 0.5 }}>
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d={seg(i)} fill={WHEEL_COLORS[i % 4]} stroke="var(--m3-surface-container-lowest)" strokeWidth={2} />
          ))}
        </motion.g>
        <circle cx={CX} cy={CY} r={11} fill="var(--m3-surface-container-lowest)" stroke="var(--m3-outline-variant)" strokeWidth={2} />
        <motion.path
          d={`M${CX - 9} ${CY - R - 14} L${CX + 9} ${CY - R - 14} L${CX} ${CY - R + 4} Z`}
          fill="var(--m3-on-surface)"
          animate={on ? { rotate: [0, -16, 10, -16, 10, -8, 0, 0] } : undefined}
          transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.08, 0.2, 0.32, 0.45, 0.58, 0.67, 1] }}
          style={{ originX: 0.5, originY: 0.2 }}
        />
      </svg>
    </div>
  );
}

/** Penalti seriyasi: a mini stadium; the keeper dives the wrong way, the ball flies into the top corner. */
const PA_CROWD = Array.from({ length: 7 * 41 }, (_, k) => {
  const row = Math.floor(k / 41);
  const i = k % 41;
  const pick = Math.floor(Math.abs(Math.sin(i * 12.9898 + row * 78.233) * 43758.5453)) % 6;
  return { x: i * 8 + (row % 2) * 4, y: 6 + row * 8, color: [GAME_TEAMS[0].solid, GAME_TEAMS[1].solid, ...CROWD_NEUTRALS][pick] };
});

function PenaltyArt({ on }: { on: boolean }) {
  // One 3.2 s clock for every part: wait → kick (ball in at 0.45) → hold → the
  // ball fades out, slips back to the spot unseen and fades in; the keeper gets up.
  const loop = (times: number[]) => ({ duration: 3.2, repeat: Infinity, ease: 'easeInOut' as const, times });
  const BALL_T = [0, 0.22, 0.45, 0.72, 0.78, 0.9, 1];
  const goal = { left: 104, right: 216, top: 24, line: 94 };
  const back = { left: 113, right: 207, top: 29, bottom: 88 };
  return (
    <div className="h-full w-full" style={{ background: PITCH.grass }}>
      <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
        <defs>
          <pattern id="pa-net" width={6} height={6} patternUnits="userSpaceOnUse">
            <path d="M6 0 L0 0 0 6" fill="none" stroke={PITCH.net} strokeWidth={0.7} />
          </pattern>
          <linearGradient id="pa-fade" x1={0} y1={0} x2={0} y2={1}>
            <stop offset={0} stopColor={PITCH.standsTop} stopOpacity={0.9} />
            <stop offset={1} stopColor={PITCH.standsTop} stopOpacity={0.15} />
          </linearGradient>
        </defs>
        {/* stands + LED board */}
        <rect width={320} height={62} fill={PITCH.stands} />
        {PA_CROWD.map((f, k) => <circle key={k} cx={f.x} cy={f.y} r={2.7} fill={f.color} />)}
        <rect width={320} height={62} fill="url(#pa-fade)" />
        <rect y={56} width={320} height={9} fill={PITCH.board} />
        {/* pitch */}
        {[[70, 5], [82, 8], [100, 12], [126, 17], [162, 22]].map(([y, h]) => (
          <rect key={y} y={y} width={320} height={h} fill={PITCH.grassDark} />
        ))}
        <g fill="none" stroke={PITCH.line} strokeWidth={1.4} opacity={0.9}>
          <line x1={0} y1={goal.line} x2={320} y2={goal.line} />
          <polyline points="92,94 86,108 234,108 228,94" />
        </g>
        {/* net (ripples on the goal) + frame */}
        <motion.g animate={on ? { scale: [1, 1, 1.05, 1, 1] } : undefined} transition={loop([0, 0.45, 0.5, 0.6, 1])} style={{ originX: 0.5, originY: 0.5 }}>
          <rect x={back.left} y={back.top} width={back.right - back.left} height={back.bottom - back.top} fill={PITCH.netBack} />
          <polygon points={`${goal.left},${goal.top} ${goal.right},${goal.top} ${back.right},${back.top} ${back.left},${back.top}`} fill={PITCH.netSide} />
          <polygon points={`${goal.left},${goal.top} ${back.left},${back.top} ${back.left},${back.bottom} ${goal.left},${goal.line}`} fill={PITCH.netSide} />
          <polygon points={`${goal.right},${goal.top} ${back.right},${back.top} ${back.right},${back.bottom} ${goal.right},${goal.line}`} fill={PITCH.netSide} />
          <rect x={goal.left} y={goal.top} width={goal.right - goal.left} height={goal.line - goal.top} fill="url(#pa-net)" />
        </motion.g>
        <path d={`M${goal.left} ${goal.line} V${goal.top} H${goal.right} V${goal.line}`} fill="none" stroke={PITCH.post} strokeWidth={4} strokeLinejoin="round" />
        {/* keeper: the real figure, diving to the left */}
        <g transform={`translate(160 ${goal.line}) scale(0.3)`}>
          <motion.g
            animate={on ? { x: [0, 0, -120, -120, 0, 0], y: [0, 0, -37, -37, 0, 0], rotate: [0, 0, -70, -70, 0, 0] } : undefined}
            transition={loop([0, 0.24, 0.42, 0.72, 0.92, 1])}
            style={{ originX: 0.5, originY: 0.5 }}
          >
            <KeeperFigure color={GAME_TEAMS[0].solid} />
          </motion.g>
        </g>
        {/* ball: from the spot into the top-right corner */}
        <ellipse cx={160} cy={160} rx={3} ry={1.4} fill={PITCH.line} />
        <motion.ellipse
          cx={160} cy={162} rx={10} ry={3} fill={PITCH.shadow}
          animate={on ? { x: [0, 0, 36, 36, 36, 0, 0], y: [0, 0, -66, -66, -66, 0, 0], opacity: [1, 1, 0.5, 0.5, 0, 0, 1] } : undefined}
          transition={loop(BALL_T)}
        />
        <g transform="translate(160 154)">
          <motion.g
            animate={on
              ? { x: [0, 0, 38, 38, 38, 0, 0], y: [0, 0, -112, -110, -110, 0, 0], scale: [0.45, 0.45, 0.24, 0.24, 0.24, 0.45, 0.45], opacity: [1, 1, 1, 1, 0, 0, 1], rotate: [0, 0, 360, 360, 360, 360, 360] }
              : { scale: 0.45 }}
            transition={loop(BALL_T)}
          >
            <Ball />
          </motion.g>
        </g>
      </svg>
    </div>
  );
}

/** Karvon yo'li: three caravans walk the desert road from Samarqand toward Xiva. */
function CaravanArt({ on }: { on: boolean }) {
  const road = "M -20 128 C 70 92 120 150 190 124 S 300 96 340 112";
  return (
    <div className="h-full w-full" style={{ background: DESERT.sand }}>
      <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
        <rect width={320} height={70} fill="#fef3c7" />
        <circle cx={268} cy={30} r={26} fill={DESERT.sun} opacity={0.25} />
        <circle cx={268} cy={30} r={15} fill={DESERT.sun} />
        <path d="M0 70 Q 70 50 150 66 T 320 62 V 90 H 0 Z" fill={DESERT.dune} opacity={0.6} />
        <path d="M0 180 V 160 Q 90 146 180 164 T 320 152 V 180 Z" fill={DESERT.dune} />
        <path d={road} fill="none" stroke={DESERT.roadEdge} strokeWidth={44} opacity={0.5} strokeLinecap="round" />
        <path d={road} fill="none" stroke={DESERT.road} strokeWidth={38} strokeLinecap="round" />
        <g transform="translate(38 104) scale(0.36)"><City kind="registan" /></g>
        <g transform="translate(282 98) scale(0.36)"><City kind="kalta" /></g>
        {[0, 1, 2].map((i) => (
          <motion.g
            key={i}
            initial={false}
            animate={on ? { x: [60 + i * 34, 200 + i * 34], opacity: [0, 1, 1, 0] } : { x: 100 + i * 34, opacity: 1 }}
            transition={on ? { duration: 6, repeat: Infinity, ease: "linear", delay: 0, opacity: { duration: 6, repeat: Infinity, times: [0, 0.12, 0.85, 1] } } : undefined}
          >
            <g transform={`translate(0 ${136 - i * 9}) scale(0.3)`}>
              <Camel team={GAME_TEAMS[i]} number={i + 1} walking={on} walkSeconds={Infinity} bonus={false} animate={on} />
            </g>
          </motion.g>
        ))}
      </svg>
    </div>
  );
}

export default function GameArt({ game, on }: { game: GameArtKey; on: boolean }) {
  if (game === "tug") return <TugArt on={on} />;
  if (game === "quiz") return <QuizArt on={on} />;
  if (game === "board") return <BoardArt on={on} />;
  if (game === "penalty") return <PenaltyArt on={on} />;
  if (game === "caravan") return <CaravanArt on={on} />;
  return <WheelArt on={on} />;
}

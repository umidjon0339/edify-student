'use client';

import { motion } from 'framer-motion';
import { STAGE, type GameTeam } from '../../_lib/stage';
import { DESERT } from '../_lib/theme';

/**
 * A Bactrian (two-hump) camel facing right, in team colors, with a numbered
 * pennant. Local coordinates: feet at (0, 0), about 100 wide, 105 tall.
 * Legs swing only while `walking` (for `walkSeconds`); framer rotates SVG groups around their
 * bounding box, so each leg pivots on its top-center (the hip).
 */

const LEGS = [
  { x: -32, back: true },
  { x: -20, back: false },
  { x: 16, back: true },
  { x: 28, back: false },
];

/** One full stride (forward, back, home) = one road step. Starts and ends at 0° so legs stand straight after a walk. */
const STRIDE_S = 0.36;

export default function Camel({ team, number, walking, walkSeconds = 0, bonus, animate }: {
  team: GameTeam;
  number: number;
  walking: boolean;
  /** How long the walk lasts; the legs stop when it ends. */
  walkSeconds?: number;
  /** Bazaar bonus waiting: a gold ×2 badge. */
  bonus: boolean;
  animate: boolean;
}) {
  const swing = walking && animate;
  return (
    <g>
      <ellipse cx={0} cy={2} rx={42} ry={6} fill="#000" opacity={0.16} />

      {/* Legs: far pair darker, near pair in front of the body */}
      {LEGS.map((l, i) => (
        <motion.g
          key={i}
          style={{ originX: 0.5, originY: 0 }}
          animate={swing ? { rotate: i % 2 ? [0, -14, 0, 14, 0] : [0, 14, 0, -14, 0] } : { rotate: 0 }}
          transition={swing ? { duration: STRIDE_S, repeat: Math.max(0, Math.round(walkSeconds / STRIDE_S) - 1), ease: 'easeInOut' } : { duration: 0.2 }}
        >
          <rect x={l.x} y={-38} width={8} height={38} rx={3.5} fill={l.back ? team.deep : team.solid} />
          <rect x={l.x - 1} y={-5} width={10} height={5} rx={2} fill={DESERT.ink} opacity={0.75} />
        </motion.g>
      ))}

      {/* Tail */}
      <path d="M -38 -48 Q -50 -40 -45 -26" fill="none" stroke={team.deep} strokeWidth={4} strokeLinecap="round" />

      {/* Body + two humps */}
      <ellipse cx={-14} cy={-58} rx={13} ry={12} fill={team.solid} />
      <ellipse cx={10} cy={-58} rx={13} ry={12} fill={team.solid} />
      <ellipse cx={-2} cy={-44} rx={37} ry={16} fill={team.solid} />
      <ellipse cx={-2} cy={-38} rx={30} ry={7} fill={team.deep} opacity={0.35} />

      {/* Ikat saddle blanket between the humps */}
      <path d="M -10 -52 L 6 -52 L 9 -32 L -13 -32 Z" fill={DESERT.awningB} />
      <path d="M -11 -45 L 7 -45 M -12 -39 L 8 -39" stroke={STAGE.gold} strokeWidth={3} />
      <path d="M -2 -51 L 2 -48 L -2 -45 L -6 -48 Z" fill={team.deep} />

      {/* Neck + head */}
      <path d="M 26 -48 C 40 -52 42 -70 47 -80" fill="none" stroke={team.solid} strokeWidth={12} strokeLinecap="round" />
      <ellipse cx={53} cy={-81} rx={12} ry={7.5} fill={team.solid} />
      <ellipse cx={45} cy={-89} rx={3} ry={5} fill={team.deep} />
      <circle cx={55} cy={-83} r={2.2} fill="#1f2937" />
      <path d="M 62 -78 L 65 -78" stroke={team.deep} strokeWidth={2} strokeLinecap="round" />

      {/* Pennant with the team number */}
      <line x1={-2} y1={-66} x2={-2} y2={-108} stroke={DESERT.ink} strokeWidth={3} strokeLinecap="round" />
      <motion.g
        style={{ originX: 0, originY: 0.5 }}
        animate={animate ? { skewY: [0, -6, 0, 5, 0] } : undefined}
        transition={animate ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : undefined}
      >
        <path d="M -1 -108 L 30 -100 L -1 -90 Z" fill={team.solid} stroke="#fff" strokeWidth={2} strokeLinejoin="round" />
        <text x={9} y={-95} textAnchor="middle" fontSize={12} fontWeight={900} fill="#fff">{number}</text>
      </motion.g>

      {bonus && (
        <g transform="translate(-30 -96)">
          <circle r={14} fill={STAGE.gold} stroke="#fff" strokeWidth={3} />
          <text y={5} textAnchor="middle" fontSize={14} fontWeight={900} fill="#fff">×2</text>
        </g>
      )}
    </g>
  );
}

/** Tiny one-color camel for buttons (fits a 24×20 box). */
export function CamelGlyph({ color, className }: { color: string; className?: string }) {
  return (
    <svg viewBox="-50 -92 120 96" className={className} aria-hidden>
      <g fill={color}>
        <rect x={-32} y={-38} width={9} height={38} rx={4} />
        <rect x={-20} y={-38} width={9} height={38} rx={4} />
        <rect x={16} y={-38} width={9} height={38} rx={4} />
        <rect x={28} y={-38} width={9} height={38} rx={4} />
        <ellipse cx={-14} cy={-58} rx={14} ry={13} />
        <ellipse cx={10} cy={-58} rx={14} ry={13} />
        <ellipse cx={-2} cy={-44} rx={38} ry={17} />
        <ellipse cx={53} cy={-81} rx={13} ry={8} />
      </g>
      <path d="M 26 -48 C 40 -52 42 -70 47 -80" fill="none" stroke={color} strokeWidth={13} strokeLinecap="round" />
    </svg>
  );
}

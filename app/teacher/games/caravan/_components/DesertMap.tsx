'use client';

import { motion } from 'framer-motion';
import { GAME_TEAMS, STAGE } from '../../_lib/stage';
import { cities, type Move, type RoadEvent } from '../_lib/engine';
import { DESERT } from '../_lib/theme';
import Camel from './Camel';
import { Bazaar, City, Oasis, type CityKind } from './Landmarks';

/**
 * The Karvon yo'li map as one SVG (viewBox 1600×640): sky + dunes, one
 * winding road Samarqand → Buxoro → Xiva, the surprise squares, and one
 * caravan per team in its own lane (lanes never overlap, so caravans on the
 * same square stay readable). Caravan motion is derived from engine state:
 * in phase 'move' each caravan hops along its `Move.path`; otherwise it
 * stands on `positions`.
 */

export const VIEW_W = 1600;
export const VIEW_H = 640;
const X0 = 150;
const X1 = 1450;
const MID_Y = 380;
const AMP = 105;
const ROAD_W = 176;
const CAMEL_SCALE = 0.8;
const HOP = 26;
/** Seconds per step of a caravan's move. */
export const STEP_S = 0.36;
const FLOAT_S = 2.6;

/** Road point of square `i` (one sine wave: up to the first half, down to the second). */
export function nodeAt(i: number, length: number) {
  const t = i / length;
  return { x: X0 + (X1 - X0) * t, y: MID_Y - AMP * Math.sin(2 * Math.PI * t) };
}

/** Lane spacing shrinks as teams are added, so 4 lanes still fit the road. */
const laneGap = (n: number) => (n <= 2 ? 70 : n === 3 ? 58 : 50);

/** Where team `team`'s camel stands (its feet) on square `pos`. */
function spot(pos: number, team: number, n: number, length: number) {
  const p = nodeAt(pos, length);
  return { x: p.x, y: p.y + (team - (n - 1) / 2) * laneGap(n) + 28 };
}

/** A storm waits a beat (the swirl), then pushes the caravan back slowly. */
const STORM_DELAY_S = 0.35;
const STORM_SLOW = 1.6;

/** How long one move takes on the map. */
const moveTime = (m: Move) => (m.event === 'storm' ? (m.path.length ? STORM_DELAY_S + m.path.length * STEP_S * STORM_SLOW : 0) : m.path.length * STEP_S);

/** How long the slowest move takes (the page waits this long, plus the labels). */
export const moveSeconds = (moves: Move[]) => Math.max(0, ...moves.map(moveTime));

/** Smooth road outline through the squares. */
function roadPath() {
  const pts: string[] = [];
  for (let k = 0; k <= 80; k++) {
    const t = k / 80;
    pts.push(`${(X0 + (X1 - X0) * t).toFixed(1)} ${(MID_Y - AMP * Math.sin(2 * Math.PI * t)).toFixed(1)}`);
  }
  return `M ${X0 - 70} ${MID_Y} L ${pts.join(' L ')} L ${X1 + 70} ${MID_Y}`;
}
const ROAD = roadPath();

const CITY_KINDS: CityKind[] = ['registan', 'kalon', 'kalta'];

/** Outlined label text (readable on sand, road and sky). */
function Label({ x, y, size, color, children }: { x: number; y: number; size: number; color: string; children: React.ReactNode }) {
  return (
    <text
      x={x} y={y} textAnchor="middle" fontSize={size} fontWeight={900} fill={color}
      stroke="#fff" strokeWidth={size * 0.28} strokeLinejoin="round" paintOrder="stroke"
      style={{ letterSpacing: '0.02em' }}
    >
      {children}
    </text>
  );
}

export interface MapText {
  cities: string[];
  oasis: string;
  bazaar: string;
  oasisFloat: string;
  bazaarFloat: string;
  stormFloat: string;
  shelterFloat: string;
}

interface Props {
  length: number;
  teamCount: number;
  positions: number[];
  bonus: boolean[];
  events: Record<number, RoadEvent>;
  /** Moves of the last reveal; played while `moving`, their labels fade out after. */
  moves: Move[] | null;
  moving: boolean;
  /** Changes every round, so one-shot effects replay. */
  moveKey: number;
  animate: boolean;
  t: MapText;
}

export default function DesertMap({ length, teamCount: n, positions, bonus, events, moves, moving, moveKey, animate, t }: Props) {
  const cityAt = cities(length);
  const showEffects = moves !== null && animate;

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="kv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="1" stopColor={DESERT.sandHi} />
        </linearGradient>
      </defs>

      {/* Sky, sun, dunes */}
      <rect width={VIEW_W} height={VIEW_H} fill={DESERT.sand} />
      <rect width={VIEW_W} height={200} fill="url(#kv-sky)" />
      <circle cx={1480} cy={78} r={74} fill={DESERT.sun} opacity={0.22} />
      <circle cx={1480} cy={78} r={44} fill={DESERT.sun} />
      <path d="M0 200 Q 180 150 380 190 T 780 182 T 1180 176 T 1600 190 V 260 H 0 Z" fill={DESERT.dune} opacity={0.55} />
      <path d="M0 230 Q 260 200 520 236 T 1060 226 T 1600 236 V 300 H 0 Z" fill={DESERT.sand} />
      <path d="M0 640 V 590 Q 260 548 560 600 T 1140 590 T 1600 560 V 640 Z" fill={DESERT.dune} />
      <path d="M0 640 V 620 Q 400 596 820 626 T 1600 610 V 640 Z" fill={DESERT.duneDeep} opacity={0.5} />
      {/* Saxaul bushes + rocks where the road leaves room */}
      {[[430, 560, 1], [540, 590, 0.8], [1080, 250, 0.9], [1210, 236, 0.7], [780, 600, 0.7]].map(([x, y, s]) => (
        <g key={`${x}`} transform={`translate(${x} ${y}) scale(${s})`}>
          <ellipse cx={0} cy={0} rx={26} ry={6} fill={DESERT.duneDeep} opacity={0.4} />
          <path d="M -16 0 Q -20 -22 -4 -26 Q 2 -40 16 -28 Q 30 -22 20 0 Z" fill={DESERT.palmDeep} opacity={0.75} />
        </g>
      ))}

      {/* Road */}
      <path d={ROAD} fill="none" stroke={DESERT.roadEdge} strokeWidth={ROAD_W + 14} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />
      <path d={ROAD} fill="none" stroke={DESERT.road} strokeWidth={ROAD_W} strokeLinecap="round" strokeLinejoin="round" />
      <path d={ROAD} fill="none" stroke={DESERT.roadEdge} strokeWidth={3} strokeDasharray="2 18" strokeLinecap="round" opacity={0.6} />

      {/* Squares */}
      {Array.from({ length: length + 1 }, (_, i) => {
        const p = nodeAt(i, length);
        return <circle key={i} cx={p.x} cy={p.y} r={7} fill={DESERT.stone} opacity={cityAt.includes(i) ? 0 : 0.5} />;
      })}

      {/* Cities stand behind the road's top edge */}
      {cityAt.map((pos, k) => {
        const p = nodeAt(pos, length);
        return (
          <g key={pos} transform={`translate(${p.x} ${p.y - 34})`}>
            <City kind={CITY_KINDS[k]} />
            <Label x={0} y={k === 1 ? -200 : -166} size={30} color={k === 2 ? STAGE.goldDeep : DESERT.ink}>{t.cities[k]}</Label>
          </g>
        );
      })}

      {/* Surprise squares */}
      {Object.entries(events).map(([pos, kind]) => {
        const p = nodeAt(Number(pos), length);
        return (
          <g key={pos} transform={`translate(${p.x} ${p.y})`}>
            <circle r={40} fill={kind === 'oasis' ? DESERT.water : STAGE.gold} opacity={0.22} />
            <circle r={40} fill="none" stroke={kind === 'oasis' ? DESERT.waterDeep : STAGE.goldDeep} strokeWidth={3} strokeDasharray="6 6" />
            <g transform="translate(0 16)">{kind === 'oasis' ? <Oasis /> : <Bazaar />}</g>
            <Label x={0} y={64} size={20} color={kind === 'oasis' ? DESERT.waterDeep : STAGE.goldDeep}>
              {kind === 'oasis' ? t.oasis : t.bazaar}
            </Label>
          </g>
        );
      })}

      {/* Caravans, top lane first so lower lanes are drawn in front */}
      {Array.from({ length: n }, (_, team) => {
        const m = moves?.[team];
        const walk = moving && m && m.path.length > 0;
        const at = spot(positions[team], team, n, length);
        let target: { x: number | number[]; y: number | number[] } = { x: at.x, y: at.y };
        let transition: object = { duration: animate ? 0.5 : 0, ease: 'easeInOut' };
        if (walk && m && animate) {
          const pts = [m.from, ...m.path].map((p) => spot(p, team, n, length));
          const back = m.event === 'storm';
          const xs: number[] = [];
          const ys: number[] = [];
          pts.forEach((p, k) => {
            xs.push(p.x); ys.push(p.y);
            const q = pts[k + 1];
            if (q) { xs.push((p.x + q.x) / 2); ys.push((p.y + q.y) / 2 - (back ? 6 : HOP)); }
          });
          target = { x: xs, y: ys };
          transition = { duration: m.path.length * STEP_S * (back ? STORM_SLOW : 1), ease: 'easeInOut', delay: back ? STORM_DELAY_S : 0 };
        }
        return (
          <motion.g key={team} initial={false} animate={target} transition={transition}>
            <g transform={`scale(${CAMEL_SCALE})`}>
              <Camel
                team={GAME_TEAMS[team]}
                number={team + 1}
                walking={!!walk}
                walkSeconds={walk && m ? m.path.length * STEP_S : 0}
                bonus={bonus[team]}
                animate={animate}
              />
            </g>
          </motion.g>
        );
      })}

      {/* One-shot effects + labels of the last moves */}
      {showEffects && moves.map((m, team) => {
        if (!m.event) return null;
        const end = spot(m.to, team, n, length);
        const arrive = m.event === 'storm' ? STORM_DELAY_S : Math.max(0, m.path.length - (m.event === 'oasis' ? 1 : 0)) * STEP_S;
        const label = m.event === 'oasis' ? t.oasisFloat : m.event === 'bazaar' ? t.bazaarFloat : m.to < m.from ? t.stormFloat : t.shelterFloat;
        const color = m.event === 'oasis' ? DESERT.waterDeep : m.event === 'bazaar' ? STAGE.goldDeep : m.to < m.from ? STAGE.wrong : DESERT.tile;
        const from = spot(m.from, team, n, length);
        return (
          <g key={`${moveKey}-${team}`} pointerEvents="none">
            {m.event === 'storm' && (
              // Sand swirl around the caravan
              <g transform={`translate(${from.x} ${from.y - 34})`}>
                {Array.from({ length: 10 }, (_, k) => {
                  const a = (k / 10) * Math.PI * 2;
                  return (
                    <motion.circle
                      key={k} r={6 + (k % 3) * 3} fill={DESERT.storm}
                      initial={{ opacity: 0, cx: Math.cos(a) * 20, cy: Math.sin(a) * 12 }}
                      animate={{ opacity: [0, 0.75, 0], cx: Math.cos(a + 2) * 80, cy: Math.sin(a + 2) * 44 }}
                      transition={{ duration: 1.3, delay: k * 0.04, ease: 'easeOut' }}
                    />
                  );
                })}
              </g>
            )}
            {m.event === 'oasis' && (
              <motion.circle
                cx={nodeAt(m.path[m.path.length - 2] ?? m.from, length).x}
                cy={nodeAt(m.path[m.path.length - 2] ?? m.from, length).y + 16}
                fill="none" stroke={DESERT.water} strokeWidth={5}
                initial={{ r: 10, opacity: 0 }}
                animate={{ r: [10, 70], opacity: [0.9, 0] }}
                transition={{ duration: 0.9, delay: arrive, ease: 'easeOut' }}
              />
            )}
            <motion.g
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -10] }}
              transition={{ duration: FLOAT_S, times: [0, 0.12, 0.8, 1], delay: arrive }}
            >
              <Label x={end.x} y={end.y - 100} size={26} color={color}>{label}</Label>
            </motion.g>
          </g>
        );
      })}
    </svg>
  );
}

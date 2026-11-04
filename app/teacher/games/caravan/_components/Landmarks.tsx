import { DESERT } from '../_lib/theme';

/**
 * Map landmarks, drawn in local coordinates with the base at (0, 0):
 * the three cities (each a recognisable silhouette) and the two surprise
 * squares. Static SVG, no state.
 */

export type CityKind = 'registan' | 'kalon' | 'kalta';

/** A dome on a drum; `w` = dome width. */
function Dome({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x - w * 0.42} y={y - 6} width={w * 0.84} height={14} fill={DESERT.tile} />
      <path d={`M ${x - w / 2} ${y - 6} Q ${x - w / 2} ${y - w * 0.95} ${x} ${y - w * 1.02} Q ${x + w / 2} ${y - w * 0.95} ${x + w / 2} ${y - 6} Z`} fill={DESERT.dome} />
      <path d={`M ${x - w * 0.3} ${y - 10} Q ${x - w * 0.3} ${y - w * 0.75} ${x - w * 0.05} ${y - w * 0.9}`} fill="none" stroke={DESERT.domeHi} strokeWidth={4} strokeLinecap="round" opacity={0.8} />
      <line x1={x} y1={y - w * 1.02} x2={x} y2={y - w * 1.02 - 14} stroke={DESERT.ink} strokeWidth={2.5} />
      <circle cx={x} cy={y - w * 1.02 - 16} r={3} fill={DESERT.sun} />
    </g>
  );
}

/** Pointed arch (doorway) of width `w` and height `h`, standing on (x, y). */
const arch = (x: number, y: number, w: number, h: number) =>
  `M ${x - w / 2} ${y} V ${y - h * 0.62} Q ${x - w / 2} ${y - h * 0.92} ${x} ${y - h} Q ${x + w / 2} ${y - h * 0.92} ${x + w / 2} ${y - h * 0.62} V ${y} Z`;

/** Slim minaret with a small dome. */
function Minaret({ x, h, w = 14 }: { x: number; h: number; w?: number }) {
  return (
    <g>
      <rect x={x - w / 2} y={-h} width={w} height={h} fill={DESERT.wall} stroke={DESERT.wallShade} strokeWidth={1.5} />
      {[0.3, 0.6, 0.85].map((f) => <rect key={f} x={x - w / 2} y={-h * f} width={w} height={4} fill={DESERT.tile} />)}
      <rect x={x - w / 2 - 3} y={-h - 6} width={w + 6} height={7} fill={DESERT.wallShade} />
      <path d={`M ${x - w / 2} ${-h - 6} Q ${x} ${-h - 26} ${x + w / 2} ${-h - 6} Z`} fill={DESERT.dome} />
    </g>
  );
}

export function City({ kind }: { kind: CityKind }) {
  return (
    <g>
      <ellipse cx={0} cy={4} rx={92} ry={12} fill="#000" opacity={0.1} />
      {kind === 'registan' && (
        // Samarqand: Registon portal (pishtaq) with a dome behind and two minarets.
        <g>
          <Dome x={0} y={-96} w={64} />
          <Minaret x={-66} h={128} />
          <Minaret x={66} h={128} />
          <rect x={-48} y={-112} width={96} height={112} fill={DESERT.wall} stroke={DESERT.wallShade} strokeWidth={2} />
          <rect x={-40} y={-104} width={80} height={104} fill="none" stroke={DESERT.tile} strokeWidth={5} />
          <path d={arch(0, 0, 46, 88)} fill={DESERT.arch} />
          <path d={arch(0, -8, 32, 66)} fill="none" stroke={DESERT.dome} strokeWidth={3} opacity={0.8} />
          <rect x={-40} y={-104} width={80} height={10} fill={DESERT.tile} />
        </g>
      )}
      {kind === 'kalon' && (
        // Buxoro: Poi Kalon — a tall tapering minaret beside a mosque dome.
        <g>
          <rect x={-88} y={-58} width={66} height={58} fill={DESERT.wall} stroke={DESERT.wallShade} strokeWidth={2} />
          <Dome x={-55} y={-58} w={56} />
          <path d={arch(-55, 0, 24, 40)} fill={DESERT.arch} />
          <path d="M 0 0 L 4 -150 L 24 -150 L 28 0 Z" transform="translate(-14 0)" fill={DESERT.wall} stroke={DESERT.wallShade} strokeWidth={2} />
          {[30, 62, 94, 126].map((y) => <rect key={y} x={-13 + y / 60} y={-y} width={26 - y / 30} height={5} fill={DESERT.tile} opacity={0.85} />)}
          <rect x={-15} y={-172} width={30} height={22} fill={DESERT.wall} stroke={DESERT.wallShade} strokeWidth={2} />
          {[-8, 0, 8].map((x) => <path key={x} d={arch(x, -154, 5, 14)} fill={DESERT.arch} />)}
          <path d="M -17 -172 L 17 -172 L 12 -182 L -12 -182 Z" fill={DESERT.wallShade} />
          <rect x={-40} y={-30} width={80} height={30} fill={DESERT.wall} stroke={DESERT.wallShade} strokeWidth={2} />
          <path d={arch(18, 0, 18, 26)} fill={DESERT.arch} />
        </g>
      )}
      {kind === 'kalta' && (
        // Xiva: Ichan Qal'a walls and the stubby turquoise Kalta Minor.
        <g>
          <rect x={-88} y={-52} width={176} height={52} fill={DESERT.wall} stroke={DESERT.wallShade} strokeWidth={2} />
          {Array.from({ length: 11 }, (_, i) => (
            <path key={i} d={`M ${-86 + i * 16} -52 Q ${-79 + i * 16} -64 ${-72 + i * 16} -52 Z`} fill={DESERT.wall} stroke={DESERT.wallShade} strokeWidth={1.5} />
          ))}
          <rect x={-96} y={-74} width={18} height={74} rx={6} fill={DESERT.wallShade} />
          <rect x={78} y={-74} width={18} height={74} rx={6} fill={DESERT.wallShade} />
          <path d="M -34 0 L -30 -136 L 30 -136 L 34 0 Z" fill={DESERT.dome} />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x={-33 + i * 0.5} y={-18 - i * 17} width={66 - i} height={8} fill={i % 2 ? DESERT.tile : DESERT.awningB} opacity={0.9} />
          ))}
          <rect x={-33} y={-142} width={66} height={8} rx={2} fill={DESERT.tile} />
          <path d={arch(0, 0, 30, 48)} fill={DESERT.arch} />
        </g>
      )}
    </g>
  );
}

/** Vaha: a pond with a palm tree. */
export function Oasis() {
  const frond = 'M 0 0 Q 16 -12 34 0 Q 16 -4 0 0 Z';
  return (
    <g>
      <ellipse cx={0} cy={0} rx={34} ry={11} fill={DESERT.water} stroke={DESERT.waterDeep} strokeWidth={2} />
      <ellipse cx={-8} cy={-2} rx={12} ry={3} fill="#fff" opacity={0.55} />
      <path d="M 14 -2 Q 10 -30 20 -58" fill="none" stroke={DESERT.trunk} strokeWidth={6} strokeLinecap="round" />
      <g transform="translate(20 -58)">
        {[-160, -120, -60, -20, 20].map((r) => <path key={r} d={frond} transform={`rotate(${r})`} fill={r % 40 ? DESERT.palm : DESERT.palmDeep} />)}
        <circle cx={-2} cy={4} r={3.5} fill={DESERT.trunk} />
        <circle cx={4} cy={5} r={3.5} fill={DESERT.trunk} />
      </g>
    </g>
  );
}

/** Bozor: a striped awning stall with fruit and coins. */
export function Bazaar() {
  return (
    <g>
      <line x1={-28} y1={0} x2={-28} y2={-44} stroke={DESERT.trunk} strokeWidth={4} />
      <line x1={28} y1={0} x2={28} y2={-44} stroke={DESERT.trunk} strokeWidth={4} />
      {Array.from({ length: 6 }, (_, i) => (
        <path key={i} d={`M ${-36 + i * 12} -46 L ${-24 + i * 12} -46 L ${-24 + i * 12} -32 Q ${-30 + i * 12} -26 ${-36 + i * 12} -32 Z`} fill={i % 2 ? DESERT.awningB : DESERT.awningA} />
      ))}
      <path d="M -38 -46 L 0 -62 L 38 -46 Z" fill={DESERT.awningA} />
      <rect x={-32} y={-14} width={64} height={14} rx={2} fill={DESERT.wallShade} />
      <circle cx={-18} cy={-18} r={6} fill="#f97316" />
      <circle cx={-6} cy={-19} r={6} fill="#84cc16" />
      <circle cx={8} cy={-18} r={5} fill={DESERT.sun} stroke={DESERT.ink} strokeWidth={1} />
      <circle cx={19} cy={-18} r={5} fill={DESERT.sun} stroke={DESERT.ink} strokeWidth={1} />
    </g>
  );
}

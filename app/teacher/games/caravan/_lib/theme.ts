/**
 * Fixed colors of the Karvon yo'li desert map — the same deliberate exception
 * to the teacher kit's "tokens only" rule as the stadium (penalty/_lib/theme.ts):
 * the scene must look the same under every palette. Never inline these elsewhere.
 */
export const DESERT = {
  sky: 'linear-gradient(180deg, #fde7b0 0%, #f8d28a 100%)',
  sandHi: '#f9e2ad',
  sand: '#f0cd86',
  dune: '#e6b768',
  duneDeep: '#d29d4c',
  road: '#fdf0cf',
  roadEdge: '#c98f45',
  stone: '#a8743a',
  ink: '#6b4419',
  sun: '#fbbf24',
  /** City: sandstone walls, turquoise domes (Registon colors). */
  wall: '#ecc890',
  wallShade: '#c99a5c',
  arch: '#7a4a1d',
  tile: '#0e7490',
  dome: '#14b8a6',
  domeHi: '#5eead4',
  /** Oasis + bazaar squares. */
  palm: '#3f8f3a',
  palmDeep: '#2d6a2a',
  trunk: '#8a5a2b',
  water: '#38bdf8',
  waterDeep: '#0284c7',
  awningA: '#dc2626',
  awningB: '#fff7ed',
  /** Question card header + the round's main buttons. */
  header: 'linear-gradient(120deg, #92400e 0%, #b45309 55%, #d97706 100%)',
  /** Sandstorm swirl. */
  storm: '#b7824a',
} as const;

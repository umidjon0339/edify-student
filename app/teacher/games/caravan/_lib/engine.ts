import { isCorrectPick, type GameQuestion } from '../../_lib/questionDeck';

/**
 * Karvon yo'li (Silk Road caravan race) rules as a pure reducer (docs/GAMES.md).
 * Time is passed in (`now` = performance.now()), never read here, and the
 * road's surprise squares are placed by the caller (`placeEvents`).
 *
 * Every round, EVERY team plays the same question:
 *   bet      → each team risks 1, 2 or 3 steps (shown with fingers);
 *   question → each team holds up a letter, the teacher taps it per team.
 *              The timer only ends the thinking time — answers can still be
 *              entered after it, until the teacher reveals;
 *   reveal   → correct = the caravan moves `bet` steps (×2 with a bazaar
 *              bonus); wrong / no answer with bet 3 = sandstorm, 1 step back,
 *              never behind the last city passed (cities are checkpoints);
 *   move     → the map plays the moves, then `settled`.
 * Ending a forward move on Vaha (oasis) = +1 step; on Bozor (bazaar) = the
 * team's next correct answer counts double. The first caravan in Xiva wins;
 * out of questions → the furthest one (ties share the place).
 */

export type Bet = 1 | 2 | 3;
export const BETS: Bet[] = [1, 2, 3];
/** The bet that risks a sandstorm. */
export const RISKY_BET: Bet = 3;

export type RoadEvent = 'oasis' | 'bazaar';

export type Phase = 'bet' | 'question' | 'reveal' | 'move' | 'finished';

/** Road lengths in steps (Samarqand = 0, Buxoro = half, Xiva = length). */
export const ROAD_LENGTHS = [12, 18, 24];

/** One team's result of a round, computed at reveal. */
export interface Move {
  picked: string | null;
  correct: boolean;
  bet: Bet;
  /** The bazaar bonus doubled this move. */
  doubled: boolean;
  from: number;
  /** Squares visited after `from`, in order (the oasis hop included). */
  path: number[];
  to: number;
  /** What happened where the move ended; 'storm' with to === from = a city sheltered it. */
  event: RoadEvent | 'storm' | null;
}

export interface CaravanState {
  phase: Phase;
  /** Questions not used yet, in play order. */
  deck: GameQuestion[];
  teamCount: number;
  length: number;
  /** Road position → surprise square. */
  events: Record<number, RoadEvent>;
  positions: number[];
  /** Bazaar bonus waiting for the team's next correct answer. */
  bonus: boolean[];
  bets: (Bet | null)[];
  answers: (string | null)[];
  question: GameQuestion | null;
  /** Questions opened so far. */
  round: number;
  /** Results of the last reveal (shown in the card, then played on the map). */
  moves: Move[] | null;
  timeLimitMs: number | null;
  endsAt: number | null;
  remainingMs: number | null;
  /** The thinking time ran out (answers can still be entered). */
  timeUp: boolean;
  pausedAt: number | null;
}

export type CaravanAction =
  | { type: 'init'; deck: GameQuestion[]; teamCount: number; length: number; events: Record<number, RoadEvent>; timeLimitMs: number | null }
  | { type: 'bet'; team: number; bet: Bet }
  | { type: 'open'; now: number }
  | { type: 'answer'; team: number; optionId: string | null }
  | { type: 'tick'; now: number }
  | { type: 'reveal' }
  | { type: 'go' }
  | { type: 'settled' }
  | { type: 'finish' }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number };

export function initialState(): CaravanState {
  return {
    phase: 'bet', deck: [], teamCount: 2, length: 18, events: {},
    positions: [0, 0], bonus: [false, false], bets: [null, null], answers: [null, null],
    question: null, round: 0, moves: null,
    timeLimitMs: null, endsAt: null, remainingMs: null, timeUp: false, pausedAt: null,
  };
}

/** Rough questions a race needs (≈1.2 steps per round on average): 12 → 10, 18 → 15, 24 → 20. */
export const questionsFor = (length: number) => Math.round(length / 1.2);

/** Road positions of the three cities. */
export const cities = (length: number) => [0, Math.floor(length / 2), length];

/** A sandstorm can't push a caravan behind the last city it reached. */
export const shelter = (pos: number, length: number) => Math.max(...cities(length).filter((c) => c <= pos));

/**
 * Two oases (one per half) and one bazaar, never on a city, next to a city
 * or next to each other. `rand` = Math.random in the game, seeded in tests.
 */
export function placeEvents(length: number, rand: () => number): Record<number, RoadEvent> {
  const mid = Math.floor(length / 2);
  const pick = (from: number, to: number, taken: number[]) => {
    const free: number[] = [];
    for (let p = from; p <= to; p++) if (taken.every((t) => Math.abs(t - p) > 1)) free.push(p);
    return free.length ? free[Math.floor(rand() * free.length)] : null;
  };
  const events: Record<number, RoadEvent> = {};
  const first = pick(2, mid - 2, []);
  const second = pick(mid + 2, length - 2, []);
  if (first !== null) events[first] = 'oasis';
  if (second !== null) events[second] = 'oasis';
  const taken = Object.keys(events).map(Number);
  const bazaar = rand() < 0.5 ? pick(2, mid - 2, taken) ?? pick(mid + 2, length - 2, taken) : pick(mid + 2, length - 2, taken) ?? pick(2, mid - 2, taken);
  if (bazaar !== null) events[bazaar] = 'bazaar';
  return events;
}

export const allBet = (s: CaravanState) => s.bets.every((b) => b !== null);
export const allAnswered = (s: CaravanState) => s.answers.every((a) => a !== null);
/** A caravan reached Xiva, or no question is left. */
export const isOver = (s: CaravanState) => s.positions.some((p) => p >= s.length) || s.deck.length === 0;

/** One team's move for this round. */
function moveFor(s: CaravanState, team: number): Move {
  const q = s.question!;
  const picked = s.answers[team];
  const correct = picked !== null && isCorrectPick(q, picked);
  const bet = s.bets[team] ?? 1;
  const from = s.positions[team];
  const doubled = correct && s.bonus[team];

  if (correct) {
    const target = Math.min(s.length, from + bet * (doubled ? 2 : 1));
    const path: number[] = [];
    for (let p = from + 1; p <= target; p++) path.push(p);
    const landed = s.events[target] ?? null;
    if (landed === 'oasis' && target < s.length) path.push(target + 1);
    return { picked, correct, bet, doubled, from, path, to: path[path.length - 1] ?? from, event: landed };
  }
  if (bet === RISKY_BET) {
    const to = Math.max(shelter(from, s.length), from - 1);
    return { picked, correct, bet, doubled: false, from, path: to < from ? [to] : [], to, event: 'storm' };
  }
  return { picked, correct, bet, doubled: false, from, path: [], to: from, event: null };
}

const filled = <T,>(n: number, v: T): T[] => Array.from({ length: n }, () => v);

export function reducer(state: CaravanState, action: CaravanAction): CaravanState {
  switch (action.type) {
    case 'init': {
      const n = Math.min(4, Math.max(2, action.teamCount));
      return {
        ...initialState(),
        deck: action.deck,
        teamCount: n,
        length: Math.max(4, action.length),
        events: action.events,
        positions: filled(n, 0),
        bonus: filled(n, false),
        bets: filled(n, null),
        answers: filled(n, null),
        timeLimitMs: action.timeLimitMs,
      };
    }

    case 'bet': {
      if (state.phase !== 'bet' || action.team < 0 || action.team >= state.teamCount || !BETS.includes(action.bet)) return state;
      return { ...state, bets: state.bets.map((b, i) => (i === action.team ? action.bet : b)) };
    }

    case 'open': {
      if (state.phase !== 'bet' || !allBet(state)) return state;
      const [question, ...deck] = state.deck;
      if (!question) return { ...state, phase: 'finished', question: null };
      const limit = state.timeLimitMs;
      return {
        ...state, phase: 'question', deck, question, round: state.round + 1,
        answers: filled(state.teamCount, null), moves: null, timeUp: false,
        endsAt: limit === null ? null : action.now + limit, remainingMs: limit, pausedAt: null,
      };
    }

    case 'answer': {
      if (state.phase !== 'question' || !state.question || state.pausedAt !== null) return state;
      if (action.team < 0 || action.team >= state.teamCount) return state;
      if (action.optionId !== null && !state.question.options.some((o) => o.id === action.optionId)) return state;
      return { ...state, answers: state.answers.map((a, i) => (i === action.team ? action.optionId : a)) };
    }

    case 'tick': {
      if (state.phase !== 'question' || state.endsAt === null || state.pausedAt !== null) return state;
      const remainingMs = Math.max(0, state.endsAt - action.now);
      if (remainingMs === 0) return { ...state, remainingMs: 0, endsAt: null, timeUp: true };
      return remainingMs === state.remainingMs ? state : { ...state, remainingMs };
    }

    case 'reveal': {
      if (state.phase !== 'question' || !state.question || state.pausedAt !== null) return state;
      const moves = Array.from({ length: state.teamCount }, (_, i) => moveFor(state, i));
      return { ...state, phase: 'reveal', moves, endsAt: null, pausedAt: null };
    }

    case 'go': {
      // Apply the moves; the map animates them during 'move'.
      if (state.phase !== 'reveal' || !state.moves) return state;
      const moves = state.moves;
      return {
        ...state,
        phase: 'move',
        positions: moves.map((m) => m.to),
        bonus: moves.map((m, i) => (m.event === 'bazaar' ? true : m.doubled ? false : state.bonus[i])),
      };
    }

    case 'settled':
      if (state.phase !== 'move') return state;
      return isOver(state)
        ? { ...state, phase: 'finished', question: null }
        : { ...state, phase: 'bet', question: null, bets: filled(state.teamCount, null), answers: filled(state.teamCount, null) };

    case 'finish':
      return state.phase === 'bet' ? { ...state, phase: 'finished', question: null } : state;

    case 'pause':
      return state.phase === 'question' && state.endsAt !== null && state.pausedAt === null ? { ...state, pausedAt: action.now } : state;

    case 'resume': {
      if (state.pausedAt === null) return state;
      const shift = action.now - state.pausedAt;
      return { ...state, pausedAt: null, endsAt: state.endsAt === null ? null : state.endsAt + shift };
    }
  }
}

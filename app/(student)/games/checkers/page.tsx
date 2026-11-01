'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Crown, Trophy, Users, Bot, Zap, Brain, Target, ShieldAlert, Skull, Loader2, Wifi, Hash, Flag, Volume2, VolumeX, Handshake } from 'lucide-react';
import { useStudentLanguage } from '../../layout';
import { Button, Card, Page, cn, sToast } from '@/components/student-ui';

// Firebase
import { runTransaction, doc, increment, setDoc, onSnapshot, updateDoc, deleteDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { applyUserXp, mirrorLeaderboards, notifyLevelUp, GAMES_DAILY_XP_CAP } from '@/lib/xp';
import { xpDayKey } from '@/lib/xpDays';

// Rules (strict Russian shashki) + engine worker
import {
  Player, BoardState, Position, Move, ChainState,
  ROWS, initializeBoard, legalMoves, applyStep, boardKey, countPieces,
} from './_components/rules';
import type { SearchRequest, SearchResult } from './_components/engine';
import { sfx, isMuted, setMuted } from './_components/sounds';

// Losses pay NOTHING (a lose reward made every game farmable), wins are capped
// by GAMES_DAILY_XP_CAP per UTC day (lib/xp.ts), and online games decided by an
// early forfeit pay nothing either — see the XP effect below. Draws pay 0.
const XP_REWARDS = {
  lose: 0,
  pvp_win: 10,
  win: { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10 }
};
/** An online game must have at least this many moves for forfeit XP to count. */
const MIN_MOVES_FOR_FORFEIT_XP = 10;

/** Quiet king moves (both sides, no capture, no man move) before a draw. */
const QUIET_MOVES_DRAW_LIMIT = 30;

/**
 * BOARD THEMES — these hexes are board ink, NOT design-system colors.
 *
 * A checkers board legitimately needs its own two-tone palette: the squares
 * must hold a hard contrast against each other and the red/black pieces have
 * to stay recognisable under every design.config.ts palette in both modes.
 * Injected as custom properties on the game root. Three switchable looks;
 * the piece palette is shared so red/black stay consistent everywhere.
 */
const PIECE_INK = {
  '--bd-hi': '#ffc53d',
  '--bd-hi-edge': '#c68b00',
  '--bd-red': '#d7263d',
  '--bd-red-rim': '#f0596d',
  '--bd-red-edge': '#7d101f',
  '--bd-red-ink': '#ffd3d9',
  '--bd-black': '#20252c',
  '--bd-black-rim': '#48515c',
  '--bd-black-edge': '#05070a',
  '--bd-black-ink': '#aab3bf',
} as const;

type BoardTheme = 'wood' | 'green' | 'slate';
const BOARD_THEMES: Record<BoardTheme, React.CSSProperties> = {
  wood: {
    ...PIECE_INK,
    '--bd-light': '#ead3a8',
    '--bd-dark': '#9a6b3e',
    '--bd-dark-hover': '#aa7b4e',
    '--bd-selected': '#7d5430',
    '--bd-frame': '#4a2f1b',
  } as React.CSSProperties,
  green: {
    ...PIECE_INK,
    '--bd-light': '#efe7d2',
    '--bd-dark': '#4a7457',
    '--bd-dark-hover': '#578364',
    '--bd-selected': '#3c5f49',
    '--bd-frame': '#2f4a38',
  } as React.CSSProperties,
  slate: {
    ...PIECE_INK,
    '--bd-light': '#e9e4d8',
    '--bd-dark': '#4e5d6c',
    '--bd-dark-hover': '#5d6d7d',
    '--bd-selected': '#3b4753',
    '--bd-frame': '#242a31',
  } as React.CSSProperties,
};
const THEME_KEY = 'checkers_board_theme';

// ============================================================================
// TRANSLATIONS
// ============================================================================
const TRANSLATIONS = {
  uz: {
    title: "Shashka", back: "Orqaga", setup: "O'yin sozlamalari", backToGames: "O'yinlar",
    mode: "Rejim", pvp_local: "1 qurilmada", pvp_online: "Do'st bilan", pve: "Botga qarshi", diff: "Qiyinchilik",
    levels: { 1: "Oson", 2: "Yengil", 3: "O'rtacha", 4: "Qiyin", 5: "Grosmeyster" },
    start: "Boshlash", botThinking: "O'ylamoqda...",
    youRed: "Siz (Qizil)", youBlack: "Siz (Qora)", you: "Siz", opponentBlack: "Raqib (Qora)", opponentRed: "Raqib (Qizil)", online: "Onlayn",
    resultTitleWin: "G'alaba!", resultTitleLose: "Mag'lubiyat", resultTitleDraw: "Durrang",
    xpEarned: "XP olindi", playAgain: "Yana o'ynash", exit: "Chiqish",
    createRoom: "Xona yaratish", joinRoom: "Kirish", enterCode: "4 xonali kod", waiting: "Do'st kutilmoqda...", roomCode: "Xona kodi:",
    resign: "Taslim bo'lish", opponentResigned: "Raqib taslim bo'ldi!", roomNotFound: "Xona topilmadi yoki band.",
    turnIndicatorMine: "Sizning navbat", turnIndicatorTheirs: "Raqib navbati",
    boardTheme: "Taxta", themes: { wood: "Yog'och", green: "Turnir", slate: "Tungi" },
  },
  en: {
    title: "Checkers", back: "Back", setup: "Game setup", backToGames: "All games",
    mode: "Mode", pvp_local: "Local 2P", pvp_online: "Play online", pve: "vs AI", diff: "Difficulty",
    levels: { 1: "Beginner", 2: "Easy", 3: "Medium", 4: "Hard", 5: "Grandmaster" },
    start: "Start", botThinking: "Thinking...",
    youRed: "You (Red)", youBlack: "You (Black)", you: "You", opponentBlack: "Opponent (Black)", opponentRed: "Opponent (Red)", online: "Online",
    resultTitleWin: "Victory!", resultTitleLose: "Defeat", resultTitleDraw: "Draw",
    xpEarned: "XP earned", playAgain: "Play again", exit: "Exit",
    createRoom: "Create room", joinRoom: "Join", enterCode: "4-digit code", waiting: "Waiting for friend...", roomCode: "Room code:",
    resign: "Resign", opponentResigned: "Opponent resigned!", roomNotFound: "Room not found or active.",
    turnIndicatorMine: "Your turn", turnIndicatorTheirs: "Opponent's turn",
    boardTheme: "Board", themes: { wood: "Wood", green: "Tournament", slate: "Night" },
  },
  ru: {
    title: "Шашки", back: "Назад", setup: "Настройки игры", backToGames: "Все игры",
    mode: "Режим", pvp_local: "На 1 устройстве", pvp_online: "Онлайн", pve: "Против бота", diff: "Сложность",
    levels: { 1: "Новичок", 2: "Легкий", 3: "Средний", 4: "Сложный", 5: "Гроссмейстер" },
    start: "Начать", botThinking: "Думает...",
    youRed: "Вы (Красный)", youBlack: "Вы (Черный)", you: "Вы", opponentBlack: "Противник (Черный)", opponentRed: "Противник (Красный)", online: "Онлайн",
    resultTitleWin: "Победа!", resultTitleLose: "Поражение", resultTitleDraw: "Ничья",
    xpEarned: "Получено XP", playAgain: "Играть снова", exit: "Выход",
    createRoom: "Создать комнату", joinRoom: "Войти", enterCode: "4-значный код", waiting: "Ожидание друга...", roomCode: "Код:",
    resign: "Сдаться", opponentResigned: "Противник сдался!", roomNotFound: "Комната не найдена или уже занята.",
    turnIndicatorMine: "Ваш ход", turnIndicatorTheirs: "Ход противника",
    boardTheme: "Доска", themes: { wood: "Дерево", green: "Турнир", slate: "Ночь" },
  }
};

const AnimatedNumber = ({ value }: { value: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number;
    const duration = 1200;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor((1 - Math.pow(2, -10 * progress)) * value));
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, [value]);
  return <>{count}</>;
};

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

type Winner = Player | 'draw' | null;

export default function CheckersGame() {
  const router = useRouter();
  const { lang } = useStudentLanguage();
  const { user } = useAuth();
  const t = TRANSLATIONS[lang as keyof typeof TRANSLATIONS] || TRANSLATIONS['en'];

  const [appState, setAppState] = useState<'menu' | 'playing'>('menu');
  const [mode, setMode] = useState<'pve' | 'pvp_local' | 'pvp_online'>('pve');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(3);

  const [board, setBoard] = useState<BoardState>(initializeBoard);
  const [turn, setTurn] = useState<Player>('red');
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  /** Mid capture-chain state: chain piece position + dead ("ghost") squares. */
  const [chain, setChain] = useState<ChainState | null>(null);
  const [winner, setWinner] = useState<Winner>(null);
  const [isBotThinking, setIsBotThinking] = useState(false);

  // Board theme + sound (loaded after mount to avoid hydration mismatch).
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('wood');
  const [muted, setMutedState] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) as BoardTheme | null;
    if (saved && BOARD_THEMES[saved]) setBoardTheme(saved);
    setMutedState(isMuted());
  }, []);
  const pickTheme = (th: BoardTheme) => { setBoardTheme(th); localStorage.setItem(THEME_KEY, th); };
  const toggleMute = () => { const m = !muted; setMutedState(m); setMuted(m); };

  // Online Multiplayer State
  const [roomCode, setRoomCode] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [myColor, setMyColor] = useState<Player>('red');
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);

  // XP State
  const [hasSavedXP, setHasSavedXP] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);

  // Anti-collusion inputs: how the game ended and how many moves it had.
  const [moveCount, setMoveCount] = useState(0);
  const [endedByForfeit, setEndedByForfeit] = useState(false);

  // Draw bookkeeping (the mover detects; online opponents get it via the doc).
  const repetitionRef = useRef(new Map<string, number>());
  const quietMovesRef = useRef(0);

  // Bot orchestration
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const botBusyRef = useRef(false);

  const isMyWin = winner !== 'draw' && winner !== null &&
    (mode === 'pvp_online' ? winner === myColor : winner === 'red');

  // --- ONLINE MULTIPLAYER SYNC ---
  useEffect(() => {
    if (mode === 'pvp_online' && roomCode) {
      const unsub = onSnapshot(doc(db, 'active_games', roomCode), (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();

        if (user?.uid === data.host) setMyColor('red');
        else if (user?.uid === data.guest) setMyColor('black');

        if (data.status === 'playing' && isWaitingForOpponent) setIsWaitingForOpponent(false);

        if (typeof data.moveCount === 'number') setMoveCount(data.moveCount);

        if (data.status === 'forfeit') {
          const winnerByForfeit = data.forfeitedBy === 'red' ? 'black' : 'red';
          setEndedByForfeit(true);
          setWinner(winnerByForfeit);
          if (data.forfeitedBy !== myColor) sToast.success(t.opponentResigned);
          return;
        }

        if (data.board) setBoard(JSON.parse(data.board));
        if (data.turn) setTurn(data.turn);
        if (data.winner) setWinner(data.winner);
        // Field kept as `mustJumpPiece` for doc-shape continuity; now holds the
        // whole chain state {pos, ghosts}.
        if (data.mustJumpPiece !== undefined) {
          setChain(data.mustJumpPiece ? JSON.parse(data.mustJumpPiece) : null);
        }
      });
      return () => unsub();
    }
  }, [mode, roomCode, isWaitingForOpponent, myColor, user?.uid, t.opponentResigned]);

  const resetLocalGame = () => {
    setBoard(initializeBoard()); setTurn('red'); setChain(null); setSelectedPos(null);
    setWinner(null); setHasSavedXP(false); setEarnedXP(0);
    setMoveCount(0); setEndedByForfeit(false);
    repetitionRef.current = new Map(); quietMovesRef.current = 0;
    requestIdRef.current++; botBusyRef.current = false; setIsBotThinking(false);
  };

  const handleCreateRoom = async () => {
    if (!user) return;
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    await setDoc(doc(db, 'active_games', code), {
      host: user.uid, guest: null, status: 'waiting', board: JSON.stringify(initializeBoard()), turn: 'red', winner: null, mustJumpPiece: null, moveCount: 0
    });
    resetLocalGame();
    setRoomCode(code);
    setMyColor('red');
    setIsWaitingForOpponent(true);
    setAppState('playing');
  };

  const handleJoinRoom = async () => {
    if (!user || joinCodeInput.length !== 4) return sToast.error(t.enterCode);
    const roomRef = doc(db, 'active_games', joinCodeInput);
    try {
      // Transactional join: get→check→update had a race where a second guest
      // could overwrite the first and lock them out (rules allow the write
      // while guest==null). Asserting inside the transaction closes it.
      const joined = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(roomRef);
        if (!snap.exists() || snap.data().status !== 'waiting' || snap.data().guest) return null;
        transaction.update(roomRef, { guest: user.uid, status: 'playing' });
        return snap.data();
      });
      if (!joined) return sToast.error(t.roomNotFound);

      resetLocalGame();
      setRoomCode(joinCodeInput);
      setMyColor('black');
      setIsWaitingForOpponent(false);
      setBoard(JSON.parse(joined.board));
      setTurn(joined.turn);
      setMoveCount(joined.moveCount || 0);
      setAppState('playing');
    } catch {
      sToast.error(t.roomNotFound);
    }
  };

  const handleResign = async () => {
    if (mode === 'pvp_online' && roomCode) {
      await updateDoc(doc(db, 'active_games', roomCode), { status: 'forfeit', forfeitedBy: myColor });
    } else {
      setWinner(turn === 'red' ? 'black' : 'red');
    }
  };

  // Single exit path back to the menu. Online: an unstarted room is deleted, a
  // live game counts as a resignation (no silent ghost rooms), a finished one
  // is cleaned up best-effort (finished docs used to accumulate forever).
  const handleExitToMenu = () => {
    if (mode === 'pvp_online' && roomCode) {
      const ref = doc(db, 'active_games', roomCode);
      if (isWaitingForOpponent || winner) deleteDoc(ref).catch(() => {});
      else updateDoc(ref, { status: 'forfeit', forfeitedBy: myColor }).catch(() => {});
    }
    setAppState('menu'); setRoomCode(''); setIsWaitingForOpponent(false);
    resetLocalGame();
  };

  const currentTurnMoves = useMemo(() => legalMoves(board, turn, chain), [board, turn, chain]);

  useEffect(() => {
    if (appState !== 'playing' || !board || board.length === 0 || isWaitingForOpponent || winner) return;
    const { red, black } = countPieces(board);
    if (red === 0) handleWinner('black');
    else if (black === 0) handleWinner('red');
    else if (currentTurnMoves.length === 0) handleWinner(turn === 'red' ? 'black' : 'red');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, turn, currentTurnMoves.length, appState, isWaitingForOpponent, winner]);

  const handleWinner = async (winPlayer: Player | 'draw') => {
    setWinner(winPlayer);
    if (winPlayer !== 'draw') {
      const iWon = mode === 'pvp_online' ? winPlayer === myColor : winPlayer === 'red';
      if (iWon) sfx.win(); else sfx.lose();
    }
    if (mode === 'pvp_online' && roomCode) {
      await updateDoc(doc(db, 'active_games', roomCode), { winner: winPlayer });
    }
  };

  // --- SAVE XP TRANSACTION LAYER ---
  // All user-doc math (streak advance + bonuses, daily-goal/level-up bonuses,
  // dailyHistory trim) and the leaderboard mirrors run through lib/xp.ts, in
  // ONE transaction. Guards: losses and draws pay 0; online games decided by an
  // early forfeit pay 0 (two-account collusion farm); a per-UTC-day games-XP
  // cap (users.gamesDaily {date, xp}) bounds vs-AI grinding.
  useEffect(() => {
    if (winner && !hasSavedXP && user && (mode === 'pve' || mode === 'pvp_online')) {
      setHasSavedXP(true);

      const rawXp = isMyWin ? (mode === 'pvp_online' ? XP_REWARDS.pvp_win : XP_REWARDS.win[difficulty]) : XP_REWARDS.lose;
      const collusionGuard = mode === 'pvp_online' && endedByForfeit && moveCount < MIN_MOVES_FOR_FORFEIT_XP;
      const xpBase = collusionGuard ? 0 : rawXp;
      if (xpBase <= 0) { setEarnedXP(0); return; }

      const saveMatch = async () => {
        try {
          // Game XP must also land on every class leaderboard the student is on
          // (it used to be invisible there).
          const classSnap = await getDocs(query(collection(db, 'classes'), where('studentIds', 'array-contains', user.uid)));
          const classIds = classSnap.docs.map(d => d.id);
          const todayKey = xpDayKey();

          const result = await runTransaction(db, async (transaction) => {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await transaction.get(userRef);
            const userData = userSnap.exists() ? userSnap.data()! : {};

            const gamesToday = userData.gamesDaily?.date === todayKey ? (userData.gamesDaily.xp || 0) : 0;
            const xpToAward = Math.min(xpBase, Math.max(0, GAMES_DAILY_XP_CAP - gamesToday));

            const applied = applyUserXp(transaction, userRef, userSnap, {
              xp: xpToAward,
              breakdown: xpToAward > 0 ? [`Checkers: +${xpToAward}`] : ['Daily games cap: +0'],
              activityEntry: { id: `chk_${Date.now()}`, game: 'Checkers', result: isMyWin ? 'win' : 'loss', xpEarned: xpToAward, timestamp: Date.now() },
              activityLimit: 10,
              extraUserFields: { gamesDaily: { date: todayKey, xp: gamesToday + xpToAward } },
            });

            mirrorLeaderboards(transaction, user.uid, applied.finalXp, {
              displayName: userData.displayName || user.displayName,
              avatar: userData.photoURL || user.photoURL || null,
            }, classIds);

            return applied;
          });

          setEarnedXP(result.finalXp);
          if (result.leveledUp) notifyLevelUp(user.uid, result.newLevel);
        } catch (error) { console.error("Error saving XP:", error); }
      };
      saveMatch();
    }
  }, [winner, mode, difficulty, hasSavedXP, user, myColor, isMyWin, endedByForfeit, moveCount]);

  // --- MOVE EXECUTION (humans and bot share this path) ---
  // Applies ONE step under strict shashki rules: captured pieces stay on the
  // board as dimmed "ghosts" until the chain completes; crowning mid-chain
  // continues the chain as a king. Returns the new snapshot so the bot can
  // thread a whole chain through without waiting for React state.
  const performStep = (
    bd: BoardState, ch: ChainState | null, start: Position, move: Move,
  ): { board: BoardState; chain: ChainState | null; turn: Player } => {
    const mover = bd[start.r][start.c]!;
    const wasKing = mover.isKing;
    const result = applyStep(bd, start, move, ch);

    if (result.crowned) sfx.crown();
    else if (result.captured) sfx.capture();
    else sfx.move();

    let nextTurn: Player = mover.player;
    if (result.chain) {
      setSelectedPos(result.chain.pos);
    } else {
      nextTurn = mover.player === 'red' ? 'black' : 'red';
      setSelectedPos(null);

      // Draw bookkeeping happens only on completed moves (mover side).
      if (result.captured || !wasKing) quietMovesRef.current = 0;
      else quietMovesRef.current++;
      const key = boardKey(result.board, nextTurn);
      const seen = (repetitionRef.current.get(key) ?? 0) + 1;
      repetitionRef.current.set(key, seen);
      if (seen >= 3 || quietMovesRef.current >= QUIET_MOVES_DRAW_LIMIT) {
        handleWinner('draw');
      }
    }

    setBoard(result.board);
    setChain(result.chain);
    setTurn(nextTurn);
    setMoveCount(c => c + 1);

    if (mode === 'pvp_online' && roomCode) {
      updateDoc(doc(db, 'active_games', roomCode), {
        board: JSON.stringify(result.board), turn: nextTurn,
        mustJumpPiece: result.chain ? JSON.stringify(result.chain) : null,
        moveCount: increment(1)
      }).catch(() => {});
    }

    return { board: result.board, chain: result.chain, turn: nextTurn };
  };

  // --- BOT ACTION CONTROLLER (engine in a Web Worker) ---
  const searchAsync = (request: SearchRequest, requestId: number): Promise<SearchResult | null> =>
    new Promise((resolve) => {
      try {
        if (!workerRef.current) {
          workerRef.current = new Worker(new URL('./_components/aiWorker.ts', import.meta.url));
        }
        const worker = workerRef.current;
        const onMessage = (e: MessageEvent<SearchResult & { requestId: number }>) => {
          if (e.data.requestId !== requestId) return;
          worker.removeEventListener('message', onMessage);
          resolve(e.data);
        };
        worker.addEventListener('message', onMessage);
        worker.postMessage({ ...request, requestId });
      } catch {
        // Worker unavailable (very old browser) — search on the main thread.
        import('./_components/engine')
          .then(engine => resolve(engine.findBestMove(request)))
          .catch(() => resolve(null));
      }
    });

  useEffect(() => () => { workerRef.current?.terminate(); }, []);

  useEffect(() => {
    if (appState !== 'playing' || mode !== 'pve' || turn !== 'black' || winner || botBusyRef.current) return;
    if (currentTurnMoves.length === 0) return;

    botBusyRef.current = true;
    const requestId = ++requestIdRef.current;
    const startBoard = board;

    const run = async () => {
      await delay(350);
      if (requestIdRef.current !== requestId) return;
      setIsBotThinking(true);

      const repeatKeys = Array.from(repetitionRef.current.entries())
        .filter(([, n]) => n >= 2).map(([k]) => k);
      const result = await searchAsync(
        { board: startBoard, player: 'black', level: difficulty, repeatKeys },
        requestId,
      );
      if (requestIdRef.current !== requestId) return;
      setIsBotThinking(false);
      if (!result?.move) { botBusyRef.current = false; return; }

      // Animate the chain step by step through the shared move path.
      let bd = startBoard;
      let ch: ChainState | null = null;
      let start = result.move.from;
      setSelectedPos(start);
      for (let i = 0; i < result.move.path.length; i++) {
        await delay(i === 0 ? 260 : 380);
        if (requestIdRef.current !== requestId) return;
        const step: Move = {
          r: result.move.path[i].r, c: result.move.path[i].c,
          capture: result.move.captures[i],
        };
        const applied = performStep(bd, ch, start, step);
        bd = applied.board; ch = applied.chain;
        start = { r: step.r, c: step.c };
      }
      botBusyRef.current = false;
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState, mode, turn, winner, difficulty, board, chain]);

  const handleSquareClick = (logicalR: number, logicalC: number) => {
    if (winner || isWaitingForOpponent) return;
    if (mode === 'pve' && turn === 'black') return;
    if (mode === 'pvp_online' && turn !== myColor) return;

    const clickedPiece = board[logicalR][logicalC];
    if (clickedPiece && clickedPiece.player === turn) {
      if (currentTurnMoves.some(m => m.start.r === logicalR && m.start.c === logicalC)) {
        setSelectedPos(selectedPos?.r === logicalR && selectedPos?.c === logicalC && !chain ? null : { r: logicalR, c: logicalC });
      }
      return;
    }
    if (selectedPos && board[logicalR][logicalC] === null) {
      const move = currentTurnMoves.find(m => m.start.r === selectedPos.r && m.start.c === selectedPos.c && m.move.r === logicalR && m.move.c === logicalC);
      if (move) performStep(board, chain, selectedPos, move.move);
      else if (!chain) setSelectedPos(null);
    }
  };

  const activeTargets = selectedPos ? currentTurnMoves.filter(m => m.start.r === selectedPos.r && m.start.c === selectedPos.c).map(m => m.move) : [];
  const ghosts = chain?.ghosts ?? [];

  // ============================================================================
  // VIEW: SETUP MENU
  // ============================================================================
  if (appState === 'menu') {
    const modeButton = (active: boolean) =>
      cn(
        // Edify style (2026-11-01): the pick wears the accent chip; no outlines.
        'flex flex-col items-center justify-center gap-2 rounded-m3-md p-3 s-press transition-colors',
        active
          ? 's-chip'
          : 'bg-state-hover text-on-surface-variant hover:text-on-surface',
      );

    return (
      <Page className="flex min-h-[calc(100dvh_-_var(--s-topbar-h)_-_var(--s-dock-h)_-_var(--s-safe-b)_-_16px)] flex-col items-center justify-center md:min-h-[calc(100dvh_-_var(--s-topbar-h)_-_2rem)]">

        {/* Permanent Back Button to All Games */}
        <div className="mb-4 w-full max-w-[440px]">
          <button
            type="button"
            onClick={() => router.push('/games')}
            className="s-panel s-press inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-extrabold text-on-surface"
          >
            <ArrowLeft size={16} strokeWidth={2.8} />
            {t.backToGames}
          </button>
        </div>

        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="w-full max-w-[440px]">
          <Card className="w-full sm:p-8">
            <span className="s-chip mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full">
              <Crown size={30} strokeWidth={2.5} />
            </span>
            <h1 className="s-display mb-8 text-center text-[clamp(22px,5vw,28px)] font-bold leading-tight">{t.setup}</h1>

            <div className="mb-6">
              <h3 className="mb-3 text-[12px] font-black uppercase tracking-widest text-on-surface-variant">{t.mode}</h3>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" aria-pressed={mode === 'pve'} onClick={() => setMode('pve')} className={modeButton(mode === 'pve')}>
                  <Bot size={24} strokeWidth={2.5} /><span className="text-center text-[11px] font-black">{t.pve}</span>
                </button>
                <button type="button" aria-pressed={mode === 'pvp_local'} onClick={() => setMode('pvp_local')} className={modeButton(mode === 'pvp_local')}>
                  <Users size={24} strokeWidth={2.5} /><span className="text-center text-[11px] font-black">{t.pvp_local}</span>
                </button>
                <button type="button" aria-pressed={mode === 'pvp_online'} onClick={() => setMode('pvp_online')} className={modeButton(mode === 'pvp_online')}>
                  <Wifi size={24} strokeWidth={2.5} /><span className="text-center text-[11px] font-black">{t.pvp_online}</span>
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {mode === 'pve' && (
                <motion.div key="pve" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-6 overflow-hidden">
                  <h3 className="mb-3 pt-2 text-[12px] font-black uppercase tracking-widest text-on-surface-variant">{t.diff}</h3>
                  <div className="grid grid-cols-5 gap-1 rounded-m3-md bg-state-hover p-1">
                    {[{ l: 1 as const, icon: Zap, c: 'text-success' }, { l: 2 as const, icon: Brain, c: 'text-success' }, { l: 3 as const, icon: Target, c: 'text-gold' }, { l: 4 as const, icon: ShieldAlert, c: 'text-warning' }, { l: 5 as const, icon: Skull, c: 'text-error' }].map((level) => (
                      <button
                        key={level.l}
                        type="button"
                        aria-pressed={difficulty === level.l}
                        onClick={() => setDifficulty(level.l)}
                        className={cn(
                          'relative flex flex-col items-center justify-center gap-1.5 rounded-m3-sm py-3 transition-all duration-m3-fast',
                          difficulty === level.l
                            ? 's-chip'
                            : cn('text-on-surface-variant', level.c),
                        )}
                      >
                        <level.icon size={18} strokeWidth={difficulty === level.l ? 3 : 2} /><span className="text-[9px] font-black uppercase tracking-tighter">{t.levels[level.l]}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {mode === 'pvp_online' && (
                <motion.div key="online" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-6 space-y-3 overflow-hidden pt-2">
                  <Button size="lg" fullWidth icon={<Wifi size={18} strokeWidth={3} />} onClick={handleCreateRoom}>
                    {t.createRoom}
                  </Button>
                  <div className="flex items-center gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="XXXX"
                        aria-label={t.enterCode}
                        value={joinCodeInput}
                        onChange={(e)=>setJoinCodeInput(e.target.value.replace(/\D/g, ''))}
                        className="s-panel h-14 w-full rounded-full pl-10 pr-4 font-mono text-xl font-black tracking-[0.4em] text-on-surface outline-none transition-shadow focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <Button size="lg" onClick={handleJoinRoom} disabled={joinCodeInput.length !== 4} className="h-14 shrink-0">
                      {t.joinRoom}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Board theme picker — mini board previews */}
            <div className="mb-6">
              <h3 className="mb-3 text-[12px] font-black uppercase tracking-widest text-on-surface-variant">{t.boardTheme}</h3>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(BOARD_THEMES) as BoardTheme[]).map(th => {
                  const vars = BOARD_THEMES[th] as Record<string, string>;
                  return (
                    <button
                      key={th}
                      type="button"
                      aria-pressed={boardTheme === th}
                      onClick={() => pickTheme(th)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-m3-md bg-state-hover p-2 s-press transition-shadow',
                        boardTheme === th && 'ring-2 ring-primary',
                      )}
                    >
                      <span className="grid h-8 w-8 grid-cols-2 grid-rows-2 overflow-hidden rounded" style={{ border: `2px solid ${vars['--bd-frame']}` }}>
                        <span style={{ background: vars['--bd-light'] }} />
                        <span style={{ background: vars['--bd-dark'] }} />
                        <span style={{ background: vars['--bd-dark'] }} />
                        <span style={{ background: vars['--bd-light'] }} />
                      </span>
                      <span className={cn('text-[10px] font-black', boardTheme === th ? 'text-primary' : 'text-on-surface-variant')}>{t.themes[th]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {mode !== 'pvp_online' && (
              <Button
                size="lg"
                fullWidth
                trailingIcon={<ArrowLeft size={20} className="rotate-180" strokeWidth={3} />}
                onClick={() => { resetLocalGame(); setAppState('playing'); }}
              >
                {t.start}
              </Button>
            )}
          </Card>
        </motion.div>
      </Page>
    );
  }

  // ============================================================================
  // VIEW: MAIN BOARD INTERFACE
  // ============================================================================

  const isMyTurn = turn === myColor || (mode === 'pve' && turn === 'red') || mode === 'pvp_local';

  const visualBoard = [];
  for (let visualR = 0; visualR < ROWS; visualR++) {
    for (let visualC = 0; visualC < ROWS; visualC++) {
      const logicalR = (mode === 'pvp_online' && myColor === 'black') ? 7 - visualR : visualR;
      const logicalC = (mode === 'pvp_online' && myColor === 'black') ? 7 - visualC : visualC;

      const piece = board[logicalR][logicalC];
      const isDark = (logicalR + logicalC) % 2 === 1;
      const isSelected = selectedPos?.r === logicalR && selectedPos?.c === logicalC;
      const isMoveTarget = activeTargets.some(m => m.r === logicalR && m.c === logicalC);
      const isGhostPiece = ghosts.some(g => g.r === logicalR && g.c === logicalC);

      const isMyOwnPiece =
        mode === 'pve' ? piece?.player === 'red' :
        mode === 'pvp_online' ? piece?.player === myColor :
        true;

      const hasAnyMove = currentTurnMoves.some(m => m.start.r === logicalR && m.start.c === logicalC);
      const isLegallyMovable =
        !winner &&
        !isWaitingForOpponent &&
        turn === piece?.player &&
        isMyOwnPiece &&
        !isGhostPiece &&
        (chain ? (chain.pos.r === logicalR && chain.pos.c === logicalC) : hasAnyMove);

      const isDimmedByMandatoryJump =
        (chain && piece && piece.player === turn && !(chain.pos.r === logicalR && chain.pos.c === logicalC)) || isGhostPiece;

      visualBoard.push({ logicalR, logicalC, piece, isDark, isSelected, isMoveTarget, isLegallyMovable, isDimmedByMandatoryJump, isGhostPiece });
    }
  }

  return (
    <div
      style={BOARD_THEMES[boardTheme]}
      className="flex w-full select-none flex-col overflow-hidden min-h-[calc(100dvh_-_var(--s-topbar-h)_-_var(--s-dock-h)_-_var(--s-safe-b)_-_16px)] md:min-h-[calc(100dvh_-_var(--s-topbar-h)_-_2rem)] lg:flex-row"
    >

      {/* WAITING OVERLAY */}
      {isWaitingForOpponent && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[color-mix(in_oklab,var(--m3-scrim)_60%,transparent)] p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-m3-xl bg-surface-container-lowest p-8 text-center shadow-elev-3">
             <span className="s-chip mx-auto mb-4 grid h-16 w-16 animate-pulse place-items-center rounded-full">
               <Wifi size={30} />
             </span>
             <h2 className="s-display mb-1 text-[20px] font-bold">{t.waiting}</h2>
             <p className="mb-4 text-[12px] font-bold text-on-surface-variant">{t.roomCode}</p>
             <div className="mb-6 rounded-full bg-state-hover py-3 font-mono text-3xl font-black tracking-[0.2em] text-on-surface">
               {roomCode}
             </div>
             <Button variant="text" size="sm" onClick={handleExitToMenu}>{t.back}</Button>
          </div>
        </div>
      )}

      {/* 📱 MOBILE TOP HEADER */}
      <header className="s-panel z-30 mx-2 mt-2 flex h-14 shrink-0 items-center justify-between gap-2 rounded-full px-2 lg:hidden">
        <Button variant="tonal" size="sm" icon={<ArrowLeft size={16} />} onClick={handleExitToMenu} className="shrink-0">
          {t.setup}
        </Button>

        <div className={cn(
          'flex min-w-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider',
          isMyTurn ? 's-chip' : 'bg-state-hover text-on-surface-variant',
        )}>
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', isMyTurn ? 'animate-ping bg-current' : 'bg-outline')} />
          <span className="truncate">{isBotThinking ? t.botThinking : isMyTurn ? t.turnIndicatorMine : t.turnIndicatorTheirs}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button variant="text" size="sm" icon={muted ? <VolumeX size={16} /> : <Volume2 size={16} />} onClick={toggleMute} aria-label="sound" />
          <Button variant="tonal" tone="error" size="sm" icon={<Flag size={14} />} onClick={handleResign}>
            {t.resign}
          </Button>
        </div>
      </header>

      {/* BOARD */}
      <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center p-2 sm:p-6">

        <div className="relative flex aspect-square w-full max-w-[min(100vw-1rem,500px)] items-center justify-center rounded-m3-lg border-b-[10px] border-[var(--bd-frame)] bg-[var(--bd-frame)] p-2 shadow-elev-3 sm:p-4 lg:max-w-[min(100vh-3rem,680px)]">

          <motion.div layoutRoot className="relative grid h-full w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-m3-sm border-4 border-[var(--bd-frame)] bg-[var(--bd-light)]">

            {visualBoard.map(({ logicalR, logicalC, piece, isDark, isSelected, isMoveTarget, isLegallyMovable, isDimmedByMandatoryJump, isGhostPiece }) => (
              <div
                key={`sq-${logicalR}-${logicalC}`}
                onClick={() => isDark && handleSquareClick(logicalR, logicalC)}
                className={`relative w-full h-full flex items-center justify-center select-none
                  ${isDark ? 'bg-[var(--bd-dark)]' : 'bg-[var(--bd-light)]'}
                  ${isDark && isLegallyMovable && !isSelected ? 'hover:bg-[var(--bd-dark-hover)]' : ''}
                  ${isSelected ? 'bg-[var(--bd-selected)] shadow-[inset_0_0_0_4px_var(--bd-hi)]' : ''}
                `}
              >
                {isMoveTarget && <motion.div layoutId="target" className="absolute z-10 h-[28%] w-[28%] rounded-full border-2 border-[var(--bd-hi-edge)] bg-[var(--bd-hi)] shadow-elev-1" />}

                <AnimatePresence>
                  {piece && (
                    <motion.div
                      key={piece.id}
                      layoutId={piece.id}
                      layout
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0, opacity: 0 }}
                      transition={{ layout: { type: "spring", stiffness: 180, damping: 22 }, default: { duration: 0.2 } }}
                      style={{
                        width: '82%', height: '82%', position: 'absolute', zIndex: isSelected ? 30 : 20,
                        background: piece.player === 'red'
                          ? 'radial-gradient(circle at 32% 28%, var(--bd-red-rim), var(--bd-red) 62%, var(--bd-red-edge))'
                          : 'radial-gradient(circle at 32% 28%, var(--bd-black-rim), var(--bd-black) 62%, var(--bd-black-edge))',
                      }}
                      className={`
                        rounded-full shadow-[0_6px_12px_rgba(0,0,0,0.4)] flex items-center justify-center cursor-grab active:cursor-grabbing
                        ${piece.player === 'red'
                          ? 'border-2 border-[var(--bd-red-rim)] border-b-[6px] border-b-[var(--bd-red-edge)]'
                          : 'border-2 border-[var(--bd-black-rim)] border-b-[6px] border-b-[var(--bd-black-edge)]'}

                        ${isLegallyMovable && !isSelected ? 'ring-4 ring-[var(--bd-hi)] ring-offset-2 ring-offset-[var(--bd-dark)] animate-pulse cursor-pointer hover:-translate-y-0.5 transition-transform' : ''}

                        ${isDimmedByMandatoryJump ? (isGhostPiece ? 'opacity-40 saturate-50' : 'opacity-30 grayscale') : ''}

                        ${isSelected ? 'ring-4 ring-[var(--bd-hi)] ring-offset-2 ring-offset-[var(--bd-selected)]' : ''}
                        ${!isLegallyMovable && !isSelected ? 'cursor-default' : ''}
                      `}
                    >
                      <div className={`w-[56%] h-[56%] rounded-full border flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] ${piece.player === 'red' ? 'border-[var(--bd-red-edge)] bg-[var(--bd-red-edge)]' : 'border-[var(--bd-black-edge)] bg-[var(--bd-black-edge)]'}`}>
                        {piece.isKing && (
                          <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
                            <Crown size={20} strokeWidth={3} className="text-[var(--bd-hi)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" fill="var(--bd-hi)" />
                          </motion.span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* 📱 MOBILE BOTTOM VS BAR */}
      <footer className="s-panel z-30 mx-2 mb-2 flex h-14 shrink-0 items-center justify-between gap-3 rounded-full px-5 lg:hidden">
         <div className={cn('flex min-w-0 items-center gap-2 transition-opacity', turn !== myColor ? 'font-bold text-on-surface opacity-100' : 'text-on-surface-variant opacity-50')}>
            <div className="grid h-6 w-6 shrink-0 place-items-center rounded border border-[var(--bd-black-rim)] bg-[var(--bd-black)] text-[10px] font-black text-[var(--bd-black-ink)]">
               {mode === 'pve' ? <Bot size={14}/> : 'P2'}
            </div>
            <span className="truncate text-xs">{mode === 'pvp_online' && myColor !== 'red' ? t.opponentRed : t.opponentBlack}</span>
         </div>

         <span className="shrink-0 text-[10px] font-black tracking-widest text-outline">VS</span>

         <div className={cn('flex min-w-0 items-center gap-2 transition-opacity', turn === myColor ? 'font-bold text-on-surface opacity-100' : 'text-on-surface-variant opacity-50')}>
            <span className="truncate text-xs">{mode === 'pvp_online' && myColor === 'black' ? t.youBlack : t.youRed}</span>
            <div className="grid h-6 w-6 shrink-0 place-items-center rounded border border-[var(--bd-red-rim)] bg-[var(--bd-red)] text-[10px] font-black text-[var(--bd-red-ink)]">
               <Crown size={14}/>
            </div>
         </div>
      </footer>

      {/* 💻 PC RIGHT SIDEBAR */}
      <div className="s-panel z-20 my-4 mr-4 hidden w-[360px] shrink-0 flex-col rounded-m3-xl p-6 lg:flex">

        <div className="mb-8 flex gap-2">
          <Button variant="tonal" fullWidth icon={<ArrowLeft size={16} strokeWidth={3} />} onClick={handleExitToMenu}>
            {t.setup}
          </Button>
          <Button variant="text" icon={muted ? <VolumeX size={18} /> : <Volume2 size={18} />} onClick={toggleMute} aria-label="sound" className="shrink-0" />
          <Button variant="tonal" tone="error" fullWidth icon={<Flag size={16} strokeWidth={3} />} onClick={handleResign}>
            {t.resign}
          </Button>
        </div>

        <div className={cn(
          'mb-8 flex w-full flex-col items-center justify-center gap-1 rounded-full py-4 transition-colors duration-m3-med',
          isMyTurn ? 's-chip' : 'bg-state-hover text-on-surface-variant',
        )}>
           <span className="text-[18px] font-black uppercase tracking-wider">
             {isBotThinking ? t.botThinking : isMyTurn ? t.turnIndicatorMine : t.turnIndicatorTheirs}
           </span>
           {!isMyTurn && <Loader2 size={16} className="mt-1 animate-spin" />}
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <Card className={cn('transition-all duration-m3-med', turn !== myColor ? 'ring-2 ring-gold' : 'opacity-60')}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-m3-sm border-b-4 border-[var(--bd-black-edge)] bg-[var(--bd-black)] text-lg font-black text-[var(--bd-black-ink)]">
                  {mode === 'pve' ? <Bot size={28}/> : 'P2'}
                </div>
                <div className="min-w-0">
                  <h3 className="s-display truncate text-[16px] font-bold">
                    {mode === 'pve' ? t.opponentBlack : mode === 'pvp_online' ? (myColor === 'red' ? t.opponentBlack : t.opponentRed) : t.opponentBlack}
                  </h3>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">{mode === 'pve' ? t.levels[difficulty] : t.online}</span>
                </div>
              </div>
              {turn !== myColor && <span className="h-3.5 w-3.5 shrink-0 animate-pulse rounded-full bg-gold"/>}
            </div>
          </Card>

          <Card className={cn('transition-all duration-m3-med', turn === myColor ? 'ring-2 ring-primary' : 'opacity-60')}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-m3-sm border-b-4 border-[var(--bd-red-edge)] bg-[var(--bd-red)] text-lg font-black text-[var(--bd-red-ink)]">
                  <Crown size={28}/>
                </div>
                <div className="min-w-0">
                  <h3 className="s-display truncate text-[16px] font-bold">
                    {mode === 'pvp_online' && myColor === 'black' ? t.youBlack : t.youRed}
                  </h3>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">{t.you}</span>
                </div>
              </div>
              {turn === myColor && <span className="h-3.5 w-3.5 shrink-0 animate-pulse rounded-full bg-primary"/>}
            </div>
          </Card>
        </div>
      </div>

      {/* 🟢 RESULTS MODAL */}
      <AnimatePresence>
        {winner && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[color-mix(in_oklab,var(--m3-scrim)_60%,transparent)] p-4 backdrop-blur-md">

            {isMyWin && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                 <motion.div initial={{ y: "100vh", x: "20vw", opacity: 0 }} animate={{ y: "-20vh", opacity: [0, 1, 0], rotate: 360 }} transition={{ duration: 3, ease: "easeOut" }} className="absolute text-6xl">🔥</motion.div>
                 <motion.div initial={{ y: "100vh", x: "80vw", opacity: 0 }} animate={{ y: "-10vh", opacity: [0, 1, 0], rotate: -180 }} transition={{ duration: 3.5, ease: "easeOut", delay: 0.2 }} className="absolute text-6xl">🎉</motion.div>
                 <motion.div initial={{ y: "100vh", x: "50vw", opacity: 0 }} animate={{ y: "-30vh", opacity: [0, 1, 0], rotate: 90 }} transition={{ duration: 4, ease: "easeOut", delay: 0.4 }} className="absolute text-7xl">🏆</motion.div>
              </div>
            )}

            <motion.div initial={{ scale: 0.9, opacity: 0, y: 15 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="w-full max-w-sm rounded-m3-xl bg-surface-container-lowest p-8 text-center shadow-elev-3">
               <div className={cn(
                 'mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full',
                 isMyWin ? 'bg-gold-container text-on-gold-container' : 'bg-surface-container-highest text-on-surface-variant',
               )}>
                  {winner === 'draw' ? <Handshake size={40} strokeWidth={2.5} /> : isMyWin ? <Trophy size={40} strokeWidth={2.5} /> : <Skull size={40} strokeWidth={2.5} />}
               </div>

               <h2 className="s-display text-[clamp(24px,6vw,30px)] font-bold leading-tight">
                  {winner === 'draw' ? t.resultTitleDraw : isMyWin ? t.resultTitleWin : t.resultTitleLose}
               </h2>

               {(mode === 'pve' || mode === 'pvp_online') && earnedXP > 0 && isMyWin && (
                  <div className="mt-6 rounded-m3-xl bg-gold p-4 text-on-gold">
                     <div className="mb-0.5 flex items-center justify-center gap-1 text-[11px] font-black uppercase tracking-widest"><Zap size={14} fill="currentColor"/> {t.xpEarned}</div>
                     <span className="text-4xl font-black tracking-tighter">+<AnimatedNumber value={earnedXP} /></span>
                  </div>
               )}

               <div className="mt-6">
                 <Button size="lg" fullWidth tone={isMyWin ? 'gold' : 'primary'} onClick={handleExitToMenu}>
                    {t.playAgain}
                 </Button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

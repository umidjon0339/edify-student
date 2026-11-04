'use client';

import { createPortal } from 'react-dom';
import { Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Flag, ListChecks, Maximize, Minimize, MonitorSmartphone, Pause, Volume2, VolumeX, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/lib/AuthContext';
import { useTeacherLanguage } from '@/app/teacher/layout';
import { Button, Card, ConfirmDialog, PageHeader, MOTION_ON } from '@/components/ui';
import { fetchTeacherTest } from '@/services/teacherTestService';
import type { Lang } from '@/types/Math';

import { analyzeTest, buildDeck } from '../_lib/questionDeck';
import { sfx, useGameSound } from '../_lib/sound';
import { useBigScreen } from '../_lib/useBigScreen';
import { STAGE } from '../_lib/stage';
import type { PickedTest } from '../_components/TestPicker';
import QuestionSource from '../_components/QuestionSource';
import { suggestCount } from '../_lib/aiSet';
import StageBackdrop from '../_components/StageBackdrop';
import TeamBar from '../_components/TeamBar';
import Podium from '../_components/Podium';
import { ControlButton, PauseOverlay } from '../_components/PlayControls';
import { allBet, initialState, placeEvents, questionsFor, reducer, type Bet } from './_lib/engine';
import { caravanText } from './_lib/i18n';
import { DESERT } from './_lib/theme';
import CaravanSettings from './_components/CaravanSettings';
import DesertMap, { moveSeconds, STEP_S } from './_components/DesertMap';
import BetPanel from './_components/BetPanel';
import RoundCard from './_components/RoundCard';

/**
 * Karvon yo'li — Silk Road caravan race (docs/GAMES.md).
 * Setup (test, 2–4 teams, road length, thinking time) → full-screen desert
 * map → podium. Every team answers every question.
 * No Firestore writes; the only read is the teacher's own `custom_tests`.
 */

/** How long the map lingers after the caravans stop (so the labels are read). */
const SETTLE_MS = 900;
const SETTLE_EVENT_MS = 1900;

/** One keyboard row per team: bets use its first 3 keys, answers its first 2–6. */
const ROW_KEYS = ['123456', 'qwerty', 'asdfgh', 'zxcvbn'];

export default function CaravanPage() {
  return (
    <Suspense fallback={null}>
      <Caravan />
    </Suspense>
  );
}

function Caravan() {
  const { user } = useAuth() as { user: { uid: string } | null };
  const { lang } = useTeacherLanguage();
  const t = caravanText(lang);
  const L = lang as Lang;
  const router = useRouter();
  const presetId = useSearchParams().get('testId');
  const reduced = useReducedMotion();
  const animate = MOTION_ON && !reduced;
  const bigScreen = useBigScreen();
  const [muted, toggleMute] = useGameSound();

  const [phase, setPhase] = useState<'setup' | 'play'>('setup');
  const [picked, setPicked] = useState<PickedTest | null>(null);
  const [teamCount, setTeamCount] = useState(2);
  const [rawNames, setRawNames] = useState(['', '', '', '']);
  const [seconds, setSeconds] = useState<number | null>(30);
  const [length, setLength] = useState(18);
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState());

  const names = rawNames.slice(0, teamCount).map((n, i) => n.trim() || t.defaultNames[i]);
  const dialogOpen = confirmExit || confirmFinish;

  // ?testId= from the library's quick-launch.
  useEffect(() => {
    if (!presetId || !user) return;
    let alive = true;
    fetchTeacherTest(presetId, user.uid)
      .then((test) => {
        if (!alive) return;
        if (!test) toast.error(t.testMissing);
        else setPicked({ test, analysis: analyzeTest(test.rawQuestions, L) });
      })
      .catch(() => alive && toast.error(t.testMissing));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId, user?.uid]);

  const startGame = useCallback(() => {
    if (!picked) return;
    dispatch({
      type: 'init',
      // The whole deck: running out just ends the race (furthest caravan wins).
      deck: buildDeck(picked.analysis.usable, L),
      teamCount,
      length,
      events: placeEvents(length, Math.random),
      timeLimitMs: seconds === null ? null : seconds * 1000,
    });
    setPhase('play');
    // Projector game: go full screen right away (allowed — we're inside the click).
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  }, [picked, L, teamCount, length, seconds]);

  const playing = phase === 'play';

  // Thinking clock — runs only while a timed question is open.
  const timed = playing && state.phase === 'question' && state.endsAt !== null && state.pausedAt === null;
  useEffect(() => {
    if (!timed) return;
    const id = window.setInterval(() => dispatch({ type: 'tick', now: performance.now() }), 100);
    return () => window.clearInterval(id);
  }, [timed]);

  // Move: the map plays the moves (with their sounds), then the round settles.
  useEffect(() => {
    if (!playing || state.phase !== 'move' || !state.moves) return;
    const moves = state.moves;
    const ids: number[] = [];
    const at = (s: number, fn: () => void) => ids.push(window.setTimeout(fn, s * 1000));
    if (animate) {
      const steps = Math.max(0, ...moves.filter((m) => m.event !== 'storm').map((m) => m.path.length));
      for (let k = 0; k < steps; k++) at(k * STEP_S + STEP_S * 0.5, sfx.step);
      if (moves.some((m) => m.event === 'storm')) at(0, sfx.storm);
      const oasis = moves.filter((m) => m.event === 'oasis').map((m) => m.path.length - 1);
      if (oasis.length) at(Math.min(...oasis) * STEP_S, sfx.oasis);
      const bazaar = moves.filter((m) => m.event === 'bazaar').map((m) => m.path.length);
      if (bazaar.length) at(Math.min(...bazaar) * STEP_S, sfx.coins);
    }
    const linger = moves.some((m) => m.event) ? SETTLE_EVENT_MS : SETTLE_MS;
    at(animate ? moveSeconds(moves) + linger / 1000 : 0.7, () => dispatch({ type: 'settled' }));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [playing, state.phase, state.moves, animate]);

  // Sounds that follow state rather than a click.
  const secs = state.remainingMs === null ? null : Math.ceil(state.remainingMs / 1000);
  useEffect(() => {
    if (timed && secs !== null && secs > 0 && secs <= 5) sfx.tick();
  }, [secs, timed]);
  useEffect(() => {
    if (!playing) return;
    if (state.phase === 'question') sfx.flip();
    if (state.phase === 'reveal') (state.moves?.some((m) => m.correct) ? sfx.correct : sfx.wrong)();
    if (state.phase === 'finished') sfx.win();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, state.phase]);
  useEffect(() => {
    if (playing && state.timeUp) sfx.timeout();
  }, [playing, state.timeUp]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const bet = (team: number, b: Bet) => {
    if (state.phase !== 'bet') return;
    sfx.bet();
    dispatch({ type: 'bet', team, bet: b });
  };
  const open = () => dispatch({ type: 'open', now: performance.now() });
  const answer = (team: number, optionId: string | null) => {
    if (optionId !== null) sfx.bet();
    dispatch({ type: 'answer', team, optionId });
  };
  const reveal = () => dispatch({ type: 'reveal' });
  const go = () => dispatch({ type: 'go' });

  // Keyboard: one row per team (1–6 / Q–Y / A–H / Z–N) = bet or answer,
  // Space/Enter = the round's main button, P = pause.
  const live = useRef({ state, dialogOpen, bet, open, answer, reveal, go });
  useEffect(() => { live.current = { state, dialogOpen, bet, open, answer, reveal, go }; });
  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [role="dialog"]')) return;
      const c = live.current;
      const s = c.state;
      if (c.dialogOpen) return;
      if (e.key === 'p' || e.key === 'P') {
        if (s.phase === 'question' && s.endsAt !== null) {
          dispatch({ type: s.pausedAt === null ? 'pause' : 'resume', now: performance.now() });
        }
        return;
      }
      if (s.pausedAt !== null) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (s.phase === 'bet' && allBet(s)) c.open();
        else if (s.phase === 'question') c.reveal();
        else if (s.phase === 'reveal') c.go();
        return;
      }
      const k = e.key.toLowerCase();
      for (let team = 0; team < s.teamCount; team++) {
        const idx = ROW_KEYS[team].indexOf(k);
        if (idx < 0) continue;
        if (s.phase === 'bet' && idx < 3) c.bet(team, (idx + 1) as Bet);
        if (s.phase === 'question' && s.question && idx < s.question.options.length) c.answer(team, s.question.options[idx].id);
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing]);

  // Don't lose a running game to an accidental tab close.
  useEffect(() => {
    if (!playing || state.phase === 'finished') return;
    const guard = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [playing, state.phase]);

  useEffect(() => {
    const onFs = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const leavePlay = () => {
    setConfirmExit(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setPhase('setup');
  };

  const requestExit = () => {
    if (state.phase === 'finished') return leavePlay();
    if (state.endsAt !== null && state.pausedAt === null) dispatch({ type: 'pause', now: performance.now() });
    setConfirmExit(true);
  };

  const cancelExit = () => {
    setConfirmExit(false);
    if (state.pausedAt !== null) dispatch({ type: 'resume', now: performance.now() });
  };

  // ── SETUP ────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 md:px-6">
        <Link href="/teacher/games" className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-on-surface-variant hover:text-primary">
          <ArrowLeft size={15} /> {t.back}
        </Link>
        <PageHeader title={t.title} subtitle={t.subtitle} />

        <div className="grid items-start gap-5 lg:grid-cols-[1.05fr_1fr]">
          <Card className="flex flex-col gap-3">
            <h2 className="text-[15px] font-bold text-on-surface">{t.step1}</h2>
            {user && (
              <QuestionSource uid={user.uid} lang={L} picked={picked} onPick={setPicked} suggestedCount={suggestCount(questionsFor(length))} t={t} />
            )}
          </Card>

          <div className="flex flex-col gap-5">
            <Card className="flex flex-col gap-3">
              <h2 className="text-[15px] font-bold text-on-surface">{t.step2}</h2>
              {picked && <p className="truncate text-[13px] font-semibold text-primary">{picked.test.title}</p>}
              <CaravanSettings
                picked={picked}
                teamCount={teamCount}
                onTeamCount={setTeamCount}
                names={rawNames}
                onName={(i, v) => setRawNames((n) => n.map((x, k) => (k === i ? v : x)))}
                length={length}
                onLength={setLength}
                seconds={seconds}
                onSeconds={setSeconds}
                onStart={startGame}
                t={t}
              />
            </Card>

            <Card variant="filled" className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-[14px] font-bold text-on-surface"><ListChecks size={16} className="text-primary" /> {t.rulesTitle}</h3>
              <ol className="ml-5 list-decimal space-y-1 text-[12.5px] font-medium leading-relaxed text-on-surface-variant">
                {t.rules.map((r) => <li key={r}>{r}</li>)}
              </ol>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAY ─────────────────────────────────────────────────────────────────
  const finished = state.phase === 'finished';
  const cardOpen = state.question !== null && (state.phase === 'question' || state.phase === 'reveal');
  const canPause = state.phase === 'question' && state.endsAt !== null;
  const moving = state.phase === 'move';
  // Floating "+3" / "−1" on the team cards while the caravans move.
  const delta = moving && state.moves ? state.moves.map((m) => m.to - m.from) : null;

  // Portal to <body>: the shell's transformed page wrapper would otherwise
  // make `fixed` relative to the page column (see tug-of-war, docs/GAMES.md).
  return createPortal(
    <div style={{ background: STAGE.page }} className="font-t-body fixed inset-0 z-[90] flex flex-col overflow-hidden">
      <StageBackdrop animate={animate} />

      {!bigScreen ? (
        <div className="relative flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <MonitorSmartphone size={44} className="text-primary" />
          <p className="text-[18px] font-bold text-on-surface">{t.bigScreen}</p>
          <p className="max-w-xs text-[14px] font-medium text-on-surface-variant">{t.bigScreenHint}</p>
          <Button variant="outlined" icon={<X />} onClick={leavePlay}>{t.exit}</Button>
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col gap-[clamp(8px,1.4vh,18px)] p-[clamp(8px,1.4vh,20px)]">
          <TeamBar names={names} scores={state.positions} turn={-1} delta={delta} deltaKey={state.round} turnLabel="" animate={animate} />

          {/* Map + bet strip; the question card overlays both */}
          <div className="relative flex min-h-0 flex-1 flex-col gap-[clamp(6px,1vh,12px)]">
            <div
              className="relative min-h-0 flex-1 overflow-hidden rounded-[clamp(16px,1.8vw,30px)] shadow-elev-2"
              style={{ background: `linear-gradient(180deg, #fef3c7 0 50%, ${DESERT.sand} 50%)` }}
            >
              <DesertMap
                length={state.length}
                teamCount={state.teamCount}
                positions={state.positions}
                bonus={state.bonus}
                events={state.events}
                moves={moving || state.phase === 'bet' ? state.moves : null}
                moving={moving}
                moveKey={state.round}
                animate={animate}
                t={t}
              />
            </div>

            <BetPanel
              names={names}
              bets={state.bets}
              bonus={state.bonus}
              moves={moving ? state.moves : null}
              canOpen={state.phase === 'bet' && allBet(state)}
              onBet={bet}
              onOpen={open}
              animate={animate}
              t={t}
            />

            <AnimatePresence>
              {cardOpen && state.question && (
                <RoundCard
                  key={`q-${state.question.key}`}
                  question={state.question}
                  round={state.round}
                  names={names}
                  bets={state.bets}
                  answers={state.answers}
                  moves={state.phase === 'reveal' ? state.moves : null}
                  timeLimitMs={state.timeLimitMs}
                  remainingMs={state.remainingMs}
                  timeUp={state.timeUp}
                  onAnswer={answer}
                  onReveal={reveal}
                  onGo={go}
                  animate={animate}
                  t={t}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Footer: teacher controls left, progress center, finish right */}
          <div className="grid h-[clamp(30px,4vh,42px)] shrink-0 grid-cols-[1fr_auto_1fr] items-center">
            <div className="flex h-full items-center gap-1.5">
              {canPause && (
                <ControlButton label={t.pause} onClick={() => dispatch({ type: 'pause', now: performance.now() })}>
                  <Pause className="h-[45%] w-[45%]" />
                </ControlButton>
              )}
              <ControlButton label={muted ? t.unmute : t.mute} onClick={toggleMute}>
                {muted ? <VolumeX className="h-[45%] w-[45%]" /> : <Volume2 className="h-[45%] w-[45%]" />}
              </ControlButton>
              <ControlButton label={t.fullscreen} onClick={toggleFullscreen}>
                {isFull ? <Minimize className="h-[45%] w-[45%]" /> : <Maximize className="h-[45%] w-[45%]" />}
              </ControlButton>
              <ControlButton label={t.exit} onClick={requestExit}><X className="h-[50%] w-[50%]" /></ControlButton>
            </div>
            {!finished ? (
              <span className="text-[clamp(11px,1.5vh,15px)] font-bold text-on-surface-variant">
                {state.round > 0 && `${t.questionNo(state.round)} · `}{t.questionsLeft(state.deck.length)}
              </span>
            ) : <span />}
            <div className="flex justify-end">
              {state.phase === 'bet' && state.round > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmFinish(true)}
                  className="inline-flex h-full items-center gap-1.5 rounded-full px-3 text-[clamp(11px,1.5vh,14px)] font-bold text-on-surface-variant opacity-70 transition hover:bg-state-hover hover:opacity-100"
                >
                  <Flag className="h-[1.1em] w-[1.1em]" /> {t.finishEarly}
                </button>
              )}
            </div>
          </div>

          <PauseOverlay
            open={state.pausedAt !== null && !confirmExit}
            onResume={() => dispatch({ type: 'resume', now: performance.now() })}
            t={t}
          />

          {finished && (
            <Podium
              names={names}
              scores={state.positions}
              animate={animate}
              onReplay={startGame}
              onSettings={leavePlay}
              onExit={() => { leavePlay(); router.push('/teacher/games'); }}
              t={t}
            />
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmExit}
        onClose={cancelExit}
        onConfirm={leavePlay}
        title={t.exitConfirmTitle}
        description={t.exitConfirmDesc}
        confirmText={t.exitConfirm}
        cancelText={t.cancel}
        danger
      />
      <ConfirmDialog
        open={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        onConfirm={() => { setConfirmFinish(false); dispatch({ type: 'finish' }); }}
        title={t.finishConfirmTitle}
        description={t.finishConfirmDesc}
        confirmText={t.finishConfirm}
        cancelText={t.cancel}
      />
    </div>,
    document.body,
  );
}

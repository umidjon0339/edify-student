'use client';

// The student CD-IELTS runner for reading & listening — both kinds
// (assignment | practice) and both modes (simulation | practice).
//
// Faithful computer-delivered-IELTS behaviors:
//   • reading: split-pane (passage 45 / questions 55) on desktop, a sticky
//     Passage/Questions segmented toggle with two full-screen panes on mobile;
//   • listening simulation: volume-check screen → parts play ONCE sequentially,
//     no pause/seek (read-only progress) → 2-minute "check your answers"
//     countdown after the last part → auto-submit;
//   • listening practice: per-part native audio controls (seek/pause/replay);
//   • bottom palette of every question number (answered/flagged/current),
//     grouped by passage/part; select-to-highlight marker (see highlight.ts);
//     8-step font scaler; drag-to-resize passage/questions split; red timer at
//     10 min, pulsing at 5; session resilience + tab-switch anti-cheat cloned
//     from the regular runner (localStorage cleared only after submit).
//
// Chrome suppression: like the regular test runner, this renders as a fixed
// full-bleed overlay above the student shell (`fixed inset-0 z-[100]`).
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle, Check, Clock, Eye, Headphones, Lock,
  Pause, Play, RotateCcw, RotateCw, ShieldAlert, Volume2, X, Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useStudentLanguage } from '@/app/(student)/layout';
import {
  Banner, Button, Card, Chip, ConfirmDialog, IconButton, Page, SegmentedControl,
  Slider, Spinner, cn, sToast,
} from '@/components/student-ui';
import { submitIeltsAttempt, type SubmitResult } from '@/services/ieltsService';
import StudentQuestionRenderer from './StudentQuestionRenderer';
import {
  buildPalette, clearSession, formatClock, isNumberAnswered, loadSession,
  saveSession, sessionKey, TYPE_LABELS, type AnswerMap, type PaletteNumber,
} from './shared';
import { toggleHighlight } from './highlight';
import { runnerT } from './i18n';

export interface IeltsRunnerProps {
  kind: 'assignment' | 'practice';
  mode: 'simulation' | 'practice';
  skill: 'reading' | 'listening';
  test: any; // IeltsReadingTest | IeltsListeningTest (answers_split verified by the route)
  groupId?: string;
  assignmentId?: string;
  dueAtMs?: number | null;
  /** Assignment snapshot override; falls back to test.total_time_minutes. */
  durationMinutes?: number;
  backHref: string;
}

// Reading comfort ramp — 8 steps from "fits more on screen" to large-print.
const FONT_SIZES = [12, 14, 16, 18, 20, 23, 26, 30];
const DEFAULT_FONT_STEP = 2; // 16px
const FONT_PREF_KEY = 'ielts:runner:font';

// Passage/questions split (desktop). Clamped so neither pane can be squeezed shut.
const SPLIT_DEFAULT = 45;
const SPLIT_MIN = 25;
const SPLIT_MAX = 75;
const SPLIT_PREF_KEY = 'ielts:runner:split';

const CHECK_MS = 2 * 60 * 1000; // listening "check your answers" window

const readPref = (key: string, fallback: number, min: number, max: number) => {
  if (typeof window === 'undefined') return fallback;
  const n = Number(window.localStorage.getItem(key));
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};
const writePref = (key: string, value: number) => {
  try { window.localStorage.setItem(key, String(value)); } catch { /* private mode */ }
};

type Phase = 'lobby' | 'volume' | 'taking' | 'submitted';

export default function IeltsRunner({
  kind, mode, skill, test, groupId, assignmentId, dueAtMs, durationMinutes, backHref,
}: IeltsRunnerProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { lang } = useStudentLanguage();
  const t = runnerT(lang);

  const [phase, setPhase] = useState<Phase>('lobby');
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [flags, setFlags] = useState<string[]>([]);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const [showFocusWarning, setShowFocusWarning] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const [activeGroupIdx, setActiveGroupIdx] = useState(0);
  const [mobilePane, setMobilePane] = useState<'passage' | 'questions'>('passage');
  const [fontStep, setFontStep] = useState(DEFAULT_FONT_STEP);
  const [currentQn, setCurrentQn] = useState<number | null>(null);

  // Draggable passage/questions divider (desktop only; % of the main row).
  const [splitPct, setSplitPct] = useState(SPLIT_DEFAULT);
  const [dragging, setDragging] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

  // Reading highlighter persistence (per passage, serialized block innerHTML).
  const passageRef = useRef<HTMLDivElement | null>(null);
  const highlightsRef = useRef<Record<string, string[]>>({});
  const [hlVersion, setHlVersion] = useState(0);

  // listening state
  const [audioPart, setAudioPart] = useState(0);           // simulation sequence position
  const [audioPhase, setAudioPhase] = useState<'idle' | 'playing' | 'check'>('idle');
  const [audioPos, setAudioPos] = useState(0);
  const [audioDur, setAudioDur] = useState(0);
  const [needResume, setNeedResume] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  // Practice mode: the audio part is independent of the part on screen, so a
  // student can read ahead (or look back) without killing playback.
  const [practiceAudioIdx, setPracticeAudioIdx] = useState(0);
  const [practicePlaying, setPracticePlaying] = useState(false);
  const [practiceRate, setPracticeRate] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const practiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const submittedRef = useRef(false);
  const isAwayRef = useRef(false);

  const isSim = mode === 'simulation';
  const isListening = skill === 'listening';
  const groups: any[] = (isListening ? test.parts : test.passages) || [];
  const parts: any[] = isListening ? groups : [];
  const palette = buildPalette(groups.map((g) => g.questions || []));
  const totalQuestions: number = test.total_questions || palette.length;
  const answeredCount = palette.filter((n) => isNumberAnswered(n, answers)).length;
  const durationMin = durationMinutes || test.total_time_minutes || (isListening ? 32 : 60);
  const STORAGE_KEY = sessionKey(user?.uid || 'anon', assignmentId, test.test_id);

  const remainingSec = endTime ? Math.round((endTime - nowTick) / 1000) : 0;
  const overtime = remainingSec < 0;
  // Auto-submit: simulation always — except while listening audio is actually
  // playing (real recordings with their reading pauses can outrun the nominal
  // time; the paper ends when the audio ends + the 2-min check window, not
  // mid-Part 4); the listening check window always; and any assignment when the
  // deadline itself is hit (the server rejects afterwards).
  const audioStillPlaying = isListening && isSim && audioPhase === 'playing' && !needResume;
  const autoSubmits = (isSim && !audioStillPlaying)
    || (isListening && audioPhase === 'check')
    || (kind === 'assignment' && !!dueAtMs && endTime === dueAtMs);

  // ---------------------------------------------------------------------------
  // Session restore (once per user)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!user) return;
    const saved = loadSession(STORAGE_KEY);
    if (!saved?.endTime || !saved.startedAt) return;
    let end = saved.endTime;
    if (dueAtMs && end > dueAtMs) end = dueAtMs;
    const expired = end - Date.now() <= 0;
    if (expired && (isSim || kind === 'assignment')) {
      clearSession(STORAGE_KEY);
      sToast.error(t.runner.expired);
      return;
    }
    setAnswers(saved.answers || {});
    setFlags(saved.flags || []);
    highlightsRef.current = saved.highlights || {};
    setEndTime(end);
    setStartedAt(saved.startedAt);
    setTabSwitches(saved.tabSwitches || 0);
    if (isListening && isSim && saved.audio) {
      if (saved.audio.phase === 'check') {
        setAudioPhase('check');
      } else {
        const restoredPart = Math.min(saved.audio.part || 0, Math.max(0, parts.length - 1));
        setAudioPart(restoredPart);
        setActiveGroupIdx(restoredPart); // show the questions for the part being heard
        setAudioPos(saved.audio.elapsed || 0);
        setAudioPhase('playing');
        setNeedResume(true); // autoplay needs a fresh user gesture
      }
    }
    setPhase('taking');
    sToast.success(t.runner.restored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // ---------------------------------------------------------------------------
  // Reading comfort prefs (font step + split ratio) — device-local, restored
  // after mount so the server-rendered markup stays identical.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setFontStep(readPref(FONT_PREF_KEY, DEFAULT_FONT_STEP, 0, FONT_SIZES.length - 1));
    setSplitPct(readPref(SPLIT_PREF_KEY, SPLIT_DEFAULT, SPLIT_MIN, SPLIT_MAX));
  }, []);

  const changeFont = (delta: number) => {
    setFontStep((f) => {
      const next = Math.min(FONT_SIZES.length - 1, Math.max(0, f + delta));
      writePref(FONT_PREF_KEY, next);
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Passage / questions splitter (desktop). Pointer capture keeps the drag alive
  // over the iframe-free panes; the ratio is remembered per device.
  // ---------------------------------------------------------------------------
  const moveSplit = useCallback((clientX: number) => {
    const row = mainRef.current;
    if (!row) return;
    const rect = row.getBoundingClientRect();
    if (!rect.width) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPct(Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, Math.round(pct * 10) / 10)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => { e.preventDefault(); moveSplit(e.clientX); };
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, moveSplit]);

  useEffect(() => { if (!dragging) writePref(SPLIT_PREF_KEY, splitPct); }, [dragging, splitPct]);

  // ---------------------------------------------------------------------------
  // Auto-save
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'taking' || !endTime || !startedAt) return;
    saveSession(STORAGE_KEY, {
      answers, flags, endTime, startedAt, tabSwitches,
      ...(Object.keys(highlightsRef.current).length ? { highlights: highlightsRef.current } : {}),
      ...(isListening && isSim && audioPhase !== 'idle'
        ? { audio: { part: audioPart, elapsed: audioPos, phase: audioPhase === 'check' ? 'check' : 'playing' } }
        : {}),
    });
  }, [answers, flags, endTime, startedAt, tabSwitches, audioPart, audioPos, audioPhase, phase, STORAGE_KEY, isListening, isSim, hlVersion]);

  // ---------------------------------------------------------------------------
  // Timer + auto-submit
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'taking') return;
    const id = setInterval(() => setNowTick(Date.now()), 500);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'taking' || !endTime || isSubmitting || submittedRef.current) return;
    // Practice-mode overtime must never sail past an assignment deadline —
    // the server rejects writes after dueAt, so submit at the deadline itself.
    const deadlineHit = kind === 'assignment' && !!dueAtMs && nowTick >= dueAtMs;
    if ((autoSubmits && endTime - nowTick <= 0) || deadlineHit) {
      sToast.reward(t.runner.timeUp, '⏰');
      void handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowTick, phase, endTime, autoSubmits, isSubmitting]);

  // ---------------------------------------------------------------------------
  // Anti-cheat focus tracking (regular-runner pattern)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'taking' || isSubmitting) return;
    const triggerFocusLoss = () => {
      if (isAwayRef.current || showSubmitConfirm || showFocusWarning) return;
      isAwayRef.current = true;
      setTabSwitches((c) => c + 1);
      if (isSim) setShowFocusWarning(true);
    };
    const onVisibility = () => {
      if (document.hidden) triggerFocusLoss();
      else isAwayRef.current = false;
    };
    // A bare `blur` is NOT proof the student left: selecting text raises the
    // native selection toolbar on Android, and focusing an answer input opens
    // the soft keyboard — both blur the window while the page still has focus.
    // Counting those made "select some text" look like cheating (and popped the
    // blocker mid-passage), so require the document to have actually lost focus.
    const onBlur = () => {
      if (typeof document.hasFocus === 'function' && document.hasFocus()) return;
      triggerFocusLoss();
    };
    const onFocus = () => { isAwayRef.current = false; };
    // Right-click is off for the whole sitting (both modes): the browser menu
    // offers translate/search/copy on the passage and it fights the marker.
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('contextmenu', onContextMenu);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('contextmenu', onContextMenu);
    };
  }, [phase, isSubmitting, showSubmitConfirm, showFocusWarning, isSim]);

  // ---------------------------------------------------------------------------
  // Passage highlighter — marks are created in highlight.ts (text-node walker,
  // NOT surroundContents) and persisted as serialized per-block innerHTML, so
  // they survive pane toggles / passage switches / reloads.
  // ---------------------------------------------------------------------------
  const persistHighlights = useCallback(() => {
    const container = passageRef.current;
    if (!container) return;
    const blocks = container.querySelectorAll<HTMLElement>('[data-hl-block]');
    highlightsRef.current[String(activeGroupIdx)] = Array.from(blocks).map((b) => b.innerHTML);
    setHlVersion((v) => v + 1); // triggers session save
  }, [activeGroupIdx]);

  const applyHighlight = useCallback(() => {
    const container = passageRef.current;
    if (!container) return;
    if (toggleHighlight(container)) persistHighlights();
  }, [persistHighlights]);

  // Restore saved highlights after React renders the (fresh) block content.
  // Safe with React: the blocks are dangerouslySetInnerHTML nodes, so React only
  // rewrites them when the source content string itself changes (passage switch).
  useEffect(() => {
    if (phase !== 'taking' || isListening) return;
    const container = passageRef.current;
    if (!container) return;
    const saved = highlightsRef.current[String(activeGroupIdx)];
    if (!saved?.length) return;
    const blocks = container.querySelectorAll<HTMLElement>('[data-hl-block]');
    blocks.forEach((b, i) => {
      if (saved[i] != null && saved[i] !== b.innerHTML) b.innerHTML = saved[i];
    });
  }, [phase, activeGroupIdx, isListening, mobilePane]);

  // Selection → mark. Always on, no tool button: releasing a selection inside
  // the passage marks it yellow, and selecting over yellow clears it.
  //
  // Listen on the document, not the pane: a drag that ends past the pane edge
  // still releases here, and toggleHighlight ignores selections that do not
  // touch the passage (e.g. text picked up in the questions pane). Touch gets a
  // tick of slack — a touchend can land before the browser settles the range.
  useEffect(() => {
    if (phase !== 'taking' || isListening) return;
    const container = passageRef.current;
    if (!container) return;

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') applyHighlight();
      else window.setTimeout(applyHighlight, 10);
    };

    document.addEventListener('pointerup', onPointerUp);
    return () => document.removeEventListener('pointerup', onPointerUp);
  }, [phase, activeGroupIdx, isListening, mobilePane, applyHighlight]);

  // ---------------------------------------------------------------------------
  // Listening simulation audio engine
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isListening || !isSim || phase !== 'taking' || audioPhase !== 'playing' || needResume) return;
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
    a.play().catch(() => setNeedResume(true));
  }, [isListening, isSim, phase, audioPhase, audioPart, needResume, volume]);

  const resumeAudio = () => {
    const a = audioRef.current;
    if (!a) return;
    try { a.currentTime = audioPos || 0; } catch { /* not seekable yet */ }
    a.volume = volume;
    a.play().then(() => setNeedResume(false)).catch(() => { /* keep the button */ });
  };

  const handleAudioEnded = () => {
    if (audioPart < parts.length - 1) {
      // Like CD-IELTS, the question pane follows the recording into the next part.
      setActiveGroupIdx(audioPart + 1);
      setAudioPart(audioPart + 1);
      setAudioPos(0);
    } else {
      // Official protocol: 2 minutes to check answers, then auto-submit.
      const end = dueAtMs ? Math.min(Date.now() + CHECK_MS, dueAtMs) : Date.now() + CHECK_MS;
      setAudioPhase('check');
      setEndTime(end);
    }
  };

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const beginTaking = () => {
    const now = Date.now();
    let end = now + durationMin * 60 * 1000;
    if (dueAtMs) end = Math.min(end, dueAtMs);
    setStartedAt(now);
    setEndTime(end);
    setNowTick(now);
    setPhase('taking');
    if (isListening && isSim) {
      setAudioPhase('playing');
      setAudioPart(0);
      setAudioPos(0);
      setActiveGroupIdx(0);
    }
    // Fullscreen only where it earns its keep: exam simulation on desktop.
    // In practice mode (or on phones, where it fails/disrupts) stay windowed.
    if (isSim && window.matchMedia('(min-width: 768px)').matches && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const startFromLobby = () => {
    if (isListening && isSim) {
      setPhase('volume');
    } else {
      beginTaking();
    }
  };

  const handleAnswer = (qn: number, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [String(qn)]: value }));
    setCurrentQn(qn);
  };

  const toggleFlag = (blockKey: string) => {
    setFlags((prev) => (prev.includes(blockKey) ? prev.filter((k) => k !== blockKey) : [...prev, blockKey]));
  };

  /** Switch the visible passage/part. In listening practice an idle player
   *  follows along; a playing one keeps playing its own part. */
  const selectGroup = (gi: number) => {
    setActiveGroupIdx(gi);
    if (isListening && !isSim && !practicePlaying) setPracticeAudioIdx(gi);
  };

  const nudgePractice = (deltaSec: number) => {
    const a = practiceAudioRef.current;
    if (!a) return;
    const max = Number.isFinite(a.duration) ? a.duration : Infinity;
    a.currentTime = Math.max(0, Math.min(max, a.currentTime + deltaSec));
  };

  const jumpTo = (n: PaletteNumber) => {
    selectGroup(n.groupIdx);
    setCurrentQn(n.qn);
    if (!isListening) setMobilePane('questions');
    setTimeout(() => {
      document.getElementById(`question-${n.targetQn}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const handleSubmit = async () => {
    if (submittedRef.current || isSubmitting) return;
    submittedRef.current = true;
    setShowSubmitConfirm(false);
    setIsSubmitting(true);
    try {
      const res = await submitIeltsAttempt({
        kind,
        ...(kind === 'assignment' ? { groupId, assignmentId } : {}),
        testId: test.test_id,
        skill,
        mode,
        answers,
        tabSwitches,
        timeSpentSeconds: startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0,
        startedAt: startedAt || Date.now(),
      });
      // Only now is the local session safe to discard.
      clearSession(STORAGE_KEY);
      audioRef.current?.pause();
      practiceAudioRef.current?.pause();
      setResult(res);
      setPhase('submitted');
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      sToast.success(t.result.title);
    } catch (e: any) {
      submittedRef.current = false;
      sToast.error(e?.message || t.runner.submitFail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmExit = () => {
    if (phase !== 'taking' || window.confirm(t.runner.exitConfirm)) router.push(backHref);
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  if (phase === 'lobby') {
    return (
      <Page width="full" className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background">
        <Card variant="outlined" className="w-full max-w-lg space-y-5 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-m3-lg bg-primary-container text-on-primary-container">
            {isListening ? <Headphones size={30} strokeWidth={2.5} /> : <Clock size={30} strokeWidth={2.5} />}
          </div>
          <div>
            <h1 className="s-display text-[24px] font-bold leading-tight text-on-surface">{test.test_title}</h1>
            <p className="mt-1.5 text-[12px] font-black uppercase tracking-[0.12em] text-on-surface-variant">
              <span className="s-num">{totalQuestions}</span> {t.lobby.questions} • <span className="s-num">{durationMin}</span> {t.lobby.minutes}
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <Chip status="primary">IELTS {skill}</Chip>
              <Chip status={isSim ? 'warning' : 'neutral'}>{isSim ? t.lobby.simulation : t.lobby.practice}</Chip>
            </div>
          </div>
          <Banner
            status="warning"
            className="text-left"
            icon={<AlertCircle size={20} strokeWidth={2.5} />}
            title={t.lobby.rulesTitle}
            description={
              <ul className="list-inside list-disc space-y-1">
                <li>{t.lobby.rule1}</li>
                <li>{t.lobby.rule2}</li>
                {isListening && isSim && <li>{t.lobby.ruleListening}</li>}
              </ul>
            }
          />
          <div className="space-y-2">
            <Button fullWidth size="lg" onClick={startFromLobby}>{t.lobby.start}</Button>
            <Button fullWidth variant="text" onClick={() => router.push(backHref)}>{t.common.cancel}</Button>
          </div>
        </Card>
      </Page>
    );
  }

  if (phase === 'volume') {
    return (
      <Page width="full" className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background">
        <Card variant="outlined" className="w-full max-w-md space-y-5 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-m3-lg bg-primary-container text-on-primary-container">
            <Volume2 size={30} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="s-display text-[22px] font-bold text-on-surface">{t.volume.title}</h1>
            <p className="mt-2 text-[13.5px] font-bold leading-relaxed text-on-surface-variant">{t.volume.desc}</p>
          </div>
          <audio
            ref={previewRef}
            src={parts[0]?.audio_url}
            loop
            preload="auto"
            className="hidden"
            onPlay={() => setPreviewPlaying(true)}
            onPause={() => setPreviewPlaying(false)}
          />
          <div className="flex items-center gap-3 rounded-m3-md border border-outline-variant bg-surface-container p-4">
            <IconButton
              aria-label={previewPlaying ? t.volume.pause : t.volume.play}
              variant="filled"
              onClick={() => {
                const a = previewRef.current;
                if (!a) return;
                if (previewPlaying) { a.pause(); } else { a.volume = volume; a.play().catch(() => {}); }
              }}
            >
              {previewPlaying ? <Pause size={18} /> : <Play size={18} />}
            </IconButton>
            <div className="flex-1 text-left">
              <p className="mb-1 text-[11px] font-black uppercase tracking-[0.12em] text-on-surface-variant">{t.volume.volume}</p>
              <Slider
                label={t.volume.volume}
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(e) => {
                  const v = Number(e.target.value) / 100;
                  setVolume(v);
                  if (previewRef.current) previewRef.current.volume = v;
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Button
              fullWidth
              size="lg"
              onClick={() => { previewRef.current?.pause(); beginTaking(); }}
            >
              {t.volume.start}
            </Button>
            <Button fullWidth variant="text" onClick={() => setPhase('lobby')}>{t.common.back}</Button>
          </div>
        </Card>
      </Page>
    );
  }

  if (phase === 'submitted' && result) {
    const canReview = kind === 'practice' || !!result.resultsVisible;
    return (
      <Page width="full" className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background">
        <Card variant="outlined" className="w-full max-w-md space-y-5 text-center">
          <h1 className="s-display text-[26px] font-bold text-on-surface">{t.result.title}</h1>

          {result.bandScore != null && (
            <div className="mx-auto flex h-28 w-28 flex-col items-center justify-center rounded-full bg-primary text-on-primary shadow-elev-2">
              <span className="s-display s-num text-[40px] font-bold leading-none">{result.bandScore.toFixed(1)}</span>
              <span className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] opacity-80">
                {t.result.band} · {t.result.indicative}
              </span>
            </div>
          )}

          {result.rawScore != null && (
            <p className="text-[13px] font-black uppercase tracking-[0.12em] text-on-surface-variant">
              {t.result.raw}: <span className="s-num text-on-surface">{result.rawScore}</span>
              <span className="s-num"> / {result.totalQuestions}</span>
            </p>
          )}

          {result.typeStats && Object.keys(result.typeStats).length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-on-surface-variant">{t.result.types}</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {Object.entries(result.typeStats).map(([type, s]) => (
                  <Chip
                    key={type}
                    size="sm"
                    status={s.correct === s.total ? 'success' : s.correct === 0 ? 'error' : 'neutral'}
                  >
                    {TYPE_LABELS[type] || type} <span className="s-num">{s.correct}/{s.total}</span>
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {result.xpSuggested > 0 && (
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full bg-gold-container px-4 py-2 text-on-gold-container">
              <Zap size={16} fill="currentColor" />
              <span className="s-num text-[15px] font-black">+{result.xpSuggested} {t.result.xp}</span>
            </div>
          )}

          {!canReview && kind === 'assignment' && (
            <div className="flex items-center justify-center gap-2 rounded-m3-md border border-dashed border-outline-variant bg-surface-container p-3 text-[12px] font-black uppercase tracking-[0.12em] text-on-surface-variant">
              <Lock size={15} strokeWidth={3} /> {t.result.hidden}
            </div>
          )}

          <div className="space-y-2 pt-1">
            {canReview && (
              <Button
                fullWidth
                size="lg"
                icon={<Eye size={19} strokeWidth={2.6} />}
                onClick={() => router.push(`/ielts/review/${result.attemptId}`)}
              >
                {t.result.review}
              </Button>
            )}
            <Button fullWidth variant="outlined" onClick={() => router.push(backHref)}>{t.result.back}</Button>
          </div>
        </Card>
      </Page>
    );
  }

  // -------------------------- TAKING --------------------------
  const group = groups[activeGroupIdx] || {};
  const unansweredQns = palette.filter((n) => !isNumberAnswered(n, answers)).map((n) => n.qn);
  const fontSize = FONT_SIZES[fontStep];
  const timerDanger = remainingSec <= 600; // red at 10 min
  const timerPulse = remainingSec <= 300;  // pulse at 5 min
  const audioDuration = audioDur || parts[audioPart]?.audio_duration_seconds || 0;

  return (
    <Page width="full" className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-background !p-0">

      {isSubmitting && (
        <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center gap-5 bg-[color-mix(in_srgb,var(--m3-surface)_92%,transparent)] backdrop-blur-md">
          <Spinner size={48} label={t.runner.submitting} />
          <div className="text-center">
            <h2 className="s-display text-[20px] font-bold text-on-surface">{t.runner.submitting}</h2>
            <p className="mt-1.5 text-[12px] font-black uppercase tracking-[0.12em] text-on-surface-variant">{t.runner.pleaseWait}</p>
          </div>
        </div>
      )}

      {/* Anti-cheat blocker — deliberately NOT a <Dialog>: only the button closes it. */}
      {showFocusWarning && !isSubmitting && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[color-mix(in_srgb,var(--m3-scrim)_60%,transparent)] p-4 backdrop-blur-md">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-sm rounded-m3-xl bg-surface-container-high p-7 text-center shadow-elev-3">
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-m3-lg bg-error-container text-on-error-container">
              <ShieldAlert size={32} strokeWidth={2.5} />
            </div>
            <h2 className="s-display mb-2 text-[20px] font-bold text-on-surface">{t.runner.focusTitle}</h2>
            <p className="mb-6 text-[13.5px] font-bold leading-relaxed text-on-surface-variant">{t.runner.focusDesc}</p>
            <Button fullWidth size="lg" tone="error" onClick={() => setShowFocusWarning(false)}>{t.runner.focusBtn}</Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showSubmitConfirm && !isSubmitting}
        onCancel={() => setShowSubmitConfirm(false)}
        onConfirm={handleSubmit}
        title={t.runner.submitTitle}
        description={
          `${t.runner.answered}: ${answeredCount} / ${totalQuestions}` +
          (unansweredQns.length
            ? ` — ${totalQuestions - answeredCount} ${t.runner.unanswered}\n${t.runner.unansweredList}: ` +
              `${unansweredQns.slice(0, 15).join(', ')}${unansweredQns.length > 15 ? '…' : ''}`
            : '')
        }
        confirmLabel={t.common.submit}
        cancelLabel={t.common.cancel}
      />

      {/* ---------------- HEADER ---------------- */}
      <header className="z-30 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-outline-variant bg-surface px-2 sm:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <IconButton aria-label={t.common.back} size="sm" onClick={confirmExit}>
            <X size={18} strokeWidth={2.6} />
          </IconButton>
          <span className="hidden truncate text-[12.5px] font-bold text-on-surface-variant lg:block">{test.test_title}</span>
          {/* Session auto-save reassurance (localStorage restore on reload) */}
          <span className="hidden items-center gap-1 text-[11px] font-black uppercase tracking-wide text-on-surface-variant sm:inline-flex">
            <Check size={12} strokeWidth={3} className="text-success" /> {t.runner.autoSaved}
          </span>
          {tabSwitches > 0 && isSim && (
            <Chip status="error" size="sm" className="hidden sm:inline-flex">{tabSwitches}×</Chip>
          )}
        </div>

        {/* Passage / part switcher */}
        <div className="flex items-center rounded-m3-sm border border-outline-variant bg-surface-container p-0.5">
          {groups.map((g: any, i: number) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveGroupIdx(i)}
              className={cn(
                'rounded-m3-xs px-2.5 py-1 text-[12px] font-bold transition-colors sm:px-3',
                activeGroupIdx === i
                  ? 'bg-surface text-primary shadow-elev-1'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              P{g.passage_number || g.part_number || i + 1}
            </button>
          ))}
        </div>

        <div className="flex flex-1 items-center justify-end gap-1.5">
          {/* Text size — 8 steps, remembered per device */}
          <div
            className="flex items-center rounded-m3-sm border border-outline-variant bg-surface-container p-0.5"
            title={`${t.runner.textSize}: ${FONT_SIZES[fontStep]}px`}
          >
            <button
              type="button"
              onClick={() => changeFont(-1)}
              disabled={fontStep === 0}
              aria-label={`${t.runner.textSize} −`}
              className="rounded-m3-xs px-2 py-0.5 text-[12px] font-bold text-on-surface-variant hover:bg-state-hover disabled:opacity-35"
            >
              A−
            </button>
            <span className="s-num hidden min-w-[22px] text-center text-[11px] font-black text-on-surface-variant sm:block">
              {FONT_SIZES[fontStep]}
            </span>
            <button
              type="button"
              onClick={() => changeFont(1)}
              disabled={fontStep === FONT_SIZES.length - 1}
              aria-label={`${t.runner.textSize} +`}
              className="rounded-m3-xs px-2 py-0.5 text-[15px] font-bold text-on-surface-variant hover:bg-state-hover disabled:opacity-35"
            >
              A+
            </button>
          </div>
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-m3-sm border px-2.5 py-1.5 text-[13px] font-black',
              timerDanger || overtime
                ? cn('border-error bg-error-container text-on-error-container', timerPulse && 'animate-pulse')
                : 'border-outline-variant bg-surface-container text-on-surface',
            )}
          >
            <Clock size={14} strokeWidth={2.6} />
            <span className="s-num">{formatClock(remainingSec)}</span>
          </div>
        </div>
      </header>

      {/* ---------------- MOBILE PANE TOGGLE (reading) ---------------- */}
      {!isListening && (
        <div className="z-20 flex shrink-0 justify-center border-b border-outline-variant bg-surface px-3 py-1.5 md:hidden">
          <SegmentedControl
            label={t.runner.passage}
            options={[
              { value: 'passage', label: t.runner.passage },
              { value: 'questions', label: t.runner.questions },
            ] as const}
            value={mobilePane}
            onChange={setMobilePane}
            className="w-full [&>button]:flex-1"
          />
        </div>
      )}

      {/* ---------------- LISTENING AUDIO BAR ---------------- */}
      {isListening && (
        <div className="z-20 shrink-0 border-b border-outline-variant bg-surface-container px-3 py-2">
          {isSim ? (
            <div className="flex items-center gap-3">
              <audio
                ref={audioRef}
                src={parts[audioPart]?.audio_url}
                preload="auto"
                className="hidden"
                onLoadedMetadata={(e) => setAudioDur(e.currentTarget.duration || 0)}
                onTimeUpdate={(e) => {
                  const s = Math.floor(e.currentTarget.currentTime);
                  setAudioPos((prev) => (prev === s ? prev : s));
                }}
                onEnded={handleAudioEnded}
              />
              <Volume2 size={16} className={cn('shrink-0', audioPhase === 'playing' ? 'text-primary' : 'text-on-surface-variant')} />
              <span className="shrink-0 text-[12px] font-black uppercase tracking-wide text-on-surface">
                {t.runner.part} <span className="s-num">{Math.min(audioPart + 1, parts.length)}/{parts.length}</span>
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-highest">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${audioDuration ? Math.min(100, (audioPos / audioDuration) * 100) : 0}%` }}
                />
              </div>
              {audioPhase === 'check' ? (
                <Chip status="warning" size="sm">{t.runner.checkTitle}</Chip>
              ) : needResume ? (
                <Button size="sm" onClick={resumeAudio} icon={<Play size={14} />}>{t.runner.resumeAudio}</Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 rounded-m3-xs bg-primary-container px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-on-primary-container">
                  P{parts[practiceAudioIdx]?.part_number || practiceAudioIdx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => nudgePractice(-5)}
                  aria-label={t.runner.back5}
                  title={t.runner.back5}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-m3-xs text-on-surface-variant hover:bg-state-hover"
                >
                  <RotateCcw size={16} />
                </button>
                <audio
                  key={practiceAudioIdx}
                  ref={practiceAudioRef}
                  controls
                  src={parts[practiceAudioIdx]?.audio_url}
                  preload="metadata"
                  className="h-9 min-w-0 flex-1"
                  onLoadedMetadata={(e) => { e.currentTarget.playbackRate = practiceRate; }}
                  onPlay={() => setPracticePlaying(true)}
                  onPause={() => setPracticePlaying(false)}
                  onEnded={() => setPracticePlaying(false)}
                />
                <button
                  type="button"
                  onClick={() => nudgePractice(5)}
                  aria-label={t.runner.fwd5}
                  title={t.runner.fwd5}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-m3-xs text-on-surface-variant hover:bg-state-hover"
                >
                  <RotateCw size={16} />
                </button>
                <select
                  aria-label={t.runner.speed}
                  title={t.runner.speed}
                  value={practiceRate}
                  onChange={(e) => {
                    const r = Number(e.target.value);
                    setPracticeRate(r);
                    if (practiceAudioRef.current) practiceAudioRef.current.playbackRate = r;
                  }}
                  className="h-8 shrink-0 rounded-m3-xs border border-outline-variant bg-surface px-1 text-[12px] font-bold text-on-surface"
                >
                  {[0.75, 0.9, 1, 1.1, 1.25].map((r) => (
                    <option key={r} value={r}>{r}×</option>
                  ))}
                </select>
              </div>
              {practiceAudioIdx !== activeGroupIdx && (
                <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-on-surface-variant">
                  <span>
                    {t.runner.nowPlaying}: {t.runner.part} {parts[practiceAudioIdx]?.part_number || practiceAudioIdx + 1}
                  </span>
                  <Button
                    size="sm"
                    variant="outlined"
                    icon={<Play size={12} />}
                    onClick={() => { setPracticePlaying(false); setPracticeAudioIdx(activeGroupIdx); }}
                  >
                    {t.runner.playThisPart}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------------- MAIN ---------------- */}
      <main
        ref={mainRef}
        className={cn('flex min-h-0 flex-1 overflow-hidden', dragging && 'select-none')}
        style={{ '--ielts-split': `${splitPct}%` } as React.CSSProperties}
      >
        {!isListening && (
          <>
            {/* PASSAGE PANE — width is the draggable split on md+ */}
            <div
              className={cn(
                's-scroll overflow-y-auto bg-surface-container-lowest md:block md:w-[var(--ielts-split)] md:shrink-0',
                mobilePane === 'passage' ? 'block w-full' : 'hidden',
              )}
            >
              <div
                id="ielts-passage"
                ref={passageRef}
                className="mx-auto w-full max-w-3xl p-4 pb-28 md:max-w-none md:p-6"
                style={{ fontSize: `${fontSize}px`, lineHeight: 1.65 }}
              >
                {group.instruction && (
                  <p className="mb-4 text-[0.85em] italic text-on-surface-variant">{group.instruction}</p>
                )}
                <h1 className="mb-1.5 text-center font-serif text-[1.6em] font-bold leading-tight text-on-surface">{group.title}</h1>
                {group.subtitle && (
                  <p className="mb-5 text-center font-serif text-[1em] italic text-on-surface-variant">{group.subtitle}</p>
                )}
                <div className="space-y-3 text-justify text-on-surface">
                  {group.blocks?.map((b: any, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      {b.label && <div className="mt-[0.15em] w-4 shrink-0 font-sans font-bold text-on-surface-variant">{b.label}</div>}
                      <div className="min-w-0 flex-1" data-hl-block={i} dangerouslySetInnerHTML={{ __html: String(b.content || '').replace(/\n/g, '<br/>') }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* DRAG HANDLE — drag to resize, double-click to reset, ←/→ to nudge */}
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label={t.runner.resizePanes}
              aria-valuenow={Math.round(splitPct)}
              aria-valuemin={SPLIT_MIN}
              aria-valuemax={SPLIT_MAX}
              tabIndex={0}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture?.(e.pointerId);
                setDragging(true);
              }}
              onDoubleClick={() => setSplitPct(SPLIT_DEFAULT)}
              onKeyDown={(e) => {
                if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                e.preventDefault();
                setSplitPct((p) =>
                  Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, p + (e.key === 'ArrowLeft' ? -2 : 2))),
                );
              }}
              className={cn(
                'group hidden w-2 shrink-0 cursor-col-resize touch-none items-center justify-center',
                'border-x border-outline-variant bg-surface-container-low md:flex',
                'hover:bg-primary-container focus-visible:bg-primary-container focus-visible:outline-none',
                dragging && 'bg-primary-container',
              )}
            >
              <span
                className={cn(
                  'h-8 w-[3px] rounded-full bg-outline transition-colors',
                  'group-hover:bg-primary',
                  dragging && 'bg-primary',
                )}
              />
            </div>
          </>
        )}

        {/* QUESTIONS PANE — takes whatever the split leaves */}
        <div
          className={cn(
            's-scroll overflow-y-auto bg-surface',
            isListening
              ? 'block w-full'
              : cn('md:block md:min-w-0 md:flex-1', mobilePane === 'questions' ? 'block w-full' : 'hidden'),
          )}
        >
          <div
            className={cn(
              'mx-auto w-full max-w-3xl space-y-6 p-4 pb-28 md:p-6',
              // Reading: the pane width IS the split the student dragged, so the
              // column must follow it. Listening has no split — keep the measure.
              !isListening && 'md:max-w-none',
            )}
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.65 }}
          >
            {isListening && isSim && audioPhase === 'check' && (
              <Banner status="warning" title={t.runner.checkTitle} description={t.runner.checkDesc} />
            )}
            {(group.questions || []).length === 0 ? (
              <p className="mt-10 text-center italic text-on-surface-variant">—</p>
            ) : (
              (group.questions || []).map((qb: any, idx: number) => {
                const blockKey = `g${activeGroupIdx}b${idx}`;
                return (
                  <StudentQuestionRenderer
                    key={blockKey}
                    qb={qb}
                    answers={answers}
                    onAnswer={handleAnswer}
                    flagged={flags.includes(blockKey)}
                    onToggleFlag={() => toggleFlag(blockKey)}
                  />
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* ---------------- PALETTE FOOTER ---------------- */}
      <footer className="z-30 shrink-0 border-t border-outline-variant bg-surface-container-low pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="s-scroll flex flex-1 items-center gap-1 overflow-x-auto px-0.5 pb-0.5">
            {groups.map((g: any, gi: number) => (
              <Fragment key={gi}>
                <button
                  type="button"
                  onClick={() => selectGroup(gi)}
                  className={cn(
                    'grid h-8 shrink-0 place-items-center rounded-m3-xs px-1.5 text-[10px] font-black uppercase tracking-wide',
                    activeGroupIdx === gi ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-state-hover',
                  )}
                >
                  P{g.passage_number || g.part_number || gi + 1}
                </button>
                {palette.filter((n) => n.groupIdx === gi).map((n) => {
                  const done = isNumberAnswered(n, answers);
                  const isFlagged = flags.includes(n.blockKey);
                  const isCurrent = currentQn === n.qn;
                  return (
                    <button
                      key={n.qn}
                      type="button"
                      onClick={() => jumpTo(n)}
                      aria-label={`Q${n.qn}`}
                      aria-current={isCurrent ? 'true' : undefined}
                      className={cn(
                        's-num grid h-8 min-w-[30px] shrink-0 place-items-center border text-[11px] font-bold transition-colors',
                        isFlagged ? 'rounded-full' : 'rounded-m3-xs', // flagged square → circle (official CD-IELTS)
                        done
                          ? 'border-transparent bg-primary text-on-primary'
                          : 'border-outline bg-surface text-on-surface-variant hover:bg-state-hover',
                        isCurrent && 'ring-2 ring-primary ring-offset-1 ring-offset-surface',
                      )}
                    >
                      {n.qn}
                    </button>
                  );
                })}
              </Fragment>
            ))}
          </div>
          <Button size="sm" tone="success" className="shrink-0" onClick={() => setShowSubmitConfirm(true)}>
            {t.common.submit}
          </Button>
        </div>
      </footer>
    </Page>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

/**
 * Exam lockdown — full-screen, and a warning when the student leaves the paper.
 *
 * The behaviour was already implemented four separate times (`IeltsRunner`,
 * `WritingRunner`, `SpeakingRunner`, the class-test runner) with slightly
 * different rules each. This is the one implementation the **Rasch / Milliy
 * sertifikat** sittings use, living in a hook so the three pages that render
 * `ExamRunner` cannot drift apart. Contract: docs/STUDENT.md.
 *
 * ## ⚠️ What a browser can and cannot enforce
 *
 * A web page **cannot** stop a student opening another tab. `Ctrl`/`⌘`+`T`,
 * `Ctrl`+`N`, a second window, a phone's app switcher and a second device are all
 * outside any page's reach, and nothing here pretends otherwise. What this hook
 * actually does:
 *
 * | Escape route | What happens |
 * |---|---|
 * | Switching tab / minimising / app-switching | `visibilitychange` + `blur` → counted, and a **blocking overlay** the student must dismiss |
 * | Leaving full screen (`Esc`, F11) | counted the same way, with a button to go back in |
 * | Reload, close, typing a URL | `beforeunload` → the browser's own "leave site?" prompt |
 * | Right-click → "open in new tab" | context menu suppressed |
 * | The app's own nav | not reachable — the runner is a `fixed inset-0` overlay above the shell |
 * | Clicking into an in-page `<iframe>` (SAT's Desmos calculator) | NOT counted — `blur` fires for this too, but `document.activeElement` is the iframe, not another tab; `visibilitychange` still catches a real switch from there |
 *
 * So the honest description is **detect and deter**, not prevent. The count is the
 * deterrent: it is shown live while the paper is being sat.
 *
 * ⚠️ `requestFullscreen()` must be called from inside a **user gesture**, so it is
 * NOT called on mount — mounting happens in a re-render after the click, and
 * Safari and Firefox reject it there. `requestExamFullscreen()` is exported as a
 * plain function for the page's own Start handler to call, and the runner offers a
 * button to re-enter if the browser refused or the student left.
 */

/**
 * Ask for full screen. Call this **synchronously inside a click handler** (the
 * Start button), never from an effect. Safe to call when already full screen.
 *
 * Failure is silent and non-fatal on purpose: an iOS Safari that has no Fullscreen
 * API at all must still be able to sit the paper — the runner is a full-viewport
 * overlay either way, so losing the browser chrome is an enhancement, not a
 * requirement.
 */
export function requestExamFullscreen(): void {
  if (typeof document === 'undefined') return;
  if (document.fullscreenElement) return;
  document.documentElement.requestFullscreen?.().catch(() => { /* refused — the overlay still covers the viewport */ });
}

/** Leave full screen, e.g. once the paper is submitted. Never throws. */
export function exitExamFullscreen(): void {
  if (typeof document === 'undefined') return;
  if (!document.fullscreenElement) return;
  document.exitFullscreen?.().catch(() => { /* already gone */ });
}

export interface ExamLockdown {
  /** How many times the student has left the paper. Shown live in the runner. */
  interruptions: number;
  /** An interruption is waiting to be acknowledged — render the blocking overlay. */
  warned: boolean;
  /** Acknowledge the warning. The only way to clear `warned`. */
  dismiss: () => void;
  /** Whether the document is currently in browser full screen. */
  isFullscreen: boolean;
  /** Re-enter full screen. Wire to a button — this IS a user gesture. */
  enterFullscreen: () => void;
}

export interface ExamLockdownOptions {
  /**
   * Off while the paper is not being sat (intro, results). ⚠️ Must be `false`
   * once submitted, or the results screen would keep warning and would hold a
   * `beforeunload` prompt over a student who is simply done.
   */
  active: boolean;
  /**
   * Called once per interruption, with the new total. Use it to persist the count
   * on the result document if that is wanted; nothing is written by default.
   */
  onInterruption?: (total: number) => void;
}

/**
 * Full-screen is EXTERNAL state with its own subscribe event, so it is read
 * through `useSyncExternalStore` rather than mirrored into `useState` from an
 * effect. That is both what the React Compiler's lint wants (a synchronous
 * setState in an effect body cascades renders) and simply correct: the browser
 * owns this value, and `Esc` changes it without asking React.
 *
 * The three functions are module-level so their identity is stable across
 * renders — an inline `subscribe` would re-subscribe on every render.
 */
const subscribeFullscreen = (onChange: () => void) => {
  document.addEventListener('fullscreenchange', onChange);
  return () => document.removeEventListener('fullscreenchange', onChange);
};
const getFullscreen = () => typeof document !== 'undefined' && !!document.fullscreenElement;
/** The server has no document, and a paper always starts out not full screen. */
const getServerFullscreen = () => false;

export function useExamLockdown({ active, onInterruption }: ExamLockdownOptions): ExamLockdown {
  const [interruptions, setInterruptions] = useState(0);
  const [warned, setWarned] = useState(false);
  const isFullscreen = useSyncExternalStore(subscribeFullscreen, getFullscreen, getServerFullscreen);

  /**
   * ⚠️ One interruption may fire BOTH `visibilitychange` and `blur` (switching
   * tab does), and leaving full screen fires `fullscreenchange` alongside them.
   * Without this latch a single switch would count as two or three. It is a ref,
   * not state, because the listeners must see the current value without being
   * re-bound.
   */
  const away = useRef(false);

  /**
   * The callback is held in a ref so a caller passing an inline arrow does not
   * re-bind every listener on each render. ⚠️ Synced in an EFFECT, not during
   * render — with the React Compiler on, writing a ref during render is a lint
   * error and genuinely unsafe under concurrent rendering.
   */
  const onInterruptionRef = useRef(onInterruption);
  useEffect(() => { onInterruptionRef.current = onInterruption; }, [onInterruption]);

  useEffect(() => {
    if (!active || typeof document === 'undefined') return;

    const leave = () => {
      if (away.current) return;
      away.current = true;
      setInterruptions((n) => {
        const total = n + 1;
        onInterruptionRef.current?.(total);
        return total;
      });
      setWarned(true);
    };

    /** Coming back re-arms the latch — but never clears the warning: the student
     *  has to acknowledge it, which is the entire deterrent. */
    const back = () => { away.current = false; };

    const onVisibility = () => { if (document.hidden) leave(); else back(); };
    /**
     * ⚠️ `window.blur` ALSO fires when focus moves into an in-page `<iframe>`
     * (the SAT runner's calculator, Desmos — the one iframe anywhere in the
     * student app) — that is not leaving the test, just clicking into an
     * embedded tool, so it must not count or trigger the overlay. A genuine
     * tab switch / app switch / minimize still fires `visibilitychange`
     * (`document.hidden`) independent of which element had focus, so that
     * detector is untouched and still catches the real thing even if the
     * student had the calculator focused when they switched away.
     */
    const onBlur = () => {
      if (document.activeElement?.tagName === 'IFRAME') return;
      leave();
    };
    const onFocus = () => back();
    // ⚠️ `isFullscreen` itself is NOT tracked here — useSyncExternalStore above
    // owns that. This listener exists only to COUNT a drop out of full screen as
    // an interruption. Entering is not one.
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) leave(); else back();
    };
    // Right-click → "Open link in new tab" is the one in-page escape route a
    // page can actually close.
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    /**
     * ⚠️ The message is ignored by every modern browser — they show their own
     * generic wording. `preventDefault()` + assigning `returnValue` is what
     * actually arms the prompt, and both are needed for cross-browser support.
     */
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [active]);

  /**
   * ⚠️ Full screen is released when the paper stops being active (submitted, or
   * the runner unmounted). Leaving the browser in full screen after a sitting
   * traps the student on a results page with no visible browser chrome.
   */
  useEffect(() => {
    if (active) return;
    exitExamFullscreen();
  }, [active]);

  const dismiss = useCallback(() => setWarned(false), []);
  const enterFullscreen = useCallback(() => requestExamFullscreen(), []);

  return { interruptions, warned, dismiss, isFullscreen, enterFullscreen };
}

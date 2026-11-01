'use client';

/**
 * Round light/dark switch with the circular "wave" reveal — the student-kit
 * twin of components/ui/ThemeWaveToggle.tsx (the two kits never import each
 * other). The new theme grows as a circle out of the button (View Transitions
 * API + clip-path on ::view-transition-new(root)); instant where the API is
 * missing, under OS reduced-motion, or with Motion_level 'none'. Sun in dark
 * mode, moon in light. flushSync makes the provider re-render `data-mode`
 * inside the transition callback so the "new" snapshot is the new theme.
 */
import { flushSync } from 'react-dom';
import { Moon, Sun } from 'lucide-react';
import { cn } from './cn';
import { MOTION_ON } from './config';
import { useStudentTheme } from './StudentThemeProvider';

type ViewTransitionLike = { ready: Promise<void>; finished: Promise<void> };
type StartViewTransition = (update: () => void) => ViewTransitionLike;

export function ThemeWaveToggle({ className, labels = { toLight: 'Light mode', toDark: 'Dark mode' } }: {
  className?: string;
  labels?: { toLight: string; toDark: string };
}) {
  const { mode, setModeOverride } = useStudentTheme();
  const next = mode === 'dark' ? 'light' : 'dark';
  const label = next === 'light' ? labels.toLight : labels.toDark;

  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const start = (document as unknown as { startViewTransition?: StartViewTransition }).startViewTransition;
    const reduce = !MOTION_ON || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!start || reduce) { setModeOverride(next); return; }

    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const root = document.documentElement;

    root.classList.add('s-theme-wave');
    const vt = start.call(document, () => { flushSync(() => setModeOverride(next)); });
    vt.ready
      .then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
          { duration: 650, easing: 'cubic-bezier(.45, 0, .2, 1)', pseudoElement: '::view-transition-new(root)' },
        );
      })
      .catch(() => {});
    vt.finished.finally(() => root.classList.remove('s-theme-wave'));
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn('s-theme-toggle grid place-items-center rounded-full', className)}
    >
      {mode === 'dark' ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
    </button>
  );
}

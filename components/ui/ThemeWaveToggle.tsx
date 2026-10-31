"use client";

/**
 * Round light/dark switch with a circular "wave" reveal: the new theme grows
 * as a circle out of the button until it covers the screen (View Transitions
 * API + a clip-path animation on ::view-transition-new(root)). Falls back to
 * an instant switch where the API is missing, under OS reduced-motion, or
 * with Motion_level 'none'. Shows the sun in dark mode, the moon in light.
 *
 * The mode change itself goes through useTeacherTheme().setPreference (a
 * per-device override, same as the profile-menu switch); flushSync makes the
 * provider's layout effect stamp data-t-mode inside the transition callback,
 * so the "new" snapshot really is the new theme.
 */
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { cn } from "./cn";
import { MOTION_ON } from "./config";
import { useTeacherTheme } from "./TeacherThemeProvider";

type ViewTransitionLike = { ready: Promise<void>; finished: Promise<void> };
type StartViewTransition = (update: () => void) => ViewTransitionLike;

export interface ThemeWaveToggleProps {
  className?: string;
  /** Accessible names, per target mode. */
  labels?: { toLight: string; toDark: string };
}

export function ThemeWaveToggle({ className, labels = { toLight: "Light mode", toDark: "Dark mode" } }: ThemeWaveToggleProps) {
  const { mode, setPreference, toggleEnabled } = useTeacherTheme();
  if (!toggleEnabled) return null;

  const next = mode === "dark" ? "light" : "dark";
  const label = next === "light" ? labels.toLight : labels.toDark;

  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const start = (document as unknown as { startViewTransition?: StartViewTransition }).startViewTransition;
    const reduce = !MOTION_ON || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!start || reduce) { setPreference(next); return; }

    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const root = document.documentElement;

    root.classList.add("t-theme-wave");
    const vt = start.call(document, () => { flushSync(() => setPreference(next)); });
    vt.ready
      .then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
          { duration: 650, easing: "cubic-bezier(.45, 0, .2, 1)", pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(() => {});
    vt.finished.finally(() => root.classList.remove("t-theme-wave"));
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn("t-theme-toggle grid place-items-center rounded-full", className)}
    >
      {mode === "dark" ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
    </button>
  );
}

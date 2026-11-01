'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DESIGN, themeAttributes } from './config';

/**
 * Stamps the design.config.ts choices onto the student shell root as data-*
 * attributes, which every token rule in theme.css keys off.
 *
 * Only `data-mode` needs runtime work: 'system' has to follow the device and
 * keep following it if the student flips their OS theme mid-session. A
 * per-device override (the light/dark wave switch in the top bar) wins over
 * both, persisted in localStorage `edify-s-mode`.
 *
 * This wraps the shell rather than <html> on purpose — the tokens stay scoped
 * to app/(student)/** and can never leak into the teacher/manager/admin trees.
 */
const STORAGE_KEY = 'edify-s-mode';

type Mode = 'light' | 'dark';

interface StudentThemeValue {
  mode: Mode;
  /** Per-device override; persisted. */
  setModeOverride: (m: Mode) => void;
}

const StudentThemeContext = createContext<StudentThemeValue | null>(null);

export function useStudentTheme(): StudentThemeValue {
  const ctx = useContext(StudentThemeContext);
  if (!ctx) throw new Error('useStudentTheme must be used inside StudentThemeProvider');
  return ctx;
}

export function StudentThemeProvider({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  // Server and first client render must agree, so start from a deterministic
  // value and only consult the device after mount.
  const [systemMode, setSystemMode] = useState<Mode>(DESIGN.Color_mode === 'dark' ? 'dark' : 'light');
  const [override, setOverride] = useState<Mode | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') setOverride(stored);
    } catch { /* private mode */ }

    if (DESIGN.Color_mode !== 'system') {
      setSystemMode(DESIGN.Color_mode);
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setSystemMode(mq.matches ? 'dark' : 'light');
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const mode: Mode = override ?? systemMode;

  const setModeOverride = useCallback((m: Mode) => {
    setOverride(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch { /* private mode */ }
  }, []);

  // Keeps native form controls, scrollbars and the browser UI in step.
  useEffect(() => {
    const prev = document.documentElement.style.colorScheme;
    document.documentElement.style.colorScheme = mode;
    return () => {
      document.documentElement.style.colorScheme = prev;
    };
  }, [mode]);

  return (
    <StudentThemeContext.Provider value={{ mode, setModeOverride }}>
      <div {...themeAttributes()} data-mode={mode} className={className}>
        {children}
      </div>
    </StudentThemeContext.Provider>
  );
}

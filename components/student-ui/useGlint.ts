'use client';

import { useEffect } from 'react';
import { MOTION_ON } from './config';

/** Elements that get the glint when pressed. */
const PRESSABLE = 'button, a[href], [role="button"], [role="tab"], [role="menuitem"], [role="option"]';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** Mounted providers — the listener is attached once however many there are
 *  (the dev theme gallery mounts several). */
let mounted = 0;
let detach: (() => void) | null = null;

/**
 * **The glint** (2026-11-01): a small light sweeps across any button, link or
 * tab the student presses — one delegated `pointerdown` listener on `document`,
 * so every pressable in the student tree gets it with no opt-in, including
 * dialogs portalled to `<body>`.
 *
 * The overlay is `position: fixed` on the element's box (`.s-glint` in
 * theme.css) and copies its border-radius, so the element itself is never
 * touched — no `overflow: hidden` or `relative` needed. Skipped for:
 * reduced motion / `Motion_level: 'none'`, non-primary buttons, disabled
 * elements, anything inside `[data-no-glint]`, and boxes too big to be a
 * button (a whole-card link would get a slab of light).
 */
export function useGlint() {
  useEffect(() => {
    if (!MOTION_ON) return;
    mounted += 1;
    if (mounted === 1) {
      const mq = window.matchMedia(REDUCED_MOTION);
      const onDown = (e: PointerEvent) => {
        if (e.button !== 0 || mq.matches) return;
        const el = (e.target as Element | null)?.closest<HTMLElement>(PRESSABLE);
        if (!el || el.closest('[data-no-glint]')) return;
        if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return;

        const r = el.getBoundingClientRect();
        if (r.width < 20 || r.height < 20 || r.height > 140 || r.width > 720) return;

        const g = document.createElement('span');
        g.className = 's-glint';
        g.setAttribute('aria-hidden', 'true');
        Object.assign(g.style, {
          left: `${r.left}px`,
          top: `${r.top}px`,
          width: `${r.width}px`,
          height: `${r.height}px`,
          borderRadius: getComputedStyle(el).borderRadius,
        });
        document.body.appendChild(g);
        window.setTimeout(() => g.remove(), 700);
      };
      document.addEventListener('pointerdown', onDown, { passive: true });
      detach = () => document.removeEventListener('pointerdown', onDown);
    }
    return () => {
      mounted -= 1;
      if (mounted === 0) { detach?.(); detach = null; }
    };
  }, []);
}

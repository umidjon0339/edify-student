'use client';

import { motion } from 'framer-motion';
import { cn } from './cn';
import { MOTION_ON, springTransition } from './config';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  /** Count shown as a small badge, e.g. unread notifications. */
  badge?: number;
}

export interface TabsProps<T extends string> {
  tabs: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the tab list. */
  label: string;
  className?: string;
}

/**
 * Scrollable tab bar. Edify style (2026-11-01): a glass pill capsule with the
 * accent chip gliding under the selected tab (was an underlined strip with a
 * full-width divider).
 */
export function Tabs<T extends string>({ tabs, value, onChange, label, className }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('s-panel s-no-scrollbar flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-full p-1', className)}
    >
      {tabs.map((tab) => {
        const on = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[13.5px] font-extrabold',
              'transition-colors duration-m3-fast ease-m3-std',
              on ? 's-on-chip' : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {on && (
              <motion.span
                layoutId="s-tab-indicator"
                transition={MOTION_ON ? springTransition : { duration: 0 }}
                className="s-chip absolute inset-0 rounded-full"
              />
            )}
            <span className="relative flex items-center gap-2">{tab.icon}{tab.label}</span>
            {tab.badge != null && tab.badge > 0 && (
              <span className="relative s-num grid h-5 min-w-5 place-items-center rounded-full bg-error px-1.5 text-[10.5px] font-black text-on-error">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

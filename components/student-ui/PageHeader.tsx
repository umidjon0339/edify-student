'use client';

import { cn } from './cn';

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-aligned actions — buttons, filters, segmented controls. */
  actions?: React.ReactNode;
  /** Back button target. Renders a leading chevron when set. */
  onBack?: () => void;
  className?: string;
}

/** Consistent page title block. Every student page opens with one. */
export function PageHeader({ title, subtitle, actions, onBack, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-center gap-3 pb-s-gap-lg', className)}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="s-panel grid h-10 w-10 shrink-0 place-items-center rounded-full text-on-surface s-press"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
            <polyline points="15 5 8 12 15 19" />
          </svg>
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="s-display truncate text-[clamp(22px,3.4vw,30px)] font-bold leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-[13.5px] font-bold text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export interface PageProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Caps the content width on wide screens. Full-bleed runners pass "full". */
  width?: 'default' | 'wide' | 'full';
  /** Drops the page padding entirely — for immersive runners and games.
   *  Prefer this over `className="!p-0"`: twMerge does not recognise the
   *  custom `px-s-page-x` utilities, so a plain `p-0` would not override them. */
  flush?: boolean;
}

/** Page content wrapper. Applies the density-driven page padding. */
export function Page({ width = 'default', flush = false, className, children, ...rest }: PageProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full min-w-0',
        !flush && 'px-s-page-x py-s-page-y',
        width === 'default' && 'max-w-5xl',
        width === 'wide' && 'max-w-7xl',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Vertical rhythm between page sections. */
export function Stack({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col gap-s-section', className)} {...rest}>
      {children}
    </div>
  );
}

'use client';

import { forwardRef } from 'react';
import { cn } from './cn';
import { DESIGN } from './config';

export interface ListGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Sticky section label above the rows, e.g. "Today". */
  header?: React.ReactNode;
  /** Overrides design.config.ts › List_style for this one list. */
  variant?: typeof DESIGN.List_style;
}

/**
 * A group of list rows.
 *
 * With List_style="grouped" (and Layout_density="platform") the group runs
 * edge-to-edge and rows are separated by hairlines — the macOS/Android
 * software look. With "cards" each row becomes its own floating card.
 */
export const ListGroup = forwardRef<HTMLDivElement, ListGroupProps>(function ListGroup(
  { header, variant, className, children, ...rest },
  ref,
) {
  const style = variant ?? DESIGN.List_style;
  const grouped = style === 'grouped';

  return (
    <section ref={ref} className={cn('s-list-group min-w-0', className)} {...rest}>
      {header && (
        <h2
          className={cn(
            // Edify style: a plain label above the glass group — no sticky
            // blurred band across the mesh canvas.
            'py-2',
            'text-[12px] font-black uppercase tracking-[0.1em] text-on-surface-variant',
            grouped && 'px-s-row-x',
          )}
        >
          {header}
        </h2>
      )}
      <div
        className={cn(
          grouped
            ? cn(
                // Edify style: one frosted glass island, faint row hairlines.
                's-surface-group s-panel overflow-hidden rounded-m3-lg',
                'divide-y divide-[color-mix(in_oklab,var(--m3-outline-variant)_55%,transparent)]',
              )
            : 'flex flex-col gap-s-gap',
        )}
      >
        {children}
      </div>
    </section>
  );
});

// `title` is redefined as rich content, so the DOM's string-only title
// attribute is omitted rather than shadowed.
export interface ListRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  /** Renders a chevron and hover state. Set when the row navigates. */
  clickable?: boolean;
  variant?: typeof DESIGN.List_style;
  as?: 'div' | 'li';
}

/** One row inside a ListGroup. */
export const ListRow = forwardRef<HTMLDivElement, ListRowProps>(function ListRow(
  { leading, title, subtitle, trailing, clickable = false, variant, as = 'div', className, children, ...rest },
  ref,
) {
  const style = variant ?? DESIGN.List_style;
  const grouped = style === 'grouped';
  // Widened so the shared props typecheck against every allowed tag.
  const Tag = as as React.ElementType;

  return (
    <Tag
      ref={ref}
      className={cn(
        'flex min-h-s-row items-center gap-3 px-s-row-x py-3',
        'transition-colors duration-m3-fast ease-m3-std',
        !grouped && 'rounded-m3-md border border-outline-variant bg-surface',
        clickable && 'cursor-pointer hover:bg-state-hover active:bg-state-press',
        className,
      )}
      {...rest}
    >
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold leading-tight">{title}</div>
        {subtitle && (
          <div className="truncate text-[12px] font-bold text-on-surface-variant">{subtitle}</div>
        )}
      </div>
      {trailing}
      {clickable && !trailing && (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0 text-outline"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
        >
          <polyline points="9 5 16 12 9 19" />
        </svg>
      )}
      {children}
    </Tag>
  );
});

export interface AvatarProps {
  /** Photo URL. Falls back to initials when absent or broken. */
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Circle (people) vs rounded square (subjects, classes). */
  shape?: 'circle' | 'square';
  className?: string;
}

const AVATAR_SIZES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-7 w-7 text-[11px]',
  sm: 'h-9 w-9 text-[12px]',
  md: 'h-11 w-11 text-[14px]',
  lg: 'h-14 w-14 text-[18px]',
  xl: 'h-20 w-20 text-[26px]',
};

/** User avatar with an initials fallback. */
export function Avatar({ src, name, size = 'md', shape = 'circle', className }: AvatarProps) {
  const initials = (name ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden font-black',
        'bg-primary-container text-on-primary-container',
        shape === 'circle' ? 'rounded-full' : 'rounded-m3-sm',
        AVATAR_SIZES[size],
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? ''} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{initials || '?'}</span>
      )}
    </div>
  );
}

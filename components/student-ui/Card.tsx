'use client';

import { forwardRef } from 'react';
import { cn } from './cn';
import { DESIGN } from './config';

type CardStyle = typeof DESIGN.Card_style;

/** Every card treatment, as pure token utilities. */
const STYLES: Record<CardStyle, string> = {
  filled: 'bg-surface-container',
  elevated: 'bg-surface-container-low shadow-elev-1',
  outlined: 'border border-outline-variant bg-surface',
  gradient:
    'bg-[linear-gradient(135deg,var(--s-grad-a),var(--s-grad-b))] text-white border-none',
  // Edify style (2026-11-01, the default): `.s-panel` from theme.css — the
  // glass look without a live blur (see the perf note there).
  glass: 's-panel',
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Overrides design.config.ts › Card_style for this one card. Use `gradient`
   *  for at most one hero card per screen. `glass` is the Edify default. */
  variant?: CardStyle;
  /** Adds hover lift + pointer cursor. Set on cards that navigate somewhere. */
  interactive?: boolean;
  /** Removes the inner padding, for cards that host their own edge-to-edge list. */
  flush?: boolean;
  as?: 'div' | 'article' | 'section' | 'li';
}

/**
 * The standard content surface.
 *
 * Defaults to design.config.ts › Card_style, so switching that one word
 * restyles every card in the app at once.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant, interactive = false, flush = false, as = 'div', className, children, ...rest },
  ref,
) {
  const style = variant ?? DESIGN.Card_style;
  // Widened so the shared props typecheck against every allowed tag.
  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={ref}
      className={cn(
        // s-contain stops a nested full-bleed ListGroup escaping this card.
        's-contain rounded-m3-lg',
        STYLES[style],
        !flush && 'p-s-card',
        interactive &&
          cn(
            'cursor-pointer transition-all duration-m3-med ease-m3-spring',
            'hover:-translate-y-0.5',
            style === 'elevated' && 'hover:shadow-elev-2',
            style === 'filled' && 'hover:bg-surface-container-high',
            style === 'outlined' && 'hover:border-outline',
            style === 'glass' && 'hover:shadow-elev-2',
          ),
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
});

export interface CardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Leading visual — an emoji, icon or avatar. */
  leading?: React.ReactNode;
  /** Trailing control — a chip, menu or button. */
  trailing?: React.ReactNode;
  className?: string;
}

/** Title / subtitle row with optional leading avatar and trailing action. */
export function CardHeader({ title, subtitle, leading, trailing, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {leading}
      <div className="min-w-0 flex-1">
        <h3 className="s-display truncate text-[16.5px] font-bold leading-tight">{title}</h3>
        {subtitle && (
          <p className="truncate text-[12.5px] font-bold text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      {trailing}
    </div>
  );
}

export interface TileProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Fixed square icon/emoji holder used on cards and list rows. */
  tone?: 'primary' | 'secondary' | 'tertiary' | 'gold' | 'success' | 'error' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
}

const TILE_TONES: Record<NonNullable<TileProps['tone']>, string> = {
  primary: 'bg-primary-container text-on-primary-container',
  secondary: 'bg-secondary-container text-on-secondary-container',
  tertiary: 'bg-tertiary-container text-on-tertiary-container',
  gold: 'bg-gold-container text-on-gold-container',
  success: 'bg-success-container text-on-success-container',
  error: 'bg-error-container text-on-error-container',
  neutral: 'bg-surface-container-high text-on-surface-variant',
};

/** Rounded square that holds a subject emoji or icon. */
export function Tile({ tone = 'primary', size = 'md', className, children, ...rest }: TileProps) {
  return (
    <div
      className={cn(
        'grid shrink-0 place-items-center rounded-m3-sm',
        size === 'sm' && 'h-9 w-9 text-[15px]',
        size === 'md' && 'h-11 w-11 text-[18px]',
        size === 'lg' && 'h-14 w-14 text-[22px]',
        TILE_TONES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

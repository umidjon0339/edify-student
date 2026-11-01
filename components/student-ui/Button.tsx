'use client';

import { forwardRef } from 'react';
import { cn } from './cn';
import { DESIGN } from './config';
import { useRipple } from './useRipple';

type Tone = 'primary' | 'secondary' | 'tertiary' | 'error' | 'success' | 'gold';
type Variant = 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated';
type Size = 'sm' | 'md' | 'lg';

/** Background + text for each tone, per variant. Pure token utilities. */
const TONE_FILLED: Record<Tone, string> = {
  primary: 'bg-primary text-on-primary',
  secondary: 'bg-secondary text-on-secondary',
  tertiary: 'bg-tertiary text-on-tertiary',
  error: 'bg-error text-on-error',
  success: 'bg-success text-on-success',
  gold: 'bg-gold text-on-gold',
};
const TONE_TONAL: Record<Tone, string> = {
  primary: 'bg-primary-container text-on-primary-container',
  secondary: 'bg-secondary-container text-on-secondary-container',
  tertiary: 'bg-tertiary-container text-on-tertiary-container',
  error: 'bg-error-container text-on-error-container',
  success: 'bg-success-container text-on-success-container',
  gold: 'bg-gold-container text-on-gold-container',
};
const TONE_TEXT: Record<Tone, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  tertiary: 'text-tertiary',
  error: 'text-error',
  success: 'text-success',
  gold: 'text-gold',
};

/** The 3D edge color for Button_style="game", as a CSS custom property. */
const TONE_EDGE: Record<Tone, string> = {
  primary: 'color-mix(in srgb, var(--m3-primary) 60%, black)',
  secondary: 'color-mix(in srgb, var(--m3-secondary) 60%, black)',
  tertiary: 'color-mix(in srgb, var(--m3-tertiary) 60%, black)',
  error: 'color-mix(in srgb, var(--m3-error) 60%, black)',
  success: 'color-mix(in srgb, var(--m3-success) 60%, black)',
  gold: 'color-mix(in srgb, var(--m3-gold) 60%, black)',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-[14.5px] gap-2',
  lg: 'h-[52px] px-7 text-[16px] gap-2.5',
};

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: Variant;
  tone?: Tone;
  size?: Size;
  /** Overrides design.config.ts › Button_style for this one button. */
  press?: DesignButtonStyle;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

type DesignButtonStyle = typeof DESIGN.Button_style;

/**
 * The app's primary button.
 *
 * `variant` picks the fill (filled/tonal/outlined/text/elevated) and `tone`
 * picks the color role. The press personality — 3D game edge, pill ripple,
 * squircle morph — comes from design.config.ts › Button_style unless
 * overridden per button with `press`.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'filled',
    tone = 'primary',
    size = 'md',
    press,
    icon,
    trailingIcon,
    loading = false,
    fullWidth = false,
    className,
    children,
    disabled,
    onPointerDown,
    ...rest
  },
  ref,
) {
  const ripple = useRipple();
  const style = press ?? DESIGN.Button_style;
  const isSolid = variant === 'filled';
  // The game edge only makes sense under a solid fill.
  const useGameEdge = style === 'game' && isSolid;

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      onPointerDown={(e) => {
        if (!useGameEdge) ripple(e);
        onPointerDown?.(e);
      }}
      className={cn(
        'relative inline-flex select-none items-center justify-center overflow-hidden',
        'font-extrabold leading-none tracking-tight',
        's-ripple-host',
        SIZES[size],
        fullWidth && 'w-full',

        // Shape + press physics
        style === 'squircle'
          ? 's-btn-squircle'
          : style === 'game'
            ? 'rounded-m3-md'
            : 'rounded-m3-btn',
        useGameEdge ? 's-btn-game' : 's-press',

        // Fill
        variant === 'filled' && TONE_FILLED[tone],
        variant === 'tonal' && TONE_TONAL[tone],
        variant === 'elevated' &&
          cn('bg-surface-container-low shadow-elev-1 hover:shadow-elev-2', TONE_TEXT[tone]),
        variant === 'outlined' && cn('border-[1.5px] border-outline bg-transparent', TONE_TEXT[tone]),
        variant === 'text' && cn('bg-transparent px-3', TONE_TEXT[tone]),

        // Hover state layer for the low-emphasis variants
        (variant === 'outlined' || variant === 'text') && 'hover:bg-state-hover',

        'disabled:pointer-events-none disabled:bg-disabled-bg disabled:text-disabled-fg',
        'disabled:shadow-none disabled:border-transparent',
        className,
      )}
      style={useGameEdge ? ({ '--s-btn-edge-color': TONE_EDGE[tone] } as React.CSSProperties) : undefined}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden
          className="s-spin h-4 w-4 rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        icon
      )}
      {children}
      {!loading && trailingIcon}
    </button>
  );
});

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — an icon alone gives screen readers nothing to announce. */
  'aria-label': string;
  variant?: 'standard' | 'tonal' | 'filled' | 'outlined';
  tone?: Tone;
  size?: Size;
  /** Renders the selected (tonal) state, e.g. a bookmarked item. */
  selected?: boolean;
}

/** Circular icon-only button. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { variant = 'standard', tone = 'primary', size = 'md', selected, className, children, onPointerDown, ...rest },
    ref,
  ) {
    const ripple = useRipple();
    const dims = size === 'sm' ? 'h-9 w-9' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
    const active = selected ? 'tonal' : variant;

    return (
      <button
        ref={ref}
        onPointerDown={(e) => {
          ripple(e);
          onPointerDown?.(e);
        }}
        className={cn(
          'relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full',
          's-ripple-host s-press',
          dims,
          active === 'standard' && 'text-on-surface-variant hover:bg-state-hover',
          active === 'tonal' && TONE_TONAL[tone],
          active === 'filled' && TONE_FILLED[tone],
          active === 'outlined' &&
            cn('border-[1.5px] border-outline hover:bg-state-hover', TONE_TEXT[tone]),
          'disabled:pointer-events-none disabled:text-disabled-fg',
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

export interface FabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  /** Present = extended FAB with a text label beside the icon. */
  label?: string;
  tone?: Tone;
  size?: 'md' | 'lg';
}

/** Floating action button — the single main action of a screen. */
export const Fab = forwardRef<HTMLButtonElement, FabProps>(function Fab(
  { icon, label, tone = 'primary', size = 'md', className, onPointerDown, ...rest },
  ref,
) {
  const ripple = useRipple();
  return (
    <button
      ref={ref}
      onPointerDown={(e) => {
        ripple(e);
        onPointerDown?.(e);
      }}
      className={cn(
        'relative inline-flex items-center justify-center gap-2.5 overflow-hidden',
        'rounded-m3-fab font-extrabold shadow-elev-2 hover:shadow-elev-3',
        's-ripple-host s-press',
        TONE_TONAL[tone],
        label
          ? size === 'lg'
            ? 'h-16 px-7 text-[16px]'
            : 'h-14 px-6 text-[15px]'
          : size === 'lg'
            ? 'h-16 w-16'
            : 'h-14 w-14',
        className,
      )}
      {...rest}
    >
      {icon}
      {label}
    </button>
  );
});

export interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group, e.g. "Leaderboard period". */
  label: string;
  className?: string;
}

/** Segmented control — mutually exclusive filters (week/month/all time). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        // Edify style (2026-11-01): glass pill capsule, accent chip on the pick.
        's-glass inline-flex gap-0.5 rounded-full p-1',
        className,
      )}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-full px-4 py-2 text-[13.5px] font-extrabold',
              'transition-colors duration-m3-fast ease-m3-std',
              on
                ? 's-chip'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

'use client';

import { forwardRef, useId } from 'react';
import { cn } from './cn';
import { DESIGN } from './config';

type FieldStyle = typeof DESIGN.Input_style;

export interface TextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  /** Helper text below the field. Replaced by `error` when that is set. */
  hint?: string;
  /** Error message. Its presence also marks the field invalid. */
  error?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  variant?: FieldStyle;
  containerClassName?: string;
}

/**
 * M3 text field with a floating label.
 *
 * The label animates up on focus or when filled, which needs the input to have
 * `placeholder=" "` — that is set here, so callers never deal with it.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, leading, trailing, variant, className, containerClassName, id, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = error || hint ? `${fieldId}-desc` : undefined;
  const style = variant ?? DESIGN.Input_style;
  const glass = style === 'glass';
  // Glass floats its label exactly like filled — only the surface differs.
  const filled = style === 'filled' || glass;

  return (
    <div className={cn('w-full', containerClassName)}>
      <div className="relative">
        {leading && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
            {leading}
          </span>
        )}

        <input
          ref={ref}
          id={fieldId}
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'peer w-full font-bold text-on-surface outline-none',
            'transition-colors duration-m3-fast ease-m3-std',
            leading ? 'pl-12' : 'pl-4',
            trailing ? 'pr-12' : 'pr-4',
            glass
              ? 's-field rounded-m3-md pb-2 pt-6'
              : filled
              ? cn(
                  'rounded-t-m3-sm bg-surface-container-low pb-2 pt-6',
                  'border-b-2 border-outline focus:border-primary',
                )
              : cn(
                  'rounded-m3-sm border-[1.5px] border-outline bg-transparent py-4',
                  'focus:border-2 focus:border-primary',
                ),
            error && 'border-error focus:border-error',
            'disabled:text-disabled-fg',
            className,
          )}
          {...rest}
        />

        <label
          htmlFor={fieldId}
          className={cn(
            'pointer-events-none absolute font-bold text-on-surface-variant',
            'transition-all duration-m3-fast ease-m3-std',
            leading ? 'left-12' : 'left-4',
            // Resting position (empty + unfocused)
            filled ? 'top-4 text-[15px]' : 'top-1/2 -translate-y-1/2 text-[15px]',
            // Floated position
            filled
              ? 'peer-focus:top-1.5 peer-focus:text-[11px] peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[11px]'
              : cn(
                  'peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px]',
                  'peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px]',
                  // The notch: label sits on the border, so it needs the page bg behind it
                  'peer-focus:bg-surface peer-focus:px-1.5 peer-[:not(:placeholder-shown)]:bg-surface peer-[:not(:placeholder-shown)]:px-1.5',
                ),
            'peer-focus:font-black peer-focus:text-primary',
            error && 'peer-focus:text-error',
          )}
        >
          {label}
        </label>

        {trailing && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            {trailing}
          </span>
        )}
      </div>

      {(error || hint) && (
        <p
          id={describedBy}
          className={cn(
            'mt-1.5 px-4 text-[12px] font-bold',
            error ? 'text-error' : 'text-on-surface-variant',
          )}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
});

export interface SearchBarProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Accessible name; also the visible placeholder. */
  label: string;
  onClear?: () => void;
}

/** Rounded search input with a leading icon and optional clear button. */
export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { label, onClear, className, value, ...rest },
  ref,
) {
  return (
    <div
      className={cn(
        'flex w-full items-center gap-3 rounded-full bg-surface-container px-5 py-3',
        'focus-within:ring-2 focus-within:ring-primary',
        className,
      )}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0 text-on-surface-variant" fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="11" cy="11" r="7" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" />
      </svg>
      <input
        ref={ref}
        type="search"
        aria-label={label}
        placeholder={label}
        value={value}
        className="w-full min-w-0 border-none bg-transparent font-bold text-on-surface outline-none placeholder:text-on-surface-variant [&::-webkit-search-cancel-button]:hidden"
        {...rest}
      />
      {onClear && value ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="shrink-0 rounded-full p-1 text-on-surface-variant hover:bg-state-hover"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      ) : null}
    </div>
  );
});

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

/** Multi-line field, same visual language as TextField. */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, className, id, rows = 4, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const glass = DESIGN.Input_style === 'glass';
  const filled = DESIGN.Input_style === 'filled';

  return (
    <div className="w-full">
      <label htmlFor={fieldId} className="mb-1.5 block px-1 text-[12.5px] font-black text-on-surface-variant">
        {label}
      </label>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={cn(
          'w-full resize-y rounded-m3-sm px-4 py-3 font-bold text-on-surface outline-none',
          'transition-colors duration-m3-fast ease-m3-std',
          glass
            ? 's-field rounded-m3-md'
            : filled
            ? 'border-b-2 border-outline bg-surface-container-low focus:border-primary'
            : 'border-[1.5px] border-outline bg-transparent focus:border-2 focus:border-primary',
          error && 'border-error',
          className,
        )}
        {...rest}
      />
      {(error || hint) && (
        <p className={cn('mt-1.5 px-1 text-[12px] font-bold', error ? 'text-error' : 'text-on-surface-variant')}>
          {error || hint}
        </p>
      )}
    </div>
  );
});

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: readonly { value: string; label: string }[];
}

/** Native select styled to match the field family. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <div className="w-full">
      <label htmlFor={fieldId} className="mb-1.5 block px-1 text-[12.5px] font-black text-on-surface-variant">
        {label}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          className={cn(
            'w-full appearance-none py-3 pl-4 pr-10 font-bold text-on-surface outline-none',
            DESIGN.Input_style === 'glass'
              ? 's-field rounded-m3-md'
              : 'rounded-m3-sm border-[1.5px] border-outline bg-surface-container-low focus:border-2 focus:border-primary',
            className,
          )}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" fill="none" stroke="currentColor" strokeWidth="2.6">
          <polyline points="5 9 12 16 19 9" />
        </svg>
      </div>
    </div>
  );
});

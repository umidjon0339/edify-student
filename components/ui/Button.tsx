import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";
import { MOTION_ON, TEACHER_DESIGN, type TeacherDesignConfig } from "./config";

export type ButtonVariant =
  | "filled" // the ONE main action of a screen
  | "tonal" // secondary actions
  | "elevated"
  | "outlined"
  | "text"
  | "danger" // destructive main action
  | "danger-text";

export type ButtonSize = "sm" | "md" | "lg";

/* ── Button_style switch (design.teacher.config.ts) ─────────────────────────
   Shapes the FILLED variant's personality; every other variant only follows
   the shared radius (pill → rounded-full, otherwise rounded-m3-btn — note the
   CSS already resolves --m3-shape-button to 999px when the switch is 'pill',
   we still emit consistent classes). */
type ButtonStyleName = TeacherDesignConfig["Button_style"];

const BUTTON_STYLE: ButtonStyleName = TEACHER_DESIGN.Button_style;

const RADIUS = BUTTON_STYLE === "pill" ? "rounded-full" : "rounded-m3-btn";

const FILLED_BY_STYLE: Record<ButtonStyleName, string> = {
  // Filled = the mode-independent accent: the same blue in light and dark.
  pill: "bg-t-accent text-t-on-accent hover:shadow-elev-1",
  shaped: "bg-t-accent text-t-on-accent hover:shadow-elev-1",
  gradient: "t-icon-chip hover:shadow-elev-1",
  glow: "bg-t-accent text-t-on-accent shadow-t-glow",
};

const VARIANT: Record<ButtonVariant, string> = {
  filled: FILLED_BY_STYLE[BUTTON_STYLE],
  tonal: "bg-t-accent-soft text-t-accent-text",
  elevated: "bg-surface-container-low text-primary shadow-elev-1 hover:shadow-elev-2",
  outlined: "text-primary ring-1 ring-inset ring-outline",
  text: "text-primary",
  danger: "bg-error text-on-error",
  "danger-text": "text-error",
};

/* Density-aware heights (h-t-control* map to CSS vars driven by the Density
   switch); paddings stay proportionate. */
const SIZE: Record<ButtonSize, string> = {
  sm: "h-t-control-sm gap-1.5 px-4 text-xs [&_svg]:h-4 [&_svg]:w-4",
  md: "h-t-control gap-2 px-6 text-sm [&_svg]:h-[18px] [&_svg]:w-[18px]",
  lg: "h-t-control-lg gap-2 px-7 text-[15px] [&_svg]:h-5 [&_svg]:w-5",
};

/* text-style buttons get tighter padding */
const TEXT_PAD: Record<ButtonSize, string> = { sm: "px-2.5", md: "px-3.5", lg: "px-4" };

/* Premium press feel — CSS only. theme.css zeroes duration-t-* when
   Motion_level='none' / reduced-motion, but we also skip the scale entirely
   when motion is off. */
const PRESS = MOTION_ON
  ? "transition-[transform,box-shadow] duration-t-fast ease-t-spring active:scale-[0.97]"
  : "transition-shadow";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon, e.g. <Plus /> (lucide) — sized automatically. */
  icon?: ReactNode;
  /** Shows a spinner in place of the icon and disables the button. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "filled", size = "md", icon, loading = false, className, children, disabled, type, ...rest },
  ref,
) {
  const isTextLike = variant === "text" || variant === "danger-text" || variant === "outlined";
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={isDisabled}
      className={cn(
        "m3-interactive inline-flex flex-none select-none items-center justify-center whitespace-nowrap font-semibold tracking-[0.1px]",
        RADIUS,
        PRESS,
        /* skip the filled personality when disabled — .t-gradient paints a
           background-image that bg-disabled-bg alone would not cover */
        variant === "filled" && isDisabled ? "" : VARIANT[variant],
        SIZE[size],
        (variant === "text" || variant === "danger-text") && TEXT_PAD[size],
        isDisabled &&
          (isTextLike
            ? "text-disabled-fg ring-outline-variant"
            : "bg-disabled-bg text-disabled-fg shadow-none hover:shadow-none"),
        isDisabled && "cursor-not-allowed",
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" /> : icon}
      {children}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "standard" | "tonal" | "filled";
  size?: "sm" | "md";
  /** Required — icon-only buttons must announce what they do. */
  "aria-label": string;
}

const ICON_VARIANT: Record<NonNullable<IconButtonProps["variant"]>, string> = {
  standard: "text-on-surface-variant",
  tonal: "bg-t-accent-soft text-t-accent-text",
  filled: "bg-primary text-on-primary",
};

const ICON_SIZE: Record<NonNullable<IconButtonProps["size"]>, string> = {
  sm: "h-t-control-sm w-t-control-sm [&_svg]:h-4 [&_svg]:w-4",
  md: "h-t-control w-t-control [&_svg]:h-5 [&_svg]:w-5",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = "standard", size = "md", className, children, disabled, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={disabled}
      className={cn(
        "m3-interactive inline-grid flex-none select-none place-items-center",
        RADIUS,
        PRESS,
        ICON_VARIANT[variant],
        ICON_SIZE[size],
        disabled && "cursor-not-allowed text-disabled-fg",
        disabled && variant !== "standard" && "bg-disabled-bg",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

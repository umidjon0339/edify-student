'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from './cn';
import { DESIGN, MOTION_ON, springTransition } from './config';
import { resolveSideStyle, type SideStyle } from './shellStyles';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  /** Hidden from the phone dock (desktop/drawer only). */
  hideOnMobile?: boolean;
  /** pillbar only: the dropdown group this item lives in (key of `groups`).
   *  Ungrouped items are direct links in the capsule. */
  group?: string;
  /** pillbar only: not shown in the capsule (e.g. Profile — it has its own pill). */
  hideInPillbar?: boolean;
  /** pillbar only: a FEATURED link at the end of the capsule — round accent
   *  icon chip + label, the student twin of the teacher's "Yangi Test" pill.
   *  Ignores `group`. Other shells render it as a normal item. */
  pillCta?: boolean;
}

export interface NavGroup {
  key: string;
  label: string;
  /** Small accent dot before the label (the exams group). */
  dot?: boolean;
}

export interface ShellProps {
  items: readonly NavItem[];
  /** Returns true when a nav item is the current page. */
  isActive: (href: string) => boolean;
  /** Brand mark shown at the top of the rail/drawer. */
  brand: React.ReactNode;
  /** Top bar content (streak, notifications, profile menu). */
  topbar: React.ReactNode;
  children: React.ReactNode;
  /** Opens the mobile drawer — only used by Mobile_navigation="drawer". */
  onOpenMobileNav?: () => void;
  /** pillbar only: dropdown groups for the capsule (items reference them by key). */
  groups?: readonly NavGroup[];
}

/**
 * The app frame.
 *
 * Renders whichever navigation design.config.ts › App_shell_navigation and
 * › Mobile_navigation select. All desktop shells and all mobile navigations
 * share this one component so pages never care which is active.
 *
 * Desktop: `rail` (icon rail), `topbar` (top tabs) and `pillbar` (Edify
 * style — floating glass pills, no band) keep bespoke markup; every other
 * variant is the same RecipeDrawer styled purely by its shellStyles.ts recipe
 * — `floating` puts that drawer inside a detached card.
 */
export function Shell({ items, isActive, brand, topbar, children, onOpenMobileNav, groups }: ShellProps) {
  const desktop = DESIGN.App_shell_navigation;
  const mobile = DESIGN.Mobile_navigation;
  const pill = desktop === 'pillbar';
  const isSide = desktop !== 'rail' && desktop !== 'topbar' && !pill;
  const isBar = mobile !== 'drawer';
  const sideStyle = resolveSideStyle(desktop);

  return (
    <div
      className="s-canvas flex min-h-[100dvh] bg-background text-on-surface"
      // The pillbar header is 68px; pages' sticky bars offset by --s-topbar-h.
      style={pill ? ({ '--s-topbar-h': '68px' } as React.CSSProperties) : undefined}
    >
      {desktop === 'rail' && <IconRail items={items} isActive={isActive} brand={brand} />}
      {isSide && (
        <RecipeDrawer
          items={items}
          isActive={isActive}
          brand={brand}
          style={sideStyle}
          floating={desktop === 'floating'}
        />
      )}

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col',
          desktop === 'rail' && 'md:pl-[var(--s-rail-w)]',
          isSide && desktop !== 'floating' && 'md:pl-[var(--s-drawer-w)]',
          // The floating card sits 12px in from the edge, so clear that too.
          desktop === 'floating' && 'md:pl-[calc(var(--s-drawer-w)+20px)]',
        )}
      >
        {pill ? (
          /* Edify style: only the pills are pinned — the page (and its canvas)
             scrolls behind them; no band, no border. */
          <header className="sticky top-0 z-40 grid h-[68px] shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-3 sm:px-4">
            {/* Equal 1fr side columns put the capsule on the page's centre line,
                however wide the brand and the right-hand pills are. */}
            <div className="s-glass flex h-11 items-center justify-self-start rounded-full px-4">{brand}</div>
            <PillTabs items={items} isActive={isActive} groups={groups} />
            {/* col-start-3: on phones the capsule is display:none and would
                otherwise let these slide into the middle column. */}
            <div className="col-start-3 justify-self-end">{topbar}</div>
          </header>
        ) : (
        <header
          className={cn(
            'sticky top-0 z-40 flex h-[var(--s-topbar-h)] shrink-0 items-center justify-between gap-3',
            'border-b border-outline-variant bg-surface-blur px-3 backdrop-blur-xl sm:px-4',
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            {mobile === 'drawer' && (
              <button
                type="button"
                onClick={onOpenMobileNav}
                aria-label="Open menu"
                className="grid h-10 w-10 place-items-center rounded-full text-on-surface-variant s-press hover:bg-state-hover md:hidden"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              </button>
            )}
            {/* Side shells and the rail already show the brand in their panel. */}
            <div className={cn(desktop !== 'topbar' && 'md:hidden')}>{brand}</div>
          </div>
          {topbar}
        </header>
        )}

        {desktop === 'topbar' && <TopTabs items={items} isActive={isActive} />}

        <main
          className={cn(
            'relative flex-1',
            // Clears the phone bar so content is never trapped underneath it.
            isBar && 'pb-[calc(var(--s-dock-h)+var(--s-safe-b)+16px)] md:pb-8',
            mobile === 'floating' && 'pb-[calc(var(--s-dock-h)+var(--s-safe-b)+28px)] md:pb-8',
            // The iconic bar is ~8px shorter than the dock.
            mobile === 'iconic' && 'pb-[calc(var(--s-dock-h)+var(--s-safe-b)+4px)] md:pb-8',
          )}
        >
          {children}
        </main>
      </div>

      {isBar && <MobileDock items={items} isActive={isActive} variant={mobile} />}
    </div>
  );
}

/* ── rail · icon rail ────────────────────────────────────────────────────── */

function IconRail({ items, isActive, brand }: Pick<ShellProps, 'items' | 'isActive' | 'brand'>) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-y-0 left-0 z-40 hidden w-[var(--s-rail-w)] flex-col items-center gap-1 border-r border-outline-variant bg-surface py-3.5 md:flex"
    >
      <div className="mb-2.5">{brand}</div>
      {items.map((item) => {
        const on = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? 'page' : undefined}
            className={cn(
              'group relative grid h-11 w-[52px] place-items-center rounded-m3-sm',
              'transition-colors duration-m3-fast ease-m3-std',
              on
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant hover:bg-state-hover hover:text-on-surface',
            )}
          >
            <item.icon size={21} strokeWidth={on ? 2.6 : 2.2} />
            <span
              role="tooltip"
              className={cn(
                'pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap',
                'rounded-m3-xs bg-inverse-surface px-2.5 py-1.5 text-[12.5px] font-bold text-inverse-on-surface',
                'opacity-0 transition-opacity duration-m3-fast ease-m3-std group-hover:opacity-100',
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ── Recipe drawer · sidebar/classic/tonal/inverse/gradient/minimal/floating ─
 *
 * One labelled drawer whose entire look comes from its SIDE_STYLES recipe.
 * The active indicator is a framer-motion layoutId element, so it glides
 * between rows. Positions use fixed offsets, never translate-based centering —
 * framer's layout animation owns `transform`. */

function SideIndicator({ style }: { style: SideStyle }) {
  const transition = MOTION_ON ? springTransition : { duration: 0 };
  if (style.indicator === 'pill') {
    return (
      <motion.span
        layoutId="s-side-ind"
        transition={transition}
        className={cn('absolute inset-0', style.itemShape, style.indicatorCls)}
      />
    );
  }
  if (style.indicator === 'bar') {
    return (
      <motion.span
        layoutId="s-side-ind"
        transition={transition}
        className={cn('absolute left-0 top-[13px] h-5 w-1 rounded-r-full', style.indicatorCls)}
      />
    );
  }
  // dot
  return (
    <motion.span
      layoutId="s-side-ind"
      transition={transition}
      className={cn('absolute left-1.5 top-[19px] h-1.5 w-1.5 rounded-full', style.indicatorCls)}
    />
  );
}

function RecipeDrawer({
  items,
  isActive,
  brand,
  style,
  floating,
}: Pick<ShellProps, 'items' | 'isActive' | 'brand'> & { style: SideStyle; floating: boolean }) {
  return (
    <nav
      aria-label="Main"
      className={cn(
        'z-40 hidden flex-col md:flex',
        floating
          ? cn(
              // Detached glass card with breathing room on every side.
              'fixed bottom-3 left-3 top-3 w-[var(--s-drawer-w)] overflow-hidden',
              'rounded-m3-lg border border-outline-variant bg-surface-glass shadow-elev-2 backdrop-blur-xl',
            )
          : cn('fixed inset-y-0 left-0 w-[var(--s-drawer-w)]', style.panel),
      )}
    >
      <div className={cn('flex h-[var(--s-topbar-h)] shrink-0 items-center gap-2.5 px-4', style.headerBorder)}>
        {style.brandWrap ? <div className={cn('min-w-0', style.brandWrap)}>{brand}</div> : brand}
      </div>
      <div className="s-scroll flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {items.map((item) => {
          const on = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'relative flex items-center gap-3.5 px-4 py-3 text-[14.5px] font-extrabold',
                'transition-colors duration-m3-fast ease-m3-std',
                style.itemShape,
                // Edge indicators need extra room so they never kiss the icon.
                (style.indicator === 'bar' || style.indicator === 'dot') && 'pl-5',
                on ? cn(style.active, style.activeRowBg) : style.idle,
              )}
            >
              {on && <SideIndicator style={style} />}
              <item.icon
                size={21}
                strokeWidth={on ? 2.6 : 2.2}
                className={cn('relative z-10 shrink-0', on && style.iconActive)}
              />
              <span className="relative z-10 truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ── topbar · top tabs ───────────────────────────────────────────────────── */

/* ── pillbar · Edify-style glass capsule ────────────────────────────────────
   Ungrouped items are direct links; grouped ones sit in hover dropdowns
   (Asosiy · Imtihonlar · Resurslar …), like the teacher panel's top bar. The
   trigger of the group holding the current page wears the gliding accent
   pill. Hover opens (with a short close delay so the pointer can reach the
   panel), click toggles for touch/keyboard, Escape or an outside tap closes.

   ⚠️ Dropdown fixes (2026-11-01) — keep all three:
   1. A MOUSE click only opens. Hover has already opened the menu, so a
      toggling click shut it again ("click does nothing"). Touch / keyboard
      clicks (no hover) still toggle — `lastPointer` tells them apart.
   2. The closed panel wrapper is `pointer-events-none`. A menu fading out
      still sat under the pointer, re-fired the group's mouseenter and opened
      again — the flicker.
   3. Menus use a short tween, not the page spring, so they don't linger. */

function PillTabs({ items, isActive, groups }: Pick<ShellProps, 'items' | 'isActive' | 'groups'>) {
  const transition = MOTION_ON ? springTransition : { duration: 0 };
  const menuTransition = MOTION_ON ? { duration: 0.14, ease: [0.2, 0, 0, 1] as const } : { duration: 0 };
  const [open, setOpen] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPointer = useRef('');
  const navRef = useRef<HTMLElement>(null);
  const openNow = (k: string) => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpen(k); };
  const clickGroup = (k: string) => {
    if (lastPointer.current === 'mouse') openNow(k);
    else setOpen((cur) => (cur === k ? null : k));
    lastPointer.current = '';
  };

  // An outside tap closes (touch has no mouseleave to do it).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  const closeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(null), 160);
  };

  const visible = items.filter((i) => !i.hideInPillbar);
  const known = new Set((groups ?? []).map((g) => g.key));
  const ctas = visible.filter((i) => i.pillCta);
  const direct = visible.filter((i) => !i.pillCta && (!i.group || !known.has(i.group)));
  const grouped = (groups ?? [])
    .map((g) => ({ ...g, items: visible.filter((i) => !i.pillCta && i.group === g.key) }))
    .filter((g) => g.items.length > 0);

  const pillLink = (item: NavItem) => {
    const on = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={on ? 'page' : undefined}
        className={cn(
          'relative flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[13.5px] font-extrabold transition-colors',
          on ? 's-on-chip' : 'text-on-surface-variant hover:text-on-surface',
        )}
      >
        {on && <motion.span layoutId="s-pb-active" transition={transition} className="s-chip absolute inset-0 rounded-full" />}
        <span className="relative">{item.label}</span>
      </Link>
    );
  };

  // The featured link: accent icon chip + label (teacher "Yangi Test" recipe).
  // On its own page the gliding chip slides under it and the icon chip turns
  // into a translucent disc so it doesn't vanish into the accent.
  const ctaLink = (item: NavItem) => {
    const on = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={on ? 'page' : undefined}
        className={cn(
          'group relative flex h-10 shrink-0 items-center gap-2 rounded-full pl-1.5 pr-4 text-[13.5px] font-extrabold transition-colors',
          on ? 's-on-chip' : 'text-on-surface-variant hover:text-on-surface',
        )}
      >
        {on && <motion.span layoutId="s-pb-active" transition={transition} className="s-chip absolute inset-0 rounded-full" />}
        <span
          className={cn(
            'relative grid h-7 w-7 place-items-center rounded-full transition-transform duration-300 group-hover:scale-110',
            on ? 'bg-[color-mix(in_oklab,currentColor_18%,transparent)]' : 's-chip',
          )}
        >
          <Icon size={15} strokeWidth={2.6} />
        </span>
        <span className="relative">{item.label}</span>
      </Link>
    );
  };

  return (
    <nav
      ref={navRef}
      aria-label="Main"
      onPointerDownCapture={(e) => { lastPointer.current = e.pointerType; }}
      onKeyDown={(e) => { if (e.key === 'Escape') setOpen(null); }}
      className="s-glass hidden min-w-0 items-center gap-0.5 justify-self-center rounded-full p-1.5 md:flex"
    >
      {direct.map(pillLink)}
      {grouped.map((g) => {
        const on = g.items.some((i) => isActive(i.href));
        const isOpen = open === g.key;
        return (
          <div key={g.key} className="relative" onMouseEnter={() => openNow(g.key)} onMouseLeave={closeSoon}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-haspopup="menu"
              onClick={() => clickGroup(g.key)}
              className={cn(
                'relative flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-extrabold transition-colors',
                on ? 's-on-chip' : isOpen ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {on && <motion.span layoutId="s-pb-active" transition={transition} className="s-chip absolute inset-0 rounded-full" />}
              {g.dot && <span aria-hidden className={cn('relative h-1.5 w-1.5 rounded-full', on ? 'bg-current' : 'bg-tertiary')} />}
              <span className="relative">{g.label}</span>
              <ChevronDown size={14} strokeWidth={2.6} className={cn('relative transition-transform duration-200', isOpen && 'rotate-180')} />
            </button>
            {/* pt-3 bridges the gap so moving down never closes the panel. */}
            <div className={cn('absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3', !isOpen && 'pointer-events-none')}>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    role="menu"
                    initial={MOTION_ON ? { opacity: 0, y: 6, scale: 0.97 } : false}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={menuTransition}
                    className={cn(
                      's-menu origin-top rounded-m3-lg p-2',
                      g.items.length > 3 ? 'grid w-[440px] grid-cols-2 gap-0.5' : 'flex w-[260px] flex-col gap-0.5',
                    )}
                  >
                    {g.items.map((item) => {
                      const here = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          onClick={() => setOpen(null)}
                          className={cn(
                            'flex items-center gap-3 rounded-m3-md px-2.5 py-2 text-[13.5px] font-extrabold transition-colors',
                            here ? 'bg-primary-container text-on-primary-container' : 'text-on-surface hover:bg-state-hover',
                          )}
                        >
                          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-m3-sm', here ? 's-chip' : 'bg-surface-container-high text-primary')}>
                            <item.icon size={17} strokeWidth={2.4} />
                          </span>
                          <span className="min-w-0 truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
      {ctas.map(ctaLink)}
    </nav>
  );
}

function TopTabs({ items, isActive }: Pick<ShellProps, 'items' | 'isActive'>) {
  return (
    <nav
      aria-label="Main"
      className="s-no-scrollbar sticky top-[var(--s-topbar-h)] z-30 hidden gap-1 overflow-x-auto border-b border-outline-variant bg-surface px-3 md:flex"
    >
      {items.map((item) => {
        const on = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-[14px] font-extrabold',
              'transition-colors duration-m3-fast ease-m3-std',
              on
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface',
            )}
          >
            <item.icon size={18} strokeWidth={on ? 2.6 : 2.2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/* ── Mobile bars · dock / floating / iconic / topline ────────────────────── */

type MobileBarVariant = 'dock' | 'floating' | 'iconic' | 'topline';

function MobileDock({
  items,
  isActive,
  variant,
}: Pick<ShellProps, 'items' | 'isActive'> & { variant: MobileBarVariant }) {
  // M3 caps a bottom bar at 5 destinations — applies to every bar variant.
  const visible = items.filter((i) => !i.hideOnMobile);
  const transition = MOTION_ON ? springTransition : { duration: 0 };

  if (variant === 'iconic') {
    return (
      <nav
        aria-label="Main"
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around md:hidden',
          'border-t border-outline-variant bg-surface-blur px-2 pb-[var(--s-safe-b)] pt-1 backdrop-blur-xl',
        )}
      >
        {visible.map((item) => {
          const on = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={on ? 'page' : undefined}
              className="relative grid h-[52px] min-w-0 flex-1 place-items-center"
            >
              {on && (
                <motion.span
                  layoutId="s-dock-pill"
                  transition={transition}
                  className="absolute inset-x-0 inset-y-2 mx-auto w-[52px] rounded-full bg-primary-container"
                />
              )}
              <item.icon
                size={22}
                strokeWidth={on ? 2.7 : 2.2}
                className={cn('relative', on ? 'text-on-primary-container' : 'text-on-surface-variant')}
              />
            </Link>
          );
        })}
      </nav>
    );
  }

  if (variant === 'topline') {
    return (
      <nav
        aria-label="Main"
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around md:hidden',
          'border-t border-outline-variant bg-surface-blur px-2 pb-[var(--s-safe-b)] backdrop-blur-xl',
        )}
      >
        {visible.map((item) => {
          const on = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? 'page' : undefined}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-1 pb-1.5 pt-2.5"
            >
              {on && (
                <motion.span
                  layoutId="s-dock-pill"
                  transition={transition}
                  className="absolute inset-x-0 top-0 mx-auto h-[3px] w-9 rounded-b-full bg-primary"
                />
              )}
              <item.icon
                size={21}
                strokeWidth={on ? 2.7 : 2.2}
                className={cn('relative', on ? 'text-primary' : 'text-on-surface-variant')}
              />
              <span
                className={cn(
                  'max-w-full truncate text-[10px] font-black',
                  on ? 'text-primary' : 'text-on-surface-variant',
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  // dock + floating
  const floating = variant === 'floating';
  return (
    <nav
      aria-label="Main"
      className={cn(
        'fixed z-40 flex items-stretch justify-around md:hidden',
        floating
          ? 's-glass s-dock inset-x-4 bottom-[calc(var(--s-safe-b)+12px)] rounded-full px-2 py-1.5'
          : cn(
              'inset-x-0 bottom-0 border-t border-outline-variant bg-surface-blur px-2 backdrop-blur-xl',
              'pb-[var(--s-safe-b)] pt-1.5',
            ),
      )}
    >
      {visible.map((item) => {
        const on = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? 'page' : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1.5"
          >
            {/* max-w, not a fixed w: the pill has to be able to shrink or the
                row overflows on narrow phones and clips the outer labels. */}
            <span className="relative grid h-8 w-full max-w-[52px] place-items-center">
              {on && (
                <motion.span
                  layoutId="s-dock-pill"
                  transition={transition}
                  className={cn('absolute inset-0 rounded-full', floating ? 's-chip' : 'bg-primary-container')}
                />
              )}
              <item.icon
                size={21}
                strokeWidth={on ? 2.7 : 2.2}
                className={cn('relative', on ? (floating ? 's-on-chip' : 'text-on-primary-container') : 'text-on-surface-variant')}
              />
            </span>
            <span
              className={cn(
                'max-w-full truncate text-[10px] font-black',
                on ? 'text-primary' : 'text-on-surface-variant',
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ── Mobile slide-in drawer (Mobile_navigation="drawer") ─────────────────── */

export function MobileDrawer({
  open,
  onClose,
  items,
  isActive,
  brand,
}: {
  open: boolean;
  onClose: () => void;
  items: readonly NavItem[];
  isActive: (href: string) => boolean;
  brand: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={MOTION_ON ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-scrim-bg backdrop-blur-sm md:hidden"
          />
          <motion.nav
            aria-label="Main"
            initial={MOTION_ON ? { x: '-100%' } : false}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={springTransition}
            className="fixed inset-y-0 left-0 z-[101] flex w-72 flex-col border-r border-outline-variant bg-surface md:hidden"
          >
            <div className="flex h-[var(--s-topbar-h)] shrink-0 items-center justify-between gap-2 border-b border-outline-variant px-4">
              {brand}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="grid h-9 w-9 place-items-center rounded-full text-on-surface-variant hover:bg-state-hover"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
            <div className="s-scroll flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              {items.map((item) => {
                const on = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    aria-current={on ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3.5 rounded-m3-btn px-4 py-3 text-[14.5px] font-extrabold',
                      on
                        ? 'bg-primary-container text-on-primary-container'
                        : 'text-on-surface-variant hover:bg-state-hover',
                    )}
                  >
                    <item.icon size={21} strokeWidth={on ? 2.6 : 2.2} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}

'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTeacherLanguage, LangType } from '@/app/teacher/layout';

const TOUR_TRANSLATIONS: Record<string, any> = {
  uz: {
    finish: 'Tugatish ✓',
    next: 'Keyingi',
    prev: 'Orqaga',
    skip: "O'tkazib yuborish",
    step: 'qadam',
  },
  ru: {
    finish: 'Завершить ✓',
    next: 'Далее',
    prev: 'Назад',
    skip: 'Пропустить',
    step: 'шаг',
  },
  en: {
    finish: 'Finish ✓',
    next: 'Next',
    prev: 'Back',
    skip: 'Skip',
    step: 'step',
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface TourStep {
  /** Must match data-tour="id" on the target element */
  id: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Optional emoji shown in the tooltip header */
  emoji?: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourContextValue {
  isActive: boolean;
  currentIndex: number;
  steps: TourStep[];
  start: (steps: TourStep[]) => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT + HOOK
// ─────────────────────────────────────────────────────────────────────────────

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used inside <TourProvider>');
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const start = useCallback((newSteps: TourStep[]) => {
    setSteps(newSteps);
    setCurrentIndex(0);
    setIsActive(true);
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((i) => {
      if (i + 1 >= steps.length) {
        setIsActive(false);
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('tour-step-change', { detail: null }));
        return 0;
      }
      return i + 1;
    });
  }, [steps.length]);

  const prev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const skip = useCallback(() => {
    setIsActive(false);
    setCurrentIndex(0);
    setSteps([]);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('tour-step-change', { detail: null }));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        skip();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive, skip, next, prev]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      setIsActive(false);
      setSteps([]);
      setCurrentIndex(0);
    };
  }, []);

  return (
    <TourContext.Provider value={{ isActive, currentIndex, steps, start, next, prev, skip }}>
      {children}
      <AnimatePresence>
        {isActive && <TourOverlay key="tour-overlay" />}
      </AnimatePresence>
    </TourContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERLAY
// ─────────────────────────────────────────────────────────────────────────────

function TourOverlay() {
  const { steps, currentIndex, next, prev, skip } = useTour();
  const step = steps[currentIndex];
  const [rect, setRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (step && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tour-step-change', { detail: step.id }));
    }
  }, [step]);

  // Continuously track layout measurements across scroll and layout updates
  const updateRect = useCallback(() => {
    if (!step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.id}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      // Only trigger state updates if measurements have actually changed to avoid over-rendering
      setRect((prevRect) => {
        if (
          prevRect &&
          prevRect.top === r.top &&
          prevRect.left === r.left &&
          prevRect.width === r.width &&
          prevRect.height === r.height
        ) {
          return prevRect;
        }
        return { top: r.top, left: r.left, width: r.width, height: r.height };
      });
    }
  }, [step]);

  useEffect(() => {
    if (!step) return;

    const el = document.querySelector<HTMLElement>(`[data-tour="${step.id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    } else {
      console.warn(`Element with data-tour="${step.id}" not found`);
    }

    // Match frame-rate to dynamically pin spotlight and tooltip positions while scrolling
    let frameId: number;
    const track = () => {
      updateRect();
      frameId = requestAnimationFrame(track);
    };
    track();

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [step, updateRect]);

  if (!rect || !step || !mounted) return null;

  const PAD = 8;
  const spotlight = {
    top:    rect.top    - PAD,
    left:   rect.left   - PAD,
    width:  rect.width  + PAD * 2,
    height: rect.height + PAD * 2,
  };

  // Global uniform easing setup shared across coordinates, backdrop clip, and tooltips
  const transitionConfig = { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] };

  if (typeof window === 'undefined') return null;

  return createPortal(
    <>
    {/* Backdrop - clipPath is fully reactive within the frame thread */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: 1,
          clipPath: `polygon(
            0% 0%,
            100% 0%,
            100% 100%,
            0% 100%,
            0% 0%,
            ${spotlight.left}px ${spotlight.top}px,
            ${spotlight.left}px ${spotlight.top + spotlight.height}px,
            ${spotlight.left + spotlight.width}px ${spotlight.top + spotlight.height}px,
            ${spotlight.left + spotlight.width}px ${spotlight.top}px,
            ${spotlight.left}px ${spotlight.top}px
          )`
        }}
        exit={{ opacity: 0 }}
        transition={{ 
          opacity: { duration: 0.25 },
          clipPath: transitionConfig
        }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(0,0,0,0.52)',
          pointerEvents: 'auto',
        }}
      />

{/* Spotlight highlight outline */}
      <motion.div
        key="spotlight"
        aria-hidden="true"
        animate={{ 
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
        }}
        transition={transitionConfig}
        style={{
          position:     'fixed',
          zIndex:        100000,
          borderRadius:  14,
          border:        '2.5px solid var(--t-accent, var(--m3-primary))',
          // REMOVED: boxShadow: '0 0 0 9999px rgba(0,0,0,0.52)',
          pointerEvents: 'none',
        }}
      >
        {/* Active Breathing Ring */}
        <div style={{
          position: 'absolute', inset: -7, borderRadius: 'var(--m3-shape-xl)',
          border: '2px solid color-mix(in oklab, var(--t-accent, var(--m3-primary)) 55%, transparent)',
          animation: 'tourPulse 1.8s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        {/* Corner Brackets */}
        {[
          { top: -4, left: -4,   borderTop: '3px solid var(--t-accent, var(--m3-primary))', borderLeft: '3px solid var(--t-accent, var(--m3-primary))' },
          { top: -4, right: -4,  borderTop: '3px solid var(--t-accent, var(--m3-primary))', borderRight: '3px solid var(--t-accent, var(--m3-primary))' },
          { bottom: -4, left: -4,  borderBottom: '3px solid var(--t-accent, var(--m3-primary))', borderLeft: '3px solid var(--t-accent, var(--m3-primary))' },
          { bottom: -4, right: -4, borderBottom: '3px solid var(--t-accent, var(--m3-primary))', borderRight: '3px solid var(--t-accent, var(--m3-primary))' },
        ].map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: 13, height: 13, borderRadius: 2, ...s }} />
        ))}
      </motion.div>

      {/* Tooltip dialog interface */}
      <TooltipCard
        step={step}
        stepIndex={currentIndex}
        totalSteps={steps.length}
        targetRect={rect}
        onNext={next}
        onPrev={prev}
        onSkip={skip}
        transitionConfig={transitionConfig}
      />

      <style>{`
        @keyframes tourPulse {
          0%,100% { opacity:0; transform:scale(1); }
          50%      { opacity:0.6; transform:scale(1.04); }
        }
      `}</style>
    </>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOLTIP CARD
// ─────────────────────────────────────────────────────────────────────────────

const TOOLTIP_W = 284;
const TOOLTIP_H_EST = 200;

interface TooltipProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: Rect;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  transitionConfig: any;
}

function TooltipCard({ 
  step, 
  stepIndex, 
  totalSteps, 
  targetRect, 
  onNext, 
  onPrev, 
  onSkip, 
  transitionConfig 
}: TooltipProps) { 
  const { lang } = useTeacherLanguage() as { lang: LangType };
  const t = TOUR_TRANSLATIONS[lang] || TOUR_TRANSLATIONS['uz'];

  const placement = step.placement ?? 'bottom';
  const PAD = 16;
  const GAP = 10;

  const vpW = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vpH = typeof window !== 'undefined' ? window.innerHeight : 800;
let top = 0, left = 0;
  const sTop    = targetRect.top    - GAP;
  const sLeft   = targetRect.left   - GAP;
  const sRight  = targetRect.left   + targetRect.width  + GAP;
  const sBottom = targetRect.top    + targetRect.height + GAP;
  const sCX = targetRect.left + targetRect.width  / 2;
  const sCY = targetRect.top  + targetRect.height / 2;

  // ── Smart Placement Fallbacks ──
  let actualPlacement = placement;

  // If requested right but not enough space, try bottom or top
  if (actualPlacement === 'right' && sRight + TOOLTIP_W + PAD > vpW) {
    actualPlacement = (vpH - sBottom > sTop) ? 'bottom' : 'top';
  }
  // If requested left but not enough space, try bottom or top
  if (actualPlacement === 'left' && sLeft - TOOLTIP_W - PAD < 0) {
    actualPlacement = (vpH - sBottom > sTop) ? 'bottom' : 'top';
  }
  // If requested bottom but not enough vertical space, try top
  if (actualPlacement === 'bottom' && sBottom + TOOLTIP_H_EST + PAD > vpH) {
    actualPlacement = 'top';
  }
  // If requested top but not enough vertical space, try bottom
  if (actualPlacement === 'top' && sTop - TOOLTIP_H_EST - PAD < 0) {
    actualPlacement = 'bottom';
  }

  // ── Calculate Final Position ──
  if (actualPlacement === 'bottom') { 
    top = sBottom + PAD; 
    left = sCX - TOOLTIP_W / 2; 
  }
  else if (actualPlacement === 'top') { 
    top = sTop - TOOLTIP_H_EST - PAD; 
    left = sCX - TOOLTIP_W / 2; 
  }
  else if (actualPlacement === 'right') { 
    top = sCY - TOOLTIP_H_EST / 2; 
    left = sRight + PAD; 
  }
  else { // left
    top = sCY - TOOLTIP_H_EST / 2; 
    left = sLeft - TOOLTIP_W - PAD; 
  }

  // ── Safe Screen Clamping ──
  // Only clamp on the non-colliding axis to prevent off-screen without causing overlap
  if (actualPlacement === 'top' || actualPlacement === 'bottom') {
    // Clamp horizontally only
    left = Math.max(PAD, Math.min(left, vpW - TOOLTIP_W - PAD));
  } else {
    // Clamp vertically only
    top  = Math.max(PAD, Math.min(top,  vpH - TOOLTIP_H_EST - PAD));
  }


  const isFirst = stepIndex === 0;
  const isLast  = stepIndex === totalSteps - 1;
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  const handleSkip = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSkip();
  }, [onSkip]);

  return (
    <motion.div
      key="tooltip"
      role="dialog"
      aria-modal="false"
      aria-label={`Tour step ${stepIndex + 1} of ${totalSteps}: ${step.title}`}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 0,
        top: top,     
        left: left,   
      }}
      initial={{ 
        opacity: 0, 
        scale: 0.87, 
        y: placement === 'top' ? 10 : -10 
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ 
        ...transitionConfig,     
        opacity: { duration: 0.2 },
      }}
      style={{
        position:  'fixed',
        width:      TOOLTIP_W,
        zIndex:     100001,        
        background: 'var(--m3-surface-container-lowest)',
        borderRadius: 'var(--m3-shape-xl)',
        overflow:   'hidden',
        boxShadow:  '0 24px 64px rgba(0,0,0,0.22), 0 4px 16px color-mix(in oklab, var(--t-accent, var(--m3-primary)) 14%, transparent)',
        border:     '0.5px solid color-mix(in oklab, var(--t-accent, var(--m3-primary)) 18%, transparent)',
        pointerEvents: 'auto',
      }}
    >
      {/* ── Header gradient ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--t-accent, var(--m3-primary)) 0%, var(--t-accent-strong, var(--m3-primary)) 100%)',
        padding:    '14px 16px 12px',
        position:   'relative',
        overflow:   'hidden',
      }}>
        <div style={{ position:'absolute', right:-24, top:-24, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,0.1)', pointerEvents:'none' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {step.emoji && <span style={{ fontSize:20, lineHeight:1 }}>{step.emoji}</span>}
            <span style={{ fontSize:14, fontWeight:800, color:'var(--t-on-accent, #fff)', letterSpacing:'-0.2px' }}>{step.title}</span>
          </div>
          <button
            onClick={handleSkip}
            aria-label="Close tour"
            type="button"
            style={{
              background:'rgba(255,255,255,0.2)', 
              border:'none', 
              borderRadius:8,
              width:26, 
              height:26, 
              display:'flex', 
              alignItems:'center', 
              justifyContent:'center',
              cursor:'pointer', 
              color:'var(--t-on-accent, #fff)', 
              flexShrink:0,
              transition: 'background 0.2s ease',
              pointerEvents: 'auto',
              position: 'relative',
              zIndex: 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            }}
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>
        <div style={{ marginTop:5, fontSize:10, color:'rgba(255,255,255,0.7)', fontWeight:700, letterSpacing:'0.6px', textTransform:'uppercase' }}>
          {stepIndex + 1}-{t.step} / {totalSteps}
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ height:3, background:'var(--m3-surface-container-high)' }}>
        <motion.div
          initial={{ width: `${(stepIndex / totalSteps) * 100}%` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ height:'100%', background:'linear-gradient(90deg, var(--t-accent, var(--m3-primary)), var(--t-accent-strong, var(--m3-primary)))' }}
        />
      </div>

      {/* ── Body ── */}
      <div style={{ padding:'14px 16px 16px' }}>
        <motion.p
          key={`description-${stepIndex}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          style={{ fontSize:13, color:'var(--m3-on-surface-variant)', lineHeight:1.65, margin:'0 0 14px' }}
        >
          {step.description}
        </motion.p>

        {/* Dot indicators */}
        <div style={{ display:'flex', gap:4, marginBottom:14, alignItems:'center', justifyContent:'center' }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{
              width:        i === stepIndex ? 20 : 6,
              height:       6,
              borderRadius: 3,
              background:   i === stepIndex ? 'var(--t-accent, var(--m3-primary))' : i < stepIndex ? 'color-mix(in oklab, var(--t-accent, var(--m3-primary)) 35%, transparent)' : 'var(--m3-outline-variant)',
              transition:   'all 0.25s ease',
            }} />
          ))}
        </div>

        {/* Action Controls */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
          {!isFirst ? (
            <button
              onClick={onPrev}
              type="button"
              style={{
                display:'flex', alignItems:'center', gap:5,
                background:'var(--m3-surface-container)', border:'0.5px solid var(--m3-outline-variant)',
                borderRadius:10, padding:'8px 14px',
                fontSize:12, fontWeight:700, color:'var(--m3-on-surface-variant)', cursor:'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--m3-surface-container-high)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--m3-surface-container)';
              }}
            >
              <ArrowLeft size={13} /> {t.prev}
            </button>
          ) : (
            <button
              onClick={handleSkip}
              type="button"
              style={{
                background:'none', border:'0.5px solid var(--m3-outline-variant)',
                borderRadius:10, padding:'8px 14px',
                fontSize:12, color:'var(--m3-outline)', cursor:'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--m3-surface-container)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
              }}
            >
              {t.skip}
            </button>
          )} 

          <button
            onClick={isLast ? handleSkip : onNext}
            type="button"
            style={{
              display:'flex', alignItems:'center', gap:6,
              background:'linear-gradient(135deg, var(--t-accent, var(--m3-primary)), var(--t-accent-strong, var(--m3-primary)))',
              border:'none', borderRadius:9999, padding:'8px 18px',
              fontSize:12, fontWeight:800, color:'var(--t-on-accent, #fff)', cursor:'pointer',
              boxShadow:'0 4px 14px color-mix(in oklab, var(--t-accent, var(--m3-primary)) 38%, transparent)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isLast ? t.finish : <><span>{t.next}</span> <ArrowRight size={13} /></>}
           </button>
        </div>
      </div>
    </motion.div>
  );
}
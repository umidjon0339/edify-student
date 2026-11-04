'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Tiny game sound kit (docs/GAMES.md): every effect is synthesized with the
 * Web Audio API, so there are no audio files. Browsers only allow sound
 * after a user gesture, and every game starts from a click, so the context
 * is created lazily on the first effect. The mute choice is per browser
 * (localStorage, wrapped in try/catch; private mode just starts unmuted).
 */

const MUTE_KEY = 'edify.games.muted';
let ctx: AudioContext | null = null;
let muted = readMuted();
const listeners = new Set<() => void>();

function readMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}

function audio(): AudioContext | null {
  if (muted || typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** One enveloped oscillator note; `at` is seconds from now. */
function note(freq: number, at: number, dur: number, type: OscillatorType = 'sine', gain = 0.14, slideTo?: number) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** One burst of filtered noise (crowd, whoosh); the filter can sweep to `freqTo`. */
function noise(at: number, dur: number, gain: number, freq: number, freqTo?: number) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + at;
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(freq, t0);
  if (freqTo) filter.frequency.exponentialRampToValueAtTime(freqTo, t0 + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(t0);
}

export const sfx = {
  /** Tile picked / card opens. */
  flip: () => { note(520, 0, 0.09, 'triangle', 0.12); note(780, 0.06, 0.12, 'triangle', 0.1); },
  /** Last seconds of the timer. */
  tick: () => note(1100, 0, 0.05, 'square', 0.04),
  correct: () => [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.08, 0.22, 'triangle', 0.12)),
  wrong: () => { note(220, 0, 0.25, 'sawtooth', 0.07, 150); note(165, 0.18, 0.35, 'sawtooth', 0.07, 110); },
  timeout: () => [440, 370, 311].forEach((f, i) => note(f, i * 0.14, 0.2, 'square', 0.05)),
  /** Wheel pointer hitting a peg. */
  peg: () => note(1900, 0, 0.022, 'square', 0.03),
  /** Wheel stops on points. */
  land: () => { note(880, 0, 0.12, 'triangle', 0.12); note(1320, 0.09, 0.3, 'triangle', 0.11); },
  /** Wheel stops on ×2. */
  double: () => [784, 988, 1175, 1568, 1976].forEach((f, i) => note(f, i * 0.06, 0.18, 'triangle', 0.1)),
  /** Wheel stops on Bankrot: a sad "wah-wah". */
  bankrupt: () => { note(330, 0, 0.3, 'sawtooth', 0.07, 260); note(260, 0.3, 0.6, 'sawtooth', 0.07, 130); },
  /** Referee whistle before a penalty. */
  whistle: () => { note(2900, 0, 0.5, 'sine', 0.06); note(2960, 0, 0.5, 'sine', 0.06); },
  /** Boot hits the ball. */
  kick: () => { note(160, 0, 0.14, 'sine', 0.3, 50); noise(0, 0.08, 0.15, 1500); },
  /** Penalty scored: crowd roar + fanfare. */
  goal: () => { noise(0, 1.6, 0.35, 700, 1100); [523, 659, 784, 1047].forEach((f, i) => note(f, 0.1 + i * 0.09, 0.3, 'triangle', 0.1)); },
  /** Keeper saves: glove thud + crowd "ooh". */
  save: () => { note(120, 0, 0.18, 'sine', 0.3, 60); noise(0.08, 0.9, 0.22, 600, 300); },
  /** Ball over the bar: whoosh + crowd groan. */
  miss: () => { noise(0, 0.4, 0.2, 2400, 500); noise(0.3, 0.8, 0.18, 500, 250); },
  /** Caravan: a team's bet is chosen. */
  bet: () => note(660, 0, 0.08, 'triangle', 0.1),
  /** Caravan: one camel step (soft padded thud). */
  step: () => { note(150, 0, 0.1, 'sine', 0.16, 90); noise(0, 0.06, 0.05, 900); },
  /** Caravan lands on an oasis: a rising water bloop. */
  oasis: () => [523, 784, 1047].forEach((f, i) => note(f, i * 0.07, 0.16, 'sine', 0.12, f * 1.3)),
  /** Caravan lands on the bazaar: coins. */
  coins: () => [1568, 2093, 1760, 2349, 2093].forEach((f, i) => note(f, i * 0.06, 0.12, 'triangle', 0.07)),
  /** Sandstorm pushes a caravan back: wind gust. */
  storm: () => { noise(0, 1.1, 0.3, 350, 1400); noise(0.45, 0.9, 0.2, 1200, 300); },
  win: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => note(f, i * 0.12, i === 5 ? 0.6 : 0.16, 'triangle', 0.13)),
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** `[muted, toggle]`, shared by every game on the page. */
export function useGameSound(): [boolean, () => void] {
  const value = useSyncExternalStore(subscribe, () => muted, () => false);
  const toggle = useCallback(() => {
    muted = !muted;
    try { window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* storage blocked */ }
    listeners.forEach((l) => l());
  }, []);
  return [value, toggle];
}

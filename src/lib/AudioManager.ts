/**
 * AudioManager — C7 Winners audio coordination layer (Phase 1, architecture-only).
 *
 * Sits ABOVE sound-synth.ts (foundation) and PARALLEL to c7fx.ts (delegated tap layer).
 * Provides a centralized state container for:
 *   • Music enabled toggle (Phase 1: persisted preference only; Phase 2 will wire ambient loop)
 *   • SFX enabled toggle (compatible with existing 'c7-sound-muted' localStorage key)
 *   • Master volume (compatible with existing 'c7-sound-volume')
 *   • Tab-visibility auto-mute (zero synth volume when hidden, restore on focus)
 *   • User-interaction primed signal (autoplay-policy aware)
 *
 * No binary audio assets. No actual music playback. Phase 2 (when licensed
 * casino-ambient.mp3 / button-click.ogg etc are provided) will wire those
 * files into this layer without changing the public API.
 *
 * localStorage compatibility:
 *   'c7-sound-muted'         ← already used by c7fx.ts, useSound.ts  ('1' = muted)
 *   'c7-sound-volume'        ← already used by useSound.ts            (0..1)
 *   'c7-audio-music-enabled' ← NEW                                    ('1' = on)
 *
 * Public API (imperative):
 *   AudioManager.init()              — call once at app start (idempotent)
 *   AudioManager.playSfx(key)        — gated by sfxEnabled + tabActive
 *   AudioManager.setMusicEnabled(b)
 *   AudioManager.setSfxEnabled(b)
 *   AudioManager.setVolume(n)        — 0..1
 *   AudioManager.getState()          — readonly snapshot
 *   AudioManager.subscribe(fn)       — returns unsubscriber
 *
 * Debug:
 *   window.__c7AudioManager          — handle for browser-console inspection
 */

import { playSynth, unlockSynth, setSynthVolume } from './sound-synth';

type SynthKey = Parameters<typeof playSynth>[0];

export interface AudioState {
  /** User-facing toggle for background music (Phase 2). Persisted. */
  musicEnabled: boolean;
  /** User-facing toggle for sound effects. Persisted. */
  sfxEnabled: boolean;
  /** Master volume 0..1. Persisted. */
  volume: number;
  /** True after the first user gesture. Resets per page load. */
  primed: boolean;
  /** True when the tab is the foreground/visible tab. */
  tabActive: boolean;
}

const LS = {
  music:  'c7-audio-music-enabled',
  sfx:    'c7-sound-muted',     // existing — inverted semantic ('1' = muted)
  volume: 'c7-sound-volume',    // existing
} as const;

function clamp01(n: unknown): number {
  const v = typeof n === 'number' ? n : parseFloat(String(n));
  if (!isFinite(v)) return 0.7;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function readStorage(): Pick<AudioState, 'musicEnabled' | 'sfxEnabled' | 'volume'> {
  const defaults = { musicEnabled: false, sfxEnabled: false, volume: 0.92 };
  if (typeof window === 'undefined') return defaults;
  try {
    const rawVol = localStorage.getItem(LS.volume);
    return {
      musicEnabled: localStorage.getItem(LS.music) === '1',
      sfxEnabled:   localStorage.getItem(LS.sfx)   !== '1', // inverted
      volume:       rawVol !== null ? clamp01(rawVol) : defaults.volume,
    };
  } catch {
    return defaults;
  }
}

class AudioManagerImpl {
  private state: AudioState;
  private initialized = false;
  private listeners = new Set<(s: Readonly<AudioState>) => void>();

  constructor() {
    const initial = readStorage();
    this.state = {
      ...initial,
      primed: false,
      tabActive: typeof document !== 'undefined' ? !document.hidden : true,
    };
  }

  /** One-time wiring. Safe to call multiple times. */
  init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // Apply persisted volume to the synth foundation immediately
    setSynthVolume(this.effectiveSynthVolume());

    // Primed signal — set after the first user gesture (also nudges synth unlock)
    const onFirstInteraction = () => {
      if (this.state.primed) return;
      this.state.primed = true;
      try { unlockSynth(); } catch { /* ignore */ }
      this.emit();
    };
    const evts = ['pointerdown', 'touchstart', 'keydown'] as const;
    evts.forEach(e =>
      window.addEventListener(e, onFirstInteraction, { capture: true, passive: true, once: true })
    );

    // Tab visibility — zero the synth when backgrounded; restore on return.
    // Does NOT touch sfxEnabled (user preference is preserved).
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        const wasActive = this.state.tabActive;
        this.state.tabActive = !document.hidden;
        if (wasActive !== this.state.tabActive) {
          setSynthVolume(this.effectiveSynthVolume());
          this.emit();
        }
      });
    }

    // Debug handle for browser-console inspection. No production impact.
    try {
      (window as unknown as { __c7AudioManager?: AudioManagerImpl }).__c7AudioManager = this;
    } catch { /* ignore */ }
  }

  /** Play an SFX synth recipe. Returns true if dispatched. */
  playSfx(key: SynthKey): boolean {
    if (!this.state.sfxEnabled) return false;
    if (!this.state.tabActive) return false;
    if (typeof window === 'undefined') return false;
    try { unlockSynth(); } catch { /* ignore */ }
    return playSynth(key);
  }

  setMusicEnabled(enabled: boolean): void {
    this.state.musicEnabled = !!enabled;
    this.persist();
    this.emit();
    // Phase 2 will start/stop the actual ambient loop here.
  }

  setSfxEnabled(enabled: boolean): void {
    this.state.sfxEnabled = !!enabled;
    setSynthVolume(this.effectiveSynthVolume());
    this.persist();
    this.emit();
  }

  setVolume(v: number): void {
    this.state.volume = clamp01(v);
    setSynthVolume(this.effectiveSynthVolume());
    this.persist();
    this.emit();
  }

  getState(): Readonly<AudioState> {
    return { ...this.state };
  }

  subscribe(fn: (s: Readonly<AudioState>) => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  /** Volume actually applied to the synth, considering toggles + visibility. */
  private effectiveSynthVolume(): number {
    if (!this.state.sfxEnabled) return 0;
    if (!this.state.tabActive)  return 0;
    return this.state.volume;
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LS.music,  this.state.musicEnabled ? '1' : '0');
      localStorage.setItem(LS.sfx,    this.state.sfxEnabled   ? '0' : '1'); // inverted
      localStorage.setItem(LS.volume, String(this.state.volume));
    } catch { /* quota / privacy mode */ }
  }

  private emit(): void {
    const snap = { ...this.state };
    this.listeners.forEach(fn => { try { fn(snap); } catch { /* ignore */ } });
  }
}

export const AudioManager = new AudioManagerImpl();
export default AudioManager;

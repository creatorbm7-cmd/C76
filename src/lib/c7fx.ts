/**
 * c7fx — Phase 1 FX layer.
 *
 * Provides:
 *   1. playFx(name)   — semantic sound API mapped to existing synth recipes
 *   2. initC7Fx()     — one-time global initializer:
 *       • Delegated tap sound on every button / link / [data-c7-tap]
 *       • Mobile AudioContext priming on first interaction
 *       • Page transition sound on history navigation
 *
 * This intentionally does NOT modify sound-synth.ts. It maps the six
 * Phase 1 sound types onto the existing 8 synth recipes:
 *
 *   Phase 1 name      → existing synth recipe
 *   ────────────────────────────────────────
 *   tap               → buttonClick
 *   tabSwitch         → buttonClick
 *   pageTransition    → coin       (soft, brief)
 *   success           → notification
 *   error             → notification (pitched/identified by caller intent)
 *   win               → winCelebrate
 *   jackpot           → jackpot
 *   notification      → notification
 *
 * Mute state is shared with useSound (localStorage 'c7-sound-muted').
 */

import { playSynth, unlockSynth } from './sound-synth';

const MUTE_KEY = 'c7-sound-muted';

type SynthKey = Parameters<typeof playSynth>[0];

export type FxSound =
  | 'tap'
  | 'tabSwitch'
  | 'pageTransition'
  | 'success'
  | 'error'
  | 'win'
  | 'jackpot'
  | 'notification';

const FX_MAP: Record<FxSound, SynthKey> = {
  tap:            'buttonClick',
  tabSwitch:      'spinStart',
  pageTransition: 'spinEnd',
  success:        'coin',
  error:          'notification',
  win:            'winCelebrate',
  jackpot:        'jackpot',
  notification:   'notification',
};

const isMuted = (): boolean => {
  if (typeof window === 'undefined') return false;
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
};

/** Imperative API — usable from anywhere (event handlers, effects, etc). */
export function playFx(name: FxSound) {
  if (isMuted()) return;
  if (typeof window === 'undefined') return;
  unlockSynth();
  playSynth(FX_MAP[name]);
}

/* ─────────────────────────────────────────────────────────────── */
/* Global delegator: auto-play tap sound on any tappable element  */
/* ─────────────────────────────────────────────────────────────── */
let _delegatorInstalled = false;

/**
 * Initialize global FX behaviors. Safe to call multiple times.
 * Should be called once from main.tsx or App mount.
 */
export function initC7Fx() {
  if (_delegatorInstalled || typeof window === 'undefined') return;
  _delegatorInstalled = true;

  // Cartoon SFX end-to-end: play a high-pitch click on every tap of an
  // interactive element (mute-aware via playFx). Delegated at the document
  // level so it covers the whole app with no per-component wiring.
  const TAP_SEL =
    'button, a, [role="button"], [data-c7-tap], input[type="button"], input[type="submit"], ' +
    '.uo-tab, .uo-card, .uo-dep-tile, .uo-pick, .uo-banner, .uo-coins, .uo-ic, .cbn-navi';
  const onTap = (e: Event) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const hit = t.closest(TAP_SEL);
    if (!hit) return;
    // Different sound style per role.
    let fx: FxSound = 'tap';
    if (hit.closest('.uo-card') || hit.closest('a[href*="/games/"]')) fx = 'tabSwitch';   // game open — whoosh
    else if (hit.closest('.uo-dep-tile, .uo-coins')) fx = 'success';                       // deposit/coin — sparkle
    else if (hit.closest('.cbn-navi')) fx = 'pageTransition';                              // bottom nav — soft swoosh
    else if (hit.closest('.uo-tab, .uo-banner, .uo-pick')) fx = 'tabSwitch';               // category / promo — whoosh
    playFx(fx);
  };
  document.addEventListener('pointerdown', onTap, { capture: true, passive: true });
}

/**
 * c7-sound-synth v2 — Pleasant casino sounds via Web Audio API.
 *
 * Fixes vs v1:
 *  - iOS silent-buffer unlock trick (needed for Safari to actually play)
 *  - Bumped gain ceiling 0.25 → 0.5 (audible on phone speakers at normal volume)
 *  - Resume + state check on every play (not just first interaction)
 *  - Optional debug logging via window.__c7SoundDebug = true
 *  - Listens for multiple unlock events (pointerdown/touchstart/click/keydown)
 */

type C7SoundKey =
  | 'intro'
  | 'buttonClick'
  | 'jackpot'
  | 'winCelebrate'
  | 'notification'
  | 'spinStart'
  | 'spinEnd'
  | 'coin';

let _ctx: AudioContext | null = null;
let _unlocked = false;
let _unlockListenersInstalled = false;
let _masterMul = 1;

declare global {
  interface Window {
    __c7SoundDebug?: boolean;
    webkitAudioContext?: typeof AudioContext;
  }
}

function debug(...args: unknown[]) {
  if (typeof window !== 'undefined' && window.__c7SoundDebug) {
    // eslint-disable-next-line no-console
    console.log('[c7-sound]', ...args);
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) {
    debug('AudioContext not supported');
    return null;
  }
  if (!_ctx) {
    try {
      _ctx = new AC();
      debug('AudioContext created, state:', _ctx.state, 'sampleRate:', _ctx.sampleRate);
    } catch (e) {
      debug('AudioContext creation failed:', e);
      return null;
    }
  }
  return _ctx;
}

/**
 * iOS Safari requires playing a silent buffer inside a user gesture to truly
 * unlock the audio output. resume() alone is not enough.
 */
function trueUnlock(c: AudioContext): void {
  if (_unlocked) return;
  try {
    if (c.state === 'suspended') {
      c.resume().then(() => debug('ctx resumed, state:', c.state)).catch((e) => debug('resume failed:', e));
    }
    const buf = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(0);
    _unlocked = true;
    debug('silent unlock buffer played');
  } catch (e) {
    debug('unlock failed:', e);
  }
}

function installUnlockListeners() {
  if (_unlockListenersInstalled || typeof window === 'undefined') return;
  _unlockListenersInstalled = true;

  const handler = () => {
    const c = getCtx();
    if (!c) return;
    trueUnlock(c);
    if (_unlocked && c.state === 'running') {
      ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((evt) =>
        window.removeEventListener(evt, handler, true)
      );
    }
  };

  ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((evt) =>
    window.addEventListener(evt, handler, { capture: true, passive: true })
  );
  debug('unlock listeners installed');
}

if (typeof window !== 'undefined') {
  installUnlockListeners();
}

interface BeepOpts {
  freq: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  rampTo?: number;
  detune?: number;
  delay?: number;
}

function beep({ freq, dur, type = 'sine', gain = 0.3, rampTo, detune = 0, delay = 0 }: BeepOpts) {
  const c = getCtx();
  if (!c) return;

  if (c.state === 'suspended') {
    c.resume().catch(() => {});
  }

  const t0 = c.currentTime + delay;
  const t1 = t0 + dur;

  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (rampTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, rampTo), t1);
  if (detune) osc.detune.setValueAtTime(detune, t0);

  const g = c.createGain();
  const peak = Math.min(0.5, gain) * _masterMul;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.015, dur * 0.1));
  g.gain.exponentialRampToValueAtTime(0.0001, t1);

  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t1 + 0.05);

  debug('beep', { freq, dur, type, peak, state: c.state });
}

function noise({ dur, gain = 0.15, delay = 0, filterFreq = 2000 }: { dur: number; gain?: number; delay?: number; filterFreq?: number }) {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});

  const t0 = c.currentTime + delay;
  const bufSize = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.7;

  const src = c.createBufferSource();
  src.buffer = buf;

  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(filterFreq, t0);

  const g = c.createGain();
  const peak = Math.min(0.4, gain) * _masterMul;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(filter);
  filter.connect(g);
  g.connect(c.destination);
  src.start(t0);
}

// Premium procedural sound set (Web Audio only — no asset files). Each recipe
// is layered (transient + body + shimmer/tail) for a richer AAA feel. Branded
// names per docs/SOUND_DESIGN.md are noted; UI sounds stay < 0.5s.
const SOUNDS: Record<C7SoundKey, () => void> = {
  // "Crystal Tap" — glassy, bright, instant.
  buttonClick: () => {
    beep({ freq: 2100, dur: 0.045, type: 'triangle', gain: 0.20, rampTo: 2650 });   // glassy ting
    beep({ freq: 3300, dur: 0.05,  type: 'sine',     gain: 0.11, delay: 0.004 });    // sparkle top
    beep({ freq: 1350, dur: 0.028, type: 'square',   gain: 0.09 });                  // click body
  },
  // "Magic Chime" — bright sparkle bell (major triad shimmer).
  notification: () => {
    beep({ freq: 1318.5, dur: 0.16, type: 'sine',     gain: 0.26 });
    beep({ freq: 1975.5, dur: 0.22, type: 'sine',     gain: 0.16, delay: 0.05 });
    beep({ freq: 2637.0, dur: 0.18, type: 'triangle', gain: 0.08, delay: 0.09 });
  },
  // "Gold Coins" — cascading metallic coin drops with a shimmer octave.
  coin: () => {
    const notes = [1568, 2093, 2637, 3136];
    notes.forEach((f, i) => {
      beep({ freq: f,       dur: 0.09, type: 'triangle', gain: 0.24 - i * 0.035, delay: i * 0.045 });
      beep({ freq: f * 1.5, dur: 0.06, type: 'sine',     gain: 0.08,             delay: i * 0.045 + 0.012 });
    });
  },
  // "Super Spin" — rising whoosh (pitch sweep + air noise).
  spinStart: () => {
    beep({ freq: 260, dur: 0.35, type: 'sawtooth', gain: 0.18, rampTo: 1300 });
    beep({ freq: 520, dur: 0.28, type: 'triangle', gain: 0.10, rampTo: 1900, delay: 0.03 });
    noise({ dur: 0.22, gain: 0.08, filterFreq: 3000 });
  },
  // "Reel Stop" — satisfying descending thunk + click.
  spinEnd: () => {
    beep({ freq: 720, dur: 0.22, type: 'triangle', gain: 0.24, rampTo: 180 });
    beep({ freq: 200, dur: 0.12, type: 'sine',     gain: 0.20, delay: 0.02 });   // thunk
    noise({ dur: 0.035, gain: 0.05, filterFreq: 4200 });                          // click
  },
  // "Mega Win Fanfare" — ascending brass-ish arpeggio + sustained chord + sparkle.
  winCelebrate: () => {
    const arp = [523.25, 659.25, 783.99, 1046.50];
    arp.forEach((f, i) => {
      beep({ freq: f,     dur: 0.22, type: 'sawtooth', gain: 0.19, delay: i * 0.08 });
      beep({ freq: f * 2, dur: 0.18, type: 'triangle', gain: 0.09, delay: i * 0.08 + 0.01 });
    });
    [523.25, 659.25, 783.99, 1046.50].forEach((f) =>
      beep({ freq: f, dur: 0.6, type: 'sine', gain: 0.12, delay: 0.34 }),          // chord tail
    );
    noise({ dur: 0.25, gain: 0.06, delay: 0.32, filterFreq: 6000 });               // sparkle
  },
  // "Jackpot Explosion" — sub boom + rising choir-ish swell + coin cascade + chord.
  jackpot: () => {
    beep({ freq: 90,  dur: 0.7, type: 'sine',     gain: 0.50, rampTo: 45 });       // sub boom
    beep({ freq: 140, dur: 0.5, type: 'triangle', gain: 0.22 });
    const rise = [392, 523.25, 659.25, 783.99, 1046.50, 1318.51];
    rise.forEach((f, i) => {
      beep({ freq: f,       dur: 0.5, type: 'sine',     gain: 0.16, delay: 0.1 + i * 0.06 });
      beep({ freq: f * 1.5, dur: 0.4, type: 'triangle', gain: 0.07, delay: 0.1 + i * 0.06 });
    });
    [1568, 2093, 2637, 3136, 2093, 2637].forEach((f, i) =>
      beep({ freq: f, dur: 0.10, type: 'triangle', gain: 0.14, delay: 0.5 + i * 0.07 }),  // coin cascade
    );
    [523.25, 659.25, 783.99, 1046.50].forEach((f) =>
      beep({ freq: f, dur: 0.9, type: 'sine', gain: 0.14, delay: 0.55 }),          // triumphant chord
    );
    noise({ dur: 0.5, gain: 0.10, delay: 0.05, filterFreq: 5000 });                // explosion sparkle
  },
  // "Victory Rise" — cinematic upward riser.
  intro: () => {
    [392, 523, 659, 784, 1046].forEach((f, i) =>
      beep({ freq: f, dur: 0.28, type: 'sine', gain: 0.20, delay: i * 0.1 }),
    );
  },
};

export function playSynth(key: C7SoundKey): boolean {
  const fn = SOUNDS[key];
  if (!fn) {
    debug('unknown sound key:', key);
    return false;
  }
  const c = getCtx();
  if (!c) return false;
  if (!_unlocked) trueUnlock(c);
  try {
    fn();
    return true;
  } catch (e) {
    debug('playSynth error:', e);
    return false;
  }
}

export function getSynthState(): string {
  if (typeof window === 'undefined') return 'unavailable';
  const c = getCtx();
  if (!c) return 'unavailable';
  return c.state;
}

export function unlockSynth(): void {
  const c = getCtx();
  if (c) trueUnlock(c);
}


export function setSynthVolume(v: number): void {
  const clamped = Math.max(0, Math.min(1, Number(v) || 0));
  _masterMul = clamped;
  if (typeof window !== 'undefined' && window.__c7SoundDebug) {
    console.log('[c7-sound] setSynthVolume', clamped);
  }
}

export default playSynth;


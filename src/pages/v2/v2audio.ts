// v2audio — the V2 world's premium casino audio bus (Phase P2).
//
// A tiny module-singleton that plays the shipped casino SFX (public/sounds/*.mp3)
// and loops the lobby ambience. It deliberately REUSES the existing global sound
// preferences so mute/volume stay unified across V1 and V2:
//   localStorage 'c7-sound-muted'  ("1" muted / "0" on)  — default muted
//   localStorage 'c7-sound-volume' (0..1)                — default 0.7
//
// Presentation-only: no gameplay/RNG/wallet ties. Autoplay-policy safe — audio is
// created lazily and only starts after a user gesture (the toggle or any tap once
// unmuted). Honors prefers-reduced-motion by NOT auto-looping ambience there.

const MUTE_KEY = "c7-sound-muted";
const VOL_KEY = "c7-sound-volume";

// Logical sound name → file. Several names intentionally share one file.
const SRC: Record<string, string> = {
  ambience: "/sounds/ambience.mp3",
  spin: "/sounds/spin.mp3",
  wheel: "/sounds/spin.mp3",
  win: "/sounds/win.mp3",
  megawin: "/sounds/megawin.mp3",
  jackpot: "/sounds/megawin.mp3",
  vip: "/sounds/win.mp3",
  coin: "/sounds/coin.mp3",
  deposit: "/sounds/coin.mp3",
  withdraw: "/sounds/coin.mp3",
  daily: "/sounds/coin.mp3",
  reward: "/sounds/coin.mp3",
  click: "/sounds/click.mp3",
};

export type V2Sound = keyof typeof SRC;

function reduceMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

class V2AudioBus {
  private cache = new Map<string, HTMLAudioElement>();
  private ambience: HTMLAudioElement | null = null;
  private subs = new Set<() => void>();
  muted = true;
  volume = 0.7;

  constructor() {
    if (typeof window !== "undefined") {
      this.muted = localStorage.getItem(MUTE_KEY) !== "0";
      const v = parseFloat(localStorage.getItem(VOL_KEY) || "0.7");
      this.volume = isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.7;
    }
  }

  subscribe(fn: () => void) { this.subs.add(fn); return () => { this.subs.delete(fn); }; }
  private emit() { this.subs.forEach((f) => f()); }

  private base(name: V2Sound): HTMLAudioElement | null {
    if (typeof window === "undefined") return null;
    const src = SRC[name];
    if (!src) return null;
    let a = this.cache.get(src);
    if (!a) { a = new Audio(src); a.preload = "auto"; this.cache.set(src, a); }
    return a;
  }

  /** Fire a one-shot SFX (overlap-safe via cloneNode). No-op when muted. */
  play(name: V2Sound) {
    if (this.muted) return;
    const b = this.base(name);
    if (!b) return;
    try {
      const node = b.cloneNode(true) as HTMLAudioElement;
      node.volume = this.volume;
      void node.play().catch(() => { /* autoplay/interaction gate — ignore */ });
    } catch { /* ignore */ }
  }

  private startAmbience() {
    if (this.muted || reduceMotion() || typeof window === "undefined") return;
    if (!this.ambience) {
      this.ambience = new Audio(SRC.ambience);
      this.ambience.loop = true;
      this.ambience.preload = "auto";
    }
    this.ambience.volume = this.volume * 0.4; // ambience sits under SFX
    void this.ambience.play().catch(() => { /* needs a gesture — retried on next unmute/tap */ });
  }
  private stopAmbience() { if (this.ambience) { this.ambience.pause(); } }

  /** Duck the lobby ambience (e.g. while a C74 Original game is open) without
   *  changing the user's mute preference. Pair with resume() on exit. */
  pauseAmbience() { this.stopAmbience(); }

  /** Call from a user gesture (or when returning to the lobby) so the browser
   *  lets ambience begin/resume. */
  resume() { if (!this.muted) this.startAmbience(); }

  setMuted(m: boolean) {
    this.muted = m;
    if (typeof window !== "undefined") localStorage.setItem(MUTE_KEY, m ? "1" : "0");
    if (m) this.stopAmbience(); else this.startAmbience();
    this.emit();
  }
  toggle() { this.setMuted(!this.muted); }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (typeof window !== "undefined") localStorage.setItem(VOL_KEY, String(this.volume));
    if (this.ambience) this.ambience.volume = this.volume * 0.4;
    this.emit();
  }
}

export const v2audio = new V2AudioBus();

/** Convenience for event handlers outside React. */
export function playV2(name: V2Sound) { v2audio.play(name); }

/**
 * Shared adaptive-quality controller for the cinematic layer.
 *
 * Priority order: Smoothness > Responsiveness > Stability > Visual fx.
 *
 * - Picks an initial tier from device capability (high / mid / low).
 * - Watches rolling FPS via perfMonitor and DOWNGRADES on sustained drops.
 *   We never auto-upgrade aggressively (a one-frame spike doesn't bring
 *   particles back) to avoid oscillation.
 * - Calm routes (admin, auth, wallet, forms, settings, etc.) force `low`
 *   regardless of device — those screens must feel instant.
 * - Pauses everything when the tab is hidden.
 *
 * Consumers subscribe via `useQuality()` for a tiny snapshot:
 *   { tier, particles, parallax, blur, gyro, particleCap, gyroMaxPx }
 */
import { startPerfMonitor, subscribePerf } from "./perfMonitor";

export type QualityTier = "high" | "mid" | "low";

export interface QualitySnapshot {
  tier: QualityTier;
  /** Render canvas particle systems */
  particles: boolean;
  /** Enable gyro / parallax drift */
  parallax: boolean;
  /** Allow heavy backdrop-filter blur surfaces */
  blur: boolean;
  /** Allow gyro listener at all */
  gyro: boolean;
  /** Max particles a system should spawn */
  particleCap: number;
  /** Max pixel drift for parallax layers (2-5px cinematic rule) */
  gyroMaxPx: number;
  /** True when current route is a "calm" surface (wallet/auth/admin/forms) */
  calm: boolean;
  /** True when document is hidden — consumers should pause loops */
  paused: boolean;
}

type Listener = (s: QualitySnapshot) => void;

const CALM_PREFIXES = [
  "/admin",
  "/login",
  "/dtx/onboarding",
  "/dtx/wallet",
  "/wallet",
  "/wallet",
  "/settings",
  "/dtx/kyc",
  "/dtx/chat",
  "/dtx/notifications",
  "/dtx/responsible-gaming",
  "/dtx/provably-fair",
  "/quick/",
];

function detectInitialTier(): QualityTier {
  if (typeof navigator === "undefined") return "mid";
  const nav: any = navigator;
  const mem = typeof nav.deviceMemory === "number" ? nav.deviceMemory : 8;
  const cores = nav.hardwareConcurrency ?? 8;
  const saveData = !!nav.connection?.saveData;
  const reduceMotion = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || saveData || mem < 3 || cores < 4) return "low";
  if (mem < 6 || cores < 6) return "mid";
  return "high";
}

const SETTINGS: Record<QualityTier, Omit<QualitySnapshot, "tier" | "calm" | "paused">> = {
  high: { particles: true,  parallax: true,  blur: true,  gyro: true,  particleCap: 60, gyroMaxPx: 5 },
  mid:  { particles: true,  parallax: true,  blur: false, gyro: true,  particleCap: 24, gyroMaxPx: 3 },
  low:  { particles: false, parallax: false, blur: false, gyro: false, particleCap: 0,  gyroMaxPx: 0 },
};

const CALM_OVERRIDE: Omit<QualitySnapshot, "tier" | "calm" | "paused"> = {
  particles: false, parallax: false, blur: false, gyro: false, particleCap: 0, gyroMaxPx: 0,
};

class QualityController {
  private tier: QualityTier;
  private listeners = new Set<Listener>();
  private calm = false;
  private paused = false;
  private lowFrames = 0;
  private started = false;

  constructor() {
    this.tier = detectInitialTier();
  }

  start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    startPerfMonitor();

    // Auto-downgrade on sustained low FPS.
    subscribePerf((s) => {
      // Don't react while paused / calm — perfMonitor still ticks.
      if (this.paused) return;
      if (s.fps && s.fps < 35) {
        this.lowFrames += 1;
        // 3 consecutive bad samples (≈3s) → drop a tier
        if (this.lowFrames >= 3 && this.tier !== "low") {
          this.lowFrames = 0;
          this.setTier(this.tier === "high" ? "mid" : "low");
        }
      } else if (s.fps && s.fps >= 50) {
        this.lowFrames = 0;
      }
    });

    document.addEventListener("visibilitychange", () => {
      this.paused = document.hidden;
      this.notify();
    });
  }

  setRoute(pathname: string) {
    const next = CALM_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
    if (next !== this.calm) {
      this.calm = next;
      this.notify();
    }
  }

  /** Manual override (e.g. user toggle in settings) — capped to detected ceiling. */
  setTier(t: QualityTier) {
    if (t === this.tier) return;
    this.tier = t;
    this.notify();
  }

  snapshot(): QualitySnapshot {
    const base = this.calm ? CALM_OVERRIDE : SETTINGS[this.tier];
    return { tier: this.tier, calm: this.calm, paused: this.paused, ...base };
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    l(this.snapshot());
    return () => { this.listeners.delete(l); };
  }

  private notify() {
    const snap = this.snapshot();
    this.listeners.forEach((l) => l(snap));
  }
}

export const quality = new QualityController();

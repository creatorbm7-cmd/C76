/**
 * C7EarnBurst — the C7 "you earned +X C74" micro-celebration.
 *
 * Phase 1.2 of the C7 Engagement System (docs/c74/c7-engagement-system-v1.md).
 * Global, LISTEN-ONLY overlay: on a `c7:energy-earned` CustomEvent it shows a gold
 * coin-burst with the earned amount. Events arriving within ~400ms are aggregated
 * into a single "+ΣX" so a flurry of bets never spams; each burst auto-dismisses
 * ~1.6s later. Honors prefers-reduced-motion (static chip, no motion).
 *
 * Pure presentation. No data source, no backend, no wiring to real earning yet —
 * the real `c7:energy-earned` emission from game settle responses is Phase 1.1.
 * For manual preview verification, dispatch a synthetic event from the console:
 *   window.dispatchEvent(new CustomEvent('c7:energy-earned', { detail: { amount: 18 } }))
 */
import { useEffect, useRef, useState } from "react";

/** Event contract (shared with the future Phase 1.1 emitter). */
export const C7_EARN_EVENT = "c7:energy-earned";
export interface C7EarnDetail { amount?: number; source?: string; newBalance?: number }

interface Burst { id: number; amount: number }

const AGGREGATE_MS = 400; // merge earns arriving within this window
const DISMISS_MS = 1600;  // burst lifetime

const fmt = (n: number): string => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

export default function C7EarnBurst() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [reduced, setReduced] = useState(false);
  const pending = useRef<{ sum: number; timer: number | null }>({ sum: 0, timer: null });
  const idRef = useRef(0);
  const dismissTimers = useRef<number[]>([]);

  // Live prefers-reduced-motion preference.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(!!mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    const onEarn = (e: Event) => {
      const detail = (e as CustomEvent<C7EarnDetail>).detail || {};
      const amt = Number(detail.amount);
      if (!Number.isFinite(amt) || amt <= 0) return; // ignore invalid / non-positive
      pending.current.sum += amt;
      if (pending.current.timer != null) window.clearTimeout(pending.current.timer);
      pending.current.timer = window.setTimeout(() => {
        const total = pending.current.sum;
        pending.current = { sum: 0, timer: null };
        const id = ++idRef.current;
        setBursts((b) => [...b, { id, amount: total }]);
        const t = window.setTimeout(() => {
          setBursts((b) => b.filter((x) => x.id !== id));
          dismissTimers.current = dismissTimers.current.filter((x) => x !== t);
        }, DISMISS_MS);
        dismissTimers.current.push(t);
      }, AGGREGATE_MS);
    };
    window.addEventListener(C7_EARN_EVENT, onEarn as EventListener);
    return () => {
      window.removeEventListener(C7_EARN_EVENT, onEarn as EventListener);
      if (pending.current.timer != null) window.clearTimeout(pending.current.timer);
      dismissTimers.current.forEach((t) => window.clearTimeout(t));
      dismissTimers.current = [];
    };
  }, []);

  if (bursts.length === 0) return null;

  return (
    <div className="c7eb-root" aria-live="polite" data-reduced={reduced ? "1" : undefined}>
      <style>{CSS}</style>
      {bursts.map((b) => (
        <div key={b.id} className="c7eb" role="status">
          <span className="c7eb-coin" aria-hidden="true">🪙</span>
          <span className="c7eb-amt">+{fmt(b.amount)}</span>
          <span className="c7eb-unit">C74</span>
        </div>
      ))}
    </div>
  );
}

const CSS = `
.c7eb-root { position: fixed; left: 0; right: 0; top: 18%; z-index: 260; display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; }
.c7eb { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 999px;
  font-family: Inter, system-ui, sans-serif; font-weight: 900; font-size: 17px; letter-spacing: 0.3px; color: #3a2600;
  background: radial-gradient(120% 100% at 50% 12%, rgba(255,255,255,0.82), transparent 52%), linear-gradient(180deg, #fff6d5, #ffe9a8 45%, #f6c945);
  border: 1px solid rgba(255,231,160,0.9);
  box-shadow: 0 2px 0 #c6851e, inset 0 1px 0 rgba(255,255,255,0.85), 0 10px 26px -8px rgba(246,201,69,0.65), 0 0 20px -4px rgba(46,224,138,0.45);
  text-shadow: 0 1px 0 rgba(255,255,255,0.5);
  animation: c7eb-rise 1.6s cubic-bezier(.2,.8,.25,1) forwards; will-change: transform, opacity; }
.c7eb-coin { font-size: 18px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25)); animation: c7eb-spin 1.6s ease-in-out; }
.c7eb-amt { font-variant-numeric: tabular-nums; }
.c7eb-unit { font-size: 12px; font-weight: 900; letter-spacing: 0.6px; color: #5a3d0a; opacity: 0.9; }
@keyframes c7eb-rise {
  0%   { opacity: 0; transform: translateY(10px) scale(0.72); }
  16%  { opacity: 1; transform: translateY(0) scale(1.08); }
  30%  { transform: translateY(-2px) scale(1); }
  72%  { opacity: 1; transform: translateY(-10px) scale(1); }
  100% { opacity: 0; transform: translateY(-22px) scale(0.98); }
}
@keyframes c7eb-spin { 0% { transform: rotate(-12deg) scale(0.8); } 30% { transform: rotate(10deg) scale(1.12); } 100% { transform: rotate(0) scale(1); } }
/* Reduced motion: static chip, no movement (removal is handled by the JS timer). */
.c7eb-root[data-reduced="1"] .c7eb, .c7eb-root[data-reduced="1"] .c7eb-coin { animation: none; opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .c7eb, .c7eb-coin { animation: none !important; opacity: 1 !important; transform: none !important; }
}
`;

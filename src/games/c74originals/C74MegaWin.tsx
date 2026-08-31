// C74MegaWin — a dormant, reusable celebration overlay for C74 Originals.
//
// Presentation-only. It listens for a window CustomEvent `c74:megawin`
// ({ detail: { amount, tier } }) and plays a coin-burst + banner, then fades.
// Nothing dispatches that event yet — it is scaffolded here so a LATER, purely
// cosmetic game→host hook (Phase-B) can fire it. It never touches game logic,
// balance, RNG, wallet, or payments. pointer-events: none — never blocks taps.

import { useEffect, useRef, useState } from "react";
import { playV2 } from "@/pages/v2/v2audio";

type Cele = { amount?: number; tier?: "WIN" | "BIG WIN" | "MEGA WIN" } | null;

export default function C74MegaWin() {
  const [cele, setCele] = useState<Cele>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onWin = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      const tier = d.tier || "MEGA WIN";
      // Cosmetic celebration audio — jackpot fanfare for the big tiers, chime otherwise.
      playV2(tier === "WIN" ? "win" : "jackpot");
      setCele({ amount: Number(d.amount) || 0, tier });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCele(null), 4200);
    };
    window.addEventListener("c74:megawin", onWin as EventListener);
    return () => { window.removeEventListener("c74:megawin", onWin as EventListener); if (timer.current) clearTimeout(timer.current); };
  }, []);

  if (!cele) return null;
  return (
    <div className="c74mw" aria-hidden="true">
      <style>{MW_CSS}</style>
      <div className="c74mw-rays" />
      <div className="c74mw-coins">{Array.from({ length: 18 }).map((_, i) => (
        <i key={i} style={{ left: `${(i * 5.5 + 4) % 100}%`, animationDelay: `${(i % 9) * 0.08}s`, animationDuration: `${1.1 + (i % 5) * 0.16}s` }}>🪙</i>
      ))}</div>
      <div className="c74mw-card">
        <span className="c74mw-tier">{cele.tier}</span>
        {cele.amount ? <b className="c74mw-amt">{cele.amount.toLocaleString("en-US")}<i> C74</i></b> : null}
      </div>
    </div>
  );
}

const MW_CSS = `
.c74mw { position: absolute; inset: 0; z-index: 6; pointer-events: none; display: grid; place-items: center; overflow: hidden; animation: c74mw-fade 4.2s ease both; }
@keyframes c74mw-fade { 0% { opacity: 0; } 8%,82% { opacity: 1; } 100% { opacity: 0; } }
.c74mw-rays { position: absolute; width: 160%; aspect-ratio: 1; border-radius: 50%; pointer-events: none;
  background: conic-gradient(from 0deg, transparent, rgba(255,214,120,0.28) 8deg, transparent 20deg, rgba(255,236,180,0.2) 34deg, transparent 48deg); animation: c74mw-spin 7s linear infinite; }
@keyframes c74mw-spin { to { transform: rotate(360deg); } }
.c74mw-coins { position: absolute; inset: 0; }
.c74mw-coins i { position: absolute; top: -8%; font-style: normal; font-size: 24px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.45)); animation: c74mw-drop linear forwards; }
@keyframes c74mw-drop { 0% { transform: translateY(0) rotate(0); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(120vh) rotate(360deg); opacity: 0.9; } }
.c74mw-card { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 20px 34px; border-radius: 22px;
  background: radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,0.2), transparent 55%), linear-gradient(160deg, rgba(42,30,6,0.92), rgba(20,17,10,0.94));
  border: 1.5px solid transparent; border-image: linear-gradient(150deg,#8a6410,#ffe89a 26%,#c8930f 52%,#fff6d8 74%,#8a6410) 1;
  box-shadow: 0 24px 50px -16px rgba(0,0,0,0.8), 0 0 40px -6px rgba(245,180,35,0.55); animation: c74mw-pop 0.5s cubic-bezier(.2,1.4,.4,1) both; }
@keyframes c74mw-pop { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
.c74mw-tier { font: 900 26px/1 Inter, system-ui, sans-serif; letter-spacing: 1px;
  background: linear-gradient(180deg,#fff6d8 6%,#ffe08a 44%,#f5b423 76%,#c8930f); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;
  filter: drop-shadow(0 2px 0 rgba(90,55,8,0.5)) drop-shadow(0 0 18px rgba(255,205,90,0.55)); }
.c74mw-amt { font: 900 30px/1 Inter, system-ui, sans-serif; color: #ffe9a8; font-variant-numeric: tabular-nums; text-shadow: 0 0 16px rgba(255,205,90,0.6); }
.c74mw-amt i { font-style: normal; font-size: 14px; opacity: 0.75; margin-left: 4px; }
@media (prefers-reduced-motion: reduce) { .c74mw-rays, .c74mw-coins i { animation: none !important; } .c74mw-coins { display: none; } .c74mw-card { animation: none; } }
`;

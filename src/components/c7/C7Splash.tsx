/**
 * C7Splash — branded boot splash / onboarding loading screen.
 *
 * Shown once per browser session on cold load (sessionStorage-gated): C7
 * Winners logo on a glossy diamond, slot-reel "WINNERS" wordmark, an animated
 * 0→100% loading bar, and the "safe payments" + copyright footer — in the
 * UONO orange/gold HDR theme. Auto-fades out when the bar fills and unmounts,
 * revealing the app underneath.
 */
import { useEffect, useState } from "react";

const SS_KEY = "c7_splash_seen_v1";
const DURATION = 1900;

const CSS = `
.spl-root { position: fixed; inset: 0; z-index: 99999; display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: #04140c; overflow: hidden; opacity: 1; transition: opacity 0.45s ease; }
/* Once fading (visually gone), never intercept taps — a stalled teardown must
   not leave an invisible full-screen sheet that blocks all navigation. */
.spl-root.spl-fade { opacity: 0; pointer-events: none; }
/* Living Emerald-Forest entry — canopy glow up top, warm floor glow, deep
   emerald→near-black. Seamlessly continues into the lobby underneath. */
.spl-bg { position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(80% 55% at 50% 24%, rgba(46,230,130,0.30), transparent 60%),
    radial-gradient(60% 42% at 50% 104%, rgba(255,200,61,0.16), transparent 62%),
    linear-gradient(180deg, #061c11 0%, #04140c 55%, #020a06 100%); }
/* Drifting god-ray light shafts through the canopy */
.spl-rays { position: absolute; inset: -10% 0 0; pointer-events: none;
  background: repeating-linear-gradient(101deg, transparent 0 46px, rgba(140,255,200,0.05) 46px 49px, transparent 49px 104px);
  -webkit-mask: linear-gradient(180deg, #000 0%, rgba(0,0,0,0.5) 36%, transparent 64%); mask: linear-gradient(180deg, #000 0%, rgba(0,0,0,0.5) 36%, transparent 64%);
  animation: spl-godray 6s ease-in-out infinite alternate; }
@keyframes spl-godray { 0% { transform: translateX(-22px); opacity: 0.6; } 100% { transform: translateX(22px); opacity: 1; } }
.spl-streaks { position: absolute; inset: 0; pointer-events: none; opacity: 0.6; }
.spl-streaks i { position: absolute; top: -25%; width: 2px; height: 55%; border-radius: 2px;
  background: linear-gradient(180deg, transparent, rgba(var(--c7-gold-rgb),0.75), transparent);
  animation: spl-fall 2.6s linear infinite; }
/* half the streaks glow emerald — living forest */
.spl-streaks i:nth-child(2n) { background: linear-gradient(180deg, transparent, rgba(80,230,140,0.7), transparent); }
@keyframes spl-fall { 0% { transform: translateY(-50%); opacity: 0; } 30%,70% { opacity: 0.7; } 100% { transform: translateY(180%); opacity: 0; } }

.spl-center { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.spl-badge { position: relative; width: 220px; height: 168px; display: grid; place-items: center; }
.spl-diamond { position: absolute; width: 148px; height: 148px; border-radius: 28px; transform: rotate(45deg);
  background: radial-gradient(120% 120% at 50% 0%, rgba(255,255,255,0.5), transparent 55%), linear-gradient(180deg, var(--c7-accent), var(--c7-primary));
  box-shadow: 0 18px 42px rgba(var(--c7-primary-rgb),0.55), inset 0 3px 0 rgba(255,255,255,0.55), inset 0 -16px 26px rgba(0,0,0,0.30);
  animation: spl-pop 0.7s cubic-bezier(0.22,1.4,0.4,1) both; }
@keyframes spl-pop { from { transform: rotate(45deg) scale(0.4); opacity: 0; } to { transform: rotate(45deg) scale(1); opacity: 1; } }
.spl-logo { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; }
.spl-c7 { font-size: 56px; font-weight: 900; letter-spacing: 1px; line-height: 1; color: #ffe9a8;
  text-shadow: 0 2px 0 #b25e00, 0 4px 0 #7a3f00, 0 6px 11px rgba(0,0,0,0.5), 0 0 18px rgba(var(--c7-gold-rgb),0.7); }
.spl-reels { display: flex; gap: 3px; }
.spl-reel { width: 19px; height: 26px; display: grid; place-items: center; font-size: 13px; font-weight: 900; color: var(--c7-primary-dark);
  background: linear-gradient(180deg, #ffffff, #d9d2c4); border-radius: 5px;
  box-shadow: inset 0 -3px 5px rgba(0,0,0,0.18), inset 0 2px 0 rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.5);
  animation: spl-reel 0.5s ease both; }
@keyframes spl-reel { from { transform: translateY(-9px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.spl-tag { font-size: 12px; font-weight: 900; letter-spacing: 3px; color: #ffd98a; text-shadow: 0 1px 4px rgba(0,0,0,0.6); }

.spl-foot { position: absolute; bottom: 8%; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 0 32px; z-index: 2; }
.spl-bar { position: relative; width: min(78%, 360px); height: 22px; border-radius: 999px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); overflow: hidden; box-shadow: inset 0 2px 5px rgba(0,0,0,0.5); }
.spl-bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(180deg, var(--c7-gold), var(--c7-primary)); box-shadow: 0 0 14px rgba(var(--c7-primary-rgb),0.7), inset 0 2px 0 rgba(255,255,255,0.5); transition: width 0.12s linear; }
.spl-bar-pct { position: absolute; inset: 0; display: grid; place-items: center; font-size: 11px; font-weight: 900; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.75); }
.spl-secure { font-size: 12px; font-weight: 800; color: var(--c7-gold); letter-spacing: 0.3px; text-align: center; }
.spl-copy { font-size: 9px; font-weight: 700; letter-spacing: 1px; color: rgba(255,255,255,0.42); text-align: center; }

/* Live-flying aviator plane */
.spl-plane { position: absolute; z-index: 2; width: 132px; top: 16%; left: -160px; pointer-events: none;
  filter: drop-shadow(0 14px 20px rgba(0,0,0,0.45));
  animation: spl-fly 4.6s linear infinite; will-change: transform; }
@keyframes spl-fly {
  0%   { transform: translate(0, 0) rotate(-5deg); }
  22%  { transform: translate(28vw, -20px) rotate(-2deg); }
  48%  { transform: translate(56vw, 8px) rotate(-7deg); }
  74%  { transform: translate(84vw, -14px) rotate(-3deg); }
  100% { transform: translate(122vw, -2px) rotate(-5deg); }
}
.spl-prop { transform-box: fill-box; transform-origin: center; animation: spl-spin 0.16s linear infinite; }
@keyframes spl-spin { to { transform: rotate(360deg); } }
@keyframes spl-puff { 0% { opacity: 0.6; transform: translateX(0) scaleX(1); } 100% { opacity: 0; transform: translateX(-26px) scaleX(1.6); } }
.spl-vapor { position: absolute; z-index: 1; top: 16%; left: -160px; width: 132px; height: 100px; pointer-events: none;
  animation: spl-fly 4.6s linear infinite; }
.spl-vapor i { position: absolute; top: 52px; left: -18px; width: 46px; height: 5px; border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28)); opacity: 0.6;
  animation: spl-puff 1s ease-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .spl-rays, .spl-streaks i, .spl-diamond, .spl-reel { animation: none !important; }
  .spl-diamond { transform: rotate(45deg); opacity: 1; }
  .spl-plane { animation: none; left: 50%; top: 12%; transform: translateX(-50%) rotate(-4deg); }
  .spl-prop, .spl-vapor { animation: none; }
  .spl-vapor { display: none; }
}
`;

/** Stylized aviator plane (teal fuselage, cream high-wing, spinning brown prop). Nose points right. */
function SplashPlane({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 220 150" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* tail surfaces */}
      <path d="M36 84 L20 50 L42 62 L50 82 Z" fill="#1aa9a1" />
      <path d="M30 86 L8 88 L11 95 L36 92 Z" fill="#1aa9a1" />
      {/* fuselage */}
      <path d="M34 84 Q62 66 150 68 Q182 70 194 80 Q182 91 150 93 Q66 96 44 93 Q28 90 34 84 Z" fill="#20c4bb" />
      <path d="M150 68 Q182 70 194 80 Q182 91 150 93 Z" fill="#17b0a7" />
      {/* cockpit windows */}
      <path d="M116 72 L150 72 L146 82 L120 82 Z" fill="#bdeef0" />
      <path d="M133 72 L133 82" stroke="#7fd6d2" strokeWidth="2" />
      {/* high wing */}
      <rect x="52" y="40" width="122" height="16" rx="8" fill="#eef6f0" />
      <ellipse cx="80" cy="48" rx="15" ry="5" fill="#37ccc4" />
      <ellipse cx="140" cy="48" rx="15" ry="5" fill="#37ccc4" />
      <rect x="108" y="52" width="7" height="20" rx="3" fill="#158f88" />
      {/* landing gear */}
      <path d="M120 92 L108 116" stroke="#16544f" strokeWidth="4" strokeLinecap="round" />
      <path d="M150 92 L160 116" stroke="#16544f" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="106" cy="118" rx="11" ry="6" fill="#eef6f0" />
      <ellipse cx="162" cy="118" rx="11" ry="6" fill="#eef6f0" />
      <circle cx="106" cy="120" r="6" fill="#1c2b2e" />
      <circle cx="162" cy="120" r="6" fill="#1c2b2e" />
      <circle cx="106" cy="120" r="2.4" fill="#37ccc4" />
      <circle cx="162" cy="120" r="2.4" fill="#37ccc4" />
      {/* engine cowl */}
      <ellipse cx="178" cy="80" rx="16" ry="15" fill="#1fb8af" />
      <circle cx="178" cy="80" r="10" fill="#178f88" />
      {/* propeller (spins) */}
      <g className="spl-prop">
        <rect x="196" y="50" width="8" height="60" rx="4" fill="#6b4a2b" />
        <rect x="196" y="50" width="8" height="60" rx="4" fill="#6b4a2b" transform="rotate(60 200 80)" />
        <rect x="196" y="50" width="8" height="60" rx="4" fill="#6b4a2b" transform="rotate(120 200 80)" />
      </g>
      {/* spinner */}
      <circle cx="200" cy="80" r="7" fill="#f3f7f4" />
      <circle cx="200" cy="80" r="3" fill="#cfe0da" />
    </svg>
  );
}

export default function C7Splash() {
  const [done, setDone] = useState(() => {
    try { return sessionStorage.getItem(SS_KEY) === "1"; } catch { return false; }
  });
  const [pct, setPct] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (done) return;
    let raf = 0;
    let start = 0;
    let fadeTimer = 0;
    const finish = () => {
      setFading(true);
      fadeTimer = window.setTimeout(() => {
        try { sessionStorage.setItem(SS_KEY, "1"); } catch { /* ignore */ }
        setDone(true);
      }, 460);
    };
    const tick = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 2);
      setPct(Math.round(eased * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        finish();
      }
    };
    raf = requestAnimationFrame(tick);
    // Hard fail-safe: requestAnimationFrame is throttled/paused on a backgrounded
    // tab and can crawl on a slow device, so the rAF path may never reach 100%.
    // This wall-clock timer guarantees the splash tears down regardless — it can
    // never linger as an invisible, tap-blocking overlay that freezes navigation
    // (the "every tab shows the same screen" failure).
    const hardStop = window.setTimeout(() => {
      setPct(100);
      try { sessionStorage.setItem(SS_KEY, "1"); } catch { /* ignore */ }
      setDone(true);
    }, DURATION + 1600);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(fadeTimer); window.clearTimeout(hardStop); };
  }, [done]);

  if (done) return null;

  return (
    <div className={`spl-root${fading ? " spl-fade" : ""}`} aria-hidden="true">
      <style>{CSS}</style>
      <div className="spl-bg" />
      <div className="spl-rays" />
      <div className="spl-streaks">
        {Array.from({ length: 9 }).map((_, i) => (
          <i key={i} style={{ left: `${6 + i * 11}%`, animationDelay: `${(i % 5) * 0.42}s` }} />
        ))}
      </div>

      {/* Live-flying aviator plane crossing the sky */}
      <div className="spl-vapor"><i /></div>
      <SplashPlane className="spl-plane" />

      <div className="spl-center">
        <div className="spl-badge">
          <span className="spl-diamond" />
          <div className="spl-logo">
            <span className="spl-c7">C7</span>
            <span className="spl-reels">
              {"WINNERS".split("").map((c, i) => (
                <span key={i} className="spl-reel" style={{ animationDelay: `${200 + i * 80}ms` }}>{c}</span>
              ))}
            </span>
          </div>
        </div>
        <div className="spl-tag">PLAY • WIN • WITHDRAW</div>
      </div>

      <div className="spl-foot">
        <div className="spl-bar">
          <div className="spl-bar-fill" style={{ width: `${pct}%` }} />
          <span className="spl-bar-pct">{pct}%</span>
        </div>
        <div className="spl-secure">🔒 Safe, secure &amp; instant UPI / crypto payments</div>
        <div className="spl-copy">© C7 WINNERS · 18+ · ALL RIGHTS RESERVED</div>
      </div>
    </div>
  );
}

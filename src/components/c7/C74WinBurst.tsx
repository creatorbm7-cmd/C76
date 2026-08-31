// C74WinBurst — celebration overlay for a wheel/spin win.
//
// Controlled: render with show=true and it plays a burst (gold explosion + coin
// rain + confetti + a light screen shake) and a short WebAudio chime, then calls
// onDone. Jackpots get a bigger, longer burst and a "🎉 JACKPOT!" banner.
// Presentation only — no state/economy logic. Honors prefers-reduced-motion.
import { useEffect, useRef } from "react";
import { num as fmt } from "@/lib/format";

interface Props {
  show: boolean;
  amount: number;
  jackpot?: boolean;
  onDone: () => void;
}

const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Short celebratory arpeggio via WebAudio — no audio asset needed.
function playChime(jackpot: boolean) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = jackpot ? [523, 659, 784, 1047, 1319] : [659, 784, 988];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.36);
    });
    window.setTimeout(() => ctx.close().catch(() => {}), 1600);
  } catch {
    /* audio best-effort */
  }
}

export default function C74WinBurst({ show, amount, jackpot = false, onDone }: Props) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!show) return;
    if (!reduceMotion()) playChime(jackpot);
    const ms = jackpot ? 2600 : 1700;
    const t = window.setTimeout(() => doneRef.current(), ms);
    return () => window.clearTimeout(t);
  }, [show, jackpot]);

  if (!show) return null;

  const coins = jackpot ? 26 : 14;
  const confetti = jackpot ? 52 : 0;
  // Festive multicolor palette — used only for the jackpot celebration burst.
  const CONF = ["#f5b423", "#ffcf4d", "#46e08a", "#28c8ff", "#7b2ff7", "#ff5a7a", "#ff9f1c", "#12d0b0", "#c86bff"];

  return (
    <div className={`c74b${jackpot ? " jack" : ""}`} role="status" aria-live="polite">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="c74b-flash" aria-hidden="true" />
      <div className="c74b-rays" aria-hidden="true" />

      {/* coin rain */}
      <div className="c74b-field" aria-hidden="true">
        {Array.from({ length: coins }).map((_, i) => (
          <span
            key={`c${i}`}
            className="c74b-coin"
            style={{ left: `${(i * 97) % 100}%`, animationDelay: `${(i % 7) * 0.11}s`, animationDuration: `${1.1 + ((i * 13) % 9) / 10}s` }}
          >
            🪙
          </span>
        ))}
        {Array.from({ length: confetti }).map((_, i) => (
          <span
            key={`f${i}`}
            className="c74b-conf"
            style={{
              left: `${(i * 53) % 100}%`,
              background: CONF[i % CONF.length],
              animationDelay: `${(i % 11) * 0.06}s`,
              animationDuration: `${1.2 + ((i * 7) % 8) / 10}s`,
            }}
          />
        ))}
      </div>

      <div className="c74b-card">
        {jackpot && <div className="c74b-jack">🎉 JACKPOT!</div>}
        <div className="c74b-amt">+{fmt(amount)} <span>C74</span></div>
        <div className="c74b-sub">{jackpot ? "Maximum prize hit!" : "Added to your balance"}</div>
      </div>
    </div>
  );
}

const CSS = `
.c74b { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; pointer-events: none;
  animation: c74b-shake 0.5s ease both; }
.c74b.jack { animation: c74b-shake-strong 0.7s ease both; }
.c74b-flash { position: absolute; inset: 0; background: radial-gradient(60% 50% at 50% 46%, rgba(255,225,140,0.5), transparent 70%);
  animation: c74b-flash 0.6s ease both; }
.c74b-rays { position: absolute; left: 50%; top: 46%; width: 160vmax; height: 160vmax; transform: translate(-50%,-50%);
  background: conic-gradient(from 0deg, rgba(255,220,130,0.16) 0 6deg, transparent 6deg 18deg);
  mix-blend-mode: screen; animation: c74b-turn 3.4s linear infinite; opacity: 0; animation-name: c74b-turn, c74b-fade; animation-duration: 3.4s, 1.8s; }
/* Jackpot = a vivid multicolour pinwheel + a second counter-rotating layer. */
.c74b.jack .c74b-rays { background: conic-gradient(from 0deg,
  rgba(246,201,69,0.22) 0 7deg, transparent 7deg 13deg,
  rgba(70,224,138,0.18) 13deg 20deg, transparent 20deg 26deg,
  rgba(40,200,255,0.18) 26deg 33deg, transparent 33deg 39deg,
  rgba(200,107,255,0.18) 39deg 46deg, transparent 46deg 52deg,
  rgba(255,90,122,0.18) 52deg 59deg, transparent 59deg 65deg,
  rgba(255,159,28,0.18) 65deg 72deg, transparent 72deg 78deg); }
.c74b.jack .c74b-flash { background:
  radial-gradient(60% 50% at 50% 46%, rgba(255,225,140,0.5), transparent 70%),
  radial-gradient(80% 62% at 50% 48%, rgba(120,90,255,0.22), transparent 72%),
  radial-gradient(70% 56% at 50% 44%, rgba(40,200,255,0.18), transparent 70%); }
.c74b-field { position: absolute; inset: 0; overflow: hidden; }
.c74b-coin { position: absolute; top: -8%; font-size: 26px; animation: c74b-fall linear both; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.4)); }
.c74b-conf { position: absolute; top: -6%; width: 9px; height: 14px; border-radius: 2px; animation: c74b-fall linear both; }
.c74b-card { position: relative; text-align: center; padding: 20px 30px; border-radius: 20px;
  background: radial-gradient(120% 100% at 50% 0%, rgba(60,30,8,0.86), rgba(20,10,4,0.92));
  border: 2px solid rgba(246,214,122,0.6); box-shadow: 0 20px 60px -14px rgba(0,0,0,0.8), 0 0 40px -6px rgba(246,201,69,0.6);
  animation: c74b-pop 0.5s cubic-bezier(0.2,1.4,0.5,1) both; }
.c74b-jack { font-size: 22px; font-weight: 900; letter-spacing: 1px; margin-bottom: 4px;
  background: linear-gradient(180deg,#fff2c0,#f6d67a 50%,#e8b44a); -webkit-background-clip: text; background-clip: text; color: transparent;
  text-shadow: 0 2px 10px rgba(246,201,69,0.4); }
.c74b-amt { font-size: 40px; font-weight: 900; color: #ffe6a2; line-height: 1; font-variant-numeric: tabular-nums; }
.c74b-amt span { font-size: 20px; color: #f6d67a; }
.c74b-sub { margin-top: 7px; font-size: 12px; font-weight: 700; color: rgba(220,232,223,0.75); }
@keyframes c74b-fall { to { transform: translateY(112vh) rotate(540deg); } }
@keyframes c74b-pop { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes c74b-flash { 0% { opacity: 0; } 25% { opacity: 1; } 100% { opacity: 0; } }
@keyframes c74b-fade { 0% { opacity: 0; } 20% { opacity: 1; } 100% { opacity: 0; } }
@keyframes c74b-turn { to { transform: translate(-50%,-50%) rotate(360deg); } }
@keyframes c74b-shake { 0%,100% { transform: translate(0,0); } 20% { transform: translate(-5px,3px); } 40% { transform: translate(5px,-3px); } 60% { transform: translate(-3px,2px); } 80% { transform: translate(3px,-2px); } }
@keyframes c74b-shake-strong { 0%,100% { transform: translate(0,0); } 15% { transform: translate(-8px,5px); } 30% { transform: translate(8px,-5px); } 45% { transform: translate(-6px,4px); } 60% { transform: translate(6px,-3px); } 80% { transform: translate(-3px,2px); } }
@media (prefers-reduced-motion: reduce) {
  .c74b, .c74b-flash, .c74b-rays, .c74b-coin, .c74b-conf, .c74b-card { animation: none !important; }
  .c74b-rays, .c74b-coin, .c74b-conf { display: none; }
}
`;

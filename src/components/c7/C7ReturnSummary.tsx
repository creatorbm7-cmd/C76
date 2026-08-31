/**
 * C7ReturnSummary — the "welcome back, here's what you earned" victory card
 * (Engagement System, Phase 3.2).
 *
 * Provider/2J games launch top-level (away from our app); on return, this reads the
 * launch marker written before departure and — once the fresh pulse has loaded —
 * shows a dismissible summary of the session's C74 gain (plus streak / rank-up).
 * Mounted once in the app shell. Resolves the marker exactly once per return, so it
 * never re-fires; nothing shows when there was no gain. Presentation only.
 */
import { useEffect, useRef, useState } from "react";
import { useC7Pulse } from "@/hooks/useC7Pulse";
import { rankTheme } from "@/lib/c7rank";
import { readLaunchMarker, clearLaunchMarker, summarizeReturn, type ReturnSummary } from "@/lib/c7launch";

const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");

export default function C7ReturnSummary() {
  const pulse = useC7Pulse();
  const rt = rankTheme(pulse.rank.idx);
  const [summary, setSummary] = useState<ReturnSummary | null>(null);
  const resolved = useRef(false);

  useEffect(() => {
    if (resolved.current) return;
    const marker = readLaunchMarker();
    if (!marker) { resolved.current = true; return; }   // nothing pending
    if (!pulse.ready) return;                            // wait for fresh data
    resolved.current = true;                             // resolve exactly once
    const s = summarizeReturn(marker, Date.now(), {
      ready: pulse.ready, energy: pulse.energy, streak: pulse.streak, rankIdx: pulse.rank.idx,
    });
    clearLaunchMarker();
    if (s) setSummary(s);
  }, [pulse.ready, pulse.energy, pulse.streak, pulse.rank.idx]);

  if (!summary) return null;

  return (
    <div className="c7rs-scrim" role="dialog" aria-label="Session summary" onClick={() => setSummary(null)}>
      <style>{CSS}</style>
      <div className="c7rs-card" onClick={(e) => e.stopPropagation()} style={{ boxShadow: `inset 0 2px 0 rgba(255,246,214,0.28), 0 26px 60px -20px rgba(0,0,0,0.85), 0 0 34px -8px ${rt.glow}` }}>
        <div className="c7rs-crown" aria-hidden="true">🎉</div>
        <div className="c7rs-title">Victory!</div>
        <div className="c7rs-sub">Back from {summary.game}</div>
        <div className="c7rs-earn"><span className="c7rs-earn-plus">+</span>{fmtInt(summary.earned)}<span className="c7rs-earn-unit">C74</span></div>
        {summary.rankUp && (
          <div className="c7rs-rankup" style={{ background: rt.chipBg, color: rt.chipText, boxShadow: `0 4px 16px -4px ${rt.glow}` }}>
            <span className="c7rs-rankup-star" aria-hidden="true">⭐</span> RANK UP — {rt.icon} {rt.title}
          </div>
        )}
        <div className="c7rs-rows">
          {summary.streakDelta > 0 && <div className="c7rs-row">🔥 <b>+{summary.streakDelta}</b> streak day{summary.streakDelta === 1 ? "" : "s"}</div>}
          <div className="c7rs-row">🟢 <b>{fmtInt(pulse.energy)}</b> C74 energy</div>
          {pulse.rankProgress.isMax
            ? <div className="c7rs-row">💎 <b>Max rank</b> reached</div>
            : <div className="c7rs-row">🎯 <b>{fmtInt(pulse.rankProgress.toNext ?? 0)}</b> C74 to {pulse.rankProgress.nextIcon} {pulse.rankProgress.nextName}</div>}
        </div>
        <button className="c7rs-cta" onClick={() => setSummary(null)}>Keep playing →</button>
      </div>
    </div>
  );
}

const CSS = `
.c7rs-scrim { position: fixed; inset: 0; z-index: 240; display: grid; place-items: center; padding: 24px;
  background: radial-gradient(120% 90% at 50% 20%, rgba(4,26,16,0.72), rgba(2,10,6,0.86)); backdrop-filter: blur(4px);
  animation: c7rs-fade .2s ease both; font-family: Inter, system-ui, sans-serif; }
.c7rs-card { position: relative; width: 100%; max-width: 320px; text-align: center; padding: 22px 20px 18px; border-radius: 22px;
  background: radial-gradient(120% 80% at 50% -10%, rgba(255,205,80,0.2), transparent 55%), linear-gradient(160deg, #12925c 0%, #0e7048 55%, #0a5836 100%);
  border: 1.5px solid rgba(246,201,69,0.55);
  box-shadow: inset 0 2px 0 rgba(255,246,214,0.28), 0 26px 60px -20px rgba(0,0,0,0.85), 0 0 30px -8px rgba(246,201,69,0.5);
  animation: c7rs-pop .28s cubic-bezier(.2,.9,.25,1.1) both; }
.c7rs-crown { font-size: 40px; line-height: 1; filter: drop-shadow(0 6px 16px rgba(246,201,69,0.5)); }
.c7rs-title { margin-top: 6px; font-size: 22px; font-weight: 900; letter-spacing: 0.4px;
  background: linear-gradient(180deg, #fff6d5, #ffe9a8 55%, #f6c945); -webkit-background-clip: text; background-clip: text; color: transparent;
  text-shadow: 0 1px 2px rgba(0,0,0,0.25); }
.c7rs-sub { font-size: 11.5px; font-weight: 700; color: rgba(220,246,236,0.72); margin-top: 1px; }
.c7rs-earn { margin: 12px 0 8px; font-size: 40px; font-weight: 900; color: #fff; line-height: 1; font-variant-numeric: tabular-nums;
  display: inline-flex; align-items: baseline; gap: 4px; text-shadow: 0 3px 10px rgba(0,0,0,0.4); }
.c7rs-earn-plus { color: #8bffc4; font-size: 30px; }
.c7rs-earn-unit { font-size: 14px; font-weight: 900; color: #ffe9a8; margin-left: 3px; }
.c7rs-rankup { display: inline-flex; align-items: center; gap: 5px; margin: 10px auto 2px; padding: 6px 14px; border-radius: 999px;
  font-size: 12px; font-weight: 900; letter-spacing: 0.3px; border: 1px solid rgba(255,255,255,0.4);
  animation: c7rs-rankup-in .34s cubic-bezier(.2,.9,.25,1.2) both; }
.c7rs-rankup-star { animation: c7rs-star 1.4s ease-in-out infinite; }
@keyframes c7rs-rankup-in { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: none; } }
@keyframes c7rs-star { 0%,100% { transform: rotate(-12deg) scale(1); } 50% { transform: rotate(12deg) scale(1.15); } }
.c7rs-rows { display: flex; flex-direction: column; gap: 6px; margin: 6px 0 14px; }
.c7rs-row { font-size: 12.5px; font-weight: 700; color: #eafff4; }
.c7rs-row b { color: #fff; }
.c7rs-cta { width: 100%; padding: 13px; border: none; border-radius: 14px; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 900; color: #052012;
  background: radial-gradient(120% 100% at 50% 12%, rgba(255,255,255,0.75), transparent 52%), linear-gradient(180deg, #9CFFCB, #39FF88 55%, #00A86B);
  box-shadow: 0 5px 0 #0a5e3a, inset 0 2px 0 rgba(255,255,255,0.75), 0 12px 24px -10px rgba(46,224,138,0.55); }
.c7rs-cta:active { transform: translateY(3px); box-shadow: 0 2px 0 #0a5e3a, inset 0 2px 0 rgba(255,255,255,0.75); }
@keyframes c7rs-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes c7rs-pop { from { opacity: 0; transform: translateY(14px) scale(0.92); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .c7rs-scrim, .c7rs-card, .c7rs-rankup, .c7rs-rankup-star { animation: none; } .c7rs-cta:active { transform: none; } }
`;

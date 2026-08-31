/**
 * C7Hud — the persistent C7 progression HUD (Engagement System, Phase 2).
 *
 * A floating collapsible pill (mounted once in the app shell): collapsed it shows
 * live C74 energy + current rank; tapping expands the full chip row (Energy, Rank,
 * Streak, VIP). It surfaces C7-progression stats — NOT the wallet balance the page
 * headers already show — so it complements rather than duplicates them. Reads the
 * shared useC7Pulse model, so it stays consistent with every other C7 surface by
 * construction. Sits above the bottom nav and never collides with page headers.
 *
 * Hidden until data has loaded (unauthenticated → no HUD) and on /admin & /login.
 * Pure presentation; reduced-motion safe. v1 chips = Energy · Rank · Streak · VIP;
 * mission / gullak / wheel / leaderboard chips arrive as their reads land.
 */
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useC7Pulse } from "@/hooks/useC7Pulse";
import { rankTheme } from "@/lib/c7rank";
import C7TierIcon from "@/components/c7/C7TierIcon";
import C7Icon from "@/components/c7/C7Icon";

const HIDDEN_PREFIXES = ["/admin", "/login", "/ig"];
const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");

export default function C7Hud() {
  const pulse = useC7Pulse();
  const rt = rankTheme(pulse.rank.idx);
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  if (!pulse.ready) return null;
  if (HIDDEN_PREFIXES.some((p) => loc.pathname.startsWith(p))) return null;

  return (
    <div className={`c7hud${open ? " is-open" : ""}`} data-testid="c7-hud">
      <style>{CSS}</style>

      {open && (
        <div className="c7hud-panel" role="dialog" aria-label="C7 progress">
          <div className="c7hud-grid">
            <div className="c7hud-chip">
              <span className="c7hud-chip-ic">⚡</span>
              <span className="c7hud-chip-v">{fmtInt(pulse.energy)}</span>
              <span className="c7hud-chip-l">C74 Energy</span>
            </div>
            <div className="c7hud-chip">
              <span className="c7hud-chip-ic"><C7TierIcon tier={pulse.rank.name} size={15} /></span>
              <span className="c7hud-chip-v">{pulse.rank.name}</span>
              <span className="c7hud-chip-l">Rank</span>
            </div>
            <div className="c7hud-chip">
              <span className="c7hud-chip-ic"><C7Icon name="fire" size={15} /></span>
              <span className="c7hud-chip-v">{pulse.streak}d</span>
              <span className="c7hud-chip-l">Streak</span>
            </div>
            <div className="c7hud-chip">
              <span className="c7hud-chip-ic"><C7Icon name="crown" size={15} /></span>
              <span className="c7hud-chip-v">×{pulse.vipMult.toFixed(2)}</span>
              <span className="c7hud-chip-l">VIP</span>
            </div>
          </div>

          {/* Rank progress — current → next, using pulse.rankProgress (derived, no new fetch) */}
          {pulse.rankProgress.isMax ? (
            <div className="c7hud-rank c7hud-rank-max" style={{ boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06), 0 0 16px -6px ${rt.glow}` }}>
              <span className="c7hud-rank-badge" style={{ background: rt.chipBg, color: rt.chipText }}><C7TierIcon tier={pulse.rank.name} size={12} /> {rt.flavor}</span>
              <C7TierIcon tier={pulse.rank.name} size={13} /> Max rank reached
            </div>
          ) : (
            <div className="c7hud-rank" style={{ boxShadow: `0 0 16px -6px ${rt.glow}` }}>
              <div className="c7hud-rank-ends">
                <span className="c7hud-rank-badge" style={{ background: rt.chipBg, color: rt.chipText }}><C7TierIcon tier={pulse.rank.name} size={12} /> {rt.flavor}</span>
                <span className="c7hud-rank-nx"><C7TierIcon tier={pulse.rankProgress.nextName} size={12} /> {pulse.rankProgress.nextName}</span>
              </div>
              <div
                className="c7hud-rank-track"
                role="progressbar"
                aria-label="Progress to next rank"
                aria-valuenow={Math.round(pulse.rankProgress.pct)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span className="c7hud-rank-fill" style={{ width: `${pulse.rankProgress.pct}%` }} />
              </div>
              <div className="c7hud-rank-to">{fmtInt(pulse.rankProgress.toNext ?? 0)} C74 to next rank</div>
            </div>
          )}
        </div>
      )}

      <button
        className="c7hud-pill"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="C7 stats"
      >
        <span className="c7hud-e"><span className="c7hud-dot" aria-hidden="true" />{fmtInt(pulse.energy)}</span>
        <span className="c7hud-rk" aria-hidden="true" style={{ filter: `drop-shadow(0 0 4px ${rt.glow})` }}><C7TierIcon tier={pulse.rank.name} size={16} /></span>
      </button>
    </div>
  );
}

const CSS = `
.c7hud { position: fixed; left: 12px; bottom: calc(84px + env(safe-area-inset-bottom, 0px)); z-index: 150;
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px; font-family: Inter, system-ui, sans-serif; }
.c7hud-pill { display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px 7px 10px; border-radius: 999px; cursor: pointer; font-family: inherit;
  font-weight: 900; font-size: 13px; color: #eafff4;
  background: linear-gradient(160deg, rgba(15,92,60,0.82), rgba(5,32,20,0.9)); border: 1px solid rgba(246,201,69,0.42);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  box-shadow: inset 0 1px 0 rgba(246,230,176,0.18), 0 10px 24px -10px rgba(0,0,0,0.7), 0 0 16px -6px rgba(246,201,69,0.4);
  transition: transform .12s ease, box-shadow .2s ease; }
.c7hud-pill:active { transform: scale(0.96); }
.c7hud-e { display: inline-flex; align-items: center; gap: 6px; font-variant-numeric: tabular-nums;
  background: linear-gradient(180deg, #fff6d5, #ffe9a8 55%, #f6c945); -webkit-background-clip: text; background-clip: text; color: transparent; }
.c7hud-dot { width: 8px; height: 8px; border-radius: 50%; background: radial-gradient(circle at 40% 30%, #b6ffdd, #2ee08a 60%, #0b7a3f); box-shadow: 0 0 8px rgba(46,224,138,0.8); }
.c7hud-rk { font-size: 15px; line-height: 1; }
.c7hud-panel { display: flex; flex-direction: column; gap: 9px; padding: 10px; border-radius: 16px;
  background: linear-gradient(160deg, rgba(11,74,51,0.92), rgba(4,26,16,0.95)); border: 1px solid rgba(246,201,69,0.4);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  box-shadow: inset 0 1px 0 rgba(246,230,176,0.16), 0 16px 36px -14px rgba(0,0,0,0.82), 0 0 22px -8px rgba(246,201,69,0.4);
  animation: c7hud-pop .16s cubic-bezier(.2,.8,.25,1) both; }
.c7hud-grid { display: grid; grid-template-columns: repeat(2, minmax(94px, 1fr)); gap: 8px; }
@keyframes c7hud-pop { from { opacity: 0; transform: translateY(8px) scale(0.96); } to { opacity: 1; transform: none; } }
.c7hud-chip { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; padding: 8px 10px; border-radius: 11px;
  background: radial-gradient(120% 100% at 0% 0%, rgba(47,226,154,0.1), transparent 55%), linear-gradient(160deg, rgba(15,92,60,0.6), rgba(5,32,20,0.7));
  border: 1px solid rgba(120,240,176,0.24); }
.c7hud-chip-ic { font-size: 15px; line-height: 1.1; }
.c7hud-chip-v { font-size: 14px; font-weight: 900; color: #f3ffe9; font-variant-numeric: tabular-nums; white-space: nowrap; }
.c7hud-chip-l { font-size: 9px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; color: rgba(196,240,214,0.72); }
.c7hud-rank { display: flex; flex-direction: column; gap: 5px; padding: 9px 10px; border-radius: 12px;
  background: radial-gradient(120% 100% at 0% 0%, rgba(246,201,69,0.12), transparent 55%), linear-gradient(160deg, rgba(15,92,60,0.6), rgba(5,32,20,0.72));
  border: 1px solid rgba(246,201,69,0.3); }
.c7hud-rank-ends { display: flex; align-items: center; justify-content: space-between; gap: 8px;
  font-size: 11px; font-weight: 900; color: #f3ffe9; white-space: nowrap; }
.c7hud-rank-badge { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 900;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.4); }
.c7hud-rank-nx { color: #ffe9a8; }
.c7hud-rank-track { position: relative; height: 7px; border-radius: 999px; overflow: hidden;
  background: rgba(3,16,10,0.66); box-shadow: inset 0 0 0 1px rgba(120,240,176,0.18); }
.c7hud-rank-fill { position: absolute; inset: 0 auto 0 0; border-radius: 999px;
  background: linear-gradient(90deg, #39FF88, #9CFFCB 40%, #ffe9a8 78%, #f6c945);
  box-shadow: 0 0 8px -1px rgba(246,201,69,0.6); transition: width .5s cubic-bezier(.2,.85,.25,1); }
.c7hud-rank-to { font-size: 9.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; color: rgba(196,240,214,0.78); }
.c7hud-rank-max { text-align: center; font-size: 11px; font-weight: 900; color: #ffe9a8; padding: 9px 10px; }
@media (prefers-reduced-motion: reduce) { .c7hud-panel { animation: none; } .c7hud-pill { transition: none; } .c7hud-rank-fill { transition: none; } }
`;

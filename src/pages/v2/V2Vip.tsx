// V2 VIP & Rewards — Module-4 "VIP & Rewards Experience".
//
// A premium /v3/profile/vip screen (/v2/vip redirects here): current-tier hero with an animated progress ring,
// cashback strip, daily-reward streak, C74 reward treasury, all-tiers ladder,
// and a leaderboard.
//
// STRICT scope: presentation-only UI scaffolding. NO real reward calculations,
// wallet/balance access, or database/backend calls here — every figure is a
// static preview placeholder. Honesty pass: the "Claim" actions no longer fire
// a no-op toast; they now route players to the REAL reward surfaces that already
// work (daily → /bonuses, C74 treasury → /c74). V1 untouched; lives only at /v2.

import { useNavigate } from "react-router-dom";
import { num } from "@/lib/format";
import { ArrowLeft, Crown, Sparkles, Gift, Trophy, Coins, Lock, Check, ChevronRight } from "lucide-react";
import C7Icon, { type C7IconName } from "@/components/c7/C7Icon";
import { useAppAssets } from "@/hooks/useAppAssets";

interface Tier { name: string; icon: C7IconName; threshold: number; cashback: number; color: string; }
const TIERS: Tier[] = [
  { name: "Bronze", icon: "medal", threshold: 0, cashback: 2, color: "#cd7f32" },
  { name: "Silver", icon: "medal", threshold: 5000, cashback: 4, color: "#cbd5e1" },
  { name: "Gold", icon: "medal", threshold: 25000, cashback: 6, color: "#2ed977" },
  { name: "Platinum", icon: "gem", threshold: 100000, cashback: 8, color: "#ffe9a8" },
  { name: "Diamond", icon: "gem", threshold: 500000, cashback: 12, color: "#ffe27a" },
];
// Static preview state (NOT live wagering).
const WAGERED = 42000;
const CUR_IDX = 2; // Gold
const C74 = [
  { tier: "Bronze", amt: "100", state: "got" },
  { tier: "Silver", amt: "500", state: "got" },
  { tier: "Gold", amt: "2,500", state: "ready" },
  { tier: "Platinum", amt: "10,000", state: "locked" },
  { tier: "Diamond", amt: "50,000", state: "locked" },
] as const;
const DAILY = [
  { d: 1, v: "10", s: "got" }, { d: 2, v: "20", s: "got" }, { d: 3, v: "50", s: "got" },
  { d: 4, v: "100", s: "ready" }, { d: 5, v: "150", s: "lock" }, { d: 6, v: "300", s: "lock" }, { d: 7, v: "777", s: "lock" },
] as const;
const LB = [
  { r: 1, name: "GoldenTiger", amt: "$48,200" },
  { r: 2, name: "EmeraldKing", amt: "$39,750" },
  { r: 3, name: "LuckyNova", amt: "$31,410" },
  { r: 4, name: "RoyalFlush", amt: "$27,880" },
  { r: 5, name: "DiamondAce", amt: "$22,140" },
];
const fmt = (n: number) => num(n, { max: 3 });

export default function V2Vip() {
  const nav = useNavigate();
  const art = useAppAssets(); // art-ready: bound v2.vip art with CSS fallback

  const cur = TIERS[CUR_IDX];
  const next = TIERS[CUR_IDX + 1];
  const pct = next ? Math.min(100, Math.round(((WAGERED - cur.threshold) / (next.threshold - cur.threshold)) * 100)) : 100;
  const C = 2 * Math.PI * 44; // ring circumference

  return (
    <div className="c7p-page v4">
      <style>{V4_CSS}</style>

      <header className="c7p-pg-bar v4-top">
        <button className="c7p-pg-back v4-back" onClick={() => nav("/v3/profile")} aria-label="Back to profile"><ArrowLeft size={18} /></button>
        <div className="v4-toptx"><Crown size={15} /> VIP &amp; Rewards</div>
        <span className="v4-badge"><Sparkles size={10} /> C7</span>
      </header>

      <main className="v4-main">
        {/* Current tier hero with progress ring */}
        <section className="c7p-card-gold v4-hero" style={art["v2.vip"] ? { backgroundImage: `linear-gradient(160deg, rgba(20,17,10,0.82), rgba(5,16,11,0.9)), url(${art["v2.vip"]})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
          <span className="v4-preview"><Sparkles size={9} /> Preview</span>
          <div className="v4-ringwrap">
            <svg viewBox="0 0 100 100" className="v4-ring">
              <circle cx="50" cy="50" r="44" className="v4-ring-bg" />
              <circle cx="50" cy="50" r="44" className="v4-ring-fg" style={{ strokeDasharray: `${(pct / 100) * C} ${C}` }} />
            </svg>
            <span className="v4-ring-badge" style={{ boxShadow: `0 0 22px -4px ${cur.color}` }}><C7Icon name={cur.icon} size={38} /></span>
          </div>
          <div className="v4-hero-name" style={{ color: cur.color }}>{cur.name} VIP</div>
          <div className="v4-hero-cb">{cur.cashback}% cashback · {fmt(WAGERED)} USDT wagered</div>
          {next && (
            <div className="v4-prog">
              <div className="c7p-progress v4-prog-bar"><span style={{ width: `${pct}%` }} /></div>
              <div className="v4-prog-tx">{pct}% to {next.name} · {fmt(next.threshold - WAGERED)} to go</div>
            </div>
          )}
        </section>

        {/* Daily rewards */}
        <section className="c7p-panel v4-card">
          <div className="c7p-sec v4-sec"><span className="c7p-sec-ic"><Gift size={14} /></span><span className="c7p-sec-t">Daily rewards</span><span className="c7p-sec-rule" /></div>
          <div className="v4-days">
            {DAILY.map((d) => (
              <div key={d.d} className={`c7p-glass v4-day v4-${d.s}`}>
                <span className="v4-day-d">Day {d.d}</span>
                <span className="v4-day-c"><C7Icon name="coin" size={16} /></span>
                <span className="v4-day-v">{d.v}</span>
                {d.s === "got" && <span className="v4-day-chk"><Check size={11} /></span>}
                {d.s === "lock" && <span className="v4-day-lk"><Lock size={10} /></span>}
              </div>
            ))}
          </div>
          <button className="c7p-btn-green v4-cta" onClick={() => nav("/bonuses")}>Claim daily reward <ChevronRight size={14} /></button>
        </section>

        {/* C74 reward treasury */}
        <section className="c7p-panel v4-card">
          <div className="c7p-sec v4-sec"><span className="c7p-sec-ic"><Coins size={14} /></span><span className="c7p-sec-t">C74 reward treasury</span><span className="c7p-sec-rule" /></div>
          <div className="v4-treasury">
            {C74.map((r) => (
              <div key={r.tier} className={`c7p-glass v4-tre v4-${r.state}`}>
                <span className="v4-tre-tier">{r.tier}</span>
                <span className="v4-tre-amt">+{r.amt}</span>
                <span className="v4-tre-c">C74</span>
                {r.state === "got" && <span className="v4-tre-tag done"><Check size={11} /> Claimed</span>}
                {r.state === "ready" && <button className="v4-tre-tag ready" onClick={() => nav("/c74/token")}>Claim</button>}
                {r.state === "locked" && <span className="v4-tre-tag lock"><Lock size={11} /> Locked</span>}
              </div>
            ))}
          </div>
        </section>

        {/* All tiers ladder */}
        <section className="c7p-panel v4-card">
          <div className="c7p-sec v4-sec"><span className="c7p-sec-ic"><Crown size={14} /></span><span className="c7p-sec-t">All tiers</span><span className="c7p-sec-rule" /></div>
          <div className="v4-tiers">
            {TIERS.map((t, i) => (
              <div key={t.name} className={`c7p-glass v4-tier${i === CUR_IDX ? " on" : ""}${i <= CUR_IDX ? " reached" : ""}`}>
                <span className="v4-tier-ic"><C7Icon name={t.icon} size={24} /></span>
                <div className="v4-tier-b"><b style={i === CUR_IDX ? { color: t.color } : undefined}>{t.name}</b><small>{fmt(t.threshold)} USDT · {t.cashback}% cashback</small></div>
                {i < CUR_IDX ? <Check size={15} className="v4-tier-chk" /> : i === CUR_IDX ? <span className="v4-tier-now">NOW</span> : <Lock size={13} className="v4-tier-lk" />}
              </div>
            ))}
          </div>
        </section>

        {/* Leaderboard */}
        <section className="c7p-panel v4-card">
          <div className="c7p-sec v4-sec"><span className="c7p-sec-ic"><Trophy size={14} /></span><span className="c7p-sec-t">Leaderboard</span><span className="c7p-sec-rule" /><span className="v4-sample">Sample</span></div>
          <div className="v4-lb">
            {LB.map((p) => (
              <div key={p.r} className="v4-lb-row">
                <span className={`v4-lb-r r${p.r <= 3 ? p.r : 0}`}>{p.r}</span>
                <span className="v4-lb-name">{p.name}</span>
                <span className="v4-lb-amt">{p.amt}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="v4-foot"><Sparkles size={11} /> V2 preview · sample tiers &amp; rewards · claim real rewards in the Rewards &amp; C74 hubs</footer>
      </main>
    </div>
  );
}

const V4_CSS = `
.v4 { position: relative; min-height: 100vh; color: #eafff4; font-family: Inter, system-ui, sans-serif; padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px)); }
.v4-top { justify-content: space-between; }
.v4-toptx { display: inline-flex; align-items: center; gap: 7px; font-size: 16px; font-weight: 900; letter-spacing: -0.2px; }
.v4-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 900; letter-spacing: 1px; padding: 5px 9px; border-radius: 999px; color: #04240f; background: linear-gradient(180deg, #2ee08a, #12a04f); }
.v4-main { position: relative; z-index: 1; max-width: 560px; margin: 0 auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 14px; }

/* Hero — c7p-card-gold base; layout + inner elements only (art bg via inline style) */
.v4-hero { position: relative; overflow: hidden; padding: 20px 18px; text-align: center; }
.v4-ringwrap { position: relative; width: 108px; height: 108px; margin: 0 auto 10px; }
.v4-ring { width: 108px; height: 108px; transform: rotate(-90deg); }
.v4-ring-bg { fill: none; stroke: rgba(255,255,255,0.08); stroke-width: 7; }
.v4-ring-fg { fill: none; stroke: #2ed977; stroke-width: 7; stroke-linecap: round; filter: drop-shadow(0 0 5px rgba(46,224,138,0.7)); transition: stroke-dasharray 1s cubic-bezier(.22,1,.36,1); }
.v4-ring-badge { position: absolute; inset: 16px; border-radius: 50%; display: grid; place-items: center; font-size: 38px;
  background: radial-gradient(circle at 40% 30%, rgba(255,255,255,0.14), transparent 60%), linear-gradient(160deg, #183a26, #0d210a); border: 1px solid rgba(246,201,69,0.4); }
.v4-hero-name { font-size: 20px; font-weight: 900; letter-spacing: -0.3px; }
.v4-hero-cb { font-size: 11px; font-weight: 700; color: rgba(224,250,172,0.7); margin-top: 2px; }
.v4-prog { margin-top: 14px; }
.v4-prog-bar { height: 9px; }
.v4-prog-bar span { transition: width 1s cubic-bezier(.22,1,.36,1); }
.v4-prog-tx { font-size: 10.5px; font-weight: 700; color: #b8f5d2; margin-top: 7px; }

/* Cards — c7p-panel base; padding only */
.v4-card { padding: 15px; }
.v4-card-h { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; color: #d3ffe8; margin-bottom: 12px; }
/* c7p-sec header used in-card — reset the top margin + tint the icon-chip glyph */
.v4-sec { margin: 0 0 13px; }
.v4-sec .c7p-sec-ic { color: #04240f; }
/* Preview chip on the hero (all VIP figures are mock — surfaced above the fold) */
.v4-preview { position: absolute; top: 12px; right: 12px; z-index: 2; display: inline-flex; align-items: center; gap: 4px;
  font-size: 9px; font-weight: 900; letter-spacing: 0.7px; text-transform: uppercase; color: #ffe9a8; padding: 4px 10px; border-radius: 999px;
  border: 1px solid rgba(246,201,69,0.45); background: rgba(6,20,13,0.55); box-shadow: inset 0 1px 0 rgba(255,244,214,0.14); }
.v4-all { display: inline-flex; align-items: center; gap: 1px; margin-left: auto; font-size: 10px; font-weight: 800; letter-spacing: 0; text-transform: none; color: rgba(224,250,172,0.6); }
.v4-sample { margin-left: auto; font-size: 9px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; color: rgba(224,250,172,0.62); padding: 2px 8px; border-radius: 999px; border: 1px solid rgba(246,201,69,0.28); background: rgba(246,201,69,0.08); }

.v4-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.v4-day { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 9px 2px; border-radius: 11px; }
.v4-day-d { font-size: 8px; font-weight: 800; color: rgba(255,255,255,0.5); }
.v4-day-c { font-size: 15px; } .v4-day-v { font-size: 10px; font-weight: 900; color: #d3ffe8; }
.v4-day.v4-got { opacity: 0.6; } .v4-day.v4-ready { border-color: #2ed977; box-shadow: 0 0 0 1px rgba(46,224,138,0.5), 0 0 14px -4px rgba(46,224,138,0.6); }
.v4-day-chk { position: absolute; top: 3px; right: 3px; color: #2ee08a; } .v4-day-lk { position: absolute; top: 4px; right: 4px; color: rgba(255,255,255,0.3); }

.v4-treasury { display: flex; flex-direction: column; gap: 8px; }
.v4-tre { display: flex; align-items: center; gap: 8px; padding: 11px 13px; border-radius: 13px; }
.v4-tre.v4-locked { opacity: 0.55; } .v4-tre.v4-ready { border-color: rgba(46,224,138,0.55); box-shadow: inset 0 0 0 1px rgba(46,224,138,0.3); }
.v4-tre-tier { font-size: 12.5px; font-weight: 800; }
.v4-tre-amt { margin-left: auto; font-size: 15px; font-weight: 900; color: #d3ffe8; font-variant-numeric: tabular-nums; }
.v4-tre-c { font-size: 9px; font-weight: 800; color: rgba(195,244,115,0.7); }
.v4-tre-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 900; padding: 6px 11px; border-radius: 9px; border: none; cursor: default; font-family: inherit; }
.v4-tre-tag.done { color: #2ee08a; background: rgba(107,245,163,0.15); }
.v4-tre-tag.lock { color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.05); }
.v4-tre-tag.ready { cursor: pointer; color: #052012; background: linear-gradient(180deg, #6ef0a8, #1fc078); box-shadow: 0 3px 0 #1c6e3e; }
.v4-tre-tag.ready:active { transform: translateY(2px); box-shadow: 0 1px 0 #1c6e3e; }

/* CTA — c7p-btn-green base; full width */
.v4-cta { width: 100%; margin-top: 12px; font-size: 13.5px; }

.v4-tiers { display: flex; flex-direction: column; gap: 7px; }
.v4-tier { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 13px; opacity: 0.6; }
.v4-tier.reached { opacity: 1; } .v4-tier.on { border-color: rgba(46,224,138,0.5); background: radial-gradient(120% 100% at 0% 0%, rgba(46,224,138,0.12), transparent 60%), rgba(0,0,0,0.25); box-shadow: inset 0 0 0 1px rgba(46,224,138,0.28); }
.v4-tier-ic { font-size: 22px; } .v4-tier-b { flex: 1; min-width: 0; } .v4-tier-b b { display: block; font-size: 13px; font-weight: 900; } .v4-tier-b small { font-size: 9.5px; color: rgba(255,255,255,0.45); font-weight: 700; }
.v4-tier-chk { color: #2ee08a; } .v4-tier-lk { color: rgba(255,255,255,0.3); }
.v4-tier-now { font-size: 9px; font-weight: 900; letter-spacing: 0.5px; color: #06180f; padding: 3px 8px; border-radius: 999px; background: linear-gradient(180deg, #6ef0a8, #1fc078); }

.v4-lb { display: flex; flex-direction: column; gap: 2px; }
.v4-lb-row { display: flex; align-items: center; gap: 11px; padding: 9px 2px; }
.v4-lb-row + .v4-lb-row { border-top: 1px solid rgba(255,255,255,0.055); }
.v4-lb-r { width: 24px; height: 24px; border-radius: 8px; display: grid; place-items: center; font-size: 11px; font-weight: 900; color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.06); flex-shrink: 0; }
.v4-lb-r.r1 { color: #052012; background: linear-gradient(180deg, #6ef0a8, #1fc078); } .v4-lb-r.r2 { color: #1a2230; background: linear-gradient(180deg, #e8eef5, #aab6c6); } .v4-lb-r.r3 { color: #2a1606; background: linear-gradient(180deg, #f0b27a, #cd7f32); }
.v4-lb-name { flex: 1; min-width: 0; font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v4-lb-amt { font-size: 13px; font-weight: 900; color: #86f5b8; font-variant-numeric: tabular-nums; }

.v4-foot { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 8px; font-size: 10px; font-weight: 600; color: rgba(224,250,172,0.45); text-align: center; }
.v4-toast { position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%); z-index: 30; display: inline-flex; align-items: center; gap: 7px; max-width: calc(100% - 32px);
  font-size: 12px; font-weight: 700; color: #ecfff3; padding: 11px 15px; border-radius: 12px; cursor: pointer;
  background: linear-gradient(160deg, #183a26, #0d210a); border: 1px solid rgba(246,201,69,0.4); box-shadow: 0 12px 28px -10px rgba(0,0,0,0.7); animation: v4-toast .3s ease both; }
@keyframes v4-toast { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
@media (prefers-reduced-motion: reduce) { .v4-prog-bar span, .v4-ring-fg, .v4-toast { transition: none; animation: none; } }
`;

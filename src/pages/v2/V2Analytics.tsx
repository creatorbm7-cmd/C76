// V2 Analytics — Module-7 "Premium Success States & Analytics".
//
// The final V2 presentation module: a luxury stats/analytics screen at
// /v3/profile/analytics (/v2/analytics redirects here) — summary tiles, a 14-day activity chart (CSS bars), an
// achievements grid, a VIP progress ring, session statistics, a reward summary,
// and a premium transaction timeline.
//
// Honesty pass: the four summary tiles and the session "Games played" figure are
// now LIVE (read-only via useProfileStats → rpc_user_stats; ZERO fallback when
// signed out). Decorative sections with no real source (14-day chart,
// achievements, VIP ring, rewards, timeline) are kept but clearly labelled
// "Sample". V1 untouched; lives only at /v2. Animations are transform/opacity +
// SVG-stroke (60fps) and honor prefers-reduced-motion.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usd as fmtUsd } from "@/lib/format";
import { ArrowLeft, TrendingUp, Coins, Trophy, Percent, Sparkles, Crown, Gamepad2, Zap, Clock, Gift, Star, Lock, Check } from "lucide-react";
import { useProfileStats } from "@/hooks/useProfileStats";
import C7Icon, { type C7IconName } from "@/components/c7/C7Icon";
import C7ErrorState from "@/components/c7/C7ErrorState";

const usd = (n: number) => fmtUsd(n, { locale: null, min: 2 });
const signedUsd = (n: number) => `${n >= 0 ? "+" : "−"}${usd(Math.abs(n))}`;

// Smoothly animates a displayed number toward `target` (easeOutCubic) — same
// pattern as V3Lobby's lobby balance. Honors reduced-motion.
function useCountUp(target: number, ms = 850) {
  const [val, setVal] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      from.current = target; setVal(target); return;
    }
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(start + (target - start) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return val;
}

// Renders a live figure with a count-up sweep, then formats the animated value.
function AnimatedValue({ value, format }: { value: number; format: (n: number) => string }) {
  return <>{format(useCountUp(value))}</>;
}

// 14-day activity (preview) — relative heights 0..1.
const ACTIVITY = [0.3, 0.5, 0.4, 0.7, 0.55, 0.9, 0.6, 0.45, 0.8, 0.65, 1, 0.5, 0.72, 0.85];
const ACHIEVEMENTS: { ic: C7IconName; l: string; got: boolean }[] = [
  { ic: "target", l: "First Bet", got: true },
  { ic: "fire", l: "Win Streak", got: true },
  { ic: "gem", l: "High Roller", got: true },
  { ic: "trophy", l: "Big Winner", got: false },
  { ic: "crown", l: "VIP Gold", got: false },
  { ic: "rocket", l: "Jackpot", got: false },
];
const SESSION = [
  { ic: <Gamepad2 size={14} />, k: "Games played", v: "128" },
  { ic: <Zap size={14} />, k: "Biggest win", v: "$410" },
  { ic: <Coins size={14} />, k: "Avg bet", v: "$3.60" },
  { ic: <Clock size={14} />, k: "Play time", v: "6h 12m" },
];
const REWARDS: { ic: C7IconName; k: string; v: string }[] = [
  { ic: "coin", k: "C74 earned", v: "3,120" },
  { ic: "gift", k: "Bonuses claimed", v: "8" },
  { ic: "coin", k: "Cashback", v: "$46.20" },
];
const TIMELINE: { ic: C7IconName | string; l: string; m: string; a: string; up: boolean }[] = [
  { ic: "trophy", l: "Big win — Golden Pharaoh", m: "2h ago", a: "+$410.00", up: true },
  { ic: "coin", l: "Deposit", m: "Crypto · confirmed", a: "+$250.00", up: true },
  { ic: "gift", l: "VIP reward", m: "Yesterday", a: "+120 C74", up: true },
  { ic: "🎲", l: "Bet — Rocket Crash", m: "Yesterday", a: "−$25.00", up: false },
  { ic: "wallet", l: "Withdrawal", m: "On-chain", a: "−$300.00", up: false },
];

export default function V2Analytics() {
  const nav = useNavigate();
  const C = 2 * Math.PI * 44;
  const vipPct = 62;
  // Live summary figures (read-only; ZERO fallback when signed out).
  const { stats, error: statsError, loading: statsLoading, refetch: refetchStats } = useProfileStats();
  const returnPct = stats.total_wagered > 0 ? (stats.total_won / stats.total_wagered) * 100 : null;
  const tiles = [
    { k: "Net profit", n: stats.net_profit, fmt: signedUsd, raw: undefined as string | undefined, icon: <TrendingUp size={16} />, c: stats.net_profit >= 0 ? "#2ee08a" : "#ff8089" },
    { k: "Total wagered", n: stats.total_wagered, fmt: usd, raw: undefined as string | undefined, icon: <Coins size={16} />, c: "#d3ffe8" },
    { k: "Total won", n: stats.total_won, fmt: usd, raw: undefined as string | undefined, icon: <Trophy size={16} />, c: "#2ee08a" },
    { k: "Return rate", n: returnPct ?? 0, fmt: (x: number) => `${Math.round(x)}%`, raw: returnPct == null ? "—" : undefined, icon: <Percent size={16} />, c: "#86f5b8" },
  ];
  const session = [
    { ic: <Gamepad2 size={14} />, k: "Games played", v: String(stats.bets_placed) },
    ...SESSION.slice(1),
  ];

  return (
    <div className="c7p-page v7">
      <style>{V7_CSS}</style>

      <header className="c7p-pg-bar v7-top">
        <button className="c7p-pg-back v7-back" onClick={() => nav("/v3/profile")} aria-label="Back to profile"><ArrowLeft size={18} /></button>
        <div className="v7-toptx c7p-gold-text">My Stats</div>
        <span className="v7-badge"><Sparkles size={10} /> C7</span>
      </header>

      <main className="v7-main">
        {statsError && !statsLoading && (
          <C7ErrorState
            title="Couldn't load your analytics"
            message="We couldn't reach your play statistics. Check your connection and try again."
            onRetry={() => refetchStats()}
          />
        )}
        {/* Summary tiles — live */}
        <div className="v7-tiles" style={statsError ? { display: "none" } : undefined}>
          {tiles.map((t, i) => (
            <div key={t.k} className="c7p-panel v7-tile" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="v7-tile-ic" style={{ color: t.c }}>{t.icon}</span>
              <div className="v7-tile-v" style={{ color: t.c }}>{t.raw ?? <AnimatedValue value={t.n} format={t.fmt} />}</div>
              <div className="v7-tile-k">{t.k}</div>
            </div>
          ))}
        </div>

        {/* Honesty divider: tiles above are live; sections below are illustrative */}
        <div className="v7-note-inline">
          {statsError
            ? <>The charts, achievements and history below are <b>sample previews</b> until those feeds are wired.</>
            : <>Your four figures above are live from your account. The charts, achievements and history below are <b>sample previews</b> until those feeds are wired.</>}
        </div>

        {/* Activity chart */}
        <section className="c7p-panel v7-card">
          <div className="c7p-sec v7-sec"><span className="c7p-sec-ic"><TrendingUp size={14} /></span><span className="c7p-sec-t">Activity · last 14 days</span><span className="c7p-sec-rule" /><em className="v7-count v7-sample">Sample</em></div>
          <div className="v7-chart">
            {ACTIVITY.map((h, i) => (
              <div key={i} className="v7-bar-wrap"><span className="v7-bar" style={{ height: `${Math.max(6, h * 100)}%`, animationDelay: `${i * 40}ms` }} /></div>
            ))}
          </div>
        </section>

        {/* Achievements */}
        <section className="c7p-panel v7-card">
          <div className="c7p-sec v7-sec"><span className="c7p-sec-ic"><Star size={14} /></span><span className="c7p-sec-t">Achievements</span><span className="c7p-sec-rule" /><em className="v7-count v7-sample">Sample</em></div>
          <div className="v7-ach">
            {ACHIEVEMENTS.map((a) => (
              <div key={a.l} className={`v7-ach-c${a.got ? " got" : ""}`}>
                <span className="v7-ach-ic"><C7Icon name={a.ic} size={26} /></span>
                <span className="v7-ach-l">{a.l}</span>
                <span className="v7-ach-s">{a.got ? <Check size={11} /> : <Lock size={10} />}</span>
              </div>
            ))}
          </div>
        </section>

        {/* VIP progress + session */}
        <div className="v7-row">
          <section className="c7p-panel v7-card v7-vip">
            <div className="c7p-sec v7-sec"><span className="c7p-sec-ic"><Crown size={14} /></span><span className="c7p-sec-t">VIP</span><span className="c7p-sec-rule" /><em className="v7-count v7-sample">Sample</em></div>
            <div className="v7-ringwrap">
              <svg viewBox="0 0 100 100" className="v7-ring">
                <circle cx="50" cy="50" r="44" className="v7-ring-bg" />
                <circle cx="50" cy="50" r="44" className="v7-ring-fg" style={{ strokeDasharray: `${(vipPct / 100) * C} ${C}` }} />
              </svg>
              <span className="v7-ring-badge"><C7Icon name="medal" size={32} /></span>
            </div>
            <div className="v7-vip-t">Gold · {vipPct}% to Platinum</div>
          </section>

          <section className="c7p-panel v7-card v7-sess">
            <div className="c7p-sec v7-sec"><span className="c7p-sec-ic"><Zap size={14} /></span><span className="c7p-sec-t">Session</span><span className="c7p-sec-rule" /><em className="v7-count v7-sample">Sample</em></div>
            <div className="v7-sesslist">
              {session.map((s) => (
                <div key={s.k} className="v7-sess-r"><span className="v7-sess-ic">{s.ic}</span><span className="v7-sess-k">{s.k}</span><b>{s.v}</b></div>
              ))}
            </div>
          </section>
        </div>

        {/* Rewards summary */}
        <section className="c7p-panel v7-card">
          <div className="c7p-sec v7-sec"><span className="c7p-sec-ic"><Gift size={14} /></span><span className="c7p-sec-t">Rewards summary</span><span className="c7p-sec-rule" /><em className="v7-count v7-sample">Sample</em></div>
          <div className="v7-rewards">
            {REWARDS.map((r) => (
              <div key={r.k} className="v7-rew"><span className="v7-rew-ic"><C7Icon name={r.ic} size={22} /></span><b>{r.v}</b><small>{r.k}</small></div>
            ))}
          </div>
        </section>

        {/* Transaction timeline */}
        <section className="c7p-panel v7-card">
          <div className="c7p-sec v7-sec"><span className="c7p-sec-ic"><Clock size={14} /></span><span className="c7p-sec-t">Recent activity</span><span className="c7p-sec-rule" /><em className="v7-count v7-sample">Sample</em></div>
          <div className="v7-tl">
            {TIMELINE.map((t, i) => (
              <div key={i} className="v7-tl-r">
                <span className="v7-tl-ic">{t.ic === "🎲" ? t.ic : <C7Icon name={t.ic as C7IconName} size={17} />}</span>
                <div className="v7-tl-b"><span className="v7-tl-l">{t.l}</span><span className="v7-tl-m">{t.m}</span></div>
                <span className="v7-tl-a" style={{ color: t.up ? "#2ee08a" : "#ff8089" }}>{t.a}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="v7-foot"><Sparkles size={11} /> Summary tiles are live from your account · sections marked "Sample" are illustrative · play responsibly</footer>
      </main>
    </div>
  );
}

const V7_CSS = `
.v7 { position: relative; min-height: 100vh; color: #eafff4; font-family: Inter, system-ui, sans-serif; padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px)); }
.v7-top { justify-content: space-between; }
.v7-toptx { font-size: 16px; font-weight: 900; }
.v7-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 900; letter-spacing: 1px; padding: 5px 9px; border-radius: 999px; color: #04240f; background: linear-gradient(180deg, #2ee08a, #12a04f); }
.v7-main { position: relative; z-index: 1; max-width: 560px; margin: 0 auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 13px; }

/* Summary tiles — c7p-panel base; layout + rise animation only */
.v7-tiles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.v7-tile { padding: 13px 14px; animation: v7-rise .5s cubic-bezier(.2,.8,.2,1) both; }
@keyframes v7-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.v7-tile-v { font-size: 21px; font-weight: 900; letter-spacing: -0.5px; margin-top: 4px; font-variant-numeric: tabular-nums; } .v7-tile-k { font-size: 10px; color: rgba(230,246,236,0.55); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 1px; }

/* Cards — c7p-panel base; padding only */
.v7-card { padding: 15px; }
.v7-card-h { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; color: #d3ffe8; margin-bottom: 12px; }
/* c7p-sec header used in-card — reset the top margin + tint the icon-chip glyph */
.v7-sec { margin: 0 0 12px; }
.v7-sec .c7p-sec-ic { color: #04240f; }
.v7-sec .v7-count { margin-left: 0; }
.v7-count { font-style: normal; margin-left: auto; font-size: 10px; font-weight: 900; color: #06180f; background: linear-gradient(180deg,#6ef0a8,#1fc078); padding: 1px 7px; border-radius: 999px; }
.v7-sample { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-weight: 800; letter-spacing: 0.5px; }
.v7-note-inline { font-size: 11px; line-height: 1.5; color: rgba(224,250,172,0.7); background: rgba(255,255,255,0.04); border: 1px solid rgba(246,201,69,0.2); border-radius: 12px; padding: 10px 12px; }
.v7-note-inline b { color: #d3ffe8; }

.v7-chart { display: flex; align-items: flex-end; gap: 5px; height: 110px; padding-top: 6px; }
.v7-bar-wrap { flex: 1; height: 100%; display: flex; align-items: flex-end; }
.v7-bar { width: 100%; border-radius: 5px 5px 2px 2px; background: linear-gradient(180deg, #2ee08a, #0f7a4a); box-shadow: 0 0 8px -2px rgba(46,224,138,0.6); transform-origin: bottom; animation: v7-grow .6s cubic-bezier(.22,1,.36,1) both; }
@keyframes v7-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }

.v7-ach { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
.v7-ach-c { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 4px; border-radius: 14px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); opacity: 0.55; }
.v7-ach-c.got { opacity: 1; border-color: rgba(46,224,138,0.4); background: radial-gradient(120% 80% at 50% 0%, rgba(46,224,138,0.14), transparent 60%), rgba(0,0,0,0.25); box-shadow: inset 0 0 0 1px rgba(46,224,138,0.25); }
.v7-ach-ic { font-size: 26px; filter: grayscale(0.7); } .v7-ach-c.got .v7-ach-ic { filter: none; }
.v7-ach-l { font-size: 10px; font-weight: 800; text-align: center; }
.v7-ach-s { position: absolute; top: 5px; right: 5px; color: #2ee08a; } .v7-ach-c:not(.got) .v7-ach-s { color: rgba(255,255,255,0.3); }

.v7-row { display: grid; grid-template-columns: 1fr 1.15fr; gap: 12px; }
.v7-vip { display: flex; flex-direction: column; align-items: center; }
.v7-ringwrap { position: relative; width: 96px; height: 96px; margin: 2px auto 8px; }
.v7-ring { width: 96px; height: 96px; transform: rotate(-90deg); }
.v7-ring-bg { fill: none; stroke: rgba(255,255,255,0.08); stroke-width: 7; }
.v7-ring-fg { fill: none; stroke: #2ed977; stroke-width: 7; stroke-linecap: round; filter: drop-shadow(0 0 5px rgba(46,224,138,0.7)); transition: stroke-dasharray 1s cubic-bezier(.22,1,.36,1); }
.v7-ring-badge { position: absolute; inset: 15px; border-radius: 50%; display: grid; place-items: center; font-size: 32px; background: radial-gradient(circle at 40% 30%, rgba(255,255,255,0.12), transparent 60%), linear-gradient(160deg, #183a26, #0d210a); border: 1px solid rgba(246,201,69,0.4); }
.v7-vip-t { font-size: 11px; font-weight: 800; color: #d3ffe8; text-align: center; }
.v7-sesslist { display: flex; flex-direction: column; gap: 2px; }
.v7-sess-r { display: flex; align-items: center; gap: 9px; padding: 8px 2px; font-size: 12.5px; font-weight: 700; color: rgba(255,255,255,0.75); }
.v7-sess-r + .v7-sess-r { border-top: 1px solid rgba(255,255,255,0.055); }
.v7-sess-ic { color: #d3ffe8; } .v7-sess-r b { margin-left: auto; color: #fff; font-variant-numeric: tabular-nums; }

.v7-rewards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
.v7-rew { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 13px 4px; border-radius: 14px; text-align: center; background: rgba(0,0,0,0.25); border: 1px solid rgba(246,201,69,0.24); }
.v7-rew-ic { font-size: 22px; } .v7-rew b { font-size: 16px; font-weight: 900; color: #d3ffe8; } .v7-rew small { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.3px; }

.v7-tl { display: flex; flex-direction: column; gap: 2px; }
.v7-tl-r { display: flex; align-items: center; gap: 11px; padding: 10px 2px; }
.v7-tl-r + .v7-tl-r { border-top: 1px solid rgba(255,255,255,0.055); }
.v7-tl-ic { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; font-size: 17px; flex-shrink: 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(246,201,69,0.24); box-shadow: 0 0 0 1px rgba(46,224,138,0.16); }
.v7-tl-b { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.v7-tl-l { font-size: 12.5px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .v7-tl-m { font-size: 10px; color: rgba(255,255,255,0.45); font-weight: 700; }
.v7-tl-a { font-size: 13px; font-weight: 900; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.v7-foot { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 8px; font-size: 10px; font-weight: 600; color: rgba(224,250,172,0.45); text-align: center; }

@media (prefers-reduced-motion: reduce) { .v7-tile, .v7-bar, .v7-ring-fg { animation: none !important; transition: none !important; } }
`;

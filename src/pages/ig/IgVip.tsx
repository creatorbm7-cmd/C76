// IgVip (/ig/vip) — Instagram-light VIP page. Canonical route for ONE thing:
// tier benefits + VIP progression. It reads the player's REAL current tier
// (useC74 → summary.tier) and REAL lifetime wagered (useProfileStats →
// total_wagered) to place them on the program's tier ladder and show progress
// to the next tier. Reward mechanics that live on other routes (daily rewards,
// leaderboard) are NOT duplicated here — they appear only as compact cards that
// link to their canonical route. No fabricated per-user figures.
import { useNavigate } from "react-router-dom";
import { num } from "@/lib/format";
import { ArrowLeft, Crown, Gift, Trophy, Check, Lock, ChevronRight, Percent, ArrowUpRight, Headphones } from "lucide-react";
import { useC74 } from "@/hooks/useC74";
import { useProfileStats } from "@/hooks/useProfileStats";
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";

// The program's published VIP ladder (tier structure — not per-user data).
interface Tier { name: string; emoji: string; threshold: number; cashback: number; color: string; }
const TIERS: Tier[] = [
  { name: "Bronze", emoji: "🥉", threshold: 0, cashback: 2, color: "#a56a35" },
  { name: "Silver", emoji: "🥈", threshold: 5000, cashback: 4, color: "#8e8e8e" },
  { name: "Gold", emoji: "🥇", threshold: 25000, cashback: 6, color: "#0a8f5b" },
  { name: "Platinum", emoji: "💎", threshold: 100000, cashback: 8, color: "#b98c12" },
  { name: "Diamond", emoji: "💠", threshold: 500000, cashback: 12, color: "#b98c12" },
];
const fmt = (n: number) => num(n, { max: 3 });

export default function IgVip() {
  const nav = useNavigate();
  const { summary } = useC74();
  const { stats } = useProfileStats();

  // Real lifetime wagered drives progression; real tier name (if present) wins.
  const wagered = Number(stats?.total_wagered ?? 0);
  const byWager = TIERS.reduce((acc, t, i) => (wagered >= t.threshold ? i : acc), 0);
  const byName = summary?.tier ? TIERS.findIndex((t) => t.name.toLowerCase() === String(summary.tier).toLowerCase()) : -1;
  const curIdx = byName >= 0 ? byName : byWager;
  const cur = TIERS[curIdx];
  const next = TIERS[curIdx + 1];
  const pct = next ? Math.max(0, Math.min(100, Math.round(((wagered - cur.threshold) / (next.threshold - cur.threshold)) * 100))) : 100;
  const C = 2 * Math.PI * 44;

  const PERKS: { ic: JSX.Element; l: string; v: string }[] = [
    { ic: <Percent size={15} />, l: "Cashback", v: `${cur.cashback}% on net losses` },
    { ic: <ArrowUpRight size={15} />, l: "Withdrawals", v: curIdx >= 3 ? "Priority processing" : "Standard limits" },
    { ic: <Headphones size={15} />, l: "Support", v: curIdx >= 2 ? "Dedicated host" : "Standard support" },
  ];

  return (
    <div className="ig igvip">
      <style>{CSS}</style>

      <header className="ig-top">
        <button className="igvip-back" onClick={() => (window.history.length > 1 ? nav(-1) : nav("/ig/profile"))} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="ig-ttl">VIP</span>
        <span style={{ width: 22 }} />
      </header>

      <main className="ig-main igvip-main">
        <div className="ige-hero"><img src="/images/v3/emblems/vip.png" alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} /></div>

        {/* Current tier + real progression */}
        <section className="igvip-hero">
          <div className="igvip-ringwrap">
            <svg viewBox="0 0 100 100" className="igvip-ring">
              <circle cx="50" cy="50" r="44" className="igvip-ring-bg" />
              <circle cx="50" cy="50" r="44" className="igvip-ring-fg" style={{ strokeDasharray: `${(pct / 100) * C} ${C}` }} />
            </svg>
            <span className="igvip-ring-badge">{cur.emoji}</span>
          </div>
          <div className="igvip-hero-name" style={{ color: cur.color }}>{cur.name} VIP</div>
          <div className="igvip-hero-cb">{fmt(wagered)} USDT wagered lifetime</div>
          {next ? (
            <div className="igvip-prog">
              <div className="igvip-prog-bar"><span style={{ width: `${pct}%` }} /></div>
              <div className="igvip-prog-tx">{pct}% to {next.name} · {fmt(Math.max(0, next.threshold - wagered))} USDT to go</div>
            </div>
          ) : (
            <div className="igvip-prog"><div className="igvip-prog-tx">Top tier reached — thank you 👑</div></div>
          )}
        </section>

        {/* Your benefits — VIP's own content */}
        <section className="igvip-card">
          <div className="igvip-sec"><span className="igvip-sec-ic"><Crown size={14} /></span><span className="igvip-sec-t">Your {cur.name} benefits</span></div>
          <div className="igvip-perks">
            {PERKS.map((p) => (
              <div key={p.l} className="igvip-perk">
                <span className="igvip-perk-ic">{p.ic}</span>
                <div className="igvip-perk-tx"><b>{p.l}</b><small>{p.v}</small></div>
              </div>
            ))}
          </div>
        </section>

        {/* All tiers ladder — the program structure, real current tier highlighted */}
        <section className="igvip-card">
          <div className="igvip-sec"><span className="igvip-sec-ic"><Crown size={14} /></span><span className="igvip-sec-t">All tiers</span></div>
          <div className="igvip-tiers">
            {TIERS.map((t, i) => (
              <div key={t.name} className={`igvip-tier${i === curIdx ? " on" : ""}${i <= curIdx ? " reached" : ""}`}>
                <span className={`ig-emblem igvip-tier-ic${i <= curIdx ? " ig-emblem--gold" : ""}`}>{t.emoji}</span>
                <div className="igvip-tier-b"><b style={i === curIdx ? { color: t.color } : undefined}>{t.name}</b><small>{fmt(t.threshold)} USDT wagered · {t.cashback}% cashback</small></div>
                {i < curIdx ? <Check size={15} className="igvip-tier-chk" /> : i === curIdx ? <span className="igvip-tier-now">NOW</span> : <Lock size={13} className="igvip-tier-lk" />}
              </div>
            ))}
          </div>
        </section>

        {/* Shared surfaces — compact links to their canonical routes (no duplication) */}
        <section className="igvip-links">
          <button className="igvip-link" onClick={() => nav("/ig/rewards")}>
            <span className="igvip-link-ic" style={{ color: "var(--gold)" }}><Gift size={18} /></span>
            <span className="igvip-link-tx"><b>Rewards &amp; daily bonuses</b><small>Claim your daily reward and offers</small></span>
            <ChevronRight size={18} className="igvip-link-arr" />
          </button>
          <button className="igvip-link" onClick={() => nav("/ig/leaderboard")}>
            <span className="igvip-link-ic" style={{ color: "var(--grn)" }}><Trophy size={18} /></span>
            <span className="igvip-link-tx"><b>Leaderboard</b><small>See where you rank this week</small></span>
            <ChevronRight size={18} className="igvip-link-arr" />
          </button>
        </section>

        <IgSocialNotice variant="line" />
      </main>

      <IgTabBar active="profile" />
    </div>
  );
}

const CSS = `
.ig { --ink:#f0fff7; --mut:#83b39c; --faint:#5f8b76; --grn:#2ee08a; --grn2:#0e7a4a;
  --gold:#f0c94a; --gold-lite:#fff4cf; --gold-deep:#c68a2e; --antique:#e8c877; --loss:#ff6b7d;
  --line:rgba(240,201,74,0.22); --hair:rgba(255,255,255,0.06);
  min-height:100vh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif;
  padding-bottom:calc(78px + env(safe-area-inset-bottom,0px)); -webkit-tap-highlight-color:transparent;
  background:
    radial-gradient(90% 40% at 50% -6%, rgba(240,201,74,.10), transparent 55%),
    radial-gradient(120% 65% at 50% -4%, rgba(33,86,60,.82), transparent 58%),
    linear-gradient(180deg,#0c3320 0%, #06170e 46%, #030b07 100%); background-attachment:fixed; }
.ig * { box-sizing:border-box; }
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:54px; padding:0 8px 0 12px;
  background:linear-gradient(180deg, rgba(7,24,15,.95), rgba(7,24,15,.5)); -webkit-backdrop-filter:blur(16px); backdrop-filter:blur(16px);
  border-bottom:1px solid var(--line); box-shadow:0 1px 0 rgba(240,201,74,.16), 0 10px 26px -18px rgba(0,0,0,.8); }
.igvip-back { background:none; border:none; color:#cdead9; cursor:pointer; display:grid; place-items:center; width:38px; height:38px; border-radius:11px; transition:background .18s, transform .12s; }
.igvip-back:hover { background:rgba(255,255,255,.05); } .igvip-back:active { transform:scale(.9); }
.ig-ttl { font-size:18px; font-weight:800; letter-spacing:.01em; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.ig-main { max-width:560px; margin:0 auto; }
.igvip-main { padding:18px 16px; display:flex; flex-direction:column; gap:15px; }
.ige-hero img { filter:saturate(1.12) contrast(1.06) brightness(1.03) drop-shadow(0 6px 14px rgba(0,0,0,0.5)) drop-shadow(0 0 18px rgba(240,201,74,0.45)); }

/* Hero — luxury gold cabinet + cinematic emerald ring */
.igvip-hero { position:relative; overflow:hidden; padding:24px 18px 20px; text-align:center; border-radius:20px;
  background:radial-gradient(120% 120% at 50% 0%, #fff6d5 0%, #f0c94a 54%, #c68a2e 100%); border:1px solid rgba(255,255,255,0.4);
  box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.72), inset 0 -4px 10px rgba(120,74,20,0.3), 0 0 28px -8px rgba(240,201,74,0.6), 0 20px 42px -20px rgba(0,0,0,0.85); }
.igvip-hero::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(105deg, transparent 42%, rgba(255,255,255,0.5) 50%, transparent 58%); transform:translateX(-150%); animation:igvipSweep 6.5s ease-in-out infinite; }
.igvip-ringwrap { position:relative; width:128px; height:128px; margin:0 auto 14px; z-index:1; }
.igvip-ring { width:128px; height:128px; transform:rotate(-90deg); }
.igvip-ring-bg { fill:none; stroke:rgba(90,61,0,0.22); stroke-width:6; }
.igvip-ring-fg { fill:none; stroke:#0b5a37; stroke-width:6; stroke-linecap:round; filter:drop-shadow(0 0 5px rgba(14,122,74,0.65)); transition:stroke-dasharray 1s cubic-bezier(.22,1,.36,1); }
.igvip-ring-badge { position:absolute; inset:15px; border-radius:50%; display:grid; place-items:center; font-size:46px; line-height:1;
  background:radial-gradient(130% 130% at 50% 18%, #22714a, #05150d 76%); border:1px solid rgba(255,255,255,0.45);
  box-shadow:inset 0 2px 10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(246,230,176,0.32), 0 4px 12px rgba(60,40,0,0.4); }
.igvip-hero-name { position:relative; z-index:1; font-size:21px; font-weight:900; letter-spacing:-0.4px; text-shadow:0 1px 0 rgba(255,255,255,0.3); }
.igvip-hero-cb { position:relative; z-index:1; font-size:11px; font-weight:800; color:#5a3d00; margin-top:3px; font-variant-numeric:tabular-nums; }
.igvip-prog { position:relative; z-index:1; margin-top:16px; }
.igvip-prog-bar { height:10px; border-radius:999px; background:rgba(90,61,0,0.24); overflow:hidden; box-shadow:inset 0 1px 3px rgba(60,40,0,0.35); }
.igvip-prog-bar span { display:block; height:100%; border-radius:999px; background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0b6a40); box-shadow:0 0 8px rgba(46,224,138,0.5); transition:width 1s cubic-bezier(.22,1,.36,1); }
.igvip-prog-tx { font-size:10.5px; font-weight:800; color:#5a3d00; margin-top:8px; }

/* Deep gold-framed emerald cards */
.igvip-card { position:relative; border-radius:20px; padding:16px; border:1px solid transparent;
  background:linear-gradient(165deg, rgba(19,60,40,.92), rgba(6,20,13,.96));
  box-shadow:inset 0 0 0 1.3px rgba(240,201,74,.4), inset 0 1.5px 0 rgba(255,255,255,.13), inset 0 0 34px rgba(46,224,138,.07), 0 26px 50px -28px rgba(0,0,0,.9); }
.igvip-sec { display:flex; align-items:center; gap:9px; margin:0 0 14px; }
.igvip-sec-ic { width:28px; height:28px; border-radius:9px; display:grid; place-items:center; color:#ffe9a8;
  background:radial-gradient(120% 120% at 50% 18%, #1a5738, #0b2418); border:1px solid var(--line); box-shadow:0 0 12px -3px rgba(240,201,74,0.4); }
.igvip-sec-t { font-size:13px; font-weight:800; color:var(--ink); letter-spacing:-.005em; }

.igvip-perks { display:flex; flex-direction:column; gap:9px; }
.igvip-perk { display:flex; align-items:center; gap:12px; padding:12px 13px; border-radius:13px; background:rgba(4,16,10,.5); border:1px solid var(--hair); }
.igvip-perk-ic { width:36px; height:36px; border-radius:11px; display:grid; place-items:center; color:var(--grn); flex-shrink:0;
  background:radial-gradient(120% 120% at 50% 15%, rgba(46,224,138,.17), rgba(6,24,15,.45)); border:1px solid var(--line); box-shadow:0 0 12px -4px rgba(46,224,138,.5); }
.igvip-perk-tx b { display:block; font-size:13px; font-weight:800; color:var(--ink); } .igvip-perk-tx small { font-size:11.5px; color:var(--mut); font-weight:600; }

.igvip-tiers { display:flex; flex-direction:column; gap:8px; }
.igvip-tier { position:relative; display:flex; align-items:center; gap:12px; padding:11px 13px; border-radius:13px; background:rgba(4,16,10,.5); border:1px solid var(--hair); opacity:0.6; transition:opacity .2s; }
.igvip-tier.reached { opacity:1; }
.igvip-tier.on { border-color:transparent; background:radial-gradient(130% 130% at 0% 0%, rgba(240,201,74,0.14), transparent 58%), rgba(18,73,47,0.6);
  box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.5), inset 0 1px 0 rgba(255,255,255,0.14), 0 0 20px -8px rgba(240,201,74,0.5); }
.igvip-tier-ic { width:40px; height:40px; font-size:20px; display:grid; place-items:center; flex-shrink:0; } .igvip-tier-b { flex:1; min-width:0; }
.igvip-tier-b b { display:block; font-size:13.5px; font-weight:900; color:var(--ink); } .igvip-tier-b small { font-size:9.5px; color:var(--mut); font-weight:700; }
.igvip-tier-chk { color:var(--grn); flex-shrink:0; } .igvip-tier-lk { color:var(--faint); flex-shrink:0; }
.igvip-tier-now { font-size:9px; font-weight:900; letter-spacing:0.6px; color:#3a2708; padding:4px 9px; border-radius:999px; flex-shrink:0;
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); box-shadow:inset 0 1px 0 rgba(255,255,255,0.7), 0 0 12px -3px rgba(240,201,74,0.6); }

.igvip-links { display:flex; flex-direction:column; gap:11px; }
.igvip-link { display:flex; align-items:center; gap:13px; width:100%; text-align:left; padding:14px 15px; border-radius:18px; cursor:pointer; font-family:inherit; color:var(--ink); border:1px solid transparent;
  background:linear-gradient(165deg, rgba(19,60,40,.9), rgba(6,20,13,.95));
  box-shadow:inset 0 0 0 1.2px rgba(240,201,74,.34), inset 0 1.4px 0 rgba(255,255,255,.11), 0 22px 44px -24px rgba(0,0,0,.88); transition:transform .12s, background .16s; }
.igvip-link:hover { background:linear-gradient(165deg, rgba(22,66,44,.92), rgba(7,22,14,.96)); }
.igvip-link:active { transform:translateY(1px); }
.igvip-link-ic { width:42px; height:42px; border-radius:12px; display:grid; place-items:center; flex-shrink:0;
  background:radial-gradient(120% 120% at 50% 15%, rgba(46,224,138,.16), rgba(6,24,15,.45)); border:1px solid var(--line); box-shadow:0 0 12px -4px rgba(46,224,138,.5); }
.igvip-link-tx { flex:1; min-width:0; } .igvip-link-tx b { display:block; font-size:14px; font-weight:800; color:var(--ink); } .igvip-link-tx small { font-size:11.5px; color:var(--mut); font-weight:600; }
.igvip-link-arr { color:var(--gold); flex-shrink:0; }

@keyframes igvipSweep { 0%,72% { transform:translateX(-150%); } 88%,100% { transform:translateX(150%); } }
@media (prefers-reduced-motion: reduce) {
  .igvip-prog-bar span, .igvip-ring-fg, .igvip-link, .igvip-back, .igvip-tier { transition:none !important; }
  .igvip-hero::after { animation:none !important; transform:translateX(-150%) !important; }
  .igvip-link:active, .igvip-back:active { transform:none; }
}
`;

// IgAnalytics (/ig/analytics) — Instagram-light "My Stats" screen. Canonical
// route for real user analytics ONLY. Every figure comes from useProfileStats
// (rpc_user_stats) — net profit, total wagered, total won, return rate, games
// played, deposited, withdrawn. No fabricated charts/achievements/timelines:
// where a richer feed isn't wired yet we show an honest Coming-Soon card, and
// chronological history / rewards / VIP live on their own routes (linked, not
// duplicated). Count-up honors prefers-reduced-motion.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usd as fmtUsd } from "@/lib/format";
import { ArrowLeft, TrendingUp, Coins, Trophy, Percent, Gamepad2, ArrowDownToLine, ArrowUpFromLine, LineChart, Clock, Gift, Crown, ChevronRight } from "lucide-react";
import { useProfileStats } from "@/hooks/useProfileStats";
import C7ErrorState from "@/components/c7/C7ErrorState";
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";

const usd = (n: number) => fmtUsd(n, { locale: null, min: 2 });
const signedUsd = (n: number) => `${n >= 0 ? "+" : "−"}${usd(Math.abs(n))}`;
const intFmt = (n: number) => Math.round(n).toLocaleString("en-US");

function useCountUp(target: number, ms = 850) {
  const [val, setVal] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { from.current = target; setVal(target); return; }
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(start + (target - start) * e);
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return val;
}
function AnimatedValue({ value, format }: { value: number; format: (n: number) => string }) {
  return <>{format(useCountUp(value))}</>;
}

export default function IgAnalytics() {
  const nav = useNavigate();
  const { stats, error: statsError, loading: statsLoading, refetch: refetchStats } = useProfileStats();
  const returnPct = stats.total_wagered > 0 ? (stats.total_won / stats.total_wagered) * 100 : null;

  // Every tile below is a live figure from rpc_user_stats — zero fabrication.
  const tiles = [
    { k: "Net profit", n: stats.net_profit, fmt: signedUsd, raw: undefined as string | undefined, icon: <TrendingUp size={16} />, c: stats.net_profit >= 0 ? "var(--grn)" : "var(--loss)" },
    { k: "Total wagered", n: stats.total_wagered, fmt: usd, raw: undefined as string | undefined, icon: <Coins size={16} />, c: "var(--ink)" },
    { k: "Total won", n: stats.total_won, fmt: usd, raw: undefined as string | undefined, icon: <Trophy size={16} />, c: "var(--grn)" },
    { k: "Return rate", n: returnPct ?? 0, fmt: (x: number) => `${Math.round(x)}%`, raw: returnPct == null ? "—" : undefined, icon: <Percent size={16} />, c: "var(--gold)" },
  ];
  const rows = [
    { ic: <Gamepad2 size={15} />, k: "Games played", v: intFmt(stats.bets_placed ?? 0) },
    { ic: <ArrowDownToLine size={15} />, k: "Total deposited", v: usd(stats.total_deposited ?? 0) },
    { ic: <ArrowUpFromLine size={15} />, k: "Total withdrawn", v: usd(stats.total_withdrawn ?? 0) },
  ];
  const links = [
    { ic: <Clock size={18} />, l: "Activity", d: "Your full transaction history", to: "/ig/activity", c: "var(--grn)" },
    { ic: <Gift size={18} />, l: "Rewards", d: "Bonuses, cashback & C74", to: "/ig/rewards", c: "var(--gold)" },
    { ic: <Crown size={18} />, l: "VIP", d: "Tier benefits & progression", to: "/ig/vip", c: "var(--gold)" },
  ];

  return (
    <div className="ig igan">
      <style>{CSS}</style>

      <header className="ig-top">
        <button className="igan-back" onClick={() => (window.history.length > 1 ? nav(-1) : nav("/ig/profile"))} aria-label="Back to profile"><ArrowLeft size={22} /></button>
        <span className="ig-ttl">My Stats</span>
        <span style={{ width: 22 }} />
      </header>

      <main className="ig-main igan-main">
        {statsLoading ? (
          <div className="igan-skel">
            <div className="igan-skel-tiles">
              <span className="igan-sk" /><span className="igan-sk" /><span className="igan-sk" /><span className="igan-sk" />
            </div>
            <span className="igan-sk igan-sk-card" />
            <span className="igan-sk igan-sk-soon" />
          </div>
        ) : statsError ? (
          <C7ErrorState
            title="Couldn't load your analytics"
            message="We couldn't reach your play statistics. Check your connection and try again."
            onRetry={() => refetchStats()}
          />
        ) : (
          <>
            <div className="ige-hero">
              <img src="/images/v3/emblems/analytics.png" alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              <span className="igct-sub">Your play, at a glance</span>
            </div>
            {/* Live summary tiles */}
            <div className="igan-tiles">
              {tiles.map((t, i) => (
                <div key={t.k} className="igan-tile" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="igan-tile-ic" style={{ color: t.c }}>{t.icon}</span>
                  <div className="igan-tile-v" style={{ color: t.c }}>{t.raw ?? <AnimatedValue value={t.n} format={t.fmt} />}</div>
                  <div className="igan-tile-k">{t.k}</div>
                </div>
              ))}
            </div>

            {/* More live figures */}
            <section className="igan-card igan-rows">
              {rows.map((r, i) => (
                <div key={r.k} className="igan-r" style={{ borderTop: i ? "1px solid var(--hair)" : "none" }}>
                  <span className="igan-r-ic">{r.ic}</span>
                  <span className="igan-r-k">{r.k}</span>
                  <b className="igan-r-v">{r.v}</b>
                </div>
              ))}
            </section>

            {/* Honest empty state — no fabricated charts */}
            <section className="igan-soon">
              <span className="igan-soon-ic"><LineChart size={22} /></span>
              <div className="igan-soon-t">Trends &amp; charts coming soon</div>
              <div className="igan-soon-d">Daily performance graphs and streak insights are on the way. Your live totals above update in real time.</div>
            </section>

            {/* Canonical routes for related data — linked, not duplicated */}
            <section className="igan-links">
              {links.map((l) => (
                <button key={l.l} className="igan-link" onClick={() => nav(l.to)}>
                  <span className="igan-link-ic" style={{ color: l.c }}>{l.ic}</span>
                  <span className="igan-link-tx"><b>{l.l}</b><small>{l.d}</small></span>
                  <ChevronRight size={18} className="igan-link-arr" />
                </button>
              ))}
            </section>

            <footer className="igan-foot">All figures are live from your account · play responsibly</footer>
          </>
        )}

        <IgSocialNotice variant="line" />
      </main>

      <IgTabBar active="profile" />
    </div>
  );
}

const CSS = `
.ig { --bg:#07130d; --card:#103524; --card2:#12492f; --line:rgba(240,201,74,0.24); --hair:rgba(255,255,255,0.06); --ink:#f0fff7; --mut:#93c3aa; --faint:#5f8b76; --grn:#2ee08a; --grn2:#0e7a4a; --gold:#f0c94a; --gold-lite:#fff4cf; --gold-deep:#c68a2e; --antique:#e8c877; --loss:#ff6b7d;
  min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif; padding-bottom:calc(76px + env(safe-area-inset-bottom));
  background: radial-gradient(90% 40% at 50% -6%, rgba(240,201,74,0.08), transparent 55%), radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%), linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%); background-attachment:fixed; }
.ig * { box-sizing:border-box; }
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:54px; padding:0 12px;
  background:linear-gradient(180deg, rgba(9,32,20,0.95), rgba(9,32,20,0.55)); -webkit-backdrop-filter:blur(16px); backdrop-filter:blur(16px); border-bottom:1px solid var(--line); box-shadow:0 1px 0 rgba(240,201,74,0.16); }
.igan-back { background:none; border:none; color:#cdead9; cursor:pointer; display:grid; place-items:center; width:38px; height:38px; border-radius:11px; }
.ig-ttl { font-size:18px; font-weight:800; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.ig-main { max-width:560px; margin:0 auto; }
.igan-main { padding:16px 12px; display:flex; flex-direction:column; gap:13px; }
.ige-hero { text-align:center; display:flex; flex-direction:column; align-items:center; gap:6px; }
.ige-hero img { max-width:110px; height:auto; opacity:0.92; filter:drop-shadow(0 8px 18px rgba(0,0,0,0.5)); }
.igct-sub { font-size:12px; font-weight:700; color:var(--mut); }

/* Skeleton */
.igan-skel { display:flex; flex-direction:column; gap:13px; }
.igan-skel-tiles { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
.igan-sk { display:block; border-radius:18px; border:1px solid var(--hair);
  background:linear-gradient(100deg, rgba(18,63,41,0.7) 30%, rgba(46,224,138,0.1) 50%, rgba(240,201,74,0.08) 58%, rgba(18,63,41,0.7) 72%); background-size:220% 100%; animation:igan-sh 1.4s ease-in-out infinite; }
.igan-skel-tiles .igan-sk { height:84px; } .igan-sk-card { height:150px; } .igan-sk-soon { height:120px; }
@keyframes igan-sh { 0%{background-position:180% 0;} 100%{background-position:-80% 0;} }

.igan-tiles { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
.igan-tile { position:relative; overflow:hidden; padding:14px 15px; border-radius:18px;
  background:linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96)); border:1px solid transparent;
  box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.36), inset 0 1.5px 0 rgba(255,255,255,0.11), inset 0 0 22px rgba(46,224,138,0.07), 0 20px 40px -28px rgba(0,0,0,0.9); animation:igan-rise .5s cubic-bezier(.2,.8,.2,1) both; }
@keyframes igan-rise { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
.igan-tile-ic { display:inline-flex; }
.igan-tile-v { font-size:22px; font-weight:900; letter-spacing:-0.5px; margin-top:4px; font-variant-numeric:tabular-nums; }
.igan-tile-k { font-size:10px; color:var(--mut); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-top:1px; }

.igan-card { padding:6px 16px; border-radius:20px; background:linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96)); border:1px solid transparent;
  box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.38), inset 0 1.5px 0 rgba(255,255,255,0.12), inset 0 0 30px rgba(46,224,138,0.06), 0 24px 48px -28px rgba(0,0,0,0.9); }
.igan-rows { padding:2px 16px; }
.igan-r { display:flex; align-items:center; gap:11px; padding:13px 0; }
.igan-r-ic { width:36px; height:36px; border-radius:11px; display:grid; place-items:center; color:var(--antique); background:radial-gradient(120% 120% at 50% 18%, #1a5738, #0b2418); border:1px solid var(--line); box-shadow:inset 0 1px 0 rgba(246,230,176,0.12); flex-shrink:0; }
.igan-r-k { font-size:13px; font-weight:700; color:var(--mut); }
.igan-r-v { margin-left:auto; font-size:15px; font-weight:900; color:var(--ink); font-variant-numeric:tabular-nums; }

.igan-soon { position:relative; overflow:hidden; text-align:center; padding:26px 20px; border-radius:20px;
  background:radial-gradient(130% 120% at 50% 0%, rgba(46,224,138,0.12), transparent 60%), linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96));
  border:1px dashed rgba(240,201,74,0.4); box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.1), 0 24px 48px -28px rgba(0,0,0,0.9); }
.igan-soon-ic { display:inline-grid; place-items:center; width:48px; height:48px; border-radius:15px; color:#3a2708;
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.7), 0 0 18px -4px rgba(240,201,74,0.6); margin-bottom:10px; }
.igan-soon-t { font-size:14px; font-weight:800; color:#f3ffe9; }
.igan-soon-d { font-size:12px; color:var(--mut); font-weight:600; line-height:1.45; margin-top:5px; max-width:320px; margin-left:auto; margin-right:auto; }

.igan-links { display:flex; flex-direction:column; gap:10px; }
.igan-link { display:flex; align-items:center; gap:12px; width:100%; text-align:left; padding:14px 15px; border-radius:18px; cursor:pointer; font-family:inherit;
  background:linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96)); border:1px solid transparent;
  box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.3), inset 0 1.5px 0 rgba(255,255,255,0.1), 0 20px 40px -28px rgba(0,0,0,0.9); color:var(--ink); }
.igan-link:active { transform:translateY(1px); }
.igan-link-ic { width:42px; height:42px; border-radius:13px; display:grid; place-items:center;
  background:radial-gradient(120% 120% at 50% 18%, #1a5738, #0b2418); border:1px solid var(--line); box-shadow:inset 0 1px 0 rgba(246,230,176,0.12); flex-shrink:0; }
.igan-link-tx { flex:1; min-width:0; } .igan-link-tx b { display:block; font-size:14px; font-weight:800; color:#f3ffe9; } .igan-link-tx small { font-size:11.5px; color:var(--mut); font-weight:600; }
.igan-link-arr { color:var(--mut); flex-shrink:0; }

.igan-foot { display:flex; align-items:center; justify-content:center; gap:6px; margin-top:6px; font-size:10.5px; font-weight:600; color:var(--mut); text-align:center; }

@media (prefers-reduced-motion: reduce) { .igan-tile, .igan-sk { animation:none !important; } .igan-link:active { transform:none; } }
`;

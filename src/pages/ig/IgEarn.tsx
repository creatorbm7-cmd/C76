// IgEarn (/ig/earn) — "Play & Earn C74" hub. A pure INDEX of the ways to earn
// C74 in the app: each opportunity is a compact, config-backed card that routes
// to its own canonical surface (Games, Reels, Missions, Mining, Invite, Daily).
// It does NOT duplicate the Token Center — its job is "how to earn + your
// earning breakdown", nothing else.
//
// Presentation only. Reads the existing display-only useC74() hook (server RPCs
// get_c74_summary / get_c74_history) verbatim — no earn logic, no wheel/mining/
// mission RPC, no wallet or money-rail code lives here. Every number shown is a
// real server value; where there's no data yet we show an honest empty state.
// Reduced-motion safe.
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gamepad2, Sparkles, Target, Pickaxe, Users, Gift, ChevronRight, Loader2 } from "lucide-react";
import { useC74, c74TierIcon } from "@/hooks/useC74";
import { num as fmt } from "@/lib/format";
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";
import C7ErrorState from "@/components/c7/C7ErrorState";

// Human labels for the earn-source keys the server reports in earned_by_source.
const SOURCE_LABEL: Record<string, string> = {
  wager: "Playing games", bet: "Playing games", play: "Playing games",
  deposit: "Deposits", daily: "Daily reward", referral: "Invites",
  wheel: "Fortune wheel", spin: "Fortune wheel", mission: "Missions",
  mining: "Mining", bonus: "Bonuses",
};
const srcLabel = (k: string) => SOURCE_LABEL[k.toLowerCase()] ?? (k.charAt(0).toUpperCase() + k.slice(1));

export default function IgEarn() {
  const nav = useNavigate();
  const { summary, history, loading, error, reload } = useC74();

  const bal = summary?.balance ?? 0;
  const earned = summary?.total_earned ?? 0;
  const tier = summary?.tier ?? "Spark";
  const cfg = summary?.config;

  // Earning opportunities — each links to its own canonical route. Sub-labels are
  // drawn from the real C74 config where one exists (no invented rates).
  const WAYS = useMemo(() => [
    { key: "play", ic: <Gamepad2 size={20} />, title: "Play games",
      sub: cfg ? `+${fmt(cfg.wager_earn_per_usdt)} C74 per 1 USDT wagered` : "Earn C74 as you play", to: "/ig/explore" },
    { key: "daily", ic: <Gift size={20} />, title: "Daily reward",
      sub: cfg?.daily_reward ? `+${fmt(cfg.daily_reward)} C74 every day` : "Claim your daily C74", to: "/ig/rewards" },
    { key: "wheel", ic: <Sparkles size={20} />, title: "Fortune wheel",
      sub: cfg?.wheel_cost ? `Spin to win C74` : "Spin the wheel", to: "/ig/reels/wheel" },
    { key: "missions", ic: <Target size={20} />, title: "Missions",
      sub: "Complete missions for C74", to: "/ig/missions" },
    { key: "mining", ic: <Pickaxe size={20} />, title: "Mining",
      sub: "Mine C74 over time", to: "/ig/mining" },
    { key: "invite", ic: <Users size={20} />, title: "Invite friends",
      sub: cfg?.referral_reward ? `+${fmt(cfg.referral_reward)} C74 per referral` : "Earn C74 for every invite", to: "/ig/invite" },
  ], [cfg]);

  // Real "where your C74 came from" breakdown (only sources with a positive amount).
  const breakdown = useMemo(() => {
    const src = summary?.earned_by_source ?? {};
    return Object.entries(src)
      .filter(([, v]) => Number(v) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]));
  }, [summary]);

  const recentEarns = useMemo(() => history.filter((h) => h.direction === "earn").slice(0, 6), [history]);

  return (
    <div className="ig ige">
      <style>{CSS}</style>

      <header className="ig-top">
        <button className="ige-back" onClick={() => (window.history.length > 1 ? nav(-1) : nav("/ig"))} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="ig-ttl">Play &amp; Earn C74</span>
        <span style={{ width: 22 }} />
      </header>

      <main className="ig-main ige-main">
        {error && !summary ? (
          <C7ErrorState onRetry={reload} />
        ) : loading && !summary ? (
          <div className="ige-load"><Loader2 className="ige-spin" size={26} /></div>
        ) : (
          <>
            {/* Balance hero → Token Center */}
            <button className="ige-hero ig-rich" onClick={() => nav("/ig/c74")}>
              <div className="ige-hero-l">
                <span className="ige-hero-k">YOUR C74 BALANCE</span>
                <span className="ige-hero-v ig-sheen">{fmt(bal)}<em>C74</em></span>
                <span className="ige-hero-sub">Earned so far · {fmt(earned)} C74</span>
              </div>
              <span className="ige-tier" aria-label={`Tier ${tier}`}>
                <span className="ige-tier-ic">{c74TierIcon(tier)}</span>
                <span className="ige-tier-t">{tier}</span>
              </span>
            </button>

            {/* Ways to earn — index of canonical routes */}
            <h2 className="ige-h">Ways to earn</h2>
            <div className="ige-ways">
              {WAYS.map((w) => (
                <button key={w.key} className="ige-way" onClick={() => nav(w.to)}>
                  <span className="ige-way-ic">{w.ic}</span>
                  <span className="ige-way-tx"><b>{w.title}</b><small>{w.sub}</small></span>
                  <ChevronRight size={18} className="ige-way-cr" />
                </button>
              ))}
            </div>

            {/* Where your C74 came from — real breakdown or honest empty */}
            <h2 className="ige-h">Your earning breakdown</h2>
            {breakdown.length ? (
              <div className="ige-bd">
                {breakdown.map(([k, v]) => {
                  const pct = earned > 0 ? Math.min(100, Math.round((Number(v) / earned) * 100)) : 0;
                  return (
                    <div key={k} className="ige-bd-row">
                      <div className="ige-bd-top"><span>{srcLabel(k)}</span><b>{fmt(Number(v))} C74</b></div>
                      <div className="ige-bd-bar"><span style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="ige-empty">
                <Sparkles size={22} />
                <p>No C74 earned yet. Pick a way above and start earning.</p>
              </div>
            )}

            {/* Recent earnings — only if the server returned any */}
            {recentEarns.length > 0 && (
              <>
                <h2 className="ige-h">Recent earnings</h2>
                <div className="ige-hist">
                  {recentEarns.map((e) => (
                    <div key={e.id} className="ige-hist-row">
                      <span className="ige-hist-l">{e.label}</span>
                      <b className="ige-hist-a">+{fmt(e.amount)}</b>
                    </div>
                  ))}
                </div>
              </>
            )}

            <p className="ige-foot">C74 is an in-app rewards balance. Earn it by playing — no purchase required.</p>
            <IgSocialNotice variant="line" />
          </>
        )}
      </main>

      <IgTabBar active="c74" />
    </div>
  );
}

const CSS = `
.ig.ige { --ink:#f0fff7; --mut:#93c3aa; --grn:#2ee08a; --gold:#f0c94a; --gold-lite:#fff4cf; --gold-deep:#c68a2e;
  --hair:rgba(240,201,74,0.26); min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif; padding-bottom:84px;
  background:
    radial-gradient(120% 60% at 50% -10%, rgba(240,201,74,0.10) 0%, transparent 46%),
    radial-gradient(120% 70% at 50% -6%, rgba(40,150,100,0.5) 0%, transparent 56%),
    linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%);
  background-attachment:fixed; }
.ig.ige * { box-sizing:border-box; }
.ige .ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; gap:10px;
  height:54px; padding:0 12px; background:linear-gradient(180deg, rgba(9,32,20,0.92), rgba(9,32,20,0.6));
  -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); border-bottom:1px solid var(--hair); }
.ige-back { background:none; border:none; color:#d6ffe9; display:grid; place-items:center; cursor:pointer; padding:6px; }
.ige-main { max-width:560px; margin:0 auto; padding:14px 12px; }

.ige-load { display:grid; place-items:center; padding:60px 0; }
.ige-spin { animation:ige-rot 1s linear infinite; color:var(--gold); }
@keyframes ige-rot { to { transform:rotate(360deg); } }

/* Balance hero */
.ige-hero { width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px; text-align:left;
  border:none; cursor:pointer; padding:18px; border-radius:18px; color:var(--ink); }
.ige-hero-l { display:flex; flex-direction:column; gap:3px; }
.ige-hero-k { font-size:11px; font-weight:800; letter-spacing:.6px; color:var(--mut); }
.ige-hero-v { font-size:32px; font-weight:900; letter-spacing:-1px; font-variant-numeric:tabular-nums; line-height:1; }
.ige-hero-v em { font-style:normal; font-size:15px; margin-left:6px; -webkit-text-fill-color:initial; color:var(--gold); }
.ige-hero-sub { font-size:12px; color:var(--mut); margin-top:5px; }
.ige-tier { display:flex; flex-direction:column; align-items:center; gap:3px; flex:0 0 auto; }
.ige-tier-ic { font-size:30px; filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5)); }
.ige-tier-t { font-size:11px; font-weight:800; color:var(--gold-lite); }

.ige-h { font-size:14px; font-weight:800; color:#eafff4; margin:22px 4px 10px; }

/* Ways to earn */
.ige-ways { display:flex; flex-direction:column; gap:9px; }
.ige-way { display:flex; align-items:center; gap:12px; width:100%; text-align:left; cursor:pointer;
  background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--hair);
  border-radius:14px; padding:13px 14px; color:var(--ink);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 12px 30px -20px rgba(0,0,0,0.8); }
.ige-way-ic { flex:0 0 auto; width:40px; height:40px; border-radius:12px; display:grid; place-items:center; color:#0a2410;
  background:radial-gradient(120% 120% at 50% 20%, #fff3c8, #f0c94a 55%, #c68a2e); box-shadow:inset 0 1px 0 rgba(255,255,255,0.6); }
.ige-way-tx { display:flex; flex-direction:column; line-height:1.25; flex:1; min-width:0; }
.ige-way-tx b { font-size:14px; font-weight:800; color:#f3ffe9; }
.ige-way-tx small { font-size:12px; color:var(--mut); }
.ige-way-cr { color:var(--mut); flex:0 0 auto; }

/* Breakdown */
.ige-bd { display:flex; flex-direction:column; gap:12px; background:linear-gradient(180deg, rgba(18,63,41,0.88), rgba(8,30,19,0.92));
  border:1px solid var(--hair); border-radius:14px; padding:15px; }
.ige-bd-top { display:flex; align-items:center; justify-content:space-between; font-size:13px; margin-bottom:6px; }
.ige-bd-top span { color:var(--mut); } .ige-bd-top b { color:#f3ffe9; font-weight:800; font-variant-numeric:tabular-nums; }
.ige-bd-bar { height:7px; border-radius:999px; background:rgba(255,255,255,0.06); overflow:hidden; }
.ige-bd-bar span { display:block; height:100%; border-radius:999px;
  background:linear-gradient(90deg, #0e7a4a, #2ee08a 60%, #9ffcc4); }

/* Empty */
.ige-empty { display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center; padding:26px 18px;
  border:1px dashed var(--hair); border-radius:14px; color:var(--mut); }
.ige-empty svg { color:var(--gold); }
.ige-empty p { margin:0; font-size:13px; }

/* History */
.ige-hist { display:flex; flex-direction:column; background:linear-gradient(180deg, rgba(18,63,41,0.88), rgba(8,30,19,0.92));
  border:1px solid var(--hair); border-radius:14px; overflow:hidden; }
.ige-hist-row { display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-bottom:1px solid rgba(255,255,255,0.05); }
.ige-hist-row:last-child { border-bottom:none; }
.ige-hist-l { font-size:13px; color:#dbeee2; }
.ige-hist-a { font-size:13px; font-weight:800; color:var(--grn); font-variant-numeric:tabular-nums; }

.ige-foot { font-size:11.5px; color:var(--mut); text-align:center; margin:18px 6px 4px; line-height:1.5; }

@media (prefers-reduced-motion:reduce){ .ige-spin { animation:none !important; } }
`;

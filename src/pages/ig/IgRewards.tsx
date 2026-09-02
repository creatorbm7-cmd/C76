// IgRewards (/ig/rewards) — Instagram-light Rewards hub. A landing hub that
// gathers the reward surfaces under one tab; each row links to its canonical
// nested route (/v3/rewards/wheel·events, /bonuses, /missions, /gullak,
// /v3/profile/vip, /agent, /top). Reskinned from the dark V2Rewards to the
// IG-light system — presentation only. Live badges/counts come ONLY from the
// existing real-data hooks (useC74 balance · useBonusClaims active count).
import { useNavigate } from "react-router-dom";
import { num as fmt } from "@/lib/format";
import { useC74 } from "@/hooks/useC74";
import { useBonusClaims } from "@/hooks/useBonusClaims";
import { ArrowLeft, ChevronRight, Sparkles } from "lucide-react";
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";
import { RewardCrest } from "@/components/ig/IgCrests";

interface Row { emoji: string; l: string; d: string; to: string; badge?: string | null; }

export default function IgRewards() {
  const nav = useNavigate();
  const { summary } = useC74();
  const { active } = useBonusClaims();

  const c74Bal = summary?.balance;
  const activeBonuses = active.length;

  const ROWS: Row[] = [
    { emoji: "🪙", l: "C74 Reels", d: "Spin the reels for C74", to: "/ig/reels/wheel" },
    { emoji: "🎁", l: "Promotions", d: "Offers, bonuses & rewards", to: "/ig/bonuses", badge: activeBonuses > 0 ? `${activeBonuses} active` : null },
    { emoji: "🎯", l: "Missions", d: "Complete goals · earn C74", to: "/ig/missions" },
    { emoji: "📊", l: "Contribution Score", d: "See how your activity earns C74", to: "/ig/contribution" },
    { emoji: "🏦", l: "Bank Game", d: "Save C74 & grow your streak", to: "/ig/bank" },
    { emoji: "👑", l: "VIP Club", d: "Perks, tiers & rakeback", to: "/ig/vip" },
    { emoji: "📅", l: "Events", d: "Limited-time tournaments", to: "/ig/events" },
    { emoji: "🤝", l: "Refer & Earn", d: "Invite friends · earn C74", to: "/ig/invite" },
    { emoji: "🏆", l: "Leaderboard", d: "See where you rank this week", to: "/ig/leaderboard" },
  ];

  return (
    <div className="ig igrw">
      <style>{CSS}</style>

      <header className="ig-top">
        <button className="igrw-back" onClick={() => (window.history.length > 1 ? nav(-1) : nav("/ig"))} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="ig-ttl">Rewards</span>
        <span style={{ width: 22 }} />
      </header>

      <main className="ig-main igrw-main">
        <div className="ige-hero"><img src="/icons/v2/rewards.png" alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} /></div>
        {/* Daily Rewards / C74 hero — the one tasteful gold feature; routes to Token Center */}
        <button type="button" className="igrw-hero" onClick={() => nav("/ig/c74")} aria-label="Open C74 Token Center">
          <span className="igrw-hero-ic" aria-hidden="true"><RewardCrest className="igrw-hero-crest" /></span>
          <div className="igrw-hero-tx">
            <b>Daily Rewards</b>
            <small>Spin, complete missions &amp; claim bonuses</small>
          </div>
          <div className="igrw-hero-side">
            {c74Bal != null && <span className="igrw-hero-bal ig-sheen">{fmt(c74Bal)} <em>C74</em></span>}
            <span className="igrw-hero-cta">Open ›</span>
          </div>
        </button>

        <div className="igrw-sec"><Sparkles size={14} /> <span>Reward Center</span></div>

        <div className="igrw-card">
          {ROWS.map((r, i) => (
            <button key={r.l} type="button" className="igrw-row" style={{ borderTop: i ? "1px solid var(--line)" : "none" }} onClick={() => nav(r.to)} aria-label={r.l}>
              <span className="igrw-ic" aria-hidden="true">{r.emoji}</span>
              <span className="igrw-tx"><b>{r.l}</b><small>{r.d}</small></span>
              {r.badge && <span className="igrw-badge">{r.badge}</span>}
              <ChevronRight size={18} className="igrw-arr" />
            </button>
          ))}
        </div>

        <footer className="igrw-foot"><Sparkles size={11} /> Rewards &amp; C74 balance are live from your account</footer>

        <IgSocialNotice variant="line" />
      </main>

      <IgTabBar active="profile" />
    </div>
  );
}

const CSS = `
.ig { --ink:#f0fff7; --mut:#83b39c; --faint:#5f8b76; --emd:#2ee08a; --emd-deep:#0e7a4a;
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
.igrw-back { background:none; border:none; color:#cdead9; cursor:pointer; display:grid; place-items:center; width:38px; height:38px; border-radius:11px; transition:background .18s, transform .12s; }
.igrw-back:hover { background:rgba(255,255,255,.05); }
.igrw-back:active { transform:scale(.9); }
.ig-ttl { font-size:18px; font-weight:800; letter-spacing:.01em; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.ig-main { max-width:560px; margin:0 auto; }
.igrw-main { padding:18px 14px; display:flex; flex-direction:column; gap:15px; }
.ige-hero img { filter:saturate(1.12) contrast(1.06) brightness(1.03) drop-shadow(0 6px 14px rgba(0,0,0,0.5)) drop-shadow(0 0 18px rgba(240,201,74,0.45)); }

/* Daily Rewards / C74 hero — luxury gold cabinet with bevel + controlled shine */
.igrw-hero { position:relative; overflow:hidden; display:flex; align-items:center; gap:13px; width:100%; text-align:left; padding:16px; border-radius:18px; cursor:pointer; font-family:inherit;
  color:#3a2708; border:1px solid rgba(255,255,255,0.35); background:linear-gradient(180deg,#fff4cf,#f0c94a 52%,#c68a2e);
  box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.7), inset 0 -3px 8px rgba(120,74,20,0.28), 0 0 24px -6px rgba(240,201,74,0.6), 0 16px 34px -16px rgba(0,0,0,0.6); transition:transform .12s; }
.igrw-hero::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(105deg, transparent 42%, rgba(255,255,255,0.6) 50%, transparent 58%); transform:translateX(-150%); animation:igrwSweep 6s ease-in-out infinite; }
.igrw-hero:active { transform:translateY(1px) scale(.996); }
.igrw-hero-ic { position:relative; z-index:1; flex:0 0 auto; width:54px; height:54px; border-radius:16px; display:grid; place-items:center; font-size:26px; line-height:1;
  background:radial-gradient(120% 120% at 50% 16%, #1e6440, #061a10 78%); border:1px solid rgba(122,84,30,0.55); box-shadow:inset 0 1px 0 rgba(246,230,176,0.28), inset 0 -3px 6px rgba(0,0,0,0.34); }
.igrw-hero-crest { width:46px; height:48px; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4)); }
.igrw-hero-tx { position:relative; z-index:1; flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
.igrw-hero-tx b { font-size:16.5px; font-weight:900; letter-spacing:-.01em; color:#2a1c05; }
.igrw-hero-tx small { font-size:11.5px; font-weight:700; color:#6a4a10; line-height:1.3; }
.igrw-hero-side { position:relative; z-index:1; flex:0 0 auto; display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
.igrw-hero-bal { font-size:13.5px; font-weight:900; color:#2a1c05; font-variant-numeric:tabular-nums; white-space:nowrap; }
.igrw-hero-bal em { font-style:normal; font-size:9.5px; color:#6a4a10; }
.igrw-hero-cta { display:inline-flex; align-items:center; gap:2px; font-size:11.5px; font-weight:900; color:#2a1c05; padding:5px 11px; border-radius:999px; background:rgba(255,255,255,0.6); border:1px solid rgba(255,255,255,0.75); box-shadow:inset 0 1px 0 rgba(255,255,255,0.7), 0 3px 8px -3px rgba(0,0,0,0.35); }

.igrw-sec { display:flex; align-items:center; gap:10px; margin:6px 4px -4px; font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:var(--faint); font-weight:700; }
.igrw-sec svg { color:var(--gold); filter:drop-shadow(0 0 6px rgba(240,201,74,0.5)); }
.igrw-sec span { position:relative; }

/* Reward Center — deep gold-framed emerald cabinet */
.igrw-card { position:relative; border:1px solid transparent; border-radius:20px; overflow:hidden;
  background:linear-gradient(165deg, rgba(19,60,40,.92), rgba(6,20,13,.96));
  box-shadow:inset 0 0 0 1.3px rgba(240,201,74,.42), inset 0 1.5px 0 rgba(255,255,255,.14), inset 0 0 34px rgba(46,224,138,.08), 0 26px 50px -26px rgba(0,0,0,.9); }
.igrw-row { position:relative; display:flex; align-items:center; gap:13px; width:100%; text-align:left; padding:14px 15px; cursor:pointer; font-family:inherit; color:var(--ink); background:transparent; border:none; transition:background .16s ease, transform .12s ease; }
.igrw-row:hover { background:rgba(255,255,255,.03); }
.igrw-row:active { background:rgba(46,224,138,0.08); transform:translateY(1px); }
.igrw-ic { flex:0 0 auto; width:46px; height:46px; border-radius:13px; display:grid; place-items:center; font-size:22px; line-height:1;
  background:radial-gradient(120% 120% at 50% 14%, #2a7d52, #0a2416 78%); border:1px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.3), inset 0 -3px 6px rgba(0,0,0,0.34), 0 0 13px -3px rgba(46,224,138,0.5), 0 5px 12px -5px rgba(0,0,0,0.6); }
.igrw-tx { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.igrw-tx b { font-size:14.5px; font-weight:800; letter-spacing:-.005em; color:var(--ink); }
.igrw-tx small { font-size:11.5px; color:var(--mut); font-weight:600; }
.igrw-badge { flex-shrink:0; font-size:10px; font-weight:800; letter-spacing:0.3px; color:#0a2410; padding:4px 10px; border-radius:999px; white-space:nowrap;
  background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); box-shadow:inset 0 1px 0 rgba(255,255,255,0.55), 0 0 14px -4px rgba(46,224,138,0.7); }
.igrw-arr { color:var(--gold); flex-shrink:0; }

.igrw-foot { display:flex; align-items:center; justify-content:center; gap:6px; margin-top:8px; font-size:10.5px; font-weight:600; color:var(--faint); text-align:center; }
.igrw-foot svg { color:var(--gold); }

@keyframes igrwSweep { 0%,72% { transform:translateX(-150%); } 88%,100% { transform:translateX(150%); } }
@media (prefers-reduced-motion: reduce) {
  .igrw-hero::after { animation:none !important; transform:translateX(-150%) !important; }
  .igrw-hero, .igrw-row, .igrw-back { transition:none !important; }
  .igrw-hero:active, .igrw-row:active, .igrw-back:active { transform:none; }
}
`;

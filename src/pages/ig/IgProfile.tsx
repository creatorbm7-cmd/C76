// IgProfile (/ig/profile) — premium luxury-dark profile (emerald + antique gold).
//
// Layout: handle bar → gold profile cabinet (avatar + identity, emerald/gold stat
// cards, a compact VIP tier badge + progress, action buttons) → story "highlights"
// rail → tab strip → 3-col grid of account shortcuts. All values are REAL
// (useProfileStats, useC74, useC7Pulse); every card/highlight/cell routes to a real
// page. The VIP strip is a compact summary of the player's real tier + progression
// (published ladder × real lifetime wagered) that links to the canonical /ig/vip —
// no per-user figures are fabricated. Presentation only; no wallet/RPC/ledger change.
import { useNavigate } from "react-router-dom";
import { Settings, Grid3x3, Bookmark, ChevronDown, ChevronRight } from "lucide-react";
import { usd as fmtUsd, num as fmtNum } from "@/lib/format";
import { useProfileStats } from "@/hooks/useProfileStats";
import { useC74 } from "@/hooks/useC74";
import { useC7Pulse } from "@/hooks/useC7Pulse";
import C7Icon, { type C7IconName } from "@/components/c7/C7Icon";
import C7FeatureIcon from "@/components/c7/C7FeatureIcon";
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";

const money = (n: number) => fmtUsd(n, { locale: null, min: 0 });

// Published VIP ladder (program structure — not per-user data) for the compact strip.
const V_THRESH = [0, 5000, 25000, 100000, 500000];
const V_NAME = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];

// `slot` = premium asset key; C7FeatureIcon renders the bound/emblem PNG, else `ic` SVG.
const HIGHLIGHTS: { key: string; label: string; ic: C7IconName; slot: string; to: string }[] = [
  { key: "vip", label: "VIP", ic: "crown", slot: "icon.vip", to: "/ig/vip" },
  { key: "rewards", label: "Rewards", ic: "gift", slot: "icon.rewards", to: "/ig/rewards" },
  { key: "missions", label: "Missions", ic: "target", slot: "icon.missions", to: "/ig/missions" },
  { key: "c74", label: "C74", ic: "coin", slot: "icon.c74", to: "/ig/c74" },
  { key: "bank", label: "Bank", ic: "bank", slot: "icon.bank", to: "/ig/bank" },
  { key: "stats", label: "Stats", ic: "chart", slot: "icon.analytics", to: "/ig/analytics" },
];

const GRID: { key: string; label: string; ic: C7IconName; slot: string; to: string }[] = [
  { key: "wallet", label: "Wallet", ic: "wallet", slot: "icon.wallet", to: "/ig/wallet" },
  { key: "deposit", label: "Deposit", ic: "coins", slot: "icon.deposit", to: "/ig/deposit" },
  { key: "withdraw", label: "Withdraw", ic: "cashout", slot: "icon.withdraw", to: "/ig/withdraw" },
  { key: "history", label: "History", ic: "receipt", slot: "icon.history", to: "/ig/activity" },
  { key: "rewards", label: "Rewards", ic: "gift", slot: "icon.rewards", to: "/ig/rewards" },
  { key: "missions", label: "Missions", ic: "target", slot: "icon.missions", to: "/ig/missions" },
  { key: "vip", label: "VIP Club", ic: "crown", slot: "icon.vip", to: "/ig/vip" },
  { key: "analytics", label: "Analytics", ic: "chart", slot: "icon.analytics", to: "/ig/analytics" },
  { key: "telegram", label: "Telegram", ic: "send", slot: "icon.telegram", to: "/ig/settings" },
  { key: "refer", label: "Invite", ic: "users", slot: "icon.refer", to: "/ig/invite" },
  { key: "support", label: "Support", ic: "headset", slot: "icon.support", to: "/ig/support" },
  { key: "settings", label: "Settings", ic: "gear", slot: "icon.settings", to: "/ig/settings" },
];

export default function IgProfile() {
  const nav = useNavigate();
  const { stats } = useProfileStats();
  const { summary } = useC74();
  const pulse = useC7Pulse();
  const handle = "c7_winner";

  // Compact VIP tier + progress — real lifetime wagered on the published ladder.
  const wagered = Number((stats as any)?.total_wagered ?? 0);
  const byWager = V_THRESH.reduce((a, t, i) => (wagered >= t ? i : a), 0);
  const byName = summary?.tier ? V_NAME.findIndex((n) => n.toLowerCase() === String(summary.tier).toLowerCase()) : -1;
  const vi = byName >= 0 ? byName : byWager;
  const nextThresh = V_THRESH[vi + 1];
  const vPct = nextThresh != null ? Math.max(0, Math.min(100, Math.round(((wagered - V_THRESH[vi]) / (nextThresh - V_THRESH[vi])) * 100))) : 100;
  const tierName = summary?.tier ?? V_NAME[vi] ?? pulse.rank.name;

  const STATS: { b: string; l: string; to: string }[] = [
    { b: fmtNum(stats.bets_placed ?? 0), l: "Bets", to: "/ig/activity" },
    { b: money(stats.total_won ?? 0), l: "Won", to: "/ig/analytics" },
    { b: money(stats.balance ?? 0), l: "Balance", to: "/ig/wallet" },
  ];

  return (
    <div className="ig">
      <style>{CSS}</style>

      <header className="ig-top">
        <span className="ig-handle">{handle} <ChevronDown size={16} /></span>
        <button className="ig-ic" onClick={() => nav("/ig/settings")} aria-label="Settings"><Settings size={23} /></button>
      </header>

      <main className="ig-main igp-main">
        <div className="igp-card">
          {/* Identity */}
          <section className="igp-id">
            <span className="igp-ava">
              <img src="/icons/v3/hdr/avatar.png" alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            </span>
            <div className="igp-idtx">
              <div className="igp-name">{pulse.rank.name} <span className="igp-badge"><C7Icon name="crown" size={11} /> VIP</span></div>
              <div className="igp-bioline">C7 Winners member · Play · Win · Repeat</div>
            </div>
          </section>

          {/* Emerald/gold stat cards */}
          <section className="igp-stats">
            {STATS.map((s) => (
              <button key={s.l} className="igp-stat" onClick={() => nav(s.to)}>
                <b>{s.b}</b><span>{s.l}</span>
              </button>
            ))}
          </section>

          {/* Compact VIP tier + progress → canonical /ig/vip */}
          <button className="igp-vip" onClick={() => nav("/ig/vip")} aria-label="VIP tier and progression">
            <span className="igp-vip-seal"><C7Icon name="crown" size={13} /> {tierName}</span>
            <div className="igp-vip-body">
              <div className="igp-vip-bar"><span style={{ width: `${vPct}%` }} /></div>
              <div className="igp-vip-tx">{nextThresh != null ? `${vPct}% to ${V_NAME[vi + 1]}` : "Top tier reached 👑"}</div>
            </div>
            <ChevronRight size={17} className="igp-vip-arr" />
          </button>

          {/* Actions — gold primary hierarchy */}
          <section className="igp-btns">
            <button className="igp-btn" onClick={() => nav("/ig/settings")}>Edit profile</button>
            <button className="igp-btn" onClick={() => nav("/ig/invite")}>Share</button>
            <button className="igp-btn igp-btn--solid" onClick={() => nav("/ig/deposit")}>Deposit</button>
          </section>
        </div>

        {/* Highlights */}
        <section className="igp-hl">
          {HIGHLIGHTS.map((h) => (
            <button key={h.key} className="igp-hl-i" onClick={() => nav(h.to)}>
              <span className="igp-hl-ring"><span className="igp-hl-in"><C7FeatureIcon slot={h.slot} ic={h.ic} size={48} svgSize={28} /></span></span>
              <span className="igp-hl-l">{h.label}</span>
            </button>
          ))}
        </section>

        {/* Tab strip */}
        <div className="igp-tabs">
          <span className="igp-tab on"><Grid3x3 size={25} /></span>
          <span className="igp-tab"><Bookmark size={25} /></span>
        </div>

        {/* Grid of shortcuts (the "posts") */}
        <section className="igp-grid">
          {GRID.map((g) => (
            <button key={g.key} className="igp-cell" onClick={() => nav(g.to)} aria-label={g.label}>
              <C7FeatureIcon slot={g.slot} ic={g.ic} size={70} svgSize={40} className="igp-cell-art" />
              <span className="igp-cell-l">{g.label}</span>
            </button>
          ))}
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
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:54px; padding:0 14px;
  background:linear-gradient(180deg, rgba(7,24,15,.95), rgba(7,24,15,.5)); -webkit-backdrop-filter:blur(16px); backdrop-filter:blur(16px);
  border-bottom:1px solid var(--line); box-shadow:0 1px 0 rgba(240,201,74,.16), 0 10px 26px -18px rgba(0,0,0,.8); }
.ig-handle { display:inline-flex; align-items:center; gap:5px; font-size:19px; font-weight:800; color:#f3ffe9; }
.ig-ic { background:none; border:none; color:#cdead9; cursor:pointer; display:grid; place-items:center; width:38px; height:38px; border-radius:11px; transition:background .18s, transform .12s; }
.ig-ic:hover { background:rgba(255,255,255,.05); } .ig-ic:active { transform:scale(.9); }
.ig-main { max-width:560px; margin:0 auto; }
.igp-main { padding:12px 12px 0; }

/* Profile cabinet — deep gold-framed emerald, controlled lighting */
.igp-card { position:relative; margin:0 0 14px; padding:16px 15px 15px; border-radius:22px; display:flex; flex-direction:column; gap:14px; overflow:hidden;
  background:
    radial-gradient(120% 120% at 100% 0%, rgba(240,201,74,0.14), transparent 52%),
    radial-gradient(120% 120% at 0% 0%, rgba(46,224,138,0.13), transparent 58%),
    linear-gradient(165deg, rgba(20,64,42,0.95), rgba(6,20,13,0.96));
  box-shadow:inset 0 0 0 1.4px rgba(240,201,74,0.46), inset 0 1.6px 0 rgba(255,255,255,0.16), inset 0 0 34px rgba(46,224,138,0.08), 0 26px 52px -26px rgba(0,0,0,0.9); }

.igp-id { display:flex; align-items:center; gap:15px; }
.igp-ava { flex:0 0 auto; width:76px; height:76px; border-radius:50%; padding:3px; background:conic-gradient(from 210deg,#f6c945,#37e29a,#0e7a4a,#f6c945); display:grid; place-items:center;
  box-shadow:0 0 20px -4px rgba(240,201,74,0.6), 0 0 38px -14px rgba(46,224,138,0.5); animation:igpSpin 14s linear infinite; }
.igp-ava img { width:100%; height:100%; border-radius:50%; object-fit:cover; border:3px solid #05150d; background:radial-gradient(120% 120% at 50% 20%, #12492f, #06180f); animation:igpSpin 14s linear infinite reverse; }
.igp-idtx { flex:1; min-width:0; }
.igp-name { font-size:15px; font-weight:800; color:var(--ink); display:flex; align-items:center; gap:8px; }
.igp-badge { display:inline-flex; align-items:center; gap:3px; font-size:10px; font-weight:800; color:#3a2708; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); padding:2px 9px; border-radius:999px; box-shadow:inset 0 1px 0 rgba(255,255,255,0.7); }
.igp-bioline { font-size:12px; color:var(--mut); margin-top:4px; }

/* Emerald/gold stat cards */
.igp-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; }
.igp-stat { display:flex; flex-direction:column; align-items:center; gap:2px; padding:12px 6px; border-radius:14px; cursor:pointer; font-family:inherit; border:1px solid var(--hair);
  background:linear-gradient(180deg, rgba(4,16,10,.55), rgba(6,20,13,.7)); box-shadow:inset 0 1px 0 rgba(255,255,255,.06); transition:transform .12s, border-color .18s; }
.igp-stat:hover { border-color:var(--line); } .igp-stat:active { transform:translateY(1px) scale(.98); }
.igp-stat b { font-size:17px; font-weight:900; font-variant-numeric:tabular-nums; letter-spacing:-.01em;
  background-image:linear-gradient(100deg,#fff8e0,#ffe9a8 30%,#f0c94a 55%,#e0a93a 75%,#fff8e0); background-size:200% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; animation:igpGold 6.5s ease-in-out infinite; }
.igp-stat span { font-size:11px; color:var(--mut); font-weight:600; }

/* Compact VIP tier + progress */
.igp-vip { display:flex; align-items:center; gap:12px; width:100%; text-align:left; padding:11px 13px; border-radius:15px; cursor:pointer; font-family:inherit; color:var(--ink); border:1px solid transparent;
  background:radial-gradient(130% 130% at 0% 0%, rgba(240,201,74,0.12), transparent 56%), rgba(4,16,10,.5);
  box-shadow:inset 0 0 0 1.2px rgba(240,201,74,0.36), inset 0 1px 0 rgba(255,255,255,.1); transition:transform .12s; }
.igp-vip:active { transform:translateY(1px); }
.igp-vip-seal { flex:0 0 auto; display:inline-flex; align-items:center; gap:4px; font-size:10.5px; font-weight:900; letter-spacing:.02em; color:#3a2708; padding:5px 10px; border-radius:999px;
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); box-shadow:inset 0 1px 0 rgba(255,255,255,.7), 0 0 12px -3px rgba(240,201,74,.6); }
.igp-vip-body { flex:1; min-width:0; }
.igp-vip-bar { height:7px; border-radius:999px; background:rgba(0,0,0,.42); overflow:hidden; box-shadow:inset 0 1px 2px rgba(0,0,0,.5); }
.igp-vip-bar span { display:block; height:100%; border-radius:999px; background:linear-gradient(90deg,#0e7a4a,#2ee08a); box-shadow:0 0 8px rgba(46,224,138,.5); transition:width 1s cubic-bezier(.22,1,.36,1); }
.igp-vip-tx { font-size:10px; color:var(--mut); font-weight:700; margin-top:5px; }
.igp-vip-arr { color:var(--gold); flex-shrink:0; }

/* Actions */
.igp-btns { display:flex; gap:8px; }
.igp-btn { flex:1; font-size:13.5px; font-weight:800; color:var(--ink); background:rgba(4,16,10,.5); border:1px solid var(--line); padding:10px; border-radius:12px; cursor:pointer;
  box-shadow:inset 0 1px 0 rgba(246,230,176,.12); transition:transform .12s, filter .12s; }
.igp-btn:active { transform:translateY(1.5px); filter:brightness(1.05); }
.igp-btn--solid { color:#3a2708; border-color:transparent; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep));
  box-shadow:inset 0 1.5px 0 rgba(255,255,255,.7), inset 0 -3px 7px rgba(120,74,20,.22), 0 0 18px -3px rgba(240,201,74,.6), 0 9px 20px -9px rgba(0,0,0,.6); }

/* Highlights */
.igp-hl { display:flex; gap:16px; overflow-x:auto; padding:6px 4px 15px; scrollbar-width:none; border-bottom:1px solid var(--line); }
.igp-hl::-webkit-scrollbar{ display:none; }
.igp-hl-i { flex:0 0 auto; background:none; border:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:6px; color:var(--ink); transition:transform .12s; }
.igp-hl-i:active { transform:scale(.94); }
.igp-hl-ring { width:64px; height:64px; border-radius:50%; padding:2.5px; background:conic-gradient(from 210deg,#f6c945,#37e29a,#0e7a4a,#f6c945); display:grid; place-items:center; box-shadow:0 0 16px -3px rgba(240,201,74,0.55), 0 0 28px -10px rgba(46,224,138,0.45); }
.igp-hl-in { width:100%; height:100%; border-radius:50%; background:radial-gradient(120% 120% at 50% 20%, #12492f, #06180f); border:2px solid #05150d; display:grid; place-items:center; color:#ffe9a8; }
.igp-hl-l { font-size:11px; color:var(--mut); max-width:60px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

.igp-tabs { display:flex; }
.igp-tab { flex:1; display:grid; place-items:center; height:44px; color:var(--faint); border-bottom:1px solid transparent; }
.igp-tab.on { color:var(--gold); border-bottom:1.5px solid var(--gold); }

.igp-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px 2px; padding:14px 5px 8px; }
body .ig .igp-grid .igp-cell { position:relative; aspect-ratio:auto; border-radius:0; cursor:pointer; overflow:visible;
  display:flex; flex-direction:column; align-items:center; justify-content:flex-start; gap:5px; padding:0; color:var(--ink);
  background:none !important; border:none !important; box-shadow:none !important; -webkit-backdrop-filter:none !important; backdrop-filter:none !important;
  -webkit-tap-highlight-color:transparent; transition:transform .14s ease; }
body .ig .igp-grid .igp-cell::before, body .ig .igp-grid .igp-cell::after { content:none !important; display:none !important; background:none !important; }
.igp-cell:active { transform:scale(0.93); }
body .ig .igp-grid .igp-cell-art { display:block; width:100%; aspect-ratio:1; object-fit:contain; transform:scale(1.16);
  border-radius:0 !important; background:none !important; border:none !important; box-shadow:none !important;
  filter:saturate(1.12) contrast(1.05) brightness(1.03) drop-shadow(0 5px 9px rgba(0,0,0,0.55)) drop-shadow(0 0 13px rgba(240,201,74,0.42)); }
body .ig .igp-grid .igp-cell:active .igp-cell-art { transform:scale(1.1); filter:saturate(1.14) contrast(1.05) brightness(1.05) drop-shadow(0 4px 8px rgba(0,0,0,0.55)) drop-shadow(0 0 14px rgba(240,201,74,0.55)); }
.igp-cell-l { font-size:10.5px; font-weight:700; line-height:1.1; text-align:center; color:#d8ecdf; text-shadow:0 1px 2px rgba(0,0,0,0.5);
  max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

@keyframes igpSpin { to { transform:rotate(360deg); } }
@keyframes igpGold { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
@media (prefers-reduced-motion:reduce){
  .ig *{ animation:none!important; }
  .igp-ava, .igp-ava img{ animation:none!important; }
  .igp-stat b{ background-position:0% 50%!important; }
  .igp-vip-bar span, .igp-btn, .igp-stat, .ig-ic, .igp-vip, .igp-hl-i { transition:none!important; }
}
`;

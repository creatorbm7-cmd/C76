// IgC74 (/ig/... C74 Token) — Instagram-light reskin of the dark C74 Token
// Center. Presentation only: same live hooks (useC74 balance/tier/gas-saved/
// history + useC74Price USD valuation), the same real embedded C74GasPanel and
// C7ErrorState, the same navigation routes, and the same honest "Soon" labels.
// Dark-only decorative art (JungleBackdrop / LuxFrameFX / C7Asset slots) dropped
// for clean light styling; tier chip uses the brand emoji instead of C7TierIcon.
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Coins, Fuel, Shield, Zap, Receipt, Rocket, ChevronRight } from "lucide-react";
import C74GasPanel from "@/components/wallet/C74GasPanel";
import C7ErrorState from "@/components/c7/C7ErrorState";
import { useC74, c74TierIcon } from "@/hooks/useC74";
import { useC74Price, formatC74Usd } from "@/hooks/useC74Price";
import { usd, num as fmt } from "@/lib/format";
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";
import IgRibbon from "@/components/ig/IgRibbon";
import IgC74Swap from "@/components/ig/IgC74Swap";

const FUTURE = ["Market Price", "Explorer", "Holders", "Circulating Supply", "Market Cap", "Swap / Buy"];

// Currencies the C74 economy interoperates with. USDT deposits + USD balance are
// live today; ETH (ERC-20) is an honestly-labelled "Soon" rail. No balances implied.
const ASSETS: { k: string; img: string; soon?: boolean }[] = [
  { k: "C74", img: "/images/v3/currency/c74.png" },
  { k: "USD", img: "/images/v3/currency/usd.png" },
  { k: "USDT", img: "/images/v3/currency/usdt.png" },
  { k: "ETH", img: "/images/v3/currency/eth.png", soon: true },
];

const fmtT = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" });

export default function IgC74() {
  const nav = useNavigate();
  const { summary, history, loading, error, reload } = useC74();
  const price = useC74Price();
  const bal = summary?.balance ?? 0;
  const usdValue = bal * price.usd;
  const gasSaved = summary?.fee_saved_usdt_approx ?? 0;
  const coverable = summary?.coverable_fee_usdt ?? 0;
  const tier = summary?.tier ?? "Spark";

  // C74 ecosystem — mining + reputation (merged from the old /c74 hub).
  const eco = [
    { emoji: "⛏️", label: "Play Mining", sub: "Mine C74 as you play", amt: "Open", to: "/ig/mining" },
    { emoji: "🛡️", label: "Reputation", sub: "Your trust score", amt: "View", to: "/ig/reputation" },
  ];

  return (
    <div className="ig igc74">
      <style>{CSS}</style>

      <header className="ig-top">
        <button className="igc74-back" onClick={() => (window.history.length > 1 ? nav(-1) : nav("/ig/wallet"))} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="ig-ttl">C74 Token</span>
        <IgRibbon kind="live" sm className="igc74-live" />
      </header>

      <main className="ig-main igc74-main">
        {loading && !summary ? (
          <div className="igc74-loading"><Loader2 className="igc74-spin" size={26} /></div>
        ) : error && !summary ? (
          <C7ErrorState
            title="Couldn't load your C74 balance"
            message="We couldn't reach the C74 ledger. Check your connection and try again."
            onRetry={() => reload()}
          />
        ) : (
          <>
            <div className="ige-hero"><img src="/images/v3/emblems/c74.png" alt="" aria-hidden="true" style={{ width: "min(206px, 56%)" }} onError={(e) => { e.currentTarget.style.display = "none"; }} /></div>

            {/* Balance hero — the one tasteful gold feature */}
            <section className="igc74-hero">
              <img className="igc74-coin" src="/icons/v3/c74-token.png" alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              <div className="igc74-tier">{c74TierIcon(tier)} {tier}</div>
              <div className="igc74-bal-k"><Coins size={14} /> C74 Balance</div>
              <div className="igc74-bal-v ig-sheen">{fmt(bal)}</div>
              <div className="igc74-bal-usd">≈ {usd(usdValue)} <span>· {price.label}</span></div>
            </section>

            {/* Present-tense utility — what C74 does today */}
            <p className="igc74-util"><Zap size={15} /> <b>Usable now</b> — your C74 helps cover withdrawal network fees and powers your progress across the C7 ecosystem.</p>

            {/* C74 → USDT swap — renders only when the operator has enabled + funded
                the rail; otherwise the honest "Swap / Buy · Soon" milestone stands. */}
            <IgC74Swap onCredited={() => reload()} />

            {/* Ecosystem assets — the currencies C74 interoperates with. Live vs Soon
                are labelled honestly; no balances are implied for any asset. */}
            <section className="igc74-assets" aria-label="Ecosystem assets">
              {ASSETS.map((a) => (
                <span key={a.k} className="igc74-asset" data-soon={a.soon || undefined}>
                  <img className="igc74-asset-c" src={a.img} alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  <b>{a.k}</b>
                  <em>{a.soon ? "Soon" : "Live"}</em>
                </span>
              ))}
            </section>

            {/* Stat tiles */}
            <section className="igc74-grid">
              <button type="button" className="igc74-stat" onClick={() => nav("/ig/wallet")}>
                <span className="igc74-stat-i"><Fuel size={17} /></span>
                <span className="igc74-stat-v">{usd(gasSaved)}</span>
                <span className="igc74-stat-k">Gas Saved</span>
              </button>
              <button type="button" className="igc74-stat" onClick={() => nav("/ig/wallet")}>
                <span className="igc74-stat-i"><Shield size={17} /></span>
                <span className="igc74-stat-v">{usd(coverable)}</span>
                <span className="igc74-stat-k">Coverable now</span>
              </button>
              <button type="button" className="igc74-stat" onClick={() => nav("/ig/wallet")}>
                <span className="igc74-stat-i"><Coins size={17} /></span>
                <span className="igc74-stat-v">{usd(usdValue)}</span>
                <span className="igc74-stat-k">USD Value · {formatC74Usd(price.usd)}/C74</span>
              </button>
              <button type="button" className="igc74-stat" onClick={() => nav("/ig/reputation")}>
                <span className="igc74-stat-i igc74-stat-emoji">{c74TierIcon(tier)}</span>
                <span className="igc74-stat-v">{tier}</span>
                <span className="igc74-stat-k">C74 Tier</span>
              </button>
            </section>

            {/* C74 Ecosystem — mining + reputation */}
            <section className="igc74-sect">
              <div className="igc74-sec"><Zap size={14} /> <span>C74 Ecosystem</span></div>
              <div className="igc74-card">
                {eco.map((r, i) => (
                  <button key={r.label} type="button" className="igc74-row" style={{ borderTop: i ? "1px solid var(--line)" : "none" }} onClick={() => nav(r.to)}>
                    <span className="igc74-row-ic" aria-hidden="true">{r.emoji}</span>
                    <span className="igc74-row-tx"><b>{r.label}</b><small>{r.sub}</small></span>
                    <span className="igc74-row-amt">{r.amt}</span>
                    <ChevronRight size={18} className="igc74-arr" />
                  </button>
                ))}
              </div>
            </section>

            {/* Gas & Coverage — the real embedded gas panel (keeps its own styling) */}
            <section className="igc74-sect">
              <div className="igc74-sec"><Fuel size={14} /> <span>Gas &amp; Coverage</span></div>
              <C74GasPanel />
            </section>

            {/* Activity — live C74 / energy ledger */}
            <section className="igc74-sect">
              <div className="igc74-sec"><Receipt size={14} /> <span>Activity</span>
                <button type="button" className="igc74-all" onClick={() => nav("/ig/activity")}>Transactions ›</button>
              </div>
              {history.length > 0 ? (
                <div className="igc74-card">
                  {history.slice(0, 10).map((e, i) => (
                    <div key={e.id} className="igc74-hrow" style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
                      <span className="igc74-htx">
                        <span className="igc74-hlbl">{e.label || e.kind}</span>
                        <span className="igc74-ht">{fmtT(e.created_at)}</span>
                      </span>
                      <b className={e.direction === "earn" ? "igc74-earn" : "igc74-spend"}>{e.direction === "earn" ? "+" : "−"}{fmt(e.amount)} C74</b>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="igc74-empty">No C74 activity yet — earn by wagering &amp; depositing.</div>
              )}
            </section>

            {/* Future milestones — honestly labelled "Soon", not live */}
            <section className="igc74-sect">
              <div className="igc74-sec"><Rocket size={14} /> <span>Coming with the C74 token</span></div>
              <div className="igc74-soon">
                {FUTURE.map((s) => (<span key={s} className="igc74-soon-i">{s} <em>Soon</em></span>))}
              </div>
              <p className="igc74-note">Launch-ready today. At token launch the price flips from the internal peg to a live market feed — same page, no redesign.</p>
            </section>
          </>
        )}

        <IgSocialNotice variant="line" />
      </main>

      <IgTabBar active="wallet" />
    </div>
  );
}

const CSS = `
.ig { --bg:#07130d; --card:#103524; --card2:#12492f; --line:rgba(240,201,74,0.26); --ink:#eafff4; --mut:#93c3aa; --grn:#2ee08a; --grn2:#0e7a4a; --gold:#f0c94a; --gold3:#c68a2e; --loss:#ff6b7d;
  min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif; padding-bottom:calc(76px + env(safe-area-inset-bottom));
  background: radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%), linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%); background-attachment:fixed; }
.ig * { box-sizing:border-box; }
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:52px; padding:0 12px;
  background:linear-gradient(180deg, rgba(9,32,20,0.92), rgba(9,32,20,0.62)); -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); }
.igc74-back { background:none; border:none; color:#d6ffe9; cursor:pointer; display:grid; place-items:center; width:40px; height:40px; }
.ig-ttl { font-size:18px; font-weight:800; color:#f3ffe9; }
.igc74-badge { min-width:34px; text-align:right; font-size:10px; font-weight:800; letter-spacing:0.4px; text-transform:uppercase; color:var(--grn); }
.ig-main { max-width:560px; margin:0 auto; }
.igc74-main { padding:14px 12px; display:flex; flex-direction:column; gap:14px; }

.igc74-loading { display:grid; place-items:center; padding:60px 0; }
.igc74-spin { animation:igc74-spin 1s linear infinite; color:var(--gold); }
@keyframes igc74-spin { to { transform:rotate(360deg); } }

/* Balance hero — the marquee: emerald glass ground, gold-gradient number, one controlled glint */
.igc74-hero { position:relative; overflow:hidden; text-align:center; padding:20px 16px 22px; border-radius:18px; color:var(--ink);
  border:1px solid var(--line);
  background:radial-gradient(120% 120% at 50% 0%, rgba(240,201,74,0.16), transparent 55%), linear-gradient(180deg, rgba(18,73,47,0.94), rgba(7,32,20,0.94));
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.14), 0 18px 40px -20px rgba(0,0,0,0.85), 0 0 44px -18px rgba(240,201,74,0.35); }
.igc74-hero::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(105deg, transparent 40%, rgba(246,230,176,0.12) 50%, transparent 60%); }
.igc74-tier { position:relative; z-index:1; display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:900; letter-spacing:0.8px; text-transform:uppercase;
  padding:5px 13px; border-radius:999px; color:#3a2708; background:linear-gradient(180deg,#fff3c8,#f0c94a 55%,#c68a2e); border:1px solid rgba(122,90,30,0.6);
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.6); margin-bottom:12px; }
.igc74-bal-k { position:relative; z-index:1; display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:var(--grn); }
.igc74-bal-k svg { color:var(--gold); }
.igc74-bal-v { position:relative; z-index:1; font-size:46px; font-weight:900; letter-spacing:-1px; line-height:1.05; font-variant-numeric:tabular-nums; margin-top:2px;
  background:linear-gradient(180deg,#fff6d5,#f0c94a 58%,#c68a2e); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.igc74-bal-usd { position:relative; z-index:1; margin-top:5px; font-size:13px; font-weight:800; color:#f3ffe9; font-variant-numeric:tabular-nums; }
.igc74-bal-usd span { color:var(--mut); font-weight:700; }
/* Floating 3D C74 coin — tucked top-right of the hero, behind the text */
.igc74-coin { position:absolute; z-index:0; top:6px; right:2px; width:150px; height:auto; pointer-events:none;
  opacity:0.97; filter:drop-shadow(0 8px 16px rgba(0,0,0,0.5)); }

/* Ecosystem assets — premium coin chips with honest Live/Soon tags */
.igc74-assets { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
.igc74-asset { display:flex; flex-direction:column; align-items:center; gap:5px; padding:11px 4px 9px; border-radius:14px;
  background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igc74-asset-c { width:38px; height:38px; object-fit:contain; filter:drop-shadow(0 3px 5px rgba(0,0,0,0.5)); }
.igc74-asset b { font-size:12px; font-weight:900; color:#f3ffe9; letter-spacing:0.2px; }
.igc74-asset em { font-style:normal; font-size:8.5px; font-weight:900; letter-spacing:0.5px; text-transform:uppercase; color:#0a2410;
  padding:2px 7px; border-radius:999px; background:linear-gradient(180deg,#9ffcc4,#2ee08a 60%,#0e7a4a); box-shadow:inset 0 1px 0 rgba(255,255,255,0.4); }
.igc74-asset[data-soon] { opacity:0.86; }
.igc74-asset[data-soon] .igc74-asset-c { filter:drop-shadow(0 3px 5px rgba(0,0,0,0.5)) grayscale(0.15); }
.igc74-asset[data-soon] em { color:#3a2708; background:linear-gradient(180deg,#fff3c8,#f0c94a 55%,#c68a2e); }

.igc74-util { margin:0; padding:11px 13px; border-radius:14px; font-size:12px; line-height:1.45; color:var(--ink);
  background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igc74-util svg { color:var(--gold); vertical-align:-3px; }
.igc74-util b { color:#f3ffe9; font-weight:900; }

.igc74-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
.igc74-stat { display:flex; flex-direction:column; align-items:flex-start; gap:2px; padding:13px; border-radius:14px; text-align:left; cursor:pointer;
  background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line); font-family:inherit; -webkit-tap-highlight-color:transparent;
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igc74-stat:active { transform:scale(0.97); }
.igc74-stat-i { display:grid; place-items:center; width:34px; height:34px; border-radius:11px; color:#ffe9a8;
  background:radial-gradient(120% 120% at 50% 14%, #2a7d52, #0a2416 78%); border:1px solid rgba(240,201,74,0.4); box-shadow:inset 0 1px 0 rgba(246,230,176,0.22), inset 0 -3px 6px rgba(0,0,0,0.32), 0 4px 10px -4px rgba(0,0,0,0.6); }
.igc74-stat-emoji { font-size:17px; line-height:1; }
.igc74-stat-v { font-size:18px; font-weight:900; color:#f3ffe9; font-variant-numeric:tabular-nums; margin-top:8px; }
.igc74-stat-k { font-size:10.5px; font-weight:700; color:var(--mut); }

.igc74-sect { display:flex; flex-direction:column; gap:9px; }
.igc74-sec { display:flex; align-items:center; gap:7px; margin:0 4px; font-size:11px; letter-spacing:0.8px; font-weight:800; text-transform:uppercase; color:#f3ffe9; }
.igc74-sec svg { color:var(--gold); }
.igc74-all { margin-left:auto; border:none; background:none; color:var(--grn); font-size:11px; font-weight:800; letter-spacing:0; text-transform:none; cursor:pointer; }

.igc74-card { background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line); border-radius:16px; overflow:hidden;
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igc74-row { display:flex; align-items:center; gap:12px; width:100%; text-align:left; padding:12px 14px; cursor:pointer; font-family:inherit; color:var(--ink); background:none; border:none; }
.igc74-row:active { background:rgba(9,32,20,0.5); }
.igc74-row-ic { flex:0 0 auto; width:42px; height:42px; border-radius:12px; display:grid; place-items:center; font-size:20px; line-height:1;
  background:radial-gradient(120% 120% at 50% 14%, #2a7d52, #0a2416 78%); border:1px solid rgba(240,201,74,0.4); box-shadow:inset 0 1px 0 rgba(246,230,176,0.22), inset 0 -3px 6px rgba(0,0,0,0.32), 0 4px 10px -4px rgba(0,0,0,0.6); }
.igc74-row-tx { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.igc74-row-tx b { font-size:14px; font-weight:800; color:#f3ffe9; }
.igc74-row-tx small { font-size:11.5px; color:var(--mut); font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.igc74-row-amt { font-size:12.5px; font-weight:900; color:var(--grn); font-variant-numeric:tabular-nums; white-space:nowrap; }
.igc74-arr { color:var(--mut); flex-shrink:0; }

.igc74-hrow { display:flex; align-items:center; gap:10px; padding:11px 14px; }
.igc74-htx { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.igc74-hlbl { font-size:13px; font-weight:800; color:#f3ffe9; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.igc74-ht { font-size:10.5px; font-weight:600; color:var(--mut); }
.igc74-hrow b { font-size:13px; font-weight:900; font-variant-numeric:tabular-nums; white-space:nowrap; flex-shrink:0; }
.igc74-earn { color:var(--grn); } .igc74-spend { color:var(--gold); }
.igc74-empty { font-size:12.5px; color:var(--mut); padding:16px 14px; border-radius:16px;
  background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }

.igc74-soon { display:flex; flex-wrap:wrap; gap:8px; }
.igc74-soon-i { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:var(--ink); padding:8px 11px; border-radius:999px;
  background:rgba(9,32,20,0.6); border:1px dashed var(--line); }
.igc74-soon-i em { font-style:normal; font-size:9px; font-weight:900; letter-spacing:0.4px; text-transform:uppercase; color:#3a2708; padding:2px 6px; border-radius:999px;
  background:linear-gradient(180deg,#fff3c8,#f0c94a 55%,#c68a2e); box-shadow:inset 0 1px 0 rgba(255,255,255,0.5); }
.igc74-note { margin:0; font-size:11px; line-height:1.45; color:var(--mut); }

/* ══ RICH POLISH v2 — top-rich C74 Token Center (matches Home / Reels / Wallet) ══
   Presentation only; no hooks, RPCs, routes, balances or logic touched. */
/* felt + chrome consistency */
.ig { background:
    radial-gradient(120% 58% at 50% -10%, rgba(240,201,74,0.10) 0%, transparent 46%),
    radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%),
    linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%) !important; background-attachment:fixed; }
.ig-top { box-shadow:0 1px 0 rgba(240,201,74,0.22), 0 10px 24px -16px rgba(0,0,0,0.7); }
.igc74 .ig-ttl { background:linear-gradient(180deg,#fff3c8,#f0c94a 55%,#c68a2e); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; text-shadow:0 0 14px rgba(240,201,74,0.3); }
/* BALANCE HERO → gold-framed emerald cabinet + floating C74 medallion + shimmer */
.igc74-hero { border-color:transparent;
  background:
    radial-gradient(120% 120% at 100% 0%, rgba(240,201,74,0.18), transparent 52%),
    radial-gradient(120% 120% at 0% 0%, rgba(58,240,160,0.18), transparent 58%),
    linear-gradient(180deg, rgba(21,78,50,0.96), rgba(6,24,15,0.96)) !important;
  box-shadow:
    inset 0 0 0 1.4px rgba(240,201,74,0.55),
    inset 0 1.6px 0 rgba(255,255,255,0.3),
    inset 0 0 26px rgba(46,224,138,0.14),
    0 0 24px -8px rgba(240,201,74,0.5),
    0 20px 44px -22px rgba(0,0,0,0.86) !important; }
.igc74-hero { overflow:hidden; }
.igc74-hero::after { background:linear-gradient(105deg, transparent 42%, rgba(255,244,207,0.13) 50%, transparent 58%); transform:translateX(-150%); animation:igc74Sweep 7s ease-in-out infinite; }
@keyframes igc74Sweep { 0%,74% { transform:translateX(-150%); } 90%,100% { transform:translateX(150%); } }
.igc74-coin { animation:igc74Float 5s ease-in-out infinite; }
.igc74-bal-v { background-image:linear-gradient(100deg,#fff8e0 0%,#ffe9a8 22%,#f7d868 42%,#e0a93a 58%,#ffe9a8 80%,#fff8e0 100%);
  background-size:220% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent;
  animation:igc74Gold 5.5s ease-in-out infinite; }
/* asset chips + stat tiles + cards → gold-cabinet framing */
.igc74-asset, .igc74-stat, .igc74-card, .igc74-empty, .igc74-util {
  border-color:transparent !important;
  box-shadow:inset 0 0 0 1.2px rgba(240,201,74,0.42), inset 0 1.4px 0 rgba(255,255,255,0.22), inset 0 0 18px rgba(46,224,138,0.1), 0 0 16px -8px rgba(240,201,74,0.4), 0 14px 30px -18px rgba(0,0,0,0.82) !important; }
.igc74-stat:active { transform:translateY(1px) scale(0.985); }
.igc74-stat-i, .igc74-row-ic { box-shadow:inset 0 1px 0 rgba(246,230,176,0.3), 0 0 12px -3px rgba(46,224,138,0.5), 0 4px 10px -4px rgba(0,0,0,0.6) !important; }
/* section labels + tier chip pop */
.igc74-sec { color:#f3ffe9; } .igc74-sec svg { filter:drop-shadow(0 0 6px rgba(240,201,74,0.5)); }
.igc74-tier { box-shadow:inset 0 1px 0 rgba(255,255,255,0.6), 0 0 14px -3px rgba(240,201,74,0.7) !important; }
@keyframes igc74Float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
@keyframes igc74Gold { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }

@media (prefers-reduced-motion: reduce) { .igc74-spin, .igc74-coin, .igc74-bal-v, .igc74-hero::after { animation:none !important; } .igc74-coin { transform:none !important; } .igc74-bal-v { background-position:0% 50% !important; } .igc74-stat:active, .igc74-row:active { transform:none; } }
`;

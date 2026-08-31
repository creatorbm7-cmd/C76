// IgWallet (/ig/wallet) — premium luxury-dark wallet (deep forest + emerald + gold).
// Gold-framed balance cabinet → quick actions (clear Deposit/Withdraw hierarchy) →
// C74 row → shortcuts. All data is REAL (useProfileStats, useC74); loading/error
// states come from those hooks — nothing is fabricated. Every action is routed.
// Presentation only; no wallet/RPC/ledger/payment/withdrawal logic touched.
import { useNavigate } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, Receipt, RefreshCw, AlertCircle } from "lucide-react";
import { usd as fmtUsd, num as fmtNum } from "@/lib/format";
import { useProfileStats } from "@/hooks/useProfileStats";
import { useC74 } from "@/hooks/useC74";
import { type C7IconName } from "@/components/c7/C7Icon";
import C7FeatureIcon from "@/components/c7/C7FeatureIcon";
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";

const money = (n: number) => fmtUsd(n, { locale: null, min: 2 });

type Tone = "gold" | "emerald" | "glass";
const ACTIONS: { key: string; label: string; Icon: JSX.Element; to: string; tone: Tone }[] = [
  { key: "deposit", label: "Deposit", Icon: <ArrowDownToLine size={20} />, to: "/ig/deposit", tone: "gold" },
  { key: "withdraw", label: "Withdraw", Icon: <ArrowUpFromLine size={20} />, to: "/ig/withdraw", tone: "emerald" },
  { key: "history", label: "History", Icon: <Receipt size={20} />, to: "/ig/activity", tone: "glass" },
  { key: "convert", label: "Convert", Icon: <RefreshCw size={20} />, to: "/ig/c74", tone: "glass" },
];

const SHORTCUTS: { key: string; label: string; sub: string; ic: C7IconName; slot: string; to: string }[] = [
  { key: "rewards", label: "Rewards", sub: "Bonuses & cashback", ic: "gift", slot: "icon.rewards", to: "/ig/rewards" },
  { key: "c74", label: "C74 Token", sub: "Mine, spin & earn", ic: "coin", slot: "icon.c74", to: "/ig/c74" },
  { key: "bank", label: "Bank", sub: "Save & grow streak", ic: "bank", slot: "icon.bank", to: "/ig/bank" },
  { key: "kyc", label: "Verification", sub: "KYC status", ic: "shield", slot: "icon.kyc", to: "/ig/kyc" },
];

export default function IgWallet() {
  const nav = useNavigate();
  const { stats, loading: sLoading, error: sError, refetch } = useProfileStats();
  const { summary, loading: cLoading, reload } = useC74();
  const c74 = summary?.balance ?? 0;
  const busy = sLoading || cLoading;
  const refresh = () => { refetch?.(); reload?.(); };

  return (
    <div className="ig">
      <style>{CSS}</style>
      <header className="ig-top">
        <span style={{ width: 38 }} />
        <span className="ig-ttl">Wallet</span>
        <button className="igw-ic" onClick={refresh} disabled={busy} aria-label="Refresh"><RefreshCw size={18} className={busy ? "igw-spin" : ""} /></button>
      </header>

      <main className="ig-main igw-main">
        {/* Balance cabinet */}
        <section className="igw-bal">
          <img className="igw-bal-art" src="/images/v3/balance/coin-stack.png" alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          <span className="igw-bal-k"><img className="igw-bal-cur" src="/images/v3/currency/usd.png" alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} />Total balance</span>
          {sError ? (
            <button className="igw-bal-err" onClick={refresh}><AlertCircle size={15} /> Couldn’t load · Retry</button>
          ) : sLoading ? (
            <span className="igw-sk igw-sk-val" aria-hidden="true" />
          ) : (
            <span className="igw-bal-v">{money(stats.balance ?? 0)}</span>
          )}
          <div className="igw-bal-sub">
            {sLoading && !sError ? (
              <><span className="igw-sk igw-sk-sub" /><span className="igw-sk igw-sk-sub" /></>
            ) : (
              <>
                <span>Deposited <b>{money(stats.total_deposited ?? 0)}</b></span>
                <span>Withdrawn <b>{money(stats.total_withdrawn ?? 0)}</b></span>
              </>
            )}
          </div>
        </section>

        {/* Quick actions — Deposit (gold) + Withdraw (emerald) stand apart from nav */}
        <section className="igw-acts">
          {ACTIONS.map((a) => (
            <button key={a.key} className={`igw-act igw-act--${a.tone}`} onClick={() => nav(a.to)}>
              <span className="igw-act-ic">{a.Icon}</span>{a.label}
            </button>
          ))}
        </section>

        {/* C74 row */}
        <button className="igw-c74" onClick={() => nav("/ig/c74")}>
          <span className="igw-c74-ic"><img className="igw-c74-img" src="/images/v3/balance/c74-coin.png" alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} /></span>
          <span className="igw-c74-tx">
            {cLoading ? <span className="igw-sk igw-sk-c74" /> : <b>{fmtNum(c74)} C74</b>}
            <small>Token balance · tap to manage</small>
          </span>
          <span className="igw-c74-go">›</span>
        </button>

        {/* Shortcuts */}
        <div className="igw-sec">More</div>
        <section className="igw-list">
          {SHORTCUTS.map((s) => (
            <button key={s.key} className="igw-row" onClick={() => nav(s.to)}>
              <span className="igw-row-ic"><C7FeatureIcon slot={s.slot} ic={s.ic} size={38} svgSize={26} /></span>
              <span className="igw-row-tx"><b>{s.label}</b><small>{s.sub}</small></span>
              <span className="igw-row-go">›</span>
            </button>
          ))}
        </section>

        <IgSocialNotice variant="card" />
      </main>

      <IgTabBar active="wallet" />
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
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:54px; padding:0 10px;
  background:linear-gradient(180deg, rgba(7,24,15,.95), rgba(7,24,15,.5)); -webkit-backdrop-filter:blur(16px); backdrop-filter:blur(16px);
  border-bottom:1px solid var(--line); box-shadow:0 1px 0 rgba(240,201,74,.16), 0 10px 26px -18px rgba(0,0,0,.8); }
.ig-ttl { font-size:19px; font-weight:800; letter-spacing:.01em; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.igw-ic { background:none; border:none; color:#cdead9; cursor:pointer; display:grid; place-items:center; width:38px; height:38px; border-radius:11px; transition:background .18s, transform .12s; }
.igw-ic:hover { background:rgba(255,255,255,.05); } .igw-ic:active { transform:scale(.9); } .igw-ic:disabled { opacity:.55; }
.igw-spin { animation:igw-spin 1s linear infinite; }
@keyframes igw-spin { to { transform:rotate(360deg); } }
.ig-main { max-width:560px; margin:0 auto; padding:16px 14px; display:flex; flex-direction:column; gap:15px; }

/* Balance cabinet — deep gold-framed emerald + coin art + shimmering value */
.igw-bal { position:relative; overflow:hidden; border-radius:22px; padding:22px; border:1px solid transparent; color:var(--ink);
  background:
    radial-gradient(120% 120% at 100% 0%, rgba(240,201,74,0.16), transparent 52%),
    radial-gradient(120% 100% at 0% 0%, rgba(58,240,160,0.18), transparent 58%),
    linear-gradient(160deg, rgba(21,78,50,0.96), rgba(6,24,15,0.96));
  box-shadow:inset 0 0 0 1.4px rgba(240,201,74,0.5), inset 0 1.6px 0 rgba(255,255,255,0.28), inset 0 0 30px rgba(46,224,138,0.12), 0 0 26px -8px rgba(240,201,74,0.5), 0 24px 48px -22px rgba(0,0,0,0.88); }
.igw-bal-art { position:absolute; right:-6px; bottom:6px; width:150px; height:auto; z-index:0; pointer-events:none; object-fit:contain;
  filter:drop-shadow(0 8px 14px rgba(0,0,0,0.5)) saturate(1.08) brightness(1.03); animation:igwFloat 5s ease-in-out infinite;
  -webkit-mask:linear-gradient(90deg, transparent 0%, #000 34%); mask:linear-gradient(90deg, transparent 0%, #000 34%); }
.igw-bal-k { position:relative; z-index:1; display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:800; color:var(--grn); letter-spacing:.6px; }
.igw-bal-cur { width:18px; height:18px; object-fit:contain; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5)); }
.igw-bal-v { position:relative; z-index:1; display:block; font-size:35px; font-weight:900; letter-spacing:-1px; margin-top:4px; font-variant-numeric:tabular-nums;
  background-image:linear-gradient(100deg,#fff8e0 0%,#ffe9a8 22%,#f7d868 42%,#e0a93a 58%,#ffe9a8 80%,#fff8e0 100%); background-size:220% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; animation:igwGold 5.5s ease-in-out infinite; }
.igw-bal-err { position:relative; z-index:1; display:inline-flex; align-items:center; gap:7px; margin-top:8px; font-size:13px; font-weight:800; color:var(--loss);
  background:rgba(255,107,125,.1); border:1px solid rgba(255,107,125,.35); border-radius:11px; padding:9px 14px; cursor:pointer; }
.igw-bal-sub { position:relative; z-index:1; display:flex; gap:18px; margin-top:12px; font-size:12px; color:var(--mut); }
.igw-bal-sub b { color:var(--antique); font-weight:800; font-variant-numeric:tabular-nums; }

/* Quick actions — tone hierarchy */
.igw-acts { display:grid; grid-template-columns:repeat(4,1fr); gap:9px; }
.igw-act { position:relative; display:flex; flex-direction:column; align-items:center; gap:6px; padding:13px 4px; border-radius:14px; font-size:12px; font-weight:800; cursor:pointer; border:1px solid transparent; font-family:inherit; transition:transform .12s, filter .12s; }
.igw-act-ic { display:grid; place-items:center; }
.igw-act:active { transform:translateY(1.5px); filter:brightness(1.05); }
.igw-act--gold { color:#3a2708; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep));
  box-shadow:inset 0 1.5px 0 rgba(255,255,255,.62), inset 0 -3px 7px rgba(120,74,20,.22), 0 0 18px -3px rgba(240,201,74,.6), 0 9px 20px -9px rgba(0,0,0,.6); }
.igw-act--emerald { color:#04180e; background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a);
  box-shadow:inset 0 1.5px 0 rgba(255,255,255,.5), inset 0 -3px 7px rgba(0,0,0,.18), 0 0 16px -4px rgba(46,224,138,.6), 0 9px 20px -9px rgba(0,0,0,.6); }
.igw-act--glass { color:var(--ink); background:linear-gradient(180deg, rgba(19,60,40,.9), rgba(6,20,13,.94));
  box-shadow:inset 0 0 0 1.2px rgba(240,201,74,.34), inset 0 1.3px 0 rgba(255,255,255,.12), 0 12px 26px -16px rgba(0,0,0,.8); }
.igw-act--glass .igw-act-ic { color:var(--grn); }

/* C74 row + shortcut rows — gold-framed cabinets */
.igw-c74 { position:relative; display:flex; align-items:center; gap:13px; padding:15px; border-radius:18px; cursor:pointer; text-align:left; border:1px solid transparent; font-family:inherit; color:var(--ink);
  background:radial-gradient(120% 100% at 0% 0%, rgba(58,240,160,.14), transparent 56%), linear-gradient(165deg, rgba(20,66,44,.94), rgba(7,22,14,.96));
  box-shadow:inset 0 0 0 1.3px rgba(240,201,74,.44), inset 0 1.5px 0 rgba(255,255,255,.16), inset 0 0 22px rgba(46,224,138,.08), 0 0 18px -8px rgba(240,201,74,.4), 0 20px 42px -22px rgba(0,0,0,.86); transition:transform .12s, filter .12s; }
.igw-c74:active { transform:translateY(1px); filter:brightness(1.04); }
.igw-c74-ic { width:46px; height:46px; border-radius:13px; display:grid; place-items:center; color:#ffe9a8; overflow:hidden;
  background:radial-gradient(120% 120% at 50% 14%, #2a7d52, #0a2416 78%); border:1px solid var(--line); box-shadow:inset 0 1px 0 rgba(246,230,176,.3), 0 0 13px -3px rgba(46,224,138,.5), 0 5px 12px -5px rgba(0,0,0,.6); }
.igw-c74-img { width:42px; height:42px; object-fit:contain; display:block; filter:drop-shadow(0 2px 3px rgba(0,0,0,0.5)); }
.igw-c74-tx { flex:1; display:flex; flex-direction:column; gap:2px; } .igw-c74-tx b { font-size:16px; font-weight:800; color:var(--ink); } .igw-c74-tx small { font-size:12px; color:var(--mut); }
.igw-c74-go, .igw-row-go { color:var(--gold); font-size:22px; flex-shrink:0; }

.igw-sec { font-size:10.5px; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:var(--faint); margin:4px 2px -4px; }
.igw-list { display:flex; flex-direction:column; gap:9px; }
.igw-row { position:relative; display:flex; align-items:center; gap:13px; padding:13px 15px; border-radius:16px; cursor:pointer; text-align:left; border:1px solid transparent; font-family:inherit; color:var(--ink);
  background:linear-gradient(165deg, rgba(19,60,40,.9), rgba(6,20,13,.95));
  box-shadow:inset 0 0 0 1.2px rgba(240,201,74,.34), inset 0 1.4px 0 rgba(255,255,255,.11), 0 20px 42px -24px rgba(0,0,0,.86); transition:transform .12s, background .16s; }
.igw-row:hover { background:linear-gradient(165deg, rgba(22,66,44,.92), rgba(7,22,14,.96)); }
.igw-row:active { transform:translateY(1px); filter:brightness(1.04); }
.igw-row-ic { width:42px; height:42px; border-radius:12px; display:grid; place-items:center; color:#ffe9a8; flex-shrink:0;
  background:radial-gradient(120% 120% at 50% 14%, #2a7d52, #0a2416 78%); border:1px solid var(--line); box-shadow:inset 0 1px 0 rgba(246,230,176,.3), 0 0 13px -3px rgba(46,224,138,.5), 0 5px 12px -5px rgba(0,0,0,.6); }
.igw-row-tx { flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; } .igw-row-tx b { font-size:14px; font-weight:800; color:var(--ink); } .igw-row-tx small { font-size:12px; color:var(--mut); }

/* Skeletons (real loading state from the hooks) */
.igw-sk { position:relative; overflow:hidden; border-radius:8px; display:inline-block;
  background:linear-gradient(100deg, rgba(255,255,255,.05) 30%, rgba(255,255,255,.1) 50%, rgba(255,255,255,.05) 70%); background-size:200% 100%; animation:igwShim 1.4s ease-in-out infinite; }
.igw-sk-val { width:180px; height:38px; margin-top:6px; border-radius:11px; }
.igw-sk-sub { width:112px; height:13px; }
.igw-sk-c74 { width:96px; height:17px; margin-bottom:2px; }

@keyframes igwFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
@keyframes igwGold { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
@keyframes igwShim { from { background-position:200% 0; } to { background-position:-200% 0; } }

@media (prefers-reduced-motion:reduce){
  .igw-bal-art, .igw-bal-v, .igw-spin, .igw-sk { animation:none !important; transform:none !important; background-position:0% 50% !important; }
  .igw-act, .igw-c74, .igw-row, .igw-ic { transition:none !important; }
}
`;

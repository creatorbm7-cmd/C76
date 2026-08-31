// V2 Wallet — Module-3 "Premium Wallet Experience".
//
// A rich, premium wallet screen at /v3/wallet: balance hero, quick actions, a
// deposit "add funds" form (amount + presets + currency + method), a balance
// breakdown, and recent-activity placeholders.
//
// STRICT scope: presentational only. NO backend / Supabase / wallet / payment /
// auth calls — figures are static preview placeholders and the form does not
// submit anywhere (real deposit/withdraw wiring is Module-5, separately
// authorized). V1 is untouched; this lives only under /v2.

import { useEffect, useRef, useState } from "react";
import { usd as fmtUsd, num as fmtNum } from "@/lib/format";
import { useNavigate } from "react-router-dom";
import { useProfileStats } from "@/hooks/useProfileStats";
import { useC74 } from "@/hooks/useC74";
import WalletConnect from "@/components/wallet/WalletConnect";
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Repeat, ReceiptText, Wallet, Sparkles, Info, ChevronRight, ShieldCheck, Headphones, BadgeCheck, SlidersHorizontal } from "lucide-react";
import C7Icon from "@/components/c7/C7Icon";
import C7ErrorState from "@/components/c7/C7ErrorState";
import C7Asset from "@/components/c7/C7Asset";

// W-4: Wallet Analytics — the in/out/net figures below are REAL, derived from
// the user's live stats in-render. The former decorative sparkline and the fake
// "recent transactions" preview rows were removed (no mock data) — Recent
// Transactions now routes to the real /transactions history.

// W-5: Security & Support centre — entry points only (links to existing routes).
const SECURITY: Array<{ icon: React.ReactNode; label: string; sub: string; to: string }> = [
  { icon: <ShieldCheck size={16} />, label: "2FA", sub: "Extra login security", to: "/settings" },
  { icon: <BadgeCheck size={16} />, label: "KYC", sub: "Verify identity", to: "/kyc" },
  { icon: <SlidersHorizontal size={16} />, label: "Limits", sub: "Play responsibly", to: "/responsible" },
  { icon: <Headphones size={16} />, label: "Support", sub: "24/7 help centre", to: "/support" },
];

// USDT-denominated wallet (like V1) — always show "$", never "₹".
const usd = (n: number) => fmtUsd(n, { min: 2 });

export default function V2Wallet() {
  const nav = useNavigate();
  // W-6: real balances via the shared read-only stats hook
  // (rpc_user_stats; zeros when signed out; auto-refreshes on dtx:balance-updated).
  // Read-only — no writes, no payment. Analytics/transactions stay preview.
  const { stats, error: statsError, loading: statsLoading, refetch: refetchStats } = useProfileStats();
  const { summary: c74 } = useC74();
  const [soon, setSoon] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // W-1: luxury balance hero — subtle pointer-parallax 3D tilt (same 60fps
  // transform-only model as the V2 lobby hero). Disabled for reduced-motion.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--rx", `${(-py * 4).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${(px * 6).toFixed(2)}deg`);
      });
    };
    const reset = () => { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", reset);
    return () => { el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", reset); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="vw c7p-page">
      <style>{VW_CSS}</style>

      <header className="vw-top">
        <button className="vw-back" onClick={() => nav("/v3")} aria-label="Back to lobby"><ArrowLeft size={18} /></button>
        <div className="vw-brand">
          <span className="vw-brand-ic"><C7Asset slot="icon.wallet" size={22} fallback={<Wallet size={18} />} /></span>
          <div className="vw-brand-tx"><b>Wallet</b><small>Secure Vault</small></div>
        </div>
        <span className="vw-badge"><Sparkles size={10} /> Vault</span>
      </header>

      <main className="vw-main">
        {statsError && !statsLoading && (
          <C7ErrorState compact
            title="Couldn't load your balances"
            message="We couldn't reach your wallet data. Deposits and withdrawals still work — retry to refresh the numbers."
            onRetry={() => refetchStats()}
          />
        )}
        {/* Balance hero — luxury "bank card" (W-1: perspective tilt + EMV chip) */}
        <div className="vw-hero-wrap">
        <section className="vw-hero c7p-card-gold" ref={heroRef}>
          <span className="vw-hero-chip" aria-hidden="true" />
          <div className="vw-hero-shine" aria-hidden="true" />
          <span className="vw-hero-crown" aria-hidden="true"><C7Icon name="gem" size={22} /></span>
          <span className="vw-hero-k">Total balance</span>
          <div className="vw-hero-v">{statsError ? "—" : usd(stats.balance)}</div>
          <div className="vw-hero-sub">{statsError ? "Balance unavailable — tap retry below" : <>Deposited {usd(stats.total_deposited)} · Withdrawn {usd(stats.total_withdrawn)}</>}</div>
          <div className="vw-actions">
            <button className="vw-act" onClick={() => nav("/deposit")} aria-label="Deposit"><span className="vw-act-ic vw-ic-gold"><ArrowDownToLine size={17} /></span>Deposit</button>
            <button className="vw-act" onClick={() => nav("/withdraw")} aria-label="Withdraw"><span className="vw-act-ic"><ArrowUpFromLine size={17} /></span>Withdraw</button>
            <button className="vw-act vw-act-soon" onClick={() => setSoon(true)} aria-label="Swap — coming soon"><span className="vw-act-ic"><Repeat size={17} /></span>Swap<span className="vw-act-badge">soon</span></button>
            <button className="vw-act" onClick={() => nav("/transactions")} aria-label="Transaction history"><span className="vw-act-ic"><ReceiptText size={17} /></span>History</button>
          </div>
          {soon && <div className="vw-heronote" role="status"><Info size={12} /> Swap is coming soon — deposit or withdraw meanwhile.</div>}
        </section>
        </div>

        {/* Phase 1 — on-chain wallet connection (MetaMask / WalletConnect / Coinbase) */}
        <section className="vw-card c7p-panel">
          <div className="c7p-sec vw-sec"><span className="c7p-sec-ic"><C7Icon name="link" size={16} /></span><span className="c7p-sec-t">On-chain Wallet</span><span className="c7p-sec-rule" /></div>
          <WalletConnect />
        </section>

        {/* C74 token summary — the full C74 surface (mining · reputation · gas)
            lives in the Token Center; this is the wallet's at-a-glance view. */}
        <button type="button" className="vw-card c7p-panel vw-c74btn" onClick={() => nav("/c74/token")}>
          <div className="c7p-sec vw-sec"><span className="c7p-sec-ic"><C7Icon name="coin" size={16} /></span><span className="c7p-sec-t">C74 Token</span><span className="c7p-sec-rule" /><ChevronRight size={13} className="vw-sec-chev" /></div>
          <div className="vw-c74-top">
            <div className="vw-c74-bal">
              <span className="vw-c74-k">Your C74 balance</span>
              <b>{fmtNum(c74?.balance ?? 0)}</b>
            </div>
            <div className="vw-c74-side">
              <div className="vw-c74-row">Tier <b>{c74?.tier ?? "Spark"}</b></div>
              <div className="vw-c74-row">Gas saved <b>{usd(c74?.fee_saved_usdt_approx ?? 0)}</b></div>
            </div>
          </div>
          <div className="vw-c74-note">Open the C74 Token Center — mining, reputation &amp; more ›</div>
        </button>

        {/* Recent activity — routes to the real, live transaction history
            (deposits · withdrawals · bets · wins · bonuses). No preview rows. */}
        <section className="vw-card c7p-panel">
          <div className="c7p-sec vw-sec"><span className="c7p-sec-ic"><C7Icon name="receipt" size={16} /></span><span className="c7p-sec-t">Recent Transactions</span><span className="c7p-sec-rule" /></div>
          <p className="vw-tx-lead">Every deposit, withdrawal, bet, win &amp; bonus — live from your account.</p>
          <button className="c7p-btn-gold vw-tx-btn" onClick={() => nav("/transactions")}>
            <ReceiptText size={16} /> View transactions ›
          </button>
        </section>

        {/* Assets — balance breakdown, analytics & token */}
        <section className="vw-card c7p-panel">
          <div className="c7p-sec vw-sec"><span className="c7p-sec-ic"><C7Icon name="coin" size={16} /></span><span className="c7p-sec-t">Balance breakdown</span><span className="c7p-sec-rule" /></div>
          <div className="vw-bd">
            <div className="vw-bd-row"><span className="vw-dot" style={{ background: "#21c07e" }} />Main balance<b>{usd(stats.balance)}</b></div>
            <div className="vw-bd-row"><span className="vw-dot" style={{ background: "#37e29a" }} />Bonus<b>{usd(stats.locked)}</b></div>
            <div className="vw-bd-row"><span className="vw-dot" style={{ background: "#5fdda0" }} />Winnings<b>{usd(stats.total_won)}</b></div>
          </div>
        </section>

        {/* Wallet Analytics — real all-time in/out/net (no decorative sparkline) */}
        <section className="vw-card c7p-panel">
          <div className="c7p-sec vw-sec"><span className="c7p-sec-ic"><C7Icon name="chart" size={16} /></span><span className="c7p-sec-t">Wallet Analytics</span><span className="c7p-sec-rule" /></div>
          <div className="vw-anh"><span className="vw-anh-k">Money flow</span><span className="vw-anh-tag">all-time</span></div>
          <div className="vw-flow">
            <div className="vw-flow-c"><span className="vw-flow-k">Deposited</span><b style={{ color: "#37e29a" }}>{usd(stats.total_deposited)}</b></div>
            <div className="vw-flow-c"><span className="vw-flow-k">Withdrawn</span><b style={{ color: "#ff8089" }}>{usd(stats.total_withdrawn)}</b></div>
            <div className="vw-flow-c"><span className="vw-flow-k">Net</span><b style={{ color: "#92e9be" }}>{usd((stats.total_deposited || 0) - (stats.total_withdrawn || 0))}</b></div>
          </div>
        </section>

        {/* Security & Support centre */}
        <section className="vw-card c7p-panel">
          <div className="c7p-sec vw-sec"><span className="c7p-sec-ic"><C7Icon name="shield" size={16} /></span><span className="c7p-sec-t">Security &amp; Support</span><span className="c7p-sec-rule" /></div>
          <div className="vw-sec-grid">
            {SECURITY.map((s) => (
              <button key={s.label} className="vw-secc" onClick={() => nav(s.to)}>
                <span className="vw-secc-ic">{s.icon}</span>
                <span className="vw-secc-l">{s.label}</span>
                <span className="vw-secc-s">{s.sub}</span>
              </button>
            ))}
          </div>
        </section>

        <footer className="vw-foot"><Sparkles size={11} /> Balance &amp; money-flow are live · transactions open the real history · payments unchanged</footer>
      </main>
    </div>
  );
}

const VW_CSS = `
/* Root inherits the shared .c7p-page emerald "felt" ground (bright emerald +
   gold glow) — no bespoke backdrop; the c7p-* cards contrast richer over it. */
.vw { position: relative; min-height: 100vh; color: #eaf7ef; font-family: Inter, system-ui, sans-serif; padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px)); }
/* W-1: ambient floating orbs — same living-jungle language as the V2 lobby */
.vw-orbs { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.vw-orbs span { position: absolute; border-radius: 50%; filter: blur(32px); opacity: 0.5; will-change: transform; }
.vw-orbs span:nth-child(1) { width: 210px; height: 210px; left: -46px; top: 6%; background: radial-gradient(circle, rgba(47,226,154,0.5), transparent 70%); animation: vw-float 14s ease-in-out infinite; }
.vw-orbs span:nth-child(2) { width: 170px; height: 170px; right: -34px; top: 26%; background: radial-gradient(circle, rgba(47,226,154,0.4), transparent 70%); animation: vw-float 18s ease-in-out infinite reverse; }
.vw-orbs span:nth-child(3) { width: 150px; height: 150px; left: 28%; bottom: 8%; background: radial-gradient(circle, rgba(47,226,154,0.34), transparent 70%); animation: vw-float 16s ease-in-out infinite; }
@keyframes vw-float { 0%,100% { transform: translate(0,0); } 50% { transform: translate(22px,-26px); } }
.vw-top { position: sticky; top: 0; z-index: 3; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 16px;
  background: linear-gradient(180deg, rgba(10,20,15,0.94), rgba(10,20,15,0.55)); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(47,226,154,0.26); }
.vw-back { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; cursor: pointer; color: #dce8df; background: rgba(255,255,255,0.05); border: 1px solid rgba(47,226,154,0.28); }
/* Carved-stone brand lockup — consistent with Home/Casino/Rewards/Profile headers */
.vw-brand { flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0; }
.vw-brand-ic { flex: 0 0 auto; width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; color: #05230f;
  background: radial-gradient(circle at 36% 28%, #eafff4, #37e29a 40%, #159861 70%, #0c6b45 100%); border: 1.5px solid #caa23a;
  box-shadow: inset 0 2px 3px rgba(255,255,255,0.75), 0 0 15px rgba(202,162,58,0.5), inset 0 0 0 1px rgba(246,201,69,0.2); }
.vw-brand-tx { min-width: 0; }
.vw-brand-tx b { display: block; font-size: 15px; font-weight: 900; letter-spacing: 0.4px; line-height: 1.05; color: #f3ffe9; white-space: nowrap; }
.vw-brand-tx small { font-size: 9.5px; letter-spacing: 2px; text-transform: uppercase; color: rgba(220,232,223,0.6); }
.vw-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 900; letter-spacing: 1px; padding: 5px 9px; border-radius: 999px; color: #2a1c04; background: linear-gradient(180deg, #ffe9a8, #f6c945 55%, #d68a1e); box-shadow: 0 2px 6px -2px rgba(246,201,69,0.6), inset 0 1px 0 rgba(255,255,255,0.5); }
.vw-main { position: relative; z-index: 1; max-width: 560px; margin: 0 auto; padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 11px; }

.vw-hero-wrap { perspective: 1000px; }
/* Balance hero — the gold frame + emerald-glass body come from the shared
   .c7p-card-gold primitive; this rule keeps only the 3D tilt + padding so the
   luxury "bank card" reads on the V3 emerald+gold system (copper frame removed). */
.vw-hero { position: relative; overflow: hidden; border-radius: 20px; padding: 16px 16px 14px; text-align: center;
  transform-style: preserve-3d; transform: rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)); transition: transform .18s ease-out; }
/* gold EMV chip glyph — bright V3 gold metal + visible contact grid so it reads
   as a real premium bank-card chip and echoes the hero's gold bevel */
.vw-hero-chip { position: absolute; top: 16px; left: 16px; z-index: 3; width: 32px; height: 24px; border-radius: 5px; pointer-events: none; opacity: 0.95;
  background:
    linear-gradient(0deg, transparent 45%, rgba(122,78,14,0.7) 45% 55%, transparent 55%),
    linear-gradient(90deg, transparent 44%, rgba(122,78,14,0.7) 44% 56%, transparent 56%),
    linear-gradient(135deg, #fff6d5 0%, #ffe9a8 38%, #f6c945 64%, #c6851e 100%);
  box-shadow: inset 0 0 0 1px rgba(122,78,14,0.5), inset 0 1px 0 rgba(255,255,255,0.55), 0 1px 3px rgba(0,0,0,0.5); }
.vw-hero-crown { position: absolute; top: 12px; right: 14px; z-index: 3; font-size: 22px; pointer-events: none; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.5)); animation: vw-crownfloat 3.4s ease-in-out infinite; }
@keyframes vw-crownfloat { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-5px) rotate(4deg); } }
.vw-hero-shine { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.12) 50%, transparent 62%); background-size: 260% 100%; animation: vw-shine 6s ease-in-out infinite; }
@keyframes vw-shine { 0% { background-position: 180% 0; } 100% { background-position: -80% 0; } }
.vw-hero-k, .vw-hero-v, .vw-hero-sub, .vw-actions { position: relative; z-index: 2; }
.vw-hero-k { font-size: 11px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; color: #9db3a4; }
.vw-hero-v { font-size: 47px; font-weight: 900; letter-spacing: -1.6px; color: #fff; margin: 1px 0 2px; font-variant-numeric: tabular-nums; line-height: 1.02; text-shadow: 0 0 26px rgba(47,226,154,0.55), 0 2px 5px rgba(0,0,0,0.35); }
.vw-hero-sub { font-size: 10.5px; color: rgba(220,232,223,0.65); font-weight: 700; }
.vw-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 13px; }
.vw-act { display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; color: #dce8df; background: none; border: none; cursor: pointer; font-family: inherit; }
.vw-act-ic { width: 43px; height: 43px; border-radius: 14px; display: grid; place-items: center; color: #dce8df;
  background: radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.12), transparent 55%), linear-gradient(160deg, #149c63, #0a4a30);
  border: 1px solid rgba(47,226,154,0.34); box-shadow: inset 0 1.5px 0 rgba(246,230,176,0.2), inset 0 0 0 1px rgba(47,226,154,0.12), 0 6px 14px -6px rgba(0,0,0,0.6); transition: transform .1s ease; }
.vw-act:active .vw-act-ic { transform: translateY(2px) scale(0.96); }
.vw-ic-gold { color: #05230f; background: radial-gradient(120% 100% at 50% 10%, rgba(255,255,255,0.7), transparent 52%), linear-gradient(180deg, #5fdda0, #21c07e); border-color: rgba(190,243,108,0.7); }
/* W-7: Swap "soon" affordance + hero status note */
.vw-act-soon { position: relative; opacity: 0.82; }
.vw-act-badge { position: absolute; top: -3px; right: 12px; font-size: 7px; font-weight: 900; letter-spacing: 0.3px; text-transform: uppercase; color: #0a140f; padding: 1px 5px; border-radius: 999px; background: linear-gradient(180deg, #5fdda0, #21c07e); box-shadow: 0 2px 5px -1px rgba(0,0,0,0.5); }
.vw-heronote { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 12px; font-size: 11px; font-weight: 600; color: rgba(220,232,223,0.8); background: rgba(0,0,0,0.28); border: 1px solid rgba(47,226,154,0.24); border-radius: 11px; padding: 8px 11px; }

/* W-2: VIP Banking Lounge */
.vw-vip { position: relative; overflow: hidden; display: flex; align-items: center; gap: 13px; width: 100%; text-align: left; cursor: pointer; font-family: inherit; color: #dce8df;
  border-radius: 18px; padding: 15px; border: 1.5px solid rgba(47,226,154,0.5);
  background: radial-gradient(120% 90% at 0% -10%, rgba(47,226,154,0.24), transparent 55%), linear-gradient(160deg, #0e7048, #05301e);
  box-shadow: 0 14px 28px -12px rgba(0,0,0,0.66), inset 0 1px 0 rgba(246,230,176,0.18); transition: transform .1s ease; }
.vw-vip:active { transform: scale(0.985); }
.vw-vip-rays { position: absolute; inset: -80% -20% auto -20%; height: 240%; pointer-events: none; opacity: 0.4; z-index: 0;
  background: conic-gradient(from 0deg, transparent, rgba(47,226,154,0.3) 12deg, transparent 26deg, rgba(220,232,223,0.24) 44deg, transparent 62deg); animation: vw-viprays 20s linear infinite; }
@keyframes vw-viprays { to { transform: rotate(360deg); } }
.vw-vip-crown { position: relative; z-index: 1; width: 44px; height: 44px; flex-shrink: 0; border-radius: 13px; display: grid; place-items: center; color: #05230f;
  background: radial-gradient(circle at 36% 28%, #e6fbf1, #37e29a 42%, #21c07e 66%, #159861 100%); border: 1.5px solid #0a5638; box-shadow: inset 0 2px 3px rgba(255,255,255,0.7), 0 0 14px rgba(47,226,154,0.5); }
.vw-vip-b { position: relative; z-index: 1; flex: 1; min-width: 0; }
.vw-vip-top { display: flex; align-items: center; gap: 8px; }
.vw-vip-top b { font-size: 14px; font-weight: 900; }
.vw-vip-tier { font-size: 9px; font-weight: 900; letter-spacing: 0.5px; color: #05230f; padding: 2px 7px; border-radius: 999px; background: linear-gradient(180deg, #5fdda0, #21c07e); }
.vw-vip-bar { height: 6px; margin: 8px 0 6px; border-radius: 99px; background: rgba(0,0,0,0.42); overflow: hidden; }
.vw-vip-bar i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #5fdda0, #21c07e); box-shadow: 0 0 8px rgba(47,226,154,0.7); }
.vw-vip-sub { font-size: 10.5px; font-weight: 700; color: rgba(220,232,223,0.72); } .vw-vip-sub span { color: #92e9be; font-weight: 900; }
.vw-vip-chev { position: relative; z-index: 1; color: rgba(220,232,223,0.6); flex-shrink: 0; }
/* W-2: AI Banking Insight */
.vw-ai { border-radius: 18px; padding: 15px; background: radial-gradient(130% 60% at 100% 0%, rgba(47,226,154,0.14), transparent 55%), linear-gradient(160deg, #0f7a4e, #05301e);
  border: 1px solid rgba(47,226,154,0.3); box-shadow: inset 0 0 0 1px rgba(47,226,154,0.1), 0 12px 26px -12px rgba(0,0,0,0.6); }
.vw-ai-h { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; color: #9db3a4; }
.vw-ai-dot { width: 8px; height: 8px; border-radius: 50%; background: #21c07e; box-shadow: 0 0 8px #21c07e; animation: vw-blink 1.6s ease-in-out infinite; }
@keyframes vw-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
.vw-ai-refresh { margin-left: auto; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; color: #9db3a4; background: rgba(0,0,0,0.3); border: 1px solid rgba(47,226,154,0.28); }
.vw-ai-tx { font-size: 13.5px; line-height: 1.55; color: #dce8df; margin: 10px 0 8px; font-weight: 500; }
.vw-ai-f { font-size: 9.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: rgba(220,232,223,0.45); }

/* 3D HDR carved-stone frame (the wallet "framework") — copper/jade bevel (gold
   reserved for the balance hero), top specular + corner jade bloom over a 4-stop
   stone slab, gold-ivory top edge, deep inner AO, jade rim glow, deeper drop. */
/* Cards use the shared .c7p-panel primitive (emerald glass + gold hairline +
   soft depth); this rule keeps only geometry (copper temple frame removed). */
.vw-card { position: relative; border-radius: 16px; padding: 13px 14px; }
/* c7p-sec section header used inside a card — neutralise its default 20px top margin */
.vw-sec { margin: 1px 0 9px; }
.vw-sec-chev { flex: none; margin-left: 4px; color: rgba(220,232,223,0.6); }
/* C74 card: reset the native <button> so it reads as a panel */
.vw-c74btn { display: block; width: 100%; text-align: left; font: inherit; color: inherit; cursor: pointer; }
/* Recent Transactions → real history route-away */
.vw-tx-lead { margin: 0 0 10px; font-size: 12px; font-weight: 600; color: rgba(220,232,223,0.72); line-height: 1.4; }
.vw-tx-btn { width: 100%; }
/* W-3: Payment Methods carousel */
.vw-sec-h { margin-bottom: 10px; }
.vw-pmrail { display: flex; gap: 10px; overflow-x: auto; padding: 2px 2px 8px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.vw-pmrail::-webkit-scrollbar { display: none; }
.vw-pm { position: relative; flex: 0 0 108px; display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 13px 8px; border-radius: 16px; cursor: pointer; font-family: inherit; color: #dce8df;
  background: radial-gradient(120% 60% at 50% -14%, rgba(146,233,190,0.16), transparent 55%), linear-gradient(160deg, #149c63, #0a4a30);
  border: 1px solid rgba(47,226,154,0.3); box-shadow: inset 0 1.5px 0 rgba(246,230,176,0.16), 0 8px 18px -8px rgba(0,0,0,0.6); transition: transform .1s ease; }
.vw-pm:active { transform: translateY(2px) scale(0.96); }
.vw-pm-plate { width: 46px; height: 46px; border-radius: 13px; display: grid; place-items: center; padding: 9px; overflow: hidden; background: linear-gradient(180deg, #ffffff, #e9f5ec);
  box-shadow: 0 6px 12px -4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.9), 0 0 0 1.5px rgba(47,226,154,0.55); color: #0f7a4e; }
.vw-pm-plate svg { width: 100%; height: 100%; display: block; }
.vw-pp { font-size: 9px; font-weight: 900; color: #0d2a5c; letter-spacing: -0.3px; }
.vw-pm-l { font-size: 11px; font-weight: 900; text-align: center; white-space: nowrap; }
.vw-pm-tag { font-size: 8.5px; font-weight: 700; color: rgba(220,232,223,0.6); text-align: center; white-space: nowrap; }
/* W-3: Rewards & Cashback centre */
.vw-rewards { display: flex; flex-direction: column; gap: 2px; }
.vw-reward { display: flex; align-items: center; gap: 11px; padding: 11px 2px; background: none; border: none; cursor: pointer; font-family: inherit; color: #dce8df; text-align: left; }
.vw-reward + .vw-reward { border-top: 1px solid rgba(255,255,255,0.06); }
.vw-reward-ic { width: 38px; height: 38px; flex-shrink: 0; border-radius: 12px; display: grid; place-items: center; color: #92e9be;
  background: radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.1), transparent 55%), linear-gradient(160deg, #0e7048, #05301e); border: 1px solid rgba(47,226,154,0.34); box-shadow: 0 0 0 1px rgba(47,226,154,0.14); }
.vw-reward-b { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.vw-reward-l { font-size: 13px; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vw-reward-s { font-size: 10.5px; font-weight: 700; color: rgba(255,255,255,0.5); }
.vw-reward-cta { flex-shrink: 0; font-size: 11px; font-weight: 900; color: #05230f; padding: 7px 13px; border-radius: 999px; background: linear-gradient(180deg, #5fdda0, #21c07e); box-shadow: 0 3px 0 #0f7a4e; }
.vw-reward:active .vw-reward-cta { transform: translateY(2px); box-shadow: 0 1px 0 #0f7a4e; }
.vw-card-h { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; color: #ffe093; text-shadow: 0 1px 3px rgba(0,0,0,0.3); margin-bottom: 12px; }
.vw-lbl { display: block; font-size: 10.5px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; color: #9db3a4; margin-bottom: 7px; }
.vw-amt { display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(47,226,154,0.32); border-radius: 14px; padding: 4px 6px 4px 14px; }
.vw-amt-cur { font-size: 18px; font-weight: 900; color: rgba(255,255,255,0.6); }
.vw-amt-in { flex: 1; min-width: 0; background: none; border: none; outline: none; color: #fff; font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; padding: 10px 0; }
.vw-cur { display: flex; gap: 3px; background: rgba(0,0,0,0.3); border-radius: 10px; padding: 3px; }
.vw-cur-b { font-size: 11px; font-weight: 800; padding: 6px 9px; border-radius: 8px; cursor: pointer; border: none; color: rgba(220,232,223,0.7); background: none; font-family: inherit; }
.vw-cur-b.on { color: #eafff3; text-shadow: 0 1px 1px rgba(0,0,0,0.45); background: linear-gradient(180deg, #2f8455, #164026); box-shadow: inset 0 1px 0 rgba(150,235,185,0.3); }
.vw-presets { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; margin-top: 10px; }
.vw-preset { font-size: 12px; font-weight: 800; padding: 9px 0; border-radius: 11px; cursor: pointer; color: #dce8df; background: rgba(255,255,255,0.05); border: 1px solid rgba(47,226,154,0.24); font-family: inherit; }
.vw-preset.on { color: #eafff3; border-color: transparent; text-shadow: 0 1px 1px rgba(0,0,0,0.45); background: linear-gradient(180deg, #2f8455, #164026); box-shadow: inset 0 1px 0 rgba(150,235,185,0.3); }
.vw-methods { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.vw-method { display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; font-weight: 800; padding: 11px 0; border-radius: 12px; cursor: pointer; color: #dce8df; background: rgba(255,255,255,0.05); border: 1px solid rgba(47,226,154,0.24); font-family: inherit; }
.vw-method.on { border-color: #37e29a; background: radial-gradient(120% 100% at 50% 0%, rgba(47,226,154,0.18), transparent 60%), rgba(47,226,154,0.1); box-shadow: 0 0 0 1px rgba(47,226,154,0.45); }
.vw-cta { width: 100%; margin-top: 16px; border: none; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 900; color: #ffffff; text-shadow: 0 1px 2px rgba(0,0,0,0.55), 0 0 1px rgba(0,0,0,0.4); padding: 14px; border-radius: 14px;
  background: radial-gradient(120% 100% at 50% -18%, rgba(198,246,210,0.26), transparent 46%), linear-gradient(180deg, #2f8455, #1f6440 42%, #164026 72%, #0f2e1c);
  box-shadow: 0 5px 0 #0a4a2d, inset 0 2px 0 rgba(150,235,185,0.42), inset 0 -9px 15px -6px rgba(0,0,0,0.5), 0 12px 22px -8px rgba(47,226,154,0.4); transition: transform .08s ease; }
.vw-cta:active { transform: translateY(4px); box-shadow: 0 1px 0 #0a4a2d, inset 0 2px 0 rgba(150,235,185,0.32); }
.vw-note { display: flex; align-items: center; gap: 6px; margin-top: 11px; font-size: 11px; font-weight: 600; color: rgba(220,232,223,0.7); background: rgba(255,255,255,0.04); border: 1px solid rgba(47,226,154,0.22); border-radius: 10px; padding: 9px 11px; }
/* W-4: Wallet Analytics */
.vw-anh { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.vw-anh-k { font-size: 11px; font-weight: 800; color: rgba(220,232,223,0.7); }
.vw-anh-tag { font-size: 9px; font-weight: 900; letter-spacing: 0.5px; color: #0a140f; padding: 2px 8px; border-radius: 999px; background: linear-gradient(180deg, #37e29a, #159861); }
.vw-spark { width: 100%; height: 64px; display: block; }
.vw-flow { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
.vw-flow-c { display: flex; flex-direction: column; gap: 2px; align-items: center; padding: 8px 4px; border-radius: 12px; text-align: center;
  background: rgba(0,0,0,0.26); border: 1px solid rgba(47,226,154,0.2); }
.vw-flow-k { font-size: 8.5px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase; color: rgba(255,255,255,0.5); }
.vw-flow-c b { font-size: 13px; font-weight: 900; font-variant-numeric: tabular-nums; }
/* USDT payment mark (fixes a dangling icon reference) */
.vw-usdt { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; font-size: 14px; font-weight: 900; color: #05230f; background: linear-gradient(180deg, #5fdda0, #159861); box-shadow: inset 0 1px 0 rgba(255,255,255,0.5); }
/* P5: C74 Token analytics card */
.vw-c74-top { display: flex; align-items: stretch; gap: 12px; }
.vw-c74-bal { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 2px; }
.vw-c74-k { font-size: 9px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; color: rgba(220,232,223,0.6); }
.vw-c74-bal b { font-size: 28px; font-weight: 900; font-variant-numeric: tabular-nums; background: linear-gradient(180deg, #e6fbf1, #37e29a); -webkit-background-clip: text; background-clip: text; color: transparent; }
.vw-c74-side { display: flex; flex-direction: column; justify-content: center; gap: 5px; min-width: 118px; }
.vw-c74-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; font-weight: 700; color: rgba(220,232,223,0.75); }
.vw-c74-row b { font-size: 12px; font-weight: 900; color: #92e9be; }
.vw-c74-supbar { height: 7px; border-radius: 999px; margin: 12px 0 5px; overflow: hidden; background: rgba(0,0,0,0.4); box-shadow: inset 0 1px 2px rgba(0,0,0,0.5); }
.vw-c74-supbar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #159861, #21c07e 60%, #5fdda0); box-shadow: 0 0 10px rgba(47,226,154,0.6); }
.vw-c74-sup { display: flex; justify-content: space-between; font-size: 9.5px; font-weight: 800; color: rgba(220,232,223,0.6); }
.vw-c74-note { margin-top: 8px; font-size: 9.5px; font-weight: 700; color: rgba(47,226,154,0.7); text-align: center; }
/* W-4: Recent Transactions timeline */
.vw-sec-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.vw-seeall { background: none; border: none; cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 800; color: #5fdda0; }
.vw-tl { display: flex; flex-direction: column; }
.vw-tlrow { position: relative; display: flex; align-items: center; gap: 12px; padding: 11px 0 11px 4px; }
.vw-tlnode { position: relative; flex-shrink: 0; display: grid; place-items: center; }
/* vertical connector line through the nodes */
.vw-tlrow:not(:last-child) .vw-tlnode::after { content: ""; position: absolute; top: 34px; left: 50%; transform: translateX(-50%); width: 2px; height: calc(100% + 18px); background: linear-gradient(180deg, rgba(47,226,154,0.4), rgba(47,226,154,0.12)); }
.vw-tlic { width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; font-size: 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(47,226,154,0.28); box-shadow: 0 0 0 1px rgba(47,226,154,0.18), 0 4px 10px -4px rgba(0,0,0,0.6); }
.vw-tlb { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.vw-tll { font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vw-tlm { font-size: 10px; color: rgba(255,255,255,0.45); font-weight: 700; }
.vw-tlamt { font-size: 13px; font-weight: 900; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.vw-bd { display: flex; flex-direction: column; gap: 2px; }
.vw-bd-row { display: flex; align-items: center; gap: 9px; font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.78); padding: 6px 2px; }
.vw-bd-row + .vw-bd-row { border-top: 1px solid rgba(255,255,255,0.055); }
.vw-bd-row b { margin-left: auto; color: #fff; font-variant-numeric: tabular-nums; }
.vw-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.vw-acts { display: flex; flex-direction: column; gap: 2px; }
.vw-actrow { display: flex; align-items: center; gap: 11px; padding: 10px 2px; }
.vw-actrow + .vw-actrow { border-top: 1px solid rgba(255,255,255,0.055); }
.vw-actrow-ic { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; font-size: 17px; flex-shrink: 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(47,226,154,0.24); box-shadow: 0 0 0 1px rgba(47,226,154,0.18); }
.vw-actrow-b { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.vw-actrow-l { font-size: 12.5px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vw-actrow-m { font-size: 10px; color: rgba(255,255,255,0.45); font-weight: 700; }
.vw-actrow-amt { font-size: 13px; font-weight: 900; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.vw-foot { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 8px; font-size: 10px; font-weight: 600; color: rgba(220,232,223,0.45); text-align: center; }
/* W-5: Promotions banner */
.vw-promo { position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; cursor: pointer; font-family: inherit; color: #0a140f;
  border-radius: 18px; padding: 14px 15px; border: none;
  background: radial-gradient(120% 100% at 0% 0%, rgba(255,255,255,0.5), transparent 50%), linear-gradient(120deg, #5fdda0, #21c07e 55%, #159861);
  box-shadow: 0 14px 28px -10px rgba(47,226,154,0.55), inset 0 1px 0 rgba(255,255,255,0.7); }
.vw-promo:active { transform: scale(0.985); }
.vw-promo-sheen { position: absolute; top: 0; left: -60%; width: 45%; height: 100%; transform: skewX(-20deg); pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); animation: vw-promosheen 4.5s ease-in-out infinite; }
@keyframes vw-promosheen { 0% { left: -60%; } 55%,100% { left: 130%; } }
.vw-promo-ic { position: relative; z-index: 1; width: 44px; height: 44px; flex-shrink: 0; border-radius: 13px; display: grid; place-items: center; color: #fff; background: linear-gradient(160deg, #159861, #0a5638); box-shadow: inset 0 1px 0 rgba(255,255,255,0.3); }
.vw-promo-b { position: relative; z-index: 1; flex: 1; min-width: 0; }
.vw-promo-b b { display: block; font-size: 14px; font-weight: 900; } .vw-promo-b small { font-size: 10.5px; font-weight: 700; color: rgba(42,22,8,0.72); }
.vw-promo-cta { position: relative; z-index: 1; flex-shrink: 0; font-size: 12px; font-weight: 900; color: #fff; padding: 8px 13px; border-radius: 999px; background: linear-gradient(180deg, #159861, #0a5638); box-shadow: 0 3px 0 rgba(6,32,18,0.7); }
/* W-5: Daily bonus */
.vw-daily { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 15px; border-radius: 18px;
  background: radial-gradient(120% 80% at 100% 0%, rgba(47,226,154,0.16), transparent 55%), linear-gradient(160deg, #0f7a4e, #05301e); border: 1px solid rgba(47,226,154,0.34); box-shadow: inset 0 0 0 1px rgba(47,226,154,0.12), 0 12px 26px -12px rgba(0,0,0,0.6); }
.vw-daily-l { display: flex; align-items: center; gap: 12px; min-width: 0; }
.vw-daily-coin { font-size: 28px; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4)); animation: vw-dailyfloat 3.2s ease-in-out infinite; }
@keyframes vw-dailyfloat { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-4px) rotate(4deg); } }
.vw-daily-tx b { display: block; font-size: 14px; font-weight: 900; } .vw-daily-tx small { font-size: 10.5px; font-weight: 700; color: rgba(220,232,223,0.6); }
.vw-daily-cta { flex-shrink: 0; border: none; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 900; color: #05230f; padding: 10px 20px; border-radius: 999px; background: linear-gradient(180deg, #5fdda0, #21c07e); box-shadow: 0 4px 0 #0f7a4e; }
.vw-daily-cta:active { transform: translateY(2px); box-shadow: 0 2px 0 #0f7a4e; }
/* W-5: Security & Support grid */
.vw-sec-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.vw-secc { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 10px 4px; border-radius: 13px; cursor: pointer; font-family: inherit; color: #dce8df;
  background: radial-gradient(120% 60% at 50% -14%, rgba(146,233,190,0.12), transparent 55%), linear-gradient(160deg, #0e7048, #05301e); border: 1px solid rgba(47,226,154,0.24); transition: transform .1s ease; }
.vw-secc:active { transform: scale(0.94); }
.vw-secc-ic { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; color: #92e9be; background: rgba(255,255,255,0.06); border: 1px solid rgba(47,226,154,0.3); }
.vw-secc-l { font-size: 11px; font-weight: 900; } .vw-secc-s { font-size: 8px; font-weight: 700; color: rgba(220,232,223,0.5); text-align: center; line-height: 1.15; }
@media (prefers-reduced-motion: reduce) {
  .vw-hero-shine, .vw-orbs span, .vw-hero-crown, .vw-vip-rays, .vw-ai-dot, .vw-promo-sheen, .vw-daily-coin { animation: none !important; }
  .vw-hero { transition: none; transform: none !important; }
}
`;

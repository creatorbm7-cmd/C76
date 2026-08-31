// AdminTreasury (/admin/treasury) — READ-ONLY treasury console.
// Reads the treasury_summary / c74_reserve_status views and wallet aggregates
// for a live snapshot. NO write actions, NO money movement, NO enable controls.
// Mounted behind AdminGuard in App.tsx.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Summary = {
  total_hot?: number; total_cold?: number; total_platform_funds?: number;
  total_user_balances?: number; pending_withdrawals?: number; available_profit?: number;
};
type Reserve = { reserve_usdt?: number; redeemable_liability_usdt?: number; coverage_ratio?: number; invariant_ok?: boolean };

const n2 = (v: unknown) => Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminTreasury() {
  const nav = useNavigate();
  const [sum, setSum] = useState<Summary | null>(null);
  const [res, setRes] = useState<Reserve | null>(null);
  const [wallets, setWallets] = useState<{ count: number; total: number }>({ count: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const db = supabase as unknown as { from: (t: string) => any };
        const [s, r, w] = await Promise.all([
          db.from("treasury_summary").select("*").maybeSingle(),
          db.from("c74_reserve_status").select("*").maybeSingle(),
          db.from("casino_wallets").select("balance"),
        ]);
        if (!live) return;
        setSum((s.data ?? null) as Summary | null);
        setRes((r.data ?? null) as Reserve | null);
        const rows = (w.data ?? []) as { balance: number | string }[];
        setWallets({ count: rows.length, total: rows.reduce((a, x) => a + Number(x.balance ?? 0), 0) });
      } catch (e) {
        if (live) setErr(e instanceof Error ? e.message : "load failed");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  const platformFunds = Number(sum?.total_platform_funds ?? 0);
  const userBal = Number(sum?.total_user_balances ?? wallets.total);
  const solvent = platformFunds >= userBal;

  return (
    <div className="adt">
      <style>{CSS}</style>
      <header className="adt-top">
        <button className="adt-back" onClick={() => nav(-1)} aria-label="Back"><ArrowLeft size={20} /></button>
        <h1>Treasury <b>Console</b></h1>
        <span className="adt-ro"><Lock size={11} /> READ-ONLY</span>
      </header>
      <main className="adt-main">
        <div className="adt-banner">Read-only snapshot — no write actions, no money movement, no enable controls.</div>

        {loading ? (
          <div className="adt-empty">Loading live figures…</div>
        ) : err ? (
          <div className="adt-empty">Couldn’t load treasury data: {err}</div>
        ) : (
          <>
            <div className="adt-sec">Treasury</div>
            <div className="adt-tiles">
              <Tile k="PLATFORM FUNDS" v={"$" + n2(platformFunds)} s={`hot $${n2(sum?.total_hot)} · cold $${n2(sum?.total_cold)}`} />
              <Tile k="USER BALANCES" v={"$" + n2(userBal)} s={`${wallets.count} wallets`} tone={solvent ? undefined : "dn"} />
              <Tile k="C74 RESERVE" v={"$" + n2(res?.reserve_usdt)} s={`coverage ${Number(res?.coverage_ratio ?? 0).toFixed(1)}×`} tone="g" />
              <Tile k="PENDING W/D" v={"$" + n2(sum?.pending_withdrawals)} s={`profit $${n2(sum?.available_profit)}`} />
            </div>

            <div className="adt-sec">Solvency &amp; gates</div>
            <div className="adt-card">
              <Gate ok={solvent} t="Treasury solvency" s={`Platform funds $${n2(platformFunds)} vs user balances $${n2(userBal)}`} />
              <Gate ok={Boolean(res?.invariant_ok)} t="C74 reserve invariant" s={`Redeemable liability $${n2(res?.redeemable_liability_usdt)}`} />
              <Gate ok={false} t="Real-money engine" s="Interlocked — blocked by licence · PSP · solvent reserve" />
            </div>

            <div className="adt-note">Figures from live DB (read-only). Real-money enablement stays OFF; this console cannot change it.</div>
          </>
        )}
      </main>
    </div>
  );
}

function Tile({ k, v, s, tone }: { k: string; v: string; s: string; tone?: "g" | "dn" }) {
  return (
    <div className={`adt-tile${tone ? " " + tone : ""}`}>
      <span className="k">{k}</span>
      <b className="v">{v}</b>
      <span className="s">{s}</span>
    </div>
  );
}
function Gate({ ok, t, s }: { ok: boolean; t: string; s: string }) {
  return (
    <div className={`adt-gate ${ok ? "ok" : "no"}`}>
      <span className="g">{ok ? "✓" : "✕"}</span>
      <div><b>{t}</b><small>{s}</small></div>
    </div>
  );
}

const CSS = `
.adt { --gold:#f0c94a; --gold-l:#fff4cf; --gold-d:#c68a2e; --line:rgba(240,201,74,0.18); --hair:rgba(240,201,74,0.3); --ink:#eafff4; --mut:#8fbfa6; --grn:#2ee08a; --red:#ff6b7d;
  min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif;
  background:radial-gradient(120% 60% at 50% -10%,#0b2417,#050d09 55%,#04080a); }
.adt * { box-sizing:border-box; }
.adt-top { position:sticky; top:0; z-index:10; display:flex; align-items:center; gap:10px; padding:12px 14px;
  background:linear-gradient(180deg,rgba(9,26,17,0.96),rgba(7,18,12,0.75)); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); }
.adt-back { width:34px; height:34px; border-radius:10px; border:1px solid var(--hair); background:rgba(8,20,14,0.6); color:var(--gold); display:grid; place-items:center; cursor:pointer; }
.adt-top h1 { flex:1; font-size:17px; font-weight:900; }
.adt-top h1 b { background:linear-gradient(90deg,var(--gold-d),var(--gold) 50%,var(--gold-l)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.adt-ro { display:inline-flex; align-items:center; gap:5px; font-size:10px; font-weight:900; letter-spacing:1px; color:#120a02; background:linear-gradient(90deg,var(--gold),var(--gold-l)); padding:5px 9px; border-radius:999px; }
.adt-main { max-width:760px; margin:0 auto; padding:14px; }
.adt-banner { padding:12px 14px; border-radius:12px; font-size:12.5px; line-height:1.5; color:#f0e4bf; background:rgba(240,201,74,0.07); border:1px solid var(--hair); }
.adt-sec { font-size:12px; font-weight:900; letter-spacing:1.2px; color:var(--gold); text-transform:uppercase; margin:20px 4px 10px; }
.adt-tiles { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
.adt-tile { padding:13px 12px; border-radius:14px; background:linear-gradient(160deg,#0e2418,rgba(6,15,10,0.9)); border:1px solid var(--line); }
.adt-tile .k { font-size:10px; font-weight:800; letter-spacing:.6px; color:var(--mut); }
.adt-tile .v { display:block; font-size:22px; font-weight:900; margin-top:5px; }
.adt-tile .s { font-size:11px; color:var(--mut); }
.adt-tile.g .v { background:linear-gradient(92deg,var(--gold),var(--gold-l)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.adt-tile.dn .v { color:var(--red); }
.adt-card { border-radius:16px; border:1px solid var(--line); overflow:hidden; background:linear-gradient(160deg,#0b1a12,rgba(6,15,10,0.92)); }
.adt-gate { display:flex; align-items:center; gap:11px; padding:13px 15px; border-top:1px solid rgba(240,201,74,0.08); font-size:13px; }
.adt-gate:first-child { border-top:none; }
.adt-gate .g { width:22px; height:22px; border-radius:7px; display:grid; place-items:center; font-size:12px; flex:0 0 auto; }
.adt-gate.ok .g { background:rgba(46,224,138,0.16); color:var(--grn); }
.adt-gate.no .g { background:rgba(255,107,125,0.16); color:var(--red); }
.adt-gate small { display:block; color:var(--mut); font-size:11px; margin-top:1px; }
.adt-note { margin-top:16px; font-size:11px; color:var(--mut); text-align:center; }
.adt-empty { padding:44px; text-align:center; color:var(--mut); }
@media (max-width:560px){ .adt-tiles { grid-template-columns:repeat(2,1fr); } }
`;

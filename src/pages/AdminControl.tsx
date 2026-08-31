// AdminControl (/admin/control) — LOCKED, READ-ONLY control panel.
// Displays the money switches as locked, with the gate blocking each, plus the
// live platform_settings flags (read-only). It contains NO enable control and
// performs NO writes. Real-money activation lives elsewhere and is not linked
// from here. Mounted behind AdminGuard in App.tsx.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CONTROLS: { ic: string; t: string; gate: string; warn?: boolean }[] = [
  { ic: "💵", t: "Real-money engine", gate: "Interlocked · blocked by: licence, approved PSP, solvent reserve" },
  { ic: "⬇️", t: "Deposits", gate: "Locked · blocked by: approved regulated PSP" },
  { ic: "⬆️", t: "Withdrawals", gate: "Held OFF · reserve not solvent", warn: true },
  { ic: "🎰", t: "IGAMING launch (2J)", gate: "Interlocked at 501 · IGAMING_ENABLED = false" },
  { ic: "🤖", t: "Auto-payout", gate: "Blocked by: solvent reserve + dual-control" },
  { ic: "🔁", t: "C74 → USDT swap", gate: "Blocked by: funded redemption pool" },
];
const WATCH = new Set(["mode", "kyc_auto_approve", "withdrawal_auto_approve", "auto_payout_enabled", "c74_phase2_enabled"]);
const RISKY = (k: string, v: string) =>
  (k === "mode" && v === "live") || ((k === "kyc_auto_approve" || k === "withdrawal_auto_approve") && v === "true");

export default function AdminControl() {
  const nav = useNavigate();
  const [flags, setFlags] = useState<{ key: string; value: string }[]>([]);
  const [note, setNote] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const db = supabase as unknown as { from: (t: string) => any };
        const { data } = await db.from("platform_settings").select("key, value");
        if (!live) return;
        const rows = ((data ?? []) as { key: string; value: string }[]).filter((r) => WATCH.has(r.key));
        rows.sort((a, b) => a.key.localeCompare(b.key));
        setFlags(rows);
      } catch { /* read-only; ignore */ }
    })();
    return () => { live = false; };
  }, []);

  return (
    <div className="adc">
      <style>{CSS}</style>
      <header className="adc-top">
        <button className="adc-back" onClick={() => nav(-1)} aria-label="Back"><ArrowLeft size={20} /></button>
        <h1>Control <b>Panel</b></h1>
        <span className="adc-ro"><Lock size={11} /> LOCKED</span>
      </header>
      <main className="adc-main">
        <div className="adc-banner">
          <b>Controls are locked.</b> This panel is read-only — it reflects live state and cannot enable anything.
          Every money switch stays OFF/interlocked until the go-live gates are met (licence · approved PSP · funded, solvent reserve).
        </div>

        <div className="adc-sec">Money controls · locked</div>
        <div className="adc-card">
          {CONTROLS.map((c, i) => (
            <div key={c.t}>
              <div className="adc-ctl">
                <span className="adc-ic">{c.ic}</span>
                <div className="adc-m"><b>{c.t} <Lock size={11} /></b><small className={c.warn ? "warn" : "gate"}>{c.gate}</small></div>
                <button className="adc-tg" onClick={() => setNote(note === i ? null : i)} aria-label="Locked">🔒</button>
              </div>
              {note === i && <div className="adc-locknote">🔒 Locked: {c.gate}</div>}
            </div>
          ))}
        </div>

        <div className="adc-sec">Live config flags (read-only)</div>
        <div className="adc-flags">
          {flags.length === 0 ? (
            <div className="adc-empty">No flags loaded.</div>
          ) : flags.map((f) => (
            <div className="adc-flag" key={f.key}>
              <span>{f.key}</span>
              <b className={RISKY(f.key, f.value) ? "risk" : "no"}>{f.value}{RISKY(f.key, f.value) ? " ⚠️" : ""}</b>
            </div>
          ))}
        </div>

        <div className="adc-note">
          Read-only · no write actions. Enabling money controls is blocked until the go-live gates are met — this panel cannot do it.
        </div>
      </main>
    </div>
  );
}

const CSS = `
.adc { --gold:#f0c94a; --gold-l:#fff4cf; --gold-d:#c68a2e; --line:rgba(240,201,74,0.18); --hair:rgba(240,201,74,0.3); --ink:#eafff4; --mut:#8fbfa6; --grn:#2ee08a; --red:#ff6b7d; --amb:#f0b84a;
  min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif;
  background:radial-gradient(120% 60% at 50% -10%,#0b2417,#050d09 55%,#04080a); }
.adc * { box-sizing:border-box; }
.adc-top { position:sticky; top:0; z-index:10; display:flex; align-items:center; gap:10px; padding:12px 14px;
  background:linear-gradient(180deg,rgba(9,26,17,0.96),rgba(7,18,12,0.75)); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); }
.adc-back { width:34px; height:34px; border-radius:10px; border:1px solid var(--hair); background:rgba(8,20,14,0.6); color:var(--gold); display:grid; place-items:center; cursor:pointer; }
.adc-top h1 { flex:1; font-size:17px; font-weight:900; }
.adc-top h1 b { background:linear-gradient(90deg,var(--gold-d),var(--gold) 50%,var(--gold-l)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.adc-ro { display:inline-flex; align-items:center; gap:5px; font-size:10px; font-weight:900; letter-spacing:1px; color:#120a02; background:linear-gradient(90deg,var(--gold),var(--gold-l)); padding:5px 9px; border-radius:999px; }
.adc-main { max-width:760px; margin:0 auto; padding:14px; }
.adc-banner { display:block; padding:13px 15px; border-radius:14px; font-size:12.5px; line-height:1.55; color:#ffd7dd; background:rgba(255,107,125,0.08); border:1px solid rgba(255,107,125,0.35); }
.adc-banner b { color:#fff; }
.adc-sec { font-size:12px; font-weight:900; letter-spacing:1.2px; color:var(--gold); text-transform:uppercase; margin:22px 4px 11px; }
.adc-card { border-radius:16px; border:1px solid var(--line); overflow:hidden; background:linear-gradient(160deg,#0b1a12,rgba(6,15,10,0.92)); }
.adc-ctl { display:flex; align-items:center; gap:13px; padding:15px; border-top:1px solid rgba(240,201,74,0.08); }
.adc-card > div:first-child .adc-ctl { border-top:none; }
.adc-ic { width:40px; height:40px; border-radius:12px; display:grid; place-items:center; font-size:19px; flex:0 0 auto;
  background:radial-gradient(120% 120% at 50% 15%,rgba(240,201,74,0.14),rgba(8,20,14,0.7)); border:1px solid var(--line); }
.adc-m { flex:1; min-width:0; }
.adc-m b { font-size:14px; font-weight:800; display:flex; align-items:center; gap:6px; }
.adc-m small { display:block; font-size:11.5px; margin-top:3px; }
.adc-m .gate { color:var(--red); font-weight:700; }
.adc-m .warn { color:var(--amb); font-weight:700; }
.adc-tg { width:52px; height:30px; border-radius:999px; flex:0 0 auto; border:1px solid var(--line); background:rgba(255,255,255,0.08); color:#04120b; font-size:12px; cursor:not-allowed; display:grid; place-items:center; }
.adc-locknote { font-size:11px; color:var(--gold); padding:0 15px 12px; }
.adc-flags { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
.adc-flag { display:flex; justify-content:space-between; align-items:center; padding:11px 13px; border-radius:12px; background:rgba(8,18,12,0.55); border:1px solid var(--line); font-size:12.5px; }
.adc-flag span { color:var(--mut); }
.adc-flag b.risk { color:var(--amb); } .adc-flag b.no { color:var(--mut); }
.adc-note { margin-top:18px; font-size:11px; color:var(--mut); text-align:center; line-height:1.6; }
.adc-empty { padding:20px; text-align:center; color:var(--mut); grid-column:1/-1; }
@media (max-width:560px){ .adc-flags { grid-template-columns:1fr; } }
`;

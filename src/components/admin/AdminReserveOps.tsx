// C74 Reserve Ops — dual-control reserve funding console (admin).
//
// Read + act surface for the segregated C74 backing reserve:
//   • reserve status (real reserve_usdt vs redeemable liability, coverage,
//     invariant, gap to the $10k target) + the registered Base wallet,
//   • the dual-control contribution workflow: PROPOSE a contribution (amount +
//     on-chain tx ref), then a DIFFERENT admin CONFIRMs (or rejects) it — only
//     confirm writes to the reserve ledger,
//   • the reserve-ledger history.
//
// All data comes from admin-gated RPCs (c74_reserve_ops_overview /
// _propose_/_confirm_/_reject_contribution). No money moves on-chain here — a
// contribution is only ever RECORDED after the operator has sent real USDT on
// Base to the reserve address and pasted the verified tx hash. The peg, caps,
// flag and any user balance are untouched by this tab.

import { useState, useEffect, useCallback } from "react";
import { num as fmt } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, ShieldCheck, Wallet, Scale, Target, PlusCircle,
  Check, X, Copy, ExternalLink, Landmark,
} from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

interface ReserveRequest {
  id: string; amount_usdt: number; period: string | null; tx_ref: string | null;
  note: string | null; status: string; proposed_by: string | null; proposed_at: string;
  decided_by: string | null; decided_at: string | null; decision_note: string | null;
  reserve_ledger_id: number | null;
}
interface LedgerEntry { id: number; delta_usdt: number; kind: string; reference: string | null; created_at: string; }
interface Overview {
  reserve_usdt: number; verified_reserve_usdt: number; opening_pool_usdt: number;
  redeemable_liability_usdt: number; redeemable_c74: number;
  coverage_ratio: number; invariant_ok: boolean; peg_rate: number; reserve_target_usdt: number;
  wallet: { address: string | null; chain: string; label?: string; is_active?: boolean };
  requests: ReserveRequest[]; ledger: LedgerEntry[];
}

const RESERVE_ADDRESS = "0x3abDa6554C5e2F75da8d3452eECea20fFd94B7fa";
const short = (s: string | null, head = 10, tail = 8) =>
  !s ? "—" : s.length <= head + tail ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
const day = (s: string | null) => (s ? String(s).slice(0, 10) : "—");

const STATUS_PILL: Record<string, { bg: string; fg: string; ring: string }> = {
  pending:   { bg: "rgba(245,158,11,0.12)", fg: "#b45309", ring: "rgba(245,158,11,0.4)" },
  confirmed: { bg: "rgba(22,163,74,0.12)",  fg: "#15803d", ring: "rgba(22,163,74,0.4)" },
  rejected:  { bg: "rgba(244,63,94,0.12)",  fg: "#be123c", ring: "rgba(244,63,94,0.4)" },
};

export default function AdminReserveOps() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [ov, setOv] = useState<Overview | null>(null);

  // propose form
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState("");
  const [txRef, setTxRef] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("c74_reserve_ops_overview");
    if (error) toast.error(error.message);
    else setOv(data as Overview);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const propose = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount (USDT)"); return; }
    if (!txRef.trim()) { toast.error("Enter the on-chain tx hash (Base) that funded the reserve"); return; }
    setBusy("propose");
    const { error } = await (supabase.rpc as any)("c74_reserve_propose_contribution", {
      p_amount: amt,
      p_period: period.trim() || null,
      p_tx_ref: txRef.trim(),
      p_note: note.trim() || null,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Contribution proposed — a different admin must confirm it");
    setAmount(""); setPeriod(""); setTxRef(""); setNote("");
    load();
  };

  const confirm = async (id: string) => {
    setBusy(id);
    const { error } = await (supabase.rpc as any)("c74_reserve_confirm_contribution", { p_request_id: id });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Confirmed — recorded to the reserve ledger");
    load();
  };

  const reject = async (id: string) => {
    const reason = window.prompt("Reason for rejecting this contribution?") ?? "";
    setBusy(id);
    const { error } = await (supabase.rpc as any)("c74_reserve_reject_contribution", { p_request_id: id, p_reason: reason || null });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Rejected");
    load();
  };

  const copy = (t: string) => { navigator.clipboard?.writeText(t); toast.success("Copied"); };

  // "Verified" = tx-backed on-chain segregated USDC only. The legacy opening
  // pool has no on-chain proof and is NOT counted toward the real reserve.
  const verified = ov?.verified_reserve_usdt ?? 0;
  const gap = ov ? Math.max(0, ov.reserve_target_usdt - verified) : 0;
  const pct = ov && ov.reserve_target_usdt ? Math.min(100, (verified / ov.reserve_target_usdt) * 100) : 0;
  const pending = ov?.requests.filter((r) => r.status === "pending") ?? [];

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />
      <style>{`.ro-card{background:#fff;border:1px solid rgba(15,23,42,0.07);border-radius:16px}
        .ro-in{background:#fff;border:1px solid rgba(15,23,42,0.12);border-radius:10px;padding:9px 11px;font-size:13px;width:100%;color:#0f172a;font-variant-numeric:tabular-nums}
        .ro-in:focus{outline:none;border-color:rgba(22,163,74,0.5);box-shadow:0 0 0 3px rgba(22,163,74,0.12)}
        .ro-mono{font-variant-numeric:tabular-nums;letter-spacing:-.01em}`}</style>

      <div className="space-y-5">
        <V8PageHero
          eyebrow="Finance · C74 Backing Reserve"
          title="RESERVE OPS"
          tone="emerald"
          icon={<ShieldCheck className="h-5 w-5" />}
          badges={[
            { label: ov?.invariant_ok ? "INVARIANT OK" : "INVARIANT BREACH", tone: ov?.invariant_ok ? "emerald" : "rose", dot: true },
            { label: `${fmt(ov?.coverage_ratio ?? 0)}× COVERAGE`, tone: "cyan" },
            { label: `${pending.length} PENDING`, tone: pending.length ? "amber" : "emerald" },
          ]}
          subtitle={<>Real, segregated USDT behind redeemable C74. A contribution is <b>recorded only after</b> real USDT lands on Base at the reserve address — then <b>two different admins</b> (propose → confirm) sign it off. Nothing here moves money or flips the phase-2 flag.</>}
          actions={
            <V8HeroBtn variant="ghost" onClick={load} disabled={loading} title="Refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </V8HeroBtn>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <V8StatCard icon={<Wallet className="h-4 w-4" />} label="Verified reserve" value={verified} sub="on-chain, tx-backed USDC" tone="emerald" prefix="$" delay={0} />
          <V8StatCard icon={<Scale className="h-4 w-4" />} label="Redeemable liability" value={ov?.redeemable_liability_usdt ?? 0} sub={`${fmt(ov?.redeemable_c74 ?? 0)} C74 @ $${ov?.peg_rate ?? 0.01}`} tone="cyan" prefix="$" delay={80} />
          <V8StatCard icon={<Target className="h-4 w-4" />} label="Gap to $10k" value={gap} sub={`${pct.toFixed(1)}% of target (verified)`} tone="amber" prefix="$" delay={160} />
          <V8StatCard icon={<ShieldCheck className="h-4 w-4" />} label="Coverage" value={Math.round(ov?.coverage_ratio ?? 0)} sub={ov?.invariant_ok ? "reserve ≥ liability" : "UNDER-COVERED"} tone={ov?.invariant_ok ? "emerald" : "rose"} delay={240} />
        </div>

        {ov && (ov.opening_pool_usdt ?? 0) > 0 && (
          <div className="rounded-xl px-4 py-2.5 text-[11px] flex items-center gap-2 flex-wrap"
               style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.28)", color: "#92600b" }}>
            <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
            <span><b>Verified</b> = tx-backed on-chain USDC only (<b>${fmt(verified)}</b>). Ledger total is <b>${fmt(ov.reserve_usdt)}</b>, which includes a legacy <b>${fmt(ov.opening_pool_usdt)}</b> opening-pool entry that has <b>no on-chain segregation proof</b> and is <b>not</b> reported as real reserve.</span>
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : !ov ? (
          <div className="p-10 text-center text-slate-400 text-xs">No reserve data</div>
        ) : (
          <>
            {/* Registered wallet */}
            <div className="ro-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Landmark className="h-4 w-4" style={{ color: "#15803d" }} />
                <h3 className="text-sm font-black text-slate-800">Registered reserve wallet</h3>
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(22,163,74,0.1)", color: "#15803d", border: "1px solid rgba(22,163,74,0.3)" }}>
                  {ov.wallet.chain}{ov.wallet.is_active ? " · ACTIVE" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="ro-mono text-xs md:text-sm text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">{ov.wallet.address ?? "not registered"}</code>
                {ov.wallet.address && (
                  <>
                    <button onClick={() => copy(ov.wallet.address!)} className="av8-action-btn p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Copy"><Copy className="h-3.5 w-3.5" /></button>
                    <a href={`https://basescan.org/address/${ov.wallet.address}`} target="_blank" rel="noreferrer" className="av8-action-btn p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" title="View on BaseScan"><ExternalLink className="h-3.5 w-3.5" /></a>
                  </>
                )}
              </div>
              {ov.wallet.label && <p className="text-[11px] text-slate-500 mt-2">{ov.wallet.label}</p>}
              <p className="text-[11px] text-slate-400 mt-2">Fund only with real operator USDC/USDT on <b>Base</b> to this address — never user deposits, never a typed-in number.</p>
            </div>

            {/* Propose a contribution */}
            <div className="ro-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <PlusCircle className="h-4 w-4" style={{ color: "#15803d" }} />
                <h3 className="text-sm font-black text-slate-800">Propose a contribution</h3>
                <span className="ml-auto text-[10px] text-slate-400">step 1 of 2 · a different admin confirms</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Amount (USDT)</label>
                  <input className="ro-in mt-1" inputMode="decimal" placeholder="e.g. 50" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Period (YYYY-MM)</label>
                  <input className="ro-in mt-1" placeholder="2026-08" value={period} onChange={(e) => setPeriod(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Base tx hash</label>
                  <input className="ro-in mt-1" placeholder="0x… (verified on-chain deposit)" value={txRef} onChange={(e) => setTxRef(e.target.value)} />
                </div>
                <div className="md:col-span-4">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Note</label>
                  <input className="ro-in mt-1" placeholder="source, e.g. operator capital / GGR contribution" value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={propose} disabled={busy === "propose"}
                  className="av8-action-btn px-3.5 py-2 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#16a34a,#0b7a3f)", boxShadow: "0 4px 18px -4px rgba(22,163,74,0.6)" }}>
                  {busy === "propose" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />} Propose
                </button>
                <span className="text-[11px] text-slate-400">Verify the tx on BaseScan first — USDC/USDT on Base to the reserve address.</span>
              </div>
            </div>

            {/* Contribution requests */}
            <div className="ro-card overflow-hidden">
              <div className="flex items-center gap-2 p-4 pb-2">
                <ShieldCheck className="h-4 w-4" style={{ color: "#b45309" }} />
                <h3 className="text-sm font-black text-slate-800">Contribution requests</h3>
                <span className="ml-auto text-[11px] text-slate-400">{ov.requests.length} total · {pending.length} pending</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider font-bold">Amount</th>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Status</th>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Tx</th>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Proposed</th>
                      <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ov.requests.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">No contribution requests yet — propose one above after a verified on-chain deposit.</td></tr>
                    ) : ov.requests.map((r) => {
                      const p = STATUS_PILL[r.status] ?? STATUS_PILL.pending;
                      return (
                        <tr key={r.id} className="av8-row border-b border-slate-50">
                          <td className="px-4 py-2.5 ro-mono font-bold text-slate-800">${fmt(r.amount_usdt)}<span className="text-slate-400 font-normal">{r.period ? ` · ${r.period}` : ""}</span></td>
                          <td className="px-3 py-2.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: p.bg, color: p.fg, border: `1px solid ${p.ring}` }}>{r.status.toUpperCase()}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            {r.tx_ref ? (
                              <a href={`https://basescan.org/tx/${r.tx_ref}`} target="_blank" rel="noreferrer" className="ro-mono text-xs text-emerald-700 hover:underline inline-flex items-center gap-1">{short(r.tx_ref, 6, 6)}<ExternalLink className="h-3 w-3" /></a>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">{day(r.proposed_at)}<br /><span className="text-slate-300 ro-mono">{short(r.proposed_by, 6, 4)}</span></td>
                          <td className="px-4 py-2.5 text-right">
                            {r.status === "pending" ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button onClick={() => confirm(r.id)} disabled={busy === r.id} title="Confirm (must be a different admin than proposer)"
                                  className="av8-action-btn px-2.5 py-1 rounded-md text-[11px] font-bold text-white flex items-center gap-1 disabled:opacity-40" style={{ background: "linear-gradient(135deg,#16a34a,#0b7a3f)" }}>
                                  {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Confirm
                                </button>
                                <button onClick={() => reject(r.id)} disabled={busy === r.id} title="Reject"
                                  className="av8-action-btn px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 disabled:opacity-40" style={{ background: "rgba(244,63,94,0.1)", color: "#be123c", border: "1px solid rgba(244,63,94,0.3)" }}>
                                  <X className="h-3 w-3" /> Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">{r.decided_by ? `by ${short(r.decided_by, 6, 4)}` : ""} {day(r.decided_at)}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reserve ledger */}
            <div className="ro-card overflow-hidden">
              <div className="flex items-center gap-2 p-4 pb-2">
                <Scale className="h-4 w-4" style={{ color: "#0e7490" }} />
                <h3 className="text-sm font-black text-slate-800">Reserve ledger</h3>
                <span className="ml-auto text-[11px] text-slate-400">{ov.ledger.length} entries</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider font-bold">Δ USDT</th>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Kind</th>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Reference</th>
                      <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider font-bold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ov.ledger.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs">No ledger entries</td></tr>
                    ) : ov.ledger.map((l) => (
                      <tr key={l.id} className="av8-row border-b border-slate-50">
                        <td className="px-4 py-2.5 ro-mono font-bold" style={{ color: l.delta_usdt >= 0 ? "#15803d" : "#be123c" }}>{l.delta_usdt >= 0 ? "+" : ""}{fmt(l.delta_usdt)}</td>
                        <td className="px-3 py-2.5"><span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{l.kind}</span></td>
                        <td className="px-3 py-2.5 text-xs text-slate-500 max-w-md truncate" title={l.reference ?? ""}>{l.reference ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right text-xs text-slate-500">{day(l.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

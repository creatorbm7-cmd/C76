// Operator Profit — sweepable-surplus accounting + dual-control payout console.
//
// Read + act surface for LEGITIMATE operator-profit extraction, kept strictly
// separate from user funds and the C74 reserve:
//   • the sweepable surplus, shown WITH every deduction (platform funds − user
//     liabilities − pending payouts − C74 redeemable liability − in-flight
//     operator payouts),
//   • a dual-control payout lifecycle: PROPOSE → a DIFFERENT admin APPROVES →
//     admin executes the payout OFF-PLATFORM on the real rail → RECORD its real
//     tx/reference id → post-payout RECONCILE.
//
// This tab never moves money. No auto-sweep, no mint, no relabel, no conversion.
// If the available surplus is ≤ 0, proposing a payout is impossible (the RPC
// refuses and the form is disabled). User balances, pending withdrawals, the C74
// reserve and the phantom quarantine are never a profit source.

import { useState, useEffect, useCallback } from "react";
import { num as fmt } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, Banknote, Scale, Wallet, Coins, PlusCircle,
  Check, X, Send, ClipboardCheck, ShieldAlert, TrendingUp, Lock,
  Landmark, BadgeCheck,
} from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

interface Surplus {
  total_platform_funds: number; total_hot: number; total_cold: number;
  user_liabilities_usdt: number; user_liabilities_quarantined_usdt: number;
  pending_payouts_usdt: number; c74_redeemable_liability_usdt: number;
  c74_reserve_held_usdt: number; c74_verified_reserve_usdt: number;
  fee_revenue_cumulative_usdt: number; outstanding_operator_payouts_usdt: number;
  gross_surplus_usdt: number; available_surplus_usdt: number;
}
interface PayoutRequest {
  id: number; amount_usdt: number; rail: string; destination: string | null;
  status: string; snapshot_available_usdt: number | null; tx_reference: string | null;
  proposed_by: string | null; proposed_at: string; approved_by: string | null;
  approved_at: string | null; recorded_at: string | null; reconciled_at: string | null;
  reconcile_note: string | null; reject_reason: string | null; note: string | null;
  executing_at: string | null; execution_error: string | null;
}
interface AutoStatus { treasury_address?: string; usdt_balance?: number; enabled?: boolean; auto_cap_usdt?: number; }
interface Destination {
  id: number; rail: string; label: string; masked_ref: string | null; status: string;
  added_by: string | null; added_at: string; verified_by: string | null; verified_at: string | null;
}
interface Overview { surplus: Surplus; requests: PayoutRequest[]; destinations: Destination[]; generated_at: string; }

const short = (s: string | null, head = 6, tail = 4) =>
  !s ? "—" : s.length <= head + tail ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
const day = (s: string | null) => (s ? String(s).slice(0, 10) : "—");
const RAILS: Record<string, string> = { bank_fiat: "Bank (fiat)", crypto_usdt: "Crypto (USDT)", other: "Other" };

const STATUS_PILL: Record<string, { bg: string; fg: string; ring: string }> = {
  proposed:   { bg: "rgba(245,158,11,0.12)", fg: "#b45309", ring: "rgba(245,158,11,0.4)" },
  approved:   { bg: "rgba(37,99,235,0.12)",  fg: "#1d4ed8", ring: "rgba(37,99,235,0.4)" },
  executing:  { bg: "rgba(14,165,233,0.12)", fg: "#0369a1", ring: "rgba(14,165,233,0.4)" },
  recorded:   { bg: "rgba(139,92,246,0.12)", fg: "#6d28d9", ring: "rgba(139,92,246,0.4)" },
  reconciled: { bg: "rgba(22,163,74,0.12)",  fg: "#15803d", ring: "rgba(22,163,74,0.4)" },
  rejected:   { bg: "rgba(244,63,94,0.12)",  fg: "#be123c", ring: "rgba(244,63,94,0.4)" },
  failed:     { bg: "rgba(244,63,94,0.12)",  fg: "#be123c", ring: "rgba(244,63,94,0.4)" },
  cancelled:  { bg: "rgba(100,116,139,0.12)",fg: "#475569", ring: "rgba(100,116,139,0.4)" },
};

export default function AdminOperatorProfit() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [ov, setOv] = useState<Overview | null>(null);
  const [autoStatus, setAutoStatus] = useState<AutoStatus | null>(null);

  // propose form
  const [amount, setAmount] = useState("");
  const [destId, setDestId] = useState("");
  const [note, setNote] = useState("");

  // add-destination form
  const [dRail, setDRail] = useState("bank_fiat");
  const [dLabel, setDLabel] = useState("");
  const [dMasked, setDMasked] = useState("");
  const [dDetail, setDDetail] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("admin_operator_profit_overview");
    if (error) toast.error(error.message);
    else setOv(data as Overview);
    // Best-effort: automation state + treasury float (edge fn may not be deployed on previews).
    try {
      const { data: st } = await supabase.functions.invoke("operator-payout-execute", { body: { action: "status" } });
      setAutoStatus((st as AutoStatus) ?? null);
    } catch { setAutoStatus(null); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const s = ov?.surplus;
  const available = s?.available_surplus_usdt ?? 0;
  const verifiedDests = ov?.destinations.filter((d) => d.status === "verified") ?? [];
  const canPropose = available > 0 && verifiedDests.length > 0;

  const propose = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount (USDT)"); return; }
    if (amt > available) { toast.error(`Amount exceeds available surplus ($${fmt(available)})`); return; }
    if (!destId) { toast.error("Select a verified payout destination"); return; }
    setBusy("propose");
    const { error } = await (supabase.rpc as any)("operator_payout_propose", {
      p_amount: amt, p_destination_id: Number(destId),
      p_note: note.trim() || null,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Payout proposed — a different admin must approve it");
    setAmount(""); setDestId(""); setNote("");
    load();
  };

  const addDest = async () => {
    if (!dLabel.trim()) { toast.error("Enter a label for the destination"); return; }
    const details = dDetail.trim()
      ? (dRail === "crypto_usdt" ? { address: dDetail.trim() } : { beneficiary: dDetail.trim() })
      : {};
    setBusy("adddest");
    const { error } = await (supabase.rpc as any)("operator_payout_dest_add", {
      p_rail: dRail, p_label: dLabel.trim(), p_masked_ref: dMasked.trim() || null, p_details: details,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Destination added — a different admin must verify it");
    setDLabel(""); setDMasked(""); setDDetail("");
    load();
  };

  const verifyDest = async (id: number) => {
    setBusy(`d${id}`);
    const { error } = await (supabase.rpc as any)("operator_payout_dest_verify", { p_id: id, p_note: null });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Destination verified");
    load();
  };

  const disableDest = async (id: number) => {
    setBusy(`d${id}`);
    const { error } = await (supabase.rpc as any)("operator_payout_dest_disable", { p_id: id });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Destination disabled");
    load();
  };

  const approve = async (id: number) => {
    setBusy(String(id));
    const { error } = await (supabase.rpc as any)("operator_payout_approve", { p_request_id: id });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Approved — now execute the payout on the real rail, then Record its tx id");
    load();
  };

  const record = async (id: number) => {
    const ref = window.prompt("Real transaction / reference ID (bank UTR or on-chain tx hash) for this payout:") ?? "";
    if (!ref.trim()) { toast.error("A real tx/reference ID is required"); return; }
    setBusy(String(id));
    const { error } = await (supabase.rpc as any)("operator_payout_record", { p_request_id: id, p_tx_reference: ref.trim() });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Recorded with tx reference — reconcile after the balances settle");
    load();
  };

  const reconcile = async (id: number) => {
    const notev = window.prompt("Post-payout reconciliation note (optional):") ?? "";
    setBusy(String(id));
    const { error } = await (supabase.rpc as any)("operator_payout_reconcile", { p_request_id: id, p_note: notev.trim() || null });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Reconciled — books verified solvent after payout");
    load();
  };

  const reject = async (id: number) => {
    const reason = window.prompt("Reason for rejecting this payout?") ?? "";
    setBusy(String(id));
    const { error } = await (supabase.rpc as any)("operator_payout_reject", { p_request_id: id, p_reason: reason || null });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Rejected");
    load();
  };

  const execute = async (id: number) => {
    if (!window.confirm("Send this payout ON-CHAIN now (USDT-TRC20) to the verified wallet? This moves real money and cannot be undone.")) return;
    setBusy(String(id));
    const { data, error } = await supabase.functions.invoke("operator-payout-execute", { body: { action: "execute", request_id: id } });
    setBusy(null);
    if (error) { toast.error(error.message); load(); return; }
    const d = data as any;
    if (d?.disabled) toast.error("Automation is disabled — enable operator_payout_automation_enabled first");
    else if (d?.error) toast.error(String(d.error));
    else if (d?.ok && d?.paid) toast.success(`Sent ${fmt(d.paid)} USDT · tx ${String(d.tx_hash).slice(0, 12)}…`);
    else if (d?.needs_reconcile) toast.error(`Uncertain outcome — parked as failed, verify on-chain. tx ${String(d.tx_hash).slice(0, 12)}…`);
    load();
  };

  const pending = ov?.requests.filter((r) => r.status === "proposed" || r.status === "approved" || r.status === "recorded" || r.status === "executing") ?? [];

  // Deduction rows for the "how surplus is computed" transparency card.
  const deductions = s ? [
    { label: "Platform funds held (synced, on-chain)", value: s.total_platform_funds, sign: "+" as const, hint: `hot $${fmt(s.total_hot)} · cold $${fmt(s.total_cold)}` },
    { label: "User withdrawable liabilities", value: s.user_liabilities_usdt, sign: "−" as const, hint: "owed to users — never profit" },
    { label: "Pending / approved withdrawals", value: s.pending_payouts_usdt, sign: "−" as const, hint: "already owed out" },
    { label: "C74 redeemable liability", value: s.c74_redeemable_liability_usdt, sign: "−" as const, hint: `reserve backing · held $${fmt(s.c74_reserve_held_usdt)} (verified $${fmt(s.c74_verified_reserve_usdt)})` },
    { label: "Operator payouts in flight", value: s.outstanding_operator_payouts_usdt, sign: "−" as const, hint: "approved/recorded, not yet reflected" },
  ] : [];

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />
      <style>{`.op-card{background:#fff;border:1px solid rgba(15,23,42,0.07);border-radius:16px}
        .op-in{background:#fff;border:1px solid rgba(15,23,42,0.12);border-radius:10px;padding:9px 11px;font-size:13px;width:100%;color:#0f172a;font-variant-numeric:tabular-nums}
        .op-in:focus{outline:none;border-color:rgba(37,99,235,0.5);box-shadow:0 0 0 3px rgba(37,99,235,0.12)}
        .op-mono{font-variant-numeric:tabular-nums;letter-spacing:-.01em}`}</style>

      <div className="space-y-5">
        <V8PageHero
          eyebrow="Finance · Operator Profit"
          title="OPERATOR PROFIT"
          tone="emerald"
          icon={<Banknote className="h-5 w-5" />}
          badges={[
            { label: canPropose ? "SURPLUS AVAILABLE" : "NO SWEEPABLE SURPLUS", tone: canPropose ? "emerald" : "rose", dot: true },
            { label: `$${fmt(available)} AVAILABLE`, tone: "cyan" },
            { label: `${pending.length} OPEN`, tone: pending.length ? "amber" : "emerald" },
          ]}
          subtitle={<>Only a <b>positive, verified surplus</b> — platform funds minus user liabilities, pending payouts and the C74 reserve — can become an operator payout. This console <b>records</b> payouts; it never moves money. Two different admins sign off (propose → approve), you pay out on the real rail, then record the tx id and reconcile.</>}
          actions={
            <V8HeroBtn variant="ghost" onClick={load} disabled={loading} title="Refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </V8HeroBtn>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <V8StatCard icon={<TrendingUp className="h-4 w-4" />} label="Available surplus" value={available} sub="sweepable now" tone={canPropose ? "emerald" : "rose"} prefix="$" delay={0} />
          <V8StatCard icon={<Wallet className="h-4 w-4" />} label="User liabilities" value={s?.user_liabilities_usdt ?? 0} sub="owed to users" tone="cyan" prefix="$" delay={80} />
          <V8StatCard icon={<Scale className="h-4 w-4" />} label="Pending payouts" value={s?.pending_payouts_usdt ?? 0} sub="withdrawals in queue" tone="amber" prefix="$" delay={160} />
          <V8StatCard icon={<Coins className="h-4 w-4" />} label="C74 reserve backing" value={s?.c74_redeemable_liability_usdt ?? 0} sub={`held $${fmt(s?.c74_reserve_held_usdt ?? 0)}`} tone="cyan" prefix="$" delay={240} />
        </div>

        {/* Safety + automation banner */}
        <div className="rounded-xl px-4 py-2.5 text-[11px] flex items-center gap-2 flex-wrap"
             style={{ background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.24)", color: "#1e40af" }}>
          <Lock className="h-3.5 w-3.5 flex-shrink-0" />
          <span>User funds, pending withdrawals and the C74 reserve are <b>never</b> a profit source; nothing is minted or relabelled. Payouts require two admins (propose → approve) and only target a <b>verified</b> rail.</span>
          {autoStatus && (
            <span className="ml-auto inline-flex items-center gap-1.5 font-bold px-2 py-0.5 rounded-full"
                  style={autoStatus.enabled
                    ? { background: "rgba(22,163,74,0.12)", color: "#15803d", border: "1px solid rgba(22,163,74,0.4)" }
                    : { background: "rgba(100,116,139,0.12)", color: "#475569", border: "1px solid rgba(100,116,139,0.4)" }}>
              {autoStatus.enabled ? <BadgeCheck className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              CRYPTO AUTO-SEND {autoStatus.enabled ? "ON" : "OFF"}
              {typeof autoStatus.auto_cap_usdt === "number" ? ` · cap $${fmt(autoStatus.auto_cap_usdt)}` : ""}
              {typeof autoStatus.usdt_balance === "number" ? ` · float $${fmt(autoStatus.usdt_balance)}` : ""}
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : !ov || !s ? (
          <div className="p-10 text-center text-slate-400 text-xs">No data</div>
        ) : (
          <>
            {/* Surplus breakdown — every deduction shown */}
            <div className="op-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="h-4 w-4" style={{ color: "#1d4ed8" }} />
                <h3 className="text-sm font-black text-slate-800">How the sweepable surplus is computed</h3>
                <span className="ml-auto text-[10px] text-slate-400">all figures USDT · real sources only</span>
              </div>
              <div className="space-y-1.5">
                {deductions.map((d) => (
                  <div key={d.label} className="flex items-center gap-2 text-sm py-1.5 border-b border-slate-50 last:border-0">
                    <span className="op-mono font-bold w-5 text-center" style={{ color: d.sign === "+" ? "#15803d" : "#be123c" }}>{d.sign}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-700 font-semibold text-[13px]">{d.label}</div>
                      <div className="text-[10.5px] text-slate-400">{d.hint}</div>
                    </div>
                    <span className="op-mono font-bold text-slate-800">${fmt(d.value)}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2.5 mt-1 border-t-2 border-slate-100">
                  <span className="w-5" />
                  <div className="flex-1">
                    <div className="text-slate-900 font-black text-[13px]">Available operator surplus</div>
                    <div className="text-[10.5px] text-slate-400">gross ${fmt(s.gross_surplus_usdt)} − in-flight ${fmt(s.outstanding_operator_payouts_usdt)}</div>
                  </div>
                  <span className="op-mono font-black text-base" style={{ color: canPropose ? "#15803d" : "#be123c" }}>${fmt(available)}</span>
                </div>
              </div>
              {s.user_liabilities_quarantined_usdt > 0 && (
                <p className="text-[10.5px] text-slate-400 mt-3">Quarantined balances (${fmt(s.user_liabilities_quarantined_usdt)}) are segregated and excluded from both funds and liabilities.</p>
              )}
              <p className="text-[10.5px] text-slate-400 mt-1">Cumulative fee revenue (P&amp;L, informational): ${fmt(s.fee_revenue_cumulative_usdt)}. The sweepable figure is a balance-sheet surplus, which is more conservative.</p>
            </div>

            {/* Verified payout destinations (the legitimate rail) */}
            <div className="op-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Landmark className="h-4 w-4" style={{ color: "#1d4ed8" }} />
                <h3 className="text-sm font-black text-slate-800">Payout destinations</h3>
                <span className="ml-auto text-[10px] text-slate-400">register → a different admin verifies</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Rail</label>
                  <select className="op-in mt-1" value={dRail} onChange={(e) => setDRail(e.target.value)}>
                    <option value="bank_fiat">Bank (fiat)</option>
                    <option value="crypto_usdt">Crypto (USDT)</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Label</label>
                  <input className="op-in mt-1" placeholder="Operator HDFC / Base wallet" value={dLabel} onChange={(e) => setDLabel(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Masked ref (display)</label>
                  <input className="op-in mt-1" placeholder="HDFC ****1234" value={dMasked} onChange={(e) => setDMasked(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{dRail === "crypto_usdt" ? "Wallet address" : "Beneficiary"}</label>
                  <input className="op-in mt-1" placeholder={dRail === "crypto_usdt" ? "0x… / T…" : "account holder"} value={dDetail} onChange={(e) => setDDetail(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={addDest} disabled={busy === "adddest"}
                  className="av8-action-btn px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)" }}>
                  {busy === "adddest" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />} Add destination
                </button>
                <span className="text-[11px] text-slate-400">No secrets are stored. A payout may only target a <b>verified</b> destination.</span>
              </div>

              {ov.destinations.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {ov.destinations.map((d) => {
                    const p = STATUS_PILL[d.status === "verified" ? "reconciled" : d.status === "disabled" ? "cancelled" : "proposed"];
                    return (
                      <div key={d.id} className="flex items-center gap-2 text-sm py-1.5 border-b border-slate-50 last:border-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: p.bg, color: p.fg, border: `1px solid ${p.ring}` }}>{d.status.toUpperCase()}</span>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-slate-700 text-[13px]">{d.label}</span>
                          <span className="text-slate-400 text-[11px]"> · {RAILS[d.rail] ?? d.rail}{d.masked_ref ? ` · ${d.masked_ref}` : ""}</span>
                        </div>
                        {d.status === "pending" && (
                          <button onClick={() => verifyDest(d.id)} disabled={busy === `d${d.id}`} title="Verify (must be a different admin than who added it)"
                            className="av8-action-btn px-2.5 py-1 rounded-md text-[11px] font-bold text-white flex items-center gap-1 disabled:opacity-40" style={{ background: "linear-gradient(135deg,#16a34a,#0b7a3f)" }}>
                            {busy === `d${d.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <BadgeCheck className="h-3 w-3" />} Verify
                          </button>
                        )}
                        {d.status !== "disabled" && (
                          <button onClick={() => disableDest(d.id)} disabled={busy === `d${d.id}`} title="Disable"
                            className="av8-action-btn px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 disabled:opacity-40" style={{ background: "rgba(100,116,139,0.1)", color: "#475569", border: "1px solid rgba(100,116,139,0.3)" }}>
                            <X className="h-3 w-3" /> Disable
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Propose a payout */}
            <div className="op-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <PlusCircle className="h-4 w-4" style={{ color: canPropose ? "#1d4ed8" : "#94a3b8" }} />
                <h3 className="text-sm font-black text-slate-800">Propose an operator payout</h3>
                <span className="ml-auto text-[10px] text-slate-400">step 1 of 4 · a different admin approves</span>
              </div>
              {!canPropose ? (
                <div className="rounded-lg px-3 py-3 text-[12px] flex items-center gap-2"
                     style={{ background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.24)", color: "#be123c" }}>
                  <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {available <= 0
                      ? <>No sweepable surplus right now (available <b>${fmt(available)}</b>). Payout is unavailable until a positive, reconciled surplus exists.</>
                      : <>Add and <b>verify</b> a payout destination above before you can propose a payout.</>}
                  </span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Amount (USDT)</label>
                      <input className="op-in mt-1" inputMode="decimal" placeholder={`max ${fmt(available)}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Verified destination</label>
                      <select className="op-in mt-1" value={destId} onChange={(e) => setDestId(e.target.value)}>
                        <option value="">Select a verified rail…</option>
                        {verifiedDests.map((d) => (
                          <option key={d.id} value={d.id}>{d.label} · {RAILS[d.rail] ?? d.rail}{d.masked_ref ? ` · ${d.masked_ref}` : ""}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Note</label>
                      <input className="op-in mt-1" placeholder="e.g. Aug 2026 profit draw" value={note} onChange={(e) => setNote(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={propose} disabled={busy === "propose"}
                      className="av8-action-btn px-3.5 py-2 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow: "0 4px 18px -4px rgba(37,99,235,0.6)" }}>
                      {busy === "propose" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />} Propose
                    </button>
                    <span className="text-[11px] text-slate-400">Proposing does not move money — a second admin approves, then you pay out and record the tx id.</span>
                  </div>
                </>
              )}
            </div>

            {/* Payout requests */}
            <div className="op-card overflow-hidden">
              <div className="flex items-center gap-2 p-4 pb-2">
                <Banknote className="h-4 w-4" style={{ color: "#b45309" }} />
                <h3 className="text-sm font-black text-slate-800">Payout requests</h3>
                <span className="ml-auto text-[11px] text-slate-400">{ov.requests.length} total · {pending.length} open</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider font-bold">Amount</th>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Rail</th>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Status</th>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Tx ref</th>
                      <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold">Proposed</th>
                      <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ov.requests.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">No payout requests yet.</td></tr>
                    ) : ov.requests.map((r) => {
                      const p = STATUS_PILL[r.status] ?? STATUS_PILL.proposed;
                      const isBusy = busy === String(r.id);
                      return (
                        <tr key={r.id} className="av8-row border-b border-slate-50">
                          <td className="px-4 py-2.5 op-mono font-bold text-slate-800">${fmt(r.amount_usdt)}</td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">{RAILS[r.rail] ?? r.rail}<br /><span className="text-slate-300">{short(r.destination, 8, 4)}</span></td>
                          <td className="px-3 py-2.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: p.bg, color: p.fg, border: `1px solid ${p.ring}` }}>{r.status.toUpperCase()}</span>
                          </td>
                          <td className="px-3 py-2.5 op-mono text-xs text-slate-600" title={r.tx_reference ?? ""}>{r.tx_reference ? short(r.tx_reference, 8, 6) : <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">{day(r.proposed_at)}<br /><span className="text-slate-300 op-mono">{short(r.proposed_by)}</span></td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {r.status === "proposed" && (
                                <>
                                  <button onClick={() => approve(r.id)} disabled={isBusy} title="Approve (must be a different admin than proposer)"
                                    className="av8-action-btn px-2.5 py-1 rounded-md text-[11px] font-bold text-white flex items-center gap-1 disabled:opacity-40" style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)" }}>
                                    {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Approve
                                  </button>
                                  <button onClick={() => reject(r.id)} disabled={isBusy} title="Reject"
                                    className="av8-action-btn px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 disabled:opacity-40" style={{ background: "rgba(244,63,94,0.1)", color: "#be123c", border: "1px solid rgba(244,63,94,0.3)" }}>
                                    <X className="h-3 w-3" /> Reject
                                  </button>
                                </>
                              )}
                              {r.status === "approved" && (
                                <>
                                  {r.rail === "crypto_usdt" && autoStatus?.enabled && (
                                    <button onClick={() => execute(r.id)} disabled={isBusy} title="Send on-chain now (USDT-TRC20) to the verified wallet"
                                      className="av8-action-btn px-2.5 py-1 rounded-md text-[11px] font-bold text-white flex items-center gap-1 disabled:opacity-40" style={{ background: "linear-gradient(135deg,#0ea5e9,#0369a1)" }}>
                                      {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Send on-chain
                                    </button>
                                  )}
                                  <button onClick={() => record(r.id)} disabled={isBusy} title="Record the real tx/reference id after paying out manually"
                                    className="av8-action-btn px-2.5 py-1 rounded-md text-[11px] font-bold text-white flex items-center gap-1 disabled:opacity-40" style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>
                                    {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Record tx
                                  </button>
                                  <button onClick={() => reject(r.id)} disabled={isBusy} title="Reject"
                                    className="av8-action-btn px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 disabled:opacity-40" style={{ background: "rgba(244,63,94,0.1)", color: "#be123c", border: "1px solid rgba(244,63,94,0.3)" }}>
                                    <X className="h-3 w-3" /> Reject
                                  </button>
                                </>
                              )}
                              {r.status === "executing" && (
                                <span className="text-[11px] text-sky-600 inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> sending…</span>
                              )}
                              {r.status === "failed" && (
                                <span className="text-[11px] text-rose-600" title={r.execution_error ?? ""}>failed · verify tx on-chain</span>
                              )}
                              {r.status === "recorded" && (
                                <button onClick={() => reconcile(r.id)} disabled={isBusy} title="Post-payout reconciliation"
                                  className="av8-action-btn px-2.5 py-1 rounded-md text-[11px] font-bold text-white flex items-center gap-1 disabled:opacity-40" style={{ background: "linear-gradient(135deg,#16a34a,#0b7a3f)" }}>
                                  {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ClipboardCheck className="h-3 w-3" />} Reconcile
                                </button>
                              )}
                              {(r.status === "reconciled" || r.status === "rejected" || r.status === "cancelled") && (
                                <span className="text-[11px] text-slate-400">{r.reject_reason ? `“${r.reject_reason}”` : day(r.reconciled_at)}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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

// Real-Money Ops — READ-ONLY operational-readiness console.
//
// The single pane over the real-money path (REAL-MONEY-PAYMENT-LEDGER-WALLET-
// WITHDRAWAL.md §6): the enable flag, the L5 solvency picture, the append-only
// ledger tail with provenance, and the withdrawal queue with its L4 gate criteria.
//
// This tab enables NOTHING and moves NOTHING. real_money_enabled stays OFF until the
// external gates (license · PSP · treasury · compliance) are met and an operator
// explicitly flips it. Treasury/reserves are verified off-chain — this view never
// invents an on-chain balance; it reports in-DB liabilities and labels the reserve leg.

import { useState, useEffect, useCallback } from "react";
import { num as fmt } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, Wallet, Scale, Banknote, ShieldAlert, Lock,
  CheckCircle2, AlertTriangle, ListChecks, ArrowDownUp, Coins,
} from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";
import AdminRealMoneyActivation from "./AdminRealMoneyActivation";

interface Flags {
  real_money_enabled: { present: boolean; value: boolean; note: string | null };
  c74_phase2_enabled: boolean;
  auto_payout_enabled: boolean;
  kyc_auto_approve: boolean;
  withdrawal_auto_approve: { enabled: boolean; threshold: string | null };
}
interface Solvency {
  user_liabilities_usdt: number; liabilities_all_ccy: number; quarantined_usdt: number;
  pending_payouts_usdt: number; platform_revenue_usdt: number; wallets_count: number; reserve_note: string;
}
interface LedgerRow { user_short: string; type: string; amount: number; currency: string; status: string | null; provenance: string | null; created_at: string; }
interface WithdrawRow { rail: string; user_short: string; amount: number; net_amount: number; fee: number; status: string | null; chain: string; tx_hash: string | null; created_at: string; }
interface Withdrawals { gate_note: string; by_status: Record<string, number>; recent: WithdrawRow[]; }
interface Overview {
  generated_at: string; contract: string; flags: Flags; solvency: Solvency;
  ledger_tail: LedgerRow[]; withdrawals: Withdrawals;
}

const short = (s: string | null, head = 8, tail = 6) =>
  !s ? "—" : s.length <= head + tail ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
const dt = (s: string | null) => (s ? String(s).slice(0, 16).replace("T", " ") : "—");

const KIND_COLOR: Record<string, string> = {
  deposit: "#15803d", win: "#15803d", refund: "#0369a1", bonus: "#6d28d9",
  bet: "#be123c", withdraw: "#be123c", c74_swap: "#b45309",
};

function FlagPill({ on, label, note }: { on: boolean; label: string; note?: string | null }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={on ? { background: "rgba(22,163,74,0.12)", color: "#15803d", border: "1px solid rgba(22,163,74,0.4)" }
                  : { background: "rgba(100,116,139,0.12)", color: "#475569", border: "1px solid rgba(100,116,139,0.4)" }}>
        {on ? <CheckCircle2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />}{on ? "ON" : "OFF"}
      </span>
      <span className="text-[13px] font-semibold text-slate-700">{label}</span>
      {note && <span className="text-[10.5px] text-slate-400 ml-auto">{note}</span>}
    </div>
  );
}

export default function AdminRealMoneyOps() {
  const [loading, setLoading] = useState(true);
  const [ov, setOv] = useState<Overview | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("admin_real_money_ops_overview");
    if (error) toast.error(error.message);
    else setOv(data as Overview);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const f = ov?.flags;
  const s = ov?.solvency;
  const rmOn = f?.real_money_enabled.value ?? false;

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />
      <style>{`.rmo-card{background:#fff;border:1px solid rgba(15,23,42,0.07);border-radius:16px}
        .rmo-mono{font-variant-numeric:tabular-nums;letter-spacing:-.01em}`}</style>

      <div className="space-y-5">
        <V8PageHero
          eyebrow="Finance · Real-Money Ops"
          title="REAL-MONEY OPS"
          tone={rmOn ? "emerald" : "rose"}
          icon={<Banknote className="h-5 w-5" />}
          badges={[
            { label: rmOn ? "REAL MONEY ON" : "REAL MONEY OFF", tone: rmOn ? "emerald" : "rose", dot: true },
            { label: `$${fmt(s?.user_liabilities_usdt ?? 0)} LIABILITIES`, tone: "cyan" },
            { label: `$${fmt(s?.pending_payouts_usdt ?? 0)} PENDING`, tone: (s?.pending_payouts_usdt ?? 0) > 0 ? "amber" : "emerald" },
          ]}
          subtitle={<>A <b>read-only</b> pane over the real-money path — the enable flag, the L5 solvency picture, the append-only ledger tail, and the withdrawal queue with its L4 gate. It enables nothing and moves nothing. <b>real_money_enabled stays OFF</b> until the external gates (license · PSP · treasury · compliance) are met and an operator explicitly flips it.</>}
          actions={
            <V8HeroBtn variant="ghost" onClick={load} disabled={loading} title="Refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </V8HeroBtn>
          }
        />

        {loading ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : !ov || !f || !s ? (
          <div className="p-10 text-center text-slate-400 text-xs">No data</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <V8StatCard icon={<Wallet className="h-4 w-4" />} label="User liabilities" value={s.user_liabilities_usdt} sub={`${s.wallets_count} wallets`} tone="cyan" prefix="$" delay={0} />
              <V8StatCard icon={<ArrowDownUp className="h-4 w-4" />} label="Pending payouts" value={s.pending_payouts_usdt} sub="withdrawals in flight" tone={s.pending_payouts_usdt > 0 ? "amber" : "emerald"} prefix="$" delay={80} />
              <V8StatCard icon={<Coins className="h-4 w-4" />} label="Platform revenue" value={s.platform_revenue_usdt} sub="fees (P&L, info)" tone="emerald" prefix="$" delay={160} />
              <V8StatCard icon={<ShieldAlert className="h-4 w-4" />} label="Quarantined" value={s.quarantined_usdt} sub="segregated, excluded" tone={s.quarantined_usdt > 0 ? "rose" : "emerald"} prefix="$" delay={240} />
            </div>

            {/* The ONLY control that flips real_money_enabled (governed, audit-logged). */}
            <AdminRealMoneyActivation rmOn={rmOn} liabilities={s.user_liabilities_usdt} onChanged={load} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Flags */}
              <div className="rmo-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-4 w-4" style={{ color: "#1d4ed8" }} />
                  <h3 className="text-sm font-black text-slate-800">Real-money flags</h3>
                  <span className="ml-auto text-[10px] text-slate-400">kill switches</span>
                </div>
                <FlagPill on={rmOn} label="real_money_enabled" note={f.real_money_enabled.note ?? (rmOn ? "ON" : "OFF")} />
                <FlagPill on={f.c74_phase2_enabled} label="c74_phase2_enabled" note="reserve / redemption" />
                <FlagPill on={f.auto_payout_enabled} label="auto_payout_enabled" note="operator payouts" />
                <FlagPill on={f.withdrawal_auto_approve.enabled} label="withdrawal_auto_approve" note={f.withdrawal_auto_approve.threshold ? `≤ ${f.withdrawal_auto_approve.threshold}` : null} />
                <FlagPill on={f.kyc_auto_approve} label="kyc_auto_approve" note="KYC gate" />
              </div>

              {/* L5 solvency */}
              <div className="rmo-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="h-4 w-4" style={{ color: "#1d4ed8" }} />
                  <h3 className="text-sm font-black text-slate-800">Solvency (L5)</h3>
                  <span className="ml-auto text-[10px] text-slate-400">liabilities vs reserve</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-600">User liabilities (USDT)</span><span className="rmo-mono font-bold text-slate-800">${fmt(s.user_liabilities_usdt)}</span></div>
                  <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-600">Pending payouts</span><span className="rmo-mono font-bold text-slate-800">${fmt(s.pending_payouts_usdt)}</span></div>
                  <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-600">Quarantined (excluded)</span><span className="rmo-mono font-bold text-slate-800">${fmt(s.quarantined_usdt)}</span></div>
                  <div className="flex justify-between py-1"><span className="text-slate-600 font-semibold">Treasury / reserve</span><span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.14)", color: "#b45309" }}>verified off-chain</span></div>
                </div>
                <p className="text-[10.5px] text-slate-400 mt-2 flex items-start gap-1.5"><AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />{s.reserve_note}</p>
              </div>
            </div>

            {/* Withdrawal queue + L4 gate */}
            <div className="rmo-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownUp className="h-4 w-4" style={{ color: "#b45309" }} />
                <h3 className="text-sm font-black text-slate-800">Withdrawal queue</h3>
                <span className="ml-auto text-[11px] text-slate-400">
                  {Object.entries(ov.withdrawals.by_status).map(([k, v]) => `${k} ${v}`).join(" · ") || "none"}
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 mb-2 flex items-start gap-1.5"><ShieldAlert className="h-3 w-3 mt-0.5 flex-shrink-0" />{ov.withdrawals.gate_note}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-slate-400 border-b border-slate-100">
                    <th className="text-left px-2 py-2 text-[10px] uppercase tracking-wider font-bold">Rail</th>
                    <th className="text-left px-2 py-2 text-[10px] uppercase tracking-wider font-bold">User</th>
                    <th className="text-right px-2 py-2 text-[10px] uppercase tracking-wider font-bold">Amount</th>
                    <th className="text-left px-2 py-2 text-[10px] uppercase tracking-wider font-bold">Status</th>
                    <th className="text-left px-2 py-2 text-[10px] uppercase tracking-wider font-bold">Chain</th>
                    <th className="text-left px-2 py-2 text-[10px] uppercase tracking-wider font-bold">When</th>
                  </tr></thead>
                  <tbody>
                    {ov.withdrawals.recent.length === 0 ? (
                      <tr><td colSpan={6} className="px-2 py-6 text-center text-slate-400 text-xs">No withdrawals.</td></tr>
                    ) : ov.withdrawals.recent.map((w, i) => (
                      <tr key={i} className="av8-row border-b border-slate-50">
                        <td className="px-2 py-2 text-[11px] text-slate-500">{w.rail === "crypto_withdrawals" ? "crypto" : "request"}</td>
                        <td className="px-2 py-2 rmo-mono text-[11px] text-slate-400">{w.user_short}</td>
                        <td className="px-2 py-2 text-right rmo-mono font-bold text-slate-800">${fmt(w.amount)}</td>
                        <td className="px-2 py-2 text-[11px] text-slate-600">{w.status ?? "—"}</td>
                        <td className="px-2 py-2 text-[11px] text-slate-500">{w.chain}</td>
                        <td className="px-2 py-2 text-[11px] text-slate-400">{dt(w.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Append-only ledger tail */}
            <div className="rmo-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <ListChecks className="h-4 w-4" style={{ color: "#1d4ed8" }} />
                <h3 className="text-sm font-black text-slate-800">Ledger tail</h3>
                <span className="ml-auto text-[10px] text-slate-400">append-only · latest 25 · every row carries provenance</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-slate-400 border-b border-slate-100">
                    <th className="text-left px-2 py-2 text-[10px] uppercase tracking-wider font-bold">Type</th>
                    <th className="text-left px-2 py-2 text-[10px] uppercase tracking-wider font-bold">User</th>
                    <th className="text-right px-2 py-2 text-[10px] uppercase tracking-wider font-bold">Amount</th>
                    <th className="text-left px-2 py-2 text-[10px] uppercase tracking-wider font-bold">Status</th>
                    <th className="text-left px-2 py-2 text-[10px] uppercase tracking-wider font-bold">Provenance</th>
                    <th className="text-left px-2 py-2 text-[10px] uppercase tracking-wider font-bold">When</th>
                  </tr></thead>
                  <tbody>
                    {ov.ledger_tail.length === 0 ? (
                      <tr><td colSpan={6} className="px-2 py-6 text-center text-slate-400 text-xs">No ledger entries.</td></tr>
                    ) : ov.ledger_tail.map((r, i) => (
                      <tr key={i} className="av8-row border-b border-slate-50">
                        <td className="px-2 py-2"><span className="text-[11px] font-bold" style={{ color: KIND_COLOR[r.type] ?? "#475569" }}>{r.type}</span></td>
                        <td className="px-2 py-2 rmo-mono text-[11px] text-slate-400">{r.user_short}</td>
                        <td className="px-2 py-2 text-right rmo-mono font-bold text-slate-800">{fmt(r.amount)} <span className="text-slate-300 text-[10px]">{r.currency}</span></td>
                        <td className="px-2 py-2 text-[11px] text-slate-500">{r.status ?? "—"}</td>
                        <td className="px-2 py-2 rmo-mono text-[10.5px] text-slate-400" title={r.provenance ?? ""}>{short(r.provenance)}</td>
                        <td className="px-2 py-2 text-[11px] text-slate-400">{dt(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Read-only contract */}
            <div className="rounded-xl px-4 py-2.5 text-[11px] flex items-start gap-2"
                 style={{ background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.24)", color: "#1e40af" }}>
              <Lock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{ov.contract} <span className="text-slate-400">· generated {new Date(ov.generated_at).toLocaleString()}</span></span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

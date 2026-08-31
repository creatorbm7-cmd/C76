/**
 * AdminPaymentsHub — "payment aggregator" dashboard.
 *
 * Read-only roll-up across every third-party payment rail: UPI suppliers
 * (admin_list_upi_suppliers) + e-wallet agents (admin_list_ewallet_agents).
 * No API / aggregator integration (PAs are not allowed for gambling) — this
 * just aggregates the agent ledgers into one settlement view: total payin,
 * payout, commission and net position, broken down by rail.
 */

import { useCallback, useEffect, useState } from "react";
import { inr } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, RefreshCw, LayoutGrid, ArrowDownLeft, ArrowUpRight, Percent, Scale } from "lucide-react";

interface Row {
  rail: string;
  name: string;
  accounts: string[];
  commission_pct: number;
  active: boolean;
  payin: number;
  payout: number;
  commission: number;
  net: number;
}

const PROVIDER_LABEL: Record<string, string> = { paytm: "Paytm", phonepe: "PhonePe", gpay: "Google Pay", other: "E-Wallet" };

export default function AdminPaymentsHub() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [upi, ewallet] = await Promise.all([
      supabase.rpc("admin_list_upi_suppliers"),
      supabase.rpc("admin_list_ewallet_agents"),
    ]);
    if (upi.error) toast.error(upi.error.message);
    if (ewallet.error) toast.error(ewallet.error.message);

    const merged: Row[] = [
      ...((upi.data ?? []) as any[]).map((s) => ({
        rail: "UPI", name: s.name, accounts: s.upi_ids ?? [], commission_pct: Number(s.commission_pct),
        active: s.active, payin: Number(s.collected_inr), payout: Number(s.paid_out_inr),
        commission: Number(s.commission_inr), net: Number(s.net_inr),
      })),
      ...((ewallet.data ?? []) as any[]).map((a) => ({
        rail: PROVIDER_LABEL[a.provider] ?? "E-Wallet", name: a.name, accounts: a.accounts ?? [],
        commission_pct: Number(a.commission_pct), active: a.active, payin: Number(a.payin_inr),
        payout: Number(a.payout_inr), commission: Number(a.commission_inr), net: Number(a.net_inr),
      })),
    ];
    merged.sort((a, b) => b.payin - a.payin);
    setRows(merged);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const tPayin = rows.reduce((s, r) => s + r.payin, 0);
  const tPayout = rows.reduce((s, r) => s + r.payout, 0);
  const tComm = rows.reduce((s, r) => s + r.commission, 0);
  const tNet = rows.reduce((s, r) => s + r.net, 0);
  const activeAgents = rows.filter((r) => r.active).length;

  // Per-rail breakdown
  const byRail = Object.values(rows.reduce((acc, r) => {
    const k = r.rail;
    acc[k] = acc[k] ?? { rail: k, payin: 0, payout: 0, commission: 0, net: 0, count: 0 };
    acc[k].payin += r.payin; acc[k].payout += r.payout; acc[k].commission += r.commission;
    acc[k].net += r.net; acc[k].count += 1;
    return acc;
  }, {} as Record<string, { rail: string; payin: number; payout: number; commission: number; net: number; count: number }>))
    .sort((a, b) => b.payin - a.payin);

  const Card = ({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone: string }) => (
    <div className="rounded-xl border border-white/[0.07] p-3" style={{ background: "#ffffff" }}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40">
        <Icon className={`h-3.5 w-3.5 ${tone}`} /> {label}
      </div>
      <div className={`mt-1 text-lg font-bold font-mono ${tone}`}>{value}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-amber-400" /> Payments Hub
          </h2>
          <p className="text-xs text-white/50 mt-1">
            {rows.length} agent{rows.length === 1 ? "" : "s"} across {byRail.length} rail{byRail.length === 1 ? "" : "s"} · {activeAgents} active
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} className="border-white/10 text-white/70">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Total payin" value={inr(tPayin)} icon={ArrowDownLeft} tone="text-emerald-300" />
        <Card label="Total payout" value={inr(tPayout)} icon={ArrowUpRight} tone="text-cyan-300" />
        <Card label="Commission" value={inr(tComm)} icon={Percent} tone="text-amber-300" />
        <Card label="Net position" value={inr(tNet)} icon={Scale} tone={tNet >= 0 ? "text-emerald-300" : "text-rose-300"} />
      </div>

      {/* Per-rail breakdown */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: "#ffffff" }}>
        <div className="px-4 py-2.5 border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/50 font-semibold">
          By rail
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-[10px] uppercase tracking-wider border-b border-white/[0.06]">
                <th className="text-left p-3">Rail</th>
                <th className="text-right p-3">Agents</th>
                <th className="text-right p-3">Payin</th>
                <th className="text-right p-3">Payout</th>
                <th className="text-right p-3">Commission</th>
                <th className="text-right p-3">Net</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-white/30"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></td></tr>
              ) : byRail.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-white/30 text-sm">No payment agents configured yet.</td></tr>
              ) : byRail.map((r) => (
                <tr key={r.rail} className="border-b border-white/[0.04]">
                  <td className="p-3 font-bold text-white">{r.rail}</td>
                  <td className="p-3 text-right font-mono text-white/60">{r.count}</td>
                  <td className="p-3 text-right font-mono text-emerald-200">{inr(r.payin)}</td>
                  <td className="p-3 text-right font-mono text-cyan-200">{inr(r.payout)}</td>
                  <td className="p-3 text-right font-mono text-amber-200">{inr(r.commission)}</td>
                  <td className={`p-3 text-right font-mono font-bold ${r.net >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{inr(r.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* All agents combined */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: "#ffffff" }}>
        <div className="px-4 py-2.5 border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/50 font-semibold">
          All agents
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-[10px] uppercase tracking-wider border-b border-white/[0.06]">
                <th className="text-left p-3">Agent</th>
                <th className="text-left p-3">Rail</th>
                <th className="text-right p-3">Comm. %</th>
                <th className="text-right p-3">Payin</th>
                <th className="text-right p-3">Payout</th>
                <th className="text-right p-3">Net</th>
                <th className="text-center p-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-white/30"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-white/30 text-sm">No agents — add UPI suppliers or e-wallet agents first.</td></tr>
              ) : rows.map((r, i) => (
                <tr key={`${r.rail}-${r.name}-${i}`} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="p-3 font-semibold text-white">{r.name}</td>
                  <td className="p-3"><span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/70">{r.rail}</span></td>
                  <td className="p-3 text-right font-mono text-white/70">{r.commission_pct}%</td>
                  <td className="p-3 text-right font-mono text-emerald-200">{inr(r.payin)}</td>
                  <td className="p-3 text-right font-mono text-cyan-200">{inr(r.payout)}</td>
                  <td className={`p-3 text-right font-mono font-bold ${r.net >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{inr(r.net)}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block h-2 w-2 rounded-full ${r.active ? "bg-emerald-400" : "bg-white/20"}`} title={r.active ? "Active" : "Paused"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-white/40">
        Read-only roll-up of every payment rail (UPI suppliers + e-wallet agents). Manage individual agents in their own tabs.
        <b> Net = payin − payout − commission</b> across all rails. No payment-aggregator API is used (PAs aren't permitted for gambling).
      </p>
    </div>
  );
}

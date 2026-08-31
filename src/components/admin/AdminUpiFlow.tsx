import { useCallback, useEffect, useMemo, useState } from "react";
import { inr } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, IndianRupee, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2 } from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

/**
 * AdminUpiFlow — read-only monitor for the UPI (INR) payin/payout flow.
 *
 * COMPLIANCE: this is the manual + sub-agent UPI rail — a player pays the
 * platform/agent UPI ID and submits the UTR, which an admin/agent verifies. No
 * payment aggregator and no third-party settlement is involved (NPCI/UPI terms
 * and every mainstream aggregator prohibit real-money gaming). Monitoring only.
 */

type Upi = { id: string; user_id: string | null; user_upi_id: string | null; amount_inr: number | null; amount_usdt: number | null; utr_reference: string | null; status: string | null; credited_at: string | null; created_at: string | null; platform_upi_id: string | null };
type Payout = { id: string; supplier_id: string | null; amount_inr: number | null; note: string | null; created_at: string | null };

const short = (s: string | null, n = 10) => (s ? (s.length > n + 3 ? `${s.slice(0, n)}…` : s) : "—");
const isCredited = (d: Upi) => !!d.credited_at || (d.status || "").toLowerCase() === "credited" || (d.status || "").toLowerCase() === "approved";
const isRejected = (d: Upi) => ["rejected", "declined", "failed"].includes((d.status || "").toLowerCase());

function Pill({ ok, warn, bad, children }: { ok?: boolean; warn?: boolean; bad?: boolean; children: React.ReactNode }) {
  const c = ok ? "text-emerald-600" : bad ? "text-rose-600" : warn ? "text-amber-600" : "text-slate-400";
  const bg = ok ? "rgba(16,185,129,0.14)" : bad ? "rgba(244,63,94,0.14)" : warn ? "rgba(245,158,11,0.14)" : "rgba(15,23,42,0.06)";
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c}`} style={{ background: bg }}>{children}</span>;
}

export default function AdminUpiFlow() {
  const [deps, setDeps] = useState<Upi[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from("upi_deposits").select("id, user_id, user_upi_id, amount_inr, amount_usdt, utr_reference, status, credited_at, created_at, platform_upi_id").order("created_at", { ascending: false }).limit(120),
      supabase.from("upi_supplier_payouts").select("id, supplier_id, amount_inr, note, created_at").order("created_at", { ascending: false }).limit(60),
    ]);
    const D = (d || []) as Upi[]; const P = (p || []) as Payout[];
    setDeps(D); setPayouts(P);
    const ids = [...new Set(D.map((x) => x.user_id).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, email, full_name").in("id", ids);
      const map: Record<string, string> = {};
      for (const pr of (profs || []) as { id: string; email?: string; full_name?: string }[]) map[pr.id] = pr.full_name || pr.email || pr.id.slice(0, 8);
      setNames(map);
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const credited = deps.filter(isCredited);
    const pending = deps.filter((d) => !isCredited(d) && !isRejected(d));
    return {
      count: deps.length,
      creditedSum: credited.reduce((s, d) => s + Number(d.amount_inr || 0), 0),
      pending: pending.length,
      pendingSum: pending.reduce((s, d) => s + Number(d.amount_inr || 0), 0),
      payoutSum: payouts.reduce((s, p) => s + Number(p.amount_inr || 0), 0),
      payoutCount: payouts.length,
    };
  }, [deps, payouts]);

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="space-y-4">
        {/* PREMIUM HERO */}
        <V8PageHero
          eyebrow="Finance · UPI Flow"
          title="UPI FLOW"
          tone="cyan"
          icon={<IndianRupee className="h-5 w-5" />}
          badges={[
            { label: `${stats.count} PAYINS`, tone: "cyan", dot: true },
            { label: `${stats.pending} PENDING`, tone: "amber" },
            { label: `${stats.payoutCount} PAYOUTS`, tone: "rose" },
          ]}
          subtitle={<>Manual + sub-agent UPI (INR) payin/payout — UTR-verified, no aggregator. <span className="font-bold" style={{ color: "#15803d" }}>{inr(stats.creditedSum)}</span> credited · monitoring only.</>}
          actions={
            <V8HeroBtn variant="ghost" onClick={load} disabled={loading} title="Refresh UPI flow">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </V8HeroBtn>
          }
        />

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <V8StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Credited In" value={stats.creditedSum} prefix="₹" sub="verified UPI deposits" tone="emerald" delay={0} />
          <V8StatCard icon={<Clock className="h-4 w-4" />} label="Pending" value={stats.pendingSum} prefix="₹" sub={`${stats.pending} awaiting UTR verify`} tone="amber" delay={80} />
          <V8StatCard icon={<ArrowDownLeft className="h-4 w-4" />} label="Payins" value={stats.count} sub="total UPI requests" tone="cyan" delay={160} />
          <V8StatCard icon={<ArrowUpRight className="h-4 w-4" />} label="Supplier Payouts" value={stats.payoutSum} prefix="₹" sub={`${stats.payoutCount} settlements`} tone="rose" delay={240} />
        </div>

      {/* UPI payins */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden" style={{ background: "#ffffff" }}>
        <div className="px-4 py-3 border-b border-slate-200 text-sm font-bold text-slate-800 flex items-center gap-2"><ArrowDownLeft className="h-4 w-4 text-emerald-500" /> UPI payins</div>
        {loading ? <div className="p-8 text-center text-slate-400"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
          : deps.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">No UPI deposits yet. Players pay the platform/agent UPI ID and submit the UTR; it appears here for verification.</div>
          : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-slate-400 text-left">
                <th className="px-4 py-2 font-semibold">Time</th><th className="px-4 py-2 font-semibold">Player</th><th className="px-4 py-2 font-semibold">UTR</th>
                <th className="px-4 py-2 font-semibold">Payer UPI</th><th className="px-4 py-2 font-semibold text-right">Amount</th><th className="px-4 py-2 font-semibold text-center">Status</th>
              </tr></thead>
              <tbody>
                {deps.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100 text-slate-700">
                    <td className="px-4 py-2 whitespace-nowrap text-slate-500">{d.created_at ? new Date(d.created_at).toLocaleString() : "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{d.user_id ? (names[d.user_id] || short(d.user_id, 8)) : "—"}</td>
                    <td className="px-4 py-2 font-mono text-slate-500">{short(d.utr_reference, 14)}</td>
                    <td className="px-4 py-2 text-slate-500">{short(d.user_upi_id, 16)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-emerald-600">{inr(Number(d.amount_inr || 0))}</td>
                    <td className="px-4 py-2 text-center"><Pill ok={isCredited(d)} bad={isRejected(d)} warn={!isCredited(d) && !isRejected(d)}>{isCredited(d) ? "Credited" : isRejected(d) ? (d.status || "rejected") : (d.status || "pending")}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supplier payouts */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden" style={{ background: "#ffffff" }}>
        <div className="px-4 py-3 border-b border-slate-200 text-sm font-bold text-slate-800 flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-rose-500" /> UPI supplier payouts</div>
        {payouts.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">No supplier payouts recorded.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-slate-400 text-left">
                <th className="px-4 py-2 font-semibold">Time</th><th className="px-4 py-2 font-semibold">Supplier</th><th className="px-4 py-2 font-semibold">Note</th><th className="px-4 py-2 font-semibold text-right">Amount</th>
              </tr></thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 text-slate-700">
                    <td className="px-4 py-2 whitespace-nowrap text-slate-500">{p.created_at ? new Date(p.created_at).toLocaleString() : "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{short(p.supplier_id, 8)}</td>
                    <td className="px-4 py-2 text-slate-600">{p.note || "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-rose-600">{inr(Number(p.amount_inr || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-400 leading-relaxed">
        Compliance: manual + sub-agent UPI only — a player pays the platform/agent UPI ID and submits the UTR, which an admin or the funding agent verifies before crediting.
        No payment aggregator and no third-party settlement is used (NPCI/UPI terms and every mainstream aggregator prohibit real-money gaming). Monitoring only.
      </p>
      </div>
    </div>
  );
}

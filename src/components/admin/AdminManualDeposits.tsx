// Manual / offline deposit approval queue.
//
// Drives the demo-safe manual-deposit engine (migration
// 20260620210000_manual_deposit_engine.sql):
//   admin_list_deposit_requests(p_status)         → queue rows (pending first)
//   admin_review_deposit(p_id, p_approve, p_note)  → approve (credits wallet) / reject
//
// DEMO-SAFE: approval credits via update_casino_balance, which THROWS
// E_DEMO_MODE while the platform is in demo mode — so this queue cannot
// move real money until the operator flips platform mode to 'live'.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Check, X, Banknote, RefreshCw, ExternalLink, ShieldAlert, HandCoins, Wallet, CheckCircle2, Clock } from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

type Status = "pending" | "approved" | "rejected";

interface DepositRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: "bank" | "upi" | "cash" | "other";
  reference: string | null;
  proof_url: string | null;
  status: Status;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const METHOD_LABEL: Record<DepositRequest["method"], string> = {
  bank: "Bank transfer",
  upi: "UPI",
  cash: "Cash agent",
  other: "Other",
};

export default function AdminManualDeposits() {
  const [items, setItems] = useState<DepositRequest[]>([]);
  const [filter, setFilter] = useState<Status | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Review modal state (used for both approve + reject so the admin can
  // always attach a note).
  const [target, setTarget] = useState<DepositRequest | null>(null);
  const [approveMode, setApproveMode] = useState(true);
  const [note, setNote] = useState("");
  // Unfiltered status roll-up for the summary strip (display-only).
  const [totals, setTotals] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, failed: 0, pendingTotal: 0, approvedToday: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_deposit_requests", {
      p_status: filter === "all" ? null : filter,
    });
    if (error) toast.error(error.message);
    setItems((data ?? []) as DepositRequest[]);

    // All-status roll-up (UNFILTERED, display-only) so the summary shows real
    // history even while the list is filtered (default: pending). No writes.
    const { data: allRows } = await supabase.rpc("admin_list_deposit_requests", { p_status: null });
    const today = new Date().toDateString();
    const t = { total: 0, pending: 0, approved: 0, rejected: 0, failed: 0, pendingTotal: 0, approvedToday: 0 };
    (allRows ?? []).forEach((r: any) => {
      t.total++;
      const s = String(r.status);
      if (s === "pending") { t.pending++; t.pendingTotal += Number(r.amount || 0); }
      else if (s === "approved") { t.approved++; if (r.reviewed_at && new Date(r.reviewed_at).toDateString() === today) t.approvedToday++; }
      else if (s === "rejected") t.rejected++;
      else if (s === "failed") t.failed++;
    });
    setTotals(t);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-manual-deposits-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "deposit_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const openReview = (d: DepositRequest, approve: boolean) => {
    setTarget(d);
    setApproveMode(approve);
    setNote("");
  };

  const submitReview = async () => {
    if (!target) return;
    if (!approveMode && !note.trim()) {
      toast.error("A reason is required to reject");
      return;
    }
    setBusyId(target.id);
    const { data, error } = await supabase.rpc("admin_review_deposit", {
      p_id: target.id,
      p_approve: approveMode,
      p_note: note.trim() || null,
    });
    setBusyId(null);
    if (error) {
      // E_DEMO_MODE is expected until the operator goes live — surface it plainly.
      if (error.message.includes("E_DEMO_MODE")) {
        toast.error("Demo mode: approvals are disabled until the platform is switched to live.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    const r = data as { status?: string; amount?: number };
    if (approveMode) {
      toast.success(`Approved · credited ${(r?.amount ?? target.amount).toLocaleString()} ${target.currency}`);
    } else {
      toast.success("Deposit request rejected");
    }
    setTarget(null);
    setNote("");
    load();
  };

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="space-y-5">
        {/* PREMIUM HERO */}
        <V8PageHero
          eyebrow="Finance · Manual Deposits"
          title="MANUAL DEPOSITS"
          tone="emerald"
          icon={<HandCoins className="h-5 w-5" />}
          badges={[
            { label: `${totals.pending} PENDING`, tone: "amber", dot: true },
            { label: `₹${totals.pendingTotal.toLocaleString("en-IN")} AWAITING`, tone: "emerald", icon: <Wallet className="h-3 w-3" /> },
            { label: `${totals.approved} APPROVED`, tone: "cyan", icon: <CheckCircle2 className="h-3 w-3" /> },
            { label: `${totals.failed} FAILED`, tone: "rose" },
          ]}
          subtitle={<>Offline / bank / UPI deposit approval queue · {totals.pending} awaiting review · {totals.total} requests all-time ({totals.failed} failed) · credits post to the canonical ledger only when the platform is live.</>}
          actions={
            <V8HeroBtn onClick={load} disabled={loading} title="Refresh queue">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </V8HeroBtn>
          }
        />

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <V8StatCard icon={<Clock className="h-4 w-4" />} label="Pending" value={totals.pending} sub="awaiting review" tone="amber" delay={0} />
          <V8StatCard icon={<Wallet className="h-4 w-4" />} label="Pending Amount" value={totals.pendingTotal} prefix="₹" sub="to be credited" tone="emerald" delay={80} />
          <V8StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Approved" value={totals.approved} sub={`${totals.approvedToday} today`} tone="cyan" delay={160} />
          <V8StatCard icon={<Banknote className="h-4 w-4" />} label="Requests" value={totals.total} sub={`${totals.failed} failed · ${totals.rejected} rejected`} tone="rose" delay={240} />
        </div>

        {/* FILTER ROW */}
        <div className="flex items-center flex-wrap gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-md font-semibold transition ${
                filter === f
                  ? "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-500/[0.06]"
              }`}>{f}</button>
          ))}
        </div>

      {/* Demo-safe banner */}
      <div className="rounded-lg px-3 py-2 text-[11px] flex items-center gap-2 border"
        style={{ background: "rgba(245,158,11,0.10)", borderColor: "rgba(245,158,11,0.30)", color: "#b45309" }}>
        <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
        Approvals credit real balances only when platform mode is <b className="mx-1">live</b>. In demo mode the credit is blocked (E_DEMO_MODE).
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: "#ffffff", borderColor: "rgba(15,23,42,0.08)", boxShadow: "0 6px 24px -14px rgba(15,23,42,0.15)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-200">
                <th className="text-left p-3">User</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-left p-3">Method</th>
                <th className="text-left p-3">Reference</th>
                <th className="text-center p-3">Status</th>
                <th className="text-left p-3">Note</th>
                <th className="text-right p-3">Age</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-10 text-center text-slate-400">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-slate-400">
                  No {filter !== "all" ? filter : ""} deposit requests.
                  {filter === "pending" && totals.total > 0 && (
                    <> {" "}<span className="text-slate-500">{totals.total} request(s) in history ({totals.failed} failed, {totals.approved} approved) — switch to <b>All</b> above.</span></>
                  )}
                </td></tr>
              ) : items.map(d => {
                const age = Math.floor((Date.now() - new Date(d.created_at).getTime()) / 60000);
                const stale = age > 60 && d.status === "pending";
                return (
                  <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-500/[0.04]">
                    <td className="p-3 font-mono text-[11px] text-slate-500">{d.user_id.slice(0, 6)}…{d.user_id.slice(-4)}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-800">{Number(d.amount).toLocaleString()} <span className="text-slate-400 text-[10px]">{d.currency}</span></td>
                    <td className="p-3 text-slate-600 text-[11px]">{METHOD_LABEL[d.method]}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">
                      {d.proof_url ? (
                        <a href={d.proof_url} target="_blank" rel="noopener noreferrer"
                          className="text-cyan-600 hover:underline inline-flex items-center gap-1">
                          {d.reference || "receipt"} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (d.reference || <span className="text-slate-300">—</span>)}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        d.status === "approved" ? "bg-emerald-500/15 text-emerald-700" :
                        d.status === "rejected" ? "bg-rose-500/15 text-rose-700" :
                        "bg-amber-500/15 text-amber-700"
                      }`}>{d.status}</span>
                    </td>
                    <td className="p-3 text-[11px] text-slate-500 italic max-w-[160px] truncate" title={d.review_note ?? undefined}>
                      {d.review_note || <span className="text-slate-300 not-italic">—</span>}
                    </td>
                    <td className={`p-3 text-right font-mono text-[11px] ${stale ? "text-amber-600" : "text-slate-400"}`}>{age}m</td>
                    <td className="p-3 text-right">
                      {d.status === "pending" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" disabled={busyId === d.id}
                            onClick={() => openReview(d, true)}
                            className="h-7 px-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 border border-emerald-500/30">
                            {busyId === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" disabled={busyId === d.id}
                            onClick={() => openReview(d, false)}
                            className="h-7 px-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 border border-rose-500/30">
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : <span className="text-slate-300 text-[10px]">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!target} onOpenChange={(o) => { if (!o) setTarget(null); }}>
        <DialogContent className="bg-[#ffffff] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{approveMode ? "Approve deposit" : "Reject deposit"}</DialogTitle>
          </DialogHeader>
          {target && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg p-3 bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex justify-between"><span className="text-white/50">Amount</span><span className="font-mono font-bold">{Number(target.amount).toLocaleString()} {target.currency}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Method</span><span>{METHOD_LABEL[target.method]}</span></div>
                {target.reference && <div className="flex justify-between"><span className="text-white/50">Reference</span><span className="font-mono text-[11px]">{target.reference}</span></div>}
                <div className="flex justify-between"><span className="text-white/50">User</span><span className="font-mono text-[11px]">{target.user_id.slice(0, 8)}…{target.user_id.slice(-6)}</span></div>
              </div>
              {approveMode && (
                <div className="rounded-lg px-3 py-2 text-[11px] flex items-center gap-2 border"
                  style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.25)", color: "#6ee7b7" }}>
                  <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
                  Credits the wallet via the canonical ledger. Blocked in demo mode.
                </div>
              )}
              <div>
                <label className="text-xs text-white/60">{approveMode ? "Note (optional)" : "Reason (required)"}</label>
                <Input value={note} onChange={e => setNote(e.target.value)} maxLength={500}
                  placeholder={approveMode ? "e.g. UTR matched in bank statement" : "e.g. reference not found / amount mismatch"}
                  className="bg-white/[0.03] border-white/10 text-white mt-1" autoFocus />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-white/10 text-white" onClick={() => setTarget(null)}>Cancel</Button>
                <Button onClick={submitReview} disabled={busyId === target.id}
                  className={`flex-1 text-white ${approveMode ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"}`}>
                  {busyId === target.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (approveMode ? "Approve & credit" : "Reject")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

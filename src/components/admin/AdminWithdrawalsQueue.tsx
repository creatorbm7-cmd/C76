import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeAdminCasino } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Check, X, Wallet, RefreshCw, ExternalLink, Zap, Clock, DollarSign, CheckCircle2, ShieldAlert } from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

const EXPLORERS: Record<string, string> = {
  TRC20: "https://tronscan.org/#/transaction/",
  ERC20: "https://etherscan.io/tx/",
  BEP20: "https://bscscan.com/tx/",
  BTC: "https://mempool.space/tx/",
};

interface Withdrawal {
  id: string;
  tx_code: string;
  user_id: string;
  chain: string;
  to_address: string;
  amount: number;
  fee: number;
  net_amount: number | null;
  status: string;
  tx_hash: string | null;
  review_note: string | null;
  created_at: string;
  processed_at: string | null;
}

export default function AdminWithdrawalsQueue() {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [filter, setFilter] = useState<"pending" | "processing" | "completed" | "rejected" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Withdrawal | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  // Auto-approve amount cap (platform_settings.withdrawal_auto_approve_threshold).
  // Cash-outs above this are NOT auto-paid — they wait for manual review. "0" /
  // blank disables the cap. `threshold` is the saved value; `thresholdInput` is
  // the editable field. `skippedCount` surfaces how many rows the loop parked.
  const [threshold, setThreshold] = useState<number>(0);
  const [thresholdInput, setThresholdInput] = useState<string>("");
  const [thresholdBusy, setThresholdBusy] = useState(false);
  const [skippedCount, setSkippedCount] = useState(0);
  // Rows the auto-loop parked (over cap / not eligible) this session — excluded
  // from re-attempts so realtime refreshes don't hammer the edge function.
  const skippedRef = useRef<Set<string>>(new Set());
  // All-status roll-up (UNFILTERED, display-only) so the summary cards/badges show
  // real history even while the LIST below is filtered to one status (default:
  // pending). Never affects the queue rows or any money action.
  const [totals, setTotals] = useState({ total: 0, pending: 0, processing: 0, completed: 0, rejected: 0, failed: 0, refunded: 0, pendingAmount: 0, completedAmount: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("crypto_withdrawals").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setItems((data ?? []) as Withdrawal[]);

    // Unfiltered status/amount roll-up for the summary strip (read-only display).
    const { data: allRows } = await supabase.from("crypto_withdrawals").select("status, amount");
    const t = { total: 0, pending: 0, processing: 0, completed: 0, rejected: 0, failed: 0, refunded: 0, pendingAmount: 0, completedAmount: 0 };
    (allRows ?? []).forEach((r: any) => {
      t.total++;
      const s = String(r.status);
      if (Object.prototype.hasOwnProperty.call(t, s)) (t as any)[s]++;
      if (s === "pending") t.pendingAmount += Number(r.amount || 0);
      if (s === "completed") t.completedAmount += Number(r.amount || 0);
    });
    setTotals(t);
    setLoading(false);
  }, [filter]);

  const loadAuto = useCallback(async () => {
    const { data } = await supabase.from("platform_settings").select("key, value")
      .in("key", ["withdrawal_auto_approve", "withdrawal_auto_approve_threshold"]);
    const map = new Map((data ?? []).map((r: any) => [r.key, String(r.value ?? "")]));
    const v = (map.get("withdrawal_auto_approve") ?? "false").toLowerCase();
    setAutoApprove(["true", "1", "on", "yes"].includes(v));
    const thr = Number(map.get("withdrawal_auto_approve_threshold") ?? 0);
    const safeThr = Number.isFinite(thr) && thr > 0 ? thr : 0;
    setThreshold(safeThr);
    setThresholdInput(safeThr ? String(safeThr) : "");
  }, []);

  const saveThreshold = async () => {
    const raw = thresholdInput.trim();
    const n = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(n) || n < 0) { toast.error("Enter a non-negative amount (0 disables the cap)"); return; }
    setThresholdBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("platform_settings")
      .upsert({ key: "withdrawal_auto_approve_threshold", value: String(n), updated_by: user?.id ?? null, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setThresholdBusy(false);
    if (error) { toast.error(error.message); return; }
    setThreshold(n);
    setThresholdInput(n ? String(n) : "");
    skippedRef.current.clear();
    setSkippedCount(0);
    toast.success(n > 0 ? `Auto-approve cap set to $${n} — larger cash-outs wait for manual review` : "Auto-approve cap disabled — all eligible cash-outs auto-pay");
  };

  const toggleAuto = async (next: boolean) => {
    if (next && !confirm(
      "Turn ON withdrawal auto-approve?\n\n" +
      "Every pending cash-out will be broadcast on-chain automatically, with NO " +
      "manual review — while this admin queue is open. This removes the AML/fraud " +
      "review step. The per-user KYC gate still applies.\n\nContinue?"
    )) return;
    setAutoBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("platform_settings")
      .upsert({ key: "withdrawal_auto_approve", value: next ? "true" : "false", updated_by: user?.id ?? null, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setAutoBusy(false);
    if (error) { toast.error(error.message); return; }
    setAutoApprove(next);
    toast.success(next ? "Auto-approve ON — pending withdrawals clear automatically" : "Auto-approve OFF — withdrawals wait for manual review");
  };

  useEffect(() => {
    load();
    loadAuto();
    const ch = supabase
      .channel("admin-withdrawals-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "crypto_withdrawals" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, loadAuto]);

  // Approve a single withdrawal via the PIN-gated edge path.
  //  * `silent`  — skip per-row toasts so the auto-approve loop runs hands-off.
  //  * `auto`    — mark this as an automated approve so the server applies the
  //                auto-approve amount cap (a MANUAL approve, auto omitted, is
  //                never capped: a human is already reviewing).
  // Returns "ok" (paid), "skipped" (over cap → left pending), or "failed".
  const approveOne = useCallback(async (w: Withdrawal, opts?: { silent?: boolean; auto?: boolean }): Promise<"ok" | "skipped" | "failed"> => {
    const silent = opts?.silent ?? false;
    try {
      const { data, error } = await invokeAdminCasino<{ success?: boolean; error?: string; skipped?: boolean; reason?: string }>({
        action: "approve_withdrawal", withdrawal_id: w.id, ...(opts?.auto ? { auto: true } : {}),
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Approve failed");
      if (data?.skipped) {
        if (!silent) toast.info(data.reason || "Left pending — above the auto-approve cap");
        return "skipped";
      }
      if (!silent) toast.success("Withdrawal approved & marked completed");
      return "ok";
    } catch (e: any) {
      toast.error(`Approve failed for ${w.tx_code}: ${e.message}`);
      return "failed";
    }
  }, []);

  const approve = async (w: Withdrawal) => {
    if (!confirm(`Approve withdrawal of $${w.amount} to ${w.to_address}?`)) return;
    setBusyId(w.id);
    await approveOne(w); // manual → not subject to the auto-approve cap
    setBusyId(null);
    load();
  };

  // Auto-approve loop: while the flag is ON and an admin has this queue open,
  // clear pending withdrawals one at a time (sequential — never parallel-broadcast).
  // A failure (e.g. expired PIN session) stops the run so it doesn't hammer the
  // edge function; the admin can re-enter their PIN and it resumes on next change.
  const autoLockRef = useRef(false);
  useEffect(() => {
    if (!autoApprove || autoLockRef.current) return;
    // Skip rows already parked this session (over cap) so we don't re-hit the
    // edge function on every realtime refresh.
    const pending = items.filter(i => i.status === "pending" && !skippedRef.current.has(i.id));
    if (pending.length === 0) return;

    let cancelled = false;
    autoLockRef.current = true;
    setAutoRunning(true);
    (async () => {
      for (const w of pending) {
        if (cancelled) break;
        setBusyId(w.id);
        const r = await approveOne(w, { silent: true, auto: true });
        setBusyId(null);
        if (r === "skipped") {
          // Over the auto-approve cap — leave it pending for manual review and
          // stop retrying it. Keep processing the rest of the batch.
          skippedRef.current.add(w.id);
          setSkippedCount(skippedRef.current.size);
          continue;
        }
        if (r === "failed") break; // stop the batch on real failure (likely stale PIN)
      }
      autoLockRef.current = false;
      setAutoRunning(false);
      if (!cancelled) load();
    })();

    return () => { cancelled = true; };
  }, [autoApprove, items, approveOne, load]);

  const reject = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      const { data, error } = await invokeAdminCasino<{ success?: boolean; error?: string }>({
        action: "reject_withdrawal", withdrawal_id: rejectTarget.id, reason: rejectReason.trim() || "Rejected by admin",
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Reject failed");
      toast.success("Withdrawal rejected & user balance refunded");
      setRejectTarget(null); setRejectReason("");
      load();
    } catch (e: any) { toast.error(e.message); }
    setBusyId(null);
  };

  const forceComplete = async (w: Withdrawal) => {
    const txHash = prompt(
      `Force-complete stuck withdrawal #${w.tx_code}?\n` +
      `Amount: $${w.amount} on ${w.chain} → ${w.to_address.slice(0, 10)}…${w.to_address.slice(-6)}\n\n` +
      "Optional: paste the actual on-chain tx hash (leave blank to mark with a manual_ tag).\n" +
      "Press Cancel to abort.",
      ""
    );
    if (txHash === null) return;
    setBusyId(w.id);
    try {
      const { data, error } = await invokeAdminCasino<{ success?: boolean; error?: string; tx_hash?: string }>({
        action: "force_complete_withdrawal", withdrawal_id: w.id, tx_hash: txHash.trim() || null,
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Force complete failed");
      toast.success(`Withdrawal marked completed (${data?.tx_hash?.slice(0, 14)}…)`);
      load();
    } catch (e: any) { toast.error(e.message); }
    setBusyId(null);
  };

  const forceFail = async (w: Withdrawal) => {
    const reason = prompt(`Force-fail withdrawal #${w.tx_code} and refund $${w.amount} to the user?\nEnter a reason (will be visible to the user):`, "Manual override — payout failed");
    if (!reason) return;
    setBusyId(w.id);
    try {
      const { data, error } = await invokeAdminCasino<{ success?: boolean; error?: string }>({
        action: "force_complete_withdrawal", withdrawal_id: w.id, mark_failed: true, reason,
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Force fail failed");
      toast.success("Withdrawal force-failed & user refunded");
      load();
    } catch (e: any) { toast.error(e.message); }
    setBusyId(null);
  };


  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="space-y-4">
        {/* PREMIUM HERO */}
        <V8PageHero
          eyebrow="Finance · Withdrawals"
          title="WITHDRAWALS"
          tone="rose"
          icon={<Wallet className="h-5 w-5" />}
          badges={[
            { label: `${totals.pending} PENDING`, tone: "amber", dot: true },
            { label: `$${totals.pendingAmount.toFixed(2)} AWAITING`, tone: "rose" },
            { label: `${totals.completed} PAID`, tone: "emerald" },
          ]}
          subtitle={<>User cash-out review queue · <span className="font-bold" style={{ color: "#d97706" }}>{totals.pending}</span> pending · ${totals.pendingAmount.toFixed(2)} awaiting · <span className="font-bold" style={{ color: "#059669" }}>{totals.completed}</span> completed (${totals.completedAmount.toFixed(2)}) all-time.</>}
          actions={
            <V8HeroBtn variant="ghost" onClick={load} disabled={loading} title="Refresh queue">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </V8HeroBtn>
          }
        />

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <V8StatCard icon={<Clock className="h-4 w-4" />} label="Pending" value={totals.pending} sub="awaiting review" tone="amber" delay={0} />
          <V8StatCard icon={<DollarSign className="h-4 w-4" />} label="Pending amount" value={totals.pendingAmount} prefix="$" sub="to be paid out" tone="rose" delay={80} />
          <V8StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Completed" value={totals.completed} sub="paid on-chain" tone="emerald" delay={160} />
          <V8StatCard icon={<Wallet className="h-4 w-4" />} label="All withdrawals" value={totals.total} sub="all statuses" tone="cyan" delay={240} />
        </div>

        {/* FILTERS */}
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {(["pending", "processing", "completed", "rejected", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-md font-semibold transition ${
                filter === f ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}>{f}</button>
          ))}
        </div>

      {/* Auto-approve withdrawals — status card */}
      <div className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
        autoApprove
          ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-white shadow-[0_0_0_1px_rgba(16,185,129,0.12),0_12px_30px_-14px_rgba(16,185,129,0.5)]"
          : "border-slate-200 bg-slate-50/70"}`}>
        {autoApprove && <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-3xl" />}
        <div className="relative flex items-start gap-3">
          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
            autoApprove ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "bg-slate-200 text-slate-400"}`}>
            <Zap className={`h-5 w-5 ${autoApprove ? "animate-pulse" : ""}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-900">Auto-approve withdrawals</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                autoApprove ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${autoApprove ? "bg-white animate-pulse" : "bg-slate-400"}`} />
                {autoApprove ? "Automation ON" : "Manual review"}
              </span>
              {autoRunning && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><Loader2 className="h-3 w-3 animate-spin" /> processing…</span>}
            </div>
            <div className="mt-1 text-[11px] leading-relaxed text-slate-500">
              When ON, eligible pending cash-outs are broadcast on-chain automatically — no per-row clicking — while this queue stays open in your live admin-PIN session.
            </div>
          </div>
          <button
            role="switch"
            aria-checked={autoApprove}
            aria-label="Toggle withdrawal auto-approve"
            disabled={autoBusy}
            onClick={() => toggleAuto(!autoApprove)}
            className={`relative inline-flex h-7 w-[52px] flex-shrink-0 items-center rounded-full transition-all duration-300 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 ${
              autoApprove ? "bg-emerald-500 shadow-inner shadow-emerald-700/30" : "bg-slate-300"}`}
          >
            {autoBusy
              ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin text-white" />
              : <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-all duration-300 ${autoApprove ? "translate-x-[26px]" : "translate-x-1"}`} />}
          </button>
        </div>
        {autoApprove && (
          <>
            {/* Auto-approve amount cap — the actual gate that limits hands-off payouts. */}
            <div className="relative mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="min-w-[140px] flex-1">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Auto-approve cap (USDT)</label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-slate-400 text-sm">$</span>
                  <Input
                    type="number" min="0" step="1" inputMode="decimal"
                    value={thresholdInput}
                    onChange={e => setThresholdInput(e.target.value)}
                    placeholder="0 = no cap"
                    className="h-8 w-28 bg-white border-slate-200 text-slate-900"
                  />
                  <Button size="sm" onClick={saveThreshold} disabled={thresholdBusy}
                    className="h-8 bg-slate-900 hover:bg-slate-800 text-white">
                    {thresholdBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>
              <p className="flex-1 min-w-[180px] text-[11px] leading-relaxed text-slate-500">
                {threshold > 0
                  ? <>Cash-outs over <b className="text-slate-700">${threshold}</b> are <b>not</b> auto-paid — they stay pending for manual review.</>
                  : <>No cap set — <b className="text-amber-700">every</b> eligible cash-out auto-pays. Set a value to require manual review above it.</>}
                {skippedCount > 0 && <> <span className="text-amber-700">{skippedCount} held for review this session.</span></>}
              </p>
            </div>
            <div className="relative mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-amber-800">
              <ShieldAlert className="mt-px h-4 w-4 flex-shrink-0 text-amber-600" />
              <span><b>Human AML / fraud review is OFF for cash-outs at or below the cap.</b> Those pay out automatically. The per-user KYC, wagering and real-deposit gates still apply.</span>
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 overflow-hidden" style={{ background: "#ffffff" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-200">
                <th className="text-left p-3">Ref</th>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Chain</th>
                <th className="text-left p-3">Address</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-right p-3">Net</th>
                <th className="text-center p-3">Status</th>
                <th className="text-left p-3">Tx / Note</th>
                <th className="text-right p-3">Age</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="p-10 text-center text-slate-400">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={10} className="p-10 text-center text-slate-400">
                  No {filter !== "all" ? filter : ""} withdrawals.
                  {filter === "pending" && totals.completed > 0 && (
                    <> {" "}<span className="text-slate-500">{totals.completed} completed (${totals.completedAmount.toFixed(2)}) — switch to <b>Completed</b> / <b>All</b> above, or see <b>Treasury → Liability &amp; Reconcile</b>.</span></>
                  )}
                </td></tr>
              ) : items.map(w => {
                const age = Math.floor((Date.now() - new Date(w.created_at).getTime()) / 60000);
                const stale = age > 30 && w.status === "pending";
                return (
                  <tr key={w.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-mono text-[11px] text-cyan-600 whitespace-nowrap" title={w.tx_code}>{w.tx_code}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">{w.user_id.slice(0, 6)}…{w.user_id.slice(-4)}</td>
                    <td className="p-3 text-slate-700 text-[11px] uppercase">{w.chain}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-400" title={w.to_address}>
                      {w.to_address.slice(0, 8)}…{w.to_address.slice(-6)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">${Number(w.amount).toFixed(2)}</td>
                    <td className="p-3 text-right font-mono text-slate-600">${Number(w.net_amount ?? w.amount - w.fee).toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        w.status === "completed" ? "bg-emerald-500/15 text-emerald-600" :
                        w.status === "processing" ? "bg-cyan-500/15 text-cyan-600" :
                        w.status === "rejected" ? "bg-yellow-500/15 text-yellow-700" :
                        "bg-amber-500/15 text-amber-600"
                      }`}>{w.status}</span>
                    </td>
                    <td className="p-3 text-[11px]">
                      {w.tx_hash ? (
                        <a href={`${EXPLORERS[w.chain] || "#"}${w.tx_hash}`} target="_blank" rel="noopener noreferrer"
                          className="text-cyan-600 hover:underline font-mono inline-flex items-center gap-1">
                          {w.tx_hash.slice(0, 10)}… <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : w.review_note ? (
                        <span className="text-yellow-700/80 italic">{w.review_note}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className={`p-3 text-right font-mono text-[11px] ${stale ? "text-amber-600" : "text-slate-400"}`}>{age}m</td>
                    <td className="p-3 text-right">
                      {w.status === "pending" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" disabled={busyId === w.id}
                            onClick={() => approve(w)}
                            className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-600">
                            {busyId === w.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" disabled={busyId === w.id}
                            onClick={() => { setRejectTarget(w); setRejectReason(""); }}
                            className="h-7 px-2.5 bg-yellow-500 hover:bg-yellow-600 text-white border border-yellow-500">
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : w.status === "processing" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" disabled={busyId === w.id} onClick={() => forceComplete(w)}
                            className="h-7 px-2.5 bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-600"
                            title="Force complete with tx hash">
                            {busyId === w.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" disabled={busyId === w.id} onClick={() => forceFail(w)}
                            className="h-7 px-2.5 bg-yellow-500 hover:bg-yellow-600 text-white border border-yellow-500"
                            title="Force fail & refund user">
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

      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) setRejectTarget(null); }}>
        <DialogContent className="bg-[#ffffff] border border-slate-200 text-slate-900">
          <DialogHeader><DialogTitle>Reject withdrawal</DialogTitle></DialogHeader>
          {rejectTarget && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg p-3 bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-mono font-bold">${Number(rejectTarget.amount).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Chain</span><span>{rejectTarget.chain}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">To</span><span className="font-mono text-[11px]">{rejectTarget.to_address.slice(0, 12)}…{rejectTarget.to_address.slice(-6)}</span></div>
              </div>
              <div>
                <label className="text-xs text-slate-600">Reason (refunded to user)</label>
                <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} maxLength={500}
                  placeholder="e.g. Suspicious address, KYC required…"
                  className="bg-white border-slate-200 text-slate-900 mt-1" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-slate-200 text-slate-700" onClick={() => setRejectTarget(null)}>Cancel</Button>
                <Button onClick={reject} disabled={busyId === rejectTarget.id}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white">
                  {busyId === rejectTarget.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject & refund"}
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

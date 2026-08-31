import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeAdminCasino } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Search, Download, RefreshCw, CheckCircle2, XCircle, TrendingUp,
  ArrowDownToLine, ArrowUpFromLine, Activity, Loader2,
} from "lucide-react";

type SubTab = "all" | "deposits" | "withdrawals" | "owner";
const PAGE = 50;
const TYPE_OPTIONS = ["all", "bet", "win", "deposit", "withdrawal", "bonus", "admin_credit", "admin_debit"];

export default function AdminActivity() {
  const [sub, setSub] = useState<SubTab>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [txs, setTxs] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [owner, setOwner] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<{ id: string; action: "approve" | "reject"; row: any } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    const [txRes, depRes, wdRes, owRes] = await Promise.all([
      supabase.from("casino_transactions").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("crypto_deposits").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("crypto_withdrawals").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("owner_withdrawals").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setTxs(txRes.data || []);
    setDeposits(depRes.data || []);
    setWithdrawals(wdRes.data || []);
    setOwner(owRes.data || []);

    const ids = new Set<string>();
    [...(txRes.data || []), ...(depRes.data || []), ...(wdRes.data || [])].forEach(r => r.user_id && ids.add(r.user_id));
    if (ids.size) {
      const { data: profs } = await supabase.from("profiles").select("id, email").in("id", [...ids]);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p.email || ""; });
      setProfiles(map);
    }
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("admin-activity")
      .on("postgres_changes", { event: "*", schema: "public", table: "crypto_withdrawals" }, () => load(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "crypto_deposits" }, () => load(true))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "casino_bets" }, () => load(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "casino_transactions" }, () => load(true))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  // KPIs (24h)
  const kpis = useMemo(() => {
    const cutoff = Date.now() - 86400000;
    const dep24 = deposits.filter(d => +new Date(d.created_at) > cutoff);
    const wd24 = withdrawals.filter(w => +new Date(w.created_at) > cutoff);
    const tx24 = txs.filter(t => +new Date(t.created_at) > cutoff);
    return {
      volume: tx24.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0),
      deposits: dep24.reduce((s, d) => s + Number(d.amount || 0), 0),
      withdrawals: wd24.reduce((s, w) => s + Number(w.amount || 0), 0),
      pending: withdrawals.filter(w => w.status === "pending").length,
    };
  }, [txs, deposits, withdrawals]);

  // Filter helpers
  const matchSearch = (userId: string) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (profiles[userId] || "").toLowerCase().includes(q) || userId.toLowerCase().includes(q);
  };
  const matchDate = (createdAt: string) => {
    if (dateFrom && createdAt < dateFrom) return false;
    if (dateTo && createdAt > dateTo + "T23:59:59") return false;
    return true;
  };

  const rows = useMemo(() => {
    if (sub === "all") {
      let r = txs.filter(t => matchSearch(t.user_id) && matchDate(t.created_at || ""));
      if (typeFilter !== "all") r = r.filter(t => t.type === typeFilter);
      return r;
    }
    if (sub === "deposits") return deposits.filter(d => matchSearch(d.user_id) && matchDate(d.created_at || ""));
    if (sub === "withdrawals") return withdrawals.filter(w => matchSearch(w.user_id) && matchDate(w.created_at || ""));
    return owner.filter(o => matchDate(o.created_at || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub, txs, deposits, withdrawals, owner, search, typeFilter, dateFrom, dateTo, profiles]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE));
  const paged = rows.slice((page - 1) * PAGE, page * PAGE);
  useEffect(() => { setPage(1); }, [sub, search, typeFilter, dateFrom, dateTo]);

  const exportCsv = () => {
    if (!rows.length) return toast.error("Nothing to export");
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${sub}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const runReview = async () => {
    if (!confirm) return;
    setBusy(true);
    const { data, error } = await invokeAdminCasino<{ success?: boolean; error?: string }>({
      action: confirm.action === "approve" ? "approve_withdrawal" : "reject_withdrawal",
      withdrawal_id: confirm.id,
      ...(confirm.action === "reject" ? { reason: reason.trim() || "Rejected by admin" } : {}),
    });
    setBusy(false);
    if (error || data?.error) {
      toast.error(error?.message || data?.error || "Failed");
      return;
    }
    toast.success(`Withdrawal ${confirm.action === "approve" ? "approved" : "rejected"}`);
    setConfirm(null); setReason("");
    load(true);
  };

  const subs: { id: SubTab; label: string; count?: number; icon: any }[] = [
    { id: "all", label: "Transactions", icon: Activity, count: txs.length },
    { id: "deposits", label: "Deposits", icon: ArrowDownToLine, count: deposits.length },
    { id: "withdrawals", label: "Pending W/D", icon: ArrowUpFromLine, count: withdrawals.filter(w => w.status === "pending").length },
    { id: "owner", label: "Owner W/D", icon: TrendingUp, count: owner.length },
  ];

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "24h Volume", value: `$${kpis.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
          { label: "24h Deposits", value: `$${kpis.deposits.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
          { label: "24h Withdrawals", value: `$${kpis.withdrawals.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
          { label: "Pending W/D", value: String(kpis.pending), highlight: kpis.pending > 0 },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl p-4 bg-dtx-panel border border-dtx-border">
            <div className="text-[10px] uppercase tracking-widest text-dtx-muted">{k.label}</div>
            <div className={`text-xl font-bold mt-1 ${k.highlight ? "text-amber-400" : "text-dtx-mint"}`} style={{ fontFamily: "Space Mono, monospace" }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-dtx-bg border border-dtx-border">
        {subs.map(s => {
          const Icon = s.icon; const active = sub === s.id;
          return (
            <button key={s.id} onClick={() => setSub(s.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                active ? "bg-dtx-mint text-dtx-bg" : "text-dtx-muted hover:text-foreground"
              }`}>
              <Icon className="h-3.5 w-3.5" /> {s.label}
              {typeof s.count === "number" && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${active ? "bg-dtx-bg/20 text-dtx-bg" : "bg-dtx-panel2 text-dtx-muted"}`}>{s.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-dtx-muted" />
          <Input placeholder="Search by email or user id…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 bg-dtx-panel border-dtx-border text-foreground text-xs" />
        </div>
        {sub === "all" && (
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="h-9 px-3 rounded-md bg-dtx-panel border border-dtx-border text-foreground text-xs">
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t === "all" ? "All Types" : t}</option>)}
          </select>
        )}
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-auto bg-dtx-panel border-dtx-border text-foreground text-xs" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-auto bg-dtx-panel border-dtx-border text-foreground text-xs" />
        <Button onClick={() => load(true)} variant="outline" size="sm" className="h-9 border-dtx-border text-dtx-muted hover:text-foreground">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
        <Button onClick={exportCsv} variant="outline" size="sm" className="h-9 border-dtx-border text-dtx-muted hover:text-foreground">
          <Download className="h-3.5 w-3.5 mr-1" /> CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-dtx-panel border border-dtx-border overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-8 rounded bg-dtx-panel2 animate-pulse" />)}
          </div>
        ) : paged.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="h-10 w-10 text-dtx-muted/40 mx-auto mb-3" />
            <p className="text-sm text-dtx-muted">No records match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ fontFamily: "DM Sans, sans-serif" }}>
              {sub === "all" && <TxRows rows={paged} profiles={profiles} />}
              {sub === "deposits" && <DepRows rows={paged} profiles={profiles} />}
              {sub === "withdrawals" && <WdRows rows={paged} profiles={profiles} onAction={(id, action, row) => setConfirm({ id, action, row })} />}
              {sub === "owner" && <OwnerRows rows={paged} />}
            </table>
          </div>
        )}
        {!loading && paged.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-dtx-border text-[11px] text-dtx-muted">
            <span>Page {page} of {totalPages} · {rows.length} rows</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7 border-dtx-border">Prev</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-7 border-dtx-border">Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <AlertDialog open={!!confirm} onOpenChange={o => { if (!o) { setConfirm(null); setReason(""); } }}>
        <AlertDialogContent className="bg-dtx-panel border-dtx-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              {confirm?.action === "approve" ? "Approve withdrawal?" : "Reject withdrawal?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-dtx-muted">
              {confirm && (
                <>
                  Amount: <b className="text-dtx-mint">${Number(confirm.row.amount).toFixed(2)}</b> on <b>{confirm.row.chain}</b><br />
                  To: <span className="font-mono text-[11px]">{confirm.row.to_address?.slice(0, 16)}…{confirm.row.to_address?.slice(-6)}</span><br />
                  User: {profiles[confirm.row.user_id] || confirm.row.user_id?.slice(0, 8)}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirm?.action === "reject" && (
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional rejection reason"
              className="bg-dtx-bg border-dtx-border text-foreground text-xs" />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-dtx-bg border-dtx-border text-foreground hover:bg-dtx-panel2">Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={runReview}
              className={confirm?.action === "approve" ? "bg-dtx-win text-black hover:bg-dtx-win/90" : "bg-dtx-loss text-white hover:bg-dtx-loss/90"}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : confirm?.action === "approve" ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---- Sub tables ----
function TxRows({ rows, profiles }: { rows: any[]; profiles: Record<string, string> }) {
  return (
    <>
      <thead className="bg-dtx-bg/50">
        <tr className="text-dtx-muted">
          <th className="text-left p-3 font-semibold">User</th><th className="text-left p-3 font-semibold">Type</th>
          <th className="text-right p-3 font-semibold">Amount</th><th className="text-left p-3 font-semibold">Description</th>
          <th className="text-right p-3 font-semibold">Date</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(t => {
          const positive = Number(t.amount) >= 0;
          return (
            <tr key={t.id} className="border-t border-dtx-border/40 hover:bg-dtx-panel2/40">
              <td className="p-3 text-foreground/80">{profiles[t.user_id] || t.user_id?.slice(0, 8)}</td>
              <td className="p-3"><TypeChip type={t.type} /></td>
              <td className="p-3 text-right font-bold" style={{ fontFamily: "Space Mono, monospace", color: positive ? "hsl(var(--dtx-win))" : "hsl(var(--dtx-loss))" }}>
                {positive ? "+" : ""}{Number(t.amount).toFixed(2)}
              </td>
              <td className="p-3 text-dtx-muted truncate max-w-xs">{t.description || "—"}</td>
              <td className="p-3 text-right text-dtx-muted">{new Date(t.created_at).toLocaleString()}</td>
            </tr>
          );
        })}
      </tbody>
    </>
  );
}

function DepRows({ rows, profiles }: { rows: any[]; profiles: Record<string, string> }) {
  return (
    <>
      <thead className="bg-dtx-bg/50">
        <tr className="text-dtx-muted">
          <th className="text-left p-3 font-semibold">User</th><th className="text-right p-3 font-semibold">Amount</th>
          <th className="text-left p-3 font-semibold">Chain</th><th className="text-left p-3 font-semibold">TX</th>
          <th className="text-left p-3 font-semibold">Status</th><th className="text-right p-3 font-semibold">Date</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(d => (
          <tr key={d.id} className="border-t border-dtx-border/40 hover:bg-dtx-panel2/40">
            <td className="p-3 text-foreground/80">{profiles[d.user_id] || d.user_id?.slice(0, 8)}</td>
            <td className="p-3 text-right font-bold text-dtx-win" style={{ fontFamily: "Space Mono, monospace" }}>${Number(d.amount || 0).toFixed(2)}</td>
            <td className="p-3 text-foreground/70">{d.chain}</td>
            <td className="p-3 text-dtx-muted font-mono text-[11px]">{d.tx_hash ? `${d.tx_hash.slice(0, 10)}…` : "—"}</td>
            <td className="p-3"><StatusChip s={d.status} /></td>
            <td className="p-3 text-right text-dtx-muted">{new Date(d.created_at).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </>
  );
}

function WdRows({ rows, profiles, onAction }: { rows: any[]; profiles: Record<string, string>; onAction: (id: string, a: "approve" | "reject", row: any) => void }) {
  return (
    <>
      <thead className="bg-dtx-bg/50">
        <tr className="text-dtx-muted">
          <th className="text-left p-3 font-semibold">User</th><th className="text-right p-3 font-semibold">Amount</th>
          <th className="text-left p-3 font-semibold">Chain</th><th className="text-left p-3 font-semibold">Address</th>
          <th className="text-left p-3 font-semibold">Status</th><th className="text-right p-3 font-semibold">Date</th>
          <th className="text-right p-3 font-semibold">Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(w => (
          <tr key={w.id} className="border-t border-dtx-border/40 hover:bg-dtx-panel2/40">
            <td className="p-3 text-foreground/80">{profiles[w.user_id] || w.user_id?.slice(0, 8)}</td>
            <td className="p-3 text-right font-bold text-amber-400" style={{ fontFamily: "Space Mono, monospace" }}>${Number(w.amount).toFixed(2)}</td>
            <td className="p-3 text-foreground/70">{w.chain}</td>
            <td className="p-3 text-dtx-muted font-mono text-[11px]">{w.to_address.slice(0, 10)}…{w.to_address.slice(-6)}</td>
            <td className="p-3"><StatusChip s={w.status} /></td>
            <td className="p-3 text-right text-dtx-muted">{new Date(w.created_at).toLocaleString()}</td>
            <td className="p-3 text-right">
              {w.status === "pending" ? (
                <div className="flex gap-1 justify-end">
                  <Button size="sm" onClick={() => onAction(w.id, "approve", w)} className="h-7 bg-dtx-win text-black hover:bg-dtx-win/90 text-[10px]">
                    <CheckCircle2 className="h-3 w-3" />
                  </Button>
                  <Button size="sm" onClick={() => onAction(w.id, "reject", w)} variant="ghost" className="h-7 text-dtx-loss hover:text-dtx-loss text-[10px]">
                    <XCircle className="h-3 w-3" />
                  </Button>
                </div>
              ) : <span className="text-dtx-muted text-[11px]">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </>
  );
}

function OwnerRows({ rows }: { rows: any[] }) {
  return (
    <>
      <thead className="bg-dtx-bg/50">
        <tr className="text-dtx-muted">
          <th className="text-right p-3 font-semibold">Amount</th><th className="text-left p-3 font-semibold">Chain</th>
          <th className="text-left p-3 font-semibold">Address</th><th className="text-left p-3 font-semibold">TX</th>
          <th className="text-left p-3 font-semibold">Status</th><th className="text-right p-3 font-semibold">Date</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(o => (
          <tr key={o.id} className="border-t border-dtx-border/40 hover:bg-dtx-panel2/40">
            <td className="p-3 text-right font-bold text-dtx-mint" style={{ fontFamily: "Space Mono, monospace" }}>${Number(o.amount).toFixed(2)}</td>
            <td className="p-3 text-foreground/70">{o.chain}</td>
            <td className="p-3 text-dtx-muted font-mono text-[11px]">{o.to_address.slice(0, 10)}…{o.to_address.slice(-6)}</td>
            <td className="p-3 text-dtx-muted font-mono text-[11px]">{o.tx_hash ? `${o.tx_hash.slice(0, 10)}…` : "—"}</td>
            <td className="p-3"><StatusChip s={o.status} /></td>
            <td className="p-3 text-right text-dtx-muted">{new Date(o.created_at).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </>
  );
}

function TypeChip({ type }: { type: string }) {
  const map: Record<string, string> = {
    win: "bg-dtx-win/15 text-dtx-win", bet: "bg-dtx-mint/15 text-dtx-mint",
    deposit: "bg-cyan-500/15 text-cyan-300", withdrawal: "bg-amber-500/15 text-amber-400",
    bonus: "bg-emerald-500/15 text-emerald-300", admin_credit: "bg-emerald-500/15 text-emerald-300",
    admin_debit: "bg-yellow-500/15 text-yellow-300",
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[type] || "bg-dtx-panel2 text-dtx-muted"}`}>{type}</span>;
}

function StatusChip({ s }: { s: string }) {
  const map: Record<string, string> = {
    completed: "bg-dtx-win/15 text-dtx-win", credited: "bg-dtx-win/15 text-dtx-win", confirmed: "bg-dtx-win/15 text-dtx-win",
    pending: "bg-amber-500/15 text-amber-400", processing: "bg-cyan-500/15 text-cyan-300", confirming: "bg-cyan-500/15 text-cyan-300",
    failed: "bg-dtx-loss/15 text-dtx-loss", rejected: "bg-dtx-loss/15 text-dtx-loss",
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${map[s] || "bg-dtx-panel2 text-dtx-muted"}`}>{s || "—"}</span>;
}

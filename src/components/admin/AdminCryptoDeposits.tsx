// On-chain (crypto) deposit queue — the admin surface for the automatic
// USDT-TRC20 deposit pipeline, parallel to Manual Deposits in the same console.
//
// Server contract (all is_admin-gated, in public schema):
//   admin_list_unmatched_deposits()             → all incoming_deposits rows
//   admin_credit_deposit(tx_hash, user_id, note) → match + credit a deposit
//   admin_hold_deposit(tx_hash, note)           → mark pending_review
//   admin_ignore_deposit(tx_hash, note)         → mark ignored (note required)
//
// The deposit-watcher-tron edge function feeds this table; matched deposits
// within the auto-credit cap are credited automatically, larger ones land
// here as 'hold_review' for manual release, and unattributable ones as
// 'unmatched'. This tab also shows the watcher's heartbeat (deposit_monitors).

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Coins, RefreshCw, ExternalLink, Check, X, Clock, Radio, DollarSign, Wallet } from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

type Status = "unmatched" | "pending_review" | "hold_review" | "credited" | "ignored" | "duplicate";

interface Deposit {
  id: string;
  tx_hash: string;
  amount: number;
  currency: string;
  chain: string;
  from_address: string;
  to_address: string;
  block_timestamp: string;
  detected_at: string;
  status: Status;
  notes: string | null;
  matched_user_id: string | null;
  matched_user_email: string | null;
  credited_at: string | null;
}

interface Monitor {
  is_running: boolean;
  last_run_at: string | null;
  error_count: number;
}

const EXPLORERS: Record<string, string> = {
  TRC20: "https://tronscan.org/#/transaction/",
  tron: "https://tronscan.org/#/transaction/",
  ERC20: "https://etherscan.io/tx/",
  BEP20: "https://bscscan.com/tx/",
};

const STATUS_STYLE: Record<Status, string> = {
  unmatched: "bg-amber-500/15 text-amber-300",
  pending_review: "bg-sky-500/15 text-sky-300",
  hold_review: "bg-fuchsia-500/15 text-fuchsia-300",
  credited: "bg-emerald-500/15 text-emerald-300",
  ignored: "bg-zinc-500/15 text-zinc-300",
  duplicate: "bg-rose-500/15 text-rose-300",
};

const FILTERS: (Status | "all")[] = ["unmatched", "hold_review", "pending_review", "credited", "all"];

const short = (s: string, n = 6) => (!s ? "—" : s.length <= n * 2 ? s : `${s.slice(0, n)}…${s.slice(-4)}`);

export default function AdminCryptoDeposits() {
  const [items, setItems] = useState<Deposit[]>([]);
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [filter, setFilter] = useState<Status | "all">("unmatched");
  const [loading, setLoading] = useState(true);
  const [busyHash, setBusyHash] = useState<string | null>(null);

  // Credit modal (assign tx → user, then credit)
  const [creditTarget, setCreditTarget] = useState<Deposit | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<{ id: string; email: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string } | null>(null);
  const [creditNote, setCreditNote] = useState("");

  // Ignore modal
  const [ignoreTarget, setIgnoreTarget] = useState<Deposit | null>(null);
  const [ignoreNote, setIgnoreNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, { data: mon }] = await Promise.all([
      supabase.rpc("admin_list_unmatched_deposits"),
      supabase.from("deposit_monitors").select("is_running, last_run_at, error_count").eq("chain", "TRC20").maybeSingle(),
    ]);
    if (error) toast.error(error.message);
    setItems((data ?? []) as Deposit[]);
    setMonitor((mon ?? null) as Monitor | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-crypto-deposits")
      .on("postgres_changes", { event: "*", schema: "public", table: "incoming_deposits" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  // User search for the credit modal
  useEffect(() => {
    if (!creditTarget || userQuery.trim().length < 2) { setUserResults([]); return; }
    let active = true;
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id, email").ilike("email", `%${userQuery.trim()}%`).limit(8);
      if (active) setUserResults((data ?? []) as { id: string; email: string }[]);
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [userQuery, creditTarget]);

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter(i => i.status === filter)),
    [items, filter],
  );
  const heldTotal = useMemo(
    () => items.filter(i => i.status === "hold_review" || i.status === "unmatched").reduce((s, i) => s + Number(i.amount), 0),
    [items],
  );
  const stats = useMemo(() => {
    const pending = items.filter(i => i.status === "unmatched" || i.status === "hold_review" || i.status === "pending_review");
    const credited = items.filter(i => i.status === "credited");
    return {
      count: items.length,
      totalValue: items.reduce((s, i) => s + Number(i.amount), 0),
      pendingCount: pending.length,
      pendingValue: pending.reduce((s, i) => s + Number(i.amount), 0),
      creditedCount: credited.length,
      creditedValue: credited.reduce((s, i) => s + Number(i.amount), 0),
    };
  }, [items]);

  const submitCredit = async () => {
    if (!creditTarget || !selectedUser) return;
    setBusyHash(creditTarget.tx_hash);
    const { error } = await supabase.rpc("admin_credit_deposit", {
      p_tx_hash: creditTarget.tx_hash, p_user_id: selectedUser.id, p_admin_note: creditNote.trim() || null,
    });
    setBusyHash(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Credited ${Number(creditTarget.amount).toLocaleString()} ${creditTarget.currency} → ${selectedUser.email}`);
    setCreditTarget(null); setSelectedUser(null); setUserQuery(""); setCreditNote(""); load();
  };

  const submitIgnore = async () => {
    if (!ignoreTarget || !ignoreNote.trim()) { toast.error("A reason is required"); return; }
    setBusyHash(ignoreTarget.tx_hash);
    const { error } = await supabase.rpc("admin_ignore_deposit", { p_tx_hash: ignoreTarget.tx_hash, p_admin_note: ignoreNote.trim() });
    setBusyHash(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Deposit ignored");
    setIgnoreTarget(null); setIgnoreNote(""); load();
  };

  const monAge = monitor?.last_run_at ? Math.floor((Date.now() - new Date(monitor.last_run_at).getTime()) / 1000) : null;

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="space-y-5">
        {/* PREMIUM HERO */}
        <V8PageHero
          eyebrow="Finance · Crypto Deposits"
          title="CRYPTO DEPOSITS"
          tone="amber"
          icon={<Coins className="h-5 w-5" />}
          badges={[
            { label: `${stats.count} DETECTED`, tone: "cyan", icon: <Coins className="h-3 w-3" /> },
            { label: `${stats.pendingCount} PENDING`, tone: "amber", dot: true },
            { label: `${stats.creditedCount} CREDITED`, tone: "emerald", icon: <Check className="h-3 w-3" /> },
          ]}
          subtitle={
            <>
              USDT-TRC20 on-chain pipeline ·{" "}
              <span className="font-bold av8-mono-num" style={{ color: "#d97706" }}>{heldTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> awaiting review ·{" "}
              <span className="font-bold av8-mono-num" style={{ color: "#0f172a" }}>${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> total detected
            </>
          }
          actions={
            <V8HeroBtn onClick={load} disabled={loading} title="Reload deposits">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </V8HeroBtn>
          }
        />

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <V8StatCard icon={<Coins className="h-4 w-4" />} label="Total Deposits" value={stats.count} sub="detected on-chain" tone="cyan" delay={0} />
          <V8StatCard icon={<DollarSign className="h-4 w-4" />} label="Total Value" value={stats.totalValue} prefix="$" sub="USDT detected" tone="amber" delay={80} />
          <V8StatCard icon={<Wallet className="h-4 w-4" />} label="Credited" value={stats.creditedCount} sub={`$${stats.creditedValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} released`} tone="emerald" delay={160} />
          <V8StatCard icon={<Clock className="h-4 w-4" />} label="Pending" value={stats.pendingCount} sub={`$${stats.pendingValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} awaiting`} tone="rose" delay={240} />
        </div>

        {/* FILTERS */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-md font-semibold transition ${
                filter === f ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-700"
              }`}>{f.replace("_", " ")}</button>
          ))}
        </div>

      {/* Watcher heartbeat */}
      <div className="rounded-lg px-3 py-2 text-[11px] flex items-center gap-2 border"
        style={{
          background: monAge !== null && monAge < 600 ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
          borderColor: monAge !== null && monAge < 600 ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)",
          color: monAge !== null && monAge < 600 ? "#6ee7b7" : "#fcd34d",
        }}>
        <Radio className="h-3.5 w-3.5 flex-shrink-0" />
        {monitor?.last_run_at
          ? <>Watcher last ran {monAge}s ago{monitor.error_count ? ` · ${monitor.error_count} error(s)` : ""}{monitor.is_running ? " · running" : ""}</>
          : <>Watcher has never run — deposit-watcher-tron is not deployed/scheduled yet (pipeline inactive).</>}
      </div>

      <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: "#ffffff" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-[10px] uppercase tracking-wider border-b border-white/[0.06]">
                <th className="text-left p-3">Tx</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-left p-3">From (sender)</th>
                <th className="text-left p-3">To address</th>
                <th className="text-left p-3">User</th>
                <th className="text-center p-3">Status</th>
                <th className="text-right p-3">Detected</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-10 text-center text-white/30">Loading…</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-white/30">No {filter !== "all" ? filter.replace("_", " ") : ""} deposits</td></tr>
              ) : visible.map(d => {
                const age = Math.floor((Date.now() - new Date(d.detected_at).getTime()) / 60000);
                const explorer = EXPLORERS[d.chain];
                const actionable = d.status === "unmatched" || d.status === "hold_review" || d.status === "pending_review";
                return (
                  <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="p-3 font-mono text-[11px] text-white/50">
                      {explorer ? (
                        <a href={explorer + d.tx_hash} target="_blank" rel="noopener noreferrer"
                          className="text-cyan-300 hover:underline inline-flex items-center gap-1">
                          {short(d.tx_hash)} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : short(d.tx_hash)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-white">
                      {Number(d.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} <span className="text-white/40 text-[10px]">{d.currency}</span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-white/60">
                      {d.from_address ? (
                        <button
                          onClick={() => { navigator.clipboard?.writeText(d.from_address); toast.success("Sender address copied"); }}
                          title={`${d.from_address} — click to copy. Match this against the address the user says they sent from.`}
                          className="inline-flex items-center gap-1 hover:text-white">
                          {short(d.from_address)}
                          {EXPLORERS[d.chain] && (
                            <a href={`https://tronscan.org/#/address/${d.from_address}`} target="_blank" rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()} className="text-cyan-300/70 hover:text-cyan-200">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </button>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-white/50">{short(d.to_address)}</td>
                    <td className="p-3 text-[11px] text-white/70">{d.matched_user_email || <span className="text-white/20">unmatched</span>}</td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_STYLE[d.status] ?? "bg-white/10 text-white/60"}`}>
                        {d.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-[11px] text-white/30">{age}m</td>
                    <td className="p-3 text-right">
                      {actionable ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" disabled={busyHash === d.tx_hash}
                            onClick={() => { setCreditTarget(d); setSelectedUser(d.matched_user_id && d.matched_user_email ? { id: d.matched_user_id, email: d.matched_user_email } : null); }}
                            className="h-7 px-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30">
                            {busyHash === d.tx_hash ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" disabled={busyHash === d.tx_hash}
                            onClick={() => setIgnoreTarget(d)}
                            className="h-7 px-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30">
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : <span className="text-white/20 text-[10px]"><Clock className="h-3 w-3 inline" /></span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credit modal */}
      <Dialog open={!!creditTarget} onOpenChange={(o) => { if (!o) { setCreditTarget(null); setSelectedUser(null); setUserQuery(""); } }}>
        <DialogContent className="bg-[#ffffff] border border-white/10 text-white">
          <DialogHeader><DialogTitle>Credit on-chain deposit</DialogTitle></DialogHeader>
          {creditTarget && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg p-3 bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex justify-between"><span className="text-white/50">Amount</span><span className="font-mono font-bold">{Number(creditTarget.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} {creditTarget.currency}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Tx</span><span className="font-mono text-[11px]">{short(creditTarget.tx_hash)}</span></div>
                <div className="flex justify-between gap-2">
                  <span className="text-white/50">From (sender)</span>
                  <button onClick={() => { navigator.clipboard?.writeText(creditTarget.from_address); toast.success("Sender copied"); }}
                    title="Confirm this matches the address the user says they paid from"
                    className="font-mono text-[11px] text-cyan-300 hover:text-cyan-200 truncate">{short(creditTarget.from_address, 8)}</button>
                </div>
                <div className="flex justify-between"><span className="text-white/50">To</span><span className="font-mono text-[11px]">{short(creditTarget.to_address)}</span></div>
              </div>
              <div>
                <label className="text-xs text-white/60">Credit to user (search by email)</label>
                {selectedUser ? (
                  <div className="flex items-center justify-between mt-1 rounded-lg px-3 py-2 bg-emerald-500/10 border border-emerald-500/30">
                    <span className="text-[12px] text-emerald-200">{selectedUser.email}</span>
                    <button onClick={() => setSelectedUser(null)} className="text-white/40 hover:text-white"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ) : (
                  <>
                    <Input value={userQuery} onChange={e => setUserQuery(e.target.value)} placeholder="email…"
                      className="bg-white/[0.03] border-white/10 text-white mt-1" autoFocus />
                    {userResults.length > 0 && (
                      <div className="mt-1 rounded-lg border border-white/10 divide-y divide-white/5 max-h-40 overflow-y-auto">
                        {userResults.map(u => (
                          <button key={u.id} onClick={() => { setSelectedUser(u); setUserResults([]); }}
                            className="w-full text-left px-3 py-2 text-[12px] text-white/70 hover:bg-white/[0.05]">{u.email}</button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <Input value={creditNote} onChange={e => setCreditNote(e.target.value)} maxLength={500}
                placeholder="Note (optional)" className="bg-white/[0.03] border-white/10 text-white" />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-white/10 text-white" onClick={() => setCreditTarget(null)}>Cancel</Button>
                <Button onClick={submitCredit} disabled={!selectedUser || busyHash === creditTarget.tx_hash}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white">
                  {busyHash === creditTarget.tx_hash ? <Loader2 className="h-4 w-4 animate-spin" /> : "Credit wallet"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ignore modal */}
      <Dialog open={!!ignoreTarget} onOpenChange={(o) => { if (!o) setIgnoreTarget(null); }}>
        <DialogContent className="bg-[#ffffff] border border-white/10 text-white">
          <DialogHeader><DialogTitle>Ignore deposit</DialogTitle></DialogHeader>
          {ignoreTarget && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg px-3 py-2 text-[11px] text-white/60 bg-white/[0.03] border border-white/10">
                {Number(ignoreTarget.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} {ignoreTarget.currency} · {short(ignoreTarget.tx_hash)}
              </div>
              <Input value={ignoreNote} onChange={e => setIgnoreNote(e.target.value)} maxLength={500}
                placeholder="Reason (required)" className="bg-white/[0.03] border-white/10 text-white" autoFocus />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-white/10 text-white" onClick={() => setIgnoreTarget(null)}>Cancel</Button>
                <Button onClick={submitIgnore} disabled={busyHash === ignoreTarget.tx_hash}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white">
                  {busyHash === ignoreTarget.tx_hash ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ignore"}
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

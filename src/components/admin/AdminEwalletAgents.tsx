/**
 * AdminEwalletAgents — "Agents" command center for e-wallets
 * (Paytm / PhonePe / Google Pay / other).
 *
 * Full Users-dashboard parity: 3D network hero, animated KPI cards, search +
 * provider filters, premium sortable table, and a click-to-open detail panel
 * that shows a selected agent's live ledger (ewallet_agent_ledger) + inline
 * actions. Same server-authoritative RPCs — money flow unchanged:
 *   admin_list_ewallet_agents · admin_upsert_ewallet_agent ·
 *   admin_delete_ewallet_agent · admin_add_ewallet_entry
 * Per agent: payin − payout − commission = net settlement. Bookkeeping only.
 */

import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { inr } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2, Plus, Trash2, Pencil, RefreshCw, Wallet, ArrowDownLeft, ArrowUpRight,
  Search, Download, ArrowUpDown, ArrowUp, ArrowDown, Users as UsersIcon,
  Scale, TrendingUp, Zap, Crown,
} from "lucide-react";
import {
  V8Styles, V8StatCard, V8Th, V8IconBtn, V8InitialBadge, V8FilterPill, type V8Tone,
} from "./adminV8Kit";

const AgentScene = lazy(() => import("./UsersScene"));

type Provider = "paytm" | "phonepe" | "gpay" | "other";

interface Agent {
  id: string;
  name: string;
  provider: Provider;
  accounts: string[];
  commission_pct: number;
  active: boolean;
  note: string | null;
  payin_inr: number;
  payout_inr: number;
  commission_inr: number;
  net_inr: number;
  created_at: string;
}
interface Entry { id: string; direction: string; amount_inr: number; note: string | null; created_at: string; }

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "paytm", label: "Paytm" }, { id: "phonepe", label: "PhonePe" },
  { id: "gpay", label: "Google Pay" }, { id: "other", label: "Other" },
];
const providerLabel = (p: string) => PROVIDERS.find((x) => x.id === p)?.label ?? p;
const providerHue: Record<string, number> = { paytm: 205, phonepe: 265, gpay: 145, other: 220 };

type SortKey = "name" | "payin_inr" | "payout_inr" | "commission_inr" | "net_inr" | "created_at";
type FilterKey = "all" | Provider | "active" | "paused";

const FILTERS: { key: FilterKey; label: string; tone: V8Tone }[] = [
  { key: "all", label: "All Agents", tone: "amber" },
  { key: "active", label: "Active", tone: "emerald" },
  { key: "paused", label: "Paused", tone: "rose" },
  { key: "paytm", label: "Paytm", tone: "cyan" },
  { key: "phonepe", label: "PhonePe", tone: "cyan" },
  { key: "gpay", label: "Google Pay", tone: "cyan" },
  { key: "other", label: "Other", tone: "cyan" },
];

export default function AdminEwalletAgents() {
  const [rows, setRows] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("net_inr");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<Provider>("paytm");
  const [commission, setCommission] = useState("12");
  const [accountsText, setAccountsText] = useState("");
  const [active, setActive] = useState(true);
  const formRef = useRef<HTMLDivElement | null>(null);

  // detail panel
  const [sel, setSel] = useState<Agent | null>(null);
  const [selLedger, setSelLedger] = useState<Entry[]>([]);
  const [selLoading, setSelLoading] = useState(false);
  const detailRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_ewallet_agents");
    if (error) toast.error(error.message);
    setRows((data ?? []) as Agent[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openDetail = useCallback(async (a: Agent) => {
    setSel(a); setSelLoading(true); setSelLedger([]);
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
    const { data } = await supabase.from("ewallet_agent_ledger")
      .select("id, direction, amount_inr, note, created_at").eq("agent_id", a.id)
      .order("created_at", { ascending: false }).limit(50);
    setSelLedger((data ?? []) as Entry[]);
    setSelLoading(false);
  }, []);
  // keep the open detail row in sync after a reload
  useEffect(() => {
    if (sel) { const fresh = rows.find((r) => r.id === sel.id); if (fresh) setSel(fresh); }
  }, [rows]); // eslint-disable-line

  const resetForm = () => { setEditId(null); setName(""); setProvider("paytm"); setCommission("12"); setAccountsText(""); setActive(true); };
  const openCreate = () => { resetForm(); setFormOpen(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 30); };
  const startEdit = (a: Agent) => {
    setEditId(a.id); setName(a.name); setProvider(a.provider); setCommission(String(a.commission_pct));
    setAccountsText(a.accounts.join("\n")); setActive(a.active); setFormOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
  };
  const closeForm = () => { resetForm(); setFormOpen(false); };

  const save = async () => {
    const pct = Number(commission);
    if (!name.trim()) { toast.error("Agent name is required"); return; }
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) { toast.error("Commission % must be 0–100"); return; }
    const accounts = accountsText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    setBusy(true);
    const { error } = await supabase.rpc("admin_upsert_ewallet_agent", {
      p_id: editId, p_name: name.trim(), p_provider: provider,
      p_accounts: accounts, p_commission_pct: pct, p_active: active, p_note: null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editId ? "Agent updated" : "Agent added");
    closeForm(); load();
  };

  const toggleActive = async (a: Agent) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_upsert_ewallet_agent", {
      p_id: a.id, p_name: a.name, p_provider: a.provider, p_accounts: a.accounts,
      p_commission_pct: a.commission_pct, p_active: !a.active, p_note: a.note,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(!a.active ? "Agent activated" : "Agent paused");
    load();
  };

  const remove = async (a: Agent) => {
    if (!confirm(`Delete e-wallet agent "${a.name}"?`)) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_delete_ewallet_agent", { p_id: a.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Agent deleted");
    if (editId === a.id) closeForm();
    if (sel?.id === a.id) setSel(null);
    load();
  };

  const addEntry = async (a: Agent, direction: "payin" | "payout") => {
    const raw = prompt(`Record ${direction === "payin" ? "PAYIN (collected by" : "PAYOUT (paid by"} "${a.name}") — amount in INR:`);
    if (raw === null) return;
    const amt = Number(raw);
    if (!Number.isFinite(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    const note = prompt("Optional reference:", "") ?? null;
    setBusy(true);
    const { error } = await supabase.rpc("admin_add_ewallet_entry", { p_agent_id: a.id, p_direction: direction, p_amount_inr: amt, p_note: note });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${direction === "payin" ? "Payin" : "Payout"} ${inr(amt)} recorded for ${a.name}`);
    if (sel?.id === a.id) openDetail(a);
    load();
  };

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter((r) => r.active).length,
    paused: rows.filter((r) => !r.active).length,
    payin: rows.reduce((s, r) => s + Number(r.payin_inr), 0),
    payout: rows.reduce((s, r) => s + Number(r.payout_inr), 0),
    commission: rows.reduce((s, r) => s + Number(r.commission_inr), 0),
    net: rows.reduce((s, r) => s + Number(r.net_inr), 0),
  }), [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (filter === "active") r = r.filter((a) => a.active);
    else if (filter === "paused") r = r.filter((a) => !a.active);
    else if (filter !== "all") r = r.filter((a) => a.provider === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((a) => a.name.toLowerCase().includes(q) || providerLabel(a.provider).toLowerCase().includes(q) || a.accounts.some((x) => x.toLowerCase().includes(q)));
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...r].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rows, filter, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };
  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? <ArrowUpDown className="h-3 w-3 opacity-30 inline ml-1" /> :
    sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-amber-400 inline ml-1" /> :
    <ArrowDown className="h-3 w-3 text-amber-400 inline ml-1" />;

  const exportCSV = () => {
    const header = ["Agent", "Provider", "Accounts", "Commission %", "Payin INR", "Payout INR", "Commission INR", "Net INR", "Active", "Created"];
    const body = filtered.map((a) => [
      a.name, providerLabel(a.provider), a.accounts.join(" | "), Number(a.commission_pct),
      Number(a.payin_inr).toFixed(2), Number(a.payout_inr).toFixed(2), Number(a.commission_inr).toFixed(2),
      Number(a.net_inr).toFixed(2), a.active ? "active" : "paused", a.created_at ? new Date(a.created_at).toISOString() : "",
    ]);
    const csv = [header, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const el = document.createElement("a");
    el.href = url; el.download = `agents-${new Date().toISOString().slice(0, 10)}.csv`;
    el.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} agent${filtered.length === 1 ? "" : "s"}`);
  };

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="space-y-5">
        {/* 3D HERO */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 av8-gradient-border"
             style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.10), rgba(244,63,94,0.06), rgba(15,23,42,0.5))", boxShadow: "0 12px 40px -12px rgba(245,158,11,0.25), inset 0 1px 0 rgba(15,23,42,0.04)" }}>
          <div className="absolute inset-0 opacity-90 pointer-events-none">
            <Suspense fallback={<div className="w-full h-full" />}><AgentScene height={220} nodeCount={30} /></Suspense>
          </div>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 50%, transparent 0%, rgba(255,255,255,0.35) 60%, rgba(255,255,255,0.65) 100%)" }} />
          <div className="relative z-10 p-5 flex items-center justify-between flex-wrap gap-4 min-h-[220px]">
            <div className="max-w-md">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-5 w-5 text-amber-300" style={{ filter: "drop-shadow(0 0 10px rgba(245,158,11,0.8))" }} />
                <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300/70 font-bold">Finance · E-Wallet Agents</div>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-none"
                  style={{ background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #f43f5e 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 2px 8px rgba(15,23,42,0.6))" }}>
                AGENTS NETWORK
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 ring-1 ring-emerald-500/40 text-[10px] font-bold text-emerald-300 tracking-wider backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 av8-pulse-dot" /> {stats.active} ACTIVE
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 ring-1 ring-amber-500/35 text-[10px] font-bold text-amber-200 tracking-wider backdrop-blur">
                  <UsersIcon className="h-3 w-3" /> <span className="av8-mono-num">{stats.total}</span> AGENTS
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 ring-1 text-[10px] font-bold tracking-wider backdrop-blur ${stats.net >= 0 ? "ring-emerald-500/35 text-emerald-200" : "ring-rose-500/35 text-rose-200"}`}>
                  <Scale className="h-3 w-3" /> NET <span className="av8-mono-num">{inr(stats.net)}</span>
                </span>
              </div>
              <p className="text-[11px] text-white/55 mt-3 tracking-wide leading-relaxed max-w-sm">
                Manual payin/payout ledger ·{" "}
                <span className="text-emerald-300 font-bold av8-mono-num">{inr(stats.payin)}</span> in ·{" "}
                <span className="text-rose-300 font-bold av8-mono-num">{inr(stats.payout)}</span> out ·{" "}
                <span className="text-amber-300 font-bold av8-mono-num">{inr(stats.commission)}</span> commission
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={exportCSV} className="av8-action-btn px-3 py-2 rounded-lg text-xs font-semibold text-white/90 bg-black/30 backdrop-blur border border-white/15 hover:border-white/30 hover:bg-black/45 flex items-center gap-1.5 shadow-lg"><Download className="h-3.5 w-3.5" /> Export</button>
              <button onClick={load} className="av8-action-btn px-3 py-2 rounded-lg text-xs font-semibold text-white/80 bg-black/30 backdrop-blur border border-white/15 hover:border-white/30 hover:bg-black/45 flex items-center gap-1.5 shadow-lg"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
              <button onClick={openCreate} className="av8-action-btn px-3.5 py-2 rounded-lg text-xs font-bold text-black flex items-center gap-1.5" style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", boxShadow: "0 4px 22px -4px rgba(245,158,11,0.7), inset 0 1px 0 rgba(15,23,42,0.4)" }}><Plus className="h-3.5 w-3.5" /> NEW AGENT</button>
            </div>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <V8StatCard icon={<UsersIcon className="h-4 w-4" />} label="Total Agents" value={stats.total} sub={`${stats.active} active · ${stats.paused} paused`} tone="amber" delay={0} />
          <V8StatCard icon={<ArrowDownLeft className="h-4 w-4" />} label="Total Payin" value={stats.payin} prefix="₹" sub="collected by agents" tone="emerald" delay={80} />
          <V8StatCard icon={<ArrowUpRight className="h-4 w-4" />} label="Total Payout" value={stats.payout} prefix="₹" sub="paid to players" tone="rose" delay={160} />
          <V8StatCard icon={<Scale className="h-4 w-4" />} label="Net Settlement" value={stats.net} prefix="₹" sub={`${inr(stats.commission)} commission`} tone={stats.net >= 0 ? "emerald" : "rose"} delay={240} />
        </div>

        {/* SEARCH + FILTER */}
        <div className="flex flex-col gap-3">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-400/70" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by agent, provider, or account…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
              style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(15,23,42,0.06)", backdropFilter: "blur(8px)", boxShadow: "inset 0 0 20px rgba(15,23,42,0.4)" }} />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white px-2 py-1 text-xs">✕</button>}
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <V8FilterPill key={f.key} label={f.label} tone={f.tone} active={filter === f.key} onClick={() => setFilter(f.key)}
                count={f.key === "all" ? rows.length : f.key === "active" ? stats.active : f.key === "paused" ? stats.paused : rows.filter((a) => a.provider === f.key).length} />
            ))}
          </div>
        </div>

        {/* ADD / EDIT FORM */}
        {formOpen && (
          <div ref={formRef} className="rounded-2xl border border-amber-500/25 p-4 space-y-3 av8-card av8-gradient-border relative"
               style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(244,246,248,0.9))", boxShadow: "0 8px 40px -8px rgba(245,158,11,0.25)" }}>
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-amber-300/80 font-semibold flex items-center gap-1.5"><Pencil className="h-3.5 w-3.5" /> {editId ? "Edit agent" : "Add agent"}</div>
              <button onClick={closeForm} className="text-white/30 hover:text-white text-xs px-2">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><label className="text-[11px] text-white/50">Agent name</label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Provider A" className="bg-white/[0.04] border-white/10 text-white mt-1" /></div>
              <div><label className="text-[11px] text-white/50">Provider</label>
                <select value={provider} onChange={(e) => setProvider(e.target.value as Provider)} className="w-full mt-1 rounded-md bg-white/[0.04] border border-white/10 text-white text-sm px-3 py-2 outline-none focus:border-amber-500/40 h-10">
                  {PROVIDERS.map((p) => <option key={p.id} value={p.id} className="bg-[#ffffff]">{p.label}</option>)}
                </select>
              </div>
              <div><label className="text-[11px] text-white/50">Commission %</label><Input type="number" value={commission} onChange={(e) => setCommission(e.target.value)} min={0} max={100} step="0.5" className="bg-white/[0.04] border-white/10 text-white mt-1" /></div>
            </div>
            <div>
              <label className="text-[11px] text-white/50">Accounts — phone number / wallet handle (one per line or comma-separated)</label>
              <textarea value={accountsText} onChange={(e) => setAccountsText(e.target.value)} rows={2} placeholder={"9876543210\nname@paytm"} className="w-full mt-1 rounded-lg bg-white/[0.04] border border-white/10 text-white font-mono text-[13px] p-3 outline-none focus:border-amber-500/40" />
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <label className="flex items-center gap-2 text-[12px] text-white/70 cursor-pointer">
                <button type="button" role="switch" aria-checked={active} onClick={() => setActive(!active)} className="relative inline-flex h-6 w-11 items-center rounded-full transition" style={{ background: active ? "#10b981" : "rgba(15,23,42,0.15)" }}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${active ? "translate-x-6" : "translate-x-1"}`} />
                </button>Active
              </label>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={closeForm} className="border-white/10 text-white/70">Cancel</Button>
                <Button size="sm" onClick={save} disabled={busy} className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}{editId ? "Save changes" : "Add agent"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TABLE */}
        <div className="rounded-2xl border overflow-hidden av8-gradient-border relative" style={{ background: "rgba(255,255,255,0.6)", borderColor: "rgba(15,23,42,0.06)", backdropFilter: "blur(20px)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[920px]">
              <thead>
                <tr className="text-white/50 border-b" style={{ borderColor: "rgba(15,23,42,0.06)", background: "rgba(255,255,255,0.3)" }}>
                  <V8Th onClick={() => toggleSort("name")} className="text-left">Agent <SortIcon k="name" /></V8Th>
                  <V8Th className="text-left">Accounts</V8Th>
                  <V8Th className="text-right">Comm. %</V8Th>
                  <V8Th onClick={() => toggleSort("payin_inr")} className="text-right">Payin <SortIcon k="payin_inr" /></V8Th>
                  <V8Th onClick={() => toggleSort("payout_inr")} className="text-right">Payout <SortIcon k="payout_inr" /></V8Th>
                  <V8Th onClick={() => toggleSort("commission_inr")} className="text-right">Commission <SortIcon k="commission_inr" /></V8Th>
                  <V8Th onClick={() => toggleSort("net_inr")} className="text-right">Net <SortIcon k="net_inr" /></V8Th>
                  <V8Th className="text-center">Active</V8Th>
                  <V8Th className="text-center">Actions</V8Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="p-16 text-center text-white/30 text-xs"><div className="inline-flex items-center gap-2"><Zap className="h-3 w-3 text-amber-400 av8-pulse-dot" /> Loading agents…</div></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="p-16 text-center text-white/30 text-xs">{rows.length === 0 ? "No e-wallet agents yet — add one with NEW AGENT." : "No agents match the current filter"}</td></tr>
                ) : filtered.map((a, i) => (
                  <tr key={a.id} onClick={() => openDetail(a)}
                      className={`av8-row border-b align-top cursor-pointer ${sel?.id === a.id ? "bg-amber-500/[0.06]" : ""}`}
                      style={{ borderColor: "rgba(15,23,42,0.03)", background: sel?.id === a.id ? undefined : (i % 2 === 0 ? "transparent" : "rgba(15,23,42,0.008)") }}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <V8InitialBadge label={providerLabel(a.provider)} hue={providerHue[a.provider] ?? 220} active={a.active} />
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate max-w-[160px] flex items-center gap-1">{a.name}{Number(a.net_inr) > 100000 && <Crown className="h-3 w-3 text-amber-400 flex-shrink-0" />}</div>
                          <div className="text-[10px] text-amber-300/70">{providerLabel(a.provider)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5 max-w-[240px]">
                        {a.accounts.length === 0 ? <span className="text-white/25 text-[11px]">—</span> : a.accounts.map((id) => <span key={id} className="font-mono text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-100">{id}</span>)}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right av8-mono-num text-white/80">{Number(a.commission_pct)}%</td>
                    <td className="px-3 py-3 text-right av8-mono-num text-emerald-300/90">{inr(a.payin_inr)}</td>
                    <td className="px-3 py-3 text-right av8-mono-num text-rose-300/80">{inr(a.payout_inr)}</td>
                    <td className="px-3 py-3 text-right av8-mono-num text-amber-200">{inr(a.commission_inr)}</td>
                    <td className={`px-3 py-3 text-right av8-mono-num font-bold ${Number(a.net_inr) >= 0 ? "text-emerald-300" : "text-rose-300"}`} style={{ textShadow: Number(a.net_inr) >= 0 ? "0 0 8px rgba(255,201,53,0.35)" : "0 0 8px rgba(244,63,94,0.35)" }}>{inr(a.net_inr)}</td>
                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleActive(a)} disabled={busy} className="relative inline-flex h-5 w-9 items-center rounded-full transition disabled:opacity-50" style={{ background: a.active ? "#10b981" : "rgba(15,23,42,0.15)" }} title={a.active ? "Active" : "Paused"}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${a.active ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-0.5">
                        <V8IconBtn onClick={() => addEntry(a, "payin")} title="Record payin (collected)" tone="emerald" disabled={busy}><ArrowDownLeft className="h-3.5 w-3.5" /></V8IconBtn>
                        <V8IconBtn onClick={() => addEntry(a, "payout")} title="Record payout (paid to players)" tone="cyan" disabled={busy}><ArrowUpRight className="h-3.5 w-3.5" /></V8IconBtn>
                        <V8IconBtn onClick={() => startEdit(a)} title="Edit" tone="white" disabled={busy}><Pencil className="h-3.5 w-3.5" /></V8IconBtn>
                        <V8IconBtn onClick={() => remove(a)} title="Delete" tone="rose" disabled={busy}><Trash2 className="h-3.5 w-3.5" /></V8IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* DETAIL PANEL */}
        {sel && (
          <div ref={detailRef} className="rounded-2xl border p-5 space-y-4 av8-card av8-gradient-border relative overflow-hidden"
               style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))", borderColor: "rgba(245,158,11,0.3)", boxShadow: "0 8px 40px -8px rgba(245,158,11,0.25)" }}>
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(245,158,11,0.15), transparent 70%)", transform: "translate(30%, -30%)" }} />
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                <V8InitialBadge label={providerLabel(sel.provider)} hue={providerHue[sel.provider] ?? 220} active={sel.active} />
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white truncate flex items-center gap-2">{sel.name}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sel.active ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40" : "bg-white/5 text-white/40 ring-1 ring-white/10"}`}>{sel.active ? "Active" : "Paused"}</span>
                  </h3>
                  <p className="text-[10px] text-amber-300/70">{providerLabel(sel.provider)} · {Number(sel.commission_pct)}% commission</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="sm" onClick={() => addEntry(sel, "payin")} disabled={busy} className="text-[10px] h-7 bg-emerald-600 hover:bg-emerald-500 text-white"><ArrowDownLeft className="h-3 w-3 mr-1" />Payin</Button>
                <Button size="sm" onClick={() => addEntry(sel, "payout")} disabled={busy} className="text-[10px] h-7 bg-cyan-600 hover:bg-cyan-500 text-white"><ArrowUpRight className="h-3 w-3 mr-1" />Payout</Button>
                <Button size="sm" variant="outline" onClick={() => startEdit(sel)} className="text-[10px] h-7 border-white/15 text-white/70"><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                <button onClick={() => setSel(null)} className="text-white/30 hover:text-white text-xs px-2">✕</button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 relative z-10">
              {[
                { label: "Payin", value: inr(sel.payin_inr), color: "#34d399" },
                { label: "Payout", value: inr(sel.payout_inr), color: "#fb7185" },
                { label: "Commission", value: inr(sel.commission_inr), color: "#fbbf24" },
                { label: "Net", value: inr(sel.net_inr), color: Number(sel.net_inr) >= 0 ? "#34d399" : "#fb7185", glow: true },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-3 text-center border" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0.2))", borderColor: "rgba(15,23,42,0.05)" }}>
                  <div className="text-[9px] text-white/30 uppercase tracking-widest">{s.label}</div>
                  <div className="text-sm font-black mt-1 av8-mono-num" style={{ color: s.color, textShadow: s.glow ? "0 0 12px rgba(245,158,11,0.4)" : "none" }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="relative z-10">
              <h4 className="text-[10px] text-white/50 uppercase tracking-widest mb-2 flex items-center gap-1.5"><TrendingUp className="h-3 w-3 text-emerald-400" /> Ledger — payin / payout history</h4>
              <div className="max-h-64 overflow-y-auto rounded-xl border" style={{ borderColor: "rgba(15,23,42,0.04)", background: "rgba(255,255,255,0.2)" }}>
                <table className="w-full text-[10px]">
                  <thead className="sticky top-0" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)" }}>
                    <tr className="text-white/40"><th className="text-left p-2">Type</th><th className="text-right p-2">Amount</th><th className="text-left p-2">Reference</th><th className="text-right p-2">Time</th></tr>
                  </thead>
                  <tbody>
                    {selLoading ? (
                      <tr><td colSpan={4} className="text-center py-6 text-white/30"><Loader2 className="h-4 w-4 animate-spin inline" /></td></tr>
                    ) : selLedger.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-6 text-white/30">No entries yet — record a payin or payout above.</td></tr>
                    ) : selLedger.map((e) => (
                      <tr key={e.id} className="border-t av8-row" style={{ borderColor: "rgba(15,23,42,0.03)" }}>
                        <td className="p-2"><span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${e.direction === "payin" ? "bg-emerald-500/20 text-emerald-300" : "bg-cyan-500/20 text-cyan-300"}`}>{e.direction === "payin" ? "Payin" : "Payout"}</span></td>
                        <td className={`p-2 text-right av8-mono-num font-semibold ${e.direction === "payin" ? "text-emerald-300" : "text-cyan-300"}`}>{e.direction === "payin" ? "+" : "−"}{inr(e.amount_inr)}</td>
                        <td className="p-2 text-white/50 truncate max-w-[220px]">{e.note || "—"}</td>
                        <td className="p-2 text-right text-white/30">{e.created_at ? new Date(e.created_at).toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <p className="text-[11px] text-white/40 flex items-start gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-300 flex-shrink-0 mt-0.5" />
          <span>Click any agent row to open its ledger. Record <ArrowDownLeft className="inline h-3 w-3 text-emerald-300" /> payin (collected) and <ArrowUpRight className="inline h-3 w-3 text-cyan-300" /> payout (paid to players). <b>Net = payin − payout − commission.</b> Manual bookkeeping — no money moves here.</span>
        </p>
      </div>
    </div>
  );
}

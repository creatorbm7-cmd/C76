/**
 * AdminUpiSuppliers — "Agent panel for UPI suppliers" (V8, Users-dashboard parity).
 *
 * 3D network hero, KPI cards, filters, premium table, and a click-to-open detail
 * panel showing a supplier's UPI IDs + payout ledger (upi_supplier_payouts).
 * Active suppliers' UPI IDs become the live deposit rotation. Same RPCs:
 *   admin_list_upi_suppliers · admin_upsert_upi_supplier ·
 *   admin_delete_upi_supplier · admin_add_supplier_payout
 */

import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { inr } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2, Plus, Trash2, Pencil, RefreshCw, Users, Banknote, Search, Download,
  ArrowUpDown, ArrowUp, ArrowDown, ArrowDownLeft, ArrowUpRight, Scale, Radio, Zap, TrendingUp,
} from "lucide-react";
import {
  V8Styles, V8StatCard, V8Th, V8IconBtn, V8InitialBadge, V8FilterPill, type V8Tone,
} from "./adminV8Kit";

const SupplierScene = lazy(() => import("./UsersScene"));

interface Supplier {
  id: string; name: string; commission_pct: number; upi_ids: string[]; active: boolean; note: string | null;
  collected_inr: number; deposit_count: number; commission_inr: number;
  paid_out_inr: number; payout_count: number; net_inr: number; created_at: string;
}
interface Payout { id: string; amount_inr: number; note: string | null; created_at: string; }

const hueOf = (s: string) => Array.from(s || "").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

type SortKey = "name" | "collected_inr" | "paid_out_inr" | "commission_inr" | "net_inr" | "created_at";
type FilterKey = "all" | "active" | "paused";
const FILTERS: { key: FilterKey; label: string; tone: V8Tone }[] = [
  { key: "all", label: "All Suppliers", tone: "amber" },
  { key: "active", label: "Active", tone: "emerald" },
  { key: "paused", label: "Paused", tone: "rose" },
];

export default function AdminUpiSuppliers() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("net_inr");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [commission, setCommission] = useState("12");
  const [upiText, setUpiText] = useState("");
  const [active, setActive] = useState(true);
  const formRef = useRef<HTMLDivElement | null>(null);

  const [sel, setSel] = useState<Supplier | null>(null);
  const [selPayouts, setSelPayouts] = useState<Payout[]>([]);
  const [selLoading, setSelLoading] = useState(false);
  const detailRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_upi_suppliers");
    if (error) toast.error(error.message);
    setRows((data ?? []) as Supplier[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openDetail = useCallback(async (s: Supplier) => {
    setSel(s); setSelLoading(true); setSelPayouts([]);
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
    const { data } = await supabase.from("upi_supplier_payouts")
      .select("id, amount_inr, note, created_at").eq("supplier_id", s.id)
      .order("created_at", { ascending: false }).limit(50);
    setSelPayouts((data ?? []) as Payout[]);
    setSelLoading(false);
  }, []);
  useEffect(() => { if (sel) { const f = rows.find((r) => r.id === sel.id); if (f) setSel(f); } }, [rows]); // eslint-disable-line

  const resetForm = () => { setEditId(null); setName(""); setCommission("12"); setUpiText(""); setActive(true); };
  const openCreate = () => { resetForm(); setFormOpen(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 30); };
  const startEdit = (s: Supplier) => {
    setEditId(s.id); setName(s.name); setCommission(String(s.commission_pct)); setUpiText(s.upi_ids.join("\n")); setActive(s.active); setFormOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
  };
  const closeForm = () => { resetForm(); setFormOpen(false); };

  const save = async () => {
    const pct = Number(commission);
    if (!name.trim()) { toast.error("Supplier name is required"); return; }
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) { toast.error("Commission % must be 0–100"); return; }
    const ids = upiText.split(/[\n,]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    const bad = ids.find((i) => !/^[a-z0-9._-]{2,}@[a-z]{2,}$/.test(i));
    if (bad) { toast.error(`Invalid UPI ID: ${bad}`); return; }
    setBusy(true);
    const { error } = await supabase.rpc("admin_upsert_upi_supplier", { p_id: editId, p_name: name.trim(), p_commission_pct: pct, p_upi_ids: ids, p_active: active, p_note: null });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editId ? "Supplier updated" : "Supplier added");
    closeForm(); load();
  };

  const toggleActive = async (s: Supplier) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_upsert_upi_supplier", { p_id: s.id, p_name: s.name, p_commission_pct: s.commission_pct, p_upi_ids: s.upi_ids, p_active: !s.active, p_note: s.note });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(!s.active ? "Supplier activated — UPI IDs live" : "Supplier paused — UPI IDs removed from rotation");
    load();
  };

  const remove = async (s: Supplier) => {
    if (!confirm(`Delete supplier "${s.name}"?\n\nIts ${s.upi_ids.length} UPI ID(s) will be removed from the deposit rotation.`)) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_delete_upi_supplier", { p_id: s.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Supplier deleted");
    if (editId === s.id) closeForm();
    if (sel?.id === s.id) setSel(null);
    load();
  };

  const recordPayout = async (s: Supplier) => {
    const raw = prompt(`Record a payout made by "${s.name}" to players (INR):`);
    if (raw === null) return;
    const amt = Number(raw);
    if (!Number.isFinite(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    const note = prompt("Optional reference (player / UTR):", "") ?? null;
    setBusy(true);
    const { error } = await supabase.rpc("admin_add_supplier_payout", { p_supplier_id: s.id, p_amount_inr: amt, p_note: note });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Payout ${inr(amt)} recorded for ${s.name}`);
    if (sel?.id === s.id) openDetail(s);
    load();
  };

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter((r) => r.active).length,
    paused: rows.filter((r) => !r.active).length,
    liveUpi: rows.filter((r) => r.active).reduce((s, r) => s + r.upi_ids.length, 0),
    collected: rows.reduce((s, r) => s + Number(r.collected_inr), 0),
    payout: rows.reduce((s, r) => s + Number(r.paid_out_inr), 0),
    commission: rows.reduce((s, r) => s + Number(r.commission_inr), 0),
    net: rows.reduce((s, r) => s + Number(r.net_inr), 0),
  }), [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (filter === "active") r = r.filter((s) => s.active);
    else if (filter === "paused") r = r.filter((s) => !s.active);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((s) => s.name.toLowerCase().includes(q) || s.upi_ids.some((x) => x.toLowerCase().includes(q)));
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
    const header = ["Supplier", "UPI IDs", "Commission %", "Payin INR", "Deposits", "Payout INR", "Payouts", "Commission INR", "Net INR", "Active", "Created"];
    const body = filtered.map((s) => [
      s.name, s.upi_ids.join(" | "), Number(s.commission_pct), Number(s.collected_inr).toFixed(2), s.deposit_count,
      Number(s.paid_out_inr).toFixed(2), s.payout_count, Number(s.commission_inr).toFixed(2), Number(s.net_inr).toFixed(2),
      s.active ? "active" : "paused", s.created_at ? new Date(s.created_at).toISOString() : "",
    ]);
    const csv = [header, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const el = document.createElement("a"); el.href = url; el.download = `upi-suppliers-${new Date().toISOString().slice(0, 10)}.csv`;
    el.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} supplier${filtered.length === 1 ? "" : "s"}`);
  };

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="space-y-5">
        {/* 3D HERO */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 av8-gradient-border"
             style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.10), rgba(56,189,248,0.06), rgba(15,23,42,0.5))", boxShadow: "0 12px 40px -12px rgba(245,158,11,0.25), inset 0 1px 0 rgba(15,23,42,0.04)" }}>
          <div className="absolute inset-0 opacity-90 pointer-events-none">
            <Suspense fallback={<div className="w-full h-full" />}><SupplierScene height={220} nodeCount={30} /></Suspense>
          </div>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 50%, transparent 0%, rgba(255,255,255,0.35) 60%, rgba(255,255,255,0.65) 100%)" }} />
          <div className="relative z-10 p-5 flex items-center justify-between flex-wrap gap-4 min-h-[220px]">
            <div className="max-w-md">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-5 w-5 text-amber-300" style={{ filter: "drop-shadow(0 0 10px rgba(245,158,11,0.8))" }} />
                <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300/70 font-bold">Finance · UPI Suppliers</div>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-none"
                  style={{ background: "linear-gradient(135deg, #fbbf24 0%, #38bdf8 60%, #f59e0b 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 2px 8px rgba(15,23,42,0.6))" }}>
                UPI SUPPLIERS
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 ring-1 ring-emerald-500/40 text-[10px] font-bold text-emerald-300 tracking-wider backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 av8-pulse-dot" /> {stats.active} ACTIVE</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 ring-1 ring-cyan-500/35 text-[10px] font-bold text-cyan-200 tracking-wider backdrop-blur"><Radio className="h-3 w-3" /> <span className="av8-mono-num">{stats.liveUpi}</span> UPI LIVE</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 ring-1 text-[10px] font-bold tracking-wider backdrop-blur ${stats.net >= 0 ? "ring-emerald-500/35 text-emerald-200" : "ring-rose-500/35 text-rose-200"}`}><Scale className="h-3 w-3" /> NET <span className="av8-mono-num">{inr(stats.net)}</span></span>
              </div>
              <p className="text-[11px] text-white/55 mt-3 tracking-wide leading-relaxed max-w-sm">
                Live deposit rotation ·{" "}
                <span className="text-emerald-300 font-bold av8-mono-num">{inr(stats.collected)}</span> collected ·{" "}
                <span className="text-rose-300 font-bold av8-mono-num">{inr(stats.payout)}</span> paid out ·{" "}
                <span className="text-amber-300 font-bold av8-mono-num">{inr(stats.commission)}</span> commission
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={exportCSV} className="av8-action-btn px-3 py-2 rounded-lg text-xs font-semibold text-white/90 bg-black/30 backdrop-blur border border-white/15 hover:border-white/30 hover:bg-black/45 flex items-center gap-1.5 shadow-lg"><Download className="h-3.5 w-3.5" /> Export</button>
              <button onClick={load} className="av8-action-btn px-3 py-2 rounded-lg text-xs font-semibold text-white/80 bg-black/30 backdrop-blur border border-white/15 hover:border-white/30 hover:bg-black/45 flex items-center gap-1.5 shadow-lg"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
              <button onClick={openCreate} className="av8-action-btn px-3.5 py-2 rounded-lg text-xs font-bold text-black flex items-center gap-1.5" style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", boxShadow: "0 4px 22px -4px rgba(245,158,11,0.7), inset 0 1px 0 rgba(15,23,42,0.4)" }}><Plus className="h-3.5 w-3.5" /> NEW SUPPLIER</button>
            </div>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <V8StatCard icon={<Users className="h-4 w-4" />} label="Suppliers" value={stats.total} sub={`${stats.active} active · ${stats.liveUpi} UPI live`} tone="amber" delay={0} />
          <V8StatCard icon={<ArrowDownLeft className="h-4 w-4" />} label="Payin (collected)" value={stats.collected} prefix="₹" sub="credited deposits" tone="emerald" delay={80} />
          <V8StatCard icon={<ArrowUpRight className="h-4 w-4" />} label="Payout" value={stats.payout} prefix="₹" sub="paid to players" tone="rose" delay={160} />
          <V8StatCard icon={<Scale className="h-4 w-4" />} label="Net Settlement" value={stats.net} prefix="₹" sub={`${inr(stats.commission)} commission`} tone={stats.net >= 0 ? "emerald" : "rose"} delay={240} />
        </div>

        {/* SEARCH + FILTER */}
        <div className="flex flex-col gap-3">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-400/70" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by supplier or UPI ID…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
              style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(15,23,42,0.06)", backdropFilter: "blur(8px)", boxShadow: "inset 0 0 20px rgba(15,23,42,0.4)" }} />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white px-2 py-1 text-xs">✕</button>}
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <V8FilterPill key={f.key} label={f.label} tone={f.tone} active={filter === f.key} onClick={() => setFilter(f.key)}
                count={f.key === "all" ? rows.length : f.key === "active" ? stats.active : stats.paused} />
            ))}
          </div>
        </div>

        {/* ADD / EDIT FORM */}
        {formOpen && (
          <div ref={formRef} className="rounded-2xl border border-amber-500/25 p-4 space-y-3 av8-card av8-gradient-border relative"
               style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(244,246,248,0.9))", boxShadow: "0 8px 40px -8px rgba(245,158,11,0.25)" }}>
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-amber-300/80 font-semibold flex items-center gap-1.5"><Pencil className="h-3.5 w-3.5" /> {editId ? "Edit supplier" : "Add supplier"}</div>
              <button onClick={closeForm} className="text-white/30 hover:text-white text-xs px-2">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2"><label className="text-[11px] text-white/50">Supplier name</label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Chithira / Provider A" className="bg-white/[0.04] border-white/10 text-white mt-1" /></div>
              <div><label className="text-[11px] text-white/50">Commission %</label><Input type="number" value={commission} onChange={(e) => setCommission(e.target.value)} min={0} max={100} step="0.5" className="bg-white/[0.04] border-white/10 text-white mt-1" /></div>
            </div>
            <div>
              <label className="text-[11px] text-white/50">UPI IDs (one per line or comma-separated)</label>
              <textarea value={upiText} onChange={(e) => setUpiText(e.target.value)} rows={3} placeholder={"name@okhdfcbank\nother@idbi"} className="w-full mt-1 rounded-lg bg-white/[0.04] border border-white/10 text-white font-mono text-[13px] p-3 outline-none focus:border-amber-500/40" />
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <label className="flex items-center gap-2 text-[12px] text-white/70 cursor-pointer">
                <button type="button" role="switch" aria-checked={active} onClick={() => setActive(!active)} className="relative inline-flex h-6 w-11 items-center rounded-full transition" style={{ background: active ? "#10b981" : "rgba(15,23,42,0.15)" }}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${active ? "translate-x-6" : "translate-x-1"}`} />
                </button>Active (UPI IDs join the deposit rotation)
              </label>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={closeForm} className="border-white/10 text-white/70">Cancel</Button>
                <Button size="sm" onClick={save} disabled={busy} className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}{editId ? "Save changes" : "Add supplier"}</Button>
              </div>
            </div>
          </div>
        )}

        {/* TABLE */}
        <div className="rounded-2xl border overflow-hidden av8-gradient-border relative" style={{ background: "rgba(255,255,255,0.6)", borderColor: "rgba(15,23,42,0.06)", backdropFilter: "blur(20px)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[960px]">
              <thead>
                <tr className="text-white/50 border-b" style={{ borderColor: "rgba(15,23,42,0.06)", background: "rgba(255,255,255,0.3)" }}>
                  <V8Th onClick={() => toggleSort("name")} className="text-left">Supplier <SortIcon k="name" /></V8Th>
                  <V8Th className="text-left">UPI IDs</V8Th>
                  <V8Th className="text-right">Comm. %</V8Th>
                  <V8Th onClick={() => toggleSort("collected_inr")} className="text-right">Payin <SortIcon k="collected_inr" /></V8Th>
                  <V8Th onClick={() => toggleSort("paid_out_inr")} className="text-right">Payout <SortIcon k="paid_out_inr" /></V8Th>
                  <V8Th onClick={() => toggleSort("commission_inr")} className="text-right">Commission <SortIcon k="commission_inr" /></V8Th>
                  <V8Th onClick={() => toggleSort("net_inr")} className="text-right">Net <SortIcon k="net_inr" /></V8Th>
                  <V8Th className="text-center">Active</V8Th>
                  <V8Th className="text-center">Actions</V8Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="p-16 text-center text-white/30 text-xs"><div className="inline-flex items-center gap-2"><Zap className="h-3 w-3 text-amber-400 av8-pulse-dot" /> Loading suppliers…</div></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="p-16 text-center text-white/30 text-xs">{rows.length === 0 ? "No suppliers yet — add one with NEW SUPPLIER." : "No suppliers match the current filter"}</td></tr>
                ) : filtered.map((s, i) => (
                  <tr key={s.id} onClick={() => openDetail(s)}
                      className={`av8-row border-b align-top cursor-pointer ${sel?.id === s.id ? "bg-amber-500/[0.06]" : ""}`}
                      style={{ borderColor: "rgba(15,23,42,0.03)", background: sel?.id === s.id ? undefined : (i % 2 === 0 ? "transparent" : "rgba(15,23,42,0.008)") }}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <V8InitialBadge label={s.name} hue={hueOf(s.name)} active={s.active} />
                        <div className="min-w-0"><div className="font-bold text-white truncate max-w-[160px]">{s.name}</div><div className="text-[10px] text-white/35">{s.deposit_count} credited deposit{s.deposit_count === 1 ? "" : "s"}</div></div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><div className="flex flex-wrap gap-1.5 max-w-[280px]">{s.upi_ids.length === 0 ? <span className="text-white/25 text-[11px]">—</span> : s.upi_ids.map((id) => <span key={id} className="font-mono text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-100">{id}</span>)}</div></td>
                    <td className="px-3 py-3 text-right av8-mono-num text-white/80">{Number(s.commission_pct)}%</td>
                    <td className="px-3 py-3 text-right av8-mono-num text-emerald-300/90">{inr(s.collected_inr)}</td>
                    <td className="px-3 py-3 text-right av8-mono-num text-rose-300/80">{inr(s.paid_out_inr)}{s.payout_count > 0 && <span className="text-[9px] text-white/30 block">{s.payout_count} payout{s.payout_count === 1 ? "" : "s"}</span>}</td>
                    <td className="px-3 py-3 text-right av8-mono-num text-amber-200">{inr(s.commission_inr)}</td>
                    <td className={`px-3 py-3 text-right av8-mono-num font-bold ${Number(s.net_inr) >= 0 ? "text-emerald-300" : "text-rose-300"}`} style={{ textShadow: Number(s.net_inr) >= 0 ? "0 0 8px rgba(255,201,53,0.35)" : "0 0 8px rgba(244,63,94,0.35)" }}>{inr(s.net_inr)}</td>
                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleActive(s)} disabled={busy} className="relative inline-flex h-5 w-9 items-center rounded-full transition disabled:opacity-50" style={{ background: s.active ? "#10b981" : "rgba(15,23,42,0.15)" }} title={s.active ? "Active" : "Paused"}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${s.active ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-0.5">
                        <V8IconBtn onClick={() => recordPayout(s)} title="Record a payout this agent made to players" tone="cyan" disabled={busy}><Banknote className="h-3.5 w-3.5" /></V8IconBtn>
                        <V8IconBtn onClick={() => startEdit(s)} title="Edit" tone="white" disabled={busy}><Pencil className="h-3.5 w-3.5" /></V8IconBtn>
                        <V8IconBtn onClick={() => remove(s)} title="Delete" tone="rose" disabled={busy}><Trash2 className="h-3.5 w-3.5" /></V8IconBtn>
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
               style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))", borderColor: "rgba(56,189,248,0.3)", boxShadow: "0 8px 40px -8px rgba(56,189,248,0.22)" }}>
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(56,189,248,0.15), transparent 70%)", transform: "translate(30%, -30%)" }} />
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                <V8InitialBadge label={sel.name} hue={hueOf(sel.name)} active={sel.active} />
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white truncate flex items-center gap-2">{sel.name}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sel.active ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40" : "bg-white/5 text-white/40 ring-1 ring-white/10"}`}>{sel.active ? "Active" : "Paused"}</span>
                  </h3>
                  <p className="text-[10px] text-cyan-300/70">{sel.upi_ids.length} UPI ID{sel.upi_ids.length === 1 ? "" : "s"} · {Number(sel.commission_pct)}% commission · {sel.deposit_count} deposits</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="sm" onClick={() => recordPayout(sel)} disabled={busy} className="text-[10px] h-7 bg-cyan-600 hover:bg-cyan-500 text-white"><Banknote className="h-3 w-3 mr-1" />Record payout</Button>
                <Button size="sm" variant="outline" onClick={() => startEdit(sel)} className="text-[10px] h-7 border-white/15 text-white/70"><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                <button onClick={() => setSel(null)} className="text-white/30 hover:text-white text-xs px-2">✕</button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 relative z-10">
              {[
                { label: "Payin", value: inr(sel.collected_inr), color: "#34d399" },
                { label: "Payout", value: inr(sel.paid_out_inr), color: "#fb7185" },
                { label: "Commission", value: inr(sel.commission_inr), color: "#fbbf24" },
                { label: "Net", value: inr(sel.net_inr), color: Number(sel.net_inr) >= 0 ? "#34d399" : "#fb7185", glow: true },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-3 text-center border" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0.2))", borderColor: "rgba(15,23,42,0.05)" }}>
                  <div className="text-[9px] text-white/30 uppercase tracking-widest">{s.label}</div>
                  <div className="text-sm font-black mt-1 av8-mono-num" style={{ color: s.color, textShadow: s.glow ? "0 0 12px rgba(56,189,248,0.4)" : "none" }}>{s.value}</div>
                </div>
              ))}
            </div>
            {sel.upi_ids.length > 0 && (
              <div className="relative z-10">
                <h4 className="text-[10px] text-white/50 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Radio className="h-3 w-3 text-cyan-400" /> UPI IDs {sel.active ? "(live in rotation)" : "(paused)"}</h4>
                <div className="flex flex-wrap gap-1.5">{sel.upi_ids.map((id) => <span key={id} className="font-mono text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-100">{id}</span>)}</div>
              </div>
            )}
            <div className="relative z-10">
              <h4 className="text-[10px] text-white/50 uppercase tracking-widest mb-2 flex items-center gap-1.5"><TrendingUp className="h-3 w-3 text-rose-400" /> Payout ledger — paid to players</h4>
              <div className="max-h-56 overflow-y-auto rounded-xl border" style={{ borderColor: "rgba(15,23,42,0.04)", background: "rgba(255,255,255,0.2)" }}>
                <table className="w-full text-[10px]">
                  <thead className="sticky top-0" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)" }}>
                    <tr className="text-white/40"><th className="text-right p-2">Amount</th><th className="text-left p-2">Reference</th><th className="text-right p-2">Time</th></tr>
                  </thead>
                  <tbody>
                    {selLoading ? (
                      <tr><td colSpan={3} className="text-center py-6 text-white/30"><Loader2 className="h-4 w-4 animate-spin inline" /></td></tr>
                    ) : selPayouts.length === 0 ? (
                      <tr><td colSpan={3} className="text-center py-6 text-white/30">No payouts recorded yet — use “Record payout”.</td></tr>
                    ) : selPayouts.map((p) => (
                      <tr key={p.id} className="border-t av8-row" style={{ borderColor: "rgba(15,23,42,0.03)" }}>
                        <td className="p-2 text-right av8-mono-num font-semibold text-rose-300">−{inr(p.amount_inr)}</td>
                        <td className="p-2 text-white/50 truncate max-w-[240px]">{p.note || "—"}</td>
                        <td className="p-2 text-right text-white/30">{p.created_at ? new Date(p.created_at).toLocaleString() : "—"}</td>
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
          <span>Click any supplier row to open its UPI IDs and payout ledger. Active suppliers' UPI IDs are the live deposit rotation (payin). <b>Net = payin − payout − commission.</b> Payin is attributed from credited deposits since this panel went live.</span>
        </p>
      </div>
    </div>
  );
}

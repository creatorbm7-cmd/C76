import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { num } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus, RefreshCw, Wallet, ArrowUpRight, UserPlus, Coins,
  Search, Download, Scale, Zap, TrendingUp, Users as UsersIcon, HandCoins, Loader2,
} from "lucide-react";
import {
  V8Styles, V8StatCard, V8Th, V8IconBtn, V8InitialBadge, V8FilterPill, type V8Tone,
} from "./adminV8Kit";

/**
 * AdminAgentWallets — sub-agent (reseller) e-wallets (V8, Users-dashboard parity).
 *
 * 3D hero, KPI cards, filters, premium table + click-to-open detail panel showing
 * one agent's top-up / credit ledger. Real balances move only through the SECURITY
 * DEFINER RPCs `agent_topup` / `agent_credit_player` (locked rows, balance ≥ amount,
 * is_admin()/ownership gate) — the client can never move funds directly.
 */

interface Agent {
  id: string; user_id: string | null; name: string; phone: string | null;
  balance: number; commission_pct: number; active: boolean; created_at: string;
}
interface Ledger {
  id: string; agent_id: string; kind: string; amount: number;
  balance_after: number; player_id: string | null; note: string | null; created_at: string;
}

const fmt = (n: number) => num(n, { locale: "en-IN", min: 2, max: 2 });
const hueOf = (s: string) => Array.from(s || "").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

async function resolveUserId(email: string): Promise<string | null> {
  const e = email.trim().toLowerCase();
  if (!e) return null;
  const { data } = await supabase.from("profiles").select("id").ilike("email", e).maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

const WalletScene = lazy(() => import("./UsersScene"));

type FilterKey = "all" | "active" | "paused";
const FILTERS: { key: FilterKey; label: string; tone: V8Tone }[] = [
  { key: "all", label: "All Agents", tone: "amber" },
  { key: "active", label: "Active", tone: "emerald" },
  { key: "paused", label: "Paused", tone: "rose" },
];

export default function AdminAgentWallets() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [nName, setNName] = useState("");
  const [nPhone, setNPhone] = useState("");
  const [nEmail, setNEmail] = useState("");
  const [nComm, setNComm] = useState("0");
  const formRef = useRef<HTMLDivElement | null>(null);

  const [sel, setSel] = useState<Agent | null>(null);
  const [selLedger, setSelLedger] = useState<Ledger[]>([]);
  const [selLoading, setSelLoading] = useState(false);
  const detailRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: a }, { data: l }] = await Promise.all([
      supabase.from("agent_accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("agent_ledger").select("*").order("created_at", { ascending: false }).limit(60),
    ]);
    setAgents((a || []) as Agent[]);
    setLedger((l || []) as Ledger[]);
    const ids = [...new Set([...(a || []).map((x: any) => x.user_id), ...(l || []).map((x: any) => x.player_id)].filter(Boolean))] as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, email, full_name").in("id", ids);
      const map: Record<string, string> = {};
      for (const p of (profs || []) as { id: string; email?: string; full_name?: string }[]) map[p.id] = p.full_name || p.email || p.id.slice(0, 8);
      setNames(map);
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openDetail = useCallback(async (a: Agent) => {
    setSel(a); setSelLoading(true); setSelLedger([]);
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
    const { data } = await supabase.from("agent_ledger").select("*").eq("agent_id", a.id)
      .order("created_at", { ascending: false }).limit(50);
    const rows = (data || []) as Ledger[];
    setSelLedger(rows);
    const missing = [...new Set(rows.map((r) => r.player_id).filter((x) => x && !names[x!]))] as string[];
    if (missing.length) {
      const { data: profs } = await supabase.from("profiles").select("id, email, full_name").in("id", missing);
      if (profs) setNames((m) => { const n = { ...m }; for (const p of profs as any[]) n[p.id] = p.full_name || p.email || p.id.slice(0, 8); return n; });
    }
    setSelLoading(false);
  }, [names]);
  useEffect(() => { if (sel) { const f = agents.find((x) => x.id === sel.id); if (f) setSel(f); } }, [agents]); // eslint-disable-line

  const totals = useMemo(() => ({
    bal: agents.reduce((s, a) => s + Number(a.balance || 0), 0),
    credited: ledger.filter((l) => l.kind === "credit").reduce((s, l) => s + Number(l.amount || 0), 0),
    count: agents.length, active: agents.filter((a) => a.active).length, paused: agents.filter((a) => !a.active).length,
  }), [agents, ledger]);

  const filtered = useMemo(() => {
    let r = agents;
    if (filter === "active") r = r.filter((a) => a.active);
    else if (filter === "paused") r = r.filter((a) => !a.active);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((a) => a.name.toLowerCase().includes(q) || (a.phone || "").toLowerCase().includes(q) || (a.user_id ? (names[a.user_id] || "").toLowerCase().includes(q) : false));
    }
    return r;
  }, [agents, filter, search, names]);

  const openCreate = () => { setFormOpen(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 30); };

  const createAgent = async () => {
    if (!nName.trim()) { toast.error("Agent name required"); return; }
    setBusy(true);
    try {
      let userId: string | null = null;
      if (nEmail.trim()) { userId = await resolveUserId(nEmail); if (!userId) { toast.error("No user found for that login email"); setBusy(false); return; } }
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("agent_accounts").insert({ name: nName.trim(), phone: nPhone.trim() || null, user_id: userId, commission_pct: Math.max(0, Math.min(100, Number(nComm) || 0)), created_by: user?.id ?? null });
      if (error) throw error;
      toast.success("Agent created");
      setNName(""); setNPhone(""); setNEmail(""); setNComm("0"); setFormOpen(false);
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Could not create agent"); }
    finally { setBusy(false); }
  };

  const topup = async (a: Agent) => {
    const raw = window.prompt(`Top up ${a.name} — amount (₹):`, "");
    if (raw == null) return;
    const amount = Number(raw);
    if (!(amount > 0)) { toast.error("Invalid amount"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("agent_topup", { p_agent: a.id, p_amount: amount, p_note: "admin top-up" });
      if (error) throw error;
      toast.success(`Topped up ${a.name} by ₹${fmt(amount)}`);
      await load(); if (sel?.id === a.id) openDetail(a);
    } catch (e: any) { toast.error(e?.message ?? "Top-up failed"); }
    finally { setBusy(false); }
  };

  const creditPlayer = async (a: Agent) => {
    const email = window.prompt(`Credit a player from ${a.name} (balance ₹${fmt(a.balance)}).\nPlayer email:`, "");
    if (email == null || !email.trim()) return;
    const raw = window.prompt("Amount (₹):", "");
    if (raw == null) return;
    const amount = Number(raw);
    if (!(amount > 0)) { toast.error("Invalid amount"); return; }
    setBusy(true);
    try {
      const player = await resolveUserId(email);
      if (!player) { toast.error("No player found for that email"); setBusy(false); return; }
      const { error } = await supabase.rpc("agent_credit_player", { p_agent: a.id, p_player: player, p_amount: amount, p_note: `agent credit` });
      if (error) throw error;
      toast.success(`Credited ₹${fmt(amount)} to ${email.trim()}`);
      await load(); if (sel?.id === a.id) openDetail(a);
    } catch (e: any) { toast.error(e?.message ?? "Credit failed"); }
    finally { setBusy(false); }
  };

  const toggleActive = async (a: Agent) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("agent_accounts").update({ active: !a.active }).eq("id", a.id);
      if (error) throw error;
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Update failed"); }
    finally { setBusy(false); }
  };

  const exportCSV = () => {
    const header = ["Agent", "Phone", "Login", "Balance INR", "Commission %", "Active", "Created"];
    const body = filtered.map((a) => [a.name, a.phone || "", a.user_id ? (names[a.user_id] || "linked") : "admin-managed", Number(a.balance).toFixed(2), a.commission_pct, a.active ? "active" : "paused", a.created_at ? new Date(a.created_at).toISOString() : ""]);
    const csv = [header, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const el = document.createElement("a"); el.href = url; el.download = `sub-agents-${new Date().toISOString().slice(0, 10)}.csv`;
    el.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} agent${filtered.length === 1 ? "" : "s"}`);
  };

  const selStats = useMemo(() => ({
    topups: selLedger.filter((l) => l.kind === "topup").reduce((s, l) => s + Number(l.amount || 0), 0),
    credited: selLedger.filter((l) => l.kind === "credit").reduce((s, l) => s + Number(l.amount || 0), 0),
  }), [selLedger]);

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="space-y-5">
        {/* 3D HERO */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 av8-gradient-border"
             style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.10), rgba(245,158,11,0.06), rgba(15,23,42,0.5))", boxShadow: "0 12px 40px -12px rgba(16,185,129,0.25), inset 0 1px 0 rgba(15,23,42,0.04)" }}>
          <div className="absolute inset-0 opacity-90 pointer-events-none">
            <Suspense fallback={<div className="w-full h-full" />}><WalletScene height={220} nodeCount={30} /></Suspense>
          </div>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 50%, transparent 0%, rgba(255,255,255,0.35) 60%, rgba(255,255,255,0.65) 100%)" }} />
          <div className="relative z-10 p-5 flex items-center justify-between flex-wrap gap-4 min-h-[220px]">
            <div className="max-w-md">
              <div className="flex items-center gap-2 mb-1">
                <UserPlus className="h-5 w-5 text-emerald-300" style={{ filter: "drop-shadow(0 0 10px rgba(16,185,129,0.8))" }} />
                <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70 font-bold">Finance · Sub-Agent Wallets</div>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-none"
                  style={{ background: "linear-gradient(135deg, #34d399 0%, #fbbf24 60%, #f59e0b 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 2px 8px rgba(15,23,42,0.6))" }}>
                SUB-AGENT WALLETS
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 ring-1 ring-emerald-500/40 text-[10px] font-bold text-emerald-300 tracking-wider backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 av8-pulse-dot" /> {totals.active} ACTIVE</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 ring-1 ring-amber-500/35 text-[10px] font-bold text-amber-200 tracking-wider backdrop-blur"><UsersIcon className="h-3 w-3" /> <span className="av8-mono-num">{totals.count}</span> AGENTS</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 ring-1 ring-emerald-500/35 text-[10px] font-bold text-emerald-200 tracking-wider backdrop-blur"><Wallet className="h-3 w-3" /> FLOAT <span className="av8-mono-num">₹{fmt(totals.bal)}</span></span>
              </div>
              <p className="text-[11px] text-white/55 mt-3 tracking-wide leading-relaxed max-w-sm">
                Reseller e-wallets — admin tops up, agent credits players.{" "}
                <span className="text-cyan-300 font-bold av8-mono-num">₹{fmt(totals.credited)}</span> credited to players (last {ledger.length} events). Balances move atomically via secured RPCs.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={exportCSV} className="av8-action-btn px-3 py-2 rounded-lg text-xs font-semibold text-white/90 bg-black/30 backdrop-blur border border-white/15 hover:border-white/30 hover:bg-black/45 flex items-center gap-1.5 shadow-lg"><Download className="h-3.5 w-3.5" /> Export</button>
              <button onClick={load} className="av8-action-btn px-3 py-2 rounded-lg text-xs font-semibold text-white/80 bg-black/30 backdrop-blur border border-white/15 hover:border-white/30 hover:bg-black/45 flex items-center gap-1.5 shadow-lg"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
              <button onClick={openCreate} className="av8-action-btn px-3.5 py-2 rounded-lg text-xs font-bold text-black flex items-center gap-1.5" style={{ background: "linear-gradient(135deg, #34d399, #10b981)", boxShadow: "0 4px 22px -4px rgba(16,185,129,0.7), inset 0 1px 0 rgba(15,23,42,0.4)" }}><Plus className="h-3.5 w-3.5" /> NEW AGENT</button>
            </div>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <V8StatCard icon={<Wallet className="h-4 w-4" />} label="Float on Agents" value={totals.bal} prefix="₹" sub="total unspent balance" tone="emerald" delay={0} />
          <V8StatCard icon={<UsersIcon className="h-4 w-4" />} label="Agents" value={totals.count} sub={`${totals.active} active · ${totals.paused} paused`} tone="amber" delay={80} />
          <V8StatCard icon={<Coins className="h-4 w-4" />} label="Credited (recent)" value={totals.credited} prefix="₹" sub={`to players · last ${ledger.length}`} tone="cyan" delay={160} />
          <V8StatCard icon={<ArrowUpRight className="h-4 w-4" />} label="Ledger Rows" value={ledger.length} sub="top-ups + credits" tone="rose" delay={240} />
        </div>

        {/* SEARCH + FILTER */}
        <div className="flex flex-col gap-3">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-400/70" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by agent, phone, or login…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
              style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(15,23,42,0.06)", backdropFilter: "blur(8px)", boxShadow: "inset 0 0 20px rgba(15,23,42,0.4)" }} />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white px-2 py-1 text-xs">✕</button>}
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <V8FilterPill key={f.key} label={f.label} tone={f.tone} active={filter === f.key} onClick={() => setFilter(f.key)}
                count={f.key === "all" ? agents.length : f.key === "active" ? totals.active : totals.paused} />
            ))}
          </div>
        </div>

        {/* NEW AGENT FORM */}
        {formOpen && (
          <div ref={formRef} className="rounded-2xl border border-emerald-500/25 p-4 space-y-3 av8-card av8-gradient-border relative"
               style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(244,246,248,0.9))", boxShadow: "0 8px 40px -8px rgba(16,185,129,0.25)" }}>
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-emerald-300/80 font-semibold flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> New agent</div>
              <button onClick={() => setFormOpen(false)} className="text-white/30 hover:text-white text-xs px-2">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <input value={nName} onChange={(e) => setNName(e.target.value)} placeholder="Agent name" className="rounded-lg px-3 py-2 text-sm text-white outline-none" style={{ background: "rgba(15,23,42,0.04)", border: "1px solid rgba(15,23,42,0.1)" }} />
              <input value={nPhone} onChange={(e) => setNPhone(e.target.value)} placeholder="Phone (optional)" className="rounded-lg px-3 py-2 text-sm text-white outline-none" style={{ background: "rgba(15,23,42,0.04)", border: "1px solid rgba(15,23,42,0.1)" }} />
              <input value={nEmail} onChange={(e) => setNEmail(e.target.value)} placeholder="Login email (optional)" className="rounded-lg px-3 py-2 text-sm text-white outline-none" style={{ background: "rgba(15,23,42,0.04)", border: "1px solid rgba(15,23,42,0.1)" }} />
              <input value={nComm} onChange={(e) => setNComm(e.target.value)} placeholder="Commission %" inputMode="decimal" className="rounded-lg px-3 py-2 text-sm text-white outline-none" style={{ background: "rgba(15,23,42,0.04)", border: "1px solid rgba(15,23,42,0.1)" }} />
              <button onClick={createAgent} disabled={busy} className="rounded-lg px-3 py-2 text-sm font-bold text-black disabled:opacity-50" style={{ background: "#34d399" }}>{busy ? "…" : "Create agent"}</button>
            </div>
            <p className="text-[10px] text-white/30">Link a login email to let that user act as the agent (credit players themselves). Leave blank for an admin-managed agent.</p>
          </div>
        )}

        {/* AGENTS TABLE */}
        <div className="rounded-2xl border overflow-hidden av8-gradient-border relative" style={{ background: "rgba(255,255,255,0.6)", borderColor: "rgba(15,23,42,0.06)", backdropFilter: "blur(20px)" }}>
          <div className="px-4 py-3 border-b text-[11px] font-bold text-white/70 uppercase tracking-wider" style={{ borderColor: "rgba(15,23,42,0.06)", background: "rgba(255,255,255,0.3)" }}>Agents</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[820px]">
              <thead>
                <tr className="text-white/50 border-b" style={{ borderColor: "rgba(15,23,42,0.06)", background: "rgba(255,255,255,0.2)" }}>
                  <V8Th className="text-left">Agent</V8Th><V8Th className="text-left">Login</V8Th><V8Th className="text-right">Balance</V8Th><V8Th className="text-right">Comm %</V8Th><V8Th className="text-center">Status</V8Th><V8Th className="text-center">Actions</V8Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-16 text-center text-white/30 text-xs"><div className="inline-flex items-center gap-2"><Zap className="h-3 w-3 text-emerald-400 av8-pulse-dot" /> Loading agents…</div></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-16 text-center text-white/30 text-xs">{agents.length === 0 ? "No agents yet — create one with NEW AGENT, then top up its balance." : "No agents match the current filter"}</td></tr>
                ) : filtered.map((a, i) => (
                  <tr key={a.id} onClick={() => openDetail(a)}
                      className={`av8-row border-b cursor-pointer ${sel?.id === a.id ? "bg-emerald-500/[0.06]" : ""}`}
                      style={{ borderColor: "rgba(15,23,42,0.03)", background: sel?.id === a.id ? undefined : (i % 2 === 0 ? "transparent" : "rgba(15,23,42,0.008)") }}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <V8InitialBadge label={a.name} hue={hueOf(a.name)} active={a.active} />
                        <div className="min-w-0"><div className="font-bold text-white truncate max-w-[160px]">{a.name}</div>{a.phone && <div className="text-[10px] text-white/35">{a.phone}</div>}</div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-white/50">{a.user_id ? (names[a.user_id] || "linked") : "admin-managed"}</td>
                    <td className="px-3 py-3 text-right av8-mono-num font-bold text-emerald-300" style={{ textShadow: Number(a.balance) > 0 ? "0 0 8px rgba(16,185,129,0.35)" : "none" }}>₹{fmt(a.balance)}</td>
                    <td className="px-3 py-3 text-right av8-mono-num text-white/80">{a.commission_pct}%</td>
                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleActive(a)} disabled={busy} className="relative inline-flex h-5 w-9 items-center rounded-full transition disabled:opacity-50 mx-auto" style={{ background: a.active ? "#10b981" : "rgba(15,23,42,0.15)" }} title={a.active ? "Active" : "Paused"}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${a.active ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-0.5">
                        <V8IconBtn onClick={() => topup(a)} title="Top up agent balance" tone="amber" disabled={busy}><Wallet className="h-3.5 w-3.5" /></V8IconBtn>
                        <V8IconBtn onClick={() => creditPlayer(a)} title="Credit a player from this agent" tone="cyan" disabled={busy || !a.active}><HandCoins className="h-3.5 w-3.5" /></V8IconBtn>
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
               style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))", borderColor: "rgba(16,185,129,0.3)", boxShadow: "0 8px 40px -8px rgba(16,185,129,0.25)" }}>
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.15), transparent 70%)", transform: "translate(30%, -30%)" }} />
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                <V8InitialBadge label={sel.name} hue={hueOf(sel.name)} active={sel.active} />
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white truncate flex items-center gap-2">{sel.name}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sel.active ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40" : "bg-white/5 text-white/40 ring-1 ring-white/10"}`}>{sel.active ? "Active" : "Paused"}</span>
                  </h3>
                  <p className="text-[10px] text-emerald-300/70">{sel.user_id ? (names[sel.user_id] || "linked login") : "admin-managed"}{sel.phone ? ` · ${sel.phone}` : ""} · {sel.commission_pct}% commission</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="sm" onClick={() => topup(sel)} disabled={busy} className="text-[10px] h-7 bg-amber-500 hover:bg-amber-400 text-black font-bold"><Wallet className="h-3 w-3 mr-1" />Top up</Button>
                <Button size="sm" onClick={() => creditPlayer(sel)} disabled={busy || !sel.active} className="text-[10px] h-7 bg-cyan-600 hover:bg-cyan-500 text-white"><HandCoins className="h-3 w-3 mr-1" />Credit player</Button>
                <button onClick={() => setSel(null)} className="text-white/30 hover:text-white text-xs px-2">✕</button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 relative z-10">
              {[
                { label: "Balance", value: `₹${fmt(sel.balance)}`, color: "#34d399", glow: true },
                { label: "Topups (recent)", value: `₹${fmt(selStats.topups)}`, color: "#fbbf24" },
                { label: "Credited (recent)", value: `₹${fmt(selStats.credited)}`, color: "#38bdf8" },
                { label: "Commission", value: `${sel.commission_pct}%`, color: "#ffffff" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-3 text-center border" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0.2))", borderColor: "rgba(15,23,42,0.05)" }}>
                  <div className="text-[9px] text-white/30 uppercase tracking-widest">{s.label}</div>
                  <div className="text-sm font-black mt-1 av8-mono-num" style={{ color: s.color, textShadow: s.glow ? "0 0 12px rgba(16,185,129,0.4)" : "none" }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="relative z-10">
              <h4 className="text-[10px] text-white/50 uppercase tracking-widest mb-2 flex items-center gap-1.5"><TrendingUp className="h-3 w-3 text-emerald-400" /> Ledger — top-ups &amp; player credits</h4>
              <div className="max-h-64 overflow-y-auto rounded-xl border" style={{ borderColor: "rgba(15,23,42,0.04)", background: "rgba(255,255,255,0.2)" }}>
                <table className="w-full text-[10px]">
                  <thead className="sticky top-0" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)" }}>
                    <tr className="text-white/40"><th className="text-left p-2">Type</th><th className="text-left p-2">Player</th><th className="text-right p-2">Amount</th><th className="text-right p-2">Balance</th><th className="text-right p-2">Time</th></tr>
                  </thead>
                  <tbody>
                    {selLoading ? (
                      <tr><td colSpan={5} className="text-center py-6 text-white/30"><Loader2 className="h-4 w-4 animate-spin inline" /></td></tr>
                    ) : selLedger.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-6 text-white/30">No activity yet — top up this agent to get started.</td></tr>
                    ) : selLedger.map((l) => (
                      <tr key={l.id} className="border-t av8-row" style={{ borderColor: "rgba(15,23,42,0.03)" }}>
                        <td className="p-2"><span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${l.kind === "topup" ? "bg-amber-500/20 text-amber-300" : "bg-cyan-500/20 text-cyan-300"}`}>{l.kind === "topup" ? "Top-up" : "Credit"}</span></td>
                        <td className="p-2 text-white/60">{l.player_id ? (names[l.player_id] || l.player_id.slice(0, 8)) : "—"}</td>
                        <td className={`p-2 text-right av8-mono-num font-semibold ${l.kind === "topup" ? "text-emerald-300" : "text-cyan-300"}`}>{l.kind === "topup" ? "+" : "−"}₹{fmt(l.amount)}</td>
                        <td className="p-2 text-right av8-mono-num text-white/50">₹{fmt(l.balance_after)}</td>
                        <td className="p-2 text-right text-white/30">{l.created_at ? new Date(l.created_at).toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <p className="text-[11px] text-white/40 flex items-start gap-1.5">
          <Scale className="h-3.5 w-3.5 text-emerald-300 flex-shrink-0 mt-0.5" />
          <span>Click any agent row to open its ledger. Crediting a player moves funds from the agent's balance into the player's wallet — balances can't go negative and every movement is recorded. Balances are only ever increased by an admin top-up.</span>
        </p>
      </div>
    </div>
  );
}

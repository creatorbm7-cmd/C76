import { useEffect, useState, useCallback, useMemo } from "react";
import { Headphones, Loader2, RefreshCw, Inbox, Clock, CheckCircle2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

/**
 * AdminSupport — "Customer Service / Users Feedback" (Support). Read-only view
 * of support_tickets (with AI triage fields) from live data.
 */
type Ticket = {
  id: string; user_id: string | null; subject: string | null; body: string | null;
  status: string | null; ai_priority: string | null; ai_category: string | null;
  ai_summary: string | null; created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  open: "#22e07a", pending: "#ffc83d", resolved: "#8b93a7", closed: "#8b93a7",
};
const PRIORITY_COLORS: Record<string, string> = {
  high: "#ff4d6d", urgent: "#ff4d6d", medium: "#ffc83d", low: "#8b93a7",
};

export default function AdminSupport() {
  const [rows, setRows] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("support_tickets")
      .select("id, user_id, subject, body, status, ai_priority, ai_category, ai_summary, created_at")
      .order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows((data || []) as Ticket[]);
    setLoading(false);
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const isResolved = (s: string | null) => s === "resolved" || s === "closed";
    const open = rows.filter(r => (r.status ?? "") === "open").length;
    const pending = rows.filter(r => (r.status ?? "") === "pending").length;
    const resolved = rows.filter(r => isResolved(r.status)).length;
    return { total: rows.length, open, pending, resolved };
  }, [rows]);

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="space-y-4">
        {/* PREMIUM HERO */}
        <V8PageHero
          eyebrow="Support · Customer Service"
          title="CUSTOMER SERVICE"
          tone="rose"
          icon={<Headphones className="h-5 w-5" />}
          badges={[
            { label: `${stats.open} OPEN`, tone: "emerald", dot: true },
            { label: `${stats.pending} PENDING`, tone: "amber" },
            { label: `${stats.resolved} RESOLVED`, tone: "cyan" },
          ]}
          subtitle={<>Support tickets &amp; feedback (AI-triaged), newest first · <span className="font-bold" style={{ color: "#be123c" }}>{stats.open}</span> open in view.</>}
          actions={
            <V8HeroBtn variant="ghost" onClick={load} disabled={loading} title="Refresh tickets">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </V8HeroBtn>
          }
        />

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <V8StatCard icon={<MessageSquare className="h-4 w-4" />} label="Total (loaded)" value={stats.total} sub="in current view" tone="rose" delay={0} />
          <V8StatCard icon={<Inbox className="h-4 w-4" />} label="Open" value={stats.open} sub="need a reply" tone="emerald" delay={80} />
          <V8StatCard icon={<Clock className="h-4 w-4" />} label="Pending" value={stats.pending} sub="awaiting user" tone="amber" delay={160} />
          <V8StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Resolved" value={stats.resolved} sub="closed / done" tone="cyan" delay={240} />
        </div>

        {/* FILTER */}
        <div className="flex items-center justify-end">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none" style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.1)" }}>
            {["all", "open", "pending", "resolved", "closed"].map((s) => <option key={s} value={s} style={{ background: "#ffffff" }}>{s}</option>)}
          </select>
        </div>

      {loading ? (
        <div className="p-10 text-center text-slate-300"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : (
        <div className="space-y-2">
          {rows.map((t) => (
            <div key={t.id} className="rounded-xl p-4" style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.07)" }}>
              <div className="flex items-center gap-2 flex-wrap">
                {t.status && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded" style={{ background: `${STATUS_COLORS[t.status] || "#8b93a7"}22`, color: STATUS_COLORS[t.status] || "#8b93a7" }}>{t.status}</span>}
                {t.ai_priority && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded" style={{ background: `${PRIORITY_COLORS[t.ai_priority] || "#8b93a7"}22`, color: PRIORITY_COLORS[t.ai_priority] || "#8b93a7" }}>{t.ai_priority}</span>}
                {t.ai_category && <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500">{t.ai_category}</span>}
                <span className="text-[10px] text-slate-400 ml-auto">{new Date(t.created_at).toLocaleString()}</span>
              </div>
              <div className="text-sm font-bold text-slate-900 mt-2">{t.subject || "(no subject)"}</div>
              <div className="text-[12px] text-slate-500 mt-1 line-clamp-2">{t.ai_summary || t.body || ""}</div>
            </div>
          ))}
          {!rows.length && (
            <div className="rounded-xl p-10 text-center text-slate-400" style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.07)" }}>
              No tickets{filter !== "all" ? ` with status "${filter}"` : ""}.
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

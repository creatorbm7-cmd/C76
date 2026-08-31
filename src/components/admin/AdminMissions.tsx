// Missions — admin CRUD for the player Missions.
//
// Create / edit / toggle / delete missions via the admin-gated RPCs
// (admin_missions_list / admin_mission_upsert / admin_mission_delete). A mission
// grants a one-time C74 reward once its metric target is met.

import { useState, useEffect, useCallback } from "react";
import { num as fmt } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Plus, Trash2, Pencil, Target, X } from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn } from "./adminV8Kit";

interface MissionRow {
  id: string; code: string; title: string; description: string | null; metric: string;
  target: number; reward_c74: number; icon: string | null; active: boolean; sort: number;
}
type Draft = Partial<MissionRow>;

const METRICS = [
  { v: "total_deposited", l: "Total deposited (USDT)" },
  { v: "total_wagered", l: "Total wagered (USDT)" },
  { v: "bets_count", l: "Number of bets" },
  { v: "referrals", l: "Rewarded referrals" },
];
const metricLabel = (m: string) => METRICS.find((x) => x.v === m)?.l ?? m;

export default function AdminMissions() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MissionRow[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("admin_missions_list");
    if (error) toast.error(error.message);
    else setRows((data ?? []) as MissionRow[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const upsert = async (m: Draft, silent = false) => {
    const { data, error } = await (supabase.rpc as any)("admin_mission_upsert", {
      p_id: m.id ?? null, p_code: m.code ?? "", p_title: m.title ?? "", p_description: m.description ?? null,
      p_metric: m.metric ?? "total_deposited", p_target: Number(m.target ?? 1), p_reward_c74: Number(m.reward_c74 ?? 0),
      p_icon: m.icon ?? null, p_active: m.active ?? true, p_sort: Number(m.sort ?? 0),
    });
    if (error || data?.error) throw new Error(data?.error ?? error?.message);
    if (!silent) toast.success("Mission saved");
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.title?.trim() || !draft.code?.trim()) { toast.error("Code and title are required"); return; }
    setSaving(true);
    try { await upsert(draft); setDraft(null); load(); }
    catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };

  const toggle = async (r: MissionRow) => { try { await upsert({ ...r, active: !r.active }, true); load(); } catch (e: any) { toast.error(e?.message); } };

  const del = async (r: MissionRow) => {
    if (!confirm(`Delete "${r.title}"? This removes it and its claims.`)) return;
    const { error } = await (supabase.rpc as any)("admin_mission_delete", { p_id: r.id });
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />
      <style>{`.am-card{background:#fff;border:1px solid rgba(15,23,42,0.07);border-radius:16px}.am-in{width:100%;border:1px solid rgba(15,23,42,0.14);border-radius:9px;padding:8px 10px;font-size:13px;color:#0f172a;background:#fff}`}</style>

      <div className="space-y-5">
        <V8PageHero
          eyebrow="Growth · Missions"
          title="MISSIONS"
          tone="emerald"
          icon={<Target className="h-5 w-5" />}
          badges={[{ label: `${rows.length} TOTAL`, tone: "emerald", dot: true }, { label: `${rows.filter(r => r.active).length} ACTIVE`, tone: "cyan" }]}
          subtitle={<>Create and manage player missions. Each mission grants a one-time C74 reward once its metric target is met.</>}
          actions={<>
            <V8HeroBtn variant="ghost" onClick={load} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</V8HeroBtn>
            <V8HeroBtn variant="primary" onClick={() => setDraft({ metric: "total_deposited", active: true, target: 1, reward_c74: 100, sort: 0, icon: "🎯" })}><Plus className="h-3.5 w-3.5" /> New mission</V8HeroBtn>
          </>}
        />

        {draft && (
          <div className="am-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{draft.id ? "Edit mission" : "New mission"}</h3>
              <button onClick={() => setDraft(null)} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Code (unique)"><input className="am-in" value={draft.code ?? ""} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="e.g. big_spender" disabled={!!draft.id} /></Field>
              <Field label="Icon (emoji)"><input className="am-in" value={draft.icon ?? ""} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} placeholder="🎯" /></Field>
              <Field label="Title"><input className="am-in" value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
              <Field label="Metric">
                <select className="am-in" value={draft.metric ?? "total_deposited"} onChange={(e) => setDraft({ ...draft, metric: e.target.value })}>
                  {METRICS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
                </select>
              </Field>
              <Field label="Description" full><textarea className="am-in" rows={2} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
              <Field label="Target"><input className="am-in" type="number" value={draft.target ?? 1} onChange={(e) => setDraft({ ...draft, target: Number(e.target.value) })} /></Field>
              <Field label="Reward C74"><input className="am-in" type="number" value={draft.reward_c74 ?? 0} onChange={(e) => setDraft({ ...draft, reward_c74: Number(e.target.value) })} /></Field>
              <Field label="Sort"><input className="am-in" type="number" value={draft.sort ?? 0} onChange={(e) => setDraft({ ...draft, sort: Number(e.target.value) })} /></Field>
              <Field label="Active">
                <label className="flex items-center gap-2 text-sm text-slate-700 pt-1"><input type="checkbox" checked={draft.active ?? true} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Visible to players</label>
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <V8HeroBtn variant="primary" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save mission</V8HeroBtn>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : rows.length === 0 ? (
          <div className="am-card p-10 text-center text-slate-400 text-sm">No missions yet — create one.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="am-card p-3.5 flex items-center gap-3">
                <span className="text-lg w-7 text-center">{r.icon ?? "🎯"}</span>
                <span className="text-[10px] font-black px-2 py-1 rounded-md" style={{ background: r.active ? "rgba(22,163,74,0.12)" : "rgba(148,163,184,0.15)", color: r.active ? "#15803d" : "#64748b" }}>{r.active ? "LIVE" : "OFF"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-slate-800 truncate">{r.title} <span className="text-[10px] font-mono text-slate-400">{r.code}</span></div>
                  <div className="text-[11px] text-slate-500 truncate">{metricLabel(r.metric)} ≥ {fmt(r.target)} · 🪙 {fmt(r.reward_c74)} C74</div>
                </div>
                <button onClick={() => toggle(r)} className="text-[10px] font-bold text-slate-500 hover:text-slate-900 px-2">{r.active ? "Hide" : "Show"}</button>
                <button onClick={() => setDraft(r)} className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => del(r)} className="p-1.5 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[9px] uppercase tracking-[0.12em] text-slate-400 font-bold">{label}</span>
      {children}
    </label>
  );
}

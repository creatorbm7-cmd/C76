// Events — admin CRUD for the player-facing events feed.
//
// Create / edit / toggle / delete events via the admin-gated RPCs
// (admin_events_list / admin_event_upsert / admin_event_delete). Events with a
// reward_c74 > 0 grant a one-time C74 bonus on claim.

import { useState, useEffect, useCallback } from "react";
import { num as fmt } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Plus, Trash2, Pencil, CalendarDays, X } from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn } from "./adminV8Kit";

interface EventRow {
  id: string; title: string; description: string | null; kind: string; reward_c74: number;
  cta_label: string | null; cta_route: string | null; starts_at: string; ends_at: string | null;
  active: boolean; sort: number;
}
type Draft = Partial<EventRow>;

const KINDS = ["promo", "tournament", "drop", "mission"];
const toLocalInput = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");

export default function AdminEvents() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<EventRow[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("admin_events_list");
    if (error) toast.error(error.message);
    else setRows((data ?? []) as EventRow[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!draft) return;
    if (!draft.title?.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const { data, error } = await (supabase.rpc as any)("admin_event_upsert", {
        p_id: draft.id ?? null,
        p_title: draft.title,
        p_description: draft.description ?? null,
        p_kind: draft.kind ?? "promo",
        p_reward_c74: Number(draft.reward_c74 ?? 0),
        p_cta_label: draft.cta_label ?? null,
        p_cta_route: draft.cta_route ?? null,
        p_starts_at: draft.starts_at ?? null,
        p_ends_at: draft.ends_at ?? null,
        p_active: draft.active ?? true,
        p_sort: Number(draft.sort ?? 0),
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message);
      toast.success("Event saved");
      setDraft(null);
      load();
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };

  const toggle = async (r: EventRow) => {
    await (supabase.rpc as any)("admin_event_upsert", {
      p_id: r.id, p_title: r.title, p_description: r.description, p_kind: r.kind, p_reward_c74: r.reward_c74,
      p_cta_label: r.cta_label, p_cta_route: r.cta_route, p_starts_at: r.starts_at, p_ends_at: r.ends_at,
      p_active: !r.active, p_sort: r.sort,
    });
    load();
  };

  const del = async (r: EventRow) => {
    if (!confirm(`Delete "${r.title}"? This removes it and its claims.`)) return;
    const { error } = await (supabase.rpc as any)("admin_event_delete", { p_id: r.id });
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />
      <style>{`.ae-card{background:#fff;border:1px solid rgba(15,23,42,0.07);border-radius:16px}.ae-in{width:100%;border:1px solid rgba(15,23,42,0.14);border-radius:9px;padding:8px 10px;font-size:13px;color:#0f172a;background:#fff}`}</style>

      <div className="space-y-5">
        <V8PageHero
          eyebrow="Growth · Events"
          title="EVENTS"
          tone="emerald"
          icon={<CalendarDays className="h-5 w-5" />}
          badges={[{ label: `${rows.length} TOTAL`, tone: "emerald", dot: true }, { label: `${rows.filter(r => r.active).length} ACTIVE`, tone: "cyan" }]}
          subtitle={<>Create and manage the player events feed. Events with a C74 reward grant a one-time bonus on claim.</>}
          actions={<>
            <V8HeroBtn variant="ghost" onClick={load} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</V8HeroBtn>
            <V8HeroBtn variant="primary" onClick={() => setDraft({ kind: "promo", active: true, reward_c74: 0, sort: 0 })}><Plus className="h-3.5 w-3.5" /> New event</V8HeroBtn>
          </>}
        />

        {draft && (
          <div className="ae-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{draft.id ? "Edit event" : "New event"}</h3>
              <button onClick={() => setDraft(null)} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Title"><input className="ae-in" value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
              <Field label="Kind">
                <select className="ae-in" value={draft.kind ?? "promo"} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>
                  {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </Field>
              <Field label="Description" full><textarea className="ae-in" rows={2} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
              <Field label="Reward C74"><input className="ae-in" type="number" value={draft.reward_c74 ?? 0} onChange={(e) => setDraft({ ...draft, reward_c74: Number(e.target.value) })} /></Field>
              <Field label="Sort"><input className="ae-in" type="number" value={draft.sort ?? 0} onChange={(e) => setDraft({ ...draft, sort: Number(e.target.value) })} /></Field>
              <Field label="CTA label"><input className="ae-in" value={draft.cta_label ?? ""} onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })} placeholder="e.g. Claim now" /></Field>
              <Field label="CTA route"><input className="ae-in" value={draft.cta_route ?? ""} onChange={(e) => setDraft({ ...draft, cta_route: e.target.value })} placeholder="e.g. /wheel" /></Field>
              <Field label="Ends at"><input className="ae-in" type="datetime-local" value={toLocalInput(draft.ends_at ?? null)} onChange={(e) => setDraft({ ...draft, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field>
              <Field label="Active">
                <label className="flex items-center gap-2 text-sm text-slate-700 pt-1"><input type="checkbox" checked={draft.active ?? true} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Visible to players</label>
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <V8HeroBtn variant="primary" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save event</V8HeroBtn>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : rows.length === 0 ? (
          <div className="ae-card p-10 text-center text-slate-400 text-sm">No events yet — create one.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="ae-card p-3.5 flex items-center gap-3">
                <span className="text-[10px] font-black px-2 py-1 rounded-md" style={{ background: r.active ? "rgba(22,163,74,0.12)" : "rgba(148,163,184,0.15)", color: r.active ? "#15803d" : "#64748b" }}>{r.active ? "LIVE" : "OFF"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-slate-800 truncate">{r.title} <span className="text-[10px] font-semibold text-slate-400">· {r.kind}</span></div>
                  <div className="text-[11px] text-slate-500 truncate">{Number(r.reward_c74) > 0 ? `🪙 ${fmt(r.reward_c74)} C74` : "no reward"}{r.ends_at ? ` · ends ${new Date(r.ends_at).toLocaleDateString()}` : ""}</div>
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

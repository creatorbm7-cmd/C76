// Games Manager — admin CRUD over the game catalog.
//
// List / enable-disable / feature / edit / delete every game via the admin-gated
// RPCs (admin_games_list / admin_game_upsert / admin_game_toggle /
// admin_game_delete). Per-game math (game_config) is preserved server-side.

import { useState, useEffect, useCallback, useMemo } from "react";
import { num } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Plus, Trash2, Pencil, Gamepad2, X, Star } from "lucide-react";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

interface Game {
  id: string; slug: string; name: string; category: string; description: string | null;
  thumbnail_url: string | null; min_bet: number; max_bet: number; house_edge: number;
  is_active: boolean; is_featured: boolean; sort_order: number; tier: string | null;
}
type Draft = Partial<Game>;

const fmt = (n: number) => num(n, { max: 2 });

export default function AdminGamesManager() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Game[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("admin_games_list");
    if (error) toast.error(error.message); else setRows((data ?? []) as Game[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const categories = useMemo(() => ["all", ...Array.from(new Set(rows.map((r) => r.category))).sort()], [rows]);
  const filtered = rows.filter((r) => (cat === "all" || r.category === cat) && (!q || `${r.name} ${r.slug}`.toLowerCase().includes(q.toLowerCase())));

  const save = async () => {
    if (!draft) return;
    if (!draft.name?.trim() || !draft.slug?.trim()) { toast.error("Slug and name are required"); return; }
    setSaving(true);
    try {
      const { data, error } = await (supabase.rpc as any)("admin_game_upsert", {
        p_id: draft.id ?? null, p_slug: draft.slug, p_name: draft.name, p_category: draft.category ?? "other",
        p_description: draft.description ?? null, p_thumbnail_url: draft.thumbnail_url ?? null,
        p_min_bet: Number(draft.min_bet ?? 0.1), p_max_bet: Number(draft.max_bet ?? 1000),
        p_house_edge: Number(draft.house_edge ?? 0.15), p_is_active: draft.is_active ?? true,
        p_is_featured: draft.is_featured ?? false, p_sort_order: Number(draft.sort_order ?? 0), p_tier: draft.tier ?? null,
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message);
      toast.success("Game saved");
      setDraft(null); load();
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };

  const toggle = async (r: Game, field: "is_active" | "is_featured") => {
    await (supabase.rpc as any)("admin_game_toggle", { p_id: r.id, p_field: field });
    setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, [field]: !x[field] } : x));
  };

  const del = async (r: Game) => {
    if (!confirm(`Delete "${r.name}"?`)) return;
    const { error } = await (supabase.rpc as any)("admin_game_delete", { p_id: r.id });
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const activeCount = rows.filter((r) => r.is_active).length;
  const featuredCount = rows.filter((r) => r.is_featured).length;

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />
      <style>{`.gm-card{background:#fff;border:1px solid rgba(15,23,42,0.07);border-radius:16px}.gm-in{width:100%;border:1px solid rgba(15,23,42,0.14);border-radius:9px;padding:8px 10px;font-size:13px;color:#0f172a;background:#fff}`}</style>

      <div className="space-y-5">
        <V8PageHero
          eyebrow="Games · Catalog"
          title="GAMES MANAGER"
          tone="cyan"
          icon={<Gamepad2 className="h-5 w-5" />}
          badges={[{ label: `${rows.length} GAMES`, tone: "cyan", dot: true }, { label: `${activeCount} ACTIVE`, tone: "emerald" }, { label: `${featuredCount} FEATURED`, tone: "amber" }]}
          subtitle={<>Enable/disable, feature, order and configure every game. Per-game math is preserved — this manages the catalog (name, category, bets, house edge, art).</>}
          actions={<>
            <V8HeroBtn variant="ghost" onClick={load} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</V8HeroBtn>
            <V8HeroBtn variant="primary" onClick={() => setDraft({ category: "other", is_active: true, is_featured: false, min_bet: 0.1, max_bet: 1000, house_edge: 0.15, sort_order: 0 })}><Plus className="h-3.5 w-3.5" /> New game</V8HeroBtn>
          </>}
        />

        <div className="grid grid-cols-3 gap-3">
          <V8StatCard icon={<Gamepad2 className="h-4 w-4" />} label="Total games" value={rows.length} sub="in catalog" tone="cyan" delay={0} />
          <V8StatCard icon={<Gamepad2 className="h-4 w-4" />} label="Active" value={activeCount} sub="live to players" tone="emerald" delay={80} />
          <V8StatCard icon={<Star className="h-4 w-4" />} label="Featured" value={featuredCount} sub="promoted" tone="amber" delay={160} />
        </div>

        {draft && (
          <div className="gm-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{draft.id ? "Edit game" : "New game"}</h3>
              <button onClick={() => setDraft(null)} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Name"><input className="gm-in" value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></F>
              <F label="Slug (unique)"><input className="gm-in" value={draft.slug ?? ""} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="e.g. crash" /></F>
              <F label="Category"><input className="gm-in" value={draft.category ?? ""} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="crash / slots / card…" /></F>
              <F label="Tier"><input className="gm-in" value={draft.tier ?? ""} onChange={(e) => setDraft({ ...draft, tier: e.target.value })} placeholder="optional" /></F>
              <F label="Thumbnail URL" full><input className="gm-in" value={draft.thumbnail_url ?? ""} onChange={(e) => setDraft({ ...draft, thumbnail_url: e.target.value })} /></F>
              <F label="Min bet"><input className="gm-in" type="number" value={draft.min_bet ?? 0.1} onChange={(e) => setDraft({ ...draft, min_bet: Number(e.target.value) })} /></F>
              <F label="Max bet"><input className="gm-in" type="number" value={draft.max_bet ?? 1000} onChange={(e) => setDraft({ ...draft, max_bet: Number(e.target.value) })} /></F>
              <F label="House edge (0-1)"><input className="gm-in" type="number" step="0.01" value={draft.house_edge ?? 0.15} onChange={(e) => setDraft({ ...draft, house_edge: Number(e.target.value) })} /></F>
              <F label="Sort order"><input className="gm-in" type="number" value={draft.sort_order ?? 0} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} /></F>
              <F label="Flags">
                <div className="flex gap-4 pt-1 text-sm text-slate-700">
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={draft.is_active ?? true} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} /> Active</label>
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={draft.is_featured ?? false} onChange={(e) => setDraft({ ...draft, is_featured: e.target.checked })} /> Featured</label>
                </div>
              </F>
            </div>
            <div className="mt-4 flex justify-end">
              <V8HeroBtn variant="primary" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save game</V8HeroBtn>
            </div>
          </div>
        )}

        {/* filters */}
        <div className="flex flex-wrap items-center gap-2">
          <input className="gm-in" style={{ maxWidth: 220 }} placeholder="Search games…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button key={c} onClick={() => setCat(c)} className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                style={cat === c ? { background: "linear-gradient(135deg,#38bdf8,#0369a1)", color: "#fff" } : { background: "rgba(15,23,42,0.05)", color: "#475569" }}>{c}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="gm-card p-10 text-center text-slate-400 text-sm">No games match.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <div key={r.id} className="gm-card p-3 flex items-center gap-3">
                {r.thumbnail_url
                  ? <img src={r.thumbnail_url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" style={{ border: "1px solid rgba(15,23,42,0.08)" }} />
                  : <div className="w-11 h-11 rounded-lg grid place-items-center shrink-0 text-lg" style={{ background: "rgba(56,189,248,0.1)" }}>🎮</div>}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-slate-800 truncate">{r.name} <span className="text-[10px] font-mono text-slate-400">{r.slug}</span></div>
                  <div className="text-[11px] text-slate-500 truncate">{r.category} · edge {Math.round(Number(r.house_edge) * 100)}% · ${fmt(r.min_bet)}–${fmt(r.max_bet)}</div>
                </div>
                <button onClick={() => toggle(r, "is_featured")} title="Feature" className={`p-1.5 rounded-md ${r.is_featured ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}`}><Star className="h-4 w-4" fill={r.is_featured ? "currentColor" : "none"} /></button>
                <button onClick={() => toggle(r, "is_active")} className="text-[10px] font-black px-2 py-1 rounded-md" style={{ background: r.is_active ? "rgba(22,163,74,0.12)" : "rgba(148,163,184,0.15)", color: r.is_active ? "#15803d" : "#64748b" }}>{r.is_active ? "LIVE" : "OFF"}</button>
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

function F({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[9px] uppercase tracking-[0.12em] text-slate-400 font-bold">{label}</span>
      {children}
    </label>
  );
}

import { useEffect, useState, useCallback } from "react";
import { Image as ImageIcon, Loader2, Plus, Trash2, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

/**
 * AdminBanners — "Banner Update" (Web Settings). CRUD over site_banners.
 * Reads directly (public-readable when active); writes via admin-casino
 * (`upsert_banner` / `delete_banner`, admin JWT + PIN 2FA).
 */
type Banner = { id?: string; type: string; title: string; image_url: string; link_url: string; sort_order: number; is_active: boolean };
const TYPES = ["home", "category", "activity", "custom"];
const BLANK: Banner = { type: "home", title: "", image_url: "", link_url: "", sort_order: 0, is_active: true };

function invoke(action: string, body: Record<string, unknown>) {
  const pin = sessionStorage.getItem("dtx_admin_auth") ?? "";
  return supabase.functions.invoke("admin-casino", { body: { action, ...body }, headers: pin ? { "x-admin-pin-session": pin } : undefined });
}

export default function AdminBanners() {
  const [rows, setRows] = useState<Banner[]>([]);
  const [draft, setDraft] = useState<Banner>(BLANK);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("site_banners").select("*").order("sort_order", { ascending: true });
    setRows((data || []) as Banner[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!draft.image_url) { toast.error("Image URL required"); return; }
    setBusy(true);
    try {
      const { error } = await invoke("upsert_banner", { ...draft });
      if (error) throw new Error(error.message);
      toast.success(draft.id ? "Banner updated" : "Banner added");
      setDraft(BLANK); await load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  };

  const remove = async (id?: string) => {
    if (!id) return;
    setBusy(true);
    try {
      const { error } = await invoke("delete_banner", { id });
      if (error) throw new Error(error.message);
      toast.success("Banner deleted"); await load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
    finally { setBusy(false); }
  };

  const inputStyle = { background: "rgba(255,255,255,0.4)", border: "1px solid rgba(15,23,42,0.08)" };

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="max-w-3xl space-y-5">
        {/* PREMIUM HERO */}
        <V8PageHero
          eyebrow="Web Settings · Banner Update"
          title="BANNER UPDATE"
          tone="cyan"
          icon={<ImageIcon className="h-5 w-5" />}
          subtitle={<>Home / category / activity / custom homepage banners · <span className="font-bold" style={{ color: "#0891b2" }}>{rows.length}</span> configured.</>}
          actions={
            <>
              <V8HeroBtn variant="primary" onClick={save} disabled={busy}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {draft.id ? "Update banner" : "Add banner"}
              </V8HeroBtn>
              <V8HeroBtn variant="ghost" onClick={load} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
              </V8HeroBtn>
            </>
          }
        />

        {/* COUNT CARD */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <V8StatCard icon={<ImageIcon className="h-4 w-4" />} label="Banners" value={rows.length} sub="configured" tone="cyan" delay={0} />
        </div>

        {/* Editor */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.07)" }}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{draft.id ? "Edit banner" : "Add banner"}</div>
          <div className="grid grid-cols-2 gap-3">
            <select value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
              className="rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none" style={inputStyle}>
              {TYPES.map((t) => <option key={t} value={t} style={{ background: "#ffffff" }}>{t}</option>)}
            </select>
            <input type="number" value={draft.sort_order} placeholder="Sort order"
              onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) || 0 }))}
              className="rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none" style={inputStyle} />
          </div>
          <input value={draft.title} placeholder="Title (optional)" onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            className="w-full rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none" style={inputStyle} />
          <input value={draft.image_url} placeholder="Image URL *" onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))}
            className="w-full rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none" style={inputStyle} />
          <input value={draft.link_url} placeholder="Link URL (optional)" onChange={(e) => setDraft((d) => ({ ...d, link_url: e.target.value }))}
            className="w-full rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none" style={inputStyle} />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))} />
            Active
          </label>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50" style={{ background: "var(--c7-primary)" }}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {draft.id ? "Update" : "Add"}
            </button>
            {draft.id && <button onClick={() => setDraft(BLANK)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-900">Cancel</button>}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="p-10 text-center text-slate-300"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="space-y-2">
            {rows.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.07)" }}>
                <div className="h-11 w-20 rounded-md bg-slate-100 bg-center bg-cover flex-shrink-0" style={{ backgroundImage: `url(${b.image_url})` }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{b.title || "(untitled)"}</div>
                  <div className="text-[11px] text-slate-400">{b.type} · #{b.sort_order} · {b.is_active ? "active" : "hidden"}</div>
                </div>
                <button onClick={() => setDraft(b)} className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-2">Edit</button>
                <button onClick={() => remove(b.id)} className="text-rose-500 hover:text-rose-600 p-1.5"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {!rows.length && (
              <div className="rounded-xl p-8 text-center text-slate-400" style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.07)" }}>
                <Plus className="h-6 w-6 mx-auto mb-2 opacity-50" /> No banners yet — add one above.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

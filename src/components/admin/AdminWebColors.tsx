import { useEffect, useState } from "react";
import { Palette, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { getSiteConfig, saveSiteConfig } from "@/lib/siteConfig";
import { V8Styles, V8PageHero, V8HeroBtn } from "./adminV8Kit";

/**
 * AdminWebColors — "Web Colors" (Web Settings). Theme accent colours.
 * Backed by site_config key `web_colors`. Public-readable; admin-only write.
 * (These override the default C7 emerald/gold theme tokens on the client.)
 */
type Colors = { primary: string; accent: string; gold: string };
const EMPTY: Colors = { primary: "#17c46e", accent: "#12b8a6", gold: "#ffc83d" };

const FIELDS: { key: keyof Colors; label: string }[] = [
  { key: "primary", label: "Primary (green)" },
  { key: "accent", label: "Accent (teal)" },
  { key: "gold", label: "Gold" },
];

export default function AdminWebColors() {
  const [form, setForm] = useState<Colors>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSiteConfig<Colors>("web_colors", EMPTY).then((v) => { setForm({ ...EMPTY, ...v }); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saveSiteConfig("web_colors", form as unknown as Record<string, unknown>);
      toast.success("Colours saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  };

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="max-w-2xl space-y-4">
        {/* PREMIUM HERO */}
        <V8PageHero
          eyebrow="Web Settings · Web Colors"
          title="WEB COLORS"
          tone="rose"
          icon={<Palette className="h-5 w-5" />}
          subtitle="Theme accent colours applied across the public site — primary, accent and gold tokens."
          actions={
            <V8HeroBtn variant="primary" onClick={save} disabled={saving || loading} title="Save colours">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </V8HeroBtn>
          }
        />

        {loading ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.07)" }}>
            {FIELDS.map((f) => (
              <label key={f.key} className="flex items-center justify-between gap-4">
                <span className="text-sm font-bold text-slate-800">{f.label}</span>
                <div className="flex items-center gap-2">
                  <input value={form[f.key]} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    className="w-28 rounded-lg px-3 py-2 text-sm text-slate-800 font-mono outline-none focus:ring-2 focus:ring-emerald-500/40"
                    style={{ background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.08)" }} />
                  <input type="color" value={form[f.key]} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    className="h-9 w-10 rounded cursor-pointer bg-transparent border-0" aria-label={f.label} />
                </div>
              </label>
            ))}
            <div className="flex items-center gap-2 pt-1">
              {FIELDS.map((f) => <span key={f.key} className="h-8 flex-1 rounded-lg" style={{ background: form[f.key] }} />)}
            </div>
            <button onClick={save} disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50"
              style={{ background: "var(--c7-primary)" }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

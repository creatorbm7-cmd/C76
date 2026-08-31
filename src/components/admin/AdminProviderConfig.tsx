import { useEffect, useState } from "react";
import { Plug, Loader2, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { getSiteConfig, saveSiteConfig } from "@/lib/siteConfig";
import { V8Styles, V8PageHero, V8HeroBtn } from "./adminV8Kit";

/**
 * AdminProviderConfig — "Provider API Config" (Gamblly-style). Manages the
 * game-provider integration's NON-SECRET fields via site_config key
 * `provider_config`. The api_key is a SERVER SECRET (Supabase Edge Function
 * secret / dashboard), never stored here — site_config is public-readable and
 * the edge action rejects secret-looking values.
 */
type Prov = { status: boolean; currency: string; language: string; platform: string; launch_url: string };
const EMPTY: Prov = { status: false, currency: "USDT", language: "en", platform: "1", launch_url: "" };

export default function AdminProviderConfig() {
  const [form, setForm] = useState<Prov>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSiteConfig<Prov>("provider_config", EMPTY).then((v) => { setForm({ ...EMPTY, ...v }); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saveSiteConfig("provider_config", form as unknown as Record<string, unknown>);
      toast.success("Provider config saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  };

  const inputStyle = { background: "rgba(255,255,255,0.7)", border: "1px solid rgba(15,23,42,0.1)" };
  const TEXT: { key: keyof Prov; label: string; ph: string }[] = [
    { key: "currency", label: "Currency", ph: "USDT" },
    { key: "language", label: "Language", ph: "en" },
    { key: "platform", label: "Platform ID", ph: "1" },
    { key: "launch_url", label: "Launch URL", ph: "https://provider.example/launch" },
  ];

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="max-w-2xl space-y-5">
        {/* PREMIUM HERO */}
        <V8PageHero
          eyebrow="Web Settings · Provider API Config"
          title="PROVIDER API CONFIG"
          tone="rose"
          icon={<Plug className="h-5 w-5" />}
          badges={[{ label: form.status ? "API ENABLED" : "API DISABLED", tone: form.status ? "emerald" : "rose", dot: true }]}
          subtitle={<>Third-party game-provider integration settings · the <b>api_key</b> stays a server secret and is never stored or shown here.</>}
          actions={
            <V8HeroBtn variant="primary" onClick={save} disabled={saving || loading} title="Save provider config">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </V8HeroBtn>
          }
        />

        <div className="rounded-xl p-3 flex items-start gap-2 text-[12px]" style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)", color: "#be123c" }}>
          <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>The provider <b>api_key</b> is a server secret — set it in <b>Supabase → Edge Functions → Secrets</b> as <code>PROVIDER_API_KEY</code>. It is never stored or shown here.</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.07)" }}>
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-slate-900">API Status</span>
              <button onClick={() => setForm((s) => ({ ...s, status: !s.status }))}
                className="relative h-6 w-11 rounded-full transition-colors"
                style={{ background: form.status ? "var(--c7-primary)" : "rgba(15,23,42,0.15)" }} aria-pressed={form.status}>
                <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: form.status ? "22px" : "2px" }} />
              </button>
            </label>
            {TEXT.map((f) => (
              <label key={f.key} className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{f.label}</span>
                <input value={form[f.key] as string} placeholder={f.ph}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-rose-500/30" style={inputStyle} />
              </label>
            ))}
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

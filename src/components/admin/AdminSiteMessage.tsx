import { useEffect, useState } from "react";
import { Megaphone, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { getSiteConfig, saveSiteConfig } from "@/lib/siteConfig";
import { V8Styles, V8PageHero, V8HeroBtn } from "./adminV8Kit";

/**
 * AdminSiteMessage — "Site Web Message" (Web Settings). The scrolling
 * marquee / notice shown across the site. Backed by site_config key
 * `site_message`. Public-readable; admin-only write.
 */
type Msg = { enabled: boolean; text: string };
const EMPTY: Msg = { enabled: false, text: "" };

export default function AdminSiteMessage() {
  const [form, setForm] = useState<Msg>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSiteConfig<Msg>("site_message", EMPTY).then((v) => { setForm({ ...EMPTY, ...v }); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saveSiteConfig("site_message", form as unknown as Record<string, unknown>);
      toast.success("Site message saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  };

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="max-w-2xl space-y-5">
        {/* PREMIUM HERO */}
        <V8PageHero
          eyebrow="Web Settings · Site Message"
          title="SITE WEB MESSAGE"
          tone="amber"
          icon={<Megaphone className="h-5 w-5" />}
          subtitle="Scrolling notice shown across the site header — toggle it on and set the message below."
          actions={
            <V8HeroBtn onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </V8HeroBtn>
          }
        />

        {loading ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.07)" }}>
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-slate-900">Enabled</span>
              <button onClick={() => setForm((s) => ({ ...s, enabled: !s.enabled }))}
                className="relative h-6 w-11 rounded-full transition-colors"
                style={{ background: form.enabled ? "var(--c7-primary)" : "rgba(15,23,42,0.15)" }} aria-pressed={form.enabled}>
                <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all shadow" style={{ left: form.enabled ? "22px" : "2px" }} />
              </button>
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Message</span>
              <textarea value={form.text} onChange={(e) => setForm((s) => ({ ...s, text: e.target.value }))}
                placeholder="🎉 Welcome bonus live! Deposit now and get 5% extra."
                maxLength={500} rows={3}
                className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
                style={{ background: "rgba(15,23,42,0.02)", border: "1px solid rgba(15,23,42,0.08)" }} />
            </label>
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

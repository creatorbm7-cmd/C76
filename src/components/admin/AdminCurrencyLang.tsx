import { useEffect, useState } from "react";
import { Languages, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { getSiteConfig, saveSiteConfig } from "@/lib/siteConfig";
import { V8Styles, V8PageHero, V8HeroBtn } from "./adminV8Kit";

/**
 * AdminCurrencyLang — "Web Currency & Language" (Web Settings).
 * Backed by site_config key `currency_lang`. Public-readable; admin-only write.
 */
type CL = { default_currency: string; currency_symbol: string; default_language: string };
const EMPTY: CL = { default_currency: "USDT", currency_symbol: "$", default_language: "en" };

const CURRENCIES = ["USDT", "INR", "USD", "EUR", "BDT", "PKR"];
const LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "ml", label: "മലയാളം (Malayalam)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "bn", label: "বাংলা (Bengali)" },
];

export default function AdminCurrencyLang() {
  const [form, setForm] = useState<CL>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSiteConfig<CL>("currency_lang", EMPTY).then((v) => { setForm({ ...EMPTY, ...v }); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saveSiteConfig("currency_lang", form as unknown as Record<string, unknown>);
      toast.success("Currency & language saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  };

  const inputStyle = { background: "rgba(255,255,255,0.4)", border: "1px solid rgba(15,23,42,0.08)" };

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="max-w-2xl space-y-5">
        {/* PREMIUM HERO */}
        <V8PageHero
          eyebrow="Web Settings · Currency & Language"
          title="CURRENCY & LANGUAGE"
          tone="cyan"
          icon={<Languages className="h-5 w-5" />}
          subtitle="Default display currency and language for the site."
          actions={
            <V8HeroBtn variant="primary" onClick={save} disabled={saving || loading} title="Save settings">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </V8HeroBtn>
          }
        />

        {loading ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.07)" }}>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Default Currency</span>
              <select value={form.default_currency} onChange={(e) => setForm((s) => ({ ...s, default_currency: e.target.value }))}
                className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-cyan-500/40" style={inputStyle}>
                {CURRENCIES.map((c) => <option key={c} value={c} style={{ background: "#ffffff" }}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Currency Symbol</span>
              <input value={form.currency_symbol} maxLength={4} onChange={(e) => setForm((s) => ({ ...s, currency_symbol: e.target.value }))}
                className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-cyan-500/40" style={inputStyle} />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Default Language</span>
              <select value={form.default_language} onChange={(e) => setForm((s) => ({ ...s, default_language: e.target.value }))}
                className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-cyan-500/40" style={inputStyle}>
                {LANGS.map((l) => <option key={l.code} value={l.code} style={{ background: "#ffffff" }}>{l.label}</option>)}
              </select>
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

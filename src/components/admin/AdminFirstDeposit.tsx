import { useEffect, useState } from "react";
import { Sparkles, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { getSiteConfig, saveSiteConfig } from "@/lib/siteConfig";
import { V8Styles, V8PageHero, V8HeroBtn } from "./adminV8Kit";

/**
 * AdminFirstDeposit — "First Deposit" bonus config (Web Settings).
 * Backed by site_config key `first_deposit`. Non-secret, public-readable so the
 * user deposit screen can show the offer; admin-only write.
 */
type FD = { enabled: boolean; bonus_percent: number; max_bonus: number; min_deposit: number };
const EMPTY: FD = { enabled: false, bonus_percent: 5, max_bonus: 100, min_deposit: 10 };

const NUM: { key: keyof FD; label: string; suffix: string }[] = [
  { key: "bonus_percent", label: "Bonus %", suffix: "%" },
  { key: "max_bonus", label: "Max Bonus (USDT)", suffix: "USDT" },
  { key: "min_deposit", label: "Min Deposit to Qualify", suffix: "USDT" },
];

export default function AdminFirstDeposit() {
  const [form, setForm] = useState<FD>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSiteConfig<FD>("first_deposit", EMPTY).then((v) => { setForm({ ...EMPTY, ...v }); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saveSiteConfig("first_deposit", form as unknown as Record<string, unknown>);
      toast.success("First-deposit bonus saved");
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
          eyebrow="Web Settings · First Deposit"
          title="FIRST DEPOSIT BONUS"
          tone="emerald"
          icon={<Sparkles className="h-5 w-5" />}
          subtitle="One-time bonus credited on a player's first deposit."
          actions={
            <V8HeroBtn variant="primary" onClick={save} disabled={saving || loading}>
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
                <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: form.enabled ? "22px" : "2px" }} />
              </button>
            </label>
            {NUM.map((f) => (
              <label key={f.key} className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{f.label}</span>
                <div className="mt-1 flex items-center gap-2">
                  <input type="number" min={0} value={form[f.key] as number}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: Math.max(0, Number(e.target.value) || 0) }))}
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/40"
                    style={{ background: "rgba(15,23,42,0.02)", border: "1px solid rgba(15,23,42,0.08)" }} />
                  <span className="text-xs text-slate-400 w-14">{f.suffix}</span>
                </div>
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

import { useEffect, useState } from "react";
import { Landmark, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { getSiteConfig, saveSiteConfig } from "@/lib/siteConfig";
import { V8Styles, V8PageHero, V8HeroBtn } from "./adminV8Kit";

/**
 * AdminBankDetails — "Modify Bank" (Web Settings). Manages the bank / UPI
 * details shown to users on the deposit screen. Backed by site_config
 * (key `bank_details`). Public-readable (users need it); admin-only write.
 */
type Bank = { bank_name: string; account_name: string; account_number: string; ifsc: string; upi_id: string };
const EMPTY: Bank = { bank_name: "", account_name: "", account_number: "", ifsc: "", upi_id: "" };

const FIELDS: { key: keyof Bank; label: string; ph: string }[] = [
  { key: "bank_name", label: "Bank Name", ph: "e.g. HDFC Bank" },
  { key: "account_name", label: "Account Holder Name", ph: "e.g. C7 Payments Pvt Ltd" },
  { key: "account_number", label: "Account Number", ph: "e.g. 50100XXXXXXXX" },
  { key: "ifsc", label: "IFSC Code", ph: "e.g. HDFC0001234" },
  { key: "upi_id", label: "UPI ID", ph: "e.g. c7pay@okhdfc" },
];

export default function AdminBankDetails() {
  const [form, setForm] = useState<Bank>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSiteConfig<Bank>("bank_details", EMPTY).then((v) => { setForm({ ...EMPTY, ...v }); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saveSiteConfig("bank_details", form as unknown as Record<string, unknown>);
      toast.success("Bank details saved");
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
          eyebrow="Web Settings · Modify Bank"
          title="BANK DETAILS"
          tone="cyan"
          icon={<Landmark className="h-5 w-5" />}
          subtitle="Bank / UPI details shown to users on the deposit screen. Keep these accurate — players pay to this account."
          actions={
            <V8HeroBtn variant="primary" onClick={save} disabled={saving || loading} title="Save bank details">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </V8HeroBtn>
          }
        />

        {loading ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.07)" }}>
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{f.label}</span>
                <input
                  value={form[f.key]}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  placeholder={f.ph}
                  className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-cyan-500/40"
                  style={{ background: "rgba(15,23,42,0.02)", border: "1px solid rgba(15,23,42,0.08)" }}
                />
              </label>
            ))}
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50"
              style={{ background: "var(--c7-primary)" }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

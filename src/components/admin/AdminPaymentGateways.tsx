import { useEffect, useState } from "react";
import { CreditCard, Loader2, Save, ShieldAlert, CheckCircle2, Circle, Plus, Trash2, KeyRound, Check, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";
import { getSiteConfig, saveSiteConfig } from "@/lib/siteConfig";
import { supabase } from "@/integrations/supabase/client";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

/**
 * AdminPaymentGateways — enable & configure payment gateways (Gamblly-style).
 *
 * SECURITY (same model as AdminProviderConfig): only NON-SECRET fields live here,
 * in site_config key `payment_gateways` (public-readable). The real secret API
 * keys are SERVER secrets set in Supabase → Edge Functions → Secrets and are
 * never stored or shown in the panel. Each gateway credits automatically through
 * its own webhook / verify function once its secret is set and it's enabled.
 *
 * COMPLIANCE: mainstream Indian aggregators (Razorpay/Cashfree/PayU/CCAvenue…)
 * prohibit real-money gaming — only enable a gateway that has lawfully onboarded
 * this business. Crypto + manual/agent UPI are the compliant defaults.
 *
 * Operators can also add their OWN gateway (any aggregator) via "+ Add gateway";
 * custom gateways are stored under a `custom_<slug>` key with their own env-name.
 */

type GwCfg = { enabled: boolean; mode: "test" | "live"; label?: string; api_url: string; merchant_id: string; key_id: string; account: string; note: string; rate?: number };
type Config = { default: string; gateways: Record<string, GwCfg> };
type GwMeta = { id: string; label: string; secretEnv: string; auto: string; note: string; hosted?: boolean; custom?: boolean; inr?: boolean };

// Built-in catalog. `hosted` gateways show an endpoint (create-order / payin) field.
const CATALOG: GwMeta[] = [
  { id: "crypto",    label: "Crypto (USDT TRC-20)", secretEnv: "TRONGRID_API_KEY", auto: "Auto — on-chain watcher credits every 2 min", note: "Compliant. Per-user address + auto-credit." },
  { id: "upi_agent", label: "UPI · manual / sub-agent", secretEnv: "— (no key)", auto: "Semi — UTR verified by admin/agent", note: "Compliant. No aggregator." },
  { id: "uupaid",    label: "uupaid (hosted payin)", secretEnv: "UUPAID_SECRET", auto: "Auto once create-uupaid-order + webhook are wired", note: "Hosted payin link. Verify it lawfully serves this business.", hosted: true, inr: true },
  { id: "razorpay",  label: "Razorpay", secretEnv: "RAZORPAY_KEY_SECRET", auto: "Live — create-razorpay-order + razorpay-webhook auto-credit", note: "Prohibits real-money gaming — only enable if lawfully onboarded.", hosted: true, inr: true },
  { id: "cashfree",  label: "Cashfree", secretEnv: "CASHFREE_SECRET_KEY", auto: "Needs cashfree-webhook", note: "Prohibits real-money gaming.", hosted: true, inr: true },
  { id: "payu",      label: "PayU", secretEnv: "PAYU_MERCHANT_SALT", auto: "Needs payu-webhook", note: "Prohibits real-money gaming.", hosted: true, inr: true },
  { id: "paytm",     label: "Paytm PG", secretEnv: "PAYTM_MERCHANT_KEY", auto: "Needs paytm-webhook", note: "Prohibits real-money gaming.", hosted: true, inr: true },
  { id: "phonepe",   label: "PhonePe PG", secretEnv: "PHONEPE_SALT_KEY", auto: "Needs phonepe-webhook", note: "Prohibits real-money gaming.", hosted: true, inr: true },
  { id: "easebuzz",  label: "Easebuzz", secretEnv: "EASEBUZZ_SALT", auto: "Needs easebuzz-webhook", note: "Verify it lawfully serves this business.", hosted: true, inr: true },
  { id: "instamojo", label: "Instamojo", secretEnv: "INSTAMOJO_PRIVATE_SALT", auto: "Needs instamojo-webhook", note: "Verify it lawfully serves this business.", hosted: true, inr: true },
  { id: "ccavenue",  label: "CCAvenue", secretEnv: "CCAVENUE_ENCRYPTION_KEY", auto: "Auto — ccavenue-response webhook", note: "Gambling MCC often blocked.", hosted: true },
  { id: "stripe",    label: "Stripe", secretEnv: "STRIPE_LIVE_API_KEY", auto: "Auto — create-fiat-topup", note: "Cards; gambling restricted by region." },
  { id: "paypal",    label: "PayPal", secretEnv: "PAYPAL_CLIENT_SECRET", auto: "Auto — capture-paypal-order", note: "Gambling restricted." },
];
const CATALOG_IDS = new Set(CATALOG.map((g) => g.id));

const emptyGw = (): GwCfg => ({ enabled: false, mode: "test", api_url: "", merchant_id: "", key_id: "", account: "", note: "" });
const EMPTY: Config = { default: "crypto", gateways: {} };

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24);

// Meta for a custom (operator-added) gateway.
const customMeta = (id: string, label: string): GwMeta => {
  const slug = id.replace(/^custom_/, "").toUpperCase();
  return { id, label, secretEnv: `CUSTOM_${slug}_SECRET`, auto: "Needs its verify/webhook function to auto-credit", note: "Custom gateway — verify it lawfully serves this business.", hosted: true, custom: true };
};

export default function AdminPaymentGateways() {
  const [cfg, setCfg] = useState<Config>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [secretSet, setSecretSet] = useState<string[]>([]);
  const [secretVals, setSecretVals] = useState<Record<string, string>>({});
  const [savingSecret, setSavingSecret] = useState<string | null>(null);

  useEffect(() => {
    getSiteConfig<Config>("payment_gateways", EMPTY).then((v) => {
      const gateways = { ...v.gateways };
      for (const g of CATALOG) if (!gateways[g.id]) gateways[g.id] = emptyGw();
      setCfg({ default: v.default || "crypto", gateways });
      setLoading(false);
    });
    void loadSecretStatus();
  }, []);

  // --- Server-side secret store (private gateway_secrets table) ---
  const pinHeader = () => {
    const pin = sessionStorage.getItem("dtx_admin_auth") ?? "";
    return pin ? { "x-admin-pin-session": pin } : undefined;
  };
  const loadSecretStatus = async () => {
    const { data } = await supabase.functions.invoke("admin-gateway-secrets", { body: { action: "status" }, headers: pinHeader() });
    if (Array.isArray((data as any)?.set)) setSecretSet((data as any).set);
  };
  // Re-fetch the public config + secret status (Refresh button). Same fetch as mount.
  const reload = () => {
    setLoading(true);
    getSiteConfig<Config>("payment_gateways", EMPTY).then((v) => {
      const gateways = { ...v.gateways };
      for (const g of CATALOG) if (!gateways[g.id]) gateways[g.id] = emptyGw();
      setCfg({ default: v.default || "crypto", gateways });
      setLoading(false);
    });
    void loadSecretStatus();
  };
  const saveSecret = async (name: string) => {
    setSavingSecret(name);
    try {
      const value = secretVals[name] ?? "";
      const { data, error } = await supabase.functions.invoke("admin-gateway-secrets", { body: { action: "set", name, value }, headers: pinHeader() });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message || "Failed");
      setSecretSet((s) => (value ? Array.from(new Set([...s, name])) : s.filter((n) => n !== name)));
      setSecretVals((v) => ({ ...v, [name]: "" }));
      toast.success(value ? "Secret saved (encrypted)" : "Secret removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save secret");
    } finally { setSavingSecret(null); }
  };
  // Which secret keys each gateway accepts (stored encrypted, never in site_config).
  const secretFields = (g: GwMeta): { name: string; label: string }[] => {
    if (g.id === "razorpay") return [
      { name: "razorpay_key_secret", label: "Key Secret" },
      { name: "razorpay_webhook_secret", label: "Webhook Secret" },
    ];
    if (g.custom || g.inr) return [{ name: `${g.id}_secret`, label: "API Secret" }];
    return [];
  };

  const setGw = (id: string, patch: Partial<GwCfg>) =>
    setCfg((c) => ({ ...c, gateways: { ...c.gateways, [id]: { ...(c.gateways[id] || emptyGw()), ...patch } } }));

  // Built-in catalog + any operator-added custom gateways.
  const customIds = Object.keys(cfg.gateways).filter((id) => !CATALOG_IDS.has(id));
  const allGateways: GwMeta[] = [
    ...CATALOG,
    ...customIds.map((id) => customMeta(id, cfg.gateways[id]?.label || id.replace(/^custom_/, ""))),
  ];

  const addCustom = () => {
    const name = newName.trim();
    if (!name) return;
    const slug = slugify(name);
    if (!slug) { toast.error("Enter a valid gateway name"); return; }
    const id = `custom_${slug}`;
    if (cfg.gateways[id] || CATALOG_IDS.has(slug) || CATALOG_IDS.has(id)) {
      toast.error("A gateway with that name already exists"); return;
    }
    setCfg((c) => ({ ...c, gateways: { ...c.gateways, [id]: { ...emptyGw(), enabled: true, label: name } } }));
    setNewName("");
    toast.success(`Added ${name} — set its endpoint & secret env, then Save`);
  };

  const removeGateway = (id: string) => {
    setCfg((c) => {
      const gateways = { ...c.gateways };
      delete gateways[id];
      const def = c.default === id ? "crypto" : c.default;
      return { ...c, default: def, gateways };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Guard: never let a secret-looking value be stored in the public config.
      // NOTE: Razorpay's Key ID (rzp_live_… / rzp_test_…) is PUBLISHABLE, not a
      // secret, and belongs in key_id — so it must NOT be blocked here. Only real
      // secrets (Stripe sk_live/sk_test, "secret"/"private") are rejected.
      for (const [id, g] of Object.entries(cfg.gateways)) {
        const blob = `${g.key_id} ${g.merchant_id} ${g.account}`.toLowerCase();
        if (/secret|sk_live|sk_test|_secret|private/.test(blob)) {
          toast.error(`Remove the secret from ${id} — put secret keys in the "Secret keys" box, not here.`);
          setSaving(false); return;
        }
      }
      await saveSiteConfig("payment_gateways", cfg as unknown as Record<string, unknown>);
      toast.success("Payment gateways saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  };

  const inputStyle = { background: "rgba(255,255,255,0.4)", border: "1px solid rgba(15,23,42,0.08)" } as const;
  const enabledList = allGateways.filter((g) => cfg.gateways[g.id]?.enabled);

  // Real, computed KPI status (counts only — never any secret value).
  const totalGw = allGateways.length;
  const activeGw = enabledList.length;
  const configuredGw = allGateways.filter((g) => {
    const fields = secretFields(g);
    return fields.length > 0 && fields.every((f) => secretSet.includes(f.name));
  }).length;
  const liveGw = allGateways.filter((g) => cfg.gateways[g.id]?.enabled && cfg.gateways[g.id]?.mode === "live").length;

  if (loading) return <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin inline" /></div>;

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="max-w-3xl space-y-5">
      {/* PREMIUM HERO */}
      <V8PageHero
        eyebrow="Finance · Payment Gateways"
        title="PAYMENT GATEWAYS"
        tone="cyan"
        icon={<CreditCard className="h-5 w-5" />}
        badges={[
          { label: `${activeGw} ACTIVE`, tone: "emerald", dot: true },
          { label: `${configuredGw} CONFIGURED`, tone: "cyan", icon: <KeyRound className="h-3 w-3" /> },
          { label: `${totalGw} TOTAL`, tone: "amber" },
        ]}
        subtitle={<>Enable, add & configure payment gateways · <span className="font-bold" style={{ color: "#0e7490" }}>{activeGw}</span> active · secret keys live encrypted in a private store — never on this page.</>}
        actions={
          <>
            <V8HeroBtn variant="ghost" onClick={reload} disabled={loading} title="Refresh gateways">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </V8HeroBtn>
            <V8HeroBtn variant="primary" onClick={save} disabled={saving} title="Save gateways">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </V8HeroBtn>
          </>
        }
      />

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <V8StatCard icon={<CreditCard className="h-4 w-4" />} label="Total Gateways" value={totalGw} sub="in catalog + custom" tone="amber" delay={0} />
        <V8StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Active" value={activeGw} sub="enabled for payin" tone="emerald" delay={80} />
        <V8StatCard icon={<KeyRound className="h-4 w-4" />} label="Configured" value={configuredGw} sub="secret keys set" tone="cyan" delay={160} />
        <V8StatCard icon={<Zap className="h-4 w-4" />} label="Live Mode" value={liveGw} sub="of active gateways" tone="rose" delay={240} />
      </div>

      <div className="rounded-xl p-3 flex items-start gap-2 text-[12px]" style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", color: "#be123c" }}>
        <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>Enter each gateway's <b>secret keys below</b> — they're stored <b>encrypted in a private table</b> (never public, never shown again), not in this page's config. Only enable a gateway that has <b>lawfully onboarded this business</b>; mainstream Indian aggregators prohibit real-money gaming.</span>
      </div>

      {/* Default gateway */}
      <div className="rounded-xl p-3 flex items-center gap-3 text-sm" style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.08)" }}>
        <span className="text-slate-600 font-semibold">Default payin:</span>
        <select value={cfg.default} onChange={(e) => setCfg((c) => ({ ...c, default: e.target.value }))}
          className="rounded-lg px-3 py-2 text-sm text-slate-900 outline-none" style={inputStyle as any}>
          {enabledList.length === 0 ? <option value="crypto">crypto</option> : enabledList.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
      </div>

      {/* Gateways */}
      <div className="space-y-3">
        {allGateways.map((g) => {
          const gw = cfg.gateways[g.id] || emptyGw();
          return (
            <div key={g.id} className="rounded-2xl p-4 border" style={{ background: "#ffffff", borderColor: gw.enabled ? "rgba(16,185,129,0.4)" : "rgba(15,23,42,0.08)" }}>
              <div className="flex items-center justify-between gap-3">
                <button onClick={() => setGw(g.id, { enabled: !gw.enabled })} className="flex items-center gap-2 text-left">
                  {gw.enabled ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Circle className="h-5 w-5 text-slate-400" />}
                  <div>
                    <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                      {g.label}
                      {g.custom && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider" style={{ background: "rgba(52,211,153,0.15)", color: "#6ee7b7" }}>custom</span>}
                    </div>
                    <div className="text-[10px] text-slate-400">{g.auto}</div>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <select value={gw.mode} onChange={(e) => setGw(g.id, { mode: e.target.value as "test" | "live" })}
                    className="rounded-lg px-2 py-1.5 text-xs text-slate-900 outline-none" style={inputStyle as any}>
                    <option value="test">Test</option><option value="live">Live</option>
                  </select>
                  {g.custom && (
                    <button onClick={() => removeGateway(g.id)} title="Remove gateway"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {gw.enabled && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                  {g.hosted && (
                    <input value={gw.api_url} onChange={(e) => setGw(g.id, { api_url: e.target.value })} placeholder="API base / create-order URL"
                      className="rounded-lg px-3 py-2 text-sm text-slate-900 outline-none md:col-span-3" style={inputStyle as any} />
                  )}
                  {g.inr && (
                    <label className="md:col-span-3 flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold whitespace-nowrap">INR per 1 USDT</span>
                      <input type="number" inputMode="decimal" min={1} step="0.01"
                        value={gw.rate ?? ""} onChange={(e) => setGw(g.id, { rate: e.target.value === "" ? undefined : Number(e.target.value) })}
                        placeholder="90"
                        className="w-28 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none" style={inputStyle as any} />
                      <span className="text-slate-400">used to convert the ₹ charge into wallet USDT (default 90)</span>
                    </label>
                  )}
                  <input value={gw.key_id} onChange={(e) => setGw(g.id, { key_id: e.target.value })} placeholder="Key ID / Public key"
                    className="rounded-lg px-3 py-2 text-sm text-slate-900 outline-none" style={inputStyle as any} />
                  <input value={gw.merchant_id} onChange={(e) => setGw(g.id, { merchant_id: e.target.value })} placeholder="Merchant / Account ID"
                    className="rounded-lg px-3 py-2 text-sm text-slate-900 outline-none" style={inputStyle as any} />
                  <input value={gw.account} onChange={(e) => setGw(g.id, { account: e.target.value })} placeholder="Payout account (display)"
                    className="rounded-lg px-3 py-2 text-sm text-slate-900 outline-none" style={inputStyle as any} />
                  <input value={gw.note} onChange={(e) => setGw(g.id, { note: e.target.value })} placeholder="Note"
                    className="rounded-lg px-3 py-2 text-sm text-slate-900 outline-none md:col-span-3" style={inputStyle as any} />
                </div>
              )}

              {gw.enabled && secretFields(g).length > 0 && (
                <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.25)", border: "1px solid rgba(15,23,42,0.06)" }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                    <KeyRound className="h-3 w-3" /> Secret keys · encrypted, server-side only
                  </div>
                  <div className="space-y-2">
                    {secretFields(g).map((f) => {
                      const isSet = secretSet.includes(f.name);
                      return (
                        <div key={f.name} className="flex items-center gap-2">
                          <input type="password" autoComplete="new-password" value={secretVals[f.name] ?? ""}
                            onChange={(e) => setSecretVals((v) => ({ ...v, [f.name]: e.target.value }))}
                            placeholder={isSet ? `${f.label} — set (enter to replace)` : f.label}
                            className="flex-1 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none" style={inputStyle as any} />
                          {isSet && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap" style={{ background: "rgba(16,185,129,0.15)", color: "#6ee7b7" }}><Check className="h-3 w-3" /> set</span>}
                          <button onClick={() => saveSecret(f.name)} disabled={savingSecret === f.name}
                            className="rounded-lg px-2.5 py-2 text-xs font-bold text-black disabled:opacity-50" style={{ background: "#34d399" }}>
                            {savingSecret === f.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-2">Stored encrypted in a private table — never public, never shown again. Leave empty & Save to remove.</p>
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(15,23,42,0.06)", color: "rgba(15,23,42,0.6)" }}>secret env: <code className="text-slate-700">{g.secretEnv}</code></span>
                <span className="text-slate-400">{g.note}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add custom gateway */}
      <div className="rounded-2xl p-4 border border-dashed" style={{ background: "rgba(52,211,153,0.04)", borderColor: "rgba(52,211,153,0.3)" }}>
        <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/70 mb-2">Add another gateway</div>
        <div className="flex items-center gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }}
            placeholder="Gateway name (e.g. PayGlocal, Airpay, MySwipe…)"
            className="flex-1 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none" style={inputStyle as any} />
          <button onClick={addCustom}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-black" style={{ background: "#34d399" }}>
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">Its secret goes in Edge Function secrets as <code className="text-slate-600">CUSTOM_&lt;NAME&gt;_SECRET</code>. Set the endpoint + merchant ID here after adding.</p>
      </div>

      <button onClick={save} disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50" style={{ background: "#34d399" }}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save gateways
      </button>

      <p className="text-[10px] text-slate-400 leading-relaxed">
        Full automation: an enabled gateway credits players automatically through its webhook / verify function once its secret is set.
        Crypto (on-chain watcher) and Stripe/PayPal/CCAvenue verify functions already exist; a new aggregator (e.g. Razorpay) also needs its
        signature-verifying webhook function before it can auto-credit. This panel stores configuration only — it never moves money or holds secrets.
      </p>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { Gamepad2, Loader2, Save, ShieldAlert, CheckCircle2, Circle, RefreshCw, Layers, Radio, Plug } from "lucide-react";
import { toast } from "sonner";
import { getSiteConfig, saveSiteConfig } from "@/lib/siteConfig";
import { V8Styles, V8PageHero, V8HeroBtn, V8StatCard } from "./adminV8Kit";

/**
 * AdminGameProviders — enable & configure game-provider / aggregator APIs.
 *
 * Same secure model as AdminPaymentGateways / AdminProviderConfig: only the
 * NON-SECRET fields (endpoint, agent/merchant code, public key, mode) live here
 * in site_config key `game_providers` (public-readable). Each provider's real
 * secret (API/hash key) is a SERVER secret set in Supabase → Edge Functions →
 * Secrets and is never stored or shown in the panel. The igaming edge function
 * signs its calls with that secret once it's set and the provider is enabled.
 */

type ProvCfg = { enabled: boolean; mode: "test" | "live"; api_url: string; agent_code: string; key_id: string; note: string };
type Config = { default: string; providers: Record<string, ProvCfg> };

const PROVIDERS: { id: string; label: string; secretEnv: string; auto: string; note: string }[] = [
  { id: "aggregator", label: "Primary aggregator", secretEnv: "IGAMING_TOKEN + IGAMING_SECRET", auto: "Live — launches games via /igaming", note: "The main game-hub (2J / SoftAPI) integration — set IGAMING_TOKEN + IGAMING_SECRET (32-byte) in Edge Function secrets." },
  { id: "jili",        label: "JILI", secretEnv: "JILI_SECRET", auto: "Auto once endpoint + secret set", note: "Slots / fishing / mini-games." },
  { id: "pgsoft",      label: "PG Soft", secretEnv: "PGSOFT_SECRET", auto: "Auto once endpoint + secret set", note: "Premium slots." },
  { id: "pragmatic",   label: "Pragmatic Play", secretEnv: "PRAGMATIC_SECRET", auto: "Auto once endpoint + secret set", note: "Slots + live casino." },
  { id: "evolution",   label: "Evolution", secretEnv: "EVOLUTION_SECRET", auto: "Auto once endpoint + secret set", note: "Live dealer." },
  { id: "spribe",      label: "Spribe (Aviator)", secretEnv: "SPRIBE_SECRET", auto: "Auto once endpoint + secret set", note: "Crash / turbo games." },
  { id: "custom",      label: "Custom provider", secretEnv: "CUSTOM_PROVIDER_SECRET", auto: "Auto once endpoint + secret set", note: "Any other API — set the endpoint + agent code." },
];

const emptyProv = (): ProvCfg => ({ enabled: false, mode: "test", api_url: "", agent_code: "", key_id: "", note: "" });
const EMPTY: Config = { default: "aggregator", providers: {} };

export default function AdminGameProviders() {
  const [cfg, setCfg] = useState<Config>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    return getSiteConfig<Config>("game_providers", EMPTY).then((v) => {
      const providers = { ...v.providers };
      for (const p of PROVIDERS) if (!providers[p.id]) providers[p.id] = emptyProv();
      setCfg({ default: v.default || "aggregator", providers });
      setLoading(false);
    });
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const setProv = (id: string, patch: Partial<ProvCfg>) =>
    setCfg((c) => ({ ...c, providers: { ...c.providers, [id]: { ...c.providers[id], ...patch } } }));

  const save = async () => {
    setSaving(true);
    try {
      // Guard: never let a secret-looking value be stored in the public config.
      for (const [id, p] of Object.entries(cfg.providers)) {
        const blob = `${p.key_id} ${p.agent_code}`.toLowerCase();
        if (/secret|sk_live|sk_test|_secret|private|password/.test(blob)) {
          toast.error(`Remove the secret from ${id} — secret keys go in Edge Function secrets, not here.`);
          setSaving(false); return;
        }
      }
      await saveSiteConfig("game_providers", cfg as unknown as Record<string, unknown>);
      toast.success("Game providers saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  };

  const inputStyle = { background: "rgba(255,255,255,0.4)", border: "1px solid rgba(15,23,42,0.08)" } as const;
  const enabledList = PROVIDERS.filter((p) => cfg.providers[p.id]?.enabled);

  // Non-secret counts / status only — never any key values.
  const totalProviders = PROVIDERS.length;
  const activeCount = enabledList.length;
  const liveCount = enabledList.filter((p) => cfg.providers[p.id]?.mode === "live").length;
  const configuredCount = PROVIDERS.filter((p) => (cfg.providers[p.id]?.api_url || "").trim().length > 0).length;

  if (loading) return <div className="p-10 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin inline" /></div>;

  return (
    <div className="relative">
      <V8Styles />
      <div className="absolute inset-0 av8-mesh-bg opacity-60 pointer-events-none -z-10" />

      <div className="max-w-3xl space-y-5">
        {/* PREMIUM HERO */}
        <V8PageHero
          eyebrow="Web · Game Providers"
          title="GAME PROVIDERS"
          tone="rose"
          icon={<Gamepad2 className="h-5 w-5" />}
          badges={[
            { label: `${activeCount} ACTIVE`, tone: "emerald", dot: activeCount > 0 },
            { label: `${totalProviders} TOTAL`, tone: "cyan" },
            { label: `${liveCount} LIVE`, tone: "amber" },
          ]}
          subtitle={<>Enable & configure game-provider / aggregator APIs · <span className="font-bold" style={{ color: "#15803d" }}>{activeCount}</span> enabled · secret keys live in Edge Function secrets — never here.</>}
          actions={
            <>
              <V8HeroBtn variant="ghost" onClick={reload} disabled={loading} title="Reload config">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
              </V8HeroBtn>
              <V8HeroBtn variant="primary" onClick={save} disabled={saving} title="Save providers">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
              </V8HeroBtn>
            </>
          }
        />

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <V8StatCard icon={<Layers className="h-4 w-4" />} label="Providers" value={totalProviders} sub="integrations available" tone="cyan" delay={0} />
          <V8StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Active" value={activeCount} sub="enabled & launching" tone="emerald" delay={80} />
          <V8StatCard icon={<Radio className="h-4 w-4" />} label="Live mode" value={liveCount} sub="real-money traffic" tone="amber" delay={160} />
          <V8StatCard icon={<Plug className="h-4 w-4" />} label="Configured" value={configuredCount} sub="endpoint set" tone="rose" delay={240} />
        </div>

      <div className="rounded-xl p-3 flex items-start gap-2 text-[12px]" style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", color: "#be123c" }}>
        <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>Each provider's secret API/hash key is a <b>server secret</b> — set it in <b>Supabase → Edge Functions → Secrets</b> (the env name is shown per provider). This panel stores only the endpoint, agent code and public key.</span>
      </div>

      {/* Default provider */}
      <div className="rounded-xl p-3 flex items-center gap-3 text-sm" style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.08)" }}>
        <span className="text-slate-600 font-semibold">Default provider:</span>
        <select value={cfg.default} onChange={(e) => setCfg((c) => ({ ...c, default: e.target.value }))}
          className="rounded-lg px-3 py-2 text-sm text-slate-800 outline-none" style={inputStyle as any}>
          {enabledList.length === 0 ? <option value="aggregator">aggregator</option> : enabledList.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>

      {/* Providers */}
      <div className="space-y-3">
        {PROVIDERS.map((p) => {
          const pv = cfg.providers[p.id] || emptyProv();
          return (
            <div key={p.id} className="rounded-2xl p-4 border" style={{ background: "#ffffff", borderColor: pv.enabled ? "rgba(16,185,129,0.4)" : "rgba(15,23,42,0.08)" }}>
              <div className="flex items-center justify-between gap-3">
                <button onClick={() => setProv(p.id, { enabled: !pv.enabled })} className="flex items-center gap-2 text-left">
                  {pv.enabled ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300" />}
                  <div>
                    <div className="text-sm font-black text-slate-900">{p.label}</div>
                    <div className="text-[10px] text-slate-400">{p.auto}</div>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <select value={pv.mode} onChange={(e) => setProv(p.id, { mode: e.target.value as "test" | "live" })}
                    className="rounded-lg px-2 py-1.5 text-xs text-slate-800 outline-none" style={inputStyle as any}>
                    <option value="test">Test</option><option value="live">Live</option>
                  </select>
                </div>
              </div>

              {pv.enabled && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input value={pv.api_url} onChange={(e) => setProv(p.id, { api_url: e.target.value })} placeholder="API base / endpoint URL"
                    className="rounded-lg px-3 py-2 text-sm text-slate-800 outline-none md:col-span-3" style={inputStyle as any} />
                  <input value={pv.agent_code} onChange={(e) => setProv(p.id, { agent_code: e.target.value })} placeholder="Agent / Merchant code"
                    className="rounded-lg px-3 py-2 text-sm text-slate-800 outline-none" style={inputStyle as any} />
                  <input value={pv.key_id} onChange={(e) => setProv(p.id, { key_id: e.target.value })} placeholder="Public key / App ID"
                    className="rounded-lg px-3 py-2 text-sm text-slate-800 outline-none" style={inputStyle as any} />
                  <input value={pv.note} onChange={(e) => setProv(p.id, { note: e.target.value })} placeholder="Note"
                    className="rounded-lg px-3 py-2 text-sm text-slate-800 outline-none" style={inputStyle as any} />
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(15,23,42,0.06)", color: "rgba(15,23,42,0.6)" }}>secret env: <code className="text-slate-700">{p.secretEnv}</code></span>
                <span className="text-slate-400">{p.note}</span>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={save} disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50" style={{ background: "#34d399" }}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save providers
      </button>

      <p className="text-[10px] text-slate-400 leading-relaxed">
        An enabled provider launches games through the igaming edge function once its secret is set. This panel stores configuration only —
        it never holds secrets. Only enable a provider you have lawfully onboarded.
      </p>
      </div>
    </div>
  );
}

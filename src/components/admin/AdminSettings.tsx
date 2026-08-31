import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeAdmin, invokeAdminCasino } from "@/lib/adminApi";
import { Save, Loader2, Wallet, AlertTriangle, Sparkles, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const GAMES = ["crash", "dice", "mines", "coinflip", "plinko", "limbo", "wheel", "keno", "hilo"];

const DID_PRESENTERS = [
  { id: "amy-Aq6OmGZnMt", label: "Amy — Realistic Female (default)" },
  { id: "rian-lZC6MmWfC1", label: "Rian — Realistic Male" },
  { id: "noelle-Sh1Yw3RkOh", label: "Noelle — Friendly Female" },
  { id: "alex-3HvGzKnHCF", label: "Alex — Professional Male" },
];
const DID_VOICES = [
  { id: "en-US-JennyNeural", label: "Jenny — US English (warm)" },
  { id: "en-US-GuyNeural", label: "Guy — US English (male)" },
  { id: "en-GB-SoniaNeural", label: "Sonia — British English" },
  { id: "en-IN-NeerjaNeural", label: "Neerja — Indian English" },
];

export default function AdminSettings() {
  const [config, setConfig] = useState<any>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);

  const testDid = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-coach-talk", {
        body: { test: true, text: "Hello, this is a test from C7 Winners." },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("D-ID connection OK ✓ — talk created");
    } catch (e: any) {
      toast.error(e.message || "D-ID test failed");
    }
    setTesting(false);
  };

  const load = useCallback(async () => {
    const { data } = await supabase.from("admin_casino_config").select("*").eq("id", "default").single();
    if (data) { setConfig(data); setDirty(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { id, updated_at, updated_by, ...payload } = config;
      const { data, error } = await invokeAdminCasino<{ success?: boolean; error?: string }>({
        action: "update_casino_config",
        config: payload,
      });
      if (error) throw error;
      if (data && (data as any).error) throw new Error((data as any).error);
      toast.success("Settings saved");
      setDirty(false);
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
    setSaving(false);
  };

  if (!config) return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-white/20" />
    </div>
  );

  const inputStyle = { background: "#ffffff", border: "1px solid rgba(15,23,42,0.06)", color: "white" };

  return (
    <div className="space-y-6">
      {/* Maintenance Mode Banner */}
      {config.maintenance_mode && (
        <div className="rounded-xl p-4 border border-red-500/30 bg-red-500/5 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div>
            <p className="text-sm font-bold text-red-400">Maintenance Mode Active</p>
            <p className="text-xs text-red-400/60">Users cannot access the platform while maintenance mode is enabled.</p>
          </div>
        </div>
      )}

      {/* Platform Wallet & Maintenance */}
      <div className="rounded-xl border p-5 space-y-5" style={{ background: "#f1f5f9", borderColor: "hsl(45,100%,60%,0.15)" }}>
        <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
          <Wallet className="h-4 w-4" /> Platform Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] text-white/30 uppercase tracking-widest">EVM Platform Wallet (0x...)</label>
            <input type="text" value={config.platform_wallet_address || ""}
              onChange={e => update("platform_wallet_address", e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 rounded-lg text-xs font-mono" style={inputStyle} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-white/30 uppercase tracking-widest">Maintenance Mode</label>
            <div className="flex items-center gap-3 mt-1">
              <Switch
                checked={config.maintenance_mode ?? false}
                onCheckedChange={(v) => update("maintenance_mode", v)}
              />
              <span className={`text-xs ${config.maintenance_mode ? "text-red-400" : "text-green-400"}`}>
                {config.maintenance_mode ? "Enabled — Site is down" : "Disabled — Site is live"}
              </span>
            </div>
          </div>
        </div>

        {/* TRC20 Hot Wallet */}
        <div className="space-y-3 pt-4 border-t border-white/[0.05]">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-white/30 uppercase tracking-widest">TRC20 Hot Wallet (Tron, T...)</label>
            <button
              onClick={async () => {
                if (!confirm("Generate a BRAND NEW Tron hot wallet?\n\nThe private key will be shown ONCE — copy it immediately into the PLATFORM_TRON_PRIVATE_KEY secret. Any existing key will be replaced.")) return;
                const t = toast.loading("Generating Tron wallet…");
                try {
                  const { data, error } = await invokeAdmin<any>("generate-tron-wallet", {});
                  if (error) throw error;
                  if (!(data as any)?.ok) throw new Error((data as any)?.error || "Failed");
                  toast.dismiss(t);
                  const { address } = data as any;
                  window.alert(
                    `✅ New Tron address: ${address}\n\nThe encrypted private key has been stored server-side. The raw key is never shown.`
                  );
                  toast.success("Tron wallet generated.");
                  load();

                  load();
                } catch (e: any) {
                  toast.dismiss(t);
                  toast.error(e.message || "Failed to generate");
                }
              }}
              className="text-[10px] px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 uppercase tracking-widest font-bold"
            >
              Generate New
            </button>
          </div>
          <input
            type="text"
            value={config.platform_tron_address || ""}
            readOnly
            placeholder="Not generated yet — click Generate New"
            className="w-full px-3 py-2 rounded-lg text-xs font-mono"
            style={inputStyle}
          />
          <p className="text-[10px] text-white/40 leading-relaxed">
            Fund this address with TRX for energy/bandwidth. The matching private key must be stored as the <code className="text-amber-400">PLATFORM_TRON_PRIVATE_KEY</code> backend secret.
          </p>
        </div>
      </div>

      {/* AI Avatar (D-ID) */}
      <div className="rounded-xl border p-5 space-y-5" style={{ background: "#f1f5f9", borderColor: "hsl(189,94%,55%,0.25)" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" /> AI Avatar — Realistic Coach (D-ID)
          </h3>
          <a
            href="https://studio.d-id.com/account-settings"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-cyan-400/80 hover:text-cyan-300 uppercase tracking-widest"
          >
            Get API key <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <p className="text-xs text-white/40 leading-relaxed">
          The D-ID API key is stored as a backend secret (<code className="text-cyan-400">DID_API_KEY</code>) — not in the database — for safety. Set or rotate it from the project's secret manager. Used server-side only to generate realistic talking-avatar clips for the in-game AI coach.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] text-white/30 uppercase tracking-widest">Avatar (Presenter)</label>
            <select
              value={config.did_presenter_id || "amy-Aq6OmGZnMt"}
              onChange={(e) => update("did_presenter_id", e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs"
              style={inputStyle}
            >
              {DID_PRESENTERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-white/30 uppercase tracking-widest">Voice (Microsoft TTS)</label>
            <select
              value={config.did_voice_id || "en-US-JennyNeural"}
              onChange={(e) => update("did_voice_id", e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs"
              style={inputStyle}
            >
              {DID_VOICES.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] text-white/30 uppercase tracking-widest">AI Coach Master Switch</label>
            <div className="flex items-center gap-3 mt-1">
              <Switch
                checked={config.ai_coach_enabled ?? false}
                onCheckedChange={(v) => update("ai_coach_enabled", v)}
              />
              <span className={`text-xs ${config.ai_coach_enabled ? "text-cyan-400" : "text-white/40"}`}>
                {config.ai_coach_enabled ? "Enabled — coach floats on every game page" : "Disabled — coach hidden everywhere"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={save}
            disabled={!dirty || saving}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${dirty ? "bg-cyan-500 text-black hover:bg-cyan-400" : "bg-white/[0.04] text-white/20 cursor-not-allowed"}`}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Avatar Settings
          </button>
          <button
            onClick={testDid}
            disabled={testing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Test D-ID Connection
          </button>
        </div>
      </div>

      {/* Game config table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "#f1f5f9", borderColor: "hsl(45,100%,60%,0.15)" }}>
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">Game Configuration</h3>
          <button onClick={save} disabled={!dirty || saving}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${dirty ? "casino-gold-gradient text-black" : "bg-white/[0.04] text-white/20 cursor-not-allowed"}`}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/25 border-b border-white/[0.04]">
                <th className="text-left p-3">Game</th>
                <th className="text-center p-3">Enabled</th>
                <th className="text-right p-3">House Edge %</th>
              </tr>
            </thead>
            <tbody>
              {GAMES.map((game, i) => (
                <tr key={game} className={`border-b border-white/[0.03] ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                  <td className="p-3 text-white capitalize font-medium">{game}</td>
                  <td className="p-3 text-center">
                    <Switch checked={config[`game_enabled_${game}`] ?? true} onCheckedChange={(v) => update(`game_enabled_${game}`, v)} />
                  </td>
                  <td className="p-3 text-right">
                    <input type="number" step="0.1" value={config[`house_edge_${game}`] ?? 4}
                      onChange={e => update(`house_edge_${game}`, parseFloat(e.target.value))}
                      className="w-20 text-right px-2 py-1 rounded text-xs" style={inputStyle} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Platform settings */}
      <div className="rounded-xl border p-5 space-y-5" style={{ background: "#f1f5f9", borderColor: "hsl(45,100%,60%,0.15)" }}>
        <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">Bet & Withdrawal Limits</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] text-white/30 uppercase tracking-widest">Min Bet (USDT)</label>
            <input type="number" step="0.01" value={config.min_bet ?? 0.1}
              onChange={e => update("min_bet", parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-xs" style={inputStyle} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-white/30 uppercase tracking-widest">Max Bet (USDT)</label>
            <input type="number" step="1" value={config.max_bet ?? 10000}
              onChange={e => update("max_bet", parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-xs" style={inputStyle} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-white/30 uppercase tracking-widest">Auto Approve Threshold</label>
            <input type="number" step="1" value={config.auto_approve_threshold ?? 100}
              onChange={e => update("auto_approve_threshold", parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-xs" style={inputStyle} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] text-white/30 uppercase tracking-widest">Min Deposit (USDT)</label>
            <input type="number" step="1" value={config.min_deposit ?? 10}
              onChange={e => update("min_deposit", parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-xs" style={inputStyle} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-white/30 uppercase tracking-widest">Max Deposit (USDT)</label>
            <input type="number" step="1" value={config.max_deposit ?? 100000}
              onChange={e => update("max_deposit", parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-xs" style={inputStyle} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-white/30 uppercase tracking-widest">Min Withdrawal (USDT)</label>
            <input type="number" step="0.1" value={config.min_withdrawal ?? 10}
              onChange={e => update("min_withdrawal", parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-xs" style={inputStyle} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-white/30 uppercase tracking-widest">Max Withdrawal (USDT)</label>
            <input type="number" step="1" value={config.max_withdrawal ?? 50000}
              onChange={e => update("max_withdrawal", parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-xs" style={inputStyle} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] text-white/30 uppercase tracking-widest">Withdrawal Fee %</label>
            <input type="number" step="0.1" value={config.withdrawal_fee ?? 1}
              onChange={e => update("withdrawal_fee", parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-xs" style={inputStyle} />
          </div>
        </div>

        <button onClick={save} disabled={!dirty || saving}
          className={`flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${dirty ? "casino-gold-gradient text-black" : "bg-white/[0.04] text-white/20 cursor-not-allowed"}`}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save All Settings
        </button>
      </div>
    </div>
  );
}

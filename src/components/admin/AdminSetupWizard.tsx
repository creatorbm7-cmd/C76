import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeAdmin, invokeAdminCasino } from "@/lib/adminApi";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Sparkles, Wallet, Sliders, Banknote, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Copy, RefreshCw, AlertTriangle } from "lucide-react";
// viem removed — wallet generation is backend-only via the generate-platform-wallets edge function.

const FLAG_KEY = "dtx_admin_wizard_done_v1";
const GAMES = ["crash", "dice", "mines", "coinflip", "plinko", "limbo", "wheel", "keno", "hilo"] as const;

type StepId = 0 | 1 | 2 | 3 | 4;

const steps: { id: StepId; title: string; icon: any; desc: string }[] = [
  { id: 0, title: "Welcome", icon: Sparkles, desc: "Quick setup of your casino" },
  { id: 1, title: "Platform Wallet", icon: Wallet, desc: "Where deposits land" },
  { id: 2, title: "House Edge", icon: Sliders, desc: "Per-game margins" },
  { id: 3, title: "Limits & Fees", icon: Banknote, desc: "Deposits & withdrawals" },
  { id: 4, title: "Done", icon: CheckCircle2, desc: "You're live" },
];

export default function AdminSetupWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<StepId>(0);
  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<{ address: string; privateKey: string } | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const refreshConfig = async () => {
    const { data } = await supabase.from("admin_casino_config").select("*").eq("id", "default").single();
    if (data) setConfig(data);
    return data;
  };

  const generateLocalEvmFallback = async () => {
    // Local viem-based fallback removed. Surface a clear error so admins re-run the edge function.
    throw new Error("EVM generation must run via the generate-platform-wallets edge function.");
  };

  const generateWallets = async (regenerate = false) => {
    setGenerating(true);
    setLastError(null);
    try {
      const { data, error } = await invokeAdmin("generate-platform-wallets", { regenerate });

      if (error) throw error;
      const payload = (data ?? {}) as any;
      if (payload.error) throw new Error(payload.error);

      const fresh = await refreshConfig();
      if (!fresh) {
        setConfig((c: any) => ({
          ...c,
          platform_wallet_address: payload.evm_address || c?.platform_wallet_address,
          platform_tron_address: payload.tron_address || c?.platform_tron_address,
        }));
      }

      const gen: string[] = payload.generated ?? [];
      if (payload.tron_error) {
        toast.warning(
          gen.length
            ? `Generated ${gen.join(" + ")}. TRON failed: ${payload.tron_error}`
            : `TRON generation failed: ${payload.tron_error}`,
        );
      } else {
        toast.success(gen.length ? `Generated ${gen.join(" + ")} wallet(s)` : "Wallets already provisioned");
      }

      // If edge function returned success but no EVM address ended up persisted, fall back
      const after = (fresh as any) ?? config;
      if (!after?.platform_wallet_address && !payload.evm_address) {
        console.warn("[wizard] edge function returned no EVM address, falling back to local generation");
        await generateLocalEvmFallback();
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to generate wallets";
      console.error("[wizard] generate-platform-wallets failed:", e);
      setLastError(msg);
      toast.error(`Edge function failed: ${msg}. Falling back to local generation…`);
      try {
        await generateLocalEvmFallback();
      } catch (fallbackErr: any) {
        console.error("[wizard] local fallback failed:", fallbackErr);
        toast.error(`Local fallback failed: ${fallbackErr?.message || fallbackErr}`);
        setLastError(`${msg} | fallback: ${fallbackErr?.message || fallbackErr}`);
      }
    } finally {
      setGenerating(false);
    }
  };

  const copy = (val?: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    toast.success("Copied");
  };

  useEffect(() => {
    if (localStorage.getItem(FLAG_KEY) === "1") return;
    (async () => {
      const { data } = await supabase.from("admin_casino_config").select("*").eq("id", "default").single();
      if (data) {
        setConfig(data);
        setOpen(true);
      }
    })();
  }, []);

  const finish = (skip = false) => {
    localStorage.setItem(FLAG_KEY, "1");
    setOpen(false);
    if (!skip) toast.success("Casino setup complete");
  };

  const persist = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      const { error } = await invokeAdminCasino({ action: "update_casino_config", config: patch });
      if (error) throw error;
      setConfig((c: any) => ({ ...c, ...patch }));
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    try {
      // step 1 wallets are persisted by the edge function itself
      if (step === 2) {
        const patch: any = {};
        for (const g of GAMES) patch[`house_edge_${g}`] = Number(config[`house_edge_${g}`]) || 0;
        await persist(patch);
      }
      if (step === 3) {
        await persist({
          min_deposit: Number(config.min_deposit) || 0,
          max_deposit: Number(config.max_deposit) || 0,
          min_withdrawal: Number(config.min_withdrawal) || 0,
          max_withdrawal: Number(config.max_withdrawal) || 0,
          withdrawal_fee: Number(config.withdrawal_fee) || 0,
        });
      }
      setStep((s) => Math.min(4, (s + 1) as StepId) as StepId);
    } catch { /* toast already shown */ }
  };

  if (!config) return null;

  const StepIcon = steps[step].icon;
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) finish(true); }}>
      <DialogContent className="max-w-2xl bg-[#ffffff] border-white/10 text-white">
        {/* Progress strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 rounded-t-lg overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="pt-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl casino-gold-gradient flex items-center justify-center">
              <StepIcon className="h-5 w-5 text-black" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{steps[step].title}</h2>
              <p className="text-xs text-white/50">{steps[step].desc} · Step {step + 1} of {steps.length}</p>
            </div>
          </div>
        </div>

        <div className="min-h-[280px] py-4">
          {step === 0 && (
            <div className="space-y-3 text-sm text-white/70">
              <p>Welcome to the C7 Winners admin console. Let's configure the essentials in under a minute.</p>
              <ul className="space-y-1.5 text-xs text-white/60">
                <li>• Set the platform wallet that receives deposits</li>
                <li>• Tune house edge for each game</li>
                <li>• Set deposit and withdrawal limits and fees</li>
              </ul>
              <p className="text-xs text-white/40">You can change all of these later in <span className="text-amber-400">System Config</span>.</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/60">
                  Auto-generated platform hot wallets. Fund these addresses with USDT (and a little gas) to enable on-chain payouts.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateWallets(false)}
                  disabled={generating}
                  className="shrink-0"
                >
                  {generating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                  {config.platform_wallet_address || config.platform_tron_address ? "Sync" : "Generate"}
                </Button>
              </div>

              {[
                { label: "EVM (ETH + BSC)", value: config.platform_wallet_address, hint: "USDT-ERC20 / USDT-BEP20 deposits land here" },
                { label: "TRON", value: config.platform_tron_address, hint: "USDT-TRC20 deposits land here" },
              ].map((row) => (
                <div key={row.label} className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-white/50">{row.label}</span>
                    {row.value && (
                      <button
                        onClick={() => copy(row.value)}
                        className="text-white/40 hover:text-white"
                        title="Copy address"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="font-mono text-xs break-all text-white/90 min-h-[1.25rem]">
                    {row.value || <span className="text-white/30 italic font-sans">Not generated yet</span>}
                  </div>
                  <div className="text-[10px] text-white/40 mt-1">{row.hint}</div>
                </div>
              ))}

              {lastError && (
                <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/30 rounded-md p-2 break-all">
                  <strong>Edge function error:</strong> {lastError}
                </div>
              )}

              {revealedKey && (
                <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-300 text-xs font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5" /> One-time private key reveal
                  </div>
                  <p className="text-[11px] text-amber-200/80">
                    Copy this private key NOW and add it as the secret <code className="bg-black/40 px-1 rounded">PLATFORM_WALLET_PRIVATE_KEY</code> in Lovable Cloud. It will not be shown again.
                  </p>
                  <div className="bg-black/40 rounded p-2 font-mono text-[11px] break-all text-amber-100 flex items-start gap-2">
                    <span className="flex-1">{revealedKey.privateKey}</span>
                    <button onClick={() => copy(revealedKey.privateKey)} className="text-amber-300 hover:text-amber-100 shrink-0">
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => setRevealedKey(null)}
                    className="text-[10px] text-amber-300/70 hover:text-amber-100 underline"
                  >
                    I've saved it — hide
                  </button>
                </div>
              )}

              <p className="text-[10px] text-white/30">
                Server-generated keys are encrypted with AES-GCM and never leave the backend. Locally-generated fallback keys are shown once above so you can store them as a secret.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {GAMES.map((g) => (
                <div key={g} className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{g}</div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.1"
                      value={config[`house_edge_${g}`] ?? 0}
                      onChange={(e) => setConfig({ ...config, [`house_edge_${g}`]: e.target.value })}
                      className="bg-white/5 border-white/10 h-8 text-sm"
                    />
                    <span className="text-xs text-white/50">%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-2 gap-3">
              {[
                ["min_deposit", "Min Deposit ($)"],
                ["max_deposit", "Max Deposit ($)"],
                ["min_withdrawal", "Min Withdrawal ($)"],
                ["max_withdrawal", "Max Withdrawal ($)"],
                ["withdrawal_fee", "Withdrawal Fee ($)"],
              ].map(([k, label]) => (
                <div key={k}>
                  <label className="text-[10px] uppercase tracking-wider text-white/50">{label}</label>
                  <Input
                    type="number"
                    value={config[k] ?? 0}
                    onChange={(e) => setConfig({ ...config, [k]: e.target.value })}
                    className="bg-white/5 border-white/10 mt-1"
                  />
                </div>
              ))}
              <div className="col-span-2 flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-lg p-3">
                <div>
                  <div className="text-sm">Maintenance Mode</div>
                  <div className="text-[11px] text-white/40">Disables all betting</div>
                </div>
                <Switch
                  checked={!!config.maintenance_mode}
                  onCheckedChange={(v) => setConfig({ ...config, maintenance_mode: v })}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="h-14 w-14 text-emerald-400 mx-auto" />
              <h3 className="text-xl font-bold">All set!</h3>
              <p className="text-sm text-white/60">Your casino is configured and ready. Use the sidebar to explore live operations, users, and finances.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/5 pt-3">
          <button onClick={() => finish(true)} className="text-xs text-white/40 hover:text-white/70">
            Skip for now
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && step < 4 && (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => (s - 1) as StepId)} disabled={saving}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            {step < 4 ? (
              <Button size="sm" onClick={next} disabled={saving} className="casino-gold-gradient text-black hover:opacity-90">
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                {step === 0 ? "Get started" : "Continue"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => finish(false)} className="casino-gold-gradient text-black hover:opacity-90">
                Enter Admin
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

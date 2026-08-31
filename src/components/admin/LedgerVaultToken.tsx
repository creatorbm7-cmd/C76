import { useEffect, useState } from "react";
import { invokeAdmin } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Copy, Shield, Check, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type Resp = { ok: boolean; exists: boolean; masked: string; token?: string; error?: string };

export default function LedgerVaultToken() {
  const [masked, setMasked] = useState<string>("");
  const [exists, setExists] = useState(false);
  const [revealed, setRevealed] = useState<string>(""); // only set right after regenerate
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await invokeAdmin<Resp>("ledger-vault-token", { action: "get" });
    if (error) toast.error(error.message);
    else if (data) { setMasked(data.masked); setExists(data.exists); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setSaving(true);
    try {
      const { data, error } = await invokeAdmin<Resp>("ledger-vault-token", { action: "regenerate" });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Failed");
      setRevealed(data.token ?? "");
      setMasked(data.masked);
      setExists(true);
      toast.success("Ledger Vault token generated — copy it now, it won't be shown again");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate token");
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    if (!revealed) return;
    await navigator.clipboard.writeText(revealed);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Token copied");
  };

  return (
    <section className="rounded-2xl ring-1 ring-white/10 bg-white/[0.02] p-5 mt-6">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-4 w-4 text-emerald-400" />
        <h2 className="text-sm font-semibold">Ledger Vault</h2>
      </div>
      <p className="text-xs text-white/50 mb-4">
        Operator API token used by the admin panel to authenticate with Ledger Vault. Stored in encrypted server-side vault — never in the application database.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-white/40">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <>
          <label className="text-[11px] uppercase tracking-wider text-white/40">
            Operator API Token
          </label>
          <div className="flex gap-2 mt-1">
            <Input
              readOnly
              value={revealed || (exists ? masked : "")}
              placeholder={exists ? "" : "No token generated yet"}
              className="bg-black/40 border-white/10 text-white font-mono text-sm"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={copy}
              disabled={!revealed}
              title={revealed ? "Copy" : "Only visible right after generation"}
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {!revealed && exists && (
            <p className="text-[10px] text-white/40 mt-2 flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" />
              Full token is not retrievable — regenerate to obtain a new one.
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-3">
            <p className="text-[10px] text-amber-300/80">
              Regenerating invalidates any existing Ledger Vault session.
            </p>
            <Button onClick={generate} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {exists ? "Regenerate" : "Generate Token"}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

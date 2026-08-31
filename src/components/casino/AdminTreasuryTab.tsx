import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeAdmin, invokeAdminCasino } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Wallet, AlertTriangle, DollarSign, ArrowUpFromLine, Building2, Shield, Eye,
  Loader2, Clock, Copy, RefreshCw, ExternalLink, Plus, Trash2, Zap, Check, X, KeyRound,
} from "lucide-react";
import { useTreasury, nativeLabel, type ChainBalance } from "@/hooks/useTreasury";

const EXPLORER_TX: Record<string, string> = {
  TRC20: "https://tronscan.org/#/transaction/", ERC20: "https://etherscan.io/tx/",
  BTC: "https://mempool.space/tx/", BEP20: "https://bscscan.com/tx/",
};
const EXPLORER_ADDR: Record<string, string> = {
  TRC20: "https://tronscan.org/#/address/", ERC20: "https://etherscan.io/address/",
  BTC: "https://mempool.space/address/", BEP20: "https://bscscan.com/address/",
};
const CHAINS = ["TRC20", "ERC20", "BEP20", "BTC"] as const;

function validateAddress(chain: string, addr: string): string | null {
  if (!addr) return "Address required";
  const a = addr.trim();
  if (chain === "TRC20") return /^T[A-Za-z0-9]{33}$/.test(a) ? null : "TRC20 must start with T (34 chars)";
  if (chain === "ERC20" || chain === "BEP20") return /^0x[a-fA-F0-9]{40}$/.test(a) ? null : `${chain} must be 0x + 40 hex`;
  if (chain === "BTC") return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(a) ? null : "Invalid BTC address";
  return null;
}

function fmtUsd(n: number) { return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`; }
function trunc(s: string, head = 8, tail = 6) { return s.length > head + tail ? `${s.slice(0, head)}…${s.slice(-tail)}` : s; }
function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); toast.success("Copied"); }
  catch { toast.error("Copy failed"); }
}

export default function AdminTreasuryTab() {
  const t = useTreasury();
  const [secondsTick, setSecondsTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setSecondsTick(x => x + 1), 1000); return () => clearInterval(id); }, []);

  const lastUpdatedLabel = t.lastSync
    ? `${Math.floor((Date.now() - t.lastSync) / 1000)}s ago`
    : "never";

  const hot = t.balances.filter(b => b.wallet_type === "hot");
  const cold = t.balances.filter(b => b.wallet_type === "cold");
  const tron = hot.find(h => h.chain === "TRC20");

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-foreground text-lg">Treasury &amp; Wallets</h2>
          <p className="text-[11px] text-dtx-muted mt-0.5">
            Live on-chain balances · last updated <span className="text-foreground">{lastUpdatedLabel}</span> · auto-refresh every 30s
          </p>
        </div>
        <button
          onClick={async () => {
            try {
              // Only claim success if a sync actually ran. A false throws below;
              // a skip (another sync already in flight) is reported honestly.
              const didSync = await t.syncBalances();
              if (!didSync) { toast.info("A sync is already in progress…"); return; }
              const fresh = await (await import("@/integrations/supabase/client")).supabase
                .from("platform_wallets")
                .select("chain, wallet_type, balance, native_balance")
                .eq("wallet_type", "hot");
              const trc = fresh.data?.find((w: any) => w.chain === "TRC20");
              if (trc) {
                toast.success(`Synced ✅ TRC20: ${Number(trc.balance).toFixed(2)} USDT · ${Number(trc.native_balance).toFixed(2)} TRX`);
              } else {
                toast.success("Sync complete");
              }
            } catch (e: any) {
              toast.error(e?.message ?? "Sync failed");
            }
          }}
          disabled={t.syncing}
          className="dtx-btn dtx-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          {t.syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t.syncing ? "Syncing…" : "Sync Now"}
        </button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-dtx-panel border border-dtx-border w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hot">Hot Wallets</TabsTrigger>
          <TabsTrigger value="cold">Cold Storage</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="profit">Profit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewCards summary={t.summary} />
        </TabsContent>

        <TabsContent value="hot" className="mt-4 space-y-4">
          <PlatformKeysCard onSynced={() => t.syncBalances()} />
          <DryRunPayoutCard />
          <SweepUserDepositsCard />
          <HotToColdCard />
          <HotWalletsGrid hot={hot} cold={cold} onRefreshOne={(c) => t.syncBalances(c)} syncing={t.syncing} />
          {tron && <TronFundingGuide tron={tron} />}
          <BscTreasuryStatusCard />
        </TabsContent>

        <TabsContent value="cold" className="mt-4">
          <ColdWalletsCard cold={cold} onChanged={() => t.syncBalances()} />
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-4">
          <WithdrawalsQueueCard />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <TreasuryHistory />
        </TabsContent>

        <TabsContent value="profit" className="mt-4">
          <ProfitWithdrawCard available={t.summary?.available_profit ?? 0} onDone={() => t.syncBalances()} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Overview ---------------- */

function OverviewCards({ summary }: { summary: ReturnType<typeof useTreasury>["summary"] }) {
  const cards = [
    { label: "Total Hot", value: fmtUsd(summary?.total_hot ?? 0), icon: Wallet },
    { label: "Total Cold", value: fmtUsd(summary?.total_cold ?? 0), icon: Shield },
    { label: "Platform Funds", value: fmtUsd(summary?.total_platform_funds ?? 0), icon: Building2 },
    { label: "User Balances", value: fmtUsd(summary?.total_user_balances ?? 0), icon: Eye },
    { label: "Pending W/D", value: fmtUsd(summary?.pending_withdrawals ?? 0), icon: Clock },
    { label: "Available Profit", value: fmtUsd(summary?.available_profit ?? 0), icon: DollarSign, accent: true },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(c => (
        <div key={c.label} className="rounded-2xl p-4 bg-dtx-panel border border-dtx-border">
          <div className="flex items-center gap-1.5 mb-1">
            <c.icon className={`h-3.5 w-3.5 ${c.accent ? "text-dtx-mint" : "text-dtx-muted"}`} />
            <span className="text-[10px] uppercase tracking-widest text-dtx-muted">{c.label}</span>
          </div>
          <div className={`text-lg font-bold ${c.accent ? "text-dtx-mint" : "text-foreground"}`}
            style={{ fontFamily: "Space Mono, monospace" }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Platform keys ---------------- */

function PlatformKeysCard({ onSynced }: { onSynced: () => void }) {
  const [busy, setBusy] = useState<"sync" | "regen" | null>(null);
  const [newKey, setNewKey] = useState<{ address: string; privateKey: string } | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);

  const syncTron = async () => {
    setBusy("sync");
    try {
      const { data, error } = await invokeAdminCasino<{ success?: boolean; address?: string; error?: string }>(
        { action: "treasury_sync_tron" });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Sync failed");
      toast.success(`TRC20 address synced: ${data?.address?.slice(0, 12)}…`);
      onSynced();
    } catch (e: any) { toast.error(e.message); }
    setBusy(null);
  };

  const regenerate = async () => {
    setConfirmRegen(false);
    setBusy("regen");
    try {
      const { data, error } = await invokeAdmin<{ ok?: boolean; address?: string; error?: string }>(
        "generate-tron-wallet", {});
      if (error || !data?.ok) throw new Error(data?.error || error?.message || "Regenerate failed");
      setNewKey({ address: data.address!, privateKey: "[stored server-side]" });
      toast.success("New wallet generated. Encrypted key stored on the server.");
      onSynced();

    } catch (e: any) { toast.error(e.message); }
    setBusy(null);
  };

  return (
    <>
      <div className="rounded-2xl p-4 bg-dtx-panel border border-dtx-border">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-dtx-mint" /> Platform Wallet Keys
            </h3>
            <p className="text-[11px] text-dtx-muted mt-1 max-w-xl">
              <strong>Sync</strong> derives the TRC20 address from the <code>PLATFORM_TRON_PRIVATE_KEY</code> secret and writes it to <code>platform_wallets</code>.
              <strong> Regenerate</strong> creates a brand-new keypair — only use this if you need a fresh wallet.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={syncTron} disabled={!!busy}
              className="border-dtx-border text-dtx-mint">
              {busy === "sync" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-1.5">Generate / Sync</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmRegen(true)} disabled={!!busy}
              className="border-dtx-loss/40 text-dtx-loss hover:bg-dtx-loss/10">
              {busy === "regen" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Regenerate"}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={confirmRegen} onOpenChange={setConfirmRegen}>
        <DialogContent className="bg-dtx-panel border-dtx-border">
          <DialogHeader><DialogTitle className="text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" /> Generate NEW wallet?
          </DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm text-foreground">
            <p className="text-amber-300">
              ⚠️ This creates a brand-new TRC20 address. <strong>Move all funds from the old wallet first</strong> — the old address will no longer be used for incoming deposits/withdrawals.
            </p>
            <p className="text-dtx-muted text-xs">
              The new private key will be shown <strong>once</strong> — copy it into the <code>PLATFORM_TRON_PRIVATE_KEY</code> secret immediately.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setConfirmRegen(false)} className="flex-1 border-dtx-border text-foreground">Cancel</Button>
              <Button onClick={regenerate} className="flex-1 bg-dtx-loss text-white hover:bg-dtx-loss/90">Yes, regenerate</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!newKey} onOpenChange={(o) => !o && setNewKey(null)}>
        <DialogContent className="bg-dtx-panel border-dtx-border max-w-lg">
          <DialogHeader><DialogTitle className="text-foreground">Save this private key NOW</DialogTitle></DialogHeader>
          {newKey && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg p-3 bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                This key is shown once. Paste it into <code className="bg-black/30 px-1 rounded">PLATFORM_TRON_PRIVATE_KEY</code> secret immediately.
              </div>
              <div>
                <Label className="text-xs text-dtx-muted">Address</Label>
                <div className="flex gap-2 mt-1">
                  <code className="flex-1 text-xs font-mono text-foreground bg-dtx-bg p-2 rounded border border-dtx-border break-all">{newKey.address}</code>
                  <Button size="sm" variant="outline" onClick={() => copy(newKey.address)} className="border-dtx-border"><Copy className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-dtx-muted">Private key (64 hex)</Label>
                <div className="flex gap-2 mt-1">
                  <code className="flex-1 text-xs font-mono text-foreground bg-dtx-bg p-2 rounded border border-dtx-border break-all">{newKey.privateKey}</code>
                  <Button size="sm" variant="outline" onClick={() => copy(newKey.privateKey)} className="border-dtx-border"><Copy className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <Button onClick={() => setNewKey(null)} className="w-full bg-dtx-mint text-dtx-bg hover:bg-dtx-mint-bright font-bold">
                I have saved it — close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------------- Hot wallets grid ---------------- */

function HotWalletsGrid({ hot, cold, onRefreshOne, syncing }: {
  hot: ChainBalance[]; cold: ChainBalance[]; onRefreshOne: (chain: string) => Promise<void>; syncing: boolean;
}) {
  // Show one card per chain even if the row has no address yet
  const byChain = useMemo(() => {
    const map: Record<string, ChainBalance | null> = { TRC20: null, ERC20: null, BEP20: null, BTC: null };
    for (const w of hot) map[w.chain] = w;
    return map;
  }, [hot]);
  const coldByChain = useMemo(() => {
    const map: Record<string, string | null> = { TRC20: null, ERC20: null, BEP20: null, BTC: null };
    for (const w of cold) map[w.chain] = w.address;
    return map;
  }, [cold]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {CHAINS.map(chain => {
        const w = byChain[chain];
        const coldAddr = coldByChain[chain];
        return (
          <div key={chain} className="rounded-2xl p-4 bg-dtx-panel border border-dtx-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-dtx-mint" />
                <span className="font-bold text-foreground">{chain}</span>
                {w?.low_usdt && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">Low USDT</span>}
              </div>
              <Button size="sm" variant="outline" onClick={() => onRefreshOne(chain).catch(e => toast.error(e.message))} disabled={syncing}
                className="h-7 px-2 border-dtx-border">
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {w?.address ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <code className="text-[11px] text-dtx-muted font-mono truncate flex-1" title={w.address}>{w.address}</code>
                  <button onClick={() => copy(w.address!)} className="text-dtx-muted hover:text-dtx-mint shrink-0" title="Copy">
                    <Copy className="h-3 w-3" />
                  </button>
                  <a href={`${EXPLORER_ADDR[chain]}${w.address}`} target="_blank" rel="noopener noreferrer"
                    className="text-dtx-muted hover:text-dtx-mint shrink-0"><ExternalLink className="h-3 w-3" /></a>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg p-2.5 bg-dtx-bg border border-dtx-border/50">
                    <div className="text-[10px] uppercase tracking-widest text-dtx-muted">USDT</div>
                    <div className="text-lg font-bold text-foreground" style={{ fontFamily: "Space Mono, monospace" }}>
                      {chain === "BTC" ? "—" : `$${w.usdt.toFixed(2)}`}
                    </div>
                  </div>
                  <div className="rounded-lg p-2.5 bg-dtx-bg border border-dtx-border/50">
                    <div className="text-[10px] uppercase tracking-widest text-dtx-muted">{nativeLabel(chain)}</div>
                    <div className={`text-lg font-bold ${w.low_native ? "text-amber-400" : "text-foreground"}`}
                      style={{ fontFamily: "Space Mono, monospace" }}>
                      {w.native.toFixed(chain === "BTC" ? 6 : 4)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 gap-2">
                  <p className="text-[10px] text-dtx-muted">Synced {timeAgo(w.synced_at)}</p>
                  <SweepButton chain={chain} hotUsdt={w.usdt} coldAddr={coldAddr} onDone={() => onRefreshOne(chain)} />
                </div>
              </>
            ) : (
              <p className="text-[12px] text-amber-400/80 italic">
                No address set. {chain === "TRC20" ? "Use Generate / Sync above." : "Add via Cold Storage tab or use Generate / Sync."}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Sweep hot → cold ---------------- */

function SweepButton({ chain, hotUsdt, coldAddr, onDone }: {
  chain: string; hotUsdt: number; coldAddr: string | null; onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const supported = chain === "TRC20";
  const canSweep = supported && !!coldAddr && hotUsdt > 1;

  const run = async () => {
    setBusy(true);
    try {
      const { data, error } = await invokeAdminCasino<{
        success: boolean; tx_hash?: string; amount?: number; error?: string;
      }>({ action: "treasury_sweep", chain });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Sweep failed");
      toast.success(`Swept $${data.amount?.toFixed(2)} → cold · tx ${data.tx_hash?.slice(0, 10)}…`);
      setOpen(false);
      onDone();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };

  return (
    <>
      <Button
        size="sm" variant="outline"
        disabled={!canSweep}
        onClick={() => setOpen(true)}
        className="h-7 px-2 border-dtx-mint/40 text-dtx-mint hover:bg-dtx-mint/10 disabled:opacity-40"
        title={
          !supported ? `Sweep for ${chain} not yet supported`
          : !coldAddr ? "Configure a cold address first"
          : hotUsdt <= 1 ? "Nothing to sweep (below $1 dust)"
          : `Send ~$${(hotUsdt - 1).toFixed(2)} to cold storage`
        }
      >
        <ArrowUpFromLine className="h-3.5 w-3.5" />
        <span className="ml-1 text-[11px]">Sweep to cold</span>
      </Button>

      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="bg-dtx-panel border-dtx-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-dtx-mint" />
              Sweep {chain} hot → cold
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg p-3 bg-dtx-bg border border-dtx-border/50 space-y-1.5">
              <div className="flex justify-between"><span className="text-dtx-muted">Hot USDT</span>
                <span className="font-mono text-foreground">${hotUsdt.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-dtx-muted">Reserve (dust)</span>
                <span className="font-mono text-dtx-muted">$1.00</span></div>
              <div className="flex justify-between border-t border-dtx-border/40 pt-1.5">
                <span className="text-dtx-muted">Sending</span>
                <span className="font-mono font-bold text-dtx-mint">${Math.max(0, hotUsdt - 1).toFixed(2)}</span></div>
              <div className="flex justify-between pt-1">
                <span className="text-dtx-muted text-xs">To</span>
                <code className="text-[10px] text-foreground/80 truncate max-w-[220px]">{coldAddr}</code>
              </div>
            </div>
            <p className="text-[11px] text-amber-300/90">
              ⚠ Broadcasts an on-chain TRC20 USDT transfer. Requires ~15 TRX gas in the hot wallet. Cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}
                className="flex-1 border-dtx-border text-foreground">Cancel</Button>
              <Button onClick={run} disabled={busy}
                className="flex-1 bg-dtx-mint text-dtx-bg hover:bg-dtx-mint-bright font-bold">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm sweep"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------------- TRC20 funding guide ---------------- */

function TronFundingGuide({ tron }: { tron: ChainBalance }) {
  const trxLow = tron.native < 100;
  const usdtLow = tron.usdt < 20;
  return (
    <div className="rounded-2xl p-4 bg-dtx-panel border border-dtx-border">
      <h3 className="font-bold text-foreground flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-dtx-mint" /> TRC20 funding guide
      </h3>
      <p className="text-[12px] text-dtx-muted mb-3">
        TRX is required for gas (energy + bandwidth) when broadcasting USDT transfers. Fund this address with:
      </p>
      <ul className="text-xs text-foreground/80 list-disc pl-5 space-y-1 mb-3">
        <li>At least <strong>100 TRX</strong> for ~50 future transfers</li>
        <li>At least <strong>20 USDT</strong> to cover small withdrawals</li>
      </ul>
      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-lg p-3 border ${trxLow ? "bg-amber-500/10 border-amber-500/30" : "bg-dtx-bg border-dtx-border/50"}`}>
          <div className="text-[10px] uppercase tracking-widest text-dtx-muted">TRX balance</div>
          <div className={`text-lg font-bold ${trxLow ? "text-amber-300" : "text-foreground"}`}
            style={{ fontFamily: "Space Mono, monospace" }}>{tron.native.toFixed(4)}</div>
          {trxLow && <p className="text-[10px] text-amber-300 mt-1">⚠️ Below 100 TRX — refill needed</p>}
        </div>
        <div className={`rounded-lg p-3 border ${usdtLow ? "bg-amber-500/10 border-amber-500/30" : "bg-dtx-bg border-dtx-border/50"}`}>
          <div className="text-[10px] uppercase tracking-widest text-dtx-muted">USDT balance</div>
          <div className={`text-lg font-bold ${usdtLow ? "text-amber-300" : "text-foreground"}`}
            style={{ fontFamily: "Space Mono, monospace" }}>${tron.usdt.toFixed(2)}</div>
          {usdtLow && <p className="text-[10px] text-amber-300 mt-1">⚠️ Below $20 — top up</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- BSC (BEP20) treasury status — read-only ---------------- */

// Reveals the derived BEP20 hot-wallet address + live BNB/USDT balance via the
// existing admin-casino `bsc_treasury_status` action. Read-only: it never funds,
// broadcasts, or moves anything. The signing key is derived independently of
// platform_wallets, so there is no stored row to show — this is the canonical
// way to read the address before funding BNB gas for BEP20 withdrawals.
function BscTreasuryStatusCard() {
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<{ address: string; source: string; usdt: number; bnb: number } | null>(null);

  const check = async () => {
    setBusy(true);
    try {
      const { data, error } = await invokeAdminCasino<{
        success?: boolean; error?: string; address?: string; source?: string; usdt?: number; bnb?: number;
      }>({ action: "bsc_treasury_status" });
      if (error || !data?.success || !data.address) throw new Error(data?.error || error?.message || "Failed");
      setInfo({ address: data.address, source: data.source ?? "", usdt: Number(data.usdt ?? 0), bnb: Number(data.bnb ?? 0) });
    } catch (e: any) { toast.error(e.message ?? "Failed to load BSC treasury"); }
    setBusy(false);
  };

  const bnbLow = info ? info.bnb < 0.02 : false;

  return (
    <div className="rounded-2xl p-4 bg-dtx-panel border border-dtx-border">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-dtx-mint" /> BSC (BEP20) Treasury
          </h3>
          <p className="text-[11px] text-dtx-muted mt-0.5">
            Read-only. Reveals the derived BEP20 hot-wallet address (the same <code>0x…</code> address serves
            BEP20 &amp; ERC20) and its live BNB/USDT balance. Fund BNB for gas before enabling BEP20 withdrawals.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={check} disabled={busy} className="border-dtx-border text-dtx-mint">
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Check
        </Button>
      </div>

      {info && (
        <div className="mt-3 space-y-2">
          <div className="rounded-lg p-3 bg-dtx-bg border border-dtx-border/50">
            <div className="text-[10px] uppercase tracking-widest text-dtx-muted mb-1">
              Hot wallet address{info.source ? ` (${info.source})` : ""}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-foreground font-mono text-xs break-all">{info.address}</code>
              <button onClick={() => copy(info.address)} className="text-dtx-muted hover:text-foreground" aria-label="Copy address">
                <Copy className="h-3.5 w-3.5" />
              </button>
              <a href={`${EXPLORER_ADDR.BEP20}${info.address}`} target="_blank" rel="noreferrer"
                className="text-dtx-muted hover:text-foreground" aria-label="View on BscScan">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-lg p-3 border ${bnbLow ? "bg-amber-500/10 border-amber-500/30" : "bg-dtx-bg border-dtx-border/50"}`}>
              <div className="text-[10px] uppercase tracking-widest text-dtx-muted">BNB (gas)</div>
              <div className={`text-lg font-bold ${bnbLow ? "text-amber-300" : "text-foreground"}`}
                style={{ fontFamily: "Space Mono, monospace" }}>{info.bnb.toFixed(4)}</div>
              {bnbLow && <p className="text-[10px] text-amber-300 mt-1">⚠️ Below 0.02 BNB — fund gas</p>}
            </div>
            <div className="rounded-lg p-3 border bg-dtx-bg border-dtx-border/50">
              <div className="text-[10px] uppercase tracking-widest text-dtx-muted">USDT balance</div>
              <div className="text-lg font-bold text-foreground" style={{ fontFamily: "Space Mono, monospace" }}>
                ${info.usdt.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Cold wallets ---------------- */

function ColdWalletsCard({ cold, onChanged }: { cold: ChainBalance[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [chain, setChain] = useState<string>("TRC20");
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const total = cold.reduce((s, w) => s + (w.usdt || 0), 0);

  const add = async () => {
    const err = validateAddress(chain, address);
    if (err) return toast.error(err);
    setBusy(true);
    try {
      const { data, error } = await invokeAdminCasino<{ success?: boolean; error?: string }>(
        { action: "treasury_add_cold", chain, address: address.trim(), label: label.trim() });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Failed");
      toast.success("Cold wallet saved");
      setOpen(false); setAddress(""); setLabel("");
      onChanged();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };

  const clear = async (c: string) => {
    if (!confirm(`Clear ${c} cold wallet address?`)) return;
    try {
      const { data, error } = await invokeAdminCasino<{ success?: boolean; error?: string }>(
        { action: "treasury_clear_cold", chain: c });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Failed");
      toast.success("Cold wallet cleared");
      onChanged();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="rounded-2xl p-4 bg-dtx-panel border border-dtx-border">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-foreground flex items-center gap-2"><Shield className="h-4 w-4 text-cyan-400" /> Cold Storage</h3>
          <p className="text-[11px] text-dtx-muted mt-0.5">Total cold: <span className="text-cyan-300 font-mono">{fmtUsd(total)}</span></p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-dtx-mint text-dtx-bg hover:bg-dtx-mint-bright font-bold">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add cold wallet
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-dtx-panel border-dtx-border">
            <DialogHeader><DialogTitle className="text-foreground">Add cold wallet</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div>
                <Label className="text-xs text-dtx-muted">Chain</Label>
                <Select value={chain} onValueChange={setChain}>
                  <SelectTrigger className="bg-dtx-bg border-dtx-border text-foreground mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-dtx-panel border-dtx-border">
                    {CHAINS.map(c => <SelectItem key={c} value={c} className="text-foreground">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-dtx-muted">Address</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="Cold storage wallet address" className="bg-dtx-bg border-dtx-border text-foreground font-mono text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs text-dtx-muted">Label (optional)</Label>
                <Input value={label} onChange={e => setLabel(e.target.value)} maxLength={100}
                  placeholder="e.g. Trezor cold storage" className="bg-dtx-bg border-dtx-border text-foreground mt-1" />
              </div>
              <Button onClick={add} disabled={busy} className="w-full bg-dtx-mint text-dtx-bg hover:bg-dtx-mint-bright font-bold">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {cold.length === 0 ? (
          <p className="text-xs text-dtx-muted italic">No cold wallets configured.</p>
        ) : cold.map(w => (
          <div key={w.id} className="p-3 rounded-xl bg-dtx-bg border border-dtx-border/50">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground font-medium">{w.chain}</span>
                {w.label && <span className="text-[10px] text-dtx-muted">· {w.label}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold font-mono text-cyan-400">
                  {w.chain === "BTC" ? `${w.native.toFixed(6)} BTC` : fmtUsd(w.usdt)}
                </span>
                {w.address && (
                  <button onClick={() => clear(w.chain)} className="text-dtx-muted hover:text-dtx-loss" title="Clear">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            {w.address ? (
              <div className="flex items-center gap-2">
                <code className="text-[10px] text-dtx-muted font-mono truncate flex-1" title={w.address}>{w.address}</code>
                <button onClick={() => copy(w.address!)} className="text-dtx-muted hover:text-cyan-400 shrink-0"><Copy className="h-3 w-3" /></button>
                <a href={`${EXPLORER_ADDR[w.chain]}${w.address}`} target="_blank" rel="noopener noreferrer"
                  className="text-dtx-muted hover:text-cyan-400 shrink-0"><ExternalLink className="h-3 w-3" /></a>
              </div>
            ) : (
              <span className="text-[10px] text-dtx-muted italic">No address — click Add cold wallet</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Withdrawals queue ---------------- */

type PendingW = {
  id: string; tx_code: string; user_id: string; masked_email: string;
  chain: string; to_address: string; amount: number; fee: number;
  net_amount: number | null; status: string; tx_hash: string | null;
  review_note: string | null; created_at: string; processed_at: string | null;
};

function WithdrawalsQueueCard() {
  const [items, setItems] = useState<PendingW[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_pending_withdrawals_with_profile", { p_limit: 100 });
    if (error) toast.error(error.message);
    setItems((data ?? []) as PendingW[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel("treasury-wq")
      .on("postgres_changes", { event: "*", schema: "public", table: "crypto_withdrawals" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const approve = async (w: PendingW) => {
    if (!confirm(`Approve $${w.amount} to ${trunc(w.to_address)}?`)) return;
    setBusy(w.id);
    try {
      const { data, error } = await invokeAdminCasino<{ success?: boolean; error?: string }>(
        { action: "approve_withdrawal", withdrawal_id: w.id });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Failed");
      toast.success("Approved");
      load();
    } catch (e: any) { toast.error(e.message); }
    setBusy(null);
  };

  const reject = async (w: PendingW) => {
    const reason = prompt("Reject reason (refunded to user):", "Rejected by admin");
    if (reason === null) return;
    setBusy(w.id);
    try {
      const { data, error } = await invokeAdminCasino<{ success?: boolean; error?: string }>(
        { action: "reject_withdrawal", withdrawal_id: w.id, reason });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Failed");
      toast.success("Rejected & refunded");
      load();
    } catch (e: any) { toast.error(e.message); }
    setBusy(null);
  };

  const processAllSmall = async () => {
    const candidates = items.filter(i => i.status === "pending" && Number(i.amount) <= 50);
    if (candidates.length === 0) return toast.info("No pending withdrawals under $50");
    if (!confirm(`Auto-process ${candidates.length} withdrawals (each ≤ $50)?`)) return;
    setBatchRunning(true);
    setBatchTotal(candidates.length);
    setBatchProgress(0);
    try {
      const { data, error } = await invokeAdminCasino<{ success?: boolean; error?: string; processed?: number; failed?: number; total?: number }>(
        { action: "process_all_small_withdrawals", max_amount: 50 });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Failed");
      setBatchProgress(data?.total ?? candidates.length);
      toast.success(`Auto-processed ${data?.processed ?? 0} / ${data?.total ?? 0} (failed: ${data?.failed ?? 0})`);
      load();
    } catch (e: any) { toast.error(e.message); }
    setTimeout(() => setBatchRunning(false), 1500);
  };

  const pending = items.filter(i => i.status === "pending");
  const totalPending = pending.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-4 bg-dtx-panel border border-dtx-border flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-foreground flex items-center gap-2"><Wallet className="h-4 w-4 text-amber-400" /> Withdrawal Queue</h3>
          <p className="text-[11px] text-dtx-muted mt-0.5">{pending.length} pending · {fmtUsd(totalPending)} awaiting review</p>
        </div>
        <Button size="sm" onClick={processAllSmall} disabled={batchRunning || pending.length === 0}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
          {batchRunning ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Zap className="h-4 w-4 mr-1.5" />}
          Process all auto (≤$50)
        </Button>
      </div>

      {batchRunning && (
        <div className="rounded-xl p-3 bg-dtx-panel border border-dtx-border">
          <div className="flex items-center justify-between text-xs text-dtx-muted mb-1.5">
            <span>Processing batch…</span><span>{batchProgress} / {batchTotal}</span>
          </div>
          <Progress value={batchTotal > 0 ? (batchProgress / batchTotal) * 100 : 0} className="h-1.5" />
        </div>
      )}

      <div className="rounded-2xl border border-dtx-border overflow-hidden bg-dtx-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-dtx-muted text-[10px] uppercase tracking-wider border-b border-dtx-border">
                <th className="text-left p-3">Ref</th><th className="text-left p-3">User</th>
                <th className="text-left p-3">Chain</th><th className="text-left p-3">Address</th>
                <th className="text-right p-3">Amount</th><th className="text-center p-3">Status</th>
                <th className="text-right p-3">Age</th><th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-dtx-muted">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-dtx-muted">No withdrawals</td></tr>
              ) : items.map(w => (
                <tr key={w.id} className="border-b border-dtx-border/30 hover:bg-dtx-bg/40">
                  <td className="p-3 font-mono text-[11px] text-cyan-300/90 whitespace-nowrap">{w.tx_code}</td>
                  <td className="p-3 text-[11px] text-foreground/80">{w.masked_email}</td>
                  <td className="p-3 text-[11px] uppercase text-foreground/70">{w.chain}</td>
                  <td className="p-3 font-mono text-[11px] text-dtx-muted" title={w.to_address}>{trunc(w.to_address)}</td>
                  <td className="p-3 text-right font-mono font-bold text-foreground">${Number(w.amount).toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      w.status === "completed" ? "bg-dtx-win/15 text-dtx-win" :
                      w.status === "processing" ? "bg-cyan-500/15 text-cyan-300" :
                      w.status === "rejected" ? "bg-yellow-500/15 text-yellow-300" :
                      "bg-amber-500/15 text-amber-300"
                    }`}>{w.status}</span>
                  </td>
                  <td className="p-3 text-right font-mono text-[11px] text-dtx-muted">{timeAgo(w.created_at)}</td>
                  <td className="p-3 text-right">
                    {w.status === "pending" ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" disabled={busy === w.id} onClick={() => approve(w)}
                          className="h-7 px-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30">
                          {busy === w.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </Button>
                        <Button size="sm" disabled={busy === w.id} onClick={() => reject(w)}
                          className="h-7 px-2.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 border border-yellow-500/30">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : <span className="text-dtx-muted text-[10px]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------- History ---------------- */

type TxRow = {
  direction: "IN" | "OUT" | "OWNER";
  id: string; user_label: string; chain: string;
  amount: number; status: string; tx_hash: string | null; address: string; created_at: string;
};

function TreasuryHistory() {
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_treasury_recent_tx", { p_limit: 20 });
    if (error) toast.error(error.message);
    setRows((data ?? []) as TxRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel("treasury-hist")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "crypto_deposits" }, load)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "crypto_withdrawals" }, load)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "owner_withdrawals" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return (
    <div className="rounded-2xl border border-dtx-border overflow-hidden bg-dtx-panel">
      <div className="flex items-center justify-between p-4 border-b border-dtx-border">
        <h3 className="font-bold text-foreground">Recent transactions (last 20)</h3>
        <Button size="sm" variant="outline" onClick={load} className="border-dtx-border text-dtx-muted">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-dtx-muted text-[10px] uppercase tracking-wider border-b border-dtx-border">
              <th className="text-center p-3">Dir</th><th className="text-left p-3">User</th>
              <th className="text-left p-3">Chain</th><th className="text-right p-3">Amount</th>
              <th className="text-left p-3">Address</th><th className="text-center p-3">Status</th>
              <th className="text-left p-3">Tx</th><th className="text-right p-3">When</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center text-dtx-muted">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-dtx-muted">No transactions yet</td></tr>
            ) : rows.map(r => (
              <tr key={`${r.direction}-${r.id}`} className="border-b border-dtx-border/30">
                <td className="p-3 text-center">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    r.direction === "IN" ? "bg-emerald-500/15 text-emerald-300" :
                    r.direction === "OUT" ? "bg-amber-500/15 text-amber-300" :
                    "bg-cyan-500/15 text-cyan-300"
                  }`}>{r.direction}</span>
                </td>
                <td className="p-3 text-[11px] text-foreground/80">{r.user_label}</td>
                <td className="p-3 text-[11px] uppercase text-foreground/70">{r.chain}</td>
                <td className="p-3 text-right font-mono text-foreground">${Number(r.amount || 0).toFixed(2)}</td>
                <td className="p-3 font-mono text-[11px] text-dtx-muted">{trunc(r.address)}</td>
                <td className="p-3 text-center">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    r.status === "completed" || r.status === "confirmed" ? "bg-dtx-win/15 text-dtx-win" :
                    r.status === "pending" ? "bg-amber-500/15 text-amber-300" :
                    r.status === "rejected" || r.status === "failed" ? "bg-dtx-loss/15 text-dtx-loss" :
                    "bg-white/10 text-foreground/60"
                  }`}>{r.status}</span>
                </td>
                <td className="p-3 text-[11px]">
                  {r.tx_hash ? (
                    <a href={`${EXPLORER_TX[r.chain] || "#"}${r.tx_hash}`} target="_blank" rel="noopener noreferrer"
                      className="text-cyan-300 hover:underline font-mono inline-flex items-center gap-1">
                      {r.tx_hash.slice(0, 10)}…<ExternalLink className="h-3 w-3" />
                    </a>
                  ) : <span className="text-dtx-muted">—</span>}
                </td>
                <td className="p-3 text-right font-mono text-[11px] text-dtx-muted">{timeAgo(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Profit withdraw ---------------- */

function ProfitWithdrawCard({ available, onDone }: { available: number; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [chain, setChain] = useState("TRC20");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > available) return toast.error("Exceeds available profit");
    const err = validateAddress(chain, address);
    if (err) return toast.error(err);
    if (!confirm(`Withdraw ${fmtUsd(amt)} on ${chain} to ${trunc(address)} ?`)) return;
    setBusy(true); setError(null);
    try {
      const { data, error } = await invokeAdminCasino<{ success?: boolean; error?: string; tx_hash?: string }>(
        { action: "owner_withdraw", amount: amt, chain, to_address: address.trim() });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Failed");
      if (!data?.success) throw new Error("Withdrawal did not complete");
      toast.success(`Withdrawn · tx ${data.tx_hash?.slice(0, 12)}…`);
      setAmount(""); setAddress("");
      onDone();
    } catch (e: any) {
      setError(e.message);
      toast.error(e.message, { duration: 8000 });
    }
    setBusy(false);
  };

  const validation = address ? validateAddress(chain, address) : null;

  return (
    <div className="rounded-2xl p-5 bg-dtx-panel border border-dtx-border max-w-xl">
      <h3 className="font-bold text-foreground flex items-center gap-2 mb-3">
        <ArrowUpFromLine className="h-4 w-4 text-dtx-mint" /> Withdraw to Cold Storage
      </h3>
      <div className="rounded-xl p-3 mb-3 bg-dtx-bg border border-dtx-border/50 flex items-center justify-between">
        <span className="text-sm text-dtx-muted">Available profit</span>
        <span className="font-bold text-dtx-mint text-lg" style={{ fontFamily: "Space Mono, monospace" }}>{fmtUsd(available)}</span>
      </div>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-dtx-muted">Amount (USDT)</Label>
          <div className="flex gap-2 mt-1">
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
              className="bg-dtx-bg border-dtx-border text-foreground" />
            <Button type="button" variant="outline" onClick={() => setAmount(available.toFixed(2))}
              className="border-dtx-border text-dtx-mint">MAX</Button>
          </div>
        </div>
        <div>
          <Label className="text-xs text-dtx-muted">Network</Label>
          <Select value={chain} onValueChange={setChain}>
            <SelectTrigger className="bg-dtx-bg border-dtx-border text-foreground mt-1"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-dtx-panel border-dtx-border">
              {CHAINS.map(c => <SelectItem key={c} value={c} className="text-foreground">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-dtx-muted">Destination address</Label>
          <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Cold storage address"
            className="bg-dtx-bg border-dtx-border text-foreground font-mono text-xs mt-1" />
          {validation && <p className="text-[11px] text-dtx-loss mt-1">{validation}</p>}
        </div>
        {error && (
          <div className="rounded-xl p-3 bg-dtx-loss/10 border border-dtx-loss/40 text-[12px] text-dtx-loss flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /><div>{error}</div>
          </div>
        )}
        <Button onClick={submit} disabled={busy} className="w-full bg-dtx-mint text-dtx-bg hover:bg-dtx-mint-bright font-bold">
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowUpFromLine className="h-4 w-4 mr-2" />}
          Withdraw to cold storage
        </Button>
        <p className="text-[10px] text-dtx-muted text-center">
          Re-authenticates via admin PIN session · logged to <code>audit_logs</code> and <code>owner_withdrawals</code>
        </p>
      </div>
    </div>
  );
}

/* ---------------- Sweep user deposits → hot wallet (not deployed) ----------------
 * The automated deposit sweeper used to call an edge function
 * (`sweep-user-deposits-to-hot`) that does NOT exist in this repo or in the
 * deployed Supabase project — every click errored, and the old confirm dialog
 * named a hard-coded destination that is not the authoritative hot wallet.
 * Rather than ship a dead, misleading control, this renders an honest
 * "unavailable" state. A real deposit→hot sweeper is money-critical and will
 * be built + reviewed as its own change (gas dispense, HD-key signing,
 * per-run audit, correct TVwG9s destination) before any button goes live.
 * ------------------------------------------------------------------------- */
function SweepUserDepositsCard() {
  return (
    <div className="rounded-xl bg-dtx-panel border border-dtx-border p-4 space-y-2">
      <div className="flex items-start gap-2">
        <ArrowUpFromLine className="h-4 w-4 text-dtx-muted mt-0.5" />
        <div>
          <h3 className="font-bold text-foreground text-sm">Sweep User Deposits → Hot Wallet</h3>
          <p className="text-[11px] text-dtx-muted mt-0.5">
            Automated on-chain sweeping is <strong className="text-dtx-muted">not deployed</strong>.
          </p>
        </div>
      </div>
      <div className="rounded-md border border-dtx-border bg-dtx-bg/40 p-2.5 text-[11px] text-dtx-muted leading-relaxed">
        The one-click sweeper is intentionally disabled: it has no backing edge
        function, so it can move no funds. Consolidating customer-deposit USDT
        into the hot wallet is currently a <strong className="text-foreground">manual, verified</strong> operation.
        A reviewed, audited sweeper (gas dispense → signed transfers →
        authoritative hot-wallet destination) will replace this card as its own
        money-critical change.
      </div>
    </div>
  );
}

/* ------------- Dry-run Payout ------------- */
function DryRunPayoutCard() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("1");
  const [toAddr, setToAddr] = useState("");
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(toAddr.trim())) return toast.error("Enter a valid TRC20 address");
    setBusy(true);
    setResult(null);
    try {
      const { data, error } = await invokeAdmin<any>("dryrun-tron-payout", {
        amount: amt, to_address: toAddr.trim(),
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Dry-run failed");
      setResult(data);
      toast.success("✅ Signing works! TX not broadcast.");
    } catch (e: any) {
      toast.error(e.message ?? "Dry-run failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl bg-dtx-panel border border-dtx-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 text-amber-400" /> Dry-run Payout
          </h3>
          <p className="text-[11px] text-dtx-muted mt-0.5">
            Build + sign a TRC20 USDT transfer <strong className="text-amber-300">without broadcasting</strong>. Verifies signing key works.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="border-dtx-border text-amber-400">
              <Eye className="h-4 w-4 mr-1" /> Open
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-dtx-panel border-dtx-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-foreground">🔍 Dry-run TRC20 Payout</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-dtx-muted">Amount (USDT)</Label>
                <Input type="number" step="0.01" min="0.01" value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-dtx-bg border-dtx-border text-foreground mt-1" />
              </div>
              <div>
                <Label className="text-xs text-dtx-muted">To Address (TRC20)</Label>
                <Input placeholder="T..." value={toAddr}
                  onChange={(e) => setToAddr(e.target.value)}
                  className="bg-dtx-bg border-dtx-border text-foreground mt-1 font-mono text-xs" />
              </div>
              <Button onClick={run} disabled={busy}
                className="w-full bg-amber-500 text-black hover:bg-amber-400">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                Dry-run Payout
              </Button>

              {result && (
                <div className="rounded-md border border-dtx-mint/30 bg-dtx-mint/5 p-3 space-y-1.5 text-xs">
                  <p className="font-bold text-dtx-mint">✅ Signing works!</p>
                  <p className="text-dtx-muted">Would send <strong className="text-foreground">${result.amount_usdt} USDT</strong></p>
                  <p className="text-dtx-muted">From: <code className="text-foreground">{result.from}</code></p>
                  <p className="text-dtx-muted">To: <code className="text-foreground">{result.to}</code></p>
                  <p className="text-dtx-muted">TX ID: <code className="text-foreground font-mono">{result.txID?.slice(0, 16)}…</code></p>
                  <p className="text-dtx-muted">Signature: <code className="text-foreground font-mono text-[10px] break-all">{result.signature?.slice(0, 32)}…</code></p>
                  <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-2 text-amber-200 text-[11px] mt-2">
                    ⚠️ NOT broadcast — this was a dry run only.
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function HotToColdCard() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [last, setLast] = useState<{ tx_hash?: string; amount_usdt?: number; explorer?: string } | null>(null);

  const run = async (dry: boolean) => {
    setBusy(true);
    try {
      const { data, error } = await invokeAdmin<any>("sweep-hot-to-cold", {
        dry_run: dry, amount_usdt: amount ? Number(amount) : undefined,
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Failed");
      if (dry) {
        toast.success(`Would send $${data.would_send_usdt?.toFixed(2)} (hot bal: $${data.hot_balance?.toFixed(2)})`);
      } else {
        setLast(data);
        toast.success(`Sent $${data.amount_usdt?.toFixed(2)} to cold wallet`);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl bg-dtx-panel border border-dtx-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-dtx-gold" /> Hot → Cold (Ledger)
          </h3>
          <p className="text-[11px] text-dtx-muted mt-0.5">
            Move USDT from <code>TUfGd…Y1H3z</code> → <code>TA8ha…WG1e6</code> (Ledger).
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="border-dtx-border text-dtx-gold">
              <ArrowUpFromLine className="h-4 w-4 mr-1" /> Transfer
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-dtx-panel border-dtx-border max-w-md">
            <DialogHeader><DialogTitle className="text-foreground">Send hot → cold</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-dtx-muted">Amount USDT (blank = full hot balance)</Label>
                <Input type="number" step="0.01" min="0" value={amount}
                  onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 100"
                  className="bg-dtx-bg border-dtx-border text-foreground mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => run(true)} disabled={busy} variant="outline" className="border-dtx-border text-dtx-mint">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  Dry-run
                </Button>
                <Button onClick={() => {
                  if (!confirm(`Send ${amount ? `$${amount}` : "full hot balance"} USDT from hot to cold wallet?`)) return;
                  run(false);
                }} disabled={busy} className="bg-dtx-gold text-black hover:bg-dtx-gold/90">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
                  Send
                </Button>
              </div>
              {last?.tx_hash && (
                <div className="rounded-md border border-dtx-mint/30 bg-dtx-mint/5 p-2 text-[11px] space-y-1">
                  <div className="text-dtx-mint">✓ Sent ${last.amount_usdt?.toFixed(2)}</div>
                  <a href={last.explorer} target="_blank" rel="noreferrer" className="text-dtx-mint underline font-mono break-all">
                    {last.tx_hash}
                  </a>
                </div>
              )}
              <p className="text-[10px] text-dtx-muted">
                Requires admin PIN session. Logged to <code>owner_withdrawals</code> + <code>audit_logs</code>.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}


function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-dtx-border p-2">
      <div className="text-[10px] text-dtx-muted uppercase tracking-wider">{label}</div>
      <div className="text-sm font-bold text-foreground font-mono mt-0.5">{value}</div>
    </div>
  );
}

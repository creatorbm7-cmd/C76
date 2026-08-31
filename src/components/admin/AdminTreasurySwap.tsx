import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Repeat, ShieldAlert, Loader2, ArrowRight, Download, RotateCcw, Lock, Info,
} from "lucide-react";
import {
  assetDecimals, computeReceived, rateFromPeg, validateSwapInput, fmtAmount,
  swapsToCsv, type SwapRow,
} from "@/lib/treasurySwap";

// Owner-only, treasury-only. This panel NEVER touches user wallets or customer
// funds — it moves value only between the platform's own treasury accounts via
// the append-only double-entry ledger (admin_treasury_swap / _reverse RPCs).

interface Account { account_id: string; asset: string; kind: string; decimals: number; max_swap: number; is_active: boolean; }
interface Balance { account_id: string; asset: string; balance: number; }

const rpc = (name: string, args: Record<string, unknown>) =>
  (supabase.rpc as unknown as (n: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(name, args);

// The treasury_* tables/views ship in this migration, so they are not yet in the
// generated Supabase types. Route their reads through a thin casted builder
// (same approach the rest of the admin console uses for newer tables).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => (supabase.from as unknown as (t: string) => any)(table);

export default function AdminTreasurySwap() {
  const [isOwner, setIsOwner] = useState<boolean | null>(null);

  useEffect(() => {
    rpc("is_owner", {}).then(({ data }) => setIsOwner(data === true)).catch(() => setIsOwner(false));
  }, []);

  if (isOwner === null) {
    return <div className="p-8 text-center text-dtx-muted"><Loader2 className="h-5 w-5 animate-spin inline" /> Checking access…</div>;
  }
  if (!isOwner) {
    return (
      <div className="max-w-lg mx-auto mt-10 rounded-2xl p-6 bg-dtx-panel border border-dtx-border text-center">
        <Lock className="h-8 w-8 text-amber-400 mx-auto mb-3" />
        <h2 className="font-bold text-foreground text-lg">Owner access required</h2>
        <p className="text-sm text-dtx-muted mt-2">
          The C74 Treasury Swap is restricted to the platform owner. Your account does not carry the <code>owner</code> role.
        </p>
      </div>
    );
  }

  return <TreasurySwapConsole />;
}

function TreasurySwapConsole() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [energyUsd, setEnergyUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadState = useCallback(async () => {
    setLoading(true);
    const [acc, bal, peg] = await Promise.all([
      db("treasury_accounts").select("*").eq("is_active", true),
      db("treasury_balances").select("*"),
      db("platform_settings").select("value").eq("key", "energy_usd").maybeSingle(),
    ]);
    setAccounts((acc.data ?? []) as Account[]);
    const bmap: Record<string, number> = {};
    for (const b of (bal.data ?? []) as Balance[]) bmap[b.account_id] = Number(b.balance);
    setBalances(bmap);
    const pv = (peg.data as { value?: unknown } | null)?.value;
    const n = typeof pv === "string" ? parseFloat(pv) : Number(pv);
    setEnergyUsd(Number.isFinite(n) && n > 0 ? n : null);
    setLoading(false);
  }, []);

  useEffect(() => { loadState(); }, [loadState]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold text-foreground text-lg flex items-center gap-2">
          <Repeat className="h-5 w-5 text-dtx-mint" /> C74 Treasury Swap
        </h2>
        <p className="text-[11px] text-dtx-muted mt-0.5">
          Owner-only · treasury-to-treasury conversions on an append-only double-entry ledger · isolated from user wallets
        </p>
      </div>

      <Tabs defaultValue="swap" className="w-full">
        <TabsList className="bg-dtx-panel border border-dtx-border">
          <TabsTrigger value="swap">Swap</TabsTrigger>
          <TabsTrigger value="history">Swap History</TabsTrigger>
        </TabsList>
        <TabsContent value="swap" className="mt-4">
          <SwapForm accounts={accounts} balances={balances} energyUsd={energyUsd} loading={loading} onDone={loadState} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <SwapHistory onReversed={loadState} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------- Swap form ------------------------------- */

function SwapForm({ accounts, balances, energyUsd, loading, onDone }: {
  accounts: Account[]; balances: Record<string, number>; energyUsd: number | null; loading: boolean; onDone: () => void;
}) {
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [rateEdited, setRateEdited] = useState(false);
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const from = accounts.find((a) => a.account_id === fromAccount);
  const to = accounts.find((a) => a.account_id === toAccount);

  // Prefill the rate from the energy_usd peg (D3). Editing it flips to manual.
  const pegRate = energyUsd ? rateFromPeg(energyUsd) : NaN;
  useEffect(() => {
    if (!rateEdited && Number.isFinite(pegRate)) setRate(String(pegRate));
  }, [pegRate, rateEdited]);
  const rateSource = rateEdited ? "manual" : (energyUsd ? "peg:energy_usd" : "manual");

  const gross = parseFloat(amount);
  const rateNum = parseFloat(rate);
  const received = to ? computeReceived(gross, rateNum, to.asset) : NaN;
  const validation = validateSwapInput({ fromAccount, toAccount, gross, rate: rateNum, maxSwap: from?.max_swap });

  const fromBal = fromAccount ? balances[fromAccount] ?? 0 : 0;
  const toBal = toAccount ? balances[toAccount] ?? 0 : 0;
  const insufficient = validation.ok && gross > fromBal;

  const execute = async () => {
    setBusy(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const { data, error } = await rpc("admin_treasury_swap", {
        p_from_account: fromAccount,
        p_to_account: toAccount,
        p_gross_amount: gross,
        p_conversion_rate: rateNum,
        p_reason: reason.trim(),
        p_idempotency_key: idempotencyKey,
        p_rate_source: rateSource,
        p_rate_version: energyUsd ? `energy_usd=${energyUsd}` : null,
        p_quoted_at: new Date().toISOString(),
        p_reference: reference.trim() || null,
      });
      if (error) throw new Error(error.message);
      const res = data as { swap_id?: string; received_amount?: number; idempotent_replay?: boolean };
      toast.success(res?.idempotent_replay
        ? "Duplicate request — existing swap returned (no double swap)"
        : `Swap complete · ${fmtAmount(Number(res?.received_amount), to?.asset ?? "")} ${to?.asset} received`);
      setConfirmOpen(false);
      setAmount(""); setReason(""); setReference("");
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  };

  if (loading) return <div className="p-8 text-center text-dtx-muted"><Loader2 className="h-5 w-5 animate-spin inline" /> Loading treasury…</div>;

  return (
    <div className="max-w-xl rounded-2xl p-5 bg-dtx-panel border border-dtx-border space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-dtx-muted">From account</Label>
          <Select value={fromAccount} onValueChange={setFromAccount}>
            <SelectTrigger className="bg-dtx-bg border-dtx-border text-foreground mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent className="bg-dtx-panel border-dtx-border">
              {accounts.map((a) => <SelectItem key={a.account_id} value={a.account_id} className="text-foreground">{a.account_id} ({a.asset})</SelectItem>)}
            </SelectContent>
          </Select>
          {fromAccount && <p className="text-[10px] text-dtx-muted mt-1">Balance: <span className="font-mono text-foreground">{fmtAmount(fromBal, from?.asset ?? "")}</span> {from?.asset}</p>}
        </div>
        <div>
          <Label className="text-xs text-dtx-muted">To account</Label>
          <Select value={toAccount} onValueChange={setToAccount}>
            <SelectTrigger className="bg-dtx-bg border-dtx-border text-foreground mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent className="bg-dtx-panel border-dtx-border">
              {accounts.filter((a) => a.account_id !== fromAccount).map((a) => <SelectItem key={a.account_id} value={a.account_id} className="text-foreground">{a.account_id} ({a.asset})</SelectItem>)}
            </SelectContent>
          </Select>
          {toAccount && <p className="text-[10px] text-dtx-muted mt-1">Balance: <span className="font-mono text-foreground">{fmtAmount(toBal, to?.asset ?? "")}</span> {to?.asset}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-dtx-muted">Amount ({from?.asset ?? "—"})</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
            className="bg-dtx-bg border-dtx-border text-foreground mt-1 font-mono" />
        </div>
        <div>
          <Label className="text-xs text-dtx-muted flex items-center gap-1">
            Conversion rate
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${rateEdited ? "bg-amber-500/15 text-amber-300" : "bg-dtx-mint/15 text-dtx-mint"}`}>
              {rateSource}
            </span>
          </Label>
          <Input type="number" value={rate} onChange={(e) => { setRate(e.target.value); setRateEdited(true); }} placeholder="rate"
            className="bg-dtx-bg border-dtx-border text-foreground mt-1 font-mono" />
        </div>
      </div>

      <div className="rounded-xl p-3 bg-dtx-bg border border-dtx-border/50 flex items-center justify-between">
        <span className="text-sm text-dtx-muted">You'll receive</span>
        <span className="font-bold text-dtx-mint text-lg font-mono">
          {Number.isFinite(received) ? `${fmtAmount(received, to?.asset ?? "")} ${to?.asset ?? ""}` : "—"}
        </span>
      </div>

      <div>
        <Label className="text-xs text-dtx-muted">Reason <span className="text-dtx-loss">*</span></Label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={280}
          placeholder="Why is this swap being made?" className="bg-dtx-bg border-dtx-border text-foreground mt-1" />
      </div>
      <div>
        <Label className="text-xs text-dtx-muted">Transaction reference (optional)</Label>
        <Input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={140}
          placeholder="external ref / note" className="bg-dtx-bg border-dtx-border text-foreground mt-1" />
      </div>

      {!validation.ok && (amount || rate) && <p className="text-[11px] text-dtx-loss">{validation.error}</p>}
      {insufficient && <p className="text-[11px] text-dtx-loss">Insufficient balance in {fromAccount}</p>}

      <Button
        disabled={!validation.ok || insufficient || !reason.trim() || busy}
        onClick={() => setConfirmOpen(true)}
        className="w-full bg-dtx-mint text-dtx-bg hover:bg-dtx-mint-bright font-bold">
        <Repeat className="h-4 w-4 mr-2" /> Review swap
      </Button>

      <Dialog open={confirmOpen} onOpenChange={(o) => !busy && setConfirmOpen(o)}>
        <DialogContent className="bg-dtx-panel border-dtx-border max-w-md">
          <DialogHeader><DialogTitle className="text-foreground flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400" /> Confirm treasury swap
          </DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg p-3 bg-dtx-bg border border-dtx-border/50 space-y-1.5">
              <Row k="Direction" v={<span className="flex items-center gap-1.5 font-mono text-foreground">{fromAccount} <ArrowRight className="h-3 w-3" /> {toAccount}</span>} />
              <Row k="Gross" v={`${fmtAmount(gross, from?.asset ?? "")} ${from?.asset}`} />
              <Row k="Rate" v={`${rate} (${rateSource})`} />
              <Row k="Received" v={<span className="text-dtx-mint font-bold">{fmtAmount(received, to?.asset ?? "")} {to?.asset}</span>} />
              <div className="border-t border-dtx-border/40 pt-1.5" />
              <Row k={`${fromAccount} balance`} v={`${fmtAmount(fromBal, from?.asset ?? "")} → ${fmtAmount(fromBal - gross, from?.asset ?? "")}`} />
              <Row k={`${toAccount} balance`} v={`${fmtAmount(toBal, to?.asset ?? "")} → ${fmtAmount(toBal + received, to?.asset ?? "")}`} />
            </div>
            <p className="text-[11px] text-amber-300/90 flex gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              This is irreversible except by a compensating reversal (which is fully audited). User wallets are never affected.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={busy} onClick={() => setConfirmOpen(false)} className="flex-1 border-dtx-border text-foreground">Cancel</Button>
              <Button onClick={execute} disabled={busy} className="flex-1 bg-dtx-mint text-dtx-bg hover:bg-dtx-mint-bright font-bold">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & execute"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-3"><span className="text-dtx-muted">{k}</span><span className="text-foreground text-right">{v}</span></div>;
}

/* ------------------------------ Swap history ----------------------------- */

function SwapHistory({ onReversed }: { onReversed: () => void }) {
  const [rows, setRows] = useState<SwapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fAsset, setFAsset] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fType, setFType] = useState("all");
  const [reverseTarget, setReverseTarget] = useState<SwapRow | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db("treasury_swaps_view")
      .select("*").order("created_at", { ascending: false }).limit(500);
    if (error) toast.error(error.message);
    setRows((data ?? []) as SwapRow[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => rows.filter((r) =>
    (fAsset === "all" || r.from_account?.includes(fAsset) || r.to_account?.includes(fAsset)) &&
    (fStatus === "all" || r.display_status === fStatus) &&
    (fType === "all" || r.reference_type === fType)
  ), [rows, fAsset, fStatus, fType]);

  const exportCsv = () => {
    const blob = new Blob([swapsToCsv(filtered)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `treasury-swaps-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const doReverse = async () => {
    if (!reverseTarget || !reverseReason.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await rpc("admin_treasury_reverse", {
        p_journal_id: reverseTarget.journal_id,
        p_reason: reverseReason.trim(),
        p_idempotency_key: crypto.randomUUID(),
      });
      if (error) throw new Error(error.message);
      const res = data as { idempotent_replay?: boolean };
      toast.success(res?.idempotent_replay ? "Already reversed" : "Swap reversed (compensating journal posted)");
      setReverseTarget(null); setReverseReason("");
      load(); onReversed();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <Filter label="Asset" value={fAsset} onChange={setFAsset} options={["all", "USDT", "C74"]} />
        <Filter label="Status" value={fStatus} onChange={setFStatus} options={["all", "completed", "reversed"]} />
        <Filter label="Type" value={fType} onChange={setFType} options={["all", "manual_swap", "reversal"]} />
        <Button size="sm" variant="outline" onClick={exportCsv} className="border-dtx-border text-dtx-mint ml-auto">
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="rounded-2xl border border-dtx-border overflow-hidden bg-dtx-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-dtx-muted text-[10px] uppercase tracking-wider border-b border-dtx-border">
                <th className="text-left p-3">Time</th><th className="text-left p-3">Type</th>
                <th className="text-left p-3">Direction</th><th className="text-right p-3">Gross</th>
                <th className="text-right p-3">Rate</th><th className="text-right p-3">Received</th>
                <th className="text-center p-3">Status</th><th className="text-right p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-dtx-muted">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-dtx-muted">No swaps</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.journal_id} className="border-b border-dtx-border/30 hover:bg-dtx-bg/40">
                  <td className="p-3 text-[11px] text-dtx-muted whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3 text-[11px] text-foreground/70">{r.reference_type}</td>
                  <td className="p-3 text-[11px] font-mono text-foreground/80">{r.from_account} → {r.to_account}</td>
                  <td className="p-3 text-right font-mono text-foreground">{String(r.gross_amount)}</td>
                  <td className="p-3 text-right font-mono text-dtx-muted">{String(r.conversion_rate)}</td>
                  <td className="p-3 text-right font-mono text-foreground">{String(r.received_amount)}</td>
                  <td className="p-3 text-center">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      r.display_status === "reversed" ? "bg-amber-500/15 text-amber-300" : "bg-dtx-win/15 text-dtx-win"
                    }`}>{r.display_status}</span>
                  </td>
                  <td className="p-3 text-right">
                    {r.reference_type === "manual_swap" && r.display_status === "completed" ? (
                      <Button size="sm" variant="outline" onClick={() => setReverseTarget(r)}
                        className="h-7 px-2 border-amber-500/40 text-amber-300 hover:bg-amber-500/10">
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reverse
                      </Button>
                    ) : <span className="text-dtx-muted text-[10px]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!reverseTarget} onOpenChange={(o) => !busy && !o && setReverseTarget(null)}>
        <DialogContent className="bg-dtx-panel border-dtx-border max-w-md">
          <DialogHeader><DialogTitle className="text-foreground flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-400" /> Reverse swap
          </DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-[12px] text-dtx-muted">
              A new compensating journal will be posted (the original record is never modified). This returns
              {reverseTarget && <span className="font-mono text-foreground"> {String(reverseTarget.gross_amount)} </span>}
              to {reverseTarget?.from_account} and removes the received amount from {reverseTarget?.to_account}.
            </p>
            <div>
              <Label className="text-xs text-dtx-muted">Reversal reason <span className="text-dtx-loss">*</span></Label>
              <Input value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} maxLength={280}
                placeholder="Why is this being reversed?" className="bg-dtx-bg border-dtx-border text-foreground mt-1" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" disabled={busy} onClick={() => setReverseTarget(null)} className="flex-1 border-dtx-border text-foreground">Cancel</Button>
              <Button onClick={doReverse} disabled={busy || !reverseReason.trim()} className="flex-1 bg-amber-500 text-black hover:bg-amber-600 font-bold">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm reversal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <Label className="text-[10px] text-dtx-muted">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-dtx-bg border-dtx-border text-foreground mt-1 h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-dtx-panel border-dtx-border">
          {options.map((o) => <SelectItem key={o} value={o} className="text-foreground text-xs">{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

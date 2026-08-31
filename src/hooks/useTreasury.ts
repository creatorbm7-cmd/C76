import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeAdminCasino } from "@/lib/adminApi";

export type ChainBalance = {
  id: string;
  chain: string;
  wallet_type: "hot" | "cold";
  address: string | null;
  label: string | null;
  usdt: number;
  native: number;
  native_min: number;
  low_usdt: boolean;
  low_native: boolean;
  synced_at: string;
};

export type TreasurySummary = {
  total_hot: number;
  total_cold: number;
  total_platform_funds: number;
  total_user_balances: number;
  pending_withdrawals: number;
  available_profit: number;
};

const NATIVE_LABEL: Record<string, string> = {
  TRC20: "TRX", ERC20: "ETH", BEP20: "BNB", BTC: "BTC",
};

export function nativeLabel(chain: string) {
  return NATIVE_LABEL[chain] ?? chain;
}

export function useTreasury() {
  const [summary, setSummary] = useState<TreasurySummary | null>(null);
  const [balances, setBalances] = useState<ChainBalance[]>([]);
  const [lastSync, setLastSync] = useState<number>(0);
  const [syncing, setSyncing] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const syncing_ref = useRef(false);

  const loadSummary = useCallback(async () => {
    const { data } = await supabase.from("treasury_summary").select("*").single();
    if (data) {
      setSummary({
        total_hot: Number(data.total_hot),
        total_cold: Number(data.total_cold),
        total_platform_funds: Number(data.total_platform_funds),
        total_user_balances: Number(data.total_user_balances),
        pending_withdrawals: Number(data.pending_withdrawals),
        available_profit: Number(data.available_profit),
      });
    }
    setLoadingSummary(false);
  }, []);

  // Returns true only when a sync actually ran to completion; false when it was
  // skipped because one was already in flight. Throws on failure/timeout so the
  // caller can surface the real error instead of a false success.
  const syncBalances = useCallback(async (chain?: string): Promise<boolean> => {
    if (syncing_ref.current) return false;
    syncing_ref.current = true;
    setSyncing(true);
    try {
      // A hung request must never wedge the guard: race the invoke against a
      // 20s timeout so the promise ALWAYS settles and `finally` always resets
      // syncing_ref/syncing. (Previously a request that never resolved left the
      // guard stuck true, silently no-oping every later Sync click + auto-refresh.)
      const invokePromise = supabase.functions.invoke<{
        ok: boolean; results: ChainBalance[]; error?: string;
      }>("treasury-balances", { body: chain ? { chain } : {} });
      invokePromise.catch(() => {}); // swallow a late rejection if the timeout wins first
      const { data, error } = await Promise.race([
        invokePromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Sync timed out — check your connection and retry")), 20_000)),
      ]);
      if (error || !data?.ok) throw new Error(data?.error || error?.message || "Sync failed");
      setBalances(prev => {
        if (chain) {
          const updated = data.results;
          const others = prev.filter(p => !updated.find(u => u.id === p.id));
          return [...others, ...updated].sort((a, b) =>
            a.wallet_type.localeCompare(b.wallet_type) || a.chain.localeCompare(b.chain));
        }
        return data.results;
      });
      setLastSync(Date.now());
      await loadSummary();
      return true;
    } finally {
      syncing_ref.current = false;
      setSyncing(false);
    }
  }, [loadSummary]);

  useEffect(() => {
    loadSummary();
    syncBalances().catch(() => {});
    const id = setInterval(() => syncBalances().catch(() => {}), 30_000);

    const ch = supabase
      .channel("treasury-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "crypto_withdrawals" }, loadSummary)
      .on("postgres_changes", { event: "*", schema: "public", table: "casino_wallets" }, loadSummary)
      .on("postgres_changes", { event: "*", schema: "public", table: "owner_withdrawals" }, loadSummary)
      .subscribe();

    return () => { clearInterval(id); supabase.removeChannel(ch); };
  }, [loadSummary, syncBalances]);

  const generateTron = useCallback(async () => {
    return await invokeAdminCasino<{ success?: boolean; address?: string; error?: string }>({
      action: "treasury_sync_tron",
    });
  }, []);

  return {
    summary, balances, lastSync, syncing, loadingSummary,
    syncBalances, loadSummary, generateTron,
  };
}

/**
 * useMining — C74 Play Mining status (server-computed, display-only).
 *
 * Reads the `get_mining_status()` RPC (SECURITY DEFINER, owner-scoped). Play
 * Mining is a gamified play-to-earn layer over the C74 energy engine: wagering
 * "mines" C74, with a daily cap, VIP multiplier, and streak bonus. This hook
 * never writes. Refreshes on mount, on focus, and on the shared
 * `dtx:balance-updated` event (fired after a bet settles).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MiningStatus {
  balance: number;
  today_mined: number;
  daily_cap: number;
  remaining: number;
  progress_pct: number;
  lifetime: number;
  vip_mult: number;
  streak_days: number;
  level_idx: number;
  level_name: string;
  level_icon: string;
  level_next_at: number | null;
}

// The four mining ranks (mirrors public.c74_mining_level()).
export const MINING_LEVELS = [
  { idx: 0, name: 'Bronze Miner',  icon: '🥉', at: 0 },
  { idx: 1, name: 'Silver Miner',  icon: '🥈', at: 2500 },
  { idx: 2, name: 'Gold Miner',    icon: '🥇', at: 10000 },
  { idx: 3, name: 'Diamond Miner', icon: '💎', at: 50000 },
];

export function useMining() {
  const [status, setStatus] = useState<MiningStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await (supabase.rpc as any)('get_mining_status');
      if (res.error) throw res.error;
      const s = res.data as MiningStatus | { error: string } | null;
      if (!s || 'error' in s) throw new Error((s && 'error' in s && s.error) || 'no mining status');
      setStatus(s);
      setError(false);
    } catch {
      // Surface the failure (see `error`) rather than silently showing default
      // zeros as if they were a real empty account. Any good prior state is kept.
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    const onBal = () => load();
    window.addEventListener('focus', onFocus);
    window.addEventListener('dtx:balance-updated', onBal as EventListener);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('dtx:balance-updated', onBal as EventListener);
    };
  }, [load]);

  return { status, loading, error, reload: load };
}

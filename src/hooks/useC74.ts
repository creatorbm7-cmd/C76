/**
 * useC74 — the player's C74 rewards wallet (server-computed).
 *
 * Reads the `get_c74_summary()` and `get_c74_history()` RPCs (SECURITY DEFINER,
 * owner-only). C74 is the platform's internal rewards ledger — earned by
 * wagering and depositing, spent to cover withdrawal network fees. This hook is
 * DISPLAY-ONLY and never writes. It surfaces the existing "energy" engine under
 * the C74 brand. Refreshes on mount, on focus, and on the shared
 * `dtx:balance-updated` event (fired after a bet settles / deposit credits).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface C74Config {
  wager_earn_per_usdt: number;
  deposit_earn_per_usdt: number;
  usdt_per_c74: number;
  c74_per_usdt: number;
  fee_cover_cap: number;
  gas_enabled: boolean;
  wheel_cost: number;
  referral_reward: number;
  daily_reward: number;
}

export interface C74Summary {
  balance: number;
  total_earned: number;
  total_spent: number;
  earned_by_source: Record<string, number>;
  tier: string;
  coverable_fee_usdt: number;
  fee_saved_usdt_approx: number;
  config: C74Config;
}

export interface C74Entry {
  id: number;
  created_at: string;
  kind: string;
  label: string;
  direction: 'earn' | 'spend';
  amount: number;
}

// 8-level brand ladder icons (mirrors public.c74_tier()).
const TIER_ICON: Record<string, string> = {
  Spark: '✨', Bronze: '🥉', Silver: '🥈', Gold: '🥇',
  Platinum: '💠', Diamond: '💎', Elite: '👑', Creator: '🎬',
};
export const c74TierIcon = (tier: string) => TIER_ICON[tier] ?? '✨';

export function useC74() {
  const [summary, setSummary] = useState<C74Summary | null>(null);
  const [history, setHistory] = useState<C74Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const [sumRes, histRes] = await Promise.all([
        (supabase.rpc as any)('get_c74_summary'),
        (supabase.rpc as any)('get_c74_history', { p_limit: 25, p_offset: 0 }),
      ]);
      if (sumRes.error) throw sumRes.error;
      const s = sumRes.data as C74Summary | null;
      if (!s) throw new Error('no c74 summary');
      setSummary(s);
      setError(false);
      if (!histRes.error && Array.isArray(histRes.data)) {
        setHistory(histRes.data as C74Entry[]);
      }
    } catch {
      // Surface the failure (see `error`) rather than rendering default zeros as
      // if they were a real empty balance. Any good prior state is kept.
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

  return { summary, history, loading, error, reload: load };
}

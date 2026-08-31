/**
 * useReputation — C74 Reputation score (server-computed, read-only).
 *
 * Reads get_c74_reputation() (SECURITY DEFINER). Reputation is a trust & loyalty
 * score derived from real behaviour (tenure, KYC, play, deposits, streak, account
 * security, standing). No writes. Refreshes on mount, focus, and the shared
 * `dtx:balance-updated` event.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RepFactor {
  key: string; label: string; pts: number; max: number; icon: string; detail: string;
}
export interface Reputation {
  score: number; max: number;
  tier: string; tier_idx: number; tier_icon: string; next_at: number | null;
  kyc_status: string; age_days: number;
  factors: RepFactor[];
}

export const REP_TIERS = [
  { idx: 0, name: 'Newcomer', icon: '🌱', at: 0 },
  { idx: 1, name: 'Trusted',  icon: '⭐', at: 200 },
  { idx: 2, name: 'Veteran',  icon: '🛡️', at: 450 },
  { idx: 3, name: 'Elite',    icon: '💎', at: 700 },
  { idx: 4, name: 'Legend',   icon: '👑', at: 900 },
];

// Aspirational perks per tier (display; maps to real limits/airdrop weight later).
export const REP_PERKS: Record<number, string[]> = {
  0: ['Standard withdrawal limits', 'Basic support'],
  1: ['Higher withdrawal limits', 'Priority auto-payout', 'Exclusive events'],
  2: ['Faster payouts', 'VIP multiplier boost', 'Early feature access'],
  3: ['Premium withdrawal limits', 'Dedicated support', 'Token airdrop weight ↑'],
  4: ['Max limits & instant payouts', 'Governance voice', 'Top airdrop allocation'],
};

export function useReputation() {
  const [rep, setRep] = useState<Reputation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await (supabase.rpc as any)('get_c74_reputation');
      if (res.error) throw res.error;
      const r = res.data as Reputation | { error: string } | null;
      if (!r || 'error' in r) throw new Error((r && 'error' in r && r.error) || 'no reputation');
      setRep(r);
      setError(false);
    } catch {
      // Surface the failure (see `error`) rather than showing a default 0/1000
      // "Newcomer" as if it were real. Any good prior state is kept.
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

  return { rep, loading, error, reload: load };
}

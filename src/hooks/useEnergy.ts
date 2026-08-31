/**
 * useEnergy — the player's C7 Energy (server-computed from wagering).
 *
 * Reads the `get_my_energy()` RPC (SECURITY DEFINER, RLS owner-only). Energy is
 * accrued server-side by the casino_bets trigger — this hook is display-only and
 * never writes. Refreshes on mount, on focus, and on the shared
 * `dtx:balance-updated` event (fired after a bet settles).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EnergyState {
  points: number;
  burned: number;
  tier: string;
  tierMin: number;
  tierMax: number;
  progress: number; // 0–100 within the current tier
}

const TIER_ICON: Record<string, string> = {
  SPARK: '✨', CHARGED: '🔋', SURGE: '⚡', OVERDRIVE: '🌩️', MAX: '💎',
};
export const energyIcon = (tier: string) => TIER_ICON[tier] ?? '⚡';

export function useEnergy() {
  const [energy, setEnergy] = useState<EnergyState | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_energy');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setEnergy({
          points: Number(row.energy_points ?? 0),
          burned: Number(row.energy_burned ?? 0),
          tier: String(row.tier ?? 'SPARK'),
          tierMin: Number(row.tier_min ?? 0),
          tierMax: Number(row.tier_max ?? 1000),
          progress: Number(row.progress ?? 0),
        });
      } else {
        setEnergy({ points: 0, burned: 0, tier: 'SPARK', tierMin: 0, tierMax: 1000, progress: 0 });
      }
    } catch {
      // display-only: on failure keep null (meter hides gracefully)
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

  return { energy, loading, reload: load };
}

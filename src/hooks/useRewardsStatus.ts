// useRewardsStatus — lightweight live status for the C74 Token Center Rewards Hub.
//
// Best-effort, DISPLAY-ONLY: reads the same server RPCs the reward pages use
// (`c74_free_spin_status`, `get_missions`) so the hub can show real badges
// ("Ready", "N to claim") without re-implementing any reward logic. Every field
// is nullable and fails soft — on any error the hub simply hides that badge.
// Auth-gated pages only (the RPCs are owner-scoped).
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RewardsStatus {
  dailyAvailable: boolean | null;
  dailyNextAt: string | null;
  missionsClaimable: number | null;
  missionsTotal: number | null;
}

const EMPTY: RewardsStatus = {
  dailyAvailable: null, dailyNextAt: null, missionsClaimable: null, missionsTotal: null,
};

export function useRewardsStatus(): RewardsStatus {
  const [status, setStatus] = useState<RewardsStatus>(EMPTY);

  useEffect(() => {
    let active = true;
    (async () => {
      const [spin, missions] = await Promise.all([
        (supabase.rpc as any)('c74_free_spin_status').then((r: any) => r).catch(() => ({ data: null })),
        (supabase.rpc as any)('get_missions').then((r: any) => r).catch(() => ({ data: null })),
      ]);
      if (!active) return;
      const next: RewardsStatus = { ...EMPTY };
      const s = spin?.data;
      if (s && typeof s === 'object') {
        next.dailyAvailable = Boolean(s.available);
        next.dailyNextAt = s.next_at ?? null;
      }
      const m = missions?.data;
      if (Array.isArray(m)) {
        next.missionsTotal = m.length;
        next.missionsClaimable = m.filter((x: any) => x?.can_claim && !x?.claimed).length;
      }
      setStatus(next);
    })();
    return () => { active = false; };
  }, []);

  return status;
}

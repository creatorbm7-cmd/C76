import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DailyBonusResult = { success: boolean; amount?: number; streak?: number; message?: string };

/**
 * Runs once per authenticated session:
 *  - attaches referrer code (if any) saved by RefCapture
 *  - claims today's daily bonus (idempotent server-side)
 * Returns the daily-bonus claim result so a popup can show it.
 */
export function useBonusEngine() {
  const [bonus, setBonus] = useState<DailyBonusResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // Attach referrer (one-shot)
      try {
        const code = localStorage.getItem("dtx_ref_code");
        if (code) {
          const { data } = await supabase.rpc("attach_referrer", { p_code: code });
          // remove regardless to avoid retry storms
          localStorage.removeItem("dtx_ref_code");
          if ((data as any)?.success) {
            // ok
          }
        }
      } catch {/* ignore */}

      // Claim daily bonus
      const claimedKey = `dtx_daily_claimed_${user.id}_${new Date().toISOString().slice(0,10)}`;
      if (localStorage.getItem(claimedKey)) return;
      try {
        const { data, error } = await supabase.rpc("claim_daily_bonus");
        if (error) return;
        const res = data as DailyBonusResult;
        localStorage.setItem(claimedKey, "1");
        if (!cancelled && res?.success) setBonus(res);
      } catch {/* ignore */}
    })();
    return () => { cancelled = true; };
  }, []);

  return { bonus, dismiss: () => setBonus(null) };
}

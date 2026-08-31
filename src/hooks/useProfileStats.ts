import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileStats {
  balance: number;
  locked: number;
  total_deposited: number;
  total_withdrawn: number;
  total_wagered: number;
  total_won: number;
  bets_placed: number;
  net_profit: number;
  currency: string;
  member_since: string | null;
}

const ZERO: ProfileStats = {
  balance: 0, locked: 0,
  total_deposited: 0, total_withdrawn: 0,
  total_wagered: 0, total_won: 0,
  bets_placed: 0, net_profit: 0,
  currency: "USD", member_since: null,
};

export function useProfileStats() {
  const [stats, setStats] = useState<ProfileStats>(ZERO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user?.id) { setStats(ZERO); return; }
      const { data, error } = await supabase.rpc("rpc_user_stats", { _user_id: u.user.id });
      if (error) throw error;
      const d = (data ?? {}) as Record<string, any>;
      setStats({
        balance: Number(d.balance ?? 0),
        locked: Number(d.locked ?? 0),
        total_deposited: Number(d.total_deposited ?? 0),
        total_withdrawn: Number(d.total_withdrawn ?? 0),
        total_wagered: Number(d.total_wagered ?? 0),
        total_won: Number(d.total_won ?? 0),
        bets_placed: Number(d.bets_placed ?? 0),
        net_profit: Number(d.net_profit ?? 0),
        currency: String(d.currency ?? "USD"),
        member_since: d.member_since ?? null,
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refetch(); }, [refetch]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refreshSoon = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void refetch(); }, 150);
    };
    window.addEventListener("dtx:balance-updated", refreshSoon);
    window.addEventListener("focus", refreshSoon);
    document.addEventListener("visibilitychange", refreshSoon);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("dtx:balance-updated", refreshSoon);
      window.removeEventListener("focus", refreshSoon);
      document.removeEventListener("visibilitychange", refreshSoon);
    };
  }, [refetch]);

  return { stats, loading, error, refetch };
}

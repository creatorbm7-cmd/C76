import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BonusClaim {
  id: string;
  amount: number;
  wagering_req: number;
  wagered_so_far: number;
  status: string;
  claimed_at: string;
  completed_at: string | null;
  campaign_name: string | null;
}

interface State {
  claims: BonusClaim[];
  active: BonusClaim[];
  completed: BonusClaim[];
  totalActiveAmount: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBonusClaims(): State {
  const [claims, setClaims] = useState<BonusClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user?.id) { setClaims([]); return; }
      const { data, error } = await supabase
        .from("bonus_claims")
        .select("id,amount,wagering_requirement,wagered,status,claimed_at,completed_at,bonus_campaigns(name)")
        .eq("user_id", u.user.id)
        .order("claimed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows: BonusClaim[] = ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        amount: Number(r.amount ?? 0),
        wagering_req: Number(r.wagering_requirement ?? 0),
        wagered_so_far: Number(r.wagered ?? 0),
        status: String(r.status ?? "pending"),
        claimed_at: r.claimed_at,
        completed_at: r.completed_at,
        campaign_name: r.bonus_campaigns?.name ?? null,
      }));
      setClaims(rows);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load bonuses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refetch(); }, [refetch]);

  const active = claims.filter((c) => c.status === "active" || c.status === "pending");
  const completed = claims.filter((c) => c.status === "completed" || c.status === "expired" || c.status === "forfeited");
  const totalActiveAmount = active.reduce((s, c) => s + c.amount, 0);

  return { claims, active, completed, totalActiveAmount, loading, error, refetch };
}

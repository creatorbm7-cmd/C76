import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LiveBet {
  id: string;
  user_id: string;
  game_type: string;
  bet_amount: number;
  payout: number;
  is_win: boolean;
  multiplier: number | null;
  created_at: string;
}

export interface LiveTx {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_after: number | null;
  description: string | null;
  created_at: string;
}

export interface CrashRow {
  id: string;
  round_number: number;
  status: string;
  crash_point: number | null;
  started_at: string | null;
  crashed_at: string | null;
}

export interface PendingWithdrawal {
  id: string;
  user_id: string;
  chain: string;
  amount: number;
  net_amount: number | null;
  to_address: string;
  status: string;
  created_at: string;
}

export interface HotWalletAlert {
  chain: string;
  balance: number;
  min_balance_alert: number;
  is_low: boolean;
}

export interface KpiSnapshot {
  online_users: number;
  bets_24h: number;
  wagered_24h: number;
  ggr_24h: number;
  pending_withdrawals: number;
  active_sessions: number;
}

const seriesBucket = (rows: { created_at: string; bet_amount: number }[]) => {
  const now = Date.now();
  const buckets = new Array(60).fill(0).map((_, i) => ({
    t: new Date(now - (59 - i) * 60_000).toISOString(),
    label: `${59 - i}m`,
    volume: 0,
  }));
  for (const r of rows) {
    const ageMin = Math.floor((now - new Date(r.created_at).getTime()) / 60_000);
    const idx = 59 - ageMin;
    if (idx >= 0 && idx < 60) buckets[idx].volume += Number(r.bet_amount) || 0;
  }
  return buckets;
};

export function useAdminLive() {
  const [bets, setBets] = useState<LiveBet[]>([]);
  const [txs, setTxs] = useState<LiveTx[]>([]);
  const [crashes, setCrashes] = useState<CrashRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [hotWallets, setHotWallets] = useState<HotWalletAlert[]>([]);
  const [kpi, setKpi] = useState<KpiSnapshot>({
    online_users: 0, bets_24h: 0, wagered_24h: 0, ggr_24h: 0, pending_withdrawals: 0, active_sessions: 0,
  });
  const [series, setSeries] = useState(seriesBucket([]));
  const [connection, setConnection] = useState<"connecting" | "connected" | "offline">("connecting");

  const refresh = useCallback(async () => {
    const sinceISO = new Date(Date.now() - 60 * 60_000).toISOString();
    const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();

    const [betsRes, txRes, crashRes, wdRes, hotRes, bets24Res, sess24Res] = await Promise.all([
      supabase.from("casino_bets").select("id,user_id,game_type,bet_amount,payout,is_win,multiplier,created_at")
        .order("created_at", { ascending: false }).limit(40),
      supabase.from("casino_transactions").select("id,user_id,type,amount,balance_after,description,created_at")
        .order("created_at", { ascending: false }).limit(20),
      supabase.rpc("get_crash_rounds_safe", { p_limit: 20 }),
      supabase.from("crypto_withdrawals").select("id,user_id,chain,amount,net_amount,to_address,status,created_at")
        .eq("status", "pending").order("created_at", { ascending: true }).limit(15),
      supabase.rpc("check_hot_wallet_alerts"),
      supabase.from("casino_bets").select("bet_amount,payout,created_at,origin").gte("created_at", since24h),
      supabase.from("casino_bets").select("user_id,created_at").gte("created_at", sinceISO),
    ]);

    if (betsRes.data) setBets(betsRes.data as LiveBet[]);
    if (txRes.data) setTxs(txRes.data as LiveTx[]);
    if (crashRes.data) setCrashes(crashRes.data as CrashRow[]);
    if (wdRes.data) setWithdrawals(wdRes.data as PendingWithdrawal[]);
    if (hotRes.data) setHotWallets(hotRes.data as HotWalletAlert[]);

    // Real economy only: seeded/demo/test bets (origin != 'verified_real') are
    // excluded from live wagered/GGR so KPIs never reflect non-real money.
    const all24raw = (bets24Res.data ?? []) as { bet_amount: number; payout: number; created_at: string; origin?: string | null }[];
    const all24 = all24raw.filter(b => b.origin === "verified_real");
    const recent = (sess24Res.data ?? []) as { user_id: string; created_at: string }[];
    const wagered = all24.reduce((s, b) => s + Number(b.bet_amount || 0), 0);
    const paid = all24.reduce((s, b) => s + Number(b.payout || 0), 0);
    const ggr = wagered - paid;
    const online = new Set(
      recent.filter(r => Date.now() - new Date(r.created_at).getTime() < 5 * 60_000).map(r => r.user_id)
    ).size;
    const activeSess = new Set(recent.map(r => r.user_id)).size;

    setKpi({
      online_users: online,
      bets_24h: all24.length,
      wagered_24h: wagered,
      ggr_24h: ggr,
      pending_withdrawals: wdRes.data?.length ?? 0,
      active_sessions: activeSess,
    });
    setSeries(seriesBucket(recent.map(r => ({ created_at: r.created_at, bet_amount: 0 })).concat(
      all24.filter(b => new Date(b.created_at).getTime() > Date.now() - 60 * 60_000)
        .map(b => ({ created_at: b.created_at, bet_amount: Number(b.bet_amount) }))
    )));
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15_000);

    const channel = supabase
      .channel("admin-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "casino_bets" }, (p) => {
        setBets(prev => [p.new as LiveBet, ...prev].slice(0, 40));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "casino_transactions" }, (p) => {
        setTxs(prev => [p.new as LiveTx, ...prev].slice(0, 20));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "crypto_withdrawals" }, () => {
        refresh();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnection("connected");
        else if (status === "CHANNEL_ERROR" || status === "CLOSED") setConnection("offline");
        else setConnection("connecting");
      });

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { bets, txs, crashes, withdrawals, hotWallets, kpi, series, connection, refresh };
}

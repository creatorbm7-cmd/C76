import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDtxStore } from '@/store/dtxStore';
import { emitEnergyEarned } from '@/lib/c7energy';
export interface JackpotWin {
  tier: string;
  amount: number;
}

export async function syncDtxBalance(setStoreBalance: (n: number) => void) {
  const { data, error } = await supabase.functions.invoke('casino-transfer', {
    body: { direction: 'get_balance' },
  });
  if (!error && data?.balance !== undefined) {
    const next = Number(data.balance);
    setStoreBalance(next);
    return next;
  }
  return null;
}

let globalJackpotTrigger: ((win: JackpotWin) => void) | null = null;

export function setGlobalJackpotTrigger(fn: ((win: JackpotWin) => void) | null) {
  globalJackpotTrigger = fn;
}

export function useCasinoGame() {
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [jackpotWin, setJackpotWin] = useState<JackpotWin | null>(null);

  // SECURITY: userId is now always derived server-side from the JWT token.
  // The Supabase client automatically sends the Authorization header with each request.

  const setStoreBalance = useDtxStore((s) => s.setBalance);

  const fetchBalance = useCallback(async () => {
    const next = await syncDtxBalance(setStoreBalance);
    if (next !== null) {
      setBalance(next);
    }
  }, [setStoreBalance]);

  const clearJackpotWin = useCallback(() => setJackpotWin(null), []);

  const placeBet = async (gameType: string, betAmount: number, gameParams: Record<string, unknown> = {}) => {
    setLoading(true);
    try {
      // Auth gate — no silent demo fallback. Real bets require a real session.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to place a bet');
        throw new Error('Not authenticated');
      }

      // Phase 3: idempotency key prevents duplicate debits on retry
      const idemKey = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

      // Phase 3: all bets route through v2 fat RPCs. Mines uses its dedicated
      // start endpoint, all other instant games use the shared zero-race engine.
      const isMines = gameType === 'mines';
      const fnName = isMines ? 'mines-start-v2' : 'place-bet-v2';
      const body = isMines
        ? {
            bet_amount: betAmount,
            mines_count: Number(gameParams.mine_count ?? gameParams.mines_count ?? 3),
            client_seed: gameParams.client_seed ?? null,
            idempotency_key: idemKey,
          }
        : { game_type: gameType, bet_amount: betAmount, game_params: gameParams, idempotency_key: idemKey };
      const { data, error } = await supabase.functions.invoke(fnName, {
        body,
        headers: { 'Idempotency-Key': idemKey },
      });
      if (error) {
        let realMsg = error.message || 'Bet failed';
        let body: any = null;
        try {
          const resp = (error as any)?.context?.response;
          if (resp && typeof resp.json === 'function') {
            body = await resp.clone().json();
            if (body?.error) realMsg = body.error;
          }
        } catch { /* ignore parse errors */ }
        const lower = String(realMsg).toLowerCase();
        if (body?.code === 'INSUFFICIENT_BALANCE') {
          const err: any = new Error(realMsg);
          err.code = 'INSUFFICIENT_BALANCE';
          err.have = body.have;
          err.need = body.need;
          throw err;
        }
        if (lower.includes('unauthorized') || lower.includes('jwt')) {
          await supabase.auth.refreshSession();
          toast.error('Session expired — please retry');
        } else {
          toast.error(realMsg);
        }
        throw new Error(realMsg);
      }
      const resultData = isMines && data?.game_id ? { ...data, session_id: data.game_id } : data;
      if (resultData?.success === false) {
        toast.error(resultData.error || 'Bet rejected');
        throw new Error(resultData.error || 'Bet rejected');
      }
      if (resultData?.jackpot_win) {
        setJackpotWin(resultData.jackpot_win);
        globalJackpotTrigger?.(resultData.jackpot_win);
      }
      if (resultData?.new_balance !== undefined) {
        const next = Number(resultData.new_balance);
        setBalance(next);
        setStoreBalance(next);
      }
      // C7 Engagement (Phase 1.1): if the settle response carries a C74 energy
      // delta, surface it so C7EarnBurst can celebrate the earn. Guarded and
      // additive — a no-op until the backend (0.2) adds `energy_earned`; never
      // affects gameplay, balance, or settlement.
      const ee = (resultData as { energy_earned?: { amount?: number; new_energy_balance?: number } } | null | undefined)?.energy_earned;
      if (ee) {
        const amount = Number(ee.amount);
        const bal = Number(ee.new_energy_balance);
        emitEnergyEarned({ amount, source: 'wager', newBalance: Number.isFinite(bal) ? bal : undefined });
      }
      await fetchBalance();
      return resultData;
    } finally {
      setLoading(false);
    }
  };

  const revealTile = async (sessionId: string, tileIndex: number) => {
    setLoading(true);
    try {
      // Phase 3: route to v2 fat RPC (rpc_mines_reveal_v2)
      const { data, error } = await supabase.functions.invoke('mines-reveal-v2', {
        body: { game_id: sessionId, tile: tileIndex },
      });
      if (error) throw error;
      if (data?.tiles_remaining === 0 || data?.is_mine) await fetchBalance();
      return data;
    } finally {
      setLoading(false);
    }
  };

  const minesCashout = async (sessionId: string) => {
    setLoading(true);
    try {
      const idemKey = `mines-cashout-${sessionId}`;
      // Phase 3: route to v2 fat RPC (rpc_mines_cashout with advisory lock)
      const { data, error } = await supabase.functions.invoke('mines-cashout', {
        body: { game_id: sessionId, idempotency_key: idemKey },
        headers: { 'Idempotency-Key': idemKey },
      });
      if (error) throw error;
      await fetchBalance();
      return data;
    } finally {
      setLoading(false);
    }
  };

  const depositToCasino = async (amount: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('casino-transfer', {
        body: { direction: 'to_casino', amount },
      });
      if (error) throw error;
      await fetchBalance();
      return data;
    } finally {
      setLoading(false);
    }
  };

  const withdrawFromCasino = async (amount: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('casino-transfer', {
        body: { direction: 'from_casino', amount },
      });
      if (error) throw error;
      await fetchBalance();
      return data;
    } finally {
      setLoading(false);
    }
  };

  const rotateSeed = async (clientSeed?: string) => {
    const { data, error } = await supabase.functions.invoke('rotate-seed', {
      body: { client_seed: clientSeed },
    });
    if (error) throw error;
    return data;
  };

  const cryptoWithdraw = async (chain: string, toAddress: string, amount: number) => {
    setLoading(true);
    try {
      const idemKey = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const { data, error } = await supabase.functions.invoke('casino-withdraw', {
        body: { chain, to_address: toAddress, amount, idempotency_key: idemKey },
        headers: { 'Idempotency-Key': idemKey },
      });
      if (error) throw error;
      await fetchBalance();
      return data;
    } finally {
      setLoading(false);
    }
  };

  const crashCashout = async (betId: string, roundId: string, multAt: number) => {
    setLoading(true);
    try {
      const idemKey = `crash-cashout-${betId}`;
      const { data, error } = await supabase.functions.invoke('crash-cashout-v2', {
        body: { bet_id: betId, round_id: roundId, mult_at: multAt, idempotency_key: idemKey },
        headers: { 'Idempotency-Key': idemKey },
      });
      if (error) throw error;
      await fetchBalance();
      return data;
    } finally {
      setLoading(false);
    }
  };

  return {
    balance, loading, fetchBalance,
    placeBet, revealTile, minesCashout, crashCashout,
    depositToCasino, withdrawFromCasino, rotateSeed,
    cryptoWithdraw,
    jackpotWin, clearJackpotWin,
  };
}

/**
 * VipC74Rewards — claim a one-time C74 bonus for each VIP tier reached.
 *
 * Reads vip_c74_status(); claims via claim_vip_c74(). Tier is derived from
 * lifetime wagering server-side. Rewards land in the C74 layer (no money path).
 * Premium gold card, matches the C74 wheel. Hidden until data loads.
 */
import { useCallback, useEffect, useState } from 'react';
import { num as fmt } from "@/lib/format";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Check, Lock } from 'lucide-react';

interface TierRow { tier_idx: number; name: string; threshold: number; reward_c74: number; reached: boolean; claimed: boolean; }
interface Status { total_wagered: number; tiers: TierRow[]; }

const TIER_ICON: Record<string, string> = { Bronze: '🥉', Silver: '🥈', Gold: '🥇', Platinum: '💠', Diamond: '💎' };

export default function VipC74Rewards() {
  const [st, setSt] = useState<Status | null>(null);
  const [claiming, setClaiming] = useState<number | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await (supabase.rpc as any)('vip_c74_status');
    if (!error && data) setSt(data as Status);
  }, []);
  useEffect(() => { load(); }, [load]);

  const claim = async (t: TierRow) => {
    if (claiming !== null) return;
    setClaiming(t.tier_idx);
    try {
      const { data, error } = await (supabase.rpc as any)('claim_vip_c74', { p_tier_idx: t.tier_idx });
      if (error) throw error;
      const r = data as { reward_c74: number };
      toast.success(`👑 ${t.name} reward — +${fmt(r.reward_c74)} C74!`);
      window.dispatchEvent(new Event('dtx:balance-updated'));
      load();
    } catch (e: any) {
      const m = String(e?.message ?? '');
      toast.error(m.includes('ALREADY') ? 'Already claimed' : m.includes('NOT_REACHED') ? 'Tier not reached yet' : 'Claim failed');
    } finally { setClaiming(null); }
  };

  if (!st) return null;
  const rows = st.tiers.filter((t) => t.reward_c74 > 0); // skip Bronze (no reward)

  return (
    <div className="vipc74">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="vipc74-head">
        <span className="vipc74-badge">🪙 C74 VIP REWARDS</span>
        <span className="vipc74-wag">{fmt(st.total_wagered)} USDT wagered</span>
      </div>
      <div className="vipc74-list">
        {rows.map((t) => (
          <div key={t.tier_idx} className={`vipc74-row${t.reached ? ' is-reached' : ''}`}>
            <span className="vipc74-ic">{TIER_ICON[t.name] ?? '👑'}</span>
            <div className="vipc74-info">
              <b>{t.name}</b>
              <small>{fmt(t.threshold)} USDT wagered</small>
            </div>
            <span className="vipc74-reward">+{fmt(t.reward_c74)}</span>
            {t.claimed ? (
              <span className="vipc74-done"><Check size={14} /></span>
            ) : t.reached ? (
              <button className="vipc74-claim" onClick={() => claim(t)} disabled={claiming === t.tier_idx}>
                {claiming === t.tier_idx ? <Loader2 size={13} className="vipc74-spin" /> : 'Claim'}
              </button>
            ) : (
              <span className="vipc74-lock"><Lock size={13} /></span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const CSS = `
.vipc74 { border-radius: 18px; padding: 15px; margin: 14px 0;
  background: radial-gradient(120% 90% at 100% 0%, rgba(245,180,35,0.18), transparent 55%), linear-gradient(160deg, #2a1e06, #14110a);
  border: 1.5px solid rgba(245,180,35,0.5); box-shadow: 0 14px 30px -14px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,236,180,0.22); }
.vipc74-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.vipc74-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 900; letter-spacing: 1.2px; padding: 4px 11px; border-radius: 999px; color: #2a1a02;
  background: radial-gradient(120% 100% at 50% 8%, #fff6d8, transparent 55%), linear-gradient(180deg, #ffd24d, #b8860b); box-shadow: 0 3px 10px -3px rgba(255,190,60,0.6); }
.vipc74-wag { font-size: 10.5px; font-weight: 800; color: rgba(255,255,255,0.55); font-variant-numeric: tabular-nums; }
.vipc74-list { display: flex; flex-direction: column; gap: 7px; }
.vipc74-row { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 12px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.05); opacity: 0.6; }
.vipc74-row.is-reached { opacity: 1; border-color: rgba(245,180,35,0.28); }
.vipc74-ic { font-size: 20px; }
.vipc74-info { flex: 1; min-width: 0; }
.vipc74-info b { display: block; font-size: 13px; font-weight: 900; color: #fff; }
.vipc74-info small { font-size: 9.5px; font-weight: 700; color: rgba(255,255,255,0.45); }
.vipc74-reward { font-size: 13px; font-weight: 900; color: #ffe9a8; font-variant-numeric: tabular-nums; }
.vipc74-claim { padding: 7px 14px; border: none; border-radius: 9px; cursor: pointer; font: 900 11px/1 Inter, system-ui, sans-serif; color: #2a1a02;
  background: radial-gradient(120% 90% at 50% -18%, rgba(255,255,255,0.6), transparent 55%), linear-gradient(180deg, #ffd24d, #b8860b); box-shadow: 0 3px 0 #8a5e0a, inset 0 1px 0 rgba(255,255,255,0.6); }
.vipc74-claim:active:not(:disabled) { transform: translateY(2px); box-shadow: 0 1px 0 #8a5e0a; }
.vipc74-claim:disabled { opacity: 0.7; cursor: not-allowed; }
.vipc74-done { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: rgba(107,245,163,0.18); color: #6bf5a3; }
.vipc74-lock { width: 26px; height: 26px; display: grid; place-items: center; color: rgba(255,255,255,0.3); }
.vipc74-spin { animation: vipc74-rot 0.9s linear infinite; }
@keyframes vipc74-rot { to { transform: rotate(360deg); } }
`;

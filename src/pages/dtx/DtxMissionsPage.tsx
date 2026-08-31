/**
 * DtxMissionsPage — Missions (/missions).
 *
 * Claimable C74 goals evaluated against real activity (deposits, bets, wagering,
 * referrals). Reads get_missions(); claims via claim_mission(). Rewards land in
 * the C74 layer (no money path). C7 V3 emerald-gold theme (.c7p-page felt).
 */
import { useCallback, useEffect, useState } from 'react';
import { num as fmt } from "@/lib/format";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LuxFrameFX from '@/components/c7/shell/LuxFrameFX';
import C7Icon from '@/components/c7/C7Icon';

interface Mission {
  id: string; code: string; title: string; description: string | null; icon: string | null;
  metric: string; target: number; reward_c74: number; current_value: number;
  claimed: boolean; can_claim: boolean;
}


export default function DtxMissionsPage() {
  const navigate = useNavigate();
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await (supabase.rpc as any)('get_missions');
    setMissions(!error && Array.isArray(data) ? (data as Mission[]) : []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const claim = async (m: Mission) => {
    if (claiming) return;
    setClaiming(m.id);
    try {
      const { data, error } = await (supabase.rpc as any)('claim_mission', { p_mission_id: m.id });
      if (error) throw error;
      const r = data as { reward_c74: number };
      toast.success(`🎯 Mission complete — +${fmt(r.reward_c74)} C74!`);
      window.dispatchEvent(new Event('dtx:balance-updated'));
      load();
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      toast.error(msg.includes('ALREADY') ? 'Already claimed' : msg.includes('NOT_COMPLETE') ? 'Not completed yet' : 'Claim failed');
    } finally { setClaiming(null); }
  };

  return (
    <div className="c7p-page ms-root">
      <style>{CSS}</style>
      <div className="ms-wrap">
        <header className="ms-bar c7-lux-head">
          <LuxFrameFX />
          <button className="ms-ic" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} aria-label="Back"><ArrowLeft size={18} /></button>
          <span className="ms-ttl"><C7Icon name="target" size={20} /> Missions</span>
          <span style={{ width: 34 }} />
        </header>

        <main className="ms-main">
          {missions === null ? (
            <>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="c7p-skel c7p-skel--card" style={{ height: 96 }} />)}</>
          ) : missions.length === 0 ? (
            <div className="ms-empty"><C7Icon name="target" size={40} /><span>No missions available right now.</span></div>
          ) : (
            <>
              <div className="c7p-sec">
                <span className="c7p-sec-ic"><C7Icon name="target" size={16} /></span>
                <span className="c7p-sec-t">Active Missions</span>
                <span className="c7p-sec-rule" />
              </div>
              <div className="ms-summary">
                <span><b>{missions.length}</b> missions</span>
                <span><b>{missions.filter((m) => m.can_claim && !m.claimed).length}</b> claimable</span>
                <span><b>{missions.filter((m) => m.claimed).length}</b> claimed</span>
              </div>
              {missions.map((m) => {
              const pct = Math.min(100, Math.round((Number(m.current_value) / Math.max(Number(m.target), 1)) * 100));
              return (
                <article key={m.id} className={`c7p-panel ms-card${m.claimed ? ' is-done' : ''}`}>
                  <div className="ms-icon">{m.icon ?? <C7Icon name="target" size={22} />}</div>
                  <div className="ms-body">
                    <div className="ms-title-row">
                      <h3 className="ms-title c7p-title tt-emerald">{m.title}</h3>
                      <span className="ms-reward">+{fmt(m.reward_c74)} C74</span>
                    </div>
                    {m.description && <p className="ms-desc">{m.description}</p>}
                    <div className="ms-bar-track"><div className="ms-bar-fill" style={{ width: `${pct}%` }} /></div>
                    <div className="ms-foot">
                      <span className="ms-prog">{fmt(Math.min(Number(m.current_value), Number(m.target)))} / {fmt(m.target)}</span>
                      {m.claimed ? (
                        <span className="ms-claimed"><Check size={13} /> Claimed</span>
                      ) : m.can_claim ? (
                        <button className="c7p-btn-gold ms-claim" onClick={() => claim(m)} disabled={claiming === m.id}>
                          {claiming === m.id ? <Loader2 size={13} className="ms-spin" /> : <C7Icon name="gift" size={15} />} Claim
                        </button>
                      ) : (
                        <span className="ms-prog-lbl">{pct}%</span>
                      )}
                    </div>
                  </div>
                </article>
              );
              })}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

const CSS = `
.ms-root { min-height: 100dvh; color: #fff; padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px)); position: relative; overflow-x: hidden; font-family: Inter, system-ui, sans-serif; }
.ms-wrap { position: relative; z-index: 1; max-width: 520px; margin: 0 auto; }
.ms-bar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px;
  background: linear-gradient(180deg, rgba(6,26,16,0.92), rgba(6,26,16,0.5)); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(246,201,69,0.28); }
.ms-ic { width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,0.06); border: 1px solid rgba(246,201,69,0.35); color: #d6ffe9; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
.ms-ttl { font-size: 16px; font-weight: 900; background: linear-gradient(180deg, #ffffff, #d6ffe9 45%, #ffe9a8 78%, #f5b423); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 10px rgba(46,230,130,0.4)); }
.ms-main { padding: 14px; display: flex; flex-direction: column; gap: 11px; }
.ms-empty { padding: 60px 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; color: rgba(255,255,255,0.55); font-size: 46px; }
.ms-empty span { font-size: 13px; font-weight: 600; }
/* Summary count row under the section header. */
.ms-summary { display: flex; gap: 8px; margin: -2px 2px 2px; }
.ms-summary span { flex: 1; text-align: center; padding: 9px 4px; border-radius: 12px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px; color: rgba(255,255,255,0.6);
  background: linear-gradient(160deg, rgba(11,74,51,0.5), rgba(4,29,19,0.66)); border: 1px solid rgba(246,201,69,0.28); }
.ms-summary b { display: block; font-size: 17px; font-weight: 900; color: #ffe9a8; font-variant-numeric: tabular-nums; }
/* Card visuals come from the shared .c7p-panel primitive; .ms-card only owns layout. */
.ms-card { display: flex; gap: 13px; align-items: flex-start; padding: 14px; }
.ms-card.is-done { opacity: 0.72; }
.ms-icon { flex-shrink: 0; width: 46px; height: 46px; border-radius: 13px; display: grid; place-items: center; font-size: 24px;
  background: radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.12), transparent 55%), linear-gradient(160deg, #0f6644, #05301e); border: 1px solid rgba(246,201,69,0.35); }
.ms-body { flex: 1; min-width: 0; }
.ms-title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ms-title { margin: 0; font-size: 15px; font-weight: 900; color: #fff; }
.ms-reward { font-size: 12.5px; font-weight: 900; color: #ffe9a8; font-variant-numeric: tabular-nums; white-space: nowrap; }
.ms-desc { margin: 4px 0 9px; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.66); line-height: 1.45; }
.ms-bar-track { height: 7px; border-radius: 999px; background: rgba(0,0,0,0.35); overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.5); }
.ms-bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #34e58a, #6bf5a3 60%, #ffd24d); box-shadow: 0 0 8px rgba(46,230,130,0.6); transition: width .5s cubic-bezier(.2,.7,.2,1); }
.ms-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 9px; }
.ms-prog { font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.6); font-variant-numeric: tabular-nums; }
.ms-prog-lbl { font-size: 11px; font-weight: 800; color: #6bf5a3; font-variant-numeric: tabular-nums; }
/* Look comes from the shared .c7p-btn-gold primitive; .ms-claim keeps it compact. */
.ms-claim { gap: 6px; padding: 8px 16px; border-radius: 10px; font-size: 12px; }
.ms-claimed { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 900; color: #6bf5a3; }
.ms-spin { animation: ms-rot 0.9s linear infinite; }
@keyframes ms-rot { to { transform: rotate(360deg); } }
`;

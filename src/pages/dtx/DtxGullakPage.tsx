/**
 * DtxGullakPage — "Bank Game" / C74 Savings Gullak (/gullak).
 *
 * Save spendable C74 into a piggy bank, build a daily streak, then break it to
 * claim your savings plus a streak bonus. All server-authoritative via the
 * c74_gullak_* RPCs; entirely inside the C74 reward layer (no money path).
 * C7 V3 emerald-gold theme (.c7p-page felt). Drop-in image slots.
 */
import { useCallback, useEffect, useState } from 'react';
import { num as fmt } from "@/lib/format";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LuxFrameFX from '@/components/c7/shell/LuxFrameFX';
import { useC74 } from '@/hooks/useC74';
import { useAppAssets } from '@/hooks/useAppAssets';
import C7Icon from '@/components/c7/C7Icon';
// Slot images come from the DB asset library — keys: gullak.piggy · gullak.backdrop

interface Gullak {
  balance: number; deposited_total: number; streak: number; last_deposit_on: string | null;
  bonus_pct: number; bonus_amount: number; min_deposit: number;
  bonus_pct_per_day: number; bonus_cap_days: number;
}


export default function DtxGullakPage() {
  const navigate = useNavigate();
  const { summary: c74, reload: reloadC74 } = useC74();
  const dbAssets = useAppAssets();
  const ASSETS = { piggy: dbAssets['gullak.piggy'] || '', backdrop: dbAssets['gullak.backdrop'] || '' };
  const [g, setG] = useState<Gullak | null>(null);
  const [amount, setAmount] = useState<number>(100);
  const [busy, setBusy] = useState(false);

  const balance = c74?.balance ?? 0;

  const load = useCallback(async () => {
    const { data, error } = await (supabase.rpc as any)('c74_gullak_status');
    if (!error && data) setG(data as Gullak);
  }, []);
  useEffect(() => { load(); }, [load]);

  const refresh = () => { load(); reloadC74(); window.dispatchEvent(new Event('dtx:balance-updated')); };

  const deposit = async () => {
    if (busy) return;
    const min = g?.min_deposit ?? 50;
    if (amount < min) { toast.error(`Minimum save is ${fmt(min)} C74`); return; }
    if (amount > balance) { toast.error('Not enough C74 to save'); return; }
    setBusy(true);
    try {
      const { data, error } = await (supabase.rpc as any)('c74_gullak_deposit', { p_amount: amount });
      if (error) throw error;
      setG(data as Gullak);
      toast.success(`Saved ${fmt(amount)} C74 to your gullak 🐷`);
      refresh();
    } catch (e: any) {
      const m = String(e?.message ?? '');
      toast.error(m.includes('E_INSUFFICIENT') ? 'Not enough C74' : m.includes('E_MIN') ? `Minimum ${fmt(g?.min_deposit ?? 50)} C74` : m || 'Save failed');
    } finally { setBusy(false); }
  };

  const breakIt = async () => {
    if (busy || !g || g.balance <= 0) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase.rpc as any)('c74_gullak_break');
      if (error) throw error;
      const r = data as { saved: number; bonus: number; payout: number };
      toast.success(`🔨 Broke your gullak — ${fmt(r.payout)} C74 claimed (+${fmt(r.bonus)} bonus)!`);
      refresh();
    } catch (e: any) {
      toast.error(String(e?.message ?? '').includes('E_EMPTY') ? 'Nothing saved yet' : 'Break failed');
    } finally { setBusy(false); }
  };

  const saved = g?.balance ?? 0;
  const bonusAmt = g?.bonus_amount ?? 0;
  const payout = saved + bonusAmt;
  const QUICK = [50, 100, 500, 1000];

  return (
    <div className="c7p-page gk-root">
      <style>{CSS}</style>
      <div className="gk-wrap">
        <header className="gk-bar c7-lux-head">
          <LuxFrameFX />
          <button className="gk-ic" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} aria-label="Back"><ArrowLeft size={18} /></button>
          <span className="gk-ttl c7p-title tt-gold"><C7Icon name="wallet" size={20} /> Bank Game</span>
          <span style={{ width: 34 }} />
        </header>

        <main className="gk-main">
          {!g ? (
            <>
              <div className="c7p-skel c7p-skel--card gk-skel-hero" />
              <div className="c7p-skel c7p-skel--card gk-skel-panel" />
              <div className="c7p-skel c7p-skel--card gk-skel-panel" />
            </>
          ) : (
          <>
          {/* Piggy hero */}
          <section className="c7p-card-gold gk-hero">
            {ASSETS.backdrop && <img className="gk-hero-bg" src={ASSETS.backdrop} alt="" aria-hidden="true" />}
            <div className="gk-badge">🐷 C74 SAVINGS GULLAK</div>
            <div className="gk-piggy" aria-hidden="true">
              {ASSETS.piggy ? <img src={ASSETS.piggy} alt="" /> : <span className="gk-pig-emoji">🐷</span>}
            </div>
            <div className="gk-saved-k">Saved in gullak</div>
            <div className="gk-saved-v">{fmt(saved)} <span>C74</span></div>
            <div className="gk-streak">
              <Flame size={14} style={{ color: '#ff8a3c' }} />
              <b>{g?.streak ?? 0}-day</b> streak · <b>+{(g?.bonus_pct ?? 0).toLocaleString('en-US', { maximumFractionDigits: 1 })}%</b> break bonus
            </div>
          </section>

          {/* Deposit */}
          <section className="c7p-panel gk-panel">
            <div className="gk-panel-h">Save C74 <span className="gk-bal"><C7Icon name="coin" size={14} /> {fmt(balance)} available</span></div>
            <div className="gk-quick">
              {QUICK.map((q) => (
                <button key={q} className={`c7p-chip gk-chip${amount === q ? ' is-on' : ''}`} onClick={() => setAmount(q)}>{fmt(q)}</button>
              ))}
              <button className={`c7p-chip gk-chip${amount === Math.floor(balance) && balance > 0 ? ' is-on' : ''}`} onClick={() => setAmount(Math.floor(balance))} disabled={balance <= 0}>MAX</button>
            </div>
            <button className="c7p-btn-gold gk-save" onClick={deposit} disabled={busy || balance <= 0}>
              {busy ? <Loader2 size={16} className="gk-spin" /> : '🐷'} Save {fmt(amount)} C74
            </button>
            <p className="gk-note">Minimum {fmt(g?.min_deposit ?? 50)} C74 · save daily to grow your streak (+{g?.bonus_pct_per_day ?? 0.5}%/day, up to {g?.bonus_cap_days ?? 30} days).</p>
          </section>

          {/* Break */}
          <section className="c7p-panel gk-panel gk-break-panel">
            <div className="gk-break-row">
              <div>
                <div className="gk-break-k">Break &amp; claim</div>
                <div className="gk-break-sub">{fmt(saved)} saved + {fmt(bonusAmt)} bonus</div>
              </div>
              <div className="gk-break-v">{fmt(payout)} C74</div>
            </div>
            <button className="c7p-btn-green gk-break-btn" onClick={breakIt} disabled={busy || saved <= 0}>
              {busy ? <Loader2 size={16} className="gk-spin" /> : <C7Icon name="pickaxe" size={15} />} Break the Gullak
            </button>
            <p className="gk-note">Breaking returns everything you saved plus the streak bonus — and resets the streak.</p>
          </section>
          </>
          )}
        </main>
      </div>
    </div>
  );
}

const CSS = `
.gk-root { min-height: 100dvh; color: #fff; padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px)); position: relative; overflow-x: hidden; font-family: Inter, system-ui, sans-serif; }
.gk-wrap { position: relative; z-index: 1; max-width: 480px; margin: 0 auto; }
.gk-bar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px;
  background: linear-gradient(180deg, rgba(6,26,16,0.92), rgba(6,26,16,0.5)); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(246,201,69,0.28); }
.gk-ic { width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,0.06); border: 1px solid rgba(246,201,69,0.35); color: #ffe9a8; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
.gk-ttl { font-size: 16px; font-weight: 900; background: linear-gradient(180deg, #fff6d8, #ffe9a8 50%, #f5b423); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 10px rgba(245,180,35,0.4)); }
.gk-main { padding: 14px; }
/* Hero frame/glow comes from the shared .c7p-card-gold primitive; .gk-hero owns layout. */
.gk-hero { position: relative; overflow: hidden; border-radius: 20px; padding: 22px 18px; text-align: center; }
.gk-hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.35; z-index: 0; }
.gk-hero > * { position: relative; z-index: 1; }
.gk-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 900; letter-spacing: 1.3px; padding: 4px 12px; border-radius: 999px; color: #2a1a02;
  background: radial-gradient(120% 100% at 50% 8%, #fff6d8, transparent 55%), linear-gradient(180deg, #ffd24d, #b8860b); box-shadow: 0 3px 10px -3px rgba(255,190,60,0.6); }
.gk-piggy { margin: 10px auto 6px; width: 128px; height: 128px; display: grid; place-items: center; }
.gk-piggy img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.5)); }
.gk-pig-emoji { font-size: 96px; filter: drop-shadow(0 8px 14px rgba(245,180,35,0.5)); animation: gk-bob 3s ease-in-out infinite; }
@keyframes gk-bob { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-8px) rotate(2deg); } }
.gk-saved-k { font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,236,180,0.85); }
.gk-saved-v { font-size: 42px; font-weight: 900; letter-spacing: -1px; font-variant-numeric: tabular-nums; line-height: 1.05;
  background: linear-gradient(180deg, #fff6d8 2%, #ffe9a8 40%, #f5b423 74%, #b8860b 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 18px rgba(245,180,35,0.55)); }
.gk-saved-v span { font-size: 16px; }
.gk-streak { margin-top: 8px; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.72); display: inline-flex; align-items: center; gap: 5px; }
.gk-streak b { color: #ffe9a8; }
/* Panel visuals come from the shared .c7p-panel primitive; .gk-panel only owns spacing. */
.gk-panel { margin-top: 14px; padding: 16px; }
.gk-panel-h { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; color: #ffe9a8; }
.gk-bal { font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.6); text-transform: none; letter-spacing: 0; }
.gk-quick { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; margin: 12px 0; }
/* Chip look from shared .c7p-chip; .gk-quick .gk-chip fixes grid sizing + type. */
.gk-quick .gk-chip { width: auto; height: auto; padding: 11px 4px; border-radius: 11px; color: #ffe9a8; font: 900 12px/1 Inter, system-ui, sans-serif; cursor: pointer; font-variant-numeric: tabular-nums; }
.gk-chip.is-on { background: linear-gradient(180deg, #ffd24d, #b8860b); color: #2a1a02; border-color: transparent; }
.gk-chip:disabled { opacity: 0.4; cursor: not-allowed; }
/* Look from shared .c7p-btn-gold; .gk-save owns width/size. */
.gk-save { width: 100%; padding: 14px; border-radius: 14px; font-size: 15px; }
/* Loading skeletons (while gullak status loads). */
.gk-skel-hero { height: 320px; }
.gk-skel-panel { height: 148px; margin-top: 14px; }
.gk-break-panel { border-color: rgba(46,224,138,0.35); }
.gk-break-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.gk-break-k { font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #b9f6d0; }
.gk-break-sub { font-size: 10.5px; font-weight: 700; color: rgba(255,255,255,0.5); margin-top: 3px; }
.gk-break-v { font-size: 22px; font-weight: 900; color: #6bf5a3; font-variant-numeric: tabular-nums; }
/* Look from shared .c7p-btn-green; .gk-break-btn owns width/size. */
.gk-break-btn { width: 100%; padding: 13px; border-radius: 13px; font-size: 14px; }
.gk-note { margin-top: 10px; font-size: 10.5px; font-weight: 600; color: rgba(255,255,255,0.45); line-height: 1.45; }
.gk-spin { animation: gk-rot 0.8s linear infinite; }
@keyframes gk-rot { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .gk-pig-emoji { animation: none; } }
`;

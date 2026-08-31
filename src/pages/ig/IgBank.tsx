// IgBank (/ig/... Bank Game) — Instagram-light reskin of the dark DtxGullakPage
// "C74 Savings Gullak". Presentation only: same server-authoritative C74 savings
// hooks + RPCs (c74_gullak_status / c74_gullak_deposit / c74_gullak_break via
// supabase.rpc), the same useC74 balance, the same deposit / break handlers,
// streak/bonus math and honest rules text — copied verbatim. Dark-only decorative
// art (LuxFrameFX / piggy + backdrop asset slots) dropped for clean light styling.
import { useCallback, useEffect, useState } from 'react';
import { num as fmt } from "@/lib/format";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Flame, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useC74 } from '@/hooks/useC74';
import { BankCrest } from '@/components/ig/IgCrests';
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";

interface Gullak {
  balance: number; deposited_total: number; streak: number; last_deposit_on: string | null;
  bonus_pct: number; bonus_amount: number; min_deposit: number;
  bonus_pct_per_day: number; bonus_cap_days: number;
}

export default function IgBank() {
  const navigate = useNavigate();
  const { summary: c74, reload: reloadC74 } = useC74();
  const [g, setG] = useState<Gullak | null>(null);
  const [amount, setAmount] = useState<number>(100);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const balance = c74?.balance ?? 0;

  const load = useCallback(async () => {
    const { data, error } = await (supabase.rpc as any)('c74_gullak_status');
    if (!error && data) setG(data as Gullak);
  }, []);
  useEffect(() => { load(); }, [load]);

  const refresh = () => { load(); reloadC74(); window.dispatchEvent(new Event('dtx:balance-updated')); };
  const headerRefresh = async () => { setRefreshing(true); try { await load(); reloadC74(); } finally { setRefreshing(false); } };

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
    <div className="ig igbank">
      <style>{CSS}</style>

      <header className="ig-top">
        <button className="igbank-back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/ig/rewards'))} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="ig-ttl">Bank Game</span>
        <button className="igbank-back" onClick={headerRefresh} disabled={refreshing || !g} aria-label="Refresh"><RefreshCw size={18} className={refreshing ? "igbank-spin" : ""} /></button>
      </header>

      <main className="ig-main igbank-main">
        {!g ? (
          <>
            <div className="igbank-sk igbank-sk-hero" />
            <div className="igbank-sk igbank-sk-panel" />
            <div className="igbank-sk igbank-sk-panel" />
          </>
        ) : (
        <>
          {/* Savings hero — the one tasteful gold feature */}
          <section className="igbank-hero">
            <div className="igbank-badge">🐷 C74 Savings Gullak</div>
            <div className="igbank-piggy" aria-hidden="true"><BankCrest /></div>
            <div className="igbank-saved-k">Saved in gullak</div>
            <div className="igbank-saved-v ig-sheen">{fmt(saved)} <span>C74</span></div>
            <div className="igbank-streak">
              <Flame size={14} />
              <b>{g?.streak ?? 0}-day</b> streak · <b>+{(g?.bonus_pct ?? 0).toLocaleString('en-US', { maximumFractionDigits: 1 })}%</b> break bonus
            </div>
          </section>

          {/* Deposit */}
          <section className="igbank-panel">
            <div className="igbank-panel-h">Save C74 <span className="igbank-bal">🪙 {fmt(balance)} available</span></div>
            <div className="igbank-quick">
              {QUICK.map((q) => (
                <button key={q} type="button" className={`igbank-chip${amount === q ? ' on' : ''}`} onClick={() => setAmount(q)}>{fmt(q)}</button>
              ))}
              <button type="button" className={`igbank-chip${amount === Math.floor(balance) && balance > 0 ? ' on' : ''}`} onClick={() => setAmount(Math.floor(balance))} disabled={balance <= 0}>MAX</button>
            </div>
            <button type="button" className="igbank-save" onClick={deposit} disabled={busy || balance <= 0}>
              {busy ? <Loader2 size={16} className="igbank-spin" /> : <span aria-hidden="true">🐷</span>} Save {fmt(amount)} C74
            </button>
            <p className="igbank-note">Minimum {fmt(g?.min_deposit ?? 50)} C74 · save daily to grow your streak (+{g?.bonus_pct_per_day ?? 0.5}%/day, up to {g?.bonus_cap_days ?? 30} days).</p>
          </section>

          {/* Break */}
          <section className="igbank-panel">
            <div className="igbank-break-row">
              <div>
                <div className="igbank-break-k">Break &amp; claim</div>
                <div className="igbank-break-sub">{fmt(saved)} saved + {fmt(bonusAmt)} bonus</div>
              </div>
              <div className="igbank-break-v">{fmt(payout)} C74</div>
            </div>
            <button type="button" className="igbank-break-btn" onClick={breakIt} disabled={busy || saved <= 0}>
              {busy ? <Loader2 size={16} className="igbank-spin" /> : <span aria-hidden="true">🔨</span>} Break the Gullak
            </button>
            <p className="igbank-note">Breaking returns everything you saved plus the streak bonus — and resets the streak.</p>
          </section>
        </>
        )}

        <IgSocialNotice variant="card" />
      </main>

      <IgTabBar active="wallet" />
    </div>
  );
}

const CSS = `
.ig { --ink:#f0fff7; --mut:#83b39c; --faint:#5f8b76; --grn:#2ee08a; --grn2:#0e7a4a;
  --gold:#f0c94a; --gold-lite:#fff4cf; --gold-deep:#c68a2e; --antique:#e8c877; --loss:#ff6b7d;
  --line:rgba(240,201,74,0.22); --hair:rgba(255,255,255,0.06);
  min-height:100vh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif;
  padding-bottom:calc(78px + env(safe-area-inset-bottom,0px)); -webkit-tap-highlight-color:transparent;
  background:
    radial-gradient(90% 40% at 50% -6%, rgba(240,201,74,.10), transparent 55%),
    radial-gradient(120% 65% at 50% -4%, rgba(33,86,60,.82), transparent 58%),
    linear-gradient(180deg,#0c3320 0%, #06170e 46%, #030b07 100%); background-attachment:fixed; }
.ig * { box-sizing:border-box; }
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:54px; padding:0 8px 0 12px;
  background:linear-gradient(180deg, rgba(7,24,15,.95), rgba(7,24,15,.5)); -webkit-backdrop-filter:blur(16px); backdrop-filter:blur(16px);
  border-bottom:1px solid var(--line); box-shadow:0 1px 0 rgba(240,201,74,.16), 0 10px 26px -18px rgba(0,0,0,.8); }
.igbank-back { background:none; border:none; color:#cdead9; cursor:pointer; display:grid; place-items:center; width:38px; height:38px; border-radius:11px; transition:background .18s, transform .12s; }
.igbank-back:hover { background:rgba(255,255,255,.05); } .igbank-back:active { transform:scale(.9); } .igbank-back:disabled { opacity:.55; }
.ig-ttl { font-size:18px; font-weight:800; letter-spacing:.01em; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.ig-main { max-width:560px; margin:0 auto; }
.igbank-main { padding:16px 12px; display:flex; flex-direction:column; gap:14px; }

/* Savings hero — luxury gold-framed emerald cabinet + controlled sheen + shimmering value */
.igbank-hero { position:relative; overflow:hidden; text-align:center; padding:22px 16px 22px; border-radius:22px; color:var(--ink); border:1px solid transparent;
  background:radial-gradient(130% 120% at 50% 0%, rgba(240,201,74,0.18), transparent 56%), radial-gradient(120% 120% at 0% 0%, rgba(46,224,138,.14), transparent 58%), linear-gradient(160deg, rgba(21,78,50,.96), rgba(6,22,14,.97));
  box-shadow:inset 0 0 0 1.4px rgba(240,201,74,0.5), inset 0 1.6px 0 rgba(255,255,255,0.24), inset 0 0 30px rgba(46,224,138,0.1), 0 0 26px -8px rgba(240,201,74,0.5), 0 24px 48px -22px rgba(0,0,0,0.88); }
.igbank-hero::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(105deg, transparent 42%, rgba(255,244,207,0.14) 50%, transparent 58%); transform:translateX(-150%); animation:igbank-sweep 6.5s ease-in-out infinite; }
.igbank-badge { position:relative; z-index:1; display:inline-flex; align-items:center; gap:6px; font-size:10.5px; font-weight:900; letter-spacing:0.1em; text-transform:uppercase;
  padding:5px 13px; border-radius:999px; color:var(--antique); background:rgba(4,16,10,0.55); border:1px solid var(--line); }
.igbank-piggy { position:relative; z-index:1; width:96px; height:100px; margin:12px auto 4px; filter:drop-shadow(0 8px 16px rgba(0,0,0,0.55)); animation:igbank-bob 3s ease-in-out infinite; }
@keyframes igbank-bob { 0%,100% { transform:translateY(0) rotate(-2deg); } 50% { transform:translateY(-8px) rotate(2deg); } }
.igbank-saved-k { position:relative; z-index:1; font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--faint); }
.igbank-saved-v { position:relative; z-index:1; font-size:46px; font-weight:900; letter-spacing:-1px; line-height:1.05; font-variant-numeric:tabular-nums; margin-top:3px;
  background:linear-gradient(100deg,var(--gold-lite) 0%,#ffe9a8 22%,#f7d868 42%,#e0a93a 58%,#ffe9a8 80%,var(--gold-lite) 100%); background-size:220% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; animation:igbank-gold 5.5s ease-in-out infinite; }
.igbank-saved-v span { font-size:16px; -webkit-text-fill-color:var(--antique); }
.igbank-streak { position:relative; z-index:1; margin-top:10px; font-size:12px; font-weight:700; color:var(--mut); display:inline-flex; align-items:center; gap:5px;
  padding:6px 12px; border-radius:999px; background:rgba(4,16,10,.4); border:1px solid var(--hair); }
.igbank-streak svg { color:var(--gold); }
.igbank-streak b { color:var(--ink); }

/* Deep gold-framed emerald panels */
.igbank-panel { position:relative; border:1px solid transparent; border-radius:20px; padding:17px;
  background:linear-gradient(165deg, rgba(19,60,40,.92), rgba(6,20,13,.96));
  box-shadow:inset 0 0 0 1.3px rgba(240,201,74,.4), inset 0 1.5px 0 rgba(255,255,255,.13), inset 0 0 30px rgba(46,224,138,.07), 0 24px 48px -28px rgba(0,0,0,.9); }
.igbank-panel-h { display:flex; align-items:center; justify-content:space-between; font-size:11.5px; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; color:var(--ink); }
.igbank-bal { font-size:11px; font-weight:800; color:var(--antique); text-transform:none; letter-spacing:0; font-variant-numeric:tabular-nums; }
.igbank-quick { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin:13px 0; }
.igbank-chip { width:auto; padding:11px 4px; border-radius:12px; color:var(--ink); background:rgba(4,16,10,0.55); border:1px solid var(--line);
  font:900 12px/1 Inter,system-ui,sans-serif; cursor:pointer; font-variant-numeric:tabular-nums; -webkit-tap-highlight-color:transparent; transition:transform .12s; }
.igbank-chip:active { transform:translateY(1px); }
.igbank-chip.on { background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); color:#3a2708; border-color:transparent;
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.7), 0 0 14px -4px rgba(240,201,74,0.6); }
.igbank-chip:disabled { opacity:0.4; cursor:not-allowed; }

.igbank-save { width:100%; padding:15px; border-radius:14px; font-size:15px; font-weight:800; cursor:pointer;
  display:inline-flex; align-items:center; justify-content:center; gap:8px; color:#3a2708; border:1px solid rgba(255,255,255,.3);
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.7), inset 0 -3px 7px rgba(120,74,20,.22), 0 0 18px -3px rgba(240,201,74,0.6), 0 9px 20px -9px rgba(0,0,0,.6);
  font-family:inherit; transition:transform .12s, filter .12s; }
.igbank-save:disabled { opacity:0.5; cursor:not-allowed; }
.igbank-save:hover:not(:disabled) { filter:brightness(1.04); }
.igbank-save:active { transform:translateY(1.5px); }

.igbank-break-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:13px; }
.igbank-break-k { font-size:11.5px; font-weight:800; text-transform:uppercase; letter-spacing:0.12em; color:var(--ink); }
.igbank-break-sub { font-size:11px; font-weight:700; color:var(--mut); margin-top:3px; }
.igbank-break-v { font-size:23px; font-weight:900; color:var(--grn); font-variant-numeric:tabular-nums; letter-spacing:-.01em; text-shadow:0 0 14px rgba(46,224,138,.35); }
.igbank-break-btn { width:100%; padding:14px; border-radius:14px; font-size:14px; font-weight:800; cursor:pointer;
  display:inline-flex; align-items:center; justify-content:center; gap:8px; color:#04180e; border:none;
  background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.5), inset 0 -3px 7px rgba(0,0,0,.18), 0 0 16px -4px rgba(46,224,138,0.6), 0 9px 20px -9px rgba(0,0,0,.6);
  font-family:inherit; transition:transform .12s, filter .12s; }
.igbank-break-btn:disabled { opacity:0.45; cursor:not-allowed; }
.igbank-break-btn:hover:not(:disabled) { filter:brightness(1.04); }
.igbank-break-btn:active { transform:translateY(1.5px); }

.igbank-note { margin:11px 0 0; font-size:11px; font-weight:600; color:var(--faint); line-height:1.5; }

.igbank-sk { display:block; border-radius:20px; border:1px solid var(--hair);
  background:linear-gradient(100deg, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 70%), linear-gradient(165deg, rgba(19,60,40,.9), rgba(6,20,13,.95));
  background-size:200% 100%, 100% 100%; background-repeat:no-repeat; animation:igbank-sh 1.4s ease-in-out infinite; }
.igbank-sk-hero { height:300px; }
.igbank-sk-panel { height:160px; }
@keyframes igbank-sh { from { background-position:200% 0, 0 0; } to { background-position:-200% 0, 0 0; } }
.igbank-spin { animation:igbank-rot 0.8s linear infinite; }
@keyframes igbank-rot { to { transform:rotate(360deg); } }
@keyframes igbank-sweep { 0%,72% { transform:translateX(-150%); } 88%,100% { transform:translateX(150%); } }
@keyframes igbank-gold { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
@media (prefers-reduced-motion: reduce) {
  .igbank-piggy, .igbank-sk, .igbank-spin, .igbank-hero::after, .igbank-saved-v { animation:none !important; transform:none !important; background-position:0% 50% !important; }
  .igbank-save, .igbank-break-btn, .igbank-chip, .igbank-back { transition:none !important; }
  .igbank-save:active, .igbank-break-btn:active { transform:none; }
}
`;

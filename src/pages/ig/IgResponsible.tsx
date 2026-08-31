// IgResponsible (/ig/responsible) — Instagram-light reskin of ResponsibleGamblingPage.
// Same safer-gambling controls: daily deposit limit + self-exclusion, persisted in
// responsible_gambling and enforced server-side via set_responsible_gambling.
// All state, effects, the limit-setting handler (saveLimit) and the self-exclusion
// handler (selfExclude) — and every Supabase/RPC/auth call — are copied VERBATIM from
// the dark page. Only the returned JSX markup and CSS are new.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import IgTabBar from '@/components/ig/IgTabBar';
import IgSocialNotice from "@/components/ig/IgSocialNotice";

const LIMIT_TILES = [0, 1000, 5000, 10000, 25000, 50000] as const; // 0 = no limit
const BREAKS = [
  { days: 1,  label: '24 hours' },
  { days: 7,  label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 180, label: '6 months' },
] as const;

interface Row { daily_deposit_limit: number | null; self_excluded_until: string | null; }

export default function IgResponsible() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<Row | null>(null);
  const [limit, setLimit] = useState<string>('');
  const [savingLimit, setSavingLimit] = useState(false);
  const [excluding, setExcluding] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchRow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login?next=/responsible', { replace: true }); return; }
    const { data } = await supabase
      .from('responsible_gambling')
      .select('daily_deposit_limit, self_excluded_until')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) { setRow(data as Row); setLimit(data.daily_deposit_limit != null ? String(data.daily_deposit_limit) : ''); }
    setLoading(false);
  };

  useEffect(() => { fetchRow(); /* eslint-disable-next-line */ }, []);

  const excludedUntil = row?.self_excluded_until && new Date(row.self_excluded_until) > new Date()
    ? new Date(row.self_excluded_until) : null;

  const saveLimit = async () => {
    setSavingLimit(true); setMsg(null);
    const n = limit.trim() === '' ? null : Math.max(0, parseInt(limit, 10) || 0);
    const { error } = await supabase.rpc('set_responsible_gambling', { p_daily_limit: n, p_exclude_days: 0 });
    setSavingLimit(false);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    setMsg({ ok: true, text: n == null || n === 0 ? 'Daily deposit limit removed.' : `Daily deposit limit set to ${n.toLocaleString()}.` });
    fetchRow();
  };

  const selfExclude = async (days: number) => {
    if (!confirm(`Self-exclude for ${days >= 30 ? Math.round(days / 30) + ' month(s)' : days + ' day(s)'}? You will NOT be able to deposit or play until it ends. This cannot be shortened.`)) return;
    setExcluding(days); setMsg(null);
    const { error } = await supabase.rpc('set_responsible_gambling', { p_daily_limit: row?.daily_deposit_limit ?? null, p_exclude_days: days });
    setExcluding(null);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    setMsg({ ok: true, text: 'Self-exclusion activated. Take care of yourself.' });
    fetchRow();
  };

  return (
    <div className="ig igresp">
      <style>{CSS}</style>

      <header className="ig-top">
        <button className="igresp-back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/ig/settings'))} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <span className="ig-ttl">Responsible Gaming</span>
        <span style={{ width: 22 }} />
      </header>

      <main className="ig-main igresp-main">
        <section className="igresp-hero">
          <span className="igresp-hero-ic"><ShieldAlert size={26} /></span>
          <div className="igresp-badge"><ShieldAlert size={13} /><span>STAY IN CONTROL</span></div>
          <p className="igresp-note">Set a daily deposit limit or take a break. These tools are here to keep play safe — 18+.</p>
        </section>

        {loading ? (
          <div className="igresp-loading"><Loader2 size={26} className="igresp-spin" /></div>
        ) : excludedUntil ? (
          <section className="igresp-excluded">
            <Clock size={22} className="igresp-excluded-ic" />
            <div>
              <div className="igresp-excluded-t">You're self-excluded</div>
              <div className="igresp-excluded-s">
                Deposits and play are blocked until <b>{excludedUntil.toLocaleString()}</b>. This cannot be lifted early — it's there to protect you. If you need support, please reach out to a gambling-help service.
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* Daily deposit limit */}
            <div className="igresp-sec"><span className="igresp-sec-ic">💵</span>Daily deposit limit</div>
            <section className="igresp-card">
              <div className="igresp-tile-grid">
                {LIMIT_TILES.map((a) => (
                  <button key={a} type="button" className="igresp-tile" data-active={limit === String(a) || (a === 0 && limit === '')}
                    onClick={() => setLimit(a === 0 ? '' : String(a))}>
                    {a === 0 ? 'No limit' : a.toLocaleString()}
                  </button>
                ))}
              </div>
              <input className="igresp-input" type="number" inputMode="numeric" placeholder="Custom amount (blank = no limit)"
                value={limit} onChange={(e) => setLimit(e.target.value)} min={0} />
              <button className="igresp-save" onClick={saveLimit} disabled={savingLimit}>
                {savingLimit ? <Loader2 size={16} className="igresp-spin" /> : 'Save limit'}
              </button>
              <p className="igresp-hint">Your current limit: <b>{row?.daily_deposit_limit != null && row.daily_deposit_limit > 0 ? row.daily_deposit_limit.toLocaleString() : 'none'}</b>. Deposits above this are blocked for the day.</p>
            </section>

            {/* Self-exclusion */}
            <div className="igresp-sec"><span className="igresp-sec-ic">⏸️</span>Take a break (self-exclude)</div>
            <section className="igresp-card">
              <p className="igresp-hint igresp-hint-top">Block yourself from depositing and playing for a chosen period. <b>This cannot be shortened</b> once set.</p>
              <div className="igresp-break-grid">
                {BREAKS.map((b) => (
                  <button key={b.days} type="button" className="igresp-break" onClick={() => selfExclude(b.days)} disabled={excluding !== null}>
                    {excluding === b.days ? <Loader2 size={15} className="igresp-spin" /> : b.label}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {msg && (
          <div className={`igresp-result ${msg.ok ? 'ok' : 'err'}`}>
            {msg.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<span>{msg.text}</span>
          </div>
        )}

        <p className="igresp-foot">
          18+ · If gambling stops being fun, take a break. For confidential support, contact a gambling-help service in your country.
        </p>

        <IgSocialNotice variant="line" />
      </main>

      <IgTabBar active="profile" />
    </div>
  );
}

const CSS = `
.ig { --bg:#07130d; --card:#103524; --card2:#12492f; --line:rgba(240,201,74,0.24); --hair:rgba(255,255,255,0.06); --ink:#f0fff7; --mut:#93c3aa; --faint:#5f8b76; --grn:#2ee08a; --grn2:#0e7a4a; --gold:#f0c94a; --gold-lite:#fff4cf; --gold-deep:#c68a2e; --antique:#e8c877; --loss:#ff6b7d;
  min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif; padding-bottom:calc(76px + env(safe-area-inset-bottom));
  background: radial-gradient(90% 40% at 50% -6%, rgba(240,201,74,0.08), transparent 55%), radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%), linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%); background-attachment:fixed; }
.ig * { box-sizing:border-box; }
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:54px; padding:0 12px;
  background:linear-gradient(180deg, rgba(9,32,20,0.95), rgba(9,32,20,0.55)); -webkit-backdrop-filter:blur(16px); backdrop-filter:blur(16px); border-bottom:1px solid var(--line); box-shadow:0 1px 0 rgba(240,201,74,0.16); }
.igresp-back { background:none; border:none; color:#cdead9; cursor:pointer; display:grid; place-items:center; width:38px; height:38px; border-radius:11px; }
.ig-ttl { font-size:18px; font-weight:800; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.ig-main { max-width:560px; margin:0 auto; }
.igresp-main { padding:16px 14px 24px; }

/* Shield hero — cinematic gold-framed emerald cabinet + sheen sweep */
.igresp-hero { position:relative; overflow:hidden; text-align:center; padding:22px 18px 18px; border-radius:22px; margin-bottom:6px; border:1px solid transparent;
  background:radial-gradient(130% 120% at 50% 0%, rgba(240,201,74,0.16), transparent 56%), radial-gradient(120% 120% at 50% 8%, rgba(46,224,138,0.14), transparent 60%), linear-gradient(160deg,#123f29,#06180f);
  box-shadow:inset 0 0 0 1.4px rgba(240,201,74,0.46), inset 0 1.6px 0 rgba(255,255,255,0.22), inset 0 0 30px rgba(46,224,138,0.08), 0 0 26px -8px rgba(240,201,74,0.42), 0 24px 48px -22px rgba(0,0,0,0.88); }
.igresp-hero::after { content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(105deg, transparent 42%, rgba(255,244,207,0.13) 50%, transparent 58%); transform:translateX(-150%); animation:igresp-sweep 7s ease-in-out infinite; }
@keyframes igresp-sweep { 0%,74% { transform:translateX(-150%); } 90%,100% { transform:translateX(150%); } }
.igresp-hero-ic { position:relative; z-index:1; width:58px; height:58px; margin:0 auto 10px; border-radius:17px; display:grid; place-items:center; color:#3a2708;
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.7), inset 0 -3px 7px rgba(120,74,20,0.22), 0 0 20px -3px rgba(240,201,74,0.6), 0 10px 22px -10px rgba(0,0,0,0.7); }
.igresp-badge { position:relative; z-index:1; display:inline-flex; align-items:center; gap:6px; padding:5px 13px; border-radius:999px; color:var(--antique); font-size:10px; font-weight:900; letter-spacing:0.12em;
  background:rgba(4,16,10,0.55); border:1px solid var(--line); }
.igresp-note { position:relative; z-index:1; margin:10px auto 0; max-width:340px; font-size:12px; color:var(--mut); line-height:1.5; }

.igresp-loading { padding:60px; text-align:center; color:var(--mut); }

.igresp-excluded { display:flex; gap:12px; align-items:flex-start; margin-top:16px; border:1px solid transparent; border-radius:20px; padding:18px;
  background:radial-gradient(130% 120% at 100% 0%, rgba(255,107,125,0.15), transparent 60%), linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96));
  box-shadow:inset 0 0 0 1.3px rgba(255,107,125,0.5), inset 0 1.5px 0 rgba(255,255,255,0.08), 0 0 22px -10px rgba(255,107,125,0.4), 0 24px 48px -28px rgba(0,0,0,0.9); }
.igresp-excluded-ic { color:var(--loss); flex-shrink:0; }
.igresp-excluded-t { font-size:16px; font-weight:800; color:#ffd7dd; }
.igresp-excluded-s { font-size:12.5px; color:var(--mut); margin-top:5px; line-height:1.5; }
.igresp-excluded-s b { color:var(--ink); font-weight:800; }

.igresp-sec { margin:20px 4px 9px; font-size:11px; font-weight:800; letter-spacing:0.8px; text-transform:uppercase; color:#f3ffe9; display:flex; align-items:center; gap:7px; }
.igresp-sec-ic { font-size:13px; }
.igresp-card { border:1px solid transparent; border-radius:20px; padding:16px;
  background:linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96)); box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.38), inset 0 1.5px 0 rgba(255,255,255,0.12), inset 0 0 30px rgba(46,224,138,0.06), 0 24px 48px -28px rgba(0,0,0,0.9); }

.igresp-tile-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.igresp-tile { padding:13px 4px; border-radius:12px; border:1px solid var(--line); background:rgba(4,16,10,0.55); color:#eafff4; font-size:13px; font-weight:700; cursor:pointer; font-variant-numeric:tabular-nums; }
.igresp-tile[data-active="true"] { border-color:transparent; color:#04180e; background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.5), 0 0 14px -4px rgba(46,224,138,0.6); }
.igresp-input { width:100%; margin-top:10px; background:rgba(4,16,10,0.6); border:1px solid var(--line); border-radius:11px; padding:12px 13px; color:var(--ink); font-size:16px; font-weight:600; outline:none; font-family:inherit; transition:border-color .15s, box-shadow .15s; }
.igresp-input:focus { border-color:var(--grn); box-shadow:0 0 0 3px rgba(46,224,138,0.18); }
.igresp-input::placeholder { color:var(--faint); font-weight:500; }
.igresp-save { width:100%; margin-top:12px; display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:13px; border-radius:13px; cursor:pointer;
  background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); border:none; color:#04180e; font-size:13px; font-weight:900; text-transform:uppercase; letter-spacing:0.5px;
  box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.5), 0 0 16px -4px rgba(46,224,138,0.6), 0 6px 14px -6px rgba(0,0,0,0.5); }
.igresp-save:active { transform:translateY(1px); }
.igresp-save:disabled { opacity:0.6; cursor:default; }
.igresp-hint { font-size:11.5px; color:var(--mut); margin:12px 0 0; line-height:1.5; }
.igresp-hint b { color:var(--ink); font-weight:800; }
.igresp-hint-top { margin:0 0 12px; }

.igresp-break-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
.igresp-break { padding:14px; border-radius:12px; border:1px solid rgba(255,107,125,0.45); background:rgba(255,107,125,0.1); color:#ff97a5; font-size:13px; font-weight:800; cursor:pointer; font-family:inherit; display:inline-flex; align-items:center; justify-content:center; }
.igresp-break:active { transform:translateY(1px); }
.igresp-break:disabled { opacity:0.5; cursor:not-allowed; }

.igresp-result { display:flex; align-items:center; gap:10px; margin-top:16px; padding:13px 14px; border-radius:13px; border:1px solid; font-size:13px; font-weight:600; }
.igresp-result.ok { border-color:rgba(46,224,138,0.45); color:var(--grn); background:rgba(46,224,138,0.1); }
.igresp-result.err { border-color:rgba(255,107,125,0.45); color:#ff97a5; background:rgba(255,107,125,0.1); }

.igresp-foot { margin:24px 0 0; text-align:center; font-size:11px; color:var(--mut); line-height:1.6; }

.igresp-spin { animation:igresp-spin 1s linear infinite; }
@keyframes igresp-spin { to { transform:rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .igresp-spin, .igresp-hero::after { animation:none; } .igresp-save:active, .igresp-break:active { transform:none; } }
`;

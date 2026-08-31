/**
 * ResponsibleGamblingPage — player self-service safer-gambling controls.
 *
 * The player-dashboard surface (parallel to the admin view). Sets a daily
 * deposit limit and self-exclusion, persisted in responsible_gambling and
 * enforced server-side in request_manual_deposit().
 *
 * Route: /responsible
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
// V3 reset: legacy c7-sun27-compat token module dropped — local c7p palette map.
const t = { colors: { emerald: { 500: '#12a04f' }, text: { secondary: 'rgba(234,255,244,0.82)', tertiary: 'rgba(234,255,244,0.55)', muted: 'rgba(234,255,244,0.40)' } } } as const;
import { supabase } from '@/integrations/supabase/client';

const BRAND = '#e02b3c';
const WIN   = t.colors.emerald[500];

const LIMIT_TILES = [0, 1000, 5000, 10000, 25000, 50000] as const; // 0 = no limit
const BREAKS = [
  { days: 1,  label: '24 hours' },
  { days: 7,  label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 180, label: '6 months' },
] as const;

interface Row { daily_deposit_limit: number | null; self_excluded_until: string | null; }

export default function ResponsibleGamblingPage() {
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
    <div className="c7p-page" style={{ minHeight: '100vh', color: '#fff', paddingBottom: 'calc(128px + env(safe-area-inset-bottom, 0px))' }}>
      <Styles />

      <header className="c7p-pg-bar">
        <button className="c7p-pg-back" onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft size={18} /></button>
        <span className="c7p-pg-title c7p-gold-text">Responsible Gambling</span>
      </header>

      <div className="rg-note-row">
        <div className="rg-badge"><ShieldAlert size={14} /><span>STAY IN CONTROL</span></div>
        <p className="rg-note">Set a daily deposit limit or take a break. These tools are here to keep play safe — 18+.</p>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: t.colors.text.tertiary }}><Loader2 size={26} className="rg-spin" /></div>
      ) : excludedUntil ? (
        <section style={{ padding: '12px 16px' }}>
          <div className="rg-card" style={{ borderColor: `${BRAND}66`, padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Clock size={22} color={BRAND} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>You're self-excluded</div>
                <div style={{ fontSize: 12.5, color: t.colors.text.secondary, marginTop: 5, lineHeight: 1.5 }}>
                  Deposits and play are blocked until <b style={{ color: '#fff' }}>{excludedUntil.toLocaleString()}</b>. This cannot be lifted early — it's there to protect you. If you need support, please reach out to a gambling-help service.
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Daily deposit limit */}
          <section style={{ padding: '8px 16px 0' }}>
            <SectionLabel icon="💵">Daily deposit limit</SectionLabel>
            <div className="rg-tile-grid">
              {LIMIT_TILES.map((a) => (
                <button key={a} type="button" className="c7p-glass rg-tile" data-active={limit === String(a) || (a === 0 && limit === '')}
                  onClick={() => setLimit(a === 0 ? '' : String(a))}>
                  {a === 0 ? 'No limit' : a.toLocaleString()}
                </button>
              ))}
            </div>
            <input className="rg-input" type="number" inputMode="numeric" placeholder="Custom amount (blank = no limit)"
              value={limit} onChange={(e) => setLimit(e.target.value)} min={0} style={{ marginTop: 10 }} />
            <button className="c7p-btn-green rg-save" onClick={saveLimit} disabled={savingLimit} style={{ marginTop: 12 }}>
              {savingLimit ? <Loader2 size={16} className="rg-spin" /> : 'Save limit'}
            </button>
            <p className="rg-hint">Your current limit: <b>{row?.daily_deposit_limit != null && row.daily_deposit_limit > 0 ? row.daily_deposit_limit.toLocaleString() : 'none'}</b>. Deposits above this are blocked for the day.</p>
          </section>

          {/* Self-exclusion */}
          <section style={{ padding: '20px 16px 0' }}>
            <SectionLabel icon="⏸️">Take a break (self-exclude)</SectionLabel>
            <p className="rg-hint" style={{ marginTop: 0, marginBottom: 10 }}>Block yourself from depositing and playing for a chosen period. <b>This cannot be shortened</b> once set.</p>
            <div className="rg-break-grid">
              {BREAKS.map((b) => (
                <button key={b.days} type="button" className="rg-break" onClick={() => selfExclude(b.days)} disabled={excluding !== null}>
                  {excluding === b.days ? <Loader2 size={15} className="rg-spin" /> : b.label}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {msg && (
        <section style={{ padding: '16px 16px 0' }}>
          <div className="rg-result" style={{ borderColor: msg.ok ? `${WIN}88` : `${BRAND}88`, color: msg.ok ? WIN : '#ff8089', background: msg.ok ? `${WIN}14` : `${BRAND}14` }}>
            {msg.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<span>{msg.text}</span>
          </div>
        </section>
      )}

      <section style={{ padding: '24px 16px 0', textAlign: 'center' }}>
        <p style={{ fontSize: 10.5, color: t.colors.text.muted, lineHeight: 1.6 }}>
          18+ · If gambling stops being fun, take a break. For confidential support, contact a gambling-help service in your country.
        </p>
      </section>
    </div>
  );
}

function SectionLabel({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="c7p-sec rg-sec">
      <span className="c7p-sec-ic">{icon}</span>
      <span className="c7p-sec-t">{children}</span>
      <span className="c7p-sec-rule" />
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      @keyframes rg-spin { to { transform: rotate(360deg); } }
      .rg-spin { animation: rg-spin 1s linear infinite; }
      .rg-card { background: linear-gradient(180deg, #0e2c1c, #0b2417); border: 1px solid rgba(107,245,163,0.28); border-radius: 18px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 24px -10px rgba(0,0,0,0.6); }
      .rg-note-row { padding: 14px 16px 6px; text-align: center; }
      .rg-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 999px; background: linear-gradient(180deg, #d6ffe9, #35d98a 45%, #0b7a3f); color: #06301c; font-size: 10px; font-weight: 900; letter-spacing: 1.2px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.6); }
      .rg-note { margin: 8px 0 0; font-size: 11px; color: rgba(255,255,255,0.55); }
      /* c7p-sec header inside a padded section — reset the shared top margin */
      .rg-sec { margin: 4px 0 11px; }
      .rg-tile-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      /* Tile surface comes from shared .c7p-glass; keep only shape/type + active state */
      .rg-tile { padding: 13px 4px; border-radius: 12px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; font-variant-numeric: tabular-nums; }
      .rg-save { width: 100%; }
      .rg-tile[data-active="true"] { border-color: #35d98a; color: #06301c; background: radial-gradient(120% 100% at 50% 12%, rgba(255,255,255,0.7), transparent 52%), linear-gradient(180deg, #d6ffe9, #35d98a 45%, #0b7a3f); box-shadow: inset 0 1px 0 rgba(255,255,255,0.6); }
      .rg-input { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(107,245,163,0.25); border-radius: 12px; padding: 13px 14px; color: #fff; font-size: 16px; font-weight: 600; outline: none; font-family: inherit; }
      .rg-input:focus { border-color: #2ee08a; box-shadow: 0 0 0 3px rgba(46,224,138,0.18); }
      .rg-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; font-size: 15px; font-weight: 900; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; }
      .rg-btn--primary { background: radial-gradient(120% 100% at 50% 12%, rgba(255,255,255,0.7), transparent 52%), linear-gradient(180deg, #d6ffe9, #35d98a 45%, #0b7a3f); color: #06301c; box-shadow: 0 5px 0 #095e30, inset 0 1px 0 rgba(255,255,255,0.7); }
      .rg-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .rg-hint { font-size: 11px; color: rgba(255,255,255,0.5); margin: 10px 0 0; line-height: 1.5; }
      .rg-break-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
      .rg-break { padding: 14px; border-radius: 12px; border: 1px solid rgba(224,43,60,0.35); background: rgba(224,43,60,0.08); color: #ff8089; font-size: 13px; font-weight: 800; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; justify-content: center; }
      .rg-break:disabled { opacity: 0.5; cursor: not-allowed; }
      .rg-result { display: flex; align-items: center; gap: 10px; padding: 13px 14px; border-radius: 12px; border: 1px solid; font-size: 13px; font-weight: 600; }
    `}</style>
  );
}

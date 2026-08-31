/**
 * TransactionsPage — unified account history (/transactions).
 *
 * One place for every money movement: deposits, withdrawals, bets, wins and
 * bonuses, from the same `casino_transactions` source the wallet uses. Filter
 * tabs + day grouping + per-game icons. On-brand green. Auth-guarded.
 */
import { useEffect, useMemo, useState } from 'react';
import { num } from "@/lib/format";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import LuxFrameFX from '@/components/c7/shell/LuxFrameFX';
import C7Icon from '@/components/c7/C7Icon';
import C7ErrorState from '@/components/c7/C7ErrorState';

type Txn = { id: string; type: string; amount: number; status: string; createdAt: string; description?: string; gameType?: string };
type FilterKey = 'all' | 'deposit' | 'withdraw' | 'bets' | 'wins' | 'bonus';

const WIN = '#22e07a', LOSS = '#ff5470';

const GAME_EMOJI: Record<string, string> = {
  aviator: '✈️', jetx: '🚀', spaceman: '👨‍🚀', crash: '🚀', mines: '💣', plinko: '🎯', pachinko: '🎯',
  'teen patti': '🃏', blackjack: '🃏', baccarat: '💎', rummy: '🃏', andar: '🎴', hilo: '🎴',
  roulette: '🎡', wingo: '🎡', wheel: '🎡', slots: '🎰', limbo: '📉', coinflip: '🪙', keno: '🔢',
  dragon: '🐉', starburst: '⭐', 'sweet bonanza': '🍬', 'wolf gold': '🐺', 'book of dead': '📖', 'fruit party': '🍓', dice: '🎲',
};
function gameEmoji(s: string) { const dl = s.toLowerCase(); for (const k of Object.keys(GAME_EMOJI)) if (dl.includes(k)) return GAME_EMOJI[k]; return null; }
function txnEmoji(t: Txn) {
  const k = t.type.toLowerCase();
  if (/bet|wager|win|payout/.test(k)) { const e = gameEmoji(`${t.gameType || ''} ${t.description || ''}`); if (e) return e; }
  if (k.includes('deposit')) return '⬇️';
  if (k.includes('withdraw')) return '⬆️';
  if (k.includes('bet') || k.includes('wager')) return '🎲';
  if (k.includes('win') || k.includes('payout')) return '🏆';
  if (k.includes('bonus')) return '🎁';
  if (k.includes('refund')) return '↩️';
  if (k.includes('transfer')) return '🔁';
  return '◆';
}
const KNOWN = ['crash','mines','plinko','slots','blackjack','roulette','baccarat','keno','limbo','hilo','dice','wheel','coinflip','jetx','aviator','spaceman','rummy','andar','teen patti','starburst','sweet bonanza','wolf gold','book of dead','fruit party','dragon','wingo'];
function txnLabel(t: Txn) {
  const desc = (t.description || '').trim();
  const k = t.type.toLowerCase();
  if (/bet|win|wager|payout/.test(k) && desc && KNOWN.some((g) => desc.toLowerCase().includes(g))) return desc.charAt(0).toUpperCase() + desc.slice(1);
  return t.type.replace(/_/g, ' ');
}
function isCredit(t: Txn) {
  const k = t.type.toLowerCase();
  if (/deposit|win|payout|bonus|refund|transfer_in/.test(k)) return true;
  if (/withdraw|bet|wager|transfer_out|transfer/.test(k)) return false;
  return t.amount >= 0;
}
function matchFilter(f: FilterKey, t: Txn) {
  const k = t.type.toLowerCase();
  switch (f) {
    case 'all': return true;
    case 'deposit': return k.includes('deposit');
    case 'withdraw': return k.includes('withdraw');
    case 'bets': return k.includes('bet') || k.includes('wager');
    case 'wins': return k.includes('win') || k.includes('payout');
    case 'bonus': return k.includes('bonus');
  }
}
function dayBucket(iso: string): 'Today' | 'Yesterday' | 'Earlier' {
  const d = new Date(iso), t0 = new Date();
  const y0 = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate());
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (dd.getTime() === y0.getTime()) return 'Today';
  if (dd.getTime() === y0.getTime() - 86400000) return 'Yesterday';
  return 'Earlier';
}
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
const fmt = (n: number) => num(n, { locale: null, max: 2 });

const TABS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'deposit', label: 'Deposits' }, { key: 'withdraw', label: 'Withdrawals' },
  { key: 'bets', label: 'Bets' }, { key: 'wins', label: 'Wins' }, { key: 'bonus', label: 'Bonuses' },
];

export default function TransactionsPage() {
  const nav = useNavigate();
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(false);
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const mapRow = (r: any): Txn => ({
      id: String(r.id), type: String(r.type ?? 'transaction'), amount: Number(r.amount ?? 0),
      status: String(r.status ?? ''), createdAt: String(r.created_at ?? ''),
      description: r.description ? String(r.description) : undefined, gameType: r.game_type ? String(r.game_type) : undefined,
    });
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (!uid) { if (!cancelled) { setTxns([]); setLoading(false); } return; }
        const { data, error } = await supabase.from('casino_transactions')
          .select('id, type, amount, status, created_at, description, game_type')
          .eq('user_id', uid).order('created_at', { ascending: false }).limit(200);
        if (error) throw error;
        if (cancelled) return;
        setTxns((data ?? []).map(mapRow));
        // Live updates — new bets/wins/deposits appear instantly (no polling).
        channel = supabase
          .channel(`tx-${uid}`)
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'casino_transactions', filter: `user_id=eq.${uid}` },
            (payload) => {
              const r = (payload.new ?? payload.old) as any;
              if (!r?.id) return;
              const row = mapRow(r);
              setTxns((prev) => {
                if (payload.eventType === 'DELETE') return prev.filter((t) => t.id !== row.id);
                const idx = prev.findIndex((t) => t.id === row.id);
                if (idx >= 0) { const n = [...prev]; n[idx] = row; return n; }
                return [row, ...prev].slice(0, 200);
              });
            })
          .subscribe();
      } catch { if (!cancelled) { setTxns([]); setError(true); } } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [reloadKey]);

  const shown = useMemo(() => txns.filter((t) => matchFilter(filter, t)), [txns, filter]);
  const groups = useMemo(() => {
    const g: Record<string, Txn[]> = {};
    for (const t of shown) { const b = dayBucket(t.createdAt); (g[b] ||= []).push(t); }
    return (['Today', 'Yesterday', 'Earlier'] as const).filter((d) => g[d]?.length).map((d) => ({ day: d, items: g[d] }));
  }, [shown]);

  return (
    <div className="c7p-page tx-root">
      <style>{TX_CSS}</style>
      <header className="tx-bar c7-lux-head">
        <LuxFrameFX />
        <div className="tx-bar-row">
          <button className="tx-back" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/v3/wallet'))} aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <span className="tx-title">Transactions</span>
        </div>
        <div className="tx-tabs">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setFilter(t.key)} className={`tx-tab${filter === t.key ? ' tx-tab-on' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="tx-main">
        {loading ? (
          <div className="tx-group" aria-busy="true" aria-label="Loading transactions">
            <div className="c7p-skel c7p-skel--line tx-sk-day" style={{ width: 96 }} />
            <div className="c7p-panel tx-panel">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="tx-row" style={{ borderTop: i ? '1px solid rgba(255,255,255,0.055)' : 'none' }}>
                  <span className="c7p-skel c7p-skel--circle tx-sk-ic" />
                  <div className="tx-body">
                    <div className="c7p-skel c7p-skel--line" style={{ width: '58%', marginBottom: 6 }} />
                    <div className="c7p-skel c7p-skel--line" style={{ width: '34%', height: 9 }} />
                  </div>
                  <span className="c7p-skel c7p-skel--line tx-sk-amt" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <C7ErrorState
            title="Couldn't load transactions"
            message="We couldn't reach your transaction history. Check your connection and try again."
            onRetry={() => setReloadKey((k) => k + 1)}
          />
        ) : shown.length === 0 ? (
          <div className="tx-empty">
            <div style={{ marginBottom: 8 }}><C7Icon name="receipt" size={40} /></div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 4 }}>No transactions</div>
            <div style={{ fontSize: 12 }}>Deposits, bets, wins and bonuses will appear here.</div>
          </div>
        ) : groups.map((grp) => (
          <div key={grp.day} className="tx-group">
            <div className="c7p-sec tx-group-h"><span className="c7p-sec-ic"><C7Icon name="calendar" size={14} /></span><span className="c7p-sec-t">{grp.day}</span><span className="c7p-sec-rule" /></div>
            <div className="c7p-panel tx-panel">
              {grp.items.map((t, i) => {
                const credit = isCredit(t);
                return (
                  <div key={t.id} className="tx-row" style={{ borderTop: i ? '1px solid rgba(255,255,255,0.055)' : 'none' }}>
                    <span className={`tx-ic${credit ? ' tx-ic-cr' : ' tx-ic-db'}`}>{txnEmoji(t)}</span>
                    <div className="tx-body">
                      <div className="tx-label">{txnLabel(t)}</div>
                      <div className="tx-meta">
                        {timeAgo(t.createdAt)}
                        {t.status && t.status.toLowerCase() !== 'completed' && (
                          <span className="tx-status">{t.status}</span>
                        )}
                      </div>
                    </div>
                    <span className="tx-amt" style={{ color: credit ? WIN : LOSS }}>
                      {credit ? '+' : '−'}{fmt(Math.abs(t.amount))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

const TX_CSS = `
.tx-root { min-height: 100vh; color: #fff; padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px)); font-family: Inter, system-ui, sans-serif; }
.tx-bar { position: sticky; top: 0; z-index: 20; padding: 14px 16px 10px;
  background: linear-gradient(180deg, rgba(6,26,16,0.95), rgba(6,26,16,0.55)); backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(120,240,176,0.28); }
.tx-bar::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(46,230,130,0.85), rgba(255,214,120,0.95), rgba(46,230,130,0.85), transparent);
  background-size: 220% 100%; animation: tx-topglimmer 5.5s linear infinite; opacity: 0.9; }
@keyframes tx-topglimmer { 0% { background-position: 220% 0; } 100% { background-position: -220% 0; } }
.tx-bar-row { display: flex; align-items: center; gap: 10px; }
.tx-back { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(120,240,176,0.35);
  color: #d6ffe9; display: grid; place-items: center; cursor: pointer; }
.tx-title { font-size: 18px; font-weight: 900; letter-spacing: 0.3px;
  background: linear-gradient(180deg, #ffffff 4%, #d6ffe9 40%, #ffe9a8 74%, #f5b423 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 12px rgba(46,230,130,0.45)) drop-shadow(0 1px 1px rgba(0,0,0,0.5)); }
@media (prefers-reduced-motion: reduce) { .tx-bar::after { animation: none; } }
.tx-filter-ic { color: #9df5c4; }
.tx-tabs { display: flex; gap: 7px; overflow-x: auto; margin-top: 11px; padding-bottom: 2px; scrollbar-width: none; }
.tx-tabs::-webkit-scrollbar { display: none; }
.tx-tab { flex-shrink: 0; padding: 7px 14px; border-radius: 999px; font-size: 11.5px; font-weight: 800; cursor: pointer; white-space: nowrap;
  color: rgba(255,255,255,0.7); border: 1px solid rgba(120,240,176,0.2); background: rgba(0,0,0,0.25); transition: all .15s; }
.tx-tab-on { color: #06180f; border-color: rgba(120,240,176,0.7);
  background: radial-gradient(120% 100% at 50% 12%, rgba(255,255,255,0.55), transparent 52%), linear-gradient(180deg,#9ffcc4,#35d98a 45%,#0b7a3f);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.55), 0 4px 12px -3px rgba(46,230,130,0.5); }
.tx-main { max-width: 520px; margin: 0 auto; padding: 14px; }
.tx-empty { text-align: center; color: rgba(255,255,255,0.55); padding: 66px 20px; font-size: 13px; }
.tx-group { margin-bottom: 6px; }
.tx-group-h { margin: 16px 2px 9px; font-size: 11px; letter-spacing: 1.4px; color: #b9f6d0; }
.tx-panel { padding: 2px 0; overflow: hidden; border-radius: 16px;
  background: radial-gradient(130% 60% at 100% 0%, rgba(53,217,138,0.12), transparent 55%), linear-gradient(160deg, #0f7a4e, #05301e);
  border: 1px solid rgba(53,217,138,0.28); box-shadow: inset 0 0 0 1px rgba(245,180,35,0.12), inset 0 1px 0 rgba(255,247,220,0.12), 0 10px 24px -12px rgba(0,0,0,0.6); }
.tx-row { display: flex; align-items: center; gap: 11px; padding: 12px 14px; }
.tx-ic { width: 38px; height: 38px; border-radius: 11px; display: inline-flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
  border: 1px solid rgba(120,240,176,0.28);
  box-shadow: 0 0 0 1px rgba(245,180,35,0.22), 0 4px 12px -6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.14);
  animation: tx-icfloat 3.5s ease-in-out infinite, tx-icglow 2.8s ease-in-out infinite; will-change: transform, filter; }
@keyframes tx-icfloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
@keyframes tx-icglow { 0%,100% { filter: drop-shadow(0 1px 1px rgba(0,0,0,0.35)); } 50% { filter: drop-shadow(0 0 6px rgba(120,240,176,0.6)) brightness(1.05); } }
.tx-ic-cr { background: linear-gradient(160deg, rgba(46,224,138,0.24), rgba(46,224,138,0.06)); }
.tx-ic-db { background: linear-gradient(160deg, rgba(255,84,112,0.18), rgba(255,84,112,0.04)); }
@media (prefers-reduced-motion: reduce) { .tx-ic { animation: none !important; } }
.tx-body { flex: 1; min-width: 0; }
.tx-label { font-size: 13px; font-weight: 800; text-transform: capitalize; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tx-meta { font-size: 10px; color: rgba(255,255,255,0.45); margin-top: 2px; font-weight: 700; }
.tx-status { margin-left: 7px; padding: 1px 6px; font-size: 8px; font-weight: 900; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.8px;
  background: rgba(246,201,69,0.15); color: #ffe9a8; }
.tx-amt { font-size: 14px; font-weight: 900; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.tx-sk-day { margin: 16px 2px 9px; }
.tx-sk-ic { width: 38px; height: 38px; flex-shrink: 0; }
.tx-sk-amt { width: 48px; height: 14px; flex-shrink: 0; }
`;

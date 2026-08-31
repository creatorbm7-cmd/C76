/**
 * NotificationsPage — premium user notifications inbox (/notifications).
 *
 * Realtime feed (deposit / withdrawal / VIP / referral / bonus / security) from
 * the `notifications` table via useNotifications. Every card is premium: an
 * animated category icon, a colored status pill, the amount, a reference chip,
 * a CTA button, relative time, and an unread glow. Category filter chips on top.
 * On-brand emerald/gold, 60fps (transform/opacity), reduced-motion safe.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { useNotifications, type NotificationRow } from '@/hooks/useNotifications';
import { usd } from '@/lib/format';
import LuxFrameFX from '@/components/c7/shell/LuxFrameFX';
import C7Icon, { type C7IconName } from '@/components/c7/C7Icon';
import C7ErrorState from '@/components/c7/C7ErrorState';

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

// Category → premium C7Icon glyph.
const ICONS: Record<string, C7IconName> = {
  deposit: 'coin', withdrawal: 'wallet', withdraw: 'wallet', vip: 'crown', referral: 'handshake',
  bonus: 'gift', security: 'shield', login: 'shield', kyc: 'shield', promo: 'star', event: 'calendar',
  leaderboard: 'trophy', wheel: 'star', success: 'check', error: 'bell', warning: 'bell', info: 'bell',
};
const iconFor = (n: NotificationRow): C7IconName =>
  (n.meta?.icon ? ICONS[String(n.meta.icon).toLowerCase()] : undefined) || ICONS[n.type?.toLowerCase()] || 'bell';

// Status → pill palette.
const STATUS_TONE: Record<string, 'good' | 'bad' | 'warn' | 'info'> = {
  success: 'good', approved: 'good', credited: 'good', earned: 'good', upgraded: 'good', completed: 'good', paid: 'good',
  declined: 'bad', rejected: 'bad', failed: 'bad', cancelled: 'bad',
  pending: 'warn', processing: 'warn',
};
const toneFor = (s?: string) => (s ? STATUS_TONE[s.toLowerCase()] ?? 'info' : 'info');

const FILTERS: { key: string; label: string; match: (t: string) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'money', label: 'Money', match: (t) => ['deposit', 'withdrawal', 'withdraw'].includes(t) },
  { key: 'rewards', label: 'Rewards', match: (t) => ['bonus', 'vip', 'referral', 'wheel', 'leaderboard', 'promo', 'event'].includes(t) },
  { key: 'security', label: 'Security', match: (t) => ['security', 'login', 'kyc'].includes(t) },
];

function fmtAmount(n: NotificationRow): string | null {
  const a = n.meta?.amount;
  if (a == null || isNaN(Number(a))) return null;
  // App money is USD (rpc_user_stats.currency === "USD") — match V3Lobby's formatter.
  return usd(Number(a), { locale: null, min: 2 });
}

export default function NotificationsPage() {
  const nav = useNavigate();
  const { items, unreadCount, loading, error, markRead, markAllRead, refresh } = useNotifications(80);
  const [filter, setFilter] = useState('all');

  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const shown = useMemo(() => items.filter((n) => active.match((n.type || '').toLowerCase())), [items, active]);

  const open = (n: NotificationRow) => {
    if (!n.is_read) markRead(n.id);
    const route = n.meta?.cta_route;
    if (route) nav(route);
  };

  return (
    <div className="c7p-page nt-root">
      <style>{NT_CSS}</style>
      <header className="nt-bar c7-lux-head">
        <LuxFrameFX />
        <button className="nt-back" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <span className="nt-title">Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}</span>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="nt-markall"><CheckCheck size={13} /> Mark all read</button>
        )}
        <span className="nt-glim" aria-hidden="true" />
      </header>

      <div className="nt-filters">
        {FILTERS.map((f) => {
          const c = f.key === 'all' ? items.length : items.filter((n) => f.match((n.type || '').toLowerCase())).length;
          return (
            <button key={f.key} className={`c7p-chip nt-chip${filter === f.key ? ' nt-chip-on' : ''}`} onClick={() => setFilter(f.key)}>
              {f.label}{c > 0 && <span className="nt-chip-c">{c}</span>}
            </button>
          );
        })}
      </div>

      <main className="nt-main">
        {loading ? (
          <div className="nt-list" aria-busy="true" aria-label="Loading notifications">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="c7p-panel nt-card nt-sk-card">
                <span className="c7p-skel c7p-skel--circle nt-sk-ic" />
                <div className="nt-body" style={{ flex: 1, minWidth: 0 }}>
                  <div className="c7p-skel c7p-skel--line" style={{ width: '52%', marginBottom: 8 }} />
                  <div className="c7p-skel c7p-skel--line" style={{ width: '84%', height: 9, marginBottom: 8 }} />
                  <div className="c7p-skel c7p-skel--line" style={{ width: '30%', height: 9 }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <C7ErrorState
            title="Couldn't load notifications"
            message="We couldn't reach your notifications. Check your connection and try again."
            onRetry={() => refresh()}
          />
        ) : shown.length === 0 ? (
          <div className="nt-empty">
            <Bell size={30} style={{ opacity: 0.4, marginBottom: 10 }} />
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 4 }}>No notifications yet</div>
            <div style={{ fontSize: 12 }}>Deposits, withdrawals, rewards and security alerts show up here — instantly.</div>
          </div>
        ) : (
          <div className="nt-list">
            {shown.map((n) => {
              const amt = fmtAmount(n);
              const tone = toneFor(n.meta?.status);
              const ref = n.meta?.reference ? String(n.meta.reference) : null;
              return (
                <button key={n.id} className={`c7p-panel nt-card nt-tone-${tone}${n.is_read ? '' : ' nt-unread'}`} onClick={() => open(n)}>
                  <span className="nt-ic" aria-hidden="true"><C7Icon name={iconFor(n)} size={20} /></span>
                  <div className="nt-body">
                    <div className="nt-head">
                      <span className="nt-t">{n.title}</span>
                      {amt && <span className="nt-amt">{amt}</span>}
                    </div>
                    {n.message && <div className="nt-msg">{n.message}</div>}
                    <div className="nt-meta">
                      {n.meta?.status && <span className={`nt-pill nt-pill-${tone}`}>{String(n.meta.status).toUpperCase()}</span>}
                      {ref && <span className="nt-ref">Ref: {ref.length > 14 ? ref.slice(0, 6) + '…' + ref.slice(-4) : ref}</span>}
                      <span className="nt-time">{timeAgo(n.created_at)}</span>
                    </div>
                    {n.meta?.cta_route && (
                      <span className="nt-cta">{n.meta?.cta_label || 'Open'} <ChevronRight size={12} /></span>
                    )}
                  </div>
                  {!n.is_read && <span className="nt-dot" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

const NT_CSS = `
/* Root ground supplied by c7p-page (standard emerald felt) */
.nt-root { min-height: 100vh; color: #fff; padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px)); font-family: Inter, system-ui, sans-serif; }
.nt-bar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 10px; padding: 14px 16px;
  background: linear-gradient(180deg, rgba(6,26,16,0.95), rgba(6,26,16,0.55)); backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(120,240,176,0.28); }
.nt-glim { position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(46,230,130,0.85), rgba(255,214,120,0.95), rgba(46,230,130,0.85), transparent);
  background-size: 220% 100%; animation: nt-glim 5.5s linear infinite; opacity: 0.9; }
@keyframes nt-glim { 0% { background-position: 220% 0; } 100% { background-position: -220% 0; } }
.nt-back { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(120,240,176,0.3);
  color: #d6ffe9; display: grid; place-items: center; cursor: pointer; }
.nt-title { font-size: 18px; font-weight: 900; letter-spacing: 0.3px;
  background: linear-gradient(180deg, #ffffff 4%, #d6ffe9 40%, #ffe9a8 74%, #f5b423 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 12px rgba(46,230,130,0.45)) drop-shadow(0 1px 1px rgba(0,0,0,0.5)); }
.nt-markall { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; border-radius: 999px; padding: 6px 12px;
  font-size: 11px; font-weight: 800; cursor: pointer; color: #04240f; border: 1px solid rgba(255,231,160,0.6); font-family: inherit;
  background: linear-gradient(180deg, #46f088, #12a04f); box-shadow: 0 3px 10px -3px rgba(46,224,138,0.5); }
.nt-markall:active { transform: scale(0.96); }

.nt-filters { position: sticky; top: 63px; z-index: 19; display: flex; gap: 8px; padding: 10px 16px; overflow-x: auto; -webkit-overflow-scrolling: touch;
  background: linear-gradient(180deg, rgba(4,18,11,0.9), rgba(4,18,11,0.0)); }
.nt-filters::-webkit-scrollbar { display: none; }
/* Filter pills — surface (gloss/hairline/depth) comes from shared .c7p-chip;
   this reshapes the square icon-chip into a labeled pill (layout/type only). */
.nt-chip { flex: 0 0 auto; width: auto; height: auto; display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; cursor: pointer; font-family: inherit;
  font-size: 12px; font-weight: 800; color: rgba(214,255,233,0.75); transition: transform .12s ease; }
.nt-chip:active { transform: scale(0.95); }
.nt-chip-on { color: #06180f; border-color: transparent;
  background: radial-gradient(120% 100% at 50% 10%, rgba(255,255,255,0.4), transparent 55%), linear-gradient(180deg, #6bf5a3, #0b7a3f);
  box-shadow: 0 4px 12px -3px rgba(46,230,130,0.5); }
.nt-chip-c { font-size: 10px; padding: 0 6px; border-radius: 999px; background: rgba(0,0,0,0.22); font-weight: 900; }
.nt-chip-on .nt-chip-c { background: rgba(0,0,0,0.28); color: #eafff2; }

.nt-main { max-width: 520px; margin: 0 auto; padding: 8px 16px 16px; }
.nt-empty { text-align: center; color: rgba(255,255,255,0.55); padding: 66px 20px; font-size: 13px; }
.nt-list { display: grid; gap: 10px; }
.nt-sk-card { cursor: default; animation: none; }
.nt-sk-ic { width: 40px; height: 40px; flex-shrink: 0; margin-top: 1px; }
/* Cards — c7p-panel base; layout, tone accent, unread glow + rise animation only */
.nt-card { position: relative; overflow: hidden; display: flex; gap: 12px; padding: 13px 14px; align-items: flex-start; text-align: left; cursor: pointer; width: 100%; font-family: inherit; color: #fff;
  transition: transform .12s ease, box-shadow .2s ease;
  animation: nt-rise 320ms cubic-bezier(.21,1.02,.73,1) backwards; }
@keyframes nt-rise { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
.nt-card:active { transform: scale(0.985); }
.nt-card.nt-unread { border-color: rgba(120,240,176,0.5); box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 22px rgba(0,0,0,0.35), 0 10px 24px -8px rgba(0,0,0,0.6), 0 0 18px -6px rgba(46,230,130,0.5); }
/* left accent by tone */
.nt-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }
.nt-tone-good::before { background: linear-gradient(180deg, #6bf5a3, #0b7a3f); }
.nt-tone-bad::before  { background: linear-gradient(180deg, #ff8f8f, #c11f2f); }
.nt-tone-warn::before { background: linear-gradient(180deg, #ffe08a, #d99a1a); }
.nt-tone-info::before { background: linear-gradient(180deg, #8fd8ff, #2f7ad9); }
.nt-ic { font-size: 24px; line-height: 1; margin-top: 1px; flex-shrink: 0; width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px;
  background: radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.1), transparent 55%), linear-gradient(160deg, #0d3a22, #06240f);
  border: 1px solid rgba(120,240,176,0.32);
  box-shadow: 0 0 0 1px rgba(245,180,35,0.26), inset 0 1px 0 rgba(255,255,255,0.14), 0 5px 14px -7px rgba(245,180,35,0.4);
  animation: nt-float 3s ease-in-out infinite, nt-icglow 2.8s ease-in-out infinite; will-change: transform, filter; }
@keyframes nt-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes nt-icglow { 0%,100% { filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4)); } 50% { filter: drop-shadow(0 0 7px rgba(110,231,183,0.75)) brightness(1.07); } }
.nt-body { flex: 1; min-width: 0; }
.nt-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.nt-t { font-size: 14px; font-weight: 900; letter-spacing: 0.1px; }
.nt-amt { font-size: 15px; font-weight: 900; color: #6bf5a3; font-variant-numeric: tabular-nums; flex-shrink: 0; text-shadow: 0 0 12px rgba(46,230,130,0.4); }
.nt-tone-bad .nt-amt { color: #ff9a9a; text-shadow: 0 0 12px rgba(209,31,47,0.4); }
.nt-msg { font-size: 12px; color: rgba(255,255,255,0.66); margin-top: 3px; line-height: 1.45; }
.nt-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.nt-pill { font-size: 9px; font-weight: 900; letter-spacing: 0.6px; padding: 3px 8px; border-radius: 999px; }
.nt-pill-good { color: #06180f; background: linear-gradient(180deg, #7ff5b0, #1ec46a); }
.nt-pill-bad  { color: #fff;    background: linear-gradient(180deg, #ff8f8f, #c11f2f); }
.nt-pill-warn { color: #2a1c05; background: linear-gradient(180deg, #ffe08a, #e0a922); }
.nt-pill-info { color: #06180f; background: linear-gradient(180deg, #b6e8ff, #4f9fd9); }
.nt-ref { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.5); font-family: ui-monospace, monospace; letter-spacing: 0.2px; }
.nt-time { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.4); margin-left: auto; }
.nt-cta { display: inline-flex; align-items: center; gap: 2px; margin-top: 9px; font-size: 11px; font-weight: 900; color: #d6ffe9;
  padding: 6px 12px; border-radius: 999px; border: 1px solid rgba(120,240,176,0.4); background: rgba(46,230,130,0.1); }
.nt-dot { position: absolute; top: 12px; right: 12px; width: 8px; height: 8px; border-radius: 50%; background: #35d98a; flex-shrink: 0;
  box-shadow: 0 0 8px #35d98a; animation: nt-pulse 1.8s ease-in-out infinite; }
@keyframes nt-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.25); } }
@media (prefers-reduced-motion: reduce) { .nt-glim, .nt-ic, .nt-dot, .nt-card { animation: none !important; } }
`;

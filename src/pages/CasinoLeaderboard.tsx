/**
 * CasinoLeaderboard — premium gilt gold+emerald leaderboard at /top.
 *
 * Reads (UNCHANGED):
 *   - get_leaderboard / get_weekly_leaderboard / get_monthly_leaderboard
 *   - get_my_leaderboard_rank (_scope = all|week|month)
 *   - realtime refresh on casino_bets INSERT
 *
 * Design: brought in line with the rest of the platform (Home / Wallet / VIP).
 * Gilt-bevel podium crests lit from above, gold-cut "TOP PLAYERS" wordmark,
 * gilt treasure pool + my-rank cards, gold-hairline list. Pure CSS, GPU-cheap
 * (gradients + box-shadow), reduced-motion honored. No data logic touched.
 */

import { useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BrandedSpinner } from '@/components/c7/BrandedLoader';
import C7Icon from '@/components/c7/C7Icon';
import C7ErrorState from '@/components/c7/C7ErrorState';

type Period = 'all' | 'week' | 'month';

interface Entry {
  rank: number;
  name: string;
  wagered: number;
  won: number;
  winRate: number;
  bets: number;
  avatarUrl?: string;
}

interface MyRank {
  rank: number;
  wagered: number;
  profit: number;
  bets: number;
}

// Gilt rank metal — gold / silver / bronze crest tints (top champagne, bottom seat).
const METAL: Record<number, { c: string; hi: string; lo: string }> = {
  1: { c: '#ffd24d', hi: '#fff6d8', lo: '#a9760a' },
  2: { c: '#d7dee8', hi: '#ffffff', lo: '#8b97a6' },
  3: { c: '#e2953f', hi: '#ffd6a3', lo: '#94551b' },
};

function maskName(s: string | null | undefined): string {
  if (!s) return 'Player';
  const str = String(s).trim();
  if (str.length <= 2) return str.toUpperCase();
  if (str.length <= 5) return str;
  return str.slice(0, 4) + '***' + str.slice(-1);
}
function rankEmoji(r: number): ReactNode {
  if (r === 1) return <C7Icon name="medal" size={16} />;
  if (r === 2) return <C7Icon name="medal" size={16} />;
  if (r === 3) return <C7Icon name="medal" size={16} />;
  return '#' + r;
}

export default function CasinoLeaderboard() {
  const nav = useNavigate();
  const [period, setPeriod]   = useState<Period>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [myRank, setMyRank]   = useState<MyRank | null>(null);
  const [isLive, setIsLive]   = useState(false);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const fetchAll = async () => {
      const rpcName =
        period === 'week'  ? 'get_weekly_leaderboard'  :
        period === 'month' ? 'get_monthly_leaderboard' :
                             'get_leaderboard';
      // get_leaderboard takes { p_limit }, the weekly/monthly take no args.
      const args = period === 'all' ? { p_limit: 50 } : undefined;
      const lbRes = await supabase.rpc(rpcName as any, args as any);
      if (lbRes.error) throw lbRes.error;
      if (!mounted) return;

      const list = Array.isArray(lbRes.data) ? lbRes.data : [];
      const mapped: Entry[] = list.slice(0, 50).map((r: any, i: number) => ({
        rank: Number(r.rank ?? i + 1),
        name: maskName(r.display_name),
        wagered: Number(r.total_wagered ?? 0),
        won: Number(r.total_won ?? 0),
        winRate: Number(r.win_rate ?? 0),
        bets: Number(r.total_bets ?? 0),
        avatarUrl: r.avatar_url || undefined,
      }));
      setEntries(mapped);

      // My rank — only if logged in
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const mr = await supabase.rpc('get_my_leaderboard_rank', { _scope: period });
          const row = Array.isArray(mr.data) ? mr.data[0] : mr.data;
          if (row && mounted) {
            setMyRank({
              rank: Number((row as any).rank ?? 0),
              wagered: Number((row as any).total_wagered ?? 0),
              profit: Number((row as any).total_profit ?? 0),
              bets: Number((row as any).bet_count ?? 0),
            });
          }
        }
      } catch { /* anonymous OK */ }
    };

    (async () => {
      // Never leave the page stuck on the spinner if the fetch rejects.
      setError(false);
      try { await fetchAll(); } catch { if (mounted) setError(true); }
      if (!mounted) return;
      setLoading(false);

      // Soft realtime: refresh when new bets land (changes leaderboard totals)
      channel = supabase
        .channel(`leaderboard-${period}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'casino_bets' },
          () => { fetchAll(); }
        )
        .subscribe((status) => {
          if (mounted) setIsLive(status === 'SUBSCRIBED');
        });
    })();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [period, reloadKey]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  // Treasure Pool — real total winnings across the ranked players (honest: 0 until play).
  const treasurePool = entries.reduce((s, e) => s + (e.won || 0), 0);

  return (
    // IA P3: standard chrome — the page owns its lb-head header + global BottomNav
    // (the legacy CasinoTopBar shell was removed; lb-root is self-sufficient).
    <div className="c7p-page lb-root">
      <style>{LB_CSS}</style>

      <div className="lb-wrap">
        {/* Sticky chrome — wordmark + LIVE badge + period tabs stay pinned */}
        <div className="lb-sticky">
        {/* Gold-cut wordmark header */}
        <header className="lb-head">
          <button className="c7p-pg-back" onClick={() => nav('/v3/rewards')} aria-label="Back"><ArrowLeft size={18} /></button>
          <div style={{ flex: 1 }}>
            <div className="lb-eyebrow c7p-gold-text">CROWN OF C7</div>
            <h1 className="lb-title c7p-gold-text">TOP PLAYERS</h1>
          </div>
          <span className={`lb-live${isLive ? ' on' : ''}`}>
            <i /> {isLive ? 'LIVE' : 'IDLE'}
          </span>
        </header>

        {/* Period tabs */}
        <div className="lb-tabs">
          {([
            { id: 'all',   label: 'All-Time' },
            { id: 'week',  label: 'This Week' },
            { id: 'month', label: 'This Month' },
          ] as { id: Period; label: string }[]).map((p) => (
            <button
              key={p.id}
              onClick={() => { setLoading(true); setPeriod(p.id); }}
              className={`lb-tab${p.id === period ? ' on' : ''}`}
            >{p.label}</button>
          ))}
        </div>
        </div>

        {/* Treasure Pool — gilt gold feature card (real winnings of ranked players) */}
        <section className="c7p-card-gold lb-pool">
          <span className="lb-pool-shine" />
          <span className="lb-pool-coin"><C7Icon name="coin" size={30} /></span>
          <div className="lb-pool-body">
            <div className="lb-pool-k">TREASURE POOL</div>
            <div className="lb-pool-v">
              {treasurePool > 0 ? '$' + Math.floor(treasurePool).toLocaleString('en-US') : 'Building…'}
            </div>
          </div>
          <span className="lb-pool-cap">WON BY<br />TOP PLAYERS</span>
        </section>

        {/* My rank */}
        {myRank && myRank.rank > 0 && (
          <section className="c7p-panel lb-mine">
            <div>
              <div className="lb-mine-k c7p-gold-text">YOUR RANK</div>
              <div className="lb-mine-v">#{myRank.rank.toLocaleString()}</div>
            </div>
            <div className="lb-mine-right">
              <div className="lb-mine-k2">WAGERED · BETS</div>
              <div className="lb-mine-stat">
                ${myRank.wagered.toLocaleString(undefined, { maximumFractionDigits: 0 })} · {myRank.bets.toLocaleString()}
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <div className="lb-loading">
            <BrandedSpinner size={36} />
            <span>Loading leaderboard</span>
          </div>
        ) : error ? (
          <C7ErrorState
            title="Couldn't load the leaderboard"
            message="We couldn't reach the rankings right now. Check your connection and try again."
            onRetry={() => setReloadKey((k) => k + 1)}
          />
        ) : entries.length === 0 ? (
          <div className="lb-empty">
            <div className="lb-empty-ic"><C7Icon name="trophy" size={40} /></div>
            <div className="lb-empty-t">No rankings yet</div>
            <div className="lb-empty-s">Be the first to climb the leaderboard.</div>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            {top3.length > 0 && (
              <section className="lb-podium">
                {top3[1] ? <PodiumCard entry={top3[1]} height={116} /> : <div />}
                {top3[0] ? <PodiumCard entry={top3[0]} height={140} showCrown /> : <div />}
                {top3[2] ? <PodiumCard entry={top3[2]} height={100} /> : <div />}
              </section>
            )}

            {/* List 4..50 */}
            {rest.length > 0 && (
              <section className="lb-list-wrap">
                <div className="c7p-sec lb-list-h">
                  <span className="c7p-sec-ic"><C7Icon name="target" /></span>
                  <span className="c7p-sec-t">The Rest of the Pack</span>
                  <i className="c7p-sec-rule" aria-hidden="true" />
                </div>
                <div className="c7p-panel lb-list">
                  {rest.map((e, i) => (
                    <div
                      key={`${e.rank}-${e.name}`}
                      className="lb-row"
                      style={{ animationDelay: `${i * 24}ms` }}
                    >
                      <div className="lb-row-l">
                        <div className="lb-row-rank">{e.rank}</div>
                        <div
                          className="lb-row-av"
                          style={e.avatarUrl ? { backgroundImage: `url(${e.avatarUrl})` } : undefined}
                        >
                          {!e.avatarUrl && e.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="lb-row-id">
                          <div className="lb-row-name">{e.name}</div>
                          <div className="lb-row-sub">{e.bets.toLocaleString()} bets · {(e.winRate * 100).toFixed(0)}% win</div>
                        </div>
                      </div>
                      <div className="lb-row-amt">
                        ${e.wagered.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PodiumCard({ entry, height, showCrown }: { entry: Entry; height: number; showCrown?: boolean }) {
  const m = METAL[entry.rank] ?? METAL[3];
  return (
    <div
      className={`lb-pod${showCrown ? ' king' : ''}`}
      style={{
        height,
        ['--m' as any]: m.c,
        ['--m-hi' as any]: m.hi,
        ['--m-lo' as any]: m.lo,
      }}
    >
      {showCrown && <div className="lb-pod-crown"><C7Icon name="crown" size={23} /></div>}
      <div
        className="lb-pod-av"
        style={entry.avatarUrl ? { backgroundImage: `url(${entry.avatarUrl})` } : undefined}
      >
        {!entry.avatarUrl && entry.name.charAt(0).toUpperCase()}
      </div>
      <div className="lb-pod-medal">{rankEmoji(entry.rank)}</div>
      <div className="lb-pod-name">{entry.name}</div>
      <div className="lb-pod-amt">
        ${entry.wagered.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
    </div>
  );
}

const LB_CSS = `
.lb-root { min-height: 100vh; color: #fff; padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px)); position: relative; overflow-x: hidden; font-family: Inter, system-ui, sans-serif; }
.lb-wrap { position: relative; z-index: 1; max-width: 520px; margin: 0 auto; padding: 0 16px; }

/* Sticky chrome: wordmark + LIVE badge + period tabs pinned with a blur backdrop */
.lb-sticky { position: sticky; top: 0; z-index: 30; margin: 0 -16px; padding: 0 16px;
  background: linear-gradient(180deg, rgba(6,20,12,0.92), rgba(6,20,12,0.55)); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(246,201,69,0.42); }

/* Header wordmark */
.lb-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 20px 2px 12px; }
.lb-eyebrow { font-size: 10px; font-weight: 900; letter-spacing: 3px; }
.lb-title { font-size: 30px; font-weight: 900; letter-spacing: 1.5px; line-height: 1.02; margin-top: 2px;
  filter: drop-shadow(0 2px 0 rgba(20,12,2,0.6)) drop-shadow(0 0 14px rgba(255,190,60,0.4)); }
.lb-live { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; flex-shrink: 0; margin-top: 6px;
  font-size: 10px; font-weight: 900; letter-spacing: 1.4px; color: rgba(255,255,255,0.6);
  background: rgba(0,0,0,0.32); border: 1px solid rgba(255,214,120,0.22); }
.lb-live i { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.4); }
.lb-live.on { color: #b9f6d0; border-color: rgba(46,224,138,0.45); }
.lb-live.on i { background: #2ee08a; box-shadow: 0 0 8px #2ee08a; animation: lb-pulse 1.5s ease-in-out infinite; }
@keyframes lb-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

/* Period tabs — gilt gold active pill */
.lb-tabs { display: flex; gap: 6px; padding: 0 0 14px; }
.lb-tab { flex: 1; padding: 9px 10px; font-size: 11px; font-weight: 900; letter-spacing: 1.2px; text-transform: uppercase;
  cursor: pointer; border-radius: 999px; color: rgba(255,255,255,0.55);
  background: rgba(0,0,0,0.3); border: 1px solid rgba(255,214,120,0.2); transition: all .14s; font-family: inherit; }
.lb-tab.on { color: #3a2600; border-color: rgba(255,231,160,0.7);
  background: radial-gradient(120% 100% at 50% 12%, rgba(255,255,255,0.75), transparent 52%), linear-gradient(180deg,#fff3c4,#ffd24d 45%,#e0a514);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -6px 10px rgba(138,100,16,0.32), 0 4px 12px -3px rgba(255,200,61,0.5); }

/* Treasure pool */
.lb-pool { position: relative; overflow: hidden; display: flex; align-items: center; gap: 13px; padding: 14px 16px; margin-bottom: 12px; }
.lb-pool-shine { position: absolute; top: 0; left: -60%; width: 42%; height: 100%; transform: skewX(-20deg); pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent); animation: lb-shine 4.2s ease-in-out infinite; }
@keyframes lb-shine { 0% { left: -60%; } 55%,100% { left: 130%; } }
.lb-pool-coin { font-size: 30px; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.5)); flex-shrink: 0; }
.lb-pool-body { flex: 1; min-width: 0; }
.lb-pool-k { font-size: 10px; font-weight: 900; letter-spacing: 2px; color: #b9f6d0; }
.lb-pool-v { font-size: 23px; font-weight: 900; line-height: 1.1; letter-spacing: -0.5px; font-variant-numeric: tabular-nums;
  background: linear-gradient(180deg,#ffffff,#6bf5a3 60%,#14b96a); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.lb-pool-cap { font-size: 9px; font-weight: 800; color: rgba(255,255,255,0.5); text-align: right; letter-spacing: 0.4px; flex-shrink: 0; }

/* My rank */
.lb-mine { display: flex; align-items: center; justify-content: space-between; padding: 13px 15px; margin-bottom: 14px; }
.lb-mine-k { font-size: 9px; font-weight: 900; letter-spacing: 2px; margin-bottom: 2px; }
.lb-mine-v { font-size: 23px; font-weight: 900; letter-spacing: -0.5px; color: #fff; font-variant-numeric: tabular-nums; }
.lb-mine-right { text-align: right; }
.lb-mine-k2 { font-size: 9px; font-weight: 900; letter-spacing: 1.5px; color: rgba(255,255,255,0.45); text-transform: uppercase; margin-bottom: 2px; }
.lb-mine-stat { font-size: 14px; font-weight: 900; color: #ffe27a; font-variant-numeric: tabular-nums; }

/* Podium */
.lb-podium { display: grid; grid-template-columns: 1fr 1.15fr 1fr; align-items: end; gap: 9px; padding: 4px 0 18px; }
.lb-pod { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; text-align: center;
  padding: 14px 8px 12px; border-radius: 16px; border: 1.5px solid transparent;
  background:
    linear-gradient(180deg, rgba(14,44,28,0.96), rgba(11,36,23,0.96)) padding-box,
    linear-gradient(180deg, var(--m-hi), var(--m) 52%, var(--m-lo)) border-box;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 0 20px -8px var(--m), 0 12px 24px -12px rgba(0,0,0,0.7);
  animation: lb-rise 380ms cubic-bezier(.21,1.02,.73,1) backwards; }
.lb-pod.king { box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 0 30px -6px var(--m), 0 14px 30px -12px rgba(0,0,0,0.75); }
@keyframes lb-rise { 0% { opacity: 0; transform: translateY(9px); } 100% { opacity: 1; transform: translateY(0); } }
.lb-pod-crown { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); font-size: 23px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); animation: lb-crown 2.4s ease-in-out infinite; transform-origin: center 80%; }
@keyframes lb-crown { 0%,100% { transform: translateX(-50%) translateY(0) rotate(-3deg); } 50% { transform: translateX(-50%) translateY(-3px) rotate(3deg); } }
.lb-pod-av { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; background-size: cover; background-position: center;
  font-size: 15px; font-weight: 900; color: #04240f; margin-bottom: 6px;
  background-color: #12a04f; background-image: radial-gradient(120% 100% at 50% 14%, rgba(255,255,255,0.5), transparent 52%), linear-gradient(180deg,#2ee08a,#0a7a3c);
  border: 2px solid var(--m); box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 4px 12px -4px var(--m); }
.lb-pod.king .lb-pod-av { width: 50px; height: 50px; font-size: 18px; }
.lb-pod-medal { font-size: 16px; line-height: 1; }
.lb-pod-name { font-size: 11px; font-weight: 800; color: #fff; margin-top: 3px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lb-pod-amt { font-size: 12px; font-weight: 900; color: var(--m); letter-spacing: -0.3px; font-variant-numeric: tabular-nums; margin-top: 1px;
  text-shadow: 0 0 10px color-mix(in srgb, var(--m) 45%, transparent); }

/* List */
.lb-list-h { margin: 0 0 10px; font-size: 11px; letter-spacing: 2.5px; }
.lb-list { overflow: hidden; padding: 2px 0; }
.lb-row { display: flex; align-items: center; justify-content: space-between; padding: 11px 14px;
  border-bottom: 1px solid rgba(255,214,120,0.1); animation: lb-rise 340ms cubic-bezier(.21,1.02,.73,1) backwards; }
.lb-row:last-child { border-bottom: none; }
.lb-row-l { display: flex; align-items: center; gap: 11px; min-width: 0; }
.lb-row-rank { min-width: 24px; font-size: 12px; font-weight: 900; color: rgba(255,255,255,0.45); font-variant-numeric: tabular-nums; text-align: right; }
.lb-row-av { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; background-size: cover; background-position: center;
  font-size: 13px; font-weight: 900; color: #04240f; border: 1px solid rgba(255,214,120,0.35);
  background-color: #12a04f; background-image: linear-gradient(135deg,#2ee08a,#0a7a3c); }
.lb-row-id { min-width: 0; }
.lb-row-name { font-size: 13px; font-weight: 800; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lb-row-sub { font-size: 10px; color: rgba(255,255,255,0.45); margin-top: 1px; }
.lb-row-amt { font-size: 13px; font-weight: 900; color: #ffe27a; letter-spacing: -0.3px; font-variant-numeric: tabular-nums; flex-shrink: 0; }

/* States */
.lb-loading { padding: 60px 0; display: flex; flex-direction: column; align-items: center; gap: 16px;
  color: rgba(255,255,255,0.5); font-size: 11px; letter-spacing: 1.5px; font-weight: 700; text-transform: uppercase; }
.lb-empty { padding: 44px 24px; text-align: center; }
.lb-empty-ic { font-size: 34px; margin-bottom: 8px; }
.lb-empty-t { font-weight: 800; color: rgba(255,255,255,0.85); margin-bottom: 4px; }
.lb-empty-s { font-size: 11px; color: rgba(255,255,255,0.45); }

@media (prefers-reduced-motion: reduce) {
  .lb-pool-shine, .lb-pod-crown, .lb-live.on i, .lb-pod, .lb-row { animation: none !important; }
}
`;

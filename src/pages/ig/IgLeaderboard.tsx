// IgLeaderboard (/ig/leaderboard) — Instagram-light leaderboard. Same
// get_leaderboard / get_weekly_leaderboard / get_monthly_leaderboard RPCs,
// get_my_leaderboard_rank, and the casino_bets INSERT realtime refresh the
// dark CasinoLeaderboard uses (read-only rankings, no business logic),
// reskinned to the IG-light system.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Medal, Trophy, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";

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

function maskName(s: string | null | undefined): string {
  if (!s) return 'Player';
  const str = String(s).trim();
  if (str.length <= 2) return str.toUpperCase();
  if (str.length <= 5) return str;
  return str.slice(0, 4) + '***' + str.slice(-1);
}

export default function IgLeaderboard() {
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

  // Treasure Pool — real total winnings across the ranked players (honest: 0 until play).
  const treasurePool = entries.reduce((s, e) => s + (e.won || 0), 0);
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const myRankVal = myRank && myRank.rank > 0 ? myRank.rank : 0;

  // Podium spot — one of the top 3 (real entry). place = 1|2|3 → gold/silver/bronze.
  const PodiumSpot = (e: Entry, place: number) => (
    <div className={`iglb-pod iglb-pod--${place}${e.rank === myRankVal ? " me" : ""}`}>
      <span className="iglb-pod-badge">{place === 1 ? <Crown size={16} /> : <Medal size={15} />}</span>
      <div className="iglb-pod-av" style={e.avatarUrl ? { backgroundImage: `url(${e.avatarUrl})` } : undefined}>
        {!e.avatarUrl && e.name.charAt(0).toUpperCase()}
      </div>
      <div className="iglb-pod-name">{e.name}</div>
      <div className="iglb-pod-val">${e.wagered.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
      <div className="iglb-pod-base"><span>{place}</span></div>
    </div>
  );

  return (
    <div className="iglb">
      <style>{CSS}</style>

      <header className="ig-top">
        <button className="iglb-back" onClick={() => (window.history.length > 1 ? nav(-1) : nav("/ig/rewards"))} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="ig-ttl">Leaderboard</span>
        <button className="iglb-back" onClick={() => { setLoading(true); setReloadKey((k) => k + 1); }} disabled={loading} aria-label="Refresh"><RefreshCw size={18} className={loading ? "iglb-spin" : ""} /></button>
      </header>

      {/* Period tabs */}
      <div className="iglb-tabs">
        {([
          { id: 'all',   label: 'All-Time' },
          { id: 'week',  label: 'This Week' },
          { id: 'month', label: 'This Month' },
        ] as { id: Period; label: string }[]).map((p) => (
          <button
            key={p.id}
            onClick={() => { setLoading(true); setPeriod(p.id); }}
            className={`iglb-tab${p.id === period ? ' on' : ''}`}
          >{p.label}</button>
        ))}
        <span className={`iglb-live${isLive ? ' on' : ''}`}><i />{isLive ? 'Live' : 'Idle'}</span>
      </div>

      <main className="ig-main iglb-main">
        {loading ? (
          <>
            <div className="iglb-sk iglb-sk-podium" />
            <div className="iglb-card">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="iglb-row" style={{ borderTop: i ? '1px solid var(--hair)' : 'none' }}>
                  <span className="iglb-sk iglb-sk-rank" />
                  <span className="iglb-sk iglb-sk-av" />
                  <div className="iglb-id"><div className="iglb-sk" style={{ width: '54%', height: 12, marginBottom: 6 }} /><div className="iglb-sk" style={{ width: '32%', height: 9 }} /></div>
                  <span className="iglb-sk" style={{ width: 46, height: 13 }} />
                </div>
              ))}
            </div>
          </>
        ) : error ? (
          <div className="iglb-empty">
            <div className="iglb-empty-em">⚠️</div>
            <div className="iglb-empty-t">Couldn’t load the leaderboard</div>
            <div className="iglb-empty-s">We couldn’t reach the rankings right now. Check your connection and try again.</div>
            <button className="iglb-retry" onClick={() => setReloadKey((k) => k + 1)}>Retry</button>
          </div>
        ) : entries.length === 0 ? (
          <div className="iglb-empty">
            <div className="iglb-empty-em">🏆</div>
            <div className="iglb-empty-t">No rankings yet</div>
            <div className="iglb-empty-s">Be the first to climb the leaderboard.</div>
          </div>
        ) : (
          <>
            {/* Top-3 podium — the premium cabinet centrepiece */}
            {top3.length > 0 && (
              <section className="iglb-podium">
                <span className="iglb-podium-glow" aria-hidden="true" />
                {top3[1] && PodiumSpot(top3[1], 2)}
                {top3[0] && PodiumSpot(top3[0], 1)}
                {top3[2] && PodiumSpot(top3[2], 3)}
              </section>
            )}

            {/* Treasure Pool — real winnings of ranked players */}
            <section className="iglb-pool">
              <span className="iglb-pool-ic"><Trophy size={20} /></span>
              <div className="iglb-pool-body">
                <div className="iglb-pool-k">Treasure Pool</div>
                <div className="iglb-pool-v">{treasurePool > 0 ? '$' + Math.floor(treasurePool).toLocaleString('en-US') : 'Building…'}</div>
              </div>
              <span className="iglb-pool-cap">Won by top players</span>
            </section>

            {/* My rank */}
            {myRank && myRank.rank > 0 && (
              <section className="iglb-mine">
                <div>
                  <div className="iglb-mine-k">Your rank</div>
                  <div className="iglb-mine-v">#{myRank.rank.toLocaleString()}</div>
                </div>
                <div className="iglb-mine-right">
                  <div className="iglb-mine-k2">Wagered · Bets</div>
                  <div className="iglb-mine-stat">${myRank.wagered.toLocaleString(undefined, { maximumFractionDigits: 0 })} · {myRank.bets.toLocaleString()}</div>
                </div>
              </section>
            )}

            {/* Ranks 4+ */}
            {rest.length > 0 && (
              <>
                <div className="iglb-sec">Rankings</div>
                <div className="iglb-card">
                  {rest.map((e, i) => {
                    const isMe = e.rank === myRankVal;
                    return (
                      <div key={`${e.rank}-${e.name}`} className={`iglb-row${isMe ? ' me' : ''}`} style={{ borderTop: i ? '1px solid var(--hair)' : 'none' }}>
                        <span className="iglb-rank">{e.rank}</span>
                        <div className="iglb-av" style={e.avatarUrl ? { backgroundImage: `url(${e.avatarUrl})` } : undefined}>
                          {!e.avatarUrl && e.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="iglb-id">
                          <div className="iglb-name">{e.name}{isMe && <span className="iglb-you">You</span>}</div>
                          <div className="iglb-sub">{e.bets.toLocaleString()} bets · {(e.winRate * 100).toFixed(0)}% win</div>
                        </div>
                        <span className="iglb-amt">${e.wagered.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        <IgSocialNotice variant="line" />
      </main>

      <IgTabBar active="profile" />
    </div>
  );
}

const CSS = `
.iglb { --ink:#f0fff7; --mut:#83b39c; --faint:#5f8b76; --grn:#2ee08a; --grn2:#0e7a4a;
  --gold:#f0c94a; --gold-lite:#fff4cf; --gold-deep:#c68a2e; --antique:#e8c877;
  --silver:#cbd5e1; --bronze:#cd7f32; --loss:#ff6b7d; --line:rgba(240,201,74,0.22); --hair:rgba(255,255,255,0.06);
  min-height:100vh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif;
  padding-bottom:calc(78px + env(safe-area-inset-bottom,0px)); -webkit-tap-highlight-color:transparent;
  background:
    radial-gradient(90% 40% at 50% -6%, rgba(240,201,74,.10), transparent 55%),
    radial-gradient(120% 65% at 50% -4%, rgba(33,86,60,.82), transparent 58%),
    linear-gradient(180deg,#0c3320 0%, #06170e 46%, #030b07 100%); background-attachment:fixed; }
.iglb * { box-sizing:border-box; }
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:54px; padding:0 8px 0 12px;
  background:linear-gradient(180deg, rgba(7,24,15,.95), rgba(7,24,15,.5)); -webkit-backdrop-filter:blur(16px); backdrop-filter:blur(16px);
  border-bottom:1px solid var(--line); box-shadow:0 1px 0 rgba(240,201,74,.16), 0 10px 26px -18px rgba(0,0,0,.8); }
.iglb-back { background:none; border:none; color:#cdead9; cursor:pointer; display:grid; place-items:center; width:38px; height:38px; border-radius:11px; transition:background .18s, transform .12s; }
.iglb-back:hover { background:rgba(255,255,255,.05); } .iglb-back:active { transform:scale(.9); } .iglb-back:disabled { opacity:.55; }
.iglb-spin { animation:iglb-rot 1s linear infinite; } @keyframes iglb-rot { to { transform:rotate(360deg); } }
.ig-ttl { font-size:18px; font-weight:800; letter-spacing:.01em; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.ig-main { max-width:560px; margin:0 auto; }

.iglb-tabs { position:sticky; top:54px; z-index:20; display:flex; align-items:center; gap:8px; overflow-x:auto; padding:11px 12px;
  background:linear-gradient(180deg, rgba(7,24,15,.9), rgba(7,24,15,.6)); -webkit-backdrop-filter:blur(14px); backdrop-filter:blur(14px);
  border-bottom:1px solid var(--line); scrollbar-width:none; max-width:560px; margin:0 auto; }
.iglb-tabs::-webkit-scrollbar { display:none; }
.iglb-tab { flex-shrink:0; padding:8px 15px; border-radius:999px; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; color:var(--ink); border:1px solid var(--line); background:rgba(4,16,10,.55); transition:transform .12s; }
.iglb-tab.on { color:#04180e; border-color:transparent; background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); box-shadow:inset 0 1px 0 rgba(255,255,255,0.5), 0 0 16px -5px rgba(46,224,138,0.6); }
.iglb-tab:active { transform:translateY(1px); }
.iglb-live { margin-left:auto; flex-shrink:0; display:inline-flex; align-items:center; gap:5px; padding:6px 11px; border-radius:999px; font-size:11px; font-weight:700; color:var(--mut); border:1px solid var(--line); background:rgba(4,16,10,.55); }
.iglb-live i { width:6px; height:6px; border-radius:50%; background:var(--mut); }
.iglb-live.on { color:var(--grn); border-color:rgba(46,224,138,0.5); }
.iglb-live.on i { background:var(--grn); box-shadow:0 0 8px rgba(46,224,138,0.8); animation:iglb-pulse 1.5s ease-in-out infinite; }
@keyframes iglb-pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }

.iglb-main { padding:16px 12px; }

/* ── Top-3 PODIUM — the premium cabinet centrepiece ── */
.iglb-podium { position:relative; overflow:hidden; display:flex; align-items:flex-end; justify-content:center; gap:10px; padding:26px 12px 0; margin-bottom:14px; border-radius:22px; border:1px solid transparent;
  background:radial-gradient(120% 90% at 50% -10%, rgba(240,201,74,.16), transparent 55%), linear-gradient(165deg, rgba(21,72,48,.94), rgba(6,20,13,.97));
  box-shadow:inset 0 0 0 1.4px rgba(240,201,74,.5), inset 0 1.6px 0 rgba(255,255,255,.18), inset 0 0 34px rgba(46,224,138,.08), 0 26px 52px -26px rgba(0,0,0,.9); }
.iglb-podium-glow { position:absolute; top:-30px; left:50%; transform:translateX(-50%); width:180px; height:120px; border-radius:50%; pointer-events:none;
  background:radial-gradient(circle, rgba(240,201,74,.22), transparent 68%); filter:blur(10px); animation:iglb-breathe 5s ease-in-out infinite; }
@keyframes iglb-breathe { 0%,100% { opacity:.7; } 50% { opacity:1; } }
.iglb-pod { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; gap:5px; flex:1; min-width:0; max-width:33%; }
.iglb-pod-badge { display:grid; place-items:center; width:26px; height:26px; border-radius:50%; margin-bottom:2px; }
.iglb-pod--1 .iglb-pod-badge { color:#3a2708; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); box-shadow:0 0 14px -3px rgba(240,201,74,.7); }
.iglb-pod--2 .iglb-pod-badge { color:#2a333a; background:linear-gradient(180deg,#fff,var(--silver) 55%,#8a99a3); }
.iglb-pod--3 .iglb-pod-badge { color:#3a220e; background:linear-gradient(180deg,#ffd9a8,var(--bronze) 55%,#8a5320); }
.iglb-pod-av { border-radius:50%; display:grid; place-items:center; background-size:cover; background-position:center; font-weight:900; color:#ffe9a8;
  background:radial-gradient(120% 120% at 50% 18%, #1e6440, #05150d 78%); }
.iglb-pod--1 .iglb-pod-av { width:72px; height:72px; font-size:26px; border:2.5px solid var(--gold); box-shadow:0 0 20px -4px rgba(240,201,74,.65), inset 0 2px 8px rgba(0,0,0,.4); }
.iglb-pod--2 .iglb-pod-av { width:58px; height:58px; font-size:21px; border:2.5px solid var(--silver); box-shadow:0 0 16px -5px rgba(203,213,225,.6); }
.iglb-pod--3 .iglb-pod-av { width:58px; height:58px; font-size:21px; border:2.5px solid var(--bronze); box-shadow:0 0 16px -5px rgba(205,127,50,.6); }
.iglb-pod-name { font-size:12px; font-weight:800; color:var(--ink); max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.iglb-pod-val { font-size:12.5px; font-weight:900; font-variant-numeric:tabular-nums;
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 60%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.iglb-pod-base { width:100%; display:grid; place-items:center; border-radius:12px 12px 0 0; margin-top:3px; color:#0a1710; font-weight:900; font-size:22px; font-variant-numeric:tabular-nums;
  box-shadow:inset 0 2px 0 rgba(255,255,255,.55), inset 0 -6px 10px rgba(0,0,0,.28), 0 -1px 0 rgba(255,255,255,.2); }
.iglb-pod--1 .iglb-pod-base { height:66px; background:linear-gradient(180deg,#fff4cf,#f0c94a 52%,#b9822a); }
.iglb-pod--2 .iglb-pod-base { height:50px; background:linear-gradient(180deg,#ffffff,#cbd5e1 52%,#7d8b95); color:#1a222a; }
.iglb-pod--3 .iglb-pod-base { height:42px; background:linear-gradient(180deg,#ffd9a8,#cd7f32 52%,#7a4a1e); color:#2a1808; }
.iglb-pod.me .iglb-pod-av { outline:2px solid var(--grn); outline-offset:2px; }

/* Treasure Pool — slim premium strip */
.iglb-pool { position:relative; display:flex; align-items:center; gap:12px; padding:14px 16px; margin-bottom:12px; overflow:hidden; border:1px solid transparent; border-radius:18px;
  background:radial-gradient(130% 120% at 100% 0%, rgba(240,201,74,0.16), transparent 58%), radial-gradient(120% 120% at 0% 0%, rgba(46,224,138,0.13), transparent 55%), linear-gradient(160deg, rgba(19,60,40,.94), rgba(6,20,13,.96));
  box-shadow:inset 0 0 0 1.2px rgba(240,201,74,.38), inset 0 1.4px 0 rgba(255,255,255,.12), 0 20px 42px -24px rgba(0,0,0,.86); }
.iglb-pool-ic { position:relative; z-index:1; width:42px; height:42px; border-radius:12px; display:grid; place-items:center; flex-shrink:0; color:#ffe9a8;
  background:radial-gradient(120% 120% at 50% 15%, rgba(46,224,138,.17), rgba(6,24,15,.45)); border:1px solid var(--line); box-shadow:0 0 12px -4px rgba(240,201,74,.4); }
.iglb-pool-body { position:relative; z-index:1; flex:1; min-width:0; }
.iglb-pool-k { font-size:10px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:var(--grn); }
.iglb-pool-v { font-size:24px; font-weight:900; line-height:1.15; letter-spacing:-0.5px; font-variant-numeric:tabular-nums;
  background:linear-gradient(100deg,var(--gold-lite),#ffe9a8 24%,var(--gold) 48%,#e0a93a 64%,var(--gold-lite) 100%); background-size:220% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; animation:iglb-gold 6s ease-in-out infinite; }
@keyframes iglb-gold { 0%,100% { background-position:0 0; } 50% { background-position:100% 0; } }
.iglb-pool-cap { position:relative; z-index:1; font-size:10px; font-weight:700; color:var(--faint); text-align:right; flex-shrink:0; max-width:70px; }

/* Your rank */
.iglb-mine { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; margin-bottom:12px; border:1px solid transparent; border-radius:18px;
  background:radial-gradient(120% 120% at 0% 0%, rgba(46,224,138,0.18), transparent 55%), linear-gradient(160deg, rgba(19,66,44,.94), rgba(6,20,13,.96));
  box-shadow:inset 0 0 0 1.3px rgba(46,224,138,0.42), inset 0 1.4px 0 rgba(255,255,255,.12), 0 20px 42px -24px rgba(0,0,0,.86); }
.iglb-mine-k { font-size:10px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:var(--grn); margin-bottom:2px; }
.iglb-mine-v { font-size:24px; font-weight:900; letter-spacing:-0.5px; color:var(--ink); font-variant-numeric:tabular-nums; }
.iglb-mine-right { text-align:right; }
.iglb-mine-k2 { font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--faint); margin-bottom:2px; }
.iglb-mine-stat { font-size:14px; font-weight:800; color:var(--ink); font-variant-numeric:tabular-nums; }

.iglb-sec { font-size:10px; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:var(--faint); margin:6px 4px 10px; }

/* Rows — deep gold-framed emerald cabinet */
.iglb-card { position:relative; border:1px solid transparent; border-radius:20px; overflow:hidden;
  background:linear-gradient(165deg, rgba(19,60,40,.92), rgba(6,20,13,.96)); box-shadow:inset 0 0 0 1.3px rgba(240,201,74,.38), inset 0 1.5px 0 rgba(255,255,255,.12), inset 0 0 34px rgba(46,224,138,.06), 0 24px 48px -28px rgba(0,0,0,.9); }
.iglb-row { display:flex; align-items:center; gap:12px; padding:12px 15px; }
.iglb-row.me { background:radial-gradient(120% 140% at 0% 0%, rgba(46,224,138,0.18), transparent 60%); box-shadow:inset 3px 0 0 var(--grn); }
.iglb-rank { min-width:26px; height:26px; padding:0 4px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; font-size:12px; font-weight:800; color:var(--faint); font-variant-numeric:tabular-nums; }
.iglb-av { width:38px; height:38px; border-radius:50%; display:grid; place-items:center; flex-shrink:0; background-size:cover; background-position:center; font-size:14px; font-weight:800; color:#ffe9a8;
  background:radial-gradient(120% 120% at 50% 18%, #1a5738, #0b2418); border:1px solid var(--line); }
.iglb-id { flex:1; min-width:0; }
.iglb-name { font-size:13.5px; font-weight:700; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:flex; align-items:center; gap:6px; }
.iglb-you { padding:1px 7px; font-size:8.5px; font-weight:800; border-radius:999px; text-transform:uppercase; letter-spacing:0.6px; color:#04180e; background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); flex-shrink:0; }
.iglb-sub { font-size:11px; color:var(--mut); margin-top:2px; font-weight:600; }
.iglb-amt { font-size:14px; font-weight:800; color:var(--antique); letter-spacing:-0.3px; font-variant-numeric:tabular-nums; flex-shrink:0; }

.iglb-empty { text-align:center; color:var(--mut); padding:60px 22px; margin:10px 0; border-radius:22px; border:1px solid transparent;
  background:linear-gradient(165deg, rgba(19,60,40,.92), rgba(6,20,13,.96)); box-shadow:inset 0 0 0 1.3px rgba(240,201,74,.38), inset 0 1.5px 0 rgba(255,255,255,.12), 0 24px 48px -28px rgba(0,0,0,.9); }
.iglb-empty-em { font-size:34px; margin-bottom:12px; display:inline-grid; place-items:center; width:66px; height:66px; border-radius:50%; background:radial-gradient(120% 120% at 50% 20%, rgba(46,224,138,.16), rgba(6,20,13,.4)); border:1px solid var(--line); }
.iglb-empty-t { font-size:16px; font-weight:800; color:var(--ink); margin-bottom:5px; }
.iglb-empty-s { font-size:12.5px; line-height:1.5; }
.iglb-retry { margin-top:16px; padding:11px 24px; border-radius:13px; border:1px solid rgba(255,255,255,.35); color:#3a2708; font-weight:800; font-size:13px; cursor:pointer;
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); box-shadow:inset 0 1px 0 rgba(255,255,255,0.7), 0 10px 22px -8px rgba(240,201,74,0.55); }
.iglb-retry:active { transform:translateY(1px); }

.iglb-sk { display:block; border-radius:8px; background:linear-gradient(100deg, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 70%); background-size:200% 100%; animation:iglb-sh 1.4s ease-in-out infinite; }
.iglb-sk-podium { height:190px; border-radius:22px; margin-bottom:14px; }
.iglb-sk-rank { width:26px; height:26px; border-radius:8px; flex-shrink:0; }
.iglb-sk-av { width:38px; height:38px; border-radius:50%; flex-shrink:0; }
@keyframes iglb-sh { from { background-position:200% 0; } to { background-position:-200% 0; } }
@media (prefers-reduced-motion: reduce) {
  .iglb-sk, .iglb-live.on i, .iglb-podium-glow, .iglb-pool-v, .iglb-spin { animation:none !important; }
  .iglb-tab, .iglb-back { transition:none !important; }
}
`;

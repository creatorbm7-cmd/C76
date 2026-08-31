// IgMissions (/ig/missions) — premium luxury-dark Missions (emerald + antique gold).
// Claimable C74 goals evaluated against real activity. Presentation only: all data +
// logic (get_missions RPC, claim_mission handler, claimed/can_claim/in-progress state,
// real reward_c74/current_value/target) are preserved VERBATIM. Nothing fabricated —
// the progress ring + bar render only the values the RPC returns.
import { useCallback, useEffect, useState } from 'react';
import { num as fmt } from "@/lib/format";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Check, Target, Gift, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";

interface Mission {
  id: string; code: string; title: string; description: string | null; icon: string | null;
  metric: string; target: number; reward_c74: number; current_value: number;
  claimed: boolean; can_claim: boolean;
}


export default function IgMissions() {
  const navigate = useNavigate();
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await (supabase.rpc as any)('get_missions');
    setMissions(!error && Array.isArray(data) ? (data as Mission[]) : []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

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
    <div className="igmis">
      <style>{CSS}</style>
      <header className="igmis-top">
        <button className="igmis-ic" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/ig/rewards'))} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="igmis-ttl">Missions</span>
        <button className="igmis-ic" onClick={refresh} disabled={refreshing || missions === null} aria-label="Refresh"><RefreshCw size={18} className={refreshing ? "igmis-spin" : ""} /></button>
      </header>

      <main className="igmis-main">
        {missions === null ? (
          <div className="igmis-list">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="igmis-sk" />)}
          </div>
        ) : missions.length === 0 ? (
          <div className="igmis-empty">
            <div className="igmis-empty-ic"><Target size={28} /></div>
            <div className="igmis-empty-t">No missions available</div>
            <div className="igmis-empty-s">Check back soon for new goals to complete.</div>
          </div>
        ) : (
          <>
            {(() => {
              const claimables = missions.filter((m) => m.can_claim && !m.claimed);
              const claimableC74 = claimables.reduce((s, m) => s + Number(m.reward_c74 || 0), 0);
              const claimedCount = missions.filter((m) => m.claimed).length;
              return (
                <section className={`igmis-hero${claimables.length ? " ready" : ""}`}>
                  <span className="igmis-hero-ic"><Target size={24} /></span>
                  <div className="igmis-hero-tx">
                    {claimables.length > 0 ? (
                      <><b className="igmis-hero-v">{fmt(claimableC74)} <em>C74</em></b><small>Ready to claim · {claimables.length} mission{claimables.length > 1 ? "s" : ""}</small></>
                    ) : (
                      <><b>Complete goals to earn C74</b><small>{missions.length} active · {claimedCount} claimed</small></>
                    )}
                  </div>
                </section>
              );
            })()}
            <div className="igmis-sec"><Target size={13} /> <span>Active Missions</span>
              <span className="igmis-sec-meta">{missions.filter((m) => m.claimed).length}/{missions.length} claimed</span>
            </div>
            <div className="igmis-list">
              {missions.map((m) => {
                const pct = Math.min(100, Math.round((Number(m.current_value) / Math.max(Number(m.target), 1)) * 100));
                const state = m.claimed ? "done" : m.can_claim ? "claim" : "progress";
                const ringPct = m.claimed ? 100 : pct;
                const ringColor = m.claimed ? "#f0c94a" : "#2ee08a";
                return (
                  <article key={m.id} className={`igmis-card is-${state}`}>
                    <div className="igmis-iconwrap" style={{ background: `conic-gradient(${ringColor} ${ringPct * 3.6}deg, rgba(255,255,255,0.07) 0deg)` }}>
                      <div className="igmis-icon">{m.icon ? <span>{m.icon}</span> : <Target size={20} />}</div>
                    </div>
                    <div className="igmis-body">
                      <div className="igmis-title-row">
                        <h3 className="igmis-title">{m.title}</h3>
                        <span className="igmis-reward">+{fmt(m.reward_c74)} C74</span>
                      </div>
                      {m.description && <p className="igmis-desc">{m.description}</p>}
                      <div className="igmis-bar-track"><div className="igmis-bar-fill" style={{ width: `${pct}%` }} /></div>
                      <div className="igmis-foot">
                        <span className="igmis-prog">{fmt(Math.min(Number(m.current_value), Number(m.target)))} / {fmt(m.target)}</span>
                        {m.claimed ? (
                          <span className="igmis-claimed"><Check size={13} /> Claimed</span>
                        ) : m.can_claim ? (
                          <button className="igmis-claim" onClick={() => claim(m)} disabled={claiming === m.id}>
                            {claiming === m.id ? <Loader2 size={13} className="igmis-spin" /> : <Gift size={14} />} Claim
                          </button>
                        ) : (
                          <span className="igmis-prog-lbl">{pct}%</span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        <IgSocialNotice variant="line" />
      </main>

      <IgTabBar active="profile" />
    </div>
  );
}

const CSS = `
.igmis { --ink:#f0fff7; --mut:#83b39c; --faint:#5f8b76; --grn:#2ee08a; --grn2:#0e7a4a;
  --gold:#f0c94a; --gold-lite:#fff4cf; --gold-deep:#c68a2e; --antique:#e8c877; --loss:#ff6b7d;
  --line:rgba(240,201,74,0.22); --hair:rgba(255,255,255,0.06);
  min-height:100vh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif;
  padding-bottom:calc(78px + env(safe-area-inset-bottom,0px)); -webkit-tap-highlight-color:transparent;
  background:
    radial-gradient(90% 40% at 50% -6%, rgba(240,201,74,.10), transparent 55%),
    radial-gradient(120% 65% at 50% -4%, rgba(33,86,60,.82), transparent 58%),
    linear-gradient(180deg,#0c3320 0%, #06170e 46%, #030b07 100%); background-attachment:fixed; }
.igmis * { box-sizing:border-box; }
.igmis-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:54px; padding:0 8px 0 12px;
  background:linear-gradient(180deg, rgba(7,24,15,.95), rgba(7,24,15,.5)); -webkit-backdrop-filter:blur(16px); backdrop-filter:blur(16px);
  border-bottom:1px solid var(--line); box-shadow:0 1px 0 rgba(240,201,74,.16), 0 10px 26px -18px rgba(0,0,0,.8); }
.igmis-ic { background:none; border:none; color:#cdead9; cursor:pointer; display:grid; place-items:center; width:38px; height:38px; border-radius:11px; transition:background .18s, transform .12s; }
.igmis-ic:hover { background:rgba(255,255,255,.05); } .igmis-ic:active { transform:scale(.9); } .igmis-ic:disabled { opacity:.55; }
.igmis-ttl { font-size:18px; font-weight:800; letter-spacing:.01em; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.igmis-main { max-width:560px; margin:0 auto; padding:16px 12px; }

/* Hero cabinet — adaptive: gold "ready to claim" when claimables exist, else emerald */
.igmis-hero { position:relative; overflow:hidden; display:flex; align-items:center; gap:14px; padding:16px; border-radius:20px; margin-bottom:14px; border:1px solid transparent;
  background:linear-gradient(165deg, rgba(19,60,40,.92), rgba(6,20,13,.96));
  box-shadow:inset 0 0 0 1.3px rgba(240,201,74,.4), inset 0 1.5px 0 rgba(255,255,255,.13), inset 0 0 30px rgba(46,224,138,.07), 0 24px 48px -26px rgba(0,0,0,.9); }
.igmis-hero.ready { background:radial-gradient(130% 130% at 100% 0%, rgba(240,201,74,.2), transparent 55%), radial-gradient(120% 120% at 0% 0%, rgba(46,224,138,.14), transparent 58%), linear-gradient(160deg, rgba(22,80,52,.96), rgba(6,22,14,.97));
  box-shadow:inset 0 0 0 1.5px rgba(240,201,74,.6), inset 0 1.6px 0 rgba(255,255,255,.2), inset 0 0 28px rgba(46,224,138,.12), 0 0 26px -8px rgba(240,201,74,.55), 0 24px 48px -24px rgba(0,0,0,.88); }
.igmis-hero.ready::after { content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(105deg, transparent 42%, rgba(255,244,207,.14) 50%, transparent 58%); transform:translateX(-150%); animation:igmis-sweep 6s ease-in-out infinite; }
.igmis-hero-ic { flex:0 0 auto; width:52px; height:52px; border-radius:15px; display:grid; place-items:center; color:#ffe9a8;
  background:radial-gradient(120% 120% at 50% 16%, #1e6440, #05150d 78%); border:1px solid var(--line); box-shadow:inset 0 1px 0 rgba(246,230,176,.28), 0 0 14px -4px rgba(46,224,138,.5); }
.igmis-hero.ready .igmis-hero-ic { color:#3a2708; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); box-shadow:inset 0 1px 0 rgba(255,255,255,.6), 0 0 16px -3px rgba(240,201,74,.6); }
.igmis-hero-tx { position:relative; z-index:1; flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
.igmis-hero-tx b { font-size:15px; font-weight:800; color:var(--ink); }
.igmis-hero-v { font-size:24px !important; font-weight:900 !important; font-variant-numeric:tabular-nums; letter-spacing:-.01em;
  background:linear-gradient(100deg,var(--gold-lite),#ffe9a8 24%,var(--gold) 48%,#e0a93a 64%,var(--gold-lite) 100%); background-size:220% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; animation:igmis-gold 6s ease-in-out infinite; }
.igmis-hero-v em { font-style:normal; font-size:13px; -webkit-text-fill-color:var(--antique); }
.igmis-hero-tx small { font-size:11.5px; color:var(--mut); font-weight:600; }

.igmis-sec { display:flex; align-items:center; gap:9px; margin:2px 4px 11px; font-size:10px; letter-spacing:.18em; font-weight:700; text-transform:uppercase; color:var(--faint); }
.igmis-sec svg { color:var(--gold); }
.igmis-sec-meta { margin-left:auto; letter-spacing:.02em; color:var(--faint); font-weight:700; text-transform:none; font-family:inherit; }

.igmis-list { display:flex; flex-direction:column; gap:11px; }
@keyframes igmis-sweep { 0%,72% { transform:translateX(-150%); } 88%,100% { transform:translateX(150%); } }
@keyframes igmis-gold { 0%,100% { background-position:0 0; } 50% { background-position:100% 0; } }

/* Mission card — in-progress (base), claimable (gold), done (dimmed) */
.igmis-card { position:relative; display:flex; gap:14px; align-items:flex-start; padding:15px; border-radius:18px; border:1px solid transparent;
  background:linear-gradient(165deg, rgba(19,60,40,.9), rgba(6,20,13,.95));
  box-shadow:inset 0 0 0 1.2px rgba(240,201,74,.32), inset 0 1.4px 0 rgba(255,255,255,.11), 0 22px 44px -26px rgba(0,0,0,.88); }
.igmis-card.is-claim { overflow:hidden; background:radial-gradient(130% 130% at 100% 0%, rgba(240,201,74,.14), transparent 56%), linear-gradient(165deg, rgba(22,68,44,.94), rgba(7,22,14,.96));
  box-shadow:inset 0 0 0 1.4px rgba(240,201,74,.6), inset 0 1.5px 0 rgba(255,255,255,.16), inset 0 0 26px rgba(46,224,138,.1), 0 0 24px -8px rgba(240,201,74,.5), 0 22px 44px -24px rgba(0,0,0,.88); }
.igmis-card.is-claim::before { content:""; position:absolute; inset:0; pointer-events:none; z-index:0; background:linear-gradient(105deg, transparent 44%, rgba(255,244,207,.1) 50%, transparent 56%); transform:translateX(-160%); animation:igmis-sweep 6.5s ease-in-out infinite; }
.igmis-card.is-claim > * { position:relative; z-index:1; }
.igmis-card.is-done { opacity:.66; }
.igmis-card.is-done::after { content:"✓"; position:absolute; top:12px; right:14px; font-size:11px; font-weight:900; color:#04180e; width:18px; height:18px; border-radius:50%; display:grid; place-items:center;
  background:linear-gradient(180deg,#9ffcc4,#2ee08a 60%,#0e7a4a); box-shadow:inset 0 1px 0 rgba(255,255,255,.5); }

/* Icon with conic progress ring (real current/target) */
.igmis-iconwrap { flex-shrink:0; width:52px; height:52px; border-radius:50%; padding:3px; display:grid; place-items:center; box-shadow:0 0 14px -5px rgba(46,224,138,.5); }
.igmis-card.is-done .igmis-iconwrap { box-shadow:0 0 14px -5px rgba(240,201,74,.5); }
.igmis-icon { width:100%; height:100%; border-radius:50%; display:grid; place-items:center; font-size:22px; line-height:1; color:#ffe9a8;
  background:radial-gradient(120% 120% at 50% 18%, #1a5738, #05150d 76%); border:1px solid var(--line); box-shadow:inset 0 1px 0 rgba(246,230,176,.22), inset 0 -3px 6px rgba(0,0,0,.35); }
.igmis-body { flex:1; min-width:0; }
.igmis-title-row { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.igmis-title { margin:0; font-size:14.5px; font-weight:800; color:var(--ink); letter-spacing:-.005em; }
.igmis-reward { font-size:12.5px; font-weight:900; font-variant-numeric:tabular-nums; white-space:nowrap;
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 60%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.igmis-desc { margin:5px 0 10px; font-size:12px; font-weight:600; color:var(--mut); line-height:1.45; }
.igmis-bar-track { height:7px; border-radius:999px; background:rgba(0,0,0,.42); border:1px solid var(--hair); overflow:hidden; box-shadow:inset 0 1px 2px rgba(0,0,0,.5); }
.igmis-bar-fill { height:100%; border-radius:999px; background:linear-gradient(90deg,#0e7a4a,#2ee08a); box-shadow:0 0 10px -2px rgba(46,224,138,0.6); transition:width .7s cubic-bezier(.22,1,.36,1); }
.igmis-card.is-done .igmis-bar-fill { background:linear-gradient(90deg,var(--gold-deep),var(--gold)); box-shadow:0 0 10px -2px rgba(240,201,74,.5); }
.igmis-foot { display:flex; align-items:center; justify-content:space-between; margin-top:10px; }
.igmis-prog { font-size:11px; font-weight:800; color:var(--mut); font-variant-numeric:tabular-nums; }
.igmis-prog-lbl { font-size:11px; font-weight:800; color:var(--grn); font-variant-numeric:tabular-nums; }
.igmis-claim { display:inline-flex; align-items:center; gap:6px; padding:9px 18px; border-radius:11px; font-size:12px; font-weight:800; font-family:inherit; cursor:pointer;
  color:#3a2708; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); border:none;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.7), 0 0 16px -4px rgba(240,201,74,.6), 0 6px 14px -6px rgba(0,0,0,.5); transition:transform .12s, filter .12s; }
.igmis-claim:hover { filter:brightness(1.05); } .igmis-claim:active { transform:translateY(1px); }
.igmis-claim:disabled { opacity:0.7; cursor:default; }
.igmis-claimed { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:900; color:var(--grn); }
.igmis-spin { animation:igmis-rot 0.9s linear infinite; }
@keyframes igmis-rot { to { transform:rotate(360deg); } }

/* Skeleton */
.igmis-sk { height:104px; border-radius:18px; border:1px solid var(--hair);
  background:linear-gradient(100deg, rgba(255,255,255,.05) 30%, rgba(255,255,255,.1) 50%, rgba(255,255,255,.05) 70%), linear-gradient(165deg, rgba(19,60,40,.9), rgba(6,20,13,.95));
  background-size:200% 100%, 100% 100%; animation:igmis-sh 1.4s ease-in-out infinite; }
@keyframes igmis-sh { from { background-position:200% 0, 0 0; } to { background-position:-200% 0, 0 0; } }

.igmis-empty { text-align:center; color:var(--mut); padding:64px 22px; margin:10px 0; border-radius:22px; border:1px solid transparent;
  background:linear-gradient(165deg, rgba(19,60,40,.92), rgba(6,20,13,.96));
  box-shadow:inset 0 0 0 1.3px rgba(240,201,74,.38), inset 0 1.5px 0 rgba(255,255,255,.12), inset 0 0 34px rgba(46,224,138,.06), 0 24px 48px -28px rgba(0,0,0,.9); }
.igmis-empty-ic { display:grid; place-items:center; margin:0 auto 14px; width:66px; height:66px; border-radius:50%; color:var(--grn);
  background:radial-gradient(120% 120% at 50% 20%, rgba(46,224,138,.16), rgba(6,20,13,.4)); border:1px solid var(--line); box-shadow:0 0 30px -8px rgba(46,224,138,.4); }
.igmis-empty-t { font-size:16px; font-weight:800; color:var(--ink); margin-bottom:5px; }
.igmis-empty-s { font-size:12.5px; line-height:1.5; }

@media (prefers-reduced-motion: reduce) {
  .igmis-spin, .igmis-sk, .igmis-hero.ready::after, .igmis-hero-v, .igmis-card.is-claim::before { animation:none !important; }
  .igmis-hero.ready::after, .igmis-card.is-claim::before { transform:translateX(-160%) !important; }
  .igmis-bar-fill, .igmis-ic, .igmis-claim { transition:none !important; }
}
`;

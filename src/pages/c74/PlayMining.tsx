/**
 * PlayMining — C74 "Play Mining" play-to-earn screen (/c74/mining).
 *
 * Gamified skin over the C74 energy engine: wagering "mines" C74 with a daily
 * cap, VIP multiplier and streak bonus. Pure display of useMining() (the
 * get_mining_status RPC) — no writes, no money path. NOT real crypto mining:
 * a reward-accrual system that migrates to on-chain utility after token launch.
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import JungleBackdrop from '@/components/c7/JungleBackdrop';
import LuxFrameFX from '@/components/c7/shell/LuxFrameFX';
import { num as fmt } from '@/lib/format';
import { useMining, MINING_LEVELS } from '@/hooks/useMining';
import { useC74 } from '@/hooks/useC74';
import C7Icon from '@/components/c7/C7Icon';

const fmtC = (n: number) => fmt(Math.round(n));
// Show a whole rate as an integer, a fractional rate trimmed (e.g. 1 → "1", 1.5 → "1.5").
const fmtRate = (n: number) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)));

export default function PlayMining() {
  const navigate = useNavigate();
  const { status, loading, error, reload } = useMining();
  // The real per-$1 wager earn rate is server config (get_c74_summary), not a
  // fixed UI literal — so it can never drift from what admin actually sets.
  const { summary } = useC74();
  const wagerRate = summary?.config?.wager_earn_per_usdt;

  const cap = status?.daily_cap ?? 500;
  const today = status?.today_mined ?? 0;
  const pct = Math.max(0, Math.min(100, status?.progress_pct ?? 0));
  const remaining = status?.remaining ?? cap;
  const lifetime = status?.lifetime ?? 0;
  const lvlIdx = status?.level_idx ?? 0;
  const vipMult = status?.vip_mult ?? 1;
  const streak = status?.streak_days ?? 0;
  const capped = remaining <= 0;

  // radial ring geometry
  const R = 78, C = 2 * Math.PI * R;
  const dash = C * (pct / 100);

  return (
    <div className="mine-root">
      <style>{CSS}</style>
      <JungleBackdrop />
      <div className="mine-wrap">
        <header className="mine-bar c7-lux-head">
          <LuxFrameFX />
          <button className="mine-ic" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/c74/token'))} aria-label="Back"><ArrowLeft size={18} /></button>
          <span className="mine-ttl c7p-title tt-gold"><C7Icon name="pickaxe" size={18} /> C74 Play Mining</span>
          <span style={{ width: 34 }} />
        </header>

        <main className="mine-main">
          {/* Ornate concept-art title banner (decorative, no baked data) */}
          <img className="mine-crown" src="/images/v3/frames/mining-title.png" alt="C74 Play Mining" />
          {loading && !status ? (
            <div className="mine-loading"><Loader2 className="mine-spin" size={26} /></div>
          ) : error && !status ? (
            <div className="mine-error">
              <span className="mine-err-t">Couldn't load your mining status</span>
              <span className="mine-err-s">Check your connection and try again.</span>
              <button className="c7p-btn-green mine-retry" onClick={() => reload()}>Retry</button>
            </div>
          ) : (
            <>
              {/* Mining rig — radial progress */}
              <section className="mine-hero">
                <span className="mine-shine" aria-hidden="true" />
                <div className="mine-lvl-badge">{MINING_LEVELS[lvlIdx]?.icon} {status?.level_name ?? 'Bronze Miner'}</div>
                <div className={`mine-ring-wrap${capped ? ' is-capped' : ''}`}>
                  <svg viewBox="0 0 180 180" className="mine-ring">
                    <circle cx="90" cy="90" r={R} className="mine-ring-track" />
                    <circle cx="90" cy="90" r={R} className="mine-ring-fill"
                      strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={C * 0.25} strokeLinecap="round" />
                  </svg>
                  <div className="mine-ring-center">
                    <span className="mine-pick" aria-hidden="true"><C7Icon name="pickaxe" size={22} /></span>
                    <span className="mine-today">{fmtC(today)}</span>
                    <span className="mine-cap">/ {fmtC(cap)} C74</span>
                  </div>
                </div>
                <div className="mine-today-row">
                  <span>Mined today: <b>{fmtC(today)} C74</b></span>
                  <span className="mine-remain">{capped ? '🔒 Daily cap reached' : `${fmtC(remaining)} left`}</span>
                </div>
              </section>

              {/* Live multipliers */}
              <div className="c7p-sec">
                <span className="c7p-sec-ic"><C7Icon name="bolt" size={16} /></span>
                <span className="c7p-sec-t">Active Boosts</span>
                <i className="c7p-sec-rule" aria-hidden="true" />
              </div>
              <section className="mine-boosts">
                <div className="mine-boost">
                  <span className="mine-b-ic"><C7Icon name="coin" size={18} /></span>
                  <span className="mine-b-v">{wagerRate != null ? `${fmtRate(wagerRate)} C74` : '—'}</span>
                  <span className="mine-b-l">per $1 wager</span>
                </div>
                <div className="mine-boost hot">
                  <span className="mine-b-ic"><C7Icon name="star" size={22} /></span>
                  <span className="mine-b-v">×{vipMult.toFixed(2)}</span>
                  <span className="mine-b-l">VIP multiplier</span>
                </div>
                <div className="mine-boost hot">
                  <span className="mine-b-ic"><C7Icon name="fire" size={22} /></span>
                  <span className="mine-b-v">{streak}</span>
                  <span className="mine-b-l">day streak</span>
                </div>
              </section>

              {/* Mining levels ladder */}
              <div className="c7p-sec">
                <span className="c7p-sec-ic"><C7Icon name="medal" size={16} /></span>
                <span className="c7p-sec-t">Mining Ranks</span>
                <i className="c7p-sec-rule" aria-hidden="true" />
              </div>
              <section className="mine-levels">
                {MINING_LEVELS.map((lv) => {
                  const reached = lifetime >= lv.at;
                  const current = lv.idx === lvlIdx;
                  return (
                    <div key={lv.idx} className={`mine-lv${reached ? ' reached' : ''}${current ? ' current' : ''}`}>
                      <span className="mine-lv-ic">{lv.icon}</span>
                      <span className="mine-lv-name">{lv.name}</span>
                      <span className="mine-lv-at">{lv.at === 0 ? 'Start' : `${fmtC(lv.at)}+ C74`}</span>
                      {current && <span className="mine-lv-tag">You</span>}
                      {reached && !current && <span className="mine-lv-check">✓</span>}
                    </div>
                  );
                })}
                {status?.level_next_at != null && (
                  <div className="mine-next">
                    {fmtC(Math.max(0, status.level_next_at - lifetime))} C74 to next rank
                  </div>
                )}
              </section>

              {/* Lifetime */}
              <section className="mine-life">
                <div><span className="mine-life-k">Total mined (lifetime)</span><span className="mine-life-v"><C7Icon name="pickaxe" size={14} /> {fmtC(lifetime)} C74</span></div>
                <div><span className="mine-life-k">C74 balance</span><span className="mine-life-v"><C7Icon name="coin" size={14} /> {fmtC(status?.balance ?? 0)}</span></div>
              </section>

              {/* What C74 does now (present utility) */}
              <section className="mine-note">
                <b><C7Icon name="bolt" size={13} /> What your C74 does now</b>
                <p>Mined C74 is usable today — it helps cover your withdrawal network fees, and your mining rank &amp; streak power your progress across the C7 ecosystem. Keep mining every day to build your stack.</p>
              </section>

              {/* Roadmap note — clearly future */}
              <section className="mine-note soon">
                <b><C7Icon name="gem" size={13} /> Coming with the token launch <em>Soon</em></b>
                <p>After on-chain launch, C74 adds market value, swap / trade and staking perks — same balance you're building now, new powers.</p>
              </section>

              <button className="c7p-btn-green mine-play" onClick={() => navigate('/v3')}>
                🎮 Play & Mine C74
              </button>
              <p className="mine-fine">Not real crypto mining — a play-to-earn reward system. C74 are internal reward points today (already usable toward withdrawal fees); on-chain utility arrives at token launch.</p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

const CSS = `
.mine-root { position: relative; min-height: 100vh; min-height: 100dvh; background: radial-gradient(120% 65% at 50% -8%, rgba(246,201,69,0.12), transparent 58%), radial-gradient(110% 55% at 50% 0%, rgba(46,224,138,0.11), transparent 60%), linear-gradient(172deg, #0d3d28 0%, #072517 46%, #04160d 100%); }
.mine-wrap { position: relative; z-index: 1; max-width: 520px; margin: 0 auto; padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px)); }
.mine-bar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 14px 16px; background: linear-gradient(180deg, rgba(3,13,7,0.92), rgba(3,13,7,0.5)); backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(120,240,176,0.28); }
.mine-ic { width: 34px; height: 34px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(120,240,176,0.35); color: #d6ffe9; cursor: pointer; }
.mine-ttl { font-size: 17px; font-weight: 900; }
.mine-main { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.mine-crown { display: block; width: min(320px, 84%); height: auto; margin: 2px auto -2px; pointer-events: none;
  filter: drop-shadow(0 6px 14px rgba(0,0,0,0.5)) drop-shadow(0 0 18px rgba(246,201,69,0.25)); }
.mine-loading { display: flex; justify-content: center; padding: 60px 0; color: #6bf5a3; }
.mine-spin { animation: mine-spin 1s linear infinite; } @keyframes mine-spin { to { transform: rotate(360deg); } }
.mine-error { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 48px 20px; text-align: center; }
.mine-err-t { font-size: 14px; font-weight: 900; color: #ffe6a2; }
.mine-err-s { font-size: 12px; color: rgba(220,232,223,0.7); }
.mine-retry { margin-top: 10px; padding: 10px 26px; font-size: 14px; font-weight: 900; border-radius: 14px; cursor: pointer; }

/* Hero mining rig */
.mine-hero { position: relative; overflow: hidden; border-radius: 24px; padding: 20px 18px 16px; text-align: center;
  background: radial-gradient(120% 90% at 50% -18%, rgba(246,201,69,0.22), transparent 54%),
    radial-gradient(95% 78% at 50% 118%, rgba(46,158,31,0.32), transparent 66%),
    linear-gradient(160deg, #0f4429, #06210f 60%, #02100a);
  border: 1.5px solid rgba(120,240,176,0.55);
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.28), inset 0 -18px 40px rgba(0,0,0,0.34), 0 18px 40px -14px rgba(0,0,0,0.7),
    inset 0 0 0 1px rgba(245,180,35,0.16), 0 0 26px -10px rgba(245,180,35,0.32); }
.mine-shine { position: absolute; inset: 0; background: linear-gradient(115deg, transparent 44%, rgba(255,255,255,0.22) 50%, transparent 56%);
  background-size: 220% 220%; background-position: 185% 185%; animation: mine-sheen 6s ease-in-out infinite; pointer-events: none; }
@keyframes mine-sheen { 0%,72% { background-position: 185% 185%; } 100% { background-position: -40% -40%; } }
.mine-lvl-badge { display: inline-block; font-size: 12px; font-weight: 900; color: #241808; padding: 5px 14px; border-radius: 999px;
  background: linear-gradient(180deg, #fff2c0, #f6d67a 45%, #c68a2e); box-shadow: inset 0 1px 0 rgba(255,255,255,0.5); }
.mine-ring-wrap { position: relative; width: 200px; height: 200px; margin: 8px auto 4px; }
.mine-ring { width: 100%; height: 100%; transform: rotate(0deg); }
.mine-ring-track { fill: none; stroke: rgba(0,0,0,0.28); stroke-width: 13; }
.mine-ring-fill { fill: none; stroke: #ffe08a; stroke-width: 13;
  filter: drop-shadow(0 0 6px rgba(255,224,138,0.9)); transition: stroke-dasharray .8s cubic-bezier(.2,.85,.25,1); }
.mine-ring-wrap.is-capped .mine-ring-fill { stroke: #8bffc4; filter: drop-shadow(0 0 8px rgba(53,217,138,0.9)); }
.mine-ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.mine-pick { font-size: 26px; animation: mine-swing 2.4s ease-in-out infinite; transform-origin: 70% 30%; }
@keyframes mine-swing { 0%,100% { transform: rotate(-12deg); } 50% { transform: rotate(14deg); } }
@media (prefers-reduced-motion: reduce) { .mine-pick, .mine-shine { animation: none; } }
.mine-today { font-size: 34px; font-weight: 900; color: #fff; line-height: 1; font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 6px rgba(0,0,0,0.4); }
.mine-cap { font-size: 12px; font-weight: 800; color: rgba(255,255,255,0.72); }
.mine-today-row { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; font-size: 12.5px; color: rgba(255,255,255,0.82); }
.mine-today-row b { color: #fff; }
.mine-remain { font-weight: 800; color: #d6ffe9; }

.mine-sec { font-size: 11px; font-weight: 900; letter-spacing: 1.4px; text-transform: uppercase; color: #b9f6d0; margin: 4px 2px -4px; }

/* Boosts */
.mine-boosts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.mine-boost { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 14px 8px; border-radius: 16px;
  background: radial-gradient(120% 100% at 50% -10%, rgba(47,226,154,0.14), transparent 60%), linear-gradient(160deg, rgba(20,66,42,0.85), rgba(10,22,15,0.92));
  border: 1px solid rgba(95,221,160,0.3); }
.mine-boost.hot { border-color: rgba(246,214,122,0.5); box-shadow: 0 0 16px -8px rgba(245,180,35,0.5); }
.mine-b-ic { font-size: 20px; }
.mine-b-v { font-size: 16px; font-weight: 900; color: #ffe6a2; font-variant-numeric: tabular-nums; }
.mine-b-l { font-size: 10px; font-weight: 700; color: rgba(196,240,214,0.8); text-align: center; }

/* Levels */
.mine-levels { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 18px;
  background: linear-gradient(160deg, #0f7a4e, #05301e); border: 1px solid rgba(53,217,138,0.28);
  box-shadow: inset 0 0 0 1px rgba(245,180,35,0.12); }
.mine-lv { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: rgba(0,0,0,0.22); opacity: 0.55; }
.mine-lv.reached { opacity: 1; }
.mine-lv.current { background: linear-gradient(160deg, rgba(246,214,122,0.2), rgba(198,138,58,0.14)); border: 1px solid rgba(246,214,122,0.5); opacity: 1; }
.mine-lv-ic { font-size: 22px; }
.mine-lv-name { flex: 1; font-size: 13.5px; font-weight: 800; color: #eef7f0; }
.mine-lv-at { font-size: 11px; font-weight: 700; color: #9fd8bd; font-variant-numeric: tabular-nums; }
.mine-lv-tag { font-size: 10px; font-weight: 900; color: #241808; padding: 3px 9px; border-radius: 999px; background: linear-gradient(180deg, #fff2c0, #e8b44a); }
.mine-lv-check { color: #6bf5a3; font-weight: 900; }
.mine-next { text-align: center; font-size: 11.5px; font-weight: 800; color: #ffe6a2; padding-top: 2px; }

/* Lifetime */
.mine-life { display: flex; justify-content: space-between; gap: 10px; padding: 14px 16px; border-radius: 16px;
  background: linear-gradient(160deg, rgba(18,58,38,0.9), rgba(7,20,13,0.94)); border: 1px solid rgba(120,240,176,0.28); }
.mine-life > div { display: flex; flex-direction: column; gap: 3px; }
.mine-life > div:last-child { text-align: right; }
.mine-life-k { font-size: 10.5px; font-weight: 700; color: #9fd8bd; text-transform: uppercase; letter-spacing: 0.5px; }
.mine-life-v { font-size: 17px; font-weight: 900; color: #fff; font-variant-numeric: tabular-nums; }

/* Roadmap note */
.mine-note { padding: 14px 16px; border-radius: 16px; background: linear-gradient(160deg, rgba(20,66,42,0.7), rgba(10,20,15,0.85));
  border: 1px solid rgba(246,214,122,0.32); }
.mine-note b { font-size: 13px; color: #ffe6a2; }
.mine-note p { margin: 5px 0 0; font-size: 12px; line-height: 1.5; color: rgba(220,232,223,0.78); }
.mine-note.soon { border-style: dashed; opacity: 0.92; }
.mine-note.soon em { font-style: normal; font-size: 9px; font-weight: 900; letter-spacing: 0.4px; text-transform: uppercase; color: #2a1a02;
  padding: 2px 7px; border-radius: 999px; margin-left: 6px; vertical-align: middle; background: linear-gradient(180deg, #ffe9a8, #d68a1e); }

.mine-play { width: 100%; margin-top: 4px; padding: 16px; font-size: 16px; font-weight: 900; border-radius: 18px; cursor: pointer; }
.mine-fine { text-align: center; font-size: 10px; color: rgba(220,232,223,0.5); margin: 2px 0 0; }
`;

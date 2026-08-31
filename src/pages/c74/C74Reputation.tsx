/**
 * C74Reputation — the player's trust & loyalty score (/c74/reputation).
 *
 * Ecosystem layer between C74 Energy and the C74 Token: a server-computed
 * reputation (get_c74_reputation) from real behaviour. Pure display, no writes.
 * Post-launch this maps to token airdrop weight / governance voice.
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import JungleBackdrop from '@/components/c7/JungleBackdrop';
import LuxFrameFX from '@/components/c7/shell/LuxFrameFX';
import { useReputation, REP_TIERS, REP_PERKS } from '@/hooks/useReputation';
import C7Icon from '@/components/c7/C7Icon';
import C7Asset from '@/components/c7/C7Asset';

export default function C74Reputation() {
  const navigate = useNavigate();
  const { rep, loading, error, reload } = useReputation();

  const score = rep?.score ?? 0;
  const max = rep?.max ?? 1000;
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const tierIdx = rep?.tier_idx ?? 0;
  const perks = REP_PERKS[tierIdx] ?? [];

  // gauge arc geometry (270° sweep)
  const R = 80, C = 2 * Math.PI * R, sweep = 0.75;
  const fill = C * sweep * (pct / 100);

  return (
    <div className="rep-root">
      <style>{CSS}</style>
      <JungleBackdrop />
      <div className="rep-wrap">
        <header className="rep-bar c7-lux-head">
          <LuxFrameFX />
          <button className="rep-ic" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/c74/token'))} aria-label="Back"><ArrowLeft size={18} /></button>
          <span className="rep-ttl c7p-title tt-gold"><C7Asset slot="icon.reputation" size={20} fallback={<C7Icon name="trophy" size={18} />} /> C74 Reputation</span>
          <span style={{ width: 34 }} />
        </header>

        <main className="rep-main">
          {loading && !rep ? (
            <div className="rep-loading"><Loader2 className="rep-spin" size={26} /></div>
          ) : error && !rep ? (
            <div className="rep-error">
              <span className="rep-err-t">Couldn't load your reputation</span>
              <span className="rep-err-s">Check your connection and try again.</span>
              <button className="c7p-btn-green" onClick={() => reload()}>Retry</button>
            </div>
          ) : (
            <>
              {/* Score gauge */}
              <section className="rep-hero">
                <span className="rep-shine" aria-hidden="true" />
                <div className="rep-gauge">
                  <svg viewBox="0 0 180 180" className="rep-svg">
                    <circle cx="90" cy="90" r={R} className="rep-track"
                      strokeDasharray={`${C * sweep} ${C}`} strokeDashoffset={0} transform="rotate(135 90 90)" strokeLinecap="round" />
                    <circle cx="90" cy="90" r={R} className="rep-fill"
                      strokeDasharray={`${fill} ${C}`} strokeDashoffset={0} transform="rotate(135 90 90)" strokeLinecap="round" />
                  </svg>
                  <div className="rep-center">
                    <span className="rep-tier-ic">{rep?.tier_icon ?? '🌱'}</span>
                    <span className="rep-score">{score}</span>
                    <span className="rep-max">/ {max}</span>
                  </div>
                </div>
                <div className="rep-tier-name">{rep?.tier ?? 'Newcomer'}</div>
                {rep?.next_at != null && (
                  <div className="rep-next">{Math.max(0, rep.next_at - score)} pts to {REP_TIERS[tierIdx + 1]?.name ?? 'next tier'}</div>
                )}
              </section>

              {/* Tier ladder */}
              <div className="c7p-sec">
                <span className="c7p-sec-ic"><C7Icon name="ladder" size={18} /></span>
                <span className="c7p-sec-t">Reputation Tiers</span>
                <i className="c7p-sec-rule" aria-hidden="true" />
              </div>
              <section className="rep-tiers">
                {REP_TIERS.map((t) => {
                  const reached = score >= t.at;
                  const current = t.idx === tierIdx;
                  return (
                    <div key={t.idx} className={`rep-t${reached ? ' reached' : ''}${current ? ' current' : ''}`} title={t.name}>
                      <span className="rep-t-ic">{t.icon}</span>
                      <span className="rep-t-name">{t.name}</span>
                      <span className="rep-t-at">{t.at}</span>
                    </div>
                  );
                })}
              </section>

              {/* Factor breakdown */}
              <div className="c7p-sec">
                <span className="c7p-sec-ic"><C7Icon name="chart" size={18} /></span>
                <span className="c7p-sec-t">How it's scored</span>
                <i className="c7p-sec-rule" aria-hidden="true" />
              </div>
              <section className="rep-factors">
                {(rep?.factors ?? []).map((f) => {
                  const fpct = Math.max(0, Math.min(100, (f.pts / f.max) * 100));
                  return (
                    <div key={f.key} className="rep-f">
                      <div className="rep-f-top">
                        <span className="rep-f-ic">{f.icon}</span>
                        <span className="rep-f-label">{f.label}</span>
                        <span className="rep-f-detail">{f.detail}</span>
                        <span className="rep-f-pts">{f.pts}/{f.max}</span>
                      </div>
                      <div className="rep-f-bar"><i style={{ width: `${fpct}%` }} /></div>
                    </div>
                  );
                })}
              </section>

              {/* Perks */}
              <div className="c7p-sec">
                <span className="c7p-sec-ic"><C7Icon name="gift" size={18} /></span>
                <span className="c7p-sec-t">{rep?.tier ?? 'Newcomer'} Perks</span>
                <i className="c7p-sec-rule" aria-hidden="true" />
              </div>
              <section className="rep-perks">
                {perks.map((p, i) => <div key={i} className="rep-perk"><span>✦</span> {p}</div>)}
              </section>

              {/* Roadmap note */}
              <section className="rep-note">
                <b><C7Icon name="shield" size={15} /> Reputation → Token</b>
                <p>Your reputation is the trust layer beneath the C74 Token. After launch it maps to airdrop weight and governance voice — the more you're trusted today, the more you earn in the ecosystem tomorrow.</p>
              </section>

              <button className="c7p-btn-green rep-cta" onClick={() => navigate('/v3')}><C7Icon name="rocket" size={16} /> Boost my reputation</button>
              <p className="rep-fine">Reputation is computed from your real activity. Verify KYC, keep a daily streak, and play fair to climb.</p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

const CSS = `
.rep-root { position: relative; min-height: 100vh; min-height: 100dvh; background: radial-gradient(120% 65% at 50% -8%, rgba(246,201,69,0.12), transparent 58%), radial-gradient(110% 55% at 50% 0%, rgba(46,224,138,0.11), transparent 60%), linear-gradient(172deg, #0d3d28 0%, #072517 46%, #04160d 100%); }
.rep-wrap { position: relative; z-index: 1; max-width: 520px; margin: 0 auto; padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px)); }
.rep-bar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 14px 16px; background: linear-gradient(180deg, rgba(3,13,7,0.92), rgba(3,13,7,0.5)); backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(120,240,176,0.28); }
.rep-ic { width: 34px; height: 34px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(120,240,176,0.35); color: #d6ffe9; cursor: pointer; }
.rep-ttl { font-size: 17px; font-weight: 900; }
.rep-main { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.rep-loading { display: flex; justify-content: center; padding: 60px 0; color: #6bf5a3; }
.rep-spin { animation: rep-spin 1s linear infinite; } @keyframes rep-spin { to { transform: rotate(360deg); } }
.rep-error { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 54px 20px; text-align: center; }
.rep-err-t { font-size: 14px; font-weight: 900; color: #ffe6a2; }
.rep-err-s { font-size: 12px; color: rgba(220,232,223,0.7); }
.rep-retry { margin-top: 12px; padding: 11px 28px; border: none; border-radius: 14px; cursor: pointer; font-size: 14px; font-weight: 900;
  color: #05340f; background: linear-gradient(180deg, #9CFFCB, #39FF88 55%, #00A86B); box-shadow: 0 8px 22px -10px rgba(57,255,136,0.6); }

.rep-hero { position: relative; overflow: hidden; border-radius: 24px; padding: 22px 18px 18px; text-align: center;
  background: radial-gradient(120% 82% at 50% -16%, rgba(159,255,196,0.26), transparent 52%),
    radial-gradient(96% 62% at 100% 128%, rgba(11,122,63,0.55), transparent 60%),
    linear-gradient(160deg, #0f4429 0%, #06210f 60%, #02100a 100%);
  border: 1.5px solid rgba(120,240,176,0.55);
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.28), inset 0 -18px 40px rgba(0,0,0,0.34), 0 18px 40px -14px rgba(0,0,0,0.7),
    inset 0 0 0 1px rgba(245,180,35,0.16), 0 0 26px -10px rgba(245,180,35,0.32); }
.rep-shine { position: absolute; inset: 0; background: linear-gradient(115deg, transparent 44%, rgba(255,255,255,0.2) 50%, transparent 56%);
  background-size: 220% 220%; background-position: 185% 185%; animation: rep-sheen 6s ease-in-out infinite; pointer-events: none; }
@keyframes rep-sheen { 0%,72% { background-position: 185% 185%; } 100% { background-position: -40% -40%; } }
.rep-gauge { position: relative; width: 190px; height: 190px; margin: 0 auto; }
.rep-svg { width: 100%; height: 100%; }
.rep-track { fill: none; stroke: rgba(0,0,0,0.26); stroke-width: 12; }
.rep-fill { fill: none; stroke: #ffe08a; stroke-width: 12; filter: drop-shadow(0 0 6px rgba(255,224,138,0.9));
  transition: stroke-dasharray .9s cubic-bezier(.2,.85,.25,1); }
.rep-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; }
.rep-tier-ic { font-size: 26px; }
.rep-score { font-size: 44px; font-weight: 900; color: #fff; line-height: 1; font-variant-numeric: tabular-nums; text-shadow: 0 2px 6px rgba(0,0,0,0.4); }
.rep-max { font-size: 12px; font-weight: 800; color: rgba(255,255,255,0.7); }
.rep-tier-name { margin-top: 8px; display: inline-block; font-size: 15px; font-weight: 900; color: #241808; padding: 5px 18px; border-radius: 999px;
  background: linear-gradient(180deg, #fff2c0, #f6d67a 45%, #c68a2e); box-shadow: inset 0 1px 0 rgba(255,255,255,0.5); }
.rep-next { margin-top: 8px; font-size: 12px; font-weight: 800; color: #d6ffe9; }

.rep-sec { font-size: 11px; font-weight: 900; letter-spacing: 1.4px; text-transform: uppercase; color: #b9f6d0; margin: 4px 2px -4px; }

.rep-tiers { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.rep-t { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 4px; border-radius: 12px; opacity: 0.5;
  background: linear-gradient(160deg, rgba(20,66,42,0.85), rgba(10,22,15,0.92)); border: 1px solid rgba(95,221,160,0.28); }
.rep-t.reached { opacity: 1; }
.rep-t.current { opacity: 1; border-color: rgba(246,214,122,0.6); box-shadow: 0 0 14px -6px rgba(245,180,35,0.7); }
.rep-t-ic { font-size: 19px; }
.rep-t-name { font-size: 9.5px; font-weight: 800; color: #eef7f0; }
.rep-t-at { font-size: 9px; font-weight: 700; color: #9fd8bd; }

.rep-factors { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 18px;
  background: linear-gradient(160deg, #0f7a4e, #05301e); border: 1px solid rgba(53,217,138,0.28); box-shadow: inset 0 0 0 1px rgba(245,180,35,0.1); }
.rep-f-top { display: flex; align-items: center; gap: 8px; font-size: 12.5px; }
.rep-f-ic { font-size: 15px; }
.rep-f-label { font-weight: 800; color: #eef7f0; }
.rep-f-detail { flex: 1; font-size: 10.5px; color: #9fd8bd; text-align: right; }
.rep-f-pts { font-weight: 900; color: #ffe6a2; font-variant-numeric: tabular-nums; font-size: 11.5px; min-width: 44px; text-align: right; }
.rep-f-bar { margin-top: 5px; height: 7px; border-radius: 999px; background: rgba(0,0,0,0.3); overflow: hidden; }
.rep-f-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #35d98a, #ffe08a);
  box-shadow: 0 0 8px -2px rgba(255,224,138,0.7); transition: width .8s cubic-bezier(.2,.85,.25,1); }

.rep-perks { display: flex; flex-direction: column; gap: 7px; padding: 14px 16px; border-radius: 16px;
  background: linear-gradient(160deg, rgba(18,58,38,0.9), rgba(7,20,13,0.94)); border: 1px solid rgba(246,214,122,0.3); }
.rep-perk { display: flex; align-items: center; gap: 9px; font-size: 13px; font-weight: 700; color: #eef7f0; }
.rep-perk span { color: #ffd86b; }

.rep-note { padding: 14px 16px; border-radius: 16px; background: linear-gradient(160deg, rgba(20,66,42,0.7), rgba(10,20,15,0.85));
  border: 1px solid rgba(246,214,122,0.32); }
.rep-note b { font-size: 13px; color: #ffe6a2; }
.rep-note p { margin: 5px 0 0; font-size: 12px; line-height: 1.5; color: rgba(220,232,223,0.78); }
.rep-cta { width: 100%; margin-top: 4px; padding: 15px; font-size: 15px; font-weight: 900; border-radius: 16px; cursor: pointer; }
.rep-fine { text-align: center; font-size: 10px; color: rgba(220,232,223,0.5); margin: 2px 0 0; }
`;

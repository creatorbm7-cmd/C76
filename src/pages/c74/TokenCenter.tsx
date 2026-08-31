// C74 Token Center — the unified C74 dashboard (/c74/token).
//
// Milestone 1: Overview. Pure COMPOSITION of existing live services — no new
// backend: useC74() (balance / tier / gas-saved / rewards config) + useC74Price()
// (USD valuation from the authoritative energy_usd peg). Later milestones add
// Rewards / Gas & Activity / Token-Launch sections without a rewrite; the price
// already reads the peg and is oracle-swappable, so at token launch only the data
// source changes — not this UI.
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import JungleBackdrop from '@/components/c7/JungleBackdrop';
import LuxFrameFX from '@/components/c7/shell/LuxFrameFX';
import C74GasPanel from '@/components/wallet/C74GasPanel';
import { useC74 } from '@/hooks/useC74';
import C7Asset from '@/components/c7/C7Asset';
import C7TierIcon from '@/components/c7/C7TierIcon';
import C7ErrorState from '@/components/c7/C7ErrorState';
import C7Icon from '@/components/c7/C7Icon';
import { useC74Price, formatC74Usd } from '@/hooks/useC74Price';
import { usd, num as fmt } from '@/lib/format';

const FUTURE = ['Market Price', 'Explorer', 'Holders', 'Circulating Supply', 'Market Cap', 'Swap / Buy'];

const fmtT = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' });

export default function TokenCenter() {
  const nav = useNavigate();
  const { summary, history, loading, error, reload } = useC74();
  const price = useC74Price();
  const bal = summary?.balance ?? 0;
  const usdValue = bal * price.usd;
  const gasSaved = summary?.fee_saved_usdt_approx ?? 0;
  const coverable = summary?.coverable_fee_usdt ?? 0;
  const tier = summary?.tier ?? 'Spark';

  // C74 ecosystem — the old /c74 hub merged into the Token Center: mining +
  // reputation. Reward mechanics (wheel/missions/events/refer) live in the
  // dedicated Rewards tab now, not here.
  const eco = [
    { icon: <C7Icon name="pickaxe" size={22} />, label: 'Play Mining', sub: 'Mine C74 as you play', amt: 'Open', badge: null as string | null, go: false, to: '/c74/mining' },
    { icon: <C7Icon name="trophy" size={22} />, label: 'Reputation', sub: 'Your trust score', amt: 'View', badge: null as string | null, go: false, to: '/c74/reputation' },
  ];

  return (
    <div className="tc-root">
      <style>{CSS}</style>
      <JungleBackdrop />
      <div className="tc-wrap">
        <header className="tc-bar">
          <LuxFrameFX />
          <button className="tc-ic" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))} aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <span className="tc-ttl c7p-title tt-gold"><C7Asset slot="c74.medallion" className="tc-ttl-coin" fallback={<img className="tc-ttl-coin" src="/icons/v3/c74-token.png" alt="" aria-hidden="true" />} /> C74 Token Center</span>
          <span style={{ width: 34 }} />
        </header>

        <main className="tc-main">
          {/* Ornate crown chrome (data-free emblem cropped from the concept art) */}
          <div className="tc-crownwrap">
            <img className="tc-crown" src="/images/v3/frames/crown-emblem.png" alt="" aria-hidden="true" />
            <span className="tc-crown-ttl c7p-title tt-gold">C74 Token Center</span>
          </div>
          {loading && !summary ? (
            <div className="tc-loading"><Loader2 className="tc-spin" size={26} /></div>
          ) : error && !summary ? (
            <C7ErrorState
              title="Couldn't load your C74 balance"
              message="We couldn't reach the C74 ledger. Check your connection and try again."
              onRetry={() => reload()}
            />
          ) : (
            <>
              {/* Overview — balance hero */}
              <section className="tc-hero">
                <span className="tc-shine" aria-hidden="true" />
                <div className="tc-tier"><C7TierIcon tier={tier} size={14} /> {tier}</div>
                <div className="tc-bal-k"><C7Icon name="coin" size={16} /> C74 Balance</div>
                <div className="tc-bal-v">{fmt(bal)}</div>
                <div className="tc-bal-usd">≈ {usd(usdValue)} <span>· {price.label}</span></div>
              </section>

              {/* Present-tense utility — what C74 does today */}
              <p className="tc-util"><C7Icon name="bolt" size={16} /> <b>Usable now</b> — your C74 helps cover withdrawal network fees and powers your progress across the C7 ecosystem.</p>

              {/* Overview — stat tiles */}
              <section className="tc-grid">
                <button type="button" className="tc-stat" onClick={() => nav('/v3/wallet')}>
                  <span className="tc-stat-i"><C7Icon name="gas" size={18} /></span>
                  <span className="tc-stat-v">{usd(gasSaved)}</span>
                  <span className="tc-stat-k">Gas Saved</span>
                </button>
                <button type="button" className="tc-stat" onClick={() => nav('/v3/wallet')}>
                  <span className="tc-stat-i"><C7Icon name="shield" size={18} /></span>
                  <span className="tc-stat-v">{usd(coverable)}</span>
                  <span className="tc-stat-k">Coverable now</span>
                </button>
                <button type="button" className="tc-stat" onClick={() => nav('/v3/wallet')}>
                  <span className="tc-stat-i"><C7Icon name="coin" size={18} /></span>
                  <span className="tc-stat-v">{usd(usdValue)}</span>
                  <span className="tc-stat-k">USD Value · {formatC74Usd(price.usd)}/C74</span>
                </button>
                <button type="button" className="tc-stat" onClick={() => nav('/c74/reputation')}>
                  <span className="tc-stat-i"><C7TierIcon tier={tier} size={18} /></span>
                  <span className="tc-stat-v">{tier}</span>
                  <span className="tc-stat-k">C74 Tier</span>
                </button>
              </section>

              {/* C74 Ecosystem — mining + reputation (merged from the old /c74 hub) */}
              {eco.length > 0 && (
                <section className="tc-sect">
                  <div className="c7p-sec">
                    <span className="c7p-sec-ic"><C7Icon name="bolt" size={18} /></span>
                    <span className="c7p-sec-t">C74 Ecosystem</span>
                    <i className="c7p-sec-rule" aria-hidden="true" />
                  </div>
                  <div className="tc-rew">
                    {eco.map((r) => (
                      <button key={r.label} type="button" className="tc-rew-i" onClick={() => nav(r.to)}>
                        <span className="tc-rew-e">{r.icon}</span>
                        <span className="tc-rew-tx">
                          <span className="tc-rew-l">{r.label}</span>
                          <span className="tc-rew-s">{r.sub}</span>
                        </span>
                        <span className="tc-rew-rt">
                          {r.badge && <span className={`tc-rew-b${r.go ? ' go' : ''}`}>{r.badge}</span>}
                          <span className="tc-rew-a">{r.amt}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Gas & Coverage (Milestone 3) — live estimate + C74 coverage + savings */}
              <section className="tc-sect">
                <div className="c7p-sec">
                  <span className="c7p-sec-ic"><C7Icon name="gas" size={18} /></span>
                  <span className="c7p-sec-t">Gas &amp; Coverage</span>
                  <i className="c7p-sec-rule" aria-hidden="true" />
                </div>
                <C74GasPanel />
              </section>

              {/* Activity (Milestone 3) — C74 / energy ledger incl. gas savings */}
              <section className="tc-sect">
                <div className="c7p-sec">
                  <span className="c7p-sec-ic"><C7Icon name="receipt" size={18} /></span>
                  <span className="c7p-sec-t">Activity</span>
                  <i className="c7p-sec-rule" aria-hidden="true" />
                  <button type="button" className="tc-all" onClick={() => nav('/transactions')}>Transactions ›</button>
                </div>
                {history.length > 0 ? (
                  <div className="tc-hist">
                    {history.slice(0, 10).map((e) => (
                      <div key={e.id} className="tc-hrow">
                        <span className="tc-hlbl">{e.label || e.kind}</span>
                        <span className="tc-ht">{fmtT(e.created_at)}</span>
                        <b className={e.direction === 'earn' ? 'tc-earn' : 'tc-spend'}>{e.direction === 'earn' ? '+' : '−'}{fmt(e.amount)} C74</b>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="tc-empty">No C74 activity yet — earn by wagering &amp; depositing.</div>
                )}
              </section>

              {/* Future milestones — structured now, live at token launch */}
              <section className="tc-sect">
                <div className="tc-sh"><C7Icon name="rocket" size={16} /> Coming with the C74 token</div>
                <div className="tc-soon">
                  {FUTURE.map((s) => (<span key={s} className="tc-soon-i">{s} <em>Soon</em></span>))}
                </div>
                <p className="tc-note">Launch-ready today. At token launch the price flips from the internal peg to a live market feed — same page, no redesign.</p>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

const CSS = `
.tc-root { position: relative; min-height: 100vh; color: #e6f0ea; font-family: Inter, system-ui, sans-serif; background: radial-gradient(120% 65% at 50% -8%, rgba(246,201,69,0.12), transparent 58%), radial-gradient(110% 55% at 50% 0%, rgba(46,224,138,0.11), transparent 60%), linear-gradient(172deg, #0d3d28 0%, #072517 46%, #04160d 100%); overflow: hidden; }
.tc-wrap { position: relative; z-index: 1; max-width: 560px; margin: 0 auto; padding: 0 14px calc(128px + env(safe-area-inset-bottom, 0px)); }
.tc-bar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; padding: 14px 4px 12px;
  background: linear-gradient(180deg, rgba(3,13,7,0.92), rgba(3,13,7,0.5)); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(246,201,69,0.42); }
.tc-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; border: none; cursor: pointer; color: #d6ffe8;
  background: linear-gradient(160deg, #0d3a28, #072318); box-shadow: 0 0 0 1.5px rgba(0,168,107,0.5), inset 0 1.5px 0 rgba(200,246,220,0.18); }
.tc-ttl { font-size: 15px; font-weight: 900; letter-spacing: 0.3px; color: #ffe9a8; }
.tc-ttl-coin { width: 22px; height: 22px; object-fit: contain; vertical-align: -5px; margin-right: 5px; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.4)) drop-shadow(0 0 7px rgba(246,201,69,0.55)); }
.tc-main { position: relative; }
.tc-crownwrap { display: flex; flex-direction: column; align-items: center; gap: 2px; margin: 2px 0 12px; }
.tc-crown { width: 62px; height: auto; filter: drop-shadow(0 5px 10px rgba(0,0,0,0.5)) drop-shadow(0 0 16px rgba(246,201,69,0.4)); }
.tc-crown-ttl.tc-crown-ttl { font-size: 21px; font-weight: 900; letter-spacing: 0.6px; }
.tc-loading { display: grid; place-items: center; padding: 60px 0; }
.tc-spin { animation: tc-spin 1s linear infinite; color: #f6c945; }
@keyframes tc-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .tc-spin { animation: none; } }
.tc-hero { position: relative; overflow: hidden; text-align: center; padding: 18px 16px 20px; border-radius: 18px; border: 1.5px solid transparent;
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(246,201,69,0.16), transparent 60%), linear-gradient(160deg, rgba(20,58,40,0.82), rgba(6,20,13,0.92)) padding-box,
    linear-gradient(180deg, #ffe79a, #f5b423 55%, #b8860b) border-box;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 0 24px -6px rgba(255,200,61,0.35), 0 12px 30px -14px rgba(0,0,0,0.65); }
.tc-shine { position: absolute; inset: 0 0 auto; height: 46%; background: linear-gradient(180deg, rgba(255,255,255,0.1), transparent); pointer-events: none; }
.tc-tier { position: relative; z-index: 1; display: inline-block; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; padding: 4px 12px; border-radius: 999px; color: #2a1a02; background: linear-gradient(180deg, #ffd24d, #b8860b); margin-bottom: 10px; }
.tc-bal-k { position: relative; z-index: 1; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,236,180,0.85); }
.tc-bal-v { position: relative; z-index: 1; font-size: 46px; font-weight: 900; letter-spacing: -1px; line-height: 1.05; font-variant-numeric: tabular-nums;
  background: linear-gradient(180deg, #fff6d8 2%, #ffe9a8 40%, #f5b423 74%, #b8860b 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 18px rgba(245,180,35,0.5)); }
.tc-bal-usd { position: relative; z-index: 1; margin-top: 4px; font-size: 13px; font-weight: 800; color: #eafff2; font-variant-numeric: tabular-nums; }
.tc-bal-usd span { color: rgba(222,244,228,0.6); font-weight: 700; }
.tc-util { margin: 12px 0 0; padding: 11px 13px; border-radius: 13px; font-size: 12px; line-height: 1.45; color: rgba(230,246,236,0.86);
  background: radial-gradient(120% 100% at 0% 0%, rgba(246,201,69,0.12), transparent 60%), linear-gradient(160deg, rgba(13,58,40,0.6), rgba(8,20,13,0.72));
  border: 1px solid rgba(246,214,122,0.3); }
.tc-util b { color: #ffe6a2; font-weight: 900; }

.tc-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 12px; }
.tc-stat { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 13px 13px; border-radius: 14px; text-align: left; cursor: pointer;
  background: radial-gradient(130% 100% at 0% 0%, rgba(246,201,69,0.1), transparent 58%), linear-gradient(160deg, rgba(13,58,40,0.58), rgba(8,20,13,0.72)); border: 1px solid rgba(246,214,122,0.24); -webkit-tap-highlight-color: transparent;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 20px -12px rgba(0,0,0,0.5);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.tc-stat:active { transform: scale(0.97); }
.tc-stat-i { font-size: 18px; line-height: 1; }
.tc-stat-v { font-size: 18px; font-weight: 900; color: #ffe6a2; font-variant-numeric: tabular-nums; margin-top: 4px; }
.tc-stat-k { font-size: 10.5px; font-weight: 700; color: rgba(222,244,228,0.66); }

.tc-sect { margin-top: 16px; }
.tc-sh { display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 900; color: #ffe9a8; margin-bottom: 9px; }
.tc-all { border: none; background: none; color: #9fd8bd; font-size: 12px; font-weight: 800; cursor: pointer; }
.tc-rew { display: flex; flex-direction: column; gap: 8px; }
.tc-rew-i { display: flex; align-items: center; gap: 11px; padding: 11px 13px; border-radius: 12px; cursor: pointer; text-align: left;
  background: linear-gradient(160deg, rgba(20,58,40,0.5), rgba(8,20,13,0.6)); border: 1px solid rgba(246,214,122,0.2); -webkit-tap-highlight-color: transparent;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.tc-rew-i:active { transform: scale(0.98); }
.tc-rew-e { font-size: 19px; flex-shrink: 0; }
.tc-rew-tx { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.tc-rew-l { font-size: 13px; font-weight: 800; color: #eef7f0; }
.tc-rew-s { font-size: 10.5px; font-weight: 600; color: rgba(222,244,228,0.6); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tc-rew-rt { margin-left: auto; display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
.tc-rew-a { font-size: 12.5px; font-weight: 900; color: #ffe6a2; font-variant-numeric: tabular-nums; white-space: nowrap; }
.tc-rew-b { font-size: 9px; font-weight: 900; letter-spacing: 0.3px; text-transform: uppercase; padding: 2px 7px; border-radius: 999px; white-space: nowrap;
  color: rgba(222,244,228,0.72); background: rgba(8,20,13,0.6); border: 1px solid rgba(0,168,107,0.3); }
.tc-rew-b.go { color: #05340f; background: linear-gradient(180deg, #9CFFCB, #39FF88 55%, #00A86B); border-color: transparent; box-shadow: 0 0 8px rgba(57,255,136,0.4); }

.tc-hist { display: flex; flex-direction: column; border-radius: 12px; overflow: hidden; border: 1px solid rgba(0,168,107,0.22); }
.tc-hrow { display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto auto; gap: 0 10px; align-items: center; padding: 10px 13px; background: rgba(8,20,13,0.4); }
.tc-hrow + .tc-hrow { border-top: 1px solid rgba(0,168,107,0.14); }
.tc-hlbl { font-size: 12.5px; font-weight: 800; color: #eef7f0; grid-column: 1; }
.tc-ht { font-size: 10px; font-weight: 600; color: rgba(222,244,228,0.5); grid-column: 1; }
.tc-hrow b { grid-column: 2; grid-row: 1 / span 2; font-size: 13px; font-weight: 900; font-variant-numeric: tabular-nums; white-space: nowrap; }
.tc-earn { color: #7ff0c0; } .tc-spend { color: #ffd67a; }
.tc-empty { font-size: 12px; color: rgba(222,244,228,0.6); padding: 14px 4px; }

.tc-soon { display: flex; flex-wrap: wrap; gap: 8px; }
.tc-soon-i { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: rgba(222,244,228,0.72); padding: 8px 11px; border-radius: 999px;
  background: rgba(8,20,13,0.5); border: 1px dashed rgba(0,168,107,0.32); }
.tc-soon-i em { font-style: normal; font-size: 9px; font-weight: 900; letter-spacing: 0.4px; text-transform: uppercase; color: #2a1a02; padding: 2px 6px; border-radius: 999px; background: linear-gradient(180deg, #ffe9a8, #d68a1e); }
.tc-note { margin-top: 10px; font-size: 11px; line-height: 1.4; color: rgba(222,244,228,0.55); }
`;

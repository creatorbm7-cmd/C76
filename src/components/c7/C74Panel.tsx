/**
 * C74Panel — the player's C74 rewards wallet detail (earn breakdown + history).
 *
 * Complements C7EnergyMeter (which shows the balance/tier bar) with the C74
 * economics: what you've earned by source, the withdrawal-fee coverage your
 * balance buys, fees already saved, and a recent-activity ledger. Pure display
 * of useC74() — no writes, no money-path. Hidden until real data loads.
 */
import { useC74 } from '@/hooks/useC74';
import C7TierIcon from '@/components/c7/C7TierIcon';
import { usd, num as fmt } from "@/lib/format";

const SOURCE_META: Record<string, { label: string; icon: string }> = {
  wager: { label: 'Wager Rewards', icon: '🎮' },
  deposit: { label: 'Deposit Rewards', icon: '💵' },
  backfill: { label: 'Adjustments', icon: '⚙️' },
  admin_adjust: { label: 'Adjustments', icon: '⚙️' },
  referral: { label: 'Referral Rewards', icon: '👥' },
  daily: { label: 'Daily Bonus', icon: '🎁' },
  vip: { label: 'VIP Rewards', icon: '🏆' },
  mission: { label: 'Missions', icon: '🎯' },
};
const sourceMeta = (k: string) => SOURCE_META[k] ?? { label: k.replace(/_/g, ' '), icon: '🪙' };

const fmtT = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' });

export default function C74Panel() {
  const { summary, history } = useC74();
  if (!summary) return null; // hide until real data

  const sources = Object.entries(summary.earned_by_source || {})
    .filter(([, v]) => Number(v) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  return (
    <div className="c74p" role="group" aria-label="C74 Rewards wallet">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Header — tier + lifetime totals */}
      <div className="c74p-head">
        <div className="c74p-tier"><C7TierIcon tier={summary.tier} size={14} /> <b>{summary.tier}</b> <span>C74 Rewards</span></div>
        <div className="c74p-mini">
          <div><b>{fmt(summary.total_earned)}</b><small>Earned</small></div>
          <div><b>{fmt(summary.total_spent)}</b><small>Spent</small></div>
        </div>
      </div>

      {/* Fee coverage — the utility C74 buys */}
      <div className="c74p-cover">
        <div className="c74p-cover-cell">
          <span className="c74p-cv">{usd(summary.coverable_fee_usdt)}</span>
          <span className="c74p-cl">🔥 Fee coverage available</span>
        </div>
        <div className="c74p-cover-cell">
          <span className="c74p-cv c74p-cv-alt">{usd(summary.fee_saved_usdt_approx)}</span>
          <span className="c74p-cl">💰 Fees saved so far</span>
        </div>
      </div>

      {/* Earn breakdown by source */}
      {sources.length > 0 && (
        <div className="c74p-sect">
          <div className="c74p-sh">Earned by source</div>
          <div className="c74p-src">
            {sources.map(([k, v]) => {
              const m = sourceMeta(k);
              return (
                <div key={k} className="c74p-schip">
                  <span className="c74p-sic">{m.icon}</span>
                  <span className="c74p-slbl">{m.label}</span>
                  <b>{fmt(Number(v))}</b>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {history.length > 0 && (
        <div className="c74p-sect">
          <div className="c74p-sh">Recent activity</div>
          <div className="c74p-hist">
            {history.slice(0, 8).map((e) => (
              <div key={e.id} className="c74p-hrow">
                <span className="c74p-hlbl">{e.label}</span>
                <span className="c74p-ht">{fmtT(e.created_at)}</span>
                <b className={e.direction === 'earn' ? 'c74p-earn' : 'c74p-spend'}>
                  {e.direction === 'earn' ? '+' : '−'}{fmt(e.amount)}
                </b>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="c74p-foot">
        Earn C74 · {fmt(summary.config.wager_earn_per_usdt)}/$ wagered · {fmt(summary.config.deposit_earn_per_usdt)}/$ deposited
      </div>
    </div>
  );
}

const CSS = `
.c74p { position: relative; overflow: hidden; border-radius: 18px; padding: 14px 16px; margin-top: 12px; color: #fff;
  background: radial-gradient(120% 120% at 0% 0%, rgba(245,180,35,0.12), transparent 55%), linear-gradient(160deg, #12492b, #061f11);
  border: 1px solid rgba(53,217,138,0.30); box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 10px 24px -12px rgba(0,0,0,0.6); }
.c74p-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.c74p-tier { font-size: 12px; font-weight: 700; color: rgba(214,255,233,0.85); }
.c74p-tier b { font-weight: 900; color: #ffe9a8; }
.c74p-tier span { display: block; font-size: 9px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; color: #b9f6d0; margin-top: 2px; }
.c74p-mini { display: flex; gap: 16px; text-align: right; }
.c74p-mini b { font: 900 16px/1 Inter, system-ui, sans-serif; color: #fff; font-variant-numeric: tabular-nums; }
.c74p-mini small { display: block; font-size: 8px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-top: 3px; }
.c74p-cover { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
.c74p-cover-cell { border-radius: 12px; padding: 10px 12px; background: rgba(0,0,0,0.25); border: 1px solid rgba(120,240,176,0.18); }
.c74p-cv { display: block; font: 900 17px/1 Inter, system-ui, sans-serif; color: #ffe9a8; font-variant-numeric: tabular-nums; }
.c74p-cv-alt { color: #6bf5a3; }
.c74p-cl { display: block; font-size: 8.5px; font-weight: 700; letter-spacing: 0.4px; color: rgba(255,255,255,0.55); margin-top: 4px; text-transform: uppercase; }
.c74p-sect { margin-top: 14px; }
.c74p-sh { font-size: 10px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin: 0 2px 8px;
  background: linear-gradient(90deg, #d6ffe9, #ffe9a8 70%, #f5b423); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.c74p-src { display: flex; flex-direction: column; gap: 6px; }
.c74p-schip { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 11px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); }
.c74p-sic { font-size: 15px; }
.c74p-slbl { flex: 1; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.82); }
.c74p-schip b { font-size: 13px; font-weight: 900; color: #6bf5a3; font-variant-numeric: tabular-nums; }
.c74p-hist { display: flex; flex-direction: column; }
.c74p-hrow { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 10px; padding: 9px 2px; }
.c74p-hrow + .c74p-hrow { border-top: 1px solid rgba(255,255,255,0.06); }
.c74p-hlbl { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.85); }
.c74p-ht { font-size: 9.5px; font-weight: 600; color: rgba(255,255,255,0.4); font-variant-numeric: tabular-nums; }
.c74p-hrow b { font-size: 13px; font-weight: 900; font-variant-numeric: tabular-nums; min-width: 52px; text-align: right; }
.c74p-earn { color: #6bf5a3; }
.c74p-spend { color: #ffb15c; }
.c74p-foot { margin-top: 12px; text-align: center; font-size: 9.5px; font-weight: 700; color: rgba(255,255,255,0.4); }
`;

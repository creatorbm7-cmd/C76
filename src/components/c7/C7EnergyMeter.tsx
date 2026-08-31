/**
 * C7EnergyMeter — the player's live "Withdrawal Power" card (C7 Spark Energy).
 *
 * Pure display of `useEnergy()` data: current tier, energy points, and a filling
 * bar toward the next tier. C7 Spark Energy is the platform's gasless-withdrawal
 * utility — it will cover the TRON network fee on withdrawals once the backend
 * burn/fee link lands. This card is DISPLAY-ONLY: it shows the balance and the
 * feature's purpose, but makes NO per-withdrawal "fee covered" claim (that must
 * come from the server at withdrawal time). No writes, no money-path.
 * Hidden entirely until data loads (never shows a fake/zero flash).
 */
import { useEnergy } from '@/hooks/useEnergy';
import { num as fmt } from "@/lib/format";
import C7Coin from '@/components/c7/C7Coin';

const CSS = `
.c7e { position: relative; overflow: hidden; border-radius: 18px; padding: 14px 16px; color: #fff;
  background:
    radial-gradient(120% 120% at 100% 0%, rgba(245,180,35,0.16), transparent 55%),
    radial-gradient(100% 100% at 0% 120%, rgba(34,224,122,0.20), transparent 60%),
    linear-gradient(150deg, #0c1f14, #06120c);
  border: 1px solid rgba(245,180,35,0.4);
  box-shadow: 0 12px 28px -12px rgba(0,0,0,0.7), 0 0 22px -8px rgba(46,230,130,0.4), inset 0 1px 0 rgba(255,236,180,0.2);
  animation: c7e-glow 2.8s ease-in-out infinite; will-change: box-shadow; }
@keyframes c7e-glow {
  0%,100% { box-shadow: 0 12px 28px -12px rgba(0,0,0,0.7), 0 0 18px -10px rgba(46,230,130,0.35), inset 0 1px 0 rgba(255,236,180,0.2); }
  50%     { box-shadow: 0 12px 28px -12px rgba(0,0,0,0.7), 0 0 30px -4px rgba(46,230,130,0.7), inset 0 1px 0 rgba(255,236,180,0.2); } }
.c7e-top { display: flex; align-items: center; gap: 9px; }
.c7e-ic { font-size: 22px; filter: drop-shadow(0 0 7px rgba(255,214,120,0.8)); animation: c7e-float 3.2s ease-in-out infinite; }
@keyframes c7e-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
.c7e-tier { display: flex; align-items: center; gap: 7px; font: 900 13px/1 Inter, system-ui, sans-serif; letter-spacing: 1.4px;
  background: linear-gradient(135deg, #ffe9a8, #f5b423); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.c7e-badge { font-size: 7.5px; letter-spacing: 0.8px; font-weight: 900; color: #06301c; -webkit-text-fill-color: #06301c; padding: 2.5px 6px; border-radius: 999px;
  background: linear-gradient(180deg, #8bffc4, #35d98a); box-shadow: 0 0 8px -2px rgba(46,230,130,0.8); white-space: nowrap; }
.c7e-lbl { font-size: 9px; font-weight: 800; letter-spacing: 1.6px; color: #b9f6d0; text-transform: uppercase; }
.c7e-pts { margin-left: auto; text-align: right; }
.c7e-pts b { font: 900 18px/1 Inter, system-ui, sans-serif; color: #ffe9a8; font-variant-numeric: tabular-nums; }
.c7e-pts span { display: block; font-size: 8px; font-weight: 800; letter-spacing: 1px; color: rgba(255,255,255,0.5); text-transform: uppercase; margin-top: 2px; }
.c7e-bar { position: relative; height: 9px; border-radius: 999px; margin: 12px 0 6px; overflow: hidden;
  background: rgba(0,0,0,0.35); box-shadow: inset 0 1px 2px rgba(0,0,0,0.5); }
.c7e-fill { position: absolute; inset: 0 auto 0 0; height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, #34e58a, #6bf5a3 50%, #ffd24d);
  box-shadow: 0 0 10px rgba(46,230,130,0.7); transition: width .6s cubic-bezier(.2,.7,.2,1); }
.c7e-fill::after { content: ''; position: absolute; inset: 0; border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  transform: translateX(-100%); animation: c7e-sweep 2.4s ease-in-out infinite; }
@keyframes c7e-sweep { 0% { transform: translateX(-100%); } 60%,100% { transform: translateX(200%); } }
.c7e-foot { display: flex; justify-content: space-between; font-size: 9.5px; font-weight: 700; color: rgba(255,255,255,0.55); font-variant-numeric: tabular-nums; }
.c7e-foot b { color: #6bf5a3; }
@media (prefers-reduced-motion: reduce) { .c7e, .c7e-ic, .c7e-fill::after { animation: none !important; } }
`;


export default function C7EnergyMeter() {
  const { energy } = useEnergy();
  if (!energy) return null; // hide until real data

  const atMax = energy.tier === 'MAX';
  return (
    <div className="c7e" role="group" aria-label="C74 Energy — Withdrawal Power">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="c7e-top">
        <C7Coin size={40} className="c7e-coin" />
        <div>
          <div className="c7e-tier">{energy.tier} <span className="c7e-badge">⚡ WITHDRAWAL POWER</span></div>
          <div className="c7e-lbl">C74 Energy</div>
        </div>
        <div className="c7e-pts">
          <b>{fmt(energy.points)}</b>
          <span>C74 power</span>
        </div>
      </div>
      <div className="c7e-bar" aria-hidden="true">
        <div className="c7e-fill" style={{ width: `${Math.max(4, energy.progress)}%` }} />
      </div>
      <div className="c7e-foot">
        <span>Fuels gasless withdrawals</span>
        {atMax ? <span><b>MAX tier reached</b></span>
          : <span><b>{fmt(energy.tierMax - energy.points)}</b> ⚡ to next tier</span>}
      </div>
    </div>
  );
}

// V2Events — Events & Tournaments (/v3/rewards/events; /v2/events redirects here).
//
// HONEST STATE: there is NO tournament / leaderboard / event backend yet, so this
// screen makes no fabricated claims. It shows a premium "coming soon" hero
// explaining that live tournaments and seasonal events are launching soon, and
// points members to the reward surfaces that ARE live today (Daily Wheel,
// Missions, Bank Game) via real routes. No mock pools / countdowns / progress.
// Honors prefers-reduced-motion.

import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, ChevronRight } from "lucide-react";
import C7Icon, { C7IconName } from "@/components/c7/C7Icon";
import C7Asset from "@/components/c7/C7Asset";

// Reward surfaces that are genuinely live today — real routes, no fabrication.
const LIVE_NOW: { ic: C7IconName; l: string; d: string; to: string }[] = [
  { ic: "star", l: "Daily Wheel", d: "Spin for C74 & prizes", to: "/v3/rewards/wheel" },
  { ic: "target", l: "Missions", d: "Complete goals · earn C74", to: "/missions" },
  { ic: "wallet", l: "Bank Game", d: "Save C74 & grow your streak", to: "/gullak" },
];

export default function V2Events() {
  const nav = useNavigate();

  return (
    <div className="v2ev">
      <style>{CSS}</style>
      <div className="v2ev-bg" aria-hidden="true" />

      <header className="v2ev-top">
        <button className="c7p-pg-back" onClick={() => nav("/v3/rewards")} aria-label="Back"><ArrowLeft size={18} /></button>
        <div className="v2ev-toptx">Events</div>
      </header>

      <main className="v2ev-main">
        <section className="c7p-card-gold v2ev-hero">
          <span className="v2ev-hero-ic" aria-hidden="true"><C7Asset slot="icon.events" size={48} fallback={<C7Icon name="trophy" size={40} />} /></span>
          <h1 className="v2ev-hero-h">Tournaments &amp; Events</h1>
          <p className="v2ev-hero-p">
            Live tournaments, leaderboards and seasonal events are on the way. We're building them properly —
            provably-fair scoring and real prize pools — so there's nothing fake to show here yet.
          </p>
          <span className="v2ev-hero-badge"><Trophy size={12} /> Launching soon</span>
        </section>

        <div className="c7p-sec">
          <span className="c7p-sec-ic"><C7Icon name="gift" size={16} /></span>
          <span className="c7p-sec-t">Live rewards right now</span>
          <span className="c7p-sec-rule" />
        </div>

        <div className="v2ev-list">
          {LIVE_NOW.map((e) => (
            <button key={e.l} className="c7p-glass v2ev-item" onClick={() => nav(e.to)}>
              <span className="v2ev-item-ic"><C7Icon name={e.ic} size={22} /></span>
              <div className="v2ev-item-tx">
                <div className="v2ev-item-l">{e.l}</div>
                <div className="v2ev-item-d">{e.d}</div>
              </div>
              <ChevronRight size={16} className="v2ev-item-arr" />
            </button>
          ))}
        </div>

        <footer className="v2ev-foot">More reward types arrive over time · play responsibly</footer>
      </main>
    </div>
  );
}

const CSS = `
.v2ev { position: relative; min-height: 100dvh; color: #eaffe0; font-family: inherit; padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px)); overflow: hidden; }
.v2ev-bg { position: fixed; inset: 0; z-index: -1;
  background: radial-gradient(120% 65% at 50% -8%, rgba(246,201,69,0.12), transparent 58%), radial-gradient(110% 55% at 50% 0%, rgba(46,224,138,0.11), transparent 60%), linear-gradient(172deg, #0d3d28 0%, #072517 46%, #04160d 100%); }
.v2ev-top { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: 10px; padding: 14px 14px 10px;
  background: linear-gradient(180deg, rgba(4,18,11,0.92), rgba(4,18,11,0.45)); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.v2ev-toptx { flex: 1; font-size: 16px; font-weight: 900; letter-spacing: 0.4px; }
.v2ev-main { max-width: 560px; margin: 0 auto; padding: 8px 14px 0; }

.v2ev-hero { padding: 26px 18px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.v2ev-hero-ic { font-size: 52px; line-height: 1; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.5)) drop-shadow(0 0 18px rgba(255,200,61,0.4)); }
.v2ev-hero-h { margin: 4px 0 0; font-size: 21px; font-weight: 900; letter-spacing: 0.2px;
  background: linear-gradient(180deg, #fff6d8, #ffe9a8 45%, #f5b423 82%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.v2ev-hero-p { margin: 0; font-size: 12.5px; font-weight: 600; line-height: 1.55; color: rgba(214,255,233,0.82); max-width: 40ch; }
.v2ev-hero-badge { display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; font-size: 10.5px; font-weight: 900; letter-spacing: 0.6px; color: #2a1a02; padding: 5px 12px; border-radius: 999px;
  background: radial-gradient(120% 100% at 50% 8%, #fff6d8, transparent 55%), linear-gradient(180deg, #ffd24d, #b8860b); box-shadow: 0 3px 10px -3px rgba(255,190,60,0.6); }

.v2ev-list { display: flex; flex-direction: column; gap: 10px; }
.v2ev-item { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 14px; cursor: pointer; color: inherit; font-family: inherit; }
.v2ev-item:active { transform: scale(0.985); }
.v2ev-item-ic { font-size: 26px; line-height: 1; flex: 0 0 auto; }
.v2ev-item-tx { flex: 1; min-width: 0; }
.v2ev-item-l { font-size: 14px; font-weight: 900; color: #ecfff3; }
.v2ev-item-d { font-size: 11.5px; font-weight: 600; color: rgba(205,238,176,0.72); }
.v2ev-item-arr { color: rgba(205,238,176,0.5); flex: 0 0 auto; }

.v2ev-foot { margin-top: 18px; text-align: center; font-size: 10px; font-weight: 600; color: rgba(205,238,176,0.5); }
`;

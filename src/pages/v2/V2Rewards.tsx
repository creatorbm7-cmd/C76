// V2Rewards — the Rewards hub.
//
// A landing hub that gathers the reward surfaces under one tab. Each card links
// to its canonical nested route (/v3/rewards/wheel·events, /bonuses, /missions,
// /gullak, /v3/profile/vip, /agent, /top).
//
// V3 visual layer: the shared C7 emerald-felt page (.c7p-page) with the same
// gold-framed hero + emerald-glass cards + gold section header used across the
// app (Wheel · Events · Refer · Profile), so Rewards reads as one system. Live
// badges/counts come ONLY from existing real-data hooks (useC74 balance ·
// useBonusClaims active count) — nothing fabricated. Honors reduced-motion.

import { useNavigate } from "react-router-dom";
import { num as fmt } from "@/lib/format";
import { useC74 } from "@/hooks/useC74";
import { useBonusClaims } from "@/hooks/useBonusClaims";
import { ArrowLeft, ChevronRight, Sparkles } from "lucide-react";
import C7Icon, { type C7IconName } from "@/components/c7/C7Icon";
import C7Asset from "@/components/c7/C7Asset";

interface Card { ic: C7IconName; slot: string; l: string; d: string; to: string; badge?: string | null; }

export default function V2Rewards() {
  const nav = useNavigate();
  const { summary } = useC74();
  const { active } = useBonusClaims();

  const c74Bal = summary?.balance;
  const activeBonuses = active.length;

  const ROWS: Card[] = [
    { ic: "coin", slot: "icon.reels", l: "C74 Reels", d: "Spin the reels for C74", to: "/v3/rewards/wheel" },
    { ic: "gift", slot: "icon.promotions", l: "Promotions", d: "Offers, bonuses & cashback", to: "/bonuses", badge: activeBonuses > 0 ? `${activeBonuses} active` : null },
    { ic: "target", slot: "icon.missions", l: "Missions", d: "Complete goals · earn C74", to: "/missions" },
    { ic: "chest", slot: "icon.bank", l: "Bank Game", d: "Save C74 & grow your streak", to: "/gullak" },
    { ic: "crown", slot: "icon.vip", l: "VIP Club", d: "Perks, tiers & rakeback", to: "/v3/profile/vip" },
    { ic: "calendar", slot: "icon.events", l: "Events", d: "Limited-time tournaments", to: "/v3/rewards/events" },
    { ic: "handshake", slot: "icon.refer", l: "Refer & Earn", d: "Invite friends · earn C74", to: "/agent" },
    { ic: "trophy", slot: "icon.leaderboard", l: "Leaderboard", d: "See where you rank this week", to: "/top" },
  ];

  return (
    <div className="c7p-page v2rw">
      <style>{CSS}</style>

      <header className="v2rw-top">
        <button className="v2rw-back" onClick={() => nav("/v3")} aria-label="Back to lobby"><ArrowLeft size={18} /></button>
        <div className="v2rw-brand">
          <span className="v2rw-brand-ic"><C7Asset slot="icon.rewards" size={26} fallback={<C7Icon name="gift" size={22} />} /></span>
          <div className="v2rw-brand-tx"><b>Rewards</b><small>Earn &amp; Win</small></div>
        </div>
        <span className="v2rw-badge"><Sparkles size={10} /> C74</span>
      </header>

      <main className="v2rw-main">
        {/* C74 rewards hero — gold feature card, routes to the Token Center */}
        <button type="button" className="c7p-card-gold v2rw-hero" onClick={() => nav("/c74/token")} aria-label="Open C74 Token Center">
          <span className="v2rw-hero-ic"><C7Asset slot="hero.chest" size={46} fallback={<C7Icon name="chest" size={34} />} /></span>
          <div className="v2rw-hero-tx">
            <b>Daily Rewards</b>
            <small>Spin, complete missions &amp; claim bonuses</small>
          </div>
          <div className="v2rw-hero-side">
            {c74Bal != null && <span className="v2rw-hero-bal">{fmt(c74Bal)} <em>C74</em></span>}
            <span className="v2rw-hero-cta">Open ›</span>
          </div>
        </button>

        <div className="c7p-sec v2rw-sec"><span className="c7p-sec-ic"><C7Icon name="star" size={16} /></span><span className="c7p-sec-t">Reward Center</span><span className="c7p-sec-rule" /></div>

        <div className="v2rw-grid">
          {ROWS.map((r) => (
            <button key={r.l} type="button" className="c7p-panel v2rw-card" onClick={() => nav(r.to)} aria-label={r.l}>
              <span className="c7p-sec-ic v2rw-ic"><C7Asset slot={r.slot} size={26} fallback={<C7Icon name={r.ic} size={22} />} /></span>
              <span className="v2rw-tx"><b>{r.l}</b><small>{r.d}</small></span>
              {r.badge && <span className="v2rw-badge-live">{r.badge}</span>}
              <ChevronRight size={18} className="v2rw-arr" />
            </button>
          ))}
        </div>

        <footer className="v2rw-foot"><Sparkles size={11} /> Rewards &amp; C74 balance are live from your account</footer>
      </main>
    </div>
  );
}

const CSS = `
.v2rw { position: relative; min-height: 100vh; color: #eaf7ef; font-family: Inter, system-ui, sans-serif; padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px)); }

/* Sticky emerald-glass header — matches Wallet/Profile/Casino chrome */
.v2rw-top { position: sticky; top: 0; z-index: 3; display: flex; align-items: center; gap: 10px; padding: 14px 16px;
  background: linear-gradient(180deg, rgba(10,20,15,0.94), rgba(10,20,15,0.55)); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(47,226,154,0.26); }
.v2rw-back { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; cursor: pointer; color: #dce8df; background: rgba(255,255,255,0.05); border: 1px solid rgba(47,226,154,0.28); }
.v2rw-back:active { transform: scale(0.94); }
.v2rw-brand { flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0; }
.v2rw-brand-ic { flex: 0 0 auto; width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; font-size: 20px; line-height: 1; color: #05230f;
  background: radial-gradient(circle at 36% 28%, #eafff4, #37e29a 40%, #159861 70%, #0c6b45 100%); border: 1.5px solid #caa23a;
  box-shadow: inset 0 2px 3px rgba(255,255,255,0.7), 0 0 15px rgba(202,162,58,0.5); }
.v2rw-brand-tx { min-width: 0; }
.v2rw-brand-tx b { display: block; font-size: 15px; font-weight: 900; letter-spacing: 0.4px; line-height: 1.05; color: #f3ffe9; white-space: nowrap; }
.v2rw-brand-tx small { font-size: 9.5px; letter-spacing: 2px; text-transform: uppercase; color: rgba(220,232,223,0.6); }
.v2rw-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 900; letter-spacing: 1px; padding: 5px 9px; border-radius: 999px; color: #2a1608; background: linear-gradient(180deg, #ffe9a8, #f6c945 55%, #d68a1e); box-shadow: 0 2px 6px -2px rgba(246,201,69,0.6), inset 0 1px 0 rgba(255,255,255,0.5); }

.v2rw-main { position: relative; z-index: 1; max-width: 560px; margin: 0 auto; padding: 13px 16px; display: flex; flex-direction: column; gap: 11px; }

/* Daily Rewards hero — frame/glow from shared .c7p-card-gold; this owns layout. */
.v2rw-hero { display: flex; align-items: center; gap: 13px; width: 100%; text-align: left; padding: 15px; color: inherit; font-family: inherit; cursor: pointer; }
.v2rw-hero-ic { flex: 0 0 auto; width: 52px; height: 52px; border-radius: 15px; display: grid; place-items: center; font-size: 28px; line-height: 1;
  background: radial-gradient(120% 100% at 50% 8%, #fff6d8, transparent 55%), linear-gradient(180deg, #ffd24d, #b8860b); box-shadow: inset 0 2px 0 rgba(255,255,255,0.65), 0 4px 12px -4px rgba(255,190,60,0.6); }
.v2rw-hero-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.v2rw-hero-tx b { font-size: 16px; font-weight: 900; color: #fff6d8; }
.v2rw-hero-tx small { font-size: 11px; font-weight: 600; color: rgba(255,236,180,0.72); line-height: 1.3; }
.v2rw-hero-side { flex: 0 0 auto; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.v2rw-hero-bal { font-size: 13px; font-weight: 900; color: #ffe9a8; font-variant-numeric: tabular-nums; white-space: nowrap; }
.v2rw-hero-bal em { font-style: normal; font-size: 9.5px; color: rgba(255,236,180,0.7); }
.v2rw-hero-cta { display: inline-flex; align-items: center; gap: 2px; font-size: 11.5px; font-weight: 900; color: #2a1608; padding: 5px 11px; border-radius: 999px; background: linear-gradient(180deg, #ffe9a8, #f6c945 55%, #c6851e); }

.v2rw-sec { margin: 6px 2px 2px; }
.v2rw-grid { display: flex; flex-direction: column; gap: 10px; }
/* Card visuals come from the shared .c7p-panel primitive (gold hairline + depth +
   interactive press/hover). .v2rw-card only owns the row layout. */
.v2rw-card { display: flex; align-items: center; gap: 13px; width: 100%; text-align: left; padding: 13px 14px; color: inherit; font-family: inherit; }
/* Emoji chip in the shared .c7p-sec-ic emerald style, sized up for the row. */
.v2rw-card .v2rw-ic { width: 46px; height: 46px; flex-shrink: 0; border-radius: 13px; font-size: 22px; }
.v2rw-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.v2rw-tx b { font-size: 14.5px; font-weight: 900; }
.v2rw-tx small { font-size: 11.5px; color: rgba(220,232,223,0.6); font-weight: 600; }
.v2rw-badge-live { flex-shrink: 0; font-size: 9.5px; font-weight: 900; letter-spacing: 0.3px; color: #04240f; padding: 3px 9px; border-radius: 999px; white-space: nowrap;
  background: radial-gradient(120% 100% at 50% 10%, rgba(255,255,255,0.35), transparent 55%), linear-gradient(180deg, #2ee08a, #12a04f); box-shadow: 0 2px 8px -2px rgba(46,224,138,0.5); }
.v2rw-arr { color: rgba(220,232,223,0.45); flex-shrink: 0; }
.v2rw-foot { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 14px; font-size: 10px; font-weight: 600; color: rgba(220,232,223,0.45); text-align: center; }
`;

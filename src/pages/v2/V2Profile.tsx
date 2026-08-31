// V2Profile — the V2 world's Profile hub (/v3/profile). A premium account screen:
// player header (My Account: tier + balance preview), an Achievements grid, an
// account-scoped menu (VIP · My Stats · History · Wallet · Help & Support),
// inline Settings toggles, and Log out.
//
// R4: VIP and Stats moved to nested canonical routes (/v3/profile/vip·analytics);
// History reuses the shared /transactions page. Reward features (Wheel/Refer/
// Events) are intentionally NOT cross-linked here — they own the Rewards tab.
//
// Scope: presentation-only, EXCEPT Log out (supabase.auth.signOut → /login).
// Balance is live (useProfileStats); tier/VIP-journey/achievements remain static
// previews pending real sources. No profile-write logic. Honors prefers-reduced-motion.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, ReceiptText, HelpCircle, LogOut, ChevronRight, ShieldCheck, Music, Coins, Trophy, Dice5, TrendingUp, Send } from "lucide-react";
import { v2audio } from "./v2audio";
import { supabase } from "@/integrations/supabase/client";
import { useProfileStats } from "@/hooks/useProfileStats";
import { useC7Pulse } from "@/hooks/useC7Pulse";
import { rankTheme } from "@/lib/c7rank";
import { usd } from "@/lib/format";
import C7Icon, { type C7IconName } from "@/components/c7/C7Icon";
import C7TierIcon from "@/components/c7/C7TierIcon";
import C7Asset from "@/components/c7/C7Asset";

const ACHIEVEMENTS: { ic: C7IconName; l: string; got: boolean }[] = [
  { ic: "target", l: "First Bet", got: true },
  { ic: "fire", l: "Win Streak", got: true },
  { ic: "gem", l: "High Roller", got: true },
  { ic: "trophy", l: "Big Winner", got: false },
  { ic: "crown", l: "VIP Gold", got: false },
  { ic: "rocket", l: "Jackpot", got: false },
];

// IA P2: the Profile hub owns account-scoped surfaces only. Reward features live
// under the Rewards tab; money (deposit/withdraw/balance) lives under the Wallet
// tab — neither is re-linked here to avoid duplicating those tabs. Full play stats
// open from the "My Stats" section header; History reuses the shared /transactions.
const MENU = [
  { ic: <Crown size={17} />, l: "VIP Club", d: "Tiers, rewards & leaderboard", to: "/v3/profile/vip" },
  { ic: <ReceiptText size={17} />, l: "History", d: "Transactions & bet history", to: "/transactions" },
  { ic: <Send size={17} />, l: "Telegram", d: "Connect for instant alerts", to: "/telegram" },
  { ic: <HelpCircle size={17} />, l: "Help & Support", d: "FAQs & contact us", to: "/support" },
];

export default function V2Profile() {
  const nav = useNavigate();
  const { stats } = useProfileStats();
  const pulse = useC7Pulse();
  const rt = rankTheme(pulse.rank.idx);
  const [music, setMusic] = useState(!v2audio.muted);
  const toggleMusic = () => { v2audio.toggle(); v2audio.resume(); setMusic(!v2audio.muted); };
  const signOut = async () => { try { await supabase.auth.signOut(); } catch { /* ignore */ } nav("/login"); };

  return (
    <div className="c7p-page v2pf">
      <style>{CSS}</style>

      <header className="c7p-pg-bar v2pf-top">
        <button className="c7p-pg-back v2pf-back" onClick={() => nav("/v3")} aria-label="Back"><ArrowLeft size={18} /></button>
        <div className="v2pf-brand">
          <span className="v2pf-brand-ic"><C7Asset slot="icon.profile" size={22} fallback={<Crown size={18} />} /></span>
          <div className="v2pf-brand-tx"><b>Profile</b><small>Player Crown</small></div>
        </div>
        <span className="v2pf-badge">{pulse.ready ? <><C7TierIcon tier={pulse.rank.name} size={11} /> {pulse.rank.name}</> : <><Crown size={10} /> Player</>}</span>
      </header>

      <main className="v2pf-main">
        <section className="c7p-card-gold v2pf-card">
          <div
            className="v2pf-av"
            style={pulse.ready ? { boxShadow: `inset 0 2px 0 rgba(255,255,255,0.6), 0 0 0 2px rgba(255,255,255,0.12), 0 6px 18px -5px ${rt.glow}` } : undefined}
          >
            C7
            {pulse.ready && <span className="v2pf-av-rank" aria-hidden="true">{rt.icon}</span>}
          </div>
          <div className="v2pf-id">
            <div className="v2pf-name">C7 Winner</div>
            <div className="v2pf-tier"><Crown size={11} /> {pulse.ready ? pulse.rank.name : "Player"}</div>
            {pulse.ready && (
              <div className="v2pf-mrank" style={{ background: rt.chipBg, color: rt.chipText, boxShadow: `0 2px 10px -3px ${rt.glow}` }}>
                <span className="v2pf-mrank-ic">{rt.icon}</span> {rt.title} <em>· {rt.flavor}</em>
              </div>
            )}
          </div>
          <div className="v2pf-bal">
            <div className="v2pf-bal-k">Balance</div>
            <div className="v2pf-bal-v">{usd(stats.balance)}</div>
          </div>
        </section>

        {/* Play stats — real account figures from useProfileStats. Money in/out
            (deposited/withdrawn) lives in the Wallet tab, not here (no duplication). */}
        <div className="c7p-sec v2pf-sec--row">
          <span className="c7p-sec-ic"><C7Icon name="chart" size={18} /></span><span className="c7p-sec-t">My Stats</span><span className="c7p-sec-rule" />
          <button type="button" className="v2pf-sec-link" onClick={() => nav("/v3/profile/analytics")}>Details ›</button>
        </div>
        <div className="v2pf-stats">
          {[
            { ic: <Coins size={15} />, l: "Total Wagered", v: usd(stats.total_wagered) },
            { ic: <Trophy size={15} />, l: "Total Won", v: usd(stats.total_won) },
            { ic: <Dice5 size={15} />, l: "Bets Placed", v: stats.bets_placed.toLocaleString() },
            { ic: <TrendingUp size={15} />, l: "Net Profit", v: usd(stats.net_profit), tone: stats.net_profit >= 0 ? "up" : "down" },
          ].map((s) => (
            <div key={s.l} className="c7p-panel v2pf-stat">
              <span className="v2pf-stat-ic">{s.ic}</span>
              <div className="v2pf-stat-tx">
                <div className="v2pf-stat-k">{s.l}</div>
                <div className={`v2pf-stat-v${s.tone ? " v2pf-stat-v--" + s.tone : ""}`}>{s.v}</div>
              </div>
            </div>
          ))}
        </div>

        {/* VIP progress */}
        <section className="c7p-panel v2pf-vip">
          <div className="v2pf-vip-h"><span>VIP Journey <span className="v2pf-sample">Sample</span></span><span className="v2pf-vip-next">Gold → Platinum</span></div>
          <div className="c7p-progress v2pf-vip-bar"><span style={{ width: "64%" }} /></div>
          <div className="v2pf-vip-f"><span>64%</span><span>$1,800 wagered to next tier</span></div>
        </section>

        {/* Achievements — sample previews until the real achievement engine lands
            (tagged like VIP Journey so nothing reads as an unlocked real badge). */}
        <div className="c7p-sec"><span className="c7p-sec-ic"><C7Icon name="medal" size={18} /></span><span className="c7p-sec-t">Achievements <span className="v2pf-sample">Sample</span></span><span className="c7p-sec-rule" /></div>
        <div className="v2pf-ach">
          {ACHIEVEMENTS.map((a) => (
            <div key={a.l} className={`c7p-panel v2pf-ach-i${a.got ? " got" : ""}`}>
              <span className="v2pf-ach-ic"><C7Icon name={a.ic} size={26} /></span>
              <span className="v2pf-ach-l">{a.l}</span>
            </div>
          ))}
        </div>

        {/* Page-order: Settings sits right after Achievements (before the menu/Support) */}
        <div className="c7p-sec"><span className="c7p-sec-ic"><C7Icon name="gear" size={18} /></span><span className="c7p-sec-t">Settings</span><span className="c7p-sec-rule" /></div>
        <div className="v2pf-settings">
          <div className="c7p-panel v2pf-set">
            <span className="v2pf-set-ic"><Music size={16} /></span>
            <span className="v2pf-set-l">Music &amp; sound</span>
            <button className={`v2pf-sw${music ? " on" : ""}`} onClick={toggleMusic} role="switch" aria-checked={music} aria-label="Toggle music"><i /></button>
          </div>
        </div>

        {/* Account menu / Support — Profile-scoped surfaces (Help & Support last) */}
        <div className="v2pf-menu">
          {MENU.map((m) => (
            <button key={m.l} className="c7p-panel v2pf-row" onClick={() => nav(m.to)}>
              <span className="v2pf-row-ic">{m.ic}</span>
              <div className="v2pf-row-tx"><div className="v2pf-row-l">{m.l}</div><div className="v2pf-row-d">{m.d}</div></div>
              <ChevronRight size={17} className="v2pf-row-ch" />
            </button>
          ))}
        </div>

        {/* Log out */}
        <div className="v2pf-menu">
          <button className="c7p-panel v2pf-row v2pf-row--danger" onClick={signOut}>
            <span className="v2pf-row-ic"><LogOut size={17} /></span>
            <div className="v2pf-row-tx"><div className="v2pf-row-l">Log out</div><div className="v2pf-row-d">Sign out of your account</div></div>
          </button>
        </div>

        <p className="v2pf-foot"><ShieldCheck size={12} /> Play responsibly · 18+ · Provably fair</p>
      </main>
    </div>
  );
}

const CSS = `
.v2pf { position: relative; min-height: 100dvh; color: #eafff4; font-family: inherit; padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px)); }
/* Header brand lockup — emerald icon chip + wordmark (c7p-pg-bar supplies the bar) */
.v2pf-back:active { transform: scale(0.94); }
.v2pf-brand { flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0; }
.v2pf-brand-ic { flex: 0 0 auto; width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; color: #04240f;
  background: radial-gradient(120% 120% at 50% 0%, #b6ffdd, #2ee08a 52%, #0a7a3c);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.32), 0 4px 12px -5px rgba(0,0,0,0.6); }
.v2pf-brand-tx { min-width: 0; }
.v2pf-brand-tx b { display: block; font-size: 15px; font-weight: 900; letter-spacing: 0.4px; line-height: 1.05; color: #eafff4; white-space: nowrap; }
.v2pf-brand-tx small { font-size: 9.5px; letter-spacing: 2px; text-transform: uppercase; color: rgba(230,246,236,0.6); }
.v2pf-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 900; letter-spacing: 0.4px; color: #3a2600; padding: 4px 9px; border-radius: 999px; background: linear-gradient(180deg, #ffe9a8, #f6c945 55%, #c6851e); box-shadow: 0 2px 6px -2px rgba(246,201,69,0.6), inset 0 1px 0 rgba(255,255,255,0.5); }
.v2pf-main { position: relative; z-index: 1; max-width: 560px; margin: 0 auto; padding: 12px 14px 0; }

/* Live stats grid — c7p-panel base + gold icon chip */
.v2pf-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; }
.v2pf-stat { display: flex; align-items: center; gap: 10px; padding: 12px 13px; overflow: hidden; }
.v2pf-stat-ic { display: grid; place-items: center; width: 34px; height: 34px; flex-shrink: 0; border-radius: 11px; color: #3a2600;
  background: radial-gradient(120% 100% at 50% 12%, #fff6d5, #f6c945 46%, #c6851e 82%);
  box-shadow: inset 0 1px 2px rgba(255,255,255,0.7), 0 3px 9px -3px rgba(246,201,69,0.5); }
.v2pf-stat-tx { min-width: 0; flex: 1; }
.v2pf-stat-k { font-size: 9.5px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; color: rgba(230,246,236,0.72); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v2pf-stat-v { font-size: 16px; font-weight: 900; color: #eafff4; letter-spacing: 0.2px; }
.v2pf-stat-v--up { color: #2ee08a; }
.v2pf-stat-v--down { color: #ff6a7d; }

/* Player card — c7p-card-gold base; layout + inner elements only */
.v2pf-card { display: flex; align-items: center; gap: 13px; padding: 16px; overflow: hidden; }
.v2pf-av { position: relative; display: grid; place-items: center; width: 54px; height: 54px; border-radius: 16px; font-size: 18px; font-weight: 900; color: #04240f; flex-shrink: 0;
  background: radial-gradient(120% 100% at 50% 14%, rgba(255,255,255,0.6), transparent 52%), linear-gradient(180deg, #2ee08a, #12a04f 60%, #0a7a3c); box-shadow: inset 0 2px 0 rgba(255,255,255,0.6), 0 6px 14px -6px rgba(0,0,0,0.6); }
.v2pf-av-rank { position: absolute; right: -5px; bottom: -5px; font-size: 15px; line-height: 1; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5)); }
.v2pf-id { flex: 1; min-width: 0; }
.v2pf-name { font-size: 16px; font-weight: 900; color: #eafff4; }
.v2pf-tier { display: inline-flex; align-items: center; gap: 4px; margin-top: 3px; font-size: 10.5px; font-weight: 900; color: #3a2600; padding: 3px 9px; border-radius: 999px; background: linear-gradient(180deg, #ffe9a8, #f6c945 60%, #c6851e); }
.v2pf-mrank { display: inline-flex; align-items: center; gap: 4px; margin-top: 6px; font-size: 10px; font-weight: 900; letter-spacing: 0.2px; padding: 4px 10px; border-radius: 999px; white-space: nowrap;
  border: 1px solid rgba(255,255,255,0.35); }
.v2pf-mrank-ic { font-size: 12px; line-height: 1; }
.v2pf-mrank em { font-style: normal; font-weight: 800; opacity: 0.78; }
.v2pf-bal { text-align: right; }
.v2pf-bal-k { font-size: 9.5px; font-weight: 800; letter-spacing: 0.6px; color: rgba(230,246,236,0.7); }
.v2pf-bal-v { font-size: 20px; font-weight: 900; color: #ffe9a8; }

/* VIP progress — c7p-panel base + c7p-progress bar */
.v2pf-vip { margin-top: 12px; padding: 13px 14px; }
.v2pf-vip-h { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 900; color: #ffe9a8; margin-bottom: 9px; }
.v2pf-vip-next { font-size: 10px; font-weight: 800; color: rgba(230,246,236,0.7); }
.v2pf-sample { font-size: 8.5px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; color: rgba(230,246,236,0.62); padding: 2px 7px; border-radius: 999px; border: 1px solid rgba(246,201,69,0.28); background: rgba(246,201,69,0.08); vertical-align: middle; margin-left: 4px; }
.v2pf-vip-bar { margin: 0; }
.v2pf-vip-f { display: flex; justify-content: space-between; margin-top: 6px; font-size: 10px; font-weight: 800; color: rgba(230,246,236,0.65); }

.v2pf-sec { margin: 22px 2px 10px; font-size: 12.5px; font-weight: 900; letter-spacing: 1.2px; text-transform: uppercase; color: #ffe9a8; text-shadow: 0 1px 3px rgba(0,0,0,0.35); }
.v2pf-sec--row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.v2pf-sec-link { border: none; background: none; cursor: pointer; font-family: inherit; color: #9fd8bd; font-size: 11px; font-weight: 800; letter-spacing: 0; text-transform: none; -webkit-tap-highlight-color: transparent; }
.v2pf-sec-link:active { opacity: 0.7; }

/* Achievements — c7p-panel base; locked state dims */
.v2pf-ach { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
.v2pf-ach-i { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 6px; opacity: 0.5; filter: grayscale(0.6); }
.v2pf-ach-i.got { opacity: 1; filter: none; box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 22px rgba(0,0,0,0.35), 0 10px 24px -8px rgba(0,0,0,0.6), 0 0 14px -6px rgba(46,224,138,0.5); }
.v2pf-ach-ic { font-size: 26px; line-height: 1; }
.v2pf-ach-l { font-size: 9.5px; font-weight: 800; color: rgba(230,246,236,0.72); text-align: center; }

/* Settings — c7p-panel base */
.v2pf-settings { display: flex; flex-direction: column; gap: 10px; }
.v2pf-set { display: flex; align-items: center; gap: 12px; padding: 14px; }
.v2pf-set-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: #2ee08a; background: rgba(46,224,138,0.12); border: 1px solid rgba(246,201,69,0.28); }
.v2pf-set-l { flex: 1; font-size: 13.5px; font-weight: 800; color: #eafff4; }
.v2pf-sw { position: relative; width: 44px; height: 26px; border-radius: 999px; border: none; cursor: pointer; background: rgba(4,15,10,0.9); box-shadow: inset 0 1px 3px rgba(0,0,0,0.5); transition: background .15s; padding: 0; }
.v2pf-sw.on { background: linear-gradient(180deg, #2ee08a, #12a04f); }
.v2pf-sw i { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #eafff4; box-shadow: 0 2px 4px rgba(0,0,0,0.4); transition: transform .15s; }
.v2pf-sw.on i { transform: translateX(18px); }

/* Menu / logout rows — c7p-panel base */
.v2pf-menu { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
.v2pf-row { display: flex; align-items: center; gap: 13px; padding: 14px; cursor: pointer; font-family: inherit; text-align: left; color: #eafff4; }
.v2pf-row-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; color: #2ee08a; flex-shrink: 0; background: rgba(46,224,138,0.12); border: 1px solid rgba(246,201,69,0.28); }
.v2pf-row-tx { flex: 1; min-width: 0; }
.v2pf-row-l { font-size: 14px; font-weight: 900; color: #eafff4; }
.v2pf-row-d { font-size: 11px; color: rgba(230,246,236,0.72); }
.v2pf-row-ch { color: rgba(46,224,138,0.6); flex-shrink: 0; }
/* Log out — danger-toned row */
.v2pf-row--danger .v2pf-row-ic { color: #ff9a8f; background: rgba(255,90,80,0.12); border-color: rgba(255,120,110,0.3); }
.v2pf-row--danger .v2pf-row-l { color: #ffd9d4; }
.v2pf-foot { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 16px; font-size: 10.5px; font-weight: 700; color: rgba(230,246,236,0.6); }
`;

// V2Refer — Refer & Earn shell (/v3/rewards/refer; /v2/refer redirects here). A premium presentation screen for the
// referral programme: invite code, share CTA, reward tiers and referral stats.
//
// Honesty pass: the invite code, share link, referral/team counts, C74 earned,
// per-friend reward, and milestone progress are now LIVE (read-only) — sourced
// from the same `agent_summary` RPC + useC74 that power the Agent Dashboard.
// No reward-CREDIT / claim logic here (claiming stays on /agent). Falls back to a
// disabled "sign in" state when signed out. The Share button uses the Web Share
// API when available and otherwise copies the invite link to the clipboard. V1
// untouched; lives only at /v2. Honors prefers-reduced-motion.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, Copy, Check, Gift, Users, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useC74 } from "@/hooks/useC74";
import C7Icon from "@/components/c7/C7Icon";
import C7Asset from "@/components/c7/C7Asset";

// Real referral summary — same agent_summary RPC that powers the Agent Dashboard.
interface Summary {
  referral_code: string | null;
  direct_referrals: number;
  team_size: number;
  total_earned: number;
  unclaimed: number;
}

const STEPS = [
  { ic: <C7Icon name="link" />, l: "Share your code", d: "Send your invite link to friends" },
  { ic: "🎮", l: "They play", d: "Friend signs up and plays their first game" },
  { ic: <C7Icon name="coin" />, l: "You both earn", d: "Referral C74 credited as your friends play" },
];
// Multi-level milestone ladder — reward copy is program config; progress is
// driven by the member's real direct-referral count.
const TIERS = [
  { n: 1, reward: "500 C74" },
  { n: 5, reward: "3,000 C74 + Bronze boost" },
  { n: 10, reward: "8,000 C74 + Silver boost" },
  { n: 25, reward: "25,000 C74 + VIP Gold" },
];

export default function V2Refer() {
  const nav = useNavigate();
  const [copied, setCopied] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const { summary: c74 } = useC74();

  // Pull the member's real referral summary (null when signed out — graceful).
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.rpc("agent_summary");
      if (alive && !error && data) setSummary(data as unknown as Summary);
    })();
    return () => { alive = false; };
  }, []);

  const code = summary?.referral_code ?? null;
  const link = code ? `${window.location.origin}/?ref=${code}` : "";
  const direct = summary?.direct_referrals ?? 0;
  const team = summary?.team_size ?? 0;
  const c74Earned = Number(c74?.earned_by_source?.referral ?? 0);
  const perFriend = c74?.config?.referral_reward ?? 500;

  const STATS = [
    { ic: <Users size={15} />, k: "Referrals", v: String(direct) },
    { ic: <Check size={15} />, k: "Team", v: String(team) },
    { ic: <Coins size={15} />, k: "C74 earned", v: c74Earned.toLocaleString() },
  ];

  const share = async () => {
    if (!code) return;
    const text = `Join me on C7 Winners! Use my code ${code}`;
    try {
      if (navigator.share) { await navigator.share({ title: "C7 Winners", text, url: link }); return; }
      await navigator.clipboard?.writeText(link || code);
      setCopied(true); setTimeout(() => setCopied(false), 1600);
    } catch { /* user cancelled share — no-op */ }
  };
  const copy = async () => {
    if (!code) return;
    try { await navigator.clipboard?.writeText(link || code); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ }
  };

  return (
    <div className="v2rf">
      <style>{CSS}</style>
      <div className="v2rf-bg" aria-hidden="true" />

      <header className="v2rf-top">
        <button className="c7p-pg-back" onClick={() => nav("/v3/rewards")} aria-label="Back"><ArrowLeft size={18} /></button>
        <div className="v2rf-toptx">Refer &amp; Earn</div>
      </header>

      <main className="v2rf-main">
        <section className="c7p-card-gold v2rf-hero">
          <C7Asset slot="hero.chest" className="v2rf-hero-img" fallback={<img className="v2rf-hero-img" src="/casino/reward-invite-chest.webp" alt="" draggable={false} />} />
          <h1 className="v2rf-hero-h">Invite friends, earn C74</h1>
          <p className="v2rf-hero-p">Get <b>{perFriend} C74</b> for every friend who joins and plays.</p>

          <div className="v2rf-code">
            <span className="v2rf-code-v">{code ?? "Sign in for code"}</span>
            <button className="v2rf-code-cp" onClick={copy} disabled={!code} aria-label="Copy code">{copied ? <Check size={16} /> : <Copy size={16} />}</button>
          </div>
          <button className="v2rf-share" onClick={share} disabled={!code}><Share2 size={16} /> {copied ? "Copied!" : code ? "Share invite" : "Sign in to invite"}</button>
        </section>

        <div className="v2rf-stats">
          {STATS.map((s) => (
            <div key={s.k} className="c7p-glass v2rf-stat">
              <span className="v2rf-stat-ic">{s.ic}</span>
              <div className="v2rf-stat-v">{s.v}</div>
              <div className="v2rf-stat-k">{s.k}</div>
            </div>
          ))}
        </div>

        <div className="v2rf-steps">
          {STEPS.map((s, i) => (
            <div key={s.l} className="c7p-glass v2rf-step">
              <span className="v2rf-step-ic">{s.ic}</span>
              <div className="v2rf-step-tx"><div className="v2rf-step-l">{s.l}</div><div className="v2rf-step-d">{s.d}</div></div>
              <span className="v2rf-step-n">{i + 1}</span>
            </div>
          ))}
        </div>

        {/* Multi-level milestone rewards */}
        <div className="c7p-sec">
          <span className="c7p-sec-ic"><C7Icon name="trophy" /></span>
          <span className="c7p-sec-t">Milestone rewards</span>
          <span className="c7p-sec-rule" />
        </div>
        <div className="v2rf-tiers">
          {TIERS.map((t) => {
            const reached = direct >= t.n;
            return (
              <div key={t.n} className={`v2rf-tier${reached ? " done" : ""}`}>
                <span className="v2rf-tier-n">{t.n}<i>friends</i></span>
                <span className="v2rf-tier-r">{t.reward}</span>
                <span className="v2rf-tier-s">{reached ? <Check size={15} /> : `${t.n - direct} to go`}</span>
              </div>
            );
          })}
        </div>

        <button className="v2rf-cta" onClick={share} disabled={!code}><Gift size={15} /> Invite &amp; earn {perFriend} C74</button>

        {/* Real referral/agent dashboard (live ledger, payouts) — the sole entry
            now that the V1 nav is retired. */}
        <button className="v2rf-agent" onClick={() => nav("/agent")}><Users size={14} /> Open Agent Dashboard</button>
      </main>
    </div>
  );
}

const CSS = `
.v2rf { position: relative; min-height: 100dvh; color: #eaffe0; font-family: inherit; padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px)); overflow: hidden; }
.v2rf-bg { position: fixed; inset: 0; z-index: -1;
  background: radial-gradient(120% 65% at 50% -8%, rgba(246,201,69,0.12), transparent 58%), radial-gradient(110% 55% at 50% 0%, rgba(46,224,138,0.11), transparent 60%), linear-gradient(172deg, #0d3d28 0%, #072517 46%, #04160d 100%); }
.v2rf-top { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: 10px; padding: 14px 14px 10px;
  background: linear-gradient(180deg, rgba(4,18,11,0.92), rgba(4,18,11,0.45)); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.v2rf-toptx { flex: 1; font-size: 16px; font-weight: 900; letter-spacing: 0.4px; }
.v2rf-main { max-width: 560px; margin: 0 auto; padding: 4px 14px 0; }

/* Hero frame/glow comes from the shared .c7p-card-gold primitive; .v2rf-hero owns layout. */
.v2rf-hero { position: relative; overflow: hidden; padding: 22px 16px; text-align: center; }
.v2rf-hero-ic { font-size: 44px; line-height: 1; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5)); }
.v2rf-hero-img { width: 96px; height: 96px; object-fit: contain; filter: drop-shadow(0 10px 18px rgba(0,0,0,0.55)) drop-shadow(0 0 22px rgba(46,224,138,0.4)); animation: v2rf-float 3.4s ease-in-out infinite; will-change: transform; }
@keyframes v2rf-float { 0%,100% { transform: translateY(0) rotate(-1.5deg); } 50% { transform: translateY(-7px) rotate(1.5deg); } }
.v2rf-tiers { display: flex; flex-direction: column; gap: 8px; }
.v2rf-tier { display: flex; align-items: center; gap: 11px; border-radius: 14px; padding: 12px 13px; background: linear-gradient(160deg, #10240c, #081f0c); border: 1px solid rgba(246,201,69,0.18); opacity: 0.72; }
.v2rf-tier.done { opacity: 1; border-image: linear-gradient(150deg, #0c4a2e, #2ee08a 45%, #0f7a4a) 1; box-shadow: 0 0 16px -6px rgba(46,224,138,0.5); }
.v2rf-tier-n { display: grid; place-items: center; min-width: 44px; font-size: 18px; font-weight: 900; color: #ecfff3; line-height: 1; }
.v2rf-tier-n i { font-style: normal; font-size: 8.5px; font-weight: 800; letter-spacing: 0.4px; color: rgba(205,238,176,0.6); }
.v2rf-tier-r { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 800; color: #c9f6e0; }
.v2rf-tier-s { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 900; color: #2ee08a; }
.v2rf-tier:not(.done) .v2rf-tier-s { color: rgba(205,238,176,0.6); }
@media (prefers-reduced-motion: reduce) { .v2rf-hero-img { animation: none; } }
.v2rf-hero-h { margin: 8px 0 4px; font-size: 19px; font-weight: 900; }
.v2rf-hero-p { margin: 0; font-size: 12.5px; color: rgba(205,238,176,0.85); }
.v2rf-hero-p b { color: #6ef0a8; }
.v2rf-code { display: flex; align-items: center; gap: 8px; justify-content: center; margin: 14px auto 0; width: fit-content; padding: 10px 10px 10px 16px; border-radius: 13px;
  background: rgba(2,16,10,0.6); border: 1.5px dashed rgba(246,201,69,0.5); }
.v2rf-code-v { font-family: "Courier New", monospace; font-size: 18px; font-weight: 900; letter-spacing: 2px; color: #ecfff3; }
.v2rf-code-cp { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 9px; cursor: pointer; color: #052012; border: none; background: linear-gradient(180deg, #6ef0a8, #1fc078); }
.v2rf-code-cp:active { transform: scale(0.92); }
.v2rf-share { display: inline-flex; align-items: center; gap: 7px; margin-top: 12px; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 900; color: #052012; padding: 11px 22px; border-radius: 13px; border: none;
  background: linear-gradient(180deg, #86f5b8, #1fc078 55%, #12925c); box-shadow: 0 5px 0 #0b6b43; transition: transform .08s ease; }
.v2rf-share:active { transform: translateY(3px); box-shadow: 0 2px 0 #0b6b43; }
.v2rf-share:disabled, .v2rf-cta:disabled, .v2rf-code-cp:disabled { opacity: 0.5; cursor: default; }
.v2rf-share:disabled:active, .v2rf-cta:disabled:active, .v2rf-code-cp:disabled:active { transform: none; }

.v2rf-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-top: 14px; }
.v2rf-stat { text-align: center; padding: 13px 6px; }
.v2rf-stat-ic { display: inline-grid; place-items: center; color: #2ee08a; }
.v2rf-stat-v { margin-top: 4px; font-size: 18px; font-weight: 900; color: #ecfff3; }
.v2rf-stat-k { font-size: 9.5px; font-weight: 800; letter-spacing: 0.4px; color: rgba(205,238,176,0.7); }

.v2rf-steps { display: flex; flex-direction: column; gap: 9px; margin-top: 14px; }
.v2rf-step { position: relative; display: flex; align-items: center; gap: 12px; padding: 13px 14px; }
.v2rf-step-ic { font-size: 24px; }
.v2rf-step-l { font-size: 13.5px; font-weight: 900; color: #ecfff3; }
.v2rf-step-d { font-size: 11px; color: rgba(205,238,176,0.72); }
.v2rf-step-n { margin-left: auto; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; font-size: 12px; font-weight: 900; color: #052012; background: linear-gradient(180deg, #6ef0a8, #1fc078); }

.v2rf-cta { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; margin-top: 16px; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 900; color: #052012; padding: 15px; border-radius: 15px; border: none;
  background: radial-gradient(120% 100% at 50% 12%, rgba(255,255,255,0.6), transparent 52%), linear-gradient(180deg, #86f5b8, #1fc078 55%, #12925c); box-shadow: 0 6px 0 #0b6b43, 0 12px 22px -10px rgba(0,0,0,0.7); transition: transform .08s ease; }
.v2rf-cta:active { transform: translateY(4px); box-shadow: 0 2px 0 #0b6b43; }
.v2rf-agent { display: flex; align-items: center; justify-content: center; gap: 7px; width: 100%; margin-top: 10px; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 800; color: #c9f6e0; padding: 12px; border-radius: 13px;
  background: rgba(46,224,138,0.08); border: 1px solid rgba(246,201,69,0.3); transition: background .15s, transform .08s ease; }
.v2rf-agent:active { transform: scale(0.98); }
.v2rf-agent:hover { background: rgba(46,224,138,0.14); }
`;

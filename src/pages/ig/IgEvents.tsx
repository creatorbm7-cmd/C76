// IgEvents (/ig/events) — Instagram-light Events & Tournaments. Reskinned from
// the dark V2Events to the IG-light system — presentation only (JSX + CSS).
//
// HONEST STATE (unchanged): there is NO tournament / leaderboard / event backend
// yet, so this screen makes no fabricated claims — no mock prize pools, no fake
// countdowns, no invented status pills. It shows a "coming soon" hero explaining
// live tournaments and seasonal events are launching soon, and points members to
// reward surfaces that ARE live today via real routes. Honors prefers-reduced-motion.
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, ChevronRight } from "lucide-react";
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";

// Reward surfaces that are genuinely live today — real routes, no fabrication.
// Deep-links repointed to IG-light equivalents where one exists; others kept.
const LIVE_NOW: { emoji: string; l: string; d: string; to: string }[] = [
  { emoji: "🎡", l: "Daily Wheel", d: "Spin for C74 & prizes", to: "/ig/reels/wheel" },
  { emoji: "🎯", l: "Missions", d: "Complete goals · earn C74", to: "/ig/missions" },
  { emoji: "🏦", l: "Bank Game", d: "Save C74 & grow your streak", to: "/ig/bank" },
];

export default function IgEvents() {
  const nav = useNavigate();

  return (
    <div className="ig igevt">
      <style>{CSS}</style>

      <header className="ig-top">
        <button className="igevt-back" onClick={() => (window.history.length > 1 ? nav(-1) : nav("/ig/rewards"))} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="ig-ttl">Events</span>
        <span style={{ width: 22 }} />
      </header>

      <main className="ig-main igevt-main">
        <section className="igevt-hero">
          <span className="igevt-hero-ic" aria-hidden="true"><Trophy size={30} /></span>
          <h1 className="igevt-hero-h">Tournaments &amp; Events</h1>
          <p className="igevt-hero-p">
            Live tournaments, leaderboards and seasonal events are on the way. We're building them properly —
            provably-fair scoring and real prize pools — so there's nothing fake to show here yet.
          </p>
          <span className="igevt-hero-badge"><Trophy size={12} /> Launching soon</span>
        </section>

        <div className="igevt-sec"><span>Live rewards right now</span></div>

        <div className="igevt-card">
          {LIVE_NOW.map((e, i) => (
            <button key={e.l} type="button" className="igevt-row" style={{ borderTop: i ? "1px solid var(--hair)" : "none" }} onClick={() => nav(e.to)} aria-label={e.l}>
              <span className="igevt-ic" aria-hidden="true">{e.emoji}</span>
              <span className="igevt-tx"><b>{e.l}</b><small>{e.d}</small></span>
              <ChevronRight size={18} className="igevt-arr" />
            </button>
          ))}
        </div>

        <footer className="igevt-foot">More reward types arrive over time · play responsibly</footer>
        <IgSocialNotice variant="line" />
      </main>

      <IgTabBar active="profile" />
    </div>
  );
}

const CSS = `
.ig { --bg:#07130d; --card:#103524; --card2:#12492f; --line:rgba(240,201,74,0.24); --hair:rgba(255,255,255,0.06); --ink:#f0fff7; --mut:#93c3aa; --faint:#5f8b76; --grn:#2ee08a; --grn2:#0e7a4a; --gold:#f0c94a; --gold-lite:#fff4cf; --gold-deep:#c68a2e; --antique:#e8c877; --loss:#ff6b7d;
  min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif; padding-bottom:calc(76px + env(safe-area-inset-bottom));
  background: radial-gradient(90% 40% at 50% -6%, rgba(240,201,74,0.08), transparent 55%), radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%), linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%); background-attachment:fixed; }
.ig * { box-sizing:border-box; }
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:54px; padding:0 12px;
  background:linear-gradient(180deg, rgba(9,32,20,0.95), rgba(9,32,20,0.55)); -webkit-backdrop-filter:blur(16px); backdrop-filter:blur(16px); border-bottom:1px solid var(--line); box-shadow:0 1px 0 rgba(240,201,74,0.16); }
.igevt-back { background:none; border:none; color:#cdead9; cursor:pointer; display:grid; place-items:center; width:38px; height:38px; border-radius:11px; }
.ig-ttl { font-size:18px; font-weight:800; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.ig-main { max-width:560px; margin:0 auto; }
.igevt-main { padding:16px 12px; display:flex; flex-direction:column; gap:14px; }

/* Coming-soon hero — cinematic gold-framed emerald cabinet + sheen sweep (honest, no fake figures) */
.igevt-hero { position:relative; overflow:hidden; display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; padding:28px 20px; border-radius:22px;
  color:var(--ink); border:1px solid transparent;
  background:radial-gradient(130% 120% at 50% 0%, rgba(240,201,74,0.16), transparent 56%), radial-gradient(120% 120% at 50% 8%, rgba(46,224,138,0.16), transparent 60%), linear-gradient(160deg,#123f29,#06180f);
  box-shadow:inset 0 0 0 1.4px rgba(240,201,74,0.46), inset 0 1.6px 0 rgba(255,255,255,0.22), inset 0 0 30px rgba(46,224,138,0.08), 0 0 26px -8px rgba(240,201,74,0.42), 0 24px 48px -22px rgba(0,0,0,0.88); }
.igevt-hero::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(105deg, transparent 42%, rgba(255,244,207,0.13) 50%, transparent 58%); transform:translateX(-150%); animation:igevt-sweep 7s ease-in-out infinite; }
@keyframes igevt-sweep { 0%,74% { transform:translateX(-150%); } 90%,100% { transform:translateX(150%); } }
.igevt-hero-ic { position:relative; z-index:1; flex:0 0 auto; width:62px; height:62px; border-radius:18px; display:grid; place-items:center; color:#3a2708;
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.7), inset 0 -3px 7px rgba(120,74,20,0.22), 0 0 20px -3px rgba(240,201,74,0.6), 0 10px 22px -10px rgba(0,0,0,0.7); }
.igevt-hero-h { position:relative; z-index:1; margin:6px 0 0; font-size:21px; font-weight:900; letter-spacing:0.2px;
  background:linear-gradient(100deg,var(--gold-lite) 0%,#ffe9a8 30%,#f7d868 50%,#e0a93a 66%,var(--gold-lite) 100%); background-size:220% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; animation:igevt-gold 5.5s ease-in-out infinite; }
@keyframes igevt-gold { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
.igevt-hero-p { position:relative; z-index:1; margin:0; font-size:12.5px; font-weight:600; line-height:1.55; color:var(--mut); max-width:40ch; }
.igevt-hero-badge { position:relative; z-index:1; display:inline-flex; align-items:center; gap:5px; margin-top:8px; font-size:10.5px; font-weight:900; letter-spacing:0.6px;
  color:var(--antique); padding:6px 13px; border-radius:999px; background:rgba(4,16,10,0.55); border:1px solid var(--line); }

.igevt-sec { display:flex; align-items:center; gap:7px; margin:2px 4px -2px; font-size:11px; letter-spacing:0.8px; font-weight:800; text-transform:uppercase; color:#f3ffe9; }

.igevt-card { border:1px solid transparent; border-radius:20px; overflow:hidden;
  background:linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96)); box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.38), inset 0 1.5px 0 rgba(255,255,255,0.12), inset 0 0 30px rgba(46,224,138,0.06), 0 24px 48px -28px rgba(0,0,0,0.9); }
.igevt-row { display:flex; align-items:center; gap:12px; width:100%; text-align:left; padding:14px 15px; min-height:44px; cursor:pointer; font-family:inherit; color:var(--ink); background:transparent; border:none; }
.igevt-row:active { transform:translateY(1px); }
.igevt-ic { flex:0 0 auto; width:44px; height:44px; border-radius:13px; display:grid; place-items:center; font-size:21px; line-height:1;
  background:radial-gradient(120% 120% at 50% 18%, #1a5738, #0b2418); border:1px solid var(--line); box-shadow:inset 0 1px 0 rgba(246,230,176,0.12); }
.igevt-tx { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.igevt-tx b { font-size:14.5px; font-weight:800; color:#f3ffe9; }
.igevt-tx small { font-size:11.5px; color:var(--mut); font-weight:600; }
.igevt-arr { color:var(--gold); flex-shrink:0; }

.igevt-foot { text-align:center; margin-top:6px; font-size:10.5px; font-weight:600; color:var(--mut); }

@media (prefers-reduced-motion: reduce) { .igevt-hero::after, .igevt-hero-h { animation:none!important; } .igevt-hero-h { -webkit-text-fill-color:var(--gold); } .igevt-row:active { transform:none; } }
`;

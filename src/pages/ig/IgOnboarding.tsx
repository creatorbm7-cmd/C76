// IgOnboarding (/ig/onboarding) — presentation-only welcome → lobby entry.
// Leads the user into the existing /ig app. No data, no money surface; it only
// navigates into the live experience (Home / Explore / Reels). Reduced-motion safe.
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Gamepad2, Clapperboard, ShieldCheck } from "lucide-react";

const STEPS: { ic: React.ReactNode; t: string; s: string; to: string }[] = [
  { ic: <Gamepad2 size={20} />, t: "Explore 359 games", s: "Egypt · Dragon · Olympus worlds — free-play demos", to: "/ig/explore" },
  { ic: <Clapperboard size={20} />, t: "Reels", s: "Swipe a cinematic games feed", to: "/ig/reels" },
  { ic: <Sparkles size={20} />, t: "C74 rewards", s: "Missions, mining & VIP across the ecosystem", to: "/ig/earn" },
];

export default function IgOnboarding() {
  const nav = useNavigate();
  return (
    <div className="ig">
      <style>{CSS}</style>
      <main className="igob-main">
        <section className="igob-hero">
          <div className="igob-bg" aria-hidden="true" />
          <div className="igob-sc" aria-hidden="true" />
          <div className="igob-in">
            <div className="igob-eyebrow">C7 · WINNERS</div>
            <h1 className="igob-word">Welcome to<br /><span>C7 Winners</span></h1>
            <p className="igob-tag">A premium reel-first, free-play casino experience — all in one gold-lit feed.</p>
          </div>
        </section>

        <div className="igob-steps">
          {STEPS.map((x) => (
            <button key={x.to} className="igob-card" onClick={() => nav(x.to)}>
              <span className="igob-ic">{x.ic}</span>
              <span className="igob-ct"><b>{x.t}</b><small>{x.s}</small></span>
              <ArrowRight size={17} className="igob-chev" />
            </button>
          ))}
        </div>

        <button className="igob-enter" onClick={() => nav("/ig")}>
          Enter the lobby <ArrowRight size={18} />
        </button>

        <div className="igob-note">
          <ShieldCheck size={13} /> Presentation &amp; free-play preview · social mode · no real-money surface.
        </div>
      </main>
    </div>
  );
}

const CSS = `
.ig { --gold:#f0c94a; --gold-l:#fff4cf; --gold-d:#c68a2e; --hair:rgba(240,201,74,0.28); --line:rgba(240,201,74,0.2); --ink:#eafff4; --mut:#93c3aa; --grn:#2ee08a;
  min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif;
  background:radial-gradient(120% 62% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%), linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%); background-attachment:fixed; }
.ig * { box-sizing:border-box; }
.igob-main { max-width:560px; margin:0 auto; padding:16px 16px 48px; }
.igob-hero { position:relative; border-radius:20px; overflow:hidden; min-height:230px; display:flex; align-items:flex-end; border:1px solid var(--hair);
  box-shadow:0 0 0 1.5px rgba(240,201,74,0.4) inset, 0 22px 50px -22px rgba(0,0,0,0.85); }
.igob-bg { position:absolute; inset:0; background:radial-gradient(90% 70% at 50% 10%, #1c5c3c, #06180f 76%); }
.igob-bg::after { content:""; position:absolute; inset:0; background-image:radial-gradient(1.5px 1.5px at 20% 30%,rgba(240,201,74,0.6),transparent),radial-gradient(1.5px 1.5px at 72% 22%,rgba(255,244,207,0.5),transparent),radial-gradient(2px 2px at 44% 66%,rgba(240,201,74,0.5),transparent),radial-gradient(1.5px 1.5px at 85% 58%,rgba(255,244,207,0.4),transparent); }
.igob-sc { position:absolute; inset:0; background:linear-gradient(180deg, transparent 40%, rgba(3,10,7,0.85)); }
.igob-in { position:relative; padding:20px; width:100%; }
.igob-eyebrow { font-size:11px; font-weight:900; letter-spacing:3px; color:var(--gold); }
.igob-word { margin-top:6px; font-size:32px; font-weight:900; letter-spacing:-1px; line-height:1.02; }
.igob-word span { background:linear-gradient(92deg,var(--gold-d),var(--gold) 45%,var(--gold-l)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.igob-tag { margin-top:8px; font-size:13.5px; line-height:1.55; color:#dff6ea; max-width:42ch; }
.igob-steps { display:flex; flex-direction:column; gap:11px; margin-top:16px; }
.igob-card { display:flex; align-items:center; gap:13px; padding:15px; border-radius:15px; cursor:pointer; text-align:left; width:100%; color:var(--ink);
  background:linear-gradient(160deg, rgba(18,73,47,0.8), rgba(7,32,20,0.9)); border:1px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.05); transition:transform .14s ease, border-color .14s ease; }
.igob-card:hover { border-color:var(--hair); }
.igob-card:active { transform:scale(0.985); }
.igob-ic { width:42px; height:42px; border-radius:12px; display:grid; place-items:center; color:var(--gold); flex:0 0 auto;
  background:radial-gradient(120% 120% at 50% 15%, rgba(240,201,74,0.16), rgba(8,20,14,0.7)); border:1px solid var(--line); }
.igob-ct { flex:1; min-width:0; }
.igob-ct b { display:block; font-size:14.5px; font-weight:800; }
.igob-ct small { display:block; font-size:12px; color:var(--mut); margin-top:2px; }
.igob-chev { color:var(--mut); flex:0 0 auto; }
.igob-enter { margin-top:18px; width:100%; display:inline-flex; align-items:center; justify-content:center; gap:8px; cursor:pointer; border:none;
  font-family:inherit; font-size:16px; font-weight:900; color:#120a02; padding:15px; border-radius:15px;
  background:linear-gradient(92deg,var(--gold-d),var(--gold) 55%,var(--gold-l)); box-shadow:0 14px 32px -10px rgba(240,201,74,0.5); }
.igob-enter:active { transform:translateY(1px); }
.igob-note { margin-top:16px; display:flex; align-items:center; justify-content:center; gap:6px; font-size:11.5px; color:var(--mut); }
@media (prefers-reduced-motion:reduce){ .igob-card{ transition:none; } }
`;

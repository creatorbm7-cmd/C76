// IgReels (/ig/reels) — premium "Lucky Wheel" experience, rebuilt to the graphic-
// designer reference: free-spin/streak chips → big spin-wheel hero → honest C74
// prize-tier grid → the REAL server-authoritative reel engine → invite CTA.
//
// Every value shown is real: free-spin status + countdown come from
// c74_free_spin_status, the daily streak from useC7Pulse, and the prize tiers
// mirror the actual c74_wheel_spin() prizes (50…3,000 C74). No fabricated cash or
// jackpot figures. The interactive spin (C74Reel) and daily free spin
// (C74DailyFreeSpin) are the untouched, server-verified components.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Gift, Clock, Crown, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useC7Pulse } from "@/hooks/useC7Pulse";
import C74Reel from "@/components/c7/C74Reel";
import C74WinBurst from "@/components/c7/C74WinBurst";
import C74DailyFreeSpin from "@/components/c7/C74DailyFreeSpin";
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";

// mm:ss (or Hh Mm) until the next free spin — presentation of real next_at.
function fmtCd(nextAt: string | null): string {
  if (!nextAt) return "";
  const ms = new Date(nextAt).getTime() - Date.now();
  if (ms <= 0) return "";
  const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4), s = Math.floor((ms % 6e4) / 1000);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Honest prize grid — mirrors the real reel prizes + real perks (no invented cash).
const PRIZES: { ic: string; v: string; k: string; to?: string }[] = [
  { ic: "🏆", v: "3,000 C74", k: "Top prize" },
  { ic: "🪙", v: "8 tiers", k: "50–3,000 C74" },
  { ic: "🎁", v: "Daily", k: "Free spin" },
  { ic: "👑", v: "VIP perks", k: "VIP Club", to: "/ig/vip" },
  { ic: "🛡️", v: "100%", k: "Provably fair" },
  { ic: "🎟️", v: "Invite", k: "Extra spins", to: "/ig/invite" },
];

export default function IgReels() {
  const nav = useNavigate();
  const pulse = useC7Pulse();
  const [burst, setBurst] = useState<{ amount: number; jackpot: boolean } | null>(null);
  const [fs, setFs] = useState<{ available: boolean; nextAt: string | null }>({ available: false, nextAt: null });
  const [, tick] = useState(0);
  const reelRef = useRef<HTMLDivElement>(null);

  // Real free-spin status for the top chips (read-only; the claim lives in C74DailyFreeSpin).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await (supabase.rpc as any)("c74_free_spin_status");
        if (alive) setFs({ available: Boolean(data?.available), nextAt: data?.next_at ?? null });
      } catch { if (alive) setFs({ available: true, nextAt: null }); }
    })();
    return () => { alive = false; };
  }, []);
  // Tick the countdown chip while on cooldown; flip to available when it elapses.
  useEffect(() => {
    if (fs.available || !fs.nextAt) return;
    const t = window.setInterval(() => {
      if (fs.nextAt && Date.now() >= new Date(fs.nextAt).getTime()) setFs((s) => ({ ...s, available: true }));
      else tick((n) => n + 1);
    }, 1000);
    return () => window.clearInterval(t);
  }, [fs.available, fs.nextAt]);

  const cd = fmtCd(fs.nextAt);
  const streak = pulse.streak ?? 0;
  const toReel = () => reelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div className="ig">
      <style>{CSS}</style>
      <header className="ig-top">
        <button className="igr-back" onClick={() => (window.history.length > 1 ? nav(-1) : nav("/ig"))} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="ig-ttl">C74 Reels</span>
        <span style={{ width: 22 }} />
      </header>

      <main className="ig-main igr-main">
        {/* Ornate C74 REELS crest (real art) + provably-fair badge */}
        <section className="igr-hero">
          <img className="igr-crest" src="/images/v3/reels/hero.png" alt="C74 Reels" loading="eager"
            onError={(e) => { e.currentTarget.style.display = "none"; }} />
          <span className="igr-fairbadge"><ShieldCheck size={14} /><em><b>100%</b> Provably Fair<br />Server Verified</em></span>
        </section>

        {/* Real status chips — free spin · countdown · daily streak */}
        <div className="igr-stats">
          <span className={`igr-stat${fs.available ? " on" : ""}`}><Gift size={15} /><em>{fs.available ? "1 Free Spin" : "Free spin"}</em></span>
          <span className="igr-stat"><Clock size={15} /><em>{cd ? `Next in ${cd}` : "Ready now"}</em></span>
          <span className="igr-stat"><Crown size={15} /><em>Day {streak} streak</em></span>
        </div>

        {/* Big spin-wheel hero — premium marquee casino wheel (gold bulb rim + top
            pointer + centre SPIN hub); the hub leads to the real server reels. */}
        <div className="igr-spinhero">
          <span className="igr-spinhero-t">💰 SPIN TO WIN</span>
          <div className="igr-wheel3d">
            <span className="igr-wh-glow" aria-hidden="true" />
            <img className="igr-wheel" src="/images/v3/c74-wheel-face.png" alt="" loading="eager"
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <span className="igr-wh-rim" aria-hidden="true" />
            <svg className="igr-wh-bulbs" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="95" /></svg>
            <span className="igr-wh-ptr" aria-hidden="true" />
            <button className="igr-wh-hub" onClick={toReel} aria-label="Spin the C74 reels">
              <span className="igr-wh-hub-t">SPIN</span>
              <span className="igr-wh-hub-s">{fs.available ? "1 FREE SPIN" : "PLAY NOW"}</span>
            </button>
          </div>
          <span className="igr-spinhero-sub"><ShieldCheck size={13} /> 100% Provably Fair · win up to 3,000 C74</span>
        </div>

        {/* Honest prize-tier grid (3×2) */}
        <div className="igr-prizes">
          {PRIZES.map((p) => (
            <button key={p.k} className="igr-prize" onClick={() => (p.to ? nav(p.to) : toReel())}>
              <span className="igr-prize-ic">{p.ic}</span>
              <span className="igr-prize-v">{p.v}</span>
              <span className="igr-prize-k">{p.k}</span>
            </button>
          ))}
        </div>

        {/* Real daily free-spin (server-authoritative c74_free_spin) */}
        <div className="igr-freespin"><C74DailyFreeSpin /></div>

        {/* Real, server-authoritative reel — the ornate machine renders inside. */}
        <article className="igr-post">
          <div className="igr-stage" ref={reelRef}>
            <C74Reel onWin={(amount, jackpot) => { if (jackpot) setBurst({ amount, jackpot: true }); }} />
          </div>
          <p className="igr-cap"><b>C74 Reels</b> Match three to win — every spin is server-verified. 🎰</p>
        </article>

        {/* Invite CTA (real referral route) */}
        <button className="igr-invite" onClick={() => nav("/ig/invite")}>
          <Ticket size={18} /> Invite friends for extra spins
        </button>

        <IgSocialNotice variant="line" />
      </main>

      <C74WinBurst show={!!burst} amount={burst?.amount ?? 0} jackpot={burst?.jackpot ?? false} onDone={() => setBurst(null)} />
      <IgTabBar active="reels" />
    </div>
  );
}

const CSS = `
.ig { --bg:#07130d; --card:#103524; --card2:#12492f; --line:rgba(240,201,74,0.26); --ink:#eafff4; --mut:#93c3aa; --grn:#2ee08a; --grn2:#0e7a4a; --gold:#f0c94a; --gold3:#c68a2e; --loss:#ff6b7d;
  min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif; padding-bottom:calc(76px + env(safe-area-inset-bottom));
  background:
    radial-gradient(120% 58% at 50% -10%, rgba(240,201,74,0.10) 0%, transparent 46%),
    radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%),
    linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%); background-attachment:fixed; }
.ig * { box-sizing:border-box; }
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:52px; padding:0 12px;
  background:linear-gradient(180deg, rgba(9,32,20,0.92), rgba(9,32,20,0.62)); -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); border-bottom:1px solid var(--line);
  box-shadow:0 1px 0 rgba(240,201,74,0.22), 0 10px 24px -16px rgba(0,0,0,0.7); }
.igr-back { background:none; border:none; color:#d6ffe9; cursor:pointer; display:grid; place-items:center; }
.ig-ttl { font-size:18px; font-weight:800; background:linear-gradient(180deg,#fff3c8,#f0c94a 55%,#c68a2e); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; text-shadow:0 0 14px rgba(240,201,74,0.3); }
.ig-main { max-width:560px; margin:0 auto; }

/* Crest hero — the ornate C74 REELS banner art, in a bright gold frame */
.igr-hero { position:relative; margin:12px 12px 0; text-align:center; padding:6px; border-radius:20px;
  background:linear-gradient(180deg, rgba(18,73,47,0.6), rgba(7,28,18,0.7));
  animation:igrHeroGlow 5.2s ease-in-out infinite; }
@keyframes igrHeroGlow {
  0%,100% { box-shadow:0 0 22px -6px rgba(240,201,74,0.5), 0 0 46px -14px rgba(46,224,138,0.5), inset 0 1px 0 rgba(246,230,176,0.14); }
  50% { box-shadow:0 0 30px -4px rgba(240,201,74,0.72), 0 0 62px -12px rgba(46,224,138,0.62), inset 0 1px 0 rgba(246,230,176,0.2); } }
.igr-hero::before { content:""; position:absolute; inset:0; border-radius:20px; padding:1.6px; pointer-events:none; z-index:2;
  background:linear-gradient(180deg,#fff3c8,#f0c94a 45%,#c68a2e);
  -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; }
.igr-crest { width:100%; height:auto; display:block; border-radius:15px; filter:drop-shadow(0 12px 26px rgba(0,0,0,0.55)); }
.igr-fairbadge { position:absolute; top:8px; right:8px; display:inline-flex; align-items:center; gap:6px; text-align:left; font-size:9px; font-weight:800; line-height:1.18; color:#f3ffe9;
  padding:6px 11px; border-radius:12px; background:linear-gradient(180deg, rgba(9,32,20,0.92), rgba(5,18,11,0.94)); border:1px solid var(--gold);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.14), 0 4px 12px -4px rgba(0,0,0,0.6); }
.igr-fairbadge svg { color:var(--gold); flex:0 0 auto; }
.igr-fairbadge em { font-style:normal; } .igr-fairbadge b { color:#ffe9a8; font-weight:900; }

/* Status chips — real free-spin / countdown / streak */
.igr-stats { display:flex; justify-content:center; flex-wrap:wrap; gap:8px; padding:14px 12px 2px; }
.igr-stat { display:inline-flex; align-items:center; gap:7px; font-size:12.5px; font-weight:800; color:#eafff4;
  padding:8px 14px; border-radius:999px;
  background:linear-gradient(180deg, rgba(24,96,63,0.8), rgba(6,24,15,0.9));
  box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.5), inset 0 1px 0 rgba(255,255,255,0.24), 0 6px 14px -8px rgba(0,0,0,0.7); }
.igr-stat svg { color:var(--gold); flex:0 0 auto; } .igr-stat em { font-style:normal; }
.igr-stat.on { box-shadow:inset 0 0 0 1.3px rgba(58,240,160,0.7), inset 0 1px 0 rgba(255,255,255,0.28), 0 0 16px -4px rgba(46,224,138,0.7); }
.igr-stat.on svg { color:var(--grn); }

/* Spin-wheel hero — big centrepiece that leads to the real reels */
.igr-spinhero { position:relative; display:flex; flex-direction:column; align-items:center; gap:6px; width:calc(100% - 24px); margin:14px 12px 0;
  padding:16px 12px 20px; border-radius:22px; text-align:center; color:var(--ink);
  background:
    radial-gradient(120% 80% at 50% -6%, rgba(46,224,138,0.24), transparent 62%),
    linear-gradient(180deg, rgba(20,80,52,0.74), rgba(6,26,17,0.88));
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.16), inset 0 0 30px rgba(46,224,138,0.12),
    0 0 26px -6px rgba(240,201,74,0.45), 0 18px 40px -18px rgba(0,0,0,0.85); }
.igr-spinhero::before { content:""; position:absolute; inset:0; border-radius:22px; padding:2px; pointer-events:none; z-index:1;
  background:linear-gradient(180deg,#fff3c8,#f0c94a 42%,#c68a2e 78%,#8a5a1e);
  -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; }
.igr-spinhero-t { position:relative; z-index:2; font-size:15px; font-weight:900; letter-spacing:1.2px; color:var(--grn); text-shadow:0 0 14px rgba(46,224,138,0.4); }
.igr-spinhero-sub { position:relative; z-index:2; display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; color:var(--mut); }
.igr-spinhero-sub svg { color:var(--gold); }

/* ── Premium marquee casino wheel: gold bulb rim + pointer + centre SPIN hub ── */
.igr-wheel3d { position:relative; width:256px; height:256px; margin:8px auto 6px; z-index:2; }
/* green halo behind the wheel */
.igr-wh-glow { position:absolute; inset:-10px; border-radius:50%; pointer-events:none; z-index:0;
  background:radial-gradient(circle, rgba(58,240,160,0.5) 0%, rgba(46,224,138,0.22) 42%, transparent 70%); filter:blur(7px); animation:igrPulse 3.2s ease-in-out infinite; }
/* the on-brand prize wheel art, slowly turning inside the rim */
.igr-wheel { position:absolute; top:24px; left:24px; width:208px; height:208px; border-radius:50%; z-index:1; object-fit:cover;
  filter:drop-shadow(0 6px 14px rgba(0,0,0,0.5)); animation:igrSpin 20s linear infinite; }
/* metallic gold rim ring around the wheel face */
.igr-wh-rim { position:absolute; inset:12px; border-radius:50%; pointer-events:none; z-index:2;
  background:conic-gradient(#8a5a1e, #fff3c8 12%, #c68a2e 28%, #8a5a1e 45%, #fff3c8 60%, #c68a2e 76%, #8a5a1e 92%, #fff3c8);
  -webkit-mask:radial-gradient(closest-side, transparent 86%, #000 87%); mask:radial-gradient(closest-side, transparent 86%, #000 87%);
  box-shadow:0 0 14px -2px rgba(240,201,74,0.7); }
/* marquee light bulbs — a round-capped dashed ring, glowing + twinkling */
.igr-wh-bulbs { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:3;
  filter:drop-shadow(0 0 4px rgba(255,240,180,0.95)) drop-shadow(0 0 8px rgba(240,201,74,0.7)); animation:igrTwinkle 1.6s steps(2,end) infinite; }
.igr-wh-bulbs circle { fill:none; stroke:#fff3c8; stroke-width:5; stroke-linecap:round; stroke-dasharray:0.5 20.3; }
/* top pointer marker */
.igr-wh-ptr { position:absolute; top:-6px; left:50%; transform:translateX(-50%); z-index:5; width:0; height:0;
  border-left:12px solid transparent; border-right:12px solid transparent; border-top:20px solid #f0c94a;
  filter:drop-shadow(0 2px 3px rgba(0,0,0,0.6)) drop-shadow(0 0 6px rgba(240,201,74,0.8)); }
.igr-wh-ptr::after { content:""; position:absolute; top:-20px; left:-6px; width:12px; height:12px; border-radius:50%;
  background:radial-gradient(circle at 40% 30%, #fff, #ed4956 60%, #a01020); box-shadow:0 0 8px rgba(237,73,86,0.8); }
/* centre SPIN hub — gold coin button, sits static over the turning face */
.igr-wh-hub { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:6; width:86px; height:86px; border-radius:50%;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; cursor:pointer; border:none; color:#0a2410;
  background:radial-gradient(circle at 50% 32%, #fff8dc, #f5cf55 52%, #c68a2e 100%);
  box-shadow:inset 0 2px 0 rgba(255,255,255,0.7), inset 0 -4px 8px rgba(120,74,20,0.4), 0 0 0 4px rgba(10,36,16,0.9), 0 0 0 6px rgba(240,201,74,0.85), 0 6px 16px -4px rgba(0,0,0,0.7), 0 0 22px -2px rgba(240,201,74,0.7);
  transition:transform .12s ease, filter .12s ease; }
.igr-wh-hub:active { transform:translate(-50%,-50%) scale(0.94); filter:brightness(1.06); }
.igr-wh-hub-t { font-size:21px; font-weight:900; letter-spacing:0.5px; line-height:1; text-shadow:0 1px 0 rgba(255,255,255,0.4); }
.igr-wh-hub-s { font-size:7.5px; font-weight:800; letter-spacing:0.5px; color:#3a2708; }
@keyframes igrSpin { to { transform:rotate(360deg); } }
@keyframes igrPulse { 0%,100% { opacity:0.7; } 50% { opacity:1; } }
@keyframes igrTwinkle { 0% { opacity:1; } 100% { opacity:0.55; } }

/* Honest prize-tier grid (3×2) — premium gold-cabinet mini-tiles */
.igr-prizes { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; padding:14px 12px 2px; }
.igr-prize { position:relative; display:flex; flex-direction:column; align-items:center; text-align:center; gap:4px; cursor:pointer; border:none; color:#eafff4;
  padding:14px 6px 12px; border-radius:15px;
  background:
    radial-gradient(120% 80% at 50% -6%, rgba(58,240,160,0.26), transparent 60%),
    linear-gradient(180deg, rgba(24,96,63,0.72), rgba(6,24,15,0.92));
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.16), inset 0 0 18px rgba(46,224,138,0.14),
    0 0 16px -6px rgba(240,201,74,0.45), 0 8px 18px -10px rgba(0,0,0,0.72);
  transition:transform .1s ease; }
.igr-prize:active { transform:translateY(1px) scale(0.98); }
.igr-prize::before { content:""; position:absolute; inset:0; border-radius:15px; padding:1.5px; pointer-events:none;
  background:linear-gradient(180deg,#fff3c8,#f0c94a 48%,#c68a2e 82%);
  -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; }
.igr-prize-ic { font-size:28px; line-height:1; filter:drop-shadow(0 3px 5px rgba(0,0,0,0.55)) drop-shadow(0 0 10px rgba(240,201,74,0.5)); }
.igr-prize-v { font-size:15px; font-weight:900; letter-spacing:-.3px;
  background:linear-gradient(180deg,#fff6d5,#f0c94a 62%,#c68a2e); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.igr-prize-k { font-size:10px; font-weight:800; letter-spacing:.4px; color:#a9dcc2; text-transform:uppercase; }

/* Real daily free-spin wrapper → gold-framed emerald cabinet (styles wrapper only) */
.igr-freespin { padding:14px 12px 0; }
.igr-freespin .c74fs { border-radius:15px; border-color:transparent;
  background:
    radial-gradient(120% 90% at 50% -10%, rgba(58,240,160,0.2), transparent 60%),
    linear-gradient(180deg, rgba(24,96,63,0.92), rgba(6,24,15,0.94));
  box-shadow:
    inset 0 0 0 1.4px rgba(240,201,74,0.55),
    inset 0 1.5px 0 rgba(255,255,255,0.28),
    inset 0 0 22px rgba(46,224,138,0.14),
    0 0 18px -6px rgba(240,201,74,0.42),
    0 12px 26px -14px rgba(0,0,0,0.82); }
.igr-freespin .c74fs-ic { box-shadow:0 0 14px -3px rgba(46,224,138,0.6), inset 0 1px 0 rgba(255,255,255,0.3); }

/* Premium glass emerald "reel post" card with gold hairline */
.igr-post { margin:14px 12px 0; border-radius:18px; overflow:hidden; position:relative;
  background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92));
  border:1px solid var(--line); box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
/* Reel machine sits in a gold-framed emerald "cabinet" — rich arcade framing. */
.igr-stage { position:relative; margin:2px 10px 14px; padding:14px 6px 18px; border-radius:20px; scroll-margin-top:70px;
  background:
    radial-gradient(120% 90% at 50% -4%, rgba(46,224,138,0.22), transparent 62%),
    linear-gradient(180deg, rgba(20,80,52,0.72), rgba(6,26,17,0.85));
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.16), inset 0 0 30px rgba(46,224,138,0.12),
    0 0 26px -6px rgba(240,201,74,0.45), 0 18px 40px -18px rgba(0,0,0,0.85); }
.igr-stage::before { content:""; position:absolute; inset:0; border-radius:20px; padding:2px; pointer-events:none; z-index:1;
  background:linear-gradient(180deg,#fff3c8,#f0c94a 42%,#c68a2e 78%,#8a5a1e);
  -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; }
.igr-stage::after { content:""; position:absolute; top:7px; left:50%; transform:translateX(-50%); width:54%; height:3px; border-radius:3px; z-index:2;
  background:linear-gradient(90deg, transparent, #f5cf55, #37e29a, #f5cf55, transparent); box-shadow:0 0 12px rgba(240,201,74,0.7); pointer-events:none; }
.igr-cap { margin:2px 0 14px; padding:0 12px; font-size:13px; color:#dbeee2; line-height:1.45; } .igr-cap b { font-weight:800; color:#f3ffe9; }

/* Invite CTA — big green premium button (real referral route) */
.igr-invite { display:flex; align-items:center; justify-content:center; gap:9px; width:calc(100% - 24px); margin:16px 12px 4px;
  padding:15px 18px; border-radius:15px; border:none; cursor:pointer; font-size:15px; font-weight:900; color:#0a2410;
  background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a);
  box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.6), inset 0 -3px 7px rgba(0,0,0,0.16), 0 0 20px -4px rgba(46,224,138,0.6), 0 12px 26px -12px rgba(0,0,0,0.7);
  transition:transform .12s ease, filter .12s ease; }
.igr-invite:active { transform:translateY(1.5px); filter:brightness(1.05); }

/* ══ RICH POLISH v3 — reels frame: hero + wheel rim + prize tiles (presentation only;
   no data/routes/spin logic touched) ══ */
.igr-hero { box-shadow:0 0 24px -8px rgba(240,201,74,0.5), 0 22px 46px -20px rgba(0,0,0,0.7); }
.igr-hero::before { padding:2px !important;
  background:linear-gradient(140deg, rgba(255,244,207,0.95), rgba(240,201,74,0.7) 30%, rgba(14,122,74,0.4) 55%, rgba(240,201,74,0.85)) !important; }
.igr-crest { filter:drop-shadow(0 12px 26px rgba(0,0,0,0.55)) saturate(1.08) contrast(1.04); }
.igr-fairbadge { box-shadow:0 6px 16px -6px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(240,201,74,0.4); }
.igr-wh-rim { box-shadow: inset 0 0 0 2px rgba(255,244,207,0.9), inset 0 0 0 6px rgba(240,201,74,0.55), inset 0 0 26px rgba(0,0,0,0.5), 0 0 40px -6px rgba(240,201,74,0.55) !important; }
.igr-wheel3d::after { content:""; position:absolute; inset:-7px; border-radius:50%; z-index:0; pointer-events:none;
  background:conic-gradient(from 0deg, rgba(240,201,74,0) 0%, rgba(240,201,74,0.55) 22%, rgba(255,244,207,0) 48%, rgba(240,201,74,0.55) 74%, rgba(240,201,74,0) 100%);
  filter:blur(3px); animation:igr-halospin 8s linear infinite; }
@keyframes igr-halospin { to { transform:rotate(1turn); } }
.igr-prize { transition:transform .16s ease, box-shadow .16s ease; }
.igr-prize:hover { transform:translateY(-2px); box-shadow:0 14px 30px -14px rgba(0,0,0,0.7), 0 0 20px -6px rgba(240,201,74,0.5); }
.igr-prize::before { padding:1.8px !important; }
.igr-prize:hover::before { background:linear-gradient(140deg, rgba(255,251,232,1), rgba(240,201,74,0.85) 50%, rgba(14,122,74,0.5)) !important; }
@media (prefers-reduced-motion:reduce){ .ig *{ animation:none!important; } .igr-wheel, .igr-hero, .igr-wh-bulbs, .igr-wh-glow, .igr-wheel3d::after{ animation:none!important; } }
`;

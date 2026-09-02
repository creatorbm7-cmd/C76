// V2Wheel — the C74 REELS page (/v3/rewards/wheel; /v2/wheel redirects here).
// EARN MODE: mounts the real, server-authoritative C74Reel (premium vertical reel
// machine) — spins call the SAME c74_wheel_spin() RPC, which debits the spin cost,
// picks a weighted prize and credits C74, returning the winning prize index so the
// three reels land 3-of-a-kind on it. Entirely inside the C74 reward ledger — NO
// money path, no house-cash liability.
//
// The page chrome (header, prize legend, refer CTA) is presentation; the reels are
// live. Balance + spin cost are shown inside C74Reel. Animations are transform/
// opacity/filter and honor prefers-reduced-motion.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Gift, Coins, ShieldCheck } from "lucide-react";
import C7Icon, { type C7IconName } from "@/components/c7/C7Icon";
import { useAppAssets } from "@/hooks/useAppAssets";
import C74Reel from "@/components/c7/C74Reel";
import C74DailyFreeSpin from "@/components/c7/C74DailyFreeSpin";
import C74WinBurst from "@/components/c7/C74WinBurst";
import C74QaDebug from "@/components/c7/C74QaDebug";

// Prize tiers — index-aligned with c74_wheel_spin() / C74Wheel PRIZES
// (50·100·150·200·300·500·1000·3000 C74; index 7 is the jackpot).
const PRIZES: { ic: C7IconName; l: string; t: string }[] = [
  { ic: "coin", l: "50", t: "C74" },
  { ic: "coin", l: "100", t: "C74" },
  { ic: "coin", l: "150", t: "C74" },
  { ic: "coin", l: "200", t: "C74" },
  { ic: "coins", l: "300", t: "C74" },
  { ic: "gem", l: "500", t: "C74" },
  { ic: "crown", l: "1,000", t: "C74" },
  { ic: "star", l: "3,000", t: "JACKPOT" },
];

export default function V2Wheel() {
  const nav = useNavigate();
  const art = useAppAssets();
  const heroSrc = art["reels.hero"] ?? "/icons/v2/jackpot-lotto.jpg";
  const [burst, setBurst] = useState<{ amount: number; jackpot: boolean } | null>(null);

  return (
    <div className="v2wh">
      <style>{CSS}</style>
      <div className="v2wh-bg" aria-hidden="true" />

      <header className="v2wh-top">
        <button className="c7p-pg-back" onClick={() => nav("/v3/rewards")} aria-label="Back"><ArrowLeft size={18} /></button>
        <div className="v2wh-toptx">C74 Reels</div>
      </header>

      <main className="v2wh-main">
        {/* Brand lockup — premium rendered C74 REELS hero art (dragon · lion · 777 ·
            C74 emblem · banner · tagline). Pure decorative chrome; if the image is
            unbound/fails it drops to the metallic-gold CSS wordmark below. */}
        <div className="v2wh-hero">
          <img
            className="v2wh-hero-img"
            src={heroSrc}
            alt="C74 Reels — spin, match, win"
            decoding="async"
            fetchPriority="high"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (fb) fb.style.display = "block";
            }}
          />
          <div className="v2wh-brand" style={{ display: "none" }}>
            <div className="v2wh-brand-tt">C74 REELS</div>
            <div className="v2wh-brand-sub">SPIN&nbsp;•&nbsp;MATCH&nbsp;•&nbsp;WIN</div>
          </div>
        </div>

        {/* 🎰 Daily Free Spin — 0-cost retention faucet (once per 24h) */}
        <C74DailyFreeSpin />

        {/* live info strip — real cost/balance are shown inside the wheel */}
        <div className="v2wh-strip">
          <div className="v2wh-chip"><Coins size={13} /> Spend <b>C74</b> to spin</div>
          <div className="v2wh-chip">Win up to <b>3,000</b></div>
          <div className="v2wh-chip v2wh-chip-g"><Sparkles size={13} /> <b>8</b> prize tiers</div>
        </div>

        {/* 💎 Premium reel machine — LIVE (c74_wheel_spin); jackpot triggers the burst */}
        <section className="v2wh-stage">
          <span className="v2wh-k"><C7Icon name="gem" size={12} /> PREMIUM REELS · WIN UP TO 3,000 C74</span>
          <C74Reel onWin={(amount, isJackpot) => { if (isJackpot) setBurst({ amount, jackpot: true }); }} />
          <p className="v2wh-sub"><ShieldCheck size={12} /> 100% Provably Fair · server-verified</p>
        </section>

        {/* prize legend */}
        <div className="v2wh-legend">
          {PRIZES.map((p, i) => (
            <div key={p.l} className="v2wh-prize" style={{ animationDelay: `${i * 55}ms` }}>
              <span className="v2wh-prize-ic"><C7Icon name={p.ic} size={22} /></span>
              <div className="v2wh-prize-l">{p.l}</div>
              <div className="v2wh-prize-t">{p.t}</div>
            </div>
          ))}
        </div>

        <button className="c7p-btn-green v2wh-refer" onClick={() => nav("/agent")}>
          <Gift size={15} /> Invite friends for extra spins
        </button>
      </main>

      <C74WinBurst show={!!burst} amount={burst?.amount ?? 0} jackpot={burst?.jackpot ?? false} onDone={() => setBurst(null)} />
      <C74QaDebug onTrigger={(amount, jackpot) => setBurst({ amount, jackpot })} />
    </div>
  );
}

const CSS = `
.v2wh { position: relative; min-height: 100dvh; color: #eaffe0; font-family: inherit; padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px)); overflow: hidden; }
.v2wh-bg { position: fixed; inset: 0; z-index: -1;
  background: radial-gradient(120% 65% at 50% -8%, rgba(246,201,69,0.12), transparent 58%), radial-gradient(110% 55% at 50% 0%, rgba(46,224,138,0.11), transparent 60%), linear-gradient(172deg, #0d3d28 0%, #072517 46%, #04160d 100%); }
.v2wh-top { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: 10px; padding: 14px 14px 10px;
  background: linear-gradient(180deg, rgba(4,18,11,0.92), rgba(4,18,11,0.45)); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.v2wh-toptx { flex: 1; font-size: 16px; font-weight: 900; letter-spacing: 0.4px; }
.v2wh-main { max-width: 560px; margin: 0 auto; padding: 4px 14px 0; }
/* Premium rendered hero — bleeds slightly past the padded main and fades into the
   emerald ground at the bottom so the rectangular render has no hard seam. */
.v2wh-hero { position: relative; margin: 2px -14px 6px; }
.v2wh-hero-img { display: block; width: 100%; height: auto; -webkit-user-drag: none; user-select: none;
  -webkit-mask-image: linear-gradient(180deg, #000 0, #000 86%, transparent 100%);
          mask-image: linear-gradient(180deg, #000 0, #000 86%, transparent 100%);
  filter: drop-shadow(0 12px 26px rgba(0,0,0,0.55)); }
.v2wh-brand { text-align: center; margin: 6px auto 12px; }
.v2wh-brand-tt { font-size: clamp(30px, 10vw, 44px); font-weight: 900; letter-spacing: 2px; line-height: 1;
  background-image: linear-gradient(180deg, #fff4c4 0%, #f6c945 32%, #b8891f 62%, #f7db7e 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;
  filter: drop-shadow(0 3px 10px rgba(0,0,0,0.55)) drop-shadow(0 0 20px rgba(246,201,69,0.35)); }
.v2wh-brand-sub { margin-top: 8px; font-size: 11px; font-weight: 900; letter-spacing: 3px; color: #bff0d4;
  text-shadow: 0 1px 8px rgba(46,224,138,0.4); }

.v2wh-strip { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin: 6px 0 12px; }
.v2wh-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 800; color: #c9f6e0;
  padding: 7px 11px; border-radius: 999px; background: rgba(46,224,138,0.08); border: 1px solid rgba(246,201,69,0.24); }
.v2wh-chip b { color: #ecfff3; }
.v2wh-chip-g { border-color: rgba(230,196,90,0.5); background: rgba(230,196,90,0.08); color: #f0e2a8; }
.v2wh-chip-g b { color: #ffe27a; }

.v2wh-stage { position: relative; overflow: hidden; border-radius: 22px; padding: 20px 14px 18px; text-align: center;
  border: 2px solid transparent; border-image: linear-gradient(150deg, #0c4a2e, #2ee08a 26%, #0f7a4a 52%, #d3ffe8 74%, #0c4a2e) 1;
  background: radial-gradient(120% 90% at 50% -18%, rgba(246,201,69,0.24), transparent 54%), radial-gradient(95% 78% at 50% 118%, rgba(46,158,31,0.4), transparent 66%), linear-gradient(160deg, #0f4429, #06210f 60%, #02100a);
  box-shadow: 0 24px 54px -18px rgba(0,0,0,0.88), 0 0 60px -12px rgba(46,224,138,0.5), inset 0 1px 0 rgba(200,255,225,0.28); }
.v2wh-k { font-size: 11px; font-weight: 900; letter-spacing: 1.6px; color: #c0ffdb; }
.v2wh-sub { display: inline-flex; align-items: center; gap: 5px; margin: 8px 0 0; font-size: 10px; font-weight: 800; color: rgba(205,238,176,0.8); }

.v2wh-legend { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-top: 14px; }
.v2wh-prize { text-align: center; border-radius: 15px; padding: 13px 6px; animation: v2wh-in .5s ease both;
  background: linear-gradient(160deg, #10240c, #081f0c); border: 1.5px solid transparent;
  border-image: linear-gradient(150deg, #0c4a2e, #2ee08a 40%, #0f7a4a) 1;
  box-shadow: 0 10px 20px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(200,255,225,0.18); }
.v2wh-prize-ic { font-size: 26px; line-height: 1; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5)); }
.v2wh-prize-l { margin-top: 6px; font-size: 13px; font-weight: 900; color: #ecfff3; }
.v2wh-prize-t { font-size: 8.5px; font-weight: 800; letter-spacing: 1px; color: #2ee08a; margin-top: 2px; }
@keyframes v2wh-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

.v2wh-refer { width: 100%; margin-top: 14px; font-size: 13px; }

@media (prefers-reduced-motion: reduce) { .v2wh-prize { animation: none; } }
`;

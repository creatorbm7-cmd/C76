// V2 Game Detail & Launch — rich detail page at /v3/game/:id.
//
// Uses the REAL 2J catalog (useV2Catalog → same source the lobby uses): finds
// the game by its uid, renders a premium HDR detail (hero art, provider/RTP/
// volatility, description, a "similar games" rail), and launches
// the REAL game via V2GameLauncher (reuses launchProviderGame verbatim — no new
// 2J API, no wallet/payment). Presentation extras (volatility/paylines/bet
// range) are deterministic per uid. V1 untouched.

import { useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Play, Sparkles, Star, Zap, Layers, Coins } from "lucide-react";
import C7Icon from "@/components/c7/C7Icon";
import { useV2Catalog, makeBadger, rtpOf, gameArt, type CatalogGame, type V2Badge } from "./v2catalog";
import V2GameArt from "./V2GameArt";
import V2GameCard from "./V2GameCard";
import { V2_CARD_CSS } from "./v2CardCss";
import V2GameLauncher from "./V2GameLauncher";
import { useAppAssets } from "@/hooks/useAppAssets";

const BADGE_TONE: Record<V2Badge, string> = {
  HOT: "linear-gradient(180deg,#ff7ab0,#e11d48)",      // pink → crimson red
  NEW: "linear-gradient(180deg,#f6c945,#12a04f)",      // emerald
  JACKPOT: "linear-gradient(180deg,#ffe9a8,#f6c945)",  // gold
};

// Deterministic presentation-only extras (no such fields in the catalog data).
function detailFor(uid: string) {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  const vol = ["Low", "Medium", "High"][h % 3];
  const lines = [10, 20, 25, 40, 243][(h >> 3) % 5];
  const maxBet = [50, 100, 200, 500][(h >> 5) % 4];
  return { vol, lines, maxBet };
}

export default function V2GameDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  // Context-aware nav: keep games inside the /ig experience when opened from there
  // (back → /ig/explore, sibling games → /ig/game/:id); classic /v3 unchanged.
  const inIg = useLocation().pathname.startsWith("/ig");
  const backTo = inIg ? "/ig/explore" : "/v3";
  const gameBase = inIg ? "/ig/game/" : "/v3/game/";
  const rootCls = inIg ? "v6 v6-ig" : "v6"; // light theme under /ig; /v3 unchanged
  const { games, loading } = useV2Catalog();
  const assets = useAppAssets();
  const [playing, setPlaying] = useState(false);

  const game = useMemo(() => games.find((g) => g.uid === id), [games, id]);
  const badger = useMemo(() => makeBadger(games), [games]);
  const similar = useMemo(
    () => (game ? games.filter((g) => g.category === game.category && g.uid !== game.uid).slice(0, 8) : []),
    [games, game]
  );

  if (loading) {
    return (
      <div className={rootCls}><style>{V6_CSS}</style><div className="v6-bg" aria-hidden="true" />
        <header className="v6-top">
          <button className="v6-back" onClick={() => nav(backTo)} aria-label="Back to lobby"><ArrowLeft size={18} /></button>
          <div className="v6-toptx">Game</div>
          <span className="v6-badge"><Sparkles size={10} /> C7</span>
        </header>
        <main className="v6-main" aria-busy="true">
          <div className="c7p-skel c7p-skel--card v6-sk-hero" />
          <div className="v6-sk-head">
            <div className="c7p-skel c7p-skel--line v6-sk-title" />
            <div className="c7p-skel c7p-skel--line v6-sk-sub" />
          </div>
          <div className="v6-sk-info">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="c7p-skel v6-sk-tile" />)}
          </div>
          <div className="c7p-skel c7p-skel--line v6-sk-line" />
          <div className="c7p-skel c7p-skel--line v6-sk-line v6-sk-line--short" />
        </main>
      </div>
    );
  }
  if (!game) {
    return (
      <div className={`${rootCls} v6-missing`}><style>{V6_CSS}</style>
        <p>Game not found.</p>
        <button className="v6-cta v6-cta-sm" onClick={() => nav(backTo)}>Back to lobby</button>
      </div>
    );
  }

  const badge = badger(game, 0);
  const rtp = rtpOf(game.uid);
  const { vol, lines, maxBet } = detailFor(game.uid);
  const INFO = [
    { k: "RTP", v: `${rtp}%`, icon: <Star size={13} /> },
    { k: "Volatility", v: vol, icon: <Zap size={13} /> },
    { k: "Paylines", v: String(lines), icon: <Layers size={13} /> },
    { k: "Max bet", v: `$${maxBet}`, icon: <Coins size={13} /> },
  ];

  return (
    <div className={rootCls}>
      <style>{V6_CSS}</style>
      <style>{V2_CARD_CSS}</style>
      <div className="v6-bg" aria-hidden="true" />

      <header className="v6-top">
        <button className="v6-back" onClick={() => nav(backTo)} aria-label="Back to lobby"><ArrowLeft size={18} /></button>
        <div className="v6-toptx" title={game.name}>{game.name}</div>
        <span className="v6-badge"><Sparkles size={10} /> C7</span>
      </header>

      <main className="v6-main">
        {/* HDR hero art — procedural base + bound art / thumbnail overlay */}
        <section className="v6-hero">
          <V2GameArt game={game} />
          {/* Blurred-cover fill of the same art — fills any transparent/letterbox
              area of the crisp poster so the procedural glyph never shows through. */}
          <img
            className="v6-hero-bg"
            src={gameArt(assets, game.uid)}
            alt=""
            aria-hidden="true"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          <img
            className="v6-hero-img"
            src={gameArt(assets, game.uid)}
            alt={game.name}
            onError={(e) => {
              const t = e.currentTarget;
              if (!t.dataset.f && game.thumbnail) { t.dataset.f = "1"; t.src = game.thumbnail; }
              else { t.style.display = "none"; }
            }}
          />
          <div className="v6-hero-gloss" aria-hidden="true" />
          {badge && (assets[`v2.badge.${badge.toLowerCase()}`]
            ? <img className="v6-hero-badge v6-hero-badge--img" src={assets[`v2.badge.${badge.toLowerCase()}`]} alt={badge} />
            : <span
                className={`c7p-badge${badge === "HOT" ? " c7p-badge--hot" : badge === "NEW" ? " c7p-badge--new" : ""}`}
                style={badge === "JACKPOT" ? { background: BADGE_TONE.JACKPOT, color: "#2a1608" } : undefined}
              >{badge}</span>)}
        </section>

        <div className="v6-head">
          <div><h1 className="v6-name">{game.name}</h1><div className="v6-prov">{game.provider}</div></div>
          <div className="v6-tags"><span className="v6-tag"><span className="v6-2j">C74</span> {game.category}</span></div>
        </div>

        <section className="v6-info">
          {INFO.map((r) => (
            <div key={r.k} className="v6-info-c c7p-panel"><span className="v6-info-ic">{r.icon}</span><span className="v6-info-v">{r.v}</span><span className="v6-info-k">{r.k}</span></div>
          ))}
        </section>

        <p className="v6-desc c7p-glass">Play <b>{game.name}</b> by {game.provider} — a premium {game.category} experience. Launches the real provider game in a fullscreen frame. Sign in to play for real.</p>

        {similar.length > 0 && (
          <>
            <div className="v6-sec c7p-sec">
              <span className="c7p-sec-ic"><C7Icon name="star" size={16} /></span>
              <span className="c7p-sec-t">More {game.category} games</span>
              <i className="c7p-sec-rule" aria-hidden="true" />
            </div>
            <div className="v6-simrail">
              {similar.map((g, i) => (
                <div key={g.uid} className="v6-simcard">
                  <V2GameCard game={g} assets={assets} badge={badger(g, i)} index={i} onPlay={(sg: CatalogGame) => nav(`${gameBase}${sg.uid}`)} />
                </div>
              ))}
            </div>
          </>
        )}

        <div className="v6-foot"><Sparkles size={11} /> C74 Casino · real launch · balances/VIP shown elsewhere are previews</div>
      </main>

      <div className="v6-cta-bar">
        <button className="v6-cta" onClick={() => setPlaying(true)}><Play size={18} /> Play Now</button>
      </div>

      {playing && <V2GameLauncher game={game} onClose={() => setPlaying(false)} />}
    </div>
  );
}

const V6_CSS = `
.v6 { position: relative; min-height: 100vh; color: #eeffdc; font-family: Inter, system-ui, sans-serif; padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px)); background: #0b6b43; }
.v6-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(120% 65% at 50% -8%, rgba(246,201,69,0.12), transparent 58%), radial-gradient(110% 55% at 50% 0%, rgba(46,224,138,0.11), transparent 60%), linear-gradient(172deg, #0d3d28 0%, #072517 46%, #04160d 100%); }
.v6-loading { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 60vh; font-size: 13px; font-weight: 800; color: #c8f79a; }
.v6-spin { animation: v6-rot 1s linear infinite; } @keyframes v6-rot { to { transform: rotate(360deg); } }
.v6-missing { display: grid; place-content: center; gap: 14px; text-align: center; }
.v6-top { position: sticky; top: 0; z-index: 3; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 16px;
  background: linear-gradient(180deg, rgba(6,24,15,0.9), transparent); }
.v6-back { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; cursor: pointer; color: #d6ffe9; background: rgba(0,0,0,0.35); border: 1px solid rgba(120,240,176,0.28); backdrop-filter: blur(8px); }
.v6-toptx { font-size: 15px; font-weight: 900; }
.v6-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 900; letter-spacing: 1px; padding: 5px 9px; border-radius: 999px; color: #eafff4;
  background: radial-gradient(120% 120% at 50% 0%, rgba(46,224,138,0.28), rgba(255,255,255,0.05)); border: 1px solid rgba(120,240,176,0.36); box-shadow: inset 0 1px 0 rgba(255,255,255,0.16); }
.v6-main { position: relative; z-index: 1; max-width: 560px; margin: 0 auto; padding: 6px 16px; }
.v6-hero { position: relative; overflow: hidden; border-radius: 22px; aspect-ratio: 16/10; margin-top: 4px;
  border: 1.5px solid transparent; border-image: linear-gradient(150deg, #164e0c, #d2fca8 26%, #237a17 52%, #eeffd8 74%, #164e0c) 1;
  box-shadow: 0 22px 46px -18px rgba(0,0,0,0.82), 0 0 26px -10px rgba(46,224,138,0.4), inset 0 1px 0 rgba(255,255,255,0.08); }
.v6-hero-bg { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; object-fit: cover;
  filter: blur(24px) saturate(1.12) brightness(0.7); transform: scale(1.18); pointer-events: none; }
.v6-hero-img { position: absolute; inset: 0; z-index: 2; width: 100%; height: 100%; object-fit: cover; }
.v6-hero-gloss { position: absolute; inset: 0; z-index: 3; pointer-events: none; background: linear-gradient(180deg, rgba(255,255,255,0.18), transparent 30%); }
.v6-hero-badge { position: absolute; top: 12px; left: 12px; z-index: 4; font-size: 10px; font-weight: 900; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 9px; box-shadow: 0 3px 8px rgba(0,0,0,0.4); }
.v6-hero-badge--img { padding: 0; background: none !important; height: 26px; width: auto; object-fit: contain; box-shadow: none; }
.v6-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin: 14px 2px 0; }
.v6-name { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
.v6-prov { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: rgba(214,255,233,0.55); margin-top: 2px; }
.v6-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 800; text-transform: capitalize; padding: 5px 11px; border-radius: 999px; color: #d6ffe9; background: rgba(255,255,255,0.06); border: 1px solid rgba(120,240,176,0.3); }
.v6-2j { font-size: 8px; font-weight: 900; color: #04222a; background: linear-gradient(180deg,#f6c945,#12a04f); padding: 0 4px; border-radius: 5px; }
/* Jackpot banner — surface (frame/ground/glow) comes from .c7p-card-gold */
.v6-jp { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 14px; padding: 16px 14px; }
.v6-jp-rays { position: absolute; inset: -60% -20% auto -20%; height: 200%; pointer-events: none; opacity: 0.42; background: conic-gradient(from 0deg, transparent, rgba(255,231,160,0.3) 10deg, transparent 26deg, rgba(246,201,69,0.28) 44deg, transparent 62deg, rgba(246,201,69,0.26) 80deg, transparent 96deg); animation: v6-spin2 16s linear infinite; }
@keyframes v6-spin2 { to { transform: rotate(360deg); } }
.v6-jp-k { position: relative; z-index: 1; font-size: 11px; font-weight: 900; letter-spacing: 1px; color: #ffd6ef; text-shadow: 0 0 10px rgba(255,231,160,0.5); }
.v6-jp-v { position: relative; z-index: 1; font-size: 21px; font-weight: 900; letter-spacing: 2px; color: #fff; font-variant-numeric: tabular-nums; text-shadow: 0 0 14px rgba(246,201,69,0.55); }
.v6-info { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 14px; }
/* Info tile — surface (ground/hairline/depth) comes from .c7p-panel */
.v6-info-c { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 12px 4px; text-align: center; }
.v6-info-c::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 42%; pointer-events: none; background: linear-gradient(180deg, rgba(255,255,255,0.12), transparent); }
.v6-info-ic { position: relative; color: #b6f7ac; filter: drop-shadow(0 0 6px rgba(46,224,138,0.4)); } .v6-info-v { position: relative; font-size: 13px; font-weight: 900; color: #f2ffe0; } .v6-info-k { position: relative; font-size: 8.5px; font-weight: 700; color: rgba(255,255,255,0.52); text-transform: uppercase; letter-spacing: 0.5px; }
.v6-desc { font-size: 12.5px; line-height: 1.6; color: rgba(214,255,233,0.82); margin: 16px 2px 0; padding: 14px 16px; }
/* Section header — chip/gradient label/rule come from .c7p-sec; keep spacing only */
.v6-sec { margin: 20px 2px 10px; }
/* Loading skeleton — reuses global .c7p-skel primitives, page sizes only */
.v6-sk-hero { aspect-ratio: 16/10; margin-top: 4px; }
.v6-sk-head { display: flex; flex-direction: column; gap: 8px; margin: 16px 2px 0; }
.v6-sk-title { height: 24px; width: 62%; }
.v6-sk-sub { height: 12px; width: 34%; }
.v6-sk-info { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 16px; }
.v6-sk-tile { height: 62px; border-radius: 14px; }
.v6-sk-line { height: 12px; margin: 16px 2px 0; }
.v6-sk-line--short { width: 70%; margin-top: 9px; }
.v6-simrail { display: flex; gap: 10px; overflow-x: auto; padding: 2px 2px 8px; scrollbar-width: none; }
.v6-simrail::-webkit-scrollbar { display: none; }
.v6-simcard { flex: 0 0 108px; }
.v6-foot { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 18px; font-size: 10px; font-weight: 600; color: rgba(214,255,233,0.45); text-align: center; }
.v6-cta-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 5; padding: 14px 16px calc(16px + env(safe-area-inset-bottom, 0px)); background: linear-gradient(180deg, transparent, rgba(4,18,11,0.95) 40%); }
.v6-cta { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; max-width: 528px; margin: 0 auto; border: none; cursor: pointer; font-family: inherit; font-size: 16px; font-weight: 900; color: #052012; padding: 16px; border-radius: 16px;
  background: radial-gradient(120% 100% at 50% 12%, rgba(255,255,255,0.75), transparent 52%), linear-gradient(180deg, #d6ffe9, #39ff88 45%, #00a86b);
  box-shadow: 0 6px 0 #0a5e3a, inset 0 2px 0 rgba(255,255,255,0.8), 0 14px 26px -8px rgba(46,224,138,0.6); transition: transform .08s ease; }
.v6-cta::before { content: ""; position: absolute; top: 0; bottom: 0; left: -55%; width: 38%; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); transform: skewX(-18deg); animation: v6-ctashine 3.6s ease-in-out infinite; }
@keyframes v6-ctashine { 0%,70% { left: -55%; } 100% { left: 130%; } }
.v6-cta > * { position: relative; }
.v6-cta:active { transform: translateY(4px); box-shadow: 0 2px 0 #0a5e3a, inset 0 2px 0 rgba(255,255,255,0.8); }
.v6-cta-sm { max-width: 240px; font-size: 14px; padding: 13px; }
@media (prefers-reduced-motion: reduce) { .v6-jp-rays, .v6-spin, .v6-cta::before { animation: none !important; } }

/* ── /ig light theme — applies ONLY when opened inside the /ig experience (.v6-ig). /v3 keeps the dark theme. ── */
.v6.v6-ig { color: #262626; background: #fafafa; }
.v6-ig .v6-bg { background: radial-gradient(120% 60% at 50% -8%, rgba(10,143,91,0.06), transparent 60%), #fafafa; }
.v6-ig .v6-loading { color: #0a8f5b; }
.v6-ig .v6-top { background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.55)); border-bottom: 1px solid #dbdbdb; }
.v6-ig .v6-back { color: #262626; background: #fff; border: 1px solid #dbdbdb; }
.v6-ig .v6-toptx, .v6-ig .v6-name { color: #262626; }
.v6-ig .v6-badge { color: #0a8f5b; background: #eafff4; border: 1px solid #b7e6cf; box-shadow: none; }
.v6-ig .v6-prov { color: #8e8e8e; }
.v6-ig .v6-tag { color: #0a8f5b; background: #f3f3f3; border: 1px solid #dbdbdb; }
.v6-ig .v6-info-c { background: #fff; border: 1px solid #dbdbdb; box-shadow: none; }
.v6-ig .v6-info-c::before { display: none; }
.v6-ig .v6-info-ic { color: #0a8f5b; filter: none; }
.v6-ig .v6-info-v { color: #262626; }
.v6-ig .v6-info-k { color: #8e8e8e; }
.v6-ig .v6-desc { color: #454545; background: #fff; border: 1px solid #dbdbdb; }
.v6-ig .v6-foot { color: #b0b0b0; }
.v6-ig .v6-cta-bar { background: linear-gradient(180deg, transparent, rgba(250,250,250,0.96) 42%); }
/* ══ RICH POLISH v3 — HD 2J gold frame on the game-detail hero (presentation only;
   no data/routes/logic touched — matches the Explore & Home 2J frames) ══ */
.v6-hero { box-shadow: 0 0 20px -6px rgba(240,201,74,0.40), 0 20px 46px -18px rgba(0,0,0,0.55) !important; }
.v6-hero-img { filter: saturate(1.10) contrast(1.05); }
.v6-hero::after { content:""; position:absolute; inset:0; z-index:3; pointer-events:none; border-radius:22px;
  box-shadow: inset 0 0 0 1.8px rgba(255,242,205,0.92), inset 0 0 0 4px rgba(8,22,14,0.55), inset 0 0 0 6px rgba(240,201,74,0.55), inset 0 0 30px rgba(0,0,0,0.28); }
`;

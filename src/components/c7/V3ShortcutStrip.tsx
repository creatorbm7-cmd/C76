// V3ShortcutStrip — premium 5-tile game-shortcut strip for the V3 Home lobby.
//
// Five real tiles (Gems · Slots · C74 Reels · Missions · Bank), each a live V3
// route with a 3D gold/emerald icon, a bold label and a sub-label — matching the
// reference mockup. Every tile icon is an independently bindable premium slot
// (icon.gems/slots/reels/missions/bank via <C7Asset>) with a C7Icon fallback, so
// dropping in render-quality PNGs upgrades each tile live. The centre tile (C74
// Reels) is featured/elevated. Active state is derived from the path. Keyboard-
// accessible; honors reduced-motion.
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import C7Icon, { type C7IconName } from "@/components/c7/C7Icon";
import C7Asset from "@/components/c7/C7Asset";
import { useAppAssets } from "@/hooks/useAppAssets";

// Static full-tile art (label baked in). Drop transparent PNGs here and they take
// over automatically; if a file is absent the tile falls back to the composed
// icon+label below. A bound `tile.<key>` slot (Admin Studio) overrides both.
const STATIC_TILE: Record<string, string> = {
  gems: "/icons/home/feat-promo.webp",
  slots: "/nav/game.webp",
  reels: "/v2/spin-wheel.png",
  missions: "/nav/events.webp",
  bank: "/nav/bank.webp",
};

type Item = { key: string; slot: string; ic: C7IconName; label: string; sub: string; to: string; match: (p: string) => boolean; featured?: boolean };
const pre = (p: string, ...xs: string[]) => xs.some((x) => p === x || p.startsWith(x + "/"));

const ITEMS: Item[] = [
  { key: "gems",     slot: "icon.gems",     ic: "gem",    label: "Gems",      sub: "Collect",     to: "/v3/games",           match: (p) => pre(p, "/v3/games", "/v3/game", "/play") },
  { key: "slots",    slot: "icon.slots",    ic: "coins",  label: "Slots",     sub: "Spin & Win",  to: "/v3/games?cat=slots", match: () => false },
  { key: "reels",    slot: "icon.reels",    ic: "coin",   label: "C74 Reels", sub: "Match & Win", to: "/v3/rewards/wheel",   match: (p) => pre(p, "/v3/rewards/wheel"), featured: true },
  { key: "missions", slot: "icon.missions", ic: "target", label: "Missions",  sub: "Earn C74",    to: "/missions",           match: (p) => pre(p, "/missions") },
  { key: "bank",     slot: "icon.bank",     ic: "wallet", label: "Bank",      sub: "Save Fast",   to: "/gullak",             match: (p) => pre(p, "/gullak", "/bank") },
];

function ShortcutTile({ it, on, art }: { it: Item; on: boolean; art: Record<string, string> }) {
  const [failed, setFailed] = useState(false);
  // Full-tile art (label baked in) becomes the whole tile; the composed icon+
  // label steps aside. Precedence: bound slot → static PNG → composed fallback.
  const src = art[`tile.${it.key}`] ?? STATIC_TILE[it.key];
  const useImg = !!src && !failed;
  return (
    <Link
      to={it.to}
      className={`v3ns-t${it.featured ? " feat" : ""}${on ? " on" : ""}${useImg ? " img" : ""}`}
      aria-label={`${it.label} — ${it.sub}`}
      aria-current={on ? "page" : undefined}
    >
      {useImg ? (
        <img className="v3ns-full" src={src} alt="" aria-hidden="true" draggable={false} onError={() => setFailed(true)} />
      ) : (
        <>
          <span className="v3ns-crown" aria-hidden="true"><C7Icon name="crown" size={it.featured ? 15 : 13} /></span>
          <span className="v3ns-ic">
            <C7Asset slot={it.slot} size={it.featured ? 44 : 38} fallback={<C7Icon name={it.ic} size={it.featured ? 40 : 34} />} />
          </span>
          <span className="v3ns-l">{it.label}</span>
          <span className="v3ns-s">{it.sub}</span>
          <span className="v3ns-gem" aria-hidden="true"><C7Icon name="gem" size={10} /></span>
          <span className="v3ns-sheen" aria-hidden="true" />
        </>
      )}
    </Link>
  );
}

export default function V3ShortcutStrip() {
  const { pathname } = useLocation();
  const art = useAppAssets();
  return (
    <nav className="v3ns" aria-label="Shortcuts">
      <style>{CSS}</style>
      <div className="v3ns-row">
        {ITEMS.map((it) => <ShortcutTile key={it.key} it={it} on={it.match(pathname)} art={art} />)}
      </div>
    </nav>
  );
}

const CSS = `
.v3ns { margin: 9px 0 12px; }
.v3ns-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; align-items: end; }

.v3ns-t { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 13px 2px 11px; border-radius: 15px; text-decoration: none; overflow: visible;
  background: linear-gradient(178deg, #0f4a2e 0%, #093721 55%, #05230f 100%);
  border: 1.5px solid transparent; -webkit-tap-highlight-color: transparent;
  box-shadow: 0 8px 20px -12px rgba(0,0,0,0.85), inset 0 1px 0 rgba(180,255,214,0.10);
  transition: transform .14s ease, box-shadow .18s ease; }
/* gold hairline frame via mask so it never washes the fill */
.v3ns-t::after { content: ""; position: absolute; inset: 0; border-radius: 15px; padding: 1.5px; pointer-events: none;
  background: linear-gradient(180deg, #ffe6a2, #b8860b 62%, #6c4a08);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; opacity: .75; }
.v3ns-t:active { transform: scale(0.95); }
.v3ns-t:focus-visible { outline: 2px solid #ffd24d; outline-offset: 2px; }

.v3ns-ic { display: grid; place-items: center; height: 42px; filter: drop-shadow(0 3px 4px rgba(0,0,0,0.45)); }
.v3ns-l { font-size: 11.5px; font-weight: 900; letter-spacing: .1px; line-height: 1.05; text-align: center; max-width: 100%;
  background: linear-gradient(180deg, #fff4c4, #f6c945 55%, #d69a1e); -webkit-background-clip: text; background-clip: text; color: transparent; }
.v3ns-s { font-size: 6.8px; font-weight: 800; letter-spacing: .2px; text-transform: uppercase; color: #37e29a; line-height: 1; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
/* crown-on-top + gem-at-bottom accents (match the reference tile art) */
.v3ns-crown { position: absolute; top: -7px; left: 50%; transform: translateX(-50%); z-index: 3; filter: drop-shadow(0 1px 1.5px rgba(0,0,0,0.55)); }
.v3ns-gem { position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); z-index: 3; filter: drop-shadow(0 1px 1.5px rgba(0,0,0,0.55)); }

/* Featured centre tile — elevated, brighter gold, lit like the reference. */
.v3ns-t.feat { padding-top: 14px; transform: translateY(-6px);
  background: linear-gradient(178deg, #1a6a40 0%, #0c4c2c 55%, #063a20 100%);
  box-shadow: 0 12px 26px -12px rgba(0,0,0,0.9), 0 0 22px -6px rgba(246,201,69,0.6), inset 0 1px 0 rgba(200,255,225,0.16); }
.v3ns-t.feat::after { opacity: 1; padding: 2px; background: linear-gradient(180deg, #fff4c4, #f6c945 60%, #9a6a0a); }
.v3ns-t.feat .v3ns-l { font-size: 11.5px; }
.v3ns-t.feat:active { transform: translateY(-6px) scale(0.95); }

/* Active route: living emerald+gold glow. */
.v3ns-t.on { box-shadow: 0 10px 24px -12px rgba(0,0,0,0.9), 0 0 20px -3px rgba(46,224,138,0.85), inset 0 0 0 1px rgba(255,226,122,0.6); animation: v3ns-pulse 2.2s ease-in-out infinite; }
.v3ns-t.on::after { opacity: 1; }

/* soft sheen glide on the featured tile only (keeps the strip calm). */
.v3ns-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0; overflow: hidden; border-radius: 15px; }
.v3ns-t.feat .v3ns-sheen { opacity: 1; }
.v3ns-t.feat .v3ns-sheen::before { content: ""; position: absolute; top: -30%; height: 160%; width: 40%; left: -50%;
  background: linear-gradient(105deg, transparent, rgba(255,255,255,0.22) 46%, rgba(255,236,170,0.32) 50%, rgba(255,255,255,0.22) 54%, transparent);
  transform: skewX(-16deg); animation: v3ns-sweep 5.4s ease-in-out infinite; }

@keyframes v3ns-sweep { 0% { left: -50%; } 60%, 100% { left: 140%; } }
@keyframes v3ns-pulse {
  0%, 100% { box-shadow: 0 10px 24px -12px rgba(0,0,0,0.9), 0 0 16px -3px rgba(46,224,138,0.6), inset 0 0 0 1px rgba(255,226,122,0.5); }
  50%      { box-shadow: 0 10px 24px -12px rgba(0,0,0,0.9), 0 0 26px 0 rgba(46,224,138,0.95), inset 0 0 0 1px rgba(255,244,180,0.9); }
}
/* Full-tile art mode — the bound PNG (label baked in) IS the tile. */
.v3ns-t.img { padding: 0; background: none; border: 0; box-shadow: none; overflow: visible; }
.v3ns-t.img::after { display: none; }
.v3ns-full { width: 100%; height: auto; display: block; border-radius: 13px; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5)); }
.v3ns-t.img.on { box-shadow: none; animation: none; }
.v3ns-t.img.on .v3ns-full { outline: 2px solid rgba(255,226,122,0.9); outline-offset: -2px; border-radius: 13px; }
@media (max-width: 380px) { .v3ns-l { font-size: 11px; } .v3ns-s { font-size: 7px; letter-spacing: .5px; } }
@media (prefers-reduced-motion: reduce) { .v3ns-t, .v3ns-t.on, .v3ns-t.feat .v3ns-sheen::before { animation: none; } .v3ns-t { transition: none; } }
`;

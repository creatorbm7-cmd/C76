// C7BottomNav — the persistent premium bottom tab bar for the V3 user app.
//
// Five primary destinations (Home · Games · Rewards · Wallet · Profile), each
// with a custom 3D gold/emerald cartoon icon. Pure presentation + routing: it
// renders <Link>s to real, existing routes and derives the active tab from the
// path. Hidden on auth/admin/launcher/legal routes (see HIDE). Pages already
// reserve bottom padding (PageShell / c7Sys pagePad), so this never overlaps.
// Honors safe-area insets and prefers-reduced-motion.
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import C7Asset from "@/components/c7/C7Asset";
import { useAppAssets } from "@/hooks/useAppAssets";

// Static full-bar art (transparent). Drop a PNG here and it takes over the whole
// bar; if absent, the composed tab bar shows. A bound `nav.bar` slot overrides.
const STATIC_BAR = "/images/v3/nav/nav-bar.png";

type Tab = { key: string; label: string; sub?: string; to: string; match: (p: string) => boolean; Icon: (a: boolean) => JSX.Element; featured?: boolean };

const pre = (p: string, ...xs: string[]) => xs.some((x) => p === x || p.startsWith(x + "/"));

// Shared gold + emerald gradients (one <defs>, referenced by every icon).
const Defs = () => (
  <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
    <defs>
      <linearGradient id="c7bn-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fff3c8" /><stop offset="52%" stopColor="#f6c945" /><stop offset="100%" stopColor="#c8880f" />
      </linearGradient>
      <linearGradient id="c7bn-emer" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8ff3bd" /><stop offset="100%" stopColor="#0e7a4a" />
      </linearGradient>
    </defs>
  </svg>
);

const G = "url(#c7bn-gold)";
const E = "url(#c7bn-emer)";
const OUTL = "#4a3206";
const sw = 1.4;

// ── 3D cartoon glyphs (28×28), chunky + rounded, gold body + emerald accents ──
const HomeIcon = () => (
  <svg viewBox="0 0 28 28" className="c7bn-svg" aria-hidden="true">
    <path d="M14 3.5 3.5 12.5v11a1.5 1.5 0 0 0 1.5 1.5h17a1.5 1.5 0 0 0 1.5-1.5v-11z" fill={G} stroke={OUTL} strokeWidth={sw} strokeLinejoin="round" />
    <rect x="11" y="16.5" width="6" height="8.5" rx="1.2" fill={E} stroke={OUTL} strokeWidth={sw} />
    <path d="M6 12 14 5.5 22 12" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const GamesIcon = () => (
  <svg viewBox="0 0 28 28" className="c7bn-svg" aria-hidden="true">
    <rect x="4" y="5.5" width="20" height="17" rx="4" fill={G} stroke={OUTL} strokeWidth={sw} />
    <rect x="7" y="9" width="14" height="8.5" rx="2" fill="#08301d" stroke="#063f27" strokeWidth="1" />
    <circle cx="10.5" cy="13.2" r="1.7" fill={E} /><circle cx="14" cy="13.2" r="1.7" fill="#ffd24d" /><circle cx="17.5" cy="13.2" r="1.7" fill={E} />
    <rect x="11.5" y="20" width="5" height="3" rx="1" fill={OUTL} opacity="0.5" />
  </svg>
);
const RewardsIcon = () => (
  <svg viewBox="0 0 28 28" className="c7bn-svg" aria-hidden="true">
    <rect x="5" y="12" width="18" height="12" rx="2.5" fill={E} stroke={OUTL} strokeWidth={sw} />
    <rect x="4" y="8.5" width="20" height="5" rx="2" fill={G} stroke={OUTL} strokeWidth={sw} />
    <rect x="12" y="8.5" width="4" height="15.5" fill={G} stroke={OUTL} strokeWidth="1" />
    <path d="M14 8.5C11 5 7.5 5.5 8.5 8.2 9.2 10 12 8.8 14 8.5Z" fill={G} stroke={OUTL} strokeWidth={sw} strokeLinejoin="round" />
    <path d="M14 8.5C17 5 20.5 5.5 19.5 8.2 18.8 10 16 8.8 14 8.5Z" fill={G} stroke={OUTL} strokeWidth={sw} strokeLinejoin="round" />
  </svg>
);
const WalletIcon = () => (
  <svg viewBox="0 0 28 28" className="c7bn-svg" aria-hidden="true">
    <rect x="3.5" y="6.5" width="21" height="15" rx="3.5" fill={G} stroke={OUTL} strokeWidth={sw} />
    <path d="M3.5 11h21v5.5h-6a2.75 2.75 0 0 1 0-5.5z" fill="#b8860b" opacity="0.55" />
    <circle cx="18.5" cy="13.75" r="2.1" fill={E} stroke={OUTL} strokeWidth="1" />
  </svg>
);
const ProfileIcon = () => (
  <svg viewBox="0 0 28 28" className="c7bn-svg" aria-hidden="true">
    <path d="M4.5 24c0-5 4.2-8 9.5-8s9.5 3 9.5 8z" fill={G} stroke={OUTL} strokeWidth={sw} strokeLinejoin="round" />
    <circle cx="14" cy="11" r="5.2" fill={G} stroke={OUTL} strokeWidth={sw} />
    <path d="M9 6.5 10.5 3l1.8 2.2L14 2l1.7 3.2L17.5 3 19 6.5Z" fill={G} stroke={OUTL} strokeWidth="1" strokeLinejoin="round" />
    <circle cx="10.5" cy="3" r="1" fill="#ff5a6a" /><circle cx="14" cy="2" r="1.1" fill="#46c8ff" /><circle cx="17.5" cy="3" r="1" fill={E} />
  </svg>
);

// Featured centre emblem — gold laurel wreath around an emerald C74 coin (the
// reference's "DREAM BIGGER" centrepiece). Fallback for the tab.rewards slot.
const C74Emblem = () => (
  <svg viewBox="0 0 44 44" className="c7bn-emblem" aria-hidden="true">
    {/* laurel wreath — two mirrored branches of gold leaves */}
    <g stroke={OUTL} strokeWidth="0.5">
      {[0,1,2,3,4].map((i) => {
        const t = i / 4, y = 33 - t * 22, x = 7 + t * 3.2 + Math.sin(t * 3) * 1.2, rot = -60 + t * 40;
        return <g key={"l"+i}><ellipse cx={x} cy={y} rx="3" ry="1.5" fill="url(#c7bn-gold)" transform={`rotate(${rot} ${x} ${y})`} /><ellipse cx={44-x} cy={y} rx="3" ry="1.5" fill="url(#c7bn-gold)" transform={`rotate(${-rot} ${44-x} ${y})`} /></g>;
      })}
    </g>
    <circle cx="22" cy="21" r="13.5" fill="url(#c7bn-emer)" stroke={OUTL} strokeWidth="1.4" />
    <circle cx="22" cy="21" r="13.5" fill="none" stroke="url(#c7bn-gold)" strokeWidth="2.6" />
    <path d="M17 10.5 18.5 8l1.6 1.8L22 7.4l1.9 2.4L25.5 8 27 10.5Z" fill="url(#c7bn-gold)" stroke={OUTL} strokeWidth="0.5" strokeLinejoin="round" />
    <text x="22" y="25.5" textAnchor="middle" fontFamily="Arial Black, Arial" fontSize="11" fontWeight="900" fill="url(#c7bn-gold)" stroke={OUTL} strokeWidth="0.4">C74</text>
  </svg>
);

const TABS: Tab[] = [
  { key: "home", label: "Home", to: "/v3", match: (p) => p === "/v3" || p === "/", Icon: HomeIcon },
  { key: "games", label: "Games", to: "/v3/games", match: (p) => pre(p, "/v3/games", "/v3/game", "/play"), Icon: GamesIcon },
  { key: "rewards", label: "Rewards", sub: "Dream Bigger", to: "/v3/rewards", match: (p) => pre(p, "/v3/rewards", "/bonuses", "/missions", "/gullak", "/top", "/agent") || p.startsWith("/c74"), Icon: C74Emblem, featured: true },
  { key: "wallet", label: "Wallet", to: "/v3/wallet", match: (p) => pre(p, "/v3/wallet", "/deposit", "/withdraw", "/transactions"), Icon: WalletIcon },
  { key: "profile", label: "Profile", to: "/v3/profile", match: (p) => pre(p, "/v3/profile", "/settings", "/kyc", "/responsible", "/notifications", "/support", "/telegram"), Icon: ProfileIcon },
];

// Routes where the tab bar must NOT show (auth, admin, legal, immersive launcher,
// and focused action pages that own a fixed bottom CTA — game detail's Play Now,
// KYC's Submit, demo-deposit's Credit — which the nav would otherwise cover).
// NOTE: "/v3/game/" keeps its trailing slash so it matches the detail page but
// NOT the "/v3/games" grid.
const HIDE = ["/login", "/admin", "/privacy", "/terms", "/play", "/v3/game/", "/kyc", "/deposit/demo", "/ig"];

export default function C7BottomNav() {
  const { pathname } = useLocation();
  const art = useAppAssets();
  const [barFailed, setBarFailed] = useState(false);
  if (HIDE.some((h) => pathname === h || pathname.startsWith(h + "/") || pathname.startsWith(h))) return null;

  // Full-bar art mode: `nav.bar` (bound slot → static PNG) becomes the whole bar,
  // with five transparent hotspots overlaid. Falls back to the composed bar if
  // the image is absent.
  const barImg = art["nav.bar"] ?? STATIC_BAR;
  if (barImg && !barFailed) {
    return (
      <nav className="c7bn c7bn--img" aria-label="Primary">
        <style>{CSS}</style>
        <div className="c7bn-imgwrap">
          <img className="c7bn-barimg" src={barImg} alt="" aria-hidden="true" draggable={false} onError={() => setBarFailed(true)} />
          <div className="c7bn-hits">
            {TABS.map((t) => {
              const on = t.match(pathname);
              return <Link key={t.key} to={t.to} className={`c7bn-hit${t.featured ? " feat" : ""}${on ? " on" : ""}`} aria-current={on ? "page" : undefined} aria-label={t.label} />;
            })}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="c7bn" aria-label="Primary">
      <style>{CSS}</style>
      <Defs />
      <div className="c7bn-bar">
        {TABS.map((t) => {
          const on = t.match(pathname);
          return (
            <Link key={t.key} to={t.to} className={`c7bn-i${t.featured ? " feat" : ""}${on ? " on" : ""}`} aria-current={on ? "page" : undefined} aria-label={t.label}>
              <span className={`c7bn-ic${t.featured ? " feat" : ""}`}><C7Asset slot={`tab.${t.key}`} className={t.featured ? "c7bn-embimg" : "c7bn-svg"} fallback={t.Icon(on)} /></span>
              <span className={`c7bn-lb${t.featured ? " feat" : ""}`}>{t.featured ? t.sub : t.label}</span>
              {!t.featured && <span className="c7bn-dot" aria-hidden="true" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const CSS = `
.c7bn { position: fixed; left: 0; right: 0; bottom: 0; z-index: 120; pointer-events: none;
  padding: 0 10px calc(8px + env(safe-area-inset-bottom, 0px)); display: flex; justify-content: center; }
.c7bn-bar { pointer-events: auto; width: 100%; max-width: 460px; display: grid; grid-template-columns: repeat(5, 1fr);
  padding: 7px 6px; border-radius: 20px; position: relative;
  background: linear-gradient(180deg, rgba(14,58,37,0.96), rgba(4,20,12,0.98));
  border: 1.5px solid transparent;
  background-clip: padding-box;
  box-shadow: 0 -2px 0 rgba(246,201,69,0.28) inset, 0 12px 30px -10px rgba(0,0,0,0.85), 0 0 24px -10px rgba(246,201,69,0.5);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
.c7bn-bar::before { content: ""; position: absolute; inset: 0; border-radius: 20px; padding: 1.5px; pointer-events: none;
  background: linear-gradient(180deg, #ffe6a2, #b8860b 60%, #6c4a08);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
.c7bn-i { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px 0 2px;
  text-decoration: none; -webkit-tap-highlight-color: transparent; border-radius: 14px; transition: transform .12s ease; }
.c7bn-i:active { transform: scale(0.92); }
.c7bn-ic { display: grid; place-items: center; transition: transform .18s cubic-bezier(.2,.9,.25,1.4); }
.c7bn-svg { width: 26px; height: 26px; display: block; filter: saturate(0.55) brightness(0.72) drop-shadow(0 1px 1px rgba(0,0,0,0.4)); transition: filter .18s ease; }
.c7bn-lb { font-size: 9.5px; font-weight: 800; letter-spacing: 0.3px; color: rgba(205,238,200,0.62); transition: color .18s ease; }
.c7bn-dot { width: 4px; height: 4px; border-radius: 50%; background: #ffd24d; opacity: 0; box-shadow: 0 0 8px 1px rgba(255,210,77,0.9); transition: opacity .18s ease; }
/* active tab */
.c7bn-i.on .c7bn-ic { transform: translateY(-2px); }
.c7bn-i.on .c7bn-svg { filter: saturate(1) brightness(1.06) drop-shadow(0 2px 3px rgba(0,0,0,0.45)) drop-shadow(0 0 8px rgba(246,201,69,0.75)); }
.c7bn-i.on .c7bn-lb { color: #ffe9a8; }
.c7bn-i.on .c7bn-dot { opacity: 1; }
/* Featured centre emblem — rises above the bar (the "DREAM BIGGER" centrepiece). */
.c7bn-i.feat { justify-content: flex-end; }
.c7bn-ic.feat { position: relative; width: 54px; height: 54px; margin-top: -26px; border-radius: 50%;
  display: grid; place-items: center;
  background: radial-gradient(60% 60% at 50% 35%, #0f5231, #052614 100%);
  box-shadow: 0 0 0 2px #05230f, 0 0 0 3.5px rgba(246,201,69,0.95), 0 10px 20px -6px rgba(0,0,0,0.9), 0 0 22px -4px rgba(246,201,69,0.75);
  transition: transform .18s cubic-bezier(.2,.9,.25,1.4), box-shadow .18s ease; }
.c7bn-emblem { width: 46px; height: 46px; display: block; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5)); }
.c7bn-embimg { width: 48px; height: 48px; object-fit: contain; display: block; }
.c7bn-lb.feat { color: #ffe9a8; font-size: 8.5px; letter-spacing: 0.7px; text-transform: uppercase; margin-top: 1px; }
.c7bn-i.feat:active .c7bn-ic.feat { transform: scale(0.93); }
.c7bn-i.feat.on .c7bn-ic.feat { box-shadow: 0 0 0 2px #05230f, 0 0 0 3.5px rgba(255,236,160,1), 0 10px 20px -6px rgba(0,0,0,0.9), 0 0 30px -2px rgba(246,201,69,0.95); }
@media (hover: hover) { .c7bn-i.feat:hover .c7bn-ic.feat { transform: translateY(-2px); } }
@media (hover: hover) { .c7bn-i:hover .c7bn-svg { filter: saturate(0.85) brightness(0.95); } .c7bn-i.on:hover .c7bn-svg { filter: saturate(1) brightness(1.1) drop-shadow(0 0 9px rgba(246,201,69,0.8)); } }
@media (prefers-reduced-motion: reduce) { .c7bn-i, .c7bn-ic, .c7bn-svg, .c7bn-lb, .c7bn-dot { transition: none; } }

/* ── Full-bar art mode (bound nav.bar PNG + transparent hotspots) ─────────── */
/* Height-capped so a tall/ornate bar image never eats the screen; the wrap
   shrinks to the image so the hotspots stay aligned to it. */
.c7bn-imgwrap { pointer-events: auto; position: relative; width: fit-content; max-width: 100%; margin: 0 auto; line-height: 0; }
.c7bn-barimg { display: block; height: 116px; width: auto; max-width: 100%; -webkit-user-drag: none; user-select: none;
  filter: drop-shadow(0 12px 30px -10px rgba(0,0,0,0.85)); }
.c7bn-hits { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(5, 1fr); }
.c7bn-hit { display: block; border-radius: 14px; -webkit-tap-highlight-color: transparent; }
.c7bn-hit.feat { transform: translateY(-14%); }           /* covers the raised centre emblem */
.c7bn-hit:active { transform: scale(0.94); }
.c7bn-hit.feat:active { transform: translateY(-14%) scale(0.94); }
.c7bn-hit:focus-visible { outline: 2px solid #ffd24d; outline-offset: -3px; border-radius: 16px; }
/* Active tab over the static art: a soft gold glow pooled under the painted
   button — never a hard border box (which wouldn't line up with the artwork). */
.c7bn-hit.on { background: radial-gradient(56% 38% at 50% 80%, rgba(255,214,120,0.28), transparent 72%); }
.c7bn-hit.feat.on { background: radial-gradient(52% 44% at 50% 46%, rgba(255,224,150,0.30), transparent 70%); }
`;

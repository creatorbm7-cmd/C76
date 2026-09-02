// IgTabBar — the shared premium bottom navigation: a custom "rich frame" bar.
//
// A compact floating deep-emerald glass bar inside a bright gold gradient frame
// with a green+gold glow, carrying six large 3D round destination icons + gold
// labels (Home · Games · Reels · C74 · Wallet · Profile). The active route's tab
// lifts, brightens and gets a gold halo + indicator. Fully CSS — no baked full-bar
// image, so there is never a transparent-margin gap behind it.
// Presentation only; routes are the real /ig surfaces. Safe-area + reduced-motion safe.
import { Link, useLocation } from "react-router-dom";

type Tab = { key: string; to: string; label: string; icon: string; brand?: boolean };

// Premium round 3D nav badges already in the repo (gold-framed emerald glyphs).
const TABS: Tab[] = [
  { key: "home", to: "/ig", label: "Home", icon: "/icons/v2/nav/home.png" },
  { key: "explore", to: "/ig/explore", label: "Games", icon: "/icons/v2/nav/casino.png" },
  { key: "reels", to: "/ig/reels", label: "Reels", icon: "/v2/spin-wheel.png" },
  { key: "c74", to: "/ig/c74", label: "C74", icon: "/icons/v2/brand-c74.png", brand: true },
  { key: "wallet", to: "/ig/wallet", label: "Wallet", icon: "/icons/v2/nav/wallet.png" },
  { key: "profile", to: "/ig/profile", label: "Profile", icon: "/icons/v2/nav/profile.png" },
];

export default function IgTabBar({ active }: { active: string }) {
  const { pathname } = useLocation();
  // When the current route IS one of the tabs, that tab alone is active — the
  // caller's `active` is a hint for deeper routes, not an override. Without
  // this, /ig/c74 lit both C74 (route match) and Wallet (IgC74 passes
  // active="wallet" so its sub-pages sit under Wallet).
  const routeTab = TABS.find((t) => t.to === pathname);
  const isOn = (t: Tab) => (routeTab ? t.key === routeTab.key : t.key === active);
  return (
    <nav className="ig-nav" aria-label="Primary">
      <style>{CSS}</style>
      <div className="ig-nav-frame">
        {TABS.map((t) => {
          const on = isOn(t);
          return (
            <Link
              key={t.key}
              to={t.to}
              className={`ig-nav-i${on ? " on" : ""}${t.brand ? " brand" : ""}`}
              aria-label={t.label}
              aria-current={on ? "page" : undefined}
            >
              <span className="ig-nav-badge" aria-hidden="true">
                <img src={t.icon} alt="" loading="eager" width={44} height={44} />
              </span>
              <span className="ig-nav-l">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const CSS = `
/* Clearance for the floating bar so no page's content ever hides behind it.
   The frame is ~86px tall and floats 8px above the bottom; on notched phones the
   bar also rides up by the safe-area — so the padding must be frame + offset +
   a comfortable gap + env(safe-area). "body .ig" beats any page's own
   ".ig padding-bottom" regardless of style order. */
body .ig { padding-bottom:calc(112px + env(safe-area-inset-bottom, 0px)); }
.ig-nav { position:fixed; left:0; right:0; z-index:40; pointer-events:none;
  bottom:calc(8px + env(safe-area-inset-bottom,0px));
  padding:0 10px; }
/* Gold gradient frame + green/gold glow around a deep-emerald glass bar. */
.ig-nav-frame { position:relative; pointer-events:auto; display:grid; grid-template-columns:repeat(6,1fr);
  align-items:end; gap:1px; width:100%; max-width:460px; margin:0 auto;
  padding:8px 8px 7px; border-radius:22px;
  background:linear-gradient(180deg, rgba(18,86,56,0.97), rgba(7,34,22,0.98));
  -webkit-backdrop-filter:blur(14px) saturate(1.2); backdrop-filter:blur(14px) saturate(1.2);
  box-shadow:0 0 20px -2px rgba(240,201,74,0.5), 0 0 48px -12px rgba(46,224,138,0.55),
    0 16px 36px -12px rgba(0,0,0,0.86); }
/* bright gold rounded border (mask trick — only the ~1.6px edge is gold) */
.ig-nav-frame::before { content:""; position:absolute; inset:0; border-radius:22px; padding:1.6px; pointer-events:none;
  background:linear-gradient(180deg,#fff3c8,#f0c94a 45%,#c68a2e);
  -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite:xor; mask-composite:exclude; }
/* faint top sheen inside the glass */
.ig-nav-frame::after { content:""; position:absolute; left:8%; right:8%; top:0; height:42%; border-radius:22px 22px 40% 40%;
  background:linear-gradient(180deg, rgba(246,230,176,0.12), transparent); pointer-events:none; }

.ig-nav-i { position:relative; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:2px;
  padding:4px 2px 4px; border-radius:14px; text-decoration:none; -webkit-tap-highlight-color:transparent;
  transition:transform .14s ease, background .16s ease, box-shadow .16s ease; }
.ig-nav-i:active { transform:scale(0.9); }
/* SELECTED tab: a bright emerald-glass highlight box with a gold edge + green glow
   (matches the reference — the whole active cell lights up, not just a marker). */
.ig-nav-i.on { background:radial-gradient(120% 100% at 50% 0%, rgba(74,255,180,0.42), rgba(18,120,74,0.34) 66%, rgba(10,70,44,0.20));
  box-shadow:inset 0 0 0 1.4px rgba(240,201,74,0.72), inset 0 1px 0 rgba(255,255,255,0.30),
    0 0 16px -2px rgba(46,224,138,0.7), 0 0 26px -8px rgba(240,201,74,0.5); }
.ig-nav-badge { display:grid; place-items:center; width:50px; height:50px; }
/* full-shape 3D object icons (chest/slot/wheel/coins/crown/badge) — shown whole,
   never clipped to a circle; soft drop-shadow lifts them off the glass. */
.ig-nav-badge img { width:50px; height:50px; object-fit:contain; display:block;
  filter:saturate(1.08) brightness(1.03) drop-shadow(0 3px 5px rgba(0,0,0,0.55)); opacity:0.96;
  transition:transform .16s ease, opacity .16s ease, filter .16s ease; }
.ig-nav-i.brand .ig-nav-badge, .ig-nav-i.brand .ig-nav-badge img { width:50px; height:50px; }
/* Rich glamorous label: deep-gold engraved gradient with a bright top sheen, dark
   emboss below + a faint gold halo (drop-shadow, since the fill is clipped text). */
.ig-nav-l { font-size:11px; font-weight:800; letter-spacing:0.4px; line-height:1;
  background:linear-gradient(180deg,#fff8dc 0%,#ffe9a3 34%,#f0c94a 62%,#c68a2e 100%);
  -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent;
  opacity:0.9; filter:drop-shadow(0 1px 0 rgba(0,0,0,0.55)) drop-shadow(0 0 5px rgba(240,201,74,0.3)); }

/* SELECTED: icon lifts + full brightness + gold halo; label full gold; top marker. */
.ig-nav-i.on .ig-nav-badge img { opacity:1; transform:translateY(-3px) scale(1.16);
  filter:saturate(1.12) brightness(1.05)
    drop-shadow(0 0 10px rgba(240,201,74,0.75)) drop-shadow(0 0 16px rgba(46,224,138,0.45))
    drop-shadow(0 4px 6px rgba(0,0,0,0.55)); }
.ig-nav-i.on .ig-nav-l { opacity:1;
  filter:drop-shadow(0 1px 0 rgba(0,0,0,0.6)) drop-shadow(0 0 8px rgba(240,201,74,0.7)) drop-shadow(0 0 14px rgba(46,224,138,0.4)); }
.ig-nav-i.on::before { content:""; position:absolute; top:-1px; width:26px; height:3px; border-radius:0 0 5px 5px;
  background:linear-gradient(90deg,#37e29a,#f5cf55); box-shadow:0 0 12px 1px rgba(240,201,74,0.85); }

@media (prefers-reduced-motion:reduce){ .ig-nav-i, .ig-nav-badge img { transition:none; } }
`;

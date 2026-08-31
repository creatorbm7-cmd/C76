// C7Icon — the shared premium 3D gold/emerald glyph set for the V3 user app.
//
// Replaces flat emoji across pages with consistent, art-directed inline-SVG
// icons: metallic-gold bodies, emerald accents, dark cartoon outline, soft
// gloss + rim light, single top-left light source. Pure presentation.
//
// Usage:  <C7Icon name="trophy" size={18} />
// A `tone="emerald"` variant flips the metal to emerald for muted contexts.
import { CSSProperties } from "react";

// One shared <defs> for all icons (rendered once, near the app root via <C7IconDefs/>
// but also self-contained: each icon references these ids which are injected below).
export function C7IconDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute", width: 0, height: 0 }}>
      <defs>
        <linearGradient id="c7i-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff3c8" /><stop offset="48%" stopColor="#f6c945" /><stop offset="100%" stopColor="#c6870d" />
        </linearGradient>
        <linearGradient id="c7i-golddk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e9b73a" /><stop offset="100%" stopColor="#9a6a0a" />
        </linearGradient>
        <linearGradient id="c7i-emer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9ff6c6" /><stop offset="50%" stopColor="#33d98a" /><stop offset="100%" stopColor="#0c7a49" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const OUT = "#4a3206";
const OUTE = "#063f27";
const sw = 1.3;
const GLOSS = "rgba(255,255,255,0.55)";

// Each glyph is authored on a 24×24 grid. Gold body + emerald accent + outline + gloss.
const P: Record<string, JSX.Element> = {
  coin: (<>
    <circle cx="12" cy="12" r="9.2" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} />
    <circle cx="12" cy="12" r="6.6" fill="none" stroke="#e0a51c" strokeWidth="1.1" />
    <text x="12" y="15" textAnchor="middle" fontFamily="Arial Black, Arial" fontSize="7.4" fontWeight="900" fill="#8a560a">C74</text>
    <path d="M6 8Q12 5 18 8Q14 10.5 12 10.5Q9 10.5 6 8Z" fill={GLOSS} />
  </>),
  coins: (<>
    <ellipse cx="9" cy="15.5" rx="7" ry="4" fill="url(#c7i-golddk)" stroke={OUT} strokeWidth={sw} />
    <ellipse cx="9" cy="13" rx="7" ry="4" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} />
    <ellipse cx="9" cy="13" rx="4" ry="2.1" fill="none" stroke="#e0a51c" strokeWidth="0.9" />
    <circle cx="17" cy="10" r="5.4" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} />
    <text x="17" y="12.2" textAnchor="middle" fontFamily="Arial Black" fontSize="4.4" fontWeight="900" fill="#8a560a">C74</text>
  </>),
  gem: (<>
    <path d="M5 9.5 8 5h8l3 4.5-7 9.5z" fill="url(#c7i-emer)" stroke={OUTE} strokeWidth={sw} strokeLinejoin="round" />
    <path d="M8 5h8l-2 4.5H10z" fill="#bff5d8" opacity="0.55" />
    <path d="M5 9.5h14" stroke={OUTE} strokeWidth="1" /><path d="M12 9.5v9.5" stroke={OUTE} strokeWidth="0.9" />
  </>),
  crown: (<>
    <path d="M3.5 18 5 7l4 5 3-6.5 3 6.5 4-5 1.5 11z" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
    <rect x="4.5" y="17" width="15" height="3.4" rx="1.2" fill="url(#c7i-golddk)" stroke={OUT} strokeWidth={sw} />
    <circle cx="5" cy="6.5" r="1.5" fill="#46c8ff" /><circle cx="12" cy="4.6" r="1.7" fill="#ff5a6a" /><circle cx="19" cy="6.5" r="1.5" fill="#46e08a" />
  </>),
  trophy: (<>
    <path d="M7 4h10v4a5 5 0 0 1-10 0z" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
    <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" fill="none" stroke={OUT} strokeWidth={sw} />
    <rect x="10.5" y="13" width="3" height="4" fill="url(#c7i-golddk)" /><rect x="7" y="17" width="10" height="3" rx="1.2" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} />
    <circle cx="12" cy="8" r="2.3" fill="#ff5a6a" stroke={OUT} strokeWidth="0.9" />
  </>),
  gift: (<>
    <rect x="4.5" y="10" width="15" height="10" rx="1.6" fill="url(#c7i-emer)" stroke={OUTE} strokeWidth={sw} />
    <rect x="3.5" y="7" width="17" height="4" rx="1.4" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} />
    <rect x="10.3" y="7" width="3.4" height="13" fill="url(#c7i-gold)" stroke={OUT} strokeWidth="0.8" />
    <path d="M12 7C9.5 4 6.5 4.4 7.4 6.7 8 8.2 10.4 7.2 12 7Z" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
    <path d="M12 7C14.5 4 17.5 4.4 16.6 6.7 16 8.2 13.6 7.2 12 7Z" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
  </>),
  chest: (<>
    <path d="M4 11q0-4 8-4t8 4v1H4z" fill="url(#c7i-golddk)" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
    <rect x="4" y="11.5" width="16" height="8" rx="1.6" fill="#8a5a2a" stroke={OUT} strokeWidth={sw} />
    <rect x="4" y="13" width="16" height="2.4" fill="url(#c7i-gold)" stroke={OUT} strokeWidth="0.8" />
    <rect x="10.6" y="12.6" width="2.8" height="4" rx="0.8" fill="url(#c7i-gold)" stroke={OUT} strokeWidth="0.9" />
    <path d="M7 8.5q5-2 10 0" fill="none" stroke={GLOSS} strokeWidth="1" strokeLinecap="round" />
  </>),
  medal: (<>
    <path d="M8 3l2 6-2 1-2-6zM16 3l-2 6 2 1 2-6z" fill="url(#c7i-golddk)" stroke={OUT} strokeWidth="0.9" strokeLinejoin="round" />
    <circle cx="12" cy="15" r="6" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} />
    <circle cx="12" cy="15" r="3.4" fill="url(#c7i-emer)" stroke={OUTE} strokeWidth="1" />
    <path d="M7.5 12q4.5-2 9 0" fill="none" stroke={GLOSS} strokeWidth="0.9" strokeLinecap="round" />
  </>),
  shield: (<>
    <path d="M12 3 5 5.5V11c0 5 3.4 8 7 9.5 3.6-1.5 7-4.5 7-9.5V5.5z" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
    <path d="M12 4.5 6.4 6.6v4.4c0 4 2.7 6.4 5.6 7.6 2.9-1.2 5.6-3.6 5.6-7.6V6.6z" fill="url(#c7i-emer)" opacity="0.9" />
    <path d="M9 12l2.2 2.2L15.5 10" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </>),
  chart: (<>
    <rect x="4" y="12" width="4" height="7" rx="1" fill="url(#c7i-emer)" stroke={OUTE} strokeWidth={sw} />
    <rect x="10" y="8" width="4" height="11" rx="1" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} />
    <rect x="16" y="5" width="4" height="14" rx="1" fill="url(#c7i-emer)" stroke={OUTE} strokeWidth={sw} />
  </>),
  gear: (<>
    <path d="M12 2.5l1.4 2.1 2.4-.6.5 2.4 2.4.9-1 2.2 1.6 1.9-1.6 1.9 1 2.2-2.4.9-.5 2.4-2.4-.6L12 21.5l-1.4-2.1-2.4.6-.5-2.4-2.4-.9 1-2.2L3.7 12l1.6-1.9-1-2.2 2.4-.9.5-2.4 2.4.6z" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
    <circle cx="12" cy="12" r="4" fill="url(#c7i-emer)" stroke={OUTE} strokeWidth="1.1" />
    <circle cx="12" cy="12" r="1.7" fill="#053" />
  </>),
  bell: (<>
    <path d="M12 4c-3.5 0-5 2.8-5 6 0 3-1 3.6-1.6 4.6h13.2C17.9 13.6 17 13 17 10c0-3.2-1.5-6-5-6z" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
    <path d="M10 17a2 2 0 0 0 4 0z" fill="url(#c7i-golddk)" stroke={OUT} strokeWidth="1" />
    <rect x="11" y="2.4" width="2" height="2.4" rx="1" fill="url(#c7i-gold)" stroke={OUT} strokeWidth="0.8" />
    <circle cx="17.5" cy="6" r="2.4" fill="#ff4d5e" stroke="#fff" strokeWidth="0.9" />
  </>),
  users: (<>
    <circle cx="9" cy="8.5" r="3.6" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} />
    <path d="M2.5 20c0-3.6 3-5.5 6.5-5.5s6.5 1.9 6.5 5.5z" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
    <circle cx="17" cy="9" r="3" fill="url(#c7i-emer)" stroke={OUTE} strokeWidth="1.1" />
    <path d="M15 14.6c3 .2 6 2 6 5.4h-5" fill="url(#c7i-emer)" stroke={OUTE} strokeWidth={sw} strokeLinejoin="round" />
  </>),
  target: (<>
    <circle cx="12" cy="12" r="9" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} />
    <circle cx="12" cy="12" r="6" fill="#0c3b26" /><circle cx="12" cy="12" r="3.4" fill="url(#c7i-emer)" stroke={OUTE} strokeWidth="1" />
    <circle cx="12" cy="12" r="1.3" fill="#ff5a6a" />
  </>),
  pickaxe: (<>
    <rect x="10.6" y="7" width="2.8" height="13" rx="1.3" transform="rotate(42 12 13)" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} />
    <path d="M4 8Q12 3 20 8Q12 5.6 4 8Z" transform="rotate(42 12 13)" fill="url(#c7i-golddk)" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
    <path d="M9 6l6.5 6.5" transform="rotate(42 12 13)" stroke={GLOSS} strokeWidth="1" strokeLinecap="round" />
  </>),
  wallet: (<>
    <rect x="3.5" y="6" width="17" height="12.5" rx="3" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} />
    <path d="M3.5 10.5h17v4.5h-4.5a2.25 2.25 0 0 1 0-4.5z" fill="url(#c7i-golddk)" opacity="0.7" />
    <circle cx="16" cy="12.75" r="1.7" fill="url(#c7i-emer)" stroke={OUTE} strokeWidth="0.9" />
  </>),
  receipt: (<>
    <path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
    <path d="M8.5 7.5h7M8.5 11h7M8.5 14.5h4.5" stroke="#8a560a" strokeWidth="1.3" strokeLinecap="round" />
  </>),
  link: (<>
    <rect x="3.5" y="9" width="10" height="6" rx="3" fill="none" stroke="url(#c7i-gold)" strokeWidth="2.6" />
    <rect x="10.5" y="9" width="10" height="6" rx="3" fill="none" stroke="url(#c7i-emer)" strokeWidth="2.6" />
  </>),
  gas: (<>
    <rect x="4.5" y="4" width="9" height="16" rx="2" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} />
    <rect x="6.3" y="6" width="5.4" height="4.4" rx="1" fill="#0c3b26" />
    <path d="M13.5 8l2.5 2v7a2 2 0 0 0 2 2 2 2 0 0 0 2-2V11l-3-3" fill="none" stroke="url(#c7i-golddk)" strokeWidth="1.6" strokeLinecap="round" />
  </>),
  star: (<>
    <path d="M12 3l2.6 5.3 5.9.8-4.3 4.1 1 5.8L12 16.2 6.8 19l1-5.8-4.3-4.1 5.9-.8z" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
    <path d="M12 6l1.4 2.9" stroke={GLOSS} strokeWidth="1.1" strokeLinecap="round" />
  </>),
  fire: (<>
    <path d="M12 3c1 3-2 4-2 7 0 1.4.6 2.2 1.2 2.8C10.6 12 10 11 11 9c2 3 5 3.6 5 7a4.6 4.6 0 0 1-9.2 0C6.8 8.5 12 8 12 3z" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
    <path d="M12 12c1.6.6 2.6 1.8 2.6 3.4a2.6 2.6 0 0 1-5.2 0c0-1 .5-1.7 1.1-2.4" fill="url(#c7i-emer)" opacity="0.85" />
  </>),
  rocket: (<>
    <path d="M12 2.5c3.5 2 5 5.5 5 9l-2.5 2.5h-5L7 11.5c0-3.5 1.5-7 5-9z" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
    <circle cx="12" cy="9" r="2" fill="url(#c7i-emer)" stroke={OUTE} strokeWidth="1" />
    <path d="M9.5 14 8 18l2-1 2 2 2-2 2 1-1.5-4z" fill="url(#c7i-golddk)" stroke={OUT} strokeWidth="1" strokeLinejoin="round" />
  </>),
  check: (<>
    <circle cx="12" cy="12" r="9" fill="url(#c7i-emer)" stroke={OUTE} strokeWidth={sw} />
    <path d="M7.5 12.4 10.5 15.4 16.5 8.6" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
  </>),
  calendar: (<>
    <rect x="4" y="5.5" width="16" height="14" rx="2.4" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} />
    <rect x="4" y="5.5" width="16" height="4" rx="2.4" fill="url(#c7i-golddk)" />
    <rect x="7" y="11.5" width="10" height="5.5" rx="1.2" fill="#0c3b26" />
    <circle cx="8" cy="4" r="1.2" fill={OUT} /><circle cx="16" cy="4" r="1.2" fill={OUT} />
  </>),
  bolt: (<>
    <path d="M13 2 5 13h5l-1 9 8-12h-5z" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
  </>),
  ladder: (<>
    <rect x="6" y="3" width="2.6" height="18" rx="1" fill="url(#c7i-gold)" stroke={OUT} strokeWidth="0.9" />
    <rect x="15.4" y="3" width="2.6" height="18" rx="1" fill="url(#c7i-gold)" stroke={OUT} strokeWidth="0.9" />
    <rect x="7" y="6" width="10" height="2.2" fill="url(#c7i-emer)" /><rect x="7" y="11" width="10" height="2.2" fill="url(#c7i-emer)" /><rect x="7" y="16" width="10" height="2.2" fill="url(#c7i-emer)" />
  </>),
  handshake: (<>
    <path d="M2.5 9.5 7 7l5 2 5-2 4.5 2.5-4 6-3-2-3 2-3-2-3 2z" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
    <path d="M9 11l3 2 3-2" fill="none" stroke="#8a560a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </>),
  // cash-out: up-arrow over a gold coin (Withdraw)
  cashout: (<>
    <path d="M12 2.4 8.4 6.4h2.3V11h2.6V6.4h2.3z" fill="url(#c7i-emer)" stroke={OUTE} strokeWidth={sw} strokeLinejoin="round" />
    <ellipse cx="12" cy="17" rx="7.5" ry="4.2" fill="url(#c7i-golddk)" stroke={OUT} strokeWidth={sw} />
    <ellipse cx="12" cy="14.6" rx="7.5" ry="4.2" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} />
    <text x="12" y="16.6" textAnchor="middle" fontFamily="Arial Black, Arial" fontSize="5.4" fontWeight="900" fill="#8a560a">$</text>
  </>),
  // paper plane (Telegram / send)
  send: (<>
    <path d="M21 3 2.6 10.4l6.1 2.3z" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
    <path d="M21 3 8.7 12.7l1.1 6.8L13.2 15z" fill="url(#c7i-golddk)" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
    <path d="M21 3 8.7 12.7" fill="none" stroke={GLOSS} strokeWidth="0.9" strokeLinecap="round" />
  </>),
  // headset (Support)
  headset: (<>
    <path d="M5 13v-1.5a7 7 0 0 1 14 0V13" fill="none" stroke="url(#c7i-gold)" strokeWidth="2.3" strokeLinecap="round" />
    <rect x="3" y="12.2" width="3.8" height="6.4" rx="1.7" fill="url(#c7i-emer)" stroke={OUTE} strokeWidth={sw} />
    <rect x="17.2" y="12.2" width="3.8" height="6.4" rx="1.7" fill="url(#c7i-emer)" stroke={OUTE} strokeWidth={sw} />
    <path d="M19 18.6v.6a3 3 0 0 1-3 3h-2.3" fill="none" stroke={OUT} strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12.6" cy="22.2" r="1.3" fill="url(#c7i-gold)" stroke={OUT} strokeWidth="0.8" />
  </>),
  // classic bank building (Bank / savings)
  bank: (<>
    <path d="M12 2.8 3 7.4h18z" fill="url(#c7i-gold)" stroke={OUT} strokeWidth={sw} strokeLinejoin="round" />
    <circle cx="12" cy="5.4" r="1" fill="url(#c7i-emer)" />
    <rect x="4" y="7.6" width="16" height="1.8" fill="url(#c7i-golddk)" stroke={OUT} strokeWidth="0.8" />
    <rect x="5.4" y="9.8" width="2.4" height="7" fill="url(#c7i-gold)" stroke={OUT} strokeWidth="0.9" />
    <rect x="10.8" y="9.8" width="2.4" height="7" fill="url(#c7i-gold)" stroke={OUT} strokeWidth="0.9" />
    <rect x="16.2" y="9.8" width="2.4" height="7" fill="url(#c7i-gold)" stroke={OUT} strokeWidth="0.9" />
    <rect x="3.5" y="17.2" width="17" height="2.6" rx="0.8" fill="url(#c7i-golddk)" stroke={OUT} strokeWidth={sw} />
  </>),
};

export type C7IconName = keyof typeof P;

export default function C7Icon({ name, size = 20, className, style, title }:
  { name: C7IconName; size?: number; className?: string; style?: CSSProperties; title?: string }) {
  const glyph = P[name] ?? P.star;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} role={title ? "img" : "presentation"} aria-label={title} aria-hidden={title ? undefined : true}
      style={{ display: "inline-block", verticalAlign: "middle", filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,0.4))", ...style }}>
      {/* self-contained gradient defs so the icon renders anywhere without C7IconDefs */}
      <defs>
        <linearGradient id="c7i-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fff3c8" /><stop offset="48%" stopColor="#f6c945" /><stop offset="100%" stopColor="#c6870d" /></linearGradient>
        <linearGradient id="c7i-golddk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e9b73a" /><stop offset="100%" stopColor="#9a6a0a" /></linearGradient>
        <linearGradient id="c7i-emer" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9ff6c6" /><stop offset="50%" stopColor="#33d98a" /><stop offset="100%" stopColor="#0c7a49" /></linearGradient>
      </defs>
      {glyph}
    </svg>
  );
}

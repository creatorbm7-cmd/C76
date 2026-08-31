// IgCrests — bespoke hand-built SVG hero emblems that share the VIP crest's
// premium language (gold gradients, emerald, gems, gold laurel, specular shine).
// Pure vector: crisp at any size, theme-safe, reduced-motion aware (the shine
// animation `.vip-crest-shine` lives in styles/ig-premium.css). Presentation only.
// IDs are prefixed per emblem so multiple crests never collide on one page.

// C74 — an ornate token medal: gold coin bearing "C74", a laurel wreath, a star.
export function C74Crest({ className = "" }: { className?: string }) {
  return (
    <svg className={`vip-crest ${className}`} viewBox="0 0 120 128" width="100%" height="100%" role="img" aria-label="C74" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6d5" /><stop offset=".42" stopColor="#f6d268" /><stop offset=".72" stopColor="#e0aa38" /><stop offset="1" stopColor="#a9741c" /></linearGradient>
        <linearGradient id="cEdge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe9a8" /><stop offset="1" stopColor="#8a5c16" /></linearGradient>
        <radialGradient id="cEm" cx="50%" cy="34%" r="72%"><stop offset="0" stopColor="#1f7a4c" /><stop offset=".6" stopColor="#0e5230" /><stop offset="1" stopColor="#05271a" /></radialGradient>
        <linearGradient id="cTxt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff7da" /><stop offset=".55" stopColor="#f4cf62" /><stop offset="1" stopColor="#c68a2e" /></linearGradient>
        <linearGradient id="cSh" x1="0" y1="0" x2="1" y2="1"><stop offset=".34" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".72" /><stop offset=".66" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <clipPath id="cClip"><circle cx="60" cy="54" r="40" /></clipPath>
      </defs>
      <g id="cBr">
        <path d="M60 120 C44 118 33 107 30 91 C28 80 30 69 34 61" fill="none" stroke="url(#cGold)" strokeWidth="3.2" strokeLinecap="round" />
        <g fill="url(#cGold)" stroke="url(#cEdge)" strokeWidth="1">
          <ellipse cx="33" cy="67" rx="6" ry="3.1" transform="rotate(-56 33 67)" />
          <ellipse cx="31.5" cy="77" rx="6.4" ry="3.3" transform="rotate(-40 31.5 77)" />
          <ellipse cx="33" cy="88" rx="6.6" ry="3.4" transform="rotate(-24 33 88)" />
          <ellipse cx="37" cy="98" rx="6.6" ry="3.4" transform="rotate(-8 37 98)" />
          <ellipse cx="44" cy="106" rx="6.2" ry="3.2" transform="rotate(8 44 106)" />
        </g>
      </g>
      <use href="#cBr" transform="translate(120,0) scale(-1,1)" />
      <circle cx="60" cy="54" r="44" fill="url(#cGold)" stroke="url(#cEdge)" strokeWidth="3" />
      <circle cx="60" cy="54" r="40" fill="url(#cEm)" stroke="url(#cEdge)" strokeWidth="2.5" />
      <circle cx="60" cy="54" r="36" fill="none" stroke="#f0c94a" strokeWidth="1" opacity=".45" />
      <text x="60" y="66" textAnchor="middle" fontFamily="Georgia,serif" fontWeight="900" fontSize="30" fill="url(#cTxt)" stroke="#7a5410" strokeWidth=".5">C74</text>
      <g fill="url(#cGold)" stroke="url(#cEdge)" strokeWidth=".8"><path d="M60 4 l3 6 6 .8 -4.5 4.4 1 6.3 -5.5 -3 -5.5 3 1 -6.3 -4.5 -4.4 6 -.8 z" /></g>
      <g className="vip-crest-shine" clipPath="url(#cClip)"><rect x="0" y="0" width="120" height="128" fill="url(#cSh)" /></g>
    </svg>
  );
}

// Wallet — an emerald shield fronted by a gold coin stack with a gem.
export function WalletCrest({ className = "" }: { className?: string }) {
  return (
    <svg className={`vip-crest ${className}`} viewBox="0 0 120 128" width="100%" height="100%" role="img" aria-label="Wallet" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6d5" /><stop offset=".42" stopColor="#f6d268" /><stop offset=".72" stopColor="#e0aa38" /><stop offset="1" stopColor="#a9741c" /></linearGradient>
        <linearGradient id="wEdge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe9a8" /><stop offset="1" stopColor="#8a5c16" /></linearGradient>
        <radialGradient id="wEm" cx="50%" cy="34%" r="72%"><stop offset="0" stopColor="#1f7a4c" /><stop offset=".6" stopColor="#0e5230" /><stop offset="1" stopColor="#05271a" /></radialGradient>
        <radialGradient id="wEmg" cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#9affc4" /><stop offset=".5" stopColor="#22b06a" /><stop offset="1" stopColor="#0d5e34" /></radialGradient>
        <linearGradient id="wSh" x1="0" y1="0" x2="1" y2="1"><stop offset=".34" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".72" /><stop offset=".66" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <clipPath id="wClip"><path d="M60 20 h32 a6 6 0 0 1 6 6 v34 c0 20 -16 32 -38 42 c-22 -10 -38 -22 -38 -42 v-34 a6 6 0 0 1 6 -6 z" /></clipPath>
      </defs>
      <path d="M60 20 h32 a6 6 0 0 1 6 6 v34 c0 20 -16 32 -38 42 c-22 -10 -38 -22 -38 -42 v-34 a6 6 0 0 1 6 -6 z" fill="url(#wEm)" stroke="url(#wEdge)" strokeWidth="4.5" />
      <path d="M60 26 h28 a3 3 0 0 1 3 3 v30 c0 17 -14 28 -31 37 c-17 -9 -31 -20 -31 -37 v-30 a3 3 0 0 1 3 -3 z" fill="none" stroke="#f0c94a" strokeWidth="1" opacity=".45" />
      <g stroke="url(#wEdge)" strokeWidth="1.4">
        <ellipse cx="60" cy="70" rx="24" ry="8" fill="url(#wGold)" />
        <ellipse cx="60" cy="60" rx="24" ry="8" fill="url(#wGold)" />
        <ellipse cx="60" cy="50" rx="24" ry="8" fill="url(#wGold)" />
        <path d="M36 50 v20 M84 50 v20" fill="none" stroke="url(#wEdge)" strokeWidth="1.4" opacity=".7" />
      </g>
      <text x="60" y="55" textAnchor="middle" fontFamily="Georgia,serif" fontWeight="900" fontSize="13" fill="#7a5410">$</text>
      <path d="M60 84 l4.5 4.5 -4.5 4.5 -4.5 -4.5 z" fill="url(#wEmg)" stroke="url(#wEdge)" strokeWidth="1" />
      <g className="vip-crest-shine" clipPath="url(#wClip)"><rect x="0" y="0" width="120" height="128" fill="url(#wSh)" /></g>
    </svg>
  );
}

// Rewards — a gold gift box with ribbon, bow and sparkles.
export function RewardCrest({ className = "" }: { className?: string }) {
  return (
    <svg className={`vip-crest ${className}`} viewBox="0 0 120 128" width="100%" height="100%" role="img" aria-label="Rewards" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6d5" /><stop offset=".42" stopColor="#f6d268" /><stop offset=".72" stopColor="#e0aa38" /><stop offset="1" stopColor="#a9741c" /></linearGradient>
        <linearGradient id="rEdge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe9a8" /><stop offset="1" stopColor="#8a5c16" /></linearGradient>
        <radialGradient id="rEm" cx="50%" cy="34%" r="72%"><stop offset="0" stopColor="#1f7a4c" /><stop offset=".6" stopColor="#0e5230" /><stop offset="1" stopColor="#05271a" /></radialGradient>
        <linearGradient id="rTxt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff7da" /><stop offset=".55" stopColor="#f4cf62" /><stop offset="1" stopColor="#c68a2e" /></linearGradient>
        <linearGradient id="rSh" x1="0" y1="0" x2="1" y2="1"><stop offset=".34" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".72" /><stop offset=".66" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>
      <rect x="30" y="58" width="60" height="46" rx="4" fill="url(#rEm)" stroke="url(#rEdge)" strokeWidth="3" />
      <rect x="24" y="46" width="72" height="18" rx="4" fill="url(#rGold)" stroke="url(#rEdge)" strokeWidth="3" />
      <rect x="54" y="46" width="12" height="58" fill="url(#rGold)" stroke="url(#rEdge)" strokeWidth="1.4" />
      <g fill="url(#rGold)" stroke="url(#rEdge)" strokeWidth="1.6">
        <path d="M60 46 C50 30 34 32 40 42 C44 48 54 46 60 46 Z" />
        <path d="M60 46 C70 30 86 32 80 42 C76 48 66 46 60 46 Z" />
        <circle cx="60" cy="44" r="5" />
      </g>
      <g fill="url(#rTxt)"><path d="M26 30 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 z" /><path d="M96 26 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6 z" /></g>
      <g className="vip-crest-shine"><rect x="24" y="44" width="72" height="60" fill="url(#rSh)" /></g>
    </svg>
  );
}

// Missions — a gold bullseye target with laurel wreath and a star.
export function MissionCrest({ className = "" }: { className?: string }) {
  return (
    <svg className={`vip-crest ${className}`} viewBox="0 0 120 126" width="100%" height="100%" role="img" aria-label="Missions" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6d5" /><stop offset=".42" stopColor="#f6d268" /><stop offset=".72" stopColor="#e0aa38" /><stop offset="1" stopColor="#a9741c" /></linearGradient>
        <linearGradient id="mE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe9a8" /><stop offset="1" stopColor="#8a5c16" /></linearGradient>
        <radialGradient id="mM" cx="50%" cy="34%" r="72%"><stop offset="0" stopColor="#1f7a4c" /><stop offset=".6" stopColor="#0e5230" /><stop offset="1" stopColor="#05271a" /></radialGradient>
        <radialGradient id="mR" cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#ff8a9a" /><stop offset=".5" stopColor="#e02446" /><stop offset="1" stopColor="#8f0f26" /></radialGradient>
        <radialGradient id="mGm" cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#9affc4" /><stop offset=".5" stopColor="#22b06a" /><stop offset="1" stopColor="#0d5e34" /></radialGradient>
        <linearGradient id="mS" x1="0" y1="0" x2="1" y2="1"><stop offset=".34" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".72" /><stop offset=".66" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <clipPath id="mc"><circle cx="60" cy="56" r="40" /></clipPath>
      </defs>
      <g id="mb"><path d="M60 118 C45 116 34 106 31 91 C29 81 31 71 35 63" fill="none" stroke="url(#mG)" strokeWidth="3" strokeLinecap="round" /><g fill="url(#mG)" stroke="url(#mE)" strokeWidth="1"><ellipse cx="34" cy="69" rx="5.6" ry="2.9" transform="rotate(-54 34 69)" /><ellipse cx="33" cy="79" rx="6" ry="3.1" transform="rotate(-38 33 79)" /><ellipse cx="35" cy="89" rx="6.2" ry="3.2" transform="rotate(-22 35 89)" /><ellipse cx="40" cy="98" rx="6" ry="3.1" transform="rotate(-6 40 98)" /></g></g>
      <use href="#mb" transform="translate(120,0) scale(-1,1)" />
      <circle cx="60" cy="56" r="42" fill="url(#mG)" stroke="url(#mE)" strokeWidth="2.5" />
      <circle cx="60" cy="56" r="37" fill="url(#mM)" />
      <circle cx="60" cy="56" r="28" fill="none" stroke="url(#mG)" strokeWidth="5" />
      <circle cx="60" cy="56" r="18" fill="none" stroke="url(#mGm)" strokeWidth="5" />
      <circle cx="60" cy="56" r="8" fill="url(#mR)" stroke="url(#mE)" strokeWidth="1.5" />
      <path transform="translate(53.4 1.4) scale(1.1)" d="M6 0 l1.8 3.7 4 .6 -2.9 2.8 .7 4 -3.6 -1.9 -3.6 1.9 .7 -4 -2.9 -2.8 4 -.6 z" fill="url(#mG)" stroke="url(#mE)" strokeWidth=".5" />
      <g className="vip-crest-shine" clipPath="url(#mc)"><rect x="0" y="0" width="120" height="126" fill="url(#mS)" /></g>
    </svg>
  );
}

// Bank / Gullak — a gold vault safe with a dial and a gem.
export function BankCrest({ className = "" }: { className?: string }) {
  return (
    <svg className={`vip-crest ${className}`} viewBox="0 0 120 126" width="100%" height="100%" role="img" aria-label="Bank" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="kG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6d5" /><stop offset=".42" stopColor="#f6d268" /><stop offset=".72" stopColor="#e0aa38" /><stop offset="1" stopColor="#a9741c" /></linearGradient>
        <linearGradient id="kE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe9a8" /><stop offset="1" stopColor="#8a5c16" /></linearGradient>
        <radialGradient id="kM" cx="50%" cy="34%" r="72%"><stop offset="0" stopColor="#1f7a4c" /><stop offset=".6" stopColor="#0e5230" /><stop offset="1" stopColor="#05271a" /></radialGradient>
        <radialGradient id="kR" cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#ff8a9a" /><stop offset=".5" stopColor="#e02446" /><stop offset="1" stopColor="#8f0f26" /></radialGradient>
        <radialGradient id="kGm" cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#9affc4" /><stop offset=".5" stopColor="#22b06a" /><stop offset="1" stopColor="#0d5e34" /></radialGradient>
        <linearGradient id="kS" x1="0" y1="0" x2="1" y2="1"><stop offset=".34" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".72" /><stop offset=".66" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <clipPath id="kc"><rect x="22" y="26" width="76" height="76" rx="10" /></clipPath>
      </defs>
      <rect x="22" y="26" width="76" height="76" rx="10" fill="url(#kG)" stroke="url(#kE)" strokeWidth="3.5" />
      <rect x="31" y="35" width="58" height="58" rx="7" fill="url(#kM)" stroke="url(#kE)" strokeWidth="2" />
      <circle cx="60" cy="64" r="16" fill="url(#kG)" stroke="url(#kE)" strokeWidth="2" />
      <circle cx="60" cy="64" r="9" fill="url(#kM)" stroke="url(#kE)" strokeWidth="1.4" />
      <g stroke="url(#kE)" strokeWidth="2.4" strokeLinecap="round"><path d="M60 50 v-6 M60 84 v-6 M46 64 h-6 M80 64 h-6" /></g>
      <circle cx="60" cy="64" r="3" fill="url(#kR)" />
      <path d="M60 98 l4 4 -4 4 -4 -4 z" fill="url(#kGm)" stroke="url(#kE)" strokeWidth="1" />
      <path transform="translate(54 14) scale(1)" d="M6 0 l1.8 3.7 4 .6 -2.9 2.8 .7 4 -3.6 -1.9 -3.6 1.9 .7 -4 -2.9 -2.8 4 -.6 z" fill="url(#kG)" stroke="url(#kE)" strokeWidth=".5" />
      <g className="vip-crest-shine" clipPath="url(#kc)"><rect x="0" y="0" width="120" height="126" fill="url(#kS)" /></g>
    </svg>
  );
}

// Analytics — an emerald shield with a gold bar-chart and a rising trend arrow.
export function AnalyticsCrest({ className = "" }: { className?: string }) {
  return (
    <svg className={`vip-crest ${className}`} viewBox="0 0 120 126" width="100%" height="100%" role="img" aria-label="Analytics" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="aG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6d5" /><stop offset=".42" stopColor="#f6d268" /><stop offset=".72" stopColor="#e0aa38" /><stop offset="1" stopColor="#a9741c" /></linearGradient>
        <linearGradient id="aE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe9a8" /><stop offset="1" stopColor="#8a5c16" /></linearGradient>
        <radialGradient id="aM" cx="50%" cy="34%" r="72%"><stop offset="0" stopColor="#1f7a4c" /><stop offset=".6" stopColor="#0e5230" /><stop offset="1" stopColor="#05271a" /></radialGradient>
        <linearGradient id="aGrn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9ffcc4" /><stop offset=".55" stopColor="#2ee08a" /><stop offset="1" stopColor="#0e7a4a" /></linearGradient>
        <linearGradient id="aS" x1="0" y1="0" x2="1" y2="1"><stop offset=".34" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".72" /><stop offset=".66" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <clipPath id="ac"><path d="M60 20 h32 a6 6 0 0 1 6 6 v34 c0 20 -16 32 -38 42 c-22 -10 -38 -22 -38 -42 v-34 a6 6 0 0 1 6 -6 z" /></clipPath>
      </defs>
      <path d="M60 20 h32 a6 6 0 0 1 6 6 v34 c0 20 -16 32 -38 42 c-22 -10 -38 -22 -38 -42 v-34 a6 6 0 0 1 6 -6 z" fill="url(#aM)" stroke="url(#aE)" strokeWidth="4.5" />
      <g fill="url(#aG)" stroke="url(#aE)" strokeWidth="1.2">
        <rect x="34" y="66" width="11" height="18" rx="2" />
        <rect x="50" y="56" width="11" height="28" rx="2" />
        <rect x="66" y="46" width="11" height="38" rx="2" />
      </g>
      <path d="M33 60 L48 50 L58 56 L86 36" fill="none" stroke="url(#aGrn)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M78 34 h10 v10" fill="none" stroke="url(#aGrn)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <g className="vip-crest-shine" clipPath="url(#ac)"><rect x="0" y="0" width="120" height="126" fill="url(#aS)" /></g>
    </svg>
  );
}

// Deposit — a gold coin with a green down-arrow (money in).
export function DepositCrest({ className = "" }: { className?: string }) {
  return (
    <svg className={`vip-crest ${className}`} viewBox="0 0 120 126" width="100%" height="100%" role="img" aria-label="Deposit" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6d5" /><stop offset=".42" stopColor="#f6d268" /><stop offset=".72" stopColor="#e0aa38" /><stop offset="1" stopColor="#a9741c" /></linearGradient>
        <linearGradient id="dE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe9a8" /><stop offset="1" stopColor="#8a5c16" /></linearGradient>
        <radialGradient id="dM" cx="50%" cy="34%" r="72%"><stop offset="0" stopColor="#1f7a4c" /><stop offset=".6" stopColor="#0e5230" /><stop offset="1" stopColor="#05271a" /></radialGradient>
        <linearGradient id="dGrn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9ffcc4" /><stop offset=".55" stopColor="#2ee08a" /><stop offset="1" stopColor="#0e7a4a" /></linearGradient>
        <linearGradient id="dS" x1="0" y1="0" x2="1" y2="1"><stop offset=".34" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".72" /><stop offset=".66" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <clipPath id="dc"><circle cx="60" cy="70" r="30" /></clipPath>
      </defs>
      <circle cx="60" cy="70" r="34" fill="url(#dG)" stroke="url(#dE)" strokeWidth="3" />
      <circle cx="60" cy="70" r="29" fill="url(#dM)" stroke="url(#dE)" strokeWidth="1.5" />
      <text x="60" y="80" textAnchor="middle" fontFamily="Georgia,serif" fontWeight="900" fontSize="26" fill="url(#dG)" stroke="#7a5410" strokeWidth=".4">$</text>
      <g><path d="M60 8 v28" fill="none" stroke="url(#dGrn)" strokeWidth="8" strokeLinecap="round" /><path d="M48 28 L60 42 L72 28" fill="none" stroke="url(#dGrn)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /></g>
      <g className="vip-crest-shine" clipPath="url(#dc)"><rect x="0" y="0" width="120" height="126" fill="url(#dS)" /></g>
    </svg>
  );
}

// Withdraw — a gold coin with a gold up-arrow (money out).
export function WithdrawCrest({ className = "" }: { className?: string }) {
  return (
    <svg className={`vip-crest ${className}`} viewBox="0 0 120 126" width="100%" height="100%" role="img" aria-label="Withdraw" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6d5" /><stop offset=".42" stopColor="#f6d268" /><stop offset=".72" stopColor="#e0aa38" /><stop offset="1" stopColor="#a9741c" /></linearGradient>
        <linearGradient id="tE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe9a8" /><stop offset="1" stopColor="#8a5c16" /></linearGradient>
        <radialGradient id="tM" cx="50%" cy="34%" r="72%"><stop offset="0" stopColor="#1f7a4c" /><stop offset=".6" stopColor="#0e5230" /><stop offset="1" stopColor="#05271a" /></radialGradient>
        <linearGradient id="tS" x1="0" y1="0" x2="1" y2="1"><stop offset=".34" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".72" /><stop offset=".66" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <clipPath id="tc"><circle cx="60" cy="56" r="30" /></clipPath>
      </defs>
      <circle cx="60" cy="56" r="34" fill="url(#tG)" stroke="url(#tE)" strokeWidth="3" />
      <circle cx="60" cy="56" r="29" fill="url(#tM)" stroke="url(#tE)" strokeWidth="1.5" />
      <text x="60" y="66" textAnchor="middle" fontFamily="Georgia,serif" fontWeight="900" fontSize="26" fill="url(#tG)" stroke="#7a5410" strokeWidth=".4">$</text>
      <g><path d="M60 118 v-28" fill="none" stroke="url(#tG)" strokeWidth="8" strokeLinecap="round" /><path d="M48 98 L60 84 L72 98" fill="none" stroke="url(#tG)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /></g>
      <g className="vip-crest-shine" clipPath="url(#tc)"><rect x="0" y="0" width="120" height="126" fill="url(#tS)" /></g>
    </svg>
  );
}

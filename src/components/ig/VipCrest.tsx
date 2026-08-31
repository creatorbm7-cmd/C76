// VipCrest — a bespoke, hand-built SVG VIP emblem: gold crown with gem accents,
// an emerald shield bearing "VIP", flanked by a gold laurel wreath, with a slow
// specular gold shine clipped to the emblem. Pure vector — crisp at any size,
// theme-safe, reduced-motion aware (shine animation lives in ig-premium.css).
// Presentation only. IDs are namespaced so multiple instances never collide.
export default function VipCrest({ className = "" }: { className?: string }) {
  return (
    <svg className={`vip-crest ${className}`} viewBox="0 0 120 132" width="100%" height="100%" role="img" aria-label="VIP" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vcrGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6d5" /><stop offset=".42" stopColor="#f6d268" />
          <stop offset=".72" stopColor="#e0aa38" /><stop offset="1" stopColor="#a9741c" />
        </linearGradient>
        <linearGradient id="vcrEdge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe9a8" /><stop offset="1" stopColor="#8a5c16" />
        </linearGradient>
        <radialGradient id="vcrEmerald" cx="50%" cy="34%" r="72%">
          <stop offset="0" stopColor="#1f7a4c" /><stop offset=".6" stopColor="#0e5230" /><stop offset="1" stopColor="#05271a" />
        </radialGradient>
        <radialGradient id="vcrRuby" cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#ff8a9a" /><stop offset=".5" stopColor="#e02446" /><stop offset="1" stopColor="#8f0f26" /></radialGradient>
        <radialGradient id="vcrSapp" cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#8fd0ff" /><stop offset=".5" stopColor="#2a74d6" /><stop offset="1" stopColor="#123f86" /></radialGradient>
        <radialGradient id="vcrEmgem" cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#9affc4" /><stop offset=".5" stopColor="#22b06a" /><stop offset="1" stopColor="#0d5e34" /></radialGradient>
        <linearGradient id="vcrVip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff7da" /><stop offset=".55" stopColor="#f4cf62" /><stop offset="1" stopColor="#c68a2e" /></linearGradient>
        <linearGradient id="vcrShine" x1="0" y1="0" x2="1" y2="1"><stop offset=".34" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".72" /><stop offset=".66" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <clipPath id="vcrClip">
          <path d="M34 44 L30 20 L44 32 L60 12 L76 32 L90 20 L86 44 Z" />
          <rect x="33" y="42" width="54" height="9" rx="3" />
          <path d="M60 44 h30 a6 6 0 0 1 6 6 v30 c0 16 -14 26 -36 34 c-22 -8 -36 -18 -36 -34 v-30 a6 6 0 0 1 6 -6 z" />
        </clipPath>
      </defs>

      {/* laurel wreath — two mirrored branches */}
      <g>
        <g id="vcrBranch">
          <path d="M60 122 C42 120 30 108 27 90 C25 78 27 66 31 58" fill="none" stroke="url(#vcrGold)" strokeWidth="3.4" strokeLinecap="round" />
          <g fill="url(#vcrGold)" stroke="url(#vcrEdge)" strokeWidth="1">
            <ellipse cx="30" cy="64" rx="6.5" ry="3.4" transform="rotate(-58 30 64)" />
            <ellipse cx="28.5" cy="74" rx="7" ry="3.6" transform="rotate(-42 28.5 74)" />
            <ellipse cx="30" cy="85" rx="7.2" ry="3.7" transform="rotate(-26 30 85)" />
            <ellipse cx="34" cy="95" rx="7.2" ry="3.7" transform="rotate(-10 34 95)" />
            <ellipse cx="41" cy="104" rx="7" ry="3.6" transform="rotate(6 41 104)" />
            <ellipse cx="50" cy="111" rx="6.6" ry="3.4" transform="rotate(20 50 111)" />
          </g>
        </g>
        <use href="#vcrBranch" transform="translate(120,0) scale(-1,1)" />
      </g>

      {/* emerald shield + VIP */}
      <path d="M60 44 h30 a6 6 0 0 1 6 6 v30 c0 16 -14 26 -36 34 c-22 -8 -36 -18 -36 -34 v-30 a6 6 0 0 1 6 -6 z" fill="url(#vcrEmerald)" stroke="url(#vcrEdge)" strokeWidth="4" />
      <path d="M60 49 h27 a3 3 0 0 1 3 3 v27 c0 13 -12 22 -30 29 c-18 -7 -30 -16 -30 -29 v-27 a3 3 0 0 1 3 -3 z" fill="none" stroke="#f0c94a" strokeWidth="1" opacity=".5" />
      <text x="60" y="82" textAnchor="middle" fontFamily="Georgia,'Times New Roman',serif" fontWeight="900" fontSize="30" letterSpacing="1" fill="url(#vcrVip)" stroke="#7a5410" strokeWidth=".5">VIP</text>
      <path d="M60 96 l4 4 -4 4 -4 -4 z" fill="url(#vcrEmgem)" stroke="url(#vcrEdge)" strokeWidth="1" />

      {/* crown */}
      <g>
        <path d="M34 44 L30 20 L44 32 L60 12 L76 32 L90 20 L86 44 Z" fill="url(#vcrGold)" stroke="url(#vcrEdge)" strokeWidth="2.2" strokeLinejoin="round" />
        <rect x="33" y="42" width="54" height="9" rx="3" fill="url(#vcrGold)" stroke="url(#vcrEdge)" strokeWidth="1.6" />
        <circle cx="60" cy="11" r="4.6" fill="url(#vcrRuby)" stroke="url(#vcrEdge)" strokeWidth="1.2" />
        <circle cx="30" cy="19" r="3.4" fill="url(#vcrSapp)" stroke="url(#vcrEdge)" strokeWidth="1" />
        <circle cx="90" cy="19" r="3.4" fill="url(#vcrSapp)" stroke="url(#vcrEdge)" strokeWidth="1" />
        <circle cx="45" cy="46.5" r="2.6" fill="url(#vcrRuby)" />
        <circle cx="60" cy="46.5" r="2.6" fill="url(#vcrEmgem)" />
        <circle cx="75" cy="46.5" r="2.6" fill="url(#vcrSapp)" />
      </g>

      {/* specular shine — clipped to the emblem, animated in CSS */}
      <g className="vip-crest-shine" clipPath="url(#vcrClip)"><rect x="0" y="0" width="120" height="132" fill="url(#vcrShine)" /></g>
    </svg>
  );
}

// V2PortraitLock — locks the immersive /v2 world to portrait orientation.
//
// Pure-CSS orientation gate (no JS, no listeners): the overlay is display:none
// by default and only appears on a landscape phone (orientation: landscape +
// short viewport), prompting the user to rotate back to portrait. Desktop and
// tablets in landscape are unaffected (their height clears the max-height gate).
// Presentation-only.

import { useLocation } from "react-router-dom";
import { Smartphone } from "lucide-react";

// Guards the consumer app surfaces (games, wallet, rewards, profile + their
// sub-screens). These now live under /v3/*; legacy /v2/* kept for transient
// redirects / old deep links.
const ON_V2 = (p: string) =>
  p === "/v2" || p.startsWith("/v2/") ||
  /^\/v3\/(games|game|wallet|rewards|profile)\b/.test(p);

export default function V2PortraitLock() {
  const { pathname } = useLocation();
  if (!ON_V2(pathname)) return null;
  return (
    <div className="v2plock" role="alertdialog" aria-label="Rotate to portrait">
      <style>{CSS}</style>
      <div className="v2plock-ic"><Smartphone size={44} /></div>
      <div className="v2plock-tx">
        <b>Rotate your device</b>
        <small>C7 Winners is designed for portrait — turn your phone upright for the full luxury experience.</small>
      </div>
    </div>
  );
}

const CSS = `
.v2plock { display: none; }
@media (orientation: landscape) and (max-height: 540px) {
  .v2plock { display: flex; position: fixed; inset: 0; z-index: 999; flex-direction: column; align-items: center; justify-content: center; gap: 20px; text-align: center; padding: 24px 32px;
    color: #eeffdc; font-family: Inter, system-ui, sans-serif;
    background: radial-gradient(120% 90% at 50% 0%, rgba(46,224,138,0.22), transparent 55%), radial-gradient(90% 70% at 50% 120%, rgba(46,224,138,0.18), transparent 60%), linear-gradient(180deg, #06180f 0%, #04120b 55%, #020a06 100%); }
  .v2plock-ic { width: 78px; height: 78px; border-radius: 22px; display: grid; place-items: center; color: #052012;
    background: radial-gradient(circle at 36% 28%, #eeffd8, #2ee08a 42%, #21c07e 66%, #0f7a4a 100%); border: 1.5px solid #0a5236;
    box-shadow: inset 0 2px 3px rgba(255,255,255,0.7), 0 0 22px rgba(46,224,138,0.55); animation: v2plock-rock 1.8s ease-in-out infinite; will-change: transform; }
  .v2plock-tx b { display: block; font-size: 18px; font-weight: 900; letter-spacing: 0.2px;
    background: linear-gradient(92deg, #c9f6e0, #eeffd8 40%, #21c07e 70%, #c9f6e0); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .v2plock-tx small { display: block; max-width: 340px; margin: 8px auto 0; font-size: 12.5px; line-height: 1.5; color: rgba(224,250,172,0.7); font-weight: 600; }
}
@keyframes v2plock-rock { 0%,100% { transform: rotate(-18deg); } 50% { transform: rotate(6deg); } }
@media (prefers-reduced-motion: reduce) { .v2plock-ic { animation: none; } }
`;

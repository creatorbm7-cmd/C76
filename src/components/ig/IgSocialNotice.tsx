// IgSocialNotice — social-casino / free-play disclaimer.
//
// Phase A of SOCIAL-CASINO-MODE-DESIGN.md: make the virtual-only nature explicit.
// Presentation-only — it removes no architecture and touches no money path. It
// states that coins carry no monetary value and cannot be withdrawn/exchanged
// for cash. `variant="line"` is a compact inline note; `variant="card"` is a
// standalone card for money-adjacent screens (wallet, games).
import { Info } from "lucide-react";

export default function IgSocialNotice({ variant = "line" }: { variant?: "line" | "card" }) {
  const text =
    "Free-to-play · coins have no monetary value and cannot be withdrawn or exchanged for cash · 18+";

  if (variant === "card") {
    return (
      <div className="igsoc igsoc--card" role="note">
        <style>{CSS}</style>
        <Info size={15} className="igsoc-ic" aria-hidden="true" />
        <span>{text}</span>
      </div>
    );
  }
  return (
    <p className="igsoc igsoc--line" role="note">
      <style>{CSS}</style>
      {text}
    </p>
  );
}

const CSS = `
.igsoc { font-family:Inter,system-ui,-apple-system,sans-serif; color:#8fb3a1; }
.igsoc--line { margin:10px 4px 0; font-size:10.5px; line-height:1.5; text-align:center; letter-spacing:0.1px; }
.igsoc--card { display:flex; align-items:flex-start; gap:9px; margin:0; padding:11px 14px; border-radius:14px; font-size:11.5px; line-height:1.5;
  color:#a9d0bd; background:linear-gradient(180deg, rgba(18,63,41,0.6), rgba(8,30,19,0.65)); border:1px solid rgba(240,201,74,0.16);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.06); }
.igsoc-ic { flex:0 0 auto; margin-top:1px; color:#e8c877; }
`;

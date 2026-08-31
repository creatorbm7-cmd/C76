// C74QaDebug — owner-only QA trigger for the win/jackpot celebration.
//
// STRICTLY for QA/testing. It fires ONLY the visual celebration overlay
// (C74WinBurst) — it never calls an RPC, never touches RNG, rewards, the ledger
// or any balance. So QA can verify the jackpot overlay / coin rain / confetti /
// screen-shake / chime deterministically without affecting the real economy.
//
// Double-gated so production users can NEVER see it:
//   1. Feature flag — renders nothing unless VITE_QA_DEBUG === "true"
//      (unset in production builds → the panel is inert/absent).
//   2. Role — only renders for the owner (server-checked via is_owner()).
// Every trigger is logged (console + a `c74:qa-debug` window event) for audit.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const QA_ENABLED = import.meta.env.VITE_QA_DEBUG === "true";

export default function C74QaDebug({ onTrigger }: { onTrigger: (amount: number, jackpot: boolean) => void }) {
  const [owner, setOwner] = useState(false);

  useEffect(() => {
    if (!QA_ENABLED) return;
    let alive = true;
    (supabase.rpc as any)("is_owner")
      .then(({ data }: { data: unknown }) => { if (alive) setOwner(data === true); })
      .catch(() => { if (alive) setOwner(false); });
    return () => { alive = false; };
  }, []);

  if (!QA_ENABLED || !owner) return null;

  const fire = (amount: number, jackpot: boolean) => {
    // Audit trail — this trigger is UI-only and touches no economy.
    // eslint-disable-next-line no-console
    console.info("[C74 QA-DEBUG] celebration trigger (UI-only · no RPC/RNG/ledger/balance)", {
      amount, jackpot, at: new Date().toISOString(),
    });
    window.dispatchEvent(new CustomEvent("c74:qa-debug", { detail: { kind: "celebration", amount, jackpot } }));
    onTrigger(amount, jackpot);
  };

  return (
    <div className="c74qa" role="group" aria-label="QA debug (owner only)">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="c74qa-tag">QA · owner only · UI-only</div>
      <div className="c74qa-row">
        <button type="button" className="c74qa-btn jack" onClick={() => fire(3000, true)}>🎉 Jackpot burst</button>
        <button type="button" className="c74qa-btn" onClick={() => fire(300, false)}>Win burst</button>
      </div>
      <div className="c74qa-note">No reward · no ledger · no RNG</div>
    </div>
  );
}

const CSS = `
.c74qa { position: fixed; left: 12px; bottom: 84px; z-index: 70; display: flex; flex-direction: column; gap: 6px;
  padding: 9px 10px; border-radius: 12px; background: rgba(8,20,13,0.92); border: 1px dashed rgba(246,214,122,0.55);
  box-shadow: 0 10px 24px -10px rgba(0,0,0,0.7); backdrop-filter: blur(4px); }
.c74qa-tag { font-family: ui-monospace, monospace; font-size: 8.5px; letter-spacing: 0.6px; text-transform: uppercase; color: #f6d67a; }
.c74qa-row { display: flex; gap: 6px; }
.c74qa-btn { cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 800; color: #eaf3ec; padding: 6px 9px; border-radius: 8px;
  background: rgba(20,58,40,0.9); border: 1px solid rgba(95,221,160,0.3); }
.c74qa-btn.jack { color: #241808; border-color: transparent; background: linear-gradient(180deg,#ffe07a,#f6c945 55%,#d89a1e); }
.c74qa-btn:active { transform: scale(0.95); }
.c74qa-note { font-family: ui-monospace, monospace; font-size: 8px; color: rgba(220,232,223,0.5); }
`;

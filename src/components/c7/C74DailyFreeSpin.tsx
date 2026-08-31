// C74DailyFreeSpin — the 0-cost daily retention spin.
//
// Calls the server-authoritative c74_free_spin() RPC: once per cooldown window it
// credits a small C74 reward (50–300) into the reward ledger. Shows a live
// countdown to the next free spin when on cooldown. Ledger-only — no money path.
// Pairs with the premium C74Wheel on the same page.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useC74 } from "@/hooks/useC74";
import { toast } from "sonner";
import { num as fmt } from "@/lib/format";
import { Gift } from "lucide-react";
import C74WinBurst from "./C74WinBurst";

function countdown(toISO: string | null): string {
  if (!toISO) return "";
  const ms = new Date(toISO).getTime() - Date.now();
  if (ms <= 0) return "";
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  const s = Math.floor((ms % 6e4) / 1000);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
}

export default function C74DailyFreeSpin() {
  const { reload } = useC74();
  const [available, setAvailable] = useState(false);
  const [nextAt, setNextAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, force] = useState(0);
  const [burst, setBurst] = useState<{ amount: number } | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const { data, error } = await (supabase.rpc as any)("c74_free_spin_status");
      if (error) throw error;
      setAvailable(Boolean(data?.available));
      setNextAt(data?.next_at ?? null);
    } catch {
      // status is best-effort; leave the button enabled and let the claim decide
      setAvailable(true);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // While on cooldown: tick the countdown each second, and flip back to
  // available the moment it elapses.
  useEffect(() => {
    if (available) return;
    const t = window.setInterval(() => {
      if (nextAt && Date.now() >= new Date(nextAt).getTime()) setAvailable(true);
      else force((n) => n + 1);
    }, 1000);
    return () => window.clearInterval(t);
  }, [available, nextAt]);

  const claim = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase.rpc as any)("c74_free_spin");
      if (error) throw error;
      if (!data?.success) {
        setAvailable(false);
        setNextAt(data?.next_at ?? null);
        toast.message("Free spin already claimed — come back soon!");
        return;
      }
      const amount = Number(data.prize_amount ?? 0);
      setAvailable(false);
      setNextAt(data?.next_at ?? null);
      setBurst({ amount });
      reload();
      window.dispatchEvent(new Event("dtx:balance-updated"));
      toast.success(`🎁 Daily free spin: +${fmt(amount)} C74!`);
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("auth")) toast.error("Please log in to claim your free spin");
      else toast.error(msg || "Free spin failed");
    } finally {
      setBusy(false);
    }
  }, [busy, reload]);

  const cd = countdown(nextAt);

  return (
    <div className="c74fs">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="c74fs-l">
        <span className="c74fs-ic" aria-hidden="true"><Gift size={18} /></span>
        <div>
          <div className="c74fs-t">Daily Free Spin</div>
          <div className="c74fs-s">{available ? "Ready now · win 50–300 C74" : cd ? `Next spin in ${cd}` : "Checking…"}</div>
        </div>
      </div>
      <button className="c74fs-btn" disabled={!available || busy} onClick={claim}>
        {busy ? "Spinning…" : available ? "Spin Free" : "Claimed"}
      </button>

      <C74WinBurst show={!!burst} amount={burst?.amount ?? 0} jackpot={false} onDone={() => setBurst(null)} />
    </div>
  );
}

const CSS = `
.c74fs { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 16px; margin-bottom: 12px;
  background: radial-gradient(120% 100% at 100% 0%, rgba(246,201,69,0.16), transparent 60%), linear-gradient(160deg, rgba(16,58,32,0.9), rgba(6,24,14,0.94));
  border: 1px solid rgba(246,201,69,0.34); box-shadow: inset 0 1px 0 rgba(200,255,225,0.14); }
.c74fs-l { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.c74fs-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; flex: 0 0 auto; color: #052012;
  background: radial-gradient(120% 120% at 50% 10%, rgba(255,255,255,0.6), transparent 50%), linear-gradient(180deg, #8bffc4, #21c07e 60%, #0f7a4a);
  box-shadow: 0 4px 10px -3px rgba(46,224,138,0.7); }
.c74fs-t { font-size: 14px; font-weight: 900; color: #eaffe0; }
.c74fs-s { font-size: 11px; font-weight: 700; color: rgba(205,238,176,0.82); font-variant-numeric: tabular-nums; }
.c74fs-btn { flex: 0 0 auto; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 900; letter-spacing: 0.3px; color: #052012;
  padding: 11px 18px; border-radius: 12px; border: none;
  background: radial-gradient(120% 100% at 50% 10%, rgba(255,255,255,0.6), transparent 52%), linear-gradient(180deg, #ffe07a, #f6c945 55%, #d89a1e);
  box-shadow: 0 5px 0 #9a6a12, 0 10px 18px -8px rgba(0,0,0,0.6); transition: transform .08s ease, box-shadow .08s ease; }
.c74fs-btn:not(:disabled):active { transform: translateY(3px); box-shadow: 0 2px 0 #9a6a12; }
.c74fs-btn:disabled { cursor: default; opacity: 0.5; filter: grayscale(0.4); box-shadow: 0 3px 0 #6a4a0e; }
`;

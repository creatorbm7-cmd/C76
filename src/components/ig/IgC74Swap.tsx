// IgC74Swap — C74 → USDT redemption panel (Instagram-light).
//
// Backend is authoritative and safe (see migration c74_usdt_safe_swap):
//   • get_c74_swap_info()   — read redeemable balance, rate, caps, pool state
//   • redeem_c74_to_usdt()  — atomic, guarded swap (only play-earned C74,
//                             operator-funded pool, per-user daily/lifetime caps)
//
// This component renders NOTHING until the operator has enabled the rail AND
// funded the pool — so the C74 page keeps its honest "Swap / Buy · Soon" state
// until real USDT backs redemptions. No balance is ever implied client-side.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Loader2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { num as fmt, usd } from "@/lib/format";

interface SwapInfo {
  enabled: boolean;
  rate_usdt_per_c74: number;
  min_c74: number;
  pool_usdt: number;
  redeemable_c74: number;
  redeemable_usdt: number;
  daily_remaining_usdt: number;
  lifetime_remaining_usdt: number;
}

export default function IgC74Swap({ onCredited }: { onCredited?: () => void }) {
  const [info, setInfo] = useState<SwapInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data, error } = await (supabase.rpc as any)("get_c74_swap_info");
      if (!error && data) setInfo(data as SwapInfo);
      else setInfo({ enabled: false } as SwapInfo);
    } catch {
      setInfo({ enabled: false } as SwapInfo);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rate = Number(info?.rate_usdt_per_c74) || 0;
  const redeemable = Number(info?.redeemable_c74) || 0;
  const min = Number(info?.min_c74) || 0;
  const capUsdt = info ? Math.min(info.pool_usdt, info.daily_remaining_usdt, info.lifetime_remaining_usdt) : 0;
  const maxC74 = useMemo(() => {
    const byCap = rate > 0 ? Math.floor((capUsdt / rate) * 100) / 100 : 0;
    return Math.max(0, Math.min(redeemable, byCap));
  }, [redeemable, capUsdt, rate]);

  const amt = Number(amount) || 0;
  const usdtOut = Math.round(amt * rate * 1e6) / 1e6;
  const valid = amt >= min && amt <= redeemable && usdtOut > 0 && usdtOut <= capUsdt;

  const swap = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase.rpc as any)("redeem_c74_to_usdt", { p_c74: amt });
      if (error) throw error;
      const r = data as { usdt_credited: number; c74_spent: number };
      toast.success(`🔁 Swapped ${fmt(r.c74_spent)} C74 → ${usd(r.usdt_credited)} USDT`);
      window.dispatchEvent(new Event("dtx:balance-updated"));
      setAmount("");
      await load();
      onCredited?.();
    } catch (e: any) {
      toast.error(String(e?.message ?? "Swap failed"));
    } finally {
      setBusy(false);
    }
  };

  // Hidden entirely until the operator enables + funds the rail.
  if (!info || !info.enabled) return null;

  const belowMin = redeemable < min;

  return (
    <section className="igsw">
      <style>{CSS}</style>
      <div className="igsw-sec"><ArrowLeftRight size={14} /> <span>Swap C74 → USDT</span></div>
      <div className="igsw-card">
        <div className="igsw-meta">
          <span>Redeemable <b>{fmt(redeemable)} C74</b></span>
          <span>Rate <b>{rate}</b> USDT/C74</span>
        </div>

        <div className="igsw-field" data-disabled={belowMin || maxC74 <= 0 || undefined}>
          <input
            inputMode="decimal"
            placeholder={`Min ${fmt(min)} C74`}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            aria-label="C74 amount to swap"
            disabled={belowMin || maxC74 <= 0}
          />
          <button type="button" className="igsw-max" onClick={() => setAmount(String(maxC74))} disabled={maxC74 <= 0}>MAX</button>
        </div>

        <div className="igsw-out">You receive <b>{usd(usdtOut)}</b></div>

        <button type="button" className="igsw-btn" disabled={!valid || busy} onClick={swap}>
          {busy ? <Loader2 size={15} className="igsw-spin" /> : <ArrowLeftRight size={15} />}
          {busy ? "Swapping…" : "Swap to USDT"}
        </button>

        <div className="igsw-note">
          <Info size={12} />
          <span>
            {belowMin
              ? `Earn at least ${fmt(min)} C74 from playing to swap. Only play-earned C74 is redeemable (bonuses excluded).`
              : `Only play-earned C74 is redeemable · ${usd(info.daily_remaining_usdt)} left today · credited to your USDT wallet.`}
          </span>
        </div>
      </div>
    </section>
  );
}

const CSS = `
.igsw { display:flex; flex-direction:column; gap:9px; }
.igsw-sec { display:flex; align-items:center; gap:7px; margin:0 4px; font-size:11px; letter-spacing:0.8px; font-weight:800; text-transform:uppercase; color:#f3ffe9; }
.igsw-sec svg { color:var(--gold); }
.igsw-card { display:flex; flex-direction:column; gap:11px; padding:15px; border-radius:16px;
  background:linear-gradient(180deg, rgba(18,63,41,0.92), rgba(8,30,19,0.94)); border:1px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.12), 0 14px 34px -18px rgba(0,0,0,0.85); }
.igsw-meta { display:flex; justify-content:space-between; gap:10px; font-size:11.5px; font-weight:700; color:var(--mut); }
.igsw-meta b { color:#f3ffe9; font-weight:900; font-variant-numeric:tabular-nums; }
.igsw-field { display:flex; align-items:center; gap:8px; padding:4px 4px 4px 14px; border-radius:12px;
  background:rgba(4,20,11,0.66); border:1px solid var(--line); }
.igsw-field[data-disabled] { opacity:0.55; }
.igsw-field input { flex:1; min-width:0; background:none; border:none; outline:none; color:#f3ffe9; font-family:inherit;
  font-size:17px; font-weight:800; font-variant-numeric:tabular-nums; padding:9px 0; }
.igsw-field input::placeholder { color:var(--mut); font-weight:600; font-size:14px; }
.igsw-max { flex:0 0 auto; padding:8px 13px; border-radius:9px; border:none; cursor:pointer; font-family:inherit;
  font-size:10.5px; font-weight:900; letter-spacing:0.6px; color:#0a2410;
  background:linear-gradient(180deg,#9ffcc4,#2ee08a 60%,#0e7a4a); box-shadow:inset 0 1px 0 rgba(255,255,255,0.45); }
.igsw-max:disabled { opacity:0.45; cursor:default; }
.igsw-out { font-size:13px; font-weight:700; color:var(--mut); text-align:right; }
.igsw-out b { color:var(--gold); font-weight:900; font-size:16px; font-variant-numeric:tabular-nums; }
.igsw-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:13px; border-radius:12px;
  border:none; cursor:pointer; font-family:inherit; font-size:14px; font-weight:900; letter-spacing:0.3px; color:#0a2410;
  background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); box-shadow:inset 0 1px 0 rgba(255,255,255,0.5), 0 8px 18px -8px rgba(46,224,138,0.55); }
.igsw-btn:active { transform:translateY(1px); }
.igsw-btn:disabled { opacity:0.5; cursor:default; box-shadow:none; }
.igsw-spin { animation:igsw-spin 0.9s linear infinite; }
@keyframes igsw-spin { to { transform:rotate(360deg); } }
.igsw-note { display:flex; align-items:flex-start; gap:7px; font-size:10.5px; line-height:1.4; font-weight:600; color:var(--mut); }
.igsw-note svg { flex:0 0 auto; margin-top:1px; color:var(--gold); }
@media (prefers-reduced-motion: reduce) { .igsw-spin { animation:none; } .igsw-btn:active { transform:none; } }
`;

/**
 * DtxPromotionsPage — Bonuses / Events (UONO HDR theme).
 * Active wagering progress, claimable campaigns and history, plus VIP /
 * referral shortcuts. Data: useBonusClaims + list_promotions_with_status /
 * claim_promotion RPCs. Styling matches the HDR "Live" Bank surface.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Gift, Inbox, ArrowLeft } from "lucide-react";
import C7Icon from "@/components/c7/C7Icon";
import C7Asset from "@/components/c7/C7Asset";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDtxBalance } from "@/hooks/useDtxBalance";
import { useDtxStore } from "@/store/dtxStore";
import { useBonusClaims } from "@/hooks/useBonusClaims";

type Tab = "active" | "available" | "history";

// Shape mirrors the `list_promotions_with_status()` RPC:
// (id, name, description, type, amount, percentage, wagering_requirement,
//  min_deposit, max_bonus, is_active, starts_at, expires_at, claimed)
interface Campaign {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  wagering_requirement: number;
  min_deposit: number;
  max_bonus: number;
  claimed: boolean;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "available", label: "Available" },
  { id: "history", label: "History" },
];

const CSS = `
.bn-head { position: sticky; top: 0; z-index: 10; background: linear-gradient(180deg, rgba(6,26,16,0.95), rgba(6,26,16,0.55)); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border-bottom: 1px solid rgba(246,201,69,0.42); padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.bn-head::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(46,230,130,0.85), rgba(255,214,120,0.95), rgba(46,230,130,0.85), transparent);
  background-size: 220% 100%; animation: bn-topglimmer 5.5s linear infinite; opacity: 0.9; }
@keyframes bn-topglimmer { 0% { background-position: 220% 0; } 100% { background-position: -220% 0; } }
.bn-title { margin: 0; font-size: 19px; font-weight: 900; letter-spacing: -0.4px;
  background: linear-gradient(180deg, #ffffff 4%, #d6ffe9 40%, #ffe9a8 74%, #f5b423 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 12px rgba(46,230,130,0.4)) drop-shadow(0 1px 1px rgba(0,0,0,0.5)); }
@media (prefers-reduced-motion: reduce) { .bn-head::after { animation: none; } }
.bn-bal { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; font-size: 13px; font-weight: 900; color: #6bf5a3; background: rgba(46,224,138,0.1); border: 1px solid rgba(46,224,138,0.3); font-variant-numeric: tabular-nums; }
.bn-mini { font-size: 10px; text-transform: uppercase; letter-spacing: 1.4px; color: rgba(230,246,236,0.55); font-weight: 800; }
/* Surface (bg/border/shadow) comes from the shared .c7p-glass primitive. */
.bn-stat { padding: 13px 10px; }
.bn-stat-l { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: rgba(230,246,236,0.55); font-weight: 800; }
.bn-stat-v { font-size: 20px; font-weight: 900; margin-top: 4px; font-variant-numeric: tabular-nums; }
.bn-tabs { display: flex; gap: 6px; padding: 14px 16px 0; }
.bn-tab { flex: 1; padding: 9px 6px; border-radius: 999px; border: 1px solid rgba(246,201,69,0.28); background: rgba(11,74,51,0.4); color: rgba(230,246,236,0.6); font-size: 11px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; cursor: pointer; font-family: inherit; transition: all 0.18s ease; }
.bn-tab--on { background: radial-gradient(120% 100% at 50% 10%, rgba(255,255,255,0.35), transparent 55%), linear-gradient(180deg, #2ee08a, #12a04f); color: #fff; border-color: #12a04f; box-shadow: 0 4px 14px rgba(46,224,138,0.4); }
.bn-tab__c { display: inline-block; margin-left: 5px; font-size: 9px; padding: 1px 5px; border-radius: 6px; background: rgba(0,0,0,0.22); font-weight: 800; }
.bn-card { border-radius: 18px; padding: 15px; position: relative; overflow: hidden; }
.bn-card--mint::before { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(90% 60% at 0% 0%, rgba(46,224,138,0.14), transparent 60%); }
.bn-card--gold::before { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(90% 60% at 100% 0%, rgba(246,201,69,0.16), transparent 60%); }
/* Look comes from the shared .c7p-btn-gold primitive; .bn-claim keeps it compact. */
.bn-claim { flex-shrink: 0; padding: 10px 16px; border-radius: 12px; font-size: 11px; letter-spacing: 0.6px; text-transform: uppercase; }
.bn-prog { height: 7px; border-radius: 999px; overflow: hidden; background: rgba(0,0,0,0.45); box-shadow: inset 0 1px 2px rgba(0,0,0,0.6); }
.bn-prog > div { height: 100%; background: linear-gradient(90deg, #2ee08a, #f6c945); box-shadow: 0 0 10px rgba(46,224,138,0.6); transition: width 0.4s ease; }
.bn-empty { border-radius: 18px; padding: 38px 18px; text-align: center; }
.bn-empty-cta { margin-top: 14px; padding: 11px 22px; border-radius: 999px; border: none; cursor: pointer; font-size: 12px; font-weight: 900; letter-spacing: 0.5px; color: #042a15;
  background: linear-gradient(180deg, #2ee08a, #12a04f 58%, #0a7a3c); box-shadow: 0 5px 16px rgba(46,224,138,0.4); }
.bn-reward { border-radius: 18px; padding: 16px; cursor: pointer; background: linear-gradient(160deg, rgba(11,74,51,0.55), rgba(4,29,19,0.72)); border: 1px solid rgba(246,201,69,0.42); box-shadow: inset 0 1.5px 0 rgba(255,244,214,0.14), 0 10px 24px -8px rgba(0,0,0,0.6); transition: transform 0.14s ease; }
.bn-reward:active { transform: scale(0.97); }
@keyframes bn-spin { to { transform: rotate(360deg); } }
.bn-spin { animation: bn-spin 1s linear infinite; }
/* Animated treasure gift in header + wiggling featured-offer icons */
.bn-gift { font-size: 22px; display: inline-block; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.5)); animation: bn-giftbounce 2.4s ease-in-out infinite; transform-origin: 50% 90%; }
@keyframes bn-giftbounce { 0%,100% { transform: translateY(0) rotate(-6deg) scale(1); } 45% { transform: translateY(-5px) rotate(6deg) scale(1.08); } 60% { transform: translateY(0) rotate(-3deg) scale(0.97); } }
.bn-offer-ic { display: inline-block; animation: bn-offerwiggle 3.4s ease-in-out infinite; }
.bn-offer:nth-child(2n) .bn-offer-ic { animation-delay: -1.1s; }
.bn-offer:nth-child(3n) .bn-offer-ic { animation-delay: -2.2s; }
@keyframes bn-offerwiggle { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-3px) rotate(4deg); } }
@media (prefers-reduced-motion: reduce) { .bn-gift, .bn-offer-ic, .bn-offer-shine { animation: none !important; } }
/* Rich featured offers */
.bn-offer { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: flex-start; gap: 1px; padding: 13px 14px; min-height: 92px; border: none; border-radius: 16px; cursor: pointer; color: #fff; text-align: left; font-family: inherit;
  box-shadow: 0 8px 20px -6px rgba(0,0,0,0.5), inset 0 1.5px 0 rgba(255,255,255,0.22), inset 0 -14px 26px rgba(0,0,0,0.35); transition: transform .12s ease, box-shadow .2s ease; }
.bn-offer:active { transform: translateY(2px) scale(0.98); }
.bn-offer:hover { box-shadow: 0 10px 24px -6px rgba(0,0,0,0.6), 0 0 18px -2px rgba(46,230,130,0.4), inset 0 1.5px 0 rgba(255,255,255,0.25); }
.bn-offer-shine { position: absolute; top: 0; left: -60%; width: 40%; height: 100%; transform: skewX(-20deg); pointer-events: none; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent); animation: bn-shine 4.2s ease-in-out infinite; }
@keyframes bn-shine { 0% { left: -60%; } 55%,100% { left: 130%; } }
/* Rich glass icon badges — alive top icon set (spinning gold ring + glow + float) */
.bn-offer-ic { position: absolute; top: 10px; right: 11px; z-index: 2; width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px; font-size: 22px; opacity: 1; isolation: isolate;
  background: radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.18), transparent 55%), linear-gradient(160deg, rgba(255,255,255,0.10), rgba(0,0,0,0.30));
  box-shadow: 0 0 0 1px rgba(245,180,35,0.42), inset 0 1.5px 0 rgba(255,255,255,0.32), inset 0 -6px 12px rgba(0,0,0,0.32), 0 6px 16px -6px rgba(245,180,35,0.4);
  animation: bn-icfloat 3.4s ease-in-out infinite, bn-icglow 2.8s ease-in-out infinite; will-change: transform, filter; }
/* spinning gold→emerald glamour ring (masked border, sits behind the glyph) */
.bn-offer-ic::before { content: ''; position: absolute; inset: -1px; z-index: -1; border-radius: 13px; padding: 2px;
  background: conic-gradient(from 0deg, #ffd678, rgba(255,214,120,0) 90deg, rgba(107,245,163,0) 180deg, #6be7b3 250deg, rgba(255,214,120,0) 320deg, #ffd678);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude;
  animation: bn-icspin 3.6s linear infinite; }
.bn-offer:nth-child(2n) .bn-offer-ic { animation-delay: -1.1s, -1.4s; }
.bn-offer:nth-child(2n) .bn-offer-ic::before { animation-delay: -1.8s; }
@keyframes bn-icfloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
@keyframes bn-icglow { 0%,100% { filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4)); } 50% { filter: drop-shadow(0 0 8px rgba(110,231,183,0.8)) brightness(1.08); } }
@keyframes bn-icspin { to { transform: rotate(360deg); } }
.bn-offer-k { position: relative; z-index: 2; font-size: 14px; font-weight: 900; margin-top: 22px; }
.bn-offer-s { position: relative; z-index: 2; font-size: 9.5px; font-weight: 700; color: rgba(255,255,255,0.8); }
.bn-offer-cta { position: relative; z-index: 2; margin-top: 8px; font-size: 9px; font-weight: 900; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 999px; background: rgba(0,0,0,0.32); color: #d6ffe9; }
@media (prefers-reduced-motion: reduce) { .bn-offer-shine { animation: none; } }

/* ── Live Events connection UI ── */
.bn-evhead { display: inline-flex; align-items: center; gap: 7px; color: #ff6b6b; }
.bn-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #ff4d4d; box-shadow: 0 0 8px #ff4d4d; animation: bn-livepulse 1.3s ease-in-out infinite; }
@keyframes bn-livepulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.45; transform: scale(0.78); } }

.bn-ev-hero { position: relative; overflow: hidden; width: 100%; display: flex; align-items: center; gap: 13px; padding: 15px 16px; border: none; border-radius: 18px; cursor: pointer; text-align: left; color: #fff;
  background: radial-gradient(120% 130% at 100% 0%, rgba(255,190,60,0.22), transparent 55%), linear-gradient(150deg, #0c3320, #0f8a44);
  box-shadow: 0 12px 28px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,190,60,0.5), 0 0 22px -4px rgba(46,230,130,0.5), inset 0 1.5px 0 rgba(255,255,255,0.2);
  animation: bn-evglow 3s ease-in-out infinite; will-change: box-shadow; }
@keyframes bn-evglow {
  0%,100% { box-shadow: 0 12px 28px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,190,60,0.5), 0 0 22px -4px rgba(46,230,130,0.45), inset 0 1.5px 0 rgba(255,255,255,0.2); }
  50%     { box-shadow: 0 12px 28px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,200,61,0.85), 0 0 30px -2px rgba(46,230,130,0.75), inset 0 1.5px 0 rgba(255,255,255,0.2); } }
.bn-ev-hero:active { transform: scale(0.985); }
.bn-ev-badge { position: absolute; top: 10px; right: 12px; z-index: 3; font-size: 8.5px; font-weight: 900; letter-spacing: 0.8px; padding: 3px 8px; border-radius: 999px; color: #fff;
  background: linear-gradient(180deg, #ff5a5a, #c81e1e); box-shadow: 0 2px 8px -1px rgba(255,60,60,0.6); animation: bn-livepulse 1.6s ease-in-out infinite; }
.bn-ev-hero-ic { position: relative; z-index: 2; flex: 0 0 auto; width: 52px; height: 52px; display: grid; place-items: center; font-size: 34px; isolation: isolate;
  filter: drop-shadow(0 3px 6px rgba(0,0,0,0.5)); animation: bn-evfloat 3.2s ease-in-out infinite; }
@keyframes bn-evfloat { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-3px) rotate(4deg); } }
/* spinning glamour halo behind the trophy */
.bn-ev-hero-ic::before { content: ''; position: absolute; inset: -4px; z-index: -1; border-radius: 50%; pointer-events: none;
  background: conic-gradient(from 0deg, rgba(255,214,120,0.9), transparent 70deg, transparent 180deg, rgba(107,245,163,0.75) 250deg, transparent 320deg, rgba(255,214,120,0.9));
  filter: blur(3px); opacity: 0.8; animation: bn-icspin 4.4s linear infinite; }
.bn-ev-hero-body { position: relative; z-index: 2; flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.bn-ev-hero-k { font-size: 16px; font-weight: 900; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
.bn-ev-hero-s { font-size: 10.5px; font-weight: 700; color: rgba(214,255,233,0.85); }
.bn-ev-hero-cta { position: relative; z-index: 2; flex: 0 0 auto; font-size: 12px; font-weight: 900; padding: 8px 14px; border-radius: 999px; color: #06180f;
  background: radial-gradient(120% 100% at 50% 8%, #fff6d8, transparent 55%), linear-gradient(180deg, #ffd24d, #b8860b); box-shadow: 0 4px 12px -3px rgba(255,190,60,0.6), inset 0 1.5px 0 rgba(255,255,255,0.6); }

.bn-ev-tag { position: absolute; top: 8px; right: 8px; z-index: 3; display: inline-flex; align-items: center; gap: 4px; font-size: 7.5px; font-weight: 900; letter-spacing: 0.6px; padding: 3px 7px; border-radius: 999px; color: #fff; background: rgba(200,30,30,0.85); box-shadow: 0 2px 6px -1px rgba(255,60,60,0.5); }
.bn-ev-tag .bn-live-dot { width: 5px; height: 5px; }
@media (prefers-reduced-motion: reduce) { .bn-live-dot, .bn-ev-hero, .bn-ev-badge, .bn-ev-hero-ic, .bn-ev-hero-ic::before, .bn-offer-ic::before { animation: none !important; } }
`;

export default function DtxPromotionsPage() {
  useDtxBalance();
  const navigate = useNavigate();
  const balance = useDtxStore((s) => s.balance);
  const { active, completed, totalActiveAmount, loading: loadingClaims, refetch } = useBonusClaims();

  const [tab, setTab] = useState<Tab>("active");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoadingCampaigns(true);
      try {
        const { data, error } = await supabase.rpc("list_promotions_with_status");
        if (error) throw error;
        // Normalise every field to a safe primitive — the render must never
        // touch an undefined the RPC didn't return.
        const rows: Campaign[] = ((data ?? []) as any[]).slice(0, 20).map((r) => ({
          id: String(r?.id ?? ""),
          name: String(r?.name ?? "Bonus"),
          amount: Number(r?.amount ?? 0),
          percentage: Number(r?.percentage ?? 0),
          wagering_requirement: Number(r?.wagering_requirement ?? 0),
          min_deposit: Number(r?.min_deposit ?? 0),
          max_bonus: Number(r?.max_bonus ?? 0),
          claimed: Boolean(r?.claimed),
        }));
        setCampaigns(rows);
      } catch {
        setCampaigns([]);
      } finally {
        setLoadingCampaigns(false);
      }
    })();
  }, []);

  const claim = async (c: Campaign) => {
    setClaiming(c.id);
    try {
      const { error } = await supabase.rpc("claim_promotion", { p_campaign_id: c.id });
      if (error) throw error;
      toast.success(`${c.name} claimed`);
      await refetch();
      setTab("active");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not claim bonus");
    } finally {
      setClaiming(null);
    }
  };

  const tabCount = (id: Tab) => (id === "active" ? active.length : id === "history" ? completed.length : campaigns.length);

  return (
    <div className="c7p-page" style={{ minHeight: "100dvh", color: "#fff", paddingBottom: "calc(128px + env(safe-area-inset-bottom, 0px))", position: "relative" }}>
      <style>{CSS}</style>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 520, margin: "0 auto" }}>
        {/* Header */}
        <header className="bn-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="c7p-pg-back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/v3/rewards"))} aria-label="Back"><ArrowLeft size={18} /></button>
            <span style={{ width: 4, height: 22, borderRadius: 2, background: "linear-gradient(180deg, #f6c945, #2ee08a)" }} />
            <div>
              <h1 className="bn-title c7p-title tt-gold">Bonuses</h1>
              <div style={{ fontSize: 10, color: "rgba(230,246,236,0.55)", fontWeight: 700, marginTop: 1 }}>Promotions, missions &amp; rewards</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="bn-gift" aria-hidden="true"><C7Asset slot="icon.promotions" size={26} fallback={<C7Icon name="gift" size={22} />} /></span>
            <span className="bn-bal"><C7Icon name="coin" size={13} /> ${Number(balance ?? 0).toFixed(2)}</span>
          </div>
        </header>

        {/* Stat row */}
        <section style={{ padding: "14px 16px 0", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9 }}>
          <div className="c7p-glass bn-stat"><div className="bn-stat-l">Active</div><div className="bn-stat-v" style={{ color: "#2ee08a" }}>{active.length}</div></div>
          <div className="c7p-glass bn-stat"><div className="bn-stat-l">Locked</div><div className="bn-stat-v" style={{ color: "#6bf5a3" }}>${totalActiveAmount.toFixed(0)}</div></div>
          <div className="c7p-glass bn-stat"><div className="bn-stat-l">Claimed</div><div className="bn-stat-v">{completed.length}</div></div>
        </section>

        {/* Events, Wheel, VIP, Refer & Leaderboard live in the Rewards hub now —
            this page is the dedicated Daily Bonus / bonus engine. */}

        {/* Tabs */}
        <div className="bn-tabs">
          {TABS.map((tb) => (
            <button key={tb.id} className={`bn-tab${tab === tb.id ? " bn-tab--on" : ""}`} onClick={() => setTab(tb.id)}>
              {tb.label}<span className="bn-tab__c">{tabCount(tb.id)}</span>
            </button>
          ))}
        </div>

        {/* Active */}
        {tab === "active" && (
          <div style={{ padding: "14px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
            {loadingClaims && Array.from({ length: 3 }).map((_, i) => <div key={i} className="c7p-skel c7p-skel--card" style={{ height: 104 }} />)}
            {!loadingClaims && active.length === 0 && (
              <div className="c7p-glass bn-empty">
                <Sparkles size={26} style={{ color: "#2ee08a" }} />
                <div style={{ fontSize: 15, fontWeight: 800, marginTop: 10 }}>No active bonuses</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 5 }}>Claim an available bonus to start your wagering progress.</div>
                <button className="bn-empty-cta" onClick={() => setTab("available")}>Browse bonuses</button>
              </div>
            )}
            {active.map((b) => {
              const pct = b.wagering_req > 0 ? Math.min(100, (b.wagered_so_far / b.wagering_req) * 100) : 0;
              return (
                <div key={b.id} className="c7p-glass bn-card bn-card--mint">
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.campaign_name ?? "Bonus"}</div>
                      <div className="bn-mini" style={{ marginTop: 3 }}>Status · {b.status}</div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#6bf5a3", fontVariantNumeric: "tabular-nums" }}>${b.amount.toFixed(2)}</div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 5, fontVariantNumeric: "tabular-nums" }}>
                      <span>Wagering</span><span>${b.wagered_so_far.toFixed(0)} / ${b.wagering_req.toFixed(0)}</span>
                    </div>
                    <div className="bn-prog"><div style={{ width: `${pct}%` }} /></div>
                    <div style={{ fontSize: 10, color: "#2ee08a", fontWeight: 900, marginTop: 6, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{pct.toFixed(0)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Available */}
        {tab === "available" && (
          <div style={{ padding: "14px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
            {loadingCampaigns && Array.from({ length: 3 }).map((_, i) => <div key={i} className="c7p-skel c7p-skel--card" style={{ height: 104 }} />)}
            {!loadingCampaigns && campaigns.length === 0 && (
              <div className="c7p-glass bn-empty">
                <Gift size={26} style={{ color: "#6bf5a3" }} />
                <div style={{ fontSize: 15, fontWeight: 800, marginTop: 10 }}>No bonuses right now</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 5 }}>Check back later for new promotions, missions and deposit boosts.</div>
                <button className="bn-empty-cta" onClick={() => navigate("/v3/games")}>Go to games</button>
              </div>
            )}
            {campaigns.map((c) => (
              <div key={c.id} className="c7p-glass bn-card bn-card--gold">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ display: "flex" }}><C7Icon name="gift" size={24} /></div>
                      <div style={{ fontSize: 14, fontWeight: 900 }}>{c.name}</div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(255,255,255,0.5)" }}>
                      <span>{c.percentage > 0
                        ? <>Up to <b style={{ color: "#6bf5a3" }}>{c.percentage}%</b></>
                        : <>Up to <b style={{ color: "#6bf5a3" }}>${c.amount.toFixed(0)}</b></>}</span>
                      {c.wagering_requirement > 0 && <span>{c.wagering_requirement}× wager</span>}
                      {c.min_deposit > 0 && <span>Min ${c.min_deposit.toFixed(0)}</span>}
                    </div>
                  </div>
                  <button className="c7p-btn-gold bn-claim" onClick={() => claim(c)} disabled={claiming === c.id || c.claimed}>
                    {claiming === c.id ? "…" : c.claimed ? "Claimed" : "Claim"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History */}
        {tab === "history" && (
          <div style={{ padding: "14px 16px 0", display: "flex", flexDirection: "column", gap: 9 }}>
            {completed.length === 0 ? (
              <div className="c7p-glass bn-empty">
                <Inbox size={26} style={{ color: "rgba(255,255,255,0.45)" }} />
                <div style={{ fontSize: 15, fontWeight: 800, marginTop: 10 }}>No completed bonuses</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 5 }}>Once a bonus finishes wagering or expires, it shows up here.</div>
              </div>
            ) : completed.map((b) => (
              <div key={b.id} className="c7p-glass bn-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.campaign_name ?? "Bonus"}</div>
                    <div className="bn-mini" style={{ marginTop: 3 }}>{b.status}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#6bf5a3", fontVariantNumeric: "tabular-nums" }}>${b.amount.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}

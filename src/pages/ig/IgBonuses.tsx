// IgBonuses (/bonuses) — Instagram-light Promotions & Bonuses. Ported from the
// dark DtxPromotionsPage: presentation only. All data hooks, state, effects,
// the claim handler and the list_promotions_with_status / claim_promotion RPCs
// are copied verbatim — only JSX + CSS are reskinned to the IG-light system.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Gift, Inbox, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDtxBalance } from "@/hooks/useDtxBalance";
import { useDtxStore } from "@/store/dtxStore";
import { useBonusClaims } from "@/hooks/useBonusClaims";
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";

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

export default function IgBonuses() {
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
    <div className="ig igbon">
      <style>{CSS}</style>

      <header className="ig-top">
        <button className="igbon-back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/ig/rewards"))} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="ig-ttl">Promotions</span>
        <span style={{ width: 22 }} />
      </header>

      <main className="ig-main igbon-main">
        {/* Balance + at-a-glance stats */}
        <section className="igbon-stats">
          <div className="igbon-stat">
            <div className="igbon-stat-l">Active</div>
            <div className="igbon-stat-v grn">{active.length}</div>
          </div>
          <div className="igbon-stat">
            <div className="igbon-stat-l">Locked</div>
            <div className="igbon-stat-v grn">${totalActiveAmount.toFixed(0)}</div>
          </div>
          <div className="igbon-stat">
            <div className="igbon-stat-l">Claimed</div>
            <div className="igbon-stat-v">{completed.length}</div>
          </div>
        </section>
        <div className="igbon-bal"><span className="igbon-bal-l">Balance</span><span className="igbon-bal-v">${Number(balance ?? 0).toFixed(2)}</span></div>

        {/* Tabs */}
        <div className="igbon-tabs">
          {TABS.map((tb) => (
            <button key={tb.id} className={`igbon-tab${tab === tb.id ? " on" : ""}`} onClick={() => setTab(tb.id)}>
              {tb.label}<span className="igbon-tab-c">{tabCount(tb.id)}</span>
            </button>
          ))}
        </div>

        {/* Active */}
        {tab === "active" && (
          <div className="igbon-list">
            {loadingClaims && Array.from({ length: 3 }).map((_, i) => <div key={i} className="igbon-skel" />)}
            {!loadingClaims && active.length === 0 && (
              <div className="igbon-empty">
                <Sparkles size={26} className="igbon-empty-ic grn" />
                <div className="igbon-empty-t">No active bonuses</div>
                <div className="igbon-empty-s">Claim an available bonus to start your wagering progress.</div>
                <button className="igbon-empty-cta" onClick={() => setTab("available")}>Browse bonuses</button>
              </div>
            )}
            {active.map((b) => {
              const pct = b.wagering_req > 0 ? Math.min(100, (b.wagered_so_far / b.wagering_req) * 100) : 0;
              return (
                <div key={b.id} className="igbon-card">
                  <div className="igbon-card-top">
                    <div className="igbon-card-hd">
                      <div className="igbon-card-name">{b.campaign_name ?? "Bonus"}</div>
                      <div className="igbon-mini">Status · {b.status}</div>
                    </div>
                    <div className="igbon-amt grn">${b.amount.toFixed(2)}</div>
                  </div>
                  <div className="igbon-prog-wrap">
                    <div className="igbon-prog-row">
                      <span>Wagering</span><span>${b.wagered_so_far.toFixed(0)} / ${b.wagering_req.toFixed(0)}</span>
                    </div>
                    <div className="igbon-prog"><div style={{ width: `${pct}%` }} /></div>
                    <div className="igbon-prog-pct">{pct.toFixed(0)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Available */}
        {tab === "available" && (
          <div className="igbon-list">
            {loadingCampaigns && Array.from({ length: 3 }).map((_, i) => <div key={i} className="igbon-skel" />)}
            {!loadingCampaigns && campaigns.length === 0 && (
              <div className="igbon-empty">
                <Gift size={26} className="igbon-empty-ic grn" />
                <div className="igbon-empty-t">No bonuses right now</div>
                <div className="igbon-empty-s">Check back later for new promotions, missions and deposit boosts.</div>
                <button className="igbon-empty-cta" onClick={() => navigate("/ig/explore")}>Go to games</button>
              </div>
            )}
            {campaigns.map((c) => (
              <div key={c.id} className="igbon-card igbon-card--gold">
                <div className="igbon-card-top">
                  <div className="igbon-card-hd">
                    <div className="igbon-card-name-row">
                      <Gift size={20} className="igbon-gift" />
                      <div className="igbon-card-name">{c.name}</div>
                    </div>
                    <div className="igbon-terms">
                      <span>{c.percentage > 0
                        ? <>Up to <b className="grn">{c.percentage}%</b></>
                        : <>Up to <b className="grn">${c.amount.toFixed(0)}</b></>}</span>
                      {c.wagering_requirement > 0 && <span>{c.wagering_requirement}× wager</span>}
                      {c.min_deposit > 0 && <span>Min ${c.min_deposit.toFixed(0)}</span>}
                    </div>
                  </div>
                  <button className="igbon-claim" onClick={() => claim(c)} disabled={claiming === c.id || c.claimed}>
                    {claiming === c.id ? "…" : c.claimed ? "Claimed" : "Claim"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History */}
        {tab === "history" && (
          <div className="igbon-list">
            {completed.length === 0 ? (
              <div className="igbon-empty">
                <Inbox size={26} className="igbon-empty-ic mut" />
                <div className="igbon-empty-t">No completed bonuses</div>
                <div className="igbon-empty-s">Once a bonus finishes wagering or expires, it shows up here.</div>
              </div>
            ) : completed.map((b) => (
              <div key={b.id} className="igbon-card">
                <div className="igbon-card-top igbon-card-top--center">
                  <div className="igbon-card-hd">
                    <div className="igbon-card-name">{b.campaign_name ?? "Bonus"}</div>
                    <div className="igbon-mini">{b.status}</div>
                  </div>
                  <div className="igbon-amt grn">${b.amount.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <IgSocialNotice variant="card" />
      </main>

      <IgTabBar active="profile" />
    </div>
  );
}

const CSS = `
.ig { --bg:#07130d; --card:#103524; --card2:#12492f; --line:rgba(240,201,74,0.26); --ink:#eafff4; --mut:#93c3aa; --grn:#2ee08a; --grn2:#0e7a4a; --gold:#f0c94a; --gold3:#c68a2e; --loss:#ff6b7d;
  min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif; padding-bottom:76px;
  background: radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%), linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%); background-attachment:fixed; }
.ig * { box-sizing:border-box; }
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:52px; padding:0 12px;
  background:linear-gradient(180deg, rgba(9,32,20,0.92), rgba(9,32,20,0.62)); -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); }
.igbon-back { background:none; border:none; color:#d6ffe9; cursor:pointer; display:grid; place-items:center; width:40px; height:40px; }
.ig-ttl { font-size:18px; font-weight:800; color:#f3ffe9; }
.ig-main { max-width:560px; margin:0 auto; }
.igbon-main { padding:14px 12px; display:flex; flex-direction:column; gap:12px; }

.grn { color:var(--grn); }
.mut { color:var(--mut); }

.igbon-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; }
.igbon-stat { background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line); border-radius:14px; padding:12px 10px;
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igbon-stat-l { font-size:9.5px; text-transform:uppercase; letter-spacing:0.9px; color:var(--mut); font-weight:800; }
.igbon-stat-v { font-size:20px; font-weight:900; margin-top:4px; color:#f3ffe9; font-variant-numeric:tabular-nums; }

/* Balance — hero row: emerald glow + one controlled gold glint, gold-gradient value */
.igbon-bal { position:relative; overflow:hidden; display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border:1px solid var(--line); border-radius:16px;
  background:radial-gradient(120% 120% at 0% 0%, rgba(240,201,74,0.14), transparent 55%), linear-gradient(160deg,#12492f,#06180f);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igbon-bal::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(105deg, transparent 40%, rgba(246,230,176,0.1) 50%, transparent 60%); }
.igbon-bal-l { font-size:11px; text-transform:uppercase; letter-spacing:0.8px; font-weight:800; color:var(--mut); z-index:1; }
.igbon-bal-v { font-size:18px; font-weight:900; font-variant-numeric:tabular-nums; z-index:1;
  background:linear-gradient(180deg,#fff6d5,#f0c94a 60%,#c68a2e); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }

.igbon-tabs { display:flex; gap:7px; }
.igbon-tab { flex:1; min-height:40px; padding:8px 6px; border-radius:999px; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; color:#eafff4; border:1px solid var(--line); background:rgba(9,32,20,0.6); font-family:inherit; }
.igbon-tab.on { color:#0a2410; border-color:transparent; background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); box-shadow:inset 0 1px 0 rgba(255,255,255,0.5); }
.igbon-tab-c { display:inline-block; margin-left:6px; font-size:10px; font-weight:800; padding:1px 6px; border-radius:999px; background:rgba(0,0,0,0.24); }
.igbon-tab.on .igbon-tab-c { background:rgba(10,36,16,0.24); }

.igbon-list { display:flex; flex-direction:column; gap:10px; }

.igbon-card { background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line); border-radius:16px; padding:14px;
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igbon-card--gold { position:relative; overflow:hidden; border-color:rgba(240,201,74,0.4);
  background:radial-gradient(120% 120% at 100% 0%, rgba(240,201,74,0.12), transparent 55%), linear-gradient(160deg,#12492f,#06180f); }
.igbon-card--gold::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(105deg, transparent 42%, rgba(246,230,176,0.09) 50%, transparent 58%); }
.igbon-card-top { position:relative; z-index:1; display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.igbon-card-top--center { align-items:center; }
.igbon-card-hd { min-width:0; flex:1; }
.igbon-card-name-row { display:flex; align-items:center; gap:8px; }
.igbon-gift { color:#ffe9a8; flex-shrink:0; }
.igbon-card-name { font-size:14px; font-weight:900; color:#f3ffe9; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.igbon-mini { font-size:10px; text-transform:uppercase; letter-spacing:0.8px; color:var(--mut); font-weight:800; margin-top:3px; }
.igbon-amt { font-size:16px; font-weight:900; font-variant-numeric:tabular-nums; flex-shrink:0; }

.igbon-terms { display:flex; flex-wrap:wrap; gap:12px; margin-top:8px; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:var(--mut); font-weight:700; }
.igbon-terms b { font-weight:900; }

/* Primary CTA — emerald bevel */
.igbon-claim { flex-shrink:0; min-height:40px; padding:10px 18px; border-radius:11px; border:none; cursor:pointer; font-size:11px; font-weight:800; letter-spacing:0.5px; text-transform:uppercase; color:#0a2410; font-family:inherit;
  background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); box-shadow:inset 0 1px 0 rgba(255,255,255,0.5), 0 6px 14px -6px rgba(46,224,138,0.5); }
.igbon-claim:active { transform:translateY(1px); }
.igbon-claim:disabled { opacity:0.5; cursor:default; background:rgba(9,32,20,0.6); border:1px solid var(--line); color:var(--mut); box-shadow:none; transform:none; }

.igbon-prog-wrap { position:relative; z-index:1; margin-top:12px; }
.igbon-prog-row { display:flex; justify-content:space-between; font-size:10px; color:var(--mut); margin-bottom:5px; font-weight:700; font-variant-numeric:tabular-nums; }
.igbon-prog { height:7px; border-radius:999px; overflow:hidden; background:rgba(0,0,0,0.35); border:1px solid rgba(240,201,74,0.14); }
.igbon-prog > div { height:100%; background:linear-gradient(90deg,#0e7a4a,#2ee08a); box-shadow:0 0 10px -2px rgba(46,224,138,0.6); transition:width 0.4s ease; }
.igbon-prog-pct { font-size:10px; color:var(--grn); font-weight:900; margin-top:6px; text-align:right; font-variant-numeric:tabular-nums; }

/* Empty / Coming-Soon — premium emerald card, gold-accent icon */
.igbon-empty { text-align:center; border:1px solid var(--line); border-radius:16px; padding:40px 20px;
  background:radial-gradient(120% 100% at 50% 0%, rgba(240,201,74,0.08), transparent 60%), linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92));
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igbon-empty-ic { display:inline-block; }
.igbon-empty-t { font-size:15px; font-weight:800; color:#f3ffe9; margin-top:10px; }
.igbon-empty-s { font-size:12px; color:var(--mut); margin-top:5px; }
.igbon-empty-cta { min-height:40px; margin-top:14px; padding:10px 22px; border-radius:999px; border:none; cursor:pointer; font-size:12px; font-weight:800; color:#0a2410; font-family:inherit;
  background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); box-shadow:inset 0 1px 0 rgba(255,255,255,0.5), 0 6px 14px -6px rgba(46,224,138,0.5); }
.igbon-empty-cta:active { transform:translateY(1px); }

.igbon-skel { height:104px; border-radius:16px; border:1px solid var(--line);
  background:linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.1), rgba(255,255,255,0.04)), linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92));
  background-size:200% 100%, 100% 100%; animation:igbon-sh 1.2s linear infinite; }
@keyframes igbon-sh { 0% { background-position:200% 0, 0 0; } 100% { background-position:-200% 0, 0 0; } }
@media (prefers-reduced-motion: reduce) { .igbon-skel { animation:none; } .igbon-prog > div { transition:none; } }
`;

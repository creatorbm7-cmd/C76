// IgContribution (/ig/contribution) — the user's own C74 Contribution Score,
// premium luxury-dark (emerald + antique gold). A cinematic composition ring +
// breakdown of genuine activity. Read-only; NO earnings promise — actual C74 depends
// on availability, caps and the reserve.
//
// PRESENTATION ONLY. Data source unchanged: the real RPC c74_my_contribution(). The
// ring and the per-signal share % are a truthful composition of the returned breakdown
// (each signal's fraction of the total) — no next-tier target or payout value is
// invented, because the RPC does not return one.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { num as fmt } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Sparkles, Info, Gamepad2, Heart, ShieldCheck, Users, Crown, RefreshCw, AlertCircle } from "lucide-react";
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";

interface Part { label: string; raw: number; weight: number; points: number; }
interface Contribution {
  score: number; tier: string; multiplier: number; eligible: boolean;
  breakdown: Part[]; note: string;
}

const ICONS: Record<string, JSX.Element> = {
  "Gameplay (wager)": <Gamepad2 size={16} />,
  "Loyalty (energy)": <Heart size={16} />,
  "Reputation": <ShieldCheck size={16} />,
  "Referrals": <Users size={16} />,
  "VIP": <Crown size={16} />,
};

// Emerald-family segment palette (gold is reserved for values/CTAs, not data segments).
const SEG = ["#39e896", "#5fe3a6", "#0e9a5a", "#8fd9b0", "#2f9e6c", "#1f6f4a"];
const R = 52, CIRC = 2 * Math.PI * R;

export default function IgContribution() {
  const nav = useNavigate();
  const [data, setData] = useState<Contribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRevealed(false);
    const { data, error } = await (supabase.rpc as any)("c74_my_contribution");
    if (error) setError(error.message || "Couldn’t load your score.");
    else if (data) setData(data as Contribution);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!data) return;
    const r = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(r);
  }, [data]);

  const total = useMemo(
    () => (data ? Math.max(1, data.breakdown.reduce((s, p) => s + Math.max(0, p.points), 0)) : 1),
    [data],
  );
  const maxPoints = data ? Math.max(1, ...data.breakdown.map((p) => p.points)) : 1;

  // Truthful composition ring — each signal's arc ∝ its share of the total points.
  const segments = useMemo(() => {
    if (!data) return [] as { color: string; dash: string; offset: number }[];
    let acc = 0;
    return data.breakdown.map((p, i) => {
      const len = (Math.max(0, p.points) / total) * CIRC;
      const seg = { color: SEG[i % SEG.length], dash: `${Math.max(0, len - 2.5)} ${CIRC - Math.max(0, len - 2.5)}`, offset: -acc };
      acc += len;
      return seg;
    });
  }, [data, total]);

  return (
    <div className="igco">
      <style>{CSS}</style>

      <header className="igco-top">
        <button className="igco-ic" onClick={() => (window.history.length > 1 ? nav(-1) : nav("/ig"))} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="igco-ttl">Contribution</span>
        <button className="igco-ic" onClick={load} disabled={loading} aria-label="Refresh"><RefreshCw size={18} className={loading ? "igco-spin" : ""} /></button>
      </header>

      <main className="igco-main">
        {loading ? (
          <div className="igco-skel" aria-hidden="true">
            <div className="igco-hero"><div className="igco-sk igco-sk-ring" />
              <div className="igco-sk" style={{ width: 150, height: 22, borderRadius: 999, marginTop: 18 }} /></div>
            <div className="igco-sk" style={{ width: 170, height: 12, margin: "24px 2px 12px" }} />
            <div className="igco-panel igco-brk">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="igco-row">
                  <span className="igco-sk" style={{ width: 40, height: 40, borderRadius: 12 }} />
                  <div className="igco-rtx">
                    <div className="igco-sk" style={{ width: "56%", height: 12, marginBottom: 9 }} />
                    <div className="igco-sk" style={{ width: "100%", height: 6, borderRadius: 6 }} />
                    <div className="igco-sk" style={{ width: "32%", height: 9, marginTop: 8 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="igco-state">
            <div className="igco-state-ic"><AlertCircle size={26} /></div>
            <p className="igco-state-t">Couldn’t load your score</p>
            <p className="igco-state-s">{error}</p>
            <button className="igco-retry" onClick={load}><RefreshCw size={15} /> Try again</button>
          </div>
        ) : !data ? (
          <div className="igco-state">
            <div className="igco-state-ic igco-state-ic--mut"><Sparkles size={26} /></div>
            <p className="igco-state-t">No score yet</p>
            <p className="igco-state-s">Sign in and start playing to build your Contribution Score.</p>
          </div>
        ) : (
          <>
            {/* Hero — cinematic composition ring */}
            <div className="igco-hero">
              <div className="igco-ring">
                <span className="igco-halo" aria-hidden="true" />
                <svg width="188" height="188" viewBox="0 0 120 120">
                  <g transform="rotate(-90 60 60)">
                    <circle className="igco-trk" cx="60" cy="60" r={R} />
                    {revealed && segments.map((s, i) => (
                      <circle key={i} cx="60" cy="60" r={R} fill="none" stroke={s.color} strokeWidth="10"
                        strokeLinecap="round" strokeDasharray={s.dash} strokeDashoffset={s.offset} className="igco-seg" />
                    ))}
                  </g>
                </svg>
                <span className="igco-disc" aria-hidden="true" />
                <div className="igco-center">
                  <span className="igco-clbl">Contribution</span>
                  <span className="igco-score igco-gold">{fmt(data.score)}</span>
                  <span className={`igco-elig ${data.eligible ? "on" : ""}`}>{data.eligible ? "● eligible" : "○ warming up"}</span>
                </div>
              </div>
              <div className="igco-under">
                <span className={`igco-tier igco-tier--${data.tier.toLowerCase()}`}><Crown size={11} strokeWidth={2.5} /> {data.tier}</span>
                <span className="igco-mult">{data.multiplier.toFixed(2)}× reward tier</span>
              </div>
              <span className="igco-nopay">Not a payout · sets your reward tier</span>
            </div>

            <div className="igco-note"><Info size={14} /><span>{data.note}</span></div>

            <div className="igco-sec">How your score is built</div>
            <div className="igco-panel igco-brk">
              {data.breakdown.map((p, i) => {
                const share = Math.round((Math.max(0, p.points) / total) * 100);
                const lead = p.points === maxPoints;
                return (
                  <div key={p.label} className={`igco-row${lead ? " igco-row--lead" : ""}`}>
                    <span className="igco-bic" style={{ color: SEG[i % SEG.length], boxShadow: lead ? `inset 0 0 0 1px ${SEG[i % SEG.length]}55` : undefined }}>{ICONS[p.label] ?? <Sparkles size={16} />}</span>
                    <div className="igco-rtx">
                      <div className="igco-rtop"><b>{p.label}</b><span className="igco-pts">{fmt(p.points)}<i className="igco-share">{share}%</i></span></div>
                      <div className="igco-bar"><span style={{ width: revealed ? `${Math.max(3, (p.points / maxPoints) * 100)}%` : "0%", background: `linear-gradient(90deg, var(--emd-deep), ${SEG[i % SEG.length]})` }} /></div>
                      <small>{fmt(p.raw)} × {p.weight}</small>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="igco-foot">Play fair, complete missions, keep your streak and invite real friends to grow your score. It’s not a guaranteed payout — it sets your reward tier when C74 rewards are available.</p>
          </>
        )}
        <IgSocialNotice variant="line" />
      </main>

      <IgTabBar active="profile" />
    </div>
  );
}

const CSS = `
.igco { --bg:#040b07; --ink:#f0fff7; --mut:#83b39c; --faint:#5f8b76;
  --emd:#2ee08a; --emd-deep:#0e7a4a; --gold:#f0c94a; --gold-lite:#fff4cf; --gold-deep:#c68a2e; --antique:#e8c877;
  --loss:#ff6b7d; --line:rgba(240,201,74,0.22); --hair:rgba(255,255,255,0.06);
  min-height:100vh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif;
  padding-bottom:calc(78px + env(safe-area-inset-bottom,0px)); -webkit-tap-highlight-color:transparent;
  background:
    radial-gradient(90% 40% at 50% -6%, rgba(240,201,74,.10), transparent 55%),
    radial-gradient(120% 65% at 50% -4%, rgba(33,86,60,.82), transparent 58%),
    linear-gradient(180deg,#0c3320 0%, #06170e 46%, #030b07 100%); background-attachment:fixed; }
.igco * { box-sizing:border-box; }
.igco-top { position:sticky; top:0; z-index:9; display:flex; align-items:center; justify-content:space-between; height:54px; padding:0 8px 0 12px;
  background:linear-gradient(180deg, rgba(7,24,15,.95), rgba(7,24,15,.5)); -webkit-backdrop-filter:blur(16px); backdrop-filter:blur(16px);
  border-bottom:1px solid var(--line); box-shadow:0 1px 0 rgba(240,201,74,.16), 0 10px 26px -18px rgba(0,0,0,.8); }
.igco-ic { background:none; border:none; color:#cdead9; cursor:pointer; display:grid; place-items:center; width:38px; height:38px; border-radius:11px; transition:background .18s, transform .12s; }
.igco-ic:hover { background:rgba(255,255,255,.05); }
.igco-ic:active { transform:scale(.9); }
.igco-ic:disabled { opacity:.55; }
.igco-ttl { font-size:18px; font-weight:800; letter-spacing:.01em; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.igco-main { max-width:560px; margin:0 auto; padding:20px 16px 34px; }
.igco-spin { animation:igco-spin 1s linear infinite; }
@keyframes igco-spin { to { transform:rotate(360deg); } }

.igco-gold { background:linear-gradient(100deg,var(--gold-lite) 0%,#ffe9a8 22%,#f7d868 46%,#e0a93a 62%,#ffe9a8 82%,var(--gold-lite) 100%);
  background-size:220% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; animation:igco-gs 6.5s ease-in-out infinite; }
@keyframes igco-gs { 0%,100% { background-position:0 0; } 50% { background-position:100% 0; } }

/* ── Cinematic ring ── */
.igco-hero { display:flex; flex-direction:column; align-items:center; padding:8px 0 4px; }
.igco-ring { position:relative; width:188px; height:188px; display:grid; place-items:center; animation:igco-pop .7s cubic-bezier(.22,1,.36,1) both; }
@keyframes igco-pop { from { opacity:0; transform:scale(.88); } to { opacity:1; transform:none; } }
.igco-halo { position:absolute; inset:-10px; border-radius:50%; z-index:0; pointer-events:none;
  background:radial-gradient(circle at 50% 42%, rgba(46,224,138,.26), rgba(240,201,74,.09) 52%, transparent 70%);
  filter:blur(9px); animation:igco-breathe 5.5s ease-in-out infinite; }
@keyframes igco-breathe { 0%,100% { opacity:.75; transform:scale(1); } 50% { opacity:1; transform:scale(1.04); } }
.igco-ring svg { position:relative; z-index:1; display:block; }
.igco-trk { fill:none; stroke:rgba(255,255,255,.055); stroke-width:10; }
.igco-seg { transition:stroke-dashoffset .85s cubic-bezier(.22,1,.36,1); filter:drop-shadow(0 0 5px rgba(46,224,138,.4)); }
.igco-disc { position:absolute; z-index:1; width:120px; height:120px; border-radius:50%; pointer-events:none;
  background:radial-gradient(130% 130% at 50% 22%, rgba(20,60,40,.92), rgba(4,12,8,.97));
  box-shadow:inset 0 2px 10px rgba(0,0,0,.65), inset 0 0 0 1px rgba(240,201,74,.16), 0 0 22px -6px rgba(0,0,0,.7); }
.igco-center { position:absolute; z-index:2; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; }
.igco-clbl { font-size:9px; letter-spacing:.24em; text-transform:uppercase; color:var(--faint); font-weight:700; }
.igco-score { font-size:46px; font-weight:900; letter-spacing:-.025em; line-height:1; font-variant-numeric:tabular-nums; }
.igco-elig { font-size:9.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--faint); font-weight:700; }
.igco-elig.on { color:var(--emd); }

.igco-under { display:flex; align-items:center; gap:9px; margin-top:16px; }
.igco-tier { position:relative; overflow:hidden; display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:800; letter-spacing:.03em; padding:5px 13px 5px 11px; border-radius:999px; color:#3a2708;
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 52%,var(--gold-deep)); border:1px solid rgba(255,255,255,.35);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.7), inset 0 -2px 4px rgba(120,80,10,.3), 0 6px 16px -6px rgba(240,201,74,.6); }
.igco-tier svg { opacity:.85; }
.igco-tier::after { content:""; position:absolute; inset:0; background:linear-gradient(105deg, transparent 42%, rgba(255,255,255,.6) 50%, transparent 58%); transform:translateX(-150%); animation:igco-seal 6.5s ease-in-out infinite; }
@keyframes igco-seal { 0%,74% { transform:translateX(-150%); } 88%,100% { transform:translateX(150%); } }
.igco-tier--diamond { color:#0a2740; background:linear-gradient(180deg,#eafaff,#8fe0ff 52%,#3aa0d8); }
.igco-tier--platinum { color:#231a40; background:linear-gradient(180deg,#f5f2ff,#c9b8ff 52%,#7d5ce0); }
.igco-tier--silver { color:#2a333a; background:linear-gradient(180deg,#f7fafc,#cbd5db 52%,#8a99a3); }
.igco-tier--bronze { color:#3a220e; background:linear-gradient(180deg,#ffe9cf,#e0a878 52%,#a86a3a); }
.igco-mult { font-size:12px; font-weight:600; color:var(--mut); }
.igco-nopay { margin-top:12px; font-size:9.5px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--faint);
  padding:4px 12px; border-radius:999px; border:1px solid var(--hair); background:rgba(255,255,255,.02); }

.igco-note { display:flex; gap:9px; align-items:flex-start; margin:18px 0 0; padding:12px 14px; border-radius:14px; font-size:11.5px; line-height:1.5;
  background:linear-gradient(180deg, rgba(240,201,74,.07), rgba(240,201,74,.03)); border:1px solid rgba(240,201,74,.22); color:var(--antique); }
.igco-note svg { flex:0 0 auto; margin-top:1px; }
.igco-sec { display:flex; align-items:center; gap:10px; margin:26px 2px 12px; font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:var(--faint); font-weight:700; }
.igco-sec::before { content:""; width:14px; height:1px; background:var(--gold-deep); }
.igco-sec::after { content:""; flex:1; height:1px; background:linear-gradient(90deg,var(--line),transparent); }

/* ── Breakdown panel + hierarchy ── */
.igco-panel { position:relative; border-radius:20px; overflow:hidden; border:1px solid transparent;
  background:linear-gradient(165deg, rgba(19,60,40,.92), rgba(6,20,13,.96));
  box-shadow:inset 0 0 0 1.3px rgba(240,201,74,.38), inset 0 1.4px 0 rgba(255,255,255,.12), inset 0 0 34px rgba(46,224,138,.06), 0 26px 50px -28px rgba(0,0,0,.92); }
.igco-brk { padding:6px 0; }
.igco-row { position:relative; display:flex; gap:14px; padding:14px 16px; align-items:center; }
.igco-row + .igco-row { border-top:1px solid var(--hair); }
.igco-row--lead { background:linear-gradient(90deg, rgba(240,201,74,.055), transparent 44%); }
.igco-row--lead::before { content:""; position:absolute; left:0; top:9px; bottom:9px; width:3px; border-radius:0 3px 3px 0; background:linear-gradient(180deg,var(--gold),var(--gold-deep)); }
.igco-bic { flex:0 0 auto; width:40px; height:40px; border-radius:12px; display:grid; place-items:center;
  background:radial-gradient(120% 120% at 50% 12%, rgba(46,224,138,.17), rgba(6,24,15,.45)); border:1px solid var(--line); }
.igco-rtx { flex:1; min-width:0; }
.igco-rtop { display:flex; justify-content:space-between; align-items:baseline; gap:10px; }
.igco-rtop b { font-size:13.5px; font-weight:700; color:var(--ink); letter-spacing:-.005em; }
.igco-row--lead .igco-rtop b { font-size:14.5px; font-weight:800; }
.igco-pts { display:inline-flex; align-items:baseline; gap:6px; font-size:13px; font-weight:800; color:var(--antique); font-variant-numeric:tabular-nums; }
.igco-share { font-size:9.5px; font-weight:700; font-style:normal; color:var(--faint); letter-spacing:.02em; }
.igco-bar { height:6px; border-radius:6px; background:rgba(0,0,0,.42); margin:9px 0 3px; overflow:hidden; box-shadow:inset 0 1px 2px rgba(0,0,0,.5); }
.igco-bar > span { display:block; height:100%; border-radius:6px; box-shadow:0 0 8px rgba(46,224,138,.4); transition:width .8s cubic-bezier(.22,1,.36,1); }
.igco-rtx small { font-size:10px; color:var(--faint); font-variant-numeric:tabular-nums; }
.igco-foot { font-size:11.5px; color:var(--faint); line-height:1.6; margin:18px 4px 0; }

/* ── States ── */
.igco-state { text-align:center; padding:60px 24px; display:flex; flex-direction:column; align-items:center; gap:9px; }
.igco-state-ic { width:64px; height:64px; border-radius:50%; display:grid; place-items:center; margin-bottom:6px; color:var(--loss);
  background:radial-gradient(120% 120% at 50% 20%, rgba(255,107,125,.2), rgba(6,20,13,.4)); border:1px solid rgba(255,107,125,.35);
  box-shadow:0 0 30px -8px rgba(255,107,125,.4); }
.igco-state-ic--mut { color:var(--emd); background:radial-gradient(120% 120% at 50% 20%, rgba(46,224,138,.18), rgba(6,20,13,.4)); border-color:var(--line); box-shadow:0 0 30px -8px rgba(46,224,138,.4); }
.igco-state-t { font-size:18px; font-weight:800; color:var(--ink); margin:0; }
.igco-state-s { font-size:12.5px; color:var(--mut); margin:0; max-width:264px; line-height:1.5; }
.igco-retry { margin-top:16px; display:inline-flex; align-items:center; gap:7px; font-size:13px; font-weight:800; color:#3a2708; border:1px solid rgba(255,255,255,.35); border-radius:13px; padding:12px 22px; cursor:pointer;
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 52%,var(--gold-deep)); box-shadow:inset 0 1px 0 rgba(255,255,255,.7), 0 10px 22px -8px rgba(240,201,74,.55); transition:filter .18s, transform .12s; }
.igco-retry:hover { filter:brightness(1.06); }
.igco-retry:active { transform:translateY(1px); }

/* ── Skeleton ── */
.igco-sk { position:relative; overflow:hidden; border-radius:9px; background:linear-gradient(100deg, rgba(255,255,255,.04) 30%, rgba(255,255,255,.09) 50%, rgba(255,255,255,.04) 70%); background-size:200% 100%; animation:igco-shim 1.4s ease-in-out infinite; }
.igco-sk-ring { width:188px; height:188px; border-radius:50%; }
@keyframes igco-shim { from { background-position:200% 0; } to { background-position:-200% 0; } }

@media (prefers-reduced-motion: reduce) {
  .igco-gold, .igco-spin, .igco-sk, .igco-ring, .igco-halo, .igco-seg, .igco-tier::after { animation:none !important; }
  .igco-bar > span, .igco-seg, .igco-ic, .igco-retry { transition:none !important; }
}
`;

// IgReputation (/ig/... C74 Reputation) — luxury-dark "top-tier" reskin of the
// C74 trust-score page. Presentation only: same useReputation hook
// (server-computed get_c74_reputation RPC, read-only), the same REP_TIERS /
// REP_PERKS tables, the same real figures, and the same navigation. No wallet /
// ledger / payment / withdrawal logic touched; no real-money enablement.
// Deep-forest + emerald + antique-gold cabinet: cinematic score gauge (halo +
// depth disc), gold tier seal, gold-framed sheened panels. Reduced-motion safe.
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, RotateCw } from "lucide-react";
import { useReputation, REP_TIERS, REP_PERKS } from "@/hooks/useReputation";
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";

export default function IgReputation() {
  const navigate = useNavigate();
  const { rep, loading, error, reload } = useReputation();

  const score = rep?.score ?? 0;
  const max = rep?.max ?? 1000;
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const tierIdx = rep?.tier_idx ?? 0;
  const perks = REP_PERKS[tierIdx] ?? [];

  // gauge arc geometry (270° sweep)
  const R = 80, C = 2 * Math.PI * R, sweep = 0.75;
  const fill = C * sweep * (pct / 100);

  return (
    <div className="ig igrep">
      <style>{CSS}</style>

      <header className="ig-top">
        <button className="igrep-back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/ig/c74"))} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="ig-ttl">Reputation</span>
        <button className="igrep-refresh" onClick={() => reload()} disabled={loading} aria-label="Refresh">
          <RotateCw size={18} className={loading ? "igrep-spin" : ""} />
        </button>
      </header>

      <main className="ig-main igrep-main">
        {loading && !rep ? (
          <div className="igrep-skel">
            <div className="igrep-skel-hero" />
            <div className="igrep-skel-row" />
            <div className="igrep-skel-card" />
            <div className="igrep-skel-card" />
          </div>
        ) : error && !rep ? (
          <div className="igrep-empty">
            <div className="igrep-empty-em">⚠️</div>
            <div className="igrep-empty-t">Couldn’t load your reputation</div>
            <div className="igrep-empty-s">Check your connection and try again.</div>
            <button className="igrep-retry" onClick={() => reload()}>Retry</button>
          </div>
        ) : (
          <>
            {/* Score gauge — cinematic emerald cabinet with gold tier seal */}
            <section className="igrep-hero">
              <div className="igrep-badge">🛡️ C74 Trust Score</div>
              <div className="igrep-gauge">
                <svg viewBox="0 0 180 180" className="igrep-svg">
                  <circle cx="90" cy="90" r={R} className="igrep-track"
                    strokeDasharray={`${C * sweep} ${C}`} strokeDashoffset={0} transform="rotate(135 90 90)" strokeLinecap="round" />
                  <circle cx="90" cy="90" r={R} className="igrep-fill"
                    strokeDasharray={`${fill} ${C}`} strokeDashoffset={0} transform="rotate(135 90 90)" strokeLinecap="round" />
                </svg>
                <div className="igrep-center">
                  <span className="igrep-tier-ic">{rep?.tier_icon ?? "🌱"}</span>
                  <span className="igrep-score">{score}</span>
                  <span className="igrep-max">/ {max}</span>
                </div>
              </div>
              <div className="igrep-tier-name">{rep?.tier ?? "Newcomer"}</div>
              {rep?.next_at != null && (
                <div className="igrep-next">{Math.max(0, rep.next_at - score)} pts to {REP_TIERS[tierIdx + 1]?.name ?? "next tier"}</div>
              )}
            </section>

            {/* Tier ladder */}
            <section className="igrep-sect">
              <div className="igrep-sec"><span>🪜</span> Reputation Tiers</div>
              <div className="igrep-tiers">
                {REP_TIERS.map((t) => {
                  const reached = score >= t.at;
                  const current = t.idx === tierIdx;
                  return (
                    <div key={t.idx} className={`igrep-t${reached ? " reached" : ""}${current ? " current" : ""}`} title={t.name}>
                      <span className="igrep-t-ic">{t.icon}</span>
                      <span className="igrep-t-name">{t.name}</span>
                      <span className="igrep-t-at">{t.at}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Factor breakdown */}
            <section className="igrep-sect">
              <div className="igrep-sec"><span>📊</span> How it’s scored</div>
              <div className="igrep-card">
                {(rep?.factors ?? []).map((f) => {
                  const fpct = Math.max(0, Math.min(100, (f.pts / f.max) * 100));
                  return (
                    <div key={f.key} className="igrep-f">
                      <div className="igrep-f-top">
                        <span className="igrep-f-ic">{f.icon}</span>
                        <span className="igrep-f-label">{f.label}</span>
                        <span className="igrep-f-detail">{f.detail}</span>
                        <span className="igrep-f-pts">{f.pts}/{f.max}</span>
                      </div>
                      <div className="igrep-f-bar"><i style={{ width: `${fpct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Perks */}
            <section className="igrep-sect">
              <div className="igrep-sec"><span>🎁</span> {rep?.tier ?? "Newcomer"} Perks</div>
              <div className="igrep-perks">
                {perks.map((p, i) => <div key={i} className="igrep-perk"><span>✦</span> {p}</div>)}
              </div>
            </section>

            {/* Roadmap note */}
            <section className="igrep-note">
              <b>🛡️ Reputation → Token</b>
              <p>Your reputation is the trust layer beneath the C74 Token. After launch it maps to airdrop weight and governance voice — the more you’re trusted today, the more you earn in the ecosystem tomorrow.</p>
            </section>

            <button className="igrep-cta" onClick={() => navigate("/v3")}>🚀 Boost my reputation</button>
            <p className="igrep-fine">Reputation is computed from your real activity. Verify KYC, keep a daily streak, and play fair to climb.</p>
          </>
        )}
        <IgSocialNotice variant="line" />
      </main>

      <IgTabBar active="wallet" />
    </div>
  );
}

const CSS = `
.ig { --bg:#07130d; --card:#103524; --card2:#12492f; --line:rgba(240,201,74,0.24); --hair:rgba(255,255,255,0.06); --ink:#f0fff7; --mut:#93c3aa; --faint:#5f8b76; --grn:#2ee08a; --grn2:#0e7a4a; --gold:#f0c94a; --gold-lite:#fff4cf; --gold-deep:#c68a2e; --antique:#e8c877; --loss:#ff6b7d;
  min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif; padding-bottom:calc(76px + env(safe-area-inset-bottom));
  background: radial-gradient(90% 40% at 50% -6%, rgba(240,201,74,0.08), transparent 55%), radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%), linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%); background-attachment:fixed; }
.ig * { box-sizing:border-box; }
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:54px; padding:0 8px 0 12px; background:linear-gradient(180deg, rgba(9,32,20,0.95), rgba(9,32,20,0.55)); -webkit-backdrop-filter:blur(16px); backdrop-filter:blur(16px); border-bottom:1px solid var(--line); box-shadow:0 1px 0 rgba(240,201,74,0.16); }
.igrep-back, .igrep-refresh { background:none; border:none; color:#cdead9; cursor:pointer; display:grid; place-items:center; width:38px; height:38px; border-radius:11px; }
.igrep-refresh:disabled { opacity:0.6; cursor:default; }
.igrep-refresh:active { background:rgba(240,201,74,0.1); }
.ig-ttl { font-size:18px; font-weight:800; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.ig-main { max-width:560px; margin:0 auto; }
.igrep-main { padding:16px 12px; display:flex; flex-direction:column; gap:14px; }
.igrep-spin { animation:igrep-spin 1s linear infinite; }
@keyframes igrep-spin { to { transform:rotate(360deg); } }

/* Skeleton */
.igrep-skel { display:flex; flex-direction:column; gap:14px; }
.igrep-skel-hero, .igrep-skel-row, .igrep-skel-card { border-radius:18px; background:linear-gradient(100deg, rgba(18,63,41,0.7) 30%, rgba(46,224,138,0.09) 50%, rgba(18,63,41,0.7) 70%); background-size:220% 100%; animation:igrep-sh 1.4s ease-in-out infinite; border:1px solid var(--hair); }
.igrep-skel-hero { height:280px; } .igrep-skel-row { height:78px; } .igrep-skel-card { height:120px; }
@keyframes igrep-sh { 0%{background-position:180% 0;} 100%{background-position:-80% 0;} }

.igrep-empty { text-align:center; color:var(--mut); padding:48px 20px; border-radius:18px; background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line); box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igrep-empty-em { font-size:38px; margin-bottom:10px; }
.igrep-empty-t { font-size:15px; font-weight:800; color:#f3ffe9; margin-bottom:4px; }
.igrep-empty-s { font-size:12.5px; }
.igrep-retry { margin-top:14px; padding:10px 22px; border-radius:999px; border:none; color:#0a2410; font-weight:800; font-size:13px; cursor:pointer; background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); box-shadow:inset 0 1px 0 rgba(255,255,255,0.5), 0 6px 14px -6px rgba(46,224,138,0.5); }
.igrep-retry:active { transform:translateY(1px); }

/* Score hero — cinematic emerald cabinet, gold frame + sheen sweep + halo */
.igrep-hero { position:relative; overflow:hidden; text-align:center; padding:20px 16px 22px; border-radius:22px; border:1px solid transparent;
  background:radial-gradient(130% 120% at 50% 0%, rgba(240,201,74,0.16), transparent 56%), radial-gradient(120% 120% at 50% 8%, rgba(46,224,138,0.16), transparent 60%), linear-gradient(160deg,#123f29,#06180f);
  box-shadow:inset 0 0 0 1.4px rgba(240,201,74,0.46), inset 0 1.6px 0 rgba(255,255,255,0.22), inset 0 0 30px rgba(46,224,138,0.09), 0 0 26px -8px rgba(240,201,74,0.42), 0 24px 48px -22px rgba(0,0,0,0.88); }
.igrep-hero::after { content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(105deg, transparent 42%, rgba(255,244,207,0.13) 50%, transparent 58%); transform:translateX(-150%); animation:igrep-sweep 7s ease-in-out infinite; }
@keyframes igrep-sweep { 0%,74% { transform:translateX(-150%); } 90%,100% { transform:translateX(150%); } }
.igrep-badge { position:relative; z-index:1; display:inline-flex; align-items:center; gap:6px; font-size:10.5px; font-weight:900; letter-spacing:0.1em; text-transform:uppercase; padding:5px 13px; border-radius:999px; color:var(--antique); background:rgba(4,16,10,0.55); border:1px solid var(--line); margin-bottom:8px; }
.igrep-gauge { position:relative; width:190px; height:190px; margin:0 auto; z-index:1; }
.igrep-gauge::before { content:""; position:absolute; inset:14px; border-radius:50%; background:radial-gradient(circle at 50% 42%, rgba(46,224,138,0.22), transparent 62%); filter:blur(6px); }
.igrep-svg { position:relative; width:100%; height:100%; }
.igrep-track { fill:none; stroke:rgba(4,16,10,0.7); stroke-width:12; }
.igrep-fill { fill:none; stroke:var(--grn); stroke-width:12; filter:drop-shadow(0 0 7px rgba(46,224,138,0.55)); transition:stroke-dasharray .9s cubic-bezier(.2,.85,.25,1); }
.igrep-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0; }
.igrep-tier-ic { font-size:26px; filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5)); }
.igrep-score { font-size:46px; font-weight:900; line-height:1; font-variant-numeric:tabular-nums; background:linear-gradient(100deg,var(--gold-lite) 0%,#ffe9a8 30%,#f7d868 50%,#e0a93a 66%,var(--gold-lite) 100%); background-size:220% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; animation:igrep-gold 5.5s ease-in-out infinite; }
@keyframes igrep-gold { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
.igrep-max { font-size:12px; font-weight:800; color:var(--mut); }
.igrep-tier-name { position:relative; z-index:1; margin-top:10px; display:inline-block; font-size:14px; font-weight:900; letter-spacing:0.4px; color:#3a2708; padding:7px 22px; border-radius:999px; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.7), inset 0 -3px 7px rgba(120,74,20,0.22), 0 0 18px -3px rgba(240,201,74,0.6), 0 8px 18px -8px rgba(0,0,0,0.6); }
.igrep-next { position:relative; z-index:1; margin-top:9px; font-size:12px; font-weight:800; color:var(--grn); }

.igrep-sect { display:flex; flex-direction:column; gap:9px; }
.igrep-sec { display:flex; align-items:center; gap:7px; margin:0 4px; font-size:11px; letter-spacing:0.8px; font-weight:800; text-transform:uppercase; color:#f3ffe9; }
.igrep-sec span { font-size:13px; }

.igrep-tiers { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; }
.igrep-t { display:flex; flex-direction:column; align-items:center; gap:3px; padding:11px 4px; border-radius:13px; opacity:0.48; background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--hair); box-shadow:inset 0 1px 0 rgba(246,230,176,0.08); }
.igrep-t.reached { opacity:1; border-color:var(--line); }
.igrep-t.current { opacity:1; border-color:transparent; box-shadow:inset 0 0 0 1.4px var(--gold), inset 0 1px 0 rgba(255,255,255,0.18), 0 0 16px -6px rgba(240,201,74,0.7); }
.igrep-t-ic { font-size:19px; }
.igrep-t-name { font-size:9.5px; font-weight:800; color:var(--ink); }
.igrep-t-at { font-size:9px; font-weight:700; color:var(--mut); font-variant-numeric:tabular-nums; }

.igrep-card { display:flex; flex-direction:column; gap:12px; padding:16px; border-radius:20px; background:linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96)); border:1px solid transparent; box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.38), inset 0 1.5px 0 rgba(255,255,255,0.12), inset 0 0 30px rgba(46,224,138,0.06), 0 24px 48px -28px rgba(0,0,0,0.9); }
.igrep-f-top { display:flex; align-items:center; gap:8px; font-size:12.5px; }
.igrep-f-ic { font-size:15px; }
.igrep-f-label { font-weight:800; color:#f3ffe9; }
.igrep-f-detail { flex:1; font-size:10.5px; color:var(--mut); text-align:right; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.igrep-f-pts { font-weight:900; color:var(--grn); font-variant-numeric:tabular-nums; font-size:11.5px; min-width:44px; text-align:right; }
.igrep-f-bar { margin-top:6px; height:7px; border-radius:999px; background:rgba(4,16,10,0.7); overflow:hidden; }
.igrep-f-bar i { display:block; height:100%; border-radius:999px; background:linear-gradient(90deg,var(--grn),var(--gold)); box-shadow:0 0 8px -1px rgba(46,224,138,0.5); transition:width .8s cubic-bezier(.2,.85,.25,1); }

.igrep-perks { display:flex; flex-direction:column; gap:9px; padding:15px 16px; border-radius:20px; background:linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96)); border:1px solid transparent; box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.38), inset 0 1.5px 0 rgba(255,255,255,0.12), 0 24px 48px -28px rgba(0,0,0,0.9); }
.igrep-perk { display:flex; align-items:center; gap:9px; font-size:13px; font-weight:700; color:var(--ink); }
.igrep-perk span { color:var(--gold); }

.igrep-note { position:relative; overflow:hidden; padding:15px 16px; border-radius:20px; border:1px solid transparent; box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.4), inset 0 1.5px 0 rgba(255,255,255,0.13), 0 24px 48px -28px rgba(0,0,0,0.9);
  background:radial-gradient(120% 120% at 0% 0%, rgba(240,201,74,0.15), transparent 55%), linear-gradient(160deg,#12492f,#06180f); }
.igrep-note b { font-size:13px; color:#f3ffe9; font-weight:900; }
.igrep-note p { margin:5px 0 0; font-size:12px; line-height:1.5; color:#dbeee2; }

.igrep-cta { width:100%; margin-top:2px; padding:15px; font-size:15px; font-weight:900; border-radius:14px; cursor:pointer; border:1px solid rgba(255,255,255,0.3); color:#3a2708; font-family:inherit; -webkit-tap-highlight-color:transparent;
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.7), inset 0 -3px 7px rgba(120,74,20,0.22), 0 0 18px -3px rgba(240,201,74,0.6), 0 9px 20px -9px rgba(0,0,0,0.6); }
.igrep-cta:active { transform:translateY(1px); }
.igrep-fine { text-align:center; font-size:11px; color:var(--mut); margin:2px 0 0; }

@media (prefers-reduced-motion: reduce) {
  .igrep-spin, .igrep-hero::after, .igrep-score, .igrep-skel-hero, .igrep-skel-row, .igrep-skel-card { animation:none; }
  .igrep-cta:active, .igrep-retry:active { transform:none; }
  .igrep-score { -webkit-text-fill-color:var(--gold); }
}
`;

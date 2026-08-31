// IgMining (/ig/mining) — Instagram-light skin of the C74 Play Mining screen.
// Presentation-only reskin of the dark PlayMining: same display of useMining()
// (the get_mining_status RPC — earning rate, daily cap, VIP multiplier, streak
// bonus, ranks) plus the useC74 wager rate. No writes, no logic changes.
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { num as fmt } from "@/lib/format";
import { useMining, MINING_LEVELS } from "@/hooks/useMining";
import { useC74 } from "@/hooks/useC74";
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";

const fmtC = (n: number) => fmt(Math.round(n));
// Show a whole rate as an integer, a fractional rate trimmed (e.g. 1 → "1", 1.5 → "1.5").
const fmtRate = (n: number) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)));

export default function IgMining() {
  const nav = useNavigate();
  const { status, loading, error, reload } = useMining();
  // The real per-$1 wager earn rate is server config (get_c74_summary), not a
  // fixed UI literal — so it can never drift from what admin actually sets.
  const { summary } = useC74();
  const wagerRate = summary?.config?.wager_earn_per_usdt;

  const cap = status?.daily_cap ?? 500;
  const today = status?.today_mined ?? 0;
  const pct = Math.max(0, Math.min(100, status?.progress_pct ?? 0));
  const remaining = status?.remaining ?? cap;
  const lifetime = status?.lifetime ?? 0;
  const lvlIdx = status?.level_idx ?? 0;
  const vipMult = status?.vip_mult ?? 1;
  const streak = status?.streak_days ?? 0;
  const capped = remaining <= 0;

  return (
    <div className="ig igmine">
      <style>{CSS}</style>

      <header className="ig-top">
        <button className="igm-back" onClick={() => (window.history.length > 1 ? nav(-1) : nav("/ig/c74"))} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="ig-ttl">C74 Mining</span>
        <span style={{ width: 22 }} />
      </header>

      <main className="ig-main igm-main">
        {loading && !status ? (
          <div className="igm-loading"><Loader2 className="igm-spin" size={26} /></div>
        ) : error && !status ? (
          <div className="igm-error">
            <div className="igm-err-em">⚠️</div>
            <div className="igm-err-t">Couldn’t load your mining status</div>
            <div className="igm-err-s">Check your connection and try again.</div>
            <button className="igm-retry" onClick={() => reload()}>Retry</button>
          </div>
        ) : (
          <>
            {/* Earning-rate hero — daily progress toward the cap */}
            <section className="igm-hero">
              <div className="igm-rank">{MINING_LEVELS[lvlIdx]?.icon} {status?.level_name ?? "Bronze Miner"}</div>
              <div className="igm-today">{fmtC(today)}</div>
              <div className="igm-today-cap">of {fmtC(cap)} C74 mined today</div>
              <div className="igm-bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
                <span className={`igm-bar-fill${capped ? " capped" : ""}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="igm-bar-row">
                <span>{Math.round(pct)}% of daily cap</span>
                <span className={`igm-remain${capped ? " capped" : ""}`}>{capped ? "🔒 Cap reached" : `${fmtC(remaining)} left`}</span>
              </div>
            </section>

            {/* Active boosts */}
            <div className="igm-sec">Active Boosts</div>
            <section className="igm-stats">
              <div className="igm-stat">
                <span className="igm-stat-v">{wagerRate != null ? `${fmtRate(wagerRate)}` : "—"}</span>
                <span className="igm-stat-l">C74 per $1 wager</span>
              </div>
              <div className="igm-stat gold">
                <span className="igm-stat-v">×{vipMult.toFixed(2)}</span>
                <span className="igm-stat-l">VIP multiplier</span>
              </div>
              <div className="igm-stat gold">
                <span className="igm-stat-v">🔥 {streak}</span>
                <span className="igm-stat-l">day streak</span>
              </div>
            </section>

            {/* Mining ranks ladder */}
            <div className="igm-sec">Mining Ranks</div>
            <section className="igm-levels">
              {MINING_LEVELS.map((lv) => {
                const reached = lifetime >= lv.at;
                const current = lv.idx === lvlIdx;
                return (
                  <div key={lv.idx} className={`igm-lv${reached ? " reached" : ""}${current ? " current" : ""}`}>
                    <span className="igm-lv-ic">{lv.icon}</span>
                    <span className="igm-lv-name">{lv.name}</span>
                    <span className="igm-lv-at">{lv.at === 0 ? "Start" : `${fmtC(lv.at)}+ C74`}</span>
                    {current && <span className="igm-lv-tag">You</span>}
                    {reached && !current && <span className="igm-lv-check">✓</span>}
                  </div>
                );
              })}
              {status?.level_next_at != null && (
                <div className="igm-next">{fmtC(Math.max(0, status.level_next_at - lifetime))} C74 to next rank</div>
              )}
            </section>

            {/* Lifetime totals */}
            <section className="igm-life">
              <div><span className="igm-life-k">Total mined (lifetime)</span><span className="igm-life-v">⛏️ {fmtC(lifetime)} C74</span></div>
              <div><span className="igm-life-k">C74 balance</span><span className="igm-life-v">🪙 {fmtC(status?.balance ?? 0)}</span></div>
            </section>

            {/* What C74 does now */}
            <section className="igm-note">
              <b>⚡ What your C74 does now</b>
              <p>Mined C74 is usable today — it helps cover your withdrawal network fees, and your mining rank &amp; streak power your progress across the C7 ecosystem. Keep mining every day to build your stack.</p>
            </section>

            {/* Roadmap note — clearly future */}
            <section className="igm-note soon">
              <b>💎 Coming with the token launch <em>Soon</em></b>
              <p>After on-chain launch, C74 adds market value, swap / trade and staking perks — same balance you’re building now, new powers.</p>
            </section>

            <button className="igm-play" onClick={() => nav("/v3")}>🎮 Play &amp; Mine C74</button>
            <p className="igm-fine">Not real crypto mining — a play-to-earn reward system. C74 are internal reward points today (already usable toward withdrawal fees); on-chain utility arrives at token launch.</p>
          </>
        )}

        <IgSocialNotice variant="line" />
      </main>

      <IgTabBar active="wallet" />
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
.igm-back { background:none; border:none; color:#d6ffe9; cursor:pointer; display:grid; place-items:center; }
.ig-ttl { font-size:18px; font-weight:800; color:#f3ffe9; }
.ig-main { max-width:560px; margin:0 auto; }
.igm-main { padding:14px 12px; display:flex; flex-direction:column; gap:14px; }

/* Loading / error */
.igm-loading { display:flex; justify-content:center; padding:64px 0; color:var(--grn); }
.igm-spin { animation:igm-spin 1s linear infinite; }
@keyframes igm-spin { to { transform:rotate(360deg); } }
.igm-error { text-align:center; color:var(--mut); padding:48px 20px 40px; margin:6px 0; border-radius:18px;
  background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igm-err-em { font-size:38px; margin-bottom:10px; filter:drop-shadow(0 2px 8px rgba(240,201,74,0.4)); }
.igm-err-t { font-size:15px; font-weight:800; color:#f3ffe9; margin-bottom:4px; }
.igm-err-s { font-size:12.5px; }
.igm-retry { margin-top:16px; padding:11px 22px; border-radius:999px; border:none; cursor:pointer; font-weight:800; font-size:13px; color:#0a2410;
  background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); box-shadow:inset 0 1px 0 rgba(255,255,255,0.5), 0 6px 14px -6px rgba(46,224,138,0.5); }
.igm-retry:active { transform:translateY(1px); }

/* Earning-rate hero — marquee, emerald glow + one gold glint */
.igm-hero { position:relative; overflow:hidden; border-radius:18px; padding:22px 18px; text-align:center;
  background:radial-gradient(130% 120% at 50% 0%, rgba(46,224,138,0.18), transparent 58%), linear-gradient(160deg,#123f29,#06180f);
  border:1px solid var(--line); box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igm-hero::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(105deg, transparent 40%, rgba(246,230,176,0.1) 50%, transparent 60%); }
.igm-rank { position:relative; z-index:1; display:inline-block; font-size:12px; font-weight:900; color:#3a2708; padding:5px 13px; border-radius:999px; margin-bottom:14px;
  background:radial-gradient(120% 120% at 50% 22%, #fff3c8, #f0c94a 52%, #c68a2e 100%); border:1px solid #7a5a1e; box-shadow:inset 0 1px 0 rgba(255,255,255,0.6); }
.igm-today { position:relative; z-index:1; font-size:46px; font-weight:900; line-height:1; letter-spacing:-1px; font-variant-numeric:tabular-nums;
  background:linear-gradient(180deg,#fff6d5,#f0c94a 60%,#c68a2e); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.igm-today-cap { position:relative; z-index:1; font-size:12.5px; font-weight:700; color:var(--mut); margin-top:7px; }
.igm-bar { position:relative; z-index:1; height:10px; border-radius:999px; background:rgba(4,20,12,0.7); overflow:hidden; margin:16px 0 8px; border:1px solid var(--line); }
.igm-bar-fill { position:absolute; left:0; top:0; bottom:0; border-radius:999px; transition:width .8s cubic-bezier(.2,.85,.25,1);
  background:linear-gradient(90deg,#0e7a4a,#2ee08a); box-shadow:0 0 12px -2px rgba(46,224,138,0.7); }
.igm-bar-fill.capped { background:linear-gradient(90deg,#c68a2e,#f0c94a); box-shadow:0 0 12px -2px rgba(240,201,74,0.7); }
.igm-bar-row { position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; font-size:11.5px; font-weight:800; color:var(--mut); }
.igm-remain { color:var(--grn); }
.igm-remain.capped { color:var(--gold); }

/* Section labels */
.igm-sec { margin:2px 4px -4px; font-size:11px; letter-spacing:0.8px; font-weight:800; text-transform:uppercase; color:#f3ffe9; }

/* Boost stat cards — emerald glass */
.igm-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
.igm-stat { display:flex; flex-direction:column; align-items:center; gap:4px; padding:16px 8px; border-radius:14px; text-align:center;
  background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igm-stat.gold { background:radial-gradient(120% 120% at 50% 0%, rgba(240,201,74,0.16), transparent 60%), linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); }
.igm-stat-v { font-size:19px; font-weight:900; color:#f3ffe9; font-variant-numeric:tabular-nums; }
.igm-stat.gold .igm-stat-v { color:var(--gold); }
.igm-stat-l { font-size:10px; font-weight:700; color:var(--mut); line-height:1.25; }

/* Ranks ladder — premium rows */
.igm-levels { display:flex; flex-direction:column; gap:8px; padding:12px; border-radius:16px;
  background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igm-lv { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:11px; background:rgba(9,32,20,0.55); border:1px solid transparent; opacity:0.5; }
.igm-lv.reached { opacity:1; border-color:var(--line); }
.igm-lv.current { opacity:1; border:1px solid var(--line);
  background:radial-gradient(120% 120% at 0% 0%, rgba(240,201,74,0.16), transparent 55%), linear-gradient(160deg,#12492f,#06180f); }
.igm-lv-ic { font-size:22px; }
.igm-lv-name { flex:1; font-size:13.5px; font-weight:800; color:#f3ffe9; }
.igm-lv-at { font-size:11px; font-weight:700; color:var(--mut); font-variant-numeric:tabular-nums; }
.igm-lv-tag { font-size:10px; font-weight:900; color:#3a2708; padding:3px 9px; border-radius:999px;
  background:radial-gradient(120% 120% at 50% 22%, #fff3c8, #f0c94a 52%, #c68a2e 100%); box-shadow:inset 0 1px 0 rgba(255,255,255,0.5); }
.igm-lv-check { color:var(--grn); font-weight:900; }
.igm-next { text-align:center; font-size:11.5px; font-weight:800; color:var(--gold); padding-top:2px; }

/* Lifetime */
.igm-life { display:flex; justify-content:space-between; gap:10px; padding:14px 16px; border-radius:14px;
  background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igm-life > div { display:flex; flex-direction:column; gap:3px; }
.igm-life > div:last-child { text-align:right; }
.igm-life-k { font-size:10.5px; font-weight:700; color:var(--mut); text-transform:uppercase; letter-spacing:0.5px; }
.igm-life-v { font-size:17px; font-weight:900; color:#f3ffe9; font-variant-numeric:tabular-nums; }

/* Notes */
.igm-note { padding:14px 16px; border-radius:14px;
  background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igm-note b { font-size:13px; color:#f3ffe9; }
.igm-note p { margin:5px 0 0; font-size:12px; line-height:1.5; color:var(--mut); }
.igm-note.soon { border-style:dashed; border-color:var(--line); }
.igm-note.soon em { font-style:normal; font-size:9px; font-weight:900; letter-spacing:0.4px; text-transform:uppercase; color:#3a2708;
  padding:2px 7px; border-radius:999px; margin-left:6px; vertical-align:middle;
  background:radial-gradient(120% 120% at 50% 22%, #fff3c8, #f0c94a 52%, #c68a2e 100%); box-shadow:inset 0 1px 0 rgba(255,255,255,0.5); }

/* Play CTA — gold bevel primary */
.igm-play { width:100%; margin-top:2px; padding:15px; font-size:16px; font-weight:900; border-radius:14px; cursor:pointer; color:#0a2410; border:none;
  background:linear-gradient(180deg,#fff3c8,#f0c94a 55%,#c68a2e); box-shadow:inset 0 1px 0 rgba(255,255,255,0.6), 0 6px 16px -6px rgba(240,201,74,0.6); }
.igm-play:active { transform:translateY(1px); }
.igm-fine { text-align:center; font-size:10px; color:var(--mut); margin:2px 0 0; line-height:1.5; }

@media (prefers-reduced-motion: reduce) { .igm-spin { animation:none; } .igm-bar-fill { transition:none; } .igm-play:active, .igm-retry:active { transform:none; } }
`;

// IgReelsFeed (/ig/reels) — Instagram-style vertical video-reel feed of the live
// 2J catalog. Ported from the session's reel-platform design INTO the app: reuses
// useV2Catalog for real games, makeBadger/IgRibbon for badges, rtpOf for the
// presentational RTP, and the EXISTING launcher route (/ig/game/:uid →
// V2GameDetail) — no duplicate game player, no claude.ai artifact dependency.
// Presentation / free-play only; launch stays interlocked, no money surface.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Heart, MessageCircle, Share2, Volume2, ShieldCheck } from "lucide-react";
import { useV2Catalog, makeBadger, rtpOf, type V2Badge } from "@/pages/v2/v2catalog";
import IgRibbon, { type IgRibbonKind } from "@/components/ig/IgRibbon";
import IgTabBar from "@/components/ig/IgTabBar";

const RIBBON: Record<V2Badge, IgRibbonKind> = { HOT: "hot", NEW: "new", JACKPOT: "jackpot" };
const CAT_ICON: Record<string, string> = { slots: "🎰", live: "🃏", card: "🎲", crash: "🚀", fishing: "🎣", lottery: "🎟️", mini: "🕹️", sports: "⚽" };

// Deterministic, presentation-only engagement numbers (stable per index).
const likeFor = (i: number) => `${12 + ((i * 7) % 88)}.${(i * 3) % 10}k`;
const viewersFor = (i: number) => `${(0.4 + ((i * 37) % 42) / 10).toFixed(1)}k`;
const commentsFor = (i: number) => 24 + ((i * 17) % 900);

export default function IgReelsFeed() {
  const nav = useNavigate();
  const { games, loading } = useV2Catalog();
  const badger = useMemo(() => makeBadger(games), [games]);
  const reels = useMemo(() => games.filter((g) => g.thumbnail).slice(0, 60), [games]);
  const stageRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || reels.length === 0) return;
    const cards = Array.from(stage.querySelectorAll<HTMLElement>(".igrf-reel"));
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) setActive(cards.indexOf(e.target as HTMLElement)); }),
      { threshold: 0.6, root: stage },
    );
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [reels.length]);

  return (
    <div className="ig igrf">
      <style>{CSS}</style>

      <div className="igrf-top">
        <button className="igrf-back" onClick={() => (window.history.length > 1 ? nav(-1) : nav("/ig"))} aria-label="Back"><ArrowLeft size={20} /></button>
        <div className="igrf-brand">C7 <b>Reels</b></div>
        <button className="igrf-wheel" onClick={() => nav("/ig/reels/wheel")}>🎡 Wheel</button>
      </div>

      {reels.length > 0 && (
        <div className="igrf-seg">
          {reels.map((g, i) => <i key={g.uid} className={i === active ? "on" : i < active ? "done" : ""} />)}
        </div>
      )}

      <div className="igrf-stage" ref={stageRef}>
        {loading ? (
          <div className="igrf-reel igrf-load"><div className="igrf-spin" /></div>
        ) : reels.length === 0 ? (
          <div className="igrf-reel igrf-empty">No games to show yet.</div>
        ) : (
          reels.map((g, i) => {
            const badge = badger(g, i);
            const cat = g.category ?? "slots";
            return (
              <section className="igrf-reel" key={g.uid}>
                <div className="igrf-bg" style={{ backgroundImage: `url('${g.thumbnail}')` }} />
                <div className="igrf-scrim" />

                <div className="igrf-live"><span className="dot" />{viewersFor(i)} watching</div>

                <div className="igrf-stagecard">
                  <div className="igrf-card">
                    <img src={g.thumbnail ?? ""} alt={g.name} loading="lazy" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                    <span className="igrf-frame" />
                    {badge && <IgRibbon kind={RIBBON[badge]} sm className="igrf-rb" />}
                    <span className="igrf-fair"><ShieldCheck size={11} /> Provably Fair</span>
                  </div>
                </div>

                <div className="igrf-rail">
                  <button className="igrf-rbtn play" onClick={() => nav(`/ig/game/${g.uid}`)} aria-label="Play">
                    <span className="rc"><Play size={22} fill="currentColor" /></span>
                  </button>
                  <button className="igrf-rbtn like" aria-label="Like" onClick={(e) => e.currentTarget.classList.toggle("on")}><span className="rc"><Heart size={22} /></span><b>{likeFor(i)}</b></button>
                  <button className="igrf-rbtn" aria-label="Comments"><span className="rc"><MessageCircle size={21} /></span><b>{commentsFor(i)}</b></button>
                  <button className="igrf-rbtn" aria-label="Share"><span className="rc"><Share2 size={20} /></span><b>Share</b></button>
                  <button className="igrf-rbtn" aria-label="Sound"><span className="rc"><Volume2 size={20} /></span></button>
                </div>

                <div className="igrf-cap">
                  <div className="igrf-chips">
                    <span className="igrf-chip">{CAT_ICON[cat] ?? "🎮"} {cat[0].toUpperCase() + cat.slice(1)}</span>
                    <span className="igrf-chip ghost">RTP {rtpOf(g.uid)}%</span>
                  </div>
                  <div className="igrf-title">{g.name}</div>
                  <div className="igrf-sub">by {g.provider ?? "2J"} · 2J Aggregator</div>
                  <button className="igrf-cta" onClick={() => nav(`/ig/game/${g.uid}`)}>▶ Play free demo</button>
                </div>
              </section>
            );
          })
        )}
      </div>

      <IgTabBar active="reels" />
    </div>
  );
}

const CSS = `
.ig.igrf { --gold:#f0c94a; --gold-l:#fff4cf; --gold-d:#c68a2e; --hair:rgba(240,201,74,0.28); --ink:#eafff4; --mut:#cfeedd; --grn:#2ee08a; --loss:#ff6b7d;
  position:fixed; inset:0; height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif; background:#04080a; overflow:hidden; }
.igrf * { box-sizing:border-box; }
.igrf-top { position:absolute; top:0; left:0; right:0; z-index:20; display:flex; align-items:center; gap:10px; padding:12px 14px;
  background:linear-gradient(180deg, rgba(3,10,7,0.6), transparent); }
.igrf-back { width:36px; height:36px; border-radius:11px; border:1px solid rgba(255,255,255,0.16); background:rgba(8,20,14,0.5); color:#fff; display:grid; place-items:center; cursor:pointer; -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); }
.igrf-brand { flex:1; font-size:16px; font-weight:900; letter-spacing:.3px; text-shadow:0 1px 6px rgba(0,0,0,0.6); }
.igrf-brand b { background:linear-gradient(90deg,var(--gold-d),var(--gold) 50%,var(--gold-l)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.igrf-wheel { font-size:12px; font-weight:800; color:var(--gold); border:1px solid var(--hair); background:rgba(8,20,14,0.5); padding:6px 11px; border-radius:999px; cursor:pointer; -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); }
.igrf-seg { position:absolute; top:54px; left:12px; right:12px; z-index:20; display:flex; gap:3px; }
.igrf-seg i { flex:1; height:3px; border-radius:3px; background:rgba(255,255,255,0.22); }
.igrf-seg i.on { background:linear-gradient(90deg,var(--gold-d),var(--gold),var(--gold-l)); box-shadow:0 0 8px rgba(240,201,74,0.5); }
.igrf-seg i.done { background:rgba(240,201,74,0.5); }
.igrf-stage { position:absolute; inset:0; overflow-y:scroll; scroll-snap-type:y mandatory; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
.igrf-stage::-webkit-scrollbar { display:none; }
.igrf-reel { position:relative; height:100%; scroll-snap-align:start; scroll-snap-stop:always; overflow:hidden; display:flex; align-items:flex-end; }

/* blurred cinematic backdrop from the same art */
.igrf-bg { position:absolute; inset:-8%; background-size:cover; background-position:center; transform:scale(1.15); filter:blur(26px) saturate(1.3) brightness(0.5); }
.igrf-scrim { position:absolute; inset:0; background:
  radial-gradient(120% 60% at 50% 8%, rgba(0,0,0,0.18), transparent 40%),
  linear-gradient(180deg, rgba(4,12,8,0.55) 0%, rgba(4,12,8,0.05) 24%, rgba(4,12,8,0.12) 52%, rgba(3,10,7,0.9) 92%); }

/* LIVE watching pill */
.igrf-live { position:absolute; top:70px; right:14px; z-index:8; display:inline-flex; align-items:center; gap:6px; font-size:10.5px; font-weight:800; color:#fff;
  padding:5px 10px; border-radius:999px; background:rgba(3,10,7,0.5); border:1px solid rgba(255,255,255,0.12); -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px); }
.igrf-live .dot { width:7px; height:7px; border-radius:50%; background:var(--loss); box-shadow:0 0 8px var(--loss); animation:igrf-pulse 1.8s ease-in-out infinite; }

/* crisp gold-framed center card */
.igrf-stagecard { position:absolute; inset:0; display:grid; place-items:center; z-index:5; padding-bottom:40px; }
.igrf-card { position:relative; width:63%; max-width:300px; aspect-ratio:3/4; border-radius:20px; overflow:hidden;
  box-shadow:0 30px 60px -22px rgba(0,0,0,0.9), 0 0 40px -10px rgba(240,201,74,0.35); animation:igrf-rise 0.55s cubic-bezier(.2,.8,.2,1) both; }
.igrf-card img { width:100%; height:100%; object-fit:cover; filter:saturate(1.14) contrast(1.06); }
.igrf-frame { position:absolute; inset:0; border-radius:20px; pointer-events:none;
  box-shadow: inset 0 0 0 1.6px rgba(255,244,207,0.95), inset 0 0 0 3.6px rgba(8,22,14,0.85), inset 0 0 0 5.4px rgba(240,201,74,0.6), inset 0 0 26px rgba(0,0,0,0.4);
  background:linear-gradient(180deg, rgba(255,246,213,0.18) 0%, transparent 22%); }
.igrf-rb { position:absolute; top:10px; left:10px; z-index:3; }
.igrf-fair { position:absolute; bottom:10px; left:10px; z-index:3; display:inline-flex; align-items:center; gap:4px; font-size:9.5px; font-weight:800; color:#d7ffe9;
  padding:4px 9px; border-radius:999px; background:rgba(3,10,7,0.6); border:1px solid rgba(46,224,138,0.4); -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); }

.igrf-rail { position:absolute; right:12px; bottom:150px; z-index:8; display:flex; flex-direction:column; gap:15px; align-items:center; }
.igrf-rail .igrf-rbtn { background:none; border:none; color:#fff; display:flex; flex-direction:column; align-items:center; gap:3px; cursor:pointer; font:inherit; font-size:10px; font-weight:700; }
.igrf-rail .rc { width:46px; height:46px; border-radius:50%; display:grid; place-items:center; background:rgba(8,20,14,0.5); border:1px solid rgba(255,255,255,0.14); -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); transition:transform .15s ease; }
.igrf-rail .igrf-rbtn:active .rc { transform:scale(0.9); }
.igrf-rail .play .rc { background:linear-gradient(135deg,var(--gold-d),var(--gold)); color:#120a02; border-color:var(--gold-l); box-shadow:0 8px 22px rgba(240,201,74,0.4); }
.igrf-rail .like.on .rc { color:var(--loss); background:rgba(255,107,125,0.16); border-color:rgba(255,107,125,0.5); }

.igrf-cap { position:relative; z-index:7; padding:0 82px 108px 16px; width:100%; display:flex; flex-direction:column; gap:8px; }
.igrf-chips { display:flex; gap:6px; }
.igrf-chip { font-size:10.5px; font-weight:800; color:#0a2410; padding:4px 10px; border-radius:999px; background:linear-gradient(180deg,#fff8dc,#f5cf55 60%,#c68a2e); }
.igrf-chip.ghost { color:#eafff4; background:rgba(3,10,7,0.5); border:1px solid var(--hair); }
.igrf-title { font-size:24px; font-weight:900; letter-spacing:-.4px; line-height:1.06; text-shadow:0 2px 12px rgba(0,0,0,0.55); text-wrap:balance;
  background:linear-gradient(92deg,#fff,var(--gold-l) 60%,var(--gold)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.igrf-sub { font-size:12.5px; color:var(--mut); text-shadow:0 1px 5px rgba(0,0,0,0.6); }
.igrf-cta { margin-top:3px; align-self:flex-start; display:inline-flex; align-items:center; justify-content:center; gap:7px; font-family:inherit; font-size:15px; font-weight:900;
  color:#120a02; border:none; cursor:pointer; padding:13px 26px; border-radius:14px; min-width:min(60vw,200px);
  background:linear-gradient(92deg,var(--gold-d),var(--gold) 55%,var(--gold-l)); box-shadow:0 12px 28px -8px rgba(240,201,74,0.45); }
.igrf-cta:active { transform:translateY(1px); }
.igrf-load, .igrf-empty { align-items:center; justify-content:center; color:var(--mut); }
.igrf-spin { width:34px; height:34px; border-radius:50%; border:3px solid rgba(240,201,74,0.25); border-top-color:var(--gold); animation:igrf-sp 0.9s linear infinite; }
@keyframes igrf-sp { to { transform:rotate(360deg); } }
@keyframes igrf-pulse { 0%,100% { opacity:1; } 50% { opacity:.35; } }
@keyframes igrf-rise { from { opacity:0; transform:translateY(16px) scale(.96); } to { opacity:1; transform:none; } }
@media (prefers-reduced-motion:reduce){ .igrf-bg { transform:scale(1.15); } .igrf-card { animation:none; } .igrf-live .dot { animation:none; } .igrf-spin { animation-duration:1.6s; } }
`;

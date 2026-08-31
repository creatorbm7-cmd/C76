// IgExplore (/ig/explore) — Instagram "Explore" style games grid, light theme.
// Search bar on top → dense 3-col grid of real catalog games (live useV2Catalog).
// Tapping a tile opens the real game route. No fabricated data.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useV2Catalog, makeBadger, catalogCategories, filterCatalog, type V2Badge } from "@/pages/v2/v2catalog";
import { c74OriginalsLive } from "@/games/c74originals/registry";
import IgTabBar from "@/components/ig/IgTabBar";
import IgSocialNotice from "@/components/ig/IgSocialNotice";
import IgRibbon, { type IgRibbonKind } from "@/components/ig/IgRibbon";

// Map the catalog's existing (presentation-only) badge to a ribbon kind.
const RIBBON: Record<V2Badge, IgRibbonKind> = { HOT: "hot", NEW: "new", JACKPOT: "jackpot" };

export default function IgExplore() {
  const nav = useNavigate();
  const { games, loading } = useV2Catalog();
  const badger = useMemo(() => makeBadger(games), [games]);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  // Real categories present in the live catalog (label + icon + count) — no fabrication.
  const cats = useMemo(() => catalogCategories(games), [games]);
  // C74 Originals — locally-hosted, free-play HTML5 games (no aggregator, no
  // real-money gate). Surfaced as a rail so the one thing users can actually
  // play right now is discoverable. Only on the unfiltered "all" view.
  const originals = useMemo(() => c74OriginalsLive(), []);
  const showOriginals = tab === "all" && !q.trim() && originals.length > 0;
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    let base = filterCatalog(games, tab, badger);
    if (s) base = base.filter((g) => g.name.toLowerCase().includes(s) || (g.provider ?? "").toLowerCase().includes(s));
    return base.slice(0, 120);
  }, [games, q, tab, badger]);

  return (
    <div className="ig">
      <style>{CSS}</style>
      <header className="ig-top">
        <div className="ige-search">
          <Search size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search games & providers" aria-label="Search games" />
          {q && <button className="ige-clear" onClick={() => setQ("")} aria-label="Clear"><X size={16} /></button>}
        </div>
      </header>

      {/* Real category filter chips — All · Featured · <live categories with counts> */}
      {!loading && games.length > 0 && (
        <div className="ige-cats" role="tablist" aria-label="Game categories">
          <button role="tab" aria-selected={tab === "all"} className={`ige-cat${tab === "all" ? " on" : ""}`} onClick={() => setTab("all")}>All <em>{games.length}</em></button>
          <button role="tab" aria-selected={tab === "featured"} className={`ige-cat${tab === "featured" ? " on" : ""}`} onClick={() => setTab("featured")}>🔥 Featured</button>
          {cats.map((c) => (
            <button key={c.key} role="tab" aria-selected={tab === c.key} className={`ige-cat${tab === c.key ? " on" : ""}`} onClick={() => setTab(c.key)}>
              {c.icon} {c.label} <em>{c.count}</em>
            </button>
          ))}
        </div>
      )}

      <main className="ig-main">
        {showOriginals && (
          <section className="igo-wrap" aria-label="C74 Originals — play free now">
            <div className="igo-head">
              <span className="igo-title">C74 Originals</span>
              <span className="igo-tag">PLAY FREE</span>
            </div>
            <div className="igo-rail">
              {originals.map((g) => (
                <button key={g.slug} className="igo-card" onClick={() => nav(`/play/${g.slug}`)} aria-label={`Play ${g.name}`}>
                  <span className="igo-thumb">
                    <img src={g.thumbnail ?? `/games-html/${g.slug}/thumb.png`} alt={g.name} loading="lazy" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                    <span className="igo-play">▶</span>
                  </span>
                  <span className="igo-name">{g.name}</span>
                  {g.blurb && <span className="igo-blurb">{g.blurb}</span>}
                </button>
              ))}
            </div>
          </section>
        )}
        {loading ? (
          <div className="ige-grid">{Array.from({ length: 18 }).map((_, i) => <div key={i} className="ige-cell ige-sk" />)}</div>
        ) : list.length === 0 ? (
          <div className="ige-empty">{q ? `No games match “${q}”.` : "No games in this category yet."}</div>
        ) : (
          <div className="ige-grid">
            {list.map((g, i) => {
              const badge = badger(g, i);
              return (
                <button key={g.uid} className={`ige-cell${i % 7 === 0 ? " tall" : ""}`} onClick={() => nav(`/ig/game/${g.uid}`)} aria-label={g.name}>
                  <img src={g.thumbnail} alt={g.name} loading="lazy" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                  {badge && <IgRibbon kind={RIBBON[badge]} sm className="ige-rb" />}
                  <span className="ige-n">{g.name}</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="ig-end2" />
        <IgSocialNotice variant="line" />
      </main>

      <IgTabBar active="explore" />
    </div>
  );
}

const CSS = `
.ig { --bg:#07130d; --card:#103524; --card2:#12492f; --line:rgba(240,201,74,0.26); --ink:#eafff4; --mut:#93c3aa; --grn:#2ee08a; --grn2:#0e7a4a; --gold:#f0c94a; --gold3:#c68a2e; --loss:#ff6b7d;
  min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif; padding-bottom:calc(76px + env(safe-area-inset-bottom));
  background: radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%), linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%); background-attachment:fixed; }
.ig * { box-sizing:border-box; }
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; height:54px; padding:0 12px;
  background:linear-gradient(180deg, rgba(9,32,20,0.92), rgba(9,32,20,0.62)); -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px);
  border-bottom:1px solid var(--line); }
.ige-search { flex:1; display:flex; align-items:center; gap:8px; height:40px; padding:0 13px; border-radius:12px; color:var(--mut);
  background:linear-gradient(180deg, rgba(18,73,47,0.85), rgba(7,32,20,0.9)); border:1px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1); transition:border-color .15s ease, box-shadow .15s ease; }
.ige-search:focus-within { border-color:rgba(240,201,74,0.6); box-shadow:inset 0 1px 0 rgba(246,230,176,0.14), 0 0 0 3px rgba(240,201,74,0.16); color:#ffe9a8; }
.ige-search input { flex:1; border:none; background:none; outline:none; font-size:15px; color:var(--ink); }
.ige-search input::placeholder { color:var(--mut); }
.ige-clear { background:none; border:none; color:var(--mut); cursor:pointer; display:grid; place-items:center; }
.ig-main { max-width:560px; margin:0 auto; }
.ige-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:3px; background:rgba(240,201,74,0.16); border-bottom:1px solid var(--line); }
.ige-cell { position:relative; aspect-ratio:1; border:none; padding:0; cursor:pointer; overflow:hidden; -webkit-tap-highlight-color:transparent;
  background:radial-gradient(120% 120% at 50% 22%, #12492f, #06180f 72%); box-shadow:inset 0 0 0 1px rgba(240,201,74,0.12); }
.ige-cell:active { transform:translateY(1px); }
.ige-cell.tall { grid-row:span 2; aspect-ratio:1/2; }
.ige-cell img { width:100%; height:100%; object-fit:cover; }
.ige-rb { position:absolute; top:5px; left:5px; z-index:2; }
.ige-n { position:absolute; left:0; right:0; bottom:0; padding:14px 6px 5px; font-size:10px; font-weight:700; color:#fff; text-align:left;
  background:linear-gradient(0deg,rgba(0,0,0,.78),transparent); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ige-sk { background:linear-gradient(90deg, rgba(18,63,41,0.6), rgba(46,224,138,0.14) 45%, rgba(240,201,74,0.10) 55%, rgba(18,63,41,0.6)); background-size:200% 100%; animation:ige-sh 1.2s linear infinite; }
@keyframes ige-sh { to { background-position:-200% 0; } }
.ige-empty { margin:24px 12px; padding:44px 22px; text-align:center; color:var(--mut); font-size:14px; border-radius:16px;
  background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.ig-end2 { height:8px; }
/* C74 Originals rail — the free-play, locally-hosted games (discoverable now) */
.igo-wrap { padding:12px 12px 2px; }
.igo-head { display:flex; align-items:center; gap:9px; margin:2px 2px 9px; }
.igo-title { font-size:14px; font-weight:900; color:#f3ffe9; }
.igo-tag { font-size:9px; font-weight:900; letter-spacing:0.6px; color:#0a2410; padding:3px 8px; border-radius:999px;
  background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); box-shadow:inset 0 1px 0 rgba(255,255,255,0.5); }
.igo-rail { display:flex; gap:10px; overflow-x:auto; scrollbar-width:none; padding:2px 2px 6px; }
.igo-rail::-webkit-scrollbar { display:none; }
.igo-card { flex:0 0 132px; display:flex; flex-direction:column; gap:6px; text-align:left; cursor:pointer; background:none; border:none; padding:0; color:var(--ink); }
.igo-thumb { position:relative; aspect-ratio:3/4; border-radius:14px; overflow:hidden;
  background:radial-gradient(120% 120% at 50% 20%, #12492f, #06180f 72%);
  box-shadow:inset 0 0 0 1.4px rgba(240,201,74,0.5), inset 0 1px 0 rgba(255,255,255,0.22), 0 0 16px -6px rgba(240,201,74,0.45), 0 14px 30px -18px rgba(0,0,0,0.82); }
.igo-thumb img { width:100%; height:100%; object-fit:cover; }
.igo-play { position:absolute; inset:0; margin:auto; width:40px; height:40px; border-radius:50%; display:grid; place-items:center; font-size:15px; color:#0a2410;
  background:radial-gradient(120% 120% at 50% 20%, #fff3c8, #f0c94a 55%, #c68a2e); box-shadow:0 6px 16px -6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.6); }
.igo-card:active .igo-thumb { transform:translateY(1px) scale(0.98); }
.igo-name { font-size:12.5px; font-weight:800; color:#f3ffe9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.igo-blurb { font-size:11px; color:var(--mut); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:-2px; }
/* ══ RICH POLISH v2 — premium spaced game grid + chrome (matches the rest) ══
   Presentation only; no data, routes or logic touched. */
.ig { background:
    radial-gradient(120% 58% at 50% -10%, rgba(240,201,74,0.10) 0%, transparent 46%),
    radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%),
    linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%) !important; background-attachment:fixed; }
.ig-top { box-shadow:0 1px 0 rgba(240,201,74,0.22), 0 10px 24px -16px rgba(0,0,0,0.7); }
/* Category filter chips — sticky under the search bar, horizontal scroll */
.ige-cats { position:sticky; top:54px; z-index:20; display:flex; gap:8px; overflow-x:auto; scrollbar-width:none;
  padding:10px 12px; max-width:560px; margin:0 auto;
  background:linear-gradient(180deg, rgba(9,32,20,0.86), rgba(9,32,20,0.4)); -webkit-backdrop-filter:blur(10px); backdrop-filter:blur(10px);
  border-bottom:1px solid rgba(240,201,74,0.2); }
.ige-cats::-webkit-scrollbar { display:none; }
.ige-cat { flex:0 0 auto; display:inline-flex; align-items:center; gap:5px; font-size:12.5px; font-weight:800; cursor:pointer; white-space:nowrap;
  color:#eafff4; padding:8px 13px; border-radius:999px; border:none; font-family:inherit;
  background:linear-gradient(180deg, rgba(24,96,63,0.7), rgba(6,24,15,0.85));
  box-shadow:inset 0 0 0 1.2px rgba(240,201,74,0.4), inset 0 1px 0 rgba(255,255,255,0.18); transition:transform .1s ease, filter .12s ease; }
.ige-cat em { font-style:normal; font-size:10px; font-weight:800; color:#0a2410; padding:1px 6px; border-radius:999px;
  background:linear-gradient(180deg,#fff3c8,#f0c94a 60%,#c68a2e); }
.ige-cat:active { transform:translateY(1px) scale(0.97); }
.ige-cat.on { color:#0a2410; background:linear-gradient(180deg,#fff8dc,#f5cf55 55%,#c68a2e);
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.6), 0 0 16px -3px rgba(240,201,74,0.7); }
.ige-cat.on em { color:#f3ffe9; background:rgba(10,36,16,0.55); }
/* search bar → richer glass + gold-tinted rest state */
.ige-search { box-shadow:inset 0 1px 0 rgba(246,230,176,0.14), inset 0 0 0 1px rgba(240,201,74,0.28), 0 8px 18px -10px rgba(0,0,0,0.7); }
.ige-search svg { color:var(--gold); }
/* GRID → spaced rounded tiles instead of a flush gold-line lattice */
.ige-grid { gap:8px !important; padding:12px 10px 6px !important; background:none !important; border-bottom:none !important; }
.ige-cell { border-radius:13px !important; overflow:hidden;
  box-shadow:inset 0 0 0 1.4px rgba(240,201,74,0.5), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 18px rgba(46,224,138,0.12), 0 0 14px -6px rgba(240,201,74,0.4), 0 12px 26px -16px rgba(0,0,0,0.82) !important;
  transition:transform .12s ease, filter .12s ease; }
.ige-cell::after { content:""; position:absolute; inset:0; pointer-events:none; z-index:2; border-radius:13px;
  background:linear-gradient(180deg, rgba(255,246,213,0.14), transparent 26%); }
.ige-cell:active { transform:translateY(1px) scale(0.975); filter:brightness(1.05); }
.ige-cell img { border-radius:13px; }
/* game name label → gold-tinted, richer scrim */
.ige-n { padding:16px 7px 6px; font-size:10.5px; letter-spacing:.2px; text-shadow:0 1px 3px rgba(0,0,0,0.8);
  background:linear-gradient(0deg, rgba(0,0,0,.82), rgba(0,0,0,.35) 55%, transparent); }
.ige-sk { border-radius:13px !important; }

@media (prefers-reduced-motion:reduce){ .ige-sk{ animation:none; } .ige-cell:active{ transform:none; } }
/* ══ RICH POLISH v3 — HD 2J gold frames (presentation only; no data/routes/logic touched) ══
   Frame is drawn on ::after ABOVE the artwork so the double-gold border stays crisp over the image. */
.ige-grid { gap:10px !important; padding:12px 11px 6px !important; }
.ige-cell { border-radius:15px !important; isolation:isolate;
  box-shadow:0 0 16px -6px rgba(240,201,74,0.45), 0 16px 34px -16px rgba(0,0,0,0.9) !important;
  transition:transform .16s ease, box-shadow .16s ease !important; }
.ige-cell img { border-radius:15px !important; filter:saturate(1.14) contrast(1.07) brightness(1.02);
  transform:scale(1.001); transition:transform .35s ease, filter .35s ease; }
.ige-cell::after { z-index:3 !important; border-radius:15px !important;
  box-shadow: inset 0 0 0 1.6px rgba(255,242,205,0.92), inset 0 0 0 3.4px rgba(8,22,14,0.82), inset 0 0 0 5px rgba(240,201,74,0.60), inset 0 0 22px rgba(0,0,0,0.40) !important;
  background:linear-gradient(180deg, rgba(255,246,213,0.20) 0%, transparent 22%), radial-gradient(120% 85% at 50% 120%, rgba(0,0,0,0.5), transparent 52%), radial-gradient(90% 55% at 50% 0%, rgba(240,201,74,0.14), transparent 60%) !important; }
.ige-cell:hover img { transform:scale(1.055); filter:saturate(1.22) contrast(1.11) brightness(1.05); }
.ige-cell:hover { box-shadow:0 0 28px -4px rgba(240,201,74,0.62), 0 24px 46px -16px rgba(0,0,0,0.96) !important; }
.ige-cell:hover::after { box-shadow: inset 0 0 0 1.6px rgba(255,251,232,1), inset 0 0 0 3.4px rgba(8,22,14,0.82), inset 0 0 0 5px rgba(240,201,74,0.82), inset 0 0 22px rgba(0,0,0,0.34) !important; }
.ige-n { z-index:4 !important; padding:18px 9px 8px !important; font-weight:800 !important; color:#fff6dd !important;
  background:linear-gradient(0deg, rgba(3,12,7,0.95), rgba(3,12,7,0.42) 55%, transparent) !important; }
.ige-rb { z-index:5 !important; top:8px !important; left:8px !important; }
/* C74 Originals thumbs → matching HD gold frame */
.igo-thumb::after { content:""; position:absolute; inset:0; z-index:3; pointer-events:none; border-radius:14px;
  box-shadow: inset 0 0 0 1.5px rgba(255,242,205,0.9), inset 0 0 0 3.2px rgba(8,22,14,0.8), inset 0 0 0 4.6px rgba(240,201,74,0.55), inset 0 0 18px rgba(0,0,0,0.34);
  background:linear-gradient(180deg, rgba(255,246,213,0.18) 0%, transparent 24%); }
.igo-thumb img { filter:saturate(1.12) contrast(1.06); }
.igo-play { z-index:4; }
@media (prefers-reduced-motion:reduce){ .ige-cell img, .ige-cell:hover img { transform:none; transition:none; } }
`;

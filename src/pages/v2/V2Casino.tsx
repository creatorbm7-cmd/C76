// V2Casino — the Casino tab: the full C74 Casino game library (R2).
//
// R1 shipped this as a stub while the catalog lived on Home. R2 completes the
// Home ↔ Casino split: the complete catalog browser (category filters + the full
// grid) now lives here, and Home keeps only a slim "Popular" discovery rail that
// links across. Read-only presentation — the launcher reuses the existing
// /v3/game/:uid flow verbatim (no wallet/igaming/payment logic here). Cards come
// from the shared v2CardCss; honors prefers-reduced-motion.

import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, Search, X, Dices } from "lucide-react";
import V2GameCard from "./V2GameCard";
import { V2_CARD_CSS } from "./v2CardCss";
import { useV2Catalog, catalogCategories, makeBadger, filterCatalog, type CatalogGame } from "./v2catalog";
import { recordPlay } from "./v2live";
import { playV2 } from "./v2audio";
import { useAppAssets } from "@/hooks/useAppAssets";
import C7Icon, { type C7IconName } from "@/components/c7/C7Icon";

const SYNTH_TABS: { key: string; label: string; icon: C7IconName }[] = [
  { key: "all", label: "All", icon: "star" },
  { key: "featured", label: "Featured", icon: "gem" },
  { key: "hot", label: "Hot", icon: "fire" },
  { key: "new", label: "New", icon: "bolt" },
  { key: "jackpot", label: "Jackpot", icon: "trophy" },
];

// Valid ?cat= deep-link targets (synthetic tabs + the real catalog categories);
// an unknown/missing value falls back to "all" so links stay robust.
const KNOWN_CATS = new Set(["all", "featured", "hot", "new", "jackpot", "slots", "live", "card", "crash", "fishing", "lottery", "mini", "sports"]);

// Real premium glyph per catalog category — the catalog itself only carries emoji
// strings, which C7Icon can't resolve (every one fell back to a gold star). Map
// each category key to a distinct C7IconName instead.
const CAT_ICON: Record<string, C7IconName> = {
  slots: "coins", live: "users", card: "gem", crash: "rocket",
  fishing: "target", lottery: "gift", mini: "bolt", sports: "trophy",
};

export default function V2Casino() {
  const nav = useNavigate();
  const art = useAppAssets();
  const { games: catalog, loading } = useV2Catalog();
  const badger = useMemo(() => makeBadger(catalog), [catalog]);
  const cats = useMemo(() => catalogCategories(catalog), [catalog]);
  const tabs = useMemo(
    () => [...SYNTH_TABS, ...cats.map((c) => ({ key: c.key, label: c.label, icon: CAT_ICON[c.key] ?? "star" as C7IconName }))],
    [cats]
  );
  // Initial category from the Home deep-link (?cat=…), validated → else "all".
  const [params] = useSearchParams();
  const [tab, setTab] = useState(() => {
    const c = params.get("cat");
    return c && KNOWN_CATS.has(c) ? c : "all";
  });
  // Search (name/provider) + provider filter — client-side over the catalog.
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<string | null>(null);
  // Top providers (by game count) for the quick-filter row.
  const providers = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of catalog) if (g.provider) m.set(g.provider, (m.get(g.provider) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, count]) => ({ name, count }));
  }, [catalog]);
  // Full filtered list — category tab, then provider, then search. No slicing.
  const shown = useMemo(() => {
    let list = filterCatalog(catalog, tab, badger);
    if (provider) list = list.filter((g) => g.provider === provider);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((g) => g.name.toLowerCase().includes(q) || (g.provider || "").toLowerCase().includes(q));
    return list;
  }, [catalog, tab, badger, provider, query]);
  // Jackpot-first: a featured band shown on the default "All" view (no filters).
  const jackpot = useMemo(() => filterCatalog(catalog, "jackpot", badger), [catalog, badger]);
  const filtersActive = !!query.trim() || !!provider;
  // Open a game: record it for Recently Played + a tap sound, then route.
  const openGame = (g: CatalogGame) => { recordPlay(g.uid); playV2("click"); nav(`/v3/game/${g.uid}`); };

  return (
    <div className="v2cs">
      <style>{V2_CARD_CSS}{CSS}</style>
      <div className="v2cs-bg" aria-hidden="true" />
      <header className="v2cs-top">
        <div className="v2cs-brand">
          <span className="v2cs-brand-ic"><Dices size={18} /></span>
          <div className="v2cs-brand-tx"><b>Casino</b><small>Game Library</small></div>
        </div>
        <span className="v2cs-badge"><Sparkles size={10} /> {catalog.length > 0 ? `${catalog.length} games` : "Games"}</span>
      </header>

      {/* Search — filter the library by game or provider name */}
      <div className="v2cs-search">
        <Search size={16} className="v2cs-search-ic" />
        <input
          className="v2cs-search-in"
          type="search"
          inputMode="search"
          placeholder="Search games or providers…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search games"
        />
        {query && (
          <button className="v2cs-search-x" onClick={() => setQuery("")} aria-label="Clear search"><X size={15} /></button>
        )}
      </div>

      {/* Category filter chips — sticky under the header */}
      <div className="v2cs-chips" role="tablist" aria-label="Game categories">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`v2cs-chip c7p-chip${tab === t.key ? " on" : ""}`}
            onClick={() => setTab(t.key)}
          >
            <span className="v2cs-chip-ic"><C7Icon name={t.icon} size={15} /></span> {t.label}
          </button>
        ))}
      </div>

      <main className="v2cs-main">
        {/* Featured — Jackpot band on the default "All" view (hidden while filtering) */}
        {!loading && tab === "all" && !filtersActive && jackpot.length > 0 && (
          <section className="v2cs-jp c7p-card-gold">
            <div className="v2cs-jp-h c7p-sec">
              <span className="c7p-sec-ic"><C7Icon name="trophy" size={16} /></span>
              <span className="c7p-sec-t">Jackpot</span>
              <i className="c7p-sec-rule" aria-hidden="true" />
              <button className="v2cs-jp-all" onClick={() => setTab("jackpot")}>See all ›</button>
            </div>
            <div className="v2cs-jp-rail">
              {jackpot.slice(0, 8).map((g, i) => (
                <V2GameCard key={g.uid} game={g} assets={art} badge={badger(g, i)} index={i} onPlay={openGame} />
              ))}
            </div>
          </section>
        )}

        {/* Providers — quick-filter row (top studios by game count) */}
        {!loading && providers.length > 1 && (
          <section className="v2cs-provs" aria-label="Providers">
            <div className="v2cs-provs-h c7p-sec"><span className="c7p-sec-ic"><C7Icon name="gem" size={16} /></span><span className="c7p-sec-t">Providers</span><i className="c7p-sec-rule" aria-hidden="true" /></div>
            <div className="v2cs-provrail">
              <button className={`v2cs-prov${!provider ? " on" : ""}`} onClick={() => setProvider(null)}>All</button>
              {providers.map((p) => (
                <button key={p.name} className={`v2cs-prov${provider === p.name ? " on" : ""}`} onClick={() => setProvider(provider === p.name ? null : p.name)}>
                  {p.name} <em>{p.count}</em>
                </button>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <div className="v2cs-grid">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="c7p-skel c7p-skel--tile" />)}</div>
        ) : shown.length === 0 ? (
          <div className="v2cs-empty">
            No games match{query.trim() ? ` "${query.trim()}"` : ""}{provider ? ` from ${provider}` : ""}.
            {filtersActive && <button className="v2cs-clear" onClick={() => { setQuery(""); setProvider(null); }}>Clear filters</button>}
          </div>
        ) : (
          <>
            <div className="v2cs-count">{shown.length} game{shown.length === 1 ? "" : "s"}</div>
            <div className="v2cs-grid">
              {shown.map((g, i) => (
                <V2GameCard key={g.uid} game={g} assets={art} badge={badger(g, i)} index={i} size="mini" onPlay={openGame} />
              ))}
            </div>
          </>
        )}
        <footer className="v2cs-foot"><Sparkles size={11} /> Provably fair · Instant USDT · play responsibly</footer>
      </main>
    </div>
  );
}

const CSS = `
.v2cs { position: relative; min-height: 100vh; color: #eaf7ef; font-family: Inter, system-ui, sans-serif; background: #0b6b43; padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px)); }
.v2cs-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(120% 65% at 50% -8%, rgba(246,201,69,0.12), transparent 58%), radial-gradient(110% 55% at 50% 0%, rgba(46,224,138,0.11), transparent 60%), linear-gradient(172deg, #0d3d28 0%, #072517 46%, #04160d 100%); }
.v2cs-top { position: sticky; top: 0; z-index: 4; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 16px;
  background: linear-gradient(180deg, rgba(10,20,15,0.94), rgba(10,20,15,0.55)); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(246,201,69,0.28); }
/* Emerald brand lockup — mirrors Home's crown/title treatment */
.v2cs-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
.v2cs-brand-ic { flex: 0 0 auto; width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; color: #05230f;
  background: radial-gradient(circle at 36% 28%, #e6fbf1, #37e29a 42%, #21c07e 66%, #159861 100%); border: 1.5px solid #0a5638;
  box-shadow: inset 0 2px 3px rgba(255,255,255,0.7), 0 0 14px rgba(47,226,154,0.5); }
.v2cs-brand-tx { min-width: 0; }
.v2cs-brand-tx b { display: block; font-size: 15px; font-weight: 900; letter-spacing: 0.4px; line-height: 1.05; color: #f3ffe9; white-space: nowrap; }
.v2cs-brand-tx small { font-size: 9.5px; letter-spacing: 2px; text-transform: uppercase; color: rgba(220,232,223,0.6); }
.v2cs-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 900; letter-spacing: 1px; padding: 5px 9px; border-radius: 999px; color: #2a1608; background: linear-gradient(180deg, #ffe9a8, #f6c945); }
/* sticky category chip bar */
.v2cs-chips { position: sticky; top: 49px; z-index: 3; display: flex; gap: 8px; overflow-x: auto; padding: 10px 16px; scrollbar-width: none;
  background: linear-gradient(180deg, rgba(10,20,15,0.92), rgba(10,20,15,0.6)); backdrop-filter: blur(10px); -webkit-overflow-scrolling: touch; }
.v2cs-chips::-webkit-scrollbar { display: none; }
/* Category chip — surface (gloss/hairline/depth) comes from .c7p-chip; this
   reshapes the square icon-chip into a labeled pill and keeps only layout/type. */
.v2cs-chip { flex: 0 0 auto; width: auto; height: auto; display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 800; padding: 8px 14px; border-radius: 999px; cursor: pointer; font-family: inherit; color: #f3ffe9; transition: transform .1s ease, box-shadow .15s ease; }
.v2cs-chip:active { transform: scale(0.94); }
.v2cs-chip.on { color: #052012; border-color: transparent; text-shadow: 0 1px 0 rgba(255,255,255,0.35);
  background: radial-gradient(120% 100% at 50% 12%, rgba(255,255,255,0.55), transparent 52%), linear-gradient(180deg, #9CFFCB, #39FF88 55%, #00A86B);
  box-shadow: 0 0 0 1px rgba(246,201,69,0.55), 0 4px 14px -4px rgba(47,226,154,0.55), 0 0 16px -3px rgba(246,201,69,0.55), inset 0 1px 0 rgba(255,255,255,0.55); }
.v2cs-chip-ic { font-size: 12px; }
/* Search — carved-stone input */
.v2cs-search { position: relative; display: flex; align-items: center; max-width: 560px; margin: 12px auto 2px; padding: 0 16px; }
.v2cs-search-ic { position: absolute; left: 30px; color: #f6c945; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4)); pointer-events: none; }
.v2cs-search-in { flex: 1; width: 100%; font-family: inherit; font-size: 14px; font-weight: 600; color: #eafff3; padding: 14px 42px 14px 42px; border-radius: 16px;
  background: radial-gradient(120% 90% at 50% -30%, rgba(255,246,214,0.12), transparent 46%), linear-gradient(160deg, rgba(16,58,38,0.72), rgba(6,30,20,0.82));
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(246,201,69,0.42); box-shadow: inset 0 1px 0 rgba(246,230,176,0.25), inset 0 2px 8px rgba(0,0,0,0.42), 0 6px 18px -10px rgba(246,201,69,0.3); outline: none; -webkit-appearance: none; }
.v2cs-search-in::placeholder { color: rgba(220,232,223,0.42); }
.v2cs-search-in:focus { border-color: rgba(47,226,154,0.55); box-shadow: inset 0 2px 6px rgba(0,0,0,0.5), 0 0 0 3px rgba(47,226,154,0.14); }
.v2cs-search-in::-webkit-search-cancel-button { display: none; }
.v2cs-search-x { position: absolute; right: 24px; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; color: #dce8df; background: rgba(0,0,0,0.35); border: 1px solid rgba(246,201,69,0.3); }
.v2cs-search-x:active { transform: scale(0.9); }
.v2cs-main { position: relative; z-index: 1; max-width: 560px; margin: 0 auto; padding: 14px 16px; }
/* Providers — quick-filter row (gold active = secondary accent) */
.v2cs-provs { margin: 4px 0 18px; }
.v2cs-provs-h { display: flex; align-items: center; gap: 10px; margin: 0 2px 10px; }
.v2cs-provs-t { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 900; letter-spacing: 0.2px; color: #ffe9a8; }
.v2cs-provs-t svg { color: #f6c945; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4)); }
/* thin gold rule that trails a section label */
.v2cs-rule { flex: 1; height: 1px; min-width: 12px; border: none; background: linear-gradient(90deg, rgba(246,201,69,0.55), rgba(246,201,69,0.06)); }
.v2cs-provrail { display: flex; gap: 8px; overflow-x: auto; padding: 2px 2px 6px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.v2cs-provrail::-webkit-scrollbar { display: none; }
.v2cs-prov { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 800; padding: 7px 12px; border-radius: 999px; cursor: pointer; font-family: inherit; color: #dce8df; white-space: nowrap;
  background: linear-gradient(160deg, rgba(33,54,41,0.7), rgba(18,32,26,0.72)); border: 1px solid rgba(246,201,69,0.24); box-shadow: inset 0 1px 0 rgba(246,201,69,0.14); transition: transform .1s ease; }
.v2cs-prov em { font-style: normal; font-size: 9px; font-weight: 900; color: #ffd24d; }
.v2cs-prov:active { transform: scale(0.94); }
.v2cs-prov.on { color: #2a1c04; border-color: transparent; text-shadow: 0 1px 0 rgba(255,255,255,0.35);
  background: radial-gradient(120% 100% at 50% 12%, rgba(255,255,255,0.5), transparent 52%), linear-gradient(180deg, #ffe9a8, #f6c945 55%, #c6851e);
  box-shadow: 0 4px 12px -5px rgba(246,201,69,0.5), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -6px 12px -6px rgba(138,100,16,0.4); }
.v2cs-prov.on em { color: #3a2705; }
.v2cs-clear { display: inline-block; margin-left: 10px; font-family: inherit; font-size: 12px; font-weight: 800; color: #eafff3; text-shadow: 0 1px 2px rgba(0,0,0,0.5); padding: 7px 14px; border-radius: 999px; border: none; cursor: pointer; background: linear-gradient(180deg, #2f8455, #1f6440 45%, #164026 80%); }
/* Jackpot-first featured band — gold frame/ground/glow come from .c7p-card-gold */
.v2cs-jp { margin: 0 0 18px; padding: 12px 12px 4px; }
.v2cs-jp-h { display: flex; align-items: center; gap: 10px; margin: 2px 2px 10px; }
.v2cs-jp-t { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 900; letter-spacing: 0.2px; color: #ffe9a8; }
.v2cs-jp-t svg { color: #f6c945; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4)); }
.v2cs-jp-all { font-size: 11px; font-weight: 800; color: #ffd24d; background: none; border: none; cursor: pointer; font-family: inherit; padding: 4px 2px; }
.v2cs-jp-all:active { opacity: 0.7; }
.v2cs-jp-rail { display: grid; grid-auto-flow: column; grid-auto-columns: 30%; gap: 10px; overflow-x: auto; scroll-snap-type: x proximity; padding: 2px 2px 8px; scrollbar-width: none; -webkit-overflow-scrolling: touch; -webkit-mask: linear-gradient(90deg, #000 92%, transparent); mask: linear-gradient(90deg, #000 92%, transparent); }
.v2cs-jp-rail::-webkit-scrollbar { display: none; }
.v2cs-jp-rail > * { scroll-snap-align: start; }
@media (max-width: 420px) { .v2cs-jp-rail { grid-auto-columns: 33%; } }
.v2cs-count { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 900; letter-spacing: 1.4px; text-transform: uppercase; margin: 2px 2px 13px;
  background: linear-gradient(180deg, #fff6d5, #ffe9a8 55%, #f6c945); -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
.v2cs-count::before { content: ""; flex: none; width: 4px; height: 15px; border-radius: 3px; background: linear-gradient(180deg, #ffe9a8, #d68a1e); box-shadow: 0 0 8px rgba(246,201,69,0.7); -webkit-text-fill-color: initial; }
.v2cs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
@media (min-width: 421px) { .v2cs-grid { grid-template-columns: repeat(4, 1fr); } }
.v2cs-empty { text-align: center; color: rgba(220,232,223,0.5); font-size: 13px; padding: 48px 0; }
.v2cs-foot { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 22px; font-size: 10px; font-weight: 600; color: rgba(220,232,223,0.45); text-align: center; }
`;

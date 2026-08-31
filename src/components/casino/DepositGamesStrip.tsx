import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLiveCatalog, type CatalogGame } from '@/lib/igaming';

/**
 * DepositGamesStrip — a light "play while you wait" teaser shown at the bottom
 * of the crypto deposit page. Pulls the REAL provider catalog (cached) and shows
 * a horizontal scroller of popular games; tapping any card (or "See all") opens
 * the games lobby where the real launch happens. Renders nothing if the catalog
 * is empty, so it never shows a dead strip.
 */

const POPULAR = ['2476', '4161', '4434', '2315', '2212', '3429', '2888', '2922', '4345'];

export default function DepositGamesStrip() {
  const nav = useNavigate();
  const [games, setGames] = useState<CatalogGame[]>([]);

  useEffect(() => {
    let alive = true;
    fetchLiveCatalog()
      .then(({ games }) => {
        if (!alive || !games.length) return;
        const byUid = new Map(games.map((g) => [g.uid, g]));
        const pop = POPULAR.map((id) => byUid.get(id)).filter(Boolean) as CatalogGame[];
        const rest = games.filter((g) => !POPULAR.includes(g.uid));
        setGames([...pop, ...rest].slice(0, 12));
      })
      .catch(() => { /* hide on error */ });
    return () => { alive = false; };
  }, []);

  if (!games.length) return null;

  return (
    <div className="dgs">
      <style>{`
        .dgs { margin-top: 4px; }
        .dgs-head { display: flex; align-items: center; justify-content: space-between; padding: 0 4px 8px; }
        .dgs-title { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 900; letter-spacing: .5px;
          color: #ffe9a8; }
        .dgs-title .dot { width: 6px; height: 6px; border-radius: 50%; background: #34e58a; box-shadow: 0 0 8px #34e58a; animation: dgs-pulse 1.5s ease-in-out infinite; }
        .dgs-all { background: none; border: none; color: #34e58a; font-size: 10px; font-weight: 900; letter-spacing: 1.2px;
          text-transform: uppercase; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; }
        .dgs-scroll { display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 2px 4px 8px; scrollbar-width: none; }
        .dgs-scroll::-webkit-scrollbar { display: none; }
        .dgs-card { position: relative; flex: 0 0 auto; width: 96px; scroll-snap-align: start; cursor: pointer;
          border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,214,110,.4);
          box-shadow: 0 8px 18px -8px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,240,190,.15);
          background: linear-gradient(160deg,#0f5330,#061c11); transition: transform .15s ease; }
        .dgs-card:active { transform: scale(.96); }
        .dgs-thumb { width: 96px; height: 96px; object-fit: cover; display: block; background: linear-gradient(160deg,#134e2f,#07240f); }
        .dgs-fallback { width: 96px; height: 96px; display: grid; place-items: center; font-size: 30px; font-weight: 900; color: #ffd24d;
          background: radial-gradient(120% 100% at 50% 0%, rgba(255,214,120,.2), transparent 60%), linear-gradient(160deg,#134e2f,#07240f); }
        .dgs-shade { position: absolute; left: 0; right: 0; bottom: 0; padding: 14px 7px 6px; pointer-events: none;
          background: linear-gradient(180deg, transparent, rgba(3,10,6,.92)); }
        .dgs-name { font-size: 9.5px; font-weight: 800; color: #fff; line-height: 1.15; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dgs-play { position: absolute; top: 7px; right: 7px; width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center;
          background: radial-gradient(120% 100% at 50% 15%, #fff2c4, transparent 55%), linear-gradient(180deg,#ffd24d,#e0a514);
          color: #241800; font-size: 9px; box-shadow: 0 3px 8px -2px rgba(255,190,60,.6); }
        @keyframes dgs-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(1.35); } }
      `}</style>

      <div className="dgs-head">
        <span className="dgs-title"><span className="dot" /> 🎮 Play while you wait</span>
        <button className="dgs-all" onClick={() => nav('/v3/games')}>See all ›</button>
      </div>

      <div className="dgs-scroll">
        {games.map((g) => (
          <button key={g.uid} className="dgs-card" onClick={() => nav('/v3/games')} aria-label={`Play ${g.name}`}>
            {g.thumbnail ? (
              <img
                className="dgs-thumb"
                src={g.thumbnail}
                alt=""
                loading="lazy"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <span className="dgs-fallback">{g.name.slice(0, 1).toUpperCase()}</span>
            )}
            <span className="dgs-play" aria-hidden="true">▶</span>
            <span className="dgs-shade"><span className="dgs-name">{g.name}</span></span>
          </button>
        ))}
      </div>
    </div>
  );
}

// useC74Originals — loads the data-driven C74 Originals registry (built-in
// defaults merged with public/games-html/games.json) for the lobby + Originals
// page. Starts from the built-in list so the UI paints instantly, then swaps in
// the merged list once the JSON index resolves. Presentation-only.

import { useEffect, useState } from 'react';
import { C74_ORIGINALS, fetchC74Registry, type C74Original } from './registry';

export function useC74Originals(): { games: C74Original[]; loading: boolean } {
  const [games, setGames] = useState<C74Original[]>(C74_ORIGINALS);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetchC74Registry()
      .then((g) => { if (alive) { setGames(g); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return { games, loading };
}

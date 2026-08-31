/**
 * useAppAssets — slot-bound images from the DB asset library (get_app_assets).
 *
 * Returns a { asset_key: image } map so drop-in slots (e.g. the C74 wheel's
 * wheelFace / hub) render admin-managed AI art instead of built-in vector art.
 * Display-only.
 *
 * Zero-reload: the map is cached at module scope, but an EMPTY result is never
 * cached permanently — while empty, the hook re-fetches on mount and on window
 * focus / tab-visibility, so assets that get bound while the app is open appear
 * without a manual reload. Once a non-empty map is loaded it's reused (assets are
 * stable within a session) and every mounted component is notified via listeners.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AssetMap = Record<string, string>;
let cache: AssetMap | null = null;
let inflight: Promise<AssetMap> | null = null;

const listeners = new Set<(m: AssetMap) => void>();
const isEmpty = (m: AssetMap | null) => !m || Object.keys(m).length === 0;

function publish(m: AssetMap) {
  cache = m;
  listeners.forEach((fn) => fn(m));
}

async function rawFetch(): Promise<AssetMap> {
  try {
    const { data, error } = await (supabase.rpc as any)('get_app_assets');
    return (!error && data && typeof data === 'object') ? (data as AssetMap) : {};
  } catch {
    return {};
  }
}

/** Fetch the asset map. Reuses a non-empty cache; otherwise (empty/forced) hits
 *  the RPC. De-dupes concurrent calls via `inflight`. */
async function fetchAssets(force = false): Promise<AssetMap> {
  if (!force && !isEmpty(cache)) return cache as AssetMap;
  if (!inflight) {
    inflight = (async () => {
      const m = await rawFetch();
      inflight = null;
      // Publish when we actually got something new (avoid clobbering a good
      // cache with a transient empty result, and avoid needless re-renders).
      if (!isEmpty(m)) publish(m);
      else if (cache === null) publish(m); // first load resolved empty → expose {}
      return cache ?? m;
    })();
  }
  return inflight;
}

export function useAppAssets(): AssetMap {
  const [assets, setAssets] = useState<AssetMap>(cache ?? {});
  useEffect(() => {
    let alive = true;
    const onChange = (m: AssetMap) => { if (alive) setAssets(m); };
    listeners.add(onChange);

    void fetchAssets().then((m) => { if (alive) setAssets(cache ?? m); });

    // While we don't yet have assets, re-check when the app regains focus /
    // becomes visible — this is how a session open during binding self-heals.
    const recheck = () => { if (isEmpty(cache)) void fetchAssets(true); };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      alive = false;
      listeners.delete(onChange);
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, []);
  return assets;
}

import { supabase } from '@/integrations/supabase/client';
import catalogSeed from '@/config/liveCatalogSeed.json';
import activeGamesBundle from '@/config/activeGames.json';

/**
 * launchProviderGame — client contract for the iGaming APIs aggregator.
 *
 * Calls the `igaming` edge function (which holds the Token/Secret server-side)
 * and returns a signed game URL for the current user. The secret NEVER touches
 * the browser. Until the edge function is deployed + configured
 * (IGAMING_ENABLED=true) this resolves to `{ ok:false, reason:'not_configured' }`
 * so the UI can show "coming soon" instead of erroring.
 */
export type LaunchResult =
  | { ok: true; url: string }
  | { ok: false; reason: 'unauthenticated' | 'not_configured' | 'error'; detail?: string };

export interface CatalogGame {
  uid: string;
  name: string;
  provider: string;
  category: string;
  thumbnail: string | null;
}

// Static catalog seed built from the aggregator's Games Library export
// (scripts/build-live-catalog.mjs). Each game's `uid` is the aggregator game
// id (extracted from the image URL); launch happens through the edge function.
// This lets the lobby show the REAL branded catalog immediately, before the
// live games-list endpoint is wired. When the edge `list` action returns games
// (endpoint configured), those authoritative results win over the seed.
const SEED: CatalogGame[] = (catalogSeed as CatalogGame[]);

/**
 * fetchLiveCatalog — pulls the ACTIVE provider games from the aggregator via
 * the `igaming` edge function (?action=list). If the live games-list endpoint
 * isn't wired yet, falls back to the static catalog seed so the lobby still
 * shows the real provider games (launch stays gated until IGAMING_ENABLED).
 */
export async function fetchLiveCatalog(): Promise<{ games: CatalogGame[]; configured: boolean; source: 'live' | 'seed' }> {
  try {
    const { data } = await supabase.functions.invoke('igaming', { body: { action: 'list' } });
    const live = Array.isArray(data?.games) ? (data.games as CatalogGame[]) : [];
    if (live.length) return { games: live, configured: !!data.configured, source: 'live' };
  } catch { /* fall through to seed */ }
  // Fallback: the bundled catalog seed (real games, launch gated server-side).
  return { games: SEED, configured: SEED.length > 0, source: 'seed' };
}

// Aggregator art is served from a Cloudflare Images CDN keyed by the game uid,
// so a thumbnail URL can be constructed for ANY aggregator id — even one that
// isn't in the bundled seed. This lets the operator's activated-games list
// render real branded art from just the id. (Read-only asset URL; no money.)
export const aggregatorThumb = (uid: string): string =>
  `https://imagedelivery.net/nVyft9zNw2I0pNVtrnC1zA/${uid}/public`;

// One entry in the operator's activated-games allowlist. `uid` is required;
// `name`/`category` are optional overrides (used when the id isn't in the seed).
export interface AllowEntry { uid: string; name?: string; category?: string }

/**
 * fetchActiveAllowlist — reads the operator's activated-games list from
 * site_config (key `active_game_uids`). When present and non-empty, the user
 * dashboard shows ONLY those games, IN THIS ORDER (e.g. the 73 titles activated
 * on the aggregator). Absent/empty → show the full catalog. Read-only; no
 * launch/money behavior is affected.
 *
 * Accepts several shapes so the operator can paste whatever they have:
 *   - ["3265","1214", …]                             (ids only)
 *   - [{ "uid":"3265","name":"Mr. Frankenstein","category":"slots" }, …]
 *   - { "uids":[…] }  or  "3265,1214 1215"           (string / wrapped)
 * Ids not in the seed still render — art comes from `aggregatorThumb(uid)`.
 */
export async function fetchActiveAllowlist(): Promise<AllowEntry[] | null> {
  try {
    const { data } = await supabase.from('site_config').select('value').eq('key', 'active_game_uids').maybeSingle();
    const v = (data as { value?: unknown } | null)?.value;
    let arr: unknown = v;
    if (typeof v === 'string') { try { arr = JSON.parse(v); } catch { arr = v.split(/[\s,]+/); } }
    else if (v && typeof v === 'object' && Array.isArray((v as { uids?: unknown }).uids)) arr = (v as { uids: unknown[] }).uids;
    if (Array.isArray(arr) && arr.length) {
      const entries = arr.map((x): AllowEntry | null => {
        if (x && typeof x === 'object') {
          const o = x as Record<string, unknown>;
          const uid = o.uid ?? o.id ?? o.game_uid;
          if (uid == null) return null;
          return { uid: String(uid), name: o.name ? String(o.name) : undefined, category: o.category ? String(o.category) : undefined };
        }
        const uid = String(x).trim();
        return uid ? { uid } : null;
      }).filter((e): e is AllowEntry => !!e);
      if (entries.length) return entries;
    }
  } catch { /* fall through to the bundled default below */ }
  // No site_config row → fall back to the bundled activated-games list (the
  // operator's real 2J titles, verified from the aggregator library). This is
  // the honest CATALOG view: display only, launch stays interlocked (501).
  const bundle = activeGamesBundle as AllowEntry[];
  if (Array.isArray(bundle) && bundle.length) return bundle.map((e) => ({ uid: String(e.uid), name: e.name, category: e.category }));
  return null;
}

export async function launchProviderGame(gameId: string, provider?: string): Promise<LaunchResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, reason: 'unauthenticated' };

  try {
    const { data, error } = await supabase.functions.invoke('igaming', {
      body: { action: 'launch', gameId, provider },
    });
    if (error) {
      // 501 from the safety interlock surfaces here until the integration is live.
      const status = (error as any)?.context?.status;
      if (status === 501) return { ok: false, reason: 'not_configured' };
      return { ok: false, reason: 'error', detail: error.message };
    }
    if (data?.url) return { ok: true, url: data.url as string };
    return { ok: false, reason: 'not_configured' };
  } catch (e) {
    return { ok: false, reason: 'error', detail: String((e as any)?.message ?? e) };
  }
}

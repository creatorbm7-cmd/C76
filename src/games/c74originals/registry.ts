/**
 * C74 Originals — in-house HTML5 slot games, hosted locally and launched inside
 * a premium C74 frame (see C74SlotHost). These are SEPARATE from the 73 2J
 * white-label games (which launch through the aggregator) — they coexist in the
 * lobby. Each game's files live under `public/games-html/<slug>/` (entry
 * `index.html`); see that folder's README for install steps.
 *
 * To go live: drop the purchased package into public/games-html/<slug>/ and set
 * `enabled: true`. Until then the harness stays dormant (nothing renders).
 */
export interface C74Original {
  slug: string;
  name: string;
  category: string;
  provider: string;
  thumbnail?: string;   // /games-html/<slug>/thumb.png (optional; asset_key `game.<slug>` also works)
  blurb?: string;       // short lobby tagline
  enabled: boolean;     // false → shows as "Coming soon" in the Originals lobby, not launchable
  orientation?: 'portrait' | 'landscape' | 'auto'; // host hint (default 'portrait')
  icon?: string;        // /games-html/<slug>/icon.png (optional)
  banner?: string;      // /games-html/<slug>/banner.png (optional)
}

// The C74 ZIP-game registry. Onboarding a CodeCanyon HTML5 slot is convention-based
// (see public/games-html/README + docs/C74-ZIP-GAME-ENGINE.md):
//   ZIP → extract to public/games-html/<slug>/ (entry index.html) → add a row here
//   → (optional) bind card art via AI Studio `game.<slug>` → set enabled:true → deploy.
// C74SlotHost hosts ANY such folder generically; nothing here is game-specific.
export const C74_ORIGINALS: C74Original[] = [
  {
    slug: 'mayan-temple',
    name: 'Mayan Temple',
    category: 'slots',
    provider: 'C74 Originals',
    thumbnail: '/games-html/mayan-temple/thumb.png',
    blurb: 'Uncover the jungle jackpot',
    enabled: true,
  },
  // Pipeline-ready placeholders — flip enabled:true once the folder is installed.
  { slug: 'golden-pharaoh', name: 'Golden Pharaoh', category: 'slots', provider: 'C74 Originals', blurb: "Riches of the pharaoh's tomb", enabled: false },
  { slug: 'dragon-fortune', name: 'Dragon Fortune', category: 'slots', provider: 'C74 Originals', blurb: 'Awaken the fortune dragon', enabled: false },
];

export const c74OriginalBySlug = (slug: string): C74Original | null =>
  C74_ORIGINALS.find((g) => g.slug === slug) ?? null;

// Enabled games only (used by the main-lobby rail).
export const c74OriginalsLive = (): C74Original[] => C74_ORIGINALS.filter((g) => g.enabled);

// All registered games incl. "coming soon" (used by the dedicated Originals lobby).
export const allC74Originals = (): C74Original[] => C74_ORIGINALS;

// A human name from a bare slug (fallback when a folder has no registry entry).
export function slugToName(slug: string): string {
  return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function coerce(raw: unknown, prev?: C74Original): C74Original | null {
  const r = raw as Record<string, unknown>;
  if (!r || typeof r.slug !== 'string') return null;
  const slug = r.slug;
  return {
    slug,
    name: typeof r.name === 'string' ? r.name : prev?.name ?? slugToName(slug),
    category: typeof r.category === 'string' ? r.category : prev?.category ?? 'slots',
    provider: typeof r.provider === 'string' ? r.provider : prev?.provider ?? 'C74 Originals',
    thumbnail: typeof r.thumbnail === 'string' ? r.thumbnail : prev?.thumbnail,
    blurb: typeof r.blurb === 'string' ? r.blurb : prev?.blurb,
    enabled: typeof r.enabled === 'boolean' ? r.enabled : prev?.enabled ?? false,
    orientation: (r.orientation === 'portrait' || r.orientation === 'landscape' || r.orientation === 'auto')
      ? r.orientation : prev?.orientation ?? 'portrait',
    icon: typeof r.icon === 'string' ? r.icon : prev?.icon,
    banner: typeof r.banner === 'string' ? r.banner : prev?.banner,
  };
}

/**
 * Data-driven registry: merges the built-in defaults with the runtime index at
 * `public/games-html/games.json`. This is what makes the engine support UNLIMITED
 * games WITHOUT touching the core codebase — add a folder + a games.json row and
 * the game appears; src/ is never edited. JSON rows override built-ins by slug.
 * Any fetch/parse failure falls back to the built-in list (never throws).
 */
export async function fetchC74Registry(): Promise<C74Original[]> {
  try {
    const res = await fetch('/games-html/games.json', { cache: 'no-cache' });
    if (!res.ok) return C74_ORIGINALS;
    const data = await res.json();
    if (!Array.isArray(data)) return C74_ORIGINALS;
    const bySlug = new Map<string, C74Original>();
    for (const g of C74_ORIGINALS) bySlug.set(g.slug, g);
    for (const raw of data) {
      const merged = coerce(raw, bySlug.get((raw as { slug?: string })?.slug ?? ''));
      if (merged) bySlug.set(merged.slug, merged);
    }
    return Array.from(bySlug.values());
  } catch {
    return C74_ORIGINALS;
  }
}

/** Resolve one game's meta from the data-driven registry, falling back to the
 *  built-in entry, then to a synthesized entry (so ANY installed folder hosts). */
export async function resolveC74Original(slug: string): Promise<C74Original> {
  const list = await fetchC74Registry();
  return (
    list.find((g) => g.slug === slug) ??
    c74OriginalBySlug(slug) ??
    { slug, name: slugToName(slug), category: 'slots', provider: 'C74 Originals', enabled: true, orientation: 'portrait' }
  );
}

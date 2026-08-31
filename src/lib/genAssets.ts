// genAssets — static cutout assets produced by scripts/cutout_assets.py.
//
// The script writes transparent PNGs to /images/v3/gen/<slot-with-dashes>.png and
// lists their slot keys in /images/v3/gen/manifest.json. This hook loads that
// manifest ONCE (module-cached) so <C7Asset> / the reels only reach for a static
// file when one actually exists — no 404 storm before any cutouts are made.
//
// Precedence at the call site: bound Admin art → gen cutout (manifest) → built-in
// fallback. Display-only.
import { useEffect, useState } from "react";

let cache: Set<string> | null = null;
let inflight: Promise<Set<string>> | null = null;
const listeners = new Set<(s: Set<string>) => void>();

async function load(): Promise<Set<string>> {
  if (cache) return cache;
  if (!inflight) {
    inflight = (async () => {
      try {
        const r = await fetch("/images/v3/gen/manifest.json", { cache: "no-cache" });
        const arr = r.ok ? await r.json() : [];
        cache = new Set(Array.isArray(arr) ? (arr as string[]) : []);
      } catch {
        cache = new Set();
      }
      listeners.forEach((fn) => fn(cache as Set<string>));
      return cache as Set<string>;
    })();
  }
  return inflight;
}

/** `/images/v3/gen/<slot-with-dots-as-dashes>.png` — e.g. `c74.medallion` → `.../c74-medallion.png`. */
export const genPathFor = (slot: string) => `/images/v3/gen/${slot.replace(/\./g, "-")}.png`;

export function useGenAssets(): Set<string> {
  const [set, setSet] = useState<Set<string>>(cache ?? new Set());
  useEffect(() => {
    let alive = true;
    const on = (s: Set<string>) => { if (alive) setSet(s); };
    listeners.add(on);
    void load().then((s) => { if (alive) setSet(s); });
    return () => { alive = false; listeners.delete(on); };
  }, []);
  return set;
}

/**
 * slots — discover the V2 art slot registry straight from source.
 *
 * The single source of truth for bindable keys is the SLOT_KEYS array in
 * AdminAiStudio.tsx (that dropdown is what an owner picks from). We parse it,
 * then scan the V2 components to mark which keys are actually *consumed* at
 * runtime (wired) versus merely registered (legacy V1-era keys no V2 component
 * reads). The recommended PNG size / transparency for each key comes from the
 * asset brief and is expressed as prefix rules so new keys inherit sensibly.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const REPO = process.cwd();
const ADMIN = join(REPO, "src/components/admin/AdminAiStudio.tsx");
const SCAN_DIRS = [join(REPO, "src/pages/v2"), join(REPO, "src/components")];

/** Every { v, l } entry in SLOT_KEYS, minus the non-bindable sentinels. */
export function discoverSlots() {
  const src = readFileSync(ADMIN, "utf8");
  const out = [];
  const re = /\{\s*v:\s*"([^"]*)",\s*l:\s*"([^"]*)"\s*\}/g;
  let m;
  while ((m = re.exec(src))) {
    const v = m[1];
    if (v === "" || v === "__custom") continue; // "Library only" / freeform game key
    out.push({ key: v, label: m[2] });
  }
  return out;
}

function walk(dir, acc = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const e of entries) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(tsx?|jsx?)$/.test(e) && !/\.test\./.test(e) && p !== ADMIN) acc.push(p);
  }
  return acc;
}

/** Set of slot keys referenced by any V2 component (art[..]/assets[..]/k:"..").
 *  Also reports dynamic families (v2.badge.*, game.*) that are wired via
 *  template literals rather than string literals. */
export function discoverWired() {
  const literal = new Set();
  const dynamic = new Set();
  for (const f of SCAN_DIRS.flatMap((d) => walk(d))) {
    const s = readFileSync(f, "utf8");
    // Bracket string-access on an asset map: art["k"] / assets['k'] / dbAssets["k"].
    // Lookbehind keeps `chart[`/`part[` from matching the bare `art`.
    for (const mm of s.matchAll(/(?<![\w])(?:art|assets|dbAssets)\[\s*["']([a-z0-9._]+)["']\s*\]/gi)) literal.add(mm[1]);
    for (const mm of s.matchAll(/\bk:\s*"([a-z0-9._]+)"/g)) literal.add(mm[1]);
    if (/`v2\.badge\.\$\{/.test(s)) dynamic.add("v2.badge.*");
    if (/`game\.\$\{|gameArt\(/.test(s)) dynamic.add("game.*");
  }
  return { literal, dynamic };
}

// Recommended spec per key, resolved by longest-prefix match. size:[w,h] or
// null (freeform / backdrop); alpha:true means a transparent PNG is required.
const SPEC_RULES = [
  ["v2.nav.", { size: [512, 512], alpha: true }],
  ["v2.qa.", { size: [512, 512], alpha: true }],
  ["v2.trust.", { size: [512, 512], alpha: true }],
  ["v2.badge.", { size: [512, 512], alpha: true }],
  ["v2.promo.", { size: [1024, 512], alpha: true }],
  ["v2.reward.", { size: [512, 512], alpha: true }],
  ["v2.jackpot.wheel", { size: [1024, 1024], alpha: true }],
  ["v2.jackpot.coin", { size: [1024, 1024], alpha: true }],
  ["v2.jackpot", { size: null, alpha: false }], // arena backdrop
  ["v2.hero.frame", { size: [1536, 768], alpha: true }],
  ["v2.btn.", { size: null, alpha: true }],
  ["v2.vip", { size: [512, 512], alpha: true }],
  ["v2.lobby.bg", { size: null, alpha: false }],
  ["v2.ambient.layer", { size: null, alpha: true }],
  ["game.", { size: [768, 1024], alpha: false }],
];

/** Recommended { size, alpha } for a key, or null if no rule matches. */
export function specFor(key) {
  let best = null;
  for (const [prefix, spec] of SPEC_RULES) {
    if (key.startsWith(prefix) && (!best || prefix.length > best[0].length)) best = [prefix, spec];
  }
  return best ? best[1] : null;
}

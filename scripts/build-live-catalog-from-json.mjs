#!/usr/bin/env node
/**
 * build-live-catalog-from-json.mjs — convert a games-extended.json export
 * (the `{id,name,cat,status,accent,rtp,popular,provider,coverUrl}` shape) into
 * the C7 live-lobby seed `src/config/liveCatalogSeed.json`
 * (`{uid,name,provider,category,thumbnail}`).
 *
 * The launch `uid` is extracted from each `coverUrl` image filename, e.g.
 *   https://igamingapis.com/img/9560.png                        -> 9560
 *   https://imagedelivery.net/nVyft9zNw2I0pNVtrnC1zA/1161/public -> 1161
 *
 *   Usage: node scripts/build-live-catalog-from-json.mjs
 *   In:    src/data/games-extended.json     (commit the full file here)
 *   Out:   src/config/liveCatalogSeed.json
 */
import { readFileSync, writeFileSync } from 'node:fs';

const IN = 'src/data/games-extended.json';
const OUT = 'src/config/liveCatalogSeed.json';

// entity + mojibake cleanup (ampersand entity unescaped LAST — CodeQL js/double-escaping)
function cleanName(s) {
  return String(s || '')
    .replace(/&#0?39;/g, "'")
    .replace(/&#0?34;/g, '"')
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/�/g, '')          // replacement char �
    .replace(/ï¿½/g, '')             // mangled UTF-8 replacement
    .replace(/Ð¥|Ð|Ñ/g, '')          // stray mojibake bytes
    .replace(/&amp;/gi, '&')         // ampersand LAST
    .replace(/\s+/g, ' ')
    .trim();
}

const PROVIDER_MAP = [
  [/pragmatic/i, 'Pragmatic Play'], [/red ?tiger/i, 'Red Tiger'], [/play.?n.?go/i, "Play'n GO"],
  [/^b?gaming$|^bg$|^bgaming$/i, 'BGaming'], [/netent/i, 'NetEnt'], [/micro ?gaming/i, 'Microgaming'],
  [/3 ?oaks|bng/i, '3 Oaks'], [/hacksaw/i, 'Hacksaw'], [/evolution/i, 'Evolution'], [/ezugi/i, 'Ezugi'],
  [/pg ?soft|pgs?gaming/i, 'PG Soft'], [/jili/i, 'JILI'], [/relax ?gaming/i, 'Relax Gaming'],
  [/playtech/i, 'Playtech'], [/habanero/i, 'Habanero'], [/endorphina/i, 'Endorphina'],
  [/game ?art/i, 'GameArt'], [/ag ?gaming|playace|^ag$/i, 'AG Gaming'], [/turbogames/i, 'Turbo Games'],
  [/aura ?gaming/i, 'Aura Gaming'], [/mac ?88/i, 'MAC88'], [/nolimit/i, 'Nolimit City'],
  [/playson/i, 'Playson'], [/skywind/i, 'Skywind'], [/evoplay/i, 'Evoplay'], [/tada ?gaming/i, 'TADA'],
  [/funky ?games/i, 'Funky Games'], [/king ?midas|one ?gaming/i, 'King Midas'], [/^ka$/i, 'KA Gaming'],
  [/^sg$/i, 'Spadegaming'], [/^cq9$/i, 'CQ9'], [/rubyplay/i, 'RubyPlay'], [/amigo/i, 'Amigo Gaming'],
  [/smartsoft/i, 'SmartSoft'], [/^sbo$/i, 'SBO'], [/mt ?gaming/i, 'MT Gaming'], [/gamingsoft/i, 'GamingSoft'],
  [/epicwin/i, 'EpicWin'], [/nextspin/i, 'NextSpin'], [/fast ?spin/i, 'Fast Spin'],
];
function cleanProvider(raw) {
  const r = cleanName(raw);
  for (const [re, name] of PROVIDER_MAP) if (re.test(r)) return name;
  return r.replace(/[（(](asia|eu|world|h5)[）)]/gi, '')
    .replace(/[-_\s]+(asia|eu|world|h5|one gaming)$/gi, '').replace(/\s+/g, ' ').trim() || 'Live';
}

// map the games-extended `cat` → C7 rail key (see liveCategories.ts)
function mapCat(cat, name, url) {
  const c = String(cat || '').toLowerCase();
  if (c === 'cards' || c === 'table') return 'card';
  if (c === 'specialty') {
    const t = (name + ' ' + url).toLowerCase();
    if (/lotter|lotto|keno|bingo|scratch|5d/.test(t)) return 'lottery';
    return 'mini';
  }
  if (['slots', 'live', 'crash', 'sports', 'fishing'].includes(c)) return c;
  return 'slots';
}

const extractUid = (url) => (String(url || '').match(/\/(\d+)(?:\.[a-z]+)?(?:\/public)?\s*$/i) || [])[1] || '';

const rows = JSON.parse(readFileSync(IN, 'utf8'));
const seen = new Set();
const out = [];
let noUid = 0, dupes = 0;
for (const g of rows) {
  const uid = extractUid(g.coverUrl);
  const name = cleanName(g.name);
  if (!name) continue;
  if (!uid) { noUid++; continue; }
  if (seen.has(uid)) { dupes++; continue; }
  seen.add(uid);
  out.push({ uid, name, provider: cleanProvider(g.provider), category: mapCat(g.cat, name, g.coverUrl), thumbnail: String(g.coverUrl || '') });
}
out.sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));
writeFileSync(OUT, JSON.stringify(out, null, 0) + '\n');

const byCat = {}, prov = new Set();
for (const g of out) { byCat[g.category] = (byCat[g.category] || 0) + 1; prov.add(g.provider); }
console.log(`✓ ${out.length} games → ${OUT}`);
console.log(`  providers: ${prov.size} | skipped(no uid): ${noUid} | deduped: ${dupes}`);
console.log('  categories:', JSON.stringify(byCat));

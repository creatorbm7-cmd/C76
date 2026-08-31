#!/usr/bin/env node
/**
 * build-live-catalog.mjs — turn the aggregator's "Games Library" CSV export
 * (Game ID, Game Name, Brand, Category, Image URL) into a production-ready,
 * de-duplicated catalog seed for the C7 Live Casino lobby.
 *
 * The export's "Game ID" column is blank, BUT the aggregator's numeric game id
 * is embedded in the Image URL filename, e.g.
 *   https://igamingapis.com/img/9560.png                        -> 9560
 *   https://imagedelivery.net/nVyft9zNw2I0pNVtrnC1zA/1161/public -> 1161
 * We extract that number as the launch `uid` (verify one launch in sandbox
 * before go-live — this is the only id the export gives us).
 *
 *   Usage:  node scripts/build-live-catalog.mjs scripts/games_export.csv
 *   Output: src/config/liveCatalogSeed.json   (array of {uid,name,provider,category,thumbnail})
 */
import { readFileSync, writeFileSync } from 'node:fs';

const inPath = process.argv[2] ?? 'scripts/games_export.csv';
const outPath = process.argv[3] ?? 'src/config/liveCatalogSeed.json';

// ── minimal RFC-4180 CSV parser (handles quoted fields + embedded commas) ──
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ── HTML entity / mojibake cleanup for names ──
// NOTE: the ampersand entity (&amp; -> &) MUST be unescaped LAST, otherwise
// a value like "&amp;lt;" would be double-unescaped into "<" (CodeQL
// js/double-escaping). Named/numeric entities first, ampersand last, once.
function cleanName(s) {
  return (s || '')
    .replace(/&#0?39;/g, "'")
    .replace(/&#0?34;/g, '"')
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/�/g, '')        // replacement char
    .replace(/&amp;/gi, '&')  // ampersand LAST — avoids double-unescaping
    .replace(/_/g, ' ')       // export artifact: underscores → spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// ── provider/brand normalization → clean display name + family key ──
const PROVIDER_MAP = [
  [/pragmatic/i, 'Pragmatic Play'],
  [/red ?tiger/i, 'Red Tiger'],
  [/play.?n.?go/i, "Play'n GO"],
  [/^b?gaming$|^bg$|^bgaming$/i, 'BGaming'],
  [/netent/i, 'NetEnt'],
  [/micro ?gaming/i, 'Microgaming'],
  [/3 ?oaks|bng/i, '3 Oaks'],
  [/hacksaw/i, 'Hacksaw'],
  [/evolution/i, 'Evolution'],
  [/ezugi/i, 'Ezugi'],
  [/pg ?soft|pgs?gaming/i, 'PG Soft'],
  [/jili/i, 'JILI'],
  [/relax ?gaming/i, 'Relax Gaming'],
  [/playtech/i, 'Playtech'],
  [/habanero/i, 'Habanero'],
  [/endorphina/i, 'Endorphina'],
  [/game ?art/i, 'GameArt'],
  [/ag ?gaming|playace|^ag$/i, 'AG Gaming'],
  [/turbogames/i, 'Turbo Games'],
  [/aura ?gaming/i, 'Aura Gaming'],
  [/mac ?88/i, 'MAC88'],
  [/nolimit/i, 'Nolimit City'],
  [/playson/i, 'Playson'],
  [/skywind/i, 'Skywind'],
  [/evoplay/i, 'Evoplay'],
  [/tada ?gaming/i, 'TADA'],
  [/funky ?games/i, 'Funky Games'],
  [/king ?midas|one ?gaming/i, 'King Midas'],
  [/^ka$/i, 'KA Gaming'],
  [/^sg$/i, 'Spadegaming'],
  [/^cq9$/i, 'CQ9'],
  [/rubyplay/i, 'RubyPlay'],
  [/amigo/i, 'Amigo Gaming'],
  [/smartsoft/i, 'SmartSoft'],
  [/^sbo$/i, 'SBO'],
  [/mt ?gaming/i, 'MT Gaming'],
  [/gamingsoft/i, 'GamingSoft'],
  [/epicwin/i, 'EpicWin'],
  [/nextspin/i, 'NextSpin'],
  [/fast ?spin/i, 'Fast Spin'],
];
function cleanProvider(raw) {
  const r = cleanName(raw);
  for (const [re, name] of PROVIDER_MAP) if (re.test(r)) return name;
  // generic: drop region / platform suffixes
  return r
    .replace(/[（(](asia|eu|world|h5)[）)]/gi, '')
    .replace(/[-_\s]+(asia|eu|world|h5|one gaming)$/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Live';
}

// ── category normalization → C7 rail keys (see liveCategories.ts) ──
function normCategory(raw, provider) {
  const c = (raw || '').toLowerCase();
  const has = (...xs) => xs.some((x) => c.includes(x));
  if (has('sport', '9wicket')) return 'sports';
  if (has('crash', 'aviator')) return 'crash';
  if (has('fish', 'shooting', '捕鱼')) return 'fishing';
  if (has('lottery', 'virtual', 'scratch', 'keno', 'bingo', 'lotto')) return 'lottery';
  if (has('live', 'casino live', 'casinolive', '百人场', 'baccarat', 'roulette', 'dragon tiger', 'sic bo')) return 'live';
  if (has('poker', 'table', 'teen', 'card', 'pok', 'blackjack', '棋牌', 'judgement', 'andar', 'rummy')) return 'card';
  if (has('mini', 'arcade', 'instant', 'chess', 'dice', 'plinko', 'xgames', 'x games')) return 'mini';
  if (has('slot', 'hotslot', 'video slot', 'flash', 'pvc')) return 'slots';
  return 'slots'; // safe default — most of the catalog is slots
}

// ── extract aggregator game id from the image URL filename ──
function extractUid(url) {
  const m = (url || '').match(/\/(\d+)(?:\.[a-z]+)?(?:\/public)?\s*$/i);
  return m ? m[1] : '';
}

const slugify = (s) => cleanName(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

// ── run ──
const rows = parseCsv(readFileSync(inPath, 'utf8'));
const header = rows.shift() || [];
const idx = (name) => header.findIndex((h) => h.trim().toLowerCase() === name);
const iName = idx('game name'), iBrand = idx('brand'), iCat = idx('category'), iImg = idx('image url');

const seen = new Set();
const out = [];
let noUid = 0, dupes = 0;
for (const r of rows) {
  if (!r || r.length < 2) continue;
  const name = cleanName(r[iName]);
  const thumbnail = (r[iImg] || '').trim();
  const uid = extractUid(thumbnail);
  if (!name) continue;
  if (!uid) { noUid++; continue; }               // can't launch without an id
  const provider = cleanProvider(r[iBrand]);
  const category = normCategory(r[iCat], provider);
  const key = slugify(name);                       // dedupe by normalized name
  if (seen.has(key)) { dupes++; continue; }
  seen.add(key);
  out.push({ uid, name, provider, category, thumbnail });
}

// deterministic order: provider, then name
out.sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));
writeFileSync(outPath, JSON.stringify(out, null, 0) + '\n');

const byCat = {}, byProv = new Set();
for (const g of out) { byCat[g.category] = (byCat[g.category] || 0) + 1; byProv.add(g.provider); }
console.log(`✓ ${out.length} games → ${outPath}`);
console.log(`  providers: ${byProv.size} | skipped(no uid): ${noUid} | deduped: ${dupes}`);
console.log('  categories:', JSON.stringify(byCat));

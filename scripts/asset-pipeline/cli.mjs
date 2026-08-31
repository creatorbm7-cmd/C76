#!/usr/bin/env node
/**
 * C7 Winners — asset pipeline CLI (Tier 1: read-only discovery & validation).
 *
 * A safe, repeatable audit/validation tool for the V2 art-slot system. It never
 * writes to production, never touches the frozen V2 app, and never reads or
 * modifies balances/payments/catalog — it only inspects source + local files
 * and emits reports. The three commands:
 *
 *   node scripts/asset-pipeline/cli.mjs slots
 *       List every bindable slot key, whether a V2 component consumes it
 *       (wired) or it's legacy, and its recommended PNG size.
 *
 *   node scripts/asset-pipeline/cli.mjs audit [--bound bound.json] [--out dir]
 *       Cross-reference slots against repo fallback art + (optionally) a
 *       Supabase app_assets export, and write slot-binding / fallback /
 *       inventory reports.
 *
 *   node scripts/asset-pipeline/cli.mjs validate <dir> [--out dir]
 *       Validate a folder of generated PNGs (named <slot-key>.png) against the
 *       recommended size + transparency, and emit a ready-to-upload manifest.
 *
 * `bound.json` is an owner-exported snapshot of bound keys — either a JSON array
 * of keys, or the raw `select asset_key from app_assets where active` rows
 * ([{asset_key:"..."}]). Omit it and binding status is reported as "unknown".
 */

import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, relative, basename } from "node:path";
import { imageInfo } from "./lib/imageinfo.mjs";
import { discoverSlots, discoverWired, specFor } from "./lib/slots.mjs";

const REPO = process.cwd();
const PUBLIC = join(REPO, "public");

// ---- tiny arg parser -------------------------------------------------------
const argv = process.argv.slice(2);
const cmd = argv[0];
const positional = argv.slice(1).filter((a) => !a.startsWith("--"));
function opt(name, def) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : def;
}

const C = { g: "\x1b[32m", y: "\x1b[33m", r: "\x1b[31m", d: "\x1b[2m", b: "\x1b[1m", x: "\x1b[0m" };
const sizeStr = (s) => (s ? `${s[0]}x${s[1]}` : "any");

function walk(dir, test, acc = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const e of entries) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, test, acc);
    else if (test(e)) acc.push(p);
  }
  return acc;
}

function loadBound(file) {
  if (!file) return null;
  if (!existsSync(file)) { console.error(`${C.r}bound file not found: ${file}${C.x}`); process.exit(1); }
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const keys = Array.isArray(raw)
    ? raw.map((r) => (typeof r === "string" ? r : r.asset_key || r.key)).filter(Boolean)
    : [];
  return new Set(keys);
}

function ensureOut(dir) { mkdirSync(dir, { recursive: true }); return dir; }
function writeReport(dir, name, text) {
  const p = join(dir, name);
  writeFileSync(p, text);
  return relative(REPO, p);
}

// ---- fallback discovery (which img: paths components reference) -------------
function discoverFallbacks() {
  const files = [join(REPO, "src/pages/v2/V2Lobby.tsx"), join(REPO, "src/pages/v2/V2BottomNav.tsx")];
  const paths = new Set();
  for (const f of files) {
    let s; try { s = readFileSync(f, "utf8"); } catch { continue; }
    for (const m of s.matchAll(/img:\s*"(\/[^"]+)"/g)) paths.add(m[1]);
  }
  return [...paths].map((p) => ({ path: p, exists: existsSync(join(PUBLIC, p)) }));
}

// ---- commands --------------------------------------------------------------
function cmdSlots() {
  const slots = discoverSlots();
  const { literal, dynamic } = discoverWired();
  const isWired = (k) => literal.has(k) || (k.startsWith("v2.badge.") && dynamic.has("v2.badge.*"));
  const v2 = slots.filter((s) => s.key.startsWith("v2.") || s.key.startsWith("game."));
  console.log(`${C.b}Slot registry${C.x}  (${slots.length} keys · ${v2.length} v2/game)\n`);
  for (const s of slots) {
    const wired = isWired(s.key);
    const spec = specFor(s.key);
    const tag = wired ? `${C.g}wired${C.x}` : `${C.d}legacy${C.x}`;
    const sp = spec ? `${sizeStr(spec.size)}${spec.alpha ? " α" : ""}` : "";
    console.log(`  ${tag}  ${s.key.padEnd(22)} ${C.d}${sp.padEnd(12)}${C.x} ${s.label}`);
  }
  console.log(`\n${C.d}dynamic families wired: ${[...dynamic].join(", ") || "none"}${C.x}`);
}

function cmdAudit() {
  const outDir = ensureOut(opt("out", join(REPO, "scripts/asset-pipeline/reports")));
  const bound = loadBound(opt("bound"));
  const slots = discoverSlots();
  const { literal, dynamic } = discoverWired();
  const isWired = (k) => literal.has(k) || (k.startsWith("v2.badge.") && dynamic.has("v2.badge.*"));

  const rows = slots.map((s) => {
    const spec = specFor(s.key);
    return {
      key: s.key, label: s.label,
      family: s.key.startsWith("v2.") ? "v2" : s.key.split(".")[0],
      wired: isWired(s.key),
      size: spec ? sizeStr(spec.size) : "", alpha: spec ? !!spec.alpha : null,
      bound: bound ? bound.has(s.key) : null,
    };
  });

  const fallbacks = discoverFallbacks();
  const missingFb = fallbacks.filter((f) => !f.exists);

  const assets = walk(PUBLIC, (e) => /\.(png|webp)$/i.test(e)).map((p) => {
    const info = imageInfo(p);
    return { path: "/" + relative(PUBLIC, p), ...info };
  });

  const wiredCount = rows.filter((r) => r.wired).length;
  const boundCount = bound ? rows.filter((r) => r.bound).length : null;
  // Bound keys outside the static registry — chiefly game.<uid> covers, which
  // are dynamic and never appear in SLOT_KEYS. Report them so they aren't lost.
  const regSet = new Set(slots.map((s) => s.key));
  const boundExtra = bound ? [...bound].filter((k) => !regSet.has(k)) : [];
  const boundGames = boundExtra.filter((k) => /^game\./.test(k));
  const boundOther = boundExtra.filter((k) => !/^game\./.test(k));

  // --- console summary ---
  console.log(`${C.b}Asset audit${C.x}`);
  console.log(`  slots: ${slots.length}  ·  wired: ${C.g}${wiredCount}${C.x}  ·  legacy: ${C.d}${slots.length - wiredCount}${C.x}`);
  console.log(`  bound: ${boundCount === null ? C.y + "unknown (pass --bound)" + C.x
    : `${boundCount}/${slots.length} registry  ·  ${boundGames.length} game cover${boundGames.length === 1 ? "" : "s"}` + (boundOther.length ? `  ·  ${C.y}${boundOther.length} unrecognised${C.x}` : "")}`);
  console.log(`  repo assets scanned: ${assets.length}  (${assets.filter((a) => a.alpha).length} with alpha)`);
  console.log(`  fallback paths: ${fallbacks.length}  ·  ${missingFb.length ? C.r + missingFb.length + " MISSING" + C.x : C.g + "all present" + C.x}`);
  if (boundOther.length) console.log(`  ${C.y}bound keys not in registry:${C.x} ${boundOther.join(", ")}`);

  // --- markdown report ---
  const md = [];
  md.push(`# C7 Winners — Slot Binding Report\n`);
  md.push(`_Generated by scripts/asset-pipeline · read-only._\n`);
  md.push(`- Slots: **${slots.length}** · wired: **${wiredCount}** · legacy: **${slots.length - wiredCount}**`);
  md.push(`- Binding: ${boundCount === null ? "**unknown** (run with `--bound app_assets.json`)" : `**${boundCount}/${slots.length}** registry slots · **${boundGames.length}** game cover(s)${boundOther.length ? ` · **${boundOther.length}** unrecognised (\`${boundOther.join("`, `")}\`)` : ""}`}`);
  md.push(`- Fallback paths: **${fallbacks.length}** · missing: **${missingFb.length}**\n`);
  if (missingFb.length) md.push(`## ⚠ Missing fallback art\n` + missingFb.map((f) => `- \`${f.path}\``).join("\n") + "\n");
  md.push(`## Slots\n`);
  md.push(`| Key | Wired | Size | α | Bound | Label |`);
  md.push(`|---|---|---|---|---|---|`);
  for (const r of rows) {
    md.push(`| \`${r.key}\` | ${r.wired ? "✅" : "—"} | ${r.size || ""} | ${r.alpha ? "α" : ""} | ${r.bound === null ? "?" : r.bound ? "✅" : "—"} | ${r.label} |`);
  }
  md.push(`\n_Dynamic families wired: ${[...dynamic].join(", ") || "none"}_`);

  const p1 = writeReport(outDir, "slot-binding-report.md", md.join("\n") + "\n");
  const p2 = writeReport(outDir, "slot-binding-report.json", JSON.stringify({ generatedFrom: "source", slots: rows, fallbacks, assetCount: assets.length }, null, 2));
  const p3 = writeReport(outDir, "asset-inventory.json", JSON.stringify(assets, null, 2));
  console.log(`\n${C.g}reports:${C.x} ${p1}  ·  ${p2}  ·  ${p3}`);
}

function cmdValidate() {
  const dir = positional[0];
  if (!dir) { console.error(`${C.r}usage: validate <dir>${C.x}`); process.exit(1); }
  if (!existsSync(dir)) { console.error(`${C.r}dir not found: ${dir}${C.x}`); process.exit(1); }
  const outDir = ensureOut(opt("out", join(REPO, "scripts/asset-pipeline/reports")));

  const slots = new Set(discoverSlots().map((s) => s.key));
  const knownKey = (k) => slots.has(k) || /^game\.[a-z0-9-]+$/i.test(k);

  const files = walk(dir, (e) => /\.(png|webp)$/i.test(e));
  const results = files.map((p) => {
    const key = basename(p).replace(/\.(png|webp)$/i, "");
    const info = imageInfo(p);
    const spec = specFor(key);
    const problems = [];
    if (!knownKey(key)) problems.push(`unknown slot key "${key}"`);
    if (!info.ok) problems.push(`could not read image (${info.reason || "?"})`);
    if (info.ok && spec) {
      if (spec.alpha && !info.alpha) problems.push("missing transparency (alpha required)");
      if (spec.size && (info.width !== spec.size[0] || info.height !== spec.size[1]))
        problems.push(`size ${info.width}x${info.height}, expected ${sizeStr(spec.size)}`);
    }
    if (info.ok && info.format === "webp" && knownKey(key)) problems.push("prefer PNG for slot art (webp uploaded)");
    const status = !knownKey(key) || !info.ok ? "FAIL"
      : problems.length ? "WARN" : "PASS";
    return { file: relative(REPO, p), key, status, problems, info: info.ok ? { w: info.width, h: info.height, alpha: info.alpha, format: info.format } : null };
  });

  const pass = results.filter((r) => r.status === "PASS");
  const warn = results.filter((r) => r.status === "WARN");
  const fail = results.filter((r) => r.status === "FAIL");

  console.log(`${C.b}Validate${C.x}  ${dir}`);
  console.log(`  ${C.g}PASS ${pass.length}${C.x}  ·  ${C.y}WARN ${warn.length}${C.x}  ·  ${C.r}FAIL ${fail.length}${C.x}  (of ${results.length})`);
  for (const r of results) {
    const col = r.status === "PASS" ? C.g : r.status === "WARN" ? C.y : C.r;
    console.log(`  ${col}${r.status.padEnd(4)}${C.x} ${r.key.padEnd(22)} ${C.d}${r.problems.join("; ")}${C.x}`);
  }

  const ready = [...pass, ...warn].map((r) => ({ file: r.file, slotKey: r.key }));
  const md = [`# Pre-upload Validation Report\n`, `- PASS **${pass.length}** · WARN **${warn.length}** · FAIL **${fail.length}** (of ${results.length})\n`, `| Status | Key | File | Notes |`, `|---|---|---|---|`];
  for (const r of results) md.push(`| ${r.status} | \`${r.key}\` | \`${r.file}\` | ${r.problems.join("; ")} |`);
  const p1 = writeReport(outDir, "validation-report.md", md.join("\n") + "\n");
  const p2 = writeReport(outDir, "ready-to-upload.json", JSON.stringify(ready, null, 2));
  console.log(`\n${C.g}reports:${C.x} ${p1}  ·  ${p2}   ${C.d}(${ready.length} ready to upload)${C.x}`);
  if (fail.length) process.exitCode = 2; // non-zero so CI/scripts can gate
}

// ---- dispatch --------------------------------------------------------------
switch (cmd) {
  case "slots": cmdSlots(); break;
  case "audit": cmdAudit(); break;
  case "validate": cmdValidate(); break;
  default:
    console.log(`C7 Winners asset pipeline (read-only)\n\n  slots                       list slot registry (wired / legacy / size)\n  audit [--bound f] [--out d] slot-binding + fallback + inventory reports\n  validate <dir> [--out d]    validate generated PNGs → ready-to-upload manifest\n`);
    if (cmd) process.exitCode = 1;
}

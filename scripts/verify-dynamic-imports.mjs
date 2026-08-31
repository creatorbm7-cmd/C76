#!/usr/bin/env node
/**
 * Post-build sanity check: every dynamic-import chunk referenced by the bundle
 * must resolve to a real file on disk. Catches stale optimized-dep references
 * (e.g. metamask-sdk-XXXX.js) and broken `lazy(() => import(...))` paths
 * before they reach preview/production.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");
const MANIFEST = path.join(DIST, ".vite", "manifest.json");

if (!fs.existsSync(DIST)) {
  console.log("[verify-dynamic-imports] dist/ not found — run `npm run build` first. Skipping.");
  process.exit(0);
}
if (!fs.existsSync(MANIFEST)) {
  console.error("[verify-dynamic-imports] dist/.vite/manifest.json missing. Ensure vite.config.ts has build.manifest = true.");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const missing = [];

// 1. Manifest-declared dynamicImports
for (const [key, entry] of Object.entries(manifest)) {
  for (const dynKey of entry.dynamicImports ?? []) {
    const target = manifest[dynKey];
    if (!target) {
      missing.push({ from: key, ref: dynKey, reason: "manifest entry not found" });
      continue;
    }
    const file = path.join(DIST, target.file);
    if (!fs.existsSync(file)) {
      missing.push({ from: key, ref: target.file, reason: "chunk file not on disk" });
    }
  }
}

// 2. Walk emitted JS chunks for `import("...js")` literals — catches refs that
// bypass the manifest (rare but possible with custom rollup output).
const assetsDir = path.join(DIST, "assets");
const importRe = /import\(\s*["']([^"']+\.m?js)["']\s*\)/g;
if (fs.existsSync(assetsDir)) {
  for (const f of fs.readdirSync(assetsDir)) {
    if (!f.endsWith(".js")) continue;
    const src = fs.readFileSync(path.join(assetsDir, f), "utf8");
    let m;
    while ((m = importRe.exec(src))) {
      const spec = m[1];
      // Only check relative/asset-local refs; skip http(s) and bare specifiers
      if (/^https?:\/\//.test(spec) || !spec.startsWith(".") && !spec.startsWith("/")) continue;
      const resolved = spec.startsWith("/")
        ? path.join(DIST, spec)
        : path.resolve(assetsDir, spec);
      if (!fs.existsSync(resolved)) {
        missing.push({ from: f, ref: spec, reason: "imported file missing" });
      }
    }
  }
}

if (missing.length > 0) {
  console.error(`\n✗ verify-dynamic-imports: ${missing.length} broken dynamic import(s):\n`);
  for (const m of missing) {
    console.error(`  • ${m.from}  →  ${m.ref}  (${m.reason})`);
  }
  process.exit(1);
}

console.log(`✓ verify-dynamic-imports: all dynamic import chunks resolved (${Object.keys(manifest).length} manifest entries scanned).`);

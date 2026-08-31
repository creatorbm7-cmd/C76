#!/usr/bin/env node
/**
 * Post-build: stamp the service worker with a build-unique CACHE_VERSION.
 *
 * public/sw.js keys all of its caches off CACHE_VERSION and purges any cache
 * that doesn't match on `activate`. If the version string never changes across
 * deploys, the browser sees a byte-identical sw.js, skips the SW update, and
 * keeps serving stale chunk hashes — surfacing as "Importing a module script
 * failed" after a deploy. Stamping a unique value into the SHIPPED sw.js on
 * every build guarantees each deploy invalidates the old caches automatically
 * (no manual version bump to remember). Operates on dist/ only — source stays
 * clean.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const swPath = path.resolve(__dirname, "..", "dist", "sw.js");

if (!fs.existsSync(swPath)) {
  console.warn("⚠️  stamp-sw: dist/sw.js not found — skipping (no service worker to stamp).");
  process.exit(0);
}

const src = fs.readFileSync(swPath, "utf8");
const re = /const CACHE_VERSION = ['"][^'"]*['"];/;
if (!re.test(src)) {
  console.warn("⚠️  stamp-sw: CACHE_VERSION declaration not found in dist/sw.js — leaving as-is.");
  process.exit(0);
}

// Build-unique, monotonic-ish token so every deploy gets a fresh cache namespace.
const version = `c7w-${Date.now().toString(36)}`;
const out = src.replace(re, `const CACHE_VERSION = '${version}';`);
fs.writeFileSync(swPath, out);
console.log(`✓ stamp-sw: CACHE_VERSION → ${version}`);

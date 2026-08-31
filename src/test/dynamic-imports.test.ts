/**
 * Static source-tree check: every `import("@/...")` / `import("./...")` /
 * `import("../...")` literal in src/ must resolve to a real file (with the
 * usual extension fallbacks). Catches typos in `lazy(() => import(...))`
 * targets without needing a full vite build.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(__dirname, "..");
const ALIAS = { "@/": path.resolve(SRC) + "/" };
const EXTS = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js"];
const importRe = /import\(\s*["'](@\/[^"']+|\.\.?\/[^"']+)["']\s*\)/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

function resolveSpec(spec: string, fromFile: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ALIAS["@/"], spec.slice(2));
  else base = path.resolve(path.dirname(fromFile), spec);
  for (const ext of EXTS) {
    if (fs.existsSync(base + ext)) return base + ext;
  }
  return null;
}

describe("dynamic imports resolve", () => {
  it("every import('...') in src/ points to a real file", () => {
    const files = walk(SRC).filter((f) => !f.includes("__tests__") && !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"));
    const broken: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      let m;
      while ((m = importRe.exec(src))) {
        const spec = m[1];
        if (!resolveSpec(spec, f)) {
          broken.push(`${path.relative(SRC, f)}  →  ${spec}`);
        }
      }
    }
    expect(broken, `Broken dynamic imports:\n${broken.join("\n")}`).toEqual([]);
  });
});

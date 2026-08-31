#!/usr/bin/env python3
"""
cutout_assets.py — turn raw Midjourney (or any) art into transparent, trimmed
PNGs wired straight into the C7 asset slots.

Drop raw images in  public/art/raw/  named after their slot, then run:

    python3 scripts/cutout_assets.py            # auto-detect background from corners
    python3 scripts/cutout_assets.py --key magenta   # subject was on flat magenta
    python3 scripts/cutout_assets.py --key '#0a0a0a' --tol 50

Naming → destination:
    nav-bar / tile-gems / tile-slots / tile-reels / tile-missions / tile-bank
        → public/images/v3/nav/<name>.png   (picked up by the nav components)
    hero-chest / c74-medallion / jackpot-frame / reel-50…reel-3000 /
    icon-<x> / tab-<x>
        → public/images/v3/gen/<name>.png   (+ recorded in gen/manifest.json so
          <C7Asset> / the reels load them; no 404s until present)

Background removal = border flood-fill within a colour tolerance, so it only
eats background CONNECTED to the edges (won't punch holes in the subject). Works
well when the subject sits on a plain/flat backdrop — that's why the recommended
Midjourney prompt puts it on solid magenta. Busy gold-gradient backdrops key
poorly here; use remove.bg / Photopea for those, then re-drop the clean PNG
(this script will just trim + route it).

Display-only assets. No backend/data touched.
"""
import argparse, json, os, sys
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "public", "art", "raw")
NAV = os.path.join(ROOT, "public", "images", "v3", "nav")
GEN = os.path.join(ROOT, "public", "images", "v3", "gen")

NAV_STEMS = {"nav-bar", "tile-gems", "tile-slots", "tile-reels", "tile-missions", "tile-bank"}
MAXSIDE = 2048          # cap longest edge to keep files lean
NAMED = {"magenta": (255, 0, 255), "white": (255, 255, 255), "black": (0, 0, 0), "green": (0, 255, 0)}


def key_color(img, mode):
    if mode == "auto":
        a = np.asarray(img.convert("RGB"))
        h, w = a.shape[:2]
        s = max(4, min(h, w) // 40)
        corners = np.concatenate([
            a[:s, :s].reshape(-1, 3), a[:s, -s:].reshape(-1, 3),
            a[-s:, :s].reshape(-1, 3), a[-s:, -s:].reshape(-1, 3),
        ])
        return tuple(int(x) for x in np.median(corners, axis=0))
    if mode in NAMED:
        return NAMED[mode]
    if mode.startswith("#") and len(mode) == 7:
        return tuple(int(mode[i:i + 2], 16) for i in (1, 3, 5))
    raise SystemExit(f"Unknown --key '{mode}' (use auto | magenta | white | black | #RRGGBB)")


def cutout(path, key_mode, tol, feather):
    img = Image.open(path).convert("RGB")
    kc = key_color(img, key_mode)
    flood = img.copy()
    SENT = (1, 2, 3)  # sentinel unlikely to occur naturally
    w, h = img.size
    # Seed flood-fill from many points around the border so a whole connected
    # (even slightly graded) background gets consumed.
    seeds = []
    steps = 24
    for i in range(steps + 1):
        t = i / steps
        seeds += [(int(t * (w - 1)), 0), (int(t * (w - 1)), h - 1),
                  (0, int(t * (h - 1))), (w - 1, int(t * (h - 1)))]
    for xy in seeds:
        try:
            ImageDraw.floodfill(flood, xy, SENT, thresh=tol)
        except Exception:
            pass
    fa = np.asarray(flood)
    bg = np.all(fa == np.array(SENT), axis=-1)
    # Also drop any pixel very close to the key colour (catches thin gaps).
    rgb = np.asarray(img).astype(np.int16)
    dist = np.sqrt(((rgb - np.array(kc)) ** 2).sum(-1))
    bg |= dist < (tol * 0.6)
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    out = img.convert("RGBA")
    A = Image.fromarray(alpha, "L")
    if feather > 0:
        A = A.filter(ImageFilter.GaussianBlur(feather))
    out.putalpha(A)
    # Trim to content bbox (+ small margin), then cap size.
    bbox = out.getbbox()
    if bbox:
        m = max(2, int(0.02 * max(out.size)))
        l, t, r, b = bbox
        out = out.crop((max(0, l - m), max(0, t - m), min(w, r + m), min(h, b + m)))
    if max(out.size) > MAXSIDE:
        s = MAXSIDE / max(out.size)
        out = out.resize((round(out.size[0] * s), round(out.size[1] * s)), Image.LANCZOS)
    return out, kc


def dest_for(stem):
    if stem in NAV_STEMS:
        return os.path.join(NAV, stem + ".png"), None
    slot = stem.replace("-", ".", 1)  # icon-mining → icon.mining
    return os.path.join(GEN, stem + ".png"), slot


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", default="auto")
    ap.add_argument("--tol", type=int, default=40, help="colour tolerance (higher = removes more)")
    ap.add_argument("--feather", type=float, default=1.2, help="edge softness in px")
    ap.add_argument("--only", default=None, help="process only this stem")
    args = ap.parse_args()

    os.makedirs(NAV, exist_ok=True)
    os.makedirs(GEN, exist_ok=True)
    if not os.path.isdir(RAW):
        raise SystemExit(f"No raw folder at {RAW}")

    files = [f for f in sorted(os.listdir(RAW))
             if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")) and not f.startswith(".")]
    if args.only:
        files = [f for f in files if os.path.splitext(f)[0] == args.only]
    if not files:
        print("Nothing to do — drop raw images in public/art/raw/ (named like tile-gems.png).")
        return

    gen_slots = []
    for f in files:
        stem = os.path.splitext(f)[0]
        dst, slot = dest_for(stem)
        try:
            out, kc = cutout(os.path.join(RAW, f), args.key, args.tol, args.feather)
        except Exception as e:
            print(f"  ✗ {f}: {e}")
            continue
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        out.save(dst)
        rel = os.path.relpath(dst, ROOT)
        print(f"  ✓ {f:22s} key={kc} → {rel}  ({out.size[0]}×{out.size[1]})")
        if slot:
            gen_slots.append(slot)

    # Update gen manifest (union with any existing entries).
    if gen_slots:
        mf = os.path.join(GEN, "manifest.json")
        existing = []
        if os.path.exists(mf):
            try: existing = json.load(open(mf))
            except Exception: existing = []
        merged = sorted(set(existing) | set(gen_slots))
        json.dump(merged, open(mf, "w"), indent=0)
        print(f"\n  manifest: {len(merged)} slot(s) → {os.path.relpath(mf, ROOT)}")
    print("\nDone. Commit the outputs (and manifest) — they deploy via the normal build.")


if __name__ == "__main__":
    main()

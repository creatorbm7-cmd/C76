/**
 * imageinfo — dependency-free width/height/alpha reader for PNG and WEBP.
 *
 * The asset pipeline only needs three facts per file (dimensions + whether the
 * image carries an alpha channel), so we parse the container headers by hand
 * rather than pulling an image library into a repo that is under code freeze.
 * Anything we can't confidently decode is returned as { ok:false } so callers
 * degrade gracefully instead of guessing.
 */

import { readFileSync } from "node:fs";

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** Parse a PNG buffer: IHDR gives dimensions + colour type; scan for tRNS. */
function parsePng(buf) {
  if (buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIG)) return null;
  // IHDR always follows the signature: len(4) "IHDR"(4) then data.
  if (buf.toString("ascii", 12, 16) !== "IHDR") return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const colorType = buf[25]; // 0 gray, 2 rgb, 3 palette, 4 gray+alpha, 6 rgba
  let alpha = colorType === 4 || colorType === 6;

  // Walk chunks looking for tRNS (palette / colour-key transparency).
  if (!alpha) {
    let off = 8;
    while (off + 8 <= buf.length) {
      const len = buf.readUInt32BE(off);
      const type = buf.toString("ascii", off + 4, off + 8);
      if (type === "tRNS") { alpha = true; break; }
      if (type === "IDAT" || type === "IEND") break; // past the header chunks
      off += 12 + len;
    }
  }
  return { ok: true, format: "png", width, height, alpha };
}

/** Parse a WEBP buffer (VP8X extended / VP8L lossless / VP8 lossy). */
function parseWebp(buf) {
  if (buf.length < 30) return null;
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const fourcc = buf.toString("ascii", 12, 16);

  if (fourcc === "VP8X") {
    const flags = buf[20];
    const alpha = (flags & 0x10) !== 0;
    const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { ok: true, format: "webp", width, height, alpha };
  }
  if (fourcc === "VP8L") {
    // 0x2f marker then 14-bit (w-1) and 14-bit (h-1), alpha_is_used bit follows.
    if (buf[20] !== 0x2f) return null;
    const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    const alpha = (b3 & 0x10) !== 0;
    return { ok: true, format: "webp", width, height, alpha };
  }
  if (fourcc === "VP8 ") {
    // Lossy: key-frame header has 0x9d 0x01 0x2a then 16-bit dims (14 bits used).
    let i = 20;
    while (i + 3 < buf.length && !(buf[i] === 0x9d && buf[i + 1] === 0x01 && buf[i + 2] === 0x2a)) i++;
    if (i + 6 >= buf.length) return null;
    const width = ((buf[i + 4] << 8) | buf[i + 3]) & 0x3fff;
    const height = ((buf[i + 6] << 8) | buf[i + 5]) & 0x3fff;
    return { ok: true, format: "webp", width, height, alpha: false };
  }
  return null;
}

/** Read a file and return { ok, format, width, height, alpha } or { ok:false }. */
export function imageInfo(path) {
  let buf;
  try { buf = readFileSync(path); } catch { return { ok: false, reason: "unreadable" }; }
  const ext = path.toLowerCase().slice(path.lastIndexOf("."));
  const parsed = ext === ".webp" ? parseWebp(buf) : parsePng(buf);
  return parsed || { ok: false, reason: "unparsed", format: ext.replace(".", "") };
}

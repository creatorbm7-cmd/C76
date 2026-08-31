/**
 * HdrScreen — shared page wrapper for the money surfaces.
 *
 * V3 emerald-felt background (matches .c7p-page): simple min-height, centred
 * max-width column, bottom padding for fixed CTA bars / bottom nav. Kept as a
 * shared wrapper so all money pages stay consistent without re-implementing the
 * shell.
 */
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Bottom padding (px) — leave room for fixed CTA bars / bottom nav. */
  pad?: number;
  maxWidth?: number;
}

export default function HdrScreen({ children, pad = 80, maxWidth = 520 }: Props) {
  return (
    <div style={{ minHeight: "100dvh", background: "radial-gradient(120% 65% at 50% -8%, rgba(246,201,69,0.12), transparent 58%), radial-gradient(110% 55% at 50% 0%, rgba(46,224,138,0.11), transparent 60%), linear-gradient(172deg, #0d3d28 0%, #072517 46%, #04160d 100%)", color: "#eafff4", paddingBottom: pad, position: "relative" }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth, margin: "0 auto" }}>
        {children}
      </div>
    </div>
  );
}

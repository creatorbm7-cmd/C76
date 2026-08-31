/**
 * Immersive-overlay signal.
 *
 * Some fullscreen overlays (e.g. the live-game iframe player in LiveApiGames)
 * open WITHOUT a route change and live inside a transformed/transition subtree,
 * so their z-index is trapped in a local stacking context and can't paint over
 * the root-level bottom nav. Rather than fight stacking contexts, overlays flag
 * "immersive" while open and the bottom nav hides itself.
 *
 * Ref-counted so nested/overlapping overlays behave (nav stays hidden until the
 * last one closes). Pair every enter() with an exit() — the typical usage is an
 * effect: `useEffect(() => { if (open) { enterImmersive(); return exitImmersive; } }, [open])`.
 */
import { useEffect, useState } from 'react';

const EVT = 'c7:immersive';
let depth = 0;

function broadcast() {
  const active = depth > 0;
  try { document.body.classList.toggle('c7-immersive', active); } catch { /* noop */ }
  try { window.dispatchEvent(new CustomEvent(EVT, { detail: active })); } catch { /* noop */ }
}

/** Enter immersive mode (hides the bottom nav). Ref-counted. */
export function enterImmersive(): void {
  depth += 1;
  if (depth === 1) broadcast();
}

/** Leave immersive mode. Safe to over-call (clamped at 0). */
export function exitImmersive(): void {
  depth = Math.max(0, depth - 1);
  if (depth === 0) broadcast();
}

/** Reactive read — true while any immersive overlay is open. */
export function useImmersive(): boolean {
  const [on, setOn] = useState(() => depth > 0);
  useEffect(() => {
    const h = (e: Event) => setOn(!!(e as CustomEvent).detail);
    window.addEventListener(EVT, h);
    // Re-sync in case state changed between initial render and subscribe.
    setOn(depth > 0);
    return () => window.removeEventListener(EVT, h);
  }, []);
  return on;
}

import { useEffect } from 'react';
import { tap } from '@/lib/tap';
import AudioManager from '@/lib/AudioManager';

/**
 * TapFX — global tap feedback for the whole app.
 *
 * On every press of an interactive element it fires a light haptic and paints
 * a quick expanding ring at the exact tap point. The ring lives in a fixed,
 * pointer-events:none overlay appended to <body>, so it can never clip inside a
 * card, block a tap, or shift layout. Only interactive targets trigger it.
 * Honors prefers-reduced-motion (keeps the haptic, skips the ring).
 *
 * Mount once at the app root.
 */
export default function TapFX() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const layer = document.createElement('div');
    layer.className = 'c7-tapfx';
    document.body.appendChild(layer);

    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      const el = t?.closest?.(
        'button, a, [role="button"], input[type="submit"], .lb-gcard, .lb-slot, .lb-chip, .lb-promo, .lb-winner'
      );
      if (!el || (el as HTMLButtonElement).disabled) return;

      tap.light();
      // UI click SFX — gated internally by AudioManager (sfxEnabled + tab active).
      try { AudioManager.playSfx('buttonClick'); } catch { /* ignore */ }
      if (reduce) return;

      const ring = document.createElement('span');
      ring.className = 'c7-tap-ring';
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
      layer.appendChild(ring);
      ring.addEventListener('animationend', () => ring.remove(), { once: true });
    };

    document.addEventListener('pointerdown', onDown, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', onDown);
      layer.remove();
    };
  }, []);

  return null;
}

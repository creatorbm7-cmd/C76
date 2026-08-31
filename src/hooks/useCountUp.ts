import { useEffect, useRef, useState } from 'react';

interface UseCountUpOptions {
  /** Animation duration in ms. Default 900. */
  duration?: number;
  /** Custom formatter applied to the live number. Wins over `decimals`. */
  format?: (n: number) => string;
  /** Decimal places when using the default formatter. Default 0. */
  decimals?: number;
  /** When true (default), the very first render counts up from 0. */
  startFromZero?: boolean;
  /** Skip animation entirely (e.g. for SSR/test). Default false. */
  immediate?: boolean;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const formatDefault = (n: number, decimals: number) => {
  // Thousands separators + fixed decimals for stable width on screen.
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Smoothly animates a number from its previous value to the new value
 * using requestAnimationFrame. No external deps.
 *
 * - Honors `prefers-reduced-motion` by skipping animation.
 * - Cancels in-flight animations cleanly on unmount or fast updates.
 * - Returns a *formatted string* — the consumer just renders it.
 *
 *   const balanceStr = useCountUp(balance, { decimals: 2 });
 *   <span>{balanceStr}</span>
 */
export function useCountUp(value: number, options: UseCountUpOptions = {}) {
  const {
    duration = 900,
    format,
    decimals = 0,
    startFromZero = true,
    immediate = false,
  } = options;

  const [display, setDisplay] = useState<number>(startFromZero ? 0 : value);
  const fromRef = useRef<number>(startFromZero ? 0 : value);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || immediate) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    // Respect user preference
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }

    const from = fromRef.current;
    const delta = value - from;
    if (Math.abs(delta) < 1e-9) {
      setDisplay(value);
      return;
    }

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      const current = from + delta * eased;
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Snap to final on unmount so subsequent mounts don't replay from 0.
      fromRef.current = value;
    };
  }, [value, duration, immediate]);

  return format ? format(display) : formatDefault(display, decimals);
}

export default useCountUp;

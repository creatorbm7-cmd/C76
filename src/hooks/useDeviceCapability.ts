import { useEffect, useState } from "react";

/**
 * Lightweight device-capability hook for tuning animations on low-end Android.
 *
 * `lowEnd` is true when ANY of the following holds:
 *   - `navigator.deviceMemory` reports < 4 GB
 *   - `navigator.hardwareConcurrency` < 4 cores
 *   - The OS reports a "Reduce motion" preference
 *   - The browser advertises Save-Data
 *
 * Components can skip optional visual effects
 * by checking `lowEnd`.
 */
export function useDeviceCapability() {
  const [lowEnd, setLowEnd] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const nav: any = navigator;
    const mem = typeof nav.deviceMemory === "number" ? nav.deviceMemory : 8;
    const cores = nav.hardwareConcurrency ?? 8;
    const saveData = !!nav.connection?.saveData;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduceMotion(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);

    setLowEnd(mem < 4 || cores < 4 || saveData || mq.matches);
    return () => { mq.removeEventListener?.("change", onChange); };
  }, []);

  return { lowEnd, reduceMotion };
}

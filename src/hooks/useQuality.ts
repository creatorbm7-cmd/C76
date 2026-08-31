import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { quality, type QualitySnapshot } from "@/lib/quality";

/**
 * Subscribe to the shared adaptive-quality controller.
 *
 * Also wires the controller to the current route so calm surfaces
 * (admin / auth / wallet / forms / settings) automatically mute the
 * cinematic layer for instant tap response.
 */
export function useQuality(): QualitySnapshot {
  const { pathname } = useLocation();
  const [snap, setSnap] = useState<QualitySnapshot>(() => quality.snapshot());

  useEffect(() => { quality.start(); }, []);
  useEffect(() => { quality.setRoute(pathname); }, [pathname]);
  useEffect(() => quality.subscribe(setSnap), []);

  return snap;
}

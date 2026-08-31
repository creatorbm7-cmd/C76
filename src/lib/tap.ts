/**
 * Tactile feedback utility — Capacitor Haptics with a web vibrate() fallback.
 * Fire-and-forget; never throws.
 */
import { Capacitor } from "@capacitor/core";

type Kind = "light" | "medium" | "heavy" | "success" | "warning" | "error";

let hapticsMod: any = null;
async function getHaptics() {
  if (!Capacitor.isNativePlatform()) return null;
  if (!hapticsMod) {
    try { hapticsMod = await import("@capacitor/haptics"); } catch { hapticsMod = null; }
  }
  return hapticsMod;
}

function webVibrate(ms: number | number[]) {
  try { (navigator as any).vibrate?.(ms); } catch {}
}

async function fire(kind: Kind) {
  const mod = await getHaptics();
  if (mod) {
    try {
      if (kind === "success" || kind === "warning" || kind === "error") {
        const type = { success: "SUCCESS", warning: "WARNING", error: "ERROR" }[kind];
        await mod.Haptics.notification({ type: mod.NotificationType[type] });
      } else {
        const style = { light: "Light", medium: "Medium", heavy: "Heavy" }[kind];
        await mod.Haptics.impact({ style: mod.ImpactStyle[style] });
      }
      return;
    } catch {}
  }
  webVibrate(
    kind === "light" ? 8 :
    kind === "medium" ? 14 :
    kind === "heavy" ? 22 :
    kind === "success" ? [10, 30, 10] :
    kind === "warning" ? [14, 40, 14] :
    [30, 50, 30]
  );
}

export const tap = {
  light:   () => fire("light"),
  medium:  () => fire("medium"),
  heavy:   () => fire("heavy"),
  success: () => fire("success"),
  warning: () => fire("warning"),
  error:   () => fire("error"),
};

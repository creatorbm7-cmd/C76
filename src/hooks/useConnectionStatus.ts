import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConnState = "online" | "offline" | "reconnecting";

/**
 * Tracks browser online/offline and Supabase Realtime channel health.
 * Returns a single state suitable for showing a banner and pausing
 * game state (e.g. crash multiplier ticking) while disconnected.
 */
export function useConnectionStatus(): ConnState {
  const [state, setState] = useState<ConnState>(
    typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline"
  );

  // Browser network events
  useEffect(() => {
    const onOnline = () => setState("reconnecting");
    const onOffline = () => setState("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Realtime heartbeat — a no-op presence channel we can monitor.
  useEffect(() => {
    const ch = supabase.channel("conn-heartbeat", { config: { presence: { key: "heartbeat" } } });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") setState(navigator.onLine ? "online" : "offline");
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setState(navigator.onLine ? "reconnecting" : "offline");
      }
    });
    return () => { supabase.removeChannel(ch); };
  }, []);

  return state;
}

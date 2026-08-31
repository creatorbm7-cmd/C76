// Play-money games API client.
//
// Connects the free-play front-end to an external PLAY-MONEY games backend
// (e.g. the Railway `c7winners-play` service). Base URL comes from the public,
// client-safe env var `VITE_PLAY_API_BASE` (empty = feature off).
//
// HARD SAFETY RULE: this client is free-play ONLY. If the backend ever reports
// a real-money surface (realMoneyEngine / deposits / withdrawals / cashOut), the
// client refuses to operate. Enabling real money requires a licence, an approved
// PSP, and a funded reserve — it is never turned on by wiring a front-end.

export interface PlayStatus {
  mode: string;                    // e.g. "play-money"
  currency: string;                // e.g. "PLAY"
  realMoneyEngine: boolean;        // must be false
  deposits: boolean;               // must be false
  withdrawals: boolean;            // must be false
  cashOut: boolean;                // must be false
  requiresGamingLicence?: boolean;
  requiresPaymentProcessor?: boolean;
  rules?: { winChance?: number; houseEdge?: number };
  state?: Record<string, number | boolean>;
}

const BASE = (import.meta.env.VITE_PLAY_API_BASE as string | undefined)?.replace(/\/+$/, "") ?? "";

export const playApiConfigured = (): boolean => BASE.length > 0;

/** True only for a strictly play-money backend (no real-money surface at all). */
export function isFreePlayOnly(s: PlayStatus): boolean {
  return s.realMoneyEngine === false && s.deposits === false && s.withdrawals === false && s.cashOut === false;
}

/** Throws if the backend exposes any real-money surface. Call before using the API. */
export function assertFreePlay(s: PlayStatus): void {
  if (!isFreePlayOnly(s)) {
    throw new Error(
      "playApi: backend reports a real-money surface — refusing. This client is free-play only.",
    );
  }
}

/** Fetch the backend status. Returns null when no play API is configured. */
export async function getPlayStatus(signal?: AbortSignal): Promise<PlayStatus | null> {
  if (!playApiConfigured()) return null;
  const res = await fetch(`${BASE}/api/status`, { headers: { accept: "application/json" }, signal });
  if (!res.ok) throw new Error(`playApi: status ${res.status}`);
  return (await res.json()) as PlayStatus;
}

// Presentation-only build guard.
//
// When VITE_PRESENTATION_ONLY === "true", the app is deployed as a
// presentation / social-free-play preview: real money surfaces (crypto deposit
// address, withdrawal) must NOT be reachable, even if the backend platform mode
// says "live". This is a FRONT-END guard only — it changes nothing in the
// payment rails, ledger, or DB gates; it just prevents navigation into a
// real-money surface. Default (unset/false) preserves existing behavior.
const raw = (import.meta.env as Record<string, string | undefined>).VITE_PRESENTATION_ONLY;
export const PRESENTATION_ONLY = raw === "true" || raw === "1";

// Pure helpers for the owner-only C74 Treasury Swap panel.
//
// These mirror the server RPC (admin_treasury_swap) so the UI can preview the
// received amount and validate input BEFORE calling the RPC. The server remains
// the sole source of truth — these are presentation/guard helpers only and must
// never be relied on for authorization or final accounting.

/** Per-asset decimal precision. Mirrors public.treasury_asset_decimals(). */
export const ASSET_DECIMALS: Record<string, number> = {
  USDT: 6,
  C74: 18,
};

export function assetDecimals(asset: string): number {
  return ASSET_DECIMALS[(asset || "").toUpperCase()] ?? 2;
}

/** Round half-away-from-zero to `dp` decimals (matches Postgres round(numeric)). */
export function roundTo(value: number, dp: number): number {
  if (!Number.isFinite(value)) return NaN;
  const f = Math.pow(10, dp);
  return Math.round((value + Number.EPSILON * Math.sign(value)) * f) / f;
}

/**
 * Received amount = round(gross * rate, decimals(toAsset)).
 * Returns NaN for non-finite inputs so callers can gate on Number.isFinite.
 */
export function computeReceived(gross: number, rate: number, toAsset: string): number {
  if (!Number.isFinite(gross) || !Number.isFinite(rate)) return NaN;
  return roundTo(gross * rate, assetDecimals(toAsset));
}

/**
 * Default conversion rate implied by the energy_usd peg.
 * energy_usd is the USD value of one C74/energy unit (e.g. 0.01 → 100 C74/USDT).
 * The rate is "destination units per 1 source unit" for a USDT→C74 swap.
 */
export function rateFromPeg(energyUsd: number): number {
  if (!Number.isFinite(energyUsd) || energyUsd <= 0) return NaN;
  return 1 / energyUsd;
}

export interface SwapInput {
  fromAccount: string;
  toAccount: string;
  gross: number;
  rate: number;
  maxSwap?: number; // per-account risk cap (0/undefined = no cap)
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Client-side mirror of the RPC's validation. Rejects the same conditions the
 * server rejects: missing/equal accounts, non-finite / NaN / non-positive
 * amounts and rates, and over-cap swaps.
 */
export function validateSwapInput(input: SwapInput): ValidationResult {
  const { fromAccount, toAccount, gross, rate, maxSwap } = input;
  if (!fromAccount || !toAccount) return { ok: false, error: "Select both accounts" };
  if (fromAccount === toAccount) return { ok: false, error: "From and To must differ" };
  if (!Number.isFinite(gross) || gross <= 0) return { ok: false, error: "Enter a valid amount" };
  if (!Number.isFinite(rate) || rate <= 0) return { ok: false, error: "Enter a valid rate" };
  if (maxSwap && maxSwap > 0 && gross > maxSwap) {
    return { ok: false, error: `Exceeds max swap limit (${maxSwap})` };
  }
  const received = computeReceived(gross, rate, toAccount);
  if (!Number.isFinite(received) || received <= 0) {
    return { ok: false, error: "Received amount rounds to zero" };
  }
  return { ok: true };
}

/** Trim to the asset's decimals for display, dropping trailing zeros. */
export function fmtAmount(value: number, asset: string): string {
  if (!Number.isFinite(value)) return "—";
  const dp = assetDecimals(asset);
  return value.toLocaleString(undefined, { maximumFractionDigits: Math.min(dp, 8) });
}

export interface SwapRow {
  journal_id: string;
  created_at: string;
  reference_type: string;
  from_account: string;
  to_account: string;
  gross_amount: number | string;
  conversion_rate: number | string;
  received_amount: number | string;
  rate_source: string;
  reason: string;
  display_status: string;
  [k: string]: unknown;
}

/** Build a CSV string from filtered swap-history rows (client-side export). */
export function swapsToCsv(rows: SwapRow[]): string {
  const cols = [
    "journal_id", "created_at", "reference_type", "from_account", "to_account",
    "gross_amount", "conversion_rate", "received_amount", "rate_source",
    "display_status", "reason",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.join(",");
  const body = rows.map((r) => cols.map((c) => esc((r as Record<string, unknown>)[c])).join(",")).join("\n");
  return `${header}\n${body}`;
}

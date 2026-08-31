// C74 Gas — Fee Engine (Phase A).
//
// PURE, deterministic, config-driven fee calculation. NO hardcoded business
// values — every policy number comes from `GasConfig` (which is admin-editable and,
// in production, sourced from the server; the default below is a placeholder).
// This module moves no money and holds no keys; it produces a *quote* the server
// re-computes authoritatively at execution time.
//
// Shared shape so the same logic can run client-side (display estimate) and
// server-side (authoritative), keeping one source of truth.

export type GasAction =
  | "withdraw" | "swap" | "bridge" | "internal_transfer" | "premium_feature" | "express_payout";

export type CoverageMode =
  | "full_coverage" | "partial_coverage" | "discount" | "vip_reduction"
  | "promo_free_gas" | "daily_allowance" | "referral_reward" | "network_fee";

/** All values here are admin-configurable — nothing is hardcoded in the logic. */
export interface GasConfig {
  /** Base gas units assumed per action (refined by a live estimate when available). */
  perActionGasUnits: Record<GasAction, number>;
  /** Safety multiplier applied to the gas estimate (e.g. 1.15). */
  gasMultiplier: number;
  /** Platform service fee added on top, as a fraction (e.g. 0.0 = none). */
  feePercent: number;
  /** Coverage policy applied when C74 is available. */
  coverageMode: Exclude<CoverageMode, "network_fee">;
  /** Fraction of gas covered by C74 in `partial_coverage` (0..1). */
  partialCoverageRatio: number;
  /** Flat discount fraction in `discount` mode (0..1). */
  discountRatio: number;
  /** Extra discount fraction per VIP tier in `vip_reduction` (tier → 0..1). */
  vipMultipliers: Record<string, number>;
  /** Named campaign overrides, e.g. { launch: { coverageMode:"promo_free_gas" } }. */
  campaignOverrides: Record<string, Partial<GasConfig>>;
  /** Max native-gas value (USD) the platform will subsidise per single action. */
  maxGasSubsidyUsd: number;
  /** Per-user daily C74-fee cap (in C74). 0 = unlimited. */
  dailyLimitC74PerUser: number;
  /** C74 price source id (for provenance/audit; resolved by the Pricing Service). */
  c74PriceSource: string;
}

export interface FeeQuoteInput {
  action: GasAction;
  chainId: number;
  /** Live gas units if estimated on-chain; falls back to config perActionGasUnits. */
  estimatedGasUnits?: number;
  /** Live fee-per-gas in wei (maxFeePerGas / gasPrice). */
  feePerGasWei: bigint;
  /** Native token USD price (ETH/POL/BNB…) from the Pricing Service. */
  nativeUsd: number;
  /** C74 USD price from the Pricing Service. */
  c74Usd: number;
  /** Native token decimals (18 for EVM chains). */
  nativeDecimals?: number;
  /** User context — all optional; drives VIP / limits / promos. */
  user?: {
    c74Balance?: number;
    vipTier?: string;
    dailyC74Used?: number;
    referralGasCreditC74?: number;
    campaign?: string;
  };
}

export interface FeeQuote {
  action: GasAction;
  chainId: number;
  coverageMode: CoverageMode;
  /** Native gas the platform would pay (wei + human units + USD). */
  gasNativeWei: bigint;
  gasNativeFormatted: number;
  gasUsd: number;
  /** Full gas expressed in C74 before any coverage/discount. */
  c74GasEquivalent: number;
  /** What the user actually pays in C74 after policy. */
  finalFeeC74: number;
  /** C74 the user saves vs. paying the full gas equivalent. */
  savingsC74: number;
  /** True when policy could not apply and the user pays the normal network fee. */
  networkFeeFallback: boolean;
  /** Provenance for the audit log. */
  c74PriceSource: string;
}

/** Placeholder default policy — production replaces this with the server snapshot. */
export const DEFAULT_GAS_CONFIG: GasConfig = {
  perActionGasUnits: {
    withdraw: 65000, swap: 180000, bridge: 250000,
    internal_transfer: 21000, premium_feature: 50000, express_payout: 90000,
  },
  gasMultiplier: 1.15,
  feePercent: 0,
  coverageMode: "discount",
  partialCoverageRatio: 0.5,
  discountRatio: 0.3,
  vipMultipliers: { none: 0, bronze: 0.05, silver: 0.1, gold: 0.2, platinum: 0.35, diamond: 0.5 },
  campaignOverrides: {},
  maxGasSubsidyUsd: 5,
  dailyLimitC74PerUser: 0,
  c74PriceSource: "admin",
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const fromWei = (wei: bigint, decimals: number) => Number(wei) / 10 ** decimals;

/**
 * Compute a fee quote. Pure — same inputs always yield the same quote.
 * Server MUST re-run this authoritatively before any settlement.
 */
export function quoteFee(input: FeeQuoteInput, baseConfig: GasConfig = DEFAULT_GAS_CONFIG): FeeQuote {
  // Merge any active campaign override on top of the base config.
  const campaign = input.user?.campaign;
  const config: GasConfig =
    campaign && baseConfig.campaignOverrides[campaign]
      ? { ...baseConfig, ...baseConfig.campaignOverrides[campaign] }
      : baseConfig;

  const decimals = input.nativeDecimals ?? 18;
  const gasUnits = Math.ceil((input.estimatedGasUnits ?? config.perActionGasUnits[input.action]) * config.gasMultiplier);
  const gasNativeWei = BigInt(gasUnits) * input.feePerGasWei;
  const gasNativeFormatted = fromWei(gasNativeWei, decimals);
  const gasUsd = gasNativeFormatted * input.nativeUsd;

  // Full gas value expressed in C74 (+ optional platform fee %).
  const c74GasEquivalent = input.c74Usd > 0 ? (gasUsd / input.c74Usd) * (1 + config.feePercent) : 0;

  // Resolve the coverage fraction (0 = user pays full, 1 = fully covered).
  let mode: CoverageMode = config.coverageMode;
  let covered = 0;
  switch (config.coverageMode) {
    case "full_coverage": covered = 1; break;
    case "promo_free_gas": covered = 1; break;
    case "partial_coverage": covered = clamp01(config.partialCoverageRatio); break;
    case "discount": covered = clamp01(config.discountRatio); break;
    case "vip_reduction": covered = clamp01(config.vipMultipliers[input.user?.vipTier ?? "none"] ?? 0); break;
    case "daily_allowance": covered = 1; break; // allowance handled via the daily cap below
    case "referral_reward": covered = 0; break; // applied as a C74 credit below
  }

  let finalFeeC74 = Math.max(0, c74GasEquivalent * (1 - covered));

  // Referral gas credit reduces the payable C74 directly.
  const referralCredit = Math.max(0, input.user?.referralGasCreditC74 ?? 0);
  if (referralCredit > 0) {
    finalFeeC74 = Math.max(0, finalFeeC74 - referralCredit);
    if (mode === "referral_reward" || finalFeeC74 === 0) mode = "referral_reward";
  }

  // Guardrails: subsidy cap + per-user daily C74 cap + insufficient balance → fallback.
  let networkFeeFallback = false;
  if (config.maxGasSubsidyUsd > 0 && gasUsd > config.maxGasSubsidyUsd && covered > 0) {
    // Subsidy exceeds the cap → only cover up to the cap's worth, user pays the rest.
    const maxCoveredUsd = config.maxGasSubsidyUsd;
    const coveredUsd = Math.min(gasUsd * covered, maxCoveredUsd);
    finalFeeC74 = input.c74Usd > 0 ? Math.max(0, (gasUsd - coveredUsd) / input.c74Usd) : 0;
    mode = "partial_coverage";
  }
  if (config.dailyLimitC74PerUser > 0) {
    const remaining = Math.max(0, config.dailyLimitC74PerUser - (input.user?.dailyC74Used ?? 0));
    if (finalFeeC74 > remaining && covered > 0) {
      // Daily allowance exhausted for the covered portion.
      finalFeeC74 = c74GasEquivalent; // user pays full in C74 (or network fee below)
      mode = "daily_allowance";
    }
  }
  const c74Balance = input.user?.c74Balance;
  if (c74Balance != null && finalFeeC74 > c74Balance) {
    networkFeeFallback = true;
    mode = "network_fee";
    finalFeeC74 = 0; // paid in native gas instead
  }

  const savingsC74 = Math.max(0, c74GasEquivalent - finalFeeC74);

  return {
    action: input.action,
    chainId: input.chainId,
    coverageMode: mode,
    gasNativeWei,
    gasNativeFormatted,
    gasUsd,
    c74GasEquivalent,
    finalFeeC74,
    savingsC74,
    networkFeeFallback,
    c74PriceSource: config.c74PriceSource,
  };
}

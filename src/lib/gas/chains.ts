// C74 Gas — chain registry (config-driven, CHAIN-AGNOSTIC).
//
// Adding a new EVM chain must be CONFIG ONLY. In production the registry below
// is served by admin config (RPC, explorer, native token, gas policy) and this
// file is just the local snapshot/fallback. The Fee Engine, Gas Engine and
// wallet panels consume this registry — none of them hardcodes a chain, so
// expanding to a new network never requires engine code changes.
//
// Per-chain dynamic values (RPC endpoints, C74 token address, price seeds) come
// from env via STATIC references so Vite injects them. To add a chain: add one
// CHAINS entry + its env vars — nothing else.
import type { GasAction, GasConfig } from "./feeEngine";

/** Optional per-chain policy, layered on top of the global GasConfig. */
export interface ChainGasPolicy {
  gasMultiplier?: number;
  perActionGasUnits?: Partial<Record<GasAction, number>>;
  maxGasSubsidyUsd?: number;
}

export interface ChainConfig {
  id: number;
  name: string;
  nativeSymbol: string;
  nativeDecimals: number;
  /** Explorer base for tx links, e.g. https://etherscan.io */
  explorerUrl: string;
  /** Optional dedicated RPC (env); when unset the wallet provider's RPC is used. */
  rpcUrl?: string;
  /** C74 token address (env); unset → C74 balance shows "—" on this chain. */
  c74TokenAddress?: `0x${string}`;
  /** Placeholder native-token USD price; the Pricing Service replaces this. */
  nativeUsd?: number;
  /** Optional per-chain gas policy override. */
  policy?: ChainGasPolicy;
}

const env = import.meta.env;
const addr = (v: string | undefined) => (v && v.trim() ? (v.trim() as `0x${string}`) : undefined);
const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && v != null && v !== "" ? n : fallback;
};

// Registry keyed by EVM chain id. Every hardcoded chain fact lives HERE only.
export const CHAINS: Record<number, ChainConfig> = {
  1: {
    id: 1,
    name: "Ethereum",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    explorerUrl: "https://etherscan.io",
    rpcUrl: env.VITE_RPC_URL_1,
    c74TokenAddress: addr(env.VITE_C74_TOKEN_ADDRESS_1),
    nativeUsd: num(env.VITE_NATIVE_USD_1, 3000),
  },
  8453: {
    id: 8453,
    name: "Base",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    explorerUrl: "https://basescan.org",
    rpcUrl: env.VITE_RPC_URL_8453,
    c74TokenAddress: addr(env.VITE_C74_TOKEN_ADDRESS_8453),
    nativeUsd: num(env.VITE_NATIVE_USD_8453, 3000),
  },
  42161: {
    id: 42161,
    name: "Arbitrum",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    explorerUrl: "https://arbiscan.io",
    rpcUrl: env.VITE_RPC_URL_42161,
    c74TokenAddress: addr(env.VITE_C74_TOKEN_ADDRESS_42161),
    nativeUsd: num(env.VITE_NATIVE_USD_42161, 3000),
  },
  137: {
    id: 137,
    name: "Polygon",
    nativeSymbol: "POL",
    nativeDecimals: 18,
    explorerUrl: "https://polygonscan.com",
    rpcUrl: env.VITE_RPC_URL_137,
    c74TokenAddress: addr(env.VITE_C74_TOKEN_ADDRESS_137),
    nativeUsd: num(env.VITE_NATIVE_USD_137, 0.5),
  },
  56: {
    id: 56,
    name: "BNB Chain",
    nativeSymbol: "BNB",
    nativeDecimals: 18,
    explorerUrl: "https://bscscan.com",
    rpcUrl: env.VITE_RPC_URL_56,
    c74TokenAddress: addr(env.VITE_C74_TOKEN_ADDRESS_56),
    nativeUsd: num(env.VITE_NATIVE_USD_56, 600),
  },
};

export const getChain = (chainId: number): ChainConfig | undefined => CHAINS[chainId];
export const supportedChains = (): ChainConfig[] => Object.values(CHAINS);

/** Build a tx link from the chain's explorer, or "" if the chain is unknown. */
export const explorerTx = (chainId: number, hash: string): string => {
  const c = CHAINS[chainId];
  return c ? `${c.explorerUrl}/tx/${hash}` : "";
};

/**
 * Merge a chain's optional policy over the global GasConfig, producing the
 * effective config for that chain. Pure — no code path is chain-specific.
 */
export function resolveChainConfig(base: GasConfig, chainId: number): GasConfig {
  const policy = CHAINS[chainId]?.policy;
  if (!policy) return base;
  return {
    ...base,
    gasMultiplier: policy.gasMultiplier ?? base.gasMultiplier,
    maxGasSubsidyUsd: policy.maxGasSubsidyUsd ?? base.maxGasSubsidyUsd,
    perActionGasUnits: { ...base.perActionGasUnits, ...policy.perActionGasUnits },
  };
}

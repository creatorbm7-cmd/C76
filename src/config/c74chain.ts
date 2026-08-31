/**
 * C74 on-chain configuration — single source of truth for the app's blockchain
 * wiring. Mainnet launch is GATED: everything here is OFF by default and carries
 * NO real value until the go-live runbook (docs/C74-MAINNET-GOLIVE-RUNBOOK.md)
 * is executed and `enabled` is flipped at the same time the mainnet addresses
 * are filled in.
 *
 * Honesty rule (see CLAUDE.md): the UI must never present an on-chain balance,
 * address, or claim as live while `c74OnchainLive()` is false. Until launch the
 * C74 that users hold remains the off-chain rewards ledger (see useC74.ts); the
 * on-chain token is a separate, clearly-labelled future asset.
 */

export type C74Network = 'nile' | 'mainnet';

interface C74ChainConfig {
  /** Master switch. Flip to true ONLY at mainnet go-live, with `network:'mainnet'`
   *  and the mainnet addresses populated below. */
  enabled: boolean;
  /** Which deployment the app points at. */
  network: C74Network;
  /** Deployed C74 TRC-20 token address per network. mainnet is blank until launch. */
  token: Record<C74Network, string>;
  /** Deployed C74MerkleClaim distributor address per network. */
  claim: Record<C74Network, string>;
  /** Tronscan tx explorer base per network. */
  explorerTx: Record<C74Network, string>;
  /** Human label per network (for the testnet banner etc.). */
  label: Record<C74Network, string>;
  /** True for any non-mainnet deployment → the UI shows a "not real value" banner. */
  isTestnet: Record<C74Network, boolean>;
}

/**
 * DEFAULTS: disabled, pointing at the validated Nile testnet deployment.
 * The Nile addresses are the real, verified testnet contracts
 * (onchain/deployments/nile.json). Mainnet addresses are intentionally blank —
 * populate them from the deploy output at go-live, per the runbook.
 */
export const C74_CHAIN: C74ChainConfig = {
  enabled: false,
  network: 'nile',
  token: {
    nile: 'TNF8yYEsXT8PE3rB7PcnT4No7j6gVvC5of',
    mainnet: '', // ← set from `2_deploy_c74_token` output at mainnet go-live
  },
  claim: {
    nile: 'TUXk5Bwy49nYTxDMWhaeJdrQWUgX67nzdP',
    mainnet: '', // ← set from `3_deploy_merkle_claim` output at mainnet go-live
  },
  explorerTx: {
    nile: 'https://nile.tronscan.org/#/transaction/',
    mainnet: 'https://tronscan.org/#/transaction/',
  },
  label: {
    nile: 'TRON Nile testnet',
    mainnet: 'TRON mainnet',
  },
  isTestnet: {
    nile: true,
    mainnet: false,
  },
};

/** Active token contract address for the selected network ('' if not deployed). */
export const c74TokenAddress = (): string => C74_CHAIN.token[C74_CHAIN.network] || '';

/** Active claim/distributor address for the selected network ('' if not deployed). */
export const c74ClaimAddress = (): string => C74_CHAIN.claim[C74_CHAIN.network] || '';

/** Explorer tx-link base for the selected network. */
export const c74ExplorerTx = (): string => C74_CHAIN.explorerTx[C74_CHAIN.network] || '';

/** Human label for the selected network. */
export const c74NetworkLabel = (): string => C74_CHAIN.label[C74_CHAIN.network] || C74_CHAIN.network;

/** True when the selected network is a testnet → UI must show a "not real value" banner. */
export const c74IsTestnet = (): boolean => C74_CHAIN.isTestnet[C74_CHAIN.network] ?? true;

/**
 * The ONE gate the UI should check before showing any on-chain C74 feature as
 * live: the master flag is on AND a token contract address exists for the
 * selected network. While false, keep the honest "Coming with the C74 token"
 * / "Soon" states.
 */
export const c74OnchainLive = (): boolean => C74_CHAIN.enabled && c74TokenAddress().length > 0;

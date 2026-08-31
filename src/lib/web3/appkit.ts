// C74 Casino — Phase 1 wallet connection (wagmi v3 + viem + Reown AppKit).
//
// Supports MetaMask (injected), WalletConnect v2 and Coinbase Wallet through a
// single AppKit modal, across Ethereum / Base / Arbitrum / Polygon / BNB Chain.
//
// Security: connection is signature/account based only — we NEVER handle or store
// private keys. Phase 2 (deposits/withdrawals) builds on top of this.
//
// The WalletConnect Cloud project id. A Reown/WalletConnect project id is a
// PUBLIC client identifier (it ships in the browser bundle and is sent to
// Reown from the client) — it is NOT a secret, so we commit a working default
// and let VITE_WALLETCONNECT_PROJECT_ID override it per-environment if set.
// Lock this id to the production domain(s) in the Reown Cloud dashboard.
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { mainnet, base, arbitrum, polygon, bsc, type AppKitNetwork } from "@reown/appkit/networks";

// Public C74 Reown project id — built-in default so the wallet works in every
// build regardless of env config; override via VITE_WALLETCONNECT_PROJECT_ID.
const DEFAULT_WC_PROJECT_ID = "2d6625a4e4baf82faf9676b8981d1080";
const projectId =
  (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined)?.trim() || DEFAULT_WC_PROJECT_ID;

/** True only when a real WalletConnect project id is configured. */
export const walletReady = Boolean(projectId);

/** Chains offered in the connect modal + network switcher. */
export const APPKIT_NETWORKS = [mainnet, base, arbitrum, polygon, bsc] as [AppKitNetwork, ...AppKitNetwork[]];

// A placeholder keeps wagmiConfig constructible even without a project id so the
// WagmiProvider (and injected-wallet reads) still work; the modal stays disabled.
const wagmiAdapter = new WagmiAdapter({
  networks: APPKIT_NETWORKS,
  projectId: projectId || "c74-wallet-unconfigured",
  ssr: false,
});

/** wagmi config consumed by <WagmiProvider>. */
export const wagmiConfig = wagmiAdapter.wagmiConfig;

// Only register the modal when a real id exists — createAppKit with a bogus id
// would surface WalletConnect errors on open.
if (walletReady) {
  createAppKit({
    adapters: [wagmiAdapter],
    networks: APPKIT_NETWORKS,
    projectId: projectId!,
    metadata: {
      name: "C74 Casino",
      description: "C74 Casino — connect your wallet",
      url: typeof window !== "undefined" ? window.location.origin : "https://c7casinos-deploy.vercel.app",
      icons: ["/icons/v2/brand-c74.png"],
    },
    themeMode: "dark",
    themeVariables: { "--w3m-accent": "#f6d67a" },
    features: { analytics: false, email: false, socials: [] },
  });
}

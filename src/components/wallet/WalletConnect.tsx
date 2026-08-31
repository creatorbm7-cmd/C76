// C74 Casino — Phase 1 Wallet Connection UI.
//
// Connect (MetaMask / WalletConnect v2 / Coinbase) via the AppKit modal, then show
// the connected address, active network badge, native ETH balance and ERC-20
// (USDT/USDC) balances, with a network switcher and disconnect. Read-only — no
// transactions here; deposits/withdrawals are Phase 2.
import { useAccount, useBalance, useChainId, useConnect, useDisconnect, useReadContracts, useSwitchChain } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import { useAppKit } from "@reown/appkit/react";
import { walletReady } from "@/lib/web3/appkit";
import C74GasPanel from "./C74GasPanel";
import WalletDeposit from "./WalletDeposit";

// Canonical stablecoin addresses per chain (USDT/USDC). Decimals are read on-chain,
// so BSC's 18-decimal tokens format correctly alongside the 6-decimal L1/L2 ones.
type Tok = { symbol: string; address: `0x${string}` };
const TOKENS: Record<number, Tok[]> = {
  1: [
    { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" },
    { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
  ],
  8453: [{ symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" }],
  42161: [
    { symbol: "USDT", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" },
    { symbol: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
  ],
  137: [
    { symbol: "USDT", address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" },
    { symbol: "USDC", address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" },
  ],
  56: [
    { symbol: "USDT", address: "0x55d398326f99059fF775485246999027B3197955" },
    { symbol: "USDC", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d" },
  ],
};

const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
const fmt = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 4 });

export default function WalletConnect() {
  const { open } = useAppKit();
  const { address, isConnected, chain } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();

  // Resolve the wagmi connector for each wallet (ids/names vary by environment);
  // fall back to the full AppKit modal (open()) if a specific one isn't present.
  const findConn = (kw: string[]) =>
    connectors.find((c) => kw.some((k) => c.id?.toLowerCase().includes(k) || c.name?.toLowerCase().includes(k)));
  const WALLETS = [
    { key: "mm", label: "MetaMask", icon: "🦊", conn: findConn(["metamask"]) ?? findConn(["injected"]) },
    { key: "wc", label: "WalletConnect", icon: "🔗", conn: findConn(["walletconnect"]) },
    { key: "cb", label: "Coinbase", icon: "🔵", conn: findConn(["coinbase"]) },
    { key: "all", label: "All Wallets", icon: "👛", conn: undefined as (typeof connectors)[number] | undefined },
  ];
  const pick = (w: (typeof WALLETS)[number]) => (w.conn ? connect({ connector: w.conn }) : open());
  const { chains, switchChain, isPending: switching } = useSwitchChain();
  const { data: native } = useBalance({ address, query: { enabled: isConnected } });

  const tokens = TOKENS[chainId] ?? [];
  const { data: tokReads } = useReadContracts({
    allowFailure: true,
    contracts: tokens.flatMap((t) => [
      { address: t.address, abi: erc20Abi, functionName: "balanceOf", args: [address!], chainId },
      { address: t.address, abi: erc20Abi, functionName: "decimals", chainId },
    ]),
    query: { enabled: isConnected && !!address && tokens.length > 0 },
  });

  const tokenBalances = tokens.map((t, i) => {
    const bal = tokReads?.[i * 2]?.result as bigint | undefined;
    const dec = tokReads?.[i * 2 + 1]?.result as number | undefined;
    const value = bal != null && dec != null ? Number(formatUnits(bal, dec)) : undefined;
    return { symbol: t.symbol, value };
  });

  return (
    <div className="wc">
      <style>{CSS}</style>

      {!walletReady ? (
        <div className="wc-note">
          <b>Wallet connect not configured</b>
          <small>Set <code>VITE_WALLETCONNECT_PROJECT_ID</code> (WalletConnect Cloud) to enable MetaMask / WalletConnect / Coinbase.</small>
        </div>
      ) : !isConnected ? (
        <div className="wc-grid">
          {WALLETS.map((w) => (
            <button
              key={w.key}
              type="button"
              className={`wc-wbtn${w.key === "all" ? " all" : ""}`}
              disabled={connecting}
              onClick={() => pick(w)}
            >
              <span className="wc-wbtn-ic" aria-hidden="true">{w.icon}</span>
              <span className="wc-wbtn-l">{w.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="wc-panel">
          <div className="wc-row">
            <button type="button" className="wc-addr" onClick={() => open({ view: "Account" })}>
              <span className="wc-dot" aria-hidden="true" />
              {short(address)}
            </button>
            <span className="wc-net">{chain?.name ?? `Chain ${chainId}`}</span>
          </div>

          <div className="wc-bals">
            <div className="wc-bal">
              <span className="wc-bal-k">{native?.symbol ?? "ETH"}</span>
              <span className="wc-bal-v">{native ? fmt(Number(native.formatted)) : "—"}</span>
            </div>
            {tokenBalances.map((t) => (
              <div className="wc-bal" key={t.symbol}>
                <span className="wc-bal-k">{t.symbol}</span>
                <span className="wc-bal-v">{t.value != null ? fmt(t.value) : "—"}</span>
              </div>
            ))}
          </div>

          <WalletDeposit />

          <C74GasPanel />

          <div className="wc-nets">
            {chains.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`wc-netchip${c.id === chainId ? " on" : ""}`}
                disabled={switching || c.id === chainId}
                onClick={() => switchChain({ chainId: c.id })}
              >
                {c.name}
              </button>
            ))}
          </div>

          <button type="button" className="wc-disc" onClick={() => disconnect()}>Disconnect</button>
        </div>
      )}
    </div>
  );
}

const CSS = `
.wc { width: 100%; font-family: inherit; }
.wc-note { display: flex; flex-direction: column; gap: 3px; padding: 13px 15px; border-radius: 14px; color: #d7efe0;
  background: linear-gradient(160deg, rgba(20,66,42,0.8), rgba(10,20,15,0.9)); border: 1px solid rgba(246,214,122,0.3); }
.wc-note b { font-size: 13px; color: #ffe6a2; } .wc-note small { font-size: 10.5px; color: rgba(220,232,223,0.6); }
.wc-note code { color: #ffe6a2; }
.wc-connect { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 15px 18px; border: none; cursor: pointer; font-family: inherit; font-size: 15px; font-weight: 900; letter-spacing: 0.3px; color: #241808; border-radius: 16px;
  background: radial-gradient(130% 130% at 50% -18%, rgba(255,255,255,0.6), transparent 44%), linear-gradient(180deg, #fff2c0, #f6d67a 36%, #e8b44a 64%, #b9791b);
  box-shadow: 0 6px 0 #7a5214, 0 15px 26px -10px rgba(232,180,74,0.6), inset 0 2px 0 rgba(255,255,255,0.75); transition: transform .09s ease; }
.wc-connect:active { transform: translateY(2px); box-shadow: 0 3px 0 #7a5214, inset 0 2px 5px rgba(120,74,8,0.4); }
.wc-connect-ic { font-size: 18px; }
.wc-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; width: 100%; }
.wc-wbtn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; padding: 16px 10px; border-radius: 15px; cursor: pointer; font-family: inherit; -webkit-tap-highlight-color: transparent;
  color: #eef7f0; background: radial-gradient(120% 100% at 50% -10%, rgba(47,226,154,0.14), transparent 60%), linear-gradient(160deg, rgba(20,66,42,0.85), rgba(10,22,15,0.92));
  border: 1px solid rgba(95,221,160,0.32); box-shadow: inset 0 1px 0 rgba(200,246,220,0.14), 0 6px 16px -10px rgba(0,0,0,0.6); transition: transform .09s ease; }
.wc-wbtn:active { transform: translateY(1px) scale(0.99); }
.wc-wbtn:disabled { opacity: 0.55; cursor: default; }
.wc-wbtn-ic { font-size: 24px; line-height: 1; }
.wc-wbtn-l { font-size: 12.5px; font-weight: 900; letter-spacing: 0.2px; }
.wc-wbtn.all { color: #241808; border-color: transparent;
  background: radial-gradient(130% 130% at 50% -18%, rgba(255,255,255,0.55), transparent 44%), linear-gradient(180deg, #fff2c0, #f6d67a 38%, #e8b44a 66%, #c68a2e);
  box-shadow: 0 4px 0 #7a5214, 0 12px 22px -12px rgba(232,180,74,0.6), inset 0 1px 0 rgba(255,255,255,0.7); }
.wc-wbtn.all:active { box-shadow: 0 2px 0 #7a5214, inset 0 2px 5px rgba(120,74,8,0.4); }
.wc-panel { display: flex; flex-direction: column; gap: 11px; padding: 14px 15px; border-radius: 16px;
  background: radial-gradient(120% 90% at 50% -20%, rgba(47,226,154,0.14), transparent 60%), linear-gradient(160deg, rgba(18,58,38,0.92), rgba(7,20,13,0.95));
  border: 1px solid rgba(246,214,122,0.4); box-shadow: 0 0 0 1px rgba(120,84,20,0.4), inset 0 1px 0 rgba(255,244,214,0.14); }
.wc-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.wc-addr { display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px; border-radius: 999px; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 800; color: #eef7f0;
  background: rgba(0,0,0,0.28); border: 1px solid rgba(95,221,160,0.3); }
.wc-dot { width: 8px; height: 8px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #7ff0c0, #159861); box-shadow: 0 0 6px rgba(47,226,154,0.8); }
.wc-net { font-size: 10px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; color: #241808; padding: 5px 10px; border-radius: 999px;
  background: linear-gradient(180deg, #fff2c0, #f6d67a 45%, #c68a2e); box-shadow: inset 0 1px 0 rgba(255,255,255,0.5); }
.wc-bals { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 8px; }
.wc-bal { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 12px; background: rgba(0,0,0,0.25); border: 1px solid rgba(95,221,160,0.18); }
.wc-bal-k { font-size: 9.5px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; color: #9fd8bd; }
.wc-bal-v { font-size: 16px; font-weight: 900; color: #eef7f0; font-variant-numeric: tabular-nums; }
.wc-nets { display: flex; flex-wrap: wrap; gap: 6px; }
.wc-netchip { font-size: 10.5px; font-weight: 800; padding: 6px 11px; border-radius: 999px; cursor: pointer; font-family: inherit; color: #dce8df;
  background: linear-gradient(160deg, rgba(20,66,42,0.8), rgba(12,26,19,0.8)); border: 1px solid rgba(95,221,160,0.28); transition: opacity .12s; }
.wc-netchip.on { color: #241808; border-color: transparent; background: linear-gradient(180deg, #fff2c0, #f6d67a 46%, #c68a2e); }
.wc-netchip:disabled { opacity: 0.55; cursor: default; }
.wc-disc { align-self: flex-start; font-size: 11px; font-weight: 800; color: #ff9a8f; background: none; border: none; cursor: pointer; font-family: inherit; padding: 2px 0; text-decoration: underline; }
`;

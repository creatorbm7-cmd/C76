// C74 Gas — Phase A estimate panel (display only, no execution).
//
// Shows the user's C74 balance and, for a sample action (Withdraw), the estimated
// native gas, the C74 gas discount, the final fee in C74 and the savings — computed
// by the pure Fee Engine from a live gas-price read. Clearly labelled an ESTIMATE:
// the server re-computes authoritatively at execution (Phase B).
//
// Config placeholders (prices, C74 token address) come from env and will be served
// by the Pricing Service / admin config later — nothing here is authoritative.
import { useAccount, useChainId, useGasPrice, useReadContracts } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import { quoteFee, DEFAULT_GAS_CONFIG, type GasAction } from "@/lib/gas/feeEngine";
import { getChain, resolveChainConfig } from "@/lib/gas/chains";
import { useC74Price } from "@/hooks/useC74Price";

// No chain facts live here — the C74 token address, native price and decimals all
// come from the chain-agnostic registry (@/lib/gas/chains). Adding a chain is a
// registry/config change, never a change to this component.
// The C74 token price is the platform valuation from useC74Price (admin config /
// oracle-ready) — the SAME source used everywhere C74 price is shown. Network gas
// (native price / gas units) stays separate below.
const ACTION: GasAction = "withdraw";

const n4 = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 4 });
const usd = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function C74GasPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const c74Price = useC74Price();
  const { data: gasPrice } = useGasPrice({ query: { enabled: isConnected } });

  const chainCfg = getChain(chainId);
  const c74Addr = chainCfg?.c74TokenAddress;
  const { data: c74Reads } = useReadContracts({
    allowFailure: true,
    contracts: c74Addr
      ? [
          { address: c74Addr, abi: erc20Abi, functionName: "balanceOf", args: [address!], chainId },
          { address: c74Addr, abi: erc20Abi, functionName: "decimals", chainId },
        ]
      : [],
    query: { enabled: isConnected && !!address && !!c74Addr },
  });
  const c74Bal =
    c74Reads?.[0]?.result != null && c74Reads?.[1]?.result != null
      ? Number(formatUnits(c74Reads[0].result as bigint, c74Reads[1].result as number))
      : undefined;

  const quote =
    gasPrice != null
      ? quoteFee(
          {
            action: ACTION,
            chainId,
            feePerGasWei: gasPrice,
            nativeUsd: chainCfg?.nativeUsd ?? 0,
            nativeDecimals: chainCfg?.nativeDecimals,
            c74Usd: c74Price.usd,
            user: { c74Balance: c74Bal },
          },
          resolveChainConfig(DEFAULT_GAS_CONFIG, chainId),
        )
      : undefined;

  return (
    <div className="c74g">
      <style>{CSS}</style>
      <div className="c74g-h">
        <span className="c74g-badge">C74</span> Gas <small>estimate</small>
        <span className="c74g-bal">{c74Bal != null ? `${n4(c74Bal)} C74` : "— C74"}</span>
      </div>

      <div className="c74g-price">
        <span className="c74g-k">C74 price</span>
        <span className="c74g-v">{c74Price.label}</span>
      </div>

      {quote ? (
        <div className="c74g-grid">
          <Row k={`Est. gas (${ACTION})`} v={`${n4(quote.gasNativeFormatted)} · ${usd(quote.gasUsd)}`} />
          <Row k="C74 gas discount" v={`−${n4(quote.savingsC74)} C74`} accent="save" />
          <Row
            k="Final fee"
            v={quote.networkFeeFallback ? "network fee" : `${n4(quote.finalFeeC74)} C74`}
            accent="fee"
          />
          <Row k="You save" v={`${n4(quote.savingsC74)} C74`} accent="save" />
        </div>
      ) : (
        <div className="c74g-note">Connect + select a network to estimate gas.</div>
      )}

      <div className="c74g-foot">Estimate · server-authoritative at execution · {quote?.coverageMode ?? "—"}</div>
    </div>
  );
}

function Row({ k, v, accent }: { k: string; v: string; accent?: "save" | "fee" }) {
  return (
    <div className="c74g-row">
      <span className="c74g-k">{k}</span>
      <span className={`c74g-v${accent ? " " + accent : ""}`}>{v}</span>
    </div>
  );
}

const CSS = `
.c74g { margin-top: 11px; padding: 12px 13px; border-radius: 14px;
  background: radial-gradient(120% 90% at 100% 0%, rgba(246,201,69,0.1), transparent 60%), linear-gradient(160deg, rgba(20,58,40,0.7), rgba(8,20,13,0.85));
  border: 1px solid rgba(246,214,122,0.32); }
.c74g-h { display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 900; color: #ffe6a2; }
.c74g-h small { font-size: 9px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; color: #9fd8bd; }
.c74g-badge { font-size: 10px; font-weight: 900; color: #241808; padding: 2px 6px; border-radius: 6px; background: linear-gradient(180deg, #fff2c0, #f6d67a 46%, #c68a2e); }
.c74g-bal { margin-left: auto; font-size: 12px; font-weight: 900; color: #eef7f0; font-variant-numeric: tabular-nums; }
.c74g-price { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 9px; padding-top: 9px; border-top: 1px solid rgba(246,214,122,0.16); }
.c74g-price .c74g-v { color: #ffe6a2; }
.c74g-grid { display: flex; flex-direction: column; gap: 6px; margin-top: 9px; }
.c74g-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.c74g-k { font-size: 11px; color: rgba(220,232,223,0.7); }
.c74g-v { font-size: 12.5px; font-weight: 900; color: #eef7f0; font-variant-numeric: tabular-nums; }
.c74g-v.save { color: #7ff0c0; } .c74g-v.fee { color: #ffd67a; }
.c74g-note { margin-top: 8px; font-size: 11px; color: rgba(220,232,223,0.6); }
.c74g-foot { margin-top: 9px; font-size: 9px; letter-spacing: 0.2px; color: rgba(220,232,223,0.45); }
`;

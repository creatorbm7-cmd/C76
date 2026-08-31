// WalletDeposit — Phase 2: deposit to play, straight from the connected wallet.
//
// The user (already connected via WalletConnect) sends USDT from their own wallet
// to their per-user on-chain deposit address; the existing `cron-scan-deposits`
// edge function (ETH + BSC, USDT) detects the Transfer and credits their casino
// balance — then they can play. No custody change, no new backend: this only
// composes wagmi's transfer with the deposit rail already in production.
//
// SAFETY — money-critical, so this is deliberately narrow:
//   • ONLY the two chains the scanner watches: Ethereum (1) and BNB Chain (56).
//   • ONLY USDT, at the SAME contract + decimals the scanner uses (else a
//     transfer would never be credited). Any other chain → prompt to switch.
//   • Destination is the user's OWN derived address from get_user_deposit_address
//     (ERC20/BEP20), shown for verification. Enforces the per-chain minimum.
import { useEffect, useState } from "react";
import { useAccount, useChainId, useReadContract, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { erc20Abi, parseUnits } from "viem";
import { supabase } from "@/integrations/supabase/client";

// Per-chain facts MUST match supabase/functions/cron-scan-deposits (USDT only).
const CHAINS: Record<number, { rpcChain: string; label: string; usdt: `0x${string}`; min: number }> = {
  1:  { rpcChain: "ERC20", label: "Ethereum", usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7", min: 20 },
  56: { rpcChain: "BEP20", label: "BNB Chain", usdt: "0x55d398326f99059fF775485246999027B3197955", min: 5 },
};

const short = (a?: string) => (a ? `${a.slice(0, 8)}…${a.slice(-6)}` : "");

export default function WalletDeposit() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: switching } = useSwitchChain();
  const cfg = CHAINS[chainId];

  const [userId, setUserId] = useState<string | null>(null);
  const [depositAddr, setDepositAddr] = useState<string | null>(null);
  const [addrErr, setAddrErr] = useState<string | null>(null);
  const [amount, setAmount] = useState("");

  // Casino account (deposit credits the logged-in user, not the wallet).
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // The user's own derived deposit address for this chain.
  useEffect(() => {
    if (!userId || !cfg) { setDepositAddr(null); return; }
    let off = false;
    setDepositAddr(null); setAddrErr(null);
    supabase.rpc("get_user_deposit_address", { p_user_id: userId, p_chain: cfg.rpcChain }).then(({ data, error }) => {
      if (off) return;
      const r = data as { success?: boolean; address?: string; error?: string } | null;
      if (error || !r?.success || !r.address) setAddrErr(r?.error || "Deposit address unavailable — try again.");
      else setDepositAddr(r.address);
    });
    return () => { off = true; };
  }, [userId, cfg]);

  // On-chain USDT decimals (ETH=6, BSC=18) — read, don't assume.
  const { data: decimals } = useReadContract({
    address: cfg?.usdt, abi: erc20Abi, functionName: "decimals", chainId,
    query: { enabled: !!cfg },
  });
  // The wallet's USDT balance, to guard against over-send.
  const { data: usdtBal } = useReadContract({
    address: cfg?.usdt, abi: erc20Abi, functionName: "balanceOf", args: [address as `0x${string}`],
    chainId, query: { enabled: !!cfg && !!address },
  });

  const { writeContract, data: hash, isPending: sending, error: sendErr, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash });

  if (!isConnected) return null;

  // Wrong network → offer to switch to a supported deposit chain.
  if (!cfg) {
    return (
      <div className="wd">
        <style>{CSS}</style>
        <div className="wd-h">💵 Deposit to play</div>
        <div className="wd-note">On-chain deposits run on <b>Ethereum</b> or <b>BNB Chain</b> (USDT). Switch network to deposit:</div>
        <div className="wd-switch">
          <button type="button" disabled={switching} onClick={() => switchChain({ chainId: 1 })}>Ethereum</button>
          <button type="button" disabled={switching} onClick={() => switchChain({ chainId: 56 })}>BNB Chain</button>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="wd">
        <style>{CSS}</style>
        <div className="wd-h">💵 Deposit to play</div>
        <div className="wd-note">Sign in to your C74 account to deposit from your wallet and play.</div>
      </div>
    );
  }

  const dec = typeof decimals === "number" ? decimals : cfg.rpcChain === "ERC20" ? 6 : 18;
  const balNum = usdtBal != null && dec != null ? Number(usdtBal) / 10 ** dec : undefined;
  const amt = parseFloat(amount);
  const tooLow = !(amt >= cfg.min);
  const tooHigh = balNum != null && amt > balNum;
  const canSend = !!depositAddr && !tooLow && !tooHigh && !sending && !confirming;

  const send = () => {
    if (!depositAddr) return;
    writeContract({
      address: cfg.usdt, abi: erc20Abi, functionName: "transfer",
      args: [depositAddr as `0x${string}`, parseUnits(amount, dec)],
    });
  };

  return (
    <div className="wd">
      <style>{CSS}</style>
      <div className="wd-h">💵 Deposit to play <small>{cfg.label} · USDT</small></div>

      {confirmed ? (
        <div className="wd-done">
          ✅ Sent! Your balance credits in ~1–2 min once the deposit confirms on-chain.
          <button type="button" className="wd-again" onClick={() => { reset(); setAmount(""); }}>Deposit more</button>
        </div>
      ) : (
        <>
          <div className="wd-amt">
            <input
              inputMode="decimal" placeholder={`Min ${cfg.min} USDT`} value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            />
            <span className="wd-cur">USDT</span>
          </div>
          <div className="wd-quick">
            {[cfg.min, 50, 100, 250].map((q) => (
              <button key={q} type="button" onClick={() => setAmount(String(q))}>{q}</button>
            ))}
          </div>

          <div className="wd-meta">
            <span>To <code>{short(depositAddr ?? "")}</code> (your address)</span>
            {balNum != null && <span>Wallet: {balNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</span>}
          </div>

          <button type="button" className="wd-send" disabled={!canSend} onClick={send}>
            {sending ? "Confirm in wallet…" : confirming ? "Confirming on-chain…" : `Deposit ${amount || "0"} USDT`}
          </button>

          {addrErr && <div className="wd-err">{addrErr}</div>}
          {tooHigh && <div className="wd-err">Amount exceeds your wallet USDT balance.</div>}
          {sendErr && <div className="wd-err">{/rejected|denied/i.test(sendErr.message) ? "Transaction rejected." : "Transfer failed — try again."}</div>}
          <div className="wd-fine">You send real USDT from your wallet · network gas applies · credited after on-chain confirmation.</div>
        </>
      )}
    </div>
  );
}

const CSS = `
.wd { display: flex; flex-direction: column; gap: 9px; padding: 13px 14px; border-radius: 14px;
  background: radial-gradient(120% 90% at 100% 0%, rgba(47,226,154,0.1), transparent 60%), linear-gradient(160deg, rgba(20,58,40,0.75), rgba(8,20,13,0.88));
  border: 1px solid rgba(95,221,160,0.32); }
.wd-h { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 900; color: #b9ffd8; }
.wd-h small { font-size: 9.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; color: #9fd8bd; }
.wd-note { font-size: 11.5px; line-height: 1.4; color: rgba(220,232,223,0.72); } .wd-note b { color: #eef7f0; }
.wd-switch { display: flex; gap: 8px; }
.wd-switch button { flex: 1; padding: 10px; border-radius: 11px; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 800; color: #05340f; border: none;
  background: linear-gradient(180deg, #9CFFCB, #39FF88 55%, #00A86B); }
.wd-switch button:disabled { opacity: 0.5; cursor: default; }
.wd-amt { display: flex; align-items: center; gap: 8px; padding: 10px 13px; border-radius: 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(95,221,160,0.25); }
.wd-amt input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: #eef7f0; font-family: inherit; font-size: 18px; font-weight: 900; }
.wd-cur { font-size: 12px; font-weight: 900; color: #9fd8bd; }
.wd-quick { display: flex; gap: 6px; }
.wd-quick button { flex: 1; padding: 7px; border-radius: 9px; cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 800; color: #dce8df;
  background: rgba(0,0,0,0.25); border: 1px solid rgba(95,221,160,0.22); }
.wd-meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 10px; font-size: 10.5px; color: rgba(220,232,223,0.6); }
.wd-meta code { color: #ffe6a2; font-size: 10.5px; }
.wd-send { padding: 14px; border: none; border-radius: 13px; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 900; color: #05340f;
  background: radial-gradient(130% 130% at 50% -18%, rgba(255,255,255,0.5), transparent 44%), linear-gradient(180deg, #9CFFCB, #39FF88 52%, #00A86B); }
.wd-send:disabled { opacity: 0.5; cursor: default; filter: grayscale(0.3); }
.wd-err { font-size: 11px; font-weight: 700; color: #ff9a8f; }
.wd-fine { font-size: 9.5px; line-height: 1.35; color: rgba(220,232,223,0.45); }
.wd-done { display: flex; flex-direction: column; gap: 9px; font-size: 12.5px; font-weight: 700; color: #b9ffd8; line-height: 1.4; }
.wd-again { align-self: flex-start; padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(95,221,160,0.3); background: rgba(0,0,0,0.25); color: #eef7f0; font-family: inherit; font-weight: 800; font-size: 12px; cursor: pointer; }
`;

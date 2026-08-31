// C74 Airdrop Claim (/c74/claim) — TESTNET claim UI for C74MerkleClaim.sol.
//
// Pull-based Merkle airdrop: the page detects TronLink (window.tronWeb, injected
// at runtime — no bundled dependency), looks the connected wallet up in the
// published proofs file (scripts/c74-merkle-build.py output), shows the
// allocation + on-chain claimed state, and calls claim(index, account, amount,
// proof) on the deployed distributor. Emerald/gold to match TokenCenter.
//
// Network + contract addresses come from src/config/c74chain.ts — a single flip
// there (enabled + network:'mainnet' + mainnet addresses) promotes this page
// from the validated Nile testnet to mainnet. Default today: Nile testnet.
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import JungleBackdrop from '@/components/c7/JungleBackdrop';
import LuxFrameFX from '@/components/c7/shell/LuxFrameFX';
import { c74ClaimAddress, c74ExplorerTx, c74NetworkLabel, c74IsTestnet } from '@/config/c74chain';

// ── Network-aware deploy config (see src/config/c74chain.ts) ──────────────────
const CLAIM_CONTRACT = c74ClaimAddress();          // C74MerkleClaim for the active network
const PROOFS_URL = '/c74/airdrop/proofs.json';     // published c74-merkle-proofs.json
const EXPLORER = c74ExplorerTx();                  // active network's tx explorer base

const CLAIM_ABI = [
  { constant: true, inputs: [{ name: 'index', type: 'uint256' }], name: 'isClaimed',
    outputs: [{ name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { constant: false, inputs: [
      { name: 'index', type: 'uint256' }, { name: 'account', type: 'address' },
      { name: 'amount', type: 'uint256' }, { name: 'merkleProof', type: 'bytes32[]' }],
    name: 'claim', outputs: [], stateMutability: 'nonpayable', type: 'function' },
];

type ClaimEntry = { index: number; amount: string; amountHuman: number; proof: string[] };
type Proofs = { merkleRoot: string; decimals: number; claims: Record<string, ClaimEntry> };

type Phase = 'init' | 'no-wallet' | 'no-round' | 'not-eligible' | 'ready' | 'claimed' | 'claiming' | 'submitted' | 'done' | 'error';

const fmt = (n: number) => n.toLocaleString('en-US');
const short = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

export default function C74Claim() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>('init');
  const [addr, setAddr] = useState('');
  const [entry, setEntry] = useState<ClaimEntry | null>(null);
  const [txid, setTxid] = useState('');
  const [err, setErr] = useState('');

  const tron = () => (window as any).tronWeb;

  const load = useCallback(async () => {
    setErr(''); setPhase('init');
    const tw = tron();
    if (!tw || !tw.defaultAddress?.base58) { setPhase('no-wallet'); return; }
    const me = tw.defaultAddress.base58 as string;
    setAddr(me);

    let proofs: Proofs;
    try {
      const res = await fetch(PROOFS_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error();
      proofs = await res.json();
    } catch {
      setPhase('no-round'); return;                 // no published round yet
    }
    const mine = proofs.claims?.[me];
    if (!mine) { setEntry(null); setPhase('not-eligible'); return; }
    setEntry(mine);

    if (!CLAIM_CONTRACT) { setPhase('ready'); return; }  // pre-deploy: show allocation only
    try {
      const c = await tw.contract(CLAIM_ABI as any).at(CLAIM_CONTRACT);
      const claimed = await c.isClaimed(mine.index).call();
      setPhase(claimed ? 'claimed' : 'ready');
    } catch {
      setPhase('ready');                            // contract not reachable → still show allocation
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doClaim = async () => {
    if (!entry) return;
    if (!CLAIM_CONTRACT) { setErr('Claim contract not deployed yet (testnet).'); return; }
    setErr(''); setPhase('claiming');
    try {
      const tw = tron();
      const c = await tw.contract(CLAIM_ABI as any).at(CLAIM_CONTRACT);
      const id = await c.claim(entry.index, addr, entry.amount, entry.proof).send({ shouldPollResponse: false });
      setTxid(typeof id === 'string' ? id : '');
      // Broadcast ≠ settled. Don't claim success from a txid alone — poll the
      // contract's own isClaimed(index) and only show "Claimed!" once the chain
      // confirms it. Until then the honest state is "submitted / confirming".
      setPhase('submitted');
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        try {
          const ok = await c.isClaimed(entry.index).call();
          if (ok) { setPhase('done'); return; }
        } catch { /* transient view error — keep polling */ }
      }
      // Still unconfirmed after polling: leave it as "submitted" (never a false
      // "sent"); the user can re-check with Refresh status.
    } catch (e: any) {
      setErr(e?.message || String(e) || 'Claim failed');
      setPhase('error');
    }
  };

  const human = entry?.amountHuman ?? 0;

  return (
    <div className="cl-root">
      <style>{CSS}</style>
      <JungleBackdrop />
      <div className="cl-wrap">
        <header className="cl-bar">
          <LuxFrameFX />
          <button className="cl-ic" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/c74/token'))} aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <span className="cl-ttl c7p-title tt-gold">🎁 C74 Airdrop Claim</span>
          <span style={{ width: 34 }} />
        </header>

        {c74IsTestnet() && (
          <div className="cl-testnet">⚠️ TESTNET · {c74NetworkLabel()} — not real value, not audited</div>
        )}

        <main className="cl-main">
          {phase === 'init' && <div className="cl-loading"><Loader2 className="cl-spin" size={26} /></div>}

          {phase === 'no-wallet' && (
            <div className="cl-card c7p-glass">
              <div className="cl-emoji">👛</div>
              <h2>Connect TronLink</h2>
              <p>Install / unlock the TronLink wallet (set to <b>Nile testnet</b>) and reload to check your C74 allocation.</p>
              <button className="cl-btn c7p-btn-green" onClick={load}>Reload</button>
            </div>
          )}

          {phase === 'no-round' && (
            <div className="cl-card c7p-glass">
              <div className="cl-emoji">⏳</div>
              <h2>No active claim round</h2>
              <p>The airdrop Merkle root hasn't been published yet. Once a round is live, your allocation shows up here automatically.</p>
              <div className="cl-addr">Wallet: {short(addr)}</div>
            </div>
          )}

          {phase === 'not-eligible' && (
            <div className="cl-card c7p-glass">
              <div className="cl-emoji">🔍</div>
              <h2>Not in this round</h2>
              <p>{short(addr)} isn't in the current airdrop tree. Keep playing to earn C74 Energy — the ongoing pool fills as you engage.</p>
              <button className="cl-btn ghost" onClick={() => nav('/c74/mining')}>⛏️ Play Mining</button>
            </div>
          )}

          {(phase === 'ready' || phase === 'claiming') && entry && (
            <>
              <section className="cl-hero">
                <span className="cl-shine" aria-hidden="true" />
                <div className="cl-k">🎁 Your C74 allocation</div>
                <div className="cl-v">{fmt(human)}</div>
                <div className="cl-sub">C74 · claim #{entry.index}</div>
              </section>
              <div className="cl-addr">Claiming to {short(addr)}</div>
              <button className="cl-btn c7p-btn-green big" onClick={doClaim} disabled={phase === 'claiming'}>
                {phase === 'claiming' ? <><Loader2 className="cl-spin" size={16} /> Claiming…</> : 'Claim C74'}
              </button>
              {!CLAIM_CONTRACT && <p className="cl-note">Distributor not deployed yet — this shows your allocation from the published tree. Claiming activates once the Nile contract address is set.</p>}
              {err && <div className="cl-err">{err}</div>}
            </>
          )}

          {phase === 'claimed' && (
            <div className="cl-card c7p-glass">
              <div className="cl-emoji">✅</div>
              <h2>Already claimed</h2>
              <p>This wallet has already claimed {entry ? `${fmt(human)} C74` : 'its allocation'} in this round.</p>
              <div className="cl-addr">{short(addr)}</div>
            </div>
          )}

          {phase === 'submitted' && (
            <div className="cl-card c7p-glass">
              <div className="cl-emoji">📡</div>
              <h2>Claim submitted</h2>
              <p>Your claim for {fmt(human)} C74 was broadcast to TRON Nile and is confirming on-chain. This can take a moment.</p>
              {txid && <a className="cl-btn ghost" href={EXPLORER + txid} target="_blank" rel="noreferrer">View on explorer ›</a>}
              <button className="cl-btn c7p-btn-green" style={{ marginTop: 12 }} onClick={load}>Refresh status</button>
            </div>
          )}

          {phase === 'done' && (
            <div className="cl-card c7p-glass">
              <div className="cl-emoji">🎉</div>
              <h2>Claimed!</h2>
              <p>Confirmed on-chain — {fmt(human)} C74 claimed to {short(addr)}.</p>
              {txid && <a className="cl-btn ghost" href={EXPLORER + txid} target="_blank" rel="noreferrer">View on explorer ›</a>}
            </div>
          )}

          {phase === 'error' && (
            <div className="cl-card c7p-glass">
              <div className="cl-emoji">⚠️</div>
              <h2>Claim failed</h2>
              <p className="cl-err">{err}</p>
              <button className="cl-btn c7p-btn-green" onClick={load}>Try again</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const CSS = `
.cl-root { position: relative; min-height: 100vh; color: #e6f0ea; font-family: Inter, system-ui, sans-serif; background: radial-gradient(120% 65% at 50% -8%, rgba(246,201,69,0.12), transparent 58%), radial-gradient(110% 55% at 50% 0%, rgba(46,224,138,0.11), transparent 60%), linear-gradient(172deg, #0d3d28 0%, #072517 46%, #04160d 100%); overflow: hidden; }
.cl-wrap { position: relative; z-index: 1; max-width: 560px; margin: 0 auto; padding: 0 14px calc(28px + env(safe-area-inset-bottom, 0px)); }
.cl-bar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; padding: 14px 4px 12px;
  background: linear-gradient(180deg, rgba(3,13,7,0.92), rgba(3,13,7,0.5)); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(246,201,69,0.42); }
.cl-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; border: none; cursor: pointer; color: #d6ffe8;
  background: linear-gradient(160deg, #0d3a28, #072318); box-shadow: 0 0 0 1.5px rgba(0,168,107,0.5), inset 0 1.5px 0 rgba(200,246,220,0.18); }
.cl-ttl { font-size: 15px; font-weight: 900; letter-spacing: 0.3px; color: #ffe9a8; }
.cl-testnet { text-align: center; font-size: 11px; font-weight: 800; letter-spacing: 0.3px; color: #ffd67a; padding: 7px 10px; border-radius: 10px; margin-bottom: 12px;
  background: rgba(255,180,60,0.1); border: 1px dashed rgba(255,190,80,0.4); }
.cl-main { position: relative; }
.cl-loading { display: grid; place-items: center; padding: 60px 0; }
.cl-spin { animation: cl-spin 1s linear infinite; color: #f6c945; vertical-align: middle; }
@keyframes cl-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .cl-spin { animation: none; } }

.cl-hero { position: relative; overflow: hidden; text-align: center; padding: 22px 16px 24px; border-radius: 18px;
  background: radial-gradient(120% 90% at 50% 0%, rgba(246,201,69,0.16), transparent 60%), linear-gradient(160deg, rgba(20,58,40,0.8), rgba(6,20,13,0.9));
  border: 1px solid rgba(246,214,122,0.32); box-shadow: 0 10px 30px -14px rgba(0,0,0,0.6); }
.cl-shine { position: absolute; inset: 0 0 auto; height: 46%; background: linear-gradient(180deg, rgba(255,255,255,0.1), transparent); pointer-events: none; }
.cl-k { position: relative; z-index: 1; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,236,180,0.85); }
.cl-v { position: relative; z-index: 1; font-size: 48px; font-weight: 900; letter-spacing: -1px; line-height: 1.05; font-variant-numeric: tabular-nums;
  background: linear-gradient(180deg, #fff6d8 2%, #ffe9a8 40%, #f5b423 74%, #b8860b 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 18px rgba(245,180,35,0.5)); }
.cl-sub { position: relative; z-index: 1; margin-top: 4px; font-size: 12px; font-weight: 800; color: rgba(222,244,228,0.7); }
.cl-addr { text-align: center; font-size: 12px; font-weight: 700; color: rgba(222,244,228,0.66); margin: 14px 0 10px; font-variant-numeric: tabular-nums; }

.cl-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; width: 100%; padding: 14px; border: none; border-radius: 14px; cursor: pointer;
  font-size: 15px; font-weight: 900; color: #05340f; background: linear-gradient(180deg, #9CFFCB, #39FF88 55%, #00A86B); box-shadow: 0 8px 22px -10px rgba(57,255,136,0.6); -webkit-tap-highlight-color: transparent; }
.cl-btn:active { transform: scale(0.98); }
.cl-btn:disabled { opacity: 0.7; cursor: default; }
.cl-btn.big { margin-top: 4px; }
.cl-btn.ghost { color: #d6ffe8; background: linear-gradient(160deg, rgba(13,58,40,0.7), rgba(7,35,24,0.8)); box-shadow: inset 0 0 0 1.5px rgba(0,168,107,0.4); text-decoration: none; margin-top: 12px; }

/* .cl-card layout only — visual base comes from shared .c7p-glass (frosted) */
.cl-card { text-align: center; padding: 26px 18px; margin-top: 6px; }
.cl-emoji { font-size: 40px; line-height: 1; margin-bottom: 10px; }
.cl-card h2 { font-size: 18px; font-weight: 900; color: #ffe9a8; margin: 0 0 8px; }
.cl-card p { font-size: 13px; line-height: 1.5; color: rgba(222,244,228,0.78); margin: 0 auto 14px; max-width: 320px; }
.cl-note { font-size: 11px; line-height: 1.45; color: rgba(222,244,228,0.55); margin-top: 12px; text-align: center; }
.cl-err { font-size: 12px; font-weight: 700; color: #ff9b9b; background: rgba(255,80,80,0.08); border: 1px solid rgba(255,120,120,0.3); border-radius: 10px; padding: 10px 12px; margin-top: 12px; word-break: break-word; }
`;

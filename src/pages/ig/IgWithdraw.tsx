/**
 * IgWithdraw — Instagram-light reskin of the player-facing crypto (USDT-TRC20)
 * withdrawal page. Same component logic as the dark WithdrawPage (all state,
 * derived values, loadAll, and the request_crypto_withdrawal submit handler are
 * copied verbatim); only the returned JSX markup and CSS are the IG-light system.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, ArrowUpFromLine, Wallet as WalletIcon, Clock, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import IgTabBar from '@/components/ig/IgTabBar';
import IgSocialNotice from "@/components/ig/IgSocialNotice";

const FEE_PCT = 0.018; // 1.8% platform fee
const MIN = 10;
const TRC20_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

interface WdRow {
  id: string;
  amount: number;
  net_amount: number | null;
  to_address: string;
  status: string;
  tx_hash: string | null;
  created_at: string;
}

export default function IgWithdraw() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean; code?: string; msg: string;
    bd?: { amount: number; baseFee: number; discount: number; fee: number; net: number };
  } | null>(null);
  const [history, setHistory] = useState<WdRow[]>([]);

  const amt = parseFloat(amount);
  const amountValid = Number.isFinite(amt) && amt >= MIN && (balance === null || amt <= balance);
  const addrValid = TRC20_RE.test(address.trim());
  const net = Number.isFinite(amt) ? Math.max(amt * (1 - FEE_PCT), 0) : 0;
  const canSubmit = amountValid && addrValid && !loading;

  const loadAll = async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return;
    const [{ data: w }, { data: h }] = await Promise.all([
      supabase.from('casino_wallets').select('balance').eq('user_id', uid).eq('currency', 'USDT').maybeSingle(),
      supabase.from('crypto_withdrawals').select('id,amount,net_amount,to_address,status,tx_hash,created_at')
        .order('created_at', { ascending: false }).limit(10),
    ]);
    setBalance(Number((w as any)?.balance ?? 0));
    setHistory((h ?? []) as WdRow[]);
  };

  useEffect(() => { loadAll(); }, []);

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.rpc('request_crypto_withdrawal', {
        p_amount: amt, p_to_address: address.trim(),
      });
      if (error) {
        const m = error.message || 'Request failed';
        let code = 'error', friendly = m;
        if (m.includes('E_KYC_REQUIRED')) { code = 'kyc'; friendly = 'Approved KYC is required before you can withdraw.'; }
        else if (m.includes('E_DEPOSIT_REQUIRED')) { code = 'deposit'; friendly = 'Make a real deposit before you can withdraw.'; }
        else if (m.includes('E_DEMO_MODE')) { friendly = 'Withdrawals are disabled in free-play (demo) mode.'; }
        else if (m.includes('INSUFFICIENT_BALANCE')) { friendly = 'Insufficient balance for this withdrawal.'; }
        else if (m.includes('E_BAD_ADDRESS')) { friendly = 'Enter a valid USDT-TRC20 (Tron) address.'; }
        else if (m.includes('E_MIN_AMOUNT')) { friendly = `Minimum withdrawal is ${MIN} USDT (1.8% platform fee applies).`; }
        else if (m.includes('E_MAX_AMOUNT')) { friendly = 'Amount exceeds the maximum withdrawal.'; }
        else if (m.includes('E_TOO_MANY_PENDING')) { friendly = 'You already have withdrawals under review. Please wait.'; }
        setResult({ ok: false, code, msg: friendly });
      } else {
        // RPC returns the authoritative fee breakdown (base_fee, energy discount,
        // final fee, net). We display exactly these — honest whether or not the
        // C7 Energy gas-coverage is switched on (discount is 0 while it's off).
        const r = data as { amount: number; base_fee: number; gas_discount: number; fee: number; net_amount: number };
        setResult({
          ok: true,
          msg: 'Withdrawal requested — sent on-chain after admin review.',
          bd: {
            amount: Number(r.amount ?? amt),
            baseFee: Number(r.base_fee ?? 0),
            discount: Number(r.gas_discount ?? 0),
            fee: Number(r.fee ?? 0),
            net: Number(r.net_amount ?? 0),
          },
        });
        setAmount(''); setAddress('');
        loadAll();
      }
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ig igwd">
      <style>{CSS}</style>
      <header className="ig-top">
        <button className="igwd-back" onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="ig-ttl">Withdraw</span>
        <span style={{ width: 22 }} />
      </header>

      <main className="ig-main igwd-main">
        <div className="ige-hero"><img src="/icons/v2/withdraw.png" alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} /></div>

        {/* Balance */}
        <div className="igwd-bal">
          <div className="igwd-bal-lbl"><WalletIcon size={15} /> Available balance</div>
          <div className="igwd-bal-val">
            {balance === null ? '—' : balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="igwd-bal-cur">USDT</span>
          </div>
        </div>

        {/* Amount + Address */}
        <div className="igwd-card igwd-form">
          <label className="igwd-sec">Amount (USDT)</label>
          <input type="number" inputMode="decimal" className="igwd-input"
            placeholder={`Min ${MIN}`} value={amount} onChange={(e) => { setAmount(e.target.value); setResult(null); }} />
          <div className="igwd-row">
            {balance !== null && balance > 0 && (
              <button className="igwd-max" onClick={() => setAmount(String(balance))}>MAX</button>
            )}
            <span className="igwd-hint">
              Platform fee 1.8% · You receive <b>{net.toFixed(2)} USDT</b>
            </span>
          </div>
          {/* Inline amount check — mirrors the server gate client-side so the user
              sees WHY the button is disabled (min / balance). No logic change. */}
          {amount.trim() !== '' && !amountValid && (
            <p className="igwd-err-hint">
              {!Number.isFinite(amt)
                ? 'Enter a valid amount.'
                : amt < MIN
                ? `Minimum withdrawal is ${MIN} USDT.`
                : (balance !== null && amt > balance)
                ? `Amount exceeds your balance (${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT).`
                : 'Enter a valid amount.'}
            </p>
          )}

          <label className="igwd-sec igwd-sec2">USDT-TRC20 address</label>
          <input className="igwd-input" placeholder="T..." value={address}
            onChange={(e) => setAddress(e.target.value)} maxLength={40} spellCheck={false} />
          {address && !addrValid && <p className="igwd-err-hint">Enter a valid Tron (TRC20) address starting with “T”.</p>}
          {/* Honest helper — routes to the crypto page's supported-network list.
              (No in-app MetaMask/WalletConnect connector exists, so we don't claim one.) */}
          <button type="button" className="igwd-wc" onClick={() => navigate('/deposit/crypto')} aria-label="View supported crypto networks">
            <span className="igwd-wc-l"><b>Using crypto?</b></span>
            <span className="igwd-wc-r">View supported networks ›</span>
          </button>
        </div>

        {result && (
          <>
            <div className={`igwd-result ${result.ok ? 'ok' : 'err'}`}>
              {result.ok ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <div style={{ flex: 1 }}>
                <div className="igwd-result-msg">{result.msg}</div>
                {result.code === 'kyc' && (
                  <button onClick={() => navigate('/kyc')} className="igwd-link">Go to verification →</button>
                )}
                {result.code === 'deposit' && (
                  <button onClick={() => navigate('/deposit')} className="igwd-link">Make a deposit →</button>
                )}
              </div>
            </div>
            {/* Transparent fee breakdown — real values from the server. C7 Energy
                covers part/all of the platform fee (no blockchain internals shown). */}
            {result.ok && result.bd && (
              <div className="igwd-bd">
                <div className="igwd-bd-row"><span>Withdraw Amount</span><b>{result.bd.amount.toFixed(2)} USDT</b></div>
                <div className="igwd-bd-row"><span>Platform Fee</span><b>{result.bd.baseFee.toFixed(2)} USDT</b></div>
                {result.bd.discount > 0 && (
                  <div className="igwd-bd-row disc"><span>C7 Energy Discount</span><b>−{result.bd.discount.toFixed(2)} USDT</b></div>
                )}
                <div className="igwd-bd-row">
                  <span>Final Fee</span>
                  <b>{result.bd.fee <= 0 ? 'FREE' : result.bd.fee.toFixed(2) + ' USDT'}</b>
                </div>
                {result.bd.fee <= 0 && result.bd.discount > 0 && (
                  <div className="igwd-bd-gasless">Gasless withdrawal — fee fully covered by C7 Energy</div>
                )}
                <div className="igwd-bd-row total"><span>You Receive</span><b>{result.bd.net.toFixed(2)} USDT</b></div>
              </div>
            )}
          </>
        )}

        {balance === null ? (
          <section aria-busy="true" aria-label="Loading withdrawals">
            <label className="igwd-label">Recent withdrawals</label>
            <div className="igwd-card">
              {[0, 1, 2].map((i) => (
                <div key={i} className="igwd-hist-row">
                  <div style={{ flex: 1 }}>
                    <div className="igwd-sk" style={{ width: '46%', height: 12, marginBottom: 6 }} />
                    <div className="igwd-sk" style={{ width: '30%', height: 9 }} />
                  </div>
                  <span className="igwd-sk" style={{ width: 62, height: 20, borderRadius: 999 }} />
                </div>
              ))}
            </div>
          </section>
        ) : history.length > 0 && (
          <section>
            <label className="igwd-label">Recent withdrawals</label>
            <div className="igwd-card">
              {history.map((h) => (
                <div key={h.id} className="igwd-hist-row">
                  <div>
                    <div className="igwd-hist-amt">{Number(h.amount).toLocaleString()} USDT</div>
                    <div className="igwd-hist-addr">
                      {h.to_address.slice(0, 6)}…{h.to_address.slice(-4)}
                    </div>
                  </div>
                  <span className={`igwd-badge ${h.status}`}>
                    {h.status === 'completed' || h.status === 'approved' ? <CheckCircle2 size={12} /> : h.status === 'rejected' ? <XCircle size={12} /> : <Clock size={12} />}
                    {h.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="igwd-cta-wrap">
          <button onClick={submit} disabled={!canSubmit} className="igwd-cta">
            {loading ? (<><Loader2 size={18} className="igwd-spin" /><span>Requesting…</span></>)
                     : (<><ArrowUpFromLine size={18} /><span>Request withdrawal</span></>)}
          </button>
          <p className="igwd-disclaimer">Sent on-chain after admin review. Approved KYC required.</p>
        </div>

        <IgSocialNotice variant="card" />
      </main>

      <IgTabBar active="wallet" />
    </div>
  );
}

const CSS = `
.ig { --bg:#07130d; --card:#103524; --card2:#12492f; --line:rgba(240,201,74,0.26); --ink:#eafff4; --mut:#93c3aa; --grn:#2ee08a; --grn2:#0e7a4a; --gold:#f0c94a; --gold3:#c68a2e; --loss:#ff6b7d;
  min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif; padding-bottom:76px;
  background: radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%), linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%); background-attachment:fixed; }
.ig * { box-sizing:border-box; }
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:52px; padding:0 12px;
  background:linear-gradient(180deg, rgba(9,32,20,0.92), rgba(9,32,20,0.62)); -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); }
.igwd-back { background:none; border:none; color:#d6ffe9; cursor:pointer; display:grid; place-items:center; }
.ig-ttl { font-size:18px; font-weight:800; color:#f3ffe9; }
.ig-main { max-width:560px; margin:0 auto; }
.igwd-main { padding:16px 12px; }

/* Balance marquee — hero card: emerald glow + gold glint + gold-gradient value */
.igwd-bal-art { position:absolute; right:6px; bottom:-6px; width:104px; height:110px; z-index:0; pointer-events:none; opacity:0.9; }
.igwd-bal-lbl, .igwd-bal-val { position:relative; z-index:1; }
.igwd-bal { position:relative; overflow:hidden; border:1px solid var(--line); border-radius:18px; padding:20px; margin-bottom:14px;
  background:radial-gradient(130% 120% at 100% 0%, rgba(46,224,138,0.16), transparent 60%), linear-gradient(160deg,#123f29,#06180f);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igwd-bal::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(105deg, transparent 40%, rgba(246,230,176,0.10) 50%, transparent 60%); }
.igwd-bal-lbl { position:relative; z-index:1; display:flex; align-items:center; gap:7px; color:var(--grn); font-size:12px; font-weight:700; letter-spacing:.4px; }
.igwd-bal-val { position:relative; z-index:1; font-size:30px; font-weight:900; letter-spacing:-.5px; margin-top:6px; font-variant-numeric:tabular-nums;
  background:linear-gradient(180deg,#fff6d5,#f0c94a 60%,#c68a2e); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.igwd-bal-cur { font-size:14px; color:var(--gold); font-weight:700; -webkit-text-fill-color:currentColor; }

.igwd-card { background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line); border-radius:16px; overflow:hidden;
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igwd-form { padding:16px; margin-bottom:14px; }
.igwd-sec { display:block; font-size:11px; letter-spacing:0.8px; text-transform:uppercase; font-weight:800; color:var(--mut); margin-bottom:8px; }
.igwd-sec2 { margin-top:18px; }
/* Emerald-glass input fields */
.igwd-input { width:100%; background:rgba(6,24,15,0.66); border:1px solid var(--line); border-radius:12px; padding:14px 16px; color:var(--ink); font-size:16px; font-weight:600; font-variant-numeric:tabular-nums; outline:none;
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.06); }
.igwd-input::placeholder { color:var(--mut); }
.igwd-input:focus { border-color:var(--grn); box-shadow:0 0 0 3px rgba(46,224,138,0.16), inset 0 1px 0 rgba(246,230,176,0.06); }
.igwd-row { display:flex; align-items:center; gap:12px; margin-top:10px; }
.igwd-max { background:rgba(9,32,20,0.6); border:1px solid var(--grn); color:var(--grn); font-size:11px; font-weight:800; padding:6px 12px; border-radius:8px; cursor:pointer; }
.igwd-max:active { transform:translateY(1px); }
.igwd-hint { font-size:11px; color:var(--mut); }
.igwd-hint b { color:var(--grn); }
.igwd-err-hint { font-size:11px; color:var(--loss); margin:6px 0 0; }
.igwd-wc { width:100%; margin-top:12px; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:12px 14px; border-radius:12px; cursor:pointer; font-family:inherit; -webkit-tap-highlight-color:transparent;
  border:1px solid var(--line); background:rgba(9,32,20,0.6); }
.igwd-wc:active { transform:scale(0.98); }
.igwd-wc-l { font-size:13px; font-weight:700; color:var(--ink); }
.igwd-wc-r { font-size:10.5px; font-weight:700; color:var(--gold); white-space:nowrap; }

.igwd-result { display:flex; align-items:flex-start; gap:10px; padding:14px; border-radius:14px; border:1px solid; margin-bottom:12px; }
.igwd-result.ok { border-color:var(--grn); background:rgba(46,224,138,0.10); color:var(--grn); }
.igwd-result.err { border-color:var(--loss); background:rgba(255,107,125,0.10); color:var(--loss); }
.igwd-result-msg { font-size:13px; font-weight:700; }
.igwd-link { margin-top:6px; font-size:12px; font-weight:800; color:var(--gold); background:none; border:none; cursor:pointer; padding:0; }

/* Fee breakdown — premium emerald panel */
.igwd-bd { margin-bottom:12px; border-radius:14px; padding:12px 14px; background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1); }
.igwd-bd-row { display:flex; align-items:center; justify-content:space-between; font-size:12.5px; padding:4px 0; color:var(--mut); }
.igwd-bd-row b { color:var(--ink); font-variant-numeric:tabular-nums; }
.igwd-bd-row.disc { color:var(--grn); } .igwd-bd-row.disc b { color:var(--grn); }
.igwd-bd-row.total { margin-top:4px; padding-top:9px; border-top:1px dashed var(--line); font-size:13.5px; font-weight:800; color:var(--ink); }
.igwd-bd-row.total b { background:linear-gradient(180deg,#fff6d5,#f0c94a 60%,#c68a2e); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; font-size:15px; }
.igwd-bd-gasless { margin:6px 0 2px; font-size:11px; font-weight:800; letter-spacing:.3px; color:#0a2410; text-align:center; padding:7px 8px; border-radius:999px;
  background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); box-shadow:inset 0 1px 0 rgba(255,255,255,0.5); }

.igwd-label { display:block; font-size:11px; color:var(--mut); letter-spacing:1.2px; text-transform:uppercase; font-weight:800; margin:20px 0 8px; }
.igwd-hist-row { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid var(--line); }
.igwd-hist-row:last-child { border-bottom:none; }
.igwd-hist-amt { font-size:13px; font-weight:700; color:#f3ffe9; }
.igwd-hist-addr { font-size:10px; color:var(--mut); font-family:monospace; margin-top:2px; }
.igwd-badge { display:inline-flex; align-items:center; gap:5px; font-size:10px; font-weight:800; text-transform:uppercase; padding:4px 9px; border-radius:999px; border:1px solid transparent; }
.igwd-badge.pending, .igwd-badge.processing { background:rgba(240,201,74,0.14); border-color:rgba(240,201,74,0.4); color:var(--gold); }
.igwd-badge.completed, .igwd-badge.approved { background:rgba(46,224,138,0.12); border-color:rgba(46,224,138,0.4); color:var(--grn); }
.igwd-badge.rejected { background:rgba(255,107,125,0.12); border-color:rgba(255,107,125,0.4); color:var(--loss); }

/* PRIMARY CTA — gold bevel */
.igwd-cta-wrap { margin:22px 0 8px; }
.igwd-cta { width:100%; display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:16px; border-radius:14px; border:none; font-size:16px; font-weight:800; font-family:inherit; cursor:pointer; color:#0a2410;
  background:linear-gradient(180deg,#fff3c8,#f0c94a 55%,#c68a2e); box-shadow:inset 0 1px 0 rgba(255,255,255,0.6), 0 6px 16px -6px rgba(240,201,74,0.6); }
.igwd-cta:active { transform:translateY(1px); }
.igwd-cta:disabled { background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); color:var(--mut); box-shadow:inset 0 1px 0 rgba(246,230,176,0.06); border:1px solid var(--line); cursor:not-allowed; }
.igwd-disclaimer { margin:8px 0 0; text-align:center; font-size:10px; color:var(--mut); }

.igwd-spin { animation:igwd-spin 1s linear infinite; }
@keyframes igwd-spin { from { transform:rotate(0); } to { transform:rotate(360deg); } }
.igwd-sk { display:block; border-radius:6px; background:linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.10), rgba(255,255,255,0.04)); background-size:200% 100%; animation:igwd-sh 1.2s linear infinite; }
@keyframes igwd-sh { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
@media (prefers-reduced-motion: reduce) { .igwd-spin, .igwd-sk { animation:none; } }

/* ══ RICH POLISH v2 — felt gold-horizon, gold chrome, gold-cabinet balance ══
   Presentation only; no hooks, RPC, balances or logic touched. Brings Withdraw
   to the same top-rich bar as Wallet / Home / Reels. */
.ig { background:
    radial-gradient(120% 58% at 50% -10%, rgba(240,201,74,0.10) 0%, transparent 46%),
    radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%),
    linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%) !important; background-attachment:fixed; }
.ig-top { box-shadow:0 1px 0 rgba(240,201,74,0.22), 0 10px 24px -16px rgba(0,0,0,0.7); }
.ig-ttl { background:linear-gradient(180deg,#fff3c8,#f0c94a 55%,#c68a2e); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; text-shadow:0 0 14px rgba(240,201,74,0.3); }
/* BALANCE → full gold-cabinet frame + animated sheen sweep + shimmering value */
.igwd-bal { border-color:transparent !important;
  background:
    radial-gradient(120% 120% at 100% 0%, rgba(240,201,74,0.16), transparent 52%),
    radial-gradient(120% 100% at 0% 0%, rgba(58,240,160,0.18), transparent 58%),
    linear-gradient(160deg, rgba(21,78,50,0.96), rgba(6,24,15,0.96)) !important;
  box-shadow:
    inset 0 0 0 1.4px rgba(240,201,74,0.55),
    inset 0 1.6px 0 rgba(255,255,255,0.3),
    inset 0 0 26px rgba(46,224,138,0.14),
    0 0 24px -8px rgba(240,201,74,0.5),
    0 20px 44px -22px rgba(0,0,0,0.86) !important; }
.igwd-bal::after { animation:igwdSweep 5.5s ease-in-out infinite; }
@keyframes igwdSweep { 0%,72% { transform:translateX(-120%); } 88%,100% { transform:translateX(120%); } }
.igwd-bal-val { background-image:linear-gradient(100deg,#fff8e0 0%,#ffe9a8 22%,#f7d868 42%,#e0a93a 58%,#ffe9a8 80%,#fff8e0 100%);
  background-size:220% 100%; animation:igwdGold 5.5s ease-in-out infinite; }
@keyframes igwdGold { 0%,100% { background-position:0% 0; } 50% { background-position:100% 0; } }
/* PRIMARY CTA → gloss + gold halo */
.igwd-cta:not(:disabled) { box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.62), inset 0 -3px 7px rgba(0,0,0,0.2), 0 0 18px -3px rgba(240,201,74,0.62), 0 9px 20px -9px rgba(0,0,0,0.6); }
@media (prefers-reduced-motion: reduce) { .igwd-bal::after, .igwd-bal-val { animation:none; } }
`;

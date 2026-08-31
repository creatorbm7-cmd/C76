/**
 * WithdrawPage — player-facing crypto (USDT-TRC20) withdrawal.
 *
 * Calls request_crypto_withdrawal(amount, to_address), which atomically debits
 * the wallet (via apply_ledger_entry, demo-gated) and queues a 'pending'
 * crypto_withdrawals row. An admin approves it in the Withdrawals queue, which
 * broadcasts the payout on-chain. Approved-KYC is required (AML); the screen
 * surfaces E_KYC_REQUIRED with a link to verification.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, ArrowUpFromLine, Wallet as WalletIcon, Clock, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import HdrScreen from '@/components/casino/HdrScreen';
import LuxFrameFX from '@/components/c7/shell/LuxFrameFX';
import C7Icon from '@/components/c7/C7Icon';

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

export default function WithdrawPage() {
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
    <HdrScreen pad={140}>
      <Styles />
      <header className="c7-lux-head wd-head">
        <LuxFrameFX />
        <button onClick={() => navigate(-1)} aria-label="Back" className="wd-back"><ArrowLeft size={18} /></button>
        <h1 className="c7p-gold-text wd-title">Withdraw</h1>
        <div style={{ width: 36 }} />
        <span className="wd-head-glim" aria-hidden="true" />
      </header>

      {/* Balance */}
      <section style={{ padding: '16px 16px 0' }}>
        <div className="wd-balance">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
            <WalletIcon size={15} /> Available balance
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
            {balance === null ? '—' : balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span style={{ fontSize: 14, color: '#6bf5a3' }}>USDT</span>
          </div>
        </div>
      </section>

      {/* Amount + Address — grouped in one emerald-glass card */}
      <section style={{ padding: '16px 16px 0' }}>
        <div className="c7p-panel wd-panel">
          <div className="c7p-sec wd-sec"><span className="c7p-sec-ic"><C7Icon name="coin" size={16} /></span><span className="c7p-sec-t">Amount (USDT)</span><span className="c7p-sec-rule" /></div>
          <input type="number" inputMode="decimal" className="wd-input"
            placeholder={`Min ${MIN}`} value={amount} onChange={(e) => { setAmount(e.target.value); setResult(null); }} />
          <div className="wd-row">
            {balance !== null && balance > 0 && (
              <button className="wd-max" onClick={() => setAmount(String(balance))}>MAX</button>
            )}
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              Platform fee 1.8% · You receive <b style={{ color: '#6bf5a3' }}>{net.toFixed(2)} USDT</b>
            </span>
          </div>

          <div className="c7p-sec wd-sec wd-sec2"><span className="c7p-sec-ic">📥</span><span className="c7p-sec-t">USDT-TRC20 address</span><span className="c7p-sec-rule" /></div>
          <input className="wd-input" placeholder="T..." value={address}
            onChange={(e) => setAddress(e.target.value)} maxLength={40} spellCheck={false} />
          {address && !addrValid && <p className="wd-err-hint">Enter a valid Tron (TRC20) address starting with “T”.</p>}
          {/* Honest helper — routes to the crypto page's supported-network list.
              (No in-app MetaMask/WalletConnect connector exists, so we don't claim one.) */}
          <button type="button" className="wd-wc" onClick={() => navigate('/deposit/crypto')} aria-label="View supported crypto networks">
            <span className="wd-wc-l"><C7Icon name="link" size={14} /> <b>Using crypto?</b></span>
            <span className="wd-wc-r">View supported networks ›</span>
          </button>
        </div>
      </section>

      {result && (
        <section style={{ padding: '16px 16px 0' }}>
          <div className={`wd-result ${result.ok ? 'ok' : 'err'}`}>
            {result.ok ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{result.msg}</div>
              {result.code === 'kyc' && (
                <button onClick={() => navigate('/kyc')} className="wd-kyc-link">Go to verification →</button>
              )}
              {result.code === 'deposit' && (
                <button onClick={() => navigate('/deposit')} className="wd-kyc-link">Make a deposit →</button>
              )}
            </div>
          </div>
          {/* Transparent fee breakdown — real values from the server. C7 Energy
              covers part/all of the platform fee (no blockchain internals shown). */}
          {result.ok && result.bd && (
            <div className="wd-bd">
              <div className="wd-bd-row"><span>Withdraw Amount</span><b>{result.bd.amount.toFixed(2)} USDT</b></div>
              <div className="wd-bd-row"><span>Platform Fee</span><b>{result.bd.baseFee.toFixed(2)} USDT</b></div>
              {result.bd.discount > 0 && (
                <div className="wd-bd-row disc"><span><C7Icon name="gas" size={13} /> C7 Energy Discount</span><b>−{result.bd.discount.toFixed(2)} USDT</b></div>
              )}
              <div className="wd-bd-row">
                <span>Final Fee</span>
                <b>{result.bd.fee <= 0 ? 'FREE' : result.bd.fee.toFixed(2) + ' USDT'}</b>
              </div>
              {result.bd.fee <= 0 && result.bd.discount > 0 && (
                <div className="wd-bd-gasless"><C7Icon name="gas" size={12} /> Gasless withdrawal — fee fully covered by C7 Energy</div>
              )}
              <div className="wd-bd-row total"><span>You Receive</span><b>{result.bd.net.toFixed(2)} USDT</b></div>
            </div>
          )}
        </section>
      )}

      {balance === null ? (
        <section style={{ padding: '24px 16px 0' }} aria-busy="true" aria-label="Loading withdrawals">
          <label className="wd-label">Recent withdrawals</label>
          <div className="wd-card">
            {[0, 1, 2].map((i) => (
              <div key={i} className="wd-hist-row">
                <div style={{ flex: 1 }}>
                  <div className="c7p-skel c7p-skel--line" style={{ width: '46%', marginBottom: 6 }} />
                  <div className="c7p-skel c7p-skel--line" style={{ width: '30%', height: 9 }} />
                </div>
                <span className="c7p-skel c7p-skel--line" style={{ width: 62, height: 20, borderRadius: 999 }} />
              </div>
            ))}
          </div>
        </section>
      ) : history.length > 0 && (
        <section style={{ padding: '24px 16px 0' }}>
          <label className="wd-label">Recent withdrawals</label>
          <div className="wd-card">
            {history.map((h) => (
              <div key={h.id} className="wd-hist-row">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{Number(h.amount).toLocaleString()} USDT</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                    {h.to_address.slice(0, 6)}…{h.to_address.slice(-4)}
                  </div>
                </div>
                <span className={`wd-badge ${h.status}`}>
                  {h.status === 'completed' || h.status === 'approved' ? <CheckCircle2 size={12} /> : h.status === 'rejected' ? <XCircle size={12} /> : <Clock size={12} />}
                  {h.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="wd-cta-wrap">
        <button onClick={submit} disabled={!canSubmit} className="c7p-btn-green wd-cta">
          {loading ? (<><Loader2 size={18} className="wd-spin" /><span>Requesting…</span></>)
                   : (<><ArrowUpFromLine size={18} /><span>Request withdrawal</span></>)}
        </button>
        <p className="wd-disclaimer">Sent on-chain after admin review. Approved KYC required.</p>
      </div>
    </HdrScreen>
  );
}

function Styles() {
  return (
    <style>{`
      @keyframes wd-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      /* Rich premium top — glimmer hairline + gold-emerald gradient title */
      .wd-head-glim { position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; pointer-events: none;
        background: linear-gradient(90deg, transparent, rgba(46,230,130,0.85), rgba(255,214,120,0.95), rgba(46,230,130,0.85), transparent);
        background-size: 220% 100%; animation: wd-topglimmer 5.5s linear infinite; opacity: 0.9; }
      @keyframes wd-topglimmer { 0% { background-position: 220% 0; } 100% { background-position: -220% 0; } }
      /* Header (moved out of inline styles) — title gold via .c7p-gold-text */
      .wd-head { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 12px; padding: 14px 16px;
        background: linear-gradient(180deg, rgba(3,13,7,0.92), rgba(3,13,7,0.55)); backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(120,240,176,0.28); }
      .wd-back { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.06); border: 1px solid rgba(120,240,176,0.35); color: #d6ffe9;
        cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
      .wd-title { font-size: 18px; font-weight: 800; margin: 0; flex: 1; text-align: center; }
      @media (prefers-reduced-motion: reduce) { .wd-head-glim { animation: none; } }
      .wd-spin { animation: wd-spin 1s linear infinite; }
      /* Amount + Address grouped card */
      .wd-panel { padding: 14px 14px 16px; }
      .wd-sec { margin: 2px 0 10px; }
      .wd-sec2 { margin-top: 16px; }
      .wd-balance { position: relative; overflow: hidden; background: radial-gradient(120% 90% at 50% -18%, rgba(246,201,69,0.22), transparent 54%), radial-gradient(95% 78% at 50% 118%, rgba(46,158,31,0.32), transparent 66%), linear-gradient(160deg, #0f4429, #06210f 60%, #02100a); border: 1.5px solid rgba(120,240,176,0.55); border-radius: 24px; padding: 18px; box-shadow: inset 0 2px 0 rgba(255,255,255,0.28), inset 0 -18px 40px rgba(0,0,0,0.34), 0 18px 40px -14px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(245,180,35,0.16), 0 0 26px -10px rgba(245,180,35,0.32); }
      .wd-card { background: radial-gradient(130% 60% at 100% 0%, rgba(53,217,138,0.12), transparent 55%), linear-gradient(160deg, #0f7a4e, #05301e); border: 1px solid rgba(53,217,138,0.28); border-radius: 18px; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(245,180,35,0.12), inset 0 1px 0 rgba(255,247,220,0.12), 0 12px 26px -12px rgba(0,0,0,0.62); }
      .wd-label { display: block; font-size: 11px; color: #b9f6d0; letter-spacing: 1.2px; text-transform: uppercase; font-weight: 800; margin-bottom: 8px; }
      .wd-input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(120,240,176,0.22); border-radius: 16px; padding: 14px 16px; color: #fff; font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; outline: none; }
      .wd-input:focus { border-color: #35d98a; box-shadow: 0 0 0 3px rgba(46,230,130,0.20); }
      .wd-row { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
      .wd-max { background: rgba(46,230,130,0.14); border: 1px solid rgba(120,240,176,0.4); color: #9df5c4; font-size: 11px; font-weight: 800; padding: 6px 12px; border-radius: 8px; cursor: pointer; }
      .wd-err-hint { font-size: 11px; color: #ff8089; margin: 6px 0 0; }
      .wd-wc { width: 100%; margin-top: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px; border-radius: 14px; cursor: pointer; font-family: inherit; -webkit-tap-highlight-color: transparent;
        border: 1px solid rgba(120,240,176,0.5); background: linear-gradient(160deg, rgba(0,168,107,0.28), rgba(0,77,51,0.42)); box-shadow: inset 0 1px 0 rgba(200,246,220,0.14), 0 0 16px -8px rgba(0,168,107,0.6); transition: transform .1s ease; }
      .wd-wc:active { transform: scale(0.98); }
      .wd-wc-l { font-size: 13px; font-weight: 800; color: #d6ffe8; } .wd-wc-l b { color: #fff; }
      .wd-wc-r { font-size: 10.5px; font-weight: 700; color: rgba(196,240,214,0.82); white-space: nowrap; }
      .wd-result { display: flex; align-items: flex-start; gap: 10px; padding: 14px; border-radius: 12px; border: 1px solid; }
      .wd-result.ok { border-color: rgba(46,230,130,0.55); background: rgba(46,230,130,0.12); color: #9df5c4; box-shadow: inset 0 0 0 1px rgba(245,180,35,0.14), inset 0 1px 0 rgba(255,247,220,0.14), 0 0 26px -8px rgba(46,230,130,0.5); }
      .wd-result.err { border-color: rgba(224,43,60,0.55); background: rgba(224,43,60,0.10); color: #ff8089; }
      .wd-kyc-link { margin-top: 6px; font-size: 12px; font-weight: 700; color: #ff8089; background: none; border: none; cursor: pointer; padding: 0; }
      /* Transparent fee breakdown */
      .wd-bd { margin-top: 10px; border-radius: 14px; padding: 12px 14px; background: linear-gradient(160deg, rgba(18,73,43,0.5), rgba(6,31,17,0.6)); border: 1px solid rgba(120,240,176,0.28); box-shadow: inset 0 0 0 1px rgba(245,180,35,0.12), inset 0 1px 0 rgba(255,247,220,0.12), 0 8px 20px -10px rgba(0,0,0,0.5); }
      .wd-bd-row { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; padding: 4px 0; color: rgba(255,255,255,0.72); }
      .wd-bd-row b { color: #fff; font-variant-numeric: tabular-nums; }
      .wd-bd-row.disc { color: #6bf5a3; } .wd-bd-row.disc b { color: #6bf5a3; }
      .wd-bd-row.total { margin-top: 4px; padding-top: 9px; border-top: 1px dashed rgba(120,240,176,0.3); font-size: 13.5px; font-weight: 800; color: #d6ffe9; }
      .wd-bd-row.total b { color: #9df5c4; font-size: 15px; }
      .wd-bd-gasless { margin: 6px 0 2px; font-size: 11px; font-weight: 800; letter-spacing: .3px; color: #06301c; text-align: center; padding: 5px 8px; border-radius: 999px;
        background: linear-gradient(180deg, #8bffc4, #35d98a); box-shadow: 0 0 12px -3px rgba(46,230,130,0.8); }
      .wd-hist-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); }
      .wd-hist-row:last-child { border-bottom: none; }
      .wd-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 4px 9px; border-radius: 999px; }
      .wd-badge.pending, .wd-badge.processing { background: rgba(246,201,69,0.15); color: #ffe9a8; }
      .wd-badge.completed, .wd-badge.approved { background: rgba(16,185,129,0.18); color: #6ee7b7; }
      .wd-badge.rejected { background: rgba(244,63,94,0.15); color: #fb7185; }
      .wd-cta-wrap { margin: 22px 16px 8px; }
      /* CTA — glossy green comes from c7p-btn-green; this only sizes it full-width */
      .wd-cta { width: 100%; padding: 16px; border-radius: 18px; font-size: 16px; }
      .wd-disclaimer { margin: 8px 0 0; text-align: center; font-size: 10px; color: rgba(255,255,255,0.45); }
    `}</style>
  );
}

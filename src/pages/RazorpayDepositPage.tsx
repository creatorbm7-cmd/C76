/**
 * RazorpayDepositPage — player-facing Razorpay (INR) deposit.
 *
 * Flow: player enters an INR amount → we call `create-razorpay-order` (which
 * records a pending deposit_requests row and creates a Razorpay order) → we open
 * Razorpay Checkout with the returned order + publishable key. The wallet is
 * credited server-side by `razorpay-webhook` after Razorpay confirms capture;
 * this page then polls the deposit row until it flips to `credited` and shows
 * success. No amount or credit is ever trusted from the browser.
 *
 * The gateway must be enabled in Admin → Payment Gateways, and the server must
 * hold RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, IndianRupee, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import HdrScreen from '@/components/casino/HdrScreen';

const AMOUNT_TILES = [500, 1000, 2000, 5000, 10000, 25000] as const;
const MIN = 100;
const MAX = 200000;
const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const existing = document.querySelector(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) { existing.addEventListener('load', () => resolve(true)); existing.addEventListener('error', () => resolve(false)); return; }
    const s = document.createElement('script');
    s.src = CHECKOUT_SRC;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function RazorpayDepositPage() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [rate, setRate] = useState<number>(90);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const amt = parseInt(amount, 10);
  const amountValid = Number.isFinite(amt) && amt >= MIN && amt <= MAX;
  const usdtEstimate = useMemo(() => (amountValid && rate > 0 ? Math.round((amt / rate) * 100) / 100 : 0), [amountValid, amt, rate]);
  const canSubmit = amountValid && !loading && enabled === true;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('site_config').select('value').eq('key', 'payment_gateways').maybeSingle();
      const gw = (data?.value as any)?.gateways?.razorpay ?? null;
      setEnabled(!!gw?.enabled);
      if (Number(gw?.rate) > 0) setRate(Number(gw.rate));
    })();
  }, []);

  const pollCredit = async (depositId: string): Promise<boolean> => {
    // Poll up to ~60s for the webhook to credit the deposit.
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const { data } = await supabase.from('deposit_requests').select('status').eq('id', depositId).maybeSingle();
      if ((data as any)?.status === 'credited') return true;
    }
    return false;
  };

  const pay = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setResult(null);
    try {
      const [{ data: order, error }, ok] = await Promise.all([
        supabase.functions.invoke('create-razorpay-order', { body: { amount_inr: amt } }),
        loadCheckout(),
      ]);
      if (error) { setResult({ ok: false, msg: error.message || 'Could not start payment' }); setLoading(false); return; }
      if ((order as any)?.error) { setResult({ ok: false, msg: (order as any).error }); setLoading(false); return; }
      if (!ok || !(window as any).Razorpay) { setResult({ ok: false, msg: 'Could not load Razorpay Checkout. Check your connection.' }); setLoading(false); return; }

      const o = order as any;
      const rzp = new (window as any).Razorpay({
        key: o.key_id,
        order_id: o.order_id,
        amount: o.amount_paise,
        currency: o.currency,
        name: o.name || 'C7 Winners',
        description: o.description,
        prefill: o.prefill_email ? { email: o.prefill_email } : undefined,
        theme: { color: '#1ec46a' },
        handler: async () => {
          setResult({ ok: true, msg: 'Payment received — crediting your wallet…' });
          const credited = await pollCredit(o.deposit_id);
          if (credited) {
            setResult({ ok: true, msg: `Credited ${o.usdt} USDT to your wallet.` });
            setTimeout(() => navigate('/v3/wallet'), 1400);
          } else {
            setResult({ ok: true, msg: 'Payment received. It will be credited shortly — check your wallet in a minute.' });
          }
          setLoading(false);
        },
        modal: { ondismiss: () => { setLoading(false); } },
      });
      rzp.on('payment.failed', (resp: any) => {
        setResult({ ok: false, msg: resp?.error?.description || 'Payment failed. Please try again.' });
        setLoading(false);
      });
      rzp.open();
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : 'Unknown error' });
      setLoading(false);
    }
  };

  return (
    <HdrScreen pad={140}>
      <Styles />
      <header className="rzp-head">
        <button onClick={() => navigate(-1)} aria-label="Back" className="rzp-back"><ArrowLeft size={18} /></button>
        <h1 className="rzp-head-title c7p-gold-text">Razorpay Deposit</h1>
        <div style={{ width: 36 }} />
      </header>

      {/* Other deposit methods */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0' }}>
        <button onClick={() => navigate('/deposit')} className="rzp-sec">← All deposit methods</button>
      </div>

      {enabled === null ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}><Loader2 size={22} className="rzp-spin" /></div>
      ) : !enabled ? (
        <div className="c7p-card-gold rzp-empty">
          <span className="rzp-empty-ic"><AlertCircle size={26} /></span>
          <p className="rzp-empty-title">Razorpay not available yet</p>
          <p className="rzp-empty-sub">The operator hasn’t enabled Razorpay. Please use another deposit method.</p>
          <button onClick={() => navigate('/deposit')} className="c7p-btn-gold rzp-empty-cta">Other deposit methods ›</button>
        </div>
      ) : (
        <>
          <section style={{ padding: '16px 16px 0' }}>
            <div className="c7p-panel rzp-panel">
              <div className="c7p-sec rzp-sec"><span className="c7p-sec-ic">₹</span><span className="c7p-sec-t">Amount (INR)</span><span className="c7p-sec-rule" /></div>
              <div style={{ position: 'relative' }}>
                <IndianRupee size={16} style={{ position: 'absolute', left: 14, top: 16, color: 'rgba(255,255,255,0.5)' }} />
                <input type="number" inputMode="numeric" className="rzp-input" style={{ paddingLeft: 38 }}
                  placeholder={`${MIN.toLocaleString()} – ${MAX.toLocaleString()}`}
                  value={amount} onChange={(e) => { setAmount(e.target.value); setResult(null); }} min={MIN} max={MAX} />
              </div>
              <div className="rzp-tiles">
                {AMOUNT_TILES.map((a) => (
                  <button key={a} className="rzp-tile" data-active={amt === a} onClick={() => { setAmount(String(a)); setResult(null); }}>
                    ₹{a.toLocaleString()}
                  </button>
                ))}
              </div>
              {amountValid && (
                <p className="rzp-estimate">≈ {usdtEstimate} USDT will be credited to your wallet</p>
              )}
            </div>
          </section>

          {result && (
            <section style={{ padding: '16px 16px 0' }}>
              <div className={`rzp-result ${result.ok ? 'ok' : 'err'}`}>
                {result.ok ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                <span style={{ fontSize: 13, fontWeight: 700 }}>{result.msg}</span>
              </div>
            </section>
          )}

          <div className="rzp-cta-wrap">
            <button onClick={pay} disabled={!canSubmit} className="c7p-btn-gold rzp-cta">
              {loading ? (<><Loader2 size={18} className="rzp-spin" /><span>Please wait…</span></>)
                       : (<><IndianRupee size={18} /><span>Pay with Razorpay</span></>)}
            </button>
            <p className="rzp-disclaimer"><ShieldCheck size={11} style={{ verticalAlign: -1 }} /> Secure checkout. Funds are credited automatically after payment confirmation.</p>
          </div>
        </>
      )}
    </HdrScreen>
  );
}

function Styles() {
  return (
    <style>{`
      @keyframes rzp-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      .rzp-spin { animation: rzp-spin 1s linear infinite; }
      /* Gilt gold header */
      .rzp-head { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 12px; padding: 14px 16px;
        background: linear-gradient(180deg, rgba(6,20,12,0.94), rgba(6,20,12,0.62)); backdrop-filter: blur(18px);
        border-bottom: 1px solid rgba(255,214,120,0.22); box-shadow: 0 1px 0 rgba(255,214,120,0.1); }
      .rzp-head::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255,200,61,0.55) 30%, rgba(46,224,138,0.4) 70%, transparent); }
      .rzp-back { width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255,214,120,0.28); color: #ffe9a8; cursor: pointer;
        background: rgba(0,0,0,0.3); display: inline-flex; align-items: center; justify-content: center; }
      .rzp-head-title { font-size: 18px; font-weight: 900; letter-spacing: 0.4px; margin: 0; flex: 1; text-align: center; }
      .rzp-sec { flex: 1; padding: 9px 10px; border-radius: 12px; cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 800;
        background: rgba(0,0,0,0.3); border: 1px solid rgba(255,214,120,0.2); color: rgba(255,255,255,0.7); }
      /* Gilt green-glass cards / inputs */
      .rzp-card { position: relative; border-radius: 18px; padding: 18px; border: 1px solid rgba(255,214,120,0.28);
        background: linear-gradient(180deg, #0e2c1c, #0b2417);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 0 22px -6px rgba(255,200,61,0.25), 0 12px 26px -10px rgba(0,0,0,0.7); }
      .rzp-label { display: block; font-size: 10px; color: #8fb0a0; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 800; margin-bottom: 8px; }
      .rzp-input { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,214,120,0.24); border-radius: 14px; padding: 14px 16px; color: #fff; font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; outline: none; transition: border-color .16s, box-shadow .16s; }
      .rzp-input:focus { border-color: rgba(46,224,138,0.7); box-shadow: 0 0 0 3px rgba(46,224,138,0.14); }
      .rzp-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
      .rzp-tile { background: rgba(0,0,0,0.28); border: 1px solid rgba(255,214,120,0.2); border-radius: 14px; padding: 13px 4px; color: rgba(255,255,255,0.85); font-size: 13px; font-weight: 800; cursor: pointer; box-shadow: 0 3px 0 rgba(0,0,0,0.35); transition: transform .12s ease, box-shadow .12s ease; }
      .rzp-tile:active { transform: translateY(3px); box-shadow: 0 0 0 rgba(0,0,0,0.28); }
      .rzp-tile[data-active="true"] { color: #3a2600; border-color: rgba(255,231,160,0.7);
        background: radial-gradient(120% 100% at 50% 12%, rgba(255,255,255,0.7), transparent 52%), linear-gradient(180deg,#fff3c4,#ffd24d 45%,#e0a514);
        box-shadow: 0 4px 0 #a9760a, inset 0 1.5px 0 rgba(255,255,255,0.7); transform: translateY(-1px); }
      .rzp-result { display: flex; align-items: center; gap: 10px; padding: 14px; border-radius: 12px; border: 1px solid; }
      .rzp-result.ok { border-color: rgba(46,224,138,0.5); background: rgba(46,224,138,0.1); color: #6bf5a3; }
      .rzp-result.err { border-color: rgba(255,77,109,0.5); background: rgba(255,77,109,0.1); color: #ff8fb0; }
      /* Amount card — shared c7p-panel wrapper + section header */
      .rzp-panel { padding: 14px 14px 16px; }
      .rzp-sec { margin: 2px 0 12px; }
      .rzp-estimate { font-size: 12px; color: #6bf5a3; margin-top: 10px; font-weight: 700; }
      /* Not-available empty state (c7p-card-gold) */
      .rzp-empty { margin: 16px; padding: 24px 18px; text-align: center; }
      .rzp-empty-ic { display: inline-flex; width: 46px; height: 46px; border-radius: 50%; align-items: center; justify-content: center; color: #6bf5a3; background: rgba(46,224,138,0.14); border: 1px solid rgba(46,224,138,0.35); margin-bottom: 10px; }
      .rzp-empty-title { font-size: 15px; font-weight: 900; color: #fff; margin: 0 0 4px; }
      .rzp-empty-sub { font-size: 12px; color: rgba(255,255,255,0.6); margin: 0; line-height: 1.4; }
      .rzp-empty-cta { margin-top: 16px; }
      .rzp-cta-wrap { margin: 22px 16px 8px; }
      /* CTA — glossy gold comes from c7p-btn-gold; this only sizes it full-width */
      .rzp-cta { width: 100%; padding: 16px; border-radius: 16px; font-size: 16px; }
      .rzp-disclaimer { margin: 8px 0 0; text-align: center; font-size: 10px; color: rgba(255,255,255,0.45); }
    `}</style>
  );
}

/**
 * DemoDepositPage — Yono-style deposit UI for free-play coin grants.
 *
 * Visual register inspired by Yono Arcade's deposit flow (amount tile
 * grid, payment-method selector, voucher banner), wired to C7's
 * free-play coin grant edge function (grant-demo-credit).
 *
 * KEY DIFFERENCE FROM A REAL DEPOSIT FLOW:
 *   No real money moves. The amount you "deposit" is credited as
 *   free-play coins (🪙) to your wallet. A persistent "Demo Mode"
 *   badge sits at the top of the page so no user could mistake this
 *   for a real-money transaction.
 *
 * Constraints (enforced by the edge function, mirrored in UI):
 *   - Per-call min: 10 coins, max: 5,000 coins
 *   - Daily total cap: 50,000 coins
 *   - Daily call cap: 20 deposits per day
 *
 * When real-money is launched (after licensing + KYC + payment rails),
 * the UI keeps its shape — the edge function endpoint gets swapped to
 * the licensed deposit handler, the demo badge comes off, and amount
 * tiles get repriced.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Coins, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformMode } from '@/hooks/usePlatformMode';
import HdrScreen from '@/components/casino/HdrScreen';

const AMOUNT_TILES = [10, 30, 50, 80, 100, 200, 300, 500, 800, 1000, 1500, 2000, 3000, 5000] as const;

type GrantResult =
  | { ok: true; amount_granted: number; new_balance: number; daily_remaining: number; daily_grants_remaining: number }
  | { ok: false; error: string; message?: string };

export default function DemoDepositPage() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number | null>(null);
  const [selected, setSelected] = useState<number>(100);
  const [custom, setCustom] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GrantResult | null>(null);
  const mode = usePlatformMode();

  // In live mode the demo faucet is disabled — send users to the real deposit flow.
  useEffect(() => {
    if (mode === 'live') navigate('/deposit', { replace: true });
  }, [mode, navigate]);

  // Load current balance on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('casino_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .eq('currency', 'USDT')
        .maybeSingle();
      if (data) setBalance(Number(data.balance));
    })();
  }, [result]);

  const finalAmount = (() => {
    if (custom) {
      const n = parseInt(custom, 10);
      if (Number.isFinite(n)) return n;
    }
    return selected;
  })();

  const amountValid = finalAmount >= 10 && finalAmount <= 5000;

  const submit = async () => {
    if (!amountValid || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('grant-demo-credit', {
        body: { amount: finalAmount },
      });
      if (error) {
        setResult({ ok: false, error: 'network', message: error.message });
      } else {
        setResult(data as GrantResult);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setResult({ ok: false, error: 'exception', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <HdrScreen pad={100}>
      <DemoStyles />

      {/* Header — gilt gold */}
      <header className="demo-head">
        <button onClick={() => navigate(-1)} aria-label="Back" className="demo-back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="demo-head-title c7p-gold-text">Deposit</h1>
        <div style={{ width: 36 }} />
      </header>

      {/* DEMO MODE BADGE — non-negotiable, persistent, can't miss it */}
      <div className="demo-badge-row">
        <div className="demo-badge">
          <Sparkles size={14} />
          <span>DEMO MODE</span>
        </div>
        <p className="demo-badge-note">
          Free-play coins only · No real money · No payment processing
        </p>
      </div>

      {/* Current balance — gold hero */}
      <section style={{ padding: '8px 16px 16px' }}>
        <div className="c7p-card-gold demo-bal-hero">
          <div className="c7p-sec demo-sec"><span className="c7p-sec-ic">🪙</span><span className="c7p-sec-t">Current Balance</span><span className="c7p-sec-rule" /></div>
          <div className="demo-bal-v">
            {balance == null ? '—' : balance.toLocaleString()} <Coins size={26} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
          </div>
        </div>
      </section>

      {/* Custom amount input */}
      <section style={{ padding: '0 16px' }}>
        <div className="demo-input-row">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Enter amount (10 – 5,000)"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              setResult(null);
            }}
            min={10}
            max={5000}
            className="demo-amount-input"
          />
          {custom && (
            <button
              onClick={() => setCustom('')}
              className="demo-input-clear"
              aria-label="Clear"
            >
              ×
            </button>
          )}
        </div>
      </section>

      {/* Amount tiles — Yono-style 4-column grid */}
      <section style={{ padding: '16px' }}>
        <div className="demo-tile-grid">
          {AMOUNT_TILES.map((amt) => {
            const active = !custom && selected === amt;
            return (
              <button
                key={amt}
                onClick={() => {
                  setSelected(amt);
                  setCustom('');
                  setResult(null);
                }}
                className="demo-tile"
                data-active={active}
              >
                {amt.toLocaleString()}
              </button>
            );
          })}
        </div>
      </section>

      {/* Payment method (cosmetic — demo only) */}
      <section style={{ padding: '0 16px 16px' }}>
        <div className="c7p-sec demo-sec"><span className="c7p-sec-ic">💳</span><span className="c7p-sec-t">Method</span><span className="c7p-sec-rule" /></div>
        <div className="demo-method-row">
          <div className="demo-method demo-method--active">
            <Coins size={18} />
            <div>
              <div className="demo-method-name">Demo Credit</div>
              <div className="demo-method-note">Instant · Free-play coins</div>
            </div>
          </div>
          <div className="demo-method demo-method--disabled" title="Available after Phase 2 licensing">
            <span style={{ fontSize: 20, opacity: 0.4 }}>💳</span>
            <div>
              <div className="demo-method-name">Card / UPI / Crypto</div>
              <div className="demo-method-note">Locked · Phase 2 only</div>
            </div>
          </div>
        </div>
      </section>

      {/* Result / error pane */}
      {result && (
        <section style={{ padding: '0 16px 16px' }}>
          {result.ok ? (
            <div className="demo-result demo-result--ok">
              <CheckCircle2 size={20} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                  +{result.amount_granted.toLocaleString()} 🪙 credited
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                  New balance: {result.new_balance.toLocaleString()} 🪙
                  {' · '}{result.daily_grants_remaining} more demo deposits today
                </div>
              </div>
            </div>
          ) : (
            <div className="demo-result demo-result--err">
              <AlertCircle size={20} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {result.message ?? 'Demo deposit failed'}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                  Error code: {result.error}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* CTA — sticky bottom */}
      <div className="demo-cta-wrap">
        <button
          onClick={submit}
          disabled={!amountValid || loading}
          className="c7p-btn-gold demo-cta"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="demo-spin" />
              <span>Processing…</span>
            </>
          ) : (
            <>
              <span>Credit {finalAmount.toLocaleString()} 🪙</span>
            </>
          )}
        </button>
        <p className="demo-cta-disclaimer">
          By tapping, you grant yourself free-play coins. No real money is involved.
        </p>
      </div>
    </HdrScreen>
  );
}

function DemoStyles() {
  return (
    <style>{`
      @keyframes demo-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      .demo-spin { animation: demo-spin 1s linear infinite; }

      /* Gilt gold header */
      .demo-head { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 12px; padding: 14px 16px;
        background: linear-gradient(180deg, rgba(6,20,12,0.94), rgba(6,20,12,0.62)); backdrop-filter: blur(18px);
        border-bottom: 1px solid rgba(255,214,120,0.22); box-shadow: 0 1px 0 rgba(255,214,120,0.1); }
      .demo-head::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255,200,61,0.55) 30%, rgba(46,224,138,0.4) 70%, transparent); }
      .demo-back { width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255,214,120,0.28); color: #ffe9a8; cursor: pointer;
        background: rgba(0,0,0,0.3); display: inline-flex; align-items: center; justify-content: center; }
      .demo-head-title { font-size: 18px; font-weight: 900; letter-spacing: 0.4px; margin: 0; flex: 1; text-align: center; }

      /* Balance hero (c7p-card-gold) + section headers (moved from inline styles) */
      .demo-bal-hero { padding: 14px 16px 18px; }
      .demo-sec { margin: 2px 0 10px; }
      .demo-bal-v { text-align: center; font-size: 36px; font-weight: 900; font-variant-numeric: tabular-nums; letter-spacing: -0.8px; color: #fff; }

      .demo-badge-row {
        padding: 14px 16px 0;
        text-align: center;
      }
      .demo-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: 999px;
        background: linear-gradient(135deg, #1ec46a, #0b7a3f);
        color: #fff;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 1.6px;
        box-shadow: 0 4px 16px rgba(30, 196, 106, 0.45);
      }
      .demo-badge-note {
        margin: 8px 0 0;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.55);
        letter-spacing: 0.4px;
      }

      .demo-input-row {
        position: relative;
      }
      .demo-amount-input {
        width: 100%;
        background: radial-gradient(120% 90% at 50% -20%, rgba(120,240,176,0.10), transparent 50%), linear-gradient(160deg, rgba(12,74,48,0.7), rgba(4,26,16,0.82));
        border: 1px solid rgba(255,214,120,0.3);
        border-radius: 14px;
        padding: 14px 40px 14px 16px;
        color: #fff;
        font-size: 18px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        outline: none;
        transition: border-color .16s, box-shadow .16s;
      }
      .demo-amount-input:focus {
        border-color: rgba(46,224,138,0.7);
        box-shadow: 0 0 0 3px rgba(46, 224, 138, 0.14);
      }
      .demo-input-clear {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        width: 24px;
        height: 24px;
        border-radius: 12px;
        background: rgba(255,214,120,0.14);
        color: #ffe9a8;
        border: 1px solid rgba(255,214,120,0.24);
        font-size: 16px;
        cursor: pointer;
      }

      .demo-tile-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
      }
      .demo-tile {
        background: radial-gradient(120% 90% at 50% 0%, rgba(120,240,176,0.10), transparent 55%), linear-gradient(160deg, rgba(15,92,60,0.66), rgba(5,32,20,0.78));
        border: 1px solid rgba(255, 214, 120, 0.28);
        border-radius: 12px;
        padding: 14px 4px;
        color: rgba(255, 255, 255, 0.85);
        font-size: 14px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        cursor: pointer;
        box-shadow: 0 3px 0 rgba(0,0,0,0.35);
        transition: transform 0.12s ease, box-shadow 0.12s ease;
      }
      .demo-tile:active { transform: translateY(3px); box-shadow: 0 0 0 rgba(0,0,0,0.28); }
      .demo-tile[data-active="true"] {
        color: #3a2600;
        border-color: rgba(255,231,160,0.7);
        background: radial-gradient(120% 100% at 50% 12%, rgba(255,255,255,0.7), transparent 52%), linear-gradient(180deg,#fff3c4,#ffd24d 45%,#e0a514);
        box-shadow: 0 4px 0 #a9760a, inset 0 1.5px 0 rgba(255,255,255,0.7);
        transform: translateY(-1px);
      }

      .demo-method-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .demo-method {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        border-radius: 12px;
        border: 1px solid rgba(255,214,120,0.28);
        background: radial-gradient(120% 90% at 0% 0%, rgba(120,240,176,0.10), transparent 55%), linear-gradient(160deg, rgba(15,92,60,0.66), rgba(5,32,20,0.78));
        cursor: pointer;
      }
      .demo-method--active {
        border-color: rgba(46,224,138,0.55);
        background: linear-gradient(180deg, rgba(46, 224, 138, 0.18), rgba(46, 224, 138, 0.06));
        color: #fff;
      }
      .demo-method--disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .demo-method-name {
        font-size: 13px;
        font-weight: 700;
        color: #fff;
      }
      .demo-method-note {
        font-size: 10px;
        color: rgba(255,255,255,0.55);
        margin-top: 2px;
      }

      .demo-voucher {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        border-radius: 14px;
        background: radial-gradient(130% 160% at 0% 0%, rgba(255,214,120,0.16), transparent 55%), linear-gradient(135deg, rgba(18,73,43,0.92), rgba(6,26,16,0.94));
        border: 1px solid rgba(255,214,120,0.4);
        box-shadow: inset 0 1px 0 rgba(255,236,180,0.18), 0 8px 22px -12px rgba(0,0,0,0.7);
        color: #FFFFFF;
      }
      .demo-voucher-title {
        font-size: 14px;
        font-weight: 900;
        letter-spacing: 0.4px;
        color: #ffd56b;
      }
      .demo-voucher-note {
        font-size: 11px;
        color: rgba(255,255,255,0.6);
        margin-top: 2px;
      }

      .demo-result {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px;
        border-radius: 12px;
        border: 1px solid;
      }
      .demo-result--ok {
        border-color: rgba(46, 224, 138, 0.5);
        background: rgba(46, 224, 138, 0.1);
        color: #6bf5a3;
      }
      .demo-result--err {
        border-color: rgba(255, 77, 109, 0.5);
        background: rgba(255, 77, 109, 0.1);
        color: #ff8fb0;
      }

      .demo-cta-wrap {
        position: fixed;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 100%;
        max-width: 520px;
        padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
        background: linear-gradient(to top, rgba(0,0,0,0.95) 60%, rgba(0,0,0,0));
        backdrop-filter: blur(10px);
        z-index: 10;
      }
      /* Primary CTA — glossy gold from c7p-btn-gold; this only sizes it full-width */
      .demo-cta { width: 100%; padding: 16px; border-radius: 16px; font-size: 16px; letter-spacing: 0.4px; }
      .demo-cta-disclaimer {
        margin: 8px 0 0;
        text-align: center;
        font-size: 10px;
        color: rgba(255,255,255,0.45);
      }
    `}</style>
  );
}

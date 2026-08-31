/**
 * IgDemoDeposit — Instagram-light reskin of the free-play coin faucet (`/deposit/demo`).
 *
 * Presentation-only port of DemoDepositPage: every hook, effect, Supabase call,
 * the grant-demo-credit edge-function invoke, the credit handler and the live-mode
 * redirect are copied VERBATIM. Only the JSX markup + CSS string are new.
 *
 * KEY DIFFERENCE FROM A REAL DEPOSIT FLOW (unchanged from source):
 *   No real money moves. The amount you "deposit" is credited as free-play coins
 *   (🪙) to your wallet. A persistent honest "demo · no real money" surface sits at
 *   the top of the page so no user could mistake this for a real-money transaction.
 *   No fake bonus voucher is shown.
 *
 * Constraints (enforced by the edge function, mirrored in UI):
 *   - Per-call min: 10 coins, max: 5,000 coins
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Coins, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformMode } from '@/hooks/usePlatformMode';
import IgTabBar from '@/components/ig/IgTabBar';
import IgSocialNotice from "@/components/ig/IgSocialNotice";

const AMOUNT_TILES = [10, 30, 50, 80, 100, 200, 300, 500, 800, 1000, 1500, 2000, 3000, 5000] as const;

type GrantResult =
  | { ok: true; amount_granted: number; new_balance: number; daily_remaining: number; daily_grants_remaining: number }
  | { ok: false; error: string; message?: string };

export default function IgDemoDeposit() {
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
    <div className="ig igdemo">
      <style>{CSS}</style>

      <header className="ig-top">
        <button className="igdemo-back" onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="ig-ttl">Free Play</span>
        <span style={{ width: 22 }} />
      </header>

      <main className="ig-main igdemo-main">
        {/* Honest demo surface — persistent, can't miss it. No fake bonus voucher. */}
        <div className="igdemo-note">
          <span className="igdemo-note-badge"><Sparkles size={13} /> DEMO</span>
          <span className="igdemo-note-tx">Free-play coins only · No real money · No payment processing</span>
        </div>

        {/* Current balance */}
        <section className="igdemo-bal">
          <div className="igdemo-bal-lbl"><span aria-hidden="true">🪙</span> Current balance</div>
          <div className="igdemo-bal-v">
            {balance == null ? '—' : balance.toLocaleString()}
            <Coins size={22} style={{ verticalAlign: 'middle', marginLeft: 6 }} />
          </div>
        </section>

        {/* Custom amount input */}
        <section className="igdemo-input-row">
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
            className="igdemo-input"
          />
          {custom && (
            <button
              onClick={() => setCustom('')}
              className="igdemo-input-clear"
              aria-label="Clear"
            >
              ×
            </button>
          )}
        </section>

        {/* Amount tiles — 4-column grid */}
        <section>
          <div className="igdemo-sec"><span className="igdemo-sec-t">Choose an amount</span><span className="igdemo-sec-rule" /></div>
          <div className="igdemo-tile-grid">
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
                  className="igdemo-tile"
                  data-active={active}
                >
                  {amt.toLocaleString()}
                </button>
              );
            })}
          </div>
        </section>

        {/* Method (cosmetic — demo only) */}
        <section>
          <div className="igdemo-sec"><span className="igdemo-sec-t">Method</span><span className="igdemo-sec-rule" /></div>
          <div className="igdemo-method-row">
            <div className="igdemo-method igdemo-method--active">
              <Coins size={18} color="#2ee08a" />
              <div>
                <div className="igdemo-method-name">Demo Credit</div>
                <div className="igdemo-method-note">Instant · Free-play coins</div>
              </div>
            </div>
            <div className="igdemo-method igdemo-method--disabled" title="Available after Phase 2 licensing">
              <span style={{ fontSize: 18, opacity: 0.4 }}>💳</span>
              <div>
                <div className="igdemo-method-name">Card / UPI / Crypto</div>
                <div className="igdemo-method-note">Locked · Phase 2 only</div>
              </div>
            </div>
          </div>
        </section>

        {/* Result / error pane */}
        {result && (
          <section>
            {result.ok ? (
              <div className="igdemo-result igdemo-result--ok">
                <CheckCircle2 size={20} />
                <div style={{ flex: 1 }}>
                  <div className="igdemo-result-title">
                    +{result.amount_granted.toLocaleString()} 🪙 credited
                  </div>
                  <div className="igdemo-result-sub">
                    New balance: {result.new_balance.toLocaleString()} 🪙
                    {' · '}{result.daily_grants_remaining} more demo deposits today
                  </div>
                </div>
              </div>
            ) : (
              <div className="igdemo-result igdemo-result--err">
                <AlertCircle size={20} />
                <div style={{ flex: 1 }}>
                  <div className="igdemo-result-title">
                    {result.message ?? 'Demo deposit failed'}
                  </div>
                  <div className="igdemo-result-sub">
                    Error code: {result.error}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* CTA */}
        <div className="igdemo-cta-wrap">
          <button
            onClick={submit}
            disabled={!amountValid || loading}
            className="igdemo-cta"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="igdemo-spin" />
                <span>Processing…</span>
              </>
            ) : (
              <span>Credit {finalAmount.toLocaleString()} 🪙</span>
            )}
          </button>
          <p className="igdemo-cta-disclaimer">
            By tapping, you grant yourself free-play coins. No real money is involved.
          </p>
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
.igdemo-back { background:none; border:none; color:#d6ffe9; cursor:pointer; display:grid; place-items:center; }
.ig-ttl { font-size:18px; font-weight:800; color:#f3ffe9; }
.ig-main { max-width:560px; margin:0 auto; }

.igdemo-main { padding:14px 12px; }

/* Honest demo surface */
.igdemo-note { display:flex; align-items:center; gap:10px; padding:11px 13px; margin-bottom:12px; border-radius:14px;
  background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igdemo-note-badge { flex:0 0 auto; display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:999px;
  background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); color:#0a2410; font-size:10px; font-weight:800; letter-spacing:1.2px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.5); }
.igdemo-note-tx { font-size:11px; font-weight:600; color:var(--mut); line-height:1.3; }

/* Balance card — hero: emerald glow + gold glint + gold-gradient value */
.igdemo-bal { position:relative; overflow:hidden; padding:20px 14px; margin-bottom:12px; border-radius:18px;
  background:radial-gradient(120% 120% at 0% 0%, rgba(240,201,74,0.14), transparent 55%), linear-gradient(160deg,#12492f,#06180f);
  border:1px solid var(--line); box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); text-align:center; }
.igdemo-bal::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(105deg, transparent 40%, rgba(246,230,176,0.10) 50%, transparent 60%); }
.igdemo-bal-lbl { position:relative; z-index:1; font-size:12px; font-weight:800; letter-spacing:.5px; color:var(--mut); }
.igdemo-bal-v { position:relative; z-index:1; margin-top:6px; font-size:34px; font-weight:900; font-variant-numeric:tabular-nums; letter-spacing:-0.6px;
  color:#f3ffe9; background:linear-gradient(180deg,#fff6d5,#f0c94a 60%,#c68a2e); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.igdemo-bal-v svg { -webkit-text-fill-color:initial; color:var(--gold); }

/* Custom amount input */
.igdemo-input-row { position:relative; margin-bottom:14px; }
.igdemo-input { width:100%; background:rgba(9,32,20,0.6); border:1px solid var(--line); border-radius:14px; padding:14px 40px 14px 16px;
  color:var(--ink); font-size:18px; font-weight:700; font-variant-numeric:tabular-nums; outline:none; transition:border-color .16s, box-shadow .16s; }
.igdemo-input::placeholder { color:var(--mut); }
.igdemo-input:focus { border-color:var(--grn); box-shadow:0 0 0 3px rgba(46,224,138,0.18); }
.igdemo-input-clear { position:absolute; right:10px; top:50%; transform:translateY(-50%); width:24px; height:24px; border-radius:12px;
  background:rgba(9,32,20,0.7); color:var(--mut); border:1px solid var(--line); font-size:16px; line-height:1; cursor:pointer; }

/* Section header */
.igdemo-sec { display:flex; align-items:center; gap:8px; margin:6px 4px 10px; }
.igdemo-sec-t { font-size:13px; font-weight:800; color:#f3ffe9; }
.igdemo-sec-rule { flex:1; height:1px; background:var(--line); }

/* Amount tiles — premium chips */
.igdemo-tile-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:16px; }
.igdemo-tile { background:rgba(9,32,20,0.6); border:1px solid var(--line); border-radius:12px; padding:14px 4px; color:#eafff4;
  font-size:14px; font-weight:800; font-variant-numeric:tabular-nums; cursor:pointer; box-shadow:inset 0 1px 0 rgba(246,230,176,0.08);
  transition:transform .12s ease, border-color .12s ease, background .12s ease; }
.igdemo-tile:active { transform:translateY(1px); }
.igdemo-tile[data-active="true"] { color:#0a2410; border-color:transparent; background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a);
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.5), 0 6px 14px -6px rgba(46,224,138,0.5); }

/* Method row */
.igdemo-method-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px; }
.igdemo-method { display:flex; align-items:center; gap:10px; padding:12px; border-radius:12px; border:1px solid var(--line);
  background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); box-shadow:inset 0 1px 0 rgba(246,230,176,0.08); }
.igdemo-method--active { border-color:rgba(46,224,138,0.5); background:radial-gradient(120% 120% at 0% 0%, rgba(46,224,138,0.14), transparent 60%), linear-gradient(160deg,#12492f,#06180f); }
.igdemo-method--disabled { opacity:0.55; cursor:not-allowed; }
.igdemo-method-name { font-size:13px; font-weight:700; color:#f3ffe9; }
.igdemo-method-note { font-size:10px; color:var(--mut); margin-top:2px; }

/* Result pane */
.igdemo-result { display:flex; align-items:center; gap:12px; padding:14px; border-radius:12px; border:1px solid; margin-bottom:16px; }
.igdemo-result--ok { border-color:rgba(46,224,138,0.42); background:rgba(46,224,138,0.12); color:var(--grn); }
.igdemo-result--err { border-color:rgba(255,107,125,0.42); background:rgba(255,107,125,0.12); color:var(--loss); }
.igdemo-result-title { font-size:14px; font-weight:800; }
.igdemo-result-sub { font-size:11px; color:var(--mut); margin-top:2px; }

/* CTA — emerald bevel primary */
.igdemo-cta-wrap { padding:4px 4px 0; }
.igdemo-cta { width:100%; display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:16px; border-radius:14px;
  border:none; background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); color:#0a2410; font-size:16px; font-weight:800; letter-spacing:0.3px; font-family:inherit; cursor:pointer;
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.5), 0 6px 16px -6px rgba(46,224,138,0.6); }
.igdemo-cta:active { transform:translateY(1px); }
.igdemo-cta:disabled { opacity:0.5; cursor:not-allowed; }
.igdemo-spin { animation:igdemo-spin 1s linear infinite; }
@keyframes igdemo-spin { from { transform:rotate(0); } to { transform:rotate(360deg); } }
.igdemo-cta-disclaimer { margin:8px 0 0; text-align:center; font-size:10px; color:var(--mut); }

@media (prefers-reduced-motion: reduce) { .ig *, .ig *::before, .ig *::after { animation:none !important; transition:none !important; } }
`;

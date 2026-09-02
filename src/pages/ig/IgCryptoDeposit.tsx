/**
 * IgCryptoDeposit — Instagram-light reskin of CryptoDepositPage (`/deposit/crypto`).
 *
 * Presentation-only port. Backend unchanged: still calls `get_user_deposit_address()`
 * RPC (returns the user's per-user TRC20 address or shared hot-wallet fallback), still
 * derives the per-user wallet via `derive-user-wallet`, still reads the EVM/BTC/TON
 * operator gates from `site_config`, and still tracks live deposit history from
 * `casino_transactions` (realtime). Every hook, state variable, effect, supabase call,
 * QR generation, copy handler, shake/toast behaviour and navigation is copied VERBATIM
 * from the source — only the JSX markup and the CSS string are reskinned to the
 * IG-light system (white cards, hairline borders, green primary / gold premium accents).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy, Check, AlertCircle, ShieldCheck, ShieldAlert,
  Clock, ChevronRight, Sparkles, Lock, ArrowLeft,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformMode } from '@/hooks/usePlatformMode';
import { PRESENTATION_ONLY } from '@/lib/presentationMode';
import DepositGamesStrip from '@/components/casino/DepositGamesStrip';
import IgTabBar from '@/components/ig/IgTabBar';
import IgSocialNotice from "@/components/ig/IgSocialNotice";

// ─────────────────────────────────────────────────────────────────────────────
// Network catalog
// ─────────────────────────────────────────────────────────────────────────────
type NetworkKey = 'trc20' | 'erc20' | 'bep20' | 'btc' | 'ton';

interface Network {
  key: NetworkKey;
  symbol: string;
  chain: string;
  chainShort: string;
  minDeposit: number;
  confirms: string;
  arrivalMin: number;
  active: boolean;
  color: string;
}

const NETWORKS: Network[] = [
  { key: 'trc20', symbol: 'USDT', chain: 'Tron (TRC20)',      chainShort: 'TRC20',  minDeposit: 1,    confirms: '20 blocks', arrivalMin: 1,   active: true,  color: '#26A17B' },
  { key: 'erc20', symbol: 'USDT', chain: 'Ethereum (ERC20)',  chainShort: 'ERC20',  minDeposit: 20,   confirms: '15 blocks', arrivalMin: 5,   active: false, color: '#627eea' },
  { key: 'bep20', symbol: 'USDT', chain: 'BNB Chain (BEP20)', chainShort: 'BEP20',  minDeposit: 5,    confirms: '15 blocks', arrivalMin: 1,   active: false, color: '#f3ba2f' },
  { key: 'btc',   symbol: 'BTC',  chain: 'Bitcoin',           chainShort: 'BTC',    minDeposit: 0.0001, confirms: '3 blocks', arrivalMin: 30, active: true,  color: '#f7931a' },
  { key: 'ton',   symbol: 'TON',  chain: 'The Open Network',  chainShort: 'TON',    minDeposit: 1,    confirms: '1 block',   arrivalMin: 1,   active: true,  color: '#0098ea' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Deposit history record
// ─────────────────────────────────────────────────────────────────────────────
interface DepositRecord {
  id: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
  network?: string;
  txHash?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Time formatter
// ─────────────────────────────────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000)      return 'just now';
  if (ms < 3600_000)    return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86400_000)   return `${Math.floor(ms / 3600_000)}h ago`;
  return `${Math.floor(ms / 86400_000)}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function IgCryptoDeposit() {
  const nav = useNavigate();

  const [userId, setUserId] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  // EVM (ERC20/BEP20) deposits stay OFF until the scanner is proven on testnet.
  // Flipped on via site_config.evm_deposits_enabled once verified.
  const [evmEnabled, setEvmEnabled] = useState(false);
  // BTC (deposit-watcher-btc) + TON (deposit-watcher-ton) rails — each gated by
  // its own site_config flag, flipped on only once the scanner is live.
  const [btcEnabled, setBtcEnabled] = useState(false);
  const [tonEnabled, setTonEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedKey, setSelectedKey] = useState<NetworkKey>('trc20');
  const [history, setHistory] = useState<DepositRecord[]>([]);
  const [shakeKey, setShakeKey] = useState<NetworkKey | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Deposits are fully automatic — the on-chain scanners detect and credit them.
  // No manual "submit TXID" form is shown on any chain.
  // Shared/manual mode: true when this user has no per-user derived address yet
  // (HD seed not configured) — we show the shared platform address + a manual
  // verification notice so the page never dead-ends.
  const [sharedMode, setSharedMode] = useState(false);
  // Shared platform TRC20 address (manual verify) — used only as a last-resort
  // fallback when no per-user / platform_wallets address resolves.
  const SHARED_TRC20 = 'TVwG9sWWHEPeXX2pd82irr9us8vxDgcj2w';

  // Runtime network availability. TRC20 is always live; ERC20/BEP20 activate
  // only when the operator has flipped evm_deposits_enabled (after testnet
  // proof); BTC/TON stay off until built.
  const nets = useMemo<Network[]>(
    () => NETWORKS.map((n) => ({
      ...n,
      active: n.key === 'trc20' ? true
        : (n.key === 'erc20' || n.key === 'bep20') ? evmEnabled
        : n.key === 'btc' ? btcEnabled
        : n.key === 'ton' ? tonEnabled
        : false,
    })),
    [evmEnabled, btcEnabled, tonEnabled]
  );

  const selected = useMemo(
    () => nets.find((n) => n.key === selectedKey) ?? nets[0],
    [nets, selectedKey]
  );

  // Free-play / demo safety gate: in demo platform mode (or a presentation-only
  // build) no real deposit address is derived, fetched, or shown. Rails unchanged.
  const platMode = usePlatformMode();
  const demoLike = PRESENTATION_ONLY || platMode === 'demo';

  // Auth (once): resolve the user, ensure their addresses are derived, and read
  // whether EVM deposits are enabled. The per-chain address itself is fetched by
  // the effect below (keyed on the selected network).
  useEffect(() => {
    if (demoLike) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (cancelled) return;
      if (!uid) { setError('Please sign in to deposit.'); setLoading(false); return; }
      // Derive this user's OWN address first (idempotent). If the HD seed is
      // configured this creates per-user TRC20/ETH/BSC rows → per-user mode. If
      // it fails (seed not set yet) we fall back to the shared platform address
      // with manual verification. Deriving BEFORE fetching the address avoids a
      // race where the first fetch returns the shared fallback even though a
      // per-user row is about to exist.
      let perUser = false;
      try {
        const { data: d, error: de } = await supabase.functions.invoke('derive-user-wallet', { body: {} });
        const dd = d as { success?: boolean; addresses?: Record<string, string> } | null;
        if (!de && dd?.success && dd.addresses && Object.keys(dd.addresses).length > 0) perUser = true;
      } catch { /* seed not configured → shared/manual fallback */ }
      if (cancelled) return;
      setSharedMode(!perUser);
      // Operator gates: EVM (ERC20/BEP20), BTC, TON rails each light up only once
      // their scanner is verified. Read all three flags in one query.
      try {
        const { data: cfgs } = await supabase.from('site_config').select('key, value')
          .in('key', ['evm_deposits_enabled', 'btc_deposits_enabled', 'ton_deposits_enabled']);
        const on = (v: any) => v === true || v === 'true' || v?.enabled === true;
        const map = new Map((cfgs ?? []).map((c: any) => [c.key, c.value]));
        if (!cancelled) {
          setEvmEnabled(on(map.get('evm_deposits_enabled')));
          setBtcEnabled(on(map.get('btc_deposits_enabled')));
          setTonEnabled(on(map.get('ton_deposits_enabled')));
        }
      } catch { /* default OFF */ }
      if (!cancelled) setUserId(uid); // triggers the per-chain address fetch, now that derive has run
    })();
    return () => { cancelled = true; };
  }, [demoLike]);

  // Per-chain address load — refetches whenever the selected (active) network
  // changes. Only active networks are ever selectable, so this never requests a
  // chain the user can't actually deposit on.
  useEffect(() => {
    if (demoLike || !userId) return;
    let cancelled = false;
    const chainParam = selectedKey === 'erc20' ? 'ERC20' : selectedKey === 'bep20' ? 'BEP20'
      : selectedKey === 'btc' ? 'BTC' : selectedKey === 'ton' ? 'TON' : 'TRC20';
    setLoading(true); setError(null); setAddress(null);
    (async () => {
      try {
        const { data, error: err } = await supabase.rpc('get_user_deposit_address', { p_user_id: userId, p_chain: chainParam });
        const res = data as { success?: boolean; address?: string; error?: string } | null;
        if (cancelled) return;
        if (err || !res?.success || !res.address) {
          // TRC20 must never dead-end: fall back to the shared platform address
          // (manual verification). EVM chains have no safe shared fallback.
          if (chainParam === 'TRC20') { setAddress(SHARED_TRC20); setSharedMode(true); }
          else setError(res?.error || 'Deposit address not available yet — try another method.');
        } else {
          setAddress(res.address);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load deposit address');
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, selectedKey, demoLike]);

  // Deposit history (last 5)
  const loadHistory = useCallback(async (uid: string) => {
    try {
      const { data, error: err } = await supabase
        .from('casino_transactions')
        .select('id, amount, status, created_at, type, network')
        .eq('user_id', uid)
        .eq('type', 'deposit')
        .order('created_at', { ascending: false })
        .limit(5);
      if (err || !data) return; // silently ignore — degraded UX not fatal
      setHistory(data.map((r: any) => ({
        id: r.id,
        amount: Number(r.amount ?? 0),
        status: (r.status as any) || 'pending',
        createdAt: r.created_at,
        network: r.network ?? undefined,
      })));
    } catch { /* table shape may differ — silent */ }
  }, []);

  useEffect(() => { if (userId) loadHistory(userId); }, [userId, loadHistory]);

  // Realtime deposit updates
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`cdp-deposits-${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'casino_transactions', filter: `user_id=eq.${userId}` },
        () => { loadHistory(userId); }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, loadHistory]);

  const copy = () => {
    if (!address) return;
    try { navigator.clipboard?.writeText(address); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const onNetworkTap = (n: Network) => {
    if (n.active) { setSelectedKey(n.key); return; }
    // shake + toast on locked network
    setShakeKey(n.key);
    setTimeout(() => setShakeKey((k) => (k === n.key ? null : k)), 400);
    setToast(`${n.symbol} · ${n.chainShort} — coming soon`);
    setTimeout(() => setToast(null), 1800);
  };

  // Demo / presentation: never render a real deposit address.
  if (demoLike) {
    return (
      <div className="ig" style={{ minHeight: "100dvh", color: "#eafff4", fontFamily: "Inter,system-ui,sans-serif",
        background: "radial-gradient(120% 62% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%), linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%)" }}>
        <header style={{ position: "sticky", top: 0, display: "flex", alignItems: "center", gap: 10, height: 54, padding: "0 14px",
          background: "linear-gradient(180deg,rgba(9,32,20,0.92),rgba(9,32,20,0.6))", borderBottom: "1px solid rgba(240,201,74,0.2)" }}>
          <button onClick={() => nav(-1)} aria-label="Back" style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(240,201,74,0.3)", background: "rgba(8,20,14,0.6)", color: "#f0c94a", display: "grid", placeItems: "center", cursor: "pointer" }}><ArrowLeft size={20} /></button>
          <span style={{ fontSize: 17, fontWeight: 800 }}>Deposit</span>
        </header>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "22px 16px" }}>
          <div style={{ padding: "18px 16px", borderRadius: 16, background: "linear-gradient(160deg,rgba(18,73,47,0.85),rgba(7,32,20,0.9))", border: "1px solid rgba(240,201,74,0.28)", textAlign: "center" }}>
            <div style={{ fontSize: 34 }}>🪙</div>
            <div style={{ fontSize: 17, fontWeight: 900, marginTop: 6 }}>Free-play mode</div>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "#bfe0cf", marginTop: 8 }}>
              Real-money deposits are off. Play with free-play coins — no crypto address, no payment, no real money.
            </p>
            <button onClick={() => nav("/ig/deposit/demo")} style={{ marginTop: 14, width: "100%", border: "none", borderRadius: 13, padding: 14, fontFamily: "inherit", fontSize: 15, fontWeight: 900, color: "#04120b", cursor: "pointer", background: "linear-gradient(92deg,#0a8f5b,#2ee08a 60%,#8ff0bf)" }}>
              Get free-play coins
            </button>
          </div>
        </main>
        <IgTabBar active="wallet" />
      </div>
    );
  }

  return (
    <div className="ig igcry">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className="ig-top">
        <button className="igcry-back" onClick={() => nav(-1)} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="ig-ttl">Deposit</span>
        <span style={{ width: 22 }} />
      </header>

      <main className="ig-main igcry-main">
        {/* NETWORKS */}
        <div>
          <div className="igcry-sec"><span className="igcry-sec-ic">🌐</span><span className="igcry-sec-t">Choose network</span><span className="igcry-sec-rule" /></div>
          <div className="igcry-networks">
            {nets.map((n) => (
              <button
                key={n.key}
                type="button"
                className="igcry-network"
                data-active={n.active && selectedKey === n.key}
                data-disabled={!n.active || undefined}
                data-shake={shakeKey === n.key || undefined}
                onClick={() => onNetworkTap(n)}
                aria-label={`${n.symbol} on ${n.chain}${n.active ? '' : ' — coming soon'}`}
              >
                <span className="igcry-network-icon" style={{ ['--igcry-c' as any]: n.color }}>
                  {n.symbol === 'USDT'
                    ? <img className="igcry-network-coin" src="/icons/v2/usdt.png" alt="" aria-hidden="true" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).textContent = n.symbol.slice(0, 4); }} />
                    : n.symbol.slice(0, 4)}
                </span>
                <span className="igcry-network-meta">
                  <span className="igcry-network-symbol">
                    {n.symbol}
                    {!n.active && <Lock size={11} strokeWidth={2.5} />}
                  </span>
                  <span className="igcry-network-chain">{n.chain}</span>
                </span>
                {n.active ? (
                  <span className="igcry-network-tag igcry-tag-active">Active</span>
                ) : (
                  <span className="igcry-network-tag igcry-tag-soon">Soon</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* QR + ADDRESS */}
        {loading ? (
          <div className="igcry-card" aria-busy="true" aria-label="Loading deposit address" style={{ textAlign: 'center' }}>
            <div className="igcry-skel" style={{ width: 130, height: 24, borderRadius: 999, margin: '4px auto 16px' }} />
            <div className="igcry-skel" style={{ width: 190, height: 190, borderRadius: 18, margin: '0 auto 16px' }} />
            <div className="igcry-skel" style={{ height: 44, borderRadius: 12 }} />
          </div>
        ) : error ? (
          <div className="igcry-card">
            <div className="igcry-error">
              <span className="igcry-error-icon"><AlertCircle size={24} /></span>
              <div className="igcry-error-title">Deposit unavailable</div>
              <div className="igcry-error-sub">{error}</div>
            </div>
          </div>
        ) : (
          <div className="igcry-card igcry-qr-card">
            <span className="igcry-qr-chip">
              <ShieldCheck size={12} strokeWidth={2.5} />
              {selected.symbol} · {selected.chainShort}
            </span>
            <div>
              <div className="igcry-qr-box">
                {address && <QRCodeSVG value={address} size={196} level="M" />}
              </div>
            </div>
            {address && (
              <button className="igcry-address" onClick={copy} aria-label="Copy address">
                <span className="igcry-address-text">{address}</span>
                <span className="igcry-address-copy">
                  {copied ? <><Check size={12} strokeWidth={3} /> Copied</> : <><Copy size={12} strokeWidth={2.5} /> Copy</>}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Shared-address / manual-verification notice */}
        {address && !loading && !error && sharedMode && selectedKey === 'trc20' && (
          <div className="igcry-banner">
            <AlertCircle size={16} />
            <span>
              Shared deposit address — deposits are credited within ~30 min after on-chain verification.
              Contact support with your transaction hash (TXID) if it’s delayed.
            </span>
          </div>
        )}

        {/* SAFETY INFO */}
        {address && (
          <div>
            <div className="igcry-sec"><span className="igcry-sec-ic">📋</span><span className="igcry-sec-t">Deposit details</span><span className="igcry-sec-rule" /></div>
            <div className="igcry-card igcry-card--flush">
              <div className="igcry-info-row">
                <span className="igcry-info-icon"><Sparkles size={16} /></span>
                <div className="igcry-info-content">
                  <div className="igcry-info-label">Minimum deposit</div>
                  <div className="igcry-info-sub">{selected.minDeposit} {selected.symbol}</div>
                </div>
              </div>
              <div className="igcry-info-row">
                <span className="igcry-info-icon"><Clock size={16} /></span>
                <div className="igcry-info-content">
                  <div className="igcry-info-label">Confirmations</div>
                  <div className="igcry-info-sub">{selected.confirms} — usually {selected.arrivalMin} min</div>
                </div>
              </div>
              <div className="igcry-info-row">
                <span className="igcry-info-icon" data-warn="true"><ShieldAlert size={16} /></span>
                <div className="igcry-info-content">
                  <div className="igcry-info-label">Send only {selected.symbol} on {selected.chainShort}</div>
                  <div className="igcry-info-sub">Any other coin or network will result in permanent loss.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AUTOMATIC DEPOSIT — on-chain scanners detect + credit; no manual step */}
        {address && (
          <div>
            <div className="igcry-sec"><span className="igcry-sec-ic">⚡</span><span className="igcry-sec-t">Automatic deposit</span><span className="igcry-sec-rule" /></div>
            <div className="igcry-card">
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden="true">⚡</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--grn)' }}>No confirmation needed — it's automatic</div>
                  <div style={{ fontSize: 12, color: 'var(--mut)', marginTop: 4, lineHeight: 1.5 }}>
                    Send {selected.symbol} to the address above. We detect it on-chain and credit your wallet automatically — usually a few minutes after {selected.confirms}. A 1.8% platform fee is deducted from the credited amount.
                    {sharedMode && ' If it hasn’t arrived after ~30 min, contact support with your transaction hash (TXID).'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PENDING / HISTORY */}
        <div>
          <div className="igcry-sec">
            <span className="igcry-sec-ic">🧾</span>
            <span className="igcry-sec-t">Recent deposits</span>
            <span className="igcry-sec-rule" />
            <button
              type="button"
              onClick={() => nav('/v3/wallet')}
              className="igcry-sec-all"
            >
              All <ChevronRight size={11} />
            </button>
          </div>
          {history.length === 0 ? (
            <div className="igcry-history-empty">
              No deposits yet. Send {selected.symbol} to the address above to fund your wallet.
            </div>
          ) : (
            <div>
              {history.map((d) => (
                <div key={d.id} className="igcry-history-row">
                  <div className="igcry-history-amt">${d.amount.toFixed(2)}</div>
                  <span className={`igcry-history-status igcry-status-${d.status}`}>
                    {d.status === 'pending' && <><span className="igcry-pulse-dot" />Pending</>}
                    {d.status === 'confirmed' && 'Confirmed'}
                    {d.status === 'failed' && 'Failed'}
                  </span>
                  <span className="igcry-history-time">{relativeTime(d.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Play-while-you-wait games teaser (real catalog → lobby) */}
        <DepositGamesStrip />

        <IgSocialNotice variant="card" />
      </main>

      {toast && <div className="igcry-toast">{toast}</div>}

      <IgTabBar active="wallet" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS — Instagram-light
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
.ig { --bg:#07130d; --card:#103524; --card2:#12492f; --line:rgba(240,201,74,0.26); --ink:#eafff4; --mut:#93c3aa; --grn:#2ee08a; --grn2:#0e7a4a; --gold:#f0c94a; --gold3:#c68a2e; --loss:#ff6b7d;
  min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif; padding-bottom:76px;
  background: radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%), linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%); background-attachment:fixed; }
.ig * { box-sizing:border-box; }

.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:52px; padding:0 12px;
  background:linear-gradient(180deg, rgba(9,32,20,0.92), rgba(9,32,20,0.62)); -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); }
.igcry-back { background:none; border:none; color:#d6ffe9; cursor:pointer; display:grid; place-items:center; }
.ig-ttl { font-size:18px; font-weight:800; color:#f3ffe9; }
.ig-main { max-width:560px; margin:0 auto; }

.igcry-main { padding:14px 12px 0; display:flex; flex-direction:column; gap:16px; }

/* Section header */
.igcry-sec { display:flex; align-items:center; gap:8px; margin:0 4px 10px; }
.igcry-sec-ic { font-size:15px; }
.igcry-sec-t { font-size:13px; font-weight:800; color:#f3ffe9; }
.igcry-sec-rule { flex:1; height:1px; background:var(--line); }
.igcry-sec-all { background:none; border:none; color:var(--grn); font-size:10px; font-weight:800; letter-spacing:1.4px; text-transform:uppercase; cursor:pointer; display:inline-flex; align-items:center; gap:3px; }

/* Premium emerald glass card */
.igcry-card { background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line); border-radius:16px; padding:16px;
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igcry-card--flush { padding:2px 16px; }

/* Skeleton — dark shimmer on emerald */
.igcry-skel { background:linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.10), rgba(255,255,255,0.04)); background-size:200% 100%; animation:igcry-shimmer 1.2s ease-in-out infinite; }
@keyframes igcry-shimmer { from { background-position:200% 0; } to { background-position:-200% 0; } }

/* ── Network picker ─────────────────────────────────────────── */
.igcry-networks { display:grid; grid-template-columns:1fr; gap:8px; }
.igcry-network {
  appearance:none; border:1px solid var(--line); background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border-radius:14px;
  padding:12px 14px; cursor:pointer; display:flex; align-items:center; gap:12px; text-align:left;
  color:var(--ink); transition:border-color .18s ease, background .18s ease, box-shadow .18s ease; -webkit-tap-highlight-color:transparent;
  position:relative; font-family:inherit; box-shadow:inset 0 1px 0 rgba(246,230,176,0.08);
}
.igcry-network:active { transform:scale(.98); }
.igcry-network[data-active="true"] { border-color:transparent;
  background:linear-gradient(180deg, rgba(46,224,138,0.16), rgba(8,30,19,0.92)); box-shadow:inset 0 1px 0 rgba(255,255,255,0.14), 0 0 0 1.5px var(--grn), 0 10px 24px -14px rgba(46,224,138,0.6); }
.igcry-network[data-disabled="true"] { opacity:.5; cursor:not-allowed; }
.igcry-network[data-shake="true"] { animation:igcry-shake .35s ease; }
@keyframes igcry-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-3px)} 75%{transform:translateX(3px)} }

.igcry-network-icon {
  width:42px; height:42px; border-radius:50%;
  background:var(--igcry-c, var(--grn));
  display:inline-flex; align-items:center; justify-content:center;
  color:#fff; font-size:12px; font-weight:900; letter-spacing:.5px; flex:0 0 auto;
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(0,0,0,0.15);
}
/* Real 3D coin fills the frame — the coin carries its own rim, so drop the plate */
.igcry-network-icon:has(.igcry-network-coin) { background:transparent; box-shadow:none; }
.igcry-network-coin { width:42px; height:42px; object-fit:contain; display:block; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45)); }
.igcry-network-meta { flex:1; min-width:0; }
.igcry-network-symbol { font-size:13px; font-weight:900; color:#f3ffe9; display:flex; align-items:center; gap:6px; }
.igcry-network-chain { font-size:10.5px; font-weight:700; color:var(--mut); letter-spacing:.3px; margin-top:1px; }
.igcry-network-tag { display:inline-flex; align-items:center; gap:3px; padding:3px 8px; border-radius:999px;
  font-size:8.5px; font-weight:900; letter-spacing:1px; text-transform:uppercase; line-height:1; flex:0 0 auto; }
.igcry-tag-active { color:#0a2410; background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); box-shadow:inset 0 1px 0 rgba(255,255,255,0.5); }
.igcry-tag-soon { background:rgba(9,32,20,0.6); color:var(--mut); border:1px solid var(--line); }

/* ── QR + address ─────────────────────────────────────────── */
.igcry-qr-card { text-align:center;
  background:radial-gradient(120% 120% at 50% 0%, rgba(46,224,138,0.14), transparent 55%), linear-gradient(180deg, rgba(18,63,41,0.92), rgba(8,30,19,0.94)); }
.igcry-qr-chip {
  display:inline-flex; align-items:center; gap:6px; padding:6px 16px; border-radius:999px;
  font-size:10.5px; font-weight:900; letter-spacing:1.4px; text-transform:uppercase;
  background:rgba(9,32,20,0.6); border:1px solid var(--line); color:var(--grn); margin-bottom:14px;
}
/* WHITE plate kept for QR scannability (contract exception), framed by emerald bevel */
.igcry-qr-box {
  display:inline-block; padding:14px; background:#fff; border-radius:18px; margin-bottom:14px;
  border:1px solid var(--line); box-shadow:inset 0 0 0 3px rgba(240,201,74,0.35), 0 10px 28px -10px rgba(0,0,0,0.7);
}
.igcry-address {
  width:100%; appearance:none; display:flex; align-items:center; gap:8px; padding:12px 14px;
  background:rgba(9,32,20,0.6); border:1px solid var(--line); border-radius:12px; color:var(--ink); cursor:pointer;
  font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:12px;
  transition:border-color .18s ease; -webkit-tap-highlight-color:transparent;
}
.igcry-address:hover { border-color:var(--grn); }
.igcry-address:active { transform:scale(.98); }
.igcry-address-text { flex:1; text-align:left; word-break:break-all; color:#eafff4; }
.igcry-address-copy {
  flex:0 0 auto; display:inline-flex; align-items:center; gap:4px; padding:7px 12px;
  color:#0a2410; background:linear-gradient(180deg,#9ffcc4,#2ee08a 55%,#0e7a4a); border-radius:8px;
  font-size:10px; font-weight:900; letter-spacing:1px; text-transform:uppercase;
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.5), 0 6px 14px -6px rgba(46,224,138,0.5);
}

/* Shared-address banner — gold-tint on dark */
.igcry-banner {
  display:flex; align-items:flex-start; gap:9px; padding:12px 14px; border-radius:14px;
  background:linear-gradient(180deg, rgba(240,201,74,0.12), rgba(8,30,19,0.6)); border:1px solid rgba(240,201,74,0.42); color:#f0d99a;
  font-size:11.5px; font-weight:600; line-height:1.35;
}
.igcry-banner svg { flex:0 0 auto; margin-top:1px; color:var(--gold); }

/* ── Safety info ─────────────────────────────────────────── */
.igcry-info-row { display:flex; align-items:center; gap:10px; padding:12px 0; border-bottom:1px solid var(--line); }
.igcry-info-row:last-child { border-bottom:none; }
.igcry-info-icon {
  width:30px; height:30px; border-radius:10px; background:radial-gradient(120% 120% at 50% 18%, #1a5738, #0b2418); color:var(--grn);
  display:inline-flex; align-items:center; justify-content:center; flex:0 0 auto; border:1px solid var(--line);
}
.igcry-info-icon[data-warn="true"] { color:#ffe9a8; }
.igcry-info-icon[data-danger="true"] { color:var(--loss); }
.igcry-info-content { flex:1; }
.igcry-info-label { font-size:12px; font-weight:800; color:#f3ffe9; margin-bottom:2px; }
.igcry-info-sub { font-size:11px; font-weight:600; color:var(--mut); line-height:1.4; }

/* ── History ─────────────────────────────────────────── */
.igcry-history-empty {
  padding:24px 16px; text-align:center; border:1px dashed var(--line); border-radius:14px;
  color:var(--mut); font-size:12px; font-weight:700; background:linear-gradient(180deg, rgba(18,63,41,0.7), rgba(8,30,19,0.8));
}
.igcry-history-row { display:flex; align-items:center; gap:12px; padding:12px; background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line); border-radius:12px;
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.08); }
.igcry-history-row + .igcry-history-row { margin-top:6px; }
.igcry-history-amt { font-size:14px; font-weight:900; font-variant-numeric:tabular-nums; color:#f3ffe9; flex:1; }
.igcry-history-status { padding:3px 8px; border-radius:999px; font-size:9px; font-weight:900; letter-spacing:1.4px; text-transform:uppercase; }
.igcry-status-pending { background:rgba(240,201,74,0.16); color:var(--gold); }
.igcry-status-confirmed { background:rgba(46,224,138,0.16); color:var(--grn); }
.igcry-status-failed { background:rgba(255,107,125,0.16); color:var(--loss); }
.igcry-history-time { font-size:10.5px; font-weight:700; color:var(--mut); font-variant-numeric:tabular-nums; flex:0 0 auto; }
.igcry-pulse-dot { display:inline-block; width:5px; height:5px; border-radius:50%; background:var(--gold); margin-right:4px; vertical-align:middle; animation:igcry-pulse 1.3s ease-in-out infinite; }
@keyframes igcry-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.9)} }

/* ── Error state ─────────────────────────────────────────── */
.igcry-error { text-align:center; padding:22px 16px; }
.igcry-error-icon {
  width:46px; height:46px; border-radius:50%; background:radial-gradient(120% 120% at 50% 18%, #1a5738, #0b2418); color:var(--gold);
  display:inline-flex; align-items:center; justify-content:center; margin-bottom:10px; border:1px solid var(--line);
}
.igcry-error-title { font-size:14px; font-weight:900; color:#f3ffe9; margin-bottom:4px; }
.igcry-error-sub { font-size:12px; color:var(--mut); }

/* toast for coming-soon network taps */
.igcry-toast {
  position:fixed; left:50%; bottom:calc(100px + env(safe-area-inset-bottom, 0px)); transform:translateX(-50%);
  padding:10px 16px; background:linear-gradient(180deg, rgba(9,32,20,0.96), rgba(4,16,10,0.96)); border:1px solid var(--line); color:#f3ffe9; border-radius:999px;
  font-size:11px; font-weight:900; letter-spacing:1.2px; text-transform:uppercase; z-index:60;
  box-shadow:0 14px 34px -18px rgba(0,0,0,0.9), inset 0 1px 0 rgba(246,230,176,0.1);
  animation:igcry-fade-in .25s ease-out both;
}
@keyframes igcry-fade-in { from { opacity:0; transform:translate(-50%,8px); } to { opacity:1; transform:translate(-50%,0); } }

@media (prefers-reduced-motion: reduce) { .ig *, .ig *::before, .ig *::after { animation:none !important; transition:none !important; } }
`;

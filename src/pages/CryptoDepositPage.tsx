/**
 * CryptoDepositPage — Premium USDT / crypto deposit UI.
 *
 * Backend unchanged: still calls `get_user_deposit_address()` RPC (returns the
 * user's per-user TRC20 address or shared hot-wallet fallback). The
 * deposit-watcher-tron edge function credits USDT once confirmed on-chain.
 *
 * This file rebuilds the UI on top of the existing pipeline:
 *   - Standard V3 page chrome (own back+title header + global BottomNav)
 *   - Multi-network picker (TRC20 active; ERC20 / BEP20 / BTC / TON marked
 *     "Coming Soon" — future-proof for when watchers land)
 *   - Larger QR + one-tap copy address
 *   - Safety block: minimum, confirmations, network mismatch warning
 *   - Live deposit history tracker (last 5 deposits, realtime status)
 *   - Consistent aqua/gold theme
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy, Check, AlertCircle, ShieldCheck, ShieldAlert,
  Clock, ChevronRight, Sparkles, Lock, ArrowLeft,
} from 'lucide-react';
// V3 reset: the legacy `c7-neon-aqua` token module (whose "ancient-gold"
// #d9a94a/#e8c15a reads copper) is dropped. `t` is now a local literal map of
// the C7 V3 emerald+gold (c7p) palette, keeping the same shape so every existing
// `t.colors.*` reference resolves to on-brand bright gold + emerald values.
const t = {
  colors: {
    text: { primary: '#eafff4', secondary: 'rgba(234,255,244,0.82)', tertiary: 'rgba(234,255,244,0.55)' },
    emerald: { 400: '#2ee08a', 500: '#12a04f', 600: '#0a7a3c' },
    gold: { 300: '#ffe9a8', 400: '#f6c945' },
    surface: { abyss: '#04170e' },
    border: { subtle: 'rgba(255,255,255,0.08)', soft: 'rgba(0,168,107,0.30)', gold: 'rgba(246,201,69,0.42)' },
  },
} as const;
import { supabase } from '@/integrations/supabase/client';
import DepositGamesStrip from '@/components/casino/DepositGamesStrip';

// Floating "jeevan" coins that drift up behind the QR (left%, duration, delay).
const COIN_CFG = [
  { l: '12%', d: '4.6s', delay: '0s' },
  { l: '28%', d: '5.4s', delay: '1.3s' },
  { l: '45%', d: '4.9s', delay: '2.4s' },
  { l: '62%', d: '5.8s', delay: '0.8s' },
  { l: '78%', d: '5.1s', delay: '3.1s' },
  { l: '90%', d: '6.0s', delay: '1.9s' },
];

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
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
@keyframes cdp-fade-in     { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes cdp-spin        { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes cdp-shake       { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-3px)} 75%{transform:translateX(3px)} }
@keyframes cdp-pulse       { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.9)} }
@keyframes cdp-glow-pulse  { 0%,100%{box-shadow:0 0 0 3px rgba(255,205,80,.85), 0 0 0 6px rgba(120,80,10,.4), 0 12px 40px rgba(0,0,0,.5)} 50%{box-shadow:0 0 0 3px rgba(255,214,90,1), 0 0 24px 3px rgba(255,205,80,.55), 0 12px 40px rgba(0,0,0,.5)} }
@keyframes cdp-cardglow    { 0%,100%{box-shadow:0 0 0 1.5px rgba(255,214,90,.9) inset, 0 0 18px -2px rgba(120,255,170,.35), 0 8px 26px -6px rgba(53,217,138,.5), inset 0 1px 0 rgba(255,240,190,.3)} 50%{box-shadow:0 0 0 1.5px rgba(150,255,190,1) inset, 0 0 30px 0 rgba(120,255,170,.55), 0 8px 26px -6px rgba(53,217,138,.55), inset 0 1px 0 rgba(255,240,190,.4)} }

.cdp-page {
  min-height: 100vh;
  background:
    radial-gradient(90% 55% at 50% 0%,   rgba(46,224,138,.20) 0%, transparent 58%),
    radial-gradient(70% 40% at 50% 42%,   rgba(255,205,80,.05) 0%, transparent 60%),
    radial-gradient(120% 80% at 50% 100%, rgba(0,0,0,.5)       0%, transparent 55%),
    linear-gradient(172deg, #0d3d28 0%, #072517 46%, #04160d 100%);
  color: ${t.colors.text.primary};
  padding-bottom: calc(128px + env(safe-area-inset-bottom, 0px));
  animation: cdp-fade-in .35s ease-out both;
}

/* IA P3: standard V3 page header — mirrors the sibling deposit pages (pp-/rzp-/demo-head). */
.cdp-head { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  background: linear-gradient(180deg, rgba(6,20,12,0.94), rgba(6,20,12,0.62)); backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(255,214,120,0.22); box-shadow: 0 1px 0 rgba(255,214,120,0.1); }
.cdp-head::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,200,61,0.55) 30%, rgba(46,224,138,0.4) 70%, transparent); }
.cdp-back { width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255,214,120,0.28); color: #ffe9a8; cursor: pointer;
  background: rgba(0,0,0,0.3); display: inline-flex; align-items: center; justify-content: center; }
.cdp-back:active { transform: scale(0.94); }
.cdp-head-title { flex: 1; font-size: 17px; font-weight: 900; letter-spacing: 0.3px; margin: 0; }
.cdp-content { padding: 12px 16px 0; display: flex; flex-direction: column; gap: 14px; }

.cdp-card {
  background:
    radial-gradient(130% 70% at 50% -10%, rgba(107,245,163,.13) 0%, transparent 55%),
    linear-gradient(165deg, #12925c 0%, #0e7048 55%, #0a5836 100%);
  border: 1px solid rgba(255,205,80,.30);
  border-radius: 22px;
  padding: 16px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12px 28px -10px rgba(0,0,0,.72), inset 0 1.5px 0 rgba(255,240,190,.20), inset 0 -16px 30px rgba(0,0,0,.3);
}
.cdp-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, ${t.colors.gold[400]} 50%, transparent);
  opacity: .8; pointer-events: none;
}

.cdp-section-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 10px; font-weight: 900; letter-spacing: 2px;
  text-transform: uppercase;
  color: ${t.colors.text.tertiary};
  padding: 0 4px 4px;
}
.cdp-section-title-bar {
  display: inline-block; width: 3px; height: 12px; border-radius: 2px;
  background: linear-gradient(135deg, #6bf5a3, #0b7a3f);
}
/* c7p-sec section headers inside the cdp content column (gap handles top space) */
.cdp-sec { margin: 2px 4px 8px; }

/* ── Network picker ─────────────────────────────────────────── */
.cdp-networks {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
.cdp-network {
  appearance: none;
  border: 1.5px solid rgba(255,205,80,.28);
  background:
    radial-gradient(120% 100% at 50% 0%, rgba(107,245,163,.06), transparent 60%),
    linear-gradient(180deg, rgba(12,58,34,.75), rgba(6,26,16,.85));
  border-radius: 16px;
  padding: 13px 14px;
  cursor: pointer;
  display: flex; align-items: center; gap: 12px;
  text-align: left;
  color: ${t.colors.text.primary};
  transition: all .18s ease;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  box-shadow: inset 0 1px 0 rgba(255,240,190,.08), 0 6px 16px -8px rgba(0,0,0,.6);
}
.cdp-network:active { transform: scale(.98); }
.cdp-network[data-active="true"] {
  border-color: rgba(255,220,110,.95);
  background:
    radial-gradient(120% 120% at 50% 0%, rgba(120,255,170,.16), transparent 55%),
    linear-gradient(180deg, rgba(18,94,54,.9), rgba(7,34,20,.92));
  animation: cdp-cardglow 2.6s ease-in-out infinite;
}
.cdp-network[data-disabled="true"] { opacity: .55; cursor: not-allowed; }
.cdp-network[data-shake="true"] { animation: cdp-shake .35s ease; }

.cdp-network-icon {
  width: 42px; height: 42px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 32% 26%, rgba(255,255,255,.55), transparent 44%),
    var(--cdp-c, ${t.colors.emerald[500]});
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff;
  font-size: 12px; font-weight: 900;
  letter-spacing: .5px;
  flex: 0 0 auto;
  border: 1.5px solid rgba(255,255,255,.20);
  box-shadow: 0 4px 12px rgba(0,0,0,.45), inset 0 -3px 6px rgba(0,0,0,.3), inset 0 2px 3px rgba(255,255,255,.4);
}
.cdp-network-meta { flex: 1; min-width: 0; }
.cdp-network-symbol {
  font-size: 13px; font-weight: 900;
  color: ${t.colors.text.primary};
  display: flex; align-items: center; gap: 6px;
}
.cdp-network-chain {
  font-size: 10.5px; font-weight: 700;
  color: ${t.colors.text.tertiary};
  letter-spacing: .3px;
  margin-top: 1px;
}
.cdp-network-tag {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 8.5px; font-weight: 900;
  letter-spacing: 1px;
  text-transform: uppercase;
  line-height: 1;
  flex: 0 0 auto;
}
.cdp-tag-active { background: ${t.colors.emerald[500]}; color: ${t.colors.surface.abyss}; }
.cdp-tag-soon   { background: rgba(255,255,255,.08); color: ${t.colors.text.tertiary}; border: 1px solid ${t.colors.border.subtle}; }

/* ── QR + address ─────────────────────────────────────────── */
.cdp-qr-card {
  text-align: center;
  border: 1.5px solid rgba(255,214,110,.55);
  background:
    radial-gradient(60% 44% at 50% 62%, rgba(107,245,163,.06), transparent 62%),
    radial-gradient(130% 70% at 50% -10%, rgba(107,245,163,.16) 0%, transparent 55%),
    linear-gradient(165deg, #10593380 0%, #0a3a2199 55%, #061c11 100%),
    linear-gradient(165deg, #12925c 0%, #0e7048 55%, #0a5836 100%);
  box-shadow: 0 0 0 1px rgba(255,214,110,.25) inset, 0 14px 34px -12px rgba(0,0,0,.78), inset 0 1.5px 0 rgba(255,240,190,.28);
}
/* emerald corner gems on the QR frame */
.cdp-qr-card::after {
  content: ''; position: absolute; inset: 6px; border-radius: 16px; pointer-events: none; z-index: 4;
  background:
    radial-gradient(circle 6px at 0% 0%,     #9ff8c4, #0b7a3f 58%, transparent 68%),
    radial-gradient(circle 6px at 100% 0%,   #9ff8c4, #0b7a3f 58%, transparent 68%),
    radial-gradient(circle 6px at 0% 100%,   #9ff8c4, #0b7a3f 58%, transparent 68%),
    radial-gradient(circle 6px at 100% 100%, #9ff8c4, #0b7a3f 58%, transparent 68%);
  background-repeat: no-repeat;
}
/* ── floating "jeevan" coins behind the QR ── */
.cdp-coins { position: absolute; inset: 0; z-index: 2; pointer-events: none; overflow: hidden; border-radius: 22px; }
.cdp-coin {
  position: absolute; bottom: -16px; width: 15px; height: 15px; border-radius: 50%;
  display: grid; place-items: center; font-size: 9px; font-weight: 900; color: #7c4a06; font-style: normal;
  background: radial-gradient(circle at 34% 28%, #eafff4, #6bf5a3 52%, #12a04f 82%, #0a7a3c 100%);
  box-shadow: 0 0 8px rgba(255,210,77,.55), inset 0 1px 1px rgba(255,255,255,.7);
  opacity: 0; will-change: transform, opacity; animation: cdp-coinup linear infinite;
}
@keyframes cdp-coinup {
  0%   { opacity: 0;   transform: translateY(0) scale(.6) rotate(0deg); }
  12%  { opacity: .9;  }
  80%  { opacity: .55; }
  100% { opacity: 0;   transform: translateY(-238px) scale(1) rotate(230deg); }
}
@media (prefers-reduced-motion: reduce) { .cdp-coin { animation: none !important; opacity: 0; } }

.cdp-qr-chip {
  position: relative; z-index: 5;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 10.5px; font-weight: 900; letter-spacing: 1.4px;
  text-transform: uppercase;
  background: linear-gradient(180deg, rgba(107,245,163,.22), rgba(53,217,138,.10));
  border: 1px solid rgba(255,214,110,.55);
  color: #b6ffd8;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 3px 10px -3px rgba(0,0,0,.5);
  margin-bottom: 14px;
}
.cdp-qr-box {
  position: relative; z-index: 5;
  display: inline-block; padding: 14px;
  background: #fff; border-radius: 18px;
  margin-bottom: 14px;
  box-shadow: 0 0 0 3px rgba(255,205,80,.85), 0 0 0 6px rgba(120,80,10,.4), 0 12px 40px rgba(0,0,0,.5);
  animation: cdp-glow-pulse 3s ease-in-out infinite;
}
.cdp-address {
  position: relative; z-index: 5;
  width: 100%;
  appearance: none;
  display: flex; align-items: center; gap: 8px;
  padding: 12px 14px;
  background: rgba(4,6,10,.65);
  border: 1px solid ${t.colors.border.soft};
  border-radius: 12px;
  color: ${t.colors.text.primary};
  cursor: pointer;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 12px;
  transition: all .18s ease;
  -webkit-tap-highlight-color: transparent;
}
.cdp-address:hover { border-color: ${t.colors.emerald[400]}; }
.cdp-address:active { transform: scale(.98); }
.cdp-banner {
  display: flex; align-items: flex-start; gap: 9px;
  margin: 12px 0 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255,196,64,.10);
  border: 1px solid rgba(255,196,64,.42);
  color: ${t.colors.gold[400]};
  font-size: 11.5px; font-weight: 600; line-height: 1.35;
}
.cdp-banner svg { flex: 0 0 auto; margin-top: 1px; }
.cdp-address-text { flex: 1; text-align: left; word-break: break-all; }
.cdp-address-copy {
  flex: 0 0 auto;
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px;
  background: linear-gradient(135deg, ${t.colors.emerald[500]}, ${t.colors.gold[400]});
  color: ${t.colors.surface.abyss};
  border-radius: 8px;
  font-size: 10px; font-weight: 900; letter-spacing: 1px;
  text-transform: uppercase;
}

/* ── Safety info ─────────────────────────────────────────── */
.cdp-info-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid ${t.colors.border.subtle};
}
.cdp-info-row:last-child { border-bottom: none; }
.cdp-info-icon {
  width: 30px; height: 30px; border-radius: 10px;
  background: rgba(0,255,213,.14);
  color: ${t.colors.emerald[400]};
  display: inline-flex; align-items: center; justify-content: center;
  flex: 0 0 auto;
}
.cdp-info-icon[data-warn="true"] { background: rgba(255,201,64,.16); color: ${t.colors.gold[300]}; }
.cdp-info-icon[data-danger="true"] { background: rgba(239,42,76,.16); color: #ff5870; }
.cdp-info-content { flex: 1; }
.cdp-info-label {
  font-size: 12px; font-weight: 800; color: ${t.colors.text.primary};
  margin-bottom: 2px;
}
.cdp-info-sub {
  font-size: 11px; font-weight: 600; color: ${t.colors.text.tertiary};
  line-height: 1.4;
}

/* ── History ─────────────────────────────────────────── */
.cdp-history-empty {
  padding: 24px 16px; text-align: center;
  border: 1px dashed ${t.colors.border.soft};
  border-radius: 14px;
  color: ${t.colors.text.tertiary};
  font-size: 12px; font-weight: 700;
  background: rgba(8,26,18,.55);
}
.cdp-history-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px;
  background: rgba(8,26,18,.62);
  border: 1px solid ${t.colors.border.subtle};
  border-radius: 12px;
}
.cdp-history-row + .cdp-history-row { margin-top: 6px; }
.cdp-history-amt {
  font-size: 14px; font-weight: 900; font-variant-numeric: tabular-nums;
  color: ${t.colors.text.primary};
  flex: 1;
}
.cdp-history-status {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 9px; font-weight: 900;
  letter-spacing: 1.4px; text-transform: uppercase;
}
.cdp-status-pending   { background: rgba(255,201,64,.18); color: ${t.colors.gold[300]}; }
.cdp-status-confirmed { background: rgba(16,185,129,.2); color: ${t.colors.emerald[400]}; }
.cdp-status-failed    { background: rgba(239,42,76,.18); color: #ff5870; }
.cdp-history-time {
  font-size: 10.5px; font-weight: 700;
  color: ${t.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
  flex: 0 0 auto;
}

/* ── Error state ─────────────────────────────────────────── */
.cdp-error {
  text-align: center; padding: 22px 16px;
}
.cdp-error-icon {
  width: 46px; height: 46px; border-radius: 50%;
  background: rgba(255,201,64,.16);
  color: ${t.colors.gold[300]};
  display: inline-flex; align-items: center; justify-content: center;
  margin-bottom: 10px;
}
.cdp-error-title { font-size: 14px; font-weight: 900; color: ${t.colors.text.primary}; margin-bottom: 4px; }
.cdp-error-sub { font-size: 12px; color: ${t.colors.text.tertiary}; }
.cdp-spin { animation: cdp-spin 1s linear infinite; }

/* toast for coming-soon network taps */
.cdp-toast {
  position: fixed; left: 50%; bottom: calc(100px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  padding: 10px 16px;
  background: rgba(4,6,10,.94);
  border: 1px solid ${t.colors.border.gold};
  color: ${t.colors.gold[300]};
  border-radius: 999px;
  font-size: 11px; font-weight: 900; letter-spacing: 1.2px;
  text-transform: uppercase;
  z-index: 60;
  animation: cdp-fade-in .25s ease-out both;
}
`;

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
export default function CryptoDepositPage() {
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

  // Auth (once): resolve the user, ensure their addresses are derived, and read
  // whether EVM deposits are enabled. The per-chain address itself is fetched by
  // the effect below (keyed on the selected network).
  useEffect(() => {
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
  }, []);

  // Per-chain address load — refetches whenever the selected (active) network
  // changes. Only active networks are ever selectable, so this never requests a
  // chain the user can't actually deposit on.
  useEffect(() => {
    if (!userId) return;
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
  }, [userId, selectedKey]);

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

  return (
    <div className="cdp-page">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />

        {/* IA P3: standard V3 page header (back + title), matching the sibling
            deposit pages — replaces the legacy CasinoTopBar chrome. */}
        <header className="cdp-head">
          <button onClick={() => nav(-1)} aria-label="Back" className="cdp-back"><ArrowLeft size={18} /></button>
          <h1 className="cdp-head-title c7p-gold-text">Deposit</h1>
          <div style={{ width: 36 }} />
        </header>

        <div className="cdp-content">
          {/* NETWORKS */}
          <div>
            <div className="c7p-sec cdp-sec"><span className="c7p-sec-ic">🌐</span><span className="c7p-sec-t">Choose network</span><span className="c7p-sec-rule" /></div>
            <div className="cdp-networks">
              {nets.map((n) => (
                <button
                  key={n.key}
                  type="button"
                  className="cdp-network"
                  data-active={n.active && selectedKey === n.key}
                  data-disabled={!n.active || undefined}
                  data-shake={shakeKey === n.key || undefined}
                  onClick={() => onNetworkTap(n)}
                  aria-label={`${n.symbol} on ${n.chain}${n.active ? '' : ' — coming soon'}`}
                >
                  <span className="cdp-network-icon" style={{ ['--cdp-c' as any]: n.color }}>
                    {n.symbol.slice(0, 4)}
                  </span>
                  <span className="cdp-network-meta">
                    <span className="cdp-network-symbol">
                      {n.symbol}
                      {!n.active && <Lock size={11} strokeWidth={2.5} />}
                    </span>
                    <span className="cdp-network-chain">{n.chain}</span>
                  </span>
                  {n.active ? (
                    <span className="cdp-network-tag cdp-tag-active">Active</span>
                  ) : (
                    <span className="cdp-network-tag cdp-tag-soon">Soon</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* QR + ADDRESS */}
          {loading ? (
            <div className="cdp-card" aria-busy="true" aria-label="Loading deposit address" style={{ textAlign: 'center' }}>
              <div className="c7p-skel c7p-skel--line" style={{ width: 130, height: 24, borderRadius: 999, margin: '4px auto 16px' }} />
              <div className="c7p-skel" style={{ width: 190, height: 190, borderRadius: 18, margin: '0 auto 16px' }} />
              <div className="c7p-skel c7p-skel--line" style={{ height: 44, borderRadius: 12 }} />
            </div>
          ) : error ? (
            <div className="cdp-card">
              <div className="cdp-error">
                <span className="cdp-error-icon"><AlertCircle size={24} /></span>
                <div className="cdp-error-title">Deposit unavailable</div>
                <div className="cdp-error-sub">{error}</div>
              </div>
            </div>
          ) : (
            <div className="cdp-card cdp-qr-card">
              <span className="cdp-coins" aria-hidden="true">
                {COIN_CFG.map((c, i) => (
                  <i key={i} className="cdp-coin" style={{ left: c.l, animationDuration: c.d, animationDelay: c.delay }}>$</i>
                ))}
              </span>
              <span className="cdp-qr-chip">
                <ShieldCheck size={12} strokeWidth={2.5} />
                {selected.symbol} · {selected.chainShort}
              </span>
              <div>
                <div className="cdp-qr-box">
                  {address && <QRCodeSVG value={address} size={196} level="M" />}
                </div>
              </div>
              {address && (
                <button className="cdp-address" onClick={copy} aria-label="Copy address">
                  <span className="cdp-address-text">{address}</span>
                  <span className="cdp-address-copy">
                    {copied ? <><Check size={12} strokeWidth={3} /> Copied</> : <><Copy size={12} strokeWidth={2.5} /> Copy</>}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Shared-address / manual-verification notice */}
          {address && !loading && !error && sharedMode && selectedKey === 'trc20' && (
            <div className="cdp-banner">
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
              <div className="c7p-sec cdp-sec"><span className="c7p-sec-ic">📋</span><span className="c7p-sec-t">Deposit details</span><span className="c7p-sec-rule" /></div>
              <div className="cdp-card" style={{ padding: '2px 16px' }}>
                <div className="cdp-info-row">
                  <span className="cdp-info-icon"><Sparkles size={16} /></span>
                  <div className="cdp-info-content">
                    <div className="cdp-info-label">Minimum deposit</div>
                    <div className="cdp-info-sub">{selected.minDeposit} {selected.symbol}</div>
                  </div>
                </div>
                <div className="cdp-info-row">
                  <span className="cdp-info-icon"><Clock size={16} /></span>
                  <div className="cdp-info-content">
                    <div className="cdp-info-label">Confirmations</div>
                    <div className="cdp-info-sub">{selected.confirms} — usually {selected.arrivalMin} min</div>
                  </div>
                </div>
                <div className="cdp-info-row">
                  <span className="cdp-info-icon" data-warn="true"><ShieldAlert size={16} /></span>
                  <div className="cdp-info-content">
                    <div className="cdp-info-label">Send only {selected.symbol} on {selected.chainShort}</div>
                    <div className="cdp-info-sub">Any other coin or network will result in permanent loss.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AUTOMATIC DEPOSIT — on-chain scanners detect + credit; no manual step */}
          {address && (
            <div>
              <div className="c7p-sec cdp-sec"><span className="c7p-sec-ic">⚡</span><span className="c7p-sec-t">Automatic deposit</span><span className="c7p-sec-rule" /></div>
              <div className="cdp-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden="true">⚡</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#6bf5a3' }}>No confirmation needed — it's automatic</div>
                    <div style={{ fontSize: 12, color: t.colors.text.tertiary, marginTop: 4, lineHeight: 1.5 }}>
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
            <div className="c7p-sec cdp-sec">
              <span className="c7p-sec-ic">🧾</span>
              <span className="c7p-sec-t">Recent deposits</span>
              <span className="c7p-sec-rule" />
              <button
                type="button"
                onClick={() => nav('/v3/wallet')}
                style={{ background: 'none', border: 'none', color: t.colors.emerald[400], fontSize: 10, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
              >
                All <ChevronRight size={11} />
              </button>
            </div>
            {history.length === 0 ? (
              <div className="cdp-history-empty">
                No deposits yet. Send {selected.symbol} to the address above to fund your wallet.
              </div>
            ) : (
              <div>
                {history.map((d) => (
                  <div key={d.id} className="cdp-history-row">
                    <div className="cdp-history-amt">${d.amount.toFixed(2)}</div>
                    <span className={`cdp-history-status cdp-status-${d.status}`}>
                      {d.status === 'pending' && <><span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: t.colors.gold[300], marginRight: 4, animation: 'cdp-pulse 1.3s ease-in-out infinite', verticalAlign: 'middle' }} />Pending</>}
                      {d.status === 'confirmed' && 'Confirmed'}
                      {d.status === 'failed' && 'Failed'}
                    </span>
                    <span className="cdp-history-time">{relativeTime(d.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Play-while-you-wait games teaser (real catalog → lobby) */}
          <DepositGamesStrip />
        </div>

        {toast && <div className="cdp-toast">{toast}</div>}
    </div>
  );
}

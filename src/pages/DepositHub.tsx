/**
 * DepositHub — the single deposit entry point (`/deposit`).
 *
 * Honesty-first ordering: only methods that ACTUALLY credit today are shown as
 * active (top), and methods whose backend isn't ready are shown greyed in a
 * "Coming soon / maintenance" group — tapping them shows a helpful toast instead
 * of dead-ending on a broken page.
 *
 * Working today:
 *   • UPI (Razorpay gateway)      → /deposit/razorpay  [RECOMMENDED]
 *   • USDT TRC20 (auto-credit)    → /deposit/crypto
 *   • Bank transfer (Razorpay)    → /deposit/razorpay
 * Not ready (kept visible but disabled):
 *   • Card / Razorpay — same gateway, shown once enabled                  → MAINTENANCE
 *   • PayPal          — backend/functions not deployed                    → SOON
 *
 * UPI/Bank route into the Razorpay checkout (Razorpay handles UPI natively).
 * That page self-gates: if the operator hasn't enabled Razorpay + set its keys
 * (Admin → Payment Gateways + RAZORPAY_* secrets), it shows a "not available"
 * notice instead of a broken checkout. To add PayPal: deploy its functions +
 * credentials, then set `paypal` status to 'active'.
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, ShieldCheck, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { usePlatformMode } from '@/hooks/usePlatformMode';
import HdrScreen from '@/components/casino/HdrScreen';
import LuxFrameFX from '@/components/c7/shell/LuxFrameFX';
import C7Icon from '@/components/c7/C7Icon';

/* ── Real brand logos (inline SVG, self-contained) ──────────────────────── */

const UpiLogo = (
  <svg viewBox="0 0 78 34" width="100%" height="100%" aria-hidden="true">
    <path d="M10 4 24 17 10 30 16 30 30 17 16 4Z" fill="#e6771f" />
    <path d="M22 4 36 17 22 30 27 30 41 17 27 4Z" fill="#0a8f43" />
    <text x="45" y="24" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="800" fill="#0d2a5c">UPI</text>
  </svg>
);

const UsdtLogo = (
  <svg viewBox="0 0 34 34" width="100%" height="100%" aria-hidden="true">
    <circle cx="17" cy="17" r="16" fill="#26A17B" />
    <path fill="#fff" d="M19 15.6v-1.5h4V11H11v3.1h4v1.5c-3.3.1-5.8.8-5.8 1.6s2.5 1.5 5.8 1.6v5.1h4v-5.1c3.3-.1 5.8-.8 5.8-1.6s-2.5-1.5-5.8-1.6zm0 2.6c-.1 0-.9.1-1.9.1-1.2 0-1.7 0-1.9-.1-2.8-.1-4.9-.6-4.9-1.2s2.1-1.1 4.9-1.2v1.9c.2 0 .8.1 1.9.1.9 0 1.7 0 1.9-.1v-1.9c2.8.1 4.9.6 4.9 1.2s-2.1 1.1-4.9 1.2z" />
  </svg>
);

const BankLogo = (
  <svg viewBox="0 0 40 34" width="100%" height="100%" aria-hidden="true">
    <path d="M20 3 36 12 4 12Z" fill="#0a8f43" />
    <circle cx="20" cy="9" r="1.6" fill="#ffd24d" />
    <g fill="#0d2a5c">
      <rect x="8" y="13.5" width="3" height="12" rx="0.6" />
      <rect x="15" y="13.5" width="3" height="12" rx="0.6" />
      <rect x="22" y="13.5" width="3" height="12" rx="0.6" />
      <rect x="29" y="13.5" width="3" height="12" rx="0.6" />
    </g>
    <rect x="5" y="26" width="30" height="3.2" rx="1" fill="#0a8f43" />
  </svg>
);

const CardLogo = (
  <svg viewBox="0 0 92 34" width="100%" height="100%" aria-hidden="true">
    <circle cx="20" cy="17" r="12" fill="#EB001B" />
    <circle cx="33" cy="17" r="12" fill="#F79E1B" fillOpacity="0.92" />
    <text x="50" y="24" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="900" fontStyle="italic" fill="#1a1f71">VISA</text>
  </svg>
);

const PaypalLogo = (
  <svg viewBox="0 0 82 34" width="100%" height="100%" aria-hidden="true">
    <text x="6" y="24" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900" fontStyle="italic" fill="#003087">Pay</text>
    <text x="42" y="24" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900" fontStyle="italic" fill="#009cde">Pal</text>
  </svg>
);

type Status = 'active' | 'maintenance' | 'soon';
type Tone = 'good' | 'warn' | 'mute';
type Method = {
  key: string;
  logo: JSX.Element;
  plate: string;
  title: string;
  subtitle: string;
  route: string;
  status: Status;
  badge?: string;
  badgeTone?: Tone;
};

const METHODS: Method[] = [
  { key: 'crypto', logo: UsdtLogo, plate: '#eafff6', title: 'USDT · TRC20', subtitle: 'Send USDT · auto-credited on-chain',
    route: '/deposit/crypto', status: 'active', badge: 'RECOMMENDED', badgeTone: 'good' },
  // Razorpay removed per operator. Card (Stripe) + PayPal are being wired next —
  // a Card tile is added back only once its auto-credit chain is live, so we
  // never surface a method that takes money without crediting the wallet.
];

export default function DepositHub() {
  const navigate = useNavigate();
  const mode = usePlatformMode();

  const onTap = (m: Method) => {
    if (m.status === 'active') {
      try { navigator.vibrate?.(8); } catch { /* noop */ }
      navigate(m.route);
    } else {
      toast('Please use USDT crypto for an instant deposit — this method is coming soon.');
    }
  };

  const active = METHODS.filter((m) => m.status === 'active');
  const other = METHODS.filter((m) => m.status !== 'active');

  const Tile = (m: Method) => (
    <button
      key={m.key}
      className="jr-card c7p-tile"
      data-disabled={m.status !== 'active'}
      onClick={() => onTap(m)}
    >
      <span className="jr-reel">
        <span className="jr-plate" style={{ background: m.plate }}>{m.logo}</span>
        {m.badge && <span className={`jr-badge2 jr-badge2--${m.badgeTone ?? 'mute'}`}>{m.badge}</span>}
      </span>
      <span className="jr-name">{m.title}</span>
      <span className="jr-sub">{m.subtitle}</span>
    </button>
  );

  return (
    <HdrScreen pad={130}>
      <Styles />
      <div className="jr-bg">
        <header className="jr-header c7-lux-head">
          <LuxFrameFX />
          <button onClick={() => navigate(-1)} aria-label="Back" className="jr-back"><ArrowLeft size={18} /></button>
          <h1 className="jr-h1 c7p-gold-text">Deposit</h1>
          <div style={{ width: 36 }} />
        </header>

        <p className="jr-lead">Instant deposit — credited within ~30 min after verification</p>

        {/* Slim gold context card — mirrors the lobby welcome-bonus surface (real
            app content, links to the Rewards hub; no invented figures here). */}
        <button className="c7p-card-gold jr-bonus" onClick={() => navigate('/v3/rewards')}>
          <span className="jr-bonus-ic" aria-hidden="true"><C7Icon name="gift" size={24} /></span>
          <span className="jr-bonus-tx">
            <b>Welcome bonus — 100% up to $10,000</b>
            <small>Fund your wallet, then claim it in Rewards</small>
          </span>
          <ChevronRight size={18} className="jr-bonus-chev" />
        </button>

        {/* Free-play faucet — demo mode only */}
        {mode === 'demo' && (
          <button className="jr-demo" onClick={() => navigate('/deposit/demo')}>
            <span className="jr-demo-ic"><Sparkles size={18} color="#0c2a1c" /></span>
            <span className="jr-demo-body">
              <span className="jr-demo-title">Free-play coins <span className="jr-badge">DEMO</span></span>
              <span className="jr-demo-sub">Instant · No real money</span>
            </span>
            <ChevronRight size={18} color="rgba(255,255,255,0.5)" />
          </button>
        )}

        <div className="c7p-sec jr-sec"><span className="c7p-sec-ic">💳</span><span className="c7p-sec-t">Payment methods</span><span className="c7p-sec-rule" /></div>
        <div className={`jr-grid${active.length === 1 ? ' jr-grid--single' : ''}`}>{active.map(Tile)}</div>

        {/* Compact trust / context strip */}
        <div className="jr-trust">
          <span className="jr-trust-c"><C7Icon name="bolt" size={12} /> Instant</span>
          <span className="jr-trust-c"><C7Icon name="shield" size={12} /> ~30 min settlement</span>
          <span className="jr-trust-c"><C7Icon name="check" size={12} /> Auto-credit</span>
        </div>

        {other.length > 0 && (
          <>
            <p className="jr-divider">Coming soon / maintenance</p>
            <div className="jr-grid">{other.map(Tile)}</div>
          </>
        )}

        <p className="jr-foot"><ShieldCheck size={11} style={{ verticalAlign: -1 }} /> All deposits are credited server-side after confirmation.</p>
      </div>
    </HdrScreen>
  );
}

function Styles() {
  return (
    <style>{`
      @keyframes jr-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      .jr-spin { animation: jr-spin 1s linear infinite; }

      /* Jungle canvas */
      .jr-bg {
        min-height: 100%;
        background:
          radial-gradient(120% 60% at 50% -6%, rgba(120,240,176,0.14), transparent 55%),
          radial-gradient(90% 50% at 12% 20%, rgba(37,180,110,0.20), transparent 60%),
          radial-gradient(90% 50% at 92% 40%, rgba(11,122,63,0.28), transparent 60%),
          linear-gradient(172deg, #0d3d28 0%, #072517 46%, #04160d 100%);
      }
      .jr-header {
        position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 12px; padding: 14px 16px;
        background: linear-gradient(180deg, rgba(4,24,13,0.92), rgba(4,24,13,0.6)); backdrop-filter: blur(16px);
        border-bottom: 1px solid rgba(120,240,176,0.22);
      }
      .jr-header::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; pointer-events: none;
        background: linear-gradient(90deg, transparent, rgba(46,230,130,0.85), rgba(255,214,120,0.95), rgba(46,230,130,0.85), transparent);
        background-size: 220% 100%; animation: jr-topglimmer 5.5s linear infinite; opacity: 0.9; }
      @keyframes jr-topglimmer { 0% { background-position: 220% 0; } 100% { background-position: -220% 0; } }
      @media (prefers-reduced-motion: reduce) { .jr-header::after, .jr-demo-ic, .jr-demo-ic svg, .jr-plate svg { animation: none !important; } }
      .jr-back { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.06); border: none; color: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
      /* Title gold now comes from .c7p-gold-text (matches sibling deposit pages) */
      .jr-h1 { flex: 1; text-align: center; margin: 0; font-size: 18px; font-weight: 800; letter-spacing: 0.3px; }
      .jr-lead { margin: 16px 16px 6px; font-size: 12.5px; font-weight: 600; color: #cfe9d8; }

      /* Slim gold context card (c7p-card-gold) */
      .jr-bonus { width: calc(100% - 32px); margin: 10px 16px 2px; display: flex; align-items: center; gap: 12px; padding: 12px 14px;
        text-align: left; font-family: inherit; cursor: pointer; }
      .jr-bonus-ic { flex: 0 0 auto; font-size: 24px; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4)); }
      .jr-bonus-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .jr-bonus-tx b { font-size: 13.5px; font-weight: 900; color: #ffe9a8; }
      .jr-bonus-tx small { font-size: 11px; color: rgba(255,255,255,0.6); }
      .jr-bonus-chev { flex: 0 0 auto; color: rgba(255,255,255,0.5); }

      /* Section header + single-method full width + trust strip */
      .jr-sec { margin: 16px 16px 2px; }
      .jr-grid--single { grid-template-columns: 1fr; }
      .jr-trust { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 16px 2px; }
      .jr-trust-c { font-size: 10.5px; font-weight: 800; color: #cfe9d8; padding: 6px 11px; border-radius: 999px;
        background: rgba(0,0,0,0.25); border: 1px solid rgba(120,240,176,0.3); }

      /* Demo faucet row */
      .jr-demo { width: calc(100% - 32px); margin: 6px 16px 2px; display: flex; align-items: center; gap: 12px; padding: 13px 14px; cursor: pointer;
        border-radius: 16px; text-align: left; font-family: inherit; border: 1px solid rgba(120,240,176,0.42);
        background: radial-gradient(140% 90% at 0% 0%, rgba(53,217,138,0.20), transparent 60%), linear-gradient(160deg, #0f7a4e, #05301e);
        box-shadow: inset 0 0 0 1px rgba(245,180,35,0.12), inset 0 1px 0 rgba(255,247,220,0.12), 0 10px 24px -12px rgba(0,0,0,0.6); }
      .jr-demo-ic { position: relative; width: 40px; height: 40px; flex: 0 0 40px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(180deg,#9be7bf,#26a17b);
        box-shadow: 0 0 0 1px rgba(245,180,35,0.3), inset 0 1.5px 0 rgba(255,255,255,0.5), 0 5px 14px -6px rgba(38,161,123,0.6);
        animation: jr-icfloat 3.4s ease-in-out infinite; will-change: transform; }
      .jr-demo-ic svg { animation: jr-icglow 2.8s ease-in-out infinite; }
      @keyframes jr-icfloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
      @keyframes jr-icglow { 0%,100% { filter: drop-shadow(0 1px 1px rgba(0,0,0,0.35)); } 50% { filter: drop-shadow(0 0 6px rgba(155,231,191,0.9)) brightness(1.08); } }
      .jr-demo-body { display: flex; flex-direction: column; gap: 2px; flex: 1; }
      .jr-demo-title { font-size: 14px; font-weight: 800; color: #fff; display: inline-flex; align-items: center; gap: 8px; }
      .jr-demo-sub { font-size: 11px; color: rgba(255,255,255,0.55); }

      /* Divider label between working + coming-soon groups */
      .jr-divider { margin: 16px 16px 2px; font-size: 10.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.4);
        display: flex; align-items: center; gap: 10px; }
      .jr-divider::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, rgba(120,240,176,0.3), transparent); }

      /* Portrait reel grid */
      .jr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px 16px 6px; }
      /* Card layout only — the c7p-tile primitive supplies the emerald-glass
         frame, gold hairline, gloss + press/hover motion. */
      .jr-card {
        display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px 12px 15px;
        font-family: inherit; text-align: center; border-radius: 16px;
      }
      .jr-card[data-disabled="true"] { opacity: 0.52; cursor: not-allowed; }
      .jr-card[data-disabled="true"] .jr-name { color: rgba(255,255,255,0.6); }

      /* Emerald-glass window holding the brand-logo plate (was a grey slot reel) */
      .jr-reel { position: relative; width: 100%; aspect-ratio: 16/10; border-radius: 13px; overflow: hidden; display: grid; place-items: center;
        background: linear-gradient(180deg, #0f6644, #0a4a30);
        border: 1px solid rgba(246,201,69,0.30);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 18px rgba(0,0,0,0.3); }
      .jr-card[data-disabled="true"] .jr-reel { filter: grayscale(0.85); }
      .jr-plate { position: relative; z-index: 1; width: 78%; height: 62%; border-radius: 9px; display: grid; place-items: center; padding: 7px 9px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.18); }
      .jr-plate svg { max-width: 100%; max-height: 100%; }
      .jr-card:not([data-disabled="true"]) .jr-plate svg { animation: jr-plateglow 3.2s ease-in-out infinite; will-change: filter; }
      @keyframes jr-plateglow { 0%,100% { filter: drop-shadow(0 0 0 transparent); } 50% { filter: drop-shadow(0 0 5px rgba(120,240,176,0.7)) brightness(1.05); } }

      .jr-name { font-size: 15px; font-weight: 900; color: #d6ffe9; letter-spacing: 0.3px; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
      .jr-sub { font-size: 10.5px; font-weight: 600; color: rgba(255,255,255,0.6); line-height: 1.25; }

      /* Status badge on the reel */
      .jr-badge2 { position: absolute; top: 7px; right: 7px; z-index: 3; font-size: 8px; font-weight: 900; letter-spacing: 0.5px; padding: 3px 7px; border-radius: 999px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.35); }
      .jr-badge2--good { background: linear-gradient(180deg,#37d67f,#0e9a4e); color: #04180d; }
      .jr-badge2--warn { background: linear-gradient(180deg,#ffcf4a,#e0a11a); color: #3a2200; }
      .jr-badge2--mute { background: rgba(0,0,0,0.6); color: #cbd5cc; }
      .jr-badge { font-size: 9px; font-weight: 800; letter-spacing: 0.6px; padding: 2px 6px; border-radius: 999px; background: rgba(37,180,110,0.3); color: #bff4d8; }

      .jr-foot { margin: 10px 16px 0; text-align: center; font-size: 10px; color: rgba(255,255,255,0.45); }
    `}</style>
  );
}

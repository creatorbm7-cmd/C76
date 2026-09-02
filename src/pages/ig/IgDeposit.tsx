/**
 * IgDeposit — Instagram-light reskin of the single deposit entry point (`/deposit`).
 *
 * Presentation-only port of DepositHub: identical hooks, routes, gating and honest
 * ordering — only methods that ACTUALLY credit today are shown as active (top);
 * not-ready methods stay visible but disabled and show a helpful toast instead of
 * dead-ending. Reskinned to the IG-light design system (white cards, hairline
 * borders, green primary accents, gold for the bonus surface).
 *
 * Working today:
 *   • USDT TRC20 (auto-credit) → /deposit/crypto  [RECOMMENDED]
 *
 * The welcome-bonus surface links to the Rewards hub; the free-play faucet is shown
 * in demo platform mode only and routes to /deposit/demo. Back uses navigate(-1).
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, ShieldCheck, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { usePlatformMode } from '@/hooks/usePlatformMode';
import { PRESENTATION_ONLY } from '@/lib/presentationMode';
import C7Icon from '@/components/c7/C7Icon';
import C7FeatureIcon from '@/components/c7/C7FeatureIcon';
import IgTabBar from '@/components/ig/IgTabBar';
import IgSocialNotice from "@/components/ig/IgSocialNotice";

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
    route: '/ig/deposit/crypto', status: 'active', badge: 'RECOMMENDED', badgeTone: 'good' },
  // Razorpay removed per operator. Card (Stripe) + PayPal are being wired next —
  // a Card tile is added back only once its auto-credit chain is live, so we
  // never surface a method that takes money without crediting the wallet.
];

export default function IgDeposit() {
  const navigate = useNavigate();
  const mode = usePlatformMode();

  // Free-play / demo safety gate: in demo platform mode (or a presentation-only
  // build) real-money deposit methods are disabled so no real crypto address is
  // ever reachable — only the free-play faucet works. Rails/logic unchanged.
  const demoLike = PRESENTATION_ONLY || mode === 'demo';
  const methods: Method[] = demoLike
    ? METHODS.map((m) => ({ ...m, status: 'soon' as Status, badge: 'DEMO', badgeTone: 'mute' as Tone, subtitle: 'Real deposits are off in free-play mode' }))
    : METHODS;

  const onTap = (m: Method) => {
    if (m.status === 'active') {
      try { navigator.vibrate?.(8); } catch { /* noop */ }
      navigate(m.route);
    } else if (demoLike) {
      toast('Free-play mode — real deposits are off. Grab free-play coins below.');
    } else {
      toast('Please use USDT crypto for an instant deposit — this method is coming soon.');
    }
  };

  const active = methods.filter((m) => m.status === 'active');
  const other = methods.filter((m) => m.status !== 'active');

  const Tile = (m: Method) => (
    <button
      key={m.key}
      className="igdep-tile"
      data-disabled={m.status !== 'active'}
      aria-disabled={m.status !== 'active'}
      onClick={() => onTap(m)}
    >
      <span className="igdep-reel">
        <span className="igdep-plate" style={{ background: m.plate }}>{m.logo}</span>
        {m.badge && <span className={`igdep-badge2 igdep-badge2--${m.badgeTone ?? 'mute'}`}>{m.badge}</span>}
      </span>
      <span className="igdep-name">{m.title}</span>
      <span className="igdep-sub">{m.subtitle}</span>
    </button>
  );

  return (
    <div className="ig igdep">
      <style>{CSS}</style>

      <header className="ig-top">
        <button className="igdep-back" onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft size={22} /></button>
        <span className="ig-ttl">Deposit</span>
        <span style={{ width: 22 }} />
      </header>

      <main className="ig-main igdep-main">
        <div className="ige-hero">
          <img src="/icons/v2/deposit.png" alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          <span className="igct-sub">Instant deposit — USDT auto-credited</span>
        </div>

        {/* Slim gold context card — mirrors the lobby welcome-bonus surface (real
            app content, links to the Rewards hub; no invented figures here). */}
        <button className="igdep-bonus" onClick={() => navigate('/ig/rewards')}>
          <span className="igdep-bonus-ic" aria-hidden="true"><C7FeatureIcon slot="icon.rewards" ic="gift" size={30} svgSize={24} /></span>
          <span className="igdep-bonus-tx">
            <b>Welcome bonus — 10,000 bonus coins</b>
            <small>Claim your welcome coins in Rewards</small>
          </span>
          <ChevronRight size={18} className="igdep-bonus-chev" />
        </button>

        {/* Free-play faucet — demo mode only */}
        {mode === 'demo' && (
          <button className="igdep-demo" onClick={() => navigate('/ig/deposit/demo')}>
            <span className="igdep-demo-ic"><Sparkles size={18} color="#2ee08a" /></span>
            <span className="igdep-demo-body">
              <span className="igdep-demo-title">Free-play coins <span className="igdep-badge">DEMO</span></span>
              <span className="igdep-demo-sub">Instant · No real money</span>
            </span>
            <ChevronRight size={18} className="igdep-demo-chev" />
          </button>
        )}

        <div className="igdep-sec"><span className="igdep-sec-ic">💳</span><span className="igdep-sec-t">Payment methods</span><span className="igdep-sec-rule" /></div>
        <div className={`igdep-grid${active.length === 1 ? ' igdep-grid--single' : ''}`}>{active.map(Tile)}</div>

        {/* Compact trust / context strip */}
        <div className="igdep-trust">
          <span className="igdep-trust-c"><C7Icon name="bolt" size={12} /> Instant</span>
          <span className="igdep-trust-c"><C7Icon name="shield" size={12} /> ~30 min settlement</span>
          <span className="igdep-trust-c"><C7Icon name="check" size={12} /> Auto-credit</span>
        </div>

        {other.length > 0 && (
          <>
            <p className="igdep-divider">Coming soon / maintenance</p>
            <div className="igdep-grid">{other.map(Tile)}</div>
          </>
        )}

        <p className="igdep-foot"><ShieldCheck size={11} style={{ verticalAlign: -1 }} /> All deposits are credited server-side after confirmation.</p>

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
.igdep-back { background:none; border:none; color:#d6ffe9; cursor:pointer; display:grid; place-items:center; }
.ig-ttl { font-size:18px; font-weight:800; color:#f3ffe9; }
.ig-main { max-width:560px; margin:0 auto; }

.igdep-main { padding:14px 12px; }
.igdep-lead { margin:2px 4px 12px; font-size:12.5px; font-weight:600; color:var(--mut); }

/* Gold welcome-bonus context card — the page hero: emerald glass + gold glint */
.igdep-bonus { position:relative; width:100%; display:flex; align-items:center; gap:12px; padding:14px 15px; margin-bottom:10px;
  border-radius:16px; text-align:left; font-family:inherit; cursor:pointer; overflow:hidden;
  background:radial-gradient(130% 120% at 100% 0%, rgba(240,201,74,0.16), transparent 58%), linear-gradient(160deg,#12492f,#06180f);
  border:1px solid var(--line); box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igdep-bonus::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(105deg, transparent 40%, rgba(246,230,176,0.10) 50%, transparent 60%); }
.igdep-bonus:active { transform:translateY(1px); }
.igdep-bonus-ic { position:relative; z-index:1; flex:0 0 auto; width:42px; height:42px; border-radius:12px; display:grid; place-items:center;
  background:radial-gradient(120% 120% at 50% 18%, #1a5738, #0b2418); border:1px solid var(--line); color:#ffe9a8; }
.igdep-bonus-tx { position:relative; z-index:1; flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.igdep-bonus-tx b { font-size:13.5px; font-weight:800; background:linear-gradient(180deg,#fff6d5,#f0c94a 60%,#c68a2e); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.igdep-bonus-tx small { font-size:11px; color:var(--mut); }
.igdep-bonus-chev { position:relative; z-index:1; flex:0 0 auto; color:var(--gold); }

/* Demo faucet row — premium emerald glass */
.igdep-demo { width:100%; display:flex; align-items:center; gap:12px; padding:13px 14px; margin-bottom:4px; cursor:pointer;
  border-radius:16px; text-align:left; font-family:inherit;
  background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igdep-demo:active { transform:translateY(1px); }
.igdep-demo-ic { width:40px; height:40px; flex:0 0 40px; border-radius:12px; display:grid; place-items:center;
  background:radial-gradient(120% 120% at 50% 18%, #1a5738, #0b2418); border:1px solid var(--line); }
.igdep-demo-body { display:flex; flex-direction:column; gap:2px; flex:1; }
.igdep-demo-title { font-size:14px; font-weight:800; color:var(--ink); display:inline-flex; align-items:center; gap:8px; }
.igdep-demo-sub { font-size:11px; color:var(--mut); }
.igdep-demo-chev { flex:0 0 auto; color:var(--mut); }
.igdep-badge { font-size:9px; font-weight:800; letter-spacing:0.6px; padding:2px 6px; border-radius:999px; background:rgba(46,224,138,0.16); color:var(--grn); border:1px solid rgba(46,224,138,0.34); }

/* Section header */
.igdep-sec { display:flex; align-items:center; gap:8px; margin:18px 4px 2px; }
.igdep-sec-ic { font-size:15px; }
.igdep-sec-t { font-size:13px; font-weight:800; color:#f3ffe9; }
.igdep-sec-rule { flex:1; height:1px; background:var(--line); }

/* Method grid */
.igdep-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:12px 4px 6px; }
.igdep-grid--single { grid-template-columns:1fr; }
.igdep-tile { display:flex; flex-direction:column; align-items:center; gap:8px; padding:14px 12px 16px;
  font-family:inherit; text-align:center; border-radius:16px; cursor:pointer;
  background:linear-gradient(180deg, rgba(18,63,41,0.9), rgba(8,30,19,0.92)); border:1px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.1), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igdep-tile:active { transform:translateY(1px); }
/* Recommended (single active) tile highlighted with a stronger gold hairline + glow */
.igdep-grid--single .igdep-tile { border-color:rgba(240,201,74,0.5);
  box-shadow:inset 0 1px 0 rgba(246,230,176,0.14), 0 0 22px -8px rgba(240,201,74,0.45), 0 14px 34px -18px rgba(0,0,0,0.8); }
.igdep-tile[data-disabled="true"] { opacity:0.55; cursor:not-allowed; }
.igdep-tile[data-disabled="true"] .igdep-name { color:var(--mut); }

.igdep-reel { position:relative; width:100%; aspect-ratio:16/10; border-radius:13px; overflow:hidden; display:grid; place-items:center;
  background:radial-gradient(120% 120% at 50% 18%, #12492f, #06180f); border:1px solid var(--line); }
.igdep-tile[data-disabled="true"] .igdep-reel { filter:grayscale(0.85); }
/* Keep a light logo plate so brand marks stay legible */
.igdep-plate { position:relative; z-index:1; width:78%; height:62%; border-radius:9px; display:grid; place-items:center; padding:7px 9px;
  background:#fff; box-shadow:inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 8px rgba(0,0,0,0.45); }
.igdep-plate svg { max-width:100%; max-height:100%; }

.igdep-name { font-size:15px; font-weight:800; color:#f3ffe9; letter-spacing:0.2px; }
.igdep-sub { font-size:10.5px; font-weight:600; color:var(--mut); line-height:1.25; }

/* RECOMMENDED / status badge on the reel */
.igdep-badge2 { position:absolute; top:7px; right:7px; z-index:3; font-size:8px; font-weight:900; letter-spacing:0.5px; padding:3px 7px; border-radius:999px; color:#0a2410; }
.igdep-badge2--good { background:linear-gradient(180deg,#fff3c8,#f0c94a 55%,#c68a2e); box-shadow:inset 0 1px 0 rgba(255,255,255,0.6), 0 4px 12px -4px rgba(240,201,74,0.6); }
.igdep-badge2--warn { background:linear-gradient(180deg,#fff3c8,#f0c94a 55%,#c68a2e); }
.igdep-badge2--mute { background:rgba(9,32,20,0.7); color:var(--mut); border:1px solid var(--line); }

/* Trust strip */
.igdep-trust { display:flex; flex-wrap:wrap; gap:8px; padding:6px 4px 2px; }
.igdep-trust-c { display:inline-flex; align-items:center; gap:5px; font-size:10.5px; font-weight:700; color:var(--grn);
  padding:6px 11px; border-radius:999px; background:rgba(46,224,138,0.1); border:1px solid rgba(46,224,138,0.28); }

/* Divider between working + coming-soon */
.igdep-divider { margin:18px 4px 2px; font-size:10.5px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:var(--mut);
  display:flex; align-items:center; gap:10px; }
.igdep-divider::after { content:""; flex:1; height:1px; background:var(--line); }

.igdep-foot { margin:14px 4px 0; text-align:center; font-size:10px; color:var(--mut); }

/* ══ RICH POLISH v2 — felt gold-horizon, gold chrome, animated bonus sheen ══
   Presentation only; no hooks, routes, gating or logic touched. Brings Deposit
   to the same top-rich bar as Wallet / Withdraw / Home. */
.ig { background:
    radial-gradient(120% 58% at 50% -10%, rgba(240,201,74,0.10) 0%, transparent 46%),
    radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%),
    linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%) !important; background-attachment:fixed; }
.ig-top { box-shadow:0 1px 0 rgba(240,201,74,0.22), 0 10px 24px -16px rgba(0,0,0,0.7); }
.ig-ttl { background:linear-gradient(180deg,#fff3c8,#f0c94a 55%,#c68a2e); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; text-shadow:0 0 14px rgba(240,201,74,0.3); }
/* WELCOME-BONUS HERO → full gold-cabinet frame + animated sheen sweep */
.igdep-bonus { border-color:transparent !important;
  box-shadow:
    inset 0 0 0 1.4px rgba(240,201,74,0.55),
    inset 0 1.6px 0 rgba(255,255,255,0.3),
    inset 0 0 26px rgba(46,224,138,0.14),
    0 0 24px -8px rgba(240,201,74,0.5),
    0 20px 44px -22px rgba(0,0,0,0.86) !important; }
.igdep-bonus::after { animation:igdepSweep 5.5s ease-in-out infinite; }
@keyframes igdepSweep { 0%,72% { transform:translateX(-120%); } 88%,100% { transform:translateX(120%); } }
/* RECOMMENDED tile → warmer gold ring + glow to match the hero */
.igdep-grid--single .igdep-tile { border-color:transparent !important;
  box-shadow:
    inset 0 0 0 1.3px rgba(240,201,74,0.5),
    inset 0 1.4px 0 rgba(255,255,255,0.26),
    inset 0 0 20px rgba(46,224,138,0.12),
    0 0 22px -8px rgba(240,201,74,0.5),
    0 16px 36px -20px rgba(0,0,0,0.84) !important; }

@media (prefers-reduced-motion: reduce) { .ig *, .ig *::before, .ig *::after { animation:none !important; transition:none !important; } }
`;

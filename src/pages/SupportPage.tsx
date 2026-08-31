/**
 * SupportPage — help & support hub (/support).
 *
 * On-brand green page: contact channels (live chat / Telegram / email), a short
 * FAQ, and quick links to Responsible Gambling and KYC. No backend required —
 * pure links, so it is safe and instant. Reached from the side menu / drawer.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Mail, Send, ChevronDown, ShieldCheck, LifeBuoy } from 'lucide-react';
import LuxFrameFX from '@/components/c7/shell/LuxFrameFX';

const FAQ: { q: string; a: string }[] = [
  { q: 'How do I deposit?', a: 'Open Wallet → Deposit. UPI is instant; crypto (USDT) credits after network confirmations.' },
  { q: 'How long do withdrawals take?', a: 'Withdrawals are processed to your USDT wallet, usually within a few minutes after review.' },
  { q: 'Why do I need KYC?', a: 'Identity verification (KYC) is required before withdrawals to keep your account and funds secure.' },
  { q: 'Are the games fair?', a: 'Yes — games are provably fair (HMAC-SHA256 of server seed + client seed + nonce). You can verify every round.' },
  { q: 'I found a problem — what do I do?', a: 'Contact us via live chat or email below with your account email and a screenshot; we respond fast.' },
];

const CHANNELS = [
  { icon: MessageCircle, label: 'Live Chat', sub: 'Fastest — 24/7 on Telegram', href: 'https://t.me/Creator744', c1: '#1ec46a', c2: '#0b7a3f' },
  { icon: Send,          label: 'Telegram', sub: '@Creator744', href: 'https://t.me/Creator744', c1: '#2dd4a6', c2: '#0f766e' },
  { icon: Mail,          label: 'Email',    sub: 'support@c7winners.com', href: 'mailto:support@c7winners.com', c1: '#f59e0b', c2: '#b45309' },
];

export default function SupportPage() {
  const nav = useNavigate();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="c7p-page c7p-pg-root">
      <style>{SP_CSS}</style>
      <header className="c7p-pg-bar c7-lux-head">
        <LuxFrameFX />
        <button className="c7p-pg-back" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <span className="c7p-pg-title c7p-gold-text">Support</span>
        <LifeBuoy size={18} className="sp-hd-ic" style={{ marginLeft: 'auto' }} />
      </header>

      <main className="c7p-pg-main">
        <section className="c7p-glass sp-hero">
          <span className="sp-hero-ic"><LifeBuoy size={22} /></span>
          <div className="sp-hero-tx">
            <div className="sp-hero-t">We're here 24/7</div>
            <div className="sp-hero-s">Real humans, fast replies — reach us any time.</div>
          </div>
          <a href="https://t.me/Creator744" target="_blank" rel="noreferrer" className="c7p-btn-green sp-hero-cta">
            <MessageCircle size={16} /> Live Chat
          </a>
        </section>

        <div className="c7p-sec sp-sec"><span className="c7p-sec-ic">💬</span><span className="c7p-sec-t">Contact us</span><span className="c7p-sec-rule" /></div>
        <div style={{ display: 'grid', gap: 10 }}>
          {CHANNELS.map((c) => (
            <a key={c.label} href={c.href} target="_blank" rel="noreferrer" className="c7p-panel sp-ch">
              <span className="sp-ch-ic" style={{ background: `linear-gradient(150deg, ${c.c1}, ${c.c2})` }}>
                <c.icon size={20} color="#fff" />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>{c.label}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>{c.sub}</span>
              </span>
            </a>
          ))}
        </div>

        <div className="c7p-sec sp-sec"><span className="c7p-sec-ic">❓</span><span className="c7p-sec-t">FAQ</span><span className="c7p-sec-rule" /></div>
        <div style={{ display: 'grid', gap: 8 }}>
          {FAQ.map((f, i) => (
            <div key={i} className="c7p-panel sp-faq">
              <button onClick={() => setOpen(open === i ? null : i)} className="sp-faq-q">
                <span className="sp-faq-qt">{f.q}</span>
                <ChevronDown size={16} className="sp-faq-chev" style={{ transform: open === i ? 'rotate(180deg)' : 'none' }} />
              </button>
              {open === i && <div className="sp-faq-a">{f.a}</div>}
            </div>
          ))}
        </div>

        <div className="c7p-sec sp-sec"><span className="c7p-sec-ic">🔗</span><span className="c7p-sec-t">Quick links</span><span className="c7p-sec-rule" /></div>
        <div className="sp-links">
          <button onClick={() => nav('/kyc')} className="c7p-panel sp-row"><ShieldCheck size={16} color="#ffd97a" /> Verify Identity (KYC)</button>
          <button onClick={() => nav('/responsible')} className="c7p-panel sp-row">🧭 Responsible Gambling</button>
        </div>

        <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 20, fontWeight: 600 }}>18+ · Play responsibly · Provably fair</div>
      </main>
    </div>
  );
}

const SP_CSS = `
.sp-hd-ic { color: #ffd24d; }
.sp-sec { margin: 6px 2px 10px; }
.sp-sec:not(:first-child) { margin-top: 22px; }
/* Compact hero — shared c7p-glass frame; 24/7 reassurance + Live Chat CTA */
.sp-hero { display: flex; align-items: center; gap: 13px; padding: 15px 16px; }
.sp-hero-ic { flex-shrink: 0; width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center; color: #04240f;
  background: radial-gradient(120% 120% at 50% 0%, #b6ffdd, #2ee08a 52%, #0a7a3c); box-shadow: inset 0 1px 0 rgba(255,255,255,0.32), 0 4px 12px -5px rgba(0,0,0,0.6); }
.sp-hero-tx { flex: 1; min-width: 0; }
.sp-hero-t { font-size: 15px; font-weight: 900; color: #eafff4; letter-spacing: 0.2px; }
.sp-hero-s { font-size: 11.5px; font-weight: 600; color: rgba(230,246,236,0.62); margin-top: 2px; line-height: 1.4; }
.sp-hero-cta { flex-shrink: 0; padding: 10px 16px; font-size: 13px; }
@media (max-width: 400px) { .sp-hero { flex-wrap: wrap; } .sp-hero-cta { width: 100%; } }
.sp-faq-qt { flex: 1; font-size: 13.5px; font-weight: 800; }
.sp-faq-chev { transition: transform .2s; flex-shrink: 0; color: #ffd24d; }
.sp-faq-a { padding: 0 14px 14px; font-size: 12.5px; line-height: 1.55; color: rgba(255,255,255,0.7); }
.sp-links { display: grid; gap: 8px; }
.sp-ch { display: flex; align-items: center; gap: 13px; padding: 13px 14px; text-decoration: none; color: #fff; }
.sp-ch-ic { position: relative; overflow: hidden; width: 42px; height: 42px; border-radius: 13px; display: grid; place-items: center; flex-shrink: 0;
  border: 1px solid rgba(255,214,120,0.4);
  box-shadow: 0 0 0 1px rgba(245,180,35,0.28), 0 3px 10px rgba(0,0,0,0.3), inset 0 1.5px 0 rgba(255,255,255,0.22), inset 0 -6px 12px rgba(0,0,0,0.35);
  animation: sp-icfloat 3.6s ease-in-out infinite; will-change: transform; }
.sp-ch:nth-child(2) .sp-ch-ic { animation-delay: -1.2s; }
.sp-ch:nth-child(3) .sp-ch-ic { animation-delay: -2.4s; }
@keyframes sp-icfloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
/* specular top highlight + rotating gold sheen */
.sp-ch-ic::before { content: ''; position: absolute; inset: 0; z-index: 0; border-radius: inherit; pointer-events: none;
  background: linear-gradient(180deg, rgba(255,255,255,0.25), transparent 46%); }
.sp-ch-ic > * { position: relative; z-index: 1; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4)); animation: sp-icglow 2.8s ease-in-out infinite; }
@keyframes sp-icglow { 0%,100% { filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4)); } 50% { filter: drop-shadow(0 0 6px rgba(255,214,120,0.85)) brightness(1.08); } }
@media (prefers-reduced-motion: reduce) { .sp-ch-ic, .sp-ch-ic > * { animation: none !important; } }
.sp-faq { overflow: hidden; }
.sp-faq-q { width: 100%; display: flex; align-items: center; gap: 10px; padding: 13px 14px; background: none; border: none; color: #fff; cursor: pointer; text-align: left; font-family: inherit; }
.sp-row { display: flex; align-items: center; gap: 10px; width: 100%; padding: 13px 14px; cursor: pointer; color: #fff; font-size: 13.5px; font-weight: 800; font-family: inherit; text-align: left; }
.sp-row:active, .sp-ch:active { transform: scale(0.99); }
`;

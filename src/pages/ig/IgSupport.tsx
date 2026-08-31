// IgSupport (/ig/support) — luxury-dark "top-tier" reskin of the dark
// SupportPage. Presentation-only: the FAQ accordion state, the contact-channel
// links and quick-link navigation are copied verbatim. No backend, no
// RPC/Supabase call — pure links — so nothing here submits a ticket and there
// is no data load to gate. Only the returned JSX markup and CSS are new;
// internal routes point to IG-light equivalents while external URLs (t.me,
// mailto) stay as-is. No wallet / ledger / payment / withdrawal logic touched;
// no real-money enablement.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Mail, Send, ChevronDown, ShieldCheck, LifeBuoy } from 'lucide-react';
import IgTabBar from '@/components/ig/IgTabBar';
import IgSocialNotice from '@/components/ig/IgSocialNotice';

const FAQ: { q: string; a: string }[] = [
  { q: 'How do I deposit?', a: 'Open Wallet → Deposit. UPI is instant; crypto (USDT) credits after network confirmations.' },
  { q: 'How long do withdrawals take?', a: 'Withdrawals are processed to your USDT wallet, usually within a few minutes after review.' },
  { q: 'Why do I need KYC?', a: 'Identity verification (KYC) is required before withdrawals to keep your account and funds secure.' },
  { q: 'Are the games fair?', a: 'Yes — games are provably fair (HMAC-SHA256 of server seed + client seed + nonce). You can verify every round.' },
  { q: 'I found a problem — what do I do?', a: 'Contact us via live chat or email below with your account email and a screenshot; we respond fast.' },
];

const CHANNELS = [
  { icon: MessageCircle, label: 'Live Chat', sub: 'Fastest — 24/7 on Telegram', href: 'https://t.me/Creator744' },
  { icon: Send,          label: 'Telegram', sub: '@Creator744', href: 'https://t.me/Creator744' },
  { icon: Mail,          label: 'Email',    sub: 'support@c7winners.com', href: 'mailto:support@c7winners.com' },
];

export default function IgSupport() {
  const nav = useNavigate();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="ig igsup">
      <style>{CSS}</style>

      <header className="ig-top">
        <button className="igsup-back" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/ig/profile'))} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <span className="ig-ttl">Support</span>
        <span style={{ width: 22 }} />
      </header>

      <main className="ig-main igsup-main">
        <div className="ige-hero"><img src="/images/v3/emblems/support.png" alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} /></div>
        {/* 24/7 reassurance + Live Chat CTA */}
        <section className="igsup-hero">
          <span className="igsup-hero-ic"><LifeBuoy size={22} /></span>
          <div className="igsup-hero-tx">
            <div className="igsup-hero-t">We're here 24/7</div>
            <div className="igsup-hero-s">Real humans, fast replies — reach us any time.</div>
          </div>
          <a href="https://t.me/Creator744" target="_blank" rel="noreferrer" className="igsup-hero-cta">
            <MessageCircle size={16} /> Live Chat
          </a>
        </section>

        {/* Contact channels */}
        <div className="igsup-sec"><span>💬</span> Contact us</div>
        <div className="igsup-channels">
          {CHANNELS.map((c) => (
            <a key={c.label} href={c.href} target="_blank" rel="noreferrer" className="igsup-ch">
              <span className="igsup-ch-ic"><c.icon size={20} /></span>
              <span className="igsup-ch-tx">
                <span className="igsup-ch-l">{c.label}</span>
                <span className="igsup-ch-s">{c.sub}</span>
              </span>
              <span className="igsup-ch-go">›</span>
            </a>
          ))}
        </div>
        <p className="igsup-note">Typical reply within a few minutes on Telegram, and within a few hours by email.</p>

        {/* FAQ accordion */}
        <div className="igsup-sec"><span>❓</span> FAQ</div>
        <div className="igsup-card">
          {FAQ.map((f, i) => (
            <div key={i} className="igsup-faq" style={{ borderTop: i ? '1px solid var(--hair)' : 'none' }}>
              <button onClick={() => setOpen(open === i ? null : i)} className="igsup-faq-q" aria-expanded={open === i}>
                <span className="igsup-faq-qt">{f.q}</span>
                <ChevronDown size={16} className="igsup-faq-chev" style={{ transform: open === i ? 'rotate(180deg)' : 'none' }} />
              </button>
              {open === i && <div className="igsup-faq-a">{f.a}</div>}
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="igsup-sec"><span>🔗</span> Quick links</div>
        <div className="igsup-rows">
          <button onClick={() => nav('/ig/kyc')} className="igsup-row">
            <span className="igsup-row-ic"><ShieldCheck size={16} /></span>
            <span className="igsup-row-l">Verify Identity (KYC)</span>
            <span className="igsup-ch-go">›</span>
          </button>
          <button onClick={() => nav('/ig/responsible')} className="igsup-row">
            <span className="igsup-row-ic">🧭</span>
            <span className="igsup-row-l">Responsible Gambling</span>
            <span className="igsup-ch-go">›</span>
          </button>
        </div>

        <div className="igsup-foot">18+ · Play responsibly · Provably fair</div>
        <IgSocialNotice variant="line" />
      </main>

      <IgTabBar active="profile" />
    </div>
  );
}

const CSS = `
.ig { --bg:#07130d; --card:#103524; --card2:#12492f; --line:rgba(240,201,74,0.24); --hair:rgba(255,255,255,0.06); --ink:#f0fff7; --mut:#93c3aa; --faint:#5f8b76; --grn:#2ee08a; --grn2:#0e7a4a; --gold:#f0c94a; --gold-lite:#fff4cf; --gold-deep:#c68a2e; --antique:#e8c877; --loss:#ff6b7d;
  min-height:100dvh; color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif; padding-bottom:calc(76px + env(safe-area-inset-bottom));
  background: radial-gradient(90% 40% at 50% -6%, rgba(240,201,74,0.08), transparent 55%), radial-gradient(120% 70% at 50% -8%, rgba(33,86,60,0.9) 0%, transparent 55%), linear-gradient(180deg,#0d3d28 0%, #072517 46%, #04160d 100%); background-attachment:fixed; }
.ig * { box-sizing:border-box; }
.ig-top { position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; height:54px; padding:0 12px;
  background:linear-gradient(180deg, rgba(9,32,20,0.95), rgba(9,32,20,0.55)); -webkit-backdrop-filter:blur(16px); backdrop-filter:blur(16px); border-bottom:1px solid var(--line); box-shadow:0 1px 0 rgba(240,201,74,0.16); }
.igsup-back { background:none; border:none; color:#cdead9; cursor:pointer; display:grid; place-items:center; width:38px; height:38px; border-radius:11px; }
.ig-ttl { font-size:18px; font-weight:800; background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.ig-main { max-width:560px; margin:0 auto; }
.igsup-main { padding:14px 14px 24px; }
.ige-hero { text-align:center; } .ige-hero img { max-width:120px; height:auto; opacity:0.9; filter:drop-shadow(0 8px 18px rgba(0,0,0,0.5)); }

/* Hero — cinematic gold-framed cabinet, emerald wash + sheen sweep */
.igsup-hero { position:relative; display:flex; align-items:center; gap:13px; border:1px solid transparent; border-radius:20px; padding:16px 16px; overflow:hidden;
  background:radial-gradient(130% 120% at 100% 0%, rgba(46,224,138,0.16), transparent 60%), radial-gradient(120% 120% at 0% 0%, rgba(240,201,74,0.14), transparent 58%), linear-gradient(160deg,#123f29,#06180f);
  box-shadow:inset 0 0 0 1.4px rgba(240,201,74,0.44), inset 0 1.6px 0 rgba(255,255,255,0.2), inset 0 0 30px rgba(46,224,138,0.08), 0 0 24px -8px rgba(240,201,74,0.4), 0 24px 48px -24px rgba(0,0,0,0.88); }
.igsup-hero::after { content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(105deg, transparent 42%, rgba(255,244,207,0.13) 50%, transparent 58%); transform:translateX(-150%); animation:igsup-sweep 7s ease-in-out infinite; }
@keyframes igsup-sweep { 0%,74% { transform:translateX(-150%); } 90%,100% { transform:translateX(150%); } }
.igsup-hero-ic { position:relative; z-index:1; flex-shrink:0; width:46px; height:46px; border-radius:14px; display:grid; place-items:center; color:#3a2708;
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.7), inset 0 -3px 7px rgba(120,74,20,0.22), 0 0 18px -3px rgba(240,201,74,0.6); }
.igsup-hero-tx { position:relative; z-index:1; flex:1; min-width:0; }
.igsup-hero-t { font-size:15px; font-weight:800; color:#f3ffe9; }
.igsup-hero-s { font-size:12px; font-weight:600; color:var(--mut); margin-top:2px; line-height:1.4; }
.igsup-hero-cta { position:relative; z-index:1; flex-shrink:0; display:inline-flex; align-items:center; gap:6px; padding:11px 16px; border-radius:12px; color:#3a2708; font-size:13px; font-weight:900; text-decoration:none; border:1px solid rgba(255,255,255,0.3);
  background:linear-gradient(180deg,var(--gold-lite),var(--gold) 55%,var(--gold-deep)); box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.7), inset 0 -3px 7px rgba(120,74,20,0.22), 0 0 16px -3px rgba(240,201,74,0.6); }
.igsup-hero-cta:active { transform:translateY(1px); }
@media (max-width: 400px) { .igsup-hero { flex-wrap:wrap; } .igsup-hero-cta { width:100%; justify-content:center; } }

.igsup-sec { display:flex; align-items:center; gap:7px; margin:22px 4px 9px; font-size:11px; font-weight:800; letter-spacing:0.8px; text-transform:uppercase; color:#f3ffe9; }
.igsup-sec span { font-size:13px; }
.igsup-card { border:1px solid transparent; border-radius:20px; overflow:hidden;
  background:linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96)); box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.36), inset 0 1.5px 0 rgba(255,255,255,0.12), 0 24px 48px -28px rgba(0,0,0,0.9); }

.igsup-channels { display:grid; gap:9px; }
.igsup-ch { display:flex; align-items:center; gap:13px; padding:14px 15px; text-decoration:none; color:var(--ink); border:1px solid transparent; border-radius:16px;
  background:linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96)); box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.32), inset 0 1.5px 0 rgba(255,255,255,0.1), 0 20px 40px -28px rgba(0,0,0,0.9); }
.igsup-ch:active { transform:scale(0.99); }
.igsup-ch-ic { flex-shrink:0; width:44px; height:44px; border-radius:13px; display:grid; place-items:center; color:var(--antique);
  background:radial-gradient(120% 120% at 50% 18%, #1a5738, #0b2418); border:1px solid var(--line); box-shadow:inset 0 1px 0 rgba(246,230,176,0.12); }
.igsup-ch:nth-child(1) .igsup-ch-ic { color:var(--grn); }
.igsup-ch-tx { display:flex; flex-direction:column; min-width:0; flex:1; }
.igsup-ch-l { font-size:14px; font-weight:800; color:#f3ffe9; }
.igsup-ch-s { font-size:11.5px; color:var(--mut); margin-top:1px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.igsup-ch-go { flex-shrink:0; font-size:22px; font-weight:400; color:var(--faint); line-height:1; }
.igsup-note { margin:11px 4px 0; font-size:12px; color:var(--mut); line-height:1.45; }

.igsup-faq { overflow:hidden; }
.igsup-faq-q { width:100%; display:flex; align-items:center; gap:10px; padding:14px 15px; background:none; border:none; color:var(--ink); cursor:pointer; text-align:left; font-family:inherit; }
.igsup-faq-qt { flex:1; font-size:13.5px; font-weight:700; color:#f3ffe9; }
.igsup-faq-chev { transition:transform .2s; flex-shrink:0; color:var(--gold); }
.igsup-faq-a { padding:0 15px 14px; font-size:12.5px; line-height:1.55; color:var(--mut); }

.igsup-rows { display:flex; flex-direction:column; gap:9px; }
.igsup-row { display:flex; align-items:center; gap:12px; width:100%; padding:14px 15px; cursor:pointer; text-align:left; border:1px solid transparent; border-radius:16px; color:var(--ink); font-family:inherit;
  background:linear-gradient(165deg, rgba(19,60,40,0.92), rgba(6,20,13,0.96)); box-shadow:inset 0 0 0 1.3px rgba(240,201,74,0.32), inset 0 1.5px 0 rgba(255,255,255,0.1), 0 20px 40px -28px rgba(0,0,0,0.9); }
.igsup-row:active { transform:scale(0.99); }
.igsup-row-ic { width:36px; height:36px; border-radius:11px; display:grid; place-items:center; color:var(--antique); flex-shrink:0;
  background:radial-gradient(120% 120% at 50% 18%, #1a5738, #0b2418); border:1px solid var(--line); font-size:16px; box-shadow:inset 0 1px 0 rgba(246,230,176,0.12); }
.igsup-row-l { flex:1; font-size:14px; font-weight:700; color:#f3ffe9; }

.igsup-foot { text-align:center; font-size:10.5px; color:var(--mut); margin-top:24px; font-weight:600; letter-spacing:0.3px; }
@media (prefers-reduced-motion: reduce) { .igsup-hero::after { animation:none; } .igsup-ch:active, .igsup-row:active, .igsup-hero-cta:active { transform:none; } .igsup-faq-chev { transition:none; } }
`;
